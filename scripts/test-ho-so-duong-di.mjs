// scripts/test-ho-so-duong-di.mjs — `dungDuongDi`: đường đi pháp lý TẤT ĐỊNH của hồ sơ phân loại (plan L1-5a; spec hồ sơ
// §8.1 duongDiPhapLy/loaiTru/kiemHoa/canCu, §8.3 bước 1, §8.10, §11).
// Chạy trên dữ liệu THẬT (sổ tay đã áp ranh giới CLAUDE_DUYET, cây HS, bảng hiệu chỉnh tiền lệ) + vài sổ tay/bảng TIÊM để
// chứng minh quan hệ nhân quả. Không đọc data/bench/*, data/oz-export/*. Không gọi LLM, không gọi mạng.
import './test-isolate-data.mjs';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Spy lib/gir.js TRƯỚC khi nạp động cơ: mọi girRulesApplied[] phải là đúng mục do gir.determineGir trả.
const gir = require('../lib/gir.js');
const girTra = [];
const goc = gir.determineGir;
gir.determineGir = (...a) => { const r = goc(...a); girTra.push(...r.determinations); return r; };
// L1-5b (quyết định 1): đường đi sổ tay dùng gir.girTuDuongDi — vẫn là lib/gir.js, spy cả hàm này.
const gocDd = gir.girTuDuongDi;
gir.girTuDuongDi = (...a) => { const r = gocDd(...a); girTra.push(...r.determinations); return r; };

const T = require('../lib/hs-tree.js');
const S = require('../lib/so-tay.js');
const H = require('../lib/ho-so/hieu-chinh.js');
const LB = require('../lib/legal-basis.js');
const TV = require('../lib/tu-vung.js');
const { loadSoTay } = require('../lib/so-tay-gates.js');
const D = require('../lib/ho-so/duong-di.js');
const HS = require('../lib/ho-so/index.js');
const L = HS.LY_DO_CHUA_CHOT;

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 600)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const NHAN_DUYET = new Set(['CLAUDE_DUYET', 'NGUOI_DUYET']);
const nguonCua = (h4) => ({ ...S.sourcesFor(h4), ...S.nguonTieuDe(h4) });
const coLoiMa = (fn, ma) => { try { fn(); return false; } catch (e) { return e && e.code === ma; } };

// ── 1. Hình dạng ─────────────────────────────────────────────────────────────────────────────────────────────────
const r1 = D.dungDuongDi('84135040', 'NHAP');
check('hình dạng: đủ khoá', ['duongDiPhapLy', 'loaiTru', 'kiemHoa', 'canCu', 'phienBan', 'capDaChac'].every((k) => k in r1), Object.keys(r1));
check('phienBan ho-so@1 + bieuThue/soTay/tuVung/dongCo', r1.phienBan.hoSo === 'ho-so@1' && r1.phienBan.bieuThue && r1.phienBan.soTay && r1.phienBan.tuVung && r1.phienBan.dongCo, r1.phienBan);
check('canCu có girRulesApplied[] + canCuPhapLy', Array.isArray(r1.canCu.girRulesApplied) && r1.canCu.canCuPhapLy && r1.canCu.canCuPhapLy.vanBan, r1.canCu);
check('cap ∈ {4,6,8} cho mọi mục đường đi', r1.duongDiPhapLy.every((e) => [4, 6, 8].includes(e.cap)), r1.duongDiPhapLy.map((e) => e.cap));

// ── 2. Mã lát 1 có ranh giới số: mục cap 8 có dieuKien + trích nguyên văn (máy kiểm lại ở đây) ──────────────────────────
{
  const e = r1.duongDiPhapLy.find((x) => x.cap === 8 && x.nut === '84135040' && x.chieu === 'PHAI_CO' && x.dieuKien && x.dieuKien.op === '>');
  check('84135040: mục cap 8 có điều kiện số (luuLuong >)', e && e.dieuKien.fact === 'luuLuong', r1.duongDiPhapLy);
  const src = nguonCua('8413');
  check('84135040: trich có nguyên văn trong tệp nguồn', e && H.coNguyenVan(e.nguon.trich, src[e.nguon.ma] || ''), e && e.nguon);
  check('84135040: nguonLoai CLAUDE_DUYET', e && e.nguon.nguonLoai === 'CLAUDE_DUYET', e && e.nguon);
  check('84135040: chưa đối chiếu ⇒ ketQua null (doiChieu L1-5b gán)', e && e.ketQua === null, e);
  check('84135040: ranh giới đủ, anh em đã duyệt ⇒ capDaChac 8, chotDuoc', r1.capDaChac === 8 && r1.chotDuoc === true, { capDaChac: r1.capDaChac, chuaChot: r1.chuaChot });
}

