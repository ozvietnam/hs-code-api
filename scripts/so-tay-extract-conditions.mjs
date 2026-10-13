#!/usr/bin/env node
// #195 bước 2 — bóc điều kiện số có cấu trúc (dieuKienSo) từ CHỮ của sổ tay dòng 8 số.
// Nguyên tắc:
//   - chỉ bóc từ văn bản đã có trong sổ tay (dieuKien breadcrumb + trich dẫn nguồn);
//   - MÁY KIỂM: số + đơn vị phải có nguyên văn trong câu trích — không khớp thì hạ "CAN_SOAT",
//     tuyệt đối không đưa vào nháp dùng để chốt;
//   - fact phải gọi được tên đại lượng (đường kính, công suất...) — không gọi được → CAN_SOAT;
//   - dòng "Loại khác" KHÔNG bóc điều kiện khẳng định (nó là phần dư — chốt bằng phủ định ở runtime);
//   - xuất NHÁP data/so-tay/dieu-kien-so-draft.json để người duyệt ốp vào từng nhóm sau.
// Chạy:  node scripts/so-tay-extract-conditions.mjs [--nhom=8481] [--json]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const DIR = join(import.meta.dirname, '..', 'data', 'so-tay');

// ── Đơn vị máy nhận ra (chuẩn hoá về token) ──
const UNITS = [
  ['cm3|cm³|cm³', 'cm3'], ['mm2|mm²', 'mm2'], ['cm2|cm²', 'cm2'], ['m2|m²', 'm2'],
  ['mah', 'mAh'], ['kva', 'kVA'], ['kw', 'kW'], ['kcal', 'kcal'], ['cca', 'CCA'],
  ['mm', 'mm'], ['cm', 'cm'], ['kg', 'kg'], ['hp', 'hp'], ['kw', 'kW'],
  ['lít|lit|l\b', 'lít'], ['ml', 'ml'], ['w\b|watt', 'W'], ['kva', 'kVA'],
  ['v\b|vôn|volt', 'V'], ['a\b|ampe|amp', 'A'], ['cc\b', 'cc'], ['%', '%'],
  ['m\b|met', 'm'], ['g\b|gram', 'g'], ['tấn|tấn', 'tấn'], ['inch|"', 'inch'],
];
const UNIT_RE = '(?<unit>' + UNITS.map(([re]) => re).join('|') + ')';

// ── Đại lượng → fact chuẩn (theo kiểu snake_case như dieuKienVao sẵn có) ──
const FACT_MAP = [
  [/đường kính|quật kính|thông kính|bore|dia\b/i, 'duong_kinh'],
  [/dung tích|thể tích/i, 'dung_tich'],
  [/khối lượng|trọng lượng/i, 'khoi_luong'],
  [/công suất|một công suất|sức mạnh/i, 'cong_suat'],
  [/điện áp/i, 'dien_ap'],
  [/dòng điện|dòng định mức/i, 'dong_dien'],
  [/hàm lượng|chứa đến|chứa hơn|hàm|nồng độ|độ tinh khiết/i, 'ham_luong'],
  [/độ rượu|nồng độ cồn/i, 'do_ruou'],
  [/áp suất/i, 'ap_suat'],
  [/chiều dài/i, 'chieu_dai'],
  [/chiều rộng|bề rộng/i, 'chieu_rong'],
  [/chiều cao|bề cao/i, 'chieu_cao'],
  [/diện tích|bề mặt/i, 'dien_tich'],
  [/tốc độ|vận tốc/i, 'toc_do'],
  [/tải trọng|số người chở|trọng tải/i, 'tai_trong'],
  [/lực|độ bền kéo|moment|lực kéo/i, 'luc'],
  [/tần số/i, 'tan_so'],
  [/số xylanh/i, 'so_xylanh'],
  [/dung lượng|hồ sơ chứa|bộ nhớ/i, 'dung_luong'],
  [/nhiệt độ/i, 'nhiet_do'],
];

