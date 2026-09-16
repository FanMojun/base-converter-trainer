import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 与 Vitest 共用同一份配置：这里把测试相关字段一并写进来，
// 避免再维护一份 vitest.config.js。
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 把站点挂在 /<repo>/ 子路径下，用环境变量注入；
  // 本地开发与容器部署不传则为根路径，两种部署方式共用一份配置。
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    // 默认不自动打开浏览器，交给使用者自己控制
    open: false,
    // 绑定全部网卡并放行任意 Host 头：本地开发默认只监听 localhost，
    // 部署到容器 / 反向代理后面时会因为 Host 校验被拒（Blocked request）
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: 4173,
    // 线上以 `vite preview` 作为单端口 HTTP 服务，同样需要放行代理域名
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    // react 与 recharts 各自成块：
    //   - react 首屏必需，单独成块有利于长期缓存
    //   - recharts 只被懒加载的统计页引用，独立成块后不会进入首屏
    // 注意：拆包本身不等于按需加载 —— manualChunks 只决定「怎么分文件」，
    // 静态引用照样会被首屏一起下载。真正的按需来自 AppShell 里的 React.lazy。
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    // 组件测试要模拟真实用户行为（点击、输入、选择），必须有真实 DOM。
    // 纯函数测试在 jsdom 下同样能跑，所以统一用一套环境，不为单个文件再开分支。
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.{js,jsx}'],
    reporters: 'default',
    // 每个用例结束后还原 spy / mock，避免相互污染
    restoreMocks: true,
  },
});
