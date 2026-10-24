#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * POST /api/so-tay-questions — câu hỏi phân loại TẤT ĐỊNH lấy từ sổ tay thật.
 * Khoá: không LLM / không engine-loop / không cờ HS_SO_TAY; nhóm có sổ tay → câu hỏi number
 * đúng đặc điểm; nhóm không có sổ tay → coSoTay:false (không 500); đầu vào xấu → 400.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); if (ok) passed += 1; else failed += 1; };

delete process.env.HS_API_TOKEN; // công khai: không token vẫn gọi được
delete process.env.HS_PUBLIC_READ;
delete process.env.HS_SO_TAY; // chứng minh KHÔNG phụ thuộc cờ
const handler = require('../api/so-tay-questions.js');
const call = async (body, method = 'POST') => {
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[String(k).toLowerCase()]; }, setHeader(k, v) { this._h[String(k).toLowerCase()] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method, url: '/api/so-tay-questions', headers: {}, body }, res);
  return res;
};

// 1) Nhóm CÓ sổ tay (van, 8481): dòng "Loại khác" 84811019 thiếu đường kính → hỏi đặc điểm số đúng (đường kính, cm).
let r = await call({ hs: '84811019', productText: 'van công nghiệp' });
assert('8481: 200 + coSoTay:true + nhom 8481', r._s === 200 && r._j.coSoTay === true && r._j.nhom === '8481', r._j);
assert('8481: có nguonSoTay nhắc nhóm', typeof r._j.nguonSoTay === 'string' && r._j.nguonSoTay.includes('8481'), r._j.nguonSoTay);
const dk = (r._j.questions || []).find((q) => q.key === 'duong_kinh');
assert('8481: có câu hỏi number "đường kính" đơn vị cm (đặc điểm chốt đuôi 8 số)', Boolean(dk) && dk.type === 'number' && dk.unit === 'cm' && /[Đđ]ường kính/.test(dk.questionVi), dk);
assert('8481: mọi câu hỏi đúng contract (key/questionVi/type ∈ choice|number/required bool)', (r._j.questions || []).length > 0 && r._j.questions.every((q) => q.key && q.questionVi && ['choice', 'number'].includes(q.type) && typeof q.required === 'boolean'), r._j.questions);
assert('8481: câu number có unit và KHÔNG kèm options', r._j.questions.filter((q) => q.type === 'number').every((q) => q.unit && !q.options));

// hs 4 số cũng nhận (chỉ cổng + trường khai, chưa chốt đuôi) — vẫn coSoTay:true.
r = await call({ hs: '8481' });
assert('8481 (4 số): coSoTay:true', r._s === 200 && r._j.coSoTay === true, r._j);

// 2) Nhóm KHÔNG có sổ tay → coSoTay:false + questions rỗng (portal tự fallback), KHÔNG 500.
r = await call({ hs: '9999' });
assert('nhóm không sổ tay: 200 + coSoTay:false + questions rỗng', r._s === 200 && r._j.coSoTay === false && Array.isArray(r._j.questions) && r._j.questions.length === 0, r._j);

// 3) Không hỏi lại đặc điểm khách đã trả lời trong facts.
r = await call({ hs: '84811019', productText: 'van công nghiệp', facts: { duong_kinh: 3 } });
assert('facts đã có duong_kinh → không hỏi lại', !(r._j.questions || []).some((q) => q.key === 'duong_kinh'), r._j.questions);

// 4) Đầu vào xấu → 400 (không throw, không 500).
assert('hs < 4 số → 400', (await call({ hs: '12' }))._s === 400);
assert('thiếu hs → 400', (await call({}))._s === 400);

// 5) Method khác POST → 405.
assert('GET → 405', (await call({ hs: '8481' }, 'GET'))._s === 405);

// 6) Body dạng chuỗi JSON vẫn đọc được; chuỗi hỏng → 400.
r = await call('{"hs":"84811019"}');
assert('body chuỗi JSON: 200 + coSoTay:true', r._s === 200 && r._j.coSoTay === true, r._j);
assert('body chuỗi JSON hỏng → 400', (await call('{hỏng'))._s === 400);

