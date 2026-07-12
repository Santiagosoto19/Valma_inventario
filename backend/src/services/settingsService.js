import pool from '../config/database.js';

export async function getSetting(key) {
  const { rows } = await pool.query(
    'SELECT value FROM settings WHERE key = $1',
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function updateSetting(key, value) {
  const { rows } = await pool.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
     RETURNING *`,
    [key, String(value)]
  );
  return rows[0];
}

export async function getStockThreshold() {
  const value = await getSetting('stock_threshold');
  return parseInt(value, 10) || 5;
}
