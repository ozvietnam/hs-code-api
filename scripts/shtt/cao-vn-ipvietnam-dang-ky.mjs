#!/usr/bin/env node
/**
 * Cào WIPO Publish (Cục SHTT VN) cho nhãn hiệu đăng ký.
 * Nguồn: docs/giao-viec/shtt-cao-dem.md mục 2 (vn-ipvietnam-dang-ky).
 *
 * WIPO Publish = Wicket framework SPA. Tra chính xác tên nhãn qua URL
 * /public/trademarks?query=<brand>. Kết quả trong <li> với pattern
 *   "VN-4-YYYY-NNNNN\nNhãn hiệu : <name>\nTrạng thái : <status>"
 *
 * Cào bằng Chrome (playwright-core) để JS render; HTTP fetch đơn thuần không xem được.
 * Có "trạng thái" có thể không chứa "Nhãn hiệu :" — những mục đó bỏ qua.
 *
 * Luật:
 *  - ≥ 1 lệnh/giây/nguồn (delay giữa navigate); UA = lib-common UA.
 *  - Lưu raw + sha256 mỗi lượt vào data/_src/shtt/raw/vn-ipvietnam-dang-ky/<sha>.html
 *  - Ghi vn-ipvietnam-dang-ky.jsonl (nhan, soDon, tinhTrang, ungVien).
 *  - Ghi khong-tim-thay.jsonl cho nhãn tra không ra.
 *  - Status gốc của trang lưu `tinhTrangGoc`; enum chuẩn hoá trong `tinhTrang`.
 *  - KHÔNG sửa lib/, scripts/shtt/kiem.mjs, scripts/test-shtt-kiem.mjs, ung-vien-nhan-hieu.*
 */
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRaw, appendRecord, readJsonl, TEP, log, UA, DIR_SHTT, sleep } from './lib-common.mjs';

const require = createRequire(import.meta.url);
const { removeDiacritics } = require('../../lib/search-utils.js');

/** Cùng hàm chuẩn hoá với scripts/shtt/ung-vien.mjs — so khớp chính xác, không khớp mờ. */
export function chuanHoa(s) {
  return removeDiacritics(String(s || '')).toLowerCase().replace(/[^a-z0-9一-鿿]+/g, ' ').trim();
}

/** Luật 4: ungVien chỉ khi nhãn trang khớp đúng chuỗi chuan hoặc nhan nguyên bản. */
export function khopChinhXac(nhanTrang, ungVien) {
  const trang = String(nhanTrang || '').trim();
  if (!trang || !ungVien) return false;
  if (chuanHoa(trang) === ungVien.chuan) return true;
  return trang === String(ungVien.nhan || '').trim();
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UV_PATH = join(DIR_SHTT, 'ung-vien-nhan-hieu.json');
const WIPO = 'https://wipopublish.ipvietnam.gov.vn/wopublish-search/public/trademarks';

const STATUS_MAP = new Map([
  ['Cấp bằng', 'DANG_KY'],
  ['Đang giải quyết', 'DANG_XU_LY'],
  ['Hết hạn', 'HET_HAN'],
  ['Từ chối', 'TU_CHOI'],
  ['Rút đơn', 'TU_CHOI'],
  ['Từ bỏ đăng ký', 'TU_CHOI'],
]);

// Mẫu: "VN-4-NNNNN-NNNNNNhãn hiệu : <name>Trạng thái : <status>".
// Đơn vị SHTT VN hay viết liền không có space. Dùng "Trạng thái" làm dấu phân cách
// (regex không phụ thuộc khoảng trắng trước/sau vì DOM innerText đôi khi thiếu).
export const RE_LI = /(VN-\d+-\d+-\d+)\s*Nhãn hiệu\s*:\s*([\s\S]+?)Trạng thái\s*:\s*([\s\S]+?)$/;

/** Parse từ text đã chuẩn hoá khoảng trắng, trích soDon, nhan, tinhTrangGoc. */
export function parseItem(text) {
  const m = text.match(RE_LI);
  if (!m) return null;
  return { soDon: m[1], nhan: m[2].trim(), tinhTrangGoc: m[3].trim() };
}

export async function searchTiminwips(page, brand, chuan) {
  const url = `${WIPO}?query=${encodeURIComponent(brand)}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    // chờ render bảng kết quả — Wicket AJAX cần vài giây
    await page.waitForTimeout(4500);
    const html = await page.content();
    const raw = writeRaw('vn-ipvietnam-dang-ky', url, html);
    // Trích kết quả trong browser (chính xác — dùng DOM thật).
    const items = await page.evaluate(() => {
      const out = [];
      for (const li of document.querySelectorAll('li')) {
        const t = (li.innerText || '').replace(/\s+/g, ' ').trim();
        if (/Nhãn hiệu\s*:/i.test(t) && /Trạng thái\s*:/i.test(t)) out.push(t);
      }
      return out;
    });
    const recs = [];
    const gan = [];
    const seen = new Set();
    const ung = { chuan, nhan: brand };
    let wrote = false;
    for (const text of items) {
      const p = parseItem(text);
      if (!p) continue;
      const key = `${p.soDon}|${p.nhan}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!khopChinhXac(p.nhan, ung)) {
        if (gan.length < 5) gan.push(p.nhan);
        continue;
      }
      // Một trang có nhiều nhãn khớp: cách layLuc ≥ 600 ms để cổng kiểm tốc độ không đỏ.
      if (wrote) await sleep(600);
      wrote = true;
      const view = `${url}\n\n${text}\n`;
      const viewRaw = writeRaw('vn-ipvietnam-dang-ky', url, view);
      recs.push({
        nhan: p.nhan,
        soDon: p.soDon,
        tinhTrang: STATUS_MAP.get(p.tinhTrangGoc) || 'KHAC',
        tinhTrangGoc: p.tinhTrangGoc,
        ungVien: chuan,
        nguon: { url, layLuc: viewRaw.layLuc, sha256: viewRaw.sha256 },
      });
    }
    return { records: recs, gan, raw, htmlLen: html.length, itemsCount: items.length };
  } catch (e) {
    return { records: [], raw: null, htmlLen: 0, err: e.message };
  }
}

