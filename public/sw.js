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
 * 关于预缓存：构建产物的文件名带 hash，没法写死，所以安装时从 index.html 里
 * 现读现取。这一条很关键 —— 只缓存 HTML 而不缓存它引用的 JS/CSS，
 * 用户第一次访问后断网只能得到一个打不开的外壳（实践验证过）。
 */

const CACHE_VERSION = 'bct-v3';

/** 应用根目录（即本文件所在目录），两种部署方式下都能自动算对 */
const SCOPE_ROOT = new URL('./', self.location).href;

/** 把相对路径解析成站点内的绝对地址 */
function asset(path) {
  return new URL(path, SCOPE_ROOT).href;
}

const SHELL_INDEX = asset('index.html');

/** 与构建产物无关的固定外壳资源 */
const STATIC_SHELL = [SCOPE_ROOT, asset('manifest.webmanifest'), asset('favicon.svg')];

/**
 * 从 HTML 里挑出同源的 script / link 引用。
 * 覆盖 <script src>、<link rel="stylesheet">、<link rel="modulepreload">、图标与清单。
 */
function collectReferencedAssets(html) {
  const urls = new Set();
  const pattern = /<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/gi;

  let match = pattern.exec(html);

  while (match !== null) {
    const absolute = new URL(match[1], SCOPE_ROOT);

    if (absolute.origin === self.location.origin) {
      urls.add(absolute.href);
    }

    match = pattern.exec(html);
  }

  return [...urls];
}

/**
 * 预缓存。单个资源失败不影响整体安装，因此逐项处理而不是 addAll。
 * index.html 用 no-cache 请求，避免升级 SW 时又拿到旧的外壳。
 */
async function precache() {
  const cache = await caches.open(CACHE_VERSION);

  await Promise.allSettled(STATIC_SHELL.map((url) => cache.add(url)));

  let html = '';

  try {
    const response = await fetch(new Request(SHELL_INDEX, { cache: 'no-cache' }));

    if (response.ok) {
      html = await response.clone().text();
      await cache.put(SHELL_INDEX, response);
    }
  } catch (error) {
    console.warn('[SW] 预缓存 index.html 失败，稍后按需缓存', error);
  }

  const assets = collectReferencedAssets(html);
  const results = await Promise.allSettled(assets.map((url) => cache.add(url)));
  const failed = results.filter((result) => result.status === 'rejected').length;

  // 正常情况下不往控制台写东西；预缓存不完整才值得提醒，因为那会直接影响离线可用性
  if (failed > 0) {
    console.warn(`[SW] 预缓存不完整：${failed}/${assets.length} 项构建产物获取失败`);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
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

  // 页面导航：网络优先，离线时回退到缓存的外壳
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
