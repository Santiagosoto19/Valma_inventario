/** Quita espacios, barras finales y un /api accidental al final. */
export function normalizeBaseUrl(value) {
  return String(value ?? '')
    .replace(/\s/g, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '');
}

export function getApiBase() {
  return normalizeBaseUrl(import.meta.env.VITE_API_URL);
}

export function getSocketBase() {
  return normalizeBaseUrl(
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
  ) || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
}

export function joinUrl(base, path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;

  try {
    return new URL(normalizedPath.slice(1), `${base}/`).href;
  } catch {
    return `${base}${normalizedPath}`;
  }
}
