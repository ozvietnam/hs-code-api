#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * #725 lô 2 — lỗi còn lại sau PR #726 (comment 01/11/2026 sau khi chạy lại 18 dòng trên prod): 33, 34, 35, 36, 37, 38, 39/32,
 * 40, 24.
 *
 * Chạy ở chế độ AI TẮT (mọi lượt LLM ném NO_PRIVATE_LLM ⇒ /api/describe đi đường dự phòng), không mạng. Đi qua handler thật
 * /api/describe và /api/declaration-check (api/classify.js?mode=check), cộng các hàm lib để khoá từng luật.
 *
 * RIÊNG TƯ (luật 1): mọi dòng ở đây là dòng TỔNG HỢP — model, nhãn hiệu, nhà sản xuất, số đều bịa; không chép tờ khai thật.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 900)}`}`);
  if (ok) passed += 1; else failed += 1;
};

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:svc-key';
process.env.HS_ACCESS_LOG = '0';
delete process.env.HS_HO_SO;
delete process.env.OZ_CONG_MCP_URL; delete process.env.OZ_CONG_MCP_KEY; delete process.env.SHTT_API_URL;
console.error = () => {};
console.warn = () => {};

globalThis.fetch = async () => { throw new Error('test: không được gọi mạng'); };
const llmTier = require('../lib/llm-tier.js');
llmTier.callLLMJson = async () => { throw Object.assign(new Error('Không có nhà cung cấp LLM riêng tư hợp lệ'), { code: 'NO_PRIVATE_LLM' }); };
const gemini = require('../lib/gemini.js');
for (const k of Object.keys(gemini)) if (typeof gemini[k] === 'function' && k !== 'parseGeminiJson') gemini[k] = async () => { throw new Error('test: gemini bị gọi'); };

const describeHandler = require('../api/describe.js');
const classifyHandler = require('../api/classify.js');
const { validateDeclaration, normalizeDeclaration, nhanHieuMauThuan, mucTheoDiem, tuAnhThuong } = require('../lib/declaration-validator');
const { phatHienTruong, timMaHang } = require('../lib/truong-dac-thu');
const { composeWithMeta } = require('../lib/describe-compose');
const { getDeclarationFieldSpec } = require('../lib/compliance-data');
const { docAcfta } = require('../lib/acfta');

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
const dem = (s, sub) => String(s).split(sub).length - 1;

// ═══ 33. BRAND_CONTRADICTION trích đúng nhãn ═════════════════════════════════════════════════════════════
{
  const a = nhanHieuMauThuan('Bộ chuyển đổi tín hiệu máy đo nhiệt 4-20mA, mã SX-410, không nhãn hiệu, hiệu KORVEX');
  check('#33 "tín hiệu máy…" không bị bắt làm nhãn; lấy nhãn đứng riêng sau dấu phẩy ("KORVEX")', a && a.hieu === 'KORVEX', a);
  check('#33 "tín hiệu máy …, không nhãn hiệu" (không nêu nhãn nào) → không mâu thuẫn', nhanHieuMauThuan('Bộ khuếch đại tín hiệu máy đo, không nhãn hiệu') === null);
  check('#33 "hiệu suất", "hiệu điện thế", "ký hiệu" không phải nhãn', nhanHieuMauThuan('Đồng hồ đo hiệu điện thế, hiệu suất 90%, ký hiệu V1, không hiệu') === null);
  const b = nhanHieuMauThuan('Đồng hồ đo hiệu điện thế, không hiệu, hiệu VOLTIX');
  check('#33 có cụm ghép + nhãn thật → vẫn bắt nhãn thật', b && b.hieu === 'VOLTIX', b);
  const kq = await soat([{ stt: 1, maHs: '85437090', moTa: 'Bộ chuyển đổi tín hiệu máy đo nhiệt 4-20mA, mã SX-410, không nhãn hiệu, hiệu KORVEX', xuatXu: 'CN', donViTinh: 'cái' }]);
  const m = kiemCua(kq, 1, 'K1').find((x) => x.ma === 'BRAND_CONTRADICTION');
  check('#33 K1: BRAND_CONTRADICTION nêu nhãn "KORVEX", không "máy"', m && /"KORVEX"/.test(m.noiDung) && !/"máy"/.test(m.noiDung), m);
}

