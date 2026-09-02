"use client";

import Link from "next/link";

import { navQuickActionEmeraldClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type CharityInventoryNavButtonProps = {
  className?: string;
};

export default function CharityInventoryNavButton({
  className,
}: CharityInventoryNavButtonProps) {
  return (
    <Link
      href="/charities"
      className={cn(navQuickActionEmeraldClass, className)}
    >
      🤝 مخزون ومساعدات الجمعيات
    </Link>
  );
}
