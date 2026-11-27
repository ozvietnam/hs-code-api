# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 85

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/85.jsonl`: **289 bản ghi** toàn Chương 85 (**`268 NGUONG`**, **`17 TACH_ANH_EM`**, **`4 BO_QUA`**; đã hoàn tất rà ngược theo 8 Luật M-74 cho **Gói 1 `85.01–85.04`** [126 bản ghi] và **Gói 2 `85.05–85.19`** [45 bản ghi: `36 NGUONG`, `8 TACH_ANH_EM`, `1 BO_QUA`, `13` bản ghi có `phuDinh`]; giữ nguyên 100% từng byte **244 bản ghi** ngoài Gói 2 gồm `126` bản ghi Gói 1 và `118` bản ghi còn lại của `85.21–85.49`).
  - Phần XVI (`data/ho-so-ma/nguong/XVI.jsonl`) giữ nguyên từ Chương 84 (**y hệt từng byte**), không sinh bản ghi thừa hay trùng lặp.
  - Không chứa dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay thông số ví dụ tham khảo.
- **Đơn vị & quy đổi trục anh em bổ sung cho Chương 85:**
  - Mở rộng bộ tách đơn vị điện/tần số/dung lượng: `kvar`, `kVA`, `VA`, `kV`, `VDC`/`VAC` → `V`, `mA`/`A`, `GHz`/`MHz`/`kHz`/`Hz`, `Ah`/`mAh`, `inch`, cùng số đường tín hiệu (`85184040`) và số sợi cáp dẹt (`85444291`/`92`).
  - Quy đổi thống nhất trong cùng cụm anh em pha trộn `W` ↔ `kW` (nhóm `8501`) và hỗ trợ cận trên loại trừ `"nhưng dưới"` (`<` cho `[66; 110) kV`, `(1; 66) kV`, `(1,5; 16) A`).
  - Mở rộng `kiemDonViDaiLuong()` kiểm bắt chéo `điện áp ↔ V/kV`, `dòng điện ↔ A/mA`, `tần số ↔ Hz..GHz`, `dung lượng phóng điện ↔ Ah/mAh`, `công suất phản kháng ↔ kvar`, `sức chứa túi/hộp chứa bụi ↔ lít` (tách khỏi `sức chứa vải khô` dùng `kg`), `một chiều` chiều dài giấy chỉ áp dụng khi đơn vị là `mm/cm/m` (giữ `850120` là `công suất`).

---

## Rà ngược theo 8 Luật M-74 — Gói 1 (`85.01–85.04`)

### 1. Biến động bản ghi phạm vi `85.01–85.04`

| Chỉ tiêu (phạm vi `bieu:8501*..8504*`) | Nền `origin/main` | Sau rà ngược Gói 1 | Biến động |
|---|---:|---:|---|
| Tổng bản ghi gói `85.01–85.04` | 117 | **126** | **`+9` thêm / `30` sửa / `0` bỏ** |
| `NGUONG` | 117 | **114** | Chuyển 3 bản ghi đảo sai De Morgan sang `TACH_ANH_EM` (giữ `id` cũ) |
| `DINH_NGHIA` | 0 | **0** | Không có định nghĩa ngưỡng pháp lý riêng tại `85.01–85.04` |
| `TACH_ANH_EM` | 0 | **9** | 3 chuyển từ `NGUONG` sai De Morgan + 6 thêm mới cho `"Loại khác"` thiếu phần bù |
| `BO_QUA` | 0 | **3** | Ghi tường minh 3 câu mô tả tính chất thông thường (Luật 6 & 8) |
| Bản ghi có trường mảng `phuDinh` | 0 | **22** | 10 `NGUONG` `"Loại khác"` thuần + 9 `TACH_ANH_EM` De Morgan + 3 `NGUONG` `loaiKhacCoVe` (`8504.32`) |
| `NGUONG` chứa mã HS trong `daiLuong` | 5 | **0** | **Sạch 100% mã HS** (`85042192`, `85042193`, `8504321`, `8504324`, `8504325`) |
| `NGUONG` chứa `"thông số"` trong `daiLuong` | 0 | **0** | Sạch 100% |
| 37 `id` nhóm vàng `85.01` (`dieu-kien/85.jsonl`) | 37 | **37/37** | **Bảo toàn nguyên vẹn 100%** (`test-dieu-kien.mjs` xanh 100%) |
| Bản ghi ngoài gói (`chuong:85`, `85.05–85.49`) | 156 | **156** | **Giữ nguyên 100% từng byte** |

### 2. Các điểm chuẩn hoá chính trong Gói 1 (`85.01–85.04`)

- **Sạch 100% mã HS trong `nguong.daiLuong` & thống nhất trục (Luật 3):**
  - `hs:bieu:85042192:8501`: `"công suất danh định (85042192)"` → `"công suất danh định (nhánh cao áp từ 110 kV trở lên)"` (không chứa từ khóa `"điện áp"` để không kích hoạt `kiemDonViDaiLuongTongQuat` với đơn vị `kVA`).
  - `hs:bieu:85042193:8501`: `"công suất danh định (85042193)"` → `"công suất danh định (nhánh cao áp từ 66 kV đến dưới 110 kV)"`.
  - `hs:bieu:8504321:8501`: `"công suất danh định (8504321)"` → `"công suất danh định (máy biến đổi đo lường)"`.
  - `hs:bieu:8504324:8501` (`<= 10 kVA`) & `hs:bieu:8504325:8501` (`> 10 kVA`): bỏ mã `(8504324)`/`(8504325)`, thống nhất đúng một chuỗi `"công suất danh định"` (kèm `voi` qua lại và `phuDinh: ["bieu:8504321", "bieu:85043220", "bieu:85043230"]`) → mở lại cụm anh em thật `bieu:850432 [công suất danh định (kVA)]` phủ kín `(-∞, +∞)`.
  - Thống nhất `daiLuong: "công suất danh định"` trên cụm `8504.23.2` (`85042321`, `85042322`, `85042329`) cho đồng bộ cha `8504.23`/`8504.23.2`, và sửa `duKien` của 4 bản ghi `đầu điện áp cao` (`85042111:8502`, `85042192:8502`, `85042193:8502`, `8504341:td1:8502`) từ `"công suất danh định"` về đúng nguyên văn `"đầu điện áp cao"`.
- **Chuyển 3 ca đảo sai De Morgan sang `TACH_ANH_EM` + `phuDinh` (Luật 2 — giữ `id` cũ):**
  - `hs:bieu:85030090:8501` (`8503.00.90` `"Loại khác"`): anh em `8503.00.20` ghép *(bộ phận máy phát điện/tổ máy phát điện VÀ `>= 12.500 kVA`)*. Phản ví dụ: bộ phận động cơ điện hoặc máy biến đổi điện quay công suất `>= 12.500 kVA` vẫn thuộc `8503.00.90` → cấm gắn `NGUONG < 12.500 kVA`.
  - `hs:bieu:8504219:8501` (`8504.21.9` `"Loại khác"`): anh em `8504.21.1` tách theo dấu `;` *(máy ổn áp từng nấc HOẶC máy biến đổi đo lường `<= 5 kVA`)*; đồng thời chuẩn hóa `hs:bieu:8504211:8501` nêu rõ ngưỡng `<= 5 kVA` chỉ áp cho nhánh `máy biến đổi đo lường` (Luật 3). Phản ví dụ: máy biến áp nguồn dùng điện môi lỏng `<= 5 kVA` vẫn thuộc `8504.21.9` → cấm gắn `NGUONG > 5 kVA`.
  - `hs:bieu:85043122:8501` (`8504.31.22` `"Loại khác"`): anh em `8504.31.21` ghép *(máy biến dòng dạng vòng VÀ điện áp `<= 220 kV`)*. Phản ví dụ: máy biến dòng đo lường không phải dạng vòng dùng cho đường dây `110 kV` (`<= 220 kV`) vẫn thuộc `8504.31.22` → cấm gắn `NGUONG > 220 kV`.
- **Phủ đủ 100% nút `"Loại khác"` dưới cha có `NGUONG` (Luật 1 & 2):**
  - Thêm mới **6 `TACH_ANH_EM` + `phuDinh`** (`hs:<nut>:7401`) cho 6 nút `"Loại khác"` đang thiếu phần bù: `bieu:85011029` (phủ định `85011021`, `85011022`), `bieu:85042119` (`85042111`), `bieu:85042199` (`85042192`, `85042193`), `bieu:8504341:td2` (`8504341:td1`), `bieu:85044090` (`8504401`, `85044020`, `85044030`, `85044040`), `bieu:85049090` (`85049010`, `85049020`, `8504903`, `8504904`).
  - Bổ sung trường mảng **`phuDinh: [...]`** cho **10 `NGUONG` `"Loại khác"` thuần** (đã có `ghiChu: "phuDinh: ..."` trên nền): `85021390`, `85022049`, `85023939`, `85042219`, `85042299`, `85042329`, `85043119`, `85043129`, `8504339`, `8504342:td2` (và 3 `loaiKhacCoVe` ở `8504.32`: `85043230`, `8504324`, `8504325`).

### 3. Bảng đối soát câu chứa chữ số + đơn vị theo Luật 6 (`85.01–85.04`)

| Nguồn câu (`85.01–85.04`) | Trúng số + đơn vị | Đã rút `NGUONG` / `DINH_NGHIA` | Ghi `BO_QUA` | Bỏ qua hợp lệ (ví dụ / lặp tiêu đề) | Chi tiết đối soát |
|---|---:|---:|---:|---:|---|
| Pháp lý Phần XVI / Ch.85 liên quan `85.01–85.04` | 0 | 0 | 0 | 0 | Chú giải 2 Ch.85 & Chú giải 2 Phần XVI chỉ dẫn chiếu số hiệu nhóm, 0 ngưỡng số riêng cho `85.01–85.04` |
| Dòng biểu `bieu:8501*` | 41 | 41 | 0 | 0 | 41/41 dòng có ngưỡng công suất (`W`/`kW`/`kVA`) đều đã có `NGUONG` (các dòng số khác chỉ dẫn chiếu nhóm `84.15..85.16`, `Chương 87`) |
| Dòng biểu `bieu:8502*` | 18 | 18 | 0 | 0 | 18/18 dòng có ngưỡng công suất (`kVA`) đều đã có `NGUONG` (+ 3 phần bù `NGUONG` `"Loại khác"`) |
| Dòng biểu `bieu:8503*` | 1 | 1 | 0 | 0 | `bieu:85030020#1` (`>= 12.500 kVA`); `85030090` chuyển sang `TACH_ANH_EM` De Morgan |
| Dòng biểu `bieu:8504*` | 40 | 40 | 0 | 0 | 40/40 dòng có ngưỡng công suất (`kVA`), điện áp (`kV`), tần số (`MHz`) đều đã có `NGUONG` (4 dòng có 2 chiều số = 44 `NGUONG` trực tiếp + 7 `NGUONG` phần bù `"Loại khác"`) |
| CGCT / SEN `85.01` (`nhom:8501*`, `sen:8501*`) | 3 | 0 | **3** | 0 | Ghi `BO_QUA`: `nhom:8501:ct:15#1` (`120 độ` cấu tạo cụm tự đồng bộ), `sen:85011030:1#2` & `sen:85011060:1#2` (`3.000 đến 10.000 vòng/phút` mô tả tốc độ quay động cơ hướng trục ổ đĩa) |
| CGCT / SEN `85.02` (`nhom:8502*`, `sen:8502*`) | 1 | 0 | 0 | **1** | Bỏ qua hợp lệ: `nhom:8502:ct:5#2` (*"chẳng hạn tần số từ 50 lên 200 chu kỳ"* — ví dụ minh họa tần số) |
| CGCT / SEN `85.03` (`nhom:8503*`) | 0 | 0 | 0 | 0 | Chỉ có số thứ tự khoản `(1)`, `(2)` |
| CGCT / SEN `85.04` (`nhom:8504*`, `sen:8504*`) | 31 | 0 | 0 | **31** | Bỏ qua hợp lệ: `sen:85043121:1#1` (tiêu đề SEN lặp dòng biểu `<= 220 kV` đã rút ở `bieu:85043121#1`) + 30 câu ví dụ phối hợp trở kháng (`#6` `300 Ω`/`75 Ω`, `#8` *"Trong ví dụ này, cáp 75 Ω..."*, `#9` chú thích ảnh `110 kV`/`220 kV`) lặp trên 10 mã SEN biến áp thích ứng (`85043192`, `85043211`, `85043241`, `85043251`, `85043311`, `85043391`, `85043411`, `85043414`, `85043422`, `85043425`); `nhom:8504:ct:2#4` (`1 cuộn dây`) mô tả cấu tạo tự ngẫu, không phải ngưỡng đo |
| **Tổng Gói 1 (`85.01–85.04`)** | **135** | **100** | **3** | **32** | **135/135 câu đã đối soát, `0` bỏ sót** |

