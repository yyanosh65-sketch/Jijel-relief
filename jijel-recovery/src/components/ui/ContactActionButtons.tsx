import { MessageCircle, Phone } from "lucide-react";

import { cn } from "@/lib/utils";

type ContactActionButtonsProps = {
  phone: string;
  whatsappUrl?: string | null;
  className?: string;
  compact?: boolean;
};

const buttonClass =
  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors";

export default function ContactActionButtons({
  phone,
  whatsappUrl,
  className,
  compact = false,
}: ContactActionButtonsProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <a
        href={`tel:${phone}`}
        className={cn(
          buttonClass,
          "bg-red-600 text-white hover:bg-red-700",
          compact && "text-xs",
        )}
      >
        <Phone className="h-4 w-4 shrink-0" />
        اتصال
      </a>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonClass,
            "bg-[#25D366] text-white hover:bg-[#20bd5a]",
            compact && "text-xs",
          )}
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          واتساب
        </a>
      ) : null}
    </div>
  );
}
