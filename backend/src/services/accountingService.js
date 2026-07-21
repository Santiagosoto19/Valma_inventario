import { queryWithTimeout } from '../config/database.js';

export async function getDailyReport(date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { rows } = await queryWithTimeout(
    `SELECT
       payment_method,
       COUNT(*)::INTEGER AS transaction_count,
       COALESCE(SUM(total), 0)::DECIMAL AS total_amount
     FROM sales
     WHERE sale_date = $1
     GROUP BY payment_method`,
    [targetDate]
  );

  const summary = {
    date: targetDate,
    cash: { total: 0, transactions: 0 },
    nequi: { total: 0, transactions: 0 },
    grand_total: 0,
    total_transactions: 0,
  };

  for (const row of rows) {
    const amount = Number(row.total_amount);
    const count = row.transaction_count;
    if (row.payment_method === 'cash') {
      summary.cash = { total: amount, transactions: count };
    } else if (row.payment_method === 'nequi') {
      summary.nequi = { total: amount, transactions: count };
    }
    summary.grand_total += amount;
    summary.total_transactions += count;
  }

  return summary;
}

export async function getMonthlyReport(year, month) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const { rows: monthlyTotals } = await queryWithTimeout(
    `SELECT
       payment_method,
       COUNT(*)::INTEGER AS transaction_count,
       COALESCE(SUM(total), 0)::DECIMAL AS total_amount
     FROM sales
     WHERE EXTRACT(YEAR FROM sale_date) = $1
       AND EXTRACT(MONTH FROM sale_date) = $2
     GROUP BY payment_method`,
    [targetYear, targetMonth]
  );

  const { rows: dailyBreakdown } = await queryWithTimeout(
    `SELECT
       sale_date,
       payment_method,
       COUNT(*)::INTEGER AS transaction_count,
       COALESCE(SUM(total), 0)::DECIMAL AS total_amount
     FROM sales
     WHERE EXTRACT(YEAR FROM sale_date) = $1
       AND EXTRACT(MONTH FROM sale_date) = $2
     GROUP BY sale_date, payment_method
     ORDER BY sale_date ASC`,
    [targetYear, targetMonth]
  );

  const summary = {
    year: targetYear,
    month: targetMonth,
    cash: { total: 0, transactions: 0 },
    nequi: { total: 0, transactions: 0 },
    grand_total: 0,
    total_transactions: 0,
    daily: {},
  };

  for (const row of monthlyTotals) {
    const amount = Number(row.total_amount);
    const count = row.transaction_count;
    if (row.payment_method === 'cash') {
      summary.cash = { total: amount, transactions: count };
    } else if (row.payment_method === 'nequi') {
      summary.nequi = { total: amount, transactions: count };
    }
    summary.grand_total += amount;
    summary.total_transactions += count;
  }

  for (const row of dailyBreakdown) {
    const dateKey = row.sale_date.toISOString().split('T')[0];
    if (!summary.daily[dateKey]) {
      summary.daily[dateKey] = {
        date: dateKey,
        cash: 0,
        nequi: 0,
        total: 0,
        transactions: 0,
      };
    }
    const amount = Number(row.total_amount);
    summary.daily[dateKey][row.payment_method] = amount;
    summary.daily[dateKey].total += amount;
    summary.daily[dateKey].transactions += row.transaction_count;
  }

  summary.daily = Object.values(summary.daily);

  return summary;
}

export async function getAccountingDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const [daily, monthly] = await Promise.all([
    getDailyReport(today),
    getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
  ]);
  return { daily, monthly };
}
