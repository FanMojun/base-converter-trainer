import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { convert, validateInput } from '../utils/converter';
import { renderApp } from './test-utils.jsx';

const BIG_SAMPLE = '1'.repeat(64);

/**
 * 按 caption 定位表格。
 * 这一页有好几张结构相似的 spec-table，靠行号猜是哪张很容易在改版后错位，
 * caption 是页面上唯一稳定的标识。
 */
function tableByCaption(fragment) {
  const caption = [...document.querySelectorAll('.spec-table__caption')].find((node) =>
    node.textContent.includes(fragment),
  );

  expect(caption, `没有找到 caption 含「${fragment}」的表格`).toBeTruthy();

  return caption.closest('table');
}

/** 取出表体的行（跳过表头行）。 */
function bodyRows(table) {
  return [...table.querySelectorAll('tbody tr')];
}

/**
 * 打开实现说明页。
 * 这条路由是懒加载的：首帧只渲染「页面加载中……」，chunk 解析完才有内容。
 * 所以这里必须等标题出现再断言 —— 这也正是真实用户经历的那一段等待。
 */
async function openAlgorithm() {
  const view = renderApp({ route: '/algorithm' });

  await screen.findByRole('heading', { level: 1, name: '实现说明' });

  return view;
}

describe('实现说明 · BigInt 精度对比', () => {
  it('两列数字分别来自 BigInt 与 Number，且确实不相等', async () => {
    await openAlgorithm();

    const table = tableByCaption('两种算法结果');
    const row = bodyRows(table).find((item) => item.textContent.includes('64 位全 1'));

    const [numberCell, bigintCell] = [...row.querySelectorAll('td')];
    const asNumber = Number(`0b${BIG_SAMPLE}`);

    expect(bigintCell.textContent).toBe(convert(BIG_SAMPLE, 2, 10).result);
    expect(numberCell.textContent).toBe(String(asNumber));
    expect(numberCell.textContent).not.toBe(bigintCell.textContent);
  });

  it('十六进制那一行暴露位数都变了，而不只是尾数差异', async () => {
    await openAlgorithm();

    const table = tableByCaption('两种算法结果');
    const row = bodyRows(table).find((item) => item.textContent.includes('十六进制'));
    const [numberCell, bigintCell] = [...row.querySelectorAll('td')];

    expect(bigintCell.textContent).toBe(convert(BIG_SAMPLE, 2, 16).result);
    expect(bigintCell.textContent).toHaveLength(16);
    expect(numberCell.textContent).toHaveLength(17);
  });
});

describe('实现说明 · 转换流水线', () => {
  it('逐位累加的最终值等于转换器内部的十进制中间值', async () => {
    await openAlgorithm();

    const rows = bodyRows(tableByCaption('逐位累加'));
    const lastCell = rows.at(-1).querySelectorAll('td')[3];

    expect(lastCell.textContent).toBe(convert('101101', 2, 16).decimal);
  });

  it('短除取余的余数倒序拼接，等于 convert() 的返回值', async () => {
    await openAlgorithm();

    const rows = bodyRows(tableByCaption('短除取余'));
    const characters = rows.map((row) => row.querySelectorAll('td')[3].textContent);

    expect(characters.reverse().join('')).toBe(convert('101101', 2, 16).result);
  });
});

describe('实现说明 · 边界情况', () => {
  it('被拒绝的输入展示的是校验层真实返回的错误码与提示原文', async () => {
    await openAlgorithm();

    const rows = bodyRows(tableByCaption('会被拒绝的输入'));
    const row = rows.find((item) => item.textContent.includes('2G'));
    const cells = [...row.querySelectorAll('td')];
    const verdict = validateInput('2G', 16);

    expect(verdict.ok).toBe(false);
    expect(cells[1].textContent).toBe(verdict.code);
    expect(cells[2].textContent).toBe(verdict.message);
  });

  it('五种被拒绝的情况逐个对得上 validateInput 的结论', async () => {
    await openAlgorithm();

    const rows = bodyRows(tableByCaption('会被拒绝的输入'));

    expect(rows).toHaveLength(5);
    rows.forEach((row) => {
      expect(row.querySelectorAll('td')[1].textContent).not.toBe('');
    });
  });

  it('空输入与纯空白输入显示成看得见的记号，而不是一片空白', async () => {
    await openAlgorithm();

    const rows = bodyRows(tableByCaption('会被拒绝的输入'));
    const empty = rows.find((row) => row.textContent.includes('空字符串'));
    const blank = rows.find((row) => row.textContent.includes('只有空白字符'));

    expect(empty.textContent).toContain('（空字符串）');
    expect(blank.textContent).toContain('（空白字符）');
  });

  it('超出安全整数范围的那一行给出的是 16 位精确结果', async () => {
    await openAlgorithm();

    const row = bodyRows(tableByCaption('会被接受的输入')).find((item) =>
      item.textContent.includes('超出安全整数范围'),
    );

    expect(row.textContent).toContain(convert(BIG_SAMPLE, 2, 16).result);
  });

  it('超长输入在单元格里被截断，并把总位数标出来', async () => {
    await openAlgorithm();

    const row = bodyRows(tableByCaption('会被接受的输入')).find((item) =>
      item.textContent.includes('超出安全整数范围'),
    );

    // 64 个 1 直接铺出来会把整行撑破，页面上只显示头尾
    expect(row.textContent).toContain('共 64 位');
    expect(row.textContent).not.toContain(BIG_SAMPLE);
  });
});

describe('实现说明 · 窄屏下摊开的表格', () => {
  it('每个单元格都带着与列头一致的标签', async () => {
    await openAlgorithm();

    // 640px 以下表头会被隐藏，列名改由单元格的 data-label 提供 ——
    // 漏一个就等于屏幕上有个数字没有名字，而 jsdom 量不到布局，只能守这份约定
    const stacked = [...document.querySelectorAll('table.spec-table--stack')];

    expect(stacked.length).toBeGreaterThan(0);

    stacked.forEach((table) => {
      const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());

      expect(headers.length).toBeGreaterThan(1);

      bodyRows(table).forEach((row) => {
        const cells = [...row.querySelectorAll('td')];

        // 首列是行标题，其余单元格按顺序对应剩下的列头
        expect(cells).toHaveLength(headers.length - 1);
        cells.forEach((cell, index) => {
          expect(cell.dataset.label).toBe(headers[index + 1]);
        });
      });
    });
  });
});

describe('实现说明 · 入口', () => {
  it('从导航栏可以进入这一页', async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole('link', { name: '实现说明' }));

    // 点击之后才去拉 chunk，所以要等标题渲染出来
    expect(
      await screen.findByRole('heading', { level: 1, name: '实现说明' }),
    ).toBeInTheDocument();
  });

  it('每张表都有 caption 作为无障碍名称', async () => {
    await openAlgorithm();

    expect(
      screen.getByRole('table', { name: '会被拒绝的输入' }),
    ).toBeInTheDocument();
  });
});
