import type {
  ConvoyCargoType,
  ConvoyEntryPoint,
  ConvoyVehicleType,
} from "@/db/schema";

export const ALGERIAN_WILAYAS: Array<{ value: string; labelAr: string }> = [
  { value: "Adrar", labelAr: "أدرار" },
  { value: "Chlef", labelAr: "الشلف" },
  { value: "Laghouat", labelAr: "الأغواط" },
  { value: "Oum El Bouaghi", labelAr: "أم البواقي" },
  { value: "Batna", labelAr: "باتنة" },
  { value: "Bejaia", labelAr: "بجاية" },
  { value: "Biskra", labelAr: "بسكرة" },
  { value: "Bechar", labelAr: "بشار" },
  { value: "Blida", labelAr: "البليدة" },
  { value: "Bouira", labelAr: "البويرة" },
  { value: "Tamanrasset", labelAr: "تمنراست" },
  { value: "Tebessa", labelAr: "تبسة" },
  { value: "Tlemcen", labelAr: "تلمسان" },
  { value: "Tiaret", labelAr: "تيارت" },
  { value: "Tizi Ouzou", labelAr: "تيزي وزو" },
  { value: "Algiers", labelAr: "الجزائر" },
  { value: "Djelfa", labelAr: "الجلفة" },
  { value: "Jijel", labelAr: "جيجل" },
  { value: "Setif", labelAr: "سطيف" },
  { value: "Saida", labelAr: "سعيدة" },
  { value: "Skikda", labelAr: "سكيكدة" },
  { value: "Sidi Bel Abbes", labelAr: "سيدي بلعباس" },
  { value: "Annaba", labelAr: "عنابة" },
  { value: "Guelma", labelAr: "قالمة" },
  { value: "Constantine", labelAr: "قسنطينة" },
  { value: "Medea", labelAr: "المدية" },
  { value: "Mostaganem", labelAr: "مستغانم" },
  { value: "M'Sila", labelAr: "المسيلة" },
  { value: "Mascara", labelAr: "معسكر" },
  { value: "Ouargla", labelAr: "ورقلة" },
  { value: "Oran", labelAr: "وهران" },
  { value: "El Bayadh", labelAr: "البيض" },
  { value: "Illizi", labelAr: "إيليزي" },
  { value: "Bordj Bou Arreridj", labelAr: "برج بوعريريج" },
  { value: "Boumerdes", labelAr: "بومرداس" },
  { value: "El Tarf", labelAr: "الطارف" },
  { value: "Tindouf", labelAr: "تندوف" },
  { value: "Tissemsilt", labelAr: "تيسمسيلت" },
  { value: "El Oued", labelAr: "الوادي" },
  { value: "Khenchela", labelAr: "خنشلة" },
  { value: "Souk Ahras", labelAr: "سوق أهراس" },
  { value: "Tipaza", labelAr: "تيبازة" },
  { value: "Mila", labelAr: "ميلة" },
  { value: "Ain Defla", labelAr: "عين الدفلى" },
  { value: "Naama", labelAr: "النعامة" },
  { value: "Ain Temouchent", labelAr: "عين تموشنت" },
  { value: "Ghardaia", labelAr: "غرداية" },
  { value: "Relizane", labelAr: "غليزان" },
  { value: "Timimoun", labelAr: "تيميمون" },
  { value: "Bordj Badji Mokhtar", labelAr: "برج باجي مختار" },
  { value: "Ouled Djellal", labelAr: "أولاد جلال" },
  { value: "Beni Abbes", labelAr: "بني عباس" },
  { value: "In Salah", labelAr: "عين صالح" },
  { value: "In Guezzam", labelAr: "عين قزام" },
  { value: "Touggourt", labelAr: "تقرت" },
  { value: "Djanet", labelAr: "جانت" },
  { value: "El M'Ghair", labelAr: "المغير" },
  { value: "El Meniaa", labelAr: "المنيعة" },
];

export const CONVOY_VEHICLE_OPTIONS: Array<{
  value: ConvoyVehicleType;
  labelAr: string;
}> = [
  { value: "truck", labelAr: "شاحنة (حمولة ثقيلة)" },
  { value: "pickup_4x4", labelAr: "4x4 / بيك أب" },
  { value: "van", labelAr: "شاحنة صغيرة / فان" },
  { value: "bus", labelAr: "حافلة متطوعين" },
];

export const CONVOY_CARGO_OPTIONS: Array<{
  value: ConvoyCargoType;
  labelAr: string;
}> = [
  { value: "food", labelAr: "أغذية" },
  { value: "farm_equipment", labelAr: "عتاد فلاحي" },
  { value: "blankets", labelAr: "أغطية" },
  { value: "medicine", labelAr: "أدوية" },
  { value: "mixed", labelAr: "حمولة مختلطة" },
];

export const CONVOY_ENTRY_OPTIONS: Array<{
  value: ConvoyEntryPoint;
  labelAr: string;
}> = [
  { value: "bejaia_west", labelAr: "مدخل بجاية الغربي" },
  { value: "setif_south", labelAr: "مدخل سطيف الجنوبي" },
  { value: "skikda_east", labelAr: "مدخل سكيكدة الشرقي" },
];

export type WaypointType =
  | "lodging"
  | "kitchen"
  | "fuel"
  | "warehouse"
  | "reception";

export const WAYPOINT_TYPE_LABELS: Record<
  WaypointType,
  { labelAr: string; icon: string }
> = {
  lodging: { labelAr: "مبيت وإيواء مجاني", icon: "🛏️" },
  kitchen: { labelAr: "مطابخ ومطاعم تضامنية", icon: "🍲" },
  fuel: { labelAr: "محطات بنزين", icon: "⛽" },
  warehouse: { labelAr: "مستودعات تخزين", icon: "📦" },
  reception: { labelAr: "نقاط الاستقبال والتوجيه", icon: "🚩" },
};

export function getWilayaLabel(value: string): string {
  return ALGERIAN_WILAYAS.find((wilaya) => wilaya.value === value)?.labelAr ?? value;
}

export function getEntryPointLabel(value: ConvoyEntryPoint): string {
  return (
    CONVOY_ENTRY_OPTIONS.find((entry) => entry.value === value)?.labelAr ?? value
  );
}

export function buildConvoyGuideAssignUrl(convoyId: number): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/guide?convoyId=${convoyId}&assignGuide=1`;
  }

  return `/guide?convoyId=${convoyId}&assignGuide=1`;
}
