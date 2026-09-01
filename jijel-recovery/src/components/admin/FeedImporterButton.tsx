"use client";

import { useState } from "react";

import FeedImporterModal from "@/components/admin/FeedImporterModal";
import { cn } from "@/lib/utils";

type FeedImporterButtonProps = {
  variant?: "navbar";
  className?: string;
};

export default function FeedImporterButton({
  variant = "navbar",
  className,
}: FeedImporterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          variant === "navbar"
            ? "rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-xs font-semibold text-violet-900 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-50"
            : "rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white",
          className,
        )}
      >
        ⚡ استيراد نداء من فيسبوك
      </button>

      <FeedImporterModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
