#!/usr/bin/env node
import './test-isolate-data.mjs';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';
import fs from 'node:fs';
import path from 'node:path';
{
  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  const st8481 = JSON.parse(fs.readFileSync('data/so-tay/8481.json', 'utf8'));
  const old848110 = {
    '84811011': [{ fact: 'duong_kinh', op: '>', value: 5, donVi: 'cm' }],
    '84811019': undefined,
    '84811021': [{ fact: 'duong_kinh', op: '<=', value: 2.5, donVi: 'cm' }],
    '84811022': [{ fact: 'duong_kinh', op: '>', value: 2.5, donVi: 'cm' }],
    '84811091': [{ fact: 'chat_lieu', op: 'LA', value: 'plastic' }, { fact: 'duong_kinh', op: '>=', value: 1, donVi: 'cm' }, { fact: 'duong_kinh', op: '<=', value: 2.5, donVi: 'cm' }],
    '84811099': undefined,
  };
  st8481.dong8 = (st8481.dong8 || []).map((d) => (d.hs in old848110 ? { ...d, dieuKienSo: old848110[d.hs] } : d));
  st8481.dieuKienNut = (st8481.dieuKienNut || []).filter((n) => !String(n.id || '').startsWith('848110'));
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'so-tay/8481.json'), JSON.stringify(st8481));
}
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
//     OZV-581 (T3, PR #1263): bảng vật liệu `MATERIALS` thêm "vật liệu tổng hợp" (composite) ⇒ câu
//     chat_lieu có THÊM đúng 1 lựa chọn; GĐ đo 2 chiều: khác snapshot cũ CHỈ ở mảng options này
//     (thêm "vật liệu tổng hợp", không mất lựa chọn nào; các câu hỏi khác y hệt).
const SNAPSHOT_84811019_TRUOC_411 = {"coSoTay":true,"nhom":"8481","nguonSoTay":"Sổ tay HS nhóm 8481 (HS2022+SEN2022)","questions":[{"key":"duong_kinh","questionVi":"Đường kính (cm)?","type":"number","required":true,"unit":"cm","nguon":"tax.84811011","trich":"84811011 - - - Van cổng điều khiển bằng tay có đường kính trong cửa nạp hoặc cửa thoát trên 5 cm nhưng không quá 40 cm"},{"key":"chat_lieu","questionVi":"Vật liệu chính của hàng là gì?","type":"choice","required":true,"options":["plastic","cao su","giấy","gỗ","kim loại","thủy tinh","gốm sứ","vải dệt","vật liệu tổng hợp"],"nguon":"tax.84811011","trich":"84811011 - - - Van cổng điều khiển bằng tay có đường kính trong cửa nạp hoặc cửa thoát trên 5 cm nhưng không quá 40 cm"},{"key":"valveType","questionVi":"Loại van của hàng là gì? (cầu, bi, điện từ)","type":"choice","required":true,"questionZh":"请问阀门类型是什么？"},{"key":"pressureRating","questionVi":"Áp suất làm việc của hàng là gì? (bar, PN)","type":"choice","required":true,"questionZh":"请问压力是什么？"},{"key":"dimensions","questionVi":"Kích thước của hàng là gì? (DxRxC mm/m)","type":"choice","required":true,"questionZh":"请问尺寸是什么？"}]};
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
const dk7018 = (r._j.questions || []).find((q) => q.key === 'duong_kinh' || q.key === 'duongKinh');
assert('#411(d) 70189010: duong_kinh DONG_BIEU, tacDongThue {mfnMin 0, mfnMax 30, chenh 30, acftaKhac false, dong 2 dòng}', Boolean(dk7018) && dk7018.loai === 'DONG_BIEU' && JSON.stringify(dk7018.tacDongThue) === JSON.stringify({ mfnMin: 0, mfnMax: 30, chenh: 30, acftaKhac: false, dong: ['70189010', '70189090'] }), dk7018);

