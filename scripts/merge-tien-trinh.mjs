#!/usr/bin/env node
/**
 * scripts/merge-tien-trinh.mjs — GHÉP `TIEN-TRINH.md` khi merge `main` bị conflict.
 *
 * VÌ SAO CẦN: `TIEN-TRINH.md` là nhật ký dùng CHUNG nhiều phiên/agent. Khi merge, git lấy phần
 * đầu từ một bên và phần sau từ bên kia — đã có nhiều lần `main` MẤT hẳn khối của phiên khác
 * (lô 027/028/031 mất 6 mục; lô 034 mất 2 khối). Script này ghép theo RANH GIỚI KHỐI (heading
 * cấp 1) nên không bỏ khối của phiên nào, rồi TỰ KIỂM lại: mọi khối của cả hai bên phải còn đủ nội dung.
 *
 * CÁCH DÙNG (khi đang conflict):
 *   node scripts/merge-tien-trinh.mjs            # xem phân tích, KHÔNG ghi
 *   node scripts/merge-tien-trinh.mjs --apply    # ghép rồi ghi đè TIEN-TRINH.md
 *
 * Quy tắc ghép: lấy thứ tự + nội dung của HEAD (nhánh đang làm); thêm mọi khối CHỈ có ở
 * origin/main — khối "SOÁT ĐỘC LẬP …" đặt ngay dưới khối đầu file, khối "SỔ TAY …" đặt cuối file
 * (đúng cách các phiên lô 034/039 đã làm).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const FILE = 'TIEN-TRINH.md';
const APPLY = process.argv.includes('--apply');

const stage = (n) => {
  try { return execSync(`git show :${n}:${FILE}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch { return null; }
};

/** Chia tệp thành các khối theo heading cấp 1 (dòng bắt đầu "# "), bỏ qua dòng trong fenced code. */
function blocks(text) {
  const lines = text.split('\n');
  const out = []; let cur = null; let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    if (!inFence && /^# /.test(line)) { cur = { head: line, lines: [line] }; out.push(cur); }
    else if (cur) cur.lines.push(line);
    else out.push({ head: '(đầu file — không có heading)', lines: [line] });
  }
  return out;
}

const oursText = stage(2); const theirsText = stage(3);
if (!oursText || !theirsText) {
  console.error('Không đọc được cả hai bên từ index git — chạy script này KHI ĐANG CONFLICT (git show :1: / :2: / :3:).');
  process.exit(1);
}
const ours = blocks(oursText); const theirs = blocks(theirsText);
const O = new Map(ours.map((b) => [b.head, b]));
const T = new Map(theirs.map((b) => [b.head, b]));

const onlyTheirs = [...T.keys()].filter((h) => !O.has(h));
const onlyOurs = [...O.keys()].filter((h) => !T.has(h));
console.log(`HEAD: ${ours.length} khối · origin/main: ${theirs.length} khối`);
console.log(`\nTHÊM từ origin/main (${onlyTheirs.length}):`);
onlyTheirs.forEach((h) => console.log('  +', h.slice(0, 100)));
console.log(`\nGIỮ của HEAD, main đã MẤT (${onlyOurs.length}):`);
onlyOurs.forEach((h) => console.log('  -', h.slice(0, 100)));

if (!APPLY) { console.log('\n(DRY-RUN) chạy lại với --apply để ghi.'); process.exit(0); }

const out = [ours[0]];                                   // khối đầu file
for (const h of onlyTheirs) {
  if (/^# SOÁT/.test(h)) out.push(T.get(h));             // soát → đặt ở đầu
}
out.push(...ours.slice(1));                               // toàn bộ khối của HEAD, giữ nguyên văn
for (const h of onlyTheirs) {
  if (!/^# SOÁT/.test(h)) out.push(T.get(h));             // soạn → đặt cuối file
}
const text = out.map((b) => b.lines.join('\n')).join('\n');
fs.writeFileSync(FILE, text, 'utf8');
console.log(`\nĐã ghép: ${ours.length} khối của HEAD + ${onlyTheirs.length} khối của origin/main = ${out.length} khối, ${text.length} ký tự.`);

// TỰ KIỂM: mọi khối của cả hai bên phải còn đủ nội dung (bỏ qua khác biệt dòng trống / '---').
const M = new Map(blocks(text).map((b) => [b.head, b.lines.join('\n')]));
let bad = 0;
for (const [name, src] of [['HEAD', ours], ['origin/main', theirs]]) {
  for (const b of src) {
    if (!M.has(b.head)) { console.log(`THIẾU khối (${name}): ${b.head.slice(0, 90)}`); bad++; continue; }
    const key = (s) => s.split('\n').map((x) => x.trim()).filter((x) => x !== '' && x !== '---').join('\n');
    if (key(b.lines.join('\n')) !== key(M.get(b.head))) {
      console.log(`KHÁC NỘI DUNG (${name}): ${b.head.slice(0, 90)} — bản đang giữ là của HEAD; `
        + `bản của ${name} khác → nếu bản đó có thêm thông tin, hãy gộp TAY vào khối này.`);
      bad++;
    }
  }
}
console.log(bad ? `SAI ${bad} chỗ — kiểm lại tay.` : `KIỂM OK: mọi khối của HEAD và origin/main đều còn đủ nội dung.`);
process.exit(bad ? 1 : 0);
