"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardCopy, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type DeficitTrackerRow = {
  commune: string;
  communeAr: string;
  daira: string;
  totalRequired: number;
  fulfilled: number;
  remaining: number;
  remainingRatio: number;
  categories: string[];
  categoriesAr?: string[];
};

type FieldDispatchPanelProps = {
  className?: string;
};

function formatAlgeriaDateTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${hh}:${mm} - ${yyyy}/${mo}/${day}`;
}

function barTone(remainingRatio: number): {
  bar: string;
  chip: string;
} {
  if (remainingRatio > 0.5) {
    return {
      bar: "bg-gradient-to-l from-rose-500 to-amber-500",
      chip: "border-rose-500/40 bg-rose-950/50 text-rose-200",
    };
  }
  if (remainingRatio > 0.2) {
    return {
      bar: "bg-gradient-to-l from-amber-500 to-emerald-500",
      chip: "border-amber-500/40 bg-amber-950/40 text-amber-200",
    };
  }
  return {
    bar: "bg-emerald-500",
    chip: "border-emerald-500/40 bg-emerald-950/40 text-emerald-200",
  };
}

function buildFieldBriefing(input: {
  deficits: DeficitTrackerRow[];
  roadAlerts: string[];
  generatedAt?: string;
}): string {
  const deficitLines =
    input.deficits.length > 0
      ? input.deficits.slice(0, 5).map((d) => {
          const types = (d.categoriesAr ?? d.categories).join("، ") || "متنوع";
          return `• ${d.communeAr}: باقي ${d.remaining} وحدة (${types})`;
        })
      : ["• لا يوجد عجز معلّق بارز حالياً"];

  const roadLines =
    input.roadAlerts.length > 0
      ? input.roadAlerts.map((line) => `• ${line}`)
      : ["• لا توجد قيود مسجّلة حالياً على المحاور الرئيسية"];

  return [
    "🚨 موجز التنسيق الميداني - ولاية جيجل",
    "المنصة الميدانية: ighata.live",
    `التاريخ والوقت: ${formatAlgeriaDateTime(input.generatedAt)}`,
    "",
    "📊 العجز الحالي الأكثر إلحاحاً:",
    ...deficitLines,
    "",
    "🚧 حالة المسالك الجبلية الحالية:",
    ...roadLines,
    "",
    "🔗 للمتابعة الحية أو التنسيق المباشر: https://ighata.live",
  ].join("\n");
}

export default function FieldDispatchPanel({
  className,
}: FieldDispatchPanelProps) {
  const [deficits, setDeficits] = useState<DeficitTrackerRow[]>([]);
  const [roadAlerts, setRoadAlerts] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch("/api/agent/field-dispatch")
        .then((r) => r.json())
        .then(
          (json: {
            success?: boolean;
            data?: {
              deficits: DeficitTrackerRow[];
              roadAlerts: string[];
              generatedAt: string;
            };
          }) => {
            if (cancelled || !json.success || !json.data) return;
            setDeficits(json.data.deficits);
            setRoadAlerts(json.data.roadAlerts);
            setGeneratedAt(json.data.generatedAt);
          },
        )
        .catch(() => {
          /* ignore — panel stays empty */
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const copyBriefing = useCallback(async () => {
    setCopyError(null);
    const text = buildFieldBriefing({ deficits, roadAlerts, generatedAt });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2800);
    } catch {
      setCopyError("تعذر النسخ — جرّب يدوياً.");
    }
  }, [deficits, roadAlerts, generatedAt]);

  return (
    <div className={cn("space-y-3", className)} dir="rtl">
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/25 p-3.5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-100">
            🚨 العجز المتبقي
          </span>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-200/70" />
          ) : null}
        </div>

        {deficits.length === 0 && !loading ? (
          <p className="text-xs text-slate-400">ما كاش عجز معلّق بارز دوكا.</p>
        ) : (
          <ul className="space-y-2.5">
            {deficits.map((row) => {
              const fulfilledPct = Math.min(
                100,
                Math.round(
                  row.totalRequired > 0
                    ? (row.fulfilled / row.totalRequired) * 100
                    : 0,
                ),
              );
              const tone = barTone(row.remainingRatio);
              return (
                <li
                  key={`${row.commune}-${row.daira}`}
                  className="rounded-xl border border-slate-700/50 bg-slate-950/40 px-2.5 py-2"
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-white">
                      {row.communeAr}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        tone.chip,
                      )}
                    >
                      باقي {row.remaining} وحدة من أصل {row.totalRequired}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={cn("h-full rounded-full transition-all", tone.bar)}
                      style={{ width: `${fulfilledPct}%` }}
                      role="progressbar"
                      aria-valuenow={fulfilledPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  {(row.categoriesAr ?? row.categories).length > 0 ? (
                    <p className="mt-1 text-[10px] text-slate-400">
                      {(row.categoriesAr ?? row.categories).join(" · ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => void copyBriefing()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600 px-3 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            تم نسخ التقرير بنجاح! جاهز للمشاركة
          </>
        ) : (
          <>
            <ClipboardCopy className="h-4 w-4" />
            نسخ ملخص الوضع الميداني 📋
          </>
        )}
      </button>

      {copied ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-3 py-2 text-center text-xs font-semibold text-emerald-200">
          تم نسخ التقرير بنجاح! جاهز للمشاركة على واتساب وفيسبوك
        </p>
      ) : null}
      {copyError ? (
        <p className="text-center text-xs font-semibold text-rose-300">
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
