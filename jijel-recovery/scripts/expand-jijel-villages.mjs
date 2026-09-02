import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const locationsPath = join(root, "src/data/jijel-locations.json");
const locations = JSON.parse(readFileSync(locationsPath, "utf8"));

/** @type {Record<string, { commune: string, commune_ar: string, daira: string, daira_ar: string, lat: number, lng: number, road?: string }>} */
const communeLookup = {};
for (const daira of locations.dairas) {
  for (const commune of daira.communes) {
    communeLookup[commune.name_ar] = {
      commune: commune.name,
      commune_ar: commune.name_ar,
      daira: daira.name,
      daira_ar: daira.name_ar,
      lat: commune.lat,
      lng: commune.lng,
      road: commune.road_accessibility,
    };
  }
}

function village(communeAr, nameAr, lat, lng, landmark, roadOverride) {
  const base = communeLookup[communeAr];
  if (!base) {
    throw new Error(`Unknown commune: ${communeAr}`);
  }
  return {
    name: nameAr.replace(/\s+/g, " "),
    name_ar: nameAr,
    commune: base.commune,
    commune_ar: base.commune_ar,
    daira: base.daira,
    daira_ar: base.daira_ar,
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
    exact_address_ar: `دشرة ${nameAr}، بلدية ${base.commune_ar}، دائرة ${base.daira_ar}، ولاية جيجل`,
    landmark: landmark ?? `منعرج دخول دشرة ${nameAr}`,
    road_accessibility:
      roadOverride ?? base.road ?? "mountain_4x4_only",
  };
}

/** Verified relief-belt coordinates — El Ancer daira + Ouled Askeur (Boucif) + El Milia coast. */
const VILLAGE_DEFINITIONS = [
  // دائرة العنصر — بلدية العنصر
  ["العنصر", "بني عائشة", 36.6892, 5.8614],
  ["العنصر", "المحارب", 36.6781, 5.8442],
  ["العنصر", "تاسيفت", 36.6658, 5.8721],
  ["العنصر", "زرزور", 36.6814, 5.8356],
  ["العنصر", "أولاد معنصر", 36.6703, 5.8589],
  ["العنصر", "بولحدايد", 36.6755, 5.8478],
  // دائرة العنصر — جمعة بني حبيبي
  ["جمعة بني حبيبي", "تابلوط", 36.6924, 5.8048],
  ["جمعة بني حبيبي", "السبت", 36.6762, 5.8125],
  ["جمعة بني حبيبي", "قاع البير", 36.6889, 5.8267],
  ["جمعة بني حبيبي", "بني عياش", 36.6795, 5.8198],
  ["جمعة بني حبيبي", "تمزرار", 36.6868, 5.8312],
  // دائرة العنصر — بوراوي بلهادف
  ["بوراوي بلهادف", "أولاد رابح", 36.6442, 5.8915],
  ["بوراوي بلهادف", "الكراكرة", 36.6587, 5.8754],
  ["بوراوي بلهادف", "الزاويت", 36.6491, 5.8682],
  ["بوراوي بلهادف", "أولاد علي", 36.6538, 5.8846],
  // دائرة العنصر — خيري واد عجول
  ["خيري واد عجول", "بني مسلم", 36.7115, 5.879],
  ["خيري واد عجول", "بني بلعيد", 36.6965, 5.891],
  ["خيري واد عجول", "واد عجول", 36.7028, 5.8681],
  ["خيري واد عجول", "شاطئ واد عجول", 36.7182, 5.9024],
  // دائرة الطاهير — بوصيف أولاد عسكر (Ouled Askeur belt)
  ["بوصيف أولاد عسكر", "لمنزل", 36.655, 6.012],
  ["بوصيف أولاد عسكر", "سوق السبت", 36.6485, 6.0165],
  ["بوصيف أولاد عسكر", "قاع الزان", 36.6427, 6.021],
  ["بوصيف أولاد عسكر", "المنار", 36.651, 6.018],
  ["بوصيف أولاد عسكر", "لخساف", 36.6385, 6.0145],
  // دائرة الطاهير — الشحنة
  ["الشحنة", "بني خطاب", 36.7948, 5.8912],
  ["الشحنة", "بوشارف", 36.8086, 5.8764],
  ["الشحنة", "تيزي غيلاس", 36.7862, 5.8695],
  ["الشحنة", "أولاد فاطمة", 36.7991, 5.9023],
  // دائرة تكسنة
  ["تكسنة", "كعوان", 36.6631, 5.791],
  ["تكسنة", "الحدادة", 36.6489, 5.7684],
  ["تكسنة", "آيت علي", 36.6617, 5.7878],
  ["تكسنة", "الحامة", 36.6524, 5.7796],
  // دائرة جيملة
  ["جيملة", "العرابة", 36.9142, 5.7518],
  ["جيملة", "الميدان", 36.9268, 5.7642],
  ["جيملة", "الشريعة", 36.9086, 5.7725],
  // دائرة سيدي معروف
  ["سيدي معروف", "تمزرين", 36.6201, 6.1823],
  ["سيدي معروف", "السند", 36.7018, 5.9214],
  ["سيدي معروف", "بوالرماد", 36.7156, 5.8967],
  // دائرة الميلية — eastern relief belt
  ["الميلية", "بوتياس", 36.741, 6.284],
  ["الميلية", "أسردون", 36.7428, 6.0156],
  ["الميلية", "مشاط", 36.7547, 6.2745],
  ["الميلية", "تنفدور", 36.7491, 6.0328],
  // دائرة زيامة منصورية
  ["زيامة منصورية", "تيزي نيزنت", 36.671, 5.483],
  ["زيامة منصورية", "إراقن سويسي", 36.5744, 5.4522],
  ["زيامة منصورية", "الكهوف العجيبة", 36.5821, 5.4688],
];

// Sync verified commune centers for the affected belt.
const COMMUNE_CENTER_PATCHES = {
  "بوصيف أولاد عسكر": { lat: 36.6428, lng: 6.0192 },
};

for (const daira of locations.dairas) {
  for (const commune of daira.communes) {
    const patch = COMMUNE_CENTER_PATCHES[commune.name_ar];
    if (patch) {
      commune.lat = patch.lat;
      commune.lng = patch.lng;
    }
  }
}

locations.villages = VILLAGE_DEFINITIONS.map(([communeAr, nameAr, lat, lng]) =>
  village(communeAr, nameAr, lat, lng),
);

writeFileSync(locationsPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");
console.log(`Wrote ${locations.villages.length} villages to jijel-locations.json`);
