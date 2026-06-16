/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "purrfect-plans-v1";
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
  let data: { title?: string; body?: string; icon?: string; url?: string } = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Purrfect Plans", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Purrfect Plans", {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
      tag: "purrfect-plans",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return (client as WindowClient).focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// Offline fallback
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
