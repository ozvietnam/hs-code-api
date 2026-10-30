/**
 * Gói căn cứ theo mặt hàng (#337, job H1) — lõi chung của soát tờ khai và soạn hồ sơ giải trình.
 *
 * Với 1–2 mã HS 8 số + mô tả hàng, gom ĐỦ căn cứ có kiểm chứng mà hệ thống đang giữ, KHÔNG gọi LLM:
 *   viTri       cây HS theo chữ số (lib/hs-tree.js qua so-tay-runtime#viTri) + tên dòng nguyên văn biểu thuế
 *   chuGiai     chú giải phần/chương/nhóm NGUYÊN VĂN (data/chu-giai-*.json) + SEN AHTN (lib/sen.js)
 *   loaiKhac    phạm vi dòng "Loại khác" = cha trừ anh em có tên (so-tay-runtime#loaiKhac)
 *   gir         CHỈ từ lib/gir.js#determineGir (luật bất biến 6) — mỗi mục có basis/evidence/source
 *   canCuPhapLy CHỈ từ lib/legal-basis.js (luật 7a): canCuPhapLy() + canCuHoSo()
 *   yKienWco    lib/wco-op.js#byHs/view (đã qua cổng mã/thứ tự), kèm banQuyen + xemToanVan
 *   tienLe      TB-TCHQ + tiền lệ quốc tế trong data/precedents.json, kèm nhãn xác minh nguồn
 *   capDeNham   data/conflicts.json + bảng quyết định qua lib/conflict-resolver.js
 *   thue        đúng shape /api/tax (lib/tax-lookup.js#buildTaxLookup)
 *
 * BẤT BIẾN: mọi phần LUÔN có mặt và là object có `trangThai`. Danh sách nằm ở `items` và chỉ có khi không rỗng.
 * Phần nào không tra được → `{ trangThai: 'CHUA_TRA_CUU', ghiChu }`; không có tiền lệ → `KHONG_CO_TIEN_LE_KHOP`.
 * Thiếu một phần không bao giờ được hiểu thành "không có" — mảng rỗng im lặng là lỗi.
 * Module chỉ đọc data/, không ghi gì.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');
const { taxData, precedentsData, conflictsData } = require('./data');
const T = require('./hs-tree');
const soTay = require('./so-tay-runtime');
const gir = require('./gir');
const legal = require('./legal-basis');
const wcoOp = require('./wco-op');
const { senFor } = require('./sen');
const { notesCoverage } = require('./notes-coverage');
const { searchPrecedents } = require('./precedent-search');
const { resolveConflict } = require('./conflict-resolver');
const { buildTaxLookup } = require('./tax-lookup');
const { tariffInfo } = require('./data-freshness');
const { loadJson } = require('./data-cache');

const PHIEN_BAN_GOI = 'evidence-pack@2026-10-17';
const SECTIONS = ['viTri', 'chuGiai', 'loaiKhac', 'gir', 'canCuPhapLy', 'yKienWco', 'tienLe', 'capDeNham', 'thue'];
const MAX_WCO = 5;
const MAX_TIEN_LE = 10;
const MAX_TIEN_LE_MA_KHAC = 3;
const NGUONG_MO_TA = 0.5; // cùng ngưỡng BOOST_MIN của precedent-search: dưới mức này khớp từ vựng không đủ tin

const chuaTraCuu = (ghiChu) => ({ trangThai: 'CHUA_TRA_CUU', ghiChu });
const text = (v) => String(v == null ? '' : v).trim();

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

let _chuong = null;
function chuGiaiChuong() {
  if (!_chuong) _chuong = safe(() => JSON.parse(fs.readFileSync(dataReadPath('chu-giai-chuong.json'), 'utf8')), {});
  return _chuong;
}
const chuGiaiNhom = () => loadJson(dataReadPath('chu-giai-heading.json'), {});

// ── viTri ───────────────────────────────────────────────────────────────────────────────────────────
function viTriOf(hs, row) {
  const vt = safe(() => soTay.viTri(hs), null);
  if (!vt) return chuaTraCuu(`Mã ${hs} không có trong cây HS dựng từ biểu thuế hiện hành.`);
  return {
    trangThai: 'CO_DU_LIEU',
    tenDong: { vi: row?.vn || null, en: row?.en || null, nguon: `data/tax.json#${hs}` },
    ...vt,
    nguon: 'Cây HS dựng từ chữ số của mã trong biểu thuế (lib/hs-tree.js); tên tiêu đề bị lược ghi rõ là bị lược, không bịa.',
  };
}

// ── chuGiai ─────────────────────────────────────────────────────────────────────────────────────────
function chuGiaiOf(hs) {
  const ch = hs.slice(0, 2);
  const h4 = hs.slice(0, 4);
  const items = [];
  const C = chuGiaiChuong()[ch] || {};
  const phan = safe(() => T.ancestorsOf(hs).find((n) => n.cap === 'PHAN'), null);
  if (text(C.phan)) {
    items.push({ cap: 'PHAN', ma: phan?.ma || null, nguyenVan: C.phan, nguon: `${C.nguon_toan_van || 'data/chu-giai-chuong.json'} — chú giải Phần (data/chu-giai-chuong.json#${ch}.phan)`, phienBan: C.phien_ban || null });
  }
  if (text(C.chuong)) {
    items.push({ cap: 'CHUONG', ma: ch, nguyenVan: C.chuong, nguon: `${C.nguon_toan_van || 'data/chu-giai-chuong.json'} — Chương ${ch} (data/chu-giai-chuong.json#${ch}.chuong)`, phienBan: C.phien_ban || null });
  }
  const H = chuGiaiNhom()[h4];
  if (H && text(H.nhom)) {
    items.push({ cap: 'NHOM', ma: h4, nguyenVan: H.nhom, nguon: `${H.nguon_toan_van || H.nguon || 'data/chu-giai-heading.json'} — Nhóm ${h4} (data/chu-giai-heading.json#${h4}.nhom)`, phienBan: H.phien_ban || null, dayDu: H.nhom_day_du === true });
  }
  const sen = safe(() => senFor(hs), null);
  for (const m of sen?.muc || []) {
    items.push({ cap: 'SEN', ma: (m.ma || []).join(', '), capDo: m.capDo, tieuDe: m.tieuDe || null, nguyenVan: m.noiDung, nguon: `${sen.nguon || 'SEN AHTN 2022'}${m.trang ? `, trang ${m.trang}` : ''}`, phienBan: sen.phienBan || null });
  }
  const cov = safe(() => notesCoverage(hs), null);
  const thieu = cov?.gaps?.length ? { thieu: cov.gaps } : {};
  const luuY = cov?.caveats?.length ? { luuY: cov.caveats } : {};
  if (!items.length) {
    return { ...chuaTraCuu(`Kệ sách chưa có chú giải phần/chương/nhóm nào cho mã ${hs}.`), ...thieu };
  }
  return {
    trangThai: 'CO_NOI_DUNG',
    items,
    ...thieu,
    ...luuY,
    ghiChu: 'Nguyên văn trong kệ sách của hệ thống (Chú giải chi tiết HS 2022 bản tiếng Việt, SEN AHTN 2022). Không gồm explanatoryNote (chữ AI chưa kiểm).',
  };
}

// ── loaiKhac ────────────────────────────────────────────────────────────────────────────────────────
function loaiKhacOf(hs) {
  const lk = safe(() => soTay.loaiKhac(hs), null);
  if (!lk) return { trangThai: 'KHONG_PHAI_DONG_LOAI_KHAC' };
  return {
    trangThai: 'LA_DONG_LOAI_KHAC',
    ...lk,
    ...(lk.anhEmCoTen.length ? {} : { ghiChuAnhEm: 'Không tìm thấy dòng anh em có tên trong cây (dòng "Loại khác" đứng một mình hoặc cha là tiêu đề bị lược): đối chiếu biểu thuế gốc.' }),
  };
}

// ── gir (chỉ lib/gir.js) ───────────────────────────────────────────────────────────────────────────
function girOf(hs, description) {
  const headingNote = chuGiaiNhom()[hs.slice(0, 4)] || null;
  // Không có bước xếp hạng ứng viên ở đây → không truyền candidates (tránh suy ra 3(c)/6 từ một "lựa chọn" không có thật).
  const r = gir.determineGir({ description, candidates: [], pickedHs: hs, headingNote });
  if (!r.determinations.length) {
    return {
      trangThai: 'KHONG_CO_TRICH_DAN',
      ghiChu: 'lib/gir.js không suy ra được trích dẫn quy tắc nào có căn cứ từ mô tả hàng và chú giải nhóm của mã này. Không có nghĩa là không quy tắc nào áp dụng.',
      disclaimer: r.disclaimer,
    };
  }
  return { trangThai: 'CO_TRICH_DAN', items: r.determinations, disclaimer: r.disclaimer };
}

// ── yKienWco ────────────────────────────────────────────────────────────────────────────────────────
function yKienWcoOf(hs) {
  if (!wcoOp.available()) {
    return chuaTraCuu('Kho Tuyển tập ý kiến phân loại WCO chưa nạp trên máy chủ này nên chưa tra cứu được nguồn này.');
  }
  const views = wcoOp.byHs(hs.slice(0, 6)).map((o) => wcoOp.view(o)).filter(Boolean);
  if (!views.length) {
    return wcoOp.incomplete()
      ? { trangThai: 'CHUA_TRA_CUU_DAY_DU', ghiChu: 'Kho ý kiến WCO chưa gán đủ mã cho mọi ý kiến (đang khôi phục tiêu đề mã bị OCR làm rơi): không kết luận "mã này không có ý kiến".' }
      : { trangThai: 'KHONG_CO_Y_KIEN_CHO_MA_NAY', ghiChu: `Tuyển tập ý kiến phân loại WCO (bản 2022) không có ý kiến cho phân nhóm ${hs.slice(0, 6)}.` };
  }
  return {
    trangThai: 'CO_Y_KIEN',
    items: views.slice(0, MAX_WCO).map((v) => ({ ...v, xemToanVan: `/api/wco-opinions?hs=${v.hs}&n=${v.thuTuTrongMa}` })),
    ...(views.length > MAX_WCO ? { conLai: views.length - MAX_WCO, xemTatCa: `/api/wco-opinions?hs=${hs.slice(0, 6)}` } : {}),
    banQuyen: wcoOp.BAN_QUYEN,
    ghiChu: 'Ý kiến phân loại WCO của đúng phân nhóm 6 số, chỉ ý kiến đã qua cổng mã/thứ tự. Danh sách có thể chưa đủ. Đối chiếu bản gốc trước khi dẫn.',
  };
}

// ── tienLe ──────────────────────────────────────────────────────────────────────────────────────────
function xacMinhNguon(p) {
  if (p.snapshotHash) return { muc: 'CO_BAN_CHUP', ghiChu: `Có bản chụp nguồn (sha256 ${String(p.snapshotHash).slice(0, 12)}…${p.retrievedAt ? `, lấy ngày ${p.retrievedAt}` : ''}).` };
  if (p.sourceUrl || p.source?.url) return { muc: 'CO_DUONG_DAN', ghiChu: 'Có đường dẫn nguồn công khai; chưa lưu bản chụp — đối chiếu văn bản gốc trước khi dẫn.' };
  return { muc: 'CHUA_XAC_MINH', ghiChu: 'Không có đường dẫn nguồn — chưa xác minh được văn bản gốc.' };
}

function tienLeItem(maKetLuan, p, khop, extra = {}) {
  return {
    soHieu: p.tbTchqNumber || p.source?.reference || null,
    loaiNguon: p.sourceType || p.source?.type || null,
    tenHang: text(p.productName || p.description).slice(0, 600) || null,
    ketLuan: text(p.technicalSpec || p.reasonVi).slice(0, 800) || null,
    maKetLuan,
    ngay: p.issuedDate || p.source?.issuedDate || (p.year ? String(p.year) : null),
    nguon: p.sourceUrl || p.source?.url || null,
    ...(p.country ? { quocGia: p.country } : {}),
    khop,
    xacMinhNguon: xacMinhNguon(p),
    ...extra,
  };
}

function tienLeOf(hs, description) {
  if (!precedentsData || !Object.keys(precedentsData).length) {
    return { section: chuaTraCuu('Kho tiền lệ (data/precedents.json) chưa nạp nên chưa tra cứu được.'), count: undefined };
  }
  const items = [];
  const seen = new Set();
  const push = (key, p, khop, extra) => {
    const id = `${p.tbTchqNumber || p.source?.reference || ''}|${key}|${text(p.productName || p.description).slice(0, 80)}`;
    if (seen.has(id)) return;
    seen.add(id);
    items.push(tienLeItem(key, p, khop, extra));
  };
  const theoMa = [[hs, 'DUNG_MA'], [hs.slice(0, 6), 'CUNG_PHAN_NHOM'], [hs.slice(0, 4), 'CUNG_NHOM']];
  for (const [key, khop] of theoMa) for (const p of precedentsData[key] || []) push(key, p, khop);
  const khac = [];
  for (const m of safe(() => searchPrecedents(description, { topK: 8 }), [])) {
    if (m.similarity < NGUONG_MO_TA) continue;
    const ma = String(m.finalHsCode || '');
    const doTuongTu = Math.round(m.similarity * 100) / 100;
    const raw = rawOf(m.precedent);
    if (!raw) continue;
    if (ma.slice(0, 4) === hs.slice(0, 4)) push(raw.key, raw.p, 'MO_TA_TUONG_TU', { doTuongTu });
    else if (khac.length < MAX_TIEN_LE_MA_KHAC) khac.push(tienLeItem(raw.key, raw.p, 'MO_TA_TUONG_TU_MA_KHAC', { doTuongTu }));
  }
  const count = items.length;
  const tienLeMaKhac = khac.length
    ? { tienLeMaKhac: khac, ghiChuMaKhac: 'Tiền lệ có mô tả tương tự nhưng kết luận mã thuộc nhóm KHÁC — cần giải trình vì sao hàng không giống các tiền lệ này.' }
    : {};
  if (!count) {
    return {
      section: {
        trangThai: 'KHONG_CO_TIEN_LE_KHOP',
        ghiChu: `Đã tra kho tiền lệ (TB-TCHQ + quốc tế): không có tiền lệ cho mã ${hs}, phân nhóm ${hs.slice(0, 6)} hay nhóm ${hs.slice(0, 4)}, cũng không có tiền lệ mô tả tương tự (≥ ${NGUONG_MO_TA}) cùng nhóm. Kho chưa phủ hết mọi văn bản đã ban hành.`,
        ...tienLeMaKhac,
      },
      count: 0,
    };
  }
  return {
    section: {
      trangThai: 'CO_TIEN_LE_KHOP',
      items: items.slice(0, MAX_TIEN_LE),
      ...(count > MAX_TIEN_LE ? { conLai: count - MAX_TIEN_LE } : {}),
      ...tienLeMaKhac,
      ghiChu: 'khop: DUNG_MA (đúng mã 8 số) > CUNG_PHAN_NHOM > CUNG_NHOM (văn bản chỉ kết luận đến 6/4 số) > MO_TA_TUONG_TU (khớp từ vựng, cần đọc kỹ). xacMinhNguon cho biết đã lưu bản chụp hay chỉ có đường dẫn.',
    },
    count,
  };
}

// precedent-search giữ bản phẳng (mã đã đệm 8 số); lấy lại khoá + bản ghi gốc để không biến "3919" thành "39190000".
let _rawIndex = null;
function rawOf(flat) {
  if (!flat?.tbTchqNumber || !text(flat.productNameRaw)) return null; // bản ghi thiếu số hiệu/tên: không khôi phục chắc được → bỏ
  if (!_rawIndex) {
    _rawIndex = new Map();
    for (const [key, list] of Object.entries(precedentsData)) {
      for (const p of Array.isArray(list) ? list : []) {
        if (!p.tbTchqNumber || !text(p.productName)) continue;
        const id = `${p.tbTchqNumber}|${text(p.productName).slice(0, 120)}`;
        if (!_rawIndex.has(id)) _rawIndex.set(id, { key, p });
      }
    }
  }
  return _rawIndex.get(`${flat.tbTchqNumber}|${text(flat.productNameRaw).slice(0, 120)}`) || null;
}

// ── capDeNham ───────────────────────────────────────────────────────────────────────────────────────
let _tables = null; let _registry = null;
const conflictTables = () => (_tables ||= safe(() => JSON.parse(fs.readFileSync(dataReadPath('conflict-tables.json'), 'utf8')), { tables: {} }));
const attributeRegistry = () => (_registry ||= safe(() => JSON.parse(fs.readFileSync(dataReadPath('attributes.json'), 'utf8')).attributes || {}, {}));

function capDeNhamOf(hs) {
  const c = conflictsData?.[hs];
  if (!c) {
    return { trangThai: 'KHONG_CO_TRONG_BANG', ghiChu: `Mã ${hs} chưa có trong bảng cặp mã dễ nhầm (data/conflicts.json). Bảng mới phủ một số cụm mã — không có nghĩa là mã này không thể bị nhầm.` };
  }
  const out = {
    trangThai: 'CO_CAP_DE_NHAM',
    mucRuiRo: c.riskLevel || null,
    confusedWith: Array.isArray(c.confusedWith) ? c.confusedWith : [],
    lyDo: Array.isArray(c.reasonsVi) ? c.reasonsVi : [],
    nguon: `data/conflicts.json#${hs}`,
  };
  const table = c.group ? conflictTables().tables?.[c.group] : null;
  if (table) {
    // Bảng quyết định qua lib/conflict-resolver.js: không có dữ kiện hàng → resolver trả các câu hỏi phân biệt (ask).
    const r = resolveConflict({ hs }, [], {}, { conflictsDb: conflictsData, tablesDb: conflictTables(), registry: attributeRegistry() });
    out.bangQuyetDinh = {
      nhom: c.group,
      tieuDe: table.titleVi || null,
      cauHoiBanChat: table.essenceTestVi || null,
      thanhVien: table.members || [],
      daDuyet: table.verified === true,
      quyTac: (table.rules || []).map((x) => ({ id: x.id, khi: x.when, hs: x.hs, lyDo: x.reasonVi || null, nguon: x.source || null })),
      nguon: 'data/conflict-tables.json (lib/conflict-resolver.js)',
    };
    out.tieuChiPhanBiet = (r.ask || []).map((a) => ({ thuocTinh: a.attribute, cauHoi: a.questionVi || null }));
  }
  if (!out.tieuChiPhanBiet || !out.tieuChiPhanBiet.length) {
    out.tieuChiPhanBiet = out.lyDo.map((l) => ({ cauHoi: null, lyDo: l }));
  }
  if (!out.tieuChiPhanBiet.length) delete out.tieuChiPhanBiet;
  return out;
}

// ── thue ────────────────────────────────────────────────────────────────────────────────────────────
function thueOf(hs, moTa) {
  const r = safe(() => buildTaxLookup(hs, { name: moTa.slice(0, 500) }), null);
  if (!r || !r.found) return chuaTraCuu(`Không tra được thuế cho mã ${hs} trong biểu thuế hiện hành.`);
  return { trangThai: 'CO_DU_LIEU', ...r };
}

// ── Một mã ──────────────────────────────────────────────────────────────────────────────────────────
function goiCanCuCho(hs, { moTa, thongSo }) {
  const description = [moTa, thongSo].filter((x) => text(x)).join('. ');
  const row = taxData[hs];
  if (!row) {
    const ly = `Mã ${hs} không có trong biểu thuế hiện hành (data/tax.json) nên không tra các nguồn theo mã.`;
    const goi = { maHs: hs, coTrongBieu: false };
    for (const k of SECTIONS) goi[k] = chuaTraCuu(ly);
    goi.gir = { ...chuaTraCuu(ly), disclaimer: gir.DISCLAIMER_VI };
    return goi;
  }
  const tl = tienLeOf(hs, description);
  const girSection = girOf(hs, description);
  const canCu = legal.canCuPhapLy({
    status: 'REVIEW', // mã do người dùng đưa vào, chưa được hệ thống chốt → CHUA_CHOT_CAN_XAC_NHAN
    topHs: hs,
    description,
    precedentCount: tl.count,
    girDeterminations: girSection.items ? girSection.items.length : 0,
  });
  return {
    maHs: hs,
    coTrongBieu: true,
    viTri: viTriOf(hs, row),
    chuGiai: chuGiaiOf(hs),
    loaiKhac: loaiKhacOf(hs),
    gir: girSection,
    canCuPhapLy: { ...canCu, hoSo: legal.canCuHoSo({ description }) },
    yKienWco: yKienWcoOf(hs),
    tienLe: tl.section,
    capDeNham: capDeNhamOf(hs),
    thue: thueOf(hs, moTa),
  };
}

function soSanhCapOf(a, b) {
  const ca = conflictsData?.[a]; const cb = conflictsData?.[b];
  const trongBang = Boolean((ca?.confusedWith || []).includes(b) || (cb?.confusedWith || []).includes(a) || (ca?.group && ca.group === cb?.group));
  return {
    maA: a,
    maB: b,
    cungChuong: a.slice(0, 2) === b.slice(0, 2),
    cungNhom4: a.slice(0, 4) === b.slice(0, 4),
    cungPhanNhom6: a.slice(0, 6) === b.slice(0, 6),
    trongBangDeNham: trongBang,
    ghiChu: a.slice(0, 4) === b.slice(0, 4)
      ? 'Hai mã cùng nhóm 4 số: phân định ở cấp phân nhóm, chỉ so các phân nhóm cùng cấp (trích dẫn quy tắc, nếu có, nằm ở phần gir của từng gói).'
      : 'Hai mã khác nhóm 4 số: phân định theo nội dung nhóm và chú giải phần/chương (xem chuGiai của từng gói).',
  };
}

/**
 * @param {{ maHs: string[], moTa: string, thongSo?: string }} input  đã kiểm hợp lệ (validateEvidenceInput)
 * @returns {{ goiCanCu: object[], soSanhCap?: object, phienBanGoiCanCu: string, phienBanBieuThue: object|null, khongDungLlm: true, disclaimer: string }}
 */
