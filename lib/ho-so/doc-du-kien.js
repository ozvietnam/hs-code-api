/**
 * lib/ho-so/doc-du-kien.js — `docDuKien`: đọc DỮ KIỆN VỀ HÀNG cho hồ sơ phân loại (plan L1-5b; spec hồ sơ §8.1 duKien, §8.3 bước 2).
 *
 * Thứ tự (spec §8.3): LUẬT trước — lib/tu-vung.js#docGiaTri trên chữ đầu vào (bangChung luôn là đoạn con nguyên văn); LLM sau,
 * CHỈ cho dữ kiện QUYẾT ĐỊNH còn CHUA_BIET và CHỈ nhận đoạn chữ luật chưa đọc. LLM trả `{ fact, giaTri, donVi?, bangChung }`;
 * máy kiểm: khoá thuộc danh sách được hỏi, giá trị đúng kiểu tu-vung@1, `bangChung` là đoạn con (đã chuẩn hoá dấu/khoảng trắng,
 * không phân biệt hoa thường) của đầu vào, số khớp bằng chứng, không trái với luật đọc lại chính bằng chứng — sai bất kỳ ⇒ bỏ.
 * Dữ kiện LLM đọc mang `docBoi: 'LLM'` (doiChieu coi ranh giới dựa trên nó là KHÔNG tất định — không làm căn cứ LOI).
 *
 * Riêng tư: `rieng: true` (lượt khoá dịch vụ) ⇒ lời gọi LLM chạy trong withPrivateData (chỉ nhà cung cấp LLM_NO_TRAIN_PROVIDERS).
 * LLM lỗi / hết nhà cung cấp hợp lệ ⇒ không ném: dữ kiện còn CHUA_BIET (máy làm trước, LLM chỉ bổ sung — spec §11).
 *
 * `duKien` bên gọi gửi: giữ `nguon` của họ (KHACH | NSX | ANH | AI_CHUA_KIEM); KHÔNG nhận `TB_TCHQ` / `SUY_RA` từ bên gọi (đó là
 * nguồn chỉ bộ não được gán). Khoá ngoài tu-vung@1 hoặc giá trị sai kiểu ⇒ không nhận. Mục bị loại ghi vào `opts.biLoai` (nếu có).
 */
const TV = require('../tu-vung');
const DK = require('../dieu-kien-so');
const { withPrivateData } = require('../llm-privacy');

const NGUON_BEN_GOI = new Set(['KHACH', 'NSX', 'ANH', 'AI_CHUA_KIEM']);
const NGUON_CAM_BEN_GOI = new Set(['TB_TCHQ', 'SUY_RA']);
/** Khoá nhận diện — luật đọc thêm (không hỏi LLM) để dựng `nhanDien` và phục vụ viết mô tả (L1-5c). */
const KHOA_NHAN_DIEN = ['tenLoai', 'nhanHieu', 'model', 'kyMaHieu', 'nhaSanXuat', 'tinhTrang'];

const chuan = (s) => String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const khoaCo = (f) => { try { return TV.layKhoa(f); } catch { return null; } };
/**
 * Luật đọc một khoá trên chữ khách. `tenLoai` đọc tên ĐẦY ĐỦ (TV.docTenLoaiDayDu, #680): "Bình giữ nhiệt chân không" giữ nguyên,
 * không cắt "không" như phủ định. Khoá khác: TV.docGiaTri. Dùng chung cho đọc luật, kiểm LLM và đọc ngược bản viết (viet-mo-ta).
 */
const docKhoa = (f, t) => (f === 'tenLoai' ? TV.docTenLoaiDayDu(t) : TV.docGiaTri(f, t));

/** Chữ đầu vào (tên hàng + mô tả + thông số) — thứ tự cố định để bằng chứng ổn định. */
function chuDauVao(dauVao = {}) {
  const ts = dauVao.thongSo;
  const dsTs = Array.isArray(ts) ? ts.map((x) => (x && typeof x === 'object' ? Object.entries(x).map(([k, v]) => `${k}: ${v}`).join(', ') : String(x)))
    : ts && typeof ts === 'object' ? Object.entries(ts).map(([k, v]) => `${k}: ${v}`) : ts ? [String(ts)] : [];
  return [dauVao.tenHang, dauVao.moTa, ...dsTs].map((x) => String(x == null ? '' : x).trim()).filter(Boolean).join('. ').normalize('NFC');
}

