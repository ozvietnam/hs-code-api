// lib/plhq-registry.js — tra hiệu lực văn bản trong sổ đăng ký cộng đồng oz-wiki-plhq.
//
// Cột chính sách (`cs`) của biểu thuế dẫn văn bản theo nhiều kiểu viết ("1182/QĐ-BCT-PL2-2021",
// "12/2022/TT-BGTVT PL1", "01/2024/TT-BNNPTNT M9", "2711/QĐ-BKHCN 2022"). Module này rút số hiệu,
// đưa về khoá chung với kho cộng đồng (tools/lib/registry.mjs → khoa()) và trả tình trạng hiệu lực,
// văn bản thay thế, mức xác minh. Không đổi `cs`; chỉ báo.
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const WIKI = 'https://github.com/ozvietnam/oz-wiki-plhq/blob/main/registry/van-ban';
// Số hiệu trong chữ: 28/2026/TT-BCT, 08/2015/NĐ-CP, 1182/QĐ-BCT, 10.2022/TT-BTTT, 54/2014/QH13
const RE_SO_HIEU = /\b\d{1,5}(?:[./](?:I_)?\d{4})?\/(?:TT|FT|NĐ|ND|QĐ|QD|NQ|TTLT)-[A-ZĐa-z]+|\b\d{1,3}\/\d{4}\/QH\d{2}\b/g;
// Lỗi gõ hay gặp trong biểu thuế → ký hiệu đúng.
const SUA_KY_HIEU = { BHKCN: 'BKHCN', BTTT: 'BTTTT', BBNPTNT: 'BNNPTNT' };

let _so = null;
function load() {
  if (_so) return _so;
  try {
    const raw = JSON.parse(fs.readFileSync(dataReadPath('plhq-registry.json'), 'utf8'));
    const theoKhoa = new Map();
    // Số hiệu chuẩn trước, cách viết khác (so_hieu_khac — vd lỗi gõ trong biểu thuế) sau, không đè.
    for (const d of raw.documents || []) theoKhoa.set(khoa(d.soHieu), d);
    for (const d of raw.documents || []) for (const s of d.soHieuKhac || []) if (!theoKhoa.has(khoa(s))) theoKhoa.set(khoa(s), d);
    _so = { meta: { registryVersion: raw.registryVersion, syncedAt: raw.syncedAt, total: raw.total, repo: raw.repo }, theoKhoa };
  } catch {
    _so = { meta: null, theoKhoa: new Map() };
  }
  return _so;
}

