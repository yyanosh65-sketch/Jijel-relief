import { cn } from "@/lib/utils";

export const glassPanelClass =
  "backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-lg rounded-2xl";

export const MAP_LAYER_LABELS = {
  needs: "حاجيات المداشر",
  sos: "نداءات الفزعة 🚨",
  roads: "حالة المسالك",
  facilities: "ديار الإغاثة والبيطرة",
  villages: "البلديات والدواوير",
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
