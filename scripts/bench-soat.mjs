#!/usr/bin/env node
/**
 * Đo đường SOÁT SẴN CÓ (lib/declaration-check.js K1–K7 — hàm sau soat_to_khai / kiem_ma_to_khai — và lib/ho-so/soat.js)
 * NGOẠI TUYẾN, có cấy lỗi: không LLM, không mạng, không ghi data/ thật. Đây là số nền của cái hệ thống đang có.
 *
 * Bộ đề có nhãn (198 ca): tests/fixtures/soat/ca-tong-hop.json (38) · data/bench/ho-so-lat-1.json (110) · tests/bo-50-ca-tb-tchq.json (50).
 * Mỗi ca chạy bản ĐÚNG (mã đúng + mô tả gốc) rồi các bản CẤY LỖI:
 *   DOI_LOAI_KHAC        đổi sang dòng "Loại khác" cùng cha (mã đúng là "Loại khác" ⇒ đổi sang một dòng có tên cùng cha)
 *   DOI_MA_DOI_UNG       đổi sang mã cạnh tranh chính bộ đề nêu (nhomCanhTranh / maLan), không có thì data/conflicts.json
 *   DOI_ANH_EM_THUE_THAP đổi sang một dòng cùng phân nhóm 6 số có MFN thấp hơn mã đúng
 *   CAT_MO_TA            giữ mã đúng, cắt mô tả còn 3 từ đầu
 *   BO_DU_KIEN           giữ mã đúng, bỏ dữ kiện quyết định (lát 1: đúng từ khoá bộ đề đánh dấu; hai bộ kia: bỏ một vế sau dấu phẩy)
 * Chọn ngẫu nhiên bằng hạt giống cố định theo (seed, id ca, loại lỗi) ⇒ chạy lại ra đúng bộ ca cấy.
 *
 * Mỗi dòng soát bằng `runDeclarationCheck({ kiemMa: true })` ở hai chế độ, để so TRƯỚC / SAU bản sửa K2 độc lập:
 *   truoc  HS_K2_DOC_LAP=off — K2 như cũ: gọi lại bộ phân loại cho MỌI dòng
 *   sau    HS_K2_DOC_LAP bật (mặc định) — K2 chấm bằng nguồn tất định trước, chỉ gọi bộ phân loại khi không nguồn nào kết luận
 * Bộ phân loại (lib/classify.js) bị thay bằng bản GIẢ không trả lời (ngoại tuyến): bộ đo chỉ ĐẾM số lượt K2 phải nhờ tới nó.
 * Vì vậy số "bắt" ở đây là phần hệ thống tự bắt được mà KHÔNG dựa vào việc bộ phân loại chấm lại bài của chính nó.
 * "Cảnh báo K2 mới" = bản cấy lỗi có ít nhất một mục K2 CANH_BAO/LOI (mã mục + mã cạnh tranh) mà bản đúng của chính ca đó không có.
 *
 *   node scripts/bench-soat.mjs                  # in bảng trước / sau
 *   node scripts/bench-soat.mjs --ghi            # + ghi data/bench/soat-nen.json (chỉ số tổng hợp, không có mô tả hàng)
 *   node scripts/bench-soat.mjs --chi-tiet=<tệp> # từng dòng (id, mã, mục K2) — không commit
 *   node scripts/bench-soat.mjs --nhanh --kiem   # chỉ ca đúng, chỉ chế độ sau (~1 phút); --kiem: thoát 1 nếu K2 độc lập báo oan
 *                                                # trên ca đúng > 15 %, có mục LOI oan, hoặc hai lượt không trùng nhau
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const k of ['HS_HO_SO', 'HS_HO_SO_THU_CALLERS', 'HS_K2_LOI', 'HS_SO_TAY', 'HS_SO_TAY_LOAI_TRU', 'HS_DATABASE_URL', 'HS_K2_DOC_LAP']) delete process.env[k];
process.env.HS_ACCESS_LOG = '0';
globalThis.fetch = async () => { throw new Error('bench-soat: không được gọi mạng'); };
const loiGoc = console.error; console.error = () => {}; console.warn = () => {};

// bộ phân loại GIẢ: không trả lời, chỉ đếm — mọi lối ra LLM khác bị chặn
let goiPhanLoai = 0; let goiLlm = 0;
const cls = require('../lib/classify.js');
cls.classify = async () => { goiPhanLoai += 1; throw new Error('bench-soat: bộ phân loại không chạy ngoại tuyến'); };
const llmTier = require('../lib/llm-tier.js');
for (const k of Object.keys(llmTier)) if (/^callLLM/.test(k) && typeof llmTier[k] === 'function') llmTier[k] = async () => { goiLlm += 1; throw new Error('bench-soat: không LLM'); };

const { runDeclarationCheck } = require('../lib/declaration-check.js');
const { taxData, conflictsData } = require('../lib/data.js');
const T = require('../lib/hs-tree.js');

const arg = (n, d) => { const a = process.argv.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a ? (a.includes('=') ? a.slice(n.length + 3) : true) : d; };
const SEED = Number(arg('seed', 20261120));
const GIOI_HAN = Number(arg('gioi-han', 0));
const NHANH = process.argv.includes('--nhanh');
const NGUONG_OAN_K2 = 15; // % ca đúng có cảnh báo K2 độc lập — cổng chống trượt, đặt trên số nền (xem docs/bench/soat-nen-2026-11-21.md)
const nz = (v) => String(v || '').replace(/\D/g, '');
const mfn = (m) => { const s = String(taxData[m]?.mfn ?? '').replace(/%/g, '').replace(',', '.').trim(); return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
const co = (m) => /^\d{8}$/.test(m) && Boolean(taxData[m]);
const pt = (a, b) => (b ? `${(100 * a / b).toFixed(1)}%` : '—');

// ── ngẫu nhiên có hạt giống ──────────────────────────────────────────────────────────────────────────────────────────────
function bam(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngCua(khoa) { let a = bam(`${SEED}|${khoa}`); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const chon = (ds, r) => (ds.length ? ds[Math.floor(r() * ds.length)] : null);

// ── nạp ba bộ đề về một dạng ─────────────────────────────────────────────────────────────────────────────────────────────
const doc = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const BO = [];
for (const c of doc('tests/fixtures/soat/ca-tong-hop.json').ca) BO.push({ bo: 'soat-38', id: String(c.id), ma: nz(c.maDung), moTa: c.moTa, doiUng: [], tuKhoaBo: null });
for (const c of doc('data/bench/ho-so-lat-1.json').ca) {
  const bo = (c.caCaiLoi?.boDuKien || []).map((i) => c.duKienQuyetDinh?.[i]).filter(Boolean).flatMap((d) => d.tuKhoa || []);
  BO.push({ bo: 'lat-1-110', id: String(c.id), ma: nz(c.maHs), moTa: c.moTaMau, doiUng: (c.nhomCanhTranh || []).map((x) => nz(x.ma)), tuKhoaBo: bo.length ? bo : null });
}
for (const c of doc('tests/bo-50-ca-tb-tchq.json').cases) BO.push({ bo: 'tb-tchq-50', id: `TB50-${c.stt}`, ma: nz(c.ma), moTa: c.cauKhach, doiUng: (c.maLan || []).map(nz), tuKhoaBo: null });
const tong = BO.length;
let CA = BO.filter((c) => co(c.ma) && String(c.moTa || '').trim().length >= 2);
const boQua = tong - CA.length;
if (GIOI_HAN > 0) CA = CA.filter((_, i) => i % Math.ceil(CA.length / GIOI_HAN) === 0);

// ── cấy lỗi ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const LOAI = ['DOI_LOAI_KHAC', 'DOI_MA_DOI_UNG', 'DOI_ANH_EM_THUE_THAP', 'CAT_MO_TA', 'BO_DU_KIEN'];
const LA_DOI_MA = (l) => l.startsWith('DOI_');
function cay(c, loai) {
  const r = rngCua(`${c.id}|${loai}`);
  if (loai === 'DOI_LOAI_KHAC') {
    const n = T.nodeOf(c.ma); const anhEm = (T.siblingsOf(c.ma) || []).filter((s) => co(String(s.id)));
    const ds = n && n.loaiKhac ? anhEm.filter((s) => !s.loaiKhac) : anhEm.filter((s) => s.loaiKhac);
    const s = chon(ds.map((x) => String(x.id)).sort(), r);
    return s ? { ma: s, moTa: c.moTa } : null;
  }
  if (loai === 'DOI_MA_DOI_UNG') {
    let ds = c.doiUng.filter((m) => co(m) && m !== c.ma);
    if (!ds.length) ds = (conflictsData[c.ma]?.confusedWith || []).map(nz).filter((m) => co(m) && m !== c.ma);
    const s = chon([...new Set(ds)].sort(), r);
    return s ? { ma: s, moTa: c.moTa } : null;
  }
  if (loai === 'DOI_ANH_EM_THUE_THAP') {
    const goc = mfn(c.ma); if (goc === null) return null;
    const ds = Object.keys(taxData).filter((m) => co(m) && m !== c.ma && m.startsWith(c.ma.slice(0, 6)) && mfn(m) !== null && mfn(m) < goc).sort();
    const s = chon(ds, r);
    return s ? { ma: s, moTa: c.moTa } : null;
  }
  if (loai === 'CAT_MO_TA') {
    const tu = c.moTa.trim().split(/\s+/);
    return tu.length > 5 ? { ma: c.ma, moTa: tu.slice(0, 3).join(' ').replace(/[,;:(]+$/, '') } : null;
  }
  if (loai === 'BO_DU_KIEN') {
    let moTa = c.moTa;
    if (c.tuKhoaBo) {
      for (const k of c.tuKhoaBo) { try { moTa = moTa.replace(new RegExp(`(?<![\\p{L}\\p{N}])(${k})(?![\\p{L}\\p{N}])`, 'giu'), ' '); } catch { /* từ khoá không phải regex hợp lệ */ } }
    } else {
      const ve = c.moTa.split(/\s*,\s*/);
      if (ve.length < 3) return null;
      const i = 1 + Math.floor(r() * (ve.length - 1));
      moTa = ve.filter((_, k) => k !== i).join(', ');
    }
    moTa = moTa.replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/(,\s*)+/g, ', ').trim();
    return moTa !== c.moTa && moTa.length >= 2 ? { ma: c.ma, moTa } : null;
  }
  return null;
}

