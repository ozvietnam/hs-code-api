/**
 * Đọc BIỂU THUẾ XNK (tệp Excel do Tổng cục Hải quan soạn, vd data/oz-export/BIEU-THUE-XNK-2026.04.05.xlsx) — KHÔNG BỎ SÓT.
 *
 * Nguyên tắc (skill .claude/skills/bieu-thue-xnk/SKILL.md):
 *   1. Đọc THÔ trước, hiểu sau: mọi ô không rỗng của mọi sheet được giữ (giá trị gốc + chữ hiển thị), kể cả dòng
 *      không có mã (tiêu đề nhóm con "- Loại khác:", ghi chú, dòng chương). Trước đây scripts/tariff-upload-xlsx.mjs
 *      bỏ mọi dòng không mã và mọi cột không khai — mất đúng phần quý nhất (tên tiêu đề bị lược, các cột FTA).
 *   2. Cột không nhận ra vẫn giữ nguyên chữ tiêu đề và giá trị (khoá `khac`), máy kiểm đếm ô để chứng minh bảo toàn.
 *   3. Mã không "chuẩn hoá" phá huỷ: giữ chuỗi gốc `ma` (vd "8504.21.11", "01.01", "0101.21") + `maChuan` (chỉ chữ số)
 *      + `soChuSo`; dòng 10 số vẫn là dòng 10 số.
 *   4. Tiêu đề (dòng có chữ, không mã) được nối vào cây theo chữ số (lib/hs-tree.js): nút ảo mà tập con khớp đúng tập
 *      dòng dưới tiêu đề → tên NGUYÊN VĂN biểu thuế cho nút đó (giải 1.155 tiêu đề quốc gia bị lược, #236).
 *   5. Thuế suất giữ CHUỖI gốc ("0 (-CN)", "*", "5/0") — không ép số; đọc nghĩa là việc của lib/acfta.js và lib/fta.js.
 *
 * Mọi hàm thuần, không ghi tệp; CLI ở scripts/bieu-thue/*.mjs.
 */
const crypto = require('crypto');

let XLSX = null;
function xlsx() { if (!XLSX) XLSX = require('xlsx'); return XLSX; }

// ── Nhận dạng cột theo chữ tiêu đề (ghép nhiều dòng tiêu đề, không dấu, thường) ──
const bo = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();

