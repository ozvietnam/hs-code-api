// Tối ưu độ trễ engine-loop (backlog 09 bước 3+4): HS_GON_DAU_RA + HS_MAX_VONG_SUA — AI giả, không mạng, không LLM.
//  A. CÔNG TẮC TẮT = origin/main TỪNG BYTE. Cùng kịch bản chạy qua golden master (tests/fixtures/engine-loop-goc/ — bản đóng
//     băng lib/engine-loop.js tại main 6280c65) và qua lib/engine-loop.js với HS_GON_DAU_RA=off HS_MAX_VONG_SUA=off: mọi lời gọi AI
//     (system, user, opts kể cả khoá undefined, đúng thứ tự khoá) và phản hồi (bỏ trường đo giờ) phải trùng từng byte. Hai bản
//     đọc CÙNG dữ liệu nên commit dữ liệu (sổ tay, biểu thuế…) không làm đỏ test. Thêm: băm SYS_R1/SYS_R2 ghim theo origin/main.
//  B. MẶC ĐỊNH BẬT: prompt có trần (khớp đúng phần code đọc), maxTokens 6000/10000, AI giả ra kết quả hợp lệ; JSON cụt/mảnh vụn
//     → lưới an toàn (gọi lại tắt suy nghĩ); trần vòng sửa giữ cờ; bước tất định NHOM_CHUA_KIEM (nhận / giải trình gộp / vòng AI).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { createHash } from 'crypto';
const require = createRequire(import.meta.url);
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_SO_TAY', 'HS_SO_TAY_DONG', 'HS_EMBED_POOL', 'LOOP_PROVIDER', 'ZAI_WEB_FACTS', 'ZAI_SEARCH_KEY']) delete process.env[k];

