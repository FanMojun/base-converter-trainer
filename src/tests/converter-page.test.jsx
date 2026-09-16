import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { convert } from '../utils/converter';
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

describe('转换页 · 输入输出示例表', () => {
  /** 从示例表里按输入值取整行文本 */
  function exampleRow(input) {
    const cell = screen.getByText(input);

    return cell.closest('tr');
  }

  it('每一行的结果都等于 convert() 现算的值，改了算法也不会有过期示例', () => {
    openConverter();

    const samples = [
      { input: '101101', from: 2, to: 16 },
      { input: '755', from: 8, to: 10 },
      { input: '2025', from: 10, to: 12 },
      { input: 'FF', from: 16, to: 2 },
      { input: '1 0101_1010', from: 2, to: 16 },
      { input: '0F', from: 16, to: 2 },
    ];

    for (const sample of samples) {
      const { result } = convert(sample.input, sample.from, sample.to);

      expect(exampleRow(sample.input)).toHaveTextContent(result);
    }
  });

  it('示例表里给出的答案与手算结果一致', () => {
    openConverter();

    expect(exampleRow('101101')).toHaveTextContent('2D');
    expect(exampleRow('755')).toHaveTextContent('493');
    expect(exampleRow('2025')).toHaveTextContent('1209');
    expect(exampleRow('FF')).toHaveTextContent('11111111');
    expect(exampleRow('0F')).toHaveTextContent('1111');
  });

  it('展示非法输入时，用的是校验层真实抛出的报错原文', () => {
    openConverter();

    let message = '';

    try {
      convert('2G', 16, 2);
    } catch (error) {
      message = error.message;
    }

    // 16 进制不认识 G，这条消息来自 validateInput
    expect(message).toContain('不是合法的 16 进制字符');

    // 页面上显示的就是这条消息本身，没有另写一份
    const label = screen.getByText(/非法输入 2G/);

    expect(label.parentElement).toHaveTextContent(message);
  });
});
