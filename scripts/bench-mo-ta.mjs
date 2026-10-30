#!/usr/bin/env node
/**
 * BENCH MÔ TẢ ECUS + SOÁT CẶP MÔ TẢ/MÃ (Đợt 0C — ozplugin docs/gd/ghi-nhan-mo-ta-ecus.md mục 15, 27, 34, 36).
 *
 *   node scripts/bench-mo-ta.mjs --mode=sinh [--nguon=oz|bo-de] [--n=200] [--seed=42] [--chuong=85,84]
 *                                [--llm=mock|that] [--max-llm=20] [--api=<url gốc>]
 *   node scripts/bench-mo-ta.mjs --mode=soat [--nguon=oz|bo-de] [--n=200] [--k2] [--max-llm=20]
 *   node scripts/bench-mo-ta.mjs --mode=sinh|soat --bo-de=data/bench/ho-so-lat-1.json --lat=1 [--n=…]   (bench lát 1)
 *   node scripts/bench-mo-ta.mjs --mode=sinh|soat --nguon=oz --lat=1                                    (tập giữ riêng lát 1)
 *
 * LÁT 1 (L1-2b, #569; spec §10): --bo-de=<tệp> chọn tệp bộ đề (ngầm --nguon=bo-de). --lat=1:
 *   (a) bộ đề lát 1 + ca #543 có mã thuộc lát 1 chưa gộp (gopCa543Lat1 — ca đã gộp mang gopTu, không đếm hai lần);
 *   (b) --nguon=oz: chỉ mẫu oz-gold thuộc 50 phân nhóm ∩ tập giữ riêng lib/holdout.js ∩ tờ khai nhập (locGiuRiengLat1);
 *   (c) ca cài lỗi của bộ đề (bỏ dữ kiện / đổi anh em) như cũ;
 *   (d) nhóm ca "am": data/bench/cv755-am.json — ca tờ khai nhập chạy với maHsChay (không phải đáp án), ca xuất ngoài phạm vi.
 *   In thêm BẢNG §10 đủ hàng: dữ kiện quyết định có mặt, chữ cấm, "xuất xứ", giá trị truy được nguồn, trích dẫn sai, ca âm,
 *   soát bắt MÂU THUẪN / THIẾU, báo oan LOI, dựng hồ sơ tất định. Hàng nào đường cũ chưa có dữ liệu thì ghi rõ lý do.
 *
 * --mode=sinh  Sinh mô tả từ TRƯỜNG TÁCH RỜI (tên hàng, chất liệu, công dụng, hiệu, model, KT, thông số, tình trạng)
 *              qua describeProduct (lib/describe-core.js) — hoặc POST <api>/api/describe khi có --api — rồi chấm
 *              chuỗi cuối `customsDescription`: dấu ngăn, "xuất xứ", chữ cấm, ≤200, trường bắt buộc của chương
 *              (data/chapter-declaration-fields.json), có hiệu/"không hiệu", có KT, độ giống câu chuẩn (Jaccard token).
 *              Nguồn bo-de: chấm thêm tỉ lệ DỮ KIỆN QUYẾT ĐỊNH có mặt (thước đo 15.2).
 * --mode=soat  Từ ca chuẩn (câu Oz + mã, hoặc moTaMau + mã của bộ đề) dựng ca cài lỗi:
 *                (a) bỏ một dữ kiện quyết định, (b) đổi một dữ kiện sang dòng anh em,
 *              chạy bộ soát hiện có lib/declaration-check.js (K1; K2 chỉ khi --k2 vì gọi LLM) + phần K2 tất định
 *              gọi thẳng (so-tay-runtime#anhEmKhop, evidence-pack tienLeMaKhac), đo tỉ lệ bắt được và tỉ lệ báo oan.
 *
 * GIẤU MẪU ĐANG CHẤM (mục 15): nguồn oz chỉ lấy mẫu trong tập giữ riêng của lib/holdout.js, và bật
 * HS_EVAL_EXCLUDE_HOLDOUT=1 (gọi HTTP thì gửi header X-OZ-Eval-Holdout: 1) → mọi kho dựng từ oz-gold bỏ đúng tập này.
 *
 * RIÊNG TƯ: chi tiết từng ca (có câu Oz) chỉ ghi vào data/oz-export/bench/ — thư mục bị gitignore (máy tự
 * `git check-ignore` trước khi ghi, không ignore thì từ chối ghi). Bảng tổng hợp in ra chỉ có số.
 * LLM: mặc định mock (không gọi mạng). --llm=that dùng chuỗi LLM thật (cần khoá), --api gọi server thật; cả hai bị
 * chặn trần --max-llm (mặc định 20). Dữ liệu Oz + LLM thật → bắt buộc chế độ riêng tư (HS_LLM_PRIVATE_ALL=true);
 * gọi --api với nguồn oz bị từ chối nếu không có khoá dịch vụ HS_SERVICE_TOKEN (lượt công khai không đi withPrivateData).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  ROOT, chiSoMoTa, jaccard, khopTuKhoa, docBoDe, trichDanSai, docLat1Pn6, locGiuRiengLat1, gopCa543Lat1, docCaAm, kiemCaAm,
  chamAmSoat, chamAmSinh, baoOanLoi, ghiRiengTu,
} from './mo-ta-bench-lib.mjs';

const require = createRequire(import.meta.url);
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);

const MODE = arg('mode', 'sinh');
const BO_DE = arg('bo-de') ? path.resolve(ROOT, arg('bo-de')) : null;
const NGUON = arg('nguon', BO_DE ? 'bo-de' : 'oz');
const LAT = arg('lat');
// Lát 1: mặc định chạy đủ bộ đề / đủ tập giữ riêng (không cắt 200).
const N = Number(arg('n', LAT ? Infinity : 200));
const SEED = Number(arg('seed', 42));
const LLM = arg('llm', 'mock');
const API = arg('api');
const MAX_LLM = Number(arg('max-llm', 20));
const K2 = flag('k2');
const CHUONG_LOC = arg('chuong') ? arg('chuong').split(',') : null;
const OUT_DIR = path.resolve(ROOT, arg('out', 'data/oz-export/bench'));
const UU_TIEN = ['85', '84', '39', '73', '64', '90', '94', '96', '40', '61'];

if (!['sinh', 'soat'].includes(MODE)) { console.error('--mode=sinh|soat'); process.exit(2); }
if (!['oz', 'bo-de'].includes(NGUON)) { console.error('--nguon=oz|bo-de'); process.exit(2); }
if (!['mock', 'that'].includes(LLM)) { console.error('--llm=mock|that'); process.exit(2); }
if (LAT && LAT !== '1') { console.error('--lat=1 (chỉ có lát 1)'); process.exit(2); }
if (BO_DE && NGUON !== 'bo-de') { console.error('--bo-de=<tệp> đi với --nguon=bo-de'); process.exit(2); }
if (K2 && LLM !== 'that') { console.error('--k2 gọi phân loại LLM: cần --llm=that (mock không phân loại được).'); process.exit(2); }
if (API && NGUON === 'oz' && !process.env.HS_SERVICE_TOKEN) {
  console.error('Từ chối: gửi dữ liệu Oz qua --api cần khoá dịch vụ HS_SERVICE_TOKEN (lượt công khai không đi chế độ riêng tư). Dùng --nguon=bo-de cho lượt công khai.');
  process.exit(2);
}

// ── Môi trường: giấu tập giữ riêng + riêng tư — PHẢI đặt trước khi nạp lib ──────────────────────────────────────────
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
if (NGUON === 'oz' && LLM === 'that') process.env.HS_LLM_PRIVATE_ALL = 'true';

let soLuotLlm = 0;
const llmTier = require('../lib/llm-tier.js');
const goiThat = llmTier.callLLMJson;

/** LLM mock: "dội lại" trường tách rời vào declaration — đo phần tất định (ghép, neo pháp lý, vòng 2, chấm điểm). */
async function llmMock(systemPrompt, userPrompt) {
  let p = {};
  try { p = JSON.parse(userPrompt); } catch { /* prompt không phải JSON → declaration rỗng */ }
  const spec = p.technicalSpec ? String(p.technicalSpec).split(/;\s*/).filter(Boolean) : [];
  return {
    json: {
      declaration: {
        tenHang: p.productName || null,
        nhanHieu: p.brand || null,
        model: p.model || null,
        thanhPhanCauTao: p.material || null,
        congDung: p.purpose || null,
        thongSoKyThuat: spec,
        tinhTrang: p.condition || null,
        xuatXu: p.origin || null,
      },
    },
    provider: 'mock',
    model: 'mock-echo',
  };
}
llmTier.callLLMJson = async (...a) => {
  if (LLM === 'mock') return llmMock(...a);
  if (soLuotLlm >= MAX_LLM) throw Object.assign(new Error(`bench: chạm trần --max-llm=${MAX_LLM}`), { code: 'BENCH_LLM_CAP' });
  soLuotLlm += 1;
  return goiThat(...a);
};
if (LLM === 'mock') {
  // Không gọi mạng: tắt tra web (ZAI) và nhà tra SHTT bên ngoài — chỉ còn watchlist nội bộ.
  require('../lib/web-facts.js').webFacts = async () => null;
  require('../lib/shtt-client.js').isEnabled = () => false;
  require('../lib/cong-mcp-client.js').isEnabled = () => false;
}
const { isHeldOut } = require('../lib/holdout.js');

