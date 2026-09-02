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
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="إغاثة جيجل"
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="jijel-shield-fill" x1="8" y1="4" x2="40" y2="44">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="jijel-shield-stroke" x1="10" y1="6" x2="38" y2="42">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <path
          d="M24 3.5L8.5 10.2v12.4c0 9.8 6.2 18.9 15.5 21.9 9.3-3 15.5-12.1 15.5-21.9V10.2L24 3.5Z"
          fill="url(#jijel-shield-fill)"
          stroke="url(#jijel-shield-stroke)"
          strokeWidth="1.5"
        />
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
        <path
          d="M24 33.7v3.2"
          stroke="#ecfdf5"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      {showWordmark ? (
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-white">إغاثة جيجل</p>
          <p className="text-[10px] font-semibold tracking-wide text-emerald-300/90">
            Jijel Relief
          </p>
        </div>
      ) : null}
    </div>
  );
}
