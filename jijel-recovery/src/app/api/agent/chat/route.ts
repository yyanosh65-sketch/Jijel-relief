import {
  assertCrisisAgentModel,
  getConfiguredCrisisAgentProvider,
  runCrisisAgentChat,
} from "@/lib/agent/crisis-agent";

export async function POST(req: Request) {
  try {
    if (!getConfiguredCrisisAgentProvider()) {
      return Response.json(
        {
          error:
            "لم يتم ضبط مفتاح GOOGLE_GENERATIVE_AI_API_KEY أو OPENAI_API_KEY.",
        },
        { status: 503 },
      );
    }

    assertCrisisAgentModel();

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

    const result = await runCrisisAgentChat({ messages });

    return Response.json(result);
  } catch (error: unknown) {
    console.error("agent chat error:", error);
    const message = error instanceof Error ? error.message : "Internal Agent Error";
    return Response.json({ error: message }, { status: 500 });
  }
}
