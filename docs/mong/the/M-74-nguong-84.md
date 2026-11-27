# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 84 (+ Phần XVI)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/XVI.jsonl`: **2 bản ghi `NGUONG`** ở `phan:XVI` (`phan:XVI:kq:41#1` dung sai bi thép 84.82: `<= 1%` và `<= 0,05 mm`) — giữ nguyên không chạm.
  - `data/ho-so-ma/nguong/84.jsonl`: **392 bản ghi** (`313 NGUONG`, `72 TACH_ANH_EM`, `7 BO_QUA`) từ Chú giải Chương/Phân nhóm (`7`, `9`, `pn:4`), Phân nhóm/Nhóm/SEN và tên dòng biểu thuế `bieu:84*` (đã hoàn tất rà ngược **Gói 1: `84.01–84.12`**, **Gói 2: `84.13–84.20`** và **Gói 3: `84.21–84.35`**; giữ nguyên 100% từng byte **359 bản ghi** ngoài Gói 3 gồm `259` bản ghi Gói 1+2 và `100` bản ghi còn lại của `84.36–84.87` + phi-biểu ngoài Gói 3).
  - **Tổng toàn Chương 84 + Phần XVI: 394 bản ghi**, không chứa dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay thông số ví dụ/bảng mẫu tham khảo.
- **Áp dụng đầy đủ 3 quy ước QT chốt sau Chương 76 & 8 Luật M-74:**
  1. **Không lấy thông số ví dụ / bảng mẫu tham khảo:** lọc bằng `laCauViDuHoacBangMau()` (loại các dải minh họa trong Chú giải như `nhom:8424` 3.000–4.000 bar, `nhom:8448` khoảng 0,1–2 mm, `nhom:8455` xấp xỉ 30–520 cm, `pn:842211` bảng kích thước đặt sàn, `pn:842441` ví dụ 3 bar/5 lít, `sen:84145930` ví dụ 0,5 m³/s).
  2. **Bảng thành phần hợp kim:** Chương 84 không có bảng thành phần mác hợp kim kiểu `5182/5082`.
  3. **Dòng *"Loại khác"* phủ định anh em:** kế thừa 55 bản ghi *"Loại khác"* phần bù 1 khoảng duy nhất (bao gồm ca lấp khoảng giữa `(18,65; 100] kW` ở `bieu:8408909` giữa `.9010 <= 18,65` và `.905 > 100`, cùng đồng thời `<= 21,10 kW` và `< 220 cc` ở `bieu:84143090`), nay đang được nâng cấp theo từng gói để bổ sung trường mảng `phuDinh`, tách `TACH_ANH_EM` De Morgan cho điều kiện ghép và ghi `BO_QUA` cho câu mô tả thông thường (Luật 1–8).
- **Kiểm phân dải anh em & cặp đại lượng-đơn vị (`kiemDaiAnhEm` + `kiemDonViDaiLuong` + Cổng 3):**
  - Bắt cặp bắt buộc `daiLuong ↔ donVi` qua `kiemDonViDaiLuong()` (ví dụ chặn `công suất` gắn `mm`, `đường kính` gắn `kW`; giữ riêng `bieu:84603110` thành `công suất <= 0,74 kW` và `đường kính chuôi <= 3,175 mm`).
  - Tổng toàn Chương 84: **82 cụm anh em `NGUONG`** (**76 cụm phủ kín `(-∞, +∞)`**, **6 cụm hữu hạn đúng cấu trúc biểu**: `840732` thừa hưởng `(50; 250] cc`; `841350/841360/841370`; `8415819`; `848180:td6`). **0 lỗi chồng dải, 0 lỗi hở dải, 0 lỗi `voi`.**
- **Đối chiếu `data/ho-so/ranh-gioi/84*.json`:** **258/258 tệp** (**170 dòng `dieuKienSo`**) đều đã đối chiếu và có bản ghi tương ứng tại nút hoặc nút con trực tiếp (`0` thiếu).
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) (`--chuong 84 --kiem|--bao-cao`)
  - [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) (chạy toàn kho sau khi hoàn tất ghép các gói)

---

## Rà ngược Gói 1 (`84.01–84.12`) — Hoàn tất theo 8 Luật M-74

