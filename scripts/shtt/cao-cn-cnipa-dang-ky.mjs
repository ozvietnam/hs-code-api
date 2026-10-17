#!/usr/bin/env node
/**
 * CNIPA (sbj.cnipa.gov.cn) — chỉ chạy khi TMview không với tới.
 * Trang vào https://sbj.cnipa.gov.cn/sbj/sbcx/ chuyển tới https://wcjs.sbj.cnipa.gov.cn/.
 * Gặp captcha hoặc trang chặn anti-bot thì ghi CAPTCHA/CHAN và DỪNG. Không lách.
 */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeRaw, log, UA, DIR_SHTT } from './lib-common.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'https://wcjs.sbj.cnipa.gov.cn/';
const NGUON = 'cn-cnipa-dang-ky';

function xoaIp(html) {
  return String(html || '').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP-da-xoa]');
}

async function main() {
  log('CNIPA probe (Chrome có đầu). Dừng nếu captcha/chặn.');
  const browser = await chromium.launch({ executablePath: CHROME, headless: false, args: ['--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ userAgent: UA, locale: 'zh-CN' });
  const page = await ctx.newPage();
  let trangThai = 'LOI';
  let ghiChu = '';
  try {
    const resp = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(4000);
    const status = resp ? resp.status() : 0;
    const html = xoaIp(await page.content());
    const text = xoaIp(await page.evaluate(() => (document.body && document.body.innerText) || ''));
    const raw = writeRaw(NGUON, URL, html);
    const chan = status === 403 || status === 412 || status >= 500 || /阻断|captcha|验证码|forbidden/i.test(text + html);
    if (chan) {
      trangThai = /captcha|验证码/i.test(text + html) ? 'CAPTCHA' : 'CHAN';
      ghiChu = `HTTP ${status} từ máy VN lúc ${raw.layLuc} tại ${URL} (cổng tra cứu mà sbj.cnipa.gov.cn/sbj/sbcx/ mở ra). Trang chặn anti-bot, không có captcha hình để giải — không lách. Đã xoá địa chỉ IP khỏi bản thô. raw ${raw.sha256} (${raw.bytes} bytes). TMview (www.tmdn.org) timeout nên mới thử nguồn này.`;
    } else {
      trangThai = 'BO_QUA';
      ghiChu = `Trang mở (HTTP ${status}) nhưng đợt này chưa tra từng ứng viên — ghi lại để không bịa. raw ${raw.sha256}.`;
    }
    log(trangThai, text.slice(0, 180).replace(/\s+/g, ' '));
  } catch (e) {
    trangThai = 'LOI';
    ghiChu = `Lỗi mở ${URL}: ${e.message.slice(0, 180)}`;
    log('ERR', e.message.slice(0, 180));
  }
  await browser.close();
  writeFileSync(join(DIR_SHTT, '_cnipa-status.json'), JSON.stringify({ trangThai, soBanGhi: 0, ghiChu }, null, 1) + '\n');
  log('đã ghi _cnipa-status.json', trangThai);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
}