/** Các hiệp định/cột thuế biết trước. Mẫu so với tiêu đề đã bỏ dấu. Thứ tự: mẫu dài/đặc thù trước. */
const LOAI_COT = [
  // Cột căn cứ đi kèm từng mức thuế (ghép vào mức thuế đứng trước ở tuDienCot): "Văn bản", "Ngày hiệu lực", "Ngày văn bản"
  { khoa: 'vanBan', mau: /^(van ban|so van ban|ngay van ban)$/ },
  { khoa: 'hieuLuc', mau: /^ngay hieu luc$/ },
  { khoa: 'chinhSach', mau: /chinh sach|quan ly|giay phep|kiem tra chuyen nganh|ktcn/ },
  { khoa: 'maTuongUng', mau: /tuong ung|ma cu|ma moi|khong con s/ },
  { khoa: 'ma', mau: /\b(ma hang|ma hs|ma so|hs code|hscode|ma)\b/ },
  { khoa: 'moTaEn', mau: /\b(description|english|tieng anh)\b/ },
  { khoa: 'moTaVi', mau: /(mo ta hang hoa|mo ta|ten hang|hang hoa)/ },
  { khoa: 'dvtEn', mau: /unit of quantity|\bunit\b/ },
  { khoa: 'dvt', mau: /\b(don vi tinh|dvt)\b/ },
  { khoa: 'giamVat', mau: /giam (thue )?(vat|gtgt)/ },
  { khoa: 'loaiTruNuoc', mau: /khong duoc huong|nuoc loai tru/ },
  { khoa: 'hanNgach', mau: /han ngach/ },
  { khoa: 'quyTacXuatXu', mau: /quy tac (mat hang|xuat xu)|\bpsr\b/ },
  { khoa: 'ghiChu', mau: /^ghi chu$|\bnote\b/ },
  { khoa: 'thue.xk_cptpp', mau: /\bxk\b.*(cptpp|cp tpp)|(cptpp|cp tpp).*\bxk\b/ },
  { khoa: 'thue.xk_evfta', mau: /\bxk\b.*\bev(fta)?\b|\bev(fta)?\b.*\bxk\b/ },
  { khoa: 'thue.xk_ukvfta', mau: /\bxk\b.*\bukv(fta)?\b|\bukv(fta)?\b.*\bxk\b/ },
  { khoa: 'thue.xk', mau: /\b(xuat khau|thue xk|xk)\b/ },
  { khoa: 'thue.tt', mau: /\b(thong thuong|thue tt|nk thong thuong|nk tt)\b/ },
  { khoa: 'thue.ttdb', mau: /\b(ttdb|tt db|tieu thu dac biet)\b/ },
  { khoa: 'thue.bvmt', mau: /\b(bvmt|bv mt|bao ve moi truong)\b/ },
  { khoa: 'thue.mfn', mau: /\b(uu dai|mfn|nk uu dai)\b(?!.*dac biet)/ },
  { khoa: 'thue.vat', mau: /\b(gtgt|vat|gia tri gia tang)\b/ },
  { khoa: 'thue.acfta', mau: /\bacfta\b|asean\s*-?\s*trung quoc|asean\s*-?\s*china/ },
  { khoa: 'thue.atiga', mau: /\batiga\b/ },
  { khoa: 'thue.ajcep', mau: /\bajcep\b/ },
  { khoa: 'thue.vjepa', mau: /\bvjepa\b/ },
  { khoa: 'thue.akfta', mau: /\bakfta\b/ },
  { khoa: 'thue.aanzfta', mau: /\baanzfta\b/ },
  { khoa: 'thue.aifta', mau: /\baifta\b/ },
  { khoa: 'thue.vkfta', mau: /\bvkfta\b/ },
  { khoa: 'thue.vcfta', mau: /\bvcfta\b/ },
  { khoa: 'thue.vn_eaeu', mau: /\beaeu\b|lien minh kinh te a au/ },
  { khoa: 'thue.cptpp', mau: /\bcptpp\b/ },
  { khoa: 'thue.ahkfta', mau: /\bahkfta\b/ },
  { khoa: 'thue.evfta', mau: /\bevfta\b/ },
  { khoa: 'thue.ukvfta', mau: /\bukvfta\b/ },
  { khoa: 'thue.vn_cuba', mau: /\bvncu\b|cuba/ },
  { khoa: 'thue.vn_lao', mau: /\bvn\s*-?\s*lao\b|\blao\b/ },
  { khoa: 'thue.vn_cam', mau: /\bvn\s*-?\s*cam\b|campuchia|cambodia/ },
  { khoa: 'thue.rcep', mau: /\brcept?\b/ },
  { khoa: 'thue.vifta', mau: /\bvifta\b|israel/ },
  { khoa: 'thue.chung', mau: /^thue suat( \(%\))?( \/ .{1,12})?$/ },
];
const MAU_TIEU_DE = /(ma hang|ma hs|hs code|mo ta|description|don vi|thue suat|mfn|acfta|vat|gtgt|atiga|rcep)/;
/** Nhãn mốc dưới một cột thuế gộp: năm, ngày, (I)…(VII), A–F, khoảng năm. Nhãn khác (GIC, Ghi chú…) không phải mốc. */
const MAU_MOC = /^(20\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}(\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4})?|\(?[IVX]{1,5}\)?|[A-F]|\d{4}\s*-\s*\d{4})$/;

/** Chuỗi thuế FTA → nhận diện mã hiệp định từ khoá cột ("thue.rcep" → "RCEP"). */
const tenHiepDinh = (khoa) => String(khoa).startsWith('thue.') && khoa !== 'thue.chung' ? khoa.slice(5).toUpperCase().replace('VN_', 'VN-').replace('XK_', 'XK-') : null;

/** Hiệp định suy từ tên sheet khi cột chỉ ghi "Thuế suất (%)". Trả null nếu không chắc. */
function goiYSheet(ten) {
  const k = bo(ten);
  if (/^cptpp-?xk$/.test(k)) return 'xk_cptpp';
  if (/^ev-?xk$/.test(k)) return 'xk_evfta';
  if (/^ukv-?xk$/.test(k)) return 'xk_ukvfta';
  if (/^xk$/.test(k)) return 'xk';
  if (/cptpp/.test(k)) return 'cptpp';
  if (/^ukv/.test(k)) return 'ukvfta';
  if (/vncu/.test(k)) return 'vn_cuba';
  if (/vncam/.test(k)) return 'vn_cam';
  if (/^ev/.test(k)) return 'evfta';
  if (/^rcept?-?([a-f])$/.test(k)) return `rcep@${k.slice(-1).toUpperCase()}`;
  if (/^[b-f]$/.test(k)) return `rcep@${k.toUpperCase()}`; // sheet B–F kế sau RCEPT-A trong tệp Tổng cục
  return null;
}

