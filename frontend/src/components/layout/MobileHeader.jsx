import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { navItems } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';

export default function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const current = navItems.find((n) => n.pathname === location.pathname || n.to === location.pathname);

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-pastel-lavender/30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size="sm" rounded="rounded-lg" />
          <span className="font-bold text-slate-800 text-sm">
            {current?.label || 'Valma'}
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-xl hover:bg-pastel-lavender/30"
          aria-label="Menú"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-pastel-lavender/30 shadow-soft-lg animate-slide-up">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${
                    active
                      ? 'bg-gradient-to-r from-pink-400 to-violet-400 text-white'
                      : 'text-slate-600 hover:bg-pastel-lavender/30'
                  }`}
                >
                  <Icon size={20} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-pastel-lavender/20">
            <p className="text-xs text-slate-500 px-4 mb-2">{user?.username}</p>
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
