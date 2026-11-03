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

| `chatLieu` | giá trị vật liệu tự nhiên gia công: mai rùa, ngà, xương, sừng, san hô, xà cừ | 71179094 "vật liệu khắc từ mai rùa, ngà, xương, sừng, san hô, xà cừ…" — ghi từng phần làm hàng rơi nhầm .99 | #871 |
| `chieuRong` (bằng chứng thêm) | — | 60019220 "băng dính y tế có chiều rộng…" | #880 |
| `loaiXoPha` (bằng chứng thêm) | sợi đàn hồi / sợi cao su / xơ staple | 60019230 "Chứa sợi đàn hồi hoặc sợi cao su" — chatLieu LA 'cao su' sai trục CHỨA ≠ BẰNG | #880 |

Kèm theo: 520859 còn chờ mục bảng hiệu chỉnh tiền lệ L1-4b (`can-bang-hieu-chinh-tien-le`).

## Bổ sung từ studio-loop (02/11, 70 PN6 lát 2 do Gemini soạn, cổng máy kiểm)

Gemini được dặn: không có khoá ⇒ `dieuKienSo: []` + ghi chú `THIEU_KHOA_TU_VUNG` (kèm `khoaDeXuat`). Máy gom từ 73 spec (p1–p3), mỗi dòng là một mục dòng 8 số:

| Loại | Khoá đề xuất | Số mục | Gặp ở (mẫu) | Chữ biểu |
|---|---|---|---|---|
| THIEU_KHOA_TU_VUNG | `phuongPhapIn` | 9 | 620442/62044210; 620432/62043210; 620419/62041911; 620449/62044910 | tax.62044210 "Được in bằng phương pháp batik truyền thống (SEN)" thiếu khoá phương pháp in |
| THIEU_KHOA_TU_VUNG | `tinhDanHoi` | 8 | 600643/60064310; 600642/60064210; 600634/60063410; 600644/60064410 | tax.60064310 "Đàn hồi (kết hợp với sợi cao su)" thiếu khoá tính đàn hồi / kết hợp sợi cao  |
| THIEU_KHOA_TU_VUNG | `loaiSoiDet` | 4 | 630629/63062910; 630619/63061910; 630619/63061920; 630640/63064010 | Từ bông |
| DUNG | `—` | 1 | 701990/701990 | CẦN BẢNG HIỆU CHỈNH TIỀN LỆ — bảng L1-4b chưa có mục cho PN6: DỪNG, Claude giữ |
| THIEU_KHOA_TU_VUNG | `doDay` | 1 | 730830/73083010 | tax.73083010 "có độ dày từ 6 mm đến 8 mm" thiếu khoá đại lượng độ dày doDay (SO, mm) |

Đề xuất gộp với bảng trên: `loaiSoiDet` ≈ `loaiXoPha`/vật liệu dệt (giá trị: bông, xơ tổng hợp, xơ nhân tạo, len/lông động vật mịn, sợi thực vật nhóm 53.05, tơ tằm…); `phuongPhapIn` giá trị `BATIK_TRUYEN_THONG` ≈ `phuongPhapCheTao: IN_BATIK` ở trên — chọn một; `tinhDanHoi` ≈ `loaiXoPha` giá trị `SOI_DAN_HOI_HOAC_CAO_SU` (chữ biểu 6006: "Đàn hồi (kết hợp với sợi cao su)", 6001: "Chứa sợi đàn hồi hoặc sợi cao su"); `doDay` (SO, mm) trùng đề xuất quét. Duyệt 4 khoá này mở lại: 9 PN6 chương 62 (#944–#952), 8 PN6 chương 60 (#953–#960), 3 PN6 6306 (#912–#914), 730830 (#943), cộng #859/#869/#874/#879/#880 của thợ.
