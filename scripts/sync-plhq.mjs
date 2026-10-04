#!/usr/bin/env node
// Đồng bộ sổ đăng ký văn bản từ kho cộng đồng oz-wiki-plhq → data/plhq-registry.json (bản chụp).
// Kho cộng đồng là nguồn sự thật về HIỆU LỰC văn bản; hs-code-api chỉ đọc, không sửa ngược.
//   node scripts/sync-plhq.mjs                    # tải dist/registry.json từ GitHub (nhánh main)
//   node scripts/sync-plhq.mjs --from <đường dẫn>  # đọc bản cục bộ (vd clone oz-wiki-plhq)
//   node scripts/sync-plhq.mjs --check             # chỉ kiểm, không ghi
//   node scripts/sync-plhq.mjs --hs-index-from <tệp> # đọc dist/hs-index.json cục bộ (bảng mã HS ↔ văn bản)
// Kèm dist/hs-index.json (lớp mã HS ↔ văn bản, docs/luoc-do-danh-muc-hs.md của kho) → data/plhq-hs-index.json.
//   node scripts/sync-plhq.mjs --summary <tệp.md>  # ghi tóm tắt thay đổi (cho workflow plhq-sync)
//   node scripts/sync-plhq.mjs --touch-freshness   # đã đối chiếu xong với nguồn → cập nhật lastCheckedAt của
//                                                  # plhqRegistry trong data/data-freshness.json nếu đã cũ ≥ 6 ngày
// Không ghi tệp khi chỉ ngày đồng bộ đổi. Mã thoát 0; workflow đọc dòng "CHANGED=" / "LARGE=" trên stdout.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'plhq-registry.json');
const OUT_HS = join(ROOT, 'data', 'plhq-hs-index.json');
const URL_HS = 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/dist/hs-index.json';
const URL_MAC_DINH = 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/dist/registry.json';
const TINH_TRANG = new Set(['CON_HIEU_LUC', 'HET_HIEU_LUC', 'HET_HIEU_LUC_MOT_PHAN', 'TAM_NGUNG_HIEU_LUC', 'CHUA_CO_HIEU_LUC', 'CHUA_XAC_MINH']);

const args = process.argv.slice(2);
const fromIdx = args.indexOf('--from');
const from = fromIdx >= 0 ? args[fromIdx + 1] : null;
const checkOnly = args.includes('--check');
const hsIdx = args.indexOf('--hs-index-from');
const hsFrom = hsIdx >= 0 ? args[hsIdx + 1] : null;
const sumIdx = args.indexOf('--summary');
const summaryFile = sumIdx >= 0 ? args[sumIdx + 1] : null;
// Thay đổi lớn (bớt văn bản, hoặc nhiều văn bản đổi tình trạng cùng lúc) → workflow mở PR cho người duyệt
// thay vì tự đẩy thẳng main.
const NGUONG_DOI_TINH_TRANG = 10;
const touchFreshness = args.includes('--touch-freshness');
const FRESHNESS = join(ROOT, 'data', 'data-freshness.json');

