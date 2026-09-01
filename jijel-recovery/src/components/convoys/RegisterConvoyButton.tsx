"use client";

import { useState } from "react";

import RegisterConvoyModal from "@/components/convoys/RegisterConvoyModal";
import { navQuickActionAmberClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type RegisterConvoyButtonProps = {
  variant?: "navbar" | "floating";
  className?: string;
};

export default function RegisterConvoyButton({
  variant = "floating",
  className,
}: RegisterConvoyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          variant === "navbar"
            ? navQuickActionAmberClass
            : "fixed bottom-24 left-5 z-[2950] flex max-w-[min(90vw,300px)] items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-amber-100",
          className,
        )}
      >
        🚚 رانا جايين نعاونو (تسجيل قافلة قادمة)
      </button>

      <RegisterConvoyModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
