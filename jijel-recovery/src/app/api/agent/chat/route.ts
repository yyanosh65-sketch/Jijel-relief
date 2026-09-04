import {
  assertCrisisAgentModel,
  getConfiguredCrisisAgentProvider,
  runChatFallback,
  runCrisisAgentChat,
} from "@/lib/agent/crisis-agent";

const AGENT_OFFLINE_FALLBACK_AR =
  "تعذر الاتصال بمركز التوجيه الآلي حالياً. يرجى الاتصال مباشرة بالحماية المدنية (14) أو مراجعة قائمة الاحتياجات الميدانية.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = String(body.message ?? "").trim();
    const history = Array.isArray(body.messages) ? body.messages : [];

    if (!userMessage) {
      return Response.json({ error: "الرسالة فارغة." }, { status: 400 });
    }

    const messages = [
      ...history
        .filter(
          (entry: { role?: string; content?: string }) =>
            entry?.role && entry?.content,
        )
        .slice(-12)
        .map((entry: { role: string; content: string }) => ({
          role: entry.role as "user" | "assistant",
          content: entry.content,
        })),
      { role: "user" as const, content: userMessage },
    ];

    try {
      if (!getConfiguredCrisisAgentProvider()) {
        const fallback = await runChatFallback({ messages });
        return Response.json(fallback);
      }

      assertCrisisAgentModel();
      const result = await runCrisisAgentChat({ messages });

      return Response.json(result);
    } catch (llmError) {
      console.error("agent chat LLM error:", llmError);
      try {
        const fallback = await runChatFallback({ messages });
        return Response.json({ ...fallback, fallback: true });
      } catch (fallbackError) {
        console.error("agent chat fallback error:", fallbackError);
        return Response.json(
          {
            text: AGENT_OFFLINE_FALLBACK_AR,
            reply: AGENT_OFFLINE_FALLBACK_AR,
            fallback: true,
          },
          { status: 200 },
        );
      }
    }
  } catch (error: unknown) {
    console.error("agent chat error:", error);
    return Response.json(
      {
        text: AGENT_OFFLINE_FALLBACK_AR,
        reply: AGENT_OFFLINE_FALLBACK_AR,
        error: AGENT_OFFLINE_FALLBACK_AR,
        fallback: true,
      },
      { status: 200 },
    );
  }
}
