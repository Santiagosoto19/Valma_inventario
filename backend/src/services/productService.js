import { queryWithTimeout } from '../config/database.js';
import { getStockThreshold } from './settingsService.js';
import { emitStockAlert } from '../config/socket.js';
import { internalEan13FromSeq } from '../utils/barcode.js';

export async function allocateInternalBarcode() {
  const { rows } = await queryWithTimeout("SELECT nextval('barcode_seq') AS seq");
  return internalEan13FromSeq(rows[0].seq);
}

export async function getAllProducts() {
  const { rows } = await queryWithTimeout(
    'SELECT * FROM products WHERE service_group IS NULL ORDER BY name ASC'
  );
  return rows;
}

export async function getServiceProducts(group) {
  const { rows } = await queryWithTimeout(
    'SELECT * FROM products WHERE service_group = $1 ORDER BY price ASC',
    [group]
  );
  return rows;
}

export async function getProductById(id) {
  const { rows } = await queryWithTimeout('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getProductByBarcode(barcode) {
  const code = String(barcode || '').trim();
  if (!code) return null;
  const { rows } = await queryWithTimeout(
    `SELECT * FROM products
     WHERE barcode = $1 AND service_group IS NULL
     LIMIT 1`,
    [code]
  );
  return rows[0] ?? null;
}

export async function createProduct(data) {
  const { name, description, image_url, stock, price, barcode } = data;
  const normalizedBarcode = barcode?.trim() || await allocateInternalBarcode();
  const { rows } = await queryWithTimeout(
    `INSERT INTO products (name, description, image_url, stock, price, barcode)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, description || '', image_url || null, stock ?? 0, price, normalizedBarcode]
  );
  const product = rows[0];
  await checkAndEmitStockAlert(product);
  return product;
}

export async function updateProduct(id, data) {
  const { name, description, image_url, stock, price, barcode } = data;
  const sets = [];
  const values = [id];
  let param = 2;

  if (name !== undefined) {
    sets.push(`name = $${param++}`);
    values.push(name);
  }
  if (description !== undefined) {
    sets.push(`description = $${param++}`);
    values.push(description);
  }
  if (image_url !== undefined) {
    sets.push(`image_url = $${param++}`);
    values.push(image_url);
  }
  if (stock !== undefined) {
    sets.push(`stock = $${param++}`);
    values.push(stock);
  }
  if (price !== undefined) {
    sets.push(`price = $${param++}`);
    values.push(price);
  }
  if (barcode !== undefined) {
    sets.push(`barcode = $${param++}`);
    values.push(barcode?.trim() || null);
  }

  if (!sets.length) {
    return getProductById(id);
  }

  sets.push('updated_at = NOW()');
  const { rows } = await queryWithTimeout(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  const product = rows[0];
  if (product) await checkAndEmitStockAlert(product);
  return product ?? null;
}

export async function deleteProduct(id) {
  const { rowCount } = await queryWithTimeout('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function getLowStockProducts() {
  const threshold = await getStockThreshold();
  const { rows } = await queryWithTimeout(
    `SELECT * FROM products
     WHERE service_group IS NULL AND track_stock = true AND stock <= $1
     ORDER BY stock ASC, name ASC`,
    [threshold]
  );
  return { threshold, products: rows };
}

async function checkAndEmitStockAlert(product) {
  if (product.track_stock === false || product.service_group) return;
  const threshold = await getStockThreshold();
  if (product.stock <= threshold) {
    emitStockAlert({ ...product, threshold });
  }
}

export async function assignBarcodeIfMissing(id) {
  const product = await getProductById(id);
  if (!product) return null;
  if (product.barcode) return product;
  return updateProduct(id, { barcode: await allocateInternalBarcode() });
}

export async function generateMissingBarcodes() {
  const { rows } = await queryWithTimeout(
    `SELECT id FROM products
     WHERE service_group IS NULL AND (barcode IS NULL OR barcode = '')
     ORDER BY name ASC`,
    [],
    30_000
  );
  if (!rows.length) return [];

  const { rows: seqRows } = await queryWithTimeout(
    `SELECT nextval('barcode_seq') AS seq FROM generate_series(1, $1)`,
    [rows.length],
    30_000
  );

  const tuples = [];
  const params = [];
  let param = 1;
  for (let i = 0; i < rows.length; i += 1) {
    tuples.push(`($${param++}::uuid, $${param++})`);
    params.push(rows[i].id, internalEan13FromSeq(seqRows[i].seq));
  }

  const { rows: updated } = await queryWithTimeout(
    `UPDATE products AS p
     SET barcode = v.code, updated_at = NOW()
     FROM (VALUES ${tuples.join(', ')}) AS v(id, code)
     WHERE p.id = v.id
     RETURNING p.*`,
    params,
    30_000
  );
  return updated;
}

export async function checkStockAlertsForProducts(products) {
  const threshold = await getStockThreshold();
  for (const product of products) {
    if (product.track_stock === false || product.service_group) continue;
    if (product.stock <= threshold) {
      emitStockAlert({ ...product, threshold });
    }
  }
}
