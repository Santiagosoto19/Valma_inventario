import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pastel-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
}
