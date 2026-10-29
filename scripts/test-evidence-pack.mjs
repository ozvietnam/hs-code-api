#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Gói căn cứ theo mặt hàng — `buildEvidencePack` (lib/evidence-pack.js) + `POST /api/evidence-pack` (#337, job H1).
 *
 * Bất biến được khoá ở đây:
 *  - Mọi phần của gói LUÔN có mặt và mang nhãn `trangThai`; thiếu dữ liệu → CHUA_TRA_CUU, không có tiền lệ →
 *    KHONG_CO_TIEN_LE_KHOP. Không bao giờ có mảng rỗng im lặng ("thiếu" bị hiểu thành "không có").
 *  - Chú giải là NGUYÊN VĂN (so khớp từng ký tự với data/chu-giai-*.json); ý kiến WCO kèm `banQuyen` + `xemToanVan`.
 *  - GIR chỉ đến từ lib/gir.js (spy), điều khoản TT 85/2026 chỉ đến từ lib/legal-basis.js.
 *  - Endpoint KÍN: không token → 401; không nằm trong allowlist công khai.
 *  - Bộ ca tổng hợp tests/fixtures/soat/ca-tong-hop.json: ≥ 30 ca công khai, gói của mọi ca không có phần thiếu nhãn.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1; else failed += 1;
};

process.env.HS_API_TOKEN = 'test-token';
delete process.env.HS_SERVICE_TOKENS;

// ── Spy lib/gir.js TRƯỚC khi nạp evidence-pack: mọi mục gir[] phải là đầu ra thật của determineGir ──
const gir = require('../lib/gir.js');
const girOrig = gir.determineGir;
const girOutputs = [];
let girCalls = 0;
gir.determineGir = (input) => {
  girCalls += 1;
  const r = girOrig(input);
  girOutputs.push(...r.determinations.map((d) => JSON.stringify(d)));
  return r;
};

const lb = require('../lib/legal-basis.js');
const wco = require('../lib/wco-op.js');
const { buildEvidencePack, SECTIONS } = require('../lib/evidence-pack.js');
const CG_NHOM = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chu-giai-heading.json'), 'utf8'));
const CG_CHUONG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chu-giai-chuong.json'), 'utf8'));
const TAX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
const BASIS = new Set(Object.values(gir.BASIS));

/** Mọi phần của gói: object (không phải mảng), có trangThai là chuỗi; có `items` thì không rỗng. */
function sectionProblems(goi) {
  const bad = [];
  for (const k of SECTIONS) {
    const s = goi[k];
    if (!s || typeof s !== 'object' || Array.isArray(s)) { bad.push(`${k}: không phải object`); continue; }
    if (typeof s.trangThai !== 'string' || !s.trangThai) bad.push(`${k}: thiếu trangThai`);
    if ('items' in s && (!Array.isArray(s.items) || s.items.length === 0)) bad.push(`${k}: items rỗng im lặng`);
    if (/^CHUA_TRA_CUU/.test(s.trangThai) && !String(s.ghiChu || '').trim()) bad.push(`${k}: CHUA_TRA_CUU thiếu ghiChu`);
  }
  return bad;
}
const one = (input) => buildEvidencePack(input).goiCanCu[0];

