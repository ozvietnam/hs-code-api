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

// A4 (DƯƠNG) — cờ của PR này KHÔNG bị mất khi ghép với phần chuẩn hoá mã gộp của #1268.
// Bối cảnh: tiền lệ TB-TCHQ kết luận mã ĐÃ BỊ GỘP (mã chết) vẫn là bằng chứng cho mã sống sau khi gộp. Khi ghép
// #1268 (chuẩn hoá mã gộp) với #1269 (cờ chacChan/diem/chung/soTienLe), nhánh "mã chết" trong `tienLeGiongTheoMa`
// có thể bị bỏ sót `bestChung` ⇒ cờ `chung` = 0 ⇒ `chacChan` = false ⇒ mã tiền lệ CHẮC CHẮN không lên được vị trí 1.
// Ca này dùng DỮ LIỆU THẬT (data/precedents.json — tiền lệ của mã đã bị gộp), không dựng dữ liệu giả.
const db = require('../lib/data.js').precedentsData || {};
const rawChet = require('../lib/data.js').precedentsMaChetDaGop || [];
const listChet = Array.isArray(rawChet) ? rawChet : Object.values(rawChet).flat();
const TREE = require('../lib/hs-tree.js');
const { doGiongTenHang } = require('../lib/giong-ten-hang.js');
/** TB sống của mã hs có khớp trùng khít với mô tả không (để chọn ca "chỉ khớp qua TB chết"). */
const coTbSongKhop = (hs, hang) => (db[hs] || []).some((x) => {
  if (!x || !x.productName) return false;
  const g = doGiongTenHang(hang, x.productName);
  return g.giong && g.diem === 1 && g.chung >= 5;
});
let caChet = null;
for (const e of listChet) {
  const hs = String(e.maSong || '');
  if (!/^[0-9]{8}$/.test(hs) || !e.productName || !TREE.nodeOf(hs)) continue;
  const hang = { tenHang: e.productName, moTa: e.productName };
  const g = doGiongTenHang(hang, e.productName);
  if (!g.giong || g.diem !== 1 || g.chung < 5) continue;
  if (coTbSongKhop(hs, hang)) continue;              // đã có TB sống khớp ⇒ không chứng minh được lỗi mất cờ
  caChet = { hs, e, g };
  break;
}
if (!caChet) {
  ok('A4 dương: tìm được tiền lệ THẬT của mã đã bị gộp (mô tả chỉ khớp qua TB chết)', false);
} else {
  const hangChet = { tenHang: caChet.e.productName, moTa: caChet.e.productName };
  const kcChet = K.kiemTruocChot({ topHs: '42029190', hang: hangChet, ungVien: [caChet.hs] });
  const dxChet = kcChet.deXuat.find((d) => d.hs === caChet.hs);
  ok('A4 dương: mã sống (sau khi gộp) vẫn được đề xuất từ tiền lệ của mã đã bị gộp', Boolean(dxChet));
  ok('A4 dương: cờ diem = 1 (trùng khít) không bị mất', dxChet?.diem === 1);
  ok('A4 dương: cờ chung = số từ chung THẬT của TB (không rơi về 0)', dxChet?.chung === caChet.g.chung);
  ok('A4 dương: cờ chacChan = true (tiền lệ chắc chắn lên được vị trí 1)', dxChet?.chacChan === true);
  ok('A4 dương: cờ soTienLe có số hiệu TB', Boolean(dxChet?.soTienLe));
  ok('A4 dương: nhãn mã đã bị gộp vẫn còn (không mất dấu vết #1268)', dxChet?.maDaBietGop === true);
}