// #OZV-723 (13/11/2026): CÙNG câu hỏi khi sổ tay viết điều kiện bằng khoá MỚI `duongKinh` (tu-vung@2).
// Hồ sơ ranh-gioi-spec@1 ép fact ∈ tu-vung@2 nên spec ranh giới soạn bằng `duongKinh`; máy sinh câu hỏi
// phải tra ngược data/tu-vung/anh-xa-cu.json (qua lib/so-tay-gates.js#khoaCuaFact) về mẫu của khoá cũ
// `duong_kinh` thay vì rơi nhánh askStaff — đây là chỗ PR #1278 làm đỏ ca #411(d) ở trên.
// Bản sao nhóm 7018 ghi trong thư mục TẠM (test-isolate-data): dữ liệu thật (274 chỗ `duong_kinh`
// trong data/so-tay/) không đổi, và loadSoTay cache theo đường dẫn phân giải nên đọc bản tạm tươi.
{
  const { dataPath } = require('../lib/data-paths.js');
  const fsx = require('fs'); const pathx = require('path');
  const goc = JSON.parse(fsx.readFileSync(pathx.join(process.cwd(), 'data/so-tay/7018.json'), 'utf8'));
  for (const d of goc.dong8 || []) for (const c of d.dieuKienSo || []) if (c.fact === 'duong_kinh') c.fact = 'duongKinh';
  fsx.mkdirSync(dataPath('so-tay'), { recursive: true });
  fsx.writeFileSync(dataPath('so-tay/7018.json'), JSON.stringify(goc));
  r = await call({ hs: '70189010' });
  const dkMoi = (r._j.questions || []).find((q) => q.key === 'duongKinh');
  assert('#OZV-723 70189010 duongKinh: vẫn câu number DONG_BIEU unit mm, nhãn "Đường kính" (không rơi askStaff)', Boolean(dkMoi) && dkMoi.type === 'number' && dkMoi.loai === 'DONG_BIEU' && dkMoi.unit === 'mm' && /[Đđ]ường kính/.test(dkMoi.questionVi) && !dkMoi.askStaff, dkMoi);
  assert('#OZV-723 70189010 duongKinh: cùng tacDongThue như khoá cũ {mfnMin 0, mfnMax 30, chenh 30, acftaKhac false, dong 2 dòng}', Boolean(dkMoi) && JSON.stringify(dkMoi.tacDongThue) === JSON.stringify({ mfnMin: 0, mfnMax: 30, chenh: 30, acftaKhac: false, dong: ['70189010', '70189090'] }), dkMoi && dkMoi.tacDongThue);
}
r = await call({ hs: '84181039' }); // 8418.10: dung tích quyết định MFN 3 % ↔ 25 %, ACFTA 0 ↔ 15 (-KH, TH)
const dt8418 = (r._j.questions || []).find((q) => q.key === 'dung_tich' || q.key === 'dungTich');
assert('#411(d) 84181039: dung_tich chenh 22 (3 → 25) + acftaKhac true', Boolean(dt8418) && Boolean(dt8418.tacDongThue) && dt8418.tacDongThue.mfnMin === 3 && dt8418.tacDongThue.mfnMax === 25 && dt8418.tacDongThue.chenh === 22 && dt8418.tacDongThue.acftaKhac === true, dt8418);
r = await call({ hs: '39204310' }); // 3920.43: be_day/doDay quyết định dòng nhưng hai dòng đều MFN 6 % → chenh 0
const bd3920 = (r._j.questions || []).find((q) => q.key === 'be_day' || q.key === 'doDay');
assert('#411(d) 39204310: be_day chenh 0 (hai dòng đều MFN 6 %)', Boolean(bd3920) && Boolean(bd3920.tacDongThue) && bd3920.tacDongThue.chenh === 0 && bd3920.tacDongThue.mfnMin === 6 && bd3920.tacDongThue.mfnMax === 6 && bd3920.tacDongThue.acftaKhac === false, bd3920);
assert('#411(d) câu TT39 không mang tacDongThue', (r._j.questions || []).filter((q) => q.loai === 'TT39').every((q) => !('tacDongThue' in q)), r._j.questions);

