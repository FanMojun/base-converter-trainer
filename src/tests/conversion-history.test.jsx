import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CONVERSIONS_STORAGE_KEY,
  MISTAKES_STORAGE_KEY,
  STATS_STORAGE_KEY,
  readConversions,
  readStatTile,
  renderApp,
  seedStorage,
} from './test-utils.jsx';

/**
 * 转换历史测试。
 * 这一块存在的原因是：README 与统计页曾声称「转换器的数据也会进入统计」，
 * 但当时 `recordAttempt` 只有练习页在调用，转换器什么都没记录。
 * 现在转换器会真实落库，这些用例就是那句承诺的证据。
 */

/** 在转换页完成一次转换。每次都先清空输入框，避免上一次的内容被追加进来。 */
async function convertOnce(user, { input, from = '2', to = '16' }) {
  const inputNode = screen.getByLabelText('输入数值');

  await user.selectOptions(screen.getByLabelText('输入进制'), from);
  await user.selectOptions(screen.getByLabelText('目标进制'), to);
  await user.clear(inputNode);
  await user.type(inputNode, input);
  await user.click(screen.getByRole('button', { name: '转换' }));
}

describe('转换历史 · 记录写入', () => {
  it('转换成功后写入一条包含输入值、两个进制、结果与时间的记录', async () => {
    const { user } = renderApp({ route: '/converter' });
    const before = Date.now();

    await convertOnce(user, { input: '101010' });

    const records = readConversions();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ input: '101010', fromBase: 2, toBase: 16, result: '2A' });
    expect(records[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it('输入不合法时不会产生记录', async () => {
    const { user } = renderApp({ route: '/converter' });

    await user.type(screen.getByLabelText('输入数值'), '102');
    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(readConversions()).toEqual([]);
  });

  it('空输入时不会产生记录', async () => {
    const { user } = renderApp({ route: '/converter' });

    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(readConversions()).toEqual([]);
  });

  it('连续两次相同的转换只算一次', async () => {
    const { user } = renderApp({ route: '/converter' });

    await convertOnce(user, { input: '101010' });
    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(readConversions()).toHaveLength(1);
  });

  it('换成另一组参数会记为新的一次', async () => {
    const { user } = renderApp({ route: '/converter' });

    await convertOnce(user, { input: '101010', from: '2', to: '16' });
    await convertOnce(user, { input: '101010', from: '16', to: '2' });

    const records = readConversions();

    expect(records).toHaveLength(2);
    // 最新的一条是「十六进制 → 二进制」，两条记录的参数不同，因此没有被去重掉
    expect(records[0]).toMatchObject({ input: '101010', fromBase: 16, toBase: 2 });
    expect(records[1]).toMatchObject({ input: '101010', fromBase: 2, toBase: 16, result: '2A' });
  });

  it('最近的记录排在最前面', async () => {
    const { user } = renderApp({ route: '/converter' });

    await convertOnce(user, { input: '101' });
    await convertOnce(user, { input: '1111' });

    const records = readConversions();

    expect(records.map((item) => item.input)).toEqual(['1111', '101']);
  });

  it('转换器不会影响练习相关的统计口径', async () => {
    const { user } = renderApp({ route: '/converter' });

    await convertOnce(user, { input: '101010' });

    // 转换不计入练习次数与正确率，也不该产生错题
    expect(JSON.parse(window.localStorage.getItem(STATS_STORAGE_KEY))).toMatchObject({
      total: 0,
      correct: 0,
    });
    expect(readConversions()).toHaveLength(1);
  });

  it('首页内嵌的转换器同样会记录', async () => {
    const { user } = renderApp();

    await convertOnce(user, { input: 'FF', from: '16', to: '2' });

    expect(readConversions()).toHaveLength(1);
  });
});

describe('转换历史 · 统计页展示', () => {
  it('没有记录时给出引导文案', async () => {
    renderApp({ route: '/dashboard' });

    expect(await screen.findByText('还没有转换记录，去转换页转一个数试试。')).toBeInTheDocument();
    expect(readStatTile('总转换次数').querySelector('.stat-tile__value')).toHaveTextContent(/^0$/);
  });

  it('预置的记录会显示总次数与「原值 → 结果」两端的进制', async () => {
    seedStorage({
      [CONVERSIONS_STORAGE_KEY]: [
        {
          id: 'c_1',
          input: '101010',
          fromBase: 2,
          toBase: 16,
          result: '2A',
          timestamp: Date.now(),
        },
      ],
    });

    const { container } = renderApp({ route: '/dashboard' });

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(readStatTile('总转换次数').querySelector('.stat-tile__value')).toHaveTextContent(/^1$/);

    const row = container.querySelector('.conversion-list li');

    expect(row).toHaveTextContent('101010');
    expect(row).toHaveTextContent('2A');
    expect(row).toHaveTextContent('二进制 → 十六进制');
  });

  it('从转换页转完之后，统计页能看到这条记录', async () => {
    const { user, container } = renderApp({ route: '/converter' });

    await convertOnce(user, { input: '101010' });
    await user.click(screen.getByRole('link', { name: '统计' }));

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(readStatTile('总转换次数').querySelector('.stat-tile__value')).toHaveTextContent(/^1$/);
    expect(container.querySelector('.conversion-list li')).toHaveTextContent('2A');
  });

  it('记录超过 5 条时只展示最新的 5 条，但总数照实统计', async () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      id: `c_${index}`,
      input: String(index + 1),
      fromBase: 10,
      toBase: 2,
      result: '1',
      timestamp: Date.now() - index * 1000,
    }));

    seedStorage({ [CONVERSIONS_STORAGE_KEY]: many });

    const { container } = renderApp({ route: '/dashboard' });

    await screen.findByRole('heading', { level: 1, name: '学习统计' });

    expect(container.querySelectorAll('.conversion-list li')).toHaveLength(5);
    expect(readStatTile('总转换次数').querySelector('.stat-tile__value')).toHaveTextContent(/^7$/);
    expect(screen.getByText('共 7 次，仅显示最新 5 条')).toBeInTheDocument();
  });
});

describe('转换历史 · 与重置联动', () => {
  it('重置学习数据会一并清空转换历史与错题', async () => {
    seedStorage({
      [CONVERSIONS_STORAGE_KEY]: [
        { id: 'c_1', input: '1010', fromBase: 2, toBase: 16, result: 'A', timestamp: Date.now() },
      ],
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

    expect(readConversions()).toEqual([]);
    expect(screen.getByText('还没有转换记录，去转换页转一个数试试。')).toBeInTheDocument();
  });
});
