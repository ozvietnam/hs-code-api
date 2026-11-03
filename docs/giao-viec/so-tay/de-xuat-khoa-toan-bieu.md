# Đề xuất khoá tu-vung@2 — quét TOÀN BIỂU THUẾ (mọi PN6 còn lại)

> Sinh bởi `node scripts/quet-khoa-lat-2.mjs --pn6-file=<danh sách PN6 còn lại>` (1889 PN6 ≥2 dòng 8 số chưa có ranh-giới) ngày 2026-11-03 — quét 1889 PN6 / 5617 mục có tên.
> **Chỉ là đề xuất.** Thêm khoá là việc của L1-3a: Claude/GĐ duyệt, đo lại bench, nâng @2. Khoá được duyệt ⇒ các PN6 dưới mở lại đóng góp được ngay (spec DỪNG chỉ cần điền số).

| Khoá đề xuất | Kiểu | Đơn vị | Số mục | Gặp ở (mẫu) | Ghi chú |
|---|---|---|---|---|---|
| `tocDo` | SO | v/ph | 9 | 846595/84659510, 871160/87116094, 902920/90292010 … | "Máy khoan để sản xuất các tấm mạch in hoặc tấm dây in, có tốc độ quay trên 50.000 vòng/phú" — tốc độ (quạt, băng tải) |
| `duongKinhLapVanh` | SO | inch | 5 | 401120/40112011, 401120/40112012, 401180/4011801 … | "Có chiều rộng không quá 230 mm và lắp vành có đường kính không quá 16 inch (SEN)" — đường kính LẮP VÀNH lốp — khác duongKinh (đường kính ngoài) |
| `apSuat` | SO | bar | 4 | 902620/90262050, 930400/93040010, 984937/984937~r19857 … | "Máy đo áp suất sử dụng cho xe có động cơ" — áp suất làm việc |
| `nhietDo` | SO | °C | 1 | 902519/90251911 | "Máy đo nhiệt độ dùng cho xe có động cơ" — nhiệt độ (lò, thiết bị) |


## Đính chính sau khi đối chiếu @2 hiện hành (03/11)

- `duongKinhLapVanh` — **RÚT LẠI**: lô 6 đã có `duongKinhVanh` (cachDoc khớp "lắp vành có đường kính"). Nhóm lốp 4011 mở khoá hoàn toàn bằng `chieuRong` (đã duyệt) + `duongKinhVanh`.
- `apSuat`, `nhietDo` — **KHÔNG thêm**: chữ biểu là "Máy **đo** áp suất/nhiệt độ dùng cho xe có động cơ" (9025/9026) — đó là CÔNG DỤNG, khoá `congDung` có sẵn xử được; không phải ngưỡng số.
- Chỉ thêm: **`tocDo`** (SO, v/ph — "tốc độ quay trên 50.000 vòng/phút" 846595, 871160, 902920).
