# M-75 — Vấn đề chỉ liệt kê được — Chương 93

## Tổng quan
- Tổng số bản ghi: **40** (**14** `CHI_LIET_KE`, **26** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (38/38).
- Dò mở rộng `LUAT` (Luật 4): trúng **13** câu, đã có trong `93.jsonl`: **13**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 2: Các mục liệt kê minh hoạ (`9301:ct:7`, `9304:ct:3`, `9305:ct:2,6,7,9`, `9306:ct:4,10,14,15`, `9307:ct:1,4`) và câu loại trừ M-72 (`cg:1:b`, `cg:2`, `9305:ct:11–14`, `9306:ct:23,25`) đánh `BO_QUA`; với `9306:ct:9#1` chỉ hỏi tiêu chí `"dùng cho các loại súng phóng lao"` (bỏ cụm hai trạng thái `"có hay không có đầu nổ"`).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
