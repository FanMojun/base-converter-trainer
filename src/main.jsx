import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import registerServiceWorker from './pwa/registerServiceWorker.js';
import './styles/tokens.css';
import './styles/base.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('找不到挂载节点 #root，请检查 index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 生产环境下注册 Service Worker，提供安装能力与离线访问
registerServiceWorker();
