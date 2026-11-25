#!/usr/bin/env node
/**
 * scripts/do-do-thi-gd3.mjs — Bộ đo Giai đoạn 3 đồ thị tri thức HS (chọn nhóm 4 số).
 *
 * Chạy đường chọn nhóm 4 số ở chế độ:
 *   - `nen`: giữ nguyên mọi cờ `HS_*` đang đặt trong `process.env` (nền thật khách hàng đang nhận:
 *            `HS_TIM_TRUOC=on`, `HS_TIM_TRUOC_NAP=0`, `HS_CHOT_SOM_CO_KIEM=on`, `HS_HOI_THEO_SO_TAY=on`, `HS_SO_TAY=full`)
 *   - `bat`: `HS_TIM_TRUOC=goi` (classifyLoop + GÓI PHÂN BIỆT, PR #1825) và/hoặc `ba-buoc` (lib/do-thi/ba-buoc.js, PR #1841)
 *            ghi đè chỉ phần GĐ3 lên trên cùng tập cờ nền env
 *   - `tat`: tắt hẳn `HS_TIM_TRUOC` (chỉ dùng khi chủ đích đo đường tắt hẳn cho L1)
 *   - Mặc định `--che-do=ca-hai`: chạy `nen` + `bat` (so sánh `nen` vs BẬT).
 *
 * Bộ mẫu:
 *   - `van52` : scripts/ca-do/van-5-2.jsonl (van 5/2 lặp 5 lượt — đo độ ổn định)
 *   - `van30` : scripts/ca-do/van-khi-nen-30.jsonl (30 ca van khí nén)
 *   - `s7`    : scripts/ca-do/de-rieng-300.jsonl (300 ca S-7 để riêng, lọc loại Oz holdout cùng nguồn GĐ2)
 *   - `bo`    : tuỳ chọn `--bo <tệp jsonl>` (ví dụ bộ v3 QT gắn nhãn hoặc danh sách ca còn sai)
 *
 * Luật L1 / Luật đo 23/11 (`docs/tang-4so/LUAT-DO.md`) / riêng tư:
 *   - Chỉ đọc, không sửa đường khách (lib/, api/, data/).
 *   - Mặc định `--llm gia` (tất định, 0 mạng, chặn fetch) để tự kiểm trên Mac/CI.
 *   - `--llm that`: CẤM chạy trong container phục vụ khách hoặc bằng khoá API của khách; chỉ chạy trên container/kênh đo riêng
 *     với khoá đo riêng. BỎ mặc định 300 ca: bắt buộc truyền `--bo <tệp>` hoặc `--gioi-han <n>`, thiếu thì thoát mã 1.
 *     Tự đặt HS_LLM_PRIVATE_ALL=true với dữ liệu Oz.
 *   - Zero-PII: không bao giờ in tên hàng / mô tả tờ khai Oz hay khoá bí mật ra stdout, JSON hay Markdown.
 *
 * Dùng:
 *   node scripts/do-do-thi-gd3.mjs --llm gia --gioi-han=10
 *   node scripts/do-do-thi-gd3.mjs --llm gia --phuong-an=ca-hai --chi-bo=van52,van30
 *   node scripts/do-do-thi-gd3.mjs --llm that --gioi-han=5 --chi-bo=van52 --che-do=ca-hai --json /tmp/gd3-van52.json --ghi-bao-cao /tmp/gd3-van52.md --che-pII
 *   node scripts/do-do-thi-gd3.mjs --llm that --bo /tmp/v3-gan-nhan.jsonl --che-do=ca-hai --che-pII
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { laCaKin, taiDanhSachLoai } from './dung-bo-thu-de-rieng.mjs';
import { kiemTraZeroPii, layMauDeu } from './do-do-thi-gd2.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const llmTier = require('../lib/llm-tier.js');
const ozSearch = require('../lib/oz-precedent-search.js');
const { classifyLoop } = require('../lib/engine-loop.js');
const timTruocMod = require('../lib/tim-truoc.js');
const { searchCandidates } = require('../lib/search-utils.js');
const { taxData } = require('../lib/data.js');
const { withHangHoa, withPrivateData } = require('../lib/llm-privacy.js');
const { chayBaBuoc } = require('../lib/do-thi/ba-buoc.js');
const luotMot = require('../lib/do-thi/luot-mot.js');
const luotHai = require('../lib/do-thi/luot-hai.js');
const { goiPhanBiet } = require('../lib/do-thi/goi-phan-biet.js');
const { nhomConSong } = require('../lib/do-thi/khoi-phan-biet.js');

export const DICH_GD3 = Object.freeze({
  s7_dung_nhom4: 'Hơn nền (nen) trên bộ đo S-7 / ca còn sai (mục 6 GĐ3, luật đo 23/11)',
  van52_on_dinh: '5/5 đúng nhóm 8481 (mục 6 GĐ3)',
  do_tre_trung_vi: '<= 45 s (45.000 ms, mục 2 & 6 GĐ3)',
  do_tre_p95: '<= 80 s (80.000 ms, dưới trần cắt 85 s)',
  luot_mot_ky_tu: '~1.300 ký tự (khối tìm trước <= 1.500 / lượt một <= 1.300)',
  goi_phan_biet_ky_tu: '6-7 nghìn ký tự (trần 7.000)',
});

export const CO_NEN_MAY_THAT = Object.freeze({
  HS_TIM_TRUOC: 'on',
  HS_TIM_TRUOC_NAP: '0',
  HS_CHOT_SOM_CO_KIEM: 'on',
  HS_HOI_THEO_SO_TAY: 'on',
  HS_SO_TAY: 'full',
});

const BO_HOP_LE = ['van52', 'van30', 's7', 'bo'];
const BI_MAT_KEYS = new Set(['HS_API_TOKEN', 'HS_ADMIN_TOKEN', 'HS_SERVICE_TOKENS', 'HS_DATABASE_URL']);
const CO_THEO_DOI = [
  'HS_CLASSIFY_ENGINE',
  'HS_TIM_TRUOC',
  'HS_TIM_TRUOC_NAP',
  'HS_TIEN_XU_LY',
  'HS_TIM_CGCT',
  'HS_SO_TAY',
  'HS_CHOT_SOM_CO_KIEM',
  'HS_HOI_THEO_SO_TAY',
  'HS_GON_DAU_RA',
  'HS_MAX_VONG_SUA',
  'HS_CLASSIFY_FAST_FIRST',
  'HS_EVAL_EXCLUDE_HOLDOUT',
  'HS_LLM_PRIVATE_ALL',
  'HS_KHACH_MO_CHUOI_AI',
  'HS_BENCH_ONLY_9ROUTER',
  'MIC_OFF',
  'CLASSIFY_BUDGET_MS',
];

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const tyLe = (tu, mau) => (mau > 0 ? Math.round((tu * 1000) / mau) / 10 : 0);
const trungBinh = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

export function phanVi(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return Math.round(sorted[idx] * 10) / 10;
}

function tomTatPhanBo(values) {
  if (!values.length) return { trungBinh: 0, median: 0, p95: 0, max: 0 };
  return {
    trungBinh: trungBinh(values),
    median: phanVi(values, 0.5),
    p95: phanVi(values, 0.95),
    max: Math.round(Math.max(...values) * 10) / 10,
  };
}

function docJsonl(duongDan) {
  const abs = path.isAbsolute(duongDan) ? duongDan : path.join(ROOT, duongDan);
  return fs.readFileSync(abs, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .map((l) => JSON.parse(l));
}

let _chuGiaiHeading = null;
function tenNhom4(h4) {
  if (!_chuGiaiHeading) {
    try {
      _chuGiaiHeading = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chu-giai-heading.json'), 'utf8'));
    } catch {
      _chuGiaiHeading = {};
    }
  }
  const ten = _chuGiaiHeading[h4]?.ten_nhom || '';
  return String(ten).replace(/^\d{2}\.\d{2}\s*[-–]?\s*/, '').trim();
}

