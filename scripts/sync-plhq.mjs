#!/usr/bin/env node
// Đồng bộ sổ đăng ký văn bản từ kho cộng đồng oz-wiki-plhq → data/plhq-registry.json (bản chụp).
// Kho cộng đồng là nguồn sự thật về HIỆU LỰC văn bản; hs-code-api chỉ đọc, không sửa ngược.
//   node scripts/sync-plhq.mjs                      # tải dist/registry.json từ GitHub (nhánh main)
//   node scripts/sync-plhq.mjs --from <đường dẫn>    # đọc bản cục bộ (vd clone oz-wiki-plhq)
//   node scripts/sync-plhq.mjs --check               # chỉ kiểm, không ghi
//   node scripts/sync-plhq.mjs --hs-index-from <tệp> # đọc dist/hs-index.json cục bộ (bảng mã HS ↔ văn bản)
//   node scripts/sync-plhq.mjs --manifest-from <tệp> # đọc dist/manifest.json (1.7.0+) để kiểm tra SHA-256 + lớp dữ liệu
//   node scripts/sync-plhq.mjs --with-dieu-khoan     # (opt-in, mặc định TẮT) tải dist/dieu-khoan.json (CHỈ NGUYEN_VAN_NGUON_A)
//   node scripts/sync-plhq.mjs --dieu-khoan-from <tệp> # (opt-in) đọc dist/dieu-khoan.json cục bộ (CHỈ NGUYEN_VAN_NGUON_A)
// Kèm dist/hs-index.json (lớp mã HS ↔ văn bản, docs/luoc-do-danh-muc-hs.md của kho) → data/plhq-hs-index.json.
//   node scripts/sync-plhq.mjs --summary <tệp.md>    # ghi tóm tắt thay đổi (cho workflow plhq-sync)
//   node scripts/sync-plhq.mjs --touch-freshness     # đã đối chiếu xong với nguồn → cập nhật lastCheckedAt của
//                                                    # plhqRegistry trong data/data-freshness.json nếu đã cũ ≥ 6 ngày
// Không ghi tệp khi chỉ ngày đồng bộ đổi. Mã thoát 0; workflow đọc dòng "CHANGED=" / "LARGE=" trên stdout.
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'plhq-registry.json');
const OUT_HS = join(ROOT, 'data', 'plhq-hs-index.json');
const OUT_DK = join(ROOT, 'data', 'plhq-dieu-khoan.json');
const URL_HS = 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/dist/hs-index.json';
const URL_DK = 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/dist/dieu-khoan.json';
const URL_MANIFEST = 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/dist/manifest.json';
const URL_MAC_DINH = 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/dist/registry.json';
const LOP_DU_LIEU_CHUAN_TEP = Object.freeze({
  'registry.json': 'LUAT',
  'hs-index.json': 'LUAT',
  'dieu-khoan.json': 'LUAT',
});
const TINH_TRANG = new Set(['CON_HIEU_LUC', 'HET_HIEU_LUC', 'HET_HIEU_LUC_MOT_PHAN', 'TAM_NGUNG_HIEU_LUC', 'CHUA_CO_HIEU_LUC', 'CHUA_XAC_MINH']);
// Thay đổi lớn (bớt văn bản, hoặc nhiều văn bản đổi tình trạng cùng lúc) → workflow mở PR cho người duyệt
// thay vì tự đẩy thẳng main.
const NGUONG_DOI_TINH_TRANG = 10;
const FRESHNESS = join(ROOT, 'data', 'data-freshness.json');
export const GHI_NGUON_CC_BY = 'Nguồn: oz-wiki-plhq — https://github.com/ozvietnam/oz-wiki-plhq (CC BY 4.0)';

function docThamSo(args, co) {
  const idx = args.indexOf(co);
  if (idx < 0) return null;
  const val = args[idx + 1];
  if (!val || val.startsWith('--')) throw new Error(`Thiếu giá trị cho tuỳ chọn ${co}`);
  return val;
}

