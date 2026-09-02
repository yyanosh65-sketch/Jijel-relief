import { cn } from "@/lib/utils";

export const glassPanelClass =
  "backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-lg rounded-2xl";

export const premiumCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/95 shadow-md backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl";

export const displayHeadingClass = "font-[family-name:var(--font-display)]";

export const selectFieldClass =
  "form-select-field min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-sm text-slate-900 font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700";

export const formInputClass =
  "form-text-field min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none";

export const formTextareaClass =
  "form-text-field w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none";

export const primaryNextButtonClass =
  "rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export const categoryButtonUnselectedClass =
  "rounded-xl border-2 border-slate-300 bg-slate-100 py-3 text-sm font-bold text-slate-800 transition-all hover:bg-slate-200";

export const categoryButtonSelectedClass =
  "rounded-xl border-2 border-emerald-700 bg-emerald-600 py-3 text-sm font-bold text-white shadow-md";

export const navQuickActionAmberClass =
  "rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100";

export const navQuickActionBlueClass =
  "rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-900 shadow-sm transition hover:bg-blue-100";

export const navQuickActionEmeraldClass =
  "rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100";

export const MAP_LAYER_LABELS = {
  needs: "حاجيات المداشر",
  sos: "نداءات الفزعة 🚨",
  roads: "حالة المسالك",
  facilities: "ديار الإغاثة والبيطرة",
  villages: "البلديات والدواوير",
  waypoints: "دليل القوافل ومحطات الطريق",
} as const;

export const MAP_LEGEND_LABELS = {
  red: "مستعجلة بزاف (لازم درك)",
  orange: "في الانتظار",
  green: "بداو فيها / قريب تفرى",
} as const;

type NeedProgressBarProps = {
  fulfilled: number;
  needed: number;
  className?: string;
  size?: "sm" | "md";
};

export function NeedProgressBar({
  fulfilled,
  needed,
  className,
  size = "md",
}: NeedProgressBarProps) {
  const progress =
    needed > 0 ? Math.min((fulfilled / needed) * 100, 100) : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-slate-600">
        تم توفير {fulfilled} من أصل {needed}
      </p>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-slate-200/80",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className="progress-bar-fill h-full rounded-full bg-emerald-600"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
