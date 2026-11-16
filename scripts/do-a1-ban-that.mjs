#!/usr/bin/env node
/**
 * scripts/do-a1-ban-that.mjs — Đo A1/A2 trên bộ 50 ca TB-TCHQ qua BẢN THẬT `POST /api/suggest` (OZV-1233).
 *
 * Khác `scripts/benchmark-50-ca-tb-tchq.mjs` (no-LLM, replay tại chỗ): script này gọi API sống, có LLM,
 * nên số ra là A1 thật của hệ thống đang chạy — thay mốc Cổng 12/11 (top-1 33/50).
 *
 * Luật đo (thẻ OZV-1233):
 *   - Chỉ gửi `{ description: cauKhach }` — KHÔNG gửi `ma`, `maLan` hay bất kỳ phần đáp án nào.
 *   - Mỗi ca 1 lượt; chỉ thử lại TỐI ĐA 1 lần khi lỗi mạng (fetch ném lỗi không phải hết giờ, hoặc HTTP 502/503/504).
 *     Hết giờ (timeout) KHÔNG thử lại — mỗi lượt tốn chi phí mô hình thật.
 *   - Đồng thời tối đa 3 lượt; timeout 180 s/lượt.
 *   - Không import lib/ (không đụng dữ liệu, không cần khoá) — chỉ node + fetch.
 *
 * Cách dùng:
 *   node scripts/do-a1-ban-that.mjs > ket-qua.jsonl 2> ket-qua.log        # chạy 50 ca, mỗi dòng JSONL = 1 ca
 *   node scripts/do-a1-ban-that.mjs --stt=3,17 > lai.jsonl                  # chỉ chạy vài ca
 *   node scripts/do-a1-ban-that.mjs --bao-cao=ket-qua.jsonl > bao-cao.md    # đọc JSONL → bảng markdown (không gọi mạng)
 *   node scripts/do-a1-ban-that.mjs --self-test                              # kiểm phần chấm/tổng hợp, không gọi mạng
 *
 * Tuỳ chọn: --url=<gốc API> (mặc định https://hs-kb.uythacnhapkhau.com) · --concurrency=N (≤3) ·
 *           --timeout-ms=N (≤180000) · --limit=N.
 *
 * Cách chấm giống `chamMotCa` trong benchmark-50-ca-tb-tchq.mjs (so mã 8 số), cộng thêm phân loại theo `status`
 * như AGENTS.md mục 2b: NO_CANDIDATES / NEEDS_EXPERT / không có mã 8 số ⇒ "không ra mã" (không tính đúng).
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, '..', 'tests', 'bo-50-ca-tb-tchq.json');
const URL_MAC_DINH = 'https://hs-kb.uythacnhapkhau.com';
const DONG_THOI_TOI_DA = 3;
const TIMEOUT_TOI_DA_MS = 180_000;
const HTTP_THU_LAI = new Set([502, 503, 504]);
const STATUS_KHONG_RA_MA = new Set(['NO_CANDIDATES', 'NEEDS_EXPERT']);

const chiSo = (s) => String(s ?? '').replace(/\D/g, '');
const pct = (n, tong) => (tong ? ((n / tong) * 100).toFixed(1) : '0.0');

/** Đọc bộ 50 ca; chỉ giữ trường cần. `ma`/`maLan` dùng để CHẤM, không bao giờ gửi lên API. */
export function docBo50Ca(duong = FIXTURE_PATH) {
  const raw = JSON.parse(readFileSync(duong, 'utf8'));
  if (!raw || !Array.isArray(raw.cases) || raw.cases.length !== 50) {
    throw new Error(`bo-50-ca-tb-tchq: phải có đúng 50 ca (hiện có ${raw?.cases?.length ?? 0})`);
  }
  return {
    version: raw.version,
    chuanCong1211: raw.chuanCong1211,
    cases: raw.cases.map((ca) => ({
      stt: ca.stt,
      ma: chiSo(ca.ma),
      maLan: (ca.maLan || []).map(chiSo).filter((m) => m.length === 8),
      cauKhach: String(ca.cauKhach || '').trim(),
      soHieu: ca.nguon?.soHieu || '',
    })),
  };
}

