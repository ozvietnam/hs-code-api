#!/usr/bin/env node
/**
 * scripts/verify-review-lo088.mjs — Tự soát HỒ SƠ soát độc lập trước khi áp (lô 088).
 *
 * Kiểm 4 điều trên mọi dòng `sua`/`chen` của review/<nhom>.json:
 *  1) `trich` byte-exact trong ĐÚNG khối nguồn (nguồn lấy từ tmp/so-tay/nguon/<nhom>.txt);
 *  2) mọi từ ≥ 3 ký tự trong `text`/`dieuKien`/`hoi` phải có trong câu trích của CHÍNH mục đó
 *     (so GIỮ DẤU) — lớp kiểm mức B, bắt lỗi gõ tay/méo ký tự mà máy không bắt;
 *  3) trần clip runtime: `phamVi.text` ≤ 220 · `phanBiet.hoi` ≤ 110 (trần CỨNG);
 *     `loaiTru.dieuKien` ≤ 55 chỉ CẢNH BÁO (nền nhà 42,7 % vượt) — in kèm nội dung sau clip;
 *  4) `trich` ≤ 300 ký tự (luật 2).
 *
 *   node scripts/verify-review-lo088.mjs                       (6 nhóm lô 088)
 *   NHOM=2849 node scripts/verify-review-lo088.mjs             (một nhóm)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM = (process.env.NHOM || '2843,2844,2845,2846,2847,2849').split(',');
const STOP_RAW = ['hàng', 'này', 'là', 'các', 'và', 'hoặc', 'của', 'cho', 'những', 'một', 'được',
  'trong', 'thuộc', 'đã', 'chưa', 'không', 'có', 'làm', 'để', 'với', 'từ', 'đến', 'nhóm', 'như',
  'nếu', 'mà', 'hay', 'tại', 'bởi', 'sau', 'khi', 'loại', 'ở', 'dạng', 'đây'];
const CLIP = { text: 220, dieuKien: 55, hoi: 110 };
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const STOP = new Set(STOP_RAW.map(fold));

function loadSrc(nhom) {
  const txt = fs.readFileSync(path.join(ROOT, 'tmp/so-tay/nguon', `${nhom}.txt`), 'utf8');
  const out = {};
  const re = /^\[([^\]]+)\]$/gm;
  let m; const marks = [];
  while ((m = re.exec(txt))) marks.push({ name: m[1], start: m.index + m[0].length });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : txt.length;
    out[marks[i].name] = txt.slice(marks[i].start, end);
  }
  return out;
}

let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? '✓' : '❌'} ${msg}`); };
const warn = (msg) => console.log(`⚠️  ${msg}`);
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };

for (const nhom of NHOM) {
  const review = JSON.parse(fs.readFileSync(path.join(ROOT, 'review', `${nhom}.json`), 'utf8'));
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'tmp/so-tay/raw', `${nhom}.json`), 'utf8'));
  const src = loadSrc(nhom);
  console.log(`\n===== ${nhom} =====`);
  for (const t of review.thayDoi || []) {
    const items = [];
    // `sua` chỉ đổi vài trường — nguồn và trích lấy từ MỤC GỐC trong bản nháp.
    if (t.hanhDong === 'sua' && t.sua) {
      const m = String(t.index || '').match(/^([a-zA-Z_][a-zA-Z0-9_.]*)(?:\[(\d+)\])?$/);
      const kind = m && m[1];
      const idx = m && m[2] != null ? Number(m[2]) : null;
      const goc = kind && idx != null ? (raw[kind] || [])[idx] : (kind ? raw[kind] : null);
      if (!goc) { say(false, `${nhom} sua: không tìm thấy mục gốc ${t.index}`); continue; }
      items.push(['sua', { ...goc, ...t.sua }]);
    }
    if (t.hanhDong === 'chen' && t.muc) items.push(['chen', t.muc]);
    for (const [kind, muc] of items) {
      const s = src[muc.nguon];
      if (s === undefined) { say(false, `${nhom} ${kind}: nguồn không tồn tại (${muc.nguon})`); continue; }
      say(s.includes(muc.trich), `${nhom} ${kind}: trích byte-exact (${muc.trich.length} ký tự)`);
      say(muc.trich.length <= 300, `${nhom} ${kind}: trích ≤ 300 ký tự (${muc.trich.length})`);
      const q = fold(muc.trich);
      for (const f of ['text', 'dieuKien', 'hoi']) {
        if (!muc[f]) continue;
        const words = (muc[f].match(/[a-zA-ZÀ-ỹ0-9][a-zA-ZÀ-ỹ0-9.]*/gu) || []).filter((w) => w.length >= 3).map(fold);
        const miss = words.filter((w) => !STOP.has(w) && !q.includes(w));
        say(!miss.length, `${nhom} ${kind}.${f} (${muc[f].length} ký tự) gác từ ${miss.length ? 'THIẾU: ' + miss.join(', ') : 'OK'}`);
        if (f === 'dieuKien' && muc[f].length > CLIP[f]) {
          warn(`${nhom} ${kind}.${f} ${muc[f].length} > 55 — sau clip: "${clip(muc[f], 55)}"`);
        } else {
          say(muc[f].length <= CLIP[f], `${nhom} ${kind}.${f} ≤ trần clip ${CLIP[f]} (${muc[f].length})`);
        }
      }
    }
  }
}
console.log(bad ? `\n❌ ${bad} vấn đề` : '\n✅ Hồ sơ soát sạch');
process.exit(bad ? 1 : 0);
