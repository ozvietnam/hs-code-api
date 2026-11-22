#!/usr/bin/env node
/**
 * scripts/do-tien-xu-ly-de-rieng.mjs — Đo T-4 (#1596) trên bộ thử để riêng 300 ca S-7 (7 biến thể).
 *
 * Nguyên tắc S-7 bắt buộc:
 *   - Không bao giờ dùng index chưa loại ca kín (`data/gd0/index-e5-small.json`).
 *   - Từ điển tiền xử lý dựng từ `dungTuDien({ loaiCaKin: true })`.
 *   - Tờ khai Oz lọc qua `locOz = (o) => !laCaKin(o, dsLoai)`.
 *   - Chỉ mục nghĩa dựng sạch S-7 (bỏ mọi dòng `laCaKin(r, dsLoai)`).
 *
 * Dùng:
 *   node scripts/do-tien-xu-ly-de-rieng.mjs --option=a
 *   node scripts/do-tien-xu-ly-de-rieng.mjs --option=b
 *   node scripts/do-tien-xu-ly-de-rieng.mjs --option=b --json
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { laCaKin, taiDanhSachLoai } from './dung-bo-thu-de-rieng.mjs';
import { dungTuDien, boDau } from './dung-tu-dien-tien-xu-ly.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const timTruocMod = require('../lib/tim-truoc.js');
const embedPool = require('../lib/embed-pool.js');
const taxData = require('../data/tax.json');
const englishMap = require('../data/english-product-map.json');
const vnSynonyms = require('../data/vn-product-synonyms.json');

const SEED = 20261121;

function rngFor(key) {
  let a = 2166136261;
  for (const ch of `${SEED}|${key}`) {
    a ^= ch.codePointAt(0);
    a = Math.imul(a, 16777619);
  }
  a >>>= 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tạo lỗi gõ tất định (1–2 từ >= 4 ký tự, tránh số/model) trên câu không dấu hoặc có dấu. */
function taoGoSai(text, seedKey) {
  const rng = rngFor(`gosai|${seedKey}`);
  const tokens = String(text || '').split(/(\s+)/);
  const candIdx = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (/^\s+$/.test(t) || /\d/.test(t)) continue;
    const p = boDau(t).replace(/[^a-zA-Z]/g, '');
    if (p.length >= 4) candIdx.push(i);
  }
  if (!candIdx.length) return text;
  const maxEdits = candIdx.length >= 4 ? 2 : 1;
  const picked = new Set();
  for (let k = 0; k < maxEdits; k += 1) {
    picked.add(candIdx[Math.floor(rng() * candIdx.length)]);
  }
  for (const idx of picked) {
    const plain = boDau(tokens[idx]);
    const m = /^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/.exec(plain);
    if (!m) continue;
    const [, pre, w, post] = m;
    const r = rng();
    let mutated = w;
    if (w.length >= 5 && r < 0.35) {
      // Đổi chỗ 2 ký tự giữa từ
      const pos = 1 + Math.floor(rng() * (w.length - 2));
      mutated = w.slice(0, pos) + w[pos + 1] + w[pos] + w.slice(pos + 2);
    } else if (r < 0.7) {
      // Lặp 1 ký tự cuối hoặc giữa (rất hay gặp khi gõ nhanh)
      const pos = w.length - 1;
      mutated = w + w[pos];
    } else {
      // Bỏ 1 ký tự giữa
      const pos = 1 + Math.floor(rng() * (w.length - 2));
      mutated = w.slice(0, pos) + w.slice(pos + 1);
    }
    tokens[idx] = `${pre}${mutated}${post}`;
  }
  return tokens.join('');
}