const factCua = (c) => (!c ? [] : c.op === 'VA' ? (c.cacDieuKien || []).flatMap(factCua) : DK.factCuaDieuKien(c));
/**
 * Khoá dữ kiện QUYẾT ĐỊNH của một đường đi (dungDuongDi): điều kiện của mọi ranh giới có điều kiện, điều kiện loại trừ đã duyệt,
 * phạm vi (`apKhi`) và dữ kiện phân biệt (`factPhanBiet`) của mục hiệu chỉnh tiền lệ chạm mã. Chỉ khoá thuộc tu-vung@1.
 */
function factQuyetDinh(duongDi = {}) {
  const out = new Set();
  for (const e of duongDi.duongDiPhapLy || []) for (const f of factCua(e.dieuKien)) out.add(f);
  for (const lt of duongDi.loaiTru || []) for (const c of lt.dieuKienKhongThoa || []) for (const f of factCua(c)) out.add(f);
  for (const h of duongDi.hieuChinh || []) {
    for (const c of [].concat(h.apKhi || [])) for (const f of factCua(c)) out.add(f);
    for (const f of h.factPhanBiet || []) out.add(f);
  }
  return [...out].filter((f) => khoaCo(f));
}

function mucTuLuat(fact, r, nguon = 'KHACH') {
  return {
    fact, giaTri: r.giaTri, ...(r.donVi ? { donVi: r.donVi } : {}), ...(r.op ? { op: r.op } : {}), ...(r.cacGiaTri ? { cacGiaTri: r.cacGiaTri } : {}),
    nguon, bangChung: r.bangChung, trangThai: 'DA_CO',
  };
}

/** Che các đoạn đã đọc (bangChung) ⇒ phần chữ chưa đọc, nối bằng " … ". */
function doanChuaDoc(text, daDoc) {
  const vung = [];
  for (const b of daDoc) {
    if (!b) continue;
    let i = text.indexOf(b);
    while (i >= 0) { vung.push([i, i + b.length]); i = text.indexOf(b, i + b.length); }
  }
  vung.sort((a, b) => a[0] - b[0]);
  const doan = []; let pos = 0;
  for (const [s, e] of vung) { if (s > pos) doan.push(text.slice(pos, s)); pos = Math.max(pos, e); }
  if (pos < text.length) doan.push(text.slice(pos));
  return doan.map((x) => x.replace(/^[\s,.;:]+|[\s,.;:]+$/g, '')).filter((x) => /[\p{L}\p{N}]/u.test(x)).join(' … ');
}

/** Số trong một chuỗi (1.500 | 1,5 | 10000) — để kiểm giá trị SO của LLM có thật trong bằng chứng. */
function soTrong(s) {
  const out = [];
  for (const m of String(s).matchAll(/\d+(?:[.,]\d+)*/g)) {
    const t = m[0];
    const a = Number(t.replace(/\./g, '').replace(',', '.'));
    const b = Number(t.replace(/,/g, ''));
    if (Number.isFinite(a)) out.push(a);
    if (Number.isFinite(b)) out.push(b);
  }
  return out;
}

/** Kiểm một mục LLM trả. Trả { muc } hoặc { lyDo }. */
function kiemMucLlm(x, duocHoi, textChuan) {
  if (!x || typeof x !== 'object') return { lyDo: 'llm-muc-hong' };
  const fact = String(x.fact || '');
  if (!duocHoi.has(fact)) return { lyDo: 'llm-khoa-khong-duoc-hoi' };
  const k = khoaCo(fact);
  if (!k) return { lyDo: 'llm-khoa-ngoai-tu-vung' };
  const bc = String(x.bangChung == null ? '' : x.bangChung).normalize('NFC').trim();
  if (chuan(bc).length < 2 || !textChuan.includes(chuan(bc))) return { lyDo: 'llm-bang-chung-khong-co-trong-dau-vao' };
  let giaTri = x.giaTri;
  let donVi;
  if (k.kieu === 'SO') {
    const ds = Array.isArray(giaTri) ? giaTri : [giaTri];
    if (!ds.every((v) => typeof v === 'number' && Number.isFinite(v))) return { lyDo: 'llm-sai-kieu' };
    const soBc = soTrong(bc);
    if (!ds.every((v) => soBc.some((n) => Math.abs(n - v) < 1e-9))) return { lyDo: 'llm-so-khong-khop-bang-chung' };
    const u = x.donVi || k.donViChuan;
    const qd = ds.map((v) => TV.quyDoi(fact, v, u));
    if (qd.some((v) => v == null || !Number.isFinite(v))) return { lyDo: 'llm-don-vi-khong-quy-doi' };
    giaTri = Array.isArray(giaTri) ? qd : qd[0];
    donVi = k.donViChuan;
  }
  const kt = TV.kiemGiaTri(fact, giaTri);
  if (kt.trangThai !== 'DA_CO') return { lyDo: `llm-sai-kieu:${kt.lyDo || ''}` };
  // Luật đọc lại chính bằng chứng: đọc ra giá trị KHÁC ⇒ LLM đọc trái chữ (vd bỏ qua chữ "không") ⇒ bỏ.
  let lai = null;
  try { lai = docKhoa(fact, bc); } catch { lai = null; }
  if (lai && lai.trangThai === 'DA_CO' && JSON.stringify(lai.giaTri) !== JSON.stringify(giaTri)) return { lyDo: 'llm-trai-luat-doc-bang-chung' };
  return { muc: { fact, giaTri, ...(donVi ? { donVi } : {}), nguon: 'KHACH', bangChung: bc, trangThai: 'DA_CO', docBoi: 'LLM' } };
}

