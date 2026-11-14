#!/usr/bin/env node
/**
 * scripts/bo-kiem-luat.mjs — Bộ kiểm luật tất định (không gọi LLM), sinh ca từ luật (hs-code-api#1180):
 *   1. Mỗi dòng 8 số có tên:
 *      - Ca "tên phân nhóm 6 số + tên dòng" → phải chốt đúng dòng;
 *      - Mỗi cụm tên khác có nguồn (L1/L2 trong data/tu-vung/) → phải chốt đúng dòng;
 *   2. Mỗi dòng "Loại khác":
 *      - Ca loại trừ (trái điều kiện mọi dòng anh em có tên → phải ra Loại khác);
 *      - Ca thiếu dữ kiện (chỉ có tên phân nhóm 6 số → phải HỎI / không tự chốt);
 *   3. TB-TCHQ của nhóm trong data/precedents.json: phải khớp, hoặc ghi chú lệch.
 *   4. In bảng: chốt đúng / chốt sai / chốt Loại khác sai / hỏi / ném lỗi.
 *      Hỗ trợ `--nhom=<4 số>` và `--toan-bieu`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const T = require('../lib/hs-tree.js');
const TV = require('../lib/tu-vung.js');
const DK = require('../lib/dieu-kien-so.js');
const { chotDong8, soTayGates, loadSoTay } = require('../lib/so-tay-gates.js');
const { dataReadPath } = require('../lib/data-paths.js');
const { lyDoThayThe } = require('../lib/ma-thay-the.js');

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const cleanText = (s) => String(s || '').replace(/^[-\s–]+/, '').replace(/\s*[:：]\s*$/, '').trim();

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

/** Đọc từ điển tên khác có nguồn từ data/tu-vung/ (tu-vung@2.json#tenKhac hoặc ten-khac-<nhom>.json). */
function docTenKhacNhom(nhom4) {
  const out = [];
  const gop = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    const ds = Array.isArray(obj.muc) ? obj.muc : Array.isArray(obj) ? obj : [];
    for (const m of ds) {
      if (!m) continue;
      const hs = nz(m.ma || m.hs);
      if (hs.length === 8 && hs.slice(0, 4) === nhom4) out.push({ ...m, hs });
    }
  };
  try {
    const p1 = dataReadPath('tu-vung', `ten-khac-${nhom4}.json`);
    if (fs.existsSync(p1)) gop(JSON.parse(fs.readFileSync(p1, 'utf8')));
  } catch { /* ignore */ }
  try {
    const p2 = dataReadPath('tu-vung', 'tu-vung@2.json');
    if (fs.existsSync(p2)) {
      const tv2 = JSON.parse(fs.readFileSync(p2, 'utf8'));
      if (tv2 && tv2.tenKhac) {
        if (Array.isArray(tv2.tenKhac)) gop(tv2.tenKhac);
        else if (tv2.tenKhac[nhom4]) gop(tv2.tenKhac[nhom4]);
        else gop(tv2.tenKhac);
      }
    }
  } catch { /* ignore */ }
  const seen = new Set();
  return out.filter((m) => {
    const k = `${nz(m.hs)}|${m.loai || 'DONG_NGHIA'}|${(m.cachDoc?.vi || []).join(',')}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Lấy tên phân nhóm 6 số đầy đủ ngữ cảnh (ghép tiêu đề cha 5 số / 4 số nếu tên PN6 bắt đầu bằng "Loại khác"). */
function tenPhanNhom6(pn6) {
  const n6 = T.nodeOf(pn6);
  const t6 = cleanText(n6?.tenVi || '');
  const parts = [];
  const p5 = T.chaTang(pn6);
  if (p5 && p5.length !== 4) {
    const n5 = T.nodeOf(p5);
    const t5 = cleanText(n5?.tenVi || '');
    if (t5) parts.push(t5);
  }
  if (!t6 || /^lo[aạ]i kh[aá]c\b/i.test(t6)) {
    const n4 = T.nodeOf(pn6.slice(0, 4));
    const t4 = cleanText(n4?.tenVi || '');
    if (t4 && !parts.length) parts.unshift(t4);
  }
  if (t6) parts.push(t6);
  return parts.join(' - ') || pn6;
}

/** Ghép đường dẫn tiêu đề trung gian từ sau pn6 tới trước lá hs8. */
function tieuDeTrungGian(hs8) {
  const pn6 = hs8.slice(0, 6);
  const mids = [];
  let cur = T.chaTang(hs8);
  while (cur && cur !== pn6 && cur.length > 4) {
    const n = T.nodeOf(cur);
    const tv = cleanText(n?.tenVi || '');
    if (tv) {
      mids.unshift({
        id: cur,
        tenVi: tv,
        loaiKhac: /^lo[aạ]i kh[aá]c\b/i.test(tv),
        loaiKhacTran: DK.laLoaiKhacTranTen(n),
      });
    }
    cur = T.chaTang(cur);
  }
  return mids;
}

/** Nạp sổ tay đã hợp nhất ranh giới DUYET (nếu có) để sinh ca loại trừ cho dòng Loại khác. */
function soTayHieuLuc(nhom4, pn6) {
  const st = loadSoTay(nhom4) ? structuredClone(loadSoTay(nhom4)) : { nhom: nhom4, dong8: [], dieuKienNut: [] };
  try {
    const rgPath = dataReadPath('ho-so', 'ranh-gioi', `${pn6}.json`);
    if (fs.existsSync(rgPath)) {
      const rg = JSON.parse(fs.readFileSync(rgPath, 'utf8'));
      if (rg && rg.trangThai === 'DUYET') {
        const byHs = new Map((rg.dong8 || []).map((d) => [nz(d.hs), d]));
        const seen = new Set();
        const dong8 = [];
        for (const d of st.dong8 || []) {
          const h = nz(d.hs);
          if (h.slice(0, 6) === pn6) {
            if (seen.has(h)) continue;
            seen.add(h);
            const r = byHs.get(h);
            if (r) {
              const n = T.nodeOf(h);
              dong8.push({ ...d, ...r, hs: h, loaiKhac: Boolean(n ? n.loaiKhac : d.loaiKhac), loaiKhacTran: Boolean(n ? n.loaiKhacTran : d.loaiKhacTran) });
              continue;
            }
          }
          dong8.push(d);
        }
        for (const [h, r] of byHs.entries()) {
          if (!seen.has(h)) {
            const n = T.nodeOf(h);
            dong8.push({ ...r, hs: h, loaiKhac: Boolean(n?.loaiKhac), loaiKhacTran: Boolean(n?.loaiKhacTran) });
          }
        }
        st.dong8 = dong8;
        const nutMap = new Map((rg.dieuKienNut || []).map((d) => [T.chuanMa(d.id), d]));
        const nutSeen = new Set();
        const dieuKienNut = [];
        for (const d of st.dieuKienNut || []) {
          const id = T.chuanMa(d.id);
          if (nutMap.has(id)) {
            if (nutSeen.has(id)) continue;
            nutSeen.add(id);
            dieuKienNut.push({ ...d, ...nutMap.get(id), id });
          } else dieuKienNut.push(d);
        }
        for (const [id, r] of nutMap.entries()) {
          if (!nutSeen.has(id)) dieuKienNut.push({ ...r, id });
        }
        st.dieuKienNut = dieuKienNut;
      }
    }
  } catch { /* ignore */ }
  return st;
}

/**
 * Lời NGƯỜI ĐỌC của một cụm từ vựng (OZV-325). `cachDoc` là MẪU REGEX máy đọc, không phải chữ đọc được:
 * bóc phần tử đầu rồi chỉ thay `\s+` sẽ để `\s*`, `(?:…)?`, `(a|b)` lọt nguyên vào `productText` của ca kiểm
 * ("không đóng bao bì kín khí(?: để bán lẻ)?"), tức máy chấm luật bằng chữ hàng SAI HÌNH DẠNG. Khuôn lời đúng
 * của repo là `cachViet` (qua TV.vietCum). Dùng vietCum trước; chỉ khi khoá chưa có cachViet mới lùi về nhãn,
 * và dù lùi vẫn phải gỡ hết cú pháp regex.
 */
const boCuPhapRegex = (s) => String(s || '')
  .replace(/\(\?:/g, '(')              // nhóm không bắt → ngoặc thường, rồi gỡ ngoặc tuỳ chọn bên dưới
  .replace(/\(([^()|]*)\)\?/g, '')     // nhóm TUỲ CHỌN "(… )?" → bỏ hẳn (phần không bắt buộc)
  .replace(/\(([^()|]*)\)/g, '$1')     // nhóm còn lại → giữ nội dung
  .replace(/\(([^()]*)\)/g, '$1')      // nhóm có "|" còn sót → giữ nguyên nội dung, gỡ ngoặc
  .replace(/\\s[*+?]/g, ' ')           // \s+ \s* \s? → một dấu cách
  .replace(/\\b|\\\./g, (m) => (m === '\\.' ? '.' : ''))
  .replace(/[*+?]$/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();
/** Lời khẳng định của khoá (vd "đóng bao bì kín khí để bán lẻ"); `giaTri` theo kiểu khoá. */
const loiKhoa = (fact, giaTri, duPhong) => {
  try {
    const s = TV.vietCum(fact, giaTri);
    if (s) return s;
  } catch { /* khoá chưa có cachViet → lùi về nhãn */ }
  return boCuPhapRegex(duPhong);
};

/**
 * Lời của một VẾ SỐ ("đường kính 20mm") — OZV-325 vòng hai, theo cách GĐ chỉ ở PR #1223.
 *
 * Trước: nhánh vế số tự ghép `boCuPhapRegex(cachDoc.vi[0]) + số + donVi`. `cachDoc` là MẪU REGEX, nên 15 khoá
 * SỐ dùng lookaround/nhóm chọn vẫn lọt cú pháp vào chữ hàng dù đã bóc: `"đường kính(?!\s*(?:trong|lõi|cửa))"`
 * ra `"đường kính(?! trong|lõi|cửa)"`, `"(?<!đường\s+chéo\s+ngoài\s+của\s+)mặt\s+cắt\s+ngang(?!\s+hình)"` ra
 * `"?<!đường chéo ngoài của mặt cắt ngang?! hình"`. Bóc lookaround bằng cách gỡ ngoặc thì về nguyên tắc không
 * bao giờ đủ — nên KHÔNG đắp thêm regex vào `boCuPhapRegex`, mà đi khuôn lời đúng của repo: `cachViet` qua
 * `TV.vietCum` (cả 15 khoá đều đã có `cachViet`).
 *
 * `vietCum` kiểu SO viết số ở ĐƠN VỊ CHUẨN của khoá, nên phải `TV.quyDoi` trước ("90 tấn" → "90000kg"), đúng
 * như `lib/dieu-kien-so.js` quy ngưỡng về đơn vị chuẩn khi chấm.
 *
 * Cổng tự kiểm bắt buộc, chọn theo thứ tự:
 *   1. lời nào máy đọc (`TV.docGiaTri`) đọc lại ra ĐÚNG con số vừa viết — ca kiểm mà máy không đọc nổi chữ
 *      hàng thì vô nghĩa, nó đo bộ đọc chứ không đo luật. Khuôn `cachViet` có khoá đặt đơn vị giữa câu
 *      ("hàm lượng amoniac {giaTri} tính theo thể tích") mà bộ đọc không đọc lại được ⇒ khoá đó giữ chữ cũ;
 *   2. cả hai đều không đọc lại đúng ⇒ lấy lời SẠCH cú pháp (lời mới).
 *
 * Nhánh 2 có ca thật: `84603110` ghi ngưỡng `duongKinh ≤ 3,175 mm` (nguyên văn biểu). Chữ cũ ghép bằng
 * `${value}` ra "3.175" nên bộ đọc đọc thành **3175 mm** — sai 1000 lần, ca kiểm hoá ra ca của hàng khác;
 * chữ mới "đường kính 3,175mm" đúng hình dạng nhưng bộ đọc trả `CHUA_BIET` (nó coi ba chữ số sau dấu phẩy là
 * phân nhóm nghìn, nên cũng không đọc nổi chính nguyên văn biểu). Đó là lỗi của BỘ ĐỌC `lib/tu-vung.js`, sửa
 * thì ảnh hưởng toàn biểu nên phải PR riêng có mốc riêng (đã báo lên thẻ OZV-325); ở đây chọn lời sạch để ca
 * kiểm không chốt theo một con số bịa.
 */
export function loiVeSo(fact, value, donVi, duPhong) {
  const cu = `${boCuPhapRegex(duPhong)} ${value} ${donVi || ''}`.trim();
  try {
    const chuan = TV.quyDoi(fact, value, donVi);
    if (chuan == null) return cu;
    const moi = TV.vietCum(fact, chuan);
    if (!moi) return cu;
    const docDung = (chu) => {
      const d = TV.docGiaTri(fact, chu);
      return d && d.trangThai === 'DA_CO' && typeof d.giaTri === 'number' && Math.abs(d.giaTri - chuan) < 1e-9;
    };
    if (docDung(moi)) return moi;
    return docDung(cu) ? cu : moi;
  } catch { return cu; }
}

/** Sinh cụm chữ KHẲNG ĐỊNH một điều kiện đơn (dùng cho nút trung gian PHAI_CO). */
export function cumKhangDinh(c) {
  if (!c) return '';
  if (c.op === 'HOAC' && Array.isArray(c.phuongAn) && c.phuongAn[0]) {
    return c.phuongAn[0].map(cumKhangDinh).filter(Boolean).join(', ');
  }
  const k = (() => { try { return TV.layKhoa(c.fact); } catch { return null; } })();
  if (c.op === 'TEN_LOAI') {
    const v = Array.isArray(c.value) ? c.value[0] : c.value;
    return String(v || '');
  }
  if (c.op === 'CONG_DUNG') {
    const v = Array.isArray(c.value) ? c.value[0] : c.value;
    return c.fact === 'dungCho' ? `dùng cho ${v}` : `dùng trong ${v}`;
  }
  if (c.op === 'CO') {
    return loiKhoa(c.fact, true, k?.nhanVi || c.fact);
  }
  if (c.op === 'KHONG') {
    return loiKhoa(c.fact, false, k?.cachDocKhong?.vi?.[0] || `không ${k?.nhanVi || c.fact}`);
  }
  if (c.op === 'LA') {
    const v = Array.isArray(c.value) ? c.value[0] : c.value;
    // OZV-342: điều kiện có viTri (chatLieu CACH_DIEN…) phải sinh theo khuôn cachViet.vi của khoá ("cách điện
    // bằng {giaTri}") — cụm "bằng cao su" trơn bộ đọc không thấy vị trí ⇒ CHUA_BIET (đo 85443013: r16045 đứng
    // CHUA_BIET khiến ca rơi nhieu-dong-loai-khac). Không có viTri ⇒ giữ "bằng X" như cũ.
    if (c.viTri && k?.moTaViTri?.[c.viTri]?.cachViet?.vi) {
      return String(k.moTaViTri[c.viTri].cachViet.vi).replace('{giaTri}', v);
    }
    return `bằng ${v}`;
  }
  if (c.op === 'TRONG') {
    const v = Array.isArray(c.value) ? c.value[0] : c.value;
    return loiKhoa(c.fact, [v], k?.moTaGiaTri?.[v]?.nhanVi || v);
  }
  if (['<=', '<', '>=', '>'].includes(c.op)) {
    const v = c.op === '<=' || c.op === '<' ? Number((c.value * 0.5).toFixed(3)) : Number((c.value * 1.5 + 1).toFixed(3));
    return loiVeSo(c.fact, v, c.donVi, k?.cachDoc?.vi?.[0] || k?.nhanVi || String(c.fact).replace(/_/g, ' '));
  }
  return '';
}

/** Sinh cụm chữ TRÁI (phủ định) cho một nhóm điều kiện anh em PHAI_KHONG. */
export function cumPhuDinhNhom(dsDieuKien) {
  if (!Array.isArray(dsDieuKien) || !dsDieuKien.length) return '';
  const c = dsDieuKien[0];
  if (!c) return '';
  if (c.op === 'HOAC' && Array.isArray(c.phuongAn)) {
    return c.phuongAn.map((alt) => cumPhuDinhNhom(alt)).filter(Boolean).join(', ');
  }
  const k = (() => { try { return TV.layKhoa(c.fact); } catch { return null; } })();
  if (c.op === 'TEN_LOAI' || c.op === 'TUONG_TU') {
    const vs = Array.isArray(c.value) ? c.value : [c.value];
    return vs.map((v) => `không phải ${v}`).join(', ');
  }
  if (c.op === 'CONG_DUNG') {
    const vs = Array.isArray(c.value) ? c.value : [c.value];
    return vs.map((v) => (c.fact === 'dungCho' ? `không dùng cho ${v}` : `không dùng trong ${v}`)).join(', ');
  }
  if (c.op === 'CO') {
    // Lời PHỦ ĐỊNH của khoá CO_KHONG = cachViet.viPhuDinh (vietCum với giá trị false).
    return loiKhoa(c.fact, false, k?.cachDocKhong?.vi?.[0] || `không ${k?.nhanVi || c.fact}`);
  }
  if (c.op === 'KHONG') {
    return loiKhoa(c.fact, true, k?.nhanVi || c.fact);
  }
  if (c.op === 'LA') {
    const vs = Array.isArray(c.value) ? c.value : [c.value];
    // OZV-342: "không phải bằng cao su" là cụm CHẾT với bộ đọc theo viTri (đo 85444913: CHUA_BIET). Muốn nói
    // TRÁI một nhóm chatLieu LA [cao su, plastic, giấy] thì khẳng một vật liệu NGOÀI danh sách theo đúng khuôn
    // vị trí của khoá — "cách điện bằng thủy tinh" máy đọc thành TRÁI (đã đo trên điều kiện thật 85444913).
    // Vật liệu chọn từ moTaGiaTri của chính khoá (máy biết đọc), ưu tiên vật liệu làm lớp cách điện có thật.
    if (c.viTri && k?.moTaViTri?.[c.viTri]?.cachViet?.vi) {
      const khong = new Set(vs.map(String));
      const khaThi = Object.keys(k.moTaGiaTri || {});
      const uuTien = ['thủy tinh', 'gốm sứ', 'vải dệt', 'giấy', 'gỗ', 'kim loại', 'đồng', 'nhôm', 'gang'];
      const ngoai = uuTien.find((m) => !khong.has(m) && khaThi.includes(m)) || khaThi.find((m) => !khong.has(m));
      if (ngoai) return String(k.moTaViTri[c.viTri].cachViet.vi).replace('{giaTri}', ngoai);
    }
    return vs.map((v) => `không phải bằng ${v}`).join(', ');
  }
  if (c.op === 'TRONG') {
    const vs = Array.isArray(c.value) ? c.value : [c.value];
    return vs
      .map((v) => `không phải ${loiKhoa(c.fact, [v], k?.moTaGiaTri?.[v]?.nhanVi || v)}`)
      .join(', ');
  }
  if (['<=', '<', '>=', '>'].includes(c.op)) {
    const v = c.op === '<=' || c.op === '<' ? Number((c.value * 2 + 10).toFixed(3)) : Number(Math.max(0.1, c.value * 0.4).toFixed(3));
    return loiVeSo(c.fact, v, c.donVi, k?.cachDoc?.vi?.[0] || k?.nhanVi || String(c.fact).replace(/_/g, ' '));
  }
  return '';
}

/**
 * Sinh ca loại trừ cho một dòng Loại khác trần `hs8`:
 * thỏa mọi điều kiện nút cha PHAI_CO và trái mọi điều kiện anh em PHAI_KHONG trên đường đi 6→8.
 */
function sinhMoTaLoaiTru(hs8, pn6, st) {
  const ten6 = tenPhanNhom6(pn6);
  const dd = DK.duongDiDong8(hs8, { soTay: st });
  const parts = [ten6];
  const soRanhGioi = new Map();
  for (const g of dd.nhom || []) {
    if (!Array.isArray(g.dieuKien) || !g.dieuKien.length) continue;
    if (g.chieu === 'PHAI_CO') {
      for (const c of g.dieuKien) {
        const s = cumKhangDinh(c);
        if (s && !parts.includes(s)) parts.push(s);
      }
    } else if (g.chieu === 'PHAI_KHONG') {
      // Nếu điều kiện anh em chỉ gồm các vế số (SO), gom lại để chọn số nằm ngoài mọi anh em
      const allSo = g.dieuKien.every((c) => ['<=', '<', '>=', '>'].includes(c.op));
      if (allSo) {
        const c0 = g.dieuKien[0];
        const list = soRanhGioi.get(c0.fact) || [];
        list.push(g.dieuKien);
        soRanhGioi.set(c0.fact, list);
      } else {
        const s = cumPhuDinhNhom(g.dieuKien);
        if (s && !parts.includes(s)) parts.push(s);
      }
    }
  }
  for (const [fact, groups] of soRanhGioi.entries()) {
    const k = (() => { try { return TV.layKhoa(fact); } catch { return null; } })();
    const donVi = groups[0]?.[0]?.donVi || k?.donViChuan || '';
    const maxVal = Math.max(...groups.flat().map((c) => Number(c.value) || 0));
    const minVal = Math.min(...groups.flat().map((c) => Number(c.value) || 0));
    // Thử ứng viên lớn hơn maxVal trước; nếu vẫn rơi vào một nhóm anh em thì thử nhỏ hơn minVal
    // … rồi tới giá trị GIỮA hai mốc liền nhau: anh em "≥ 20 kg" và "≤ 2 kg" thì cả 90 lẫn 0,8 đều rơi vào anh em, chỉ khoảng
    // (2; 20) là của Loại khác. Trước đây hết ứng viên thì lùi về 90 ⇒ ca "Loại khác" mang số của anh em (0402 — #1109).
    const moc = [...new Set(groups.flat().map((c) => Number(c.value) || 0))].sort((a, b) => a - b);
    const giua = moc.slice(1).map((v, i) => Number(((moc[i] + v) / 2).toFixed(3)));
    const cands = [maxVal * 2 + 50, Math.max(0.1, Number((minVal * 0.4).toFixed(3))), ...giua];
    let chosen = cands[0];
    for (const cand of cands) {
      const hitAny = groups.some((grp) =>
        grp.every((c) => {
          if (c.op === '<=') return cand <= c.value;
          if (c.op === '<') return cand < c.value;
          if (c.op === '>=') return cand >= c.value;
          if (c.op === '>') return cand > c.value;
          return false;
        }),
      );
      if (!hitAny) {
        chosen = cand;
        break;
      }
    }
    parts.push(loiVeSo(fact, chosen, donVi, k?.cachDoc?.vi?.[0] || k?.nhanVi || String(fact).replace(/_/g, ' ')));
  }
  // OZV-342: chỉ tách đoạn " - " (ranh đoạn phuDinhCaDoan) quanh CỤM PHỦ ĐỊNH — chuỗi phủ định anh em
  // ("không dùng cho 87.02, …") đứng chung đoạn với khẳng định thì nuốt mọi vế phía sau ⇒ THIEU_SO_LIEU
  // (85444919) hoặc nhieu-dong-loai-khac (85443013). Phần KHÔNG phủ định vẫn nối ", " như nếp cũ: bộ đọc
  // số gộp khoảng theo ",", tách " - " làm vế số "điện áp 100000V" rơi CHUA_BIET ⇒ .6039 đỏ lại (đo biến
  // thể "số cuối ," ⇒ LOAI_KHAC 85446039).
  // CHỈ áp cho nhóm 8544 (PR này sửa duy nhất 8544): đo --toan-bieu hai chân cho thấy tách đoạn toàn cục
  // lật 8 ca thành chốt sai ở nhóm chưa được sửa (1605/4813/8413/8703/8711) — nhóm khác giữ nếp cũ ", ".
  if (pn6.slice(0, 4) !== '8544') return parts.join(', ');
  const laPhu = (s) => /không dùng|không phải|không thuộc|other than|not a|不是/.test(String(s || ''));
  let moTa = '';
  for (let i = 0; i < parts.length; i++) {
    if (i) moTa += laPhu(parts[i]) || laPhu(parts[i - 1]) ? ' - ' : ', ';
    moTa += parts[i];
  }
  return moTa;
}

/** Sinh toàn bộ các ca kiểm luật cho một nhóm 4 số. */
export function sinhCaNhom(nhom4) {
  const t = T.tree();
  const codes8 = t.codes.filter((c) => c.startsWith(nhom4) && c.length === 8);
  const byPn6 = new Map();
  for (const c of codes8) {
    const p6 = c.slice(0, 6);
    if (!byPn6.has(p6)) byPn6.set(p6, []);
    byPn6.get(p6).push(c);
  }
  const tenKhacDs = docTenKhacNhom(nhom4);
  const caDongCoTen = [];
  const caTenKhac = [];
  const caLoaiTruLK = [];
  const caThieuDuKien = [];

  for (const [pn6, list8] of byPn6.entries()) {
    const st = soTayHieuLuc(nhom4, pn6);
    const ten6 = tenPhanNhom6(pn6);
    for (const hs8 of list8) {
      const n = T.nodeOf(hs8);
      const tenDong = cleanText(n?.tenVi || '');
      const mids = tieuDeTrungGian(hs8);
      const midText = mids
        .map((m) => (m.loaiKhacTran ? '' : m.tenVi))
        .filter(Boolean)
        .join(' - ');
      const midTextThieu = mids
        .map((m) => (m.loaiKhac ? '' : m.tenVi))
        .filter(Boolean)
        .join(' - ');
      const laLKTran = Boolean(n?.loaiKhacTran) && list8.length > 1;
      // OZV-342 (phạm vi): mọi biến thể sinh ca dưới đây CHỈ áp cho nhóm 8544 — PR này sửa duy nhất 8544.
      // Đo --toan-bieu hai chân (origin/main + dữ liệu / nhánh đầy đủ) cho thấy áp toàn cục làm 8 ca nhóm
      // khác (1605/4813/8413/8703/8711) lật thành chốt sai — nhóm khác giữ nguyên nếp cũ của main.
      const chi8544 = nhom4 === '8544';
      if (!laLKTran) {
        // OZV-342: dòng có tên nằm dưới tầng "Loại khác" trần thì midText LƯỢT tiêu đề tầng ⇒ mô tả ca không
        // đụng tới nút anh em, nút đứng CHUA_BIET và dòng bị hạ xuống (_traiKhiNutThoa — 85444292 Cáp bọc,
        // 85444234, 85443014). Bù bằng phủ định anh em PHAI_KHONG trên đường đi: hàng thuộc dòng này thì không
        // thuộc tầng/dòng anh em — đúng nghĩa luật, và máy đọc được ("không dùng trong viễn thông" ⇒ TRAI).
        // CHỈ lấy nhóm tầng TRÊN dòng (g.tang > 0): phủ định anh em CÙNG TẦNG dòng sẽ mâu thuẫn với chính tên
        // dòng (85444292 "Cáp dữ liệu dẹt…" kèm "không phải Cáp dữ liệu dẹt" là câu tự triệt tiêu). Nhóm thuần
        // số bỏ qua — số đo của dòng đã có trong tên, gán thêm số ngoài khoảng anh em là bịa kiện.
        const phuKhong = [];
        if (chi8544 && mids.some((m) => m.loaiKhac)) {
          const dd = DK.duongDiDong8(hs8, { soTay: st });
          for (const g of dd.nhom || []) {
            if (g.chieu !== 'PHAI_KHONG' || g.tang === 0 || !Array.isArray(g.dieuKien) || !g.dieuKien.length) continue;
            if (g.dieuKien.every((x) => ['<=', '<', '>=', '>'].includes(x.op))) continue;
            const s = cumPhuDinhNhom(g.dieuKien);
            if (s && !phuKhong.includes(s)) phuKhong.push(s);
          }
        }
        // OZV-342: nối các phần bằng " - " (ranh đoạn của phuDinhCaDoan) thay vì ": " — ":" KHÔNG phải ranh
        // đoạn nên tiêu đề tầng phủ định "Loại không dùng cho viễn thông, điện áp không quá 80 V" giết cả
        // đoạn chứa tên dòng (85444921-.24/.41/.42: tenLoai + chatLieu đọc CHUA_BIET trên toàn bộ). Tách đoạn
        // giữ nguyên văn mọi tiêu đề, chỉ cô lập phủ định vào đoạn riêng. Phụ phủ định phuKhong cũng nối
        // " - " vì ", không phải Dây đơn có vỏ bọc" nằm cùng đoạn tenDong thì nuốt nốt vật liệu sau nó.
        // OZV-342 (tiếp): KHÔNG tách hết — bộ đọc số gộp khoảng điện áp theo nếp cũ với ":", tách " - " ở
        // tầng KHẲNG ĐỊNH (8544602 "trên 36 kV nhưng không quá 66 kV") làm vế dienAp>36 đứt thành CHUA_BIET
        // (đo .6021/.6022/.6031 đỏ lại). Chỉ tách khi một trong hai vế kề nhau là tiêu đề phủ định.
        const laPhuDinhDoan = (s) => /không dùng|không phải|không thuộc|other than|not a|不是/.test(String(s || ''));
        const cacPhan = [ten6, ...mids.map((m) => (m.loaiKhacTran ? '' : m.tenVi)).filter(Boolean), hs8 === n?.laPhanNhom ? '' : tenDong].filter(Boolean);
        let moTa = '';
        if (chi8544) {
          for (let i = 0; i < cacPhan.length; i++) {
            if (i) moTa += laPhuDinhDoan(cacPhan[i]) || laPhuDinhDoan(cacPhan[i - 1]) ? ' - ' : ': ';
            moTa += cacPhan[i];
          }
          moTa += phuKhong.length ? ` - ${phuKhong.join(' - ')}` : '';
        } else {
          // nếp cũ của main: midText vốn nối " - " bên trong, các phần trên nối ": "
          moTa = [ten6, midText, hs8 === n?.laPhanNhom ? '' : tenDong].filter(Boolean).join(': ');
        }
        caDongCoTen.push({
          loaiCa: 'DONG_CO_TEN',
          pn6,
          hs8,
          productText: moTa,
          kyVong: hs8,
        });
      } else {
        const moTaLK = sinhMoTaLoaiTru(hs8, pn6, st);
        caLoaiTruLK.push({
          loaiCa: 'LOAI_TRU_LOAI_KHAC',
          pn6,
          hs8,
          productText: moTaLK,
          kyVong: hs8,
        });
        caThieuDuKien.push({
          loaiCa: 'THIEU_DU_KIEN',
          pn6,
          hs8,
          productText: [ten6, midTextThieu].filter(Boolean).join(': '),
          kyVong: 'HOI_HOAC_KHONG_CHOT',
        });
      }
    }
  }

  for (const tk of tenKhacDs) {
    const hs8 = nz(tk.hs);
    const pn6 = hs8.slice(0, 6);
    const ten6 = tenPhanNhom6(pn6);
    const mids = tieuDeTrungGian(hs8);
    const midText = mids.map((m) => (m.loaiKhacTran ? '' : m.tenVi)).filter(Boolean).join(' - ');
    const loai = tk.loai || 'DONG_NGHIA';
    const nhanNguon = tk.nguon?.nhan || 'NGUYEN_VAN';
    if (nhanNguon === 'THAM_KHAO') continue; // L3 chỉ tham khảo, không dùng làm căn cứ tất định
    const cums = tk.cachDoc?.vi || [];
    for (const cum of cums) {
      caTenKhac.push({
        loaiCa: loai === 'TRAI_NGHIA' ? 'TEN_KHAC_LOAI_TRU' : 'TEN_KHAC',
        pn6,
        hs8,
        cum,
        nguon: tk.nguon,
        productText: [ten6, midText, cum].filter(Boolean).join(': '),
        kyVong: loai === 'TRAI_NGHIA' ? `KHONG_CHOT_${hs8}` : hs8,
      });
    }
  }

  return { caDongCoTen, caTenKhac, caLoaiTruLK, caThieuDuKien };
}

/** Ca đối chứng VẬT LIỆU viết tay (OZV-540 T1 / OZV-548) — mô tả kiểu khách khai thật, KHÔNG sinh từ dữ liệu.
 * Vì sao cần bộ này: sinhCaNhom() sinh mô tả từ chính tên tiêu đề/dòng nên mô tả LUÔN chứa đúng vật liệu
 * của tiêu đề ⇒ không bao giờ ra ca trái vật liệu ⇒ bộ sinh từ dữ liệu không bắt được lỗi "chốt 85462010
 * cho hàng nhựa". Ca tay trong tests/ca-doi-chung-vat-lieu-8546-8547.json phải ĐỎ trên main (đỏ đúng chỗ,
 * làm bằng chứng "trước khi vá" cho T2 của OZV-540) và XANH trên nhánh vá T2.
 * Đo RIÊNG như caDacBiet8539 — không cộng vào tongSoCa/chotSai… để số bộ sinh từ dữ liệu không đổi khi thêm ca tay.
 *
 * CỔNG CHẤM SIẾT sau TRẢ THỢ PR #1255 (quy tắc 5 OZV-290 — bản vá rỗng không được xanh): bộ này là điều kiện
 * nghiệm thu T2 nên chấm theo HÀNH VI, không chỉ theo "không chốt sai":
 *  1. TRAI/DUNG có coSo.ketQua=CHOT (hoặc LOAI_KHAC) mà mất chốt (chotVao=null) ⇒ DOI_HANH_VI — T2 "không
 *     chốt nữa" không được coi là đạt; kỳ vọng T2 là chốt ĐÚNG dòng vật liệu (CHOT 85469000 cho hàng nhựa…).
 *  2. Máy từ chối mà deXuat lệch phân nhóm 6 số đúng của ca (hs8Dung) ⇒ DO — chặn vì vật liệu mà vẫn đề
 *     xuất tiêu đề sai vật liệu là lỗi, không phải "an toàn".
 *  3. KHONG_NEU_VAT_LIEU giữ nguyên tiêu chí so coSo (không hồi quy) — đã chặt sẵn từ T1.
 *  4. (vòng 3) Máy CHỐT dòng 8 số ≠ hs8Dung (dòng đúng) ⇒ DO — kể cả dòng NGOÀI hs8Trai. Lỗi thật
 *     GĐ chỉ tay: cổng cũ chỉ bắt "chốt đúng vào dòng bị loại trừ" (hs8Trai), nên máy chốt một dòng
 *     sai khác rơi vào nhánh else ⇒ DAT ⇒ T2 vá sai dòng 8 số vẫn ra vàng giả (bản vá rỗng cũng xanh).
 *     Chốt sai dòng = LỖI, không phải "đổi hành vi" ⇒ không được chấm DOI_HANH_VI. */
export function chayCaDoiChungVatLieu(dsNhom4, chot = chotDong8) {
  const p = path.join(ROOT, 'tests', 'ca-doi-chung-vat-lieu-8546-8547.json');
  if (!fs.existsSync(p)) return { tong: 0, dat: 0, do: 0, doCanT3: 0, doiHanhVi: 0, nemLoi: 0, ca: [] };
  const all = JSON.parse(fs.readFileSync(p, 'utf8')).ca || [];
  const out = [];
  for (const c of all) {
    if (c.nhom && !dsNhom4.includes(c.nhom)) continue;
    let kq = null;
    let loi = null;
    try {
      kq = chot({ hs: c.pn6, productText: c.moTa });
    } catch (e) {
      loi = String(e?.message || e);
    }
    const chotVao = kq && (kq.ketQua === 'CHOT' || kq.ketQua === 'LOAI_KHAC') ? nz(kq.hs) : null;
    const coSoLaChot = ['CHOT', 'LOAI_KHAC'].includes((c.coSo || {}).ketQua || '');
    const hs8DungNz = c.hs8Dung ? nz(c.hs8Dung) : null;
    // quy tắc 2: từ chối mà deXuat lệch phân nhóm 6 số đúng của ca
    const deXuatLech = Boolean(
      hs8DungNz && chotVao === null && kq && kq.deXuat && nz(kq.deXuat).slice(0, 6) !== hs8DungNz.slice(0, 6),
    );
    let trangThai;
    if (loi) trangThai = 'NEM_LOI';
    else if (c.loai === 'KHONG_NEU_VAT_LIEU') {
      // KHONG_NEU_VAT_LIEU: phải GIỮ NGUYÊN hành vi như cơ sở đã đo trên main (tiêu chí không hồi quy của T2)
      const cs = c.coSo || {};
      const giongCoSo = (kq?.ketQua || '') === cs.ketQua && nz(kq?.hs || '') === nz(cs.hs || '');
      trangThai = giongCoSo ? 'DAT' : 'DOI_HANH_VI';
    } else if (hs8DungNz && chotVao === hs8DungNz) trangThai = 'DAT'; // chốt đúng dòng vật liệu
    else if (chotVao && hs8DungNz)
      trangThai = 'DO'; // quy tắc 4 (vòng 3): máy CHỐT dòng 8 số ≠ dòng đúng ⇒ ĐỎ — kể cả dòng NGOÀI
      // hs8Trai (lỗi thật GĐ chỉ tay: cổng cũ để dòng sai rơi vào else ⇒ DAT ⇒ T2 vá sai dòng vẫn vàng giả)
    else if (chotVao && (c.loai === 'DUNG_VAT_LIEU' || (c.hs8Trai || []).includes(chotVao)))
      trangThai = 'DO'; // chốt dòng sai vật liệu (fallback cho ca chưa có hs8Dung: TRAI đúng vào dòng bị loại trừ)
    else if (deXuatLech) trangThai = 'DO';
    else if (coSoLaChot) trangThai = 'DOI_HANH_VI'; // quy tắc 1: mất chốt so với cơ sở main
    else trangThai = 'DAT'; // cơ sở vốn không chốt, giữ nguyên không chốt ⇒ đạt ở cấp cổng
    out.push({
      id: c.id,
      loai: c.loai,
      pn6: c.pn6,
      hs8: c.hs8,
      moTa: c.moTa,
      hs8Trai: c.hs8Trai || [],
      hs8Dung: c.hs8Dung || null,
      canT3: Boolean(c.canT3),
      trangThai,
      ketQua: kq?.ketQua || null,
      hsMay: kq?.hs || null,
      lyDo: loi ? `loi:${loi}` : kq?.lyDo || '',
      deXuat: kq?.deXuat || null,
      coSo: c.coSo || null,
      ghiChu: c.ghiChu || '',
      loi,
    });
  }
  const dem = (st) => out.filter((x) => x.trangThai === st).length;
  return {
    tong: out.length,
    dat: dem('DAT'),
    do: dem('DO'),
    doCanT3: out.filter((x) => x.trangThai === 'DO' && x.canT3).length,
    doiHanhVi: dem('DOI_HANH_VI'),
    nemLoi: dem('NEM_LOI'),
    ca: out,
  };
}

/** Chạy kiểm TB-TCHQ của nhóm trong data/precedents.json. */
function kiemTienLeNhom(nhom4) {
  const precPath = dataReadPath('precedents.json');
  if (!fs.existsSync(precPath)) return [];
  const raw = JSON.parse(fs.readFileSync(precPath, 'utf8'));
  const hcPath = dataReadPath('ho-so', 'hieu-chinh-tien-le.json');
  const hc = fs.existsSync(hcPath) ? JSON.parse(fs.readFileSync(hcPath, 'utf8')).muc || [] : [];

  const allPrecs = Array.isArray(raw)
    ? raw
    : Object.entries(raw || {}).flatMap(([k, arr]) =>
        (Array.isArray(arr) ? arr : []).map((p) => ({ ...p, _headingKey: k })),
      );
  const list = allPrecs.filter((p) => {
    const h = nz(p.outcome || p._headingKey || p.hs || p.hsCode);
    const conf = (p.confusedWith || []).some((c) => nz(c).startsWith(nhom4));
    return h.startsWith(nhom4) || conf;
  });
  const out = [];
  for (const p of list) {
    const hs8 = nz(p.outcome || p._headingKey || p.hs || p.hsCode);
    const pn6 = hs8 === '85395000' ? '853952' : hs8.startsWith(nhom4) && hs8.length >= 6 ? hs8.slice(0, 6) : `${nhom4}52`;
    const ref = p.tbTchqNumber || p.doc || p.refNumber || p.id || 'TB-TCHQ';
    const text = [p.productName, p.technicalSpec, p.desc, p.description, p.specs].filter(Boolean).join(' — ');
    let kq = null;
    let loi = null;
    try {
      kq = chotDong8({ hs: pn6, productText: text });
    } catch (e) {
      loi = String(e?.message || e);
    }
    const mucHc = hc.find((m) => nz(m.maHs) === hs8 || nz(m.dongChuBieu) === hs8 || (m.tbTchq || []).some((t) => t.soHieu === ref));
    const n8 = T.nodeOf(hs8);
    let trangThai = 'GHI_CHU_LECH';
    let ghiChu = '';
    if (loi) {
      trangThai = 'NEM_LOI';
      ghiChu = loi;
    } else if (!hs8.startsWith(nhom4)) {
      trangThai = 'GHI_CHU_LECH';
      ghiChu = `TB-TCHQ phân vào nhóm ${hs8} (loại trừ khỏi ${nhom4}, confusedWith=${JSON.stringify(p.confusedWith || [])}); không thuộc phạm vi phân nhóm 6 số của ${nhom4}`;
    } else if (kq && (kq.ketQua === 'CHOT' || kq.ketQua === 'LOAI_KHAC') && kq.hs === hs8) {
      trangThai = 'KHOP';
      ghiChu = `Khớp trực tiếp ${hs8} (${kq.ketQua})`;
    } else if (!n8) {
      const kq2022 = hs8 === '85395000' && kq?.hs === '85395290' ? 'KHOP_MA_MOI_2022' : 'GHI_CHU_LECH';
      trangThai = kq2022;
      ghiChu = `Mã ${hs8} thuộc biểu cũ AHTN 2017 (đã tách thành 8539.51/8539.52 ở AHTN 2022; bóng đèn LED đui cài/đuôi ngạnh nay thuộc 8539.52.90); chạy trên PN6=${pn6}: ${kq?.ketQua || 'null'}${kq?.hs ? ` → ${kq.hs}` : ''} (${kq?.lyDo || ''})`;
    } else if (mucHc) {
      trangThai = 'GHI_CHU_LECH';
      ghiChu = `Đã ghi nhận trong hieu-chinh-tien-le.json (${mucHc.loai}): ${mucHc.lyDo || ''}`;
    } else if (n8?.loaiKhacTran && kq && kq.ketQua !== 'CHOT') {
      trangThai = 'GHI_CHU_LECH';
      ghiChu = `TB-TCHQ phân vào dòng Loại khác trần ${hs8}; văn bản mô tả thực tế không liệt kê phủ định nguyên văn mọi dòng anh em nên máy trả ${kq.ketQua} (${kq.lyDo || 'hỏi thêm'}) — không chốt sai sang dòng có tên`;
    } else {
      trangThai = 'GHI_CHU_LECH';
      ghiChu = `Máy trả ${kq?.ketQua || 'null'}${kq?.hs ? ` (${kq.hs})` : ''} (${kq?.lyDo || ''})`;
    }
    out.push({
      refNumber: ref,
      hsCode: hs8,
      trangThai,
      ketQuaMay: kq?.ketQua || null,
      hsMay: kq?.hs || null,
      ghiChu,
    });
  }
  return out;
}

/** Chấm một danh sách nhóm 4 số. */
export function chayBoKiemLuat(dsNhom4) {
  const thongKe = {
    soNhom: dsNhom4.length,
    tongSoCa: 0,
    chotDung: 0,
    chotSai: 0,
    chotLoaiKhacSai: 0,
    hoi: 0,
    khongTheChot: 0,
    nemLoi: 0,
    theoLoai: {
      DONG_CO_TEN: { tong: 0, chotDung: 0, chotSai: 0, chotLoaiKhacSai: 0, hoi: 0, khongTheChot: 0, nemLoi: 0 },
      TEN_KHAC: { tong: 0, chotDung: 0, chotSai: 0, chotLoaiKhacSai: 0, hoi: 0, khongTheChot: 0, nemLoi: 0 },
      LOAI_TRU_LOAI_KHAC: { tong: 0, chotDung: 0, chotSai: 0, chotLoaiKhacSai: 0, hoi: 0, khongTheChot: 0, nemLoi: 0 },
      THIEU_DU_KIEN: { tong: 0, datHoi: 0, chotSai: 0, chotLoaiKhacSai: 0, hoi: 0, khongTheChot: 0, nemLoi: 0 },
    },
    chiTietLoi: [],
    tienLe: [],
    caDacBiet8539: [],
    caDoiChungVatLieu: chayCaDoiChungVatLieu(dsNhom4),
  };

  for (const nhom4 of dsNhom4) {
    const { caDongCoTen, caTenKhac, caLoaiTruLK, caThieuDuKien } = sinhCaNhom(nhom4);

    // 1. Dòng có tên + Tên khác
    for (const ca of [...caDongCoTen, ...caTenKhac]) {
      const bucket = ca.loaiCa === 'DONG_CO_TEN' ? thongKe.theoLoai.DONG_CO_TEN : thongKe.theoLoai.TEN_KHAC;
      bucket.tong += 1;
      thongKe.tongSoCa += 1;
      let kq = null;
      try {
        kq = chotDong8({ hs: ca.pn6, productText: ca.productText });
      } catch (e) {
        bucket.nemLoi += 1;
        thongKe.nemLoi += 1;
        thongKe.chiTietLoi.push({ ...ca, loi: String(e?.message || e) });
        continue;
      }
      if (ca.loaiCa === 'TEN_KHAC_LOAI_TRU') {
        // Ca tên khác loại trừ (vd đui gài B22 không được đẩy sang 85395210)
        if (kq.hs === ca.hs8) {
          bucket.chotSai += 1;
          thongKe.chotSai += 1;
          thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, hsMay: kq.hs, lyDo: kq.lyDo });
        } else {
          bucket.chotDung += 1;
          thongKe.chotDung += 1;
        }
        continue;
      }
      if ((kq.ketQua === 'CHOT' || kq.ketQua === 'LOAI_KHAC') && kq.hs === ca.kyVong) {
        bucket.chotDung += 1;
        thongKe.chotDung += 1;
      } else if (kq.ketQua === 'LOAI_KHAC' || (kq.hs && T.nodeOf(kq.hs)?.loaiKhacTran)) {
        bucket.chotLoaiKhacSai += 1;
        thongKe.chotLoaiKhacSai += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, hsMay: kq.hs, lyDo: kq.lyDo });
      } else if (kq.ketQua === 'CHOT' && kq.hs !== ca.kyVong) {
        bucket.chotSai += 1;
        thongKe.chotSai += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, hsMay: kq.hs, lyDo: kq.lyDo });
      } else if (kq.ketQua === 'THIEU_SO_LIEU') {
        bucket.hoi += 1;
        thongKe.hoi += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, lyDo: 'hoi-thieu-so-lieu', missingFacts: kq.missingFacts });
      } else {
        bucket.khongTheChot += 1;
        thongKe.khongTheChot += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, lyDo: kq.lyDo });
      }
    }

    // 2. Dòng Loại khác — ca loại trừ
    for (const ca of caLoaiTruLK) {
      const bucket = thongKe.theoLoai.LOAI_TRU_LOAI_KHAC;
      bucket.tong += 1;
      thongKe.tongSoCa += 1;
      let kq = null;
      try {
        kq = chotDong8({ hs: ca.pn6, productText: ca.productText });
      } catch (e) {
        bucket.nemLoi += 1;
        thongKe.nemLoi += 1;
        thongKe.chiTietLoi.push({ ...ca, loi: String(e?.message || e) });
        continue;
      }
      if ((kq.ketQua === 'LOAI_KHAC' || kq.ketQua === 'CHOT') && kq.hs === ca.kyVong) {
        bucket.chotDung += 1;
        thongKe.chotDung += 1;
      } else if (kq.ketQua === 'LOAI_KHAC' && kq.hs !== ca.kyVong) {
        bucket.chotLoaiKhacSai += 1;
        thongKe.chotLoaiKhacSai += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, hsMay: kq.hs, lyDo: kq.lyDo });
      } else if (kq.ketQua === 'CHOT' && kq.hs !== ca.kyVong) {
        bucket.chotSai += 1;
        thongKe.chotSai += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, hsMay: kq.hs, lyDo: kq.lyDo });
      } else if (kq.ketQua === 'THIEU_SO_LIEU') {
        bucket.hoi += 1;
        thongKe.hoi += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, lyDo: 'hoi-thieu-so-lieu' });
      } else {
        bucket.khongTheChot += 1;
        thongKe.khongTheChot += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, lyDo: kq.lyDo });
      }
    }

    // 3. Dòng Loại khác — ca thiếu dữ kiện (phải HỎI hoặc KHÔNG CHỐT, tuyệt đối không tự chốt)
    for (const ca of caThieuDuKien) {
      const bucket = thongKe.theoLoai.THIEU_DU_KIEN;
      bucket.tong += 1;
      thongKe.tongSoCa += 1;
      let kq = null;
      try {
        kq = chotDong8({ hs: ca.pn6, productText: ca.productText });
      } catch (e) {
        bucket.nemLoi += 1;
        thongKe.nemLoi += 1;
        thongKe.chiTietLoi.push({ ...ca, loi: String(e?.message || e) });
        continue;
      }
      if (kq.ketQua === 'LOAI_KHAC') {
        bucket.chotLoaiKhacSai += 1;
        thongKe.chotLoaiKhacSai += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, hsMay: kq.hs, lyDo: 'tu-chot-loai-khac-khi-thieu-du-kien' });
      } else if (kq.ketQua === 'CHOT') {
        bucket.chotSai += 1;
        thongKe.chotSai += 1;
        thongKe.chiTietLoi.push({ ...ca, ketQua: kq.ketQua, hsMay: kq.hs, lyDo: 'tu-chot-dong-co-ten-khi-thieu-du-kien' });
      } else if (kq.ketQua === 'THIEU_SO_LIEU') {
        bucket.datHoi += 1;
        bucket.hoi += 1;
        thongKe.hoi += 1;
      } else {
        bucket.datHoi += 1;
        bucket.khongTheChot += 1;
        thongKe.khongTheChot += 1;
      }
    }

    // 4. Tiền lệ TB-TCHQ của nhóm
    if (dsNhom4.length <= 5) {
      thongKe.tienLe.push(...kiemTienLeNhom(nhom4));
    }

    // 5. Ca đặc biệt bắt buộc của 8539 trong đề bài
    if (nhom4 === '8539') {
      const caDacBiet = [
        { ten: 'Bóng đèn LED tròn đuôi xoáy E27, 9W, 220V', pn6: '853952', hsGoiY: '85395290', phaiRa: '85395210' },
        { ten: 'Bóng đèn LED quả nhót đui xoáy E14, 5W, 220V', pn6: '853952', hsGoiY: '85395290', phaiRa: '85395210' },
        { ten: 'Bóng đèn LED công nghiệp đui đèn xoáy ren Edison E40, 50W', pn6: '853952', hsGoiY: '85395290', phaiRa: '85395210' },
        { ten: 'Bóng đèn LED đui gài B22, 9W, 220V', pn6: '853952', hsGoiY: '85395290', khongDuocRa: '85395210' },
      ];
      for (const c of caDacBiet) {
        let chot = null;
        let gates = null;
        let loi = null;
        try {
          chot = chotDong8({ hs: c.pn6, productText: c.ten });
          gates = soTayGates({ hs: c.hsGoiY, productName: c.ten });
        } catch (e) {
          loi = String(e?.message || e);
        }
        const gateDong8 = (gates?.challenges || []).find((f) => f.gate === 'SO_TAY_DONG8');
        const redirectHs = gateDong8?.sibling || gateDong8?.target || null;
        const dat = c.phaiRa
          ? !loi && chot?.ketQua === 'CHOT' && chot?.hs === c.phaiRa && redirectHs === c.phaiRa
          : !loi && chot?.hs !== c.khongDuocRa && redirectHs !== c.khongDuocRa;
        thongKe.caDacBiet8539.push({
          ten: c.ten,
          dat,
          ketQuaChot: chot?.ketQua || null,
          hsChot: chot?.hs || null,
          gateRedirect: redirectHs,
          loi,
        });
      }
    }
  }

  // Ngoài ra khi chạy --toan-bieu, kiểm luôn 13 phân nhóm từng ném lỗi trong đề bài với mô tả rỗng/bất kỳ
  if (argv['toan-bieu']) {
    const PN6_NEM_LOI = ['380899', '630790', '640690', '732690', '840991', '845290', '848120', '851762', '853180', '853190', '871410', '940541', '940542'];
    thongKe.kiem13Pn6NemLoi = [];
    for (const p6 of PN6_NEM_LOI) {
      try {
        const r = chotDong8({ hs: p6, productText: '' });
        thongKe.kiem13Pn6NemLoi.push({ pn6: p6, nemLoi: false, ketQua: r.ketQua, lyDo: r.lyDo });
      } catch (e) {
        thongKe.nemLoi += 1;
        thongKe.kiem13Pn6NemLoi.push({ pn6: p6, nemLoi: true, loi: String(e?.message || e) });
      }
    }
  }

  return thongKe;
}

function inBaoCao(tk) {
  const dc = tk.theoLoai.DONG_CO_TEN;
  const tkh = tk.theoLoai.TEN_KHAC;
  const lk = tk.theoLoai.LOAI_TRU_LOAI_KHAC;
  const tdk = tk.theoLoai.THIEU_DU_KIEN;
  const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : 'N/A');

  console.log(`\n=== BỘ KIỂM LUẬT (${tk.soNhom} nhóm, tổng ${tk.tongSoCa} ca) ===`);
  console.log('| Loại ca | Tổng | Chốt đúng | Chốt sai | Chốt Loại khác sai | Hỏi (THIEU_SO_LIEU) | Không thể chốt | Ném lỗi | Tỉ lệ đạt |');
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  console.log(`| 1. Dòng 8 số có tên (tên PN6 + tên dòng) | ${dc.tong} | ${dc.chotDung} | ${dc.chotSai} | ${dc.chotLoaiKhacSai} | ${dc.hoi} | ${dc.khongTheChot} | ${dc.nemLoi} | ${pct(dc.chotDung, dc.tong)} |`);
  console.log(`| 2. Cụm tên khác có nguồn (L1/L2) | ${tkh.tong} | ${tkh.chotDung} | ${tkh.chotSai} | ${tkh.chotLoaiKhacSai} | ${tkh.hoi} | ${tkh.khongTheChot} | ${tkh.nemLoi} | ${pct(tkh.chotDung, tkh.tong)} |`);
  console.log(`| 3. Dòng Loại khác — ca loại trừ | ${lk.tong} | ${lk.chotDung} | ${lk.chotSai} | ${lk.chotLoaiKhacSai} | ${lk.hoi} | ${lk.khongTheChot} | ${lk.nemLoi} | ${pct(lk.chotDung, lk.tong)} |`);
  console.log(`| 4. Dòng Loại khác — ca thiếu dữ kiện (phải hỏi/không chốt) | ${tdk.tong} | ${tdk.datHoi} (đạt) | ${tdk.chotSai} | ${tdk.chotLoaiKhacSai} | ${tdk.hoi} | ${tdk.khongTheChot} | ${tdk.nemLoi} | ${pct(tdk.datHoi, tdk.tong)} |`);
  console.log(`| **TỔNG CỘNG** | **${tk.tongSoCa}** | **${tk.chotDung}** | **${tk.chotSai}** | **${tk.chotLoaiKhacSai}** | **${tk.hoi}** | **${tk.khongTheChot}** | **${tk.nemLoi}** | - |`);

  if (tk.caDacBiet8539.length) {
    console.log('\n--- Kiểm ca đặc biệt nhóm 8539 (E27 / E14 / E40 / B22) ---');
    for (const c of tk.caDacBiet8539) {
      console.log(`  [${c.dat ? 'ĐẠT' : 'TRƯỢT'}] "${c.ten}" → chotDong8=${c.ketQuaChot}(${c.hsChot || '-'}), SO_TAY_DONG8=${c.gateRedirect || '-'}${c.loi ? ` LỖI: ${c.loi}` : ''}`);
    }
  }

  if (tk.caDoiChungVatLieu && tk.caDoiChungVatLieu.tong) {
    const cd = tk.caDoiChungVatLieu;
    console.log('\n--- Ca đối chứng VẬT LIỆU viết tay (OZV-540 T1) — đo riêng, KHÔNG tính vào bảng trên ---');
    for (const c of cd.ca) {
      const nhan = c.trangThai === 'DAT' ? 'ĐẠT' : c.trangThai === 'DO' ? (c.canT3 ? 'ĐỎ(cầnT3)' : 'ĐỎ') : c.trangThai === 'DOI_HANH_VI' ? 'ĐỔI-HÀNH-VI' : 'NÉM-LỖI';
      const phan = `${c.loai === 'TRAI_VAT_LIEU' ? `trái ${c.hs8Trai.join('/')}` : c.loai === 'DUNG_VAT_LIEU' ? `đúng ${c.hs8Dung}` : 'không nêu VL'}${c.hs8Dung && c.loai !== 'DUNG_VAT_LIEU' ? ` (đúng: ${c.hs8Dung})` : ''}`;
      console.log(`  [${nhan}] ${c.id} ${c.pn6} → ${c.ketQua}${c.hsMay ? ` ${c.hsMay}` : ''}${c.deXuat ? ` deXuat=${c.deXuat}` : ''} [${phan}] "${c.moTa}"`);
    }
    console.log(
      `  Tổng: ${cd.tong} ca — ĐẠT ${cd.dat} · ĐỎ ${cd.do} (trong đó cần T3: ${cd.doCanT3}) · ĐỔI HÀNH VI ${cd.doiHanhVi} · NÉM LỖI ${cd.nemLoi}` +
        (cd.do || cd.doCanT3 ? ' — ĐỎ là "đỏ trước khi vá" của T2 (OZV-540): ca tay phải đỏ trên main, xanh trên nhánh vá' : ' — T2 đã vá xong: 0 đỏ'),
    );
  }

  if (tk.tienLe.length) {
    console.log('\n--- Đối chiếu TB-TCHQ trong precedents.json ---');
    for (const tl of tk.tienLe) {
      console.log(`  [${tl.trangThai}] ${tl.refNumber} (mã ${tl.hsCode}): ${tl.ghiChu}`);
    }
  }

  if (tk.kiem13Pn6NemLoi) {
    const soNem = tk.kiem13Pn6NemLoi.filter((x) => x.nemLoi).length;
    console.log(`\n--- Kiểm 13 phân nhóm từng ném lỗi (cauHoiCho(undefined)): ${soNem}/13 ném lỗi ---`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let dsNhom4 = [];
  if (argv['toan-bieu']) {
    const dir = dataReadPath('so-tay');
    dsNhom4 = fs
      .readdirSync(dir)
      .filter((f) => /^\d{4}\.json$/.test(f))
      .map((f) => f.slice(0, 4))
      .sort();
  } else if (argv.nhom) {
    dsNhom4 = String(argv.nhom)
      .split(',')
      .map((s) => nz(s).slice(0, 4))
      .filter((s) => s.length === 4);
  } else {
    console.error('Cách dùng: node scripts/bo-kiem-luat.mjs --nhom=<4 số> | --toan-bieu [--json]');
    process.exit(1);
  }
  const kq = chayBoKiemLuat(dsNhom4);
  if (argv.json) {
    console.log(JSON.stringify(kq, null, 2));
  } else {
    inBaoCao(kq);
  }
}
