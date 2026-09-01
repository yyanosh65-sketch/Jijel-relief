"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  emergencyTypeLabels,
  parseFacebookSosPost,
  type FeedParseResult,
} from "@/lib/feed-parser";
import { cn } from "@/lib/utils";

type FeedImporterModalProps = {
  open: boolean;
  onClose: () => void;
};

type AgentToolResult = {
  toolName: string;
  output: unknown;
};

type AgentSavedAlert = {
  success: true;
  alertId: number;
  assignedLocation: {
    commune: string;
    commune_ar: string;
    daira: string;
    daira_ar: string;
    lat: number;
    lng: number;
  };
  commune: string;
  villageName: string;
  phone: string;
  damageType: string;
  description: string;
  requires4x4: boolean;
};

type AgentDispatch = {
  alertId: number;
  shareUrl: string;
  whatsappTargets: { name: string; phone: string; whatsappUrl: string }[];
};

type AgentApiResponse = {
  text?: string;
  toolResults?: AgentToolResult[];
  savedAlert?: AgentSavedAlert | null;
  dispatch?: AgentDispatch | null;
  error?: string;
};

export function FeedImporterModal({ open, onClose }: FeedImporterModalProps) {
  const [rawInput, setRawInput] = useState("");
  const [localPreview, setLocalPreview] = useState<FeedParseResult | null>(null);
  const [agentResponse, setAgentResponse] = useState<AgentApiResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const agentRequestId = useRef(0);

  const runLocalPreview = useCallback((text: string) => {
    if (!text.trim()) {
      setLocalPreview(null);
      return;
    }

    try {
      setLocalPreview(parseFacebookSosPost(text));
    } catch {
      setLocalPreview(null);
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
      const response = await fetch("/api/agent", {
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

    const timer = window.setTimeout(() => {
      runLocalPreview(rawInput);
      void runAgentAnalysis(rawInput);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [rawInput, open, runAgentAnalysis, runLocalPreview]);

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
    setLocalPreview(null);
    setAgentResponse(null);
    setError(null);
    setIsAgentLoading(false);
    onClose();
  };

  const handleManualAgentRun = () => {
    startTransition(async () => {
      await runAgentAnalysis(rawInput);
    });
  };

  const savedAlert = agentResponse?.savedAlert ?? null;
  const dispatch = agentResponse?.dispatch ?? null;
  const toolResults = agentResponse?.toolResults ?? [];

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
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">
          <div>
            <h2
              id="feed-importer-title"
              className="text-lg font-bold text-slate-900"
            >
              ⚡ استيراد نداء من فيسبوك
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              الصق المنشور — يحلله الوكيل الذكي تلقائياً ويثبت النداء في قاعدة
              البيانات عند التأكد.
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
                runLocalPreview(e.target.value);
              }}
              placeholder="الصق هنا منشور فيسبوك من مجموعة المجتمع المحلي…"
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-500/30 focus:border-violet-400 focus:bg-white focus:ring-2"
            />
          </div>

          {isAgentLoading && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
              🤖 الوكيل الذكي يحلل المنشور ويستخرج الموقع والهاتف…
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

          {savedAlert ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">
                ✓ تم تثبيت النداء #{savedAlert.alertId} عبر الوكيل الذكي
              </p>
              <dl className="grid gap-2 text-sm">
                <PreviewRow
                  label="البلدية"
                  value={`${savedAlert.assignedLocation.commune_ar} (${savedAlert.assignedLocation.commune})`}
                />
                <PreviewRow label="الدائرة" value={savedAlert.assignedLocation.daira_ar} />
                <PreviewRow label="الدوار" value={savedAlert.villageName} />
                <PreviewRow label="الهاتف" value={savedAlert.phone} />
                <PreviewRow label="نوع الضرر" value={savedAlert.damageType} />
                <PreviewRow
                  label="المسلك"
                  value={savedAlert.requires4x4 ? "طريق جبلي 4x4" : "سالك"}
                />
              </dl>
            </div>
          ) : null}

          {localPreview && !savedAlert ? (
            <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                تحليل محلي فوري (احتياطي)
              </p>
              <dl className="grid gap-2 text-sm">
                <PreviewRow
                  label="البلدية"
                  value={
                    localPreview.communeAr
                      ? `${localPreview.communeAr} (${localPreview.commune})`
                      : localPreview.commune || "غير محددة"
                  }
                  warn={!localPreview.matchedCommuneText}
                />
                <PreviewRow
                  label="الدائرة"
                  value={localPreview.dairaAr || localPreview.daira || "—"}
                />
                <PreviewRow
                  label="الهاتف"
                  value={localPreview.reporterPhone ?? "لم يُعثر على رقم"}
                  warn={!localPreview.reporterPhone}
                />
                <PreviewRow
                  label="نوع الخطر"
                  value={emergencyTypeLabels[localPreview.emergencyType]}
                />
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
                : "🤖 إعادة التحليل بالوكيل"}
            </button>
          </div>
        </div>
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
