import { queryWithTimeout, connectWithTimeout } from '../config/database.js';
import { checkStockAlertsForProducts } from './productService.js';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function mapSaleItems(saleId, saleItems) {
  return saleItems.map((item) => ({
    sale_id: saleId,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_subtotal: item.line_subtotal,
    discount_amount: item.discount_amount,
    subtotal: item.subtotal,
  }));
}

export async function createSale({ items, payment_method, global_discount = 0 }) {
  if (!items?.length) {
    throw new Error('La venta debe incluir al menos un producto');
  }
  if (!['cash', 'nequi'].includes(payment_method)) {
    throw new Error('Método de pago inválido. Use cash o nequi');
  }

  let client;
  try {
    client = await connectWithTimeout(10_000);
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
    const stockUpdates = [];

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

      if (tracksStock) {
        stockUpdates.push({ id: product.id, quantity: item.quantity });
      }
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

    for (const item of saleItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_subtotal, discount_amount, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sale.id, item.product_id, item.product_name, item.quantity,
          item.unit_price, item.line_subtotal, item.discount_amount, item.subtotal,
        ]
      );
    }

    for (const update of stockUpdates) {
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [update.quantity, update.id]
      );
    }

    await client.query('COMMIT');
    client.release();
    client = null;

    if (!process.env.VERCEL && stockUpdates.length) {
      const { rows: updatedProducts } = await queryWithTimeout(
        'SELECT * FROM products WHERE id = ANY($1::uuid[])',
        [stockUpdates.map((u) => u.id)]
      );
      checkStockAlertsForProducts(updatedProducts).catch(console.error);
    }

    return { ...sale, items: mapSaleItems(sale.id, saleItems) };
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // transacción ya cerrada o sin BEGIN
      }
    }
    throw error;
  } finally {
    client?.release();
  }
}

export async function getSaleById(id) {
  const { rows: sales } = await queryWithTimeout('SELECT * FROM sales WHERE id = $1', [id]);
  if (!sales.length) return null;
  const { rows: items } = await queryWithTimeout(
    'SELECT * FROM sale_items WHERE sale_id = $1',
    [id]
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
  query += ' ORDER BY created_at DESC LIMIT 500';

  const { rows } = await queryWithTimeout(query, params);
  return rows;
}
