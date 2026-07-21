import { getSetting, updateSetting, getStockThreshold } from '../services/settingsService.js';
import { httpStatusFromError } from '../utils/httpErrors.js';

export async function getSettings(req, res) {
  try {
    const threshold = await getStockThreshold();
    res.json({ stock_threshold: threshold });
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: error.message });
  }
}

export async function patchSettings(req, res) {
  try {
    const { stock_threshold } = req.body;
    if (stock_threshold === undefined) {
      return res.status(400).json({ error: 'stock_threshold es requerido' });
    }
    const value = parseInt(stock_threshold, 10);
    if (isNaN(value) || value < 0) {
      return res.status(400).json({ error: 'stock_threshold debe ser un número >= 0' });
    }
    await updateSetting('stock_threshold', value);
    res.json({ stock_threshold: value });
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: error.message });
  }
}
