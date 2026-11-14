#!/usr/bin/env node
/**
 * Đo hạn chót 85 s của `/api/classify` trên bộ ca thật — OZV-780.
 *
 * Chạy TUẦN TỰ (1 lượt một lúc) trên MỘT bản chạy đang mở sẵn, in đúng 5 dòng số
 * mà thẻ đo yêu cầu: trung vị, p95, số ca > 120 s, số ca lỗi/không JSON (A2),
 * số ca ra mã 8 số (A1). Đo hai bên TRƯỚC/SAU = chạy script này hai lần, mỗi lần
 * trỏ `--url` sang bản chạy của một SHA; KHÔNG chạy song song (số đo sẽ hỏng).
 *
 * Script chỉ ĐỌC: không sửa data/, không gọi admin, không in giá trị khoá.
 *
 *   node scripts/do-han-chot-85s.mjs --url=http://127.0.0.1:3101 --nhan=TRUOC
 *   node scripts/do-han-chot-85s.mjs --url=http://127.0.0.1:3102 --nhan=SAU
 *
 * Cờ: --bo=<tệp json>  --limit=<n>  --timeout=<giây, mặc định 180>  --ra=<tệp jsonl>
 *
 * CỔNG TIN CẬY (luật 5, OZV-310): nếu bản chạy không có nhà cung cấp LLM nào thì
 * mọi ca về trong ~2 giây với ENGINE_TIMEOUT và bảng số trông như "nhanh vượt bậc"
 * trong khi thật ra KHÔNG có lượt AI nào. Script tự phát hiện và thoát mã 3 —
 * số đo không hợp lệ, đừng dán lên thẻ.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..');
const BO_MAC_DINH = join(GOC, 'tests', 'bo-ca-do-han-chot.json');

function doCo(ten, macDinh = null) {
  const tien = `--${ten}=`;
  const hit = process.argv.find((a) => a.startsWith(tien));
  return hit ? hit.slice(tien.length) : macDinh;
}

const URL_GOC = String(doCo('url', 'http://127.0.0.1:3000')).replace(/\/+$/, '');
const NHAN = doCo('nhan', 'DO');
const BO = doCo('bo', BO_MAC_DINH);
const LIMIT = Number(doCo('limit', '0')) || 0;
const TIMEOUT_MS = (Number(doCo('timeout', '180')) || 180) * 1000;
const RA = doCo('ra', null);

/** Ngưỡng nghi "không có lượt AI thật": lượt thật rẻ nhất trong thực địa cũng ~36 giây. */
const NGUONG_NGHI_KHONG_AI_MS = 5000;
const MA_8_SO = /^\d{8}$/;

export function docBoCa() {
  const raw = JSON.parse(readFileSync(BO, 'utf8'));
  const cases = Array.isArray(raw?.cases) ? raw.cases : [];
  if (cases.length < 20) throw new Error(`${BO}: cần >= 20 ca, hiện có ${cases.length}`);
  for (const ca of cases) {
    if (!ca.id || !String(ca.cauKhach || '').trim()) throw new Error(`ca thiếu id/cauKhach: ${JSON.stringify(ca).slice(0, 120)}`);
  }
  return LIMIT > 0 ? cases.slice(0, LIMIT) : cases;
}

/** Mã 8 số đầu tiên mà phản hồi chốt được (A1). Chỉ nhận mã ở `results`, không nhận gợi ý nhóm 4 số. */
export function ma8So(body) {
  const ds = Array.isArray(body?.results) ? body.results : [];
  for (const r of ds) {
    const ma = String(r?.hsCode ?? r?.ma ?? '').replace(/\D/g, '');
    if (MA_8_SO.test(ma)) return ma;
  }
  const chot = String(body?.hsCode ?? body?.ma ?? '').replace(/\D/g, '');
  return MA_8_SO.test(chot) ? chot : null;
}

