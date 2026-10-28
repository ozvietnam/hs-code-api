// lib/kdtv-010124.js — soát diện kiểm dịch (thực vật/động vật) theo BẢNG TỪNG DÒNG của
// TT 01/2024/TT-BNNPTNT Phụ lục I (#494).
//
// VÌ SAO: cột `cs` của biểu thuế gắn "Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)" theo
// CẢ NHÓM 4 số (vd mọi mã 2008.xx), nhưng bảng Mục 9 của chính TT 01/2024 liệt kê
// TỪNG DÒNG — 2008.30 (vỏ cam tẩm ướp), 2008.20 (dứa)… đều KHÔNG có trong bảng
// (nhóm chế biến sâu/đóng hộp bị loại khi TT 01/2024 thay TT 11/2021). Khách hàng
// 26/10 đọc đúng văn bản gốc; hệ gắn KDTV sai chiều so với đúng văn bản mà nó dẫn.
//
// Module dựng bản đồ từng dòng từ dist oz-wiki-plhq (data/plhq-hs-index.json):
//   - dòng 8 số / 6 số → mã 8 số nằm trong diện (khớp đúng hoặc cùng nhóm 6 số);
//   - dòng 4 số (heading) → chỉ là "ô dù": nếu bảng CÓ liệt kê dòng con dưới heading đó
//     thì phép liệt kê thắng — nhóm 6 số không được nêu tên là KHÔNG thuộc diện.
// Chỉ can thiệp khi cột `cs` dẫn đúng TT 01/2024/TT-BNNPTNT cho loại kiểm dịch tương ứng
// và bảng nói ngược lại — mọi trường hợp khác trả null (không đổi hành vi).
//
// CỔNG XÁC MINH PDF (#494, rà 28/10): index CSV của oz-wiki-plhq bóc bảng bị GỘP DỒNG —
// 100/1.313 mã dẫn 01/2024 KDTV không thấy dòng trong CSV, nhưng đối chiếu PDF gốc cho thấy
// 93/100 nhóm 6 số CÓ thật trong văn bản (CSV làm mất dòng, vd 0203.12 thịt lợn) — chỉ 7 nhóm
// vắng SẠCH khỏi mọi bảng của TT 01/2024. Chỉ nhóm đã xác minh trong
// data/kdtv-010124-xac-minh.json mới được tắt KDTV; nhóm CSV thiếu nhưng PDF còn → giữ
// nguyên (sai an toàn), chờ oz-wiki-plhq bóc lại bảng.

const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const SO_HIEU = '01/2024/TT-BNNPTNT';
const PHU_LUC = 'Phụ lục I';
const LOAI = { THUC_VAT: 'KIEM_DICH_THUC_VAT', DONG_VAT: 'KIEM_DICH_DONG_VAT' };

let _xacMinh = null;
function nhomDaXacMinh() {
  if (_xacMinh === null) {
    try {
      _xacMinh = JSON.parse(fs.readFileSync(dataReadPath('kdtv-010124-xac-minh.json'), 'utf8')).nhomKhongCoTrongVanBan || {};
    } catch {
      _xacMinh = {}; // khuyết file xác minh → không tắt gì cả
    }
  }
  return _xacMinh;
}

let _idx = null;

/** Dựng chỉ mục theo heading 4 số: { rows8:Set, rows6:Map<h6,row>, headingRow, sixGroups:Set } — tách theo loại kiểm dịch. */
function index() {
  if (_idx) return _idx;
  _idx = { coBang: false, theoLoai: { [LOAI.THUC_VAT]: new Map(), [LOAI.DONG_VAT]: new Map() } };
  try {
    const raw = JSON.parse(fs.readFileSync(dataReadPath('plhq-hs-index.json'), 'utf8'));
    const doc = (raw.documents || []).find((d) => d.soHieu === SO_HIEU);
    if (!doc) return _idx;
    _idx = {
      coBang: true,
      tinhTrang: doc.tinhTrang,
      hieuLucTu: doc.hieuLucTu,
      table: doc.table || null,
      theoLoai: { [LOAI.THUC_VAT]: new Map(), [LOAI.DONG_VAT]: new Map() },
    };
    for (const r of doc.rows || []) {
      if (r.phuLuc !== PHU_LUC || !r.hs || !/^\d{4,8}$/.test(r.hs)) continue;
      const loai = r.loaiTacDong;
      if (loai !== LOAI.THUC_VAT && loai !== LOAI.DONG_VAT) continue;
      const h4 = r.hs.slice(0, 4);
      const byHeading = _idx.theoLoai[loai];
      if (!byHeading.has(h4)) byHeading.set(h4, { rows8: new Set(), rows6: new Map(), headingRow: null, sixGroups: new Set() });
      const g = byHeading.get(h4);
      if (r.hs.length === 8) {
        g.rows8.add(r.hs);
        g.sixGroups.add(r.hs.slice(0, 6));
      } else if (r.hs.length === 6) {
        g.rows6.set(r.hs, r);
        g.sixGroups.add(r.hs);
      } else {
        g.headingRow = r; // ô dù 4 số — có dieuKien loại trừ
      }
    }
  } catch {
    // Khuyết dữ liệu registry → không có căn cứ đối chiếu, trả như cũ.
  }
  return _idx;
}

