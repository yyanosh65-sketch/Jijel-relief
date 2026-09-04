"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Droplets,
  Mountain,
  Package,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  Stethoscope,
  Zap,
} from "lucide-react";

import ContactActionButtons from "@/components/ui/ContactActionButtons";
import MapInspectionShell from "@/components/map/MapInspectionShell";
import NavigateInMapsButton from "@/components/map/NavigateInMapsButton";
import type { MapNeed } from "@/actions/needs";
import type { VillageFieldReportTarget } from "@/lib/field-reports";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import {
  INFRASTRUCTURE_LABELS,
  ROAD_PASSABILITY_LABELS,
} from "@/lib/intelligence";
import { translateNeedTitle } from "@/lib/need-display";
import { buildWhatsAppUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { SerializedMountainTrail } from "@/lib/trail-clearance";

type VillageDossierDrawerProps = {
  dossier: VillageDossier | null;
  facilities: EmergencyFacility[];
  open: boolean;
  onClose: () => void;
  /** Active needs linked to this settlement's commune/village */
  settlementNeeds?: MapNeed[];
  /** Mountain trails leading to this settlement */
  settlementTrails?: SerializedMountainTrail[];
  /** Opens the field-report / "إضافة نداء" form */
  onOpenFieldReport?: (target: VillageFieldReportTarget) => void;
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
  settlementNeeds = [],
  settlementTrails = [],
  onOpenFieldReport,
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

  // Active (non-closed) needs linked to this settlement
  const activeNeeds = settlementNeeds.filter((n) => n.status !== "closed");

  // Build a VillageFieldReportTarget so the "إضافة نداء" button works
  const fieldReportTarget: VillageFieldReportTarget = {
    villageAr: dossier.name_ar,
    commune: dossier.name,
    communeAr: dossier.name_ar,
    daira: dossier.daira,
    dairaAr: dossier.daira_ar,
    lat: dossier.lat,
    lng: dossier.lng,
  };

  const supplyCoverage =
    dossier.totalFamilies > 0
      ? Math.round(
          ((dossier.totalFamilies - dossier.affectedFamilies) /
            dossier.totalFamilies) *
            100,
        )
      : 0;

  return (
    <MapInspectionShell
      open={open}
      onClose={onClose}
      titleId="village-dossier-title"
    >
      <header className="mb-4">
        <div>
          <p className="text-xs font-medium text-emerald-300/90">
            {dossier.type === "daira" ? "دائرة" : "بلدية"} · {dossier.daira_ar}
          </p>
          <h2
            id="village-dossier-title"
            className="font-[family-name:var(--font-display)] text-xl font-bold text-white"
          >
            {dossier.name_ar}
          </h2>
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

        {onOpenFieldReport ? (
          <button
            type="button"
            onClick={() => onOpenFieldReport(fieldReportTarget)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-gradient-to-l from-rose-600/80 to-amber-600/80 px-3 py-2.5 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            إضافة نداء في هذه القرية
          </button>
        ) : null}

        <NavigateInMapsButton
          lat={dossier.lat}
          lng={dossier.lng}
          className="mt-3"
        />

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
        <div className="space-y-3 pb-2">
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

          {/* ── Active needs in this settlement ── */}
          <MetricTile
            title={`الاحتياجات المفتوحة (${activeNeeds.length})`}
            icon={<AlertTriangle className="h-4 w-4" />}
            accent="amber"
          >
            {activeNeeds.length === 0 ? (
              <p className="text-xs text-slate-400">
                لا توجد احتياجات مفتوحة مسجّلة في هذه القرية.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeNeeds.slice(0, 6).map((need) => {
                  const remaining = Math.max(
                    0,
                    need.quantityNeeded - need.quantityFulfilled,
                  );
                  const urgencyColor =
                    need.urgency === "critical" || need.urgency === "high"
                      ? "text-rose-300"
                      : need.urgency === "medium"
                        ? "text-amber-300"
                        : "text-emerald-300";
                  return (
                    <li
                      key={need.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
                    >
                      <span
                        className={cn(
                          "truncate text-xs font-semibold",
                          urgencyColor,
                        )}
                      >
                        {translateNeedTitle(need.title)}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {remaining.toLocaleString("ar-DZ")} متبقٍ
                      </span>
                    </li>
                  );
                })}
                {activeNeeds.length > 6 ? (
                  <li className="text-[11px] text-slate-500">
                    + {activeNeeds.length - 6} احتياجات أخرى…
                  </li>
                ) : null}
              </ul>
            )}
          </MetricTile>

          {/* ── Mountain trails leading to this settlement ── */}
          {settlementTrails.length > 0 ? (
            <MetricTile
              title="المسالك الجبلية المؤدية إليها"
              icon={<Mountain className="h-4 w-4" />}
              accent="sky"
            >
              <ul className="space-y-2">
                {settlementTrails.map((trail) => {
                  const clearanceTone =
                    trail.clearanceLevel === "sedan_passable"
                      ? "green"
                      : trail.clearanceLevel === "completely_blocked"
                        ? "red"
                        : "amber";
                  const clearanceLabel: Record<string, string> = {
                    sedan_passable: "صالح للسيارات العادية",
                    high_clearance_only: "4×4 فقط",
                    strict_4x4_required: "4×4 إلزامي",
                    completely_blocked: "مقطوع",
                  };
                  return (
                    <li
                      key={trail.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
                    >
                      <span className="truncate text-xs font-semibold text-slate-200">
                        {trail.roadCode}
                      </span>
                      <StatusBadge
                        label={
                          clearanceLabel[trail.clearanceLevel] ??
                          trail.clearanceLevel
                        }
                        tone={clearanceTone}
                      />
                    </li>
                  );
                })}
              </ul>
            </MetricTile>
          ) : null}

          {/* ── Local contacts ── */}
          <MetricTile
            title="جهات الاتصال المحلية"
            icon={<Phone className="h-4 w-4" />}
            accent="slate"
          >
            <p className="mb-2 text-xs text-slate-300">
              منسق القرية: {dossier.coordinator.name_ar}
            </p>
            <ContactActionButtons
              phone={dossier.coordinator.phone}
              whatsappUrl={buildWhatsAppUrl(
                dossier.coordinator.phone,
                `السلام عليكم، نحتاج تواصل بخصوص ${dossier.name_ar}.`,
              )}
              compact
            />
          </MetricTile>
        </div>
      ) : (
        <div className="space-y-3 pb-2">
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
    </MapInspectionShell>
  );
}
