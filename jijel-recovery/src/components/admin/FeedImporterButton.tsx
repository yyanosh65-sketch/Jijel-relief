"use client";

import { useState } from "react";

import FeedImporterModal from "@/components/admin/FeedImporterModal";
import { navQuickActionBlueClass } from "@/lib/ui-labels";
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
          variant === "navbar" ? navQuickActionBlueClass : "rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white",
          className,
        )}
      >
        ⚡ استيراد نداء من فيسبوك
      </button>

      <FeedImporterModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
