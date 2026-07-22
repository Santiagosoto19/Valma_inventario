import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { api, formatCurrency, formatApiError } from '../services/api';
import ProductImage from '../components/ui/ProductImage';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import InventoryNav from '../components/inventory/InventoryNav';
import { useNotifications } from '../context/NotificationContext';

export default function LowStockPage() {
  const [data, setData] = useState({ threshold: 5, products: [] });
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [lowStock, settings] = await Promise.all([
        api.products.lowStock(),
        api.settings.get(),
      ]);
      setData(lowStock);
      setThreshold(settings.stock_threshold);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveThreshold() {
    try {
      setSaving(true);
      await api.settings.update(threshold);
      await loadData();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo guardar',
        message: formatApiError(err),
      });
    } finally {
      setSaving(false);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Stock Crítico</h2>
        <p className="text-slate-500 mt-1 font-medium">Productos próximos a agotarse</p>
      </div>

      <InventoryNav />

      <Card className="p-5 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <label className="label-pastel">Umbral mínimo de stock</label>
          <input
            className="input-pastel w-full sm:w-40"
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>
        <Button icon={Save} onClick={saveThreshold} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar umbral'}
        </Button>
        <p className="text-sm text-slate-500 font-medium">
          Actual: <strong className="text-pink-600">{data.threshold}</strong> unidades
        </p>
      </Card>

      {data.products.length === 0 ? (
        <Card className="p-16 text-center">
          <CheckCircle2 size={56} className="mx-auto text-pastel-mint-deep mb-4" strokeWidth={1.5} />
          <p className="text-slate-600 font-bold text-lg">Todo en niveles normales</p>
          <p className="text-slate-500 text-sm mt-1">No hay productos en stock crítico</p>
        </Card>
      ) : (
        <>
          <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60 flex items-center gap-3">
            <AlertTriangle size={22} className="text-amber-600 animate-pulse" strokeWidth={2.5} />
            <p className="text-amber-800 font-bold text-sm">
              {data.products.length} producto(s) en nivel crítico (≤ {data.threshold} uds.)
            </p>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden border-2 border-amber-200/60 hover:shadow-soft transition-all"
              >
                <div className="bg-gradient-to-r from-amber-100 to-orange-50 px-4 py-2.5 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 animate-pulse" strokeWidth={2.5} />
                  <span className="text-amber-800 text-sm font-bold">
                    {product.stock} restante{product.stock !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="p-4 flex gap-4">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="w-16 h-16 rounded-2xl shrink-0"
                    iconSize={24}
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{product.description}</p>
                    <p className="text-sm font-extrabold text-pink-600 mt-2">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
