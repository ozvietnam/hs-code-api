// Test luồng kiến thức cho bước chọn mã (06/10/2026 — thiết kế vĩ mô): mỗi lập luận gắn nguồn
// (sản phẩm / chú giải / tiền lệ / suy luận); đặc tính sản phẩm phải có nguyên văn trong chữ gốc. Ca thật: dao hái cau cán cách điện bị AI tự gán "có động cơ điện" → 8467.29.
import './test-isolate-data.mjs';
process.env.HS_CLASSIFY_CROSSCHECK = '0'; // kiểm bước chọn mã chính; cửa đối chiếu: test-classify-crosscheck.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_ACCESS_LOG = '0';
let girReply = null;
let girUser = null; // prompt bước chọn mã (buildContext) — để kiểm nhãn hồ sơ khớp verifyQuote
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  if (system.includes('DỮ KIỆN HÀNG HÓA')) return { json: { tenHangVi: 'máy cắt cau điện', banChat: 'máy cắt có động cơ điện' }, provider: 'stub', model: 'stub' };
  if (system.includes('mã HS 4 số')) return { json: { headings: ['8467', '8201'] }, provider: 'stub', model: 'stub' };
  girUser = user;
  return { json: girReply, provider: 'stub', model: 'stub' };
};
console.error = () => {}; console.warn = () => {};
const { classify, groundResults, verifyQuote, groundingSourceOf } = require('../lib/classify');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

const SRC = '加粗防电摘割槟榔刀伸缩杆加长12米铝合金\n用途：用于摘取槟榔，勾树枝等';
const NOTES = 'Nhóm 8201: dụng cụ cầm tay dùng trong nông nghiệp, làm vườn — dao, kéo cắt cành';
const SP = (claim, evidence) => ({ stream: 'SAN_PHAM', claim, evidence });
const g = groundResults([
  { hs: '84672900', confidence: 92, basis: [SP('có động cơ điện', 'động cơ điện tích hợp')] },
  { hs: '82019000', confidence: 70, basis: [SP('dao hái cau thủ công', '摘割槟榔刀'), SP('cán nhôm', '铝合金'), { stream: 'CHU_GIAI', claim: 'dụng cụ làm vườn', evidence: 'dụng cụ cầm tay dùng trong nông nghiệp', ref: 'Nhóm 8201' }] },
], SRC, NOTES);
check('KHÔNG đổi thứ tự mã AI', g.results[0].hs === '84672900', JSON.stringify(g.results.map((r) => r.hs)));
check('đặc tính sản phẩm tự bịa: độ tin ≤60, giữ độ tin gốc', g.results[0].confidence <= 60 && g.results[0].llmConfidence === 92 && !g.results[0].grounded);
check('mã có đặc tính kiểm được trong hồ sơ: grounded, giữ độ tin', g.results[1].grounded && g.results[1].confidence === 70);
check('luồng chú giải được đối chiếu với chú giải đã đưa', g.results[1].basis[2].stream === 'CHU_GIAI' && g.results[1].basis[2].verified === true);
check('đếm số lập luận theo luồng', g.results[1].knowledgeStreams.SAN_PHAM === 2 && g.results[1].knowledgeStreams.CHU_GIAI === 1);
check('đặc tính bịa của mã đầu → câu hỏi', g.unsupportedClaims[0] === 'có động cơ điện');
const sl = groundResults([{ hs: '84672900', confidence: 92, basis: [{ stream: 'SUY_LUAN', claim: 'loại có động cơ thường dùng điện' }] }], SRC);
check('suy luận gắn đúng nhãn: không bị coi là bịa, nhưng chưa có đặc tính hàng → ≤70', sl.results[0].confidence === 70 && sl.unsupportedClaims.length === 0);
check('không có basis = không grounded, ≤70', !groundResults([{ hs: '82019000', confidence: 90 }], SRC).results[0].grounded);
check('luồng lạ → SUY_LUAN', groundResults([{ hs: '1', confidence: 50, basis: [{ stream: 'WEB', claim: 'x' }] }], SRC).results[0].basis[0].stream === 'SUY_LUAN');

