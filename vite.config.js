import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 与 Vitest 共用同一份配置：这里把测试相关字段一并写进来，
// 避免再维护一份 vitest.config.js。
export default defineConfig({
  plugins: [react()],
  base: '/',
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
    // 图表库体积较大，单独拆包，首屏加载更快
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
    environment: 'node',
    include: ['src/tests/**/*.test.{js,jsx}'],
    reporters: 'default',
  },
});
