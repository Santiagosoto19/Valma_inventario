import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pastel-cream">
        <div className="animate-pulse text-pink-400 font-semibold">Cargando...</div>
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-pastel-cream to-violet-50 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md card-pastel p-8 sm:p-10 shadow-soft-lg animate-scale-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" rounded="rounded-3xl" className="shadow-soft" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Valma Inventario</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Acceso exclusivo para administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-pastel flex items-center gap-1.5">
              <User size={14} strokeWidth={2.5} />
              Usuario
            </label>
            <input
              className="input-pastel"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="label-pastel flex items-center gap-1.5">
              <Lock size={14} strokeWidth={2.5} />
              Contraseña
            </label>
            <div className="relative">
              <input
                className="input-pastel pr-12"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  );
}
