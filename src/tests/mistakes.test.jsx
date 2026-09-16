import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readMistakes, renderApp, seedStorage, MISTAKES_STORAGE_KEY } from './test-utils.jsx';

/** 构造一条错题记录，用来在测试开始前把错题本置于「已有数据」的状态。 */
function makeMistake(overrides = {}) {
  return {
    id: 'm_seed_1',
    source: '1010',
    fromBase: 2,
    toBase: 16,
    answer: 'A',
    submitted: 'F',
    decimal: '10',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('错题本 · 展示', () => {
  it('没有错题时给出引导，而不是空白页', () => {
    renderApp({ route: '/mistakes' });

    expect(screen.getByText('错题本还是空的')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去练习' })).toBeInTheDocument();
  });

  it('已有错题时展示原题、你的答案、正确答案与十进制值', () => {
    seedStorage({ [MISTAKES_STORAGE_KEY]: [makeMistake()] });

    const { container } = renderApp({ route: '/mistakes' });

    expect(container.querySelectorAll('.mistake-item')).toHaveLength(1);
    expect(container.querySelector('.mistake-item__source')).toHaveTextContent('1010');
    expect(container.querySelector('.mistake-item__wrong')).toHaveTextContent('F');
    expect(container.querySelector('.mistake-item__right')).toHaveTextContent('A');
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('多条错题全部展示，清空前的确认文案会带上条数', async () => {
    seedStorage({
      [MISTAKES_STORAGE_KEY]: [
        makeMistake({ id: 'm_1', source: '1010' }),
        makeMistake({ id: 'm_2', source: '11' }),
      ],
    });

    const { user, container } = renderApp({ route: '/mistakes' });

    expect(container.querySelectorAll('.mistake-item')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '清空错题本' }));

    expect(screen.getByText('确认清空全部 2 条？')).toBeInTheDocument();
  });
});

describe('错题本 · 操作', () => {
  it('移除单条错题会同时更新界面与 localStorage', async () => {
    seedStorage({ [MISTAKES_STORAGE_KEY]: [makeMistake()] });

    const { user, container } = renderApp({ route: '/mistakes' });

    await user.click(screen.getByRole('button', { name: '移除' }));

    expect(container.querySelectorAll('.mistake-item')).toHaveLength(0);
    expect(screen.getByText('错题本还是空的')).toBeInTheDocument();
    expect(readMistakes()).toEqual([]);
  });

  it('清空需要二次确认，点取消不会删数据', async () => {
    seedStorage({ [MISTAKES_STORAGE_KEY]: [makeMistake()] });

    const { user, container } = renderApp({ route: '/mistakes' });

    await user.click(screen.getByRole('button', { name: '清空错题本' }));
    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(container.querySelectorAll('.mistake-item')).toHaveLength(1);
    expect(readMistakes()).toHaveLength(1);
  });

  it('确认清空后错题本与 localStorage 都清空', async () => {
    seedStorage({
      [MISTAKES_STORAGE_KEY]: [makeMistake({ id: 'm_1' }), makeMistake({ id: 'm_2', source: '11' })],
    });

    const { user, container } = renderApp({ route: '/mistakes' });

    await user.click(screen.getByRole('button', { name: '清空错题本' }));
    await user.click(screen.getByRole('button', { name: '确认清空' }));

    expect(container.querySelectorAll('.mistake-item')).toHaveLength(0);
    expect(readMistakes()).toEqual([]);
  });

  it('「重新练习」会带着这道错题跳到练习页', async () => {
    seedStorage({ [MISTAKES_STORAGE_KEY]: [makeMistake()] });

    const { user, container } = renderApp({ route: '/mistakes' });

    await user.click(screen.getByRole('button', { name: '重新练习' }));

    const sourceNode = container.querySelector('.practice-card__source');

    expect(sourceNode).toBeInTheDocument();
    expect(sourceNode.firstChild.textContent.replace(/\s/g, '')).toBe('1010');
    expect(screen.getByText('错题重练')).toBeInTheDocument();
  });
});

describe('错题本 · 与练习页联动', () => {
  it('在练习页答错后，错题本里能找到这条记录', async () => {
    const { user, container } = renderApp({ route: '/practice' });

    await user.type(screen.getByLabelText('答案输入框'), '0');
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await screen.findByText('✕ 回答错误');

    const [record] = readMistakes();

    expect(record).toBeDefined();
    expect(record.submitted).toBe('0');

    // 通过真实导航进入错题本，验证跨页面的数据一致性
    await user.click(screen.getByRole('link', { name: '错题本' }));

    expect(screen.getByRole('heading', { level: 1, name: '错题本' })).toBeInTheDocument();
    expect(container.querySelectorAll('.mistake-item')).toHaveLength(1);
    expect(container.querySelector('.mistake-item__wrong')).toHaveTextContent('0');
  });
});