// ═══ 1. Mã có chú giải + ý kiến WCO → chú giải NGUYÊN VĂN, yKienWco kèm banQuyen ═══
const xeNang = one({ maHs: ['84271000'], moTa: 'Xe nâng người 22m, động cơ điện, tự hành dạng cần gập' });
check('gói đủ mọi phần, phần nào cũng có nhãn trạng thái', sectionProblems(xeNang).length === 0, sectionProblems(xeNang));
check('SECTIONS gồm đúng các phần của spec', ['viTri', 'chuGiai', 'loaiKhac', 'gir', 'canCuPhapLy', 'yKienWco', 'tienLe', 'capDeNham', 'thue'].every((k) => SECTIONS.includes(k)), SECTIONS);
const cg = xeNang.chuGiai;
const cgNhom = cg.items?.find((x) => x.cap === 'NHOM');
const cgChuong = cg.items?.find((x) => x.cap === 'CHUONG');
check('chuGiai: có chú giải nhóm 8427 NGUYÊN VĂN (trùng từng ký tự data/chu-giai-heading.json)', cg.trangThai === 'CO_NOI_DUNG' && cgNhom?.ma === '8427' && cgNhom.nguyenVan === CG_NHOM['8427'].nhom, cgNhom && { ma: cgNhom.ma, len: cgNhom.nguyenVan?.length });
check('chuGiai: có chú giải chương 84 NGUYÊN VĂN', cgChuong?.nguyenVan === CG_CHUONG['84'].chuong);
check('chuGiai: mỗi mục ghi nguồn', cg.items.every((x) => String(x.nguon || '').trim()));
check('chuGiai: không lấy chữ AI chưa kiểm (explanatory-notes.json)', !cg.items.some((x) => /explanatory-notes|AI_CHUA_KIEM/.test(`${x.nguon} ${x.nguonLoai || ''}`)));
const yk = xeNang.yKienWco;
check('yKienWco: có ý kiến 8427.10/1, kèm banQuyen + xemToanVan', yk.trangThai === 'CO_Y_KIEN' && yk.items.some((x) => x.hs === '842710' && x.thuTuTrongMa === 1 && x.xemToanVan === '/api/wco-opinions?hs=842710&n=1') && yk.items.every((x) => x.banQuyen === wco.BAN_QUYEN), yk);
check('yKienWco: nguyên văn đi qua wco-op#view (có nguyenVanEn, nguon)', yk.items.every((x) => x.nguyenVanEn && /Compendium/.test(x.nguon)));
check('viTri: có đường dẫn trong cây và anh em', xeNang.viTri.trangThai === 'CO_DU_LIEU' && Array.isArray(xeNang.viTri.duongDan) && xeNang.viTri.duongDan.length > 0 && Array.isArray(xeNang.viTri.anhEm));
check('thue: shape /api/tax (camelCase, có hsCode + acfta)', xeNang.thue.trangThai === 'CO_DU_LIEU' && xeNang.thue.hsCode === '84271000' && 'acfta' in xeNang.thue, Object.keys(xeNang.thue));
check('mã không phải "Loại khác" → loaiKhac có nhãn KHONG_PHAI_DONG_LOAI_KHAC', xeNang.loaiKhac.trangThai === 'KHONG_PHAI_DONG_LOAI_KHAC');

// ═══ 2. Mã "Loại khác" → loaiKhac với anh em có tên ═══
const noiChien = one({ maHs: ['85166090'], moTa: 'Nồi chiên không dầu 5L, 1500W' });
const lk = noiChien.loaiKhac;
check('mã "Loại khác" → loaiKhac LA_DONG_LOAI_KHAC, anh em có tên (85166010 Nồi nấu cơm)', lk.trangThai === 'LA_DONG_LOAI_KHAC' && Array.isArray(lk.anhEmCoTen) && lk.anhEmCoTen.some((x) => x.hs === '85166010' && x.tenVi), lk);
check('loaiKhac: anh em nào cũng có tên', lk.anhEmCoTen.length > 0 && lk.anhEmCoTen.every((x) => String(x.tenVi || '').trim()));
{
  // Đợt 0A: "Loại khác" nhiều tầng — gói căn cứ phải mang đủ phạm vi phủ định (không chỉ anh em cùng cha).
  const lk3 = one({ maHs: ['39269099'], moTa: 'Móc treo bằng nhựa' }).loaiKhac;
  check('39269099: loaiKhac có truTheoTang 2 tầng (3926909, 392690) + anhEmCoTen gồm cả 39269010 tầng 6 số', lk3.trangThai === 'LA_DONG_LOAI_KHAC' && lk3.truTheoTang?.map((g) => g.nut).join() === '3926909,392690' && lk3.anhEmCoTen.some((x) => x.hs === '39269010' && x.tang === '392690'), lk3.truTheoTang);
}

