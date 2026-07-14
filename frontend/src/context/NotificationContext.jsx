import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

import { getSocketBase } from '../config/env.js';
import { api } from '../services/api.js';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 60_000;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const seenAlertsRef = useRef(new Set());

  const addNotification = useCallback((notification) => {
    const id = crypto.randomUUID();
    setNotifications((prev) => [
      { id, ...notification, createdAt: Date.now() },
      ...prev,
    ].slice(0, 10));

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 8000);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const useExternalSocket = Boolean(import.meta.env.VITE_SOCKET_URL?.trim());

    if (import.meta.env.DEV || useExternalSocket) {
      const socket = io(
        useExternalSocket ? getSocketBase() : 'http://localhost:3001',
        { transports: ['websocket', 'polling'] }
      );

      socket.on('stock:alert', (data) => {
        addNotification({
          type: 'warning',
          title: 'Stock crítico',
          message: data.message,
          product: data.product,
        });
      });

      return () => socket.disconnect();
    }

    async function checkLowStock() {
      try {
        const products = await api.products.lowStock();
        products.forEach((product) => {
          const key = `${product.id}-${product.stock}`;
          if (seenAlertsRef.current.has(key)) return;
          seenAlertsRef.current.add(key);

          addNotification({
            type: 'warning',
            title: 'Stock crítico',
            message: `Stock crítico: ${product.name} (${product.stock} unidades restantes)`,
            product,
          });
        });
      } catch {
        // API no disponible aún
      }
    }

    checkLowStock();
    const interval = setInterval(checkLowStock, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, dismiss, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  return ctx;
}
