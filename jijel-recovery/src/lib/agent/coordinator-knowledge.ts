import villageIntelligence from "@/data/village-intelligence.json";
import {
  verifiedReliefContacts,
  type VerifiedReliefContact,
} from "@/lib/relief-contacts";
import { getCoordinatorByEntry } from "@/lib/convoy-waypoints";
import type { ConvoyEntryPoint } from "@/db/schema";
import { getCommuneArabicName, getDairaArabicName } from "@/lib/locations";

type RoadPassability = "open" | "rough_4x4" | "closed";

type VillageDossier = (typeof villageIntelligence.dossiers)[number];
type RoadSegment = (typeof villageIntelligence.roads)[number];

export const JIJEL_ENTRY_POINTS_AR = [
  "مدخل بجاية الغربي (RN26)",
  "مدخل سطيف الجنوبي (RN44)",
  "مدخل سكيكدة الشرقي (RN80)",
  "مدخل ميلة الجنوبي-الشرقي — سيدي معروف / غبالة (RN77 / RN105)",
] as const;

/** دواوير ومعالم ميدانية يعرفها عمي رابح */
export const KNOWN_DOUARS: Array<{
  aliases: string[];
  commune: string;
  communeAr: string;
  daira: string;
  dairaAr: string;
  notes: string;
}> = [
  {
    aliases: ["تبلوط", "tablot", "tablout"],
    commune: "El Ancer",
    communeAr: "العنصر",
    daira: "El Ancer",
    dairaAr: "العنصر",
    notes: "دوار جبلي فوق العنصر — مسلك وعر، لازم 4x4",
  },
  {
    aliases: ["تابلوط", "tablout village"],
    commune: "Djemaa Beni Habibi",
    communeAr: "جمعة بني حبيبي",
    daira: "El Ancer",
    dairaAr: "العنصر",
    notes: "دشرة تابلوط — تحت بلدية جمعة بني حبيبي، مسلك جبلي",
  },
  {
    aliases: ["مشاط", "mechatt", "mechet"],
    commune: "El Milia",
    communeAr: "الميلية",
    daira: "El Milia",
    dairaAr: "الميلية",
    notes: "دشرة مشاط — تحت بلدية الميلية",
  },
  {
    aliases: ["كاوان", "kaouane", "كعوان"],
    commune: "Texenna",
    communeAr: "تاكسنة",
    daira: "Texenna",
    dairaAr: "تكسنة",
    notes: "أعالي تاكسنة — انقطاع متكرر للماء",
  },
  {
    aliases: ["بني خطاب", "beni khattab", "بني ختّاب"],
    commune: "Chahna",
    communeAr: "الشحنة",
    daira: "Taher",
    dairaAr: "الطاهير",
    notes: "مدشرة بين الشحنة والطاهير — زيتون متضرر",
  },
  {
    aliases: ["تيزي نيزنت", "tizi nizent", "تيزي"],
    commune: "Ziama Mansouriah",
    communeAr: "زيامة منصورية",
    daira: "Ziama Mansouriah",
    dairaAr: "زيامة منصورية",
    notes: "قرب الكهوف العجيبة — شبكات ماء متضررة",
  },
  {
    aliases: ["سوق السبت", "souk es sebt", "سوق الأسبوع"],
    commune: "El Ancer",
    communeAr: "العنصر",
    daira: "El Ancer",
    dairaAr: "العنصر",
    notes: "نقطة تجمّع محلية — مرافقة 4x4 للحمولة الثقيلة",
  },
  {
    aliases: ["لمنزل", "Lemnzel", "Menazel", "مشتى لمنازل", "مشتى", "moshti lmenazel", "moshti"],
    commune: "Bouraoui Belhadef",
    communeAr: "بوراوي بلهادف",
    daira: "El Ancer",
    dairaAr: "العنصر",
    notes: "دشرة بوراوي بلهادف — مسلك جبلي",
  },
  {
    aliases: ["بوراوي بلهادف", "بوراوي", "bouraoui belhadef", "bouraoui"],
    commune: "Bouraoui Belhadef",
    communeAr: "بوراوي بلهادف",
    daira: "El Ancer",
    dairaAr: "العنصر",
    notes: "بلدية جبلية — انقطاع ماء وكهرباء",
  },
];

