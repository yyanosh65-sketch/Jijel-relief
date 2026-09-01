"use client";

import { useState } from "react";
import {
  Droplets,
  Phone,
  Shield,
  Stethoscope,
  X,
  Zap,
} from "lucide-react";

import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import {
  INFRASTRUCTURE_LABELS,
  ROAD_PASSABILITY_LABELS,
} from "@/lib/intelligence";
import { buildWhatsAppUrl, formatWhatsAppPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type VillageDossierDrawerProps = {
  dossier: VillageDossier | null;
  facilities: EmergencyFacility[];
  open: boolean;
  onClose: () => void;
};

function DamageRing({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto h-28 w-28">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#dc2626"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-red-600">{percent}%</span>
        <span className="text-[10px] text-zinc-500">أضرار</span>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}

function infrastructureTone(
  status: VillageDossier["waterStatus"],
): "green" | "amber" | "red" {
  if (status === "normal") return "green";
  if (status === "cut_off") return "red";
  return "amber";
}

function roadTone(
  passability: VillageDossier["roadPassability"],
): "green" | "amber" | "red" {
  if (passability === "open") return "green";
  if (passability === "closed") return "red";
  return "amber";
}

export default function VillageDossierDrawer({
  dossier,
  facilities,
  open,
  onClose,
}: VillageDossierDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "emergency">(
    "overview",
  );

  if (!open || !dossier) {
    return null;
  }

  const roadLabel = ROAD_PASSABILITY_LABELS[dossier.roadPassability];
  const waterLabel = INFRASTRUCTURE_LABELS[dossier.waterStatus];
  const electricityLabel = INFRASTRUCTURE_LABELS[dossier.electricityStatus];
  const coordinatorWhatsApp = buildWhatsAppUrl(
    dossier.coordinator.phone,
    `السلام، نحتاج تنسيق ميداني في ${dossier.name_ar}.`,
  );
  const coordinatorTel = `tel:${formatWhatsAppPhone(dossier.coordinator.phone)}`;

  const veterinary = facilities.filter((f) => f.type === "veterinary");
  const civilProtection = facilities.filter((f) => f.type === "civil_protection");

  return (
    <div className="fixed inset-0 z-[2500] flex justify-start">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <header className="border-b border-zinc-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-500">
                {dossier.type === "daira" ? "دائرة" : "بلدية"} ·{" "}
                {dossier.daira_ar}
              </p>
              <h2 className="text-xl font-bold text-zinc-900">
                {dossier.name_ar}
              </h2>
              <p className="text-sm text-zinc-500">{dossier.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium",
                activeTab === "overview"
                  ? "bg-emerald-700 text-white"
                  : "bg-zinc-100 text-zinc-600",
              )}
            >
              نظرة عامة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("emergency")}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium",
                activeTab === "emergency"
                  ? "bg-emerald-700 text-white"
                  : "bg-zinc-100 text-zinc-600",
              )}
            >
              خدمات الطوارئ
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "overview" ? (
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                  إحصائيات سكانية
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">السكان</p>
                    <p className="text-lg font-bold">
                      {dossier.population.toLocaleString("ar-DZ")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">العائلات</p>
                    <p className="text-lg font-bold">
                      {dossier.totalFamilies.toLocaleString("ar-DZ")}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-red-50 p-3">
                    <p className="text-xs text-red-600">عائلات متضررة</p>
                    <p className="text-lg font-bold text-red-700">
                      {dossier.affectedFamilies.toLocaleString("ar-DZ")} /{" "}
                      {dossier.totalFamilies.toLocaleString("ar-DZ")}
                    </p>
                  </div>
                </div>
              </section>

              <section className="text-center">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                  نسبة الأضرار
                </h3>
                <DamageRing percent={dossier.damagePercent} />
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                  حالة الطرق
                </h3>
                <StatusBadge
                  label={roadLabel.ar}
                  tone={roadTone(dossier.roadPassability)}
                />
                <p className="mt-1 text-xs text-zinc-500">{roadLabel.fr}</p>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                  البنية التحتية
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">الماء</span>
                    </div>
                    <StatusBadge
                      label={waterLabel.ar}
                      tone={infrastructureTone(dossier.waterStatus)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">الكهرباء</span>
                    </div>
                    <StatusBadge
                      label={electricityLabel.ar}
                      tone={infrastructureTone(dossier.electricityStatus)}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-emerald-900">
                  منسق محلي
                  {dossier.coordinator.verified ? " ✓ موثّق" : ""}
                </h3>
                <p className="font-medium text-zinc-900">
                  {dossier.coordinator.name_ar}
                </p>
                <p className="text-sm text-zinc-600">
                  {dossier.coordinator.name}
                </p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={coordinatorTel}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white py-2 text-sm font-medium text-emerald-800 shadow-sm"
                  >
                    <Phone className="h-4 w-4" />
                    اتصال
                  </a>
                  {coordinatorWhatsApp ? (
                    <a
                      href={coordinatorWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#25D366] py-2 text-sm font-medium text-white"
                    >
                      واتساب
                    </a>
                  ) : null}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <Stethoscope className="h-4 w-4" />
                  عيادات بيطرية قريبة
                </h3>
                <ul className="space-y-2">
                  {veterinary.map((facility) => (
                    <li
                      key={facility.id}
                      className="rounded-xl border border-zinc-200 p-3"
                    >
                      <p className="font-medium">{facility.name_ar}</p>
                      <p className="text-xs text-zinc-500">{facility.name}</p>
                      <a
                        href={`tel:${facility.phone}`}
                        className="mt-2 inline-flex text-sm font-semibold text-emerald-700"
                      >
                        📞 {facility.phone}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <Shield className="h-4 w-4" />
                  الحماية المدنية
                </h3>
                <ul className="space-y-2">
                  {civilProtection.map((facility) => (
                    <li
                      key={facility.id}
                      className="rounded-xl border border-zinc-200 p-3"
                    >
                      <p className="font-medium">{facility.name_ar}</p>
                      <p className="text-xs text-zinc-500">{facility.name}</p>
                      <a
                        href={`tel:${facility.phone}`}
                        className="mt-2 inline-flex text-sm font-bold text-red-700"
                      >
                        🚨 {facility.phone}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
