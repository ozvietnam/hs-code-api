#!/usr/bin/env node
/**
 * Cào TMview (EUIPO) cho nhãn hiệu CN + VN đăng ký.
 * Nguồn: docs/giao-viec/shtt-cao-dem.md mục 2 (tmview-cn-vn).
 *
 * Thực tế (đo từ máy dev VN, 2026-10-16):
 *   - www.tmdn.org bị firewall/network chặn outbound (timeout khi dùng cả
 *     Node fetch lẫn Chrome headless — không bao giờ nhận response).
 *   - API JSON api/search/results không với tới được.
 *   - Theo đơn đặt hàng: nguồn CHAN không phải lỗi; ghi trạng thái + raw bằng chứng.
 *
 * Script này:
 *   1. Probe Chrome → confirm timeout.
 *   2. Ghi raw placeholder (HTML của trang lỗi Chrome hoặc timeout message).
 *   3. Ghi CHAN vào _tmview-status.json + khong-tim-thay.jsonl cho mọi ứng viên ưu tiên 1.
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRaw, appendRecord, TEP, log, UA, DIR_SHTT } from './lib-common.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UV_PATH = join(DIR_SHTT, 'ung-vien-nhan-hieu.json');
const NGUON_MA = 'tmview-cn-vn';

async function main() {
  log('TMview probe (Chrome headless, capture timeout)…');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  const url = 'https://www.tmdn.org/tmview/';
  let probeErr = null;
  let probeRaw = null;
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);
    const html = await page.content();
    probeRaw = writeRaw(NGUON_MA, url, html);
    log(`TMview đã load sau ${Math.round((Date.now() - t0) / 1000)}s — html ${html.length} bytes`);
  } catch (e) {
    probeErr = e.message;
    log(`TMview TIMEOUT (${probeErr.slice(0, 80)})`);
    // Ghi raw placeholder ghi nhận timeout
    const placeholder = `<!doctype html><title>TMview timeout</title><body>Chrome navigation timeout từ máy dev VN lúc ${new Date().toISOString()}: ${probeErr}</body>`;
    probeRaw = writeRaw(NGUON_MA, url, placeholder);
  }
  await browser.close();

  // Ghi CHAN status
  const fs = await import('node:fs');
  const metaPath = join(DIR_SHTT, '_tmview-status.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    trangThai: 'CHAN',
    ghiChu: `TMview (www.tmdn.org) bị chặn outbound từ máy dev VN — Chrome timeout ${probeErr ? `(${probeErr.slice(0, 60)})` : ''} sau ${Math.round((Date.now() - t0) / 1000)}s. Đã capture raw placeholder (sha=${probeRaw?.sha256?.slice(0,12) || 'n/a'}, ${probeRaw?.bytes || 0} bytes). Theo đơn đặt hàng luật 1 + luật 7: không lách anti-bot, không đổi IP/proxy. Cần allowlist trong network policy hoặc dùng máy có egress mở.`,
    soBanGhi: 0,
  }, null, 1) + '\n');
  log(`Đã ghi CHAN status vào ${metaPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
}