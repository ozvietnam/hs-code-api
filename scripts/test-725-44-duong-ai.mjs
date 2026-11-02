#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * #725 lỗi 44 — câu khai ĐƯỜNG AI (LLM chạy được, degraded: false) mở đầu bằng tên nhóm biểu thuế bị cắt giữa chữ
 * ("Thiết bị điện để đóng ngắt mạch … (ví dụ, cầu dao, rơ; nhãn hiệu …"), mất tên hàng thật và dòng điện 100mA.
 *
 * Chạy với LLM GIẢ LẬP (callLLMJson trả JSON dựng sẵn — không gọi LLM thật, không mạng). Đi qua lib/describe-core.js thật.
 * Khẳng định ở mọi ca: câu khai bắt đầu bằng tên hàng; không mảnh cụt (mỗi cụm "; " là một khối nguyên vẹn đã biết);
 * có thông số dòng điện; còn nhãn hiệu khi đủ chỗ.
 *
 * RIÊNG TƯ (luật 1): mọi dòng ở đây là dòng TỔNG HỢP — nhãn hiệu "KORVEX", model "MSX-4410B"… đều bịa; không chép tờ khai thật.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 900)}`}`);
  if (ok) passed += 1; else failed += 1;
};

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_ACCESS_LOG = '0';
delete process.env.HS_HO_SO;
delete process.env.OZ_CONG_MCP_URL; delete process.env.OZ_CONG_MCP_KEY; delete process.env.SHTT_API_URL;
console.error = () => {};
console.warn = () => {};
globalThis.fetch = async () => { throw new Error('test: không được gọi mạng'); };

const llmTier = require('../lib/llm-tier.js');
const gemini = require('../lib/gemini.js');
for (const k of Object.keys(gemini)) if (typeof gemini[k] === 'function' && k !== 'parseGeminiJson') gemini[k] = async () => { throw new Error('test: gemini bị gọi'); };
let llmCalls = 0;
const llmTra = (declaration) => { llmTier.callLLMJson = async () => { llmCalls += 1; return { model: 'gia-lap-MiniMax', provider: 'gia-lap', json: { declaration } }; }; };
const llmTat = () => { llmTier.callLLMJson = async () => { throw Object.assign(new Error('Không có nhà cung cấp LLM riêng tư hợp lệ'), { code: 'NO_PRIVATE_LLM' }); }; };

const { describeProduct } = require('../lib/describe-core');
const { composeWithMeta, tenAiGiuThongTin, catTen } = require('../lib/describe-compose');
const { banCatTenBieuThue, tenBieuThueDeKem } = await import('../lib/describe-legal-head.mjs');
const { breadcrumbOf } = require('../lib/hs-breadcrumb.js');
const T = require('../lib/hs-tree.js');

const MA = '85365096';
const tenBieuThueCuaMa = (hs) => [T.nodeOf(hs), ...T.ancestorsOf(hs)].map((n) => String(n?.tenVi || '').replace(/^[\s-]+/, '').trim()).filter((x) => x.length > 8);
const coDongDien = (s) => /100\s?mA/i.test(s);

/**
 * Không mảnh cụt: tách câu khai theo "; " — cụm đầu là tên hàng (hoặc tiền tố của tên hàng cắt ĐÚNG ranh giới từ), mọi cụm sau
 * phải là một khối nguyên vẹn đã biết (nhãn hiệu/model/thông số/công dụng/xuất xứ/tình trạng/tên biểu thuế nguyên bản cắt an toàn).
 * Ngoặc phải cân. Không cụm nào là một phần của tên biểu thuế mà không nằm trong danh sách bản cắt an toàn.
 */