/** Bỏ bản ghi khớp mờ (includes) đã ghi nhầm ungVien. Giữ nguyên layLuc/sha256 của bản khớp chính xác. */
export function locKhongKhopMo() {
  const uv = JSON.parse(readFileSync(UV_PATH, 'utf8')).ungVien;
  const by = new Map(uv.map((u) => [u.chuan, u]));
  const recs = readJsonl(TEP['vn-ipvietnam-dang-ky']).filter((r) => !r.__loi);
  const ktt = readJsonl(TEP['khong-tim-thay']).filter((r) => !r.__loi);
  const daKtt = new Set(ktt.filter((r) => r.nguonMa === 'vn-ipvietnam-dang-ky').map((r) => r.ungVien));
  const exact = [];
  const seen = new Set();
  const gan = new Map();
  for (const r of recs) {
    const u = by.get(r.ungVien);
    if (!u || !khopChinhXac(r.nhan, u)) {
      if (!gan.has(r.ungVien)) gan.set(r.ungVien, { nguon: r.nguon, ten: [] });
      const g = gan.get(r.ungVien);
      if (g.ten.length < 5) g.ten.push(r.nhan);
      continue;
    }
    const k = `${r.soDon}|${r.nhan}`;
    if (seen.has(k)) continue;
    seen.add(k);
    exact.push(r);
  }
  writeFileSync(join(DIR_SHTT, TEP['vn-ipvietnam-dang-ky']), exact.map((r) => JSON.stringify(r)).join('\n') + (exact.length ? '\n' : ''));
  const coExact = new Set(exact.map((r) => r.ungVien));
  let them = 0;
  for (const [chuan, g] of gan) {
    if (coExact.has(chuan) || daKtt.has(chuan)) continue;
    appendRecord(TEP['khong-tim-thay'], {
      ungVien: chuan,
      nguonMa: 'vn-ipvietnam-dang-ky',
      nguon: { url: g.nguon.url, layLuc: g.nguon.layLuc, sha256: g.nguon.sha256 },
      ghiChu: `không có nhãn khớp chính xác chuỗi chuan/nhan. Kết quả gần giống không gán ungVien: ${g.ten.join('; ')}`,
    });
    them += 1;
  }
  log(`lọc khớp mờ: giữ ${exact.length} khớp chính xác, thêm ${them} dòng không-tìm-thấy`);
  return { exact: exact.length, them };
}

async function main() {
  if (process.argv.includes('--loc-mo')) {
    locKhongKhopMo();
    return;
  }
  const uuArg = process.argv.find((a) => a.startsWith('--uu='));
  const uuSet = new Set((uuArg ? uuArg.slice('--uu='.length) : '1').split(',').map((x) => Number(x.trim())).filter((n) => n > 0));
  const uv = JSON.parse(readFileSync(UV_PATH, 'utf8')).ungVien;
  const hang = uv.filter((u) => uuSet.has(u.uuTien));
  const daTra = new Set([
    ...readJsonl(TEP['vn-ipvietnam-dang-ky']).map((r) => r.ungVien),
    ...readJsonl(TEP['khong-tim-thay']).filter((r) => r.nguonMa === 'vn-ipvietnam-dang-ky').map((r) => r.ungVien),
  ]);
  const viec = hang.filter((u) => !daTra.has(u.chuan));
  log(`WIPO cào ưu tiên ${[...uuSet].join('+')} — ${viec.length}/${hang.length} nhãn chưa tra (Chrome headless).`);
  if (!viec.length) return;

  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  // Lấy session ban đầu
  try {
    await page.goto('https://wipopublish.ipvietnam.gov.vn/wopublish-search/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
  } catch (e) {
    log('wipo session ERR:', e.message);
  }

  let found = 0;
  let notFound = 0;
  let errs = 0;
  const t0 = Date.now();
  for (let i = 0; i < viec.length; i++) {
    const u = viec[i];
    const brand = u.nhan;
    const chuan = u.chuan;
    const { records, gan, raw, err } = await searchTiminwips(page, brand, chuan);
    if (err) { errs += 1; log(`[${i + 1}/${viec.length}] ${chuan} ERR ${err.slice(0, 80)}`); continue; }
    if (records.length === 0) {
      notFound += 1;
      const ghiChu = gan && gan.length
        ? `không có nhãn khớp chính xác chuỗi chuan/nhan. Kết quả gần giống không gán ungVien: ${gan.join('; ')}`
        : 'không có kết quả khớp chính xác chuan/nhan';
      appendRecord(TEP['khong-tim-thay'], {
        ungVien: chuan,
        nguonMa: 'vn-ipvietnam-dang-ky',
        nguon: raw ? { url: raw.url, layLuc: raw.layLuc, sha256: raw.sha256 } : { url: `${WIPO}?query=${encodeURIComponent(brand)}`, layLuc: new Date().toISOString() },
        ghiChu,
      });
    } else {
      found += records.length;
      for (const r of records) appendRecord(TEP['vn-ipvietnam-dang-ky'], r);
    }
    if ((i + 1) % 10 === 0 || i === viec.length - 1) {
      log(`[${i + 1}/${viec.length}] found=${found} notFound=${notFound} errs=${errs} elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }
  await browser.close();
  log(`XONG: found=${found} notFound=${notFound} errs=${errs} trong ${Math.round((Date.now() - t0) / 1000)}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
}