// ── Đọc thô ──
/**
 * Đọc mọi sheet thành dạng thô: { tep, sha256, sheets: [{ ten, pham_vi, gop: [...], dong: [{ r, o: { A: {v, w, t} } }] }] }
 * Giữ ô không rỗng; giá trị gốc v, chữ hiển thị w (định dạng Excel), kiểu t. Không tính toán gì thêm.
 */
function docTho(duong, opts = {}) {
  const X = xlsx();
  const buf = require('fs').readFileSync(duong);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const wb = X.read(buf, { type: 'buffer', cellText: true, cellDates: false, cellNF: true });
  const sheets = [];
  for (const ten of wb.SheetNames) {
    if (opts.sheets && !opts.sheets.includes(ten)) continue;
    const ws = wb.Sheets[ten];
    const ref = ws['!ref'] || 'A1:A1';
    const range = X.utils.decode_range(ref);
    const dong = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const o = {};
      let co = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = X.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell || cell.v === undefined || cell.v === null || (typeof cell.v === 'string' && cell.v.trim() === '')) continue;
        o[X.utils.encode_col(c)] = { v: cell.v, w: cell.w !== undefined ? String(cell.w) : String(cell.v), t: cell.t };
        co = true;
      }
      if (co) dong.push({ r: r + 1, o });
    }
    sheets.push({ ten, pham_vi: ref, gop: (ws['!merges'] || []).map((m) => X.utils.encode_range(m)), dong, an: Boolean(wb.Workbook?.Sheets?.find((s) => s.name === ten && s.Hidden)) });
  }
  return { tep: require('path').basename(duong), sha256, sheets };
}

const chu = (cell) => (cell ? String(cell.w ?? cell.v ?? '').trim() : '');

/** Dòng tiêu đề cột: dòng đầu tiên trong 40 dòng đầu có ≥ 3 ô khớp mẫu tiêu đề; gộp thêm các dòng tiêu đề liền sau (chưa có mã). */
function timTieuDeCot(sheet) {
  const dongs = sheet.dong;
  let bat = -1;
  for (let i = 0; i < Math.min(40, dongs.length); i++) {
    const n = Object.values(dongs[i].o).filter((c) => MAU_TIEU_DE.test(bo(chu(c)))).length;
    if (n >= 3) { bat = i; break; }
  }
  if (bat < 0) return null;
  // Tiêu đề nhiều dòng (gộp ô "Thuế suất" trên các cột con): kéo tới trước dòng dữ liệu đầu (dòng có ô giống mã hoặc có chữ mô tả dài không khớp mẫu tiêu đề).
  let ket = bat;
  for (let i = bat + 1; i < Math.min(bat + 6, dongs.length); i++) {
    const o = dongs[i].o; const vals = Object.values(o).map((c) => chu(c));
    // Mã hàng: "01.01", "3.01" (Excel bỏ số 0 đầu), "0301", "8504.21.11", 6–10 chữ số; năm 20xx KHÔNG phải mã.
    const laMa = vals.some((v) => /^(\d{1,2}\.\d{2}|\d{4}\.\d{2}(\.\d{2}){0,2}|0\d{3}|\d{6,10})$/.test(v) && !/^20\d{2}$/.test(v));
    // Dòng tiêu đề phụ: có ô khớp mẫu tiêu đề; HOẶC là dòng "năm/mốc" nằm dưới các cột tiêu đề trùng tên (vd "Thuế suất ATIGA (%)"
    // gộp trên 5 cột, dòng dưới ghi 2024, 2025, 2026…). Dòng chương/nhóm/mô tả không khớp → bắt đầu dữ liệu.
    const laTieuDe = vals.some((v) => MAU_TIEU_DE.test(bo(v)));
    // Cột chưa có tiêu đề ở các dòng tiêu đề đã nhận (ô gộp ngang chỉ có ô đầu): dòng kế mà ≥ 1 ô nằm ở cột như vậy,
    // mọi ô ngắn (năm, A–F, (I)…(VII), "2023 - 2027") và không có mã/mô tả → là dòng tiêu đề phụ.
    const daCoTieuDe = new Set(); for (let k = bat; k <= ket; k++) for (const c of Object.keys(dongs[k].o)) daCoTieuDe.add(c);
    const oChuaTieuDe = Object.entries(o).filter(([c]) => !daCoTieuDe.has(c)).map(([, cell]) => chu(cell));
    // Ô ở cột chưa có tiêu đề phải là nhãn mốc (năm, ngày, (I)…(VII), A–F, "2023 - 2027"); ô ở cột đã có tiêu đề được dài (ghi chú văn bản).
    const trenTieuDe = oChuaTieuDe.length > 0 && oChuaTieuDe.every((v) => MAU_MOC.test(v)) && !vals.some((v) => /[.:;]$/.test(v) && v.length > 3);
    if (laMa || !(laTieuDe || trenTieuDe)) break;
    ket = i;
  }
  return { tu: bat, den: ket, r: [dongs[bat].r, dongs[ket].r] };
}

