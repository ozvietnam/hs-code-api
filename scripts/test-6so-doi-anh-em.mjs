#!/usr/bin/env node
// HS_6SO_DOI_ANH_EM (OZV-2367, mặc định TẮT) — 6 số AI chọn bị diXuong6 loại CỨNG (dữ kiện khách mâu thuẫn) mà có ĐÚNG MỘT
// phân nhóm anh em thoả → lib/hoi-theo-so-tay.js#apDung dựng câu hỏi trên anh em đó (chốt dòng bằng chotDong8 nếu được) và
// gộp câu trùng chữ. Ca gốc (OZV-2362, vòng 2 câu khách thật): "động cơ bước 57cm22c, loại động cơ: động cơ bước, công suất
// 60W, một chiều" → bản thật kẹt 8501.10 (≤ 37,5 W, SAI 6 số) và hỏi 3 câu trùng chữ la_85011021/41/51.
// Hai chiều cờ: TẮT → y như main (vẫn 850110, 3 câu); BẬT → 85013170 / 8501.31, không còn 8501.10.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
for (const k of ['HS_HOI_THEO_SO_TAY', 'HS_6SO_DOI_ANH_EM']) delete process.env[k];
process.env.HS_HOI_THEO_SO_TAY = 'on';
console.error = () => {};
console.warn = () => {};
const H = require('../lib/hoi-theo-so-tay.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 700)}`); }
};
const voi = (giaTri, fn) => {
  const cu = process.env.HS_6SO_DOI_ANH_EM;
  if (giaTri == null) delete process.env.HS_6SO_DOI_ANH_EM; else process.env.HS_6SO_DOI_ANH_EM = giaTri;
  try { return fn(); } finally { if (cu == null) delete process.env.HS_6SO_DOI_ANH_EM; else process.env.HS_6SO_DOI_ANH_EM = cu; }
};
const outCua = (hs, ds = []) => ({
  status: 'NEED_FACTS',
  nextAction: { type: 'ASK_USER', questions: [{ questionVi: 'Công suất định mức bao nhiêu W?' }] },
  results: [{ hs, duKien: true }, ...ds.map((h) => ({ hs: h }))],
  missingStructured: [],
});
const CA_60W = 'động cơ bước 57cm22c, loại động cơ: động cơ bước, công suất 60W, một chiều';
const CA_20W = 'động cơ bước 57cm22c, loại động cơ: động cơ bước, công suất 20W, một chiều';
const pn6Hoi = (o) => [...new Set((o.nextAction.questions || []).flatMap((q) => q.phanNhom || []))];
const khoaHoi = (o) => (o.nextAction.questions || []).map((q) => q.khoa).filter(Boolean);

// 1. Công tắc: chỉ on / 1 / true.
check('cờ mặc định TẮT', voi(null, () => H.batDoiAnhEm()) === false);
check('cờ "off" vẫn TẮT', voi('off', () => H.batDoiAnhEm()) === false);
check('cờ "1" BẬT', voi('1', () => H.batDoiAnhEm()) === true);

// 2. Bước tất định: 8501.10 trái cứng ở 60 W, đúng một anh em thoả 8501.31, chotDong8 → 85013170.
const d = H.doiAnhEm6('8501', '850110', CA_60W);
check('doiAnhEm6: 850110 → 850131', d && d.tu === '850110' && d.sang === '850131', d);
check('doiAnhEm6: chốt dòng 85013170', d && d.chotDong8 === '85013170' && d.ma === '85013170', d);
check('doiAnhEm6: 850110 nằm trong loại cứng', d && d.loaiCung.includes('850110'), d);
check('doiAnhEm6: 20 W không trái 8501.10 → không đổi', H.doiAnhEm6('8501', '850110', CA_20W) === null);
check('doiAnhEm6: nhóm không có tieuChi6 g6@1 → không đổi', H.doiAnhEm6('0000', '000010', CA_60W) === null);

// 3. Cờ TẮT → y như main: vẫn kẹt 850110, hỏi 3 câu la_85011021/41/51.
for (const top of ['850110', '85011049']) {
  const o = voi(null, () => H.apDung(outCua(top), { rawAttrs: { tenHang: CA_60W } }));
  check(`TẮT ${top}: mã giữ nguyên`, o.results[0].hs === top && !o.results[0].doiAnhEm6, o.results[0]);
  check(`TẮT ${top}: vẫn hỏi trên 850110`, pn6Hoi(o).includes('850110'), pn6Hoi(o));
  check(`TẮT ${top}: 3 câu la_8501xx (y như main)`, ['la_85011021', 'la_85011041', 'la_85011051'].every((k) => khoaHoi(o).includes(k)), khoaHoi(o));
  check(`TẮT ${top}: không có dấu doiAnhEm6`, !o.hoiTheoSoTay?.doiAnhEm6, o.hoiTheoSoTay);
}

// 4. Cờ BẬT → 85013170, không còn 850110 ở mã lẫn câu hỏi; ghi dấu để chạy bóng/đo.
for (const top of ['850110', '85011049']) {
  const o = voi('on', () => H.apDung(outCua(top, ['85011041']), { rawAttrs: { tenHang: CA_60W } }));
  check(`BẬT ${top}: mã đổi sang 85013170`, o.results[0].hs === '85013170' && o.results[0].duKien === true, o.results[0]);
  check(`BẬT ${top}: results[0].doiAnhEm6 ghi mã cũ`, o.results[0].doiAnhEm6?.tu === top, o.results[0]);
  check(`BẬT ${top}: không còn câu hỏi trên 850110`, !pn6Hoi(o).includes('850110') && !khoaHoi(o).some((k) => /^la_850110/.test(k)), o.nextAction.questions);
  check(`BẬT ${top}: hoiTheoSoTay.doiAnhEm6`, o.hoiTheoSoTay?.doiAnhEm6?.sang === '850131' && o.hoiTheoSoTay.doiAnhEm6.chotDong8 === '85013170', o.hoiTheoSoTay);
  check(`BẬT ${top}: đã chốt dòng → không hỏi dòng`, o.hoiTheoSoTay?.lyDo === 'may-chot-duoc-dong', o.hoiTheoSoTay);
}

// 5. Lỗi phụ: 20 W (850110 đúng, không đổi) — BẬT thì 3 câu trùng chữ gộp làm 1, TẮT giữ 3 câu.
{
  const tat = voi(null, () => H.apDung(outCua('850110'), { rawAttrs: { tenHang: CA_20W } }));
  const bat = voi('on', () => H.apDung(outCua('850110'), { rawAttrs: { tenHang: CA_20W } }));
  const demLa = (o) => khoaHoi(o).filter((k) => /^la_850110[245]1$/.test(k)).length;
  check('20W TẮT: 3 câu la_8501xx', demLa(tat) === 3, khoaHoi(tat));
  check('20W BẬT: mã không đổi', bat.results[0].hs === '850110' && !bat.hoiTheoSoTay?.doiAnhEm6, bat.hoiTheoSoTay);
  check('20W BẬT: câu trùng chữ gộp còn 1', demLa(bat) === 1, khoaHoi(bat));
  const chu = (bat.nextAction.questions || []).map((q) => q.questionVi);
  check('20W BẬT: không còn câu trùng chữ', new Set(chu).size === chu.length, chu);
}

// 6. Không phải lượt hỏi → trả nguyên.
{
  const o = { status: 'REVIEW', results: [{ hs: '85011049' }] };
  check('BẬT: không phải NEED_FACTS → trả nguyên đối tượng', voi('on', () => H.apDung(o, { rawAttrs: { tenHang: CA_60W } })) === o);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