// A5 (ÂM) — luật "Loại khác" của #725-46 CÓ HIỆU LỰC với mã sắp chốt ⇒ KHÔNG được đôn mã tiền lệ lên vị trí 1 (ý (5)).
// Bối cảnh: #725-46 quy định khi mã chốt là "Loại khác" mà mô tả khớp dòng/tiêu đề bị trừ thì KHÔNG CHOT mà hạ DE_XUAT +
// bật cờ chuyên viên (hành vi "cần hỏi"). Đôn mã tiền lệ ở đây sẽ LẠI mất đúng hành vi "cần hỏi" đó ⇒ ứng viên vẫn được
// ĐỀ XUẤT ở vị trí 2 (mã đề xuất xem), nhưng KHÔNG được đôn lên vị trí 1.
// Ca này dùng DỮ LIỆU THẬT (data/precedents.json + cây HS), không dựng dữ liệu giả. Test tự KIỂM CHỨNG LẠI tiền đề
// (mã chốt là "Loại khác" + luật có hiệu lực + ứng viên trùng khít) trước khi kết luận ⇒ dữ liệu đổi thì test ĐỎ, không đoán.
const tenTB = (hs) => {
  const e = tbCuaMa(hs).find((x) => x && x.productName && String(x.productName).length >= 25);
  return e ? String(e.productName) : null;
};
const laLoaiKhac = (hs) => Boolean(TREE.nodeOf(hs)?.loaiKhac);
// Cặp ca THẬT tìm được trên data/precedents.json (2026-11-13): mã chốt 15179090 ("Loại khác", luật "Loại khác" có
// hiệu lực với mô tả này) + ứng viên 34039919 có TB tên hàng khớp TRÙNG KHÍT.
let caA5 = null;
for (const [lk, x] of [['15179090', '34039919']]) {
  const tn = tenTB(x);
  if (!tn || !laLoaiKhac(lk)) continue;
  const g = doGiongTenHang({ tenHang: tn, moTa: tn }, tn);
  if (!g.giong || g.diem !== 1 || g.chung < 5) continue;
  if (!K.luatLoaiKhac(lk, { tenHang: tn, moTa: tn }).length) continue;   // luật "Loại khác" phải CÓ hiệu lực
  caA5 = { lk, x, hang: tn };
  break;
}
if (!caA5) {
  ok('A5 âm: tìm được ca THẬT (mã chốt "Loại khác" + luật có hiệu lực + ứng viên trùng khít)', false);
} else {
  const hangA5 = { tenHang: caA5.hang, moTa: caA5.hang };
  const kcLK = K.kiemTruocChot({ topHs: caA5.lk, hang: hangA5, ungVien: [caA5.x] });
  const dxLK = kcLK.deXuat.find((d) => d.hs === caA5.x);
  ok('A5 âm: tìm được ca THẬT (mã chốt "Loại khác" + luật có hiệu lực + ứng viên trùng khít)', true);
  ok('A5 âm: luật "Loại khác" của #725-46 CÓ bắn (ma NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU)', kcLK.canhBao.some((c) => c.ma === 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU'));
  ok('A5 âm: ứng viên TRÙNG KHÍT (độ giống = 1.0)', dxLK?.diem === 1);
  ok('A5 âm: ứng viên ≥5 từ chung', Number(dxLK?.chung || 0) >= 5);
  ok('A5 âm: KHÔNG gắn cờ "chắc chắn" ⇒ KHÔNG đôn lên vị trí 1', dxLK?.chacChan !== true);
  ok('A5 âm: ứng viên VẪN được đề xuất ở vị trí sau (giữ hành vi "cần hỏi" của #725-46)', Boolean(dxLK));
  // ĐO HAI CHIỀU (cùng cặp mã + cùng mô tả): gọi THẲNG `tienLeNguoc` với mặc định (KHÔNG khoá cờ) ⇒ cùng ứng viên đó
  // ĐỦ điều kiện "chắc chắn" ⇒ chứng minh khác biệt CHỈ do luật "Loại khác" của #725-46, KHÔNG phải do khớp yếu hay dữ liệu.
  // (Tắt guard trong `kiemTruocChot` ⇒ cờ bật ⇒ ca "KHÔNG gắn cờ" ở trên ĐỎ ⇒ ca này bắt được đúng lỗi.)
  const nguocMacDinh = K.tienLeNguoc(caA5.lk, [caA5.x], hangA5);
  const dxMacDinh = nguocMacDinh.find((d) => d.hs === caA5.x);
  ok('A5 đo hai chiều: cùng cặp mã/mô tả, KHÔNG khoá cờ ⇒ ứng viên ĐỦ điều kiện "chắc chắn"', dxMacDinh?.chacChan === true);
  // ĐO HAI CHIỒU: cùng ứng viên + cùng mô tả, nhưng mã chốt KHÔNG có luật "Loại khác" hiệu lực ⇒ PHẢI đủ điều kiện đôn.
  // ⇒ chứng minh khác biệt đến từ luật "Loại khác", không phải từ dữ liệu/khớp yếu.
  const topKhongLK = Object.keys(db).find((hs) => {
    if (hs === caA5.lk || hs === caA5.x || !TREE.nodeOf(hs)) return false;
    if (laLoaiKhac(hs) || TREE.nodeOf(hs)?.parent === TREE.nodeOf(caA5.x)?.parent) return false;
    if (K.luatLoaiKhac(hs, hangA5).length) return false;
    if (tbCuaMa(hs).some((e) => { const gg = doGiongTenHang(hangA5, e.productName); return gg.giong && gg.diem >= 1; })) return false;
    // mã chốt này phải THỰC SỰ cho ứng viên x đủ điều kiện đôn (đó là ý nghĩa của "đo hai chiều")
    const d = K.kiemTruocChot({ topHs: hs, hang: hangA5, ungVien: [caA5.x] }).deXuat.find((q) => q.hs === caA5.x);
    return d?.chacChan === true;
  });
  if (!topKhongLK) {
    ok('A5 đo hai chiều: tìm được mã chốt KHÔNG có luật "Loại khác" để so sánh', false);
  } else {
    const kcKhongLK = K.kiemTruocChot({ topHs: topKhongLK, hang: hangA5, ungVien: [caA5.x] });
    const dxKhongLK = kcKhongLK.deXuat.find((d) => d.hs === caA5.x);
    ok('A5 đo hai chiều: tìm được mã chốt KHÔNG có luật "Loại khác" để so sánh', true);
    ok('A5 đo hai chiều: cùng ứng viên + cùng mô tả, không có luật "Loại khác" ⇒ ĐỦ điều kiện đôn', dxKhongLK?.chacChan === true);
  }
}

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

// ── C. ENGINE: cảnh báo/dự xuất phải bám mã ĐANG Ở VỊ TRÍ 1 (ý CHẶN (1) của GĐ 13/11) ───────────────────────────
// Bối cảnh: `kiemChot` được tính cho mã CŨ (mã máy chốt) ở dòng ~974. Khi mã tiền lệ `chacChan` được đôn lên vị trí 1,
// mã ở vị trí 1 đã đổi ⇒ cảnh báo/dự xuất bám mã CŨ là CĂN CỨ SAI (đây là bằng chứng đưa cho Hải quan).
// Bản vá: đã đôn mã thì LUÔN tính lại `kiemChot` cho mã đang ở vị trí 1.
const MA_CU = lay.cong1211?.maBot || '32082090';
// fmt8 (lib/kiem-truoc-chot.js) in mã theo dạng có dấu chấm: "3208.20.90" — so khớp phải dùng đúng dạng đó.
const cham8 = (h) => String(h).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3');
const MA_CU_CHAM = cham8(MA_CU);
const reasonsC = outDuong.review?.reasons || [];
ok('C1 âm: sau khi đôn mã, cảnh báo KHÔNG bám mã CŨ (không có "máy chốt <mã cũ>")', !reasonsC.some((r) => new RegExp(`máy chốt\\s+${MA_CU_CHAM.replace(/\./g, '\\.')}\\b`).test(String(r))));
ok('C2 âm: sau khi đôn mã, không còn cảnh báo "Tiền lệ cùng loại hàng ngược kết luận" bám mã CŨ', !reasonsC.some((r) => /Tiền lệ cùng loại hàng ngược kết luận/.test(String(r)) && String(r).includes(MA_CU_CHAM)));
// ĐO HAI CHIỀU: `kiemChot` tính cho MÃ CŨ (trước khi đôn) CÓ đúng cảnh báo đó ⇒ chứng minh cảnh báo là thật,
// chỉ là bám SAI mã sau khi đôn (có bằng chứng trước/sau trên cùng dữ liệu thật).
const kcCu = K.kiemTruocChot({ topHs: MA_CU, hang: { tenHang: TEN_TL || '', moTa: TEN_TL || '' }, ungVien: [MA_DUNG] });
const canhBaoCu = kcCu.canhBao.find((c) => /Tiền lệ cùng loại hàng ngược kết luận/.test(c.noiDung || ''));
ok('C3 dương: cảnh báo CÓ THẬT ở mã CŨ (nên "biến mất" là do tính lại cho mã mới, không phải do rơi mất)', Boolean(canhBaoCu));
const MA_DUNG_CHAM = String(MA_DUNG).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3'); // fmt8 (dấu chấm)
ok('C4 dương: cảnh báo ở mã CŨ nói đúng mã đang được đôn lên vị trí 1', String(canhBaoCu?.noiDung || '').includes(MA_DUNG_CHAM));

/** Rút toàn bộ mã HS 8 số (dạng có chấm 1234.56.78 hoặc liền 12345678) xuất hiện trong mảng `evidence`. */
const ma8TrongEvidence = (ev) => {
  const ds = Array.isArray(ev) ? ev : [];
  const out = [];
  for (const s of ds) {
    for (const m of String(s || '').matchAll(/\b(\d{4})\.(\d{2})\.(\d{2})\b|\b(\d{8})\b/g)) {
      out.push(m[4] || `${m[1]}${m[2]}${m[3]}`);
    }
  }
  return [...new Set(out)];
};
ok(
  'C5 âm: results[0].evidence của ca đôn mã CHỈ chứa đúng mã được đôn (không chứa mã cũ hay mã mồi nào khác)',
  JSON.stringify(ma8TrongEvidence(rDung?.evidence)) === JSON.stringify([MA_DUNG])
    && !(rDung?.evidence || []).some((s) => /mã máy chốt/i.test(String(s))),
);

// ── D. OZV-822: 3 CA TRƯỢT A1 (stt 4: 27101990, stt 6: 32064990, stt 18: 60064490) + CA ÂM ĐỐI CHỨNG (OZV-581) ───
// D1 — Ca stt 18 (60064490, 4940/TB-TCHQ): hai tiền lệ trùng 10 từ mở đầu ("Vải dệt kim sợi ngang weft knitted...")
// nhưng khác thành phần % sợi (59% visco / 37% polyester / 4% polyurethane vs 95,2% polyester / 4,8% polyurethane).
{
  const ca18 = cases.find((c) => c.stt === 18);
  const hang18 = { tenHang: ca18.cauKhach, moTa: ca18.cauKhach };
  const kc18 = K.kiemTruocChot({ topHs: '60064290', hang: hang18, ungVien: ['60064290', '60064490', '60063490', '60041010'] });
  const dx4490 = kc18.deXuat.find((d) => d.hs === '60064490');
  const dx3490 = kc18.deXuat.find((d) => d.hs === '60063490');
  ok('D1 dương (stt 18): kiemTruocChot gắn chacChan = true cho 60064490 (4940/TB-TCHQ khớp đúng 59% visco, 37% polyester, 4% polyurethane)', dx4490?.chacChan === true);
  ok('D1 âm (stt 18): 60063490 (598/TB-TCHQ: 95,2% polyester, 4,8% polyurethane) KHÔNG được gắn chacChan = true', dx3490?.chacChan !== true);

  // D1 âm đối chứng 1: vải 95,2% polyester và 4,8% polyurethane (thuộc 60063490) → chỉ 60063490 chacChan, KHÔNG đôn 60064490
  const moTaPoly = 'Vải dệt kim sợi ngang (weft knitted fabric) thành phần 95,2% polyester và 4,8% polyurethane, đã in, bề mặt chưa tráng phủ hay ngâm tẩm, trọng lượng 170 g/m2, dạng cuộn';
  const kcPoly = K.kiemTruocChot({ topHs: '60064290', hang: { tenHang: moTaPoly, moTa: moTaPoly }, ungVien: ['60064290', '60064490', '60063490'] });
  ok('D1 âm đối chứng 1: vải 95,2% polyester / 4,8% polyurethane → 60064490 KHÔNG chacChan, 60063490 chacChan = true', kcPoly.deXuat.find((d) => d.hs === '60064490')?.chacChan !== true && kcPoly.deXuat.find((d) => d.hs === '60063490')?.chacChan === true);

  // D1 âm đối chứng 2: vải 100% bông (cotton, thuộc 6006.24) dù có cùng cụm mở đầu "Vải dệt kim sợi ngang (weft knitted fabric) thành phần" → KHÔNG mã nào trong 60064490/60063490 được chacChan
  const moTaCotton = 'Vải dệt kim sợi ngang (weft knitted fabric) thành phần 100% xơ bông (cotton), đã in một mặt, dạng cuộn';
  const kcCotton = K.kiemTruocChot({ topHs: '60064290', hang: { tenHang: moTaCotton, moTa: moTaCotton }, ungVien: ['60064290', '60064490', '60063490'] });
  ok('D1 âm đối chứng 2: vải 100% bông (cotton) → KHÔNG gắn chacChan cho 60064490 hay 60063490', !kcCotton.deXuat.some((d) => d.chacChan === true));

  // D1 âm đối chứng 3: vải bông không ghi số % ("thành phần xơ bông cotton") → diemMoRong < 0.7 → cũng KHÔNG gắn chacChan cho 60064490
  const moTaCottonKhongSo = 'Vải dệt kim sợi ngang (weft knitted fabric) thành phần xơ bông (cotton), đã in một mặt, dạng cuộn';
  const kcCottonKhongSo = K.kiemTruocChot({ topHs: '60064290', hang: { tenHang: moTaCottonKhongSo, moTa: moTaCottonKhongSo }, ungVien: ['60064290', '60064490', '60063490'] });
  ok('D1 âm đối chứng 3: vải bông không ghi % → KHÔNG gắn chacChan cho 60064490 hay 60063490', !kcCottonKhongSo.deXuat.some((d) => d.chacChan === true));

  // D1 qua classifyLoop với đúng hồ sơ Vòng 1 & Vòng 2 của ca 18 (AI chọn nhầm 60064290) → đôn 60064490 lên vị trí 1
  const out18 = await (async () => {
    const orig = llmTier.callLLMJson;
    llmTier.callLLMJson = async (sys, _user, opts = {}) => {
      if (opts.step === 'understand' || String(sys || '').startsWith('VÒNG 1')) {
        return {
          json: {
            product: { nameVi: 'Vải dệt kim sợi ngang in một mặt từ xơ visco, polyester và polyurethane', purpose: 'May mặc', mechanism: 'không áp dụng', material: '59% xơ staple visco, 37% filament polyester, 4% sợi đàn hồi polyurethane', evidence: {} },
            hypotheses: [{ chapter: '60', heading4: '6006', subheading6: '600642', why: 'visco chiếm ưu thế', confidence: 90 }, { chapter: '60', heading4: '6004', subheading6: '600410', why: 'có đàn hồi', confidence: 50 }],
            verify: { searchVi: ['vải dệt kim sợi ngang'], notesChapters: ['60'], codes8: ['60064290', '60063290', '60041010'], micQuery: null, unknowns: [] },
          },
          provider: 'stub-822', model: 'stub-822',
        };
      }
      return {
        json: {
          decision: 'DE_XUAT', hs: '60064290', confidence: 80, reason: 'AI chọn nhầm 6006.42 (nhuộm) thay vì 6006.44 (đã in)', gir: 'GIR 1',
          basis: [], conditions: [], alternatives: [{ hs: '60041010', whyNot: '4% polyurethane < 5%' }, { hs: '60063290', whyNot: 'visco 59% > polyester 37%' }], questions: [],
        },
        provider: 'stub-822', model: 'stub-822',
      };
    };
    try { return await classifyLoop({ tenHang: ca18.cauKhach }, { mic: false }); } finally { llmTier.callLLMJson = orig; }
  })();
  ok('D1 engine (stt 18): classifyLoop đôn 60064490 lên vị trí 1, status = REVIEW', out18.status === 'REVIEW' && out18.results?.[0]?.hs === '60064490' && out18.results?.[0]?.xepHang === 'TIEN_LE_TB_TCHQ');
  ok(
    'D1 evidence (stt 18): results[0].evidence CHỈ chứa mã 60064490, KHÔNG chứa 60064290 hay mã mồi nào khác',
    JSON.stringify(ma8TrongEvidence(out18.results?.[0]?.evidence)) === JSON.stringify(['60064490'])
      && !(out18.results?.[0]?.evidence || []).some((s) => /mã máy chốt/i.test(String(s))),
  );
}

// D2 — Ca stt 6 (32064990, 554/TB-TCHQ): Vòng 2 trả decision="HOI" + mã 6 số "760310" trong khi poolCodes có 32064990 trùng khít chắc chắn.
{
  const ca6 = cases.find((c) => c.stt === 6);
  // Kiểm trực tiếp đường vào tường minh "không có mã dẫn" (`topHs: null`) của `kiemTruocChot`:
  const kcKhongTop = K.kiemTruocChot({ topHs: null, hang: { tenHang: ca6.cauKhach, moTa: ca6.cauKhach }, ungVien: ['32064990', '76031000', '76032020'] });
  const dxKhongTop = kcKhongTop.deXuat.find((d) => d.hs === '32064990');
  ok(
    'D2 đường vào topHs: null: kiemTruocChot nhận diện 32064990 chacChan = true mà không cần mã mồi, canhBao rỗng, evidence chỉ chứa 32064990',
    dxKhongTop?.chacChan === true
      && kcKhongTop.canhBao.length === 0
      && JSON.stringify(ma8TrongEvidence(dxKhongTop?.evidence)) === JSON.stringify(['32064990']),
  );

  const chayCa6 = async (cau) => {
    const orig = llmTier.callLLMJson;
    llmTier.callLLMJson = async (sys, _user, opts = {}) => {
      if (opts.step === 'understand' || String(sys || '').startsWith('VÒNG 1')) {
        return {
          json: {
            product: { nameVi: 'Bột nhôm', purpose: 'Dùng làm chất màu vô cơ', mechanism: 'không áp dụng', material: 'Nhôm', evidence: {} },
            hypotheses: [{ chapter: '76', heading4: '7603', subheading6: '760310', why: 'bột nhôm chương 76', confidence: 100 }],
            verify: { searchVi: ['bột nhôm', 'chất màu bột nhôm'], notesChapters: ['76'], codes8: ['76031000', '76032020'], micQuery: null, unknowns: [] },
          },
          provider: 'stub-822', model: 'stub-822',
        };
      }
      return {
        json: {
          decision: 'HOI', hs: '760310', confidence: 50, reason: 'Chưa rõ bột có cấu trúc lớp hay không', gir: 'GIR 1',
          basis: [], conditions: [], alternatives: [{ hs: '76032020', whyNot: 'Chưa rõ cấu trúc lớp' }],
          questions: [{ fact: 'cấu trúc lớp', question: 'Bột nhôm có cấu trúc lớp hay không?', whereToFind: 'COA/MSDS' }],
        },
        provider: 'stub-822', model: 'stub-822',
      };
    };
    try { return await classifyLoop({ tenHang: cau }, { mic: false }); } finally { llmTier.callLLMJson = orig; }
  };

  const out6Duong = await chayCa6(ca6.cauKhach);
  ok('D2 dương (stt 6): khi R2 dừng ở 6 số 760310 (HOI) nhưng có 32064990 (554/TB-TCHQ) trùng khít chắc chắn → đôn 32064990 lên vị trí 1', out6Duong.results?.[0]?.hs === '32064990' && out6Duong.results?.[0]?.xepHang === 'TIEN_LE_TB_TCHQ');
  ok('D2 dương (stt 6): status chuyển sang REVIEW (không còn NEED_FACTS làm B1b chạy đè)', out6Duong.status === 'REVIEW' && out6Duong.review?.needed === true);
  ok(
    'D2 evidence (stt 6): results[0].evidence CHỈ chứa mã 32064990, KHÔNG chứa mã mồi 01012100/97069000 hay mã nào khác',
    JSON.stringify(ma8TrongEvidence(out6Duong.results?.[0]?.evidence)) === JSON.stringify(['32064990'])
      && !(out6Duong.results?.[0]?.evidence || []).some((s) => /mã máy chốt|0101\.21\.00|9706\.90\.00/i.test(String(s))),
  );

  // D2 âm đối chứng: bột nhôm nguyên chất dùng trong luyện kim (không phải chất màu vô cơ nhão của 554/TB-TCHQ) → giữ nguyên NEED_FACTS ở 760310
  const out6Am = await chayCa6('Bột nhôm nguyên chất 99,7% dùng trong luyện kim và hàn nhiệt nhôm, chưa rõ cấu trúc lớp hay không');
  ok('D2 âm đối chứng: bột nhôm luyện kim không khớp tiền lệ 554/TB-TCHQ → giữ nguyên NEED_FACTS, mã đầu 760310', out6Am.status === 'NEED_FACTS' && out6Am.results?.[0]?.hs === '760310' && !(out6Am.results || []).some((r) => r.xepHang === 'TIEN_LE_TB_TCHQ'));
}

// D3 — Ca stt 4 (27101990, 4935/TB-TCHQ): Vòng 1 đã khoanh đúng nhóm 2710 (codes8: 27101980, 27101990), nhưng Vòng 2 & 3 trả hs="" (MA_KHONG_TON_TAI).
{
  const ca4 = cases.find((c) => c.stt === 4);
  const chayCa4 = async (cau, hsR2 = '') => {
    const orig = llmTier.callLLMJson;
    llmTier.callLLMJson = async (sys, _user, opts = {}) => {
      if (opts.step === 'understand' || String(sys || '').startsWith('VÒNG 1')) {
        return {
          json: {
            product: { nameVi: 'Dầu cắt gọt', purpose: 'Gia công kim loại', mechanism: 'không áp dụng', material: 'dầu khoáng có nguồn gốc từ dầu mỏ', evidence: {} },
            hypotheses: [{ chapter: '27', heading4: '2710', subheading6: '271019', why: 'dầu cắt gọt chứa >= 70% dầu mỏ', confidence: 95 }],
            verify: { searchVi: ['dầu cắt gọt'], notesChapters: ['27'], codes8: ['27101980', '27101990'], micQuery: null, unknowns: [] },
          },
          provider: 'stub-822', model: 'stub-822',
        };
      }
      return {
        json: { decision: hsR2 ? 'CHOT' : '', hs: hsR2, confidence: hsR2 ? 80 : 0, reason: '', gir: '', basis: [], conditions: [], alternatives: [], questions: [] },
        provider: 'stub-822', model: 'stub-822',
      };
    };
    try { return await classifyLoop({ tenHang: cau }, { mic: false, debug: true }); } finally { llmTier.callLLMJson = orig; }
  };

  const out4Duong = await chayCa4(ca4.cauKhach);
  ok('D3 dương (stt 4): khi R2/R3 trả hs="" nhưng nhóm 2710 đã ở Vòng 1 và 27101990 (4935/TB-TCHQ) trùng khít chắc chắn → đôn 27101990 lên vị trí 1', out4Duong.results?.[0]?.hs === '27101990' && out4Duong.results?.[0]?.xepHang === 'TIEN_LE_TB_TCHQ');
  ok('D3 dương (stt 4): status = REVIEW và review.needed = true (không còn NEEDS_EXPERT / LLM_REJECTED rỗng)', out4Duong.status === 'REVIEW' && out4Duong.review?.needed === true);
  ok(
    'D3 evidence (stt 4): results[0].evidence CHỈ chứa mã 27101990, KHÔNG chứa mã mồi 01012100/97069000 hay mã nào khác',
    JSON.stringify(ma8TrongEvidence(out4Duong.results?.[0]?.evidence)) === JSON.stringify(['27101990'])
      && !(out4Duong.results?.[0]?.evidence || []).some((s) => /mã máy chốt|0101\.21\.00|9706\.90\.00/i.test(String(s))),
  );

  // D3 âm đối chứng 1: mô tả dầu bôi trơn tổng hợp PAO hàng không (không khớp trùng khít 4935/TB-TCHQ) khi R2/R3 trả hs="" → giữ nguyên NEEDS_EXPERT (LLM_REJECTED), results rỗng
  const out4Am = await chayCa4('Dầu bôi trơn hộp số tổng hợp 100% PAO dùng cho động cơ tua-bin hàng không dân dụng');
  ok('D3 âm đối chứng 1: mô tả không khớp trùng khít tiền lệ khi R2 trả hs="" → giữ nguyên NEEDS_EXPERT và results rỗng', out4Am.status === 'NEEDS_EXPERT' && (out4Am.results || []).length === 0);

  // D3 âm đối chứng 2 (cổng cứng MA_KHONG_TON_TAI): khi R2 bịa mã 8 số không tồn tại trong biểu thuế ("27101999") → KHÔNG đôn tiền lệ đè cổng cứng, giữ cảnh báo chặn MA_KHONG_TON_TAI trong missing và log
  const out4MaBia = await chayCa4(ca4.cauKhach, '27101999');
  ok(
    'D3 âm đối chứng 2: khi R2 bịa mã 8 số không tồn tại (27101999) → cổng cứng MA_KHONG_TON_TAI giữ nguyên, KHÔNG đôn 27101990',
    out4MaBia.results?.[0]?.hs !== '27101990'
      && !(out4MaBia.results || []).some((r) => r.xepHang === 'TIEN_LE_TB_TCHQ')
      && (out4MaBia.missing || []).some((m) => /Mã 27101999 không có trong biểu thuế/.test(String(m)))
      && (out4MaBia.engine?.log || []).some((x) => Array.isArray(x.blocks) && x.blocks.includes('MA_KHONG_TON_TAI')),
  );
}

// D4 — tyLePhanTram & chống ReDoS ~40.000 từ lặp < 2 giây (Quy tắc 6b)
{
  const { tyLePhanTram, doGiongTenHang } = require('../lib/giong-ten-hang.js');
  const kqMau = typeof tyLePhanTram === 'function' ? tyLePhanTram('Vải 59% visco, 95.2% polyester, hàng mới 100%, new 100%') : null;
  ok('D4 dương: tyLePhanTram lấy đúng tỷ lệ thành phần ("59%", "95,2%") và bỏ "hàng mới 100%" / "new 100%"', JSON.stringify(kqMau) === JSON.stringify(['59%', '95,2%']));
  const chuoiDai = Array.from({ length: 40000 }, (_, i) => (i % 7 === 0 ? '95,2%' : 'hàng')).join(' ');
  const t0 = Date.now();
  const kqTyLe = typeof tyLePhanTram === 'function' ? tyLePhanTram(chuoiDai) : [];
  const kqGiong = doGiongTenHang({ tenHang: 'Vải dệt kim sợi ngang', moTa: chuoiDai }, 'Vải dệt kim sợi ngang 95,2% polyester');
  const elapsed = Date.now() - t0;
  ok(`D4 ReDoS: 40.000 từ lặp chạy trong ${elapsed}ms (< 2000ms)`, elapsed < 2000 && Array.isArray(kqTyLe) && typeof kqGiong.diem === 'number');
}

console.log(`\n${pass} passed | ${fail} failed`);
process.exit(fail ? 1 : 0);
