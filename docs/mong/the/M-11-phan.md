# Báo cáo thẻ M-11 (#1899): 21 Phần HS 2022 (`phan:I`..`phan:XXI`)

- **Nhánh:** `mong/m-11-phan` (tách từ `origin/mong/m-01-cong`)
- **Đầu ra dữ liệu:** `data/luat-goc/phan.jsonl` (**290 nút**, khuôn `nut-luat@1`)
- **SHA-256 (khớp 2 lần chạy liên tiếp):** `ca242081b818d0b51ab74c79b982652b840a9f2440d0aff0e8e86a8b24977974`
- **Bộ trích tất định:** `scripts/luat-goc/phan-trich.mjs`
- **Bộ kiểm ngoại tuyến CI:** `scripts/luat-goc/phan-test.mjs` (đã đăng ký vào giữa `scripts/danh-sach-test.txt`)
- **Nguồn gốc:** `cgct-hs2022.txt` (cùng bản đối chiếu `cgct-hs2022-layout.txt` và `cgct-hs2022-raw.txt`, tổng 2.409 trang PDF HQKV8 bản HS 2022)

---

## 1. Thống kê toàn kho `data/luat-goc/phan.jsonl` (290 nút)

Phân bố theo `loai`: `TEN` = **21**, `CHU_GIAI` = **202**, `CHU_GIAI_PHAN_NHOM` = **33**, `KHAI_QUAT` = **34**.

| Phần | Phạm vi Chương | Trang PDF | Tổng nút | `TEN` | `CHU_GIAI` | `CHU_GIAI_PHAN_NHOM` | `KHAI_QUAT` | Ghi chú cấu trúc |
|---|---|---:|---:|---:|---:|---:|---:|---|
| `phan:I` | Ch. 01–05 | 8..8 | 3 | 1 | 2 | 0 | 0 | Chú giải 1..2 |
| `phan:II` | Ch. 06–14 | 61..61 | 2 | 1 | 1 | 0 | 0 | Chú giải 1 |
| `phan:III` | Ch. 15 | 148..148 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:IV` | Ch. 16–24 | 178..178 | 2 | 1 | 1 | 0 | 0 | Chú giải 1 |
| `phan:V` | Ch. 25–27 | 268..268 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:VI` | Ch. 28–38 | 327..330 | 14 | 1 | 9 | 0 | 4 | CG 1..4 + Khái quát chung Chú giải 1..4 |
| `phan:VII` | Ch. 39–40 | 870..871 | 8 | 1 | 5 | 0 | 2 | CG 1..2 + Tổng quát Chú giải Phần 1..2 |
| `phan:VIII` | Ch. 41–43 | 951..951 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:IX` | Ch. 44–46 | 980..980 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:X` | Ch. 47–49 | 1061..1061 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:XI` | Ch. 50–63 | 1126..1150 | 137 | 1 | 92 | 33 | 11 | CG 1..15 + CGPN 1..2 + Tổng quát (gồm Bảng I, II) |
| `phan:XII` | Ch. 64–67 | 1338..1338 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:XIII` | Ch. 68–70 | 1366..1366 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:XIV` | Ch. 71 | 1451..1451 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:XV` | Ch. 72–83 | 1488..1494 | 45 | 1 | 40 | 0 | 4 | CG 1..9 + Tổng quát (intro + A, B, C) |
| `phan:XVI` | Ch. 84–85 | 1682..1692 | 41 | 1 | 30 | 0 | 10 | CG 1..6 + Khái quát chung (I)..(X) |
| `phan:XVII` | Ch. 86–89 | 2095..2101 | 26 | 1 | 22 | 0 | 3 | CG 1..5 + Tổng quát (I)..(III) |
| `phan:XVIII` | Ch. 90–92 | 2164..2164 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:XIX` | Ch. 93 | 2325..2325 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:XX` | Ch. 94–96 | 2335..2335 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |
| `phan:XXI` | Ch. 97–98 | 2397..2397 | 1 | 1 | 0 | 0 | 0 | Chỉ có tiêu đề Phần |