// ── 3. Mọi mục trên 50 mã lát 1: trích nguyên văn; điều kiện chỉ từ mục CLAUDE_DUYET/NGUOI_DUYET ─────────────────────────
const lat1 = JSON.parse(fs.readFileSync('data/ho-so/lat-1.json', 'utf8')).phanNhom.map((p) => p.pn6);
check('lat-1.json có 50 phân nhóm', lat1.length === 50, lat1.length);
const laDau = (pn6) => T.tree().codes.find((c) => c.startsWith(pn6));
const ma50 = lat1.map(laDau).filter(Boolean);
check('mỗi phân nhóm lát 1 có một dòng 8 số để đo', ma50.length === 50, ma50.length);
{
  const loiTrich = []; const loiNhan = []; const loiChuaDuyet = [];
  for (const ma of ma50) {
    const r = D.dungDuongDi(ma, 'NHAP');
    const src = nguonCua(ma.slice(0, 4));
    const st = loadSoTay(ma.slice(0, 4));
    for (const e of r.duongDiPhapLy) {
      if (e.nguon && e.nguon.trich && !H.coNguyenVan(e.nguon.trich, src[e.nguon.ma] || '')) loiTrich.push(`${ma}:${e.nut}:${e.nguon.ma}`);
      if (e.dieuKien && !NHAN_DUYET.has(e.nguon && e.nguon.nguonLoai)) loiNhan.push(`${ma}:${e.nut}`);
      // mục sổ tay có dieuKienSo nhưng chưa duyệt ⇒ không vào đường đi: dieuKien null + CHUA_SO_HOA + lyDo chua-duyet
      const muc = st && ((st.dong8 || []).find((d) => nz(d.hs) === e.nut) || (st.dieuKienNut || []).find((d) => T.chuanMa(d.id) === e.nut));
      if (muc && Array.isArray(muc.dieuKienSo) && muc.dieuKienSo.length && !NHAN_DUYET.has(muc.nguonLoai)
        && !(e.dieuKien === null && e.ketQua === 'CHUA_SO_HOA' && e.lyDo === L.CHUA_DUYET)) loiChuaDuyet.push(`${ma}:${e.nut}`);
    }
  }
  check('50 mã lát 1: mọi trich có nguyên văn trong nguồn', !loiTrich.length, loiTrich);
  check('50 mã lát 1: mọi điều kiện từ mục CLAUDE_DUYET/NGUOI_DUYET', !loiNhan.length, loiNhan);
  check('50 mã lát 1: mục nháp/AI_DA_KIEM ⇒ dieuKien null, CHUA_SO_HOA, lyDo chua-duyet', !loiChuaDuyet.length, loiChuaDuyet);
  // Giá trị nhãn AI_CHUA_KIEM ở bất kỳ độ sâu nào (câu ghi chú của legal-basis nhắc tới nhãn này để phủ nhận thì không tính).
  const nhanAi = [];
  const duyet = (o, d) => { if (Array.isArray(o)) o.forEach((x, i) => duyet(x, `${d}[${i}]`)); else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => duyet(v, `${d}.${k}`)); else if (o === 'AI_CHUA_KIEM') nhanAi.push(d); };
  ma50.forEach((m) => duyet(D.dungDuongDi(m, 'NHAP'), m));
  check('50 mã lát 1: không giá trị nhãn AI_CHUA_KIEM nào trong kết quả', !nhanAi.length, nhanAi);
}

