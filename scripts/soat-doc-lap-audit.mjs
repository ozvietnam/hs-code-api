#!/usr/bin/env node
/**
 * scripts/soat-doc-lap-audit.mjs — kiểm ĐỘC LẬP bản nháp sổ tay (KHÔNG dùng check-so-tay).
 *
 * Dùng khi người soát độc lập muốn một phép đo ĐỘC LẬP về bản nháp đang soát:
 *   node scripts/soat-doc-lap-audit.mjs [--nhom=2850,2852,...] [--raw=tmp/so-tay/raw] [--nguon=tmp/so-tay/nguon]
 * Mặc định soi MỌI nhóm có trong --raw (mỗi nhóm một tệp <nhom>.json).
 *
 * Cờ in ra là TÍN HIỆU, không phải lỗi: `check-so-tay` mới là cổng nghiệm thu.
 *
 * Kiểm riêng:
 *  A. Câu trích byte-exact trong ĐÚNG khối nguồn `nguon` (mỗi mảnh ≥6 ký tự phải là substring).
 *  B. Gác từ mức B: mọi từ ≥3 ký tự trong text/dieuKien/hoi phải có trong câu trích của CHÍNH mục.
 *  C. Trần clip runtime: phamVi.text 220 · loaiTru.dieuKien 55 · phanBiet.hoi 110 · dong8.dieuKien 90.
 *  D. Đích loại trừ / mã phân biệt có thật trong câu trích.
 *  E. Câu rào: trích bị cắt trước "tùy…/thường…/có thể…" mà phần sau câu có ý nghĩa loại trừ.
 *  F. Trích 300–600 ký tự (máy im lặng).
 *  G. Ngoại lệ NGAY SAU câu trích bị bỏ (mất vế "trừ/tuy nhiên/với điều kiện").
 *  H. Câu trích cắt cụt giữa chừng (kết thúc bằng dấu phẩy, không có dấu kết câu).
 *  I. "A hoặc B" bị tách thành đích duy nhất (thiếu nhánh "hoặc" trong khi nguồn có).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const RAW_DIR = path.resolve(ROOT, arg('raw', 'tmp/so-tay/raw'));
const NGON_DIR = path.resolve(ROOT, arg('nguon', 'tmp/so-tay/nguon'));
const NHOMS = arg('nhom', '')
  ? arg('nhom', '').split(',').map((x) => x.trim()).filter(Boolean)
  : fs.readdirSync(RAW_DIR).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.replace('.json', ''));
const CLIP = { phamViText: 220, loaiTruDieuKien: 55, phanBietHoi: 110, dong8DieuKien: 90 };

const squash = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
const boDau = (s) => squash(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D')).toLowerCase();

/** Nạp khối nguồn từ tmp/so-tay/nguon/<nhom>.txt */
function loadSources(nhom) {
  const p = path.join(NGON_DIR, `${nhom}.txt`);
  if (!fs.existsSync(p)) return null;
  const txt = fs.readFileSync(p, 'utf8');
  const out = {};
  let cur = null;
  for (const line of txt.split('\n')) {
    const m = line.match(/^\[(.+)\]$/);
    if (m) { cur = m[1]; out[cur] = ''; continue; }
    if (cur) out[cur] += line + '\n';
  }
  return out;
}

/** Tách trích theo "…" thành các mảnh con. */
function frags(trich) {
  return String(trich || '').split(/…|\.{3,}/).map(squash).filter((f) => f.length >= 6);
}

