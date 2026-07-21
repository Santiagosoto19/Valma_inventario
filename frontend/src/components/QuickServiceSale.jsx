import { useEffect, useState } from 'react';
import { Plus, Minus, Banknote, Smartphone, CreditCard, Loader2 } from 'lucide-react';
import { api, formatCurrency, formatApiError } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import InvoiceModal from './sales/InvoiceModal';
import Button from './ui/Button';
import Card from './ui/Card';

export default function QuickServiceSale({
  title,
  subtitle,
  serviceGroup,
  accent = 'pink',
  icon: Icon,
}) {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.products.services(serviceGroup);
        setProducts(data);
        setQuantities(Object.fromEntries(data.map((p) => [p.id, 0])));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [serviceGroup]);

  const accentStyles = {
    pink: {
      card: 'from-pink-100 to-rose-50 border-pink-200/60',
      active: 'ring-2 ring-pink-400 bg-pink-50',
      price: 'text-pink-600',
      btn: 'from-pink-400 to-rose-400',
    },
    sky: {
      card: 'from-sky-100 to-indigo-50 border-sky-200/60',
      active: 'ring-2 ring-sky-400 bg-sky-50',
      price: 'text-sky-600',
      btn: 'from-sky-400 to-indigo-400',
    },
  }[accent];

  const cartItems = products
    .filter((p) => (quantities[p.id] || 0) > 0)
    .map((p) => ({ product: p, quantity: quantities[p.id] }));

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function changeQty(productId, delta) {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  }

  function setQty(productId, value) {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, parseInt(value, 10) || 0),
    }));
  }

  async function completeSale() {
    if (!cartItems.length) {
      addNotification({
        type: 'warning',
        title: 'Sin unidades',
        message: 'Agrega al menos una unidad antes de registrar la venta',
      });
      return;
    }
    try {
      setProcessing(true);
      const sale = await api.sales.create({
        payment_method: paymentMethod,
        global_discount: 0,
        items: cartItems.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          discount: 0,
        })),
      });
      setCompletedSale(sale);
      setQuantities(Object.fromEntries(products.map((p) => [p.id, 0])));
      addNotification({
        type: 'success',
        title: 'Venta registrada',
        message: `${sale.invoice_number} — ${formatCurrency(sale.total)}`,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo registrar la venta',
        message: formatApiError(err),
      });
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${accentStyles.btn} text-white shadow-soft`}>
            <Icon size={28} strokeWidth={2.5} />
          </div>
        )}
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{title}</h2>
          <p className="text-slate-500 mt-1 font-medium">{subtitle}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {products.map((product) => {
          const qty = quantities[product.id] || 0;
          return (
            <Card
              key={product.id}
              className={`p-5 bg-gradient-to-br ${accentStyles.card} transition-all ${
                qty > 0 ? accentStyles.active : ''
              }`}
            >
              <p className="font-extrabold text-lg text-slate-800">{product.name}</p>
              <p className={`text-2xl font-extrabold mt-1 ${accentStyles.price}`}>
                {formatCurrency(product.price)}
              </p>
              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => changeQty(product.id, -1)}
                  className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center active:scale-95"
                >
                  <Minus size={18} strokeWidth={2.5} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={qty || ''}
                  placeholder="0"
                  onChange={(e) => setQty(product.id, e.target.value)}
                  className="input-pastel w-20 text-center font-bold text-lg py-2"
                />
                <button
                  type="button"
                  onClick={() => changeQty(product.id, 1)}
                  className={`w-11 h-11 rounded-xl bg-gradient-to-r ${accentStyles.btn} text-white flex items-center justify-center active:scale-95 shadow-soft`}
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 space-y-4 sticky bottom-4">
        <div className="flex justify-between items-baseline">
          <div>
            <p className="text-sm text-slate-500 font-medium">Total ({totalUnits} unidades)</p>
            <p className={`text-3xl font-extrabold ${accentStyles.price}`}>{formatCurrency(total)}</p>
          </div>
        </div>

        <div>
          <p className="label-pastel mb-2">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm min-h-12 transition-all ${
                paymentMethod === 'cash'
                  ? 'bg-gradient-to-r from-emerald-300 to-pastel-mint-deep text-emerald-900 shadow-soft'
                  : 'bg-white border border-pastel-lavender/40 text-slate-600'
              }`}
            >
              <Banknote size={20} strokeWidth={2.5} /> Efectivo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('nequi')}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm min-h-12 transition-all ${
                paymentMethod === 'nequi'
                  ? 'bg-gradient-to-r from-indigo-300 to-pastel-nequi-deep text-indigo-900 shadow-soft'
                  : 'bg-white border border-pastel-lavender/40 text-slate-600'
              }`}
            >
              <Smartphone size={20} strokeWidth={2.5} /> Nequi
            </button>
          </div>
        </div>

        <Button
          variant="success"
          size="xl"
          icon={processing ? Loader2 : CreditCard}
          className={`w-full ${processing ? '[&_svg]:animate-spin' : ''}`}
          onClick={completeSale}
          disabled={processing || totalUnits === 0}
        >
          {processing ? 'Procesando venta...' : 'Registrar venta'}
        </Button>
      </Card>

      {completedSale && (
        <InvoiceModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  );
}