/** Khoá so khớp — giống khoa() của oz-wiki-plhq + sửa lỗi gõ + bỏ năm/I_ thừa trước loại văn bản. */
function khoa(soHieu) {
  let s = String(soHieu || '').normalize('NFC').toUpperCase().replace(/Đ/g, 'D').replace(/\s+/g, '').replace(/[.,;:]$/, '');
  s = s.replace(/^(\d+)\.(\d{4})\//, '$1/$2/').replace(/\/I_(\d{4})\//, '/$1/').replace(/\/FT-/, '/TT-');
  // QĐ của bộ: "1182/2021/QD-BCT" → "1182/QD-BCT" (số hiệu chuẩn không mang năm)
  s = s.replace(/^(\d+)\/\d{4}\/QD-(?!TTG)/, '$1/QD-');
  s = s.replace(/-([A-Z]+)$/, (m, k) => `-${SUA_KY_HIEU[k] || k}`);
  return s;
}

/** Rút các số hiệu (đã chuẩn hoá, không trùng) trong một đoạn chữ chính sách. */
function trichSoHieu(text) {
  const seen = new Map();
  for (const m of String(text || '').match(RE_SO_HIEU) || []) {
    const k = khoa(m);
    if (!seen.has(k)) seen.set(k, m);
  }
  return [...seen.entries()].map(([k, raw]) => ({ khoa: k, raw }));
}

function tomTat(d) {
  const ng = d.quanHeNguoc || {};
  const ds = (ten) => (ng[ten] || []).map((e) => e.tu);
  return {
    soHieu: d.soHieu,
    ten: d.ten,
    tinhTrang: d.tinhTrang,
    hetHieuLucTu: d.hetHieuLucTu,
    biThayTheBoi: ds('bi_thay_the_boi'),
    biBaiBoBoi: ds('bi_bai_bo_boi'),
    biSuaDoiBoi: ds('bi_sua_doi_boi'),
    biTamNgungBoi: ds('bi_tam_ngung_boi'),
    hieuLucDaDoiChieu: d.xacMinh?.hieuLucDaDoiChieu === true,
    xacMinh: d.xacMinh?.muc || 'CHUA_XAC_MINH',
    url: d.slug ? `${WIKI}/${d.slug}.yaml` : null,
  };
}

/**
 * registryReview(csText) → null | {
 *   citations: [{ cited, found, ...tomTat }],
 *   counts: { total, found, notFound, expired, unverified },
 *   registryVersion, syncedAt
 * }
 */
function registryReview(csText) {
  const { meta, theoKhoa } = load();
  if (!meta) return null;
  const cites = trichSoHieu(csText);
  if (!cites.length) return null;
  const citations = cites.map(({ khoa: k, raw }) => {
    const d = theoKhoa.get(k);
    return d ? { cited: raw, found: true, ...tomTat(d) } : { cited: raw, found: false };
  });
  const found = citations.filter((c) => c.found);
  return {
    citations,
    counts: {
      total: citations.length,
      found: found.length,
      notFound: citations.length - found.length,
      expired: found.filter((c) => c.tinhTrang === 'HET_HIEU_LUC').length,
      unverified: found.filter((c) => !c.hieuLucDaDoiChieu).length,
    },
    registryVersion: meta.registryVersion,
    syncedAt: meta.syncedAt,
  };
}

function lookup(soHieu) {
  // Số hiệu có thể kèm hậu tố phụ lục / năm ("1182/QĐ-BCT-PL2-2021") — rút số hiệu trước khi tra.
  const raw = trichSoHieu(soHieu)[0]?.raw || soHieu;
  const d = load().theoKhoa.get(khoa(raw));
  return d ? tomTat(d) : null;
}

// Trạng thái trong thư viện riêng (data/legal-docs.json) → các tình trạng của sổ cộng đồng được coi là khớp.
const TUONG_THICH = {
  ACTIVE: ['CON_HIEU_LUC', 'HET_HIEU_LUC_MOT_PHAN'],
  AMENDED: ['CON_HIEU_LUC', 'HET_HIEU_LUC_MOT_PHAN'],
  EXPIRED: ['HET_HIEU_LUC', 'TAM_NGUNG_HIEU_LUC'],
  REPLACED: ['HET_HIEU_LUC'],
};

/**
 * Tình trạng theo sổ cộng đồng của một văn bản trong thư viện riêng, kèm cờ lệch.
 * statusConflict = true khi sổ cộng đồng ĐÃ ghi tình trạng (không phải CHUA_XAC_MINH) mà khác thư viện.
 * Không tự sửa thư viện: lệch là việc cần người đối chiếu nguồn A.
 */
function docRegistry(code, libraryStatus) {
  const r = lookup(code);
  if (!r) return null;
  const ok = TUONG_THICH[libraryStatus];
  const statusConflict = Boolean(ok) && r.tinhTrang !== 'CHUA_XAC_MINH' && !ok.includes(r.tinhTrang);
  return { ...r, statusConflict };
}

/** Các văn bản thư viện riêng lệch tình trạng với sổ cộng đồng. docs: [{ code, status, titleVi }]. */
function libraryConflicts(docs) {
  const out = [];
  for (const d of docs || []) {
    const r = docRegistry(d.code, d.status);
    if (r?.statusConflict) out.push({ code: d.code, libraryStatus: d.status, registry: r });
  }
  return out;
}

function registryMeta() {
  return load().meta;
}

module.exports = { registryReview, lookup, registryMeta, trichSoHieu, khoa, docRegistry, libraryConflicts };
