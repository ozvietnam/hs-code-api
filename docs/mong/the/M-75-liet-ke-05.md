# M-75 — Vấn đề chỉ liệt kê được — Chương 05

## Tổng quan
- Tổng số bản ghi: **27** (**12** `CHI_LIET_KE`, **15** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (20/20).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích/nhân giống): trúng **8** câu, đã có trong `05.jsonl`: **8**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho điều kiện công dụng trên biểu (`05.02`, `0505.10`, `05.10`, `05.11`) và các ranh giới thực phẩm vs công nghiệp/mồi câu/dược phẩm trong chú giải `05.05`, `05.10`, `05.11`.
- Luật 1, 2 & 3: Đánh `BO_QUA` cho `bieu:0505#1` ("đã hoặc chưa cắt tỉa"), mô tả công dụng minh hoạ thông thường (`0504:ct:7`, `0506:ct:1`, `0508:ct:7`, `0510:ct:5`), và các câu loại trừ M-72 sang `96.03`, `30.01`, `30.02`, Chương 2/3.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
