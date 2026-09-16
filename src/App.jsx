import { BrowserRouter } from 'react-router-dom';

import AppShell from './components/AppShell.jsx';
import StatsProvider from './context/StatsProvider.jsx';

import './styles/pages.css';

/**
 * 部署在子路径下时（GitHub Pages 的 /<repo>/），Router 必须知道这个前缀，
 * 否则真实路径对不上任何路由，导航链接也会跳到域名根目录。
 * BASE_URL 由 Vite 的 base 配置决定，根路径部署时为 '/'，此时等价于不设 basename。
 */
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '');

/**
 * 应用入口：只负责把 Router 与全局状态接上。
 * 页面结构见 components/AppShell.jsx。
 */
export default function App() {
  return (
    <StatsProvider>
      <BrowserRouter basename={basename || undefined}>
        <AppShell />
      </BrowserRouter>
    </StatsProvider>
  );
}