---

## Tổng quan kiểm phân dải anh em & đối chiếu toàn Chương 85

- **Kiểm phân dải anh em (`kiemDaiAnhEm` + Cổng 3):**
  - **Phạm vi Gói 1 (`85.01–85.04`):** **36 cụm anh em**: **31 cụm phủ kín `(-∞, +∞)`** (bao gồm cụm `bieu:850432` mới gộp lại sau khi xóa mã HS khỏi `daiLuong`), **5 cụm hữu hạn đúng cấu trúc biểu** (`850132`, `850152`, `850162`, `850212`, `8504219`). **`0` lỗi chồng dải, `0` lỗi hở dải, `0` lỗi `voi`/`phuDinh`, `0` lỗi đơn vị.**
  - **Toàn Chương 85:** **80 cụm anh em**: **70 cụm phủ kín `(-∞, +∞)`**, **10 cụm hữu hạn đúng cấu trúc biểu** (`850132`, `850152`, `850162`, `850212`, `8504219`, `853929`, `854442`, `8544429`, `854460`, và `853530` đã bù kín khoảng giữa `(40; 66) kV` vào `bieu:85353090` *"Loại khác"* với `phuDinh: bieu:8535301, bieu:85353020` dưới nhóm 85.35 `> 1 kV`). **`0` lỗi chồng dải, `0` lỗi hở dải, `0` lỗi `voi`, `0` lỗi đơn vị.**
