"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { useEmergencyNotificationStream } from "@/hooks/useEmergencyNotificationStream";
import { getCommuneArabicName } from "@/lib/locations";

function formatBannerLine(alert: {
  title: string;
  commune: string;
  communeAr: string | null;
  village: string | null;
  phone: string | null;
  facebookUrl: string | null;
}): string {
  const communeLabel = alert.communeAr ?? getCommuneArabicName(alert.commune);
  const villageLabel = alert.village ?? communeLabel;
  const phonePart = alert.phone ? ` — 📞 ${alert.phone}` : "";
  const facebookPart = alert.facebookUrl ? " — 🔗 رابط فيسبوك" : "";
  return `[عاجل] ${villageLabel} (${communeLabel}): ${alert.title}${facebookPart}${phonePart}`;
}

type EmergencyAlertBannerProps = {
  floating?: boolean;
};

export default function EmergencyAlertBanner({
  floating = false,
}: EmergencyAlertBannerProps) {
  const liveAlerts = useEmergencyNotificationStream();
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  const activeAlert = useMemo(
    () => liveAlerts.find((alert) => !dismissedIds.includes(alert.id)) ?? null,
    [dismissedIds, liveAlerts],
  );

  if (!activeAlert) {
    return null;
  }

  const communeLabel =
    activeAlert.communeAr ?? getCommuneArabicName(activeAlert.commune);
  const charitiesHref = `/charities?commune=${encodeURIComponent(activeAlert.commune)}`;

  return (
    <div
      dir="rtl"
      className={
        floating
          ? "pointer-events-auto fixed top-0 inset-x-0 z-[40] border-b border-rose-400/40 bg-gradient-to-l from-rose-800 via-rose-700 to-amber-700 text-white shadow-lg"
          : "relative z-[2950] border-b border-rose-400/40 bg-gradient-to-l from-rose-800 via-rose-700 to-amber-700 text-white shadow-lg"
      }
    >
      <div className="border-b border-white/10 bg-black/15 px-4 py-1 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-rose-50/90 sm:text-xs">
          « وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ » — نداء ميداني عاجل
        </p>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="animate-pulse text-xs font-bold uppercase tracking-wide text-red-100">
            تنبيه طوارئ مباشر
          </p>
          <div className="mt-1 overflow-hidden whitespace-nowrap">
            <p className="inline-block animate-[marquee_28s_linear_infinite] text-sm font-extrabold">
              {formatBannerLine(activeAlert)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {activeAlert.facebookUrl ? (
            <a
              href={activeAlert.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
            >
              🔗 فيسبوك
            </a>
          ) : null}
          <Link
            href={charitiesHref}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-rose-800 transition-colors hover:bg-rose-50"
          >
            توجيه نداء للجمعيات القريبة
          </Link>
          <button
            type="button"
            onClick={() =>
              setDismissedIds((current) => [...current, activeAlert.id])
            }
            className="rounded-lg p-1.5 hover:bg-white/15"
            aria-label="إخفاء التنبيه"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <span className="sr-only">{communeLabel}</span>
    </div>
  );
}
