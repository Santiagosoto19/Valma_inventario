import pool from '../config/database.js';
import { checkStockAlertsForProducts } from './productService.js';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

export async function createSale({ items, payment_method, global_discount = 0 }) {
  if (!items?.length) {
    throw new Error('La venta debe incluir al menos un producto');
  }
  if (!['cash', 'nequi'].includes(payment_method)) {
    throw new Error('Método de pago inválido. Use cash o nequi');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const productIds = items.map((i) => i.product_id);
    const { rows: products } = await client.query(
      'SELECT * FROM products WHERE id = ANY($1::uuid[]) FOR UPDATE',
      [productIds]
    );

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    let discountItems = 0;
    const saleItems = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) throw new Error(`Producto no encontrado: ${item.product_id}`);
      if (item.quantity <= 0) throw new Error(`Cantidad inválida para ${product.name}`);
      const tracksStock = product.track_stock !== false && !product.service_group;
      if (tracksStock && product.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`
        );
      }

      const lineSubtotal = roundMoney(Number(product.price) * item.quantity);
      const itemDiscount = roundMoney(Math.max(0, Number(item.discount) || 0));

      if (itemDiscount > lineSubtotal) {
        throw new Error(`El descuento de "${product.name}" no puede superar el subtotal del ítem`);
      }

      const itemNet = roundMoney(lineSubtotal - itemDiscount);
      subtotal = roundMoney(subtotal + lineSubtotal);
      discountItems = roundMoney(discountItems + itemDiscount);

      saleItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        line_subtotal: lineSubtotal,
        discount_amount: itemDiscount,
        subtotal: itemNet,
        tracksStock,
      });
    }

    const afterItemDiscounts = roundMoney(subtotal - discountItems);
    const globalDiscount = roundMoney(Math.max(0, Number(global_discount) || 0));

    if (globalDiscount > afterItemDiscounts) {
      throw new Error('El descuento global no puede superar el total después de rebajas por producto');
    }

    const total = roundMoney(afterItemDiscounts - globalDiscount);

    const { rows: invoiceRows } = await client.query(
      "SELECT 'FAC-' || nextval('invoice_seq') AS invoice_number"
    );

    const { rows: saleRows } = await client.query(
      `INSERT INTO sales (invoice_number, subtotal, discount_items, discount_global, total, payment_method, sale_date)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE) RETURNING *`,
      [
        invoiceRows[0].invoice_number,
        subtotal,
        discountItems,
        globalDiscount,
        total,
        payment_method,
      ]
    );
    const sale = saleRows[0];
    const updatedProducts = [];

    for (const item of saleItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_subtotal, discount_amount, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sale.id, item.product_id, item.product_name, item.quantity,
          item.unit_price, item.line_subtotal, item.discount_amount, item.subtotal,
        ]
      );

      const { rows: updated } = item.tracksStock
        ? await client.query(
            `UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [item.quantity, item.product_id]
          )
        : await client.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      if (updated[0]) updatedProducts.push(updated[0]);
    }

    await client.query('COMMIT');
    await checkStockAlertsForProducts(updatedProducts);

    const { rows: detailItems } = await pool.query(
      'SELECT * FROM sale_items WHERE sale_id = $1', [sale.id]
    );

    return { ...sale, items: detailItems };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getSaleById(id) {
  const { rows: sales } = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
  if (!sales.length) return null;
  const { rows: items } = await pool.query(
    'SELECT * FROM sale_items WHERE sale_id = $1', [id]
  );
  return { ...sales[0], items };
}

export async function getSales({ date, month, year } = {}) {
  let query = 'SELECT * FROM sales';
  const params = [];
  const conditions = [];

  if (date) {
    params.push(date);
    conditions.push(`sale_date = $${params.length}`);
  } else if (month && year) {
    params.push(parseInt(year, 10), parseInt(month, 10));
    conditions.push(`EXTRACT(YEAR FROM sale_date) = $${params.length - 1}`);
    conditions.push(`EXTRACT(MONTH FROM sale_date) = $${params.length}`);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const { rows } = await pool.query(query, params);
  return rows;
}
