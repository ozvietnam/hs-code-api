#!/usr/bin/env node
/**
 * #1636 Việc 3 — Máy rút TẤT ĐỊNH (0 AI, 0 mạng) các câu loại trừ của chú giải chi tiết nhóm
 * từ `data/chu-giai-heading.json` và `data/explanatory-notes.json` vào `data/so-tay/<nhom4>.json`.
 *
 * Mọi mục mới thêm được gắn `loai: 'LOAI_TRU'`, `nguon: 'nhom<4>.nhom'`, `nguonLoai: 'AI_DA_KIEM'`,
 * phải qua `lib/so-tay.js#checkItem('loaiTru')` + `verifySoTay` (0 mục thiếu trích dẫn).
 *
 * Cách chạy:
 *   node scripts/rut-loai-tru-va-wco.mjs --dry   # xem thống kê & kiểm tra, không ghi đĩa
 *   node scripts/rut-loai-tru-va-wco.mjs --ap    # ghi vào data/so-tay/*.json (tất định, lặp lại giữ nguyên)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const { checkItem, verifySoTay, sourcesFor, squash } = require('../lib/so-tay.js');
const { tuKhoa } = require('../lib/do-thi/tu-khoa.js');
const T = require('../lib/hs-tree.js');

const dry = process.argv.includes('--dry') || !process.argv.includes('--ap');

const RE_HEAD_EXCLUSION = /^(?:(?:tuy\s+nhiên\s*,?\s*)?nhóm\s+này(?:\s+cũng)?\s+không\s+bao\s+gồm|cũng\s+không\s+bao\s+gồm\s+ở\s+đây)\b/i;
const RE_INLINE_EXCLUSION = /(?:nhóm\s+này(?:\s+cũng)?\s+không\s+bao\s+gồm|không\s+thuộc\s+nhóm\s+này|\bbị\s+loại\s+trừ\b|\bloại\s+trừ\b|không\s+được\s+(?:phân\s+loại|xếp)\s+(?:vào|trong)\s+nhóm\s+này|được\s+phân\s+loại\s+như\s+các\s+bộ\s+phận\s+của\s+máy|bộ\s+phận\s+giữ\s+chổi\s+than\b|thì\s+không\s+thuộc\s+nhóm\s+này|mà\s+thuộc\s+(?:nhóm|chương)\b)/i;
const RE_SECTION_HEADER = /^(?:\([A-ZIVX]{1,5}\)\s+[\p{Lu}\s]{3,}|\*{3,}|BỘ\s+PHẬN\b|TỔNG\s+QUÁT\b|Chú\s+giải\s+phân\s+nhóm)/u;
const RE_ALLOWANCE = /\bvẫn\s+(?:được\s+)?(?:phân\s+loại|xếp)\b|\bngay\s+cả\s+khi\b/i;
const RE_EXAMPLE_AT = /\bví\s+dụ\b[^()]{0,60}$/i;

/** Tách đoạn giữ nguyên chuỗi con gốc. */
function splitSentences(block) {
  const out = [];
  let start = 0;
  for (let i = 0; i < block.length; i += 1) {
    const ch = block[i];
    if (ch !== '.' && ch !== ';') continue;
    const prev = block.slice(Math.max(0, i - 6), i);
    const next = block.slice(i + 1, i + 8);
    // Không ngắt giữa mã 84.31 / Ch.32 / v.v.. / chữ viết tắt 1 chữ / số thập phân
    if (/\d{2}$/.test(prev) && /^\d{2}/.test(next)) continue;
    if (/(?:v\.v|Ch|tp|Tp|Dr|Mr|vd)$/i.test(prev)) continue;
    if (ch === '.' && /^\s*[\p{Ll}0-9]/u.test(next) && !/^\s*\([a-z0-9]+\)/i.test(next)) continue;
    if (i + 1 < block.length && !/^\s/.test(next)) continue;
    const piece = block.slice(start, i + 1).trim();
    if (piece) out.push(piece);
    start = i + 1;
  }
  const tail = block.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Rút đoạn con hướng đích rõ từ một đoạn chú giải chi tiết. */
function extractCandidateClauses(rawText) {
  const candidates = [];
  const lines = String(rawText || '').split(/\n+/);
  let inExBlock = false;
  let curBullet = '';

  const flushBullet = () => {
    const b = curBullet.trim();
    curBullet = '';
    if (b) candidates.push({ loaiPhatHien: 'muc-liet-ke', trich: b });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushBullet(); continue; }
    if (RE_SECTION_HEADER.test(line)) {
      flushBullet();
      inExBlock = false;
      continue;
    }
    if (RE_HEAD_EXCLUSION.test(line)) {
      flushBullet();
      inExBlock = true;
      // Kiểm nếu phần sau dấu ':' đã liệt kê ngay trên cùng dòng
      const afterColon = line.replace(/^[^:]{0,120}:\s*/, '');
      if (afterColon !== line && afterColon.length > 10 && !/^(?:\([a-z0-9]+\))/i.test(afterColon)) {
        candidates.push({ loaiPhatHien: 'doan-loai-tru', trich: line });
      } else if (!line.endsWith(':')) {
        for (const s of splitSentences(line)) candidates.push({ loaiPhatHien: 'cau-loai-tru', trich: s });
      }
      continue;
    }
    if (inExBlock) {
      if (/^(?:\([a-z0-9]{1,4}\)|[-•])\s+/i.test(line)) {
        flushBullet();
        curBullet = line;
      } else if (curBullet) {
        curBullet = `${curBullet}\n${rawLine.trim()}`;
      } else if (RE_INLINE_EXCLUSION.test(line) || /\((?:các\s+)?(?:nhóm|chương)\b/i.test(line)) {
        for (const s of splitSentences(line)) candidates.push({ loaiPhatHien: 'trong-khoi', trich: s });
      } else {
        inExBlock = false;
      }
    }
    if (!inExBlock && RE_INLINE_EXCLUSION.test(line)) {
      for (const s of splitSentences(line)) {
        if (RE_INLINE_EXCLUSION.test(s)) candidates.push({ loaiPhatHien: 'cau-trong-doan', trich: s });
      }
    }
  }
  flushBullet();
  return candidates;
}

/** Rút danh sách mã đích (4 số hoặc 2 số chương) xuất hiện tại ngữ cảnh loại trừ / chuyển nhóm trong câu. */
function extractTargetCodes(trich, selfH4, validHeadingSet, validChapterSet) {
  const selfCh = selfH4.slice(0, 2);
  const found = new Set();
  // Ưu tiên cụm trong ngoặc có nhóm/chương hoặc cụm "thuộc nhóm / sang nhóm / ví dụ nhóm / phân loại vào nhóm / Chương XX"
  const RE_H4 = /(?:nhóm|nhom|thuộc|vào|ví dụ)\s*(?:từ\s*)?(\d{2})\.(\d{2})(?:\s*(?:hoặc|và|hay|,|đến|tới)\s*(?:nhóm\s*)?(\d{2})\.(\d{2}))*/gi;
  for (const m of trich.matchAll(RE_H4)) {
    for (const pm of m[0].matchAll(/(\d{2})\.(\d{2})/g)) {
      const h = `${pm[1]}${pm[2]}`;
      if (h !== selfH4 && validHeadingSet.has(h)) found.add(h);
    }
  }
  // Bắt cả "(76.01)" hoặc "(nhóm 85.03)" ở cuối hoặc trong ngoặc
  for (const m of trich.matchAll(/\((?:[^()]{0,60}?)\b(\d{2})\.(\d{2})\b(?:[^()]{0,60}?)\)/gi)) {
    for (const pm of m[0].matchAll(/(\d{2})\.(\d{2})/g)) {
      const h = `${pm[1]}${pm[2]}`;
      if (h !== selfH4 && validHeadingSet.has(h)) found.add(h);
    }
  }
  const RE_CH = /(?:chương|ch\.)\s*0?(\d{1,2})(?!\d|\.\d)/gi;
  for (const m of trich.matchAll(RE_CH)) {
    const ch = String(Number(m[1])).padStart(2, '0');
    if (ch !== selfCh && validChapterSet.has(ch)) found.add(ch);
  }
  // Nếu vừa có nhóm 4 số cụ thể thuộc Chương C vừa nhắc Chương C → ưu tiên giữ nhóm 4 số (nhọn hơn), chỉ giữ Chương khi chưa có nhóm nào trong chương đó
  const h4List = [...found].filter((c) => c.length === 4);
  const chList = [...found].filter((c) => c.length === 2 && !h4List.some((h) => h.startsWith(c)));
  return [...h4List.sort(), ...chList.sort()];
}

function cleanCondition(trich) {
  let s = String(trich || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^\([a-z0-9]{1,4}\)\s*/i, '');
  s = s.replace(/^(?:tuy\s+nhiên\s*,?\s*)?(?:nhóm\s+này(?:\s+cũng)?\s+không\s+bao\s+gồm\s*:?\s*|nó\s+loại\s+trừ\s+)/i, '');
  s = s.replace(/\s*\((?:các\s+)?(?:ví\s+dụ\s+)?(?:từ\s+)?(?:nhóm|chương)\b[^)]*\)\.?\s*$/i, '');
  s = s.replace(/,?\s*(?:\((?:đã|có)\s+hoặc\s+(?:chưa|không)[^)]*\))?\s*(?:được\s+phân\s+loại\s+như\s+các\s+bộ\s+phận\s+của\s+máy|không\s+thuộc\s+nhóm\s+này|thì\s+bị\s+loại\s+trừ|bị\s+loại\s+trừ)\.?$/i, '');
  s = s.replace(/\s*\((?:đã|có)\s+hoặc\s+(?:chưa|không)[^)]*\)\s*$/i, '');
  s = s.replace(/[.;:\s(]+$/, '').trim();
  if (s.length > 160) s = `${s.slice(0, 157).trim()}…`;
  return s;
}