function buildEvidencePack({ maHs, moTa, thongSo } = {}) {
  const codes = (Array.isArray(maHs) ? maHs : []).map((x) => String(x));
  const goiCanCu = codes.map((hs) => goiCanCuCho(hs, { moTa: String(moTa || ''), thongSo }));
  return {
    goiCanCu,
    ...(codes.length === 2 ? { soSanhCap: soSanhCapOf(codes[0], codes[1]) } : {}),
    phienBanGoiCanCu: PHIEN_BAN_GOI,
    phienBanBieuThue: safe(() => tariffInfo(), null),
    khongDungLlm: true,
    disclaimer: 'Gói căn cứ do hệ thống gom từ dữ liệu đang giữ để tham khảo, không phải quyết định phân loại. Mỗi phần ghi trangThai: CHUA_TRA_CUU là chưa tra được, không phải "không có". Người khai hải quan chịu trách nhiệm về mã số khai.',
  };
}

const ALLOWED_KEYS = new Set(['maHs', 'moTa', 'thongSo']);

/** Kiểm đầu vào đúng hợp đồng phía Cổng (ozplugin YeuCauGoiCanCuInput, `.strict()`). → { ok, data } | { ok:false, loi[] } */
function validateEvidenceInput(body) {
  const loi = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, loi: ['Body phải là object JSON { maHs, moTa, thongSo? }.'] };
  for (const k of Object.keys(body)) if (!ALLOWED_KEYS.has(k)) loi.push(`Trường không được phép: ${k}`);
  const { maHs, moTa, thongSo } = body;
  if (!Array.isArray(maHs) || maHs.length < 1 || maHs.length > 2) loi.push('maHs phải là mảng 1–2 mã.');
  else maHs.forEach((m, i) => { if (typeof m !== 'string' || !/^\d{8}$/.test(m)) loi.push(`maHs[${i}] phải là chuỗi đúng 8 chữ số.`); });
  if (typeof moTa !== 'string' || !moTa.trim() || moTa.trim().length > 2000) loi.push('moTa phải là chuỗi 1–2000 ký tự.');
  if (thongSo !== undefined && (typeof thongSo !== 'string' || thongSo.length > 2000)) loi.push('thongSo (tuỳ chọn) phải là chuỗi tối đa 2000 ký tự.');
  if (loi.length) return { ok: false, loi };
  return { ok: true, data: { maHs: [...maHs], moTa: moTa.trim(), ...(thongSo !== undefined ? { thongSo } : {}) } };
}

module.exports = { buildEvidencePack, validateEvidenceInput, tienLeOf, SECTIONS, PHIEN_BAN_GOI };