const SYSTEM = `Bạn đọc DỮ KIỆN về một mặt hàng từ đoạn chữ khách khai (tiếng Việt / Anh / Trung). Bạn KHÔNG phân loại mã HS.
Chỉ trả JSON: {"duKien":[{"fact":"<khoá được hỏi>","giaTri":<giá trị đúng kiểu>,"donVi":"<đơn vị nếu là số>","bangChung":"<đoạn chữ NGUYÊN VĂN chép từ đoạn chữ>"}]}
Quy tắc: chỉ dùng khoá trong danh sách; CO_KHONG trả true/false; LIET_KE trả một giá trị trong giaTriHopLe; SO trả số + donVi.
bangChung phải chép NGUYÊN VĂN từ đoạn chữ. Không chắc ⇒ bỏ khoá đó, không đoán.`;

async function llmMacDinh(yc) {
  const { callLLMJson } = require('../llm-tier');
  const user = `ĐOẠN CHỮ:\n${yc.doanChu}\n\nKHOÁ CẦN ĐỌC:\n${yc.facts.map((f) => `- ${f.fact} (${f.kieu}${f.donViChuan ? `, đơn vị ${f.donViChuan}` : ''}${f.giaTriHopLe ? `, giaTriHopLe: ${f.giaTriHopLe.join('|')}` : ''}): ${f.nhanVi}`).join('\n')}`;
  const { json } = await callLLMJson(SYSTEM, user, { step: 'ho-so-doc-du-kien', temperature: 0, timeoutMs: 30000 });
  return Array.isArray(json?.duKien) ? json.duKien : [];
}

/**
 * @param {{tenHang?:string, moTa?:string, thongSo?:any, duKien?:object[]}} dauVao
 * @param {import('./index').KetQuaDuongDi} duongDi kết quả dungDuongDi
 * @param {{llm?: (yc:{facts:object[], doanChu:string}) => Promise<object[]>, rieng?: boolean, biLoai?: object[]}} [opts]
 *   `llm` — tiêm cho test (mặc định chuỗi LLM lib/llm-tier.js); `rieng` — lượt khoá dịch vụ (bọc withPrivateData);
 *   `biLoai` — mảng nhận mục bị loại ({ fact, nguon?, lyDo }).
 * @returns {Promise<import('./index').DuKien[]>}
 */
