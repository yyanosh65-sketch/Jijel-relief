"use client";

import { X } from "lucide-react";

import { Z_MODAL } from "@/lib/z-index";
import { cn } from "@/lib/utils";

type MapInspectionShellProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Mobile: slide-up bottom sheet. Desktop (md+): floating side card.
 * Covers the bottom dock via z-50 and safe-area padding.
 */
export default function MapInspectionShell({
  open,
  onClose,
  titleId,
  children,
  className,
}: MapInspectionShellProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={cn("fixed inset-0", Z_MODAL)} role="presentation">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] md:bg-black/40"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[75dvh] flex-col rounded-t-3xl border-t border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur-xl",
          "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:max-h-[calc(100vh-6rem)] md:w-96 md:rounded-2xl md:border md:border-slate-700 md:bg-slate-900/90 md:pb-0 md:shadow-2xl",
          className,
        )}
      >
        <div className="shrink-0 px-5 pt-3 md:pt-4">
          <div className="mb-3 mx-auto h-1 w-12 rounded-full bg-slate-600 md:hidden" />
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-slate-800/90 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              aria-label="إغلاق اللوحة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="inspection-shell-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {children}
        </div>
      </aside>
    </div>
  );
}
