#!/usr/bin/env node
// Đồng bộ sổ đăng ký văn bản từ kho cộng đồng oz-wiki-plhq → data/plhq-registry.json (bản chụp).
// Kho cộng đồng là nguồn sự thật về HIỆU LỰC văn bản; hs-code-api chỉ đọc, không sửa ngược.
//   node scripts/sync-plhq.mjs                    # tải dist/registry.json từ GitHub (nhánh main)
//   node scripts/sync-plhq.mjs --from <đường dẫn>  # đọc bản cục bộ (vd clone oz-wiki-plhq)
//   node scripts/sync-plhq.mjs --check             # chỉ kiểm, không ghi
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'plhq-registry.json');
const URL_MAC_DINH = 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/dist/registry.json';
const TINH_TRANG = new Set(['CON_HIEU_LUC', 'HET_HIEU_LUC', 'HET_HIEU_LUC_MOT_PHAN', 'TAM_NGUNG_HIEU_LUC', 'CHUA_CO_HIEU_LUC', 'CHUA_XAC_MINH']);

const args = process.argv.slice(2);
const fromIdx = args.indexOf('--from');
const from = fromIdx >= 0 ? args[fromIdx + 1] : null;
const checkOnly = args.includes('--check');

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
if (!checkOnly) {
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`Đã ghi ${OUT.slice(ROOT.length + 1)}`);
}
