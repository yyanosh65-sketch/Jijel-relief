"use client";

import { Phone, X } from "lucide-react";

import {
  MODAL_BACKDROP_CLASS,
  MODAL_BODY_SCROLL_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_SHELL_CLASS,
} from "@/lib/z-index";
import { cn } from "@/lib/utils";

const EMERGENCY_HOTLINES = [
  {
    number: "14",
    labelAr: "الحماية المدنية",
    note: "إطفاء · إنقاذ · إسعاف",
  },
  {
    number: "1021",
    labelAr: "الشرطة الجزائرية",
    note: "أمن حضري وطوارئ",
  },
  {
    number: "1055",
    labelAr: "الدرك الوطني",
    note: "مناطق ريفية وجبلية",
  },
  {
    number: "1548",
    labelAr: "الرقم الأخضر للطوارئ",
    note: "توجيه نحو الجهات المختصة",
  },
] as const;

type EmergencySpeedDialModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function EmergencySpeedDialModal({
  open,
  onClose,
}: EmergencySpeedDialModalProps) {
  if (!open) return null;

  return (
    <div className={MODAL_BACKDROP_CLASS} onClick={onClose}>
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-speed-dial-title"
        className={cn(MODAL_SHELL_CLASS, "max-w-sm")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={MODAL_HEADER_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="emergency-speed-dial-title"
                className="flex items-center gap-2 text-base font-bold text-white"
              >
                <Phone className="h-5 w-5 text-rose-400" />
                اتصال طوارئ مباشر
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                أرقام الجزائر الوطنية — اضغط للاتصال فوراً
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className={cn(MODAL_BODY_SCROLL_CLASS, "space-y-2")}>
          {EMERGENCY_HOTLINES.map((line) => (
            <a
              key={line.number}
              href={`tel:${line.number}`}
              className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 transition hover:border-rose-400/50 hover:bg-rose-900/40 active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-lg font-black text-white shadow-lg shadow-rose-900/40">
                📞
              </span>
              <span className="min-w-0 flex-1 text-right">
                <span className="block text-sm font-bold text-white">
                  {line.labelAr}
                </span>
                <span className="block text-[11px] text-rose-200/80">
                  {line.note}
                </span>
              </span>
              <span
                className="shrink-0 rounded-lg bg-slate-900/80 px-2.5 py-1 font-mono text-sm font-bold text-rose-200"
                dir="ltr"
              >
                {line.number}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