const VIET_TAT_THU = [
  [/\bkích thước\b/giu, 'kt'],
  [/\bchất liệu\b/giu, 'cl'],
  [/\bcông suất\b/giu, 'cs'],
  [/\bnhà sản xuất\b/giu, 'nsx'],
  [/\bsản xuất\b/giu, 'sx'],
  [/\bđiều khiển\b/giu, 'đk'],
  [/\bđường kính\b/giu, 'đk'],
  [/\bđiện thoại\b/giu, 'đt'],
  [/\bsản phẩm\b/giu, 'sp'],
  [/\bphụ tùng\b/giu, 'pt'],
  [/\blinh kiện\b/giu, 'lk'],
  [/\bthiết bị điện\b/giu, 'tbđ'],
  [/\bthiết bị\b/giu, 'tb'],
  [/\bcông nghiệp\b/giu, 'cn'],
  [/\bgia đình\b/giu, 'gđ'],
  [/\bvăn phòng\b/giu, 'vp'],
  [/\bxe máy\b/giu, 'xm'],
  [/\bô tô\b/giu, 'ot'],
  [/\bđộng cơ\b/giu, 'đc'],
  [/\bđiện áp\b/giu, 'đ.áp'],
];

function taoVietTat(row) {
  const ap = (s) => {
    if (!s) return s;
    let out = String(s);
    for (const [re, rep] of VIET_TAT_THU) out = out.replace(re, rep);
    return out;
  };
  const ten = ap(row.tenHang);
  const cl = row.chatLieu ? `cl: ${ap(row.chatLieu)}` : null;
  const cd = row.congDung ? ap(row.congDung) : null;
  // Nếu chưa có chữ viết tắt nào trúng, chèn tiền tố `sp ` / `cl:` tất định để đo đúng biến thể viết tắt.
  const coThay = ten !== row.tenHang || (cd && cd !== row.congDung) || Boolean(cl);
  return {
    tenHang: coThay ? ten : `sp ${ten}`,
    chatLieu: cl,
    congDung: cd,
  };
}

function taoRutNgan(row) {
  const words = String(row.tenHang || '').trim().split(/\s+/).filter(Boolean);
  const cut = Math.max(2, Math.min(words.length, words.length > 4 ? 3 : words.length - 1));
  return {
    tenHang: words.slice(0, cut).join(' '),
    chatLieu: null,
    congDung: null,
  };
}

const DONG_NGHIA_DOI = [
  [/\bnhựa\b/giu, 'plastic'],
  [/\bthép không gỉ\b/giu, 'inox'],
  [/\binox\b/giu, 'thép không gỉ'],
  [/\bô tô\b/giu, 'xe hơi'],
  [/\bđiện thoại\b/giu, 'máy di động'],
  [/\bbằng\b/giu, 'làm từ'],
  [/\bdùng để\b/giu, 'phục vụ'],
  [/\bdùng cho\b/giu, 'cho'],
  [/\bthiết bị\b/giu, 'máy móc'],
  [/\btúi\b/giu, 'bịch'],
  [/\bghế\b/giu, 'ghế ngồi'],
  [/\bđèn\b/giu, 'bóng đèn'],
  [/\bcáp\b/giu, 'dây dẫn'],
  [/\bbộ sạc\b/giu, 'cục sạc'],
  [/\bvan\b/giu, 'van khóa'],
  [/\btai nghe\b/giu, 'headset'],
  [/\bbảo vệ\b/giu, 'chống trầy'],
  [/\bquạt\b/giu, 'quạt gió'],
];

const SYN_KEYS = Object.keys(vnSynonyms).filter((k) => k.split(/\s+/).length >= 2).sort((a, b) => b.length - a.length);

function taoTenKhac(row) {
  const swap = (s) => {
    if (!s) return s;
    let out = String(s);
    const low = out.toLowerCase();
    for (const k of SYN_KEYS) {
      if (low.includes(k)) {
        const rep = (vnSynonyms[k] || []).find((x) => !/^\d+$/.test(x) && x.toLowerCase() !== k);
        if (rep) {
          out = out.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu'), rep);
          break;
        }
      }
    }
    for (const [re, rep] of DONG_NGHIA_DOI) {
      if (re.test(out)) {
        out = out.replace(re, rep);
        break;
      }
    }
    return out;
  };
  return {
    tenHang: swap(row.tenHang),
    chatLieu: row.chatLieu ? swap(row.chatLieu) : null,
    congDung: row.congDung ? swap(row.congDung) : null,
  };
}

