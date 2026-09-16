/**
 * Base Converter Trainer 的 Service Worker
 * ---------------------------------------------------------------------------
 * 策略：
 *   - 页面导航（navigate）：网络优先，失败时回退到缓存的 index.html，
 *     这样离线打开也能进入应用外壳；
 *   - 静态资源（js/css/图片/图标）：缓存优先，同时后台更新，下次访问更快；
 *   - 只处理同源 GET 请求，避免污染第三方接口。
 *
 * 注意：构建产物文件名带 hash，因此不需要在安装时预缓存全部资源，
 * 首次访问后按需缓存即可满足「基础离线访问」。
 */

const CACHE_VERSION = 'bct-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn('[SW] 预缓存失败，稍后按需缓存', error);
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((cached) => cached || caches.match('/'))
            .then(
              (cached) =>
                cached ||
                new Response('离线状态且没有可用缓存，请先联网访问一次。', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                }),
            ),
        ),
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