/** Chuẩn hoá một dòng ca thử (hỗ trợ cả khuôn de-rieng/van và khuôn 4so-v1/v2/v3). */
export function chuanHoaCa(row, idx = 0) {
  if (!row || typeof row !== 'object') throw new Error(`Dòng ca #${idx + 1} không hợp lệ`);
  let payload;
  if (typeof row.tenHang === 'string' && row.tenHang.trim()) {
    payload = {
      tenHang: row.tenHang.trim(),
      ...(row.chatLieu ? { chatLieu: String(row.chatLieu).trim() } : {}),
      ...(row.congDung ? { congDung: String(row.congDung).trim() } : {}),
    };
  } else if (typeof row.moTa === 'string' && row.moTa.trim()) {
    const parts = row.moTa.split(/\s+\/\s+/).map((s) => s.trim());
    const clean = (s) => (s && !/^(none|null|không rõ)$/i.test(s) ? s : '');
    if (parts.length >= 2) {
      payload = {
        tenHang: clean(parts[0]) || row.moTa.trim(),
        ...(clean(parts[1]) ? { chatLieu: clean(parts[1]) } : {}),
        ...(parts.slice(2).map(clean).filter(Boolean).length ? { congDung: parts.slice(2).map(clean).filter(Boolean).join(' ') } : {}),
      };
    } else {
      payload = { tenHang: row.moTa.trim() };
    }
  } else {
    throw new Error(`Dòng ca #${idx + 1} thiếu tenHang hoặc moTa`);
  }

  const nhomRaw = Array.isArray(row.nhom) ? row.nhom.map((x) => nz(x).slice(0, 4)).filter((x) => x.length === 4) : [];
  const maGoc = nz(row.maDung || row.maToKhai || row.hsCode || row.hs || nhomRaw[0] || '');
  const nhomDung = nhomRaw.length ? [...new Set(nhomRaw)] : (maGoc.length >= 4 ? [maGoc.slice(0, 4)] : []);
  const pn6Dung = maGoc.length >= 6 ? maGoc.slice(0, 6) : null;

  return {
    stt: idx + 1,
    payload,
    nhomDung,
    pn6Dung,
    ketQua: row.ketQua || (nhomDung.length > 1 ? 'PHAN_VAN' : 'CHOT'),
  };
}

/** Phân tích tham số CLI hỗ trợ `--flag=val` và `--flag val`. */
export function phanTichThamSo(argv = process.argv.slice(2)) {
  const nhanh = argv.includes('--nhanh');
  const chePII = argv.some((a) => /^--che-pii$/i.test(a));
  const giuCo = argv.includes('--giu-co');

  const layGiaTri = (ten) => {
    for (let i = 0; i < argv.length; i += 1) {
      const a = argv[i];
      if (a.startsWith(`--${ten}=`)) return a.slice(ten.length + 3);
      if (a === `--${ten}`) {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) return next;
        return true;
      }
    }
    return null;
  };

  const llmRaw = layGiaTri('llm');
  const llm = llmRaw == null ? 'gia' : String(llmRaw).trim().toLowerCase();
  if (!['gia', 'that'].includes(llm)) {
    throw new Error(`Tham số --llm không hợp lệ: "${llmRaw}". Chỉ nhận: gia | that`);
  }

  const cheDoRaw = layGiaTri('che-do');
  const cheDo = cheDoRaw == null ? 'ca-hai' : String(cheDoRaw).trim().toLowerCase();
  if (!['ca-hai', 'nen', 'tat', 'bat'].includes(cheDo)) {
    throw new Error(`Tham số --che-do không hợp lệ: "${cheDoRaw}". Chỉ nhận: ca-hai | nen | tat | bat`);
  }

  const phuongAnRaw = layGiaTri('phuong-an');
  const phuongAn = phuongAnRaw == null ? 'goi' : String(phuongAnRaw).trim().toLowerCase();
  if (!['goi', 'ba-buoc', 'ca-hai'].includes(phuongAn)) {
    throw new Error(`Tham số --phuong-an không hợp lệ: "${phuongAnRaw}". Chỉ nhận: goi | ba-buoc | ca-hai`);
  }

  const boRaw = layGiaTri('bo');
  const boPath = typeof boRaw === 'string' && boRaw.trim() ? path.resolve(boRaw.trim()) : null;
  if (boRaw === true) throw new Error('Thiếu đường dẫn tệp sau --bo');
  if (boPath && !fs.existsSync(boPath)) {
    throw new Error(`Không tìm thấy tệp bộ tuỳ chọn --bo: ${boPath}`);
  }

  const chiBoRaw = layGiaTri('chi-bo');
  let chiBo = null;
  if (typeof chiBoRaw === 'string' && chiBoRaw.trim()) {
    chiBo = chiBoRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const sai = chiBo.filter((s) => !BO_HOP_LE.includes(s));
    if (sai.length) {
      throw new Error(`Tham số --chi-bo không hợp lệ: ${sai.join(', ')}. Hợp lệ: ${BO_HOP_LE.join(', ')}`);
    }
    if (chiBo.includes('bo') && !boPath) {
      throw new Error('Đã chọn --chi-bo=bo nhưng chưa truyền --bo <tệp jsonl>');
    }
  }

  const gioiHanRaw = layGiaTri('gioi-han');
  let gioiHan = null;
  if (typeof gioiHanRaw === 'string' && gioiHanRaw.trim()) {
    const n = Number(gioiHanRaw);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`Tham số --gioi-han không hợp lệ: ${gioiHanRaw}`);
    }
    gioiHan = n;
  }

  const gianRaw = layGiaTri('gian');
  const gianMs = gianRaw != null && gianRaw !== true ? Number(gianRaw) : (llm === 'that' ? 1500 : 0);
  if (!Number.isFinite(gianMs) || gianMs < 0) {
    throw new Error(`Tham số --gian không hợp lệ: ${gianRaw}`);
  }

  const nganSachRaw = layGiaTri('ngan-sach-ms');
  const nganSachMs = nganSachRaw != null && nganSachRaw !== true ? Number(nganSachRaw) : 85000;
  if (!Number.isFinite(nganSachMs) || nganSachMs <= 0) {
    throw new Error(`Tham số --ngan-sach-ms không hợp lệ: ${nganSachRaw}`);
  }

  const jsonOpt = layGiaTri('json');
  const baoCaoOpt = layGiaTri('ghi-bao-cao');

  if (llm === 'that' && !boPath && !gioiHan) {
    throw new Error(
      'Luật đo 23/11 (docs/tang-4so/LUAT-DO.md): khi chạy --llm that không được chạy mặc định cả bộ 300 ca; bắt buộc truyền --bo <tệp jsonl> (chỉ đo ca còn sai) hoặc --gioi-han <n>.',
    );
  }

  return {
    llm,
    cheDo,
    phuongAn,
    nhanh,
    giuCo,
    chePII,
    boPath,
    chiBo,
    gioiHan,
    gianMs: Math.round(gianMs),
    nganSachMs: Math.round(nganSachMs),
    jsonStdout: jsonOpt === true,
    jsonPath: typeof jsonOpt === 'string' ? path.resolve(jsonOpt) : null,
    baoCaoPath: typeof baoCaoOpt === 'string' ? path.resolve(baoCaoOpt) : null,
  };
}

/** Đọc git SHA hiện tại (rơi về HS_COMMIT / SOURCE_COMMIT trong container). */
export function docGitSha() {
  try {
    const full = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    return { sha: full, ngan: full.slice(0, 8), dirty, nguon: 'git' };
  } catch {
    const envSha = (process.env.HS_COMMIT || process.env.SOURCE_COMMIT || '').trim();
    return {
      sha: envSha || null,
      ngan: envSha ? envSha.slice(0, 8) : 'khong-ro',
      dirty: null,
      nguon: envSha ? 'env' : 'khong-co',
    };
  }
}

/** Đọc cấu hình cờ HS_* an toàn (tuyệt đối bỏ qua biến bí mật). */
export function layTrangThaiCo() {
  const out = {};
  for (const k of CO_THEO_DOI) {
    if (BI_MAT_KEYS.has(k)) continue;
    out[k] = process.env[k] !== undefined && process.env[k] !== '' ? String(process.env[k]) : '(mặc định)';
  }
  return out;
}

/** Ghi lại toàn bộ cờ nền đang có trong `process.env` (giữ nguyên cho chế độ `nen`) và đối chiếu với cờ nền máy thật. */
export function layThongTinCoNen() {
  const tatCaCoTheoDoi = layTrangThaiCo();
  const coNenMayThat = {};
  const khacMayThat = [];
  for (const [k, kyVong] of Object.entries(CO_NEN_MAY_THAT)) {
    const hienHanh = process.env[k] !== undefined && process.env[k] !== '' ? String(process.env[k]) : null;
    coNenMayThat[k] = hienHanh ?? '(chưa đặt — theo mặc định mã)';
    if (hienHanh !== kyVong) {
      khacMayThat.push({ co: k, hienHanh: hienHanh ?? '(chưa đặt)', mayThat: kyVong });
    }
  }
  return {
    daGiuNguyenEnv: true,
    docTuProcessEnv: true,
    coNenMayThat,
    khacMayThat,
    tatCaCoTheoDoi,
  };
}

