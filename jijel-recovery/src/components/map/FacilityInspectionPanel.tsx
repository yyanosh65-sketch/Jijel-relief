"use client";

import { Phone } from "lucide-react";

import MapInspectionShell from "@/components/map/MapInspectionShell";
import type { CommunityFacility } from "@/db/schema";

const FACILITY_TYPE_LABELS: Record<string, string> = {
  mosque_operational: "مسجد عامل 🕌",
  mosque_damaged: "مسجد متضرر 🕌",
  zawiya_sanctuary: "زاوية / ملجأ 🏛",
  water_spring: "منبع مياه 💧",
  oxygen_generator: "مولد أكسجين ⚡",
  cold_chain_pharma: "صيدلية سلسلة التبريد ❄️",
};

const FACILITY_STATUS_COLORS: Record<string, string> = {
  mosque_operational: "bg-green-600",
  mosque_damaged: "bg-red-600",
  zawiya_sanctuary: "bg-purple-600",
  water_spring: "bg-sky-600",
  oxygen_generator: "bg-amber-600",
  cold_chain_pharma: "bg-cyan-600",
};

type FacilityInspectionPanelProps = {
  facility: CommunityFacility | null;
  open: boolean;
  onClose: () => void;
};

export default function FacilityInspectionPanel({
  facility,
  open,
  onClose,
}: FacilityInspectionPanelProps) {
  if (!facility) return null;

  const typeLabel =
    FACILITY_TYPE_LABELS[facility.facilityType] ?? facility.facilityType;
  const statusColor =
    FACILITY_STATUS_COLORS[facility.facilityType] ?? "bg-slate-600";

  return (
    <MapInspectionShell open={open} onClose={onClose} titleId="facility-detail">
      <div className="space-y-4 p-4" dir="rtl">
        {/* Header */}
        <div className="space-y-1">
          <h3
            id="facility-detail"
            className="text-lg font-bold text-white"
          >
            {facility.nameAr}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${statusColor}`}
            >
              {typeLabel}
            </span>
            {facility.communeAr ? (
              <span className="text-xs text-slate-400">
                {facility.communeAr}
                {facility.daira ? ` — ${facility.daira}` : ""}
              </span>
            ) : (
              <span className="text-xs text-slate-400">{facility.commune}</span>
            )}
          </div>
        </div>

        {/* Amenities badges */}
        <div className="flex flex-wrap gap-2">
          {facility.hasPowerGenerator ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-900/60 px-2.5 py-1 text-xs font-medium text-amber-200">
              ⚡ مولد كهرباء
            </span>
          ) : null}
          {facility.hasWaterTank ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-sky-900/60 px-2.5 py-1 text-xs font-medium text-sky-200">
              💧 خزان ماء
            </span>
          ) : null}
          {facility.shelterCapacityPeople &&
          facility.shelterCapacityPeople > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-900/60 px-2.5 py-1 text-xs font-medium text-indigo-200">
              👥 سعة الإيواء: {facility.shelterCapacityPeople} شخص
            </span>
          ) : null}
        </div>

        {/* Notes */}
        {facility.notes ? (
          <p className="text-sm leading-relaxed text-slate-300">
            {facility.notes}
          </p>
        ) : null}

        {/* Call button */}
        {facility.coordinatorPhone ? (
          <a
            href={`tel:${facility.coordinatorPhone}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-green-500 active:bg-green-700"
          >
            <Phone className="h-4 w-4" />
            اتصل بالمنسق: {facility.coordinatorPhone}
          </a>
        ) : null}
      </div>
    </MapInspectionShell>
  );
}
