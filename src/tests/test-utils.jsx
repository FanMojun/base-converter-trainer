import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AppShell from '../components/AppShell.jsx';
import StatsProvider from '../context/StatsProvider.jsx';
import { MISTAKES_STORAGE_KEY, STATS_STORAGE_KEY, CONVERSIONS_STORAGE_KEY } from '../context/StatsContext';

/**
 * 渲染整棵应用（全局状态 + 路由 + 外壳）。
 * 用真实 DOM 渲染而不是静态字符串，因此可以像用户那样打字、点击、切换进制。
 *
 * @param {{route?: string}} [options] route 决定初始地址
 * @returns {{user: import('@testing-library/user-event').UserEvent, ...}} user 用于模拟交互
 */
export function renderApp({ route = '/' } = {}) {
  const user = userEvent.setup();

  return {
    user,
    ...render(
      <StatsProvider>
        <MemoryRouter initialEntries={[route]}>
          <AppShell />
        </MemoryRouter>
      </StatsProvider>,
    ),
  };
}

/** 直接写入 localStorage，用来构造「用户之前已经有数据」的场景。 */
export function seedStorage(entries) {
  Object.entries(entries).forEach(([key, value]) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  });
}

/** 读取 localStorage 里的学习数据 / 错题，断言持久化结果时使用。 */
export function readStats() {
  return JSON.parse(window.localStorage.getItem(STATS_STORAGE_KEY));
}

export function readMistakes() {
  return JSON.parse(window.localStorage.getItem(MISTAKES_STORAGE_KEY));
}

export function readConversions() {
  return JSON.parse(window.localStorage.getItem(CONVERSIONS_STORAGE_KEY));
}

/**
 * 读取转换结果。
 * `<output>` 的结构是「数值 + 表示进制的下标」，下标是子元素，
 * 所以取第一个子节点即可拿到数值本身；二进制结果带四位分组空格，一并去掉。
 */
export function readConverterOutput(container) {
  const output = container.querySelector('output');

  return output ? output.firstChild.textContent.replace(/\s/g, '') : null;
}

/** 从练习卡片上读出当前题目，用于在不依赖随机数种子的前提下算出正确答案。 */
export function readCurrentQuestion(container) {
  const sourceNode = container.querySelector('.practice-card__source');
  const badges = [...container.querySelectorAll('.practice-card__meta .badge')];

  const source = sourceNode.firstChild.textContent.replace(/\s/g, '');
  const fromBase = Number(badges[0].textContent.split('·')[1]);
  const toBase = Number(badges[1].textContent.split('·')[1]);

  return { source, fromBase, toBase };
}

/** 按标签定位统计卡片，避免在整页里用文本模糊匹配数字。 */
export function readStatTile(label) {
  const tile = document.querySelector('.statistics');

  if (!tile) return null;

  const labelNode = [...tile.querySelectorAll('.stat-tile__label')].find(
    (node) => node.textContent === label,
  );

  return labelNode?.closest('.stat-tile') ?? null;
}

export { CONVERSIONS_STORAGE_KEY, MISTAKES_STORAGE_KEY, STATS_STORAGE_KEY };
