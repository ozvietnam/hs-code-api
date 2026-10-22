# TIEN-TRINH — lô 016 (soạn sổ tay chú giải)

Nhóm của lô: **5808, 6214, 6216, 6809, 6909, 7314**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-016` @ `400298a` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `5808,6214,6216,6809,6909,7314` — **khớp** CSV dòng `016`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu, chốt
nhóm theo CSV. Cập nhật CSV dòng 016 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `build-so-tay.mjs --nhom=5808,6214,6216,6809,6909,7314 --xuat-nguon=tmp/so-tay/nguon`
  → **cả 6 nhóm đều phải dựng** (không có nhóm nào có sẵn từ lô trước). 200.722 ký tự nguồn.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn**. Đọc `lib/so-tay.js`
  trước khi soạn để biết luật máy nào lọc mục nào. In cây `lib/hs-tree.js` cho cả 6 nhóm.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 6 nhóm — 118 mục.
- [x] **B5.** `check-so-tay.mjs --raw` chạy **6 lần** (xem dưới). Thêm **kiểm tra nguyên văn TUYỆT ĐỐI**
  (`tmp/so-tay/kiem-nguyen-van.mjs`, không bỏ dấu câu, giữ hoa/thường và ngoặc kép) — **0 sai / 118 mục**
  sau 2 lần sửa. Tự soát bằng mắt theo 14 kiểu lỗi mục 0 — sửa 3 mục thêm (xem dưới).
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-016.json`
  → **118/118 (100 %)**, 0 nhóm lỗi.
- [x] **B7.** `check-cay.mjs --chi-tiet` → **0 lỗi lệch cây**, 5/6 nhóm "đủ" (6809 còn 1 cảnh báo xem dưới).
  `npm run so-tay:check` → **233 nhóm / 7615 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push nhánh `so-tay/lo-016` + mở PR (**KHÔNG merge**).

## Kết quả

| nhóm | mục | đạt | ghi chú |
|---|---|---|---|
| 5808 | 23 | 23 | 2 điều kiện vào · 12 loại trừ · 2 câu hỏi phân biệt · 2 tiêu chí 6 số · 4 dòng 8 số |
| 6214 | 23 | 23 | 1 điều kiện vào (60 cm) · 5 loại trừ · 2 câu hỏi phân biệt · 5 tiêu chí 6 số · 9 dòng 8 số |
| 6216 | 10 | 10 | 1 điều kiện vào · 2 loại trừ · 2 câu hỏi phân biệt · 4 dòng 8 số — **nguồn mỏng nhất lô** |
| 6809 | 15 | 15 | 1 điều kiện vào · 5 loại trừ · 1 câu hỏi phân biệt · 2 tiêu chí 6 số · 5 dòng 8 số |
| 6909 | 18 | 18 | 1 điều kiện vào · 6 loại trừ · 2 câu hỏi phân biệt · 4 tiêu chí 6 số · 4 dòng 8 số |
| 7314 | 29 | 29 | 2 điều kiện vào · 2 loại trừ · 2 câu hỏi phân biệt · 11 tiêu chí 6 số · 11 dòng 8 số |
| **Tổng** | **118** | **118 (100 %)** | 8 điều kiện vào · 32 loại trừ · 11 câu hỏi phân biệt · 24 tiêu chí 6 số · 37 dòng 8 số · 0 `boPhan` |

## Máy loại

Lần 1–6 của `check-so-tay --raw` chỉ bắt **3 lỗi hình thức** (xem dưới); **không mục nào bị máy loại
vì sai nghĩa**. Các sửa đổi:

| # | Lỗi | Xử lý |
|---|---|---|
| 1 | `fact` chứa chữ hoa (`…thang_Mohs`) — `lib/so-tay.js` đòi slug `[a-z0-9_]` | hạ chữ thường (`mohs`) |
| 2 | `trich` 7314 viết `trong chương này…` (chữ t thường) trong khi nguồn là `Trong chương này…` | sửa hoa/thường — máy **không** bắt (memory `check-so-tay-squash-mat-ky-tu`) |
| 3 | `trich` 6216 có khoảng trắng quanh dấu lược `…` làm đoạn lệch nguyên văn | bỏ khoảng trắng thừa |

## Tự soát mắt — 3 mục sửa thêm (máy không bắt được)

1. **6909 `loaiTru` 8546|8547**: `trich` bắt đầu giữa câu (`cũng như các bộ phận…`) nên mất chủ ngữ →
   trích trọn câu `(f) Các thiết bị điện … thuộc các nhóm 85.46 hoặc 85.47.` Dải "85.33 đến 85.38"
   vẫn nằm trong trích nhưng **không** ghi `loaiTru` (luật 3: dải không phải đích danh).
2. **7314 `dong8` 73141910**: `dieuKien` có "đai liền dùng cho máy móc" nhưng `trich` WCO không nói →
   chuyển sang `nguon: tax.73141910` (dòng biểu thuế nói đủ cả hai vế). `dong8` 73141990 bỏ vế
   "trừ loại đai liền dùng cho máy móc" vì câu trích WCO không có.
