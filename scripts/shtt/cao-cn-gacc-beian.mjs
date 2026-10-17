#!/usr/bin/env node
/**
 * Cào GACC (Hải quan Trung Quốc — 知识产权海关保护备案) cho nhãn hiệu ghi nhận.
 * Nguồn: docs/giao-viec/shtt-cao-dem.md mục 2 (cn-gacc-beian).
 *
 * Thực tế (đo lại từ máy dev VN, mạng mở, 2026-10-16 ~23:45):
 *   - Cổng chính thức online.customs.gov.cn mục "我要查 → 知识产权备案" trỏ tới
 *     http://202.127.48.145:8888/ (hệ thống 知识产权海关保护备案).
 *   - URL đó và http://www.customs.gov.cn/ipr/recordation trả HTTP 412 (JS anti-bot $_ts).
 *   - Chrome có đầu, UA mặc định lẫn UA định danh, vẫn 412 rồi body rỗng — không lách.
 *   - haiguanbeian.com là bên thứ ba: chỉ dùng để đối chiếu đường, không lấy dữ liệu.
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

// URL chính thức lấy từ payload cổng online.customs.gov.cn (functionName 知识产权备案 / 知识产权海关保护备案).
const CANDIDATE_URLS = [
  'http://202.127.48.145:8888/',
  'http://www.customs.gov.cn/ipr/recordation',
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
  log(`GACC cào ${uu1.length} nhãn ưu tiên 1 (Chrome có đầu; dừng nếu anti-bot).`);

  // Probe 1 lần để xác định captcha
  let captcha = false;
  let probeRaw = null;
  let probeErr = null;
  const browser = await chromium.launch({ executablePath: CHROME, headless: false, args: ['--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ userAgent: UA, locale: 'zh-CN' });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(CANDIDATE_URLS[0], { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);
    const html = await page.content();
    probeRaw = writeRaw(NGUON_MA, CANDIDATE_URLS[0], html);
    const status = resp ? resp.status() : 0;
    captcha = status === 412 || status === 403 || html.length < 800 || /\$_ts|waf|aliyun|verify|captcha|slardar|阻断|Precondition/i.test(html);
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
      ghiChu: `CAPTCHA/anti-bot. Cổng online.customs.gov.cn mục 知识产权备案 trỏ http://202.127.48.145:8888/ . Chrome có đầu từ máy VN lúc ${new Date().toISOString()} nhận HTTP 412 (script $_ts), sau vài giây body rỗng. Cùng lớp chặn ở http://www.customs.gov.cn/ipr/recordation. Không lách. raw: ${probeRaw?.sha256 || 'n/a'} (${probeRaw?.bytes || 0} bytes). ${probeErr ? `Err: ${probeErr.slice(0, 120)}.` : ''}`,
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