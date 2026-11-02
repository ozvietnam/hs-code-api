#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * #725 — 32 lỗi CEO rà 25 dòng tờ khai thật qua MCP oz_plugin (01/11/2026), sửa theo NHÓM GỐC A–E.
 * Số lỗi theo đánh số chung của issue + 2 comment (comment liệt "#2" = mục 1 thân issue, … "#10" = mục 9).
 *
 * Chạy ở chế độ AI TẮT như prod lúc test: mọi lượt LLM ném NO_PRIVATE_LLM ⇒ /api/describe đi đường dự phòng; không mạng.
 * Đi qua handler thật: /api/describe (api/describe.js) và /api/declaration-check (api/classify.js?mode=check).
 *
 * RIÊNG TƯ (luật 1): mọi dòng dưới đây là dòng TỔNG HỢP cùng kiểu mẫu với dòng thật (đổi model, nhãn hiệu, nhà sản xuất,
 * số lượng, giá) — giữ cấu trúc gây lỗi, không chép nguyên văn tờ khai.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 700)}`}`);
  if (ok) passed += 1; else failed += 1;
};

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:svc-key';
process.env.HS_ACCESS_LOG = '0';
delete process.env.HS_HO_SO;
delete process.env.OZ_CONG_MCP_URL; delete process.env.OZ_CONG_MCP_KEY; delete process.env.SHTT_API_URL;
console.error = () => {};
console.warn = () => {};

// ── AI tắt: mọi lối ra LLM ném NO_PRIVATE_LLM; mạng bị chặn ─────────────────────────────────────────────
let fetchCalls = 0;
globalThis.fetch = async () => { fetchCalls += 1; throw new Error('test: không được gọi mạng'); };
const llmTier = require('../lib/llm-tier.js');
let llmCalls = 0;
llmTier.callLLMJson = async () => { llmCalls += 1; throw Object.assign(new Error('Không có nhà cung cấp LLM riêng tư hợp lệ'), { code: 'NO_PRIVATE_LLM' }); };
const gemini = require('../lib/gemini.js');
for (const k of Object.keys(gemini)) if (typeof gemini[k] === 'function' && k !== 'parseGeminiJson') gemini[k] = async () => { llmCalls += 1; throw new Error('test: gemini bị gọi'); };

const describeHandler = require('../api/describe.js');
const classifyHandler = require('../api/classify.js');
const { taxData } = require('../lib/data');

