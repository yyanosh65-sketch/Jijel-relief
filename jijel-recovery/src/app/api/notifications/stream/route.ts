import {
  getRecentEmergencyNotifications,
  subscribeEmergencyNotifications,
  type EmergencyNotificationPayload,
} from "@/lib/emergency-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatSse(event: EmergencyNotificationPayload): string {
  return `event: emergency\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      send(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

      for (const event of getRecentEmergencyNotifications()) {
        send(formatSse(event));
      }

      cleanup = subscribeEmergencyNotifications((event) => {
        send(formatSse(event));
      });

      heartbeat = setInterval(() => {
        send(`: ping ${Date.now()}\n\n`);
      }, 25_000);
    },
    cancel() {
      cleanup?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