// Ca thật bench 06/10: AI chép nhiều đoạn nối ";" + giải thích tiếng Việt → vẫn là trích đúng
const BIKE = '新款儿童自行车可折叠单车\n制动系统: 碟刹; 车架材质: 碳钢; 类别: 儿童自行车; 适用性别: 男女; 速别: 单速 6速; 是否可折叠: 支持折叠';
const vb = groundResults([{ hs: '87120020', confidence: 85, basis: [
  SP('xe đạp trẻ em', '车架材质：碳钢; 类别：儿童自行车; 速别：单速/6速'),
  SP('gấp gọn', '是否可折叠：支持折叠; quy cách loại gấp gọn'),
  SP('xe đạp gấp', '儿童自行车可折叠 (xe đạp gấp)'),
] }], BIKE);
check('trích nhiều đoạn + chú thích tiếng Việt vẫn được nhận', vb.results[0].grounded && vb.results[0].confidence === 85, JSON.stringify(vb.results[0].basis.map((b) => b.verified)));
const vf = groundResults([{ hs: '87120090', confidence: 85, basis: [SP('không động cơ', '折叠山地自行车; 无电动机')] }], BIKE);
check('có mẩu chữ Hán tự chế ("无电动机") → bị coi là bịa', !vf.results[0].grounded && vf.results[0].confidence === 60);