// ── 4. "Loại khác": PHAI_KHONG cho mọi mã của truDayDu có điểm trùng, KHÔNG cho anh em không trùng ─────────────────────
// Kỳ vọng tính độc lập từ loaiKhacOf().chuoi (cây theo chữ số): ở tầng mà con trên đường đi là "Loại khác" ⇒ mọi nút bị trừ
// (trừ tiêu đề "Loại khác" trần) phải là PHAI_KHONG; tầng mà con trên đường đi là nút CÓ TÊN ⇒ anh em không trùng (đã tách
// bằng điều kiện khẳng định của nút có tên) ⇒ không nút nào bị phủ định.
const laLK = (n) => (n.cap === 8 ? Boolean(n.loaiKhac) : /^lo[aạ]i kh[aá]c\b/i.test(String(n.tenVi || '').replace(/^[-\s–]+/, '')));
const laLKTranTieuDe = (n) => n.cap !== 8 && /^lo[aạ]i kh[aá]c\s*(\(SEN\))?\s*[:：]?\s*$/i.test(String(n.tenVi || '').replace(/^[-\s–]+/, '').trim());
for (const ma of ['85362019', '85362099', '85366999', '84135090', '85444299']) {
  const lk = T.loaiKhacOf(ma);
  const r = D.dungDuongDi(ma, 'NHAP');
  const pk = new Set(r.duongDiPhapLy.filter((e) => e.chieu === 'PHAI_KHONG').map((e) => e.nut));
  const thieu = []; const thua = [];
  lk.chuoi.forEach((tang, i) => {
    const con = T.nodeOf(i === 0 ? ma : lk.chuoi[i - 1].nut);
    if (con.cap !== 8 && !con.tenVi) return; // tiêu đề bị lược tên: luật đi ghi CHUA_SO_HOA, không suy
    for (const id of tang.tru) {
      const s = T.nodeOf(id);
      if (laLK(con)) { if (!laLKTranTieuDe(s) && !pk.has(id)) thieu.push(id); } else if (pk.has(id)) thua.push(id);
    }
  });
  check(`${ma}: PHAI_KHONG đủ mọi mã trùng của truDayDu`, !thieu.length, { thieu, pk: [...pk] });
  check(`${ma}: không PHAI_KHONG anh em không trùng`, !thua.length, thua);
  check(`${ma}: PHAI_KHONG ⊆ truDayDu`, [...pk].every((id) => lk.truDayDu.includes(id)), { pk: [...pk], tru: lk.truDayDu });
}
{
  const r = D.dungDuongDi('85362019', 'NHAP');
  const pk = r.duongDiPhapLy.filter((e) => e.chieu === 'PHAI_KHONG').map((e) => e.nut).sort();
  check('85362019: phủ định đúng .11/.12/.13, không phủ định .20 và 8536209', JSON.stringify(pk) === JSON.stringify(['85362011', '85362012', '85362013']), pk);
}

