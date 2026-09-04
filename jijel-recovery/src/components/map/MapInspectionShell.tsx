"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { MAP_BACKGROUND_CLICK_EVENT } from "@/components/map/MapClickHandler";
import { Z_MODAL } from "@/lib/z-index";
import { cn } from "@/lib/utils";

type SnapState = "peek" | "expanded";

type MapInspectionShellProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
  className?: string;
  /** Start in peek (28dvh) on mobile; desktop always full card */
  initialSnap?: SnapState;
};

/**
 * Mobile: bottom sheet with peek (28dvh) / expanded (75dvh) snap points.
 * Peek leaves most of the map visible and does not block map interaction.
 * Desktop (md+): floating side card.
 */
export default function MapInspectionShell({
  open,
  onClose,
  titleId,
  children,
  className,
  initialSnap = "peek",
}: MapInspectionShellProps) {
  const [snap, setSnap] = useState<SnapState>(initialSnap);
  const dragStartY = useRef<number | null>(null);
  const dragDelta = useRef(0);

  useEffect(() => {
    if (open) {
      setSnap(initialSnap);
    }
  }, [open, initialSnap]);

  // Empty map canvas tap → snap to peek (keep sheet usable, clear overlap)
  useEffect(() => {
    if (!open) return;

    function onMapBackgroundClick() {
      setSnap("peek");
    }

    window.addEventListener(MAP_BACKGROUND_CLICK_EVENT, onMapBackgroundClick);
    return () => {
      window.removeEventListener(
        MAP_BACKGROUND_CLICK_EVENT,
        onMapBackgroundClick,
      );
    };
  }, [open]);

  const expand = useCallback(() => setSnap("expanded"), []);
  const collapse = useCallback(() => setSnap("peek"), []);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragDelta.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current == null) return;
    dragDelta.current = e.clientY - dragStartY.current;
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (dragStartY.current == null) return;
    const delta = dragDelta.current;
    dragStartY.current = null;
    dragDelta.current = 0;

    if (delta < -40) {
      setSnap("expanded");
    } else if (delta > 40) {
      if (snap === "peek") {
        onClose();
      } else {
        setSnap("peek");
      }
    }
  }, [onClose, snap]);

  if (!open) {
    return null;
  }

  const isPeek = snap === "peek";

  return (
    <div
      className={cn(
        "fixed inset-0",
        Z_MODAL,
        isPeek ? "pointer-events-none md:pointer-events-auto" : "",
      )}
      role="presentation"
    >
      <button
        type="button"
        aria-label="إغلاق"
        className={cn(
          "absolute inset-0 transition-colors",
          isPeek
            ? "pointer-events-none bg-transparent md:pointer-events-auto md:bg-black/40"
            : "pointer-events-auto bg-black/50 backdrop-blur-[2px] md:bg-black/40",
        )}
        onClick={() => {
          if (isPeek) {
            onClose();
          } else {
            collapse();
          }
        }}
      />

      <aside
        dir="rtl"
        role="dialog"
        aria-modal={!isPeek}
        aria-labelledby={titleId}
        className={cn(
          "pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-3xl border-t border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur-xl transition-[max-height] duration-300 ease-out",
          "pb-safe",
          isPeek ? "inspection-shell-peek" : "inspection-shell-expanded",
          "md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:max-h-[calc(100vh-6rem)] md:w-96 md:rounded-2xl md:border md:border-slate-700 md:bg-slate-900/90 md:pb-0 md:shadow-2xl",
          className,
        )}
      >
        <div
          className="shrink-0 touch-none px-5 pt-3 md:pt-4"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <button
            type="button"
            className="mb-3 mx-auto block h-1.5 w-12 rounded-full bg-slate-500/80 shadow-inner md:hidden"
            aria-label={isPeek ? "توسيع اللوحة" : "تصغير اللوحة"}
            onClick={() => setSnap(isPeek ? "expanded" : "peek")}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-slate-800/90 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              aria-label="إغلاق اللوحة"
            >
              <X className="h-5 w-5" />
            </button>
            {isPeek ? (
              <button
                type="button"
                onClick={expand}
                className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-300 md:hidden"
              >
                توسيع
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "inspection-shell-scroll min-h-0 flex-1 overflow-x-hidden overscroll-contain px-5 pb-5",
            isPeek ? "overflow-y-hidden" : "overflow-y-auto",
          )}
        >
          {children}
        </div>
      </aside>
    </div>
  );
}