/** Thân lời gọi: CHỈ mô tả hàng của khách. Hỗ trợ suggest và classify. */
export function dungThanGoi(ca, endpoint = 'suggest') {
  if (endpoint === 'classify') {
    return { tenHang: ca.cauKhach };
  }
  return { description: ca.cauKhach };
}

/** Rút danh sách mã 8 số theo thứ tự từ phản hồi /api/suggest hoặc /api/classify. */
export function rutMaTuPhanHoi(body) {
  const ds = Array.isArray(body?.results)
    ? body.results
    : Array.isArray(body?.suggestions)
    ? body.suggestions
    : Array.isArray(body?.candidates)
    ? body.candidates
    : [];
  return ds
    .map((s) => chiSo(s?.hs ?? s?.hsCode ?? s?.code ?? s?.ma ?? ''))
    .filter((m) => m.length === 8);
}

/**
 * Chấm 1 ca từ bản ghi đo (có `status`, `dsMa`, `loi`).
 * `khongRaMa`: status NO_CANDIDATES/NEEDS_EXPERT hoặc không có mã 8 số — ca này không tính đúng ở mọi mức.
 * `loi`: lỗi mạng / HTTP / hết giờ — không tính đúng, tách riêng khỏi "không ra mã".
 */
export function chamBanGhi(banGhi) {
  const dapAn = chiSo(banGhi.ma);
  const ds = (banGhi.dsMa || []).map(chiSo).filter((m) => m.length === 8);
  const loi = Boolean(banGhi.loi);
  const khongRaMa = !loi && (STATUS_KHONG_RA_MA.has(banGhi.status) || ds.length === 0);
  const coMa = !loi && !khongRaMa;
  const maDau = coMa ? ds[0] : null;
  return {
    stt: banGhi.stt,
    ma: dapAn,
    maDau,
    status: banGhi.status || null,
    loi,
    khongRaMa,
    needFacts: banGhi.status === 'NEED_FACTS',
    top1: coMa && maDau === dapAn,
    top3: coMa && ds.slice(0, 3).includes(dapAn),
    dung6: coMa && maDau.slice(0, 6) === dapAn.slice(0, 6),
    dung4: coMa && maDau.slice(0, 4) === dapAn.slice(0, 4),
    roiVaoMaLan: coMa && maDau !== dapAn && (banGhi.maLan || []).includes(maDau) ? maDau : null,
    // Chỉ để tham khảo: NEEDS_EXPERT vẫn có danh sách tìm kiếm — mã đầu có trùng đáp án không.
    khongRaMaNhungMaDauTrung: khongRaMa && ds[0] === dapAn,
  };
}

function phanVi(mangSo, p) {
  const s = [...mangSo].sort((a, b) => a - b);
  if (!s.length) return null;
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i];
}

/** Tổng hợp các bản ghi đo → bảng chỉ số theo khuôn thẻ OZV-1233. */
export function tongHop(banGhis) {
  const cham = banGhis.map(chamBanGhi);
  const dem = (k) => cham.filter((c) => c[k]).length;
  const giayOk = banGhis.filter((b) => !b.loi && Number.isFinite(b.giay)).map((b) => b.giay);
  const giayAll = banGhis.filter((b) => Number.isFinite(b.giay)).map((b) => b.giay);
  const demStatus = {};
  for (const b of banGhis) {
    const k = b.loi ? `LOI:${b.loi}` : b.status || '(không có status)';
    demStatus[k] = (demStatus[k] || 0) + 1;
  }
  return {
    tong: cham.length,
    top1: dem('top1'),
    top3: dem('top3'),
    dung6: dem('dung6'),
    dung4: dem('dung4'),
    khongRaMa: dem('khongRaMa'),
    needFacts: dem('needFacts'),
    loi: dem('loi'),
    roiVaoMaLan: dem('roiVaoMaLan'),
    khongRaMaNhungMaDauTrung: dem('khongRaMaNhungMaDauTrung'),
    giayTrungVi: phanVi(giayOk, 50),
    giayP95: phanVi(giayOk, 95),
    giayTrungViKeCaLoi: phanVi(giayAll, 50),
    demStatus,
    cham,
  };
}

