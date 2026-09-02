import { cn } from "@/lib/utils";

type SpiritualCalloutProps = {
  verse: string;
  className?: string;
  variant?: "emerald" | "amber" | "subtle";
};

const VARIANT_CLASS = {
  emerald:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  subtle:
    "border-slate-700/60 bg-slate-900/50 text-slate-300 backdrop-blur-md",
} as const;

export default function SpiritualCallout({
  verse,
  className,
  variant = "subtle",
}: SpiritualCalloutProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        "rounded-xl border px-4 py-2.5 text-center text-xs font-semibold leading-relaxed tracking-wide sm:text-sm",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {verse}
    </div>
  );
}
