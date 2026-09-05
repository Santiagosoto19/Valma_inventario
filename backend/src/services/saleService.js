import { queryWithTimeout, connectWithTimeout } from '../config/database.js';
import { checkStockAlertsForProducts } from './productService.js';
import {
  monthDateRange,
  normalizeSaleRecord,
  sqlSaleMatchesDate,
  sqlSaleMatchesMonth,
  sqlTodayLocalDate,
} from '../utils/dates.js';

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

let clientSaleIdSupported;

async function supportsClientSaleId() {
  if (clientSaleIdSupported != null) return clientSaleIdSupported;
  const { rows } = await queryWithTimeout(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'client_sale_id'`
  );
  clientSaleIdSupported = rows.length > 0;
  return clientSaleIdSupported;
}

export async function getSaleByClientSaleId(clientSaleId) {
  const { rows: sales } = await queryWithTimeout(
    'SELECT * FROM sales WHERE client_sale_id = $1',
    [clientSaleId]
  );
  if (!sales.length) return null;
  const { rows: items } = await queryWithTimeout(
    'SELECT * FROM sale_items WHERE sale_id = $1',
    [sales[0].id]
  );
  return normalizeSaleRecord({ ...sales[0], items });
}

export async function createSale({ items, payment_method, global_discount = 0, client_sale_id = null }) {
  if (!items?.length) {
    throw new Error('La venta debe incluir al menos un producto');
  }
  if (!['cash', 'nequi'].includes(payment_method)) {
    throw new Error('Método de pago inválido. Use cash o nequi');
  }

  const canUseClientId = await supportsClientSaleId();
  const clientSaleId = canUseClientId && client_sale_id
    ? String(client_sale_id).trim().slice(0, 64)
    : null;
  if (clientSaleId) {
    const existing = await getSaleByClientSaleId(clientSaleId);
    if (existing) return existing;
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

    const insertSql = canUseClientId
      ? `INSERT INTO sales (invoice_number, subtotal, discount_items, discount_global, total, payment_method, sale_date, client_sale_id)
         VALUES ($1, $2, $3, $4, $5, $6, ${sqlTodayLocalDate()}, $7) RETURNING *`
      : `INSERT INTO sales (invoice_number, subtotal, discount_items, discount_global, total, payment_method, sale_date)
         VALUES ($1, $2, $3, $4, $5, $6, ${sqlTodayLocalDate()}) RETURNING *`;
    const insertParams = [
      invoiceRows[0].invoice_number,
      subtotal,
      discountItems,
      globalDiscount,
      total,
      payment_method,
    ];
    if (canUseClientId) insertParams.push(clientSaleId);

    const { rows: saleRows } = await client.query(insertSql, insertParams);
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

    return normalizeSaleRecord({ ...sale, items: mapSaleItems(sale.id, saleItems) });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // transacción ya cerrada o sin BEGIN
      }
    }
    if (error.code === '23505' && clientSaleId) {
      const existing = await getSaleByClientSaleId(clientSaleId);
      if (existing) return existing;
    }
    throw error;
  } finally {
    client?.release();
  }
}

export async function updateSalePaymentMethod(id, payment_method) {
  if (!['cash', 'nequi'].includes(payment_method)) {
    throw new Error('Método de pago inválido. Use cash o nequi');
  }
  const existing = await getSaleById(id);
  if (!existing) return null;
  if (existing.payment_method === payment_method) return existing;

  const { rowCount } = await queryWithTimeout(
    'UPDATE sales SET payment_method = $1 WHERE id = $2',
    [payment_method, id]
  );
  if (!rowCount) return null;
  return getSaleById(id);
}

export async function getSaleById(id) {
  const { rows: sales } = await queryWithTimeout('SELECT * FROM sales WHERE id = $1', [id]);
  if (!sales.length) return null;
  const { rows: items } = await queryWithTimeout(
    'SELECT * FROM sale_items WHERE sale_id = $1',
    [id]
  );
  return normalizeSaleRecord({ ...sales[0], items });
}

export async function getSales({ date, month, year } = {}) {
  let query = 'SELECT * FROM sales';
  const params = [];
  const conditions = [];
  let limit = 500;

  if (date) {
    params.push(date);
    conditions.push(sqlSaleMatchesDate(params.length));
    limit = 2000;
  } else if (month && year) {
    const { start, end } = monthDateRange(year, month);
    params.push(start, end);
    conditions.push(sqlSaleMatchesMonth(params.length - 1, params.length));
    limit = 10000;
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ` ORDER BY created_at DESC LIMIT ${limit}`;

  const { rows } = await queryWithTimeout(query, params);
  return rows.map(normalizeSaleRecord);
}
