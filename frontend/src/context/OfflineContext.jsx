import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { formatApiError } from '../utils/errors';
import { formatCurrency } from '../services/api';
import { loadCatalog, saveCatalog } from '../services/offlineDb';
import {
  dismissQueueItem,
  getQueueSnapshot,
  retryQueueItem,
  submitSale as submitSaleOffline,
  syncPendingSales,
} from '../services/offlineSales';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { addNotification } = useNotifications();
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [failed, setFailed] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    const snap = await getQueueSnapshot();
    setPendingCount(snap.pending.length);
    setFailed(snap.failed);
    return snap;
  }, []);

  const syncQueue = useCallback(async () => {
    if (!isAuthenticated || syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingSales({
        onSynced: ({ sale }) => {
          addNotification({
            type: 'success',
            title: 'Venta sincronizada',
            message: `Factura ${sale.invoice_number} — ${formatCurrency(sale.total)}`,
          });
        },
        onFailed: ({ item, error }) => {
          addNotification({
            type: 'error',
            title: 'No se pudo guardar una venta de la cola',
            message: formatApiError(error) || item.preview?.invoice_number,
          });
        },
      });
      setPendingCount(result.pending.length);
      setFailed(result.failed);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [addNotification, isAuthenticated]);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    refreshQueue();
  }, [isAuthenticated, loading, refreshQueue]);

  useEffect(() => {
    if (loading || !isAuthenticated || !online) return;
    syncQueue();
  }, [isAuthenticated, loading, online, syncQueue]);

  const cacheProducts = useCallback(async (catalogKey, products) => {
    await saveCatalog(catalogKey, products);
    return products;
  }, []);

  const readCachedProducts = useCallback(async (catalogKey) => {
    return loadCatalog(catalogKey);
  }, []);

  const submitSale = useCallback(async ({ catalogKey, body, lines }) => {
    const result = await submitSaleOffline({ catalogKey, body, lines });
    await refreshQueue();
    return result;
  }, [refreshQueue]);

  const dismissFailed = useCallback(async (id) => {
    await dismissQueueItem(id);
    await refreshQueue();
  }, [refreshQueue]);

  const retryFailed = useCallback(async (id) => {
    await retryQueueItem(id);
    await refreshQueue();
    if (navigator.onLine) await syncQueue();
  }, [refreshQueue, syncQueue]);

  return (
    <OfflineContext.Provider
      value={{
        online,
        pendingCount,
        failed,
        syncing,
        cacheProducts,
        readCachedProducts,
        submitSale,
        syncQueue,
        dismissFailed,
        retryFailed,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline debe usarse dentro de OfflineProvider');
  return ctx;
}
