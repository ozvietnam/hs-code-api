// ECUS/VNACCS "Mô tả hàng hóa" giới hạn 200 ký tự (tính cả dấu cách).
// Quy ước khai báo: xuất xứ + tình trạng luôn nằm CUỐI mô tả — không bao giờ bị cắt.
const ECUS_MAX_LENGTH = 200;

const SEP = '; ';

function buildHeadParts(declaration) {
  const parts = [];
  if (declaration.tenHang) parts.push({ key: 'tenHang', text: declaration.tenHang });
  if (declaration.nhanHieu && declaration.nhanHieu !== 'N/A') {
    parts.push({ key: 'nhanHieu', text: `nhãn hiệu ${declaration.nhanHieu}`, giaTri: declaration.nhanHieu });
  }
  if (declaration.model) parts.push({ key: 'model', text: `model ${declaration.model}`, giaTri: declaration.model });
  if (declaration.thanhPhanCauTao) {
    parts.push({ key: 'thanhPhanCauTao', text: `thành phần: ${declaration.thanhPhanCauTao}`, giaTri: declaration.thanhPhanCauTao });
  }
  const specs = Array.isArray(declaration.thongSoKyThuat) ? declaration.thongSoKyThuat.filter(Boolean) : [];
  if (specs.length) {
    parts.push({ key: 'thongSoKyThuat', specs: [...specs] });
  }
  if (declaration.congDung) parts.push({ key: 'congDung', text: `công dụng: ${declaration.congDung}`, giaTri: declaration.congDung });
  if (declaration.quyCach) parts.push({ key: 'quyCach', text: `quy cách: ${declaration.quyCach}`, giaTri: declaration.quyCach });
  return parts;
}

function buildTailParts(declaration) {
  const parts = [];
  if (declaration.xuatXu?.nameVi) parts.push(`xuất xứ ${declaration.xuatXu.nameVi}`);
  if (declaration.tinhTrang) parts.push(declaration.tinhTrang);
  return parts;
}

function partText(p) {
  if (p.specs) return `thông số: ${p.specs.join('; ')}`;
  return p.text;
}

function joinAll(headParts, tailParts) {
  const texts = [...headParts.map(partText), ...tailParts];
  return texts.join(SEP).replace(/\s+/g, ' ').trim();
}

// Thứ tự hy sinh khi vượt 200 ký tự — phần phụ trước, phần định danh sau.
// tenHang + xuất xứ + tình trạng không bao giờ bị drop (tenHang chỉ bị cắt ngắn khi bất khả khóng).
const DROP_ORDER = ['quyCach', 'congDung', 'thongSoKyThuat', 'thanhPhanCauTao', 'model', 'nhanHieu'];
// #324: nhóm máy móc (84/85 — template machineryGeneric bắt buộc power/voltage): thông số là chứng từ
// phân loại, KHÔNG bị hy sinh trước phụ đề. Đưa thông số xuống cuối thứ tự cắt + ưu tiên giữ dòng có số+đơn vị.
const DROP_ORDER_KEEP_SPECS = ['quyCach', 'congDung', 'thanhPhanCauTao', 'model', 'nhanHieu', 'thongSoKyThuat'];
// Đường dự phòng của /api/describe (LLM lỗi, #725 nhóm C): thứ tự GIỮ = tên hàng > model/mã > thông số phân biệt mã >
// chất liệu/công dụng (xuất xứ + tình trạng luôn ở cuối, không bao giờ cắt) → thứ tự BỎ ngược lại.
// #725 lỗi 41: nhãn hiệu bỏ SAU công dụng/thành phần (trước đây ở đường dự phòng nó bị bỏ ngay sau quy cách, trước cả công dụng —
// mất nhãn hiệu mà giữ phần phụ lặp ý). Model + thông số phân biệt mã vẫn được giữ trên nhãn hiệu (#725 lỗi 31).
const DROP_ORDER_DU_PHONG = ['quyCach', 'congDung', 'thanhPhanCauTao', 'nhanHieu', 'thongSoKyThuat', 'model'];
const SPEC_CO_BAT_BUOC_RE = /\d\s*(kw|w|hp|kva|v|a)\b|\b\d+\s*(kw|w|hp|kva|v|a)\b/i;
function xepSpecsUuTien(specs) {
  // Dòng mang số+đơn vị công suất/điện áp/dòng → xếp ĐẦU: rút gọn bỏ thông số bằng pop() (bỏ từ CUỐI), nên dòng phụ phải
  // nằm cuối để bị bỏ trước (#725 lỗi 31: trước đây xếp cuối nên pop() bỏ đúng công suất/điện áp).
  const coSo = []; const khongSo = [];
  for (const sp of specs) (SPEC_CO_BAT_BUOC_RE.test(sp) ? coSo : khongSo).push(sp);
  return [...coSo, ...khongSo];
}