// ═══ 3. Không có tiền lệ → KHONG_CO_TIEN_LE_KHOP; thiếu dữ liệu → CHUA_TRA_CUU; không mảng rỗng im lặng ═══
const ngua = one({ maHs: ['01012100'], moTa: 'Ngựa thuần chủng để nhân giống' });
check('không có tiền lệ → tienLe { trangThai: KHONG_CO_TIEN_LE_KHOP } kèm ghiChu, không mảng rỗng', !Array.isArray(ngua.tienLe) && ngua.tienLe.trangThai === 'KHONG_CO_TIEN_LE_KHOP' && !('items' in ngua.tienLe) && String(ngua.tienLe.ghiChu || '').length > 0, ngua.tienLe);
const nangDiesel = one({ maHs: ['84272000'], moTa: 'Xe nâng người làm việc trên cao dạng cần ống lồng tự hành, động cơ diesel' });
check('có tiền lệ → CO_TIEN_LE_KHOP, có 2039/TCHQ-TXNK kèm nguồn + nhãn xác minh', nangDiesel.tienLe.trangThai === 'CO_TIEN_LE_KHOP' && nangDiesel.tienLe.items.some((x) => x.soHieu === '2039/TCHQ-TXNK' && x.nguon && x.xacMinhNguon), nangDiesel.tienLe);
const tlItem = nangDiesel.tienLe.items[0];
check('tiền lệ: camelCase (soHieu, tenHang, maKetLuan, loaiNguon, khop)', ['soHieu', 'tenHang', 'maKetLuan', 'loaiNguon', 'khop'].every((k) => k in tlItem), Object.keys(tlItem));

const la = one({ maHs: ['99999999'], moTa: 'Mã không có trong biểu' });
check('mã không có trong biểu → các phần theo mã đều CHUA_TRA_CUU kèm ghiChu', ['viTri', 'thue', 'loaiKhac', 'chuGiai', 'tienLe', 'yKienWco', 'capDeNham'].every((k) => la[k].trangThai === 'CHUA_TRA_CUU' && la[k].ghiChu), Object.fromEntries(Object.entries(la).map(([k, v]) => [k, v?.trangThai])));
check('mã không có trong biểu: vẫn đủ nhãn mọi phần', sectionProblems(la).length === 0, sectionProblems(la));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-wco-'));
process.env.HS_WCO_OP_FILE = path.join(tmp, 'khong-co.json'); wco.reset();
const khongKho = one({ maHs: ['84271000'], moTa: 'Xe nâng người chạy điện' });
check('kho ý kiến WCO chưa nạp → yKienWco CHUA_TRA_CUU kèm ghiChu (không kết luận "không có ý kiến")', khongKho.yKienWco.trangThai === 'CHUA_TRA_CUU' && /chưa/.test(khongKho.yKienWco.ghiChu), khongKho.yKienWco);
delete process.env.HS_WCO_OP_FILE; wco.reset();
fs.rmSync(tmp, { recursive: true, force: true });

// ═══ 4. GIR chỉ từ lib/gir.js, basis thuộc 4 giá trị ═══
girCalls = 0; girOutputs.length = 0;
const ckd = one({ maHs: ['84271000'], moTa: 'Bộ linh kiện CKD xe nâng người chạy điện, chưa lắp ráp', thongSo: 'kèm hộp đựng chuyên dùng' });
check('gir: lib/gir.js#determineGir được gọi', girCalls > 0);
check('gir: có trích dẫn (2a từ "chưa lắp ráp/CKD")', ckd.gir.trangThai === 'CO_TRICH_DAN' && ckd.gir.items.some((d) => d.ruleKey === '2a'), ckd.gir);
check('gir: mọi mục có basis thuộc 4 giá trị + evidence + source', ckd.gir.items.every((d) => BASIS.has(d.basis) && 'evidence' in d && d.source));
check('gir: mọi mục là đầu ra NGUYÊN VẸN của lib/gir.js (spy)', ckd.gir.items.every((d) => girOutputs.includes(JSON.stringify(d))));
check('gir: kèm disclaimer của lib/gir.js', ckd.gir.disclaimer === gir.DISCLAIMER_VI);
const plain = one({ maHs: ['01012100'], moTa: 'Ngựa thuần chủng để nhân giống' });
check('gir không có trích dẫn → nhãn KHONG_CO_TRICH_DAN kèm ghiChu, không mảng rỗng', plain.gir.trangThai === 'KHONG_CO_TRICH_DAN' && !('items' in plain.gir) && plain.gir.ghiChu, plain.gir);
const src = fs.readFileSync(path.join(ROOT, 'lib', 'evidence-pack.js'), 'utf8');
check('lib/evidence-pack.js không tự gắn nhãn GIR-* hay "Điều N … 85/2026"', !/['"`]GIR[- ]?\d/.test(src) && !/Điều\s+\d+[^\n]{0,60}85\/2026/.test(src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')));

