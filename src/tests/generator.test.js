import { describe, expect, it } from 'vitest';

import { DIGIT_SETS, parseToDecimal, validateInput } from '../utils/converter';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_LEVELS,
  checkAnswer,
  createMistakeRecord,
  generateQuestion,
  getDifficulty,
  pickRandom,
  questionFromMistake,
  randomDigits,
  randomInt,
} from '../utils/generator';

/** 固定的题目，用于让判题逻辑的测试保持确定性。 */
const FIXED_QUESTION = {
  id: 'q_test',
  source: '101101',
  fromBase: 2,
  toBase: 16,
  answer: '2D',
  decimal: '45',
  difficulty: 'easy',
  createdAt: 0,
};

describe('randomDigits', () => {
  it('生成长度正确且首位不为 0 的数值串', () => {
    for (let i = 0; i < 50; i += 1) {
      const value = randomDigits(2, 6);

      expect(value).toHaveLength(6);
      expect(value[0]).not.toBe('0');
    }
  });

  it('生成的字符全部落在该进制的合法字符集内', () => {
    [2, 8, 10, 12, 16].forEach((base) => {
      for (let i = 0; i < 30; i += 1) {
        const value = randomDigits(base, 8);

        expect(validateInput(value, base).ok).toBe(true);
        [...value].forEach((char) => expect(DIGIT_SETS[base]).toContain(char));
      }
    });
  });

  it('不支持的进制直接报错，不静默返回错误结果', () => {
    expect(() => randomDigits(5, 4)).toThrow(/不支持的进制/);
  });
});

describe('generateQuestion', () => {
  it('生成结构完整的一题，答案与题面自洽', () => {
    const question = generateQuestion();

    expect(question).toMatchObject({
      difficulty: DEFAULT_DIFFICULTY,
    });
    expect(question.id).toMatch(/^q_/);
    expect(validateInput(question.source, question.fromBase).ok).toBe(true);
    expect(question.fromBase).not.toBe(question.toBase);
    expect(parseToDecimal(question.source, question.fromBase).toString()).toBe(question.decimal);
  });

  it('源进制与目标进制永远不会相同（避免无意义的题）', () => {
    for (let i = 0; i < 200; i += 1) {
      const question = generateQuestion({ difficulty: 'normal' });

      expect(question.fromBase).not.toBe(question.toBase);
    }
  });

  it('入门难度的数值不超过 4 位且不使用十二进制', () => {
    for (let i = 0; i < 200; i += 1) {
      const question = generateQuestion({ difficulty: 'easy' });

      expect(question.source.length).toBeLessThanOrEqual(4);
      expect([2, 8, 10, 16]).toContain(question.fromBase);
      expect([2, 8, 10, 16]).toContain(question.toBase);
    }
  });

  it('挑战难度允许出现十二进制与更长的数值', () => {
    const questions = Array.from({ length: 200 }, () => generateQuestion({ difficulty: 'hard' }));
    const maxLength = Math.max(...questions.map((question) => question.source.length));

    expect(maxLength).toBeGreaterThan(4);
    expect(questions.some((question) => question.fromBase === 12 || question.toBase === 12)).toBe(
      true,
    );
  });

  it('题目自带的标准答案可以直接通过判题', () => {
    for (let i = 0; i < 100; i += 1) {
      const question = generateQuestion({ difficulty: 'normal' });

      expect(checkAnswer(question, question.answer).correct).toBe(true);
    }
  });

  it('传入不可用的进制池时回退到难度默认值', () => {
    const question = generateQuestion({ difficulty: 'easy', bases: [5] });

    expect([2, 8, 10, 16]).toContain(question.fromBase);
  });

  it('每次生成的题目 id 不重复', () => {
    const ids = new Set(Array.from({ length: 300 }, () => generateQuestion().id));

    expect(ids.size).toBe(300);
  });
});

