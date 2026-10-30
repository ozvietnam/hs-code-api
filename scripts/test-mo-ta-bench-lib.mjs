#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * L1-2b — hàm chấm bench lát 1 (scripts/mo-ta-bench-lib.mjs) + chế độ bench lát 1 (scripts/bench-mo-ta.mjs --lat=1).
 * Plan ozplugin docs/superpowers/plans/2026-10-29-ho-so-phan-loai.md "Job L1-2b"; spec §10 (a)–(d).
 *
 * Không gọi LLM thật, không gọi mạng; dữ liệu Oz chỉ ở dạng bản ghi GIẢ (không đọc oz-gold trong test).
 *   - chiSoMoTa: giá trị trong mô tả không có trong hoSo.duKien ⇒ "truy được nguồn" < 100 %
 *   - trichDanSai: girRulesApplied không đi qua gir.js (thiếu basis…) ⇒ 1; căn cứ pháp lý lạ / trích bị sửa ⇒ sai
 *   - locGiuRiengLat1: chỉ giữ mã lát 1 ∩ tập giữ riêng (lib/holdout.js) ∩ tờ khai nhập ∩ mã còn trong biểu
 *   - gopCa543Lat1: ca #543 thuộc lát 1 chưa gộp vào bộ đề lát 1 (không đếm hai lần ca đã gộp)
 *   - cv755-am.json: đúng 6 ví dụ CV 755 (không bịa thêm), chép nguyên văn trang wiki, bậc nguồn B, XK ngoài phạm vi lát 1
 *   - chấm ca âm (soát phải báo, sinh phải từ chối) + báo oan LOI
 *   - ghi chi tiết riêng tư từ chối chỗ không bị gitignore
 *   - CLI: --mode=sinh|soat --bo-de=data/bench/ho-so-lat-1.json --lat=1 (mock) in đủ hàng §10
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  ROOT, chiSoMoTa, truyNguon, trichDanSai, docLat1Pn6, locGiuRiengLat1, gopCa543Lat1, docCaAm, kiemCaAm,
  kiemCaAmVoiWiki, chamAmSoat, chamAmSinh, baoOanLoi, ghiRiengTu,
} from './mo-ta-bench-lib.mjs';

const require = createRequire(import.meta.url);
let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 1500))); };

// ── 1. Giá trị truy được nguồn ───────────────────────────────────────────────────────────────────────────────────
const hoSo = {
  hang: { tenVi: 'Cáp sạc điện thoại' },
  duKien: [
    { fact: 'chatLieuVo', giaTri: 'vỏ nhựa PVC', nguon: 'KHACH', trangThai: 'DA_CO' },
    { fact: 'dienAp', giaTri: '30V', nguon: 'KHACH', trangThai: 'DA_CO' },
    { fact: 'tinhTrang', giaTri: 'mới 100%', nguon: 'KHACH', trangThai: 'DA_CO' },
    { fact: 'congDung', giaTri: 'sạc pin', nguon: 'AI_CHUA_KIEM', trangThai: 'DA_CO' },
    { fact: 'model', giaTri: 'X1', nguon: 'KHACH', trangThai: 'CHUA_BIET' },
  ],
  nhanDien: { model: 'TC1000N' },
};
const du = chiSoMoTa('Cáp sạc điện thoại, vỏ nhựa PVC, 30V, model TC1000N, mới 100%', '85', { hoSo });
check('1a chiSoMoTa + hoSo: mọi đoạn có nguồn ⇒ truyNguon 100 %', du.truyNguon.apDung && du.truyNguon.tiLe === 1 && du.truyNguon.khongNguon.length === 0, du.truyNguon);
const la = chiSoMoTa('Cáp sạc điện thoại, vỏ nhựa PVC, lõi đồng 4 lõi, 30V, mới 100%', '85', { hoSo });
check('1b giá trị không có trong hoSo.duKien ("lõi đồng 4 lõi") ⇒ truyNguon < 100 %', la.truyNguon.tiLe < 1 && la.truyNguon.khongNguon.includes('lõi đồng 4 lõi'), la.truyNguon);
const ai = truyNguon('Cáp sạc điện thoại, sạc pin, mới 100%', hoSo);
check('1c giá trị nguồn AI_CHUA_KIEM không tính là truy được nguồn', ai.tiLe < 1 && ai.khongNguon.includes('sạc pin'), ai);
const cb = truyNguon('Cáp sạc điện thoại, model X1', hoSo);
check('1d giá trị trangThai CHUA_BIET không tính là truy được nguồn', cb.khongNguon.includes('model X1'), cb);
const kh = chiSoMoTa('Cáp sạc, mới 100%', '85');
check('1e không có hoSo (đường cũ) ⇒ truyNguon.apDung = false, khoá cũ của chiSoMoTa giữ nguyên', kh.truyNguon.apDung === false && typeof kh.le200 === 'boolean' && Array.isArray(kh.chuCam), kh);