// ═══ 5. TT 85/2026: 3 khoản mới, kiểm nguyên văn với bản trích PDF Công báo 409 ═══
const c92b = (() => { try { return lb.cite('9.2.b'); } catch (e) { return { err: e.message }; } })();
const c101d = (() => { try { return lb.cite('10.1.d'); } catch (e) { return { err: e.message }; } })();
const c91 = (() => { try { return lb.cite('9.1'); } catch (e) { return { err: e.message }; } })();
check("cite('9.2.b') chạy: Điều 9 khoản 2 điểm b", c92b.dieu === '9' && c92b.khoan === '2' && c92b.diem === 'b' && Number.isInteger(c92b.trang) && c92b.trich?.length > 10, c92b);
check("cite('10.1.d') chạy: Điều 10 khoản 1 điểm d", c101d.dieu === '10' && c101d.khoan === '1' && c101d.diem === 'd' && Number.isInteger(c101d.trang), c101d);
check("cite('9.1') chạy: Điều 9 khoản 1", c91.dieu === '9' && c91.khoan === '1' && !c91.diem, c91);
const textFile = path.join(ROOT, 'tests', 'fixtures', 'legal', 'tt85-2026-cong-bao-409.txt');
let out = ''; let code = 0;
try { out = execFileSync('node', [path.join(ROOT, 'scripts', 'check-legal-basis.mjs'), `--text=${textFile}`], { encoding: 'utf8' }); } catch (e) { out = String(e.stdout || ''); code = e.status || 1; }
check('check-legal-basis.mjs --text=<trích PDF Công báo 409> xanh', code === 0, out.split('\n').filter((l) => /FAIL|khớp/.test(l)));
check('check-legal-basis: 3 khoản mới đều "ok"', ['9.1', '9.2.b', '10.1.d'].every((id) => new RegExp(`^ok\\s+${id.replace(/\./g, '\\.')}$`, 'm').test(out)), out.slice(-300));
check('canCuPhapLy: đi từ lib/legal-basis.js (vanBan 85/2026/TT-BTC, có trangThai)', xeNang.canCuPhapLy.vanBan?.soHieu === lb.TT85.soHieu && typeof xeNang.canCuPhapLy.trangThai === 'string');
const hoSo = ckd.canCuPhapLy.hoSo;
check('canCuPhapLy.hoSo: hàng tháo rời → dẫn 9.1 + 9.2.b; luôn có 10.1.d (tài liệu kỹ thuật)', hoSo && ['9.1', '9.2.b', '10.1.d'].every((id) => hoSo.dieuKhoan?.[id]?.trich === lb.cite(id).trich), hoSo);
const hoSoThuong = xeNang.canCuPhapLy.hoSo;
check('canCuPhapLy.hoSo: hàng thường → không dẫn Điều 9, vẫn có 10.1.d', hoSoThuong && !hoSoThuong.dieuKhoan['9.1'] && !hoSoThuong.dieuKhoan['9.2.b'] && hoSoThuong.dieuKhoan['10.1.d'], hoSoThuong);
check('tienLe được báo cho canCuPhapLy (6.1.d đã tra trong lượt này)', ngua.canCuPhapLy.cacBuoc[1].taiLieu.find((t) => t.id === '6.1.d').trangThai === 'KHONG_CO_TIEN_LE_KHOP' && nangDiesel.canCuPhapLy.cacBuoc[1].taiLieu.find((t) => t.id === '6.1.d').trangThai === 'CO_TIEN_LE_KHOP');

