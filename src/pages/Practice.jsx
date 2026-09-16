import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import PracticeCard from '../components/PracticeCard.jsx';
import useStats from '../hooks/useStats';
import { DEFAULT_DIFFICULTY, DIFFICULTY_LEVELS, checkAnswer, generateQuestion } from '../utils/generator';

export default function Practice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, recordAttempt } = useStats();

  // 从错题本跳进来时会带一道题，直接接着练
  const seedQuestion = location.state?.question ?? null;

  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [question, setQuestion] = useState(
    () => seedQuestion ?? generateQuestion({ difficulty: DEFAULT_DIFFICULTY }),
  );
  const [isRetry, setIsRetry] = useState(Boolean(seedQuestion));
  const [feedback, setFeedback] = useState(null);
  const [session, setSession] = useState({ answered: 0, correct: 0 });

  // 一次性 state 用完即清，刷新页面不会重复出现同一道错题
  useEffect(() => {
    if (location.state?.question) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  const handleSubmit = useCallback(
    (answer) => {
      if (!question || feedback) return;

      const result = checkAnswer(question, answer);

      setFeedback(result);
      setSession((previous) => ({
        answered: previous.answered + 1,
        correct: previous.correct + (result.correct ? 1 : 0),
      }));
      recordAttempt({ correct: result.correct, question, submitted: answer });
    },
    [question, feedback, recordAttempt],
  );

  const handleNext = useCallback(() => {
    setQuestion(generateQuestion({ difficulty }));
    setFeedback(null);
    setIsRetry(false);
  }, [difficulty]);

  const handleSkip = useCallback(() => {
    setQuestion(generateQuestion({ difficulty }));
    setFeedback(null);
    setIsRetry(false);
  }, [difficulty]);

  const handleDifficultyChange = (id) => {
    setDifficulty(id);
    setQuestion(generateQuestion({ difficulty: id }));
    setFeedback(null);
    setIsRetry(false);
  };

  const sessionAccuracy = session.answered === 0 ? 0 : Math.round((session.correct / session.answered) * 100);

  return (
    <div className="container page">
      <header className="page__header">
        <div>
          <h1 className="page__title">随机练习</h1>
          <p className="page__subtitle">
            系统随机抽取数值、源进制与目标进制。作答后立刻判题，并给出十进制中间值的解析过程。
          </p>
        </div>
        <Link className="btn btn--ghost" to="/mistakes">
          查看错题本
        </Link>
      </header>

      <div className="practice-page">
        <div className="practice-page__main">
          <div className="difficulty-switch" role="group" aria-label="难度选择">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`difficulty-switch__item${difficulty === level.id ? ' is-active' : ''}`}
                onClick={() => handleDifficultyChange(level.id)}
                aria-pressed={difficulty === level.id}
                title={level.description}
              >
                <span className="difficulty-switch__label">{level.label}</span>
                <span className="difficulty-switch__desc">{level.description}</span>
              </button>
            ))}
          </div>

          <PracticeCard
            question={question}
            feedback={feedback}
            isRetry={isRetry}
            onSubmit={handleSubmit}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </div>

        <aside className="card practice-page__aside">
          <h2 className="card__title">本次会话</h2>
          <p className="card__hint">当前页面内的作答情况，累计数据见统计页。</p>

          <dl className="stat-mini">
            <div>
              <dt>本轮已答</dt>
              <dd>{session.answered}</dd>
            </div>
            <div>
              <dt>本轮正确</dt>
              <dd>{session.correct}</dd>
            </div>
            <div>
              <dt>本轮正确率</dt>
              <dd>{sessionAccuracy}%</dd>
            </div>
          </dl>

          <hr className="aside-divider" />

          <dl className="stat-mini">
            <div>
              <dt>累计练习</dt>
              <dd>{stats.total}</dd>
            </div>
            <div>
              <dt>当前连对</dt>
              <dd>{stats.streak}</dd>
            </div>
            <div>
              <dt>最高连对</dt>
              <dd>{stats.bestStreak}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
