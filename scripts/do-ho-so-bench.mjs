#!/usr/bin/env node
/**
 * ĐO OFFLINE ĐƯỜNG HỒ SƠ MỚI trên BỘ ĐỀ CÔNG KHAI #543 (plan L1-5f; spec hồ sơ §10).
 *
 *   node scripts/do-ho-so-bench.mjs [--json] [--bo-de=data/bench/mo-ta-bo-de.json] [--n=<số ca>]
 *
 * Chạy TRỌN động cơ hồ sơ (lib/ho-so/api.js#chayHoSo: đường đi → đọc dữ kiện → đối chiếu → viết) với bộ viết `cheDo: 'MAY'`,
 * KHÔNG MẠNG: LLM bị thay bằng hàm ném lỗi OFFLINE (bước đọc dữ kiện rơi về luật), `fetch` bị chặn, nguồn ngoài (danh mục rủi
 * ro, tiền lệ mã khác, kho Oz, tham chiếu) tiêm rỗng, nghiên cứu web tắt. Không đọc tệp riêng tư, không ghi tệp nào.
 *
 * Bộ đề: chỉ bộ đề CÔNG KHAI #543 (`data/bench/mo-ta-bo-de.json`, 38 ca, CLAUDE_DUYET). Script TỪ CHỐI tệp
 * `data/bench/ho-so-lat-1*` (bộ đề lát 1 khoá băm — chỉ mở ở bước đo có GĐ chỉ định).
 *
 * Chỉ số tính được offline (spec §10):
 *   - Dữ kiện quyết định có mặt trong moTaEcus ∪ khaiTiepHys (tuKhoa của bộ đề; bỏ dữ kiện khongDuCanCu). Bản nháp không có
 *     moTaEcus ⇒ mọi dữ kiện của ca đó tính là KHÔNG có (đúng định nghĩa §10). In thêm số đo trên "chuỗi cuối" (kể cả bản nháp)
 *     để thấy phần mất do chặn bản nháp.
 *   - Chữ cấm (chữ biểu thuế) + "xuất xứ" trong chuỗi cuối; giá trị truy được nguồn (truyNguon); trích dẫn sai (trichDanSai).
 *   - Ca đổi sang dòng anh em (caCaiLoi.doiAnhEm): bắt = ketLuan MAU_THUAN mà ca chuẩn không; chỉ đúng mã = maTroToi đúng đích.
 *   - Ca bỏ dữ kiện (caCaiLoi.boDuKien): bắt = ketLuan THIEU_DU_KIEN mà ca chuẩn không; chỉ đúng = có dữ kiện CHƯA BIẾT / câu hỏi
 *     mới so với ca chuẩn.
 *   - Dựng hồ sơ tất định p50/p95 (máy, không LLM).
 * Mỗi chỉ số in theo ba lát: ÁP DỤNG (mã hoSoApDung — đường mới thật sự bật khi on), LÁT 1 (mã thuộc 50 phân nhóm), TẤT CẢ 38 ca.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ROOT, khopTuKhoa, docBoDe, CHU_CAM, truyNguon, trichDanSai } from './mo-ta-bench-lib.mjs';

const require = createRequire(import.meta.url);

/** Số "trước" đã ghi (đường cũ, mock): bộ đề lát 1 (L1-2b, docs/bench/lat-1-truoc-2026-10-30.md) và #543 (Đợt 0C). */
export const SO_TRUOC = {
  lat1: { duKien: 0.50, chuCam: 0.43, doiAnhEm: 0.16, boDuKien: 0.18, nguon: 'docs/bench/lat-1-truoc-2026-10-30.md — (a)+(c) bộ đề lát 1, đường cũ, LLM mock' },
  bd543: { duKien: 0.43, chuCam: 0.39, doiAnhEm: 0.14, boDuKien: 0.07, nguon: 'docs/bench/mo-ta-baseline-2026-10-29.md — 38 ca #543, đường cũ, LLM mock' },
};
export const NGUONG = { duKien: '≥ 95 %', chuCam: '0 %', xuatXu: '0 %', truyNguon: '100 %', trichSai: '0', doiAnhEm: '≥ 90 %', boDuKien: '≥ 80 %', tatDinh: '< 1 s' };

