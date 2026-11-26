// lib/hoi-theo-so-tay.js — CÂU HỎI GỬI KHÁCH PHẢI CÓ CĂN CỨ TỪ SỔ (công tắc HS_HOI_THEO_SO_TAY, mặc định TẮT).
//
// VÌ SAO (ca thật qua Cổng 21/11 — "Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch…"): động cơ dừng ở 6 số
// 848180 theo nhánh earlyExitHoi và trả khách 6 câu hỏi do LLM tự nghĩ (điện áp cuộn dây, model, hãng…) — không câu
// nào là điều kiện phân biệt phân nhóm / dòng 8 số của nhóm 84.81. Trong khi sổ tay nhóm 4 số
// (data/so-tay/<nhóm>.json), sổ ranh giới PN6 đã DUYET (data/ho-so/ranh-gioi/<pn6>.json) và danh mục trường khai
// theo nhóm đã biết đúng đặc điểm quyết định mã.
//
// LÀM GÌ: HẬU XỬ LÝ TẤT ĐỊNH trên kết quả của classifyLoop. KHÔNG gọi LLM, KHÔNG đổi prompt, KHÔNG đổi mã HS / độ
// tự tin / quyết định HOI–CHOT / status. Chỉ dựng lại DANH SÁCH CÂU HỎI (nextAction.questions + missing) khi động cơ
// đã quyết định hỏi và mới dừng ở 4–6 số (hoặc 8 số dự kiến):
//   (0) câu phân biệt NHÓM 4 số — phanBiet[] / loaiTru[] của sổ tay, CHỈ khi nhóm kia cũng là ứng viên của động cơ VÀ
//       điều kiện của chính dòng đó khớp mô tả hàng (luật khớp của bảng cạnh lib/do-thi/tu-khoa.js + phần phân biệt);
//   (1) chỉ hỏi phân nhóm 6 số khi động cơ mới dừng ở 4 số, hoặc chính kết quả động cơ còn giữ phân nhóm anh em
//       (results / alternatives) — giả thuyết vòng 1 không mở lại phân nhóm động cơ đã chọn (L3);
//   (1) câu phân biệt PHÂN NHÓM 6 số — tiêu đề các phân nhóm anh em (+ tieuChi6 của sổ tay khi có);
//   (2) câu điều kiện DÒNG 8 số — lõi lib/so-tay-cau-hoi.js (chotDong8().missingFacts, cổng sổ tay) trên phân nhóm
//       đứng đầu và một phân nhóm ứng viên thứ hai; phân nhóm có sổ ranh giới DUYET → canCu "ranh-gioi-pn6";
//   (3) trường khai còn thiếu theo nhóm (missingStructured — TT 39/2018);
//   (4) câu "unknowns" của LLM: CHỈ còn lại khi khớp được vào một câu của sổ (cùng dữ kiện — khi đó câu của sổ thay
//       nó và được đánh dấu llmCungHoi); không khớp → nextAction.ghiChuThem (không tính là câu hỏi).
//   (2b) dòng/nút mang điều kiện TÊN LOẠI / CÔNG DỤNG → "Hàng có phải là <chữ dòng> không?" (Có → dòng đó);
//   (2c) ĐƯỜNG LÙI khi sổ chưa cho câu dòng (sổ ranh giới TRA_VE/NHAP, hoặc DUYET mà không ra câu): phân nhóm phẳng ≤ 6
//        dòng → MỘT câu chọn dòng liệt kê nguyên văn chữ biểu thuế, canCu "bieu-thue"; lồng nhiều cấp / > 6 dòng → giữ câu LLM.
// Nhãn nextAction.canCuCauHoi: "so-tay" | "bieu-thue" | "khong-can-hoi-dong" (phân nhóm chỉ có một dòng 8 số, hoặc máy tự
// chốt được dòng — không còn gì để hỏi ở mức dòng) | "truong-khai-nhom" (bộ lọc lạc đề / phân nhóm đã chốt bỏ hết câu của
// sổ, chỉ còn trường khai theo nhóm) | "llm".
// Tối đa 4 câu. Dữ kiện mô tả đã nêu (tên hàng, thông số, product.keySpecs, điều kiện đã KNOWN) thì không hỏi lại.
// Nhóm chưa có sổ tay, hoặc sổ không sinh được câu nào → GIỮ NGUYÊN câu của LLM, ghi canCuCauHoi "llm" để đo tỉ lệ rơi.

const { loadSoTay, loadRanhGioiDuyet, dong8HieuLuc, danhGiaDong, chotDong8, giaTriCua, khoaCuaFact, chatLieuTrong } = require('./so-tay-gates');
// Chỉ mượn hàm rút / khớp từ khoá (thuần, KHÔNG dựng bảng cạnh, không đọc kho) — cùng hàm sinh `tuKhoaDieuKien` của cạnh
// C5 / C6 và luật khớp của moRongUngVien (data/luat/dau-noi.json: napMuonHam của /api/classify, kho bangCanh).
const { tuKhoa, khopDieuKien, tapTuMoTa, khongDau } = require('./do-thi/tu-khoa');
const { cauHoiSoTay, FACT_LABELS } = require('./so-tay-cau-hoi');

const TRAN_CAU = 4; //          tối đa câu hỏi gửi khách
const TRAN_PHAN_BIET = 2; //    tối đa câu phân biệt nhóm 4 số
const TRAN_DONG_MOI_PN6 = 3; // tối đa câu điều kiện dòng 8 số lấy từ MỘT phân nhóm
const TRAN_PN6_XET = 2; //      phân nhóm đứng đầu + một phân nhóm ứng viên thứ hai
const TRAN_LUA_CHON_PN6 = 6;
const TRAN_DONG_LIET_KE = 6; //  câu chọn dòng (đường lùi theo chữ biểu thuế): chỉ khi phân nhóm phẳng và ≤ 6 dòng // số phân nhóm liệt kê trong câu phân biệt 6 số

let _tv = null;
const TV = () => (_tv ||= require('./tu-vung.js'));
let _tree = null;
const TREE = () => (_tree ||= require('./hs-tree.js'));

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const dot4 = (h) => `${h.slice(0, 2)}.${h.slice(2, 4)}`;
const dot6 = (h) => `${h.slice(0, 4)}.${h.slice(4, 6)}`;
const chuan = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Công tắc: chỉ "on" / "1" / "true" mới bật. Mặc định TẮT — tắt thì classifyLoop trả y nguyên như trước. */
function bat() {
  return /^(on|1|true)$/i.test(String(process.env.HS_HOI_THEO_SO_TAY || '').trim());
}

/** Công tắc con của HS_HOI_THEO_SO_TAY (OZV-2310, BẬC 1 — cụm khách hỏi nhiều nhất, 11/14 lượt dừng 6 số): khi lõi
 * đã hỏi dữ kiện DONG_BIEU mà phân nhóm còn dòng mang điều kiện TÊN LOẠI/CÔNG DỤNG chưa chấm được (CHUA_BIET) thì
 * vẫn sinh câu phân dòng "la_*" hoặc câu chọn dòng và ĐẶT LÊN ĐẦU — khách trả lời là về tới 8 số trong 1 vòng; dữ kiện
 * cấu trúc còn thiếu hỏi vòng sau. Mặc định TẮT (luật L1): tắt = y như main. Chỉ có tác dụng khi bat() bật. */
