import type {
  ConvoyCargoType,
  ConvoyEntryPoint,
  ConvoyVehicleType,
  SosEmergencyType,
} from "@/db/schema";
import { KNOWN_DOUARS } from "@/lib/agent/coordinator-knowledge";
import { buildJijelLocationIndex } from "@/lib/agent-location";
import {
  extractAlgerianPhoneNumbers,
  type FeedParseConfidence,
} from "@/lib/feed-parser";
import {
  findVillageByName,
  getAllVillages,
  getCommuneArabicName,
  getCommuneLocationMeta,
  getDairaArabicName,
  getDairaForCommune,
  jijelLocations,
} from "@/lib/locations";

export type FeedFlowCategory =
  | "sos_medical"
  | "accommodation"
  | "incoming_convoy";

export type FeedFlowBadge = {
  category: FeedFlowCategory;
  labelAr: string;
  emoji: string;
  colorClass: string;
};

export const FEED_FLOW_BADGES: Record<FeedFlowCategory, FeedFlowBadge> = {
  sos_medical: {
    category: "sos_medical",
    labelAr: "نداء طبي عاجل",
    emoji: "🚨",
    colorClass: "bg-red-100 text-red-900 border-red-200",
  },
  accommodation: {
    category: "accommodation",
    labelAr: "إيواء ومبيت",
    emoji: "🏠",
    colorClass: "bg-amber-100 text-amber-900 border-amber-200",
  },
  incoming_convoy: {
    category: "incoming_convoy",
    labelAr: "قافلة قادمة",
    emoji: "🚚",
    colorClass: "bg-sky-100 text-sky-900 border-sky-200",
  },
};

export type ResolvedFeedLocation = {
  commune: string;
  communeAr: string;
  daira: string;
  dairaAr: string;
  village: string | null;
  lat: number;
  lng: number;
  matchedLabel: string;
  source: "douar_alias" | "commune_index" | "dossier_hint" | "fallback";
  confidence: FeedParseConfidence;
};

export type ClassifiedFeedPost = {
  flowCategory: FeedFlowCategory;
  badge: FeedFlowBadge;
  title: string;
  description: string;
  phone: string | null;
  location: ResolvedFeedLocation;
  confidence: FeedParseConfidence;
  // SOS-specific
  emergencyType?: SosEmergencyType;
  oxygenRequired?: boolean;
  // Accommodation-specific
  bedCapacity?: number;
  venueType?: string;
  // Convoy-specific
  departureWilaya?: string;
  driverName?: string;
  cargoType?: ConvoyCargoType;
  vehicleType?: ConvoyVehicleType;
  entryPoint?: ConvoyEntryPoint;
  etaHoursFromNow?: number;
};

const DOUAR_EXTRA_ALIASES: Array<{
  aliases: string[];
  commune: string;
  communeAr: string;
  daira: string;
  villageLabel: string;
}> = [
  {
    aliases: ["لمنزل", "Lemnzel", "Menazel", "مشتى لمنازل", "مشتى", "moshti lmenazel", "moshti"],
    commune: "Bouraoui Belhadef",
    communeAr: "بوراوي بلهادف",
    daira: "El Ancer",
    villageLabel: "دشرة لمنزل",
  },
  {
    aliases: ["بوراوي بلهادف", "بوراوي", "bouraoui belhadef", "bouraoui"],
    commune: "Bouraoui Belhadef",
    communeAr: "بوراوي بلهادف",
    daira: "El Ancer",
    villageLabel: "بوراوي بلهادف",
  },
  {
    aliases: ["تيزي نيزنت", "تيزي نزنت", "tizi nizent"],
    commune: "Ziama Mansouriah",
    communeAr: "زيامة منصورية",
    daira: "Ziama Mansouriah",
    villageLabel: "دشرة تيزي نيزنت",
  },
  {
    aliases: ["بني خطاب", "beni khattab"],
    commune: "Chahna",
    communeAr: "الشحنة",
    daira: "Taher",
    villageLabel: "دوار بني خطاب",
  },
];

const WILAYA_ALIASES: Record<string, string> = {
  "بو سعادة": "بوسعادة",
  بوسعادة: "بوسعادة",
  "bou saada": "بوسعادة",
  "bou saâda": "بوسعادة",
  msila: "مسيلة",
  مسيلة: "مسيلة",
  tebessa: "تبسة",
  تبسة: "تبسة",
  setif: "سطيف",
  سطيف: "سطيف",
  bejaia: "بجاية",
  بجاية: "بجاية",
  mila: "ميلة",
  ميلة: "ميلة",
  constantine: "قسنطينة",
  قسنطينة: "قسنطينة",
  algiers: "الجزائر",
  الجزائر: "الجزائر",
};

