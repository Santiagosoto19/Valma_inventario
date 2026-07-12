import { Link, useLocation } from 'react-router-dom';
import { navItems } from '../../config/navigation';

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-pastel-lavender/40 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl min-w-[4.5rem] transition-all ${
                active
                  ? 'text-pink-600 bg-pink-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-bold leading-tight text-center">
                {item.label.split(' ').pop()}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
