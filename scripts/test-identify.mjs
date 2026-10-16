// lib/identify.js + api/identify.js — định danh hàng hoá (bước 12 A-2). AI giả + vision giả.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const llmTier = require('../lib/llm-tier.js');
let script = []; let calls = [];
llmTier.callLLMJson = async (system, user) => { calls.push({ system: String(system).slice(0, 60), user }); const n = script.shift(); if (n instanceof Error) throw n; return { json: typeof n === 'function' ? n(user) : n, provider: 'stub', model: 'stub' }; };
console.error = () => {}; console.warn = () => {};
const log = console.log; console.log = () => {}; // log = bản gốc cho check/tổng kết
process.env.HS_API_TOKEN = process.env.HS_API_TOKEN || 'test-token';
const { identify, safeImageUrl } = require('../lib/identify.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; log(`PASS ${n}`); } else { fail += 1; log(`FAIL ${n} ${x}`); } };

// 1. Case glovebox (bài học 15/10): NSX nguồn → VERIFIED, frame đủ, không có mã HS trong phản hồi.
script = [{ chuong: '84', model: 'MB-200MOD', thuongHieu: 'MBraun', truong: { machineFunction: 'glovebox buồng cách khí', power: 'n/a', nguyenLyHoatDong: 'buồng kín + găng nhúng + bộ lọc khí O₂/ẩm', chucNangChinh: 'thao tác vật liệu nhạy khí' }, nguon: [{ loai: 'nsx', url: 'https://www.mbraun.com/product/mb-200mod', trich: 'MB-200MOD Universal Glovebox' }] }];
let r = await identify({ tenHang: 'hộp găng tay cách khí MBraun MB-200MOD', model: 'MB-200MOD', moTa: 'glove box phòng thí nghiệm có bộ làm sạch khí' });
check('glovebox: frame chương 84 + VERIFIED + đủ trường, không thiếu', r.frame?.chuong === '84' && r.xacMinh?.muc === 'VERIFIED' && (r.thieuTruong || []).length === 0, JSON.stringify([r.frame?.chuong, r.xacMinh?.muc, r.thieuTruong]));
check('glovebox: phản hồi KHÔNG chứa mã HS (identify không xếp mã)', !JSON.stringify(r).match(/"hs"|\bhsCode\b/));
check('glovebox: model + thương hiệu đi qua', r.frame?.model === 'MB-200MOD' && r.frame?.thuongHieu === 'MBraun');

// 2. AI chế key lạ → bị lọc; thiếu trường bắt buộc → câu hỏi đích danh.
script = [{ chuong: '84', truong: { machineFunction: 'máy nén', power: '7,5 kW', maLai: 'chế key' }, nguon: [] }];
r = await identify({ tenHang: 'máy nén khí không dầu 7,5kW' });
check('key lạ bị lọc khỏi frame; thiếu nguyenLyHoatDong → câu hỏi', !('maLai' in (r.frame?.truong || {})) && (r.questions || []).some((q) => q.key === 'nguyenLyHoatDong'), JSON.stringify(r.frame?.truong));
check('không nguồn → KHONG_NGUON (không được coi là đã kiểm chứng)', r.xacMinh?.muc === 'KHONG_NGUON');

// 3. Hai nguồn phụ khác miền → CORROBORATED (nhãn do MÁY gán từ URL, không tin nhãn AI).
script = [{ chuong: '84', truong: { machineFunction: 'máy hút chân không', power: '1,2kW', nguyenLyHoatDong: 'bơm hút + thanh hàn nhiệt', chucNangChinh: 'đóng gói' }, nguon: [{ loai: 'phu', url: 'https://a.example.com/x', trich: 'DZ-400' }, { loai: 'phu', url: 'https://b.example.vn/y', trich: 'DZ-400 máy hút chân không' }] }];
r = await identify({ tenHang: 'máy hút chân không DZ-400' });
check('2 nguồn phụ khác miền → CORROBORATED', r.xacMinh?.muc === 'CORROBORATED' && r.xacMinh?.mien?.length === 2, JSON.stringify(r.xacMinh?.muc));

// 4. LLM lỗi → degraded, không fail-silent, có llmError.
script = [Object.assign(new Error('NO_PRIVATE_LLM'), { code: 'NO_PRIVATE_LLM' })];
r = await identify({ tenHang: 'bình giữ nhiệt inox' });
check('LLM lỗi → degraded:true + llmError.code, không ném', r.degraded === true && r.llmError?.code === 'NO_PRIVATE_LLM' && !r.frame);

// 5. Ảnh nameplate: vision giả trả chữ; chữ vào hồ sơ trước lượt LLM; URL nội bộ bị chặn.
const geminiFake = { geminiGenerateWithImages: async () => JSON.stringify({ seenText: ['MB-200MOD', 'MBRAUN'] }) };
const fetchFake = async () => ({ ok: true, status: 200, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new ArrayBuffer(16) });
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
script = [{ chuong: '84', model: 'MB-200MOD', truong: { machineFunction: 'glovebox', power: 'n/a', nguyenLyHoatDong: 'buồng kín + lọc khí', chucNangChinh: 'phòng lab' }, nguon: [{ loai: 'nsx', url: 'https://www.mbraun.com/x', trich: 'MB-200MOD' }] }];
r = await identify({ tenHang: 'thiết bị phòng lab', anhUrl: ['https://images.example.com/nameplate.jpg'] }, { gemini: geminiFake, fetchImpl: fetchFake });
check('ảnh nameplate: chữ đọc được đưa vào hồ sơ (LLM thấy "Chữ ảnh nameplate")', r.anh?.vanBan?.includes('MB-200MOD') && calls.at(-1).user.includes('Chữ ảnh nameplate'), JSON.stringify(r.anh));
check('URL nội bộ bị chặn (chống SSRF)', safeImageUrl('http://192.168.1.5/a.jpg') === null && safeImageUrl('https://ok.example.com/a.jpg') !== null);

// 6. Endpoint: auth + 400 thiếu tên (dùng handler trực tiếp).
const api = require('../api/identify.js');
const mkRes = () => ({ _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
let res = mkRes();
await api({ method: 'POST', headers: {}, body: { tenHang: 'abc' } }, res);
check('endpoint: thiếu Bearer → 401', res._s === 401, String(res._s));
res = mkRes();
await api({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: {} }, res);
check('endpoint: thiếu tenHang → 400', res._s === 400);
script = [{ chuong: '39', truong: { polymerType: 'PP', form: 'vỏ', chatLieuCuThe: 'PP' }, nguon: [] }];
res = mkRes();
await api({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: { tenHang: 'vỏ bình giữ nhiệt' } }, res);
check('endpoint: 200 + frame + muc (Bearer hợp lệ)', res._s === 200 && res._j?.frame?.chuong === '39' && res._j?.xacMinh?.muc === 'KHONG_NGUON', JSON.stringify(res._j).slice(0, 120));

// 7. #308: nguon LLM đề xuất thiếu retrievedAt → MÁY đóng dấu ngày lượt xử lý (không dính lỗi validate).
script = [{ chuong: '39', truong: { polymerType: 'PP', form: 'vỏ', chatLieuCuThe: 'PP' }, nguon: [{ loai: 'phu', url: 'https://s.example.com/x', trich: 'bình PP' }] }];
r = await identify({ tenHang: 'bình giữ nhiệt PP' });
check('#308: retrievedAt được máy đóng dấu trong nguon của identify, loi rỗng', /^\d{4}-\d{2}-\d{2}$/.test(r.xacMinh?.nguon?.[0]?.retrievedAt || '') && (r.loi || []).length === 0, JSON.stringify([r.xacMinh?.nguon?.[0], r.loi]));

log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
