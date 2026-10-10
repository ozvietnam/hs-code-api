#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Căn cứ pháp lý TT 85/2026 (lib/legal-basis.js): mọi trích điều luật qua một cửa, trạng thái khớp pháp lý, không khẳng định nguồn
 * chưa tra, không rò nguyên văn kho WCO, và có mặt trong phản hồi /api/suggest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'test-token';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let pass = 0; let fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 300))); };

const lb = require('../lib/legal-basis.js');
const { dataPath } = require('../lib/data-paths.js');
const wcoOp = require('../lib/wco-op.js');

// ── cite ──
check('cite: điều khoản lạ → ném lỗi (không có trích dẫn tự do)', (() => { try { lb.cite('99.9'); return false; } catch { return true; } })());
const c61 = lb.cite('6.1.b');
check('cite: có tham chiếu, trang, trích nguyên văn', c61.tham_chieu === 'Điều 6 khoản 1 điểm b 85/2026/TT-BTC' && c61.trang === 4 && c61.trich === 'Tuyển tập ý kiến phân loại của WCO', c61);
check('cite: Điều 8 không có khoản', lb.cite('8').tham_chieu === 'Điều 8 85/2026/TT-BTC');
check('mọi điều khoản có trích và trang', Object.values(lb.CLAUSES).every((c) => c.trich && c.trich.length > 10 && Number.isInteger(c.trang)));
check('văn bản: hiệu lực 15/09/2026, thay TT 14/2015 + 17/2021', lb.TT85.hieuLucTu === '2026-09-15' && lb.TT85.thay.join() === '14/2015/TT-BTC,17/2021/TT-BTC');

// ── trạng thái → ý nghĩa pháp lý ──
const st = (status, extra = {}) => lb.canCuPhapLy({ status, topHs: '85176200', description: 'điện thoại', precedentCount: 0, ...extra });
check('RESOLVED_BY_TABLE → XAC_DINH_THEO_DIEU_4, bước 6.1 không cần dùng', st('RESOLVED_BY_TABLE').trangThai === 'XAC_DINH_THEO_DIEU_4' && st('RESOLVED_BY_TABLE').cacBuoc[1].canDung === false);
check('REVIEW → CHUA_CHOT_CAN_XAC_NHAN, 6.1 cần dùng', st('REVIEW').trangThai === 'CHUA_CHOT_CAN_XAC_NHAN' && st('REVIEW').cacBuoc[1].canDung === true);
check('NEED_FACTS → THIEU_DU_KIEN; NEEDS_EXPERT/NO_CANDIDATES → CHUA_XAC_DINH_DUOC', st('NEED_FACTS').trangThai === 'THIEU_DU_KIEN' && st('NEEDS_EXPERT').trangThai === 'CHUA_XAC_DINH_DUOC' && st('NO_CANDIDATES').trangThai === 'CHUA_XAC_DINH_DUOC');
check('trạng thái lạ → CHUA_XAC_DINH_DUOC (an toàn)', st('???').trangThai === 'CHUA_XAC_DINH_DUOC' && st(undefined).trangThai === 'CHUA_XAC_DINH_DUOC');
check('hướng tiếp (Điều 6.3, 3.3, 3.1) chỉ khi chưa xác định / thiếu dữ kiện', !st('REVIEW').huongTiep && !st('RESOLVED_BY_TABLE').huongTiep
  && st('NEEDS_EXPERT').huongTiep?.flatMap((h) => h.canCu).join() === '6.3,3.3,3.1' && Boolean(st('NEED_FACTS').huongTiep));

