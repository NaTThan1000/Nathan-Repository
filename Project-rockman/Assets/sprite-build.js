#!/usr/bin/env node
// ============================================================
// sprite-build.js — 在本地文件夹内直接生成切割产物
//
// 用法:
//   node sprite-build.js                    # 读取同目录 sprite-params.json
//   node sprite-build.js --params a.json    # 指定参数文件
//   node sprite-build.js --out ./out        # 指定输出目录(默认脚本目录)
//
// 参数文件来自 sprite-cutter.html 的「📋 复制切割参数」按钮。
// 产物: {prefix}_clean.png / {prefix}_strip.png / {prefix}_frames.json
// 零依赖: 内置 PNG 编解码(仅支持 8bit RGBA/RGB 非隔行)。
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------- 命令行 ----------------
const args = process.argv.slice(2);
function argVal(name, def) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}
const SCRIPT_DIR = __dirname;
const paramsFile = path.resolve(SCRIPT_DIR, argVal('--params', 'sprite-params.json'));
const outDir = path.resolve(argVal('--out', SCRIPT_DIR));

// ---------------- PNG 解码 ----------------
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(width, height, rgba) {
  // 每行前置 filter 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    PNG_SIG,
    writeChunk('IHDR', ihdr),
    writeChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    writeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// 返回 { width, height, data: RGBA Buffer }
function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('不是有效的 PNG 文件');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    if (pos + 8 > buf.length) throw new Error('PNG 数据不完整');
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  if (!width || !height) throw new Error('PNG 缺少 IHDR');
  if (bitDepth !== 8) throw new Error(`不支持位深 ${bitDepth}（仅支持 8bit）`);
  if (interlace !== 0) throw new Error('不支持隔行扫描 PNG');
  let bpp;
  if (colorType === 6) bpp = 4;       // RGBA
  else if (colorType === 2) bpp = 3;  // RGB
  else throw new Error(`不支持颜色类型 ${colorType}（仅支持 RGBA/RGB）`);

  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const f = inflated[y * (stride + 1)];
    if (f > 4) throw new Error(`未知 filter 类型 ${f}`);
    const rowStart = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const raw = inflated[rowStart + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = raw;
      if (f === 1) v = raw + a;
      else if (f === 2) v = raw + b;
      else if (f === 3) v = raw + Math.floor((a + b) / 2);
      else if (f === 4) v = raw + paeth(a, b, c);
      out[y * stride + x] = v & 0xff;
    }
  }
  // RGB → RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const src = i * bpp, dst = i * 4;
    rgba[dst] = out[src];
    rgba[dst + 1] = out[src + 1];
    rgba[dst + 2] = out[src + 2];
    rgba[dst + 3] = bpp === 4 ? out[src + 3] : 255;
  }
  return { width, height, data: rgba };
}

// ---------------- 绿幕去除（与网页算法一致：精确去纯绿） ----------------
// 只删除「纯绿背景 (0,255,0)」本身及其抗锯齿过渡像素，
// 其余所有颜色（包括前景自身的绿色描边/高光）一律保留。
function removeGreen(data, tol, width, height) {
  const d = data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a === 0) continue;
    const isBgGreen = g >= 255 - tol && r <= tol && b <= tol;
    if (isBgGreen) d[i + 3] = 0;
  }
}