function mockRes() {
  return { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[String(k).toLowerCase()]; }, setHeader(k, v) { this._h[String(k).toLowerCase()] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
}
async function describe(body) {
  const res = mockRes();
  await describeHandler({ method: 'POST', url: '/api/describe', query: {}, headers: { authorization: 'Bearer test-token' }, body }, res);
  return res._j;
}
async function soat(dongHang) {
  const res = mockRes();
  await classifyHandler({ method: 'POST', url: '/api/declaration-check', query: { mode: 'check' }, headers: { authorization: 'Bearer svc-key' }, body: { dongHang } }, res);
  return res._j;
}
const codes = (j) => (j?.compliance?.warnings || []).map((w) => w.code);
const kiemCua = (kq, stt, nhom) => ((kq?.dong || []).find((d) => d.stt === stt)?.kiem || []).filter((m) => !nhom || m.nhom === nhom);
const ma = (kq, stt, nhom) => kiemCua(kq, stt, nhom).map((m) => m.ma);
const CAMEL = /\b[a-z]+[A-Z][A-Za-z]*\s*:/; // khoá camelCase thô ("dienAp:", "congSuatLaser:")
const DUOI = /; xuất xứ [^;]+; Mới 100%$/;

// ═══ A. Bộ chấm đọc được thông tin đã có ═══════════════════════════════════════════════════════════════
// Lỗi 7 (= mục 6 thân issue): thông số nằm trong tên hàng không được đọc → MISSING_SPEC.
{
  const j = await describe({ hsCode: '85044019', productName: 'Bộ nguồn chuyển đổi đầu vào 100-240VAC đầu ra 5VDC 2A 10W, mã PW-0520K', origin: 'CN' });
  check('#7 describe: thông số trong tên hàng (100-240VAC, 5VDC, 10W) → không MISSING_SPEC', j && !codes(j).includes('MISSING_SPEC'), codes(j));
  check('#7 describe: 8504 đọc được điện áp vào/ra + công suất', !codes(j).some((c) => ['MISSING_VOLTAGEPRIMARY', 'MISSING_VOLTAGESECONDARY', 'MISSING_OUTPUTVOLTAGE', 'MISSING_POWER'].includes(c)), codes(j));
}
// Lỗi 13: trường có cấu trúc (model, congDung, thongSo.dongDien) không vào chapterSpecific.
{
  const j = await describe({ hsCode: '85365096', productName: 'Công tắc bập bênh loại 2 chân', origin: 'CN', model: 'RK-15B', purpose: 'đóng ngắt mạch nguồn máy sấy', attributes: { dongDien: '100mA', dienAp: '250V' } });
  const c = codes(j);
  check('#13 describe: model/congDung/thongSo.dongDien tách riêng → không MISSING_MODELNUMBER/APPLICATION/CURRENTRATING', !c.includes('MISSING_MODELNUMBER') && !c.includes('MISSING_APPLICATION') && !c.includes('MISSING_CURRENTRATING'), c);
  const cs = j?.declaration?.chapterSpecific || {};
  check('#13 describe: chapterSpecific có giá trị đọc được (không còn {})', cs.modelNumber === 'RK-15B' && /100mA/i.test(cs.currentRating || '') && Boolean(cs.application), cs);
}
// Lỗi 27: K1 báo thiếu cái đã có ("loại 2 chân", "dùng kết nối dây dẫn…", mã hàng).
const DONG_DAU_NOI = { stt: 1, maHs: '85369012', moTa: 'Đầu cốt bấm dây bằng đồng mạ thiếc, loại 2 chân, mã KT-102S-1.25, dòng điện 10A, điện áp 300V, kích thước 6x3mm, dùng kết nối dây dẫn trong tủ điện', xuatXu: 'CN', donViTinh: 'cái' };
{
  const kq = await soat([DONG_DAU_NOI]);
  const ev = kiemCua(kq, 1, 'K1').flatMap((m) => [m.ma, ...m.evidence]).join(' | ');
  check('#27 K1: "loại 2 chân" → không MISSING_POLECOUNT', !/MISSING_POLECOUNT/.test(ev), ev);
  check('#27 K1: "dùng kết nối dây dẫn" → không MISSING_APPLICATION', !/MISSING_APPLICATION/.test(ev), ev);
  check('#27 K1: mã hàng "KT-102S-1.25" → không MISSING_MODELNUMBER', !/MISSING_MODELNUMBER/.test(ev), ev);
  check('#27 K1: mô tả đầu nối viết đủ → K1 DAT (không còn 25/100 REJECT)', kiemCua(kq, 1, 'K1').some((m) => m.ma === 'MO_TA_DAT_TT39' && m.trangThai === 'DAT'), kiemCua(kq, 1, 'K1'));
}
// Lỗi 14: 9026 tự báo có pressureRating/principle khi mô tả không có dải đo, không nêu nguyên lý.
{
  const thieu = await describe({ hsCode: '90262090', productName: 'Cảm biến áp suất, mã PT-210, điện áp 24VDC', origin: 'CN', condition: 'Mới 100%' });
  check('#14 describe: "cảm biến áp suất" không dải đo → MISSING_PRESSURERATING', codes(thieu).includes('MISSING_PRESSURERATING'), codes(thieu));
  check('#14 describe: không nêu nguyên lý → MISSING_PRINCIPLE', codes(thieu).includes('MISSING_PRINCIPLE'), codes(thieu));
  check('#14 describe: thiếu thông số quan trọng nhất → không EXCELLENT, không passesCustomsAudit', thieu.compliance.level !== 'EXCELLENT' && thieu.compliance.passesCustomsAudit === false, thieu.compliance);
  const du = await describe({ hsCode: '90262090', productName: 'Cảm biến áp suất kiểu điện dung, dải đo 0-10 bar, mã PT-210, điện áp 24VDC', origin: 'CN', condition: 'Mới 100%' });
  check('#14 describe: có "0-10 bar" + "điện dung" → đủ pressureRating + principle', !codes(du).includes('MISSING_PRESSURERATING') && !codes(du).includes('MISSING_PRINCIPLE'), codes(du));
}
// Lỗi 22: soat_to_khai K1 và describe cho hai điểm khác nhau cùng một dòng.
{
  const cau = 'Mô-đun màn hình LCD ký tự 20x4 ký tự, tinh thể lỏng, mã LM-2004B, điện áp 5V, dùng cho bảng điều khiển máy in';
  const kq = await soat([{ stt: 1, maHs: '85249100', moTa: cau, xuatXu: 'CN', donViTinh: 'chiếc' }]);
  const j = await describe({ hsCode: '85249100', productName: cau, origin: 'CN', donViTinh: 'chiếc' });
  const diemK1 = kiemCua(kq, 1, 'K1')[0]?.diem;
  check('#22 một dòng một điểm: điểm K1 (soat_to_khai) = điểm describe (dự phòng)', typeof diemK1 === 'number' && diemK1 === j.compliance.score, { diemK1, describe: j.compliance.score });
  const cau2 = 'Đầu cốt bấm dây không nhãn, kích thước 6x3mm';
  const kq2 = await soat([{ stt: 1, maHs: '85369012', moTa: cau2, xuatXu: 'CN', donViTinh: 'cái' }]);
  const j2 = await describe({ hsCode: '85369012', productName: cau2, origin: 'CN', donViTinh: 'cái' });
  check('#22 một dòng một điểm (dòng thiếu nhiều trường): K1 = describe', kiemCua(kq2, 1, 'K1')[0]?.diem === j2.compliance.score, { k1: kiemCua(kq2, 1, 'K1')[0]?.diem, describe: j2.compliance.score });
}
// Lỗi 9 (= mục 8 thân issue): K1 gắn nhãn "không thấy lỗi" cho dòng chỉ 52/100.
{
  const kq = await soat([{ stt: 1, maHs: '84733010', moTa: 'Bo mạch máy tính công nghiệp đã lắp ráp, mã IPC-B700', xuatXu: 'CN', donViTinh: 'cái' }]);
  const k1 = kiemCua(kq, 1, 'K1');
  const diem = k1[0]?.diem;
  check('#9 K1: điểm < 75 thì không có mục DAT "MO_TA_DAT_TT39"', typeof diem === 'number' && (diem >= 75 || !k1.some((m) => m.ma === 'MO_TA_DAT_TT39')), k1);
  check('#9 K1: evidence trình bảng điểm trừ', k1.some((m) => m.evidence.some((e) => /điểm bộ chấm \d+\/100 .*trừ:/.test(e)) || diem === 100), k1.map((m) => m.evidence));
}

// ═══ B. Template đúng loại hàng ═══════════════════════════════════════════════════════════════════════
const { getDeclarationFieldSpec } = require('../lib/compliance-data');
const req = (hs) => (getDeclarationFieldSpec(hs)?.required || []).map((f) => f.key);
check('#8 8536 đầu nối/đầu cốt (85369094, 85369012) không đòi connectivity "WiFi/BT/USB"', !req('85369094').includes('connectivity') && !req('85369012').includes('connectivity'), { a: req('85369094'), b: req('85369012') });
check('#8 8504 bộ nguồn (85044019) không bắt buộc connectivity', !req('85044019').includes('connectivity'), req('85044019'));
check('#18 IC 8542 (85423900) không đòi vật liệu "nhôm, thép"', !req('85423900').includes('material'), req('85423900'));
check('#18 8524 LCD ký tự (85249100) không bắt buộc kích thước inch', !req('85249100').includes('screenSize'), req('85249100'));
{
  const j = await describe({ hsCode: '85249100', productName: 'Mô-đun màn hình LCD ký tự 20x4, mã LM-2004B, điện áp 5V, dùng cho bảng điều khiển', origin: 'CN' });
  check('#18 8524: "20x4 ký tự" được nhận là độ phân giải (không đòi 1080p/4K)', !codes(j).includes('MISSING_RESOLUTION'), codes(j));
}
check('#30 8456 máy laser không đòi "công suất trục chính", nhận công suất (laser)', !req('84561190').includes('spindlePower') && req('84561190').includes('power'), req('84561190'));
{
  const j = await describe({ hsCode: '84561190', productName: 'Máy khắc laser CO2 điều khiển CNC, mã ZL-6040', origin: 'CN', attributes: { congSuatLaser: '60W', dienAp: '220V' } });
  check('#30 8456: "Công suất laser 60W" + "220V" + CNC → không MISSING_POWER/SPINDLEPOWER/VOLTAGE', !codes(j).some((c) => ['MISSING_POWER', 'MISSING_SPINDLEPOWER', 'MISSING_VOLTAGE'].includes(c)), codes(j));
}
check('#30 titleVi 85369094 ("Loại khác") không còn là "Đầu nối kiểu giắc cắm"', !/giắc cắm/i.test(getDeclarationFieldSpec('85369094')?.titleVi || ''), getDeclarationFieldSpec('85369094')?.titleVi);
check('#18/#30 titleVi 85249100 không còn là "Màn hình điện thoại"', !/điện thoại/i.test(getDeclarationFieldSpec('85249100')?.titleVi || ''), getDeclarationFieldSpec('85249100')?.titleVi);

// ═══ C. Đường dự phòng /api/describe khi LLM lỗi ═════════════════════════════════════════════════════════
// Lỗi 2 + 17: tên hàng khách khai bị thay bằng tên nhóm/dòng biểu thuế (cắt cụt / sai nghĩa).
{
  const co = await describe({ hsCode: '96033000', productName: 'Cọ vẽ mỹ thuật cán gỗ, đầu lông tổng hợp, dài 18cm', origin: 'CN', donViTinh: 'Cái' });
  check('#17 dự phòng: đúng chế độ degraded (NO_PRIVATE_LLM)', co.degraded === true && co.llmError?.code === 'NO_PRIVATE_LLM', co.llmError);
  check('#17 dự phòng: giữ tên hàng khách ("Cọ vẽ mỹ thuật…"), không thành "bút lông… trang điểm"', co.customsDescription.startsWith('Cọ vẽ mỹ thuật cán gỗ') && !/trang điểm|bút lông/i.test(co.customsDescription), co.customsDescription);
  check('#17 dự phòng: giữ chất liệu + kích thước của khách', /cán gỗ/.test(co.customsDescription) && /18cm/.test(co.customsDescription), co.customsDescription);
  const van = await describe({ hsCode: '84818059', productName: 'Van trộn nước nóng lạnh bằng đồng thau mạ crom, ren 1/2 inch', origin: 'CN', model: 'MX-310', condition: 'Mới 100%' });
  check('#2 dự phòng: không thay bằng tên nhóm 84.81 ("Vòi, van…"), không mảnh cụt', van.customsDescription.startsWith('Van trộn nước nóng lạnh') && !/84\.81|Vòi, van và các thiết bị/i.test(van.customsDescription), van.customsDescription);
}
// Lỗi 15 + 31: chữ nội bộ lọt vào câu khai (khoá camelCase, "(thiếu: poleCount)", mảnh khoá "die").
{
  const j = await describe({ hsCode: '85365096', productName: 'Công tắc gạt mini', origin: 'CN', brand: 'OEM', attributes: { dienAp: '1000V', congSuatLaser: '5W', giaoDien: 'cắm' } });
  const d = j.customsDescription;
  check('#15 câu khai không có khoá camelCase thô (dienAp:, congSuatLaser:)', !CAMEL.test(d) && !/dienAp|congSuat/.test(d), d);
  check('#15 câu khai không có "(thiếu: …)" — ghi chú thiếu nằm ở descriptionMeta', !/thiếu:/.test(d) && Array.isArray(j.descriptionMeta.thieuTruong) && j.descriptionMeta.thieuTruong.length > 0, { d, meta: j.descriptionMeta });
  check('#15 ghi chú thiếu dùng nhãn tiếng Việt (không "poleCount")', j.descriptionMeta.thieuTruong.every((t) => !/^[a-z]+[A-Z]/.test(t.labelVi)) && !/poleCount|modelNumber/.test(j.descriptionMeta.banNhapCoGhiChu || ''), j.descriptionMeta.thieuTruong);
}
{
  // Rút gọn ≤ 200 theo ranh giới cụm; thứ tự giữ: tên > model > thông số > chất liệu/công dụng > nhãn hiệu; đuôi cuối.
  const body = {
    hsCode: '84561190', origin: 'CN', condition: 'Mới 100%', brand: 'LASERTECH VIỆT NAM PRO', model: 'LT-9060-RF100-PRO',
    productName: 'Máy khắc và cắt laser CO2 khổ lớn điều khiển CNC dùng cho xưởng quảng cáo',
    material: 'khung thép sơn tĩnh điện, bàn làm việc dạng tổ ong bằng nhôm',
    purpose: 'khắc, cắt gỗ, mica, vải, da, giấy trong sản xuất biển quảng cáo',
    attributes: { congSuatLaser: '100W', dienAp: '220V', kichThuocBan: '900x600mm', tocDo: '0-500mm/s', doChinhXac: '0.01mm' },
  };
  const j = await describe(body);
  const d = j.customsDescription; const m = j.descriptionMeta;
  check('#31 rút gọn: ≤ 200 ký tự, đuôi xuất xứ + tình trạng ở cuối', d.length <= 200 && DUOI.test(d), d);
  check('#31 rút gọn: giữ tên hàng + model', d.startsWith(body.productName) && d.includes(body.model), d);
  const cumGoc = new Set(m.fullText.split('; '));
  const thanCau = d.replace(DUOI, '').split('; ');
  check('#31 rút gọn theo ranh giới cụm: mọi cụm trong câu khai là cụm nguyên của bản đầy đủ (không mảnh "die")', thanCau.every((c) => cumGoc.has(c) || c === 'thông số: ' + c.slice(10) && m.fullText.includes(c)), { d, full: m.fullText });
  // #725 lỗi 41 (lô 3): nhãn hiệu bỏ SAU công dụng/thành phần, vẫn trước model/thông số phân biệt mã.
  check('#31 rút gọn: nhãn hiệu bỏ sau công dụng/thành phần, trước model/thông số', m.dropped.indexOf('nhanHieu') > m.dropped.indexOf('congDung') && m.dropped.indexOf('congDung') !== -1 && !d.includes('LASERTECH') && !m.dropped.includes('model'), m.dropped);
  check('#31 rút gọn: giữ thông số phân biệt mã (công suất laser, điện áp), bỏ thông số phụ trước', /Công suất laser: 100W/.test(d) && /Điện áp: 220V/.test(d), d);
  // Lỗi 20: con số trong LENGTH_EXCEEDED khớp descriptionMeta.
  const w = (j.compliance.warnings || []).find((x) => x.code === 'LENGTH_EXCEEDED');
  check('#20 LENGTH_EXCEEDED: có (bản đầy đủ > 200) và số liệu khớp descriptionMeta', Boolean(w) && w.message.includes(`${m.fullLength} ký tự`) && w.message.includes(`còn ${m.length}`) && m.truncated === true && m.length === d.length, { w, m: { length: m.length, fullLength: m.fullLength, truncated: m.truncated }, dLen: d.length });
}
// Lỗi 19: donViTinh dạng ghép "kg/chiếc", "chiếc/bộ"; bỏ qua ĐVT khách khai.
{
  const co = await describe({ hsCode: '96033000', productName: 'Cọ vẽ mỹ thuật cán gỗ dài 18cm', origin: 'CN', donViTinh: 'Cái' });
  check('#19 ĐVT khách khai ("Cái") được dùng, không thay bằng ĐVT biểu thuế', co.declaration.donViTinh === 'Cái', co.declaration.donViTinh);
  const k = await describe({ hsCode: '96033000', productName: 'Cọ vẽ mỹ thuật cán gỗ dài 18cm', origin: 'CN' });
  check('#19 không có ĐVT khách, biểu thuế ghi "kg/chiếc" → donViTinh null + gợi ý từng phần + ghi chú (không trả chuỗi ghép)', k.declaration.donViTinh === null && Array.isArray(k.declaration.donViTinhGoiY) && k.declaration.donViTinhGoiY.length === 2 && /ĐVT/.test(k.declaration.donViTinhGhiChu || ''), k.declaration);
  check('#19 ĐVT ghép không bị coi là thiếu ĐVT (không UNIT_MISSING −20)', !codes(k).includes('UNIT_MISSING') && codes(k).includes('UNIT_AMBIGUOUS'), codes(k));
}
// Lỗi 6 (mục 5 thân issue, rẻ — sửa cùng nhóm A/C): "mới 100%" chữ thường không bị WRONG_CONDITION.
{
  const j = await describe({ hsCode: '85365096', productName: 'Công tắc bập bênh 2 chân 6A 250VAC, mã RK-15B, dùng cho máy sấy', origin: 'CN', condition: 'mới 100%' });
  check('#6 tinhTrang "mới 100%" (chữ thường) → không WRONG_CONDITION, chuẩn hoá "Mới 100%"', !codes(j).includes('WRONG_CONDITION') && j.declaration.tinhTrang === 'Mới 100%', { c: codes(j), t: j.declaration.tinhTrang });
}

// ═══ D. Luật rẻ ở bước soát miễn phí (không LLM) ═════════════════════════════════════════════════════════
llmCalls = 0; fetchCalls = 0;
const CHAN_PIN_A = { stt: 1, maHs: '85369094', moTa: 'Chân pin bằng đồng mạ thiếc loại bấm vào dây dẫn, mã PX-087T-0.6, dùng kết nối dây dẫn', xuatXu: 'CN', donViTinh: 'cái', soLuong: 50000, triGia: { soTien: '225.00', tienTe: 'USD', dieuKien: 'FOB' } };
const CHAN_PIN_B = { stt: 2, maHs: '85369012', moTa: 'Chân pin bằng đồng mạ thiếc loại bấm vào dây dẫn, mã PX-087T-0.8, dùng kết nối dây dẫn', xuatXu: 'CN', donViTinh: 'cái' };
const DAU_NOI_BO_MACH = { stt: 3, maHs: '85369094', moTa: 'Đầu nối bo mạch 2 hàng 40 chân bước 2.54mm, dùng nối giữa hai bo mạch in, mã HB-240R', xuatXu: 'CN', donViTinh: 'cái' };
const BO_MACH = { stt: 4, maHs: '85423900', moTa: 'Bo mạch điều khiển đã lắp ráp linh kiện, mã CTRL-77A, không hiệu, hiệu VOLTRA', xuatXu: 'CN', donViTinh: 'cái' };
const IC = { stt: 5, maHs: '85423900', moTa: 'Vi mạch tích hợp IC nguồn, mã PM-6321, đóng gói SOP-8, dùng cho bo mạch điều khiển', xuatXu: 'CN', donViTinh: 'cái' };
const VAN_DONG = { stt: 6, maHs: '84818099', moTa: 'Van bi tay gạt bằng đồng, ren DN15, áp suất 16 bar', xuatXu: 'CN', donViTinh: 'cái' };
const VAN_INOX = { stt: 7, maHs: '84818072', moTa: 'Van bi tay gạt bằng inox, ren DN15, áp suất 16 bar', xuatXu: 'CN', donViTinh: 'cái' };
const VAN_TRON = { stt: 8, maHs: '84818059', moTa: 'Van trộn nước nóng lạnh bằng đồng thau mạ crom, mã MX-310, nhãn hiệu OEM', xuatXu: 'CN', donViTinh: 'cái' };
const kq = await soat([CHAN_PIN_A, CHAN_PIN_B, DAU_NOI_BO_MACH, BO_MACH, IC, VAN_DONG, VAN_INOX, VAN_TRON]);
check('D: soát 8 dòng không gọi LLM, không gọi mạng', kq && llmCalls === 0 && fetchCalls === 0, { llmCalls, fetchCalls });
{
  const m = kiemCua(kq, 1, 'K2').find((x) => x.ma === 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU');
  check('#25 "chân pin bấm vào dây dẫn" khai 85369094 → K2 CANH_BAO nghi thuộc tiêu đề bị trừ 8536901', m && m.trangThai === 'CANH_BAO', kiemCua(kq, 1, 'K2'));
  const ten8536901 = require('../lib/hs-tree').nodeOf('8536901').tenVi;
  check('#25 evidence: tên tiêu đề biểu thuế NGUYÊN VĂN + mã đề nghị xem 85369012', m && m.evidence.some((e) => e.includes(`"${ten8536901}"`)) && (m.maDeNghiXem || []).includes('85369012'), m);
  check('#25 basis HEURISTIC, không GIR, không canCuPhapLy, không trích điều luật', m && m.basis === 'HEURISTIC' && !/GIR|Điều \d|TT 85\/2026/.test(JSON.stringify(m)) && !('canCuPhapLy' in m) && !('girRulesApplied' in m), m);
  check('#25 không giả làm K2 AI: vẫn có CHUA_KIEM_MA (AI không chạy), nội dung ghi "không dùng AI"', ma(kq, 1, 'K2').includes('CHUA_KIEM_MA') && /không dùng AI/.test(m?.noiDung || ''), ma(kq, 1, 'K2'));
  check('#25 goiYChuyenGia nêu chênh MFN 25% ↔ 0%', kq.goiYChuyenGia.nen === true && kq.goiYChuyenGia.lyDo.some((x) => /Dòng 1/.test(x) && /25%/.test(x) && /0%/.test(x)), kq.goiYChuyenGia);
  check('#25 báo oan: "đầu nối bo mạch … nối giữa hai bo mạch in" (không cho dây dẫn/cáp) khai 85369094 → KHÔNG nghi', !ma(kq, 3, 'K2').includes('NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU'), kiemCua(kq, 3, 'K2'));
  check('#25 báo oan: van trộn 84818059 → KHÔNG nghi dòng bị trừ', !ma(kq, 8, 'K2').includes('NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU'), kiemCua(kq, 8, 'K2'));
}
{
  const a = kiemCua(kq, 1, 'K2').find((x) => x.ma === 'CUNG_LOAI_HANG_KHAC_MA');
  const b = kiemCua(kq, 2, 'K2').find((x) => x.ma === 'CUNG_LOAI_HANG_KHAC_MA');
  check('#25b nhất quán: hai dòng "chân pin" khai khác mã → cả hai dòng có CUNG_LOAI_HANG_KHAC_MA chỉ ra dòng kia', a && b && a.dongLienQuan?.includes(2) && b.dongLienQuan?.includes(1) && a.basis === 'HEURISTIC', { a, b });
  check('#25b báo oan: "van bi … đồng" và "van bi … inox" khác mã (chất liệu khác) → KHÔNG cảnh báo', !ma(kq, 6, 'K2').includes('CUNG_LOAI_HANG_KHAC_MA') && !ma(kq, 7, 'K2').includes('CUNG_LOAI_HANG_KHAC_MA'), { v6: ma(kq, 6, 'K2'), v7: ma(kq, 7, 'K2') });
  const kqXe = await soat([
    { stt: 1, maHs: '84272000', moTa: 'Xe nâng người dạng cần ống lồng tự hành, động cơ diesel, giỏ công tác', xuatXu: 'CN', donViTinh: 'chiếc' },
    { stt: 2, maHs: '84289090', moTa: 'Xe nâng người kiểu cắt kéo chạy điện 24V, sàn nâng, không buồng lái', xuatXu: 'CN', donViTinh: 'chiếc' },
  ]);
  check('#25b báo oan: hai "xe nâng người" khác cơ cấu (cần ống lồng diesel / cắt kéo chạy điện) khác mã → KHÔNG cảnh báo', !ma(kqXe, 1, 'K2').includes('CUNG_LOAI_HANG_KHAC_MA') && !ma(kqXe, 2, 'K2').includes('CUNG_LOAI_HANG_KHAC_MA'), [ma(kqXe, 1, 'K2'), ma(kqXe, 2, 'K2')]);
  check('#25b báo oan: IC và bo mạch (khác danh từ chính) cùng mã → KHÔNG cảnh báo', !ma(kq, 4, 'K2').includes('CUNG_LOAI_HANG_KHAC_MA') && !ma(kq, 5, 'K2').includes('CUNG_LOAI_HANG_KHAC_MA'));
}
{
  check('#21 "không hiệu, hiệu X" → K1 CANH_BAO BRAND_CONTRADICTION', kiemCua(kq, 4, 'K1').some((m) => m.ma === 'BRAND_CONTRADICTION' && m.trangThai === 'CANH_BAO'), kiemCua(kq, 4, 'K1'));
  const j = await describe({ hsCode: '85423900', productName: BO_MACH.moTa, origin: 'CN' });
  check('#21 describe cũng báo BRAND_CONTRADICTION', codes(j).includes('BRAND_CONTRADICTION'), codes(j));
  check('#21 báo oan: "nhãn hiệu OEM" (dòng van trộn) → không BRAND_CONTRADICTION', !ma(kq, 8, 'K1').includes('BRAND_CONTRADICTION'), ma(kq, 8, 'K1'));
}
{
  const m = kiemCua(kq, 4, 'K2').find((x) => x.ma === 'NGHI_CUM_LAP_RAP_KHAI_VI_MACH');
  check('#23 "bo mạch … đã lắp ráp" khai 8542 → K2 CANH_BAO nghi, basis HEURISTIC', m && m.trangThai === 'CANH_BAO' && m.basis === 'HEURISTIC', kiemCua(kq, 4, 'K2'));
  check('#23 chú giải chỉ trỏ câu NGUYÊN VĂN có trong data/chu-giai-chuong.json', !m || m.evidence.filter((e) => /chú giải/.test(e)).every((e) => /"12\. Theo mục đích của nhóm 85\.41 và 85\.42:?"/.test(e)), m?.evidence);
  check('#23 báo oan: "Vi mạch tích hợp IC … dùng cho bo mạch" → KHÔNG nghi', !ma(kq, 5, 'K2').includes('NGHI_CUM_LAP_RAP_KHAI_VI_MACH'), kiemCua(kq, 5, 'K2'));
}
{
  check('#26 chân pin 0,0045 USD/cái → không DON_GIA_BAT_THUONG', !ma(kq, 1, 'K6').includes('DON_GIA_BAT_THUONG'), kiemCua(kq, 1, 'K6'));
  const kq2 = await soat([{ stt: 1, maHs: '85166090', moTa: 'Nồi chiên không dầu 5L, 1500W, dùng điện gia dụng', xuatXu: 'CN', donViTinh: 'chiếc', soLuong: 1000, triGia: { soTien: '5.00', tienTe: 'USD', dieuKien: 'FOB' } }]);
  check('#26 hàng thường 0,005 USD/chiếc → vẫn DON_GIA_BAT_THUONG', ma(kq2, 1, 'K6').includes('DON_GIA_BAT_THUONG'), kiemCua(kq2, 1, 'K6'));
}
check('D: mọi dòng vẫn đủ 7 nhóm, không LOI dựa HEURISTIC, mucSanSang khớp mục', (kq.dong || []).every((d) => ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'].every((n) => d.kiem.some((m) => m.nhom === n))
  && !d.kiem.some((m) => m.trangThai === 'LOI' && m.basis === 'HEURISTIC')
  && d.mucSanSang === (d.kiem.some((m) => m.trangThai === 'LOI') ? 'PHAI_SUA' : d.kiem.some((m) => m.trangThai === 'CANH_BAO') ? 'NEN_SUA' : 'SAN_SANG')));

// ═══ E. Bộ khớp nhãn hiệu + MISMATCH_HS ═════════════════════════════════════════════════════════════════
const tm = require('../lib/trademark-watch');
check('#3 "nhãn hiệu OEM, chất liệu đồng…" không khớp nhãn "M&C"', !tm.findMarks('Van trộn nhãn hiệu OEM, chất liệu đồng mạ crom').some((h) => h.key === 'M&C'));
check('#3 OEM/ODM/no brand/không hiệu là nhãn chung chung', ['OEM', 'oem', 'ODM', 'no brand', 'Không hiệu', 'không nhãn hiệu'].every((b) => tm.isGenericBrand(b)) && !tm.isGenericBrand('Midea'));
check('#3 nhãn thật "M&C" viết đúng dạng vẫn khớp; "P&G" vẫn khớp', tm.findMarks('hàng hiệu M&C').some((h) => h.key === 'M&C') && tm.findMarks('Bàn chải P&G').some((h) => h.key === 'P&G'));
{
  check('#3 K5 soát: dòng nhãn hiệu OEM → không NHAN_HIEU_DUOC_BAO_HO', !ma(kq, 8, 'K5').includes('NHAN_HIEU_DUOC_BAO_HO'), kiemCua(kq, 8, 'K5'));
  const j = await describe({ hsCode: '96033000', productName: 'Cọ vẽ mỹ thuật cán gỗ, chất liệu lông tổng hợp', origin: 'CN', brand: 'OEM' });
  check('#3 describe: nhãn hiệu OEM → không TRADEMARK_WATCH', !codes(j).includes('TRADEMARK_WATCH') && j.trademarkRisk?.matched !== true, j.trademarkRisk);
}
{
  const lcd = await describe({ hsCode: '85249100', productName: 'Mô-đun hiển thị tinh thể lỏng ký tự 16x2, mã LM-1602Z, dùng cho máy đo', origin: 'CN' });
  check('#16 "tinh thể lỏng" với 8524.91 → không MISMATCH_HS', !codes(lcd).includes('MISMATCH_HS'), codes(lcd));
  const co = await describe({ hsCode: '96033000', productName: 'Cọ vẽ mỹ thuật cán gỗ dài 18cm', origin: 'CN' });
  check('#16 "cọ vẽ" ↔ "bút lông vẽ" 9603.30 → không MISMATCH_HS', !codes(co).includes('MISMATCH_HS'), codes(co));
  const sai = await describe({ hsCode: '02013000', productName: 'Viên nén Paracetamol 500mg', origin: 'CN' });
  const w = (sai.compliance.warnings || []).find((x) => x.code === 'MISMATCH_HS');
  check('#16 mô tả sai hẳn nhóm vẫn bị bắt, mức warn (heuristic, không error)', w && w.severity === 'warn', w);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
