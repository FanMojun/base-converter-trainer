import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { accuracyOf } from '../context/StatsContext';

import './Statistics.css';

/** 从 CSS 变量里读图表配色，让图表跟随明暗主题一起切换。 */
function readPalette() {
  if (typeof window === 'undefined') return {};

  const styles = getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

  return {
    grid: read('--color-border', '#e4e7f1'),
    axis: read('--color-text-muted', '#767d90'),
    primary: read('--color-primary', '#4f46e5'),
    accent: read('--color-accent', '#0ea5e9'),
    success: read('--color-success', '#15803d'),
    danger: read('--color-danger', '#dc2626'),
    surface: read('--color-surface', '#ffffff'),
    text: read('--color-text', '#151824'),
  };
}

function useChartPalette() {
  const [palette, setPalette] = useState(readPalette);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPalette(readPalette());

    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return palette;
}

/** 把 YYYY-MM-DD 缩成 MM-DD，横轴标签更紧凑。 */
function shortDate(dateKey) {
  return dateKey.slice(5);
}

/** 指标卡片。 */
function StatTile({ label, value, suffix = '', tone = 'default', hint }) {
  return (
    <div className={`stat-tile stat-tile--${tone}`}>
      <p className="stat-tile__label">{label}</p>
      <p className="stat-tile__value mono">
        {value}
        {suffix ? <span className="stat-tile__suffix">{suffix}</span> : null}
      </p>
      {hint ? <p className="stat-tile__hint">{hint}</p> : null}
    </div>
  );
}

const tooltipStyle = (palette) => ({
  background: palette.surface,
  border: `1px solid ${palette.grid}`,
  borderRadius: 12,
  fontSize: 13,
  color: palette.text,
});

/**
 * 学习数据展示：指标卡片 + 练习量柱状图 + 正确率折线图。
 * 数据全部来自 StatsProvider，本组件不直接读 localStorage。
 *
 * 注意「练习次数」与「转换次数」是两个独立口径：
 * 前者统计练习页提交的作答，后者统计转换器成功转换的次数，
 * 两者不合并，避免把「随手转一个数」也算成一次练习。
 */
export default function Statistics({ stats, accuracy, conversionTotal = 0 }) {
  const palette = useChartPalette();

  const chartData = useMemo(
    () =>
      (stats.history ?? []).map((item) => ({
        date: shortDate(item.date),
        fullDate: item.date,
        total: item.total,
        correct: item.correct,
        wrong: item.total - item.correct,
        accuracy: accuracyOf(item.correct, item.total),
      })),
    [stats.history],
  );

  const hasTrend = chartData.length > 0;

  return (
    <div className="statistics">
      <div className="stat-grid">
        <StatTile label="总转换次数" value={conversionTotal} hint="转换器成功转换的次数" />
        <StatTile label="总练习次数" value={stats.total} hint="练习页提交的作答次数" />
        <StatTile label="正确次数" value={stats.correct} tone="success" />
        <StatTile label="错误次数" value={stats.wrong} tone="danger" />
        <StatTile label="正确率" value={accuracy} suffix="%" tone="primary" />
        <StatTile label="当前连续答对" value={stats.streak} hint="答错即清零" />
        <StatTile label="历史最高连对" value={stats.bestStreak} />
      </div>

      {!hasTrend ? (
        <div className="card statistics__empty">
          <h2 className="card__title">还没有趋势数据</h2>
          <p className="card__hint">
            去练习页做几道题，这里就会按天记录你的练习量与正确率变化。
          </p>
        </div>
      ) : (
        <div className="statistics__charts">
          <section className="card chart-card">
            <header className="chart-card__head">
              <h2 className="card__title">每日练习量</h2>
              <p className="card__hint">按天统计答对与答错的题目数量</p>
            </header>
            <div className="chart-card__canvas">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={palette.axis} fontSize={12} tickLine={false} />
                  <YAxis stroke={palette.axis} fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle(palette)} cursor={{ fill: palette.grid }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="correct" name="答对" stackId="a" fill={palette.success} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="wrong" name="答错" stackId="a" fill={palette.danger} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card chart-card">
            <header className="chart-card__head">
              <h2 className="card__title">正确率变化</h2>
              <p className="card__hint">当天答对数 ÷ 当天作答数</p>
            </header>
            <div className="chart-card__canvas">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={palette.axis} fontSize={12} tickLine={false} />
                  <YAxis
                    stroke={palette.axis}
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle(palette)}
                    formatter={(value) => [`${value}%`, '正确率']}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="正确率"
                    stroke={palette.primary}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: palette.primary }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