function manhCut(text, j, extraUnits = []) {
  const d = j.declaration || {};
  const loi = [];
  if ((text.match(/\(/g) || []).length !== (text.match(/\)/g) || []).length) loi.push('ngoặc không cân');
  const specs = Array.isArray(d.thongSoKyThuat) ? d.thongSoKyThuat : [];
  const units = new Set([
    d.nhanHieu && `nhãn hiệu ${d.nhanHieu}`, d.model && `model ${d.model}`, d.xuatXu?.nameVi && `xuất xứ ${d.xuatXu.nameVi}`, d.tinhTrang,
    d.congDung && `công dụng: ${d.congDung}`, d.thanhPhanCauTao && `thành phần: ${d.thanhPhanCauTao}`, d.quyCach && `quy cách: ${d.quyCach}`,
    ...specs, ...specs.map((x) => `thông số: ${x}`), ...extraUnits, ...extraUnits.map((x) => `thông số: ${x}`),
    ...(tenBieuThueDeKem({ hsCode: j.contextUsed?.hsCode, tenHang: d.tenHang })?.cacBan || []),
  ].filter(Boolean));
  const cum = text.split('; ');
  const ten = String(d.tenHang || '');
  const dau = cum[0];
  const tenDayDu = ten.startsWith(dau) ? ten : null;
  if (!tenDayDu) loi.push(`cụm đầu không phải tên hàng: "${dau}"`);
  else if (dau !== ten && !/^[\s,;]/.test(ten.slice(dau.length))) loi.push(`tên hàng cắt giữa từ: "${dau}|${ten.slice(dau.length, dau.length + 6)}"`);
  // Tên hàng có thể chứa "; " (khách viết) → ghép lại các cụm đầu cho tới khi khớp tiền tố.
  let i = 1;
  while (i < cum.length && ten.startsWith(cum.slice(0, i + 1).join('; '))) i += 1;
  for (; i < cum.length; i += 1) if (!units.has(cum[i])) loi.push(`cụm lạ/cụt: "${cum[i]}"`);
  return loi;
}

