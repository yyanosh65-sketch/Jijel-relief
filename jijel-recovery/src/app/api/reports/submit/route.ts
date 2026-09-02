import {
  submitCommunityReport,
  submitReportSchema,
} from "@/lib/reports/submit-report";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = submitReportSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 },
      );
    }

    const result = await submitCommunityReport(parsed.data);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({
      success: true,
      id: result.id,
      kind: result.kind,
    });
  } catch (error) {
    console.error("/api/reports/submit error:", error);
    return Response.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}
