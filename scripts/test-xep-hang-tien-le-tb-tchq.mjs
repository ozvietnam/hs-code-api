#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-517 — kiểm chứng bản vá "MÃ TIỀN LỆ TB-TCHQ CHẮC CHẮN LÊN VỊ TRÍ 1".
 *
 * Bối cảnh: `kiemTruocChot` (lib/kiem-truoc-chot.js) đã tìm được mã tiền lệ có tên hàng khớp gần như TRÙNG KHÍT
 * (độ giống 1.0) nhưng `lib/engine-loop.js` luôn xếp mã AI chọn ở vị trí 1 ⇒ khách thấy mã SAI ở đầu danh sách.
 * Bản vá: mã tiền lệ CHẮC CHẮN (độ giống = 1.0 + ≥5 từ có nghĩa chung + ứng viên DUY NHẤT) lên vị trí 1, kèm nhãn
 * "theo tiền lệ TB-TCHQ" + evidence; KHÔNG bỏ qua cổng resolver / chotDong8 / luật "Loại khác".
 *
 * KỶ LUẬT OZV-581: mỗi bản vá PHẢI có ca âm — mô tả gần giống nhưng KHÔNG thuộc mã đó thì KHÔNG được đẩy lên vị trí 1.
 *
 * Cách dùng:  node scripts/test-xep-hang-tien-le-tb-tchq.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';

const { precedentsData } = require('../lib/data.js');
const llmTier = require('../lib/llm-tier.js');
const { classifyLoop } = require('../lib/engine-loop.js');
const K = require('../lib/kiem-truoc-chot.js');

const FIXTURE = join(ROOT, 'tests', 'bo-50-ca-tb-tchq.json');
const bo = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const cases = bo.cases || [];
const lay = cases.find((c) => c.stt === 9) || cases[0];

let pass = 0;
let fail = 0;
const ok = (ten, dk) => { if (dk) { pass += 1; console.log(`✓ ${ten}`); } else { fail += 1; console.error(`✗ ${ten}`); } };

// ── A. LUẬT: mức "chắc chắn" (lib/kiem-truoc-chot.js) ────────────────────────────────────────────────────────────
// Tiền lệ thật của mã đích (dữ liệu thật data/precedents.json — không dựng dữ liệu giả).
const tbCuaMa = (hs) => (Array.isArray(precedentsData[hs]) ? precedentsData[hs] : []);
const tenTienLe = (hs) => {
  const e = tbCuaMa(hs).find((x) => x && x.productName && String(x.productName).length >= 25);
  return e ? String(e.productName) : null;
};

// A1 (DƯƠNG) — mô tả hàng trùng khít với tên hàng trong tiền lệ ⇒ mã tiền lệ được coi là "chắc chắn".
const MA_DUNG = lay.ma;                       // đáp án của bộ đề (mã trong tiền lệ TB-TCHQ)
const TEN_TL = tenTienLe(MA_DUNG);
if (!TEN_TL) {
  ok('A1 dương: tìm được tiền lệ thật của mã đích', false);
} else {
  const hang = { tenHang: TEN_TL, moTa: TEN_TL };
  const kc = K.kiemTruocChot({ topHs: '32082090', hang, ungVien: [MA_DUNG] });
  const dx = kc.deXuat.find((d) => d.hs === MA_DUNG);
  ok('A1 dương: tiền lệ trùng khít được đề xuất', Boolean(dx));
  ok('A1 dương: cờ chacChan = true', dx?.chacChan === true);
  ok('A1 dương: độ giống = 1.0 (trùng khít)', dx?.diem === 1);
  ok('A1 dương: ≥5 từ có nghĩa chung', Number(dx?.chung || 0) >= 5);
}

// A2 (ÂM) — mô tả GẦN GIỐNG nhưng KHÔNG thuộc mã đó (cùng nhóm vật liệu, tiêu đề hàng khác) ⇒ KHÔNG đẩy lên vị trí 1.
// "nhựa epoxy biến tính, dạng lỏng" là mô tả của mã 3208 (nhựa tạo hình), KHÔNG phải mã sơn của tiền lệ.
const moTaGai = 'Nhựa epoxy biến tính ở dạng lỏng, không phải sơn phủ, dùng làm chất kết dính cho gỗ';
const kcAm = K.kiemTruocChot({ topHs: '32082090', hang: { tenHang: moTaGai, moTa: moTaGai }, ungVien: [MA_DUNG] });
ok('A2 âm: mô tả gần giống KHÔNG sinh đề xuất "chắc chắn" cho mã tiền lệ', !kcAm.deXuat.some((d) => d.hs === MA_DUNG && d.chacChan === true));

