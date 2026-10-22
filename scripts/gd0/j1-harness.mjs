#!/usr/bin/env node
// GĐ0-J1 (#377): harness embedding CPU/ONNX — tải model, embed câu test, đo ms/câu.
// Model: multilingual-e5-small (118M, vi/zh) qua transformers.js (onnxruntime-node).
// Cách gọi e5: câu query có tiền tố "query: ", câu tài liệu không prefix (chuẩn e5).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const MODEL = process.env.GD0_MODEL || 'Xenova/multilingual-e5-small';
const DTYPE = process.env.GD0_DTYPE || 'q8';

export async function taoExtractor() {
  const { pipeline } = await import('@huggingface/transformers');
  const t0 = Date.now();
  const ext = await pipeline('feature-extraction', MODEL, { dtype: DTYPE });
  return { ext, taiMs: Date.now() - t0 };
}

export async function embed(ext, cau, { query = false } = {}) {
  const v = await ext((Array.isArray(cau) ? cau : [cau]).map((c) => (query ? 'query: ' : '') + String(c)), { pooling: 'mean', normalize: true });
  const n = v.dims[0];
  const dim = v.dims[1];
  const arr = Array.from(v.odata || v.data);
  return Array.from({ length: n }, (_, i) => arr.slice(i * dim, (i + 1) * dim));
}

export function cos(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // đã normalize → dot = cosine
}

// CLI: chạy trực tiếp để đo ms/câu
if (process.argv[1] && process.argv[1].endsWith('j1-harness.mjs')) {
  const { ext, taiMs } = await taoExtractor();
  const cauTest = ['máy nén khí trục vít 22kW', '空压机 螺杆式 22kW', 'bình giữ nhiệt inox 304', 'găng tay cao su y tế không bột', 'LED驱动器 60W 12V IP67'];
  const t0 = Date.now();
  const vec = await embed(ext, cauTest);
  const ms = Date.now() - t0;
  console.log(JSON.stringify({ model: MODEL, dtype: DTYPE, taiMs, soCau: cauTest.length, tongMs: ms, msPerCau: Math.round(ms / cauTest.length), dim: vec[0].length, mauCos: { 'nén-khí vs không khí TQ': +cos(vec[0], vec[1]).toFixed(3), 'nén-khí vs bình giữ nhiệt': +cos(vec[0], vec[2]).toFixed(3) } }, null, 1));
}