/** In báo cáo markdown từ danh sách bản ghi. */
export function inBaoCaoMd(banGhis, { nguon = '', chuanCong1211 = null } = {}) {
  const t = tongHop(banGhis);
  const n = t.tong;
  const dong = (ten, so) => `| ${ten} | ${so}/${n} | ${pct(so, n)}% |`;
  const out = [];
  out.push(`# Đo A1/A2 bộ 50 ca TB-TCHQ qua bản thật /api/suggest`);
  out.push('');
  if (nguon) out.push(`Nguồn số liệu: \`${nguon}\``);
  const ngay = banGhis.map((b) => b.batDau).filter(Boolean).sort();
  if (ngay.length) out.push(`Thời gian chạy: ${ngay[0]} → ${ngay[ngay.length - 1]} (UTC)`);
  out.push('');
  out.push('| Chỉ số | Số ca | Tỉ lệ |');
  out.push('| --- | --- | --- |');
  out.push(dong('Top-1 đúng 8 số (A1)', t.top1));
  out.push(dong('Top-3 đúng 8 số (A2)', t.top3));
  out.push(dong('Top-1 đúng 6 số (gồm cả đúng 8)', t.dung6));
  out.push(dong('Top-1 đúng 4 số (gồm cả đúng 6/8)', t.dung4));
  out.push(dong('Không ra mã (NO_CANDIDATES / NEEDS_EXPERT / không có mã 8 số)', t.khongRaMa));
  out.push(dong('Status NEED_FACTS (vẫn chấm theo gợi ý trả về)', t.needFacts));
  out.push(dong('Lỗi / hết giờ', t.loi));
  out.push(dong('Mã đầu rơi vào mã dễ nhầm (maLan)', t.roiVaoMaLan));
  out.push('');
  out.push(
    `Thời gian (ca không lỗi): trung vị ${t.giayTrungVi ?? '—'} s · p95 ${t.giayP95 ?? '—'} s` +
      ` · trung vị kể cả lỗi ${t.giayTrungViKeCaLoi ?? '—'} s`,
  );
  out.push('');
  if (chuanCong1211) {
    out.push(
      `Mốc Cổng 12/11: top-1 ${chuanCong1211.top1}/${chuanCong1211.tong} · top-3 ${chuanCong1211.top3}/${chuanCong1211.tong}` +
        ` · không ra mã ${chuanCong1211.khongRaMa}/${chuanCong1211.tong}.`,
    );
    out.push('');
  }
  if (t.khongRaMaNhungMaDauTrung) {
    out.push(
      `Tham khảo: ${t.khongRaMaNhungMaDauTrung} ca "không ra mã" mà danh sách tìm kiếm có mã đầu trùng đáp án (không tính vào A1).`,
    );
    out.push('');
  }
  out.push('Đếm theo status: ' + Object.entries(t.demStatus).map(([k, v]) => `${k}=${v}`).join(' · '));
  out.push('');
  out.push('## Ca trượt top-1');
  out.push('');
  out.push('| STT | Mã đúng | Mã trả (top-3) | Status | Ghi chú |');
  out.push('| --- | --- | --- | --- | --- |');
  const theoStt = new Map(banGhis.map((b) => [b.stt, b]));
  for (const c of t.cham.filter((x) => !x.top1).sort((a, b) => a.stt - b.stt)) {
    const b = theoStt.get(c.stt) || {};
    const ghiChu = [
      c.loi ? `lỗi: ${b.loi}` : '',
      c.khongRaMa ? 'không ra mã' : '',
      c.top3 ? 'đúng trong top-3' : '',
      !c.top3 && c.dung6 ? 'đúng 6 số' : '',
      !c.dung6 && c.dung4 ? 'đúng 4 số' : '',
      c.roiVaoMaLan ? `rơi mã dễ nhầm ${c.roiVaoMaLan}` : '',
      b.degraded ? 'degraded' : '',
    ]
      .filter(Boolean)
      .join('; ');
    out.push(`| ${c.stt} | ${c.ma} | ${(b.dsMa || []).slice(0, 3).join(', ') || '—'} | ${c.status || '—'} | ${ghiChu} |`);
  }
  out.push('');
  out.push('Tham khảo nghiệp vụ — không phải phán quyết phân loại của cơ quan Hải quan.');
  return out.join('\n') + '\n';
}

