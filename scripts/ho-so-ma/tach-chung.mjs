// scripts/ho-so-ma/tach-chung.mjs — M-72 / M-73 (#1964, #1965, ADR-0006): phần chung của máy tách vấn đề đơn từ câu luật.
//   dungGoi   gói cho mô hình: câu của nút (S, đánh số, kèm câu dẫn và cạnh M-33), tên anh em (A), câu phía trên được nhắc (R),
//             câu ở nơi khác loại/phân hàng sang nút (V)
//   hoi       hỏi một mô hình (gemma máy nhà qua Ollama, gemini qua agy), lưu đệm theo vân tay lời hỏi — chạy lại không tốn lượt
//   chuanPhieu  đổi đề xuất của mô hình sang bản ghi khuôn ho-so-ma@1 (id câu thật, trích nguyên văn, den/voi là nút thật)
//   ghepPhieu   ghép hai phiếu độc lập: cùng câu + cùng loại + đoạn trích chồng/chứa nhau ⇒ KHOP (trích dài hơn); lệch ⇒ LECH_PHIEU
//   ghiKho      ghi data/ho-so-ma/<thư mục>/<khoá>.jsonl theo nút (thay bản ghi cũ của đúng các nút vừa làm)
// Mô hình chỉ đề xuất; mọi thứ máy kiểm được (id câu, chữ trích, lop, nguon, van, nút đích) do máy làm.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { napLuatCong, loaiCanhVao, chuanSo, vanTay } from './cong.mjs';
import { LOAI, BO_QUA } from './khuon.mjs';

const require = createRequire(import.meta.url);
export const G = require('../../lib/ho-so-ma/ghep.js');
const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const MO = ['gemma', 'agy'];
/** Mô hình thật sau mỗi nhà. agy mặc định Gemini; đổi bằng AGY_MODEL (vd. khi túi Gemini tuần hết) — đệm khoá theo tên mô hình thật. */
export const MAY = { gemma: 'gemma4:31b', agy: process.env.AGY_MODEL || 'gemini-4-hydrogen-high' };
const khoaDem = (mo, q) => `${mo}-${crypto.createHash('sha256').update(`${MAY[mo]}\n${q}`).digest('hex').slice(0, 24)}`;

/** Câu ở "nơi khác" so với nút đích (cùng luật với cổng 2). */
function laNoiKhac(cauId, den, L) {
  const chu = G.chuCuaCau(cauId);
  if (!chu || chu === G.CHUNG) return false;
  if ((G.duongDiNut(chu, L.cay) || []).some((x) => x.nut === den)) return false;
  return !G.trenCua(den, L.cay).includes(chu) && chu !== den;
}

/** Câu dẫn (tối đa 3 tầng) của một câu. */
function cauDan(id, L, kho) {
  const ra = []; let d = kho.get(id)?.dan;
  while (d && ra.length < 3) { ra.unshift(gon(L.chuCau(d))); d = kho.get(d)?.dan; }
  return ra;
}

let KHO_DAN = null;
function napDan(L) {
  if (KHO_DAN) return KHO_DAN;
  KHO_DAN = new Map();
  const tm = path.join(L.thuMuc, 'cau');
  for (const f of fs.readdirSync(tm).filter((x) => x.endsWith('.jsonl'))) {
    for (const l of fs.readFileSync(path.join(tm, f), 'utf8').split('\n')) { if (!l.trim()) continue; const c = JSON.parse(l); if (c.dan) KHO_DAN.set(c.id, { dan: c.dan }); }
  }
  return KHO_DAN;
}

