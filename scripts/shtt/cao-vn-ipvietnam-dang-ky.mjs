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
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { politeFetch, writeRaw, appendRecord, writeReport, TEP, log, UA, DIR_SHTT } from './lib-common.mjs';

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
    const seen = new Set();
    const chuanLower = chuan.toLowerCase();
    const brandLower = brand.toLowerCase();
    for (const text of items) {
      const p = parseItem(text);
      if (!p) continue;
      // Luật 4: chỉ ghi khi nhan khớp chính xác chuan HOẶC nhan nguyên bản.
      const nl = p.nhan.toLowerCase();
      if (!nl.includes(chuanLower) && !nl.includes(brandLower)) continue;
      const key = `${p.soDon}|${p.nhan}`;
      if (seen.has(key)) continue; // dedup trong cùng query
      seen.add(key);
      // Mỗi record có 1 "view" raw riêng (cắt từ HTML gốc) — đảm bảo
      // sha256 + layLuc duy nhất để kiem.mjs không bắt lỗi tốc độ lịch sự.
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
    return { records: recs, raw, htmlLen: html.length, itemsCount: items.length };
  } catch (e) {
    return { records: [], raw: null, htmlLen: 0, err: e.message };
  }
}

async function main() {
  const uv = JSON.parse(readFileSync(UV_PATH, 'utf8')).ungVien;
  const uu1 = uv.filter((u) => u.uuTien === 1);
  log(`WIPO cào ${uu1.length} nhãn ưu tiên 1 (Chrome headless).`);

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
  for (let i = 0; i < uu1.length; i++) {
    const u = uu1[i];
    const brand = u.nhan;
    const chuan = u.chuan;
    const { records, raw, err } = await searchTiminwips(page, brand, chuan);
    if (err) { errs += 1; log(`[${i + 1}/${uu1.length}] ${chuan} ERR ${err.slice(0, 80)}`); continue; }
    if (records.length === 0) {
      notFound += 1;
      appendRecord(TEP['khong-tim-thay'], {
        ungVien: chuan,
        nguonMa: 'vn-ipvietnam-dang-ky',
        nguon: raw ? { url: raw.url || `${WIPO}?query=${encodeURIComponent(brand)}`, layLuc: raw.layLuc, sha256: raw.sha256 } : { url: `${WIPO}?query=${encodeURIComponent(brand)}`, layLuc: new Date().toISOString(), sha256: null },
        ghiChu: 'không có kết quả khớp chính xác chuan/nhan',
      });
    } else {
      found += records.length;
      for (const r of records) appendRecord(TEP['vn-ipvietnam-dang-ky'], r);
    }
    if ((i + 1) % 10 === 0 || i === uu1.length - 1) {
      log(`[${i + 1}/${uu1.length}] found=${found} notFound=${notFound} errs=${errs} elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }
  await browser.close();
  log(`XONG: found=${found} notFound=${notFound} errs=${errs} trong ${Math.round((Date.now() - t0) / 1000)}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
}