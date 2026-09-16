import { Link } from 'react-router-dom';

import ConverterForm from '../components/ConverterForm.jsx';

/** 配套的学习路径建议。 */
const FEATURES = [
  {
    to: '/converter',
    title: '进制转换器',
    desc: '二进制 / 八进制 / 十二进制 / 十六进制任意互转，统一走「输入进制 → 十进制 → 目标进制」流水线。',
    tag: '工具',
  },
  {
    to: '/practice',
    title: '随机练习',
    desc: '随机抽取数值、源进制与目标进制，提交即时判题，附逐步解析与下一题。',
    tag: '训练',
  },
  {
    to: '/dashboard',
    title: '学习数据',
    desc: '累计练习次数、正确率、连续答对等指标，配合图表观察自己的进步趋势。',
    tag: '统计',
  },
  {
    to: '/mistakes',
    title: '错题本',
    desc: '自动收走答错的题目，随时回看原题、你的答案与正确答案，并一键重练。',
    tag: '复盘',
  },
];

const STEPS = [
  { title: '看一眼概念', desc: '在转换器里输入一个数，观察十进制中间值与目标进制结果的对应关系。' },
  { title: '动手练几题', desc: '进入练习页，从入门难度开始，连续答对会累计连击。' },
  { title: '回看错题', desc: '答错的题自动进入错题本，重练到能一眼反应出答案为止。' },
];

export default function Home() {
  return (
    <div className="container page home">
      <section className="home__hero">
        <p className="badge badge--primary">Base Converter Trainer · v1.0</p>
        <h1 className="home__title">
          把进制转换
          <span className="home__title-accent"> 练成肌肉记忆</span>
        </h1>
        <p className="home__lead">
          面向学生与程序员的进制转换与算法训练平台。转换工具、随机出题、学习数据、错题复盘整合在同一个
          PWA 里，装到桌面后断网也能继续练。
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
            <dd>2 / 8 / 12 / 16</dd>
          </div>
          <div>
            <dt>中间精度</dt>
            <dd>BigInt 无溢出</dd>
          </div>
          <div>
            <dt>数据存储</dt>
            <dd>本地 localStorage</dd>
          </div>
        </dl>
      </section>

      <section className="home__section">
        <div className="home__section-head">
          <h2 className="home__section-title">四个模块，一条学习闭环</h2>
          <p className="muted">从看懂 → 练熟 → 记录 → 复盘，缺一环都容易半途而废。</p>
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
              <h2 className="card__title">先试一手</h2>
              <p className="card__hint">不用跳页，直接在这里转一个数看看。</p>
            </div>
          </div>
          <ConverterForm initialFrom={2} initialTo={16} />
        </div>
      </section>

      <section className="home__section">
        <h2 className="home__section-title">三步上手</h2>
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
