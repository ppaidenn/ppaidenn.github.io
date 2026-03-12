self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {
      title: "paiden.com",
      body: event.data ? event.data.text() : "New activity on paiden.com.",
      url: "/blog",
    };
  }

  const declarative = payload && payload.web_push === 8030 && payload.notification ? payload.notification : null;
  const title = declarative && declarative.title
    ? String(declarative.title)
    : payload && payload.title
      ? String(payload.title)
      : "paiden.com";
  const options = {
    body: declarative && declarative.body
      ? String(declarative.body)
      : payload && payload.body
        ? String(payload.body)
        : "New activity on paiden.com.",
    icon: "/images/favicon.png",
    badge: "/images/favicon.png",
    data: {
      url: declarative && declarative.navigate
        ? String(declarative.navigate)
        : payload && payload.url
          ? String(payload.url)
          : "/blog",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || "/blog";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return Promise.resolve();
    })
  );
});