/** Từ chối bộ đề lát 1 khoá băm. */
export function kiemTepBoDe(p) {
  if (/ho-so-lat-1/i.test(path.basename(String(p || '')))) throw new Error('Không mở bộ đề lát 1 khoá băm (data/bench/ho-so-lat-1*) ở bench offline — dùng bộ đề công khai #543.');
  return p;
}

/** Thân /api/describe từ một ca bộ đề (cùng cách bench-mo-ta.mjs#bodyTuBoDe). */
export function bodyTuCa(c) {
  const t = c.thongTinHang || {};
  return {
    hsCode: c.maHs, productName: t.tenHang, material: t.chatLieu || undefined, purpose: t.congDung || undefined,
    brand: t.nhanHieu || undefined, model: t.model || undefined, technicalSpec: (t.thongSo || []).join('; ') || undefined,
    condition: t.tinhTrang || undefined,
  };
}

/** Ca bỏ dữ kiện: bỏ mọi đoạn (ngăn bởi dấu phẩy) khớp một biểu thức của dữ kiện; null khi câu không mất được dữ kiện. */
export function boDuKienKhoiMoTa(moTa, dk) {
  const segs = String(moTa || '').split(/,\s*/);
  const giu = segs.filter((sg) => !(dk.tuKhoa || []).some((re) => khopTuKhoa(sg, [re])));
  const moi = giu.join(', ');
  return giu.length && giu.length < segs.length && !khopTuKhoa(moi, dk.tuKhoa) ? moi : null;
}

/** Chuỗi để chấm: bản đạt = moTaEcus ∪ khaiTiepHys; bản nháp ⇒ '' (đạt) và moTaBanNhap (chuỗi cuối). */
export function chuoiCham(viet) {
  const v = viet || {};
  const dat = v.banNhap ? '' : [v.moTaEcus, v.khaiTiepHys].filter(Boolean).join(', ');
  const cuoi = v.banNhap ? String(v.moTaBanNhap || '') : dat;
  return { dat, cuoi };
}

/** Dữ kiện quyết định của ca (bỏ khongDuCanCu) có mặt trong chuỗi: [{cap, co}]. */
export function chamDuKien(ca, text) {
  return (ca.duKienQuyetDinh || []).filter((d) => !d.khongDuCanCu).map((d) => ({ cap: d.cap, co: khopTuKhoa(text, d.tuKhoa) }));
}

