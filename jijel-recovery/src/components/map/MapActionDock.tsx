"use client";

import Link from "next/link";
import {
  AlertTriangle,
  HandHeart,
  ArrowLeftRight,
  Layers,
  MapPinned,
  Phone,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type MapActionDockProps = {
  onUrgentReport: () => void;
  onToggleLayers?: () => void;
  onTogglePinDrop?: () => void;
  onOpenGlobalAgent?: () => void;
  onOpenBarter?: () => void;
  onOpenEmergencyDial?: () => void;
  onOpenVolunteerRegister?: () => void;
  pinDropActive?: boolean;
  layersPanelOpen?: boolean;
  /** Hide when an inspection sheet is open (sheet covers dock at z-50) */
  hidden?: boolean;
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
    "flex h-10 w-10 flex-col items-center justify-center rounded-2xl border transition md:h-11 md:w-11",
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
  onOpenGlobalAgent,
  onOpenBarter,
  onOpenEmergencyDial,
  onOpenVolunteerRegister,
  pinDropActive = false,
  layersPanelOpen = false,
  hidden = false,
  className,
}: MapActionDockProps) {
  if (hidden) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className={cn(
        "pointer-events-none fixed bottom-4 left-1/2 z-30 -translate-x-1/2 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-1.5 shadow-2xl backdrop-blur-xl">
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

        {onOpenGlobalAgent ? (
          <button
            type="button"
            onClick={onOpenGlobalAgent}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600/90 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 backdrop-blur transition-transform hover:bg-purple-600 active:scale-95"
            title="مساعد الإغاثة الذكي"
            aria-label="مساعد الإغاثة الذكي"
          >
            <Sparkles className="h-4 w-4 animate-pulse text-purple-200" />
            <span className="hidden sm:inline">مساعد الإغاثة</span>
          </button>
        ) : null}

        {onOpenBarter ? (
          <DockIcon onClick={onOpenBarter} label="بورصة التبادل">
            <ArrowLeftRight className="h-5 w-5" />
          </DockIcon>
        ) : null}

        {onOpenVolunteerRegister ? (
          <DockIcon
            onClick={onOpenVolunteerRegister}
            label="تسجيل أسطول ومتطوعين"
          >
            <Users className="h-5 w-5 text-emerald-300" />
          </DockIcon>
        ) : null}

        {onOpenEmergencyDial ? (
          <button
            type="button"
            onClick={onOpenEmergencyDial}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-400/50 bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.55)] transition hover:bg-rose-500 active:scale-95 md:h-11 md:w-11"
            aria-label="اتصال طوارئ مباشر"
            title="اتصال طوارئ (14 / 1055)"
          >
            <Phone className="h-5 w-5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onUrgentReport}
          className="ms-1 inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-gradient-to-l from-rose-600 to-amber-600 px-3 text-sm font-extrabold text-white shadow-[0_0_24px_rgba(244,63,94,0.45)] transition hover:brightness-110 active:scale-[0.98] md:min-h-11 md:px-4"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate">نداء عاجل</span>
        </button>
      </div>
    </div>
  );
}
