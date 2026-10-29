#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Đợt 0B — /api/describe giữ tên hàng thật, ghép khuôn Oz (dấu phẩy, không "xuất xứ"), nhãn thiếu tiếng Việt,
 * chấm trên chuỗi cuối, khai tiếp HYS, truy hồi câu tham chiếu (riêng tư: không trả nguyên câu kho Oz ra API).
 * LLM được mock (llmTier.callLLMJson) → chạy tất định, không cần khoá LLM. Kho Oz dùng tệp mẫu TỰ DỰNG (OZ_GOLD_PATH).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';

const require = createRequire(import.meta.url);

// ── Kho Oz mẫu tự dựng (không phải dữ liệu khách) — phải set TRƯỚC khi require lib ──
const GOLD = [
  { hsCode: '64029990', tenHang: 'Dép guốc nữ mẫu thử', chatLieu: 'nhựa', ozCount: 5, sampleDesc: 'Dép guốc nữ mẫu thử quai bằng nhựa PU, đế ngoài bằng nhựa, size 36-40, mã MAU-001, ko hiệu, NSX: CONG TY MAU THU A, mới 100%' },
  { hsCode: '64029990', tenHang: 'Dép lê nam mẫu thử', chatLieu: 'cao su', ozCount: 2, sampleDesc: 'Dép lê nam mẫu thử bằng cao su, size 39-43, mã MAU-002, không hiệu, NSX: CONG TY MAU THU B, mới 100%' },
  { hsCode: '39269053', tenHang: 'Dây curoa mẫu thử', chatLieu: 'nhựa PU', ozCount: 3, sampleDesc: 'Dây curoa mẫu thử bằng nhựa PU dùng trong công nghiệp, KT: dày 5mm, rộng 20mm, dài 1000mm, NSX: CONG TY MAU THU C, mới 100%' },
];
const goldPath = path.join(TEST_DATA_DIR, 'oz-gold-test.jsonl');
fs.writeFileSync(goldPath, GOLD.map((g) => JSON.stringify(g)).join('\n'));
process.env.OZ_GOLD_PATH = goldPath;
delete process.env.OZ_GOLD_BLOB_URL;
process.env.HS_API_TOKEN = 'test-token';

const llmTier = require('../lib/llm-tier');
let decl = null;
let calls = [];
let failPrivate = false;
llmTier.callLLMJson = async (system, user, opts) => {
  calls.push({ system, user: JSON.parse(user), opts });
  if (failPrivate && opts?.containsCustomerData) throw Object.assign(new Error('NO_PRIVATE_LLM: test'), { code: 'NO_PRIVATE_LLM' });
  return { json: { declaration: typeof decl === 'function' ? decl() : decl }, model: 'mock-llm' };
};
const { withPrivateData } = require('../lib/llm-privacy');
const { describeProduct } = require('../lib/describe-core');
const handler = require('../api/describe.js');

let pass = 0;
let fail = 0;
const check = (n, c, d = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.error(`FAIL ${n}${d ? ` — ${d}` : ''}`); } };

// (a) Dép 64029990: chất liệu quai/đế, size, model → không "Các loại", không "xuất xứ", có chất liệu, dấu phẩy, ≤200
calls = [];
decl = {
  tenHang: 'Dép guốc nữ', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'đôi', tinhTrang: 'Mới 100%',
  nhanHieu: 'không hiệu', model: 'DG-35', thanhPhanCauTao: 'quai bằng nhựa giả da PU, đế ngoài bằng nhựa',
  thongSoKyThuat: ['cao 5-10cm', 'size 35-39', 'màu đen'],
};
const a = await describeProduct({ hsCode: '64029990', productName: 'Dép guốc nữ', model: 'DG-35', material: 'quai nhựa giả da PU, đế nhựa', origin: 'CN', attributes: { size: '35-39', nhaSanXuat: 'Công ty Mẫu Thử' } });
const cdA = a.json.customsDescription;
check('(a) dép: không chứa "Các loại"', !/các loại/i.test(cdA), cdA);
check('(a) dép: không chứa "xuất xứ" (declaration.xuatXu vẫn còn)', !/xuất xứ/i.test(cdA) && a.json.declaration.xuatXu?.code === 'CN', cdA);
check('(a) dép: có chất liệu quai + đế', cdA.includes('quai bằng nhựa giả da PU') && cdA.includes('đế ngoài bằng nhựa'), cdA);
check('(a) dép: dấu phẩy ngăn ý, không ";"', cdA.includes(', ') && !cdA.includes(';'), cdA);
check('(a) dép: ≤200 ký tự', cdA.length <= 200, String(cdA.length));
check('(a) dép: có size + model + "không hiệu" + NSX từ thongSo.nhaSanXuat', cdA.includes('size 35-39') && cdA.includes('model: DG-35') && cdA.includes('không hiệu') && cdA.includes('NSX: Công ty Mẫu Thử'), cdA);
check('(a) dép: hợp đồng giữ nguyên (declaration, compliance.score, level, warnings[])',
  !!a.json.declaration && typeof a.json.compliance.score === 'number' && typeof a.json.compliance.level === 'string' && Array.isArray(a.json.compliance.warnings));
