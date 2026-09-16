import { DIGIT_SETS, convert, normalizeInput, validateInput } from '../utils/converter';

/* ---------------------------------------------------------------------------
   这一页上的每个数字都是现场算出来的。
   示例值一旦手写，某天改了算法它就会悄悄变成假话，而读者没有理由怀疑它；
   所以下面所有函数都直接调用 src/utils/converter.js 里的真实实现。
   --------------------------------------------------------------------------- */

/** 演示精度问题的输入：64 位全 1 的二进制串。 */
const BIG_SAMPLE = '1'.repeat(64);

/**
 * 同一串二进制，用 Number 和用 BigInt 分别走一遍。
 * BigInt 一列取自项目的 convert()，Number 一列直接交给 Number('0b…') 解析。
 */
function buildPrecisionDemo() {
  const asNumber = Number(`0b${BIG_SAMPLE}`);

  return {
    maxSafeInteger: String(Number.MAX_SAFE_INTEGER),
    exactDecimal: convert(BIG_SAMPLE, 2, 10).result,
    lossyDecimal: String(asNumber),
    exactHex: convert(BIG_SAMPLE, 2, 16).result,
    lossyHex: asNumber.toString(16).toUpperCase(),
  };
}

const PRECISION = buildPrecisionDemo();

const PRECISION_ROWS = [
  {
    label: '可精确表示的整数上限',
    number: PRECISION.maxSafeInteger,
    bigint: '没有上限',
  },
  {
    label: '64 位全 1 的十进制值',
    number: PRECISION.lossyDecimal,
    bigint: PRECISION.exactDecimal,
  },
  {
    label: '同一个数转成十六进制',
    number: PRECISION.lossyHex,
    bigint: PRECISION.exactHex,
  },
  {
    label: '十六进制结果的位数',
    number: `${PRECISION.lossyHex.length} 位`,
    bigint: `${PRECISION.exactHex.length} 位`,
  },
];

/** 走一遍流水线的样例。 */
const SAMPLE = { input: '101101', from: 2, to: 16 };

const PIPELINE = convert(SAMPLE.input, SAMPLE.from, SAMPLE.to);

/** 复现 parseToDecimal 的逐位累加，把中间的每一步摊开。 */
function traceAccumulate(rawInput, base) {
  const radix = BigInt(base);
  const charset = DIGIT_SETS[base];
  let accumulator = 0n;

  return [...normalizeInput(rawInput)].map((char, index) => {
    const digit = charset.indexOf(char);
    const previous = accumulator;

    accumulator = accumulator * radix + BigInt(digit);

    return {
      step: index + 1,
      char,
      expression: `${previous} × ${radix} + ${digit}`,
      accumulator: accumulator.toString(),
    };
  });
}

/** 复现 decimalToBase 的短除取余。余数要倒着读，才是最终结果。 */
function traceShortDivision(decimal, base) {
  const radix = BigInt(base);
  const charset = DIGIT_SETS[base];
  const rows = [];

  let value = BigInt(decimal);

  while (value > 0n) {
    const remainder = Number(value % radix);

    rows.push({
      value: value.toString(),
      quotient: (value / radix).toString(),
      remainder,
      char: charset[remainder],
    });

    value /= radix;
  }

  return rows;
}

const ACCUMULATE_STEPS = traceAccumulate(SAMPLE.input, SAMPLE.from);
const DIVISION_STEPS = traceShortDivision(PIPELINE.decimal, SAMPLE.to);

/**
 * 边界情况：直接问校验层要答案，页面上显示的提示原文与错误码
 * 都是 validateInput / convert 真实返回的东西。
 */
const EDGE_INPUTS = [
  { label: '空字符串', input: '', from: 16, to: 2 },
  { label: '只有空白字符', input: '   ', from: 16, to: 2 },
  { label: '该进制里不存在的字符', input: '2G', from: 16, to: 2 },
  { label: '负数', input: '-101', from: 2, to: 10 },
  { label: '不在支持列表里的进制', input: '101', from: 3, to: 10 },
];

const EDGE_ACCEPTS = [
  { label: '大小写混写', input: 'fF', from: 16, to: 2 },
  { label: '前导零', input: '0F', from: 16, to: 2 },
  { label: '零本身', input: '0', from: 10, to: 16 },
  { label: '空格分隔', input: '1010 1010', from: 2, to: 16 },
  { label: '下划线分隔', input: '1010_1010', from: 2, to: 16 },
  { label: '超出安全整数范围', input: BIG_SAMPLE, from: 2, to: 16 },
];

