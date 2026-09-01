"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import {
  getNearestEmergencyContacts,
  type NearestContact,
} from "@/actions/emergency";
import { buildWhatsAppLink } from "@/lib/phone";
import {
  RELIEF_CONTACT_TABS,
  type ReliefContactCategory,
} from "@/lib/relief-contacts";
import { glassPanelClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type NearestHelpBoxProps = {
  lat: string;
  lng: string;
  commune: string;
  daira: string;
  hasGps: boolean;
};

const BADGE_STYLES: Record<ReliefContactCategory, string> = {
  relief_hub: "bg-amber-100 text-amber-800",
  field_team: "bg-blue-100 text-blue-800",
  village_lead: "bg-violet-100 text-violet-800",
  official_facility: "bg-red-100 text-red-800",
};

function ContactCard({ contact }: { contact: NearestContact }) {
  const whatsAppUrl = buildWhatsAppLink(contact.phone);

  return (
    <li className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {contact.name}
          </p>
          <p className="text-xs text-slate-500">{contact.subtitle}</p>
          {contact.distanceKm !== null ? (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              على بعد {contact.distanceKm} كم
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            BADGE_STYLES[contact.category],
          )}
        >
          [{contact.badge}]
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        <a
          href={`tel:${contact.phone}`}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          <Phone className="h-3.5 w-3.5" />
          اتصال
        </a>
        {whatsAppUrl ? (
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            واتساب
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default function NearestHelpBox({
  lat,
  lng,
  commune,
  daira,
  hasGps,
}: NearestHelpBoxProps) {
  const [activeTab, setActiveTab] = useState<ReliefContactCategory>("relief_hub");
  const [groups, setGroups] = useState({
    reliefHubs: [] as NearestContact[],
    fieldTeams: [] as NearestContact[],
    villageLeads: [] as NearestContact[],
    officialFacilities: [] as NearestContact[],
    usedCommuneFallback: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canQuery = Boolean((lat && lng) || commune || daira);

  useEffect(() => {
    if (!canQuery) {
      setGroups({
        reliefHubs: [],
        fieldTeams: [],
        villageLeads: [],
        officialFacilities: [],
        usedCommuneFallback: false,
      });
      return;
    }

    let cancelled = false;

    async function loadContacts() {
      setIsLoading(true);
      setError(null);

      const result = await getNearestEmergencyContacts({
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        commune: commune || undefined,
        daira: daira || undefined,
      });

      if (cancelled) {
        return;
      }

      setIsLoading(false);

      if (!result.success || !result.data) {
        setError(result.error ?? "تعذر تحميل جهات المساعدة.");
        return;
      }

      setGroups(result.data);
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [canQuery, commune, daira, hasGps, lat, lng]);

  const contactsByTab = useMemo(
    () => ({
      relief_hub: groups.reliefHubs,
      field_team: groups.fieldTeams,
      village_lead: groups.villageLeads,
      official_facility: groups.officialFacilities,
    }),
    [groups],
  );

  const activeContacts = contactsByTab[activeTab];
  const totalContacts =
    groups.reliefHubs.length +
    groups.fieldTeams.length +
    groups.villageLeads.length +
    groups.officialFacilities.length;

  if (!canQuery) {
    return null;
  }

  return (
    <section
      dir="rtl"
      className={cn(glassPanelClass, "border-amber-200/80 bg-amber-50/70 p-4")}
    >
      <h3 className="text-sm font-bold text-amber-950">
        🚨 أرقام النجدة الأقرب إليك حالياً
      </h3>
      <p className="mt-1 text-xs text-amber-900/80">
        أقرب ناس يقدرو يعاونوك ويوصلو للمكان
      </p>

      {groups.usedCommuneFallback ? (
        <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-amber-900">
          المسافة محسوبة من مركز البلدية/الدائرة المختارة — موقع GPS بعيد عن
          جيجل.
        </p>
      ) : null}

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {RELIEF_CONTACT_TABS.map((tab) => {
          const count = contactsByTab[tab.id].length;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition",
                isActive
                  ? "bg-amber-700 text-white shadow-sm"
                  : "bg-white/80 text-amber-900 hover:bg-white",
              )}
            >
              {tab.icon} {tab.label}
              {count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="mt-3 flex items-center justify-center gap-2 py-4 text-sm text-amber-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري البحث عن أقرب المساعدة...
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      {!isLoading && totalContacts === 0 && !error ? (
        <p className="mt-3 text-xs text-amber-900">
          ما لقيناش جهات مساعدة قريبة — أكمل تحديد البلدية والدائرة.
        </p>
      ) : null}

      {!isLoading && activeContacts.length === 0 && totalContacts > 0 ? (
        <p className="mt-3 text-xs text-amber-900">
          ما كاينش جهات في هاد التصنيف — جرّب تبويب آخر.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {activeContacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </ul>
    </section>
  );
}
