import Link from "next/link";

import SpiritualCallout from "@/components/layout/SpiritualCallout";
import AssignGuideForm from "@/components/convoys/AssignGuideForm";
import RoadTracker from "@/components/logistics/RoadTracker";
import ContactActionButtons from "@/components/ui/ContactActionButtons";
import {
  CONVOY_ENTRY_OPTIONS,
  WAYPOINT_TYPE_LABELS,
} from "@/lib/convoys";
import {
  entranceCoordinators,
  getWaypointsByType,
  type WaypointType,
} from "@/lib/convoy-waypoints";
import { buildWhatsAppUrl } from "@/lib/phone";
import { glassPanelClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type GuidePageProps = {
  searchParams: Promise<{
    convoyId?: string;
    assignGuide?: string;
  }>;
};

const WAYPOINT_SECTIONS: WaypointType[] = [
  "reception",
  "lodging",
  "kitchen",
  "fuel",
  "warehouse",
];

const DRIVING_TIPS = [
  {
    title: "السياقة الجبلية",
    body: "المسالك الداخلية وعرة — خفّف السرعة، تجنب المطر الغزير، واترك مسافة كافية أمام 4x4 المرافق.",
  },
  {
    title: "الشاحنات الكبيرة",
    body: "استعمل مدخل بجاية الغربي، سكيكدة الشرقي، أو مدخل ميلة (سيدي معروف / غبالة) للشاحنات. مدخل سطيف الجنوبي يتطلب مرافق 4x4 للمقاطع الضيقة.",
  },
  {
    title: "4x4 والمرافقة",
    body: "إذا حمولتك خفيفة أو الطريق مغلق جزئياً، تواصل مع منسق المدخل قبل الدخول — غادي يعيّنو مرافق محلي.",
  },
  {
    title: "التعبئة والتفريغ",
    body: "عبّي خزان الوقود قبل المسلك الجبلي. نقاط التفريغ الرئيسية في مستودع جيجل المركزي والطاهير وسيدي معروف.",
  },
  {
    title: "مدخل ميلة والشرق",
    body: "القوافل القادمة من ميلة وقسنطينة تمر عبر محور RN77 / RN105 (سيدي معروف — فرجيوة — غبالة). تواصل مع رضوان بوعريوة لتحديد نقاط التفريغ.",
  },
];

export default async function GuidePage({ searchParams }: GuidePageProps) {
  const params = await searchParams;
  const convoyId = params.convoyId ? Number(params.convoyId) : null;
  const showAssignForm =
    Boolean(params.assignGuide) && convoyId !== null && !Number.isNaN(convoyId);

  return (
    <main
      dir="rtl"
      className="dashboard-page min-h-full"
    >
      <header className="border-b border-slate-800/80 bg-slate-950/90 px-4 py-6 backdrop-blur-md">
        <div className="mx-auto max-w-4xl space-y-4">
          <SpiritualCallout
            variant="emerald"
            verse="« وَمَنْ أَحْيَاهَا فَكَأَنَّمَا أَحْيَا النَّاسَ جَمِيعًا »"
          />
          <RoadTracker className="w-full" />
          <div>
          <p className="text-sm font-medium text-emerald-400">دليل القادمين لجيجل</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            مرحبا بخاوتنا اللي جاو يعاونو
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            هادو نقاط الاستقبال والمبيت والتفريغ — كل ما تحتاجو باش توصلو بأمان
            وتفرّغو المساعدات في المكان الصح.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-full bg-sky-700 px-4 py-2 text-xs font-semibold text-white"
            >
              عرض المحطات على الخريطة
            </Link>
            <Link
              href="/report"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              تسجيل ضرر محلي
            </Link>
          </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {showAssignForm && convoyId ? (
          <AssignGuideForm convoyId={convoyId} />
        ) : null}

        <section className={cn(glassPanelClass, "space-y-4 p-5 sm:p-6")}>
          <h2 className="text-lg font-semibold text-slate-900">
            نصائح السياقة والمسالك
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {DRIVING_TIPS.map((tip) => (
              <article
                key={tip.title}
                className="rounded-xl border border-slate-200 bg-white/70 p-4"
              >
                <h3 className="font-semibold text-slate-900">{tip.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {tip.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={cn(glassPanelClass, "space-y-4 p-5 sm:p-6")}>
          <h2 className="text-lg font-semibold text-slate-900">
            منسقو الاستقبال عند المداخل
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONVOY_ENTRY_OPTIONS.map((entry) => {
              const coordinator = entranceCoordinators.find(
                (item) => item.entry_point === entry.value,
              );
              const whatsappUrl = coordinator
                ? buildWhatsAppUrl(
                    coordinator.whatsapp,
                    `السلام عليكم، قافلة قادمة عبر ${entry.labelAr} — نحتاج مرافق استقبال.`,
                  )
                : null;

              return (
                <article
                  key={entry.value}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
                >
                  <h3 className="font-semibold text-amber-900">
                    🚩 {entry.labelAr}
                  </h3>
                  {coordinator ? (
                    <>
                      <p className="mt-1 text-sm text-slate-700">
                        المنسق: {coordinator.name_ar}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {coordinator.notes}
                      </p>
                      <ContactActionButtons
                        phone={coordinator.phone}
                        whatsappUrl={whatsappUrl}
                        className="mt-3"
                        compact
                      />
                    </>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {WAYPOINT_SECTIONS.map((type) => {
          const meta = WAYPOINT_TYPE_LABELS[type];
          const items = getWaypointsByType(type);

          return (
            <section
              key={type}
              className={cn(glassPanelClass, "space-y-4 p-5 sm:p-6")}
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {meta.icon} {meta.labelAr}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((waypoint) => {
                  const whatsappUrl = buildWhatsAppUrl(
                    waypoint.whatsapp ?? waypoint.phone,
                    `السلام عليكم، قافلة قادمة — نحتاج معلومات عن ${waypoint.name_ar}`,
                  );

                  return (
                    <li
                      key={waypoint.id}
                      className="rounded-xl border border-slate-200 bg-white/70 p-4"
                    >
                      <p className="font-semibold text-slate-900">
                        {waypoint.name_ar}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {waypoint.opening_hours} — {waypoint.capacity}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {waypoint.notes}
                      </p>
                      <ContactActionButtons
                        phone={waypoint.phone}
                        whatsappUrl={whatsappUrl}
                        className="mt-3"
                        compact
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
