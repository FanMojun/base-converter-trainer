import { useState } from 'react';

import BaseSelect from './BaseSelect.jsx';
import { ConversionError, DIGIT_SETS, convert, groupDigits, toSubscript } from '../utils/converter';

import './ConverterForm.css';

/** 每个进制准备一个合法示例，方便用户一键体验。 */
const SAMPLE_INPUTS = {
  2: '101101',
  8: '755',
  10: '2025',
  12: '1B2A',
  16: 'FF2A',
};

/**
 * 进制转换表单。
 * 转换由统一的 convert() 完成，这里只负责收集输入、展示结果与错误。
 */
export default function ConverterForm({ initialFrom = 2, initialTo = 16 }) {
  const [input, setInput] = useState('');
  const [fromBase, setFromBase] = useState(initialFrom);
  const [toBase, setToBase] = useState(initialTo);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  /** 任何输入变化都先清掉上一次的结果，避免展示过期数据。 */
  const resetFeedback = () => {
    setResult(null);
    setError('');
    setCopied(false);
  };

  const handleChangeInput = (value) => {
    setInput(value);
    resetFeedback();
  };

  const handleChangeFrom = (base) => {
    setFromBase(base);
    resetFeedback();
  };

  const handleChangeTo = (base) => {
    setToBase(base);
    resetFeedback();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      setResult(convert(input, fromBase, toBase));
      setError('');
      setCopied(false);
    } catch (err) {
      if (err instanceof ConversionError) {
        setError(err.message);
        setResult(null);
        return;
      }
      throw err;
    }
  };

  /** 交换输入进制与目标进制，若已有结果则顺带把它变成新的输入。 */
  const handleSwap = () => {
    setFromBase(toBase);
    setToBase(fromBase);

    if (result) {
      setInput(result.result);
    }

    resetFeedback();
  };

  const handleFillSample = () => {
    setInput(SAMPLE_INPUTS[fromBase] ?? '');
    resetFeedback();
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('浏览器拒绝了剪贴板访问，请手动复制结果。');
    }
  };

  return (
    <form className="converter" onSubmit={handleSubmit} noValidate>
      <div className="converter__bases">
        <BaseSelect
          id="converter-from"
          label="输入进制"
          value={fromBase}
          onChange={handleChangeFrom}
          hint={`合法字符：${DIGIT_SETS[fromBase]}`}
        />

        <button
          type="button"
          className="converter__swap"
          onClick={handleSwap}
          aria-label="交换输入进制与目标进制"
          title="交换进制"
        >
          ⇄
        </button>

        <BaseSelect
          id="converter-to"
          label="目标进制"
          value={toBase}
          onChange={handleChangeTo}
          hint={`输出字符：${DIGIT_SETS[toBase]}`}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="converter-input">
          输入数值
        </label>
        <input
          id="converter-input"
          className={`input input--mono${error ? ' input--invalid' : ''}`}
          value={input}
          onChange={(event) => handleChangeInput(event.target.value)}
          placeholder={SAMPLE_INPUTS[fromBase]}
          autoComplete="off"
          spellCheck="false"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'converter-error' : undefined}
        />
      </div>

      <div className="converter__actions">
        <button type="submit" className="btn btn--primary">
          转换
        </button>
        <button type="button" className="btn btn--ghost" onClick={handleFillSample}>
          填入示例
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => handleChangeInput('')}
          disabled={!input}
        >
          清空
        </button>
      </div>

      {error ? (
        <p className="converter__error" id="converter-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="converter__result">
          <div className="converter__result-head">
            <span className="converter__result-label">转换结果</span>
            <button type="button" className="btn btn--sm btn--soft" onClick={handleCopy}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          <output className="converter__output mono">
            {groupDigits(result.result, result.toBase === 2 ? 4 : 0)}
            <sub>{result.toBase}</sub>
          </output>

          <p className="converter__steps mono">
            {result.input}
            <sub>{result.fromBase}</sub>
            <span className="converter__arrow">→</span>
            {result.decimal}
            <sub>10</sub>
            <span className="converter__arrow">→</span>
            {result.result}
            <sub>{result.toBase}</sub>
          </p>

          <p className="muted">
            统一流水线：{fromBase} 进制先解析为十进制，再由十进制编码为目标进制 · 记号说明{' '}
            {toSubscript(2)} 表示二进制
          </p>
        </div>
      ) : null}
    </form>
  );
}
