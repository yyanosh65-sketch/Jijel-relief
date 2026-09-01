import { generateDailyOperationsReport } from "@/lib/agent/operations-report";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "json";

    const report = await generateDailyOperationsReport();

    if (format === "markdown") {
      return new Response(report.markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="jijel-operations-${new Date().toISOString().slice(0, 10)}.md"`,
        },
      });
    }

    return Response.json({ success: true, report });
  } catch (error: unknown) {
    console.error("operations report error:", error);
    const message =
      error instanceof Error ? error.message : "تعذر إنشاء التقرير.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET(new Request("http://local/api/agent/operations-report"));
}