// ── 2. Trích dẫn sai ──────────────────────────────────────────────────────────────────────────────────────────────
const gir = require('../lib/gir.js');
const lb = require('../lib/legal-basis.js');
const that = gir.determineGir({ description: 'bộ linh kiện tháo rời của quạt điện', candidates: [{ hsCode: '84145110', confidence: 0.9 }], pickedHs: '84145110' }).determinations;
check('2a fixture: gir.js trả ít nhất một trích dẫn', that.length >= 1, that);
check('2b girRulesApplied sinh từ gir.js ⇒ 0 trích sai', trichDanSai({ girRulesApplied: that }).sai === 0, trichDanSai({ girRulesApplied: that }));
const thieuBasis = { ...that[0] }; delete thieuBasis.basis;
const r2 = trichDanSai({ girRulesApplied: [thieuBasis] });
check('2c girRulesApplied thiếu basis (không qua gir.js) ⇒ trích sai = 1', r2.sai === 1 && r2.tong === 1, r2);
const r2d = trichDanSai({ girRulesApplied: [{ ...that[0], textVi: 'GIR 1 nói hàng này thuộc chương 85' }] });
check('2d GIR có chữ quy tắc bị sửa ⇒ trích sai', r2d.sai === 1, r2d);
const ccThat = lb.canCuPhapLy({ status: 'CONFIRMED', topHs: '85444299', description: 'cáp', precedentCount: 1, girDeterminations: 1 });
const r2e = trichDanSai({ canCuPhapLy: ccThat });
check('2e canCuPhapLy từ legal-basis.js ⇒ 0 trích sai (có đếm căn cứ)', r2e.sai === 0 && r2e.tong > 0, r2e);
const r2f = trichDanSai({ canCuPhapLy: { cacBuoc: [{ canCu: ['4.1', '99.9'] }] } });
check('2f căn cứ điều/khoản không có trong legal-basis ⇒ trích sai', r2f.sai === 1, r2f);
const r2g = trichDanSai({ hoSo: { canCu: { canCuPhapLy: [{ ...lb.citeChiTieu('1.78.1'), trich: 'người khai ghi gì cũng được' }] } } });
check('2g chỉ tiêu TT 121 có câu trích bị sửa (trong hoSo.canCu) ⇒ trích sai', r2g.sai === 1, r2g);
check('2h chỉ tiêu TT 121 nguyên văn từ citeChiTieu ⇒ 0 trích sai', trichDanSai({ hoSo: { canCu: { canCuPhapLy: [lb.citeChiTieu('1.78.1')] } } }).sai === 0);
check('2i phản hồi không có trích dẫn ⇒ 0/0', (() => { const r = trichDanSai({ customsDescription: 'x' }); return r.sai === 0 && r.tong === 0; })());

