import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import useStats from '../hooks/useStats';
import { baseName, groupDigits } from '../utils/converter';
import { questionFromMistake } from '../utils/generator';

/** 错题时间格式化，统一走这一个函数，避免各调用点写法不一致。 */
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Mistakes() {
  const { mistakes, removeMistake, clearMistakes } = useStats();
  const navigate = useNavigate();
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleRetry = (record) => {
    navigate('/practice', { state: { question: questionFromMistake(record) } });
  };

  const handleClear = () => {
    clearMistakes();
    setIsConfirmingClear(false);
  };

  return (
    <div className="container page">
      <header className="page__header">
        <div>
          <h1 className="page__title">错题本</h1>
          <p className="page__subtitle">
            练习中答错的题目会自动收进这里，保留原题、你的答案与正确答案，可以随时重练。
          </p>
        </div>

        {mistakes.length > 0 ? (
          <div className="page__header-actions">
            {isConfirmingClear ? (
              <>
                <span className="muted">确认清空全部 {mistakes.length} 条？</span>
                <button type="button" className="btn btn--sm btn--danger" onClick={handleClear}>
                  确认清空
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setIsConfirmingClear(false)}
                >
                  取消
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setIsConfirmingClear(true)}
              >
                清空错题本
              </button>
            )}
          </div>
        ) : null}
      </header>

      {mistakes.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-state__icon mono" aria-hidden="true">
            0x00
          </p>
          <h2 className="empty-state__title">错题本还是空的</h2>
          <p className="empty-state__desc">
            这通常意味着你还没开始练，或者暂时一题没错。去练习页做几道题，答错的内容会自动出现在这里。
          </p>
          <Link className="btn btn--primary" to="/practice">
            去练习
          </Link>
        </div>
      ) : (
        <ul className="mistake-list">
          {mistakes.map((record) => (
            <li key={record.id} className="card mistake-item">
              <div className="mistake-item__head">
                <div className="mistake-item__question">
                  <span className="mono mistake-item__source">
                    {groupDigits(record.source, record.fromBase === 2 ? 4 : 0)}
                    <sub>{record.fromBase}</sub>
                  </span>
                  <span className="muted">
                    {baseName(record.fromBase)} → {baseName(record.toBase)}
                  </span>
                </div>
                <time className="muted" dateTime={new Date(record.createdAt).toISOString()}>
                  {formatTime(record.createdAt)}
                </time>
              </div>

              <dl className="mistake-item__answers">
                <div>
                  <dt>你的答案</dt>
                  <dd className="mistake-item__wrong mono">{record.submitted}</dd>
                </div>
                <div>
                  <dt>正确答案</dt>
                  <dd className="mistake-item__right mono">
                    {record.answer}
                    <sub>{record.toBase}</sub>
                  </dd>
                </div>
                <div>
                  <dt>十进制值</dt>
                  <dd className="mono">{record.decimal}</dd>
                </div>
              </dl>

              <div className="mistake-item__actions">
                <button type="button" className="btn btn--sm btn--primary" onClick={() => handleRetry(record)}>
                  重新练习
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => removeMistake(record.id)}
                >
                  移除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
