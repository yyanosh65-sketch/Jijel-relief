import type { ActiveResponder } from "@/db/schema";

export type ResponderUpdatePayload = Omit<ActiveResponder, "checkedInAt"> & {
  checkedInAt: string;
};

type ResponderEventBus = {
  listeners: Set<(event: ResponderUpdatePayload) => void>;
  recent: ResponderUpdatePayload[];
};

declare global {
  // eslint-disable-next-line no-var
  var __responderEventBus: ResponderEventBus | undefined;
}

function getBus(): ResponderEventBus {
  if (!globalThis.__responderEventBus) {
    globalThis.__responderEventBus = {
      listeners: new Set(),
      recent: [],
    };
  }
  return globalThis.__responderEventBus;
}

export function subscribeResponderUpdates(
  listener: (event: ResponderUpdatePayload) => void,
): () => void {
  const bus = getBus();
  bus.listeners.add(listener);
  return () => bus.listeners.delete(listener);
}

export function getRecentResponderUpdates(): ResponderUpdatePayload[] {
  return [...getBus().recent];
}

export function broadcastResponderUpdate(
  event: ResponderUpdatePayload,
): void {
  const bus = getBus();
  bus.recent = [event, ...bus.recent].slice(0, 60);
  for (const listener of bus.listeners) {
    listener(event);
  }
}
