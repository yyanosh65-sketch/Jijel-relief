import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const MOUNTAIN_COMMUNES = new Set([
  "texenna",
  "kaous",
  "ziama mansouriah",
  "eraguene",
  "bouraoui belhadef",
  "djemaa beni habibi",
  "djimla",
  "boudriaa ben yadjis",
  "ghebala",
  "selma benziada",
  "settara",
  "taher",
  "taher",
]);

const MOUNTAIN_DAIRAS = new Set(["el ancer", "djimla", "texenna", "ziama mansouriah"]);

const LIGHT_VEHICLE_COMMUNES = new Set([
  "bouraoui belhadef",
  "djemaa beni habibi",
  "kheïri oued adjoul",
  "ghebala",
]);

function normalize(value) {
  return value.trim().toLowerCase();
}

function defaultRoadAccessibility(commune, daira) {
  const communeKey = normalize(commune.name);
  const communeArKey = normalize(commune.name_ar);
  const dairaKey = normalize(daira.name);

  if (
    MOUNTAIN_COMMUNES.has(communeKey) ||
    MOUNTAIN_COMMUNES.has(communeArKey) ||
    MOUNTAIN_DAIRAS.has(dairaKey)
  ) {
    if (
      LIGHT_VEHICLE_COMMUNES.has(communeKey) ||
      normalize(daira.name).includes("el ancer")
    ) {
      return "light_vehicles";
    }
    return "mountain_4x4_only";
  }

  return "paved_heavy_truck";
}

function enrichCommune(commune, daira) {
  const road_accessibility =
    commune.road_accessibility ?? defaultRoadAccessibility(commune, daira);

  const exact_address_ar =
    commune.exact_address_ar ??
    (road_accessibility === "mountain_4x4_only"
      ? `دشرة ${commune.name_ar}، دائرة ${daira.name_ar}، ولاية جيجل`
      : `مركز بلدية ${commune.name_ar}، دائرة ${daira.name_ar}، ولاية جيجل`);

  const landmark =
    commune.landmark ??
    (road_accessibility === "mountain_4x4_only"
      ? `منعرج دخول دشرة ${commune.name_ar}`
      : `مركز بلدية ${commune.name_ar}`);

  return {
    ...commune,
    lat: Number(commune.lat.toFixed(4)),
    lng: Number(commune.lng.toFixed(4)),
    exact_address_ar,
    landmark,
    road_accessibility,
  };
}

const locationsPath = join(root, "src/data/jijel-locations.json");
const locations = JSON.parse(readFileSync(locationsPath, "utf8"));

for (const daira of locations.dairas) {
  daira.communes = daira.communes.map((commune) => enrichCommune(commune, daira));
}

writeFileSync(locationsPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");
console.log("Enriched jijel-locations.json");

const contactOverrides = {
  "المستودع الولائي الموحد - حي الرابطة": {
    exact_address_ar:
      "حي الرابطة، شارع الاستقلال قرب القاعة البيضاوية، وسط جيجل",
    landmark: "القاعة البيضاوية — مفترق حي الرابطة",
    road_accessibility: "paved_heavy_truck",
  },
  "نقطة تجميع وتوجيه الشاحنات - الطاهير": {
    exact_address_ar: "وسط الطاهير، بجانب السوق المغطى القديم",
    landmark: "السوق المغطى القديم — مركز بلدية الطاهير",
    road_accessibility: "paved_heavy_truck",
  },
  "نقطة تفريغ وتوزيع العتاد الفلاحي - الميلية": {
    exact_address_ar: "المنطقة الحرفية، طريق بوتياس، الميلية",
    landmark: "مفترق المنطقة الحرفية — طريق بوتياس",
    road_accessibility: "paved_heavy_truck",
  },
  "فوج الإنقاذ وإخلاء الماشية - أعالي تاكسنة وجيملة": {
    exact_address_ar:
      "أعالي تاكسنة، تغطية مداشر كعوان والحامة والحدادة، مسلك جبلي",
    landmark: "منعرج مداشر كعوان — مسلك 4x4",
    road_accessibility: "mountain_4x4_only",
  },
  "فرقة التدخل واللوجستيك الجبلي (أعالي العوانة)": {
    exact_address_ar:
      "أعالي العوانة، تغطية مداشر سلمى بن زيادة والتيميدار",
    landmark: "منعرج مداشر سلمى بن زيادة",
    road_accessibility: "mountain_4x4_only",
  },
  "خلية الإسعاف البيطري المتنقل - دائرة الطاهير": {
    exact_address_ar:
      "مقر المفتشية البيطرية، بلدية الأمير عبد القادر، دائرة الطاهير",
    landmark: "المفتشية البيطرية — مركز الأمير عبد القادر",
    road_accessibility: "light_vehicles",
  },
  "لجنة دشرة تيزي نيزنت - زيامة منصورية": {
    exact_address_ar:
      "أعالي الكهوف العجيبة، دشرة تيزي نيزنت، الطريق الوطني RN43",
    landmark: "منعرج دخول دشرة تيزي نيزنت — RN43",
    road_accessibility: "mountain_4x4_only",
  },
  "لجنة قرية آيت علي - تاكسنة": {
    exact_address_ar: "قرية آيت علي، مقر لجنة المسجد، بلدية تاكسنة",
    landmark: "مسجد آيت علي — مفترق القرية",
    road_accessibility: "mountain_4x4_only",
  },
  "خلية تنسيق دشرة إراقن سويسي": {
    exact_address_ar: "أعالي السد، مدرسة الشهداء، دشرة إراقن سويسي",
    landmark: "مدرسة الشهداء — أعالي السد",
    road_accessibility: "mountain_4x4_only",
  },
  "لجنة مداشر بني خطاب والشحنة": {
    exact_address_ar: "دوار بني خطاب، وسط بلدية الشحنة، دائرة الطاهير",
    landmark: "دوار بني خطاب — مركز الشحنة",
    road_accessibility: "light_vehicles",
  },
  "لجنة قرية تمزرين - سيدي معروف": {
    exact_address_ar: "قرية تمزرين قرب منعرجات غبالة، سيدي معروف",
    landmark: "منعرجات غبالة — مدخل تمزرين",
    road_accessibility: "light_vehicles",
  },
};

const contactsPath = join(root, "src/data/relief-contacts.json");
const contacts = JSON.parse(readFileSync(contactsPath, "utf8"));

const enrichedContacts = contacts.map((contact) => {
  const override = contactOverrides[contact.name];
  const road_accessibility =
    override?.road_accessibility ??
    (contact.category === "field_team"
      ? "mountain_4x4_only"
      : contact.category === "village_lead"
        ? "mountain_4x4_only"
        : "paved_heavy_truck");

  return {
    ...contact,
    lat: Number(contact.lat.toFixed(4)),
    lng: Number(contact.lng.toFixed(4)),
    exact_address_ar:
      override?.exact_address_ar ??
      `${contact.location_details}، بلدية ${contact.commune}، ولاية جيجل`,
    landmark:
      override?.landmark ??
      `مفترق ${contact.commune} — ${contact.location_details}`,
    road_accessibility,
  };
});

writeFileSync(contactsPath, `${JSON.stringify(enrichedContacts, null, 2)}\n`, "utf8");
console.log("Enriched relief-contacts.json");
