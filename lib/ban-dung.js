/**
 * Bản đang chạy (OZV-724): SHA commit + thời điểm dựng ảnh, để mọi phép đo prod biết đang đo bản nào.
 *
 * Nguồn: biến môi trường do Docker build ghi vào (ARG → ENV trong Dockerfile) — Coolify đặt sẵn
 * `SOURCE_COMMIT`, CI đặt `GITHUB_SHA`. KHÔNG chạy lệnh `git` lúc chạy: ảnh prod không có `.git`
 * (bị loại trong .dockerignore). Vẫn ĐỌC tệp `.git/HEAD` khi có (dev local, worktree) cho tiện —
 * chỉ lấy SHA, không lấy tên nhánh.
 *
 * Nguyên tắc: không bao giờ ném. Thiếu/sai định dạng ⇒ `null`. /api/health không được đỏ vì chính nó.
 */
const fs = require('fs');
const path = require('path');

const SHA = /^[0-9a-f]{7,40}$/i;
const BIEN_COMMIT = ['SOURCE_COMMIT', 'GIT_COMMIT', 'GITHUB_SHA', 'HS_COMMIT'];
const BIEN_THOI_GIAN = ['BUILD_TIME', 'HS_BUILD_TIME'];
const TEP_THOI_GIAN = path.join(__dirname, '..', '.build-time');

/** SHA ngắn 12 ký tự chữ thường, hoặc null khi chuỗi không phải SHA. */
function chuanSha(v) {
  const s = String(v == null ? '' : v).trim();
  return SHA.test(s) ? s.toLowerCase().slice(0, 12) : null;
}

/** ISO 8601 UTC, hoặc null khi không phân tích được. */
function chuanThoiGian(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

/** SHA đọc từ tệp .git (kể cả worktree) — chỉ dùng khi không có biến môi trường. */
function shaTuGit() {
  try {
    let g = path.join(__dirname, '..', '.git');
    if (fs.statSync(g).isFile()) {
      g = path.resolve(path.dirname(g), fs.readFileSync(g, 'utf8').replace(/^gitdir:\s*/, '').trim());
    }
    const head = fs.readFileSync(path.join(g, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) return chuanSha(head);
    const ref = head.slice(4).trim();
    const goc = fs.existsSync(path.join(g, 'commondir'))
      ? path.resolve(g, fs.readFileSync(path.join(g, 'commondir'), 'utf8').trim())
      : g;
    for (const d of [g, goc]) {
      const f = path.join(d, ref);
      if (fs.existsSync(f)) return chuanSha(fs.readFileSync(f, 'utf8').trim());
    }
    const dong = fs
      .readFileSync(path.join(goc, 'packed-refs'), 'utf8')
      .split('\n')
      .find((l) => l.endsWith(` ${ref}`));
    return dong ? chuanSha(dong.split(' ')[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Thời điểm dựng ghi lúc `docker build` (RUN date > .build-time) — dự phòng khi không có biến.
 *
 * OZV-755: trả kèm MÃ LÝ DO khi không lấy được, để phân biệt hai giả thuyết về prod rỗng:
 *  - `khong-co-tep`      → ảnh KHÔNG dựng bằng Dockerfile của repo (nixpacks/buildpack, hoặc Dockerfile khác):
 *                          dòng `RUN ... > /app/.build-time` chưa hề chạy.
 *  - `khong-doc-duoc-tep`→ tệp có nhưng tiến trình không đọc nổi (quyền; `USER node` vs tệp của root).
 *  - `tep-rong` / `tep-sai-dinh-dang` → tệp có, đọc được, nội dung hỏng.
 * Mã là slug thuần chữ thường: không chứa đường dẫn, không chứa tên biến môi trường — /api/health công khai.
 *
 * @param {string} [tep] đường dẫn tệp (mặc định `<repo>/.build-time`) — tham số để test, không lộ ra phản hồi
 * @returns {{ buildTime: string|null, lyDo: string|null }}
 */
function docTepThoiGian(tep) {
  const f = tep || TEP_THOI_GIAN;
  let tho;
  try {
    tho = fs.readFileSync(f, 'utf8');
  } catch (e) {
    return { buildTime: null, lyDo: e && e.code === 'ENOENT' ? 'khong-co-tep' : 'khong-doc-duoc-tep' };
  }
  if (!String(tho).trim()) return { buildTime: null, lyDo: 'tep-rong' };
  const t = chuanThoiGian(tho);
  return t ? { buildTime: t, lyDo: null } : { buildTime: null, lyDo: 'tep-sai-dinh-dang' };
}

/** Có biến trong env nhưng không phải SHA/thời gian hợp lệ ⇒ lỗi cấu hình, khác hẳn "không truyền biến". */
function coBien(e, ten) {
  return ten.some((k) => String(e[k] == null ? '' : e[k]).trim() !== '');
}

let _cache = null;

/**
 * @param {NodeJS.ProcessEnv} [env] biến môi trường (mặc định process.env; truyền khác ⇒ không dùng cache)
 * @param {{ git?: boolean, tep?: string }} [tuyChon] chỉ để test: tắt dự phòng đọc .git (ảnh prod vốn
 *        không có .git, nhưng máy dev thì có — tắt đi mới dựng lại được cảnh prod), đổi đường dẫn tệp.
 * @returns {{ commit: string|null, buildTime: string|null, lyDo?: { commit?: string, buildTime?: string } }}
 */
function banDung(env, tuyChon) {
  const macDinh = env === undefined;
  if (macDinh && _cache) return _cache;
  const e = macDinh ? process.env : env || {};
  const o = tuyChon || {};

  let commit = null;
  for (const k of BIEN_COMMIT) {
    commit = chuanSha(e[k]);
    if (commit) break;
  }
  if (!commit && o.git !== false) commit = shaTuGit();

  let buildTime = null;
  for (const k of BIEN_THOI_GIAN) {
    buildTime = chuanThoiGian(e[k]);
    if (buildTime) break;
  }
  let lyDoTime = null;
  if (!buildTime) {
    const tep = docTepThoiGian(o.tep);
    buildTime = tep.buildTime;
    lyDoTime = buildTime ? null : (coBien(e, BIEN_THOI_GIAN) ? 'bien-sai-dinh-dang' : tep.lyDo);
  }

  const ket = { commit, buildTime };
  const lyDo = {};
  if (!commit) lyDo.commit = coBien(e, BIEN_COMMIT) ? 'bien-sai-dinh-dang' : 'khong-co-bien';
  if (!buildTime && lyDoTime) lyDo.buildTime = lyDoTime;
  if (Object.keys(lyDo).length) ket.lyDo = lyDo;

  if (macDinh) _cache = ket;
  return ket;
}

module.exports = { banDung, chuanSha, chuanThoiGian, docTepThoiGian };
