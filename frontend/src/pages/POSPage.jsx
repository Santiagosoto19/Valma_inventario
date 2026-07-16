import { useEffect, useState } from 'react';
import {
  Search, ShoppingCart, Package, Plus, Minus, X,
  Banknote, Smartphone, CreditCard, Tag, Percent,
} from 'lucide-react';
import { api, formatCurrency } from '../services/api';
import ProductImage from '../components/ui/ProductImage';
import { useNotifications } from '../context/NotificationContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import InvoiceModal from '../components/sales/InvoiceModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

function lineSubtotal(item) {
  return Number(item.product.price) * item.quantity;
}

function ProductGrid({ search, onSearchChange, filteredProducts, onAddToCart }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-pastel pl-11"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="card-pastel p-3 text-left active:scale-95 hover:shadow-soft hover:scale-[1.02] transition-all duration-200"
          >
            <div className="h-20 sm:h-24 rounded-2xl mb-2 overflow-hidden">
              <ProductImage
                src={product.image_url}
                alt={product.name}
                className="w-full h-full"
                iconSize={28}
              />
            </div>
            <p className="font-bold text-sm truncate text-slate-800">{product.name}</p>
            <p className="text-pink-600 font-extrabold text-sm mt-1">{formatCurrency(product.price)}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Stock: {product.stock}</p>
          </button>
        ))}
      </div>
      {filteredProducts.length === 0 && (
        <p className="text-center text-slate-500 py-8 font-medium">No hay productos disponibles</p>
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
}) {
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
                  <p className="font-bold text-sm truncate">{item.product.name}</p>
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

        <Button variant="success" size="xl" icon={CreditCard} className="w-full" onClick={onCompleteSale} disabled={processing || !cart.length}>
          {processing ? 'Procesando...' : 'Terminar Venta'}
        </Button>
      </div>
    </div>
  );
}

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [search, setSearch] = useState('');
  const [mobileTab, setMobileTab] = useState('products');
  const { addNotification } = useNotifications();
  const isMobile = useIsMobile();

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await api.products.list();
      setProducts(data.filter((p) => p.stock > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartSubtotal = cart.reduce((sum, item) => sum + lineSubtotal(item), 0);
  const cartItemDiscounts = cart.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const afterItemDiscounts = Math.max(0, cartSubtotal - cartItemDiscounts);
  const cartTotal = Math.max(0, afterItemDiscounts - (Number(globalDiscount) || 0));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Stock máximo: ${product.stock}`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
    if (isMobile) setMobileTab('cart');
  }

  function updateQuantity(productId, delta) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.stock) {
          alert(`Stock máximo: ${item.product.stock}`);
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
    if (!cart.length) { alert('Agrega productos al carrito'); return; }
    try {
      setProcessing(true);
      const sale = await api.sales.create({
        payment_method: paymentMethod,
        global_discount: Number(globalDiscount) || 0,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          discount: Number(i.discount) || 0,
        })),
      });
      setCompletedSale(sale);
      setCart([]);
      setGlobalDiscount(0);
      setMobileTab('products');
      await loadProducts();
      addNotification({
        type: 'success',
        title: 'Venta completada',
        message: `Factura ${sale.invoice_number} — ${formatCurrency(sale.total)}`,
      });
    } catch (err) {
      alert(err.message);
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

      <div className="sm:hidden">
        {mobileTab === 'products' ? (
          <ProductGrid
            search={search}
            onSearchChange={setSearch}
            filteredProducts={filteredProducts}
            onAddToCart={addToCart}
          />
        ) : (
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
            />
          </Card>
        )}
      </div>

      <div className="hidden sm:grid sm:grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductGrid
            search={search}
            onSearchChange={setSearch}
            filteredProducts={filteredProducts}
            onAddToCart={addToCart}
          />
        </div>
        <Card className="p-5 sticky top-4 h-fit">
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
          />
        </Card>
      </div>

      {completedSale && <InvoiceModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
    </div>
  );
}
