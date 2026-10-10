/**
 * Sổ tay chú giải (backlog bước 8, docs/backlog/08-so-tay-chu-giai.md) — phần MÁY dùng chung cho
 * dựng (scripts/build-so-tay.mjs), kiểm (scripts/check-so-tay.mjs) và các cổng lúc chạy sau này.
 *
 * Ba tầng: kệ sách (nguyên văn: chú giải HS 2022, SEN 2022, biểu thuế) → sổ tay (data/so-tay/<nhom4>.json,
 * có cấu trúc) → bộ não (AI lúc chạy). Quy tắc bất biến: MỌI mục trong sổ tay có `nguon` (mã nguồn
 * dưới đây) + `trich` (câu nguyên văn chép từ nguồn đó); máy kiểm được thì giữ, không kiểm được thì bỏ.
 * Trích sai điều luật tệ hơn không trích — đây là căn cứ người khai đưa cho Hải quan.
 *
 * Mã nguồn — CHỈ văn bản pháp lý nguyên văn (bước 1, 07/10: các trường bao_gom / khong_bao_gom /
 * loai_tru / phan_biet / tinh_chat thu qua KG là tóm tắt hoặc cắt dán, có nhóm gán nhầm — 8480 chứa nội
 * dung 8482 — nên KHÔNG được trích; mục trích từ đó mà câu có nguyên văn ở nguồn thật thì được gắn lại):
 *   nhom<4>.nhom (toàn văn chú giải chi tiết HS 2022)
 *   ch<2>.chuong (chú giải chương + tổng quát)   phan<2>.phan (chú giải Phần chứa chương)
 *   sen.<mã>     (SEN 2022 — mã 8/6/4 số như trong data/sen-2022.json)
 *   tax.<8 số>   (dòng biểu thuế: "85098010 - - Máy đánh bóng sàn nhà")
 *   wco.<6 số>   (tên phân nhóm 6 số chính thức của WCO, tiếng Anh — data/wco-hs-international.csv;
 *                 dòng biểu thuế VN chỉ ghi "- - - Loại khác", thiếu tên phân nhóm cha)
 *
 * Mục `yKienWco` (#196) — ý kiến phân loại trong Tuyển tập ý kiến WCO (TT 85/2026 Điều 6.1.b). Nguồn `wco-op.<hs>.<thứ tự>`
 * có BẢN QUYỀN và nằm ở kho riêng (lib/wco-op.js) nên KHÔNG nằm trong sourcesFor và nguyên văn không bao giờ vào repo công khai.
 * Phần công khai: mã, số thứ tự IN (số chính thức), năm thông qua, `moTa` tiếng Việt TỰ VIẾT, `dauVet` (băm câu trích riêng tư).
 * Khi có kho riêng, máy kiểm: ý kiến tồn tại + qua cổng số thứ tự; câu trích (kho riêng `so-tay-trich.json`) có nguyên văn trong ý kiến
 * và đúng `dauVet`; mọi con số trong `moTa` có trong ý kiến. Không có kho riêng (CI) chỉ kiểm hình dạng — không bao giờ coi là "đã đối chiếu".
 */
const fs = require('fs');
const crypto = require('crypto');
const { dataReadPath } = require('./data-paths');
const wcoOp = require('./wco-op');

const cache = {};
function load(name) {
  if (!(name in cache)) {
    try { cache[name] = JSON.parse(fs.readFileSync(dataReadPath(name), 'utf8')); } catch { cache[name] = null; }
  }
  return cache[name];
}
function taxRows() {
  if (!cache._tax) {
    const t = load('tax.json') || [];
    cache._tax = (Array.isArray(t) ? t : Object.values(t)).map((r) => ({ hs: String(r.hs).replace(/\D/g, ''), vn: String(r.vn || '') }));
  }
  return cache._tax;
}

const HEADING_FIELDS = ['nhom'];

function wcoRows() {
  if (!cache._wco) {
    cache._wco = [];
    try {
      const lines = fs.readFileSync(dataReadPath('wco-hs-international.csv'), 'utf8').split('\n').slice(1);
      for (const line of lines) {
        const m = line.match(/^[^,]*,(\d{6}),("(?:[^"]|"")*"|[^,]*),(\d+),6\s*$/);
        if (m) cache._wco.push({ hs: m[1], parent: m[3], text: m[2].replace(/^"|"$/g, '').replace(/""/g, '"') });
      }
    } catch { /* thiếu tệp → không có nguồn wco */ }
  }
  return cache._wco;
}