// ═══ 34. Trích thông số nhầm ════════════════════════════════════════════════════════════════════════
{
  const dim = phatHienTruong({ key: 'dimensions' }, { tenHang: 'Mô-đun LCD ký tự 20x4 ký tự, kích thước 98x60mm, mã LM-2004Q' });
  check('#34 dimensions: bỏ "20x4 ký tự" (số ký tự), lấy "98x60mm"', dim.co && /98x60/.test(dim.giaTri) && !/20x4/.test(dim.giaTri), dim);
  const dim2 = phatHienTruong({ key: 'dimensions' }, { tenHang: 'Mô-đun LCD ký tự 20x4 ký tự, mã LM-2004Q' });
  check('#34 dimensions: chỉ có "20x4 ký tự" → không có kích thước', dim2.co === false, dim2);
  const dim3 = phatHienTruong({ key: 'dimensions' }, { tenHang: 'Màn hình LCD 16x2 dòng, khung 80x36 mm' });
  check('#34 dimensions: "16x2 dòng" không phải kích thước; "80x36 mm" là', dim3.co && /80x36/.test(dim3.giaTri), dim3);
  check('#34 modelNumber: cỡ ren "M16x10mm" không phải model', timMaHang('Bu lông lục giác M16x10mm bằng thép mạ kẽm') === null, timMaHang('Bu lông lục giác M16x10mm bằng thép mạ kẽm'));
  check('#34 modelNumber: "M8x1.25" không phải model; mã thật vẫn bắt', timMaHang('Vít M8x1.25, mã VT-0812') === 'VT-0812', timMaHang('Vít M8x1.25, mã VT-0812'));
  const ap1 = phatHienTruong({ key: 'application' }, { tenHang: 'Công tắc hành trình 5A, dùng cho' });
  check('#34 application: "dùng cho" không có vế sau → không tính là có', ap1.co === false, ap1);
  const ap2 = phatHienTruong({ key: 'application' }, { tenHang: 'Công tắc hành trình 5A', congDung: 'dùng cho' });
  check('#34 application: congDung có cấu trúc chỉ là "dùng cho" → không tính là có', ap2.co === false, ap2);
  const ap3 = phatHienTruong({ key: 'application' }, { tenHang: 'Công tắc hành trình 5A, dùng cho máy cắt CNC, mã HT-55' });
  check('#34 application: "dùng cho máy cắt CNC" → có, giá trị đủ vế sau', ap3.co && ap3.giaTri === 'dùng cho máy cắt CNC', ap3);
}

