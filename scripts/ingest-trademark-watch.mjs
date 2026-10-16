#!/usr/bin/env node
/**
 * Nạp dữ liệu nhãn hiệu THẬT vào data/trademark-watch.json (hybrid: hải quan + WIPO).
 *
 * Cách dùng:
 *   node scripts/ingest-trademark-watch.mjs --customs <file.csv|xlsx>   # danh sách giám sát TCHQ (VN nhập)
 *   node scripts/ingest-trademark-watch.mjs --wipo <file.json>          # export WIPO Global Brand DB (VN)
 *   node scripts/ingest-trademark-watch.mjs --gacc <file.json>          # danh sách ghi nhận Hải quan TQ (CN xuất)
 *   node scripts/ingest-trademark-watch.mjs --ipvietnam data/shtt/vn-ipvietnam-dang-ky.jsonl
 *                                                                       # WIPO Publish (Cục SHTT VN) — đợt cào đêm #335
 *
 * Merge rule: GỘP (không ghi đè) niceClasses / registeredNiceClasses /
 * goodsNiceClasses — ca Kamoer mất class hàng hoá vì ingest thay [7,9,11] bằng [35].
 * Nguồn "customs" ưu tiên cao nhất (đặt customsRecorded=true, verified=true).
 * Nguồn "wipo" set status/owner/regNo + verified=true nhưng KHÔNG tự đặt customsRecorded.
 * Nguồn "gacc" set khối cn.{gaccRecorded,recordNo,ipTypes,verified} (rủi ro XUẤT KHẨU TQ).
 * Nguồn "ipvietnam" (JSONL do scripts/shtt/cao-vn-ipvietnam-dang-ky.mjs sinh, đã qua
 * `npm run shtt:kiem`): gộp mọi đơn của cùng ứng viên thành 1 nhãn — status lấy mức
 * cao nhất (có đơn Cấp bằng → REGISTERED; chỉ Đang giải quyết → PENDING; chỉ Hết hạn →
 * EXPIRED; chỉ Từ chối/không rõ → UNKNOWN), khối `vn` giữ số đơn theo trạng thái + nguồn
 * (url, layLuc, sha256 bản thô). KHÔNG đặt owner/niceClasses (trang danh sách không có) và
 * KHÔNG tự bật customsRecorded — đây là registry, không phải recordal hải quan.
 *
 * --- ĐỊNH DẠNG FILE ĐẦU VÀO ---
 * Customs (CSV, từ "Danh sách nhãn hiệu đăng ký giám sát" của Tổng cục Hải quan):
 *   mark,owner,recordNo,niceClasses,expiry
 *   VPOWER,"Công ty ABC",GS-2026-001,"4;7;9",2030-12-31
 *
 * WIPO (JSON, từ export Global Brand Database):
 *   [{ "mark": "...", "owner": "...", "appNo": "...", "regNo": "...",
 *      "niceClasses": [9], "status": "REGISTERED" }]
 *
 * Khi chưa có file thật, script chỉ in hướng dẫn — KHÔNG bịa dữ liệu.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(rootDir, 'data');
const watchPath = join(dataDir, 'trademark-watch.json');
const require = createRequire(join(rootDir, 'package.json'));
const { mergeNiceClasses, hsChaptersForNice } = require('./lib/trademark-watch');

function normalizeMark(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsv(text) {
  // CSV tối giản hỗ trợ field bọc dấu nháy kép.
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
      else cur += ch;
    }
    fields.push(cur);
    rows.push(fields.map((f) => f.trim()));
  }
  return rows;
}

const args = process.argv.slice(2);
const mode = args[0];
const file = args[1];

if (!['--customs', '--wipo', '--gacc', '--ipvietnam'].includes(mode) || !file) {
  console.log('Cách dùng:');
  console.log('  node scripts/ingest-trademark-watch.mjs --customs <file.csv>   # giám sát TCHQ (VN nhập)');
  console.log('  node scripts/ingest-trademark-watch.mjs --wipo <file.json>     # WIPO Global Brand DB (VN)');
  console.log('  node scripts/ingest-trademark-watch.mjs --gacc <file.json>     # ghi nhận Hải quan TQ (CN xuất)');
  console.log('  node scripts/ingest-trademark-watch.mjs --ipvietnam <file.jsonl> # WIPO Publish Cục SHTT VN (data/shtt)');
  console.log('\nXem header file cho định dạng cột mong đợi. Script này KHÔNG bịa dữ liệu.');
  process.exit(args.length ? 1 : 0);
}
if (!existsSync(file)) {
  console.error(`Không tìm thấy file: ${file}`);
  process.exit(1);
}

const db = existsSync(watchPath)
  ? JSON.parse(readFileSync(watchPath, 'utf8'))
  : { _meta: {}, marks: {} };
db.marks = db.marks || {};

let upserts = 0;
function upsert(mark, patch) {
  if (!mark) return;
  const existing = db.marks[mark] || {};
  const registeredNiceClasses = mergeNiceClasses(existing.registeredNiceClasses, patch.registeredNiceClasses);
  const goodsNiceClasses = mergeNiceClasses(existing.goodsNiceClasses, patch.goodsNiceClasses);
  const niceClasses = mergeNiceClasses(
    existing.niceClasses,
    patch.niceClasses,
    registeredNiceClasses,
    goodsNiceClasses,
  );
  db.marks[mark] = {
    ...existing,
    ...patch,
    normalized: normalizeMark(mark),
    niceClasses,
    registeredNiceClasses: registeredNiceClasses.length ? registeredNiceClasses : existing.registeredNiceClasses || [],
    goodsNiceClasses: goodsNiceClasses.length ? goodsNiceClasses : existing.goodsNiceClasses || [],
    hsChapters: hsChaptersForNice(goodsNiceClasses.length ? goodsNiceClasses : niceClasses.filter((c) => c < 35)),
    verified: true,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  upserts += 1;
}

if (mode === '--customs') {
  if (extname(file).toLowerCase() !== '.csv') {
    console.error('Customs ingest hiện hỗ trợ .csv (xuất từ xlsx). Xuất sang CSV rồi chạy lại.');
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const [header, ...body] = rows;
  const col = Object.fromEntries(header.map((h, i) => [h.toLowerCase().trim(), i]));
  for (const r of body) {
    const mark = r[col.mark];
    upsert(mark, {
      owner: r[col.owner] || null,
      customsRecordNo: r[col.recordno] || null,
      niceClasses: (r[col.niceclasses] || '').split(/[;|]/).map((s) => parseInt(s, 10)).filter(Boolean),
      expiry: r[col.expiry] || null,
      status: 'REGISTERED',
      customsRecorded: true,
      source: 'customs',
    });
  }
} else if (mode === '--wipo') {
  const items = JSON.parse(readFileSync(file, 'utf8'));
  for (const it of items) {
    upsert(it.mark, {
      owner: it.owner || null,
      appNo: it.appNo || null,
      regNo: it.regNo || null,
      niceClasses: Array.isArray(it.niceClasses) ? it.niceClasses : [],
      status: String(it.status || 'REGISTERED').toUpperCase(),
      customsRecorded: db.marks[it.mark]?.customsRecorded === true, // giữ nguyên, không tự bật
      source: 'wipo',
    });
  }
} else if (mode === '--ipvietnam') {
  // WIPO Publish (Cục SHTT VN) — bản ghi theo từng đơn, gộp về từng nhãn (ứng viên).
  const TT_SANG_STATUS = { DANG_KY: 'REGISTERED', DANG_XU_LY: 'PENDING', HET_HAN: 'EXPIRED' };
  const THU_TU = ['DANG_KY', 'DANG_XU_LY', 'HET_HAN', 'TU_CHOI', 'KHAC'];
  const rows = readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
  const ungVienPath = join(dataDir, 'shtt', 'ung-vien-nhan-hieu.json');
  const ungVien = existsSync(ungVienPath) ? JSON.parse(readFileSync(ungVienPath, 'utf8')).ungVien || [] : [];
  const tenTheoChuan = new Map(ungVien.map((u) => [u.chuan, u.nhan]));
  const khoaTheoNormalized = new Map(Object.entries(db.marks).map(([k, v]) => [v.normalized || normalizeMark(k), k]));
  const nhom = new Map();
  for (const r of rows) {
    if (!r || !r.ungVien || !r.soDon) continue;
    if (!nhom.has(r.ungVien)) nhom.set(r.ungVien, []);
    nhom.get(r.ungVien).push(r);
  }
  let boQuaThieuNhan = 0;
  for (const [chuan, ds] of nhom) {
    const ten = tenTheoChuan.get(chuan) || ds.find((r) => r.nhan)?.nhan;
    if (!ten) { boQuaThieuNhan += 1; continue; }
    // Nhãn đã có trong watchlist (vd seed "ABB") → cập nhật đúng khoá cũ, không tạo bản trùng.
    const mark = khoaTheoNormalized.get(normalizeMark(ten)) || ten;
    const soDon = {};
    for (const tt of THU_TU) soDon[tt] = [];
    for (const r of ds) (soDon[THU_TU.includes(r.tinhTrang) ? r.tinhTrang : 'KHAC']).push(r.soDon);
    const ttCao = THU_TU.find((tt) => soDon[tt].length) || 'KHAC';
    const status = TT_SANG_STATUS[ttCao] || 'UNKNOWN';
    const moiNhat = ds.map((r) => r.nguon?.layLuc).filter(Boolean).sort().pop() || null;
    const dau = ds.find((r) => r.tinhTrang === ttCao) || ds[0];
    const existing = db.marks[mark] || {};
    upsert(mark, {
      appNo: dau.soDon,
      status,
      customsRecorded: existing.customsRecorded === true, // registry, không phải recordal — giữ nguyên
      source: 'ipvietnam',
      vn: {
        nguon: 'wipopublish.ipvietnam.gov.vn',
        layLuc: moiNhat,
        tongDon: ds.length,
        soDon: Object.fromEntries(THU_TU.map((tt) => [tt, soDon[tt]])),
        thamChieu: { url: dau.nguon?.url || null, sha256: dau.nguon?.sha256 || null },
        ghiChu: 'Trang danh sách WIPO Publish chỉ có số đơn + tên nhãn + trạng thái; chưa có chủ sở hữu/nhóm Nice (làm giàu sau từ trang chi tiết).',
      },
    });
    khoaTheoNormalized.set(normalizeMark(ten), mark);
  }
  if (boQuaThieuNhan) console.warn(`Bỏ qua ${boQuaThieuNhan} ứng viên không có tên nhãn.`);
} else {
  // --gacc: cập nhật khối cn (rủi ro XUẤT KHẨU phía Trung Quốc), không clobber field VN.
  const items = JSON.parse(readFileSync(file, 'utf8'));
  for (const it of items) {
    if (!it.mark) continue;
    const existing = db.marks[it.mark] || { normalized: normalizeMark(it.mark), niceClasses: [], hsChapters: [], source: 'gacc' };
    db.marks[it.mark] = {
      ...existing,
      cn: {
        gaccRecorded: true,
        recordNo: it.recordNo || null,
        ipTypes: Array.isArray(it.ipTypes) ? it.ipTypes : ['trademark'],
        owner: it.owner || existing.cn?.owner || null,
        verified: true,
        source: 'gacc',
      },
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    upserts += 1;
  }
}

db._meta = { ...(db._meta || {}), lastIngest: { mode, file, at: new Date().toISOString() } };
writeFileSync(watchPath, JSON.stringify(db, null, 2));
console.log(`Ingest ${mode} xong: ${upserts} nhãn cập nhật. Tổng ${Object.keys(db.marks).length} nhãn.`);