// ── 5. 8544.42.99 — bảng hiệu chỉnh tiền lệ ─────────────────────────────────────────────────────────────────────────────
{
  const r = D.dungDuongDi('85444299', 'NHAP');
  const e94 = r.duongDiPhapLy.find((e) => e.nut === '85444294');
  check('85444299 (thật): ranh giới .94 có hieuChinh', e94 && Array.isArray(e94.hieuChinh) && e94.hieuChinh.length > 0, e94);
  check('85444299 (thật): hieuChinh trỏ mục bảng 85444299↔85444294', e94 && e94.hieuChinh.every((h) => h.maHs === '85444299' && h.dongChuBieu === '85444294'), e94 && e94.hieuChinh);
  check('85444299 (thật): hieuChinh mang tbTchq + lyDo, không mục KHONG_LECH', e94 && e94.hieuChinh.every((h) => h.tbTchq && h.tbTchq.length && h.lyDo && h.loai !== 'KHONG_LECH'), e94 && e94.hieuChinh);
  const bang = H.taiBang();
  const lechTran = bang.muc.filter((m) => m.maHs === '85444299' && m.dongChuBieu === '85444294' && m.loai === 'LECH_CHUA_PHAN_XU' && !m.dieuKien);
  if (lechTran.length) check('85444299 (thật): còn LECH_CHUA_PHAN_XU không điều kiện ⇒ .94 CHUA_SO_HOA', e94.ketQua === 'CHUA_SO_HOA', e94);
  check('85444299 (thật): không chốt được ⇒ capDaChac 6', r.capDaChac === 6 && r.chotDuoc === false, r.chuaChot);
  check('39269099 (thật): mục KHONG_LECH không thành hieuChinh', JSON.stringify(D.dungDuongDi('39269099', 'NHAP')).indexOf('KHONG_LECH') < 0);

  // Nhân quả trên sổ tay TIÊM: ranh giới 854442 lấy từ bản nháp ĐÔNG CỨNG (fixture, bản tại fc5a538 — mọi dòng có
  // điều kiện), ép nhãn CLAUDE_DUYET (chỉ trong test). Không đọc bản nháp sống: bản nháp đổi theo L1-4 làm test vỡ oan.
  const st = clone(loadSoTay('8544'));
  const nhap = JSON.parse(fs.readFileSync('scripts/fixtures/ho-so/ranh-gioi-854442-fc5a538.json', 'utf8'));
  const dong = new Map(nhap.dong8.map((d) => [d.hs, d]));
  st.dong8 = st.dong8.map((d) => (dong.has(d.hs) ? { ...d, ...dong.get(d.hs), nguonLoai: 'CLAUDE_DUYET' } : d));
  st.dieuKienNut = [...(st.dieuKienNut || []).filter((n) => !nhap.dieuKienNut.some((x) => x.id === n.id)), ...nhap.dieuKienNut.map((n) => ({ ...n, nguonLoai: 'CLAUDE_DUYET' }))];
  const mucMau = bang.muc.find((m) => m.maHs === '85444299' && m.dongChuBieu === '85444294');
  const lech = { ...clone(mucMau), id: 'T-LECH', loai: 'LECH_CHUA_PHAN_XU', duyetBoi: null }; delete lech.dieuKien; delete lech.phanXu;
  const tienLe = { ...clone(bang.muc.find((m) => m.id === '854442-01') || mucMau), id: 'T-TL', loai: 'TIEN_LE_THAY_CHU_BIEU' };
  const rL = D.dungDuongDi('85444299', 'NHAP', { soTay: st, bangHieuChinh: { muc: [lech] } });
  const eL = rL.duongDiPhapLy.find((e) => e.nut === '85444294');
  check('8544.42.99 + LECH_CHUA_PHAN_XU ⇒ ranh giới .94 ketQua CHUA_SO_HOA', eL && eL.ketQua === 'CHUA_SO_HOA' && eL.lyDo === L.HIEU_CHINH_LECH, eL);
  check('8544.42.99 + LECH ⇒ dieuKien giữ nguyên (ghi cả hai, không tự chọn bên)', eL && eL.dieuKien && eL.hieuChinh[0].chuBieu && eL.hieuChinh[0].tbTchq, eL);
  check('8544.42.99 + LECH ⇒ không chốt, capDaChac 6', rL.capDaChac === 6 && rL.chotDuoc === false && rL.chuaChot.some((x) => x.startsWith(L.HIEU_CHINH_LECH)), rL.chuaChot);
  const rT = D.dungDuongDi('85444299', 'NHAP', { soTay: st, bangHieuChinh: { muc: [tienLe] } });
  const eT = rT.duongDiPhapLy.find((e) => e.nut === '85444294');
  check('8544.42.99 + TIEN_LE_THAY_CHU_BIEU ⇒ hieuChinh có, ranh giới không CHUA_SO_HOA', eT && eT.hieuChinh && eT.hieuChinh.length && eT.ketQua === null, eT);
  check('8544.42.99 ranh giới đủ + không LECH ⇒ capDaChac 8 (LECH là nguyên nhân hạ cấp)', rT.capDaChac === 8, rT.chuaChot);
  const rK = D.dungDuongDi('85444299', 'NHAP', { soTay: st, bangHieuChinh: { muc: [{ ...clone(mucMau), id: 'T-K', loai: 'KHONG_LECH' }] } });
  check('8544.42.99 + KHONG_LECH ⇒ không hieuChinh', !rK.duongDiPhapLy.some((e) => e.hieuChinh), rK.duongDiPhapLy.filter((e) => e.hieuChinh));
  const r94 = D.dungDuongDi('85444294', 'NHAP', { soTay: st, bangHieuChinh: { muc: [lech] } });
  const e94b = r94.duongDiPhapLy.find((e) => e.nut === '85444294' && e.chieu === 'PHAI_CO');
  check('phía chữ biểu (85444294) + LECH ⇒ PHAI_CO .94 CHUA_SO_HOA + hieuChinh', e94b && e94b.ketQua === 'CHUA_SO_HOA' && e94b.hieuChinh && e94b.hieuChinh.length, e94b);
}

