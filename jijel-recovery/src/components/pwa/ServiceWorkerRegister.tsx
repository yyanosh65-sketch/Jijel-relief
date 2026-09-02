"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });

    void import("@/lib/offline-locations").then(({ loadLocationsWithOfflineFallback }) =>
      loadLocationsWithOfflineFallback(),
    );
  }, []);

  return null;
}
