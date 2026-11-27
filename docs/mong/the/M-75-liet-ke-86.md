# M-75 — Vấn đề chỉ liệt kê được — Chương 86

## Tổng quan
- Tổng số bản ghi: **45** (**14** `CHI_LIET_KE`, **31** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt (ngoài `phan:XVII` đã xử lý tại `XVII.jsonl`): **100%**.
- Số câu `LUAT` rà soát mở rộng `/dùng|sử dụng|phù hợp|thích hợp|bộ phận|chưa lắp ráp|chưa hoàn chỉnh|chưa hoàn thiện|đặc trưng cơ bản|ở dạng bộ/i` (Luật 4): **11/11** câu `LUAT` đã được xét và ghi đủ vào `86.jsonl` (gồm `bieu:8603#1`, `8604#1`, `8605#1`, `8606#1`, `8607#1`, `86071#1`, `860719#1`, `8608#1`, `8609#1`, `chuong:86:cg:2:a#1`, `chuong:86:cg:2:d#2`).

## Kiểm tra luật M-75
- Luật 1: Các mục liệt kê minh hoạ trong chú giải chi tiết (86.02, 86.04, 86.05, 86.06, 86.07) được đánh `BO_QUA`; giữ `CHI_LIET_KE` cho điều kiện công dụng/bộ phận luật định (`86.03–86.09`, `8607.19`, `chuong:86:cg:2:a#1`, `cg:2:d#2`, `8607:ct:2#1`, `kq:11#1`, `kq:16#1`).
- Luật 2 & 3: Tiêu đề chương `bieu:86#1`, `chuong:86#1` (GIR 1) và các câu loại trừ M-72 (86.08, 86.09, Phần XVII) đánh `BO_QUA`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi.
- `cong.mjs` Cổng 3, 4, 5: 0 lỗi.
- `liet-ke-test.mjs`, `test-ho-so-ma.mjs`, `test-ho-so-ma-tra.mjs`, `test-lop-kho.mjs`, `kiem-pham-vi-the.mjs`: ĐẠT.
