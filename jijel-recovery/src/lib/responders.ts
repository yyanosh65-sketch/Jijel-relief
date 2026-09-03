import type { ResponderRole, ResponderStatus } from "@/db/schema";

export const RESPONDER_ROLE_LABELS: Record<ResponderRole, string> = {
  doctor: "طبيب",
  paramedic: "ممرض / إسعاف",
  psychologist: "أخصائي نفسي",
  food_distribution: "توزيع غذاء",
  clearing_debris: "إزالة أنقاض",
  logistics_driver: "سائق لوجستيك",
  general_volunteer: "متطوع عام",
};

export const RESPONDER_STATUS_LABELS: Record<ResponderStatus, string> = {
  en_route: "في الطريق",
  on_site: "في الميدان",
  completed: "اكتمل",
};

export type ResponderBadgeCounts = {
  medical: number;
  logistics: number;
  food: number;
  total: number;
};

export function emptyBadgeCounts(): ResponderBadgeCounts {
  return { medical: 0, logistics: 0, food: 0, total: 0 };
}

export function roleToBadgeBucket(
  role: ResponderRole,
): keyof Omit<ResponderBadgeCounts, "total"> | null {
  if (role === "doctor" || role === "paramedic" || role === "psychologist") {
    return "medical";
  }
  if (role === "logistics_driver" || role === "clearing_debris") {
    return "logistics";
  }
  if (role === "food_distribution" || role === "general_volunteer") {
    return "food";
  }
  return null;
}

export function summarizeResponderBadges(
  roles: ResponderRole[],
): ResponderBadgeCounts {
  const counts = emptyBadgeCounts();
  for (const role of roles) {
    const bucket = roleToBadgeBucket(role);
    if (!bucket) continue;
    counts[bucket] += 1;
    counts.total += 1;
  }
  return counts;
}

export function formatResponderBadgeHtml(counts: ResponderBadgeCounts): string {
  if (counts.total <= 0) return "";

  const parts: string[] = [];
  if (counts.medical > 0) parts.push(`🩺${counts.medical}`);
  if (counts.logistics > 0) parts.push(`🚚${counts.logistics}`);
  if (counts.food > 0) parts.push(`🍞${counts.food}`);

  return parts.join(" ");
}
