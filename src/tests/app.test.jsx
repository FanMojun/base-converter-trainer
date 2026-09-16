import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AppShell from '../components/AppShell.jsx';
import StatsProvider from '../context/StatsProvider.jsx';

/**
 * 整机冒烟测试：把整棵组件树在五个路由下各渲染一遍。
 * 单元测试只能保证工具函数正确，这里用来兜住「引入写错、Hook 用错、
 * 某个页面在特定路由下直接崩掉」这类只有整树渲染才会暴露的问题。
 */
function renderAt(pathname) {
  return renderToString(
    <StatsProvider>
      <MemoryRouter initialEntries={[pathname]}>
        <AppShell />
      </MemoryRouter>
    </StatsProvider>,
  );
}

const ROUTES = ['/', '/converter', '/practice', '/dashboard', '/mistakes'];

describe('AppShell 整机渲染', () => {
  it.each(ROUTES)('%s 路由可以正常渲染出内容', (route) => {
    const html = renderAt(route);

    expect(html).toContain('Base Converter');
    expect(html.length).toBeGreaterThan(500);
  });

  it('首页包含四个模块入口', () => {
    const html = renderAt('/');

    expect(html).toContain('进制转换器');
    expect(html).toContain('随机练习');
    expect(html).toContain('学习数据');
    expect(html).toContain('错题本');
  });

  it('转换页渲染出进制选择与输入框', () => {
    const html = renderAt('/converter');

    expect(html).toContain('converter-input');
    expect(html).toContain('目标进制');
    expect(html).toContain('输出字符');
  });

  it('练习页渲染出题目与答案输入框', () => {
    const html = renderAt('/practice');

    expect(html).toContain('practice-answer');
    expect(html).toContain('提交答案');
    expect(html).toContain('难度选择');
  });

  it('统计页在没有数据时展示空状态而不是空图表', () => {
    expect(renderAt('/dashboard')).toContain('还没有趋势数据');
  });

  it('错题本在没有记录时给出引导', () => {
    expect(renderAt('/mistakes')).toContain('错题本还是空的');
  });

  // <Navigate> 的跳转发生在浏览器端，静态渲染时只会渲染出空的路由出口，
  // 因此这里断言「外壳完整且不抛错」，真正的重定向由浏览器行为保证。
  it('未知路径不会白屏，应用外壳仍然完整', () => {
    expect(() => renderAt('/not-exist')).not.toThrow();

    const html = renderAt('/not-exist');

    expect(html).toContain('app-main');
    expect(html).toContain('Base Converter Trainer');
  });
});
