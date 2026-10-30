// Bản nháp ranh giới ĐÔNG CỨNG cho test công cụ số hoá (#577). Test KHÔNG đọc bản nháp sống data/ho-so/ranh-gioi/*.json:
// bản nháp đổi theo L1-4 (soạn lại, duyệt) làm test vỡ oan — main từng đỏ sau #651 đúng vì vậy (sửa ở #656).
// ranh-gioi-7559407/ = bản sao nguyên văn các bản nháp tại commit 7559407 (main sau #681). Test cần bản mới hơn ⇒ thêm thư
// mục đông cứng mới theo commit, không chép đè thư mục cũ.
// Ngoại lệ có chủ đích: scripts/test-cong-ranh-gioi.mjs mục 8 KIỂM DỮ LIỆU (mọi bản nháp đã commit qua cổng 0+3; bản DUYET
// xanh đủ cổng) — đó là kiểm dữ liệu sống, không phải fixture.
import fs from 'fs';
import path from 'path';

export const THU_MUC_DONG_CUNG = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-7559407');

/** Bản nháp đông cứng của một PN6 (đối tượng mới mỗi lần gọi — sửa thoải mái). */
export function nhapDongCung(pn6) {
  return JSON.parse(fs.readFileSync(path.join(THU_MUC_DONG_CUNG, `${pn6}.json`), 'utf8'));
}

/**
 * Gieo bản nháp (mặc định bản đông cứng) vào thư mục ghi của test (HS_DATA_DIR) để CLI scripts/so-hoa-ranh-gioi.mjs đọc nó
 * thay vì bản sống (lib/data-paths.js#dataReadPath ưu tiên HS_DATA_DIR). Cần import scripts/test-isolate-data.mjs trước.
 */
export function gieoNhap(pn6, b = nhapDongCung(pn6)) {
  if (!process.env.HS_DATA_DIR) throw new Error('gieoNhap cần HS_DATA_DIR (import scripts/test-isolate-data.mjs ở dòng đầu)');
  const p = path.join(process.env.HS_DATA_DIR, 'ho-so', 'ranh-gioi', `${pn6}.json`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(b, null, 2));
  return p;
}
