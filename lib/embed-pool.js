/**
 * Tầng ứng viên nhóm bằng embedding cục bộ (GĐ1 điều chỉnh — #366/#377, PR #392; mở rộng T-4 #1596).
 *
 * VAI TRÒ (chốt bởi số đo GĐ0): gợi ý top-k nhóm 4/6 số cho động cơ — TÍN HIỆU xếp hạng,
 * KHÔNG phải bằng chứng chốt mã (nguyên tắc bất biến 14/10). Không thay LLM, không thay sổ tay;
 * chỉ rút ngắn bước "đoán nhóm" bằng cách đưa sẵn ứng viên vào hồ sơ vụ việc.
 *
 * Dùng CHUNG MỘT thực thể pipeline `Xenova/multilingual-e5-small` (q8) trong RAM qua `khoiTaoModel()`.
 * Cờ `HS_EMBED_POOL=on` (mặc định TẮT — prod không đổi hành vi cho tới khi đo end-to-end đạt).
 * Lỗi bất kỳ (thiếu index, thiếu model, mạng hỏng khi tải model) → trả null, engine chạy như cũ.
 */
const { existsSync, readFileSync } = require('fs');
const { dataReadPath } = require('./data-paths');

const nz = (s) => String(s || '').replace(/\D/g, '');
const INDEX_FILE = () => process.env.HS_EMBED_INDEX || dataReadPath('gd0/index-e5-small.json');
const SEMANTIC_INDEX_FILE = () => process.env.HS_SEMANTIC_INDEX || null;
const MODEL = () => process.env.GD0_MODEL || 'Xenova/multilingual-e5-small';

let modelPromise = null; // singleton pipeline — chỉ nạp đúng 1 bản e5-small trong RAM
let cachedExt = null;
let state = null; // { ext, index } | { loi } — lazy cho poolNhom
let semanticState = null; // { path, index } | null — lazy cho timTheoNghia

/** Nạp duy nhất 1 thực thể pipeline e5-small (q8). Trả null nếu lỗi (không ném). */
async function khoiTaoModel() {
  if (cachedExt) return cachedExt;
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        const { pipeline } = await import('@huggingface/transformers');
        cachedExt = await pipeline('feature-extraction', MODEL(), { dtype: 'q8' });
        return cachedExt;
      } catch (e) {
        modelPromise = null;
        throw e;
      }
    })();
  }
  return modelPromise;
}

async function khoiTao() {
  if (state) return state;
  try {
    const ext = await khoiTaoModel();
    const index = JSON.parse(readFileSync(INDEX_FILE(), 'utf8'));
    if (!index.vec4 || !index.vec6) throw new Error('index thiếu vec4/vec6');
    state = { ext, index };
  } catch (e) {
    state = { loi: String(e?.message || e).slice(0, 120) };
    console.error('[embed-pool] không khởi tạo được — tầng ứng viên tắt:', state.loi);
  }
  return state;
}

/** Reset cho test (và khi muốn nạp lại index sau rebuild). Giữ nguyên singleton pipeline nếu đã nạp. */
function reset() {
  state = null;
  semanticState = null;
}

/** top-k theo cosine trên các vector đã chuẩn hoá (dot = cosine). Thuần, không model. */
function topK(vec, entries, k) {
  return entries
    .map(([ma, v]) => { let s = 0; for (let i = 0; i < vec.length; i++) s += vec[i] * v[i]; return { ma, diem: +s.toFixed(4) }; })
    .sort((x, y) => y.diem - x.diem)
    .slice(0, k);
}

/**
 * Gợi ý nhóm cho một mô tả hàng.
 * @returns {Promise<{nhom4: Array<{ma,diem}>, nhom6: Array<{ma,diem}>, model: string, loi?: string} | null>}
 *   null khi tắt cờ / chưa khởi tạo được — engine chạy như cũ.
 */
async function poolNhom(text, { k = 5 } = {}) {
  if (process.env.HS_EMBED_POOL !== 'on') return null;
  const st = await khoiTao();
  if (!st.ext) return null;
  const moTa = String(text || '').trim().slice(0, 600);
  if (!moTa) return null;
  const out = await st.ext(['query: ' + moTa], { pooling: 'mean', normalize: true });
  const dim = out.dims[1];
  const arr = Array.from(out.odata || out.data);
  const vec = arr.slice(0, dim);
  return {
    nhom4: topK(vec, Object.entries(st.index.vec4), k),
    nhom6: topK(vec, Object.entries(st.index.vec6), k),
    model: MODEL(),
  };
}

/**
 * Embed một câu văn bản dùng chung singleton pipeline `khoiTaoModel()`.
 * Hỗ trợ tiêm `opts.embedder` / `opts.extractor` cho test offline không có model.
 * Lỗi bất kỳ → trả null (không ném).
 */
