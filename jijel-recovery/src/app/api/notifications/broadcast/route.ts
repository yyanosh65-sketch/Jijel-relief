import { NextResponse } from "next/server";
import { z } from "zod";

import {
  broadcastPushNotifications,
  isWebPushConfigured,
} from "@/lib/web-push";

const broadcastSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  urgency: z.string().optional(),
});

function isAuthorized(request: Request): boolean {
  const secret = process.env.NOTIFICATION_BROADCAST_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push غير مهيأ — أضف مفاتيح VAPID." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = broadcastSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات البث غير صالحة." },
        { status: 400 },
      );
    }

    const result = await broadcastPushNotifications(parsed.data);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("push broadcast error:", error);
    return NextResponse.json(
      { error: "تعذر بث الإشعار." },
      { status: 500 },
    );
  }
}
