import { useEffect, useState, useRef } from 'react';
import {
  Search, ShoppingCart, Package, Plus, Minus, X,
  Banknote, Smartphone, CreditCard, Tag, Percent, Loader2, ScanLine, Coins,
} from 'lucide-react';
import { api, formatCurrency, formatApiError } from '../services/api';
import { isNetworkError } from '../utils/errors';
import { isCompleteBarcode, normalizeScanPayload } from '../utils/barcode';
import ProductImage from '../components/ui/ProductImage';
import { useNotifications } from '../context/NotificationContext';
import { useOffline } from '../context/OfflineContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useHidScanner } from '../hooks/useHidScanner';
import { useScanner } from '../context/ScannerContext';
import InvoiceModal from '../components/sales/InvoiceModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

function lineSubtotal(item) {
  return Number(item.product.price) * item.quantity;
}

const SCAN_AUTO_SUBMIT_MS = 180;
const CASH_PRESETS = [5000, 10000, 20000, 50000, 100000];

function parseMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function filterProducts(products, search) {
  const q = search.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    p.barcode?.toLowerCase().includes(q)
  );
}

function ProductGrid({
  search,
  onSearchChange,
  onSearchKeyDown,
  scanCode,
  onScanCodeChange,
  onScanKeyDown,
  filteredProducts,
  highlightedIndex,
  onAddToCart,
  searchInputRef,
  scanInputRef,
  lastScanned,
  scanTrace,
  scannerConnected,
  scannerName,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1 flex-wrap">
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
        {lastScanned && (
          <span className="text-xs font-medium text-slate-500 truncate">
            Último: {lastScanned}
          </span>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
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
              placeholder="Clic aquí y escanea"
              value={scanCode}
              onChange={(e) => onScanCodeChange(e.target.value)}
              onKeyDown={onScanKeyDown}
              autoComplete="off"
              inputMode="numeric"
              data-pos-scan="true"
            />
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1 px-1">
            {scanTrace?.buffer
              ? `Escaneando: ${scanTrace.buffer}`
              : scanTrace?.keyCount
                ? `Teclas: ${scanTrace.keyCount}${scanTrace.lastCode ? ` · ${scanTrace.lastCode}` : ''}`
                : 'El cursor vuelve solo aquí'}
          </p>
        </div>
        <div>
          <label className="label-pastel flex items-center gap-1.5 px-1">
            <Search size={14} />
            Búsqueda
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" />
            <input
              ref={searchInputRef}
              className="input-pastel pl-11 text-base ring-2 ring-pink-200 focus:ring-pink-400"
              placeholder="Nombre del producto — Enter agrega"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              autoComplete="off"
              data-no-scan="true"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1 px-1">
            Tócala solo cuando quieras escribir un nombre.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map((product, index) => {
          const highlighted = index === highlightedIndex;
          return (
            <button
              key={product.id}
              type="button"
              data-pos-product-index={index}
              onClick={() => onAddToCart(product)}
              className={`card-pastel p-3 text-left active:scale-95 hover:shadow-soft hover:scale-[1.02] transition-all duration-200 ${
                highlighted ? 'ring-2 ring-pink-400 shadow-soft scale-[1.02]' : ''
              }`}
            >
              <div className="h-20 sm:h-24 rounded-2xl mb-2 overflow-hidden">
                <ProductImage
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full"
                  iconSize={28}
                />
              </div>
              <p className="font-bold text-sm text-slate-800 break-words whitespace-normal leading-snug">{product.name}</p>
              <p className="text-pink-600 font-extrabold text-sm mt-1">{formatCurrency(product.price)}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Stock: {product.stock}</p>
            </button>
          );
        })}
      </div>
      {filteredProducts.length === 0 && (
        <p className="text-center text-slate-500 py-8 font-medium">
          {search.trim() ? 'Ningún producto coincide con la búsqueda' : 'No hay productos disponibles'}
        </p>
      )}
    </div>
  );
}

function CartPanel({
  cart,
  cartCount,
  cartSubtotal,
  cartItemDiscounts,
  afterItemDiscounts,
  globalDiscount,
  cartTotal,
  paymentMethod,
  processing,
  onUpdateQuantity,
  onUpdateItemDiscount,
  onRemoveFromCart,
  onGlobalDiscountChange,
  onPaymentMethodChange,
  onCompleteSale,
  amountReceived,
  onAmountReceivedChange,
}) {
  const received = parseMoney(amountReceived);
  const change = Math.round((received - cartTotal) * 100) / 100;
  const showChange = paymentMethod === 'cash' && amountReceived !== '' && amountReceived != null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart size={22} className="text-pink-500" strokeWidth={2.5} />
        <h3 className="font-extrabold text-lg text-slate-800">
          Carrito {cartCount > 0 && <span className="text-pink-500">({cartCount})</span>}
        </h3>
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
          <ShoppingCart size={40} strokeWidth={1.5} />
          <p className="mt-3 font-medium text-sm">Carrito vacío</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[45vh] lg:max-h-72">
          {cart.map((item) => (
            <div key={item.product.id} className="p-3 rounded-2xl bg-pastel-lavender/10 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm break-words whitespace-normal leading-snug">{item.product.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(item.product.price)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center" onClick={() => onUpdateQuantity(item.product.id, -1)}>
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                  <button className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center" onClick={() => onUpdateQuantity(item.product.id, 1)}>
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                  <button className="w-8 h-8 rounded-xl text-rose-500" onClick={() => onRemoveFromCart(item.product.id)}>
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-rose-400 shrink-0" />
                <input
                  type="number"
                  min="0"
                  max={lineSubtotal(item)}
                  placeholder="Rebaja $"
                  value={item.discount || ''}
                  onChange={(e) => onUpdateItemDiscount(item.product.id, e.target.value)}
                  className="input-pastel py-1.5 text-xs flex-1"
                  data-no-scan="true"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-pastel-lavender/30 mt-4 pt-4 space-y-3">
        <div className="space-y-1.5 text-sm p-3 rounded-2xl bg-pastel-cream">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-bold">{formatCurrency(cartSubtotal)}</span>
          </div>
          {cartItemDiscounts > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Rebaja productos</span>
              <span className="font-bold">-{formatCurrency(cartItemDiscounts)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Percent size={14} className="text-rose-400 shrink-0" />
            <input
              type="number"
              min="0"
              max={afterItemDiscounts}
              placeholder="Rebaja cuenta completa $"
              value={globalDiscount || ''}
              onChange={(e) => onGlobalDiscountChange(e.target.value)}
              className="input-pastel py-1.5 text-xs flex-1"
              data-no-scan="true"
            />
          </div>
          {globalDiscount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Rebaja global</span>
              <span className="font-bold">-{formatCurrency(globalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-pastel-lavender/20">
            <span className="font-bold text-slate-700">Total</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-pink-600">{formatCurrency(cartTotal)}</span>
          </div>
        </div>

        <div>
          <p className="label-pastel mb-2">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onPaymentMethodChange('cash')}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm min-h-12 transition-all ${
                paymentMethod === 'cash' ? 'bg-gradient-to-r from-emerald-300 to-pastel-mint-deep text-emerald-900 shadow-soft' : 'bg-white border border-pastel-lavender/40 text-slate-600'
              }`}>
              <Banknote size={20} strokeWidth={2.5} /> Efectivo
            </button>
            <button type="button" onClick={() => onPaymentMethodChange('nequi')}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm min-h-12 transition-all ${
                paymentMethod === 'nequi' ? 'bg-gradient-to-r from-indigo-300 to-pastel-nequi-deep text-indigo-900 shadow-soft' : 'bg-white border border-pastel-lavender/40 text-slate-600'
              }`}>
              <Smartphone size={20} strokeWidth={2.5} /> Nequi
            </button>
          </div>
        </div>

        {paymentMethod === 'cash' && cart.length > 0 && (
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
            <label className="label-pastel flex items-center gap-1.5 !mb-1">
              <Banknote size={14} strokeWidth={2.5} />
              Recibido
            </label>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="¿Cuánto te dieron?"
              value={amountReceived}
              onChange={(e) => onAmountReceivedChange(e.target.value)}
              className="input-pastel text-base font-bold"
              data-no-scan="true"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onAmountReceivedChange(String(Math.round(cartTotal)))}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border border-emerald-200 text-emerald-800"
              >
                Exacto
              </button>
              {CASH_PRESETS.map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => onAmountReceivedChange(String(bill))}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border border-emerald-200 text-emerald-800"
                >
                  {formatCurrency(bill)}
                </button>
              ))}
            </div>
            {showChange && (
              received >= cartTotal ? (
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                    <Coins size={16} strokeWidth={2.5} /> Devuelta
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-700">{formatCurrency(change)}</span>
                </div>
              ) : (
                <p className="text-sm font-bold text-rose-600">
                  Falta {formatCurrency(cartTotal - received)}
                </p>
              )
            )}
          </div>
        )}

        <Button variant="success" size="xl" icon={processing ? Loader2 : CreditCard} className={`w-full ${processing ? '[&_svg]:animate-spin' : ''}`} onClick={onCompleteSale} disabled={processing || !cart.length}>
          {processing ? 'Procesando venta...' : 'Terminar Venta'}
        </Button>
      </div>
    </div>
  );
}

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [search, setSearch] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [mobileTab, setMobileTab] = useState('products');
  const searchInputRef = useRef(null);
  const scanInputRef = useRef(null);
  const barcodeCacheRef = useRef(new Map());
  const searchBufferRef = useRef('');
  const scanDebounceRef = useRef(null);
  const highlightedIndexRef = useRef(0);
  const processBarcodeScanRef = useRef(null);
  const scanLockRef = useRef(false);
  const [lastScanned, setLastScanned] = useState('');
  const [scanTrace, setScanTrace] = useState({
    buffer: '',
    lastKey: '',
    lastCode: '',
    keyCount: 0,
    focused: typeof document === 'undefined' ? true : document.hasFocus(),
  });
  const { addNotification } = useNotifications();
  const { cacheProducts, readCachedProducts, submitSale } = useOffline();
  const { connected: scannerConnected, deviceName: scannerName } = useScanner();
  const isMobile = useIsMobile();

  useHidScanner(
    (code) => processBarcodeScanRef.current?.(code),
    !processing,
    (trace) => setScanTrace((prev) => ({ ...prev, ...trace }))
  );

  useEffect(() => {
    const syncFocus = () => {
      setScanTrace((prev) => ({ ...prev, focused: document.hasFocus() }));
    };
    window.addEventListener('focus', syncFocus);
    window.addEventListener('blur', syncFocus);
    document.addEventListener('visibilitychange', syncFocus);
    syncFocus();
    return () => {
      window.removeEventListener('focus', syncFocus);
      window.removeEventListener('blur', syncFocus);
      document.removeEventListener('visibilitychange', syncFocus);
    };
  }, []);

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => () => {
    if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
  }, []);

  useEffect(() => {
    if (loading || processing || completedSale) return undefined;
    if (isMobile && mobileTab === 'cart') return undefined;

    function canTakeScanFocus() {
      const active = document.activeElement;
      if (active?.closest?.('[data-no-scan="true"]')) return false;
      if (active?.closest?.('[data-dialog="true"]')) return false;
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
    const timer = setInterval(focusScanner, 350);
    function onPointerUp(event) {
      if (event.target?.closest?.('[data-no-scan="true"]')) return;
      if (event.target?.closest?.('[data-dialog="true"]')) return;
      requestAnimationFrame(focusScanner);
    }
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      clearInterval(timer);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [loading, processing, completedSale, mobileTab, isMobile]);

  useEffect(() => {
    const cards = document.querySelectorAll(`[data-pos-product-index="${highlightedIndex}"]`);
    for (const card of cards) {
      if (card.offsetParent) {
        card.scrollIntoView({ block: 'nearest' });
        break;
      }
    }
  }, [highlightedIndex]);

  async function loadProducts() {
    try {
      setLoading(true);
      barcodeCacheRef.current.clear();
      const data = await api.products.list();
      setProducts(data.filter((p) => p.stock > 0));
      await cacheProducts('inventory', data);
    } catch (err) {
      const cached = await readCachedProducts('inventory');
      if (cached?.length) {
        setProducts(cached.filter((p) => p.stock > 0));
        addNotification({
          type: 'warning',
          title: 'Sin conexión',
          message: 'Usando el catálogo guardado en este dispositivo.',
        });
      } else if (isNetworkError(err)) {
        addNotification({
          type: 'error',
          title: 'Sin catálogo offline',
          message: 'Abre la caja una vez con internet para poder vender sin red.',
        });
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = filterProducts(products, search);

  const cartSubtotal = cart.reduce((sum, item) => sum + lineSubtotal(item), 0);
  const cartItemDiscounts = cart.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const afterItemDiscounts = Math.max(0, cartSubtotal - cartItemDiscounts);
  const cartTotal = Math.max(0, afterItemDiscounts - (Number(globalDiscount) || 0));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product, { fromSearch = false } = {}) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          addNotification({
            type: 'warning',
            title: 'Stock insuficiente',
            message: `Solo quedan ${product.stock} unidades de "${product.name}"`,
          });
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
    if (isMobile && !fromSearch) setMobileTab('cart');
  }

  function updateHighlight(index) {
    highlightedIndexRef.current = index;
    setHighlightedIndex(index);
  }

  function clearSearch() {
    searchBufferRef.current = '';
    setSearch('');
    updateHighlight(0);
  }

  function addFromSearch(product) {
    addToCart(product, { fromSearch: true });
    clearSearch();
    requestAnimationFrame(() => scanInputRef.current?.focus());
  }

  function clearScanCode() {
    setScanCode('');
  }

  async function processBarcodeScan(rawCode) {
    const trimmed = normalizeScanPayload(rawCode);
    if (!trimmed || scanLockRef.current) return;
    scanLockRef.current = true;

    if (scanDebounceRef.current) {
      clearTimeout(scanDebounceRef.current);
      scanDebounceRef.current = null;
    }

    clearScanCode();
    setScanning(true);

    try {
      let product = barcodeCacheRef.current.get(trimmed);
      if (!product) {
        product = products.find(
          (p) => p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()
        );
      }
      if (!product) {
        try {
          product = await api.products.byBarcode(trimmed);
          barcodeCacheRef.current.set(trimmed, product);
        } catch (error) {
          if (isNetworkError(error)) {
            addNotification({
              type: 'error',
              title: 'Código no encontrado',
              message: `"${trimmed}" no está en el catálogo guardado.`,
            });
            return;
          }
          throw error;
        }
      }

      if (product.stock <= 0) {
        addNotification({
          type: 'warning',
          title: 'Sin stock',
          message: `"${product.name}" está agotado`,
        });
        return;
      }

      setLastScanned(`${product.name} · ${trimmed}`);
      addToCart(product, { fromSearch: true });
    } catch {
      addNotification({
        type: 'error',
        title: 'Código no encontrado',
        message: `"${trimmed}" no está registrado. Agrégalo en Inventario con ese código.`,
      });
    } finally {
      setScanning(false);
      scanLockRef.current = false;
      requestAnimationFrame(() => scanInputRef.current?.focus());
    }
  }

  processBarcodeScanRef.current = processBarcodeScan;

  function scheduleAutoScan(value) {
    if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
    if (!isCompleteBarcode(value)) return;

    scanDebounceRef.current = setTimeout(() => {
      scanDebounceRef.current = null;
      processBarcodeScan(value);
    }, SCAN_AUTO_SUBMIT_MS);
  }

  function handleScanCodeChange(value) {
    setScanCode(value);
    if (isCompleteBarcode(value)) {
      scheduleAutoScan(value);
    } else if (scanDebounceRef.current) {
      clearTimeout(scanDebounceRef.current);
      scanDebounceRef.current = null;
    }
  }

  function handleScanKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (scanDebounceRef.current) {
      clearTimeout(scanDebounceRef.current);
      scanDebounceRef.current = null;
    }
    const fromDom = scanInputRef.current?.value || scanCode;
    if (fromDom.trim()) processBarcodeScan(fromDom);
  }

  function handleSearchChange(value) {
    searchBufferRef.current = value;
    setSearch(value);
    updateHighlight(0);
    if (scanDebounceRef.current) {
      clearTimeout(scanDebounceRef.current);
      scanDebounceRef.current = null;
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!filteredProducts.length) return;
      updateHighlight((highlightedIndexRef.current + 1) % filteredProducts.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!filteredProducts.length) return;
      const next = highlightedIndexRef.current - 1;
      updateHighlight(next < 0 ? filteredProducts.length - 1 : next);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanDebounceRef.current) {
        clearTimeout(scanDebounceRef.current);
        scanDebounceRef.current = null;
      }
      const fromDom = searchInputRef.current?.value || '';
      submitSearch(searchBufferRef.current || fromDom);
    }
  }

  async function submitSearch(rawQuery) {
    const query = String(rawQuery || '').replace(/[\r\n\t]/g, '').trim();
    if (!query || scanning) return;

    const exactBarcode = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === query.toLowerCase()
    );
    if (exactBarcode) {
      addFromSearch(exactBarcode);
      return;
    }

    const matches = filterProducts(products, query);
    if (matches.length === 0) {
      addNotification({
        type: 'error',
        title: 'Sin coincidencias',
        message: `Ningún producto coincide con "${query}"`,
      });
      return;
    }

    const index = Math.min(highlightedIndexRef.current, matches.length - 1);
    addFromSearch(matches[index]);
  }

  function updateQuantity(productId, delta) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.stock) {
          addNotification({
            type: 'warning',
            title: 'Stock insuficiente',
            message: `Stock máximo disponible: ${item.product.stock} unidades`,
          });
          return item;
        }
        const maxDiscount = Number(item.product.price) * newQty;
        const discount = Math.min(Number(item.discount) || 0, maxDiscount);
        return { ...item, quantity: newQty, discount };
      }).filter(Boolean)
    );
  }

  function updateItemDiscount(productId, value) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const max = lineSubtotal(item);
        const discount = Math.min(Math.max(0, Number(value) || 0), max);
        return { ...item, discount };
      })
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  async function completeSale() {
    if (!cart.length) {
      addNotification({
        type: 'warning',
        title: 'Carrito vacío',
        message: 'Agrega productos al carrito antes de completar la venta',
      });
      return;
    }
    try {
      setProcessing(true);
      const lines = cart.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        discount: Number(i.discount) || 0,
      }));
      const { sale, queued } = await submitSale({
        catalogKey: 'inventory',
        body: {
          payment_method: paymentMethod,
          global_discount: Number(globalDiscount) || 0,
          items: lines.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            discount: i.discount,
          })),
        },
        lines,
      });
      const received = parseMoney(amountReceived);
      const change = Math.round((received - cartTotal) * 100) / 100;
      setCompletedSale({
        ...sale,
        ...(paymentMethod === 'cash' && received > 0
          ? { cash_received: received, cash_change: change }
          : {}),
      });
      setCart([]);
      setGlobalDiscount(0);
      setAmountReceived('');
      setMobileTab('products');
      if (queued) {
        setProducts((prev) =>
          prev
            .map((p) => {
              const line = lines.find((i) => i.product.id === p.id);
              if (!line) return p;
              return { ...p, stock: Math.max(0, Number(p.stock) - line.quantity) };
            })
            .filter((p) => p.stock > 0)
        );
        addNotification({
          type: 'warning',
          title: 'Venta guardada en este dispositivo',
          message: `Se enviará cuando haya internet — ${formatCurrency(sale.total)}`,
        });
      } else {
        await loadProducts();
        addNotification({
          type: 'success',
          title: 'Venta completada',
          message: `Factura ${sale.invoice_number} — ${formatCurrency(sale.total)}`,
        });
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo completar la venta',
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
    <div className="space-y-4">
      <div className="hidden sm:block">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Punto de Venta</h2>
        <p className="text-slate-500 mt-1 font-medium">Caja, descuentos y facturación</p>
      </div>

      <div className="sm:hidden flex gap-2 p-1 bg-pastel-lavender/20 rounded-2xl">
        {[
          { id: 'products', label: 'Productos', icon: Package },
          { id: 'cart', label: `Carrito${cartCount ? ` (${cartCount})` : ''}`, icon: ShoppingCart },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm min-h-12 transition-all ${
                mobileTab === tab.id ? 'bg-gradient-to-r from-pink-400 to-violet-400 text-white shadow-soft' : 'text-slate-600'
              }`}>
              <Icon size={18} strokeWidth={2.5} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className={`grid gap-6 lg:grid-cols-3 ${mobileTab === 'cart' ? 'max-sm:hidden' : ''}`}>
        <div className="lg:col-span-2">
          <ProductGrid
            search={search}
            onSearchChange={handleSearchChange}
            onSearchKeyDown={handleSearchKeyDown}
            scanCode={scanCode}
            onScanCodeChange={handleScanCodeChange}
            onScanKeyDown={handleScanKeyDown}
            filteredProducts={filteredProducts}
            highlightedIndex={highlightedIndex}
            onAddToCart={addToCart}
            searchInputRef={searchInputRef}
            scanInputRef={scanInputRef}
            lastScanned={lastScanned}
            scanTrace={scanTrace}
            scannerConnected={scannerConnected}
            scannerName={scannerName}
          />
        </div>
        <Card className="p-5 sticky top-4 h-fit max-sm:hidden">
          <CartPanel
            cart={cart}
            cartCount={cartCount}
            cartSubtotal={cartSubtotal}
            cartItemDiscounts={cartItemDiscounts}
            afterItemDiscounts={afterItemDiscounts}
            globalDiscount={globalDiscount}
            cartTotal={cartTotal}
            paymentMethod={paymentMethod}
            processing={processing}
            onUpdateQuantity={updateQuantity}
            onUpdateItemDiscount={updateItemDiscount}
            onRemoveFromCart={removeFromCart}
            onGlobalDiscountChange={(value) => setGlobalDiscount(Math.min(Number(value) || 0, afterItemDiscounts))}
            onPaymentMethodChange={setPaymentMethod}
            onCompleteSale={completeSale}
            amountReceived={amountReceived}
            onAmountReceivedChange={setAmountReceived}
          />
        </Card>
      </div>

      <div className={`sm:hidden ${mobileTab === 'cart' ? '' : 'hidden'}`}>
        <Card className="p-4">
          <CartPanel
            cart={cart}
            cartCount={cartCount}
            cartSubtotal={cartSubtotal}
            cartItemDiscounts={cartItemDiscounts}
            afterItemDiscounts={afterItemDiscounts}
            globalDiscount={globalDiscount}
            cartTotal={cartTotal}
            paymentMethod={paymentMethod}
            processing={processing}
            onUpdateQuantity={updateQuantity}
            onUpdateItemDiscount={updateItemDiscount}
            onRemoveFromCart={removeFromCart}
            onGlobalDiscountChange={(value) => setGlobalDiscount(Math.min(Number(value) || 0, afterItemDiscounts))}
            onPaymentMethodChange={setPaymentMethod}
            onCompleteSale={completeSale}
            amountReceived={amountReceived}
            onAmountReceivedChange={setAmountReceived}
          />
        </Card>
      </div>

      {completedSale && (
        <InvoiceModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          onSaleUpdated={setCompletedSale}
        />
      )}
    </div>
  );
}