const factMo = (h) => new Set([
  ...((h && h.duKien) || []).filter((d) => d && d.trangThai === 'CHUA_BIET').map((d) => d.fact),
  ...(((h && h.ketLuan && h.ketLuan.cauHoi) || []).map((q) => q && (q.fact || q.loai)).filter(Boolean)),
]);
/** Ca bỏ dữ kiện có làm xuất hiện dữ kiện chưa biết / câu hỏi MỚI so với ca chuẩn không. */
export function coDuKienMoiThieu(hChuan, hLoi) {
  const a = factMo(hChuan);
  return [...factMo(hLoi)].some((f) => !a.has(f));
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} % (${a}/${b})` : '— (0 ca)');
const ti = (a, b) => (b ? a / b : null);
const phanVi = (xs, p) => { const a = xs.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.max(0, Math.ceil(p * a.length) - 1)] : null; };

/** Chuẩn bị môi trường offline + nạp động cơ. Trả { API, H, demLlm }. */
export function chuanBiOffline() {
  process.env.HS_HO_SO = 'on';
  process.env.HS_HO_SO_VIET = 'MAY';
  process.env.HS_HO_SO_NGHIEN_CUU = 'false';
  delete process.env.HS_HO_SO_THU_CALLERS;
  const dem = { llm: 0, fetch: 0 };
  const llmTier = require('../lib/llm-tier');
  llmTier.callLLMJson = async () => { dem.llm += 1; const e = new Error('OFFLINE'); e.code = 'OFFLINE'; throw e; };
  globalThis.fetch = async () => { dem.fetch += 1; throw new Error('OFFLINE: bench không gọi mạng'); };
  const API = require('../lib/ho-so/api');
  API._datDeps({
    identify: async () => null, webFacts: async () => null, thamChieu: async () => ({ oz: [], tbTchq: [] }),
    tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }),
  });
  return { API, H: require('../lib/ho-so/index'), dem };
}

async function dung(API, dv) {
  const t0 = Date.now();
  try { const k = await API.chayHoSo(dv, {}); return { ...k, ms: Date.now() - t0 }; } catch (e) { return { loi: String(e.code || e.message || e).slice(0, 60), ms: Date.now() - t0 }; }
}
const dvMoTa = (API, maHs, moTa) => API.chuanDauVao({ maHs, moTa }, 'em').data;
/** Đầu vào động cơ từ các trường tách rời của ca (như /api/describe — lib/ho-so/api.js#dauVaoDescribe; xuất xứ không vào). */
export function dvTuCa(API, c) {
  const b = bodyTuCa(c);
  return API.chuanDauVao({
    maHs: b.hsCode, tenHang: b.productName,
    thongSo: [b.technicalSpec, b.material ? `chất liệu: ${b.material}` : null, b.purpose ? `công dụng: ${b.purpose}` : null].filter(Boolean),
    condition: b.condition, brand: b.brand, model: b.model,
  }, 'em').data;
}

/** Chạy bench; trả kết quả số (không câu chữ). */
export async function chayBench({ boDe = path.join(ROOT, 'data', 'bench', 'mo-ta-bo-de.json'), n = Infinity } = {}) {
  kiemTepBoDe(boDe);
  const { API, H, dem } = chuanBiOffline();
  const bd = docBoDe(boDe);
  const ca = (bd.ca || []).slice(0, n);
  const dong = [];
  for (const c of ca) {
    const lat = H.laMaLat1(c.maHs) ? (H.hoSoApDung(c.maHs) ? 'apDung' : 'lat1') : 'ngoai';
    const s = await dung(API, dvTuCa(API, c));
    const r = { id: c.id, maHs: c.maHs, lat, loi: s.loi || null, ms: s.ms };
    if (!s.loi) {
      const { dat, cuoi } = chuoiCham(s.viet);
      r.trangThai = s.hoSo.ketLuan && s.hoSo.ketLuan.trangThai;
      r.banNhap = s.viet.banNhap === true;
      r.duKienDat = chamDuKien(c, dat);
      r.duKienCuoi = chamDuKien(c, cuoi);
      r.chuCam = CHU_CAM.filter((x) => x.re.test(cuoi)).map((x) => x.ma);
      r.xuatXu = /xuất xứ/i.test(cuoi);
      r.truyNguon = r.banNhap ? null : truyNguon(dat, s.hoSo);
      r.trichSai = trichDanSai({ hoSo: s.hoSo });
      r.tuongDuong = Boolean(s.meta && s.meta.tuongDuong);
    }
    // soát: ca chuẩn (moTaMau) + ca cài lỗi — chỉ mô tả + mã, như một dòng tờ khai
    const chuan = await dung(API, dvMoTa(API, c.maHs, c.moTaMau));
    r.chuanTrangThai = chuan.loi ? null : chuan.hoSo.ketLuan.trangThai;
    r.boDuKien = [];
    for (const i of (c.caCaiLoi && c.caCaiLoi.boDuKien) || []) {
      const dk = c.duKienQuyetDinh[i];
      const moTa = dk ? boDuKienKhoiMoTa(c.moTaMau, dk) : null;
      if (!moTa) continue;
      const l = await dung(API, dvMoTa(API, c.maHs, moTa));
      const tt = l.loi ? null : l.hoSo.ketLuan.trangThai;
      r.boDuKien.push({ bat: tt === 'THIEU_DU_KIEN' && r.chuanTrangThai !== 'THIEU_DU_KIEN', chiDung: !l.loi && !chuan.loi && coDuKienMoiThieu(chuan.hoSo, l.hoSo), trangThai: tt });
    }
    const x = c.caCaiLoi && c.caCaiLoi.doiAnhEm;
    if (x && c.moTaMau.includes(x.tu)) {
      const l = await dung(API, dvMoTa(API, c.maHs, c.moTaMau.replace(x.tu, x.sang)));
      const kl = l.loi ? {} : l.hoSo.ketLuan || {};
      r.doiAnhEm = { bat: kl.trangThai === 'MAU_THUAN' && r.chuanTrangThai !== 'MAU_THUAN', chiDungMa: String(kl.maTroToi || '').replace(/\D/g, '') === String(x.maTroToi || '').replace(/\D/g, ''), trangThai: kl.trangThai || null };
    }
    dong.push(r);
  }

  const lat = { apDung: (r) => r.lat === 'apDung', lat1: (r) => r.lat !== 'ngoai', tatCa: () => true };
  const tong = {};
  for (const [ten, f] of Object.entries(lat)) {
    const rs = dong.filter(f); const ok = rs.filter((r) => !r.loi);
    const dkD = ok.flatMap((r) => r.duKienDat); const dkC = ok.flatMap((r) => r.duKienCuoi);
    const tn = ok.filter((r) => r.truyNguon && r.truyNguon.apDung).reduce((a, r) => [a[0] + r.truyNguon.co, a[1] + r.truyNguon.tong], [0, 0]);
    const ts = ok.reduce((a, r) => [a[0] + r.trichSai.sai, a[1] + r.trichSai.tong], [0, 0]);
    const bdk = rs.flatMap((r) => r.boDuKien); const dae = rs.map((r) => r.doiAnhEm).filter(Boolean);
    const trangThai = {}; for (const r of ok) trangThai[r.trangThai] = (trangThai[r.trangThai] || 0) + 1;
    tong[ten] = {
      soCa: rs.length, loi: rs.length - ok.length, trangThai,
      banNhap: { so: ok.filter((r) => r.banNhap).length, n: ok.length },
      duKien: { co: dkD.filter((d) => d.co).length, n: dkD.length },
      duKienChuoiCuoi: { co: dkC.filter((d) => d.co).length, n: dkC.length },
      chuCam: { so: ok.filter((r) => r.chuCam.length).length, n: ok.length },
      xuatXu: { so: ok.filter((r) => r.xuatXu).length, n: ok.length },
      truyNguon: { co: tn[0], n: tn[1] },
      trichSai: { sai: ts[0], n: ts[1] },
      tuongDuong: { dat: ok.filter((r) => !r.banNhap && r.tuongDuong).length, n: ok.filter((r) => !r.banNhap).length },
      doiAnhEm: { bat: dae.filter((d) => d.bat).length, chiDungMa: dae.filter((d) => d.bat && d.chiDungMa).length, n: dae.length },
      boDuKien: { bat: bdk.filter((d) => d.bat).length, chiDung: bdk.filter((d) => d.chiDung).length, n: bdk.length },
      tatDinhMs: { p50: phanVi(ok.map((r) => r.ms), 0.5), p95: phanVi(ok.map((r) => r.ms), 0.95) },
    };
  }
  return {
    boDe: path.relative(ROOT, boDe), soCa: dong.length, cheDoViet: 'MAY', mang: { lanGoiLlmBiChan: dem.llm, lanGoiFetch: dem.fetch },
    theoCa: dong.map((r) => ({ id: r.id, maHs: r.maHs, lat: r.lat, trangThai: r.trangThai || null, banNhap: r.banNhap ?? null, chuanTrangThai: r.chuanTrangThai, doiAnhEm: r.doiAnhEm ? r.doiAnhEm.trangThai : null, boDuKien: r.boDuKien.map((b) => b.trangThai) })),
    tong, soTruoc: SO_TRUOC, nguong: NGUONG,
  };
}

function inBang(kq) {
  const T = kq.tong;
  const cot = ['Chỉ số §10', `ÁP DỤNG (${T.apDung.soCa} ca)`, `LÁT 1 (${T.lat1.soCa} ca)`, `TẤT CẢ (${T.tatCa.soCa} ca)`, 'Trước — lát 1', 'Trước — #543', 'Ngưỡng'];
  const v = (f) => ['apDung', 'lat1', 'tatCa'].map((k) => f(T[k]));
  const p = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
  const hang = [
    ['Dữ kiện quyết định trong moTaEcus ∪ khaiTiepHys', ...v((t) => pct(t.duKien.co, t.duKien.n)), p(SO_TRUOC.lat1.duKien), p(SO_TRUOC.bd543.duKien), NGUONG.duKien],
    ['  (tham khảo) … trong chuỗi cuối kể cả bản nháp', ...v((t) => pct(t.duKienChuoiCuoi.co, t.duKienChuoiCuoi.n)), '—', '—', '—'],
    ['Chữ cấm (chữ biểu thuế) trong chuỗi cuối', ...v((t) => pct(t.chuCam.so, t.chuCam.n)), p(SO_TRUOC.lat1.chuCam), p(SO_TRUOC.bd543.chuCam), NGUONG.chuCam],
    ['"xuất xứ" trong chuỗi cuối', ...v((t) => pct(t.xuatXu.so, t.xuatXu.n)), '0 %', '0 %', NGUONG.xuatXu],
    ['Giá trị truy được nguồn (bản đạt)', ...v((t) => pct(t.truyNguon.co, t.truyNguon.n)), '—', '—', NGUONG.truyNguon],
    ['Trích dẫn sai (GIR, điều luật) trong hồ sơ', ...v((t) => `${t.trichSai.sai}/${t.trichSai.n}`), '0/0', '—', NGUONG.trichSai],
    ['Soát bắt MÂU THUẪN (đổi sang dòng anh em)', ...v((t) => pct(t.doiAnhEm.bat, t.doiAnhEm.n)), p(SO_TRUOC.lat1.doiAnhEm), p(SO_TRUOC.bd543.doiAnhEm), NGUONG.doiAnhEm],
    ['  … và chỉ đúng mã anh em (maTroToi)', ...v((t) => pct(t.doiAnhEm.chiDungMa, t.doiAnhEm.n)), '—', '—', '—'],
    ['Soát bắt THIẾU (bỏ dữ kiện) — ketLuan THIEU_DU_KIEN', ...v((t) => pct(t.boDuKien.bat, t.boDuKien.n)), p(SO_TRUOC.lat1.boDuKien), p(SO_TRUOC.bd543.boDuKien), NGUONG.boDuKien],
    ['  … có dữ kiện chưa biết / câu hỏi mới', ...v((t) => pct(t.boDuKien.chiDung, t.boDuKien.n)), '—', '—', '—'],
    ['Bản nháp (banNhap)', ...v((t) => pct(t.banNhap.so, t.banNhap.n)), '—', '—', '—'],
    ['Tương đương (bản đạt)', ...v((t) => pct(t.tuongDuong.dat, t.tuongDuong.n)), '—', '—', '100 %'],
    ['Dựng hồ sơ tất định p50 / p95', ...v((t) => `${t.tatDinhMs.p50 ?? '—'} / ${t.tatDinhMs.p95 ?? '—'} ms`), '—', '—', NGUONG.tatDinh],
  ];
  console.log(`BENCH OFFLINE HỒ SƠ — ${kq.boDe}, ${kq.soCa} ca, viết ${kq.cheDoViet}, LLM bị chặn ${kq.mang.lanGoiLlmBiChan} lần, fetch ${kq.mang.lanGoiFetch} lần`);
  console.log(`| ${cot.join(' | ')} |`);
  console.log(`|${cot.map(() => '---').join('|')}|`);
  for (const h of hang) console.log(`| ${h.join(' | ')} |`);
  console.log('\nTrạng thái kết luận (sinh):');
  for (const k of ['apDung', 'lat1', 'tatCa']) console.log(`  ${k}: ${JSON.stringify(T[k].trangThai)}`);
  console.log('\nTheo ca ÁP DỤNG / LÁT 1:');
  for (const r of kq.theoCa.filter((x) => x.lat !== 'ngoai')) console.log(`  ${r.id} ${r.maHs} [${r.lat}] sinh=${r.trangThai} nháp=${r.banNhap} chuẩn=${r.chuanTrangThai} đổiAnhEm=${r.doiAnhEm} bỏDữKiện=${JSON.stringify(r.boDuKien)}`);
  console.log(`\nSố "trước": lát 1 = ${SO_TRUOC.lat1.nguon}; #543 = ${SO_TRUOC.bd543.nguon}.`);
  console.log('Lưu ý: "Trước — lát 1" đo trên bộ đề lát 1 (110 ca), bench này đo trên bộ đề công khai #543 — so cùng cột #543 mới là cùng mẫu.');
}

const laMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (laMain) {
  const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
  const boDe = arg('bo-de') ? path.resolve(ROOT, arg('bo-de')) : undefined;
  const n = arg('n') ? Number(arg('n')) : Infinity;
  const t0 = Date.now();
  chayBench({ ...(boDe ? { boDe } : {}), n }).then((kq) => {
    if (process.argv.includes('--json')) console.log(JSON.stringify(kq, null, 2));
    else { inBang(kq); console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
    process.exit(0);
  }).catch((e) => { console.error(e.message || e); process.exit(1); });
}
