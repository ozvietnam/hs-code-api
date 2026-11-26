# M-75 — Vấn đề chỉ liệt kê được — Chương 05

## Tổng quan
- Tổng số bản ghi: **28** (**12** `CHI_LIET_KE`, **16** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (20/20).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích/nhân giống/`ăn được`): trúng **7** câu (sau lọc tổ tiên–con), đã có trong `05.jsonl`: **7**, chưa ghi: **0**.

## Rà soát bổ sung theo regex mới (PR #2230 / #2373)
- Bổ sung **1** bản ghi `BO_QUA` (`id: "hs:chuong:05:7501"`): `chuong:05:cg:1:a#1` (mệnh đề loại trừ các sản phẩm ăn được khỏi Chương 5 tại Chú giải 1(a) — thuộc phạm vi M-72).

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho điều kiện công dụng trên biểu (`05.02`, `0505.10`, `05.10`, `05.11`) và các ranh giới thực phẩm vs công nghiệp/mồi câu/dược phẩm trong chú giải `05.05`, `05.10`, `05.11`.
- Luật 1, 2 & 3: Đánh `BO_QUA` cho `bieu:0505#1` ("đã hoặc chưa cắt tỉa"), mô tả công dụng minh hoạ thông thường (`0504:ct:7`, `0506:ct:1`, `0508:ct:7`, `0510:ct:5`), và các câu loại trừ M-72 (`chuong:05:cg:1:a#1`, `cg:1:d#1`, `96.03`, `30.01`, `30.02`, Chương 2/3).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
