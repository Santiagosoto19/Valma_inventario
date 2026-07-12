import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import NotificationToast from './components/NotificationToast';
import LoginPage from './pages/LoginPage';
import AccountingPage from './pages/AccountingPage';
import InventoryPage from './pages/InventoryPage';
import LowStockPage from './pages/LowStockPage';
import POSPage from './pages/POSPage';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><AccountingPage /></PrivateRoute>} />
            <Route path="/inventario" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
            <Route path="/escasez" element={<PrivateRoute><LowStockPage /></PrivateRoute>} />
            <Route path="/caja" element={<PrivateRoute><POSPage /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <NotificationToast />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
