/**
 * lib/ho-so/tham-chieu.js — truy hồi CÂU THAM CHIẾU đã kiểm chứng để chọn danh từ đầu câu + văn phong cho bộ viết `vietMoTa`
 * (plan L1-5c; spec hồ sơ §8.4 "Tên hàng và văn phong đã kiểm chứng"). Viết lại từ bản thử nghiệm PR #544
 * (lib/describe-references.js trên nhánh feat/dot0b-describe-giu-ten — không gộp, CEO 29/10).
 *
 * Nguồn: 3–5 câu cùng mã 8 số (thiếu thì 6 số) từ
 *   - kho tờ khai Oz (lib/oz-precedent-search.js#ozRawByHsPrefix, trường sampleDesc/tenHang) — CHỈ khi bên gọi xin `oz: true`
 *     (vietMoTa chỉ xin trong lượt riêng tư / withPrivateData). Câu Oz chứa thông tin khách: chỉ đi vào payload LLM, KHÔNG BAO
 *     GIỜ trả ra phản hồi (congKhai() không mang câu Oz, không mang số đếm kho Oz);
 *   - thông báo TB-TCHQ (data/precedents.json, productName) — văn bản công khai, trả kèm số hiệu.
 * Lỗi / treo kho Oz ⇒ bỏ phần Oz (tầng tuỳ chọn), TB-TCHQ vẫn chạy. Không ghi gì.
 */
const WORD_RE = /[\p{L}\p{N}]+/gu;
const tu = (s) => (String(s || '').normalize('NFC').toLowerCase().match(WORD_RE) || []);
const words = (s) => new Set(tu(s).filter((w) => w.length >= 2 || /\d/.test(w)));

/** Độ giống tên (giữ dấu): tỉ lệ chữ của tên hỏi có trong câu tham chiếu. */
function doGiong(tenHoi, cau) {
  const q = words(tenHoi);
  if (!q.size) return 0;
  const c = words(cau);
  let hit = 0;
  for (const w of q) if (c.has(w)) hit += 1;
  return hit / q.size;
}

/** Jaccard trên tập token (chữ thường, NFC). Dùng chặn chép câu Oz (≥ 0,8 ⇒ coi là chép). */
function jaccardToken(a, b) {
  const A = new Set(tu(a)); const B = new Set(tu(b));
  if (!A.size && !B.size) return 0;
  let giao = 0;
  for (const w of A) if (B.has(w)) giao += 1;
  return giao / (A.size + B.size - giao);
}

const cat = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t;
};

function tbTheoMa(prefix) {
  const { precedentsData } = require('../data');
  const out = [];
  for (const [hs, list] of Object.entries(precedentsData || {})) {
    const ok = prefix.length === 8 ? hs === prefix : (hs.length === 8 && hs.startsWith(prefix)) || hs === prefix;
    if (!ok || !Array.isArray(list)) continue;
    for (const p of list) {
      const st = String(p.sourceType || 'TB-TCHQ');
      if (st !== 'TB-TCHQ' || !p.productName) continue;
      out.push({ hs, soHieu: p.tbTchqNumber || null, tenHang: String(p.productName) });
    }
  }
  return out;
}

function voiHanGio(promise, ms) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error('REF_TIMEOUT')), ms); if (t.unref) t.unref(); }),
  ]).finally(() => clearTimeout(t));
}

/**
 * @param {{maHs:string, tenHang?:string, oz?:boolean, maxOz?:number, maxTong?:number, timeoutMs?:number}} q
 * @returns {Promise<{oz:{hs:string, moTa:string}[], tbTchq:{hs:string, soHieu:string|null, moTa:string}[], capMa:'8'|'6'|null}>}
 */
async function thamChieuMoTa({ maHs, tenHang, oz: xinOz = false, maxOz = 3, maxTong = 5, timeoutMs } = {}) {
  const hs8 = String(maHs || '').replace(/\D/g, '').slice(0, 8);
  const rong = { oz: [], tbTchq: [], capMa: null };
  if (hs8.length < 6 || String(process.env.HS_DESCRIBE_REFS || '').toLowerCase() === 'false') return rong;
  const ms = Number(timeoutMs || process.env.HS_DESCRIBE_REF_TIMEOUT_MS) || 3000;
  let ozRaw = async () => [];
  if (xinOz) {
    try {
      const { ozRawByHsPrefix } = require('../oz-precedent-search');
      ozRaw = (p) => voiHanGio(ozRawByHsPrefix(p), ms).catch(() => []);
    } catch { /* kho Oz tuỳ chọn */ }
  }
  const xep = (list, ten) => list.map((x) => ({ ...x, diem: doGiong(tenHang, ten(x)) })).sort((a, b) => b.diem - a.diem);
  const oz = []; const tb = []; let capMa = null;
  for (const prefix of hs8.length === 8 ? [hs8, hs8.slice(0, 6)] : [hs8.slice(0, 6)]) {
    if (oz.length + tb.length >= 3) break;
    const daCo = new Set([...oz, ...tb].map((x) => x.moTa));
    const ozList = xep(await ozRaw(prefix), (g) => `${g.tenHang || ''} ${g.chatLieu || ''}`).filter((g) => g.sampleDesc || g.tenHang);
    const tbList = xep(tbTheoMa(prefix), (p) => p.tenHang);
    for (const g of ozList) {
      if (oz.length >= maxOz) break;
      const moTa = cat(g.sampleDesc || g.tenHang, 220);
      if (daCo.has(moTa)) continue;
      daCo.add(moTa);
      oz.push({ hs: String(g.hsCode).replace(/\D/g, ''), moTa });
    }
    for (const p of tbList) {
      if (oz.length + tb.length >= maxTong) break;
      const moTa = cat(p.tenHang, 200);
      if (daCo.has(moTa)) continue;
      daCo.add(moTa);
      tb.push({ hs: p.hs, soHieu: p.soHieu, moTa });
    }
    if (!capMa && (oz.length || tb.length)) capMa = String(prefix.length);
  }
  return { oz, tbTchq: tb, capMa };
}

/** Phần được phép trả ra API: số hiệu + mã TB-TCHQ. KHÔNG có câu Oz, KHÔNG có số đếm kho Oz. */
function congKhai(ref) {
  return { tbTchq: ((ref && ref.tbTchq) || []).filter((p) => p && p.soHieu).map((p) => ({ soHieu: p.soHieu, hs: p.hs })) };
}

module.exports = { thamChieuMoTa, congKhai, jaccardToken, doGiong };