// Động cơ 8501: mô tả đủ công suất / điện áp / số pha / vòng phút → không còn câu nào (kể cả câu sắc cong_suat đã đọc được).
r = await call({ hs: '85013400', productText: 'Động cơ điện xoay chiều 3 pha 220/380V công suất 7500 W 1450 vòng/phút' });
assert('#411 8501 mô tả đủ 4 thông số → 0 câu', r._s === 200 && (r._j.questions || []).length === 0, keys(r));

// ───────────── Ký hiệu ren M = đường kính (prod 25/10/2026: bu lông M8x30 bị hỏi lại "đường kính") ─────────────
r = await call({ hs: '73181510', productText: 'Bu lông lục giác bằng thép mạ kẽm M8x30, kèm đai ốc' });
assert('ren M: bu lông M8x30 (ca prod) → không hỏi duong_kinh', r._s === 200 && r._j.coSoTay === true && !keys(r).includes('duong_kinh') && !keys(r).includes('duongKinh'), keys(r));
r = await call({ hs: '73181510', productText: 'M20x80 bu lông' });
assert('ren M: M20x80 bu lông → không hỏi duong_kinh (máy đã đọc 20 mm → dòng 73181590)', !keys(r).includes('duong_kinh') && !keys(r).includes('duongKinh'), keys(r));
r = await call({ hs: '73181690', productText: 'Đai ốc lục giác thép M10' });
assert('ren M: đai ốc M10 → không hỏi duong_kinh', !keys(r).includes('duong_kinh') && !keys(r).includes('duongKinh'), keys(r));
r = await call({ hs: '73181510', productText: 'Hàng M8x30 thép mạ kẽm' });
assert('ren M: không có tên chi tiết lắp xiết → vẫn hỏi duong_kinh (DONG_BIEU, mm)', (r._j.questions || []).some((q) => (q.key === 'duong_kinh' || q.key === 'duongKinh') && q.loai === 'DONG_BIEU' && q.unit === 'mm'), r._j.questions);

// ───────────── #434: chữ "sức"/"vân gỗ" không làm rụng câu vật liệu TT39; "gỗ" thật thì rụng ─────────────
r = await call({ hs: '94036090', productText: 'Kệ trang sức' });
assert('#434 "Kệ trang sức" → vẫn hỏi material ("sức" không phải sứ)', keys(r).includes('material'), keys(r));
r = await call({ hs: '94036090', productText: 'Kệ trang trí vân gỗ' });
assert('#434 "Kệ trang trí vân gỗ" → vẫn hỏi material (vân gỗ là bề ngoài)', keys(r).includes('material'), keys(r));
r = await call({ hs: '94036090', productText: 'Kệ gỗ' });
assert('#434 "Kệ gỗ" → không hỏi material', !keys(r).includes('material'), keys(r));

