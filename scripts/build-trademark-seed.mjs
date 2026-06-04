#!/usr/bin/env node
/**
 * Sinh data/trademark-watch.json SEED từ brand-product-map.json.
 *
 * Đây là dữ liệu KHỞI ĐẦU (verified=false, status=UNKNOWN) để công cụ cảnh báo
 * chạy được ngay. Dữ liệu THẬT (status REGISTERED/PENDING, owner, regNo,
 * customsRecorded) được nạp sau qua scripts/ingest-trademark-watch.mjs từ:
 *   - Danh sách giám sát hải quan (Tổng cục Hải quan)  -> source "customs"
 *   - WIPO Global Brand Database (NOIP + Madrid)        -> source "wipo"
 *
 * Chạy: node scripts/build-trademark-seed.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(rootDir, 'data');

function normalizeMark(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Heuristic: nhóm sản phẩm (tiếng Việt) -> nhóm Nice
const CATEGORY_TO_NICE = [
  [/điện thoại|smartphone|máy tính bảng|tai nghe|thiết bị mạng/, [9]],
  [/máy tính|laptop|máy tính xách tay/, [9]],
  [/tivi|tv/, [9]],
  [/tủ lạnh|máy giặt|máy rửa bát|máy sấy|máy hút bụi|robot hút bụi|máy điều hòa|máy lạnh|quạt|điều hòa/, [7, 11]],
  [/máy bơm|bơm nước|động cơ|máy phát điện|máy khoan|dụng cụ điện/, [7]],
  [/pin|ắc quy/, [9]],
  [/xe máy|ô tô|xe|linh kiện ô tô/, [12]],
  [/dầu|nhớt|nhiên liệu/, [4]],
  [/mỹ phẩm|nước hoa/, [3]],
  [/giày|dép|quần áo|thời trang/, [25]],
];

function niceForCategories(categories) {
  const out = new Set();
  for (const cat of categories) {
    for (const [re, classes] of CATEGORY_TO_NICE) {
      if (re.test(cat)) classes.forEach((c) => out.add(c));
    }
  }
  return [...out].sort((a, b) => a - b);
}

const niceHs = JSON.parse(readFileSync(join(dataDir, 'nice-hs-map.json'), 'utf8')).map || {};
function hsChaptersForNice(niceClasses) {
  const out = new Set();
  for (const c of niceClasses) for (const ch of niceHs[String(c)] || []) out.add(ch);
  return [...out].sort();
}

const brandMap = JSON.parse(readFileSync(join(dataDir, 'brand-product-map.json'), 'utf8'));

const marks = {};
for (const [brand, categories] of Object.entries(brandMap)) {
  const niceClasses = niceForCategories(categories);
  marks[brand] = {
    normalized: normalizeMark(brand),
    owner: null,
    appNo: null,
    regNo: null,
    niceClasses,
    hsChapters: hsChaptersForNice(niceClasses),
    status: 'UNKNOWN',
    customsRecorded: false,
    cn: { gaccRecorded: false, recordNo: null, ipTypes: [], verified: false, source: 'seed' },
    verified: false,
    source: 'seed',
    productCategories: categories,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

// Entry thủ công (vd nhãn CEO quan tâm). VPOWER: nhãn phổ biến cho dầu nhớt /
// máy phát điện / ắc quy → nhóm Nice 4,7,9. Chưa xác minh trạng thái.
const manual = {
  VPOWER: {
    niceClasses: [4, 7, 9],
    status: 'UNKNOWN',
    productCategories: ['dầu nhớt', 'máy phát điện', 'ắc quy'],
    note: 'Nhãn ví dụ từ yêu cầu CEO — cần tra cứu xác minh tại iplib.noip.gov.vn',
  },
};
for (const [brand, info] of Object.entries(manual)) {
  marks[brand] = {
    normalized: normalizeMark(brand),
    owner: null,
    appNo: null,
    regNo: null,
    niceClasses: info.niceClasses,
    hsChapters: hsChaptersForNice(info.niceClasses),
    status: info.status || 'UNKNOWN',
    customsRecorded: false,
    cn: { gaccRecorded: false, recordNo: null, ipTypes: [], verified: false, source: 'seed' },
    verified: false,
    source: 'seed',
    productCategories: info.productCategories || [],
    note: info.note,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

const out = {
  _meta: {
    purpose: 'Watchlist nhãn hiệu để cảnh báo rủi ro SHTT khi nhập khẩu (TT 13/2015 & 13/2020).',
    warning: 'SEED chưa xác minh (verified=false). Nạp dữ liệu thật qua scripts/ingest-trademark-watch.mjs.',
    schema: {
      status: 'REGISTERED | PENDING | EXPIRED | UNKNOWN',
      customsRecorded: 'true nếu nằm trong danh sách giám sát của Tổng cục Hải quan',
      source: 'customs | wipo | seed',
      verified: 'true nếu đã đối chiếu nguồn chính thức',
    },
    generatedAt: new Date().toISOString(),
  },
  marks,
};

writeFileSync(join(dataDir, 'trademark-watch.json'), JSON.stringify(out, null, 2));
console.log(`Wrote ${Object.keys(marks).length} marks to data/trademark-watch.json (all seed/unverified).`);
