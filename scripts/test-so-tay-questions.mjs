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
  // OZV-2178 / OZV-2181 / OZV-2185 / OZV-2195 / OZV-2198 / OZV-2204: nạp sớm trước khi nhomLienQuanSoTay dựng chỉ mục _canhSoTay lần đầu.
  for (const nh of ['8449', '8479', '8483', '8515', '5903', '5907', '8541', '8543', '8539', '9013']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
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

// ───────────── OZV-2151: cạnh loại trừ 2 chiều 85.12 <-> 85.36 cho ca 169 ─────────────
// "Bộ chống trộm xe máy điện / None / Kết nối còi và đèn xi nhan phát tín hiệu cảnh báo" (nhomNhan: ["8512"], heNhom: "8536").
{
  const S2151 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2151, soTayGates: soTayGates2151, nhomLienQuanSoTay: nhomLienQuan2151 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2151 } = require('../lib/hoi-theo-so-tay.js');
  const D2151 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2151, TRANG_THAI_4SO: TT2151 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2151 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8512', '8536']) {
    fs.copyFileSync(path.join(ROOT2151, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2151.datLai();

  const moTaCa169 = 'Bộ chống trộm xe máy điện / None / Kết nối còi và đèn xi nhan phát tín hiệu cảnh báo';

  const s8512 = JSON.parse(fs.readFileSync(path.join(ROOT2151, 'data', 'so-tay', '8512.json'), 'utf8'));
  const s8536 = JSON.parse(fs.readFileSync(path.join(ROOT2151, 'data', 'so-tay', '8536.json'), 'utf8'));
  const v8512 = S2151.verifySoTay(s8512, '8512');
  const v8536 = S2151.verifySoTay(s8536, '8536');
  assert(
    '[OZV-2151 verifySoTay] sổ tay 8512 và 8536 đạt 100% (0 mục bị loại)',
    v8512.loai.length === 0 && v8536.loai.length === 0,
    { loai8512: v8512.loai, loai8536: v8536.loai }
  );

  const st8512 = loadSoTay2151('8512');
  const st8536 = loadSoTay2151('8536');
  const lt8512 = (st8512?.loaiTru || []).find((x) => x.sangNhom === '8536');
  const lt8536 = (st8536?.loaiTru || []).find((x) => x.sangNhom === '8512');
  assert(
    '[OZV-2151 căn cứ] sổ tay 8512 và 8536 có mục loaiTru 2 chiều 8512 <-> 8536 kèm canCuLoaiTru nguyên văn từ nhom8512.nhom/nhom8536.nhom đạt checkItem',
    Boolean(
      lt8512 &&
        lt8512.nguon === 'nhom8512.nhom' &&
        lt8512.canCuLoaiTru?.nguon === 'nhom8536.nhom' &&
        !String(lt8512.dieuKien || '').includes(';') &&
        S2151.checkItem('loaiTru', lt8512, S2151.sourcesFor('8512'), '8512') === null
    ) &&
      Boolean(
        lt8536 &&
          lt8536.nguon === 'nhom8536.nhom' &&
          lt8536.canCuLoaiTru?.nguon === 'nhom8512.nhom' &&
          !String(lt8536.dieuKien || '').includes(';') &&
          lt8536.dieuKien !== lt8512.dieuKien &&
          S2151.checkItem('loaiTru', lt8536, S2151.sourcesFor('8536'), '8536') === null
      ),
    { lt8512, lt8536 }
  );

  const c5Tu8512 = D2151.canhTu('8512', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const c5Tu8536 = D2151.canhTu('8536', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8512');
  const c6Tu8512 = D2151.canhTu('8512', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const c6Tu8536 = D2151.canhTu('8536', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8512');
  const giua8512_8536 = D2151.canhGiuaNhomConSong(['8512', '8536']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8512 = D2151.moRongUngVien(['8512'], moTaCa169, { toiDa: 10 });
  const mrTu8536 = D2151.moRongUngVien(['8536'], moTaCa169, { toiDa: 10 });
  assert(
    '[OZV-2151 đồ thị 2 chiều] bảng cạnh có C5/C6 8512<->8536, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 169',
    c5Tu8512.some((e) => e.nguon === 'nhom8512.nhom' && e.canCuLoaiTru?.nguon === 'nhom8536.nhom') &&
      c5Tu8536.some((e) => e.nguon === 'nhom8536.nhom' && e.canCuLoaiTru?.nguon === 'nhom8512.nhom') &&
      c6Tu8512.length >= 1 &&
      c6Tu8536.length >= 1 &&
      giua8512_8536.length >= 2 &&
      mrTu8512.some((x) => x.nhom === '8536') &&
      mrTu8536.some((x) => x.nhom === '8512'),
    { c5Tu8512: c5Tu8512.length, c5Tu8536: c5Tu8536.length, giua: giua8512_8536.length, mrTu8512, mrTu8536 }
  );

  assert(
    '[OZV-2151 nhomLienQuanSoTay] liên kết hai chiều 8512 <-> 8536',
    nhomLienQuan2151('8512').includes('8536') && nhomLienQuan2151('8536').includes('8512'),
    { rel8512: nhomLienQuan2151('8512'), rel8536: nhomLienQuan2151('8536') }
  );

  const pb8512 = cauPhanBiet2151('8512', ['8512', '8536'], moTaCa169);
  assert(
    '[OZV-2151 thuận 8512->8536] 8512 đứng đầu với [8512, 8536] sinh câu phân biệt từ nhom8512.nhom trỏ sang 85.36',
    pb8512.length === 1 &&
      pb8512[0].loai === 'PHAN_BIET_NHOM' &&
      pb8512[0].canCu === 'so-tay' &&
      pb8512[0].nguon === 'nhom8512.nhom' &&
      /85\.36/.test(pb8512[0].questionVi) &&
      /85\.12/.test(pb8512[0].questionVi),
    { pb8512 }
  );

  const pb8536 = cauPhanBiet2151('8536', ['8536', '8512'], moTaCa169);
  assert(
    '[OZV-2151 thuận 8536->8512] 8536 đứng đầu với [8536, 8512] sinh câu phân biệt từ nhom8536.nhom trỏ sang 85.12',
    pb8536.length === 1 &&
      pb8536[0].loai === 'PHAN_BIET_NHOM' &&
      pb8536[0].canCu === 'so-tay' &&
      pb8536[0].nguon === 'nhom8536.nhom' &&
      /85\.12/.test(pb8536[0].questionVi) &&
      /85\.36/.test(pb8536[0].questionVi),
    { pb8536 }
  );

  const g8512To8536 = soTayGates2151({
    hs: '85123099',
    productText: 'Bộ chống trộm hoặc bộ điều khiển chỉ là thiết bị điện đóng ngắt, bảo vệ hay đấu nối mạch điện áp không quá 1000 V',
    productName: 'Bộ chống trộm chỉ là thiết bị điện đóng ngắt mạch điện áp không quá 1000 V',
    candidateHeadings: ['8512', '8536'],
  });
  const g8536To8512 = soTayGates2151({
    hs: '85365099',
    productText: 'Bộ chống trộm xe máy điện kết nối còi và đèn xi nhan phát tín hiệu âm thanh hoặc ánh sáng cảnh báo chuyên dùng cho xe có động cơ',
    productName: 'Bộ chống trộm xe máy điện phát tín hiệu cảnh báo',
    candidateHeadings: ['8536', '8512'],
  });
  assert(
    '[OZV-2151 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8512 -> 8536 và 8536 -> 8512',
    (g8512To8536.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8536')) &&
      (g8536To8512.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8512')),
    { g8512To8536: g8512To8536.challenges, g8536To8512: g8536To8512.challenges }
  );

  const dcGatNuoc8512 = cauPhanBiet2151('8512', ['8512', '8536'], 'Cần gạt nước kính chắn gió bằng điện dùng cho xe ô tô');
  const dcGatNuoc8536 = cauPhanBiet2151('8536', ['8536', '8512'], 'Cần gạt nước kính chắn gió bằng điện dùng cho xe ô tô');
  const dcCauChi8512 = cauPhanBiet2151('8512', ['8512', '8536'], 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện');
  const dcCauChi8536 = cauPhanBiet2151('8536', ['8536', '8512'], 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện');
  const dcGate8512 = soTayGates2151({
    hs: '85124000',
    productText: 'Cần gạt nước kính chắn gió bằng điện dùng cho xe ô tô',
    productName: 'Cần gạt nước kính chắn gió bằng điện',
    candidateHeadings: ['8512', '8536'],
  });
  const dcGate8536 = soTayGates2151({
    hs: '85361099',
    productText: 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện',
    productName: 'Cầu chì ống thủy tinh 10A 250V',
    candidateHeadings: ['8536', '8512'],
  });
  assert(
    '[OZV-2151 đối chứng] cần gạt nước kính chắn gió và cầu chì ống thủy tinh không hỏi oan / không kéo oan 85.12 <-> 85.36',
    dcGatNuoc8512.length === 0 &&
      dcGatNuoc8536.length === 0 &&
      dcCauChi8512.length === 0 &&
      dcCauChi8536.length === 0 &&
      !(dcGate8512.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8536')) &&
      !(dcGate8536.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8512')) &&
      !D2151.moRongUngVien(['8512'], 'Cần gạt nước kính chắn gió bằng điện dùng cho xe ô tô').some((x) => x.nhom === '8536') &&
      !D2151.moRongUngVien(['8536'], 'Cầu chì ống thủy tinh 10A 250V bảo vệ mạch điện').some((x) => x.nhom === '8512'),
    { dcGatNuoc8512, dcGatNuoc8536, dcCauChi8512, dcCauChi8536 }
  );

  const ht169 = hoiTruoc2151({ moTa: moTaCa169, ungVien: ['8512', '8536'] });
  const distinctDk169 = new Set((ht169.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2151 hoi-truoc-4so] ca 169 với [8512, 8536] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht169.trangThai === TT2151.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk169 &&
      (ht169.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['8512', '8536'].every((h) => (ht169.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht169.trangThai, distinctDk169, nhanh: ht169.nhanh, dapAnDieuKien: ht169.dapAnDieuKien }
  );
}

// ───────────── OZV-2178: cạnh loại trừ 2 chiều 84.49 <-> 84.79 cho ca 183 ─────────────
// "Máy dập quai hàn khẩu trang / None / dập quai hàn khẩu trang" (nhomNhan: ["8449","8515"], ungVien đứng đầu 8479).
{
  const S2178 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2178, soTayGates: soTayGates2178, nhomLienQuanSoTay: nhomLienQuan2178 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2178 } = require('../lib/hoi-theo-so-tay.js');
  const D2178 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2178, TRANG_THAI_4SO: TT2178 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2178 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8449', '8479']) {
    fs.copyFileSync(path.join(ROOT2178, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2178.datLai();

  const moTaCa183 = 'Máy dập quai hàn khẩu trang / None / dập quai hàn khẩu trang';

  const s8449 = JSON.parse(fs.readFileSync(path.join(ROOT2178, 'data', 'so-tay', '8449.json'), 'utf8'));
  const s8479 = JSON.parse(fs.readFileSync(path.join(ROOT2178, 'data', 'so-tay', '8479.json'), 'utf8'));
  const v8449 = S2178.verifySoTay(s8449, '8449');
  const v8479 = S2178.verifySoTay(s8479, '8479');
  assert(
    '[OZV-2178 verifySoTay] sổ tay 8449 và 8479 đạt 100% (0 mục bị loại)',
    v8449.loai.length === 0 && v8479.loai.length === 0,
    { loai8449: v8449.loai, loai8479: v8479.loai }
  );

  const st8449 = loadSoTay2178('8449');
  const st8479 = loadSoTay2178('8479');
  const lt8449 = (st8449?.loaiTru || []).find((x) => x.sangNhom === '8479');
  const lt8479 = (st8479?.loaiTru || []).find((x) => x.sangNhom === '8449');
  assert(
    '[OZV-2178 căn cứ] sổ tay 8449 và 8479 có mục loaiTru 2 chiều 8449 <-> 8479 kèm canCuLoaiTru nguyên văn từ nhom8449.nhom/nhom8479.nhom đạt checkItem',
    Boolean(
      lt8449 &&
        lt8449.nguon === 'nhom8449.nhom' &&
        lt8449.canCuLoaiTru?.nguon === 'nhom8479.nhom' &&
        !String(lt8449.dieuKien || '').includes(';') &&
        S2178.checkItem('loaiTru', lt8449, S2178.sourcesFor('8449'), '8449') === null
    ) &&
      Boolean(
        lt8479 &&
          lt8479.nguon === 'nhom8479.nhom' &&
          lt8479.canCuLoaiTru?.nguon === 'nhom8449.nhom' &&
          !String(lt8479.dieuKien || '').includes(';') &&
          lt8479.dieuKien !== lt8449.dieuKien &&
          S2178.checkItem('loaiTru', lt8479, S2178.sourcesFor('8479'), '8479') === null
      ),
    { lt8449, lt8479 }
  );

  const c5Tu8449 = D2178.canhTu('8449', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c5Tu8479 = D2178.canhTu('8479', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8449');
  const c6Tu8449 = D2178.canhTu('8449', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c6Tu8479 = D2178.canhTu('8479', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8449');
  const giua8449_8479 = D2178.canhGiuaNhomConSong(['8449', '8479']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8449 = D2178.moRongUngVien(['8449'], moTaCa183, { toiDa: 10 });
  const mrTu8479 = D2178.moRongUngVien(['8479'], moTaCa183, { toiDa: 10 });
  assert(
    '[OZV-2178 đồ thị 2 chiều] bảng cạnh có C5/C6 8449<->8479, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 183',
    c5Tu8449.some((e) => e.nguon === 'nhom8449.nhom' && e.canCuLoaiTru?.nguon === 'nhom8479.nhom') &&
      c5Tu8479.some((e) => e.nguon === 'nhom8479.nhom' && e.canCuLoaiTru?.nguon === 'nhom8449.nhom') &&
      c6Tu8449.length >= 1 &&
      c6Tu8479.length >= 1 &&
      giua8449_8479.length >= 2 &&
      mrTu8449.some((x) => x.nhom === '8479') &&
      mrTu8479.some((x) => x.nhom === '8449'),
    { c5Tu8449: c5Tu8449.length, c5Tu8479: c5Tu8479.length, giua: giua8449_8479.length, mrTu8449, mrTu8479 }
  );

  assert(
    '[OZV-2178 nhomLienQuanSoTay] liên kết hai chiều 8449 <-> 8479',
    nhomLienQuan2178('8449').includes('8479') && nhomLienQuan2178('8479').includes('8449'),
    { rel8449: nhomLienQuan2178('8449'), rel8479: nhomLienQuan2178('8479') }
  );

  const pb8449 = cauPhanBiet2178('8449', ['8449', '8479'], moTaCa183);
  assert(
    '[OZV-2178 thuận 8449->8479] 8449 đứng đầu với [8449, 8479] sinh câu phân biệt từ nhom8449.nhom trỏ sang 84.79',
    pb8449.length === 1 &&
      pb8449[0].loai === 'PHAN_BIET_NHOM' &&
      pb8449[0].canCu === 'so-tay' &&
      pb8449[0].nguon === 'nhom8449.nhom' &&
      /84\.79/.test(pb8449[0].questionVi) &&
      /84\.49/.test(pb8449[0].questionVi),
    { pb8449 }
  );

  const pb8479 = cauPhanBiet2178('8479', ['8479', '8449'], moTaCa183);
  assert(
    '[OZV-2178 thuận 8479->8449] 8479 đứng đầu với [8479, 8449] sinh câu phân biệt từ nhom8479.nhom trỏ sang 84.49',
    pb8479.length === 1 &&
      pb8479[0].loai === 'PHAN_BIET_NHOM' &&
      pb8479[0].canCu === 'so-tay' &&
      pb8479[0].nguon === 'nhom8479.nhom' &&
      /84\.49/.test(pb8479[0].questionVi) &&
      /84\.79/.test(pb8479[0].questionVi),
    { pb8479 }
  );

  const g8449To8479 = soTayGates2178({
    hs: '84490000',
    productText: 'Máy dập quai hàn khẩu trang là thiết bị cơ khí có chức năng riêng biệt chưa được chi tiết hoặc ghi ở nhóm khác của Chương 84',
    productName: 'Máy dập quai hàn khẩu trang chức năng riêng biệt',
    candidateHeadings: ['8449', '8479'],
  });
  const g8479To8449 = soTayGates2178({
    hs: '84798910',
    productText: 'Máy dập quai hàn khẩu trang bằng ép hoặc dập cơ khí gắn quai vào mặt hàng làm từ phớt hoặc vải không dệt',
    productName: 'Máy dập quai hàn khẩu trang ép cơ khí',
    candidateHeadings: ['8479', '8449'],
  });
  assert(
    '[OZV-2178 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8449 -> 8479 và 8479 -> 8449',
    (g8449To8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479')) &&
      (g8479To8449.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8449')),
    { g8449To8479: g8449To8479.challenges, g8479To8449: g8479To8449.challenges }
  );

  const dcPhot8449 = cauPhanBiet2178('8449', ['8449', '8479'], 'Máy sản xuất nỉ phớt bằng tấm kim loại có rãnh');
  const dcPhot8479 = cauPhanBiet2178('8479', ['8479', '8449'], 'Máy sản xuất nỉ phớt bằng tấm kim loại có rãnh');
  const dcRobot8449 = cauPhanBiet2178('8449', ['8449', '8479'], 'Robot công nghiệp đa năng có chức năng riêng biệt');
  const dcRobot8479 = cauPhanBiet2178('8479', ['8479', '8449'], 'Robot công nghiệp đa năng có chức năng riêng biệt');
  const dcGate8449 = soTayGates2178({
    hs: '84490000',
    productText: 'Máy sản xuất nỉ phớt bằng tấm kim loại có rãnh',
    productName: 'Máy sản xuất nỉ phớt',
    candidateHeadings: ['8449', '8479'],
  });
  const dcGate8479 = soTayGates2178({
    hs: '84798910',
    productText: 'Robot công nghiệp đa năng có chức năng riêng biệt',
    productName: 'Robot công nghiệp đa năng',
    candidateHeadings: ['8479', '8449'],
  });
  assert(
    '[OZV-2178 đối chứng] máy sản xuất nỉ phớt và robot công nghiệp không hỏi oan / không kéo oan 84.49 <-> 84.79',
    dcPhot8449.length === 0 &&
      dcPhot8479.length === 0 &&
      dcRobot8449.length === 0 &&
      dcRobot8479.length === 0 &&
      !(dcGate8449.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479')) &&
      !(dcGate8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8449')) &&
      !D2178.moRongUngVien(['8449'], 'Máy sản xuất nỉ phớt bằng tấm kim loại có rãnh').some((x) => x.nhom === '8479') &&
      !D2178.moRongUngVien(['8479'], 'Robot công nghiệp đa năng có chức năng riêng biệt').some((x) => x.nhom === '8449'),
    { dcPhot8449, dcPhot8479, dcRobot8449, dcRobot8479 }
  );

  const ht183 = hoiTruoc2178({ moTa: moTaCa183, ungVien: ['8479', '8449'] });
  const distinctDk183 = new Set((ht183.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2178 hoi-truoc-4so] ca 183 với [8479, 8449] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht183.trangThai === TT2178.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk183 &&
      (ht183.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['8449', '8479'].every((h) => (ht183.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht183.trangThai, distinctDk183, nhanh: ht183.nhanh, dapAnDieuKien: ht183.dapAnDieuKien }
  );
}

// ───────────── OZV-2181: cạnh loại trừ 2 chiều 84.79 <-> 84.83 cho ca 132 ─────────────
// "Con lăn đỡ trục cán bằng thép hợp kim dùng cho dây chuyền công nghiệp"
{
  const S2181 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2181, soTayGates: soTayGates2181, nhomLienQuanSoTay: nhomLienQuan2181 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2181 } = require('../lib/hoi-theo-so-tay.js');
  const D2181 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2181, TRANG_THAI_4SO: TT2181 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2181 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8479', '8483']) {
    fs.copyFileSync(path.join(ROOT2181, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2181.datLai();

  const moTaCa132 = 'Con lăn đỡ trục cán bằng thép hợp kim dùng cho dây chuyền công nghiệp';

  const s8479b = JSON.parse(fs.readFileSync(path.join(ROOT2181, 'data', 'so-tay', '8479.json'), 'utf8'));
  const s8483 = JSON.parse(fs.readFileSync(path.join(ROOT2181, 'data', 'so-tay', '8483.json'), 'utf8'));
  const v8479b = S2181.verifySoTay(s8479b, '8479');
  const v8483 = S2181.verifySoTay(s8483, '8483');
  assert(
    '[OZV-2181 verifySoTay] sổ tay 8479 và 8483 đạt 100% (0 mục bị loại)',
    v8479b.loai.length === 0 && v8483.loai.length === 0,
    { loai8479: v8479b.loai, loai8483: v8483.loai }
  );

  const st8479b = loadSoTay2181('8479');
  const st8483 = loadSoTay2181('8483');
  const lt8479to8483 = (st8479b?.loaiTru || []).find((x) => x.sangNhom === '8483');
  const lt8483to8479 = (st8483?.loaiTru || []).find((x) => x.sangNhom === '8479');
  assert(
    '[OZV-2181 căn cứ] sổ tay 8479 và 8483 có mục loaiTru 2 chiều 8479 <-> 8483 kèm canCuLoaiTru nguyên văn từ nhom8479.nhom/nhom8483.nhom đạt checkItem',
    Boolean(
      lt8479to8483 &&
        lt8479to8483.nguon === 'nhom8479.nhom' &&
        lt8479to8483.canCuLoaiTru?.nguon === 'nhom8483.nhom' &&
        !String(lt8479to8483.dieuKien || '').includes(';') &&
        S2181.checkItem('loaiTru', lt8479to8483, S2181.sourcesFor('8479'), '8479') === null
    ) &&
      Boolean(
        lt8483to8479 &&
          lt8483to8479.nguon === 'nhom8483.nhom' &&
          lt8483to8479.canCuLoaiTru?.nguon === 'nhom8479.nhom' &&
          !String(lt8483to8479.dieuKien || '').includes(';') &&
          lt8483to8479.dieuKien !== lt8479to8483.dieuKien &&
          S2181.checkItem('loaiTru', lt8483to8479, S2181.sourcesFor('8483'), '8483') === null
      ),
    { lt8479to8483, lt8483to8479 }
  );

  const c5Tu8479 = D2181.canhTu('8479', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8483');
  const c5Tu8483 = D2181.canhTu('8483', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c6Tu8479 = D2181.canhTu('8479', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8483');
  const c6Tu8483 = D2181.canhTu('8483', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const giua8479_8483 = D2181.canhGiuaNhomConSong(['8479', '8483']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8479 = D2181.moRongUngVien(['8479'], moTaCa132, { toiDa: 10 });
  const mrTu8483 = D2181.moRongUngVien(['8483'], moTaCa132, { toiDa: 10 });
  assert(
    '[OZV-2181 đồ thị 2 chiều] bảng cạnh có C5/C6 8479<->8483, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 132',
    c5Tu8479.some((e) => e.nguon === 'nhom8479.nhom' && e.canCuLoaiTru?.nguon === 'nhom8483.nhom') &&
      c5Tu8483.some((e) => e.nguon === 'nhom8483.nhom' && e.canCuLoaiTru?.nguon === 'nhom8479.nhom') &&
      c6Tu8479.length >= 1 &&
      c6Tu8483.length >= 1 &&
      giua8479_8483.length >= 2 &&
      mrTu8479.some((x) => x.nhom === '8483') &&
      mrTu8483.some((x) => x.nhom === '8479'),
    { c5Tu8479: c5Tu8479.length, c5Tu8483: c5Tu8483.length, giua: giua8479_8483.length, mrTu8479, mrTu8483 }
  );

  assert(
    '[OZV-2181 nhomLienQuanSoTay] liên kết hai chiều 8479 <-> 8483',
    nhomLienQuan2181('8479').includes('8483') && nhomLienQuan2181('8483').includes('8479'),
    { rel8479: nhomLienQuan2181('8479'), rel8483: nhomLienQuan2181('8483') }
  );

  const pb8479 = cauPhanBiet2181('8479', ['8479', '8483'], moTaCa132);
  assert(
    '[OZV-2181 thuận 8479->8483] 8479 đứng đầu với [8479, 8483] sinh câu phân biệt từ nhom8479.nhom trỏ sang 84.83',
    pb8479.length === 1 &&
      pb8479[0].loai === 'PHAN_BIET_NHOM' &&
      pb8479[0].canCu === 'so-tay' &&
      pb8479[0].nguon === 'nhom8479.nhom' &&
      /84\.83/.test(pb8479[0].questionVi) &&
      /84\.79/.test(pb8479[0].questionVi),
    { pb8479 }
  );

  const pb8483 = cauPhanBiet2181('8483', ['8483', '8479'], moTaCa132);
  assert(
    '[OZV-2181 thuận 8483->8479] 8483 đứng đầu với [8483, 8479] sinh câu phân biệt từ nhom8483.nhom trỏ sang 84.79',
    pb8483.length === 1 &&
      pb8483[0].loai === 'PHAN_BIET_NHOM' &&
      pb8483[0].canCu === 'so-tay' &&
      pb8483[0].nguon === 'nhom8483.nhom' &&
      /84\.79/.test(pb8483[0].questionVi) &&
      /84\.83/.test(pb8483[0].questionVi),
    { pb8483 }
  );

  const g8479To8483 = soTayGates2181({
    hs: '84798910',
    productText: 'Con lăn đỡ trục cán bằng thép hợp kim là gối đỡ trục hoặc thân ổ dùng để đỡ trục truyền lực trong dây chuyền công nghiệp',
    productName: 'Con lăn đỡ trục cán gối đỡ',
    candidateHeadings: ['8479', '8483'],
  });
  const g8483To8479 = soTayGates2181({
    hs: '84833090',
    productText: 'Con lăn đỡ trục cán bằng thép hợp kim là máy hoặc thiết bị cơ khí có chức năng riêng biệt chưa được chi tiết hoặc ghi ở nhóm khác của Chương 84',
    productName: 'Con lăn đỡ trục cán chức năng riêng biệt',
    candidateHeadings: ['8483', '8479'],
  });
  assert(
    '[OZV-2181 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8479 -> 8483 và 8483 -> 8479',
    (g8479To8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483')) &&
      (g8483To8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479')),
    { g8479To8483: g8479To8483.challenges, g8483To8479: g8483To8479.challenges }
  );

  const dcHopSo8479 = cauPhanBiet2181('8479', ['8479', '8483'], 'Hộp số điều tốc dùng cho xe thuộc nhóm 87.11');
  const dcHopSo8483 = cauPhanBiet2181('8483', ['8483', '8479'], 'Hộp số điều tốc dùng cho xe thuộc nhóm 87.11');
  const dcRobot8479 = cauPhanBiet2181('8479', ['8479', '8483'], 'Robot công nghiệp đa năng có chức năng riêng biệt');
  const dcRobot8483 = cauPhanBiet2181('8483', ['8483', '8479'], 'Robot công nghiệp đa năng có chức năng riêng biệt');
  const dcGate8479 = soTayGates2181({
    hs: '84798910',
    productText: 'Robot công nghiệp đa năng có chức năng riêng biệt',
    productName: 'Robot công nghiệp đa năng',
    candidateHeadings: ['8479', '8483'],
  });
  const dcGate8483 = soTayGates2181({
    hs: '84834090',
    productText: 'Hộp số điều tốc dùng cho xe thuộc nhóm 87.11',
    productName: 'Hộp số điều tốc xe',
    candidateHeadings: ['8483', '8479'],
  });
  assert(
    '[OZV-2181 đối chứng] hộp số xe và robot công nghiệp không hỏi oan / không kéo oan 84.79 <-> 84.83',
    dcHopSo8479.length === 0 &&
      dcHopSo8483.length === 0 &&
      dcRobot8479.length === 0 &&
      dcRobot8483.length === 0 &&
      !(dcGate8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483')) &&
      !(dcGate8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479')) &&
      !D2181.moRongUngVien(['8479'], 'Robot công nghiệp đa năng có chức năng riêng biệt').some((x) => x.nhom === '8483') &&
      !D2181.moRongUngVien(['8483'], 'Hộp số điều tốc dùng cho xe thuộc nhóm 87.11').some((x) => x.nhom === '8479'),
    { dcHopSo8479, dcHopSo8483, dcRobot8479, dcRobot8483 }
  );

  const ht132 = hoiTruoc2181({ moTa: moTaCa132, ungVien: ['8479', '8483'] });
  const distinctDk132 = new Set((ht132.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2181 hoi-truoc-4so] ca 132 với [8479, 8483] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht132.trangThai === TT2181.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk132 &&
      (ht132.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['8479', '8483'].every((h) => (ht132.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht132.trangThai, distinctDk132, nhanh: ht132.nhanh, dapAnDieuKien: ht132.dapAnDieuKien }
  );
}

// ───────────── OZV-2185: cạnh loại trừ 2 chiều 84.79 <-> 85.15 cho ca 183 ─────────────
// "Máy dập quai hàn khẩu trang / None / dập quai hàn khẩu trang" (tập nhóm 8515, 8449, 8479 — thiếu cặp 84.79 <-> 85.15).
{
  const S2185 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2185, soTayGates: soTayGates2185, nhomLienQuanSoTay: nhomLienQuan2185 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2185 } = require('../lib/hoi-theo-so-tay.js');
  const D2185 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2185, TRANG_THAI_4SO: TT2185 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2185 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8479', '8515']) {
    fs.copyFileSync(path.join(ROOT2185, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2185.datLai();

  const moTaCa183b = 'Máy dập quai hàn khẩu trang / None / dập quai hàn khẩu trang';

  const s8479c = JSON.parse(fs.readFileSync(path.join(ROOT2185, 'data', 'so-tay', '8479.json'), 'utf8'));
  const s8515 = JSON.parse(fs.readFileSync(path.join(ROOT2185, 'data', 'so-tay', '8515.json'), 'utf8'));
  const v8479c = S2185.verifySoTay(s8479c, '8479');
  const v8515 = S2185.verifySoTay(s8515, '8515');
  assert(
    '[OZV-2185 verifySoTay] sổ tay 8479 và 8515 đạt 100% (0 mục bị loại)',
    v8479c.loai.length === 0 && v8515.loai.length === 0,
    { loai8479: v8479c.loai, loai8515: v8515.loai }
  );

  const st8479c = loadSoTay2185('8479');
  const st8515 = loadSoTay2185('8515');
  const lt8479to8515 = (st8479c?.loaiTru || []).find((x) => x.sangNhom === '8515');
  const lt8515to8479 = (st8515?.loaiTru || []).find((x) => x.sangNhom === '8479');
  assert(
    '[OZV-2185 căn cứ] sổ tay 8479 và 8515 có mục loaiTru 2 chiều 8479 <-> 8515 kèm canCuLoaiTru nguyên văn từ nhom8479.nhom/nhom8515.nhom đạt checkItem',
    Boolean(
      lt8479to8515 &&
        lt8479to8515.nguon === 'nhom8479.nhom' &&
        lt8479to8515.canCuLoaiTru?.nguon === 'nhom8515.nhom' &&
        !String(lt8479to8515.dieuKien || '').includes(';') &&
        S2185.checkItem('loaiTru', lt8479to8515, S2185.sourcesFor('8479'), '8479') === null
    ) &&
      Boolean(
        lt8515to8479 &&
          lt8515to8479.nguon === 'nhom8515.nhom' &&
          lt8515to8479.canCuLoaiTru?.nguon === 'nhom8479.nhom' &&
          !String(lt8515to8479.dieuKien || '').includes(';') &&
          lt8515to8479.dieuKien !== lt8479to8515.dieuKien &&
          S2185.checkItem('loaiTru', lt8515to8479, S2185.sourcesFor('8515'), '8515') === null
      ),
    { lt8479to8515, lt8515to8479 }
  );

  const c5Tu8479b = D2185.canhTu('8479', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8515');
  const c5Tu8515 = D2185.canhTu('8515', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c6Tu8479b = D2185.canhTu('8479', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8515');
  const c6Tu8515 = D2185.canhTu('8515', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const giua8479_8515 = D2185.canhGiuaNhomConSong(['8479', '8515']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8479b = D2185.moRongUngVien(['8479'], moTaCa183b, { toiDa: 10 });
  const mrTu8515 = D2185.moRongUngVien(['8515'], moTaCa183b, { toiDa: 10 });
  assert(
    '[OZV-2185 đồ thị 2 chiều] bảng cạnh có C5/C6 8479<->8515, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 183',
    c5Tu8479b.some((e) => e.nguon === 'nhom8479.nhom' && e.canCuLoaiTru?.nguon === 'nhom8515.nhom') &&
      c5Tu8515.some((e) => e.nguon === 'nhom8515.nhom' && e.canCuLoaiTru?.nguon === 'nhom8479.nhom') &&
      c6Tu8479b.length >= 1 &&
      c6Tu8515.length >= 1 &&
      giua8479_8515.length >= 2 &&
      mrTu8479b.some((x) => x.nhom === '8515') &&
      mrTu8515.some((x) => x.nhom === '8479'),
    { c5Tu8479: c5Tu8479b.length, c5Tu8515: c5Tu8515.length, giua: giua8479_8515.length, mrTu8479b, mrTu8515 }
  );

  assert(
    '[OZV-2185 nhomLienQuanSoTay] liên kết hai chiều 8479 <-> 8515',
    nhomLienQuan2185('8479').includes('8515') && nhomLienQuan2185('8515').includes('8479'),
    { rel8479: nhomLienQuan2185('8479'), rel8515: nhomLienQuan2185('8515') }
  );

  const pb8479b = cauPhanBiet2185('8479', ['8479', '8515'], moTaCa183b);
  assert(
    '[OZV-2185 thuận 8479->8515] 8479 đứng đầu với [8479, 8515] sinh câu phân biệt từ nhom8479.nhom trỏ sang 85.15',
    pb8479b.length === 1 &&
      pb8479b[0].loai === 'PHAN_BIET_NHOM' &&
      pb8479b[0].canCu === 'so-tay' &&
      pb8479b[0].nguon === 'nhom8479.nhom' &&
      /85\.15/.test(pb8479b[0].questionVi) &&
      /84\.79/.test(pb8479b[0].questionVi),
    { pb8479b }
  );

  const pb8515 = cauPhanBiet2185('8515', ['8515', '8479'], moTaCa183b);
  assert(
    '[OZV-2185 thuận 8515->8479] 8515 đứng đầu với [8515, 8479] sinh câu phân biệt từ nhom8515.nhom trỏ sang 84.79',
    pb8515.length === 1 &&
      pb8515[0].loai === 'PHAN_BIET_NHOM' &&
      pb8515[0].canCu === 'so-tay' &&
      pb8515[0].nguon === 'nhom8515.nhom' &&
      /84\.79/.test(pb8515[0].questionVi) &&
      /85\.15/.test(pb8515[0].questionVi),
    { pb8515 }
  );

  const g8479To8515 = soTayGates2185({
    hs: '84798910',
    productText: 'Máy dập quai hàn khẩu trang bằng hàn siêu âm hoặc hàn điện',
    productName: 'Máy dập quai hàn khẩu trang hàn siêu âm',
    candidateHeadings: ['8479', '8515'],
  });
  const g8515To8479 = soTayGates2185({
    hs: '85158090',
    productText: 'Máy dập quai hàn khẩu trang là thiết bị cơ khí có chức năng riêng biệt chưa được chi tiết hoặc ghi ở nhóm khác của Chương 84',
    productName: 'Máy dập quai hàn khẩu trang chức năng riêng biệt',
    candidateHeadings: ['8515', '8479'],
  });
  assert(
    '[OZV-2185 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8479 -> 8515 và 8515 -> 8479',
    (g8479To8515.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8515')) &&
      (g8515To8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479')),
    { g8479To8515: g8479To8515.challenges, g8515To8479: g8515To8479.challenges }
  );

  const dcHan8479 = cauPhanBiet2185('8479', ['8479', '8515'], 'Máy hàn siêu âm kim loại tấm');
  const dcHan8515 = cauPhanBiet2185('8515', ['8515', '8479'], 'Máy hàn siêu âm kim loại tấm');
  const dcRobot8479b = cauPhanBiet2185('8479', ['8479', '8515'], 'Robot công nghiệp đa năng có chức năng riêng biệt');
  const dcRobot8515 = cauPhanBiet2185('8515', ['8515', '8479'], 'Robot công nghiệp đa năng có chức năng riêng biệt');
  const dcGate8479b = soTayGates2185({
    hs: '84798910',
    productText: 'Robot công nghiệp đa năng có chức năng riêng biệt',
    productName: 'Robot công nghiệp đa năng',
    candidateHeadings: ['8479', '8515'],
  });
  const dcGate8515 = soTayGates2185({
    hs: '85158090',
    productText: 'Máy hàn siêu âm kim loại tấm',
    productName: 'Máy hàn siêu âm kim loại',
    candidateHeadings: ['8515', '8479'],
  });
  assert(
    '[OZV-2185 đối chứng] máy hàn siêu âm kim loại và robot công nghiệp không hỏi oan / không kéo oan 84.79 <-> 85.15',
    dcHan8479.length === 0 &&
      dcHan8515.length === 0 &&
      dcRobot8479b.length === 0 &&
      dcRobot8515.length === 0 &&
      !(dcGate8479b.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8515')) &&
      !(dcGate8515.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479')) &&
      !D2185.moRongUngVien(['8479'], 'Robot công nghiệp đa năng có chức năng riêng biệt').some((x) => x.nhom === '8515') &&
      !D2185.moRongUngVien(['8515'], 'Máy hàn siêu âm kim loại tấm').some((x) => x.nhom === '8479'),
    { dcHan8479, dcHan8515, dcRobot8479b, dcRobot8515 }
  );

  const ht183b = hoiTruoc2185({ moTa: moTaCa183b, ungVien: ['8479', '8515'] });
  const distinctDk183b = new Set((ht183b.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2185 hoi-truoc-4so] ca 183 với [8479, 8515] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht183b.trangThai === TT2185.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk183b &&
      (ht183b.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['8479', '8515'].every((h) => (ht183b.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht183b.trangThai, distinctDk183b, nhanh: ht183b.nhanh, dapAnDieuKien: ht183b.dapAnDieuKien }
  );
}


// ───────────── OZV-2195: cạnh loại trừ 2 chiều 59.03 <-> 59.07 cho ca 124 ─────────────
// "Vải gió dệt kim / None / None" (nhánh B phân vân [6005, 6006, 6004, 5903, 5907]).
{
  const S2195 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2195, soTayGates: soTayGates2195, nhomLienQuanSoTay: nhomLienQuan2195 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2195 } = require('../lib/hoi-theo-so-tay.js');
  const D2195 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2195, TRANG_THAI_4SO: TT2195 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2195 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['5903', '5907']) {
    fs.copyFileSync(path.join(ROOT2195, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2195.datLai();

  const moTaCa124 = 'Vải gió dệt kim / None / None';

  const s5903 = JSON.parse(fs.readFileSync(path.join(ROOT2195, 'data', 'so-tay', '5903.json'), 'utf8'));
  const s5907 = JSON.parse(fs.readFileSync(path.join(ROOT2195, 'data', 'so-tay', '5907.json'), 'utf8'));
  const v5903 = S2195.verifySoTay(s5903, '5903');
  const v5907 = S2195.verifySoTay(s5907, '5907');
  assert(
    '[OZV-2195 verifySoTay] sổ tay 5903 và 5907 đạt 100% (0 mục bị loại)',
    v5903.loai.length === 0 && v5907.loai.length === 0,
    { loai5903: v5903.loai, loai5907: v5907.loai }
  );

  const st5903 = loadSoTay2195('5903');
  const st5907 = loadSoTay2195('5907');
  const lt5903to5907 = (st5903?.loaiTru || []).find((x) => x.sangNhom === '5907' && x.canCuLoaiTru?.nguon === 'nhom5907.nhom');
  const lt5907to5903 = (st5907?.loaiTru || []).find((x) => x.sangNhom === '5903' && x.canCuLoaiTru?.nguon === 'nhom5903.nhom');
  assert(
    '[OZV-2195 căn cứ] sổ tay 5903 và 5907 có mục loaiTru 2 chiều 5903 <-> 5907 kèm canCuLoaiTru nguyên văn từ nhom5903.nhom/nhom5907.nhom đạt checkItem',
    Boolean(
      lt5903to5907 &&
        lt5903to5907.nguon === 'nhom5903.nhom' &&
        lt5903to5907.canCuLoaiTru?.nguon === 'nhom5907.nhom' &&
        !String(lt5903to5907.dieuKien || '').includes(';') &&
        S2195.checkItem('loaiTru', lt5903to5907, S2195.sourcesFor('5903'), '5903') === null
    ) &&
      Boolean(
        lt5907to5903 &&
          lt5907to5903.nguon === 'nhom5907.nhom' &&
          lt5907to5903.canCuLoaiTru?.nguon === 'nhom5903.nhom' &&
          !String(lt5907to5903.dieuKien || '').includes(';') &&
          lt5907to5903.dieuKien !== lt5903to5907.dieuKien &&
          S2195.checkItem('loaiTru', lt5907to5903, S2195.sourcesFor('5907'), '5907') === null
      ),
    { lt5903to5907, lt5907to5903 }
  );

  const c5Tu5903 = D2195.canhTu('5903', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const c5Tu5907 = D2195.canhTu('5907', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const c6Tu5903 = D2195.canhTu('5903', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const c6Tu5907 = D2195.canhTu('5907', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const giua5903_5907 = D2195.canhGiuaNhomConSong(['5903', '5907']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5903 = D2195.moRongUngVien(['5903'], moTaCa124, { toiDa: 10 });
  const mrTu5907 = D2195.moRongUngVien(['5907'], moTaCa124, { toiDa: 10 });
  assert(
    '[OZV-2195 đồ thị 2 chiều] bảng cạnh có C5/C6 5903<->5907, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu5903.some((e) => e.nguon === 'nhom5903.nhom' && e.canCuLoaiTru?.nguon === 'nhom5907.nhom') &&
      c5Tu5907.some((e) => e.nguon === 'nhom5907.nhom' && e.canCuLoaiTru?.nguon === 'nhom5903.nhom') &&
      c6Tu5903.length >= 1 &&
      c6Tu5907.length >= 1 &&
      giua5903_5907.length >= 2 &&
      mrTu5903.some((x) => x.nhom === '5907') &&
      mrTu5907.some((x) => x.nhom === '5903'),
    { c5Tu5903: c5Tu5903.length, c5Tu5907: c5Tu5907.length, giua: giua5903_5907.length, mrTu5903, mrTu5907 }
  );

  assert(
    '[OZV-2195 nhomLienQuanSoTay] liên kết hai chiều 5903 <-> 5907',
    nhomLienQuan2195('5903').includes('5907') && nhomLienQuan2195('5907').includes('5903'),
    { rel5903: nhomLienQuan2195('5903'), rel5907: nhomLienQuan2195('5907') }
  );

  const pb5903 = cauPhanBiet2195('5903', ['5903', '5907'], moTaCa124);
  assert(
    '[OZV-2195 thuận 5903->5907] 5903 đứng đầu với [5903, 5907] sinh câu phân biệt từ nhom5903.nhom trỏ sang 59.07',
    pb5903.length === 1 &&
      pb5903[0].loai === 'PHAN_BIET_NHOM' &&
      pb5903[0].canCu === 'so-tay' &&
      pb5903[0].nguon === 'nhom5903.nhom' &&
      /59\.07/.test(pb5903[0].questionVi) &&
      /59\.03/.test(pb5903[0].questionVi),
    { pb5903 }
  );

  const pb5907 = cauPhanBiet2195('5907', ['5907', '5903'], moTaCa124);
  assert(
    '[OZV-2195 thuận 5907->5903] 5907 đứng đầu với [5907, 5903] sinh câu phân biệt từ nhom5907.nhom trỏ sang 59.03',
    pb5907.length === 1 &&
      pb5907[0].loai === 'PHAN_BIET_NHOM' &&
      pb5907[0].canCu === 'so-tay' &&
      pb5907[0].nguon === 'nhom5907.nhom' &&
      /59\.03/.test(pb5907[0].questionVi) &&
      /59\.07/.test(pb5907[0].questionVi),
    { pb5907 }
  );

  const g5903To5907 = soTayGates2195({
    hs: '59032000',
    productText: moTaCa124,
    productName: 'Vải gió dệt kim',
    candidateHeadings: ['5903', '5907'],
    pool: [{ h4: '5907', from: 'test' }],
  });
  const g5907To5903 = soTayGates2195({
    hs: '59070090',
    productText: moTaCa124,
    productName: 'Vải gió dệt kim',
    candidateHeadings: ['5907', '5903'],
    pool: [{ h4: '5903', from: 'test' }],
  });
  assert(
    '[OZV-2195 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5903 -> 5907 và 5907 -> 5903',
    (g5903To5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5907')) &&
      (g5907To5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')),
    { g5903To5907: g5903To5907.challenges, g5907To5903: g5907To5903.challenges }
  );

  const dcBangTamThuoc = 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ';
  const dcNhanPhuHieu = 'Nhãn, phù hiệu và các mặt hàng tương tự, dệt kim hoặc móc';
  const dcBang5903 = cauPhanBiet2195('5903', ['5903', '5907'], dcBangTamThuoc);
  const dcBang5907 = cauPhanBiet2195('5907', ['5907', '5903'], dcBangTamThuoc);
  const dcNhan5903 = cauPhanBiet2195('5903', ['5903', '5907'], dcNhanPhuHieu);
  const dcNhan5907 = cauPhanBiet2195('5907', ['5907', '5903'], dcNhanPhuHieu);
  const dcGate5903 = soTayGates2195({
    hs: '59031010',
    productText: dcBangTamThuoc,
    productName: 'Băng đã tẩm thuốc',
    candidateHeadings: ['5903', '5907'],
  });
  const dcGate5907 = soTayGates2195({
    hs: '59070090',
    productText: dcNhanPhuHieu,
    productName: 'Nhãn phù hiệu dệt kim',
    candidateHeadings: ['5907', '5903'],
  });
  assert(
    '[OZV-2195 đối chứng] băng tẩm thuốc và nhãn phù hiệu không hỏi oan / không kéo oan 59.03 <-> 59.07',
    dcBang5903.length === 0 &&
      dcBang5907.length === 0 &&
      dcNhan5903.length === 0 &&
      dcNhan5907.length === 0 &&
      !(dcGate5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5907')) &&
      !(dcGate5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')) &&
      !D2195.moRongUngVien(['5903'], dcBangTamThuoc).some((x) => x.nhom === '5907') &&
      !D2195.moRongUngVien(['5907'], dcNhanPhuHieu).some((x) => x.nhom === '5903'),
    { dcBang5903, dcBang5907, dcNhan5903, dcNhan5907 }
  );

  const ht124 = hoiTruoc2195({ moTa: moTaCa124, ungVien: ['5903', '5907'] });
  const distinctDk124 = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2195 hoi-truoc-4so] ca 124 với [5903, 5907] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht124.trangThai === TT2195.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk124 &&
      (ht124.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['5903', '5907'].every((h) => (ht124.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht124.trangThai, distinctDk124, nhanh: ht124.nhanh, dapAnDieuKien: ht124.dapAnDieuKien }
  );
}

// ───────────── OZV-2198: cạnh loại trừ 2 chiều 85.41 <-> 85.43 cho ca 162 ─────────────
// "Đầu chiếu tia Laser / Chiếu tia sáng chấm đỏ" — khép tam giác [9013, 8541, 8543].
{
  const S2198 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2198, soTayGates: soTayGates2198, nhomLienQuanSoTay: nhomLienQuan2198 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2198 } = require('../lib/hoi-theo-so-tay.js');
  const D2198 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2198, TRANG_THAI_4SO: TT2198 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2198 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8541', '8543', '9013']) {
    fs.copyFileSync(path.join(ROOT2198, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2198.datLai();

  const moTaCa162 = 'Đầu chiếu tia Laser / None / Chiếu tia sáng chấm đỏ';

  const s8541 = JSON.parse(fs.readFileSync(path.join(ROOT2198, 'data', 'so-tay', '8541.json'), 'utf8'));
  const s8543 = JSON.parse(fs.readFileSync(path.join(ROOT2198, 'data', 'so-tay', '8543.json'), 'utf8'));
  const v8541 = S2198.verifySoTay(s8541, '8541');
  const v8543 = S2198.verifySoTay(s8543, '8543');
  assert(
    '[OZV-2198 verifySoTay] sổ tay 8541 và 8543 đạt 100% (0 mục bị loại) và kiemTra khớp',
    v8541.loai.length === 0 &&
      v8541.dat === v8541.tong &&
      s8541.kiemTra?.tong === v8541.tong &&
      s8541.kiemTra?.dat === v8541.dat &&
      v8543.loai.length === 0 &&
      v8543.dat === v8543.tong &&
      s8543.kiemTra?.tong === v8543.tong &&
      s8543.kiemTra?.dat === v8543.dat,
    { loai8541: v8541.loai, loai8543: v8543.loai, kt8541: s8541.kiemTra, v8541, kt8543: s8543.kiemTra, v8543 }
  );

  const st8541 = loadSoTay2198('8541');
  const st8543 = loadSoTay2198('8543');
  const lt8541 = (st8541?.loaiTru || []).find((x) => x.sangNhom === '8543');
  const lt8543 = (st8543?.loaiTru || []).find((x) => x.sangNhom === '8541');
  assert(
    '[OZV-2198 căn cứ] sổ tay 8541 và 8543 có mục loaiTru 2 chiều 8541 <-> 8543 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8541 &&
        lt8541.nguon === 'nhom8541.nhom' &&
        lt8541.canCuLoaiTru?.nguon === 'nhom8543.nhom' &&
        !String(lt8541.dieuKien || '').includes(';') &&
        S2198.checkItem('loaiTru', lt8541, S2198.sourcesFor('8541'), '8541') === null
    ) &&
      Boolean(
        lt8543 &&
          lt8543.nguon === 'nhom8543.nhom' &&
          lt8543.canCuLoaiTru?.nguon === 'nhom8541.nhom' &&
          !String(lt8543.dieuKien || '').includes(';') &&
          lt8543.dieuKien !== lt8541.dieuKien &&
          S2198.checkItem('loaiTru', lt8543, S2198.sourcesFor('8543'), '8543') === null
      ),
    { lt8541, lt8543 }
  );

  const c5Tu8541 = D2198.canhTu('8541', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8543');
  const c5Tu8543 = D2198.canhTu('8543', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const c6Tu8541 = D2198.canhTu('8541', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8543');
  const c6Tu8543 = D2198.canhTu('8543', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const giua8541_8543 = D2198.canhGiuaNhomConSong(['8541', '8543']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8541 = D2198.moRongUngVien(['8541'], moTaCa162, { toiDa: 10 });
  const mrTu8543 = D2198.moRongUngVien(['8543'], moTaCa162, { toiDa: 10 });
  assert(
    '[OZV-2198 đồ thị 2 chiều] bảng cạnh có C5/C6 8541<->8543, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 162',
    c5Tu8541.some((e) => e.nguon === 'nhom8541.nhom' && e.canCuLoaiTru?.nguon === 'nhom8543.nhom') &&
      c5Tu8543.some((e) => e.nguon === 'nhom8543.nhom' && e.canCuLoaiTru?.nguon === 'nhom8541.nhom') &&
      c6Tu8541.length >= 1 &&
      c6Tu8543.length >= 1 &&
      giua8541_8543.length >= 2 &&
      mrTu8541.some((x) => x.nhom === '8543') &&
      mrTu8543.some((x) => x.nhom === '8541'),
    { c5Tu8541: c5Tu8541.length, c5Tu8543: c5Tu8543.length, giua: giua8541_8543.length, mrTu8541, mrTu8543 }
  );

  const tamGiac = ['9013', '8541', '8543'];
  const canhTamGiac = D2198.canhGiuaNhomConSong(tamGiac).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const capCan = [
    ['9013', '8541'],
    ['9013', '8543'],
    ['8541', '8543'],
  ];
  assert(
    '[OZV-2198 tam giác] cụm [9013, 8541, 8543] có đủ 3 cặp cạnh C5/C6 hai chiều',
    capCan.every(([a, b]) => {
      const ab = canhTamGiac.some((e) => e.tu === a && e.toi === b);
      const ba = canhTamGiac.some((e) => e.tu === b && e.toi === a);
      return ab && ba;
    }) && canhTamGiac.length >= 6,
    { canhTamGiac: canhTamGiac.length, pairs: capCan }
  );

  assert(
    '[OZV-2198 nhomLienQuanSoTay] liên kết hai chiều 8541 <-> 8543',
    nhomLienQuan2198('8541').includes('8543') && nhomLienQuan2198('8543').includes('8541'),
    { rel8541: nhomLienQuan2198('8541'), rel8543: nhomLienQuan2198('8543') }
  );

  const pb8541 = cauPhanBiet2198('8541', ['8541', '8543'], moTaCa162);
  assert(
    '[OZV-2198 thuận 8541->8543] 8541 đứng đầu với [8541, 8543] sinh câu phân biệt từ nhom8541.nhom trỏ sang 85.43',
    pb8541.length === 1 &&
      pb8541[0].loai === 'PHAN_BIET_NHOM' &&
      pb8541[0].canCu === 'so-tay' &&
      pb8541[0].nguon === 'nhom8541.nhom' &&
      /85\.43/.test(pb8541[0].questionVi) &&
      /85\.41/.test(pb8541[0].questionVi),
    { pb8541 }
  );

  const pb8543 = cauPhanBiet2198('8543', ['8543', '8541'], moTaCa162);
  assert(
    '[OZV-2198 thuận 8543->8541] 8543 đứng đầu với [8543, 8541] sinh câu phân biệt từ nhom8543.nhom trỏ sang 85.41',
    pb8543.length === 1 &&
      pb8543[0].loai === 'PHAN_BIET_NHOM' &&
      pb8543[0].canCu === 'so-tay' &&
      pb8543[0].nguon === 'nhom8543.nhom' &&
      /85\.41/.test(pb8543[0].questionVi) &&
      /85\.43/.test(pb8543[0].questionVi),
    { pb8543 }
  );

  const g8541To8543 = soTayGates2198({
    hs: '85414900',
    productText:
      'Đầu chiếu tia laser là máy hoặc thiết bị điện có chức năng riêng chưa được chi tiết hay ghi ở nơi khác trong Chương 85 (không phải linh kiện đi-ốt laser / LED / thiết bị bán dẫn cảm quang rời)',
    productName: 'Đầu chiếu tia laser là máy điện chức năng riêng',
    candidateHeadings: ['8541', '8543'],
  });
  const g8543To8541 = soTayGates2198({
    hs: '85437090',
    productText:
      'Đầu chiếu tia laser chỉ là linh kiện đi-ốt laser chất bán dẫn, LED hoặc thiết bị bán dẫn cảm quang thuộc nhóm 85.41, chưa phải máy hoặc thiết bị điện hoàn chỉnh có chức năng riêng',
    productName: 'Đầu chiếu tia laser chỉ là đi-ốt laser',
    candidateHeadings: ['8543', '8541'],
  });
  assert(
    '[OZV-2198 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8541 -> 8543 và 8543 -> 8541',
    (g8541To8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8543')) &&
      (g8543To8541.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541')),
    { g8541To8543: g8541To8543.challenges, g8543To8541: g8543To8541.challenges }
  );

  const dcBienAp8541 = cauPhanBiet2198('8541', ['8541', '8543'], 'Máy biến áp điện nguồn 220V');
  const dcBienAp8543 = cauPhanBiet2198('8543', ['8543', '8541'], 'Máy biến áp điện nguồn 220V');
  const dcDram8541 = cauPhanBiet2198('8541', ['8541', '8543'], 'Bộ nhớ DRAM bán dẫn');
  const dcDram8543 = cauPhanBiet2198('8543', ['8543', '8541'], 'Bộ nhớ DRAM bán dẫn');
  const dcGate8541 = soTayGates2198({
    hs: '85411000',
    productText: 'Máy biến áp điện nguồn 220V',
    productName: 'Máy biến áp điện nguồn 220V',
    candidateHeadings: ['8541', '8543'],
  });
  const dcGate8543 = soTayGates2198({
    hs: '85437090',
    productText: 'Bộ nhớ DRAM bán dẫn',
    productName: 'Bộ nhớ DRAM bán dẫn',
    candidateHeadings: ['8543', '8541'],
  });
  assert(
    '[OZV-2198 đối chứng] máy biến áp và bộ nhớ DRAM không hỏi oan / không kéo oan 85.41 <-> 85.43',
    dcBienAp8541.length === 0 &&
      dcBienAp8543.length === 0 &&
      dcDram8541.length === 0 &&
      dcDram8543.length === 0 &&
      !(dcGate8541.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8543')) &&
      !(dcGate8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541')) &&
      !D2198.moRongUngVien(['8541'], 'Máy biến áp điện nguồn 220V').some((x) => x.nhom === '8543') &&
      !D2198.moRongUngVien(['8543'], 'Bộ nhớ DRAM bán dẫn').some((x) => x.nhom === '8541'),
    { dcBienAp8541, dcBienAp8543, dcDram8541, dcDram8543 }
  );

  const ht162 = hoiTruoc2198({ moTa: moTaCa162, ungVien: ['8541', '8543'] });
  const distinctDk162 = new Set((ht162.nhanh || []).map((n) => n.dieuKien)).size === 2;
  assert(
    '[OZV-2198 hoi-truoc-4so] ca 162 với [8541, 8543] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht162.trangThai === TT2198.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk162 &&
      (ht162.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['8541', '8543'].every((h) => (ht162.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht162.trangThai, distinctDk162, nhanh: ht162.nhanh, dapAnDieuKien: ht162.dapAnDieuKien }
  );
}

// ───────────── OZV-2204: cạnh loại trừ 2 chiều 85.41 <-> 85.39 cho ca 162 ─────────────
// "Đầu chiếu tia Laser / Chiếu tia sáng chấm đỏ" — khép cạnh [8541, 8539] trong cụm ca 162.
{
  const S2204 = require('../lib/so-tay.js');
  const { loadSoTay: loadSoTay2204, soTayGates: soTayGates2204, nhomLienQuanSoTay: nhomLienQuan2204 } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom: cauPhanBiet2204 } = require('../lib/hoi-theo-so-tay.js');
  const D2204 = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So: hoiTruoc2204, TRANG_THAI_4SO: TT2204 } = require('../lib/do-thi/hoi-truoc-4so.js');
  const ROOT2204 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  for (const nh of ['8541', '8539', '9013']) {
    fs.copyFileSync(path.join(ROOT2204, 'data', 'so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D2204.datLai();

  const moTaCa162b = 'Đầu chiếu tia Laser / None / Chiếu tia sáng chấm đỏ';

  const s8541b = JSON.parse(fs.readFileSync(path.join(ROOT2204, 'data', 'so-tay', '8541.json'), 'utf8'));
  const s8539b = JSON.parse(fs.readFileSync(path.join(ROOT2204, 'data', 'so-tay', '8539.json'), 'utf8'));
  const v8541b = S2204.verifySoTay(s8541b, '8541');
  const v8539b = S2204.verifySoTay(s8539b, '8539');
  assert(
    '[OZV-2204 verifySoTay] sổ tay 8541 và 8539 đạt 100% (0 mục bị loại) và kiemTra khớp',
    v8541b.loai.length === 0 &&
      v8541b.dat === v8541b.tong &&
      s8541b.kiemTra?.tong === v8541b.tong &&
      s8541b.kiemTra?.dat === v8541b.dat &&
      v8539b.loai.length === 0 &&
      v8539b.dat === v8539b.tong &&
      s8539b.kiemTra?.tong === v8539b.tong &&
      s8539b.kiemTra?.dat === v8539b.dat,
    { loai8541: v8541b.loai, loai8539: v8539b.loai, kt8541: s8541b.kiemTra, v8541b, kt8539: s8539b.kiemTra, v8539b }
  );

  const st8541b = loadSoTay2204('8541');
  const st8539b = loadSoTay2204('8539');
  const lt8541b = (st8541b?.loaiTru || []).find((x) => x.sangNhom === '8539' && x.canCuLoaiTru?.nguon === 'nhom8539.nhom');
  const lt8539b = (st8539b?.loaiTru || []).find((x) => x.sangNhom === '8541' && x.canCuLoaiTru?.nguon === 'nhom8541.nhom' && /đầu chiếu tia laser/i.test(x.dieuKien || ''));
  assert(
    '[OZV-2204 căn cứ] sổ tay 8541 và 8539 có mục loaiTru 2 chiều 8541 <-> 8539 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8541b &&
        lt8541b.nguon === 'nhom8541.nhom' &&
        lt8541b.canCuLoaiTru?.nguon === 'nhom8539.nhom' &&
        !String(lt8541b.dieuKien || '').includes(';') &&
        S2204.checkItem('loaiTru', lt8541b, S2204.sourcesFor('8541'), '8541') === null
    ) &&
      Boolean(
        lt8539b &&
          lt8539b.nguon === 'nhom8539.nhom' &&
          lt8539b.canCuLoaiTru?.nguon === 'nhom8541.nhom' &&
          !String(lt8539b.dieuKien || '').includes(';') &&
          lt8539b.dieuKien !== lt8541b.dieuKien &&
          S2204.checkItem('loaiTru', lt8539b, S2204.sourcesFor('8539'), '8539') === null
      ),
    { lt8541b, lt8539b }
  );

  const c5Tu8541b = D2204.canhTu('8541', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8539');
  const c5Tu8539b = D2204.canhTu('8539', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const c6Tu8541b = D2204.canhTu('8541', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8539');
  const c6Tu8539b = D2204.canhTu('8539', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const giua8541_8539 = D2204.canhGiuaNhomConSong(['8541', '8539']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8541b = D2204.moRongUngVien(['8541'], moTaCa162b, { toiDa: 10 });
  const mrTu8539b = D2204.moRongUngVien(['8539'], moTaCa162b, { toiDa: 10 });
  assert(
    '[OZV-2204 đồ thị 2 chiều] bảng cạnh có C5/C6 8541<->8539, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 162',
    c5Tu8541b.some((e) => e.nguon === 'nhom8541.nhom' && e.canCuLoaiTru?.nguon === 'nhom8539.nhom') &&
      c5Tu8539b.some((e) => e.nguon === 'nhom8539.nhom' && e.canCuLoaiTru?.nguon === 'nhom8541.nhom') &&
      c6Tu8541b.length >= 1 &&
      c6Tu8539b.length >= 1 &&
      giua8541_8539.length >= 2 &&
      mrTu8541b.some((x) => x.nhom === '8539') &&
      mrTu8539b.some((x) => x.nhom === '8541'),
    { c5Tu8541b: c5Tu8541b.length, c5Tu8539b: c5Tu8539b.length, giua: giua8541_8539.length, mrTu8541b, mrTu8539b }
  );

  assert(
    '[OZV-2204 nhomLienQuanSoTay] liên kết hai chiều 8541 <-> 8539',
    nhomLienQuan2204('8541').includes('8539') && nhomLienQuan2204('8539').includes('8541'),
    { rel8541: nhomLienQuan2204('8541'), rel8539: nhomLienQuan2204('8539') }
  );

  const pb8541b = cauPhanBiet2204('8541', ['8541', '8539'], moTaCa162b);
  assert(
    '[OZV-2204 thuận 8541->8539] 8541 đứng đầu với [8541, 8539] sinh câu phân biệt từ nhom8541.nhom trỏ sang 85.39',
    pb8541b.length === 1 &&
      pb8541b[0].loai === 'PHAN_BIET_NHOM' &&
      pb8541b[0].canCu === 'so-tay' &&
      pb8541b[0].nguon === 'nhom8541.nhom' &&
      /85\.39/.test(pb8541b[0].questionVi) &&
      /85\.41/.test(pb8541b[0].questionVi),
    { pb8541b }
  );

  const pb8539b = cauPhanBiet2204('8539', ['8539', '8541'], moTaCa162b);
  assert(
    '[OZV-2204 thuận 8539->8541] 8539 đứng đầu với [8539, 8541] sinh câu phân biệt từ nhom8539.nhom trỏ sang 85.41',
    pb8539b.length === 1 &&
      pb8539b[0].loai === 'PHAN_BIET_NHOM' &&
      pb8539b[0].canCu === 'so-tay' &&
      pb8539b[0].nguon === 'nhom8539.nhom' &&
      /85\.41/.test(pb8539b[0].questionVi) &&
      /85\.39/.test(pb8539b[0].questionVi),
    { pb8539b }
  );

  const g8541To8539 = soTayGates2204({
    hs: '85414900',
    productText:
      'Đầu chiếu tia laser là đèn điện có vỏ bọc bằng thủy tinh hoặc thạch anh, đèn dây tóc, đèn phóng điện, đèn hồ quang hoặc đèn đi ốt phát quang (LED) hoàn chỉnh biến đổi năng lượng điện thành ánh sáng',
    productName: 'Đầu chiếu tia laser là đèn điện LED hoàn chỉnh',
    candidateHeadings: ['8541', '8539'],
  });
  const g8539To8541 = soTayGates2204({
    hs: '85395200',
    productText:
      'Đầu chiếu tia laser chỉ là linh kiện đi-ốt laser hoặc đi-ốt phát quang (LED) thuộc nhóm 85.41, chưa phải đèn điện có vỏ bọc',
    productName: 'Đầu chiếu tia laser chỉ là đi-ốt laser',
    candidateHeadings: ['8539', '8541'],
  });
  assert(
    '[OZV-2204 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8541 -> 8539 và 8539 -> 8541',
    (g8541To8539.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8539')) &&
      (g8539To8541.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541')),
    { g8541To8539: g8541To8539.challenges, g8539To8541: g8539To8541.challenges }
  );

  const dcBienAp8541b = cauPhanBiet2204('8541', ['8541', '8539'], 'Máy biến áp điện nguồn 220V');
  const dcBienAp8539b = cauPhanBiet2204('8539', ['8539', '8541'], 'Máy biến áp điện nguồn 220V');
  const dcDram8541b = cauPhanBiet2204('8541', ['8541', '8539'], 'Bộ nhớ DRAM bán dẫn');
  const dcDram8539b = cauPhanBiet2204('8539', ['8539', '8541'], 'Bộ nhớ DRAM bán dẫn');
  const dcGate8541b = soTayGates2204({
    hs: '85411000',
    productText: 'Máy biến áp điện nguồn 220V',
    productName: 'Máy biến áp điện nguồn 220V',
    candidateHeadings: ['8541', '8539'],
  });
  const dcGate8539b = soTayGates2204({
    hs: '85392100',
    productText: 'Bộ nhớ DRAM bán dẫn',
    productName: 'Bộ nhớ DRAM bán dẫn',
    candidateHeadings: ['8539', '8541'],
  });
  assert(
    '[OZV-2204 đối chứng] máy biến áp và bộ nhớ DRAM không hỏi oan / không kéo oan 85.41 <-> 85.39',
    dcBienAp8541b.length === 0 &&
      dcBienAp8539b.length === 0 &&
      dcDram8541b.length === 0 &&
      dcDram8539b.length === 0 &&
      !(dcGate8541b.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8539')) &&
      !(dcGate8539b.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541')) &&
      !D2204.moRongUngVien(['8541'], 'Máy biến áp điện nguồn 220V').some((x) => x.nhom === '8539') &&
      !D2204.moRongUngVien(['8539'], 'Bộ nhớ DRAM bán dẫn').some((x) => x.nhom === '8541'),
    { dcBienAp8541b, dcBienAp8539b, dcDram8541b, dcDram8539b }
  );

  const ht162b = hoiTruoc2204({ moTa: moTaCa162b, ungVien: ['8541', '8539'] });
  const distinctDk162b = new Set((ht162b.nhanh || []).map((n) => n.dieuKien)).size >= 2;
  assert(
    '[OZV-2204 hoi-truoc-4so] ca 162 với [8541, 8539] trả CHUA_CHOT_NHOM_HOI_TRUOC với ≥2 nhánh điều kiện phân biệt và đáp án nêu đủ 2 nhóm',
    ht162b.trangThai === TT2204.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk162b &&
      (ht162b.nhanh || []).length >= 2 &&
      (ht162b.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:')) &&
      ['8541', '8539'].every((h) => (ht162b.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht162b.trangThai, distinctDk162b, nhanh: ht162b.nhanh, dapAnDieuKien: ht162b.dapAnDieuKien }
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
