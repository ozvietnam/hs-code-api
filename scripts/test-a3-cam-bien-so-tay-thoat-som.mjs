// OZV-2224 — ca thực địa "cảm biến quang e3sct11, điện áp 26v" (A3, 25/11): vòng 1 đứng đầu 854140, sổ tay 85.41 loại trừ
// "cảm biến quang" sang 85.36 ⇒ HS_CHOT_SOM_CO_KIEM chặn dừng sớm ⇒ vòng 2 mất 32–51 s chỉ để đổi sang 853650 (giả thuyết
// thứ ba của chính vòng 1) rồi vẫn HOI. Sửa: chỉ sổ tay loại trừ + đúng một nhóm đích có giả thuyết vòng 1 ⇒ HOI trên giả
// thuyết đó, 0 lượt vòng 2. Luật L3: mỗi cơ chế có CA NGƯỢC (đổi một dữ kiện → kết quả đổi theo).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_CHOT_SOM_CO_KIEM', 'HS_HOI_THEO_SO_TAY', 'HS_EMBED_POOL']) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let script = [];
let llmCalls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  llmCalls.push({ r1: String(system).startsWith('VÒNG 1'), step: opts.step });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
const ozSearch = require('../lib/oz-precedent-search.js');
ozSearch.searchOzByKeyword = async () => ({ items: [] });
console.error = () => {};
console.warn = () => {};
const { classifyLoop, hoiTheoGiaThuyetNhomDich } = require('../lib/engine-loop.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 900)}`); }
};

// ───────── 1. Hàm thuần ─────────
const EE = { decision: 'HOI', hs: '854140', confidence: 45, reason: 'Hồ sơ thiếu dữ kiện quyết định mã: x', questions: [{ fact: 'x' }] };
const HYP = [
  { chapter: '85', heading4: '8541', subheading6: '854140', confidence: 45 },
  { chapter: '90', heading4: '9031', subheading6: '903149', confidence: 40 },
  { chapter: '85', heading4: '8536', subheading6: '853650', confidence: 15 },
];
const ST = (nhom) => ({ ma: 'so-tay-loai-tru', nhom, chiTiet: `sổ tay nhóm 8541 loại trừ "cảm biến quang" sang nhóm ${nhom}` });
const d1 = hoiTheoGiaThuyetNhomDich({ hypotheses: HYP }, EE, [ST('8542'), ST('8536')]);
check('thuần: chỉ sổ tay loại trừ (8542, 8536), giả thuyết vòng 1 có 853650 → HOI 853650, giữ câu hỏi', d1?.hs === '853650' && d1.decision === 'HOI' && d1.questions.length === 1 && /8536/.test(d1.reason), JSON.stringify(d1));
check('thuần, CA NGƯỢC: có tín hiệu tiền lệ Oz kèm theo → null (đi vòng 2 như cũ)', hoiTheoGiaThuyetNhomDich({ hypotheses: HYP }, EE, [ST('8536'), { ma: 'tien-le-oz', nhom: '8536', chiTiet: 'x' }]) === null);
check('thuần, CA NGƯỢC: vòng 1 không có giả thuyết ở nhóm đích → null', hoiTheoGiaThuyetNhomDich({ hypotheses: HYP.slice(0, 2) }, EE, [ST('8536')]) === null);
check('thuần, CA NGƯỢC: giả thuyết rơi vào HAI nhóm đích khác nhau → null (máy không tự chọn)', hoiTheoGiaThuyetNhomDich({ hypotheses: HYP }, EE, [ST('9031'), ST('8536')]) === null);
check('thuần, CA NGƯỢC: phân nhóm 6 số không có trong biểu, nhóm có ≥2 phân nhóm → null', hoiTheoGiaThuyetNhomDich({ hypotheses: [HYP[0], { heading4: '8536', subheading6: '853699' }] }, EE, [ST('8536')]) === null);
check('thuần: thiếu đầu vào → null, không ném lỗi', hoiTheoGiaThuyetNhomDich() === null && hoiTheoGiaThuyetNhomDich({}, EE, []) === null);

