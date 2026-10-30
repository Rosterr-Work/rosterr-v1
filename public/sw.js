// Rosterr's service worker: keeps the site's static files and images so pages load quickly and open offline, and shows push
// notifications. API requests are never cached.

// Change this whenever the caching rules change: a new worker deletes every older cache.
// v2: v1 also kept failed (404) answers for /_next/static/ files, so a file that was briefly missing during an update stayed
// "missing" in that browser and the page came up without its styles.
const CACHE = "rosterr-v2";
const SHELL = ["/", "/manifest.json"];

const isStaticAsset = (url) => url.pathname.startsWith("/_next/static/");
const isImageOrFont = (url) => url.pathname.startsWith("/_next/image") || /\.(png|jpe?g|svg|gif|webp|ico|woff2?)$/.test(url.pathname);

// A good answer is worth keeping; a 404 during a deploy must not be remembered.
const remember = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  // Pages come from the network; offline, the cached front page is shown instead.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  // Built files never change under the same name, so a kept copy is always right.
  if (isStaticAsset(url)) {
    event.respondWith(caches.match(request).then((kept) => kept || fetch(request).then((response) => remember(request, response))));
    return;
  }

  // Images and fonts: show what is kept straight away and refresh it in the background.
  if (url.origin === self.location.origin && isImageOrFont(url)) {
    event.respondWith(
      caches.match(request).then((kept) => {
        const fresh = fetch(request).then((response) => remember(request, response));
        return kept || fresh;
      })
    );
  }
});

// ---- Push notifications ------------------------------------------------------------------------------------------------------------
// The server sends { title, body, type, url, id }, already worded for a lock screen. Show it, and open the right page when it is tapped.

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch (e) {
    message = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(message.title || "Rosterr", {
      body: message.body || "",
      icon: "/icon-512.png",
      badge: "/favicon-32x32.png",
      tag: message.id || message.type || undefined,
      data: { url: message.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin) && "focus" in w);
      if (!open) return self.clients.openWindow(target);
      if ("navigate" in open) open.navigate(target);
      return open.focus();
    })
  );
});