function uuTienPhanDong() {
  return /^(on|1|true)$/i.test(String(process.env.HS_CA_UU_TIEN_PHAN_DONG || '').trim());
}

// ───────────────────────── hồ sơ hàng (chữ) ─────────────────────────
const chuoiCua = (v, sau = 0) => {
  if (v == null || sau > 3) return [];
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  if (typeof v === 'number') return [String(v)];
  if (Array.isArray(v)) return v.flatMap((x) => chuoiCua(x, sau + 1));
  if (typeof v === 'object') return Object.entries(v).filter(([k]) => k !== 'evidence').flatMap(([, x]) => chuoiCua(x, sau + 1));
  return [];
};

/** Chữ mô tả hàng để máy đọc dữ kiện ĐÃ CÓ: đầu vào của khách + product vòng 1 (kể cả keySpecs) + điều kiện đã KNOWN. */
function hoSoChu(out, rawAttrs) {
  const raw = rawAttrs && typeof rawAttrs === 'object' ? rawAttrs : { tenHang: typeof rawAttrs === 'string' ? rawAttrs : '' };
  const p = out?.dossier?.product || {};
  const daBiet = (out?.dossier?.conditions || []).filter((c) => String(c?.status).toUpperCase() === 'KNOWN').map((c) => [c.fact, c.evidence]);
  return [
    raw.tenHang, raw.nameZh, raw.specs, raw.chatLieu, raw.congDung, raw.chucNang, raw.attrs,
    p.nameVi, p.purpose, p.material, p.mechanism, p.form, p.keySpecs, daBiet,
  ].flatMap((x) => chuoiCua(x)).join('\n');
}

// ───────────────────────── dữ kiện: nhãn, gốc nhãn, đã có hay chưa ─────────────────────────
const LA_VAT_LIEU = (fact) => ['chat_lieu', 'vat_lieu', 'chatLieu'].includes(fact);
const TU_RONG_DAU = new Set(['cách', 'loại', 'kiểu', 'dạng', 'mức', 'số', 'có', 'tên', 'các']);

function nhanCua(fact) {
  if (LA_VAT_LIEU(fact)) return 'vật liệu';
  try { const k = TV().layKhoa(fact); if (k?.nhanVi) return k.nhanVi; } catch { /* khoá cũ không có trong tu-vung */ }
  return FACT_LABELS[khoaCuaFact(fact) || fact] || String(fact).replace(/_/g, ' ');
}

/** "Gốc" của một nhãn: cụm 2 âm tiết đầu có nghĩa ("đường kính", "áp suất", "điều khiển") — khoá khử trùng + khớp câu LLM. */
function gocNhan(nhan) {
  const am = chuan(String(nhan || '').replace(/\([^)]*\)/g, ' ').split('/')[0]).split(' ').filter(Boolean);
  while (am.length > 2 && TU_RONG_DAU.has(am[0])) am.shift();
  return am.slice(0, 2).join(' ');
}

/** Các cụm chữ nhận ra MỘT dữ kiện trong câu hỏi tự do của LLM (đã chuẩn hoá chữ thường, bỏ dấu câu). */
function cumNhanRa(fact, nhan) {
  const cum = new Set();
  const them = (s) => { const c = chuan(s); if (c.length >= 4) cum.add(c); };
  if (LA_VAT_LIEU(fact) || fact === 'material') { them('vật liệu'); them('chất liệu'); }
  for (const phan of String(nhan || '').replace(/[()]/g, '/').split(/[/,;]/)) { if (chuan(phan).split(' ').length >= 2) them(phan); }
  them(gocNhan(nhan));
  try {
    const k = TV().layKhoa(fact);
    for (const c of k?.cachDoc?.vi || []) if (/^[\p{L}\p{N} ]+$/u.test(c) && c.trim().split(/\s+/).length >= 2) them(c);
  } catch { /* không có trong tu-vung */ }
  return [...cum];
}

/** Mô tả đã nêu dữ kiện này chưa (đọc bằng đúng các máy đọc của sổ: tu-vung, giaTriCua, bảng vật liệu). */
function daCo(fact, text) {
  if (!text) return false;
  if (LA_VAT_LIEU(fact) && chatLieuTrong(text).length) return true;
  try { if (TV().docGiaTri(LA_VAT_LIEU(fact) ? 'chatLieu' : fact, text)?.trangThai === 'DA_CO') return true; } catch { /* khoá cũ */ }
  try { if (khoaCuaFact(fact) && giaTriCua(fact, text).length) return true; } catch { /* không đọc được → coi như chưa có */ }
  return false;
}

// ───────────────────────── (0) phân biệt NHÓM 4 số ─────────────────────────
const nhomTrong = (s) => [...String(s || '').matchAll(/\d{4}/g)].map((m) => m[0]);

/** Từ khoá của tiêu đề nhóm 4 số (cây biểu thuế) — "nền" chung của cả nhóm, không phân biệt được gì. */
function tuNenNhom(h4) {
  try { return tuKhoa(TREE().nodeOf(h4)?.tenVi || ''); } catch { return []; }
}

/**
 * Điều kiện của một dòng loại trừ / phân biệt giữa hai nhóm có KHỚP mô tả hàng không. Hai bước, đều tất định:
 *   1. Luật khớp của bảng cạnh (lib/do-thi/tu-khoa.js khopDieuKien — cùng luật moRongUngVien dùng để kéo nhóm): âm tiết
 *      nội dung đầu tiên của điều kiện có trong mô tả (âm tiết đầu quá chung thì thêm âm tiết thứ hai).
 *   2. VÀ mô tả chạm PHẦN PHÂN BIỆT của điều kiện. "Nền" = từ khoá của tiêu đề hai nhóm (cái mà cả hai nhóm cùng nói).
 *      - Điều kiện có cụm hai âm tiết liền nhau (cả hai là từ nội dung) mà ít nhất một âm tiết ngoài nền: mô tả phải chứa
 *        nguyên một cụm như thế ("hơi nước" của "Van trượt cho động cơ hơi nước").
 *      - Không có cụm như thế nhưng có âm tiết ngoài nền: mô tả phải chứa một âm tiết đó.
 *      - Mọi âm tiết đều thuộc nền ("Các van điều chỉnh bằng nhiệt" giữa 84.81 và 90.32): mô tả phải chứa đủ cả.
 *   Bỏ bước 2 thì "Van trượt cho động cơ hơi nước" khớp mọi cái van (âm tiết đầu "van" cũng là tên nhóm 84.81) — đo 21/11.
 * moRongUngVien KHÔNG dùng bước 2: nó kéo thêm ỨNG VIÊN (cần độ phủ, khớp danh từ chính là đủ — test-bang-canh đòi
 * "van điện từ khí nén" kéo được 8481 từ 8412 qua chính cạnh này); ở đây là CÂU HỎI GỬI KHÁCH, cần trúng.
 * @param {string} cauDieuKien  chữ của dòng loại trừ (`loaiTru[].dieuKien`, = nguồn của `tuKhoaDieuKien` cạnh C5/C6) hoặc câu `phanBiet[].hoi` (C7)
 * @param {string} moTa         mô tả hàng
 * @returns {null | {soKhop: number, tyLe: number, phanBiet: string}}
 */
