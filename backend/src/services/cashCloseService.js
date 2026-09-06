import { queryWithTimeout } from '../config/database.js';
import { getDailyReport } from './accountingService.js';
import { formatPgDate, todayLocal } from '../utils/dates.js';
import { assertRegisterUnlocked, isRegisterLocked } from './registerLock.js';

export { assertRegisterUnlocked, isRegisterLocked };

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function parseMoney(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('El valor debe ser un número mayor o igual a 0');
  }
  return roundMoney(n);
}

export function normalizeCashClose(row) {
  if (!row) return null;
  return {
    id: row.id,
    business_date: formatPgDate(row.business_date),
    opening_float: roundMoney(row.opening_float),
    cash_counted: row.cash_counted == null ? null : roundMoney(row.cash_counted),
    nequi_counted: row.nequi_counted == null ? null : roundMoney(row.nequi_counted),
    expected_cash: row.expected_cash == null ? null : roundMoney(row.expected_cash),
    expected_nequi: row.expected_nequi == null ? null : roundMoney(row.expected_nequi),
    cash_difference: row.cash_difference == null ? null : roundMoney(row.cash_difference),
    nequi_difference: row.nequi_difference == null ? null : roundMoney(row.nequi_difference),
    difference: row.difference == null ? null : roundMoney(row.difference),
    cash_sales: roundMoney(row.cash_sales),
    nequi_sales: roundMoney(row.nequi_sales),
    cash_transactions: Number(row.cash_transactions) || 0,
    nequi_transactions: Number(row.nequi_transactions) || 0,
    total_sales: roundMoney(row.total_sales),
    total_transactions: Number(row.total_transactions) || 0,
    notes: row.notes || '',
    locked: Boolean(row.locked),
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed: Boolean(row.closed_at),
  };
}

async function getCloseByDate(date) {
  const { rows } = await queryWithTimeout(
    'SELECT * FROM cash_closes WHERE business_date = $1',
    [date]
  );
  return normalizeCashClose(rows[0]);
}

async function liveTotals(date, openingFloat = 0) {
  const summary = await getDailyReport(date);
  return {
    cash_sales: summary.cash.total,
    nequi_sales: summary.nequi.total,
    cash_transactions: summary.cash.transactions,
    nequi_transactions: summary.nequi.transactions,
    total_sales: summary.grand_total,
    total_transactions: summary.total_transactions,
    expected_cash: roundMoney(openingFloat + summary.cash.total),
    expected_nequi: summary.nequi.total,
    expected_total: roundMoney(openingFloat + summary.grand_total),
  };
}

export async function getTodayCashClose() {
  const date = todayLocal();
  const close = await getCloseByDate(date);
  const live = await liveTotals(date, close?.opening_float || 0);
  return {
    date,
    opened: Boolean(close?.opened_at),
    closed: Boolean(close?.closed_at),
    locked: Boolean(close?.locked),
    close,
    live,
  };
}

export async function listCashCloses(limit = 45) {
  const { rows } = await queryWithTimeout(
    'SELECT * FROM cash_closes ORDER BY business_date DESC LIMIT $1',
    [Math.min(Math.max(Number(limit) || 45, 1), 120)]
  );
  return rows.map(normalizeCashClose);
}

export async function openCashClose(openingFloat) {
  const date = todayLocal();
  const existing = await getCloseByDate(date);
  if (existing?.closed) {
    throw new Error('El corte de hoy ya está cerrado. Desbloquea la caja si necesitas vender.');
  }

  const float = parseMoney(openingFloat, 0);
  const now = new Date().toISOString();

  if (existing) {
    const { rows } = await queryWithTimeout(
      `UPDATE cash_closes
       SET opening_float = $1, opened_at = COALESCE(opened_at, $2), updated_at = NOW()
       WHERE business_date = $3
       RETURNING *`,
      [float, now, date]
    );
    return getTodayCashCloseAfter(rows[0]);
  }

  const { rows } = await queryWithTimeout(
    `INSERT INTO cash_closes (business_date, opening_float, opened_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [date, float, now]
  );
  return getTodayCashCloseAfter(rows[0]);
}

export async function closeCashClose({ cash_counted, nequi_counted, notes, opening_float } = {}) {
  const date = todayLocal();
  const existing = await getCloseByDate(date);
  const float = parseMoney(
    opening_float !== undefined ? opening_float : existing?.opening_float,
    existing?.opening_float || 0
  );
  const cashCounted = parseMoney(cash_counted, 0);
  const nequiCounted = parseMoney(nequi_counted, 0);
  const live = await liveTotals(date, float);
  const cashDifference = roundMoney(cashCounted - live.expected_cash);
  const nequiDifference = roundMoney(nequiCounted - live.expected_nequi);
  const difference = roundMoney(cashDifference + nequiDifference);
  const now = new Date().toISOString();

  const values = [
    float,
    cashCounted,
    nequiCounted,
    live.expected_cash,
    live.expected_nequi,
    cashDifference,
    nequiDifference,
    difference,
    live.cash_sales,
    live.nequi_sales,
    live.cash_transactions,
    live.nequi_transactions,
    live.total_sales,
    live.total_transactions,
    String(notes || '').trim().slice(0, 500),
    existing?.opened_at || now,
    existing?.closed_at || now,
    date,
  ];

  if (existing) {
    const { rows } = await queryWithTimeout(
      `UPDATE cash_closes SET
         opening_float = $1,
         cash_counted = $2,
         nequi_counted = $3,
         expected_cash = $4,
         expected_nequi = $5,
         cash_difference = $6,
         nequi_difference = $7,
         difference = $8,
         cash_sales = $9,
         nequi_sales = $10,
         cash_transactions = $11,
         nequi_transactions = $12,
         total_sales = $13,
         total_transactions = $14,
         notes = $15,
         opened_at = COALESCE(opened_at, $16),
         closed_at = COALESCE(closed_at, $17),
         locked = CASE WHEN closed_at IS NULL THEN true ELSE locked END,
         updated_at = NOW()
       WHERE business_date = $18
       RETURNING *`,
      values
    );
    return getTodayCashCloseAfter(rows[0]);
  }

  const { rows } = await queryWithTimeout(
    `INSERT INTO cash_closes (
       business_date, opening_float, cash_counted, nequi_counted,
       expected_cash, expected_nequi, cash_difference, nequi_difference, difference,
       cash_sales, nequi_sales, cash_transactions, nequi_transactions,
       total_sales, total_transactions, notes, opened_at, closed_at, locked
     ) VALUES ($18, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true)
     RETURNING *`,
    values
  );
  return getTodayCashCloseAfter(rows[0]);
}

export async function setCashCloseLocked(locked) {
  const date = todayLocal();
  const existing = await getCloseByDate(date);
  if (!existing?.closed) {
    throw new Error('Cierra el corte del día antes de bloquear o desbloquear.');
  }

  const { rows } = await queryWithTimeout(
    `UPDATE cash_closes
     SET locked = $1, updated_at = NOW()
     WHERE business_date = $2
     RETURNING *`,
    [Boolean(locked), date]
  );
  return getTodayCashCloseAfter(rows[0]);
}

async function getTodayCashCloseAfter(row) {
  const close = normalizeCashClose(row);
  const live = await liveTotals(close.business_date, close.opening_float);
  return {
    date: close.business_date,
    opened: Boolean(close.opened_at),
    closed: Boolean(close.closed_at),
    locked: Boolean(close.locked),
    close,
    live,
  };
}
