// HS_CHOT_SOM_CO_KIEM (mặc định TẮT) — không dừng sớm HOI khi hồ sơ vụ việc đã có tín hiệu tất định TRÁI NHÓM 4 SỐ với giả
// thuyết đứng đầu của vòng 1. Ca gốc: van điện từ khí nén 5/2 qua Cổng 21/11 (vòng 1 neo 8412.21, tiền lệ Oz + 3 shop nói
// 8481, nhánh earlyExitHoi bỏ vòng 2 → khách nhận 84122100).
// Luật L3: mỗi ca chứng minh CƠ CHẾ và có CA NGƯỢC (đổi một dữ kiện → kết quả đổi theo).
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
  llmCalls.push({ r1: String(system).startsWith('VÒNG 1'), step: opts.step, system: String(system), user: String(user) });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next(user, system) : JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
// Tờ khai Oz: thay bằng dữ liệu cố định (kho thật thay đổi theo ngày) — đúng hình dạng searchOzByKeyword trả.
const ozSearch = require('../lib/oz-precedent-search.js');
let ozItems = [];
ozSearch.searchOzByKeyword = async () => ({ items: JSON.parse(JSON.stringify(ozItems)) });
console.error = () => {};
console.warn = () => {};
const { classifyLoop } = require('../lib/engine-loop.js');
const cs = require('../lib/chot-som-co-kiem.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 700)}`); }
};
const ma = (ds) => ds.map((t) => `${t.ma}:${t.nhom}`).join(',');

// ───────────────────────── 1. Công tắc ─────────────────────────
check('công tắc: mặc định TẮT', cs.bat() === false);
for (const v of ['on', '1', 'true', 'ON']) { process.env.HS_CHOT_SOM_CO_KIEM = v; check(`công tắc: "${v}" → bật`, cs.bat() === true); }
for (const v of ['off', '0', 'false', '', 'shadow']) { process.env.HS_CHOT_SOM_CO_KIEM = v; check(`công tắc: "${v}" → tắt`, cs.bat() === false); }
delete process.env.HS_CHOT_SOM_CO_KIEM;

// ───────────────────────── 2. Tín hiệu (hàm thuần) ─────────────────────────
const OZ_VAN = [
  { hsCode: '84812090', tenHang: 'Van điện từ khí nén', ozCount: 11, matchCoverage: 100 },
  { hsCode: '84812090', tenHang: 'Van điện từ', ozCount: 6, matchCoverage: 100 },
  { hsCode: '84123100', tenHang: 'Xi lanh khí nén', ozCount: 25, matchCoverage: 22 }, // khớp thấp — không được tính
];
const ozGather = (items) => items.map((it) => ({ q: 'x', hs: it.hsCode, name: it.tenHang, oz: it.ozCount, cov: it.matchCoverage }));
const G = (o = {}) => ({ headings: ['8412', '8481'], ozPrecedents: [], mic: null, tradeHints: null, ...o });

// (1) tiền lệ Oz — cùng ngưỡng cờ review: khớp ≥75%, nhóm dẫn đầu ≥3 tờ khai và ≥60% trọng số
check('tiền lệ Oz 8481 (17 tờ khai, khớp 100%) vs giả thuyết 8412 → chặn dừng sớm',
  ma(cs.tinHieuTraiNhom({ hs: '841221', gathered: G({ ozPrecedents: ozGather(OZ_VAN) }) })) === 'tien-le-oz:8481');
check('CA NGƯỢC: cùng tiền lệ Oz 8481, giả thuyết đứng đầu CŨNG 8481 → không chặn',
  cs.tinHieuTraiNhom({ hs: '848180', gathered: G({ ozPrecedents: ozGather(OZ_VAN) }) }).length === 0);
check('CA NGƯỢC: tiền lệ Oz chỉ khớp 60% từ khoá → không chặn',
  cs.tinHieuTraiNhom({ hs: '841221', gathered: G({ ozPrecedents: ozGather(OZ_VAN.map((o) => ({ ...o, matchCoverage: 60 }))) }) }).length === 0);
check('CA NGƯỢC: tiền lệ Oz chỉ 2 tờ khai → không chặn',
  cs.tinHieuTraiNhom({ hs: '841221', gathered: G({ ozPrecedents: ozGather([{ hsCode: '84812090', tenHang: 'Van', ozCount: 2, matchCoverage: 100 }]) }) }).length === 0);
