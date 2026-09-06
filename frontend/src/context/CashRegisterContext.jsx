import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const CACHE_KEY = 'valma_cash_register';
const CashRegisterContext = createContext(null);

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      date: data.date,
      opened: data.opened,
      closed: data.closed,
      locked: data.locked,
    }));
  } catch {
    // ignore quota / private mode
  }
}

export function CashRegisterProvider({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const cached = readCache();
  const [today, setToday] = useState(cached);
  const [loadingToday, setLoadingToday] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.cashClose.today();
    setToday(data);
    writeCache(data);
    return data;
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated) {
      setLoadingToday(false);
      return;
    }
    let cancelled = false;
    setLoadingToday(true);
    refresh()
      .catch(() => {
        if (!cancelled) setToday((prev) => prev || cached);
      })
      .finally(() => {
        if (!cancelled) setLoadingToday(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, refresh]);

  return (
    <CashRegisterContext.Provider
      value={{
        date: today?.date,
        opened: Boolean(today?.opened),
        closed: Boolean(today?.closed),
        locked: Boolean(today?.locked),
        close: today?.close || null,
        live: today?.live || null,
        loading: loadingToday,
        refresh,
      }}
    >
      {children}
    </CashRegisterContext.Provider>
  );
}

export function useCashRegister() {
  const ctx = useContext(CashRegisterContext);
  if (!ctx) throw new Error('useCashRegister debe usarse dentro de CashRegisterProvider');
  return ctx;
}
