import { describe, expect, it } from 'vitest';

import {
  ConversionError,
  DIGIT_SETS,
  ERROR_CODES,
  SUPPORTED_BASES,
  convert,
  decimalToBase,
  explainConversion,
  findInvalidCharacters,
  groupDigits,
  isSupportedBase,
  normalizeInput,
  parseToDecimal,
  toSubscript,
  validateInput,
} from '../utils/converter';

describe('convert —— 各进制互转', () => {
  it('二进制转十六进制：101101₂ = 2D₁₆', () => {
    expect(convert('101101', 2, 16).result).toBe('2D');
  });

  it('十六进制转二进制：2D₁₆ = 101101₂', () => {
    expect(convert('2D', 16, 2).result).toBe('101101');
  });

  it('八进制转十进制：755₈ = 493₁₀', () => {
    expect(convert('755', 8, 10).result).toBe('493');
  });

  it('八进制转二进制：755₈ = 111101101₂', () => {
    expect(convert('755', 8, 2).result).toBe('111101101');
  });

  it('十六进制转八进制：FF₁₆ = 377₈', () => {
    expect(convert('FF', 16, 8).result).toBe('377');
  });

  it('十二进制转十进制：A1B₁₂ = 1463₁₀（A=10, B=11）', () => {
    expect(convert('A1B', 12, 10).result).toBe('1463');
  });

  it('十进制转十二进制：1463₁₀ = A1B₁₂', () => {
    expect(convert('1463', 10, 12).result).toBe('A1B');
  });

  it('十二进制转二进制：A1B₁₂ = 10110110111₂', () => {
    expect(convert('A1B', 12, 2).result).toBe('10110110111');
  });

  it('二进制转十二进制：1010₂ = A₁₂', () => {
    expect(convert('1010', 2, 12).result).toBe('A');
  });

  it('转换结果同时给出十进制中间值', () => {
    const result = convert('101101', 2, 16);

    expect(result).toMatchObject({
      input: '101101',
      result: '2D',
      decimal: '45',
      fromBase: 2,
      toBase: 16,
    });
  });

  it('相同进制之间转换保持原值', () => {
    expect(convert('1234', 10, 10).result).toBe('1234');
    expect(convert('1B2A', 12, 12).result).toBe('1B2A');
  });

  it('零的任意进制表示都是 0', () => {
    SUPPORTED_BASES.forEach((base) => {
      expect(convert('0', base, 10).result).toBe('0');
      expect(convert('0', 10, base).result).toBe('0');
    });
  });

  it('任意进制组合往返一致（2/8/10/12/16 全排列）', () => {
    const sample = '110110111110'; // 3502
    const decimal = parseToDecimal(sample, 2).toString();

    SUPPORTED_BASES.forEach((fromBase) => {
      const source = decimalToBase(BigInt(decimal), fromBase);

      SUPPORTED_BASES.forEach((toBase) => {
        expect(convert(convert(source, fromBase, toBase).result, toBase, fromBase).result).toBe(
          source,
        );
      });
    });
  });

  it('超过 Number 安全范围的大数依然精确（64 位全 1）', () => {
    const binary = '1'.repeat(64);

    expect(convert(binary, 2, 10).result).toBe('18446744073709551615');
    expect(convert(binary, 2, 16).result).toBe('FFFFFFFFFFFFFFFF');
  });
});

describe('convert —— 大小写与空白处理', () => {
  it('小写输入按大写处理', () => {
    expect(convert('2d', 16, 2).result).toBe('101101');
    expect(convert('ff', 16, 10).result).toBe('255');
  });

  it('大小写混输也能正确解析', () => {
    expect(convert('a1b', 12, 10).result).toBe('1463');
    expect(convert('Ab', 12, 16).result).toBe('83'); // 10*12+11 = 131 = 0x83
  });

  it('忽略空格与下划线', () => {
    expect(convert('1010 1010', 2, 16).result).toBe('AA');
    expect(convert('1010_1010', 2, 16).result).toBe('AA');
  });

  it('normalizeInput 统一去空白并转大写', () => {
    expect(normalizeInput('  2a b ')).toBe('2AB');
    expect(normalizeInput(null)).toBe('');
    expect(normalizeInput(undefined)).toBe('');
  });
});

