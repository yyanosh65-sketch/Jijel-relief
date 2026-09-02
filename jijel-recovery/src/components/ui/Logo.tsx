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
  const fillId = `jijel-shield-fill-${uid}`;
  const strokeId = `jijel-shield-stroke-${uid}`;

  return (
    <div className={cn("relative inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="absolute inset-0 m-auto h-[88%] w-[88%] animate-ping rounded-full bg-emerald-400/25"
      />
      <span
        aria-hidden
        className="absolute inset-0 m-auto h-[72%] w-[72%] rounded-full bg-emerald-500/20 blur-[2px]"
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="إغاثة جيجل"
        className="relative shrink-0 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]"
      >
        <defs>
          <linearGradient id={fillId} x1="8" y1="4" x2="40" y2="44">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id={strokeId} x1="10" y1="6" x2="38" y2="42">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <path
          d="M24 3.5L8.5 10.2v12.4c0 9.8 6.2 18.9 15.5 21.9 9.3-3 15.5-12.1 15.5-21.9V10.2L24 3.5Z"
          fill={`url(#${fillId})`}
          stroke={`url(#${strokeId})`}
          strokeWidth="1.5"
        />
        <circle cx="36" cy="10" r="3.2" fill="#f43f5e" className="logo-beacon" />
        <circle cx="36" cy="10" r="5.5" stroke="#fb7185" strokeWidth="1" opacity="0.55" />
        <path
          d="M24 11v14"
          stroke="#ecfdf5"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M17 18h14"
          stroke="#ecfdf5"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="31.5" r="2.2" fill="#ecfdf5" />
      </svg>

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