async function load() {
  if (from) return { raw: JSON.parse(readFileSync(from, 'utf8')), source: from };
  const res = await fetch(URL_MAC_DINH);
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${URL_MAC_DINH}`);
  return { raw: await res.json(), source: URL_MAC_DINH };
}

/** Giữ đúng các trường hs-code-api dùng — bản chụp nhỏ, ổn định. */
export function rutGon(raw) {
  if (!raw || !Array.isArray(raw.van_ban)) throw new Error('registry.json không có van_ban[]');
  const loi = [];
  const docs = raw.van_ban.map((d) => {
    if (!d.so_hieu || !TINH_TRANG.has(d.tinh_trang)) loi.push(d.so_hieu || '(thiếu số hiệu)');
    return {
      soHieu: d.so_hieu,
      soHieuKhac: Array.isArray(d.so_hieu_khac) ? d.so_hieu_khac : [],
      ten: d.ten,
      loai: d.loai,
      coQuan: d.co_quan,
      ngayBanHanh: d.ngay_ban_hanh || null,
      hieuLucTu: d.hieu_luc_tu || null,
      hetHieuLucTu: d.het_hieu_luc_tu || null,
      tinhTrang: d.tinh_trang,
      nhanh: d.nhanh || [],
      quanHeNguoc: d.quan_he_nguoc || {},
      nguonA: (d.nguon || []).map((n) => n.url).filter(Boolean).slice(0, 3),
      bacNguon: d.bac_nguon_cao_nhat || null,
      xacMinh: {
        muc: d.xac_minh?.muc || 'CHUA_XAC_MINH',
        hieuLucDaDoiChieu: d.xac_minh?.hieu_luc_da_doi_chieu === true,
        ngay: d.xac_minh?.ngay || null,
      },
      slug: d.slug,
    };
  });
  if (loi.length) throw new Error(`văn bản thiếu số hiệu/tình trạng hợp lệ: ${loi.slice(0, 5).join(', ')}`);
  return docs;
}

const { raw, source } = await load();
const docs = rutGon(raw);
const out = {
  _comment: 'Bản chụp sổ đăng ký văn bản của kho cộng đồng oz-wiki-plhq (CC BY 4.0). KHÔNG sửa tay — chạy node scripts/sync-plhq.mjs. lib/plhq-registry.js đọc tệp này.',
  source,
  repo: 'https://github.com/ozvietnam/oz-wiki-plhq',
  license: raw.giay_phep || 'CC BY 4.0',
  registryVersion: raw.phien_ban || null,
  syncedAt: new Date().toISOString().slice(0, 10),
  total: docs.length,
  documents: docs,
};
console.log(`${docs.length} văn bản · phiên bản ${out.registryVersion} · ${docs.filter((d) => d.xacMinh.hieuLucDaDoiChieu).length} đã đối chiếu hiệu lực`);

/** So bản chụp cũ với bản mới — bỏ qua syncedAt/source. */
export function soSanh(cu, moi) {
  const theoSo = (ds) => new Map((ds || []).map((d) => [d.soHieu, d]));
  const a = theoSo(cu?.documents);
  const b = theoSo(moi.documents);
  const them = [...b.keys()].filter((k) => !a.has(k));
  const bot = [...a.keys()].filter((k) => !b.has(k));
  const doiTinhTrang = [...b.keys()].filter((k) => a.has(k) && a.get(k).tinhTrang !== b.get(k).tinhTrang)
    .map((k) => ({ soHieu: k, tu: a.get(k).tinhTrang, thanh: b.get(k).tinhTrang }));
  const doiKhac = [...b.keys()].filter((k) => a.has(k) && JSON.stringify(a.get(k)) !== JSON.stringify(b.get(k))).length;
  return { them, bot, doiTinhTrang, doiKhac, coDoi: them.length + bot.length + doiKhac > 0 || cu?.registryVersion !== moi.registryVersion };
}

const cu = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
const ss = soSanh(cu, out);
const lon = ss.bot.length > 0 || ss.doiTinhTrang.length > NGUONG_DOI_TINH_TRANG;
console.log(`Thay đổi: +${ss.them.length} −${ss.bot.length} văn bản · ${ss.doiTinhTrang.length} đổi tình trạng · ${ss.doiKhac} văn bản sửa`);

/** Bảng mã HS ↔ văn bản: giữ trường hs-code-api dùng, camelCase. */
export function rutGonHsIndex(raw) {
  if (!raw || !Array.isArray(raw.van_ban)) throw new Error('hs-index.json không có van_ban[]');
  return raw.van_ban.map((v) => ({
    soHieu: v.so_hieu,
    ten: v.ten,
    tinhTrang: v.tinh_trang,
    hieuLucTu: v.hieu_luc_tu || null,
    hetHieuLucTu: v.het_hieu_luc_tu || null,
    hieuLucDaDoiChieu: v.hieu_luc_da_doi_chieu === true,
    table: { file: v.bang?.tep || null, source: v.bang?.nguon || null, extractedBy: v.bang?.trich_boi || null, date: v.bang?.ngay || null, verified: v.bang?.da_doi_chieu === true },
    slug: v.slug,
    rows: (v.dong || []).map((d) => ({
      hs: d.ma_hs || null, moTa: d.mo_ta, nhom: d.nhom || null, phuLuc: d.phu_luc || null, loaiTacDong: d.loai_tac_dong,
      mucRuiRo: d.muc_rui_ro || null, dieuKien: d.dieu_kien || null, danChieu: d.dan_chieu || null, trang: d.trang ? Number(d.trang) : null,
    })),
  }));
}

let hsDoi = false;
try {
  let hsRaw;
  if (hsFrom) hsRaw = JSON.parse(readFileSync(hsFrom, 'utf8'));
  else if (!from) {
    const res = await fetch(URL_HS);
    if (res.status === 404) console.log('Kho chưa có dist/hs-index.json — bỏ qua bảng mã HS.');
    else if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${URL_HS}`);
    else hsRaw = await res.json();
  }
  if (hsRaw) {
    const docsHs = rutGonHsIndex(hsRaw);
    const cuHs = existsSync(OUT_HS) ? JSON.parse(readFileSync(OUT_HS, 'utf8')) : null;
    hsDoi = JSON.stringify(cuHs?.documents || null) !== JSON.stringify(docsHs);
    const soDong = docsHs.reduce((n, d) => n + d.rows.length, 0);
    console.log(`Bảng mã HS: ${docsHs.length} văn bản · ${soDong} dòng${hsDoi ? ' (có đổi)' : ''}`);
    if (!checkOnly && hsDoi) {
      writeFileSync(OUT_HS, JSON.stringify({
        _comment: 'Bản chụp bảng mã HS ↔ văn bản của kho cộng đồng oz-wiki-plhq (CC BY 4.0). KHÔNG sửa tay — chạy node scripts/sync-plhq.mjs. lib/plhq-registry.js đọc tệp này.',
        source: hsFrom || URL_HS, repo: 'https://github.com/ozvietnam/oz-wiki-plhq', schema: 'docs/luoc-do-danh-muc-hs.md',
        registryVersion: hsRaw.phien_ban || null, syncedAt: new Date().toISOString().slice(0, 10), documents: docsHs,
      }, null, 1) + '\n');
      console.log(`Đã ghi ${OUT_HS.slice(ROOT.length + 1)}`);
    }
  }
} catch (e) {
  console.error(`Bảng mã HS: ${e.message}`);
  process.exitCode = 1;
}
console.log(`CHANGED=${ss.coDoi || hsDoi}`);
console.log(`LARGE=${lon}`);
if (summaryFile) {
  writeFileSync(summaryFile, [
    `Đồng bộ sổ đăng ký văn bản từ [oz-wiki-plhq](${out.repo}) — phiên bản ${out.registryVersion}, ${docs.length} văn bản.`,
    '',
    `- Văn bản mới: ${ss.them.join(', ') || 'không'}`,
    `- Văn bản bị bớt: ${ss.bot.join(', ') || 'không'}`,
    `- Đổi tình trạng (${ss.doiTinhTrang.length}): ${ss.doiTinhTrang.map((x) => `${x.soHieu} ${x.tu} → ${x.thanh}`).join('; ') || 'không'}`,
    `- Văn bản sửa trường khác: ${ss.doiKhac}`,
    `- Bảng mã HS ↔ văn bản: ${hsDoi ? 'có cập nhật' : 'không đổi'}`,
    lon ? `\n**Thay đổi lớn** (bớt văn bản hoặc trên ${NGUONG_DOI_TINH_TRANG} văn bản đổi tình trạng) — cần người duyệt.` : '',
  ].join('\n') + '\n');
}
if (!checkOnly && ss.coDoi) {
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`Đã ghi ${OUT.slice(ROOT.length + 1)}`);
} else if (!ss.coDoi) {
  console.log('Không đổi so với bản chụp hiện có — không ghi.');
}

// Lần đồng bộ này là một lần đối chiếu thật với nguồn (tải từ kho cộng đồng) → được phép ghi ngày kiểm.
// Chỉ ghi khi đã cũ ≥ 6 ngày để không sinh commit mỗi ngày.
let touched = false;
if (touchFreshness && !checkOnly) {
  const fr = JSON.parse(readFileSync(FRESHNESS, 'utf8'));
  const src = fr.sources?.plhqRegistry;
  const homNay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (src && (!src.lastCheckedAt || (Date.parse(homNay) - Date.parse(src.lastCheckedAt)) / 864e5 >= 6)) {
    src.lastCheckedAt = homNay;
    src.checkedBy = 'scripts/sync-plhq.mjs (workflow plhq-sync)';
    writeFileSync(FRESHNESS, JSON.stringify(fr, null, 2) + '\n');
    touched = true;
  }
}
console.log(`TOUCHED=${touched}`);