function khopPhanBiet(cauDieuKien, moTa, nhomA, nhomB) {
  const goc = khopDieuKien(tuKhoa(cauDieuKien), tapTuMoTa(moTa));
  if (!goc) return null;
  const nen = new Set([...tuNenNhom(nhomA), ...tuNenNhom(nhomB)]);
  const laNoiDung = (w) => tuKhoa(w).length === 1;
  const chu = khongDau(cauDieuKien).split(' ');
  const moTaKd = ` ${khongDau(moTa)} `;
  const cum = [];
  for (let i = 0; i + 1 < chu.length; i += 1) {
    if (laNoiDung(chu[i]) && laNoiDung(chu[i + 1]) && (!nen.has(chu[i]) || !nen.has(chu[i + 1]))) cum.push(`${chu[i]} ${chu[i + 1]}`);
  }
  if (cum.length) { const t = cum.find((c) => moTaKd.includes(` ${c} `)); return t ? { ...goc, phanBiet: t } : null; }
  const noiDung = tuKhoa(cauDieuKien);
  const le = noiDung.filter((w) => !nen.has(w));
  if (le.length) { const t = le.find((w) => moTaKd.includes(` ${w} `)); return t ? { ...goc, phanBiet: t } : null; }
  return noiDung.every((w) => moTaKd.includes(` ${w} `)) ? { ...goc, phanBiet: noiDung.join(' ') } : null;
}

function cauPhanBietNhom(h4, ungVienH4, moTa = '', dem = null) {
  const out = [];
  const khac = ungVienH4.filter((h) => h !== h4);
  if (!khac.length) return out;
  // Câu lạc đề (điều kiện của dòng không chạm mô tả hàng) không hỏi khách; đếm để đo.
  const lacDe = (cauDk, nhomSo, dich) => {
    if (dich.some((h) => khopPhanBiet(cauDk, moTa, nhomSo, h))) return false;
    if (dem) dem.lacDe = (dem.lacDe || 0) + 1;
    return true;
  };
  const xet = (nhomSo, doi) => {
    const s = loadSoTay(nhomSo);
    if (!s) return;
    const daPhu = new Set();
    for (const x of s.phanBiet || []) {
      const dich = [...nhomTrong(x.neuCo), ...nhomTrong(x.neuKhong)].filter((h) => h !== nhomSo);
      if (!x.hoi || !dich.some((h) => doi.includes(h))) continue;
      if (lacDe(x.hoi, nhomSo, dich.filter((h) => doi.includes(h)))) continue;
      dich.forEach((h) => daPhu.add(h));
      out.push({
        key: `phan_biet_${nhomSo}_${dich.join('_')}`, loai: 'PHAN_BIET_NHOM', questionVi: clip(`${x.hoi} (có → nhóm ${nhomTrong(x.neuCo).map(dot4).join(' / ')}; không → nhóm ${nhomTrong(x.neuKhong).map(dot4).join(' / ')})`, 420),
        whereToFind: 'Catalogue / thông số kỹ thuật: công dụng, cấu tạo của hàng.', options: ['Có', 'Không', 'Chưa rõ'],
        canCu: 'so-tay', nguon: x.nguon || `so-tay.${nhomSo}`, trich: x.trich || x.hoi,
        doiNhom: nhomSo === h4 ? dich.filter((h) => doi.includes(h)) : [nhomSo],
      });
    }
    for (const x of s.loaiTru || []) {
      const dich = nhomTrong(x.sangNhom).filter((h) => doi.includes(h) && !daPhu.has(h));
      if (!x.dieuKien || !dich.length) continue;
      if (lacDe(x.dieuKien, nhomSo, dich)) continue;
      out.push({
        key: `loai_tru_${nhomSo}_${dich.join('_')}_${out.length}`, loai: 'PHAN_BIET_NHOM', questionVi: clip(`Hàng có phải là "${x.dieuKien}" không? (phải → nhóm ${dich.map(dot4).join(' / ')}, không thuộc nhóm ${dot4(nhomSo)})`, 420),
        whereToFind: 'Catalogue / thông số kỹ thuật: công dụng, cấu tạo của hàng.', options: ['Có', 'Không', 'Chưa rõ'],
        canCu: 'so-tay', nguon: x.nguon || `so-tay.${nhomSo}`, trich: x.trich || x.dieuKien,
        doiNhom: nhomSo === h4 ? dich : [nhomSo],
      });
    }
  };
  xet(h4, khac); //                         sổ tay nhóm đứng đầu trỏ sang nhóm ứng viên khác
  // Sổ tay nhóm ứng viên khác trỏ ngược về nhóm đứng đầu — chỉ khi cặp nhóm đó CHƯA có câu nào (một cặp nhóm, một câu).
  for (const h of khac.slice(0, 2)) { if (!out.some((q) => q.doiNhom.includes(h))) xet(h, [h4]); }
  const daCoCap = new Set();
  return out.filter((q) => { const cap = q.doiNhom.join('|'); if (daCoCap.has(cap)) return false; daCoCap.add(cap); return true; }).slice(0, TRAN_PHAN_BIET);
}

// ───────────────────────── (1) phân biệt PHÂN NHÓM 6 số ─────────────────────────
/** Mọi phân nhóm 6 số của nhóm h4 theo cây biểu thuế: [{hs6, tenVi}] (tên kèm tiêu đề nhóm một gạch nếu có). */
function phanNhomCua(h4) {
  const T = TREE();
  const kq = new Map();
  const di = (id, duong, sau) => {
    const n = T.nodeOf(id);
    if (!n || sau > 4) return;
    const ten = String(n.tenVi || '').trim();
    if (n.cap === 6 || n.cap === 8) {
      const hs6 = nz(n.id).slice(0, 6);
      if (hs6.length === 6 && !kq.has(hs6)) kq.set(hs6, { hs6, tenVi: [...duong, ten].filter(Boolean).join(' › ') });
      return;
    }
    for (const c of n.children || []) di(c, [...duong, ten].filter(Boolean), sau + 1);
  };
  try { for (const c of T.nodeOf(h4)?.children || []) di(c, [], 0); } catch { return []; }
  return [...kq.values()];
}

