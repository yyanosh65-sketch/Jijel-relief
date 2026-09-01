export const JIJEL_DAIRAS = [
  "Jijel",
  "Taher",
  "El Aouana",
  "Texenna",
  "Ziama Mansouriah",
  "El Ancer",
  "Djimla",
  "Kaous",
  "Settara",
  "Erraguene",
] as const;

export type JijelDaira = (typeof JIJEL_DAIRAS)[number];

export const QUANTITY_UNITS = [
  { value: "pieces", labelFr: "Pièces", labelDz: "قطع" },
  { value: "trees", labelFr: "Arbres", labelDz: "أشجار" },
  { value: "heads", labelFr: "Têtes (bétail)", labelDz: "رؤوس (بقر)" },
  { value: "kg", labelFr: "Kilogrammes", labelDz: "كيلوغرام" },
  { value: "liters", labelFr: "Litres", labelDz: "لتر" },
  { value: "kits", labelFr: "Kits", labelDz: "حزم" },
  { value: "families", labelFr: "Familles", labelDz: "عائلات" },
] as const;

export type QuantityUnit = (typeof QUANTITY_UNITS)[number]["value"];
