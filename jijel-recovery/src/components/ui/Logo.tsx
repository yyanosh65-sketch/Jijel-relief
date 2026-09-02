import { useId } from "react";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: number;
  showWordmark?: boolean;
};

export default function Logo({
  className,
  size = 40,
  showWordmark = false,
}: LogoProps) {
  const uid = useId().replace(/:/g, "");
  const mountainFillId = `jijel-mountain-${uid}`;
  const sproutFillId = `jijel-sprout-${uid}`;

  const glyphSize = Math.round(size * 0.62);

  return (
    <div className={cn("relative inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
          "border border-emerald-400/30 bg-gradient-to-br from-emerald-500 via-emerald-700 to-emerald-950",
          "shadow-[inset_0_1px_0_rgb(167_243_208_/_0.35),0_4px_14px_rgb(2_44_34_/_0.45)]",
          "ring-1 ring-emerald-300/15",
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="إغاثة جيجل"
          className="relative z-[1] drop-shadow-sm"
          shapeRendering="geometricPrecision"
        >
          <defs>
            <linearGradient id={mountainFillId} x1="4" y1="18" x2="28" y2="30">
              <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id={sproutFillId} x1="14" y1="12" x2="20" y2="24">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
          </defs>

          {/* الهلال — رمز التضامن الإنساني */}
          <path
            d="M21.2 6.8C16.4 5.2 11.6 8.4 10.2 13.1C8.8 17.8 11.2 22.8 15.6 24.8C13.2 24.2 11.6 21.8 11.6 19.1C11.6 15.2 14.8 11.8 18.8 11.2C17.4 9.4 18.8 7.4 21.2 6.8Z"
            fill="#ffffff"
          />

          {/* قمم جبال جيجل */}
          <path
            d="M3 26.5L9.2 17.8L14.2 22.4L19.6 14.6L24.8 19.8L29 26.5H3Z"
            fill={`url(#${mountainFillId})`}
          />
          <path
            d="M9.2 17.8L14.2 22.4L19.6 14.6"
            stroke="#ecfdf5"
            strokeOpacity="0.35"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />

          {/* برعم إعادة الإعمار — غابات وقرى */}
          <path
            d="M16.4 22.6V17.2"
            stroke={`url(#${sproutFillId})`}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16.4 18.4C14.2 17.2 12.8 15.4 13.2 13.6C14.8 14.6 15.8 16 16.4 18.4Z"
            fill="#ffffff"
          />
          <path
            d="M16.4 18.4C18.6 17.2 20 15.4 19.6 13.6C18 14.6 17 16 16.4 18.4Z"
            fill="#d1fae5"
          />
          <ellipse cx="16.4" cy="23.2" rx="2.1" ry="0.9" fill="#34d399" />
        </svg>
      </span>

      {showWordmark ? (
        <div className="relative leading-tight">
          <p className="text-sm font-extrabold text-white">إغاثة جيجل</p>
          <p className="text-[10px] font-semibold tracking-wide text-emerald-300/90">
            Jijel Relief
          </p>
        </div>
      ) : null}
    </div>
  );
}