const LA_PHAN_CON_LAI = (ten) => /(^|›\s*)(loại|thiết bị|máy|sản phẩm|hàng hoá|hàng hóa|dạng|các loại|bộ phận)?\s*khác\s*$/iu.test(String(ten || '').trim());
const TU_RONG = new Set(['van', 'vòi', 'dùng', 'trong', 'loại', 'hoặc', 'của', 'cho', 'và', 'các', 'hay', 'khác', 'có', 'không', 'bằng', 'để', 'thiết', 'bị', 'máy', 'bộ', 'phận', 'được', 'từ', 'với', 'trên', 'dưới', 'đã', 'chưa', 'kể', 'cả', 'trừ', 'thuộc', 'nhóm', 'phân', 'như', 'này', 'khi', 'là', 'ở', 'theo', 'những', 'một', 'hàng', 'sản', 'phẩm', 'tương', 'tự', 'quá', 'đến']);

/** Cụm 2 âm tiết có nghĩa của tiêu đề phân nhóm xuất hiện nguyên trong mô tả hàng (gợi ý HEURISTIC — không đổi mã). */
function cumKhopMoTa(tenVi, textChuan) {
  const am = chuan(String(tenVi || '').replace(/\([^)]*\)/g, ' ')).split(' ').filter(Boolean);
  for (let i = 0; i + 1 < am.length; i += 1) {
    if (TU_RONG.has(am[i]) || TU_RONG.has(am[i + 1]) || am[i].length < 2 || am[i + 1].length < 2 || /^\d/.test(am[i]) || /^\d/.test(am[i + 1])) continue;
    const cum = `${am[i]} ${am[i + 1]}`;
    if (` ${textChuan} `.includes(` ${cum} `)) return cum;
  }
  return null;
}

function cauPhanNhom6({ h4, top, ungVien6, text, dem = null }) {
  const ds = phanNhomCua(h4);
  if (ds.length < 2) return null;
  const top6 = top.length >= 6 ? top.slice(0, 6) : null;
  const tChuan = chuan(text);
  // Gợi ý "mô tả khớp chữ của phân nhóm": cụm phải RIÊNG của phân nhóm đó — không nằm trong tiêu đề nhóm 4 số
  // ("cao su" ở 40.16) và không trùng với phân nhóm anh em nào.
  let tenNhom = '';
  try { tenNhom = chuan(TREE().nodeOf(h4)?.tenVi); } catch { tenNhom = ''; }
  for (const o of ds) {
    const cum = o.hs6 !== top6 && !LA_PHAN_CON_LAI(o.tenVi) ? cumKhopMoTa(o.tenVi, tChuan) : null;
    o.khop = cum && !` ${tenNhom} `.includes(` ${cum} `) ? cum : null;
  }
  for (const o of ds) { if (o.khop && ds.some((x) => x !== o && ` ${chuan(x.tenVi)} `.includes(` ${o.khop} `))) o.khopTrung = true; }
  for (const o of ds) { if (o.khopTrung) o.khop = null; }
  const tenTop = ds.find((o) => o.hs6 === top6)?.tenVi || '';
  const ungVienKhac = ungVien6.filter((h) => h !== top6 && ds.some((o) => o.hs6 === h));
  // Chỉ hỏi khi phân nhóm CHƯA chắc: động cơ mới dừng ở nhóm 4 số, hoặc KẾT QUẢ của động cơ còn giữ một phân nhóm anh em
  // (`ungVien6` = results / alternatives — xem ungVienCua). Động cơ đã ra ≥ 6 số mà không còn phân nhóm anh em nào thì
  // không hỏi lại phân nhóm (L3: chỉ động cơ quyết phân nhóm) — kể cả khi đang đứng ở phân nhóm "… khác".
  if (top6 && !ungVienKhac.length) {
    if (dem && LA_PHAN_CON_LAI(tenTop)) dem.daChot6So = (dem.daChot6So || 0) + 1; // trước đây vẫn hỏi (phần còn lại)
    return null;
  }
  const hang = (o) => (o.khop ? 0 : ungVienKhac.includes(o.hs6) ? 1 : o.hs6 === top6 ? 2 : 3);
  const xep = ds.map((o, i) => ({ o, i })).sort((a, b) => hang(a.o) - hang(b.o) || a.i - b.i).map((x) => x.o);
  const liet = xep.slice(0, TRAN_LUA_CHON_PN6);
  const nhan = (o) => `${dot6(o.hs6)} – ${clip(o.tenVi, 70)}`;
  const chu = (o) => `${nhan(o)}${o.khop ? ` (mô tả có chữ "${o.khop}")` : ''}${o.hs6 === top6 ? ' (máy đang tạm xếp)' : ''}`;
  const s = loadSoTay(h4);
  const tieuChi = (s?.tieuChi6 || []).filter((t) => liet.some((o) => o.hs6 === nz(t.hs6)) && t.trich);
  const trichChinh = liet.filter((o) => hang(o) < 3).map(nhan);
  return {
    key: `phan_nhom_${h4}`, loai: 'PHAN_NHOM_6',
    questionVi: `Hàng thuộc phân nhóm nào của nhóm ${dot4(h4)}? ${liet.map(chu).join('; ')}${xep.length > liet.length ? `; … (còn ${xep.length - liet.length} phân nhóm khác)` : ''}.`,
    whereToFind: 'Catalogue / thông số kỹ thuật của nhà sản xuất: công dụng và nguyên lý làm việc của hàng.',
    options: liet.map(nhan),
    canCu: 'so-tay',
    nguon: tieuChi.length ? tieuChi[0].nguon : `tieuDe.${liet.filter((o) => hang(o) < 3).map((o) => o.hs6).join('|') || h4}`,
    trich: clip(tieuChi.length ? tieuChi.map((t) => t.trich).join(' | ') : (trichChinh.length ? trichChinh : liet.map(nhan)).join(' | '), 400),
    phanNhomKhopMoTa: ds.filter((o) => o.khop).map((o) => ({ hs6: o.hs6, cum: o.khop })),
  };
}

// ───────────────────────── (2) điều kiện DÒNG 8 số ─────────────────────────
const dot8 = (h) => `${h.slice(0, 4)}.${h.slice(4, 6)}.${h.slice(6, 8)}`;
const chuDong = (d) => String(d?.trich || '').replace(/^[\d~r.\s]+[-–\s]*/u, '').trim();
const LA_LOAI_KHAC = (ten) => /^lo[aạ]i kh[aá]c\b/iu.test(String(ten || '').replace(/^[-\s–]+/, '').trim());
// Điều kiện kiểu TÊN LOẠI / CÔNG DỤNG: tự nó là chữ của MỘT dòng biểu ("Khóa cửa", "dùng cho xe…") — hỏi được ngay cả
// khi chỉ xuất hiện ở một dòng (Có → dòng đó, Không → phần còn lại).
const KIEU_TEN = new Set(['TEN_LOAI', 'CONG_DUNG']);

