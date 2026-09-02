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
import { MODAL_BACKDROP_CLASS, MODAL_BODY_SCROLL_CLASS, MODAL_HEADER_CLASS, MODAL_SHELL_CLASS } from "@/lib/z-index";
import { NeedProgressBar, darkFormInputClass, darkSelectClass, primaryNextButtonClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

export const PLEDGE_TYPES = [
  { value: "goods", labelAr: "مواد وعتاد" },
  { value: "financial", labelAr: "دعم مالي" },
  { value: "labor", labelAr: "يد عاملة" },
  { value: "transport", labelAr: "نقل ولوجستيك" },
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
    PLEDGE_TYPES.find((type) => type.value === form.pledgeType)?.labelAr ??
    form.pledgeType;

  return [
    "السلام عليكم،",
    `أنا ${form.contributorName}، نحب نعاون في: ${need.title}.`,
    `البلدية: ${need.location.name} — ${need.location.daira}.`,
    `الكمية: ${form.quantity} من ${need.quantityNeeded - need.quantityFulfilled} المتبقية.`,
    `نوع المساهمة: ${pledgeTypeLabel}.`,
    `هاتفي: ${form.contributorContact}.`,
    "شكراً.",
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
    PLEDGE_TYPES.find((type) => type.value === form.pledgeType)?.labelAr ??
    form.pledgeType;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!need) {
      return;
    }

    setError(null);

    if (!isValidAlgerianPhone(form.contributorContact)) {
      setError(`رقم جزائري غير صالح — ${formatAlgerianPhoneHint()}`);
      return;
    }

    const quantity = Number(form.quantity);

    if (!quantity || quantity <= 0 || quantity > remaining) {
      setError("الكمية غير صالحة.");
      return;
    }

    setIsSubmitting(true);

    const result = await createPledge({
      needId: need.id,
      contributorName: form.contributorName.trim(),
      contributorContact: form.contributorContact.trim(),
      quantity,
      notes: `نوع المساهمة: ${pledgeTypeLabel}`,
      status: "pending",
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر تسجيل المساهمة.");
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
    <div
      dir="rtl"
      className={MODAL_BACKDROP_CLASS}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pledge-modal-title"
        className={cn(MODAL_SHELL_CLASS, "max-w-md")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={MODAL_HEADER_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="pledge-modal-title" className="text-lg font-bold text-white">
                نعاون في هاد الخير
              </h2>
              <p className="mt-1 text-sm text-slate-300">{need.title}</p>
              <p className="text-xs text-slate-400">
                {need.location.name} — {need.location.daira}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {isCompleted ? (
          <div className={MODAL_BODY_SCROLL_CLASS}>
            <p className="text-sm font-medium text-emerald-300">
              تسجّل تعاونك بنجاح — بارك الله فيك!
            </p>
            {whatsappUrl ? (
              <>
                <p className="text-sm text-slate-300">
                  تواصل مباشرة مع المنسق عبر واتساب.
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white hover:bg-[#1ebe5d]"
                >
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </a>
              </>
            ) : (
              <p className="text-sm text-slate-300">
                ما كاينش رقم واتساب للمنسق حالياً.
              </p>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className={MODAL_BODY_SCROLL_CLASS}>
              <NeedProgressBar
                fulfilled={need.quantityFulfilled}
                needed={need.quantityNeeded}
              />
              <p className="text-xs text-slate-400">
                باقي {remaining} وحدة للتكفّل الكامل
              </p>

              <div>
                <label htmlFor="contributorName" className="mb-1 block text-sm font-medium text-slate-200">
                  الاسم الكامل
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
                  className={darkFormInputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="contributorContact"
                  className="mb-1 block text-sm font-medium text-slate-200"
                >
                  رقم الهاتف
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
                  className={darkFormInputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-slate-200">
                    الكمية
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
                    className={darkFormInputClass}
                  />
                </div>

                <div>
                  <label htmlFor="pledgeType" className="mb-1 block text-sm font-medium text-slate-200">
                    نوع المساهمة
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
                    className={darkSelectClass}
                  >
                    {PLEDGE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error ? (
                <p className="text-sm text-rose-300">{error}</p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-5">
              <button
                type="submit"
                disabled={isSubmitting || remaining <= 0}
                className={cn(primaryNextButtonClass, "flex w-full items-center justify-center gap-2")}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  "نعاون في هاد الخير"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
