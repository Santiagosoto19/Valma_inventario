import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  ShoppingCart,
  IceCreamCone,
  Copy,
} from 'lucide-react';

export const navItems = [
  { to: '/', label: 'Contabilidad', icon: LayoutDashboard },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/escasez', label: 'Stock Crítico', icon: AlertTriangle },
  { to: '/caja', label: 'Punto de Venta', icon: ShoppingCart },
  { to: '/helados', label: 'Helados', icon: IceCreamCone },
  { to: '/copias', label: 'Copias', icon: Copy },
];