// Trường `phan` (chú giải Phần, thu qua KG) có chỗ gán nhầm: ch.39, 40 (Phần VII) mang chú giải Phần VI.
// Chỉ nhận `phan` khi đa số chương mang cùng văn bản đó thuộc CÙNG Phần với chương này (data/hs-sections.json).
function phanHopLe(ch) {
  if (!cache._phanOk) {
    const C = load('chu-giai-chuong.json') || {};
    const secOf = {};
    for (const s of (load('hs-sections.json') || {}).sections || []) for (const c of s.chapters) secOf[c] = s.code;
    const groups = {};
    for (const [c, v] of Object.entries(C)) {
      const t = String(v.phan || '').trim();
      if (t) (groups[t.slice(0, 200)] ||= []).push(c);
    }
    cache._phanOk = new Set();
    for (const chs of Object.values(groups)) {
      const count = {};
      for (const c of chs) count[secOf[c]] = (count[secOf[c]] || 0) + 1;
      const major = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
      for (const c of chs) if (secOf[c] && secOf[c] === major) cache._phanOk.add(c);
    }
  }
  return cache._phanOk.has(ch);
}

/** Mọi nguồn nguyên văn của một nhóm: { [maNguon]: text } (đã bỏ trống). */
function sourcesFor(h4) {
  const H = (load('chu-giai-heading.json') || {})[h4] || {};
  const ch = h4.slice(0, 2);
  const C = (load('chu-giai-chuong.json') || {})[ch] || {};
  const out = {};
  for (const f of HEADING_FIELDS) if (String(H[f] || '').trim()) out[`nhom${h4}.${f}`] = String(H[f]);
  if (String(C.chuong || '').trim()) out[`ch${ch}.chuong`] = String(C.chuong);
  if (String(C.phan || '').trim() && phanHopLe(ch)) out[`phan${ch}.phan`] = String(C.phan);
  const sen = load('sen-2022.json');
  for (const m of sen?.muc || []) {
    for (const ma of m.ma) {
      if (ma.startsWith(h4) || (ma.length === 4 && ma === h4)) out[`sen.${ma}`] = `${m.tieuDe}\n${m.noiDung}`;
    }
  }
  for (const r of wcoRows()) if (r.parent === h4) out[`wco.${r.hs}`] = `${r.hs} ${r.text}`;
  for (const r of taxRows()) if (r.hs.startsWith(h4)) out[`tax.${r.hs}`] = `${r.hs} ${r.vn}`;
  return out;
}

const squash = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const squashCache = new WeakMap();
function squashed(sources) {
  let m = squashCache.get(sources);
  if (!m) { m = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, squash(v)])); squashCache.set(sources, m); }
  return m;
}

/** Câu trích có nguyên văn trong nguồn? Cho phép lược "…" giữa các đoạn; mỗi đoạn ≥ 6 ký tự đều phải có. */
function quoteInSource(trich, src) {
  const frags = String(trich || '').split(/…|\.{3,}/).map(squash).filter((f) => f.length >= 6);
  return frags.length > 0 && frags.every((f) => src.includes(f));
}

const headingCodes = (s) => String(s || '').split(/[|,;\s]+/).map((x) => x.replace(/\D/g, '')).filter(Boolean);
function mentions(trich, code) {
  const t = String(trich || '');
  const dotted = code.length === 4 ? `${code.slice(0, 2)}.${code.slice(2)}` : code.length === 8 ? `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}` : code;
  return t.includes(dotted) || t.replace(/\D/g, ' ').split(/\s+/).includes(code) || t.includes(`${code.slice(0, 4)}.${code.slice(4)}`);
}
const validHeading = (h) => h.length === 4 && !!(load('chu-giai-heading.json') || {})[h];
const validTax = (h) => taxRows().some((r) => r.hs === h);
/**
 * `loaiKhac` của dòng 8 số do MÁY suy từ biểu thuế, không để AI tự hiểu (bước 2: mỗi agent một kiểu):
 * true khi tên dòng (bỏ gạch đầu dòng) bắt đầu bằng "Loại khác" (kể cả kèm điều kiện: "Loại khác, dạng dầu xoa bóp").
 * Dòng "Xe tự hành khác", "Từ các vật liệu dệt khác" → false (có tên riêng, không phải dòng gom).
 */
