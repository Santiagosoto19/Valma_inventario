import { pingDatabase } from '../config/database.js';
import { BUSINESS_TIMEZONE } from '../utils/dates.js';

export async function db(req, res) {
  try {
    await pingDatabase(5_000);
    res.json({ ok: true, tz: BUSINESS_TIMEZONE, env: { vercel: !!process.env.VERCEL } });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
}

export default { db };
