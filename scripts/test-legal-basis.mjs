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
const stRuntime = require('../lib/so-tay-runtime.js');

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
process.env.HS_WCO_OP_FILE = path.join(dataPath('wco-op'), 'khong-ton-tai.json'); // không phụ thuộc kho thật (có thể có trên máy chạy test)
wcoOp.reset();
// Sổ tay giả trong thư mục tạm (không phụ thuộc sổ tay thật): mã 8517.62 có 1 ý kiến, mã 0101.21 không có sổ tay.
fs.mkdirSync(dataPath('so-tay'), { recursive: true });
fs.writeFileSync(dataPath('so-tay', '8517.json'), JSON.stringify({ nhom: '8517', yKienWcoDayDu: false, yKienWco: [
  { hs: '851762', thuTuTrongMa: 4, namThongQua: 2014, moTa: 'Thiết bị mẫu → mã 8517.62', nguon: 'wco-op.851762.4', doTinCay: 'CHAC', daSoatAnh: false, dauVet: '0123456789abcdef' },
] }));
stRuntime.reset();
check('6.1.b: chưa nạp kho, mã KHÔNG có sổ tay → CHUA_TRA_CUU (nói thật)', w('01012100').trangThai === 'CHUA_TRA_CUU');
{
  const sb = w('85176200');
  check('6.1.b: chưa nạp kho nhưng sổ tay có → CO_Y_KIEN, nguonTraCuu=SO_TAY, chỉ con trỏ, ghi rõ danh sách có thể chưa đủ',
    sb.trangThai === 'CO_Y_KIEN' && sb.nguonTraCuu === 'SO_TAY' && sb.yKien.length === 1 && sb.yKien[0].thuTuTrongMa === 4 && sb.yKien[0].doTinCay === 'CHAC' && !('moTa' in sb.yKien[0]) && /chưa đủ/.test(sb.ghiChu), sb);
}
fs.mkdirSync(dataPath('wco-op'), { recursive: true });
process.env.HS_WCO_OP_FILE = dataPath('wco-op', 'opinions.json');
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, adoption: 2014, text: 'SECRET invented wco text that must never be returned' },
]));
wcoOp.reset();
const wb = w('85176200');
check('6.1.b: có ý kiến → CO_Y_KIEN + con trỏ (mã, vị trí, năm), không nguyên văn', wb.trangThai === 'CO_Y_KIEN' && wb.yKien.length === 1 && wb.yKien[0].doTinCay === 'CHAC' && wb.yKien[0].hs6 === '851762' && wb.yKien[0].thuTuTrongMa === 4 && wb.yKien[0].namThongQua === 2014 && /khớp số thứ tự in/.test(wb.ghiChu) && /có thể chưa đủ/.test(wb.ghiChu) && !/không phải số hiệu chính thức/.test(wb.ghiChu), wb);
check('6.1.b: KHÔNG rò nguyên văn WCO ra phản hồi', !JSON.stringify(lb.canCuPhapLy({ status: 'REVIEW', topHs: '85176200' })).includes('SECRET'));
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, adoption: 2014, text: 'x' },
  { id: '844230/13', hs: '844230', level: 6, ord: 13, adoption: 2015, headingSuspect: true, text: 'invented opinion filed under a wrong code' },
]));
wcoOp.reset();
const wsus = lb.canCuPhapLy({ status: 'REVIEW', topHs: '84423000' }).cacBuoc[1].taiLieu[1];
check('6.1.b: ý kiến gán sai mã KHÔNG bị trích; kho chưa đủ → CHUA_TRA_CUU_DAY_DU (không nói "không có")', wsus.trangThai === 'CHUA_TRA_CUU_DAY_DU' && !wsus.yKien, wsus);
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '846719/1', hs: '846719', level: 6, ord: 1, adoption: 2014, headingInferred: true, headingBasis: 'LLM_AGREED', text: 'x' },
  { id: '846610/1', hs: '846610', level: 6, ord: 1, adoption: 2015, text: 'y' },
]));
wcoOp.reset();
const winf = lb.canCuPhapLy({ status: 'REVIEW', topHs: '84671900' }).cacBuoc[1].taiLieu[1];
check('6.1.b: ý kiến mã SUY LUẬN ghi doTinCay=SUY_LUAN, mã đọc từ tiêu đề ghi CHAC', winf.yKien[0].doTinCay === 'SUY_LUAN' && lb.canCuPhapLy({ status: 'REVIEW', topHs: '84661000' }).cacBuoc[1].taiLieu[1].yKien[0].doTinCay === 'CHAC', winf);
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, adoption: 2014, text: 'x' },
  { id: '844230/13', hs: '844230', level: 6, ord: 13, adoption: 2015, headingSuspect: true, text: 'invented opinion filed under a wrong code' },
]));
wcoOp.reset();
check('6.1.b: mã có ý kiến đáng tin vẫn được trích khi kho chưa đủ', w('85176200').trangThai === 'CO_Y_KIEN');
fs.writeFileSync(dataPath('wco-op', 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, adoption: 2014, text: 'SECRET invented wco text that must never be returned' },
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

// ── TT 121/2025/TT-BTC: chỉ tiêu tờ khai (mẫu số 01/02 Phụ lục II TT 38/2015) — job L0d ──
import { execFileSync } from 'node:child_process';
const FIX121 = path.join(ROOT, 'tests', 'fixtures', 'legal', 'tt121-2025-cong-bao-60-trich.txt');
const FIX85 = path.join(ROOT, 'tests', 'fixtures', 'legal', 'tt85-2026-cong-bao-409.txt');
const chay = (args) => { try { return { code: 0, out: execFileSync('node', [path.join(ROOT, 'scripts', 'check-legal-basis.mjs'), ...args], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status || 1, out: String(e.stdout || '') }; } };
check('TT121: văn bản có số hiệu, hiệu lực 01/02/2026, Công báo 60, sửa TT 38/2015 + 39/2018',
  lb.TT121?.soHieu === '121/2025/TT-BTC' && lb.TT121.hieuLucTu === '2026-02-01' && lb.TT121.ngayBanHanh === '2025-12-18' && /Công báo số 60 ngày 27-01-2026/.test(lb.TT121.congBao)
  && lb.TT121.sua?.join() === '38/2015/TT-BTC,39/2018/TT-BTC' && lb.TT121.sha256Pdf === 'a210244bdded36cc9d5ca7b7b7f00c0d53f3623c2dda75b3ee5fbf4462a92ead', lb.TT121);
const KHOA121 = ['1.78.1', '1.78.luuY.tenHang', '1.78.3', '1.68.8', '1.68.luuY.100kyTu', '1.68.luuY.hys', '1.68.luuY.ngan', '2.69.1', '2.69.2', '2.69.3'];
check('CHI_TIEU_TT121: đủ khoá tối thiểu, mỗi mục có mẫu 01/02, chỉ tiêu, tên chỉ tiêu, trang, trích',
  Boolean(lb.CHI_TIEU_TT121) && KHOA121.every((k) => { const m = lb.CHI_TIEU_TT121[k]; return m && ['01', '02'].includes(m.mau) && k.startsWith(`${m.chiTieu}.`) && m.tenChiTieu && Number.isInteger(m.trang) && m.trich?.length > 10; }),
  KHOA121.filter((k) => !lb.CHI_TIEU_TT121?.[k]));
let c178 = null;
try { c178 = lb.citeChiTieu('1.78.1'); } catch { /* chưa cài */ }
check('citeChiTieu(1.78.1): mẫu 01, vanBan TT 121, vanBanGoc TT 38, tham_chieu chỉ tiêu 1.78 điểm (1) Phụ lục II',
  c178?.mau === '01' && c178.vanBan === '121/2025/TT-BTC' && c178.vanBanGoc === '38/2015/TT-BTC' && c178.chiTieu === '1.78' && c178.diem === '1'
  && c178.tham_chieu === 'Chỉ tiêu 1.78 điểm (1) mẫu số 01 Phụ lục II Thông tư 38/2015/TT-BTC (sửa đổi bởi TT 39/2018/TT-BTC, TT 121/2025/TT-BTC)'
  && c178.trang === 143 && c178.trich === lb.CHI_TIEU_TT121['1.78.1'].trich, c178);
check('citeChiTieu(2.69.2): mẫu 02 (tờ khai xuất), quy tắc "#&mã nước xuất xứ"', (() => { try { const c = lb.citeChiTieu('2.69.2'); return c.mau === '02' && /mẫu số 02/.test(c.tham_chieu) && c.trich.includes('mô tả hàng hóa#&mã nước xuất xứ'); } catch { return false; } })());
check('citeChiTieu: mục "Lưu ý" ghi rõ là phần Lưu ý, không gán điểm', (() => { try { const c = lb.citeChiTieu('1.78.luuY.tenHang'); return !('diem' in c) && /Lưu ý/.test(c.tham_chieu); } catch { return false; } })());
check('citeChiTieu: chỉ tiêu lạ → ném lỗi', (() => { try { lb.citeChiTieu('9.9.9'); return false; } catch { return typeof lb.citeChiTieu === 'function'; } })());
check('cite(6.1) của TT 85 giữ nguyên shape cũ (bằng sâu)', JSON.stringify(lb.cite('6.1')) === JSON.stringify({ id: '6.1', vanBan: '85/2026/TT-BTC', dieu: '6', khoan: '1', tham_chieu: 'Điều 6 khoản 1 85/2026/TT-BTC', trang: 4, trich: 'nhưng chưa xác định được mã số duy nhất theo Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam thì sử dụng các tài liệu sau' }), lb.cite('6.1'));
check('1.78 KHÔNG gắn giới hạn 200 ký tự (đó là giới hạn ô của hệ thống, không phải chữ TT 121)', !/200/.test(JSON.stringify(Object.entries(lb.CHI_TIEU_TT121 || {}).filter(([k]) => k.startsWith('1.78')))));
{
  const r121 = chay([`--van-ban=121/2025/TT-BTC`, `--text=${FIX121}`]);
  check('check-legal-basis --van-ban=121/2025/TT-BTC với trích Công báo 60 → exit 0, mọi chỉ tiêu "ok"', r121.code === 0 && KHOA121.every((k) => new RegExp(`^ok\\s+${k.replace(/\./g, '\\.')}$`, 'm').test(r121.out)), r121.out.slice(-600));
  const r85 = chay([`--text=${FIX85}`]);
  check('check-legal-basis không --van-ban (TT 85) với trích Công báo 409 → exit 0 như cũ', r85.code === 0 && /điều khoản khớp nguyên văn/.test(r85.out), r85.out.slice(-300));
  const sai = chay([`--van-ban=121/2025/TT-BTC`, `--text=${FIX85}`]);
  check('check-legal-basis TT 121 với văn bản khác (TT 85) → exit 1', sai.code === 1, sai.out.slice(-200));
  const la = chay([`--van-ban=1/2000/TT-BTC`, `--text=${FIX121}`]);
  check('check-legal-basis văn bản không có trong sổ → exit 2', la.code === 2);
}
{
  const src = fs.readFileSync(FIX121, 'utf8');
  const ok = typeof lb.kiemNguyenVan === 'function' ? lb.kiemNguyenVan(lb.CHI_TIEU_TT121, src, { cheDo: 'NGUYEN_VAN' }) : null;
  check('kiemNguyenVan (chế độ nguyên văn): bộ thật khớp hết', ok && ok.every((x) => x.ok), ok?.filter((x) => !x.ok));
  const banSao = JSON.parse(JSON.stringify(lb.CHI_TIEU_TT121 || {}));
  if (banSao['1.78.1']) banSao['1.78.1'].trich = banSao['1.78.1'].trich.replace('công dụng quy cách đóng gói', 'công dụng, quy cách đóng gói');
  const hong = typeof lb.kiemNguyenVan === 'function' ? lb.kiemNguyenVan(banSao, src, { cheDo: 'NGUYEN_VAN' }) : null;
  check('ca âm: sửa một dấu phẩy trong bản sao trích 1.78.1 → checker bắt (khác chữ 2.69 "công dụng, quy cách")', hong && hong.find((x) => x.id === '1.78.1')?.ok === false && hong.filter((x) => !x.ok).length === 1, hong?.filter((x) => !x.ok));
  const tenSai = typeof lb.kiemNguyenVan === 'function' ? lb.kiemNguyenVan({ ten: { trich: lb.TT121.ten } }, src, { cheDo: 'NGUYEN_VAN' }) : null;
  check('tên TT 121 khớp nguyên văn trích yếu', tenSai?.[0]?.ok === true);
}

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

// ── Chuỗi căn cứ trả ra phản hồi: không còn "TT 39/2018 … mục 1.78 Phụ lục I" gõ tay (sai phụ lục) — job L0d ──
{
  const stray178 = [];
  for (const dir of ['lib', 'api']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((x) => x.endsWith('.js') && x !== 'legal-basis.js')) {
      fs.readFileSync(path.join(ROOT, dir, f), 'utf8').split('\n').forEach((l, i) => { if (/1\.78 Phụ lục I\b/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) stray178.push(`${dir}/${f}:${i + 1}`); });
    }
  }
  check('không tệp lib/api nào gõ tay "1.78 Phụ lục I" trong mã', stray178.length === 0, stray178);
  const { validateDeclaration } = require('../lib/declaration-validator.js');
  const v = validateDeclaration({ tenHang: 'Nồi chiên không dầu', congDung: 'gia dụng', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, tinhTrang: 'Mới 100%' }, { hsCode: '85166090' });
  check('validateDeclaration.legalReferences: chỉ tiêu 1.78 qua citeChiTieu, không còn "Phụ lục I"',
    Array.isArray(v.legalReferences) && v.legalReferences.includes(c178?.tham_chieu) && !v.legalReferences.some((x) => /Phụ lục I\b/.test(x)), v.legalReferences);
  globalThis.fetch = async () => { throw new Error('test: không được gọi mạng'); };
  const { runDeclarationCheck } = require('../lib/declaration-check.js');
  const kq = await runDeclarationCheck({ dongHang: [{ stt: 1, maHs: '85166090', moTa: 'Nồi chiên không dầu 5L, 1500W, dùng điện, gia dụng', xuatXu: 'CN', donViTinh: 'chiếc', soLuong: 100 }] });
  const j = JSON.stringify(kq);
  check('runDeclarationCheck: không chuỗi nào chứa "TT 39/2018/TT-BTC mục 1.78 Phụ lục I"; nguồn K1 trỏ chỉ tiêu 1.78 qua citeChiTieu',
    !j.includes('TT 39/2018/TT-BTC mục 1.78 Phụ lục I') && Boolean(c178) && j.includes(c178.tham_chieu), j.match(/"phienBan":"[^"]*"/g)?.slice(0, 2));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
