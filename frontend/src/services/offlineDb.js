const DB_NAME = 'valma-offline';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('catalogs')) {
        db.createObjectStore('catalogs');
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeOp(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
        if (req) {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        }
      })
  );
}

export async function saveCatalog(key, products) {
  await storeOp('catalogs', 'readwrite', (store) =>
    store.put({ products, savedAt: Date.now() }, key)
  );
}

export async function loadCatalog(key) {
  const row = await storeOp('catalogs', 'readonly', (store) => store.get(key));
  return row?.products ?? null;
}

export async function putQueueItem(item) {
  await storeOp('queue', 'readwrite', (store) => store.put(item));
}

export async function getQueueItem(id) {
  return storeOp('queue', 'readonly', (store) => store.get(id));
}

export async function deleteQueueItem(id) {
  await storeOp('queue', 'readwrite', (store) => store.delete(id));
}

export async function listQueue() {
  const items = await storeOp('queue', 'readonly', (store) => store.getAll());
  return (items || []).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}
