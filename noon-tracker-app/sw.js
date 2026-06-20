// Service Worker for Mashreq Noon Budget Tracker
// Enables offline access and "Add to Home Screen" installability

const CACHE_NAME = "noon-tracker-v1";
const ASSETS_TO_CACHE = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png"
];

// Install: cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls (live Gmail/Anthropic updates),
// cache-first for everything else (app shell — instant loading)
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Never cache API calls — always go to network for live data
  if (url.includes("api.anthropic.com") || url.includes("googleapis.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell: cache-first, falling back to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            // Cache successful same-origin responses for next offline visit
            if (response.ok && event.request.method === "GET") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match("./index.html"))
      );
    })
  );
});
