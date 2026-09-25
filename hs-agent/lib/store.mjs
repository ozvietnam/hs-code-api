// Kho trạng thái JSON ghi nguyên tử (ghi tệp tạm rồi rename) + khóa theo job.
// Không dùng SQLite để không phụ thuộc gì ngoài Node.
import { readFileSync, writeFileSync, renameSync, existsSync, openSync, closeSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { STATE } from './paths.mjs';

export function load(name, fallback) {
  const p = join(STATE, `${name}.json`);
  if (!existsSync(p)) return structuredClone(fallback);
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

export function save(name, value) {
  const p = join(STATE, `${name}.json`);
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  renameSync(tmp, p);
}

/** Khóa độc quyền cho một job; khóa cũ hơn maxAgeMs (tiến trình chết) thì chiếm lại. */
export function lock(job, maxAgeMs = 6 * 3600 * 1000) {
  const p = join(STATE, `${job}.lock`);
  if (existsSync(p)) {
    const age = Date.now() - statSync(p).mtimeMs;
    if (age < maxAgeMs) return null;
    unlinkSync(p);
  }
  try {
    const fd = openSync(p, 'wx');
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
  } catch {
    return null;
  }
  return () => {
    try { unlinkSync(p); } catch { /* đã gỡ */ }
  };
}
