import { createContext } from 'react';

/** localStorage 键名，集中在这里定义，避免各文件各写一份字符串。 */
export const STATS_STORAGE_KEY = 'bct:stats:v1';
export const MISTAKES_STORAGE_KEY = 'bct:mistakes:v1';
export const CONVERSIONS_STORAGE_KEY = 'bct:conversions:v1';

/** 错题本最多保留的条数，防止 localStorage 无限膨胀。 */
export const MAX_MISTAKE_RECORDS = 100;

/** 转换历史只保留最近若干条，够用即可，不让它拖慢统计页。 */
export const MAX_CONVERSION_RECORDS = 50;

/** 学习趋势只保留最近 30 天。 */
export const HISTORY_WINDOW_DAYS = 30;

export const StatsContext = createContext(null);

/** 学习数据的初始结构。 */
export function createEmptyStats() {
  return {
    total: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
  };
}

/** 把日期格式化成 YYYY-MM-DD，用作趋势数据的横轴标签。 */
export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 在按天聚合的历史里累加一次作答记录。
 * 同一天多次作答会合并成一条，只保留最近 HISTORY_WINDOW_DAYS 天。
 */
export function upsertHistory(history, correct, date = new Date()) {
  const list = Array.isArray(history) ? history : [];
  const key = toDateKey(date);
  const index = list.findIndex((item) => item.date === key);

  const next =
    index === -1
      ? [...list, { date: key, total: 1, correct: correct ? 1 : 0 }]
      : list.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, total: item.total + 1, correct: item.correct + (correct ? 1 : 0) }
            : item,
        );

  return next.slice(-HISTORY_WINDOW_DAYS);
}

/** 正确率（0-100 的整数），没有作答记录时返回 0。 */
export function accuracyOf(stats) {
  const total = stats?.total ?? 0;
  if (total === 0) return 0;
  return Math.round(((stats.correct ?? 0) / total) * 100);
}

/** 生成一条转换记录的 id：时间戳 + 随机串，足够避免同一毫秒内碰撞。 */
function createConversionId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 构造一条转换记录。
 * 只保留「输入值 / 源进制 / 目标进制 / 结果 / 时间」这五项用户真正关心的信息，
 * 十进制中间值不落库 —— 它可以从输入值与源进制推出，存下来只是冗余。
 */
export function createConversionRecord({ input, fromBase, toBase, result }) {
  return {
    id: createConversionId(),
    input,
    fromBase,
    toBase,
    result,
    timestamp: Date.now(),
  };
}

/**
 * 判断两次转换是不是「同一件事」。
 * 用户连续点两下「转换」按钮不应该被记成两次转化，
 * 但把进制调换一下（16→2 变成 2→16）属于新的一次。
 */
export function isSameConversion(record, { input, fromBase, toBase }) {
  return (
    Boolean(record) &&
    record.input === input &&
    record.fromBase === fromBase &&
    record.toBase === toBase
  );
}