// ── 6. Mã 4/6 số ───────────────────────────────────────────────────────────────────────────────────────────────────
{
  const r6 = D.dungDuongDi('853620', 'NHAP');
  check('mã 6 số ⇒ capDaChac 6', r6.capDaChac === 6, r6.capDaChac);
  check('mã 6 số ⇒ không mục cap 8', !r6.duongDiPhapLy.some((e) => e.cap === 8), r6.duongDiPhapLy);
  check('mã 6 số ⇒ liệt kê các dòng 8 số còn mở', Array.isArray(r6.dong8ConMo) && r6.dong8ConMo.includes('85362011'), r6.dong8ConMo);
  const r4 = D.dungDuongDi('8536', 'NHAP');
  check('mã 4 số ⇒ capDaChac 4', r4.capDaChac === 4, r4.capDaChac);
  check('mã 6 số dạng chấm 8536.20 ⇒ như 853620', D.dungDuongDi('8536.20', 'NHAP').capDaChac === 6);
}

// ── 7. Không bao giờ chốt khi điều kiện của ANH EM chưa biết (CHUA_SO_HOA) ─────────────────────────────────────────────
{
  const st = clone(loadSoTay('8413'));
  st.dieuKienNut = st.dieuKienNut.map((n) => (n.id === '8413503' ? { ...n, nguonLoai: 'AI_DA_KIEM' } : n));
  const r = D.dungDuongDi('84135040', 'NHAP', { soTay: st });
  const e = r.duongDiPhapLy.filter((x) => x.nut === '84135040');
  check('anh em chưa duyệt: đường đi riêng của 84135040 không có CHUA_SO_HOA', e.length && e.every((x) => x.ketQua === null), e);
  check('anh em chưa duyệt ⇒ không chốt (chotDuoc false, capDaChac 6)', r.chotDuoc === false && r.capDaChac === 6, { capDaChac: r.capDaChac, chuaChot: r.chuaChot });
  check('anh em chưa duyệt ⇒ chuaChot ghi anh-em-chua-so-hoa:8413503', r.chuaChot.includes(`${L.ANH_EM_CHUA_SO_HOA}:8413503`), r.chuaChot);
  const st2 = clone(loadSoTay('8413'));
  st2.dong8 = st2.dong8.map((d) => (d.hs === '84135031' ? { ...d, dieuKienSo: [] } : d));
  const r2 = D.dungDuongDi('84135032', 'NHAP', { soTay: st2 });
  check('anh em cùng tầng chưa số hoá (84135031) ⇒ 84135032 không chốt', r2.chotDuoc === false && r2.chuaChot.includes(`${L.ANH_EM_CHUA_SO_HOA}:84135031`), r2.chuaChot);
  const r3 = D.dungDuongDi('84135090', 'NHAP', { soTay: st });
  check('dòng Loại khác có anh em chưa duyệt ⇒ PHAI_KHONG CHUA_SO_HOA + không chốt', r3.duongDiPhapLy.some((x) => x.nut === '8413503' && x.ketQua === 'CHUA_SO_HOA') && r3.capDaChac === 6, r3.duongDiPhapLy);
}

// ── 8. CHONG_LAN_VAN_BAN ⇒ không bao giờ tự chọn, nêu cả hai ───────────────────────────────────────────────────────────
{
  const r = D.dungDuongDi('85362011', 'NHAP');
  check('85362011 chồng lấn văn bản với .20 ⇒ chongLanVanBan nêu .20', Array.isArray(r.chongLanVanBan) && r.chongLanVanBan.some((c) => c.voi === '85362020' && c.lyDo), r.chongLanVanBan);
  check('85362011 chồng lấn ⇒ không chốt, capDaChac 6', r.chotDuoc === false && r.capDaChac === 6 && r.chuaChot.includes(`${L.CHONG_LAN_VAN_BAN}:85362020`), r.chuaChot);
  const r20 = D.dungDuongDi('85362020', 'NHAP');
  check('85362020 nêu đủ bốn dòng chồng lấn', ['85362011', '85362012', '85362013', '85362019'].every((m) => r20.chongLanVanBan.some((c) => c.voi === m)), r20.chongLanVanBan);
}

