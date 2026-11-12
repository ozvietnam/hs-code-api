#!/usr/bin/env node
/**
 * Mở (unpark) tiền lệ TB-TCHQ đang ký gửi vì mã biểu thuế cũ:
 *   data/community-parked/tb-tchq-bieu-thue-cu.json  (kho ký gửi — scripts/park-old-tariff-precedents.mjs tách ra)
 *     → dẫn nối mã cũ → mã hiện hành bằng lib/legacy-hs-mapping.js (data/legacy-hs-mapping/)
 *     → ghi data/community/tb-tchq/legacy-mo-ky-gui-<ngày>.json (hsCode = mã MỚI, kèm溯源 hs_code_goc)
 *     → xoá bản ghi khỏi kho ký gửi
 * KHÔNG sửa data/precedents.json: nhánh bản ghi dưới mã cũ chết là trạng thái sẵn có của main
 * (tệp nguồn community vẫn còn mã cũ — parking chưa chạy lại); xoá store sẽ bị merge thêm lại.
 * Sau đó chạy scripts/merge-community.mjs để đưa vào kho chính (trình tự giống mọi đóng góp).
 *
 * LÀN (OZV-400): bảng legacy-hs-mapping chỉ chứa cặp trỏ dòng CÓ TÊN — cổng
 * lib/residual-guard.js#isResidual loại cặp trỏ "Loại khác" lúc lib nạp bảng.
 * Làn "Loại khác" (43 mã / 206 bản ghi, OZV-347) phải duyệt từng mã, PR riêng.
 *
 *   node scripts/unpark-legacy-precedents.mjs [--dry-run] [--data-dir DIR] [--mapping-dir DIR]
 *       --data-dir     thư mục data (mặc định <repo>/data) — test trỏ vào thư mục tạm
 *       --mapping-dir  thư mục bảng legacy-hs-mapping (mặc định data/legacy-hs-mapping)
 * Idempotent: chạy lại khi không còn bản ghi mở được ⇒ không ghi gì, thoát 0.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && i < args.length - 1 ? args[i + 1] : null;
}

const DATA_DIR = argValue('--data-dir') || join(root, 'data');
const MAPPING_DIR = argValue('--mapping-dir');
if (MAPPING_DIR) process.env.HS_LEGACY_MAPPING_DIR = MAPPING_DIR;

const require = createRequire(join(root, 'package.json'));
const { doMaMoi, boDi } = require('./lib/legacy-hs-mapping.js');

const NGAY = new Date().toISOString().slice(0, 10);
const parkedPath = join(DATA_DIR, 'community-parked', 'tb-tchq-bieu-thue-cu.json');
const precPath = join(DATA_DIR, 'precedents.json');
const outPath = join(DATA_DIR, 'community', 'tb-tchq', `legacy-mo-ky-gui-${NGAY}.json`);

// Cùng khoá khử trùng với scripts/merge-community.mjs#dedupKey — bản dưới mã cũ trong
// precedents.json (nếu có) phải bị xoá khi bản đã dẫn nối sang mã mới.
const normRef = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
const dedupKey = (hs, ref, desc) => {
  const d = String(desc || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 40);
  return `${hs}::${normRef(ref)}::${d}`;
};

if (!existsSync(parkedPath)) {
  console.error(`Không tìm thấy kho ký gửi: ${parkedPath}`);
  process.exit(1);
}
const parked = JSON.parse(readFileSync(parkedPath, 'utf8'));

// Khớp bieuThueTheoNgay trong scripts/validate-community.mjs — biểu thuế áp dụng theo ngày KÝ thông báo.
const bieuThueTheoNgay = (d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? (d < '2018-01-01' ? '2012' : d < '2022-12-01' ? '2017' : '2022') : null;

// Câu dẫn nối — chuỗi NÀY chính là legacyHsReasoning. Validator (làn dẫn nối trong
// scripts/validate-community.mjs) cắt đúng chuỗi này ra khỏi reasonVi rồi đòi phần lý
// do GỐC còn mã kết luận CŨ — hai chỗ phải giữ nguyên cùng một chữ, đừng sửa lệch.
const cauDanNoi = (old, m) => `Dẫn nối ${old} → ${m.hsMoi} (dòng CÓ TÊN, không phải "Loại khác" — cổng residual-guard) theo bảng legacy-hs-mapping, OZV-400.`;

const stats = { mo: 0, maCu: new Set(), maMoi: new Set(), loaiKhacBiCang: 0, chuaPhuBang: 0, nhanhCuConLai: 0, lyDoDaiNhat: 0 };
const moRa = [];
const conLai = [];

for (const r of parked.records || []) {
  const old = String(r.hsCode || '');
  const m = doMaMoi(old);
  if (!m) {
    // Phân biệt để báo cáo: cặp CÓ trong bảng nhưng rớt cổng residual (làn 2) hay bảng chưa phủ.
    if (boDi()[old]) stats.loaiKhacBiCang += 1;
    else stats.chuaPhuBang += 1;
    conLai.push(r);
    continue;
  }
  stats.mo += 1;
  stats.maCu.add(old);
  stats.maMoi.add(m.hsMoi);
  const cau = cauDanNoi(old, m);
  // reasonVi = nguyên văn lý do thu thập CŨ + câu dẫn nối ở cuối (chứa mã MỚI —
  // validator strict đòi lý do kết thúc ở mã số; TB gốc kết luận bằng mã CŨ).
  const lyDo = `${String(r.reasonVi || '').trimEnd()} ${cau}`;
  stats.lyDoDaiNhat = Math.max(stats.lyDoDaiNhat, lyDo.length);
  if (lyDo.length > 1000) {
    // Validator chặn lý do > 1000 ký tự — không ghi tệp hỏng, báo ngay tại nguồn.
    console.error(`Bản ghi ${r.source?.reference} (${old}): reasonVi sau khi nối câu dẫn nối dài ${lyDo.length} > 1000 ký tự.`);
    process.exit(1);
  }
  // Bản ghi thu thập trước quy trình bieuThue bắt buộc → backfill theo ngày ký (2 bản 2015/2016 → 2012).
  const btBoSung = r.attributes?.bieuThue ? {} : (() => { const v = bieuThueTheoNgay(r.source?.issuedDate); return v ? { bieuThue: v } : {}; })();
  moRa.push({
    ...r,
    hsCode: m.hsMoi,
    reasonVi: lyDo,
    attributes: {
      ...(r.attributes || {}),
      ...btBoSung,
      hs_code_goc: old,
      legacyHs: true,
      legacyHsRemap: [m.hsMoi],
      legacyHsConfidence: 'medium',
      legacyHsReasoning: cau,
      legacyHsNote: `Mở ký gửi từ community-parked/tb-tchq-bieu-thue-cu.json${r.attributes?.tachTuTep ? ` (tách từ ${r.attributes.tachTuTep})` : ''} — làn dòng-có-tên OZV-400; cặp dẫn nối chưa duyệt nghiệp vụ từng mã; reasonVi = nguyên văn bản thu thập cũ + câu dẫn nối ở cuối.`,
    },
  });
}

// Không còn gì mở được ⇒ không ghi (giữ nguyên tệp lần trước, không tạo tệp records rỗng).
if (stats.mo === 0) {
  console.log(`Không có bản ghi mở được (bảng phủ 0 bản ghi còn ký gửi). Ký gửi còn: ${(parked.records || []).length}.`);
  console.log(JSON.stringify({ ...stats, maCu: stats.maCu.size, maMoi: stats.maMoi.size }));
  process.exit(0);
}

// KHÔNG sửa precedents.json ở đây. Bản ghi dưới mã cũ chết trong kho chính là trạng thái
// sẵn có của main (bảng chữ ký của tệp nguồn community vẫn còn chứa mã cũ — chạy
// scripts/park-old-tariff-precedents.mjs chưa được chạy lại sau các lô mới; xoá nhánh
// storesẽ bị scripts/merge-community.mjs thêm lại ngay từ tệp nguồn). Chỉ ĐẾM báo cáo.
if (existsSync(precPath)) {
  const prec = JSON.parse(readFileSync(precPath, 'utf8'));
  for (const rec of moRa) {
    const old = rec.attributes.hs_code_goc;
    const key = dedupKey(old, rec.source?.reference, rec.description);
    const list = prec[old];
    if (!Array.isArray(list)) continue;
    for (const p of list) if (dedupKey(old, p.tbTchqNumber, p.productName) === key) stats.nhanhCuConLai += 1;
  }
}

const doc = {
  kind: 'precedent',
  contributor: parked.contributor || { name: 'agent-legacy-remap', github: 'ozvietnam' },
  license: parked.license || 'CC-BY-SA-4.0',
  submittedAt: NGAY,
  note: `Mở kho tiền lệ ký gửi biểu thuế cũ: ${stats.mo} bản ghi / ${stats.maCu.size} mã cũ dẫn nối sang mã hiện hành theo data/legacy-hs-mapping/ (OZV-400, làn dòng CÓ TÊN — cổng lib/residual-guard.js). Bản ghi giữ nguyên mô tả + lý do TB thu thập trước quy trình bằng chứng (trước 06/10/2026 — không mở lại trang nào), NỐI THÊM câu dẫn nối mã cũ→mới ở cuối reasonVi, đổi hsCode sang mã mới, mã cũ lưu ở attributes.hs_code_goc. Sau tệp này chạy scripts/merge-community.mjs.`,
  records: moRa,
};

if (!DRY) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
  parked.records = conLai;
  writeFileSync(parkedPath, JSON.stringify(parked, null, 2) + '\n');
}

console.log(`${DRY ? '[dry-run] ' : ''}Mở ${stats.mo} bản ghi / ${stats.maCu.size} mã cũ → ${stats.maMoi.size} mã mới → ${outPath.slice(root.length + 1)}`);
console.log(`Ký gửi còn ${conLai.length} bản ghi (bảng chưa phủ: ${stats.chuaPhuBang}, cặp bị cổng giữ lại: ${stats.loaiKhacBiCang}); nhánh mã-cũ còn trong precedents.json (báo cáo, không sửa): ${stats.nhanhCuConLai}`);
console.log(JSON.stringify({ ...stats, maCu: stats.maCu.size, maMoi: stats.maMoi.size, tepRa: outPath.slice(root.length + 1) }, null, 0));