// ═══ 6. Hai mã: hai gói + so sánh cặp; cặp dễ nhầm theo bảng ═══
const cap = buildEvidencePack({ maHs: ['85076090', '85044090'], moTa: 'Sạc dự phòng pin lithium 20000mAh' });
check('2 mã → 2 gói, đúng thứ tự', cap.goiCanCu.length === 2 && cap.goiCanCu[0].maHs === '85076090' && cap.goiCanCu[1].maHs === '85044090');
check('capDeNham: mã trong bảng dễ nhầm → có tiêu chí phân biệt từ conflict-resolver', cap.goiCanCu[0].capDeNham.trangThai === 'CO_CAP_DE_NHAM' && cap.goiCanCu[0].capDeNham.confusedWith.includes('85044090') && Array.isArray(cap.goiCanCu[0].capDeNham.tieuChiPhanBiet) && cap.goiCanCu[0].capDeNham.tieuChiPhanBiet.length > 0, cap.goiCanCu[0].capDeNham);
check('soSanhCap: hai mã nằm trong cùng cặp dễ nhầm', cap.soSanhCap?.trongBangDeNham === true && cap.soSanhCap.cungNhom4 === false);
check('mã không trong bảng dễ nhầm → KHONG_CO_TRONG_BANG kèm ghiChu', ngua.capDeNham.trangThai === 'KHONG_CO_TRONG_BANG' && ngua.capDeNham.ghiChu);
check('một mã → không có soSanhCap', !('soSanhCap' in buildEvidencePack({ maHs: ['01012100'], moTa: 'Ngựa giống' })));
check('gói ghi phiên bản biểu thuế + không dùng LLM', cap.khongDungLlm === true && 'phienBanBieuThue' in cap && cap.phienBanGoiCanCu);

// ═══ 7. Endpoint: KÍN, POST, hợp đồng .strict() phía Cổng ═══
const handler = require('../api/dataset.js');
const call = async ({ method = 'POST', body, headers = {} } = {}) => {
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[k]; }, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method, url: '/api/evidence-pack', query: { resource: 'evidence_pack' }, headers, body }, res);
  return res;
};
const auth = { authorization: 'Bearer test-token' };
const ok = { maHs: ['84271000'], moTa: 'Xe nâng người 22m, động cơ điện' };
check('không token → 401', (await call({ body: ok }))._s === 401);
check('token sai → 401', (await call({ body: ok, headers: { authorization: 'Bearer sai' } }))._s === 401);
const r200 = await call({ body: ok, headers: auth });
check('có token → 200, gói camelCase', r200._s === 200 && r200._j.goiCanCu?.[0]?.maHs === '84271000' && sectionProblems(r200._j.goiCanCu[0]).length === 0, r200._j && Object.keys(r200._j));
check('body dạng chuỗi JSON vẫn nhận', (await call({ body: JSON.stringify(ok), headers: auth }))._s === 200);
check('GET → 405 (chỉ POST)', (await call({ method: 'GET', headers: auth }))._s === 405);
const bad = async (body) => (await call({ body, headers: auth }));
const r400 = await bad({ ...ok, tenDoanhNghiep: 'X' });
check('trường lạ → 400 (hợp đồng .strict())', r400._s === 400 && /tenDoanhNghiep/.test(JSON.stringify(r400._j)), r400._j);
check('maHs rỗng / 3 mã → 400', (await bad({ ...ok, maHs: [] }))._s === 400 && (await bad({ ...ok, maHs: ['84271000', '84272000', '84289090'] }))._s === 400);
check('maHs không đủ 8 số → 400', (await bad({ ...ok, maHs: ['8427'] }))._s === 400 && (await bad({ ...ok, maHs: ['8427.10.00'] }))._s === 400 && (await bad({ ...ok, maHs: [84271000] }))._s === 400);
check('moTa rỗng / quá 2000 ký tự → 400', (await bad({ ...ok, moTa: '   ' }))._s === 400 && (await bad({ ...ok, moTa: 'x'.repeat(2001) }))._s === 400);
check('thongSo sai kiểu / quá 2000 ký tự → 400', (await bad({ ...ok, thongSo: 5 }))._s === 400 && (await bad({ ...ok, thongSo: 'x'.repeat(2001) }))._s === 400);
check('body không phải object → 400', (await bad('khong-phai-json'))._s === 400 && (await bad([ok]))._s === 400);
const { isPublicRead, PUBLIC_DATASET_RESOURCES } = require('../lib/public-access.js');
check('evidence_pack KHÔNG nằm trong allowlist công khai', !PUBLIC_DATASET_RESOURCES.has('evidence_pack') && !isPublicRead({ endpoint: 'dataset', resource: 'evidence_pack', method: 'POST' }) && !isPublicRead({ endpoint: 'dataset', resource: 'evidence_pack', method: 'GET' }));
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes.json'), 'utf8'));
check('routes.json: /api/evidence-pack → /api/dataset?resource=evidence_pack', routes.rewrites.some((r) => r.source === '/api/evidence-pack' && r.destination === '/api/dataset?resource=evidence_pack'));

