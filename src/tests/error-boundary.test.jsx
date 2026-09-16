import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ErrorBoundary from '../components/ErrorBoundary.jsx';
import AppShell from '../components/AppShell.jsx';
import StatsProvider from '../context/StatsProvider.jsx';

/**
 * 让练习页在渲染时抛错。
 * 用来验证「某个页面崩了之后，导航仍然可用」这个真实场景 ——
 * 这比单独测 ErrorBoundary 更接近线上会发生的事。
 */
vi.mock('../pages/Practice.jsx', () => ({
  default: function BrokenPractice() {
    throw new Error('模拟练习页渲染失败');
  },
}));

/** 渲染时会抛异常的组件，用于单元测试。 */
function Boom() {
  throw new Error('测试用异常');
}

beforeEach(() => {
  // React 会把捕获到的异常再打一遍到控制台，这里静音，避免污染测试输出
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // jsdom 没有实现 navigation，直接替换成可断言的桩
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: vi.fn() },
  });
});

describe('错误边界 · 单元行为', () => {
  it('子组件正常时原样渲染，不干涉任何内容', () => {
    render(
      <ErrorBoundary>
        <p>一切正常</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('一切正常')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('子组件抛异常时渲染兜底页面，而不是白屏', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('这个页面出问题了')).toBeInTheDocument();
  });

  it('兜底页面把原始错误信息露出来，方便定位问题', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/测试用异常/)).toBeInTheDocument();
  });

  it('点击「刷新重试」会触发页面重载', async () => {
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: '刷新重试' }));

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('提供回到首页的入口，且地址带上了部署前缀', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('link', { name: '回到首页' })).toHaveAttribute(
      'href',
      import.meta.env.BASE_URL,
    );
  });

  it('捕获到的异常会写进控制台，便于后续接监控平台', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    const call = console.error.mock.calls.find((args) => args[0] === '[ErrorBoundary] 页面渲染失败');

    expect(call).toBeDefined();
    expect(call[1]).toBeInstanceOf(Error);
    expect(call[1].message).toBe('测试用异常');
  });
});

describe('错误边界 · 与路由集成', () => {
  function renderApp(route) {
    return {
      user: userEvent.setup(),
      ...render(
        <StatsProvider>
          <MemoryRouter initialEntries={[route]}>
            <AppShell />
          </MemoryRouter>
        </StatsProvider>,
      ),
    };
  }

  it('页面崩溃时导航栏和页脚仍然在，用户不会被卡死', () => {
    renderApp('/practice');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    // 关键：外壳没有一起崩溃
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '首页' })).toBeInTheDocument();
  });

  it('崩溃之后切换到别的页面可以立刻恢复', async () => {
    const { user } = renderApp('/practice');

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '首页' }));

    // 边界以路由地址为 key，换页面会重置错误状态
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: /把进制转换/ }),
    ).toBeInTheDocument();
  });

  it('没出问题的页面不受错误边界影响', () => {
    renderApp('/converter');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '进制转换器' })).toBeInTheDocument();
  });
});
