"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";

import { createPledge } from "@/actions/pledges";
import type { MapNeed } from "@/actions/needs";
import {
  buildWhatsAppUrl,
  formatAlgerianPhoneHint,
  isValidAlgerianPhone,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

export const PLEDGE_TYPES = [
  { value: "goods", labelFr: "Matériel / Biens", labelAr: "مواد" },
  { value: "financial", labelFr: "Soutien financier", labelAr: "دعم مالي" },
  { value: "labor", labelFr: "Main-d'œuvre", labelAr: "عمل / يد عاملة" },
  { value: "transport", labelFr: "Transport / Logistique", labelAr: "نقل" },
] as const;

export type PledgeType = (typeof PLEDGE_TYPES)[number]["value"];

type PledgeModalProps = {
  need: MapNeed | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type FormState = {
  contributorName: string;
  contributorContact: string;
  quantity: string;
  pledgeType: PledgeType;
};

const INITIAL_FORM: FormState = {
  contributorName: "",
  contributorContact: "",
  quantity: "1",
  pledgeType: "goods",
};

function buildPledgeWhatsAppMessage(
  need: MapNeed,
  form: FormState,
): string {
  const pledgeTypeLabel =
    PLEDGE_TYPES.find((type) => type.value === form.pledgeType)?.labelFr ??
    form.pledgeType;

  return [
    "Salam,",
    `Ana ${form.contributorName} n3awen f had l7aja: ${need.title}.`,
    `Commune: ${need.location.name} (${need.location.daira}).`,
    `Quantité: ${form.quantity} / ${need.quantityNeeded - need.quantityFulfilled} restant.`,
    `Type: ${pledgeTypeLabel}.`,
    `Tel donateur: ${form.contributorContact}.`,
    "Merci!",
  ].join("\n");
}

export default function PledgeModal({
  need,
  open,
  onClose,
  onSuccess,
}: PledgeModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setError(null);
      setWhatsappUrl(null);
      setIsCompleted(false);
      setIsSubmitting(false);
    }
  }, [open, need?.id]);

  if (!open || !need) {
    return null;
  }

  const remaining = need.quantityNeeded - need.quantityFulfilled;
  const pledgeTypeLabel =
    PLEDGE_TYPES.find((type) => type.value === form.pledgeType)?.labelFr ??
    form.pledgeType;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!need) {
      return;
    }

    setError(null);

    if (!isValidAlgerianPhone(form.contributorContact)) {
      setError(
        "رقم جزائري غالط — Numéro algérien invalide (05/06/07 ou +213).",
      );
      return;
    }

    const quantity = Number(form.quantity);

    if (!quantity || quantity <= 0 || quantity > remaining) {
      setError("الكمية غالطة — Quantité invalide.");
      return;
    }

    setIsSubmitting(true);

    const result = await createPledge({
      needId: need.id,
      contributorName: form.contributorName.trim(),
      contributorContact: form.contributorContact.trim(),
      quantity,
      notes: `Pledge type: ${pledgeTypeLabel}`,
      status: "pending",
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر إرسال التعهد — Échec de l'engagement.");
      return;
    }

    if (need.contactPhone) {
      const url = buildWhatsAppUrl(
        need.contactPhone,
        buildPledgeWhatsAppMessage(need, form),
      );
      setWhatsappUrl(url);
    } else {
      setWhatsappUrl(null);
    }

    setIsCompleted(true);
  }

  function handleClose() {
    if (isCompleted) {
      onSuccess?.();
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pledge-modal-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 id="pledge-modal-title" className="text-lg font-semibold text-zinc-900">
              Adopt / Pledge
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{need.title}</p>
            <p className="text-xs text-zinc-500">
              {need.location.name} · {need.location.daira}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isCompleted ? (
          <div className="space-y-4 px-5 py-6">
            <p className="text-sm font-medium text-emerald-700">
              تم تسجيل التعهد بنجاح — Engagement enregistré!
            </p>
            {whatsappUrl ? (
              <>
                <p className="text-sm text-zinc-600">
                  تواصل مباشرة مع المستفيد عبر واتساب — Contactez le bénéficiaire
                  sur WhatsApp.
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white hover:bg-[#1ebe5d]"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </>
            ) : (
              <p className="text-sm text-zinc-600">
                ما كاينش رقم واتساب للمستفيد — Aucun téléphone bénéficiaire
                disponible.
              </p>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              إغلاق / Fermer
            </button>
          </div>
        ) : (
          <form className="space-y-4 px-5 py-6" onSubmit={handleSubmit}>
            <div className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              {need.quantityFulfilled} / {need.quantityNeeded} fulfilled ·{" "}
              {remaining} remaining
            </div>

            <div>
              <label htmlFor="contributorName" className="mb-1 block text-sm font-medium">
                الاسم / Nom du donateur
              </label>
              <input
                id="contributorName"
                required
                value={form.contributorName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contributorName: event.target.value,
                  }))
                }
                className="min-h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="contributorContact"
                className="mb-1 block text-sm font-medium"
              >
                الهاتف / Téléphone
              </label>
              <input
                id="contributorContact"
                required
                type="tel"
                inputMode="tel"
                placeholder={formatAlgerianPhoneHint()}
                value={form.contributorContact}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contributorContact: event.target.value,
                  }))
                }
                className="min-h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
                  الكمية / Quantité
                </label>
                <input
                  id="quantity"
                  required
                  type="number"
                  min={1}
                  max={remaining}
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="pledgeType" className="mb-1 block text-sm font-medium">
                  النوع / Type
                </label>
                <select
                  id="pledgeType"
                  value={form.pledgeType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pledgeType: event.target.value as PledgeType,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  {PLEDGE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.labelAr} — {type.labelFr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || remaining <= 0}
              className={cn(
                "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                "تعهد / Confirmer le pledge"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
