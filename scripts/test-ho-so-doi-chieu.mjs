// scripts/test-ho-so-doi-chieu.mjs — `docDuKien` + `doiChieu` + `nghienCuu` + `locTheoQuyen` của hồ sơ phân loại (plan L1-5b;
// spec hồ sơ §8.1 duKien/ketLuan/tinHieuRuiRo, §8.3 bước 2–4, §8.6, §11).
// Chạy trên dữ liệu THẬT (cây HS, sổ tay đã duyệt, tu-vung@1) + sổ tay/bảng hiệu chỉnh TIÊM để chứng minh nhân quả.
// Ca "đổi anh em" lấy từ bộ đề công khai #543 (data/bench/mo-ta-bo-de.json) — KHÔNG đọc bộ đề lát 1, KHÔNG đọc data/oz-export/*.
// Mọi LLM / web / kho Oz đều là STUB: không lời gọi mạng nào, không LLM thật.
import './test-isolate-data.mjs';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const TV = require('../lib/tu-vung.js');
const H = require('../lib/ho-so/hieu-chinh.js');
const S = require('../lib/so-tay.js');
const D = require('../lib/ho-so/duong-di.js');
const HS = require('../lib/ho-so/index.js');
const { loadSoTay } = require('../lib/so-tay-gates.js');
const { withPrivateData, isPrivate } = require('../lib/llm-privacy.js');
const { docDuKien } = require('../lib/ho-so/doc-du-kien.js');
const { doiChieu } = require('../lib/ho-so/doi-chieu.js');
const { nghienCuu } = require('../lib/ho-so/nghien-cuu.js');
const { locTheoQuyen } = require('../lib/ho-so/loc-quyen.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 700)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const CJK = /[㐀-鿿]/u;
const chuan = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
/** Duyệt sâu: mọi giá trị chuỗi + mọi khoá. */
const chuoiSau = (o) => JSON.stringify(o);

// ── Stub ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** LLM stub: ghi lại yêu cầu + ngữ cảnh riêng tư; trả `tra` (mảng hoặc hàm của yêu cầu). */
function llmStub(tra = []) {
  const goi = [];
  const fn = async (yc) => { goi.push({ yc: clone(yc), rieng: isPrivate() }); return typeof tra === 'function' ? tra(yc) : clone(tra); };
  fn.goi = goi;
  return fn;
}
const khongGoiKhoOz = async () => { throw new Error('kho Oz không được gọi khi không noiBo'); };

/** dungDuongDi → docDuKien → khungHoSo → doiChieu (mọi nguồn ngoài là stub). */
async function dung(ma, dauVao, o = {}) {
  const inj = {};
  if ('soTay' in o) inj.soTay = o.soTay;
  if ('bangHieuChinh' in o) inj.bangHieuChinh = o.bangHieuChinh;
  const dd = D.dungDuongDi(ma, 'NHAP', inj);
  const biLoai = [];
  const llm = o.llm || llmStub([]);
  const duKien = await docDuKien(dauVao, dd, { llm, rieng: o.rieng, biLoai });
  const khung = HS.khungHoSo(dd, { duKien, hang: { tenVi: dauVao.tenHang || null } });
  const truoc = clone(khung);
  const hoSo = await doiChieu(khung, {
    ...inj,
    moTa: [dauVao.tenHang, dauVao.moTa].filter(Boolean).join('. '),
    noiBo: o.noiBo,
    tinHieuDanhMuc: o.tinHieuDanhMuc || (async () => []),
    tienLeMaKhac: o.tienLeMaKhac || (async () => []),
    demKhoOz: o.demKhoOz || khongGoiKhoOz,
  });
  return { dd, duKien, hoSo, biLoai, llm, khung, truoc };
}

// ── 0. Enum lý do chưa chốt (quyết định 3 của người điều phối) ────────────────────────────────────────────────────────
{
  const E = HS.LY_DO_CHUA_CHOT;
  check('LY_DO_CHUA_CHOT xuất từ lib/ho-so/index.js, đông cứng', E && Object.isFrozen(E), E);
  check('LY_DO_CHUA_CHOT có đủ lý do của L1-5a', ['chua-duyet', 'chua-so-hoa', 'hieu-chinh-lech-chua-phan-xu', 'tieu-de-bi-luoc-ten', 'tang-bi-luoc', 'nhom-chua-co-so-tay', 'anh-em-chua-so-hoa', 'chong-lan-van-ban'].every((v) => Object.values(E).includes(v)), E);
}

// ── 1. docDuKien: luật trước ────────────────────────────────────────────────────────────────────────────────────────
const MO_TA_BOM = 'Bơm nước ly tâm trục ngang, lưu lượng 10.000 m³/h, model: XYZ-900, nhãn hiệu: Ebara, mới 100%';
{
  const { duKien, hoSo, llm } = await dung('84135040', { moTa: MO_TA_BOM });
  const ll = duKien.find((d) => d.fact === 'luuLuong');
  check('docDuKien luật: luuLuong DA_CO 10000 m3/h, nguồn KHACH', ll && ll.trangThai === 'DA_CO' && ll.giaTri === 10000 && ll.nguon === 'KHACH', ll);
  check('docDuKien luật: mọi bangChung DA_CO là đoạn con nguyên văn của đầu vào', duKien.filter((d) => d.trangThai === 'DA_CO').every((d) => MO_TA_BOM.includes(d.bangChung)), duKien);
  check('docDuKien luật: đọc đủ ⇒ không gọi LLM', llm.goi.length === 0, llm.goi);
  // ── doiChieu: đủ dữ kiện ⇒ mọi ranh giới CO ⇒ DU_CAN_CU
  check('doiChieu 84135040 đủ dữ kiện ⇒ mọi mục đường đi CO', hoSo.duongDiPhapLy.length > 0 && hoSo.duongDiPhapLy.every((e) => e.ketQua === 'CO'), hoSo.duongDiPhapLy);
  check('doiChieu 84135040 đủ dữ kiện ⇒ DU_CAN_CU, không câu hỏi, không maTroToi', hoSo.ketLuan.trangThai === 'DU_CAN_CU' && hoSo.ketLuan.cauHoi.length === 0 && !hoSo.ketLuan.maTroToi, hoSo.ketLuan);
  check('khungHoSo: hoSoId uuid + phienBan ho-so@1 + nhanDien từ dữ kiện', /^[0-9a-f-]{36}$/.test(hoSo.hoSoId) && hoSo.phienBan.hoSo === 'ho-so@1' && hoSo.nhanDien.model === 'XYZ-900' && hoSo.nhanDien.nhanHieu === 'Ebara', { id: hoSo.hoSoId, nd: hoSo.nhanDien });
}

// ── 2. Bỏ một dữ kiện quyết định ⇒ THIEU đúng dữ kiện đó, THIEU_DU_KIEN, câu hỏi Vi + Zh ──────────────────────────────────
{
  const moTa = MO_TA_BOM.replace('lưu lượng 10.000 m³/h, ', 'dùng tưới tiêu nông nghiệp, '); // còn một đoạn luật chưa đọc
  const llm = llmStub([{ fact: 'luuLuong', giaTri: 10000, donVi: 'm3/h', bangChung: 'lưu lượng 10000 m3/h' }]); // trích bịa: không có trong đầu vào
  const { duKien, hoSo, biLoai, khung, truoc } = await dung('84135040', { moTa }, { llm });
  const thieu = hoSo.duongDiPhapLy.filter((e) => e.ketQua === 'THIEU');
  check('bỏ luuLuong ⇒ mục THIEU chỉ của luuLuong', thieu.length === 2 && thieu.every((e) => e.dieuKien.fact === 'luuLuong'), hoSo.duongDiPhapLy);
  check('bỏ luuLuong ⇒ mục khác vẫn CO', hoSo.duongDiPhapLy.filter((e) => e.dieuKien.fact !== 'luuLuong').every((e) => e.ketQua === 'CO'));
  check('bỏ luuLuong ⇒ ketLuan THIEU_DU_KIEN', hoSo.ketLuan.trangThai === 'THIEU_DU_KIEN', hoSo.ketLuan);
  const ch = hoSo.ketLuan.cauHoi.find((c) => c.fact === 'luuLuong');
  check('bỏ luuLuong ⇒ cauHoi Vi + Zh từ tu-vung.cauHoiCho', ch && ch.vi === TV.cauHoiCho('luuLuong', 'vi') && ch.zh === TV.cauHoiCho('luuLuong', 'zh') && CJK.test(ch.zh), ch);
  check('bỏ luuLuong ⇒ chỉ một câu hỏi (không hỏi dữ kiện đã có)', hoSo.ketLuan.cauHoi.length === 1, hoSo.ketLuan.cauHoi);
  // LLM: chỉ dữ kiện quyết định CHUA_BIET, chỉ đoạn chữ chưa đọc
  const yc = llm.goi[0] && llm.goi[0].yc;
  check('LLM nhận đúng đoạn chưa đọc', yc && chuan(yc.doanChu).includes('dùng tưới tiêu nông nghiệp'), yc);
  check('LLM chỉ được hỏi dữ kiện quyết định còn CHUA_BIET (luuLuong)', llm.goi.length === 1 && yc.facts.map((f) => f.fact).join() === 'luuLuong', llm.goi);
  const daDoc = duKien.filter((d) => d.trangThai === 'DA_CO' && d.docBoi !== 'LLM');
  // hết chữ chưa đọc ⇒ không gọi LLM (không gửi lại chữ đã đọc)
  const llm2 = llmStub([]);
  await docDuKien({ moTa: MO_TA_BOM.replace('lưu lượng 10.000 m³/h, ', '') }, D.dungDuongDi('84135040', 'NHAP'), { llm: llm2 });
  check('mọi đoạn chữ đã được luật đọc ⇒ không gọi LLM', llm2.goi.length === 0, llm2.goi);
  check('LLM chỉ nhận đoạn chữ chưa đọc (không chứa bangChung luật đã đọc)', yc && daDoc.length >= 3 && daDoc.every((d) => !chuan(yc.doanChu).includes(chuan(d.bangChung))), { doan: yc && yc.doanChu, daDoc: daDoc.map((d) => d.bangChung) });
  // LLM trả bangChung không có trong đầu vào ⇒ bỏ, CHUA_BIET
  const ll = duKien.filter((d) => d.fact === 'luuLuong');
  check('LLM bangChung bịa ⇒ dữ kiện bị bỏ, luuLuong CHUA_BIET', ll.length === 1 && ll[0].trangThai === 'CHUA_BIET' && ll[0].giaTri == null, ll);
  check('LLM bangChung bịa ⇒ ghi vào biLoai', biLoai.some((b) => b.fact === 'luuLuong' && /bang-chung/.test(b.lyDo)), biLoai);
  check('doiChieu thuần: không sửa hồ sơ đầu vào', JSON.stringify(khung) === JSON.stringify(truoc));
}

// ── 3. LLM đọc dữ kiện có trích thật (ca BD-96-03 của bộ đề #543, dữ liệu sổ tay THẬT 9617 đã duyệt) ──────────────────────
const BO_DE = JSON.parse(fs.readFileSync('data/bench/mo-ta-bo-de.json', 'utf8'));
const caBoDe = (id) => BO_DE.ca.find((x) => x.id === id);
{
  const c = caBoDe('BD-96-03');
  const da = c.caCaiLoi.doiAnhEm;
  const moTa = c.moTaMau.replace(da.tu, da.sang); // "Vỏ ngoài rời của bình giữ nhiệt chân không…"
  const llmBia = llmStub([{ fact: 'laBoPhan', giaTri: true, bangChung: 'phụ tùng thay thế' }]);
  const r1 = await dung(c.maHs, { moTa }, { llm: llmBia });
  const e1 = r1.hoSo.duongDiPhapLy.find((e) => e.dieuKien && e.dieuKien.fact === 'laBoPhan');
  check('BD-96-03 + LLM trích bịa ⇒ laBoPhan CHUA_BIET ⇒ ranh giới THIEU, THIEU_DU_KIEN', e1 && e1.ketQua === 'THIEU' && r1.hoSo.ketLuan.trangThai === 'THIEU_DU_KIEN', { e1, kl: r1.hoSo.ketLuan });
  const llmThat = llmStub([{ fact: 'laBoPhan', giaTri: true, bangChung: 'Vỏ ngoài rời' }]);
  const r2 = await dung(c.maHs, { moTa }, { llm: llmThat });
  const lb = r2.duKien.find((d) => d.fact === 'laBoPhan');
  check('BD-96-03 + LLM trích thật ⇒ nhận, nguồn KHACH, docBoi LLM', lb && lb.trangThai === 'DA_CO' && lb.giaTri === true && lb.nguon === 'KHACH' && lb.docBoi === 'LLM' && moTa.includes(lb.bangChung), lb);
  const e2 = r2.hoSo.duongDiPhapLy.find((e) => e.dieuKien && e.dieuKien.fact === 'laBoPhan');
  check('BD-96-03 (LLM) ⇒ MAU_THUAN + maTroToi đúng dòng anh em của bộ đề', e2 && e2.ketQua === 'MAU_THUAN' && r2.hoSo.ketLuan.trangThai === 'MAU_THUAN' && r2.hoSo.ketLuan.maTroToi === da.maTroToi, { e2, kl: r2.hoSo.ketLuan });
  check('dữ kiện do LLM đọc ⇒ ranh giới không tất định (không làm căn cứ LOI)', e2 && e2.tatDinh === false, e2);
  check('LLM trả kiểu sai (CO_KHONG nhận chuỗi) ⇒ bỏ', (await docDuKien({ moTa }, r2.dd, { llm: llmStub([{ fact: 'laBoPhan', giaTri: 'có', bangChung: 'Vỏ ngoài rời' }]) })).find((d) => d.fact === 'laBoPhan').trangThai === 'CHUA_BIET');
  check('LLM trả khoá ngoài danh sách được hỏi ⇒ bỏ', !(await docDuKien({ moTa }, r2.dd, { llm: llmStub([{ fact: 'congSuat', giaTri: 5, donVi: 'kW', bangChung: 'Vỏ ngoài rời' }]) })).some((d) => d.fact === 'congSuat' && d.trangThai === 'DA_CO'));
  // CHENH_THUE theo biểu (96170010 30 % ↔ 96170020 25 %)
  const ct = r2.hoSo.tinHieuRuiRo.find((t) => t.loai === 'CHENH_THUE');
  check('MAU_THUAN có maTroToi chênh ≥ 5 điểm MFN ⇒ tín hiệu CHENH_THUE (biểu)', ct && ct.maKhac === da.maTroToi && Math.abs(ct.chenh) >= 5, r2.hoSo.tinHieuRuiRo);
  // LLM trong withPrivateData cho khoá dịch vụ
  const llmR = llmStub([]);
  await docDuKien({ moTa }, r2.dd, { llm: llmR, rieng: true });
  check('docDuKien rieng=true ⇒ LLM chạy trong withPrivateData', llmR.goi.length === 1 && llmR.goi[0].rieng === true, llmR.goi);
  const llmC = llmStub([]);
  await docDuKien({ moTa }, r2.dd, { llm: llmC, rieng: false });
  check('docDuKien lượt công khai ⇒ không bọc riêng tư', llmC.goi.length === 1 && llmC.goi[0].rieng === false, llmC.goi);
  const llmLoi = async () => { throw Object.assign(new Error('NO_PRIVATE_LLM'), { code: 'NO_PRIVATE_LLM' }); };
  const dkLoi = await docDuKien({ moTa }, r2.dd, { llm: llmLoi, rieng: true });
  check('LLM lỗi ⇒ không ném, dữ kiện còn CHUA_BIET', dkLoi.find((d) => d.fact === 'laBoPhan').trangThai === 'CHUA_BIET');
}

// ── 4. Dữ kiện bên gọi gửi ────────────────────────────────────────────────────────────────────────────────────────────
{
  const dd = D.dungDuongDi('84135040', 'NHAP');
  const biLoai = [];
  const dk = await docDuKien({ moTa: 'Bơm nước ly tâm', duKien: [
    { fact: 'luuLuong', giaTri: 10000, donVi: 'm3/h', nguon: 'NSX', bangChung: 'catalogue NSX' },
    { fact: 'dienAp', giaTri: 380, donVi: 'V', nguon: 'TB_TCHQ' },
    { fact: 'congSuat', giaTri: 90, donVi: 'kW', nguon: 'SUY_RA' },
    { fact: 'coLuoiBaoVe', giaTri: 'có', nguon: 'KHACH' },
    { fact: 'khongCoTrongTuVung', giaTri: 1, nguon: 'KHACH' },
  ] }, dd, { llm: llmStub([]), biLoai });
  const ll = dk.find((d) => d.fact === 'luuLuong');
  check('duKien bên gọi nguồn NSX: giữ nguồn của họ, DA_CO', ll && ll.nguon === 'NSX' && ll.trangThai === 'DA_CO' && ll.giaTri === 10000, ll);
  check('duKien bên gọi nguồn TB_TCHQ / SUY_RA ⇒ không nhận', !dk.some((d) => ['TB_TCHQ', 'SUY_RA'].includes(d.nguon)) && biLoai.filter((b) => /nguon/.test(b.lyDo)).length === 2, biLoai);
  check('duKien bên gọi sai kiểu / khoá lạ ⇒ không nhận', !dk.some((d) => d.fact === 'coLuoiBaoVe' && d.trangThai === 'DA_CO') && !dk.some((d) => d.fact === 'khongCoTrongTuVung'), dk);
}

// ── 5. Ba ca "đổi anh em" của bộ đề #543 ⇒ MAU_THUAN + maTroToi đúng dòng anh em ────────────────────────────────────────
// Ranh giới của ba phân nhóm này chưa duyệt trên dữ liệu thật: tiêm sổ tay (chỉ trong test) với điều kiện có kiểu đúng chữ dòng
// biểu thuế (câu trích tax.<mã> đã có trong sổ tay) và ép nhãn CLAUDE_DUYET — test chứng minh động cơ, không chứng minh dữ liệu.
function soTayDuyet(h4, dk) {
  const st = clone(loadSoTay(h4));
  st.dong8 = st.dong8.map((d) => (dk[d.hs] ? { ...d, dieuKienSo: dk[d.hs], nguonLoai: 'CLAUDE_DUYET' } : d));
  return st;
}
const FIX = {
  'BD-84-05': soTayDuyet('8464', { 84642010: [{ fact: 'hoatDongBangDien', op: 'CO' }], 84642020: [{ fact: 'hoatDongBangDien', op: 'KHONG' }] }),
  'BD-90-03': soTayDuyet('9019', { 90191010: [{ fact: 'hoatDongBangDien', op: 'CO' }] }),
  'BD-96-01': soTayDuyet('9608', { 96081010: [{ fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'THAN' }] }),
};
for (const [id, st] of Object.entries(FIX)) {
  const c = caBoDe(id);
  const da = c && c.caCaiLoi && c.caCaiLoi.doiAnhEm;
  check(`${id}: có trong bộ đề #543 với doiAnhEm`, Boolean(da && da.maTroToi), c && c.caCaiLoi);
  if (!da) continue;
  const goc = await dung(c.maHs, { moTa: c.moTaMau }, { soTay: st });
  check(`${id}: mô tả mẫu ⇒ không MAU_THUAN, ranh giới của ${c.maHs} CO`, goc.hoSo.ketLuan.trangThai !== 'MAU_THUAN' && goc.hoSo.duongDiPhapLy.filter((e) => e.dieuKien).every((e) => e.ketQua === 'CO'), goc.hoSo.duongDiPhapLy);
  const moTa = c.moTaMau.replace(da.tu, da.sang);
  check(`${id}: thay cụm "${da.tu}" thật sự đổi mô tả`, moTa !== c.moTaMau);
  const r = await dung(c.maHs, { moTa }, { soTay: st });
  check(`${id}: đổi anh em ⇒ MAU_THUAN`, r.hoSo.ketLuan.trangThai === 'MAU_THUAN' && r.hoSo.duongDiPhapLy.some((e) => e.ketQua === 'MAU_THUAN'), r.hoSo.duongDiPhapLy);
  check(`${id}: maTroToi = ${da.maTroToi} (dòng anh em của bộ đề)`, r.hoSo.ketLuan.maTroToi === da.maTroToi, r.hoSo.ketLuan);
}

// ── 6. Tiền lệ lệch CHƯA phân xử (8537.10 — CEO 30/10: "chưa chốt, hỏi lại người khai") ⇒ hỏi dữ kiện, nêu cả hai, không chọn ─
// Bản ĐÔNG CỨNG của mục 853710-02 (data/ho-so/hieu-chinh-tien-le.json tại b052dee) + `factPhanBiet` (dữ kiện quyết định do
// người soạn bảng ghi — ở đây: đã ghi/nạp phần mềm điều khiển chưa). Không đọc bảng sống để test không vỡ oan khi bảng đổi.
const LECH_853710_02 = {
  id: '853710-02', maHs: '85371019', dongChuBieu: '85371012', loai: 'LECH_CHUA_PHAN_XU',
  dieuKien: { fact: 'tenLoai', op: 'TEN_LOAI', value: ['Bảng mạch điều khiển', 'Bản mạch đã lắp ráp hoàn chỉnh'] },
  tbTchq: [
    { soHieu: '4040/TB-TCHQ', viTri: 'precedents.json#85371019[10]', trich: 'Bảng mạch điều khiển của thiết bị lọc không khí (bảng mạch chưa trải qua quá trình ghi dữ liệu điều khiển), sử dụng cho điện áp dưới 1000V … mã số 8537.10.19' },
    { soHieu: '1159/TB-TCHQ', viTri: 'precedents.json#85371019[7]', trich: 'Bản mạch đã lắp ráp hoàn chỉnh … Bảng mạch đã được lắp ráp hoàn chỉnh tuy nhiên chưa được ghi phần mềm điều khiển ở công đoạn này … mã số 8537.10.19' },
  ],
  chuBieu: [{ nguon: 'tax.85371012', trich: 'Bảng điều khiển có trang bị bộ xử lý lập trình (SEN)' }],
  lyDo: 'Lệch hay không tuỳ câu hỏi chữ biểu không trả lời: vi mạch điều khiển chưa nạp chương trình có tính là "bộ xử lý lập trình" không.',
  duyetBoi: null, nguonLoai: 'AI_DA_KIEM', factPhanBiet: ['daGhi'],
};
{
  // Trích đông cứng vẫn có nguyên văn trong precedents.json / biểu (cổng L1-4b) — fixture không bịa.
  const kb = H.kiemBang({ phienBan: H.PHIEN_BAN, muc: [LECH_853710_02] }, { phuKin: false });
  check('fixture 853710-02 qua máy kiểm bảng hiệu chỉnh (trích nguyên văn)', kb.loi.length === 0, kb.loi);
  const st = soTayDuyet('8537', { 85371012: [{ fact: 'coBoXuLyLapTrinh', op: 'CO' }] });
  const bang = { muc: [clone(LECH_853710_02)] };
  const moTa = 'Bảng mạch điều khiển của thiết bị lọc không khí, có vi điều khiển tích hợp bluetooth, điện áp dưới 1000V, mới 100%';
  const r = await dung('85371019', { moTa }, { soTay: st, bangHieuChinh: bang });
  const e12 = r.hoSo.duongDiPhapLy.find((e) => e.nut === '85371012' && e.chieu === 'PHAI_KHONG');
  check('8537.10.19 + LECH (hàng trong phạm vi): ranh giới .12 CHUA_SO_HOA lyDo LECH — không MAU_THUAN theo chữ biểu', e12 && e12.ketQua === 'CHUA_SO_HOA' && e12.lyDo === HS.LY_DO_CHUA_CHOT.HIEU_CHINH_LECH, e12);
  check('8537.10.19 + LECH ⇒ CAN_CHUYEN_GIA, không maTroToi (không bao giờ chọn bên)', r.hoSo.ketLuan.trangThai === 'CAN_CHUYEN_GIA' && !('maTroToi' in r.hoSo.ketLuan), r.hoSo.ketLuan);
  check('8537.10.19 + LECH ⇒ chuaChot ghi hieu-chinh-lech-chua-phan-xu:853710-02', r.hoSo.ketLuan.chuaChot.includes('hieu-chinh-lech-chua-phan-xu:853710-02'), r.hoSo.ketLuan.chuaChot);
  const px = r.hoSo.ketLuan.cauHoi.find((q) => q.loai === 'PHAN_XU_TIEN_LE' && q.hieuChinhId === '853710-02');
  check('cauHoi PHAN_XU_TIEN_LE (Vi + Zh) cho 853710-02', px && px.vi && CJK.test(px.zh), px);
  const p19 = px && px.haiPhuongAn.find((p) => p.maHs === '85371019');
  const p12 = px && px.haiPhuongAn.find((p) => p.maHs === '85371012');
  check('PHAN_XU nêu CẢ HAI dòng', px && px.haiPhuongAn.length === 2 && p19 && p12, px && px.haiPhuongAn);
  check('PHAN_XU dòng .19 kèm nguồn TB-TCHQ (4040, 1159) nguyên văn', p19 && p19.canCu.loai === 'TB_TCHQ' && p19.canCu.tbTchq.map((t) => t.soHieu).join() === '4040/TB-TCHQ,1159/TB-TCHQ' && p19.canCu.tbTchq.every((t) => t.trich), p19);
  check('PHAN_XU dòng .12 kèm chữ biểu nguyên văn', p12 && p12.canCu.loai === 'CHU_BIEU' && p12.canCu.chuBieu[0].trich === 'Bảng điều khiển có trang bị bộ xử lý lập trình (SEN)', p12);
  check('PHAN_XU hỏi dữ kiện quyết định (đã ghi phần mềm điều khiển chưa) — Vi + Zh từ tu-vung', px && px.factPhanBiet.length === 1 && px.factPhanBiet[0].fact === 'daGhi' && px.factPhanBiet[0].vi === TV.cauHoiCho('daGhi', 'vi') && CJK.test(px.factPhanBiet[0].zh), px && px.factPhanBiet);
  check('cauHoi theo dữ kiện có daGhi (để người khai trả lời)', r.hoSo.ketLuan.cauHoi.some((q) => q.fact === 'daGhi'), r.hoSo.ketLuan.cauHoi);
  check('PHAN_XU không chứa trường chọn bên (maChon/maDeXuat/maTroToi)', px && !/maChon|maDeXuat|maTroToi/.test(JSON.stringify(px)), px);
  const ct = r.hoSo.tinHieuRuiRo.find((t) => t.loai === 'CHENH_THUE' && t.maKhac === '85371012');
  check('LECH .19 (15 %) ↔ .12 (5 %) ⇒ CHENH_THUE 10 điểm (biểu)', ct && Math.abs(ct.chenh) === 10, r.hoSo.tinHieuRuiRo);
  // Người khai đã trả lời dữ kiện quyết định ⇒ vẫn KHÔNG chọn (chờ chuyên gia), ghi lại câu trả lời cho chuyên gia
  const r2 = await dung('85371019', { moTa: moTa.replace('điện áp dưới 1000V', 'chưa ghi dữ liệu điều khiển') }, { soTay: st, bangHieuChinh: bang });
  const px2 = r2.hoSo.ketLuan.cauHoi.find((q) => q.loai === 'PHAN_XU_TIEN_LE');
  check('đã biết daGhi=false ⇒ vẫn CAN_CHUYEN_GIA, không maTroToi', r2.hoSo.ketLuan.trangThai === 'CAN_CHUYEN_GIA' && !('maTroToi' in r2.hoSo.ketLuan), r2.hoSo.ketLuan);
  check('đã biết daGhi ⇒ PHAN_XU ghi daBiet (giá trị + bằng chứng), không hỏi lại daGhi', px2 && px2.daBiet.some((d) => d.fact === 'daGhi' && d.giaTri === false && d.bangChung) && !r2.hoSo.ketLuan.cauHoi.some((q) => q.fact === 'daGhi'), px2);
  // Hàng ngoài phạm vi mục (tên loại khác hẳn) ⇒ mục lệch không áp
  const r3 = await dung('85371019', { moTa: 'Tủ điện phân phối hạ thế, vỏ thép sơn tĩnh điện, mới 100%' }, { soTay: st, bangHieuChinh: bang });
  check('hàng ngoài phạm vi apKhi ⇒ không PHAN_XU, không chuaChot lệch', !r3.hoSo.ketLuan.cauHoi.some((q) => q.loai === 'PHAN_XU_TIEN_LE') && !r3.hoSo.ketLuan.chuaChot.some((x) => x.startsWith('hieu-chinh-lech')), r3.hoSo.ketLuan);
  const e12c = r3.hoSo.duongDiPhapLy.find((e) => e.nut === '85371012' && e.chieu === 'PHAI_KHONG');
  check('hàng ngoài phạm vi ⇒ ranh giới .12 đối chiếu theo chữ biểu (không CHUA_SO_HOA vì lệch)', e12c && e12c.ketQua !== 'CHUA_SO_HOA', e12c);
}
{
  // Dữ liệu THẬT: nếu bảng còn ghi 853710-02 là LECH_CHUA_PHAN_XU thì hồ sơ 8537.10.19 của hàng trong phạm vi phải nêu cả hai dòng.
  const muc = H.taiBang().muc.find((m) => m.id === '853710-02');
  if (muc && muc.loai === 'LECH_CHUA_PHAN_XU') {
    const r = await dung('85371019', { moTa: 'Bảng mạch điều khiển của thiết bị lọc không khí, có vi điều khiển, mới 100%' });
    const px = r.hoSo.ketLuan.cauHoi.find((q) => q.loai === 'PHAN_XU_TIEN_LE' && q.hieuChinhId === '853710-02');
    check('dữ liệu thật 853710-02 (LECH) ⇒ CAN_CHUYEN_GIA + PHAN_XU nêu .19 và .12', r.hoSo.ketLuan.trangThai === 'CAN_CHUYEN_GIA' && px && px.haiPhuongAn.map((p) => p.maHs).sort().join() === '85371012,85371019' && !('maTroToi' in r.hoSo.ketLuan), r.hoSo.ketLuan);
  }
}

// ── 7. Tín hiệu rủi ro: DANH_MUC_RUI_RO (QĐ 2079) công khai, không bao giờ vào canCu; tiền lệ TB-TCHQ; kho Oz chỉ nội bộ ──────
const QD2079 = [{ loai: 'DANH_MUC_RUI_RO', maLienQuan: '84137099', maKhop: '841350', tenHang: 'Bơm', nguon: 'TEP_TINH', nhan: 'QD_2079_BAC_C', ghiChu: 'Tín hiệu rủi ro phân loại … không phải căn cứ pháp lý' }];
{
  const goiOz = [];
  const r = await dung('84135040', { moTa: MO_TA_BOM }, {
    tinHieuDanhMuc: async (ma) => (ma === '84135040' ? clone(QD2079) : []),
    tienLeMaKhac: async () => [{ soHieu: '999/TB-TCHQ', maKetLuan: '84137011', doTuongTu: 0.62, nguon: 'https://example.gov.vn/tb' }],
  });
  const dm = r.hoSo.tinHieuRuiRo.filter((t) => t.loai === 'DANH_MUC_RUI_RO');
  check('DANH_MUC_RUI_RO (QĐ 2079) có trong tinHieuRuiRo, nhãn QD_2079_BAC_C + ghi chú không phải căn cứ', dm.length === 1 && dm[0].nhan === 'QD_2079_BAC_C' && /không phải căn cứ pháp lý/.test(dm[0].ghiChu), r.hoSo.tinHieuRuiRo);
  const cc = chuoiSau(r.hoSo.canCu);
  check('không mục DANH_MUC_RUI_RO / QD_2079 nào trong canCu.canCuPhapLy / girRulesApplied (duyệt sâu)', !/DANH_MUC_RUI_RO|QD_2079|2079/.test(cc), cc.slice(0, 300));
  const tl = r.hoSo.tinHieuRuiRo.find((t) => t.loai === 'TIEN_LE_MO_TA_TUONG_TU_MA_KHAC');
  check('TIEN_LE_MO_TA_TUONG_TU_MA_KHAC (TB-TCHQ công khai) kèm số hiệu + mã kết luận', tl && tl.tienLe[0].soHieu === '999/TB-TCHQ' && tl.tienLe[0].maKetLuan === '84137011', r.hoSo.tinHieuRuiRo);
  check('không noiBo ⇒ không gọi kho Oz, không MO_TA_GIONG_MA_KHAC', !r.hoSo.tinHieuRuiRo.some((t) => t.loai === 'MO_TA_GIONG_MA_KHAC') && goiOz.length === 0);
  const rN = await dung('84135040', { moTa: MO_TA_BOM }, { noiBo: true, demKhoOz: async (ma, moTa) => { goiOz.push({ ma, moTa }); return { tong: 7, maKhac: [{ maHs: '84137011', dem: 5 }, { maHs: '84138113', dem: 2 }] }; } });
  const oz = rN.hoSo.tinHieuRuiRo.find((t) => t.loai === 'MO_TA_GIONG_MA_KHAC');
  check('noiBo ⇒ MO_TA_GIONG_MA_KHAC chỉ là số đếm (không câu mô tả Oz)', oz && oz.demKhoOz === 7 && oz.maKhac.every((m) => Object.keys(m).sort().join() === 'demKhoOz,maHs') && goiOz.length === 1, oz);
  // Nguồn tín hiệu lỗi ⇒ hồ sơ vẫn dựng
  const rL = await dung('84135040', { moTa: MO_TA_BOM }, { tinHieuDanhMuc: async () => { throw new Error('db'); }, tienLeMaKhac: async () => { throw new Error('x'); } });
  check('nguồn tín hiệu lỗi ⇒ không ném, ketLuan vẫn DU_CAN_CU', rL.hoSo.ketLuan.trangThai === 'DU_CAN_CU', rL.hoSo.ketLuan);
}

// ── 8. locTheoQuyen — Review Focus 3 ─────────────────────────────────────────────────────────────────────────────────────
{
  const { hoSo } = await dung('84135040', { moTa: MO_TA_BOM }, { tinHieuDanhMuc: async () => clone(QD2079) });
  const coNoiBo = clone(hoSo);
  coNoiBo.tinHieuRuiRo.push({ loai: 'MO_TA_GIONG_MA_KHAC', demKhoOz: 7, maKhac: [{ maHs: '84137011', demKhoOz: 5 }], nguon: 'KHO_TO_KHAI_OZ', nhan: 'NOI_BO_OZ' });
  coNoiBo.tienLe.push({ loai: 'OZ', nguon: 'KHO_TO_KHAI_OZ', demKhoOz: 12 }, { loai: 'TB_TCHQ', soHieu: '1/TB-TCHQ' });
  coNoiBo.ketLuan.thongKe = { demKhoOz: 3, ghiChu: 'MO_TA_GIONG_MA_KHAC: 3 tờ khai' };
  coNoiBo.duongDiPhapLy[0].goiYNoiBo = { loai: 'MO_TA_GIONG_MA_KHAC', demKhoOz: 1 };
  const truoc = JSON.stringify(coNoiBo);
  for (const q of [{ noiBo: false }, {}, undefined, { noiBo: 'true' }]) {
    const ra = locTheoQuyen(coNoiBo, q);
    const s = chuoiSau(ra);
    check(`locTheoQuyen(${JSON.stringify(q)}) ⇒ không còn MO_TA_GIONG_MA_KHAC / số đếm kho Oz ở mọi độ sâu`, !/MO_TA_GIONG_MA_KHAC|demKhoOz|KHO_TO_KHAI_OZ|NOI_BO_OZ/.test(s), s.match(/.{60}(MO_TA_GIONG_MA_KHAC|demKhoOz|KHO_TO_KHAI_OZ).{30}/));
    check(`locTheoQuyen(${JSON.stringify(q)}) ⇒ CÒN DANH_MUC_RUI_RO nhãn QD_2079_BAC_C`, ra.tinHieuRuiRo.some((t) => t.loai === 'DANH_MUC_RUI_RO' && t.nhan === 'QD_2079_BAC_C'), ra.tinHieuRuiRo);
    check(`locTheoQuyen(${JSON.stringify(q)}) ⇒ giữ tiền lệ TB-TCHQ, ranh giới, căn cứ`, ra.tienLe.some((t) => t.soHieu === '1/TB-TCHQ') && ra.duongDiPhapLy.length === coNoiBo.duongDiPhapLy.length && JSON.stringify(ra.canCu) === JSON.stringify(coNoiBo.canCu));
  }
  check('locTheoQuyen thuần: không sửa đầu vào', JSON.stringify(coNoiBo) === truoc);
  const noiBo = locTheoQuyen(coNoiBo, { noiBo: true });
  check('locTheoQuyen({noiBo:true}) ⇒ giữ tín hiệu nội bộ', /MO_TA_GIONG_MA_KHAC/.test(chuoiSau(noiBo)) && noiBo.tinHieuRuiRo.some((t) => t.demKhoOz === 7));
  // Phòng thủ: dù ai lỡ chép QĐ 2079 vào canCu, locTheoQuyen gỡ ra cho MỌI người gọi
  const ban = clone(hoSo);
  ban.canCu.canCuPhapLy.giaDinh = clone(QD2079[0]);
  ban.canCu.girRulesApplied.push({ rule: 'X', evidence: { nhan: 'QD_2079_BAC_C' } });
  for (const q of [{ noiBo: false }, { noiBo: true }]) check(`locTheoQuyen(${JSON.stringify(q)}) ⇒ gỡ QĐ 2079 khỏi canCu`, !/DANH_MUC_RUI_RO|QD_2079/.test(chuoiSau(locTheoQuyen(ban, q).canCu)));
}

// ── 9. nghienCuu — Review Focus 1 (riêng tư) + chỉ CORROBORATED/VERIFIED vào duKien ─────────────────────────────────────────
process.env.ZAI_SEARCH_KEY = 'k'.repeat(40);
const MO_TA_KHONG_LL = 'Bơm nước ly tâm trục ngang dùng tưới tiêu nông nghiệp, mới 100%';
const MO_TA_KHONG_LL_HIEU = `${MO_TA_KHONG_LL.replace(', mới 100%', '')}, model: XYZ-900, nhãn hiệu: Ebara, mới 100%`;
const trangCo = (noiDung) => async () => ({ ok: true, status: 200, arrayBuffer: async () => Buffer.from(`<html><body>${noiDung}</body></html>`) });
function identifyStub(kq) {
  const goi = [];
  const fn = async (p, o) => { goi.push({ p: clone(p), rieng: isPrivate(), coFetch: Boolean(o && o.fetchImpl) }); return clone(kq); };
  fn.goi = goi;
  return fn;
}
function webGoiStub(kq) {
  const goi = [];
  const fn = async (key, than) => { goi.push({ than, rieng: isPrivate() }); return clone(kq); };
  fn.goi = goi;
  return fn;
}
const IDENT_HYPO = { frame: {}, xacMinh: { muc: 'HYPOTHESIS', nguon: [] }, xacMinhKetQua: [] };
{
  // Riêng tư, KHÔNG hiệu/model ⇒ stub web không được gọi
  const { hoSo } = await dung('84135040', { moTa: MO_TA_KHONG_LL }, { rieng: true });
  const web = webGoiStub({ content: [] });
  const ident = identifyStub(IDENT_HYPO);
  const kq = await withPrivateData(() => nghienCuu(hoSo, { congKhai: false, moTa: MO_TA_KHONG_LL, deps: { identify: ident, webGoi: web, fetchImpl: trangCo('') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz }));
  check('nghienCuu riêng tư không hiệu/model ⇒ stub web KHÔNG được gọi', web.goi.length === 0, web.goi);
  check('nghienCuu riêng tư ⇒ identify chạy trong withPrivateData', ident.goi.length === 1 && ident.goi[0].rieng === true, ident.goi);
  check('nghienCuu không xác minh được ⇒ luuLuong vẫn THIEU, có cauHoi', kq.ketLuan.trangThai === 'THIEU_DU_KIEN' && kq.ketLuan.cauHoi.some((q) => q.fact === 'luuLuong'), kq.ketLuan);
  // congKhai:false tự bọc riêng tư (không cần bên gọi bọc)
  const ident2 = identifyStub(IDENT_HYPO);
  await nghienCuu(hoSo, { congKhai: false, moTa: MO_TA_KHONG_LL, deps: { identify: ident2, webGoi: webGoiStub({ content: [] }), fetchImpl: trangCo('') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  check('nghienCuu congKhai:false ⇒ tự chạy trong withPrivateData', ident2.goi[0] && ident2.goi[0].rieng === true, ident2.goi);
}
{
  // Riêng tư CÓ hiệu/model ⇒ web chỉ nhận hiệu + model + khoá từ vựng, không byte nào của mô tả khách
  const { hoSo } = await dung('84135040', { moTa: MO_TA_KHONG_LL_HIEU }, { rieng: true });
  const web = webGoiStub({ content: [{ type: 'text', text: 'XYZ-900 là bơm ly tâm.' }] });
  await nghienCuu(hoSo, { congKhai: false, moTa: MO_TA_KHONG_LL_HIEU, url: 'https://shop.example/xyz', deps: { identify: identifyStub(IDENT_HYPO), webGoi: web, fetchImpl: trangCo('') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  const than = web.goi[0] && web.goi[0].than;
  check('nghienCuu riêng tư có hiệu/model ⇒ gọi web một lần, có model + hiệu', web.goi.length === 1 && /XYZ-900/.test(than) && /Ebara/.test(than), web.goi);
  check('nghienCuu riêng tư ⇒ web không nhận chữ mô tả khách, không nhận URL', than && !['ly tâm', 'trục ngang', 'tưới tiêu', 'nông nghiệp', 'shop.example'].some((w) => chuan(than).includes(w)), than);
  check('nghienCuu riêng tư ⇒ mucTieu là khoá từ vựng (luuLuong)', than && /luuLuong/.test(than), than);
}
{
  // identify CORROBORATED: trích nguồn đã mở lại được ⇒ luuLuong vào duKien nguồn NSX ⇒ DU_CAN_CU; datasheet vào tài liệu nên kèm
  const { hoSo } = await dung('84135040', { moTa: MO_TA_KHONG_LL_HIEU });
  const nguon = [
    { url: 'https://pump-maker.example/xyz-900', trich: 'Lưu lượng 10.000 m³/h, cột áp 30 m', loai: 'phu' },
    { url: 'https://catalog.other.example/datasheet/xyz-900.pdf', trich: 'XYZ-900 lưu lượng 10.000 m³/h', loai: 'phu' },
  ];
  const ident = identifyStub({ frame: { model: 'XYZ-900' }, xacMinh: { muc: 'CORROBORATED', nguon }, xacMinhKetQua: nguon.map((n) => ({ url: n.url, moDuoc: true, trichCoMat: true, xacMinhOk: true })) });
  const kq = await nghienCuu(hoSo, { congKhai: true, moTa: MO_TA_KHONG_LL_HIEU, deps: { identify: ident, webGoi: webGoiStub({ content: [] }), fetchImpl: trangCo('') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  const ll = kq.duKien.find((d) => d.fact === 'luuLuong' && d.trangThai === 'DA_CO');
  check('nghienCuu CORROBORATED ⇒ luuLuong DA_CO nguồn NSX, bằng chứng là trích nguồn đã xác minh', ll && ll.nguon === 'NSX' && ll.giaTri === 10000 && nguon.some((n) => n.trich.includes(ll.bangChung)) && ll.xacMinh && ll.xacMinh.muc === 'CORROBORATED', ll);
  check('nghienCuu CORROBORATED ⇒ đối chiếu lại: DU_CAN_CU', kq.ketLuan.trangThai === 'DU_CAN_CU', kq.ketLuan);
  check('nghienCuu ⇒ taiLieuKyThuatNenKem gom URL datasheet', (kq.taiLieuKyThuatNenKem || []).some((t) => t.url === nguon[1].url), kq.taiLieuKyThuatNenKem);
  check('nghienCuu không sửa hồ sơ đầu vào', !hoSo.duKien.some((d) => d.fact === 'luuLuong' && d.trangThai === 'DA_CO'));
  // identify HYPOTHESIS (một nguồn) ⇒ KHÔNG vào duKien
  const ident1 = identifyStub({ frame: {}, xacMinh: { muc: 'HYPOTHESIS', nguon: [nguon[0]] }, xacMinhKetQua: [{ url: nguon[0].url, moDuoc: true, trichCoMat: true, xacMinhOk: true }] });
  const kq1 = await nghienCuu(hoSo, { congKhai: true, moTa: MO_TA_KHONG_LL_HIEU, deps: { identify: ident1, webGoi: webGoiStub({ content: [] }), fetchImpl: trangCo('') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  check('nghienCuu HYPOTHESIS ⇒ không vào duKien, còn cauHoi', !kq1.duKien.some((d) => d.fact === 'luuLuong' && d.trangThai === 'DA_CO') && kq1.ketLuan.cauHoi.some((q) => q.fact === 'luuLuong'), kq1.ketLuan);
  // Web (z.ai stub) + máy mở lại 2 miền ⇒ CORROBORATED ⇒ nhận; 1 miền ⇒ không
  const traWeb = { content: [{ type: 'web_search_tool_result', content: [{ url: 'https://a.example/xyz', title: 'XYZ-900' }, { url: 'https://b.example/xyz-datasheet.pdf', title: 'XYZ-900 datasheet' }] }, { type: 'text', text: 'Bơm XYZ-900: lưu lượng 10.000 m³/h, cột áp 30 m.' }] };
  const kqW = await nghienCuu(hoSo, { congKhai: true, moTa: MO_TA_KHONG_LL_HIEU, deps: { identify: identifyStub(IDENT_HYPO), webGoi: webGoiStub(traWeb), fetchImpl: trangCo('Thông số: lưu lượng 10.000 m³/h') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  const llW = kqW.duKien.find((d) => d.fact === 'luuLuong' && d.trangThai === 'DA_CO');
  check('nghienCuu web + 2 miền xác minh ⇒ CORROBORATED ⇒ luuLuong nguồn NSX', llW && llW.nguon === 'NSX' && llW.xacMinh.muc === 'CORROBORATED' && kqW.ketLuan.trangThai === 'DU_CAN_CU', { llW, kl: kqW.ketLuan });
  const traWeb1 = { content: [{ type: 'web_search_tool_result', content: [{ url: 'https://a.example/xyz', title: 'XYZ-900' }] }, { type: 'text', text: 'Bơm XYZ-900: lưu lượng 10.000 m³/h.' }] };
  const kqW1 = await nghienCuu(hoSo, { congKhai: true, moTa: MO_TA_KHONG_LL_HIEU, deps: { identify: identifyStub(IDENT_HYPO), webGoi: webGoiStub(traWeb1), fetchImpl: trangCo('Thông số: lưu lượng 10.000 m³/h') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  check('nghienCuu web 1 miền ⇒ HYPOTHESIS ⇒ không vào duKien', !kqW1.duKien.some((d) => d.fact === 'luuLuong' && d.trangThai === 'DA_CO'), kqW1.duKien.filter((d) => d.fact === 'luuLuong'));
  const kqW2 = await nghienCuu(hoSo, { congKhai: true, moTa: MO_TA_KHONG_LL_HIEU, deps: { identify: identifyStub(IDENT_HYPO), webGoi: webGoiStub(traWeb), fetchImpl: trangCo('trang không nói gì về bơm') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  check('nghienCuu web: trang mở được nhưng không có trích ⇒ không vào duKien', !kqW2.duKien.some((d) => d.fact === 'luuLuong' && d.trangThai === 'DA_CO'));
  // Không còn CHUA_BIET ⇒ không nghiên cứu
  const { hoSo: du } = await dung('84135040', { moTa: MO_TA_BOM });
  const identDu = identifyStub(IDENT_HYPO); const webDu = webGoiStub({ content: [] });
  await nghienCuu(du, { congKhai: true, moTa: MO_TA_BOM, deps: { identify: identDu, webGoi: webDu, fetchImpl: trangCo('') }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: khongGoiKhoOz });
  check('nghienCuu khi không còn dữ kiện quyết định CHUA_BIET ⇒ không gọi identify/web', identDu.goi.length === 0 && webDu.goi.length === 0);
}

// ── 10. Cửa vào lib/ho-so/index.js ─────────────────────────────────────────────────────────────────────────────────────
check('index.js xuất docDuKien/doiChieu/nghienCuu/locTheoQuyen/khungHoSo', HS.docDuKien === docDuKien && HS.doiChieu === doiChieu && HS.nghienCuu === nghienCuu && HS.locTheoQuyen === locTheoQuyen && typeof HS.khungHoSo === 'function');
// L1-5d (#648) nối endpoint: api/ chỉ được nạp động cơ qua lib/ho-so/api.js (nơi locTheoQuyen chạy trước khi trả), không nạp thẳng module con.
check('api/ chỉ nạp lib/ho-so qua lib/ho-so/api.js', fs.readdirSync('api').every((f) => [...fs.readFileSync(`api/${f}`, 'utf8').matchAll(/require\(['"]([^'"]*ho-so[^'"]*)['"]\)/g)].every((m) => m[1] === '../lib/ho-so/api')));
// chống nhắc lại "sổ tay" chưa dùng — S chỉ để bảo đảm module so-tay nạp được trong môi trường test cách ly
check('lib/so-tay nạp được', typeof S.sourcesFor === 'function');

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