/** Tạo danh sách mã 8 số hợp lệ đầu tiên thuộc một nhóm 4 số để làm fallback an toàn cho LLM giả. */
let _ma8TheoNhom = null;
function ma8MacDinhCuaNhom(h4) {
  if (!_ma8TheoNhom) {
    _ma8TheoNhom = new Map();
    for (const k of Object.keys(taxData)) {
      if (!/^\d{8}$/.test(k)) continue;
      const h = k.slice(0, 4);
      if (!_ma8TheoNhom.has(h)) _ma8TheoNhom.set(h, k);
    }
  }
  return _ma8TheoNhom.get(h4) || null;
}

/**
 * LLM giả tất định (chỉ đọc userPrompt, không đụng truth, 0 gọi mạng):
 *   - `understand`: nếu có khối `ỨNG VIÊN TÌM ĐƯỢC TRONG KHO` thì đọc các nhóm từ khối đó; nếu không (TẮT) thì tách tên hàng
 *     từ đầu prompt và dùng `searchCandidates` trên biểu thuế thuần.
 *   - `gir`: đọc các `■ NHÓM XXXX` và mã 8 số trong `gathered.pack`, ưu tiên nhóm nằm trong `■ NHÓM` (và có trong gói phân biệt nếu có).
 *   - `luot-mot` / `luot-hai`: đọc đúng định dạng yêu cầu của `lib/do-thi/luot-mot.js` và `luot-hai.js`.
 */
export function taoLlmGia() {
  return async (systemPrompt, userPrompt, opts = {}) => {
    const u = String(userPrompt || '');
    const step = opts.step || '';

    if (step === 'luot-mot') {
      const uvPart = u.split('ỨNG VIÊN:')[1]?.split('YÊU CẦU:')[0] || '';
      const nhom = [];
      for (const m of uvPart.matchAll(/^\s*-\s*(\d{4})\b/gm)) {
        if (!nhom.includes(m[1])) nhom.push(m[1]);
        if (nhom.length >= 3) break;
      }
      if (!nhom.length) nhom.push('8479');
      return { json: { duKien: [], nhom, lyDoNgoai: '' }, provider: 'stub', model: 'stub-gd3' };
    }

    if (step === 'luot-hai') {
      const songLine = (u.match(/NHÓM CÒN SỐNG:\s*([^\n]+)/) || [])[1] || '';
      const song = songLine.split(',').map((s) => nz(s).slice(0, 4)).filter((s) => s.length === 4);
      const canCuPart = u.split('CĂN CỨ:')[1]?.split('YÊU CẦU:')[0] || '';
      const mucs = [...canCuPart.matchAll(/\[([^\]]+)\]\s*\((\d{4}-\d{4})\)/g)].map((m) => ({
        id: m[1],
        cap: m[2].split('-'),
      }));
      let chonNhom = song[0] || '8479';
      let chonCanCu = [];
      for (const h of song) {
        const hit = mucs.find((m) => m.cap.includes(h));
        if (hit) {
          chonNhom = h;
          chonCanCu = [hit.id];
          break;
        }
      }
      if (!chonCanCu.length && mucs.length) {
        const m0 = mucs[0];
        const hitH = song.find((h) => m0.cap.includes(h));
        if (hitH) {
          chonNhom = hitH;
          chonCanCu = [m0.id];
        }
      }
      return {
        json: {
          nhom: chonNhom,
          canCu: chonCanCu,
          thieu: [],
          lyDo: chonCanCu.length ? 'chọn theo cạnh phân biệt trong gói (LLM giả)' : 'không đủ cạnh nối',
        },
        provider: 'stub',
        model: 'stub-gd3',
      };
    }

    if (step === 'understand') {
      const dongDau = clip((u.split('\n').find((l) => l.trim()) || 'hàng hóa'), 120);
      const ttIdx = u.indexOf('ỨNG VIÊN TÌM ĐƯỢC TRONG KHO');
      const hyps = [];
      const pn6Map = new Map();

      if (ttIdx >= 0) {
        const khoi = u.slice(ttIdx);
        for (const m of khoi.matchAll(/\b\d+\.\s*Nhóm\s*(\d{4})(?:\s*—\s*phân nhóm:\s*([^\n]+))?/g)) {
          const h4 = m[1];
          if (!hyps.includes(h4)) hyps.push(h4);
          if (m[2]) {
            const p6 = nz(m[2].split(',')[0]).slice(0, 6);
            if (p6.length === 6) pn6Map.set(h4, p6);
          }
          if (hyps.length >= 3) break;
        }
      } else {
        const tenRaw = u.replace(/^(?:Tên hàng|Hàng|Sản phẩm)\s*:\s*/i, '').split('\n')[0];
        const cands = searchCandidates(tenRaw, { topCandidates: 10 }) || [];
        for (const c of cands) {
          const code = nz(c.hsCode);
          if (code.length < 4) continue;
          const h4 = code.slice(0, 4);
          if (!hyps.includes(h4)) {
            hyps.push(h4);
            if (code.length >= 6) pn6Map.set(h4, code.slice(0, 6));
          }
          if (hyps.length >= 3) break;
        }
      }
      if (!hyps.length) hyps.push('8479');

      const hypotheses = hyps.map((h4, idx) => ({
        chapter: h4.slice(0, 2),
        heading4: h4,
        subheading6: pn6Map.get(h4) || `${h4}90`,
        why: ttIdx >= 0 ? 'theo ứng viên tìm trước (LLM giả)' : 'theo tên hàng trên biểu thuế (LLM giả)',
        confidence: Math.max(55, 85 - idx * 10),
      }));
      const c8 = ma8MacDinhCuaNhom(hyps[0]) || `${hyps[0]}9000`;
      const tuTim = dongDau.replace(/^[^:]+:\s*/, '').split(/\s+/).slice(0, 6).join(' ') || 'hàng hoá';
      return {
        json: {
          product: {
            nameVi: dongDau.replace(/^[^:]+:\s*/, ''),
            nameEn: 'goods',
            purpose: 'dùng chung',
            mechanism: 'không rõ',
            material: 'không rõ',
            form: 'hoàn chỉnh',
            evidence: {},
          },
          hypotheses,
          verify: {
            searchVi: [tuTim],
            codes8: [c8],
            unknowns: [],
          },
        },
        provider: 'stub',
        model: 'stub-gd3',
      };
    }

    // step === 'gir' (vòng 2 / vòng sửa)
    const nhomTrongPack = [];
    for (const m of u.matchAll(/■\s*NHÓM\s*(\d{4})\b/g)) {
      if (!nhomTrongPack.includes(m[1])) nhomTrongPack.push(m[1]);
    }
    const ma8TheoNhom = new Map();
    for (const m of u.matchAll(/\b(\d{8})\b/g)) {
      const code = m[1];
      if (!taxData[code]) continue;
      const h4 = code.slice(0, 4);
      if (!ma8TheoNhom.has(h4)) ma8TheoNhom.set(h4, code);
    }

    // Nếu có GÓI PHÂN BIỆT, ưu tiên nhóm vừa có mặt trong gói vừa có ■ NHÓM trong hồ sơ
    let chonH4 = nhomTrongPack[0] || null;
    const goiIdx = u.indexOf('GÓI PHÂN BIỆT');
    if (goiIdx >= 0 && nhomTrongPack.length) {
      const goiText = u.slice(goiIdx);
      const goiNhoms = new Set();
      for (const m of goiText.matchAll(/\((\d{4})-(\d{4})\)/g)) {
        goiNhoms.add(m[1]);
        goiNhoms.add(m[2]);
      }
      const uuTien = nhomTrongPack.find((h) => goiNhoms.has(h));
      if (uuTien) chonH4 = uuTien;
    }

    const fallbackH4 = chonH4 || [...ma8TheoNhom.keys()][0] || '8479';
    const hs8 = ma8TheoNhom.get(fallbackH4) || ma8MacDinhCuaNhom(fallbackH4) || '84798999';
    const dongTen = clip((u.split('\n').find((l) => l.trim()) || 'Sản phẩm'), 80);

    return {
      json: {
        decision: 'CHOT',
        hs: hs8,
        confidence: 84,
        reason: `Chọn nhóm ${fallbackH4} từ hồ sơ đã kiểm chứng (LLM giả)`,
        basis: [{ stream: 'SAN_PHAM', claim: 'khớp mô tả hàng', evidence: dongTen }],
        conditions: [],
        alternatives: nhomTrongPack
          .filter((h) => h !== fallbackH4)
          .slice(0, 2)
          .map((h) => ({ hs: ma8TheoNhom.get(h) || ma8MacDinhCuaNhom(h) || `${h}9000`, whyNot: 'nhóm phụ (LLM giả)' })),
        questions: [],
      },
      provider: 'stub',
      model: 'stub-gd3',
    };
  };
}

