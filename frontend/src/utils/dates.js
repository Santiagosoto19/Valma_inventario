const DISPLAY_TIMEZONE = 'America/Bogota';

/** Fecha local YYYY-MM-DD (Colombia). */
export function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Año y mes (1-12) en Colombia. */
export function localYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === 'year').value),
    month: Number(parts.find((p) => p.type === 'month').value),
  };
}

/** Convierte YYYY-MM-DD a dd/mm/yyyy para mostrar en pantalla. */
export function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
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