// ───────────── Đợt 0A / H5+H3 (29/10/2026): "mũ giày" (upper) ≠ "mũi giày" (toe cap) ─────────────
// "Mũi gắn bảo vệ" là tiêu chí tách dòng 8 số của 6402 (6402.99.10/20), KHÔNG phải chất liệu mũ giày.
// Câu thật Oz ghi: quai + đế ngoài đều đã nêu chất liệu → không hỏi lại; chữ "mũi" không được tính là mũ.
const DEP = 'Dép đi trong nhà, quai bằng nhựa giả da PU, đế ngoài bằng nhựa, mũi không gắn bảo vệ';
r = await call({ hs: '64029990', productText: DEP });
assert('H3 dép 64029990: "quai bằng nhựa giả da PU" → không hỏi upperMaterial', r._s === 200 && !keys(r).includes('upperMaterial'), keys(r));
assert('H3 dép 64029990: "đế ngoài bằng nhựa" → không hỏi soleMaterial', !keys(r).includes('soleMaterial'), keys(r));
r = await call({ hs: '64029990', productText: 'Dép đi trong nhà, mũi không gắn bảo vệ' });
assert('H5 "mũi không gắn bảo vệ" KHÔNG bị hiểu là chất liệu mũ giày → vẫn hỏi upperMaterial', keys(r).includes('upperMaterial'), keys(r));
r = await call({ hs: '64029990', productText: 'Giày có mũi giày gắn bảo vệ, đế cao su' });
assert('H5 "mũi giày gắn bảo vệ" KHÔNG thay cho chất liệu mũ giày → vẫn hỏi upperMaterial (đế đã có)', keys(r).includes('upperMaterial') && !keys(r).includes('soleMaterial'), keys(r));
r = await call({ hs: '64029990', productText: 'Dép quai ngang nam' });
assert('"quai ngang" (kiểu dáng, không chất liệu) → vẫn hỏi upperMaterial', keys(r).includes('upperMaterial'), keys(r));
const qUpper = (r._j.questions || []).find((q) => q.key === 'upperMaterial');
assert('nhãn câu hỏi là "mũ giày", không còn "mũi giày"', Boolean(qUpper) && /mũ giày/.test(qUpper.questionVi) && !/mũi/.test(qUpper.questionVi), qUpper);
r = await call({ hs: '64029990', productText: 'Giày thể thao, mũ giày bằng vải lưới, đế EVA' });
assert('"mũ giày bằng vải lưới, đế EVA" → không hỏi upper/sole', !keys(r).includes('upperMaterial') && !keys(r).includes('soleMaterial'), keys(r));


