import type { SosEmergencyType } from "@/db/schema";
import {
  getAllCommunes,
  getCommuneArabicName,
  getDairaArabicName,
  getDairaForCommune,
  jijelLocations,
  type Commune,
} from "@/lib/locations";
import { normalizeAlgerianPhone } from "@/lib/phone";
import { SOS_EMERGENCY_OPTIONS } from "@/lib/intelligence";

export type FeedParseConfidence = "high" | "medium" | "low";

export type FeedParseResult = ParsedFacebookSosPost;

export type ParsedFacebookSosPost = {
  emergencyType: SosEmergencyType;
  emergencyLabelAr: string;
  description: string;
  reporterName: string;
  reporterPhone: string | null;
  commune: string;
  communeAr: string;
  daira: string;
  dairaAr: string;
  village: string | null;
  lat: number;
  lng: number;
  matchedKeywords: string[];
  matchedCommuneText: string | null;
  confidence: FeedParseConfidence;
  sourceText: string;
};

type CommuneIndexEntry = Commune & {
  daira: string;
  daira_ar: string;
  searchTerms: string[];
};

const COMMUNE_INDEX: CommuneIndexEntry[] = jijelLocations.dairas.flatMap(
  (daira) =>
    daira.communes.map((commune) => ({
      ...commune,
      daira: daira.name,
      daira_ar: daira.name_ar,
      searchTerms: buildSearchTerms(commune.name, commune.name_ar, daira.name_ar),
    })),
);

const DAIRA_ALIASES: Record<string, string> = {
  تاكسنة: "Texenna",
  تكسنة: "Texenna",
  texenna: "Texenna",
  taher: "Taher",
  الطاهير: "Taher",
  العوانة: "El Aouana",
  "el aouana": "El Aouana",
  زيامة: "Ziama Mansouriah",
  "ziama mansouriah": "Ziama Mansouriah",
  "زيامة منصورية": "Ziama Mansouriah",
  جيجل: "Jijel",
  jijel: "Jijel",
  العنصر: "El Ancer",
  "el ancer": "El Ancer",
  جيملة: "Djimla",
  djimla: "Djimla",
  الميلية: "El Milia",
  "el milia": "El Milia",
  "سيدي معروف": "Sidi Maarouf",
  "sidi maarouf": "Sidi Maarouf",
};

const HAZARD_RULES: Array<{
  type: SosEmergencyType;
  labelAr: string;
  patterns: RegExp[];
}> = [
  {
    type: "fire_flare",
    labelAr: "اشتعال حرائق",
    patterns: [
      /حريق/iu,
      /حرائق/iu,
      /اشتعال/iu,
      /نار/iu,
      /incendie/i,
      /feu/i,
    ],
  },
  {
    type: "livestock_trap",
    labelAr: "مواشي محاصرة",
    patterns: [
      /مواشي/iu,
      /ماشية/iu,
      /أغنام/iu,
      /اغنام/iu,
      /بقر/iu,
      /محاصر/iu,
      /عالق/iu,
      /bétail/i,
      /mouton/i,
    ],
  },
  {
    type: "medical",
    labelAr: "حالة طبية عاجلة",
    patterns: [
      /طبي/iu,
      /إسعاف/iu,
      /اسعاف/iu,
      /مصاب/iu,
      /جرح/iu,
      /حروق/iu,
      /مستعجل/iu,
      /urgence/i,
    ],
  },
  {
    type: "water_cutoff",
    labelAr: "انقطاع الماء",
    patterns: [
      /ماء/iu,
      /الماء/iu,
      /انقطاع/iu,
      /جفاف/iu,
      /صهريج/iu,
      /مضخة/iu,
      /eau/i,
    ],
  },
];

function buildSearchTerms(
  nameEn: string,
  nameAr: string,
  dairaAr: string,
): string[] {
  const terms = new Set<string>();

  for (const value of [nameEn, nameAr, dairaAr]) {
    const normalized = normalizeArabicText(value);
    if (normalized.length >= 2) {
      terms.add(normalized);
    }
  }

  return [...terms];
}

function normalizeArabicText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

function stripFacebookUrlNoise(input: string): string {
  const withoutUrls = input
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/#\S+/g, " ");

  return withoutUrls.replace(/\s+/g, " ").trim();
}

export function extractAlgerianPhoneNumbers(text: string): string[] {
  const matches = new Set<string>();
  const patterns = [
    /(?:\+213|00213|213)\s*[567]\d(?:[\s.-]?\d){7}/g,
    /0[567]\d(?:[\s.-]?\d){7}/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.match(pattern) ?? []) {
      const normalized = normalizeAlgerianPhone(match);
      if (/^(?:\+213|0)(?:5|6|7)\d{8}$/.test(normalized)) {
        matches.add(normalized);
      }
    }
  }

  return [...matches];
}

function matchCommune(text: string): {
  entry: CommuneIndexEntry;
  matchedText: string;
} | null {
  const normalizedText = normalizeArabicText(text);
  let best: { entry: CommuneIndexEntry; matchedText: string; score: number } | null =
    null;

  for (const entry of COMMUNE_INDEX) {
    for (const term of entry.searchTerms) {
      if (term.length < 3) {
        continue;
      }

      if (!normalizedText.includes(term)) {
        continue;
      }

      const score = term.length;
      if (!best || score > best.score) {
        best = { entry, matchedText: term, score };
      }
    }
  }

  if (best) {
    return { entry: best.entry, matchedText: best.matchedText };
  }

  for (const [alias, dairaName] of Object.entries(DAIRA_ALIASES)) {
    if (normalizedText.includes(normalizeArabicText(alias))) {
      const dairaCommunes = COMMUNE_INDEX.filter(
        (entry) => entry.daira === dairaName,
      );
      const fallback = dairaCommunes[0];
      if (fallback) {
        return { entry: fallback, matchedText: alias };
      }
    }
  }

  return null;
}

