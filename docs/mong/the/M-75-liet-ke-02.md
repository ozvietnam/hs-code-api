# M-75 — Vấn đề chỉ liệt kê được — Chương 02

## Tổng quan
- Tổng số bản ghi: **22** (**8** `CHI_LIET_KE`, **14** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (15/15).
- Dò mở rộng `LUAT` (Luật 4 + regex `ăn được`): trúng **7** câu, đã có trong `02.jsonl`: **7**, chưa ghi: **0**.

## Rà soát bổ sung theo regex mới (PR #2230 / #2373)
- Bổ sung **6** bản ghi: `chuong:02:cg:1:b#1` (`BO_QUA`, loại trừ sang 04.10 — M-72) và 5 dòng biểu `bieu:0206#1`, `bieu:0207#1`, `bieu:0208#1`, `bieu:0210#1`, `bieu:02109#1` (`CHI_LIET_KE`, điều kiện «ăn được» do lời biểu đặt — cùng bản chất «thích hợp dùng làm thức ăn cho người»).

## Kiểm tra luật M-75
- Luật 1 & 3: Giữ `CHI_LIET_KE` cho điều kiện thích hợp dùng làm thức ăn cho người (Chương 2, nhóm 02.08) và ngoại lệ mỡ 02.09 dùng cho công nghiệp; các câu loại trừ M-72 sang 05.11/23.01/04.10/Chương 15/41 và danh mục minh hoạ (`0206:ct:1#1`, `kq:6–8`) đánh `BO_QUA`.
- Luật 4: Rà đủ câu `LUAT` khớp regex mở rộng (`ăn được`); `id` mới dạng `hs:<nut>:75NN`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
