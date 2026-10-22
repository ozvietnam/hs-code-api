#!/usr/bin/env node
// GĐ0-J3 (#377): retrieval + gợi ý — mô tả hàng → top-k nhóm 4 & 6 số + độ tin.
// Dùng index J2 (đã embed sẵn), tính cosine toàn bộ (7.053 nhãn — đủ nhỏ, không cần ANN).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function taoRetriever(index) {
  const { vec4, vec6 } = index;
  const entries4 = Object.entries(vec4);
  const entries6 = Object.entries(vec6);
  const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  function topK(vec, entries, k) {
    return entries.map(([ma, v]) => ({ ma, diem: +cos(vec, v).toFixed(4) }))
      .sort((x, y) => y.diem - x.diem).slice(0, k);
  }
  return {
    async tim(moTa, ext, { k = 5 } = {}) {
      const { embed } = await import('./j1-harness.mjs');
      const [vec] = await embed(ext, moTa, { query: true });
      return { nhom4: topK(vec, entries4, k), nhom6: topK(vec, entries6, k) };
    },
    timTrucTiep(vec, { k = 5 } = {}) {
      return { nhom4: topK(vec, entries4, k), nhom6: topK(vec, entries6, k) };
    },
  };
}

// CLI: soát định tính
if (process.argv[1] && process.argv[1].endsWith('j3-retrieve.mjs')) {
  const index = JSON.parse(readFileSync(join(ROOT, 'data/gd0/index-e5-small.json'), 'utf8'));
  const r = taoRetriever(index);
  const { ext } = await (await import('./j1-harness.mjs')).taoExtractor();
  for (const q of ['quạt thông gió công nghiệp 550W', 'bình giữ nhiệt inox 304', '空压机 螺杆式 22kW', 'găng tay cao su y tế']) {
    const kq = await r.tim(q, ext, { k: 3 });
    console.log(`\n"${q}"`);
    console.log('  nhóm-4:', kq.nhom4.map((x) => `${x.ma}(${x.diem})`).join(' '));
    console.log('  nhóm-6:', kq.nhom6.map((x) => `${x.ma}(${x.diem})`).join(' '));
  }
}