check('(a) dép: thamChieu chỉ số lượng câu Oz', a.json.thamChieu?.oz === 2 && a.json.thamChieu?.capMa === '8', JSON.stringify(a.json.thamChieu));
check('(a) dép: câu tham chiếu Oz có trong payload LLM (làm mẫu văn phong)', (calls[0]?.user?.thamChieu || []).some((t) => t.nguon === 'TO_KHAI_DA_THONG_QUAN'));
check('(a) dép: lượt công khai kèm câu Oz → ép riêng tư (containsCustomerData: true)', calls[0]?.opts?.containsCustomerData === true, JSON.stringify(calls[0]?.opts));
check('(a) dép: prompt hệ thống trích căn cứ TT 121/2025 chỉ tiêu 1.78 + khuôn dấu phẩy', /TT 121\/2025/.test(calls[0]?.system || '') && /DẤU PHẨY/.test(calls[0]?.system || ''));
check('(a) dép: moTaDayDu có mặt, không viết tắt KT/NSX', typeof a.json.moTaDayDu === 'string' && a.json.moTaDayDu.includes('kích thước:') && a.json.moTaDayDu.includes('nhà sản xuất:'), a.json.moTaDayDu);

// (b) "Dây curoa" 39269053 → không thành "…hoặc đai truyền hoặc băng tải…"
calls = [];
decl = { tenHang: 'Dây curoa', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'chiếc', tinhTrang: 'Mới 100%', model: 'T10', thanhPhanCauTao: 'nhựa PU', thongSoKyThuat: ['dày 8,6mm', 'rộng 40mm', 'dài 4352mm'] };
const b = await describeProduct({ hsCode: '39269053', productName: 'Dây curoa', origin: 'CN' });
const cdB = b.json.customsDescription;
check('(b) curoa: giữ tên "Dây curoa"', cdB.startsWith('Dây curoa'), cdB);
check('(b) curoa: không chứa "hoặc" / "đai truyền" / "băng tải"', !/hoặc|đai truyền|băng tải/i.test(cdB), cdB);
check('(b) curoa: kích thước một cụm, đơn vị ghi một lần', cdB.includes('KT: dày 8,6/rộng 40/dài 4352mm'), cdB);

// (c) Trường thiếu hiện nhãn TIẾNG VIỆT
calls = [];
decl = { tenHang: 'Máy tính xách tay', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'chiếc', tinhTrang: 'Mới 100%', nhanHieu: 'Lenovo', model: 'E14 Gen 5', thongSoKyThuat: ['màn hình 14 inch'] };
const c = await describeProduct({ hsCode: '84713020', productName: 'Máy tính xách tay', brand: 'Lenovo', model: 'E14 Gen 5', origin: 'CN' });
const cdC = c.json.customsDescription;
check('(c) thiếu: nhãn tiếng Việt "(thiếu: CPU, RAM, bộ nhớ/ổ cứng)"', cdC.includes('(thiếu: CPU, RAM, bộ nhớ/ổ cứng)'), cdC);
check('(c) thiếu: không lộ khoá tiếng Anh', !/cpuModel|ramCapacity|storageCapacity|modelNumber/.test(cdC), cdC);
check('(c) thiếu: model có trong chuỗi → không bị báo thiếu oan', !/thiếu:[^)]*model/i.test(cdC) && !c.json.compliance.missingRequired.includes('chapterSpecific.modelNumber'), cdC);
check('(c) thiếu: ghi chú đứng trước tình trạng, có dấu phẩy ngăn', /\(thiếu: [^)]+\), Mới 100%$/.test(cdC), cdC);
check('(c) thiếu: hiệu: Lenovo (không "nhãn hiệu Lenovo")', cdC.includes('hiệu: Lenovo') && !cdC.includes('nhãn hiệu'), cdC);

// (d) Phản hồi KHÔNG chứa nguyên câu sampleDesc nào của kho Oz — kể cả khi LLM chép nguyên câu
calls = [];
decl = { tenHang: GOLD[0].sampleDesc, xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'đôi', tinhTrang: 'Mới 100%', thongSoKyThuat: [GOLD[1].sampleDesc] };
const d = await describeProduct({ hsCode: '64029990', productName: 'Dép guốc nữ', origin: 'CN' });
const outD = JSON.stringify(d.json);
const lot = GOLD.filter((g) => outD.includes(g.sampleDesc));
check('(d) riêng tư: phản hồi không chứa nguyên câu sampleDesc nào', lot.length === 0, lot.map((g) => g.hsCode).join(','));
check('(d) riêng tư: cảnh báo REFERENCE_COPY_BLOCKED', d.json.compliance.warnings.some((w) => w.code === 'REFERENCE_COPY_BLOCKED'));
check('(d) riêng tư: tên hàng quay về đầu vào của lượt', d.json.customsDescription.startsWith('Dép guốc nữ') && !d.json.customsDescription.includes('mẫu thử'), d.json.customsDescription);
// cả các lượt (a)–(c): không câu Oz nào lọt ra
const tatCa = [a, b, c].map((r) => JSON.stringify(r.json)).join(' ');
check('(d) riêng tư: các lượt (a)–(c) cũng không lộ câu Oz, không lộ NSX/mã của kho Oz', GOLD.every((g) => !tatCa.includes(g.sampleDesc)) && !/MAU-00|CONG TY MAU THU/.test(tatCa));

