import { useEffect, useState } from 'react';
import {
  Banknote,
  Lock,
  LockOpen,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { api, formatApiError, formatCurrency } from '../services/api';
import { formatDisplayDate, formatLongDateSpanish } from '../utils/dates';
import { useCashRegister } from '../context/CashRegisterContext';
import { useNotifications } from '../context/NotificationContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';

function moneyClass(value) {
  if (value > 0) return 'text-emerald-700';
  if (value < 0) return 'text-rose-600';
  return 'text-slate-800';
}

export default function CashClosePage() {
  const { refresh: refreshContext } = useCashRegister();
  const { addNotification } = useNotifications();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [openingFloat, setOpeningFloat] = useState('');
  const [cashCounted, setCashCounted] = useState('');
  const [nequiCounted, setNequiCounted] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    const [todayData, historyData] = await Promise.all([
      api.cashClose.today(),
      api.cashClose.history(),
    ]);
    setToday(todayData);
    setHistory(historyData);
    if (todayData.close) {
      setOpeningFloat(String(todayData.close.opening_float ?? ''));
      if (todayData.close.cash_counted != null) {
        setCashCounted(String(todayData.close.cash_counted));
      }
      if (todayData.close.nequi_counted != null) {
        setNequiCounted(String(todayData.close.nequi_counted));
      }
      setNotes(todayData.close.notes || '');
    }
    await refreshContext();
    return todayData;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((error) => {
        if (!cancelled) {
          addNotification({
            type: 'error',
            title: 'No se pudo cargar el cierre',
            message: formatApiError(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runAction(key, action, success) {
    try {
      setSaving(key);
      const data = await action();
      setToday(data);
      await refreshContext();
      const historyData = await api.cashClose.history();
      setHistory(historyData);
      addNotification({ type: 'success', title: success });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'No se pudo completar',
        message: formatApiError(error),
      });
    } finally {
      setSaving('');
    }
  }

  if (loading || !today) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  const live = today.live || {};
  const close = today.close;
  const expectedCash = live.expected_cash ?? ((Number(openingFloat) || 0) + (live.cash_sales || 0));
  const expectedNequi = live.expected_nequi ?? (live.nequi_sales || 0);
  const expectedTotal = live.expected_total ?? (expectedCash + expectedNequi);
  const cashValue = cashCounted === '' ? null : Number(cashCounted);
  const nequiValue = nequiCounted === '' ? null : Number(nequiCounted);
  const cashDiff = cashValue == null || !Number.isFinite(cashValue)
    ? null
    : Math.round((cashValue - expectedCash) * 100) / 100;
  const nequiDiff = nequiValue == null || !Number.isFinite(nequiValue)
    ? null
    : Math.round((nequiValue - expectedNequi) * 100) / 100;
  const totalDiff = cashDiff == null || nequiDiff == null
    ? null
    : Math.round((cashDiff + nequiDiff) * 100) / 100;
  const pastCloses = history.filter((row) => row.business_date !== today.date);

  function diffLabel(value) {
    if (value == null) return null;
    if (value === 0) return 'Cuadra exacto';
    return value > 0
      ? `Sobra ${formatCurrency(value)}`
      : `Falta ${formatCurrency(Math.abs(value))}`;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Cierre de caja</h2>
          <p className="text-slate-500 mt-1 font-medium">
            Un corte por día · {formatLongDateSpanish(today.date)}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border ${
          today.locked
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : today.closed
              ? 'text-amber-800 bg-amber-50 border-amber-200'
              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
        }`}>
          {today.locked ? <Lock size={12} /> : <LockOpen size={12} />}
          {today.locked ? 'Bloqueada' : today.closed ? 'Cerrada · se puede vender' : 'Abierta'}
        </span>
      </div>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Ventas efectivo" amount={live.cash_sales || 0} transactions={live.cash_transactions || 0} icon={Banknote} variant="cash" />
        <MetricCard title="Ventas Nequi" amount={live.nequi_sales || 0} transactions={live.nequi_transactions || 0} icon={Smartphone} variant="nequi" />
        <MetricCard title="Total del día" amount={live.total_sales || 0} transactions={live.total_transactions || 0} icon={TrendingUp} variant="total" />
        <MetricCard
          title="Total esperado"
          amount={expectedTotal}
          icon={Wallet}
          subtitle={`Fondo ${formatCurrency(Number(openingFloat) || close?.opening_float || 0)} + efectivo + Nequi`}
        />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 sm:p-6 space-y-4">
          <h3 className="font-extrabold text-lg text-slate-800">Fondo de caja</h3>
          <p className="text-sm text-slate-500 font-medium">
            Dinero que había al abrir. No es obligatorio, pero ayuda a cuadrar el efectivo.
          </p>
          <label className="label-pastel">Fondo inicial</label>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            disabled={today.closed}
            className="input-pastel font-bold"
            placeholder="0"
          />
          {!today.closed && (
            <Button
              variant="ghost"
              onClick={() => runAction('open', () => api.cashClose.open(Number(openingFloat) || 0), 'Caja abierta')}
              disabled={Boolean(saving)}
            >
              {saving === 'open' ? 'Guardando...' : today.opened ? 'Actualizar fondo' : 'Abrir caja'}
            </Button>
          )}
        </Card>

        <Card className="p-5 sm:p-6 space-y-4">
          <h3 className="font-extrabold text-lg text-slate-800">
            {today.closed ? 'Actualizar corte' : 'Cerrar corte del día'}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            Cuenta el efectivo y lo que aparece en Nequi. El corte incluye los dos.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="label-pastel !mb-0">Efectivo contado</label>
              <button
                type="button"
                className="text-[11px] font-bold text-emerald-700"
                onClick={() => setCashCounted(String(Math.round(expectedCash)))}
              >
                Usar esperado · {formatCurrency(expectedCash)}
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              className="input-pastel font-bold"
              placeholder="¿Cuánto hay en caja?"
            />
            {cashDiff != null && (
              <p className={`text-sm font-bold ${moneyClass(cashDiff)}`}>{diffLabel(cashDiff)}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="label-pastel !mb-0">Nequi contado</label>
              <button
                type="button"
                className="text-[11px] font-bold text-indigo-700"
                onClick={() => setNequiCounted(String(Math.round(expectedNequi)))}
              >
                Usar esperado · {formatCurrency(expectedNequi)}
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={nequiCounted}
              onChange={(e) => setNequiCounted(e.target.value)}
              className="input-pastel font-bold"
              placeholder="¿Cuánto hay en Nequi?"
            />
            {nequiDiff != null && (
              <p className={`text-sm font-bold ${moneyClass(nequiDiff)}`}>{diffLabel(nequiDiff)}</p>
            )}
          </div>

          {totalDiff != null && (
            <p className={`text-sm font-extrabold ${moneyClass(totalDiff)}`}>
              Total: {diffLabel(totalDiff)}
            </p>
          )}

          <label className="label-pastel">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input-pastel"
            placeholder="Opcional"
          />
          <Button
            variant="primary"
            icon={today.closed ? RefreshCw : Wallet}
            onClick={() => runAction(
              'close',
              () => api.cashClose.close({
                cash_counted: Number(cashCounted),
                nequi_counted: Number(nequiCounted),
                notes,
                opening_float: today.closed ? undefined : Number(openingFloat) || 0,
              }),
              today.closed ? 'Corte actualizado' : 'Corte cerrado y caja bloqueada'
            )}
            disabled={Boolean(saving) || cashCounted === '' || nequiCounted === ''}
          >
            {saving === 'close'
              ? 'Guardando...'
              : today.closed
                ? 'Actualizar corte'
                : 'Cerrar corte'}
          </Button>
        </Card>
      </div>

      {today.closed && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-lg text-slate-800">Bloqueo de ventas</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Al cerrar se bloquea sola. Puedes desbloquear si aún hay que vender.
              </p>
            </div>
            <Button
              variant={today.locked ? 'success' : 'danger'}
              icon={today.locked ? LockOpen : Lock}
              onClick={() => runAction(
                'lock',
                () => api.cashClose.setLock(!today.locked),
                today.locked ? 'Caja desbloqueada' : 'Caja bloqueada'
              )}
              disabled={Boolean(saving)}
            >
              {saving === 'lock'
                ? 'Cambiando...'
                : today.locked
                  ? 'Desbloquear caja'
                  : 'Bloquear caja'}
            </Button>
          </div>
          {close && (
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-emerald-800 font-medium">Efectivo</p>
                <p className="font-extrabold text-lg">{formatCurrency(close.cash_counted)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Esperado {formatCurrency(close.expected_cash)} · {diffLabel(close.cash_difference)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                <p className="text-indigo-800 font-medium">Nequi</p>
                <p className="font-extrabold text-lg">{formatCurrency(close.nequi_counted)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Esperado {formatCurrency(close.expected_nequi)} · {diffLabel(close.nequi_difference)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-pastel-cream">
                <p className="text-slate-500 font-medium">Diferencia total</p>
                <p className={`font-extrabold text-lg ${moneyClass(close.difference)}`}>
                  {formatCurrency(close.difference)}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      <section>
        <h3 className="font-extrabold text-lg text-slate-800 mb-3">Cortes anteriores</h3>
        {pastCloses.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500 font-medium text-center">
            Aún no hay cortes de otros días.
          </Card>
        ) : (
          <div className="space-y-2">
            {pastCloses.map((row) => (
              <Card key={row.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{formatDisplayDate(row.business_date)}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {row.total_transactions} ventas · {row.locked ? 'Bloqueada' : 'Sin bloqueo'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Efectivo</p>
                  <p className="font-extrabold text-emerald-700">{formatCurrency(row.cash_sales)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Nequi</p>
                  <p className="font-extrabold text-indigo-700">{formatCurrency(row.nequi_sales)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Total</p>
                  <p className="font-extrabold text-pink-600">{formatCurrency(row.total_sales)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Diferencia</p>
                  <p className={`font-extrabold ${moneyClass(row.difference)}`}>
                    {formatCurrency(row.difference)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
