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

/** Thời điểm dựng ghi lúc `docker build` (RUN date > .build-time) — dự phòng khi không có biến. */
function thoiGianTuTep() {
  try {
    return chuanThoiGian(fs.readFileSync(TEP_THOI_GIAN, 'utf8'));
  } catch {
    return null;
  }
}

let _cache = null;

/**
 * @param {NodeJS.ProcessEnv} [env] biến môi trường (mặc định process.env; truyền khác ⇒ không dùng cache)
 * @returns {{ commit: string|null, buildTime: string|null }}
 */
function banDung(env) {
  const macDinh = env === undefined;
  if (macDinh && _cache) return _cache;
  const e = macDinh ? process.env : env || {};

  let commit = null;
  for (const k of BIEN_COMMIT) {
    commit = chuanSha(e[k]);
    if (commit) break;
  }
  if (!commit) commit = shaTuGit();

  let buildTime = null;
  for (const k of BIEN_THOI_GIAN) {
    buildTime = chuanThoiGian(e[k]);
    if (buildTime) break;
  }
  if (!buildTime) buildTime = thoiGianTuTep();

  const ket = { commit, buildTime };
  if (macDinh) _cache = ket;
  return ket;
}

module.exports = { banDung, chuanSha, chuanThoiGian };
