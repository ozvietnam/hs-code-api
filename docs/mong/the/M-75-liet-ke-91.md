# M-75 — Vấn đề chỉ liệt kê được — Chương 91

## Tổng quan
- Tổng số bản ghi: **71** (**29** `CHI_LIET_KE`, **42** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (58/58).
- Dò mở rộng `LUAT` (Luật 4): trúng **25** câu, đã có trong `91.jsonl`: **25**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1: Các mục liệt kê minh hoạ trong chú giải chi tiết (`9105:ct:4`, `9106:ct:4,9,13,17,19`, `9111:ct:3`, `9112:ct:3`, `9114:ct:21,25,26`) đánh `BO_QUA`.
- Luật 2: Các dòng/câu chứa cụm bao gồm hai trạng thái (`"có hoặc không lắp kèm bộ phận bấm giờ"`, `"có mặt kính hay không và đã hoàn chỉnh hay chưa hoàn chỉnh"`, `"đã hoặc chưa đánh bóng"`) đánh `BO_QUA`.
- Luật 3: Tiêu đề chương (GIR 1) và các câu loại trừ M-72 (`cg:1:c,e,g`, `9102–9114`) đánh `BO_QUA`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
