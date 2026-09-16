import { createContext } from 'react';

/** localStorage 键名，集中在这里定义，避免各文件各写一份字符串。 */
export const STATS_STORAGE_KEY = 'bct:stats:v1';
export const MISTAKES_STORAGE_KEY = 'bct:mistakes:v1';
export const CONVERSIONS_STORAGE_KEY = 'bct:conversions:v1';
export const CONVERSION_TOTAL_STORAGE_KEY = 'bct:conversion-total:v1';

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

/**
 * 正确率（0-100 的整数）。
 *
 * 这是「正确率」这个词在整个项目里的唯一定义。此前它被原样抄了四遍 ——
 * 总览、图表、每日明细、练习会话各一份 —— 只要有一处调整了取整方式
 * 或分母为 0 时的返回值，同一个页面上的两个百分比就会互相矛盾。
 *
 * 分母为 0 表示「还没有可算的数据」，返回 0 而不是 NaN。
 */
export function accuracyOf(correct, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(correct) || correct <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * 把任意输入收敛成非负整数，非法值一律当 0。
 * 统计里的每个计数、以及单独存放的转换总次数都走这里，
 * 保证「读出来的一定是个能参与运算的数字」这一条只有一处实现。
 */
export function sanitizeCount(value) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * 校验并修复从 localStorage 读到的统计数据。
 * 返回的一定是当前版本期望的完整结构，上游不必再写防御性判断。
 * 例：只存了 {total, correct} 的旧数据会被补齐 history 等字段，
 * correct 大于 total 这种矛盾数据会被裁到 total。
 */
export function sanitizeStats(value) {
  if (!value || typeof value !== 'object') return createEmptyStats();

  const total = sanitizeCount(value.total);
  const correct = Math.min(sanitizeCount(value.correct), total);
  const streak = sanitizeCount(value.streak);

  const history = (Array.isArray(value.history) ? value.history : [])
    .filter((item) => item && typeof item.date === 'string')
    .map((item) => {
      const dayTotal = sanitizeCount(item.total);
      return {
        date: item.date,
        total: dayTotal,
        correct: Math.min(sanitizeCount(item.correct), dayTotal),
      };
    })
    .slice(-HISTORY_WINDOW_DAYS);

  return {
    total,
    correct,
    wrong: total - correct,
    streak,
    bestStreak: Math.max(sanitizeCount(value.bestStreak), streak),
    history,
  };
}

/** 错题记录的必要字段，缺一个就没法渲染出完整卡片，直接判为无效。 */
function isMistakeLike(item) {
  return (
    Boolean(item) &&
    typeof item.id === 'string' &&
    typeof item.source === 'string' &&
    Number.isFinite(item.fromBase) &&
    Number.isFinite(item.toBase) &&
    typeof item.answer === 'string'
  );
}

/** 过滤掉残缺的错题记录，并按上限截断。 */
export function sanitizeMistakes(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isMistakeLike).slice(0, MAX_MISTAKE_RECORDS);
}

/** 转换记录的必要字段。 */
function isConversionLike(item) {
  return (
    Boolean(item) &&
    typeof item.input === 'string' &&
    Number.isFinite(item.fromBase) &&
    Number.isFinite(item.toBase) &&
    typeof item.result === 'string'
  );
}

/** 过滤掉残缺的转换记录，并按上限截断。 */
export function sanitizeConversions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isConversionLike).slice(0, MAX_CONVERSION_RECORDS);
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
