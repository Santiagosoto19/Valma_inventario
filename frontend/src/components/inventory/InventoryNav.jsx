import { Link, useLocation } from 'react-router-dom';
import { Package, AlertTriangle } from 'lucide-react';

const tabs = [
  { to: '/inventario', label: 'Productos', icon: Package },
  { to: '/escasez', label: 'Stock crítico', icon: AlertTriangle },
];

export default function InventoryNav() {
  const location = useLocation();

  return (
    <nav
      className="flex gap-2 p-1 bg-pastel-lavender/20 rounded-2xl overflow-x-auto"
      aria-label="Secciones de inventario"
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.to;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap min-h-11 transition-all ${
              active
                ? 'bg-gradient-to-r from-pink-400 to-violet-400 text-white shadow-soft'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-800'
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
