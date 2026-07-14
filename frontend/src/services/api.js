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

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new Error(
      'No se pudo conectar al servidor. Verifica que el backend esté corriendo.'
    );
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 405) {
    throw new Error(
      'Error 405: la API no responde. Verifica el despliegue en Vercel (Root Directory = raíz del repo).'
    );
  }

  if (res.status === 401 && !path.includes('/auth/login')) {
    clearAuth();
    window.location.href = '/login';
    throw new Error(data.error || 'Sesión expirada');
  }

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }

  return data;
}

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
    get: (id) => request(`/api/products/${id}`),
    create: (formData) =>
      request('/api/products', { method: 'POST', body: formData, headers: {} }),
    update: (id, formData) =>
      request(`/api/products/${id}`, { method: 'PUT', body: formData, headers: {} }),
    delete: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
    lowStock: () => request('/api/products/low-stock'),
  },
  sales: {
    create: (body) =>
      request('/api/sales', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (id) => request(`/api/sales/${id}`),
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