/** 把探针结果整理成表格行：拒绝的给错误码与提示原文，接受的给转换结果。 */
function buildEdgeRows(cases) {
  return cases.map((item) => {
    const verdict = validateInput(item.input, item.from);

    return {
      ...item,
      code: verdict.ok ? '' : verdict.code,
      detail: verdict.ok ? convert(item.input, item.from, item.to).result : verdict.message,
    };
  });
}

/**
 * 64 位二进制串直接铺在单元格里会把整行撑破，而短除法又要求完整对照，
 * 所以这里保留头尾、中间省略，并把总长度标出来 —— 省略的是哪些位必须说清楚。
 */
function shorten(text) {
  if (text.length <= 20) return text;

  return `${text.slice(0, 12)}…${text.slice(-4)}（共 ${text.length} 位）`;
}

const REJECTED_ROWS = buildEdgeRows(EDGE_INPUTS);
const ACCEPTED_ROWS = buildEdgeRows(EDGE_ACCEPTS);

/**
 * 输入为空或全是空白时，直接把原文放进单元格会显示成一个看不见的空格，
 * 读者会以为是渲染出错，所以换成能看见的记号。
 */
function displayInput(input) {
  if (input === '') return '（空字符串）';
  if (input.trim() === '') return '（空白字符）';

  return `“${shorten(input)}”`;
}

