import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

import {
  MISTAKES_STORAGE_KEY,
  STATS_STORAGE_KEY,
  MAX_CONVERSION_RECORDS,
  MAX_MISTAKE_RECORDS,
  accuracyOf,
  createEmptyStats,
  sanitizeConversions,
  sanitizeMistakes,
  sanitizeStats,
} from '../context/StatsContext';
import { readStats, renderApp, seedStorage } from './test-utils.jsx';

/**
 * 正确率的定义只有这一份实现，页面上四个位置都调它。
 * 所以这里要把「分母为 0」「分子大于分母」「小数取整」这几种边角占住，
 * 否则改坏了不会有任何页面报错，只会静静显示一个错的百分比。
 */
describe('accuracyOf：正确率的唯一定义', () => {
  it('按「答对 ÷ 总数」四舍五入到整数', () => {
    expect(accuracyOf(1, 3)).toBe(33);
    expect(accuracyOf(2, 3)).toBe(67);
    expect(accuracyOf(1, 2)).toBe(50);
    expect(accuracyOf(7, 7)).toBe(100);
  });

  it('分母为 0 时返回 0，而不是 NaN 或 Infinity', () => {
    expect(accuracyOf(0, 0)).toBe(0);
    expect(accuracyOf(3, 0)).toBe(0);
    expect(Number.isNaN(accuracyOf(0, 0))).toBe(false);
  });

  it('数据不完整时按 0 处理，不让脏数据变成 NaN 显示在卡片上', () => {
    expect(accuracyOf(undefined, undefined)).toBe(0);
    expect(accuracyOf(null, null)).toBe(0);
    expect(accuracyOf('3', '4')).toBe(0);
    expect(accuracyOf(-1, 10)).toBe(0);
  });
});

describe('sanitizeStats：读取时的结构校验', () => {
  it('不是对象时直接回退到空结构', () => {
    expect(sanitizeStats(null)).toEqual(createEmptyStats());
    expect(sanitizeStats('oops')).toEqual(createEmptyStats());
    expect(sanitizeStats(42)).toEqual(createEmptyStats());
  });

  it('补齐缺失字段（旧版本只存过 total / correct）', () => {
    const result = sanitizeStats({ total: 5, correct: 3 });

    expect(result).toEqual({
      total: 5,
      correct: 3,
      wrong: 2,
      streak: 0,
      bestStreak: 0,
      history: [],
    });
  });

  it('修正自相矛盾的数据：correct 不会超过 total', () => {
    const result = sanitizeStats({ total: 3, correct: 99, streak: 4, bestStreak: 1 });

    expect(result.correct).toBe(3);
    expect(result.wrong).toBe(0);
    expect(result.bestStreak).toBe(4);
  });

  it('丢弃结构不对的趋势条目，并裁掉负数与小数', () => {
    const result = sanitizeStats({
      total: 10,
      correct: 10,
      history: [
        { date: '2026-09-01', total: 2, correct: 1 },
        null,
        { total: 5 },
        { date: '2026-09-02', total: -3, correct: 1.8 },
      ],
    });

    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toEqual({ date: '2026-09-01', total: 2, correct: 1 });
    expect(result.history[1]).toEqual({ date: '2026-09-02', total: 0, correct: 0 });
  });

  it('趋势最多保留最近 30 天', () => {
    const history = Array.from({ length: 40 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      total: 1,
      correct: 1,
    }));

    const result = sanitizeStats({ total: 40, correct: 40, history });

    expect(result.history).toHaveLength(30);
    expect(result.history[0].date).toBe('2026-08-11');
  });
});

describe('sanitizeMistakes / sanitizeConversions：过滤残缺记录', () => {
  it('非数组一律当空列表', () => {
    expect(sanitizeMistakes({ id: 'x' })).toEqual([]);
    expect(sanitizeConversions('x')).toEqual([]);
  });

  it('丢掉缺少必要字段的错题记录', () => {
    const bad = [
      null,
      { id: 'a' },
      { id: 'b', source: '10', fromBase: 2, toBase: 16, answer: 'A' },
      { id: 'c', source: '10', fromBase: 2, toBase: 16 },
    ];

    expect(sanitizeMistakes(bad)).toEqual([bad[2]]);
  });

  it('丢掉缺少必要字段的转换记录', () => {
    const bad = [
      { input: '10', fromBase: 2, toBase: 16, result: 'A' },
      { input: '10', fromBase: 2, result: 'A' },
      { input: 10, fromBase: 2, toBase: 16, result: 'A' },
    ];

    expect(sanitizeConversions(bad)).toEqual([bad[0]]);
  });

  it('超过上限的旧记录被截断', () => {
    const mistakes = Array.from({ length: MAX_MISTAKE_RECORDS + 20 }, (_, index) => ({
      id: `m${index}`,
      source: '10',
      fromBase: 2,
      toBase: 16,
      answer: 'A',
    }));
    const conversions = Array.from({ length: MAX_CONVERSION_RECORDS + 20 }, (_, index) => ({
      input: `${index}`,
      fromBase: 2,
      toBase: 16,
      result: 'A',
    }));

    expect(sanitizeMistakes(mistakes)).toHaveLength(MAX_MISTAKE_RECORDS);
    expect(sanitizeConversions(conversions)).toHaveLength(MAX_CONVERSION_RECORDS);
  });
});

describe('storage 边界：坏数据不会把页面带崩', () => {
  it('localStorage 里是非法 JSON 时回退到默认值，页面照常渲染', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(STATS_STORAGE_KEY, '{"total": 这不是 JSON');

    const { findByRole } = renderApp({ route: '/dashboard' });

    expect(await findByRole('heading', { name: '学习统计' })).toBeInTheDocument();
    expect(readStats()).toEqual(createEmptyStats());
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('读取'),
      expect.anything(),
    );

    warn.mockRestore();
  });

  it('旧版本残留的结构会被补齐后再回写，统计页数字对得上', async () => {
    seedStorage({ [STATS_STORAGE_KEY]: { total: 5, correct: 3, streak: 2 } });

    const { findAllByText } = renderApp({ route: '/dashboard' });

    expect(await findAllByText('5')).not.toHaveLength(0);
    expect(readStats()).toEqual({
      total: 5,
      correct: 3,
      wrong: 2,
      streak: 2,
      bestStreak: 2,
      history: [],
    });
  });

  it('错题本里的残缺记录不会渲染出空白卡片', async () => {
    seedStorage({
      [MISTAKES_STORAGE_KEY]: [
        { id: 'ok', source: '1010', fromBase: 2, toBase: 16, answer: 'A', submitted: 'B', decimal: '10', createdAt: Date.now() },
        { id: 'broken', source: '1010' },
        null,
      ],
    });

    const { findAllByRole, findByRole, queryByText } = renderApp({ route: '/mistakes' });

    expect(await findByRole('heading', { name: '错题本' })).toBeInTheDocument();
    expect(await findAllByRole('listitem')).toHaveLength(1);
    expect(queryByText('（未作答）')).toBeNull();
  });

  it('另一个标签页删掉 key 时回到初始值，而不是把 null 写回存储', async () => {
    seedStorage({
      [STATS_STORAGE_KEY]: { total: 7, correct: 7, wrong: 0, streak: 7, bestStreak: 7, history: [] },
    });

    renderApp({ route: '/dashboard' });

    window.localStorage.removeItem(STATS_STORAGE_KEY);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STATS_STORAGE_KEY,
        newValue: null,
        storageArea: window.localStorage,
      }),
    );

    await waitFor(() => expect(readStats()).toEqual(createEmptyStats()));
  });
});
