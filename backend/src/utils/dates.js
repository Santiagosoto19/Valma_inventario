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

export function normalizeSaleRecord(sale) {
  if (!sale) return sale;
  return {
    ...sale,
    sale_date: formatPgDate(sale.sale_date),
  };
}
