import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

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
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('stock:alert', (data) => {
      addNotification({
        type: 'warning',
        title: 'Stock crítico',
        message: data.message,
        product: data.product,
      });
    });

    return () => socket.disconnect();
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