check('CA NGƯỢC: tiền lệ Oz chia đôi hai nhóm (50% < 60% trọng số) → không chặn',
  cs.tinHieuTraiNhom({ hs: '841221', gathered: G({ ozPrecedents: ozGather([{ hsCode: '84812090', tenHang: 'Van', ozCount: 5, matchCoverage: 100 }, { hsCode: '90328100', tenHang: 'Van', ozCount: 5, matchCoverage: 100 }]) }) }).length === 0);

// (3) made-in-china — ≥3 shop; 2 shop vẫn chỉ cảnh báo (OZV-1389); nhóm từ điển đã loại → nhiễu (OZV-1290)
const MIC = (heading4, shops) => ({ consensus: { heading4, shops }, pages: [] });
check('3 shop made-in-china ghi 8481 vs giả thuyết 8412 → chặn dừng sớm',
  ma(cs.tinHieuTraiNhom({ hs: '841221', gathered: G({ mic: MIC('8481', 3) }) })) === 'made-in-china:8481');
check('CA NGƯỢC: chỉ 2 shop → không chặn (giữ hành vi OZV-1389)',
  cs.tinHieuTraiNhom({ hs: '841221', gathered: G({ mic: MIC('8481', 2) }) }).length === 0);
check('CA NGƯỢC: 3 shop cùng nhóm với giả thuyết → không chặn',
  cs.tinHieuTraiNhom({ hs: '848180', gathered: G({ mic: MIC('8481', 3) }) }).length === 0);
check('CA NGƯỢC: 3 shop nhưng nhóm đó từ điển tên thương mại đã loại (avoid) → không chặn',
  cs.tinHieuTraiNhom({ hs: '852589', gathered: G({ mic: MIC('8544', 3), tradeHints: { avoidPrefixes: ['8544'] } }) }).length === 0);

// (2) TB-TCHQ khớp tên hàng — cùng phép kiểm gather() (giống ≥0,6 VÀ lib/giong-ten-hang.js: giong)
const TEN_TB_852 = 'Van truyền động bằng khí nén: van định hướng đảo chiều loại 5/2, thân hợp kim nhôm, hoạt động bằng cuộn solenoid, dùng trong hệ thống truyền động khí nén';
const tb1 = cs.tinHieuTraiNhom({ hs: '841221', gathered: G(), raw: { tenHang: TEN_TB_852 }, r1: { product: {} } });
check('TB-TCHQ 851/852 khớp tên hàng (mô tả theo chữ thông báo) vs giả thuyết 8412 → chặn dừng sớm', ma(tb1).startsWith('tb-tchq:8481'), JSON.stringify(tb1));
check('CA NGƯỢC: cùng mô tả, giả thuyết đứng đầu 8481 → không chặn',
  cs.tinHieuTraiNhom({ hs: '848120', gathered: G(), raw: { tenHang: TEN_TB_852 }, r1: { product: {} } }).length === 0);
// Giới hạn đã biết (ghi lại để không ai tưởng đã xong): chữ khách "van điện từ … 5/2" KHÔNG khớp tên TB "van truyền động bằng
// khí nén … cuộn solenoid" theo lib/giong-ten-hang.js ⇒ tín hiệu tb-tchq KHÔNG bắn cho ca van; ca van được chặn nhờ tiền lệ Oz
// và shop made-in-china. Sửa truy hồi (từ đồng nghĩa điện từ ↔ solenoid) là việc riêng.
const TEN_VAN = 'Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch, dùng điều khiển xi lanh khí nén';
check('GIỚI HẠN ĐÃ BIẾT: chữ khách "van điện từ khí nén 5/2…" chưa khớp TB 851/852 → tb-tchq không bắn',
  !ma(cs.tinHieuTraiNhom({ hs: '841221', gathered: G(), raw: { tenHang: TEN_VAN }, r1: { product: {} } })).includes('tb-tchq'));

// (4) sổ tay nhóm đứng đầu loại trừ đích danh — chỉ khi HS_SO_TAY ≠ off
const VAN_NEN = { hs: '848180', gathered: G({ headings: ['8481'] }), productName: 'Van nén dùng cho máy nén không khí', productText: 'Van nén dùng cho máy nén không khí' };
process.env.HS_SO_TAY = 'full';
const st1 = cs.tinHieuTraiNhom(VAN_NEN);
check('sổ tay 84.81 loại trừ "van hút hoặc van nén dùng cho máy nén không khí" sang 84.14 → chặn dừng sớm', ma(st1) === 'so-tay-loai-tru:8414', JSON.stringify(st1));
check('CA NGƯỢC: tên hàng không khớp cụm loại trừ nào ("van điện từ khí nén") → không chặn',
  cs.tinHieuTraiNhom({ ...VAN_NEN, productName: TEN_VAN, productText: TEN_VAN }).length === 0);
