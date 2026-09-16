import { useCallback, useMemo } from 'react';

import useStorage from '../hooks/useStorage';
import { createMistakeRecord } from '../utils/generator';
import {
  MAX_MISTAKE_RECORDS,
  MISTAKES_STORAGE_KEY,
  STATS_STORAGE_KEY,
  StatsContext,
  accuracyOf,
  createEmptyStats,
  upsertHistory,
} from './StatsContext';

/**
 * 学习数据 Provider。
 * 练习页只负责判题，统计与错题的写入统一收口到这里，
 * 这样任何页面触发作答都能得到一致的数据结构。
 */
export default function StatsProvider({ children }) {
  const [stats, setStats, resetStats] = useStorage(STATS_STORAGE_KEY, createEmptyStats);
  const [mistakes, setMistakes, resetMistakes] = useStorage(MISTAKES_STORAGE_KEY, []);

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

  /** 清空全部学习记录（统计 + 错题），用于「重新开始」。 */
  const resetAll = useCallback(() => {
    resetStats();
    resetMistakes();
  }, [resetStats, resetMistakes]);

  const value = useMemo(() => {
    const safeStats = stats ?? createEmptyStats();

    return {
      stats: safeStats,
      mistakes: Array.isArray(mistakes) ? mistakes : [],
      accuracy: accuracyOf(safeStats),
      recordAttempt,
      removeMistake,
      clearMistakes,
      resetAll,
    };
  }, [stats, mistakes, recordAttempt, removeMistake, clearMistakes, resetAll]);

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}
