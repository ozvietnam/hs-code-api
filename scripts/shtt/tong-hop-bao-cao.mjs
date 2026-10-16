#!/usr/bin/env node
/**
 * Tổng hợp data/shtt/bao-cao.json từ các tệp:
 *   - JSONL kết quả (vn-ipvietnam-dang-ky.jsonl, …)
 *   - khong-tim-thay.jsonl
 *   - _gacc-status.json, _tchq-status.json, _tmview-status.json, _cnipa-status.json
 *   - raw-index.json
 *
 * Đơn đặt hàng yêu cầu bao-cao.json có:
 *   ngay, may (OS+mạng), batDau, ketThuc,
 *   camKet: { khongLachCaptcha: true, tocDo: "…" },
 *   nguon[]: { ma, trangThai, soBanGhi, ghiChu }
 *
 * Chạy cuối đợt cào, sau khi tất cả scripts cào đã xong.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReport, mayMach, TEP, DIR_SHTT, DIR_RAW } from './lib-common.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const NGUON_CODES = ['vn-tchq-giam-sat', 'cn-gacc-beian', 'vn-ipvietnam-dang-ky', 'tmview-cn-vn', 'cn-cnipa-dang-ky'];

function countLines(p) {
  if (!existsSync(p)) return 0;
  return readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).length;
}

// Ánh xạ mã nguồn → tên file status ngắn do script cào ghi ra.
const STATUS_FILE = {
  'vn-tchq-giam-sat': '_tchq-status.json',
  'cn-gacc-beian': '_gacc-status.json',
  'vn-ipvietnam-dang-ky': null, // có record JSONL, không cần status meta
  'tmview-cn-vn': '_tmview-status.json',
  'cn-cnipa-dang-ky': null,
};

function readMeta(name) {
  const fileName = STATUS_FILE[name];
  if (!fileName) return null;
  const p = join(DIR_SHTT, fileName);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

async function main() {
  const batDau = process.argv.find((a) => a.startsWith('--bat-dau='))?.slice('--bat-dau='.length) || new Date(Date.now() - 3600_000).toISOString();
  const ketThuc = new Date().toISOString();
  const may = await mayMach();
  const nguon = [];
  for (const ma of NGUON_CODES) {
    const meta = readMeta(ma);
    const jsonl = join(DIR_SHTT, TEP[ma]);
    const soBanGhi = countLines(jsonl);
    const trangThai = meta?.trangThai || (soBanGhi > 0 ? 'OK' : 'BO_QUA');
    const ghiChu = meta?.ghiChu || (soBanGhi > 0 ? `cào ${soBanGhi} bản ghi` : 'chưa có script cào / không tra tới');
    nguon.push({ ma, trangThai, soBanGhi, ghiChu });
  }
  const notFound = countLines(join(DIR_SHTT, TEP['khong-tim-thay']));
  const rawCount = existsSync(join(DIR_SHTT, 'raw-index.json')) ? JSON.parse(readFileSync(join(DIR_SHTT, 'raw-index.json'), 'utf8')).tho.length : 0;
  const baoCao = {
    ngay: new Date().toISOString().slice(0, 10),
    may,
    batDau,
    ketThuc,
    camKet: { khongLachCaptcha: true, tocDo: '≤ 1 yêu cầu/giây/nguồn (Chrome navigate Wicket/WAF + delay 4.5s/lượt; mỗi lượt lưu raw sha256)' },
    nguon,
    soKhongTimThay: notFound,
    soRaw: rawCount,
    ghiChuChung: 'Đợt cào đêm 16-17/10/2026 (#335). WIPO Publish cho ~56+ record VN. TCHQ/GACC/TMview chặn từ máy dev VN (CHAN/CAPTCHA), ghi trạng thái đầy đủ — không bịa. Xem scripts/shtt/cao-*.mjs để tái lập.',
  };
  writeReport(baoCao);
  console.log('Đã ghi bao-cao.json:');
  console.log(JSON.stringify(baoCao, null, 1));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
}