// Ca thật prod 25/10/2026 (kẹp giấy 83059010, tự tin 97 → CAU_TRICH_KHONG_CO → NEEDS_EXPERT): AI chép NGUYÊN VĂN
// khối "HỒ SƠ GỐC" của prompt, KÈM nhãn trình bày ("Tiêu đề gốc:", "chatLieu:") và nối dòng bằng " | ". Nguồn căn cứ chỉ
// có giá trị → câu trích đúng từng chữ bị coi là bịa. Nhãn hồ sơ phải được bỏ; phần giá trị vẫn phải nguyên văn.
{
  const CLIP = { tenHang: 'Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm, hộp 100 chiếc', chatLieu: 'thép mạ niken', congDung: 'kẹp giữ giấy tờ văn phòng' };
  const SRC_CLIP = groundingSourceOf(CLIP);
  const TITLE = 'Tiêu đề gốc: Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm, hộp 100 chiếc';
  const LIVE = `${TITLE} | chatLieu: thép mạ niken | congDung: kẹp giữ giấy tờ văn phòng`;
  check('nhãn hồ sơ: câu trích prod 25/10 (3 dòng hồ sơ kèm nhãn, nối " | ") → ok', verifyQuote(LIVE, SRC_CLIP) === 'ok');
  check('nhãn hồ sơ: cùng câu tách thành từng mục basis → mỗi mục ok', [TITLE, 'chatLieu: thép mạ niken', 'congDung: kẹp giữ giấy tờ văn phòng'].every((e) => verifyQuote(e, SRC_CLIP) === 'ok'));
  check('nhãn hồ sơ: AI viết nhãn tiếng Việt ("Chất liệu:", "Công dụng:", "Tên hàng:", gạch đầu dòng, nối bằng dấu phẩy) → ok',
    ['Chất liệu: thép mạ niken', 'Công dụng: kẹp giữ giấy tờ văn phòng', 'Tên hàng: Kẹp giấy văn phòng', '- Vật liệu: thép mạ niken (kim loại cơ bản)', 'Chất liệu: thép mạ niken, Công dụng: kẹp giữ giấy tờ văn phòng'].every((e) => verifyQuote(e, SRC_CLIP) === 'ok'));
  check('nhãn hồ sơ: nhãn đúng mà giá trị sai ("chatLieu: nhôm" khi gốc ghi thép) → bad', verifyQuote('chatLieu: nhôm', SRC_CLIP) === 'bad' && verifyQuote('Công dụng: kẹp sắt', SRC_CLIP) === 'bad');
  check('nhãn hồ sơ: giá trị sai đi kèm dòng đúng KHÔNG được "rửa" (mọi mẩu mang nhãn phải nguyên văn) → bad',
    verifyQuote(`${TITLE} | chatLieu: nhôm`, SRC_CLIP) === 'bad' && verifyQuote('Chất liệu: thép mạ niken, Công dụng: kẹp sắt', SRC_CLIP) === 'bad');
  check('nhãn hồ sơ: mẩu chữ Hán tự chế vẫn → bad', verifyQuote('chatLieu: thép mạ niken; 不锈钢', SRC_CLIP) === 'bad' && verifyQuote('Tiêu đề gốc: 镀镍钢回形针', SRC_CLIP) === 'bad');
  check('nhãn hồ sơ: chỉ có nhãn, không có giá trị → bad', ['chatLieu:', 'Tiêu đề gốc: | congDung:', 'Thông số (trang bán):'].every((e) => verifyQuote(e, SRC_CLIP) === 'bad'));
  check('nhãn hồ sơ: không bỏ chữ tuỳ ý — chỉ nhãn trong bảng, ở ĐẦU mẩu, có ":" ("Ghi chú:", "Mô tả chi tiết:" không phải nhãn)',
    verifyQuote('Ghi chú: thép mạ niken', SRC_CLIP) === 'bad' && verifyQuote('Mô tả chi tiết: thép mạ niken', SRC_CLIP) === 'bad' && verifyQuote('thép chatLieu: mạ niken', SRC_CLIP) === 'bad');
  const g25 = groundResults([{ hs: '83059010', confidence: 97, basis: [SP('kẹp giấy văn phòng bằng thép mạ niken', LIVE)] }], SRC_CLIP);
  check('nhãn hồ sơ: groundResults giữ độ tin 97, không đẩy thành "hồ sơ chưa ghi"', g25.results[0].grounded && g25.results[0].confidence === 97 && g25.unsupportedClaims.length === 0, JSON.stringify(g25.results[0].basis));

  // Dữ kiện phiếu "- <nhãn>: <giá trị> [gốc: <bằng chứng>]" và chữ ảnh "[ảnh N] <OCR>" — thẻ bao là nhãn, phần trong vẫn phải có thật.
  const RICH = { ...CLIP, nameZh: '回形针 镀镍 28mm 100枚/盒', model: 'KG-28', brand: 'Deli', facts: [{ key: 'material', labelVi: 'Chất liệu', valueVi: 'thép mạ niken', evidence: '材质：镀镍钢' }] };
  const SRC_RICH = [groundingSourceOf(RICH), '材质 镀镍钢\n规格 28mm'].join('\n'); // + chữ ảnh như engine-loop ghép
  check('nhãn hồ sơ: dòng dữ kiện phiếu kèm [gốc: …] chép nguyên văn → ok', verifyQuote('- Chất liệu: thép mạ niken [gốc: 材质：镀镍钢]', SRC_RICH) === 'ok');
  check('nhãn hồ sơ: [gốc: …] bị sửa (chữ Hán không có trong gốc) → bad', verifyQuote('- Chất liệu: thép mạ niken [gốc: 材质：不锈钢]', SRC_RICH) === 'bad');
  check('nhãn hồ sơ: [ảnh N] + chữ OCR có thật → ok; chữ OCR tự chế → bad', verifyQuote('[ảnh 1] 材质 镀镍钢 规格 28mm', SRC_RICH) === 'ok' && verifyQuote('[ảnh 1] 材质 不锈钢', SRC_RICH) === 'bad');
  check('nhãn hồ sơ: tiêu đề chữ Hán kèm nhãn → ok; model/brand (có trong hồ sơ gốc) → ok', verifyQuote('Tiêu đề gốc: 回形针 镀镍 28mm', SRC_RICH) === 'ok' && verifyQuote('brand: Deli | model: KG-28', SRC_RICH) === 'ok');
  // Luồng CHU_GIAI dùng chung verifyQuote: nhãn chú giải (NOTE_LABEL) vẫn bỏ như cũ; nhãn hồ sơ sản phẩm không làm câu sai thành đúng.
  const cg = groundResults([{ hs: '82019000', confidence: 80, basis: [
    { stream: 'CHU_GIAI', claim: 'dụng cụ làm vườn', evidence: 'GỒM: dụng cụ cầm tay dùng trong nông nghiệp', ref: 'Nhóm 8201' },
    { stream: 'CHU_GIAI', claim: 'chất liệu thép', evidence: 'chatLieu: thép mạ niken', ref: 'Nhóm 8201' },
  ] }], SRC, NOTES);
  check('CHU_GIAI: nhãn "GỒM:" vẫn bỏ như cũ; "chatLieu: …" không có trong chú giải → chưa kiểm được', cg.results[0].basis[0].verified === true && cg.results[0].basis[1].verified === false);
}