// ── chạy một dòng qua đường soát sẵn có ──────────────────────────────────────────────────────────────────────────────────
const CHE = NHANH ? ['sau'] : ['truoc', 'sau'];
async function soat1(ma, moTa, che) {
  if (che === 'truoc') process.env.HS_K2_DOC_LAP = 'off'; else delete process.env.HS_K2_DOC_LAP;
  const truocGoi = goiPhanLoai;
  const kq = await runDeclarationCheck({ dongHang: [{ stt: 1, maHs: ma, moTa: String(moTa).slice(0, 2000), xuatXu: 'CN' }], kiemMa: true }, {});
  const kiem = kq.dong[0].kiem;
  const canh = (n) => kiem.filter((m) => m.nhom === n && (m.trangThai === 'CANH_BAO' || m.trangThai === 'LOI'));
  const maCua = (m) => [...new Set([...(m.maCanhTranh || []).map((x) => x.maHs), ...(m.maDeNghiXem || []), ...(m.khungNghiNgo?.maNghiNgo ? [m.khungNghiNgo.maNghiNgo] : [])].map(String))].sort();
  const k2 = canh('K2');
  return {
    k2: k2.map((m) => m.ma), k2Khoa: new Set(k2.map((m) => `${m.ma}|${maCua(m).join(',')}`)), k2Loi: k2.filter((m) => m.trangThai === 'LOI').length,
    k2DocLap: k2.filter((m) => m.docLap === true).map((m) => m.ma),
    k2Dat: kiem.filter((m) => m.nhom === 'K2' && m.trangThai === 'DAT').map((m) => m.ma),
    k1: canh('K1').map((m) => m.ma), k1Khoa: new Set(canh('K1').map((m) => m.ma)),
    ct: [...new Set(kiem.filter((m) => m.nhom === 'K2').flatMap(maCua))],
    coDuKienLat: kiem.some((m) => (m.maCanhTranh || []).some((x) => x.duKienLat)) || Boolean(kq.dong[0].duKienCanHoi),
    goiPhanLoai: goiPhanLoai - truocGoi, docLapApDung: kq.dong[0].k2DocLap === true, mucSanSang: kq.dong[0].mucSanSang,
    dau: JSON.stringify(kiem.map((m) => [m.nhom, m.trangThai, m.ma])),
  };
}
const dong = [];
const t0 = Date.now();
for (const c of CA) {
  const goc = {}; for (const ch of CHE) goc[ch] = await soat1(c.ma, c.moTa, ch);
  dong.push({ bo: c.bo, id: c.id, loai: 'DUNG', maDung: c.ma, maThu: c.ma, kq: goc });
  for (const loai of NHANH ? [] : LOAI) {
    const v = cay(c, loai);
    if (!v) continue;
    const kq = {};
    for (const ch of CHE) {
      const k = await soat1(v.ma, v.moTa, ch);
      k.k2Moi = [...k.k2Khoa].some((x) => !goc[ch].k2Khoa.has(x));
      k.k1Moi = [...k.k1Khoa].some((x) => !goc[ch].k1Khoa.has(x));
      k.chiDung = LA_DOI_MA(loai) && k.ct.some((m) => c.ma.startsWith(m));
      kq[ch] = k;
    }
    dong.push({ bo: c.bo, id: c.id, loai, maDung: c.ma, maThu: v.ma, chenh: LA_DOI_MA(loai) && mfn(v.ma) !== null && mfn(c.ma) !== null ? Math.abs(mfn(v.ma) - mfn(c.ma)) : null, kq });
  }
}
// tất định: chạy lại 40 ca đúng ở chế độ sau
let lapTrung = 0; const mauLap = dong.filter((d) => d.loai === 'DUNG').slice(0, 40);
for (const d of mauLap) { const c = CA.find((x) => x.id === d.id); const k = await soat1(c.ma, c.moTa, 'sau'); if (k.dau === d.kq.sau.dau) lapTrung += 1; }
const giay = ((Date.now() - t0) / 1000).toFixed(1);

