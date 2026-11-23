// lib/cong-adr-0004.js — CỔNG MÁY KIỂM QUY TRÌNH PHÂN LOẠI CHUẨN 6 QUY TẮC (ADR-0004, mục 3).
//
// Tất định, không gọi LLM, không mạng, không ghi data/. KHÔNG tự nối vào đường khách (tuân L1 & phân pha):
// dùng để kiểm đầu ra / vệt phân loại của động cơ mới, công cụ soát và bộ test máy.
//
// Năm chốt chặn cứng theo docs/decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md §3:
//   1. THIEU_TRICH_LUAT_TANG           — mỗi tầng đã chốt (4 / 6 / 8 số) phải có trích dẫn luật nguyên văn, hoặc DUNG_HOI
//   2. QT3_THUA_KHI_QT1_DU             — cấm viện dẫn Quy tắc 3 (3a/3b/3c) khi Quy tắc 1 đã chọn ra đúng 1 nhóm
//   3. TIEN_LE_LAM_CAN_CU_CHINH        — cấm lấy tiền lệ (TB-TCHQ / tờ khai Oz) làm căn cứ chính phân loại
//   4. BO_PHAN_THIEU_KIEM_LOAI_TRU_PXVI — bộ phận máy rơi vào Phần XV (Ch.72–83) bắt buộc đã kiểm loại trừ Phần XV & CG2 Phần XVI
//   5. CHOT_KHI_THIEU_DU_KIEN_LUAT     — thiếu dữ kiện mà điều kiện luật đòi hỏi ⇒ bắt buộc DUNG_HOI, cấm CHOT
// Cộng một kiểm tra thứ tự bước khi hồ sơ có vết `cacBuoc`:
//   6. SAI_THU_TU_BUOC                 — đối chiếu tiền lệ không được đứng trước B1; B6 không được đứng trước B1; không chạy B2–B5 khi QT1 đã đủ 1 nhóm.
'use strict';

const MA_LOI = Object.freeze({
  THIEU_TRICH_LUAT_TANG: 'Mỗi tầng đã chốt (nhóm 4 số, phân nhóm 6 số, dòng 8 số) phải kèm câu trích luật nguyên văn (nguon + trich ≥ 6 ký tự) hoặc dừng-hỏi (DUNG_HOI).',
  TRICH_KHONG_NGUYEN_VAN: 'Câu trích luật không tìm thấy nguyên văn trong văn bản nguồn đã cung cấp.',
  QT3_THUA_KHI_QT1_DU: 'Cấm viện dẫn Quy tắc 3 (3a/3b/3c) khi Quy tắc 1 đã khoanh còn đúng 1 nhóm.',
  TIEN_LE_LAM_CAN_CU_CHINH: 'Tiền lệ (TB-TCHQ, tờ khai Oz) chỉ dùng để đối chiếu cuối quy trình, không được làm căn cứ pháp lý chính.',
  BO_PHAN_THIEU_KIEM_LOAI_TRU_PXVI: 'Hàng là bộ phận / có máy chủ mà chốt vào Phần XV (Chương 72–83) bắt buộc phải kiểm loại trừ bộ phận có công dụng chung (Chú giải 1(f) Phần XV / 1(g) Phần XVI) và Chú giải 2 Phần XVI (2a → 2b → 2c).',
  CHOT_KHI_THIEU_DU_KIEN_LUAT: 'Còn thiếu dữ kiện mà điều kiện luật đòi hỏi ⇒ bắt buộc DUNG_HOI, không được CHOT / DE_XUAT.',
  SAI_THU_TU_BUOC: 'Thứ tự bước trái ADR-0004 (phải đi B0 → B1 → [B2–B5 nếu QT1 chưa đủ] → B6 → DOI_CHIEU_TIEN_LE).',
});