// ── bước và nguồn ──
const r = st('REVIEW');
check('bước 1 trích Điều 4.1, 4.2.b/c/d', r.cacBuoc[0].canCu.join() === '4.1,4.2.b,4.2.c,4.2.d');
check('dieuKhoan: mỗi điều dẫn có đúng một lần, nguyên văn + trang + tham chiếu; mọi id trong bước đều có mặt', (() => {
  const ids = [...r.cacBuoc.flatMap((x) => x.canCu), ...r.luuYPhapLy.flatMap((x) => x.canCu), ...r.cacBuoc[1].taiLieu.map((t) => t.id)];
  return ids.every((id) => r.dieuKhoan[id]?.trich && r.dieuKhoan[id].tham_chieu && r.dieuKhoan[id].trang) && !JSON.stringify(r.cacBuoc).includes('Tuyển tập ý kiến phân loại của WCO');
})());
check('bước 1 trỏ girRulesApplied, không tự gắn nhãn GIR', !/GIR[\s-]*\d/.test(JSON.stringify(r.cacBuoc[0])));
check('bước 2 trích Điều 6.1 và 4 tài liệu a→d', r.cacBuoc[1].canCu[0] === '6.1' && r.cacBuoc[1].taiLieu.map((t) => t.id).join() === '6.1.a,6.1.b,6.1.c,6.1.d');
check('không khẳng định "thứ tự ưu tiên" mà luật không ghi', /không ghi rõ/.test(r.cacBuoc[1].cachLietKe) && !/ưu tiên pháp lý/.test(JSON.stringify(r)));
check('Điều 5.2 (thuế theo biểu tại thời điểm đăng ký tờ khai) luôn có trong lưu ý', r.luuYPhapLy.some((l) => l.canCu[0] === '5.2' && l.basis === 'RULE_TABLE'));
check('có disclaimer: không phải quyết định phân loại', /không phải quyết định phân loại/.test(r.disclaimer));

// ── 6.1.d: chỉ nói "không có" khi đã tra ──
const d = (p) => lb.canCuPhapLy({ status: 'REVIEW', topHs: '85176200', ...p }).cacBuoc[1].taiLieu[3];
check('6.1.d: chưa tra → CHUA_TRA_CUU_TRONG_LUOT_NAY (không khẳng định không có)', d({}).trangThai === 'CHUA_TRA_CUU_TRONG_LUOT_NAY');
check('6.1.d: đã tra, 0 khớp → KHONG_CO_TIEN_LE_KHOP', d({ precedentCount: 0 }).trangThai === 'KHONG_CO_TIEN_LE_KHOP');
check('6.1.d: có khớp → CO_TIEN_LE_KHOP + số tiền lệ', d({ precedentCount: 3 }).trangThai === 'CO_TIEN_LE_KHOP' && d({ precedentCount: 3 }).soTienLe === 3);

// ── 6.1.b: kho WCO riêng tư ──
const w = (hs) => lb.canCuPhapLy({ status: 'REVIEW', topHs: hs }).cacBuoc[1].taiLieu[1];
wcoOp.reset();
check('6.1.b: chưa nạp kho → CHUA_TRA_CUU (nói thật)', w('85176200').trangThai === 'CHUA_TRA_CUU');
fs.mkdirSync(dataPath('wco-op'), { recursive: true });
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, pages: [1, 1], text: 'SECRET invented wco text that must never be returned' },
]));
wcoOp.reset();
const wb = w('85176200');
check('6.1.b: có ý kiến → CO_Y_KIEN + số hiệu', wb.trangThai === 'CO_Y_KIEN' && wb.yKien.join() === '851762/4', wb);
check('6.1.b: KHÔNG rò nguyên văn WCO ra phản hồi', !JSON.stringify(lb.canCuPhapLy({ status: 'REVIEW', topHs: '85176200' })).includes('SECRET'));
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '380290/1', hs: '380290', level: 6, ord: 1, ordInferred: true, pages: [123, 124], text: 'invented' },
]));
wcoOp.reset();
const wi = w('38029000');
check('6.1.b: thứ tự suy ra → không giả làm số hiệu chính thức, dẫn theo trang PDF', wi.trangThai === 'CO_Y_KIEN' && wi.yKien[0] === '380290 (trang 123 bản PDF)' && /không phải số hiệu chính thức/.test(wi.ghiChu), wi);
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, pages: [1, 1], text: 'SECRET invented wco text that must never be returned' },
]));
wcoOp.reset();
check('6.1.b: mã không có ý kiến → KHONG_CO_Y_KIEN_CHO_MA_NAY', w('84713000').trangThai === 'KHONG_CO_Y_KIEN_CHO_MA_NAY');
check('6.1.b: chỉ có mã 4 số → không tra theo 6 số', w('8517').trangThai === 'KHONG_CO_Y_KIEN_CHO_MA_NAY');
fs.rmSync(dataPath('wco-op'), { recursive: true, force: true });
wcoOp.reset();

