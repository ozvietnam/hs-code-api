// #307 — chặn sau (residual-guard style): MiC signal chỉ chú thích, không bao giờ quyết mã.
//
// Ba case bắt buộc:
//  1. Hint ĐÚNG → rankingSignals phát ra signal:mic (tín hiệu xếp hạng cải thiện được nhìn thấy)
//  2. Hint SAI  → mã cuối / basis / finalHs KHÔNG đổi; vẫn có rankingSignals ghi nhận (nhưng rõ
//                ranh giới: ENGINE_RESULT, không phải SIGNAL_CHOT_MA)
//  3. Quét chặn: chạy nhiều stub, đếm: 0 case finalHs == mà MiC consensus quyết định.
// Ý thức cờ MIC_OFF: stub bật consensus nhưng MIC_OFF=1 → rankingSignals rỗng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

process.env.HS_CLASSIFY_ENGINE = 'loop';
const llmTier = require('../lib/llm-tier');
let script = []; let calls = [];
llmTier.callLLMJson = async (system) => {
  calls.push({ round: system.startsWith('VÒNG 1') ? 1 : 2 });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next() : next, provider: 'stub', model: 'stub' };
};
console.error = () => {}; console.warn = () => {};
const { classify } = require('../lib/classify');
const micMod = require('../lib/mic-lookup.js');
const savedMic = micMod.micLookup;
const PG = (shop, hsCode, name) => ({ shop, url: `https://${shop}.en.made-in-china.com/product/x/y.html`, name, hsCode, props: {} });
const run = async (attrs, steps) => { script = steps; calls = []; return classify(attrs, {}); };

const R1_FAN = { product: { nameVi: 'quạt thông gió gia dụng', nameEn: 'household exhaust fan', purpose: 'hút khí', mechanism: 'điện', material: 'nhựa', form: 'hoàn chỉnh', model: 'HY-30', evidence: {} }, hypotheses: [{ chapter: '84', heading4: '8414', subheading6: '841451', why: 'quạt có động cơ', confidence: 70 }], verify: { searchVi: ['quạt'], codes8: ['84145199'], micQuery: null, unknowns: [] } };
const FAN = { tenHang: '家用排气扇 厨房换气扇', nameZh: '家用排气扇 厨房换气扇', specs: '功率: 30W; 材质: 塑料', model: 'HY-30' };
const CHOT_8414 = { decision: 'CHOT', hs: '84145199', confidence: 80, reason: 'quạt thông gió có động cơ điện — nhóm 84.14', basis: [{ stream: 'SAN_PHAM', claim: 'quạt hút', evidence: '换气扇' }], conditions: [], alternatives: [], questions: [] };

