#!/usr/bin/env node
/**
 * Kiểm tra chéo bản ghi tiền lệ do agent/cộng đồng nộp trong data/community/**.
 *
 * Kiểm KHÔNG cần mạng:
 *  - mã HS kết luận có tồn tại trong biểu thuế (data/tax.json) — 8 số phải là lá thật
 *  - số hiệu có dạng hợp lệ (NNNN/TB-TCHQ, NNNN/TB-CHQ, NNNN/TCHQ-TXNK, NNNN/CHQ-NVTHQ…)
 *  - cùng số hiệu mà kết luận 2 mã khác nhau cho CÙNG mô tả → nghi ngờ
 *  - description/reasonVi lặp nguyên văn giữa nhiều mã khác nhau → nghi ngờ
 *  - có url; url trùng số hiệu không (nếu url chứa số hiệu khác)
 *  - trùng với data/precedents.json (cùng số hiệu, khác mã) → nghi ngờ
 *
 * Kiểm CÓ mạng (--fetch N): mở ngẫu nhiên N url, tìm số hiệu + mã HS trong trang.
 *
 *   node scripts/audit-community-precedents.mjs [--dir data/community/tb-tchq] [--fetch 20]
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argValue = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const dirArg = argValue('--dir', 'data/community/tb-tchq');
const dir = dirArg.startsWith('/') ? dirArg : join(root, dirArg);
const fetchN = Number(argValue('--fetch', '0'));

const tax = JSON.parse(readFileSync(join(root, 'data/tax.json'), 'utf8'));
const taxRows = Array.isArray(tax) ? tax : (tax.items || tax.data || Object.values(tax));
const leaves = new Set();
const prefixes = new Set();
for (const r of taxRows) {
  const hs = String(r.hsCode || r.hs || r.code || '').replace(/\D/g, '');
  if (hs.length === 8) leaves.add(hs);
  if (hs.length >= 4) prefixes.add(hs.slice(0, 4));
}
const existing = JSON.parse(readFileSync(join(root, 'data/precedents.json'), 'utf8'));
const existingByRef = new Map();
for (const [hs, list] of Object.entries(existing)) for (const p of list || []) {
  const k = String(p.tbTchqNumber || '').replace(/\s+/g, '');
  if (!existingByRef.has(k)) existingByRef.set(k, new Map());
  existingByRef.get(k).set(hs, p.year || null);
}

const REF_RE = /^\d{1,6}\/(TB-TCHQ|TB-CHQ|TCHQ-TXNK|CHQ-NVTHQ|TCHQ-GSQL|TXNK-PL|TB-CTHQ|CHQ-TXNK)$/i;

function listFiles(d) {
  if (!existsSync(d)) return [];
  const out = [];
  for (const n of readdirSync(d)) {
    const f = join(d, n);
    if (statSync(f).isDirectory()) out.push(...listFiles(f));
    else if (n.endsWith('.json')) out.push(f);
  }
  return out;
}

const problems = [];
const warns = [];
const all = [];
for (const file of listFiles(dir)) {
  let doc;
  try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { problems.push(`${file}: JSON lỗi — ${e.message}`); continue; }
  if (doc.kind !== 'precedent') continue;
  const rel = file.slice(root.length + 1);
  (doc.records || []).forEach((r, i) => {
    const at = `${rel}#${i}`;
    const hs = String(r.hsCode || '');
    const ref = String(r.source?.reference || '').replace(/\s+/g, '');
    all.push({ at, hs, ref, url: r.source?.url, desc: r.description, reason: r.reasonVi, date: r.source?.issuedDate });
    if (hs.length === 8 && !leaves.has(hs)) problems.push(`${at}: mã ${hs} KHÔNG có trong biểu thuế`);
    if (hs.length < 8 && !prefixes.has(hs.slice(0, 4))) problems.push(`${at}: nhóm ${hs.slice(0, 4)} không có trong biểu thuế`);
    if (hs.length < 8) warns.push(`${at}: mã ${hs} chưa đủ 8 số`);
    if (!REF_RE.test(ref)) problems.push(`${at}: số hiệu lạ "${ref}"`);
    if (!r.source?.url) warns.push(`${at}: thiếu url`);
    else {
      const m = String(r.source.url).match(/(\d{3,6})[-_ ]?(tb[-_]?tchq|tb[-_]?chq|tchq[-_]?txnk)/i);
      if (m && !ref.startsWith(m[1] + '/')) warns.push(`${at}: url nói ${m[1]} nhưng reference là ${ref}`);
    }
    if (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(r.source?.issuedDate || ''))) {}
    // Số hiệu TB-TCHQ đánh lại từ đầu mỗi năm → chỉ nghi ngờ khi cùng năm (hoặc không rõ năm)
    if (existingByRef.has(ref) && !existingByRef.get(ref).has(hs)) {
      const year = Number(String(r.source?.issuedDate || '').slice(0, 4)) || null;
      const sameYear = [...existingByRef.get(ref).values()].some((y) => !y || !year || y === year);
      if (sameYear) warns.push(`${at}: ${ref} đã có trong precedents.json với mã ${[...existingByRef.get(ref).keys()].join(',')} — bản mới ghi ${hs} (cùng năm hoặc không rõ năm, cần xem)`);
    }
    if (/(công ty|cong ty|co\.,? ?ltd|tnhh|jsc|corporation|mã số thuế|mst[:\s]|tờ khai số)/i.test(`${r.description} ${r.reasonVi}`)) {
      problems.push(`${at}: có dấu hiệu tên doanh nghiệp/MST/số tờ khai`);
    }
  });
}

// Cùng số hiệu + cùng mô tả (chuẩn hoá) nhưng khác mã
const byRefDesc = new Map();
for (const r of all) {
  const k = `${r.ref}|${String(r.desc || '').toLowerCase().replace(/\s+/g, ' ')}`;
  if (!byRefDesc.has(k)) byRefDesc.set(k, new Set());
  byRefDesc.get(k).add(r.hs);
}
for (const [k, set] of byRefDesc) if (set.size > 1) problems.push(`cùng số hiệu+mô tả nhưng ${set.size} mã: ${k.slice(0, 90)} → ${[...set].join(',')}`);

// Mô tả lặp nguyên văn ở nhiều mã
const byDesc = new Map();
for (const r of all) {
  const k = String(r.desc || '').toLowerCase().replace(/\s+/g, ' ');
  if (!byDesc.has(k)) byDesc.set(k, new Set());
  byDesc.get(k).add(r.hs);
}
for (const [k, set] of byDesc) if (set.size > 2) warns.push(`mô tả lặp ở ${set.size} mã: "${k.slice(0, 70)}"`);

// Thống kê
const byFile = {};
for (const r of all) { const f = r.at.split('#')[0]; byFile[f] = (byFile[f] || 0) + 1; }
const refs = new Set(all.map((r) => r.ref));
const heads = {};
for (const r of all) { const h = r.hs.slice(0, 4); heads[h] = (heads[h] || 0) + 1; }
console.log('Tệp:', byFile);
console.log(`Bản ghi: ${all.length} · số hiệu khác nhau: ${refs.size} · nhóm 4 số: ${Object.keys(heads).length}`);
console.log('Nhóm nhiều nhất:', Object.entries(heads).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([h, n]) => `${h}:${n}`).join(' '));

if (fetchN > 0) {
  const pick = all.filter((r) => r.url).sort(() => Math.random() - 0.5).slice(0, fetchN);
  let ok = 0, bad = 0, unreach = 0;
  for (const r of pick) {
    try {
      const res = await fetch(r.url, { signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'Mozilla/5.0 (audit)' } });
      const html = (await res.text()).replace(/<[^>]+>/g, ' ');
      const refNum = r.ref.split('/')[0];
      const hasRef = new RegExp(`\\b${refNum}\\s*/\\s*(TB|TCHQ|CHQ)`, 'i').test(html) || html.includes(refNum);
      const hsDot = `${r.hs.slice(0, 4)}.${r.hs.slice(4, 6)}.${r.hs.slice(6, 8)}`;
      const hasHs = html.includes(r.hs) || html.includes(hsDot) || html.includes(`${r.hs.slice(0, 4)}.${r.hs.slice(4, 6)}`);
      if (res.status >= 400) { unreach += 1; console.log(`  ? ${res.status} ${r.at} ${r.url}`); }
      else if (hasRef && hasHs) { ok += 1; }
      else { bad += 1; console.log(`  ✗ ${r.at} ref=${hasRef} hs=${hasHs} ${r.ref} ${r.hs} ${r.url}`); }
    } catch (e) { unreach += 1; console.log(`  ? lỗi mạng ${r.at} ${r.url} ${e.message}`); }
  }
  console.log(`Kiểm mạng ${pick.length}: khớp ${ok} · không khớp ${bad} · không mở được ${unreach}`);
}

if (warns.length) { console.log(`\nCảnh báo (${warns.length}):`); for (const w of warns.slice(0, 80)) console.log('  ⚠', w); if (warns.length > 80) console.log(`  … ${warns.length - 80} nữa`); }
if (problems.length) { console.log(`\nLỗi (${problems.length}):`); for (const p of problems) console.log('  ✗', p); process.exit(1); }
console.log('\nKhông có lỗi cứng.');