function isLoaiKhac(hs) {
  const r = taxRows().find((x) => x.hs === hs);
  return !!r && /^Loại khác\b/i.test(r.vn.replace(/^[-\s–]+/, '').trim());
}

/**
 * Kiểm một mục. Trả null nếu đạt, hoặc chuỗi lý do loại.
 * @param {'phamVi'|'dieuKienVao'|'loaiTru'|'phanBiet'|'boPhan'|'dong8'} kind
 */
function reanchor(item, sources) {
  // Nguồn ghi sai/không được phép (vd nhom8405.khong_bao_gom) nhưng câu trích có nguyên văn ở đúng MỘT
  // nguồn pháp lý của nhóm → gắn lại nguồn đó (giữ dấu vết nguonGhi). Nhiều nguồn cùng chứa → ưu tiên
  // nhom > ch > phan > sen > tax theo thứ tự khai trong sourcesFor.
  if (!item || typeof item !== 'object' || !item.trich || (item.nguon in sources)) return item;
  const sq = squashed(sources);
  const hit = Object.keys(sources).find((k) => quoteInSource(item.trich, sq[k]));
  return hit ? { ...item, nguon: hit, nguonGhi: item.nguon || null } : item;
}

// Luật rút ra từ soát độc lập vòng 2 (07/10/2026): nhiều mục "đạt" nguồn vẫn sai nghĩa. Chỉ giữ luật hẹp, đo được.
const HEDGE_LOAI_TRU = /thường (nằm|thuộc|được xếp|xếp)|\(thường|tùy (theo )?(từng )?trường hợp/i;
// Câu CHO PHÉP ('vẫn được phân loại ở đây ngay cả khi…', 'đã hoặc chưa…') không phải điều kiện vào nhóm; đặt =true sẽ loại nhầm hàng không có thuộc tính đó.
const CAU_CHO_PHEP = /ngay cả khi|vẫn (được phân loại|thuộc nhóm|được xếp|nằm trong nhóm)|đã hoặc chưa|whether or not|even if/i;
const MA_PHAN_NHOM_TRONG_HOI = /WCO|\d{4}\.\d{2}/;

function checkItem(kind, item, sources, h4) {
  if (!item || typeof item !== 'object') return 'khong-phai-object';
  if (!item.nguon || !(item.nguon in sources)) return `nguon-khong-duoc-trich:${item.nguon || ''}`;
  if (!String(item.trich || '').trim()) return 'thieu-trich';
  if (String(item.trich).length > 600) return 'trich-qua-dai';
  if (!quoteInSource(item.trich, squashed(sources)[item.nguon])) return 'trich-khong-co-trong-nguon';
  // Điều kiện của PHÂN NHÓM/dòng 8 số (tên WCO, SEN, biểu thuế) không phải điều kiện VÀO nhóm 4 số: máy đọc kiểu AND sẽ loại nhầm hàng hợp lệ.
  if (kind === 'dieuKienVao' && /^(wco|sen|tax)\./.test(item.nguon)) return 'dieu-kien-cap-phan-nhom';
  if (kind === 'dieuKienVao' && CAU_CHO_PHEP.test(item.trich)) return 'dieu-kien-chi-cho-phep';
  if (kind === 'phanBiet' && MA_PHAN_NHOM_TRONG_HOI.test(String(item.hoi || ''))) return 'hoi-nhac-ma-phan-nhom';
  // Đích loại trừ mà câu nguồn chỉ nói "thường thuộc"/"tùy trường hợp" thì không phải loại trừ dứt khoát.
  if (kind === 'loaiTru' && HEDGE_LOAI_TRU.test(item.trich)) return 'loai-tru-chi-la-thuong';
  if (kind === 'loaiTru') {
    const codes = headingCodes(item.sangNhom);
    if (!codes.length) return 'thieu-nhom-dich';
    for (const c of codes) {
      if (!(validHeading(c) || validTax(c))) return `nhom-dich-khong-co-that:${c}`;
      if (c === h4) return 'nhom-dich-trung-nhom-nay';
      if (!mentions(item.trich, c)) return `nhom-dich-khong-co-trong-trich:${c}`;
    }
  }
  if (kind === 'dieuKienVao' && typeof item.value === 'number' && !String(item.trich).replace(/\s/g, '').includes(String(item.value).replace('.', ','))
      && !String(item.trich).replace(/\s/g, '').includes(String(item.value))) {
    return `nguong-khong-co-trong-trich:${item.value}`;
  }
  if (kind === 'phanBiet') {
    for (const c of [...headingCodes(item.neuCo), ...headingCodes(item.neuKhong)]) {
      if (!(validHeading(c) || validTax(c))) return `ma-khong-co-that:${c}`;
      // Mã NGOÀI nhóm này phải được nêu trong câu trích (bước 1: 3812 → 2917 khi nguồn chỉ nói "Chương 29").
      if (!c.startsWith(h4) && !mentions(item.trich, c) && !mentions(item.trich, c.slice(0, 4))) return `ma-dich-khong-co-trong-trich:${c}`;
    }
  }
  if (kind === 'dong8') {
    const hs = String(item.hs || '').replace(/\D/g, '');
    if (hs.length !== 8 || !hs.startsWith(h4) || !validTax(hs)) return `dong8-khong-co-trong-bieu:${item.hs}`;
  }
  return null;
}

const dotted = (hs) => (hs.length === 6 ? `${hs.slice(0, 4)}.${hs.slice(4)}` : `${hs.slice(0, 2)}.${hs.slice(2)}`);
const fingerprint = (trich) => crypto.createHash('sha256').update(wcoOp.squash(trich)).digest('hex').slice(0, 16);
const numTokens = (t) => [...String(t).matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0].replace(/[.,]/g, ''));

