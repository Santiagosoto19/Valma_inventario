/** Zona horaria del negocio (Colombia, UTC-5). */
export const BUSINESS_TIMEZONE = process.env.TZ || 'America/Bogota';

/** Fecha local YYYY-MM-DD en la zona del negocio. */
export function todayLocal(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Año y mes (1-12) en la zona del negocio. */
export function localYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === 'year').value),
    month: Number(parts.find((p) => p.type === 'month').value),
  };
}

/** SQL: fecha Colombia desde created_at (timestamptz). */
export function sqlCreatedAtLocalDate(column = 'created_at') {
  return `(${column} AT TIME ZONE '${BUSINESS_TIMEZONE}')::date`;
}

/** SQL: venta incluida en una fecha comercial (sale_date o created_at Colombia). */
export function sqlSaleMatchesDate(paramIndex) {
  const localDate = sqlCreatedAtLocalDate('created_at');
  return `(sale_date = $${paramIndex}::date OR ${localDate} = $${paramIndex}::date)`;
}

/** SQL: venta incluida en un mes comercial. */
export function sqlSaleMatchesMonth(yearIndex, monthIndex) {
  const localDate = sqlCreatedAtLocalDate('created_at');
  return `(
    (EXTRACT(YEAR FROM sale_date) = $${yearIndex} AND EXTRACT(MONTH FROM sale_date) = $${monthIndex})
    OR
    (EXTRACT(YEAR FROM ${localDate}) = $${yearIndex} AND EXTRACT(MONTH FROM ${localDate}) = $${monthIndex})
  )`;
}

/** SQL: fecha Colombia actual al insertar ventas. */
export function sqlTodayLocalDate() {
  return `(NOW() AT TIME ZONE '${BUSINESS_TIMEZONE}')::date`;
}

/** Convierte DATE de PostgreSQL (node-pg → Date UTC) a YYYY-MM-DD sin desfase. */
export function formatPgDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

/** Fecha comercial de una venta (prioriza created_at en Colombia). */
export function businessDateFromSale(sale) {
  if (sale?.created_at) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(sale.created_at));
  }
  return formatPgDate(sale?.sale_date);
}

export function normalizePaymentMethod(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'cash' || key === 'efectivo') return 'cash';
  if (key === 'nequi') return 'nequi';
  return key;
}

function roundMoney(n) {
  const v = parseMoney(n);
  return Math.round(v * 100) / 100;
}

/**
 * Parse a monetary value from various string formats into a Number.
 * Handles values like "$4.500", "4.500", "4,500.25", "4,500", and plain numbers.
 */
export function parseMoney(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  let s = String(value).trim();
  if (!s) return NaN;
  // Remove currency symbols and whitespace
  s = s.replace(/[^0-9.,-]/g, '');

  const hasComma = s.indexOf(',') !== -1;
  const hasDot = s.indexOf('.') !== -1;

  if (hasDot && hasComma) {
    // assume format like 1.234,56 -> dot thousands, comma decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // assume comma is decimal separator
    s = s.replace(',', '.');
  } else if (hasDot && !hasComma) {
    // ambiguous: single dot could be decimal or thousand separator
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      // multiple dots -> remove all (thousand separators)
      s = s.replace(/\./g, '');
    } else {
      const parts = s.split('.');
      // if there are exactly 3 digits after dot, it's likely a thousands separator
      if (parts[1] && parts[1].length === 3) {
        s = s.replace(/\./g, '');
      }
      // otherwise leave as decimal
    }
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : NaN;
}

export function aggregateSalesSummary(sales, meta = {}) {
  const summary = {
    ...meta,
    cash: { total: 0, transactions: 0 },
    nequi: { total: 0, transactions: 0 },
    grand_total: 0,
    total_transactions: 0,
  };

  for (const sale of sales) {
    const amount = roundMoney(sale.total);
    if (!Number.isFinite(amount)) continue;

    const method = normalizePaymentMethod(sale.payment_method);
    if (method === 'cash') {
      summary.cash.total = roundMoney(summary.cash.total + amount);
      summary.cash.transactions += 1;
    } else if (method === 'nequi') {
      summary.nequi.total = roundMoney(summary.nequi.total + amount);
      summary.nequi.transactions += 1;
    }

    summary.grand_total = roundMoney(summary.grand_total + amount);
    summary.total_transactions += 1;
  }

  return summary;
}

export function normalizeSaleRecord(sale) {
  if (!sale) return sale;
  return {
    ...sale,
    sale_date: formatPgDate(sale.sale_date),
    total: roundMoney(sale.total),
    payment_method: normalizePaymentMethod(sale.payment_method),
  };
}