/** Cắt ≤ maxLength tại ranh giới cụm ("; ") hoặc từ — không bao giờ để mảnh từ/khoá cụt ("…die", "…van g"). */
function catTheoRanhGioi(text, maxLength) {
  if (text.length <= maxLength) return text;
  const dau = text.slice(0, maxLength + 1);
  const cum = dau.lastIndexOf(SEP);
  if (cum > maxLength * 0.5) return dau.slice(0, cum).trim();
  const tu = dau.lastIndexOf(' ');
  return (tu > maxLength * 0.5 ? dau.slice(0, tu) : text.slice(0, maxLength)).replace(/[;,:\s]+$/, '').trim();
}

// ── Khử lặp (#725 lỗi 35) ────────────────────────────────────────────────────────────────────────────────────────────
// Tên hàng khách viết thường đã chứa model, thông số, chất liệu, công dụng ("…24VDC 10A, model KX-2410, vỏ nhôm, dùng cho…").
// Nối lại các khối đó vừa lặp vừa đẩy câu vượt 200 ký tự → bản cắt bỏ nhãn hiệu mà giữ phần lặp. Khử lặp TRƯỚC khi cắt:
// khối nào đã có nguyên trong tên hàng (so theo ranh giới chữ/số, không phân biệt hoa thường, "24 V" = "24V") thì không nối.
const chuanKhop = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/(\d)\s+(?=[\p{L}%°"])/gu, '$1').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function coNguyenCum(tenChuan, giaTri) {
  const g = chuanKhop(giaTri).replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g, '');
  if (g.length < 2) return false;
  return new RegExp(`(?<![\\p{L}\\p{N}])${esc(g)}(?![\\p{L}\\p{N}])`, 'u').test(tenChuan);
}
/** Giá trị đã có trong chữ `ten` (tên hàng / câu khai). Thông số "Nhãn: giá trị" so phần giá trị; "a, b" phải có đủ từng phần. */
function daCoTrongTen(ten, giaTri) {
  const t = chuanKhop(ten);
  if (!t || !String(giaTri || '').trim()) return false;
  if (coNguyenCum(t, giaTri)) return true;
  const v = String(giaTri).includes(':') ? String(giaTri).split(':').slice(1).join(':') : String(giaTri);
  const phan = v.split(/\s*[,;]\s*/).map((x) => x.trim()).filter(Boolean);
  return phan.length > 0 && phan.every((x) => coNguyenCum(t, x));
}
/** Nhãn hiệu đã có trong tên hàng dưới dạng "hiệu X" / "nhãn hiệu X" / "brand X". */
function nhanHieuTrongTen(ten, hieu) {
  const t = chuanKhop(ten); const h = chuanKhop(hieu);
  if (!t || !h) return false;
  return new RegExp(`(?<![\\p{L}])(?:hiệu|brand)\\s*:?\\s*${esc(h)}(?![\\p{L}\\p{N}])`, 'u').test(t);
}
// ── Khối công dụng lặp ý (#725 lỗi 41) ───────────────────────────────────────────────────────────────────────────────
// "công dụng: Đóng ngắt mạch điện an toàn…" khi tên hàng đã ghi "…dùng đóng ngắt mạch điện…" không khớp nguyên cụm nên khuLap
// không bắt được. Coi là lặp ý nếu ≥ 60% từ có nghĩa của khối đã có trong tên hàng → khi phải cắt, bỏ khối này TRƯỚC mọi khối khác.
const NGUONG_LAP_Y = 0.6;
const TU_RONG = new Set(['dùng', 'cho', 'để', 'và', 'của', 'trong', 'các', 'là', 'có', 'được', 'bằng', 'khi', 'với', 'loại', 'như', 'từ', 'tại', 'này', 'một', 'những', 'việc', 'hoặc', 'the', 'for', 'and', 'of']);
const tachTu = (s) => (chuanKhop(s).match(/[\p{L}\p{N}]+/gu) || []).filter((w) => w.length >= 2 && !TU_RONG.has(w));
/** Tỉ lệ từ có nghĩa của `khoi` đã xuất hiện trong `ten` (0 nếu khối không có từ có nghĩa). */
function tyLeLapY(ten, khoi) {
  const tuKhoi = tachTu(khoi);
  if (!tuKhoi.length) return 0;
  const tuTen = new Set(tachTu(ten));
  return tuKhoi.filter((w) => tuTen.has(w)).length / tuKhoi.length;
}