// ── tổng hợp ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function tongHop(che, loc = () => true) {
  const ds = dong.filter(loc);
  const dem = (xs, f) => xs.filter(f).length;
  const dung = ds.filter((d) => d.loai === 'DUNG');
  const caDung = {
    n: dung.length, coCanhBaoK2: dem(dung, (d) => d.kq[che].k2.length > 0), coCanhBaoK2DocLap: dem(dung, (d) => d.kq[che].k2DocLap.length > 0), coLoiK2: dem(dung, (d) => d.kq[che].k2Loi > 0),
    coCanhBaoK1: dem(dung, (d) => d.kq[che].k1.length > 0), k2DatDocLap: dem(dung, (d) => d.kq[che].docLapApDung && d.kq[che].k2.length === 0),
    goiPhanLoai: dem(dung, (d) => d.kq[che].goiPhanLoai > 0), sanSang: dem(dung, (d) => d.kq[che].mucSanSang === 'SAN_SANG'),
  };
  const gop = (xs) => ({ n: xs.length, k2CanhBaoMoi: dem(xs, (d) => d.kq[che].k2Moi), k2CoCanhBao: dem(xs, (d) => d.kq[che].k2.length > 0), chiDungMaDung: dem(xs, (d) => d.kq[che].chiDung), coDuKienLat: dem(xs, (d) => d.kq[che].coDuKienLat), goiPhanLoai: dem(xs, (d) => d.kq[che].goiPhanLoai > 0), k1HoacK2Moi: dem(xs, (d) => d.kq[che].k2Moi || d.kq[che].k1Moi) });
  const loi = Object.fromEntries(LOAI.map((l) => [l, gop(ds.filter((d) => d.loai === l))]));
  const doiMa = ds.filter((d) => LA_DOI_MA(d.loai));
  const muc = {};
  for (const d of ds) { const nhom = d.loai === 'DUNG' ? 'caDung' : LA_DOI_MA(d.loai) ? 'doiMa' : 'thieu'; for (const m of new Set(d.kq[che].k2)) { muc[m] ||= { caDung: 0, doiMa: 0, thieu: 0 }; muc[m][nhom] += 1; } }
  return { caDung, loi, doiMaTong: gop(doiMa), doiMaChenhThue5: gop(doiMa.filter((d) => d.chenh !== null && d.chenh >= 5)), tongGoiPhanLoai: dem(ds, (d) => d.kq[che].goiPhanLoai > 0), tongDong: ds.length, mucK2: Object.fromEntries(Object.entries(muc).sort()) };
}
const TEN_BO = ['soat-38', 'lat-1-110', 'tb-tchq-50'];
const kq = { phienBanBoKiem: require('../lib/declaration-check.js').PHIEN_BAN_BO_KIEM, seed: SEED, boDe: { tong, dung: CA.length, boQuaMaKhongCoTrongBieu: boQua, theoBo: Object.fromEntries(TEN_BO.map((b) => [b, CA.filter((c) => c.bo === b).length])) }, soDong: dong.length, tatDinh: { mau: mauLap.length, trung: lapTrung }, luotLlm: goiLlm };
for (const ch of CHE) kq[ch] = { ...tongHop(ch), theoBo: Object.fromEntries(TEN_BO.map((b) => [b, (({ caDung, doiMaTong }) => ({ caDung, doiMaTong }))(tongHop(ch, (d) => d.bo === b))])) };

