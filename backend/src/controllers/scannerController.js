import { detectScannerStatus } from '../utils/scannerDetect.js';

export async function getScannerStatus(_req, res) {
  try {
    const status = await detectScannerStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      connected: null,
      supported: false,
      source: 'error',
      error: error.message,
    });
  }
}