function normalizeArabic(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

function stripNoise(input: string): string {
  return input
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/#\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreFlowCategory(text: string): Record<FeedFlowCategory, number> {
  const scores: Record<FeedFlowCategory, number> = {
    sos_medical: 0,
    accommodation: 0,
    incoming_convoy: 0,
  };

  const sosPatterns = [
    /اسعاف/iu,
    /إسعاف/iu,
    /طبي/iu,
    /طبيب/iu,
    /مصاب/iu,
    /حروق/iu,
    /اكسجين/iu,
    /أكسجين/iu,
    /اوكسجين/iu,
    /oxygen/i,
    /مستشفى/iu,
    /SOS/i,
    /استغاث/iu,
    /عاجل/iu,
    /محاصر/iu,
  ];
  const accommodationPatterns = [
    /إيواء/iu,
    /ايواء/iu,
    /مبيت/iu,
    /أسرة/iu,
    /سرير/iu,
    /مسجد/iu,
    /قاعة/iu,
    /مبيت/iu,
    /ليل/iu,
    /مأوى/iu,
    /مأوى/iu,
    /hosting/i,
    /lodging/i,
  ];
  const convoyPatterns = [
    /قافلة/iu,
    /شاحنة/iu,
    /حمولة/iu,
    /قادم/iu,
    /قادمة/iu,
    /من\s+(?:ولاية\s+)?/iu,
    /تبسة/iu,
    /بوسعادة/iu,
    /بو\s*سعادة/iu,
    /مسيلة/iu,
    /سطيف/iu,
    /convoy/i,
    /توجيه\s+الشاحنات/iu,
  ];

  for (const pattern of sosPatterns) {
    if (pattern.test(text)) scores.sos_medical += 1;
  }
  for (const pattern of accommodationPatterns) {
    if (pattern.test(text)) scores.accommodation += 1;
  }
  for (const pattern of convoyPatterns) {
    if (pattern.test(text)) scores.incoming_convoy += 1;
  }

  if (/حريق|مواشي|ماء|انقطاع/.test(text)) {
    scores.sos_medical += 2;
  }

  return scores;
}

function pickFlowCategory(text: string): FeedFlowCategory {
  const scores = scoreFlowCategory(text);
  const ranked = (
    Object.entries(scores) as Array<[FeedFlowCategory, number]>
  ).sort((a, b) => b[1] - a[1]);

  if (ranked[0][1] === 0) {
    return "sos_medical";
  }

  if (ranked[0][1] === ranked[1][1]) {
    if (/قافلة|شاحنة|قادم/.test(text)) return "incoming_convoy";
    if (/إيواء|مسجد|أسرة|مبيت/.test(text)) return "accommodation";
    return "sos_medical";
  }

  return ranked[0][0];
}

export function resolveFeedLocation(rawText: string): ResolvedFeedLocation {
  const text = stripNoise(rawText);
  const normalizedText = normalizeArabic(text);

  for (const extra of DOUAR_EXTRA_ALIASES) {
    for (const alias of extra.aliases) {
      if (normalizedText.includes(normalizeArabic(alias))) {
        const meta = getCommuneLocationMeta(extra.commune, extra.daira);
        return {
          commune: extra.commune,
          communeAr: extra.communeAr,
          daira: extra.daira,
          dairaAr: getDairaArabicName(extra.daira),
          village: extra.villageLabel,
          lat: meta?.lat ?? 36.6514,
          lng: meta?.lng ?? 5.8822,
          matchedLabel: extra.villageLabel,
          source: "douar_alias",
          confidence: "high",
        };
      }
    }
  }

  for (const douar of KNOWN_DOUARS) {
    for (const alias of douar.aliases) {
      if (normalizedText.includes(normalizeArabic(alias))) {
        const meta = getCommuneLocationMeta(douar.commune, douar.daira);
        return {
          commune: douar.commune,
          communeAr: douar.communeAr,
          daira: douar.daira,
          dairaAr: douar.dairaAr,
          village: douar.aliases[0],
          lat: meta?.lat ?? 36.8211,
          lng: meta?.lng ?? 5.7667,
          matchedLabel: douar.aliases[0],
          source: "douar_alias",
          confidence: "high",
        };
      }
    }
  }

  for (const village of getAllVillages()) {
    for (const alias of [village.name_ar, village.name]) {
      if (normalizedText.includes(normalizeArabic(alias))) {
        const meta = getCommuneLocationMeta(village.commune, village.daira);
        return {
          commune: village.commune,
          communeAr: village.commune_ar,
          daira: village.daira,
          dairaAr: village.daira_ar,
          village: village.name_ar,
          lat: village.lat ?? meta?.lat ?? 36.8211,
          lng: village.lng ?? meta?.lng ?? 5.7667,
          matchedLabel: village.name_ar,
          source: "douar_alias",
          confidence: "high",
        };
      }
    }
  }

  const index = buildJijelLocationIndex();
  let best: {
    entry: (typeof index)[number];
    score: number;
    label: string;
  } | null = null;

  for (const entry of index) {
    const candidates = [entry.commune_ar, entry.commune, entry.daira_ar].map(
      normalizeArabic,
    );
    for (const candidate of candidates) {
      if (candidate.length < 3) continue;
      if (
        normalizedText.includes(candidate) ||
        candidate.includes(normalizedText.slice(0, 12))
      ) {
        const score = candidate.length;
        if (!best || score > best.score) {
          best = { entry, score, label: entry.commune_ar };
        }
      }
    }
  }

  if (best) {
    const meta = getCommuneLocationMeta(best.entry.commune, best.entry.daira);
    const villageMatch = text.match(
      /(?:دشرة|قرية|دوار|حي)\s+([^\n،,.]{2,40})/iu,
    );
    return {
      commune: best.entry.commune,
      communeAr: best.entry.commune_ar,
      daira: best.entry.daira,
      dairaAr: best.entry.daira_ar,
      village: villageMatch?.[1]?.trim() ?? null,
      lat: meta?.lat ?? best.entry.lat,
      lng: meta?.lng ?? best.entry.lng,
      matchedLabel: villageMatch?.[1]?.trim() ?? best.label,
      source: "commune_index",
      confidence: "high",
    };
  }

  const communeGuess =
    text.match(/(?:بلدية|دائرة|قرية|دوار|دشرة)\s+([^\n،,.]{2,40})/i)?.[1] ??
    "جيجل";

  const villageGuess = findVillageByName(communeGuess);
  if (villageGuess) {
    return {
      commune: villageGuess.commune,
      communeAr: villageGuess.commune_ar,
      daira: villageGuess.daira,
      dairaAr: villageGuess.daira_ar,
      village: villageGuess.name_ar,
      lat: villageGuess.lat,
      lng: villageGuess.lng,
      matchedLabel: villageGuess.name_ar,
      source: "douar_alias",
      confidence: "medium",
    };
  }

  const daira = getDairaForCommune(communeGuess) ?? "Jijel";
  const meta = getCommuneLocationMeta(communeGuess, daira);

  return {
    commune: meta?.name ?? "Jijel",
    communeAr: meta?.name_ar ?? getCommuneArabicName("Jijel"),
    daira: meta?.daira ?? "Jijel",
    dairaAr: meta?.daira_ar ?? "جيجل",
    village: communeGuess !== "جيجل" ? communeGuess : null,
    lat: meta?.lat ?? 36.8211,
    lng: meta?.lng ?? 5.7667,
    matchedLabel: communeGuess,
    source: "fallback",
    confidence: "low",
  };
}

function extractDepartureWilaya(text: string): string | undefined {
  const fromMatch = text.match(
    /(?:من|قادم(?:ة)?\s+من|انطلاق(?:تها)?\s+من)\s+(?:ولاية\s+)?([^\n،,.]{2,30})/iu,
  );
  if (fromMatch?.[1]) {
    const raw = fromMatch[1].trim();
    const normalized = normalizeArabic(raw);
    for (const [alias, label] of Object.entries(WILAYA_ALIASES)) {
      if (normalized.includes(normalizeArabic(alias))) {
        return label;
      }
    }
    return raw;
  }

  for (const [alias, label] of Object.entries(WILAYA_ALIASES)) {
    if (text.toLowerCase().includes(alias.toLowerCase())) {
      return label;
    }
  }

  return undefined;
}

function inferEntryPoint(departureWilaya?: string): ConvoyEntryPoint {
  const normalized = normalizeArabic(departureWilaya ?? "");
  if (/تبس|قسنطين|سطيف|مسيل/.test(normalized)) {
    return "setif_south";
  }
  if (/بجاي|بجا/.test(normalized)) {
    return "bejaia_west";
  }
  if (/سكيكد|قالم|عناب/.test(normalized)) {
    return "skikda_east";
  }
  if (/ميل|غبال|سيدي معروف/.test(normalized)) {
    return "mila_south_east";
  }
  return "setif_south";
}

function inferCargoType(text: string): ConvoyCargoType {
  if (/علف|أعلاف|ماشية/.test(text)) return "farm_equipment";
  if (/دواء|طب|إسعاف|اكسجين|أكسجين/.test(text)) return "medicine";
  if (/بطانية|غطاء|ملابس/.test(text)) return "blankets";
  if (/ماء|خزان|مؤن|أغذية|علبة/.test(text)) return "food";
  return "mixed";
}

function inferVehicleType(text: string): ConvoyVehicleType {
  if (/4x4|رباع|بيك.?اب|pickup/i.test(text)) return "pickup_4x4";
  if (/حافلة|bus/i.test(text)) return "bus";
  if (/فان|van/i.test(text)) return "van";
  return "truck";
}

function extractBedCapacity(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(?:سرير|أسرة|عائلة|شخص)/iu);
  return match ? Number(match[1]) : undefined;
}

