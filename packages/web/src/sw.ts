/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

// Workbox precaching (vite-plugin-pwa injects __WB_MANIFEST)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Indomitable Unity", {
      body: data.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

// Notification click — open or focus the app at the notification URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      const url = (event.notification.data?.url as string) ?? "/";
      const existing = clientList.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});

// Handle subscription change (browser rotated push keys)
self.addEventListener("pushsubscriptionchange", ((event: ExtendableEvent & { oldSubscription?: PushSubscription }) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options ?? { userVisibleOnly: true })
      .then((subscription) => {
        return fetch("/api/notifications/push-sub", {
          method: "POST",
          body: JSON.stringify(subscription.toJSON()),
          headers: { "Content-Type": "application/json" },
        });
      }),
  );
}) as EventListener);
