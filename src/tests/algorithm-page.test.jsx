import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

/**
 * 读样式表原文。
 * 这里不用 import.meta.url：测试跑在 jsdom 环境里，那个 URL 不是 file: 协议，
 * readFile 会直接拒收。测试的工作目录就是项目根目录。
 */
function readStylesheet() {
  return readFile(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
}

/**
 * 按大括号配对取出某条 640px 断点里的规则，避免用正则去啃嵌套结构。
 * 同一断点在样式表里不止一处，所以按「里面有没有摊开表格」来挑。
 */
function mobileBlock(css, marker) {
  for (const match of css.matchAll(/@media \(max-width: 640px\)/g)) {
    let depth = 0;

    for (let index = css.indexOf('{', match.index); index < css.length; index += 1) {
      if (css[index] === '{') depth += 1;
      else if (css[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          const block = css.slice(match.index, index + 1);
          if (block.includes(marker)) return block;
          break;
        }
      }
    }
  }

  return null;
}

describe('实现说明 · 窄屏样式的约定', () => {
  /**
   * jsdom 不算布局，caption 被压成一个字一行的坏法在单元测试里量不到，
   * 只能把约定写在源头：摊开表格那条规则必须连 caption 一起改成块级。
   * 漏掉它时 caption 仍是 table-caption 盒子，脱离表格之后宽度会收紧到最小内容
   * 宽度（实测 27px 宽、261px 高），而且不报错、也不撑破页面，只有真机上看得见。
   */
  it('摊开表格的规则里，caption 与表格本体一起变成块级', async () => {
    const css = await readStylesheet();
    const block = mobileBlock(css, '.spec-table--stack');

    expect(block, '没有找到 640px 以下处理摊开表格的样式块').toBeTruthy();

    const blockLevelSelectors = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , body]) => body.includes('display: block'))
      .flatMap(([, selectors]) => selectors.split(','))
      .map((selector) => selector.trim());

    expect(blockLevelSelectors).toContain('.spec-table--stack caption');
  });

  /** 同理：代码块在手机上要折行，横向滚动没有任何可见提示，等于把后半行藏起来。 */
  it('代码块在窄屏下改为折行，而不是横向滚动', async () => {
    const css = await readStylesheet();
    const block = mobileBlock(css, '.code');

    expect(block, '没有找到 640px 以下处理代码块的样式块').toBeTruthy();
    expect(block).toContain('white-space: pre-wrap');
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