const tenNut = (id, L) => gon(L.cay.theoId.get(id)?.ten ?? L.nut.get(id)?.v ?? '').slice(0, 160) || null;
const thuTuCau = (a, b) => {
  const k = (id) => id.replace(/\d+/g, (d) => d.padStart(5, '0'));
  const ten = (id) => (/^(bieu|chuong|phan):[^:#]+#/.test(id) ? 0 : 1); // câu tên nút trước
  return ten(a) - ten(b) || (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0);
};

/**
 * Gói của một nút: {nut, cap, ten, S:[{k,id,chu,dan[],lop,canh[]}], A:[{k,id,nut,chu}], R:[…], V:[{k,id,chu,dan[],canh}]}.
 * anhEm: có đưa tên anh em (cho TACH_ANH_EM) không.
 */
export function dungGoi(nut, L, { anhEm = true } = {}) {
  const kho = napDan(L);
  const cauNut = [...L.cau.keys()].filter((id) => G.chuCuaCau(id) === nut && !/^tb:/.test(id)).sort(thuTuCau);
  const S = cauNut.map((id, i) => ({
    k: `S${i + 1}`, id, chu: gon(L.chuCau(id)), dan: cauDan(id, L, kho), lop: L.nut.get(L.cau.get(id).nut).lop,
    canh: (L.canhTheoTu.get(id) || []).map((e) => ({ den: e.den, loai: e.trangThai === 'CHUA_RO' ? `CHUA_RO(${e.vi || '?'})` : e.loai, ten: tenNut(e.den, L) })),
  }));
  const A = (anhEm ? G.anhEmCua(nut, L.cay) : []).filter((x) => L.cau.has(`${x}#1`)).map((x, i) => ({ k: `A${i + 1}`, id: `${x}#1`, nut: x, chu: gon(L.chuCau(`${x}#1`)) }));
  const tren = new Set(G.trenCua(nut, L.cay));
  const R = []; const daR = new Set();
  for (const s of S) {
    for (const e of L.canhTheoTu.get(s.id) || []) {
      const chuDen = G.chuCuaCau(`${e.den}#1`);
      if (!(tren.has(chuDen) || chuDen === G.CHUNG)) continue;
      for (const id of L.cau.keys()) {
        if ((id.startsWith(`${e.den}#`) || id.startsWith(`${e.den}:`)) && !daR.has(id) && R.length < 16) { daR.add(id); R.push({ k: `R${R.length + 1}`, id, chu: gon(L.chuCau(id)), dan: cauDan(id, L, kho) }); }
      }
    }
  }
  const V = [];
  for (const e of L.canhTheoDen.get(nut) || []) {
    if (!loaiCanhVao(e) || !L.cau.has(e.tu) || !laNoiKhac(e.tu, nut, L) || V.some((v) => v.id === e.tu)) continue;
    V.push({ k: `V${V.length + 1}`, id: e.tu, chu: gon(L.chuCau(e.tu)), dan: cauDan(e.tu, L, kho), canh: `${e.trangThai === 'CHUA_RO' ? `CHUA_RO(${e.vi})` : e.loai} → ${nut}` });
  }
  return { nut, cap: G.capCuaNut(nut), ten: tenNut(nut, L), S, A, R, V };
}

/** Chia gói thành lượt hỏi: tối đa coS câu S một lượt (giữ con của cùng câu dẫn đi cùng nhau nếu được); A, V ở lượt đầu. */
export function chiaLuot(goi, coS = 18) {
  const luot = []; let cur = [];
  for (const s of goi.S) {
    if (cur.length >= coS && !(cur.length < coS + 6 && s.dan.length && cur[cur.length - 1].dan.join() === s.dan.join())) { luot.push(cur); cur = []; }
    cur.push(s);
  }
  if (cur.length) luot.push(cur);
  if (!luot.length) luot.push([]);
  const dsV = goi.V; const ra = [];
  luot.forEach((S, i) => {
    const R = goi.R.filter((r) => S.some((s) => s.canh.some((c) => r.id.startsWith(`${c.den}#`) || r.id.startsWith(`${c.den}:`))));
    ra.push({ S, A: i === 0 ? goi.A : [], R, V: i === 0 ? dsV.slice(0, 20) : [] });
  });
  for (let j = 20; j < dsV.length; j += 20) ra.push({ S: [], A: [], R: [], V: dsV.slice(j, j + 20) });
  return ra;
}

export const LOI_DAN = `Bạn tách luật phân loại hàng hoá (HS, bản tiếng Việt) thành các VẤN ĐỀ ĐƠN. Chỉ đọc chữ trong gói. Không dùng kiến thức ngoài, không thêm hàng hoá hay điều kiện không có trong chữ, không đoán nhóm theo từ khoá.

Gói gồm:
- NÚT: nút đang làm.
- S1, S2…: câu CỦA NÚT. MỖI câu S phải có mặt trong kết quả ít nhất một lần: một hay nhiều vấn đề, hoặc BO_QUA kèm lý do.
- "câu dẫn": câu đứng trước để hiểu nghĩa (ví dụ "Phần này không bao gồm:"). Không trích câu dẫn; trích chính câu S.
- "cạnh": quan hệ đã kiểm (hai phiếu) từ câu đó tới nút khác, có id đích.
- A1, A2…: tên các ANH EM cùng cha của nút. CHỈ ĐỂ HIỂU, không dùng làm c.
- R1, R2…: câu phía trên mà câu S nhắc tới (định nghĩa, áp dụng). CHỈ ĐỂ HIỂU, không dùng làm c: các câu đó đã được tách ở nút phía trên.
- V1, V2…: câu Ở NƠI KHÁC trong luật đã loại hay phân hàng SANG nút này. MỖI câu V phải có đúng một PHAI_LA với c = V… (hàng nào phải về nút này theo câu đó).

loai (chọn một):
- PHAI_LA: điều kiện hàng phải thoả để vào nút (tên nhóm; "nhóm này bao gồm…"; câu V).
- KHONG_DUOC_LA: hàng bị loại khỏi nút; BẮT BUỘC có den = nơi chuyển tới. Mỗi mục dưới câu dẫn "không bao gồm:" là một KHONG_DUOC_LA. Câu có cạnh LOAI_SANG thì den phải chứa đúng id đích của cạnh.
- TACH_ANH_EM: điểm khác giữa nút và anh em. c LUÔN là câu TÊN CỦA NÚT (câu S tên), trich = đoạn trong tên nút làm nút khác anh em, voi = id MỌI anh em bị tách bởi đúng đoạn đó (một vấn đề cho một đoạn, không lặp một vấn đề cho mỗi anh em). Nút tên "Loại khác" / "các sản phẩm khác": trích chữ "khác" trong tên nút, voi = mọi anh em có tên (phủ định các anh em đó).
- DINH_NGHIA: câu định nghĩa thuật ngữ ("theo mục đích của …, khái niệm … có nghĩa là …").
- NGUONG: chỉ khi luật nêu ngưỡng số có đơn vị; nguong = {"daiLuong","donVi","tu","den","gomTu","gomDen"}, tu/den là số hoặc null (vô cùng); "trên" = không gồm, "không quá"/"tối đa" = gồm.
- CHI_LIET_KE: điều kiện phải cân nhắc, máy không kiểm được: "chủ yếu dùng cho", "đặc tính cơ bản", bộ phận, máy đa chức năng, hàng chưa hoàn chỉnh (Quy tắc 2a), hỗn hợp (Quy tắc 3b), so sánh trọng lượng kim loại chiếm trội.
- BO_QUA: câu không tạo điều kiện: tên Phần/Chương (Quy tắc 1: chỉ để tra cứu); câu dẫn "… không bao gồm:" / "… bao gồm:" đứng một mình (điều kiện nằm ở các mục con); câu giới thiệu chung, mô tả cách sản xuất, công dụng, ví dụ minh hoạ không thêm điều kiện. Câu khái quát chỉ tách khi có điều kiện loại trừ hoặc phải là; còn lại BO_QUA.

Luật viết:
- MỖI vấn đề MỘT điều kiện đơn; câu có nhiều điều kiện thì tách nhiều vấn đề (mỗi nơi chuyển tới khác nhau, mỗi tính chất khác nhau là một vấn đề).
- trich: CHÉP NGUYÊN VĂN một đoạn LIỀN của chính câu c, đúng từng chữ và dấu. Không sửa, không nối hai đoạn, không thêm "…". Đoạn trích phải đủ chữ để nhận ra điều kiện.
- dieuKien: một câu ngắn, một dòng (≤ 200 ký tự), nói đúng một điều kiện; KHONG_DUOC_LA viết dạng "Không phải …".
- den: nơi hàng bị chuyển TỚI, không bao giờ là chính nút hay Chương/Phần chứa nút ("các nhóm trước của Chương này" → liệt kê id từng nhóm đó). id nút: nhóm 85.44 → "bieu:8544"; Chương 85 → "chuong:85"; Phần XVI → "phan:XVI"; Quy tắc 3(b) → "gir:3:b". Ưu tiên id trong "cạnh".
- duKien: dữ kiện cần biết về hàng để xét điều kiện; mỗi mục là cụm chữ CÓ NGUYÊN VĂN trong câu c (ví dụ "chiều dày", "cách điện"). Không có thì [].

Trả về DUY NHẤT một JSON: {"kq":[{"c":"S1","loai":"...","dieuKien":"...","trich":"...","den":[],"voi":[],"duKien":[],"nguong":null,"lyDo":""}]}. BO_QUA chỉ cần c, loai, lyDo.`;

// Quy ước chốt sau thử M-73 (khuôn mục 1, 3): thuatNgu của DINH_NGHIA; nơi chuyển của KHONG_DUOC_LA ở ngoài nút.
const DAN_PC = `- DINH_NGHIA: thêm "thuatNgu" = thuật ngữ được định nghĩa, CHÉP NGUYÊN CHỮ từ câu hoặc câu dẫn (ví dụ "Dây", "kim loại cơ bản", "gốm kim loại"). Mỗi điều kiện đơn của một định nghĩa là một vấn đề riêng, cùng thuatNgu.
- KHONG_DUOC_LA: nơi chuyển (den) phải ở NGOÀI nút. Câu đưa hàng về một Chương / nhóm NẰM TRONG chính nút này (ví dụ Phần XV → Chương 82, 83) là PHAI_LA với den là nút đó, không phải KHONG_DUOC_LA. Câu nói một hàng được trừ ra khỏi một quy tắc (không phải khỏi nút) là CHI_LIET_KE.`;
const DAN_CAP = {
  PHAN: `NÚT là một Phần: tách chú giải Phần (pháp lý) và câu khái quát có điều kiện.\n${DAN_PC}`,
  CHUONG: `NÚT là một Chương: tách chú giải Chương, chú giải phân nhóm và câu khái quát có điều kiện.\n${DAN_PC}`,
  PHAN_CHUONG: 'NÚT là một Phân chương.',
  NHOM: 'NÚT là nhóm 4 số. Tên nhóm (câu S tên) cho PHAI_LA (mỗi điều kiện đơn trong tên một vấn đề; "(trừ …)" trong tên là KHONG_DUOC_LA). Với MỖI anh em A phải có ít nhất một TACH_ANH_EM có voi chứa id anh em đó; c là tên nút (S tên); gom mọi anh em bị tách bởi cùng một đoạn tên vào một voi. Nhóm tên "các sản phẩm khác…" = phủ định các anh em có tên.',
};

/** Lời hỏi của một lượt. */
export function loiHoi(goi, luot) {
  const d = [LOI_DAN, '', DAN_CAP[goi.cap] || '', `NÚT: ${goi.nut} — ${goi.ten || ''}`, ''];
  for (const s of luot.S) {
    d.push(`${s.k} [${s.id}${s.lop === 'HUONG_DAN' ? ', hướng dẫn' : ''}]`);
    for (const x of s.dan) d.push(`  câu dẫn: ${x}`);
    d.push(`  câu: ${s.chu}`);
    for (const c of s.canh) d.push(`  cạnh: ${c.loai} → ${c.den}${c.ten ? ` (${c.ten.slice(0, 90)})` : ''}`);
  }
  if (luot.A.length) { d.push('', 'ANH EM:'); for (const a of luot.A) d.push(`${a.k} ${a.nut}: ${a.chu}`); }
  if (luot.R.length) { d.push('', 'CÂU PHÍA TRÊN ĐƯỢC NHẮC:'); for (const r of luot.R) { d.push(`${r.k} [${r.id}]`); for (const x of r.dan) d.push(`  câu dẫn: ${x}`); d.push(`  câu: ${r.chu}`); } }
  if (luot.V.length) { d.push('', 'CÂU Ở NƠI KHÁC ĐƯA HÀNG VỀ NÚT NÀY:'); for (const v of luot.V) { d.push(`${v.k} [${v.id}] (${v.canh})`); for (const x of v.dan) d.push(`  câu dẫn: ${x}`); d.push(`  câu: ${v.chu}`); } }
  if (!luot.S.length) d.push('', '(Lượt này chỉ có câu V: trả PHAI_LA cho từng câu V.)');
  // Luật thêm chỉ in ở lượt có cạnh PHAN_VE / CHUA_RO (lượt khác giữ nguyên lời hỏi, đệm còn dùng được).
  if (luot.S.some((s) => s.canh.some((c) => /^PHAN_VE|^CHUA_RO\(.*(LOAI_SANG|PHAN_VE)/.test(c.loai) && /^(phan:[IVX]+|chuong:\d{2}|bieu:\d+)$/.test(c.den)))) {
    d.push('', 'LƯU Ý CẠNH PHAN_VE / CHUA_RO: câu có cạnh PHAN_VE (hàng nêu trong câu được phân VỀ đích) hoặc CHUA_RO có LOAI_SANG/PHAN_VE tới một nhóm / Chương / Phần thì KHÔNG được BO_QUA: phải có PHAI_LA hoặc KHONG_DUOC_LA với den chứa đúng id đích đó (kể cả khi đích nêu trong ví dụ), trích đoạn nói hàng nào về đích đó.');
  }
  return d.join('\n');
}

// ---------- Gọi mô hình ----------
const SCHEMA = {
  type: 'object', required: ['kq'],
  properties: { kq: { type: 'array', items: { type: 'object', required: ['c', 'loai'], properties: {
    c: { type: 'string' }, loai: { type: 'string', enum: [...LOAI, BO_QUA] }, dieuKien: { type: 'string' }, trich: { type: 'string' },
    den: { type: 'array', items: { type: 'string' } }, voi: { type: 'array', items: { type: 'string' } }, duKien: { type: 'array', items: { type: 'string' } },
    thuatNgu: { type: 'string' },
    nguong: { type: 'object', properties: { daiLuong: { type: 'string' }, donVi: { type: 'string' }, tu: { type: 'number' }, den: { type: 'number' }, gomTu: { type: 'boolean' }, gomDen: { type: 'boolean' } } },
    lyDo: { type: 'string' },
  } } } },
};
const nghi = (ms) => new Promise((r) => setTimeout(r, ms));

async function hoiGemma(q) {
  const url = process.env.OLLAMA_URL || fs.readFileSync(path.join(os.homedir(), 'ing/ollama.url'), 'utf8').trim();
  const b = { model: 'gemma4:31b', stream: false, think: false, keep_alive: '24h', format: SCHEMA, messages: [{ role: 'user', content: q }], options: { num_ctx: 65536, num_predict: 12000, temperature: 0 } };
  const r = await fetch(`${url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b), signal: AbortSignal.timeout(1800e3) });
  if (!r.ok) throw new Error(`ollama ${r.status}`);
  return (await r.json()).message.content;
}

function hoiAgy(q) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hsm-'));
  return new Promise((res, rej) => {
    const p = spawn(path.join(os.homedir(), '.local/bin/agy'), ['-p', q, '--model', MAY.agy], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let o = ''; let e = '';
    const t = setTimeout(() => p.kill('SIGTERM'), 900e3);
    p.stdout.on('data', (x) => { o += x; }); p.stderr.on('data', (x) => { e += x; });
    p.on('close', (code) => { clearTimeout(t); fs.rmSync(cwd, { recursive: true, force: true }); if (/429|RESOURCE_EXHAUSTED|quota/i.test(`${e}\n${o.slice(0, 400)}`) && !/"kq"/.test(o)) rej(Object.assign(new Error(`agy 429: ${(e || o).slice(0, 160)}`), { hetHanMuc: true })); else if (!/\{/.test(o)) rej(new Error(`agy mã ${code}: ${(e || o).slice(0, 200)}`)); else res(o); });
  });
}

/** Rút JSON {kq:[…]} từ chữ trả về. */
export function rutJson(t) {
  const s = String(t); const i = s.indexOf('{'); const j = s.lastIndexOf('}');
  if (i < 0 || j < i) throw new Error('không có JSON');
  const x = JSON.parse(s.slice(i, j + 1));
  if (!Array.isArray(x.kq)) throw new Error('JSON thiếu kq');
  return x.kq;
}

/** Hỏi một mô hình, có đệm. Trả {kq, tuDem, giay}. Ghi nhật ký lượt vào <viec>/luot.jsonl. */
export async function hoi(mo, q, viec) {
  const k = khoaDem(mo, q);
  const tep = path.join(viec, 'dem', `${k}.json`);
  if (fs.existsSync(tep)) return { kq: JSON.parse(fs.readFileSync(tep, 'utf8')).kq, tuDem: true, giay: 0 };
  fs.mkdirSync(path.dirname(tep), { recursive: true });
  for (let lan = 1; ; lan += 1) {
    const t0 = Date.now();
    try {
      const tho = mo === 'gemma' ? await hoiGemma(q) : await hoiAgy(q);
      const kq = rutJson(tho);
      const giay = Math.round((Date.now() - t0) / 1000);
      fs.writeFileSync(tep, JSON.stringify({ mo, may: MAY[mo], kq, tho }, null, 0));
      fs.appendFileSync(path.join(viec, 'luot.jsonl'), `${JSON.stringify({ mo, may: MAY[mo], k, giay, lan, dai: q.length, soKq: kq.length, luc: new Date().toISOString() })}\n`);
      return { kq, tuDem: false, giay };
    } catch (e) {
      fs.appendFileSync(path.join(viec, 'luot.jsonl'), `${JSON.stringify({ mo, k, loi: String(e.message).slice(0, 200), lan, giay: Math.round((Date.now() - t0) / 1000), luc: new Date().toISOString() })}\n`);
      if (e.hetHanMuc) { // hết hạn mức: chờ, không xoay tài khoản; đặt lại quá 2 giờ thì dừng, báo rõ
        const h = /Resets in (\d+)h/.exec(e.message); if (h && Number(h[1]) >= 2) throw new Error(`${MAY[mo]} hết hạn mức, đặt lại sau ${h[1]} giờ`);
        await nghi(15 * 60e3); continue;
      }
      if (lan >= 3) throw e;
      await nghi(20e3);
    }
  }
}

// ---------- Chuẩn hoá đề xuất ----------
/** "85.44" / "nhóm 85.44" / "bieu:8544" / "Chương 85" / "Phần XVI" / "gir:3:b" → id nút có thật, hoặc null. */
export function chuanDich(s, L) {
  const t = gon(s).replace(/^nhóm\s+|^phân nhóm\s+/i, '');
  let m; let id = null;
  if (/^(?:phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{2,8}(?::td\d+)*|gir:[1-6](?::[a-c])?)$/.test(t)) id = t;
  else if ((m = /^(?:chương)\s*(\d{1,2})$/i.exec(t))) id = `chuong:${m[1].padStart(2, '0')}`;
  else if ((m = /^(?:phần)\s*([IVX]+)$/i.exec(t))) id = `phan:${m[1]}`;
  else if ((m = /^(\d{2})\.?(\d{2})(?:\.?(\d{2}))?(?:\.?(\d{2}))?$/.exec(t))) id = `bieu:${m.slice(1).filter(Boolean).join('')}`;
  else if ((m = /^quy tắc\s*([1-6])\s*(?:\(?([a-c])\)?)?$/i.exec(t))) id = `gir:${m[1]}${m[2] ? `:${m[2]}` : ''}`;
  if (!id) return null;
  if (/^bieu:\d{2}$/.test(id)) id = `chuong:${id.slice(5)}`;
  const coThat = L.cay.theoId.has(id) || L.nut.has(id) || (/^chuong:\d{2}$/.test(id) && !!G.duongDiNut(id, L.cay)) || /^phan:[IVX]+$/.test(id) || /^gir:/.test(id);
  return coThat ? id : null;
}

/** Tìm đoạn trích trong câu (đã chuẩn hoá). Trả {trich, tu, den} với trich là chữ nguyên văn của câu, hoặc null. */
export function timTrich(trich, chu) {
  const cs = chuanSo(chu); let t = chuanSo(String(trich || '').replace(/^["“'…\s.]+|["”'…\s]+$/g, ''));
  if (!t) return null;
  let i = cs.indexOf(t);
  if (i < 0) { i = cs.toLowerCase().indexOf(t.toLowerCase()); }
  if (i < 0 && t.replace(/[.;:,]+$/, '') !== t) { t = t.replace(/[.;:,]+$/, ''); i = cs.indexOf(t); }
  if (i < 0 && t.includes(cs)) return { trich: cs, tu: 0, den: cs.length, sua: 'trich dài hơn câu, lấy cả câu' };
  if (i < 0 && /\.\.\.|…/.test(t)) { // mô hình nối đoạn bằng "…": giữ đoạn nguyên văn dài nhất
    const doan = t.split(/\s*(?:\.\.\.|…)\s*/).map((x) => x.trim()).filter((x) => x.length >= 3 && cs.includes(x)).sort((a, b) => b.length - a.length)[0];
    if (doan) { const k = cs.indexOf(doan); return { trich: doan, tu: k, den: k + doan.length, sua: 'bỏ dấu lược, giữ đoạn nguyên văn dài nhất' }; }
  }
  if (i < 0) return null;
  return { trich: cs.slice(i, i + t.length), tu: i, den: i + t.length };
}

/** Đề xuất thô của một mô hình cho một lượt → danh sách đề xuất chuẩn {mo, nut, cau, loai, …, _tu, _den} + lỗi. */
export function chuanPhieu(mo, kq, goi, luot, L) {
  const bang = new Map();
  for (const s of luot.S) bang.set(s.k, { ...s, vai: 'S' });
  for (const a of luot.A) bang.set(a.k, { ...a, vai: 'A' });
  for (const r of luot.R) bang.set(r.k, { ...r, vai: 'R' });
  for (const v of luot.V) bang.set(v.k, { ...v, vai: 'V' });
  const anhEm = new Set(G.anhEmCua(goi.nut, L.cay));
  const ra = []; const loi = [];
  for (const p of kq) {
    const c = bang.get(gon(p.c).replace(/^\[|\]$/g, ''));
    if (!c) { loi.push(`${mo}: c lạ "${p.c}"`); continue; }
    const loai = gon(p.loai);
    if (loai === BO_QUA) {
      if (c.vai !== 'S') { loi.push(`${mo}: BO_QUA cho ${c.k} (chỉ câu S)`); continue; }
      ra.push({ mo, nut: goi.nut, cau: c.id, loai, lyDo: gon(p.lyDo) || 'Câu không tạo điều kiện (mô hình không ghi lý do)' });
      continue;
    }
    if (!LOAI.includes(loai)) { loi.push(`${mo}: loai lạ "${p.loai}" ở ${c.k}`); continue; }
    if (c.vai === 'V' && loai !== 'PHAI_LA') { loi.push(`${mo}: câu V ${c.k} chỉ nhận PHAI_LA, nhận ${loai}`); continue; }
    if (c.vai === 'A' && !['TACH_ANH_EM', 'NGUONG'].includes(loai)) { loi.push(`${mo}: câu anh em ${c.k} chỉ nhận TACH_ANH_EM / NGUONG, nhận ${loai}`); continue; }
    if (c.vai === 'A') { loi.push(`${mo}: bỏ vấn đề trích tên anh em ${c.k} — TACH_ANH_EM trích tên của chính nút`); continue; }
    if (c.vai === 'R') { loi.push(`${mo}: bỏ vấn đề trích câu phía trên ${c.k} (${c.id}) — câu đó tách ở nút của nó`); continue; }
    const t = timTrich(p.trich, L.chuCau(c.id));
    if (!t) { loi.push(`${mo}: trích không nguyên văn ${c.id} — "${gon(p.trich).slice(0, 80)}"`); continue; }
    const x = { mo, nut: goi.nut, cau: c.id, loai, dieuKien: gon(p.dieuKien).slice(0, 300), trich: t.trich, _tu: t.tu, _den: t.den };
    if (!x.dieuKien) { loi.push(`${mo}: thiếu dieuKien ở ${c.k}`); continue; }
    if (c.vai === 'V') x.tu = c.id;
    const trenNut = new Set([goi.nut, ...G.trenCua(goi.nut, L.cay)]);
    const denTren = (p.den || []).map((d) => chuanDich(d, L)).filter((d) => d && trenNut.has(d));
    if (denTren.length) loi.push(`${mo}: bỏ den là chính nút / nút chứa nó ${denTren.join(', ')} (${c.k})`);
    let den = [...new Set((p.den || []).map((d) => chuanDich(d, L)).filter((d) => d && !trenNut.has(d)))];
    let loaiThat = loai; let doiLoai = null;
    if (loai === 'KHONG_DUOC_LA' && den.length) { // nơi chuyển nằm trong chính nút (khuôn: KHONG_DUOC_LA chuyển ra ngoài)
      const trong = den.filter((d) => G.trenCua(d, L.cay).includes(goi.nut));
      if (trong.length === den.length) { loaiThat = 'PHAI_LA'; doiLoai = `Máy đổi KHONG_DUOC_LA → PHAI_LA: nơi chuyển ${trong.join(', ')} nằm trong chính ${goi.nut}`; } else if (trong.length) { den = den.filter((d) => !trong.includes(d)); loi.push(`${mo}: bỏ den nằm trong chính nút ${trong.join(', ')} (${c.k})`); }
    }
    if (doiLoai) { x.loai = loaiThat; x._doiLoai = doiLoai; }
    const denLa = (p.den || []).filter((d) => !chuanDich(d, L));
    if (denLa.length) loi.push(`${mo}: bỏ den không có thật ${denLa.join(', ')} (${c.k})`);
    if (['KHONG_DUOC_LA', 'PHAI_LA', 'CHI_LIET_KE'].includes(loaiThat) && den.length) x.den = den;
    if (loai === 'DINH_NGHIA') {
      const tn = gon(p.thuatNgu); const nen = chuanSo(`${L.chuCau(c.id)} ${(c.dan || []).join(' ')}`).toLowerCase();
      if (!tn || !nen.includes(chuanSo(tn).toLowerCase())) { loi.push(`${mo}: DINH_NGHIA thiếu thuatNgu nguyên chữ ở ${c.k} ("${tn}")`); continue; }
      x.thuatNgu = tn;
    }
    if (loai === 'KHONG_DUOC_LA' && !den.length) { loi.push(`${mo}: KHONG_DUOC_LA không có den hợp lệ ở ${c.k}`); continue; }
    if (['TACH_ANH_EM', 'NGUONG'].includes(loai)) {
      const voi = [...new Set((p.voi || []).map((d) => chuanDich(d, L) || gon(d)).filter((d) => anhEm.has(d)))];
      if (c.vai === 'A' && !voi.includes(c.nut)) voi.push(c.nut);
      if (voi.length) x.voi = voi;
      if (loai === 'TACH_ANH_EM' && !voi.length) { loi.push(`${mo}: TACH_ANH_EM không có voi là anh em ở ${c.k}`); continue; }
    }
    if (loai === 'NGUONG') {
      const n = p.nguong || {}; const so = (v) => (v === null || v === undefined || v === '' ? null : Number(String(v).replace(',', '.')));
      const ng = { daiLuong: gon(n.daiLuong), donVi: n.donVi ? gon(n.donVi) : null, tu: so(n.tu), den: so(n.den), gomTu: !!n.gomTu, gomDen: !!n.gomDen };
      if (!ng.daiLuong || (ng.tu === null && ng.den === null) || [ng.tu, ng.den].some((v) => v !== null && !Number.isFinite(v))) { loi.push(`${mo}: NGUONG hỏng ở ${c.k}`); continue; }
      x.nguong = ng;
    }
    const csThuong = chuanSo(L.chuCau(c.id)).toLowerCase();
    x.duKien = [...new Set((p.duKien || []).map(gon).filter((d) => d && csThuong.includes(chuanSo(d).toLowerCase())))];
    ra.push(x);
  }
  return { ra, loi };
}

// ---------- Ghép hai phiếu ----------
const chongNhau = (a, b) => a._tu < b._den && b._tu < a._den;
const giao = (a, b) => (a && b ? a.filter((x) => b.includes(x)) : a || b);
const gonPhieu = (p) => Object.fromEntries(Object.entries({ mo: MAY[p.mo] || p.mo, loai: p.loai, thuatNgu: p.thuatNgu, dieuKien: p.dieuKien, trich: p.trich, den: p.den, voi: p.voi, duKien: p.duKien?.length ? p.duKien : undefined, nguong: p.nguong, lyDo: p.lyDo }).filter(([, v]) => v !== undefined));

/**
 * Ghép phiếu của hai mô hình cho một nút. Trả danh sách bản ghi chưa có id/van/lop/nguon (máy điền sau) và thống kê.
 * KHOP: cùng câu + cùng loại + đoạn trích chồng / chứa nhau (+ den, voi có phần chung khi cả hai có) — lấy trích dài hơn.
 */
/**
 * Gộp trong MỘT phiếu các đề xuất TACH_ANH_EM / KHONG_DUOC_LA cùng nút, cùng câu mà đoạn trích chồng nhau: chúng là một điều kiện
 * (một đoạn chữ) mà mô hình chia theo từng anh em / từng nơi chuyển tới. Trích = hợp đoạn (vẫn liền, nguyên văn), voi / den = hợp.
 */
export function gopTrongPhieu(ds, L, dsKhac = []) {
  // Cụm = các đề xuất cùng nút, câu, loại nối nhau bằng đoạn trích chồng nhau, xét qua CẢ HAI phiếu (một đề xuất dài của phiếu
  // kia có thể nối hai đoạn rời của phiếu này: "các bộ phận của máy móc" + "phương tiện giao thông"); mỗi phiếu gộp phần của mình.
  const ra = []; const da = new Set(); const tatCa = [...ds, ...dsKhac];
  for (const p of ds) {
    if (da.has(p)) continue;
    if (!['TACH_ANH_EM', 'KHONG_DUOC_LA'].includes(p.loai)) { ra.push(p); continue; }
    const cum = [p]; da.add(p); const daCum = new Set([p]);
    for (let doi = true; doi;) {
      doi = false;
      for (const q of tatCa) if (!daCum.has(q) && q.loai === p.loai && q.nut === p.nut && q.cau === p.cau && cum.some((r) => chongNhau(r, q))) { cum.push(q); daCum.add(q); doi = true; }
    }
    const nhom = cum.filter((q) => ds.includes(q)); nhom.forEach((q) => da.add(q));
    if (nhom.length === 1) { ra.push(p); continue; }
    const tu = Math.min(...nhom.map((q) => q._tu)); const den = Math.max(...nhom.map((q) => q._den));
    const dai = nhom.reduce((a, b) => (b._den - b._tu > a._den - a._tu ? b : a));
    const hop = (k) => { const v = [...new Set(nhom.flatMap((q) => q[k] || []))]; return v.length ? v : undefined; };
    const x = { ...dai, trich: chuanSo(L.chuCau(p.cau)).slice(tu, den), _tu: tu, _den: den, duKien: hop('duKien') || [] };
    if (hop('voi')) x.voi = hop('voi'); if (hop('den')) x.den = hop('den');
    ra.push(x);
  }
  return ra;
}

export function ghepPhieu(dsA, dsB) {
  const ra = []; const tk = { khop: 0, lechHaiBen: 0, lechMotBen: 0, boQua: 0 };
  const dungA = new Set(); const dungB = new Set();
  const vdA = dsA.filter((x) => x.loai !== BO_QUA); const vdB = dsB.filter((x) => x.loai !== BO_QUA);
  // DINH_NGHIA: so theo thuatNgu (khuôn mục 3). Cụm = cùng nút, câu, thuatNgu, đoạn trích chồng nhau, qua cả hai phiếu; cụm có
  // đủ hai phiếu ⇒ KHOP, giữ cách tách của phiếu chia mịn hơn (mỗi điều kiện đơn một bản), phiếu kia ở `phieu`.
  const tnKhoa = (x) => `${x.nut}|${x.cau}|${chuanSo(x.thuatNgu || '').toLowerCase()}`;
  const dn = [...vdA, ...vdB].filter((x) => x.loai === 'DINH_NGHIA');
  const daDn = new Set();
  for (const p of dn) {
    if (daDn.has(p)) continue;
    const cum = [p]; daDn.add(p);
    for (let doi = true; doi;) { doi = false; for (const q of dn) if (!daDn.has(q) && tnKhoa(q) === tnKhoa(p) && cum.some((r) => chongNhau(r, q))) { cum.push(q); daDn.add(q); doi = true; } }
    const cuaA = cum.filter((q) => vdA.includes(q)); const cuaB = cum.filter((q) => vdB.includes(q));
    if (!cuaA.length || !cuaB.length) continue;
    const [min, kia] = cuaA.length > cuaB.length || (cuaA.length === cuaB.length && cuaA[0].mo === 'agy') ? [cuaA, cuaB] : [cuaB, cuaA];
    for (const q of cum) (vdA.includes(q) ? dungA : dungB).add(q);
    for (const q of min) { ra.push({ nut: q.nut, loai: 'DINH_NGHIA', dieuKien: q.dieuKien, trich: q.trich, cau: q.cau, thuatNgu: q.thuatNgu, duKien: q.duKien, trangThai: 'KHOP', phieu: [gonPhieu(q), ...kia.map(gonPhieu)] }); tk.khop += 1; }
  }
  for (const a of vdA) {
    if (dungA.has(a)) continue;
    let tot = null;
    for (const b of vdB) {
      if (dungB.has(b) || b.cau !== a.cau || b.loai !== a.loai || b.nut !== a.nut || !chongNhau(a, b)) continue;
      if ((a.den && b.den && !giao(a.den, b.den).length) || (a.voi && b.voi && !giao(a.voi, b.voi).length)) continue;
      const doChong = Math.min(a._den, b._den) - Math.max(a._tu, b._tu);
      if (!tot || doChong > tot.doChong) tot = { b, doChong };
    }
    if (!tot) continue;
    const { b } = tot; dungA.add(a); dungB.add(b);
    const goc = (b._den - b._tu) > (a._den - a._tu) ? b : a; // trích dài hơn
    const x = { nut: a.nut, loai: a.loai, dieuKien: goc.dieuKien, trich: goc.trich, cau: a.cau };
    if (a.tu) x.tu = a.tu;
    const den = giao(a.den, b.den); if (den?.length) x.den = den;
    const voi = giao(a.voi, b.voi); if (voi?.length) x.voi = voi;
    if (goc.nguong) x.nguong = goc.nguong;
    if (goc.thuatNgu) x.thuatNgu = goc.thuatNgu;
    x.duKien = goc.duKien; x.trangThai = 'KHOP'; x.phieu = [gonPhieu(a), gonPhieu(b)];
    if (a._doiLoai || b._doiLoai) { x.trangThai = 'LECH_PHIEU'; x.ghiChu = a._doiLoai || b._doiLoai; }
    if (a.loai === 'NGUONG' && JSON.stringify(a.nguong) !== JSON.stringify(b.nguong)) { // ngưỡng lệch: bản chính lấy phiếu agy, cả hai giữ ở phieu
      const g2 = a.mo === 'agy' ? a : b; Object.assign(x, { dieuKien: g2.dieuKien, trich: g2.trich, nguong: g2.nguong, duKien: g2.duKien });
      x.trangThai = 'LECH_PHIEU'; tk.lechHaiBen += 1;
    } else tk.khop += 1;
    ra.push(x);
    // voi / den chỉ một phiếu nêu: tách ra bản LECH_PHIEU riêng, cùng câu, cùng trích (giữ đề xuất cho người đọc).
    for (const truong of ['voi', 'den']) {
      if (!a[truong] || !b[truong]) continue;
      for (const p of [a, b]) {
        const du = p[truong].filter((v) => !(x[truong] || []).includes(v));
        if (!du.length) continue;
        const y = { ...x, [truong]: du, dieuKien: p.dieuKien, trich: p.trich, duKien: p.duKien, trangThai: 'LECH_PHIEU', phieu: [gonPhieu(p), { mo: MAY[p.mo === 'agy' ? 'gemma' : 'agy'], loai: p.loai, [truong]: (p === a ? b : a)[truong], ghiChu: `không nêu ${du.join(', ')}` }] };
        ra.push(y); tk.lechMotBen += 1;
      }
    }
  }
  // Còn lại: gom các đề xuất chồng đoạn trên cùng câu (khác loại hoặc den/voi rời nhau) vào một bản LECH_PHIEU; không ai chồng thì một bên.
  const conLai = [...vdA.filter((x) => !dungA.has(x)), ...vdB.filter((x) => !dungB.has(x))];
  const daGom = new Set();
  for (const p of conLai) {
    if (daGom.has(p)) continue;
    const nhom = [p, ...conLai.filter((q) => q !== p && !daGom.has(q) && q.mo !== p.mo && q.cau === p.cau && q.nut === p.nut && chongNhau(p, q))].slice(0, 2);
    nhom.forEach((q) => daGom.add(q));
    const goc = nhom.find((q) => q.mo === 'agy') || nhom[0];
    const x = { nut: goc.nut, loai: goc.loai, dieuKien: goc.dieuKien, trich: goc.trich, cau: goc.cau };
    if (goc.tu) x.tu = goc.tu; if (goc.den) x.den = goc.den; if (goc.voi) x.voi = goc.voi; if (goc.nguong) x.nguong = goc.nguong;
    if (goc.thuatNgu) x.thuatNgu = goc.thuatNgu; if (goc._doiLoai) x.ghiChu = goc._doiLoai;
    x.duKien = goc.duKien; x.trangThai = 'LECH_PHIEU';
    const khac = MO.filter((m) => !nhom.some((q) => q.mo === m));
    x.phieu = [...nhom.map(gonPhieu), ...khac.map((m) => ({ mo: MAY[m], loai: [...dsA, ...dsB].some((q) => q.mo === m && q.cau === goc.cau && q.loai === BO_QUA) ? BO_QUA : 'KHONG_CO' }))];
    if (nhom.length > 1) tk.lechHaiBen += 1; else tk.lechMotBen += 1;
    ra.push(x);
  }
  // BỎ QUA: câu S mà không còn vấn đề nào, có ít nhất một phiếu BO_QUA.
  const coVanDe = new Set(ra.map((x) => x.cau));
  const bq = new Map();
  for (const p of [...dsA, ...dsB].filter((x) => x.loai === BO_QUA)) { if (!bq.has(p.cau)) bq.set(p.cau, []); bq.get(p.cau).push(p); }
  for (const [cau, ps] of bq) {
    if (coVanDe.has(cau)) continue;
    const goc = ps.find((q) => q.mo === 'agy') || ps[0];
    const x = { nut: goc.nut, loai: BO_QUA, cau, lyDo: goc.lyDo };
    if (new Set(ps.map((q) => q.mo)).size < 2) x.ghiChu = `Chỉ phiếu ${MAY[goc.mo]} ghi BỎ QUA; phiếu kia không trả câu này`;
    tk.boQua += 1; ra.push(x);
  }
  return { ra, tk };
}

/** Điền id, van, lop, nguon; xếp theo thứ tự câu. Trả bản ghi khuôn ho-so-ma@1. */
export function hoanTat(ds, L) {
  const thu = (x) => (x.loai === BO_QUA ? 0 : 1);
  const xep = [...ds].sort((a, b) => (a.nut < b.nut ? -1 : a.nut > b.nut ? 1 : 0) || thuTuCau(a.cau, b.cau) || thu(a) - thu(b) || LOAI.indexOf(a.loai) - LOAI.indexOf(b.loai) || a.trich?.localeCompare(b.trich || '') || 0);
  const dem = new Map(); const ra = [];
  for (const x of xep) {
    const k = (dem.get(x.nut) || 0) + 1; dem.set(x.nut, k);
    const n = L.nut.get(L.cau.get(x.cau).nut);
    const van = vanTay(L.chuCau(x.cau));
    if (x.loai === BO_QUA) { ra.push({ id: `hs:${x.nut}:${k}`, nut: x.nut, loai: BO_QUA, cau: x.cau, lyDo: x.lyDo, van, ...(x.ghiChu ? { ghiChu: x.ghiChu } : {}) }); continue; }
    const r = { id: `hs:${x.nut}:${k}`, nut: x.nut, loai: x.loai, dieuKien: x.dieuKien, trich: x.trich, cau: x.cau };
    if (x.tu) r.tu = x.tu; if (x.den) r.den = x.den; if (x.voi) r.voi = x.voi; if (x.nguong) r.nguong = x.nguong; if (x.thuatNgu) r.thuatNgu = x.thuatNgu;
    Object.assign(r, { duKien: x.duKien || [], lop: n.lop, nguon: n.nguon, van, trangThai: x.trangThai });
    if (x.phieu) r.phieu = x.phieu; if (x.ghiChu) r.ghiChu = x.ghiChu;
    // Chốt máy (lỗi bắt khi đọc tay M-73): PHAI_LA của chính nút mà đoạn trích gọi tên một nhóm KHÁC (không phải nút, không phải
    // nút trên / dưới nó) là câu nói về hàng của nơi khác ⇒ không nhận KHOP, để người đọc.
    if (r.loai === 'PHAI_LA' && !r.tu && r.trangThai === 'KHOP') {
      const so = G.soBieu(r.nut) || '';
      const khac = [...r.trich.matchAll(/nhóm\s+(\d{2})\.(\d{2})/gi)].map((m) => m[1] + m[2]).filter((n) => so.length >= 4 ? !n.startsWith(so.slice(0, 4)) : !(so && n.startsWith(so)) && !(r.nut.startsWith('chuong:') && n.startsWith(r.nut.slice(7, 9))));
      if (khac.length && !r.nut.startsWith('phan:')) { r.trangThai = 'LECH_PHIEU'; r.ghiChu = `Máy hạ: PHAI_LA trích chữ nhắc nhóm khác (${khac.join(', ')}), có thể là hàng của nơi khác`; }
    }
    // Chốt máy 2 (đọc tay Phần XV): KHONG_DUOC_LA mà mọi nơi chuyển tới nằm BÊN TRONG chính nút (Phần XV → Chương 72, 82;
    // "loại trừ hợp kim fero (72.02)") là câu phân về bên trong hoặc loại khỏi một nút con, không phải loại khỏi nút này.
    if (r.loai === 'KHONG_DUOC_LA' && r.trangThai === 'KHOP' && r.den.every((d) => G.trenCua(d, L.cay).includes(r.nut))) {
      r.trangThai = 'LECH_PHIEU'; r.ghiChu = `Máy hạ: nơi chuyển tới (${r.den.join(', ')}) nằm trong chính ${r.nut} — không phải loại khỏi nút; xem lại loại (PHAI_LA / nút đúng)`;
    }
    // Chốt máy 3: đích bị phủ định ngay trong trích ("không phải nhóm 73.22", "không được phân loại 87.08") thì không phải nơi chuyển tới.
    if (r.loai === 'KHONG_DUOC_LA' && r.trangThai === 'KHOP') {
      const phuDinh = r.den.filter((d) => { const m = /^bieu:(\d{2})(\d{2})$/.exec(d); return m && new RegExp(`(?<!chân )không (?:phải|được)[^.;()]{0,30}${m[1]}\\.${m[2]}`, 'i').test(r.trich); });
      if (phuDinh.length) { r.trangThai = 'LECH_PHIEU'; r.ghiChu = `Máy hạ: den ${phuDinh.join(', ')} bị phủ định trong trích ("không … ${phuDinh.map((d) => `${d.slice(5, 7)}.${d.slice(7)}`).join(', ')}") — den phải là nơi hàng được chuyển tới`; }
    }
    ra.push(r);
  }
  return ra;
}

/** Tệp đích của một bản ghi theo khuôn mục 4: NGUONG → nguong/, CHI_LIET_KE → liet-ke/, còn lại theo cấp. */
export function tepCua(x) {
  const tm = x.loai === 'NGUONG' ? 'nguong' : x.loai === 'CHI_LIET_KE' ? 'liet-ke' : G.thuMucCuaNut(x.nut);
  return `${tm}/${G.tepCuaNut(x.nut, tm)}.jsonl`;
}

/** Ghi bản ghi vào kho: bỏ mọi bản ghi cũ của các nút trong `nuts`, thêm bản ghi mới. Trả danh sách tệp đã đụng. */
export function ghiKho(banGhi, nuts, hoSo = G.HO_SO_MAC_DINH) {
  const nutSet = new Set(nuts); const theoTep = new Map();
  for (const x of banGhi) { const t = tepCua(x); if (!theoTep.has(t)) theoTep.set(t, []); theoTep.get(t).push(x); }
  const dung = new Set(theoTep.keys());
  for (const tm of G.THU_MUC) {
    const d = path.join(hoSo, tm); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) { const t = `${tm}/${f}`; const cu = G.docJsonl(path.join(d, f)); if (cu.some((x) => nutSet.has(x.nut))) dung.add(t); }
  }
  for (const t of dung) {
    const tep = path.join(hoSo, t);
    const cu = G.docJsonl(tep).filter((x) => !nutSet.has(x.nut));
    const moi = [...cu, ...(theoTep.get(t) || [])];
    fs.mkdirSync(path.dirname(tep), { recursive: true });
    if (moi.length) fs.writeFileSync(tep, `${moi.map((x) => JSON.stringify(x)).join('\n')}\n`); else fs.rmSync(tep, { force: true });
  }
  return [...dung].sort();
}

/** Chạy trọn: dựng gói từng nút, hỏi hai mô hình (song song giữa hai nhà, tuần tự trong một nhà), ghép, ghi. */
export async function chay({ nuts, viec, hoSo = G.HO_SO_MAC_DINH, luat = G.LUAT_MAC_DINH, anhEm = (nut) => G.capCuaNut(nut) === 'NHOM', chiGhep = false, coS = 18, mo = MO, log = console.log }) {
  const L = napLuatCong(luat);
  fs.mkdirSync(viec, { recursive: true });
  const viecs = [];
  for (const nut of nuts) {
    const goi = dungGoi(nut, L, { anhEm: anhEm(nut) });
    for (const [i, luot] of chiaLuot(goi, coS).entries()) viecs.push({ goi, luot, i, q: loiHoi(goi, luot) });
    log(`${nut}: ${goi.S.length} câu S, ${goi.A.length} anh em, ${goi.R.length} câu trên, ${goi.V.length} câu đi vào`);
  }
  log(`${viecs.length} lượt mỗi mô hình`);
  const kq = new Map(); const loiMay = [];
  const chayNha = async (m) => {
    for (const v of viecs) {
      const k = `${m}|${v.goi.nut}|${v.i}`;
      if (chiGhep) {
        const tep = path.join(viec, 'dem', `${khoaDem(m, v.q)}.json`);
        if (fs.existsSync(tep)) kq.set(k, JSON.parse(fs.readFileSync(tep, 'utf8')).kq); else loiMay.push(`${k}: chưa có phiếu trong đệm`);
        continue;
      }
      try { const r = await hoi(m, v.q, viec); kq.set(k, r.kq); log(`  ${m} ${v.goi.nut} lượt ${v.i + 1}: ${r.kq.length} mục${r.tuDem ? ' (đệm)' : `, ${r.giay}s`}`); } catch (e) { loiMay.push(`${k}: ${e.message}`); log(`  ${m} ${v.goi.nut} lượt ${v.i + 1}: LỖI ${e.message}`); }
    }
  };
  await Promise.all(mo.map(chayNha));
  const tatCa = []; const tk = { khop: 0, lechHaiBen: 0, lechMotBen: 0, boQua: 0 }; const loiPhieu = [];
  for (const nut of nuts) {
    const ps = { gemma: [], agy: [] };
    for (const v of viecs.filter((x) => x.goi.nut === nut)) {
      for (const m of mo) {
        const r = kq.get(`${m}|${nut}|${v.i}`); if (!r) continue;
        const c = chuanPhieu(m, r, v.goi, v.luot, L); ps[m].push(...c.ra); loiPhieu.push(...c.loi.map((l) => `${nut} lượt ${v.i + 1}: ${l}`));
      }
    }
    const g = ghepPhieu(gopTrongPhieu(ps.gemma, L, ps.agy), gopTrongPhieu(ps.agy, L, ps.gemma));
    for (const k of Object.keys(tk)) tk[k] += g.tk[k];
    tatCa.push(...g.ra);
  }
  const banGhi = hoanTat(tatCa, L);
  const tep = ghiKho(banGhi, nuts, hoSo);
  fs.writeFileSync(path.join(viec, 'bao-cao.json'), JSON.stringify({ nuts, tk, soBanGhi: banGhi.length, loiMay, loiPhieu, tep }, null, 2));
  return { banGhi, tk, loiMay, loiPhieu, tep };
}

/** Đọc tham số dòng lệnh chung. */
export function thamSo(argv) {
  const lay = (k) => { const ds = []; argv.forEach((x, i) => { if (x === k && argv[i + 1]) ds.push(argv[i + 1]); }); return ds; };
  return {
    lay,
    viec: path.resolve(lay('--viec')[0] || path.join(os.homedir(), 'hsm-viec')),
    hoSo: path.resolve(lay('--ho-so')[0] || G.HO_SO_MAC_DINH),
    luat: path.resolve(lay('--luat')[0] || G.LUAT_MAC_DINH),
    chiGhep: argv.includes('--chi-ghep'),
    xemGoi: argv.includes('--xem-goi'),
    mo: lay('--mo')[0] ? lay('--mo')[0].split(',') : MO,
  };
}
