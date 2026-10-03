self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = String(data.title || "Dynexal Technologies");
  const options = {
    body: String(data.body || "New updates are available on Dynexal."),
    icon: data.icon || "/assets/dynexal-mark.svg",
    badge: data.badge || "/assets/dynexal-mark.svg",
    tag: String(data.tag || "dynexal-update"),
    renotify: Boolean(data.renotify),
    data: {
      url: data.url || "https://dynexal.com/"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "https://dynexal.com/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        try {
          const current = new URL(client.url);
          const target = new URL(targetUrl, self.location.origin);
          if (current.origin === target.origin && "focus" in client) {
            client.navigate(target.href);
            return client.focus();
          }
        } catch (_) {}
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
