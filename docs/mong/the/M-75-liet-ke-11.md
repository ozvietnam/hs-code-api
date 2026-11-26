# M-75 — Vấn đề chỉ liệt kê được — Chương 11

## Tổng quan
- Tổng số bản ghi: **11** (**0** `CHI_LIET_KE`, **11** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (9/9).
- Dò mở rộng `LUAT` (Luật 4 + regex mới PR #2230): trúng **2** câu, đã có trong `11.jsonl`: **2**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 3: Toàn bộ các câu khớp trong Chương 11 đều thuộc mô tả công dụng phổ biến của bột/gluten (`1101`, `1102`, `1106`, `1109`), dẫn giải định nghĩa `chuong:11:cg:3#1`, hoặc câu loại trừ M-72 sang `09.01`, `19.01`, `21.01`, `35.06`, `38.09` → đánh `BO_QUA` có lý do rõ ràng.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