- **Phạm vi xử lý:** 12 nhóm đầu Chương 84 (`84.01, 84.02, 84.03, 84.04, 84.05, 84.06, 84.07, 84.08, 84.09, 84.10, 84.11, 84.12`). Giữ nguyên 100% từng byte **217 bản ghi** ngoài phạm vi (`17` bản ghi phi-biểu và `200` bản ghi `84.13–84.87`).
- **Tương thích `nguong-test.mjs` Ca 3:** `hs:bieu:8408909:8401` giữ nguyên `nguong.tu = 18.65`, `nguong.den = 100`, `ghiChu` bắt đầu bằng `phuDinh: bieu:84089010`, đồng thời bổ sung trường mảng `phuDinh: ["bieu:84089010", "bieu:8408905"]`.

### 1. Thống kê trước / sau rà ngược (phạm vi `84.01–84.12`)

| Chỉ số (phạm vi `84.01–84.12`) | Trước rà (`origin/main`) | Sau rà (Gói 1) | Biến động |
|---|---:|---:|---|
| Tổng bản ghi `84.01–84.12` | 98 | **138** | `+40` thêm, `40` sửa, `0` bỏ (`58` giữ nguyên) |
| `NGUONG` | 98 | **98** | `40` bản ghi sửa chuẩn hóa (`10` bổ sung `phuDinh`, `26` chuẩn hóa nhánh `8409`, `2` bổ sung `voi` ở `840211/840212`, `2` làm rõ điều kiện ghép `84073440/84073491`); giữ nguyên 100% `id` cũ |
| `DINH_NGHIA` | 0 | **0** | Không có định nghĩa thuật ngữ chứa ngưỡng số trong `84.01–84.12` |
| `TACH_ANH_EM` | 0 | **39** | `+39` mới (Luật 1, 2 & 3): `1` tại `840219`, `2` nút trung gian `"Loại khác"` tại `8407347`/`8407349:td1`, `36` tại `8409` (`12` ống xi lanh khác + `10` piston khác + `1` ống xi lanh và piston khác + `13` `"Loại khác"`) |
| `BO_QUA` | 0 | **1** | `+1` mới (`hs:bieu:8402:7401` cho `nhom:8402:ct:13#1` — nhiệt độ thông thường `180 độ C`, Luật 6) |
| Bản ghi mang trường mảng `phuDinh` | 0 | **49** | `10 NGUONG` phần bù thuần 1 chiều + `39 TACH_ANH_EM` điều kiện ghép / miền bù rời |
| `daiLuong` chứa mã HS hoặc `"thông số"` | 0 | **0** | Sạch 100% (`0` mã HS `84xx`/`84.xx`, `0` `"thông số"`) |
| Cụm anh em `NGUONG` thuần 1 chiều (`kiemDaiAnhEm`) | 24 | **24** | **23 phủ kín `(-∞, +∞)`**, **1 hữu hạn** đúng biểu (`bieu:840732`: `(50; 110]` & `(110; 250] cc`), **0 chồng**, **0 hở** |
| Trùng `id` toàn kho `data/ho-so-ma/**/*.jsonl` | 0 | **0** | `0` va chạm (`id` thêm mới dùng đuôi `:7401`) |

### 2. Chi tiết nâng cấp theo 8 Luật M-74 trong Gói 1

1. **Luật 1 & 2 — Phần bù thuần 1 chiều (10 `NGUONG` bổ sung trường mảng `phuDinh`):**
   - `bieu:84021219` (`<= 15 tấn/giờ`, `phuDinh: ["bieu:84021211"]`)
   - `bieu:84021229` (`<= 15 tấn/giờ`, `phuDinh: ["bieu:84021221"]`)
   - `bieu:84021919` (`<= 15 tấn/giờ`, `phuDinh: ["bieu:84021911"]`)
   - `bieu:84021929` (`<= 15 tấn/giờ`, `phuDinh: ["bieu:84021921"]`)
   - `bieu:84068290` (`> 5 MW`, `phuDinh: ["bieu:84068210"]`, kế thừa `<= 40 MW` từ `8406.82`)
   - `bieu:84072190` (`> 22,38 kW`, `phuDinh: ["bieu:84072110"]`)
   - `bieu:84072990` (`> 22,38 kW`, `phuDinh: ["bieu:84072920"]`)
   - `bieu:84079090` (`> 22,38 kW`, `phuDinh: ["bieu:84079010", "bieu:84079020"]`)
   - `bieu:84081090` (`> 750 kW`, `phuDinh: ["bieu:84081010", "bieu:84081020", "bieu:84081030"]`)
   - `bieu:8408909` (`(18,65; 100] kW`, `phuDinh: ["bieu:84089010", "bieu:8408905"]`)