/** Các dòng 8 số của phân nhóm theo cây biểu thuế. `phang` = mọi dòng là con TRỰC TIẾP của phân nhóm (không lồng cấp gạch). */
function dong8Cua(pn6) {
  const T = TREE();
  const n = T.nodeOf(pn6);
  if (!n) return { n8: 1, phang: true, dong: [] }; // phân nhóm chỉ là MỘT dòng 8 số nằm thẳng dưới nhóm (vd 3926.10.00)
  const dong = [];
  const di = (id, sau) => {
    const x = T.nodeOf(id);
    if (!x || sau > 6) return;
    if (/^\d{8}$/.test(String(x.id)) && !(x.children || []).length) { dong.push({ hs: x.id, tenVi: String(x.tenVi || '').trim(), sau }); return; }
    for (const c of x.children || []) di(c, sau + 1);
  };
  for (const c of n.children || []) di(c, 0);
  if (!dong.length) return { n8: 1, phang: true, dong: [] }; // nút phân nhóm chính là dòng 8 số duy nhất
  return { n8: dong.length, phang: dong.length > 0 && dong.every((d) => d.sau === 0), dong };
}

/**
 * ĐƯỜNG LÙI khi sổ chưa cho câu hỏi dòng: MỘT câu chọn dòng, liệt kê NGUYÊN VĂN các dòng 8 số anh em của biểu thuế.
 * Chỉ cho phân nhóm PHẲNG, ≤ TRAN_DONG_LIET_KE dòng; "Loại khác" luôn đặt cuối. Căn cứ là chữ biểu thuế — KHÔNG gọi là sổ tay.
 */
function cauChonDong(pn6) {
  const t = dong8Cua(pn6);
  if (!t.phang || t.n8 < 2 || t.n8 > TRAN_DONG_LIET_KE) return null;
  const xep = [...t.dong.filter((d) => !LA_LOAI_KHAC(d.tenVi)), ...t.dong.filter((d) => LA_LOAI_KHAC(d.tenVi))];
  const nhan = (d) => `${dot8(d.hs)} – ${clip(d.tenVi, 120)}${LA_LOAI_KHAC(d.tenVi) ? ' (không thuộc các loại trên)' : ''}`;
  let tenPn = '';
  try { tenPn = String(TREE().nodeOf(pn6)?.tenVi || '').trim(); } catch { tenPn = ''; }
  return {
    key: `chon_dong_${pn6}`, loai: 'CHON_DONG_8',
    questionVi: `Hàng thuộc dòng nào của phân nhóm ${dot6(pn6)}${tenPn ? ` (${clip(tenPn, 70)})` : ''}? ${xep.map(nhan).join('; ')}; hoặc "Chưa rõ".`,
    whereToFind: 'Catalogue / thông số kỹ thuật, tem nhãn hàng.',
    options: [...xep.map(nhan), 'Chưa rõ'],
    canCu: 'bieu-thue', nguon: xep.map((d) => `tax.${d.hs}`).join('|'), trich: xep.map((d) => `${d.hs} ${d.tenVi}`).join(' | '), pn6,
  };
}

/** Mọi điều kiện đơn (kể cả trong HOAC) của các dòng + nút của một phân nhóm, kèm dòng nguồn. */
function dieuKienCuaPn6(h4, pn6) {
  const s = loadSoTay(h4);
  const { rg, dongCungPn6 } = dong8HieuLuc(s, pn6);
  const kq = [];
  const duyet = (c, d) => {
    if (!c || typeof c !== 'object') return;
    if (Array.isArray(c.phuongAn)) { for (const pa of c.phuongAn) for (const x of pa || []) duyet(x, d); return; }
    if (c.fact) kq.push({ c, d });
  };
  const nut = [...(rg?.dieuKienNut || []), ...(s?.dieuKienNut || [])].filter((n) => nz(String(n.id).split('~')[0]).startsWith(pn6));
  for (const d of [...nut, ...dongCungPn6]) for (const c of d.dieuKienSo || []) duyet(c, d);
  return { coRanhGioi: Boolean(rg), dieuKien: kq };
}

