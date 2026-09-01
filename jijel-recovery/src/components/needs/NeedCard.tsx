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
        "rounded-2xl border bg-white p-4 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl",
        isSelected
          ? "border-emerald-500 ring-2 ring-emerald-100"
          : "border-slate-200/90",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg"
          aria-hidden
        >
          {categoryIcon}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug text-slate-900">
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

          <NeedProgressBar
            fulfilled={need.quantityFulfilled}
            needed={need.quantityNeeded}
            size="sm"
          />

          <p className="text-xs leading-relaxed text-slate-600">{locationAr}</p>
          {need.contactName ? (
            <p className="text-[11px] text-slate-500">
              المنسق: {need.contactName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onPledge(need)}
          disabled={remaining <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          🤝 تكفل بجزء من الاحتياج
        </button>

        {coordinatorPhone ? (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${coordinatorPhone}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-800 transition hover:bg-white"
            >
              📞 اتصل بالمنسق
            </a>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
              >
                💬 واتساب
              </a>
            ) : (
              <span className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 px-2 py-2 text-xs text-slate-400">
                لا واتساب
              </span>
            )}
          </div>
        ) : null}

        {onOpenDossier ? (
          <button
            type="button"
            onClick={() => onOpenDossier(need)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            📂 ملف الدشرة والضرر
          </button>
        ) : null}

        <MarkServedControls
          needId={need.id}
          quantityNeeded={need.quantityNeeded}
          quantityFulfilled={need.quantityFulfilled}
          onSuccess={onRefresh}
        />
      </div>
    </article>
  );
}
