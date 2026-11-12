#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { dataPath, dataReadPath } = require('../lib/data-paths.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CUSTOMS_ORIGIN = 'https://www.customs.gov.vn';
const CUSTOMS_REFERER = 'https://www.customs.gov.vn/index.jsp';
const CUSTOMS_API_PATH = '/customs/APISearchMaHS';
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const JUNK_CODES = new Set(['99999999']);

/**
 * Ghép URL bridge của customs.gov.vn mà KHÔNG percent-encode `?` và `&` trong tham số `url`.
 * Nếu encode sai (`%3F`, `%26`), cổng customs trả HTTP 400.
 */
export function buildCustomsBridgeUrl(targetPath = CUSTOMS_API_PATH) {
  const raw = String(targetPath || '');
  if (!raw.startsWith('/')) {
    throw new Error(`Đường dẫn customs phải bắt đầu bằng '/': ${raw}`);
  }
  if (/%3F|%26/i.test(raw)) {
    throw new Error(`Không được percent-encode '?' hoặc '&' trong tham số url của bridge: ${raw}`);
  }
  return `${CUSTOMS_ORIGIN}/bridge?url=${raw}`;
}

export function defaultVietnamDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Lọc danh mục mã HS 8 số từ payload `APISearchMaHS`, bỏ mã rác `99999999`,
 * kiểm tra 100% có tên khác rỗng và tính độ phủ so với `data/tax.json`.
 */
export function processCustomsPayload(rawPayload, taxData, options = {}) {
  if (!rawPayload || typeof rawPayload !== 'object' || !Array.isArray(rawPayload.d)) {
    throw new Error('Payload customs không hợp lệ (thiếu mảng d)');
  }
  const rows = rawPayload.d;
  if (rows.length === 0) {
    throw new Error(`Payload customs rỗng (message=${rawPayload.message ?? 'unknown'})`);
  }

  const entries = [];
  let boMaRac = 0;
  for (const row of rows) {
    const ma = String(row?.maHS ?? '').trim();
    if (!/^\d{8}$/.test(ma)) continue;
    if (JUNK_CODES.has(ma)) {
      boMaRac += 1;
      continue;
    }
    const mota = typeof row?.mota === 'string' ? row.mota : String(row?.mota ?? '');
    if (mota.trim().length === 0) {
      throw new Error(`Mã 8 số ${ma} có mota rỗng`);
    }
    entries.push([ma, mota]);
  }

  if (entries.length === 0) {
    throw new Error('Không lọc được mã 8 số hợp lệ nào từ payload customs');
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const danhMuc = Object.fromEntries(entries);
  const soMa8So = Object.keys(danhMuc).length;

  const taxKeys8 = Object.keys(taxData || {}).filter((k) => /^\d{8}$/.test(k));
  const tongMaTax8So = taxKeys8.length;
  let soMaPhuTax = 0;
  for (const k of taxKeys8) {
    if (Object.prototype.hasOwnProperty.call(danhMuc, k)) {
      soMaPhuTax += 1;
    }
  }
  const tiLePhu = tongMaTax8So > 0 ? (soMaPhuTax / tongMaTax8So) * 100 : 0;
  const chiCoOCustoms = Object.keys(danhMuc).filter(
    (k) => !Object.prototype.hasOwnProperty.call(taxData || {}, k)
  );

  const ngay = options.ngay || defaultVietnamDate();
  const nguon = options.nguon || buildCustomsBridgeUrl(CUSTOMS_API_PATH);

  return {
    record: {
      ngay,
      nguon,
      soMa8So,
      danhMuc,
    },
    stats: {
      tongDongTho: rows.length,
      soMa8SoThongKeTruocLocRac: soMa8So + boMaRac,
      boMaRac,
      soMa8So,
      soMaPhuTax,
      tongMaTax8So,
      tiLePhu,
      soMaChiCoORepo: tongMaTax8So - soMaPhuTax,
      chiCoOCustoms,
    },
  };
}

export async function fetchCustomsDanhMuc(options = {}) {
  const url = buildCustomsBridgeUrl(CUSTOMS_API_PATH);
  const timeoutMs = options.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': CHROME_UA,
        Referer: CUSTOMS_REFERER,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: JSON.stringify({ maHS: '' }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} từ ${url}`);
    }
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(`Phản hồi từ customs không phải JSON hợp lệ (${err.message}): ${text.slice(0, 200)}`);
    }
    return parsed;
  } catch (err) {
    throw new Error(`Lỗi tải danh mục từ customs.gov.vn: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

function resolveTaxPath() {
  const p = dataReadPath('tax.json');
  if (fs.existsSync(p)) return p;
  return path.join(ROOT, 'data', 'tax.json');
}

function resolveOutPath(ngay) {
  const filename = `customs-danh-muc-${ngay}.json`;
  if (process.env.HS_DATA_DIR) {
    return dataPath('hs', filename);
  }
  return path.join(ROOT, 'data', 'hs', filename);
}

async function main(argv) {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const ngayArg = args.find((a) => a.startsWith('--ngay='))?.slice('--ngay='.length);
  const rawFileArg = args.find((a) => a.startsWith('--raw-file='))?.slice('--raw-file='.length);
  const ngay = ngayArg || defaultVietnamDate();

  const taxFile = resolveTaxPath();
  const taxData = JSON.parse(fs.readFileSync(taxFile, 'utf8'));

  const rawPayload = rawFileArg
    ? JSON.parse(fs.readFileSync(rawFileArg, 'utf8'))
    : await fetchCustomsDanhMuc();

  const { record, stats } = processCustomsPayload(rawPayload, taxData, { ngay });

  if (record.soMa8So < 11000) {
    throw new Error(`Số mã 8 số (${record.soMa8So}) thấp hơn ngưỡng 11.000`);
  }
  if (stats.tiLePhu < 96) {
    throw new Error(`Tỉ lệ phủ tax.json (${stats.tiLePhu.toFixed(2)}%) thấp hơn ngưỡng 96%`);
  }

  const outPath = resolveOutPath(ngay);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  }

  console.log(
    [
      `[customs-danh-muc] ngay=${record.ngay}`,
      `dong_tho=${stats.tongDongTho}`,
      `ma_8_so_co_ten=${record.soMa8So} (bo_rac_99999999=${stats.boMaRac})`,
      `phu_tax=${stats.soMaPhuTax}/${stats.tongMaTax8So} (${stats.tiLePhu.toFixed(2)}%)`,
      `chi_repo=${stats.soMaChiCoORepo}`,
      `chi_customs=${stats.chiCoOCustoms.length}`,
      dryRun ? 'mode=dry-run' : `out=${path.relative(ROOT, outPath)}`,
    ].join(' · ')
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv).catch((err) => {
    console.error(`ĐỎ: ${err.message}`);
    process.exit(1);
  });
}
