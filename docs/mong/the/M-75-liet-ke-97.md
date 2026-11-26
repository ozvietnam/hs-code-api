# M-75 — Vấn đề chỉ liệt kê được — Chương 97

## Tổng quan
- Tổng số bản ghi: **10** (**5** `CHI_LIET_KE`, **5** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (6/6).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích): trúng **6** câu (sau lọc tổ tiên–con theo regex skill), đã có trong `97.jsonl`: **6**, chưa ghi: **0**.

## Rà soát bổ sung theo regex mới (PR #2230 / #2373)
- Bổ sung **1** bản ghi: `chuong:97:cg:4#1` (`CHI_LIET_KE`, điều kiện không phải phiên bản sản xuất hàng loạt bằng kỹ năng thông thường phục vụ mục đích thương mại — tương tự `chuong:97:cg:3#1`). `id` mới dạng `hs:<nut>:75NN`.

## Kiểm tra luật M-75
- Luật 1 & 2: `bieu:9704#1` chứa `"đã hoặc chưa sử dụng"` (Luật 2) đánh `BO_QUA`; giữ `CHI_LIET_KE` cho `9705.21`, `9705.22`, định nghĩa thực hiện hoàn toàn bằng tay nhóm `97.02` (`chuong:97:cg:3#1`), điều kiện không hàng loạt thương mại nhóm `97.03` (`chuong:97:cg:4#1`) và điều kiện rõ ràng dùng cho mục đích sưu tập (`9705:ct:24#1`).
- Luật 3: Các câu loại trừ sang `49.06`, `49.07`, `71/97.06` đánh `BO_QUA`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
