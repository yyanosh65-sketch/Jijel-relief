"use client";

import { useMemo, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";

import FieldDispatchPanel from "@/components/intel/FieldDispatchPanel";
import { cn } from "@/lib/utils";

const FIELD_PROMPTS = [
  "واش يخصهم درك بالظبط؟",
  "كاش طريق ساهلة نوصل بيها؟",
  "شكون نقدر نتاصل بيه تم؟",
] as const;

const WILAYA_PROMPTS = [
  "ملخص وضع الولاية كاملة",
  "أكثر المناطق تضرراً حالياً",
  "حالة المحاور الرئيسية (RN43 / RN27 / RN77)",
] as const;

type SectionKind = "gaps" | "routes" | "cautions" | "other";

type ParsedSection = {
  kind: SectionKind;
  title: string;
  items: string[];
};

const SECTION_META: Record<
  Exclude<SectionKind, "other">,
  { title: string; badge: string; tone: string }
> = {
  gaps: {
    title: "العجز المتبقي",
    badge: "🚨",
    tone: "border-rose-500/35 bg-rose-500/10 text-rose-100",
  },
  routes: {
    title: "المسالك المفتوحة",
    badge: "🚛",
    tone: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100",
  },
  cautions: {
    title: "تنبيه هام",
    badge: "⚠️",
    tone: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  },
};

function classifyHeading(line: string): SectionKind | null {
  const normalized = line.replace(/^[#*\s•\-]+/, "").trim();
  if (/🚨|العجز|فراغ|ناقص|يخصهم|تغطية|الاحتياج/i.test(normalized)) {
    return "gaps";
  }
  if (/🚛|🧭|المسالك|طريق|مسلك|RN43|RN27|RN77|CW135/i.test(normalized)) {
    return "routes";
  }
  if (/⚠️|تنبيه|منع التكرار|فائض|تحذير|نصيحة/i.test(normalized)) {
    return "cautions";
  }
  return null;
}

function parseAgentResponse(text: string): ParsedSection[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  const pushCurrent = () => {
    if (current && current.items.length > 0) {
      sections.push(current);
    }
  };

  for (const line of lines) {
    const headingKind = classifyHeading(line);
    const looksLikeHeading =
      headingKind &&
      (line.length < 80 ||
        /^(🚨|🚛|⚠️|🧭|🔍|📌)/.test(line) ||
        /:$/.test(line) ||
        /العجز|المسالك|تنبيه|منع التكرار|توجيه/.test(line));

    if (headingKind && looksLikeHeading) {
      pushCurrent();
      const meta =
        headingKind === "other" ? null : SECTION_META[headingKind];
      current = {
        kind: headingKind,
        title: meta ? `${meta.badge} ${meta.title}` : line.replace(/:$/, ""),
        items: [],
      };
      continue;
    }

    const bullet = line.replace(/^([•\-*]|\d+[.)])\s*/, "").trim();
    if (!current) {
      current = {
        kind: "other",
        title: "ملخص",
        items: [],
      };
    }
    if (bullet) {
      current.items.push(bullet);
    }
  }

  pushCurrent();

  if (sections.length === 0 && text.trim()) {
    return [
      {
        kind: "other",
        title: "ملخص",
        items: text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
      },
    ];
  }

  return sections;
}

type SmartDispatchAgentProps = {
  needId?: number | null;
  settlementId?: number | null;
  /** `wilaya` = global Jijel coordinator (no point required) */
  scope?: "field" | "wilaya";
  /** Hide chrome when parent drawer already shows the title */
  hideHeader?: boolean;
  className?: string;
};

export default function SmartDispatchAgent({
  needId,
  settlementId,
  scope = "field",
  hideHeader = false,
  className,
}: SmartDispatchAgentProps) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const isWilaya = scope === "wilaya";
  const prompts = isWilaya ? WILAYA_PROMPTS : FIELD_PROMPTS;

  const sections = useMemo(
    () => (answer ? parseAgentResponse(answer) : []),
    [answer],
  );

  async function ask(query: string) {
    setLoading(true);
    setError(null);
    setActiveChip(query);
    setAnswer(null);

    const offlineFallback =
      "تعذر الاتصال بمركز التوجيه الآلي حالياً. يرجى الاتصال مباشرة بالحماية المدنية (14) أو مراجعة قائمة الاحتياجات الميدانية.";

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "field",
          needId: isWilaya ? null : (needId ?? null),
          settlementId: isWilaya ? null : (settlementId ?? null),
          query,
        }),
      });

      const json = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok && !json.text) {
        console.error("Agent query failed:", json.error ?? response.statusText);
        setError(json.error ?? offlineFallback);
        return;
      }

      if (!json.text) {
        console.error("Agent query failed: empty response body");
        setError(json.error ?? offlineFallback);
        return;
      }

      setAnswer(json.text);
    } catch (err) {
      console.error("Agent query failed:", err);
      setError(offlineFallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className={cn(
        "mt-4 space-y-3 rounded-2xl border border-violet-500/25 bg-violet-950/30 p-4 shadow-lg shadow-black/20 backdrop-blur-md",
        hideHeader && "mt-0 border-0 bg-transparent p-0 shadow-none",
        className,
      )}
    >
      {hideHeader ? null : (
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">
              {isWilaya ? "مساعد إغاثة الولاية" : "وكيل التوجيه الميداني"}
            </h3>
            <p className="text-[11px] text-violet-200/80">
              {isWilaya
                ? "تنسيق على مستوى ولاية جيجل — عجز، محاور، وأولويات"
                : "تحليل فوري للفراغات والطرق والتنسيق"}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={(event) => {
              event.stopPropagation();
              void ask(prompt);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
              activeChip === prompt
                ? "border-violet-400/60 bg-violet-500/25 text-violet-50"
                : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-violet-400/40 hover:text-white",
            )}
          >
            <Sparkles className="mr-1 inline h-3 w-3 opacity-70" />
            {prompt}
          </button>
        ))}
      </div>

      <FieldDispatchPanel />

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-violet-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> قاعد نحلّل الوضع...
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/40 bg-rose-950/50 px-3 py-2.5 text-xs font-semibold leading-relaxed text-rose-100"
        >
          {error}
        </div>
      ) : null}

      {sections.length > 0 ? (
        <div className="space-y-3 overflow-visible">
          {sections.map((section) => {
            const meta =
              section.kind !== "other" ? SECTION_META[section.kind] : null;

            return (
              <div
                key={`${section.kind}-${section.title}`}
                className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 text-sm text-slate-100 leading-relaxed text-right"
              >
                <div className="mb-2.5 flex flex-wrap items-center justify-start gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                      meta?.tone ??
                        "border-slate-600 bg-slate-900/70 text-slate-200",
                    )}
                  >
                    {meta ? `${meta.badge} ${meta.title}` : section.title}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {section.kind === "gaps"
                    ? section.items.map((item, index) => (
                        <li
                          key={`${index}-${item.slice(0, 18)}`}
                          className="rounded-lg border border-slate-700/40 bg-slate-950/50 px-2.5 py-2 text-xs leading-relaxed text-slate-100"
                        >
                          {item}
                        </li>
                      ))
                    : section.items.map((item, index) => (
                        <li
                          key={`${index}-${item.slice(0, 18)}`}
                          className="flex gap-2 text-slate-100"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300/80" />
                          <span className="min-w-0 flex-1 leading-relaxed">
                            {item}
                          </span>
                        </li>
                      ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
