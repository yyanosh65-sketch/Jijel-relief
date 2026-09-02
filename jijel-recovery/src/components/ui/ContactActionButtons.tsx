import { MessageCircle, Phone } from "lucide-react";

import { cn } from "@/lib/utils";

type ContactActionButtonsProps = {
  phone: string;
  whatsappUrl?: string | null;
  className?: string;
  compact?: boolean;
  variant?: "default" | "map";
};

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors";

export default function ContactActionButtons({
  phone,
  whatsappUrl,
  className,
  compact = false,
  variant = "default",
}: ContactActionButtonsProps) {
  const callClass =
    variant === "map"
      ? "h-9 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
      : "flex-1 rounded-xl bg-red-600 py-2.5 text-white hover:bg-red-700";
  const whatsappClass =
    variant === "map"
      ? "h-9 bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-sm"
      : "flex-1 rounded-xl bg-[#25D366] py-2.5 text-white hover:bg-[#20bd5a]";

  return (
    <div
      className={cn(
        variant === "map" ? "flex w-full flex-col gap-2" : "flex gap-2",
        className,
      )}
    >
      <a
        href={`tel:${phone}`}
        className={cn(
          buttonClass,
          callClass,
          compact && variant !== "map" && "text-xs py-2",
        )}
      >
        <Phone className="h-4 w-4 shrink-0" aria-hidden />
        اتصال
      </a>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonClass,
            whatsappClass,
            compact && variant !== "map" && "text-xs py-2",
          )}
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          واتساب
        </a>
      ) : null}
    </div>
  );
}
