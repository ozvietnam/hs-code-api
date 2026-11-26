# M-74 — Ngưỡng số & phân dải anh em — Chương 10

## Tổng quan
- Tổng số bản ghi: **19** (**16** `NGUONG`, **3** `TACH_ANH_EM`, **3** nút nhận `phuDinh`).
- Phạm vi áp dụng: Chương 10 (Ngũ cốc).

## Đối soát rà soát số + đơn vị & `ranh-gioi` (Luật 1–7)
- Các ngưỡng thực chất đến từ chú giải SEN cấp 8 số: `1001.99.99` (gluten tối đa ≤ 2,7% theo `sen:10019999:1#3`), `1005.90.91` (aflatoxin ≤ 20 ppb, độ ẩm ≤ 14%), `1006.20.10` và `1006.30.40` (gạo Hom Mali: dài ≥ 7 mm, tỉ lệ dài/rộng ≥ 3,2 lần, amylose 13–18%), `1006.30.60` (gạo Malys: dài ≥ 7 mm, dài/dày ≥ 3,5 lần, amylose 13,8–15,2%, độ ẩm ≤ 14%, tinh khiết ≥ 92%, nhân vàng ≤ 0,1%, phấn ≤ 3,0%).
- Luật 1 & 2 (`TACH_ANH_EM`): `bieu:10059099` (`phuDinh: ["bieu:10059091"]`), `bieu:10062090` (`phuDinh: ["bieu:10062010"]`), `bieu:1006309` (`phuDinh: ["bieu:10063040", "bieu:10063060"]`).
- Bỏ qua có căn cứ (Luật 4 & 6):
  - `sen:10019999:1#2` ("Loại này **có thể** có các hạt đã nảy mầm và có độ ẩm chiếm trên 12% trọng lượng"): câu mô tả khả năng, không phải điều kiện bắt buộc để ở lại `1001.99.99` (nếu tạo `NGUONG > 12%` sẽ đẩy sai lúa mì thức ăn chăn nuôi có độ ẩm ≤ 12% ra khỏi mã). Đã xoá bản ghi độ ẩm, chỉ giữ ngưỡng `gluten ≤ 2,7%` (`#3`).
  - `chuong:10:cgpn:1#1` (28 nhiễm sắc thể đặc điểm sinh học), `10062010:1#5`/`10063040:1#5` cụm `"và có độ ẩm 14%"` không nêu bất đẳng thức tối đa, `10063050:1#3` ("khoảng 0,09 ppm... khoảng 12 lần"), `nhom:1006:ct:10#1`/`12#2`/`13#3` (ví dụ 1% vitamin, thời gian nấu), `phan:II:cg:1#1` (Chương 10 không có mã dạng viên).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi.
