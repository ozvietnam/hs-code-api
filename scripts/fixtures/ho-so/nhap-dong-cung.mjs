// Bản nháp ranh giới ĐÔNG CỨNG cho test công cụ số hoá (#577). Test KHÔNG đọc bản nháp sống data/ho-so/ranh-gioi/*.json:
// bản nháp đổi theo L1-4 (soạn lại, duyệt) làm test vỡ oan — main từng đỏ sau #651 đúng vì vậy (sửa ở #656).
// ranh-gioi-7559407/ = bản sao nguyên văn các bản nháp tại commit 7559407 (main sau #681). Test cần bản mới hơn ⇒ thêm thư
// mục đông cứng mới theo commit, không chép đè thư mục cũ.
// Ngoại lệ có chủ đích: scripts/test-cong-ranh-gioi.mjs mục 8 KIỂM DỮ LIỆU (mọi bản nháp đã commit qua cổng 0+3; bản DUYET
// xanh đủ cổng) — đó là kiểm dữ liệu sống, không phải fixture.
import fs from 'fs';
import path from 'path';

export const THU_MUC_DONG_CUNG = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-7559407');
// ranh-gioi-88444a8/ = bản sao nguyên văn tại commit 88444a8 (main sau #646) — vòng 4 (848390, 853641).
export const THU_MUC_DONG_CUNG_88444A8 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-88444a8');
// ranh-gioi-pr/<pn6>-<sha>.json = bản nháp trên nhánh PR của thợ (so-hoa/<pn6>) tại commit <sha>, chưa merge — vòng 4.
// ranh-gioi-b305912/ = bản sao nguyên văn tại commit b305912 (main sau #1092) — 940599 (.10 "Chụp đèn bằng vật liệu dệt"):
// cổng 5 neo vế qua mẫu dùng chung dungMau như cổng 3.
export const THU_MUC_DONG_CUNG_B305912 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-b305912');
// ranh-gioi-38864c8/ = bản sao nguyên văn tại commit 38864c8 (#1137) — 870323 có phạm vi phân nhóm dieuKienNut[870323] (#1109).
export const THU_MUC_DONG_CUNG_38864C8 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-38864c8');
// ranh-gioi-c05a07a/ = bản sao nguyên văn tại commit c05a07a — 870460 (tầng "Loại khác" trần loại anh em), 851140 (dải mã ở tầng cha) cho cổng 1 (#1109).
export const THU_MUC_DONG_CUNG_C05A07A = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-c05a07a');
// ranh-gioi-454e512/ = bản sao nguyên văn tại commit 454e512 (main) — 850432 trước khi khai phanConLai trên "Loại khác, <vế>" (#1109).
export const THU_MUC_DONG_CUNG_454E512 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-454e512');
// ranh-gioi-0519921/ = bản sao nguyên văn tại commit 0519921 (main sau #1146) — 830629, 841590, 220300, 870892 trước đợt sửa bộ máy #1109.
export const THU_MUC_DONG_CUNG_0519921 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-0519921');
// ranh-gioi-71a17e0/ = bản sao nguyên văn tại commit 71a17e0 — 020760 có phạm vi phân nhóm lấy từ wco.020760 (#1109).
export const THU_MUC_DONG_CUNG_71A17E0 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-71a17e0');
// ranh-gioi-b5bf024/ = bản sao nguyên văn tại commit b5bf024 (main sau #1148) — 140490 trước khi khai Q1 khongCoHangThat;
// 730640 (trục số DAC_DIEM) và 721114 (cặp DAC_DIEM cùng trục) trước khi gỡ DỪNG.
export const THU_MUC_DONG_CUNG_B5BF024 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-b5bf024');
// ranh-gioi-8baef5e/ = bản sao nguyên văn tại commit 8baef5e (main sau #1151) — 852910, 870829 (đích lồng), 870850 (cầu chủ động)
// trước khi gỡ DỪNG lô 3.
export const THU_MUC_DONG_CUNG_8BAEF5E = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-8baef5e');
// ranh-gioi-bf788f5/ = bản sao nguyên văn tại commit bf788f5 (main sau #1153) — 981000 (Chương 98), 844331 (máy in kết hợp) trước lô 5.
export const THU_MUC_DONG_CUNG_BF788F5 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-bf788f5');
// ranh-gioi-5174a56/ = bản sao nguyên văn tại commit 5174a56 (main sau #1155) — 984940, 981100, 984943, 984914 (Chương 98) trước lô 6.
export const THU_MUC_DONG_CUNG_5174A56 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-5174a56');
// ranh-gioi-ec27049/ = bản sao nguyên văn tại commit ec27049 (đầu nhánh lô 6, #1158) — 984934, 984935 (bộ phận xe 87.08) trước lô 7; 846599 (HOAC hai phương án cùng khoá congDung); 981820, 981100 (soát #1158).
export const THU_MUC_DONG_CUNG_EC27049 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-ec27049');
// ranh-gioi-16eed39/ = bản sao nguyên văn tại commit 16eed39 (main sau #1172) — 853690, 930630 (tên cụ thể dưới «Loại khác»), 271012 trước lô 9.
export const THU_MUC_DONG_CUNG_16EED39 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-16eed39');
export const THU_MUC_DONG_CUNG_PR = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-pr');
// ranh-gioi-571d7a5/ = bản sao nguyên văn tại commit 571d7a5 (main sau #690) — 871410 dạng HOAC, 845290 (luật tên nguyên văn).
// ranh-gioi-f457a19/ = bản sao nguyên văn tại commit f457a19 (main sau #697, trước soạn lại #699) — 841459 .10 và 950300 .91
// gói liệt kê HOẶC trong một chuỗi (vòng 5, cong3-liet-ke-trong-mot-chuoi).
// ranh-gioi-719cacc/ = bản sao nguyên văn tại commit 719cacc (main sau #699) — 950300 DỪNG (đích "của chúng" ↔ tên tiêu đề tổ
// tiên, vòng 5) + các bản có giá trị chữ tự do chứa dấu phẩy/"hoặc" (ngoại lệ + ca trúng của cong3-liet-ke-trong-mot-chuoi).

/** Bản nháp đông cứng của một PN6 (đối tượng mới mỗi lần gọi — sửa thoải mái). */
export function nhapDongCung(pn6, thuMuc = THU_MUC_DONG_CUNG) {
  return JSON.parse(fs.readFileSync(path.join(thuMuc, `${pn6}.json`), 'utf8'));
}
/** Bản nháp đông cứng lấy từ nhánh PR của thợ (ranh-gioi-pr/<pn6>-<sha>.json). */
export function nhapPr(pn6, sha) {
  return JSON.parse(fs.readFileSync(path.join(THU_MUC_DONG_CUNG_PR, `${pn6}-${sha}.json`), 'utf8'));
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
