"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  parseAndDispatchSosPost,
  previewFacebookSosPost,
  type FeedDispatchResult,
} from "@/actions/feed-importer";
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

export function FeedImporterModal({ open, onClose }: FeedImporterModalProps) {
  const [rawInput, setRawInput] = useState("");
  const [preview, setPreview] = useState<FeedParseResult | null>(null);
  const [dispatchResult, setDispatchResult] = useState<FeedDispatchResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runPreview = useCallback((text: string) => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    setPreview(parseFacebookSosPost(text));
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (rawInput.trim()) {
        void previewFacebookSosPost(rawInput).then(setPreview);
      } else {
        setPreview(null);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [rawInput, open]);

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
    setPreview(null);
    setDispatchResult(null);
    setError(null);
    onClose();
  };

  const handleDispatch = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await parseAndDispatchSosPost(rawInput);
        setDispatchResult(result);
        setPreview(result.parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذّر حفظ النداء.");
      }
    });
  };

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
              الصق نص المنشور أو رابط فيسبوك — يُستخرج الرقم والبلدية ونوع الخطر تلقائياً.
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
                setDispatchResult(null);
                runPreview(e.target.value);
              }}
              placeholder="الصق هنا منشور فيسبوك من مجموعة المجتمع المحلي…"
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-400 focus:bg-white focus:ring-2"
            />
          </div>

          {preview && (
            <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                نتيجة التحليل الفوري
              </p>
              <dl className="grid gap-2 text-sm">
                <PreviewRow
                  label="البلدية"
                  value={
                    preview.communeAr
                      ? `${preview.communeAr} (${preview.commune})`
                      : preview.commune || "غير محددة"
                  }
                  warn={!preview.matchedCommuneText}
                />
                <PreviewRow
                  label="الدائرة"
                  value={preview.dairaAr || preview.daira || "—"}
                />
                <PreviewRow
                  label="الهاتف"
                  value={preview.reporterPhone ?? "لم يُعثر على رقم"}
                  warn={!preview.reporterPhone}
                />
                <PreviewRow
                  label="نوع الخطر"
                  value={emergencyTypeLabels[preview.emergencyType]}
                />
                {preview.matchedKeywords.length > 0 && (
                  <PreviewRow
                    label="كلمات مفتاحية"
                    value={preview.matchedKeywords.join("، ")}
                  />
                )}
              </dl>
              <p className="rounded-lg bg-white/80 px-2.5 py-2 text-xs leading-relaxed text-slate-600">
                {preview.description.slice(0, 220)}
                {preview.description.length > 220 ? "…" : ""}
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {dispatchResult && (
            <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-sm font-semibold text-sky-900">
                ✓ تم حفظ النداء #{dispatchResult.alertId} على الخريطة
              </p>
              <p className="text-xs text-sky-800">
                أرسل التنبيه لفِرق الإغاثة عبر واتساب:
              </p>
              <div className="flex flex-col gap-2">
                {dispatchResult.whatsappTargets.length > 0 ? (
                  dispatchResult.whatsappTargets.map((t) => (
                    <a
                      key={t.phone}
                      href={t.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1ebe5d]"
                    >
                      <span aria-hidden>💬</span>
                      إرسال إلى {t.name}
                    </a>
                  ))
                ) : (
                  <a
                    href={dispatchResult.shareUrl}
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
              إلغاء
            </button>
            <button
              type="button"
              disabled={!rawInput.trim() || isPending}
              onClick={handleDispatch}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition",
                !rawInput.trim() || isPending
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-700",
              )}
            >
              {isPending ? "جاري الحفظ…" : "حفظ على الخريطة وإرسال"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedImporterModal;

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
