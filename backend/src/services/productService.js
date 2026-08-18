import { queryWithTimeout } from '../config/database.js';
import { getStockThreshold } from './settingsService.js';
import { emitStockAlert } from '../config/socket.js';

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
  const normalizedBarcode = barcode?.trim() || null;
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

export async function checkStockAlertsForProducts(products) {
  const threshold = await getStockThreshold();
  for (const product of products) {
    if (product.track_stock === false || product.service_group) continue;
    if (product.stock <= threshold) {
      emitStockAlert({ ...product, threshold });
    }
  }
}
