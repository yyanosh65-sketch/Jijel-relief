"use client";

import {
  DEFAULT_WILAYA,
  WILAYA_CODES,
  WILAYA_DEFINITIONS,
  type WilayaCode,
} from "@/lib/wilaya";
import { darkSelectClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type WilayaCommuneFieldsProps = {
  wilaya: WilayaCode;
  onWilayaChange: (code: WilayaCode) => void;
  commune: string;
  onCommuneChange: (communeName: string) => void;
  className?: string;
  required?: boolean;
};

/**
 * Cascading wilaya → commune selectors for intake / volunteer forms.
 */
export default function WilayaCommuneFields({
  wilaya,
  onWilayaChange,
  commune,
  onCommuneChange,
  className,
  required = true,
}: WilayaCommuneFieldsProps) {
  const communes = WILAYA_DEFINITIONS[wilaya]?.communes ?? [];

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)} dir="rtl">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-300">
          الولاية
        </label>
        <select
          required={required}
          value={wilaya}
          onChange={(e) => {
            const next = (e.target.value as WilayaCode) || DEFAULT_WILAYA;
            onWilayaChange(next);
            onCommuneChange("");
          }}
          className={darkSelectClass}
        >
          {WILAYA_CODES.map((code) => (
            <option key={code} value={code}>
              {WILAYA_DEFINITIONS[code].labelPillAr}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-300">
          البلدية
        </label>
        <select
          required={required}
          value={commune}
          onChange={(e) => onCommuneChange(e.target.value)}
          className={darkSelectClass}
        >
          <option value="">اختر البلدية</option>
          {communes.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.nameAr}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
