import { api } from './api';
import { shouldQueueSale } from '../utils/errors';
import {
  deleteQueueItem,
  getQueueItem,
  listQueue,
  loadCatalog,
  putQueueItem,
  saveCatalog,
} from './offlineDb';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function tracksStock(product) {
  return product.track_stock !== false && !product.service_group;
}

export function buildLocalSale(lines, body, id = crypto.randomUUID()) {
  let subtotal = 0;
  let discountItems = 0;
  const items = lines.map((line, index) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.product.price);
    const lineSubtotal = roundMoney(unitPrice * quantity);
    const discountAmount = roundMoney(Math.max(0, Number(line.discount) || 0));
    const itemNet = roundMoney(lineSubtotal - discountAmount);
    subtotal = roundMoney(subtotal + lineSubtotal);
    discountItems = roundMoney(discountItems + discountAmount);
    return {
      id: `${id}-${index}`,
      product_id: line.product.id,
      product_name: line.product.name,
      quantity,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      discount_amount: discountAmount,
      subtotal: itemNet,
      tracksStock: tracksStock(line.product),
    };
  });

  const afterItemDiscounts = roundMoney(subtotal - discountItems);
  const discountGlobal = roundMoney(Math.max(0, Number(body.global_discount) || 0));
  const total = roundMoney(Math.max(0, afterItemDiscounts - discountGlobal));
  const createdAt = new Date().toISOString();

  return {
    id,
    invoice_number: 'PENDIENTE',
    pending: true,
    subtotal,
    discount_items: discountItems,
    discount_global: discountGlobal,
    total,
    payment_method: body.payment_method,
    created_at: createdAt,
    items,
  };
}

function applyLinesToProducts(products, lines, direction) {
  const deltas = new Map(
    lines.map((line) => [line.product.id, Number(line.quantity) * direction])
  );
  return products.map((product) => {
    const delta = deltas.get(product.id);
    if (!delta || !tracksStock(product)) return product;
    return { ...product, stock: Math.max(0, Number(product.stock) + delta) };
  });
}

export async function adjustCachedStock(catalogKey, lines, direction) {
  const products = await loadCatalog(catalogKey);
  if (!products) return null;
  const next = applyLinesToProducts(products, lines, direction);
  await saveCatalog(catalogKey, next);
  return next;
}

export async function enqueueSale({ catalogKey, body, lines, id }) {
  const sale = buildLocalSale(lines, body, id);
  const payload = { ...body, client_sale_id: sale.id };
  await putQueueItem({
    id: sale.id,
    status: 'pending',
    catalogKey,
    body: payload,
    lines: lines.map((line) => ({
      product: line.product,
      quantity: line.quantity,
      discount: Number(line.discount) || 0,
    })),
    preview: sale,
    createdAt: Date.now(),
    attempts: 0,
    error: null,
  });
  await adjustCachedStock(catalogKey, lines, -1);
  return sale;
}

export async function getQueueSnapshot() {
  const items = await listQueue();
  return {
    pending: items.filter((item) => item.status === 'pending'),
    failed: items.filter((item) => item.status === 'failed'),
    all: items,
  };
}

export async function updateQueuedSalePayment(id, payment_method) {
  const item = await getQueueItem(id);
  if (!item) return null;
  const next = {
    ...item,
    body: { ...item.body, payment_method },
    preview: { ...item.preview, payment_method },
  };
  await putQueueItem(next);
  return { ...next.preview, pending: true, items: next.preview?.items || item.preview?.items };
}

export async function dismissQueueItem(id) {
  await deleteQueueItem(id);
}

export async function retryQueueItem(id) {
  const items = await listQueue();
  const item = items.find((row) => row.id === id);
  if (!item) return;
  await putQueueItem({ ...item, status: 'pending', error: null });
}

export async function syncPendingSales({ onSynced, onFailed } = {}) {
  const { pending } = await getQueueSnapshot();
  let synced = 0;
  let failed = 0;
  let stoppedOffline = false;

  for (const item of pending) {
    try {
      const sale = await api.sales.create(item.body);
      await deleteQueueItem(item.id);
      synced += 1;
      onSynced?.({ item, sale });
    } catch (error) {
      if (shouldQueueSale(error)) {
        stoppedOffline = true;
        break;
      }
      await putQueueItem({
        ...item,
        status: 'failed',
        attempts: (item.attempts || 0) + 1,
        error: error.message,
      });
      if (item.catalogKey && item.lines) {
        await adjustCachedStock(item.catalogKey, item.lines, 1);
      }
      failed += 1;
      onFailed?.({ item, error });
    }
  }

  return { synced, failed, stoppedOffline, ...(await getQueueSnapshot()) };
}

export async function submitSale({ catalogKey, body, lines }) {
  const localSale = buildLocalSale(lines, body);
  const payload = { ...body, client_sale_id: localSale.id };

  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const sale = await api.sales.create(payload);
      return { sale, queued: false };
    } catch (error) {
      if (!shouldQueueSale(error)) throw error;
    }
  }

  const queued = await enqueueSale({
    catalogKey,
    body,
    lines,
    id: localSale.id,
  });
  return { sale: queued, queued: true };
}
