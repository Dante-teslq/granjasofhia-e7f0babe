/**
 * Offline-first persistence layer using IndexedDB + sync queue.
 * Ensures no data loss even when PWA is offline.
 */

const DB_NAME = "granja_sofhia_offline";
const DB_VERSION = 1;
const QUEUE_STORE = "sync_queue";
const PENDING_STORE = "pending_data";

interface SyncQueueItem {
  id: string;
  table: string;
  action: "insert" | "upsert" | "update" | "delete";
  payload: any;
  conflictColumns?: string;
  createdAt: string;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "createdAt" | "retries">): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  store.add(entry);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const store = tx.objectStore(QUEUE_STORE);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).delete(id);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}

export async function updateQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).put(item);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}

/** Save arbitrary data to IndexedDB for offline cache */
export async function savePendingData(key: string, data: any): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(PENDING_STORE, "readwrite");
  tx.objectStore(PENDING_STORE).put({ key, data, savedAt: new Date().toISOString() });
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}

export async function getPendingData(key: string): Promise<any | null> {
  const db = await openDB();
  const tx = db.transaction(PENDING_STORE, "readonly");
  const req = tx.objectStore(PENDING_STORE).get(key);
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
}

export async function clearPendingData(key: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(PENDING_STORE, "readwrite");
  tx.objectStore(PENDING_STORE).delete(key);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}

export function getQueueLength(): Promise<number> {
  return getSyncQueue().then((q) => q.length);
}
