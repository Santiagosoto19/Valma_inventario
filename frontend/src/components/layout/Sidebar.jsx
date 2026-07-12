import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { navItems } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex w-64 flex-col shrink-0 bg-gradient-to-b from-pink-50 via-pastel-lavender/30 to-white border-r border-pastel-lavender/40">
      <div className="p-6 border-b border-pastel-lavender/30">
        <div className="flex items-center gap-3">
          <Logo size="md" rounded="rounded-2xl" />
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Valma</h1>
            <p className="text-xs text-slate-500 font-medium">Inventario</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-pink-400 to-violet-400 text-white shadow-soft'
                  : 'text-slate-600 hover:bg-pastel-lavender/40 hover:text-slate-800'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-pastel-lavender/30">
        <p className="text-xs text-slate-500 mb-2 font-medium">{user?.username} · Admin</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut size={18} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