// ───────── 2. Qua động cơ thật (LLM giả) ─────────
const HANG = { tenHang: 'cảm biến quang e3sct11, điện áp 26v' };
const R1 = (hyp = HYP) => ({
  product: { nameVi: 'cảm biến quang E3S-CT11', nameEn: 'photoelectric sensor E3S-CT11', purpose: 'phát hiện vật thể bằng tia sáng', mechanism: 'phát thu ánh sáng, xuất tín hiệu', material: 'không rõ', form: 'hoàn chỉnh', evidence: {} },
  hypotheses: hyp.map((h) => ({ ...h, why: 'giả thuyết' })),
  verify: { searchVi: ['cảm biến quang'], codes8: [], unknowns: ['Cảm biến có mạch xử lý và ngõ ra đóng/ngắt không, hay chỉ là linh kiện bán dẫn cảm quang?', 'Chức năng chính là đo/kiểm tra hay đóng ngắt mạch?'] },
});
const R2 = { decision: 'HOI', hs: '853650', confidence: 40, reason: 'vòng 2 giả', basis: [], conditions: [], alternatives: [], questions: [{ fact: 'ngõ ra', question: 'Ngõ ra relay hay transistor?', whereToFind: 'catalogue' }] };
async function run(r1, env) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = [r1, R2, R2];
  llmCalls = [];
  let out;
  try { out = await classifyLoop(HANG, {}); } finally { for (const k of Object.keys(env)) delete process.env[k]; }
  return { out, gir: llmCalls.filter((c) => !c.r1).length, gates: out.engine?.gates || [] };
}
const tom = (r) => JSON.stringify({ status: r.out.status, hs: r.out.results?.[0]?.hs, gir: r.gir, gates: r.gates, soTay: r.out.soTay && { outcome: r.out.soTay.outcome, ch: (r.out.soTay.challenges || []).map((c) => `${c.gate}:${c.target}`) }, missing: r.out.missing });
const BAT = { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' };

const a = await run(R1(), BAT);
check('BẬT: ca cảm biến — sổ tay 85.41 chặn 854140 (chanChotSom chỉ so-tay-loai-tru, nhóm trái có 8536)', a.gates.some((g) => g.lyDo === 'TIN_HIEU_TRAI_NHOM' && g.hs === '854140' && g.chanChotSom.join() === 'so-tay-loai-tru' && g.nhomTrai.includes('8536')), tom(a));
check('BẬT: 0 lượt vòng 2, dừng sớm HOI trên 853650 (đổi từ 854140, nguồn so-tay-loai-tru)', a.gir === 0 && a.gates.some((g) => g.earlyExitHoi === true && g.hs === '853650' && g.doiTu === '854140' && g.nguon === 'so-tay-loai-tru'), tom(a));
check('BẬT: status NEED_FACTS, kết quả đứng đầu 853650', a.out.status === 'NEED_FACTS' && String(a.out.results?.[0]?.hs || '').startsWith('853650'), tom(a));
check('BẬT: câu hỏi khách vẫn có câu của vòng 1 (linh kiện bán dẫn / đóng ngắt)', JSON.stringify(a.out.missing || []).includes('linh kiện bán dẫn cảm quang'), tom(a));

const b = await run(R1(HYP.slice(0, 2)), BAT);
check('BẬT, CA NGƯỢC: vòng 1 không có giả thuyết 8536 → đi vòng 2 như cũ (≥1 lượt AI), không có earlyExitHoi:true', b.gir >= 1 && !b.gates.some((g) => g.earlyExitHoi === true), tom(b));

const c = await run(R1(), { HS_SO_TAY: 'full' });
check('TẮT công tắc: không có chanChotSom, không có nhánh đổi nhóm (hành vi cũ)', !c.gates.some((g) => 'chanChotSom' in g || g.nguon === 'so-tay-loai-tru'), tom(c));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