> **12 Phần không có Chú giải Phần:** `III, V, VIII, IX, X, XII, XIII, XIV, XVIII, XIX, XX, XXI`. Mỗi Phần này trong `phan.jsonl` chỉ có đúng 1 nút gốc `TEN`.

---

## 2. Đối chiếu với dữ liệu `.phan` cũ trong `data/chu-giai-chuong.json`

Bóc toàn bộ trường `.phan` của các chương trong `data/chu-giai-chuong.json` ra để so với `data/luat-goc/phan.jsonl` cho thấy **nhiều lỗi mất/lẫn dữ liệu nghiêm trọng và nhiều nội dung thuộc bản HS cũ trước 2022**:

### 2.1. Lỗi cấu trúc và thất thoát dữ liệu trong bản cũ
1. **Chương 54 mất trắng `.phan` (`0` ký tự):** Các Chương 50–53 và 55–63 cùng thuộc Phần XI giữ 46.130 ký tự, riêng `Ch.54` trống hoàn toàn. Nay thống nhất trỏ về gốc `phan:XI`.
2. **Phần VI và Phần VII bị gộp chung làm một chuỗi (MẤT TRẮNG toàn bộ Phần VII):** Các Chương 28–38 (Phần VI) và **Chương 39–40 (Phần VII)** trong `chu-giai-chuong.json` đều lưu cùng một chuỗi 5.681 ký tự của Phần VI (`HOẶC CÁC NGÀNH CÔNG NGHIỆP LIÊN QUAN...`). Toàn bộ Chú giải 1, 2 và Tổng quát Chú giải Phần 1, 2 của Phần VII (`Plastic và cao su`, 2.569 ký tự) trước đây bị mất trắng.
3. **6 nhóm chương rỗng `.phan` (`0` ký tự):** `Ch.25–27` (Phần V), `Ch.44–46` (Phần IX), `Ch.54` (Phần XI), `Ch.90` (Phần XVIII), `Ch.94–96` (Phần XX), `Ch.98` (Phần XXI).
4. **Cắt cụt tiêu đề Phần hàng loạt:**
   - `Ch.93` (Phần XIX): chỉ còn 9 ký tự `"CỦA CHÚNG"`.
   - `Ch.97` (Phần XXI): chỉ còn 5 ký tự `"ĐỒ CỔ"`.
   - `Ch.15`, `16–24`, `41–43`, `47–49`, `64–67`, `68–70`, `71`, `72–83`, `84–85`, `86–89`, `91–92` đều bị rụng nửa đầu tiêu đề Phần (ví dụ Ch.84–85 bắt đầu bằng `"ĐIỆN; CÁC BỘ PHẬN..."`), còn `Ch.01–05`, `06–14`, `50–63` thì mất hẳn dòng `PHẦN I/II/XI:...`.
5. **Dính số trang mồ côi của PDF cũ vào cuối chuỗi:** `"146"` (Ch.16–24), `"6"` (Ch.28–40), `"116"`, `"117"` (Ch.50–63), `"9"` (Ch.72–83), `"10"` (Ch.86–89).

