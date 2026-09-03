"use client";

import Link from "next/link";
import {
  AlertTriangle,
  HandHeart,
  Layers,
  MapPinned,
  Truck,
} from "lucide-react";

import { Z_MAP_CTA } from "@/lib/z-index";
import { cn } from "@/lib/utils";

type MapActionDockProps = {
  onUrgentReport: () => void;
  onToggleLayers?: () => void;
  onTogglePinDrop?: () => void;
  pinDropActive?: boolean;
  layersPanelOpen?: boolean;
  className?: string;
};

function DockIcon({
  href,
  onClick,
  label,
  active,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  const className = cn(
    "flex h-11 w-11 flex-col items-center justify-center rounded-2xl border transition",
    active
      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
      : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/20 hover:bg-slate-800 hover:text-white",
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}

export default function MapActionDock({
  onUrgentReport,
  onToggleLayers,
  onTogglePinDrop,
  pinDropActive = false,
  layersPanelOpen = false,
  className,
}: MapActionDockProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-[35] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        Z_MAP_CTA,
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-3xl border border-white/10 bg-slate-950/85 p-2 shadow-2xl backdrop-blur-xl">
        <DockIcon href="/guide" label="دليل القوافل">
          <Truck className="h-5 w-5" />
        </DockIcon>
        <DockIcon href="/charities" label="مخزون الجمعيات">
          <HandHeart className="h-5 w-5" />
        </DockIcon>
        {onToggleLayers ? (
          <DockIcon
            onClick={onToggleLayers}
            label="طبقات الخريطة"
            active={layersPanelOpen}
          >
            <Layers className="h-5 w-5" />
          </DockIcon>
        ) : null}
        {onTogglePinDrop ? (
          <DockIcon
            onClick={onTogglePinDrop}
            label="تسجيل ضرر على الخريطة"
            active={pinDropActive}
          >
            <MapPinned className="h-5 w-5" />
          </DockIcon>
        ) : null}

        <button
          type="button"
          onClick={onUrgentReport}
          className="ms-auto inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-gradient-to-l from-rose-600 to-amber-600 px-4 text-sm font-extrabold text-white shadow-[0_0_24px_rgba(244,63,94,0.45)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate">نداء عاجل</span>
        </button>
      </div>
    </div>
  );
}