// ── 9. GIR chỉ từ lib/gir.js; basis ∈ 4 giá trị ─────────────────────────────────────────────────────────────────────
{
  const BASIS = new Set(Object.values(gir.BASIS));
  const tatCa = ma50.flatMap((m) => D.dungDuongDi(m, 'NHAP').canCu.girRulesApplied);
  check('girRulesApplied có mục (mã 8 số: GIR 6 so cùng cấp)', tatCa.length > 0, tatCa.length);
  check('mọi girRulesApplied có basis ∈ RULE_TABLE|DETERMINISTIC|HEURISTIC|LLM_ASSERTED', tatCa.every((g) => BASIS.has(g.basis)), tatCa.map((g) => g.basis));
  const khoa = new Set(girTra.map((g) => JSON.stringify(g)));
  check('spy: mọi girRulesApplied là mục do lib/gir.js trả', tatCa.every((g) => khoa.has(JSON.stringify(g))));
  // L1-5b quyết định 1: GIR của đường đi sổ tay = GIR 1 (cấp nhóm) + GIR 6 (cấp phân nhóm/dòng), basis RULE_TABLE, bằng chứng
  // là câu trích NGUYÊN VĂN của ranh giới ĐÃ DUYỆT; không còn "ứng viên giả" của determineGir.
  check('GIR đường đi: chỉ GIR 1 / GIR 6, basis RULE_TABLE', tatCa.every((g) => ['1', '6'].includes(g.ruleKey) && g.basis === 'RULE_TABLE'), tatCa.map((g) => `${g.rule}:${g.basis}`));
  const loiBc = [];
  for (const m of ma50) {
    const r = D.dungDuongDi(m, 'NHAP');
    const src = nguonCua(m.slice(0, 4));
    for (const g of r.canCu.girRulesApplied) {
      const ds = (g.evidence && g.evidence.ranhGioi) || [];
      if (!ds.length) loiBc.push(`${m}:${g.rule}:rong`);
      for (const b of ds) {
        if (!NHAN_DUYET.has(b.nguonLoai) || !H.coNguyenVan(b.trich, src[b.ma] || '')) loiBc.push(`${m}:${b.nut}`);
        const e = r.duongDiPhapLy.find((x) => x.nut === b.nut && x.nguon && x.nguon.trich === b.trich);
        if (!e || e.ketQua === 'CHUA_SO_HOA' || (e.hieuChinh && e.hieuChinh.length)) loiBc.push(`${m}:${b.nut}:muc`);
        if ((g.ruleKey === '1') !== (b.cap === 4)) loiBc.push(`${m}:${b.nut}:cap`);
      }
    }
  }
  check('GIR đường đi: bằng chứng = trích nguyên văn của ranh giới đã duyệt, không từ mục CHUA_SO_HOA / có hiệu chỉnh', !loiBc.length, loiBc);
  check('GIR đường đi: không ranh giới đã duyệt ⇒ không GIR', D.dungDuongDi('85371019', 'NHAP').canCu.girRulesApplied.length === 0);
  const ngoai = ma50.map((m) => { const r = clone(D.dungDuongDi(m, 'NHAP')); delete r.canCu.girRulesApplied; delete r.canCu.girDisclaimer; return JSON.stringify(r); }).join('\n');
  check('không nhãn GIR nào ngoài canCu.girRulesApplied', !/GIR[\s-]*\d/.test(ngoai), (ngoai.match(/.{40}GIR[\s-]*\d.{40}/) || [''])[0]);
}