function extractVenueType(text: string): string | undefined {
  if (/مسجد/.test(text)) return "مسجد";
  if (/قاعة|قاعه/.test(text)) return "قاعة";
  if (/مركز شباب|دار الشباب/.test(text)) return "مركز شباب";
  if (/مدرسة/.test(text)) return "مدرسة";
  return undefined;
}

function extractDriverName(text: string): string | undefined {
  const patterns = [
    /(?:السائق|السائق:|اسم السائق|الأخ|الأخت)\s*[:\-]?\s*([^\n،,.0-9+]{3,40})/iu,
    /(?:posted by|منشور من)\s+([^\n,.]{3,40})/iu,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractEtaHours(text: string): number {
  const hourMatch = text.match(/(\d+)\s*(?:ساعة|سا|h)/iu);
  if (hourMatch) return Number(hourMatch[1]);
  const dayMatch = text.match(/(\d+)\s*(?:يوم|أيام)/iu);
  if (dayMatch) return Number(dayMatch[1]) * 24;
  return 6;
}

function inferEmergencyType(text: string): SosEmergencyType {
  if (/حريق|نار|اشتعال/.test(text)) return "fire_flare";
  if (/مواشي|أغنام|بقر|ماشية/.test(text)) return "livestock_trap";
  if (/ماء|انقطاع|صهريج|مضخة/.test(text)) return "water_cutoff";
  return "medical";
}

function buildTitle(flow: FeedFlowCategory, text: string, location: ResolvedFeedLocation): string {
  const snippet = text.slice(0, 72).trim();
  if (flow === "sos_medical") {
    return snippet || `نداء طبي عاجل — ${location.communeAr}`;
  }
  if (flow === "accommodation") {
    return snippet || `إيواء متاح — ${location.communeAr}`;
  }
  const wilaya = extractDepartureWilaya(text);
  return wilaya
    ? `قافلة قادمة من ${wilaya}`
    : snippet || "قافلة إغاثة قادمة";
}

function computeConfidence(input: {
  phone: string | null;
  location: ResolvedFeedLocation;
  flowScore: number;
}): FeedParseConfidence {
  if (
    input.phone &&
    input.location.confidence === "high" &&
    input.flowScore >= 2
  ) {
    return "high";
  }
  if (input.phone || input.location.confidence === "high") {
    return "medium";
  }
  return "low";
}

export function classifyFeedPost(rawInput: string): ClassifiedFeedPost {
  const description = stripNoise(rawInput);
  if (!description) {
    throw new Error("النص فارغ — الصق محتوى المنشور.");
  }

  const flowCategory = pickFlowCategory(description);
  const badge = FEED_FLOW_BADGES[flowCategory];
  const location = resolveFeedLocation(description);
  const phones = extractAlgerianPhoneNumbers(description);
  const phone = phones[0] ?? null;
  const flowScores = scoreFlowCategory(description);
  const confidence = computeConfidence({
    phone,
    location,
    flowScore: flowScores[flowCategory],
  });

  const base: ClassifiedFeedPost = {
    flowCategory,
    badge,
    title: buildTitle(flowCategory, description, location),
    description: description.slice(0, 2000),
    phone,
    location,
    confidence,
  };

  if (flowCategory === "sos_medical") {
    return {
      ...base,
      emergencyType: inferEmergencyType(description),
      oxygenRequired: /اكسجين|أكسجين|اوكسجين|oxygen/i.test(description),
    };
  }

  if (flowCategory === "accommodation") {
    return {
      ...base,
      bedCapacity: extractBedCapacity(description),
      venueType: extractVenueType(description),
    };
  }

  const departureWilaya = extractDepartureWilaya(description);
  return {
    ...base,
    departureWilaya,
    driverName: extractDriverName(description),
    cargoType: inferCargoType(description),
    vehicleType: inferVehicleType(description),
    entryPoint: inferEntryPoint(departureWilaya),
    etaHoursFromNow: extractEtaHours(description),
  };
}

export function listResolvablePlaceNames(): string[] {
  const fromJson = jijelLocations.dairas.flatMap((daira) =>
    daira.communes.map((c) => c.name_ar),
  );
  const fromDouars = [
    ...KNOWN_DOUARS.flatMap((d) => d.aliases),
    ...DOUAR_EXTRA_ALIASES.flatMap((d) => d.aliases),
  ];
  return [...new Set([...fromJson, ...fromDouars])];
}