async function load(from) {
  if (from) {
    const rawText = readFileSync(from, 'utf8');
    return { raw: JSON.parse(rawText), rawText, source: from };
  }
  const res = await fetch(URL_MAC_DINH);
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${URL_MAC_DINH}`);
  const rawText = await res.text();
  return { raw: JSON.parse(rawText), rawText, source: URL_MAC_DINH };
}

/**
 * Đối chiếu dist/manifest.json (lược đồ 1.7.0, chuẩn lớp dữ liệu lop-kho@1):
 * kiểm major `1.x`, chuẩn lớp dữ liệu và SHA-256 + byte length của từng tệp đã tải.
 */
export function kiemTraManifest(manifest, rawTextByFile = {}) {
  if (!manifest || typeof manifest !== 'object' || !manifest.tep || typeof manifest.tep !== 'object') {
    throw new Error('manifest.json không hợp lệ hoặc thiếu tep{}');
  }
  const ver = manifest.luoc_do_phien_ban;
  if (ver && !String(ver).startsWith('1.')) {
    throw new Error(`manifest.json luoc_do_phien_ban không tương thích: ${ver}`);
  }
  if (manifest.chuan_lop_du_lieu && manifest.chuan_lop_du_lieu !== 'lop-kho@1') {
    throw new Error(`manifest.json chuan_lop_du_lieu lệch: nhận ${manifest.chuan_lop_du_lieu}, kỳ vọng lop-kho@1`);
  }
  for (const [tenTep, expectedLop] of Object.entries(LOP_DU_LIEU_CHUAN_TEP)) {
    const entry = manifest.tep[tenTep];
    if (entry?.lop_du_lieu && entry.lop_du_lieu !== expectedLop) {
      throw new Error(`manifest.json tep["${tenTep}"].lop_du_lieu lệch: nhận ${entry.lop_du_lieu}, kỳ vọng ${expectedLop}`);
    }
  }
  const dkMeta = manifest.tep['dieu-khoan.json'];
  if (dkMeta?.truong_lan) {
    if (dkMeta.truong_lan.nguyen_van_nguon_a && dkMeta.truong_lan.nguyen_van_nguon_a !== 'LUAT') {
      throw new Error(`manifest.json dieu-khoan.json.truong_lan.nguyen_van_nguon_a phải là LUAT`);
    }
    if (dkMeta.truong_lan.tom_tat_nhap && dkMeta.truong_lan.tom_tat_nhap !== 'BO_TRO') {
      throw new Error(`manifest.json dieu-khoan.json.truong_lan.tom_tat_nhap phải là BO_TRO`);
    }
  }
  const hsMaMeta = manifest.tep['hs-index-theo-ma.json'];
  if (hsMaMeta?.truong_lan?.tien_le_tb_tchq && hsMaMeta.truong_lan.tien_le_tb_tchq !== 'TIEN_LE') {
    throw new Error(`manifest.json hs-index-theo-ma.json.truong_lan.tien_le_tb_tchq phải là TIEN_LE`);
  }

  const daKiem = [];
  for (const [tenTep, rawText] of Object.entries(rawTextByFile || {})) {
    if (rawText == null) continue;
    const entry = manifest.tep[tenTep];
    if (!entry) throw new Error(`manifest.json thiếu mục ${tenTep}`);
    const buf = Buffer.isBuffer(rawText) ? rawText : Buffer.from(String(rawText), 'utf8');
    if (typeof entry.bytes === 'number' && buf.length !== entry.bytes) {
      throw new Error(`${tenTep} lệch kích thước byte: thực tế ${buf.length}, manifest ${entry.bytes}`);
    }
    if (entry.sha256) {
      const actualSha = createHash('sha256').update(buf).digest('hex');
      if (actualSha !== entry.sha256) {
        throw new Error(`${tenTep} lệch SHA-256: thực tế ${actualSha}, manifest ${entry.sha256}`);
      }
    }
    daKiem.push(tenTep);
  }
  return {
    schemaVersion: ver || null,
    chuanLopDuLieu: manifest.chuan_lop_du_lieu || null,
    daKiem,
  };
}

/** Giữ đúng các trường hs-code-api dùng — bản chụp nhỏ, ổn định (tương thích 1.6.0 & 1.7.0). */
export function rutGon(raw) {
  if (!raw || !Array.isArray(raw.van_ban)) throw new Error('registry.json không có van_ban[]');
  if (raw.luoc_do_phien_ban && !String(raw.luoc_do_phien_ban).startsWith('1.')) {
    throw new Error(`registry.json luoc_do_phien_ban không tương thích: ${raw.luoc_do_phien_ban}`);
  }
  const loi = [];
  const docs = raw.van_ban.map((d) => {
    if (!d.so_hieu || !TINH_TRANG.has(d.tinh_trang)) loi.push(d.so_hieu || '(thiếu số hiệu)');
    return {
      id: d.id || (d.slug ? `vb:${d.slug}` : null),
      van: d.van || null,
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
        chan: d.xac_minh?.chan
          ? {
              ma: d.xac_minh.chan.ma || null,
              viecTiep: d.xac_minh.chan.viec_tiep || null,
              ngay: d.xac_minh.chan.ngay || null,
            }
          : null,
      },
      slug: d.slug,
    };
  });
  if (loi.length) throw new Error(`văn bản thiếu số hiệu/tình trạng hợp lệ: ${loi.slice(0, 5).join(', ')}`);
  return docs;
}

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

/** Bảng mã HS ↔ văn bản: giữ trường hs-code-api dùng, camelCase (tương thích 1.6.0 & 1.7.0). */
export function rutGonHsIndex(raw) {
  if (!raw || !Array.isArray(raw.van_ban)) throw new Error('hs-index.json không có van_ban[]');
  if (raw.luoc_do_phien_ban && !String(raw.luoc_do_phien_ban).startsWith('1.')) {
    throw new Error(`hs-index.json luoc_do_phien_ban không tương thích: ${raw.luoc_do_phien_ban}`);
  }
  return raw.van_ban.map((v) => ({
    soHieu: v.so_hieu,
    ten: v.ten,
    tinhTrang: v.tinh_trang,
    hieuLucTu: v.hieu_luc_tu || null,
    hetHieuLucTu: v.het_hieu_luc_tu || null,
    hieuLucDaDoiChieu: v.hieu_luc_da_doi_chieu === true,
    table: {
      file: v.bang?.tep || null,
      source: v.bang?.nguon || null,
      extractedBy: v.bang?.trich_boi || null,
      date: v.bang?.ngay || null,
      verified: v.bang?.da_doi_chieu === true,
      phienBanAhtn: v.bang?.phien_ban_ahtn || null,
    },
    slug: v.slug,
    rows: (v.dong || []).map((d) => ({
      nutBieu: d.nut_bieu || (d.ma_hs ? `bieu:${d.ma_hs}` : null),
      van: d.van || null,
      hs: d.ma_hs || null, moTa: d.mo_ta, nhom: d.nhom || null, phuLuc: d.phu_luc || null, loaiTacDong: d.loai_tac_dong,
      mucRuiRo: d.muc_rui_ro || null, dieuKien: d.dieu_kien || null, danChieu: d.dan_chieu || null, trang: d.trang ? Number(d.trang) : null,
    })),
  }));
}

/**
 * Rút gọn dist/dieu-khoan.json (luoc_do_phien_ban: '1.5.0' → '1.7.0'):
 * CHỈ trích xuất tầng NGUYEN_VAN_NGUON_A; tuyệt đối KHÔNG trộn TOM_TAT_NHAP thành căn cứ pháp lý.
 */
export function rutGonDieuKhoan(raw) {
  if (!raw || !Array.isArray(raw.nguyen_van_nguon_a)) {
    throw new Error('dieu-khoan.json không có nguyen_van_nguon_a[]');
  }
  if (raw.luoc_do_phien_ban && !String(raw.luoc_do_phien_ban).startsWith('1.')) {
    throw new Error(`dieu-khoan.json luoc_do_phien_ban không tương thích: ${raw.luoc_do_phien_ban}`);
  }
  return raw.nguyen_van_nguon_a
    .filter((d) => d && d.tang_tin_cay === 'NGUYEN_VAN_NGUON_A')
    .map((d) => ({
      soHieu: d.so_hieu,
      slug: d.slug,
      ten: d.ten,
      tinhTrang: d.tinh_trang || null,
      hieuLucTu: d.hieu_luc_tu || null,
      hetHieuLucTu: d.het_hieu_luc_tu || null,
      hieuLucDaDoiChieu: d.hieu_luc_da_doi_chieu === true,
      nguonA: d.nguon_a || null,
      tangTinCay: 'NGUYEN_VAN_NGUON_A',
      dieuKhoan: (Array.isArray(d.dieu_khoan) ? d.dieu_khoan : []).map((k) => ({
        id: k.id || null,
        van: k.van || null,
        dieu: k.dieu,
        khoan: k.khoan ?? null,
        diem: k.diem ?? null,
        noiDung: k.noi_dung,
        trangPdf: k.trang_pdf ?? null,
        sha256Pdf: k.sha256_pdf || null,
        trangThaiDieu: k.trang_thai_dieu || 'NGUYEN_BAN',
        lichSuTacDong: Array.isArray(k.lich_su_tac_dong) ? k.lich_su_tac_dong : [],
      })),
    }));
}

export async function main(args = process.argv.slice(2)) {
  const from = docThamSo(args, '--from');
  const checkOnly = args.includes('--check');
  const hsFrom = docThamSo(args, '--hs-index-from');
  const manifestFrom = docThamSo(args, '--manifest-from');
  const withDieuKhoan = args.includes('--with-dieu-khoan');
  const dkFrom = docThamSo(args, '--dieu-khoan-from');
  const summaryFile = docThamSo(args, '--summary');
  const touchFreshness = args.includes('--touch-freshness');

  const { raw, rawText, source } = await load(from);
  const rawTexts = { 'registry.json': rawText };
  const docs = rutGon(raw);
  const out = {
    _comment: `Bản chụp sổ đăng ký văn bản của kho cộng đồng oz-wiki-plhq. KHÔNG sửa tay — chạy node scripts/sync-plhq.mjs. lib/plhq-registry.js đọc tệp này. ${GHI_NGUON_CC_BY}.`,
    attribution: GHI_NGUON_CC_BY,
    source,
    repo: 'https://github.com/ozvietnam/oz-wiki-plhq',
    license: raw.giay_phep || 'CC BY 4.0',
    schemaVersion: raw.luoc_do_phien_ban || null,
    lopDuLieu: raw.lop_du_lieu || 'LUAT',
    registryVersion: raw.phien_ban || null,
    syncedAt: new Date().toISOString().slice(0, 10),
    total: docs.length,
    documents: docs,
  };
  console.log(`${docs.length} văn bản · phiên bản ${out.registryVersion} · lược đồ ${out.schemaVersion || '?'} · ${docs.filter((d) => d.xacMinh.hieuLucDaDoiChieu).length} đã đối chiếu hiệu lực`);

  const cu = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const ss = soSanh(cu, out);
  const lon = ss.bot.length > 0 || ss.doiTinhTrang.length > NGUONG_DOI_TINH_TRANG;
  console.log(`Thay đổi: +${ss.them.length} −${ss.bot.length} văn bản · ${ss.doiTinhTrang.length} đổi tình trạng · ${ss.doiKhac} văn bản sửa`);

  let hsDoi = false;
  let hsPayload = null;
  let coLoi = false;
  try {
    let hsRaw;
    let hsText = null;
    if (hsFrom) {
      hsText = readFileSync(hsFrom, 'utf8');
      hsRaw = JSON.parse(hsText);
    } else if (!from) {
      const res = await fetch(URL_HS);
      if (res.status === 404) console.log('Kho chưa có dist/hs-index.json — bỏ qua bảng mã HS.');
      else if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${URL_HS}`);
      else {
        hsText = await res.text();
        hsRaw = JSON.parse(hsText);
      }
    }
    if (hsRaw) {
      rawTexts['hs-index.json'] = hsText;
      const docsHs = rutGonHsIndex(hsRaw);
      const cuHs = existsSync(OUT_HS) ? JSON.parse(readFileSync(OUT_HS, 'utf8')) : null;
      hsDoi = JSON.stringify(cuHs?.documents || null) !== JSON.stringify(docsHs);
      const soDong = docsHs.reduce((n, d) => n + d.rows.length, 0);
      console.log(`Bảng mã HS: ${docsHs.length} văn bản · ${soDong} dòng${hsDoi ? ' (có đổi)' : ''}`);
      if (!checkOnly && hsDoi) {
        hsPayload = {
          _comment: `Bản chụp bảng mã HS ↔ văn bản của kho cộng đồng oz-wiki-plhq. KHÔNG sửa tay — chạy node scripts/sync-plhq.mjs. lib/plhq-registry.js đọc tệp này. ${GHI_NGUON_CC_BY}.`,
          attribution: GHI_NGUON_CC_BY,
          source: hsFrom || URL_HS, repo: 'https://github.com/ozvietnam/oz-wiki-plhq', schema: 'docs/luoc-do-danh-muc-hs.md',
          schemaVersion: hsRaw.luoc_do_phien_ban || null, lopDuLieu: hsRaw.lop_du_lieu || 'LUAT',
          registryVersion: hsRaw.phien_ban || null, syncedAt: new Date().toISOString().slice(0, 10), documents: docsHs,
        };
      }
    }
  } catch (e) {
    console.error(`Bảng mã HS: ${e.message}`);
    process.exitCode = 1;
    coLoi = true;
  }

  // Tuỳ chọn opt-in điều khoản nguồn A — mặc định TẮT để workflow plhq-sync hằng ngày không đổi.
  let dkDoi = false;
  let dkPayload = null;
  if (withDieuKhoan || dkFrom) {
    try {
      let dkRaw;
      let dkText = null;
      if (dkFrom) {
        dkText = readFileSync(dkFrom, 'utf8');
        dkRaw = JSON.parse(dkText);
      } else if (withDieuKhoan) {
        const res = await fetch(URL_DK);
        if (res.status === 404) console.log('Kho chưa có dist/dieu-khoan.json — bỏ qua điều khoản.');
        else if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${URL_DK}`);
        else {
          dkText = await res.text();
          dkRaw = JSON.parse(dkText);
        }
      }
      if (dkRaw) {
        rawTexts['dieu-khoan.json'] = dkText;
        const docsDk = rutGonDieuKhoan(dkRaw);
        const cuDk = existsSync(OUT_DK) ? JSON.parse(readFileSync(OUT_DK, 'utf8')) : null;
        dkDoi = JSON.stringify(cuDk?.documents || null) !== JSON.stringify(docsDk);
        const soDieu = docsDk.reduce((n, d) => n + d.dieuKhoan.length, 0);
        console.log(`Điều khoản nguồn A: ${docsDk.length} văn bản · ${soDieu} điều khoản${dkDoi ? ' (có đổi)' : ''}`);
        if (!checkOnly && dkDoi) {
          dkPayload = {
            _comment: `Bản chụp điều khoản NGUYEN_VAN_NGUON_A của kho cộng đồng oz-wiki-plhq (KHÔNG trộn TOM_TAT_NHAP). KHÔNG sửa tay — chạy node scripts/sync-plhq.mjs --with-dieu-khoan. ${GHI_NGUON_CC_BY}.`,
            attribution: GHI_NGUON_CC_BY,
            source: dkFrom || URL_DK,
            repo: 'https://github.com/ozvietnam/oz-wiki-plhq',
            license: dkRaw.giay_phep || 'CC BY 4.0',
            schemaVersion: dkRaw.luoc_do_phien_ban || '1.5.0',
            lopDuLieu: dkRaw.lop_du_lieu || 'LUAT',
            registryVersion: dkRaw.phien_ban || null,
            syncedAt: new Date().toISOString().slice(0, 10),
            total: docsDk.length,
            documents: docsDk,
          };
        }
      }
    } catch (e) {
      console.error(`Điều khoản nguồn A: ${e.message}`);
      process.exitCode = 1;
      coLoi = true;
    }
  }

  // Kiểm tra dist/manifest.json (SHA-256 + bytes + chuẩn lop-kho@1) TRƯỚC khi ghi bất kỳ tệp chụp nào.
  let manifestLoi = false;
  if (manifestFrom || !from) {
    try {
      let manifestRaw = null;
      if (manifestFrom) manifestRaw = JSON.parse(readFileSync(manifestFrom, 'utf8'));
      else {
        const res = await fetch(URL_MANIFEST);
        if (res.status === 404) console.log('Kho chưa có dist/manifest.json — bỏ qua đối chiếu SHA-256.');
        else if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${URL_MANIFEST}`);
        else manifestRaw = await res.json();
      }
      if (manifestRaw) {
        const kq = kiemTraManifest(manifestRaw, rawTexts);
        console.log(`Manifest ${kq.schemaVersion || '?'} (${kq.chuanLopDuLieu || '?'}): khớp SHA-256 + bytes cho ${kq.daKiem.join(', ')}`);
      }
    } catch (e) {
      console.error(`Manifest: ${e.message}`);
      process.exitCode = 1;
      manifestLoi = true;
    }
  }

  const choPhepGhi = !checkOnly && !manifestLoi && !coLoi;
  console.log(`CHANGED=${choPhepGhi ? (ss.coDoi || hsDoi || dkDoi) : (checkOnly && !manifestLoi && !coLoi ? (ss.coDoi || hsDoi || dkDoi) : false)}`);
  console.log(`LARGE=${lon}`);
  if (summaryFile) {
    const dongTomTat = [
      `Đồng bộ sổ đăng ký văn bản từ [oz-wiki-plhq](${out.repo}) — phiên bản ${out.registryVersion}, ${docs.length} văn bản (${GHI_NGUON_CC_BY}).`,
      '',
      `- Văn bản mới: ${ss.them.join(', ') || 'không'}`,
      `- Văn bản bị bớt: ${ss.bot.join(', ') || 'không'}`,
      `- Đổi tình trạng (${ss.doiTinhTrang.length}): ${ss.doiTinhTrang.map((x) => `${x.soHieu} ${x.tu} → ${x.thanh}`).join('; ') || 'không'}`,
      `- Văn bản sửa trường khác: ${ss.doiKhac}`,
      `- Bảng mã HS ↔ văn bản: ${hsDoi ? 'có cập nhật' : 'không đổi'}`,
    ];
    if (withDieuKhoan || dkFrom) {
      dongTomTat.push(`- Điều khoản nguồn A: ${dkDoi ? 'có cập nhật' : 'không đổi'}`);
    }
    dongTomTat.push(lon ? `\n**Thay đổi lớn** (bớt văn bản hoặc trên ${NGUONG_DOI_TINH_TRANG} văn bản đổi tình trạng) — cần người duyệt.` : '');
    writeFileSync(summaryFile, dongTomTat.join('\n') + '\n');
  }
  if (manifestLoi || coLoi) {
    console.error('Dừng ghi bản chụp do kiểm tra dữ liệu/manifest thất bại.');
    console.log('TOUCHED=false');
    return;
  }
  if (!checkOnly && hsPayload) {
    writeFileSync(OUT_HS, JSON.stringify(hsPayload, null, 1) + '\n');
    console.log(`Đã ghi ${OUT_HS.slice(ROOT.length + 1)}`);
  }
  if (!checkOnly && dkPayload) {
    writeFileSync(OUT_DK, JSON.stringify(dkPayload, null, 1) + '\n');
    console.log(`Đã ghi ${OUT_DK.slice(ROOT.length + 1)}`);
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
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
