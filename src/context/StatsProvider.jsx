import { useCallback, useMemo } from 'react';

import useStorage from '../hooks/useStorage';
import { createMistakeRecord } from '../utils/generator';
import {
  CONVERSIONS_STORAGE_KEY,
  CONVERSION_TOTAL_STORAGE_KEY,
  MAX_CONVERSION_RECORDS,
  MAX_MISTAKE_RECORDS,
  MISTAKES_STORAGE_KEY,
  STATS_STORAGE_KEY,
  StatsContext,
  accuracyOf,
  createConversionRecord,
  createEmptyStats,
  isSameConversion,
  sanitizeConversions,
  sanitizeCount,
  sanitizeMistakes,
  sanitizeStats,
  upsertHistory,
} from './StatsContext';

/**
 * 学习数据 Provider。
 * 练习页只负责判题、转换器只负责算结果，
 * 统计 / 错题 / 转换历史的写入统一收口到这里，
 * 这样任何页面触发的数据变更都会得到一致的数据结构。
 *
 * 读取时经过 sanitize 校验，所以拿到的 state 一定是合法结构，
 * 下面的写操作不需要再写 `Array.isArray(previous) ? previous : []` 这类防御代码。
 */
export default function StatsProvider({ children }) {
  const [stats, setStats, resetStats] = useStorage(STATS_STORAGE_KEY, createEmptyStats, sanitizeStats);
  const [mistakes, setMistakes, resetMistakes] = useStorage(
    MISTAKES_STORAGE_KEY,
    [],
    sanitizeMistakes,
  );
  const [conversions, setConversions, resetConversions] = useStorage(
    CONVERSIONS_STORAGE_KEY,
    [],
    sanitizeConversions,
  );

  /*
   * 转换总次数单独存一个计数。
   *
   * 记录列表有 MAX_CONVERSION_RECORDS 条上限（否则 localStorage 会无限长大），
   * 所以 conversions.length 只是「还留着几条」，不是「一共转过几次」。
   * 统计页那个卡片写的是「总转换次数」，拿列表长度去填它，超过上限之后
   * 数字会一直停在 50 —— 那是个看起来正常的假数字，比报错更难发现。
   *
   * 初始值用已有记录条数兜底：老版本没有这个键，直接从 0 开始会让老用户
   * 的总数凭空归零；取列表长度只是个下界，但比 0 诚实。
   *
   * 这里刻意不用 useStorage 返回的 reset：它恢复的是上面那个兜底值，
   * 对一个计数来说是错的（「重置学习数据」之后应当归零，而不是回到兜底值）。
   * 清空动作一律显式写 0。
   */
  const [conversionTotal, setConversionTotal] = useStorage(
    CONVERSION_TOTAL_STORAGE_KEY,
    () => conversions.length,
    sanitizeCount,
  );

  /** 记录一次作答：更新计数、连击、按天趋势，答错时顺带写入错题本。 */
  const recordAttempt = useCallback(
    ({ correct, question, submitted }) => {
      setStats((previous) => {
        const total = previous.total + 1;
        const correctCount = previous.correct + (correct ? 1 : 0);
        const streak = correct ? previous.streak + 1 : 0;

        return {
          total,
          correct: correctCount,
          wrong: total - correctCount,
          streak,
          bestStreak: Math.max(previous.bestStreak, streak),
          history: upsertHistory(previous.history, correct),
        };
      });

      if (!correct && question) {
        const record = createMistakeRecord(question, submitted);
        setMistakes((previous) => [record, ...previous].slice(0, MAX_MISTAKE_RECORDS));
      }
    },
    [setStats, setMistakes],
  );

  const removeMistake = useCallback(
    (id) => {
      setMistakes((previous) => previous.filter((item) => item.id !== id));
    },
    [setMistakes],
  );

  const clearMistakes = useCallback(() => setMistakes([]), [setMistakes]);

  /**
   * 记录一次成功转换。
   * 同一组「输入值 + 源进制 + 目标进制」重复提交（例如连点两次转换按钮）
   * 只刷新最近一条，不增加次数。
   *
   * 「是不是重复」在这里判断一次，然后同时决定要不要动计数器。
   * 放进 setConversions 的更新函数里判断会让这两个动作分家：
   * 更新函数必须是纯的，React 严格模式下可能被调用两次，在那里加计数会重复累加。
   */
  const recordConversion = useCallback(
    (payload) => {
      const isRepeat = isSameConversion(conversions[0], payload);

      setConversions((previous) =>
        isRepeat
          ? [{ ...previous[0], result: payload.result }, ...previous.slice(1)]
          : [createConversionRecord(payload), ...previous].slice(0, MAX_CONVERSION_RECORDS),
      );

      if (!isRepeat) setConversionTotal((previous) => previous + 1);
    },
    [conversions, setConversions, setConversionTotal],
  );

  const clearConversions = useCallback(() => {
    setConversions([]);
    setConversionTotal(0);
  }, [setConversions, setConversionTotal]);

  /** 清空全部学习记录（统计 + 错题 + 转换历史），用于「重新开始」。 */
  const resetAll = useCallback(() => {
    resetStats();
    resetMistakes();
    resetConversions();
    setConversionTotal(0);
  }, [resetStats, resetMistakes, resetConversions, setConversionTotal]);

  const value = useMemo(
    () => ({
      stats,
      mistakes,
      conversions,
      conversionTotal,
      accuracy: accuracyOf(stats.correct, stats.total),
      recordAttempt,
      recordConversion,
      removeMistake,
      clearMistakes,
      clearConversions,
      resetAll,
    }),
    [
      stats,
      mistakes,
      conversions,
      conversionTotal,
      recordAttempt,
      recordConversion,
      removeMistake,
      clearMistakes,
      clearConversions,
      resetAll,
    ],
  );

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}