const RE_QT3 = /\b(?:qt|gir|quy\s*t[aắ]c)\s*3(?:\s*\(?[abc]\)?)?\b|^3\s*\(?[abc]\)?$/iu;
const RE_NGUON_TIEN_LE = /(?:^|[\s:/_-])(?:tien[_\s-]?le|tb[_\s-]?tchq|tb[_\s-]?chq|tb[_\s-]?kdhq|oz[_\s-]?precedent|to[_\s-]?khai[_\s-]?oz|precedent)(?:$|[\s:/_-])/iu;
const RE_TIEN_LE_LOAI = /^(?:TIEN_LE|TB[-_]?TCHQ|TB[-_]?CHQ|TB[-_]?KDHQ|TO_KHAI_OZ|OZ)$/i;
const CHUONG_PHAN_XV = new Set(['72', '73', '74', '75', '76', '78', '79', '80', '81', '82', '83']);
const TRICH_TOI_THIEU = 6;
const THU_TU_BUOC = Object.freeze({
  B0: 0,
  B1: 1,
  B2: 2,
  B3: 3,
  B4: 4,
  B5: 5,
  B6: 6,
  DOI_CHIEU_TIEN_LE: 7,
});

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const chuanChu = (s) => String(s || '')
  .normalize('NFC')
  .replace(/[“”„‟«»]/g, '"')
  .replace(/[‘’‚‛]/g, "'")
  .replace(/[–—−]/g, '-')
  .replace(/\s+/g, ' ')
  .trim();
