/** Regional wilaya multi-tenancy helpers for the eastern relief belt. */

export const WILAYA_CODES = [
  "18_jijel",
  "06_bejaia",
  "21_skikda",
  "19_setif",
] as const;

export type WilayaCode = (typeof WILAYA_CODES)[number];

export const DEFAULT_WILAYA: WilayaCode = "18_jijel";

export type WilayaCommune = {
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
};

export type WilayaDefinition = {
  code: WilayaCode;
  numericCode: string;
  labelAr: string;
  /** HUD pill: "18 جيجل" */
  labelPillAr: string;
  labelShortAr: string;
  /** Leaflet [lat, lng] */
  center: [number, number];
  zoom: number;
  /** [[south, west], [north, east]] */
  maxBounds: [[number, number], [number, number]];
  communes: WilayaCommune[];
};

export const WILAYA_DEFINITIONS: Record<WilayaCode, WilayaDefinition> = {
  "18_jijel": {
    code: "18_jijel",
    numericCode: "18",
    labelAr: "جيجل",
    labelPillAr: "18 جيجل",
    labelShortAr: "جيجل",
    center: [36.82, 5.76],
    zoom: 11,
    maxBounds: [
      [36.45, 5.35],
      [37.05, 6.55],
    ],
    communes: [
      { name: "Jijel", nameAr: "جيجل", lat: 36.82, lng: 5.766 },
      { name: "Taher", nameAr: "الطاهير", lat: 36.772, lng: 5.848 },
      { name: "El Ancer", nameAr: "العنصر", lat: 36.8, lng: 6.16 },
      { name: "El Milia", nameAr: "الميلية", lat: 36.755, lng: 6.272 },
      { name: "Texenna", nameAr: "تكسنة", lat: 36.665, lng: 5.79 },
      { name: "Djimla", nameAr: "جيملة", lat: 36.58, lng: 5.9 },
      { name: "Bouraoui Belhadef", nameAr: "بوراوي بلهادف", lat: 36.7, lng: 6.1 },
      { name: "Ouled Asker", nameAr: "أولاد عسكر", lat: 36.63, lng: 5.95 },
      { name: "Ouled Rabah", nameAr: "أولاد رابح", lat: 36.6, lng: 6.01 },
      { name: "Settara", nameAr: "السطارة", lat: 36.72, lng: 6.33 },
      { name: "Sidi Maarouf", nameAr: "سيدي معروف", lat: 36.64, lng: 6.27 },
      { name: "Chekfa", nameAr: "الشقفة", lat: 36.78, lng: 5.96 },
      { name: "Ziama Mansouriah", nameAr: "زيامة منصورية", lat: 36.67, lng: 5.48 },
      { name: "Emir Abdelkader", nameAr: "الأمير عبد القادر", lat: 36.76, lng: 6.03 },
      { name: "Selma Benziada", nameAr: "سلمى بن زيادة", lat: 36.68, lng: 5.62 },
    ],
  },
  "06_bejaia": {
    code: "06_bejaia",
    numericCode: "06",
    labelAr: "بجاية",
    labelPillAr: "06 بجاية",
    labelShortAr: "بجاية",
    center: [36.75, 5.06],
    zoom: 11,
    maxBounds: [
      [36.35, 4.55],
      [37.05, 5.55],
    ],
    communes: [
      { name: "Bejaia", nameAr: "بجاية", lat: 36.75, lng: 5.08 },
      { name: "Akbou", nameAr: "أقبو", lat: 36.46, lng: 4.53 },
      { name: "Amizour", nameAr: "أميزور", lat: 36.64, lng: 4.91 },
      { name: "Kherrata", nameAr: "خراطة", lat: 36.5, lng: 5.28 },
      { name: "Tichy", nameAr: "تيشي", lat: 36.67, lng: 5.16 },
      { name: "Aokas", nameAr: "أوقاس", lat: 36.64, lng: 5.25 },
      { name: "Seddouk", nameAr: "صدوق", lat: 36.55, lng: 4.7 },
      { name: "Darguina", nameAr: "درقينة", lat: 36.55, lng: 5.32 },
      { name: "Barbacha", nameAr: "برباشة", lat: 36.57, lng: 4.97 },
      { name: "Adekar", nameAr: "أدكار", lat: 36.72, lng: 4.68 },
      { name: "Timezrit", nameAr: "تيمزريت", lat: 36.64, lng: 4.78 },
      { name: "El Kseur", nameAr: "القصر", lat: 36.68, lng: 4.85 },
    ],
  },
  "21_skikda": {
    code: "21_skikda",
    numericCode: "21",
    labelAr: "سكيكدة",
    labelPillAr: "21 سكيكدة",
    labelShortAr: "سكيكدة",
    center: [36.87, 6.9],
    zoom: 11,
    maxBounds: [
      [36.45, 6.45],
      [37.15, 7.35],
    ],
    communes: [
      { name: "Skikda", nameAr: "سكيكدة", lat: 36.88, lng: 6.91 },
      { name: "Collo", nameAr: "القل", lat: 37.0, lng: 6.57 },
      { name: "Tamalous", nameAr: "تمالوس", lat: 36.84, lng: 6.64 },
      { name: "El Harrouch", nameAr: "الحروش", lat: 36.65, lng: 6.84 },
      { name: "Azzaba", nameAr: "عزابة", lat: 36.74, lng: 7.11 },
      { name: "Ain Kechra", nameAr: "عين قشرة", lat: 36.95, lng: 6.55 },
      { name: "Zitouna", nameAr: "الزيتونة", lat: 37.03, lng: 6.47 },
      { name: "Ben Azzouz", nameAr: "بن عزوز", lat: 36.86, lng: 7.22 },
      { name: "Oum Toub", nameAr: "أم الطوب", lat: 36.7, lng: 6.58 },
      { name: "Ramdane Djamel", nameAr: "رمضان جمال", lat: 36.75, lng: 6.9 },
    ],
  },
  "19_setif": {
    code: "19_setif",
    numericCode: "19",
    labelAr: "سطيف",
    labelPillAr: "19 سطيف",
    labelShortAr: "سطيف",
    center: [36.45, 5.4],
    zoom: 11,
    maxBounds: [
      [35.95, 4.95],
      [36.65, 5.85],
    ],
    communes: [
      { name: "Setif", nameAr: "سطيف", lat: 36.19, lng: 5.41 },
      { name: "Babor", nameAr: "بابور", lat: 36.49, lng: 5.54 },
      { name: "Amoucha", nameAr: "عموشة", lat: 36.38, lng: 5.66 },
      { name: "Beni Ourtilane", nameAr: "بني ورتيلان", lat: 36.45, lng: 4.87 },
      { name: "Ain El Kebira", nameAr: "عين الكبيرة", lat: 36.36, lng: 5.5 },
      { name: "Bouandas", nameAr: "بوعنداس", lat: 36.5, lng: 5.1 },
      { name: "Guenzet", nameAr: "قنزات", lat: 36.32, lng: 4.84 },
      { name: "Ain Arnat", nameAr: "عين أرنات", lat: 36.18, lng: 5.32 },
      { name: "Bougaa", nameAr: "بوقاعة", lat: 36.33, lng: 5.09 },
      { name: "Guidjel", nameAr: "قجال", lat: 36.1, lng: 5.52 },
    ],
  },
};