// ═══ 35 + 36. Khử lặp trước khi cắt; nhãn hiệu không bị bỏ khi còn chỗ; SPEC_DROPPED đúng ═══════════════
{
  const ten = 'Bộ nguồn tổ ong chuyển đổi điện áp đầu vào 100-240VAC đầu ra 24VDC 10A công suất 240W, model KX-2410, vỏ nhôm, dùng cho tủ điện điều khiển máy đóng gói';
  const body = {
    hsCode: '85044090', productName: ten, origin: 'CN', condition: 'Mới 100%', brand: 'KORVEX', model: 'KX-2410', material: 'vỏ nhôm', purpose: 'dùng cho tủ điện điều khiển máy đóng gói',
    attributes: { dienAp: '100-240VAC', dongDien: '10A', congSuat: '240W' },
  };
  const j = await describe(body);
  const d = j.customsDescription;
  check('#35 câu khai giữ nhãn hiệu (khử lặp model/thông số/chất liệu/công dụng trước khi cắt)', /nhãn hiệu KORVEX/.test(d) && d.length <= 200, d);
  check('#35 không lặp model / thông số / công dụng đã có trong tên hàng', dem(d, 'KX-2410') === 1 && !/thông số:/.test(d) && !/công dụng:/.test(d) && !/thành phần:/.test(d), d);
  check('#35 descriptionMeta: phần lặp ghi ở trungLap, không ghi vào dropped', (j.descriptionMeta.trungLap || []).includes('model') && !j.descriptionMeta.dropped.includes('nhanHieu'), j.descriptionMeta);
  check('#36 thông số đã có trong tên hàng → không SPEC_DROPPED', !codes(j).includes('SPEC_DROPPED'), codes(j));

  const c = composeWithMeta({ tenHang: 'Van bi đồng DN15, model VB-15, áp suất 16 bar', model: 'VB-15', nhanHieu: 'MIRAVO', thongSoKyThuat: ['Áp suất: 16 bar', 'Nhiệt độ: 120°C'], xuatXu: { nameVi: 'Trung Quốc' }, tinhTrang: 'Mới 100%' });
  check('#35 compose: thông số trùng tên bị khử, thông số mới giữ', c.text === 'Van bi đồng DN15, model VB-15, áp suất 16 bar; nhãn hiệu MIRAVO; thông số: Nhiệt độ: 120°C; xuất xứ Trung Quốc; Mới 100%', c.text);
  const c2 = composeWithMeta({ tenHang: 'Đầu nối VB-150', model: 'VB-15', xuatXu: { nameVi: 'Trung Quốc' }, tinhTrang: 'Mới 100%' });
  check('#35 compose: model "VB-15" không coi là trùng "VB-150" (ranh giới mã)', /model VB-15;/.test(c2.text), c2.text);

  // SPEC_DROPPED vẫn báo khi thông số KHÔNG có trong tên hàng mà bị cắt hết.
  const dai = 'Bộ nguồn chuyển mạch công nghiệp loại gắn thanh ray DIN có bảo vệ quá áp quá dòng ngắn mạch và quá nhiệt dùng cho tủ điều khiển dây chuyền chiết rót đóng nắp chai nhựa tự động';
  const j2 = await describe({ hsCode: '85044090', productName: dai, origin: 'CN', condition: 'Mới 100%', technicalSpec: 'Điện áp ra: 24VDC; Dòng: 5A' });
  check('#36 thông số không có trong tên hàng mà bị cắt hết → vẫn SPEC_DROPPED', !/24VDC/.test(j2.customsDescription) ? codes(j2).includes('SPEC_DROPPED') : !codes(j2).includes('SPEC_DROPPED'), { d: j2.customsDescription, c: codes(j2) });
}

// ═══ 37. Cùng điểm cùng mức ═════════════════════════════════════════════════════════════════════════
{
  check('#37 mucTheoDiem: 90→EXCELLENT, 79→GOOD, 75→GOOD, 74→ACCEPTABLE, 60→ACCEPTABLE, 59→WEAK, 40→WEAK, 39→REJECT',
    mucTheoDiem(90) === 'EXCELLENT' && mucTheoDiem(79) === 'GOOD' && mucTheoDiem(75) === 'GOOD' && mucTheoDiem(74) === 'ACCEPTABLE' && mucTheoDiem(60) === 'ACCEPTABLE' && mucTheoDiem(59) === 'WEAK' && mucTheoDiem(40) === 'WEAK' && mucTheoDiem(39) === 'REJECT');
  // Thiếu ≥ 2 trường bắt buộc nhưng điểm vẫn ≥ 75: trước đây ép REJECT.
  const decl = normalizeDeclaration({ tenHang: 'Bảng điều khiển máy trộn bột, mã BDK-77, điện áp 220V, dòng 16A', xuatXu: 'CN', donViTinh: 'cái', tinhTrang: 'Mới 100%' });
  const v = validateDeclaration(decl, '85371099', {});
  check('#37 validator: mức = mucTheoDiem(điểm) kể cả khi thiếu ≥ 2 trường bắt buộc', v.level === mucTheoDiem(v.score), { score: v.score, level: v.level, missing: v.missingRequired });
  check('#37 validator: thiếu trường bắt buộc vẫn không qua kiểm (passesCustomsAudit false)', v.missingRequired.length === 0 || v.passesCustomsAudit === false, v.missingRequired);
  const cau = 'Bộ lọc nhiễu nguồn ba pha 380VAC 30A, dùng cho tủ biến tần';
  const kq = await soat([{ stt: 1, maHs: '85437090', moTa: cau, xuatXu: 'CN', donViTinh: 'cái' }]);
  const j = await describe({ hsCode: '85437090', productName: cau, origin: 'CN', donViTinh: 'cái' });
  const k1 = kiemCua(kq, 1, 'K1')[0];
  check('#37 soat_to_khai K1 và describe: cùng điểm, cùng mức', k1 && k1.diem === j.compliance.score && k1.mucDiem === j.compliance.level && j.compliance.level === mucTheoDiem(j.compliance.score), { k1: [k1?.diem, k1?.mucDiem], describe: [j.compliance.score, j.compliance.level] });
}

