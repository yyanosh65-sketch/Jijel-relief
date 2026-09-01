import type { HelperSkill } from "@/db/schema";
import { haversineKm } from "@/lib/geo";
import {
  getCommuneArabicName,
  getDairaArabicName,
  resolveLocationReference,
  type Coordinates,
} from "@/lib/locations";
import { JIJEL_CENTER } from "@/lib/map-utils";
import {
  formatHelperSkillBadges,
  formatHelperSkillsSubtitle,
} from "@/lib/helpers";
import {
  communeMatchesReliefContact,
  formatReliefContactSubtitle,
  RELIEF_CONTACT_BADGES,
  verifiedReliefContacts,
  type JsonReliefContactCategory,
  type ReliefContactCategory,
} from "@/lib/relief-contacts";

export type NearestContact = {
  id: string;
  category: ReliefContactCategory;
  badge: string;
  name: string;
  subtitle: string;
  phone: string;
  whatsappPhone?: string | null;
  distanceKm: number | null;
};

export type CategorizedNearestContacts = {
  reliefHubs: NearestContact[];
  fieldTeams: NearestContact[];
  villageLeads: NearestContact[];
  officialFacilities: NearestContact[];
  communityHelpers: NearestContact[];
  usedCommuneFallback: boolean;
};

export type NearestHelpInput = {
  lat?: number;
  lng?: number;
  commune?: string;
  daira?: string;
  limitPerCategory?: number;
};

const FACILITY_TYPE_LABELS: Record<string, string> = {
  civil_protection: "الحماية المدنية",
  veterinary_clinic: "مستوصف بيطري",
  forest_conservancy: "محافظة الغابات",
};

