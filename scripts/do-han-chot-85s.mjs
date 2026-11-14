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
 * số đo không hợp lệ, đừng dán lên thẻ. Cổng soi bốn dấu hiệu, xem `kiemTinCay()`:
 * health không có provider · ca trả mã thiếu khoá · quá nửa ca nhanh bất thường ·
 * quá nửa ca lỗi. Chỉ cần một dấu hiệu là chặn (trước đây phải MỌI ca nhanh mới chặn,
 * nên một phần nhà cung cấp chết thì bảng vẫn in — GĐ ghi 14/11).
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

/**
 * Ngưỡng nghi "không có lượt AI thật", tính bằng ms.
 *
 * Bản đầu đặt 5000 ms theo câu "lượt thật rẻ nhất trong thực địa cũng ~36 giây".
 * Đo thật trên prod 14/11 (22 ca, `/api/classify`) BÁC BỎ câu đó: ca `td-05` về
 * trong 4,52 giây mà vẫn là lượt AI thật — `engine.rounds = 2`, `engine.providers
 * = ["gemini-free","gemini-free"]`.
 *
 * Nói cho đúng số (soát chéo 14/11 bắt được chỗ này): bảng prod 14/11 chỉ có
 * 2/22 ca dưới 5 giây, DƯỚI cổng 1/4 (5,5 ca), nên bảng đó đi qua được ở CẢ hai
 * ngưỡng — không phải "5000 ms chặn oan bảng ấy". Lý do hạ là ở nguyên tắc: đã
 * chứng minh được một lượt AI THẬT về trong 4,52 giây thì mốc 5000 ms nằm sai
 * chỗ, nó gom lượt thật vào vùng nghi. Chỉ cần thực địa nhanh thêm chút (4 ca
 * nữa trong dải 2–5 giây) là cổng 5000 ms chặn oan thật. 2000 ms mới là dải
 * riêng của bản chạy không khoá, nơi `/api/classify` trả ENGINE_TIMEOUT gần như
 * tức thì. Ca `6g-bis` trong bộ test khoá đúng vùng biên 2000–5000 ms này.
 */
const NGUONG_NGHI_KHONG_AI_MS = 2000;
const MA_8_SO = /^\d{8}$/;
/** Mã lý do chứng tỏ bản chạy thiếu khoá — chỉ cần MỘT ca là cả bảng hỏng. */
const MA_THIEU_KHOA = new Set(['LLM_NOT_CONFIGURED', 'NO_PRIVATE_LLM', 'LLM_UNAVAILABLE']);

export function docBoCa() {
  const raw = JSON.parse(readFileSync(BO, 'utf8'));
  const cases = Array.isArray(raw?.cases) ? raw.cases : [];
  if (cases.length < 20) throw new Error(`${BO}: cần >= 20 ca, hiện có ${cases.length}`);
  for (const ca of cases) {
    if (!ca.id || !String(ca.cauKhach || '').trim()) throw new Error(`ca thiếu id/cauKhach: ${JSON.stringify(ca).slice(0, 120)}`);
  }
  return LIMIT > 0 ? cases.slice(0, LIMIT) : cases;
}

/**
 * Mã 8 số đầu tiên mà phản hồi chốt được (A1). Chỉ nhận mã ở `results`, không nhận
 * gợi ý nhóm 4/6 số.
 *
 * TÊN TRƯỜNG: `/api/classify` thật trả `results[].hs` (kèm `hsLevel`), KHÔNG phải
 * `hsCode`. Bản đầu chỉ đọc `hsCode`/`ma` nên bộ đo prod 14/11 in "A1 số ca ra mã
 * 8 số: 0" cho cả 22 ca trong khi dịch vụ vẫn trả mã — số 0 đó là lỗi máy đo, không
 * phải lỗi dịch vụ. Test cũ không bắt được vì fixture tự dựng `{hsCode}`, một hình
 * dạng không tồn tại ở đường chạy thật. Đọc cả ba tên, `hs` trước.
 */
