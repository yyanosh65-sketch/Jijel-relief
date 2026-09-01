"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Download, FileText, Loader2, MessageSquare, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CRISIS_AGENT_PERSONA } from "@/lib/agent/coordinator-knowledge";
import { cn } from "@/lib/utils";
import { formInputClass } from "@/lib/ui-labels";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: Array<{ toolName: string; output: unknown }>;
};

type AgentChatResponse = {
  text?: string;
  toolResults?: Array<{ toolName: string; output: unknown }>;
  error?: string;
};

type ToolBadgeMeta = {
  label: string;
  emoji: string;
  tone: "slate" | "emerald" | "violet" | "sky" | "amber";
};

const TOOL_BADGES: Record<string, ToolBadgeMeta> = {
  generateOperationsReport: {
    label: "تقرير العمليات الميدانية جاهز",
    emoji: "📊",
    tone: "emerald",
  },
  getLocalFieldContacts: {
    label: "تم جلب جهات الاتصال الميدانية",
    emoji: "📍",
    tone: "emerald",
  },
  getReliefStats: {
    label: "إحصائيات الإغاثة المحدّثة",
    emoji: "📈",
    tone: "slate",
  },
  suggestConvoyDestination: {
    label: "وجهة القافلة المقترحة",
    emoji: "🚚",
    tone: "sky",
  },
  routeCargoConvoy: {
    label: "توجيه الحمولة نحو أعلى عجز",
    emoji: "📦",
    tone: "sky",
  },
  checkMountainRoads: {
    label: "حالة المسالك الجبلية",
    emoji: "🛣️",
    tone: "amber",
  },
  geoLocateVillage: {
    label: "تم تحديد الموقع الجغرافي",
    emoji: "📍",
    tone: "slate",
  },
  extractAidNeed: {
    label: "تحليل الاحتياج من المنشور",
    emoji: "📋",
    tone: "violet",
  },
  classifyFeedPost: {
    label: "تصنيف منشور فيسبوك",
    emoji: "🔍",
    tone: "violet",
  },
};

const TOOL_CARD_TONES: Record<ToolBadgeMeta["tone"], string> = {
  slate: "border-slate-200 bg-slate-50",
  emerald: "border-emerald-200 bg-emerald-50",
  violet: "border-violet-200 bg-violet-50",
  sky: "border-sky-200 bg-sky-50",
  amber: "border-amber-200 bg-amber-50",
};

