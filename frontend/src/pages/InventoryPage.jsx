import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Pencil, Trash2, Package, SearchX, Sparkles, Printer, FileDown, ScanLine } from 'lucide-react';
import { api, formatCurrency, formatApiError } from '../services/api';
import ProductImage from '../components/ui/ProductImage';
import ProductForm from '../components/ProductForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import InventoryNav from '../components/inventory/InventoryNav';
import InventoryFilters, { filterProducts } from '../components/inventory/InventoryFilters';
import { useNotifications } from '../context/NotificationContext';
import { useScanner } from '../context/ScannerContext';
import { useHidScanner } from '../hooks/useHidScanner';
import { normalizeScanPayload } from '../utils/barcode';
import BarcodeImage, { printProductBarcode } from '../components/ui/BarcodeImage';

function StockControls({ product, saving, onDelta, onSetStock }) {
  const [draft, setDraft] = useState(String(product.stock));

  useEffect(() => {
    if (!saving) setDraft(String(product.stock));
  }, [saving, product.stock]);

  function commit() {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(String(product.stock));
      return;
    }
    if (n === Number(product.stock)) return;
    onSetStock(n);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Quitar uno"
        disabled={saving || product.stock <= 0}
        onClick={() => onDelta(-1)}
        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold inline-flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 disabled:opacity-40 disabled:pointer-events-none"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        data-no-scan="true"
        disabled={saving}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="w-16 h-8 text-center text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-800 disabled:opacity-50"
      />
      <button
        type="button"
        aria-label="Sumar uno"
        disabled={saving}
        onClick={() => onDelta(1)}
        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold inline-flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 disabled:opacity-40 disabled:pointer-events-none"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

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
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [scanCode, setScanCode] = useState('');
  const [receiveQty, setReceiveQty] = useState(1);
  const { addNotification } = useNotifications();
  const { connected: scannerConnected, deviceName: scannerName } = useScanner();
  const scanInputRef = useRef(null);
  const receiveLockRef = useRef(false);
  const receiveScanRef = useRef(null);
  const productsRef = useRef(products);
  const receiveQtyRef = useRef(1);
  const savingIdsRef = useRef(new Set());

  productsRef.current = products;
  receiveQtyRef.current = Math.max(1, parseInt(receiveQty, 10) || 1);

  useEffect(() => { loadProducts(); }, []);

  useHidScanner(
    (code) => receiveScanRef.current?.(code),
    !showForm
  );

  useEffect(() => {
    if (showForm) return undefined;

    function canTakeScanFocus() {
      const active = document.activeElement;
      if (!active || active === document.body) return true;
      if (active.closest?.('[data-dialog="true"]')) return false;
      if (active.closest?.('[data-no-scan="true"]')) return false;
      if (active.dataset?.posScan === 'true' || active.dataset?.barcodeScan === 'true') return true;
      const tag = active.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) {
        return false;
      }
      return true;
    }

    function focusScanner() {
      if (!canTakeScanFocus()) return;
      const field = scanInputRef.current;
      if (field && document.activeElement !== field) {
        field.focus({ preventScroll: true });
      }
    }

    focusScanner();
    const timer = setInterval(focusScanner, 800);
    return () => clearInterval(timer);
  }, [showForm]);

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

  function applyProductUpdate(updated) {
    setProducts((list) => {
      const index = list.findIndex((p) => p.id === updated.id);
      if (index === -1) return [...list, updated];
      const next = [...list];
      next[index] = { ...list[index], ...updated };
      return next;
    });
  }

  function setCardSaving(id, saving) {
    if (saving) savingIdsRef.current.add(id);
    else savingIdsRef.current.delete(id);
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleDelta(product, delta) {
    if (savingIdsRef.current.has(product.id)) return;
    if (delta < 0 && product.stock <= 0) return;
    setCardSaving(product.id, true);
    try {
      const updated = await api.products.adjustStock(product.id, { delta });
      applyProductUpdate(updated);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo ajustar el stock',
        message: formatApiError(err),
      });
    } finally {
      setCardSaving(product.id, false);
    }
  }

  async function handleSetStock(product, stock) {
    if (savingIdsRef.current.has(product.id)) return;
    const n = Math.max(0, parseInt(stock, 10));
    if (!Number.isFinite(n)) return;
    if (n === Number(product.stock)) return;
    setCardSaving(product.id, true);
    try {
      const updated = await api.products.adjustStock(product.id, { stock: n });
      applyProductUpdate(updated);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo ajustar el stock',
        message: formatApiError(err),
      });
    } finally {
      setCardSaving(product.id, false);
    }
  }

  async function receiveByBarcode(rawCode) {
    const code = normalizeScanPayload(rawCode);
    if (!code || receiveLockRef.current) return;
    receiveLockRef.current = true;
    setScanCode('');
    const qty = receiveQtyRef.current;

    try {
      let product = productsRef.current.find(
        (p) => p.barcode && p.barcode.toLowerCase() === code.toLowerCase()
      );
      if (!product) {
        try {
          product = await api.products.byBarcode(code);
        } catch {
          addNotification({
            type: 'error',
            title: 'Producto no encontrado',
            message: `"${code}" no está registrado.`,
          });
          return;
        }
      }

      const updated = await api.products.adjustStock(product.id, { delta: qty });
      applyProductUpdate(updated);
      addNotification({
        type: 'success',
        title: 'Recibido',
        message: `+${qty} · ${updated.name || product.name}`,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo recibir',
        message: formatApiError(err),
      });
    } finally {
      receiveLockRef.current = false;
      requestAnimationFrame(() => scanInputRef.current?.focus());
    }
  }

  receiveScanRef.current = receiveByBarcode;

  const filteredProducts = useMemo(
    () => filterProducts(products, { search, stockFilter, sortBy, threshold }),
    [products, search, stockFilter, sortBy, threshold]
  );

  const missingBarcodes = products.filter((p) => !p.barcode).length;

  async function handleDownloadPdf() {
    try {
      setDownloadingPdf(true);
      await api.products.downloadBarcodesPdf();
      await loadProducts();
      addNotification({
        type: 'success',
        title: 'PDF listo',
        message: 'Se generaron los códigos faltantes y se descargó el PDF con todas las etiquetas.',
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo crear el PDF',
        message: formatApiError(err),
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleGenerateMissing() {
    if (!missingBarcodes) return;
    try {
      setGenerating(true);
      const result = await api.products.generateMissingBarcodes();
      await loadProducts();
      addNotification({
        type: 'success',
        title: 'Códigos generados',
        message: `Se asignaron ${result.count} códigos internos. Imprime las etiquetas y pégalas en los productos.`,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudieron generar los códigos',
        message: formatApiError(err),
      });
    } finally {
      setGenerating(false);
    }
  }

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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            icon={FileDown}
            disabled={downloadingPdf}
            onClick={handleDownloadPdf}
          >
            {downloadingPdf ? 'Creando PDF...' : 'PDF de todos los códigos'}
          </Button>
          {missingBarcodes > 0 && (
            <Button
              variant="ghost"
              icon={Sparkles}
              disabled={generating}
              onClick={handleGenerateMissing}
            >
              {generating ? 'Generando...' : `Generar ${missingBarcodes} códigos`}
            </Button>
          )}
          <Button icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>
            Agregar producto
          </Button>
        </div>
      </div>

      <InventoryNav />

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border ${
            scannerConnected
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-rose-700 bg-rose-50 border-rose-200'
          }`}>
            <ScanLine size={12} />
            {scannerConnected
              ? `Lector conectado${scannerName ? ` · ${scannerName}` : ''}`
              : 'Lector desconectado'}
          </span>
          <span className="text-sm font-bold text-slate-700">Recibir</span>
        </div>
        <div className="grid sm:grid-cols-[1fr_8rem] gap-3">
          <div>
            <label className="label-pastel flex items-center gap-1.5 px-1">
              <ScanLine size={14} />
              Lector
            </label>
            <div className="relative">
              <ScanLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" />
              <input
                ref={scanInputRef}
                className="input-pastel pl-11 font-mono text-base ring-2 ring-emerald-200 focus:ring-emerald-400"
                placeholder="Escanea para sumar stock"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                autoComplete="off"
                inputMode="numeric"
                autoFocus
                data-pos-scan="true"
              />
            </div>
          </div>
          <div>
            <label className="label-pastel px-1">Cantidad</label>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              data-no-scan="true"
              className="input-pastel text-center font-bold"
              value={receiveQty}
              onChange={(e) => setReceiveQty(e.target.value)}
              onBlur={() => {
                const n = Math.max(1, parseInt(receiveQty, 10) || 1);
                setReceiveQty(n);
              }}
            />
          </div>
        </div>
      </Card>

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
          onSuccess={(saved) => {
            const justGenerated = !editing?.barcode;
            setShowForm(false);
            setEditing(null);
            loadProducts();
            if (saved?.barcode && justGenerated) {
              addNotification({
                type: 'success',
                title: 'Código listo',
                message: `${saved.barcode} — imprime la etiqueta, pégala y escanéala en caja.`,
              });
              printProductBarcode(saved);
            }
          }}
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
                <div className="flex justify-between items-center mt-4 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      product.stock === 0
                        ? 'bg-rose-100 text-rose-700'
                        : product.stock <= threshold
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      Stock
                    </span>
                    <StockControls
                      product={product}
                      saving={savingIds.has(product.id)}
                      onDelta={(delta) => handleDelta(product, delta)}
                      onSetStock={(stock) => handleSetStock(product, stock)}
                    />
                  </div>
                  <span className="font-extrabold text-pink-600 text-lg">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                {product.barcode && (
                  <div className="mt-3 p-2 rounded-2xl bg-pastel-cream/80">
                    <BarcodeImage value={product.barcode} height={40} />
                    <button
                      type="button"
                      onClick={() => printProductBarcode(product)}
                      className="w-full mt-1 text-xs font-bold text-slate-600 hover:text-pink-600 inline-flex items-center justify-center gap-1"
                    >
                      <Printer size={12} /> Imprimir etiqueta
                    </button>
                  </div>
                )}
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
