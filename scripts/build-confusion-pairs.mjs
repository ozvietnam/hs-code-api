#!/usr/bin/env node
/**
 * Gộp các tệp JSON do agent cấu trúc hoá (từ Drive của CEO) thành
 * data/confusion-pairs.json, chuẩn hoá và kiểm:
 *   - mã HS: bỏ đuôi ".xx", chỉ giữ chuỗi có 4/6/8 số; mã 8 số không còn trong
 *     biểu thuế hoặc nhóm không tồn tại → gắn `oldTariff: true` (giữ để đối chiếu,
 *     test đòi phải gắn cờ)
 *   - alias: bỏ dấu để so; loại alias quá chung (1 từ trong danh sách chặn)
 *   - trùng id → tệp sau ghi đè tệp trước, có báo
 *
 *   node scripts/build-confusion-pairs.mjs <in1.json> [in2.json …] [--out data/confusion-pairs.json]
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args[outIdx + 1] : join(root, 'data', 'confusion-pairs.json');
const inputs = args.filter((a, i) => a !== '--out' && !(outIdx >= 0 && i === outIdx + 1));
if (!inputs.length) {
  console.error('Cần ít nhất một tệp đầu vào.');
  process.exit(2);
}

const tax = JSON.parse(readFileSync(join(root, 'data', 'tax.json'), 'utf8'));
const leaves = Object.keys(tax).filter((k) => /^\d{8}$/.test(k));
const prefixes = new Set();
for (const k of leaves) {
  prefixes.add(k.slice(0, 4));
  prefixes.add(k.slice(0, 6));
  prefixes.add(k);
}

const GENERIC = new Set(['cam bien', 'sensor', 'may', 'van', 'valve', 'robot', 'motor', 'dong co', 'module', 'board', 'bo dieu khien', 'controller', 'may in', 'printer', 'camera', 'switch', 'cong tac', 'relay', 'ro le', 'pump', 'bom', 'may nen', 'compressor', 'thiet bi', 'device', 'linh kien', 'phu kien', 'actuator', 'drive', 'inverter', 'laser', 'led', 'cable', 'cap', 'may han', 'welding', 'may cat', 'cutting', 'lo', 'oven', 'furnace']);
const fold = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();

function normCode(code) {
  const raw = String(code || '').trim().replace(/\.?x+$/i, '').replace(/\.$/, '');
  const digits = raw.replace(/[^0-9]/g, '');
  if (![4, 6, 8].includes(digits.length)) return null;
  const dotted = digits.length === 4 ? digits : digits.length === 6 ? `${digits.slice(0, 4)}.${digits.slice(4)}` : `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
  return { dotted, digits, alive: prefixes.has(digits) };
}

// Ghi chú rà soát cho các mục nguồn ghi đáng ngờ — giữ nguyên dữ liệu nguồn, chỉ gắn cờ.
const REVIEW_NOTES = {
  'IN-01': 'Nguồn gán 8443.11 = offset sheet-fed; biểu thuế hiện hành 8443.11 là offset in cuộn (reel-fed), 8443.12 là sheet-fed văn phòng (khổ ≤ 22×36 cm), 8443.13 là offset khác. Cần sửa mã trước khi duyệt.',
  'IN-02': 'Nguồn gán 8443.12 = offset web-fed; biểu thuế hiện hành 8443.11 mới là reel-fed. Cần sửa mã trước khi duyệt.',
  'IN-11': 'Nguồn gán 8443.13 = in ống đồng (gravure); biểu thuế hiện hành gravure là 8443.17. Cần sửa mã trước khi duyệt.',
  'BV-12': 'Mã 8481 vừa ở mã đúng vừa ở mã hay nhầm (nguồn: actuator đi kèm van thì theo van). Cần CEO chốt điều kiện.',
  'RB-12': 'Mã 8709 vừa ở mã đúng vừa ở mã hay nhầm (nguồn: tuỳ phần di chuyển hay cánh tay là chính). Cần CEO chốt điều kiện.',
  'TN-11': 'Mã 8516.50 vừa ở mã đúng vừa ở mã hay nhầm (lò vi sóng gia dụng vs công nghiệp). Cần CEO chốt ngưỡng.',
  'DG-17': 'Mã 8423 vừa ở mã đúng vừa ở mã hay nhầm (cân + đóng gói: Note 4 Section XVI hay GIR 3(b)). Cần CEO chốt.',
  'RB-04': 'Mã 8421.21.22 theo CV 9381/CHQ-NVTHQ 2025 — đối chiếu lá hiện hành trước khi duyệt.',
};

const byId = new Map();
const problems = [];
let dropped = 0;
for (const file of inputs) {
  const arr = JSON.parse(readFileSync(file, 'utf8'));
  for (const raw of arr) {
    const id = String(raw.id || '').toUpperCase();
    if (!id) { problems.push(`${file}: entry thiếu id (${raw.nameVi})`); continue; }
    if (byId.has(id)) problems.push(`${id}: trùng, tệp ${file} ghi đè`);
    const deadCodes = [];
    const fix = (list) => (Array.isArray(list) ? list : []).map((c) => {
      const n = normCode(c);
      if (!n) { if (String(c || '').trim()) problems.push(`${id}: bỏ mã không hợp lệ "${c}"`); return null; }
      if (!n.alive) deadCodes.push(n.dotted);
      return n.dotted;
    }).filter(Boolean);
    const correctHs = [...new Set(fix(raw.correctHs))];
    const declaredHs = [...new Set(fix(raw.declaredHs))];
    // rules[].hs có thể là phương án kép của nguồn ("8537 / 8536 (tùy cấu tạo)") →
    // tách thành hsOptions; một mã → hs; không tách được → giữ nguyên văn ở hsNoteVi.
    const rules = (raw.rules || []).map((r) => {
      const rawHs = String(r.hs || '').trim();
      const parts = rawHs.replace(/\([^)]*\)/g, ' ').split(/[\/,;]|\s+hoặc\s+|\s+or\s+/i).map((x) => x.trim()).filter(Boolean);
      const codes = parts.map((x) => normCode(x)).filter(Boolean);
      for (const c of codes) if (!c.alive) deadCodes.push(c.dotted);
      const out = { ifVi: r.ifVi, hs: codes.length === 1 ? codes[0].dotted : null };
      if (codes.length > 1) out.hsOptions = [...new Set(codes.map((c) => c.dotted))];
      if (rawHs && !codes.length) out.hsNoteVi = rawHs;
      else if (/\(/.test(rawHs)) out.hsNoteVi = rawHs;
      return out;
    }).filter((r) => r.ifVi);
    const aliasesIn = [...new Set((raw.aliases || []).map((a) => String(a).trim().toLowerCase()).filter(Boolean))];
    const aliases = aliasesIn.filter((a) => {
      const f = fold(a);
      const ok = f.length >= 4 && !GENERIC.has(f) && f.split(' ').length <= 8;
      if (!ok) dropped += 1;
      return ok;
    });
    if (!aliases.length) problems.push(`${id}: không còn alias nào sau lọc`);
    if (!correctHs.length && !raw.legalBasisVi) problems.push(`${id}: correctHs rỗng và không có legalBasisVi`);
    const entry = {
      id,
      origin: raw.origin || 'grok',
      group: raw.group || 'khac',
      nameVi: raw.nameVi,
      nameEn: raw.nameEn || null,
      aliases,
      chapters: [...new Set([...(raw.chapters || []), ...correctHs.map((c) => c.slice(0, 2)), ...declaredHs.map((c) => c.slice(0, 2))])].sort(),
      correctHs,
      declaredHs,
      essenceTestVi: raw.essenceTestVi || null,
      rules,
      whyMisdeclaredVi: raw.whyMisdeclaredVi || null,
      deliberateVi: raw.deliberateVi || null,
      girRule: raw.girRule || null,
      legalBasisVi: raw.legalBasisVi || null,
      sourceRefs: (raw.sourceRefs || []).filter((r) => r && r.reference),
      warningVi: raw.warningVi || null,
      relatedIds: (raw.relatedIds || []).map((x) => String(x).toUpperCase()),
      examples: raw.examples || [],
      ...(deadCodes.length ? { oldTariff: true, oldTariffCodes: [...new Set(deadCodes)] } : {}),
      ...(REVIEW_NOTES[id] ? { needsReview: true, reviewNoteVi: REVIEW_NOTES[id] } : {}),
      verified: Boolean(raw.verified),
    };
    byId.set(id, entry);
  }
}

const entries = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
const groups = {
  'cam-bien-do-luong': 'Cảm biến & đo lường',
  'motor-drive-servo': 'Motor / drive / servo / biến tần',
  'board-module-hmi': 'Board / module / HMI / màn hình',
  'bom-van-may-nen': 'Bơm / van / máy nén',
  'robot-agv': 'Robot / AGV / máy tự động',
  'dien-cong-tac-nguon': 'Điện: công tắc / contactor / nguồn / cáp / LED / camera',
  'may-cong-cu': 'Máy công cụ (ch.84)',
  'thiet-bi-quang': 'Thiết bị quang (ch.90)',
  'may-in': 'Máy in & in ấn',
  'thiet-bi-nhiet': 'Thiết bị nhiệt: làm nóng / làm lạnh',
  'may-dong-goi': 'Máy đóng gói',
  khac: 'Khác',
};
const out = {
  version: new Date().toISOString().slice(0, 10),
  noteVi:
    'Từ điển mâu thuẫn HS: mặt hàng doanh nghiệp hay khai mã A, Hải quan hay ấn định mã B, kèm tiêu chí phân biệt. ' +
    'CEO soạn cùng Grok (Drive: HS_Mau_Thuan_Reports_2026/MASTER_Tu_Dien_Mau_Thuan_HS_System, TU_DIEN_MAU_THUAN_HS_MOT_FILE.md), ' +
    'nhập bằng scripts/build-confusion-pairs.mjs. Mọi mục verified:false cho tới khi CEO duyệt; mục oldTariff:true có mã theo biểu thuế cũ, cần đối chiếu. ' +
    'Trường girRule chỉ là trích dẫn của nguồn, KHÔNG phải determination — mọi trích dẫn GIR chính thức đi qua lib/gir.js.',
  sources: ['grok-mt: 50 báo cáo chi tiết MT-001…MT-050 (08/2026–09/2026)', 'grok-deep: 150 cặp theo 11 nhóm ngành (Tu_Dien_Mau_Thuan_HS_Master_RAG.csv, 19/08/2026)'],
  groups,
  entries,
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
const old = entries.filter((e) => e.oldTariff);
console.log(`Ghi ${outPath}: ${entries.length} mục · alias bỏ ${dropped} · mã cũ ${old.length} mục (${old.map((e) => e.id).join(' ')})`);
if (problems.length) {
  console.log(`\nLưu ý (${problems.length}):`);
  for (const p of problems) console.log('  -', p);
}
