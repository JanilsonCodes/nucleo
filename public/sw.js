
const CACHE_NAME = "nucleo-cache-v2";

const APP_SHELL = [
  "/",
  "/manifest.json",
];

// Instalação
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

// Ativação
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Notificações Push
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "NÚCLEO",
      body: event.data?.text() || "Tens uma nova notificação.",
    };
  }

  const title = data.title || "NÚCLEO";

  const options = {
    body: data.body || data.message || "Tens uma nova notificação.",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || "nucleo-notification",
    renotify: false,
    data: {
      url: data.url || "/dashboard/notificacoes",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Clique na notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard/notificacoes",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.navigate(targetUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    })()
  );
});

// Encerramento de notificações antigas
self.addEventListener("notificationclose", () => {
  // Reservado para futuras métricas.
});
