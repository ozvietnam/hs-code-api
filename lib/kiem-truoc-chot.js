// lib/kiem-truoc-chot.js — LUẬT TẤT ĐỊNH chạy trên mã máy sắp chốt, TRƯỚC khi /api/classify cho CHOT + rủi ro THẤP (#725 lỗi 46).
//
// Ca prod 02/11: "Chân pin bấm cos … đồng mạ thiếc, bấm vào đầu dây dẫn" → 85369094 (MFN 25 %), CHOT, tin cậy 95, rủi ro THẤP,
// trong khi (a) luật "Loại khác bị trừ" của soat_to_khai bắt đúng ca này (8536.90.94 là "Loại khác", phạm vi trừ tiêu đề 8536901
// "Đầu nối và các bộ phận dùng để nối cho dây dẫn và cáp…"), và (b) chính hồ sơ có TB-TCHQ 6201/2023, 3055/2018, 3205/2018 cho
// đúng loại hàng (terminal đồng mạ thiếc) → 85369012. Engine đi đường AI (853690 chưa duyệt ranh giới) nên không ai chạy (a)/(b).
//
// Module này KHÔNG chọn mã và KHÔNG chặn: mọi kết luận là MÁY NGHI (basis HEURISTIC), không gắn nhãn GIR (luật 6), không vào
// canCuPhapLy (luật 7a). Khi bắn: bên gọi (lib/engine-loop.js) hạ CHOT → DE_XUAT, bật cờ chuyên viên (review), đưa mã đề nghị
// xem lên results / declarationOptions kèm evidence là TÊN NGUYÊN VĂN dòng/tiêu đề biểu thuế (cây HS) và số hiệu TB.
//
// Thêm (mục 4 của #725-46): lý do AI viết để LOẠI một mã / để ghi điều kiện MET mà gán cho dòng biểu thuế một chữ tên nguyên văn
// không có ("dòng này dành cho đầu nối CÓ DÂY DẪN KÈM THEO" trong khi tiêu đề là "… dùng để nối CHO dây dẫn và cáp") → gắn nhãn
// AI_CHUA_KIEM, không được làm điều kiện MET.

const T = require('./hs-tree');
const { canhBaoLuatRe, fmt8, chuan } = require('./soat-luat-re');
const { doGiongTenHang, tuCoNghia } = require('./giong-ten-hang');
const { chuanMaSong, LY_DO_MA_DA_BIET_GOP } = require('./tien-le-thay-the');

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const MA_DE_XUAT_TOI_DA = 2;
// OZV-517 — ngưỡng "CHẮC CHẮN" để mã tiền lệ TB-TCHQ được đưa lên VỊ TRÍ 1 (thay vì chỉ đề xuất ở vị trí 2):
//   · độ giống tên hàng = 1.0 ⇒ MỌI từ có nghĩa trong tên lõi tiền lệ đều có trong mô tả hàng (trùng khít);
//   · ≥ NGUONG_TU_CHUNG từ có nghĩa chung ⇒ tên lõi đủ dài, không trùng nhầm vì 1–2 từ vô nghĩa;
//   · ứng viên DUY NHẤT đạt mức đó trong tập ứng viên ⇒ không mơ hồ, không có mã cạnh tranh cùng mức.
const NGUONG_TRUNG_KHIT = 1;
const NGUONG_TU_CHUNG = 5;

let _tb = null;
let _tbChet = null;
function tienLeDb() {
  if (_tb) return _tb;
  try { _tb = require('./data').precedentsData || {}; } catch { _tb = {}; }
  return _tb;
}
function tienLeChetDaGopTheoMaSong() {
  if (_tbChet) return _tbChet;
  _tbChet = {};
  try {
    const raw = require('./data').precedentsMaChetDaGop || [];
    const listChet = Array.isArray(raw) ? raw : Object.values(raw).flat();
    for (const e of listChet) {
      if (e && e.maSong && /^\d{8}$/.test(e.maSong)) {
        if (!_tbChet[e.maSong]) _tbChet[e.maSong] = [];
        _tbChet[e.maSong].push(e);
      }
    }
  } catch { _tbChet = {}; }
  return _tbChet;
}