// A3 (ÂM) — mã AI đã chọn ĐÚNG là mã tiền lệ ⇒ không được "đổi" mã đang chốt (không đề xuất chính nó).
const kcChinhNo = K.kiemTruocChot({ topHs: MA_DUNG, hang: { tenHang: TEN_TL || '', moTa: TEN_TL || '' }, ungVien: [MA_DUNG] });
ok('A3 âm: mã đang chốt không bị đề xuất lại ("đề xuất chính nó")', !kcChinhNo.deXuat.some((d) => d.hs === MA_DUNG));

// ── B. ENGINE: vị trí trong `results` + nhãn khách thấy (lib/engine-loop.js) ────────────────────────────────────
/** Phát lại 1 ca qua classifyLoop với LLM stub tất định (giống scripts/benchmark-50-ca-tb-tchq.mjs). */
async function replayMotCa(ca, text) {
  const orig = llmTier.callLLMJson;
  const ma1211 = ca.cong1211?.maBot || null;
  const h4 = ma1211 ? ma1211.slice(0, 4) : '';
  const h6 = ma1211 ? ma1211.slice(0, 6) : '';
  const cau = text ?? ca.cauKhach;
  llmTier.callLLMJson = async (sys, _user, opts = {}) => {
    if (opts.step === 'understand' || String(sys || '').startsWith('VÒNG 1')) {
      return { json: { product: { nameVi: cau.slice(0, 160), purpose: '', mechanism: 'chưa rõ', material: '', evidence: {} }, hypotheses: ma1211 ? [{ chapter: h4.slice(0, 2), heading4: h4, subheading6: h6, why: 'replay', confidence: 80 }] : [], verify: { searchVi: [cau.slice(0, 80)], notesChapters: ma1211 ? [h4.slice(0, 2)] : [], codes8: ma1211 ? [ma1211] : [], micQuery: null, unknowns: [] } }, provider: 'stub-517', model: 'stub-517' };
    }
    return { json: { decision: 'DE_XUAT', hs: ma1211 || '847989', confidence: 80, reason: 'replay', gir: 'GIR 1', basis: [], conditions: [], alternatives: [], questions: [] }, provider: 'stub-517', model: 'stub-517' };
  };
  try {
    return await classifyLoop({ tenHang: cau }, { mic: false });
  } finally {
    llmTier.callLLMJson = orig;
  }
}

const outDuong = await replayMotCa(lay);
const rDung = outDuong.results?.[0];
ok('B1 dương: mã tiền lệ chắc chắn LÊN VỊ TRÍ 1', rDung?.hs === MA_DUNG);
ok('B1 dương: nhãn "theo tiền lệ TB-TCHQ" cho khách thấy căn cứ', /tiền lệ TB-TCHQ/i.test(String(rDung?.reason || '')));
ok('B1 dương: nguồn = kiem-truoc-chot:tien-le', rDung?.source === 'kiem-truoc-chot:tien-le');
ok('B1 dương: có evidence kèm theo', Array.isArray(rDung?.evidence) && rDung.evidence.length > 0);

// B2 (ÂM) — mô tả gần giống nhưng KHÔNG thuộc mã đó ⇒ KHÔNG được đẩy lên vị trí 1.
const outAm = await replayMotCa(lay, moTaGai);
const rAm = outAm.results?.[0];
ok('B2 âm: mô tả gần giống KHÔNG đẩy mã tiền lệ lên vị trí 1', rAm?.hs !== MA_DUNG);
ok('B2 âm: không mục nào mang nhãn xếp hạng theo tiền lệ', !(outAm.results || []).some((r) => r.xepHang === 'TIEN_LE_TB_TCHQ'));

// B3 (ÂM) — ca mà mã AI chọn ĐÃ ĐÚNG: không được đổi mã (không có mã tiền lệ "chắc chắn" nào được đẩy lên).
const layDung = cases.find((c) => c.stt === 1);
if (layDung) {
  const outDung = await replayMotCa(layDung);
  ok('B3 âm: ca mã AI đã đúng thì mã đầu giữ nguyên', outDung.results?.[0]?.hs === layDung.cong1211?.maBot);
  ok('B3 âm: ca mã AI đã đúng thì không mang nhãn xếp hạng theo tiền lệ', !(outDung.results || []).some((r) => r.xepHang === 'TIEN_LE_TB_TCHQ'));
}

console.log(`\n${pass} passed | ${fail} failed`);
process.exit(fail ? 1 : 0);
