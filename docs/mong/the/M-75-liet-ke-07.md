# M-75 — Vấn đề chỉ liệt kê được — Chương 07

## Tổng quan
- Tổng số bản ghi: **32** (**21** `CHI_LIET_KE`, **11** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (11/11).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích/giống/để trồng): trúng **21** câu, đã có trong `07.jsonl`: **21**, chưa ghi: **0**.

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho điều kiện mục đích sử dụng của biểu (`0701.10` để làm giống, `0703.10.11/21`, `0703.20.10`, `0703.90.10` củ giống, `0713.*` phù hợp để gieo trồng, `07.11` bảo quản tạm thời nhưng không phù hợp để ăn ngay, `07.12` không chế biến thêm) và chú giải `chuong:07:cg:5#1` (xác nhận `07.12` với `07.11`).
- Luật 2 & 3: Đánh `BO_QUA` cho `bieu:07019010#1` (khoai tây chiên mô tả mặt hàng), `071331:ct:1#2`, `sen:07049020`, `nhom:0709:ct:6#2` (công dụng minh hoạ), `chuong:07:kq:11/16/18` (loại trừ/nhắc lại), `0711:ct:2#1`, `0712:ct:2#1`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
