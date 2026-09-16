import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Converter from './pages/Converter.jsx';

import './styles/pages.css';

/** 路由切换后回到页面顶部，避免在长页面之间跳转时停在半中间。 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <Navbar />

      <main id="main" className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/converter" element={<Converter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <p className="muted">Base Converter Trainer · 进制转换与算法训练平台</p>
          <p className="muted">React + Vite · 数据保存在本地浏览器</p>
        </div>
      </footer>
    </BrowserRouter>
  );
}
