# Điều khoản lỗi tách (tầng 2)

Người xếp: `haiku-2026-11-23`. Tệp: `data/luat/dieu-khoan-tang2.json`. Test: `scripts/test-dieu-khoan-tang2.mjs`.
Dữ liệu KHÔNG được sửa cho xanh; các mục dưới đây giữ nguyên, chỉ ghi lại để đối chiếu nguồn.

## (d) Mã 4 chữ số trong `dich` không phải nhóm có thật (7 cảnh báo)

Chỉ số là vị trí trong mảng `dieu-khoan-tang2.json` (không dùng `id` vì `id` bị trùng, xem phần (a)).

| # | id | Mã | Lý do đoán |
|---|----|----|-----------|
| 246 | chuong:25:chu_giai:4 | 2414 | Nguyên văn ghi "nhóm 24.14" (không có nhóm này trong Danh mục). Có thể là lỗi in trong nguồn (lẽ ra 25.14) hoặc tách nhầm. Cần đối chiếu nguồn. |
| 750 | chuong:48:chu_giai_phan_nhom:7 | 1323 | Không phải nhóm: là số trong công thức "Định lượng cơ bản x 13.23 millinewton". |
| 750 | chuong:48:chu_giai_phan_nhom:7 | 9464 | Không phải nhóm: là số trong công thức "... – 94.64" (tiêu chí đo, không phải mã). |
| 1208 | chuong:72:chu_giai_phan_nhom:2g | 9994 | Không phải nhóm: là hàm lượng sắt "tối thiểu 99.94 %". |
| 1284 | phan:84:chu_giai:5g | 8469 | Nhóm có thật (nguyên văn "nhóm 84.69 đến 84.72"), nhưng `chu-giai-heading.json` không có khoá 8469. Lỗi thiếu dữ liệu heading. |
| 1572 | chuong:95:chu_giai_phan_nhom:1e | 9501 | Nhóm có thật (nguyên văn có "[95.01]"), nhưng `chu-giai-heading.json` không có khoá 9501. Chương 95 chỉ có 6 khoá. |
| 1572 | chuong:95:chu_giai_phan_nhom:1e | 9502 | Như trên, nguyên văn có "[95.02]", heading thiếu khoá 9502. |

## (c) Nguyên văn không khớp chú giải chương

0 mục. Không có mục đỏ hoặc cảnh báo ở (c).

## (a) Id trùng (đỏ, chưa sửa)

128 `id` bị trùng, ví dụ `chuong:09:chu_giai:2a` ×2, `chuong:09:chu_giai:2b` ×2, `chuong:48:chu_giai:1` nhiều lần. Lý do đoán: `id` tạo từ cap, gan, vùng, khoản, điểm, nhưng tách bằng máy làm nhiều đoạn mang cùng khoản/điểm (ví dụ đoạn tiếp nối bị tách thành mục riêng). Cần quyết định cách đánh số lại, không sửa tự động ở PR này.
