export type RoadCorridorStatus = "open" | "heavy_traffic" | "difficult_4x4";

export type RoadCorridor = {
  id: string;
  route: string;
  labelAr: string;
  axisAr: string;
  status: RoadCorridorStatus;
  noteAr: string;
};

export const JIJEL_ENTRY_CORRIDORS: RoadCorridor[] = [
  {
    id: "rn43-coastal",
    route: "RN43",
    labelAr: "الساحلي — دخول عبر بجاية / سكيكدة",
    axisAr: "المدخل الغربي والشرقي",
    status: "open",
    noteAr: "سلكت — مناسب للشاحنات الثقيلة مع تنسيق مسبق",
  },
  {
    id: "rn27-milia",
    route: "RN27",
    labelAr: "الميلية — ميلة / قسنطينة",
    axisAr: "المدخل الشرقي",
    status: "heavy_traffic",
    noteAr: "حركة سير كثيفة — فضّل التفريغ في سيدي معروف",
  },
  {
    id: "rn77-mountain",
    route: "RN77",
    labelAr: "الممر الجبلي جيجل — ميلة",
    axisAr: "المدخل الجبلي الجنوبي الشرقي",
    status: "difficult_4x4",
    noteAr: "صعبة للمركبات الثقيلة — يُنصح بمرافق 4x4",
  },
];

export const ROAD_STATUS_LABELS: Record<RoadCorridorStatus, string> = {
  open: "سلكت (Open)",
  heavy_traffic: "حركة سير كثيفة (Heavy Traffic)",
  difficult_4x4: "صعبة للمركبات الثقيلة (4x4)",
};

export const ROAD_STATUS_STYLES: Record<
  RoadCorridorStatus,
  { badge: string; dot: string }
> = {
  open: {
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-400",
  },
  heavy_traffic: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    dot: "bg-amber-400",
  },
  difficult_4x4: {
    badge: "border-rose-500/40 bg-rose-500/15 text-rose-200",
    dot: "bg-rose-400",
  },
};
