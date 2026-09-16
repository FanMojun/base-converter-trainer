import { useCallback, useMemo } from 'react';

import useStorage from '../hooks/useStorage';
import { createMistakeRecord } from '../utils/generator';
import {
  CONVERSIONS_STORAGE_KEY,
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
   */
  const recordConversion = useCallback(
    (payload) => {
      setConversions((previous) => {
        if (isSameConversion(previous[0], payload)) {
          return [{ ...previous[0], result: payload.result }, ...previous.slice(1)];
        }

        return [createConversionRecord(payload), ...previous].slice(0, MAX_CONVERSION_RECORDS);
      });
    },
    [setConversions],
  );

  const clearConversions = useCallback(() => setConversions([]), [setConversions]);

  /** 清空全部学习记录（统计 + 错题 + 转换历史），用于「重新开始」。 */
  const resetAll = useCallback(() => {
    resetStats();
    resetMistakes();
    resetConversions();
  }, [resetStats, resetMistakes, resetConversions]);

  const value = useMemo(
    () => ({
      stats,
      mistakes,
      conversions,
      conversionTotal: conversions.length,
      accuracy: accuracyOf(stats),
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