// ── 3. Tập giữ riêng lát 1 ────────────────────────────────────────────────────────────────────────────────────────
const { isHeldOut } = require('../lib/holdout.js');
const { laToKhaiNhap } = require('../lib/ho-so/lat-1.js');
/** Tìm tên hàng giả sao cho bản ghi thuộc / không thuộc tập giữ riêng (băm tất định). */
function tenGia(hsCode, muonGiu, goc) { for (let i = 0; i < 5000; i++) { const t = `${goc} ${i}`; if (isHeldOut({ hsCode, tenHang: t }) === muonGiu) return t; } throw new Error('không tìm được tên giả'); }
const taxGia = { 85444299: { mfn: '10' }, 85444294: { mfn: '17' }, 94019999: { mfn: '20' } };
const pn6Gia = new Set(['854442']);
const g = (hsCode, giu, extra = {}) => ({ hsCode, tenHang: tenGia(hsCode, giu, `hàng giả ${hsCode}`), sampleDesc: 'câu giả', origin: 'CN', ...extra });
const goldGia = [
  g('85444299', true), // giữ
  g('85444294', true, { origin: 'UN' }), // giữ
  g('85444299', false), // không thuộc tập giữ riêng
  g('94019999', true), // ngoài lát 1
  g('85444299', true, { origin: 'VN' }), // tờ khai xuất
  g('85444291', true), // mã không còn trong biểu
  { ...g('85444299', true), sampleDesc: '' }, // không có câu chuẩn
];
const giu = locGiuRiengLat1(goldGia, { pn6: pn6Gia, taxData: taxGia, isHeldOut, laToKhaiNhap });
check('3a locGiuRiengLat1 chỉ giữ mã lát 1 ∩ isHeldOut ∩ tờ khai nhập ∩ mã còn trong biểu ∩ có câu chuẩn', giu.length === 2 && giu.every((x) => x.hsCode.startsWith('854442') && isHeldOut(x) && x.origin !== 'VN'), giu.map((x) => [x.hsCode, x.origin]));
const ds = docLat1Pn6();
check('3b docLat1Pn6 đọc đủ 50 phân nhóm của data/ho-so/lat-1.json', ds.size === 50 && ds.has('392690') && ds.has('854442'), ds.size);

// ── 4. Gộp ca #543 thuộc lát 1 ────────────────────────────────────────────────────────────────────────────────────
const lat1Gia = { lat: 1, ca: [{ id: 'L1-854442-09', pn6: '854442', maHs: '85444299', gopTu: { tep: 'data/bench/mo-ta-bo-de.json', id: 'BD-1' } }] };
const b543Gia = { ca: [{ id: 'BD-1', maHs: '85444299', chuong: '85' }, { id: 'BD-2', maHs: '85444294', chuong: '85' }, { id: 'BD-3', maHs: '94019999', chuong: '94' }] };
const gop = gopCa543Lat1(lat1Gia, b543Gia, pn6Gia);
check('4a gopCa543Lat1: chỉ ca #543 thuộc lát 1 CHƯA gộp (BD-2), gắn lat=1 + pn6', gop.length === 1 && gop[0].id === 'BD-2' && gop[0].lat === 1 && gop[0].pn6 === '854442', gop);
const thatLat1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bench', 'ho-so-lat-1.json'), 'utf8'));
const that543 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bench', 'mo-ta-bo-de.json'), 'utf8'));
check('4b bộ đề lát 1 thật đã gộp đủ ca #543 thuộc lát 1 (không còn ca nào chờ gộp)', gopCa543Lat1(thatLat1, that543, ds).length === 0, gopCa543Lat1(thatLat1, that543, ds).map((c) => c.id));
const daGop = thatLat1.ca.filter((c) => c.gopTu?.tep === 'data/bench/mo-ta-bo-de.json').map((c) => c.gopTu.id).sort();
check('4c 4 ca #543 (BD-73-04, BD-85-01, BD-85-08, BD-96-03) mang gopTu trỏ về bộ đề #543', JSON.stringify(daGop) === JSON.stringify(['BD-73-04', 'BD-85-01', 'BD-85-08', 'BD-96-03']), daGop);
check('4d ca gộp không trỏ nguồn sổ tay (kể cả nguonCa.tep) — bộ đề lát 1 độc lập với data/so-tay/', !JSON.stringify(thatLat1.ca.filter((c) => c.gopTu)).includes('data/so-tay/'));

