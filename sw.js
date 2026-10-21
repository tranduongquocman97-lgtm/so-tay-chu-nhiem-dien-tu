/**
 * ============================================================================
 * SERVICE WORKER ĐIỀU HÀNH PWA SỔ TAY CHỦ NHIỆM 10A12 (K58-QT)
 * Phiên bản: 10a12-pwa-v11 (Bổ sung Cache Busting, CDN Cache & Bypass POST)
 * ============================================================================
 */

const CACHE_NAME = "10a12-pwa-v11";

// Danh mục tài nguyên tĩnh cốt lõi cần nạp sẵn khi cài đặt
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

// 1. Cài đặt và nạp cache an toàn (Không gián đoạn nếu thiếu 1 ảnh)
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

// 2. Kích hoạt và dọn dẹp sạch sẽ các phiên bản cache cũ
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

// 3. Lắng nghe thông điệp cập nhật tức thì
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 4. Chiến lược điều hướng: Network-First có kiểm soát lỗi
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = request.url;

  // BỎ QUA HOÀN TOÀN:
  // - Các phương thức không phải GET (POST, PUT, DELETE không được phép lưu vào CacheStorage)
  // - Lệnh gọi API trực tiếp tới Google Apps Script
  if (request.method !== "GET" || requestUrl.includes("script.google.com")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Lưu bản sao vào cache nếu phản hồi hợp lệ (kể cả phản hồi opaque từ CDN)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === "opaque")) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Khi mất kết nối mạng, tự động trả về tài nguyên từ bộ nhớ Cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // Điều hướng trang mặc định nếu truy cập trang con khi offline
          if (request.mode === "navigate") {
            if (requestUrl.includes("tracuu.html")) {
              return caches.match("./tracuu.html");
            }
            return caches.match("./index.html");
          }
        });
      })
  );
});