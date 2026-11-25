#!/usr/bin/env node
// scripts/test-lop-kho.mjs — Cổng máy M-23 (#1910): kiểm 100% tệp data/ có lớp (data/lop-kho.json)
// và mô-đun luật KHÔNG được nạp kho BO_TRO, THUC_TE hoặc TIEN_LE. Chạy ngoại tuyến, không mạng, không AI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOC, co, doc, docJson, boKiem } from './lib-luat.mjs';

const LOP_CAM = new Set(['BO_TRO', 'THUC_TE', 'TIEN_LE']);

/** Chuyển mẫu đường dẫn trong lop-kho.json sang RegExp đối chiếu đường dẫn tương đối kiểu POSIX. */
export function reCuaMau(mau) {
  let ra = '^';
  for (let i = 0; i < mau.length; i += 1) {
    const c = mau[i];
    if (c === '*') {
      if (mau[i + 1] === '*') {
        if (mau[i + 2] === '/') { ra += '(?:.*/)?'; i += 2; } else { ra += '.*'; i += 1; }
      } else {
        ra += '[^/]*';
      }
    } else if (c === '[') {
      const end = mau.indexOf(']', i + 1);
      if (end > i) { ra += mau.slice(i, end + 1); i = end; } else { ra += '\\['; }
    } else if ('.+^${}()|\\'.includes(c)) {
      ra += `\\${c}`;
    } else {
      ra += c;
    }
  }
  return new RegExp(`${ra}$`);
}

/** Đệ quy mọi tệp thật dưới thư mục data/ (bỏ qua .DS_Store). */
export function quetTepData(thuMucGoc = GOC) {
  const dataRoot = path.join(thuMucGoc, 'data');
  const ds = [];
  const di = (dirAbs, dirRel) => {
    for (const e of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      if (e.name === '.DS_Store') continue;
      const abs = path.join(dirAbs, e.name);
      const rel = path.posix.join(dirRel, e.name);
      if (e.isDirectory()) di(abs, rel);
      else ds.push(rel);
    }
  };
  if (fs.existsSync(dataRoot)) di(dataRoot, 'data');
  return ds.sort();
}

