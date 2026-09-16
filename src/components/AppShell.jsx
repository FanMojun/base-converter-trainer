import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import ErrorBoundary from './ErrorBoundary.jsx';
import Navbar from './Navbar.jsx';
import Home from '../pages/Home.jsx';
import Converter from '../pages/Converter.jsx';
import Practice from '../pages/Practice.jsx';
import Mistakes from '../pages/Mistakes.jsx';

/**
 * 统计页按需加载。
 * 它是唯一依赖 Recharts 的页面，而图表库占了整个首屏体积的大头；
 * 静态 import 会让首页也必须先下载完图表库才能渲染，
 * 拆成动态 import 之后，只有真正进入统计页才会去拉这个包。
 */
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));

/** 路由切换后回到页面顶部，避免在长页面之间跳转时停在半中间。 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

/** 动态加载期间的占位。用 role="status" 让读屏软件也能感知到页面正在切换。 */
function RouteFallback() {
  return (
    <div className="container page">
      <p className="muted" role="status">
        页面加载中……
      </p>
    </div>
  );
}

/**
 * 应用外壳：导航 + 路由出口 + 页脚。
 * 与具体使用哪种 Router 解耦，因此既能挂在 BrowserRouter 下，
 * 也能在测试里用 MemoryRouter 直接渲染。
 */
export default function AppShell() {
  const { pathname } = useLocation();

  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <Navbar />

      <main id="main" className="app-main">
        {/*
          错误边界包在 Suspense 外层：这样既能接住页面渲染时抛出的异常，
          也能接住懒加载的 chunk 拉取失败。
          key 用当前路由地址 —— 某个页面崩了之后，用户点到别的页面能立刻恢复，
          而不必先刷新整页。
        */}
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/converter" element={<Converter />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mistakes" element={<Mistakes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
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
