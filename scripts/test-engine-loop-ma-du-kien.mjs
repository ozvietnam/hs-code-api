// OZV-1388: ca HOI dừng ở 6 số mà phân nhóm đó chỉ có ĐÚNG MỘT dòng 8 số trong biểu (vd ca A1 stt 5:
// 320419 → 32041900) → Cổng nhận mã 8 số DỰ KIẾN kèm câu hỏi; kết cục VẪN là NEED_FACTS (không CHOT).
// Chỉ dựa cây biểu `data/tax.json` (GIR 6 — không còn anh em cùng cấp), KHÔNG so chữ dòng; lưới an toàn
// OZV-590/630 (`chotDong8` giữ KHONG_THE_CHOT với 820890 S45C) giữ nguyên.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { rutMaTuPhanHoi, chamBanGhi } from './do-a1-ban-that.mjs';
const require = createRequire(import.meta.url);
const { chotDong8 } = require('../lib/so-tay-gates.js');
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS']) {
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
  return { json: typeof next === 'function' ? next(user, system) : JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};
const { classifyLoop } = require('../lib/engine-loop.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 500)}`); }
};

// R2 dự phòng nếu earlyExit không chạy (không được dùng tới ở các ca dưới — earlyExitHoi bỏ R2).
const R2_HOI = (hs) => ({
  decision: 'HOI', hs, confidence: 50, reason: 'thiếu dữ kiện', basis: [], conditions: [], alternatives: [],
  questions: [{ fact: 'thành phần', question: 'Thành phần?', whereToFind: 'nhãn' }],
});

async function runCa(raw, r1, r2) {
  script = [r1, r2];
  llmCalls = [];
  const out = await classifyLoop(raw, { debug: true });
  return { out, girCalls: llmCalls.filter((c) => !c.r1).length, gates: out.engine?.gates || [] };
}
const tom = (r) => JSON.stringify({
  status: r.out.status, results: (r.out.results || []).map((x) => ({ hs: x.hs, duKien: x.duKien })),
  q: (r.out.nextAction?.questions || []).length, gir: r.girCalls,
});

// ── Ca A1 stt 5: thuốc màu MCF18 — R1 chọn đúng 320419 + 2 unknowns (giống lượt gọi lại 00:45Z 18/11).
const MCF18 = { tenHang: 'Thuốc màu hữu cơ dạng lỏng MCF18, dùng tạo màu cho dung môi' };
const R1_MCF18 = {
  product: {
    nameVi: 'Thuốc màu hữu cơ dạng lỏng', purpose: 'tạo màu trong dung môi', mechanism: '',
    material: 'hợp chất màu hữu cơ tổng hợp tan trong dung môi', evidence: {},
  },
  hypotheses: [
    { chapter: '32', heading4: '3204', subheading6: '320419', why: 'chất màu hữu cơ tổng hợp', confidence: 90 },
    { chapter: '32', heading4: '3212', subheading6: '321290', why: 'thuốc màu phân tán', confidence: 10 },
  ],
  verify: {
    searchVi: ['thuốc màu hữu cơ'], notesChapters: [], codes8: ['32041900'],
    unknowns: ['Thành phần hóa học chính xác của chất màu hữu cơ', 'Nồng độ phần trăm của chất màu trong dung môi'],
  },
};
const mcf = await runCa(MCF18, R1_MCF18, R2_HOI('320419'));
check('OZV-1388 ca 5: kết cục VẪN NEED_FACTS (không CHOT)', mcf.out.status === 'NEED_FACTS', tom(mcf));
check('OZV-1388 ca 5: câu hỏi giữ nguyên (≥ 1 câu từ unknowns)', (mcf.out.nextAction?.questions || []).length >= 1, tom(mcf));
check('OZV-1388 ca 5: Cổng nhận mã 8 số dự kiến 32041900 ở results[0]', (mcf.out.results?.[0]?.hs || '') === '32041900', tom(mcf));
check('OZV-1388 ca 5: results[0] gắn cờ duKien=true (chưa chốt, còn phụ thuộc câu trả lời)', mcf.out.results?.[0]?.duKien === true, tom(mcf));
check('OZV-1388 ca 5: lý do nói rõ "dòng 8 số duy nhất của phân nhóm 320419"',
  /duy nhất/i.test(String(mcf.out.results?.[0]?.reason || '')) && String(mcf.out.results?.[0]?.reason || '').includes('320419'), tom(mcf));