// ═══ 38. Template hàng điện tử không đòi material vô lý ═══════════════════════════════════════════════
{
  const req = (hs) => (getDeclarationFieldSpec(hs)?.required || []).map((f) => f.key);
  check('#38 8473 (bộ phận máy xử lý dữ liệu, bo mạch) không đòi material', ['84733010', '84733090', '84732100', '84735010'].every((hs) => !req(hs).includes('material')), ['84733010', '84733090'].map(req));
  check('#38 8473 vẫn đòi công dụng (lắp cho máy gì) + model', req('84733010').includes('application') && req('84733010').includes('modelNumber'), req('84733010'));
  check('#38 85371019 (bảng mạch điều khiển) và 85437090 (lọc nguồn) không đòi material', !req('85371019').includes('material') && !req('85437090').includes('material'), { a: req('85371019'), b: req('85437090') });
  check('#38 giữ material ở chỗ có nghĩa: 85389019 vỏ đầu nối, 8534 mạch in trần', req('85389019').includes('material') && req('85340010').includes('material'));
  const j = await describe({ hsCode: '84733010', productName: 'Bo mạch chủ máy tính công nghiệp đã lắp ráp, mã IPC-B700, dùng cho máy tính nhúng điều khiển dây chuyền', origin: 'CN', donViTinh: 'cái', condition: 'Mới 100%' });
  check('#38 describe 8473: không MISSING_MATERIAL', !codes(j).includes('MISSING_MATERIAL'), codes(j));
}

// ═══ 39 / 32. MIXED_LANGUAGE chỉ báo từ tiếng Anh thông thường ═══════════════════════════════════════════
{
  const mix = (tenHang, extra = {}) => validateDeclaration(normalizeDeclaration({ tenHang, xuatXu: 'CN', donViTinh: 'cái', tinhTrang: 'Mới 100%', ...extra }), '39269099', {}).warnings.some((w) => w.code === 'MIXED_LANGUAGE');
  check('#39 báo: "power supply" thay "bộ nguồn"', mix('Bộ power supply cho đèn bàn 12V 2A'));
  check('#39 báo: "cable" thay "cáp"', mix('Dây cable điện 2 lõi bọc nhựa, dài 2m'));
  check('#39 không báo: đơn vị + ký hiệu kỹ thuật (mm/s, VAC, kW, I2C, PVC, LCD, PA, IC, PCB, USB)', !mix('Ống luồn dây bằng nhựa PVC phi 20mm, tốc độ 500mm/s, nguồn 220VAC, công suất 2kW, giao tiếp I2C, màn hình LCD, vỏ nhựa PA, IC nguồn, bo PCB, cổng USB'));
  check('#39 không báo: mã hàng/model Latin (kể cả chứa chữ tiếng Anh như "CABLE-X2")', !mix('Đầu nối dây điện mã CABLE-X2, model SWITCHPRO-3'));
  check('#39 không báo: tên nhà sản xuất Latin', !mix('Cảm biến nhiệt độ, nhà sản xuất Ningbo Brightpower Technology Co., Ltd, dải đo 0-100°C'));
  check('#39 không báo: nhãn hiệu Latin (kể cả trùng từ tiếng Anh)', !mix('Đèn bàn học hiệu SUNLIGHT, công suất 10W', { nhanHieu: 'SUNLIGHT' }) && !mix('Đèn bàn học nhãn hiệu Golden Lamp, công suất 10W'));
  check('#39 không báo: "OEM"', !mix('Công tắc gạt mini 2 chân, nhãn hiệu OEM'));
  check('#39 tuAnhThuong liệt kê đúng từ tiếng Anh thông thường', JSON.stringify(tuAnhThuong({ tenHang: 'Bộ power supply cho đèn, cable USB 1m' })) === JSON.stringify(['power', 'supply', 'cable']), tuAnhThuong({ tenHang: 'Bộ power supply cho đèn, cable USB 1m' }));
  const j = await describe({ hsCode: '85365096', productName: 'Công tắc bập bênh 2 chân 6A 250VAC, mã RK-15B, vỏ nhựa PA66, dùng cho máy sấy', origin: 'CN', condition: 'Mới 100%' });
  check('#39 describe: dòng tiếng Việt có ký hiệu kỹ thuật → không MIXED_LANGUAGE', !codes(j).includes('MIXED_LANGUAGE'), codes(j));
}