// ─────────────────────────────────────────────────────────────────────────────
// CASE 1: Hint ĐÚNG — MiC đồng thuận cùng nhóm 8414 với AI chốt 8414. signal:mic xuất hiện trong
// rankingSignals (vì signal là tín hiệu xếp hạng ứng viên, không phải căn cứ).
// ─────────────────────────────────────────────────────────────────────────────
{
  // 3 shop đồng thuận NHÓM 8414 (trùng AI chốt) — đây là "hint ĐÚNG".
  micMod.micLookup = async (q) => ({ query: q, searched: true, pages: [PG('s1', '8414514000', 'Vent Fan'), PG('s2', '8414519090', 'Fan 30W'), PG('s3', '8414599090', 'Vent Fan')], consensus: null });
  process.env.MIC_OFF = ''; // tường minh BẬT
  const r = await run(FAN, [R1_FAN, CHOT_8414]);
  // Consensus 3 shop ⇒ heading4 8414 ⇒ micSignalOut khác null
  const sigs = r.rankingSignals || [];
  check('CASE 1 hint ĐÚNG: rankingSignals có signal:mic với hs6 841451', sigs.some((s) => s.signal === 'signal:mic' && s.hs6 === '841451'), JSON.stringify(sigs));
  check('CASE 1 hint ĐÚNG: mã chốt vẫn từ AI (84145199), KHÔNG bị MiC kéo', r.results[0]?.hs === '84145199', JSON.stringify(r.results[0]?.hs));
  check('CASE 1 hint ĐÚNG: mọi basis không có chữ "signal:mic" (basis chỉ nhận RULE_TABLE/DETERMINISTIC/HEURISTIC/LLM_ASSERTED)', !(r.results[0]?.basis || []).some((b) => /signal:mic/i.test(JSON.stringify(b))), JSON.stringify(r.results[0]?.basis));
  check('CASE 1 hint ĐÚNG: ghi chú ranh giới có trong effect/note', sigs.find((s) => s.signal === 'signal:mic')?.note?.includes('TÍN HIỆU'), JSON.stringify(sigs[0]));
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 2: Hint SAI (3 shop đồng thuận 8479 — sai nhóm). Mã chốt KHÔNG đổi; rankingSignals
// vẫn chứa signal:mic NHƯNG rõ ràng không phải căn cứ (note + không vào basis).
// ─────────────────────────────────────────────────────────────────────────────
{
  micMod.micLookup = async (q) => ({ query: q, searched: true, pages: [PG('s1', '8479899800', 'Exhaust Fan'), PG('s2', '8479899800', 'Fan 30W'), PG('s3', '8479899800', 'Vent Fan')], consensus: null });
  process.env.MIC_OFF = ''; // tường minh BẬT
  const CHOT_8414_DA_GIAI_TRINH = { ...CHOT_8414, reason: 'quạt thông gió gia dụng có động cơ điện — nhóm 84.14; đã đối chiếu NCC/made-in-china ghi 8479: đó là nhóm máy công nghiệp khác, không phải quạt gia dụng' };
  const r = await run(FAN, [R1_FAN, CHOT_8414, CHOT_8414_DA_GIAI_TRINH]);
  check('CASE 2 hint SAI: mã cuối KHÔNG đổi (84.14 thắng)', r.results[0]?.hs === '84145199', JSON.stringify(r.results[0]?.hs));
  const sigs = r.rankingSignals || [];
  check('CASE 2 hint SAI: rankingSignals[].effect mô tả đúng nhóm MIC đồng thuận (8479)', sigs.some((s) => s.signal === 'signal:mic' && /8479/.test(s.effect)), JSON.stringify(sigs));
  check('CASE 2 hint SAI: ghi chú vẫn mang ranh giới "TÍN HIỆU"', sigs.find((s) => s.signal === 'signal:mic')?.note?.includes('TÍN HIỆU'));
  check('CASE 2 hint SAI: basis KHÔNG mang nhãn "signal:mic"', !(r.results[0]?.basis || []).some((b) => /signal:mic/i.test(JSON.stringify(b))));
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 3: Quét chặn — chạy 3 stub consensus khác nhau, đếm: 0 case finalHs bị MiC kéo.
// ─────────────────────────────────────────────────────────────────────────────
{
  // Stub MiC đồng thuận các nhóm khác nhau; AI luôn trả 84145199. Đếm các trường hợp finalHs khác 8414.
  const stubGroups = [
    { shops: ['s1', 's2'], prefix: '8414', expectConsensus: '8414' },  // trùng AI
    { shops: ['s1', 's2'], prefix: '8479', expectConsensus: '8479' },  // khác nhóm (sai)
    { shops: ['s1', 's2'], prefix: '8509', expectConsensus: '8509' },  // khác nhóm (sai — thiết bị điện khác)
  ];
  process.env.MIC_OFF = '';
  const CHOT_8414_GIAI_TRINH = { ...CHOT_8414, reason: 'đã đối chiếu chú giải các nhóm — giữ 84.14', alternatives: [{ hs: '84798999', whyNot: '8479 là máy công nghiệp khác' }] };
  let micChangedFinal = 0;
  let totalRuns = 0;
  for (const g of stubGroups) {
    const code1 = `${g.prefix}111111`; const code2 = `${g.prefix}222222`;
    micMod.micLookup = async () => ({ query: 'q', searched: true, pages: [PG('s1', code1, 'A'), PG('s2', code2, 'B')], consensus: null });
    const r = await run(FAN, [R1_FAN, CHOT_8414, CHOT_8414_GIAI_TRINH]);
    totalRuns += 1;
    if (r.results[0]?.hs && !r.results[0].hs.startsWith('8414')) micChangedFinal += 1;
  }
  check(`CASE 3 quét chặn: 0/${totalRuns} trường hợp finalHs bị MiC kéo sang nhóm khác`, micChangedFinal === 0, `micChanged=${micChangedFinal}/${totalRuns}`);
  // Bù CASE 2 type check — AI không giải trình → vẫn giữ 8414 (cổng bắt buộc nhưng KHÔNG tự override)
  micMod.micLookup = async () => ({ query: 'q', searched: true, pages: [PG('s1', '8479899800', 'X'), PG('s2', '8479899800', 'Y'), PG('s3', '8479899800', 'Z')], consensus: null });
  const CHOT_KHONG_GIAI_TRINH = (user) => (/NHA_SAN_XUAT_KHAC_NHOM/.test(user) ? { ...CHOT_8414 } : CHOT_8414);
  const r = await run(FAN, [R1_FAN, CHOT_8414, CHOT_KHONG_GIAI_TRINH]);
  // ĐÚNG RÀNG BUỘC: mã cuối là do AI chọn (84145199) chứ không phải do MiC "kéo" sang 8479.
  check('CASE 3 quét: AI không giải trình → cổng bắt buộc vẫn KHÔNG tự override mã (84145199 thắng)', r.results[0]?.hs === '84145199', JSON.stringify([r.results[0]?.hs, r.engine.gates.map((g2) => g2.blocks)]));
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 4: MIC_OFF — stub vẫn trả consensus nhưng cờ MIC_OFF=1 → rankingSignals rỗng,
// dossier.mic null (engine-loop gather đã tắt mic qua micAllowed).
// ─────────────────────────────────────────────────────────────────────────────
{
  process.env.MIC_OFF = '1';
  micMod.micLookup = savedMic; // khôi phục cho đường không stub
  const r = await run(FAN, [R1_FAN, CHOT_8414]);
  check('CASE 4 MIC_OFF: KHÔNG có signal:mic khi cờ MIC_OFF=1', !(r.rankingSignals || []).some((s) => s.signal === 'signal:mic'), JSON.stringify(r.rankingSignals));
  check('CASE 4 MIC_OFF: dossier.mic không có signal block', r.dossier?.mic == null, JSON.stringify(r.dossier?.mic ? 'has' : 'null'));
  delete process.env.MIC_OFF;
  process.env.MIC_OFF = '';
}

micMod.micLookup = savedMic;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
