import { useEffect, useRef, useState } from 'react';

import { DIGIT_SETS, baseName, explainConversion, groupDigits } from '../utils/converter';

import './PracticeCard.css';

/**
 * 练习卡片：负责展示题目、收集答案、渲染判题反馈。
 * 判题逻辑不在这里，由页面调用 checkAnswer 后把 feedback 传进来，
 * 保证这个组件只关心「怎么显示」。
 */
export default function PracticeCard({ question, feedback, isRetry = false, onSubmit, onNext, onSkip }) {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef(null);

  const answered = Boolean(feedback);
  const questionId = question?.id ?? null;

  // 换题时清空输入，并把焦点交回输入框，方便连续练习
  useEffect(() => {
    setAnswer('');

    if (questionId) {
      inputRef.current?.focus();
    }
  }, [questionId]);

  if (!question) {
    return (
      <div className="card practice-card">
        <p className="muted">题目加载中……</p>
      </div>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    // 已作答时回车等同于「下一题」，连续练习不用来回点按钮
    if (answered) {
      onNext();
      return;
    }

    onSubmit(answer);
  };

  return (
    <section className="card practice-card">
      <div className="practice-card__meta">
        <span className="badge badge--primary">
          {baseName(question.fromBase)} · {question.fromBase}
        </span>
        <span className="practice-card__arrow" aria-hidden="true">
          →
        </span>
        <span className="badge">
          {baseName(question.toBase)} · {question.toBase}
        </span>
        {isRetry ? <span className="badge badge--danger">错题重练</span> : null}
      </div>

      <p className="practice-card__prompt">
        请将下面的数值从{baseName(question.fromBase)}转换为
        <strong>{baseName(question.toBase)}</strong>
      </p>

      <p className="practice-card__source mono">
        {groupDigits(question.source, question.fromBase === 2 ? 4 : 0)}
        <sub>{question.fromBase}</sub>
      </p>

      <form className="practice-card__form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="practice-answer">
          答案输入框
        </label>
        <input
          id="practice-answer"
          ref={inputRef}
          className={`input input--mono${
            feedback && !feedback.correct ? ' input--invalid' : ''
          }`}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={answered}
          placeholder={`填写 ${question.toBase} 进制结果`}
          autoComplete="off"
          spellCheck="false"
        />
        <button type="submit" className="btn btn--primary">
          {answered ? '下一题' : '提交答案'}
        </button>
      </form>

      {feedback ? (
        <div
          className={`practice-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`}
          role="status"
        >
          <p className="practice-feedback__verdict">
            {feedback.correct ? '✓ 回答正确' : '✕ 回答错误'}
          </p>

          {!feedback.correct ? (
            <p className="practice-feedback__line">
              你的答案：
              <span className="mono">{feedback.submitted || '（空）'}</span>
              {feedback.message ? ` · ${feedback.message}` : null}
            </p>
          ) : null}

          <p className="practice-feedback__line">
            正确答案：<span className="mono">{feedback.expected}</span>
            <sub>{question.toBase}</sub>
          </p>

          <p className="practice-feedback__explain mono">
            解析：{explainConversion(question.source, question.fromBase, question.toBase)}
          </p>

          <p className="practice-feedback__tip">
            {feedback.correct
              ? '保持节奏，回车直接进入下一题。'
              : `可用字符：${DIGIT_SETS[question.toBase]}，注意每位权重是 ${question.toBase} 的幂。`}
          </p>
        </div>
      ) : null}

      <div className="practice-card__footer">
        <span className="muted">目标进制合法字符：{DIGIT_SETS[question.toBase]}</span>
        {!answered ? (
          <button type="button" className="btn btn--sm btn--ghost" onClick={onSkip}>
            跳过本题
          </button>
        ) : null}
      </div>
    </section>
  );
}
