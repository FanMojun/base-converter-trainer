import { BrowserRouter } from 'react-router-dom';

import AppShell from './components/AppShell.jsx';
import StatsProvider from './context/StatsProvider.jsx';

import './styles/pages.css';

/**
 * 应用入口：只负责把 Router 与全局状态接上。
 * 页面结构见 components/AppShell.jsx。
 */
export default function App() {
  return (
    <StatsProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </StatsProvider>
  );
}
