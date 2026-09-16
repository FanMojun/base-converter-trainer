import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readConverterOutput, renderApp } from './test-utils.jsx';

/**
 * 转换页交互测试。
 * 全部通过真实 DOM 操作：打字、切换下拉、点按钮，
 * 断言的是「用户看到的输出」，而不是内部状态。
 */
function openConverter() {
  return renderApp({ route: '/converter' });
}

describe('转换页 · 用户交互', () => {
  it('输入数值后点击转换，显示对应进制的结果', async () => {
    const { user, container } = openConverter();

    await user.type(screen.getByLabelText('输入数值'), '101010');
    await user.click(screen.getByRole('button', { name: '转换' }));

    // 101010₂ = 42₁₀ = 2A₁₆（默认输入二进制、目标十六进制）
    expect(readConverterOutput(container)).toBe('2A');
  });

  it('可以切换源进制与目标进制后再转换', async () => {
    const { user, container } = openConverter();

    await user.selectOptions(screen.getByLabelText('输入进制'), '8');
    await user.selectOptions(screen.getByLabelText('目标进制'), '2');
    await user.type(screen.getByLabelText('输入数值'), '755');
    await user.click(screen.getByRole('button', { name: '转换' }));

    // 755₈ = 493₁₀ = 111101101₂
    expect(readConverterOutput(container)).toBe('111101101');
  });

  it('支持十二进制（A 表示 10、B 表示 11）', async () => {
    const { user, container } = openConverter();

    await user.selectOptions(screen.getByLabelText('输入进制'), '12');
    await user.selectOptions(screen.getByLabelText('目标进制'), '10');
    await user.type(screen.getByLabelText('输入数值'), '1B2A');
    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(readConverterOutput(container)).toBe('3346');
  });

  it('小写输入与大写等价', async () => {
    const { user, container } = openConverter();

    await user.selectOptions(screen.getByLabelText('输入进制'), '16');
    await user.selectOptions(screen.getByLabelText('目标进制'), '2');
    await user.type(screen.getByLabelText('输入数值'), 'ff2a');
    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(readConverterOutput(container)).toBe('1111111100101010');
  });

  it('空格与下划线会被忽略后再转换', async () => {
    const { user, container } = openConverter();

    await user.type(screen.getByLabelText('输入数值'), '1010 10');
    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(readConverterOutput(container)).toBe('2A');
  });
});

describe('转换页 · 错误处理', () => {
  it('输入了不属于源进制的字符时给出明确提示', async () => {
    const { user } = openConverter();

    await user.type(screen.getByLabelText('输入数值'), '102');
    await user.click(screen.getByRole('button', { name: '转换' }));

    const alert = await screen.findByRole('alert');

    // 提示要指出具体是哪个字符不合法，而不是笼统的「输入无效」
    expect(alert).toHaveTextContent('2');
    expect(alert).toHaveTextContent('不是合法的 2 进制字符');
  });

  it('空输入时提示用户填写内容', async () => {
    const { user } = openConverter();

    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('请输入要转换的数值');
  });

  it('输入框在报错时标记为 aria-invalid', async () => {
    const { user } = openConverter();
    const input = screen.getByLabelText('输入数值');

    await user.type(input, '102');
    await user.click(screen.getByRole('button', { name: '转换' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('修改输入后，上一次的错误提示会消失', async () => {
    const { user } = openConverter();
    const input = screen.getByLabelText('输入数值');

    await user.type(input, '102');
    await user.click(screen.getByRole('button', { name: '转换' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '101');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('转换页 · 辅助操作', () => {
  it('交换按钮会互换两个进制，并把上次结果变成新的输入', async () => {
    const { user, container } = openConverter();
    const input = screen.getByLabelText('输入数值');

    await user.type(input, '101010');
    await user.click(screen.getByRole('button', { name: '转换' }));
    expect(readConverterOutput(container)).toBe('2A');

    await user.click(screen.getByRole('button', { name: '交换输入进制与目标进制' }));

    expect(screen.getByLabelText('输入进制')).toHaveValue('16');
    expect(screen.getByLabelText('目标进制')).toHaveValue('2');
    expect(input).toHaveValue('2A');

    // 换向之后继续转换，应该走回原来的数值
    await user.click(screen.getByRole('button', { name: '转换' }));
    expect(readConverterOutput(container)).toBe('101010');
  });

  it('填入示例会写入当前源进制的合法数值，并可成功转换', async () => {
    const { user, container } = openConverter();

    await user.selectOptions(screen.getByLabelText('输入进制'), '16');
    await user.selectOptions(screen.getByLabelText('目标进制'), '2');
    await user.click(screen.getByRole('button', { name: '填入示例' }));
    await user.click(screen.getByRole('button', { name: '转换' }));

    // 十六进制示例为 FF2A
    expect(readConverterOutput(container)).toBe('1111111100101010');
  });

  it('修改输入后旧的转换结果会被清掉，避免展示过期数据', async () => {
    const { user, container } = openConverter();
    const input = screen.getByLabelText('输入数值');

    await user.type(input, '101010');
    await user.click(screen.getByRole('button', { name: '转换' }));
    expect(container.querySelector('output')).toBeInTheDocument();

    await user.type(input, '1');

    expect(container.querySelector('output')).not.toBeInTheDocument();
  });

  it('复制结果会调用剪贴板并给出「已复制」反馈', async () => {
    const { user } = openConverter();

    await user.type(screen.getByLabelText('输入数值'), '101010');
    await user.click(screen.getByRole('button', { name: '转换' }));
    await user.click(screen.getByRole('button', { name: '复制' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('2A');
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument();
  });

  it('剪贴板被拒绝时把原因告诉用户，而不是静默失败', async () => {
    const { user } = openConverter();

    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));

    await user.type(screen.getByLabelText('输入数值'), '101010');
    await user.click(screen.getByRole('button', { name: '转换' }));
    await user.click(screen.getByRole('button', { name: '复制' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('手动复制');
  });
});