const llmTier = require('../lib/llm-tier');
const { parseJsonLoose } = require('../lib/parse-json');
// Nội dung thô của nhà cung cấp (để thử JSON cụt): đi qua ĐÚNG parseJsonLoose như lib/llm-tier.js callLLMJson.
class Tho { constructor(c) { this.c = c; } }
const UNDEF = (k, v) => (v === undefined ? '__undefined__' : v);
let script = []; let calls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  calls.push({ system, user, opts: JSON.stringify(opts, UNDEF), keys: Object.keys(opts), thinkingOff: opts.minimax?.extraBody?.thinking?.type === 'disabled', maxTokens: opts.maxTokens });
  const next = script.shift();
  if (next instanceof Error) throw next;
  if (next instanceof Tho) {
    try { return { json: parseJsonLoose(next.c), provider: 'stub', model: 'stub' }; } catch (pe) { throw new Error(`${pe.message} [stub/stub, ${next.c.length} ký tự]`); }
  }
  return { json: typeof next === 'function' ? next(user, system) : next, provider: 'stub', model: 'stub' };
};
// Bước AI giả trả theo VÒNG của lời gọi (lượt lùi "tắt suy nghĩ" của vòng 1 nhận JSON vòng 1, không lệch kịch bản).
const theoVong = (r1, r2) => (user, system) => JSON.parse(JSON.stringify(String(system).startsWith('VÒNG 1') ? r1 : r2));
console.error = () => {}; console.warn = () => {};
const ozMod = require('../lib/oz-precedent-search');
const ozThat = ozMod.searchOzByKeyword;
const webMod = require('../lib/web-facts.js');
const webThat = webMod.webFacts;
const WEB_GIA = async () => ({ cauTraLoi: 'Móc khoá súng ngón tay in 3D, không phải mô hình theo tỷ lệ.', nguon: [{ url: 'https://example.com' }] });
let ozGoi = 0;
// Golden master = RÀO CHẮN THỜI GIAN TRIỂN KHAI: chứng minh "off" ≡ main 6280c65 trong lúc hai công tắc mới bật trên prod.
// XOÁ fixture này cùng phần A dưới đây ≤ 2 tuần sau khi HS_GON_DAU_RA / HS_MAX_VONG_SUA được xác nhận ổn trên prod.
const GOC = require('../tests/fixtures/engine-loop-goc/engine-loop.6280c65.js');
const MOI = require('../lib/engine-loop.js');
const { TRAN } = MOI;
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 900)}`); } };
const clone = (v) => (typeof v === 'function' || v instanceof Error || v instanceof Tho ? v : JSON.parse(JSON.stringify(v)));

// ── dữ liệu kịch bản (AI giả) ──
const KNIFE = { tenHang: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', nameZh: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', specs: '用途: 用于摘取槟榔; 材质: 铝合金' };
const R1_KNIFE = { product: { nameVi: 'dao hái cau cán dài', nameEn: 'telescopic pole fruit picker knife', nameZh: '摘割槟榔刀伸缩杆', purpose: 'hái quả cau, cắt cành trên cao', mechanism: 'cơ-tay', material: 'hợp kim nhôm', evidence: { purpose: '用于摘取槟榔', mechanism: '', material: '铝合金' } }, hypotheses: [{ chapter: '82', heading4: '8201', subheading6: '820190', why: 'dụng cụ cầm tay nông nghiệp', confidence: 80 }], verify: { searchVi: ['dao hái cau', 'dụng cụ hái quả cán dài'], notesChapters: ['82'], codes8: ['82019000'], micQuery: null, unknowns: [] } };
const R2_KNIFE = { decision: 'CHOT', hs: '82019000', confidence: 88, reason: 'dụng cụ cầm tay nông nghiệp, cơ-tay', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'dùng hái cau', evidence: '用于摘取槟榔' }, { stream: 'CHU_GIAI', claim: 'nhóm 8201 gồm dụng cụ cầm tay nông nghiệp', ref: '8201' }], conditions: [{ fact: 'thao tác bằng tay, không động cơ', status: 'MET', evidence: '伸缩杆' }], alternatives: [], questions: [] };
const BIA = { decision: 'CHOT', hs: '84672900', confidence: 90, reason: 'dụng cụ có động cơ điện', basis: [{ stream: 'SAN_PHAM', claim: 'có động cơ điện', evidence: '电动机 220V' }], conditions: [], alternatives: [], questions: [] };
const TOY = { tenHang: '3D打印钥匙扣可发射小球解压玩具手指枪', nameZh: '3D打印钥匙扣可发射小球解压玩具手指枪', specs: '材质: 塑料; 工艺: 3D打印' };
const R1_TOY = { product: { nameVi: 'đồ chơi súng ngón tay in 3D', nameEn: '3D printed finger gun toy keychain', nameZh: '3D打印钥匙扣手指枪', purpose: 'đồ chơi giải trí bắn bi', mechanism: 'cơ-tay', material: 'nhựa PLA', evidence: { material: '材质: 塑料' } }, hypotheses: [{ chapter: '95', heading4: '9503', subheading6: '950300', why: 'đồ chơi khác', confidence: 85 }], verify: { searchVi: ['đồ chơi súng nhựa'], codes8: ['95030050', '95030099'], micQuery: null, unknowns: [] } };
const TOY_50 = { decision: 'CHOT', hs: '95030050', confidence: 80, reason: 'đồ chơi khác', basis: [{ stream: 'SAN_PHAM', claim: 'bằng nhựa', evidence: '材质: 塑料' }], conditions: [], alternatives: [], questions: [] };
const TOY_99 = { ...TOY_50, hs: '95030099', reason: 'đồ chơi khác bằng plastic → Loại khác' };
const TOY_HOI = { decision: 'HOI', hs: '950300', confidence: 50, reason: 'chưa rõ có phải mô hình theo tỷ lệ', basis: [], conditions: [{ fact: 'là mô hình thu nhỏ theo tỷ lệ của vật thật', status: 'UNKNOWN', evidence: '' }], alternatives: [], questions: [{ fact: 'mô hình theo tỷ lệ', question: 'Sản phẩm có phải bản thu nhỏ theo tỷ lệ của một vật thật không?', whereToFind: 'ảnh / hỏi người bán' }] };
const FAN = { tenHang: '家用排气扇 厨房卫生间换气扇 静音', nameZh: '家用排气扇 厨房卫生间换气扇 静音', specs: '功率: 30W; 用途: 厨房排气; 材质: 塑料' };
const R1_FAN85 = { product: { nameVi: 'quạt thông gió gia dụng', nameEn: 'household exhaust fan', nameZh: '家用排气扇', purpose: 'hút khí bếp, nhà vệ sinh', mechanism: 'điện', material: 'nhựa', form: 'hoàn chỉnh', evidence: {} }, hypotheses: [{ chapter: '85', heading4: '8509', subheading6: '850980', why: 'thiết bị điện gia dụng có động cơ', confidence: 70 }], verify: { searchVi: ['quạt thông gió'], codes8: ['85098090'], micQuery: null, unknowns: [] } };
const R1_FAN84 = { ...R1_FAN85, hypotheses: [{ chapter: '84', heading4: '8414', subheading6: '841451', why: 'quạt có động cơ', confidence: 70 }], verify: { searchVi: ['quạt thông gió'], codes8: ['84145199'], micQuery: null, unknowns: [] } };
const CHOT_8509 = { decision: 'CHOT', hs: '85098090', confidence: 75, reason: 'thiết bị điện gia dụng', basis: [{ stream: 'SAN_PHAM', claim: 'dùng hút khí bếp', evidence: '用途: 厨房排气' }], conditions: [], alternatives: [], questions: [] };
const BIA_8509 = { ...CHOT_8509, basis: [{ stream: 'SAN_PHAM', claim: 'không phải quạt', evidence: '本产品不是风扇' }] };
const CHOT_8414 = { decision: 'CHOT', hs: '84145199', confidence: 85, reason: 'quạt thông gió — chú giải 85.09 loại trừ sang 84.14', basis: [{ stream: 'SAN_PHAM', claim: 'quạt hút', evidence: '换气扇' }], conditions: [], alternatives: [], questions: [] };
const giaiTrinh = (doi, giu) => (user) => (/YÊU CẦU GIẢI TRÌNH/.test(user) ? clone(doi) : clone(giu));
// Live 25/10 "Thước kẻ 30 cm": vòng 1 nghĩ 39.26 (đồ dùng trường học bằng plastic), vòng 2 chọn 9017.20.10 theo tờ khai Oz → NHOM_CHUA_KIEM.
const RULER = { tenHang: 'Thước kẻ nhựa 30 cm dùng cho học sinh', specs: 'Chất liệu: nhựa; Chiều dài: 30 cm' };
const R1_RULER = { product: { nameVi: 'thước kẻ nhựa 30 cm', nameEn: 'plastic ruler 30 cm', purpose: 'kẻ đường thẳng, đo độ dài cho học sinh', mechanism: 'không áp dụng', material: 'nhựa', form: 'hoàn chỉnh', evidence: {} }, hypotheses: [{ chapter: '39', heading4: '3926', subheading6: '392610', why: 'đồ dùng văn phòng/trường học bằng plastic', confidence: 70 }], verify: { searchVi: ['thước kẻ nhựa'], codes8: ['39261000'], micQuery: null, unknowns: [] } };
const R2_RULER = { decision: 'CHOT', hs: '90172010', confidence: 85, reason: 'thước kẻ là dụng cụ vẽ thuộc nhóm 90.17', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'thước kẻ', evidence: 'Thước kẻ nhựa 30 cm' }, { stream: 'TIEN_LE', claim: 'Oz đã khai 9017.20.10', ref: '90172010' }], conditions: [], alternatives: [{ hs: '39261000', whyNot: 'Chú giải 2 Chương 39 loại trừ dụng cụ vẽ thuộc Chương 90' }], questions: [] };
const ozRuler = (cov) => async () => { ozGoi += 1; return { items: [{ hsCode: '90172010', tenHang: 'Thước kẻ nhựa 30cm', ozCount: 5, matchCoverage: cov }] }; };
const ozRong = async () => { ozGoi += 1; return { items: [] }; };
const CLIP = { tenHang: 'Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm, hộp 100 chiếc', chatLieu: 'thép mạ niken', congDung: 'kẹp giữ giấy tờ văn phòng' };
const R1_CLIP = { product: { nameVi: 'kẹp giấy văn phòng', nameEn: 'nickel plated steel paper clip', nameZh: '', purpose: 'kẹp giữ giấy tờ văn phòng', mechanism: 'không áp dụng', material: 'thép mạ niken', dimensions: 'dài 28 mm', form: 'hoàn chỉnh', evidence: { purpose: 'kẹp giữ giấy tờ văn phòng', material: 'thép mạ niken' } }, hypotheses: [{ chapter: '83', heading4: '8305', subheading6: '830590', why: 'kẹp giấy bằng kim loại cơ bản', confidence: 95 }], verify: { searchVi: ['kẹp giấy văn phòng'], notesChapters: ['83'], codes8: ['83059010'], micQuery: null, unknowns: [] } };
const R2_CLIP = { decision: 'CHOT', hs: '83059010', confidence: 97, reason: 'kẹp giấy bằng kim loại cơ bản — nhóm 83.05', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'kẹp giấy thép mạ niken', evidence: 'Tiêu đề gốc: Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm, hộp 100 chiếc | chatLieu: thép mạ niken' }], conditions: [{ fact: 'Vật liệu thép mạ niken', status: 'MET', evidence: 'chatLieu: thép mạ niken' }], alternatives: [], questions: [] };
const SOCKET = { tenHang: '86型墙壁暗装电源插座带开关五孔面板家用', nameZh: '86型墙壁暗装电源插座带开关五孔面板家用', specs: '额定电流: 10A; 额定电压: 250V' };
const R1_SOCKET = { product: { nameVi: 'ổ cắm điện âm tường', nameEn: 'wall socket 86 type', nameZh: '86型墙壁暗装电源插座', purpose: 'ổ cắm điện gia dụng', mechanism: 'điện', material: 'PC', evidence: {} }, hypotheses: [{ chapter: '85', heading4: '8536', subheading6: '853669', why: 'ổ cắm', confidence: 90 }], verify: { searchVi: ['ổ cắm điện'], codes8: ['85366932', '85366992'], micQuery: 'wall socket 86', unknowns: [] } };
const R2_SOCKET = { decision: 'CHOT', hs: '85366932', confidence: 80, reason: 'ổ cắm', basis: [{ stream: 'SAN_PHAM', claim: 'ổ cắm 10A', evidence: '额定电流: 10A' }], conditions: [], alternatives: [], questions: [] };
// JSON cụt: (a) cắt giữa JSON sau khi đã nghĩ xong; (b) cắt NGAY TRONG <think> khi phần nghĩ có nháp object — parseJsonLoose
// vớt được MẢNH đó ({results:[giả thuyết]} / {results:[mã thay thế]}) và trả về như thể là đáp án.
const R1_CUT_JSON = new Tho('<think>Hàng là dao hái cau, cơ-tay.</think>{"product":{"nameVi":"dao hái cau cán dài","keySpecs":[{"k":"chất liệu","v":"nhôm","evidence":"铝合金"},{"k":"dài","v":"12 m","evid');
const R1_CUT_THINK = new Tho('<think>Phân tích: tiêu đề 摘割槟榔刀 là dao hái cau. Nháp giả thuyết {"chapter":"82","heading4":"8201","subheading6":"820190","why":"dụng cụ cầm tay","confidence":80} rồi xét thêm nhóm 8467 vì cán dài có thể');
const R2_CUT_THINK = new Tho('<think>Ứng viên chính 8201.90.00. Mã đối lập {"hs":"84672900","whyNot":"không có động cơ"} cần loại bằng chú giải. Tiếp theo xét dòng');

const SC = {
  'dao hái cau — đường hạnh phúc': () => ({ attrs: KNIFE, steps: [R1_KNIFE, R2_KNIFE] }),
  'đồ chơi — chặn "trừ plastic" → sửa': () => ({ attrs: TOY, steps: [R1_TOY, TOY_50, (u) => (/MAU_THUAN_NHAN_DONG/.test(u) ? clone(TOY_99) : clone(TOY_50))] }),
  'câu trích bịa ×3 — chặn tới trần': () => ({ attrs: KNIFE, steps: [R1_KNIFE, BIA, BIA, BIA] }),
  'HỎI → NEED_FACTS': () => ({ attrs: TOY, steps: [R1_TOY, TOY_HOI] }),
  'vòng 2 JSON hỏng → tắt suy nghĩ': () => ({ attrs: KNIFE, steps: [R1_KNIFE, new Error('No parseable JSON in LLM output [minimax/MiniMax-M3, 46103 ký tự]'), R2_KNIFE] }),
  'vòng 1 lỗi → RETRY': () => ({ attrs: KNIFE, steps: [new Error('HTTP 429 Token Plan rate limit')] }),
  'NCC khai khác nhóm → sửa': () => ({ attrs: { ...KNIFE, supplierHs: { code: '84672900', source: 'made-in-china' } }, steps: [R1_KNIFE, R2_KNIFE, (u) => (/NCC_KHAI_KHAC_NHOM/.test(u) ? { ...clone(R2_KNIFE), reason: 'Nhà cung cấp khai 8467 nhưng không có động cơ — giữ 8201', alternatives: [{ hs: '84672900', whyNot: 'không có động cơ' }] } : clone(R2_KNIFE))] }),
  'sổ tay gates — loại trừ → giải trình đổi mã': () => ({ attrs: FAN, env: { HS_SO_TAY: 'gates' }, steps: [R1_FAN85, CHOT_8509, giaiTrinh(CHOT_8414, CHOT_8509)] }),
  'sổ tay full — không giải trình → UNRESOLVED': () => ({ attrs: FAN, env: { HS_SO_TAY: 'full' }, steps: [R1_FAN85, CHOT_8509, CHOT_8509] }),
  'sổ tay gates — chặn rồi giải trình (4 vòng)': () => ({ attrs: FAN, env: { HS_SO_TAY: 'gates' }, steps: [R1_FAN85, BIA_8509, CHOT_8509, giaiTrinh(CHOT_8414, CHOT_8509)] }),
  'sổ tay gates — nhóm chưa kiểm rồi giải trình': () => ({ attrs: FAN, env: { HS_SO_TAY: 'gates' }, steps: [R1_FAN84, CHOT_8509, giaiTrinh(CHOT_8414, CHOT_8509), giaiTrinh(CHOT_8414, CHOT_8509)] }),
  'thước kẻ — NHOM_CHUA_KIEM (tờ khai Oz)': () => ({ attrs: RULER, env: { HS_SO_TAY: 'full' }, oz: ozRuler(100), steps: [R1_RULER, R2_RULER, R2_RULER, R2_RULER] }),
  'vòng 1 JSON cụt giữa chừng': () => ({ attrs: KNIFE, steps: [R1_CUT_JSON, theoVong(R1_KNIFE, R2_KNIFE), theoVong(R1_KNIFE, R2_KNIFE)] }),
  'vòng 1 cụt trong <think> (mảnh vụn)': () => ({ attrs: KNIFE, steps: [R1_CUT_THINK, theoVong(R1_KNIFE, R2_KNIFE), theoVong(R1_KNIFE, R2_KNIFE), theoVong(R1_KNIFE, R2_KNIFE)] }),
  'vòng 2 cụt trong <think> (mảnh vụn)': () => ({ attrs: KNIFE, steps: [R1_KNIFE, R2_CUT_THINK, theoVong(R1_KNIFE, R2_KNIFE), theoVong(R1_KNIFE, R2_KNIFE)] }),
  'kẹp giấy — ca prod 25/10': () => ({ attrs: CLIP, steps: [R1_CLIP, R2_CLIP, R2_CLIP] }),
  'ổ cắm — bảng quyết định ghi đè': () => ({ attrs: SOCKET, steps: [R1_SOCKET, R2_SOCKET] }),
  // B1b (#467): công tắc off phải ≡ main cả trên đường tra web + chạy lại một lượt (web giả, không mạng).
  'B1b shadow — webHint': () => ({ attrs: TOY, env: { ZAI_WEB_FACTS: 'shadow' }, web: WEB_GIA, steps: [R1_TOY, TOY_HOI] }),
  'B1b on — tra web, chạy lại một lượt': () => ({ attrs: TOY, env: { ZAI_WEB_FACTS: 'on' }, web: WEB_GIA, steps: [R1_TOY, TOY_HOI, R1_TOY, TOY_99] }),
  'B1b on — lượt chạy lại hỏng': () => ({ attrs: TOY, env: { ZAI_WEB_FACTS: 'on' }, web: WEB_GIA, steps: [R1_TOY, TOY_HOI, new Error('HTTP 429 Token Plan rate limit')] }),
};

const ENV_KEYS = ['HS_SO_TAY', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'ZAI_WEB_FACTS'];
/** Chạy một kịch bản qua `mod` (GOC/MOI) với env cho trước; trả lời gọi AI + phản hồi đã bỏ trường đo giờ. */
async function chay(mod, scName, env = {}) {
  const sc = SC[scName]();
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  for (const [k, v] of Object.entries({ ...(sc.env || {}), ...env })) process.env[k] = v;
  ozMod.searchOzByKeyword = sc.oz || ozThat;
  webMod.webFacts = sc.web || webThat;
  script = sc.steps.map(clone); calls = [];
  let out = null; let err = null;
  const ghiOut = process.stdout.write; // dòng đo b1b_web (có ts) không thuộc phần so sánh
  if (sc.web) process.stdout.write = () => true;
  try { out = await mod.classifyLoop(clone(sc.attrs), {}); } catch (e) { err = String(e?.stack || e); } finally { process.stdout.write = ghiOut; }
  webMod.webFacts = webThat;
  for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  ozMod.searchOzByKeyword = ozThat;
  let o = null;
  if (out) {
    o = JSON.parse(JSON.stringify(out, UNDEF));
    delete o.engine.ms; delete o.engine.phases;
    for (const e of o.engine.gates || []) delete e.ms; // ms của nhật ký lùi/thử lại
  }
  return { calls: calls.map(({ system, user, opts }) => ({ system, user, opts })), out: o, err, conLai: script.length, raw: out, rawCalls: calls };
}
const lechDau = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i += 1; return i >= a.length && a.length === b.length ? '' : `lệch tại ký tự ${i}: GOC «${a.slice(Math.max(0, i - 80), i + 120)}» ≠ MỚI «${b.slice(Math.max(0, i - 80), i + 120)}»`; };
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// ═════════ A. CÔNG TẮC TẮT = origin/main TỪNG BYTE ═════════
// Băm prompt hệ thống của origin/main 6280c65 (độc lập dữ liệu) — đổi chữ SYS_R1/SYS_R2 là đỏ ở đây.
check('A0 SYS_R1 trùng origin/main 6280c65 (sha256 ghim)', sha(MOI.SYS_R1) === '2ceb6b55f3cced0ece9bca9cb3d004d91654865a94cfc4bd0df130bd63807f8d' && MOI.SYS_R1 === GOC.SYS_R1, sha(MOI.SYS_R1));
check('A0 SYS_R2 trùng origin/main 6280c65 (sha256 ghim)', sha(MOI.SYS_R2) === '6d1267b2028d80fa264b4c3bb34fafabfc3dadd80d69fe40714d965077cd5677' && MOI.SYS_R2 === GOC.SYS_R2, sha(MOI.SYS_R2));
const TAT = { HS_GON_DAU_RA: 'off', HS_MAX_VONG_SUA: 'off' };
for (const name of Object.keys(SC)) {
  const a = await chay(GOC, name);
  const b = await chay(MOI, name, TAT);
  const sa = JSON.stringify({ calls: a.calls, out: a.out, err: a.err, conLai: a.conLai });
  const sb = JSON.stringify({ calls: b.calls, out: b.out, err: b.err, conLai: b.conLai });
  check(`A tắt = origin/main từng byte: ${name} (${a.calls.length} lời gọi AI)`, sa === sb && !a.err && a.calls.length > 0, lechDau(sa, sb) || a.err);
}
// Biến thể tắt khác: HS_GON_DAU_RA nhận 0/false; với HS_MAX_VONG_SUA chỉ "off" là công tắc tắt ("0" là trần 0 vòng sửa).
{
  const a = await chay(GOC, 'câu trích bịa ×3 — chặn tới trần');
  const b = await chay(MOI, 'câu trích bịa ×3 — chặn tới trần', { HS_GON_DAU_RA: '0', HS_MAX_VONG_SUA: 'OFF' });
  check('A HS_GON_DAU_RA=0 + HS_MAX_VONG_SUA=OFF (hoa) cũng = origin/main', JSON.stringify(a.calls) === JSON.stringify(b.calls) && JSON.stringify(a.out) === JSON.stringify(b.out), lechDau(JSON.stringify(a.calls), JSON.stringify(b.calls)));
}

// ═════════ B. MẶC ĐỊNH BẬT ═════════
// B1. Prompt có trần đúng bảng TRAN, giữ nguyên prefix gốc + yêu cầu nguồn/trích; maxTokens; kết quả hợp lệ.
{
  const r = await chay(MOI, 'dao hái cau — đường hạnh phúc');
  const [c1, c2] = r.rawCalls;
  const has = (s, ...xs) => xs.every((x) => s.includes(x));
  check('B1 vòng 1 = SYS_R1 + khối GỌN (prefix gốc giữ nguyên từng byte)', c1.system === MOI.SYS_R1_GON && c1.system.startsWith(`${MOI.SYS_R1}\n`) && c1.system.length > MOI.SYS_R1.length + 300);
  check('B1 khối GỌN vòng 1 nêu đủ trần', has(c1.system, 'GỌN ĐẦU RA', 'JSON MỘT DÒNG', `≤ ${TRAN.productChars} ký tự`, `≤ ${TRAN.r1Evidence} ký tự`, `keySpecs ≤ ${TRAN.keySpecs}`, `hypotheses ≤ ${TRAN.hypotheses}`, `'why' ≤ ${TRAN.why}`, `searchVi ≤ ${TRAN.searchVi}`, `codes8 ≤ ${TRAN.codes8}`, `unknowns ≤ ${TRAN.unknowns}`, 'NGUYÊN VĂN', 'Không bỏ trường nào'), c1.system.slice(MOI.SYS_R1.length));
  check('B1 vòng 2 = SYS_R2 + khối GỌN (prefix gốc giữ nguyên từng byte)', c2.system === MOI.SYS_R2_GON && c2.system.startsWith(`${MOI.SYS_R2}\n`));
  check('B1 khối GỌN vòng 2 nêu đủ trần + giữ nguồn/trích', has(c2.system, `'reason' ≤ ${TRAN.reason}`, `basis ≤ ${TRAN.basis}`, `'claim' ≤ ${TRAN.claim}`, `'evidence' ≤ ${TRAN.basisEvidence}`, `'ref' ≤ ${TRAN.ref}`, `conditions ≤ ${TRAN.conditions}`, `alternatives ≤ ${TRAN.alternatives}`, `'whyNot' ≤ ${TRAN.whyNot}`, `questions ≤ ${TRAN.questions}`, `'answer' ≤ ${TRAN.answer}`, 'Nguồn/trích GIỮ NGUYÊN', "SAN_PHAM phải có 'evidence' CHÉP NGUYÊN VĂN", 'Không bỏ trường nào'), c2.system.slice(MOI.SYS_R2.length));
  check('B1 maxTokens mặc định 6000 / 10000', c1.maxTokens === 6000 && c2.maxTokens === 10000 && MOI.R1_MAX_TOKENS_GON === 6000 && MOI.R2_MAX_TOKENS_GON === 10000, JSON.stringify([c1.maxTokens, c2.maxTokens]));
  check('B1 kiemKhoa không lọt vào lời gọi nhà cung cấp', !c1.keys.includes('kiemKhoa') && !c2.keys.includes('kiemKhoa'), JSON.stringify([c1.keys, c2.keys]));
  check('B1 AI giả → kết quả hợp lệ: REVIEW 82019000, 2 lời gọi, câu trích verified', r.raw.status === 'REVIEW' && r.raw.results[0]?.hs === '82019000' && r.calls.length === 2 && r.raw.results[0].basis[0].verified === true, JSON.stringify([r.raw.status, r.raw.results?.[0]?.hs, r.calls.length]));
  check('B1 engine.toiUu ghi cấu hình lượt chạy (chống đo nhầm nhánh)', JSON.stringify(r.raw.engine.toiUu) === JSON.stringify({ gonDauRa: true, maxVongSua: 1, r1MaxTokens: 6000, r2MaxTokens: 10000 }), JSON.stringify(r.raw.engine.toiUu));
  const t = await chay(MOI, 'dao hái cau — đường hạnh phúc', TAT);
  check('B1 GỌN chỉ đổi prompt HỆ THỐNG: hồ sơ/gói vòng 2 (user) trùng nhánh tắt', r.rawCalls.map((c) => c.user).join('\u0000') === t.rawCalls.map((c) => c.user).join('\u0000'));
  check('B1 nhánh tắt không có engine.toiUu (shape phản hồi như cũ)', t.raw.engine.toiUu === undefined);
}
// B1-tran. Trần = ĐÚNG phần code đọc (không thấp hơn): đổi giới hạn trong code mà quên bảng TRAN → đỏ ở đây.
{
  const { gates, gather } = MOI;
  const { groundingSourceOf } = require('../lib/classify.js');
  const long = (ch, n) => ch.repeat(n);
  const ctx = { source: groundingSourceOf(KNIFE), productText: `${KNIFE.tenHang}\n${KNIFE.specs}`, gathered: { headings: ['8201'], mic: null, supplier: null }, machinery: false, round: 2, productName: 'dao hái cau', form: 'hoàn chỉnh', pool: [] };
  const g = gates({ decision: 'CHOT', hs: '82019000', basis: Array.from({ length: 15 }, () => ({ stream: 'SUY_LUAN', claim: long('c', 500), evidence: long('e', 500), ref: long('r', 300) })), conditions: Array.from({ length: 12 }, () => ({ fact: long('f', 500), status: 'UNKNOWN', evidence: '' })) }, ctx);
  check('B1-tran basis: gates() đọc đúng TRAN.basis mục, claim/evidence/ref đúng TRAN.claim/basisEvidence/ref ký tự', g.basis.length === TRAN.basis && g.basis[0].claim.length === TRAN.claim && g.basis[0].evidence.length === TRAN.basisEvidence && g.basis[0].ref.length === TRAN.ref, JSON.stringify([g.basis.length, g.basis[0].claim.length, g.basis[0].evidence.length, g.basis[0].ref.length]));
  check('B1-tran conditions: gates() đọc đúng TRAN.conditions mục, fact đúng TRAN.fact ký tự', g.conditions.length === TRAN.conditions && g.conditions[0].fact.length === TRAN.fact, JSON.stringify([g.conditions.length, g.conditions[0].fact.length]));
  const gt = await gather({ product: { nameVi: 'dao hái cau', purpose: long('p', 5000) }, hypotheses: [{ chapter: '82', heading4: '8201', subheading6: '820190', why: long('w', 600), confidence: 80 }], verify: { searchVi: ['dao hái cau'], codes8: ['82019000'] } }, KNIFE, { micAllowed: false });
  const spBlock = gt.pack.split('HỒ SƠ BẢN CHẤT')[1].split('\n\n')[0];
  const spJson = spBlock.slice(spBlock.indexOf('\n') + 1);
  check('B1-tran product: gói vòng 2 chỉ đọc TRAN.productChars ký tự JSON product', spJson.length === TRAN.productChars, String(spJson.length));
  check('B1-tran why: gói vòng 2 cắt why ở TRAN.why ký tự', gt.pack.includes(`${long('w', TRAN.why)}…`) && !gt.pack.includes(long('w', TRAN.why + 1)));
  script = [clone(R1_TOY), { ...clone(TOY_HOI), reason: long('x', 900), questions: Array.from({ length: 9 }, (_, i) => ({ fact: `f${i}`, question: `Câu hỏi thuộc tính số ${i}?`, whereToFind: 'nhãn' })) }]; calls = [];
  const r9 = await MOI.classifyLoop(clone(TOY), {});
  check('B1-tran questions: code kết quả giữ đúng TRAN.questions; reason cắt ở TRAN.reason', r9.nextAction.questions.length === TRAN.questions && r9.results[0].reason.length === TRAN.reason + 1 && r9.results[0].reason.endsWith('…'), JSON.stringify([r9.nextAction.questions.length, r9.results[0]?.reason?.length]));
}

// B2. JSON cụt → lưới an toàn sẵn có (gọi lại tắt suy nghĩ), không crash.
{
  let r = await chay(MOI, 'vòng 1 JSON cụt giữa chừng');
  check('B2 vòng 1 JSON cụt giữa chừng → gọi lại tắt suy nghĩ → kết quả hợp lệ', r.raw.results[0]?.hs === '82019000' && r.rawCalls[1].thinkingOff && r.rawCalls[1].system.startsWith('VÒNG 1') && r.raw.engine.gates.some((x) => x.fallback === 'thinking-off' && x.step === 'understand' && /parseable JSON/.test(x.cause)), JSON.stringify([r.raw.status, r.raw.engine.gates]));
  r = await chay(MOI, 'vòng 1 cụt trong <think> (mảnh vụn)');
  check('B2 vòng 1 cụt trong <think>: mảnh vụn bị kiemKhoa bác → tắt suy nghĩ → hồ sơ đúng → 82019000', r.rawCalls[1].thinkingOff && r.rawCalls[1].system.startsWith('VÒNG 1') && r.raw.results[0]?.hs === '82019000' && r.raw.dossier.product.nameVi === 'dao hái cau cán dài' && r.raw.engine.gates.some((x) => x.fallback === 'thinking-off' && /thiếu khoá bắt buộc của bước understand/.test(x.cause)), JSON.stringify([r.raw.status, r.raw.results?.[0]?.hs, r.raw.engine.gates]));
  const t = await chay(MOI, 'vòng 1 cụt trong <think> (mảnh vụn)', TAT);
  check('B2 (đối chứng) công tắc tắt: mảnh vụn lọt thành hồ sơ vòng 1 như origin/main — không crash nhưng hồ sơ rỗng', !t.rawCalls[1].thinkingOff && t.rawCalls[1].system.startsWith('VÒNG 2') && Object.keys(t.raw.dossier.product).length === 0, JSON.stringify(t.raw.dossier?.product));
  r = await chay(MOI, 'vòng 2 cụt trong <think> (mảnh vụn)');
  check('B2 vòng 2 cụt trong <think>: mảnh {hs,whyNot} (mã thay thế) bị bác → tắt suy nghĩ → REVIEW 82019000, 3 lời gọi', r.raw.status === 'REVIEW' && r.raw.results[0]?.hs === '82019000' && r.calls.length === 3 && r.rawCalls[2].thinkingOff && r.raw.engine.gates.some((x) => x.fallback === 'thinking-off' && /thiếu khoá bắt buộc của bước gir/.test(x.cause)), JSON.stringify([r.raw.status, r.calls.length, r.raw.engine.gates]));
  // Lượt lùi cũng hỏng → đường lỗi sẵn có, không crash.
  script = [R1_CUT_THINK, new Error('timeout sau 30000ms')]; calls = [];
  let out = await MOI.classifyLoop(clone(KNIFE), {});
  check('B2 vòng 1 mảnh vụn + lượt lùi lỗi → RETRY (ENGINE_TIMEOUT), không crash', out.nextAction?.type === 'RETRY' && out.results.length === 0, JSON.stringify([out.status, out.nextAction]));
  script = [clone(R1_KNIFE), R2_CUT_THINK, new Error('timeout sau 30000ms')]; calls = [];
  out = await MOI.classifyLoop(clone(KNIFE), {});
  check('B2 vòng 2 mảnh vụn + lượt lùi lỗi → ENGINE_TIMEOUT có hồ sơ, không crash', out.nextAction?.type === 'RETRY' && out.dossier?.product?.nameVi === 'dao hái cau cán dài', JSON.stringify([out.status, out.nextAction]));
  // Lượt lùi trả mảnh vụn tiếp → nhận như cũ (không lặp vô hạn), không crash.
  script = [R1_CUT_THINK, R1_CUT_THINK, clone(R2_KNIFE), clone(R2_KNIFE), clone(R2_KNIFE)]; calls = [];
  out = await MOI.classifyLoop(clone(KNIFE), {});
  check('B2 lượt lùi cũng mảnh vụn → không lặp, đi tiếp như cũ, không crash', typeof out.status === 'string' && calls.filter((c) => c.system.startsWith('VÒNG 1')).length === 2, JSON.stringify([out.status, calls.length]));
  // callWithFallback trực tiếp: mảnh {"hs","whyNot"} có `hs` thật nhưng thiếu `decision` → bị bác → lượt lùi tắt suy nghĩ.
  const nk = [];
  script = [new Tho('<think>Mã đối lập {"hs":"84672900","whyNot":"không có động cơ"} cần'), clone(R2_KNIFE)]; calls = [];
  const cw = await MOI.callWithFallback(MOI.SYS_R2_GON, 'u', { step: 'gir', maxTokens: 10000, timeoutMs: 1000, kiemKhoa: MOI.DU_KHOA.gir }, nk);
  check('B2 callWithFallback: mảnh {hs,whyNot} bị kiemKhoa bác → lượt lùi tắt suy nghĩ trả đáp án đủ khoá', cw.fallback === true && cw.json?.decision === 'CHOT' && calls.length === 2 && calls[1].thinkingOff && nk.some((x) => x.fallback === 'thinking-off'), JSON.stringify([cw, nk]));
  check('B2 DU_KHOA: đáp án đủ khoá qua; mảnh vụn/wrapper/rỗng bị bác', MOI.DU_KHOA.gir(R2_KNIFE) && MOI.DU_KHOA.understand(R1_KNIFE) && !MOI.DU_KHOA.gir({ hs: '84672900', whyNot: 'x' }) && !MOI.DU_KHOA.gir({ results: [{ hs: '84672900' }], missing: [] }) && !MOI.DU_KHOA.understand({ chapter: '82', heading4: '8201', confidence: 80 }) && !MOI.DU_KHOA.understand({ results: [{ confidence: 80 }] }) && !MOI.DU_KHOA.understand(null) && !MOI.DU_KHOA.gir(undefined));
}

// B3. HS_MAX_VONG_SUA — trần vòng sửa (theo lý do bị chặn), giữ cờ.
{
  let r = await chay(MOI, 'câu trích bịa ×3 — chặn tới trần', { HS_MAX_VONG_SUA: '1' });
  check('B3 HS_MAX_VONG_SUA=1: dừng sau 1 vòng sửa (3 lời gọi), NEEDS_EXPERT/GATE_BLOCKED, "Chưa chốt được", ghi trần', r.calls.length === 3 && r.raw.status === 'NEEDS_EXPERT' && r.raw.nextAction?.reasonCode === 'GATE_BLOCKED' && r.raw.missing.some((m) => /Chưa chốt được/.test(m)) && r.raw.engine.gates.some((x) => x.note === 'trần vòng sửa HS_MAX_VONG_SUA=1 — dừng, trả đáp án cuối kèm cờ hiện có' && x.round === 3), JSON.stringify([r.calls.length, r.raw.status, r.raw.engine.gates]));
  check('B3 chạm trần: mã đang bị chặn vẫn nằm trong kết quả kèm cờ (không rơi thành LLM_REJECTED)', r.raw.results[0]?.hs === '84672900' && r.raw.candidates.headings.includes('8467'), JSON.stringify(r.raw.results));
  const d = await chay(MOI, 'câu trích bịa ×3 — chặn tới trần');
  check('B3 mặc định (trống) = 1 vòng sửa', d.calls.length === 3 && JSON.stringify(d.out) === JSON.stringify(r.out));
  r = await chay(MOI, 'câu trích bịa ×3 — chặn tới trần', { HS_MAX_VONG_SUA: '0' });
  check('B3 HS_MAX_VONG_SUA=0: không vòng sửa (2 lời gọi), vẫn NEEDS_EXPERT + ghi trần', r.calls.length === 2 && r.raw.status === 'NEEDS_EXPERT' && r.raw.engine.gates.some((x) => /HS_MAX_VONG_SUA=0/.test(x.note || '')), JSON.stringify([r.calls.length, r.raw.status]));
  r = await chay(MOI, 'câu trích bịa ×3 — chặn tới trần', { HS_MAX_VONG_SUA: '2' });
  check('B3 HS_MAX_VONG_SUA=2: hai vòng sửa như MAX_ROUNDS (4 lời gọi), không ghi trần', r.calls.length === 4 && !r.raw.engine.gates.some((x) => /trần vòng sửa/.test(x.note || '')), JSON.stringify([r.calls.length, r.raw.engine.gates]));
  // Lượt giải trình sổ tay KHÔNG tính vào trần: chặn → 1 vòng sửa → qua → sổ tay nghi → vẫn được giải trình → AI đổi đúng 84.14.
  r = await chay(MOI, 'sổ tay gates — chặn rồi giải trình (4 vòng)');
  check('B3 giải trình sổ tay không tính vào trần: 4 lời gọi, CHANGED 85098090 → 84145199, không cờ', r.calls.length === 4 && r.raw.results[0]?.hs === '84145199' && r.raw.soTay?.outcome === 'CHANGED' && r.raw.review.needed === false, JSON.stringify([r.calls.length, r.raw.results?.[0]?.hs, r.raw.soTay?.outcome]));
  r = await chay(MOI, 'sổ tay gates — chặn rồi giải trình (4 vòng)', { HS_MAX_VONG_SUA: '0' });
  check('B3 HS_MAX_VONG_SUA=0 + vòng 2 bị chặn → dừng, giữ cờ chặn (sổ tay chưa chạy vì còn chặn)', r.calls.length === 2 && r.raw.status === 'NEEDS_EXPERT' && r.raw.nextAction?.reasonCode === 'GATE_BLOCKED', JSON.stringify([r.calls.length, r.raw.status]));
  r = await chay(MOI, 'sổ tay full — không giải trình → UNRESOLVED', { HS_MAX_VONG_SUA: '0' });
  check('B3 HS_MAX_VONG_SUA=0 vẫn cho lượt giải trình sổ tay (3 lời gọi) → UNRESOLVED + cờ chuyên viên', r.calls.length === 3 && r.raw.soTay?.outcome === 'UNRESOLVED' && r.raw.review.needed === true && r.raw.review.reasons.some((x) => /Sổ tay chú giải/.test(x)), JSON.stringify([r.calls.length, r.raw.soTay?.outcome, r.raw.review]));
}

// B4. NHOM_CHUA_KIEM tất định (cùng công tắc HS_MAX_VONG_SUA).
{
  ozGoi = 0;
  let r = await chay(MOI, 'thước kẻ — NHOM_CHUA_KIEM (tờ khai Oz)');
  const td = r.raw.engine.gates.find((x) => x.tatDinh === 'NHOM_CHUA_KIEM');
  check('B4 thước kẻ: nhóm 9017 + sổ tay + tờ khai Oz đúng mã → nhận tất định, 2 lời gọi thay 3', r.calls.length === 2 && r.raw.status === 'REVIEW' && r.raw.results[0]?.hs === '90172010' && td?.ketQua === 'CHAP_NHAN' && td.nhom === '9017' && /tờ khai Oz 90172010/.test(td.nguon?.[0] || ''), JSON.stringify([r.calls.length, r.raw.status, r.raw.engine.gates]));
  check('B4 nhận tất định KHÔNG im lặng: cảnh báo antiPatternWarnings + nhóm 9017 trong ứng viên', r.raw.antiPatternWarnings.some((w) => /Nhóm 9017: AI chọn 90172010 khi hồ sơ vụ việc chưa có chú giải[^]*sổ tay nhóm 9017/.test(w.description)) && r.raw.candidates.headings.includes('9017'), JSON.stringify(r.raw.antiPatternWarnings));
  check('B4 vẫn chạy đủ chốt chặn trên đáp án (log vòng 2 ghi NHOM_CHUA_KIEM rồi bước tất định blocks [])', r.raw.engine.gates[0].blocks.join() === 'NHOM_CHUA_KIEM' && td.blocks.length === 0);
  const t = await chay(MOI, 'thước kẻ — NHOM_CHUA_KIEM (tờ khai Oz)', { HS_MAX_VONG_SUA: 'off' });
  check('B4 (đối chứng) HS_MAX_VONG_SUA=off: vòng AI sửa như cũ (3 lời gọi, vòng 3 có chú giải 9017 + lý do chặn)', t.calls.length === 3 && /NHÓM 9017/.test(t.calls[2].user) && /\[NHOM_CHUA_KIEM\]/.test(t.calls[2].user) && !t.raw.engine.gates.some((x) => x.tatDinh), JSON.stringify([t.calls.length, t.raw.engine.gates]));
  // Không có nguồn độc lập → vòng AI như cũ; nhóm đã gom một lần (không gom lại).
  SC['thước kẻ — không tờ khai'] = () => ({ ...SC['thước kẻ — NHOM_CHUA_KIEM (tờ khai Oz)'](), oz: ozRong });
  ozGoi = 0;
  r = await chay(MOI, 'thước kẻ — không tờ khai');
  const td2 = r.raw.engine.gates.find((x) => x.tatDinh);
  check('B4 không nguồn độc lập → VONG_AI (khong-nguon-doc-lap): vòng 3 AI đọc chú giải 9017 + lý do chặn', r.calls.length === 3 && td2?.ketQua === 'VONG_AI' && td2.lyDo === 'khong-nguon-doc-lap' && /NHÓM 9017/.test(r.calls[2].user) && /\[NHOM_CHUA_KIEM\]/.test(r.calls[2].user), JSON.stringify([r.calls.length, r.raw.engine.gates]));
  check('B4 VONG_AI không gom lại lần hai (2 lượt gather × 2 truy vấn tiền lệ = 4)', ozGoi === 4, String(ozGoi));
  // Tờ khai Oz khớp < 75% → không đủ tin (vòng AI).
  SC['thước kẻ — tờ khai khớp 70%'] = () => ({ ...SC['thước kẻ — NHOM_CHUA_KIEM (tờ khai Oz)'](), oz: ozRuler(70) });
  r = await chay(MOI, 'thước kẻ — tờ khai khớp 70%');
  check('B4 tờ khai Oz khớp 70% (< 75%) → không nhận tất định', r.calls.length === 3 && r.raw.engine.gates.find((x) => x.tatDinh)?.lyDo === 'khong-nguon-doc-lap', JSON.stringify(r.raw.engine.gates));
  // Nhóm chưa có sổ tay (sổ tay tắt) → máy không đọc được chú giải nhóm → vòng AI.
  r = await chay(MOI, 'thước kẻ — NHOM_CHUA_KIEM (tờ khai Oz)', { HS_SO_TAY: 'off' });
  check('B4 sổ tay tắt → không nhận tất định (nhom-chua-co-so-tay) → vòng AI', r.calls.length === 3 && r.raw.engine.gates.find((x) => x.tatDinh)?.lyDo === 'nhom-chua-co-so-tay', JSON.stringify(r.raw.engine.gates));
  // Sổ tay nghi sau khi gom → MỘT lượt giải trình đọc luôn chú giải nhóm vừa gom (thay vòng sửa + lượt giải trình).
  r = await chay(MOI, 'sổ tay gates — nhóm chưa kiểm rồi giải trình');
  const td3 = r.raw.engine.gates.find((x) => x.tatDinh);
  check('B4 gom 8509 → sổ tay nghi → 1 lượt giải trình (3 lời gọi thay 4) → AI đổi 84145199, CHANGED', r.calls.length === 3 && td3?.ketQua === 'GIAI_TRINH' && r.raw.results[0]?.hs === '84145199' && r.raw.soTay?.outcome === 'CHANGED', JSON.stringify([r.calls.length, r.raw.engine.gates]));
  check('B4 lượt giải trình có chú giải 8509 + ghi chú nhóm vừa bổ sung', /YÊU CẦU GIẢI TRÌNH/.test(r.calls[2].user) && /NHÓM 8509/.test(r.calls[2].user) && /Ghi chú: nhóm 8509 vừa được máy bổ sung/.test(r.calls[2].user));
  const t3 = await chay(MOI, 'sổ tay gates — nhóm chưa kiểm rồi giải trình', TAT);
  check('B4 (đối chứng) tắt: vòng sửa + lượt giải trình = 4 lời gọi, cùng mã cuối', t3.calls.length === 4 && t3.raw.results[0]?.hs === '84145199', JSON.stringify([t3.calls.length, t3.raw.results?.[0]?.hs]));
  // Chặn lẫn cổng khác → không bước tất định (chỉ khi NHOM_CHUA_KIEM là cổng DUY NHẤT).
  r = await chay(MOI, 'câu trích bịa ×3 — chặn tới trần');
  check('B4 chặn kèm CAU_TRICH_KHONG_CO → không bước tất định', !r.raw.engine.gates.some((x) => x.tatDinh), JSON.stringify(r.raw.engine.gates));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
