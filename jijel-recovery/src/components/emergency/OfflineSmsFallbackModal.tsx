"use client";

import { MessageSquareText, X } from "lucide-react";

import {
  buildEmergencySmsBody,
  buildEmergencySmsUri,
  buildHumanSmsPreview,
  cacheOfflineSubmission,
  type EmergencySmsDraft,
} from "@/lib/offline-storage";
import { MODAL_BACKDROP_CLASS } from "@/lib/z-index";
import { cn } from "@/lib/utils";

export type OfflineSmsFallbackModalProps = {
  open: boolean;
  onClose: () => void;
  draft: EmergencySmsDraft;
  /** Extra payload persisted for later Railway sync */
  payload?: unknown;
  className?: string;
};

export default function OfflineSmsFallbackModal({
  open,
  onClose,
  draft,
  payload,
  className,
}: OfflineSmsFallbackModalProps) {
  if (!open) return null;

  const preview = buildHumanSmsPreview(draft);
  const smsUri = buildEmergencySmsUri(draft);
  const compactBody = buildEmergencySmsBody(draft);

  async function handleSendSms() {
    await cacheOfflineSubmission(draft.type, {
      ...((payload && typeof payload === "object" ? payload : {}) as object),
      draft,
      smsBody: compactBody,
      queuedAt: new Date().toISOString(),
    });

    window.location.href = smsUri;
    onClose();
  }

  return (
    <div
      className={cn(MODAL_BACKDROP_CLASS, "z-[9500] items-end sm:items-center")}
      role="presentation"
    >
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-sms-title"
        className={cn(
          "w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl",
          "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p
              id="offline-sms-title"
              className="text-base font-bold text-amber-200"
            >
              📡 لا توجد تغطية إنترنت (شبكة منقطعة)
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              ما تخليش النداء يحبس. تقدر تبعث التقرير كرسالة SMS مشفرة ومجانية
              نحو مركز التنسيق الميداني بولاية جيجل.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-700 bg-slate-800/90 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <pre
          className="mb-4 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-800 bg-black/40 p-3 text-left font-mono text-[11px] leading-relaxed text-slate-200"
          dir="ltr"
        >
          {preview}
        </pre>

        <div className="flex flex-col gap-2">
          <a
            href={smsUri}
            onClick={(event) => {
              event.preventDefault();
              void handleSendSms();
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-600/90 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            <MessageSquareText className="h-4 w-4" />
            إرسال عبر الرسائل النصية SMS
          </a>
          <button
            type="button"
            onClick={() => {
              void cacheOfflineSubmission(draft.type, {
                ...((payload && typeof payload === "object"
                  ? payload
                  : {}) as object),
                draft,
                smsBody: compactBody,
                queuedAt: new Date().toISOString(),
                deferredSms: true,
              }).then(onClose);
            }}
            className="min-h-10 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            حفظ محلياً والمزامنة لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
