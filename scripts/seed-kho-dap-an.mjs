#!/usr/bin/env node
// scripts/seed-kho-dap-an.mjs — Nạp bản DUYET từ data/kho-dap-an/seed-*.json vào Postgres (OZV-1211).
// Chỉ chạy local/ops khi đã có HS_DATABASE_URL + migration 0003. Mặc định dry-run (--write để ghi).
// Không ghi data/ thật ngoài seed JSON; không bật HS_KHO_DAP_AN.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const kho = require('../lib/kho-dap-an.js');
const { loadJson } = require('../lib/data-cache');
const { dataReadPath } = require('../lib/data-paths');

const args = process.argv.slice(2);
const ghiThat = args.includes('--write');
const tep = args.find((a) => a.endsWith('.json') && !a.startsWith('-'))
  || path.join(root, 'data', 'kho-dap-an', 'seed-led-gau.json');

const tax = loadJson(dataReadPath('tax.json')) || {};
const raw = JSON.parse(fs.readFileSync(tep, 'utf8'));
const banGhi = Array.isArray(raw.banGhi) ? raw.banGhi : [];
if (!banGhi.length) {
  console.error('seed rỗng:', tep);
  process.exit(2);
}

const ketQua = [];
for (const b of banGhi) {
  const ma = String(b.maHs || '').replace(/\D/g, '');
  if (ma.length !== 8 || !tax[ma]) {
    ketQua.push({ tenHang: b.tenHang, ok: false, lyDo: 'MA_KHONG_HOP_LE' });
    continue;
  }
  const dauVao = {
    tenHang: b.tenHang,
    chatLieu: b.chatLieu || null,
    congDung: b.congDung || null,
    specs: b.specs || b.thongSo || null,
    thuongHieu: b.thuongHieu || b.brand || null,
    model: b.model || null,
  };
  const result = {
    status: b.status || 'REVIEW',
    results: [{ hs: ma, reason: 'seed DUYET (OZV-1211)' }],
    missing: [],
    girRulesApplied: [],
    candidates: [],
  };
  if (!ghiThat) {
    const sach = kho.locRiengTuKhoDapAn(dauVao);
    ketQua.push({
      tenHang: b.tenHang, ok: true, dryRun: true, maHs: ma,
      khoa: kho.khoaDapAn(sach, b.tier || 'standard'),
    });
    continue;
  }
  const r = await kho.napSeedDuyet(dauVao, result, {
    tier: b.tier || 'standard',
    moHinhCham: 'seed-ozv-1211',
  });
  ketQua.push({ tenHang: b.tenHang, maHs: ma, ...r });
}

const out = { tep, write: ghiThat, tong: banGhi.length, ok: ketQua.filter((x) => x.ok).length, ketQua };
console.log(JSON.stringify(out, null, 2));
if (ketQua.some((x) => !x.ok)) process.exit(1);
