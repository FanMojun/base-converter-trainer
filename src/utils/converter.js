/**
 * 进制转换引擎
 * ---------------------------------------------------------------------------
 * 设计原则：不为「二进制→十六进制」这类组合单独写逻辑。
 * 所有转换统一拆成两步流水线：
 *
 *     输入进制字符串 ──parseToDecimal──▶ 十进制 (BigInt) ──decimalToBase──▶ 目标进制字符串
 *
 * 中间值使用 BigInt 而不是 Number，避免超过 2^53 之后出现精度丢失，
 * 这样 64 位二进制串也能得到精确结果。
 */

/** 平台支持的进制。十进制仅作为内部计算的中转进制，同时也开放给用户使用。 */
export const SUPPORTED_BASES = [2, 8, 10, 12, 16];

/** 各进制可用的字符集：字符在字符串中的下标，就是它代表的数值。 */
export const DIGIT_SETS = {
  2: '01',
  8: '01234567',
  10: '0123456789',
  12: '0123456789AB',
  16: '0123456789ABCDEF',
};

/** 进制的展示名。界面是中文的，就不额外维护一份英文名了。 */
export const BASE_LABELS = {
  2: '二进制',
  8: '八进制',
  10: '十进制',
  12: '十二进制',
  16: '十六进制',
};

/** 错误码，UI 层据此决定提示文案与输入框高亮方式。 */
export const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_BASE: 'INVALID_BASE',
  INVALID_CHARACTERS: 'INVALID_CHARACTERS',
  UNSUPPORTED_SIGN: 'UNSUPPORTED_SIGN',
};

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

/** 转换过程中抛出的业务异常，携带错误码方便上层区分处理。 */
export class ConversionError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'ConversionError';
    this.code = code;
    this.detail = detail;
  }
}

export function isSupportedBase(base) {
  return SUPPORTED_BASES.includes(Number(base));
}

/** 取进制的可读名称，例如 16 → “十六进制”。 */
export function baseName(base) {
  return BASE_LABELS[base] ?? `${base} 进制`;
}

/** 把数字转成下标形式，用于渲染 101010₂ 这样的记号。 */
export function toSubscript(value) {
  return String(value)
    .split('')
    .map((char) => SUBSCRIPT_DIGITS[Number(char)] ?? char)
    .join('');
}

/**
 * 规范化用户输入：去掉首尾空白与常见的分隔符，统一转成大写。
 * 允许用户粘贴 “1010 1010” 或 “2a” 这类写法。
 */
export function normalizeInput(rawInput) {
  if (rawInput === null || rawInput === undefined) return '';
  return String(rawInput).replace(/[\s_]/g, '').toUpperCase();
}

/**
 * 找出输入中不属于目标字符集的字符。
 * @returns {string[]} 去重后的非法字符列表
 */
export function findInvalidCharacters(rawInput, base) {
  const charset = DIGIT_SETS[Number(base)];
  if (!charset) return [];

  const allowed = new Set(charset);
  const invalid = new Set();

  for (const char of normalizeInput(rawInput)) {
    if (!allowed.has(char)) invalid.add(char);
  }

  return [...invalid];
}

/**
 * 校验输入是否可以被解析成指定进制的整数。
 * 不抛异常，方便 UI 做实时提示；需要「失败即中断」时用 parseToDecimal。
 *
 * @returns {{ok: true, value: string} | {ok: false, code: string, message: string, invalidCharacters?: string[]}}
 */
export function validateInput(rawInput, base) {
  if (!isSupportedBase(base)) {
    return {
      ok: false,
      code: ERROR_CODES.INVALID_BASE,
      message: `不支持的进制：${base}。当前仅支持 ${SUPPORTED_BASES.join(' / ')}。`,
    };
  }

  const value = normalizeInput(rawInput);

  if (value === '') {
    return { ok: false, code: ERROR_CODES.EMPTY_INPUT, message: '请输入要转换的数值。' };
  }

  if (value.startsWith('-')) {
    return {
      ok: false,
      code: ERROR_CODES.UNSUPPORTED_SIGN,
      message: '暂不支持负数，请去掉符号后重试。',
    };
  }

  const invalidCharacters = findInvalidCharacters(value, base);

  if (invalidCharacters.length > 0) {
    return {
      ok: false,
      code: ERROR_CODES.INVALID_CHARACTERS,
      message: `“${invalidCharacters.join(' ')}” 不是合法的 ${base} 进制字符。合法字符：${DIGIT_SETS[base]}`,
      invalidCharacters,
    };
  }

  return { ok: true, value };
}