### 2.2. Khác biệt pháp lý HS cũ → HS 2022 ở các Phần có Chú giải
- **Phần VI (`phan:VI`, 5.681 → 6.478 ký tự):** Bản mới bổ sung **Chú giải 4** (`phan:VI:cg:4` — quy định nhóm `38.27` không ưu tiên hơn các nhóm khác theo tên/nhóm chức) và mục **Khái quát chung – Chú giải 4** (`phan:VI:kq:4`).
- **Phần VII (`phan:VII`, trước mất trắng → 2.569 ký tự):** Khôi phục đủ Chú giải 1 (`a..c`), Chú giải 2 (bao gồm cụm từ cập nhật `đèn` / hoa văn Chương 49) và Tổng quát Chú giải Phần 1, 2.
- **Phần XI (`phan:XI`, 46.130 → 48.065 ký tự):** Bản HS 2022 bổ sung **Chú giải 15** (`phan:XI:cg:15`) và Tổng quát `(IV)` (`phan:XI:kq:10`) về hàng dệt may kết hợp thành phần hóa học, cơ khí hoặc điện tử; hiệu chỉnh thuật ngữ ở Chú giải 1 (`g`, `n`, `q`, `s`, `u` — ví dụ `đèn (luminaires)`), Chú giải 4 (`guồng gờ`), Chú giải phân nhóm; giữ đủ `BẢNG I` và `BẢNG II`.
- **Phần XV (`phan:XV`, 11.210 → 15.462 ký tự):** Xem chi tiết mục 3.1 bên dưới.
- **Phần XVI (`phan:XVI`, 22.264 → 23.419 ký tự):** Xem chi tiết mục 3.2 bên dưới.
- **Phần XVII (`phan:XVII`, 13.723 → 14.078 ký tự):** Xem chi tiết mục 3.3 bên dưới.

---

## 3. Tự đọc tay kiểm chi tiết 3 Phần trọng tâm (XV, XVI, XVII)

### 3.1. Phần XV (`phan:XV`, tr.1488..1494 — 45 nút)
- **`phan:XV:cg:1`..`cg:9` (40 nút):**
  - `phan:XV:cg:1:m` giữ nguyên danh mục mới HS 2022 (`chân để loại một chân (monopod), hai chân (bipod), ba chân (tripod)...`, khác chữ `"chân đế"` ở bản cũ).
  - `phan:XV:cg:2` có `phan:XV:cg:2:a` giữ nguyên văn `(nhóm 90.21)` cho sản phẩm cấy ghép y tế; hai đoạn quy định phạm vi tiếp theo sau mục `(c)` (`"Từ Chương 73 đến Chương 76..."` và `"Theo nội dung trên..."`) được gắn đúng về nút cha `phan:XV:cg:2` qua `SUA_TAY.doanVeNutCha` thay vì rơi nhầm vào `:2:c`.
  - `phan:XV:cg:8:a` tách đúng thành `:i` (`Tất cả phế liệu...`) và `:ii` (`các sản phẩm bằng kim loại chắc chắn không thể sử dụng được...`) theo chuẩn HS 2022.
  - `phan:XV:cg:9` tách đủ `a` (Thanh và que), `b` (Dạng hình), `c` (Dây — tỷ lệ `trên 1/10 chiều rộng`), `d` (Tấm, lá, dải và lá mỏng), `e` (Ống và ống dẫn). (Bản cũ trong `chu-giai-chuong.json` từng mất/khác nhiều chỗ ở mục 8 và 9).
- **`phan:XV:kq:1..4` (4 nút `TỔNG QUÁT`):**
  - Mục `(C)` (`phan:XV:kq:4`, tr.1494) cập nhật phế liệu pin/ắc quy sang **`nhóm 85.49`** (bản cũ ghi `nhóm 85.48`).
  - **Dị bản PDF được giữ nguyên văn:** Trên tr.1494 sau mục `(g)`, PDF bỏ sót ký hiệu `(h)` trước dòng `"Các bộ phận của giày, dép trừ các loại đã được đề cập tại Chú giải 2 Chương 64... (nhóm 64.06)."`, rồi nhảy sang `(ij) Tiền kim loại (nhóm 71.18).` — bộ trích giữ nguyên văn đúng như PDF để không tự ý thêm chữ.

### 3.2. Phần XVI (`phan:XVI`, tr.1682..1692 — 41 nút)
- **`phan:XVI:cg:1`..`cg:6` (30 nút):**
  - `phan:XVI:cg:1:q` (tr.1683) giữ đầy đủ bổ sung mới HS 2022 về chân đế `monopod/bipod/tripod` thuộc **`nhóm 96.20`**.
  - `phan:XVI:cg:2:b` (tr.1683) giữ đủ đoạn cuối mới HS 2022: bộ phận dùng cho hàng hóa của **`nhóm 85.24`** phân loại vào **`nhóm 85.29`**.
  - **`phan:XVI:cg:6`** (tr.1684 — **mới hoàn toàn ở HS 2022**, bản cũ chưa có): trong PDF dòng gốc in `"6 (A) Trong toàn bộ Danh mục này..."` thiếu dấu chấm sau số 6. `SUA_TAY.chuGiaiKhongCham` nhận diện đúng `phan:XVI:cg:6` (`nguyenVan: "6."`), tách đủ `cg:6:A` (`:i`, `:ii`), `cg:6:B` (`nhóm 85.49`), `cg:6:C` (rác thải đô thị Chương 38).