// (d2) Lượt dịch vụ (withPrivateData) → không cần ép cờ; lượt công khai không có nhà cung cấp riêng tư → gọi lại không kèm câu Oz
calls = [];
decl = { tenHang: 'Dép guốc nữ', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'đôi', tinhTrang: 'Mới 100%' };
await withPrivateData(() => describeProduct({ hsCode: '64029990', productName: 'Dép guốc nữ', origin: 'CN' }));
check('(d2) lượt riêng tư: kèm câu Oz, không đè cờ containsCustomerData', calls.length === 1 && calls[0].opts.containsCustomerData === undefined && (calls[0].user.thamChieu || []).length > 0);
calls = [];
failPrivate = true;
const e = await describeProduct({ hsCode: '64029990', productName: 'Dép guốc nữ', origin: 'CN' });
failPrivate = false;
check('(d2) công khai + NO_PRIVATE_LLM → gọi lại KHÔNG kèm câu Oz', calls.length === 2 && !(calls[1].user.thamChieu || []).some((t) => t.nguon === 'TO_KHAI_DA_THONG_QUAN') && calls[1].opts.containsCustomerData === undefined);
check('(d2) gọi lại: thamChieu.oz = 0 (không dùng câu Oz)', e.json.thamChieu.oz === 0 && e.json.degraded === false, JSON.stringify(e.json.thamChieu));

// (e) HYS: nhiều thông số → chuỗi chính ≤200, không mất dữ kiện (có ở chuỗi chính hoặc khaiTiepHys)
const specs = ['công suất 1500W', 'điện áp 220V', 'dung tích 1,8 lít', 'màu bạc ánh kim', 'có đèn báo', 'tự ngắt khi sôi', 'đế xoay 360 độ'];
decl = { tenHang: 'Ấm siêu tốc đun nước bằng điện dùng trong gia đình', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'chiếc', tinhTrang: 'Mới 100%', nhanHieu: 'Mẫu Thử', model: 'KT-1800S', nhaSanXuat: 'Công ty TNHH Điện Gia Dụng Mẫu Thử Quốc Tế', thanhPhanCauTao: 'thân inox 304, tay cầm nhựa PP', congDung: 'đun sôi nước uống', thongSoKyThuat: specs };
const h = await describeProduct({ hsCode: '85161011', productName: 'Ấm siêu tốc', origin: 'CN' });
const chinh = h.json.customsDescription;
const hys = h.json.khaiTiepHys || '';
const duKien = ['Ấm siêu tốc', 'inox 304', 'tay cầm nhựa PP', 'đun sôi nước uống', '1500W', '220V', ...specs.slice(2), 'KT-1800S', 'Mẫu Thử', 'Công ty TNHH Điện Gia Dụng Mẫu Thử Quốc Tế'];
const mat = duKien.filter((x) => !chinh.includes(x) && !hys.includes(x));
check('(e) HYS: chuỗi chính ≤200', chinh.length <= 200, String(chinh.length));
check('(e) HYS: không mất dữ kiện nào (chuỗi chính hoặc khaiTiepHys)', mat.length === 0, `mất: ${mat.join(' | ')}`);
check('(e) HYS: có ghi chú chỉ tiêu 1.68 TT 121/2025', /HYS/.test(h.json.khaiTiepHysGhiChu || '') && /1\.68/.test(h.json.khaiTiepHysGhiChu || ''));
check('(e) HYS: descriptionMeta.dropped liệt kê đúng các cụm đã chuyển', h.json.descriptionMeta.dropped.length > 0 && h.json.descriptionMeta.dropped.every((x) => hys.includes(x.split(': ').slice(1).join(': '))), JSON.stringify(h.json.descriptionMeta.dropped));
check('(e) HYS: moTaDayDu có đủ mọi dữ kiện', duKien.every((x) => h.json.moTaDayDu.includes(x)), h.json.moTaDayDu);

// (f) Qua handler HTTP: trường cũ còn đủ
decl = { tenHang: 'Dép guốc nữ', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'đôi', tinhTrang: 'Mới 100%' };
const res = { _s: 0, _j: null, setHeader() {}, status(x) { this._s = x; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
await handler({ method: 'POST', url: '/api/describe', query: {}, headers: { authorization: 'Bearer test-token' }, body: { hsCode: '64029990', productName: 'Dép guốc nữ' } }, res);
const keys = ['declaration', 'customsDescription', 'descriptionMeta', 'compliance', 'trademarkRisk', 'attributesUsed', 'llmModel', 'degraded', 'llmError', 'contextUsed', 'ms'];
check('(f) handler: 200 + đủ trường cũ', res._s === 200 && keys.every((k) => k in res._j), keys.filter((k) => !(k in (res._j || {}))).join(','));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