// ── So sánh: cụm từ gần SỐ NHẤT quyết định phép so (tránh "trên 5 cm nhưng không quá 40" đọc nhầm >) ──
const OP_PATTERNS = [
  [/không dưới|tối thiểu|trở lên|từ\s*$/, '>='],
  [/không quá|tối đa|không vượt|trở xuống|đến\s*$/, '<='],
  [/trên|vượt|lớn hơn|hơn\s*$/, '>'],
  [/dưới|nhỏ hơn|be hơn/, '<'],
];
function opOf(before) {
  let best = null; let bestEnd = -1;
  for (const [re, op] of OP_PATTERNS) {
    const m = [...before.matchAll(new RegExp(re.source, 'gi'))].pop();
    if (m && m.index + m[0].length > bestEnd) { bestEnd = m.index + m[0].length; best = op; }
  }
  return best; // null = có số + đơn vị nhưng không có phép so → không phải ngưỡng
}

// Số kiểu Việt: "1.000" = nghìn, "0,5" = thập phân
function parseVN(s) {
  let t = String(s).trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else t = t.replace(',', '.');
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

function unitToken(raw) {
  const r = String(raw || '').toLowerCase().replace('³', '3').replace('²', '2').trim();
  for (const [re, canon] of UNITS) if (new RegExp('^(?:' + re + ')$', 'i').test(r)) return canon;
  return r;
}

// ── Bóc điều kiện từ một khối chữ ──
const NUM_RE = new RegExp('(?<num>\\d+(?:[.,]\\d+)*)\\s*' + UNIT_RE, 'gi');
function extractConditions(text) {
  const out = [];
  for (const m of String(text || '').matchAll(NUM_RE)) {
    const value = parseVN(m.groups.num);
    if (value == null) continue;
    const donVi = unitToken(m.groups.unit);
    const idx = m.index ?? 0;
    const before = String(text).slice(Math.max(0, idx - 45), idx);
    const around = String(text).slice(Math.max(0, idx - 60), idx + m[0].length + 60);
    const op = opOf(before);
    if (!op) continue; // số + đơn vị mà không có phép so thì không phải ranh giới
    const factHit = FACT_MAP.find(([re]) => re.test(around));
    const numAsIs = m.groups.num;
    out.push({
      fact: factHit ? factHit[1] : null,
      op, value, donVi,
      soNguyenVan: numAsIs,
      donViNguyenVan: m.groups.unit,
      kiem: {
        soTrongTrich: null, // điền sau khi đối chiếu trich
        donViTrongTrich: null,
      },
    });
  }
  // gộp trùng
  const seen = new Set();
  return out.filter((c) => {
    const k = `${c.fact}|${c.op}|${c.value}|${c.donVi}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Duyệt sổ tay ──
// dong8 có thể là mảng dòng phẳng {hs, dieuKien, ...} hoặc lồng theo phân nhóm — gom đệ quy mọi object có hs+dieuKien.
function* linesOf(node) {
  if (Array.isArray(node)) { for (const x of node) yield* linesOf(x); return; }
  if (node && typeof node === 'object') {
    if (node.hs && node.dieuKien) { yield node; return; }
    for (const v of Object.values(node)) yield* linesOf(v);
  }
}
const files = readdirSync(DIR).filter((f) => /^\d{4}\.json$/.test(f) && (!argv.nhom || f === argv.nhom + '.json'));
const draft = [];
const stat = { nhom: files.length, dongCoDieuKien: 0, dongLoaiKhac: 0, deXuat: 0, canSoat: 0, khongBocDuoc: 0 };

for (const f of files) {
  const nhom = f.slice(0, 4);
  let j;
  try { j = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch { continue; }
  for (const l of linesOf(j.dong8 || [])) {
    if (!l.hs || !l.dieuKien) continue;
    stat.dongCoDieuKien++;
    if (l.loaiKhac) { stat.dongLoaiKhac++; continue; }
    const trich = String(l.trich || '');
    // Chỉ bóc từ ĐOẠN TÊN CỦA CHÍNH DÒNG (sau "›" cuối của breadcrumb): điều kiện dòng cha/tiêu đề
    // thuộc về nút cha, không thuộc dòng lá — kế thừa xuống lá sẽ làm các dòng cùng thoả (đo 8481/8716).
    const ownSegment = String(l.dieuKien).split('›').pop().trim();
    // Dòng có "hoặc" giữa các khoảng (vd "trên 75 nhưng không quá 100, HOẶC hơn 250") là phép CHỌN —
    // schema v1 chỉ nối AND; bỏ sang hàng soát để không chấm sai chiều nào.
    if (/\bhoặc\b/i.test(ownSegment)) { stat.canSoat++; draft.push({ nhom, hs: l.hs, loaiKhac: !!l.loaiKhac, nguon: l.nguon || null, nguonLoai: l.nguonLoai || null, trich: trich.slice(0, 400), dieuKienSo: [], canSoat: [{ fact: null, lyDo: 'dòng có phép HOẶC giữa các khoảng — chờ soát tay tách nhóm OR', soNguyenVan: null, donViNguyenVan: null }] }); continue; }
    const conds = extractConditions(ownSegment);
    if (!conds.length) { stat.khongBocDuoc++; continue; }
    // máy kiểm: số (nguyên văn) VÀ đơn vị phải cùng có mặt trong câu trích
    for (const c of conds) {
      c.kiem.soTrongTrich = new RegExp('(?<!\\d)' + c.soNguyenVan.replace(/[.,]/g, (x) => '[' + x + ',.]') + '(?!\\d)').test(trich);
      c.kiem.donViTrongTrich = trich.toLowerCase().includes(String(c.donViNguyenVan).toLowerCase().replace('³', '3').replace('²', '2'));
      c.trangThai = (c.kiem.soTrongTrich && c.kiem.donViTrongTrich && c.fact) ? 'DE_XUAT' : 'CAN_SOAT';
      c.lyDo = !c.fact ? 'không gọi được tên đại lượng (fact)' : (!c.kiem.soTrongTrich ? 'số không có nguyên văn trong trích' : (!c.kiem.donViTrongTrich ? 'đơn vị không có trong trích' : null));
      if (c.trangThai === 'DE_XUAT') stat.deXuat++; else stat.canSoat++;
    }
    draft.push({ nhom, hs: l.hs, loaiKhac: !!l.loaiKhac, nguon: l.nguon || null, nguonLoai: l.nguonLoai || null, trich: trich.slice(0, 400), dieuKienSo: conds.filter((c) => c.trangThai === 'DE_XUAT'), canSoat: conds.filter((c) => c.trangThai === 'CAN_SOAT') });
  }
}

// ── Xuất ──
const out = {
  taoLuc: new Date().toISOString(),
  mucDich: '#195 — nháp điều kiện số cho dòng 8 số; DE_XUAT đã qua máy kiểm trích dẫn, CAN_SOAT chờ người soát; KHÔNG dùng để chốt cho tới khi ốp vào sổ tay nhóm và qua duyệt',
  tongKe: stat,
  dong: draft,
};
const OUT_PATH = join(DIR, 'dieu-kien-so-draft.json');
if (!argv.json) {
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 1));
  console.error('ghi', OUT_PATH);
}
console.log(JSON.stringify({ tongKe: stat, mauDeXuat: draft.flatMap((d) => d.dieuKienSo.map((c) => ({ hs: d.hs, ...c }))).slice(0, 6), mauCanSoat: draft.flatMap((d) => d.canSoat.map((c) => ({ hs: d.hs, fact: c.fact, lyDo: c.lyDo, so: c.soNguyenVan + ' ' + c.donViNguyenVan }))).slice(0, 6) }, null, 1));
