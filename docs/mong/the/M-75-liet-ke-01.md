# M-75 — Vấn đề chỉ liệt kê được — Chương 01

## Tổng quan
- Tổng số bản ghi: **18** (**16** `CHI_LIET_KE`, **2** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (2/2).
- Dò mở rộng `LUAT` (Luật 4 + bổ sung regex mục đích/nhân giống): trúng **16** câu, đã có trong `01.jsonl`: **16**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 4: Đã bổ sung đủ 16 nút mục đích nhập để nhân giống do lời biểu quy định (`0101.21`, `0101.30.10`, `0102.21`, `0102.31`, `0102.90.10`, `0103.10`, `0104.10.10`, `0104.20.10` thuần chủng để nhân giống; `0105.11.10`–`0105.15.10`, `0105.94.10`, `0105.99.10`, `0105.99.30` để nhân giống); bỏ qua 4 nút con 8 số trùng tên tổ tiên (`0101.21.00`, `0102.21.00`, `0102.31.00`, `0103.10.00`) theo `kiemTrungTenToTien`.
- Luật 3: `chuong:01:kq:2#1` và `chuong:01:kq:6#1` (M-72) đánh `BO_QUA`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