/** Từ điển cột: chữ tiêu đề nguyên văn (ghép các dòng), khoá nhận dạng (hoặc null = cột lạ, vẫn giữ). */
function tuDienCot(sheet, td) {
  const X = xlsx();
  const cols = new Map();
  const colsInRange = new Set();
  for (const d of sheet.dong) for (const c of Object.keys(d.o)) colsInRange.add(c);
  // Ô gộp ở vùng tiêu đề: lan chữ sang các cột trong vùng gộp.
  const lan = {};
  for (const g of sheet.gop) {
    const rg = X.utils.decode_range(g);
    if (rg.s.r + 1 < td.r[0] || rg.s.r + 1 > td.r[1]) continue;
    const goc = sheet.dong.find((d) => d.r === rg.s.r + 1)?.o[X.utils.encode_col(rg.s.c)];
    if (!goc) continue;
    for (let c = rg.s.c; c <= rg.e.c; c++) for (let r = rg.s.r; r <= rg.e.r; r++) (lan[`${X.utils.encode_col(c)}:${r + 1}`] ||= chu(goc));
  }
  for (const col of [...colsInRange].sort((a, b) => X.utils.decode_col(a) - X.utils.decode_col(b))) {
    const parts = [];
    for (let i = td.tu; i <= td.den; i++) {
      const d = sheet.dong[i];
      const t = chu(d.o[col]) || lan[`${col}:${d.r}`] || '';
      if (t && parts[parts.length - 1] !== t) parts.push(t);
    }
    const tieuDe = parts.join(' / ');
    const k = bo(tieuDe);
    let khoa = null;
    for (const L of LOAI_COT) if (L.mau.test(k)) { khoa = L.khoa; break; }
    cols.set(col, { cot: col, tieuDe, khoa, hiepDinh: khoa ? tenHiepDinh(khoa) : null });
  }
  const list = [...cols.values()];
  // Sheet chỉ ghi "Thuế suất (%)" (CPTPP, UKV, VNCU, XK…): hiệp định suy từ TÊN SHEET (goiY) — ghi rõ trong cot.json.
  const goiY = goiYSheet(sheet.ten);
  for (const c of list) if (c.khoa === 'thue.chung' && goiY) { c.khoa = `thue.${goiY}`; c.hiepDinh = tenHiepDinh(c.khoa); c.suyTuSheet = true; }
  // Cột không tiêu đề/nhãn ngắn (A–F, (II)…) đứng ngay sau một cột thuế: cùng hiệp định, mốc = nhãn (RCEPT A–F = 6 biểu RCEP).
  for (let i = 1; i < list.length; i++) {
    const c = list[i]; const tr = list[i - 1];
    const nhan = (c.tieuDe.split(' / ').pop() || '').trim();
    if ((!c.khoa || c.khoa === 'thue.chung') && tr.khoa && tr.khoa.startsWith('thue.') && MAU_MOC.test(nhan)) { c.khoa = `${tr.khoa.split('@')[0]}@${nhan}`; c.hiepDinh = tr.hiepDinh; if (!tr.khoa.includes('@')) { const m0 = (tr.tieuDe.split(' / ').pop() || '').trim(); tr.khoa = `${tr.khoa}@${MAU_MOC.test(m0) ? m0 : 'A'}`; } }
  }
  // "Văn bản" / "Ngày hiệu lực" / "Ngày văn bản" đứng sau một mức thuế = căn cứ pháp lý + hiệu lực của chính mức đó → vanBan.<mức>…
  let mucTruoc = null;
  for (const c of list) {
    if (c.khoa && c.khoa.startsWith('thue.')) mucTruoc = c.khoa.slice(5).split('@')[0];
    else if (c.khoa === 'vanBan' && /ngay van ban/.test(bo(c.tieuDe)) && mucTruoc) c.khoa = `ngayVanBan.${mucTruoc}`;
    else if ((c.khoa === 'vanBan' || c.khoa === 'hieuLuc') && mucTruoc) c.khoa = `${c.khoa}.${mucTruoc}`;
    else if (c.khoa === 'vanBan' || c.khoa === 'hieuLuc') { c.khoaNghi = c.khoa; c.khoa = null; }
  }
  // Cột thuế trùng khoá (cùng hiệp định, nhiều năm/mốc trên dòng tiêu đề phụ): thêm hậu tố mốc "@2026" lấy từ phần tiêu đề ghép; không có mốc → @2, @3…
  const dem = {};
  for (const c of list) {
    if (!c.khoa || c.khoa.includes('@')) continue;
    if (dem[c.khoa] === undefined) { dem[c.khoa] = 1; continue; }
    dem[c.khoa] += 1;
    if (c.khoa.startsWith('thue.')) { const moc = (c.tieuDe.split(' / ').pop() || '').trim(); c.khoa = `${c.khoa}@${MAU_MOC.test(moc) ? moc : dem[c.khoa]}`; }
    else { c.khoaNghi = c.khoa; c.khoa = null; }
  }
  // Mốc cho cột thuế ĐẦU của một bộ nhiều mốc: nếu các cột sau cùng khoá gốc mang mốc thì cột đầu cũng lấy mốc của nó.
  for (const c of list) { if (c.khoa && c.khoa.startsWith('thue.') && !c.khoa.includes('@') && list.some((d) => d.khoa && d.khoa.startsWith(`${c.khoa}@`))) { const moc = (c.tieuDe.split(' / ').pop() || '').trim(); if (MAU_MOC.test(moc)) c.khoa = `${c.khoa}@${moc}`; } }
  return list;
}