// ═══ 8. Bộ ca tổng hợp: ≥ 30 ca công khai, gói của mọi ca không thiếu nhãn ═══
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'soat', 'ca-tong-hop.json'), 'utf8'));
const ca = fixture.ca || [];
check('ca-tong-hop.json: ≥ 30 ca', ca.length >= 30, ca.length);
check('mọi ca có { moTa, maDung (8 số, có trong biểu), nguon }', ca.every((c) => String(c.moTa || '').trim() && /^\d{8}$/.test(c.maDung) && TAX[c.maDung] && String(c.nguon || '').trim()), ca.filter((c) => !TAX[c.maDung]).map((c) => c.maDung));
check('id ca không trùng', new Set(ca.map((c) => c.id)).size === ca.length);
const loai = new Set(ca.map((c) => c.loaiNguon));
check('đủ 4 loại nguồn: TB-TCHQ, ý kiến WCO, ACFTA (-CN), ca CEO qua Cổng', ['TB_TCHQ', 'WCO_OP', 'ACFTA_TRU_CN', 'CA_CEO_CONG'].every((x) => loai.has(x)), [...loai]);
const ceo = ca.filter((c) => c.loaiNguon === 'CA_CEO_CONG').map((c) => c.moTa.toLowerCase()).join(' | ');
check('có 3 ca CEO đã thử: xe nâng người 22 m, glovebox MBraun, nồi chiên không dầu', /xe nâng người 22\s?m/.test(ceo) && /glovebox/.test(ceo) && /mbraun/.test(ceo) && /nồi chiên không dầu/.test(ceo));
check('ca ACFTA đúng là dòng "(-…CN)" trong biểu', ca.filter((c) => c.loaiNguon === 'ACFTA_TRU_CN').every((c) => /\(-[^)]*CN/.test(String(TAX[c.maDung].acfta || ''))));
check('không dùng dữ liệu khách (không nhắc oz-export / tờ khai Oz)', !/oz-export|oz-gold|oz_precedent/i.test(JSON.stringify(fixture)));
const thieuNhan = [];
for (const c of ca) {
  const goi = buildEvidencePack({ maHs: [c.maDung], moTa: c.moTa, ...(c.thongSo ? { thongSo: c.thongSo } : {}) }).goiCanCu[0];
  const p = sectionProblems(goi);
  if (p.length) thieuNhan.push({ id: c.id, p });
}
check(`gói căn cứ của ${ca.length} ca tổng hợp: không phần nào thiếu nhãn trạng thái`, thieuNhan.length === 0, thieuNhan);
const tbCa = ca.filter((c) => c.loaiNguon === 'TB_TCHQ');
const tbCo = tbCa.filter((c) => one({ maHs: [c.maDung], moTa: c.moTa }).tienLe.trangThai === 'CO_TIEN_LE_KHOP');
check('ca TB-TCHQ: gói tìm thấy tiền lệ của chính mã đó', tbCo.length === tbCa.length, tbCa.filter((c) => !tbCo.includes(c)).map((c) => c.id));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
