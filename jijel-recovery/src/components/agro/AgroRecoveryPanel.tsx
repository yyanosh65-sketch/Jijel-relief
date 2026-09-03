"use client";

import { Sprout, Bird, Wheat, Droplets, Syringe, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import MapInspectionShell from "@/components/map/MapInspectionShell";
import type { AgroCategory } from "@/db/schema";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

type AggregateRow = {
  category: AgroCategory;
  totalQuantity: number;
  pledgeCount: number;
};

type RecentPledge = {
  id: number;
  donorOrganization: string;
  donorWilaya: string;
  category: AgroCategory;
  quantityOffered: number;
  targetCommune: string | null;
  contactPhone: string;
  status: string;
  createdAt: string;
};

type ApiData = {
  aggregates: AggregateRow[];
  recent: RecentPledge[];
};

type FormState = {
  donorOrganization: string;
  donorWilaya: string;
  category: AgroCategory;
  quantityOffered: string;
  targetCommune: string;
  contactPhone: string;
};

// ─── category meta ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  AgroCategory,
  { labelAr: string; unit: string; icon: React.ReactNode; color: string }
> = {
  olive_saplings: {
    labelAr: "غراسة الزيتون",
    unit: "شتلة",
    icon: <Sprout className="h-5 w-5" />,
    color: "emerald",
  },
  beehives: {
    labelAr: "خلايا النحل",
    unit: "خلية",
    icon: <Bird className="h-5 w-5" />,
    color: "amber",
  },
  livestock_feed_hay: {
    labelAr: "علف المواشي (دريس)",
    unit: "بالة",
    icon: <Wheat className="h-5 w-5" />,
    color: "yellow",
  },
  irrigation_hoses: {
    labelAr: "أنابيب السقي",
    unit: "متر",
    icon: <Droplets className="h-5 w-5" />,
    color: "sky",
  },
  veterinary_supplies: {
    labelAr: "مستلزمات بيطرية",
    unit: "مجموعة",
    icon: <Syringe className="h-5 w-5" />,
    color: "rose",
  },
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_META) as [
  AgroCategory,
  (typeof CATEGORY_META)[AgroCategory],
][];

const ALL_WILAYAS = [
  "جيجل", "سكيكدة", "بجاية", "قسنطينة", "ميلة", "عنابة",
  "سطيف", "برج بوعريريج", "المسيلة", "باتنة", "الجزائر",
  "أخرى",
];

const INITIAL_FORM: FormState = {
  donorOrganization: "",
  donorWilaya: "",
  category: "olive_saplings",
  quantityOffered: "",
  targetCommune: "",
  contactPhone: "",
};

// ─── helper ───────────────────────────────────────────────────────────────────

function colorClasses(color: string) {
  const map: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
    emerald: { border: "border-emerald-500/30", bg: "bg-emerald-950/40", text: "text-emerald-100", iconBg: "bg-emerald-500/20" },
    amber:   { border: "border-amber-500/30",   bg: "bg-amber-950/40",   text: "text-amber-100",   iconBg: "bg-amber-500/20"   },
    yellow:  { border: "border-yellow-500/30",  bg: "bg-yellow-950/40",  text: "text-yellow-100",  iconBg: "bg-yellow-500/20"  },
    sky:     { border: "border-sky-500/30",     bg: "bg-sky-950/40",     text: "text-sky-100",     iconBg: "bg-sky-500/20"     },
    rose:    { border: "border-rose-500/30",    bg: "bg-rose-950/40",    text: "text-rose-100",    iconBg: "bg-rose-500/20"    },
  };
  return map[color] ?? map.emerald;
}

// ─── component ────────────────────────────────────────────────────────────────

export type AgroFocusTag = "olive" | "livestock";

type AgroRecoveryPanelProps = {
  open: boolean;
  onClose: () => void;
  /** Which tag was tapped — controls which metrics are highlighted */
  focusTag?: AgroFocusTag;
};

