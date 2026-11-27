# M-75 — Vấn đề chỉ liệt kê được — Chương 89

## Tổng quan
- Tổng số bản ghi: **19** (**7** `CHI_LIET_KE`, **12** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt (ngoài `phan:XVII` đã xử lý tại `XVII.jsonl`): **100%**.
- Dò mở rộng `LUAT` (Luật 4): trúng **5** câu, đã có trong `89.jsonl`: **5**, chưa ghi: **0** (`bieu:8902#1`, `bieu:8903#1`, `bieu:890312#1`, `bieu:8906#1`, `chuong:89:cg:1#1`).

## Kiểm tra luật M-75
- Luật 1 & 2: Mục liệt kê minh hoạ (`8903:ct:2#1`, `8906:ct:5,11,16`) và cụm bao gồm cả hai trạng thái `"chuyên hoặc không chuyên dùng"` (`8901:ct:7#1`) đánh `BO_QUA`; giữ `CHI_LIET_KE` cho điều kiện đặc trưng cơ bản `chuong:89:cg:1#1` (`-> 89.06`) và `kq:6#1`, cùng công dụng luật định (`8902`, `890312`, `8903:ct:1#1`, `8904:ct:3#1`, `8906:ct:6#1`).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi.
- `cong.mjs` Cổng 3, 4, 5: 0 lỗi.
- `liet-ke-test.mjs`, `test-ho-so-ma.mjs`, `test-ho-so-ma-tra.mjs`, `test-lop-kho.mjs`, `kiem-pham-vi-the.mjs`: ĐẠT.
