// lib/static-export.js — Ranh giới an toàn của bộ dữ liệu tĩnh.
//
// Tách khỏi scripts/build-static.mjs để TEST ĐƯỢC mà không phải sinh 14.000 file
// / 75 MB mỗi lần chạy npm test. Đây là chỗ giữ ba thứ dễ sai và sai thì đắt:
//   1. Chỉ xuất thứ nằm trong allowlist công khai (lib/public-access.js)
//   2. Danh sách CỐ Ý bỏ, kèm lý do
//   3. Trần kỹ thuật của nơi lưu trữ

const { PUBLIC_ENDPOINTS, PUBLIC_DATASET_RESOURCES } = require('./public-access');

// Trần Cloudflare Pages bản free (tra tài liệu 2026-09):
//   20.000 file mỗi lần deploy · 25 MiB mỗi file.
// Vượt trần thì hỏng lúc deploy — lúc đó mới biết là muộn, nên chặn từ build.
const MAX_FILES = 20000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * CỐ Ý KHÔNG XUẤT, dù allowlist cho phép.
 * Bỏ bớt thì mất tính năng, xuất nhầm thì không thu hồi được — chọn hướng sai
 * an toàn. Ghi lý do để người sau không mở nhầm, và để chính mình còn nhớ.
 */
const OMITTED = {
  products:
    'Corpus 11.072 tên sản phẩm lấy từ Shopee/Taobao. Quyền phát hành CHƯA được rà ' +
    '(việc L-4, mức P0 trong docs/backlog). Đưa lên CDN là phát tán rộng và không ' +
    'thu hồi được — rà xong quyền rồi mới xuất.',
};

/**
 * Chặn tại chỗ nếu xuất thứ không nằm trong allowlist công khai.
 * @param {string} source Dạng "endpoint:<tên>" hoặc "dataset:<resource>"
 * @throws {Error} nếu không được phép công khai
 */
function assertPublicSource(source) {
  const raw = String(source ?? '');
  const idx = raw.indexOf(':');
  const kind = idx === -1 ? '' : raw.slice(0, idx);
  const name = idx === -1 ? '' : raw.slice(idx + 1);

  const ok =
    (kind === 'endpoint' && PUBLIC_ENDPOINTS.has(name)) ||
    (kind === 'dataset' && PUBLIC_DATASET_RESOURCES.has(name));

  if (!ok) {
    throw new Error(
      `TỪ CHỐI XUẤT "${raw}": không nằm trong allowlist lib/public-access.js. ` +
      'Muốn xuất thì khai công khai ở đó trước — đừng sửa riêng build script.',
    );
  }
  return true;
}

/** Kiểm hai trần trước khi deploy. Trả mảng lỗi (rỗng = đạt). */
function checkLimits({ fileCount, largestFileBytes, largestFilePath } = {}) {
  const errors = [];
  if (largestFileBytes > MAX_FILE_BYTES) {
    errors.push(
      `File "${largestFilePath}" nặng ${(largestFileBytes / 1048576).toFixed(1)} MB, vượt trần ` +
      '25 MiB/file của Cloudflare Pages. Chia nhỏ tài nguyên này trước khi deploy.',
    );
  }
  if (fileCount > MAX_FILES) {
    errors.push(
      `Sinh ra ${fileCount} file, vượt trần ${MAX_FILES} file/deploy của Cloudflare Pages bản ` +
      'free. Gom một nhóm tài nguyên theo nhóm 4 số (xem cách làm ở phần chuỗi chú giải) ' +
      'thay vì tách từng mã.',
    );
  }
  return errors;
}

module.exports = { MAX_FILES, MAX_FILE_BYTES, OMITTED, assertPublicSource, checkLimits };
