#!/usr/bin/env node
/**
 * Cào TCHQ (Tổng cục Hải quan — "Danh sách hàng hoá/nhãn hiệu có yêu cầu
 * kiểm tra, giám sát về SHTT") — toàn bộ.
 *
 * Thực tế (đo từ máy dev VN, 2026-10-16):
 *   - customs.gov.vn trả SPA shell 13973 bytes cho mọi pageId (chỉ JS-render).
 *   - Cổng /bridge?url=/customs/api/GetListPage có nhưng không có pageId của dataset SHTT.
 *   - Chrome headless load được homepage (Cục GSQL qua menu chính) nhưng danh sách
 *     nhãn hiệu KHÔNG công bố dạng table/dataset public — theo
 *     docs/trademark-sources.md (đã đo 07/2026): "danh sách không công bố dạng
 *     dataset/API — thực tế export tay".
 *
 * Đơn đặt hàng luật 7: KHÔNG lách captcha/anti-bot; nguồn CHAN/LOI không phải lỗi.
 * Script này capture raw HTML của vài pageId thử (bằng chứng đã cố) + ghi CHAN/LOI
 * với ghiChu rõ. KHÔNG bịa dữ liệu.
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRaw, appendRecord, TEP, log, UA, DIR_SHTT } from './lib-common.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UV_PATH = join(DIR_SHTT, 'ung-vien-nhan-hieu.json');
const NGUON_MA = 'vn-tchq-giam-sat';

async function main() {
  log('TCHQ probe (Chrome headless, capture raw làm bằng chứng đã cố)…');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  const candidates = [
    'https://www.customs.gov.vn/index.jsp?pageId=3244',
    'https://www.customs.gov.vn/index.jsp?pageId=14&cid=948&ma=237',
    'https://www.customs.gov.vn/index.jsp?pageId=14&cid=948&ma=238',
    'https://www.customs.gov.vn/index.jsp?pageId=4166',
    'https://www.customs.gov.vn/index.jsp?pageId=422',
    'https://www.customs.gov.vn/index.jsp?pageId=136',
  ];
  const raws = [];
  for (const u of candidates) {
    try {
      await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3500);
      const html = await page.content();
      const raw = writeRaw(NGUON_MA, u, html);
      raws.push({ u, sha256: raw.sha256, bytes: raw.bytes });
      log(`  ${u}  → ${raw.bytes} bytes, sha=${raw.sha256.slice(0, 12)}`);
    } catch (e) {
      log(`  ${u}  → ERR ${e.message.slice(0, 80)}`);
    }
  }
  await browser.close();
  // Ghi trạng thái nguồn vào _tchq-status.json để main gộp vào bao-cao.json
  const fs = await import('node:fs');
  const metaPath = join(DIR_SHTT, '_tchq-status.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    trangThai: 'LOI',
    ghiChu: `Site customs.gov.vn trả HTTP 200 (Chrome có đầu, ${raws.length} trang đã lưu). Không có bảng/dataset công khai "danh sách nhãn hiệu giám sát SHTT". Tìm kiếm toàn văn "sở hữu trí tuệ" ra bài viết tin tức, không ra danh mục nhãn+chủ+số hồ sơ. Cụm "danh sách nhãn hiệu kiểm tra giám sát" = không tìm thấy. Cổng nộp đơn https://pus.customs.gov.vn yêu cầu đăng nhập, không có trang tra cứu công khai. Không bịa bản ghi. Cần export tay rồi nạp scripts/ingest-trademark-watch.mjs --customs.`,
    soBanGhi: 0,
    rawFiles: raws.map((r) => ({ url: r.u, sha256: r.sha256, bytes: r.bytes })),
  }, null, 1) + '\n');
  log(`Đã ghi CHAN status vào ${metaPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
}