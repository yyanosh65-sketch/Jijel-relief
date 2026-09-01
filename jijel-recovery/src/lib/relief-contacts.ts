import reliefContactsData from "@/data/relief-contacts.json";

export type ReliefHub = {
  id: string;
  name_ar: string;
  commune: string;
  daira: string;
  lat: number;
  lng: number;
  phone: string;
  services: string[];
};

export type FieldTeam = {
  id: string;
  name_ar: string;
  commune: string;
  daira: string;
  lat: number;
  lng: number;
  phone: string;
  vehicle: string;
  coverage: string[];
};

export type VillageLead = {
  id: string;
  name_ar: string;
  role_ar: string;
  commune: string;
  daira: string;
  lat: number;
  lng: number;
  phone: string;
  verified: boolean;
};

export type ReliefContactsDataset = {
  reliefHubs: ReliefHub[];
  fieldTeams: FieldTeam[];
  villageLeads: VillageLead[];
};

export const reliefContacts = reliefContactsData as ReliefContactsDataset;

export const RELIEF_CONTACT_BADGES = {
  relief_hub: "مستودع",
  field_team: "فريق ميداني",
  village_lead: "مسؤول قرية",
  official_facility: "رسمي",
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
];