// ── 5. Ca âm CV 755 ───────────────────────────────────────────────────────────────────────────────────────────────
const am = docCaAm();
const kq = kiemCaAm(am);
check('5a data/bench/cv755-am.json hợp lệ (kiemCaAm không lỗi)', kq.loi.length === 0, kq.loi);
check('5b đúng 6 ví dụ của CV 755 — NK-1..3, XK-1..3, không bịa thêm', JSON.stringify(am.ca.map((c) => c.id)) === JSON.stringify(['CV755-NK-1', 'CV755-NK-2', 'CV755-NK-3', 'CV755-XK-1', 'CV755-XK-2', 'CV755-XK-3']), am.ca.map((c) => c.id));
check('5c mọi ca mang bậc nguồn B + nguồn là trang wiki CV 755', am.ca.every((c) => c.bacNguon === 'B' && c.nguon.tep === 'oz-wiki:wiki/sources/755-tchq-gsql-2020.md'));
check('5d ca tờ khai xuất ngoài phạm vi lát 1; ca nhập có maHsChay (mã chạy máy, không phải đáp án)', am.ca.filter((c) => c.loaiToKhai === 'XUAT').every((c) => c.ngoaiPhamViLat1 === true && !c.maHsChay) && am.ca.filter((c) => c.loaiToKhai === 'NHAP').every((c) => c.maHsChay?.khongPhaiDapAn === true && /^\d{8}$/.test(c.maHsChay.ma)));
const amHong = JSON.parse(JSON.stringify(am));
amHong.ca[0].moTaSoSai = amHong.ca[0].moTaSoSai + ' loại tốt';
amHong.ca[1].nguon.trich = '';
delete amHong.ca[2].maHsChay;
amHong.ca.push({ id: 'CV755-NK-4', loaiToKhai: 'NHAP', moTaSoSai: 'giày thể thao', viSaoKhongDat: 'giống CV 755', bacNguon: 'B', nguon: { tep: 'oz-wiki:wiki/sources/755-tchq-gsql-2020.md', trich: 'giày thể thao' } });
amHong.ca[3].maHsChay = { ma: '12345678', khongPhaiDapAn: true };
const kqHong = kiemCaAm(amHong);
const coLoi = (re) => kqHong.loi.some((l) => re.test(l));
check('5e kiemCaAm bắt: moTaSoSai không nằm trong câu trích', coLoi(/CV755-NK-1.*moTaSoSai/), kqHong.loi);
check('5f kiemCaAm bắt: thiếu trích', coLoi(/CV755-NK-2.*trich/), kqHong.loi);
check('5g kiemCaAm bắt: ca nhập thiếu maHsChay', coLoi(/CV755-NK-3.*maHsChay/), kqHong.loi);
check('5h kiemCaAm bắt: ca ngoài danh sách 6 ví dụ (không bịa thêm "giống CV 755")', coLoi(/CV755-NK-4/), kqHong.loi);
check('5i kiemCaAm bắt: ca xuất có maHsChay / mã không có trong biểu', coLoi(/CV755-XK-1/), kqHong.loi);
const wikiCands = [process.env.OZ_WIKI_DIR, path.resolve(ROOT, '..', 'oz-wiki-plhq'), '/home/user/oz-wiki-plhq'].filter(Boolean).map((d) => path.join(d, 'wiki', 'sources', '755-tchq-gsql-2020.md'));
const wikiP = wikiCands.find((p) => fs.existsSync(p));
if (wikiP) {
  const r = kiemCaAmVoiWiki(am, fs.readFileSync(wikiP, 'utf8'));
  check('5j mọi moTaSoSai + trich có NGUYÊN VĂN trong trang wiki CV 755', r.loi.length === 0, r.loi);
  check('5k kiemCaAmVoiWiki bắt ví dụ bị sửa chữ', kiemCaAmVoiWiki(amHong, fs.readFileSync(wikiP, 'utf8')).loi.some((l) => /CV755-NK-1/.test(l)));
} else console.log('SKIP 5j/5k — không thấy trang wiki CV 755 (đặt OZ_WIKI_DIR để đối chiếu nguyên văn)');

