# M-75 — Vấn đề chỉ liệt kê được — Chương 12

## Tổng quan
- Tổng số bản ghi: **45** (**21** `CHI_LIET_KE`, **24** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (35/35).
- Dò mở rộng `LUAT` (Luật 4 + regex mới PR #2230): trúng **19** câu, đã có trong `12.jsonl`: **19**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 4: Ghi `CHI_LIET_KE` cho các dòng biểu hạt giống/gieo trồng (`1201.10`, `1202.30`, `1207.10.10` + giấy xác nhận SEN `sen:12071010:1#1`, `1207.21`, `12.09`, `1209.2`, `1209.30`, `1212.93.10`), mục đích dược phẩm/nước hoa/thuốc trừ sâu/nhuộm (`12.11`, `1211.90.1`, `1212.29.1`, `1212.29.11`), thức ăn cho người/gia súc (`12.12`, `1212.21`, `12.14`) và chú giải `1203:ct:1#1`, `1211:ct:1/2`, `1212:ct:16#1`, `1214:ct:2#1`.
- Luật 1, 2 & 3: Đánh `BO_QUA` cho cụm từ dẫn giải chú giải (`cg:3#1`, `cg:5#1`, `cgpn:1#1`), Luật 2 (`cg:3#2`, `kq:2#1`, `1214:ct:2#2`), mô tả công dụng phổ biến/sinh học (`1210`, `1212:ct:2/12`, `sen:12119095`), và các câu loại trừ M-72.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
