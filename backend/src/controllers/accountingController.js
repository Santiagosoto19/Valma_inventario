import {
  getAccountingDashboard,
  getDailyReport,
  getMonthlyReport,
} from '../services/accountingService.js';

export async function dashboard(req, res) {
  try {
    const data = await getAccountingDashboard();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function dailyReport(req, res) {
  try {
    const data = await getDailyReport(req.query.date);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function monthlyReport(req, res) {
  try {
    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
    const data = await getMonthlyReport(year, month);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
