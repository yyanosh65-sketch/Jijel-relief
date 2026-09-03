import {
  getRecentEmergencyNotifications,
  subscribeEmergencyNotifications,
  type EmergencyNotificationPayload,
} from "@/lib/emergency-notifications";
import {
  getRecentResponderUpdates,
  subscribeResponderUpdates,
  type ResponderUpdatePayload,
} from "@/lib/responder-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatEmergencySse(event: EmergencyNotificationPayload): string {
  return `event: emergency\ndata: ${JSON.stringify(event)}\n\n`;
}

function formatResponderSse(event: ResponderUpdatePayload): string {
  return `event: responder_update\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let cleanupEmergency: (() => void) | null = null;
  let cleanupResponders: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Client disconnected mid-write.
        }
      };

      send(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

      for (const event of getRecentEmergencyNotifications()) {
        send(formatEmergencySse(event));
      }

      for (const event of getRecentResponderUpdates()) {
        send(formatResponderSse(event));
      }

      cleanupEmergency = subscribeEmergencyNotifications((event) => {
        send(formatEmergencySse(event));
      });

      cleanupResponders = subscribeResponderUpdates((event) => {
        send(formatResponderSse(event));
      });

      heartbeat = setInterval(() => {
        send(`: ping ${Date.now()}\n\n`);
      }, 25_000);
    },
    cancel() {
      cleanupEmergency?.();
      cleanupResponders?.();
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
