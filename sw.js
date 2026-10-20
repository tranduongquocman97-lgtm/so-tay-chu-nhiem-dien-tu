/**
 * ==============================================================================
 * SERVICE WORKER CHO SỔ TAY CHỦ NHIỆM 10A12 (K58-QT)
 * Tệp: sw.js
 * Phiên bản: 10a12-pwa-v8 (Tự động xóa cache cũ, ép cập nhật logo & tài nguyên)
 * ==============================================================================
 */

const CACHE_NAME = "10a12-pwa-v8";
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

// 1. Cài đặt Service Worker và lưu cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Ép Service Worker mới kích hoạt ngay lập tức mà không chờ đóng tab
  self.skipWaiting();
});

// 2. Kích hoạt và dọn sạch các phiên bản Cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[PWA] Đang xóa bộ nhớ đệm cũ:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Chiếm quyền điều khiển toàn bộ các client/tab đang mở
      return self.clients.claim();
    })
  );
});

// 3. Lắng nghe thông điệp SKIP_WAITING gửi từ app.js
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 4. Chiến lược phản hồi tài nguyên (Network First cho API, Cache First cho tài nguyên tĩnh)
self.addEventListener("fetch", (event) => {
  const requestUrl = event.request.url;

  // Bỏ qua các yêu cầu gọi tới Google Apps Script API (luôn lấy dữ liệu thời gian thực)
  if (requestUrl.includes("script.google.com")) {
    return;
  }

  // Chiến lược: Thử lấy từ mạng trước cho ảnh logo để luôn cập nhật ảnh mới nhất
  if (requestUrl.includes("app_icon_gvcn.png") || requestUrl.includes("app_icon_10a12.png")) {
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
    return;
  }

  // Đối với các tài nguyên tĩnh khác: Cache first, dự phòng bằng Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).then((networkResponse) => {
          return networkResponse;
        })
      );
    })
  );
});