// ── in ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = (s, n) => String(s).padEnd(n); const p = (s, n) => String(s).padStart(n);
const so = (a, n) => `${a} (${pt(a, n)})`;
console.log(`\nĐường soát sẵn có (${kq.phienBanBoKiem}, kiemMa) — bộ đo ngoại tuyến có cấy lỗi (seed ${SEED}; ${dong.length} dòng × ${CHE.length} chế độ; ${giay}s; ${goiLlm} lượt LLM, 0 lượt mạng; bộ phân loại là bản giả không trả lời)`);
console.log(`Bộ đề: ${tong} ca có nhãn, dùng ${CA.length} (bỏ ${boQua}) — ${Object.entries(kq.boDe.theoBo).map(([b, n]) => `${b}: ${n}`).join(' · ')}`);
const cot = (ten, f) => `${o(ten, 58)}${CHE.map((ch) => p(f(kq[ch]), 18)).join('')}`;
console.log(`\n${o('', 58)}${CHE.map((ch) => p(ch === 'truoc' ? 'TRƯỚC (K2 cũ)' : 'SAU (K2 độc lập)', 18)).join('')}`);
console.log(`Ca ĐÚNG (${kq[CHE[0]].caDung.n} ca, không cấy lỗi)`);
console.log(cot('  K2 có cảnh báo (báo oan về mã)', (s) => so(s.caDung.coCanhBaoK2, s.caDung.n)));
console.log(cot('    trong đó do mục K2 độc lập', (s) => so(s.caDung.coCanhBaoK2DocLap, s.caDung.n)));
console.log(cot('  K2 có mục LOI', (s) => so(s.caDung.coLoiK2, s.caDung.n)));
console.log(cot('  K2 xác nhận mã bằng nguồn độc lập, không cảnh báo', (s) => so(s.caDung.k2DatDocLap, s.caDung.n)));
console.log(cot('  K2 phải gọi bộ phân loại (tự chấm bài mình)', (s) => so(s.caDung.goiPhanLoai, s.caDung.n)));
console.log(cot('  K1 có cảnh báo (chất lượng mô tả)', (s) => so(s.caDung.coCanhBaoK1, s.caDung.n)));
if (!NHANH) {
  for (const [ten, lay] of [['Mọi ca ĐỔI MÃ', (s) => s.doiMaTong], ['  DOI_LOAI_KHAC', (s) => s.loi.DOI_LOAI_KHAC], ['  DOI_MA_DOI_UNG', (s) => s.loi.DOI_MA_DOI_UNG], ['  DOI_ANH_EM_THUE_THAP', (s) => s.loi.DOI_ANH_EM_THUE_THAP], ['  trong đó chênh MFN ≥ 5 điểm', (s) => s.doiMaChenhThue5]]) {
    console.log(`${ten} (${lay(kq[CHE[0]]).n} ca)`);
    console.log(cot('    bắt: có cảnh báo K2 mới so với bản đúng', (s) => so(lay(s).k2CanhBaoMoi, lay(s).n)));
    console.log(cot('    nêu đúng mã đúng trong mã cạnh tranh', (s) => so(lay(s).chiDungMaDung, lay(s).n)));
    console.log(cot('    kèm dữ kiện lật kết quả', (s) => so(lay(s).coDuKienLat, lay(s).n)));
    console.log(cot('    K2 phải gọi bộ phân loại', (s) => so(lay(s).goiPhanLoai, lay(s).n)));
  }
  for (const l of ['CAT_MO_TA', 'BO_DU_KIEN']) {
    console.log(`${l} (${kq[CHE[0]].loi[l].n} ca, mã vẫn đúng)`);
    console.log(cot('    có mục K1 hoặc K2 mới so với bản đúng', (s) => so(s.loi[l].k1HoacK2Moi, s.loi[l].n)));
    console.log(cot('    có cảnh báo K2 mới (báo oan về mã do mô tả hỏng)', (s) => so(s.loi[l].k2CanhBaoMoi, s.loi[l].n)));
  }
  console.log(cot(`Tổng số dòng K2 phải gọi bộ phân loại (/${dong.length})`, (s) => so(s.tongGoiPhanLoai, s.tongDong)));
}
for (const ch of CHE) {
  console.log(`\nMục K2 cảnh báo — ${ch === 'truoc' ? 'TRƯỚC' : 'SAU'} (ca đúng / đổi mã / cắt + bỏ dữ kiện):`);
  for (const [m, x] of Object.entries(kq[ch].mucK2)) console.log(`  ${o(m, 46)}${p(`${x.caDung} / ${x.doiMa} / ${x.thieu}`, 18)}`);
}
console.log(`\nTất định: chạy lại ${mauLap.length} ca đúng (chế độ sau), trùng toàn bộ mục kiểm ${lapTrung}/${mauLap.length}. Lượt LLM: ${goiLlm}.`);