/**
 * Tổng hợp chỉ số cho một bộ ca trên một chế độ chạy.
 * Tất cả các trường đều thuần số / mã 4-6 số, tuyệt đối không chứa tên hàng Oz.
 */
export function tinhChiSoBo(banGhis, { laVan52 = false, coUngVienTruocL1 = false, coGoiPhanBiet = coUngVienTruocL1 } = {}) {
  const n = banGhis.length;
  let loi = 0;
  let coMa = 0;
  let cham = 0;
  let dungNhom4 = 0;
  let dungPn6 = 0;
  let coTrongUngVienTruoc = 0;
  let coTrongR1 = 0;
  let mauBiLoaiL1 = 0;
  let biLoaiL1 = 0;
  let biLoaiGoiPb = 0;

  const msList = [];
  const luotAiList = [];
  const ktV1List = [];
  const ktTimTruocList = [];
  const ktV2List = [];
  const ktGoiPbList = [];
  const providers = {};
  const nhomVan52 = [];

  for (const r of banGhis) {
    if (typeof r.ms === 'number') msList.push(r.ms);
    if (typeof r.soLuotAi === 'number') luotAiList.push(r.soLuotAi);
    if (typeof r.kyTuVong1 === 'number' && r.kyTuVong1 > 0) ktV1List.push(r.kyTuVong1);
    if (typeof r.kyTuKhoiTimTruoc === 'number') ktTimTruocList.push(r.kyTuKhoiTimTruoc);
    if (typeof r.kyTuVong2 === 'number' && r.kyTuVong2 > 0) ktV2List.push(r.kyTuVong2);
    if (typeof r.kyTuGoiPhanBiet === 'number') ktGoiPbList.push(r.kyTuGoiPhanBiet);
    if (r.provider) providers[r.provider] = (providers[r.provider] || 0) + 1;

    if (r.loi) {
      loi += 1;
      if (laVan52) nhomVan52.push(null);
      continue;
    }

    if (r.maRa4) coMa += 1;
    if (laVan52) nhomVan52.push(r.maRa4 || null);

    if (Array.isArray(r.nhomDung) && r.nhomDung.length) {
      cham += 1;
      if (r.dungNhom4) dungNhom4 += 1;
      if (r.dungPn6) dungPn6 += 1;
      if (r.coTrongR1) coTrongR1 += 1;
      if (coUngVienTruocL1 && r.coTrongUngVienTruocL1) {
        coTrongUngVienTruoc += 1;
        mauBiLoaiL1 += 1;
        if (r.biLoaiOLuot1) biLoaiL1 += 1;
        if (r.biLoaiKhoiGoiPhanBiet) biLoaiGoiPb += 1;
      }
    }
  }

  const out = {
    n,
    soLoi: loi,
    soCoMa: coMa,
    soCham: cham,
    dungNhom4: {
      so: dungNhom4,
      mauSo: cham,
      tyLe: tyLe(dungNhom4, cham),
      tyLeTrenTongCa: tyLe(dungNhom4, n),
      tyLeTrenCoMa: tyLe(dungNhom4, coMa),
    },
    dungPn6: {
      so: dungPn6,
      mauSo: cham,
      tyLe: tyLe(dungPn6, cham),
    },
    coTrongUngVienTruocL1: coUngVienTruocL1
      ? { so: coTrongUngVienTruoc, mauSo: cham, tyLe: tyLe(coTrongUngVienTruoc, cham) }
      : null,
    coTrongR1: {
      so: coTrongR1,
      mauSo: cham,
      tyLe: tyLe(coTrongR1, cham),
    },
    biLoaiOLuot1: coUngVienTruocL1
      ? { so: biLoaiL1, mauSo: mauBiLoaiL1, tyLe: tyLe(biLoaiL1, mauBiLoaiL1) }
      : null,
    biLoaiKhoiGoiPhanBiet: (coUngVienTruocL1 && coGoiPhanBiet)
      ? { so: biLoaiGoiPb, mauSo: mauBiLoaiL1, tyLe: tyLe(biLoaiGoiPb, mauBiLoaiL1) }
      : null,
    doTreMs: {
      medianMs: phanVi(msList, 0.5),
      p95Ms: phanVi(msList, 0.95),
      maxMs: msList.length ? Math.round(Math.max(...msList) * 10) / 10 : 0,
      tongMs: Math.round(msList.reduce((a, b) => a + b, 0) * 10) / 10,
    },
    luotAi: {
      tong: luotAiList.reduce((a, b) => a + b, 0),
      trungBinh: trungBinh(luotAiList),
      median: phanVi(luotAiList, 0.5),
      max: luotAiList.length ? Math.max(...luotAiList) : 0,
    },
    kyTuGoiAi: {
      vong1: tomTatPhanBo(ktV1List),
      khoiTimTruoc: tomTatPhanBo(ktTimTruocList),
      vong2: tomTatPhanBo(ktV2List),
      goiPhanBiet: tomTatPhanBo(ktGoiPbList),
    },
    providers,
  };

  if (laVan52) {
    const hopLe = nhomVan52.filter(Boolean);
    const dem = new Map();
    for (const h of hopLe) dem.set(h, (dem.get(h) || 0) + 1);
    const sap = [...dem.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
    const nhomChinh = sap[0]?.[0] || null;
    const soNhomChinh = sap[0]?.[1] || 0;
    out.van52 = {
      soLuot: n,
      dungNhom8481: banGhis.filter((r) => !r.loi && r.maRa4 === '8481').length,
      dungPn6_848120: banGhis.filter((r) => !r.loi && r.maRa6 === '848120').length,
      soNhomKhacNhau: dem.size,
      maNhomChinh: nhomChinh,
      tyLeNhatQuan: tyLe(soNhomChinh, n),
      nhatQuanTatCaLuot: n > 0 && soNhomChinh === n && nhomChinh != null,
      maNhomRa: nhomVan52,
    };
  }

  return out;
}

function tinhDelta(off, on) {
  if (!off || !on) return null;
  return {
    dungNhom4_pp: Math.round((on.dungNhom4.tyLe - off.dungNhom4.tyLe) * 10) / 10,
    coTrongR1_pp: Math.round((on.coTrongR1.tyLe - off.coTrongR1.tyLe) * 10) / 10,
    medianMs: Math.round((on.doTreMs.medianMs - off.doTreMs.medianMs) * 10) / 10,
    p95Ms: Math.round((on.doTreMs.p95Ms - off.doTreMs.p95Ms) * 10) / 10,
    luotAiTb: Math.round((on.luotAi.trungBinh - off.luotAi.trungBinh) * 100) / 100,
    kyTuV1Tb: Math.round((on.kyTuGoiAi.vong1.trungBinh - off.kyTuGoiAi.vong1.trungBinh) * 10) / 10,
    kyTuV2Tb: Math.round((on.kyTuGoiAi.vong2.trungBinh - off.kyTuGoiAi.vong2.trungBinh) * 10) / 10,
  };
}

/** Chạy một bộ mẫu qua classifyLoop (mode `nen`, `tat`, hoặc `goi`). */
async function chayBoQuaClassifyLoop({ caList, cheDo, optsRun, isOzPrivate, wrapCtx }) {
  const banGhis = [];
  const prevTimTruoc = process.env.HS_TIM_TRUOC;
  let timTruocDangBat = false;
  let goiPbDangBat = false;

  try {
    if (cheDo === 'goi') {
      process.env.HS_TIM_TRUOC = 'goi';
    } else if (cheDo === 'tat') {
      delete process.env.HS_TIM_TRUOC;
    }
    // cheDo === 'nen': giữ nguyên hoàn toàn HS_TIM_TRUOC và mọi cờ HS_* trong process.env

    const timTruocVal = String(process.env.HS_TIM_TRUOC || '').trim();
    timTruocDangBat = /^(on|1|true|goi)$/i.test(timTruocVal);
    goiPbDangBat = /^goi$/i.test(timTruocVal);

    for (let i = 0; i < caList.length; i += 1) {
      const ca = caList[i];
      if (i > 0 && optsRun.gianMs > 0) await ngu(optsRun.gianMs);

      const theoDoi = {
        calls: [],
        r1Hyps: [],
      };
      wrapCtx.current = theoDoi;

      const t0 = performance.now();
      let res = null;
      let errMsg = null;

      try {
        const execCall = () => classifyLoop(ca.payload, {
          tier: 'standard',
          debug: true,
          kenhGoi: 'cong-oz',
          hanChotMs: Date.now() + optsRun.nganSachMs,
          ...(optsRun.llm === 'gia' ? { mic: false } : {}),
        });
        res = isOzPrivate ? await withPrivateData(execCall) : await withHangHoa(execCall);
      } catch (e) {
        errMsg = clip(e?.message || String(e), 160);
      } finally {
        wrapCtx.current = null;
      }

      const ms = Math.round((performance.now() - t0) * 10) / 10;
      const topHs = nz(res?.results?.[0]?.hs || res?.results?.[0]?.hsCode || '');
      const maRa4 = topHs.length >= 4 ? topHs.slice(0, 4) : null;
      const maRa6 = topHs.length >= 6 ? topHs.slice(0, 6) : null;
      const loi = Boolean(errMsg || res?.engine?.error);

      const callsV1 = theoDoi.calls.filter((c) => c.step === 'understand');
      const callsV2 = theoDoi.calls.filter((c) => c.step === 'gir');
      const kyTuVong1 = callsV1.length ? callsV1[0].userLen : 0;
      const kyTuVong2 = callsV2.length ? callsV2[0].userLen : 0;
      const kyTuKhoiTimTruoc = Number(res?.engine?.timTruoc?.kyTu || 0);
      const kyTuGoiPhanBiet = Number(res?.engine?.goiPhanBiet?.kyTu || 0);

      const ungVienTruoc = Array.isArray(res?.engine?.timTruoc?.nhom) ? res.engine.timTruoc.nhom : [];
      const r1Nhoms = [...new Set([
        ...theoDoi.r1Hyps,
        ...((res?.dossier?.hypotheses || []).map((h) => nz(h?.heading4).slice(0, 4)).filter((h) => h.length === 4)),
      ])];
      const goiPbNhoms = Array.isArray(res?.engine?.goiPhanBiet?.nhom)
        ? res.engine.goiPhanBiet.nhom
        : (goiPbDangBat ? nhomConSong(res?.dossier?.hypotheses, ungVienTruoc) : []);

      const truthHit = (ds) => ca.nhomDung.some((t) => ds.includes(t));
      const coTrongUngVienTruocL1 = timTruocDangBat && truthHit(ungVienTruoc);
      const coTrongR1 = truthHit(r1Nhoms);
      const biLoaiOLuot1 = coTrongUngVienTruocL1 && !coTrongR1;
      const biLoaiKhoiGoiPhanBiet = goiPbDangBat && coTrongUngVienTruocL1 && !truthHit(goiPbNhoms);

      const lastCall = theoDoi.calls[theoDoi.calls.length - 1] || null;
      banGhis.push({
        stt: ca.stt,
        nhomDung: ca.nhomDung,
        maRa4,
        maRa6,
        dungNhom4: !loi && Boolean(maRa4 && ca.nhomDung.includes(maRa4)),
        dungPn6: !loi && Boolean(maRa6 && ca.pn6Dung && maRa6 === ca.pn6Dung),
        coTrongUngVienTruocL1,
        coTrongR1,
        biLoaiOLuot1,
        biLoaiKhoiGoiPhanBiet,
        soLuotAi: theoDoi.calls.length || Number(res?.engine?.rounds || 0),
        kyTuVong1,
        kyTuKhoiTimTruoc,
        kyTuVong2,
        kyTuGoiPhanBiet,
        ms,
        status: res?.status || (loi ? 'LOI' : '?'),
        provider: lastCall ? `${lastCall.provider || '-'}/${lastCall.model || '-'}` : (res?.engine?.provider || null),
        loi,
      });
    }
  } finally {
    if (prevTimTruoc === undefined) delete process.env.HS_TIM_TRUOC;
    else process.env.HS_TIM_TRUOC = prevTimTruoc;
  }

  return { banGhis, timTruocDangBat, goiPbDangBat };
}

/** Tham số gọi LLM cho bước `ba-buoc`, thống nhất model MiniMax với `lib/engine-loop.js`. */
export function taoTuyChonLlmBaBuoc(ten, nganSachMs = 85000) {
  return {
    step: ten,
    minimax: { model: process.env.LOOP_MODEL || 'MiniMax-M3' },
    tier: 'standard',
    maxTokens: ten === 'luot-mot' ? 1200 : 1500,
    timeoutMs: Math.min(45000, nganSachMs),
    temperature: 0.1,
  };
}

/** Chạy một bộ mẫu qua `lib/do-thi/ba-buoc.js` (chọn nhóm 4 số ba bước GĐ3). */
async function chayBoQuaBaBuoc({ caList, optsRun, isOzPrivate, locOzFn, llmCaller }) {
  const banGhis = [];
  const SYS_BA_BUOC = 'Bạn là trợ lý phân loại mã HS Việt Nam. Chỉ trả về đúng một đối tượng JSON hợp lệ theo đúng khuôn được yêu cầu.';

  for (let i = 0; i < caList.length; i += 1) {
    const ca = caList[i];
    if (i > 0 && optsRun.gianMs > 0) await ngu(optsRun.gianMs);

    const calls = [];
    const goiLLM = async (ten, yeuCau) => {
      const execLlm = () => llmCaller(SYS_BA_BUOC, yeuCau, taoTuyChonLlmBaBuoc(ten, optsRun.nganSachMs));
      const res = isOzPrivate ? await withPrivateData(execLlm) : await withHangHoa(execLlm);
      calls.push({
        step: ten,
        userLen: String(yeuCau || '').length,
        provider: res?.provider || null,
        model: res?.model || null,
      });
      return res?.json;
    };

    const t0 = performance.now();
    let res = null;
    let loi = false;

    try {
      const tt = await timTruocMod.timTruoc(ca.payload, locOzFn ? { locOz: locOzFn } : {});
      const uv = (tt?.tomTat?.nhom || []).map((h) => ({
        nhom: h,
        ten: tenNhom4(h),
        bangChung: (tt?.tomTat?.nguon?.[h] || []).join(', '),
      }));
      const duKien = [
        ca.payload.chatLieu ? `Chất liệu: ${ca.payload.chatLieu}` : '',
        ca.payload.congDung ? `Công dụng: ${ca.payload.congDung}` : '',
      ].filter(Boolean);
      const moTa = [ca.payload.tenHang, ca.payload.chatLieu, ca.payload.congDung].filter(Boolean).join(' — ');

      res = await chayBaBuoc(
        { moTa, duKien, ungVien: uv },
        { goiLLM, luotMot, goiPhanBiet, luotHai, tran1: 1300, tran2: 7000 },
      );
      res._uv = uv.map((u) => u.nhom);
      res._ktTimTruoc = Number(tt?.tomTat?.kyTu || 0);
    } catch {
      loi = true;
    }

    const ms = Math.round((performance.now() - t0) * 10) / 10;
    const maRa4 = res?.nhom || null;
    const ungVienTruoc = res?._uv || [];
    const conSong = Array.isArray(res?.nhomConSong) ? res.nhomConSong : [];

    const truthHit = (ds) => ca.nhomDung.some((t) => ds.includes(t));
    const coTrongUngVienTruocL1 = truthHit(ungVienTruoc);
    const coTrongR1 = truthHit(conSong);
    const biLoaiOLuot1 = coTrongUngVienTruocL1 && !coTrongR1;

    const c1 = calls.find((c) => c.step === 'luot-mot');
    const c2 = calls.find((c) => c.step === 'luot-hai');
    const lastCall = calls[calls.length - 1] || null;

    banGhis.push({
      stt: ca.stt,
      nhomDung: ca.nhomDung,
      maRa4,
      maRa6: null,
      dungNhom4: !loi && Boolean(maRa4 && ca.nhomDung.includes(maRa4)),
      dungPn6: false,
      coTrongUngVienTruocL1,
      coTrongR1,
      biLoaiOLuot1,
      biLoaiKhoiGoiPhanBiet: biLoaiOLuot1,
      soLuotAi: calls.length,
      kyTuVong1: c1 ? c1.userLen : 0,
      kyTuKhoiTimTruoc: res?._ktTimTruoc || 0,
      kyTuVong2: c2 ? c2.userLen : 0,
      kyTuGoiPhanBiet: Number(res?.goi?.kyTu || 0),
      ms,
      status: res?.trangThai || (loi ? 'LOI' : '?'),
      provider: lastCall ? `${lastCall.provider || '-'}/${lastCall.model || '-'}` : null,
      loi: loi || !res,
    });
  }

  return banGhis;
}

/** Đánh giá sơ bộ các ngưỡng nhận Giai đoạn 3 (lưu ý: chỉ có hiệu lực L1 khi chạy `--llm that` trên kênh đo riêng). */
export function danhGiaDieuKienGd3({ llm, s7Nen, s7Tat, s7Bat, van52Bat }) {
  const laBanThat = llm === 'that';
  const s7Goc = s7Nen || s7Tat;
  const s7HonNen = (s7Goc && s7Bat) ? s7Bat.dungNhom4.tyLe > s7Goc.dungNhom4.tyLe : null;
  const van52Dat55 = van52Bat?.van52 ? van52Bat.van52.dungNhom8481 === van52Bat.van52.soLuot && van52Bat.van52.soLuot >= 5 : null;
  const boDoTre = s7Bat || van52Bat;
  const trungViDat = boDoTre ? boDoTre.doTreMs.medianMs <= 45000 : null;
  const p95Dat = boDoTre ? boDoTre.doTreMs.p95Ms <= 80000 : null;

  return {
    chiThamKhaoViLlmGia: !laBanThat,
    soSanhVoi: s7Nen ? 'nen' : (s7Tat ? 'tat' : null),
    s7HonNen,
    van52Dat55,
    trungViDuoi45s: trungViDat,
    p95Duoi80s: p95Dat,
    datTatCa: Boolean(laBanThat && s7HonNen && van52Dat55 && trungViDat && p95Dat),
  };
}

/** Chạy toàn bộ benchmark Giai đoạn 3. */
export async function chayBenchGd3(opts = {}) {
  const t0 = performance.now();
  const thamSo = {
    llm: opts.llm || 'gia',
    cheDo: opts.cheDo || 'ca-hai',
    phuongAn: opts.phuongAn || 'goi',
    nhanh: Boolean(opts.nhanh),
    giuCo: Boolean(opts.giuCo),
    chePII: Boolean(opts.chePII),
    gioiHan: opts.gioiHan || null,
    chiBo: opts.chiBo || null,
    boPath: opts.boPath || null,
    gianMs: opts.gianMs ?? (opts.llm === 'that' ? 1500 : 0),
    nganSachMs: opts.nganSachMs || 85000,
  };

  if (thamSo.llm === 'that' && !thamSo.boPath && !thamSo.gioiHan) {
    throw new Error(
      'Luật đo 23/11 (docs/tang-4so/LUAT-DO.md): khi chạy --llm that không được chạy mặc định cả bộ 300 ca; bắt buộc truyền --bo <tệp jsonl> (chỉ đo ca còn sai) hoặc --gioi-han <n>.',
    );
  }

  const dsLoai = taiDanhSachLoai();
  const locOzS7 = (item) => !laCaKin(item, dsLoai);
  const ozGoldLines = fs.readFileSync(path.join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8')
    .split('\n').map((l) => l.trim()).filter(Boolean).map(JSON.parse);
  const soDongOzBiLoaiS7 = ozGoldLines.filter((r) => laCaKin(r, dsLoai)).length;

  const van52All = docJsonl('scripts/ca-do/van-5-2.jsonl').map(chuanHoaCa);
  const van30All = docJsonl('scripts/ca-do/van-khi-nen-30.jsonl').map(chuanHoaCa);
  const s7All = docJsonl('scripts/ca-do/de-rieng-300.jsonl').map(chuanHoaCa);
  const boAll = thamSo.boPath ? docJsonl(thamSo.boPath).map(chuanHoaCa) : null;

  const cap = (rows, nhanhCap) => {
    let lim = rows.length;
    if (thamSo.nhanh && nhanhCap && nhanhCap < lim) lim = nhanhCap;
    if (thamSo.gioiHan && thamSo.gioiHan < lim) lim = thamSo.gioiHan;
    return layMauDeu(rows, lim);
  };

  const datasets = [
    { key: 'van52', ten: 'Van 5/2 (5 lượt)', tep: 'scripts/ca-do/van-5-2.jsonl', rows: cap(van52All, van52All.length), tongTrongTep: van52All.length, laVan52: true, laS7: false, isOzPrivate: false },
    { key: 'van30', ten: 'Van khí nén 30', tep: 'scripts/ca-do/van-khi-nen-30.jsonl', rows: cap(van30All, 10), tongTrongTep: van30All.length, laVan52: false, laS7: false, isOzPrivate: true },
    { key: 's7', ten: 'S-7 Holdout 300', tep: 'scripts/ca-do/de-rieng-300.jsonl', rows: cap(s7All, 30), tongTrongTep: s7All.length, laVan52: false, laS7: true, isOzPrivate: true },
  ];
  if (boAll) {
    datasets.push({
      key: 'bo',
      ten: `Bộ tuỳ chọn (${path.basename(thamSo.boPath)})`,
      tep: path.basename(thamSo.boPath),
      rows: cap(boAll, 20),
      tongTrongTep: boAll.length,
      laVan52: false,
      laS7: false,
      isOzPrivate: true,
    });
  }

  const chonDatasets = thamSo.chiBo
    ? datasets.filter((d) => thamSo.chiBo.includes(d.key))
    : (boAll ? datasets.filter((d) => d.key === 'bo') : datasets);

  // Lưu trạng thái env & module để hoàn nguyên tuyệt đối
  const envBackup = {};
  const ENV_ISOLATE = ['HS_TIM_TRUOC', 'HS_TIM_TRUOC_NAP', 'HS_TIEN_XU_LY', 'HS_TIM_CGCT', 'HS_SO_TAY', 'HS_CHOT_SOM_CO_KIEM', 'HS_HOI_THEO_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'HS_CLASSIFY_ENGINE', 'HS_LLM_PRIVATE_ALL', 'MIC_OFF', 'ZAI_WEB_FACTS'];
  for (const k of ENV_ISOLATE) envBackup[k] = process.env[k];

  // Ghi nhận nguyên vẹn cờ nền hiện hành từ process.env trước khi thiết lập chế độ offline/private
  const coNen = layThongTinCoNen();

  const origFetch = globalThis.fetch;
  const origCallLlm = llmTier.callLLMJson;
  const origSearchOz = ozSearch.searchOzByKeyword;
  let fetchBiChan = 0;

  const wrapCtx = { current: null };
  const stubLlm = taoLlmGia();
  const providersDaDung = {};

  try {
    if (thamSo.llm === 'gia') {
      // Giữ nguyên mọi cờ HS_* trong process.env để chế độ `nen` đọc đúng env hiện hành;
      // chỉ tắt MIC/ZAI và chặn fetch để đảm bảo chạy ngoại tuyến tuyệt đối.
      process.env.MIC_OFF = '1';
      process.env.ZAI_WEB_FACTS = 'off';

      globalThis.fetch = async () => {
        fetchBiChan += 1;
        throw new Error('OFFLINE: scripts/do-do-thi-gd3.mjs --llm gia không cho phép gọi mạng');
      };
    } else {
      // --llm that: đảm bảo dữ liệu Oz luôn ở chế độ riêng tư (HS_LLM_PRIVATE_ALL=true) nếu chưa đặt.
      if (!process.env.HS_LLM_PRIVATE_ALL) process.env.HS_LLM_PRIVATE_ALL = 'true';
    }

    const baseCaller = thamSo.llm === 'gia' ? stubLlm : origCallLlm;
    llmTier.callLLMJson = async (systemPrompt, userPrompt, callOpts = {}) => {
      const res = await baseCaller(systemPrompt, userPrompt, callOpts);
      const pv = res?.provider ? `${res.provider}/${res.model || '-'}` : 'unknown';
      providersDaDung[pv] = (providersDaDung[pv] || 0) + 1;
      if (wrapCtx.current) {
        wrapCtx.current.calls.push({
          step: callOpts.step || '',
          userLen: String(userPrompt || '').length,
          provider: res?.provider || null,
          model: res?.model || null,
        });
        if (callOpts.step === 'understand' && Array.isArray(res?.json?.hypotheses)) {
          for (const h of res.json.hypotheses) {
            const h4 = nz(h?.heading4).slice(0, 4);
            if (h4.length === 4 && !wrapCtx.current.r1Hyps.includes(h4)) {
              wrapCtx.current.r1Hyps.push(h4);
            }
          }
        }
      }
      return res;
    };

    const chayNen = thamSo.cheDo === 'ca-hai' || thamSo.cheDo === 'nen';
    const chayTat = thamSo.cheDo === 'tat';
    const chayBat = thamSo.cheDo === 'ca-hai' || thamSo.cheDo === 'bat';
    const chayGoi = chayBat && (thamSo.phuongAn === 'goi' || thamSo.phuongAn === 'ca-hai');
    const chayBaBuocFlag = chayBat && (thamSo.phuongAn === 'ba-buoc' || thamSo.phuongAn === 'ca-hai');

    const ketQuaBo = {};

    for (const ds of chonDatasets) {
      if (ds.laS7) {
        ozSearch.searchOzByKeyword = async (query, o = {}) => {
          const r = await origSearchOz(query, { ...o, limit: 50 });
          const filtered = (r.items || []).filter(locOzS7);
          const lim = Math.max(1, Math.min(Number(o.limit) || 10, 50));
          return { query: r.query, total: filtered.length, items: filtered.slice(0, lim) };
        };
      } else {
        ozSearch.searchOzByKeyword = origSearchOz;
      }
      ozSearch.invalidateGoldCache();

      const entry = {
        ten: ds.ten,
        tep: ds.tep,
        n: ds.rows.length,
        tongTrongTep: ds.tongTrongTep,
        nen: null,
        tat: null,
        bat_goi: null,
        bat_ba_buoc: null,
        delta_so_voi: null,
        delta_goi: null,
        delta_ba_buoc: null,
      };

      if (chayNen) {
        const kqLoop = await chayBoQuaClassifyLoop({ caList: ds.rows, cheDo: 'nen', optsRun: thamSo, isOzPrivate: ds.isOzPrivate, wrapCtx });
        entry.nen = {
          ...tinhChiSoBo(kqLoop.banGhis, {
            laVan52: ds.laVan52,
            coUngVienTruocL1: kqLoop.timTruocDangBat,
            coGoiPhanBiet: kqLoop.goiPbDangBat,
          }),
          tongTrongTep: ds.tongTrongTep,
        };
      }
      if (chayTat) {
        const kqLoop = await chayBoQuaClassifyLoop({ caList: ds.rows, cheDo: 'tat', optsRun: thamSo, isOzPrivate: ds.isOzPrivate, wrapCtx });
        entry.tat = { ...tinhChiSoBo(kqLoop.banGhis, { laVan52: ds.laVan52, coUngVienTruocL1: false }), tongTrongTep: ds.tongTrongTep };
      }
      const gocDelta = entry.nen || entry.tat;
      if (gocDelta) entry.delta_so_voi = entry.nen ? 'nen' : 'tat';

      if (chayGoi) {
        const kqLoop = await chayBoQuaClassifyLoop({ caList: ds.rows, cheDo: 'goi', optsRun: thamSo, isOzPrivate: ds.isOzPrivate, wrapCtx });
        entry.bat_goi = { ...tinhChiSoBo(kqLoop.banGhis, { laVan52: ds.laVan52, coUngVienTruocL1: true, coGoiPhanBiet: true }), tongTrongTep: ds.tongTrongTep };
        if (gocDelta) entry.delta_goi = tinhDelta(gocDelta, entry.bat_goi);
      }
      if (chayBaBuocFlag) {
        const logs = await chayBoQuaBaBuoc({
          caList: ds.rows,
          optsRun: thamSo,
          isOzPrivate: ds.isOzPrivate,
          locOzFn: ds.laS7 ? locOzS7 : null,
          llmCaller: llmTier.callLLMJson,
        });
        entry.bat_ba_buoc = { ...tinhChiSoBo(logs, { laVan52: ds.laVan52, coUngVienTruocL1: true, coGoiPhanBiet: true }), tongTrongTep: ds.tongTrongTep };
        if (gocDelta) entry.delta_ba_buoc = tinhDelta(gocDelta, entry.bat_ba_buoc);
      }

      ketQuaBo[ds.key] = entry;
    }

    const llmSt = thamSo.llm === 'that' ? llmTier.llmStatus() : null;
    const chuoiMoHinh = thamSo.llm === 'gia'
      ? {
        cheDo: 'gia',
        moTa: 'LLM giả tất định (offline, 0 gọi mạng)',
        order: ['stub-gd3'],
        privateProviders: ['stub-gd3'],
        daDung: providersDaDung,
      }
      : {
        cheDo: 'that',
        loopModel: process.env.LOOP_MODEL || 'MiniMax-M3',
        loopProvider: process.env.LOOP_PROVIDER || 'minimax-chain',
        llmStepUnderstand: process.env.LLM_STEP_UNDERSTAND || '(mặc định)',
        llmStepGir: process.env.LLM_STEP_GIR || '(mặc định)',
        order: llmSt?.order || [],
        privateProviders: llmSt?.private?.providers || [],
        benchOnly9Router: llmTier.benchOnly9Router(),
        daDung: providersDaDung,
      };

    const danhGia = {
      goi: chayGoi
        ? danhGiaDieuKienGd3({ llm: thamSo.llm, s7Nen: ketQuaBo.s7?.nen, s7Tat: ketQuaBo.s7?.tat, s7Bat: ketQuaBo.s7?.bat_goi, van52Bat: ketQuaBo.van52?.bat_goi })
        : null,
      baBuoc: chayBaBuocFlag
        ? danhGiaDieuKienGd3({ llm: thamSo.llm, s7Nen: ketQuaBo.s7?.nen, s7Tat: ketQuaBo.s7?.tat, s7Bat: ketQuaBo.s7?.bat_ba_buoc, van52Bat: ketQuaBo.van52?.bat_ba_buoc })
        : null,
    };

    const tongMs = Math.round(performance.now() - t0);

    return {
      phienBan: 'gd3-bench@1',
      thoiDiem: new Date().toISOString(),
      gitSha: docGitSha(),
      thamSo,
      chuoiMoHinh,
      co: coNen.tatCaCoTheoDoi,
      coNen,
      mang: {
        daChanFetch: thamSo.llm === 'gia',
        lanGoiFetchBiChan: fetchBiChan,
      },
      s7KiemTra: {
        phienBanDanhSachLoai: dsLoai.raw?.phienBan || null,
        tongDongOzGold: ozGoldLines.length,
        soDongOzBiLoaiS7,
        soDongOzGiuLai: ozGoldLines.length - soDongOzBiLoaiS7,
      },
      dichKeHoach: DICH_GD3,
      ketQua: ketQuaBo,
      danhGiaTieuChiGd3: danhGia,
      tongMs,
    };
  } finally {
    globalThis.fetch = origFetch;
    llmTier.callLLMJson = origCallLlm;
    ozSearch.searchOzByKeyword = origSearchOz;
    ozSearch.invalidateGoldCache();
    for (const [k, v] of Object.entries(envBackup)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/** Định dạng báo cáo Markdown chỉ gồm số liệu tổng hợp (Zero-PII). */
export function dinhDangBaoCaoMarkdown(kq) {
  const shaStr = kq.gitSha?.ngan ? `\`${kq.gitSha.ngan}\`${kq.gitSha.dirty ? ' (dirty)' : ''}` : 'khong-ro';
  const modelOrder = (kq.chuoiMoHinh?.order || []).join(' → ') || '—';
  const usedPv = Object.entries(kq.chuoiMoHinh?.daDung || {}).map(([p, c]) => `${p}:${c}`).join(', ') || '—';

  const coNenMayThatStr = Object.entries(kq.coNen?.coNenMayThat || {})
    .map(([k, v]) => `\`${k}=${v}\``)
    .join(', ')
    || `\`HS_TIM_TRUOC=${kq.co.HS_TIM_TRUOC}\`, \`HS_TIM_TRUOC_NAP=${kq.co.HS_TIM_TRUOC_NAP}\`, \`HS_CHOT_SOM_CO_KIEM=${kq.co.HS_CHOT_SOM_CO_KIEM}\`, \`HS_HOI_THEO_SO_TAY=${kq.co.HS_HOI_THEO_SO_TAY}\`, \`HS_SO_TAY=${kq.co.HS_SO_TAY}\``;

  const lines = [
    `# Đo Giai đoạn 3 — Chọn nhóm 4 số (${kq.thamSo.llm === 'gia' ? 'LLM giả, tự kiểm offline' : 'LLM thật qua kênh đo riêng'})`,
    '',
    `- **Git SHA:** ${shaStr} · **Thời điểm:** ${kq.thoiDiem} · **Tổng thời gian:** ${kq.tongMs} ms`,
    `- **Chuỗi mô hình:** ${modelOrder} · **Đã gọi:** ${usedPv}`,
    `- **Tham số:** \`--llm ${kq.thamSo.llm}\` · \`--che-do ${kq.thamSo.cheDo}\` · \`--phuong-an ${kq.thamSo.phuongAn}\` · S-7 loại ${kq.s7KiemTra.soDongOzBiLoaiS7}/${kq.s7KiemTra.tongDongOzGold} dòng holdout`,
    `- **Cờ nền đang giữ (\`nen\`, đọc nguyên env):** ${coNenMayThatStr}`,
    `- **Cờ bổ sung:** \`HS_CLASSIFY_ENGINE=${kq.co.HS_CLASSIFY_ENGINE}\`, \`HS_TIEN_XU_LY=${kq.co.HS_TIEN_XU_LY}\`, \`HS_LLM_PRIVATE_ALL=${kq.co.HS_LLM_PRIVATE_ALL}\``,
  ];

  if (kq.coNen?.khacMayThat?.length) {
    lines.push(
      `- **Lưu ý cờ nền:** đang đọc nguyên \`process.env\` hiện hành (${kq.coNen.khacMayThat.map((x) => `\`${x.co}=${x.hienHanh}\` ≠ máy thật \`${x.mayThat}\``).join('; ')}).`,
    );
  }

  if (kq.thamSo.llm === 'gia') {
    lines.push(`- **Lưu ý L1:** đang chạy \`--llm gia\` (chặn mạng, ${kq.mang.lanGoiFetchBiChan} fetch bị chặn). Số này chỉ dùng tự kiểm cơ chế trên Mac/CI, KHÔNG dùng thay số đo kênh đo riêng.`);
  }

  lines.push(
    '',
    '## Bảng tổng hợp các bộ mẫu',
    '',
    '| Bộ mẫu | Chế độ | Ca (lỗi) | Đúng nhóm 4 số | Bị loại ở L1 (rủi ro 1) | Ổn định van 5/2 | Trung vị / p95 (s) | Lượt AI/ca | Ký tự V1 (TB) | Ký tự gói PB / V2 (TB) |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  );

  const fmtS = (ms) => (ms / 1000).toFixed(2);
  const fmtPct = (o) => (o && o.mauSo > 0 ? `${o.tyLe.toFixed(1)}% (${o.so}/${o.mauSo})` : '—');
  const fmtVan = (r) => (r.van52 ? `${r.van52.dungNhom8481}/${r.van52.soLuot} \`8481\` (nhất quán ${r.van52.tyLeNhatQuan.toFixed(0)}%)` : '—');

  const inDong = (ten, nhanCheDo, r) => {
    if (!r) return;
    const goiHoacV2 = r.kyTuGoiAi.goiPhanBiet.trungBinh > 0
      ? `${r.kyTuGoiAi.goiPhanBiet.trungBinh} / ${r.kyTuGoiAi.vong2.trungBinh}`
      : `0 / ${r.kyTuGoiAi.vong2.trungBinh}`;
    const v1Str = r.kyTuGoiAi.khoiTimTruoc.trungBinh > 0
      ? `${r.kyTuGoiAi.vong1.trungBinh} (TT ${r.kyTuGoiAi.khoiTimTruoc.trungBinh})`
      : `${r.kyTuGoiAi.vong1.trungBinh}`;
    lines.push(
      `| ${ten} | ${nhanCheDo} | ${r.n}/${r.tongTrongTep} (${r.soLoi}) | ${fmtPct(r.dungNhom4)} | ${fmtPct(r.biLoaiOLuot1)} | ${fmtVan(r)} | ${fmtS(r.doTreMs.medianMs)} / ${fmtS(r.doTreMs.p95Ms)} s | ${r.luotAi.trungBinh} | ${v1Str} | ${goiHoacV2} |`,
    );
  };

  for (const [, bo] of Object.entries(kq.ketQua)) {
    inDong(bo.ten, '`nen` (env)', bo.nen);
    inDong(bo.ten, 'TẮT (tắt tìm trước)', bo.tat);
    inDong(bo.ten, 'BẬT (`goi`)', bo.bat_goi);
    inDong(bo.ten, 'BẬT (`ba-buoc`)', bo.bat_ba_buoc);
  }

  const deltas = [];
  let coNenDelta = false;
  for (const [, bo] of Object.entries(kq.ketQua)) {
    const gocNhan = bo.delta_so_voi === 'tat' ? 'TẮT' : '`nen`';
    if (bo.delta_so_voi === 'nen') coNenDelta = true;
    if (bo.delta_goi) deltas.push([bo.ten, `\`goi\` vs ${gocNhan}`, bo.delta_goi]);
    if (bo.delta_ba_buoc) deltas.push([bo.ten, `\`ba-buoc\` vs ${gocNhan}`, bo.delta_ba_buoc]);
  }
  if (deltas.length) {
    lines.push(
      '',
      coNenDelta ? '## Chênh lệch BẬT − `nen`' : '## Chênh lệch BẬT − TẮT',
      '',
      '| Bộ mẫu | So sánh | Δ đúng nhóm 4 (pp) | Δ trong R1 (pp) | Δ trung vị (ms) | Δ p95 (ms) | Δ lượt AI/ca | Δ ký tự V1 | Δ ký tự V2 |',
      '|---|---|---:|---:|---:|---:|---:|---:|---:|',
    );
    const sgn = (v) => (v > 0 ? `+${v}` : `${v}`);
    for (const [ten, nhan, d] of deltas) {
      lines.push(`| ${ten} | ${nhan} | ${sgn(d.dungNhom4_pp)} | ${sgn(d.coTrongR1_pp)} | ${sgn(d.medianMs)} | ${sgn(d.p95Ms)} | ${sgn(d.luotAiTb)} | ${sgn(d.kyTuV1Tb)} | ${sgn(d.kyTuV2Tb)} |`);
    }
  }

  const dg = kq.danhGiaTieuChiGd3?.goi || kq.danhGiaTieuChiGd3?.baBuoc;
  if (dg) {
    const fmtDg = (v) => (v === true ? 'ĐẠT' : v === false ? 'CHƯA ĐẠT' : 'CHƯA ĐO');
    const nhanGoc = dg.soSanhVoi === 'tat' ? 'nền TẮT' : 'nền (`nen`)';
    lines.push(
      '',
      `## Đối chiếu điều kiện nhận GĐ3 (${dg.chiThamKhaoViLlmGia ? 'chỉ tham khảo — chạy LLM giả' : 'đo LLM thật'})`,
      '',
      `- S-7 hơn ${nhanGoc}: **${fmtDg(dg.s7HonNen)}**`,
      `- Van 5/2 đạt 5/5 nhóm \`8481\`: **${fmtDg(dg.van52Dat55)}**`,
      `- Thời gian trung vị ≤ 45 s: **${fmtDg(dg.trungViDuoi45s)}**`,
      `- Thời gian p95 ≤ 80 s: **${fmtDg(dg.p95Duoi80s)}**`,
    );
  }

  return `${lines.join('\n')}\n`;
}

async function chinh(argv = process.argv.slice(2)) {
  const opts = phanTichThamSo(argv);
  const kq = await chayBenchGd3(opts);
  const md = dinhDangBaoCaoMarkdown(kq);

  if (opts.chePII || opts.baoCaoPath || opts.jsonPath) {
    const ktraMd = kiemTraZeroPii(md);
    if (!ktraMd.sach) {
      console.error(`LỖI ZERO-PII: phát hiện rò rỉ trong báo cáo (${JSON.stringify(ktraMd)})`);
      process.exit(2);
    }
  }

  if (opts.jsonPath) {
    const jsonText = `${JSON.stringify(kq, null, 2)}\n`;
    const ktraJson = kiemTraZeroPii(jsonText);
    if (!ktraJson.sach) {
      console.error(`LỖI ZERO-PII: phát hiện rò rỉ trong JSON (${JSON.stringify(ktraJson)})`);
      process.exit(2);
    }
    fs.mkdirSync(path.dirname(opts.jsonPath), { recursive: true });
    fs.writeFileSync(opts.jsonPath, jsonText, 'utf8');
  }

  if (opts.baoCaoPath) {
    fs.mkdirSync(path.dirname(opts.baoCaoPath), { recursive: true });
    fs.writeFileSync(opts.baoCaoPath, md, 'utf8');
  }

  if (opts.jsonStdout) {
    const jsonText = JSON.stringify(kq, null, 2);
    const ktraJson = kiemTraZeroPii(jsonText);
    if (!ktraJson.sach) {
      console.error(`LỖI ZERO-PII: phát hiện rò rỉ trong JSON (${JSON.stringify(ktraJson)})`);
      process.exit(2);
    }
    console.log(jsonText);
  } else {
    console.log(md);
    if (opts.jsonPath) console.log(`Đã ghi JSON: ${opts.jsonPath}`);
    if (opts.baoCaoPath) console.log(`Đã ghi báo cáo: ${opts.baoCaoPath}`);
  }
  return 0;
}

const duongDanThuc = (p) => {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
};
const laChinh = Boolean(
  process.argv[1]
  && duongDanThuc(path.resolve(process.argv[1])) === duongDanThuc(fileURLToPath(import.meta.url)),
);
if (laChinh) {
  chinh().then((code) => process.exit(code)).catch((e) => {
    console.error(e?.stack || e?.message || String(e));
    process.exit(1);
  });
}
