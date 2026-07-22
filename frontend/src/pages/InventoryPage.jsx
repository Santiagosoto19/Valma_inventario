import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Package, SearchX } from 'lucide-react';
import { api, formatCurrency, formatApiError } from '../services/api';
import ProductImage from '../components/ui/ProductImage';
import ProductForm from '../components/ProductForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import InventoryNav from '../components/inventory/InventoryNav';
import InventoryFilters, { filterProducts } from '../components/inventory/InventoryFilters';
import { useNotifications } from '../context/NotificationContext';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [threshold, setThreshold] = useState(5);
  const { addNotification } = useNotifications();

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const [productList, settings] = await Promise.all([
        api.products.list(),
        api.settings.get().catch(() => ({ stock_threshold: 5 })),
      ]);
      setProducts(productList);
      setThreshold(settings.stock_threshold ?? 5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(
    () => filterProducts(products, { search, stockFilter, sortBy, threshold }),
    [products, search, stockFilter, sortBy, threshold]
  );

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.products.delete(id);
      await loadProducts();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo eliminar',
        message: formatApiError(err),
      });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Inventario</h2>
          <p className="text-slate-500 mt-1 font-medium">Gestión completa de productos</p>
        </div>
        <Button icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>
          Agregar producto
        </Button>
      </div>

      <InventoryNav />

      <Card className="p-4 sm:p-5">
        <InventoryFilters
          search={search}
          onSearchChange={setSearch}
          stockFilter={stockFilter}
          onStockFilterChange={setStockFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalCount={products.length}
          filteredCount={filteredProducts.length}
        />
      </Card>

      {error && (
        <Card className="p-4 bg-rose-50 border-rose-200 text-rose-700 font-medium">{error}</Card>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { setShowForm(false); setEditing(null); loadProducts(); }}
        />
      )}

      {products.length === 0 ? (
        <Card className="p-16 text-center">
          <Package size={48} className="mx-auto text-pastel-lavender-deep mb-4" strokeWidth={1.5} />
          <p className="text-slate-500 font-medium">No hay productos. Agrega el primero.</p>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-16 text-center">
          <SearchX size={48} className="mx-auto text-pastel-lavender-deep mb-4" strokeWidth={1.5} />
          <p className="text-slate-600 font-bold">Sin resultados</p>
          <p className="text-slate-500 text-sm mt-1">Prueba otro término o cambia los filtros</p>
          <Button
            variant="ghost"
            className="mt-4 mx-auto"
            onClick={() => { setSearch(''); setStockFilter('all'); }}
          >
            Limpiar filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden flex flex-col hover:shadow-soft transition-all duration-300 hover:scale-[1.01]">
              <ProductImage
                src={product.image_url}
                alt={product.name}
                className="w-full h-44"
                iconSize={48}
              />
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-slate-800">{product.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2 flex-1">
                  {product.description || 'Sin descripción'}
                </p>
                <div className="flex justify-between items-center mt-4">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    product.stock === 0
                      ? 'bg-rose-100 text-rose-700'
                      : product.stock <= threshold
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    Stock: {product.stock}
                  </span>
                  <span className="font-extrabold text-pink-600 text-lg">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Pencil}
                    className="flex-1"
                    onClick={() => { setEditing(product); setShowForm(true); }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    className="flex-1"
                    onClick={() => handleDelete(product.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