function cauDong8({ h4, maXet, text, ghiPn6 }) {
  const pn6 = maXet.slice(0, 6);
  const { coRanhGioi, dieuKien } = dieuKienCuaPn6(h4, pn6);
  const canCu = coRanhGioi ? 'ranh-gioi-pn6' : 'so-tay';
  const out = [];
  const loi = cauHoiSoTay({ code: maXet, productText: text, facts: {} });
  const coDongBieu = (loi.questions || []).some((q) => q.loai === 'DONG_BIEU');
  const uuTien = uuTienPhanDong();
  const phanDong = [];
  for (const q of loi.questions || []) {
    if (q.loai === 'DONG_BIEU') {
      const dk = dieuKien.find((x) => x.c.fact === q.key || (LA_VAT_LIEU(q.key) && LA_VAT_LIEU(x.c.fact)));
      // Lời hỏi: dữ kiện có kiểu (tu-vung) → câu hỏi soạn sẵn của tu-vung (tự nêu đơn vị); khoá cũ → câu của lõi.
      let cauVi = q.questionVi; let tuVung = false;
      try { if (q.askStaff || !FACT_LABELS[khoaCuaFact(q.key) || q.key]) { const c = TV().cauHoiCho(q.key, 'vi'); if (c) { cauVi = c; tuVung = true; } } } catch { /* giữ câu của lõi */ }
      // Nguồn: đúng dòng/nút của sổ mang điều kiện này (lõi chỉ kèm nguồn của dòng chưa biết ĐẦU TIÊN cho mọi câu).
      // Lõi (chotDong8) đã đọc mô tả rồi mới báo thiếu: với dữ kiện kiểu tên loại / công dụng thì "mô tả có tên hàng"
      // KHÔNG có nghĩa đã trả lời được điều kiện của dòng — không lọc lại bằng daCo (22 phân nhóm bị lọc oan).
      out.push({ key: q.key, loai: 'DONG_8', fact: q.key, giuDuDaCo: KIEU_TEN.has(dk?.c?.op), tuVung, questionVi: cauVi, whereToFind: 'Thông số trên tem/nhãn hàng, catalogue hoặc trang bán hàng.', ...(q.unit && !tuVung ? { unit: q.unit } : {}), ...(q.options ? { options: q.options } : {}), canCu, nguon: dk?.d?.nguon || q.nguon || `so-tay.${h4}`, trich: dk?.d?.trich || q.trich || '', pn6 });
    } else if (q.loai === 'CONG') {
      out.push({ key: `${q.key}_${pn6}`, loai: 'CONG_SO_TAY', questionVi: q.questionVi, whereToFind: 'Catalogue / thông số kỹ thuật: công dụng, cấu tạo của hàng.', options: q.options, canCu: 'so-tay', nguon: q.nguon || `so-tay.${h4}`, trich: q.trich || '', pn6 });
    }
  }
  // Máy chốt dòng không liệt kê dữ kiện thiếu (vd "phủ định chưa hoàn chỉnh") → lấy thẳng dữ kiện mà chữ dòng biểu
  // dùng để phân dòng (dong8[].dieuKienSo, dieuKienNut) và mô tả CHƯA nêu.
  // Chỉ dữ kiện là TRỤC PHÂN DÒNG thật: xuất hiện ở ≥ 2 dòng/nút của phân nhóm (dữ kiện riêng của một dòng lẻ trong
  // phân nhóm "Loại khác" nhiều mặt hàng thì không hỏi — tránh hỏi "cách điều khiển van" cho cái móc nhựa 3926.90).
  if (!coDongBieu) {
    const soDong = new Map();
    for (const { c, d } of dieuKien) { const k = c.fact; if (!soDong.has(k)) soDong.set(k, new Set()); soDong.get(k).add(d.hs || d.id || d.nguon); }
    const daXet = new Set();
    const theoTanSuat = [...dieuKien].sort((x, y) => soDong.get(y.c.fact).size - soDong.get(x.c.fact).size);
    for (const { c, d } of theoTanSuat) {
      if (daXet.has(c.fact) || soDong.get(c.fact).size < 2 || KIEU_TEN.has(c.op)) continue;
      daXet.add(c.fact);
      let cauVi = null;
      try { cauVi = TV().cauHoiCho(c.fact, 'vi'); } catch { cauVi = null; }
      const tuVung = Boolean(cauVi);
      if (!cauVi) {
        if (LA_VAT_LIEU(c.fact)) cauVi = 'Vật liệu chính của hàng là gì?';
        else {
          const nhan = FACT_LABELS[khoaCuaFact(c.fact) || c.fact];
          const chuDong = clip(String(d.trich || '').replace(/^[\d~r.\s]+[-–\s]*/u, ''), 80);
          if (nhan) cauVi = `${nhan}${c.donVi ? ` (${c.donVi})` : ''} của hàng là bao nhiêu?${chuDong ? ` (biểu thuế phân dòng theo dữ kiện này, vd "${chuDong}")` : ''}`;
        }
      }
      if (!cauVi) continue; // dữ kiện chưa mô hình thành câu hỏi thân thiện → không bịa câu
      out.push({ key: c.fact, loai: 'DONG_8', fact: c.fact, tuVung, questionVi: cauVi, whereToFind: 'Thông số trên tem/nhãn hàng, catalogue hoặc trang bán hàng.', ...(c.donVi && !tuVung ? { unit: c.donVi } : {}), canCu, nguon: d.nguon || `so-tay.${h4}`, trich: d.trich || '', pn6 });
    }
  }
  // Dòng / nút mang điều kiện TÊN LOẠI hoặc CÔNG DỤNG mà mô tả chưa cho máy chấm được (CHUA_BIET): hỏi thẳng
  // "Hàng có phải là <chữ dòng> không?" — Có → dòng đó, Không → các dòng còn lại. Hỏi được cả khi chỉ MỘT dòng mang nó.
  // Từ 3 dòng kiểu này trở lên trong phân nhóm phẳng ≤ 6 dòng: một câu chọn dòng gọn hơn ba câu có/không.
  let daLietKe = false;
  if (!coDongBieu || uuTien) {
    const rieng = []; const daCoDong = new Set();
    for (const { c, d } of dieuKien) {
      const ma = d.hs || d.id;
      if (!KIEU_TEN.has(c.op) || !ma || daCoDong.has(ma) || !chuDong(d)) continue;
      let tt = 'CHUA_BIET';
      try { tt = danhGiaDong({ ...d, hs: d.hs || String(d.id), dieuKienSo: d.dieuKienSo || [] }, text).trangThai; } catch { tt = 'CHUA_BIET'; }
      if (tt !== 'CHUA_BIET') continue;
      daCoDong.add(ma); rieng.push(d);
    }
    const chon = rieng.length >= 3 ? cauChonDong(pn6) : null;
    if (chon) { phanDong.push(chon); daLietKe = true; } else {
      for (const d of rieng) {
        const dich = d.hs ? `dòng ${dot8(d.hs)}` : 'nhánh này';
        phanDong.push({ key: `la_${d.hs || d.id}`, loai: 'DONG_8', questionVi: `Hàng có phải là "${clip(chuDong(d), 140)}" không? (Có → ${dich}; Không → các dòng còn lại của phân nhóm ${dot6(pn6)})`, whereToFind: 'Catalogue / thông số kỹ thuật: tên gọi, công dụng của hàng.', options: ['Có', 'Không', 'Chưa rõ'], canCu, nguon: d.nguon || `so-tay.${h4}`, trich: d.trich || '', pn6, dong: d.hs || String(d.id) });
      }
    }
  }
  // Cờ ON + lõi đã hỏi DONG_BIEU: câu phân dòng ưu tiên lên ĐẦU (stats ghiPn6 ghi dấu uuTienPhanDong) — chỗ cắt
  // TRAN_DONG_MOI_PN6 khi đó lấy la_* thay vì che la_* sau 3 câu dữ kiện. Cờ OFF hoặc lõi chưa hỏi: thứ tự y như main.
  if (uuTien && coDongBieu && phanDong.length) out.unshift(...phanDong); else out.push(...phanDong);
  if (ghiPn6) ghiPn6.push({ pn6, canCu, ketQuaLoi: coDongBieu ? 'THIEU_SO_LIEU' : (daLietKe ? 'LIET_KE_DONG' : 'DIEU_KIEN_DONG'), ...(uuTien && coDongBieu && phanDong.length ? { uuTienPhanDong: phanDong.length } : {}) });
  return out.filter((q) => !(q.fact && !q.giuDuDaCo && daCo(q.fact, text))).slice(0, TRAN_DONG_MOI_PN6);
}

// ───────────────────────── ghép ─────────────────────────
/**
 * Ứng viên để dựng câu hỏi.
 *   h4  — nhóm 4 số từ results, giả thuyết vòng 1, alternatives (câu phân biệt nhóm còn qua bộ lọc khớp mô tả);
 *   h6  — phân nhóm 6 số CÒN SỐNG: chỉ lấy từ KẾT QUẢ của động cơ (results, alternatives của vòng 2). Giả thuyết vòng 1
 *         (`dossier.hypotheses`) chỉ tính khi động cơ mới dừng ở nhóm 4 số. Lý do: nhánh dừng sớm lấy giả thuyết đứng đầu
 *         làm kết quả; giả thuyết vòng 1 xếp sau là đoán trước khi đọc hồ sơ, không phải phân nhóm động cơ còn cân nhắc.
 *         Ca thật 21/11: động cơ ra 848120, vòng 1 còn ghi 848180 ⇒ khách bị hỏi lại "8481.80 – Thiết bị khác…".
 *   h6Cu — tập cũ (mọi nguồn), chỉ để đếm số câu phân nhóm bị bỏ.
 */
