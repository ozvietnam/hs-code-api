// ECUS/VNACCS "Mô tả hàng hóa" giới hạn 200 ký tự (tính cả dấu cách).
//
// Khuôn ghép (Đợt 0B, 29/10/2026 — đo trên 5.156 mô tả Oz đã khai, sổ ghi-nhan-mo-ta-ecus.md):
//   tên hàng → đặc trưng phân loại (chất liệu, công dụng, thông số bắt buộc của chương)
//   → thông số khác → kích thước (KT: 129x82x42mm, đơn vị ghi MỘT lần cuối cụm)
//   → quy cách → model, hiệu / "không hiệu", NSX → tình trạng
// Dấu ngăn = dấu PHẨY (Oz 99 %, không dùng ";"). Giá trị có dấu phẩy bên trong → "/" hoặc tách thành cụm riêng.
// KHÔNG ghi "xuất xứ" vào chuỗi (Oz 0 %; ECUS có ô xuất xứ riêng; chỉ tiêu 1.78 không liệt kê) — declaration.xuatXu vẫn giữ.
//
// Căn cứ: chỉ tiêu 1.78 "Mô tả hàng hóa" (TT 38/2015/TT-BTC sửa bởi TT 39/2018/TT-BTC và TT 121/2025/TT-BTC) yêu cầu
// ghi rõ tên hàng, nhãn hiệu, quy cách phẩm chất, thông số kĩ thuật, thành phần, cấu tạo, model, kí/mã hiệu, công dụng,
// quy cách đóng gói, nhà sản xuất… → nhận diện (hiệu, model, NSX) KHÔNG bị cắt đầu tiên.
// Vượt 200 ký tự: (1) rút gọn bằng viết tắt chuẩn KT/NSX/ĐA/CS/CL, (2) bỏ chi tiết không làm căn cứ mã (màu…),
// (3) quy cách, thông số phụ, kích thước không bắt buộc, (4) nhận diện từ cuối (NSX → model → hiệu).
// Tên hàng + đặc trưng phân loại + tình trạng không bao giờ bị cắt; nếu riêng phần đó đã vượt → overflow=true (báo đỏ ở describe-core).
// KHÔNG âm thầm bỏ dữ kiện (CEO chốt 29/10, chỉ tiêu 1.68 TT 121/2025: vượt giới hạn ký tự thì dùng nghiệp vụ HYS đính kèm
// nội dung khai tiếp): mọi cụm không vừa chuỗi chính đi vào `khaiTiep` (chuỗi đầy đủ, cùng văn phong); `moTaDayDu` là bản
// đầy đủ không viết tắt (chuỗi chính + phần khai tiếp).
const { getDeclarationFieldSpec } = require('./compliance-data');

const ECUS_MAX_LENGTH = 200;
const SEP = ', ';

const LETTER = '[\\p{L}\\p{N}]';
/** Regex khớp NGUYÊN CỤM (ranh giới chữ Unicode — \b của JS không hiểu chữ có dấu). */
function cum(s, flags = 'giu') {
  return new RegExp(`(?<!${LETTER})(?:${s})(?!${LETTER})`, flags);
}

const VIET_TAT = [
  [cum('kích thước\\s*:?'), 'KT:'],
  [cum('nhà sản xuất\\s*:?'), 'NSX:'],
  [cum('điện áp'), 'ĐA'],
  [cum('công suất'), 'CS'],
  [cum('chất liệu'), 'CL'],
];
const VIET_RO = [
  [cum('KT\\s*:', 'gu'), 'kích thước:'],
  [cum('NSX\\s*:', 'gu'), 'nhà sản xuất:'],
  [cum('NSX', 'gu'), 'nhà sản xuất'],
  [cum('ĐA', 'gu'), 'điện áp'],
  [cum('CS', 'gu'), 'công suất'],
  [cum('CL\\s*:', 'gu'), 'chất liệu:'],
];
/** Bản viết rõ chữ (không viết tắt) — dùng cho moTaDayDu. */
function vietRo(text) {
  let t = String(text || '');
  for (const [re, full] of VIET_RO) t = t.replace(re, full);
  return t.replace(/\s+/g, ' ').trim();
}

