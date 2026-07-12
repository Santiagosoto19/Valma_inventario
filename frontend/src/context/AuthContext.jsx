import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, getStoredUser, setAuth, clearAuth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: verified } = await api.auth.me();
        setUser(verified);
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.auth.login(username, password);
    setAuth(data.token, data.user);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