// ───────────── OZV-2131: cạnh loại trừ 2 chiều 85.36 <-> 85.42 cho ca 138 ─────────────
// "Module cảm biến chuyển động / None / Phát hiện chuyển động" (nhomNhan: ["8536"], heNhom: "8542").
{
  const S2131 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2131, soTayGates: soTayGates2131, nhomLienQuanSoTay: nhomLienQuan2131 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2131 } = require('../lib/hoi-theo-so-tay.js');
  const D2131 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2131, TRANG_THAI_4SO: TT2131 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2131 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  // test-isolate đã tạo TEST_DATA_DIR/so-tay (chỉ 8481) → dataReadPath('so-tay') đọc thư mục đó và
  // che mất sổ tay gốc khi dựng bảng cạnh. Chép 8536/8542 vào isolate rồi datLai().
  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8536', '8542']) {
    fs.copyFileSync(path.join(ROOT2131, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2131.datLai();

  const moTaCa138 = 'Module cảm biến chuyển động / None / Phát hiện chuyển động';
  const moTaKhop138 = 'Module cảm biến chuyển động, công tắc đóng ngắt chuyển mạch phát hiện chuyển động';

  const s8536 = JSON.parse(fs.readFileSync(path.join(ROOT2131, 'data', 'so-tay', '8536.json'), 'utf8'));
  const s8542 = JSON.parse(fs.readFileSync(path.join(ROOT2131, 'data', 'so-tay', '8542.json'), 'utf8'));
  const v8536 = S2131.verifySoTay(s8536, '8536');
  const v8542 = S2131.verifySoTay(s8542, '8542');
  assert(
    '[OZV-2131 verifySoTay] sổ tay 8536 và 8542 đạt 100% (0 mục bị loại)',
    v8536.loai.length === 0 && v8542.loai.length === 0,
    { loai8536: v8536.loai, loai8542: v8542.loai }
  );

  const st8536 = loadSoTay2131('8536');
  const st8542 = loadSoTay2131('8542');
  const lt8536 = (st8536?.loaiTru || []).find((x) => x.sangNhom === '8542');
  const lt8542 = (st8542?.loaiTru || []).find((x) => x.sangNhom === '8536');
  assert(
    '[OZV-2131 căn cứ] sổ tay 8536 và 8542 có mục loaiTru 2 chiều 8536 <-> 8542 từ ch85.chuong đạt checkItem',
    Boolean(
      lt8536 &&
        lt8536.nguon === 'ch85.chuong' &&
        S2131.checkItem('loaiTru', lt8536, S2131.sourcesFor('8536'), '8536') === null
    ) &&
      Boolean(
        lt8542 &&
          lt8542.nguon === 'ch85.chuong' &&
          S2131.checkItem('loaiTru', lt8542, S2131.sourcesFor('8542'), '8542') === null
      ),
    { lt8536, lt8542 }
  );

  const c5Tu8536 = D2131.canhTu('8536', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8542');
  const c5Tu8542 = D2131.canhTu('8542', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const c6Tu8536 = D2131.canhTu('8536', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8542');
  const c6Tu8542 = D2131.canhTu('8542', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const giua8536_8542 = D2131.canhGiuaNhomConSong(['8536', '8542']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8536 = D2131.moRongUngVien(['8536'], moTaKhop138, { toiDa: 10 });
  const mrTu8542 = D2131.moRongUngVien(['8542'], moTaKhop138, { toiDa: 10 });
  assert(
    '[OZV-2131 đồ thị 2 chiều] bảng cạnh có C5/C6 8536<->8542, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 138',
    c5Tu8536.some((e) => e.nguon === 'ch85.chuong') &&
      c5Tu8542.some((e) => e.nguon === 'ch85.chuong') &&
      c6Tu8536.length >= 1 &&
      c6Tu8542.length >= 1 &&
      giua8536_8542.length >= 2 &&
      mrTu8536.some((x) => x.nhom === '8542') &&
      mrTu8542.some((x) => x.nhom === '8536'),
    { c5Tu8536: c5Tu8536.length, c5Tu8542: c5Tu8542.length, giua: giua8536_8542.length, mrTu8536, mrTu8542 }
  );

  assert(
    '[OZV-2131 nhomLienQuanSoTay] liên kết hai chiều 8536 <-> 8542',
    nhomLienQuan2131('8536').includes('8542') && nhomLienQuan2131('8542').includes('8536'),
    { rel8536: nhomLienQuan2131('8536'), rel8542: nhomLienQuan2131('8542') }
  );

  const pb8536 = cauPhanBiet2131('8536', ['8536', '8542'], moTaKhop138);
  assert(
    '[OZV-2131 thuận 8536->8542] 8536 đứng đầu với [8536, 8542] sinh câu phân biệt từ ch85.chuong trỏ sang 85.42',
    pb8536.length === 1 &&
      pb8536[0].loai === 'PHAN_BIET_NHOM' &&
      pb8536[0].canCu === 'so-tay' &&
      pb8536[0].nguon === 'ch85.chuong' &&
      /85\.42/.test(pb8536[0].questionVi) &&
      /85\.36/.test(pb8536[0].questionVi),
    { pb8536 }
  );

  const pb8542 = cauPhanBiet2131('8542', ['8542', '8536'], moTaKhop138);
  assert(
    '[OZV-2131 thuận 8542->8536] 8542 đứng đầu với [8542, 8536] sinh câu phân biệt từ ch85.chuong trỏ sang 85.36',
    pb8542.length === 1 &&
      pb8542[0].loai === 'PHAN_BIET_NHOM' &&
      pb8542[0].canCu === 'so-tay' &&
      pb8542[0].nguon === 'ch85.chuong' &&
      /85\.36/.test(pb8542[0].questionVi) &&
      /85\.42/.test(pb8542[0].questionVi),
    { pb8542 }
  );

  const g8536To8542 = soTayGates2131({
    hs: '85365099',
    productText: 'Mạch tích hợp điện tử IC đơn khối lai đa chip MCO thỏa Chú giải 12(b) Chương 85',
    productName: 'Mạch tích hợp điện tử IC đơn khối',
    candidateHeadings: ['8536', '8542'],
  });
  const g8542To8536 = soTayGates2131({
    hs: '85423100',
    productText: 'Cảm biến chuyển động dạng mô-đun đóng ngắt chuyển mạch công tắc dùng cho mạch điện áp không quá 1000 V',
    productName: 'Module cảm biến chuyển động',
    candidateHeadings: ['8542', '8536'],
  });
  assert(
    '[OZV-2131 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8536 -> 8542 và 8542 -> 8536',
    (g8536To8542.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8542')) &&
      (g8542To8536.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8536')),
    { g8536To8542: g8536To8542.challenges, g8542To8536: g8542To8536.challenges }
  );

  // Tránh chữ "cắm" (→ cam) vì khớp nhầm âm tiết đầu "cảm" của điều kiện loại trừ.
  const dcBienAp8536 = cauPhanBiet2131('8536', ['8536', '8542'], 'Máy biến áp điện nguồn 220V');
  const dcBienAp8542 = cauPhanBiet2131('8542', ['8542', '8536'], 'Máy biến áp điện nguồn 220V');
  const dcDram8536 = cauPhanBiet2131('8536', ['8536', '8542'], 'Bộ nhớ DRAM bán dẫn');
  const dcDram8542 = cauPhanBiet2131('8542', ['8542', '8536'], 'Bộ nhớ DRAM bán dẫn');
  assert(
    '[OZV-2131 đối chứng] máy biến áp và bộ nhớ DRAM không hỏi oan / không kéo oan 85.36 <-> 85.42',
    dcBienAp8536.length === 0 &&
      dcBienAp8542.length === 0 &&
      dcDram8536.length === 0 &&
      dcDram8542.length === 0 &&
      !D2131.moRongUngVien(['8536'], 'Máy biến áp điện nguồn 220V').some((x) => x.nhom === '8542') &&
      !D2131.moRongUngVien(['8542'], 'Bộ nhớ DRAM bán dẫn').some((x) => x.nhom === '8536'),
    { dcBienAp8536, dcBienAp8542, dcDram8536, dcDram8542 }
  );

  const ht138 = hoiTruoc2131({ moTa: moTaCa138, ungVien: ['8536', '8542'] });
  const distinctDk138 = new Set((ht138.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2131 hoi-truoc-4so] ca 138 với [8536, 8542] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht138.trangThai === TT2131.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk138 &&
      ['8536', '8542'].every((h) => (ht138.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht138.trangThai, distinctDk138, dapAnDieuKien: ht138.dapAnDieuKien }
  );
}

// ───────────── OZV-2133: cạnh loại trừ 2 chiều 85.36 <-> 85.41 cho ca 116 ─────────────
// "Cảm biến quang / None / phát hiện sự hiện diện của vật thể bằng linh kiện quang điện" (nhomNhan: ["8536", "8541", "9031"]).
{
  const S2133 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2133, soTayGates: soTayGates2133, nhomLienQuanSoTay: nhomLienQuan2133 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2133 } = require('../lib/hoi-theo-so-tay.js');
  const D2133 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2133, TRANG_THAI_4SO: TT2133 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2133 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8536', '8541']) {
    fs.copyFileSync(path.join(ROOT2133, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2133.datLai();

  const moTaCa116 = 'Cảm biến quang / None / phát hiện sự hiện diện của vật thể bằng linh kiện quang điện';

  const s8536 = JSON.parse(fs.readFileSync(path.join(ROOT2133, 'data', 'so-tay', '8536.json'), 'utf8'));
  const s8541 = JSON.parse(fs.readFileSync(path.join(ROOT2133, 'data', 'so-tay', '8541.json'), 'utf8'));
  const v8536 = S2133.verifySoTay(s8536, '8536');
  const v8541 = S2133.verifySoTay(s8541, '8541');
  assert(
    '[OZV-2133 verifySoTay] sổ tay 8536 và 8541 đạt 100% (0 mục bị loại)',
    v8536.loai.length === 0 && v8541.loai.length === 0,
    { loai8536: v8536.loai, loai8541: v8541.loai }
  );

  const st8536 = loadSoTay2133('8536');
  const st8541 = loadSoTay2133('8541');
  const lt8536 = (st8536?.loaiTru || []).find((x) => x.sangNhom === '8541');
  const lt8541 = (st8541?.loaiTru || []).find((x) => x.sangNhom === '8536');
  assert(
    '[OZV-2133 căn cứ] sổ tay 8536 và 8541 có mục loaiTru 2 chiều 8536 <-> 8541 kèm canCuLoaiTru nguyên văn từ nhom8536.nhom/nhom8541.nhom đạt checkItem',
    Boolean(
      lt8536 &&
        lt8536.nguon === 'nhom8536.nhom' &&
        lt8536.canCuLoaiTru?.nguon === 'nhom8541.nhom' &&
        !String(lt8536.dieuKien || '').includes(';') &&
        S2133.checkItem('loaiTru', lt8536, S2133.sourcesFor('8536'), '8536') === null
    ) &&
      Boolean(
        lt8541 &&
          lt8541.nguon === 'nhom8541.nhom' &&
          lt8541.canCuLoaiTru?.nguon === 'nhom8536.nhom' &&
          !String(lt8541.dieuKien || '').includes(';') &&
          lt8541.dieuKien !== lt8536.dieuKien &&
          S2133.checkItem('loaiTru', lt8541, S2133.sourcesFor('8541'), '8541') === null
      ),
    { lt8536, lt8541 }
  );

  const c5Tu8536 = D2133.canhTu('8536', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const c5Tu8541 = D2133.canhTu('8541', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const c6Tu8536 = D2133.canhTu('8536', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const c6Tu8541 = D2133.canhTu('8541', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const giua8536_8541 = D2133.canhGiuaNhomConSong(['8536', '8541']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8536 = D2133.moRongUngVien(['8536'], moTaCa116, { toiDa: 10 });
  const mrTu8541 = D2133.moRongUngVien(['8541'], moTaCa116, { toiDa: 10 });
  assert(
    '[OZV-2133 đồ thị 2 chiều] bảng cạnh có C5/C6 8536<->8541, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 116',
    c5Tu8536.some((e) => e.nguon === 'nhom8536.nhom' && e.canCuLoaiTru?.nguon === 'nhom8541.nhom') &&
      c5Tu8541.some((e) => e.nguon === 'nhom8541.nhom' && e.canCuLoaiTru?.nguon === 'nhom8536.nhom') &&
      c6Tu8536.length >= 1 &&
      c6Tu8541.length >= 1 &&
      giua8536_8541.length >= 2 &&
      mrTu8536.some((x) => x.nhom === '8541') &&
      mrTu8541.some((x) => x.nhom === '8536'),
    { c5Tu8536: c5Tu8536.length, c5Tu8541: c5Tu8541.length, giua: giua8536_8541.length, mrTu8536, mrTu8541 }
  );

  assert(
    '[OZV-2133 nhomLienQuanSoTay] liên kết hai chiều 8536 <-> 8541',
    nhomLienQuan2133('8536').includes('8541') && nhomLienQuan2133('8541').includes('8536'),
    { rel8536: nhomLienQuan2133('8536'), rel8541: nhomLienQuan2133('8541') }
  );

  const pb8536 = cauPhanBiet2133('8536', ['8536', '8541'], moTaCa116);
  assert(
    '[OZV-2133 thuận 8536->8541] 8536 đứng đầu với [8536, 8541] sinh câu phân biệt từ nhom8536.nhom trỏ sang 85.41',
    pb8536.length === 1 &&
      pb8536[0].loai === 'PHAN_BIET_NHOM' &&
      pb8536[0].canCu === 'so-tay' &&
      pb8536[0].nguon === 'nhom8536.nhom' &&
      /85\.41/.test(pb8536[0].questionVi) &&
      /85\.36/.test(pb8536[0].questionVi),
    { pb8536 }
  );

  const pb8541 = cauPhanBiet2133('8541', ['8541', '8536'], moTaCa116);
  assert(
    '[OZV-2133 thuận 8541->8536] 8541 đứng đầu với [8541, 8536] sinh câu phân biệt từ nhom8541.nhom trỏ sang 85.36',
    pb8541.length === 1 &&
      pb8541[0].loai === 'PHAN_BIET_NHOM' &&
      pb8541[0].canCu === 'so-tay' &&
      pb8541[0].nguon === 'nhom8541.nhom' &&
      /85\.36/.test(pb8541[0].questionVi) &&
      /85\.41/.test(pb8541[0].questionVi),
    { pb8541 }
  );

  const g8536To8541 = soTayGates2133({
    hs: '85365099',
    productText: 'Cảm biến quang chỉ là linh kiện bán dẫn cảm quang (tế bào quang dẫn, đi-ốt quang, tranzito quang)',
    productName: 'Cảm biến quang chỉ là linh kiện bán dẫn cảm quang',
    candidateHeadings: ['8536', '8541'],
  });
  const g8541To8536 = soTayGates2133({
    hs: '85414900',
    productText: 'Cảm biến quang là thiết bị đóng ngắt hoàn chỉnh xuất tín hiệu bật/tắt dùng để đóng cắt mạch điện áp không quá 1000 V',
    productName: 'Cảm biến quang là thiết bị đóng ngắt hoàn chỉnh',
    candidateHeadings: ['8541', '8536'],
  });
  assert(
    '[OZV-2133 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8536 -> 8541 và 8541 -> 8536',
    (g8536To8541.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541')) &&
      (g8541To8536.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8536')),
    { g8536To8541: g8536To8541.challenges, g8541To8536: g8541To8536.challenges }
  );

  const dcCauChi8536 = cauPhanBiet2133('8536', ['8536', '8541'], 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện');
  const dcCauChi8541 = cauPhanBiet2133('8541', ['8541', '8536'], 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện');
  const dcThachAnh8536 = cauPhanBiet2133('8536', ['8536', '8541'], 'Tinh thể áp điện thạch anh đã lắp ráp dùng cho mạch dao động');
  const dcThachAnh8541 = cauPhanBiet2133('8541', ['8541', '8536'], 'Tinh thể áp điện thạch anh đã lắp ráp dùng cho mạch dao động');
  const dcGate8536 = soTayGates2133({
    hs: '85361099',
    productText: 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện',
    productName: 'Cầu chì ống thủy tinh 10A 250V',
    candidateHeadings: ['8536', '8541'],
  });
  const dcGate8541 = soTayGates2133({
    hs: '85416000',
    productText: 'Tinh thể áp điện thạch anh đã lắp ráp dùng cho mạch dao động',
    productName: 'Tinh thể áp điện thạch anh đã lắp ráp',
    candidateHeadings: ['8541', '8536'],
  });
  assert(
    '[OZV-2133 đối chứng] cầu chì ống thủy tinh và tinh thể áp điện thạch anh không hỏi oan / không kéo oan 85.36 <-> 85.41',
    dcCauChi8536.length === 0 &&
      dcCauChi8541.length === 0 &&
      dcThachAnh8536.length === 0 &&
      dcThachAnh8541.length === 0 &&
      !(dcGate8536.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541')) &&
      !(dcGate8541.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8536')) &&
      !D2133.moRongUngVien(['8536'], 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện').some((x) => x.nhom === '8541') &&
      !D2133.moRongUngVien(['8541'], 'Tinh thể áp điện thạch anh đã lắp ráp dùng cho mạch dao động').some((x) => x.nhom === '8536'),
    { dcCauChi8536, dcCauChi8541, dcThachAnh8536, dcThachAnh8541 }
  );

  const ht116 = hoiTruoc2133({ moTa: moTaCa116, ungVien: ['8536', '8541'] });
  const distinctDk116 = new Set((ht116.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2133 hoi-truoc-4so] ca 116 với [8536, 8541] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht116.trangThai === TT2133.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk116 &&
      (ht116.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['8536', '8541'].every((h) => (ht116.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht116.trangThai, distinctDk116, nhanh: ht116.nhanh, dapAnDieuKien: ht116.dapAnDieuKien }
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