/** Kho riêng các câu trích của sổ tay: data/wco-op/so-tay-trich.json { "wco-op.<hs>.<ord>": "câu trích tiếng Anh" }. */
function wcoTrichStore() {
  if (!('_wcoTrich' in cache)) {
    try { cache._wcoTrich = JSON.parse(fs.readFileSync(process.env.HS_WCO_TRICH_FILE || dataReadPath('wco-op', 'so-tay-trich.json'), 'utf8')); } catch { cache._wcoTrich = null; }
  }
  return cache._wcoTrich;
}
function resetWcoCache() { delete cache._wcoTrich; wcoOp.reset(); }

/**
 * Kiểm một mục yKienWco. null = đạt. Có kho riêng → đối chiếu thật; thiếu kho → chỉ kiểm hình dạng.
 * @param {{doiChieu?: boolean}} opts doiChieu=true: BẮT BUỘC có kho riêng (dựng/nạp mục), thiếu kho thì báo lỗi.
 */
function checkYKienWco(item, h4, opts = {}) {
  if (!item || typeof item !== 'object') return 'khong-phai-object';
  const hs = String(item.hs || '');
  if (!/^\d{4}(\d{2})?$/.test(hs) || !hs.startsWith(h4)) return `hs-khong-thuoc-nhom:${hs}`;
  if (!Number.isInteger(item.thuTuTrongMa) || item.thuTuTrongMa < 1 || item.thuTuTrongMa > 999) return 'thu-tu-khong-hop-le';
  if (item.nguon !== `wco-op.${hs}.${item.thuTuTrongMa}`) return `nguon-khong-khop-ma-thu-tu:${item.nguon || ''}`;
  if (item.namThongQua !== null && !(Number.isInteger(item.namThongQua) && item.namThongQua >= 1950 && item.namThongQua <= 2100)) return 'nam-khong-hop-le';
  const mo = String(item.moTa || '').trim();
  if (mo.length < 20 || mo.length > 300) return 'mo-ta-do-dai';
  if (!mo.includes(dotted(hs))) return 'mo-ta-khong-neu-ma';
  if (!/^[0-9a-f]{16}$/.test(String(item.dauVet || ''))) return 'thieu-dau-vet';
  if (!['CHAC', 'SUY_LUAN'].includes(item.doTinCay)) return 'do-tin-cay-khong-hop-le';
  const store = wcoOp.available() ? wcoTrichStore() : null;
  if (!wcoOp.available()) return opts.doiChieu ? 'khong-co-kho-rieng-de-doi-chieu' : null;
  const o = wcoOp.get(`${hs}/${item.thuTuTrongMa}`);
  if (!o) return 'y-kien-khong-co-trong-kho';
  if (o.headingSuspect) return 'y-kien-chua-qua-cong-ma';
  if ((o.adoption || null) !== item.namThongQua) return 'nam-khong-khop-kho';
  const trich = store && store[item.nguon];
  if (!trich) return 'thieu-trich-rieng';
  if (!wcoOp.quoteInOpinion(`${hs}/${item.thuTuTrongMa}`, trich)) return 'trich-khong-co-trong-y-kien';
  if (fingerprint(trich) !== item.dauVet) return 'dau-vet-khong-khop-trich';
  const have = new Set(numTokens(o.text));
  const lạ = numTokens(mo).filter((n) => !have.has(n) && n !== hs && !hs.includes(n) && !dotted(hs).replace(/\D/g, '').includes(n));
  if (lạ.length) return `mo-ta-co-so-khong-co-trong-y-kien:${[...new Set(lạ)].join(',')}`;
  return null;
}