export function ma8So(body) {
  const ds = Array.isArray(body?.results) ? body.results : [];
  for (const r of ds) {
    const ma = String(r?.hs ?? r?.hsCode ?? r?.ma ?? '').replace(/\D/g, '');
    if (MA_8_SO.test(ma)) return ma;
  }
  const chot = String(body?.hs ?? body?.hsCode ?? body?.ma ?? '').replace(/\D/g, '');
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

/**
 * Cổng tin cậy (luật 5, OZV-310) — trả `{ hopLe, lyDo[] }`.
 *
 * Bản đầu chỉ chặn khi MỌI ca về dưới 5 giây; GĐ ghi 14/11 rằng nếu chỉ MỘT PHẦN
 * nhà cung cấp chết thì bảng vẫn in và người đọc phải tự soi cột A2 — tức là cổng
 * không giữ được. Nay chặn theo bốn dấu hiệu độc lập, chỉ cần một dấu hiệu là đủ:
 *
 *  1. `/api/health` nói thẳng không có nhà cung cấp LLM nào (`llm.order` rỗng) —
 *     dấu hiệu chắc chắn nhất, không phải đoán theo giây;
 *  2. có ca trả mã lý do thiếu khoá (`LLM_NOT_CONFIGURED`…) — một ca là đủ;
 *  3. từ 1/4 số ca trở lên về dưới `NGUONG_NGHI_KHONG_AI_MS` (2 giây) — xem ghi
 *     chú ở hằng số đó: lượt AI thật đã đo được ở 4,52 giây, nên mốc nghi phải
 *     nằm dưới dải đó, chỉ ôm vùng ENGINE_TIMEOUT tức thì;
 *  4. quá nửa số ca lỗi (A2) — bảng trung vị/p95 khi đó vô nghĩa.
 *
 * Hai ngưỡng khác nhau là cố ý. Ca LỖI lác đác là chuyện thường của lượt LLM thật
 * (nhà cung cấp rớt rồi lên lại), nên chỉ chặn khi quá nửa — cổng báo oan sẽ làm
 * người đo bỏ luôn số đúng. Còn ca về dưới 2 GIÂY thì không có cách đọc lành nào:
 * nó là bản chạy không gọi AI, nên 1/4 đã đủ chặn.
 */
export function kiemTinCay(ketQua, suc) {
  const lyDo = [];
  const giay = ketQua.map((k) => k.giay).filter((g) => typeof g === 'number');

  const llm = suc?.checks?.llm;
  if (!llm) {
    lyDo.push('không đọc được khối `checks.llm` của /api/health — không biết bản chạy có khoá hay không.');
  } else if (!Array.isArray(llm.order) || llm.order.length === 0) {
    lyDo.push('/api/health báo KHÔNG có nhà cung cấp LLM nào (`llm.order` rỗng) — mọi lượt chạy chế độ không AI.');
  }

  const thieuKhoa = ketQua.filter((k) => MA_THIEU_KHOA.has(String(k.reasonCode || '')));
  if (thieuKhoa.length) {
    lyDo.push(`${thieuKhoa.length} ca trả mã thiếu khoá (${[...new Set(thieuKhoa.map((k) => k.reasonCode))].join(', ')}).`);
  }

  if (!giay.length) {
    lyDo.push('không ca nào chạy xong — không có số để tính trung vị.');
  } else {
    const nhanh = giay.filter((g) => g < NGUONG_NGHI_KHONG_AI_MS / 1000).length;
    if (nhanh * 4 >= giay.length) {
      lyDo.push(`${nhanh}/${giay.length} ca về dưới ${NGUONG_NGHI_KHONG_AI_MS / 1000} giây — nhanh bất thường, đó là dải của bản chạy không khoá (ENGINE_TIMEOUT tức thì), không phải lượt AI thật.`);
    }
  }

  const loi = ketQua.filter((k) => k.loi).length;
  if (ketQua.length && loi * 2 > ketQua.length) {
    lyDo.push(`${loi}/${ketQua.length} ca lỗi (A2 quá nửa) — trung vị/p95 của phần còn lại không đại diện.`);
  }

  return { hopLe: lyDo.length === 0, lyDo };
}

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
  const tinCay = kiemTinCay(ketQua, suc);
  if (!tinCay.hopLe) {
    console.log('');
    console.log('SỐ ĐO KHÔNG HỢP LỆ — đừng dán bảng trên lên thẻ. Lý do:');
    for (const d of tinCay.lyDo) console.log(`- ${d}`);
    console.log('Bảng "nhanh vượt bậc" ở đây là dấu hiệu bản chạy thiếu khoá, không phải bản vá ăn — soi lại trước khi dán số.');
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
