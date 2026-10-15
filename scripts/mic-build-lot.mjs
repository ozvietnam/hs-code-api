#!/usr/bin/env node
/**
 * Bước 12 (B-3) — dựng lô mic-product ProductPayload v2 từ danh sách tối thiểu
 * (skuId, title, urlNguon, hsCodeHint, specs[]) ghi vào data/community/mic/.
 *
 * Tách ra khỏi cbp-build-lot.mjs (intl) vì schema khác: mic-product không có
 * HS code VN, không có verbatimText — chỉ có hsCodeHint 10 số TQ + URL nguồn.
 *
 * Dùng:
 *   node scripts/mic-build-lot.mjs <path/to/products.json>
 *
 * Trong đó products.json là mảng các bản ghi tối thiểu:
 *   [{ skuId, title, urlNguon, hsCodeHint, specs?: [{key,value}], price?, minOrderQty?, shop?, retrievedAt? }]
 *
 * Tệp đầu ra: data/community/mic/mic-lot-<YYYY-MM-DD>.json (ghi đè nếu trùng ngày).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] || join(root, 'scripts', 'mic-build-lot.example.json');
if (!existsSync(SRC)) {
  console.error('Thiếu tệp đầu vào:', SRC);
  console.error('Mẫu: [{ "skuId":"...", "title":"...", "urlNguon":"https://...", "hsCodeHint":"<10 số TQ>", "specs":[...] }, ...]');
  process.exit(2);
}
const products = JSON.parse(readFileSync(SRC, 'utf8'));
if (!Array.isArray(products) || products.length === 0) {
  console.error('Đầu vào phải là mảng JSON có ít nhất 1 phần tử.');
  process.exit(2);
}

const REQ = ['skuId', 'title', 'urlNguon', 'hsCodeHint'];
for (const p of products) {
  for (const k of REQ) {
    if (!(k in p)) {
      console.error('Thiếu trường bắt buộc:', k, 'ở bản ghi:', JSON.stringify(p).slice(0, 120));
      process.exit(2);
    }
  }
  if (!/^[0-9]{10}$/.test(String(p.hsCodeHint))) {
    console.error('hsCodeHint phải đúng 10 chữ số (mã TQ), đang:', JSON.stringify(p.hsCodeHint));
    process.exit(2);
  }
  if (!/^https?:\/\//.test(String(p.urlNguon))) {
    console.error('urlNguon phải là URL http(s), đang:', JSON.stringify(p.urlNguon));
    process.exit(2);
  }
}

const doc = {
  kind: 'mic-product',
  contributor: { name: 'mic-agent-2026-10', github: 'ozvietnam' },
  license: 'CC-BY-SA-4.0',
  submittedAt: new Date().toISOString(),
  note: 'Lô thử B-3 (bước 12): 8 bản ghi ProductPayload v2 từ sản phẩm công khai trên made-in-china.com — không phải từ ERP, chỉ mô phỏng để chạy pipeline validate/merge (chưa crawl thật).',
  records: products.map((p) => ({
    title: p.title,
    skuId: p.skuId,
    urlNguon: p.urlNguon,
    retrievedAt: p.retrievedAt || new Date().toISOString().slice(0, 10),
    hsCodeHint: p.hsCodeHint,
    specs: Array.isArray(p.specs) ? p.specs : [],
    ...(p.price ? { price: p.price } : {}),
    ...(p.minOrderQty ? { minOrderQty: p.minOrderQty } : {}),
    ...(p.shop ? { shop: p.shop } : {}),
  })),
};

const today = (p => p.retrievedAt || new Date().toISOString().slice(0, 10))(products[0]);
const out = join(root, 'data', 'community', 'mic', `mic-lot-${today}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(doc, null, 1) + '\n');
console.log('ghi', out, '| bản ghi:', doc.records.length, '| hsCodeHint:', doc.records.map((x) => x.hsCodeHint).join(','));
