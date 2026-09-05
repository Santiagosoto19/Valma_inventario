import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { useScannerConnection } from '../hooks/useScannerConnection';

const ScannerContext = createContext(null);

export function ScannerProvider({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { addNotification } = useNotifications();

  const scanner = useScannerConnection({
    enabled: isAuthenticated && !loading,
    onChange: ({ connected, deviceName }) => {
      addNotification({
        type: connected ? 'success' : 'warning',
        title: connected ? 'Lector USB conectado' : 'Lector USB desconectado',
        message: connected
          ? (deviceName ? `${deviceName} listo para escanear.` : 'Ya puedes escanear códigos en caja.')
          : 'Enchufa el lector. Funciona en Linux y Windows.',
      });
    },
  });

  return (
    <ScannerContext.Provider value={scanner}>
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const ctx = useContext(ScannerContext);
  if (!ctx) throw new Error('useScanner debe usarse dentro de ScannerProvider');
  return ctx;
}
