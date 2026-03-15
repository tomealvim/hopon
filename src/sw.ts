/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; data?: Record<string, unknown> } = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'HopOn', body: event.data.text() };
  }

  const title = data.title ?? 'HopOn';
  const options = {
    body: data.body ?? '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: data.data ?? {},
    vibrate: [100, 50, 100],
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = event.notification.data as Record<string, unknown> | undefined;
  const tab = data?.tab as string | undefined;
  const bookingId = data?.bookingId as string | undefined;
  let url = tab ? `/?tab=${tab}` : '/';
  if (bookingId) url += `&rateBooking=${bookingId}`;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          (client as WindowClient).navigate(url);
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
