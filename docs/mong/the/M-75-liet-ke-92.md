# M-75 — Vấn đề chỉ liệt kê được — Chương 92

## Tổng quan
- Tổng số bản ghi: **22** (**8** `CHI_LIET_KE`, **14** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (14/14).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích/`để làm`): trúng **11** câu (sau lọc tổ tiên–con theo regex skill), đã có trong `92.jsonl`: **11**, chưa ghi: **0**.

## Rà soát bổ sung theo regex mới (PR #2230 / #2373)
- Bổ sung **1** bản ghi: `chuong:92:cg:1:d#1` (`BO_QUA`, loại trừ chổi để làm sạch nhạc cụ sang nhóm 96.03 — M-72). `id` mới dạng `hs:<nut>:75NN`.

## Kiểm tra luật M-75
- Luật 1 & 3: Các mục liệt kê minh hoạ bộ phận đàn/trống và mô tả ứng dụng thông thường (`9208:ct:6`, `9209:ct:5,6,29,36`) đánh `BO_QUA`; các câu loại trừ sang Phần XV/Chương 39/85/96.02/96.03 đánh `BO_QUA`; giữ `CHI_LIET_KE` cho điều kiện cần kéo/lưỡi gà/bộ phận/phụ kiện (`920210`, `92059010`, `9209`, `920991–94`, `cg:2#1–2`).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