/** Gọi /api/suggest hoặc /api/classify cho 1 ca, có hết giờ + thử lại tối đa 1 lần khi lỗi mạng. */
export async function goiMotCa(ca, { url = URL_MAC_DINH, endpoint = 'suggest', timeoutMs = TIMEOUT_TOI_DA_MS, fetchFn = fetch } = {}) {
  const batDau = new Date().toISOString();
  const t0 = Date.now();
  let thuLai = 0;
  let loi = null;
  let httpStatus = null;
  let body = null;
  const path = endpoint === 'classify' ? '/api/classify' : '/api/suggest';
  for (let lan = 0; lan < 2; lan += 1) {
    const ac = new AbortController();
    const hen = setTimeout(() => ac.abort(), timeoutMs);
    loi = null;
    try {
      const res = await fetchFn(`${url.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'oz-do-a1-ban-that/1 (OZV-1233)' },
        body: JSON.stringify(dungThanGoi(ca, endpoint)),
        signal: ac.signal,
      });
      httpStatus = res.status;
      const text = await res.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      if (!res.ok) loi = `HTTP_${res.status}`;
      else if (!body) loi = 'JSON_HONG';
      if (loi && HTTP_THU_LAI.has(res.status) && lan === 0) {
        thuLai += 1;
        continue;
      }
    } catch (e) {
      if (ac.signal.aborted) {
        loi = 'TIMEOUT';
      } else {
        loi = `MANG:${e?.cause?.code || e?.name || 'loi'}`;
        if (lan === 0) {
          thuLai += 1;
          continue;
        }
      }
    } finally {
      clearTimeout(hen);
    }
    break;
  }
  return {
    stt: ca.stt,
    ma: ca.ma,
    maLan: ca.maLan,
    soHieu: ca.soHieu,
    batDau,
    giay: Math.round((Date.now() - t0) / 100) / 10,
    httpStatus,
    loi,
    thuLai,
    status: body?.status ?? body?.trangThai ?? null,
    engine: body?.engine ?? null,
    degraded: body?.degraded ?? null,
    dsMa: rutMaTuPhanHoi(body).slice(0, 5),
    nextActionType: body?.nextAction?.type ?? null,
    missingFacts: (body?.missingFacts || body?.missing || []).map((m) => (typeof m === 'string' ? m : m?.attribute)).filter(Boolean),
  };
}

/** Chạy hàng đợi với tối đa `dongThoi` lượt cùng lúc; gọi `moiCa` ngay khi mỗi ca xong. */
export async function chayHangDoi(cases, { dongThoi = DONG_THOI_TOI_DA, goi, moiCa = () => {} }) {
  const ketQua = [];
  let i = 0;
  const tho = async () => {
    while (i < cases.length) {
      const ca = cases[i];
      i += 1;
      const r = await goi(ca);
      ketQua.push(r);
      moiCa(r);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(dongThoi, DONG_THOI_TOI_DA)) }, tho));
  return ketQua.sort((a, b) => a.stt - b.stt);
}

function docThamSo(argv) {
  const o = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) o[m[1]] = m[2] ?? true;
  }
  return o;
}

function docJsonl(duong) {
  return readFileSync(duong, 'utf8')
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => JSON.parse(d));
}

async function tuKiem() {
  let xanh = 0;
  let do_ = 0;
  const ca = (ten, dk) => {
    if (dk) xanh += 1;
    else do_ += 1;
    console.log(`${dk ? 'PASS' : 'FAIL'} ${ten}`);
  };

  const bo = docBo50Ca();
  ca('bộ đề đủ 50 ca, stt 1..50', bo.cases.length === 50 && bo.cases.every((c, i) => c.stt === i + 1));
  const than = dungThanGoi(bo.cases[0]);
  ca('thân gọi chỉ có description', Object.keys(than).join() === 'description');
  ca('thân gọi không lộ mã đáp án', !JSON.stringify(than).includes(bo.cases[0].ma));
  const thanClassify = dungThanGoi(bo.cases[0], 'classify');
  ca('thân gọi classify có tenHang', Object.keys(thanClassify).join() === 'tenHang' && thanClassify.tenHang === bo.cases[0].cauKhach);

  ca(
    'rút mã từ suggestions, bỏ mã không đủ 8 số',
    rutMaTuPhanHoi({ suggestions: [{ hsCode: '1208.10.00' }, { hsCode: '1208' }, { hsCode: '23040090' }] }).join() ===
      '12081000,23040090',
  );

  const g = { stt: 1, ma: '12081000', maLan: ['23040090'] };
  const c1 = chamBanGhi({ ...g, status: 'REVIEW', dsMa: ['12081000', '23040090'] });
  ca('đúng top-1 ⇒ top1/top3/6/4 đều đúng', c1.top1 && c1.top3 && c1.dung6 && c1.dung4);
  const c2 = chamBanGhi({ ...g, status: 'REVIEW', dsMa: ['23040090', '12089000', '12081000'] });
  ca('đúng ở vị trí 3 ⇒ top3 mà không top1, rơi maLan', !c2.top1 && c2.top3 && c2.roiVaoMaLan === '23040090');
  const c3 = chamBanGhi({ ...g, status: 'REVIEW', dsMa: ['12089000'] });
  ca('đúng 4 số, sai 6 số', !c3.top1 && !c3.dung6 && c3.dung4);
  const c4 = chamBanGhi({ ...g, status: 'NEEDS_EXPERT', dsMa: ['12081000'] });
  ca('NEEDS_EXPERT ⇒ không ra mã, không tính đúng dù mã đầu trùng', c4.khongRaMa && !c4.top1 && c4.khongRaMaNhungMaDauTrung);
  const c5 = chamBanGhi({ ...g, status: 'REVIEW', dsMa: [] });
  ca('REVIEW mà không có mã 8 số ⇒ không ra mã', c5.khongRaMa && !c5.top3);
  const c6 = chamBanGhi({ ...g, status: null, dsMa: [], loi: 'TIMEOUT' });
  ca('hết giờ ⇒ lỗi, không đếm vào không ra mã', c6.loi && !c6.khongRaMa);
  const c7 = chamBanGhi({ ...g, status: 'NEED_FACTS', dsMa: ['12081000'] });
  ca('NEED_FACTS vẫn chấm theo gợi ý trả về', c7.needFacts && c7.top1);

  const th = tongHop([
    { ...g, status: 'REVIEW', dsMa: ['12081000'], giay: 10 },
    { ...g, stt: 2, status: 'REVIEW', dsMa: ['23040090', '12081000'], giay: 20 },
    { ...g, stt: 3, status: 'NO_CANDIDATES', dsMa: [], giay: 30 },
    { ...g, stt: 4, loi: 'TIMEOUT', dsMa: [], giay: 180 },
  ]);
  ca(
    'tổng hợp đếm đúng top1/top3/không ra mã/lỗi',
    th.tong === 4 && th.top1 === 1 && th.top3 === 2 && th.khongRaMa === 1 && th.loi === 1,
  );
  ca('trung vị/p95 chỉ tính ca không lỗi', th.giayTrungVi === 20 && th.giayP95 === 30);
  const md = inBaoCaoMd([{ ...g, status: 'REVIEW', dsMa: ['23040090'], giay: 5 }]);
  ca('báo cáo có bảng và dòng ca trượt', md.includes('Top-1 đúng 8 số (A1) | 0/1') && md.includes('| 1 | 12081000 | 23040090 |'));

  // Gọi API giả: lỗi mạng lần đầu ⇒ thử lại đúng 1 lần; hết giờ ⇒ không thử lại.
  let soLanGoi = 0;
  const fetchMangLoi = async () => {
    soLanGoi += 1;
    if (soLanGoi === 1) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } });
    return new Response(JSON.stringify({ status: 'REVIEW', suggestions: [{ hsCode: '12081000' }] }), { status: 200 });
  };
  const r1 = await goiMotCa(bo.cases[0], { fetchFn: fetchMangLoi, timeoutMs: 1000 });
  ca('lỗi mạng ⇒ thử lại 1 lần rồi thành công', soLanGoi === 2 && r1.thuLai === 1 && !r1.loi && r1.dsMa[0] === '12081000');

  let soLanTreo = 0;
  const fetchTreo = (_u, { signal }) =>
    new Promise((_res, rej) => {
      soLanTreo += 1;
      signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
    });
  const r2 = await goiMotCa(bo.cases[0], { fetchFn: fetchTreo, timeoutMs: 50 });
  ca('hết giờ ⇒ ghi TIMEOUT, không thử lại', r2.loi === 'TIMEOUT' && soLanTreo === 1 && r2.thuLai === 0);

  let soLan503 = 0;
  const fetch503 = async () => {
    soLan503 += 1;
    return new Response('busy', { status: 503 });
  };
  const r3 = await goiMotCa(bo.cases[0], { fetchFn: fetch503, timeoutMs: 1000 });
  ca('HTTP 503 hai lần ⇒ dừng sau 1 lần thử lại', soLan503 === 2 && r3.loi === 'HTTP_503');

  let dangChay = 0;
  let dinh = 0;
  await chayHangDoi(
    Array.from({ length: 10 }, (_, k) => ({ stt: k + 1 })),
    {
      dongThoi: 9,
      goi: async (c) => {
        dangChay += 1;
        dinh = Math.max(dinh, dangChay);
        await new Promise((r) => setTimeout(r, 5));
        dangChay -= 1;
        return { stt: c.stt };
      },
    },
  );
  ca('hàng đợi không vượt 3 lượt đồng thời dù xin 9', dinh === 3);

  console.log(`\n${xanh} passed | ${do_} failed`);
  return do_ === 0;
}

async function main() {
  const ts = docThamSo(process.argv.slice(2));
  if (ts['self-test']) {
    process.exit((await tuKiem()) ? 0 : 1);
  }
  const bo = docBo50Ca();
  if (ts['bao-cao']) {
    process.stdout.write(inBaoCaoMd(docJsonl(ts['bao-cao']), { nguon: ts['bao-cao'], chuanCong1211: bo.chuanCong1211 }));
    return;
  }
  let cases = bo.cases;
  if (typeof ts.stt === 'string') {
    const chon = new Set(ts.stt.split(',').map(Number));
    cases = cases.filter((c) => chon.has(c.stt));
  }
  if (ts.limit) cases = cases.slice(0, Number(ts.limit));
  const url = typeof ts.url === 'string' ? ts.url : URL_MAC_DINH;
  const endpoint = typeof ts.endpoint === 'string' ? ts.endpoint : 'suggest';
  const timeoutMs = Math.min(Number(ts['timeout-ms']) || TIMEOUT_TOI_DA_MS, TIMEOUT_TOI_DA_MS);
  const dongThoi = Math.min(Number(ts.concurrency) || DONG_THOI_TOI_DA, DONG_THOI_TOI_DA);
  console.error(`[do-a1] ${cases.length} ca · ${url} (${endpoint}) · đồng thời ${dongThoi} · timeout ${timeoutMs} ms`);
  let xong = 0;
  const ketQua = await chayHangDoi(cases, {
    dongThoi,
    goi: (ca) => goiMotCa(ca, { url, endpoint, timeoutMs }),
    moiCa: (r) => {
      xong += 1;
      process.stdout.write(JSON.stringify(r) + '\n');
      console.error(`[do-a1] ${xong}/${cases.length} stt=${r.stt} ${r.loi || r.status} ${r.dsMa[0] || '-'} ${r.giay}s`);
    },
  });
  const t = tongHop(ketQua);
  console.error(
    `[do-a1] XONG top1=${t.top1}/${t.tong} top3=${t.top3}/${t.tong} khongRaMa=${t.khongRaMa} loi=${t.loi}` +
      ` trungVi=${t.giayTrungVi}s p95=${t.giayP95}s`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
