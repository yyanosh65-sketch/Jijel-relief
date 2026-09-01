"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import {
  getNearestEmergencyContacts,
  type NearestContact,
} from "@/actions/emergency";
import { buildNearestContactsFallback } from "@/lib/nearest-help";
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
  community_helper: "bg-emerald-100 text-emerald-800",
};

function ContactCard({ contact }: { contact: NearestContact }) {
  const whatsAppUrl = buildWhatsAppLink(
    contact.whatsappPhone ?? contact.phone,
  );

  return (
    <li className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{contact.subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              BADGE_STYLES[contact.category],
            )}
          >
            {contact.badge}
          </span>
          {contact.distanceKm !== null ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              على بعد {contact.distanceKm} كم
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
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
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2 py-2 text-xs font-semibold text-white hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            واتساب
          </a>
        ) : null}
      </div>
    </li>
  );
}

const EMPTY_GROUPS = {
  reliefHubs: [] as NearestContact[],
  fieldTeams: [] as NearestContact[],
  villageLeads: [] as NearestContact[],
  officialFacilities: [] as NearestContact[],
  communityHelpers: [] as NearestContact[],
  usedCommuneFallback: false,
};

export default function NearestHelpBox({
  lat,
  lng,
  commune,
  daira,
  hasGps,
}: NearestHelpBoxProps) {
  const [activeTab, setActiveTab] = useState<ReliefContactCategory>("relief_hub");
  const [groups, setGroups] = useState(EMPTY_GROUPS);
  const [isLoading, setIsLoading] = useState(false);
  const [usedOfflineFallback, setUsedOfflineFallback] = useState(false);

  const canQuery = Boolean((lat && lng) || commune || daira);

  const queryInput = useMemo(
    () => ({
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      commune: commune || undefined,
      daira: daira || undefined,
    }),
    [commune, daira, lat, lng],
  );

  useEffect(() => {
    if (!canQuery) {
      setGroups(EMPTY_GROUPS);
      setUsedOfflineFallback(false);
      return;
    }

    let cancelled = false;

    async function loadContacts() {
      setIsLoading(true);
      setUsedOfflineFallback(false);

      const result = await getNearestEmergencyContacts(queryInput);

      if (cancelled) {
        return;
      }

      if (result.success && result.data) {
        setGroups(result.data);
        setIsLoading(false);
        return;
      }

      setGroups(buildNearestContactsFallback(queryInput));
      setUsedOfflineFallback(true);
      setIsLoading(false);
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [canQuery, queryInput, hasGps]);

  const contactsByTab = useMemo(
    () => ({
      relief_hub: groups.reliefHubs,
      field_team: groups.fieldTeams,
      village_lead: groups.villageLeads,
      official_facility: groups.officialFacilities,
      community_helper: groups.communityHelpers,
    }),
    [groups],
  );

  const activeContacts = contactsByTab[activeTab];
  const totalContacts =
    groups.reliefHubs.length +
    groups.fieldTeams.length +
    groups.villageLeads.length +
    groups.officialFacilities.length +
    groups.communityHelpers.length;

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

      {usedOfflineFallback ? (
        <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-amber-900">
          تم عرض جهات الاتصال من القائمة المحلية — بعض بيانات قاعدة البيانات
          غير متوفرة حالياً.
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

      {!isLoading && totalContacts === 0 ? (
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