// ═══ Ca 1 — đúng ca prod: AI rút tên thành "Công tắc an toàn từ tính" (mất 100mA) ════════════════════════════════════════════
const KHACH_1 = 'Công tắc an toàn từ tính dùng cho cửa máy công nghiệp, dòng điện 100mA, điện áp 1000V';
{
  llmTra({ tenHang: 'Công tắc an toàn từ tính', nhanHieu: 'KORVEX', model: 'MSX-4410B', thongSoKyThuat: ['Điện áp 1000V', 'Dòng điện 100mA'], congDung: 'Ngắt mạch an toàn khi mở cửa máy', xuatXu: 'Trung Quốc', tinhTrang: 'Mới 100%', donViTinh: 'Cái' });
  const out = await describeProduct({ hsCode: MA, productName: KHACH_1, brand: 'KORVEX', model: 'MSX-4410B', origin: 'CN', condition: 'Mới 100%' });
  const j = out.json; const t = j.customsDescription;
  check('ca 1: đi đường AI giả lập (degraded false, llmModel có)', out.status === 200 && j.degraded === false && j.llmModel === 'gia-lap-MiniMax', { s: out.status, d: j.degraded, m: j.llmModel });
  check('ca 1: câu khai bắt đầu bằng tên khách (AI rút mất 100mA → dùng tên khách)', t.startsWith(KHACH_1), t);
  check('ca 1: declaration.tenHang = tên khách (không để AI làm mất thông tin phân biệt)', j.declaration.tenHang === KHACH_1, j.declaration.tenHang);
  check('ca 1: không mở đầu bằng tên nhóm/dòng biểu thuế', !tenBieuThueCuaMa(MA).some((x) => t.startsWith(x.slice(0, 20))) && !/^Thiết bị điện để đóng ngắt/.test(t), t);
  check('ca 1: không mảnh cụt, không "rơ;"', manhCut(t, j).length === 0 && !/rơ;|\(ví dụ/.test(t), { loi: manhCut(t, j), t });
  check('ca 1: có dòng điện 100mA', coDongDien(t), t);
  check('ca 1: còn nhãn hiệu (đủ chỗ)', /nhãn hiệu KORVEX/.test(t), t);
  check('ca 1: ≤ 200 ký tự, xuất xứ + tình trạng ở cuối', t.length <= 200 && t.endsWith('xuất xứ Trung Quốc; Mới 100%'), [t.length, t]);
  check('ca 1: descriptionMeta khớp câu khai', j.descriptionMeta.length === t.length && j.descriptionMeta.truncated === (j.descriptionMeta.fullLength !== t.length), j.descriptionMeta);
  const w = j.compliance.warnings.find((x) => x.code === 'TEN_HANG_GIU_TEN_KHACH');
  check('ca 1: cảnh báo info TEN_HANG_GIU_TEN_KHACH nêu token mất', w && w.severity === 'info' && /100ma/i.test(w.message), w);
}

// ═══ Ca 2 — AI giữ đủ thông tin (tên ngắn) → dùng tên AI, kèm tên biểu thuế SAU tên hàng khi còn chỗ ═════════════════════════
{
  const khach = 'Công tắc an toàn từ tính 100mA cho cửa máy';
  llmTra({ tenHang: 'Công tắc an toàn từ tính 100mA', nhanHieu: 'KORVEX', model: 'MSX-4410B', thongSoKyThuat: ['Dòng điện 100mA'], xuatXu: 'Trung Quốc', tinhTrang: 'Mới 100%' });
  const j = (await describeProduct({ hsCode: MA, productName: khach, brand: 'KORVEX', model: 'MSX-4410B', origin: 'CN', condition: 'Mới 100%' })).json;
  const t = j.customsDescription;
  check('ca 2: tên AI giữ danh từ chính + 100mA → được dùng', j.declaration.tenHang === 'Công tắc an toàn từ tính 100mA' && t.startsWith('Công tắc an toàn từ tính 100mA'), t);
  const cum = t.split('; ');
  check('ca 2: tên biểu thuế nguyên văn (phân nhóm 853650) kèm NGAY SAU tên hàng, trước nhãn hiệu', cum[1] === 'Thiết bị đóng ngắt mạch khác' && cum[2] === 'nhãn hiệu KORVEX', cum);
  check('ca 2: tên biểu thuế kèm là tên nguyên văn của cây', T.nodeOf('853650')?.tenVi?.replace(/^[\s-]+/, '').startsWith(cum[1]), T.nodeOf('853650')?.tenVi);
  check('ca 2: không mảnh cụt, có 100mA, ≤ 200', manhCut(t, j).length === 0 && coDongDien(t) && t.length <= 200, { loi: manhCut(t, j), t });
  check('ca 2: không có cảnh báo TEN_HANG_GIU_TEN_KHACH', !j.compliance.warnings.some((x) => x.code === 'TEN_HANG_GIU_TEN_KHACH'));
  check('ca 2: descriptionMeta không báo cắt (bản kèm vừa chỗ là bản đầy đủ)', j.descriptionMeta.truncated === false && j.descriptionMeta.length === t.length && j.descriptionMeta.fullLength === t.length, j.descriptionMeta);
}

// ═══ Ca 3 — tên khách dài vượt 200 ký tự ════════════════════════════════════════════════════════════════════════════════
{
  const dai = 'Công tắc an toàn từ tính dùng cho cửa bảo vệ máy CNC và dây chuyền đóng gói tự động, vỏ nhựa PBT chống cháy, tiếp điểm thường đóng NC, cáp dài 2 mét, cấp bảo vệ IP67, dòng điện 100mA, điện áp 24VDC, khoảng cách tác động 8mm';
  check('ca 3: tên khách tổng hợp > 200 ký tự', dai.length > 200, dai.length);
  llmTra({ tenHang: 'Công tắc an toàn từ tính', nhanHieu: 'KORVEX', model: 'MSX-4410B', thongSoKyThuat: ['Dòng điện 100mA', 'Điện áp 24VDC'], congDung: 'Bảo vệ cửa máy', xuatXu: 'Trung Quốc', tinhTrang: 'Mới 100%' });
  const j = (await describeProduct({ hsCode: MA, productName: dai, brand: 'KORVEX', model: 'MSX-4410B', origin: 'CN', condition: 'Mới 100%' })).json;
  const t = j.customsDescription;
  check('ca 3: ≤ 200 ký tự, đuôi xuất xứ + tình trạng nguyên vẹn', t.length <= 200 && t.endsWith('xuất xứ Trung Quốc; Mới 100%'), [t.length, t]);
  check('ca 3: bắt đầu bằng tên khách (tiền tố cắt theo ranh giới cụm/từ)', t.startsWith('Công tắc an toàn từ tính dùng cho cửa bảo vệ máy CNC'), t);
  check('ca 3: không mảnh cụt', manhCut(t, j, ['dòng điện 100mA', 'điện áp 24VDC']).length === 0, { loi: manhCut(t, j, ['dòng điện 100mA', 'điện áp 24VDC']), t });
  check('ca 3: vẫn có dòng điện 100mA (giữ thành khối thông số khi phần tên chứa nó bị cắt)', coDongDien(t), t);
  check('ca 3: không kèm tên biểu thuế khi đã phải cắt', !/Thiết bị đóng ngắt mạch/.test(t), t);
  const coCho = t.length + '; nhãn hiệu KORVEX'.length <= 200;
  check('ca 3: nhãn hiệu còn nếu còn chỗ (tên khách chiếm hết chỗ thì mới được bỏ)', /nhãn hiệu KORVEX/.test(t) || (!coCho && j.descriptionMeta.dropped.includes('nhanHieu')), { t, dropped: j.descriptionMeta.dropped });
  // Cùng ca, AI tắt (đường dự phòng): cùng quy tắc.
  llmTat();
  const k = (await describeProduct({ hsCode: MA, productName: dai, brand: 'KORVEX', model: 'MSX-4410B', origin: 'CN', condition: 'Mới 100%', technicalSpec: 'Dòng điện 100mA; Điện áp 24VDC' })).json;
  const u = k.customsDescription;
  check('ca 3 dự phòng: bắt đầu bằng tên khách, ≤ 200, có 100mA, không mảnh cụt', k.degraded === true && u.startsWith('Công tắc an toàn từ tính dùng cho cửa bảo vệ máy CNC') && u.length <= 200 && coDongDien(u) && manhCut(u, k, ['dòng điện 100mA', 'điện áp 24VDC']).length === 0, { u, loi: manhCut(u, k, ['dòng điện 100mA', 'điện áp 24VDC']) });
}

// ═══ Ca 4 — tên biểu thuế dài: không vừa thì bỏ hẳn, không bao giờ cắt cụt; tên nhiều vế/liệt kê không bao giờ dùng ═══════
{
  // 4a. Tên nhóm 8536 (nhiều vế ";", liệt kê "(ví dụ, cầu dao, rơ le…)") — nguồn của mảnh "rơ;" — không có bản cắt an toàn nào.
  const heading = breadcrumbOf(MA).headingVi;
  check('ca 4a: tên nhóm 8536 dài + nhiều vế → không có bản cắt nào', heading.length > 200 && banCatTenBieuThue(heading).length === 0, heading.length);
  // 4b. Liệt kê dễ đọc lệch nghĩa (#725 lỗi 17: "… dùng cho việc trang điểm") → bỏ.
  check('ca 4b: tên dòng dạng liệt kê không dùng', banCatTenBieuThue('Bút lông vẽ, bút lông để viết và bút lông tương tự dùng cho việc trang điểm').length === 0);
  // 4c. Chỉ cắt trước vế hạn định.
  check('ca 4c: cắt trước vế hạn định ", có …"', JSON.stringify(banCatTenBieuThue('Máy xử lý dữ liệu tự động loại xách tay, có khối lượng không quá 10 kg')) === JSON.stringify(['Máy xử lý dữ liệu tự động loại xách tay, có khối lượng không quá 10 kg', 'Máy xử lý dữ liệu tự động loại xách tay']));
  check('ca 4c: tên điều kiện / "Loại khác" / rỗng nghĩa không dùng', ['Loại khác, dòng điện dưới 16 A', 'Dòng điện dưới 16 A', 'Từ bông', 'Thiết bị khác'].every((x) => banCatTenBieuThue(x).length === 0));
  // 4d. compose: bản dài không vừa → lấy bản ngắn vừa; không bản nào vừa → bỏ hẳn (không cụm cụt).
  const d = { tenHang: 'Bộ xử lý dữ liệu cầm tay đo hiện trường KX', nhanHieu: 'KORVEX', model: 'KX-77', xuatXu: { nameVi: 'Trung Quốc' }, tinhTrang: 'Mới 100%' };
  const ban = banCatTenBieuThue('Máy xử lý dữ liệu tự động loại xách tay, có khối lượng không quá 10 kg và có pin sạc tích hợp dùng ngoài trời');
  const r1 = composeWithMeta(d, { maxLength: 145, tenBieuThue: ban });
  check('ca 4d: bản dài không vừa → dùng bản ngắn nguyên vẹn, sau tên hàng', r1.text.split('; ')[1] === 'Máy xử lý dữ liệu tự động loại xách tay' && r1.length <= 145, r1.text);
  const r2 = composeWithMeta(d, { maxLength: 110, tenBieuThue: ban });
  check('ca 4d: không bản nào vừa → bỏ hẳn, không cắt cụt', !/Máy xử lý/.test(r2.text) && r2.text.startsWith(d.tenHang) && /nhãn hiệu KORVEX/.test(r2.text) && r2.tenBieuThue === null, r2.text);
  // 4e. Đi qua describe thật với mã có tên biểu thuế dài (3926 ~110 ký tự): tên khách dài → không vừa → bỏ hẳn.
  const khach = 'Kẹp nhựa giữ cáp điện dùng trong tủ điều khiển máy công nghiệp, loại có khoá gài, kích thước 30x20mm';
  llmTra({ tenHang: khach, nhanHieu: 'KORVEX', model: 'KC-3020', thanhPhanCauTao: 'nhựa PA66', xuatXu: 'Trung Quốc', tinhTrang: 'Mới 100%' });
  const j = (await describeProduct({ hsCode: '39269099', productName: khach, brand: 'KORVEX', model: 'KC-3020', origin: 'CN', condition: 'Mới 100%' })).json;
  const t = j.customsDescription;
  const kem = tenBieuThueDeKem({ hsCode: '39269099', tenHang: khach });
  check('ca 4e: mã 39269099 có tên biểu thuế dài để kèm (ca thử còn ý nghĩa)', kem && kem.cacBan[0].length > 90, kem);
  check('ca 4e: không vừa → không có mảnh nào của tên nhóm 3926', !/Các sản phẩm khác bằng plastic/.test(t) && t.startsWith(khach), t);
  check('ca 4e: không mảnh cụt, còn nhãn hiệu', manhCut(t, j).length === 0 && /nhãn hiệu KORVEX/.test(t), { loi: manhCut(t, j), t });
  // 4f. Tên khách khác ngôn ngữ biểu thuế ("laptop") → giữ tên khách đầu câu, tên dòng 8 số kèm sau (ý đồ vòng 1 còn nguyên).
  llmTra({ tenHang: 'Máy tính xách tay Dell Latitude 5440', nhanHieu: 'Dell', model: 'Latitude 5440', xuatXu: 'Trung Quốc', tinhTrang: 'Mới 100%' });
  const l = (await describeProduct({ hsCode: '84713020', productName: 'laptop Dell Latitude 5440', brand: 'Dell', model: 'Latitude 5440', origin: 'CN', condition: 'Mới 100%' })).json;
  check('ca 4f: tên khách đầu câu, tên dòng biểu thuế nguyên văn kèm sau', l.customsDescription.startsWith('laptop Dell Latitude 5440; Máy tính xách tay kể cả notebook và subnotebook'), l.customsDescription);
}

// ═══ Ca 5 — các hàm nhỏ ═════════════════════════════════════════════════════════════════════════════════════════════════
{
  check('tenAiGiuThongTin: mất token số → không giữ', !tenAiGiuThongTin('Công tắc an toàn từ tính', KHACH_1).giu);
  check('tenAiGiuThongTin: mất danh từ chính → không giữ', tenAiGiuThongTin('Máy tính xách tay Dell', 'laptop Dell').thieuDanhTu === 'laptop dell');
  check('tenAiGiuThongTin: token số nằm ở model/tình trạng → vẫn giữ', tenAiGiuThongTin('Van bi đồng tay gạt', 'Van bi đồng tay gạt BV-25 mới 100%', { model: 'BV-25', tinhTrang: 'Mới 100%' }).giu);
  check('tenAiGiuThongTin: "100 mA" = "100mA"', tenAiGiuThongTin('Công tắc từ 100mA', 'Công tắc từ dòng 100 mA').giu);
  const c = catTen('Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện (ví dụ, cầu dao, rơ le, công tắc), dùng cho điện áp', 75);
  check('catTen: không để ngoặc hở / mảnh "rơ" / đuôi lửng', !/\(|rơ$|dùng cho$/.test(c) && c.length <= 75, c);
  check('LLM giả lập đã được gọi (không gọi LLM thật)', llmCalls >= 5, llmCalls);
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
