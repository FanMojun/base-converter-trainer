import ConverterForm from '../components/ConverterForm.jsx';
import { ConversionError, convert } from '../utils/converter';

/** 进制速查表。 */
const REFERENCE = [
  { base: 2, chars: '0 1', note: '计算机底层表示，每 4 位对应 1 位十六进制' },
  { base: 8, chars: '0-7', note: '早期 Unix 权限位常用（如 755）' },
  { base: 10, chars: '0-9', note: '日常计数，也是本项目的计算中转进制' },
  { base: 12, chars: '0-9 A B', note: 'A 表示 10、B 表示 11，十二进制的进率为 12' },
  { base: 16, chars: '0-9 A-F', note: '内存地址、颜色值、哈希值最常见的表示' },
];

/**
 * 输入输出示例。
 * 结果一律由下面这个函数现场调用 convert() 算出来，不手写死值 ——
 * 手写的示例值很容易在某次改算法之后悄悄过期，而读者没有理由怀疑它。
 */
const EXAMPLES = [
  { input: '101101', from: 2, to: 16, note: '二进制转十六进制' },
  { input: '755', from: 8, to: 10, note: '八进制转十进制' },
  { input: '2025', from: 10, to: 12, note: '十二进制用 A、B 表示 10 与 11' },
  { input: 'FF', from: 16, to: 2, note: '1 位十六进制对应 4 位二进制' },
  { input: '1 0101_1010', from: 2, to: 16, note: '空格与下划线会被忽略' },
  { input: '0F', from: 16, to: 2, note: '前导零不影响数值' },
];

/** 故意写错的输入，用来展示校验层真实抛出的报错原文。 */
const INVALID_EXAMPLE = { input: '2G', from: 16, to: 2 };

function buildExampleTable() {
  const rows = EXAMPLES.map((example) => {
    const { input, result } = convert(example.input, example.from, example.to);

    return { ...example, normalized: input, result };
  });

  let invalidMessage = '';

  try {
    convert(INVALID_EXAMPLE.input, INVALID_EXAMPLE.from, INVALID_EXAMPLE.to);
  } catch (error) {
    if (!(error instanceof ConversionError)) throw error;
    invalidMessage = error.message;
  }

  return { rows, invalidMessage };
}

const { rows: EXAMPLE_ROWS, invalidMessage: INVALID_MESSAGE } = buildExampleTable();

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

        <aside className="panel converter-page__aside">
          <h2 className="panel__title">进制速查</h2>
          <p className="panel__hint">记不住合法字符时看这里。</p>
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

      <section className="panel converter-page__examples">
        <h2 className="panel__title">输入输出示例</h2>
        <p className="panel__hint">
          下面每一行的结果都由转换器正在使用的同一个 convert() 函数现场算出，不是手写的示例值。
        </p>

        <div className="table-wrap">
          <table className="spec-table">
            <thead>
              <tr>
                <th scope="col">输入</th>
                <th scope="col">进制</th>
                <th scope="col">结果</th>
                <th scope="col">说明</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_ROWS.map((row) => (
                <tr key={row.input}>
                  <td className="mono">{row.input}</td>
                  <td className="mono">
                    {row.from} → {row.to}
                  </td>
                  <td className="mono spec-table__result">{row.result}</td>
                  <td className="muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {INVALID_MESSAGE ? (
          <p className="note note--danger">
            <span className="note__label">
              非法输入 {INVALID_EXAMPLE.input}（{INVALID_EXAMPLE.from} 进制）会直接报错：
            </span>{' '}
            {INVALID_MESSAGE}
          </p>
        ) : null}
      </section>
    </div>
  );
}
