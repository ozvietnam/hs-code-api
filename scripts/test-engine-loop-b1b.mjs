// B1b nối vào động cơ hai vòng (lib/engine-loop.js → lib/b1b-web.js b1bApDung) — AI giả + web giả, KHÔNG gọi mạng.
// Vì sao có file này: c63104c gán lại `const loopOut` → TypeError bị `catch {}` rỗng nuốt, webHint mất im lặng trong khi
// shadow trông như đang bật; test-b1b-web.mjs chỉ thử b1bApDung riêng lẻ nên không bắt được. Ở đây chạy NGUYÊN classifyLoop.
// Từ #467 (B1b "on"): NEED_FACTS → tra web → chạy lại đúng MỘT lượt động cơ với dữ kiện web gắn nhãn "chưa kiểm chứng".
// Phần ON kiểm thêm tương tác với tối ưu độ trễ (HS_GON_DAU_RA / HS_MAX_VONG_SUA, mặc định bật): lượt chạy lại đọc cùng công
// tắc, trần vòng sửa áp riêng từng lượt, không đệ quy quá _b1bDaThu, dùng chung hạn giờ, lượt chạy lại hỏng không thay đáp án.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS']) delete process.env[k];
delete process.env.ZAI_SEARCH_KEY; // phòng hờ: web giả có hỏng thì webFacts thật cũng trả null, không gọi mạng