const ANH_HOA_PAIRS = [
  [/\bthép không gỉ\b/giu, 'stainless steel'],
  [/\bcao su lưu hóa\b/giu, 'vulcanized rubber'],
  [/\bcao su\b/giu, 'rubber'],
  [/\bnhựa\b/giu, 'plastic'],
  [/\bnhôm\b/giu, 'aluminum'],
  [/\bđồng\b/giu, 'copper'],
  [/\bthép\b/giu, 'steel'],
  [/\bthủy tinh\b/giu, 'glass'],
  [/\bvải không dệt\b/giu, 'non-woven fabric'],
  [/\bvải\b/giu, 'fabric'],
  [/\bcảm biến\b/giu, 'sensor'],
  [/\bbộ điều khiển\b/giu, 'controller'],
  [/\bmáy bơm\b/giu, 'pump'],
  [/\bxi lanh\b/giu, 'cylinder'],
  [/\bđộng cơ\b/giu, 'motor'],
  [/\bbộ sạc\b/giu, 'charger'],
  [/\bdây cáp\b/giu, 'cable'],
  [/\btai nghe\b/giu, 'headphone'],
  [/\bbàn phím\b/giu, 'keyboard'],
  [/\bchuột\b/giu, 'mouse'],
  [/\bquạt\b/giu, 'fan'],
  [/\bvan\b/giu, 'valve'],
  [/\bđèn led\b/giu, 'led lamp'],
  [/\bmàn hình\b/giu, 'screen'],
  [/\bđiện thoại\b/giu, 'smartphone'],
  [/\bkhí nén\b/giu, 'pneumatic'],
  [/\bpin\b/giu, 'battery'],
  [/\bgăng tay\b/giu, 'gloves'],
  [/\bghế\b/giu, 'chair'],
  [/\bbàn\b/giu, 'table'],
  [/\bgiường\b/giu, 'bed'],
  [/\btúi\b/giu, 'bag'],
];

// Xây bảng ngược từ english-product-map (từ Việt -> từ Anh) để tăng độ phủ trộn Anh.
const VI_TO_EN = [];
for (const [en, viArr] of Object.entries(englishMap)) {
  if (!/^[a-z][a-z\s-]{2,20}$/.test(en)) continue;
  for (const vi of viArr || []) {
    if (String(vi).length >= 3) VI_TO_EN.push([String(vi).toLowerCase(), en]);
  }
}
VI_TO_EN.sort((a, b) => b[0].length - a[0].length);

