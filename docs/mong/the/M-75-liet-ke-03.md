# M-75 — Vấn đề chỉ liệt kê được — Chương 03

## Tổng quan
- Tổng số bản ghi: **41** (**32** `CHI_LIET_KE`, **9** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (24/24).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích/nhân giống/bán lẻ): trúng **21** câu, đã có trong `03.jsonl`: **21**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho `03.09`, điều kiện chế biến bộ phận giáp xác/thân mềm/thủy sinh (`03.05–03.09`), 11 nút mục đích nhân giống trên biểu (`0301.93/99`, `0306.31/32/35/36.1`) + 7 điều kiện chứng nhận SEN tương ứng, và 6 nút đóng bao bì kín khí để bán lẻ (`0306.91.2–0306.99.2`).
- Luật 3: Các câu loại trừ M-72 sang Chương 5, 16.04, 16.05, 23.01 đánh `BO_QUA`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
