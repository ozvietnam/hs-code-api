# M-75 — Vấn đề chỉ liệt kê được — Chương 97

## Tổng quan
- Tổng số bản ghi: **9** (**4** `CHI_LIET_KE`, **5** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (6/6).
- Dò mở rộng `LUAT` (Luật 4): trúng **5** câu, đã có trong `97.jsonl`: **5**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 2: `bieu:9704#1` chứa `"đã hoặc chưa sử dụng"` (Luật 2) đánh `BO_QUA`; giữ `CHI_LIET_KE` cho `9705.21`, `9705.22`, định nghĩa thực hiện hoàn toàn bằng tay nhóm `97.02` (`chuong:97:cg:3#1`) và điều kiện rõ ràng dùng cho mục đích sưu tập (`9705:ct:24#1`).
- Luật 3: Các câu loại trừ sang `49.06`, `49.07`, `71/97.06` đánh `BO_QUA`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
