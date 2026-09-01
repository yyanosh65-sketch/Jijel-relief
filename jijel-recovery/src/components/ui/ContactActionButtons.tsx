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
  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors";

export default function ContactActionButtons({
  phone,
  whatsappUrl,
  className,
  compact = false,
  variant = "default",
}: ContactActionButtonsProps) {
  const callClass =
    variant === "map"
      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
      : "bg-red-600 text-white hover:bg-red-700";
  const whatsappClass =
    variant === "map"
      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
      : "bg-[#25D366] text-white hover:bg-[#20bd5a]";

  return (
    <div className={cn("flex gap-2", className)}>
      <a
        href={`tel:${phone}`}
        className={cn(buttonClass, callClass, compact && "text-xs py-2")}
      >
        <Phone className="h-4 w-4 shrink-0" />
        📞 اتصال
      </a>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonClass, whatsappClass, compact && "text-xs py-2")}
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          💬 واتساب
        </a>
      ) : null}
    </div>
  );
}