// ── Đối chứng 1: phân nhóm ≥ 2 dòng 8 số (853400 có 4 dòng) → không thêm gì, giữ 6 số như cũ.
const BO_MACH = { tenHang: 'bo mạch in chưa gắn linh kiện' };
const R1_BO_MACH = {
  product: { nameVi: BO_MACH.tenHang, purpose: '', mechanism: '', material: '', evidence: {} },
  hypotheses: [{ chapter: '85', heading4: '8534', subheading6: '853400', why: 'mạch in nhóm 8534', confidence: 95 }],
  verify: { searchVi: ['bo mạch'], notesChapters: [], codes8: ['85340010'], unknowns: ['Số lớp mạch', 'Đã gắn linh kiện chưa'] },
};
const bm = await runCa(BO_MACH, R1_BO_MACH, R2_HOI('853400'));
check('OZV-1388 đối chứng 853400 (4 dòng): NEED_FACTS, results[0] vẫn 853400, không duKien',
  bm.out.status === 'NEED_FACTS' && (bm.out.results?.[0]?.hs || '') === '853400' && !bm.out.results?.[0]?.duKien, tom(bm));

// ── Đối chứng 2: 820890 thép S45C (ca âm tính cố ý OZV-590/630) → status NEED_FACTS như cũ, không CHOT.
const S45C = { tenHang: 'Thép hợp kim dạng cuộn, kích thước 2,5 x 19 mm, tiêu chuẩn JIS G405 S45C (Cr ≈ 0,94%, Mo ≈ 0,16%)' };
const R1_S45C = {
  product: { nameVi: 'thép hợp kim dạng cuộn S45C', purpose: '', mechanism: '', material: 'thép hợp kim', evidence: {} },
  hypotheses: [{ chapter: '82', heading4: '8208', subheading6: '820890', why: 'dao cắt máy', confidence: 60 }],
  verify: { searchVi: ['thép S45C'], notesChapters: [], codes8: ['82089000'], unknowns: ['Công dụng: làm lưỡi dao cắt hay nguyên liệu thép?'] },
};
const s45 = await runCa(S45C, R1_S45C, R2_HOI('820890'));
check('OZV-1388 đối chứng 820890 S45C: status NEED_FACTS như cũ (không CHOT)', s45.out.status === 'NEED_FACTS', tom(s45));
check('OZV-1388 đối chứng 820890 S45C: câu hỏi còn', (s45.out.nextAction?.questions || []).length >= 1, tom(s45));
const cdS45 = chotDong8({ hs: '820890', productText: S45C.tenHang });
check('OZV-1388 đối chứng 820890 S45C: chotDong8 giữ nguyên KHONG_THE_CHOT (không nới lưới an toàn OZV-590/630)',
  cdS45.ketQua === 'KHONG_THE_CHOT' && !cdS45.hs, JSON.stringify(cdS45));

// ── Kiểm trực tiếp bộ chấm do-a1-ban-that.mjs trên ca 5 MCF18 (trước: 320419 → dsMa=[], khongRaMa=true; sau: 32041900 → top1=true, needFacts=true)
const chamTruoc = chamBanGhi({ stt: 5, ma: '32041900', maLan: ['32041700'], status: 'NEED_FACTS', dsMa: rutMaTuPhanHoi({ results: [{ hs: '320419' }] }) });
const chamSau = chamBanGhi({ stt: 5, ma: '32041900', maLan: ['32041700'], status: mcf.out.status, dsMa: rutMaTuPhanHoi(mcf.out) });
check('OZV-1388 do-a1-ban-that ca 5: trước (6 số 320419) khongRaMa=true, top1=false → sau (32041900 duKien=true) khongRaMa=false, top1=true, needFacts=true',
  chamTruoc.khongRaMa === true && chamTruoc.top1 === false
    && chamSau.khongRaMa === false && chamSau.top1 === true && chamSau.needFacts === true && chamSau.maDau === '32041900',
  JSON.stringify({ chamTruoc, chamSau }));

// ── Chống hồi quy thứ tự khoá JSON results[0] (hs → confidence → reason → [duKien] → basis) + HS_GON_DAU_RA=off giữ nguyên 6 số
check('OZV-1388 thứ tự khoá results[0]: hs → confidence → reason (tránh lệch snapshot byte-for-byte)',
  JSON.stringify(Object.keys(mcf.out.results?.[0] || {}).slice(0, 4)) === JSON.stringify(['hs', 'confidence', 'reason', 'duKien'])
    && JSON.stringify(Object.keys(bm.out.results?.[0] || {}).slice(0, 3)) === JSON.stringify(['hs', 'confidence', 'reason']),
  JSON.stringify({ mcfKeys: Object.keys(mcf.out.results?.[0] || {}), bmKeys: Object.keys(bm.out.results?.[0] || {}) }));
process.env.HS_GON_DAU_RA = 'off';
const mcfOff = await runCa(MCF18, R1_MCF18, R2_HOI('320419'));
delete process.env.HS_GON_DAU_RA;
check('OZV-1388 khi HS_GON_DAU_RA=off: giữ nguyên results[0].hs = 320419 (trùng snapshot gốc)',
  (mcfOff.out.results?.[0]?.hs || '') === '320419' && mcfOff.out.results?.[0]?.duKien === undefined, tom(mcfOff));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
