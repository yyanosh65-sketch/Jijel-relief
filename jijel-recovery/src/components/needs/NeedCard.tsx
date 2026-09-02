"use client";

import type { MapNeed } from "@/actions/needs";
import {
  formatNeedLocationArabic,
  getNeedCategoryIcon,
  getNeedRoadBadge,
  getNeedUrgencyBadge,
  translateNeedTitle,
} from "@/lib/need-display";
import { buildWhatsAppLink } from "@/lib/phone";
import { NeedProgressBar } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";
import MarkServedControls from "@/components/needs/MarkServedControls";

type NeedCardProps = {
  need: MapNeed;
  onPledge: (need: MapNeed) => void;
  onOpenDossier?: (need: MapNeed) => void;
  onRefresh?: () => void;
  isSelected?: boolean;
};

export default function NeedCard({
  need,
  onPledge,
  onOpenDossier,
  onRefresh,
  isSelected,
}: NeedCardProps) {
  const remaining = need.quantityNeeded - need.quantityFulfilled;
  const titleAr = translateNeedTitle(need.title);
  const locationAr = formatNeedLocationArabic(need);
  const urgencyBadge = getNeedUrgencyBadge(need.urgency);
  const roadBadge = getNeedRoadBadge(need);
  const categoryIcon = getNeedCategoryIcon(need);
  const coordinatorPhone = need.contactPhone ?? "";
  const whatsappUrl = coordinatorPhone
    ? buildWhatsAppLink(need.contactWhatsapp ?? coordinatorPhone)
    : null;

  return (
    <article
      dir="rtl"
      className={cn(
        "overflow-hidden rounded-2xl border bg-slate-900/80 shadow-md backdrop-blur-sm transition-all duration-200",
        isSelected
          ? "border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-slate-800/80 hover:border-slate-700",
      )}
    >
      <header className="border-b border-slate-800/80 bg-slate-950/60 px-4 py-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg"
            aria-hidden
          >
            {categoryIcon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-extrabold leading-snug text-white">
                {titleAr}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    urgencyBadge.className,
                  )}
                >
                  {urgencyBadge.label}
                </span>
                {roadBadge ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      roadBadge.className,
                    )}
                  >
                    {roadBadge.label}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-1.5 inline-flex rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200">
              {locationAr}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 py-3">
        {need.contactName ? (
          <p className="text-xs text-slate-400">
            المنسق:{" "}
            <span className="font-semibold text-slate-200">
              {need.contactName}
            </span>
          </p>
        ) : null}

        {coordinatorPhone ? (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${coordinatorPhone}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              📞 اتصل بالمنسق
            </a>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-600/15 px-2 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-600/25"
              >
                💬 واتساب
              </a>
            ) : (
              <span className="flex items-center justify-center rounded-xl border border-dashed border-slate-700 px-2 py-2 text-xs text-slate-500">
                لا واتساب
              </span>
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onPledge(need)}
          disabled={remaining <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          🤝 تكفل بجزء من الاحتياج
        </button>

        {onOpenDossier ? (
          <button
            type="button"
            onClick={() => onOpenDossier(need)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            📂 ملف الدشرة والضرر
          </button>
        ) : null}
      </div>

      <footer className="space-y-3 border-t border-slate-800/80 bg-slate-950/50 px-4 py-3">
        <NeedProgressBar
          fulfilled={need.quantityFulfilled}
          needed={need.quantityNeeded}
          size="sm"
          className="[&_p]:text-slate-400"
        />
        <MarkServedControls
          needId={need.id}
          quantityNeeded={need.quantityNeeded}
          quantityFulfilled={need.quantityFulfilled}
          onSuccess={onRefresh}
          variant="card"
        />
      </footer>
    </article>
  );
}
