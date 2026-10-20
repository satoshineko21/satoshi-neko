/* Satoshi Neko — Service Worker (shell cache only) */
const CACHE = "sn-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls (Binance / CoinGecko)
  if (
    url.hostname.includes("binance.com") ||
    url.hostname.includes("coingecko.com") ||
    url.pathname.startsWith("/fapi") ||
    url.pathname.startsWith("/futures")
  ) {
    return; // network only
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        // Only cache same-origin successful GET
        if (
          event.request.method === "GET" &&
          res.ok &&
          url.origin === self.location.origin
        ) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
