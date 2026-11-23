const CACHE_NAME = "10a12-pwa-v23-complete";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./tracuu.html",
  "./js/core.js",
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
  "./tkb_10a12.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.url.includes("script.google.com")) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === "opaque")) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match(request.url.includes("tracuu.html") ? "./tracuu.html" : "./index.html", { ignoreSearch: true });
          }
        })
      )
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "10a12-drive-upload-sync") {
    event.waitUntil(triggerDriveQueueInClients());
  }
});

async function triggerDriveQueueInClients() {
  try {
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
    clientsList.forEach((c) => c.postMessage({ type: "TRIGGER_DRIVE_QUEUE" }));
  } catch (e) {}
}
