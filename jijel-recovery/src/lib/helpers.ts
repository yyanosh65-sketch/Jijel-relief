import type { HelperSkill } from "@/db/schema";

export const HELPER_SKILL_OPTIONS: Array<{
  value: HelperSkill;
  labelAr: string;
  badgeAr: string;
}> = [
  {
    value: "transport_4x4",
    labelAr: "🚙 نقل وسيارة 4x4 للمسالك الوعرة",
    badgeAr: "سيارة 4x4 واجدة",
  },
  {
    value: "cargo_truck",
    labelAr: "🚚 شاحنة لنقل المؤن والعتاد",
    badgeAr: "شاحنة نقل",
  },
  {
    value: "vet_livestock",
    labelAr: "🩺 إسعاف وعناية بيطرية بالمواشي",
    badgeAr: "بيطري متطوع",
  },
  {
    value: "first_aid",
    labelAr: "🩹 تمريض وإسعافات أولية",
    badgeAr: "إسعافات أولية",
  },
  {
    value: "construction",
    labelAr: "🔨 حرفي وبناء (ترميم الديار)",
    badgeAr: "حرفي ترميم",
  },
  {
    value: "hosting",
    labelAr: "🏠 استعداد لإيواء عائلة مؤقتاً",
    badgeAr: "إيواء متاح",
  },
  {
    value: "general_volunteer",
    labelAr: "🙋‍♂️ متطوع ميداني عام",
    badgeAr: "متطوع ميداني",
  },
];

export function getHelperSkillBadge(skill: HelperSkill): string {
  return (
    HELPER_SKILL_OPTIONS.find((option) => option.value === skill)?.badgeAr ??
    skill
  );
}

export function getHelperSkillLabel(skill: HelperSkill): string {
  return (
    HELPER_SKILL_OPTIONS.find((option) => option.value === skill)?.labelAr ??
    skill
  );
}

export function formatHelperSkillBadges(skills: HelperSkill[]): string {
  if (skills.length === 0) {
    return "متطوع مجتمعي";
  }

  return getHelperSkillBadge(skills[0]);
}

export function formatHelperSkillsSubtitle(skills: HelperSkill[]): string {
  return skills.map((skill) => getHelperSkillBadge(skill)).join(" · ");
}