/** Trạng thái 1 mã 8 số theo bảng của một loại kiểm dịch. */
function trangThai(hs8, loai) {
  const idx = index();
  if (!idx.coBang) return null;
  const g = idx.theoLoai[loai].get(hs8.slice(0, 4));
  if (!g) return { thuocDien: false, mucKhop: null, lyDoVi: `Bảng ${SO_HIEU} ${PHU_LUC} không có nhóm ${hs8.slice(0, 4)} trong diện ${loai === LOAI.THUC_VAT ? 'kiểm dịch thực vật' : 'kiểm dịch động vật'}.` };
  if (g.rows8.has(hs8)) return { thuocDien: true, mucKhop: 'HS8' };
  const h6 = hs8.slice(0, 6);
  if (g.sixGroups.has(h6)) return { thuocDien: true, mucKhop: g.rows6.has(h6) ? 'HS6' : 'HS6 (tách dòng 8 số)' };
  if (g.sixGroups.size === 0 && g.headingRow) {
    // Heading duy nhất không có dòng con → ô dù phủ cả nhóm (đọc dieuKien).
    return { thuocDien: true, mucKhop: 'HS4', dieuKien: g.headingRow.dieuKien || null };
  }
  // Bảng liệt kê từng dòng dưới heading này mà không nhóm của mã → bị loại có chủ ý.
  return { thuocDien: false, mucKhop: null, nhomConLietKe: [...g.sixGroups].sort() };
}

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

/**
 * kdtvSoatBang(hs8, csText) → null | khối dẫn chứng sửa chiều.
 * Chỉ trả khối khi cột cs dẫn TT 01/2024 cho diện kiểm dịch mà bảng từng dòng nói
 * mã này KHÔNG thuộc diện. Mã có trong bảng (08140000, 20081110…), cs không dẫn
 * TT 01/2024, hay bảng khuyết → null (không đổi gì).
 */
function kdtvSoatBang(hs, csText) {
  const hs8 = String(hs || '').replace(/\D/g, '');
  if (hs8.length !== 8) return null;
  const idx = index();
  if (!idx.coBang) return null;

  // Từng đoạn cs một — chỉ xét đoạn vừa nhắc kiểm dịch vừa dẫn đúng TT 01/2024.
  const claims = [];
  for (const seg of String(csText || '').split(';')) {
    const t = fold(seg);
    if (!/kiem dich/.test(t) || !/01\/2024\/tt-bnnptnt/.test(t)) continue;
    if (/thuc vat/.test(t)) claims.push(LOAI.THUC_VAT);
    else if (/dong vat/.test(t)) claims.push(LOAI.DONG_VAT);
  }
  if (!claims.length) return null;

  const loai = claims[0];
  const h6 = hs8.slice(0, 6);
  // Cổng xác minh: chỉ nhóm đã đối chiếu PDF gốc (vắng sạch khỏi TT 01/2024) mới được tắt.
  const xm = nhomDaXacMinh()[h6];
  if (!xm || xm.loai !== loai) return null;
  const st = trangThai(hs8, loai);
  if (!st || st.thuocDien !== false) return null;

  const tenLoai = loai === LOAI.THUC_VAT ? 'kiểm dịch thực vật' : 'kiểm dịch động vật';
  const nhomCon = st.nhomConLietKe || [];
  const lietKeVi = nhomCon.length
    ? `bảng chỉ liệt kê ${nhomCon.join(', ')} — không có nhóm ${h6}`
    : `bảng không liệt kê nhóm ${h6}`;
  return {
    thuocDien: false,
    loai,
    maHs: hs8,
    xacMinhPdf: { ghiChu: xm.ghiChu || null },
    ...(nhomCon.length ? { nhomConLietKe: nhomCon } : {}),
    lyDoVi:
      `Cột chính sách biểu thuế ghi "${tenLoai}" theo cả nhóm ${hs8.slice(0, 4)} và dẫn ${SO_HIEU}, ` +
      `nhưng ${lietKeVi} (bảng ${PHU_LUC} liệt kê TỪNG DÒNG, nhóm chế biến sâu/đóng hộp đã bị loại khi ` +
      `TT 01/2024 thay thế TT 11/2021; đã đối chiếu toàn văn PDF gốc — mã này không xuất hiện ở bất kỳ ` +
      `bảng nào của Thông tư). Theo đúng văn bản được dẫn, mã ${hs8} KHÔNG thuộc diện ${tenLoai}.`,
    canCu: {
      soHieu: SO_HIEU,
      phuLuc: PHU_LUC,
      nhom: xm.nhom || (loai === LOAI.THUC_VAT ? 'Mục 9' : null),
      hieuLucTu: idx.hieuLucTu || null,
      file: idx.table?.file || null,
      url: idx.table?.file ? `https://github.com/ozvietnam/oz-wiki-plhq/blob/main/${idx.table.file}` : null,
    },
  };
}

module.exports = { kdtvSoatBang, trangThai };
