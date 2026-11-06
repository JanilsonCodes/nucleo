const CACHE_NAME = "nucleo-pwa-v3";
const APP_SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A missing optional shell resource must not prevent the worker from installing.
    await Promise.all(APP_SHELL.map(async (url) => {
      try { await cache.add(url); } catch (error) { console.warn("PWA cache skipped:", url, error); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("nucleo-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Keep the existing Push notification behavior and use real icon paths.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: "Núcleo", body: event.data?.text() || "Tens uma nova notificação." }; }
  const options = {
    body: data.body || data.message || "Tens uma nova notificação.",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "nucleo-notification",
    renotify: false,
    data: { url: data.url || "/dashboard/notificacoes" }
  };
  event.waitUntil(self.registration.showNotification(data.title || "Núcleo", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/dashboard/notificacoes", self.location.origin).href;
  event.waitUntil((async () => {
    const openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of openClients) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