// ───────────── #411 (24/10/2026): bước 3 TT39 đọc productText · loai · required · tacDongThue ─────────────
// Khoá: mô tả đã nêu gì thì không hỏi lại; mỗi câu biết căn cứ (loai); câu chung chỉ tuỳ chọn khi có mô tả;
// câu sắc biết tiền thuế treo trên câu trả lời; KHÔNG gửi productText → payload y hệt bản cũ (+2 field).
const keys = (res) => (res._j.questions || []).map((q) => q.key);
const stripNew = (body) => ({ ...body, questions: (body.questions || []).map(({ loai, tacDongThue, ...rest }) => rest) });

// (a) Mô tả đã nêu loại van / vật liệu / đường kính / áp suất → không còn câu chung nào hỏi lại điều đã ghi.
r = await call({ hs: '84811019', productText: 'Van cổng inox 304 điều khiển bằng tay, đường kính trong 25 mm, PN16' });
assert('#411(a) mô tả đủ: không còn câu material/pressureRating/dimensions/valveType', r._s === 200 && !keys(r).some((k) => ['material', 'pressureRating', 'dimensions', 'valveType'].includes(k)), keys(r));
assert('#411(a) không hỏi lại duong_kinh/chat_lieu đã đọc được từ mô tả', !keys(r).some((k) => ['duong_kinh', 'chat_lieu'].includes(k)), keys(r));
assert('#411(a) mọi câu còn lại có loai ∈ DONG_BIEU|CONG|TT39', (r._j.questions || []).every((q) => ['DONG_BIEU', 'CONG', 'TT39'].includes(q.loai)), r._j.questions);

// (b) Bỏ "PN16" → câu áp suất quay lại: là TT39 và TUỲ CHỌN (required:false) vì đã có productText.
r = await call({ hs: '84811019', productText: 'Van cổng inox 304 điều khiển bằng tay, đường kính trong 25 mm' });
const ps = (r._j.questions || []).find((q) => q.key === 'pressureRating');
assert('#411(b) bỏ PN16 → pressureRating quay lại', Boolean(ps), keys(r));
assert('#411(b) pressureRating là TT39, required:false, không có tacDongThue', Boolean(ps) && ps.loai === 'TT39' && ps.required === false && !('tacDongThue' in ps), ps);
assert('#411(b) vẫn không hỏi material/dimensions/valveType (mô tả đã nêu)', !keys(r).some((k) => ['material', 'dimensions', 'valveType'].includes(k)), keys(r));

// (c) productText rỗng → payload Y HỆT bản trước #411 (snapshot chụp 24/10/2026 trên origin/main 5835d3b),
//     chỉ thêm loai + tacDongThue. Câu TT39 khi không có mô tả vẫn required:true như cũ.
const SNAPSHOT_84811019_TRUOC_411 = {"coSoTay":true,"nhom":"8481","nguonSoTay":"Sổ tay HS nhóm 8481 (HS2022+SEN2022)","questions":[{"key":"duong_kinh","questionVi":"Đường kính (cm)?","type":"number","required":true,"unit":"cm","nguon":"tax.84811011","trich":"84811011 - - - Van cổng điều khiển bằng tay có đường kính trong cửa nạp hoặc cửa thoát trên 5 cm nhưng không quá 40 cm"},{"key":"chat_lieu","questionVi":"Vật liệu chính của hàng là gì?","type":"choice","required":true,"options":["plastic","cao su","giấy","gỗ","kim loại","thủy tinh","gốm sứ","vải dệt"],"nguon":"tax.84811011","trich":"84811011 - - - Van cổng điều khiển bằng tay có đường kính trong cửa nạp hoặc cửa thoát trên 5 cm nhưng không quá 40 cm"},{"key":"valveType","questionVi":"Loại van của hàng là gì? (cầu, bi, điện từ)","type":"choice","required":true,"questionZh":"请问阀门类型是什么？"},{"key":"pressureRating","questionVi":"Áp suất làm việc của hàng là gì? (bar, PN)","type":"choice","required":true,"questionZh":"请问压力是什么？"},{"key":"dimensions","questionVi":"Kích thước của hàng là gì? (DxRxC mm/m)","type":"choice","required":true,"questionZh":"请问尺寸是什么？"}]};
r = await call({ hs: '84811019' });
assert('#411(c) productText rỗng: payload khớp snapshot cũ (trừ loai/tacDongThue)', JSON.stringify(stripNew(r._j)) === JSON.stringify(SNAPSHOT_84811019_TRUOC_411), stripNew(r._j));
assert('#411(c) productText rỗng: câu TT39 vẫn required:true', (r._j.questions || []).some((q) => q.loai === 'TT39') && (r._j.questions || []).filter((q) => q.loai === 'TT39').every((q) => q.required === true), r._j.questions);
assert('#411(c) loai đúng từng bước: duong_kinh/chat_lieu = DONG_BIEU · valveType/pressureRating/dimensions = TT39', (r._j.questions || []).every((q) => (['duong_kinh', 'chat_lieu'].includes(q.key) ? q.loai === 'DONG_BIEU' : q.loai === 'TT39')), r._j.questions);
const r2 = await call({ hs: '84811019', productText: '' });
assert('#411(c) productText "" ≡ không gửi productText', JSON.stringify(r2._j) === JSON.stringify(r._j));
r = await call({ hs: '8481' });
assert('#411 hs 4 số: mọi câu đều có loai', (r._j.questions || []).length > 0 && r._j.questions.every((q) => ['DONG_BIEU', 'CONG', 'TT39'].includes(q.loai)), r._j.questions);