// ── 10. Căn cứ pháp lý chỉ qua lib/legal-basis.js ──────────────────────────────────────────────────────────────────
{
  const rN = D.dungDuongDi('84135040', 'NHAP');
  check('NHAP: chiTieuMoTa = citeChiTieu(1.78.1)', JSON.stringify(rN.canCu.canCuPhapLy.chiTieuMoTa) === JSON.stringify([LB.citeChiTieu('1.78.1')]), rN.canCu.canCuPhapLy.chiTieuMoTa);
  check('NHAP: dieuKhoan = cite() của legal-basis', Object.entries(rN.canCu.canCuPhapLy.dieuKhoan).every(([id, v]) => { const { id: _i, ...c } = LB.cite(id); return JSON.stringify(c) === JSON.stringify(v); }));
  check('NHAP: không cờ khuonChuaHoTro', rN.khuonChuaHoTro === undefined);
  const rX = D.dungDuongDi('84135040', 'XUAT');
  check('XUAT: khuonChuaHoTro 2.69', rX.khuonChuaHoTro === '2.69', rX.khuonChuaHoTro);
  check('XUAT: chiTieuMoTa = citeChiTieu(2.69.1)', JSON.stringify(rX.canCu.canCuPhapLy.chiTieuMoTa) === JSON.stringify([LB.citeChiTieu('2.69.1')]));
  check('mã 6 số: canCuPhapLy trạng thái THIEU_DU_KIEN', D.dungDuongDi('853620', 'NHAP').canCu.canCuPhapLy.trangThai === 'THIEU_DU_KIEN');
}

// ── 11. dieuKienVao của sổ tay KHÔNG thành dữ kiện bắt buộc ───────────────────────────────────────────────────────────
{
  const st = loadSoTay('8536');
  const factVao = new Set((st.dieuKienVao || []).map((d) => d.fact));
  const r = D.dungDuongDi('85366992', 'NHAP');
  check('85366992: không mục đường đi nào lấy từ dieuKienVao', factVao.size > 0 && !r.duongDiPhapLy.some((e) => e.dieuKien && factVao.has(e.dieuKien.fact)), [...factVao]);
}

// ── 12. loaiTru (nhóm cạnh tranh có điểm trùng) + kiemHoa ────────────────────────────────────────────────────────────
{
  const r = D.dungDuongDi('39269099', 'NHAP');
  const ma = r.loaiTru.map((x) => x.ma).sort();
  check('39269099: loaiTru từ conflicts.json (nhóm khác)', ['3923', '3924', '3925', '4016', '8487'].every((m) => ma.includes(m)), ma);
  check('39269099: loaiTru chưa đối chiếu ⇒ CHUA_LOAI, lyDoTrung có nguồn DA_KIEM', r.loaiTru.every((x) => x.ketQua === 'CHUA_LOAI' && x.lyDoTrung && x.lyDoTrung.nguon === 'conflicts.json'), r.loaiTru);
  check('loaiTru: nguon (nếu có) chỉ mục đã duyệt', r.loaiTru.every((x) => !x.nguon || NHAN_DUYET.has(x.nguon.nguonLoai)), r.loaiTru);
  const rA = D.dungDuongDi('85362011', 'NHAP', { maThayThe: ['85371019', '85362020'] });
  check('maThayThe khác nhóm ⇒ loaiTru 8537; cùng phân nhóm ⇒ không (đã ở đường đi)', rA.loaiTru.some((x) => x.ma === '8537' && x.lyDoTrung.nguon === 'ma-thay-the') && !rA.loaiTru.some((x) => x.ma.startsWith('853620')), rA.loaiTru);
  const kh = D.dungDuongDi('85366992', 'NHAP').kiemHoa.map((k) => k.fact);
  check('kiemHoa: kích thước + thông số số của đường đi (dongDien)', kh.includes('kichThuoc') && kh.includes('dongDien'), kh);
  check('kiemHoa: mọi khoá thuộc tu-vung@1', kh.every((f) => TV.layKhoa(f)), kh);
}

// ── 13. Đầu vào sai ───────────────────────────────────────────────────────────────────────────────────────────────
check('maHs 5 số ⇒ lỗi MA_KHONG_HOP_LE', coLoiMa(() => D.dungDuongDi('85362', 'NHAP'), 'MA_KHONG_HOP_LE'));
check('loaiToKhai lạ ⇒ lỗi LOAI_TO_KHAI_KHONG_HOP_LE', coLoiMa(() => D.dungDuongDi('85362011', 'TAM'), 'LOAI_TO_KHAI_KHONG_HOP_LE'));
check('mã 8 số không có trong biểu ⇒ lỗi MA_KHONG_CO_TRONG_BIEU', coLoiMa(() => D.dungDuongDi('99999999', 'NHAP'), 'MA_KHONG_CO_TRONG_BIEU'));

