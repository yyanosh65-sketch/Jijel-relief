const CACHE_NAME = "jijel-relief-v1";
const OFFLINE_ASSETS = [
  "/",
  "/manifest.json",
  "/data/jijel-locations.json",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.pathname === "/data/jijel-locations.json") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/") ?? Response.error()),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "تنبيه طوارئ — إغاثة جيجل",
    body: "تم رصد حالة عاجلة في ولاية جيجل",
    url: "/map",
    tag: "jijel-emergency",
    needId: null,
    lat: null,
    lng: null,
    urgency: "critical",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    tag: payload.tag,
    vibrate: [180, 80, 180, 80, 240],
    requireInteraction: payload.urgency === "critical",
    data: {
      url: payload.url,
      needId: payload.needId,
      lat: payload.lat,
      lng: payload.lng,
    },
    actions: [
      {
        action: "open-map",
        title: "فتح على الخريطة",
      },
      {
        action: "dismiss",
        title: "لاحقاً",
      },
    ],
    dir: "rtl",
    lang: "ar",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const data = event.notification.data ?? {};
  let targetUrl = data.url || "/map";

  if (!data.url && data.needId) {
    targetUrl = `/map?needId=${data.needId}`;
  } else if (!data.url && data.lat != null && data.lng != null) {
    targetUrl = `/map?lat=${data.lat}&lng=${data.lng}`;
  }

  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(absoluteUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(absoluteUrl);
        }

        return undefined;
      }),
  );
});
