"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  classifyFeedPost,
  type ClassifiedFeedPost,
  type FeedFlowBadge,
} from "@/lib/feed-flow-classifier";
import { formatAddressHierarchy } from "@/lib/map-location-display";
import MonitoredSourcesList from "@/components/admin/MonitoredSourcesList";
import { cn } from "@/lib/utils";

const FeedPinPreview = dynamic(
  () => import("@/components/admin/FeedPinPreview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
        جاري تحميل الخريطة…
      </div>
    ),
  },
);

type FeedImporterModalProps = {
  open: boolean;
  onClose: () => void;
};

type AgentToolResult = {
  toolName: string;
  output: unknown;
};

type AgentDispatch = {
  shareUrl: string;
  whatsappTargets: { name: string; phone: string; whatsappUrl: string }[];
};

type AgentStructured = {
  entityType: string | null;
  flowCategory: string | null;
  flowBadge: FeedFlowBadge | null;
  title: string | null;
  commune: string | null;
  communeAr: string | null;
  daira: string | null;
  village: string | null;
  phone: string | null;
  urgency: string | null;
  lat: number | null;
  lng: number | null;
  recordId: number | null;
  recordKind:
    | "aid_need"
    | "sos_alert"
    | "accommodation"
    | "incoming_convoy"
    | null;
};

type AgentApiResponse = {
  text?: string;
  toolResults?: AgentToolResult[];
  structured?: AgentStructured;
  classified?: ClassifiedFeedPost;
  flowCategory?: string;
  flowBadge?: FeedFlowBadge;
  pin?: { lat: number; lng: number };
  saved?: {
    kind: "aid_need" | "sos_alert" | "accommodation" | "incoming_convoy";
    id: number;
  } | null;
  dispatch?: AgentDispatch | null;
  error?: string;
};

const RECORD_KIND_LABELS: Record<string, string> = {
  sos_alert: "نداء SOS",
  aid_need: "احتياج إغاثة",
  accommodation: "إيواء ومبيت",
  incoming_convoy: "قافلة قادمة",
};

type FeedImporterTab = "import" | "sources";

const FEED_IMPORTER_TABS: Array<{ id: FeedImporterTab; label: string }> = [
  { id: "import", label: "⚡ استيراد منشور" },
  { id: "sources", label: "📡 مصادر المراقبة" },
];