- **Đối chiếu `data/ho-so/ranh-gioi/85*.json` (chỉ-đọc):**
  - Phạm vi Gói 1 (`8501..8504*.json`): **29 tệp** (**72 dòng `dieuKienSo`**) đều được phủ đầy đủ (`0` thiếu).
  - Toàn Chương 85: **163/163 tệp** (**155 dòng `dieuKienSo`**) đều đã đối chiếu và có bản ghi tương ứng tại nút hoặc nút con trực tiếp (`0` thiếu).
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (`--pham-vi chuong:85 --cong 4,5`)
  - [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) (`--chuong 85 --kiem`)
  - [`scripts/test-ho-so-ma.mjs`](../../../scripts/test-ho-so-ma.mjs), [`scripts/test-ho-so-ma-tra.mjs`](../../../scripts/test-ho-so-ma-tra.mjs), [`scripts/test-lop-kho.mjs`](../../../scripts/test-lop-kho.mjs), [`scripts/test-dieu-kien.mjs`](../../../scripts/test-dieu-kien.mjs)

---

## Rà ngược theo 8 Luật M-74 — Gói 2 (`85.05–85.19`)

> Phạm vi gồm toàn bộ **15 nhóm 4 số** từ `85.05` đến `85.19` (`8505..8519`), bao gồm 2 nhóm vàng `85.16` và `85.17` (không đụng `dieu-kien/` hay `bang-anh-em/`). Giữ nguyên 100% từng byte **244 bản ghi** ngoài Gói 2 (`126` bản ghi Gói 1 đã gộp ở #2462 + `118` bản ghi còn lại của `85.21–85.49`).

### 1. Biến động bản ghi phạm vi `85.05–85.19`

| Chỉ tiêu (phạm vi `bieu:8505*..8519*`) | Nền `origin/main` | Sau rà ngược Gói 2 | Biến động |
|---|---:|---:|---|
| Tổng bản ghi gói `85.05–85.19` | 38 | **45** | **`+7` thêm / `33` sửa / `0` bỏ** |
| `NGUONG` | 38 | **36** | Chuyển 2 bản ghi đảo sai De Morgan (`8507109:td2`, `8507209:td2`) sang `TACH_ANH_EM` (giữ `id` cũ) |
| `DINH_NGHIA` | 0 | **0** | Chú giải 3 & 5 Ch.85 (`85.07`, `85.17`) định nghĩa định tính, không đặt ngưỡng số |
| `TACH_ANH_EM` | 0 | **8** | 2 chuyển từ `NGUONG` sai De Morgan + 6 thêm mới (`850819`, `85181019`, `85182990`, `85184090`, `85185090`, `8519819`) |
| `BO_QUA` | 0 | **1** | `hs:bieu:8515:7401` cho `nhom:8515:ct:7#5` (*"Hàn thau thường khoảng trên 450 °C"*, Luật 6) |
| Bản ghi có trường mảng `phuDinh` | 0 | **13** | 3 `NGUONG` `"Loại khác"` thuần (`8506`) + 8 `TACH_ANH_EM` De Morgan + 2 `NGUONG` `loaiKhacCoVe` (`85184040`, `85185020`) |
| `NGUONG` chứa `"thông số"` trong `daiLuong` | 13 | **0** | **Sạch 100%** (12 ở `8507` + 1 ở `85181011:8503`) |
| `NGUONG` chứa mã HS trong `daiLuong` | 3 | **0** | **Sạch 100%** (`85198110:8501..8503`, đồng thời xóa `"Ch.85"` khỏi `8509:8501`) |
| Nhóm vàng `85.16` & `85.17` | 0 | **0** | Xác nhận `0` ngưỡng số pháp lý/CGCT/SEN và `0` tham chiếu `nguong` từ `dieu-kien/85.jsonl` |

### 2. Các điểm chuẩn hoá chính trong Gói 2 (`85.05–85.19`)

- **Xóa sạch 13 đại lượng mơ hồ `"thông số"` & 3 mã HS trong `daiLuong` (Luật 3):**
  - **Nhóm `85.07` (12 bản ghi: `85071092`, `85071095..99`, `85072094..99`):** thay `"thông số (cm)"` bằng đúng đại lượng vật lý nguyên văn **`"chiều cao (không bao gồm đầu cực và tay cầm)"`** (`cm`), thống nhất 1 chuỗi trên cả 4 cụm anh em (`8507109:td1`, `8507109:td2`, `8507209:td1`, `8507209:td2`, mỗi cụm phủ kín `<= 13`, `(13; 23]`, `> 23 cm`).
  - **Nhóm `85.18` (`hs:bieu:85181011:8503`):** thay `"thông số (mm)"` bằng **`"chiều cao"`** (`<= 3 mm`), sửa `trich: "cao không quá 3 mm"` và `duKien: ["cao không quá 3 mm"]` khớp nguyên văn `bieu:85181011#1`.
  - **Nhóm `85.19` (`hs:bieu:85198110:8501..8503`):** bỏ mã `(8519.81.10)` khỏi `daiLuong` → `"kích thước chiều dài / chiều rộng / chiều dày (máy ghi âm cassette bỏ túi)"` (`<= 170 / 100 / 45 mm`).
  - **Nhóm `85.09` (`hs:bieu:8509:8501`):** đổi `"khối lượng thiết bị cơ điện gia dụng (CG 4(b) Ch.85)"` → `"khối lượng (thiết bị cơ điện gia dụng ngoài danh mục liệt kê)"` (`<= 20 kg`), làm rõ nhánh 4(b) (các máy liệt kê ở 4(a) không giới hạn khối lượng).
- **Chuyển 2 ca đảo sai De Morgan sang `TACH_ANH_EM` + `phuDinh` (Luật 2 — giữ `id` cũ):**
  - `hs:bieu:8507109:td2:8501` & `hs:bieu:8507209:td2:8501` (`- - - Loại khác:`): anh em `td1` ghép *(điện áp danh định `6 V` hoặc `12 V` VÀ dung lượng phóng điện `<= 200 Ah`)*. Phản ví dụ: ắc quy axit-chì điện áp `24 V` (hoặc `2 V`) dung lượng `100 Ah` (`<= 200 Ah`) vẫn thuộc `td2` → cấm gắn `NGUONG > 200 Ah`; chuyển sang `TACH_ANH_EM` kèm `phuDinh: ["bieu:8507109:td1"]` / `["bieu:8507209:td1"]`.
- **Phủ đủ 100% nút `"Loại khác"` / phần bù dưới cha có `NGUONG` (Luật 1 & 2):**
  - Bổ sung mảng `phuDinh` cho 3 dòng `"Loại khác"` thuần 1 chiều thể tích ở `85.06`: `8506109`, `85066090`, `85068090` (và 2 dòng `loaiKhacCoVe` ở `85.18`: `85184040`, `85185020`).
  - Thêm mới **6 `TACH_ANH_EM` + `phuDinh`** (`hs:<nut>:7401`) cho 6 nút phần bù điều kiện ghép/đa chiều đang thiếu bản ghi: `bieu:850819`, `bieu:85181019` (`Micro khác`), `bieu:85182990`, `bieu:85184090`, `bieu:85185090`, `bieu:8519819`.
- **Con số mô tả thông thường (Luật 6 & 8):**
  - Ghi **`BO_QUA`** `hs:bieu:8515:7401` tại `nut: "bieu:8515"` cho câu `nhom:8515:ct:7#5` (*"Hàn thau thường khoảng trên 450 °C..."*).

### 3. Bảng đối soát câu chứa chữ số + đơn vị theo Luật 6 (`85.05–85.19`)

| Nguồn câu (`85.05–85.19`) | Trúng số + đơn vị | Đã rút `NGUONG` / `DINH_NGHIA` | Ghi `BO_QUA` | Bỏ qua hợp lệ (nhắc lại luật / ví dụ) | Chi tiết đối soát |
|---|---:|---:|---:|---:|---|
| Pháp lý Ch.85 (`chuong:85:cg:4:b#1`) | 1 | 1 | 0 | 0 | `hs:bieu:8509:8501` (`<= 20 kg` cho nhánh 4(b) nhóm `85.09`, đúng Luật 7) |
| Dòng biểu `bieu:8506*` | 3 | 3 | 0 | 0 | `8506101`, `85066010`, `85068030` (`<= 300 cm3`) + 3 phần bù `NGUONG` `"Loại khác"` (`phuDinh`) |
| Dòng biểu `bieu:8507*` | 14 | 14 | 0 | 0 | `8507109:td1`, `8507209:td1` (`6 V`/`12 V`, `<= 200 Ah`) + 12 dòng chiều cao (`<= 13`, `(13; 23]`, `> 23 cm`) |
| Dòng biểu `bieu:8508*` | 2 | 2 | 0 | 0 | `850811` & `85081100` (`<= 1.500 W`, `<= 20 lít` = 4 bản ghi `NGUONG`) + `TACH_ANH_EM` `850819` |
| Dòng biểu `bieu:8518*` | 5 | 5 | 0 | 0 | `85181011` (3 chiều), `85182920` (2 chiều), `85184040` (`>= 6 đường`), `85185010` (`>= 240 W`), `85185020` (`50..100 V`) |
| Dòng biểu `bieu:8519*` | 1 | 1 | 0 | 0 | `85198110` (`170 x 100 x 45 mm` = 3 bản ghi `NGUONG`) + `TACH_ANH_EM` `8519819` |
| Dòng biểu `8505, 8509..8517` (gồm vàng `85.16`, `85.17`) | 0 | 0 | 0 | 0 | Chỉ chứa số hiệu nhóm/chương tham chiếu (`90.18`, `87.01–.05`, `85.39`, `85.12`, `85.45`, `84.71`, ...) |
| CGCT / SEN `85.09` (`nhom:8509:ct:9#1`) | 1 | 0 | 0 | 1 | Nhắc lại ngưỡng `<= 20 kg` đã rút từ Chú giải pháp lý `chuong:85:cg:4:b#1` (`hs:bieu:8509:8501`) |
| CGCT / SEN `85.15` (`nhom:8515:ct:7#5`) | 1 | 0 | **1** | 0 | Ghi `BO_QUA` `hs:bieu:8515:7401` (*"Hàn thau thường khoảng trên 450 °C"*) |
| CGCT / SEN `85.05..85.08`, `85.10..85.14`, **`85.16`**, **`85.17`**, `85.18`, `85.19` | 0 | 0 | 0 | 0 | 0 câu chứa ngưỡng số+đơn vị (các chữ số còn lại chỉ là số đếm bộ phận/kỹ thuật như `"02 van"`, `"2 tấm"`, `"MP3"`, số hiệu nhóm) |
| **Tổng Gói 2 (`85.05–85.19`)** | **28** | **26** | **1** | **1** | **28/28 câu đã đối soát, `0` bỏ sót** |

### 4. Kiểm phân dải anh em & đối chiếu `ranh-gioi` (`85.05–85.19`)

- **Cụm anh em trong Gói 2 (`kiemDaiAnhEm` + Cổng 3):** **7 cụm anh em**, **7/7 phủ kín `(-∞, +∞)`** (`850610`, `850660`, `850680`, `8507109:td1`, `8507109:td2`, `8507209:td1`, `8507209:td2`), **`0` chồng dải, `0` hở dải, `0` lỗi `voi`/`phuDinh`, `0` lỗi đơn vị**.
- **Đối chiếu `data/ho-so/ranh-gioi/8505..8519*.json` (chỉ-đọc):** **55 tệp** (**20 dòng `dieuKienSo`** trên `8506`, `8507`, `8518`) đều được phủ đầy đủ (`0` thiếu; `8516*.json` và `8517*.json` có `0` `dieuKienSo`).