async function chayMotCa(ca) {
  const batDau = Date.now();
  const huy = new AbortController();
  const hen = setTimeout(() => huy.abort(), TIMEOUT_MS);
  const ket = {
    id: ca.id,
    nguon: ca.nguon?.loai ?? null,
    maThamChieu: ca.maThamChieu ?? null,
    http: null,
    giay: null,
    trangThai: null,
    reasonCode: null,
    ma8So: null,
    loi: null,
  };
  try {
    const res = await fetch(`${URL_GOC}/api/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenHang: ca.cauKhach }),
      signal: huy.signal,
    });
    ket.http = res.status;
    const text = await res.text();
    ket.giay = (Date.now() - batDau) / 1000;
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      ket.loi = 'KHONG_JSON';
      return ket;
    }
    ket.trangThai = body?.status ?? body?.trangThai ?? null;
    ket.reasonCode = body?.nextAction?.reasonCode ?? body?.reasonCode ?? null;
    ket.ma8So = ma8So(body);
    if (res.status >= 400) ket.loi = `HTTP_${res.status}`;
    else if (!ket.ma8So && !ket.trangThai) ket.loi = 'THAN_RONG';
  } catch (e) {
    ket.giay = (Date.now() - batDau) / 1000;
    ket.loi = e?.name === 'AbortError' ? `QUA_${TIMEOUT_MS / 1000}S` : `MANG_${e?.code || e?.message || 'loi'}`;
  } finally {
    clearTimeout(hen);
  }
  return ket;
}

export function trungVi(ds) {
  if (!ds.length) return null;
  const s = [...ds].sort((a, b) => a - b);
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g] : (s[g - 1] + s[g]) / 2;
}

/** p95 kiểu "nearest-rank": ca thứ ceil(0.95*n) sau khi sắp tăng. Bộ 22 ca ⇒ ca thứ 21. */
export function p95(ds) {
  if (!ds.length) return null;
  const s = [...ds].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)];
}

const lam2 = (n) => (n == null ? '—' : n.toFixed(2));

async function main() {
  const cases = docBoCa();
  let suc = null;
  try {
    const res = await fetch(`${URL_GOC}/api/health`);
    suc = await res.json().catch(() => null);
  } catch {
    console.error(`Không gọi được ${URL_GOC}/api/health — bản chạy chưa mở?`);
    process.exit(1);
  }
  console.log(`# ĐO HẠN CHÓT 85 s — bên ${NHAN}`);
  console.log(`- url: ${URL_GOC} · commit bản chạy: ${suc?.commit ?? 'khong-ro'}`);
  console.log(`- bộ ca: ${BO} · ${cases.length} ca · tuần tự, 1 lượt một lúc`);
  console.log(`- loadavg lúc bắt đầu: ${readFileSync('/proc/loadavg', 'utf8').trim()}`);
  console.log('');

  const ketQua = [];
  for (const [i, ca] of cases.entries()) {
    const k = await chayMotCa(ca);
    ketQua.push(k);
    console.log(
      `[${String(i + 1).padStart(2, '0')}/${cases.length}] ${k.id} · ${lam2(k.giay)}s · http=${k.http ?? '-'} · ${k.trangThai ?? '-'}` +
        `${k.ma8So ? ` · ma=${k.ma8So}` : ''}${k.loi ? ` · LOI=${k.loi}` : ''}`,
    );
  }

  const giay = ketQua.map((k) => k.giay).filter((g) => typeof g === 'number');
  const loi = ketQua.filter((k) => k.loi);
  const ra8 = ketQua.filter((k) => k.ma8So);
  const qua120 = ketQua.filter((k) => typeof k.giay === 'number' && k.giay > 120);

  console.log('');
  console.log(`## Bảng ${NHAN} (${cases.length} ca)`);
  console.log(`- trung vị: ${lam2(trungVi(giay))} giây`);
  console.log(`- p95: ${lam2(p95(giay))} giây`);
  console.log(`- số ca > 120 giây: ${qua120.length}`);
  console.log(`- A2 số ca lỗi/không JSON: ${loi.length}${loi.length ? ` (${loi.map((k) => `${k.id}:${k.loi}`).join(', ')})` : ''}`);
  console.log(`- A1 số ca ra mã 8 số: ${ra8.length}`);

  if (RA) {
    writeFileSync(RA, ketQua.map((k) => JSON.stringify(k)).join('\n') + '\n');
    console.log(`- chi tiết từng ca: ${RA}`);
  }

  // Cổng tin cậy: không có lượt AI thật thì bảng số trên là rác, đừng dán lên thẻ.
  const nhanh = giay.filter((g) => g < NGUONG_NGHI_KHONG_AI_MS / 1000).length;
  const engineTimeout = ketQua.filter((k) => k.reasonCode === 'ENGINE_TIMEOUT').length;
  if (giay.length && nhanh === giay.length) {
    console.log('');
    console.log(`SỐ ĐO KHÔNG HỢP LỆ: cả ${giay.length} ca về dưới ${NGUONG_NGHI_KHONG_AI_MS / 1000} giây` +
      `${engineTimeout ? ` và ${engineTimeout} ca trả ENGINE_TIMEOUT` : ''}.`);
    console.log('Bản chạy gần như chắc chắn KHÔNG có khoá nhà cung cấp LLM nào (xem log: LLM_NOT_CONFIGURED).');
    console.log('Lượt thật rẻ nhất trong thực địa cũng ~36 giây. Đừng dán bảng này lên thẻ.');
    process.exit(3);
  }
}

const LA_LENH_TRUC_TIEP = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (LA_LENH_TRUC_TIEP) {
  main().catch((e) => {
    console.error(e?.stack || String(e));
    process.exit(1);
  });
}