2. **Luật 1 & 2 — Phần bù điều kiện ghép / miền bù rời (`39 TACH_ANH_EM` mới, cấm gắn `NGUONG` đảo chiều):**
   - `bieu:840219` (`hs:bieu:840219:7401`, cha `bieu:84021`): `8402.11` và `8402.12` ghép nồi hơi dạng ống nước + ngưỡng 45 tấn/giờ; nồi hơi không phải dạng ống nước hoặc kiểu lai ghép ở mọi công suất hơi vẫn vào `8402.19`.
   - `bieu:8407347` (`hs:bieu:8407347:7401`, cha `bieu:840734:td1`) và `bieu:8407349:td1` (`hs:bieu:8407349:td1:7401`, cha `bieu:8407349`): hai nút tiêu đề trung gian `"Loại khác"` đứng sau dòng ghép công dụng máy kéo cầm tay + `<= 1.100 cc` (`8407.34.40` / `8407.34.91`) và xe `87.01`/`87.11`; động cơ ô tô con `1.050 cc` vẫn thuộc `"Loại khác"` nên bắt buộc `TACH_ANH_EM` (De Morgan).
   - **13 cụm con của nhóm `84.09`** (`8409911`, `8409912`, `8409914`, `8409915`, `8409916`, `8409917`, `8409991`, `8409992`, `8409993`, `8409994`, `8409995`, `8409996`, `8409997`):
     - **12 dòng `"Ống xi lanh khác"`**, **10 dòng `"Piston khác"`**, **1 dòng `"Ống xi lanh và piston khác"`** (`8409.99.38`): phần bù của `[50; 155] mm` là hợp hai khoảng rời (`< 50 mm` hoặc `> 155 mm`) gắn theo loại bộ phận → ghi `TACH_ANH_EM` với `voi` & `phuDinh` trỏ đúng anh em `[50; 155] mm`.
     - **13 dòng `"Loại khác"`** (`.19/.29/.39/.49/.59/.69/.79`): phủ định toàn bộ anh em đứng trước bằng `TACH_ANH_EM` + `phuDinh` (lưu ý `8409.91.2` và `8409.91.6` không có dòng `"Piston khác"` riêng nên piston `< 50 mm` hoặc `> 155 mm` đi thẳng vào `8409.91.29` / `8409.91.69`).
3. **Luật 3 — Nhánh `HOẶC` / dấu `;` và đồng nhất `daiLuong`:**
   - `bieu:84099937`: tách tường minh hai nhánh độc lập ngăn bởi `;` — `hs:bieu:84099937:8402` (`nhánh ống xi lanh`, `daiLuong: "đường kính trong (ống xi lanh)"`, `duKien: ["Ống xi lanh", "đường kính trong"]`) và `hs:bieu:84099937:8401` (`nhánh piston`, `daiLuong: "đường kính ngoài (piston)"`, `duKien: ["piston", "đường kính ngoài"]`).
   - Đồng nhất `daiLuong` trên toàn bộ `84.09`: `"đường kính trong (ống xi lanh)"` (13 bản ghi) và `"đường kính ngoài (piston)"` (13 bản ghi), sạch 100% mã HS.

### 3. Đối soát Luật 6, Luật 8 & `data/ho-so/ranh-gioi/8401..8412*.json`

- **Quét 100% câu chứa số + đơn vị trong `bieu/nhom/pn/sen` (`84.01–84.12`):**
  - **Tổng số câu trúng số + đơn vị:** **88 câu** (`87` câu tầng biểu `bieu:8401..8412` + `1` câu chú giải chi tiết `nhom:8402:ct:13#1`).
  - **Đã rút thành bản ghi `NGUONG`:** **87/87 câu tầng biểu** (sinh ra `88 NGUONG` trực tiếp do `bieu:84099937#1` có 2 nhánh `;`, cộng `10 NGUONG` phần bù thuần 1 chiều = `98 NGUONG`).
  - **Đã ghi `BO_QUA` tường minh (Luật 6):** **1/1 câu hướng dẫn** — `nhom:8402:ct:13#1` (`"…thường là ở nhiệt độ 180 độ C hoặc cao hơn"`) → `hs:bieu:8402:7401` tại đúng nút chủ câu `bieu:8402`.
  - **Bỏ qua hợp lệ (chỉ có chữ số không phải ngưỡng đo lường):** `132` câu còn lại có chữ số trong `nhom/pn/sen` (`84.01–84.12`) chỉ là số thứ tự mục `(1)…(11)`, dẫn chiếu nhóm/chương HS (`84.02`, `87.01`, `Chương 87`, `Phần XVI`…), tên đồng vị (`U 235`, `uranium 235 hoặc 233`), công thức `H2`, hoặc mô tả cấu tạo (`rôto đĩa 3 thuỳ`, `1 chu kỳ gồm 4 kỳ`).
