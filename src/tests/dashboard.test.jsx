import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { convert } from '../utils/converter';
import {
  MISTAKES_STORAGE_KEY,
  STATS_STORAGE_KEY,
  readCurrentQuestion,
  readStatTile,
  readStats,
  renderApp,
  seedStorage,
} from './test-utils.jsx';

/** 取某张指标卡片的数值节点；卡片不存在时直接让用例失败，而不是抛难以定位的错。 */
function statValue(label) {
  const tile = readStatTile(label);

  expect(tile, `找不到指标卡片「${label}」`).not.toBeNull();

  return tile.querySelector('.stat-tile__value');
}

describe('统计页 · 指标计算', () => {
  it('没有数据时全部指标为 0，并展示空状态引导', async () => {
    renderApp({ route: '/dashboard' });

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(statValue('总练习次数')).toHaveTextContent(/^0$/);
    expect(statValue('正确率')).toHaveTextContent(/^0%$/);
    expect(screen.getByText('还没有趋势数据')).toBeInTheDocument();
  });

  it('正确率按「答对 / 总数」四舍五入计算', async () => {
    seedStorage({
      [STATS_STORAGE_KEY]: {
        total: 8,
        correct: 6,
        wrong: 2,
        streak: 3,
        bestStreak: 5,
        history: [{ date: '2026-09-16', total: 8, correct: 6 }],
      },
    });

    renderApp({ route: '/dashboard' });

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(statValue('总练习次数')).toHaveTextContent(/^8$/);
    expect(statValue('正确次数')).toHaveTextContent(/^6$/);
    expect(statValue('错误次数')).toHaveTextContent(/^2$/);
    // 6 / 8 = 75%
    expect(statValue('正确率')).toHaveTextContent(/^75%$/);
    expect(statValue('当前连续答对')).toHaveTextContent(/^3$/);
    expect(statValue('历史最高连对')).toHaveTextContent(/^5$/);
  });

  it('总数大于 0 但还没答对时，正确率是 0 而不是 NaN', async () => {
    seedStorage({
      [STATS_STORAGE_KEY]: {
        total: 4,
        correct: 0,
        wrong: 4,
        streak: 0,
        bestStreak: 0,
        history: [{ date: '2026-09-16', total: 4, correct: 0 }],
      },
    });

    renderApp({ route: '/dashboard' });

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(statValue('正确率')).toHaveTextContent(/^0%$/);
  });

  it('每日明细表按天展示练习量、答对答错与当天正确率', async () => {
    seedStorage({
      [STATS_STORAGE_KEY]: {
        total: 8,
        correct: 6,
        wrong: 2,
        streak: 0,
        bestStreak: 0,
        history: [{ date: '2026-09-16', total: 8, correct: 6 }],
      },
    });

    renderApp({ route: '/dashboard' });

    const row = (await screen.findByRole('table')).querySelector('tbody tr');

    expect(row).toHaveTextContent('2026-09-16');
    expect(row).toHaveTextContent('75%');
  });
});

describe('统计页 · 与练习联动', () => {
  it('在练习页答对后，统计页的次数与正确率同步更新', async () => {
    const { user, container } = renderApp({ route: '/practice' });
    const question = readCurrentQuestion(container);
    const answer = convert(question.source, question.fromBase, question.toBase).result;

    await user.type(screen.getByLabelText('答案输入框'), answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await screen.findByText('✓ 回答正确');

    await user.click(screen.getByRole('link', { name: '统计' }));

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(statValue('总练习次数')).toHaveTextContent(/^1$/);
    expect(statValue('正确次数')).toHaveTextContent(/^1$/);
    expect(statValue('正确率')).toHaveTextContent(/^100%$/);
    expect(statValue('当前连续答对')).toHaveTextContent(/^1$/);
  });

  it('在练习页答错后，正确率为 0 且错题出现在最近错题里', async () => {
    const { user } = renderApp({ route: '/practice' });

    await user.type(screen.getByLabelText('答案输入框'), '0');
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await screen.findByText('✕ 回答错误');

    await user.click(screen.getByRole('link', { name: '统计' }));

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(statValue('错误次数')).toHaveTextContent(/^1$/);
    expect(statValue('正确率')).toHaveTextContent(/^0%$/);

    const recent = document.querySelector('.recent-mistakes');

    expect(recent.querySelectorAll('li')).toHaveLength(1);
  });
});

describe('统计页 · 重置数据', () => {
  it('没有数据时重置按钮不可点', async () => {
    renderApp({ route: '/dashboard' });

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(screen.getByRole('button', { name: '重置学习数据' })).toBeDisabled();
  });

  it('重置需要二次确认，点取消不会清数据', async () => {
    seedStorage({
      [STATS_STORAGE_KEY]: { total: 3, correct: 2, wrong: 1, streak: 0, bestStreak: 1, history: [] },
    });

    const { user } = renderApp({ route: '/dashboard' });

    await user.click(await screen.findByRole('button', { name: '重置学习数据' }));
    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(readStats()).toMatchObject({ total: 3, correct: 2 });
  });

  it('确认重置后统计与错题都被清空', async () => {
    seedStorage({
      [STATS_STORAGE_KEY]: { total: 3, correct: 2, wrong: 1, streak: 0, bestStreak: 1, history: [] },
      [MISTAKES_STORAGE_KEY]: [
        {
          id: 'm_1',
          source: '1010',
          fromBase: 2,
          toBase: 16,
          answer: 'A',
          submitted: 'F',
          decimal: '10',
          createdAt: Date.now(),
        },
      ],
    });

    const { user } = renderApp({ route: '/dashboard' });

    await user.click(await screen.findByRole('button', { name: '重置学习数据' }));
    await user.click(screen.getByRole('button', { name: '确认清空' }));

    expect(readStats()).toMatchObject({ total: 0, correct: 0, wrong: 0, streak: 0 });
    expect(screen.getByText('暂无错题，保持住。')).toBeInTheDocument();
  });
});
