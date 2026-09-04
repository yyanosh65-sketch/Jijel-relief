"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ReliefAssistantFabProps = {
  /** Toggle smart-dispatch drawer open/closed */
  onToggle: () => void;
  /** Hide while another sheet covers the map (keep visible when agent drawer is open so it can toggle closed) */
  hidden?: boolean;
  className?: string;
};

function stopMapEventBubble(
  event: React.MouseEvent | React.PointerEvent,
) {
  event.stopPropagation();
}

/**
 * Single 48px glass FAB for Smart Dispatch.
 * Portaled to body so Leaflet / overflow parents never trap clicks or stacking.
 */
export default function ReliefAssistantFab({
  onToggle,
  hidden = false,
  className,
}: ReliefAssistantFabProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (hidden || !mounted) return null;

  return createPortal(
    <button
      type="button"
      data-ighata-assistant-fab
      onClick={(event) => {
        stopMapEventBubble(event);
        onToggle();
      }}
      onPointerDown={stopMapEventBubble}
      aria-label="مساعد الإغاثة"
      className={cn(
        "fixed bottom-24 right-4 z-[2000] flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-emerald-400 shadow-xl backdrop-blur transition hover:scale-105 active:scale-95",
        className,
      )}
    >
      🤖
    </button>,
    document.body,
  );
}