function taoTronAnh(row) {
  const mix = (s) => {
    if (!s) return s;
    let out = String(s);
    let hits = 0;
    for (const [re, rep] of ANH_HOA_PAIRS) {
      if (re.test(out)) {
        out = out.replace(re, rep);
        hits += 1;
        if (hits >= 2) break;
      }
    }
    if (!hits) {
      const low = out.toLowerCase();
      for (const [vi, en] of VI_TO_EN) {
        if (low.includes(vi)) {
          out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${vi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu'), en);
          break;
        }
      }
    }
    return out;
  };
  return {
    tenHang: mix(row.tenHang),
    chatLieu: row.chatLieu ? mix(row.chatLieu) : null,
    congDung: row.congDung ? mix(row.congDung) : null,
  };
}

export function tao7BienThe(row) {
  const sach = { tenHang: row.tenHang, chatLieu: row.chatLieu || null, congDung: row.congDung || null };
  const khongDau = {
    tenHang: boDau(row.tenHang),
    chatLieu: row.chatLieu ? boDau(row.chatLieu) : null,
    congDung: row.congDung ? boDau(row.congDung) : null,
  };
  const goSai = {
    tenHang: taoGoSai(row.tenHang, row.nguonDong || row.tenHang),
    chatLieu: row.chatLieu || null,
    congDung: row.congDung || null,
  };
  const vietTat = taoVietTat(row);
  const rutNgan = taoRutNgan(row);
  const tenKhac = taoTenKhac(row);
  const tronAnh = taoTronAnh(row);
  return { sach, khongDau, goSai, vietTat, rutNgan, tenKhac, tronAnh };
}

/** Dựng chỉ mục Option A (centroid vec4/vec6) SẠCH S-7 (bỏ mọi dòng laCaKin). */
async function dungChiMucOptionAS7(dsLoai) {
  const { taoExtractor, embed } = await import('./gd0/j1-harness.mjs');
  const gold = fs.readFileSync(path.join(ROOT, 'data/oz-gold-final.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const nz = (s) => String(s || '').replace(/\D/g, '');
  const moTa4 = {};
  const moTa6 = {};
  let boCaKin = 0;
  for (const g of gold) {
    if (laCaKin(g, dsLoai)) {
      boCaKin += 1;
      continue;
    }
    const hs = nz(g.hsCode);
    if (hs.length !== 8 || !taxData[hs]) continue;
    const desc = [g.tenHang, g.chatLieu, g.congDung].filter(Boolean).join(', ').trim();
    if (desc.length < 3) continue;
    (moTa4[hs.slice(0, 4)] ||= []).push(desc.slice(0, 300));
    (moTa6[hs.slice(0, 6)] ||= []).push(desc.slice(0, 300));
  }
  const tenChuan = (hs, cap) => {
    const lim = cap === 4 ? 5 : 3;
    const names = Object.keys(taxData).filter((k) => k.startsWith(hs)).slice(0, lim).map((k) => String(taxData[k].vn || '').replace(/^[-\s–]+/, ''));
    return [...new Set(names)].join(' | ').slice(0, 400);
  };
  const nhan4 = {};
  const nhan6 = {};
  for (const h4 of new Set([...Object.keys(moTa4), ...Object.keys(taxData).map((k) => k.slice(0, 4))])) {
    nhan4[h4] = [...(moTa4[h4] || []).slice(0, 20), tenChuan(h4, 4)].filter(Boolean).join(' ¶ ');
  }
  for (const h6 of new Set(Object.keys(taxData).map((k) => k.slice(0, 6)))) {
    nhan6[h6] = [...(moTa6[h6] || []).slice(0, 20), tenChuan(h6, 6)].filter(Boolean).join(' ¶ ');
  }
  const { ext, taiMs } = await taoExtractor();
  const embedBatch = async (entries) => {
    const out = {};
    const keys = Object.keys(entries).sort();
    for (let i = 0; i < keys.length; i += 32) {
      const slice = keys.slice(i, i + 32);
      const vecs = await embed(ext, slice.map((k) => entries[k]));
      slice.forEach((k, j) => { out[k] = vecs[j].map((x) => +x.toFixed(5)); });
      if ((i / 32) % 20 === 0) process.stderr.write(`[optA-s7] ${i}/${keys.length}\n`);
    }
    return out;
  };
  const vec4 = await embedBatch(nhan4);
  const vec6 = await embedBatch(nhan6);
  return { index: { meta: { loaiCaKin: true, boCaKin }, vec4, vec6 }, ext, taiMs };
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 10) / 10;
}

async function chayDo() {
  const args = process.argv.slice(2);
  const optVal = (n, d) => {
    const a = args.find((x) => x.startsWith(`--${n}=`));
    return a ? a.slice(n.length + 3) : d;
  };
  const option = optVal('option', 'a').toLowerCase();
  const asJson = args.includes('--json');

  const dsLoai = taiDanhSachLoai();
  const rows300 = fs.readFileSync(path.join(ROOT, 'scripts/ca-do/de-rieng-300.jsonl'), 'utf8')
    .trim().split('\n').map(JSON.parse);

  const tuDienS7 = dungTuDien({ loaiCaKin: true, danhSachLoai: dsLoai });
  const locOzS7 = (item) => !laCaKin(item, dsLoai);

  let semIndexS7 = null;
  let extWarmMs = 0;
  let ext = null;

  const { taoExtractor } = await import('./gd0/j1-harness.mjs');
  if (option === 'a') {
    const cachePath = '/tmp/hs-t4-option-a-s7.json';
    if (fs.existsSync(cachePath)) {
      const exObj = await taoExtractor();
      ext = exObj.ext;
      extWarmMs = exObj.taiMs;
      semIndexS7 = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (!asJson) console.error(`Option A S-7 loaded from cache ${cachePath}`);
    } else {
      const built = await dungChiMucOptionAS7(dsLoai);
      semIndexS7 = built.index;
      ext = built.ext;
      extWarmMs = built.taiMs;
      fs.writeFileSync(cachePath, JSON.stringify(semIndexS7));
      if (!asJson) console.error(`Option A S-7 built and cached to ${cachePath}`);
    }
  } else if (option === 'b') {
    const cacheBin = '/tmp/hs-t4-option-b-s7.bin';
    const cacheMeta = '/tmp/hs-t4-option-b-s7.meta.json';
    const exObj = await taoExtractor();
    ext = exObj.ext;
    extWarmMs = exObj.taiMs;
    if (fs.existsSync(cacheBin) && fs.existsSync(cacheMeta)) {
      const meta = JSON.parse(fs.readFileSync(cacheMeta, 'utf8'));
      const rawBuf = fs.readFileSync(cacheBin);
      semIndexS7 = {
        kieu: 'int8',
        dim: meta.dim,
        count: meta.items.length,
        scale: meta.scale,
        items: meta.items,
        vectors: new Int8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength),
      };
      if (!asJson) console.error(`Option B S-7 loaded from cache (${meta.items.length} items)`);
    } else {
      const { dungChiMucNghia } = await import('./dung-chi-muc-nghia.mjs');
      const tLoad = Date.now();
      const built = await dungChiMucNghia({ loaiCaKin: true, danhSachLoai: dsLoai, extractor: ext, progress: !asJson });
      fs.writeFileSync(cacheBin, built.bin);
      fs.writeFileSync(cacheMeta, built.metaBuf);
      semIndexS7 = {
        kieu: 'int8',
        dim: built.meta.dim,
        count: built.meta.items.length,
        scale: built.meta.scale,
        items: built.meta.items,
        vectors: new Int8Array(built.bin.buffer, built.bin.byteOffset, built.bin.byteLength),
      };
      if (!asJson) console.error(`Option B S-7 index built in ${Date.now() - tLoad}ms: ${built.meta.items.length} items`);
    }
  }

  // Làm ấm model embed với 1 câu để không tính cold-start vào median runtime.
  if (ext) {
    await embedPool.embedCau('làm ấm mô hình', { extractor: ext });
  }
  const embedFnS7 = ext && semIndexS7
    ? async (q) => {
      const vec = await embedPool.embedCau(q, { extractor: ext });
      return vec ? embedPool.timTheoNghiaTrucTiep(vec, semIndexS7, { k: 30 }) : null;
    }
    : async () => null;

  const bienTheKeys = ['sach', 'khongDau', 'goSai', 'vietTat', 'rutNgan', 'tenKhac', 'tronAnh'];
  const ketQua = {};

  for (const bt of bienTheKeys) {
    if (!asJson) process.stderr.write(`[do-s7] running variant: ${bt}\n`);
    const inputs = rows300.map((r) => ({ row: r, payload: tao7BienThe(r)[bt] }));

    // 1) Đo OFF (HS_TIEN_XU_LY tắt)
    delete process.env.HS_TIEN_XU_LY;
    const offStats = { t1: 0, t5: 0, pn6: 0, times: [] };
    for (const { row, payload } of inputs) {
      const truth4 = row.maDung.slice(0, 4);
      const truth6 = row.maDung.slice(0, 6);
      const t0 = performance.now();
      const kq = await timTruocMod.timTruoc(payload, { locOz: locOzS7 });
      offStats.times.push(performance.now() - t0);
      const nhom = kq.tomTat?.nhom || [];
      if (nhom[0] === truth4) offStats.t1 += 1;
      if (nhom.slice(0, 5).includes(truth4)) offStats.t5 += 1;
      if ((kq.tomTat?.pn6?.[truth4] || []).slice(0, 3).includes(truth6)) offStats.pn6 += 1;
    }

    // 2) Đo ON (HS_TIEN_XU_LY=on)
    process.env.HS_TIEN_XU_LY = 'on';
    const onStats = { t1: 0, t5: 0, pn6: 0, times: [] };
    for (const { row, payload } of inputs) {
      const truth4 = row.maDung.slice(0, 4);
      const truth6 = row.maDung.slice(0, 6);
      const t0 = performance.now();
      const kq = await timTruocMod.timTruoc(payload, { locOz: locOzS7, tuDien: tuDienS7, embedFn: embedFnS7 });
      onStats.times.push(performance.now() - t0);
      const nhom = kq.tomTat?.nhom || [];
      if (nhom[0] === truth4) onStats.t1 += 1;
      if (nhom.slice(0, 5).includes(truth4)) onStats.t5 += 1;
      if ((kq.tomTat?.pn6?.[truth4] || []).slice(0, 3).includes(truth6)) onStats.pn6 += 1;
    }
    delete process.env.HS_TIEN_XU_LY;

    const pct = (n) => Math.round((n * 1000) / rows300.length) / 10;
    const medOff = Math.round(median(offStats.times) * 10) / 10;
    const medOn = Math.round(median(onStats.times) * 10) / 10;
    ketQua[bt] = {
      off: { top1: pct(offStats.t1), top5: pct(offStats.t5), pn6_3: pct(offStats.pn6), medianMs: medOff },
      on: { top1: pct(onStats.t1), top5: pct(onStats.t5), pn6_3: pct(onStats.pn6), medianMs: medOn },
      delta: {
        top1_pp: Math.round((pct(onStats.t1) - pct(offStats.t1)) * 10) / 10,
        top5_pp: Math.round((pct(onStats.t5) - pct(offStats.t5)) * 10) / 10,
        pn6_3_pp: Math.round((pct(onStats.pn6) - pct(offStats.pn6)) * 10) / 10,
        medianMs: Math.round((medOn - medOff) * 10) / 10,
      },
    };
  }

  const gates = {
    khongDau_top1_ge_5pp: ketQua.khongDau.delta.top1_pp >= 5.0,
    goSai_top1_ge_5pp: ketQua.goSai.delta.top1_pp >= 5.0,
    sach_top1_ge_off: ketQua.sach.delta.top1_pp >= 0,
    sach_median_delta_le_100ms: ketQua.sach.delta.medianMs <= 100,
  };
  const allGatesPass = Object.values(gates).every(Boolean);

  if (asJson) {
    console.log(JSON.stringify({ option, n: rows300.length, modelLoadMs: extWarmMs, gates, allGatesPass, ketQua }, null, 2));
  } else {
    console.log(`\n=== ĐO S-7 (${rows300.length} ca) — Option ${option.toUpperCase()} (nạp mô hình cold-start: ${extWarmMs} ms) ===`);
    console.log('Biến thể  | OFF t1 / t5 / pn6@3 (ms)      | ON  t1 / t5 / pn6@3 (ms)      | Delta t1 / t5 / pn6 / ms');
    console.log('----------|-------------------------------|-------------------------------|--------------------------');
    for (const bt of bienTheKeys) {
      const r = ketQua[bt];
      const f = (o) => `${o.top1.toFixed(1)}% / ${o.top5.toFixed(1)}% / ${o.pn6_3.toFixed(1)}% (${o.medianMs})`;
      const d = r.delta;
      const fmtD = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
      console.log(`${bt.padEnd(9)} | ${f(r.off).padEnd(29)} | ${f(r.on).padEnd(29)} | ${fmtD(d.top1_pp)}pp / ${fmtD(d.top5_pp)}pp / ${fmtD(d.pn6_3_pp)}pp / ${d.medianMs >= 0 ? '+' : ''}${d.medianMs}ms`);
    }
    console.log('\nCổng #1596:', JSON.stringify(gates), '=>', allGatesPass ? 'ĐẠT HẾT' : 'CHƯA ĐẠT');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  chayDo();
}
