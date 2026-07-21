export function httpStatusFromError(error, fallback = 500) {
  if (error.message?.startsWith('TIMEOUT')) return 504;
  return fallback;
}

export function userFacingError(error) {
  const msg = error?.message || 'Error interno del servidor';
  if (msg.startsWith('TIMEOUT_DB:') || msg.startsWith('TIMEOUT')) {
    return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
  }
  return msg;
}