const ghi = arg('ghi', null);
if (ghi) { const tep = ghi === true ? path.join(ROOT, 'data/bench/soat-nen.json') : path.resolve(ghi); fs.writeFileSync(tep, `${JSON.stringify(kq, null, 1)}\n`); console.log(`Đã ghi số tổng hợp: ${path.relative(ROOT, tep)}`); }
const chiTiet = arg('chi-tiet', null);
if (chiTiet && chiTiet !== true) { fs.writeFileSync(path.resolve(chiTiet), dong.map((d) => JSON.stringify({ bo: d.bo, id: d.id, loai: d.loai, maDung: d.maDung, maThu: d.maThu, ...Object.fromEntries(CHE.map((ch) => [ch, { k2: d.kq[ch].k2, k2Dat: d.kq[ch].k2Dat, ct: d.kq[ch].ct, goiPhanLoai: d.kq[ch].goiPhanLoai }])) })).join('\n') + '\n'); console.log(`Đã ghi chi tiết từng dòng (không commit): ${chiTiet}`); }
if (process.argv.includes('--kiem')) {
  const d = kq.sau.caDung; const oan = 100 * d.coCanhBaoK2DocLap / Math.max(1, d.n);
  const hong = oan > NGUONG_OAN_K2 || d.coLoiK2 > 0 || lapTrung !== mauLap.length || goiLlm > 0;
  console.log(`${hong ? 'FAIL' : 'PASS'} bench-soat --kiem: K2 độc lập báo oan ${oan.toFixed(1)} % trên ca đúng (ngưỡng ${NGUONG_OAN_K2} %), mục LOI oan ${d.coLoiK2}, tất định ${lapTrung}/${mauLap.length}, lượt LLM ${goiLlm}`);
  if (hong) { console.error = loiGoc; process.exit(1); }
}
