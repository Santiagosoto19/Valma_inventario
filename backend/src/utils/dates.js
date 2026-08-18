/** Zona horaria del negocio (Colombia, UTC-5). */
export const BUSINESS_TIMEZONE = process.env.BUSINESS_TZ || 'America/Bogota';

/** El mes comercial cierra el día 18 (del 18 del mes anterior al 18 inclusive). */
export const BUSINESS_MONTH_DAY = 18;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addCalendarMonths(year, month, delta) {
  const total = Number(year) * 12 + (Number(month) - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

function addIsoDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Fecha local YYYY-MM-DD en la zona del negocio. */
export function todayLocal(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === 'year').value),
    month: Number(parts.find((p) => p.type === 'month').value),
    day: Number(parts.find((p) => p.type === 'day').value),
  };
}

/** Año y mes calendario (1-12) en la zona del negocio. */
export function localYearMonth(date = new Date()) {
  const { year, month } = localDateParts(date);
  return { year, month };
}

/**
 * Mes comercial actual, identificado por el mes en que cierra (día 18).
 * El 17 de agosto → cierra agosto (18 jul – 18 ago). El 19 de agosto → cierra septiembre.
 */
export function localBusinessYearMonth(date = new Date()) {
  const { year, month, day } = localDateParts(date);
  if (day <= BUSINESS_MONTH_DAY) return { year, month };
  return addCalendarMonths(year, month, 1);
}

/** Cantidad de días de un mes calendario (month 1-12). */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Rango del mes comercial que cierra el 18 de `month`/`year`.
 * Ejemplo: agosto 2026 → start 2026-07-18, end exclusivo 2026-08-19 (incluye el 18 ago).
 */
export function monthDateRange(year, month) {
  const closing = { year: Number(year), month: Number(month) };
  const prev = addCalendarMonths(closing.year, closing.month, -1);
  const start = ymd(prev.year, prev.month, BUSINESS_MONTH_DAY);
  const endInclusive = ymd(closing.year, closing.month, BUSINESS_MONTH_DAY);
  return {
    start,
    end: addIsoDays(endInclusive, 1),
    endInclusive,
  };
}

/** Todas las fechas YYYY-MM-DD del mes comercial (18 al 18 inclusive). */
export function allDatesInMonth(year, month) {
  const { start, end } = monthDateRange(year, month);
  const dates = [];
  let cursor = start;
  while (cursor < end) {
    dates.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }
  return dates;
}

/** SQL: fecha Colombia desde created_at (timestamptz). */
export function sqlCreatedAtLocalDate(column = 'created_at') {
  return `(${column} AT TIME ZONE '${BUSINESS_TIMEZONE}')::date`;
}

/** SQL: venta incluida en una fecha comercial (sale_date). */
export function sqlSaleMatchesDate(paramIndex) {
  return `sale_date = $${paramIndex}::date`;
}

/** SQL: venta incluida en un mes comercial (sale_date). */
export function sqlSaleMatchesMonth(startIndex, endIndex) {
  return `(sale_date >= $${startIndex}::date AND sale_date < $${endIndex}::date)`;
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

/** Fecha comercial de una venta (sale_date; si falta, created_at en Colombia). */
export function businessDateFromSale(sale) {
  const fromSaleDate = formatPgDate(sale?.sale_date);
  if (fromSaleDate) return fromSaleDate;
  if (sale?.created_at) {
    return todayLocal(new Date(sale.created_at));
  }
  return null;
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

  const ignored = [];

  for (const sale of sales) {
    const amount = roundMoney(sale.total);
    if (!Number.isFinite(amount)) {
      ignored.push({ reason: 'invalid_total', sale: { id: sale.id, invoice_number: sale.invoice_number, total: sale.total } });
      continue;
    }

    const method = normalizePaymentMethod(sale.payment_method);
    if (method === 'cash') {
      summary.cash.total = roundMoney(summary.cash.total + amount);
      summary.cash.transactions += 1;
    } else if (method === 'nequi') {
      summary.nequi.total = roundMoney(summary.nequi.total + amount);
      summary.nequi.transactions += 1;
    } else {
      ignored.push({ reason: 'unknown_method', sale: { id: sale.id, invoice_number: sale.invoice_number, payment_method: sale.payment_method } });
      // still count toward grand total if payment method unknown? skip counting toward method totals
    }

    summary.grand_total = roundMoney(summary.grand_total + amount);
    summary.total_transactions += 1;
  }

  if (ignored.length) {
    console.warn('aggregateSalesSummary: ignored sales', JSON.stringify(ignored.slice(0, 20)));
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
