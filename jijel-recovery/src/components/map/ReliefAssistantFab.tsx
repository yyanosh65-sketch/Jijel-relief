"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import { AMI_RABAH } from "@/lib/agent/ami-rabah-persona";
import { cn } from "@/lib/utils";

type ReliefAssistantFabProps = {
  onToggle: () => void;
  hidden?: boolean;
  className?: string;
};

function stopMapEventBubble(
  event: React.MouseEvent | React.PointerEvent,
) {
  event.stopPropagation();
}

/**
 * Ami Rabah FAB — elder scout badge above the bottom dock.
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
      aria-label={AMI_RABAH.fullTitleAr}
      title={AMI_RABAH.fullTitleAr}
      className={cn(
        "fixed bottom-24 right-4 z-[2000] flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-slate-900/90 text-xl shadow-xl backdrop-blur transition hover:scale-105 active:scale-95",
        className,
      )}
    >
      <span className="relative leading-none">
        {AMI_RABAH.avatar}
        <span className="absolute -bottom-1 -left-1 text-[10px]">
          {AMI_RABAH.scout}
        </span>
      </span>
    </button>,
    document.body,
  );
}
