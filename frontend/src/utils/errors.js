export function formatApiError(error) {
  const msg = String(error?.message || error || '');

  if (/timeout exceeded when trying to connect|TIMEOUT_DB|AbortError|tardó demasiado/i.test(msg)) {
    return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
  }

  if (/failed to fetch|network|conectar al servidor|NetworkError/i.test(msg)) {
    return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
  }

  if (/504|503|502/.test(msg)) {
    return 'El servidor tardó demasiado en responder. Inténtalo de nuevo.';
  }

  return msg || 'Ocurrió un error inesperado.';
}