3. **6909 `phamVi`**: bỏ dấu lược `…` vì hai câu nằm liền nhau (lược là vô nghĩa và che mất câu).

## Nguồn mỏng / bất thường (báo lại người duyệt)

- **6216 — nguồn mỏng nhất lô.** Chú giải nhóm chỉ có 5 câu: "mọi loại chất liệu dệt (kể cả hàng ren)
  trừ dệt kim hoặc móc", tham chiếu chéo `Chú giải chi tiết nhóm 61.16` (**không nằm trong bộ nguồn
  của lô nên không trích được**), và "găng tay bảo vệ trong công nghiệp". Không có `sen.*`, không có
  `tieuChi6` (cây 6216 không có nút 6 số nào), không có `boPhan` → chỉ ghi được 10 mục.
  → **Gợi ý cho người duyệt**: mở rộng `sourcesFor` để kéo chú giải 61.16 cho 6216 sẽ làm nhóm này đầy hơn.
- **6214 — dòng 8 số batik không có nguồn SEN.** 4 dòng `…10` ghi "Được in bằng phương pháp batik
  truyền thống (SEN)" nhưng `data/sen-2022.json` **không có mục nào cho 6214** (đã kiểm: 6 mục SEN
  của Chương 62 đều không chạm 6214). Vì vậy 4 dòng batik trích `tax.<8 số>`, còn 5 dòng "Loại khác"
  trích `wco.<6 số>` — vật liệu của dòng batik **không** ghi vào `dieuKien` (trích không nói), để
  `tieuChi6` cấp 6 số bù lại. Cần người duyệt xác nhận cách chia này.
- **6214 — kệ sách tự mâu thuẫn về ngưỡng 60 cm.** Chú giải chương 62 mục 8: "không có cạnh nào **trên**
  60 cm → 62.13; khăn tay có cạnh **trên** 60 cm → 62.14". Chú giải nhóm 6214 mục (d): "khăn quàng cổ
  vuông **không có cạnh quá** 60 cm → 62.13" (tức ≤ 60 cm, lệch 1 cm ở ranh giới). Sổ tay ghi cả hai
  câu **nguyên văn** và không tự hoà giải; người khai cần cân nhắc.
- **6909 — thang Mohs có thang mở rộng.** Chú giải phân nhóm 6909.12 ghi thang Mohs mở rộng (bột tan = 1,
  kim cương = 15; nhôm nóng chảy = 12, cacbua silic = 13), trong khi tiêu chí WCO của 6909.12 là
  "≥ 9 trên thang Mohs". `tieuChi6` ghi `≥ 9` theo đúng câu WCO; **không** thêm ghi chú thang mở rộng
  (khác nguồn, ghép câu xa nhau).
- **5808 mục (g)** — câu nguồn kết bằng "(nhóm 83.08 hoặc 96.06 **tùy từng trường hợp**)". Luật máy
  `loai-tru-chi-la-thuong` loại mục đó, nên chỉ ghi nhánh **khóa kéo → 96.07** (câu trích tự nói đủ);
  nhánh móc/mắt cài/bấm nén **bị bỏ** có chủ đích.
- **6809 — 1 cảnh báo `check-cay`**: `phan-nhom-chua-co-tieu-chi:680990`. Tên WCO của 680990 là
  "n.e.c. in heading no. 6809" — **không có tiêu chí phân biệt** để ghi; đây là phân nhóm gom, không
  sửa được mà không bịa. Không phải lỗi (`loi=0`).
- **Không nhóm nào có `sen.*`** trong lô này → `phienBan` của cả 6 nhóm là `HS2022`.

## Mục `dieuKien` ghi thêm chữ ngoài câu trích

**Không có mục nào** — mọi `dieuKien`/`text` chỉ diễn đạt đúng điều câu trích nói. Ba chỗ dễ
nghi đã rà lại và sửa hoặc bỏ:
- 7314 `dong8` 73141910/73141990 (xem mục 2 ở trên),
- 6216 `dong8` 62160099: `dieuKien` chép lại đúng câu định nghĩa nhóm, không thêm "khác",
- 6214 4 dòng batik: `dieuKien` chỉ ghi "Được in bằng phương pháp batik truyền thống (SEN)",
  **không** ghi vật liệu vì câu trích biểu thuế không nói.

## Ghi chú khác

- `cay.tenDien` để TRỐNG cả 6 nhóm: mọi nút ảo đã có tên từ biểu thuế (kể cả tiêu đề quốc gia
  `6216009` = "Loại khác"), và hai phân nhóm 6 số thiếu tên tiếng Việt (`680919`, `731419`) chỉ có
  tên **tiếng Anh** trong nguồn WCO — dịch sang tiếng Việt là "thêm hiểu biết riêng" (luật 7), nên bỏ.
- `trich` dài nhất lô: **335 ký tự** (`phamVi` 6909, hai câu nguyên văn liền nhau). Vượt mốc mềm 300
  của lược đồ nhưng dưới trần 600 của máy; cắt bớt sẽ mất chính câu loại trừ "sản phẩm chịu lửa
  được thiết kế chịu nhiệt độ cao" — cắt trích để né câu rào đúng kiểu lỗi mà người duyệt phải bắt.