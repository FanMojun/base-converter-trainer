import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Navbar from './Navbar.jsx';
import Home from '../pages/Home.jsx';
import Converter from '../pages/Converter.jsx';
import Practice from '../pages/Practice.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Mistakes from '../pages/Mistakes.jsx';

/** 路由切换后回到页面顶部，避免在长页面之间跳转时停在半中间。 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

/**
 * 应用外壳：导航 + 路由出口 + 页脚。
 * 与具体使用哪种 Router 解耦，因此既能挂在 BrowserRouter 下，
 * 也能在测试里用 MemoryRouter 直接渲染。
 */
export default function AppShell() {
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <Navbar />

      <main id="main" className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/converter" element={<Converter />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mistakes" element={<Mistakes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <p className="muted">Base Converter Trainer · 进制转换与算法训练平台</p>
          <p className="muted">React + Vite · 数据保存在本地浏览器</p>
        </div>
      </footer>
    </>
  );
}