async function embedCau(text, opts = {}) {
  const moTa = String(text || '').trim().slice(0, 600);
  if (!moTa) return null;
  try {
    if (typeof opts.embedder === 'function') {
      return await opts.embedder(moTa, opts);
    }
    const ext = opts.extractor || (await khoiTaoModel());
    if (!ext) return null;
    const prefix = opts.query === false ? '' : 'query: ';
    const out = await ext([prefix + moTa], { pooling: 'mean', normalize: true });
    const dim = out.dims[1];
    const arr = Array.from(out.odata || out.data);
    return arr.slice(0, dim);
  } catch {
    return null;
  }
}

/** Nạp chỉ mục nghĩa từ đĩa (hỗ trợ cả centroid JSON lẫn chỉ mục int8 nhị phân `.bin` + `.meta.json`). */
function taiChiMucNghia(customPath) {
  const target = customPath || SEMANTIC_INDEX_FILE() || (existsSync(dataReadPath('do-thi/chi-muc-nghia.bin')) ? dataReadPath('do-thi/chi-muc-nghia.bin') : INDEX_FILE());
  if (!target) return null;
  if (semanticState && semanticState.path === target) return semanticState.index;
  try {
    if (target.endsWith('.bin')) {
      const metaPath = target.replace(/\.bin$/, '.meta.json');
      if (!existsSync(target) || !existsSync(metaPath)) return null;
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      if (meta?.dim !== 384 || !Array.isArray(meta?.items) || !meta.items.length) return null;
      const rawBuf = readFileSync(target);
      if (rawBuf.byteLength !== meta.items.length * meta.dim) return null;
      const vectors = new Int8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
      const idx = { kieu: 'int8', dim: meta.dim, count: meta.items.length, scale: meta.scale || 127, items: meta.items, vectors };
      semanticState = { path: target, index: idx };
      return idx;
    }
    if (!existsSync(target)) return null;
    const idx = JSON.parse(readFileSync(target, 'utf8'));
    semanticState = { path: target, index: idx };
    return idx;
  } catch {
    return null;
  }
}