- **`phan:XVI:kq:1..10` (`KHÁI QUÁT CHUNG`, 10 nút):**
  - Khôi phục đủ đoạn cuối mục `(IX)` và toàn bộ mục `(X) PHẾ LIỆU VÀ PHẾ THẢI ĐIỆN VÀ ĐIỆN TỬ (Chú giải phần 6)` trên tr.1692 (bản cũ bị cắt cụt ngang giữa mục `(IX)`).

### 3.3. Phần XVII (`phan:XVII`, tr.2095..2101 — 26 nút)
- **`phan:XVII:cg:1`..`cg:5` (22 nút):**
  - `phan:XVII:cg:2:k` giữ thuật ngữ HS 2022 `Đèn (luminaires) và bộ đèn... thuộc nhóm 94.05`.
  - `phan:XVII:cg:5` (tr.2096) chuẩn hóa đúng bản HS 2022 (`chạy trên đất`, `chạy trên nước` thay vì cụm dịch cũ `không tiếp đất`/`không tiếp nước`), và hai đoạn giải thích bộ phận đệm không khí sau `(c)` (`"Bộ phận và phụ kiện..."` và `"Các bộ phận cố định và khớp nối..."`) được trả về nút cha `phan:XVII:cg:5` qua `SUA_TAY.doanVeNutCha`.
- **`phan:XVII:kq:1..3` (`TỔNG QUÁT`, 3 nút):** Đủ `(I)`, `(II)`, `(III)` kể cả đoạn mở rộng trò chơi công viên giải trí/công viên nước ở `(I)(c)` và danh mục ví dụ loại trừ `(1)..(12)` ở `(III)`.

---

## 4. 21 chú thích ảnh trang trí HQKV8 đã loại bỏ

Mỗi Phần đều có một dòng chú thích ảnh phong cảnh Quảng Ninh nằm ngay phía trên số trang ở trang cuối Phần (trước `Chương` đầu tiên). Toàn bộ 21 dòng này được khai báo trong `SUA_TAY.anhTrangTrinh` và kiểm tra vắng mặt 100% trong `phan.jsonl`:

| Phần | Trang | Chú thích ảnh đã loại | Phần | Trang | Chú thích ảnh đã loại |
|---|---:|---|---|---:|---|
| I | 8 | `Phong cảnh Vịnh Hạ Long` | XII | 1338 | `Nghỉ đêm trên Vịnh Hạ Long` |
| II | 61 | `Hoàng hôn trên Vịnh Hạ Long` | XIII | 1366 | `Tượng Đức ông Trần Quốc Tảng tại Đền Cửa Ông` |
| III | 148 | `Đỉnh thiêng Yên Tử` | XIV | 1451 | `Hạ Long khi TP lên đèn` |
| IV | 178 | `Góc nhìn toàn cảnh TP từ trên cao` | XV | 1494 | `Eo gió Quan Lạn` |
| V | 268 | `Phong cảnh Hạ Long từ đỉnh núi Bài Thơ` | XVI | 1692 | `Phong cảnh chùa Ngọa Vân – Đông Triều` |
| VI | 330 | `Cảng hàng không quốc tế Vân Đồn` | XVII | 2101 | `Sân Golf FLC Hạ Long` |
| VII | 871 | `Cung Quy hoạch & triển lãm Quảng Ninh` | XVIII | 2164 | `Vịnh Bái Tử Long` |
| VIII | 951 | `Phong cảnh Cô Tô từ ngọn Hải Đăng` | XIX | 2325 | `Cửa khẩu Quốc tế Móng Cái ( Bắc Luân 2)` |
| IX | 980 | `View Vịnh Hạ Long từ đào Ti Tốp` | XX | 2335 | `Cảng tàu khách Quốc tế Hạ Long` |
| X | 1061 | `Tượng Bác Hồ trên đảo Cô Tô` | XXI | 2397 | `Quảng Ninh trước ngày lên Thành phố (trực thuộc Trung ương` |
| XI | 1150 | `Công viên Hạ Long` | | | |

