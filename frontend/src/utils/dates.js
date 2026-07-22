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

/** Convierte YYYY-MM-DD a dd/mm/yyyy para mostrar en pantalla. */
export function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}
