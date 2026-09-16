/**
 * 生成 PWA 所需的 PNG 图标。
 * ---------------------------------------------------------------------------
 * 为了避免引入 canvas / sharp 这类重型依赖，这里手写一个最小 PNG 编码器：
 *   IHDR + IDAT(zlib) + IEND，颜色类型固定为 RGBA8。
 * 图形用 3 倍超采样渲染再降采样，边缘不会有锯齿。
 *
 * 用法：npm run icons
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/** 背景渐变：左上 #6366F1 → 右下 #0EA5E9 */
const GRADIENT_START = [99, 102, 241];
const GRADIENT_END = [14, 165, 233];

/** 5x7 点阵字模，用来画 “2A”。 */
const GLYPHS = {
  2: [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
};

const GLYPH_TEXT = '2A';
const GLYPH_COLS = 5;
const GLYPH_ROWS = 7;
const GLYPH_GAP = 1;

/* -------------------------------------------------------------- PNG 编码 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  return table;
})();

function crc32(buffer) {
  let crc = -1;

  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** 把 RGBA 像素编码成 PNG 文件内容。 */
function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // 颜色类型：RGBA
  ihdr[10] = 0; // 压缩方式
  ihdr[11] = 0; // 滤波方式
  ihdr[12] = 0; // 非隔行

  // 每行前面加一个滤波类型字节（0 = None）
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', deflateSync(raw, { level: 9 })),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- 绘制 */

/** 圆角矩形内部判定。radius 为 0 时退化成普通矩形。 */
function insideRoundedRect(x, y, size, radius) {
  const max = size - 1;

  if (x < 0 || y < 0 || x > max || y > max) return false;
  if (radius <= 0) return true;

  const innerMin = radius;
  const innerMax = max - radius;

  const nearestX = Math.min(Math.max(x, innerMin), innerMax);
  const nearestY = Math.min(Math.max(y, innerMin), innerMax);
  const dx = x - nearestX;
  const dy = y - nearestY;

  return dx * dx + dy * dy <= radius * radius;
}

/** 点阵字形内部判定。 */
function insideGlyph(x, y, layout) {
  const col = Math.floor((x - layout.x) / layout.cell);
  const row = Math.floor((y - layout.y) / layout.cell);

  if (col < 0 || row < 0) return false;

  const glyphIndex = Math.floor(col / (GLYPH_COLS + GLYPH_GAP));
  if (glyphIndex >= GLYPH_TEXT.length) return false;

  const localCol = col % (GLYPH_COLS + GLYPH_GAP);
  if (localCol >= GLYPH_COLS) return false;

  const bitmap = GLYPHS[GLYPH_TEXT[glyphIndex]];
  if (!bitmap || row >= GLYPH_ROWS) return false;

  const bits = bitmap[row];
  return ((bits >> (GLYPH_COLS - 1 - localCol)) & 1) === 1;
}

/**
 * 渲染一张图标。
 * @param {number} size 输出边长
 * @param {{rounded?: boolean, glyphRatio?: number}} options
 *        rounded 为 false 时输出满幅方形底（用于 maskable 图标）
 */
function renderIcon(size, { rounded = true, glyphRatio = 0.58 } = {}) {
  const scale = 3; // 超采样倍数
  const big = size * scale;
  const radius = rounded ? size * 0.22 * scale : 0;

  const totalCols = GLYPH_COLS * GLYPH_TEXT.length + GLYPH_GAP * (GLYPH_TEXT.length - 1);
  const cell = (big * glyphRatio) / totalCols;
  const glyphLayout = {
    cell,
    x: (big - cell * totalCols) / 2,
    y: (big - cell * GLYPH_ROWS) / 2,
  };

  const dotRadius = size * 0.028 * scale;
  const dotCenterX = big / 2;
  const dotCenterY = glyphLayout.y + cell * GLYPH_ROWS + dotRadius * 3.2;

  // 累加缓冲区，按预乘 alpha 累积，避免边缘出现黑边
  const acc = new Float64Array(size * size * 4);

  for (let y = 0; y < big; y += 1) {
    for (let x = 0; x < big; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      if (insideRoundedRect(x, y, big, radius)) {
        const t = (x + y) / (2 * (big - 1));
        r = GRADIENT_START[0] + (GRADIENT_END[0] - GRADIENT_START[0]) * t;
        g = GRADIENT_START[1] + (GRADIENT_END[1] - GRADIENT_START[1]) * t;
        b = GRADIENT_START[2] + (GRADIENT_END[2] - GRADIENT_START[2]) * t;
        a = 255;
      }

      const insideDot =
        (x - dotCenterX) ** 2 + (y - dotCenterY) ** 2 <= dotRadius * dotRadius;

      if (insideDot || insideGlyph(x, y, glyphLayout)) {
        r = 255;
        g = 255;
        b = 255;
        a = 255;
      }

      const targetX = Math.floor(x / scale);
      const targetY = Math.floor(y / scale);
      const offset = (targetY * size + targetX) * 4;

      acc[offset] += r * a;
      acc[offset + 1] += g * a;
      acc[offset + 2] += b * a;
      acc[offset + 3] += a;
    }
  }

  const samples = scale * scale;
  const rgba = Buffer.alloc(size * size * 4);

  for (let i = 0; i < size * size; i += 1) {
    const offset = i * 4;
    const alphaSum = acc[offset + 3];

    rgba[offset] = alphaSum > 0 ? Math.round(acc[offset] / alphaSum) : 0;
    rgba[offset + 1] = alphaSum > 0 ? Math.round(acc[offset + 1] / alphaSum) : 0;
    rgba[offset + 2] = alphaSum > 0 ? Math.round(acc[offset + 2] / alphaSum) : 0;
    rgba[offset + 3] = Math.round(alphaSum / samples);
  }

  return encodePng(size, size, rgba);
}

/* ---------------------------------------------------------------- 入口 */

const TARGETS = [
  { file: 'icon-192.png', size: 192, options: { rounded: true } },
  { file: 'icon-512.png', size: 512, options: { rounded: true } },
  // maskable 图标需要留出安全边距，因此把字形缩小并铺满底色
  { file: 'icon-maskable-512.png', size: 512, options: { rounded: false, glyphRatio: 0.42 } },
  { file: 'apple-touch-icon.png', size: 180, options: { rounded: false, glyphRatio: 0.56 } },
];

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const target of TARGETS) {
  const png = renderIcon(target.size, target.options);
  writeFileSync(join(OUTPUT_DIR, target.file), png);
  console.log(`generated ${target.file} (${target.size}x${target.size}, ${png.length} bytes)`);
}
