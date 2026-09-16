import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * 测试环境补丁。
 * jsdom 只实现了 DOM 规范的一部分，这里补齐组件运行时会用到、
 * 但 jsdom 没有提供的浏览器 API，避免测试因为环境缺失而失败。
 */

// matchMedia：统计页的图表配色与主题监听会读取它
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// scrollTo：路由切换时的「回到顶部」会调用，jsdom 未实现
window.scrollTo = vi.fn();

// ResizeObserver：Recharts 的 ResponsiveContainer 用它监听容器尺寸，jsdom 未实现。
// 这里只需要一个能接住调用、不抛异常的空实现 —— 测试断言的是页面文本与交互，
// 不依赖图表实际绘制出的像素。
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

// clipboard：转换页的「复制结果」按钮依赖它
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
}

beforeEach(() => {
  // 上面是共享的 mock 对象，逐个用例重置，保证断言的是本次调用
  navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  // localStorage 是跨用例共享的全局状态，不清会让用例互相污染
  window.localStorage.clear();
});
