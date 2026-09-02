import Link from "next/link";

import Logo from "@/components/ui/Logo";

export default function HeaderBrand() {
  return (
    <Link
      href="/"
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-1 py-1 transition hover:border-emerald-800/40 hover:bg-slate-900/40"
      aria-label="إغاثة جيجل — الصفحة الرئيسية"
    >
      <Logo size={44} className="transition group-hover:scale-[1.02]" />
      <div className="min-w-0 text-right leading-tight">
        <p className="truncate font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight text-white sm:text-lg">
          إغاثة جيجل{" "}
          <span className="text-emerald-300/90">| Jijel Relief</span>
        </p>
        <p className="mt-0.5 hidden text-[11px] font-medium leading-snug tracking-wide text-slate-400 sm:block">
          المنظومة الميدانية الموحدة للتنسيق وتوجيه القوافل
        </p>
      </div>
    </Link>
  );
}
