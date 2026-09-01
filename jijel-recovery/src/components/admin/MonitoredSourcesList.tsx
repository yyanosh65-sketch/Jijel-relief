"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Plus, Radio } from "lucide-react";

import {
  addSourceToMonitoringQueue,
  formatLastSyncLabel,
  getAllMonitoredSources,
  isFacebookUrl,
  SOURCE_TYPE_LABELS,
  SYNC_STATUS_BADGES,
  type MonitoredSource,
} from "@/lib/monitored-sources";
import { formInputClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

export default function MonitoredSourcesList() {
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDaira, setNewDaira] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const refreshSources = useCallback(() => {
    setSources(getAllMonitoredSources());
  }, []);

  useEffect(() => {
    refreshSources();
  }, [refreshSources]);

  function handleAddSource() {
    setError(null);
    setSuccess(null);

    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) {
      setError("أدخل رابط صفحة أو مجموعة فيسبوك.");
      return;
    }

    if (!isFacebookUrl(trimmedUrl)) {
      setError("الرابط غير صالح — استخدم رابط facebook.com أو fb.com.");
      return;
    }

    setIsAdding(true);

    try {
      const added = addSourceToMonitoringQueue({
        url: trimmedUrl,
        name_ar: newLabel.trim() || undefined,
        daira_ar: newDaira.trim() || undefined,
      });

      setNewUrl("");
      setNewLabel("");
      setNewDaira("");
      setSuccess(`تمت إضافة «${added.name_ar}» إلى قائمة المراقبة.`);
      refreshSources();
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "تعذر إضافة المصدر.",
      );
    } finally {
      setIsAdding(false);
    }
  }

  const activeCount = sources.filter((source) => source.status === "active").length;
  const pendingCount = sources.filter((source) => source.status === "pending").length;

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3">
        <div className="flex items-start gap-2">
          <Radio className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <div>
            <p className="text-sm font-bold text-sky-900">
              مصادر المراقبة الاجتماعية — ولاية جيجل
            </p>
            <p className="mt-1 text-xs leading-relaxed text-sky-800/90">
              {activeCount} مصدر نشط
              {pendingCount > 0 ? ` · ${pendingCount} بانتظار التفعيل` : ""}
              — يُستورد منها النداءات تلقائياً عبر الوكيل الذكي.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-sm font-bold text-slate-900">
          إضافة مصدر جديد للمراقبة
        </p>
        <div className="space-y-2">
          <input
            type="url"
            dir="ltr"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://www.facebook.com/groups/..."
            className={cn(formInputClass, "text-left")}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="اسم المصدر (اختياري)"
              className={formInputClass}
            />
            <input
              type="text"
              value={newDaira}
              onChange={(e) => setNewDaira(e.target.value)}
              placeholder="الدائرة المستهدفة (اختياري)"
              className={formInputClass}
            />
          </div>
          <button
            type="button"
            disabled={isAdding || !newUrl.trim()}
            onClick={handleAddSource}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isAdding ? "جاري الإضافة…" : "إضافة للقائمة بنقرة واحدة"}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-2 text-xs font-semibold text-emerald-700">{success}</p>
        ) : null}
      </div>

      <ul className="space-y-2">
        {sources.map((source) => (
          <MonitoredSourceCard key={source.id} source={source} />
        ))}
      </ul>
    </div>
  );
}

function MonitoredSourceCard({ source }: { source: MonitoredSource }) {
  const syncBadge = SYNC_STATUS_BADGES[source.lastSyncStatus];

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-slate-300 hover:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{source.name_ar}</h3>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {SOURCE_TYPE_LABELS[source.type]}
            </span>
            {source.verified ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                ✓ موثّق
              </span>
            ) : (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                يدوي
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{source.name}</p>
          <p className="text-xs text-slate-700">
            📍 دائرة {source.daira_ar}
            {source.commune_ar ? ` · بلدية ${source.commune_ar}` : ""}
          </p>
          {source.notes ? (
            <p className="text-[11px] leading-relaxed text-slate-500">
              {source.notes}
            </p>
          ) : null}
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold",
            syncBadge.className,
          )}
        >
          {syncBadge.label} —{" "}
          {formatLastSyncLabel(source.lastSyncedAt, source.lastSyncStatus)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
        <p className="text-[10px] text-slate-500">
          {typeof source.postsIngested24h === "number"
            ? `${source.postsIngested24h} منشوراً خلال 24 ساعة`
            : "بانتظار أول دورة جمع"}
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 transition hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          فتح على فيسبوك
        </a>
      </div>
    </li>
  );
}