const LIST_KINDS = ['dieuKienVao', 'loaiTru', 'phanBiet', 'dong8'];

/**
 * Lọc sổ tay thô (AI trả) → chỉ giữ mục kiểm được. Trả { soTay, loai: [{kind, item, lyDo}], tong, dat }.
 */
function verifySoTay(raw, h4, sources = sourcesFor(h4), opts = {}) {
  const soTay = { nhom: h4 };
  const loai = [];
  let tong = 0;
  let dat = 0;
  const keep = (kind, item0) => {
    const item = reanchor(item0, sources);
    tong += 1;
    const lyDo = checkItem(kind, item, sources, h4);
    if (lyDo) { loai.push({ kind, item, lyDo }); return null; }
    dat += 1;
    if (kind === 'dong8') return { ...item, loaiKhac: isLoaiKhac(String(item.hs).replace(/\D/g, '')) };
    return item;
  };
  if (raw?.phamVi) { const it = keep('phamVi', raw.phamVi); if (it) soTay.phamVi = it; }
  for (const k of LIST_KINDS) soTay[k] = (Array.isArray(raw?.[k]) ? raw[k] : []).map((it) => keep(k, it)).filter(Boolean);
  if (raw?.boPhan) { const it = keep('boPhan', raw.boPhan); if (it) soTay.boPhan = it; }
  // Ý kiến WCO (riêng tư, #196): kiểm bằng checkYKienWco, không qua `sources` công khai.
  const wcoItems = [];
  for (const it of Array.isArray(raw?.yKienWco) ? raw.yKienWco : []) {
    tong += 1;
    const lyDo = checkYKienWco(it, h4, { doiChieu: !!opts.doiChieuWco });
    if (lyDo) loai.push({ kind: 'yKienWco', item: it, lyDo }); else { dat += 1; wcoItems.push(it); }
  }
  if (wcoItems.length) soTay.yKienWco = wcoItems;
  const used = new Set([soTay.phamVi, soTay.boPhan, ...LIST_KINDS.flatMap((k) => soTay[k]), ...wcoItems].filter(Boolean).map((x) => x.nguon));
  soTay.dungTuNguon = [...used].sort();
  soTay.phienBan = [...used].some((u) => u.startsWith('sen.')) ? 'HS2022+SEN2022' : 'HS2022';
  return { soTay, loai, tong, dat };
}

/**
 * Dựng lại nhóm (build-so-tay --force) KHÔNG được làm mất các mục yKienWco đã nạp từ kho riêng: giữ nguyên bản cũ vào bản mới.
 * Trả bản mới đã gộp (không sửa tham số). Mục yKienWco của bản dựng mới (nếu có) bị bỏ — nguồn duy nhất là scripts/wco-op-so-tay.mjs.
 */
function carryOverYKienWco(existing, fresh) {
  const keep = Array.isArray(existing?.yKienWco) ? existing.yKienWco : [];
  if (!keep.length) { const { yKienWco, ...rest } = fresh; return rest; }
  const kt = fresh.kiemTra || {};
  return {
    ...fresh,
    yKienWco: keep,
    ...(existing.yKienWcoDayDu !== undefined ? { yKienWcoDayDu: existing.yKienWcoDayDu } : {}),
    dungTuNguon: [...new Set([...(fresh.dungTuNguon || []), ...keep.map((x) => x.nguon)])].sort(),
    kiemTra: { ...kt, tong: (kt.tong || 0) + keep.length, dat: (kt.dat || 0) + keep.length },
  };
}

module.exports = { carryOverYKienWco, sourcesFor, verifySoTay, checkItem, checkYKienWco, fingerprint, resetWcoCache, quoteInSource, squash, isLoaiKhac, LIST_KINDS };