// Qua classify đầy đủ: câu AI tự hiểu ("máy cắt có động cơ điện") KHÔNG phải chữ gốc sản phẩm
girReply = { results: [{ hs: '84672900', confidence: 92, reason: 'dụng cụ có động cơ điện', basis: [SP('có động cơ điện', 'máy cắt có động cơ điện')] }], missing: [] };
const r = await classify({ tenHang: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', nameZh: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', specs: '颜色分类: 13米8节加粗加厚杆+大刀 +锯刀' }, {});
check('đặc tính lấy từ câu AI tự hiểu bị loại → độ tin ≤60 + hỏi', r.results[0].confidence <= 60 && r.results[0].grounded === false && r.missing.some((m) => /động cơ/.test(m)), JSON.stringify([r.results[0], r.missing]));

// Dữ kiện phiếu (facts) là nguồn sản phẩm hợp lệ
girReply = { results: [{ hs: '82019000', confidence: 88, reason: 'dao hái cau', basis: [SP('chất liệu nhôm', 'hợp kim nhôm dày')] }], missing: [] };
const r2 = await classify({ tenHang: '加粗防电摘割槟榔刀', nameZh: '加粗防电摘割槟榔刀', facts: [{ key: 'material', labelVi: 'Chất liệu', valueVi: 'hợp kim nhôm dày', evidence: '加厚铝合金' }] }, {});
check('đặc tính từ dữ kiện phiếu được nhận, giữ độ tin', r2.results[0].grounded === true && r2.results[0].confidence === 88, JSON.stringify(r2.results[0]));

// Động cơ một lượt (girConfirm — khi HS_CLASSIFY_ENGINE ≠ loop) in hồ sơ bằng nhãn riêng ("- Tên:", "[nguyên văn: …]"),
// cũng lấy từ DOSSIER_LABELS: mọi dòng có nội dung chép nguyên văn kèm nhãn phải kiểm được; tên AI tự dịch thì không.
{
  const A = { tenHang: 'Dao hái cau cán nhôm dài 12 m', nameZh: '加粗防电摘割槟榔刀', chatLieu: 'hợp kim nhôm', congDung: 'hái quả cau', chucNang: 'cắt cuống quả', specs: 'Chiều dài cán: 12 m', facts: [{ key: 'material', labelVi: 'Chất liệu', valueVi: 'hợp kim nhôm dày', evidence: '加厚铝合金' }] };
  girReply = { results: [{ hs: '82019000', confidence: 80, reason: 'dao hái cau', basis: [] }], missing: [] };
  girUser = null;
  await classify(A, {});
  const lines = String(girUser || '').split('\nNHÓM ỨNG VIÊN')[0].split('\n').map((l) => l.trim()).filter(Boolean);
  const content = lines.filter((l) => !l.endsWith(':'));
  const headers = lines.filter((l) => l.endsWith(':'));
  const lech = content.filter((l) => verifyQuote(l, groundingSourceOf(A)) !== 'ok');
  check('nhãn hồ sơ (động cơ một lượt): mọi dòng HỒ SƠ SẢN PHẨM / DỮ KIỆN chép nguyên văn kèm nhãn → kiểm được', content.length === 7 && !lech.length, JSON.stringify([content, lech]));
  check('nhãn hồ sơ (động cơ một lượt): tiêu đề mục chỉ có nhãn → không phải câu trích', headers.length === 2 && headers.every((l) => verifyQuote(l, groundingSourceOf(A)) === 'bad'), JSON.stringify(headers));
  // Tên hàng chữ Hán → "- Tên:" là bản AI dịch (prepareClassifyInput), không phải chữ gốc → bỏ nhãn cũng không thành trích đúng.
  check('nhãn hồ sơ: "- Tên: <tên AI tự dịch>" vẫn bad', verifyQuote('- Tên: máy cắt cau điện', groundingSourceOf({ tenHang: '加粗防电摘割槟榔刀', nameZh: '加粗防电摘割槟榔刀' })) === 'bad');
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