// ---------------- 主流程 ----------------
function main() {
  if (!fs.existsSync(paramsFile)) {
    console.error(`✗ 找不到参数文件: ${paramsFile}`);
    console.error('  请先在 sprite-cutter.html 里点「📋 复制切割参数」并保存为 sprite-params.json');
    process.exit(1);
  }
  const p = JSON.parse(fs.readFileSync(paramsFile, 'utf8'));
  if (!p.sourceImage) { console.error('✗ 参数缺少 sourceImage'); process.exit(1); }
  if (!p.sel || !p.dividers || p.dividers.length < 1) {
    console.error('✗ 参数缺少选区或分割线（请先在网页里框选并添加分割线）');
    process.exit(1);
  }

  const srcPath = path.resolve(SCRIPT_DIR, p.sourceImage);
  if (!fs.existsSync(srcPath)) {
    console.error(`✗ 源图不存在: ${srcPath}`);
    process.exit(1);
  }

  console.log(`→ 源图: ${srcPath}`);
  const { width: imgW, height: imgH, data: px } = decodePNG(fs.readFileSync(srcPath));
  console.log(`→ 尺寸: ${imgW}×${imgH}`);

  removeGreen(px, p.greenTolerance != null ? p.greenTolerance : 30, imgW, imgH);

  // 帧区域（与网页 getFrameRegions 一致）
  const { x0, y0, x1, y1 } = p.sel;
  const xs = [x0, ...p.dividers.filter(x => x > x0 + 0.5 && x < x1 - 0.5), x1].sort((a, b) => a - b);
  const regions = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const s = xs[i], e = xs[i + 1];
    if (e - s >= 1) regions.push({ sx: Math.round(s), w: Math.round(e - s) });
  }
  const selY0 = Math.round(y0);
  const selH = Math.round(y1 - y0);

  // 每帧内容包围盒
  const frames = regions.map(r => {
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    for (let yy = selY0; yy < selY0 + selH; yy++) {
      for (let xx = r.sx; xx < r.sx + r.w; xx++) {
        if (px[(yy * imgW + xx) * 4 + 3] > 0) {
          if (xx < minX) minX = xx;
          if (xx > maxX) maxX = xx;
          if (yy < minY) minY = yy;
          if (yy > maxY) maxY = yy;
        }
      }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  });
  if (frames.some(f => !f)) {
    console.error('✗ 存在空帧，请调整分割线');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const prefix = p.prefix || 'sprite';

  // 1. clean.png — 去绿幕整图
  const clean = encodePNG(imgW, imgH, px);
  fs.writeFileSync(path.join(outDir, `${prefix}_clean.png`), clean);
  console.log(`✓ ${prefix}_clean.png (${imgW}×${imgH})`);

  // 2. strip.png — 等宽条带（与网页导出 A 一致）
  const st = p.strip || {};
  const ws = st.widthStrategy || 'max';
  let fw;
  if (ws === 'avg') fw = Math.round(frames.reduce((a, b) => a + b.w, 0) / frames.length);
  else if (ws === 'custom') fw = Math.max(1, st.customWidth || 40);
  else fw = Math.max(...frames.map(b => b.w));
  const fh = Math.max(...frames.map(b => b.h));
  const strip = Buffer.alloc(fw * regions.length * fh * 4);
  frames.forEach((b, i) => {
    const dx = i * fw + Math.round((fw - b.w) / 2);
    let dy;
    if (st.valign === 'bottom') dy = fh - b.h;
    else if (st.valign === 'top') dy = 0;
    else dy = Math.round((fh - b.h) / 2);
    for (let yy = 0; yy < b.h; yy++) {
      for (let xx = 0; xx < b.w; xx++) {
        const srcI = ((b.y + yy) * imgW + (b.x + xx)) * 4;
        const dstI = ((dy + yy) * (fw * regions.length) + (dx + xx)) * 4;
        for (let k = 0; k < 4; k++) strip[dstI + k] = px[srcI + k];
      }
    }
  });
  fs.writeFileSync(path.join(outDir, `${prefix}_strip.png`), encodePNG(fw * regions.length, fh, strip));
  console.log(`✓ ${prefix}_strip.png (${fw * regions.length}×${fh}, ${regions.length} 帧 × ${fw}px)`);

  // 3. frames.json — 每帧包围盒坐标（与网页导出 B 一致）
  const json = {
    format: 'rockman-sprite',
    version: 1,
    source: p.sourceImage,
    exportedAt: new Date().toISOString(),
    action: prefix,
    fps: p.fps || 10,
    frames,
    meta: {
      imageWidth: imgW,
      imageHeight: imgH,
      cleanImage: `${prefix}_clean.png`,
    },
  };
  fs.writeFileSync(path.join(outDir, `${prefix}_frames.json`), JSON.stringify(json, null, 2));
  console.log(`✓ ${prefix}_frames.json (${frames.length} 帧)`);

  console.log(`\n完成！输出目录: ${outDir}`);
}

main();