const boChuThich = (s) => String(s || '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** Tìm mọi chuỗi trỏ tới tệp/thư mục dưới data/ trong mã JS (bỏ dòng chú thích). */
export function trichThamChieuData(maNguon) {
  const s = boChuThich(maNguon);
  const kq = new Set();
  // Dạng 'data/...'
  for (const m of s.matchAll(/['"`](data\/[^'"`\s]+)['"`]/g)) kq.add(m[1]);
  // Dạng dataReadPath('a', 'b', ...) hoặc dataPath('a', 'b')
  for (const m of s.matchAll(/\bdata(?:Read|Write)?Path\s*\(([^)]+)\)/g)) {
    const args = [...m[1].matchAll(/['"`]([^'"`\n]+)['"`]/g)].map((x) => x[1]);
    if (args.length) kq.add(path.posix.join('data', ...args));
  }
  // Dạng __dirname / '..' / 'data' / ... hoặc path.join(..., 'data', ...)
  for (const m of s.matchAll(/\bpath\.(?:join|resolve)\s*\(([^)]*['"`]data['"`][^)]*)\)/g)) {
    const strs = [...m[1].matchAll(/['"`]([^'"`\n]+)['"`]/g)].map((x) => x[1]);
    const idx = strs.indexOf('data');
    if (idx >= 0 && idx + 1 < strs.length) kq.add(path.posix.join('data', ...strs.slice(idx + 1)));
  }
  return [...kq].sort();
}

function napTrucTiepGia(tep, tepGia) {
  let s = tepGia?.has(tep) ? tepGia.get(tep) : null;
  if (s == null) {
    try { s = doc(tep); } catch { return []; }
  }
  const ra = [];
  const RE_NAP = /(?:require\(\s*|from\s+|import\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g;
  for (const m of boChuThich(s).matchAll(RE_NAP)) {
    const p = path.posix.normalize(path.posix.join(path.posix.dirname(tep), m[1]));
    const ung = [p, `${p}.js`, `${p}.mjs`, `${p}/index.js`].find((x) => tepGia?.has(x) || (co(x) && fs.statSync(path.join(GOC, x)).isFile()));
    if (ung) ra.push(ung);
  }
  return ra;
}

/**
 * Phân lớp một đường dẫn data/... theo danh sách mục của lop-kho.json.
 * Trả về mảng các mục khớp.
 */
export function xepLopDuongDan(duongDan, muc) {
  return muc.filter((m) => reCuaMau(m.duongDan).test(duongDan));
}

/** Kiểm độ phủ & tính nhất quán của bảng lop-kho.json trên một tập tệp data/. */
export function kiemBangLopKho(lopKho, tepData) {
  const loi = [];
  const hopLe = new Set(lopKho.lopHopLe || []);
  if (lopKho.khuon !== 'lop-kho@1') loi.push(`khuon phải là "lop-kho@1", nhận "${lopKho.khuon}"`);
  if (!Array.isArray(lopKho.muc) || !lopKho.muc.length) {
    loi.push('muc phải là mảng không rỗng');
    return { loi, theoLop: {} };
  }
  const daKhai = new Set();
  const mucMatchCount = new Map();
  for (const m of lopKho.muc) {
    mucMatchCount.set(m.duongDan, 0);
    if (!m.duongDan || !m.duongDan.startsWith('data/')) loi.push(`duongDan không hợp lệ: ${m.duongDan}`);
    if (daKhai.has(m.duongDan)) loi.push(`trùng duongDan: ${m.duongDan}`);
    daKhai.add(m.duongDan);
    if (!hopLe.has(m.lop)) loi.push(`${m.duongDan}: lớp không hợp lệ "${m.lop}"`);
    if (m.truongLan) {
      for (const [truong, l] of Object.entries(m.truongLan)) {
        if (!hopLe.has(l)) loi.push(`${m.duongDan}.truongLan.${truong}: lớp sai "${l}"`);
      }
    }
    for (const rd of m.aiDoc || []) {
      if (!m.tuyChon && !co(rd)) loi.push(`${m.duongDan}: aiDoc "${rd}" không tồn tại`);
    }
  }

  const theoLop = Object.fromEntries([...hopLe].map((l) => [l, 0]));
  for (const f of tepData) {
    const khop = [];
    for (const m of lopKho.muc) {
      if (reCuaMau(m.duongDan).test(f)) {
        khop.push(m);
        mucMatchCount.set(m.duongDan, (mucMatchCount.get(m.duongDan) || 0) + 1);
      }
    }
    if (khop.length === 0) {
      loi.push(`tệp chưa khai lớp: ${f}`);
    } else if (khop.length > 1) {
      loi.push(`tệp khớp nhiều mục (${khop.map((x) => `${x.duongDan}:${x.lop}`).join(', ')}): ${f}`);
    } else {
      theoLop[khop[0].lop] += 1;
    }
  }

  for (const m of lopKho.muc) {
    if (!m.tuyChon && (mucMatchCount.get(m.duongDan) || 0) === 0) {
      loi.push(`mục bắt buộc không khớp tệp thật nào trên đĩa: ${m.duongDan}`);
    }
  }
  return { loi, theoLop };
}

/** Kiểm mô-đun luật không nạp tệp lớp BO_TRO / THUC_TE / TIEN_LE (trực tiếp hay gián tiếp ngoài ngoại lệ có kiểm soát). */
export function kiemMoDunLuat(lopKho, { tepGia = null } = {}) {
  const loi = [];
  for (const cfg of lopKho.moDunLuatCamLan || []) {
    const tonTai = tepGia?.has(cfg.tep) || co(cfg.tep);
    if (!tonTai) {
      if (!cfg.tuyChon) loi.push(`mô-đun luật bắt buộc không tồn tại: ${cfg.tep}`);
      continue;
    }
    const ngoaiLe = cfg.ngoaiLeChuyenTiep;
    const boQua = new Set(ngoaiLe?.tepTrungGianDuocPhep || []);
    const tepDuLieuDuocPhep = new Set(ngoaiLe?.tepDuLieuDuocPhep || []);

    // Kiểm nội dung chính mô-đun đối với ngoại lệ chuyển tiếp
    const rawSelf = tepGia?.has(cfg.tep) ? tepGia.get(cfg.tep) : doc(cfg.tep);
    const cleanSelf = boChuThich(rawSelf);
    if (ngoaiLe) {
      for (const lc of ngoaiLe.camLoailCanhTrongPhaiDoc || []) {
        if (new RegExp(`['"\`]${lc}['"\`]`).test(cleanSelf)) {
          loi.push(`${cfg.tep}: vi phạm cổng chuyển tiếp — chứa loại cạnh cấm "${lc}"`);
        }
      }
      for (const kw of ngoaiLe.camTenTrongPhaiDoc || []) {
        if (cleanSelf.includes(kw)) {
          loi.push(`${cfg.tep}: vi phạm cổng chuyển tiếp — nhắc tới nguồn cấm "${kw}"`);
        }
      }
    }

    // Duyệt đồ thị require/import
    const thay = new Set([cfg.tep]);
    const hang = [cfg.tep];
    while (hang.length) {
      const tu = hang.pop();
      for (const d of napTrucTiepGia(tu, tepGia)) {
        if (tu === cfg.tep && boQua.has(d)) continue;
        if (boQua.has(d) && ngoaiLe) continue;
        if (!thay.has(d)) { thay.add(d); hang.push(d); }
      }
    }

    for (const modTep of thay) {
      const ma = tepGia?.has(modTep) ? tepGia.get(modTep) : doc(modTep);
      for (const dataRef of trichThamChieuData(ma)) {
        const refChuan = dataRef.replace(/\/$/, '');
        // Khớp cả đường dẫn tệp lẫn thư mục (vd data/wco-op/opinions.json hoặc data/so-tay)
        const khopMuc = lopKho.muc.filter((m) => {
          if (reCuaMau(m.duongDan).test(refChuan)) return true;
          return m.duongDan.startsWith(`${refChuan}/`);
        });
        for (const m of khopMuc) {
          if (LOP_CAM.has(m.lop)) {
            if (ngoaiLe && modTep === cfg.tep && tepDuLieuDuocPhep.has(refChuan)) continue;
            const kieu = modTep === cfg.tep ? 'trực tiếp' : `gián tiếp qua ${modTep}`;
            loi.push(`${cfg.tep} nạp kho ${m.lop} (${m.duongDan}) ${kieu} [tham chiếu ${dataRef}]`);
          }
        }
      }
    }
  }
  return loi;
}

// ── Thực thi kiểm chứng thật + bộ ca ngược ────────────────────────────────────────────────────────────────────
const { kiem, xong } = boKiem('test-lop-kho');
const lopKho = docJson('data/lop-kho.json');
const tepData = quetTepData();

const { loi: loiBang, theoLop } = kiemBangLopKho(lopKho, tepData);
kiem(`100% tệp data/ có lớp trong data/lop-kho.json (${tepData.length} tệp thật, không thiếu/không trùng)`, loiBang.length === 0, loiBang.slice(0, 10).join(' | '));
kiem('tổng số tệp theo 6 lớp khớp tổng số tệp thật', Object.values(theoLop).reduce((a, b) => a + b, 0) === tepData.length, JSON.stringify(theoLop));

const tepLanTrongYeu = [
  'data/chu-giai-heading.json',
  'data/chu-giai-chuong.json',
  'data/explanatory-notes.json',
  'data/legal-notes-enriched.json',
  'data/notes.json',
  'data/so-tay/[0-9][0-9][0-9][0-9].json',
  'data/tax-enriched.json',
  'data/do-thi/canh-nhac-nhom.json',
  'data/do-thi/ban-do-4so/*.json',
  'data/precedents.json',
  'data/luat/chu-giai-2-phan-xvi.json',
];
const thieuTruongLan = tepLanTrongYeu.filter((d) => !lopKho.muc.find((m) => m.duongDan === d && m.truongLan));
kiem(`mọi kho lẫn trọng yếu (${tepLanTrongYeu.length} mục) đều ghi rõ trường lẫn`, thieuTruongLan.length === 0, thieuTruongLan.join(', '));

const loiLuatThuc = kiemMoDunLuat(lopKho);
kiem('cổng chống lẫn trên các mô-đun luật đang có trên cây', loiLuatThuc.length === 0, loiLuatThuc.join(' | '));

// ── 6 Ca ngược bắt buộc (đỏ khi lẫn hoặc thiếu lớp) ────────────────────────────────────────────────────────────
const ca1 = kiemBangLopKho(lopKho, [...tepData, 'data/tu-dien-moi-chua-khai.json']);
kiem('CA NGƯỢC 1: tệp mới trong data/ chưa khai lớp ⇒ ĐỎ', ca1.loi.some((x) => x.includes('data/tu-dien-moi-chua-khai.json')));

const ca2 = kiemMoDunLuat(lopKho, {
  tepGia: new Map([['lib/chu-giai-goc.js', "const s = require('fs').readFileSync('data/synonyms.json', 'utf8');"]]),
});
kiem('CA NGƯỢC 2: lib/chu-giai-goc.js nạp data/synonyms.json (BO_TRO) ⇒ ĐỎ', ca2.some((x) => x.includes('BO_TRO') && x.includes('data/synonyms.json')));

const ca3 = kiemMoDunLuat(lopKho, {
  tepGia: new Map([['lib/chu-giai-goc.js', "const { dataReadPath } = require('./data-paths'); dataReadPath('oz-gold-final.jsonl');"]]),
});
kiem('CA NGƯỢC 3: lib/chu-giai-goc.js nạp data/oz-gold-final.jsonl (THUC_TE) ⇒ ĐỎ', ca3.some((x) => x.includes('THUC_TE') && x.includes('oz-gold-final.jsonl')));

const ca4a = kiemMoDunLuat(lopKho, {
  tepGia: new Map([['lib/do-thi/phai-doc.js', "const LOAI = ['C5', 'C8']; const p = dataReadPath('precedents.json');"]]),
});
kiem('CA NGƯỢC 4: lib/do-thi/phai-doc.js đọc precedents.json hoặc bật C8 ⇒ ĐỎ', ca4a.some((x) => x.includes('C8')) && ca4a.some((x) => x.includes('precedents.json')));

const ca5 = kiemMoDunLuat(lopKho, {
  tepGia: new Map([
    ['lib/chu-giai-goc.js', "const h = require('./tro-luat-tmp');"],
    ['lib/tro-luat-tmp.js', "const t = require('fs').readFileSync('data/trade-synonyms.json', 'utf8');"],
  ]),
});
kiem('CA NGƯỢC 5: mô-đun luật nạp gián tiếp kho BO_TRO qua tệp trung gian ⇒ ĐỎ', ca5.some((x) => x.includes('gián tiếp qua lib/tro-luat-tmp.js') && x.includes('trade-synonyms.json')));

const ca6 = kiemBangLopKho(
  {
    ...lopKho,
    muc: [
      ...lopKho.muc,
      { duongDan: 'data/tax.json', lop: 'SAI_LOP', aiDoc: [], moTa: 'trùng và sai lớp' },
    ],
  },
  tepData,
);
kiem('CA NGƯỢC 6: trùng duongDan hoặc khai lớp ngoài 6 lớp chuẩn ⇒ ĐỎ', ca6.loi.some((x) => x.includes('trùng duongDan')) && ca6.loi.some((x) => x.includes('SAI_LOP')));

const ca7 = kiemMoDunLuat(lopKho, {
  tepGia: new Map([
    ['lib/chu-giai-goc.js', "const tb = require('fs').readFileSync('data/precedents.json', 'utf8');"],
    ['lib/do-thi/dan-chieu.js', "const { dataReadPath } = require('./data-paths'); dataReadPath('luat-goc', 'thong-bao.jsonl');"],
  ]),
});
kiem(
  'CA NGƯỢC 7: mô-đun luật nạp precedents.json hoặc luat-goc/thong-bao.jsonl (TIEN_LE) ⇒ ĐỎ',
  ca7.some((x) => x.includes('TIEN_LE') && x.includes('data/precedents.json'))
    && ca7.some((x) => x.includes('TIEN_LE') && x.includes('luat-goc/thong-bao.jsonl')),
);

if (process.argv.includes('--thong-ke')) {
  console.log('\n=== THỐNG KÊ M-23 (data/lop-kho.json) ===');
  console.log(JSON.stringify({ tongMuc: lopKho.muc.length, tongTepThucTe: tepData.length, theoLop }, null, 2));
}

xong();
export { GOC };
