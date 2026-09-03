"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Phone, Users } from "lucide-react";

import type { ActiveResponder, ResponderRole, ResponderStatus } from "@/db/schema";
import OfflineSmsFallbackModal from "@/components/emergency/OfflineSmsFallbackModal";
import type { ResponderUpdatePayload } from "@/lib/responder-events";
import {
  RESPONDER_ROLE_LABELS,
  RESPONDER_STATUS_LABELS,
} from "@/lib/responders";
import {
  isBrowserOffline,
  isLikelyNetworkError,
  type EmergencySmsDraft,
} from "@/lib/offline-storage";
import { buildWhatsAppUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";

type FieldCoordinationPanelProps = {
  needId?: number | null;
  settlementId?: number | null;
  locationLabel?: string;
  onResponderCreated?: (row: ActiveResponder) => void;
};

const ROLE_OPTIONS: ResponderRole[] = [
  "doctor",
  "paramedic",
  "psychologist",
  "food_distribution",
  "clearing_debris",
  "logistics_driver",
  "general_volunteer",
];

function normalizeRow(payload: ResponderUpdatePayload): ActiveResponder {
  return {
    ...payload,
    checkedInAt:
      typeof payload.checkedInAt === "string"
        ? new Date(payload.checkedInAt)
        : payload.checkedInAt,
  };
}

export default function FieldCoordinationPanel({
  needId,
  settlementId,
  locationLabel,
  onResponderCreated,
}: FieldCoordinationPanelProps) {
  const [responders, setResponders] = useState<ActiveResponder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ResponderRole>("general_volunteer");
  const [status, setStatus] = useState<ResponderStatus>("on_site");
  const [etaMinutes, setEtaMinutes] = useState("30");
  const [organizationName, setOrganizationName] = useState("");
  const [suppliesBrought, setSuppliesBrought] = useState("");
  const [smsDraft, setSmsDraft] = useState<EmergencySmsDraft | null>(null);
  const [smsPayload, setSmsPayload] = useState<unknown>(null);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (needId) params.set("needId", String(needId));
    if (settlementId) params.set("settlementId", String(settlementId));
    return params.toString();
  }, [needId, settlementId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!needId && !settlementId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/responders?${query}`);
        const json = (await response.json()) as {
          success?: boolean;
          data?: ResponderUpdatePayload[];
        };
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setResponders(
            json.data
              .map(normalizeRow)
              .filter((row) => row.status !== "completed"),
          );
        }
      } catch {
        if (!cancelled) setError("تعذر تحميل فرق التدخل.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [needId, settlementId, query]);

  useEffect(() => {
    if (!needId && !settlementId) return;

    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("responder_update", (event) => {
      try {
        const payload = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as ResponderUpdatePayload;
        const matchesNeed = needId && payload.needId === needId;
        const matchesSettlement =
          settlementId && payload.settlementId === settlementId;
        if (!matchesNeed && !matchesSettlement) return;

        const row = normalizeRow(payload);
        setResponders((current) => {
          const without = current.filter((item) => item.id !== row.id);
          if (row.status === "completed") return without;
          return [row, ...without];
        });
      } catch {
        // ignore
      }
    });

    return () => source.close();
  }, [needId, settlementId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formBody = {
      fullName,
      phone,
      role,
      status,
      organizationName: organizationName || null,
      needId: needId ?? null,
      settlementId: settlementId ?? null,
      etaMinutes: status === "en_route" ? Number(etaMinutes) || null : null,
      suppliesBrought: suppliesBrought || null,
    };

    const offlineDraft: EmergencySmsDraft = {
      type: "CHECKIN",
      locationCodeOrName: locationLabel || String(settlementId ?? needId ?? "جيجل"),
      urgency: status,
      contactPhone: phone || "unknown",
    };

    if (isBrowserOffline()) {
      setSmsDraft(offlineDraft);
      setSmsPayload({ form: formBody, draft: offlineDraft });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/responders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formBody),
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: ResponderUpdatePayload;
      };

      if (!response.ok || !json.success || !json.data) {
        setError(json.error ?? "تعذر التسجيل.");
        return;
      }

      const row = normalizeRow(json.data);
      setResponders((current) => [row, ...current.filter((r) => r.id !== row.id)]);
      onResponderCreated?.(row);
      setSuccess("تسجّل تواجدك — بارك الله فيك.");
      setFormOpen(false);
      setFullName("");
      setPhone("");
      setSuppliesBrought("");
      setOrganizationName("");
    } catch (submitError) {
      if (isLikelyNetworkError(submitError)) {
        setSmsDraft(offlineDraft);
        setSmsPayload({ form: formBody, draft: offlineDraft });
        return;
      }
      setError("فشل الاتصال بالخادم.");
    } finally {
      setSubmitting(false);
    }
  }

  const active = responders.filter((r) => r.status !== "completed");

  return (
    <section className="mt-4 space-y-3 rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-300" />
          <h3 className="text-sm font-bold text-white">فرق التدخل الميداني</h3>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
          شكون راهو تم؟ · {active.length}
        </span>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحميل...
        </p>
      ) : active.length === 0 ? (
        <p className="text-xs text-slate-400">
          ما كاش فريق مسجّل تم دوكا — كون أول واحد يعلن تواجده.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((responder) => {
            const wa = buildWhatsAppUrl(
              responder.phone,
              `السلام، بخصوص التنسيق الميداني${locationLabel ? ` في ${locationLabel}` : ""} — أنا في الطريق/الموقع.`,
            );

            return (
              <li
                key={responder.id}
                className="rounded-xl border border-white/5 bg-black/25 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {responder.fullName}
                    </p>
                    {responder.organizationName ? (
                      <p className="text-[11px] text-slate-400">
                        {responder.organizationName}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-100">
                      {RESPONDER_ROLE_LABELS[responder.role]}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        responder.status === "on_site"
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100"
                          : "border-amber-500/30 bg-amber-500/15 text-amber-100",
                      )}
                    >
                      {RESPONDER_STATUS_LABELS[responder.status]}
                      {responder.status === "en_route" && responder.etaMinutes
                        ? ` · ${responder.etaMinutes} د`
                        : ""}
                    </span>
                  </div>
                </div>
                {responder.suppliesBrought ? (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    يجيب معاه: {responder.suppliesBrought}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <a
                    href={`tel:${responder.phone}`}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white"
                  >
                    <Phone className="h-3.5 w-3.5" /> اتصال
                  </a>
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#25D366] px-2 py-1.5 text-[11px] font-bold text-white"
                    >
                      واتساب
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {success ? (
        <p className="text-xs font-semibold text-emerald-300">{success}</p>
      ) : null}
      {error ? <p className="text-xs font-semibold text-rose-300">{error}</p> : null}

      {!formOpen ? (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="w-full rounded-xl border border-rose-400/40 bg-gradient-to-l from-rose-600 to-amber-600 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-rose-900/30"
        >
          أنا رايح نعاون تم
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <p className="text-xs font-bold text-slate-200">
            تسجيل سريع (أقل من 10 ثواني)
          </p>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم الكامل"
            className="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white"
          />
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الهاتف"
            className="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ResponderRole)}
            className="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white"
          >
            {ROLE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {RESPONDER_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus("on_site")}
              className={cn(
                "rounded-xl border py-2 text-xs font-bold",
                status === "on_site"
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-300",
              )}
            >
              في الميدان
            </button>
            <button
              type="button"
              onClick={() => setStatus("en_route")}
              className={cn(
                "rounded-xl border py-2 text-xs font-bold",
                status === "en_route"
                  ? "border-amber-500 bg-amber-600 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-300",
              )}
            >
              في الطريق
            </button>
          </div>
          {status === "en_route" ? (
            <input
              type="number"
              min={5}
              max={600}
              value={etaMinutes}
              onChange={(e) => setEtaMinutes(e.target.value)}
              placeholder="الوصول بعد (دقائق)"
              className="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white"
            />
          ) : null}
          <input
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="الجمعية / المنظمة (اختياري)"
            className="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white"
          />
          <input
            value={suppliesBrought}
            onChange={(e) => setSuppliesBrought(e.target.value)}
            placeholder="واش تجيب معاك؟ (اختياري)"
            className="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-bold text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              تأكيد التواجد
            </button>
          </div>
        </form>
      )}

      {smsDraft ? (
        <OfflineSmsFallbackModal
          open
          draft={smsDraft}
          payload={smsPayload}
          onClose={() => {
            setSmsDraft(null);
            setSmsPayload(null);
          }}
        />
      ) : null}
    </section>
  );
}
