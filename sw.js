/**
 * SERVICE WORKER ĐIỀU HÀNH PWA 10A12 (K58-QT)
 * Phiên bản: 10a12-pwa-v10
 */

const CACHE_NAME = "10a12-pwa-v10";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./tracuu.html",
  "./manifest.json",
  "./manifest-hs.json",
  "./app_icon_gvcn.png",
  "./app_icon_10a12.png"
];

// Cài đặt và nạp cache an toàn từng file (Không bị sập nếu thiếu 1 ảnh)
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

// Kích hoạt và dọn dẹp toàn bộ cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Chiến lược Network-First: Ưu tiên tải file mới nhất từ mạng
self.addEventListener("fetch", (event) => {
  const requestUrl = event.request.url;

  // Bỏ qua hoàn toàn các lệnh gọi Google Apps Script API
  if (requestUrl.includes("script.google.com")) {
    return;
  }

  // Network-First cho HTML và JS
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});