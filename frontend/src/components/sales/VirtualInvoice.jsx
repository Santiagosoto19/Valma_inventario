import { useEffect, useState } from 'react';
import { Receipt, Banknote, Smartphone, Hash, Calendar, Tag, Loader2 } from 'lucide-react';
import { api, formatCurrency, formatDate } from '../../services/api';
import { updateQueuedSalePayment } from '../../services/offlineSales';
import { useNotifications } from '../../context/NotificationContext';
import Button from '../ui/Button';

const PAYMENT = {
  cash: { label: 'Efectivo', icon: Banknote, color: 'text-emerald-700 bg-emerald-50' },
  nequi: { label: 'Nequi', icon: Smartphone, color: 'text-indigo-700 bg-indigo-50' },
};

export default function VirtualInvoice({ sale, onClose, onSaleUpdated }) {
  const { addNotification } = useNotifications();
  const [current, setCurrent] = useState(sale);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(sale);
  }, [sale]);

  if (!current) return null;

  const payment = PAYMENT[current.payment_method] || PAYMENT.cash;
  const subtotal = Number(current.subtotal ?? current.total);
  const discountItems = Number(current.discount_items ?? 0);
  const discountGlobal = Number(current.discount_global ?? 0);
  const hasDiscounts = discountItems > 0 || discountGlobal > 0;

  async function changePayment(method) {
    if (!method || method === current.payment_method || saving) return;
    setSaving(true);
    try {
      let next = current;
      if (current.pending) {
        const queued = await updateQueuedSalePayment(current.id, method);
        next = { ...current, ...(queued || {}), payment_method: method };
      } else {
        next = await api.sales.updatePayment(current.id, method);
        next = { ...current, ...next, payment_method: method };
      }
      if (method === 'nequi') {
        next = { ...next, cash_received: undefined, cash_change: undefined };
      }
      setCurrent(next);
      onSaleUpdated?.(next);
      addNotification({
        type: 'success',
        title: 'Método de pago actualizado',
        message: method === 'nequi' ? 'Quedó en Nequi.' : 'Quedó en efectivo.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'No se pudo cambiar el pago',
        message: error.message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-mt-2">
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-pink-100 to-violet-100 mb-3 shadow-soft">
          <Receipt size={28} className="text-pink-600" strokeWidth={2} />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800">Factura Virtual</h3>
        <p className="text-sm text-pink-600 font-bold mt-1">{current.invoice_number}</p>
        {current.pending && (
          <p className="mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2">
            Guardada en este dispositivo. El número de factura se asigna al sincronizar con internet.
          </p>
        )}
      </div>

      <div className="space-y-2 text-sm mb-5">
        <div className="flex justify-between items-center p-3 rounded-2xl bg-pastel-lavender/10">
          <span className="text-slate-500 font-medium flex items-center gap-2">
            <Hash size={14} /> ID
          </span>
          <span className="font-bold text-xs truncate max-w-[180px]">{current.id}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-2xl bg-pastel-lavender/10">
          <span className="text-slate-500 font-medium flex items-center gap-2">
            <Calendar size={14} /> Fecha y hora
          </span>
          <span className="font-bold">{formatDate(current.created_at)}</span>
        </div>

        <div className={`p-3 rounded-2xl ${payment.color}`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="font-medium">Método de pago</p>
            {saving && <Loader2 size={14} className="animate-spin" />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => changePayment('cash')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm min-h-11 transition-all ${
                current.payment_method === 'cash'
                  ? 'bg-gradient-to-r from-emerald-300 to-pastel-mint-deep text-emerald-900 shadow-soft'
                  : 'bg-white/80 border border-emerald-200/70 text-slate-600'
              }`}
            >
              <Banknote size={18} strokeWidth={2.5} /> Efectivo
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => changePayment('nequi')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm min-h-11 transition-all ${
                current.payment_method === 'nequi'
                  ? 'bg-gradient-to-r from-indigo-300 to-pastel-nequi-deep text-indigo-900 shadow-soft'
                  : 'bg-white/80 border border-indigo-200/70 text-slate-600'
              }`}
            >
              <Smartphone size={18} strokeWidth={2.5} /> Nequi
            </button>
          </div>
          <p className="text-[11px] font-medium mt-2 opacity-80">
            Si te equivocaste, cámbialo aquí. Contabilidad se actualiza al instante.
          </p>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Productos</p>
      <div className="space-y-2 mb-5">
        {current.items?.map((item) => (
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
          <span className="text-3xl font-extrabold text-pink-600">{formatCurrency(current.total)}</span>
        </div>
        {current.payment_method === 'cash' && current.cash_received > 0 && (
          <>
            <div className="flex justify-between text-sm pt-2">
              <span className="text-slate-600 font-medium">Recibido</span>
              <span className="font-bold">{formatCurrency(current.cash_received)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-emerald-800">Devuelta</span>
              <span className="text-xl font-extrabold text-emerald-700">
                {formatCurrency(Math.max(0, Number(current.cash_change) || 0))}
              </span>
            </div>
          </>
        )}
      </div>

      {onClose && (
        <Button variant="ghost" className="w-full" onClick={onClose}>Cerrar</Button>
      )}
    </div>
  );
}
