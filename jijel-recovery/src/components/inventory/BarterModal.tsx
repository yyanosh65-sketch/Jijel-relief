"use client";

import { MessageCircle, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import MapInspectionShell from "@/components/map/MapInspectionShell";
import type { InventoryTransfer } from "@/db/schema";
import { buildWhatsAppUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";

type BarterModalProps = {
  open: boolean;
  onClose: () => void;
};

type NewSurplusForm = {
  sourceHubName: string;
  sourceCommune: string;
  itemCategory: string;
  surplusQuantity: string;
  neededInExchange: string;
  coordinatorPhone: string;
};

function toArNumber(value: number) {
  return value.toLocaleString("ar-DZ");
}

export default function BarterModal({ open, onClose }: BarterModalProps) {
  const [records, setRecords] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const [form, setForm] = useState<NewSurplusForm>({
    sourceHubName: "",
    sourceCommune: "",
    itemCategory: "",
    surplusQuantity: "",
    neededInExchange: "",
    coordinatorPhone: "",
  });

  async function refresh() {
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/inventory/barter");
      const json = await res.json();
      if (!json?.success) {
        setSubmitError(json?.error ?? "حدث خطأ أثناء جلب البيانات.");
        return;
      }
      setRecords(json.data ?? []);
    } catch {
      setSubmitError("تعذر الاتصال بخادم البيانات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const headerWhatsAppMessage = useMemo(() => {
    const first = records[0];
    if (!first) return "";

    return [
      "السلام عليكم،",
      "نرجو تنسيق عودة القافلة بخصوص بورصة التبادل.",
      `المصدر: ${first.sourceHubName} - ${first.sourceCommune}`,
      `الصنف: ${first.itemCategory} (كمية فائض: ${toArNumber(first.surplusQuantity)})`,
      `الاحتياج: ${first.neededInExchange ?? "غير محدد"}`,
      "الرجاء تأكيد موعد/مسار العودة.",
    ].join("\n");
  }, [records]);

  function buildRecordWhatsAppMessage(r: InventoryTransfer) {
    return [
      "السلام عليكم،",
      "نرجو تنسيق عودة القافلة بخصوص بورصة التبادل.",
      `المصدر: ${r.sourceHubName} - ${r.sourceCommune}`,
      `الصنف: ${r.itemCategory} (كمية فائض: ${toArNumber(r.surplusQuantity)})`,
      `الاحتياج: ${r.neededInExchange ?? "غير محدد"}`,
      "الرجاء تأكيد موعد/مسار العودة.",
    ].join("\n");
  }

  async function claimAndOpenWhatsApp(record: InventoryTransfer) {
    const message = buildRecordWhatsAppMessage(record);
    const href = buildWhatsAppUrl(record.coordinatorPhone, message);

    if (!href) return;

    // Best-effort: mark as "matched" when user starts coordinating.
    try {
      setClaimingId(record.id);
      await fetch("/api/inventory/barter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, action: "claim" }),
      });
    } catch {
      // Ignore; still open WhatsApp.
    } finally {
      setClaimingId(null);
      // Fire-and-forget: keep UI snappy.
      void refresh();
    }

    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function submitNewSurplus() {
    setSubmitError(null);
    try {
      const surplusQuantity = Number(form.surplusQuantity);
      if (!Number.isFinite(surplusQuantity) || surplusQuantity < 0) {
        setSubmitError("كمية الفائض غير صالحة.");
        return;
      }

      const res = await fetch("/api/inventory/barter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceHubName: form.sourceHubName,
          sourceCommune: form.sourceCommune,
          itemCategory: form.itemCategory,
          surplusQuantity,
          neededInExchange: form.neededInExchange || null,
          coordinatorPhone: form.coordinatorPhone,
        }),
      });

      const json = await res.json();
      if (!json?.success) {
        setSubmitError(json?.error ?? "تعذر تسجيل الفائض.");
        return;
      }

      setRegisterOpen(false);
      setForm({
        sourceHubName: "",
        sourceCommune: "",
        itemCategory: "",
        surplusQuantity: "",
        neededInExchange: "",
        coordinatorPhone: "",
      });
      void refresh();
    } catch {
      setSubmitError("تعذر الاتصال بخادم البيانات.");
    }
  }

  if (!open) return null;

  return (
    <MapInspectionShell
      open={open}
      onClose={onClose}
      titleId="barter-exchange-title"
    >
      <header className="mb-4">
        <h2
          id="barter-exchange-title"
          className="font-[family-name:var(--font-display)] text-xl font-bold text-white"
        >
          بورصة التبادل
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          فائض متاح للتنسيق والتبادل بين المراكز.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setRegisterOpen((v) => !v)}
            className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm font-bold text-slate-100 transition hover:bg-slate-800"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              تسجيل فائض جديد
            </span>
          </button>

          {records[0]?.coordinatorPhone && headerWhatsAppMessage ? (
            <button
              type="button"
              onClick={() =>
                claimAndOpenWhatsApp(records[0])
              }
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl bg-purple-600/90 px-3 py-2 text-sm font-extrabold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-600 active:scale-[0.98]",
                claimingId === records[0]?.id && "opacity-70",
              )}
              disabled={claimingId === records[0]?.id}
              title="واتساب تنسيق القافلة"
              aria-label="واتساب تنسيق القافلة"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب تنسيق العودة
            </button>
          ) : null}
        </div>
      </header>

      {submitError ? (
        <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-xs text-rose-100">
          {submitError}
        </div>
      ) : null}

      {registerOpen ? (
        <section className="mb-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h3 className="mb-3 text-sm font-bold text-white">
            إدخال فائض جديد
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              اسم المركز/الهَب
              <input
                value={form.sourceHubName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourceHubName: e.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
                placeholder="مثال: مركز عين الصفراء..."
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300">
              البلدية (Commune)
              <input
                value={form.sourceCommune}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourceCommune: e.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
                placeholder="البلدية..."
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300">
              الصنف/الفئة
              <input
                value={form.itemCategory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, itemCategory: e.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
                placeholder="مثال: ماء / قماش / أغذية..."
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300">
              كمية الفائض
              <input
                value={form.surplusQuantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, surplusQuantity: e.target.value }))
                }
                type="number"
                min={0}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
                placeholder="0"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300 sm:col-span-2">
              الاحتياج المطلوب في التبادل
              <input
                value={form.neededInExchange}
                onChange={(e) =>
                  setForm((f) => ({ ...f, neededInExchange: e.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
                placeholder="مثال: أدوية طبية / مياه /... (نص مختصر)"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-300 sm:col-span-2">
              رقم تنسيق القافلة (هاتف/واتساب)
              <input
                value={form.coordinatorPhone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    coordinatorPhone: e.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
                placeholder="05XX XX XX XX أو +213..."
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setRegisterOpen(false)}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 transition hover:bg-slate-700"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void submitNewSurplus()}
              className="flex-1 rounded-2xl bg-emerald-600 py-2 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
            >
              تسجيل
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-xs text-slate-400">
          جاري تحميل بورصة التبادل...
        </div>
      ) : null}

      {!loading && records.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-xs text-slate-400">
          لا توجد فائض متاح حالياً.
        </div>
      ) : null}

      <div className="space-y-3">
        {records.map((r) => {
          const waHref = buildWhatsAppUrl(
            r.coordinatorPhone,
            buildRecordWhatsAppMessage(r),
          );
          return (
            <section
              key={r.id}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">المركز</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {r.sourceHubName}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    البلدية: {r.sourceCommune}
                  </p>

                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/30 p-3">
                    <p className="text-xs font-bold text-slate-200">
                      فائض متوفر
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-100">
                        {r.itemCategory}
                      </span>
                      <span className="text-sm font-extrabold text-emerald-100">
                        {toArNumber(r.surplusQuantity)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">الاحتياج في التبادل</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {r.neededInExchange ?? "غير محدد"}
                  </p>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => void claimAndOpenWhatsApp(r)}
                      disabled={!waHref || claimingId === r.id}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-600/90 px-3 py-2 text-sm font-extrabold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-600 active:scale-[0.98]",
                        (!waHref || claimingId === r.id) && "opacity-70",
                      )}
                      aria-label="فتح واتساب للتنسيق"
                      title="فتح واتساب للتنسيق"
                    >
                      <MessageCircle className="h-4 w-4" />
                      واتساب للتنسيق
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </MapInspectionShell>
  );
}

