# M-75 — Vấn đề chỉ liệt kê được — Chương 08

## Tổng quan
- Tổng số bản ghi: **15** (**2** `CHI_LIET_KE`, **13** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (12/12).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích): trúng **5** câu, đã có trong `08.jsonl`: **5**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho `bieu:0812#1` và `chuong:08:cg:4#1` (điều kiện cốt lõi của nhóm `08.12`: không phù hợp để dùng ngay khi ở dạng bảo quản tạm thời).
- Luật 1, 2 & 3: Đánh `BO_QUA` cho `0808:ct:1#1` (mọi mục đích đều vào 08.08), mô tả công dụng minh hoạ, câu dẫn `cg:3#1`, và các câu loại trừ M-72 sang Chương 12, `12.11`, `21.01`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
