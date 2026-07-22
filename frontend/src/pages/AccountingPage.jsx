import { useEffect, useState } from 'react';
import { Banknote, Smartphone, TrendingUp, Calendar, ChevronRight, Receipt } from 'lucide-react';
import { api, formatCurrency } from '../services/api';
import { formatDisplayDate } from '../utils/dates';
import MetricCard from '../components/ui/MetricCard';
import Card from '../components/ui/Card';
import SaleDetailModal from '../components/sales/SaleDetailModal';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const PAYMENT_ICON = { cash: Banknote, nequi: Smartphone };
const PAYMENT_COLOR = { cash: 'text-emerald-700', nequi: 'text-indigo-700' };

export default function AccountingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyDetail, setMonthlyDetail] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { loadMonthlyDetail(); loadMonthlySales(); }, [selectedMonth, selectedYear]);
  useEffect(() => { if (data?.daily?.date) loadDailySales(data.daily.date); }, [data?.daily?.date]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setData(await api.accounting.dashboard());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyDetail() {
    try {
      setMonthlyDetail(await api.accounting.monthly(selectedYear, selectedMonth));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadDailySales(date) {
    try {
      setDailySales(await api.sales.list({ date }));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMonthlySales() {
    try {
      setMonthlySales(await api.sales.list({ month: selectedMonth, year: selectedYear }));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  const { daily, monthly } = data || {};

  const SalesList = ({ sales, title }) => (
    <div className="mt-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
        <Receipt size={14} /> {title}
      </p>
      {sales.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Sin ventas</p>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => {
            const PayIcon = PAYMENT_ICON[sale.payment_method] || Banknote;
            return (
              <button
                key={sale.id}
                onClick={() => setSelectedSaleId(sale.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-pastel-lavender/30 hover:shadow-soft hover:scale-[1.01] transition-all text-left"
              >
                <div className="p-2 rounded-xl bg-pink-50">
                  <PayIcon size={18} className={PAYMENT_COLOR[sale.payment_method]} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{sale.invoice_number}</p>
                  <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleString('es-CO')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-pink-600">{formatCurrency(sale.total)}</p>
                  {(Number(sale.discount_items) > 0 || Number(sale.discount_global) > 0) && (
                    <p className="text-[10px] text-rose-500 font-semibold">Con rebaja</p>
                  )}
                </div>
                <ChevronRight size={18} className="text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Contabilidad</h2>
        <p className="text-slate-500 mt-1 font-medium">Flujo de caja — toca una venta para ver la factura</p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-700">Cierre del día — {formatDisplayDate(daily?.date)}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard title="Efectivo" amount={daily?.cash?.total || 0} transactions={daily?.cash?.transactions || 0} icon={Banknote} variant="cash" />
          <MetricCard title="Nequi" amount={daily?.nequi?.total || 0} transactions={daily?.nequi?.transactions || 0} icon={Smartphone} variant="nequi" />
          <MetricCard title="Total vendido hoy" amount={daily?.grand_total || 0} transactions={daily?.total_transactions || 0} icon={TrendingUp} variant="total" />
        </div>
        <SalesList sales={dailySales} title="Ventas de hoy" />
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-violet-500" strokeWidth={2} />
            <h3 className="text-lg font-bold text-slate-700">{MONTHS[selectedMonth - 1]} {selectedYear}</h3>
          </div>
          <div className="flex gap-2">
            <select className="input-pastel w-auto text-sm font-semibold" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className="input-pastel w-auto text-sm font-semibold" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <MetricCard title="Efectivo del mes" amount={monthlyDetail?.cash?.total || monthly?.cash?.total || 0} transactions={monthlyDetail?.cash?.transactions || monthly?.cash?.transactions || 0} icon={Banknote} variant="cash" />
          <MetricCard title="Nequi del mes" amount={monthlyDetail?.nequi?.total || monthly?.nequi?.total || 0} transactions={monthlyDetail?.nequi?.transactions || monthly?.nequi?.transactions || 0} icon={Smartphone} variant="nequi" />
          <MetricCard title="Total del mes" amount={monthlyDetail?.grand_total || monthly?.grand_total || 0} transactions={monthlyDetail?.total_transactions || monthly?.total_transactions || 0} icon={TrendingUp} variant="total" />
        </div>

        {monthlyDetail?.daily?.length > 0 && (
          <Card className="overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-pastel-lavender/20 border-b border-pastel-lavender/30">
                    <th className="text-left px-4 py-3 font-bold text-slate-600">Fecha</th>
                    <th className="text-right px-4 py-3 font-bold text-emerald-700">Efectivo</th>
                    <th className="text-right px-4 py-3 font-bold text-indigo-700">Nequi</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-800">Total</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyDetail.daily.map((day) => (
                    <tr key={day.date} className="border-b border-pastel-lavender/10 hover:bg-pink-50/30">
                      <td className="px-4 py-3 font-medium">{formatDisplayDate(day.date)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{formatCurrency(day.cash)}</td>
                      <td className="px-4 py-3 text-right text-indigo-700 font-semibold">{formatCurrency(day.nequi)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(day.total)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{day.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <SalesList sales={monthlySales} title={`Ventas de ${MONTHS[selectedMonth - 1]}`} />
      </section>

      {selectedSaleId && (
        <SaleDetailModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
      )}
    </div>
  );
}
