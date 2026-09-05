import { formatApiError } from '../utils/errors.js';

const TOKEN_KEY = 'valma_token';
const USER_KEY = 'valma_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}, timeoutMs = 15_000) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(path, { ...options, headers, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('La operación tardó demasiado. Inténtalo de nuevo.');
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    const hint = import.meta.env.DEV
      ? ' En local ejecuta: npm run start.'
      : '';
    const networkError = new Error(`No se pudo conectar al servidor.${hint}`);
    networkError.code = 'NETWORK';
    throw networkError;
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 405) {
    throw new Error(
      'Error 405: la API no responde. Verifica el despliegue en Vercel.'
    );
  }

  if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/me')) {
    clearAuth();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Sesión expirada');
  }

  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status}`);
    if ([502, 503, 504].includes(res.status)) {
      error.code = 'TIMEOUT';
    }
    throw error;
  }

  return data;
}

export { formatApiError };

export const api = {
  auth: {
    login: (username, password) =>
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request('/api/auth/me'),
  },
  products: {
    list: () => request('/api/products'),
    byBarcode: (code) =>
      request(`/api/products/by-barcode/${encodeURIComponent(code)}`),
    services: (group) => request(`/api/products/services/${group}`),
    get: (id) => request(`/api/products/${id}`),
    create: (formData) =>
      request('/api/products', { method: 'POST', body: formData, headers: {} }, 30_000),
    update: (id, formData) =>
      request(`/api/products/${id}`, { method: 'PUT', body: formData, headers: {} }, 30_000),
    delete: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
    generateBarcode: (id) =>
      request(`/api/products/${id}/barcode`, { method: 'POST' }),
    generateMissingBarcodes: () =>
      request('/api/products/missing-barcodes', { method: 'POST' }),
    downloadBarcodesPdf: async () => {
      const token = getToken();
      const res = await fetch('/api/products/barcodes.pdf', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'valma-codigos-barras.pdf';
      link.click();
      URL.revokeObjectURL(url);
    },
    lowStock: () => request('/api/products/low-stock'),
  },
  sales: {
    create: (body) =>
      request(
        '/api/sales',
        { method: 'POST', body: JSON.stringify(body) },
        25_000
      ),
    get: (id) => request(`/api/sales/${id}`),
    updatePayment: (id, payment_method) =>
      request(`/api/sales/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_method }),
      }),
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/sales${qs ? `?${qs}` : ''}`);
    },
  },
  accounting: {
    dashboard: () => request('/api/accounting/dashboard'),
    daily: (date) => request(`/api/accounting/daily${date ? `?date=${date}` : ''}`),
    monthly: (year, month) =>
      request(`/api/accounting/monthly?year=${year}&month=${month}`),
  },
  scanner: {
    status: () => request('/api/scanner/status', {}, 4_000),
  },
  settings: {
    get: () => request('/api/settings'),
    update: (stock_threshold) =>
      request('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ stock_threshold }),
      }),
  },
};

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function getImageUrl(url) {
  if (!url) return null;
  return url;
}
