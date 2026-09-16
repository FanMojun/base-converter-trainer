/**
 * 练习题目生成与判题
 * ---------------------------------------------------------------------------
 * 出题思路：先随机决定「源进制 → 目标进制」和位数，再按源进制的字符集随机生成数值。
 * 这样生成的题面天然是该进制的合法串，不需要生成后再校验。
 */

import {
  DIGIT_SETS,
  SUPPORTED_BASES,
  convert,
  normalizeInput,
  parseToDecimal,
  validateInput,
} from './converter';

/** 难度档位：控制可用进制与数值长度。 */
export const DIFFICULTY_LEVELS = [
  {
    id: 'easy',
    label: '入门',
    description: '2 / 8 / 10 / 16 进制，最长 4 位',
    bases: [2, 8, 10, 16],
    maxDigits: 4,
  },
  {
    id: 'normal',
    label: '进阶',
    description: '加入十二进制，最长 6 位',
    bases: [2, 8, 10, 12, 16],
    maxDigits: 6,
  },
  {
    id: 'hard',
    label: '挑战',
    description: '全部进制，最长 10 位长串',
    bases: [2, 8, 10, 12, 16],
    maxDigits: 10,
  },
];

export const DEFAULT_DIFFICULTY = 'normal';

/** 按 id 取难度档位，取不到时回退到默认档位。 */
export function getDifficulty(id) {
  return DIFFICULTY_LEVELS.find((level) => level.id === id) ?? DIFFICULTY_LEVELS[1];
}

/** [min, max] 闭区间随机整数。 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 从数组里随机取一项。 */
export function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

/**
 * 生成指定进制的随机数值串。
 * 首位不能是 0，避免出现 "0F" 这类看起来像两位其实只有一位的题面。
 */
export function randomDigits(base, length) {
  const charset = DIGIT_SETS[base];

  if (!charset) {
    throw new Error(`无法为不支持的进制生成题目：${base}`);
  }

  let result = charset[randomInt(1, charset.length - 1)];

  for (let i = 1; i < length; i += 1) {
    result += charset[randomInt(0, charset.length - 1)];
  }

  return result;
}

/** 题目 id：时间戳 + 随机串，足够避免同一毫秒内碰撞。 */
function createQuestionId() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 生成一道随机进制转换题。
 *
 * @param {{difficulty?: string, bases?: number[]}} [options]
 * @returns {{id: string, source: string, fromBase: number, toBase: number,
 *            answer: string, decimal: string, difficulty: string, createdAt: number}}
 */
export function generateQuestion(options = {}) {
  const level = getDifficulty(options.difficulty ?? DEFAULT_DIFFICULTY);

  const pool = (Array.isArray(options.bases) ? options.bases : level.bases).filter((base) =>
    SUPPORTED_BASES.includes(base),
  );

  // 兜底：调用方传入的进制池不可用时退回档位默认值
  const usableBases = pool.length >= 2 ? pool : level.bases;

  const fromBase = pickRandom(usableBases);
  const toBase = pickRandom(usableBases.filter((base) => base !== fromBase));

  const source = randomDigits(fromBase, randomInt(2, level.maxDigits));
  const { result: answer, decimal } = convert(source, fromBase, toBase);

  return {
    id: createQuestionId(),
    source,
    fromBase,
    toBase,
    answer,
    decimal,
    difficulty: level.id,
    createdAt: Date.now(),
  };
}

/**
 * 判题。
 * 比较的是数值本身而不是字符串，因此 "2d"、"02D"、"2D" 都算对，
 * 大小写与前导零不会影响结果。
 *
 * @returns {{submitted: string, correct: boolean, code: string|null, message: string, expected: string}}
 */
export function checkAnswer(question, rawAnswer) {
  const submitted = normalizeInput(rawAnswer);
  const expected = question.answer;

  if (submitted === '') {
    return {
      submitted,
      correct: false,
      code: 'EMPTY_INPUT',
      message: '还没有填写答案。',
      expected,
    };
  }

  const validation = validateInput(submitted, question.toBase);

  if (!validation.ok) {
    return {
      submitted,
      correct: false,
      code: validation.code,
      message: validation.message,
      expected,
    };
  }

  const userValue = parseToDecimal(submitted, question.toBase);
  const expectedValue = parseToDecimal(expected, question.toBase);

  return {
    submitted,
    correct: userValue === expectedValue,
    code: null,
    message: '',
    expected,
  };
}

/** 把一道错题整理成可持久化的记录（不含答案对错之外的中间状态）。 */
export function createMistakeRecord(question, submitted) {
  const answer = normalizeInput(submitted);

  return {
    id: `${question.id}_${Date.now().toString(36)}`,
    source: question.source,
    fromBase: question.fromBase,
    toBase: question.toBase,
    answer: question.answer,
    submitted: answer === '' ? '（未作答）' : answer,
    decimal: question.decimal,
    createdAt: Date.now(),
  };
}

/** 由错题记录还原成一道可重练的题目。 */
export function questionFromMistake(record) {
  return {
    id: `retry_${record.id}`,
    source: record.source,
    fromBase: record.fromBase,
    toBase: record.toBase,
    answer: record.answer,
    decimal: record.decimal,
    difficulty: 'retry',
    createdAt: Date.now(),
  };
}
