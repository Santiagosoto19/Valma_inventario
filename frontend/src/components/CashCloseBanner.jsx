import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useCashRegister } from '../context/CashRegisterContext';

export default function CashCloseBanner() {
  const { locked, closed } = useCashRegister();
  if (!locked) return null;

  return (
    <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
      <Lock size={18} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm">Caja bloqueada</p>
        <p className="text-xs font-medium mt-0.5">
          {closed
            ? 'El corte del día está cerrado. Desbloquéala si necesitas vender otra vez.'
            : 'No se pueden registrar ventas hasta desbloquear la caja.'}
        </p>
      </div>
      <Link
        to="/cierre"
        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-rose-200 shrink-0"
      >
        Ir a Cierre
      </Link>
    </div>
  );
}
