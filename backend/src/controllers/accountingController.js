import {
  getAccountingDashboard,
  getDailyReport,
  getMonthlyReport,
} from '../services/accountingService.js';
import { httpStatusFromError } from '../utils/httpErrors.js';
import { localYearMonth } from '../utils/dates.js';

export async function dashboard(req, res) {
  try {
    const data = await getAccountingDashboard();
    res.json(data);
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: error.message });
  }
}

export async function dailyReport(req, res) {
  try {
    const data = await getDailyReport(req.query.date);
    res.json(data);
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: error.message });
  }
}

export async function monthlyReport(req, res) {
  try {
    const { year: defaultYear, month: defaultMonth } = localYearMonth();
    const year = req.query.year ? parseInt(req.query.year, 10) : defaultYear;
    const month = req.query.month ? parseInt(req.query.month, 10) : defaultMonth;
    const data = await getMonthlyReport(year, month);
    res.json(data);
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: error.message });
  }
}
