import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// U83：全自动即时更新 —— 新 SW 安装即接管（不等旧页签关闭）、激活即控页；
// 配合 vite.config.ts 的 registerType:'autoUpdate'，vite-plugin-pwa 客户端脚本
// 在 activated(isUpdate) 时自动 reload。旧式 SKIP_WAITING 手动流（无消费方）已退役。
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Autional', {
      body: data.body || '',
      icon: '/user/icon-192.png',
      badge: '/user/icon-192.png',
      data: { url: data.deep_link || '/user/notifications' },
      tag: data.tag || 'autional-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/user/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