export default function AgroRecoveryPanel({
  open,
  onClose,
  focusTag,
}: AgroRecoveryPanelProps) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  // Derive highlighted categories from the tag that triggered the panel
  const highlighted: Set<AgroCategory> = new Set(
    focusTag === "olive"
      ? (["olive_saplings"] as AgroCategory[])
      : focusTag === "livestock"
        ? (["beehives", "livestock_feed_hay", "veterinary_supplies"] as AgroCategory[])
        : [],
  );

  async function fetchData() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/agro");
      const json = await res.json();
      if (!json?.success) {
        setFetchError(json?.error ?? "خطأ في جلب البيانات.");
        return;
      }
      setData(json.data as ApiData);
    } catch {
      setFetchError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => { void fetchData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function submitPledge() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const qty = Number(form.quantityOffered);
      if (!Number.isFinite(qty) || qty <= 0) {
        setSubmitError("الكمية غير صالحة.");
        return;
      }

      const res = await fetch("/api/agro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorOrganization: form.donorOrganization,
          donorWilaya: form.donorWilaya,
          category: form.category,
          quantityOffered: qty,
          targetCommune: form.targetCommune || null,
          contactPhone: form.contactPhone,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setSubmitError(json?.error ?? "تعذر التسجيل.");
        return;
      }
      setSubmitSuccess(true);
      setForm(INITIAL_FORM);
      setFormOpen(false);
      void fetchData();
    } catch {
      setSubmitError("تعذر الاتصال بالخادم.");
    } finally {
      setSubmitting(false);
    }
  }

  function patch(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (!open) return null;

  return (
    <MapInspectionShell
      open={open}
      onClose={onClose}
      titleId="agro-recovery-title"
    >
      <header className="mb-4">
        <h2
          id="agro-recovery-title"
          className="font-[family-name:var(--font-display)] text-xl font-bold text-white"
        >
          الاسترداد الزراعي والرعوي
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          تعهدات الجمعيات والتعاونيات الفلاحية لإعادة تشجير وتربية المواشي.
        </p>

        {submitSuccess ? (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-200">
            ✓ تم تسجيل تعهدك بنجاح. شكراً على دعمك!
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => { setFormOpen((v) => !v); setSubmitSuccess(false); }}
          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-sm font-bold text-emerald-100 transition hover:bg-emerald-600/30"
        >
          <Plus className="h-4 w-4" />
          تسجيل تعهد جديد (متبرع / تعاونية)
        </button>
      </header>

      {/* ── Pledge intake form ── */}
      {formOpen ? (
        <section className="mb-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h3 className="mb-3 text-sm font-bold text-white">بيانات التعهد</h3>

          {submitError ? (
            <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-950/30 p-2 text-xs text-rose-200">
              {submitError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-slate-300 sm:col-span-2">
              اسم المتبرع / المنظمة / التعاونية
              <input
                value={form.donorOrganization}
                onChange={(e) => patch("donorOrganization", e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                placeholder="مثال: تعاونية شباب الغابة..."
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300">
              الولاية المانحة
              <select
                value={form.donorWilaya}
                onChange={(e) => patch("donorWilaya", e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
              >
                <option value="">— اختر الولاية —</option>
                {ALL_WILAYAS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300">
              الصنف
              <select
                value={form.category}
                onChange={(e) => patch("category", e.target.value as AgroCategory)}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
              >
                {CATEGORY_OPTIONS.map(([cat, meta]) => (
                  <option key={cat} value={cat}>{meta.labelAr}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300">
              الكمية المقدمة
              <input
                value={form.quantityOffered}
                onChange={(e) => patch("quantityOffered", e.target.value)}
                type="number"
                min={1}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                placeholder="0"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300">
              البلدية المستهدفة (اختياري)
              <input
                value={form.targetCommune}
                onChange={(e) => patch("targetCommune", e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                placeholder="البلدية..."
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300 sm:col-span-2">
              رقم التواصل (هاتف / واتساب)
              <input
                value={form.contactPhone}
                onChange={(e) => patch("contactPhone", e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                placeholder="05XX XX XX XX أو +213..."
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-800 py-2 text-sm font-bold text-slate-100 transition hover:bg-slate-700"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void submitPledge()}
              disabled={submitting}
              className={cn(
                "flex-1 rounded-2xl bg-emerald-600 py-2 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500",
                submitting && "opacity-70",
              )}
            >
              {submitting ? "جاري التسجيل..." : "تسجيل التعهد"}
            </button>
          </div>
        </section>
      ) : null}

      {/* ── Error / loading ── */}
      {fetchError ? (
        <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-xs text-rose-200">
          {fetchError}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-xs text-slate-400">
          جاري تحميل بيانات الاسترداد...
        </div>
      ) : null}

      {/* ── Metric counters ── */}
      {!loading && data ? (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            مجاميع التعهدات حسب الصنف
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {data.aggregates.map((row) => {
              const meta = CATEGORY_META[row.category as AgroCategory];
              if (!meta) return null;
              const cls = colorClasses(meta.color);
              const isHighlighted = highlighted.has(row.category as AgroCategory);

              return (
                <div
                  key={row.category}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-4 transition",
                    cls.border,
                    cls.bg,
                    isHighlighted && "ring-2 ring-white/20",
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      cls.iconBg,
                      cls.text,
                    )}
                  >
                    {meta.icon}
                  </div>

                  {/* Label + pledge count */}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-bold", cls.text)}>
                      {meta.labelAr}
                    </p>
                    <p className="text-xs text-slate-400">
                      {row.pledgeCount} تعهد مسجّل
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="shrink-0 text-right">
                    <p className={cn("text-2xl font-black tabular-nums", cls.text)}>
                      {row.totalQuantity.toLocaleString("ar-DZ")}
                    </p>
                    <p className="text-[11px] text-slate-400">{meta.unit}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Recent pledges collapsible ledger ── */}
      {!loading && data && data.recent.length > 0 ? (
        <section className="mt-4">
          <button
            type="button"
            onClick={() => setShowRecent((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-900/60"
          >
            <span>آخر التعهدات المسجّلة ({data.recent.length})</span>
            {showRecent ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showRecent ? (
            <div className="mt-2 space-y-2">
              {data.recent.map((pledge) => {
                const meta = CATEGORY_META[pledge.category];
                return (
                  <div
                    key={pledge.id}
                    className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {pledge.donorOrganization}
                        </p>
                        <p className="text-xs text-slate-400">
                          {pledge.donorWilaya}
                          {pledge.targetCommune
                            ? ` ← ${pledge.targetCommune}`
                            : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-extrabold text-white">
                          {pledge.quantityOffered.toLocaleString("ar-DZ")}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {meta?.unit ?? ""}
                        </p>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {meta?.labelAr ?? pledge.category}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </MapInspectionShell>
  );
}
