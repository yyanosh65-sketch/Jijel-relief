import reliefContactsData from "@/data/relief-contacts.json";
import { getCommuneArabicName, getDairaArabicName } from "@/lib/locations";
import type { RoadAccessibility } from "@/lib/locations";

export type JsonReliefContactCategory =
  | "relief_hub"
  | "field_team"
  | "village_lead";

export type VerifiedReliefContact = {
  id: string;
  category: JsonReliefContactCategory;
  name: string;
  daira: string;
  commune: string;
  location_details: string;
  lat: number;
  lng: number;
  exact_address_ar: string;
  landmark: string;
  road_accessibility: RoadAccessibility;
  contact_person: string;
  phone: string;
  whatsapp: string;
  status: string;
};

type RawVerifiedReliefContact = Omit<VerifiedReliefContact, "id">;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withStableIds(
  contacts: RawVerifiedReliefContact[],
): VerifiedReliefContact[] {
  const seen = new Map<string, number>();

  return contacts.map((contact) => {
    const base = `${contact.category}-${slugify(contact.name) || "contact"}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    return {
      ...contact,
      id: count === 0 ? base : `${base}-${count + 1}`,
    };
  });
}

export const verifiedReliefContacts = withStableIds(
  reliefContactsData as RawVerifiedReliefContact[],
);

export const reliefContactsByCategory = {
  reliefHubs: verifiedReliefContacts.filter(
    (contact) => contact.category === "relief_hub",
  ),
  fieldTeams: verifiedReliefContacts.filter(
    (contact) => contact.category === "field_team",
  ),
  villageLeads: verifiedReliefContacts.filter(
    (contact) => contact.category === "village_lead",
  ),
} as const;

/** @deprecated Use verifiedReliefContacts */
export const reliefContacts = reliefContactsByCategory;

export function formatReliefContactSubtitle(
  contact: VerifiedReliefContact,
): string {
  const communeLabel =
    getCommuneArabicName(contact.commune) === contact.commune
      ? contact.commune
      : `${contact.commune} · ${getCommuneArabicName(contact.commune)}`;

  return [
    contact.contact_person,
    `${communeLabel} — دائرة ${getDairaArabicName(contact.daira)}`,
    contact.status,
    contact.location_details,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function communeMatchesReliefContact(
  entryCommune: string,
  selectedCommune?: string,
): boolean {
  if (!selectedCommune) {
    return false;
  }

  if (entryCommune === selectedCommune) {
    return true;
  }

  const selectedArabic = getCommuneArabicName(selectedCommune);
  const entryArabic = getCommuneArabicName(entryCommune);

  return (
    entryCommune === selectedArabic ||
    entryArabic === selectedCommune ||
    entryArabic === selectedArabic
  );
}

export const RELIEF_CONTACT_BADGES = {
  relief_hub: "مستودع",
  field_team: "فريق ميداني",
  village_lead: "مسؤول قرية",
  official_facility: "رسمي",
  community_helper: "متطوع",
} as const;

export type ReliefContactCategory = keyof typeof RELIEF_CONTACT_BADGES;

export const RELIEF_CONTACT_TABS: Array<{
  id: ReliefContactCategory;
  label: string;
  icon: string;
}> = [
  { id: "relief_hub", label: "مستودعات ونقاط التجميع", icon: "📦" },
  {
    id: "field_team",
    label: "فرق الإغاثة الميدانية وسيارات 4x4",
    icon: "🚚",
  },
  {
    id: "village_lead",
    label: "مسؤولو ولجان القرى والدواوير",
    icon: "👤",
  },
  {
    id: "official_facility",
    label: "المرافق الرسمية والبيطرية",
    icon: "🚨",
  },
  {
    id: "community_helper",
    label: "متطوعون وعارضو مساعدة",
    icon: "🤝",
  },
];