/** Tên nguyên văn một dòng 8 số trong cây (null nếu không có). */
const tenDong = (hs) => T.nodeOf(hs)?.tenVi || null;

/** Chuỗi tên NGUYÊN VĂN từ nhóm 4 số xuống tới dòng (cây HS, lib/hs-tree.js) — để đối chiếu chữ AI gán cho dòng. */
function chuoiTen(hs) {
  try {
    const n = T.nodeOf(hs);
    if (!n) return [];
    return [...T.ancestorsOf(hs), n].filter((x) => x.cap !== 'PHAN' && x.cap !== 2 && x.tenVi).map((x) => ({ id: x.id, tenVi: x.tenVi }));
  } catch { return []; }
}

/** Mọi tên nguyên văn trong một nhóm 4 số (tiêu đề + dòng) — phạm vi để kiểm điều kiện phủ định AI viết cho mã chốt. */
function tenTrongNhom(h4) {
  try {
    const out = [];
    for (const [id, x] of T.tree().nodes) if (String(id).startsWith(h4) && x.tenVi) out.push(x.tenVi);
    return out;
  } catch { return []; }
}

// ── (1) Luật "Loại khác" bị trừ ─────────────────────────────────────────────────────────────────────────────────────────
function luatLoaiKhac(topHs, hang) {
  try {
    return canhBaoLuatRe(topHs, hang.moTa || hang.tenHang, '').filter((c) => c.ma === 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU');
  } catch { return []; }
}

// ── (2) Tiền lệ cùng loại hàng ngược kết luận ───────────────────────────────────────────────────────────────────────────
/**
 * TB của các mã ứng viên mà TÊN HÀNG GIỐNG hàng đang phân loại (lib/giong-ten-hang.js — cổng thận trọng).
 * @returns {Map<hs, {hs, tb: Array<{so, ten, diem}>, best}>}
 */
function tienLeGiongTheoMa(codes, hang) {
  const db = tienLeDb();
  const dbChet = tienLeChetDaGopTheoMaSong();
  const out = new Map();
  for (const hs of codes) {
    const seen = new Set();
    for (const e of Array.isArray(db[hs]) ? db[hs] : []) {
      const so = String(e.tbTchqNumber || e.sourceFile || '').trim();
      if (!so || seen.has(so)) continue;
      const g = doGiongTenHang(hang, e.productName);
      if (!g.giong) continue;
      seen.add(so);
      const cur = out.get(hs) || { hs, tb: [], best: 0, bestChung: 0 };
      cur.tb.push({ so, nam: e.year || null, ten: clip(e.productName, 120), diem: g.diem, chung: g.chung });
      // OZV-517 (GĐ 13/11 — ý (3) còn nửa): so sánh CHẶT (`>`) làm mất `bestChung` khi TB sau có `diem` BẰNG (cùng 1.0)
      // nhưng `chung` NHIỀU hơn ⇒ ứng viên rơi khỏi nhóm "chắc chắn" (thiếu ≥5 từ chung) ⇒ MẤT đôn mã ⇒ A1 thấp hơn thực lực.
      if (g.diem > cur.best || (g.diem === cur.best && g.chung > cur.bestChung)) { cur.best = g.diem; cur.bestChung = g.chung; }
      out.set(hs, cur);
    }
    for (const e of Array.isArray(dbChet[hs]) ? dbChet[hs] : []) {
      const so = String(e.tbTchqNumber || e.sourceFile || '').trim();
      if (!so || seen.has(so)) continue;
      const g = doGiongTenHang(hang, e.productName);
      if (!g.giong) continue;
      seen.add(so);
      const cur = out.get(hs) || { hs, tb: [], best: 0, bestChung: 0 };
      cur.tb.push({
        so,
        nam: e.year || null,
        ten: clip(e.productName, 120),
        diem: g.diem,
        chung: g.chung,
        maDaBietGop: true,
        lyDoMaDaBietGop: e.lyDoMaDaBietGop || LY_DO_MA_DA_BIET_GOP,
      });
      // OZV-517 (ghép với #1268): `bestChung` PHẢI đi kèm `best` — nếu không, một TB của mã đã bị gộp là nguồn khớp
      // DUY NHẤT sẽ để lại `bestChung` rỗng ⇒ cờ `chung` = 0 và `chacChan` = false ⇒ mất dấu hiệu "chắc chắn"
      // (đo được: mã 19053210 — tiền lệ của mã chết khớp trùng khít 10 từ nhưng cờ `chung` rơi về 0).
      // OZV-517 (ý (3) còn nửa): cũng so BẰNG `diem` + `chung` NHIỀU hơn (xem nhánh mã sống ở trên).
      if (g.diem > cur.best || (g.diem === cur.best && g.chung > cur.bestChung)) { cur.best = g.diem; cur.bestChung = g.chung; }
      cur.maDaBietGop = true;
      cur.lyDoMaDaBietGop = e.lyDoMaBietGop || LY_DO_MA_DA_BIET_GOP;
      out.set(hs, cur);
    }
  }
  // OZV-517 (GĐ 13/11 — ý (3) còn nửa): `cur.tb` được `push` theo thứ tự duyệt, KHÔNG sắp ⇒ `tb[0]` (dùng làm `soTienLe` +
  // tên hàng trong `reason`) có thể trỏ TB khớp YẾU hơn ⇒ TRÍCH SAI tiền lệ trong lý do đưa cho khách.
  // Sắp `diem` giảm dần, tie-break `chung` giảm dần ⇒ `tb[0]` luôn là TB khớp MẠNH nhất.
  for (const cur of out.values()) cur.tb.sort((a, b) => (b.diem - a.diem) || (b.chung - a.chung));
  return out;
}

/**
 * Có TB cùng loại hàng kết luận MÃ KHÁC mã chốt (không phải dòng anh em cùng tiêu đề cha — các dòng đó tách nhau bằng tiêu chí
 * như "dưới 16 A", tên hàng của TB không phân xử được) và giống hàng HƠN mọi TB của chính mã chốt.
 */
function tienLeNguoc(topHs, codes, hang, opt = {}) {
  // OZV-517 (GĐ 13/11 — ý (5)): `chanChacChan = false` ⇒ KHÔNG ứng viên nào được gắn cờ "chắc chắn" ⇒ KHÔNG đôn mã
  // tiền lệ lên vị trí 1. Dùng khi luật "Loại khác" của #725-46 ĐANG CÓ HIỆU LỰC với mã sắp chốt: lúc đó hành vi
  // "cần hỏi" (cảnh báo + hạ DE_XUAT + mã đề xuất ở vị trí sau) PHẢI được giữ nguyên — đôn mã sẽ LẠI mất đúng hành vi đó.
  const chanChacChan = opt.chanChacChan !== false;
  const mappedMeta = new Map();
  const normCodes = [];
  for (const raw of [topHs, ...codes]) {
    const c = nz(raw);
    if (!/^\d{8}$/.test(c)) continue;
    if (T.nodeOf(c)) {
      normCodes.push(c);
      continue;
    }
    const ch = chuanMaSong(c);
    if (ch.maDaBietGop && ch.maSong && /^\d{8}$/.test(ch.maSong) && T.nodeOf(ch.maSong)) {
      normCodes.push(ch.maSong);
      mappedMeta.set(ch.maSong, { maDaBietGop: true, lyDoMaDaBietGop: ch.lyDoMaDaBietGop || LY_DO_MA_DA_BIET_GOP });
    }
  }
  const all = [...new Set(normCodes)];
  const byMa = tienLeGiongTheoMa(all, hang);
  const own = byMa.get(topHs)?.best || 0;
  const nodeTop = T.nodeOf(topHs);
  const chaTop = nodeTop?.parent || null;
  const topLaLk = Boolean(nodeTop?.loaiKhac);
  // OZV-517: đếm ứng viên TRÙNG KHÍT trong tập ứng viên — chỉ khi DUY NHẤT mới coi là "chắc chắn".
  const soTrungKhit = [...byMa.values()].filter((y) => y.best >= NGUONG_TRUNG_KHIT && (y.bestChung || 0) >= NGUONG_TU_CHUNG).length;
  return [...byMa.values()]
    .filter((x) => {
      if (x.hs === topHs || x.best <= own) return false;
      const nodeX = T.nodeOf(x.hs);
      if (!nodeX) return false;
      if (!chaTop || nodeX.parent !== chaTop) return true;
      return topLaLk && !nodeX.loaiKhac;
    })
    .map((x) => ({
      ...(mappedMeta.has(x.hs) ? { ...x, ...mappedMeta.get(x.hs) } : x),
      // OZV-517 (GĐ 13/11 — ý (5)): mã đang chốt LÀ "Loại khác" và luật "Loại khác" của #725-46 ĐANG CÓ HIỆU LỰC
      // (mô tả khớp dòng/tiêu đề bị trừ) ⇒ KHÔNG đôn mã tiền lệ lên vị trí 1: hành vi "cần hỏi" của #725-46
      // (cảnh báo + hạ DE_XUAT + mã đề xuất ở vị trí sau) phải được giữ nguyên. Ứng viên vẫn được ĐỀ XUẤT ở vị trí 2.
      // (`chanChacChan` do `kiemTruocChot` truyền vào theo kết quả `luatLoaiKhac`.)
      chacChan: chanChacChan && soTrungKhit === 1 && x.best >= NGUONG_TRUNG_KHIT && (x.bestChung || 0) >= NGUONG_TU_CHUNG,
    }))
    // OZV-517 (GĐ 13/11 — ý (4)): ưu tiên `chacChan` TRƯỚC khi so `best` — khi nhiều ứng viên cùng `best = 1.0`, ứng viên
    // DUY NHẤT đạt `chacChan` (≥5 từ chung) có thể bị cắt bởi trần `MA_DE_XUAT_TOI_DA = 2` ⇒ mất đôn mã ⇒ A1 thấp hơn thực lực.
    // Mạnh trước, nhiều TB sau: mã khớp TRÙNG KHÍT phải còn được giữ trong deXuat (giới hạn 2 mã).
    .sort((a, b) => (Number(Boolean(b.chacChan)) - Number(Boolean(a.chacChan))) || (b.best - a.best) || (b.tb.length - a.tb.length));
}

// ── (4) Lý do AI gán cho dòng một chữ tên nguyên văn không có ────────────────────────────────────────────────────────────
const TU_CHUNG = new Set(['hàng', 'dòng', 'sản', 'phẩm', 'mặt', 'mã', 'phân', 'nhóm', 'tiêu', 'đề', 'chủ', 'yếu', 'thường']);
const PHAM_VI = /(?:dành cho|chỉ (?:áp dụng |dùng )?cho|chỉ (?:bao )?gồm|chỉ là|áp dụng cho|là loại|thuộc loại|dùng riêng cho)\s+([^,.;:()]{3,120})/iu;
const PHU_DINH = /^\s*(?:hàng\s+|sản phẩm\s+|mặt hàng\s+)?(?:không|ko|chưa|not)\s+(?:phải là|phải|thuộc|là|có|gồm)\s+([^,.;:()]{3,160})/iu;

const capTu = (ds) => { const out = []; for (let i = 0; i + 1 < ds.length; i += 1) out.push(`${ds[i]} ${ds[i + 1]}`); return out; };

/**
 * Cụm X (chữ AI mô tả một dòng biểu thuế) có KHỚP tên nguyên văn ở ≥ 1 cặp từ (tức là đang nói về dòng đó) nhưng có từ tên
 * nguyên văn không có → trả các từ thừa; ngược lại null.
 */
function tuKhongCo(x, tenNguyenVan) {
  const ten = ` ${chuan(tenNguyenVan.join(' | '))} `;
  const tu = tuCoNghia(x);
  if (tu.length < 2) return null;
  const khopCap = capTu(tu).some((c) => ten.includes(` ${c} `));
  if (!khopCap) return null;
  const thua = [...new Set(tu.filter((w) => w.length >= 3 && !ten.includes(` ${w} `) && !TU_CHUNG.has(w)))];
  return thua.length ? thua : null;
}

/** Mã thay thế AI loại với lý do "dòng này dành cho X" mà X có chữ tên nguyên văn không có → nhãn AI_CHUA_KIEM. */
function kiemLyDoLoai(alt) {
  const m = String(alt?.reason || alt?.whyNot || '').match(PHAM_VI);
  if (!m) return null;
  const chuoi = chuoiTen(nz(alt.hs));
  if (!chuoi.length) return null;
  const thua = tuKhongCo(m[1], chuoi.map((c) => c.tenVi));
  if (!thua) return null;
  const goc = chuoi.filter((c) => c.id !== chuoi[0].id).map((c) => `${c.id} "${c.tenVi}"`).join(' › ') || `${chuoi[0].id} "${chuoi[0].tenVi}"`;
  return {
    nguonLoai: 'AI_CHUA_KIEM',
    cumAiViet: clip(m[1], 120),
    tuKhongCoTrongTen: thua,
    tenNguyenVan: goc,
    ghiChu: `Lý do loại do AI viết gán cho dòng ${nz(alt.hs)} chữ "${thua.join('", "')}" mà tên nguyên văn biểu thuế không có — chưa kiểm, không làm căn cứ loại mã này.`,
  };
}

/**
 * Điều kiện MET dạng PHỦ ĐỊNH ("Hàng không phải đầu nối có cáp hoặc dây dẫn kèm theo") mà cụm sau phủ định nói về một dòng
 * biểu thuế (khớp tên nguyên văn ≥ 1 cặp từ) nhưng thêm chữ tên nguyên văn trong nhóm không có → hạ UNKNOWN, nhãn AI_CHUA_KIEM.
 * @returns {Array} điều kiện đã kiểm (bản sao) — không đổi điều kiện khác.
 */
function kiemDieuKien(conditions, topHs, altCodes = []) {
  const list = Array.isArray(conditions) ? conditions : [];
  if (!list.length || !/^\d{8}$/.test(topHs)) return list;
  const pham = [...tenTrongNhom(topHs.slice(0, 4)), ...altCodes.flatMap((c) => chuoiTen(c).map((x) => x.tenVi))];
  return list.map((c) => {
    if (String(c?.status || '').toUpperCase() !== 'MET') return c;
    const m = String(c.fact || '').match(PHU_DINH);
    if (!m) return c;
    const thua = tuKhongCo(m[1], pham);
    if (!thua) return c;
    return { ...c, status: 'UNKNOWN', nguonLoai: 'AI_CHUA_KIEM', tuKhongCoTrongTen: thua, ghiChu: `Điều kiện do AI viết gán cho dòng biểu thuế chữ "${thua.join('", "')}" mà tên nguyên văn không có — chưa kiểm, không tính ĐẠT.` };
  });
}

/**
 * kiemTruocChot({ topHs, hang:{tenHang, moTa}, ungVien:[hs] }) → { coCo, canhBao[], deXuat[] }
 *   ungVien: mã ứng viên đã có trong lượt (results, mã thay thế AI, mã tiền lệ trong hồ sơ) — để tìm TB cùng loại hàng.
 *   canhBao: [{ ma, noiDung, evidence[], maDeNghiXem[], nguon[], basis:'HEURISTIC' }]
 *   deXuat:  [{ hs, reason, source, evidence[] }] ≤ MA_DE_XUAT_TOI_DA — mã đề nghị xem (tiền lệ cùng loại trước, luật sau).
 */
function kiemTruocChot({ topHs, hang, ungVien = [] } = {}) {
  const top = nz(topHs);
  const rong = { coCo: false, canhBao: [], deXuat: [] };
  if (!/^\d{8}$/.test(top) || !hang || !(hang.tenHang || hang.moTa)) return rong;
  const canhBao = [];
  const deXuat = new Map();
  const them = (hs, reason, source, evidence, extra = {}) => {
    if (hs !== top && /^\d{8}$/.test(hs) && T.nodeOf(hs) && !deXuat.has(hs)) {
      deXuat.set(hs, { hs, reason: clip(reason, 400), source, evidence, ...extra });
    }
  };

  const lk = luatLoaiKhac(top, hang);
  const codes = [...ungVien.map(nz), ...lk.flatMap((c) => c.maDeNghiXem || [])].filter((c) => /^\d{8}$/.test(c));
  // OZV-517 (ý (5)): luật "Loại khác" của #725-46 có hiệu lực với mã sắp chốt ⇒ KHÔNG đôn mã tiền lệ lên vị trí 1.
  const nguoc = tienLeNguoc(top, codes, hang, { chanChacChan: lk.length === 0 });

  for (const x of nguoc.slice(0, MA_DE_XUAT_TOI_DA)) {
    const ds = x.tb.slice(0, 4).map((t) => `${t.so}${t.nam ? ` (${t.nam})` : ''}`).join(', ');
    const ev = [
      ...x.tb.slice(0, 4).map((t) => `${t.so}: "${t.ten}" → ${fmt8(x.hs)} (độ giống tên hàng ${t.diem})`),
      `tên dòng ${fmt8(x.hs)} trong biểu thuế (nguyên văn): "${chuoiTen(x.hs).slice(1).map((c) => c.tenVi).join(' › ')}"`,
      `mã máy chốt ${fmt8(top)}: ${tenDong(top) ? `"${tenDong(top)}"` : '—'}; không có TB cùng loại hàng nào kết luận mã này giống hơn`,
    ];
    const extraGop = x.maDaBietGop ? { maDaBietGop: true, lyDoMaDaBietGop: x.lyDoMaDaBietGop || LY_DO_MA_DA_BIET_GOP } : {};
    canhBao.push({
      ma: 'TIEN_LE_CUNG_LOAI_KHAC_MA',
      noiDung: `Tiền lệ cùng loại hàng ngược kết luận: ${x.tb.length} TB-TCHQ (${ds}) có tên hàng giống hàng đang phân loại kết luận ${fmt8(x.hs)}, máy chốt ${fmt8(top)}. Tiền lệ là tín hiệu, không phải căn cứ GIR — chuyên viên đối chiếu.`,
      evidence: ev,
      maDeNghiXem: [x.hs],
      nguon: [{ duongDan: 'data/precedents.json' }, { duongDan: 'lib/giong-ten-hang.js#doGiongTenHang' }],
      basis: 'HEURISTIC',
      ...extraGop,
    });
    them(x.hs, `Dòng ${fmt8(x.hs)} (nguyên văn): "${chuoiTen(x.hs).slice(1).map((c) => c.tenVi).join(' › ')}". Tiền lệ cùng loại hàng: ${ds} kết luận mã này cho "${x.tb[0].ten}".`, 'kiem-truoc-chot:tien-le', ev, { ...extraGop, chacChan: Boolean(x.chacChan), diem: x.best, chung: x.bestChung || 0, soTienLe: x.tb[0]?.so || null });
  }
  for (const c of lk) {
    canhBao.push({ ma: c.ma, noiDung: c.noiDung, evidence: c.evidence, maDeNghiXem: c.maDeNghiXem, nguon: c.nguon, basis: 'HEURISTIC' });
    const laCon = (c.maDeNghiXem || []).filter((hs) => /^\d{8}$/.test(hs));
    // Trong các dòng của tiêu đề bị trừ: dòng có TB cùng loại hàng đứng trước (đã thêm ở trên), sau đó các dòng có tên.
    for (const hs of laCon) {
      const goc = chuoiTen(hs).slice(1).map((x) => x.tenVi).join(' › ');
      them(hs, `Dòng ${fmt8(hs)} (nguyên văn): "${goc}". Luật "Loại khác" bị trừ (máy, không AI): ${fmt8(top)} là dòng "Loại khác", phạm vi TRỪ ${c.nut} "${T.nodeOf(c.nut)?.tenVi || ''}".`, 'kiem-truoc-chot:loai-khac', c.evidence);
    }
  }
  const dx = [...deXuat.values()].slice(0, MA_DE_XUAT_TOI_DA);
  return { coCo: canhBao.length > 0, canhBao, deXuat: dx };
}

module.exports = { kiemTruocChot, kiemLyDoLoai, kiemDieuKien, tienLeNguoc, luatLoaiKhac, tuKhongCo, chuoiTen, MA_DE_XUAT_TOI_DA, _reset: () => { _tb = null; } };
