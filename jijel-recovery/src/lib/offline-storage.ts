/**
 * Offline-first IndexedDB cache for map mesh data and pending submissions.
 * No external dependencies — native indexedDB with a thin Promise wrapper.
 */

const DB_NAME = "jijel-relief-offline";
const DB_VERSION = 1;
const STORE_MESH = "mesh";
const STORE_PENDING = "pending_submissions";
const MESH_RECORD_KEY = "primary";

export const OFFLINE_COORDINATION_SMS = "+213555000000";

export type OfflineMeshRecord = {
  settlements: unknown[];
  needs: unknown[];
  phones: Array<{
    name: string;
    phone: string;
    commune?: string;
    category?: string;
  }>;
  roadStatuses: Array<{
    route: string;
    labelAr: string;
    status: string;
    noteAr: string;
  }>;
  /** Mountain trail clearance snapshots for offline map */
  trails?: unknown[];
  /** Optional full intelligence blob for offline map recovery */
  intelligence?: unknown;
  cachedAt: string;
};

export type OfflinePendingSubmission = {
  id?: number;
  type: string;
  payload: unknown;
  createdAt: string;
  smsBody?: string;
};

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MESH)) {
        db.createObjectStore(STORE_MESH);
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open offline DB"));
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = await Promise.resolve(fn(store)).then((value) =>
      value instanceof IDBRequest ? idbRequest(value) : value,
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
    });
    return result;
  } finally {
    db.close();
  }
}

export function isBrowserOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (isBrowserOffline()) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("timeout") ||
    message.includes("aborted")
  );
}

/**
 * Cache settlements + needs, and optionally merge phones / road statuses /
 * intelligence into the same mesh snapshot.
 */
export async function cacheSettlementsAndNeeds(
  settlements: unknown[],
  needs: unknown[],
  extras?: {
    phones?: OfflineMeshRecord["phones"];
    roadStatuses?: OfflineMeshRecord["roadStatuses"];
    intelligence?: unknown;
  },
): Promise<void> {
  if (!canUseIndexedDb()) return;

  try {
    const previous = await getMeshRecord();
    const record: OfflineMeshRecord = {
      settlements,
      needs,
      phones: extras?.phones ?? previous?.phones ?? [],
      roadStatuses: extras?.roadStatuses ?? previous?.roadStatuses ?? [],
      trails: previous?.trails,
      intelligence: extras?.intelligence ?? previous?.intelligence,
      cachedAt: new Date().toISOString(),
    };

    await withStore(STORE_MESH, "readwrite", (store) =>
      store.put(record, MESH_RECORD_KEY),
    );
  } catch (error) {
    console.warn("[offline-storage] cacheSettlementsAndNeeds failed:", error);
  }
}

export async function getCachedSettlementsAndNeeds(): Promise<{
  settlements: unknown[];
  needs: unknown[];
} | null> {
  const record = await getMeshRecord();
  if (!record) return null;
  return {
    settlements: record.settlements ?? [],
    needs: record.needs ?? [],
  };
}

export async function getMeshRecord(): Promise<OfflineMeshRecord | null> {
  if (!canUseIndexedDb()) return null;

  try {
    const record = await withStore<OfflineMeshRecord | undefined>(
      STORE_MESH,
      "readonly",
      (store) => store.get(MESH_RECORD_KEY),
    );
    return record ?? null;
  } catch {
    return null;
  }
}

export async function cacheMountainTrails(trails: unknown[]): Promise<void> {
  if (!canUseIndexedDb()) return;

  try {
    const previous = await getMeshRecord();
    const record: OfflineMeshRecord = {
      settlements: previous?.settlements ?? [],
      needs: previous?.needs ?? [],
      phones: previous?.phones ?? [],
      roadStatuses: previous?.roadStatuses ?? [],
      trails,
      intelligence: previous?.intelligence,
      cachedAt: new Date().toISOString(),
    };
    await withStore(STORE_MESH, "readwrite", (store) =>
      store.put(record, MESH_RECORD_KEY),
    );
  } catch (error) {
    console.warn("[offline-storage] cacheMountainTrails failed:", error);
  }
}

export async function getCachedMountainTrails(): Promise<unknown[] | null> {
  const record = await getMeshRecord();
  if (!record?.trails || !Array.isArray(record.trails)) return null;
  return record.trails;
}

export async function cacheOfflineSubmission(
  type: string,
  payload: unknown,
): Promise<void> {
  if (!canUseIndexedDb()) return;

  const entry: OfflinePendingSubmission = {
    type,
    payload,
    createdAt: new Date().toISOString(),
    smsBody:
      typeof payload === "object" &&
      payload &&
      "smsBody" in payload &&
      typeof (payload as { smsBody?: unknown }).smsBody === "string"
        ? (payload as { smsBody: string }).smsBody
        : undefined,
  };

  try {
    await withStore(STORE_PENDING, "readwrite", (store) => store.add(entry));
  } catch (error) {
    console.warn("[offline-storage] cacheOfflineSubmission failed:", error);
  }
}

export async function getPendingOfflineSubmissions(): Promise<
  OfflinePendingSubmission[]
> {
  if (!canUseIndexedDb()) return [];

  try {
    const rows = await withStore<OfflinePendingSubmission[]>(
      STORE_PENDING,
      "readonly",
      (store) => store.getAll(),
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function removePendingOfflineSubmission(
  id: number,
): Promise<void> {
  if (!canUseIndexedDb()) return;
  try {
    await withStore(STORE_PENDING, "readwrite", (store) => store.delete(id));
  } catch (error) {
    console.warn("[offline-storage] removePending failed:", error);
  }
}

export type EmergencySmsDraft = {
  type: string;
  locationCodeOrName: string;
  urgency: string;
  contactPhone: string;
};

/** Compact JJL# protocol body for coordination SMS */
export function buildEmergencySmsBody(draft: EmergencySmsDraft): string {
  const sanitize = (value: string) =>
    value.replace(/#/g, "-").replace(/\s+/g, " ").trim() || "-";

  return [
    "JJL",
    sanitize(draft.type),
    sanitize(draft.locationCodeOrName),
    sanitize(draft.urgency),
    sanitize(draft.contactPhone),
  ].join("#");
}

export function buildEmergencySmsUri(draft: EmergencySmsDraft): string {
  const body = buildEmergencySmsBody(draft);
  const encoded = encodeURIComponent(body);
  const phone = OFFLINE_COORDINATION_SMS;

  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return `sms:${phone}&body=${encoded}`;
  }

  return `sms:${phone}?body=${encoded}`;
}

export function buildHumanSmsPreview(draft: EmergencySmsDraft): string {
  return [
    "📡 نداء إغاثة جيجل (وضع بدون إنترنت)",
    `النوع: ${draft.type}`,
    `الموقع: ${draft.locationCodeOrName}`,
    `الأولوية: ${draft.urgency}`,
    `الهاتف: ${draft.contactPhone}`,
    "",
    `الرمز: ${buildEmergencySmsBody(draft)}`,
  ].join("\n");
}