// ═══ 40. Describe chạy cùng luật rẻ như soat_to_khai ═══════════════════════════════════════════════════
{
  const cau = 'Chân pin bằng đồng mạ thiếc loại bấm vào dây dẫn, mã PX-087T-0.6, dùng kết nối dây dẫn';
  const j = await describe({ hsCode: '85369094', productName: cau, origin: 'CN', donViTinh: 'cái', condition: 'Mới 100%' });
  const w = (j.compliance.warnings || []).find((x) => x.code === 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU');
  check('#40 describe: "chân pin bấm vào dây dẫn" khai 85369094 → warning NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU', Boolean(w), codes(j));
  check('#40 warning: basis HEURISTIC, mức warn, có evidence + mã đề nghị xem 85369012', w && w.basis === 'HEURISTIC' && w.severity === 'warn' && Array.isArray(w.evidence) && w.evidence.length > 0 && (w.maDeNghiXem || []).includes('85369012'), w);
  check('#40 warning: không gắn GIR, không canCuPhapLy, không trích điều luật', w && !/GIR|Điều \d|TT 85\/2026/.test(JSON.stringify(w)) && !('canCuPhapLy' in j) && !('girRulesApplied' in j), w);
  const kq = await soat([{ stt: 1, maHs: '85369094', moTa: cau, xuatXu: 'CN', donViTinh: 'cái' }]);
  const m = kiemCua(kq, 1, 'K2').find((x) => x.ma === 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU');
  check('#40 cùng một luật: nội dung describe = nội dung K2 soat_to_khai', m && w && m.noiDung === w.message && JSON.stringify(m.evidence) === JSON.stringify(w.evidence), { k2: m?.noiDung, describe: w?.message });
  const jCungCau = await describe({ hsCode: '85369094', productName: cau, origin: 'CN', donViTinh: 'cái' }); // cùng dữ kiện như dòng soát (không ô tình trạng)
  check('#40 luật rẻ không đổi điểm: describe = K1 (một dòng một điểm)', codes(jCungCau).includes('NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU') && kiemCua(kq, 1, 'K1')[0]?.diem === jCungCau.compliance.score, { k1: kiemCua(kq, 1, 'K1')[0]?.diem, describe: jCungCau.compliance.score });
  check('#40 shape TT 39 giữ nguyên: declaration + compliance.score (số) + level + warnings[]', j.declaration && typeof j.compliance.score === 'number' && typeof j.compliance.level === 'string' && Array.isArray(j.compliance.warnings));
  const bm = await describe({ hsCode: '85423900', productName: 'Bo mạch điều khiển đã lắp ráp linh kiện, mã CTRL-88B', origin: 'CN', donViTinh: 'cái' });
  const wb = (bm.compliance.warnings || []).find((x) => x.code === 'NGHI_CUM_LAP_RAP_KHAI_VI_MACH');
  check('#40 describe: "bo mạch … đã lắp ráp" khai 8542 → NGHI_CUM_LAP_RAP_KHAI_VI_MACH (HEURISTIC)', wb && wb.basis === 'HEURISTIC', codes(bm));
  const ic = await describe({ hsCode: '85423900', productName: 'Vi mạch tích hợp IC nguồn, mã PM-7731, đóng gói SOP-8, dùng cho bo mạch điều khiển', origin: 'CN', donViTinh: 'cái' });
  check('#40 báo oan: vi mạch IC khai 8542 → không NGHI_CUM_LAP_RAP_KHAI_VI_MACH', !codes(ic).includes('NGHI_CUM_LAP_RAP_KHAI_VI_MACH'), codes(ic));
}

// ═══ 24. K5 notice hàng đã qua sử dụng; K4 chuỗi ACFTA dễ đọc ═══════════════════════════════════════════
{
  const kq = await soat([
    { stt: 1, maHs: '84715090', moTa: 'Bộ xử lý máy tính công nghiệp, mã IPC-4410, điện áp 24VDC, mới 100%', xuatXu: 'CN', donViTinh: 'chiếc' },
    { stt: 2, maHs: '84715090', moTa: 'Bộ xử lý máy tính công nghiệp đã qua sử dụng, mã IPC-4410, điện áp 24VDC', xuatXu: 'CN', donViTinh: 'chiếc' },
  ]);
  const ev1 = kiemCua(kq, 1, 'K5').flatMap((m) => m.evidence);
  const qsd1 = ev1.filter((e) => /ĐQSD|QSD/.test(e));
  check('#24 K5: notice "ĐQSD cấm NK" giữ nguyên + ghi chú chỉ áp hàng đã qua sử dụng; dòng khai mới 100%', qsd1.length > 0 && qsd1.every((e) => /SP CNTT ĐQSD cấm NK|QSD/.test(e) && /chỉ áp với hàng đã qua sử dụng; dòng khai mới 100%/.test(e)), ev1);
  const ev2 = kiemCua(kq, 2, 'K5').flatMap((m) => m.evidence);
  check('#24 K5: dòng đã qua sử dụng → không thêm ghi chú "dòng khai mới 100%"', ev2.some((e) => /ĐQSD/.test(e)) && !ev2.some((e) => /dòng khai mới 100%/.test(e)), ev2);

  check('#24 docAcfta: "0 (-KH)/0 (-KH)/0" → câu dễ đọc, không đổi số', docAcfta('0 (-KH)/0 (-KH)/0') === '3 mức gộp từ dòng 10 số của biểu gốc: 0% (trừ KH) ×2; 0%', docAcfta('0 (-KH)/0 (-KH)/0'));
  check('#24 docAcfta: một mức / loại trừ / "*"', docAcfta('5') === '5%' && docAcfta('0 (-KH, CN)') === '0% (trừ KH, CN)' && docAcfta('*') === 'không có ưu đãi ACFTA ("*")');
  const kq2 = await soat([{ stt: 1, maHs: '85249100', moTa: 'Mô-đun màn hình LCD ký tự 20x4 ký tự, kích thước 98x60mm, mã LM-2004Q, điện áp 5V, dùng cho bảng điều khiển, mới 100%', xuatXu: 'CN', donViTinh: 'chiếc', thueSuatKhai: { loai: 'ACFTA', nk: '0' }, coFormE: true }]);
  const evK4 = kiemCua(kq2, 1, 'K4').flatMap((m) => m.evidence);
  check('#24 K4: evidence ACFTA dễ đọc, vẫn giữ chuỗi gốc', evK4.some((e) => /ACFTA trong biểu: 3 mức gộp từ dòng 10 số của biểu gốc: 0% \(trừ KH\) ×2; 0% \(chuỗi gốc "0 \(-KH\)\/0 \(-KH\)\/0"\)/.test(e)), evK4);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