export default function Algorithm() {
  return (
    <div className="container page">
      <header className="page__header">
        <div>
          <h1 className="page__title">实现说明</h1>
          <p className="page__subtitle">
            这一页记录实现时的三处判断：中间值为什么用 BigInt、转换为什么要绕一次十进制、
            校验层覆盖了哪些边界。下面的数字都由项目里的转换函数现场算出，不是手写的示例。
          </p>
        </div>
      </header>

      <div className="algorithm-page">
        <section className="panel">
          <h2 className="panel__title">一、中间值为什么用 BigInt</h2>
          <p className="panel__hint">
            JavaScript 的 Number 是双精度浮点数，只有 53 位有效位，能精确表示的整数上限是
            2<sup>53</sup> − 1。超过之后，相邻的整数会落到同一个浮点值上——不是四舍五入，
            而是彻底分不出来。
          </p>

          <div className="table-wrap">
            <table className="spec-table spec-table--stack">
              <caption className="spec-table__caption">
                同一串输入（{BIG_SAMPLE.length} 位全为 1 的二进制）的两种算法结果
              </caption>
              <thead>
                <tr>
                  <th scope="col">对比项</th>
                  <th scope="col">用 Number</th>
                  <th scope="col">用 BigInt（本项目）</th>
                </tr>
              </thead>
              <tbody>
                {PRECISION_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className="mono spec-table__wrong" data-label="用 Number">
                      {row.number}
                    </td>
                    <td className="mono spec-table__result" data-label="用 BigInt（本项目）">
                      {row.bigint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="note note--danger">
            <span className="note__label">最后两行是关键。</span> 同一串二进制，用 Number
            算出来是 {PRECISION.lossyHex.length} 位十六进制、{PRECISION.lossyDecimal}；
            正确结果是 {PRECISION.exactHex.length} 位、{PRECISION.exactDecimal}。
            多出来的那位不是精度误差，是错的答案——而且整个过程不会抛任何异常。
          </p>

          <pre className="code">{`// src/utils/converter.js —— parseToDecimal
const radix = BigInt(base);
let decimal = 0n;                       // 注意 0n 而不是 0

for (const char of value) {
  decimal = decimal * radix + BigInt(charset.indexOf(char));
}`}</pre>

          <p className="panel__hint">
            <span className="code-inline">0n</span> 保证了整条运算链始终留在 BigInt 域内。
            只要中间任何一步退回 Number，后面的乘法就会立刻把精度交出去。
            代价也是真实的：BigInt 比 Number 慢，不能和 Number 直接混算，也不能被
            JSON.stringify 序列化。所以 <span className="code-inline">convert()</span> 返回的
            result 与 decimal 都是字符串——在出站前一刻就把 BigInt 转掉，避免调用方再踩一次精度。
          </p>
        </section>

        <section className="panel">
          <h2 className="panel__title">二、转换流水线：先归一到十进制，再散开到目标进制</h2>
          <p className="panel__hint">
            5 个进制两两互转共 20 种组合。如果给每种组合写一条专用逻辑，等价于维护 20 条互不
            相同的代码路径。这里统一拆成两步：
          </p>

          {/* 每行都控制在手机能整行显示的宽度内（实测最长 267px，内容盒只有 291px）：
              流程图被横向截断就等于没画，而中文在等宽字体下占两个字符宽。 */}
          <pre className="code">{`  输入串（${SAMPLE.from} 进制）
      │  parseToDecimal
      │  acc = acc × 进制 + 当前位
      ▼
  BigInt 十进制中间值
      │  decimalToBase
      │  反复短除取余，余数倒着读
      ▼
  输出串（${SAMPLE.to} 进制）`}</pre>

          <p className="panel__hint">
            中间绕一次十进制的代价是多扫一遍字符串，换来的是只要 2 个函数覆盖全部 20 种组合。
            以 <span className="code-inline">{SAMPLE.input}</span>（{SAMPLE.from} 进制）转{' '}
            {SAMPLE.to} 进制为例，第一步的逐位累加是这样的：
          </p>

          <div className="table-wrap">
            <table className="spec-table">
              <caption className="spec-table__caption">第一步 · 逐位累加</caption>
              <thead>
                <tr>
                  <th scope="col">第几位</th>
                  <th scope="col">字符</th>
                  <th scope="col">运算</th>
                  <th scope="col">累加值</th>
                </tr>
              </thead>
              <tbody>
                {ACCUMULATE_STEPS.map((step) => (
                  <tr key={step.step}>
                    <td className="muted">{step.step}</td>
                    <td className="mono">{step.char}</td>
                    <td className="mono muted">{step.expression}</td>
                    <td className="mono">{step.accumulator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="panel__hint">
            得到十进制中间值 <span className="code-inline">{PIPELINE.decimal}</span>。第二步对它
            反复短除，余数倒序读出来就是结果：
          </p>

          <div className="table-wrap">
            <table className="spec-table">
              <caption className="spec-table__caption">第二步 · 短除取余</caption>
              <thead>
                <tr>
                  <th scope="col">被除数</th>
                  <th scope="col">÷ {SAMPLE.to}</th>
                  <th scope="col">余数</th>
                  <th scope="col">对应字符</th>
                </tr>
              </thead>
              <tbody>
                {DIVISION_STEPS.map((row) => (
                  <tr key={row.value}>
                    <td className="mono">{row.value}</td>
                    <td className="mono muted">{row.quotient}</td>
                    <td className="mono">{row.remainder}</td>
                    <td className="mono">{row.char}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="note">
            <span className="note__label">余数从下往上读</span> 得到{' '}
            <span className="mono">{PIPELINE.result}</span>，与{' '}
            <span className="code-inline">convert()</span> 的返回值一致。
          </p>
        </section>

        <section className="panel">
          <h2 className="panel__title">三、边界情况</h2>
          <p className="panel__hint">
            校验分成两层：<span className="code-inline">validateInput()</span>{' '}
            只返回结果、不抛异常，供输入框做实时提示；
            <span className="code-inline">parseToDecimal()</span> 拿到同样的结论后直接抛出
            <span className="code-inline">ConversionError</span>，让调用方无法忽略。下面两组的
            提示原文与错误码都是这两个函数真实返回的。
          </p>

          <div className="table-wrap">
            <table className="spec-table spec-table--stack">
              <caption className="spec-table__caption">会被拒绝的输入</caption>
              <thead>
                <tr>
                  <th scope="col">情况</th>
                  <th scope="col">输入</th>
                  <th scope="col">错误码</th>
                  <th scope="col">提示原文</th>
                </tr>
              </thead>
              <tbody>
                {REJECTED_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className="mono" data-label="输入">
                      {displayInput(row.input)} → {row.from}
                    </td>
                    <td className="mono muted" data-label="错误码">
                      {row.code}
                    </td>
                    <td className="muted" data-label="提示原文">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-wrap">
            <table className="spec-table spec-table--stack">
              <caption className="spec-table__caption">会被接受的输入</caption>
              <thead>
                <tr>
                  <th scope="col">情况</th>
                  <th scope="col">输入</th>
                  <th scope="col">结果</th>
                </tr>
              </thead>
              <tbody>
                {ACCEPTED_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className="mono" data-label="输入">
                      {displayInput(row.input)} → {row.from} 转 {row.to}
                    </td>
                    <td className="mono spec-table__result" data-label="结果">
                      {shorten(row.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="panel__hint">
            另外 <span className="code-inline">decimalToBase()</span> 对 0 单独返回
            <span className="mono"> '0'</span>：短除法写的是 while (value {'>'} 0n)，
            0 一次都不进循环，不特判就会返回空串。
          </p>
        </section>
      </div>
    </div>
  );
}