/** Chấm điểm một vector truy vấn đã chuẩn hoá trên chỉ mục centroid (`vec4`/`vec6`) hoặc int8 từng dòng. */
function timTheoNghiaTrucTiep(vec, index, { k = 20 } = {}) {
  if (!vec || !index) return null;

  // Nhánh B: chỉ mục từng dòng định lượng int8 (tốc độ < 10 ms cho ~18 nghìn câu × 384 chiều)
  if (index.vectors && Array.isArray(index.items)) {
    const dim = index.dim || vec.length;
    const count = index.count || index.items.length;
    const scale = index.scale || 127;
    const vArr = index.vectors;
    const invScale = 1 / scale;
    const q = vec instanceof Float32Array ? vec : Float32Array.from(vec);

    // Duyệt phẳng không cấp phát mảng con; chỉ giữ top K*4 bằng ngưỡng trượt nhanh hoặc mảng cặp nhỏ.
    const keepN = Math.max(k * 5, 60);
    const bestScores = new Float32Array(keepN).fill(-2);
    const bestIdx = new Int32Array(keepN).fill(-1);
    let minPos = 0;
    let minVal = -2;

    if (dim === 384) {
      for (let i = 0; i < count; i += 1) {
        const base = i * 384;
        let dot0 = 0;
        let dot1 = 0;
        let dot2 = 0;
        let dot3 = 0;
        for (let d = 0; d < 384; d += 8) {
          const b = base + d;
          dot0 += q[d] * vArr[b] + q[d + 4] * vArr[b + 4];
          dot1 += q[d + 1] * vArr[b + 1] + q[d + 5] * vArr[b + 5];
          dot2 += q[d + 2] * vArr[b + 2] + q[d + 6] * vArr[b + 6];
          dot3 += q[d + 3] * vArr[b + 3] + q[d + 7] * vArr[b + 7];
        }
        const sim = (dot0 + dot1 + dot2 + dot3) * invScale;
        if (sim > minVal) {
          bestScores[minPos] = sim;
          bestIdx[minPos] = i;
          let np = 0;
          let nv = bestScores[0];
          for (let j = 1; j < keepN; j += 1) {
            if (bestScores[j] < nv) {
              nv = bestScores[j];
              np = j;
            }
          }
          minPos = np;
          minVal = nv;
        }
      }
    } else {
      for (let i = 0; i < count; i += 1) {
        const base = i * dim;
        let dot = 0;
        for (let d = 0; d < dim; d += 1) {
          dot += q[d] * vArr[base + d];
        }
        const sim = dot * invScale;
        if (sim > minVal) {
          bestScores[minPos] = sim;
          bestIdx[minPos] = i;
          let np = 0;
          let nv = bestScores[0];
          for (let j = 1; j < keepN; j += 1) {
            if (bestScores[j] < nv) {
              nv = bestScores[j];
              np = j;
            }
          }
          minPos = np;
          minVal = nv;
        }
      }
    }

    const hits = [];
    for (let j = 0; j < keepN; j += 1) {
      const idxItem = bestIdx[j];
      if (idxItem < 0) continue;
      const it = index.items[idxItem];
      hits.push({
        hs: it.hs,
        nhom4: String(it.hs).slice(0, 4),
        pn6: String(it.hs).slice(0, 6),
        nguon: it.nguon || 'oz',
        ten: it.ten || '',
        diem: +bestScores[j].toFixed(4),
      });
    }
    hits.sort((a, b) => (b.diem - a.diem) || (a.hs < b.hs ? -1 : 1));
    const topHits = hits.slice(0, k);

    // Gộp sang top nhóm 4 số và phân nhóm 6 số (lấy điểm cao nhất + cộng nhẹ tần suất trong top buffer)
    const map4 = new Map();
    const map6 = new Map();
    for (const h of hits) {
      const cur4 = map4.get(h.nhom4);
      if (!cur4 || h.diem > cur4.diem) map4.set(h.nhom4, { ma: h.nhom4, diem: h.diem });
      if (h.pn6.length === 6) {
        const cur6 = map6.get(h.pn6);
        if (!cur6 || h.diem > cur6.diem) map6.set(h.pn6, { ma: h.pn6, diem: h.diem });
      }
    }
    const nhom4 = [...map4.values()].sort((a, b) => (b.diem - a.diem) || (a.ma < b.ma ? -1 : 1)).slice(0, k);
    const nhom6 = [...map6.values()].sort((a, b) => (b.diem - a.diem) || (a.ma < b.ma ? -1 : 1)).slice(0, k);
    return { kieu: 'int8', nhom4, nhom6, muc: topHits };
  }

  // Nhánh: mảng items truyền sẵn vector thường (tiện cho test cách ly)
  if (Array.isArray(index.items)) {
    const hits = index.items.map((it) => {
      let s = 0;
      for (let i = 0; i < vec.length; i += 1) s += vec[i] * it.vec[i];
      const hs = nz(it.hs);
      return { hs, nhom4: hs.slice(0, 4), pn6: hs.slice(0, 6), nguon: it.nguon || 'test', ten: it.ten || '', diem: +s.toFixed(4) };
    }).sort((a, b) => (b.diem - a.diem) || (a.hs < b.hs ? -1 : 1)).slice(0, k);
    const map4 = new Map();
    const map6 = new Map();
    for (const h of hits) {
      if (!map4.has(h.nhom4)) map4.set(h.nhom4, { ma: h.nhom4, diem: h.diem });
      if (h.pn6.length === 6 && !map6.has(h.pn6)) map6.set(h.pn6, { ma: h.pn6, diem: h.diem });
    }
    return { kieu: 'items', nhom4: [...map4.values()], nhom6: [...map6.values()], muc: hits };
  }

  // Nhánh A: chỉ mục centroid `vec4` / `vec6` (index-e5-small.json)
  if (index.vec4 && index.vec6) {
    return {
      kieu: 'centroid',
      nhom4: topK(vec, Object.entries(index.vec4), k),
      nhom6: topK(vec, Object.entries(index.vec6), k),
      muc: [],
    };
  }
  return null;
}

/**
 * Tìm ứng viên theo nghĩa cho câu đã tiền xử lý, dùng chung `khoiTaoModel()`.
 * Trả null êm nếu thiếu chỉ mục hoặc lỗi nạp model (không ném ngoại lệ).
 */
async function timTheoNghia(text, { k = 20, index, embedder, extractor } = {}) {
  try {
    const moTa = String(text || '').trim();
    if (!moTa) return null;
    const idx = index !== undefined
      ? index
      : (state?.index && !SEMANTIC_INDEX_FILE() && !existsSync(dataReadPath('do-thi/chi-muc-nghia.bin')) ? state.index : taiChiMucNghia());
    if (!idx) return null;
    const vec = await embedCau(moTa, { embedder, extractor });
    if (!vec) return null;
    return timTheoNghiaTrucTiep(vec, idx, { k });
  } catch {
    return null;
  }
}

/** Dòng chữ đưa vào gói vòng 2 — phải ghi rõ bản chất tín hiệu (không bao giờ là căn cứ). */
function dongGoi(pool) {
  if (!pool?.nhom4?.length) return '';
  return [
    'ỨNG VIÊN NHÓM (tín hiệu embedding cục bộ đa ngữ — gợi ý xếp hạng, KHÔNG phải bằng chứng chốt mã):',
    `  nhóm 4 số: ${pool.nhom4.slice(0, 5).map((x) => `${x.ma}(${x.diem})`).join(' ')}`,
    `  phân nhóm 6 số: ${pool.nhom6.slice(0, 5).map((x) => `${x.ma}(${x.diem})`).join(' ')}`,
  ].join('\n');
}

module.exports = {
  poolNhom,
  dongGoi,
  topK,
  khoiTao,
  khoiTaoModel,
  embedCau,
  timTheoNghia,
  timTheoNghiaTrucTiep,
  taiChiMucNghia,
  reset,
};
