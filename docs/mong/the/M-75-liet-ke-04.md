# M-75 — Vấn đề chỉ liệt kê được — Chương 04

## Tổng quan
- Tổng số bản ghi: **21** (**9** `CHI_LIET_KE`, **12** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (8/8).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích/nhân giống/`ăn được`): trúng **10** câu (sau lọc tổ tiên–con theo regex skill), đã có trong `04.jsonl`: **10**, chưa ghi: **0**.

## Rà soát bổ sung theo regex mới (PR #2230 / #2373)
- Bổ sung **2** bản ghi: `bieu:0410#1` (`CHI_LIET_KE`, điều kiện «ăn được» do lời biểu đặt) và `chuong:04:cg:6#2` (`BO_QUA`, loại trừ côn trùng ăn được đã chế biến/bảo quản sang Phần IV — M-72). `id` mới dạng `hs:<nut>:75NN`.

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho `0404.10.11/91` (whey thích hợp cho người), `0407.1` (trứng đã thụ tinh để ấp) + 3 dòng `Để nhân giống` (`0407.11.10`, `0407.19.11`, `0407.19.91`), `chuong:04:cg:2#1` (04.03), `chuong:04:cg:6#1` (04.10) và `bieu:0410#1`.
- Luật 1, 2 & 3: Đánh `BO_QUA` cho `0408:ct:1#3` (cả hai mục đích), `sen:040410*:1#3` (công dụng minh hoạ), các câu lặp chú giải chi tiết và câu loại trừ M-72 sang `05.11`/`0405.90`/Phần IV.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
