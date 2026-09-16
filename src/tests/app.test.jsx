import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readConverterOutput, renderApp } from './test-utils.jsx';

/** 首页的一级标题，用来判断「当前在首页」 */
const HOME_HEADING = /^进制转换练习工具$/;

function homeHeading() {
  return screen.getByRole('heading', { level: 1, name: HOME_HEADING });
}

describe('应用外壳 · 路由', () => {
  it('默认进入首页', () => {
    renderApp();

    expect(homeHeading()).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
  });

  it('点击导航可以在五个页面之间切换', async () => {
    const { user } = renderApp();

    const cases = [
      { link: '转换器', heading: '进制转换器' },
      { link: '练习', heading: '随机练习' },
      { link: '统计', heading: '学习统计' },
      { link: '错题本', heading: '错题本' },
      { link: '首页', heading: HOME_HEADING },
    ];

    for (const item of cases) {
      await user.click(screen.getByRole('link', { name: item.link }));

      expect(
        await screen.findByRole('heading', { level: 1, name: item.heading }),
      ).toBeInTheDocument();
    }
  });

  it('未知路径会回到首页，而不是渲染出一片空白', () => {
    renderApp({ route: '/not-exist' });

    expect(homeHeading()).toBeInTheDocument();
  });

  it('页面之间跳转时把滚动位置重置到顶部', async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole('link', { name: '练习' }));

    expect(window.scrollTo).toHaveBeenCalled();
  });
});

describe('应用外壳 · 无障碍入口', () => {
  it('提供跳到主要内容的快捷链接', () => {
    renderApp();

    const skipLink = screen.getByRole('link', { name: '跳到主要内容' });

    expect(skipLink).toHaveAttribute('href', '#main');
  });

  it('移动端导航菜单可以展开与收起', async () => {
    const { user } = renderApp();
    const toggle = screen.getByRole('button', { name: '展开导航菜单' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    const expanded = screen.getByRole('button', { name: '收起导航菜单' });

    expect(expanded).toHaveAttribute('aria-expanded', 'true');

    await user.click(expanded);

    expect(screen.getByRole('button', { name: '展开导航菜单' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

describe('首页 · 内嵌转换器', () => {
  it('不跳页就能直接完成一次转换', async () => {
    const { user, container } = renderApp();

    await user.selectOptions(screen.getByLabelText('输入进制'), '16');
    await user.selectOptions(screen.getByLabelText('目标进制'), '2');
    await user.type(screen.getByLabelText('输入数值'), 'FF');
    await user.click(screen.getByRole('button', { name: '转换' }));

    // FF₁₆ = 11111111₂，四位分组后带空格，helper 会去掉
    expect(readConverterOutput(container)).toBe('11111111');
  });

  it('从首页跳转到练习页开始做题', async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole('link', { name: '开始练习' }));

    expect(screen.getByRole('heading', { level: 1, name: '随机练习' })).toBeInTheDocument();
  });
});
