const CACHE_NAME = "purrfect-plans-v4";
const urlsToCache = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Purrfect Plans", body: event.data.text() };
  }
  // A count on the app icon, kept right even while the app is closed. Only
  // when the server sends one — an ordinary notification must not clear a
  // badge that the ledger put there.
  const badging = typeof data.badgeCount === "number" && self.navigator
    ? (data.badgeCount > 0
        ? (self.navigator.setAppBadge ? self.navigator.setAppBadge(data.badgeCount) : Promise.resolve())
        : (self.navigator.clearAppBadge ? self.navigator.clearAppBadge() : Promise.resolve())
      ).catch(() => {})
    : Promise.resolve();

  event.waitUntil(Promise.all([
    badging,
    self.registration.showNotification(data.title || "Purrfect Plans", {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192-maskable.png",
      // The url arrives at the top level; older payloads nested it under
      // data, and reading only the nested one sent every click to the home page.
      data: { url: data.url || (data.data && data.data.url) || "/" },
      // Only group when the server explicitly asks for it — otherwise each
      // notification (new plan, note, highlight…) stacks as its own entry.
      tag: data.tag || undefined,
      // The ledger's daily summary asks to stay put rather than fading away,
      // and to replace yesterday's silently instead of buzzing again.
      requireInteraction: data.sticky === true,
      renotify: data.tag ? data.renotify === true : undefined,
      silent: data.silent === true,
    }),
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(
        (r) => r || new Response("You're offline — check back soon! 🐾", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      )
    )
  );
});
