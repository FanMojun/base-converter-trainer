/**
 * 注册 Service Worker。
 * 开发环境不注册：Vite 的 HMR 依赖实时请求，缓存会干扰调试。
 * 想验证离线能力，请执行 npm run build && npm run preview。
 */
export default function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        // 有新版本接管时提示刷新即可拿到最新代码
        registration.addEventListener('updatefound', () => {
          console.warn('[PWA] 检测到新版本，刷新页面即可更新');
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker 注册失败', error);
      });
  });
}
