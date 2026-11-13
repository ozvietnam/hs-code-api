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

console.log(`\n${pass} passed | ${fail} failed`);
process.exit(fail ? 1 : 0);