describe('convert —— 错误输入', () => {
  it('空输入抛出 EMPTY_INPUT', () => {
    expect(() => convert('', 2, 16)).toThrow(ConversionError);

    try {
      convert('   ', 2, 16);
    } catch (error) {
      expect(error.code).toBe(ERROR_CODES.EMPTY_INPUT);
    }
  });

  it('非法字符抛出 INVALID_CHARACTERS 并说明合法字符集', () => {
    expect(() => convert('102', 2, 16)).toThrow(/不是合法的 2 进制字符/);
    expect(() => convert('128', 8, 10)).toThrow(/不是合法的 8 进制字符/);
    expect(() => convert('1G', 16, 10)).toThrow(/不是合法的 16 进制字符/);
  });

  it('十二进制不接受 C 及以后的字符', () => {
    expect(() => convert('1C', 12, 10)).toThrow(ConversionError);
    expect(findInvalidCharacters('1C', 12)).toEqual(['C']);
  });

  it('负数抛出 UNSUPPORTED_SIGN', () => {
    expect(() => convert('-1010', 2, 10)).toThrow(/暂不支持负数/);
  });

  it('不支持的进制抛出 INVALID_BASE', () => {
    expect(() => convert('11', 3, 10)).toThrow(/不支持的进制/);
    expect(() => convert('11', 2, 36)).toThrow(/不支持的进制/);
  });

  it('findInvalidCharacters 去重返回非法字符', () => {
    expect(findInvalidCharacters('12G2G', 16)).toEqual(['G']);
    expect(findInvalidCharacters('abc', 2)).toEqual(['A', 'B', 'C']);
  });

  it('validateInput 不抛异常，返回结构化结果', () => {
    expect(validateInput('101101', 2)).toEqual({ ok: true, value: '101101' });
    expect(validateInput('', 2)).toMatchObject({ ok: false, code: ERROR_CODES.EMPTY_INPUT });
    expect(validateInput('xyz', 16)).toMatchObject({
      ok: false,
      code: ERROR_CODES.INVALID_CHARACTERS,
      invalidCharacters: ['X', 'Y', 'Z'],
    });
  });
});

describe('底层工具函数', () => {
  it('isSupportedBase 只接受 2 / 8 / 10 / 12 / 16', () => {
    SUPPORTED_BASES.forEach((base) => expect(isSupportedBase(base)).toBe(true));
    [0, 1, 3, 4, 32, 36, -2, '2x'].forEach((base) => expect(isSupportedBase(base)).toBe(false));
  });

  it('每种进制的合法字符集与进制匹配', () => {
    SUPPORTED_BASES.forEach((base) => {
      expect(DIGIT_SETS[base]).toHaveLength(base);
    });

    expect(DIGIT_SETS[12]).toBe('0123456789AB');
    expect(DIGIT_SETS[16]).toBe('0123456789ABCDEF');
  });

  it('decimalToBase 拒绝负数与非法进制', () => {
    expect(() => decimalToBase(-1n, 2)).toThrow(ConversionError);
    expect(() => decimalToBase(10n, 5)).toThrow(ConversionError);
  });

  it('groupDigits 按长度分组，二进制长串更易读', () => {
    expect(groupDigits('10101010', 4)).toBe('1010 1010');
    expect(groupDigits('101', 4)).toBe('101');
    expect(groupDigits('1010101010', 4)).toBe('1010 1010 10');
    expect(groupDigits('2A', 0)).toBe('2A');
  });

  it('toSubscript 用于渲染进制下标', () => {
    expect(toSubscript(2)).toBe('₂');
    expect(toSubscript(16)).toBe('₁₆');
  });

  it('explainConversion 生成可读的解析过程', () => {
    expect(explainConversion('101010', 2, 16)).toBe('101010₂ = 42₁₀ = 2A₁₆');
    expect(explainConversion('101010', 2, 10)).toBe('101010₂ = 42₁₀');
    expect(explainConversion('42', 10, 16)).toBe('42₁₀ = 2A₁₆');
  });
});
