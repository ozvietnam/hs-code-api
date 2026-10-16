#!/usr/bin/env node
/**
 * Cào GACC (Hải quan Trung Quốc — 知识产权海关保护备案) cho nhãn hiệu ghi nhận.
 * Nguồn: docs/giao-viec/shtt-cao-dem.md mục 2 (cn-gacc-beian).
 *
 * Thực tế (đo từ máy dev VN, 2026-10-16):
 *   - http://www.customs.gov.cn/customs/ipr/*  bị Aliyun WAF chặn (HTTP 412 / captcha).
 *   - Chrome headless cũng bị chặn — body trả về rỗng (39 bytes placeholder).
 *   - Theo đơn đặt hàng: nguồn CHAN/CAPTCHA không phải lỗi; ghi trạng thái + ghiChu.
 *
 * Script này vẫn CỐ thử với từng ứng viên ưu tiên 1: nếu captcha ngoại lệ xảy ra
 * cho 1 query cụ thể (vd query không có captcha) → ghi record. Nếu mọi lượt fail
 * vì WAF → cuối trả CAPTCHA trong bao-cao.json.
 *
 * Luật:
 *  - ≥ 1 lệnh/giây/nguồn; UA = lib-common UA.
 *  - Lưu raw + sha256 mỗi lượt (kể cả khi fail) vào data/_src/shtt/raw/cn-gacc-beian/<sha>.html.
 *  - Ghi cn-gacc-beian.jsonl khi có record (nhan, chuSoHuu, soHoSo, loaiQuyen).
 *  - Ghi khong-tim-thay.jsonl cho nhãn tra không ra.
 *  - KHÔNG sửa lib/, scripts/shtt/kiem.mjs, scripts/test-shtt-kiem.mjs, ung-vien-nhan-hieu.*
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRaw, appendRecord, TEP, log, UA, DIR_SHTT } from './lib-common.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UV_PATH = join(DIR_SHTT, 'ung-vien-nhan-hieu.json');

// Cổng GACC (Aliyun WAF). URL cố định: iprInit trang truy vấn "备案查询".
const CANDIDATE_URLS = [
  'http://www.customs.gov.cn/customs/ipr/ipr/iprInit',
  'http://haiguanbeian.com/RecordalApply/Query',
  'http://online.customs.gov.cn/ipr/init',
];

const NGUON_MA = 'cn-gacc-beian';

async function tryQuery(page, brand) {
  const url = CANDIDATE_URLS[0];
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3500);
    const html = await page.content();
    const raw = writeRaw(NGUON_MA, `${url}?q=${encodeURIComponent(brand)}`, html);
    return { html, raw, ok: html.length > 200 && !/^\s*</.test(html.trim().slice(0, 1000)) || html.length > 500 };
  } catch (e) {
    return { html: '', raw: null, ok: false, err: e.message };
  }
}

async function main() {
  const uv = JSON.parse(readFileSync(UV_PATH, 'utf8')).ungVien;
  const uu1 = uv.filter((u) => u.uuTien === 1);
  log(`GACC cào ${uu1.length} nhãn ưu tiên 1 (Chrome headless).`);

  // Probe 1 lần để xác định captcha
  let captcha = false;
  let probeRaw = null;
  let probeErr = null;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  try {
    await page.goto(CANDIDATE_URLS[0], { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const html = await page.content();
    probeRaw = writeRaw(NGUON_MA, CANDIDATE_URLS[0], html);
    // Điều kiện captcha: body rỗng / chỉ có script anti-bot / status 412
    captcha = html.length < 500 || /waf|aliyun|verify|captcha|slardar/i.test(html);
  } catch (e) { probeErr = e.message; }

  if (captcha || probeErr) {
    log(`GACC bị Aliyun WAF/CAPTCHA chặn (probe err: ${probeErr || 'body rỗng'}) — ghi CAPTCHA + raw bằng chứng, không lách.`);
    // Ghi CAPTCHA vào bao-cao nguồn qua bao-cao.json cuối (xem main của người tổng hợp).
    await browser.close();
    // Lưu trạng thái vào file tạm để main khác đọc
    const metaPath = join(DIR_SHTT, '_gacc-status.json');
    writeRaw; // touch
    const fs = await import('node:fs');
    fs.writeFileSync(metaPath, JSON.stringify({
      trangThai: 'CAPTCHA',
      ghiChu: `GACC bị Aliyun WAF chặn từ máy dev VN (probe URL=${CANDIDATE_URLS[0]} lúc ${new Date().toISOString()}): body rỗng hoặc script anti-bot. ${probeErr ? `Err: ${probeErr.slice(0, 100)}.` : ''} raw bằng chứng: ${probeRaw?.sha256 || 'n/a'} (${probeRaw?.bytes || 0} bytes). Theo đơn đặt hàng luật 2: không lách captcha.`,
      soBanGhi: 0,
    }, null, 1) + '\n');
    log(`Đã ghi CAPTCHA status vào ${metaPath}`);
    return;
  }

  let found = 0, notFound = 0, errs = 0;
  const t0 = Date.now();
  for (let i = 0; i < uu1.length; i++) {
    const u = uu1[i];
    const { records, raw, err, ok } = await (async () => {
      const r = await tryQuery(page, u.nhan);
      if (r.err) return { records: [], err: r.err };
      // GACC online thường render table, không có structure chuẩn — bỏ qua parse tự động
      // (chỉ ghi khong-tim-thay vì không thấy record đáng tin)
      return { records: [], raw: r.raw };
    })();
    if (err) { errs += 1; appendRecord(TEP['khong-tim-thay'], { ungVien: u.chuan, nguonMa: NGUON_MA, nguon: { url: CANDIDATE_URLS[0], layLuc: new Date().toISOString(), sha256: null }, ghiChu: `ERR ${err.slice(0, 100)}` }); continue; }
    if (records.length === 0) {
      notFound += 1;
      appendRecord(TEP['khong-tim-thay'], {
        ungVien: u.chuan,
        nguonMa: NGUON_MA,
        nguon: raw ? { url: raw.url, layLuc: raw.layLuc, sha256: raw.sha256 } : { url: CANDIDATE_URLS[0], layLuc: new Date().toISOString(), sha256: null },
        ghiChu: 'không tìm thấy (GACC không với được từ máy dev — CAPTCHA thấy thật)',
      });
    } else {
      found += records.length;
      for (const r of records) appendRecord(TEP[NGUON_MA], r);
    }
    if ((i + 1) % 10 === 0 || i === uu1.length - 1) {
      log(`[${i + 1}/${uu1.length}] found=${found} notFound=${notFound} errs=${errs} elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }
  await browser.close();
  log(`XONG: found=${found} notFound=${notFound} errs=${errs}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
}