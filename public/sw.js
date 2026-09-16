/**
 * Base Converter Trainer 的 Service Worker
 * ---------------------------------------------------------------------------
 * 策略：
 *   - 页面导航（navigate）：网络优先，失败时回退到缓存的 index.html，
 *     这样离线打开也能进入应用外壳；
 *   - 静态资源（js/css/图片/图标）：缓存优先，同时后台更新，下次访问更快；
 *   - 只处理同源 GET 请求，避免污染第三方接口。
 *
 * 关于路径：本文件被复制到构建产物的根目录，因此它自己所在的目录就是应用根目录。
 * 这里统一用相对自身的路径（而不是写死 `/`），
 * 使「根路径部署」和「子路径部署」（GitHub Pages 的 /<repo>/）共用同一份代码。
 *
 * 注意：构建产物文件名带 hash，因此不需要在安装时预缓存全部资源，
 * 首次访问后按需缓存即可满足「基础离线访问」。
 */

const CACHE_VERSION = 'bct-v2';

/** 应用根目录（即本文件所在目录），两种部署方式下都能自动算对 */
const SCOPE_ROOT = new URL('./', self.location).href;

/** 把相对路径解析成站点内的绝对地址 */
function asset(path) {
  return new URL(path, SCOPE_ROOT).href;
}

const SHELL_INDEX = asset('index.html');
const APP_SHELL = [SCOPE_ROOT, SHELL_INDEX, asset('manifest.webmanifest'), asset('favicon.svg')];

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
          caches.open(CACHE_VERSION).then((cache) => cache.put(SHELL_INDEX, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(SHELL_INDEX)
            .then((cached) => cached || caches.match(SCOPE_ROOT))
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