// ── Điều 8 (hàng tháo rời): nhận bằng từ khoá, ghi rõ HEURISTIC ──
const dis = lb.canCuPhapLy({ status: 'REVIEW', topHs: '84138100', description: 'Bơm nước ở dạng tháo rời (CKD), đóng gói theo bộ' });
const art8 = dis.luuYPhapLy.find((l) => l.canCu[0] === '8');
check('Điều 8: mô tả tháo rời → lưu ý HEURISTIC', Boolean(art8) && art8.basis === 'HEURISTIC');
check('Điều 8: mô tả thường → không có lưu ý này', !st('REVIEW', { description: 'Bơm nước ly tâm 1HP' }).luuYPhapLy.some((l) => l.canCu[0] === '8'));

// ── Một cửa: không nơi nào khác tự trích "Điều N … 85/2026" ──
const strays = [];
for (const dir of ['lib', 'api']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((x) => x.endsWith('.js') && x !== 'legal-basis.js')) {
    const lines = fs.readFileSync(path.join(ROOT, dir, f), 'utf8').split('\n');
    lines.forEach((l, i) => { if (/Điều\s+\d+[^\n]{0,60}85\/2026|85\/2026[^\n]{0,60}Điều\s+\d+/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) strays.push(`${dir}/${f}:${i + 1}`); });
  }
}
check('không tệp nào ngoài legal-basis.js tự gắn "Điều N … 85/2026" trong mã (chú thích thì được)', strays.length === 0, strays);

// ── Có mặt trong phản hồi /api/suggest (AI giả) ──
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  if (!/suggestions/.test(system)) return { json: { headings: ['8428'] }, model: 'mock' };
  const cands = JSON.parse(user).candidates.map((c) => c.hsCode);
  const pick = cands.find((c) => c.startsWith('8428')) || cands[0];
  return { json: { suggestions: [{ hsCode: pick, confidence: 70, reasoning: 'thang máy' }] }, model: 'mock' };
};
const handler = require('../api/suggest.js');
const call = async (body) => {
  const res = { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/suggest', query: {}, headers: { authorization: 'Bearer test-token' }, body }, res);
  return res._j;
};
const s1 = await call({ description: 'thang máy lắp trong tòa nhà, động cơ điện' });
check('suggest: có canCuPhapLy khớp status', Boolean(s1.canCuPhapLy) && s1.canCuPhapLy.trangThai === lb.STATUS_MAP[s1.status], { status: s1.status, got: s1.canCuPhapLy?.trangThai });
check('suggest: canCuPhapLy.vanBan là TT 85/2026', s1.canCuPhapLy?.vanBan?.soHieu === '85/2026/TT-BTC');
check('suggest: 6.1.d đã tra TB-TCHQ (số khớp là số, không bỏ trống)', typeof s1.canCuPhapLy?.cacBuoc?.[1]?.taiLieu?.[3]?.trangThai === 'string' && s1.canCuPhapLy.cacBuoc[1].taiLieu[3].trangThai !== 'CHUA_TRA_CUU_TRONG_LUOT_NAY', s1.canCuPhapLy?.cacBuoc?.[1]?.taiLieu?.[3]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