- **Đối chiếu chỉ-đọc `data/ho-so/ranh-gioi/8401..8412*.json`:** **21/21 tệp**, **58/58 dòng `dieuKienSo`** đều đã được phủ 100% (`0` thiếu).
- **Nhóm không có ngưỡng định lượng trong Gói 1:** `84.01`, `84.03`, `84.04`, `84.05`, `84.12` (đã rà đủ 100% `bieu`/`nhom`/`pn`/`sen`).

---

## Rà ngược Gói 2 (`84.13–84.20`) — Hoàn tất theo 8 Luật M-74

- **Phạm vi xử lý:** 8 nhóm tiếp theo Chương 84 (`84.13, 84.14, 84.15, 84.16, 84.17, 84.18, 84.19, 84.20`). Giữ nguyên 100% từng byte **254 bản ghi** ngoài phạm vi `84.13–84.20` (`138` bản ghi Gói 1 đã gộp ở #2461 + `116` bản ghi còn lại của `84.21–84.87` và phi-biểu ngoài Gói 2).
- **Sạch mã HS 100% trong `nguong.daiLuong` (5/5 điểm nóng đã xử lý triệt để):**
  - `hs:bieu:84138115:8401`: `"lưu lượng (84138115)"` → `"lưu lượng (bơm nước)"`
  - `hs:bieu:84146011:8401`: `"hiệu suất lọc HEPA (SEN 8414.60.11)"` → `"hiệu suất lọc HEPA (tủ hút phòng thí nghiệm)"`
  - `hs:bieu:84148011:8401`: `"hiệu suất lọc HEPA (SEN 8414.80.11)"` → `"hiệu suất lọc HEPA (tủ hút phòng thí nghiệm)"`
  - `hs:bieu:8415:8401`: `"nhiệt độ thiết kế cố định trong không gian kín (bị loại khỏi 84.15)"` → `"nhiệt độ thiết kế cố định trong không gian kín (thiết bị làm lạnh có gắn hệ thống làm nóng)"` **kèm sửa chiều Luật 4:** từ `< 0°C` (miền bị loại) sang **`>= 0°C`** (`tu: 0, den: null, gomTu: true, gomDen: false` — miền ở lại nhóm `84.15`)
  - `hs:bieu:84189940:8401`: `"áp suất ép tạo rãnh panel (SEN 8418.99.40)"` → `"áp suất ép tạo rãnh panel nhôm cán-ghép"`

### 1. Thống kê trước / sau rà ngược (phạm vi `84.13–84.20`)

| Chỉ số (phạm vi `84.13–84.20`) | Trước rà (`origin/main`) | Sau rà (Gói 2) | Biến động |
|---|---:|---:|---|
| Tổng bản ghi `84.13–84.20` | 101 | **121** | `+20` thêm, `71` sửa (gồm `5` chuyển `NGUONG → TACH_ANH_EM` giữ nguyên `id` cũ), `0` bỏ (`30` giữ nguyên) |
| `NGUONG` | 101 | **96** | `-5` chuyển sang `TACH_ANH_EM` (Luật 2 De Morgan); `66` sửa chuẩn hóa (`25` bổ sung mảng `phuDinh`, `5` sạch mã `daiLuong` + sửa Luật 4 `8415`, `2` tách rõ nhánh `HOẶC` `84143040`, `34` bổ sung `voi`/điều kiện ghép) |
| `DINH_NGHIA` | 0 | **0** | Không có định nghĩa thuật ngữ chứa ngưỡng số trong `84.13–84.20` |
| `TACH_ANH_EM` | 0 | **22** | `+5` chuyển từ `NGUONG` (`841459`, `84147019`, `84147029`, `84181099`, `8418509`) + `+17` thêm mới (`4` ở `84.13`, `4` ở `84.14`, `4` ở `84.15`, `4` ở `84.18`, `1` ở `84.19`) |
| `BO_QUA` | 0 | **3** | `+3` mới (Luật 6 & 8): `hs:bieu:84145930:7401` (`sen:84145930:1#1`), `hs:bieu:84145950:7401` (`sen:84145950:1#1`), `hs:bieu:8418:7401` (`nhom:8418:ct:2#1`) |
| Bản ghi mang trường mảng `phuDinh` | 0 | **47** | `25 NGUONG` phần bù thuần 1 chiều / De Morgan AND + `22 TACH_ANH_EM` điều kiện ghép / 2 chiều |
| `daiLuong` chứa mã HS hoặc `"thông số"` | 5 | **0** | Sạch 100% (`0` mã HS `84xx`/`84.xx`, `0` `"thông số"`) |
| Cụm anh em `NGUONG` (`kiemDaiAnhEm`) | 37 (5 sai De Morgan) | **32** | **28 phủ kín `(-∞, +∞)`**, **4 hữu hạn** đúng biểu (`841350`, `841360`, `841370` bơm nước `<= 13.000 m³/h`; `8415819` dải `> 21,10 kW` kèm `> 67,96 m3/phút`), **0 chồng**, **0 hở** |
| Trùng `id` toàn kho `data/ho-so-ma/**/*.jsonl` | 0 | **0** | `0` va chạm (`id` thêm mới dùng đuôi `:7401`, giữ nguyên 100% `id` nền `:8401/:8402`) |

### 2. Chi tiết nâng cấp theo 8 Luật M-74 trong Gói 2

1. **Luật 4 — Sửa chiều khoảng số ở lại nút tại `bieu:8415`:**
   - `hs:bieu:8415:8401` (`nhom:8415:ct:17#1`): bản cũ ghi `< 0°C` (miền bị loại khỏi `84.15`). Đã đảo đúng chiều Luật 4 thành `tu: 0, den: null, gomTu: true, gomDen: false` (`>= 0°C` để ở lại `84.15`; thiết bị làm lạnh duy trì nhiệt độ cố định luôn `< 0°C` trong không gian kín bị loại sang `84.18` ghi trong `dieuKien`/`ghiChu`).
2. **Luật 2 — Chuyển `5` bản ghi `NGUONG` đảo sai De Morgan sang `TACH_ANH_EM` (giữ nguyên `id` cũ):**
   - `hs:bieu:841459:8401` (`bieu:841459`): `8414.51` ghép loại quạt (bàn/sàn/tường/cửa sổ/trần/mái) + động cơ điện gắn liền + `<= 125 W`; phản ví dụ thực tế ngay dưới `8414.59`: quạt làm mát vi xử lý 3 W (`8414.59.10`) hay máy thổi khí 100 W (`8414.59.30`) đều `<= 125 W` nhưng thuộc `8414.59`.
   - `hs:bieu:84147019:8401` & `hs:bieu:84147029:8401`: `8414.70.11` / `8414.70.21` ghép `có nắp chụp hút` + `<= 120 cm`; tủ an toàn sinh học kín khí không có nắp chụp hút (vd tủ cách ly kín cấp III ngang `<= 120 cm`) vẫn thuộc `.19`/`.29`.
   - `hs:bieu:84181099:8401`: `8418.10.91` ghép `quầy hàng, tủ bày hàng` + `> 200 lít`; tủ kết đông lạnh liên hợp có ngăn kéo ngoài dung tích 450 lít không phải quầy bày hàng vẫn thuộc `8418.10.99`.
   - `hs:bieu:8418509:8401`: `8418.50.1` ghép `quầy hàng, tủ bày hàng` + `lắp thiết bị làm lạnh` + `> 200 lít`; tủ ngăn bảo quản 500 lít hoặc tủ bày hàng kết đông 350 lít vẫn thuộc `8418.50.9`.
3. **Luật 1 & 2 — Thêm `17 TACH_ANH_EM` phần bù `"Loại khác"` còn thiếu (`voi` + `phuDinh`):**
   - Nhóm `84.13` (`4`): `84135090`, `84136090`, `8413709`, `84138119` (bù cho bơm nước `<= 13.000 m³/h` — bơm dầu/hóa chất mọi lưu lượng đều vào `"Loại khác"`).
   - Nhóm `84.14` (`4`): `84146019`, `841480`, `84148019`, `84148090` (bù cho nắp chụp hút `<= 120 cm` / `> 120 cm` và tủ hút HEPA phòng thí nghiệm).
   - Nhóm `84.15` (`4` cụm tách 2 chiều `công suất làm mát` × `lưu lượng khí mỗi dàn bay hơi`): `84158119`, `8415819:td1`, `84158219`, `84158319`.
   - Nhóm `84.18` (`4`): `84181039` (bù cho loại gia dụng `.31/.32`), `84186` (bù cho tủ kết đông cửa trên `<= 800 lít` / cửa trước `<= 900 lít`), `84186990` (bù cho máy làm lạnh nước `> 21,10 kW`), `84189990` (bù cho panel nhôm cán-ghép SEN `100–150 bar`).
   - Nhóm `84.19` (`1`): `8419509` (bù cho bộ trao đổi nhiệt ống fluoropolyme đường kính trong `<= 3 cm` và tháp làm mát).
4. **Luật 1, 2 & 3 — Bổ sung mảng `phuDinh` cho `25 NGUONG` phần bù thuần 1 chiều / De Morgan AND & tách nhánh `HOẶC`:**
   - `5` dòng ở `84.13` (`84137019`, `84137039`, `84137049` bù cho hợp đủ điện + không điện `<= 200 mm`, `84137059`, `84137099`).
   - `2` bản ghi ở `84143090` (De Morgan AND của phủ định `HOẶC` `8414.30.40`: đồng thời `<= 21,10 kW` VÀ `< 220 cc`, kèm tách rõ nhãn nhánh `HOẶC` trên `84143040:8401/:8402`) + `1` dòng `841459:td2` (`> 125 kW`).
   - `14` dòng ở `84.15` (`84151090`, `84152090`, `84158129`, `84158139`, `84158199`, `84158229`, `84158239`, `84158299`, `84158329`, `84158339`, `84158399`, `8415902:td2`, `8415903:td2`, `8415904:td2`).
   - `3` dòng ở `84.18` (`84182190`, `84183090`, `84184090`).

### 3. Đối soát Luật 6, Luật 8 & `data/ho-so/ranh-gioi/8413..8420*.json`

- **Quét 100% câu chứa số + đơn vị trong `bieu/nhom/pn/sen` (`84.13–84.20`):**
  - **Tổng số câu trúng số + đơn vị:** **69 câu** (`61` câu tầng biểu `bieu:8413..8420` + `8` câu hướng dẫn `nhom/sen`).
  - **Đã rút thành bản ghi `NGUONG`:** **65/69 câu** (`61/61` câu tầng biểu sinh `67 NGUONG` trực tiếp + `4` câu hướng dẫn `nhom:8415:ct:17#1`, `sen:84146011:1#3`, `sen:84148011:1#3`, `sen:84189940:1#4`, cộng `25 NGUONG` phần bù thuần 1 chiều / De Morgan AND = `96 NGUONG`).
  - **Đã ghi `BO_QUA` tường minh (Luật 6 & 8):** **3/69 câu** — `nhom:8418:ct:2#1` (`"trong khoảng 0°C hoặc thấp hơn"` → `hs:bieu:8418:7401`), `sen:84145930:1#1` & `sen:84145950:1#1` (`"ví dụ, một máy thổi khí thổi 0,5m3/s ở nhiệt độ phòng"` → `hs:bieu:84145930:7401`, `hs:bieu:84145950:7401`).
  - **Bỏ qua hợp lệ (lặp tiêu đề / số thứ tự / dẫn chiếu HS):** **1/69 câu** số+đơn vị (`sen:84195020:1#1` chỉ lặp tiêu đề `đường kính trong từ 3cm trở xuống` đã rút từ `bieu:84195020#1`), cùng `170` câu chỉ có số thứ tự mục, số hiệu mã HS (`84.13`–`84.20`, `87.02`–`87.04`…) hoặc số chân đầu nối (`3 chân hoặc 4 chân` ở `sen:84145910:1#8`).
- **Đối chiếu chỉ-đọc `data/ho-so/ranh-gioi/8413..8420*.json`:** **45/45 tệp**, **54/54 dòng `dieuKienSo`** đều được phủ 100% (`0` thiếu).
- **Nhóm không có ngưỡng định lượng trong Gói 2:** `84.16`, `84.17`, `84.20` (đã rà đủ 100% `bieu`/`nhom`/`pn`/`sen`).

---

## Rà ngược Gói 3 (`84.21–84.35`) — Hoàn tất theo 8 Luật M-74

- **Phạm vi xử lý:** 15 nhóm tiếp theo Chương 84 (`84.21, 84.22, 84.23, 84.24, 84.25, 84.26, 84.27, 84.28, 84.29, 84.30, 84.31, 84.32, 84.33, 84.34, 84.35`). Giữ nguyên 100% từng byte **359 bản ghi** ngoài phạm vi `84.21–84.35` (`259` bản ghi Gói 1+2 đã gộp ở #2461/#2466 + `100` bản ghi còn lại của `84.36–84.87` và phi-biểu ngoài Gói 3).
- **Sạch mã HS 100% trong `nguong.daiLuong` (kể cả mã ngoài Chương 84):**
  - `hs:bieu:8423:8401`: gỡ mã `90.16` khỏi `daiLuong` (`"độ nhạy cân (nhạy <= 5 cg thuộc 90.16)"` → `"độ nhạy cân"`), chuyển giải thích ranh giới sang `dieuKien`/`ghiChu` và giữ đúng chiều ở lại nút `> 5 cg` (Luật 4).
  - Rà sạch `0` mã HS bất kỳ (`84xx`, `82.10`, `90.16`…) và `0` `"thông số"` trong mọi `daiLuong` của Gói 3.

### 1. Thống kê trước / sau rà ngược (phạm vi `84.21–84.35`)

| Chỉ số (phạm vi `84.21–84.35`) | Trước rà (`origin/main`) | Sau rà (Gói 3) | Biến động |
|---|---:|---:|---|
| Tổng bản ghi `84.21–84.35` | 16 | **33** | `+17` thêm, `10` sửa, `0` bỏ (`6` giữ nguyên); giữ nguyên 100% `id` nền `:8401/:8402` |
| `NGUONG` | 16 | **19** | `+3` mới (`hs:bieu:84294050:7401` xe lu rung `> 20 tấn` phủ định `8429.40.40`; `hs:bieu:842952:7401` & `hs:bieu:84295200:7401` quay đủ `>= 360 độ`); `10` sửa chuẩn hóa (`8423` sạch mã `90.16`, `842389` bổ sung mảng `phuDinh`, `8422` nêu rõ nhánh gia dụng, `8421`/`8424`/`8429`/`8433` bổ sung `voi` + nhánh định tính) |
| `DINH_NGHIA` | 0 | **0** | Không có định nghĩa thuật ngữ chứa ngưỡng số trong `84.21–84.35` |
| `TACH_ANH_EM` | 0 | **11** | `+11` mới (Luật 1 & 2 De Morgan): `84212290`, `84212990`, `84213990`, `84248940`, `84248950`, `84248990`, `84294090`, `842959`, `84339020`, `84339030`, `84339090` |
| `BO_QUA` | 0 | **3** | `+3` mới (Luật 6 & 8): `hs:bieu:842211:7401` (`pn:842211:ct:1#2`), `hs:bieu:8424:7401` (`nhom:8424:ct:2#2`), `hs:bieu:842441:7401` (`pn:842441:ct:1#2`) |
| Bản ghi mang trường mảng `phuDinh` | 0 | **13** | `2 NGUONG` phần bù thuần 1 chiều (`842389`, `84294050`) + `11 TACH_ANH_EM` điều kiện ghép |
| `daiLuong` chứa mã HS (bất kỳ chương nào) / `"thông số"` | 1 / 0 | **0 / 0** | Sạch 100% |
| Cụm anh em `NGUONG` (`kiemDaiAnhEm`) | 3 | **4** | **4/4 phủ kín `(-∞, +∞)`** (`842121`, `84238`, `842382`, thêm mới `842940` xe lu rung `<= 20` / `> 20 tấn`), **0 chồng**, **0 hở** |
| Trùng `id` toàn kho `data/ho-so-ma/**/*.jsonl` | 0 | **0** | `0` va chạm (`id` thêm mới dùng đuôi `:7401`) |

### 2. Chi tiết nâng cấp theo 8 Luật M-74 trong Gói 3

1. **Luật 4 (chiều ở lại nút) & Luật 3 (sạch mã HS trong `daiLuong`):**
   - `hs:bieu:8422:8401` (`nhom:8422:ct:15#1`): giữ miền `> 10 kg` ở lại `84.22` (`<= 10 kg` sang `82.10`), làm rõ chỉ áp dụng cho nhánh thiết bị cơ khí gia dụng (Luật 3 & 4).
   - `hs:bieu:8423:8401` (`bieu:8423#1`): gỡ mã `90.16` khỏi `daiLuong` (`"độ nhạy cân"`), giữ miền `> 5 cg` ở lại `84.23` (`<= 5 cg` sang `90.16`).
   - `hs:bieu:842952:7401` & `hs:bieu:84295200:7401` (`bieu:842952#1` / `bieu:84295200#1`): bổ sung ngưỡng bị lọt do viết `"360o"` (chữ `o` thường) — `góc quay cơ cấu phần trên >= 360 độ`, kèm phần bù `TACH_ANH_EM` tại `bieu:842959`.
2. **Luật 1 & 2 — Phần bù thuần 1 chiều (`2 NGUONG` có `phuDinh`) & điều kiện ghép (`11 TACH_ANH_EM`):**
   - **Thuần 1 chiều:** `hs:bieu:842389:8401` (`> 5.000 kg`, bổ sung mảng `phuDinh: ["bieu:842381", "bieu:842382"]`) và thêm mới `hs:bieu:84294050:7401` (`Các loại xe lu rung lăn đường khác`, `> 20 tấn`, `phuDinh: ["bieu:84294040"]`) → khép kín cụm `bieu:842940` cho xe lu rung.
   - **Điều kiện ghép (`11 TACH_ANH_EM` mới, cấm gắn `NGUONG` đảo chiều):**
     - `84.21` (`3`): `84212290` (bù cho máy lọc đồ uống bằng điện `> 500 lít/giờ`), `84212990` (bù cho màng lọc fluoropolyme `<= 140 micron` + `.10–.50`), `84213990` (bù cho bộ lọc khí vỏ thép không gỉ `<= 1,3 cm` + `.20`).
     - `84.24` (`3`): `84248940`, `84248950`, `84248990` (bù cho bình phun bằng tay dùng trong gia đình `<= 3 lít` `.10` và `.20`).
     - `84.29` (`2`): `84294090` (xe lu tĩnh/không rung — bù cho máy đầm `.30` và xe lu rung `.40/.50`), `842959` (bù cho gàu tự xúc phía trước `8429.51` và phần trên quay `360°` `8429.52`).
     - `84.33` (`3`): `84339020`, `84339030`, `84339090` (bù cho bánh xe đẩy castor 2 chiều `(100; 250] mm` VÀ `> 30 mm` tại `8433.90.10`).

### 3. Đối soát Luật 6, Luật 8 & `data/ho-so/ranh-gioi/8421..8435*.json`

- **Quét 100% câu chứa số + đơn vị trong `bieu/nhom/pn/sen` (`84.21–84.35`):**
  - **Tổng số câu trúng số + đơn vị (gồm cả `360o` ở `8429.52`):** **22 câu** (`15` câu tầng biểu `bieu:8421..8435` + `7` câu tầng hướng dẫn `nhom/pn/sen`).
  - **Đã rút thành bản ghi `NGUONG`:** **16/22 câu** (`15/15` câu tầng biểu sinh `16 NGUONG` trực tiếp do `8433.90.10` có 2 chiều `mm`, cộng `1` câu `nhom:8422:ct:15#1` `> 10 kg`, cộng `2 NGUONG` phần bù thuần 1 chiều `842389` & `84294050` = `19 NGUONG`).
  - **Đã ghi `BO_QUA` tường minh (Luật 6 & 8):** **3/22 câu** — `pn:842211:ct:1#2` (bảng kích thước máy rửa bát đặt sàn 65/95/70 cm → `hs:bieu:842211:7401`), `nhom:8424:ct:2#2` (`"thường hoạt động dưới áp suất từ 3.000 đến 4.000 bars"`, `"2 đến 3 lần"` → `hs:bieu:8424:7401`), `pn:842441:ct:1#2` (`"ví dụ, áp suất hoạt động 3 bars, công suất 5 lít"` → `hs:bieu:842441:7401`).
  - **Bỏ qua hợp lệ (lặp ngưỡng đã rút ở biểu / số lượng đếm):** **3/22 câu** (`nhom:8423:ct:1#1` lặp `5 cg` của `bieu:8423#1`; `sen:84212960:1#1` lặp `140 micron` của `bieu:84212960#1`; `sen:84239030:1#1` nêu ví dụ loại bàn cân trục `"loại 2 bàn hoặc 4 bàn"` không phải ngưỡng đo lường), cùng `338` câu chỉ có dẫn chiếu mã HS và số thứ tự mục.
- **Đối chiếu chỉ-đọc `data/ho-so/ranh-gioi/8421..8435*.json`:** **49/49 tệp**, **9/9 dòng `dieuKienSo`** đều được phủ 100% (`0` thiếu).
- **9 nhóm không có ngưỡng định lượng trong Gói 3:** `84.25`, `84.26`, `84.27`, `84.28`, `84.30`, `84.31`, `84.32`, `84.34`, `84.35` (đã rà đủ 100% `bieu`/`nhom`/`pn`/`sen`).