const chuanSo = (s) => chuanChu(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();

function laCanCuTienLe(c) {
  if (!c || typeof c !== 'object') return false;
  if (RE_TIEN_LE_LOAI.test(String(c.loai || c.stream || '').trim())) return true;
  if (RE_NGUON_TIEN_LE.test(String(c.nguon || c.ref || '').trim())) return true;
  return false;
}

function kiemTrichHopLe(c, nguonVanBan) {
  if (!c || typeof c !== 'object') return { ok: false, lyDo: 'thiếu đối tượng căn cứ' };
  const nguon = String(c.nguon || c.ref || '').trim();
  const trich = chuanChu(c.trich || c.nguyenVan || c.evidence || '');
  if (!nguon) return { ok: false, lyDo: 'thiếu mã nguồn (nguon)' };
  if (trich.length < TRICH_TOI_THIEU) return { ok: false, lyDo: `câu trích quá ngắn (${trich.length} < ${TRICH_TOI_THIEU} ký tự)` };
  if (nguonVanBan && Object.prototype.hasOwnProperty.call(nguonVanBan, nguon)) {
    const goc = chuanSo(nguonVanBan[nguon]);
    const manh = trich.split(/…|\.\.\./).map(chuanSo).filter(Boolean);
    if (!manh.length) return { ok: false, lyDo: 'câu trích rỗng sau chuẩn hoá' };
    let pos = 0;
    for (const m of manh) {
      const idx = goc.indexOf(m, pos);
      if (idx < 0) return { ok: false, ma: 'TRICH_KHONG_NGUYEN_VAN', lyDo: `không tìm thấy nguyên văn "${m.slice(0, 60)}" trong ${nguon}` };
      pos = idx + m.length;
    }
  }
  return { ok: true };
}

/**
 * Kiểm tra một bản ghi kết luận / vệt phân loại theo 5 cổng cứng + thứ tự bước của ADR-0004.
 *
 * @param {object} banGhi
 * @param {string} [banGhi.ketLuan]             'CHOT' | 'DE_XUAT' | 'DUNG_HOI' | 'NEED_FACTS'
 * @param {string} [banGhi.maHs]                mã HS kết luận (4, 6 hoặc 8 số)
 * @param {object} [banGhi.tang]                { tang4?: TangObj, tang6?: TangObj, tang8?: TangObj }
 *                                              với TangObj = { ma?: string, trangThai?: 'CHOT'|'DUNG_HOI', canCu?: Array<{nguon, trich, loai?}> }
 * @param {number} [banGhi.qt1SoNhom]           số nhóm ứng viên còn lại sau bước Quy tắc 1 (B1)
 * @param {string[]} [banGhi.ungVienSauQt1]     danh sách nhóm 4 số còn lại sau B1 (dùng nếu không truyền qt1SoNhom)
 * @param {string[]} [banGhi.quyTacApDung]      danh sách quy tắc viện dẫn (vd ['QT1', 'QT6'])
 * @param {Array<object>} [banGhi.canCuChinh]   căn cứ pháp lý chính cấp toàn cục (tuỳ chọn; không được chỉ gồm tiền lệ)
 * @param {boolean} [banGhi.laBoPhan]           hàng là bộ phận / linh kiện
 * @param {string} [banGhi.mayChu]              máy chủ (B0) nếu hàng là bộ phận
 * @param {object} [banGhi.kiemBoPhan]          { daKiemChuGiai1fPhanXV?: boolean, daKiemBoPhanCongDungChung?: boolean, daKiemChuGiai2PhanXVI?: boolean }
 * @param {Array<string|object>} [banGhi.duKienBatBuocThieu] dữ kiện luật đòi hỏi nhưng chưa có
 * @param {string[]} [banGhi.cacBuoc]           danh sách bước đã chạy theo thứ tự (vd ['B0', 'B1', 'B6', 'DOI_CHIEU_TIEN_LE'])
 * @param {{nguonVanBan?: Record<string, string>}} [tuyChon]
 * @returns {{dat: boolean, loi: Array<{ma: string, tang?: string, chiTiet: string}>}}
 */
function kiemCongAdr0004(banGhi, tuyChon = {}) {
  const loi = [];
  if (!banGhi || typeof banGhi !== 'object') {
    return { dat: false, loi: [{ ma: 'THIEU_TRICH_LUAT_TANG', chiTiet: 'Bản ghi đầu vào rỗng hoặc không phải đối tượng.' }] };
  }
  const nguonVanBan = tuyChon?.nguonVanBan || null;
  const ketLuan = String(banGhi.ketLuan || '').trim().toUpperCase();
  const laDungHoi = ketLuan === 'DUNG_HOI' || ketLuan === 'NEED_FACTS';
  const maHs = so(banGhi.maHs);

  // ── 1. Cổng trích luật theo tầng (4 / 6 / 8 số) + 3. Cổng cấm tiền lệ làm căn cứ chính ──
  const tang = banGhi.tang || {};
  const cacTang = [
    ['tang4', 4],
    ['tang6', 6],
    ['tang8', 8],
  ];
  let coTangKiem = false;
  for (const [tenTang, doDai] of cacTang) {
    const t = tang[tenTang];
    const maTang = so(t?.ma || (maHs.length >= doDai ? maHs.slice(0, doDai) : ''));
    const tangDungHoi = String(t?.trangThai || '').toUpperCase() === 'DUNG_HOI';
    if (!t && (laDungHoi || maHs.length < doDai)) continue;
    if (tangDungHoi) continue;
    if (!maTang && !t) continue;

    coTangKiem = true;
    const dsCanCu = Array.isArray(t?.canCu) ? t.canCu : [];
    const canCuLuat = dsCanCu.filter((c) => !laCanCuTienLe(c));
    const canCuTienLe = dsCanCu.filter(laCanCuTienLe);

    if (canCuTienLe.length > 0 && canCuLuat.length === 0) {
      loi.push({
        ma: 'TIEN_LE_LAM_CAN_CU_CHINH',
        tang: tenTang,
        chiTiet: `Tầng ${tenTang} (${maTang || '?'}) chỉ dựa vào tiền lệ, không có căn cứ pháp lý (chú giải / lời nhóm / phân nhóm).`,
      });
    } else if (canCuTienLe.length > 0) {
      loi.push({
        ma: 'TIEN_LE_LAM_CAN_CU_CHINH',
        tang: tenTang,
        chiTiet: `Tầng ${tenTang} (${maTang || '?'}) trộn tiền lệ vào mảng căn cứ pháp lý; tiền lệ phải tách sang doiChieuTienLe.`,
      });
    }

    if (canCuLuat.length === 0) {
      loi.push({
        ma: 'THIEU_TRICH_LUAT_TANG',
        tang: tenTang,
        chiTiet: `Tầng ${tenTang} (${maTang || '?'}) chưa có câu trích luật nguyên văn (hoặc phải đặt trangThai = DUNG_HOI).`,
      });
      continue;
    }

    let hopLe = 0;
    for (const c of canCuLuat) {
      const k = kiemTrichHopLe(c, nguonVanBan);
      if (k.ok) hopLe += 1;
      else {
        loi.push({
          ma: k.ma || 'THIEU_TRICH_LUAT_TANG',
          tang: tenTang,
          chiTiet: `Tầng ${tenTang} (${maTang || '?'}): ${k.lyDo}.`,
        });
      }
    }
    if (hopLe === 0 && !loi.some((x) => x.tang === tenTang && (x.ma === 'THIEU_TRICH_LUAT_TANG' || x.ma === 'TRICH_KHONG_NGUYEN_VAN'))) {
      loi.push({
        ma: 'THIEU_TRICH_LUAT_TANG',
        tang: tenTang,
        chiTiet: `Tầng ${tenTang} (${maTang || '?'}) không có câu trích luật hợp lệ.`,
      });
    }
  }

  // Nếu bản ghi CHOT/DE_XUAT mà không khai bất kỳ tầng nào cũng không có canCuChinh
  const canCuChinh = Array.isArray(banGhi.canCuChinh) ? banGhi.canCuChinh : [];
  if (canCuChinh.length > 0) {
    const chiTienLe = canCuChinh.every(laCanCuTienLe);
    if (chiTienLe || canCuChinh.some(laCanCuTienLe)) {
      loi.push({
        ma: 'TIEN_LE_LAM_CAN_CU_CHINH',
        chiTiet: chiTienLe
          ? 'canCuChinh chỉ gồm tiền lệ — trái ADR-0004 (tiền lệ chỉ đối chiếu cuối quy trình).'
          : 'canCuChinh chứa tiền lệ — phải tách tiền lệ sang doiChieuTienLe.',
      });
    }
  }
  if (!laDungHoi && !coTangKiem && maHs.length >= 4) {
    loi.push({
      ma: 'THIEU_TRICH_LUAT_TANG',
      tang: 'tang4',
      chiTiet: `Kết luận ${ketLuan || 'CHOT'} mã ${maHs} nhưng không có cấu trúc trích luật theo tầng.`,
    });
  }

  // ── 2. Cổng cấm viện dẫn QT3 khi QT1 đã khoanh còn 1 nhóm ──
  const qt1SoNhom = Number.isInteger(banGhi.qt1SoNhom)
    ? banGhi.qt1SoNhom
    : (Array.isArray(banGhi.ungVienSauQt1) ? new Set(banGhi.ungVienSauQt1.map((x) => so(x).slice(0, 4)).filter((x) => x.length === 4)).size : null);
  const quyTac = Array.isArray(banGhi.quyTacApDung) ? banGhi.quyTacApDung : [];
  if (qt1SoNhom === 1) {
    const qt3 = quyTac.filter((q) => RE_QT3.test(String(q || '').trim()));
    if (qt3.length > 0) {
      loi.push({
        ma: 'QT3_THUA_KHI_QT1_DU',
        chiTiet: `QT1 đã khoanh còn đúng 1 nhóm nhưng vẫn viện dẫn ${qt3.join(', ')}.`,
      });
    }
  }

  // ── 4. Cổng bộ phận rơi vào Phần XV (Chương 72–83) ──
  const laBoPhan = banGhi.laBoPhan === true || Boolean(String(banGhi.mayChu || '').trim());
  const chuong = (maHs || so(tang?.tang4?.ma)).slice(0, 2);
  if (!laDungHoi && laBoPhan && CHUONG_PHAN_XV.has(chuong)) {
    const kb = banGhi.kiemBoPhan || {};
    const daKiemPhanXV = kb.daKiemChuGiai1fPhanXV === true || kb.daKiemBoPhanCongDungChung === true;
    const daKiemCG2 = kb.daKiemChuGiai2PhanXVI === true;
    if (!daKiemPhanXV || !daKiemCG2) {
      const thieu = [];
      if (!daKiemPhanXV) thieu.push('Chú giải 1(f) Phần XV / bộ phận có công dụng chung');
      if (!daKiemCG2) thieu.push('Chú giải 2 Phần XVI (2a → 2b → 2c)');
      loi.push({
        ma: 'BO_PHAN_THIEU_KIEM_LOAI_TRU_PXVI',
        tang: 'tang4',
        chiTiet: `Bộ phận chốt vào Chương ${chuong} (Phần XV) nhưng thiếu bước kiểm: ${thieu.join(' và ')}.`,
      });
    }
  }

  // ── 5. Cổng dừng-hỏi khi thiếu dữ kiện điều kiện luật ──
  const thieuDuKien = Array.isArray(banGhi.duKienBatBuocThieu) ? banGhi.duKienBatBuocThieu.filter(Boolean) : [];
  if (thieuDuKien.length > 0 && !laDungHoi) {
    loi.push({
      ma: 'CHOT_KHI_THIEU_DU_KIEN_LUAT',
      chiTiet: `Còn thiếu ${thieuDuKien.length} dữ kiện điều kiện luật (${thieuDuKien.slice(0, 3).map((x) => (typeof x === 'string' ? x : x.khoa || x.ten || JSON.stringify(x))).join(', ')}) nhưng ketLuan = "${ketLuan || 'CHOT'}" thay vì DUNG_HOI.`,
    });
  }

  // ── 6. Thứ tự bước ADR-0004 (khi hồ sơ có cacBuoc) ──
  if (Array.isArray(banGhi.cacBuoc) && banGhi.cacBuoc.length > 0) {
    const buoc = banGhi.cacBuoc.map((b) => String(b || '').trim().toUpperCase());
    const idxB1 = buoc.indexOf('B1');
    const idxB6 = buoc.indexOf('B6');
    const idxTL = buoc.indexOf('DOI_CHIEU_TIEN_LE');
    if (idxTL >= 0 && (idxB1 < 0 || idxTL < idxB1)) {
      loi.push({ ma: 'SAI_THU_TU_BUOC', chiTiet: 'DOI_CHIEU_TIEN_LE chạy trước B1 (hoặc thiếu B1) — tiền lệ chỉ được đối chiếu ở cuối quy trình.' });
    }
    if (idxB6 >= 0 && (idxB1 < 0 || idxB6 < idxB1)) {
      loi.push({ ma: 'SAI_THU_TU_BUOC', chiTiet: 'B6 (phân nhóm 6 số) chạy trước B1 (chọn nhóm 4 số).' });
    }
    if (qt1SoNhom === 1 && buoc.some((b) => ['B2', 'B3', 'B4', 'B5'].includes(b))) {
      loi.push({ ma: 'SAI_THU_TU_BUOC', chiTiet: 'QT1 đã chọn ra 1 nhóm nhưng vẫn chạy B2–B5.' });
    }
    let truoc = -1;
    for (const b of buoc) {
      if (!Object.prototype.hasOwnProperty.call(THU_TU_BUOC, b)) continue;
      if (THU_TU_BUOC[b] < truoc) {
        loi.push({ ma: 'SAI_THU_TU_BUOC', chiTiet: `Thứ tự bước đảo ngược tại "${b}" trong [${buoc.join(' → ')}].` });
        break;
      }
      truoc = THU_TU_BUOC[b];
    }
  }

  return { dat: loi.length === 0, loi };
}

module.exports = {
  MA_LOI,
  CHUONG_PHAN_XV,
  THU_TU_BUOC,
  kiemCongAdr0004,
  laCanCuTienLe,
  kiemTrichHopLe,
};