const MAU_MA = /^(\d{2}|\d{4}|\d{6}|\d{8}|\d{10}|\d{2}\.\d{2}|\d{4}\.\d{2}|\d{4}\.\d{2}\.\d{2}|\d{4}\.\d{2}\.\d{2}\.\d{2}|\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2})$/;
const demGach = (s) => { const m = String(s).match(/^(\s*[-–—]\s*)+/); return m ? (m[0].match(/[-–—]/g) || []).length : 0; };
const boGach = (s) => String(s).replace(/^(\s*[-–—]\s*)+/, '').trim();

/**
 * Phân loại từng dòng dữ liệu của một sheet theo từ điển cột:
 *   dong  : có mã (ma, maChuan, soChuSo) + mọi cột (thue{}, khac{}) giữ chuỗi gốc
 *   tieuDe: không mã nhưng có chữ mô tả (tiêu đề nhóm con, dòng chương/nhóm) — gach, chữ, mã gần nhất trước/sau
 *   khac  : dòng có ô nhưng không phải hai loại trên (ghi chú, chú thích) — giữ nguyên ô
 * Không dòng nào bị bỏ: tổng dong+tieuDe+khac+tiêu đề cột = số dòng không rỗng.
 */
function phanLoaiDong(sheet, cols, td) {
  const byKhoa = {}; for (const c of cols) if (c.khoa) byKhoa[c.khoa] = c.cot;
  const colMa = byKhoa.ma, colVi = byKhoa.moTaVi, colEn = byKhoa.moTaEn;
  const dong = [], tieuDe = [], khac = [];
  // Dòng TRƯỚC tiêu đề cột (tên biểu, ngày ban hành, ghi chú đầu trang) — giữ nguyên ô, không bỏ.
  for (let i = 0; i < td.tu; i++) { const o = {}; for (const [c, cell] of Object.entries(sheet.dong[i].o)) o[c] = chu(cell); khac.push({ r: sheet.dong[i].r, o, viTri: 'TRUOC_TIEU_DE_COT' }); }
  let maTruoc = null;
  for (let i = td.den + 1; i < sheet.dong.length; i++) {
    const d = sheet.dong[i];
    const o = {}; for (const [c, cell] of Object.entries(d.o)) o[c] = chu(cell);
    const ma = colMa ? o[colMa] || '' : '';
    const maChuan = ma.replace(/\D/g, '');
    if (ma && MAU_MA.test(ma) && maChuan.length >= 2) {
      const rec = { r: d.r, ma, maChuan, soChuSo: maChuan.length, moTaVi: colVi ? o[colVi] || '' : '', moTaEn: colEn ? o[colEn] || '' : '', gach: colVi ? demGach(o[colVi] || '') : 0, thue: {}, khac: {} };
      for (const c of cols) {
        if (c.cot === colMa || c.cot === colVi || c.cot === colEn) continue;
        const v = o[c.cot]; if (v === undefined) continue;
        if (c.khoa && c.khoa.startsWith('thue.')) rec.thue[c.khoa.slice(5)] = v;
        else if (c.khoa && /^(vanBan|hieuLuc|ngayVanBan)\./.test(c.khoa)) { const [loai, muc] = c.khoa.split('.'); (rec.canCu ||= {})[muc] ||= {}; rec.canCu[muc][loai] = v; }
        else if (c.khoa === 'dvt') rec.dvt = v;
        else if (c.khoa === 'dvtEn') rec.dvtEn = v;
        else if (c.khoa === 'chinhSach') rec.chinhSach = v;
        else if (c.khoa === 'maTuongUng') rec.maTuongUng = v;
        else if (c.khoa === 'giamVat') rec.giamVat = v;
        else if (c.khoa === 'ghiChu') rec.ghiChu = v;
        else if (c.khoa) (rec.them ||= {})[c.khoa] = v;
        else rec.khac[c.cot] = v;
      }
      dong.push(rec); maTruoc = maChuan; continue;
    }
    const chuMoTa = (colVi && o[colVi]) || (colEn && o[colEn]) || '';
    if (chuMoTa) {
      const rec = { r: d.r, chu: boGach(chuMoTa), gach: demGach(chuMoTa), nguyenVan: chuMoTa, maTruoc, maSau: null, khac: {} };
      for (const [c, v] of Object.entries(o)) if (c !== colVi && c !== colEn) rec.khac[c] = v;
      if (colEn && o[colEn] && colVi && o[colVi]) rec.chuEn = boGach(o[colEn]);
      tieuDe.push(rec); continue;
    }
    // Dòng không mã, không mô tả nhưng CÓ mức thuế (XK 2026.04.05 dòng 1123: "10%. Từ 01/01/2027 áp dụng 15%" với ô mã trống,
    // cột phụ B lệch một dòng do chèn dòng): KHÔNG gán mã máy — trích sai tệ hơn không trích — giữ ô và cắm cờ để người kiểm.
    // (chỉ khi ô thuế trông như MỨC THUẾ: số/%/"*" — không phải ngày, năm hay chữ nối "đến" của dòng tiêu đề phụ)
    const laMuc = (v) => /^(\*|\d+([.,]\d+)?\s*%?)(\s|$|\.|\()/.test(v) && !MAU_MOC.test(v) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v);
    const coThue = cols.some((c) => c.khoa && c.khoa.startsWith('thue.') && o[c.cot] && laMuc(o[c.cot]));
    khac.push(coThue ? { r: d.r, o, canhBao: 'CO_THUE_KHONG_MA' } : { r: d.r, o });
  }
  // mã liền sau của mỗi tiêu đề
  let j = 0;
  for (const t of tieuDe) { while (j < dong.length && dong[j].r < t.r) j++; t.maSau = dong[j] ? dong[j].maChuan : null; }
  return { dong, tieuDe, khac };
}

