// HS_TIM_TRUOC (mặc định TẮT) — "tìm trước, đoán sau": trước vòng 1 máy tìm tất định trong kho bằng mô tả + tên ngắn, đưa
// top 5 nhóm kèm bằng chứng vào ĐẦU VÀO vòng 1 (lời dặn hệ thống không đổi) và nạp các nhóm đó vào gather().
// Ca gốc: van điện từ khí nén 5/2 qua Cổng 21/11 — vòng 1 đoán 8412/848180 từ hồ sơ thô, trong khi kho tìm chữ có 8481.20.
// Luật L3: mỗi ca chứng minh CƠ CHẾ và có CA NGƯỢC (đổi một dữ kiện → kết quả đổi theo). Module không chọn mã.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_CHOT_SOM_CO_KIEM', 'HS_HOI_THEO_SO_TAY', 'HS_EMBED_POOL', 'HS_TIM_TRUOC', 'HS_TIM_TRUOC_NAP', 'HS_TIM_CGCT', 'HS_ALIAS_SEARCH']) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let script = [];
let llmCalls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  llmCalls.push({ step: opts.step, system: String(system), user: String(user) });
  const next = script.length > 1 ? script.shift() : script[0]; // hết kịch bản → lặp lại đáp án cuối (vòng sửa nếu cổng chặn)
  return { json: JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
// Tờ khai Oz: dữ liệu cố định (kho thật thay đổi theo ngày) — đúng hình dạng searchOzByKeyword trả.
const ozSearch = require('../lib/oz-precedent-search.js');
let ozItems = [];
let ozNem = false;
ozSearch.searchOzByKeyword = async () => { if (ozNem) throw new Error('kho Oz lỗi'); return { items: JSON.parse(JSON.stringify(ozItems)) }; };
console.error = () => {};
console.warn = () => {};
const { classifyLoop, SYS_R1 } = require('../lib/engine-loop.js');
const tt = require('../lib/tim-truoc.js');
const { nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 900)}`); }
};
const sha = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex');

const VAN = 'Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch, dùng điều khiển xi lanh khí nén';
const OZ_VAN = [
  { hsCode: '84812090', tenHang: 'Van điện từ khí nén', chatLieu: 'nhôm', congDung: 'truyền động khí nén', ozCount: 11, matchCoverage: 100 },
  { hsCode: '84812090', tenHang: 'Van điện từ', ozCount: 6, matchCoverage: 100 },
  { hsCode: '84123100', tenHang: 'Xi lanh khí nén', ozCount: 25, matchCoverage: 22 },
];
const KINH = 'Kính mắt thời trang bằng nhựa, kích thước (14,5*5)cm, Model 26601, Hiệu GAOZI, mới 100%';
const OZ_KINH = [{ hsCode: '90049090', tenHang: 'Kính mắt thời trang', chatLieu: 'nhựa', ozCount: 95, matchCoverage: 100 }];

// ───────────────────────── 1. Công tắc ─────────────────────────
check('công tắc: mặc định TẮT', tt.bat() === false);
for (const v of ['on', '1', 'true', 'ON']) { process.env.HS_TIM_TRUOC = v; check(`công tắc: "${v}" → bật`, tt.bat() === true); }
for (const v of ['off', '0', 'false', '', 'shadow']) { process.env.HS_TIM_TRUOC = v; check(`công tắc: "${v}" → tắt`, tt.bat() === false); }
delete process.env.HS_TIM_TRUOC;

// ───────────────────────── 2. Tên ngắn tất định ─────────────────────────
check('tên ngắn: cắt ở dấu phẩy, bỏ token lẫn số ("5/2")', tt.tenNgan(VAN) === 'Van điện từ khí nén thân nhôm', tt.tenNgan(VAN));
check('tên ngắn: bỏ đuôi kích thước / model / hiệu', tt.tenNgan(KINH) === 'Kính mắt thời trang bằng nhựa', tt.tenNgan(KINH));
check('tên ngắn: bỏ "hiệu <NHÃN>" và "model"', tt.tenNgan('Bộ khuếch đại tín hiệu wifi hiệu TP-LINK model RE200') === 'Bộ khuếch đại tín hiệu wifi', tt.tenNgan('Bộ khuếch đại tín hiệu wifi hiệu TP-LINK model RE200'));
check('CA NGƯỢC: chữ "hiệu" trong "tín hiệu" KHÔNG bị coi là nhãn hiệu', tt.tenNgan('Cáp tín hiệu âm thanh') === 'Cáp tín hiệu âm thanh', tt.tenNgan('Cáp tín hiệu âm thanh'));
check('CA NGƯỢC: tên có chữ Hán (tiêu đề Taobao) → không có tên ngắn', tt.tenNgan('气动电磁阀 4V210-08') === '');
check('tên ngắn: tối đa 10 từ', tt.tenNgan('a b c d e f g h i j k l m n').split(' ').length === 10);

// ───────────────────────── 3. Bỏ phiếu theo thứ hạng ─────────────────────────
{
  const x = tt.gop([['84812090', '84123100'], ['84818099', '85371040'], ['84123100']], 4);
  check('gộp: nhóm được nhiều danh sách bỏ phiếu ở hạng cao đứng trước (8481: 2 phiếu hạng 1; 8412: hạng 2 + hạng 1)', x[0][0] === '8481' && x[1][0] === '8412' && x[2][0] === '8537', JSON.stringify(x));
  const y = tt.gop([['84812090', '84812011', '84123100']], 4);
  check('gộp: hai mã cùng nhóm trong một danh sách chỉ tính một lần (8412 lên hạng 2)', Math.abs(y[1][1] - 1 / 12) < 1e-9 && y.length === 2, JSON.stringify(y));
  check('CA NGƯỢC: đảo thứ tự danh sách → thứ hạng đảo theo', tt.gop([['84123100', '84812090']], 4)[0][0] === '8412');
}

// ───────────────────────── 4. timTruoc (hàm thuần: kho TB-TCHQ / biểu thuế / từ điển THẬT, tờ khai Oz cố định) ─────────────────────────
ozItems = OZ_VAN;
const kVan = await tt.timTruoc({ tenHang: VAN });
check('van 5/2: nhóm 8481 đứng đầu ứng viên', kVan.tomTat.trangThai === 'CO_UNG_VIEN' && kVan.tomTat.nhom[0] === '8481', JSON.stringify(kVan.tomTat));
check('van 5/2: không quá 5 nhóm; khối ≤ 1.500 ký tự và mang nhãn "tín hiệu, không phải đáp án"', kVan.tomTat.nhom.length <= 5 && kVan.khoi.length <= tt.TRAN_KY_TU && kVan.khoi.startsWith(tt.NHAN_KHOI) && /không phải đáp án; chú giải và GIR vẫn quyết định/.test(kVan.khoi), kVan.khoi.length);
check('van 5/2: khối chỉ tới phân nhóm 8481.20 và nêu bằng chứng tờ khai Oz + TB-TCHQ', /Nhóm 8481 — phân nhóm: [^\n]*848120/.test(kVan.khoi) && /17 tờ khai OZ khai mã 84812090/.test(kVan.khoi) && /TB-TCHQ → 8481/.test(kVan.khoi), kVan.khoi);
check('van 5/2: mỗi nhóm tối đa 2 bằng chứng', kVan.khoi.split(/\n(?=\d\. Nhóm )/).slice(1).every((m) => (m.match(/\n {3}• /g) || []).length <= 2), kVan.khoi);
check('van 5/2: ghi nguồn bỏ phiếu cho từng nhóm (để đo)', ['tb', 'oz', 'bieu', 'tuDien'].every((n) => kVan.tomTat.nguon['8481'].includes(n)), JSON.stringify(kVan.tomTat.nguon));
check('HS_SO_TAY tắt → không đọc sổ tay, không có nhóm dễ nhầm', kVan.tomTat.deNham.length === 0);
ozItems = OZ_KINH;
const kKinh = await tt.timTruoc({ tenHang: KINH });
check('CA NGƯỢC: đổi hàng sang kính mắt → ứng viên đổi theo (9004 đứng đầu, không có 8481)', kKinh.tomTat.nhom[0] === '9004' && !kKinh.tomTat.nhom.includes('8481'), JSON.stringify(kKinh.tomTat.nhom));
const kHan = await tt.timTruoc({ tenHang: '气动电磁阀 4V210-08' });
check('tên chữ Hán → BỎ QUA có ghi lý do (khác "đã tìm, không có" — L6), không có khối', kHan.khoi === '' && kHan.tomTat.trangThai === 'BO_QUA_TEN_CHU_HAN' && kHan.nhomNap.length === 0, JSON.stringify(kHan.tomTat));
const kRong = await tt.timTruoc({});
check('không có tên hàng → BO_QUA_KHONG_CO_TEN', kRong.tomTat.trangThai === 'BO_QUA_KHONG_CO_TEN' && kRong.khoi === '');
ozNem = true; ozItems = OZ_VAN;
const kLoi = await tt.timTruoc({ tenHang: VAN });
ozNem = false;
check('kho tờ khai Oz lỗi → các nguồn còn lại vẫn chạy (8481 vẫn có, không có bằng chứng Oz)', kLoi.tomTat.nhom.includes('8481') && !/tờ khai OZ/.test(kLoi.khoi), JSON.stringify(kLoi.tomTat.nhom));
{
  const dai = `${VAN} `.repeat(30);
  const k = await tt.timTruoc({ tenHang: dai, congDung: dai });
  check('mô tả rất dài → khối vẫn ≤ 1.500 ký tự', k.khoi.length <= tt.TRAN_KY_TU && k.khoi.length > 0, k.khoi.length);
}

// ───────────────────────── 5. Cạnh sổ tay HAI CHIỀU ─────────────────────────
{
  const st8412 = JSON.parse(readFileSync(new URL('../data/so-tay/8412.json', import.meta.url), 'utf8'));
  const st8481 = JSON.parse(readFileSync(new URL('../data/so-tay/8481.json', import.meta.url), 'utf8'));
  const dich = (s) => [...(s.loaiTru || []).map((l) => l.sangNhom), ...(s.phanBiet || []).flatMap((p) => [p.neuCo, p.neuKhong])].join('|');
  check('dữ liệu: sổ tay 8481 trỏ sang 8412, sổ tay 8412 KHÔNG trỏ ngược lại 8481 (cạnh một chiều)', /8412/.test(dich(st8481)) && !/8481/.test(dich(st8412)));
  check('cạnh ngược: 8412 là ứng viên → 8481 được coi là nhóm liên quan (dù sổ tay 8412 không nhắc)', nhomLienQuanSoTay('8412').includes('8481'), nhomLienQuanSoTay('8412').join(','));
  check('cạnh xuôi vẫn có: 8481 → 8412', nhomLienQuanSoTay('8481').includes('8412'));
  check('CA NGƯỢC: nhóm không được sổ tay nào nối với 8481 (0101 ngựa sống) → không liên quan', !nhomLienQuanSoTay('8481').includes('0101') && !nhomLienQuanSoTay('0101').includes('8481'));
  process.env.HS_SO_TAY = 'full';
  ozItems = OZ_VAN;
  const k = await tt.timTruoc({ tenHang: VAN });
  check('HS_SO_TAY=full: nhóm dễ nhầm tối đa 2, không trùng top 5, đều nối sổ tay với một ứng viên', k.tomTat.deNham.length <= tt.TRAN_DE_NHAM && k.tomTat.deNham.every((b) => !k.tomTat.nhom.includes(b) && k.tomTat.nhom.some((a) => nhomLienQuanSoTay(a).includes(b))), JSON.stringify(k.tomTat));
  check('MẶC ĐỊNH (HS_TIM_TRUOC_NAP trống): không nạp nhóm nào vào gather, khối vòng 1 vẫn có đủ ứng viên + nhóm dễ nhầm', k.nhomNap.length === 0 && k.tomTat.nap.length === 0 && k.tomTat.nhom.length > 0 && k.khoi.includes('Nhóm 8481'));
  process.env.HS_TIM_TRUOC_NAP = '5';
  const k5 = await tt.timTruoc({ tenHang: VAN });
  check('HS_TIM_TRUOC_NAP=5 + HS_SO_TAY=full: nhóm nạp vào gather = top 5 + nhóm dễ nhầm', k5.khoi === k.khoi && JSON.stringify(k5.nhomNap) === JSON.stringify([...k.tomTat.nhom, ...k.tomTat.deNham]) && k.nhomNap.length <= tt.TOP_NHOM + tt.TRAN_DE_NHAM);
  // HS_TIM_TRUOC_NAP: chỉnh số nhóm nạp vào gather (gói vòng 2), không đụng khối vòng 1.
  process.env.HS_TIM_TRUOC_NAP = '2';
  const k2 = await tt.timTruoc({ tenHang: VAN });
  check('HS_TIM_TRUOC_NAP=2: chỉ nạp 2 nhóm đứng đầu (+ nhóm dễ nhầm nối với chính 2 nhóm đó); khối vòng 1 vẫn đủ top 5', JSON.stringify(k2.nhomNap.slice(0, 2)) === JSON.stringify(k.tomTat.nhom.slice(0, 2)) && k2.nhomNap.slice(2).every((b) => k.tomTat.nhom.slice(0, 2).some((a) => nhomLienQuanSoTay(a).includes(b))) && k2.nhomNap.length <= 4 && k2.khoi === k.khoi, JSON.stringify(k2.nhomNap));
  process.env.HS_TIM_TRUOC_NAP = '0';
  const k0 = await tt.timTruoc({ tenHang: VAN });
  check('HS_TIM_TRUOC_NAP=0: không nạp nhóm nào vào gather, khối vòng 1 giữ nguyên', k0.nhomNap.length === 0 && k0.khoi === k.khoi);
  process.env.HS_TIM_TRUOC_NAP = 'abc';
  check('CA NGƯỢC: HS_TIM_TRUOC_NAP không phải số → mặc định 0; lớn hơn 5 → 5', tt.soNhomNap() === 0 && ((process.env.HS_TIM_TRUOC_NAP = '9'), tt.soNhomNap()) === 5);
  delete process.env.HS_TIM_TRUOC_NAP;
  delete process.env.HS_SO_TAY;
}

// ───────────────────────── 6. Động cơ thật + LLM giả ─────────────────────────
// Vòng 1 giả CHỈ đoán 8412 (xi lanh), không nêu 8481 ở đâu cả; vòng 2 giả chốt 84812090.
const R1_VAN_8412 = {
  product: { nameVi: 'Thiết bị điều khiển xi lanh khí nén 5/2', nameEn: 'Pneumatic actuator control', purpose: 'điều khiển xi lanh khí nén', mechanism: 'điện', material: 'nhôm', form: 'hoàn chỉnh', evidence: {} },
  hypotheses: [{ chapter: '84', heading4: '8412', subheading6: '841231', why: 'thiết bị truyền động khí nén', confidence: 94 }],
  verify: { searchVi: ['thiết bị điều khiển xi lanh'], codes8: ['84123100'], unknowns: [] },
};
const R2_VAN = { decision: 'CHOT', hs: '84812090', confidence: 88, reason: 'Van dùng trong truyền động khí nén — 8481.20', basis: [{ stream: 'SAN_PHAM', claim: 'van điện từ khí nén', evidence: 'Van điện từ khí nén 5/2' }], conditions: [], alternatives: [{ hs: '84123100', whyNot: 'xi lanh' }], questions: [] };
const R1_KINH_3926 = {
  product: { nameVi: 'Sản phẩm nhựa thời trang', nameEn: 'plastic article', purpose: 'trang trí', mechanism: 'không áp dụng', material: 'nhựa', form: 'hoàn chỉnh', evidence: {} },
  hypotheses: [{ chapter: '39', heading4: '3926', subheading6: '392690', why: 'sản phẩm khác bằng plastic', confidence: 80 }],
  verify: { searchVi: ['sản phẩm nhựa'], codes8: ['39269099'], unknowns: [] },
};
const R2_KINH = { decision: 'CHOT', hs: '90049090', confidence: 85, reason: 'Kính đeo mắt khác — 9004.90', basis: [{ stream: 'SAN_PHAM', claim: 'kính mắt', evidence: 'Kính mắt thời trang' }], conditions: [], alternatives: [], questions: [] };
const chay = async (hang, llm, oz, env = {}) => {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = JSON.parse(JSON.stringify(llm)); ozItems = oz; llmCalls = [];
  const out = await classifyLoop({ tenHang: hang }, {});
  for (const k of Object.keys(env)) delete process.env[k];
  return { out, calls: [...llmCalls] };
};

const tat = await chay(VAN, [R1_VAN_8412, R2_VAN], OZ_VAN);
const bat = await chay(VAN, [R1_VAN_8412, R2_VAN], OZ_VAN, { HS_TIM_TRUOC: 'on', HS_TIM_TRUOC_NAP: '5' });
// Biến thể tối thiểu (mặc định HS_TIM_TRUOC_NAP=0): chỉ khối ứng viên ở vòng 1, gói vòng 2 không đổi.
const toiThieu = await chay(VAN, [R1_VAN_8412, R2_VAN], OZ_VAN, { HS_TIM_TRUOC: 'on' });
check('BẬT mặc định (NAP=0): đầu vào vòng 1 có khối ứng viên 8481, engine.timTruoc.nap rỗng', /\n1\. Nhóm 8481/.test(toiThieu.calls[0].user) && toiThieu.out.engine.timTruoc.nhom[0] === '8481' && toiThieu.out.engine.timTruoc.nap.length === 0, JSON.stringify(toiThieu.out.engine.timTruoc));
check('BẬT mặc định (NAP=0): gói vòng 2 TRÙNG TỪNG BYTE với lượt tắt (LLM giả trả cùng vòng 1) — không nạp thêm nhóm nào', toiThieu.calls[1].user === tat.calls[1].user && JSON.stringify(toiThieu.out.candidates.headings) === JSON.stringify(tat.out.candidates.headings), `${toiThieu.calls[1].user.length} vs ${tat.calls[1].user.length}`);
check('TẮT: đầu vào vòng 1 không có khối ứng viên; phản hồi không có engine.timTruoc / phases.timTruocMs', !tat.calls[0].user.includes(tt.NHAN_KHOI) && !('timTruoc' in tat.out.engine) && !('timTruocMs' in (tat.out.engine.phases || {})), tat.calls[0].user.slice(0, 300));
check('BẬT: đầu vào vòng 1 CHỨA khối ứng viên có nhóm 8481 (đứng đầu) cho ca van', bat.calls[0].step === 'understand' && bat.calls[0].user.includes(tt.NHAN_KHOI) && /\n1\. Nhóm 8481/.test(bat.calls[0].user), bat.calls[0].user.slice(-900));
check('BẬT: phần hồ sơ gốc của đầu vào vòng 1 giữ nguyên từng byte — khối chỉ NỐI THÊM phía sau', bat.calls[0].user.startsWith(`${tat.calls[0].user}\n\n${tt.NHAN_KHOI}`));
check('BẬT: lời dặn hệ thống vòng 1 KHÔNG đổi (trùng băm với lượt tắt, và bắt đầu bằng SYS_R1)', sha(bat.calls[0].system) === sha(tat.calls[0].system) && bat.calls[0].system.startsWith(SYS_R1));
check('BẬT: lời dặn hệ thống vòng 2 KHÔNG đổi', bat.calls[1] && tat.calls[1] && sha(bat.calls[1].system) === sha(tat.calls[1].system));
check('BẬT + NAP=5: headings của gather có 8481 dù LLM giả chỉ đoán 8412', bat.out.candidates.headings.includes('8481') && bat.out.candidates.headings.includes('8412'), JSON.stringify(bat.out.candidates.headings));
check('BẬT + NAP=5: gói vòng 2 có chú giải + dòng biểu thuế nhóm 8481', /■ NHÓM 8481/.test(bat.calls[1].user) && /84812090/.test(bat.calls[1].user));
check('BẬT: khối ứng viên KHÔNG lọt vào mục "HỒ SƠ GỐC (nguyên văn…)" của gói vòng 2 (không thành nguồn trích)', !bat.calls[1].user.includes(tt.NHAN_KHOI));
check('BẬT: engine.timTruoc {trangThai, nhom, nguon, ms} + phases.timTruocMs để đo', bat.out.engine.timTruoc?.trangThai === 'CO_UNG_VIEN' && bat.out.engine.timTruoc.nhom[0] === '8481' && typeof bat.out.engine.timTruoc.ms === 'number' && bat.out.engine.timTruoc.nguon['8481'].length > 0 && typeof bat.out.engine.phases.timTruocMs === 'number', JSON.stringify(bat.out.engine.timTruoc));
check('BẬT + NAP=5: mọi nhóm ứng viên đều được nạp vào gather (không qua cổng độ giống 0,6)', bat.out.engine.timTruoc.nhom.every((h) => bat.out.candidates.headings.includes(h)), `${bat.out.engine.timTruoc.nhom} | ${bat.out.candidates.headings}`);
check('BẬT: module không chọn mã — mã cuối vẫn là mã vòng 2 đưa ra', bat.out.results?.[0]?.hs === '84812090', bat.out.results?.[0]?.hs);

// Ca chứng minh CƠ CHẾ nạp nhóm: kính mắt — không từ điển nào, vòng 1 giả đoán 3926 ⇒ TẮT thì hồ sơ vụ việc KHÔNG có 9004.
const kTat = await chay(KINH, [R1_KINH_3926, R2_KINH], OZ_KINH);
const kBat = await chay(KINH, [R1_KINH_3926, R2_KINH], OZ_KINH, { HS_TIM_TRUOC: 'on', HS_TIM_TRUOC_NAP: '5' });
// (Đo ở gói của LƯỢT VÒNG 2 ĐẦU TIÊN: sau khi vòng 2 giả chốt 9004, chốt chặn "nhóm chưa kiểm" tự nạp 9004 ở cả hai lượt.)
check('kính mắt TẮT: gói vòng 2 đầu tiên KHÔNG có chú giải nhóm 9004 (vòng 1 đoán 3926; tờ khai Oz chỉ vào codePool, không thêm nhóm)', /■ NHÓM 3926/.test(kTat.calls[1].user) && !/■ NHÓM 9004/.test(kTat.calls[1].user));
check('kính mắt BẬT + NAP=5: gói vòng 2 đầu tiên CÓ chú giải nhóm 9004', /■ NHÓM 9004/.test(kBat.calls[1].user) && /■ NHÓM 3926/.test(kBat.calls[1].user), JSON.stringify(kBat.out.candidates.headings));
check('CA NGƯỢC: ca kính mắt BẬT không bị nạp nhóm 8481 của ca van', !kBat.out.candidates.headings.includes('8481') && !/Nhóm 8481/.test(kBat.calls[0].user));
const hBat = await chay('气动电磁阀 4V210-08', [R1_VAN_8412, R2_VAN], [], { HS_TIM_TRUOC: 'on' });
const hTat = await chay('气动电磁阀 4V210-08', [R1_VAN_8412, R2_VAN], []);
check('CA NGƯỢC: tên chữ Hán BẬT → đầu vào vòng 1 trùng từng byte với lượt TẮT, engine.timTruoc ghi BO_QUA_TEN_CHU_HAN', hBat.calls[0].user === hTat.calls[0].user && hBat.out.engine.timTruoc?.trangThai === 'BO_QUA_TEN_CHU_HAN');

// ───────────────────────── 7. HS_TIM_TRUOC=goi: gói phân biệt ở vòng 2 (kế hoạch đồ thị mục 5 bước 4) ─────────────────────────
const KP = require('../lib/do-thi/khoi-phan-biet.js');
const goi = await chay(VAN, [R1_VAN_8412, R2_VAN], OZ_VAN, { HS_TIM_TRUOC: 'goi' });
check('GOI: đầu vào vòng 1 trùng từng byte với on; lời dặn hệ thống hai vòng không đổi', goi.calls[0].user === toiThieu.calls[0].user && sha(goi.calls[0].system) === sha(tat.calls[0].system) && sha(goi.calls[1].system) === sha(tat.calls[1].system));
check('GOI: đầu vào vòng 2 = gói vòng 2 cũ + đúng một khối phân biệt ở cuối', goi.calls[1].user.startsWith(`${tat.calls[1].user}\n\n${KP.NHAN}:\n`) && goi.calls[1].user.split(KP.NHAN).length === 2, goi.calls[1].user.slice(-600));
check('GOI: engine.goiPhanBiet ghi nhóm còn sống (8412 vòng 1 đứng đầu, có 8481, tối đa 3) và kyTu ≤ 7000', goi.out.engine.goiPhanBiet?.nhom[0] === '8412' && goi.out.engine.goiPhanBiet.nhom.includes('8481') && goi.out.engine.goiPhanBiet.nhom.length <= 3 && goi.out.engine.goiPhanBiet.kyTu > 0 && goi.out.engine.goiPhanBiet.kyTu <= 7000, JSON.stringify(goi.out.engine.goiPhanBiet));
check('GOI: module không chọn mã — mã cuối vẫn là mã vòng 2 đưa ra', goi.out.results?.[0]?.hs === '84812090', goi.out.results?.[0]?.hs);
check('CA NGƯỢC: on / tắt không có khối phân biệt, không có engine.goiPhanBiet', [tat, bat, toiThieu].every((x) => !x.calls.some((c) => c.user.includes(KP.NHAN)) && !('goiPhanBiet' in x.out.engine)));
check('CA NGƯỢC: chỉ một nhóm còn sống → khối rỗng', KP.khoiPhanBiet([{ heading4: '8481' }], []).khoi === '' && KP.khoiPhanBiet(null, undefined).khoi === '');
check('nhóm còn sống: vòng 1 trước, bỏ trùng, tối đa 3, bỏ giá trị lạ', JSON.stringify(KP.nhomConSong([{ heading4: '84.12' }, { heading4: null }, {}], ['8481', '8412', 'x', '8414', '8424'])) === '["8412","8481","8414"]');
check('mọi dòng trong khối chỉ nối hai nhóm còn sống', KP.khoiPhanBiet([{ heading4: '8412' }], ['8481']).khoi.split('\n').slice(1).every((d) => /\(8412-8481\)/.test(d)));

// Chi phí thêm vào vòng 1 / vòng 2 của ca van (in ra để dán vào PR — không phải phép kiểm).
console.log(`CHI_PHI (NAP=5) ca van: vòng 1 +${bat.calls[0].user.length - tat.calls[0].user.length} ký tự (${tat.calls[0].user.length} → ${bat.calls[0].user.length}); gói vòng 2 +${bat.calls[1].user.length - tat.calls[1].user.length} ký tự (${tat.calls[1].user.length} → ${bat.calls[1].user.length}); nhóm trong gather ${tat.out.candidates.headings.length} → ${bat.out.candidates.headings.length}; tìm trước ${bat.out.engine.timTruoc.ms} ms`);
console.log(`CHI_PHI (NAP=5) ca kính: vòng 1 +${kBat.calls[0].user.length - kTat.calls[0].user.length} ký tự; gói vòng 2 +${kBat.calls[1].user.length - kTat.calls[1].user.length} ký tự (${kTat.calls[1].user.length} → ${kBat.calls[1].user.length}); nhóm trong gather ${kTat.out.candidates.headings.length} → ${kBat.out.candidates.headings.length}; tìm trước ${kBat.out.engine.timTruoc.ms} ms`);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