function vietTat(text) {
  let t = text;
  const dung = [];
  for (const [re, ab] of VIET_TAT) {
    if (re.test(t)) { dung.push(ab.replace(':', '')); t = t.replace(re, ab); }
    re.lastIndex = 0;
  }
  return { text: t.replace(/:\s*:/g, ':').replace(/\s+/g, ' ').trim(), dung };
}

const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').replace(/^[\s,;.]+|[\s,;.]+$/g, '').trim();
/** Tách các ý của một giá trị: "; " hoặc ", " (không tách dấu phẩy thập phân "8,6mm"). */
const tachY = (v) => clean(v).split(/\s*;\s*|,\s+/).map(clean).filter(Boolean);

const KHONG_HIEU_RE = /^(n\/?a|none|no ?brand|oem|không|ko|không có|không (có )?(nhãn )?hiệu|ko hiệu|không nhãn)$/i;
/** Nhãn hiệu → "hiệu: X" | "không hiệu" | null (không biết thì KHÔNG khẳng định "không hiệu"). */
function hieuText(nhanHieu) {
  const v = clean(nhanHieu);
  if (!v) return null;
  if (KHONG_HIEU_RE.test(v)) return 'không hiệu';
  return `hiệu: ${v.replace(/^(nhãn hiệu|hiệu)\s*:?\s*/i, '').replace(/,\s+/g, '/')}`;
}

/** Chất liệu → các cụm "bằng …" / "chất liệu: …". Chất liệu theo bộ phận ("quai bằng PU, đế bằng nhựa") giữ thành cụm riêng. */
function chatLieuItems(v) {
  const segs = tachY(v);
  if (!segs.length) return [];
  if (segs.length > 1 && segs.every((s) => cum('bằng', 'iu').test(s) || s.includes(':'))) return segs;
  const gop = segs.join('/');
  if (/^(bằng|chất liệu|CL)(?![\p{L}])/iu.test(gop) || cum('bằng', 'iu').test(gop)) return [gop];
  if (gop.includes('%') || gop.split(' ').length > 4) return [`chất liệu: ${gop}`];
  return [`bằng ${gop}`];
}

function congDungText(v) {
  const t = tachY(v).join('/');
  if (!t) return null;
  if (/^(dùng|để|sử dụng|chuyên dùng|công dụng)(?![\p{L}])/iu.test(t)) return t;
  return `công dụng: ${t}`;
}