function normalizeArabic(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function formatTerrainDifficulty(passability: RoadPassability): {
  passability: RoadPassability;
  labelAr: string;
  vehicleRecommendationAr: string;
  requires4x4: boolean;
  allowsHeavyTruck: boolean;
} {
  switch (passability) {
    case "open":
      return {
        passability,
        labelAr: "مسلك سالك",
        vehicleRecommendationAr: "شاحنة ثقيلة أو 4x4 — الطريق مفتوح",
        requires4x4: false,
        allowsHeavyTruck: true,
      };
    case "rough_4x4":
      return {
        passability,
        labelAr: "مسلك وعر — 4x4 إجباري",
        vehicleRecommendationAr:
          "4x4 أو بيك أب فقط — الشاحنة الثقيلة ما تعدّيش بأمان",
        requires4x4: true,
        allowsHeavyTruck: false,
      };
    case "closed":
      return {
        passability,
        labelAr: "مسلك مقطوع",
        vehicleRecommendationAr:
          "مقطوع للشاحنات — لازم فرقة 4x4 تفتح الطريق أولاً",
        requires4x4: true,
        allowsHeavyTruck: false,
      };
    default:
      return formatTerrainDifficulty("rough_4x4");
  }
}

function findDossierByCommune(commune: string): VillageDossier | undefined {
  const normalized = normalizeArabic(commune);
  return villageIntelligence.dossiers.find((dossier) => {
    const candidates = [dossier.name, dossier.name_ar, dossier.daira, dossier.daira_ar];
    return candidates.some((candidate) => normalizeArabic(candidate) === normalized);
  });
}

function findDossierByDaira(daira: string): VillageDossier | undefined {
  const normalized = normalizeArabic(daira);
  return (
    villageIntelligence.dossiers.find(
      (dossier) =>
        dossier.type === "daira" &&
        [dossier.name, dossier.name_ar, dossier.daira, dossier.daira_ar].some(
          (candidate) => normalizeArabic(candidate) === normalized,
        ),
    ) ??
    villageIntelligence.dossiers.find((dossier) =>
      [dossier.daira, dossier.daira_ar].some(
        (candidate) => normalizeArabic(candidate) === normalized,
      ),
    )
  );
}

export function resolveDouarHint(areaQuery: string) {
  const normalized = normalizeArabic(areaQuery);
  return KNOWN_DOUARS.find((douar) =>
    douar.aliases.some(
      (alias) =>
        normalized.includes(normalizeArabic(alias)) ||
        normalizeArabic(alias).includes(normalized),
    ),
  );
}

export type LocalCoordinatorInfo = {
  name: string;
  nameAr: string;
  phone: string;
  verified: boolean;
  source: "dossier" | "relief_contact" | "entrance_coordinator";
  roleAr: string;
};

export function resolveLocalCoordinator(input: {
  commune?: string;
  daira?: string;
}): LocalCoordinatorInfo | null {
  const dossier =
    (input.commune ? findDossierByCommune(input.commune) : undefined) ??
    (input.daira ? findDossierByDaira(input.daira) : undefined);

  if (dossier?.coordinator) {
    return {
      name: dossier.coordinator.name,
      nameAr: dossier.coordinator.name_ar,
      phone: dossier.coordinator.phone,
      verified: dossier.coordinator.verified,
      source: "dossier",
      roleAr: `منسق بلدية ${dossier.name_ar}`,
    };
  }

  const reliefMatch = verifiedReliefContacts.find((contact) => {
    if (input.commune && communeMatches(contact, input.commune)) return true;
    if (input.daira && dairaMatches(contact, input.daira)) return true;
    return false;
  });

  if (reliefMatch) {
    return {
      name: reliefMatch.contact_person,
      nameAr: reliefMatch.contact_person,
      phone: reliefMatch.phone,
      verified: true,
      source: "relief_contact",
      roleAr: reliefMatch.name,
    };
  }

  return null;
}

function communeMatches(contact: VerifiedReliefContact, commune: string): boolean {
  const normalized = normalizeArabic(commune);
  return [contact.commune, getCommuneArabicName(contact.commune)].some(
    (candidate) => normalizeArabic(candidate) === normalized,
  );
}

function dairaMatches(contact: VerifiedReliefContact, daira: string): boolean {
  const normalized = normalizeArabic(daira);
  return [contact.daira, getDairaArabicName(contact.daira)].some(
    (candidate) => normalizeArabic(candidate) === normalized,
  );
}

export function getFieldContactsForDaira(input: {
  dairaQuery: string;
  require4x4?: boolean;
  contactType?: "field_team" | "village_lead" | "relief_hub" | "all";
}): Array<{
  name: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  commune: string;
  communeAr: string;
  category: string;
  categoryAr: string;
  status: string;
  is4x4Team: boolean;
}> {
  const normalized = normalizeArabic(input.dairaQuery);
  const types =
    input.contactType && input.contactType !== "all"
      ? [input.contactType]
      : ["field_team", "village_lead", "relief_hub"];

  const fromRelief = verifiedReliefContacts
    .filter((contact) => types.includes(contact.category))
    .filter((contact) =>
      [contact.daira, getDairaArabicName(contact.daira)].some((candidate) => {
        const candidateNorm = normalizeArabic(candidate);
        return (
          candidateNorm.includes(normalized) || normalized.includes(candidateNorm)
        );
      }),
    )
    .filter((contact) => {
      if (!input.require4x4) return true;
      const haystack = normalizeArabic(
        `${contact.name} ${contact.status} ${contact.location_details}`,
      );
      return haystack.includes("4x4") || haystack.includes("رباع");
    })
    .map((contact) => ({
      name: contact.name,
      contactPerson: contact.contact_person,
      phone: contact.phone,
      whatsapp: contact.whatsapp,
      commune: contact.commune,
      communeAr: getCommuneArabicName(contact.commune),
      category: contact.category,
      categoryAr:
        contact.category === "field_team"
          ? "فريق ميداني / 4x4"
          : contact.category === "village_lead"
            ? "مسؤول قرية"
            : "مستودع إغاثة",
      status: contact.status,
      is4x4Team: /4x4|رباع/i.test(
        `${contact.name} ${contact.status} ${contact.location_details}`,
      ),
    }));

  const fromDossiers = villageIntelligence.dossiers
    .filter((dossier) => dossier.type === "commune")
    .filter((dossier) =>
      [dossier.daira, dossier.daira_ar].some((candidate) => {
        const candidateNorm = normalizeArabic(candidate);
        return (
          candidateNorm.includes(normalized) || normalized.includes(candidateNorm)
        );
      }),
    )
    .filter((dossier) => dossier.coordinator?.verified)
    .filter((dossier) => {
      if (!input.require4x4) return true;
      return dossier.roadPassability !== "open";
    })
    .map((dossier) => {
      const terrain = formatTerrainDifficulty(
        dossier.roadPassability as RoadPassability,
      );
      return {
        name: `منسّق بلدية ${dossier.name_ar}`,
        contactPerson: dossier.coordinator.name_ar,
        phone: dossier.coordinator.phone,
        whatsapp: dossier.coordinator.phone,
        commune: dossier.name,
        communeAr: dossier.name_ar,
        category: "village_lead" as const,
        categoryAr: terrain.requires4x4 ? "منسّق ميداني / 4x4" : "منسّق بلدية",
        status: terrain.labelAr,
        is4x4Team: terrain.requires4x4,
      };
    });

  const merged = [...fromRelief];
  for (const dossierContact of fromDossiers) {
    if (!merged.some((entry) => entry.phone === dossierContact.phone)) {
      merged.push(dossierContact);
    }
  }

  return merged;
}

export function checkMountainRoadStatus(areaQuery: string): {
  areaLabel: string;
  passability: RoadPassability;
  terrain: ReturnType<typeof formatTerrainDifficulty>;
  matchedRoads: Array<{
    nameAr: string;
    passability: RoadPassability;
    notes: string;
  }>;
  dossierSummary: {
    communeAr: string;
    dairaAr: string;
    roadPassability: RoadPassability;
  } | null;
  localCoordinator: LocalCoordinatorInfo | null;
  douarNote: string | null;
} {
  const normalized = normalizeArabic(areaQuery);
  const douar = resolveDouarHint(areaQuery);

  const matchedRoads = (villageIntelligence.roads as RoadSegment[]).filter(
    (road) => {
      const candidates = [road.name, road.name_ar, road.notes ?? ""];
      return candidates.some((candidate) =>
        normalizeArabic(candidate).includes(normalized),
      );
    },
  );

  const dossier =
    douar
      ? findDossierByCommune(douar.commune)
      : villageIntelligence.dossiers.find((entry) =>
          [entry.name, entry.name_ar, entry.daira, entry.daira_ar].some(
            (candidate) => normalizeArabic(candidate).includes(normalized),
          ),
        );

  const passability: RoadPassability =
    (matchedRoads[0]?.passability as RoadPassability | undefined) ??
    (dossier?.roadPassability as RoadPassability | undefined) ??
    "rough_4x4";

  const coordinator = resolveLocalCoordinator({
    commune: douar?.commune ?? dossier?.name,
    daira: douar?.daira ?? dossier?.daira,
  });

  return {
    areaLabel: douar?.aliases[0] ?? dossier?.name_ar ?? areaQuery,
    passability,
    terrain: formatTerrainDifficulty(passability),
    matchedRoads: matchedRoads.map((road) => ({
      nameAr: road.name_ar,
      passability: road.passability as RoadPassability,
      notes: road.notes,
    })),
    dossierSummary: dossier
      ? {
          communeAr: dossier.name_ar,
          dairaAr: dossier.daira_ar,
          roadPassability: dossier.roadPassability as RoadPassability,
        }
      : null,
    localCoordinator: coordinator,
    douarNote: douar?.notes ?? null,
  };
}

export function enrichConvoyDestination(input: {
  commune: string;
  daira: string;
  recommendedEntryPoint: ConvoyEntryPoint;
  recommendedEntryPointAr: string;
}) {
  const dossier = findDossierByCommune(input.commune) ?? findDossierByDaira(input.daira);
  const passability = (dossier?.roadPassability ?? "rough_4x4") as RoadPassability;
  const terrain = formatTerrainDifficulty(passability);
  const localCoordinator = resolveLocalCoordinator({
    commune: input.commune,
    daira: input.daira,
  });
  const entranceCoordinator = getCoordinatorByEntry(input.recommendedEntryPoint);

  return {
    terrain,
    localCoordinator,
    entranceCoordinator: entranceCoordinator
      ? {
          nameAr: entranceCoordinator.name_ar,
          phone: entranceCoordinator.phone,
          whatsapp: entranceCoordinator.whatsapp,
          entryPointAr: input.recommendedEntryPointAr,
          notes: entranceCoordinator.notes,
        }
      : null,
    communeAr: getCommuneArabicName(input.commune),
    dairaAr: getDairaArabicName(input.daira),
  };
}

export const CRISIS_AGENT_PERSONA = {
  name: "عمي رابح",
  title: "منسق إغاثة جيجل",
  greeting:
    "السلام عليكم خويا — أنا عمي رابح، منسق إغاثة جيجل. شحال نقدر نعاونك؟ وين رايحين بالقافلة، ولا بغيت معلومة على مدشرة معيّنة؟",
} as const;
