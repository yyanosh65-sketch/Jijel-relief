"use client";

import { useState } from "react";
import {
  Droplets,
  Package,
  Shield,
  ShieldCheck,
  Stethoscope,
  X,
  Zap,
} from "lucide-react";

import ContactActionButtons from "@/components/ui/ContactActionButtons";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import {
  INFRASTRUCTURE_LABELS,
  ROAD_PASSABILITY_LABELS,
} from "@/lib/intelligence";
import { buildWhatsAppUrl } from "@/lib/phone";
import { Z_MODAL } from "@/lib/z-index";
import { cn } from "@/lib/utils";

type VillageDossierDrawerProps = {
  dossier: VillageDossier | null;
  facilities: EmergencyFacility[];
  open: boolean;
  onClose: () => void;
};

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const tones = {
    green: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    amber: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    red: "bg-rose-500/20 text-rose-200 border-rose-400/30",
    blue: "bg-sky-500/20 text-sky-200 border-sky-400/30",
    slate: "bg-slate-700/60 text-slate-300 border-slate-600/50",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
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

function MetricTile({
  title,
  icon,
  children,
  accent = "slate",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: "slate" | "emerald" | "amber" | "sky";
}) {
  const accents = {
    slate: "border-slate-700/80 bg-slate-950/70",
    emerald: "border-emerald-500/30 bg-emerald-950/40",
    amber: "border-amber-500/30 bg-amber-950/40",
    sky: "border-sky-500/30 bg-sky-950/40",
  };

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 shadow-lg shadow-black/20",
        accents[accent],
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-100">
          {icon}
        </span>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
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

  const veterinary = facilities.filter((f) => f.type === "veterinary");
  const civilProtection = facilities.filter((f) => f.type === "civil_protection");
  const supplyCoverage =
    dossier.totalFamilies > 0
      ? Math.round(
          ((dossier.totalFamilies - dossier.affectedFamilies) /
            dossier.totalFamilies) *
            100,
        )
      : 0;

  return (
    <div className={cn("fixed inset-0", Z_MODAL)}>
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="village-dossier-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-700 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-4 mx-auto h-1.5 w-12 rounded-full bg-slate-600" />

        <header className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-emerald-300/90">
                {dossier.type === "daira" ? "دائرة" : "بلدية"} ·{" "}
                {dossier.daira_ar}
              </p>
              <h2
                id="village-dossier-title"
                className="font-[family-name:var(--font-display)] text-xl font-bold text-white"
              >
                {dossier.name_ar}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-slate-800/80 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/60 px-3 py-2.5">
            <span className="text-sm font-semibold text-slate-200">
              حالة المسلك
            </span>
            <StatusBadge
              label={roadLabel.ar}
              tone={roadTone(dossier.roadPassability)}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
                activeTab === "overview"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700",
              )}
            >
              نظرة عامة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("emergency")}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
                activeTab === "emergency"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700",
              )}
            >
              خدمات الطوارئ
            </button>
          </div>
        </header>

        {activeTab === "overview" ? (
          <div className="space-y-3 pb-6">
            <MetricTile
              title="البنية التحتية"
              icon={<Zap className="h-4 w-4" />}
              accent="amber"
            >
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <Droplets className="h-4 w-4 text-sky-400" />
                    الماء
                  </div>
                  <StatusBadge
                    label={waterLabel.ar}
                    tone={infrastructureTone(dossier.waterStatus)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <Zap className="h-4 w-4 text-amber-400" />
                    الكهرباء
                  </div>
                  <StatusBadge
                    label={electricityLabel.ar}
                    tone={infrastructureTone(dossier.electricityStatus)}
                  />
                </div>
              </div>
            </MetricTile>

            <MetricTile
              title="الإمدادات والأضرار"
              icon={<Package className="h-4 w-4" />}
              accent="sky"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <p className="text-[11px] text-slate-400">السكان</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {dossier.population.toLocaleString("ar-DZ")}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <p className="text-[11px] text-slate-400">العائلات</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {dossier.totalFamilies.toLocaleString("ar-DZ")}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-rose-300">
                        عائلات متضررة
                      </p>
                      <p className="mt-1 text-lg font-bold text-rose-100">
                        {dossier.affectedFamilies.toLocaleString("ar-DZ")} /{" "}
                        {dossier.totalFamilies.toLocaleString("ar-DZ")}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] text-slate-400">نسبة الأضرار</p>
                      <p className="text-2xl font-extrabold text-rose-300">
                        {dossier.damagePercent}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(0, supplyCoverage)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    تغطية تقديرية غير متضررة: {supplyCoverage}%
                  </p>
                </div>
              </div>
            </MetricTile>

            <MetricTile
              title="جهة تنسيق موثّقة"
              icon={<ShieldCheck className="h-4 w-4" />}
              accent="emerald"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-white">
                  {dossier.coordinator.name_ar}
                </p>
                {dossier.coordinator.verified ? (
                  <StatusBadge label="موثّق ✓" tone="green" />
                ) : (
                  <StatusBadge label="غير موثّق" tone="slate" />
                )}
              </div>
              <ContactActionButtons
                phone={dossier.coordinator.phone}
                whatsappUrl={coordinatorWhatsApp}
                className="mt-3"
              />
            </MetricTile>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            <MetricTile
              title="عيادات بيطرية قريبة"
              icon={<Stethoscope className="h-4 w-4" />}
            >
              <ul className="space-y-2">
                {veterinary.length === 0 ? (
                  <li className="text-xs text-slate-400">
                    لا توجد عيادات بيطرية مسجّلة في النطاق القريب.
                  </li>
                ) : null}
                {veterinary.map((facility) => (
                  <li
                    key={facility.id}
                    className="rounded-xl border border-white/5 bg-black/20 p-3"
                  >
                    <p className="font-medium text-white">{facility.name_ar}</p>
                    <ContactActionButtons
                      phone={facility.phone}
                      whatsappUrl={buildWhatsAppUrl(
                        facility.phone,
                        `السلام، نحتاج مساعدة بيطرية في ${dossier.name_ar}.`,
                      )}
                      className="mt-2"
                      compact
                    />
                  </li>
                ))}
              </ul>
            </MetricTile>

            <MetricTile
              title="الحماية المدنية"
              icon={<Shield className="h-4 w-4" />}
            >
              <ul className="space-y-2">
                {civilProtection.length === 0 ? (
                  <li className="text-xs text-slate-400">
                    لا توجد وحدات حماية مدنية قريبة مسجّلة.
                  </li>
                ) : null}
                {civilProtection.map((facility) => (
                  <li
                    key={facility.id}
                    className="rounded-xl border border-white/5 bg-black/20 p-3"
                  >
                    <p className="font-medium text-white">{facility.name_ar}</p>
                    <ContactActionButtons
                      phone={facility.phone}
                      whatsappUrl={buildWhatsAppUrl(
                        facility.phone,
                        `نداء استغاثة — ${dossier.name_ar}`,
                      )}
                      className="mt-2"
                      compact
                    />
                  </li>
                ))}
              </ul>
            </MetricTile>
          </div>
        )}
      </aside>
    </div>
  );
}