function categorizeHazard(text: string): {
  type: SosEmergencyType;
  labelAr: string;
  matchedKeywords: string[];
} {
  const matchedKeywords: string[] = [];
  let bestType: SosEmergencyType = "medical";
  let bestLabel = SOS_EMERGENCY_OPTIONS.find((o) => o.value === "medical")!.labelAr;
  let bestScore = 0;

  for (const rule of HAZARD_RULES) {
    let score = 0;

    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) {
        score += 1;
        matchedKeywords.push(match[0]);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = rule.type;
      bestLabel = rule.labelAr;
    }
  }

  if (bestScore === 0) {
    return {
      type: "medical",
      labelAr: bestLabel,
      matchedKeywords: ["نداء عام"],
    };
  }

  return {
    type: bestType,
    labelAr: bestLabel,
    matchedKeywords: [...new Set(matchedKeywords)],
  };
}

function extractReporterName(text: string, phone: string | null): string {
  const patterns = [
    /(?:اتصلوا?\s+ب[:\s]+|تواصل\s+مع[:\s]+|الاسم[:\s]+|من\s+طرف[:\s]+)([^\n،,.0-9+]{3,40})/iu,
    /(?:posted by|منشور من)\s+([^\n,.]{3,40})/iu,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  if (phone) {
    const beforePhone = text.split(phone)[0]?.trim();
    const tail = beforePhone?.split(/\n/).pop()?.trim();
    if (tail && tail.length >= 3 && tail.length <= 40 && !/\d{5,}/.test(tail)) {
      return tail;
    }
  }

  return "منشور فيسبوك";
}

function extractVillage(text: string): string | null {
  const patterns = [
    /(?:دشرة|قرية|دوار|حي)\s+([^\n،,.]{2,40})/iu,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function computeConfidence(input: {
  phone: string | null;
  communeMatched: boolean;
  hazardScore: number;
}): FeedParseConfidence {
  if (input.phone && input.communeMatched && input.hazardScore > 0) {
    return "high";
  }

  if (input.phone || input.communeMatched) {
    return "medium";
  }

  return "low";
}

export function parseFacebookSosPost(rawInput: string): ParsedFacebookSosPost {
  const sourceText = stripFacebookUrlNoise(rawInput);

  if (!sourceText) {
    throw new Error("النص فارغ — الصق محتوى المنشور وليس الرابط فقط.");
  }

  const phones = extractAlgerianPhoneNumbers(sourceText);
  const reporterPhone = phones[0] ?? null;
  const communeMatch = matchCommune(sourceText);
  const hazard = categorizeHazard(sourceText);
  const village = extractVillage(sourceText);
  const reporterName = extractReporterName(sourceText, reporterPhone);

  const commune = communeMatch?.entry.name ?? "Jijel";
  const communeAr = communeMatch?.entry.name_ar ?? getCommuneArabicName(commune);
  const daira =
    communeMatch?.entry.daira ?? getDairaForCommune(commune) ?? "Jijel";
  const dairaAr = getDairaArabicName(daira);
  const coords =
    communeMatch?.entry ??
    getAllCommunes().find((entry) => entry.name === commune) ?? {
      lat: 36.8211,
      lng: 5.7667,
      name: commune,
      name_ar: communeAr,
    };

  return {
    emergencyType: hazard.type,
    emergencyLabelAr: hazard.labelAr,
    description: sourceText.slice(0, 2000),
    reporterName,
    reporterPhone,
    commune,
    communeAr,
    daira,
    dairaAr,
    village,
    lat: coords.lat,
    lng: coords.lng,
    matchedKeywords: hazard.matchedKeywords,
    matchedCommuneText: communeMatch?.matchedText ?? null,
    confidence: computeConfidence({
      phone: reporterPhone,
      communeMatched: Boolean(communeMatch),
      hazardScore: hazard.matchedKeywords.length,
    }),
    sourceText,
  };
}

export const emergencyTypeLabels = Object.fromEntries(
  SOS_EMERGENCY_OPTIONS.map((option) => [option.value, option.labelAr]),
) as Record<SosEmergencyType, string>;

export function buildFeedDispatchWhatsAppMessage(
  parsed: ParsedFacebookSosPost,
  alertId?: number,
): string {
  const lines = [
    "🚨 *نداء استغاثة مستورد من فيسبوك*",
    alertId ? `رقم التتبع: #${alertId}` : null,
    `النوع: ${parsed.emergencyLabelAr}`,
    `البلدية: ${parsed.communeAr} — دائرة ${parsed.dairaAr}`,
    parsed.village ? `الدشرة: ${parsed.village}` : null,
    parsed.reporterPhone ? `هاتف: ${parsed.reporterPhone}` : null,
    `المبلّغ: ${parsed.reporterName}`,
    "",
    parsed.description.slice(0, 500),
    "",
    "يرجى التنسيق مع الفرق الميدانية القريبة.",
  ].filter(Boolean);

  return lines.join("\n");
}
