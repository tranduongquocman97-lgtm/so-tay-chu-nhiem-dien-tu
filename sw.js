const CACHE_NAME = "10a12-pwa-v7";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./tracuu.html",
  "./manifest.json",
  "./manifest-hs.json",
  "./app_icon_gvcn.png",
  "./app_icon_10a12.png",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("script.google.com")) return;
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});