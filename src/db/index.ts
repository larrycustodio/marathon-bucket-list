import type { MarathonEvent, MarathonEventInput } from '../types';

const DB_NAME = 'marathon-bucket-list';
const DB_VERSION = 1;
const STORE_NAME = 'events';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('state', 'state', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('eventType', 'eventType', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function createEvent(input: MarathonEventInput): Promise<MarathonEvent> {
  const db = await openDB();
  const now = new Date().toISOString();
  const event: MarathonEvent = {
    ...input,
    id: generateId(),
    status: input.finishedDate ? 'finished' : 'planned',
    createdAt: now,
    updatedAt: now,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(event);
    req.onsuccess = () => resolve(event);
    req.onerror = () => reject(req.error);
  });
}

export async function getEvents(): Promise<MarathonEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as MarathonEvent[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getEvent(id: string): Promise<MarathonEvent | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as MarathonEvent | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function updateEvent(id: string, updates: Partial<MarathonEventInput>): Promise<MarathonEvent> {
  const db = await openDB();
  const existing = await getEvent(id);
  if (!existing) throw new Error(`Event ${id} not found`);
  const updated: MarathonEvent = {
    ...existing,
    ...updates,
    status: (updates.finishedDate ?? existing.finishedDate) ? 'finished' : 'planned',
    updatedAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