export function parseHelperSkills(value: unknown): HelperSkill[] {
  if (Array.isArray(value)) {
    return value.filter((skill): skill is HelperSkill => typeof skill === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed === "{}") {
    return [];
  }

  const inner = trimmed.replace(/^\{|\}$/g, "");
  return inner
    .split(",")
    .map((skill) => skill.trim().replace(/^"|"$/g, ""))
    .filter(Boolean) as HelperSkill[];
}

export function computeDistanceKm(
  reference: Coordinates,
  lat: number,
  lng: number,
): number {
  return Number(haversineKm(reference.lat, reference.lng, lat, lng).toFixed(1));
}

export function sortContacts(contacts: NearestContact[]): NearestContact[] {
  return [...contacts].sort((left, right) => {
    if (left.distanceKm === null && right.distanceKm === null) {
      return 0;
    }

    if (left.distanceKm === null) {
      return 1;
    }

    if (right.distanceKm === null) {
      return -1;
    }

    return left.distanceKm - right.distanceKm;
  });
}

function matchesSelectedArea(
  entry: { commune: string; daira: string },
  commune?: string,
  daira?: string,
): boolean {
  if (!commune && !daira) {
    return true;
  }

  if (commune && communeMatchesReliefContact(entry.commune, commune)) {
    return true;
  }

  if (daira && entry.daira === daira) {
    return true;
  }

  return false;
}

function mapVerifiedContactToNearest(
  contact: (typeof verifiedReliefContacts)[number],
  distanceKm: number | null,
): NearestContact {
  return {
    id: contact.id,
    category: contact.category,
    badge: RELIEF_CONTACT_BADGES[contact.category],
    name: contact.name,
    subtitle: formatReliefContactSubtitle(contact),
    phone: contact.phone,
    whatsappPhone: contact.whatsapp,
    distanceKm,
  };
}

function buildCategoryContacts(
  category: JsonReliefContactCategory,
  input: NearestHelpInput,
  reference: ReturnType<typeof resolveNearestHelpReference>,
  limit: number,
  maxDistanceKm: number,
): NearestContact[] {
  const distanceFor = (lat: number, lng: number): number | null =>
    reference ? computeDistanceKm(reference, lat, lng) : null;

  const areaFilter = <T extends { commune: string; daira: string }>(
    items: T[],
  ): T[] => {
    if (reference) {
      return items;
    }

    return items.filter((item) =>
      matchesSelectedArea(item, input.commune, input.daira),
    );
  };

  return sortContacts(
    areaFilter(verifiedReliefContacts.filter((item) => item.category === category))
      .map((contact) =>
        mapVerifiedContactToNearest(
          contact,
          distanceFor(contact.lat, contact.lng),
        ),
      )
      .filter((contact) =>
        reference ? (contact.distanceKm ?? 999) <= maxDistanceKm : true,
      )
      .slice(0, limit),
  );
}

export function buildReliefContactsFromJson(
  input: NearestHelpInput,
  reference: ReturnType<typeof resolveNearestHelpReference>,
  limit: number,
): Pick<
  CategorizedNearestContacts,
  "reliefHubs" | "fieldTeams" | "villageLeads"
> {
  return {
    reliefHubs: buildCategoryContacts(
      "relief_hub",
      input,
      reference,
      limit,
      80,
    ),
    fieldTeams: buildCategoryContacts(
      "field_team",
      input,
      reference,
      limit,
      80,
    ),
    villageLeads: buildCategoryContacts(
      "village_lead",
      input,
      reference,
      limit,
      60,
    ),
  };
}

export function resolveNearestHelpReference(input: NearestHelpInput): {
  lat: number;
  lng: number;
  usedCommuneFallback: boolean;
} | null {
  return resolveLocationReference({
    lat: input.lat,
    lng: input.lng,
    commune: input.commune,
    daira: input.daira,
    jijelCenter: JIJEL_CENTER,
    outsideThresholdKm: 100,
  });
}

export function mapFacilityRowToContact(row: {
  id: number;
  name: string;
  facility_type?: string;
  facilityType?: string;
  commune: string;
  hotline_phone?: string;
  hotlinePhone?: string;
  distance_km?: number;
}): NearestContact {
  const facilityType = row.facility_type ?? row.facilityType ?? "";

  return {
    id: `facility-${row.id}`,
    category: "official_facility",
    badge: RELIEF_CONTACT_BADGES.official_facility,
    name: row.name,
    subtitle:
      FACILITY_TYPE_LABELS[facilityType] ?? getCommuneArabicName(row.commune),
    phone: row.hotline_phone ?? row.hotlinePhone ?? "",
    distanceKm:
      typeof row.distance_km === "number"
        ? Number(row.distance_km.toFixed(1))
        : null,
  };
}

export function mapHelperRowToContact(row: {
  id: number;
  full_name?: string;
  fullName?: string;
  phone: string;
  whatsapp_phone?: string | null;
  whatsappPhone?: string | null;
  daira: string;
  commune: string;
  skills: unknown;
  availability_notes?: string | null;
  availabilityNotes?: string | null;
  distance_km?: number;
}): NearestContact {
  const skills = parseHelperSkills(row.skills);
  const fullName = row.full_name ?? row.fullName ?? "";
  const availabilityNotes = row.availability_notes ?? row.availabilityNotes;

  return {
    id: `helper-${row.id}`,
    category: "community_helper",
    badge: formatHelperSkillBadges(skills),
    name: fullName,
    subtitle: [
      formatHelperSkillsSubtitle(skills),
      availabilityNotes,
      `${getCommuneArabicName(row.commune)} — ${getDairaArabicName(row.daira)}`,
    ]
      .filter(Boolean)
      .join(" · "),
    phone: row.phone,
    whatsappPhone: row.whatsapp_phone ?? row.whatsappPhone ?? null,
    distanceKm:
      typeof row.distance_km === "number"
        ? Number(row.distance_km.toFixed(1))
        : null,
  };
}

export function buildNearestContactsFallback(
  input: NearestHelpInput,
): CategorizedNearestContacts {
  const limit = input.limitPerCategory ?? 4;
  const reference = resolveNearestHelpReference(input);
  const jsonContacts = buildReliefContactsFromJson(input, reference, limit);

  return {
    ...jsonContacts,
    officialFacilities: [],
    communityHelpers: [],
    usedCommuneFallback: reference?.usedCommuneFallback ?? false,
  };
}
