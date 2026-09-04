"use client";

import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";

type ReliefAssistantFabProps = {
  onOpen: () => void;
  /** Hide while the drawer is open or another sheet covers the map */
  hidden?: boolean;
  className?: string;
};

/**
 * Single floating glass trigger for Smart Dispatch / غرفة التوجيه.
 * Anchored above the bottom dock so the map stays clear when collapsed.
 */
export default function ReliefAssistantFab({
  onOpen,
  hidden = false,
  className,
}: ReliefAssistantFabProps) {
  if (hidden) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-24 right-4 z-[36] pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label="مساعد الإغاثة"
        title="مساعد الإغاثة — غرفة التوجيه الذكي"
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-slate-950/80 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.35)] backdrop-blur-xl transition hover:border-emerald-300/60 hover:bg-emerald-950/70 hover:text-white active:scale-95"
      >
        <span className="sr-only">مساعد الإغاثة</span>
        <Bot className="h-6 w-6" aria-hidden />
        <span
          aria-hidden
          className="absolute -bottom-5 whitespace-nowrap rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold text-emerald-200/90 backdrop-blur"
        >
          🤖 مساعد الإغاثة
        </span>
      </button>
    </div>
  );
}
