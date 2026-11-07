# Phân tích 46 PN6 DỪNG "không phủ kín" — issue #1109

## Phân loại tổng quát

| Loại | Số | Mô tả | Xử lý |
|---|---|---|---|
| **B — Khoảng trống thật** | 18 | Biểu thuế không có "Loại khác" hoặc khoảng hở do tầng không mã | Ghi vùng hở, không sửa |
| **C — Biên số thực (epsilon)** | 14 | Vector sinh biên ±1e-6 (149.99985, 4999.995...) rơi ngoài mọi nhánh | Cần công cụ: bỏ epsilon khi biên đẹp |
| **A — Lỗi soạn spec** | 8 | Điều kiện chưa đủ hoặc khoá sai | Sửa spec được |
| **A2 — Chương 98 đặc biệt** | 6 | Chương 98 (984xxx) — cấu trúc phépgregation khác thường | Xử lý riêng #1111 |

## Chi tiết từng PN6

### Loại B — Khoảng trống thật của biểu (18 PN6)
| PN6 | Vùng hở | Ví dụ hàng rơi vào hở |
|---|---|---|
| 020760 | daChatManh=true + phuongPhapBaoQuan=SONG không có nhánh nhận | Thịt da mực sống tươi (không đông lạnh, không đã nấu) |
| 030633 | Ghẹ xanh sống (không DONG_LANH, không tenLoai cụ thể) | Ghẹ xanh tươi chưa phân loại |
| 030639 | Mực các loại sống, không DONG_LANH | Mục tươi không phân loai |
| 030742 | Mực nang — không có nhánh "loại khác" cho mực nang | Mực nang chế biến khác |
| 030749 | Mực nang — tương tự 030742 | |
| 080450 | Xoài sống chưa đóng gói (dongGoiBanLe=false) | Xoài tươi rời |
| 300410 | Penicillin G KHÔNG chứa penicillin (chuaPenicillin=false) — biểu không có dòng cho | Penicillin G thô chưa tinh chế |
| 321290 | Ván sợi dày, không phải sản phẩm (dungCho=sản xuất) | Ván sợi thô bán thành phẩm |
| 610520 | Loại sợi det BONG — không có nhánh "loại khác" cho BONG | Sợi bông thuộc 6105 khác |
| 842490 | Bộ phận cho 8424.20.11 — biểu không nói gì khác | Chi tiết khác của máy in 8424 |
| 870600 | Xe ô tô — khoảng hở giữa các nhánh động cơ | Ô tô lai không phân loại |
| 870891 | Nút xả (laBoPhan=false) — không có nhánh "loại khác" nút xả | Nút xả rời không lắp |
| 871690 | Dùng cho 8716.20 — không có "loại khác" | Trailer khác |
| 901310 | Kính viễn vọng vũ khí — không có "loại khác" | Kính ngắm khác |
| 984932 | Bóng đèn ha-lo-gien không laBoPhan | Bóng đèn bán rời |
| 984937 | Đồng hồ lưu lượng — không có "loại khác" | Đồng hồ khác |
| 984940 | Miếng lót — không có "loại khác" | Miếng lót khác |
| 984912 | Chỉ dùng cho ô tô con — khoảng hở giữa con/xe tải | Phụ tùng xe con khác |

### Loại C — Biên số thực / epsilon (14 PN6)
| PN6 | Biên gặp lỗi | Giá trị vector | Biến |
|---|---|---|---|
| 480100 | chieuKiaTo 149.99985, chieuRong 279.99972 | 150±ε, 280±ε | chieuKiaTo, chieuRong |
| 854460 | dienAp 999.999 | 1000±ε | dienAp |
| 870323 | dungTichXiLanh 1499.9985 | 1500±ε | dungTichXiLanh |
| 870332 | dungTichXiLanh 1499.9985 | 1500±ε | dungTichXiLanh |
| 870333 | dungTichXiLanh 2499.9975 | 2500±ε | dungTichXiLanh |
| 870422 | khoiLuongToanBo 20000.02 | 20000±ε | khoiLuongToanBo |
| 870442 | khoiLuongToanBo 20000.02 | 20000±ε | khoiLuongToanBo |
| 870460 | khoiLuongToanBo 4999.995 | 5000±ε | khoiLuongToanBo |
| 983610 | khoiLuongToanBo 19999.98 | 20000±ε | khoiLuongToanBo |
| 981822 | congSuat 263.0 | 263 | congSuat |
| 984933 | dienAp 999.999 | 1000±ε | dienAp |
| 984942 | congSuat 999.999 | 1000±ε | congSuat |
| 391690 | tenLoai polypropylen | — | Loại C: cần khoá tenLoai polypropylen |
| 640620 | chatLieu giấy | — | Loại C: giấy cần trong khoá chatLieu |

### Loại A — Lỗi soạn spec, sửa được (8 PN6)
| PN6 | Lỗi | Cách sửa |
|---|---|---|
| 847790 | cong1-chua-so-hoa 84779032 | Thêm điều kiện dòng 84779032 |
| 851140 | daLapRap + dungCho 87.01-87.05 | Tách theo dungCho cụ thể từng nhóm |
| 851150 | Tương tự 851140 | Tách theo dungCho |
| 870892 | dungCho 8704.10 + tenLoai "ẑẑẑ" | Sửa tenLoai rác → đúng tên |
| 984916 | dungCho "ẑẑẑ" | Sửa giá trị rác |
| 984918 | dungCho "ẑẑẑ" | Sửa giá trị rác |
| 984931 | dungCho "ẑẑẑ" | Sửa giá trị rác |
| 940421 | chatLieu giấy — thiếu điều kiện khác | Thêm điều kiện dạng giấy |

### Loại A2 — Chương 98 đặc biệt (6 PN6)
| PN6 | Ghi chú |
|---|---|
| 981000 | Cấu trúc chương 98: cấp 2→4 số khác thường |
| 983412 | Tương tự |
| 984923 | dungCho động cơ 87.02-87.05 — cần tách |
| 984930 | daLapRap + tenLoai — cần tách |
| 984934 | dungCho 87.03 + laBoPhan — cần tách |

## Đề xuất quy ước cho Claude chốt

1. **Loại B**: không sửa — ghi nhận khoảng trống thật là hành vi đúng (biểu không mô tả)
2. **Loại C biên epsilon**: công cụ cần bỏ epsilon khi biên là số "đẹp" (300, 150, 5000, 1000, 20000). Đề xuất: nếu `abs(bien - round(bien)) < 1e-3` → dùng `round(bien)` thay vì `bien ± epsilon`
3. **Loại C khoá thiếu giá trị**: thêm giá trị vào khoá LIET_KE hiện có (vd chatLieu thêm "giấy", tenLoai thêm "polypropylen")
4. **Loại A**: sửa spec theo hướng dẫn từng dòng
5. **Loại A2 chương 98**: xử lý riêng trong #1111
