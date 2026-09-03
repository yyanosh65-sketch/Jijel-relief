"use client";

import { Package, Phone, X } from "lucide-react";

import type { MapNeed } from "@/actions/needs";
import ContactActionButtons from "@/components/ui/ContactActionButtons";
import { findVillageByName } from "@/lib/locations";
import {
  resolveLocationMapDetails,
  ROAD_ACCESSIBILITY_LABELS,
} from "@/lib/map-location-display";
import { clampJijelLandCoordinates } from "@/lib/geo";
import { translateNeedTitle } from "@/lib/need-display";
import { buildWhatsAppUrl } from "@/lib/phone";
import { Z_MODAL } from "@/lib/z-index";
import { cn } from "@/lib/utils";

type NeedInspectionDrawerProps = {
  need: MapNeed | null;
  open: boolean;
  onClose: () => void;
  onPledge: (need: MapNeed) => void;
  onOpenSettlement?: (need: MapNeed) => void;
};

export default function NeedInspectionDrawer({
  need,
  open,
  onClose,
  onPledge,
  onOpenSettlement,
}: NeedInspectionDrawerProps) {
  if (!open || !need) {
    return null;
  }

  const villageRecord = findVillageByName(need.location.name);
  const communeKey = villageRecord
    ? villageRecord.commune
    : (need.location.address ?? need.location.name);
  const mapDetails = resolveLocationMapDetails(
    communeKey,
    villageRecord?.daira ?? need.location.daira ?? "",
    villageRecord?.name_ar,
  );
  const { lat, lng } = clampJijelLandCoordinates(need.lat, need.lng);
  const remaining = Math.max(0, need.quantityNeeded - need.quantityFulfilled);
  const whatsappUrl = need.contactPhone
    ? buildWhatsAppUrl(
        need.contactPhone,
        [
          "السلام عليكم،",
          `حاب نتكفّل بالاحتياج: ${need.title}`,
          `البلدية: ${need.location.address ?? need.location.name}`,
        ].join("\n"),
      )
    : null;

  const urgencyTone =
    need.urgency === "critical" || need.urgency === "high"
      ? "rose"
      : need.urgency === "medium"
        ? "amber"
        : "emerald";

  return (
    <div className={cn("fixed inset-0", Z_MODAL)}>
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="need-inspection-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-700 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-4 mx-auto h-1.5 w-12 rounded-full bg-slate-600" />

        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-400">
              {mapDetails.communeAr}
              {mapDetails.dairaAr ? ` · ${mapDetails.dairaAr}` : ""}
            </p>
            <h2
              id="need-inspection-title"
              className="font-[family-name:var(--font-display)] text-xl font-bold text-white"
            >
              {translateNeedTitle(need.title)}
            </h2>
            <span
              className={cn(
                "mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                urgencyTone === "rose" &&
                  "border-rose-400/40 bg-rose-500/20 text-rose-100",
                urgencyTone === "amber" &&
                  "border-amber-400/40 bg-amber-500/20 text-amber-100",
                urgencyTone === "emerald" &&
                  "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
              )}
            >
              {need.urgency === "critical"
                ? "عاجل جداً"
                : need.urgency === "high"
                  ? "عاجل"
                  : need.urgency === "medium"
                    ? "متوسط"
                    : "عادي"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-slate-800/80 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-3 pb-6">
          <section className="rounded-2xl border border-sky-500/30 bg-sky-950/40 p-4 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-100">
                <Package className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-white">الإمدادات</h3>
            </div>
            <p className="text-xs text-slate-300">
              تم توفير {need.quantityFulfilled} من أصل {need.quantityNeeded}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{
                  width: `${
                    need.quantityNeeded > 0
                      ? Math.min(
                          (need.quantityFulfilled / need.quantityNeeded) * 100,
                          100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              المتبقي: {remaining.toLocaleString("ar-DZ")}
            </p>
          </section>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-100">
                <Phone className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-white">
                جهة تنسيق موثّقة
              </h3>
            </div>
            {need.contactPhone ? (
              <ContactActionButtons
                phone={need.contactPhone}
                whatsappUrl={whatsappUrl}
              />
            ) : (
              <p className="text-xs text-slate-400">لا يوجد رقم منسّق مسجّل.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4">
            <p className="text-xs text-slate-400">الموقع</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {villageRecord?.name_ar ?? need.location.name}
            </p>
            {mapDetails.roadAccessibility ? (
              <p className="mt-1 text-xs text-slate-400">
                المسلك: {ROAD_ACCESSIBILITY_LABELS[mapDetails.roadAccessibility]}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-slate-500" dir="ltr">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                onPledge(need);
                onClose();
              }}
              className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
            >
              نعاون في هاد الخير
            </button>
            {onOpenSettlement ? (
              <button
                type="button"
                onClick={() => {
                  onOpenSettlement(need);
                  onClose();
                }}
                className="flex-1 rounded-2xl border border-white/10 bg-slate-800 py-3 text-sm font-bold text-slate-100 transition hover:bg-slate-700"
              >
                ملف البلدية
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
