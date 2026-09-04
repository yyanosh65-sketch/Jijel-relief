"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, MapPin, Phone } from "lucide-react";

import {
  AMI_RABAH,
  AMI_RABAH_PROMPTS,
} from "@/lib/agent/ami-rabah-persona";
import {
  executeAmiActions,
  executeAmiFlyTo,
  parseAmiRabahReply,
  type AmiFlyToAction,
} from "@/lib/agent/ami-rabah-client";
import { cn } from "@/lib/utils";

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
    title: "المسالك / 4x4",
    badge: "🚙",
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
  if (/🚨|العجز|فراغ|ناقص|تغطية|الاحتياج/i.test(normalized)) return "gaps";
  if (
    /🚛|🚙|🧭|🚧|المسالك|طريق|مسلك|4x4|فك العزلة|مقطوع/i.test(normalized)
  ) {
    return "routes";
  }
  if (/⚠️|تنبيه|منع التكرار|فائض|تحذير|نصيحة|تقرير/i.test(normalized)) {
    return "cautions";
  }
  return null;
}

function parseAgentSections(text: string): ParsedSection[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  const pushCurrent = () => {
    if (current && current.items.length > 0) sections.push(current);
  };

  for (const line of lines) {
    const headingKind = classifyHeading(line);
    const looksLikeHeading =
      headingKind &&
      (line.length < 80 ||
        /^(🚨|🚛|🚙|⚠️|🧭|🚧|📋)/.test(line) ||
        /:$/.test(line));

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
      current = { kind: "other", title: "ملخص عمي رابح", items: [] };
    }
    if (bullet) current.items.push(bullet);
  }

  pushCurrent();

  if (sections.length === 0 && text.trim()) {
    return [
      {
        kind: "other",
        title: "ملخص عمي رابح",
        items: text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
      },
    ];
  }

  return sections;
}

type AmiRabahPanelProps = {
  needId?: number | null;
  settlementId?: number | null;
  scope?: "field" | "wilaya";
  className?: string;
};

/**
 * Ami Rabah operational chat — chips, fly-to actions, tel links, sitrep copy.
 */
export default function AmiRabahPanel({
  needId,
  settlementId,
  scope = "wilaya",
  className,
}: AmiRabahPanelProps) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [sitrep, setSitrep] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flyTargets, setFlyTargets] = useState<AmiFlyToAction[]>([]);

  const isWilaya = scope === "wilaya";

  const parsed = useMemo(
    () => (answer ? parseAmiRabahReply(answer) : null),
    [answer],
  );

  const sections = useMemo(
    () => (parsed ? parseAgentSections(parsed.displayText) : []),
    [parsed],
  );

  useEffect(() => {
    if (!answer) {
      setFlyTargets([]);
      return;
    }
    const next = parseAmiRabahReply(answer);
    setFlyTargets(next.actions);
    if (next.actions.length > 0) {
      executeAmiActions(next.actions);
    }
  }, [answer]);

  async function ask(query: string) {
    setLoading(true);
    setError(null);
    setActiveChip(query);
    setAnswer(null);
    setSitrep(null);
    setCopied(false);
    setFlyTargets([]);

    const offlineFallback =
      "تعذر الاتصال بمركز التوجيه الآلي حالياً. يرجى الاتصال مباشرة بالحماية المدنية (14) أو مراجعة قائمة الاحتياجات الميدانية.";

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "field",
          persona: "ami_rabah",
          needId: isWilaya ? null : (needId ?? null),
          settlementId: isWilaya ? null : (settlementId ?? null),
          query,
        }),
      });

      const json = (await response.json()) as {
        text?: string;
        sitrep?: string;
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
      if (json.sitrep) setSitrep(json.sitrep);
    } catch (err) {
      console.error("Agent query failed:", err);
      setError(offlineFallback);
    } finally {
      setLoading(false);
    }
  }

  async function copySitrep() {
    const payload =
      sitrep ??
      (parsed?.displayText.includes("تقرير وضعية")
        ? parsed.displayText
        : null);
    if (!payload) {
      await ask(AMI_RABAH_PROMPTS[2].query);
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Sitrep copy failed:", err);
      setError("ما قدرتش ننسخ التقرير — انسخه يدوياً من الرسالة.");
    }
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-1.5">
        {AMI_RABAH_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            disabled={loading}
            onClick={(event) => {
              event.stopPropagation();
              void ask(prompt.query);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
              activeChip === prompt.query
                ? "border-amber-400/60 bg-amber-500/20 text-amber-50"
                : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-amber-400/40 hover:text-white",
            )}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={(event) => {
            event.stopPropagation();
            void copySitrep();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-950/50 px-3 py-2 text-[11px] font-bold text-emerald-100 transition hover:bg-emerald-900/60"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "تم النسخ ✓" : "نسخ تقرير القوافل 📋"}
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-amber-100/90">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          عمي رابح قاعد يراجع الشبكة الميدانية...
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
                className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-4 text-right text-sm leading-relaxed text-slate-100"
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
                  {section.items.map((item, index) => (
                    <li
                      key={`${index}-${item.slice(0, 18)}`}
                      className="rounded-lg border border-slate-700/40 bg-slate-950/50 px-2.5 py-2 text-xs leading-relaxed text-slate-100"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {parsed && parsed.phones.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {parsed.phones.map((phone) => (
                <a
                  key={phone.tel}
                  href={`tel:${phone.tel}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-950/50 px-3 py-1.5 text-[11px] font-bold text-sky-100"
                >
                  <Phone className="h-3.5 w-3.5" />
                  اتصال {phone.label}
                </a>
              ))}
            </div>
          ) : null}

          {flyTargets.length > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                executeAmiFlyTo(flyTargets[0]);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2.5 text-xs font-bold text-amber-100 transition hover:bg-amber-900/50"
            >
              <MapPin className="h-4 w-4" />
              📍 عاين في الخريطة
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !answer && !error ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-3 text-[11px] leading-relaxed text-slate-400">
          مرحبا، أنا {AMI_RABAH.nameAr}. اختَر طلباً ميدانياً من فوق ونوجّهك
          للعجز، الـ4x4، أو المسالك المقطوعة.
        </p>
      ) : null}
    </section>
  );
}