async function docDuKien(dauVao = {}, duongDi = {}, opts = {}) {
  const biLoai = Array.isArray(opts.biLoai) ? opts.biLoai : [];
  const text = chuDauVao(dauVao);
  const textChuan = chuan(text);
  const quyetDinh = factQuyetDinh(duongDi);
  const kiemHoa = (duongDi.kiemHoa || []).map((k) => k.fact).filter((f) => khoaCo(f));
  const docLuat = [...new Set([...quyetDinh, ...kiemHoa, ...KHOA_NHAN_DIEN])].filter((f) => khoaCo(f));
  const out = [];

  // 1. Bên gọi gửi
  for (const d of Array.isArray(dauVao.duKien) ? dauVao.duKien : []) {
    const fact = d && String(d.fact || '');
    const nguon = d && d.nguon ? String(d.nguon) : 'KHACH';
    if (!fact || !khoaCo(fact)) { biLoai.push({ fact, nguon, lyDo: 'ben-goi-khoa-ngoai-tu-vung' }); continue; }
    if (NGUON_CAM_BEN_GOI.has(nguon) || !NGUON_BEN_GOI.has(nguon)) { biLoai.push({ fact, nguon, lyDo: 'ben-goi-nguon-khong-nhan' }); continue; }
    const kt = TV.kiemGiaTri(fact, d.giaTri);
    if (kt.trangThai !== 'DA_CO') { biLoai.push({ fact, nguon, lyDo: `ben-goi-sai-kieu:${kt.lyDo || ''}` }); continue; }
    // Câu trả lời vế mở TUONG_TU (#577 vòng 7, lib/dieu-kien-so.js#khoaTuongTu): chỉ trên tenLoai, {<khoá>: boolean}.
    let tuongTu = null;
    if (d.tuongTu !== undefined) {
      const tt = d.tuongTu;
      const hop = fact === 'tenLoai' && tt && typeof tt === 'object' && !Array.isArray(tt) && Object.keys(tt).length > 0 && Object.keys(tt).length <= 20
        && Object.entries(tt).every(([k, v]) => k.length <= 500 && typeof v === 'boolean');
      if (hop) tuongTu = { ...tt }; else biLoai.push({ fact, nguon, lyDo: 'ben-goi-tuong-tu-sai-kieu' });
    }
    out.push({
      fact, giaTri: d.giaTri, ...(d.donVi ? { donVi: String(d.donVi) } : {}), nguon,
      bangChung: d.bangChung == null ? null : String(d.bangChung).slice(0, 500), trangThai: 'DA_CO',
      ...(tuongTu ? { tuongTu } : {}),
    });
  }
  const daCoBenGoi = new Set(out.map((d) => d.fact));

  // 2. Luật đọc chữ
  if (text) {
    for (const f of docLuat) {
      let r;
      try { r = docKhoa(f, text); } catch { r = null; }
      if (!r || r.trangThai !== 'DA_CO') continue;
      const m = mucTuLuat(f, r);
      // trùng giá trị với bên gọi ⇒ giữ mục bên gọi; khác giá trị ⇒ giữ cả hai (chuanDuKien gắn xung đột ⇒ hỏi lại)
      if (daCoBenGoi.has(f) && out.some((d) => d.fact === f && JSON.stringify([d.giaTri, d.donVi || null]) === JSON.stringify([m.giaTri, m.donVi || null]))) continue;
      out.push(m);
    }
  }

  // 3. LLM: chỉ dữ kiện quyết định còn CHUA_BIET, chỉ đoạn chữ chưa đọc
  const daCo = new Set(out.map((d) => d.fact));
  const conThieu = quyetDinh.filter((f) => !daCo.has(f));
  if (conThieu.length && text) {
    const doanChu = doanChuaDoc(text, out.filter((d) => d.bangChung && text.includes(d.bangChung)).map((d) => d.bangChung));
    if (doanChu) {
      const facts = conThieu.map((f) => { const k = TV.layKhoa(f); return { fact: f, kieu: k.kieu, nhanVi: k.nhanVi, ...(k.donViChuan ? { donViChuan: k.donViChuan } : {}), ...(k.giaTriHopLe ? { giaTriHopLe: [...k.giaTriHopLe] } : {}) }; });
      const llm = typeof opts.llm === 'function' ? opts.llm : llmMacDinh;
      const goi = () => llm({ facts, doanChu });
      let tra = [];
      try { tra = await (opts.rieng ? withPrivateData(goi) : goi()); } catch (e) { biLoai.push({ fact: null, lyDo: `llm-loi:${String(e?.code || e?.message || e).slice(0, 60)}` }); tra = []; }
      const duocHoi = new Set(conThieu);
      const daNhan = new Set();
      for (const x of Array.isArray(tra) ? tra : []) {
        const k = kiemMucLlm(x, duocHoi, textChuan);
        if (!k.muc) { biLoai.push({ fact: x && x.fact, nguon: 'LLM', lyDo: k.lyDo }); continue; }
        if (daNhan.has(k.muc.fact)) { biLoai.push({ fact: k.muc.fact, nguon: 'LLM', lyDo: 'llm-trung-khoa' }); continue; }
        daNhan.add(k.muc.fact);
        out.push(k.muc);
      }
    }
  }

  // 4. Dữ kiện quyết định chưa biết ⇒ mục CHUA_BIET (để doiChieu hỏi)
  const coRoi = new Set(out.map((d) => d.fact));
  for (const f of quyetDinh) if (!coRoi.has(f)) out.push({ fact: f, giaTri: null, nguon: null, bangChung: null, trangThai: 'CHUA_BIET' });
  return out;
}

module.exports = { docDuKien, docKhoa, factQuyetDinh, chuDauVao, doanChuaDoc, KHOA_NHAN_DIEN, NGUON_BEN_GOI };
