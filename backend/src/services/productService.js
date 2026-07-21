import pool from '../config/database.js';
import { getStockThreshold } from './settingsService.js';
import { emitStockAlert } from '../config/socket.js';

export async function getAllProducts() {
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE service_group IS NULL ORDER BY name ASC'
  );
  return rows;
}

export async function getServiceProducts(group) {
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE service_group = $1 ORDER BY price ASC',
    [group]
  );
  return rows;
}

export async function getProductById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createProduct(data) {
  const { name, description, image_url, stock, price } = data;
  const { rows } = await pool.query(
    `INSERT INTO products (name, description, image_url, stock, price)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, description || '', image_url || null, stock ?? 0, price]
  );
  const product = rows[0];
  await checkAndEmitStockAlert(product);
  return product;
}

export async function updateProduct(id, data) {
  const { name, description, image_url, stock, price } = data;
  const { rows } = await pool.query(
    `UPDATE products SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       image_url = COALESCE($4, image_url),
       stock = COALESCE($5, stock),
       price = COALESCE($6, price),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, name, description, image_url, stock, price]
  );
  const product = rows[0];
  if (product) await checkAndEmitStockAlert(product);
  return product ?? null;
}

export async function deleteProduct(id) {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function getLowStockProducts() {
  const threshold = await getStockThreshold();
  const { rows } = await pool.query(
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
