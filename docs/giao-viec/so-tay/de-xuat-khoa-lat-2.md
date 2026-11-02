# Đề xuất khoá tu-vung@2 từ tiền quét lát 2

> Sinh bởi `node scripts/quet-khoa-lat-2.mjs` ngày 2026-11-02 — quét 100 PN6 / 207 mục có tên.
> **Chỉ là đề xuất.** Thêm khoá là việc của L1-3a: Claude/GĐ duyệt, đo lại bench, nâng @2. Khoá được duyệt ⇒ các PN6 dưới mở lại đóng góp được ngay (spec DỪNG chỉ cần điền số).

| Khoá đề xuất | Kiểu | Đơn vị | Số mục | Gặp ở (mẫu) | Ghi chú |
|---|---|---|---|---|---|
| `chieuRong` | SO | mm | 5 | 401120/4011201, 401120/40112011, 401120/40112012 … | "Chiều rộng không quá 450 mm" — bề rộng hàng (lốp 4011, vải, giấy, phim) |
| `duongKinhLapVanh` | SO | inch | 5 | 401120/40112011, 401120/40112012, 401180/4011801 … | "Có chiều rộng không quá 230 mm và lắp vành có đường kính không quá 16 inch (SEN)" — đường kính LẮP VÀNH lốp — khác duongKinh (đường kính ngoài) |
| `doDay` | SO | mm | 1 | 730830/73083010 | "Cửa ra vào, có độ dày từ 6 mm đến 8 mm" — độ dày tấm/lá/que (nhựa 39, thép 72-73) |

## Giá trị thiếu phát hiện từ PR DỪNG thật (02/11, bổ sung sau khi quét)

Quét ở trên chỉ thấy khoá thiếu; chạy thật còn lộ **giá trị thiếu của khoá đã có**:

| Khoá | Giá trị thiếu | Chữ biểu gặp | Nguồn PR |
|---|---|---|---|
| `nhienLieu` | `RAN` (nhiên liệu rắn) | 73211910 "dùng nhiên liệu rắn"; 732190 "bếp than" | #859, #869 |
| `nhienLieu` | `KHI` (nhiên liệu khí) | tiêu đề 7321902 "dùng nhiên liệu khí" | #869 |
| `phuongPhapCheTao` | `EP` (dập hoặc ÉP — khác EP_PHUN) | 73219021 "dập hoặc ép" | #869 |
| `phuongPhapCheTao` | `IN_BATIK` hoặc tương đương | 52085910 "in batik truyền thống" | #874 |
| `phuongPhapCheTao` | `LAP_RAP_BANG_KHOP_NOI` (lắp ráp bằng khớp nối) | 730810/730820 "được lắp ráp bằng các khớp nối (SEN)" — cái chính phân biệt với dòng 'Loại khác' | #858, #864 |

| `loaiCaoSu` (khoá MỚI) | tự nhiên / khác | 401512/401519 "cao su tự nhiên lưu hóa" ↔ "cao su lưu hóa khác" — chatLieu chỉ có 'cao su' chung, mượn là rộng hơn chữ | #860, #866 |
| `loaiXoPha` (khoá MỚI) | thành phần pha sợi | 55159910 "Pha chủ yếu hoặc pha duy nhất với lông cừu hoặc lông động vật loại mịn" | #879 |

Kèm theo: 520859 còn chờ mục bảng hiệu chỉnh tiền lệ L1-4b (`can-bang-hieu-chinh-tien-le`).
