"use client";

import { usePathname } from "next/navigation";

import Logo from "@/components/ui/Logo";

export function AppFooter() {
  const pathname = usePathname();
  const hideOnMap = pathname === "/" || pathname === "/map";

  if (hideOnMap) {
    return null;
  }

  return (
    <footer
      dir="rtl"
      className="relative z-[100] mt-auto w-full border-t border-slate-800/80 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-6 py-10 text-slate-400 sm:px-12"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(16_185_129_/_0.12),transparent_45%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center space-y-3 text-center md:items-start md:text-right">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <p className="text-sm font-extrabold text-slate-200">إغاثة جيجل</p>
              <p className="text-[11px] font-semibold text-emerald-400/90">
                Jijel Relief
              </p>
            </div>
          </div>
          <p className="text-sm font-semibold tracking-wide text-emerald-400">
            « وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ »
          </p>
          <p className="max-w-md text-xs leading-relaxed tracking-normal text-slate-500">
            منصة إغاثية موحدة لتنسيق القوافل، حصر الاحتياجات الميدانية، وسجل
            مخزون الجمعيات في ولاية جيجل.
          </p>
        </div>

        <div className="flex flex-col items-center space-y-1.5 text-center md:items-end md:text-left">
          <div className="text-xs tracking-wide text-slate-400">
            تم التطوير بحرص وإخلاص لأهلنا في جيجل
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-900/80 px-3 py-1.5 text-sm font-bold text-slate-200 shadow-inner backdrop-blur-md">
            <span>تطوير وإشراف:</span>
            <span className="font-extrabold text-emerald-400">
              يونس تلماني (Younes Telmani)
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            جميع البيانات الميدانية والجغرافية مخصصة للأعمال الإنسانية
            والتضامنية
          </p>
        </div>
      </div>
    </footer>
  );
}
