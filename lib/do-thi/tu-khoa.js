// lib/do-thi/tu-khoa.js — rút từ khoá BẰNG LUẬT (không LLM) cho bảng cạnh (ADR-0002).
//
// Dùng ở hai chỗ:
//   - `tuKhoaTuTieuDe` của cạnh C11: từ nội dung của tiêu đề có tên riêng trong biểu thuế.
//   - `tuKhoaDieuKien` của cạnh C5 / C6: từ nội dung của chính dòng loại trừ gốc (`dieuKien`).
// Mọi từ khoá ở dạng KHÔNG DẤU, chữ thường (khách gõ "thuỷ"/"thủy"/"thuy" đều khớp). Đây là âm tiết, không phải từ đã
// tách nghĩa: "khí nén" → ["khi", "nen"]. Chỉ để SO KHỚP với mô tả hàng, không phải căn cứ (căn cứ là `trich`).
'use strict';

/** Bỏ dấu, đ→d, chữ thường; mọi ký tự không phải chữ / số thành dấu cách. Giữ chữ Hán. */
function khongDau(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Từ dừng (không dấu): hư từ, từ chỉ quan hệ, từ khung của biểu thuế / chú giải. Sửa danh sách này làm đổi bảng cạnh:
// chạy lại `node scripts/dung-bang-canh.mjs --ghi`.
const TU_DUNG = new Set(`va hoac cua cho co khong loai khac dung bang tu tren duoi cac nhung da hay the nay voi trong ngoai
duoc la thuoc ke ca tru den qua nhung tro len xuong chua mot hai theo nhu tai de khi ma o ra vao nhom phan chuong
muc chi tiet neu thi do boi ve so luc viec su bi phai can nao gi ay do day kia sen tuong tu chung rieng moi
other of or and the for with not than in to a an`.split(/\s+/).filter(Boolean));

// Âm tiết đứng đầu quá chung: một mình nó khớp thì chưa nói được gì ("máy …", "bộ …", "thiết bị …").
const DAU_QUA_CHUNG = new Set(`may bo thiet san hang do vat dung chat bo phan phu tam thanh ong day bang mieng
phe lieu linh kien chi tiet cum he thong`.split(/\s+/).filter(Boolean));

/** Từ khoá nội dung của một câu: bỏ từ dừng, bỏ số trần, bỏ âm tiết 1 ký tự; giữ thứ tự xuất hiện, bỏ trùng. */
function tuKhoa(cau) {
  const ra = [];
  const thay = new Set();
  for (const w of khongDau(cau).split(' ')) {
    if (w.length < 2 || TU_DUNG.has(w) || /^\d+$/.test(w) || thay.has(w)) continue;
    thay.add(w);
    ra.push(w);
  }
  return ra;
}

/**
 * Điều kiện của một dòng loại trừ có KHỚP mô tả hàng không. Luật (tất định):
 *   - âm tiết nội dung ĐẦU TIÊN của điều kiện (tiếng Việt: danh từ chính đứng đầu) phải có trong mô tả;
 *   - nếu âm tiết đầu thuộc nhóm quá chung ("máy", "bộ", "thiết"…) thì âm tiết nội dung THỨ HAI cũng phải có.
 * Trả null khi không khớp; khớp thì trả { soKhop, tyLe } để xếp hạng.
 * @param {string[]} tuKhoaDieuKien  từ khoá của điều kiện (đã rút bằng tuKhoa())
 * @param {Set<string>} tuMoTa        tập âm tiết không dấu của mô tả hàng
 */
function khopDieuKien(tuKhoaDieuKien, tuMoTa) {
  const k = tuKhoaDieuKien || [];
  if (!k.length || !tuMoTa || !tuMoTa.size) return null;
  if (!tuMoTa.has(k[0])) return null;
  if (DAU_QUA_CHUNG.has(k[0]) && !(k.length > 1 && tuMoTa.has(k[1]))) return null;
  let soKhop = 0;
  for (const w of k) if (tuMoTa.has(w)) soKhop += 1;
  return { soKhop, tyLe: Number((soKhop / k.length).toFixed(3)) };
}

/** Tập âm tiết không dấu của mô tả hàng (để truyền vào khopDieuKien). */
function tapTuMoTa(moTa) {
  return new Set(khongDau(moTa).split(' ').filter((w) => w.length >= 2));
}

const TONE_MAP = [
  ['oà', 'òa'], ['oá', 'óa'], ['oả', 'ỏa'], ['oã', 'õa'], ['oạ', 'ọa'],
  ['oè', 'òe'], ['oé', 'óe'], ['oẻ', 'ỏe'], ['oẽ', 'õe'], ['oẹ', 'ọe'],
  ['uỳ', 'ùy'], ['uý', 'úy'], ['uỷ', 'ủy'], ['uỹ', 'ũy'], ['uỵ', 'ụy'],
];

function chuanCoDau(s) {
  let t = String(s == null ? '' : s).normalize('NFC').toLowerCase();
  for (let i = 0; i < TONE_MAP.length; i += 1) {
    t = t.replaceAll(TONE_MAP[i][0], TONE_MAP[i][1]);
  }
  return t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function boDauChuan(s) {
  return chuanCoDau(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

// Từ dừng CÓ DẤU: tách biệt "với" (hư từ) khỏi "vòi" (vòi nước), "ăn" (bộ đồ ăn) khỏi "an" (mạo từ EN), giữ "trở" (điện trở, biến trở).
const TU_DUNG_CO_DAU = new Set(`và hoặc của cho có không loại khác dùng bằng từ trên dưới các những đã hay thế này với trong ngoài
được là thuộc kể cả trừ đến tới quá lên xuống chưa một hai ba bốn năm sáu bảy tám chín mười theo như tại để khi mà ở ra vào nhóm phân chương
mục chi tiết nếu thì do bởi về số lúc việc sự bị phải cần nào gì ấy đó đây kia xen tương tự chung riêng mỗi mọi
ví dụ tức chẳng hạn cách làm sao nhau chỉ chủ yếu phần hơn nhất còn lại vì vậy tuy nhiên sau trước đều
other of or and the for with not than in to a an as by from such`.split(/\s+/).filter(Boolean));
const TU_DUNG_KHONG_DAU = new Set([...TU_DUNG_CO_DAU].map(boDauChuan));

// Từ đứng đầu quá chung / vật liệu đơn lẻ (không đủ làm cụm phân biệt nếu thiếu cụm 2 tiếng liền kề).
const DAU_CHUNG_MO_RONG = new Set(`máy bộ thiết sản hàng đồ vật dụng chất phận phụ tấm thanh ống dây băng miếng
phế liệu linh kiện chi tiết cụm hệ thống loại mặt chiếc cục khối viên hạt bột sợi vải giấy nhựa thép nhôm đồng sắt gỗ da kính sứ gốm cao su
nước khí điện hơi dầu dao kéo kìm búa đinh ốc vít chế phẩm hỗn hợp thích hợp biến chiết xuất dát mỏng ngâm tẩm dạng phần`.split(/\s+/).filter(Boolean));
const DAU_CHUNG_MO_RONG_KD = new Set([...DAU_CHUNG_MO_RONG].map(boDauChuan));

const TU_DAN_BO_NGHIA = /^(?:bằng|từ|làm|dùng|có|không|gồm|chứa|được|bị|cho|để|với|theo|khi|ở|về|như|hoặc|và|dệt|tráng|phủ|ngâm|ép|đã|chưa|khổ|rộng|dài|cao|trên|dưới|tức|ví dụ)(?![\p{L}\p{N}])/u;
const PRED_SPLIT_GUARD = /\s+(?:là|đã|chưa|được|có|không|làm|dùng|thuộc|khổ|bằng|từ|để|cho|với|của)(?![\p{L}\p{N}])/u;
const PRED_OR_TAIL = /\s+(?:là|đã|chưa|được|có|không|làm|dùng|thuộc|khổ|bằng|từ|để)(?![\p{L}\p{N}])/u;
const NGOAC_VI_DU = /^(?:như|ví dụ|vd)\s+/iu;
const NGOAC_LOAI_BO = /(?:^|[^\p{L}\p{N}])(?:trừ|không|phải|trong mục|thuộc|chú giải|nằm trong|lần lượt|nếu|nhưng|phân loại|ngoại trừ|đã|được|làm phồng|giới hạn)(?![\p{L}\p{N}])/iu;
const DANH_TU_BAO_GOI = new Set(`các những loại mặt hàng sản phẩm bộ phận linh kiện chi tiết khối đồ dùng vật dụng thiết bị`.split(/\s+/));
const DANH_TU_BAO_GOI_KD = new Set([...DANH_TU_BAO_GOI].map(boDauChuan));

/** Chuẩn bị dữ liệu khớp mô tả hàng cho moRongUngVien (giữ dấu khi mô tả có dấu). */
function chuanBiMoTaMoRong(moTa) {
  const co = chuanCoDau(moTa);
  const hasDau = /[à-ỹđ]/i.test(String(moTa || ''));
  const rawTokens = co ? co.split(' ').filter((w) => w.length >= 2) : [];
  const rawKd = rawTokens.map(boDauChuan);
  const coSet = new Set(rawTokens);
  const kdSet = new Set(rawKd);
  const coBi = new Set();
  const kdBi = new Set();
  for (let i = 0; i < rawTokens.length - 1; i += 1) {
    coBi.add(`${rawTokens[i]} ${rawTokens[i + 1]}`);
    kdBi.add(`${rawKd[i]} ${rawKd[i + 1]}`);
  }
  return { hasDau, coSet, kdSet, coBi, kdBi };
}

function tachMenhDeDieuKien(dieuKien) {
  let s = String(dieuKien || '').normalize('NFC').toLowerCase();
  for (let i = 0; i < TONE_MAP.length; i += 1) {
    s = s.replaceAll(TONE_MAP[i][0], TONE_MAP[i][1]);
  }
  // Xử lý nội dung trong ngoặc đơn: chỉ giữ liệt kê ví dụ thuần danh từ; bỏ toàn bộ chú thích/ngoại lệ/loại trừ.
  s = s.replace(/\(([^)]+)\)/g, (_, inner) => {
    const clean = inner.trim();
    if (NGOAC_LOAI_BO.test(clean)) return ' ';
    if (NGOAC_VI_DU.test(clean)) return `, ${clean.replace(NGOAC_VI_DU, '')}, `;
    // Danh từ ví dụ ngắn ("vali, ba lô...", "singlet") giữ lại nếu ≤ 6 từ mỗi mục
    const items = clean.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
    if (items.length >= 1 && items.every((x) => x.split(/\s+/).length <= 5)) {
      return `, ${clean}, `;
    }
    return ' ';
  });
  // Cắt phần ngoại lệ đứng sau ở mức ngoài ngoặc và cụm ngưỡng "trở lên/xuống"
  s = s.replace(/(?:^|[,;\s])(?:trừ|không bao gồm|không phải|nằm trong danh mục bị loại trừ|theo chú giải|phân loại theo chất liệu)[^,;]*/g, ' ');
  s = s.replace(/(?:^|[^\p{L}\p{N}])trở\s+(?:lên|xuống)(?![\p{L}\p{N}])/gu, ' ');
  // Chỉ tách danh sách dấu phẩy ở vùng chủ ngữ TRƯỚC vị ngữ/giới từ ("là/dùng cho/của/với/đã…")
  // để không cắt "dùng cho xe môtô, xe máy, xe đạp" thành các mệnh đề độc lập ("xe máy").
  const idxPred = s.search(PRED_SPLIT_GUARD);
  const headPart = idxPred > 0 ? s.slice(0, idxPred) : s;
  const tailPart = idxPred > 0 ? s.slice(idxPred) : '';
  const rawParts = headPart.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const p of rawParts) {
    if (out.length && TU_DAN_BO_NGHIA.test(p)) {
      out[out.length - 1] += ` ${p}`;
    } else {
      out.push(p);
    }
  }
  if (tailPart) {
    if (out.length) out[out.length - 1] += tailPart;
    else out.push(tailPart.trim());
  }
  // Chỉ tách "hoặc" ở phần chủ ngữ ĐẦU câu (trước vị ngữ/bổ ngữ "là/đã/chưa/được/có/không/làm/dùng/thuộc/khổ/bằng/từ/để"),
  // giữ nguyên phần bổ ngữ dùng chung gắn vào từng vế để không biến "ngâm tẩm, tráng, phủ" hay "Vải gió dệt kim" mất điều kiện kèm theo.
  const expanded = [];
  for (const cl of out) {
    expanded.push({ cl, tuHoac: false });
    const predIdx = cl.search(PRED_OR_TAIL);
    const subjPart = predIdx > 0 ? cl.slice(0, predIdx) : cl;
    const sharedTail = predIdx > 0 ? cl.slice(predIdx) : '';
    if (/\s+hoặc\s+/.test(subjPart)) {
      const subs = subjPart.split(/\s+hoặc\s+/).map((x) => x.trim()).filter(Boolean);
      const validSubs = subs.filter((sub) => {
        const t = rutTuMenhDe(sub, true);
        return t.length >= 3 || (t.length === 2 && !DAU_CHUNG_MO_RONG.has(t[0]) && !DAU_CHUNG_MO_RONG.has(t[1]));
      });
      if (validSubs.length >= 2) {
        for (const sub of validSubs) expanded.push({ cl: `${sub}${sharedTail}`, tuHoac: true, subj2: sub });
      }
    }
  }
  return expanded;
}

function rutTuMenhDe(cl, hasDau) {
  const words = chuanCoDau(cl).split(' ').filter((w) => w.length >= 2 && !/^\d+$/.test(w));
  const stop = hasDau ? TU_DUNG_CO_DAU : TU_DUNG_KHONG_DAU;
  const out = [];
  const seen = new Set();
  for (const raw of words) {
    const w = hasDau ? raw : boDauChuan(raw);
    if (stop.has(w) || /^(?:xvi+|iv|ix|iii|ii)$/.test(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/**
 * Khớp điều kiện dòng loại trừ (C5/C6) chặt chẽ cho `moRongUngVien`:
 *   - Giữ dấu tiếng Việt khi mô tả có dấu (tránh "giấy"="giày", "đồng"="động", "máy"="may").
 *   - Tách đúng danh sách liệt kê ngoài ngoặc, giữ nguyên danh từ chính trước "là …",
 *     loại bỏ ngoặc ngoại lệ ("trừ…", "không phải…", "trong mục…", "lần lượt thuộc…").
 *   - Khớp hợp lệ khi:
 *     (a) Mệnh đề ngắn/trung bình: khớp ≥ 2 từ nội dung, có danh từ đầu mệnh đề (sau khi bỏ từ bao gói),
 *         có ≥ 1 cặp 2 tiếng liền kề, và tỷ lệ ≥ 0,60 (C5) / ≥ 0,70 (C6); HOẶC
 *     (b) Cụm chủ ngữ mở đầu câu định nghĩa dài: khớp trọn ≥ 3 từ nội dung đầu tiên liên tiếp
 *         (kèm ≥ 2 cặp 2 tiếng liền kề trong vùng đầu câu).
 *   - C6 mang điều kiện chỉ mô tả nhóm nguồn (`thuộc nhóm <e.tu>`) bị bỏ qua.
 */
function khopDieuKienMoRong(canh, moTaCtx) {
  if (!canh || !moTaCtx || !moTaCtx.coSet.size) return null;
  const dk = String(canh.dieuKien || '');
  if (!dk) return null;

  if (canh.loai === 'C6') {
    const tu4 = String(canh.tu || '').slice(0, 4);
    const tuDot = `${tu4.slice(0, 2)}\\.${tu4.slice(2, 4)}`;
    if (new RegExp(`thuộc\\s+nhóm\\s+(?:${tuDot}|${tu4})\\b`, 'i').test(dk) && dk.length < 70) {
      return null;
    }
  }

  const { hasDau } = moTaCtx;
  const set = hasDau ? moTaCtx.coSet : moTaCtx.kdSet;
  const bigrams = hasDau ? moTaCtx.coBi : moTaCtx.kdBi;
  const stopSeq = hasDau ? TU_DUNG_CO_DAU : TU_DUNG_KHONG_DAU;
  const leadSet = hasDau ? DANH_TU_BAO_GOI : DANH_TU_BAO_GOI_KD;
  const chungSet = hasDau ? DAU_CHUNG_MO_RONG : DAU_CHUNG_MO_RONG_KD;

  const clauses = tachMenhDeDieuKien(dk);
  let best = null;
  for (const entry of clauses) {
    const cl = entry.cl;
    const rawWords = chuanCoDau(cl).split(' ').filter((w) => w.length >= 2);
    const tokens = rutTuMenhDe(cl, hasDau);
    if (tokens.length < 2) continue;

    let start = 0;
    while (start < tokens.length - 1 && leadSet.has(tokens[start])) start += 1;
    const variants = start > 0 ? [tokens, tokens.slice(start)] : [tokens];

    const seqW = hasDau ? rawWords : rawWords.map(boDauChuan);
    let biHits = 0;
    let biHeadHits = 0;
    const headRawLimit = Math.min(seqW.length - 1, 7);
    for (let i = 0; i < seqW.length - 1; i += 1) {
      if (!stopSeq.has(seqW[i]) && !stopSeq.has(seqW[i + 1]) && bigrams.has(`${seqW[i]} ${seqW[i + 1]}`)) {
        biHits += 1;
        if (i < headRawLimit) biHeadHits += 1;
      }
    }

    const daProcMatch = cl.match(/\s+đã\s+(?:ngâm|tẩm|tráng|phủ|ép|mạ|sấy|nướng|nhuộm|thêm|trộn|lưu)\b[^\n]*/u);
    const daTokens = daProcMatch ? rutTuMenhDe(daProcMatch[0], hasDau) : [];
    const daMatched = !daTokens.length || daTokens.some((t) => set.has(t));

    let subj2Hit = false;
    if (entry.tuHoac && entry.subj2) {
      const sToks = rutTuMenhDe(entry.subj2, hasDau);
      if (sToks.length === 2 && !chungSet.has(sToks[0]) && !chungSet.has(sToks[1]) && bigrams.has(`${sToks[0]} ${sToks[1]}`)) {
        subj2Hit = true;
      }
    }

    for (const toks of variants) {
      const L = toks.length;
      if (L < 2) continue;
      let hits = 0;
      for (const t of toks) if (set.has(t)) hits += 1;
      if (hits < 2) continue;

      const headHit = set.has(toks[0]) && (!chungSet.has(toks[0]) || set.has(toks[1]));
      const prefix4Hit = L >= 4 && set.has(toks[0]) && set.has(toks[1]) && set.has(toks[2]) && set.has(toks[3]) && biHeadHits >= 3;
      const prefix3Hit = (daMatched && L >= 3 && set.has(toks[0]) && set.has(toks[1]) && set.has(toks[2]) && biHeadHits >= 2) || prefix4Hit;
      const ratio = hits / L;
      const reqRatio = canh.loai === 'C6' ? 0.7 : 0.6;

      let ok = false;
      if (L === 2) {
        ok = hits === 2 && (biHits >= 1 || !chungSet.has(toks[0]));
      } else if (headHit && biHits >= 1 && ratio >= reqRatio) {
        ok = true;
      } else if (headHit && biHits >= 4 && hits >= 6 && ratio >= 0.5) {
        ok = true;
      } else if (prefix3Hit || (subj2Hit && headHit)) {
        ok = true;
      }
      if (!ok) continue;

      const effectiveRatio = (prefix3Hit || subj2Hit) && ratio < reqRatio ? 0.65 : ratio;
      const bonus = (prefix3Hit || subj2Hit) ? (daMatched ? 1.0 : 0.4) : 0;
      const diem = biHits * 2 + effectiveRatio + bonus + (canh.bac === 1 ? 0.5 : 0) + (canh.loai === 'C5' ? 0.2 : 0) + hits * 0.05;
      if (!best || diem > best.diem || (diem === best.diem && hits > best.soKhop)) {
        best = { soKhop: hits, tyLe: Number(ratio.toFixed(3)), diem };
      }
    }
  }
  return best;
}

module.exports = { khongDau, tuKhoa, khopDieuKien, tapTuMoTa, chuanBiMoTaMoRong, khopDieuKienMoRong, TU_DUNG, DAU_QUA_CHUNG };
