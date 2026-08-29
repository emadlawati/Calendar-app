const CACHE_NAME = "purrfect-plans-v3";
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
  event.waitUntil(
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
    })
  );
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