/**
 * 任意进制字符串 → 十进制 BigInt。
 * 逐位累加：acc = acc * base + 当前位数值
 */
export function parseToDecimal(rawInput, base) {
  const result = validateInput(rawInput, base);

  if (!result.ok) {
    throw new ConversionError(result.code, result.message, result);
  }

  const charset = DIGIT_SETS[base];
  const radix = BigInt(base);
  let decimal = 0n;

  for (const char of result.value) {
    decimal = decimal * radix + BigInt(charset.indexOf(char));
  }

  return decimal;
}

/**
 * 十进制 BigInt → 任意进制字符串。
 * 短除法取余，余数倒序拼接。
 */
export function decimalToBase(decimalValue, base) {
  if (!isSupportedBase(base)) {
    throw new ConversionError(ERROR_CODES.INVALID_BASE, `不支持的进制：${base}`);
  }

  let value = typeof decimalValue === 'bigint' ? decimalValue : BigInt(decimalValue);

  if (value < 0n) {
    throw new ConversionError(ERROR_CODES.UNSUPPORTED_SIGN, '暂不支持负数，请去掉符号后重试。');
  }

  if (value === 0n) return '0';

  const charset = DIGIT_SETS[base];
  const radix = BigInt(base);
  let result = '';

  while (value > 0n) {
    result = charset[Number(value % radix)] + result;
    value /= radix;
  }

  return result;
}

/**
 * 对外统一入口：任意进制 → 任意进制。
 *
 * @throws {ConversionError} 输入非法时抛出，携带 code / message
 * @returns {{input: string, result: string, decimal: string, fromBase: number, toBase: number}}
 */
export function convert(rawInput, fromBase, toBase) {
  const source = Number(fromBase);
  const target = Number(toBase);

  const decimal = parseToDecimal(rawInput, source);
  const result = decimalToBase(decimal, target);

  return {
    input: normalizeInput(rawInput),
    result,
    decimal: decimal.toString(),
    fromBase: source,
    toBase: target,
  };
}

/**
 * 生成人类可读的转换解析，用于练习页的「答案解析」。
 * 例如：101010₂ = 42₁₀ = 2A₁₆
 */
export function explainConversion(rawInput, fromBase, toBase) {
  const { input, result, decimal } = convert(rawInput, fromBase, toBase);
  const parts = [`${input}${toSubscript(fromBase)}`];

  if (Number(fromBase) !== 10) parts.push(`${decimal}${toSubscript(10)}`);
  if (Number(toBase) !== 10) parts.push(`${result}${toSubscript(toBase)}`);

  return parts.join(' = ');
}

/**
 * 按固定长度给数字分组，长串二进制阅读起来更轻松。
 * groupDigits('10101010', 4) → '1010 1010'
 */
export function groupDigits(text, size = 4) {
  const value = normalizeInput(text);
  if (!Number.isInteger(size) || size <= 0 || value.length <= size) return value;

  return value.replace(new RegExp(`(.{${size}})`, 'g'), '$1 ').trim();
}

/**
 * 按进制决定分组长度：二进制 4 位一组（1 位十六进制正好对应 4 位二进制），
 * 其它进制不分组。
 *
 * 这条规则原本在结果输出、练习题干、错题本三处各写了一遍
 * `base === 2 ? 4 : 0`。三处任意一处改动都会让同一种数字在不同页面
 * 显示成不同样子，所以收成一个函数。
 */
export function groupDigitsForBase(text, base) {
  return groupDigits(text, Number(base) === 2 ? 4 : 0);
}
