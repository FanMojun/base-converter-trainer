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
  upsertHistory,
} from './StatsContext';

/**
 * 学习数据 Provider。
 * 练习页只负责判题、转换器只负责算结果，
 * 统计 / 错题 / 转换历史的写入统一收口到这里，
 * 这样任何页面触发的数据变更都会得到一致的数据结构。
 */
export default function StatsProvider({ children }) {
  const [stats, setStats, resetStats] = useStorage(STATS_STORAGE_KEY, createEmptyStats);
  const [mistakes, setMistakes, resetMistakes] = useStorage(MISTAKES_STORAGE_KEY, []);
  const [conversions, setConversions, resetConversions] = useStorage(
    CONVERSIONS_STORAGE_KEY,
    [],
  );

  /** 记录一次作答：更新计数、连击、按天趋势，答错时顺带写入错题本。 */
  const recordAttempt = useCallback(
    ({ correct, question, submitted }) => {
      setStats((previous) => {
        const base = previous ?? createEmptyStats();
        const total = (base.total ?? 0) + 1;
        const correctCount = (base.correct ?? 0) + (correct ? 1 : 0);
        const streak = correct ? (base.streak ?? 0) + 1 : 0;

        return {
          total,
          correct: correctCount,
          wrong: total - correctCount,
          streak,
          bestStreak: Math.max(base.bestStreak ?? 0, streak),
          history: upsertHistory(base.history, correct),
        };
      });

      if (!correct && question) {
        const record = createMistakeRecord(question, submitted);

        setMistakes((previous) => {
          const list = Array.isArray(previous) ? previous : [];
          return [record, ...list].slice(0, MAX_MISTAKE_RECORDS);
        });
      }
    },
    [setStats, setMistakes],
  );

  const removeMistake = useCallback(
    (id) => {
      setMistakes((previous) => (Array.isArray(previous) ? previous : []).filter((item) => item.id !== id));
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
        const list = Array.isArray(previous) ? previous : [];

        if (isSameConversion(list[0], payload)) {
          return [{ ...list[0], result: payload.result }, ...list.slice(1)];
        }

        return [createConversionRecord(payload), ...list].slice(0, MAX_CONVERSION_RECORDS);
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

  const value = useMemo(() => {
    const safeStats = stats ?? createEmptyStats();
    const safeConversions = Array.isArray(conversions) ? conversions : [];

    return {
      stats: safeStats,
      mistakes: Array.isArray(mistakes) ? mistakes : [],
      conversions: safeConversions,
      conversionTotal: safeConversions.length,
      accuracy: accuracyOf(safeStats),
      recordAttempt,
      recordConversion,
      removeMistake,
      clearMistakes,
      clearConversions,
      resetAll,
    };
  }, [
    stats,
    mistakes,
    conversions,
    recordAttempt,
    recordConversion,
    removeMistake,
    clearMistakes,
    clearConversions,
    resetAll,
  ]);

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}
