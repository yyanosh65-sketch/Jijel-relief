"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "خريطة الإعمار", icon: "🗺️", match: (path: string) => path === "/" || path === "/map" },
  { href: "/guide", label: "دليل القوافل والمداخل", icon: "🚚", match: (path: string) => path.startsWith("/guide") },
  { href: "/report", label: "تسجيل ضرر أو احتياج", icon: "📝", match: (path: string) => path.startsWith("/report") },
] as const;

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="flex flex-wrap items-center gap-1.5 sm:gap-2"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm",
              isActive
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900",
            )}
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