/** Bỏ khối lặp tên hàng khỏi headParts (tại chỗ); trả danh sách khoá đã khử ("model", "thongSoKyThuat[item]"…). */
function khuLap(headParts) {
  const ten = headParts.find((p) => p.key === 'tenHang')?.text;
  if (!ten) return [];
  const trung = [];
  const GIA_TRI = { model: (d) => d.giaTri, thanhPhanCauTao: (d) => d.giaTri, congDung: (d) => d.giaTri, quyCach: (d) => d.giaTri };
  for (let i = headParts.length - 1; i >= 0; i -= 1) {
    const p = headParts[i];
    if (p.key === 'tenHang') continue;
    if (p.key === 'thongSoKyThuat') {
      const con = p.specs.filter((sp) => !daCoTrongTen(ten, sp));
      for (let k = con.length; k < p.specs.length; k += 1) trung.push('thongSoKyThuat[item]');
      p.specs = con;
      if (!con.length) { headParts.splice(i, 1); }
      continue;
    }
    if (p.key === 'nhanHieu' ? nhanHieuTrongTen(ten, p.giaTri) : (GIA_TRI[p.key] && daCoTrongTen(ten, p.giaTri))) {
      headParts.splice(i, 1);
      trung.push(p.key);
    }
  }
  return trung.reverse();
}

function composeWithMeta(declaration, opts = {}) {
  if (!declaration) {
    return { text: '', length: 0, fullText: '', fullLength: 0, truncated: false, dropped: [], trungLap: [], maxLength: ECUS_MAX_LENGTH };
  }
  const maxLength = opts.maxLength || ECUS_MAX_LENGTH;
  const headParts = buildHeadParts(declaration);
  const trungLap = khuLap(headParts);
  if (opts.keepSpecs) {
    const idx = headParts.findIndex((p) => p.key === 'thongSoKyThuat');
    if (idx !== -1) headParts[idx].specs = xepSpecsUuTien(headParts[idx].specs);
  }
  const tailParts = buildTailParts(declaration);

  const fullText = joinAll(headParts, tailParts);
  let text = fullText;
  const dropped = [];

  if (text.length > maxLength) {
    let order = opts.uuTien === 'duPhong' ? DROP_ORDER_DU_PHONG : opts.keepSpecs ? DROP_ORDER_KEEP_SPECS : DROP_ORDER;
    // Công dụng lặp ý với tên hàng → hy sinh đầu tiên (trước cả quy cách); nhãn hiệu vẫn ở cuối thứ tự.
    const ten = headParts.find((p) => p.key === 'tenHang')?.text;
    const cd = headParts.find((p) => p.key === 'congDung');
    if (ten && cd && tyLeLapY(ten, cd.giaTri) >= NGUONG_LAP_Y) order = ['congDung', ...order.filter((k) => k !== 'congDung')];
    for (const key of order) {
      if (text.length <= maxLength) break;
      const idx = headParts.findIndex((p) => p.key === key);
      if (idx === -1) continue;

      if (key === 'thongSoKyThuat') {
        // Cắt từng thông số từ cuối trước khi bỏ cả cụm (giữ ít nhất 1 dòng — dòng số+đơn vị đã xếp ĐẦU khi keepSpecs)
        const part = headParts[idx];
        const floor = opts.keepSpecs || opts.uuTien === 'duPhong' ? Math.min(1, part.specs.length) : 1;
        while (part.specs.length > floor && joinAll(headParts, tailParts).length > maxLength) {
          part.specs.pop();
          dropped.push('thongSoKyThuat[item]');
        }
        if (joinAll(headParts, tailParts).length > maxLength) {
          headParts.splice(idx, 1);
          dropped.push(key);
        }
      } else {
        headParts.splice(idx, 1);
        dropped.push(key);
      }
      text = joinAll(headParts, tailParts);
    }

    // Bất khả kháng: chỉ còn tenHang + xuất xứ + tình trạng mà vẫn vượt →
    // cắt tenHang tại ranh giới từ, giữ nguyên đuôi bắt buộc.
    if (text.length > maxLength) {
      const tail = tailParts.join(SEP);
      const budget = maxLength - (tail ? tail.length + SEP.length : 0);
      const tenIdx = headParts.findIndex((p) => p.key === 'tenHang');
      if (tenIdx !== -1 && budget > 0) {
        let ten = headParts[tenIdx].text.replace(/\s+/g, ' ').trim();
        if (ten.length > budget) {
          ten = ten.slice(0, budget);
          const lastSpace = ten.lastIndexOf(' ');
          if (lastSpace > budget * 0.5) ten = ten.slice(0, lastSpace);
          headParts[tenIdx].text = ten.trim();
          dropped.push('tenHang[trimmed]');
        }
      }
      text = joinAll(headParts, tailParts);
      if (text.length > maxLength) text = catTheoRanhGioi(text, maxLength);
    }
  }

  return {
    text,
    length: text.length,
    fullText,
    fullLength: fullText.length,
    truncated: text !== fullText,
    dropped,
    trungLap,
    maxLength,
  };
}

function composeCustomsDescription(declaration, opts = {}) {
  return composeWithMeta(declaration, opts).text;
}

module.exports = { composeCustomsDescription, composeWithMeta, catTheoRanhGioi, daCoTrongTen, tyLeLapY, ECUS_MAX_LENGTH };