---

## 5. Nhật ký `SUA_TAY` và các dị bản/ảnh trong PDF gốc

1. **`SUA_TAY.anhTrangTrinh`:** Loại 21 dòng chú thích ảnh HQKV8 (bảng Mục 4). Khẳng định nếu thiếu dòng nào ở bản nguồn mới thì dừng báo lỗi ngay.
2. **`SUA_TAY.chuGiaiKhongCham` (tr.1684):** Chú giải 6 Phần XVI trong PDF viết `"6 (A)..."` thiếu dấu chấm sau số `6`; chuẩn hóa đầu mục nút cha là `"6."` để không kích nhầm cảnh báo dính số trang.
3. **`SUA_TAY.doanVeNutCha` (5 đoạn ở tr.1127, tr.1489, tr.2096):** Đưa các đoạn giải thích chung đi liền sau liệt kê `(a)..(c)` / `(A)` về đúng nút cha (`phan:XI:cg:2:A`, `phan:XV:cg:2`, `phan:XVII:cg:5`).
4. **`SUA_TAY.bangPhanXI` (tr.1139–1140 `BẢNG I` và tr.1141–1142 `BẢNG II`):** Trong bản `cgct-hs2022.txt` (stream), các ô của Bảng I và Bảng II 3 cột bị xếp xen dòng; bộ trích lấy nguyên văn từng dòng đã căn cột từ `cgct-hs2022-layout.txt` (không thêm chữ hay sửa chính tả) để đọc đúng hàng và qua đối chiếu 3 bản chữ 0 lỗi.
5. **Dị bản chính tả & hình ảnh có sẵn trong PDF gốc HQKV8 (giữ nguyên văn, không tự sửa):**
   - `phan:XI:cg:1:b` (tr.1126): PDF in lặp `"(b) (b) Tóc người..."`.
   - `phan:XI:kq:5` (tr.1141–1142): PDF in `"Nhũng điều kiện..."` và `"Dạ Dạng hình cầu..."`.
   - `phan:XV:kq:4` (tr.1494): thiếu ký hiệu `(h)` trước dòng `"Các bộ phận của giày, dép..."`.
   - **4 chỗ trong Phần XI là ảnh/biểu đồ không có lớp chữ trong PDF (`pdftotext` trống phần hình):** công thức quy đổi mét–decitex (`tr.1138`), biểu đồ kiểu dệt vân điểm (`tr.1145`), và hai hình mẫu kiểu dệt vân chéo / vân chéo gẫy (`tr.1146`).

---

## 6. Kiểm chứng đã chạy

- `node scripts/luat-goc/phan-trich.mjs --ghi` (chạy 2 lần): cùng ra 290 nút, SHA-256 giống hệt nhau `ca242081b818d0b51ab74c79b982652b840a9f2440d0aff0e8e86a8b24977974`.
- `LUAT_GOC_TXT="$HOME/luat-goc-txt" node scripts/kiem-luat-goc.mjs phan`: `PASS phan: 290 nút, 0 lỗi, 0 cảnh báo — đối chiếu 3 bản chữ`.
- `node scripts/luat-goc/phan-test.mjs` (cả khi có và không có `LUAT_GOC_TXT`): `16 passed, 0 failed`.
- `node scripts/test-danh-sach-test.mjs`: `18/18 passed, 0 failed` (đảm bảo `phan-test.mjs` chèn ở giữa danh sách, không đặt cuối).
