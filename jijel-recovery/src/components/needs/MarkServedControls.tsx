"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { updateNeedFulfillment } from "@/actions/needs";
import { cn } from "@/lib/utils";

type MarkServedControlsProps = {
  needId: number;
  quantityNeeded: number;
  quantityFulfilled: number;
  onSuccess?: () => void;
  compact?: boolean;
};

export default function MarkServedControls({
  needId,
  quantityNeeded,
  quantityFulfilled,
  onSuccess,
  compact = false,
}: MarkServedControlsProps) {
  const [quantity, setQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const remaining = quantityNeeded - quantityFulfilled;

  if (remaining <= 0 || success) {
    return success ? (
      <p className="text-xs font-semibold text-emerald-300">
        ✅ تم التكفل بالحالة بنجاح
      </p>
    ) : null;
  }

  async function handleAddQuantity() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateNeedFulfillment({
      needId,
      quantityToAdd: Number(quantity),
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر التحديث.");
      return;
    }

    setSuccess(true);
    onSuccess?.();
  }

  async function handleMarkComplete() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateNeedFulfillment({
      needId,
      markComplete: true,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر التحديث.");
      return;
    }

    setSuccess(true);
    onSuccess?.();
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-slate-700/80 bg-slate-900/60 p-2.5",
        compact ? "text-xs" : "text-sm",
      )}
    >
      <p className="font-bold text-emerald-200">تم التكفل بالحالة</p>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={remaining}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-slate-100"
        />
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAddQuantity()}
          className="flex-1 rounded-lg border border-emerald-600/50 bg-emerald-600/20 px-2 py-1.5 font-bold text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "+ كمية"}
        </button>
      </div>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleMarkComplete()}
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        تم التكفل بالحالة (مغطى بالكامل)
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