/** Mọi từ ≥3 ký tự trong trường tự viết, bỏ dấu, lowercase. */
function words(s) {
  return boDau(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
}

const CLOI = new Set(['cua', 'va', 'cac', 'cho', 'voi', 'khong', 'mot', 'nhom', 'hang', 'nhay', 'de', 'la', 'co', 'duoc', 'nay', 'day', 'khi', 'nhu', 'ma', 'hay', 'thi', 'theo', 'trong', 'khong', 'bao', 'gom', 'cua', 'cac', 'chi', 'khi', 'duoc', 'xep', 'vao', 'trong', 'nhom']);

const RAO = /tùy (theo )?(từng )?trường hợp|thường (nằm|thuộc|được xếp|xếp|được phân loại)|\(thường|tùy từng/iu;
const NGOAI_LE = /^(nhưng|tuy nhiên|trừ|với điều kiện|tuy các|except|provided)/iu;

function auditItem(kind, item, sources, nhom, idx) {
  const problems = [];
  const src = sources[item.nguon];
  if (src === undefined) {
    problems.push({ loai: 'NGUON-KHONG-CO', ghi: `nguon=${item.nguon}` });
    return problems;
  }
  const sq = squash(src);
  const tr = String(item.trich || '');

  // A. byte-exact
  const fs_ = frags(tr);
  if (!fs_.length) problems.push({ loai: 'TRICH-QUA-NGAN', ghi: 'không có mảnh ≥6 ký tự' });
  else {
    for (const f of fs_) {
      if (!sq.includes(f)) {
        // tìm đoạn gần giống để báo
        let best = '', bestD = 1e9;
        for (let i = 0; i + f.length <= sq.length; i += 7) {
          const seg = sq.slice(i, i + f.length);
          let d = 0;
          for (let k = 0; k < f.length; k++) if (seg[k] !== f[k]) d++;
          if (d < bestD) { bestD = d; best = seg; }
        }
        problems.push({ loai: 'TRICH-KHONG-BYTE-EXACT', ghi: `mảch lệch ${bestD} ký tự: "${f}" ≠ "${best}"` });
      }
    }
  }

  // F. độ dài
  if (tr.length > 300 && tr.length <= 600) problems.push({ loai: 'TRICH-300-600', ghi: `${tr.length} ký tự — máy im lặng` });

  // H. cắt cụt
  const lastFrag = fs_.slice(-1)[0] || '';
  if (lastFrag && /[,;–—-]$/.test(lastFrag) && !/[.;:»\)]$/.test(lastFrag)) {
    problems.push({ loai: 'TRICH-CAT-CUT', ghi: `kết thúc bằng "${lastFrag.slice(-1)}" (câu bị cắt cụt)` });
  }

  // B. gác từ mức B
  const hay = [item.text, item.dieuKien, item.hoi].filter(Boolean).join(' ');
  const trb = boDau(tr);
  const thieu = [];
  for (const w of new Set(words(hay))) {
    if (CLOI.has(w)) continue;
    if (!trb.includes(w)) thieu.push(w);
  }
  if (thieu.length) problems.push({ loai: 'TU-KHONG-TRONG-TRICH', ghi: thieu.join(', ') });

  // C. trần clip runtime
  if (kind === 'loaiTru' && String(item.dieuKien || '').length > CLIP.loaiTruDieuKien) {
    problems.push({ loai: 'TRAN-CLIP-55', ghi: `dieuKien ${item.dieuKien.length} > 55 — runtime cắt còn: "${String(item.dieuKien).slice(0, 55)}…"` });
  }
  if (kind === 'phanBiet' && String(item.hoi || '').length > CLIP.phanBietHoi) {
    problems.push({ loai: 'TRAN-CLIP-110', ghi: `hoi ${item.hoi.length} > 110 — runtime cắt còn: "${String(item.hoi).slice(0, 110)}…"` });
  }
  if (kind === 'phamVi' && String(item.text || '').length > CLIP.phamViText) {
    problems.push({ loai: 'TRAN-CLIP-220', ghi: `text ${item.text.length} > 220` });
  }

  // D. đích loại trừ có trong trích
  const mentions = (code) => {
    const dotted = code.length === 4 ? `${code.slice(0, 2)}.${code.slice(2)}` : code;
    return tr.includes(dotted) || tr.replace(/\D/g, ' ').split(/\s+/).includes(code) || tr.includes(`${code.slice(0, 4)}.${code.slice(4)}`);
  };
  if (kind === 'loaiTru') {
    const codes = String(item.sangNhom || '').split(/[|,;\s]+/).map((x) => x.replace(/\D/g, '')).filter(Boolean);
    for (const c of codes) if (!mentions(c)) problems.push({ loai: 'DICH-KHONG-TRONG-TRICH', ghi: `${c}` });
    if (codes.length > 1 && !/hoặc|hay|\band\b|và/i.test(tr)) {
      problems.push({ loai: 'NHIEU-DICH-KHONG-HOAC', ghi: `${codes.join('|')} nhưng trích không có "hoặc"` });
    }
  }
  if (kind === 'phanBiet') {
    for (const c of String(item.neuCo || '').split(/[|,;\s]+/).map((x) => x.replace(/\D/g, '')).filter(Boolean)) {
      if (!c.startsWith(nhom) && !mentions(c)) problems.push({ loai: 'MA-KHONG-TRONG-TRICH', ghi: `neuCo ${c}` });
    }
  }

  // E. câu rào — nguồn còn vế sau "tùy/thường" mà trích dừng trước đó
  const viTri = sq.indexOf(lastFrag);
  if (viTri >= 0) {
    const sau = sq.slice(viTri + lastFrag.length, viTri + lastFrag.length + 120);
    const mr = RAO.exec(sau);
    if (mr) {
      problems.push({ loai: 'CAT-TRUOC-CAU-RAO', ghi: `nguồn ngay sau trích có "${mr[0]}": "${sau.slice(0, 90)}…"` });
    }
    if (NGOAI_LE.test(sau.trim())) {
      problems.push({ loai: 'MAT-NGOAI-LE-SAU-TRICH', ghi: `nguồn ngay sau trích: "${sau.slice(0, 90)}…"` });
    }
  }

  return problems;
}

let tong = 0, tongLoi = 0;
for (const nhom of NHOMS) {
  const rawP = path.join(RAW_DIR, `${nhom}.json`);
  if (!fs.existsSync(rawP)) { console.log(`[!] thiếu ${rawP}`); continue; }
  const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
  const sources = loadSources(nhom);
  if (!sources) { console.log(`[!] thiếu nguồn ${nhom}`); continue; }
  const items = [];
  if (raw.phamVi) items.push({ kind: 'phamVi', item: raw.phamVi, idx: null, label: 'phamVi' });
  if (raw.boPhan) items.push({ kind: 'boPhan', item: raw.boPhan, idx: null, label: 'boPhan' });
  for (const k of ['dieuKienVao', 'loaiTru', 'phanBiet']) {
    (raw[k] || []).forEach((it, i) => items.push({ kind: k, item: it, idx: i, label: `${k}[${i}]` }));
  }
  for (const { kind, item, label } of items) {
    tong += 1;
    const ps = auditItem(kind, item, sources, nhom, label);
    if (ps.length) {
      tongLoi += 1;
      console.log(`\n[${nhom}] ${label}`);
      for (const p of ps) console.log(`   ⚠ ${p.loai}: ${p.ghi}`);
    }
  }
}
console.log(`\n=== ĐÃ SOÁT ${tong} mục · ${tongLoi} mục có cờ ===`);
