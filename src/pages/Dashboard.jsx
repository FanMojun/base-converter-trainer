import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Statistics from '../components/Statistics.jsx';
import useStats from '../hooks/useStats';
import { baseName } from '../utils/converter';

export default function Dashboard() {
  const { stats, mistakes, accuracy, resetAll } = useStats();
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

  const recentMistakes = mistakes.slice(0, 3);

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
              <span className="muted">清空全部统计数据与错题？</span>
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
              disabled={stats.total === 0 && mistakes.length === 0}
            >
              重置学习数据
            </button>
          )}
        </div>
      </header>

      <Statistics stats={stats} accuracy={accuracy} />

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
              共 {mistakes.length} 条{mistakes.length > 0 ? '，仅显示最新 3 条' : ''}
            </p>
          </header>

          {recentMistakes.length === 0 ? (
            <p className="muted">暂无错题，保持住。</p>
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