describe('checkAnswer', () => {
  it('答案正确时判定通过', () => {
    expect(checkAnswer(FIXED_QUESTION, '2D')).toMatchObject({ correct: true, submitted: '2D' });
  });

  it('忽略大小写与首尾空白', () => {
    expect(checkAnswer(FIXED_QUESTION, ' 2d ').correct).toBe(true);
    expect(checkAnswer(FIXED_QUESTION, '2d').correct).toBe(true);
  });

  it('前导零不影响判题（比较数值而非字符串）', () => {
    expect(checkAnswer(FIXED_QUESTION, '02D').correct).toBe(true);
  });

  it('答案错误时返回正确答案', () => {
    const result = checkAnswer(FIXED_QUESTION, '2E');

    expect(result.correct).toBe(false);
    expect(result.expected).toBe('2D');
    expect(result.message).toBe('');
  });

  it('空答案给出专门提示而不是判错', () => {
    const result = checkAnswer(FIXED_QUESTION, '   ');

    expect(result.correct).toBe(false);
    expect(result.code).toBe('EMPTY_INPUT');
    expect(result.message).toContain('还没有填写答案');
  });

  it('答案里出现目标进制不支持的字符时逐个指出', () => {
    const binaryQuestion = { ...FIXED_QUESTION, toBase: 2, answer: '101101' };
    const result = checkAnswer(binaryQuestion, '1011012');

    expect(result.correct).toBe(false);
    expect(result.code).toBe('INVALID_CHARACTERS');
    expect(result.message).toContain('不是合法的 2 进制字符');
  });

  it('十二进制题目里 A / B 是合法答案', () => {
    const duodecimalQuestion = { ...FIXED_QUESTION, source: '1463', fromBase: 10, toBase: 12, answer: 'A1B' };

    expect(checkAnswer(duodecimalQuestion, 'a1b').correct).toBe(true);
    expect(checkAnswer(duodecimalQuestion, 'A1C').correct).toBe(false);
  });
});

describe('错题记录', () => {
  it('由题目与用户答案生成错题记录', () => {
    const record = createMistakeRecord(FIXED_QUESTION, '2e');

    expect(record).toMatchObject({
      source: '101101',
      fromBase: 2,
      toBase: 16,
      answer: '2D',
      submitted: '2E',
      decimal: '45',
    });
    expect(record.id).toContain(FIXED_QUESTION.id);
  });

  it('未作答时 submitted 存空串，展示文案由视图层补', () => {
    expect(createMistakeRecord(FIXED_QUESTION, '   ').submitted).toBe('');
  });

  it('错题记录可以还原成可重练的题目', () => {
    const record = createMistakeRecord(FIXED_QUESTION, '2E');
    const question = questionFromMistake(record);

    expect(question).toMatchObject({
      source: '101101',
      fromBase: 2,
      toBase: 16,
      answer: '2D',
      difficulty: 'retry',
    });
    expect(question.id).toContain('retry_');
    expect(checkAnswer(question, '2D').correct).toBe(true);
  });
});

describe('辅助函数', () => {
  it('randomInt 落在闭区间内', () => {
    for (let i = 0; i < 100; i += 1) {
      const value = randomInt(2, 6);

      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(6);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('pickRandom 只会返回数组里的元素', () => {
    const pool = [2, 8, 16];

    for (let i = 0; i < 50; i += 1) {
      expect(pool).toContain(pickRandom(pool));
    }
  });

  it('getDifficulty 遇到未知 id 时回退到进阶难度', () => {
    expect(getDifficulty('unknown').id).toBe(DEFAULT_DIFFICULTY);
    expect(getDifficulty('hard').label).toBe('挑战');
  });

  it('难度档位配置齐全', () => {
    expect(DIFFICULTY_LEVELS.map((level) => level.id)).toEqual(['easy', 'normal', 'hard']);
    DIFFICULTY_LEVELS.forEach((level) => {
      expect(level.bases.length).toBeGreaterThanOrEqual(2);
      expect(level.maxDigits).toBeGreaterThanOrEqual(2);
      expect(level.description).toBeTruthy();
    });
  });
});