// Câu cổng sổ tay (chọn dòng "Loại khác" trong khi tên dòng cụ thể có trong mô tả) → loai CONG, hỏi chuyên viên.
r = await call({ hs: '84811019', productText: 'van cổng điều khiển bằng tay' });
const cong = (r._j.questions || []).find((q) => q.key === 'gate_SO_TAY_DONG8_84811011');
assert('#411 câu cổng sổ tay: loai CONG + askStaff + required:false + không tacDongThue', Boolean(cong) && cong.loai === 'CONG' && cong.askStaff === true && cong.required === false && !('tacDongThue' in cong), cong || keys(r));

// (d) tacDongThue cho câu DONG_BIEU = chênh MFN giữa các dòng 8 số cùng phân nhóm 6 mà câu quyết định (chỉ tính, không xếp lại).
r = await call({ hs: '70189010' }); // 7018.90: 70189010 (đường kính ≥ 4 mm, MFN 0 %) ↔ 70189090 Loại khác (30 %)
const dk7018 = (r._j.questions || []).find((q) => q.key === 'duong_kinh');
assert('#411(d) 70189010: duong_kinh DONG_BIEU, tacDongThue {mfnMin 0, mfnMax 30, chenh 30, acftaKhac false, dong 2 dòng}', Boolean(dk7018) && dk7018.loai === 'DONG_BIEU' && JSON.stringify(dk7018.tacDongThue) === JSON.stringify({ mfnMin: 0, mfnMax: 30, chenh: 30, acftaKhac: false, dong: ['70189010', '70189090'] }), dk7018);
r = await call({ hs: '84181039' }); // 8418.10: dung tích quyết định MFN 3 % ↔ 25 %, ACFTA 0 ↔ 15 (-KH, TH)
const dt8418 = (r._j.questions || []).find((q) => q.key === 'dung_tich');
assert('#411(d) 84181039: dung_tich chenh 22 (3 → 25) + acftaKhac true', Boolean(dt8418) && Boolean(dt8418.tacDongThue) && dt8418.tacDongThue.mfnMin === 3 && dt8418.tacDongThue.mfnMax === 25 && dt8418.tacDongThue.chenh === 22 && dt8418.tacDongThue.acftaKhac === true, dt8418);
r = await call({ hs: '39204310' }); // 3920.43: be_day quyết định dòng nhưng hai dòng đều MFN 6 % → chenh 0
const bd3920 = (r._j.questions || []).find((q) => q.key === 'be_day');
assert('#411(d) 39204310: be_day chenh 0 (hai dòng đều MFN 6 %)', Boolean(bd3920) && Boolean(bd3920.tacDongThue) && bd3920.tacDongThue.chenh === 0 && bd3920.tacDongThue.mfnMin === 6 && bd3920.tacDongThue.mfnMax === 6 && bd3920.tacDongThue.acftaKhac === false, bd3920);
assert('#411(d) câu TT39 không mang tacDongThue', (r._j.questions || []).filter((q) => q.loai === 'TT39').every((q) => !('tacDongThue' in q)), r._j.questions);

// Động cơ 8501: mô tả đủ công suất / điện áp / số pha / vòng phút → không còn câu nào (kể cả câu sắc cong_suat đã đọc được).
r = await call({ hs: '85013400', productText: 'Động cơ điện xoay chiều 3 pha 220/380V công suất 7500 W 1450 vòng/phút' });
assert('#411 8501 mô tả đủ 4 thông số → 0 câu', r._s === 200 && (r._j.questions || []).length === 0, keys(r));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