delete process.env.HS_SO_TAY;
check('CA NGƯỢC: HS_SO_TAY tắt → không đọc sổ tay, không chặn', cs.tinHieuTraiNhom(VAN_NEN).length === 0);

check('nhomCanNap: chỉ nhóm CHƯA có trong hồ sơ, tối đa 2', JSON.stringify(cs.nhomCanNap([{ nhom: '8481' }, { nhom: '9032' }, { nhom: '8414' }, { nhom: '8481' }], ['8412', '8481'])) === '["9032","8414"]');
check('tinHieuTraiNhom: thiếu hồ sơ / mã < 4 số → rỗng, không ném lỗi', cs.tinHieuTraiNhom({ hs: '84', gathered: G() }).length === 0 && cs.tinHieuTraiNhom({}).length === 0 && cs.tinHieuTraiNhom().length === 0);

// ───────────────────────── 3. Qua động cơ thật (LLM giả) — dựng lại ca van ─────────────────────────
const VAN = { tenHang: TEN_VAN };
const R1_VAN = (dau = '8412') => ({
  product: {
    nameVi: 'Van điện từ khí nén 5/2', nameEn: 'Pneumatic solenoid valve 5/2', purpose: 'điều khiển xi lanh khí nén',
    mechanism: 'cuộn dây điện từ đảo chiều dòng khí nén', material: 'nhôm', form: 'hoàn chỉnh', evidence: {},
  },
  hypotheses: dau === '8412'
    ? [{ chapter: '84', heading4: '8412', subheading6: '841221', why: 'thiết bị truyền động khí nén/thuỷ lực', confidence: 94 },
      { chapter: '84', heading4: '8481', subheading6: '848180', why: 'van', confidence: 15 }]
    : [{ chapter: '84', heading4: '8481', subheading6: '848180', why: 'van', confidence: 82 },
      { chapter: '84', heading4: '8412', subheading6: '841231', why: 'thiết bị truyền động khí nén', confidence: 18 }],
  verify: {
    searchVi: ['van điện từ khí nén'], codes8: ['84122100', '84818099'],
    unknowns: ['Điện áp cuộn dây', 'Model / hãng sản xuất', 'Áp suất làm việc'],
  },
});
const R2_VAN = {
  decision: 'CHOT', hs: '84812090', confidence: 88,
  reason: 'Van dùng trong truyền động khí nén — phân nhóm 8481.20; tờ khai Oz cùng tên xếp 84812090',
  basis: [{ stream: 'SAN_PHAM', claim: 'van điện từ khí nén', evidence: 'Van điện từ khí nén 5/2' }, { stream: 'TIEN_LE', claim: 'tờ khai Oz 84812090', evidence: 'Van điện từ khí nén', ref: 'tờ khai Oz' }],
  conditions: [], alternatives: [{ hs: '84122100', whyNot: 'xi lanh thuỷ lực — hàng là van, không phải động cơ/xi lanh' }], questions: [],
};
async function run(r1, { env = {}, r2 = R2_VAN, oz = OZ_VAN, hang = VAN } = {}) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = [r1, r2, r2];
  llmCalls = [];
  ozItems = oz;
  let out;
  try { out = await classifyLoop(hang, {}); }
  finally { for (const k of Object.keys(env)) delete process.env[k]; }
  return { out, llm: llmCalls, girCalls: llmCalls.filter((c) => !c.r1).length, gates: out.engine?.gates || [] };
}
const tom = (r) => JSON.stringify({ status: r.out.status, hs: r.out.results?.[0]?.hs, gir: r.girCalls, gates: r.gates, review: r.out.review, soTay: r.out.soTay && { outcome: r.out.soTay.outcome, daTra: r.out.soTay.daTra, lyDoChuaTra: r.out.soTay.lyDoChuaTra } });

