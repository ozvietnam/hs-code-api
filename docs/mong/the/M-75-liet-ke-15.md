# M-75 Vấn đề chỉ liệt kê được — Chương 15

## Tổng hợp
- Tổng số bản ghi: **41** (**1** `CHI_LIET_KE`, **40** `BO_QUA`).
- Phủ câu kích hoạt: **100%** (37/37 câu kích hoạt).
- Dò mở rộng `LUAT` (regex PR #2230): trúng **4** câu, đã có trong `15.jsonl`: **4**, chưa ghi: **0**.

## Kết quả tự kiểm
- `khuon`: 0 lỗi · Cổng 4/5: 0 lỗi · `kiemPhuLietKe`: 100% · `kiemTrungTenToTien`: 0 lỗi · `test-ho-so-ma`, `test-ho-so-ma-tra`, `test-lop-kho`: đạt.

## Sửa bổ sung theo QT (@21721d27)
- Bổ sung `CHI_LIET_KE` điều kiện ăn được / không ăn được trên lời biểu (Luật 1): `bieu:15029010`, `bieu:1517`, `bieu:1518`, `bieu:15180020`, `bieu:1518003`, `bieu:15180060`; ghi `BO_QUA` cho `chuong:15:cg:1:c#1`.
- Đối soát dò mở rộng mới (gồm `ăn được|không ăn được`): **trúng 11 / đã có 11 / chưa ghi 0**. Tổng bản ghi: **48**.
