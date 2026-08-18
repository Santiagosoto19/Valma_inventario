const DISPLAY_TIMEZONE = 'America/Bogota';
const BUSINESS_MONTH_DAY = 18;

function addCalendarMonths(year, month, delta) {
  const total = Number(year) * 12 + (Number(month) - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Fecha local YYYY-MM-DD (Colombia). */
export function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIMEZONE,
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

/** Año y mes calendario (1-12) en Colombia. */
export function localYearMonth(date = new Date()) {
  const { year, month } = localDateParts(date);
  return { year, month };
}

/**
 * Mes comercial actual (cierra el día 18).
 * El 17 de agosto → agosto (18 jul – 18 ago). El 19 de agosto → septiembre.
 */
export function localBusinessYearMonth(date = new Date()) {
  const { year, month, day } = localDateParts(date);
  if (day <= BUSINESS_MONTH_DAY) return { year, month };
  return addCalendarMonths(year, month, 1);
}

/** Rango visible del mes comercial que cierra el 18 de `month`/`year`. */
export function businessMonthRange(year, month) {
  const prev = addCalendarMonths(year, month, -1);
  return {
    start: `${prev.year}-${pad2(prev.month)}-${pad2(BUSINESS_MONTH_DAY)}`,
    end: `${year}-${pad2(month)}-${pad2(BUSINESS_MONTH_DAY)}`,
  };
}

/** Convierte YYYY-MM-DD a dd/mm/yyyy para mostrar en pantalla. */
export function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/** Fecha larga en español (ej. 21 de julio, 2026) en zona Colombia. */
export function formatLongDateSpanish(isoDate) {
  const date = isoDate
    ? new Date(`${String(isoDate).slice(0, 10)}T12:00:00`)
    : new Date();

  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: DISPLAY_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';

  return `${day} de ${month}, ${year}`;
}

/** Hora legible en Colombia. */
export function formatLocalDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CO', {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
