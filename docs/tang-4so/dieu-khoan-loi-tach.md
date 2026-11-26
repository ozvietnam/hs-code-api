# Điều khoản lỗi tách (tầng 2)

Người xếp: `haiku-2026-11-23`. Tệp: `data/luat/dieu-khoan-tang2.json`. Test: `scripts/test-dieu-khoan-tang2.mjs`.
Dữ liệu KHÔNG được sửa cho xanh; các mục dưới đây giữ nguyên, chỉ ghi lại để đối chiếu nguồn.

## (d) Mã 4 chữ số trong `dich` không phải nhóm có thật (7 cảnh báo)

Chỉ số là vị trí trong mảng `dieu-khoan-tang2.json` (không dùng `id` vì `id` bị trùng, xem phần (a)).

| # | id | Mã | Lý do đoán |
|---|----|----|-----------|
| 246 | chuong:25:chu_giai:4 | 2414 | Nguyên văn ghi "nhóm 24.14" (không có nhóm này trong Danh mục). Có thể là lỗi in trong nguồn (lẽ ra 25.14) hoặc tách nhầm. Cần đối chiếu nguồn. |
| 750 | chuong:48:chu_giai_phan_nhom:7 | 1323 | Không phải nhóm: là số trong công thức "Định lượng cơ bản x 13.23 millinewton". |
| 750 | chuong:48:chu_giai_phan_nhom:7 | 9464 | Không phải nhóm: là số trong công thức "... – 94.64" (tiêu chí đo, không phải mã). |
| 1208 | chuong:72:chu_giai_phan_nhom:2g | 9994 | Không phải nhóm: là hàm lượng sắt "tối thiểu 99.94 %". |
| 1284 | phan:84:chu_giai:5g | 8469 | Nhóm có thật (nguyên văn "nhóm 84.69 đến 84.72"), nhưng `chu-giai-heading.json` không có khoá 8469. Lỗi thiếu dữ liệu heading. |
| 1572 | chuong:95:chu_giai_phan_nhom:1e | 9501 | Nhóm có thật (nguyên văn có "[95.01]"), nhưng `chu-giai-heading.json` không có khoá 9501. Chương 95 chỉ có 6 khoá. |
| 1572 | chuong:95:chu_giai_phan_nhom:1e | 9502 | Như trên, nguyên văn có "[95.02]", heading thiếu khoá 9502. |

## (c) Nguyên văn và lời dẫn khớp phần chú giải pháp lý trước `TỔNG QUÁT` (cổng cứng)

0 mục lệch. Toàn bộ `1.237` mục trong `data/luat/dieu-khoan-tang2.json` đều có `nguyenVan` và `dan` khớp nguyên văn 100% chuỗi con trong phần chú giải pháp lý **trước** tiêu đề `TỔNG QUÁT` của `data/chu-giai-chuong.json` (đã nâng mục `(c)` trong `scripts/test-dieu-khoan-tang2.mjs` từ cảnh báo thành cổng kiểm cứng `PASS`).

## (a) Id trùng (đỏ, chưa sửa)

128 `id` bị trùng, ví dụ `chuong:09:chu_giai:2a` ×2, `chuong:09:chu_giai:2b` ×2, `chuong:48:chu_giai:1` nhiều lần. Lý do đoán: `id` tạo từ cap, gan, vùng, khoản, điểm, nhưng tách bằng máy làm nhiều đoạn mang cùng khoản/điểm (ví dụ đoạn tiếp nối bị tách thành mục riêng). Cần quyết định cách đánh số lại, không sửa tự động ở PR này.

## (f) Điều khoản dính đoạn TỔNG QUÁT của Chú giải chi tiết WCO (đã làm sạch 210/210 mục)

**Nguyên nhân:** Khi bóc tách chú giải Phần/Chương từ nguồn Chú giải chi tiết WCO (Explanatory Notes), phần văn bản "TỔNG QUÁT" (General Explanatory Notes) nằm ngay sau các chú giải pháp lý cuối cùng của Phần hoặc Chương. Bộ bóc tách tất định (deterministic parser) ban đầu chưa ngắt trước tiêu đề "TỔNG QUÁT", dẫn đến đoạn mở đầu của Chú giải tổng quát WCO bị dính vào:
- Trường `nguyenVan` của khoản/điểm cuối cùng (46 mục).
- Trường lời dẫn `dan` của các mục kế sau (164 mục).

