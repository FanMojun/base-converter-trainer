import { Link } from 'react-router-dom';

import ConverterForm from '../components/ConverterForm.jsx';

/** 各模块入口。描述只写这个模块做什么，不写它能带来什么好处。 */
const FEATURES = [
  {
    to: '/converter',
    title: '进制转换器',
    desc: '2 / 8 / 10 / 12 / 16 进制任意互转，统一走「输入进制 → 十进制 → 目标进制」流水线。',
    tag: '工具',
  },
  {
    to: '/practice',
    title: '随机练习',
    desc: '随机抽取数值、源进制与目标进制，提交后立即判题，并给出十进制中间值的解析。',
    tag: '训练',
  },
  {
    to: '/dashboard',
    title: '学习统计',
    desc: '练习次数、正确率、连续答对等指标，按天聚合后用柱状图与折线图展示。',
    tag: '统计',
  },
  {
    to: '/mistakes',
    title: '错题本',
    desc: '答错的题目自动收录，保留原题、你的答案与正确答案，可以直接带着原题重练。',
    tag: '复盘',
  },
];

const STEPS = [
  { title: '输入一个数', desc: '在转换器里输入数值，观察输入值、十进制中间值与目标进制结果的对应关系。' },
  { title: '做几道题', desc: '进入练习页，从入门难度开始；提交后立刻能看到对错与解析。' },
  { title: '回看错题', desc: '答错的题会带着你的原答案一起进入错题本，可以反复重练。' },
];

export default function Home() {
  return (
    <div className="container page home">
      <section className="home__hero">
        <h1 className="home__title">
          进制转换
          <span className="home__title-accent">练习工具</span>
        </h1>
        <p className="home__lead">
          输入一个数就能看到「源进制 → 十进制 → 目标进制」的完整过程，也可以随机出题反复练习。
          所有数据保存在浏览器本地，不涉及账号与后端。
        </p>

        <div className="home__actions">
          <Link className="btn btn--primary" to="/practice">
            开始练习
          </Link>
          <Link className="btn btn--ghost" to="/converter">
            打开转换器
          </Link>
        </div>

        <dl className="home__facts">
          <div>
            <dt>支持进制</dt>
            <dd>2 / 8 / 10 / 12 / 16</dd>
          </div>
          <div>
            <dt>中间值</dt>
            <dd>BigInt 精确计算</dd>
          </div>
          <div>
            <dt>数据存储</dt>
            <dd>浏览器 localStorage</dd>
          </div>
        </dl>
      </section>

      <section className="home__section">
        <div className="home__section-head">
          <h2 className="home__section-title">四个模块</h2>
          <p className="muted">转换、出题、统计、错题读写的是同一份本地数据，口径一致。</p>
        </div>

        <ul className="feature-grid">
          {FEATURES.map((feature) => (
            <li key={feature.to}>
              <Link className="feature-card" to={feature.to}>
                <span className="badge">{feature.tag}</span>
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__desc">{feature.desc}</p>
                <span className="feature-card__more">进入模块 →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home__section">
        <div className="card home__try">
          <div className="home__try-head">
            <div>
              <h2 className="card__title">直接试一下</h2>
              <p className="card__hint">不跳页，在这里完成一次转换。</p>
            </div>
          </div>
          <ConverterForm initialFrom={2} initialTo={16} />
        </div>
      </section>

      <section className="home__section">
        <h2 className="home__section-title">使用流程</h2>
        <ol className="step-list">
          {STEPS.map((step, index) => (
            <li key={step.title} className="step-item">
              <span className="step-item__index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="step-item__title">{step.title}</h3>
                <p className="step-item__desc">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
