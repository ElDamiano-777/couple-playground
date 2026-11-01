// This file is included in the generated service worker. Payloads contain only
// generic partner activity, never purchase text or account credentials.
self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { payload = null; }
  const kind = payload?.kind;
  const body = kind === 'added' ? 'Your partner added a purchase.'
    : kind === 'bought' ? 'Your partner marked a purchase as bought.'
    : kind === 'unbought' ? 'Your partner put a purchase back on the list.'
    : 'Your shared shopping list has changed.';
  event.waitUntil(self.registration.showNotification('Together · Shopping', {
    body,
    icon: BASE + 'icons/icon-192.png',
    badge: BASE + 'icons/icon-192.png',
    tag: typeof payload?.eventId === 'string' ? 'shopping-' + payload.eventId : 'shopping-update',
    data: { url: BASE + '?shopping=1' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Always use our own shopping URL; never follow a URL from a push payload.
  const target = new URL(BASE + '?shopping=1', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const client = clients.find(value => value.url.startsWith(new URL(BASE, self.location.origin).href));
    if (client) {
      // An existing window may contain an unfinished note or purchase.
      client.postMessage({ type: 'OPEN_SHOPPING' });
      return client.focus();
    }
    return self.clients.openWindow(target);
  }));
});