**Đã xử lý (OZV-1969):** Đã cắt bỏ phần từ dòng tiêu đề `TỔNG QUÁT` trở về sau (kèm khoảng trắng cuối) trong `dan` và `nguyenVan` của toàn bộ 210/210 mục trong `data/luat/dieu-khoan-tang2.json`. Sau khi làm sạch:
- `0` mục còn dính `TỔNG QUÁT` (46 mục ở `nguyenVan`, 164 mục ở `dan` đều đã sạch).
- Toàn bộ 1.597 mục trong `data/luat/dieu-khoan-tang2.json` vẫn có `nguyenVan` khớp nguyên văn 100% chuỗi con trong `data/chu-giai-chuong.json` (0 cảnh báo ở mục `(c)`).
- Nâng mục `(f)` trong `scripts/test-dieu-khoan-tang2.mjs` từ cảnh báo thành ca kiểm cứng `PASS` thứ 4.

**Xử lý triệt để khoản con giả sau `TỔNG QUÁT` và khôi phục chú giải đơn cuối chương (OZV-2390):**
- Loại bỏ toàn bộ **397 mục** có `nguyenVan` (`(a)... (b)...`) nằm **sau** tiêu đề `TỔNG QUÁT` trong `data/chu-giai-chuong.json` (gồm 134 mục thuộc 11 cụm tiền tố đã có sẵn khoản con pháp lý thật trước `TỔNG QUÁT` và 263 mục thuộc 37 cụm chú giải pháp lý đơn cuối chương/phân nhóm bị bộ tách cũ nuốt vào `dan`).
- Khôi phục **37 chú giải pháp lý đơn cuối chương/phân nhóm** thành 37 bản ghi đơn duy nhất với `dan: ""`, `nguyenVan` trích đầy đủ không bị cắt 300 ký tự từ phần văn bản trước `TỔNG QUÁT` (trong đó sửa cụm `chuong:63:chu_giai:1a..1e` thành `chuong:63:chu_giai_phan_nhom:1`, `vung: "chu_giai_phan_nhom"`), cập nhật `dich` và `kieu`, đồng thời đánh số lại `id` trùng trong `scripts/tang-4so/sua_dieu_khoan_tang2.py`.
- Tổng số điều khoản sau khi làm sạch còn **1.237 mục** (100% `nguyenVan` và `dan` nằm trước `TỔNG QUÁT`).

### Bảng ví dụ điển hình đã làm sạch

| # | id | Vị trí dính | Trích đoạn dính | Nhận xét |
|---|----|-------------|-----------------|----------|
| 4 | chuong:01:chu_giai:1c | nguyenVan | `... thuộc nhóm 95.08.\n\nTỔNG QUÁT\n\nChương này bao gồm tất cả các loại sinh vật sống ...` | Điểm (c) cuối khoản 1 dính toàn bộ phần Chú giải tổng quát của Chương 01 WCO. |
| 10 | chuong:03:chu_giai:3a | dan | `... (nhóm 03.09).\n\nTỔNG QUÁT\n\nChương này bao gồm tất cả các loại cá ...` | Lời dẫn `dan` của khoản 3 dính tiêu đề và nội dung TỔNG QUÁT của Chương 03. Tương tự cho các điểm 3b, 3c, 3d. |
| 27 | chuong:04:chu_giai_phan_nhom:2a | dan | `... phân nhóm 0405.90).\n\nTỔNG QUÁT\n\nChương này bao gồm: (I) Các sản phẩm bơ sữa ...` | Lời dẫn `dan` của chú giải phân nhóm 2 dính Chú giải tổng quát Chương 04. Dính cả 2a–2e. |
| 88 | chuong:10:chu_giai_phan_nhom:1 | nguyenVan | `... như loài đó.\n\nTỔNG QUÁT\n\nChương này chỉ bao gồm các loại hạt ngũ cốc ...` | Chú giải phân nhóm 1 dính phần TỔNG QUÁT của Chương 10 WCO. |
| 354 | chuong:29:chu_giai_phan_nhom:2a | dan | `... của Chương này.\n\nTỔNG QUÁT\n\nTheo quy tắc chung, Chương này giới hạn ...` | Lời dẫn `dan` của phân nhóm Chương 29 dính TỔNG QUÁT WCO. |
| 750 | chuong:48:chu_giai_phan_nhom:7 | nguyenVan | `... – 0.829\n\nTỔNG QUÁT\n\nTrong các Chú giải của Chương này ...` | Điểm cuối công thức phân nhóm 7 Chương 48 dính TỔNG QUÁT WCO. |
| 842 | phan:50:chu_giai:2c~2 | nguyenVan | `... chỉ thêu.\n\nTỔNG QUÁT\n\nNói chung, Phần XI bao gồm những loại nguyên liệu thô ...` | Chú giải Phần XI dính Chú giải tổng quát Phần XI WCO. |
| 1596 | chuong:97:chu_giai:6 | nguyenVan | `... phân loại riêng.\n\nTỔNG QUÁT\n\nChương này bao gồm: (A) Một số loại tác phẩm nghệ thuật ...` | Khoản 6 Chương 97 dính phần TỔNG QUÁT WCO. |