// ── 6. Chấm ca âm + báo oan LOI ───────────────────────────────────────────────────────────────────────────────────
const k = (nhom, trangThai, ma = 'X') => ({ nhom, trangThai, ma });
check('6a chamAmSoat: có CANH_BAO K1 ⇒ bắt', chamAmSoat([k('K1', 'CANH_BAO'), k('K3', 'DAT')]).bat === true);
check('6b chamAmSoat: chỉ DAT/CHUA_KIEM hoặc cờ ngoài K1/K2 ⇒ không bắt', chamAmSoat([k('K1', 'DAT'), k('K3', 'LOI'), k('K2', 'CHUA_KIEM')]).bat === false);
check('6c chamAmSoat: K2 tất định gọi thẳng (K2det) cũng tính', chamAmSoat([], ['K2det:LOAI_KHAC_KHOP_ANH_EM']).bat === true);
check('6d chamAmSinh: hồ sơ trả THIEU_DU_KIEN ⇒ từ chối đúng', chamAmSinh({ hoSo: { ketLuan: { trangThai: 'THIEU_DU_KIEN' } }, moTaEcus: null }).tuChoi === true);
check('6e chamAmSinh: hồ sơ DU_CAN_CU + moTaEcus ⇒ KHÔNG từ chối (tô hồng)', chamAmSinh({ hoSo: { ketLuan: { trangThai: 'DU_CAN_CU' } }, moTaEcus: 'x' }).tuChoi === false);
check('6f chamAmSinh: đường cũ — compliance WEAK/REJECT hoặc không qua audit ⇒ từ chối', chamAmSinh({ compliance: { level: 'REJECT', passesCustomsAudit: false } }).tuChoi === true && chamAmSinh({ compliance: { level: 'GOOD', passesCustomsAudit: false } }).tuChoi === true);
check('6g chamAmSinh: đường cũ — compliance GOOD và qua audit ⇒ KHÔNG từ chối', chamAmSinh({ compliance: { level: 'GOOD', passesCustomsAudit: true } }).tuChoi === false);
const oan = baoOanLoi([{ loai: 'chuan', kiem: [k('K1', 'LOI')] }, { loai: 'chuan', kiem: [k('K2', 'CANH_BAO')] }, { loai: 'chuan', kiem: [] }, { loai: 'bo_du_kien', kiem: [k('K1', 'LOI')] }]);
check('6h baoOanLoi: chỉ đếm LOI (K1/K2) trên ca chuẩn', oan.n === 3 && oan.loi === 1, oan);

// ── 7. Ghi riêng tư ───────────────────────────────────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-lat1-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* bỏ qua */ } });
const ghi = ghiRiengTu(ROOT, path.join(tmp, 'x.jsonl'), [{ a: 1 }]);
check('7a ghiRiengTu từ chối chỗ không bị gitignore (không tạo tệp)', ghi === null && !fs.existsSync(path.join(tmp, 'x.jsonl')));

// ── 8. CLI bench lát 1 (mock, không mạng) ─────────────────────────────────────────────────────────────────────────
const env = { ...process.env, HS_LLM_PRIVATE_ALL: '', OPENROUTER_API_KEY: '', MINIMAX_API_KEY: '', DEEPSEEK_API_KEY: '', GEMINI_API_KEY: '', GEMINI_FREE_KEYS: '' };
const chay = (mode) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'bench-mo-ta.mjs'), `--mode=${mode}`, '--bo-de=data/bench/ho-so-lat-1.json', '--lat=1', '--n=6', `--out=${tmp}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 240000 });
const HANG_10 = ['Dữ kiện quyết định có mặt', 'Chữ cấm', '"xuất xứ" trong chuỗi', 'Giá trị truy được nguồn', 'Trích dẫn sai', 'Ca âm CV 755', 'Soát bắt MÂU THUẪN', 'Soát chỉ đúng THIẾU', 'Báo oan LOI trên ca chuẩn', 'Dựng hồ sơ tất định'];
const s = chay('sinh');
check('8a sinh --lat=1 chạy xong (exit 0)', s.status === 0, (s.stderr || '') + (s.stdout || '').slice(-800));
check('8b sinh --lat=1 in bảng §10 đủ hàng', HANG_10.every((h) => s.stdout.includes(h)), HANG_10.filter((h) => !s.stdout.includes(h)));
check('8c sinh --lat=1 chấm 3 ca âm tờ khai nhập, 3 ca xuất ngoài phạm vi', /Ca âm CV 755[^\n]*\b\d+\/3\b/.test(s.stdout) && /ngoài phạm vi lát 1: 3/.test(s.stdout), s.stdout.split('\n').filter((l) => /CV 755|phạm vi/.test(l)));
const so = chay('soat');
check('8d soát --lat=1 chạy xong (exit 0)', so.status === 0, (so.stderr || '') + (so.stdout || '').slice(-800));
check('8e soát --lat=1 in bảng §10 đủ hàng + ca âm', HANG_10.every((h) => so.stdout.includes(h)) && /Ca âm CV 755[^\n]*\b\d+\/3\b/.test(so.stdout), HANG_10.filter((h) => !so.stdout.includes(h)));
check('8f chi tiết không ghi ra chỗ không gitignore', /TỪ CHỐI GHI/.test(s.stderr + so.stderr) && fs.readdirSync(tmp).length === 0);

console.log(`\ntest-mo-ta-bench-lib: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
