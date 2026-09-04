const APP_SHELL_CACHE = "ighata-app-shell-v1";
const MAP_TILE_CACHE = "ighata-map-tiles-v1";
const MAX_TILE_ENTRIES = 800;

const OFFLINE_ASSETS = [
  "/",
  "/map",
  "/manifest.json",
  "/data/jijel-locations.json",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/badge-72x72.png",
];

/** OSM / Carto / OpenTopoMap basemap hosts used by Leaflet */
function isMapTileRequest(url) {
  const host = url.hostname;
  return (
    host.endsWith("tile.openstreetmap.org") ||
    host.includes("basemaps.cartocdn.com") ||
    host.includes("tile.opentopomap.org") ||
    /\.tile\./i.test(host)
  );
}

async function trimTileCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const overflow = keys.length - maxEntries;
  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([APP_SHELL_CACHE, MAP_TILE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)),
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

  // ── Map tiles: cache-first + SWR, LRU-capped (Djimla / Texenna offline) ──
  if (isMapTileRequest(url)) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        const networkPromise = fetch(request)
          .then(async (response) => {
            if (response && response.ok) {
              await cache.put(request, response.clone());
              await trimTileCache(cache, MAX_TILE_ENTRIES);
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }

        const networkResponse = await networkPromise;
        if (networkResponse) {
          return networkResponse;
        }

        return new Response("", { status: 503, statusText: "Tile offline" });
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === "/data/jijel-locations.json") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          void caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          void caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match("/map")) ||
            (await caches.match("/")) ||
            Response.error()
          );
        }),
    );
    return;
  }

  // App shell static chunks / icons / leaflet CSS
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png")
  ) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          event.waitUntil(
            fetch(request)
              .then((response) => {
                if (response && response.ok) {
                  return cache.put(request, response.clone());
                }
                return undefined;
              })
              .catch(() => undefined),
          );
          return cached;
        }

        try {
          const response = await fetch(request);
          if (response && response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return Response.error();
        }
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "تنبيه طوارئ — إغاثة جيجل",
    body: "تم رصد حالة عاجلة في ولاية جيجل",
    url: "/map",
    urgency: "critical",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: payload.url,
      vibrate: [200, 100, 200],
      requireInteraction: payload.urgency === "critical",
      data: { url: payload.url },
      dir: "rtl",
      lang: "ar",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data ?? {};
  const targetUrl = new URL(data.url || "/map", self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
