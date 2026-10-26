// B1b shadow nối vào động cơ hai vòng (lib/engine-loop.js → lib/b1b-web.js) — AI giả + web giả, KHÔNG gọi mạng.
// Vì sao có file này: c63104c gán lại `const loopOut` → TypeError bị `catch {}` rỗng nuốt, webHint mất im lặng trong khi
// shadow trông như đang bật; test-b1b-web.mjs chỉ thử b1bShadow riêng lẻ nên không bắt được. Ở đây chạy NGUYÊN classifyLoop.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
delete process.env.ZAI_WEB_FACTS;
delete process.env.ZAI_SEARCH_KEY; // phòng hờ: web giả có hỏng thì webFacts thật cũng trả null, không gọi mạng

const llmTier = require('../lib/llm-tier');
let script = []; let llmCalls = 0;
llmTier.callLLMJson = async () => {
  llmCalls += 1;
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: next, provider: 'stub', model: 'stub' };
};
// Web giả: thay hàm trên đối tượng exports TRƯỚC lượt đầu (b1b-web.js require web-facts.js lúc gọi) — cùng cách
// test-engine-loop.mjs thay micLookup/poolNhom; webImpl đổi theo từng ca.
const webFactsMod = require('../lib/web-facts.js');
let webImpl = async () => null; let webCalls = 0;
webFactsMod.webFacts = async (o) => { webCalls += 1; return webImpl(o); };
console.error = () => {}; console.warn = () => {};
const { classifyLoop } = require('../lib/engine-loop.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

// Đồ chơi + AI vòng 2 HỎI → NEED_FACTS kèm nextAction.questions (như ca 3 của test-engine-loop.mjs).
const TOY = { tenHang: '3D打印钥匙扣可发射小球解压玩具手指枪', nameZh: '3D打印钥匙扣可发射小球解压玩具手指枪', specs: '材质: 塑料; 工艺: 3D打印' };
const R1_TOY = { product: { nameVi: 'đồ chơi súng ngón tay in 3D', nameEn: '3D printed finger gun toy keychain', nameZh: '3D打印钥匙扣手指枪', purpose: 'đồ chơi giải trí bắn bi', mechanism: 'cơ-tay', material: 'nhựa PLA', evidence: { material: '材质: 塑料' } }, hypotheses: [{ chapter: '95', heading4: '9503', subheading6: '950300', why: 'đồ chơi khác', confidence: 85 }], verify: { searchVi: ['đồ chơi súng nhựa'], codes8: ['95030050', '95030099'], micQuery: null, unknowns: [] } };
const HOI = { decision: 'HOI', hs: '950300', confidence: 50, reason: 'chưa rõ có phải mô hình theo tỷ lệ', basis: [], conditions: [{ fact: 'là mô hình thu nhỏ theo tỷ lệ của vật thật', status: 'UNKNOWN', evidence: '' }], alternatives: [], questions: [{ fact: 'mô hình theo tỷ lệ', question: 'Sản phẩm có phải bản thu nhỏ theo tỷ lệ của một vật thật không?', whereToFind: 'ảnh / hỏi người bán' }] };
const CAU_TRA_LOI = 'Móc khoá súng ngón tay in 3D, không phải mô hình theo tỷ lệ.';

/** Một lượt classifyLoop với ZAI_WEB_FACTS cho trước; gom các dòng JSON ghi ra stdout/stderr trong lượt. */
async function run(cheDo) {
  if (cheDo) process.env.ZAI_WEB_FACTS = cheDo; else delete process.env.ZAI_WEB_FACTS;
  script = [R1_TOY, HOI]; llmCalls = 0; webCalls = 0;
  const cap = { out: [], err: [] };
  const goc = { out: process.stdout.write, err: process.stderr.write };
  process.stdout.write = (c) => { cap.out.push(String(c)); return true; };
  process.stderr.write = (c) => { cap.err.push(String(c)); return true; };
  let out;
  try { out = await classifyLoop(TOY, {}); } finally {
    process.stdout.write = goc.out; process.stderr.write = goc.err; delete process.env.ZAI_WEB_FACTS;
  }
  const json = (arr) => arr.join('').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((x) => x && typeof x === 'object');
  return { out, llm: llmCalls, web: webCalls, stdout: json(cap.out), stderr: json(cap.err), stderrRaw: cap.err.join('') };
}
const quyetDinh = (o) => JSON.stringify({ status: o.status, results: o.results, nextAction: o.nextAction });
const dem = (lines, type) => lines.filter((l) => l.type === type).length;

// 0. Đối chứng: ZAI_WEB_FACTS chưa đặt → không tra web, không webHint, không dòng b1b_* nào.
const off = await run(null);
check('đối chứng: lượt kết thúc NEED_FACTS có nextAction.questions (điều kiện để B1b chạy)', off.out.status === 'NEED_FACTS' && off.out.nextAction?.questions?.length > 0, JSON.stringify([off.out.status, off.out.nextAction]));
check('đối chứng: B1b tắt → không gọi web, không webHint, không dòng b1b_*', off.web === 0 && off.out.webHint === undefined && ![...off.stdout, ...off.stderr].some((l) => /^b1b_/.test(String(l.type))), JSON.stringify([off.web, off.out.webHint]));

// 1. shadow + web trả lời → webHint gắn vào đầu ra classifyLoop; quyết định engine giữ nguyên.
webImpl = async () => ({ cauTraLoi: CAU_TRA_LOI, nguon: [{ url: 'https://example.com' }] });
const sh = await run('shadow');
// GUARD hồi quy c63104c: `loopOut = await …b1bShadow(…)` trên `const loopOut` ném TypeError NGAY SAU khi b1bShadow chạy
// xong (web đã gọi, log đã ghi) → bị catch nuốt → webHint mất. Chỉ cần khẳng định webHint CÓ MẶT ở đầu ra classifyLoop là
// đủ bắt lại lỗi đó (đã thử: đưa lại dòng gán → check này đỏ); kèm 0 dòng b1b_error để lỗi khác trong tầng B1b cũng không lọt.
check('GUARD c63104c: shadow → webHint có mặt ở đầu ra classifyLoop, không dòng b1b_error', sh.out.webHint !== undefined && dem(sh.stderr, 'b1b_error') === 0, JSON.stringify(sh.stderr));
const h = sh.out.webHint || {};
check('shadow: webHint nhãn AI_CHUA_KIEM, loại WEB_SIGNAL, đúng câu trả lời + nguồn của web giả', h.nhanAi === 'AI_CHUA_KIEM' && h.loai === 'WEB_SIGNAL' && h.cheDo === 'shadow' && h.cauTraLoi === CAU_TRA_LOI && h.nguon?.[0]?.url === 'https://example.com', JSON.stringify(h));
check('shadow: KHÔNG đổi quyết định — status/results/nextAction y hệt lượt tắt, cùng số lượt AI', quyetDinh(sh.out) === quyetDinh(off.out) && sh.llm === off.llm, `${sh.llm}/${off.llm}`);
check('shadow: gọi web đúng 1 lần, đúng 1 dòng đo độ phủ b1b_web', sh.web === 1 && dem(sh.stdout, 'b1b_web') === 1, JSON.stringify([sh.web, sh.stdout]));

// 2. B1b lỗi (web giả ném trong b1bShadow) → lượt chính nguyên vẹn, không webHint, đúng MỘT dòng b1b_error ra stderr.
webImpl = async () => { throw new Error('WEB_GIA_NEM'); };
const er = await run('shadow');
check('B1b lỗi: lượt chính nguyên vẹn (status/results/nextAction y hệt lượt tắt), không webHint', er.out.webHint === undefined && quyetDinh(er.out) === quyetDinh(off.out) && er.llm === off.llm, JSON.stringify([er.out.status, er.out.webHint]));
const loi = er.stderr.filter((l) => l.type === 'b1b_error');
check('B1b lỗi: đúng MỘT dòng b1b_error trên stderr, msg là lỗi gốc, ts hợp lệ', loi.length === 1 && loi[0].msg === 'WEB_GIA_NEM' && !Number.isNaN(Date.parse(loi[0].ts)), JSON.stringify(er.stderr));
check('B1b lỗi: dòng log chỉ có type/ts/msg — không tên hàng, không câu hỏi cho khách', loi.length === 1 && Object.keys(loi[0]).sort().join() === 'msg,ts,type' && !er.stderrRaw.includes(TOY.tenHang) && !er.stderrRaw.includes('tỷ lệ'), er.stderrRaw.slice(0, 300));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
