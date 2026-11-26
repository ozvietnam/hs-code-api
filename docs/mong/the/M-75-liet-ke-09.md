# M-75 — Vấn đề chỉ liệt kê được — Chương 09

## Tổng quan
- Tổng số bản ghi: **14** (**3** `CHI_LIET_KE`, **11** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (14/14).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích): trúng **0** câu, đã có trong `09.jsonl`: **0**, chưa ghi: **0** (lưu ý `chuong:09:cg:1:ket#1` chứa "đặc tính cơ bản" đã được phủ qua tập kích hoạt).

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho điều kiện "đặc tính cơ bản" hỗn hợp gia vị trong Chú giải 1 (`chuong:09:cg:1:ket#1`) và tiêu chí phân định cùng 1 nhóm vs nhiều nhóm (`kq:14#1`, `kq:15#1`).
- Luật 1 & 3: Đánh `BO_QUA` cho mô tả công dụng ẩm thực/chiết xuất tinh dầu thông thường (`0906`, `0909`, `0910`) và các câu loại trừ M-72 sang `12.11`, `21.06`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
