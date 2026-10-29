// lib/describe-references.js — truy hồi TÊN HÀNG + VĂN PHONG đã kiểm chứng cho /api/describe (Đợt 0B, sổ
// ghi-nhan-mo-ta-ecus.md mục 10A, 36.3): cùng mã 8 số (thiếu thì 6 số) trong kho tờ khai Oz (data/oz-gold-final.jsonl,
// trường sampleDesc/tenHang) và thông báo TB-TCHQ (data/precedents.json, trường productName), xếp theo độ giống tên hàng.
//
// RIÊNG TƯ: câu khai của Oz chứa thông tin khách (model, NSX, khách hàng). Chúng CHỈ đi vào payload LLM (lượt riêng tư,
// xem describe-core) làm mẫu; phản hồi API chỉ mang SỐ LƯỢNG câu Oz (`congKhai.oz`). TB-TCHQ là văn bản công khai →
// được trả số hiệu + mã.
const { precedentsData } = require('./data');

const WORD_RE = /[\p{L}\p{N}]+/gu;
const words = (s) => new Set((String(s || '').normalize('NFC').toLowerCase().match(WORD_RE) || []).filter((w) => w.length >= 2 || /\d/.test(w)));

/** Độ giống tên (giữ dấu): tỉ lệ chữ của tên hỏi có trong câu tham chiếu. */
function doGiong(tenHoi, cau) {
  const q = words(tenHoi);
  if (!q.size) return 0;
  const c = words(cau);
  let hit = 0;
  for (const w of q) if (c.has(w)) hit += 1;
  return hit / q.size;
}

const cat = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t;
};

/** TB-TCHQ cùng tiền tố mã (8 số chính xác, hoặc mọi mã 8 số dưới 6 số). */
function tbTheoMa(prefix) {
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
 * thamChieuMoTa({ hsCode, tenHang }) → {
 *   oz:     [{ hs, moTa }]                  // NỘI BỘ — chỉ để đưa vào LLM
 *   tbTchq: [{ hs, soHieu, moTa }]
 *   capMa:  '8' | '6' | null
 * }
 * Lỗi/treo kho Oz → bỏ phần Oz (tầng tuỳ chọn), TB-TCHQ vẫn chạy.
 */
async function thamChieuMoTa({ hsCode, tenHang, maxOz = 3, maxTong = 5, timeoutMs } = {}) {
  const hs8 = String(hsCode || '').replace(/\D/g, '').slice(0, 8);
  const empty = { oz: [], tbTchq: [], capMa: null };
  if (hs8.length < 6 || String(process.env.HS_DESCRIBE_REFS || '').toLowerCase() === 'false') return empty;
  const ms = Number(timeoutMs || process.env.HS_DESCRIBE_REF_TIMEOUT_MS) || 3000;
  let ozRaw = async () => [];
  try {
    const { ozRawByHsPrefix } = require('./oz-precedent-search');
    ozRaw = (p) => voiHanGio(ozRawByHsPrefix(p), ms).catch(() => []);
  } catch { /* kho Oz tuỳ chọn */ }

  const xep = (list, ten) => list
    .map((x) => ({ ...x, diem: doGiong(tenHang, ten(x)) + Math.log10((x.ozCount || 1) + 1) * 0.01 }))
    .sort((a, b) => b.diem - a.diem);

  const oz = [];
  const tb = [];
  let capMa = null;
  for (const prefix of hs8.length === 8 ? [hs8, hs8.slice(0, 6)] : [hs8.slice(0, 6)]) {
    if (oz.length + tb.length >= 3) break;
    const daCo = new Set([...oz, ...tb].map((x) => x.moTa));
    const ozList = xep(await ozRaw(prefix), (g) => `${g.tenHang} ${g.chatLieu || ''}`)
      .filter((g) => g.sampleDesc || g.tenHang);
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

/** Phần được phép trả ra API: số câu Oz + số hiệu TB-TCHQ. KHÔNG có câu khai của Oz. */
function congKhai(ref, { ozDaDung } = {}) {
  return {
    oz: ozDaDung == null ? (ref?.oz || []).length : ozDaDung,
    tbTchq: (ref?.tbTchq || []).map((p) => ({ soHieu: p.soHieu, hs: p.hs })),
    capMa: ref?.capMa || null,
  };
}

const chuanSo = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
/** Chuỗi s có chứa nguyên một câu Oz tham chiếu không (chặn LLM chép nguyên câu khai của khách khác ra phản hồi). */
function chuaCauOz(s, ref) {
  const t = chuanSo(s);
  if (!t) return false;
  return (ref?.oz || []).some((o) => {
    const c = chuanSo(o.moTa).replace(/…$/, '');
    return c.length >= 25 && t.includes(c);
  });
}

module.exports = { thamChieuMoTa, congKhai, chuaCauOz, doGiong };