export function FeedImporterModal({ open, onClose }: FeedImporterModalProps) {
  const [activeTab, setActiveTab] = useState<FeedImporterTab>("import");
  const [rawInput, setRawInput] = useState("");
  const [instantPreview, setInstantPreview] = useState<ClassifiedFeedPost | null>(
    null,
  );
  const [agentResponse, setAgentResponse] = useState<AgentApiResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const agentRequestId = useRef(0);

  const runInstantPreview = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setInstantPreview(null);
      return;
    }

    try {
      setInstantPreview(classifyFeedPost(trimmed));
    } catch {
      setInstantPreview(null);
    }
  }, []);

  const runAgentAnalysis = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setAgentResponse(null);
      return;
    }

    const requestId = ++agentRequestId.current;
    setIsAgentLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/process-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: trimmed }),
      });

      const payload = (await response.json()) as AgentApiResponse;

      if (requestId !== agentRequestId.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "تعذّر تشغيل الوكيل الذكي.");
      }

      setAgentResponse(payload);
    } catch (agentError) {
      if (requestId !== agentRequestId.current) {
        return;
      }

      setAgentResponse(null);
      setError(
        agentError instanceof Error
          ? agentError.message
          : "تعذّر تشغيل الوكيل الذكي.",
      );
    } finally {
      if (requestId === agentRequestId.current) {
        setIsAgentLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    runInstantPreview(rawInput);

    const timer = window.setTimeout(() => {
      void runAgentAnalysis(rawInput);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [rawInput, open, runAgentAnalysis, runInstantPreview]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleClose = () => {
    setRawInput("");
    setInstantPreview(null);
    setAgentResponse(null);
    setError(null);
    setIsAgentLoading(false);
    setActiveTab("import");
    onClose();
  };

  const handleManualAgentRun = () => {
    startTransition(async () => {
      await runAgentAnalysis(rawInput);
    });
  };

  const structured = agentResponse?.structured ?? null;
  const savedRecord = agentResponse?.saved ?? null;
  const dispatch = agentResponse?.dispatch ?? null;
  const toolResults = agentResponse?.toolResults ?? [];

  const activeBadge =
    agentResponse?.flowBadge ??
    structured?.flowBadge ??
    instantPreview?.badge ??
    null;

  const activePin = agentResponse?.pin ??
    (instantPreview
      ? {
          lat: instantPreview.location.lat,
          lng: instantPreview.location.lng,
        }
      : null);

  const activeFlowCategory =
    agentResponse?.flowCategory ??
    structured?.flowCategory ??
    instantPreview?.flowCategory;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3400] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-importer-title"
      onClick={handleClose}
    >
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl",
          activeTab === "sources" ? "max-w-xl" : "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="feed-importer-title"
                className="text-lg font-bold text-slate-900"
              >
                {activeTab === "import"
                  ? "⚡ استيراد نداء من فيسبوك"
                  : "📡 مراقبة المصادر الاجتماعية"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeTab === "import"
                  ? "الصق المنشور — يُصنّف فوراً ويُثبّت تلقائياً في قاعدة البيانات."
                  : "صفحات ومجموعات فيسبوك المحلية المراقَبة في ولاية جيجل."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
            {FEED_IMPORTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-bold transition",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "sources" ? (
          <div className="p-4">
            <MonitoredSourcesList />
          </div>
        ) : (
        <div className="space-y-4 p-4">
          <div>
            <label
              htmlFor="fb-post-input"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              نص المنشور أو الرابط
            </label>
            <textarea
              id="fb-post-input"
              dir="auto"
              rows={7}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setAgentResponse(null);
                setError(null);
                runInstantPreview(e.target.value);
              }}
              placeholder="الصق هنا منشور فيسبوك من مجموعة المجتمع المحلي…"
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-500/30 focus:border-violet-400 focus:bg-white focus:ring-2"
            />
          </div>

          {instantPreview && activeBadge ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  معاينة فورية
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
                    activeBadge.colorClass,
                  )}
                >
                  {activeBadge.emoji} {activeBadge.labelAr}
                </span>
              </div>

              {activePin && activeFlowCategory ? (
                <FeedPinPreview
                  lat={activePin.lat}
                  lng={activePin.lng}
                  flowCategory={activeFlowCategory as ClassifiedFeedPost["flowCategory"]}
                  label={
                    instantPreview.location.village
                      ? `${instantPreview.location.village} — بلدية ${instantPreview.location.communeAr}`
                      : instantPreview.location.communeAr
                  }
                />
              ) : null}

              <dl className="grid gap-1.5 text-xs">
                <PreviewRow
                  label="التسلسل الإداري"
                  value={formatAddressHierarchy({
                    dairaAr: instantPreview.location.dairaAr,
                    communeAr: instantPreview.location.communeAr,
                    douarOrVillage: instantPreview.location.village ?? undefined,
                  })}
                />
                <PreviewRow
                  label="البلدية"
                  value={`${instantPreview.location.communeAr} (${instantPreview.location.commune})`}
                />
                <PreviewRow
                  label="الدائرة"
                  value={instantPreview.location.dairaAr}
                />
                <PreviewRow
                  label="مشتى/الدوار"
                  value={instantPreview.location.village ?? "—"}
                />
                <PreviewRow
                  label="الهاتف"
                  value={instantPreview.phone ?? "لم يُعثر"}
                  warn={!instantPreview.phone}
                />
                <PreviewRow
                  label="الثقة"
                  value={
                    instantPreview.confidence === "high"
                      ? "عالية"
                      : instantPreview.confidence === "medium"
                        ? "متوسطة"
                        : "منخفضة"
                  }
                />
              </dl>
            </div>
          ) : null}

          {isAgentLoading && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
              🤖 الوكيل الذكي يحلل المنشور ويسجّله في قاعدة البيانات…
            </div>
          )}

          {agentResponse?.text ? (
            <div className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/70 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
                تحليل الوكيل الذكي
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                {agentResponse.text}
              </p>
            </div>
          ) : null}

          {toolResults.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-800">
                نتائج تنفيذ الأدوات
              </p>
              {toolResults.map((toolResult, index) => (
                <AgentToolResultCard
                  key={`${toolResult.toolName}-${index}`}
                  toolResult={toolResult}
                />
              ))}
            </div>
          ) : null}

          {structured?.recordId ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">
                ✓ تم تثبيت{" "}
                {RECORD_KIND_LABELS[structured.recordKind ?? ""] ??
                  structured.recordKind}{" "}
                #{structured.recordId} في قاعدة البيانات
              </p>
              <dl className="grid gap-2 text-sm">
                <PreviewRow
                  label="التصنيف"
                  value={
                    structured.flowBadge
                      ? `${structured.flowBadge.emoji} ${structured.flowBadge.labelAr}`
                      : "—"
                  }
                />
                <PreviewRow label="العنوان" value={structured.title ?? "—"} />
                <PreviewRow
                  label="البلدية"
                  value={
                    structured.communeAr
                      ? `${structured.communeAr} (${structured.commune})`
                      : (structured.commune ?? "—")
                  }
                />
                <PreviewRow label="الدائرة" value={structured.daira ?? "—"} />
                <PreviewRow label="الدوار" value={structured.village ?? "—"} />
                <PreviewRow label="الهاتف" value={structured.phone ?? "—"} />
                <PreviewRow label="الإلحاح" value={structured.urgency ?? "—"} />
              </dl>
            </div>
          ) : null}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {dispatch && (
            <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-sm font-semibold text-sky-900">
                أرسل التنبيه لفِرق الإغاثة عبر واتساب:
              </p>
              <div className="flex flex-col gap-2">
                {dispatch.whatsappTargets.length > 0 ? (
                  dispatch.whatsappTargets.map((target) => (
                    <a
                      key={target.phone}
                      href={target.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1ebe5d]"
                    >
                      <span aria-hidden>💬</span>
                      إرسال إلى {target.name}
                    </a>
                  ))
                ) : (
                  <a
                    href={dispatch.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1ebe5d]"
                  >
                    <span aria-hidden>💬</span>
                    مشاركة عبر واتساب
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              إغلاق
            </button>
            <button
              type="button"
              disabled={!rawInput.trim() || isPending || isAgentLoading}
              onClick={handleManualAgentRun}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition",
                !rawInput.trim() || isPending || isAgentLoading
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-violet-700 hover:bg-violet-800",
              )}
            >
              {isPending || isAgentLoading
                ? "جاري التحليل…"
                : "🤖 إعادة التحليل والتسجيل"}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default FeedImporterModal;

function AgentToolResultCard({ toolResult }: { toolResult: AgentToolResult }) {
  const output =
    toolResult.output && typeof toolResult.output === "object"
      ? (toolResult.output as Record<string, unknown>)
      : null;

  return (
    <div className="rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-xs text-slate-700">
      <p className="font-semibold text-sky-900">{toolResult.toolName}</p>
      {output?.success ? (
        <p className="mt-1 text-emerald-700">
          تم الحفظ — رقم النداء #{String(output.alertId)}
        </p>
      ) : (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-slate-600">
          {JSON.stringify(toolResult.output, null, 2)}
        </pre>
      )}
    </div>
  );
}

function PreviewRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={cn(
          "font-semibold text-slate-900",
          warn && "text-amber-700",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
