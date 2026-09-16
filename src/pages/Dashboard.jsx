import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Statistics from '../components/Statistics.jsx';
import useStats from '../hooks/useStats';
import { baseName } from '../utils/converter';
import { formatTime } from '../utils/format';

/** 最近转换记录只展示最新若干条，完整历史没有查看价值，还占地方。 */
const RECENT_CONVERSION_LIMIT = 5;

/** 统计页的错题摘要只展示最新若干条。 */
const RECENT_MISTAKE_LIMIT = 3;

export default function Dashboard() {
  const { stats, mistakes, conversions, conversionTotal, accuracy, resetAll } = useStats();
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  /** 每日明细按时间倒序，最近的在最上面。 */
  const dailyRows = useMemo(() => {
    const history = stats.history ?? [];

    return [...history]
      .reverse()
      .map((item) => ({
        ...item,
        accuracy: item.total === 0 ? 0 : Math.round((item.correct / item.total) * 100),
      }));
  }, [stats.history]);

  const recentMistakes = mistakes.slice(0, RECENT_MISTAKE_LIMIT);
  const recentConversions = conversions.slice(0, RECENT_CONVERSION_LIMIT);

  return (
    <div className="container page">
      <header className="page__header">
        <div>
          <h1 className="page__title">学习统计</h1>
          <p className="page__subtitle">
            所有数据保存在浏览器本地（localStorage），刷新或重开页面都不会丢失，也不会上传到任何服务器。
          </p>
        </div>

        <div className="page__header-actions">
          {isConfirmingReset ? (
            <>
              <span className="muted">清空统计、错题与转换记录？</span>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => {
                  resetAll();
                  setIsConfirmingReset(false);
                }}
              >
                确认清空
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setIsConfirmingReset(false)}
              >
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setIsConfirmingReset(true)}
              /*
               * 判据必须覆盖 resetAll 真正会清掉的每一份数据。
               * 只判断练习与错题的话，一个「只用转换器、没做过题」的用户
               * 会看到一个点不动的按钮，而他的转换记录确实还在。
               */
              disabled={stats.total === 0 && mistakes.length === 0 && conversionTotal === 0}
            >
              重置学习数据
            </button>
          )}
        </div>
      </header>

      <Statistics stats={stats} accuracy={accuracy} conversionTotal={conversionTotal} />

      <section className="card dashboard-conversions">
        <header className="chart-card__head">
          <h2 className="card__title">最近转换记录</h2>
          <p className="card__hint">
            共 {conversionTotal} 次
            {/*
             * 「仅显示最新 N 条」这句话只对「确实被截断了」的情况成立。
             * 判据要看列表本身有多少条，不能用总次数 ——
             * 累计 60 次但记录被清空过时，总数是 60、列表是空的，
             * 那时候写「仅显示最新 5 条」就是在描述不存在的东西。
             */}
            {conversions.length > RECENT_CONVERSION_LIMIT
              ? `，仅显示最新 ${RECENT_CONVERSION_LIMIT} 条`
              : ''}
          </p>
        </header>

        {recentConversions.length === 0 ? (
          <p className="muted">还没有转换记录，去转换页转一个数试试。</p>
        ) : (
          <ul className="conversion-list">
            {recentConversions.map((record) => (
              <li key={record.id}>
                <span className="mono conversion-list__value">
                  {record.input}
                  <sub>{record.fromBase}</sub>
                </span>
                <span className="conversion-list__arrow" aria-hidden="true">
                  →
                </span>
                <span className="mono conversion-list__value conversion-list__value--result">
                  {record.result}
                  <sub>{record.toBase}</sub>
                </span>
                <span className="muted conversion-list__bases">
                  {baseName(record.fromBase)} → {baseName(record.toBase)}
                </span>
                <time className="muted" dateTime={new Date(record.timestamp).toISOString()}>
                  {formatTime(record.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="dashboard-extra">
        <section className="card dashboard-table">
          <header className="chart-card__head">
            <h2 className="card__title">每日明细</h2>
            <p className="card__hint">最多保留最近 30 天</p>
          </header>

          {dailyRows.length === 0 ? (
            <p className="muted">暂无记录，先去练习页做几道题。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">日期</th>
                    <th scope="col">练习</th>
                    <th scope="col">答对</th>
                    <th scope="col">答错</th>
                    <th scope="col">正确率</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((row) => (
                    <tr key={row.date}>
                      <td className="mono">{row.date}</td>
                      <td className="mono">{row.total}</td>
                      <td className="mono">{row.correct}</td>
                      <td className="mono">{row.total - row.correct}</td>
                      <td className="mono">{row.accuracy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card dashboard-mistakes">
          <header className="chart-card__head">
            <h2 className="card__title">最近错题</h2>
            <p className="card__hint">
              共 {mistakes.length} 条
              {mistakes.length > RECENT_MISTAKE_LIMIT
                ? `，仅显示最新 ${RECENT_MISTAKE_LIMIT} 条`
                : ''}
            </p>
          </header>

          {recentMistakes.length === 0 ? (
            <p className="muted">还没有错题记录。</p>
          ) : (
            <ul className="recent-mistakes">
              {recentMistakes.map((record) => (
                <li key={record.id}>
                  <span className="mono recent-mistakes__value">{record.source}</span>
                  <span className="muted">
                    {baseName(record.fromBase)} → {baseName(record.toBase)}
                  </span>
                  <span className="mono recent-mistakes__answer">{record.answer}</span>
                </li>
              ))}
            </ul>
          )}

          <Link className="btn btn--soft" to="/mistakes">
            打开错题本
          </Link>
        </section>
      </div>
    </div>
  );
}