/**
 * Cột KHÔNG có tiêu đề (khoa null, tieuDe rỗng) đứng ngay sau một cột thuế: suy loại từ GIÁ TRỊ (500 dòng đầu):
 * ≥ 80 % ô dạng "129/2022/NĐ-CP" → vanBan.<mức>; ≥ 80 % ô dạng ngày "30/12/2022" → hieuLuc.<mức>. Ghi suyTuGiaTri để người xem.
 * (BT2026: Văn bản/Ngày hiệu lực của RCEP nằm ở CB/CC không có chữ tiêu đề vì ô gộp RCEPT A–F.)
 */
function suyCotTheoGiaTri(sheet, cols, td) {
  const MAU_VB = /\d+\/\d{4}\/(ND|NĐ|TT|QĐ|QD|NQ)[\w-]*/i; const MAU_NGAY = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  let muc = null;
  for (const c of cols) {
    if (c.khoa && c.khoa.startsWith('thue.')) { muc = c.khoa.slice(5).split('@')[0]; continue; }
    if (c.khoa || c.tieuDe || !muc) { if (c.khoa && !/^(vanBan|hieuLuc|ngayVanBan)\./.test(c.khoa)) muc = null; continue; }
    const vals = []; for (let i = td.den + 1; i < sheet.dong.length && vals.length < 500; i++) { const v = chu(sheet.dong[i].o[c.cot]); if (v) vals.push(v); }
    if (vals.length < 20) continue;
    const vb = vals.filter((v) => MAU_VB.test(v)).length / vals.length, ng = vals.filter((v) => MAU_NGAY.test(v)).length / vals.length;
    if (vb >= 0.8) { c.khoa = `vanBan.${muc}`; c.suyTuGiaTri = true; } else if (ng >= 0.8) { c.khoa = `hieuLuc.${muc}`; c.suyTuGiaTri = true; }
  }
  return cols;
}

