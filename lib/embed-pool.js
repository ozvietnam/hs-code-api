/**
 * Tầng ứng viên nhóm bằng embedding cục bộ (GĐ1 điều chỉnh — #366/#377, PR #392).
 *
 * VAI TRÒ (chốt bởi số đo GĐ0): gợi ý top-5 nhóm 4/6 số cho động cơ — TÍN HIỆU xếp hạng,
 * KHÔNG phải bằng chứng chốt mã (nguyên tắc bất biến 14/10). Không thay LLM, không thay sổ tay;
 * chỉ rút ngắn bước "đoán nhóm" bằng cách đưa sẵn ứng viên vào hồ sơ vụ việc.
 *
 * Cờ `HS_EMBED_POOL=on` (mặc định TẮT — prod không đổi hành vi cho tới khi đo end-to-end đạt).
 * Lỗi bất kỳ (thiếu index, thiếu model, mạng hỏng khi tải model) → trả null, engine chạy như cũ.
 *
 * Index: data/gd0/index-e5-small.json — nhãn = mô tả tờ khai thật (bỏ holdout) + tên biểu thuế
 * + tiền lệ TB-TCHQ + tên tiếng Trung 税则; vector 384 chiều đã chuẩn hoá, tính trước bởi
 * scripts/gd0/j2-build-index.mjs. Mô hình multilingual-e5-small (118M, ONNX q8) tải một lần.
 */
const { readFileSync } = require('fs');
const { dataReadPath } = require('./data-paths');

const nz = (s) => String(s || '').replace(/\D/g, '');
const INDEX_FILE = () => process.env.HS_EMBED_INDEX || dataReadPath('gd0/index-e5-small.json');
const MODEL = () => process.env.GD0_MODEL || 'Xenova/multilingual-e5-small';

let state = null; // { ext, index } | { loi } — lazy, bất biến sau lần nạp đầu

async function khoiTao() {
  if (state) return state;
  try {
    const { pipeline } = await import('@huggingface/transformers');
    const ext = await pipeline('feature-extraction', MODEL(), { dtype: 'q8' });
    const index = JSON.parse(readFileSync(INDEX_FILE(), 'utf8'));
    if (!index.vec4 || !index.vec6) throw new Error('index thiếu vec4/vec6');
    state = { ext, index };
  } catch (e) {
    state = { loi: String(e?.message || e).slice(0, 120) };
    console.error('[embed-pool] không khởi tạo được — tầng ứng viên tắt:', state.loi);
  }
  return state;
}

/** Reset cho test (và khi muốn nạp lại index sau rebuild). */
function reset() { state = null; }

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

/** Dòng chữ đưa vào gói vòng 2 — phải ghi rõ bản chất tín hiệu (không bao giờ là căn cứ). */
function dongGoi(pool) {
  if (!pool?.nhom4?.length) return '';
  return [
    'ỨNG VIÊN NHÓM (tín hiệu embedding cục bộ đa ngữ — gợi ý xếp hạng, KHÔNG phải bằng chứng chốt mã):',
    `  nhóm 4 số: ${pool.nhom4.slice(0, 5).map((x) => `${x.ma}(${x.diem})`).join(' ')}`,
    `  phân nhóm 6 số: ${pool.nhom6.slice(0, 5).map((x) => `${x.ma}(${x.diem})`).join(' ')}`,
  ].join('\n');
}

module.exports = { poolNhom, dongGoi, topK, khoiTao, reset };