// ── Kích thước: đơn vị chuẩn mm (m cho hàng dài), ghi MỘT lần cuối cụm ─────────────────────────────
const UNIT = '(mm|cm|m|inch|in|")';
const NUM = '(\\d+(?:[.,]\\d+)?)';
const CHUOI_KT_RE = new RegExp(`${NUM}\\s*${UNIT}?\\s*[x×*]\\s*${NUM}\\s*${UNIT}?(?:\\s*[x×*]\\s*${NUM}\\s*${UNIT}?)?`, 'i');
const NHAN_KT_RE = /^(chiều\s+)?(dài|rộng|cao|dày|sâu|đường kính|đk|phi|bán kính)\s*:?\s*\d/iu;
const CO_DON_VI_RE = /\d\s*(mm|cm|m|inch|in|")(?![\p{L}])/iu;

function laKichThuoc(s) {
  const t = clean(s);
  if (/^(kích thước|KT)(?![\p{L}])/iu.test(t)) return true;
  if (CHUOI_KT_RE.test(t) && CO_DON_VI_RE.test(t)) return true;
  return NHAN_KT_RE.test(t) && CO_DON_VI_RE.test(t);
}

function soRa(n, dau) {
  const r = Math.round(n * 10) / 10;
  const s = String(r);
  return dau === ',' ? s.replace('.', ',') : s;
}
/** Đổi một số + đơn vị về mm (hoặc giữ m). Trả { val, unit }. */
function doiDonVi(raw, unit) {
  const dau = raw.includes(',') ? ',' : '.';
  const n = parseFloat(raw.replace(',', '.'));
  const u = String(unit || 'mm').toLowerCase();
  if (u === 'm') return { val: soRa(n, dau), unit: 'm' };
  const f = u === 'cm' ? 10 : (u === 'inch' || u === 'in' || u === '"') ? 25.4 : 1;
  return { val: soRa(n * f, dau), unit: 'mm' };
}

/** "kích thước 12.9 x 8.2 x 4.2 cm" → "129x82x42mm"; "cao 5-10cm" → "cao 50-100mm". Trả phần thân (chưa có "KT:"). */
function chuanMotKichThuoc(s) {
  let t = clean(s).replace(/^(kích thước|KT)\s*:?\s*/iu, '');
  const m = t.match(CHUOI_KT_RE);
  if (m) {
    const nums = [m[1], m[3], m[5]].filter(Boolean);
    const units = [m[2], m[4], m[6]].filter(Boolean);
    const unit = units[units.length - 1] || 'mm';
    const conv = nums.map((x) => doiDonVi(x, unit));
    const u = conv[0].unit;
    t = `${t.slice(0, m.index)}${conv.map((c) => c.val).join('x')}${u}${t.slice(m.index + m[0].length)}`;
    return { text: clean(t), unit: null };
  }
  // Có nhãn (dài/rộng/cao…): đổi cm/inch → mm; khoảng "5-10cm" đổi cả hai đầu.
  let donVi = null;
  t = t.replace(new RegExp(`${NUM}(?:\\s*-\\s*${NUM})?\\s*${UNIT}(?![\\p{L}])`, 'giu'), (all, a, b, u) => {
    const x = doiDonVi(a, u);
    const y = b ? doiDonVi(b, u) : null;
    donVi = x.unit;
    return `${x.val}${y ? `-${y.val}` : ''}${x.unit}`;
  });
  return { text: clean(t), unit: donVi };
}

/** Gộp các cụm kích thước thành MỘT cụm "KT: …", đơn vị ghi một lần cuối khi các phần cùng đơn vị. */
function cumKichThuoc(list) {
  const parts = list.map(chuanMotKichThuoc);
  if (parts.length === 1) return `KT: ${parts[0].text}`;
  const units = new Set(parts.map((p) => p.unit));
  if (units.size === 1 && parts[0].unit) {
    const u = parts[0].unit;
    const body = parts.map((p) => p.text.replace(new RegExp(`${u}$`), '')).join('/');
    return `KT: ${body}${u}`;
  }
  return `KT: ${parts.map((p) => p.text).join('/')}`;
}

const MAU_RE = /^(màu|mầu|họa tiết|hoạ tiết|hoa văn|in hình)(?![\p{L}])/iu;
const SPEC_CO_BAT_BUOC_RE = /\d\s*(kw|w|hp|kva|v|a)\b|\b\d+\s*(kw|w|hp|kva|v|a)\b/i;

const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const bo = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
/** Cụm chữ có khớp một trường bắt buộc của chương không (cùng luật với declaration-validator#hasChapterFieldValue). */
function khopTruong(text, fieldDef) {
  const raw = String(text || '').toLowerCase();
  const ascii = bo(raw);
  for (const pat of fieldDef.patterns || []) {
    try {
      if (VI_RE.test(pat)) { if (new RegExp(pat, 'iu').test(raw)) return true; continue; }
      if (new RegExp(bo(pat), 'i').test(ascii)) return true;
    } catch { /* mẫu hỏng: bỏ qua */ }
  }
  return false;
}

/** Nhãn tiếng Việt viết thường đầu (giữ chữ viết tắt "CPU", "RAM"). */
function nhanViThuong(labelVi) {
  const s = clean(labelVi);
  if (s.length > 1 && s[1] === s[1].toLowerCase() && s[0] !== s[0].toLowerCase()) return s[0].toLowerCase() + s.slice(1);
  return s;
}

/**
 * Dựng danh sách cụm theo khuôn. Mỗi cụm: { key, text, protect, rank } — rank nhỏ bị bỏ trước.
 * opts.requiredFields: định nghĩa trường bắt buộc của chương (lấy từ opts.hsCode nếu không truyền).
 */
function buildItems(declaration, opts = {}) {
  const required = opts.requiredFields
    || (opts.hsCode ? (getDeclarationFieldSpec(opts.hsCode)?.required || []) : []);
  const batBuoc = (t) => required.some((f) => khopTruong(t, f));
  const items = [];
  const push = (key, text, protect, rank) => { const t = clean(text); if (t) items.push({ key, text: t, protect, rank }); };

  push('tenHang', declaration.tenHang, true, 99);
  for (const t of chatLieuItems(declaration.thanhPhanCauTao)) push('thanhPhanCauTao', t, true, 99);
  push('congDung', congDungText(declaration.congDung), true, 99);

  const specs = (Array.isArray(declaration.thongSoKyThuat) ? declaration.thongSoKyThuat : [declaration.thongSoKyThuat])
    .filter(Boolean).flatMap(tachY);
  const dims = [];
  const thuong = [];
  for (const sp of specs) {
    if (laKichThuoc(sp)) { dims.push(sp); continue; }
    const giu = batBuoc(sp) || (opts.keepSpecs && SPEC_CO_BAT_BUOC_RE.test(sp));
    thuong.push({ sp, giu, mau: !giu && MAU_RE.test(sp) });
  }
  // Thông số bắt buộc của chương đứng trước, thông số khác sau (giữ thứ tự gốc trong mỗi nhóm).
  for (const s of thuong.filter((x) => x.giu)) push('thongSoKyThuat', s.sp, true, 99);
  for (const s of thuong.filter((x) => !x.giu)) push(s.mau ? 'thongSoKyThuat.mau' : 'thongSoKyThuat', s.sp, false, s.mau ? 1 : 4);

  // Giá trị chapterSpecific chưa có mặt trong các cụm trên → thêm "nhãn: giá trị".
  const blob = () => items.map((i) => i.text).join(' ').toLowerCase();
  const cs = declaration.chapterSpecific && typeof declaration.chapterSpecific === 'object' ? declaration.chapterSpecific : {};
  for (const [k, raw] of Object.entries(cs)) {
    const v = clean(raw);
    if (!v || blob().includes(v.toLowerCase())) continue;
    const def = required.find((f) => f.key === k);
    if (def && khopTruong(blob(), def)) continue; // trường đã có trong chữ
    const label = def ? nhanViThuong(def.labelVi) : null;
    const text = label && label !== k ? `${label}: ${v.replace(/,\s+/g, '/')}` : v.replace(/,\s+/g, '/');
    if (laKichThuoc(text)) { dims.push(text); continue; }
    push(`chapterSpecific.${k}`, text, Boolean(def), 4);
  }

  if (dims.length) {
    const kt = cumKichThuoc(dims);
    push('kichThuoc', kt, batBuoc(kt) || batBuoc(dims.join(' ')), 5);
  }
  if (declaration.quyCach) push('quyCach', `quy cách: ${tachY(declaration.quyCach).join('/')}`, false, 3);
  if (declaration.model) push('model', `model: ${clean(declaration.model).replace(/,\s+/g, '/')}`, false, 7);
  const hieu = hieuText(declaration.nhanHieu);
  if (hieu) push('nhanHieu', hieu, false, 8);
  if (declaration.nhaSanXuat) {
    // Tên công ty "Co., Ltd" giữ nguyên nghĩa nhưng không mang dấu phẩy (dấu phẩy là dấu ngăn cụm).
    const nsx = clean(declaration.nhaSanXuat).replace(/^(NSX|nhà sản xuất)\s*:?\s*/iu, '')
      .replace(/,\s+(?=(ltd|limited|inc|corp|co|llc|gmbh|jsc)\b)/gi, ' ').replace(/,\s+/g, '/');
    push('nhaSanXuat', `NSX: ${nsx}`, false, 6);
  }
  return items;
}

const joinItems = (items, tail) => [...items.map((i) => i.text), ...(tail ? [tail] : [])].join(SEP).replace(/\s+/g, ' ').trim();

const GHI_CHU_HYS = 'Khai tiếp bằng nghiệp vụ HYS theo chỉ tiêu 1.68 TT 121/2025/TT-BTC (nội dung vượt 200 ký tự ô "Mô tả hàng hóa").';

function composeWithMeta(declaration, opts = {}) {
  const maxLength = opts.maxLength || ECUS_MAX_LENGTH;
  if (!declaration) {
    return { text: '', length: 0, fullText: '', fullLength: 0, truncated: false, dropped: [], maxLength, vietTat: [], overflow: false, specsVao: 0, specsRa: 0, khaiTiep: null, khaiTiepItems: [], moTaDayDu: '' };
  }
  const items = buildItems(declaration, opts).map((i, n) => ({ ...i, orig: i.text, idx: n }));
  const tail = clean(declaration.tinhTrang) || null;
  const fullText = joinItems(items, tail);
  const specsVao = items.filter((i) => i.key.startsWith('thongSoKyThuat')).length;
  const dropped = [];
  const boIdx = new Set();
  const vietTatDung = new Set();
  let overflow = false;
  let tenCat = false;
  let cur = items.map((i) => ({ ...i }));
  const len = () => joinItems(cur, tail).length;
  const bo = (n) => { const it = cur[n]; dropped.push(`${it.key}: ${it.orig}`); boIdx.add(it.idx); cur.splice(n, 1); };

  if (len() > maxLength) {
    // (1) Viết tắt chuẩn — không mất dữ kiện.
    cur = cur.map((i) => {
      if (i.key === 'tenHang') return i;
      const r = vietTat(i.text);
      r.dung.forEach((d) => vietTatDung.add(d));
      return { ...i, text: r.text };
    });
    // (2)–(4) Chuyển cụm sang phần khai tiếp HYS theo rank tăng dần; cùng rank thì từ cuối.
    while (len() > maxLength) {
      let idx = -1;
      let best = Infinity;
      cur.forEach((i, n) => { if (!i.protect && i.rank <= best) { best = i.rank; idx = n; } });
      if (idx === -1) break;
      bo(idx);
    }
    // (5) Bất khả kháng: riêng tên + đặc trưng phân loại + tình trạng đã vượt → chuyển đặc trưng từ cuối (báo overflow),
    //     cuối cùng mới cắt tên hàng tại ranh giới từ (tên đầy đủ ghi ở phần khai tiếp).
    while (len() > maxLength && cur.length > 1) {
      overflow = true;
      bo(cur.length - 1);
    }
    if (len() > maxLength && cur.length === 1) {
      overflow = true;
      const budget = maxLength - (tail ? tail.length + SEP.length : 0);
      let ten = cur[0].text;
      if (budget > 0 && ten.length > budget) {
        ten = ten.slice(0, budget);
        const sp = ten.lastIndexOf(' ');
        if (sp > budget * 0.5) ten = ten.slice(0, sp);
        cur[0] = { ...cur[0], text: clean(ten) };
        dropped.push('tenHang[trimmed]');
        tenCat = true;
      }
    }
  }
  let text = joinItems(cur, tail);
  if (text.length > maxLength) text = text.slice(0, maxLength).trim();
  // Phần khai tiếp HYS: cụm đã chuyển, theo đúng thứ tự khuôn, bản gốc (không viết tắt).
  const khaiTiepItems = [
    ...(tenCat ? [`tên hàng đầy đủ: ${items[0].orig}`] : []),
    ...items.filter((i) => boIdx.has(i.idx)).map((i) => i.orig),
  ];
  return {
    text,
    length: text.length,
    fullText,
    fullLength: fullText.length,
    truncated: text !== fullText,
    dropped,
    maxLength,
    vietTat: [...vietTatDung],
    overflow,
    specsVao,
    specsRa: cur.filter((i) => i.key.startsWith('thongSoKyThuat')).length,
    khaiTiep: khaiTiepItems.length ? khaiTiepItems.join(SEP) : null,
    khaiTiepItems,
    // Viết rõ chữ phần nhãn/thông số; KHÔNG đụng giá trị nhận diện (tên, model, hiệu, tên NSX) — "CS", "KT" có thể là chữ thật.
    moTaDayDu: [...items.map((i) => {
      if (i.key === 'tenHang' || i.key === 'model' || i.key === 'nhanHieu') return i.orig;
      if (i.key === 'nhaSanXuat') return i.orig.replace(/^NSX:/, 'nhà sản xuất:');
      return vietRo(i.orig);
    }), ...(tail ? [tail] : [])].join(SEP),
  };
}

// ── Khuôn CŨ (trước Đợt 0B: "tên; nhãn hiệu X; model Y; …; xuất xứ Z; tình trạng") ─────────────────────────────
// CHỈ còn cho /api/declaration-sheet (lib/declaration-sheet.js), nơi có vòng tự cắt-cho-vừa riêng dựa trên khuôn này.
// Chuyển phiếu sang khuôn mới là việc riêng (không thuộc Đợt 0B). Không dùng cho mô tả mới.
const SEP_V1 = '; ';

function buildHeadPartsV1(declaration) {
  const parts = [];
  if (declaration.tenHang) parts.push({ key: 'tenHang', text: declaration.tenHang });
  if (declaration.nhanHieu && declaration.nhanHieu !== 'N/A') {
    parts.push({ key: 'nhanHieu', text: `nhãn hiệu ${declaration.nhanHieu}` });
  }
  if (declaration.model) parts.push({ key: 'model', text: `model ${declaration.model}` });
  if (declaration.thanhPhanCauTao) {
    parts.push({ key: 'thanhPhanCauTao', text: `thành phần: ${declaration.thanhPhanCauTao}` });
  }
  const specs = Array.isArray(declaration.thongSoKyThuat) ? declaration.thongSoKyThuat.filter(Boolean) : [];
  if (specs.length) {
    parts.push({ key: 'thongSoKyThuat', specs: [...specs] });
  }
  if (declaration.congDung) parts.push({ key: 'congDung', text: `công dụng: ${declaration.congDung}` });
  if (declaration.quyCach) parts.push({ key: 'quyCach', text: `quy cách: ${declaration.quyCach}` });
  return parts;
}

function buildTailPartsV1(declaration) {
  const parts = [];
  if (declaration.xuatXu?.nameVi) parts.push(`xuất xứ ${declaration.xuatXu.nameVi}`);
  if (declaration.tinhTrang) parts.push(declaration.tinhTrang);
  return parts;
}

function partTextV1(p) {
  if (p.specs) return `thông số: ${p.specs.join('; ')}`;
  return p.text;
}

function joinAllV1(headParts, tailParts) {
  const texts = [...headParts.map(partTextV1), ...tailParts];
  return texts.join(SEP_V1).replace(/\s+/g, ' ').trim();
}

// Thứ tự hy sinh khi vượt 200 ký tự — phần phụ trước, phần định danh sau.
// tenHang + xuất xứ + tình trạng không bao giờ bị drop (tenHang chỉ bị cắt ngắn khi bất khả khóng).
const DROP_ORDERV1 = ['quyCach', 'congDung', 'thongSoKyThuat', 'thanhPhanCauTao', 'model', 'nhanHieu'];
// #324: nhóm máy móc (84/85 — template machineryGeneric bắt buộc power/voltage): thông số là chứng từ
// phân loại, KHÔNG bị hy sinh trước phụ đề. Đưa thông số xuống cuối thứ tự cắt + ưu tiên giữ dòng có số+đơn vị.
const DROP_ORDER_KEEP_SPECSV1 = ['quyCach', 'congDung', 'thanhPhanCauTao', 'model', 'nhanHieu', 'thongSoKyThuat'];
const SPEC_CO_BAT_BUOC_REV1 = /\d\s*(kw|w|hp|kva|v|a)\b|\b\d+\s*(kw|w|hp|kva|v|a)\b/i;
function xepSpecsUuTienV1(specs) {
  // Dòng mang số+đơn vị công suất/điện áp/dòng → xếp CUỐI (pop bỏ dòng phụ trước).
  const coSo = []; const khongSo = [];
  for (const sp of specs) (SPEC_CO_BAT_BUOC_REV1.test(sp) ? coSo : khongSo).push(sp);
  return [...khongSo, ...coSo];
}

function composeWithMetaV1(declaration, opts = {}) {
  if (!declaration) {
    return { text: '', length: 0, fullText: '', fullLength: 0, truncated: false, dropped: [], maxLength: ECUS_MAX_LENGTH };
  }
  const maxLength = opts.maxLength || ECUS_MAX_LENGTH;
  const headParts = buildHeadPartsV1(declaration);
  if (opts.keepSpecs) {
    const idx = headParts.findIndex((p) => p.key === 'thongSoKyThuat');
    if (idx !== -1) headParts[idx].specs = xepSpecsUuTienV1(headParts[idx].specs);
  }
  const tailParts = buildTailPartsV1(declaration);

  const fullText = joinAllV1(headParts, tailParts);
  let text = fullText;
  const dropped = [];

  if (text.length > maxLength) {
    for (const key of opts.keepSpecs ? DROP_ORDER_KEEP_SPECSV1 : DROP_ORDERV1) {
      if (text.length <= maxLength) break;
      const idx = headParts.findIndex((p) => p.key === key);
      if (idx === -1) continue;

      if (key === 'thongSoKyThuat') {
        // Cắt từng thông số từ cuối trước khi bỏ cả cụm (giữ ít nhất 1 dòng — dòng số+đơn vị đã xếp cuối khi keepSpecs)
        const part = headParts[idx];
        const floor = opts.keepSpecs ? Math.min(1, part.specs.length) : 1;
        while (part.specs.length > floor && joinAllV1(headParts, tailParts).length > maxLength) {
          part.specs.pop();
          dropped.push('thongSoKyThuat[item]');
        }
        if (joinAllV1(headParts, tailParts).length > maxLength) {
          headParts.splice(idx, 1);
          dropped.push(key);
        }
      } else {
        headParts.splice(idx, 1);
        dropped.push(key);
      }
      text = joinAllV1(headParts, tailParts);
    }

    // Bất khả kháng: chỉ còn tenHang + xuất xứ + tình trạng mà vẫn vượt →
    // cắt tenHang tại ranh giới từ, giữ nguyên đuôi bắt buộc.
    if (text.length > maxLength) {
      const tail = tailParts.join(SEP_V1);
      const budget = maxLength - (tail ? tail.length + SEP_V1.length : 0);
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
      text = joinAllV1(headParts, tailParts);
      if (text.length > maxLength) text = text.slice(0, maxLength).trim();
    }
  }

  return {
    text,
    length: text.length,
    fullText,
    fullLength: fullText.length,
    truncated: text !== fullText,
    dropped,
    maxLength,
  };
}


function composeCustomsDescription(declaration, opts = {}) {
  return composeWithMeta(declaration, opts).text;
}

module.exports = {
  composeCustomsDescription, composeWithMeta, ECUS_MAX_LENGTH, composeWithMetaV1,
  // dùng lại ở describe-core / test
  khopTruong, nhanViThuong, hieuText, chuanMotKichThuoc, cumKichThuoc, laKichThuoc, vietRo, SEP, GHI_CHU_HYS,
};