// ── 14. Bộ nhớ đệm + p95 < 50 ms (lần 2, đã đệm) trên 50 mã lát 1 ──────────────────────────────────────────────────
{
  const a = D.dungDuongDi('84135040', 'NHAP');
  a.duongDiPhapLy.length = 0; a.canCu.girRulesApplied.push({ gia: true });
  const b = D.dungDuongDi('84135040', 'NHAP');
  check('đệm: bên gọi sửa kết quả không làm bẩn lần gọi sau', b.duongDiPhapLy.length > 0 && !b.canCu.girRulesApplied.some((g) => g.gia));
  check('đệm: khoá có loaiToKhai (NHAP ≠ XUAT)', D.dungDuongDi('84135040', 'XUAT').khuonChuaHoTro === '2.69' && D.dungDuongDi('84135040', 'NHAP').khuonChuaHoTro === undefined);
  for (const m of ma50) D.dungDuongDi(m, 'NHAP');
  const t = ma50.map((m) => { const s = process.hrtime.bigint(); D.dungDuongDi(m, 'NHAP'); return Number(process.hrtime.bigint() - s) / 1e6; }).sort((x, y) => x - y);
  const p95 = t[Math.ceil(0.95 * t.length) - 1];
  console.log(`p95 dungDuongDi (đã đệm, 50 mã lát 1) = ${p95.toFixed(3)} ms`);
  check('p95 < 50 ms (đã đệm)', p95 < 50, p95);
}

// ── 14b. Lý do chưa chốt là enum đông cứng (quyết định 3 của người điều phối, L1-5b) ─────────────────────────────────────
{
  check('LY_DO_CHUA_CHOT đông cứng', Object.isFrozen(L));
  const giaTri = new Set(Object.values(L));
  const ngoai = [];
  for (const m of [...ma50, '85362011', '85362020', '85444299', '85371019', '85371099', '84145949', '85011099', '39031920']) {
    for (const x of D.dungDuongDi(m, 'NHAP').chuaChot) { const { lyDo } = HS.tachChuaChot(x); if (!giaTri.has(lyDo)) ngoai.push(`${m}:${x}`); }
  }
  check('mọi chuaChot có lyDo thuộc LY_DO_CHUA_CHOT', !ngoai.length, ngoai);
  check('tachChuaChot tách "<lyDo>:<mã>"', JSON.stringify(HS.tachChuaChot('anh-em-chua-so-hoa:850110~r14830')) === JSON.stringify({ lyDo: 'anh-em-chua-so-hoa', ma: '850110~r14830' }));
}

// ── 15. Cờ HS_HO_SO (mặc định off; chưa nối endpoint — L1-5d) ─────────────────────────────────────────────────────────
{
  const cu = process.env.HS_HO_SO;
  delete process.env.HS_HO_SO;
  check('HS_HO_SO mặc định off', HS.cheDoHoSo() === 'off');
  check('off ⇒ hoSoApDung false cho mã lát 1 đã duyệt', HS.hoSoApDung('84135040') === false);
  process.env.HS_HO_SO = 'shadow'; check('HS_HO_SO=shadow', HS.cheDoHoSo() === 'shadow');
  process.env.HS_HO_SO = 'bat-bua'; check('HS_HO_SO lạ ⇒ off', HS.cheDoHoSo() === 'off');
  process.env.HS_HO_SO = 'on';
  check('on + lát 1 + ranh giới CLAUDE_DUYET ⇒ áp dụng (84135040)', HS.hoSoApDung('84135040') === true);
  check('on + lát 1 chưa duyệt (39269099) ⇒ không', HS.hoSoApDung('39269099') === false);
  check('on + ngoài lát 1 (01061100) ⇒ không', HS.hoSoApDung('01061100') === false);
  if (cu === undefined) delete process.env.HS_HO_SO; else process.env.HS_HO_SO = cu;
  check('index.js xuất lại dungDuongDi', HS.dungDuongDi === D.dungDuongDi && HS.PHIEN_BAN_HO_SO === 'ho-so@1');
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
