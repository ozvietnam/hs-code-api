#!/usr/bin/env node
// scripts/thong-ke-kho-dap-an.mjs — Số đo kho đáp án chế độ BÓNG (G5 PR 1a, OZV-1144; thiết kế OZV-760 mục 6).
//
// Nguồn số liệu (theo thứ tự):
//   --file=<log.jsonl>   tệp log tiến trình (mỗi dòng một JSON; chỉ đọc dòng type:"kho_dap_an")
//   stdin                khi không phải TTY (vd `docker logs hs-api 2>&1 | node scripts/thong-ke-kho-dap-an.mjs --json`)
//   HS_DATABASE_URL      thêm tổng quan bảng kho_dap_an (đếm theo trang_thai, số bản có mau_thuan) nếu có DB
// Tuỳ chọn: --days=N (lọc theo trường ts của log, mặc định 7) · --json (in JSON) · --compare-days=N (bí danh --days).
//
// 5 số đo mục 6 thiết kế:
//   1. tyLeTrungDapAn  — lượt trúng khoa_dap_an / lượt đã đọc kho được
//   2. tyLeTrungDuKien — lượt chỉ trúng khoa_du_kien (cùng tên/hãng/model, khác thông số…) / lượt đã đọc kho được
//   3. tyLeMauThuan    — lượt trúng đáp án mà mã động cơ khác mã kho / lượt trúng đáp án
//   4. k3GhepNham      — null: K3 (gần nghĩa) CHƯA bật ở Giai đoạn 1, đo bằng scripts/test-kho-dap-an-k3.mjs ở PR sau
//   5. tbLuotLlm       — trung bình số lượt gọi LLM mỗi lượt khách (từ soLuotLlm của log)
// Kèm: msDocKho p50/p95, số lượt QUA_HAN / LOI_DOC, số bản ghi theo loại.
// Không có dữ liệu ⇒ vẫn thoát 0, các tỉ lệ = null (chưa đo được, không bịa số).

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const soNgay = Number(args.days ?? args['compare-days'] ?? 7);
const inJson = args.json === true || args.json === 'true';

/** Tính số đo từ danh sách dòng log (đã parse). Xuất ra cho test dùng lại. */
export function tinhSoDo(dong, { days = 7, now = Date.now() } = {}) {
  const tu = Number.isFinite(days) && days > 0 ? now - days * 86400000 : -Infinity;
  const ds = dong.filter((d) => d && d.type === 'kho_dap_an' && (!d.ts || Date.parse(d.ts) >= tu));
  const dem = (f) => ds.filter(f).length;
  const docDuoc = ds.filter((d) => ['TRUNG_DAP_AN', 'TRUNG_DU_KIEN', 'KHONG_TRUNG'].includes(d.ketQua));
  const trungDA = docDuoc.filter((d) => d.ketQua === 'TRUNG_DAP_AN');
  const trungDK = docDuoc.filter((d) => d.ketQua === 'TRUNG_DU_KIEN');
  const tiLe = (a, b) => (b > 0 ? Math.round((a / b) * 10000) / 10000 : null);
  const ms = ds.map((d) => d.msDocKho).filter(Number.isFinite).sort((a, b) => a - b);
  const phanVi = (p) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))] : null);
  const llm = ds.map((d) => d.soLuotLlm).filter(Number.isFinite);
  return {
    soNgay: days,
    tongLuot: ds.length,
    luotDocDuoc: docDuoc.length,
    soDo: {
      tyLeTrungDapAn: tiLe(trungDA.length, docDuoc.length),
      tyLeTrungDuKien: tiLe(trungDK.length, docDuoc.length),
      tyLeMauThuan: tiLe(trungDA.filter((d) => d.mauThuan === true).length, trungDA.length),
      k3GhepNham: null,
      tbLuotLlm: llm.length ? Math.round((llm.reduce((a, b) => a + b, 0) / llm.length) * 100) / 100 : null,
    },
    leRaTraDapAn: dem((d) => d.leRaTra === true),
    msDocKho: { p50: phanVi(50), p95: phanVi(95) },
    quaHan: dem((d) => d.ketQua === 'QUA_HAN'),
    loiDoc: dem((d) => d.ketQua === 'LOI_DOC'),
    khongCoDb: dem((d) => d.ketQua === 'KHONG_CO_DB'),
    ghi: { NHAP: dem((d) => d.ghi === 'NHAP'), CHI_DU_KIEN: dem((d) => d.ghi === 'CHI_DU_KIEN'), khong: dem((d) => !d.ghi) },
    ghiChu: 'k3GhepNham = null vì K3 chưa bật ở Giai đoạn 1 (PR 1a chỉ có chế độ bóng).',
  };
}

/** Parse văn bản log nhiều dòng; dòng không phải JSON bỏ qua. */
export function docLog(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const i = line.indexOf('{');
    if (i < 0 || !line.includes('"kho_dap_an"')) continue;
    try { out.push(JSON.parse(line.slice(i))); } catch { /* dòng hỏng */ }
  }
  return out;
}

async function tongQuanDb() {
  if (!process.env.HS_DATABASE_URL) return null;
  try {
    const { layPool, dongPool, maLoi } = require('../lib/db.js');
    const pool = layPool();
    if (!pool) return null;
    try {
      const { rows } = await pool.query(
        `SELECT trang_thai, count(*)::int AS so, sum(CASE WHEN jsonb_array_length(mau_thuan) > 0 THEN 1 ELSE 0 END)::int AS co_mau_thuan
           FROM kho_dap_an GROUP BY trang_thai`
      );
      return { theoTrangThai: rows };
    } catch (e) {
      return { loi: maLoi(e) };
    } finally {
      await dongPool().catch(() => {});
    }
  } catch { return null; }
}

async function main() {
  let text = '';
  let nguon = 'trong';
  if (typeof args.file === 'string') {
    text = fs.readFileSync(args.file, 'utf8');
    nguon = 'tep';
  } else if (!process.stdin.isTTY) {
    text = await new Promise((resolve) => {
      let buf = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (c) => { buf += c; });
      process.stdin.on('end', () => resolve(buf));
      process.stdin.on('error', () => resolve(buf));
    });
    if (text) nguon = 'stdin';
  }
  const kq = { nguon, ...tinhSoDo(docLog(text), { days: soNgay }), db: await tongQuanDb() };
  if (inJson) {
    console.log(JSON.stringify(kq, null, 2));
  } else {
    const p = (x) => (x == null ? 'chưa đo được' : `${(x * 100).toFixed(2)}%`);
    console.log(`Kho đáp án (bóng) — ${kq.soNgay} ngày, ${kq.tongLuot} lượt (${kq.luotDocDuoc} đọc kho được), nguồn ${nguon}`);
    console.log(`  1. trúng đáp án: ${p(kq.soDo.tyLeTrungDapAn)} · 2. trúng dữ kiện: ${p(kq.soDo.tyLeTrungDuKien)} · 3. mâu thuẫn: ${p(kq.soDo.tyLeMauThuan)}`);
    console.log(`  4. K3 ghép nhầm: chưa bật · 5. TB lượt LLM: ${kq.soDo.tbLuotLlm ?? 'chưa đo được'}`);
    console.log(`  đọc kho p50/p95: ${kq.msDocKho.p50 ?? '-'} / ${kq.msDocKho.p95 ?? '-'} ms · quá hạn ${kq.quaHan} · lỗi ${kq.loiDoc}`);
  }
}

const laChayTrucTiep = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (laChayTrucTiep) {
  main().catch((e) => { console.error(`thong-ke-kho-dap-an lỗi: ${e.message}`); process.exit(1); });
}
