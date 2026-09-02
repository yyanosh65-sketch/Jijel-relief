import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات الاشتراك غير صالحة." },
        { status: 400 },
      );
    }

    const { endpoint, keys } = parsed.data;

    await db
      .insert(pushSubscriptions)
      .values({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("push subscribe error:", error);
    return NextResponse.json(
      { error: "تعذر حفظ اشتراك الإشعارات." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    const endpoint = body.endpoint?.trim();

    if (!endpoint) {
      return NextResponse.json(
        { error: "نقطة الاشتراك مطلوبة." },
        { status: 400 },
      );
    }

    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("push unsubscribe error:", error);
    return NextResponse.json(
      { error: "تعذر إلغاء الاشتراك." },
      { status: 500 },
    );
  }
}