// 3a. TẮT (mặc định). Từ PR #1527 (f05859fd, OZV-1707) ca van KHÔNG còn dừng sớm trên 841221 kể cả khi công tắc tắt: phép kiểm
// phân nhóm 6 số trước earlyExitHoi thấy bảng quyết định nhóm 84.12 chỉ sang phân nhóm khác (cổng ghi lyDo
// BANG_QUYET_DINH_KHAC_PHAN_NHOM) nên động cơ đi vòng 2 và ra 84812090. QT chốt 22/11: đó là hành vi đúng, giữ.
// Tác dụng RIÊNG của HS_CHOT_SOM_CO_KIEM được kiểm ở mục 3f bằng kịch bản giả (không cổng nào khác chặn).
const tat = await run(R1_VAN(), { env: { HS_SO_TAY: 'full' } });
check('TẮT: ca van KHÔNG dừng sớm trên 841221 — cổng kiểm phân nhóm chặn (BANG_QUYET_DINH_KHAC_PHAN_NHOM), có một lượt vòng 2', tat.girCalls === 1 && !tat.gates.some((g) => g.earlyExitHoi === true) && tat.gates.some((g) => g.earlyExitHoi === false && g.lyDo === 'BANG_QUYET_DINH_KHAC_PHAN_NHOM' && g.hs === '841221'), tom(tat));
check('TẮT: kết quả đứng đầu 84812090 (mã vòng 2 chọn), không còn 8412', tat.out.results?.[0]?.hs === '84812090', tom(tat));
check('TẮT: không có trường mới (soTay.daTra, chanChotSom)', !('daTra' in (tat.out.soTay || {})) && !tat.gates.some((g) => 'chanChotSom' in g), tom(tat));