const llmTier = require('../lib/llm-tier');
let script = []; let llmCalls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  llmCalls.push({ r1: String(system).startsWith('VÒNG 1'), gon: String(system).includes('GỌN ĐẦU RA'), user: String(user), maxTokens: opts.maxTokens, timeoutMs: opts.timeoutMs });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next(user, system) : JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
// Web giả: thay hàm trên đối tượng exports TRƯỚC lượt đầu (b1b-web.js require web-facts.js lúc gọi) — cùng cách
// test-engine-loop.mjs thay micLookup/poolNhom; webImpl đổi theo từng ca.
const webFactsMod = require('../lib/web-facts.js');
let webImpl = async () => null; let webCalls = 0;
webFactsMod.webFacts = async (o) => { webCalls += 1; return webImpl(o); };
// Lỗi giả trong LƯỢT CHẠY LẠI (không phải trong web): so-tay-runtime.advise gọi qua module ở cuối classifyLoop, ngoài mọi try.
const soTayRuntimeMod = require('../lib/so-tay-runtime.js');
const adviseGoc = soTayRuntimeMod.advise;
let nemAdvise = false;
soTayRuntimeMod.advise = (...a) => { if (nemAdvise) throw new Error('LUOT_LAI_NEM'); return adviseGoc(...a); };
console.error = () => {}; console.warn = () => {};
const { classifyLoop } = require('../lib/engine-loop.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 700)}`); } };

// Đồ chơi + AI vòng 2 HỎI → NEED_FACTS kèm nextAction.questions (như ca 3 của test-engine-loop.mjs).
const TOY = { tenHang: '3D打印钥匙扣可发射小球解压玩具手指枪', nameZh: '3D打印钥匙扣可发射小球解压玩具手指枪', specs: '材质: 塑料; 工艺: 3D打印' };
const R1_TOY = { product: { nameVi: 'đồ chơi súng ngón tay in 3D', nameEn: '3D printed finger gun toy keychain', nameZh: '3D打印钥匙扣手指枪', purpose: 'đồ chơi giải trí bắn bi', mechanism: 'cơ-tay', material: 'nhựa PLA', evidence: { material: '材质: 塑料' } }, hypotheses: [{ chapter: '95', heading4: '9503', subheading6: '950300', why: 'đồ chơi khác', confidence: 85 }], verify: { searchVi: ['đồ chơi súng nhựa'], codes8: ['95030050', '95030099'], micQuery: null, unknowns: [] } };
const HOI = { decision: 'HOI', hs: '950300', confidence: 50, reason: 'chưa rõ có phải mô hình theo tỷ lệ', basis: [], conditions: [{ fact: 'là mô hình thu nhỏ theo tỷ lệ của vật thật', status: 'UNKNOWN', evidence: '' }], alternatives: [], questions: [{ fact: 'mô hình theo tỷ lệ', question: 'Sản phẩm có phải bản thu nhỏ theo tỷ lệ của một vật thật không?', whereToFind: 'ảnh / hỏi người bán' }] };
// Lượt chạy lại (có dữ kiện web): chốt 9503.00.99 (qua cổng) hoặc 9503.00.50 (vướng "trừ plastic" → chặn mỗi vòng).
const CHOT_99 = { decision: 'CHOT', hs: '95030099', confidence: 82, reason: 'đồ chơi khác bằng plastic → Loại khác', basis: [{ stream: 'SAN_PHAM', claim: 'bằng nhựa', evidence: '材质: 塑料' }], conditions: [], alternatives: [], questions: [] };
const CHOT_50 = { ...CHOT_99, hs: '95030050', reason: 'đồ chơi khác' };
const CAU_TRA_LOI = 'Móc khoá súng ngón tay in 3D, không phải mô hình theo tỷ lệ.';

/** Một lượt classifyLoop với ZAI_WEB_FACTS + env cho trước; gom các dòng JSON ghi ra stdout/stderr trong lượt. */
async function run(cheDo, { steps = [R1_TOY, HOI], opts = {}, env = {} } = {}) {
  if (cheDo) process.env.ZAI_WEB_FACTS = cheDo; else delete process.env.ZAI_WEB_FACTS;
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = [...steps]; llmCalls = []; webCalls = 0;
  const cap = { out: [], err: [] };
  const goc = { out: process.stdout.write, err: process.stderr.write };
  process.stdout.write = (c) => { cap.out.push(String(c)); return true; };
  process.stderr.write = (c) => { cap.err.push(String(c)); return true; };
  let out;
  try { out = await classifyLoop(TOY, opts); } finally {
    process.stdout.write = goc.out; process.stderr.write = goc.err; delete process.env.ZAI_WEB_FACTS; nemAdvise = false;
    for (const k of Object.keys(env)) delete process.env[k];
  }
  const json = (arr) => arr.join('').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((x) => x && typeof x === 'object');
  return { out, llm: llmCalls.length, calls: llmCalls, r1: llmCalls.filter((c) => c.r1).length, web: webCalls, stdout: json(cap.out), stderr: json(cap.err), stderrRaw: cap.err.join(''), conLai: script.length };
}
const quyetDinh = (o) => JSON.stringify({ status: o.status, results: o.results, nextAction: o.nextAction });
const dem = (lines, type) => lines.filter((l) => l.type === type).length;
const ghiChu = (o, re) => (o.engine?.gates || []).some((x) => re.test(String(x.note || '')));

// 0. Đối chứng: ZAI_WEB_FACTS chưa đặt → không tra web, không webHint, không dòng b1b_* nào.
const off = await run(null);
check('đối chứng: lượt kết thúc NEED_FACTS có nextAction.questions (điều kiện để B1b chạy)', off.out.status === 'NEED_FACTS' && off.out.nextAction?.questions?.length > 0, JSON.stringify([off.out.status, off.out.nextAction]));
check('đối chứng: B1b tắt → không gọi web, không webHint, không dòng b1b_*', off.web === 0 && off.out.webHint === undefined && ![...off.stdout, ...off.stderr].some((l) => /^b1b_/.test(String(l.type))), JSON.stringify([off.web, off.out.webHint]));

// 1. shadow + web trả lời → webHint gắn vào đầu ra classifyLoop; quyết định engine giữ nguyên.
webImpl = async () => ({ cauTraLoi: CAU_TRA_LOI, nguon: [{ url: 'https://example.com' }] });
const sh = await run('shadow');
// GUARD hồi quy c63104c: `loopOut = await …b1bApDung(…)` trên `const loopOut` ném TypeError NGAY SAU khi B1b chạy
// xong (web đã gọi, log đã ghi) → bị catch nuốt → webHint mất. Chỉ cần khẳng định webHint CÓ MẶT ở đầu ra classifyLoop là
// đủ bắt lại lỗi đó (đã thử: đưa lại dòng gán → check này đỏ); kèm 0 dòng b1b_error để lỗi khác trong tầng B1b cũng không lọt.
check('GUARD c63104c: shadow → webHint có mặt ở đầu ra classifyLoop, không dòng b1b_error', sh.out.webHint !== undefined && dem(sh.stderr, 'b1b_error') === 0, JSON.stringify(sh.stderr));
const h = sh.out.webHint || {};
check('shadow: webHint nhãn AI_CHUA_KIEM, loại WEB_SIGNAL, đúng câu trả lời + nguồn của web giả', h.nhanAi === 'AI_CHUA_KIEM' && h.loai === 'WEB_SIGNAL' && h.cheDo === 'shadow' && h.cauTraLoi === CAU_TRA_LOI && h.nguon?.[0]?.url === 'https://example.com', JSON.stringify(h));
check('shadow: KHÔNG đổi quyết định — status/results/nextAction y hệt lượt tắt, cùng số lượt AI, không chạy lại', quyetDinh(sh.out) === quyetDinh(off.out) && sh.llm === off.llm && sh.out.webFactsApplied === undefined, `${sh.llm}/${off.llm}`);
check('shadow: gọi web đúng 1 lần, đúng 1 dòng đo độ phủ b1b_web', sh.web === 1 && dem(sh.stdout, 'b1b_web') === 1, JSON.stringify([sh.web, sh.stdout]));

// 2. B1b lỗi (web giả ném) → lượt chính nguyên vẹn, không webHint, đúng MỘT dòng b1b_error ra stderr (catch của engine-loop).
webImpl = async () => { throw new Error('WEB_GIA_NEM'); };
const er = await run('shadow');
check('B1b lỗi: lượt chính nguyên vẹn (status/results/nextAction y hệt lượt tắt), không webHint', er.out.webHint === undefined && quyetDinh(er.out) === quyetDinh(off.out) && er.llm === off.llm, JSON.stringify([er.out.status, er.out.webHint]));
const loi = er.stderr.filter((l) => l.type === 'b1b_error');
check('B1b lỗi: đúng MỘT dòng b1b_error trên stderr, msg là lỗi gốc, ts hợp lệ', loi.length === 1 && loi[0].msg === 'WEB_GIA_NEM' && !Number.isNaN(Date.parse(loi[0].ts)), JSON.stringify(er.stderr));
check('B1b lỗi: dòng log chỉ có type/ts/msg — không tên hàng, không câu hỏi cho khách', loi.length === 1 && Object.keys(loi[0]).sort().join() === 'msg,ts,type' && !er.stderrRaw.includes(TOY.tenHang) && !er.stderrRaw.includes('tỷ lệ'), er.stderrRaw.slice(0, 300));

// ═════ 3. B1b "on" (#467) × tối ưu độ trễ ═════
webImpl = async () => ({ cauTraLoi: CAU_TRA_LOI, nguon: [{ url: 'https://example.com' }] });
// 3a. Mặc định (HS_GON_DAU_RA + HS_MAX_VONG_SUA bật): web trả lời → chạy lại MỘT lượt → chốt → webFactsApplied.
let on = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_99] });
check('on: chạy lại một lượt → REVIEW 95030099, webFactsApplied + webHint có mặt (GUARD c63104c cho nhánh on)', on.out.status === 'REVIEW' && on.out.results?.[0]?.hs === '95030099' && on.out.webFactsApplied === true && on.out.webHint?.cheDo === 'on', JSON.stringify([on.out.status, on.out.results?.[0]?.hs, on.out.webFactsApplied]));
check('on: KHÔNG đệ quy quá _b1bDaThu — web 1 lần, 1 dòng b1b_web, đúng 2 lượt vòng 1 (chính + chạy lại), 4 lời gọi AI', on.web === 1 && dem(on.stdout, 'b1b_web') === 1 && on.r1 === 2 && on.llm === 4 && on.conLai === 0, JSON.stringify([on.web, on.r1, on.llm]));
check('on: lượt chạy lại nhận dữ kiện web gắn nhãn "chưa kiểm chứng" (vòng 1 lượt 2)', /chưa kiểm chứng/.test(on.calls[2].user) && !/chưa kiểm chứng/.test(on.calls[0].user));
check('on: lượt chạy lại đọc CÙNG công tắc — cả 4 lời gọi có khối GỌN, maxTokens 6000/10000; engine.toiUu của lượt chạy lại', on.calls.every((c) => c.gon) && on.calls.filter((c) => c.r1).every((c) => c.maxTokens === 6000) && on.calls.filter((c) => !c.r1).every((c) => c.maxTokens === 10000) && on.out.engine?.toiUu?.maxVongSua === 1, JSON.stringify(on.calls.map((c) => [c.gon, c.maxTokens])));
const onTat = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_99], env: { HS_GON_DAU_RA: 'off', HS_MAX_VONG_SUA: 'off' } });
check('on + công tắc off: lượt chạy lại cũng off (không khối GỌN, 12000/20000), cùng kết quả', onTat.calls.every((c) => !c.gon) && onTat.calls.filter((c) => c.r1).every((c) => c.maxTokens === 12000) && onTat.out.results?.[0]?.hs === '95030099' && onTat.out.webFactsApplied === true && onTat.out.engine?.toiUu === undefined, JSON.stringify(onTat.calls.map((c) => [c.gon, c.maxTokens])));
// 3b. Lượt chạy lại vẫn NEED_FACTS → không tra web lần hai (đệ quy chặn), giữ NEED_FACTS + webHint.
on = await run('on', { steps: [R1_TOY, HOI, R1_TOY, HOI] });
check('on: lượt chạy lại vẫn NEED_FACTS → không tra web lần hai, giữ NEED_FACTS + webHint, không webFactsApplied', on.out.status === 'NEED_FACTS' && on.web === 1 && on.r1 === 2 && on.out.webHint && on.out.webFactsApplied === undefined, JSON.stringify([on.out.status, on.web, on.r1]));
// 3c. Trần vòng sửa áp RIÊNG từng lượt: lượt chính 0 vòng sửa; lượt chạy lại bị chặn "trừ plastic" → đúng 1 vòng sửa của nó.
on = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_50, CHOT_50, CHOT_50] });
check('on: trần 1 vòng sửa áp riêng cho lượt chạy lại (2 + 3 lời gọi), đáp án chặn kèm cờ GATE_BLOCKED, ghi trần', on.llm === 5 && on.out.status === 'NEEDS_EXPERT' && on.out.nextAction?.reasonCode === 'GATE_BLOCKED' && ghiChu(on.out, /trần vòng sửa HS_MAX_VONG_SUA=1/), JSON.stringify([on.llm, on.out.status, on.out.engine?.gates]));
const capTat = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_50, CHOT_50, CHOT_50], env: { HS_GON_DAU_RA: 'off', HS_MAX_VONG_SUA: 'off' } });
check('on + công tắc off: lượt chạy lại dùng trần cũ MAX_ROUNDS (2 + 4 lời gọi) như main', capTat.llm === 6, String(capTat.llm));
// 3d. Ngân sách: lượt chạy lại dùng CHUNG hạn giờ của lượt chính (không mở 285 s mới).
on = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_99], opts: { _b1bHanChot: Date.now() + 200000 } });
check('on: lượt chạy lại tính giờ theo hạn của lượt chính — vòng 1 lượt chạy lại chỉ còn sàn 30 s (không phải 100 s của ngân sách mới)', on.calls[2]?.r1 && on.calls[2].timeoutMs === 30000 && on.out.webFactsApplied === true, JSON.stringify(on.calls.map((c) => c.timeoutMs)));
const hanTat = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_99], env: { HS_MAX_VONG_SUA: 'off' } });
check('on + HS_MAX_VONG_SUA=off: lượt chạy lại mở ngân sách mới như main (vòng 1 timeout 100 s)', hanTat.calls[2]?.r1 && hanTat.calls[2].timeoutMs === 100000, JSON.stringify(hanTat.calls.map((c) => c.timeoutMs)));
on = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_99], opts: { _b1bHanChot: Date.now() + 100000 } });
check('on: còn < 120 s → KHÔNG chạy lại, trả NEED_FACTS + webHint, ghi lý do', on.out.status === 'NEED_FACTS' && on.r1 === 1 && on.llm === 2 && on.out.webHint && on.out.webFactsApplied === undefined && ghiChu(on.out, /b1b: không chạy lại — còn \d+ s < 120 s/), JSON.stringify([on.out.status, on.llm, on.out.engine?.gates]));
// 3e. Lượt chạy lại HỎNG (ENGINE_TIMEOUT: NEEDS_EXPERT/RETRY, không mã) không thay đáp án NEED_FACTS hợp lệ.
on = await run('on', { steps: [R1_TOY, HOI, new Error('HTTP 429 Token Plan rate limit')] });
check('on: lượt chạy lại hỏng → giữ NEED_FACTS gốc (câu hỏi cho khách) + webHint, ghi lý do', on.out.status === 'NEED_FACTS' && on.out.nextAction?.questions?.length > 0 && on.out.webHint && on.out.webFactsApplied === undefined && ghiChu(on.out, /b1b: lượt chạy lại không ra mã \(ENGINE_TIMEOUT\)/), JSON.stringify([on.out.status, on.out.nextAction, on.out.engine?.gates]));
const hongTat = await run('on', { steps: [R1_TOY, HOI, new Error('HTTP 429 Token Plan rate limit')], env: { HS_MAX_VONG_SUA: 'off' } });
check('on + HS_MAX_VONG_SUA=off: hành vi y main #467 (lượt chạy lại hỏng được nhận: NEEDS_EXPERT/RETRY rỗng)', hongTat.out.status === 'NEEDS_EXPERT' && hongTat.out.nextAction?.type === 'RETRY' && hongTat.out.webFactsApplied === true, JSON.stringify([hongTat.out.status, hongTat.out.nextAction]));
// 3f. Lượt chạy lại NÉM lỗi → catch của b1bApDung: lượt chính + webHint, đúng MỘT dòng b1b_error, không chữ của khách.
webImpl = async () => { nemAdvise = true; return { cauTraLoi: CAU_TRA_LOI, nguon: [] }; };
on = await run('on', { steps: [R1_TOY, HOI, R1_TOY, CHOT_99] });
const loi2 = on.stderr.filter((l) => l.type === 'b1b_error');
check('on: lượt chạy lại ném lỗi → quyết định của lượt chính giữ nguyên + webHint, đúng MỘT dòng b1b_error', quyetDinh(on.out) === quyetDinh(off.out) && on.out.webHint && loi2.length === 1 && loi2[0].msg === 'LUOT_LAI_NEM' && Object.keys(loi2[0]).sort().join() === 'msg,ts,type' && !on.stderrRaw.includes(TOY.tenHang) && !on.stderrRaw.includes(CAU_TRA_LOI), JSON.stringify([on.out.status, on.stderr]));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
