import { getSales } from './saleService.js';
import {
  aggregateSalesSummary,
  businessDateFromSale,
  localYearMonth,
  normalizePaymentMethod,
  todayLocal,
} from '../utils/dates.js';

export async function getDailyReport(date) {
  const targetDate = date || todayLocal();
  const sales = await getSales({ date: targetDate });
  return aggregateSalesSummary(sales, { date: targetDate });
}

export async function getMonthlyReport(year, month) {
  const { year: localYear, month: localMonth } = localYearMonth();
  const targetYear = year || localYear;
  const targetMonth = month || localMonth;

  const sales = await getSales({ month: targetMonth, year: targetYear });

  const summary = aggregateSalesSummary(sales, {
    year: targetYear,
    month: targetMonth,
    daily: {},
  });

  const dailyMap = {};

  for (const sale of sales) {
    const dateKey = businessDateFromSale(sale);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        date: dateKey,
        cash: 0,
        nequi: 0,
        total: 0,
        transactions: 0,
      };
    }

    const amount = Number(sale.total) || 0;
    const method = normalizePaymentMethod(sale.payment_method);
    if (method === 'cash') dailyMap[dateKey].cash += amount;
    else if (method === 'nequi') dailyMap[dateKey].nequi += amount;
    dailyMap[dateKey].total += amount;
    dailyMap[dateKey].transactions += 1;
  }

  summary.daily = Object.values(dailyMap)
    .map((day) => ({
      ...day,
      cash: Math.round(day.cash * 100) / 100,
      nequi: Math.round(day.nequi * 100) / 100,
      total: Math.round(day.total * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return summary;
}

export async function getAccountingDashboard() {
  const today = todayLocal();
  const { year, month } = localYearMonth();
  const [daily, monthly] = await Promise.all([
    getDailyReport(today),
    getMonthlyReport(year, month),
  ]);
  return { daily, monthly };
}