/** Static commune (EN/AR) → wilaya lookup for tagging submissions. */
const COMMUNE_TO_WILAYA = new Map<string, WilayaCode>();

function normalizeCommuneKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
}

for (const code of WILAYA_CODES) {
  for (const commune of WILAYA_DEFINITIONS[code].communes) {
    COMMUNE_TO_WILAYA.set(normalizeCommuneKey(commune.name), code);
    COMMUNE_TO_WILAYA.set(normalizeCommuneKey(commune.nameAr), code);
  }
}

/** Outer envelope covering all supported wilayas (tile cache + map lock). */
export const MULTI_WILAYA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [35.9, 4.5],
  [37.2, 7.4],
];

export const WILAYA_STORAGE_KEY = "ighata:active-wilaya";
export const WILAYA_TILE_REGION_MESSAGE = "ighata:set-tile-region";

export function isWilayaCode(value: unknown): value is WilayaCode {
  return (
    typeof value === "string" &&
    (WILAYA_CODES as readonly string[]).includes(value)
  );
}

export function getWilayaDefinition(code: WilayaCode): WilayaDefinition {
  return WILAYA_DEFINITIONS[code];
}

/** Priority Arabic commune names shown in the map filter rail (ordered). */
export const WILAYA_FILTER_RAIL_AR: Record<WilayaCode, readonly string[]> = {
  "18_jijel": [
    "تكسنة",
    "العنصر",
    "الطاهير",
    "الميلية",
    "جيملة",
    "بوراوي بلهادف",
    "أولاد عسكر",
    "أولاد رابح",
    "السطارة",
    "سيدي معروف",
    "الشقفة",
    "زيامة منصورية",
  ],
  "06_bejaia": [
    "خراطة",
    "أوقاس",
    "أميزور",
    "تيشي",
    "أقبو",
    "صدوق",
    "برباشة",
  ],
  "21_skikda": [
    "القل",
    "تمالوس",
    "الحروش",
    "عزابة",
    "عين قشرة",
    "الزيتونة",
  ],
  "19_setif": [
    "بابور",
    "عموشة",
    "بني ورتيلان",
    "عين الكبيرة",
    "بوعنداس",
  ],
};

export function getFilterRailCommunes(code: WilayaCode): WilayaCommune[] {
  const def = WILAYA_DEFINITIONS[code];
  const order = WILAYA_FILTER_RAIL_AR[code];
  const byAr = new Map(
    def.communes.map((c) => [c.nameAr.trim(), c] as const),
  );
  return order
    .map((nameAr) => byAr.get(nameAr))
    .filter((c): c is WilayaCommune => Boolean(c));
}

/** Reject oceanic / out-of-belt latitudes that pull clusters mid-sea. */
export function isClusterSafeLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= 36.1 && lat <= 37.05;
}

export function parseWilayaParam(
  value: string | null | undefined,
): WilayaCode {
  if (value && isWilayaCode(value)) return value;
  return DEFAULT_WILAYA;
}

export function getCommunesForWilaya(code: WilayaCode): WilayaCommune[] {
  return WILAYA_DEFINITIONS[code].communes;
}

export function resolveWilayaForCommune(
  communeName: string | null | undefined,
  fallback: WilayaCode = DEFAULT_WILAYA,
): WilayaCode {
  if (!communeName?.trim()) return fallback;
  return COMMUNE_TO_WILAYA.get(normalizeCommuneKey(communeName)) ?? fallback;
}

export function findCommuneInWilaya(
  code: WilayaCode,
  communeName: string,
): WilayaCommune | undefined {
  const key = normalizeCommuneKey(communeName);
  return WILAYA_DEFINITIONS[code].communes.find(
    (c) =>
      normalizeCommuneKey(c.name) === key ||
      normalizeCommuneKey(c.nameAr) === key,
  );
}
