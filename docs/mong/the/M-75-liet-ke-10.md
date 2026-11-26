# M-75 — Vấn đề chỉ liệt kê được — Chương 10

## Tổng quan
- Tổng số bản ghi: **28** (**17** `CHI_LIET_KE`, **11** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (15/15).
- Dò mở rộng `LUAT` (Luật 4 + regex mới PR #2230): trúng **16** câu, đã có trong `10.jsonl`: **16**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 4: Ghi `CHI_LIET_KE` cho tất cả dòng biểu hạt giống/gieo trồng (`1001.11`, `1001.91`, `1002.10`, `1003.10`, `1004.10`, `1005.10`, `1006.10.10`, `1007.10`, `1008.21`), dùng cho người (`1001.99.1`, `1005.90.91`), ngô rang nổ (`1005.90.10`), thức ăn chăn nuôi (`1006.40.10`, `1001.99.99`), và `nhom:1007:ct:1#1`.
- Luật 1, 2 & 3: Đánh `BO_QUA` cho `chuong:10:kq:2#3` (Luật 2), `1003:ct:1` (công dụng phổ biến), các câu loại trừ M-72 (`1002:ct:2#1`, `1007:ct:2`), định nghĩa sinh học `cgpn:1#1`, và đoạn copy chéo `sen:10064090:1#4`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