export function extractAll({ apply = !dry } = {}) {
  const cgh = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/chu-giai-heading.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/explanatory-notes.json'), 'utf8'));
  const t = T.tree();
  const validHeadingSet = new Set(Object.keys(cgh).filter((k) => /^\d{4}$/.test(k) && t.nodes.has(k)));
  const validChapterSet = new Set([...t.nodes.values()].filter((n) => n.cap === 2).map((n) => n.id));

  // Gom các câu nguồn bổ sung từ explanatory-notes.json theo heading để đếm tổng & đối chiếu
  const enByH = new Map();
  for (const [k, v] of Object.entries(en)) {
    const h = v.headingCode || k.slice(0, 4);
    if (!enByH.has(h)) enByH.set(h, new Set());
    if (v.noteVi) {
      for (const seg of String(v.noteVi).split(/\s*\|\s*/)) {
        if (seg.trim()) enByH.get(h).add(seg.trim());
      }
    }
  }

  const stDir = path.join(ROOT, 'data/so-tay');
  const stFiles = fs.readdirSync(stDir).filter((f) => /^\d{4}\.json$/.test(f)).sort();
  const stSet = new Set(stFiles.map((f) => f.slice(0, 4)));

  const stats = {
    nhomTrongCgh: Object.keys(cgh).length,
    nhomTrongEn: enByH.size,
    soCauPhatHien: 0,
    soCauDaRutMoi: 0,
    daCoTrongSoTay: 0,
    khongCoSoTay: 0,
    soNhomCapNhat: 0,
    boQua: {},
  };
  const bo = (lyDo) => { stats.boQua[lyDo] = (stats.boQua[lyDo] || 0) + 1; };
  const viDu = [];

  for (const h4 of Object.keys(cgh).sort()) {
    const rawNhom = String(cgh[h4]?.nhom || '');
    if (!rawNhom.trim()) continue;
    const rawCands = extractCandidateClauses(rawNhom);
    // Bổ sung câu từ explanatory-notes.json nếu có câu loại trừ chưa nằm trong extractCandidateClauses
    const seenSq = new Set(rawCands.map((c) => squash(c.trich)));
    for (const seg of enByH.get(h4) || []) {
      if (RE_INLINE_EXCLUSION.test(seg) && !seenSq.has(squash(seg))) {
        rawCands.push({ loaiPhatHien: 'en', trich: seg });
      }
    }
    if (!rawCands.length) continue;

    if (!stSet.has(h4)) { stats.khongCoSoTay += rawCands.length; continue; }
    const stPath = path.join(stDir, `${h4}.json`);
    const stRaw = fs.readFileSync(stPath, 'utf8');
    const indent = /^\{\n {2}"/.test(stRaw) ? 2 : /^\{\n "/.test(stRaw) ? 1 : undefined;
    const st = JSON.parse(stRaw);
    const sources = sourcesFor(h4);

    // Đích đã phủ và trích đã có trong sổ tay hiện hành
    const existing = Array.isArray(st.loaiTru) ? st.loaiTru : [];
    const existingSigs = new Set(existing.map((x) => `${String(x.sangNhom).split('|').sort().join('|')}::${squash(x.trich).slice(0, 40)}`));
    const existingByTargets = existing.map((x) => ({
      targets: new Set(String(x.sangNhom || '').split(/[|,;\s]+/).map((c) => c.replace(/\D/g, '')).filter(Boolean)),
      sq: squash(x.trich),
      kw: new Set(tuKhoa(x.dieuKien || '')),
    }));

    const additions = [];
    for (const cand of rawCands) {
      stats.soCauPhatHien += 1;
      const trich = cand.trich;
      if (RE_ALLOWANCE.test(trich)) { bo('cau-cho-phep'); continue; }
      const codes = extractTargetCodes(trich, h4, validHeadingSet, validChapterSet);
      if (!codes.length) { bo('khong-ro-ma-dich'); continue; }
      if (trich.length > 600) { bo('trich-qua-dai'); continue; }
      const sangNhom = codes.join('|');
      const dieuKien = cleanCondition(trich);
      if (dieuKien.length < 4) { bo('dieu-kien-rong'); continue; }

      const item = {
        loai: 'LOAI_TRU',
        dieuKien,
        sangNhom,
        nguon: `nhom${h4}.nhom`,
        trich,
        nguonLoai: 'AI_DA_KIEM',
      };
      const why = checkItem('loaiTru', item, sources, h4);
      if (why) { bo(why); continue; }

      const sig = `${codes.sort().join('|')}::${squash(trich).slice(0, 40)}`;
      if (existingSigs.has(sig)) { stats.daCoTrongSoTay += 1; continue; }

      // Khử trùng nhẹ nếu sổ tay đã có mục loại trừ cùng tập đích và cùng từ khoá/trích
      const sqNew = squash(trich);
      const kwNew = tuKhoa(dieuKien);
      const dup = existingByTargets.some((e) => {
        if (!codes.every((c) => e.targets.has(c))) return false;
        if (e.sq.includes(sqNew.slice(0, 30)) || sqNew.includes(e.sq.slice(0, 30))) return true;
        if (!kwNew.length) return false;
        const hit = kwNew.filter((w) => e.kw.has(w)).length;
        return hit >= Math.max(2, Math.ceil(kwNew.length * 0.6));
      });
      if (dup) { stats.daCoTrongSoTay += 1; continue; }

      existingSigs.add(sig);
      existingByTargets.push({ targets: new Set(codes), sq: sqNew, kw: new Set(kwNew) });
      additions.push(item);
      if (['8545', '7603', '3924', '6402', '8483', '8431'].includes(h4)) {
        viDu.push({ h4, sangNhom, dieuKien, trich: trich.slice(0, 140) });
      }
    }

    if (additions.length) {
      const next = {
        ...st,
        loaiTru: [...existing, ...additions],
      };
      const ver = verifySoTay(next, h4, sources);
      if (ver.loai.length) {
        throw new Error(`${h4}: verifySoTay loại ${ver.loai.length} mục: ${JSON.stringify(ver.loai[0])}`);
      }
      next.dungTuNguon = ver.soTay.dungTuNguon;
      next.phienBan = ver.soTay.phienBan;
      next.kiemTra = { ...(st.kiemTra || {}), tong: ver.tong, dat: ver.dat };
      if (apply) fs.writeFileSync(stPath, JSON.stringify(next, null, indent) + (stRaw.endsWith('\n') ? '\n' : ''));
      stats.soCauDaRutMoi += additions.length;
      stats.soNhomCapNhat += 1;
    }
  }

  return { stats, viDu, dry: !apply };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = extractAll();
  console.log(JSON.stringify(res, null, 2));
}
