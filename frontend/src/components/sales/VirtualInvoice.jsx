import { Receipt, Banknote, Smartphone, Hash, Calendar, Tag } from 'lucide-react';
import { formatCurrency, formatDate } from '../../services/api';
import Button from '../ui/Button';

const PAYMENT = {
  cash: { label: 'Efectivo', icon: Banknote, color: 'text-emerald-700 bg-emerald-50' },
  nequi: { label: 'Nequi', icon: Smartphone, color: 'text-indigo-700 bg-indigo-50' },
};

export default function VirtualInvoice({ sale, onClose }) {
  if (!sale) return null;

  const payment = PAYMENT[sale.payment_method] || PAYMENT.cash;
  const PayIcon = payment.icon;
  const subtotal = Number(sale.subtotal ?? sale.total);
  const discountItems = Number(sale.discount_items ?? 0);
  const discountGlobal = Number(sale.discount_global ?? 0);
  const hasDiscounts = discountItems > 0 || discountGlobal > 0;

  return (
    <div className="-mt-2">
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-pink-100 to-violet-100 mb-3 shadow-soft">
          <Receipt size={28} className="text-pink-600" strokeWidth={2} />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800">Factura Virtual</h3>
        <p className="text-sm text-pink-600 font-bold mt-1">{sale.invoice_number}</p>
      </div>

      <div className="space-y-2 text-sm mb-5">
        <div className="flex justify-between items-center p-3 rounded-2xl bg-pastel-lavender/10">
          <span className="text-slate-500 font-medium flex items-center gap-2">
            <Hash size={14} /> ID
          </span>
          <span className="font-bold text-xs truncate max-w-[180px]">{sale.id}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-2xl bg-pastel-lavender/10">
          <span className="text-slate-500 font-medium flex items-center gap-2">
            <Calendar size={14} /> Fecha y hora
          </span>
          <span className="font-bold">{formatDate(sale.created_at)}</span>
        </div>
        <div className={`flex justify-between items-center p-3 rounded-2xl ${payment.color}`}>
          <span className="font-medium flex items-center gap-2">
            <PayIcon size={16} strokeWidth={2.5} /> Método de pago
          </span>
          <span className="font-bold">{payment.label}</span>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Productos</p>
      <div className="space-y-2 mb-5">
        {sale.items?.map((item) => (
          <div key={item.id} className="p-3 rounded-2xl bg-white border border-pastel-lavender/20">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{item.product_name}</p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </p>
              </div>
              <p className="font-extrabold text-sm text-slate-800 shrink-0">
                {formatCurrency(item.line_subtotal ?? item.subtotal)}
              </p>
            </div>
            {Number(item.discount_amount) > 0 && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <Tag size={12} /> Rebaja: -{formatCurrency(item.discount_amount)}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2 mb-5 p-4 rounded-2xl bg-pastel-cream border border-pastel-lavender/20">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 font-medium">Subtotal</span>
          <span className="font-bold">{formatCurrency(subtotal)}</span>
        </div>
        {hasDiscounts && (
          <>
            {discountItems > 0 && (
              <div className="flex justify-between text-sm text-rose-600">
                <span className="font-medium">Rebaja por productos</span>
                <span className="font-bold">-{formatCurrency(discountItems)}</span>
              </div>
            )}
            {discountGlobal > 0 && (
              <div className="flex justify-between text-sm text-rose-600">
                <span className="font-medium">Rebaja cuenta completa</span>
                <span className="font-bold">-{formatCurrency(discountGlobal)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-pastel-lavender/30">
          <span className="text-lg font-extrabold text-slate-800">TOTAL</span>
          <span className="text-3xl font-extrabold text-pink-600">{formatCurrency(sale.total)}</span>
        </div>
      </div>

      {onClose && (
        <Button variant="ghost" className="w-full" onClick={onClose}>Cerrar</Button>
      )}
    </div>
  );
}