// ── Tiện ích ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

function docGold() {
  const cands = [process.env.OZ_GOLD_PATH, path.join(ROOT, 'data', 'oz-gold-final.jsonl')].filter(Boolean);
  const p = cands.find((x) => fs.existsSync(x));
  if (!p) { console.error('Không thấy oz-gold-final.jsonl (đặt OZ_GOLD_PATH).'); process.exit(2); }
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

/** Lấy mẫu phân tầng theo chương, CHỈ trong tập giữ riêng: 80% cho 10 chương Oz khai nhiều (tỉ lệ số mẫu, tối thiểu 6), 20% chương khác. */
function layMauOz(n) {
  const rnd = mulberry32(SEED);
  const taxData = require('../lib/data.js').taxData;
  if (LAT) {
    // (b) Tập giữ riêng của lát 1: không phân tầng theo chương — lấy đủ (hoặc n mẫu xáo theo seed).
    const { laToKhaiNhap } = require('../lib/ho-so/lat-1.js');
    const giu = locGiuRiengLat1(docGold(), { pn6: docLat1Pn6(), taxData, isHeldOut, laToKhaiNhap });
    return Number.isFinite(n) ? shuffle(giu, rnd).slice(0, n) : giu;
  }
  // Chỉ tập giữ riêng; bỏ mã không còn trong biểu hiện hành (describe trả 404 — không đo được).
  const gold = docGold().filter((g) => /^\d{8}$/.test(String(g.hsCode)) && g.sampleDesc && g.tenHang && isHeldOut(g) && taxData[String(g.hsCode)]);
  const theo = new Map();
  for (const g of gold) { const c = String(g.hsCode).slice(0, 2); if (CHUONG_LOC && !CHUONG_LOC.includes(c)) continue; if (!theo.has(c)) theo.set(c, []); theo.get(c).push(g); }
  const uu = (CHUONG_LOC || UU_TIEN).filter((c) => theo.has(c));
  const tongUu = uu.reduce((s, c) => s + theo.get(c).length, 0);
  const phanUu = CHUONG_LOC ? n : Math.round(n * 0.8);
  const out = [];
  for (const c of uu) {
    const q = Math.min(theo.get(c).length, Math.max(6, Math.round((phanUu * theo.get(c).length) / tongUu)));
    out.push(...shuffle(theo.get(c), rnd).slice(0, q));
  }
  if (!CHUONG_LOC) {
    const khac = shuffle([...theo.entries()].filter(([c]) => !uu.includes(c)).flatMap(([, v]) => v), rnd);
    out.push(...khac.slice(0, Math.max(0, n - out.length)));
  }
  return out.slice(0, n);
}

/** Bộ đề: N < số ca thì lấy xoay vòng theo chương (mỗi chương lần lượt một ca) để mẫu nhỏ vẫn phủ đủ chương. */
/** Ca bộ đề đang chấm: tệp --bo-de (mặc định #543); --lat=1 gộp thêm ca #543 thuộc lát 1 chưa gộp. */
function caBoDe() {
  const bd = BO_DE ? docBoDe(BO_DE) : docBoDe();
  let ca = bd.ca || [];
  if (LAT) ca = [...ca, ...gopCa543Lat1(bd, docBoDe(), docLat1Pn6())];
  return ca.filter((c) => !CHUONG_LOC || CHUONG_LOC.includes(c.chuong));
}

/** (d) Ca âm CV 755 — chỉ ở bench lát 1. Trả { nhap, ngoaiPhamVi }. */
function caAm() {
  if (!LAT) return { nhap: [], ngoaiPhamVi: [] };
  const bo = docCaAm();
  const k = kiemCaAm(bo);
  if (k.loi.length) { console.error(`data/bench/cv755-am.json hỏng:\n  ${k.loi.join('\n  ')}`); process.exit(2); }
  return { nhap: bo.ca.filter((c) => c.loaiToKhai === 'NHAP'), ngoaiPhamVi: bo.ca.filter((c) => c.loaiToKhai !== 'NHAP') };
}

function layMauBoDe(n) {
  const ca = caBoDe();
  const theo = new Map();
  for (const c of ca) { if (!theo.has(c.chuong)) theo.set(c.chuong, []); theo.get(c.chuong).push(c); }
  const out = [];
  for (let i = 0; out.length < Math.min(n, ca.length); i++) for (const v of theo.values()) if (v[i] && out.length < n) out.push(v[i]);
  return out;
}

/** oz-gold → thân POST /api/describe (chỉ trường tách rời; KHÔNG đưa sampleDesc). */
function bodyTuOz(g) {
  const spec = [...(g.sizes || []).map((s) => `KT ${s}`), ...(g.specs || [])].filter(Boolean);
  return {
    hsCode: String(g.hsCode),
    productName: g.tenHang,
    material: g.chatLieu || undefined,
    purpose: g.congDung || undefined,
    brand: (g.brands || []).filter(Boolean).join(', ') || undefined,
    model: (g.models || []).filter(Boolean).join(', ') || undefined,
    technicalSpec: spec.join('; ') || undefined,
    condition: g.condition || undefined,
    origin: g.origin || undefined,
  };
}
function bodyTuBoDe(c) {
  const t = c.thongTinHang || {};
  return {
    hsCode: c.maHs,
    productName: t.tenHang,
    material: t.chatLieu || undefined,
    purpose: t.congDung || undefined,
    brand: t.nhanHieu || undefined,
    model: t.model || undefined,
    technicalSpec: (t.thongSo || []).join('; ') || undefined,
    condition: t.tinhTrang || undefined,
  };
}

let describeProduct = null;
async function sinhMoTa(body) {
  if (API) {
    if (soLuotLlm >= MAX_LLM) return { loi: 'BENCH_LLM_CAP' };
    soLuotLlm += 1;
    const h = { 'content-type': 'application/json', 'x-oz-eval-holdout': '1' };
    const tok = process.env.HS_SERVICE_TOKEN || process.env.HS_API_TOKEN;
    if (tok) h.authorization = `Bearer ${tok}`;
    try {
      const r = await fetch(`${API.replace(/\/$/, '')}/api/describe`, { method: 'POST', headers: h, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { loi: `HTTP ${r.status}` };
      return { json: j };
    } catch (e) { return { loi: String(e.message || e).slice(0, 120) }; }
  }
  if (!describeProduct) ({ describeProduct } = require('../lib/describe-core.js'));
  try {
    const r = await describeProduct(body);
    if (r.status !== 200) return { loi: `status ${r.status}` };
    return { json: r.json };
  } catch (e) { return { loi: String(e.message || e).slice(0, 120) }; }
}

// ── Ghi chi tiết riêng tư ───────────────────────────────────────────────────────────────────────────────────────────
function ghiChiTiet(ten, rows) {
  return ghiRiengTu(ROOT, path.join(OUT_DIR, ten), rows);
}

function inBang(tieuDe, cot, dong) {
  console.log(`\n${tieuDe}`);
  console.log(`| ${cot.join(' | ')} |`);
  console.log(`|${cot.map(() => '---').join('|')}|`);
  for (const d of dong) console.log(`| ${d.join(' | ')} |`);
}

const p50 = (xs) => { const a = xs.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const phanSo = (a, b) => (b ? `${pct(a, b)} (${a}/${b})` : '— (0 ca)');

/**
 * BẢNG §10 (spec "Đo và nghiệm thu") cho bench lát 1. `v` = { tên hàng: giá trị }; hàng thiếu ⇒ ghi chế độ cần chạy.
 * Ngưỡng là ngưỡng ĐỀ XUẤT của spec §10 (CEO duyệt sau khi có số nền LLM thật ở L0i) — in để đối chiếu, không phải cổng.
 */
const HANG_10 = [
  ['Dữ kiện quyết định có mặt trong chuỗi', '≥ 95 %', 'sinh'],
  ['Chữ cấm (chữ biểu thuế) trong mô tả', '0 %', 'sinh'],
  ['"xuất xứ" trong chuỗi', '0 %', 'sinh'],
  ['Giá trị truy được nguồn', '100 %', 'sinh'],
  ['Trích dẫn sai (GIR, điều luật)', '0', 'sinh|soat'],
  ['Ca âm CV 755 (sinh: từ chối / soát: có cờ)', '100 %', 'sinh|soat'],
  ['Soát bắt MÂU THUẪN (ca đổi sang dòng anh em)', '≥ 90 %', 'soat'],
  ['Soát chỉ đúng THIẾU (ca bỏ dữ kiện)', '≥ 80 %', 'soat'],
  ['Báo oan LOI trên ca chuẩn', '≤ 5 %', 'soat'],
  ['Dựng hồ sơ tất định (p50)', '< 1 s', 'sinh'],
  ['Một lượt viết mô tả (p50, cả máy + LLM)', 'đặt sau L0i (tạm ≤ 30 s)', 'sinh'],
];
function inBang10(v, ghiChu) {
  inBang(`BẢNG §10 — lát 1, ${MODE}, ${API ? `API ${API}` : `LLM ${LLM}`}`, ['Chỉ số', 'Đo được', 'Ngưỡng đề xuất §10'],
    HANG_10.map(([ten, nguong, che]) => [ten, v[ten] ?? (che.split('|').includes(MODE) ? '— (chưa đo)' : `— (chạy --mode=${che.split('|')[0]})`), nguong]));
  for (const g of ghiChu) console.log(`  · ${g}`);
}

// ── MODE SINH ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function cheDoSinh() {
  const mau = NGUON === 'oz' ? layMauOz(N) : layMauBoDe(N);
  const rows = [];
  for (const m of mau) {
    const oz = NGUON === 'oz';
    const ma = oz ? String(m.hsCode) : m.maHs;
    const ch = ma.slice(0, 2);
    const chuan = oz ? m.sampleDesc : m.moTaMau;
    const t0 = Date.now();
    const r = await sinhMoTa(oz ? bodyTuOz(m) : bodyTuBoDe(m));
    const ms = Date.now() - t0;
    const out = r.json?.customsDescription || '';
    const row = {
      id: oz ? `oz:${ma}` : m.id, ma, chuong: ch, loi: r.loi || null,
      degraded: Boolean(r.json?.degraded), llmModel: r.json?.llmModel || null, llmError: r.json?.llmError ? { code: r.json.llmError.code || null, retryable: Boolean(r.json.llmError.retryable), message: String(r.json.llmError.message || '').slice(0, 160) } : null, compliance: r.json?.compliance?.score ?? null,
      moTa: out, chiSo: chiSoMoTa(out, ch, { hoSo: r.json?.hoSo || null }), chiSoChuan: chiSoMoTa(chuan, ch), giongChuan: out ? jaccard(out, chuan) : 0,
      ms, msTatDinh: r.json?.hoSo?.thoiGian?.tatDinhMs ?? null, trichSai: r.json ? trichDanSai(r.json) : null,
      tuChoiNeuLaAm: r.json ? chamAmSinh(r.json).tuChoi : null,
    };
    if (!oz) {
      const dk = m.duKienQuyetDinh.filter((d) => !d.khongDuCanCu);
      row.duKien = dk.map((d) => ({ cap: d.cap, duKien: d.duKien, co: khopTuKhoa(out, d.tuKhoa) }));
    }
    if (oz) row.chuan = chuan; // chỉ ở tệp riêng tư
    rows.push(row);
  }
  const rel = ghiChiTiet(`${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}-sinh-${NGUON}-${API ? 'api' : LLM}.jsonl`, rows);

  const nhom = new Map();
  for (const r of rows) { const k = UU_TIEN.includes(r.chuong) ? r.chuong : 'khác'; if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(r); }
  const thuTu = [...UU_TIEN.filter((c) => nhom.has(c)), ...(nhom.has('khác') ? ['khác'] : [])];
  const dong = (ten, rs, key = 'chiSo') => {
    const ok = rs.filter((r) => !r.loi);
    const s = ok.map((r) => r[key]);
    const tbAp = s.filter((x) => x.truongBatBuoc.apDung);
    return [ten, rs.length, ok.length ? Math.round(mean(s.map((x) => x.doDai))) : '—', pct(s.filter((x) => x.le200).length, s.length), pct(s.filter((x) => x.coDauNgan).length, s.length),
      pct(s.filter((x) => x.coXuatXu).length, s.length), pct(s.filter((x) => x.chuCam.length).length, s.length),
      tbAp.length ? pct(tbAp.filter((x) => !x.truongBatBuoc.thieu.length).length, tbAp.length) : '—',
      pct(s.filter((x) => x.coHieu).length, s.length), pct(s.filter((x) => x.coKT).length, s.length),
      key === 'chiSo' ? (ok.length ? mean(ok.map((r) => r.giongChuan)).toFixed(2) : '—') : '1.00',
      key === 'chiSo' ? pct(rs.filter((r) => r.degraded || r.loi).length, rs.length) : '—'];
  };
  const cot = ['Chương', 'n', 'Dài TB', '≤200', 'Dấu ngăn', '"xuất xứ"', 'Chữ cấm', 'Đủ trường BB', 'Hiệu', 'KT', 'Giống chuẩn (J)', 'Lỗi/degraded'];
  inBang(`SINH — nguồn ${NGUON}, ${API ? `API ${API}` : `LLM ${LLM}`}, ${rows.length} mẫu (máy sinh)`, cot, [...thuTu.map((k) => dong(k, nhom.get(k))), dong('TỔNG', rows)]);
  inBang(`Đối chiếu — câu chuẩn (${NGUON === 'oz' ? 'câu Oz đã khai' : 'moTaMau bộ đề'}) trên cùng mẫu`, cot, [dong('TỔNG chuẩn', rows, 'chiSoChuan')]);
  const camDem = {};
  for (const r of rows) for (const c of r.chiSo.chuCam) camDem[c] = (camDem[c] || 0) + 1;
  const tbThieu = {};
  for (const r of rows) for (const k of r.chiSo.truongBatBuoc.thieu) tbThieu[`${r.chuong}:${k}`] = (tbThieu[`${r.chuong}:${k}`] || 0) + 1;
  console.log(`\nChữ cấm (số mẫu máy sinh): ${JSON.stringify(camDem)}`);
  console.log(`Trường bắt buộc thiếu nhiều nhất: ${JSON.stringify(Object.entries(tbThieu).sort((a, b) => b[1] - a[1]).slice(0, 8))}`);
  if (NGUON === 'bo-de') {
    const all = rows.flatMap((r) => r.duKien || []);
    const theoCap = {};
    for (const d of all) { const k = String(d.cap); theoCap[k] = theoCap[k] || [0, 0]; theoCap[k][1] += 1; if (d.co) theoCap[k][0] += 1; }
    console.log(`\nDữ kiện quyết định có mặt trong chuỗi máy sinh: ${pct(all.filter((d) => d.co).length, all.length)} (${all.filter((d) => d.co).length}/${all.length}); theo cấp ${JSON.stringify(Object.fromEntries(Object.entries(theoCap).map(([k, [a, b]]) => [k, `${a}/${b}`])))}`);
    console.log(`Ca đủ 100% dữ kiện: ${pct(rows.filter((r) => r.duKien.every((d) => d.co)).length, rows.length)}`);
  }
  if (LAT) {
    // (d) ca âm CV 755: sinh từ đúng câu sơ sài (tên hàng = câu sơ sài), mã chạy máy maHsChay.
    const am = caAm();
    const amRows = [];
    for (const c of am.nhap) {
      const r = await sinhMoTa({ hsCode: c.maHsChay.ma, productName: c.moTaSoSai });
      const ch = chamAmSinh(r.json);
      amRows.push({ id: c.id, loi: r.loi || null, tuChoi: !r.loi && ch.tuChoi, theo: ch.theo, trangThai: ch.trangThai, trichSai: r.json ? trichDanSai(r.json) : null });
    }
    const coTn = rows.filter((r) => r.chiSo.truyNguon.apDung);
    const tn = coTn.reduce((a, r) => [a[0] + r.chiSo.truyNguon.co, a[1] + r.chiSo.truyNguon.tong], [0, 0]);
    const ts = [...rows, ...amRows].map((r) => r.trichSai).filter(Boolean).reduce((a, t) => [a[0] + t.sai, a[1] + t.tong], [0, 0]);
    const dk = rows.flatMap((r) => r.duKien || []);
    const ok = rows.filter((r) => !r.loi);
    const tatDinh = rows.map((r) => r.msTatDinh).filter((x) => x != null);
    const v = {
      'Chữ cấm (chữ biểu thuế) trong mô tả': phanSo(ok.filter((r) => r.chiSo.chuCam.length).length, ok.length),
      '"xuất xứ" trong chuỗi': phanSo(ok.filter((r) => r.chiSo.coXuatXu).length, ok.length),
      'Giá trị truy được nguồn': coTn.length ? phanSo(tn[0], tn[1]) : `— (đường cũ không trả hoSo: 0/${rows.length} ca có hồ sơ)`,
      'Trích dẫn sai (GIR, điều luật)': `${ts[0]} / ${ts[1]} trích dẫn`,
      'Ca âm CV 755 (sinh: từ chối / soát: có cờ)': `${amRows.filter((r) => r.tuChoi).length}/${amRows.length} ca nhập bị từ chối (${amRows.map((r) => `${r.id.slice(6)}:${r.loi ? 'lỗi' : r.trangThai}`).join(', ')}); ngoài phạm vi lát 1: ${am.ngoaiPhamVi.length}`,
      'Dựng hồ sơ tất định (p50)': tatDinh.length ? `${p50(tatDinh)} ms (${tatDinh.length} ca)` : '— (đường cũ không dựng hồ sơ)',
      'Một lượt viết mô tả (p50, cả máy + LLM)': `${p50(rows.map((r) => r.ms))} ms (${LLM === 'mock' && !API ? 'LLM mock — chỉ phần máy' : 'LLM thật'})`,
    };
    if (NGUON === 'bo-de') v['Dữ kiện quyết định có mặt trong chuỗi'] = phanSo(dk.filter((d) => d.co).length, dk.length);
    else v['Dữ kiện quyết định có mặt trong chuỗi'] = '— (nguồn oz không có dữ kiện chấm sẵn; chạy --bo-de)';
    const nenTuChoi = ok.filter((r) => r.tuChoiNeuLaAm).length;
    inBang10(v, [
      `độ phân biệt của hàng ca âm: trên cùng đường, ca chuẩn (không âm) cũng bị "từ chối" ${phanSo(nenTuChoi, ok.length)} — ca âm chỉ có nghĩa khi tỉ lệ này thấp.`,
      'ca âm chạy với maHsChay — mã để chạy máy, KHÔNG phải đáp án (CV 755 không ghi mã); ca tờ khai xuất không chạy (lát 1 chỉ nhập).',
      'đường cũ chưa có THIEU_DU_KIEN: "từ chối" = compliance WEAK/REJECT hoặc passesCustomsAudit=false (lib/mo-ta-bench-lib.mjs#chamAmSinh).',
    ]);
  }
  console.log(`\nLượt LLM/API thật đã dùng: ${soLuotLlm}${rel ? `; chi tiết riêng tư: ${rel}` : ''}`);
}

// ── MODE SOÁT ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Luật đổi dữ kiện sang dòng anh em cho câu Oz (mã đích không xác định — chỉ đo có báo hay không). */
const LUAT_DOI = [
  { ch: ['64'], re: /mũi[^,;]{0,15}không (gắn|có)[^,;]{0,15}bảo vệ|không (gắn|có) mũi bảo vệ/i, sang: 'mũi gắn thép bảo vệ' },
  { ch: null, re: /không (dùng|hoạt động bằng|chạy bằng) điện/i, sang: 'hoạt động bằng điện' },
  { ch: ['61', '62'], re: /\b(dành cho |cho )?nam\b/i, sang: 'nữ' },
  { ch: ['39'], re: /không giãn nở/i, sang: 'giãn nở được' },
  { ch: ['39'], re: /dạng hạt/i, sang: 'dạng phân tán' },
  { ch: ['61', '62', '63'], re: /cotton|\bbông\b/i, sang: 'polyester' },
  { ch: ['84', '85'], re: /không có chức năng ([^,;]{3,30})/i, sang: 'có chức năng $1' },
  { ch: ['73'], re: /không gỉ|inox/i, sang: 'thép không hợp kim' },
  { ch: ['96'], re: /thân (bằng )?(nhựa|plastic)/i, sang: 'thân bằng kim loại' },
];

/** Bỏ một cụm khỏi câu và dọn dấu phẩy thừa. */
function boCum(s, cum) {
  const i = s.toLowerCase().indexOf(cum.toLowerCase());
  if (i < 0) return null;
  return (s.slice(0, i) + s.slice(i + cum.length)).replace(/\s*,\s*,/g, ',').replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, '').replace(/\s{2,}/g, ' ').trim();
}

function caSoatOz(n) {
  const out = [];
  for (const g of layMauOz(n)) {
    const s = String(g.sampleDesc);
    const ma = String(g.hsCode);
    const chuan = { id: `oz:${ma}`, loai: 'chuan', ma, moTa: s, xuatXu: /^[A-Z]{2}$/.test(g.origin || '') ? g.origin : 'CN' };
    out.push(chuan);
    // (a) bỏ dữ kiện: chất liệu → công dụng → thông số → KT, cụm đầu tiên có nguyên văn trong câu.
    const cands = [['chatLieu', g.chatLieu], ['congDung', g.congDung], ...(g.specs || []).map((x) => ['specs', x]), ...(g.sizes || []).map((x) => ['sizes', x])]
      .filter(([, v]) => v && String(v).length >= 3);
    for (const [truong, v] of cands) {
      const moi = boCum(s, String(v));
      if (moi && moi !== s) { out.push({ ...chuan, loai: 'bo_du_kien', truong, moTa: moi }); break; }
    }
    // (b) đổi dữ kiện sang dòng anh em theo luật thay chữ.
    const ch = ma.slice(0, 2);
    const luat = LUAT_DOI.find((l) => (!l.ch || l.ch.includes(ch)) && l.re.test(s));
    if (luat) out.push({ ...chuan, loai: 'doi_anh_em', truong: String(luat.re), moTa: s.replace(luat.re, luat.sang) });
  }
  return out;
}

function caSoatBoDe() {
  const out = [];
  for (const c of caBoDe().slice(0, N)) {
    if (CHUONG_LOC && !CHUONG_LOC.includes(c.chuong)) continue;
    const chuan = { id: c.id, loai: 'chuan', ma: c.maHs, moTa: c.moTaMau, xuatXu: 'CN' };
    out.push(chuan);
    for (const i of c.caCaiLoi?.boDuKien || []) {
      const d = c.duKienQuyetDinh[i];
      // Bỏ mọi đoạn (ngăn bởi dấu phẩy) khớp một biểu thức của dữ kiện; chỉ giữ ca khi câu mới thật sự mất dữ kiện.
      const segs = c.moTaMau.split(/,\s*/);
      const giu = segs.filter((sg) => !d.tuKhoa.some((re) => khopTuKhoa(sg, [re])));
      const moi = giu.join(', ');
      if (giu.length && giu.length < segs.length && !khopTuKhoa(moi, d.tuKhoa)) out.push({ ...chuan, loai: 'bo_du_kien', truong: `cap${d.cap}: ${d.duKien}`, moTa: moi });
    }
    if (c.caCaiLoi?.doiAnhEm) {
      const x = c.caCaiLoi.doiAnhEm;
      out.push({ ...chuan, loai: 'doi_anh_em', truong: `${x.tu} → ${x.sang}`, maTroToi: x.maTroToi, moTa: c.moTaMau.replace(x.tu, x.sang) });
    }
  }
  return out;
}

async function cheDoSoat() {
  const { runDeclarationCheck } = require('../lib/declaration-check.js');
  const soTay = require('../lib/so-tay-runtime.js');
  const { buildEvidencePack } = require('../lib/evidence-pack.js');
  const { taxData } = require('../lib/data.js');
  const cas = NGUON === 'oz' ? caSoatOz(N) : caSoatBoDe();
  const res = [];
  async function soatMot(c) {
    const kiemMa = K2 && soLuotLlm < MAX_LLM;
    let kq = null; let loi = null;
    try {
      // Đơn vị tính lấy theo biểu (ô donViTinh của tờ khai luôn có) — không để K1 báo UNIT_MISSING oan.
      const dvt = taxData[c.ma]?.dvt || undefined;
      kq = await runDeclarationCheck({ dongHang: [{ stt: 1, maHs: c.ma, moTa: c.moTa.slice(0, 2000), xuatXu: c.xuatXu, ...(dvt ? { donViTinh: String(dvt).slice(0, 30) } : {}) }], ...(kiemMa ? { kiemMa: true } : {}) });
    } catch (e) { loi = String(e.message || e).slice(0, 120); }
    const kiem = kq?.dong?.[0]?.kiem || [];
    const co = (nhom) => kiem.filter((m) => m.nhom === nhom && (m.trangThai === 'CANH_BAO' || m.trangThai === 'LOI')).map((m) => `${nhom}:${m.ma}`);
    // K2 tất định gọi thẳng (không LLM): "Loại khác" khớp anh em + tiền lệ mô tả tương tự kết luận mã khác.
    const det = [];
    try { if (soTay.anhEmKhop(c.ma, { tenHang: c.moTa }).length) det.push('K2det:LOAI_KHAC_KHOP_ANH_EM'); } catch { /* cố vấn */ }
    try { if ((buildEvidencePack({ maHs: [c.ma], moTa: c.moTa })?.goiCanCu?.[0]?.tienLe?.tienLeMaKhac || []).length) det.push('K2det:TIEN_LE_MO_TA_TUONG_TU_MA_KHAC'); } catch { /* cố vấn */ }
    const k2Ma = kiem.find((m) => m.nhom === 'K2' && /^KHAC_/.test(m.ma));
    const dong = kq?.dong?.[0] || {};
    return { ...c, loi, kiemMa, co: [...co('K1'), ...co('K2'), ...det], det, kiem: kiem.map((m) => ({ nhom: m.nhom, ma: m.ma, trangThai: m.trangThai })),
      trichSai: kq ? trichDanSai({ ...(dong.ketQuaPhanLoai || {}), ...(dong.hoSo ? { hoSo: dong.hoSo } : {}) }) : null,
      mucSanSang: dong.mucSanSang || null, k2MaMay: dong.ketQuaPhanLoai?.results?.[0]?.hs || null, k2Lech: k2Ma ? k2Ma.ma : null };
  }
  for (const c of cas) res.push(await soatMot(c));
  // (d) ca âm CV 755 — chạy riêng, không ghép với ca chuẩn.
  const am = caAm();
  const amRes = [];
  for (const c of am.nhap) {
    const r = await soatMot({ id: c.id, loai: 'am', ma: c.maHsChay.ma, moTa: c.moTaSoSai, xuatXu: 'CN' });
    amRes.push({ ...r, bat: !r.loi && chamAmSoat(r.kiem, r.det).bat });
  }
  // Ghép theo ca gốc: bắt được = ca lỗi có cờ (CANH_BAO/LOI) mà ca chuẩn không có.
  const loi = res.filter((r) => r.loai !== 'chuan');
  // Ca lỗi đứng ngay sau ca chuẩn của nó trong danh sách → ghép theo vị trí.
  let goc = null;
  const cap = [];
  for (const r of res) { if (r.loai === 'chuan') goc = r; else cap.push([goc, r]); }
  const thongKe = {};
  for (const [g, l] of cap) {
    const moi = l.co.filter((x) => !g.co.includes(x));
    const k1 = moi.some((x) => x.startsWith('K1:'));
    const k2det = moi.some((x) => x.startsWith('K2det:'));
    const k2llm = moi.some((x) => x.startsWith('K2:'));
    // "Đúng loại": bỏ dữ kiện → cờ thiếu (K1 THIEU_*/MISSING_*) hoặc K2; đổi anh em → cờ K2 (mã lệch, Loại khác khớp anh em, tiền lệ mã khác).
    const dungLoai = l.loai === 'bo_du_kien' ? moi.some((x) => /^K1:(THIEU_|MISSING_)|^K2/.test(x)) : moi.some((x) => /^K2/.test(x));
    const t = (thongKe[l.loai] = thongKe[l.loai] || { n: 0, bat: 0, dung: 0, k1: 0, k2det: 0, k2llm: 0, k2chay: 0 });
    t.n += 1; if (moi.length) t.bat += 1; if (dungLoai) t.dung += 1; if (k1) t.k1 += 1; if (k2det) t.k2det += 1; if (k2llm) t.k2llm += 1; if (l.kiemMa) t.k2chay += 1;
    l.moiCo = moi;
  }
  const sach = res.filter((r) => r.loai === 'chuan');
  const oanK1 = sach.filter((r) => r.co.some((x) => x.startsWith('K1:'))).length;
  const oanK2det = sach.filter((r) => r.co.some((x) => x.startsWith('K2det:'))).length;
  const oanK2 = sach.filter((r) => r.k2Lech).length;
  const rel = ghiChiTiet(`${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}-soat-${NGUON}${LAT ? '-lat1' : ''}-${K2 ? 'k2' : 'k1'}.jsonl`, [...res, ...amRes]);
  inBang(`SOÁT — nguồn ${NGUON}, ${sach.length} ca chuẩn, ${loi.length} ca cài lỗi, K2-LLM ${K2 ? `BẬT (≤${MAX_LLM} lượt)` : 'TẮT'}`,
    ['Loại ca lỗi', 'n', 'Có cờ mới (bất kỳ)', 'Cờ đúng loại', 'qua K1', 'qua K2 tất định', 'qua K2 LLM', 'K2 LLM đã chạy'],
    Object.entries(thongKe).map(([k, t]) => [k, t.n, pct(t.bat, t.n), pct(t.dung, t.n), pct(t.k1, t.n), pct(t.k2det, t.n), K2 ? pct(t.k2llm, t.n) : 'tắt', t.k2chay]));
  console.log(`\nCa chuẩn bị gắn cờ (nền báo oan): K1 ${pct(oanK1, sach.length)} · K2 tất định ${pct(oanK2det, sach.length)} · K2 LLM mã lệch ${K2 ? pct(oanK2, sach.filter((r) => r.kiemMa).length) : 'tắt'}`);
  if (NGUON === 'bo-de') {
    const doi = cap.filter(([, l]) => l.loai === 'doi_anh_em');
    const chiDungMa = doi.filter(([, l]) => l.k2MaMay && String(l.k2MaMay).replace(/\D/g, '') === l.maTroToi).length;
    if (K2) console.log(`Ca đổi anh em mà K2 chỉ đúng mã đích: ${chiDungMa}/${doi.length}`);
    console.log('Lưu ý: bộ soát hiện có không chỉ ra dữ kiện CÓ/THIẾU/MÂU THUẪN (mục 27) — "bắt được" ở đây chỉ là có cờ mới.');
  }
  if (LAT) {
    const oan = baoOanLoi(res);
    const ts = [...res, ...amRes].map((r) => r.trichSai).filter(Boolean).reduce((a, t) => [a[0] + t.sai, a[1] + t.tong], [0, 0]);
    const tk = (k) => thongKe[k] || { n: 0, dung: 0 };
    inBang10({
      'Trích dẫn sai (GIR, điều luật)': `${ts[0]} / ${ts[1]} trích dẫn${K2 ? '' : ' (K2-LLM tắt: phân loại không chạy nên gần như không có trích dẫn)'}`,
      'Ca âm CV 755 (sinh: từ chối / soát: có cờ)': `${amRes.filter((r) => r.bat).length}/${amRes.length} ca nhập có cờ K1/K2 (${amRes.map((r) => `${r.id.slice(6)}:${r.loi ? 'lỗi' : (r.co.join('+') || 'không cờ')}`).join(', ')}); ngoài phạm vi lát 1: ${am.ngoaiPhamVi.length}`,
      'Soát bắt MÂU THUẪN (ca đổi sang dòng anh em)': `${phanSo(tk('doi_anh_em').dung, tk('doi_anh_em').n)} — cờ K2 mới`,
      'Soát chỉ đúng THIẾU (ca bỏ dữ kiện)': `${phanSo(tk('bo_du_kien').dung, tk('bo_du_kien').n)} — cờ thiếu/K2 mới`,
      'Báo oan LOI trên ca chuẩn': phanSo(oan.loi, oan.n),
    }, [
      `độ phân biệt của hàng ca âm: ca chuẩn (không âm) cũng có cờ K1/K2 ${phanSo(res.filter((r) => r.loai === 'chuan' && chamAmSoat(r.kiem, r.det).bat).length, res.filter((r) => r.loai === 'chuan').length)} — ca âm chỉ có nghĩa khi tỉ lệ này thấp.`,
      'đường cũ không chỉ ra dữ kiện CÓ/THIẾU/MÂU THUẪN: "bắt" ở đây là có cờ mới đúng loại (như bảng SOÁT ở trên), chưa phải chỉ đúng dữ kiện.',
      'ca âm chạy với maHsChay — mã để chạy máy, KHÔNG phải đáp án (CV 755 không ghi mã); ca tờ khai xuất không chạy (lát 1 chỉ nhập).',
    ]);
  }
  console.log(`\nLượt LLM thật đã dùng: ${soLuotLlm}${rel ? `; chi tiết riêng tư: ${rel}` : ''}`);
}

const t0 = Date.now();
(MODE === 'sinh' ? cheDoSinh() : cheDoSoat()).then(() => {
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