const STARTER_PROMPTS = [
  "رانا جايين بشاحنة علف وخزانات ماء، وين الوجهة الأكثر استعجالاً؟",
  "أعطيني جهات الاتصال وفرق 4x4 في دائرة العنصر والجمعة بني حبيبي",
  "كاش مسالك جبلية مقطوعة في أعالي تاكسنة أو إراقن؟",
  "أعطيني التقرير اليومي للعمليات الميدانية",
];

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div
      className="copilot-markdown prose prose-sm max-w-none text-right leading-relaxed text-slate-800 prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-800 prose-strong:text-slate-900 prose-li:text-slate-800"
      dir="rtl"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-right text-xs" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border border-slate-200 bg-slate-100 px-2 py-1.5 font-bold text-slate-900"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
              {...props}
            >
              {children}
            </td>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-1 list-disc pr-4 pl-0 text-right" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-1 list-decimal pr-4 pl-0 text-right" {...props}>
              {children}
            </ol>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function AgentCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: CRISIS_AGENT_PERSONA.greeting,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          messages: messages
            .filter((message) => message.id !== "welcome")
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
        }),
      });

      const payload = (await response.json()) as AgentChatResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "تعذّر الاتصال بالوكيل.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.text?.trim() || "تم تنفيذ الطلب.",
          toolResults: payload.toolResults,
        },
      ]);
    } catch (chatError) {
      setError(
        chatError instanceof Error
          ? chatError.message
          : "تعذّر الاتصال بالوكيل.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadOperationsReport(format: "markdown" | "print") {
    setIsDownloadingReport(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/agent/operations-report?format=${format === "markdown" ? "markdown" : "json"}`,
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "تعذر إنشاء التقرير.");
      }

      if (format === "markdown") {
        const markdown = await response.text();
        const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `jijel-operations-${new Date().toISOString().slice(0, 10)}.md`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }

      const payload = await response.json();
      const markdown = payload.report?.markdown as string | undefined;
      if (!markdown) {
        throw new Error("التقرير فارغ.");
      }

      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) {
        throw new Error("تعذر فتح نافذة الطباعة.");
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8" />
            <title>تقرير عمليات إغاثة جيجل</title>
            <style>
              body { font-family: Tahoma, Arial, sans-serif; padding: 2rem; line-height: 1.7; }
              h1,h2 { color: #0f172a; }
              table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
              th, td { border: 1px solid #cbd5e1; padding: 0.5rem; text-align: right; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body><pre>${markdown.replace(/</g, "&lt;")}</pre></body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : "تعذر تنزيل التقرير.",
      );
    } finally {
      setIsDownloadingReport(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-50 inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:-translate-y-0.5 hover:bg-violet-800"
          aria-label="فتح مساعد الإغاثة الذكي"
        >
          <Bot className="h-5 w-5" />
          <span className="hidden sm:inline">🤖 مساعد الإغاثة</span>
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[3600] flex justify-end bg-slate-950/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <aside
            dir="rtl"
            className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Bot className="h-5 w-5 text-violet-700" />
                  {CRISIS_AGENT_PERSONA.name} — {CRISIS_AGENT_PERSONA.title}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  توجيه قوافل، جهات اتصال ميدانية، وحالة المسالك الجبلية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-6"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "mr-auto bg-violet-700 text-white"
                      : "ml-auto border border-slate-200 bg-slate-50 text-slate-800",
                  )}
                >
                  {message.role === "assistant" ? (
                    <AssistantMarkdown content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.toolResults?.map((toolResult, index) => (
                    <ToolResultCard
                      key={`${message.id}-${toolResult.toolName}-${index}`}
                      toolResult={toolResult}
                    />
                  ))}
                </div>
              ))}

              {isLoading ? (
                <div className="ml-auto flex max-w-[92%] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحليل…
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </div>

            <footer className="relative z-20 shrink-0 border-t border-slate-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)]">
              <div className="mb-3 flex w-full flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isDownloadingReport}
                  onClick={() => void downloadOperationsReport("markdown")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {isDownloadingReport ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  تقرير يومي (.md)
                </button>
                <button
                  type="button"
                  disabled={isDownloadingReport}
                  onClick={() => void downloadOperationsReport("print")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  طباعة PDF
                </button>
              </div>

              <div className="mb-3 flex w-full flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-right text-[11px] font-semibold leading-snug text-violet-900 transition hover:border-violet-300 hover:bg-violet-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                className="relative z-20 flex w-full gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="اسأل عمي رابح عن وجهة قافلة، فرق 4x4، أو مسالك مقطوعة…"
                  className={cn(
                    formInputClass,
                    "relative z-20 min-w-0 flex-1 focus:border-violet-400 focus:ring-violet-500/20",
                  )}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="relative z-20 inline-flex shrink-0 items-center justify-center rounded-xl bg-violet-700 px-4 text-white disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </form>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function getToolBadge(toolName: string): ToolBadgeMeta {
  return (
    TOOL_BADGES[toolName] ?? {
      label: "تم تنفيذ طلب ميداني",
      emoji: "✅",
      tone: "slate",
    }
  );
}

function ToolResultCard({
  toolResult,
}: {
  toolResult: { toolName: string; output: unknown };
}) {
  const output =
    toolResult.output && typeof toolResult.output === "object"
      ? (toolResult.output as Record<string, unknown>)
      : null;

  const badge = getToolBadge(toolResult.toolName);

  return (
    <div
      className={cn(
        "mt-2.5 rounded-xl border p-2.5 text-[11px] text-slate-700",
        TOOL_CARD_TONES[badge.tone],
      )}
    >
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
        <span aria-hidden>{badge.emoji}</span>
        {badge.label}
      </p>

      {toolResult.toolName === "getReliefStats" && output ? (
        <ul className="mt-1.5 space-y-0.5 text-slate-700">
          <li>احتياجات مفتوحة: {String(output.openNeeds)}</li>
          <li>نداءات SOS نشطة: {String(output.activeSosAlerts)}</li>
          <li>قوافل قادمة: {String(output.incomingConvoys)}</li>
        </ul>
      ) : null}

      {toolResult.toolName === "suggestConvoyDestination" &&
      output?.found === true ? (
        <ul className="mt-1.5 space-y-0.5 text-slate-700">
          <li>
            الوجهة: {String(output.communeAr ?? output.commune)} — دائرة{" "}
            {String(output.dairaAr ?? output.daira)}
          </li>
          <li>العجز: {String(output.deficitUnits)} وحدة</li>
          <li>المدخل المقترح: {String(output.recommendedEntryPointAr)}</li>
          {output.terrain && typeof output.terrain === "object" ? (
            <li>
              التضاريس:{" "}
              {String(
                (output.terrain as { labelAr?: string }).labelAr ??
                  (output.terrain as { vehicleRecommendationAr?: string })
                    .vehicleRecommendationAr,
              )}
            </li>
          ) : null}
          {output.localCoordinator && typeof output.localCoordinator === "object" ? (
            <li>
              المنسّق:{" "}
              {String(
                (output.localCoordinator as { nameAr?: string }).nameAr ??
                  (output.localCoordinator as { name?: string }).name,
              )}{" "}
              —{" "}
              {String((output.localCoordinator as { phone?: string }).phone)}
            </li>
          ) : null}
        </ul>
      ) : null}

      {toolResult.toolName === "getLocalFieldContacts" && output ? (
        <ul className="mt-1.5 space-y-1 text-slate-700">
          {(output.contacts as Array<Record<string, string>> | undefined)?.map(
            (contact, index) => (
              <li key={`${contact.phone}-${index}`}>
                {contact.contactPerson} — {contact.phone}
                {contact.is4x4Team ? " (4x4)" : ""}
              </li>
            ),
          )}
        </ul>
      ) : null}

      {toolResult.toolName === "checkMountainRoads" && output ? (
        <ul className="mt-1.5 space-y-0.5 text-slate-700">
          <li>المنطقة: {String(output.areaLabel)}</li>
          {output.terrain && typeof output.terrain === "object" ? (
            <li>
              الحالة:{" "}
              {String((output.terrain as { labelAr?: string }).labelAr)}
            </li>
          ) : null}
          {output.localCoordinator && typeof output.localCoordinator === "object" ? (
            <li>
              الاتصال:{" "}
              {String(
                (output.localCoordinator as { nameAr?: string }).nameAr,
              )}{" "}
              — {String((output.localCoordinator as { phone?: string }).phone)}
            </li>
          ) : null}
        </ul>
      ) : null}

      {toolResult.toolName === "generateOperationsReport" && output ? (
        <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-emerald-100 bg-white/80 p-2">
          <AssistantMarkdown
            content={String((output as { markdown?: string }).markdown ?? "").slice(
              0,
              1200,
            )}
          />
        </div>
      ) : null}

      {toolResult.toolName === "routeCargoConvoy" &&
      (output as { found?: boolean })?.found === true ? (
        <ul className="mt-1.5 space-y-0.5 text-slate-700">
          <li>
            الوجهة:{" "}
            {String(
              (output as { destination?: { communeAr?: string } }).destination
                ?.communeAr,
            )}
          </li>
          <li>
            المنسّق:{" "}
            {String(
              (output as { localCoordinator?: { nameAr?: string } })
                .localCoordinator?.nameAr,
            )}{" "}
            —{" "}
            {String(
              (output as { localCoordinator?: { phone?: string } })
                .localCoordinator?.phone,
            )}
          </li>
        </ul>
      ) : null}

      {toolResult.toolName === "geoLocateVillage" && output ? (
        <p className="mt-1.5 text-slate-700">
          {String(output.matchedLabel)} ({String(output.lat)}, {String(output.lng)})
        </p>
      ) : null}

      {toolResult.toolName === "extractAidNeed" && output ? (
        <p className="mt-1.5 text-slate-700">
          {String(output.title)} — {String(output.commune)} —{" "}
          {String(output.urgency)}
        </p>
      ) : null}
    </div>
  );
}
