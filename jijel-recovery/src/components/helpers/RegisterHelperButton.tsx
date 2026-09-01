"use client";

import { useState } from "react";

import RegisterHelperModal from "@/components/helpers/RegisterHelperModal";
import { cn } from "@/lib/utils";

type RegisterHelperButtonProps = {
  variant?: "navbar" | "floating";
  className?: string;
};

export default function RegisterHelperButton({
  variant = "floating",
  className,
}: RegisterHelperButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          variant === "navbar"
            ? "rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur-md transition hover:scale-[1.02] hover:bg-emerald-50"
            : "fixed bottom-5 left-5 z-[2950] flex max-w-[min(90vw,280px)] items-center gap-2 rounded-full border border-emerald-200/80 bg-white/95 px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-emerald-50",
          className,
        )}
      >
        🤝 سجّل روحك متطوع / عارض مساعدة
      </button>

      <RegisterHelperModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