/** Đếm ô không rỗng của một sheet (để chứng minh bảo toàn). */
function demO(sheet) { let n = 0; for (const d of sheet.dong) n += Object.keys(d.o).length; return n; }

/** Ô đã được ghi vào kết quả có cấu trúc (tiêu đề cột + dong + tieuDe + khac). */
function demODaGhi(sheet, td, kq) {
  let n = 0;
  for (let i = td.tu; i <= td.den; i++) n += Object.keys(sheet.dong[i].o).length;
  for (const d of kq.dong) n += 1 + (d.moTaVi ? 1 : 0) + (d.moTaEn ? 1 : 0) + Object.keys(d.thue).length + Object.keys(d.khac).length + Object.keys(d.them || {}).length + Object.values(d.canCu || {}).reduce((a, x) => a + Object.keys(x).length, 0) + ['dvt', 'dvtEn', 'chinhSach', 'maTuongUng', 'giamVat', 'ghiChu'].filter((k) => d[k] !== undefined).length;
  for (const t of kq.tieuDe) n += 1 + (t.chuEn ? 1 : 0) + Object.keys(t.khac).length;
  for (const k of kq.khac) n += Object.keys(k.o).length;
  return n;
}

/**
 * Trích toàn bộ tệp: cho mỗi sheet có tiêu đề cột → cột + dòng; sheet không nhận ra tiêu đề → giữ thô trong `khongNhanRa`.
 * Không ghi tệp. `tho` lấy từ docTho().
 */
function trich(tho) {
  const out = { tep: tho.tep, sha256: tho.sha256, sheets: [], khongNhanRa: [] };
  for (const sh of tho.sheets) {
    const td = timTieuDeCot(sh);
    if (!td) { out.khongNhanRa.push({ ten: sh.ten, soDong: sh.dong.length, soO: demO(sh), mau: sh.dong.slice(0, 5) }); continue; }
    const cols = suyCotTheoGiaTri(sh, tuDienCot(sh, td), td);
    const kq = phanLoaiDong(sh, cols, td);
    const soO = demO(sh), daGhi = demODaGhi(sh, td, kq);
    out.sheets.push({ ten: sh.ten, an: sh.an, tieuDeCot: td.r, cot: cols, ...kq, baoToan: { oKhongRong: soO, oDaGhi: daGhi, du: soO === daGhi } });
  }
  return out;
}

/**
 * Nối tiêu đề (dòng không mã) vào nút cây theo chữ số (lib/hs-tree.js): tiêu đề bao các dòng mã liền sau nó cho tới khi gặp
 * tiêu đề/dòng có số gạch ≤ số gạch của nó. Nút nhận tên = nút trong cây có tập LÁ (8 số) đúng bằng tập mã 8 số dưới tiêu đề
 * (khớp hoàn toàn → `doTinCay: 'KHOP_TAP'`), hoặc tiền tố chung dài nhất của các mã đó là một nút ảo (→ 'TIEN_TO').
 * Trả { ten: { [nutId]: { tenVi, r, gach, soLa, doTinCay } }, khongNoi: [...] }.
 */