// 3b. BẬT: cùng đầu vào, cùng LLM giả → KHÔNG dừng sớm, có vòng 2, ghi lý do
const bat = await run(R1_VAN(), { env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' } });
const gChan = bat.gates.find((g) => Array.isArray(g.chanChotSom));
check('BẬT: ca van KHÔNG dừng sớm — không còn earlyExitHoi:true', !bat.gates.some((g) => g.earlyExitHoi === true), tom(bat));
check('BẬT: có đúng MỘT lượt vòng 2 (step gir)', bat.girCalls === 1 && bat.llm[1]?.step === 'gir', tom(bat));
check('BẬT: engine.gates ghi chanChotSom ["tien-le-oz"], nhomTrai ["8481"], earlyExitHoi:false', gChan && gChan.earlyExitHoi === false && gChan.lyDo === 'TIN_HIEU_TRAI_NHOM' && gChan.chanChotSom.join() === 'tien-le-oz' && gChan.nhomTrai.join() === '8481', JSON.stringify(gChan));
check('BẬT: kết quả đứng đầu 84812090 (mã vòng 2 chọn sau khi đọc gói)', bat.out.results?.[0]?.hs === '84812090', tom(bat));
// Cơ chế: tín hiệu tới vòng 2 qua gói vòng 2 VỐN CÓ (mục TIỀN LỆ OZ + chú giải/sổ tay nhóm 84.81), không qua prompt mới
const goi = bat.llm[1]?.user || '';
check('BẬT: gói vòng 2 mang TIỀN LỆ OZ 84812090 và mục nhóm 8481', /TIỀN LỆ OZ:\n84812090/.test(goi) && /NHÓM 8481|84\.81/.test(goi), goi.slice(0, 300));
check('BẬT: prompt hệ thống vòng 1 / vòng 2 không đổi (vẫn là SYS_R1* / SYS_R2* của động cơ)', bat.llm[0].system === tat.llm[0].system && bat.llm[1].system.startsWith('VÒNG 2'), '');
check('BẬT + HS_SO_TAY=full: soTay.daTra = true (vòng 2 đã chạy, cổng sổ tay đã xét)', bat.out.soTay?.daTra === true && !('lyDoChuaTra' in bat.out.soTay), tom(bat));

// 3c. CA NGƯỢC qua động cơ: đổi MỘT dữ kiện → vẫn dừng sớm như cũ
const cungNhom = await run(R1_VAN('8481'), { env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' } });
check('BẬT, CA NGƯỢC: vòng 1 đứng đầu 8481 (cùng nhóm tiền lệ Oz) → vẫn dừng sớm, 0 lượt vòng 2', cungNhom.girCalls === 0 && cungNhom.gates.some((g) => g.earlyExitHoi === true) && !cungNhom.gates.some((g) => 'chanChotSom' in g), tom(cungNhom));
// soTay.outcome theo main hiện tại (#1527): nhánh dừng sớm ghi "DA_TRA_KHONG_NGHI" thay cho giá trị khởi tạo "NONE"; người đọc
// phải xem daTra / lyDoChuaTra để biết khối sổ tay của vòng 2 CHƯA chạy.
check('BẬT, CA NGƯỢC: soTay.daTra = false, lyDoChuaTra "dung-som-hoi", outcome "DA_TRA_KHONG_NGHI" (theo #1527)', cungNhom.out.soTay?.daTra === false && cungNhom.out.soTay?.lyDoChuaTra === 'dung-som-hoi' && cungNhom.out.soTay?.outcome === 'DA_TRA_KHONG_NGHI', tom(cungNhom));
const khongTienLe = await run(R1_VAN(), { env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' }, oz: [] });
check('BẬT, không tiền lệ Oz: ca van vẫn không dừng sớm nhưng do cổng KHÁC (BANG_QUYET_DINH_KHAC_PHAN_NHOM, #1527) — không ghi chanChotSom', khongTienLe.girCalls === 1 && khongTienLe.gates.some((g) => g.earlyExitHoi === false && g.lyDo === 'BANG_QUYET_DINH_KHAC_PHAN_NHOM') && !khongTienLe.gates.some((g) => 'chanChotSom' in g), tom(khongTienLe));
const tatSoTay = await run(R1_VAN(), { env: { HS_CHOT_SOM_CO_KIEM: 'on' } });
check('BẬT, HS_SO_TAY tắt: tiền lệ Oz vẫn chặn dừng sớm (không phụ thuộc sổ tay); không có khối soTay của động cơ', tatSoTay.girCalls === 1 && tatSoTay.gates.some((g) => (g.chanChotSom || []).includes('tien-le-oz')) && !('daTra' in (tatSoTay.out.soTay || {})), tom(tatSoTay));

// 3d. Vòng 2 vẫn muốn hỏi (HOI) → vẫn là đáp án của vòng 2 thật, không quay lại dừng sớm
const R2_HOI = { decision: 'HOI', hs: '848120', confidence: 60, reason: 'thiếu dữ kiện dòng 8 số', basis: [], conditions: [], alternatives: [], questions: [{ fact: 'loại truyền động', question: 'Van dùng cho truyền động dầu thuỷ lực hay khí nén?', whereToFind: 'catalogue' }] };
const hoi = await run(R1_VAN(), { env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' }, r2: R2_HOI });
check('BẬT: vòng 2 trả HOI trên 848120 → kết quả theo nhóm 8481, không còn 8412 đứng đầu', hoi.girCalls >= 1 && String(hoi.out.results?.[0]?.hs || '').startsWith('8481'), tom(hoi));

// 3e. Ca dừng sớm không liên quan (giác hút SMC, không tín hiệu trái nhóm) — bật hay tắt đều 0 lượt vòng 2
const SMC = { tenHang: 'giác hút chân không smc zp-905-08eu' };
const R1_SMC = {
  product: { nameVi: 'giác hút chân không SMC', nameEn: 'SMC vacuum pad', purpose: 'hút chi tiết trong dây chuyền', mechanism: 'khí nén', material: 'cao su', evidence: {} },
  hypotheses: [{ chapter: '40', heading4: '4016', subheading6: '401699', why: 'phụ kiện cao su khác', confidence: 78 }],
  verify: { searchVi: ['giác hút SMC'], codes8: ['40169999', '40169390'], unknowns: ['chất liệu đế hút (NBR/silicon/…)', 'có phải linh kiện máy hoàn chỉnh không'] },
};
const smcTat = await run(R1_SMC, { hang: SMC, oz: [] });
const smcBat = await run(R1_SMC, { hang: SMC, oz: [], env: { HS_CHOT_SOM_CO_KIEM: 'on' } });
check('giác hút SMC: bật = tắt (dừng sớm, 0 lượt vòng 2, cùng status + mã)', smcTat.girCalls === 0 && smcBat.girCalls === 0 && smcBat.out.status === smcTat.out.status && smcBat.out.results?.[0]?.hs === smcTat.out.results?.[0]?.hs && smcBat.gates.some((g) => g.earlyExitHoi === true), tom(smcBat));

// 3f. KỊCH BẢN GIẢ — kiểm RIÊNG tác dụng của công tắc. Tên hàng bịa (không kho nào khớp: không từ điển, không bảng quyết định,
// không TB-TCHQ), vòng 1 do LLM giả trả, tiền lệ Oz tiêm qua searchOzByKeyword giả ở đầu tệp. Không khoá vào một mặt hàng thật
// mà PR khác có thể đổi hành vi (ca van ở trên đã bị #1527 đổi). Tiền đề: không cổng nào khác chặn dừng sớm ⇒ TẮT phải dừng sớm.
{
  const GIA = { tenHang: 'vật phẩm thử nghiệm zzq-17 kiểu qx' };
  const R1_GIA = {
    product: { nameVi: 'vật phẩm thử nghiệm zzq-17', nameEn: 'test article zzq-17', purpose: 'thử nghiệm', mechanism: 'không', material: 'không rõ', evidence: {} },
    hypotheses: [{ chapter: '40', heading4: '4016', subheading6: '401699', why: 'giả thuyết của LLM giả', confidence: 80 }],
    verify: { searchVi: ['vật phẩm zzq'], codes8: [], unknowns: ['chất liệu', 'công dụng'] },
  };
  const ozGia = (hs) => [{ hsCode: hs, tenHang: 'vật phẩm thử nghiệm zzq-17', ozCount: 9, matchCoverage: 100 }, { hsCode: hs, tenHang: 'vật phẩm zzq', ozCount: 5, matchCoverage: 100 }];
  const R2_GIA = { ...R2_VAN, hs: '39269099' };
  const chay = (env, oz) => run(R1_GIA, { hang: GIA, oz, env, r2: R2_GIA });
  const gTat = await chay({ HS_SO_TAY: 'full' }, ozGia('39269099'));
  check('GIẢ, TẮT: tiền lệ trái nhóm (3926 vs 4016) có sẵn mà vẫn dừng sớm trên 401699, 0 lượt vòng 2; chỉ ra cờ review', gTat.girCalls === 0 && gTat.gates.some((g) => g.earlyExitHoi === true && g.hs === '401699') && !gTat.gates.some((g) => 'chanChotSom' in g) && (gTat.out.review?.reasons || []).some((r) => /Tiền lệ Oz/.test(r) && /3926/.test(r)), tom(gTat));
  const gBat = await chay({ HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' }, ozGia('39269099'));
  const gc = gBat.gates.find((g) => Array.isArray(g.chanChotSom));
  check('GIẢ, BẬT: cùng đầu vào → KHÔNG dừng sớm, có vòng 2, chanChotSom ["tien-le-oz"] kèm lý do TIN_HIEU_TRAI_NHOM + nhomTrai ["3926"]', gBat.girCalls >= 1 && !gBat.gates.some((g) => g.earlyExitHoi === true) && gc && gc.earlyExitHoi === false && gc.lyDo === 'TIN_HIEU_TRAI_NHOM' && gc.chanChotSom.join() === 'tien-le-oz' && gc.nhomTrai.join() === '3926' && (gc.chiTiet || []).length > 0, tom(gBat));
  const gCung = await chay({ HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' }, ozGia('40169999'));
  check('GIẢ, BẬT, CA NGƯỢC: tiền lệ CÙNG nhóm 4016 → vẫn dừng sớm, 0 lượt vòng 2, soTay.daTra false + lyDoChuaTra "dung-som-hoi"', gCung.girCalls === 0 && gCung.gates.some((g) => g.earlyExitHoi === true) && !gCung.gates.some((g) => 'chanChotSom' in g) && gCung.out.soTay?.daTra === false && gCung.out.soTay?.lyDoChuaTra === 'dung-som-hoi', tom(gCung));
  const gKhong = await chay({ HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' }, []);
  check('GIẢ, BẬT, CA NGƯỢC: KHÔNG có tiền lệ → vẫn dừng sớm, 0 lượt vòng 2', gKhong.girCalls === 0 && gKhong.gates.some((g) => g.earlyExitHoi === true) && !gKhong.gates.some((g) => 'chanChotSom' in g), tom(gKhong));
  const gYeu = await chay({ HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' }, ozGia('39269099').map((o) => ({ ...o, matchCoverage: 60 })));
  check('GIẢ, BẬT, CA NGƯỢC: tiền lệ trái nhóm nhưng chỉ khớp 60% → không đủ ngưỡng, vẫn dừng sớm', gYeu.girCalls === 0 && gYeu.gates.some((g) => g.earlyExitHoi === true), tom(gYeu));
}

// ───────────────────────── 4. Phủ đủ 3 nhánh dừng sớm còn lại (OZV-1707, L11) ─────────────────────────
// 4a. earlyExitChotTuConflict (bảng CF-cooling-tower-fan-blade → 84149029)
{
  const QUAT = { tenHang: 'Cánh quạt tháp giải nhiệt nhập riêng rẽ' };
  const R1_QUAT = {
    product: { nameVi: 'Cánh quạt tháp giải nhiệt', nameEn: 'Cooling tower fan blade', purpose: 'lắp cho tháp giải nhiệt', mechanism: 'cơ khí', material: 'nhôm', form: 'bộ phận rời', evidence: {} },
    hypotheses: [{ chapter: '84', heading4: '8414', subheading6: '841490', why: 'bộ phận quạt', confidence: 85 }],
    verify: { searchVi: ['cánh quạt tháp giải nhiệt'], codes8: ['84149029'], unknowns: ['đường kính cánh', 'kiểu quạt'] },
  };
  const R2_QUAT = { ...R2_VAN, hs: '84195010', reason: 'Vòng 2 xét đối chiếu tiền lệ trái nhóm 8419 và bảng xung đột 8414' };
  const ozTrai = [
    { hsCode: '84195010', tenHang: 'Cánh quạt tháp giải nhiệt', ozCount: 9, matchCoverage: 100 },
    { hsCode: '84195010', tenHang: 'Tháp giải nhiệt', ozCount: 5, matchCoverage: 100 },
  ];
  const ozCung = [
    { hsCode: '84149029', tenHang: 'Cánh quạt tháp giải nhiệt', ozCount: 9, matchCoverage: 100 },
  ];
  const cfTat = await run(R1_QUAT, { hang: QUAT, oz: ozTrai, r2: R2_QUAT, env: { HS_SO_TAY: 'full' } });
  check('CONFLICT, TẮT: tiền lệ trái nhóm 8419 nhưng cờ tắt → vẫn earlyExitConflict:true, 0 lượt vòng 2',
    cfTat.girCalls === 0 && cfTat.gates.some((g) => g.earlyExitConflict === true && g.hs === '84149029') && !cfTat.gates.some((g) => 'chanChotSom' in g), tom(cfTat));

  const cfBat = await run(R1_QUAT, { hang: QUAT, oz: ozTrai, r2: R2_QUAT, env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' } });
  const gCf = cfBat.gates.find((g) => g.earlyExitConflict === false && g.lyDo === 'TIN_HIEU_TRAI_NHOM');
  check('CONFLICT, BẬT: tiền lệ Oz trái nhóm 8419 → CHẶN earlyExitConflict, nạp 8419, chạy vòng 2',
    cfBat.girCalls >= 1 && !cfBat.gates.some((g) => g.earlyExitConflict === true) && Boolean(gCf) && gCf.chanChotSom.includes('tien-le-oz') && gCf.nhomTrai.includes('8419'), tom(cfBat));

  const cfCung = await run(R1_QUAT, { hang: QUAT, oz: ozCung, r2: R2_QUAT, env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' } });
  check('CONFLICT, BẬT, CA NGƯỢC: tiền lệ cùng nhóm 8414 → vẫn earlyExitConflict:true, 0 lượt vòng 2, soTay.daTra:false + dung-som-bang-xung-dot',
    cfCung.girCalls === 0 && cfCung.gates.some((g) => g.earlyExitConflict === true && g.hs === '84149029') && cfCung.out.soTay?.daTra === false && cfCung.out.soTay?.lyDoChuaTra === 'dung-som-bang-xung-dot', tom(cfCung));
}

// 4b. fastFirstUngVien (HS_CLASSIFY_FAST_FIRST=on)
{
  const FF_HANG = { tenHang: 'vật phẩm thử nghiệm zzq-17 kiểu qx' };
  const R1_FF = {
    product: { nameVi: 'vật phẩm thử nghiệm zzq-17', nameEn: 'test article zzq-17', purpose: 'thử nghiệm', mechanism: 'không', material: 'không rõ', evidence: {} },
    hypotheses: [{ chapter: '40', heading4: '4016', subheading6: '401699', why: 'giả thuyết độ tin cậy cao', confidence: 95 }],
    verify: { searchVi: ['vật phẩm zzq'], codes8: ['40169999'], unknowns: [] },
  };
  const R2_FF = { ...R2_VAN, hs: '39269099', reason: 'Vòng 2 xét tiền lệ trái nhóm 3926' };
  // 3 tờ khai ở 40169999 đủ kích hoạt fastFirstUngVien (nguonDocLap), nhưng 12 tờ khai (80% ≥ 60%) ở 39269099 là tín hiệu trái nhóm!
  const ozFastTrai = [
    { hsCode: '40169999', tenHang: 'vật phẩm thử nghiệm zzq-17', ozCount: 3, matchCoverage: 100 },
    { hsCode: '39269099', tenHang: 'vật phẩm thử nghiệm zzq-17', ozCount: 12, matchCoverage: 100 },
  ];
  const ozFastCung = [
    { hsCode: '40169999', tenHang: 'vật phẩm thử nghiệm zzq-17', ozCount: 8, matchCoverage: 100 },
  ];
  const ffTat = await run(R1_FF, { hang: FF_HANG, oz: ozFastTrai, r2: R2_FF, env: { HS_SO_TAY: 'full', HS_CLASSIFY_FAST_FIRST: 'on' } });
  check('FAST-FIRST, TẮT: tiền lệ Oz đa số 3926 nhưng cờ tắt → vẫn fastFirst:true (bỏ vòng 2)',
    ffTat.girCalls === 0 && ffTat.gates.some((g) => g.fastFirst === true && g.boQuaVong2 === true && g.hs === '40169999'), tom(ffTat));

  const ffBat = await run(R1_FF, { hang: FF_HANG, oz: ozFastTrai, r2: R2_FF, env: { HS_SO_TAY: 'full', HS_CLASSIFY_FAST_FIRST: 'on', HS_CHOT_SOM_CO_KIEM: 'on' } });
  const gFf = ffBat.gates.find((g) => g.fastFirst === false && g.lyDo === 'TIN_HIEU_TRAI_NHOM');
  check('FAST-FIRST, BẬT: tiền lệ Oz đa số trái nhóm 3926 → CHẶN fast-first, chạy vòng 2',
    ffBat.girCalls >= 1 && !ffBat.gates.some((g) => g.fastFirst === true) && Boolean(gFf) && gFf.chanChotSom.includes('tien-le-oz') && gFf.nhomTrai.includes('3926'), tom(ffBat));

  const ffCung = await run(R1_FF, { hang: FF_HANG, oz: ozFastCung, r2: R2_FF, env: { HS_SO_TAY: 'full', HS_CLASSIFY_FAST_FIRST: 'on', HS_CHOT_SOM_CO_KIEM: 'on' } });
  check('FAST-FIRST, BẬT, CA NGƯỢC: tiền lệ cùng nhóm 4016 → vẫn fastFirst:true, 0 lượt vòng 2, soTay.daTra:false + fast-first',
    ffCung.girCalls === 0 && ffCung.gates.some((g) => g.fastFirst === true && g.boQuaVong2 === true) && ffCung.out.soTay?.daTra === false && ffCung.out.soTay?.lyDoChuaTra === 'fast-first', tom(ffCung));
}

// 4c. earlyExitChotTuTrade (từ điển high + chotSom: coc-giu-nhiet-chan-khong → 96170010)
{
  const COC_SACH = { tenHang: 'cốc giữ nhiệt chân không' };
  const trSach = await run(R1_VAN('8481'), { hang: COC_SACH, oz: [], env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' } });
  check('TRADE, BẬT, CA NGƯỢC: cốc giữ nhiệt chân không không tín hiệu trái → vẫn earlyExitTradeChotSom:true, 0 lượt LLM, soTay.daTra:false + chot-som-tu-dien',
    trSach.llm.length === 0 && trSach.gates.some((g) => g.earlyExitTradeChotSom === true && g.hs === '96170010') && trSach.out.soTay?.daTra === false && trSach.out.soTay?.lyDoChuaTra === 'chot-som-tu-dien', tom(trSach));

  // Mô tả trùng khít tên TB-TCHQ 852 (nhóm 8481) đồng thời dính cụm từ điển 96170010: TẮT vẫn chốt sớm 96170010, BẬT chặn bằng tb-tchq:8481 và chạy vòng 1+2.
  const COC_TRAI_TB = { tenHang: `${TEN_TB_852} (kèm cốc giữ nhiệt chân không)` };
  const trTat = await run(R1_VAN('8481'), { hang: COC_TRAI_TB, oz: [], env: { HS_SO_TAY: 'full' } });
  check('TRADE, TẮT: mô tả trùng TB-TCHQ nhóm 8481 nhưng cờ tắt → vẫn earlyExitTradeChotSom:true (0 lượt LLM)',
    trTat.llm.length === 0 && trTat.gates.some((g) => g.earlyExitTradeChotSom === true && g.hs === '96170010'), tom(trTat));

  const trBat = await run(R1_VAN('8481'), { hang: COC_TRAI_TB, oz: [], env: { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' } });
  const gTr = trBat.gates.find((g) => g.earlyExitTradeChotSom === false && g.lyDo === 'TIN_HIEU_TRAI_NHOM');
  check('TRADE, BẬT: TB-TCHQ trái nhóm 8481 → CHẶN chốt sớm từ điển, chạy đường AI bình thường',
    trBat.llm.length >= 1 && !trBat.gates.some((g) => g.earlyExitTradeChotSom === true) && Boolean(gTr) && gTr.chanChotSom.includes('tb-tchq') && gTr.nhomTrai.includes('8481'), tom(trBat));
}

console.log(`\n${fail ? `${fail} failed | ` : ''}${pass} passed`);
if (fail) process.exit(1);
console.log('=== ALL TESTS PASSED ===');