function ungVienCua(out, top) {
  const h4 = []; const h6 = []; const h6Cu = [];
  const them4 = (ma) => { const c = nz(ma); if (c.length >= 4 && !h4.includes(c.slice(0, 4))) h4.push(c.slice(0, 4)); };
  const them6 = (ds, ma) => { const c = nz(ma); if (c.length >= 6 && !ds.includes(c.slice(0, 6))) ds.push(c.slice(0, 6)); };
  const ketQua = [...(out.results || []).map((r) => r.hs), ...(out.dossier?.alternatives || []).map((a) => a.hs)];
  const giaThuyet = (out.dossier?.hypotheses || []).flatMap((g) => [g.subheading6, g.heading4]);
  for (const m of [...ketQua, ...giaThuyet]) { them4(m); them6(h6Cu, m); }
  for (const m of ketQua) them6(h6, m);
  if (String(top || '').length < 6) for (const m of giaThuyet) them6(h6, m);
  return { h4, h6, h6Cu };
}

function danhDau(out, canCuCauHoi, thongKe) {
  return { ...out, nextAction: { ...out.nextAction, canCuCauHoi }, hoiTheoSoTay: thongKe };
}

/**
 * Dựng lại câu hỏi gửi khách theo sổ. Trả về ĐỐI TƯỢNG MỚI (không sửa `out` — bản đang nằm trong bộ nhớ đệm).
 * Không áp dụng (công tắc tắt, không phải lượt hỏi, đã áp dụng rồi) → trả đúng `out`.
 * @param {object} out kết quả classifyLoop
 * @param {{rawAttrs?: object|string}} ctx đầu vào của khách (để đọc dữ kiện đã có)
 */