function noiTieuDeVaoCay(sheetKq, T) {
  const items = [...sheetKq.dong.map((d) => ({ loai: 'ma', ...d })), ...sheetKq.tieuDe.map((t) => ({ loai: 'td', ...t }))].sort((a, b) => a.r - b.r);
  const ten = {}; const khongNoi = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.loai !== 'td' || !it.gach) continue; // chỉ tiêu đề có gạch (nhóm con); dòng chương/nhóm không gạch bỏ qua ở đây
    const la = [];
    for (let j = i + 1; j < items.length; j++) {
      const x = items[j];
      if (x.gach <= it.gach && (x.loai === 'td' || x.soChuSo >= 8)) break;
      if (x.loai === 'ma' && x.soChuSo === 8) la.push(x.maChuan);
    }
    if (!la.length) { khongNoi.push({ r: it.r, chu: it.chu, lyDo: 'khong-co-la-8-so-ben-duoi' }); continue; }
    // nút ứng viên: tiền tố chung dài nhất
    let p = la[0]; for (const m of la) { let k = 0; while (k < p.length && p[k] === m[k]) k++; p = p.slice(0, k); }
    let nut = null; let doTinCay = null;
    for (let len = p.length; len >= 4; len--) {
      const cand = p.slice(0, len); const n = T.nodeOf(cand);
      if (!n || n.id !== cand) continue;
      const laCay = []; const walk = (id) => { const x = T.tree().nodes.get(id); if (!x) return; if (x.cap === 8) laCay.push(x.id); else (x.children || []).forEach(walk); }; walk(n.id);
      const set = new Set(la);
      if (laCay.length === set.size && laCay.every((x) => set.has(x))) { nut = n; doTinCay = 'KHOP_TAP'; break; }
      if (!nut) { nut = n; doTinCay = 'TIEN_TO'; }
      if (doTinCay === 'TIEN_TO') break;
    }
    if (!nut) { khongNoi.push({ r: it.r, chu: it.chu, lyDo: 'khong-co-nut', la }); continue; }
    if (ten[nut.id] && ten[nut.id].doTinCay === 'KHOP_TAP' && doTinCay !== 'KHOP_TAP') continue;
    ten[nut.id] = { tenVi: it.chu, ...(it.chuEn ? { tenEn: it.chuEn } : {}), r: it.r, gach: it.gach, soLa: la.length, doTinCay, suyRa: Boolean(nut.suyRa), cap: nut.cap };
  }
  return { ten, khongNoi };
}

/** Đối chiếu với tax.json hiện hành — theo TỪNG sheet (mỗi sheet FTA lặp lại mã, nên trùng chỉ tính trong một sheet). */
function doiChieu(kq, taxData) {
  const tax = new Set(Object.keys(taxData || {}));
  const theoSheet = {};
  const tatCa = new Set();
  for (const sh of kq.sheets) {
    const dem = {}; for (const d of sh.dong) if (d.soChuSo === 8) { dem[d.maChuan] = (dem[d.maChuan] || 0) + 1; tatCa.add(d.maChuan); }
    const co = new Set(Object.keys(dem));
    theoSheet[sh.ten] = { soMa8: co.size, thieuTrongSheet: [...tax].filter((m) => !co.has(m)).length, moiSoVoiTax: [...co].filter((m) => !tax.has(m)), maTrung: Object.entries(dem).filter(([, n]) => n > 1).map(([ma, lan]) => ({ ma, lan })) };
  }
  // Sheet chính = sheet có nhiều mã 8 số nhất (biểu tổng hợp); so phủ tax.json trên sheet đó.
  const chinh = kq.sheets.map((s) => s.ten).sort((a, b) => theoSheet[b].soMa8 - theoSheet[a].soMa8)[0] || null;
  const coChinh = new Set(chinh ? kq.sheets.find((s) => s.ten === chinh).dong.filter((d) => d.soChuSo === 8).map((d) => d.maChuan) : []);
  return { sheetChinh: chinh, soMa8: coChinh.size, soTax: tax.size, thieuTrongBieu: [...tax].filter((m) => !coChinh.has(m)), moiSoVoiTax: [...coChinh].filter((m) => !tax.has(m)), maTrung: chinh ? theoSheet[chinh].maTrung : [], soMa8TatCaSheet: tatCa.size, theoSheet, baoToan: kq.sheets.map((s) => ({ sheet: s.ten, ...s.baoToan })), khongNhanRa: kq.khongNhanRa.map((s) => s.ten) };
}

/** Ghi/đọc JSONL nén (tệp lớn trong data/bieu-thue). */
function ghiJsonlGz(duong, rows) { require('fs').writeFileSync(duong, require('zlib').gzipSync(rows.map((r) => JSON.stringify(r)).join('\n') + '\n')); }
function docJsonlGz(duong) { return require('zlib').gunzipSync(require('fs').readFileSync(duong)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
/** Thư mục phiên bản biểu thuế mới nhất trong data/bieu-thue (tên YYYY.MM.DD), hoặc null. */
function phienBanMoiNhat() {
  const fs = require('fs'); const { dataReadPath } = require('./data-paths');
  try { return fs.readdirSync(dataReadPath('bieu-thue')).filter((d) => /^\d{4}\.\d{2}\.\d{2}$/.test(d) && fs.existsSync(dataReadPath('bieu-thue', d, 'ten-nut.json'))).sort().pop() || null; } catch { return null; }
}

module.exports = { docTho, trich, goiYSheet, suyCotTheoGiaTri, ghiJsonlGz, docJsonlGz, phienBanMoiNhat, timTieuDeCot, tuDienCot, phanLoaiDong, noiTieuDeVaoCay, doiChieu, demO, LOAI_COT, bo, tenHiepDinh };
