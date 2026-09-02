"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type SubscriptionStatus =
  | "loading"
  | "idle"
  | "subscribed"
  | "unsupported"
  | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export default function PushSubscriptionBtn() {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [isBusy, setIsBusy] = useState(false);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const refreshStatus = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !publicKey
    ) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setStatus(
      existing && Notification.permission === "granted"
        ? "subscribed"
        : "idle",
    );
  }, [publicKey]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function handleSubscribe() {
    if (!publicKey) {
      setStatus("unsupported");
      return;
    }

    setIsBusy(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "idle");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("اشتراك غير مكتمل");
      }

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("تعذر حفظ الاشتراك");
      }

      setStatus("subscribed");
    } catch (error) {
      console.error("Push subscribe failed:", error);
      await refreshStatus();
    } finally {
      setIsBusy(false);
    }
  }

  if (status === "unsupported" || status === "loading") {
    return null;
  }

  if (status === "subscribed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-400"
        aria-live="polite"
      >
        ✓ التنبيهات مفعلة
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleSubscribe()}
      disabled={isBusy || status === "denied"}
      title={
        status === "denied"
          ? "تم رفض الإشعارات من المتصفح — فعّلها من إعدادات الجهاز"
          : "تفعيل تنبيهات الطوارئ الفورية على هذا الجهاز"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-600/25",
        (isBusy || status === "denied") && "cursor-not-allowed opacity-60",
      )}
    >
      {isBusy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span aria-hidden>🔔</span>
      )}
      تفعيل تنبيهات الطوارئ
    </button>
  );
}
