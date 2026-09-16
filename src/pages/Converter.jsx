import ConverterForm from '../components/ConverterForm.jsx';

/** 常见进制对照表，转换时随手可查。 */
const REFERENCE = [
  { base: 2, chars: '0 1', note: '计算机底层表示，每 4 位对应 1 位十六进制' },
  { base: 8, chars: '0-7', note: '早期 Unix 权限位常用（如 755）' },
  { base: 10, chars: '0-9', note: '日常计数，也是本项目的计算中转进制' },
  { base: 12, chars: '0-9 A B', note: 'A 表示 10、B 表示 11，十二进制的进率为 12' },
  { base: 16, chars: '0-9 A-F', note: '内存地址、颜色值、哈希值最常见的表示' },
];

export default function Converter() {
  return (
    <div className="container page">
      <header className="page__header">
        <div>
          <h1 className="page__title">进制转换器</h1>
          <p className="page__subtitle">
            选择输入进制与目标进制，输入数值后点击转换。输入不区分大小写，空格和下划线会被自动忽略。
          </p>
        </div>
      </header>

      <div className="converter-page">
        <section className="card">
          <ConverterForm initialFrom={2} initialTo={16} />
        </section>

        <aside className="card converter-page__aside">
          <h2 className="card__title">进制速查</h2>
          <p className="card__hint">记不住合法字符时看这里。</p>
          <ul className="reference-list">
            {REFERENCE.map((item) => (
              <li key={item.base}>
                <span className="reference-list__base mono">{item.base}</span>
                <div>
                  <p className="reference-list__chars mono">{item.chars}</p>
                  <p className="reference-list__note">{item.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
