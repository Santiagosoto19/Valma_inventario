import { queryWithTimeout } from '../config/database.js';
import { getSales } from './saleService.js';
import {
  aggregateSalesSummary,
  allDatesInMonth,
  formatPgDate,
  localBusinessYearMonth,
  monthDateRange,
  sqlSaleMatchesMonth,
  todayLocal,
} from '../utils/dates.js';

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export async function getDailyReport(date) {
  const targetDate = date || todayLocal();
  const sales = await getSales({ date: targetDate });
  return aggregateSalesSummary(sales, { date: targetDate });
}

export async function getMonthlyReport(year, month) {
  const { year: localYear, month: localMonth } = localBusinessYearMonth();
  const targetYear = year || localYear;
  const targetMonth = month || localMonth;
  const { start, end, endInclusive } = monthDateRange(targetYear, targetMonth);

  const { rows } = await queryWithTimeout(
    `SELECT
       to_char(sale_date, 'YYYY-MM-DD') AS date,
       COALESCE(SUM(CASE WHEN payment_method::text IN ('cash', 'efectivo') THEN total ELSE 0 END), 0) AS cash,
       COALESCE(SUM(CASE WHEN payment_method::text = 'nequi' THEN total ELSE 0 END), 0) AS nequi,
       COALESCE(SUM(total), 0) AS total,
       COUNT(*)::int AS transactions,
       COUNT(*) FILTER (WHERE payment_method::text IN ('cash', 'efectivo'))::int AS cash_transactions,
       COUNT(*) FILTER (WHERE payment_method::text = 'nequi')::int AS nequi_transactions
     FROM sales
     WHERE ${sqlSaleMatchesMonth(1, 2)}
     GROUP BY sale_date
     ORDER BY sale_date`,
    [start, end]
  );

  const dailyMap = {};
  for (const row of rows) {
    const dateKey = formatPgDate(row.date);
    if (!dateKey) continue;
    dailyMap[dateKey] = {
      date: dateKey,
      cash: roundMoney(row.cash),
      nequi: roundMoney(row.nequi),
      total: roundMoney(row.total),
      transactions: Number(row.transactions) || 0,
      cashTransactions: Number(row.cash_transactions) || 0,
      nequiTransactions: Number(row.nequi_transactions) || 0,
    };
  }

  const daily = allDatesInMonth(targetYear, targetMonth).map((dateKey) => {
    const day = dailyMap[dateKey];
    if (!day) {
      return {
        date: dateKey,
        cash: 0,
        nequi: 0,
        total: 0,
        transactions: 0,
      };
    }
    return {
      date: day.date,
      cash: day.cash,
      nequi: day.nequi,
      total: day.total,
      transactions: day.transactions,
    };
  });

  const summary = {
    year: targetYear,
    month: targetMonth,
    period_start: start,
    period_end: endInclusive,
    cash: { total: 0, transactions: 0 },
    nequi: { total: 0, transactions: 0 },
    grand_total: 0,
    total_transactions: 0,
    daily,
  };

  for (const day of Object.values(dailyMap)) {
    summary.cash.total = roundMoney(summary.cash.total + day.cash);
    summary.nequi.total = roundMoney(summary.nequi.total + day.nequi);
    summary.grand_total = roundMoney(summary.grand_total + day.total);
    summary.cash.transactions += day.cashTransactions;
    summary.nequi.transactions += day.nequiTransactions;
    summary.total_transactions += day.transactions;
  }

  return summary;
}

export async function getAccountingDashboard() {
  const today = todayLocal();
  const { year, month } = localBusinessYearMonth();
  const [daily, monthly] = await Promise.all([
    getDailyReport(today),
    getMonthlyReport(year, month),
  ]);
  return { daily, monthly };
}
