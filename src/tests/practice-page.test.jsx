import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DIGIT_SETS, convert, isSupportedBase } from '../utils/converter';
import { readCurrentQuestion, readMistakes, readStats, renderApp } from './test-utils.jsx';

/**
 * 练习页交互测试。
 * 题目是随机生成的，所以测试不写死答案，而是先从卡片上读出题目、
 * 现场用转换引擎算出正确结果，再模拟用户输入与提交。
 */
function openPractice() {
  const view = renderApp({ route: '/practice' });
  const question = readCurrentQuestion(view.container);
  const answer = convert(question.source, question.fromBase, question.toBase).result;

  return { ...view, question, answer };
}

/** 一个必然不等于正确答案、但在任何进制下都合法的输入。 */
const ALWAYS_WRONG_ANSWER = '0';

describe('练习页 · 出题', () => {
  it('生成的题目进制合法，且源进制与目标进制不同', () => {
    const { question } = openPractice();

    expect(isSupportedBase(question.fromBase)).toBe(true);
    expect(isSupportedBase(question.toBase)).toBe(true);
    expect(question.fromBase).not.toBe(question.toBase);
  });

  it('题目数值只由源进制的合法字符组成，且首位不为 0', () => {
    const { question } = openPractice();

    expect([...question.source].every((char) => DIGIT_SETS[question.fromBase].includes(char))).toBe(
      true,
    );
    expect(question.source[0]).not.toBe('0');
  });

  it('页面同时呈现题目、答案输入框与提交按钮', () => {
    openPractice();

    expect(screen.getByLabelText('答案输入框')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交答案' })).toBeInTheDocument();
    expect(screen.getByText('本次会话')).toBeInTheDocument();
  });
});

describe('练习页 · 判题', () => {
  it('填写正确答案并提交后，反馈回答正确', async () => {
    const { user, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(await screen.findByText('✓ 回答正确')).toBeInTheDocument();
  });

  it('答案大小写与前导零不影响判题结果', async () => {
    const { user, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), `0${answer.toLowerCase()}`);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(await screen.findByText('✓ 回答正确')).toBeInTheDocument();
  });

  it('答错时给出正确答案与换算解析', async () => {
    const { user, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), ALWAYS_WRONG_ANSWER);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(await screen.findByText('✕ 回答错误')).toBeInTheDocument();
    expect(screen.getByText(answer)).toBeInTheDocument();
    expect(screen.getByText(/解析：/)).toBeInTheDocument();
  });

  it('提交空答案时提示用户还没有填写', async () => {
    const { user } = openPractice();

    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(await screen.findByText(/还没有填写答案/)).toBeInTheDocument();
  });

  it('作答后输入框被锁定，按钮切换为「下一题」', async () => {
    const { user, answer } = openPractice();
    const input = screen.getByLabelText('答案输入框');

    await user.type(input, answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一题' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '跳过本题' })).not.toBeInTheDocument();
  });
});

describe('练习页 · 记录与流转', () => {
  it('答对后写入统计：总数、正确数与连对都更新', async () => {
    const { user, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(readStats()).toMatchObject({ total: 1, correct: 1, wrong: 0, streak: 1, bestStreak: 1 });
  });

  it('答错后写入统计，并把错题收进错题本', async () => {
    const { user, question, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), ALWAYS_WRONG_ANSWER);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(readStats()).toMatchObject({ total: 1, correct: 0, wrong: 1, streak: 0 });

    const mistakes = readMistakes();

    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]).toMatchObject({
      source: question.source,
      fromBase: question.fromBase,
      toBase: question.toBase,
      answer,
      submitted: ALWAYS_WRONG_ANSWER,
    });
  });

  it('答对不会写入错题本', async () => {
    const { user, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(readMistakes()).toEqual([]);
  });

  it('点击「下一题」会换新题目、清空输入并解锁输入框', async () => {
    const { user, container, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await user.click(screen.getByRole('button', { name: '下一题' }));

    const input = screen.getByLabelText('答案输入框');

    expect(input).toHaveValue('');
    expect(input).toBeEnabled();
    expect(screen.getByRole('button', { name: '提交答案' })).toBeInTheDocument();
    expect(container.querySelector('.practice-feedback')).not.toBeInTheDocument();
  });

  it('跳过本题只换题，不计入统计', async () => {
    const { user } = openPractice();

    await user.click(screen.getByRole('button', { name: '跳过本题' }));

    expect(screen.getByLabelText('答案输入框')).toHaveValue('');
    expect(readStats()).toMatchObject({ total: 0, correct: 0, wrong: 0 });
  });

  it('切换难度会立刻更换题目并清空反馈', async () => {
    const { user, answer } = openPractice();

    await user.type(screen.getByLabelText('答案输入框'), answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(screen.getByText(/回答正确|回答错误/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /挑战/ }));

    expect(screen.queryByText(/回答正确|回答错误/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('答案输入框')).toHaveValue('');
  });

  it('会话统计随作答即时更新', async () => {
    const { user, answer } = openPractice();
    const answeredTile = screen.getByText('本轮已答').closest('div');

    expect(answeredTile).toHaveTextContent(/^本轮已答0$/);

    await user.type(screen.getByLabelText('答案输入框'), answer);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(answeredTile).toHaveTextContent(/^本轮已答1$/);
    expect(screen.getByText('本轮正确率').closest('div')).toHaveTextContent(/^本轮正确率100%$/);
  });
});
