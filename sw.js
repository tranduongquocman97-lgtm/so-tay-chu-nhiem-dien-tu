/**
 * ============================================================================
 * SERVICE WORKER ĐIỀU HÀNH PWA SỔ TAY CHỦ NHIỆM 10A12 (K58-QT)
 * Phiên bản: 10a12-pwa-v17 (TKB Dynamic Sync, Docx Spacious Layout, Dãy 1..4 & Thu Ủng Hộ GVCN)
 * ============================================================================
 */

const CACHE_NAME = "10a12-pwa-v17";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./tracuu.html",
  "./js/core.js",
  "./js/seating.js",
  "./js/attendance-shl.js",
  "./js/duty-vtm.js",
  "./js/fund-students.js",
  "./manifest.json",
  "./manifest-hs.json",
  "./app_icon_gvcn.png",
  "./app_icon_gvcn_192.png",
  "./app_icon_gvcn_512.png",
  "./app_icon_10a12.png",
  "./app_icon_10a12_192.png",
  "./app_icon_10a12_512.png",
  "./tkb_10a12.png",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn("[PWA Cache Warning]", url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[PWA ServiceWorker] Dọn dẹp cache cũ:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = request.url;

  if (request.method !== "GET" || requestUrl.includes("script.google.com")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === "opaque")) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          if (request.mode === "navigate") {
            if (requestUrl.includes("tracuu.html")) {
              return caches.match("./tracuu.html", { ignoreSearch: true });
            }
            return caches.match("./index.html", { ignoreSearch: true });
          }
        });
      })
  );
});