import monitoredSourcesData from "@/data/monitored-sources.json";

export type MonitoredSourceType = "page" | "group";
export type MonitoredSourceStatus = "active" | "paused" | "pending";
export type MonitoredSyncStatus = "success" | "pending" | "error" | "never";

export type MonitoredSource = {
  id: string;
  name: string;
  name_ar: string;
  type: MonitoredSourceType;
  url: string;
  daira: string;
  daira_ar: string;
  commune: string;
  commune_ar: string;
  status: MonitoredSourceStatus;
  verified: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: MonitoredSyncStatus;
  postsIngested24h?: number;
  notes?: string;
  queuedAt?: string;
  operatorAdded?: boolean;
};

export type QueuedMonitoredSourceInput = {
  url: string;
  name?: string;
  name_ar?: string;
  daira_ar?: string;
  commune_ar?: string;
  type?: MonitoredSourceType;
};

const QUEUE_STORAGE_KEY = "jijel-monitored-sources-queue";

export type MonitoredSourcesFile = {
  keywords: string[];
  sources: MonitoredSource[];
};

const monitoredSourcesFile =
  monitoredSourcesData as MonitoredSourcesFile;

const bundledSources = monitoredSourcesFile.sources;
const searchKeywords = monitoredSourcesFile.keywords ?? [];

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isFacebookUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.hostname.includes("facebook.com") ||
      parsed.hostname.includes("fb.com")
    );
  } catch {
    return false;
  }
}

export function inferSourceType(url: string): MonitoredSourceType {
  return url.includes("/groups/") ? "group" : "page";
}

function readQueuedSources(): MonitoredSource[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MonitoredSource[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueuedSources(sources: MonitoredSource[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(sources));
}

export function getBundledMonitoredSources(): MonitoredSource[] {
  return bundledSources;
}

export function getMonitoredSearchKeywords(): string[] {
  return [...searchKeywords];
}

export function getQueuedMonitoredSources(): MonitoredSource[] {
  return readQueuedSources();
}

export function getAllMonitoredSources(): MonitoredSource[] {
  const queued = readQueuedSources();
  const bundledIds = new Set(bundledSources.map((source) => source.id));
  const uniqueQueued = queued.filter((source) => !bundledIds.has(source.id));
  return [...bundledSources, ...uniqueQueued];
}

export function addSourceToMonitoringQueue(
  input: QueuedMonitoredSourceInput,
): MonitoredSource {
  const url = input.url.trim();

  if (!isFacebookUrl(url)) {
    throw new Error("الرابط يجب أن يكون صفحة أو مجموعة فيسبوك صالحة.");
  }

  const existing = getAllMonitoredSources().find(
    (source) => source.url.toLowerCase() === url.toLowerCase(),
  );

  if (existing) {
    throw new Error("هذا المصدر موجود بالفعل في قائمة المراقبة.");
  }

  const type = input.type ?? inferSourceType(url);
  const pathSegment = url.split("/").filter(Boolean).pop() ?? "source";
  const id = `queued-${slugify(pathSegment) || "facebook"}-${Date.now()}`;

  const source: MonitoredSource = {
    id,
    name: input.name?.trim() || pathSegment,
    name_ar: input.name_ar?.trim() || `مصدر فيسبوك — ${pathSegment}`,
    type,
    url,
    daira: "",
    daira_ar: input.daira_ar?.trim() || "غير محددة",
    commune: "",
    commune_ar: input.commune_ar?.trim() || "غير محددة",
    status: "pending",
    verified: false,
    lastSyncedAt: null,
    lastSyncStatus: "pending",
    queuedAt: new Date().toISOString(),
    operatorAdded: true,
    notes: "أُضيف يدوياً من لوحة المشغّل — بانتظار أول مزامنة",
  };

  const queued = readQueuedSources();
  queued.unshift(source);
  writeQueuedSources(queued);

  return source;
}

export function formatLastSyncLabel(
  lastSyncedAt: string | null,
  status: MonitoredSyncStatus,
): string {
  if (status === "pending") {
    return "بانتظار أول مزامنة";
  }

  if (status === "never" || !lastSyncedAt) {
    return "لم تتم المزامنة بعد";
  }

  if (status === "error") {
    return "فشلت آخر مزامنة";
  }

  const date = new Date(lastSyncedAt);
  if (Number.isNaN(date.getTime())) {
    return "غير معروف";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "منذ لحظات";
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
}

export const SYNC_STATUS_BADGES: Record<
  MonitoredSyncStatus,
  { label: string; className: string }
> = {
  success: {
    label: "متزامن",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  pending: {
    label: "قيد الانتظار",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  error: {
    label: "خطأ مزامنة",
    className: "border-red-200 bg-red-50 text-red-900",
  },
  never: {
    label: "لم تُزامَن",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export const SOURCE_TYPE_LABELS: Record<MonitoredSourceType, string> = {
  page: "صفحة",
  group: "مجموعة",
};