function apDung(out, { rawAttrs } = {}) {
  if (!bat()) return out;
  if (!out || out.status !== 'NEED_FACTS' || out.nextAction?.type !== 'ASK_USER' || !Array.isArray(out.nextAction.questions)) return out;
  if (out.nextAction.canCuCauHoi) return out; // đã áp dụng (lượt chạy lại B1b đi qua hai lần)
  try {
    const dau = out.results?.[0] || null;
    const top = nz(dau?.hs);
    if (top.length < 4) return danhDau(out, 'llm', { lyDo: 'chua-co-nhom' });
    // Phạm vi: động cơ quyết định hỏi khi MỚI dừng ở 4–6 số (hoặc 8 số còn dự kiến). Mã 8 số đã chốt mà vẫn hỏi
    // (vd vướng chốt chặn) → câu hỏi gắn với lý do chặn, không dựng lại.
    if (top.length >= 8 && dau.duKien !== true) return danhDau(out, 'llm', { lyDo: 'ma-8-so' });
    const h4 = top.slice(0, 4);
    if (!loadSoTay(h4)) return danhDau(out, 'llm', { nhom: h4, lyDo: 'nhom-chua-co-so-tay' });

    const text = hoSoChu(out, rawAttrs);
    const uv = ungVienCua(out, top);
    const boLoc = { lacDe: 0, daChot6So: 0 };
    const cau = [];
    const them = (q) => {
      if (!q) return;
      const goc = q.fact ? gocNhan(nhanCua(q.fact)) : null;
      const cu = cau.find((x) => x.key === q.key || (goc && x.goc === goc));
      if (!cu) { cau.push({ ...q, goc }); return; }
      // Cùng dữ kiện ở hai phân nhóm: giữ vị trí câu đầu, ưu tiên lời hỏi của tu-vung (rõ hơn nhãn khoá cũ).
      if (cu.fact && q.fact && !cu.tuVung && q.tuVung) { cu.questionVi = q.questionVi; cu.tuVung = true; delete cu.unit; }
      if (q.pn6 && q.pn6 !== cu.pn6) {
        cu.pn6Khac = [...(cu.pn6Khac || []), q.pn6];
        cu.canCuThem = [...(cu.canCuThem || []), { canCu: q.canCu, nguon: q.nguon, trich: clip(q.trich, 240), phanNhom: q.pn6 }];
      }
    };

    for (const q of cauPhanBietNhom(h4, uv.h4, text, boLoc)) them(q);
    const cauPn6 = cauPhanNhom6({ h4, top, ungVien6: uv.h6, text, dem: boLoc });
    // Đếm: câu phân nhóm mà tập ứng viên cũ (kể cả giả thuyết vòng 1) sẽ sinh ra nhưng nay bỏ vì động cơ đã chốt 6 số.
    if (!cauPn6 && top.length >= 6 && !boLoc.daChot6So && uv.h6Cu.some((h) => h.startsWith(h4) && h !== top.slice(0, 6)) && phanNhomCua(h4).length >= 2) boLoc.daChot6So = 1;
    them(cauPn6);

    const top6 = top.length >= 6 ? top.slice(0, 6) : null;
    const pn6CoTrongBieu = new Set(phanNhomCua(h4).map((o) => o.hs6));
    const pn6Khac = [...(cauPn6?.phanNhomKhopMoTa || []).map((o) => o.hs6), ...uv.h6.filter((h) => h.startsWith(h4))]
      .filter((h, i, a) => h !== top6 && !a.slice(0, i).includes(h) && pn6CoTrongBieu.has(h));
    const maXet = [...(top6 ? [top] : []), ...pn6Khac].slice(0, TRAN_PN6_XET);
    const ghiPn6 = [];
    for (const ma of maXet) for (const q of cauDong8({ h4, maXet: ma, text, ghiPn6 })) them(q);

    // ĐƯỜNG LÙI: phân nhóm đứng đầu có ≥ 2 dòng 8 số mà sổ (chưa DUYET, hoặc DUYET nhưng không ra câu) chưa cho câu
    // hỏi dòng nào → một câu chọn dòng theo chữ biểu thuế (chỉ phân nhóm phẳng ≤ 6 dòng). Máy đã tự chốt được dòng từ
    // mô tả thì không hỏi.
    let lyDoKhongCan = null; let lyDoLlm = 'so-khong-ra-cau';
    if (top6) {
      const t = dong8Cua(top6);
      const coCauDong = cau.some((q) => ['DONG_8', 'CHON_DONG_8'].includes(q.loai) && (q.pn6 === top6 || (q.pn6Khac || []).includes(top6)));
      if (t.n8 <= 1) lyDoKhongCan = 'mot-dong';
      else if (!coCauDong) {
        let cd = null;
        try { cd = chotDong8({ hs: top, productText: text }); } catch { cd = null; }
        if (cd && (cd.ketQua === 'CHOT' || cd.ketQua === 'LOAI_KHAC') && cd.hs) lyDoKhongCan = 'may-chot-duoc-dong';
        else { const q = cauChonDong(top6); if (q) them(q); else lyDoLlm = t.phang ? 'qua-6-dong' : 'long-nhieu-cap'; }
      }
    }
    const soCauSo = cau.length;
    // Không còn gì để hỏi ở mức phân nhóm lẫn mức dòng: phân nhóm chỉ có MỘT dòng 8 số, hoặc máy tự chốt được dòng.
    // Đây KHÔNG phải "rơi về LLM" — ghi nhãn riêng để số đo tỉ lệ rơi phản ánh đúng.
    const khongCanHoiDong = !soCauSo && Boolean(lyDoKhongCan);
    // Bộ lọc vừa bỏ hết câu của sổ (lạc đề / phân nhóm đã chốt): KHÔNG rơi về câu LLM — còn trường khai theo nhóm thì hỏi
    // trường khai (nhãn "truong-khai-nhom"); không còn gì mới về LLM.
    const locHet = !soCauSo && !khongCanHoiDong && (boLoc.lacDe + boLoc.daChot6So) > 0 && (out.missingStructured || []).some((f) => f?.key && f.questionVi);
    if (!soCauSo && !khongCanHoiDong && !locHet) return danhDau(out, 'llm', { nhom: h4, pn6: ghiPn6, lyDo: lyDoLlm, boLoc });

    // (3) trường khai còn thiếu theo nhóm — đúng danh sách `missingStructured` động cơ đã tính cho mã đứng đầu.
    for (const f of out.missingStructured || []) {
      if (!f?.key || !f.questionVi) continue;
      if (f.key === 'material' && (chatLieuTrong(text).length || cau.some((x) => x.fact && LA_VAT_LIEU(x.fact)))) continue;
      const goc = gocNhan(f.labelVi || f.key);
      if (cau.some((x) => x.goc && x.goc === goc)) continue;
      cau.push({ key: f.key, loai: 'TRUONG_KHAI', nhan: f.labelVi, goc, questionVi: f.questionVi, ...(f.questionZh ? { questionZh: f.questionZh } : {}), whereToFind: 'Tem/nhãn hàng, catalogue hoặc hỏi người bán.', canCu: 'truong-khai-nhom', nguon: `Trường khai bắt buộc theo nhóm ${dot4(f.heading || h4)} (TT 39/2018/TT-BTC)`, trich: f.labelVi ? `${f.labelVi}${f.ecusHint ? ` (${f.ecusHint})` : ''}` : '' });
    }

    // (4) câu của LLM: khớp cùng dữ kiện với một câu của sổ → câu của sổ thay nó; không khớp → ghi chú thêm.
    const ghiChuThem = [];
    let llmKhop = 0;
    for (const q of out.nextAction.questions) {
      const chu = chuan(q?.questionVi);
      if (!chu) continue;
      // Một câu LLM có thể chạm nhiều dữ kiện ("áp suất vận hành…") → nhận dữ kiện có cụm xuất hiện SỚM NHẤT (chủ ngữ câu hỏi).
      let trung = null; let viTri = Infinity;
      for (const x of cau) {
        if (!x.fact && x.loai !== 'TRUONG_KHAI') continue;
        for (const c of cumNhanRa(x.fact || x.key, x.fact ? nhanCua(x.fact) : x.nhan)) {
          const i = ` ${chu} `.includes(` ${c} `) ? ` ${chu} `.split(` ${c} `)[0].length : -1; // vị trí cụm đầu tiên
          if (i >= 0 && i < viTri) { viTri = i; trung = x; }
        }
      }
      if (trung) { trung.llmCungHoi = true; llmKhop += 1; } else ghiChuThem.push(q.questionVi);
    }

    // Thứ tự: nhóm 4 số → phân nhóm 6 số → dòng 8 số → cổng sổ tay → trường khai; trong cùng bậc, câu LLM cũng hỏi đứng trước.
    const BAC = { PHAN_BIET_NHOM: 0, PHAN_NHOM_6: 1, DONG_8: 2, CHON_DONG_8: 2.5, CONG_SO_TAY: 3, TRUONG_KHAI: 4 };
    const xep = cau.map((q, i) => ({ q, i })).sort((a, b) => BAC[a.q.loai] - BAC[b.q.loai] || Number(Boolean(b.q.llmCungHoi)) - Number(Boolean(a.q.llmCungHoi)) || a.i - b.i).map((x) => x.q);
    const chon = xep.slice(0, TRAN_CAU);
    const questions = chon.map((q) => ({
      attribute: null, questionVi: q.questionVi, whereToFind: q.whereToFind,
      canCu: q.canCu, nguon: q.nguon, trich: clip(q.trich, 400), loai: q.loai, khoa: q.fact || q.key,
      ...(q.questionZh ? { questionZh: q.questionZh } : {}), ...(q.unit ? { unit: q.unit } : {}), ...(q.options ? { options: q.options } : {}),
      ...(q.pn6 ? { phanNhom: [q.pn6, ...(q.pn6Khac || [])] } : {}), ...(q.canCuThem ? { canCuThem: q.canCuThem } : {}),
      ...(q.phanNhomKhopMoTa?.length ? { phanNhomKhopMoTa: q.phanNhomKhopMoTa } : {}),
      ...(q.llmCungHoi ? { llmCungHoi: true } : {}),
    }));
    const demCanCu = {};
    for (const q of questions) demCanCu[q.canCu] = (demCanCu[q.canCu] || 0) + 1;
    // `missing` = bản chữ của cùng danh sách câu hỏi (giữ các dòng "Chưa chốt được: …" của chốt chặn nếu có).
    const giuLai = (out.missing || []).filter((m) => /^Chưa chốt được:/.test(String(m)));
    const canCuCauHoi = khongCanHoiDong ? 'khong-can-hoi-dong' : questions.some((q) => q.canCu === 'so-tay' || q.canCu === 'ranh-gioi-pn6') ? 'so-tay' : questions.some((q) => q.canCu === 'bieu-thue') ? 'bieu-thue' : 'truong-khai-nhom';
    // Không cần hỏi dòng mà cũng không có trường khai nào thiếu: KHÔNG trả ASK_USER rỗng — giữ câu của LLM làm câu hỏi
    // (tương thích bên gọi), nhãn vẫn là "khong-can-hoi-dong".
    if (!questions.length) return danhDau(out, canCuCauHoi, { nhom: h4, ma: top, pn6: ghiPn6, lyDo: lyDoKhongCan, giuCauLlm: true, boLoc });
    return {
      ...out,
      nextAction: { ...out.nextAction, questions, canCuCauHoi, ghiChuThem },
      missing: [...new Set([...questions.map((q) => q.questionVi), ...giuLai])],
      hoiTheoSoTay: {
        nhom: h4, ma: top, pn6: ghiPn6, soCau: questions.length, theoCanCu: demCanCu, ...(khongCanHoiDong ? { lyDo: lyDoKhongCan } : {}), ...(locHet ? { lyDo: 'loc-het-cau-so' } : {}), boLoc,
        soCauBiCat: xep.length - chon.length,
        llm: { tong: out.nextAction.questions.length, khopSo: llmKhop, sangGhiChu: ghiChuThem.length },
      },
    };
  } catch (e) {
    // Tầng tuỳ chọn: lỗi ở đây không bao giờ làm hỏng lượt phân loại — trả câu hỏi cũ, đánh dấu để đo.
    return danhDau(out, 'llm', { lyDo: 'loi', loi: String(e?.message || e).slice(0, 120) });
  }
}

module.exports = { bat, apDung, hoSoChu, khopPhanBiet, ungVienCua, phanNhomCua, dong8Cua, cauChonDong, cauPhanNhom6, cauPhanBietNhom, cauDong8, gocNhan, cumNhanRa, daCo, TRAN_CAU };
