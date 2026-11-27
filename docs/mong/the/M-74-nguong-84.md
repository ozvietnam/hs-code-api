# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 84 (+ Phần XVI)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/XVI.jsonl`: **2 bản ghi `NGUONG`** ở `phan:XVI` (`phan:XVI:kq:41#1` dung sai bi thép 84.82: `<= 1%` và `<= 0,05 mm`) — giữ nguyên không chạm.
  - `data/ho-so-ma/nguong/84.jsonl`: **404 bản ghi** (`311 NGUONG`, `81 TACH_ANH_EM`, `12 BO_QUA`) từ Chú giải Chương/Phân nhóm (`7`, `9`, `pn:4`), Phân nhóm/Nhóm/SEN và tên dòng biểu thuế `bieu:84*` (đã hoàn tất rà ngược **Gói 1: `84.01–84.12`**, **Gói 2: `84.13–84.20`**, **Gói 3: `84.21–84.35`**, **Gói 4: `84.36–84.50`**, **Gói 5: `84.51–84.65`** và **Gói 6: `84.66–84.80`**; giữ nguyên 100% từng byte **394 bản ghi** ngoài Gói 6 gồm `347` bản ghi Gói 1+2+3+4+5 và `47` bản ghi còn lại của `84.81–84.87` + phi-biểu ngoài Gói 6).
  - **Tổng toàn Chương 84 + Phần XVI: 406 bản ghi**, không chứa dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay thông số ví dụ/bảng mẫu tham khảo.
- **Áp dụng đầy đủ 3 quy ước QT chốt sau Chương 76 & 8 Luật M-74:**
  1. **Không lấy thông số ví dụ / bảng mẫu tham khảo:** lọc bằng `laCauViDuHoacBangMau()` (loại các dải minh họa trong Chú giải như `nhom:8424` 3.000–4.000 bar, `nhom:8448` khoảng 0,1–2 mm, `nhom:8455` xấp xỉ 30–520 cm, `pn:842211` bảng kích thước đặt sàn, `pn:842441` ví dụ 3 bar/5 lít, `sen:84145930` ví dụ 0,5 m³/s).
  2. **Bảng thành phần hợp kim:** Chương 84 không có bảng thành phần mác hợp kim kiểu `5182/5082`.
  3. **Dòng *"Loại khác"* phủ định anh em:** kế thừa 55 bản ghi *"Loại khác"* phần bù 1 khoảng duy nhất (bao gồm ca lấp khoảng giữa `(18,65; 100] kW` ở `bieu:8408909` giữa `.9010 <= 18,65` và `.905 > 100`, cùng đồng thời `<= 21,10 kW` và `< 220 cc` ở `bieu:84143090`), nay đang được nâng cấp theo từng gói để bổ sung trường mảng `phuDinh`, tách `TACH_ANH_EM` De Morgan cho điều kiện ghép và ghi `BO_QUA` cho câu mô tả thông thường (Luật 1–8).
- **Kiểm phân dải anh em & cặp đại lượng-đơn vị (`kiemDaiAnhEm` + `kiemDonViDaiLuong` + Cổng 3):**
  - Bắt cặp bắt buộc `daiLuong ↔ donVi` qua `kiemDonViDaiLuong()` (ví dụ chặn `công suất` gắn `mm`, `đường kính` gắn `kW`; giữ riêng `bieu:84603110` thành `công suất <= 0,74 kW` và `đường kính chuôi <= 3,175 mm`).
  - Tổng toàn Chương 84: **80 cụm anh em `NGUONG`** (**74 cụm phủ kín `(-∞, +∞)`**, **6 cụm hữu hạn đúng cấu trúc biểu**: `840732` thừa hưởng `(50; 250] cc`; `841350/841360/841370`; `8415819`; `848180:td6`). **0 lỗi chồng dải, 0 lỗi hở dải, 0 lỗi `voi`.**
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

---

## Rà ngược Gói 4 (`84.36–84.50`) — Hoàn tất theo 8 Luật M-74

- **Phạm vi xử lý:** 15 nhóm tiếp theo Chương 84 (`84.36, 84.37, 84.38, 84.39, 84.40, 84.41, 84.42, 84.43, 84.44, 84.45, 84.46, 84.47, 84.48, 84.49, 84.50`). Giữ nguyên 100% từng byte **369 bản ghi** ngoài phạm vi `84.36–84.50` (`292` bản ghi Gói 1+2+3 đã gộp ở #2461/#2466/#2469 + `77` bản ghi còn lại của `84.51–84.87` và phi-biểu ngoài Gói 4).
- **Sạch mã HS 100% trong `nguong.daiLuong` (Luật 3):**
  - `hs:bieu:844610:8401`: gỡ mã `(844610)` khỏi `daiLuong` (`"khổ rộng vải dệt (844610)"` → `"khổ rộng vải dệt"`) và gỡ `[844610]` khỏi `dieuKien`; tách rõ hai nhánh `> 30 cm` sạch mã HS (`"khổ rộng vải dệt (loại dệt thoi)"` trên `84462` và `"khổ rộng vải dệt (loại dệt không thoi)"` trên `844630`/`84463000`, kèm `duKien` trích nguyên văn `"loại dệt thoi"` / `"loại dệt không thoi"` và `voi` đủ 3 anh em).
  - Rà sạch `0` mã HS bất kỳ và `0` `"thông số"` trong mọi `daiLuong` của Gói 4.

### 1. Thống kê trước / sau rà ngược (phạm vi `84.36–84.50`)

| Chỉ số (phạm vi `84.36–84.50`) | Trước rà (`origin/main`) | Sau rà (Gói 4) | Biến động |
|---|---:|---:|---|
| Tổng bản ghi `84.36–84.50` | 23 | **26** | `+3` thêm, `10` sửa, `0` bỏ (`13` giữ nguyên); giữ nguyên 100% `id` nền `:8401/:8402` |
| `NGUONG` | 23 | **23** | `10` sửa chuẩn hóa (`844610` sạch mã HS + chuẩn hóa cụm `8446`, `844312:8401/:8402` bổ sung `voi` + làm rõ 2 chiều ghép, `4` dòng `"Loại khác"` ở `84.50` bổ sung mảng `phuDinh`) |
| `DINH_NGHIA` | 0 | **0** | Không có định nghĩa thuật ngữ chứa ngưỡng số trong `84.36–84.50` |
| `TACH_ANH_EM` | 0 | **2** | `+2` mới tại nhóm `84.43` (Luật 1 & 2 De Morgan): `hs:bieu:844313:7401` (`Máy in offset khác`) và `hs:bieu:844319:7401` (`Loại khác` dưới `8443.1`) |
| `BO_QUA` | 0 | **1** | `+1` mới (Luật 6 & 8): `hs:bieu:8448:7401` (`cau: "nhom:8448:ct:54#2"` — độ dày thông thường `"khoảng 0,1 tới 2mm"`) |
| Bản ghi mang trường mảng `phuDinh` | 0 | **6** | `4 NGUONG` phần bù thuần 1 chiều (`84501190`, `84501290`, `84501919`, `84501999`) + `2 TACH_ANH_EM` (`844313`, `844319`) |
| `daiLuong` chứa mã HS (bất kỳ chương nào) / `"thông số"` | 1 / 0 | **0 / 0** | Sạch 100% |
| Cụm anh em `NGUONG` (`kiemDaiAnhEm`) | 6 | **6** | **6/6 phủ kín `(-∞, +∞)`** (`84471`, `8450`, `845011`, `845012`, `8450191`, `8450199`), **0 chồng**, **0 hở** |
| Trùng `id` toàn kho `data/ho-so-ma/**/*.jsonl` | 0 | **0** | `0` va chạm (`id` thêm mới dùng đuôi `:7401`) |

### 2. Chi tiết nâng cấp theo 8 Luật M-74 trong Gói 4

1. **Luật 3 — Làm sạch mã HS `844610` và chuẩn hóa nhánh `84.46`:**
   - `hs:bieu:844610:8401`: `daiLuong: "khổ rộng vải dệt"` (`<= 30 cm`, áp cho cả dệt thoi và dệt không thoi), `voi: ["bieu:84462", "bieu:844630"]`.
   - `hs:bieu:84462:8401`: `daiLuong: "khổ rộng vải dệt (loại dệt thoi)"` (`> 30 cm`), `duKien: ["khổ rộng", "loại dệt thoi"]`.
   - `hs:bieu:844630:8401` & `hs:bieu:84463000:8401`: `daiLuong: "khổ rộng vải dệt (loại dệt không thoi)"` (`> 30 cm`), `duKien: ["khổ rộng", "loại dệt không thoi"]`.
2. **Luật 1 & 2 — Phần bù De Morgan tại `8443.1` (`2 TACH_ANH_EM`) và phần bù thuần 1 chiều tại `84.50` (`4 NGUONG` có `phuDinh`):**
   - `8443.12` ghép 2 chiều kích thước giấy không gấp (`<= 22 cm` VÀ `<= 36 cm`) + loại in offset theo tờ văn phòng → thêm `hs:bieu:844313:7401` (`Máy in offset khác`, `phuDinh: ["bieu:844311", "bieu:844312"]`) và `hs:bieu:844319:7401` (`Loại khác`, `phuDinh: ["bieu:844311".."bieu:844317"]`).
   - `84501190`, `84501290`, `84501919`, `84501999`: cả 4 dòng `"Loại khác"` đều tách thuần 1 chiều `sức chứa vải khô mỗi lần > 6 kg` (kế thừa `<= 10 kg` từ `8450.1`) → giữ `NGUONG` và bổ sung trường mảng `phuDinh` đầy đủ.
3. **Luật 6 & 8 — Ghi `BO_QUA` cho thông số mô tả thông thường ở `84.48`:**
   - `hs:bieu:8448:7401` (`nhom:8448:ct:54#2`): câu Chú giải chi tiết nêu `"tấm thép mỏng có độ dày khoảng 0,1 tới 2mm"` chỉ là mô tả kích thước thông thường (lọc bởi `laCauViDuHoacBangMau`), không phải ngưỡng phân loại cứng.

### 3. Đối soát Luật 6, Luật 8 & `data/ho-so/ranh-gioi/8436..8450*.json`

- **Quét 100% câu chứa số + đơn vị trong `bieu/nhom/pn/sen` (`84.36–84.50`):**
  - **Tổng số câu trúng số + đơn vị:** **19 câu** (`17` câu tầng biểu `bieu:8443/8446/8447/8450` + `2` câu tầng hướng dẫn `nhom:8443:ct:37#3` và `nhom:8448:ct:54#2`).
  - **Đã rút thành bản ghi `NGUONG`:** **17/19 câu** (`17/17` câu tầng biểu sinh `19 NGUONG` trực tiếp do `844312` và `84431200` mỗi nút có 2 chiều `<= 22 cm` & `<= 36 cm`, cộng `4 NGUONG` phần bù thuần 1 chiều ở `84.50` = `23 NGUONG`).
  - **Đã ghi `BO_QUA` tường minh (Luật 6 & 8):** **1/19 câu** (`nhom:8448:ct:54#2` → `hs:bieu:8448:7401`).
  - **Bỏ qua hợp lệ:** **1/19 câu** (`nhom:8443:ct:37#3` — `"Bản gốc chỉ cần được quét 1 lần để tạo ra nhiều bản copy"`, chỉ là mô tả quy trình quét số, không phải ngưỡng đo lường), cùng `487` câu chỉ có số thứ tự mục và dẫn chiếu mã HS.
- **Đối chiếu chỉ-đọc `data/ho-so/ranh-gioi/8436..8450*.json`:** **36/36 tệp**, **4/4 dòng `dieuKienSo`** (`84501110`, `84501210`, `84501911`, `84501991`) đều được phủ 100% (`0` thiếu).
- **10 nhóm không có ngưỡng định lượng trong Gói 4:** `84.36`, `84.37`, `84.38`, `84.39`, `84.40`, `84.41`, `84.42`, `84.44`, `84.45`, `84.49` (đã rà đủ 100% `bieu`/`nhom`/`pn`/`sen`).

---

## Rà ngược Gói 5 (`84.51–84.65`) — Hoàn tất theo 8 Luật M-74

- **Phạm vi xử lý:** 15 nhóm tiếp theo Chương 84 (`84.51, 84.52, 84.53, 84.54, 84.55, 84.56, 84.57, 84.58, 84.59, 84.60, 84.61, 84.62, 84.63, 84.64, 84.65`). Giữ nguyên 100% từng byte **373 bản ghi** ngoài phạm vi `84.51–84.65` (`318` bản ghi Gói 1+2+3+4 đã gộp ở #2461/#2466/#2469/#2471 + `55` bản ghi còn lại của `84.66–84.87` và phi-biểu ngoài Gói 5).
- **Sạch mã HS 100% trong `nguong.daiLuong` (Luật 3 — sửa trọn 3 điểm nóng `8452.10`):**
  - `hs:bieu:845210:8401`: `"công suất đầu ra mô tơ điện (8452.10)"` → `"công suất đầu ra mô tơ điện"` (giữ `den: 120`, `donVi: "W"`, tương thích Ca 1 `nguong-test.mjs` dòng 171).
  - `hs:bieu:845210:8402`: `"sức nặng đầu máy khâu không kèm mô tơ (8452.10)"` → `"sức nặng đầu máy khâu không kèm mô tơ"`.
  - `hs:bieu:845210:8403`: `"tốc độ khâu (8452.10)"` → `"tốc độ khâu (máy khâu xung động hoặc vải xéc)"`.
  - Rà sạch `0` mã HS bất kỳ và `0` `"thông số"` trong mọi `daiLuong` của Gói 5.
- **Giữ tương thích tuyệt đối Ca 1 `nguong-test.mjs` (dòng 171–175):**
  - `bieu:845210`: giữ `nguong.den === 120`.
  - `bieu:84603110`: giữ đúng `2` bản ghi `NGUONG` với `daiLuong === "công suất"` (`donVi: "kW"`, `den: 0.74`) và `daiLuong === "đường kính chuôi"` (`donVi: "mm"`, `den: 3.175`).

### 1. Thống kê trước / sau rà ngược (phạm vi `84.51–84.65`)

| Chỉ số (phạm vi `84.51–84.65`) | Trước rà (`origin/main`) | Sau rà (Gói 5) | Biến động |
|---|---:|---:|---|
| Tổng bản ghi `84.51–84.65` | 22 | **29** | `+7` thêm, `16` sửa, `0` bỏ (`6` giữ nguyên); giữ nguyên 100% `id` nền `:8401/:8402/:8403` |
| `NGUONG` | 22 | **20** | `-2` chuyển sang `TACH_ANH_EM` do lỗi De Morgan (`84519090:8401`, `84659290:8401`); `14` sửa chuẩn hóa (`3` phi-biểu `845210` sạch mã HS + Luật 3, `5` phần bù thuần 1 chiều bổ sung mảng `phuDinh`, `6` bản ghi điều kiện ghép bổ sung `voi`/`duKien`) |
| `DINH_NGHIA` | 0 | **0** | Không có định nghĩa thuật ngữ chứa ngưỡng số trong `84.51–84.65` |
| `TACH_ANH_EM` | 0 | **5** | `2` chuyển từ `NGUONG` sai De Morgan (giữ nguyên `id`: `hs:bieu:84519090:8401`, `hs:bieu:84659290:8401`) + `3` thêm mới (`hs:bieu:84522:7401`, `hs:bieu:84603190:7401`, `hs:bieu:84659590:7401`) |
| `BO_QUA` | 0 | **4** | `+4` mới (Luật 6 & 8): `hs:bieu:84513010:7401` (`sen:84513010:1#4`), `hs:bieu:8455:7401` (`nhom:8455:ct:23#3`), `hs:bieu:8456:7401` (`nhom:8456:ct:39#2`), `hs:bieu:8456:7402` (`nhom:8456:ct:39#3`) |
| Bản ghi mang trường mảng `phuDinh` | 0 | **10** | `5 NGUONG` phần bù thuần 1 chiều (`845129`, `84571090`, `84581190`, `84581990`, `84589990`) + `5 TACH_ANH_EM` (`84519090`, `84522`, `84603190`, `84659290`, `84659590`) |
| `daiLuong` chứa mã HS (bất kỳ chương nào) / `"thông số"` | 3 / 0 | **0 / 0** | Sạch 100% |
| Cụm anh em `NGUONG` (`kiemDaiAnhEm`) | 7 | **5** | **5/5 phủ kín `(-∞, +∞)`** (`84512`, `845710`, `845811`, `845819`, `845899`), **0 chồng**, **0 hở** (`-2` cụm ảo do gỡ lỗi De Morgan tại `845190` & `846592`; tổng Chương 84 đạt **80 cụm** (`74` phủ kín, `6` hữu hạn, khớp `>= 80` của `nguong-test.mjs` Ca 3)) |
| Trùng `id` toàn kho `data/ho-so-ma/**/*.jsonl` | 0 | **0** | `0` va chạm (`id` thêm mới dùng đuôi `:7401/:7402`) |

### 2. Chi tiết nâng cấp theo 8 Luật M-74 trong Gói 5

1. **Luật 3 — Làm sạch mã HS `(8452.10)` và ghi rõ nhánh `HOẶC` tại `8452.10` (`pn:845210:ct:1#3..#5`):**
   - Tách rõ 3 nhánh kỹ thuật của máy khâu gia đình `8452.10` (mục `b` mô tơ gắn kèm `<= 120 W`, mục `c` đầu máy không kèm mô tơ `<= 16 kg`, nhánh máy khâu xung động/vải xéc `<= 1.500 mũi/phút` kèm mô tơ gắn liền `<= 120 W`), nối `voi: ["bieu:84522"]`, sạch 100% mã `8452.10` khỏi `daiLuong`.
   - Thêm `hs:bieu:84522:7401` (`TACH_ANH_EM`, `phuDinh: ["bieu:845210"]`) cho nhánh `- Máy khâu khác:` (tránh đảo ngưỡng sai De Morgan vì máy khâu công nghiệp có đầu máy `<= 16 kg` vẫn vào `8452.2`).
2. **Luật 1 & 2 (De Morgan) — Sửa 2 lỗi đảo ngưỡng sai trong dữ liệu nền và khóa đủ 3 anh em `"Loại khác"` điều kiện ghép:**
   - **`hs:bieu:84519090:8401` (`NGUONG → TACH_ANH_EM`, giữ nguyên `id`):** `8451.90` gồm bộ phận của toàn nhóm `84.51`, trong đó có máy là (`8451.30`), máy quấn/gấp/cắt vải (`8451.50`), máy hoàn tất (`8451.80`) không đo sức chứa theo kg vải khô mỗi lượt; bộ phận máy cắt vải `8451.50` vào `8451.90.90` nên cấm đảo `NGUONG > 10 kg`.
   - **`hs:bieu:84659290:8401` (`NGUONG → TACH_ANH_EM`, giữ nguyên `id`):** `8465.92.10` ghép công dụng khắc vạch tấm mạch in/tấm dây in + đường kính chuôi `<= 3,175 mm`; máy phay gỗ dùng mũi chuôi `3 mm` vẫn vào `8465.92.90` nên cấm đảo `NGUONG > 3,175 mm`.
   - **Thêm `hs:bieu:84603190:7401` & `hs:bieu:84659590:7401` (`TACH_ANH_EM`):** khóa phủ định cho 2 dòng ghép đa chiều `8460.31.10` (`<= 0,74 kW` VÀ chuôi `<= 3,175 mm` + đồ gá kẹp ống + mài mũi khoan carbua) và `8465.95.10` (`> 50.000 vòng/phút` VÀ chuôi `<= 3,175 mm` + khoan tấm mạch in).
   - **5 phần bù thuần 1 chiều bổ sung mảng `phuDinh`:** `845129`, `84571090`, `84581190`, `84581990`, `84589990`.
3. **Luật 6 & 8 — Ghi `BO_QUA` tường minh cho 4 câu thông số điển hình / minh họa:**
   - `hs:bieu:84513010:7401` (`sen:84513010:1#4`): điện áp dân dụng điển hình `"120/240V"` trong SEN máy là trục đơn gia dụng.
   - `hs:bieu:8455:7401` (`nhom:8455:ct:23#3`): kích thước xấp xỉ minh họa trục cán thép (`"độ dài xấp xỉ từ 30 tới 520cm và có đường kính từ 18 đến 137 cm"`).
   - `hs:bieu:8456:7401` & `:7402` (`nhom:8456:ct:39#2,#3`): tốc độ phun điển hình `"gấp 2 đến 3 lần tốc độ âm thanh"` và áp suất điển hình `"3000 đến 4000 bar"` của máy cắt tia nước (tương ứng `nhom:8424:ct:2#2` ở Gói 3).

### 3. Đối soát Luật 6, Luật 8 & `data/ho-so/ranh-gioi/8451..8465*.json`

- **Quét 100% câu chứa số + đơn vị trong `bieu/nhom/pn/sen` (`84.51–84.65`):**
  - **Tổng số câu trúng số + đơn vị:** **17 câu** (`10` câu tầng biểu `bieu:8451/8457/8458/8460/8465` + `7` câu tầng hướng dẫn `pn:845210:ct:1#3..#5`, `nhom:8455:ct:23#3`, `nhom:8456:ct:39#2..#3`, `sen:84513010:1#4`).
  - **Đã rút thành bản ghi `NGUONG`:** **13/17 câu** (`10/10` câu tầng biểu sinh `12 NGUONG` trực tiếp do `84603110` và `84659510` mỗi nút có 2 chiều ghép + `3/3` câu `pn:845210:ct:1#3..#5` + `5 NGUONG` phần bù thuần 1 chiều = `20 NGUONG`).
  - **Đã ghi `BO_QUA` tường minh (Luật 6 & 8):** **4/17 câu** (`sen:84513010:1#4`, `nhom:8455:ct:23#3`, `nhom:8456:ct:39#2`, `nhom:8456:ct:39#3`).
  - **Bỏ qua hợp lệ ngoài số + đơn vị:** `nhom:8462:ct:22#2` (ví dụ số lượng con lăn `"từ 5 đến 11"` / `"thường từ 15 đến 23"`, không phải đại lượng đo lường) cùng `306` câu chỉ mang số thứ tự mục hoặc dẫn chiếu mã HS.
- **Đối chiếu chỉ-đọc `data/ho-so/ranh-gioi/8451..8465*.json`:** **44/44 tệp**, **7/7 dòng `dieuKienSo`** (`84571010`, `84581110`, `84581910`, `84589910`, `84603110`, `84659210`, `84659510`) đều được phủ 100% (`0` thiếu).
- **7 nhóm hoàn toàn không có bản ghi ngưỡng/bỏ qua trong Gói 5:** `84.53`, `84.54`, `84.59`, `84.61`, `84.62`, `84.63`, `84.64` (và `84.55`, `84.56` chỉ có `BO_QUA`; đã rà đủ 100% `bieu`/`nhom`/`pn`/`sen`).

---

## Rà ngược Gói 6 (`84.66–84.80`) — Hoàn tất theo 8 Luật M-74

- **Phạm vi xử lý:** **14 nhóm 4 số** tiếp theo Chương 84 (`84.66, 84.67, 84.68, 84.70, 84.71, 84.72, 84.73, 84.74, 84.75, 84.76, 84.77, 84.78, 84.79, 84.80`; biểu thuế không có `84.69`), gồm **2 nhóm vàng `84.71` và `84.79`**. Giữ nguyên 100% từng byte **394 bản ghi** ngoài phạm vi `84.66–84.80` (`347` bản ghi Gói 1–5 đã gộp ở #2461/#2466/#2469/#2471/#2473 + `47` bản ghi còn lại của `84.81–84.87` và phi-biểu ngoài Gói 6).

### 1. Biến động bản ghi phạm vi `84.66–84.80`

| Chỉ tiêu (phạm vi `bieu:8466*..8480*`) | Nền `origin/main` | Sau rà ngược Gói 6 | Biến động |
|---|---:|---:|---|
| Tổng bản ghi gói `84.66–84.80` | 8 | **10** | **`+2` thêm / `6` sửa / `0` bỏ** (`2` giữ nguyên; cả tệp `84.jsonl`: `402 → 404`) |
| `NGUONG` | 8 | **8** | Làm sạch mã HS trên 3 bản ghi `8470`, bổ sung `voi`/`duKien` trên `847130`, bổ sung mảng `phuDinh` trên `84743219`/`84743229` |
| `DINH_NGHIA` | 0 | **0** | Chú giải 6, 8 & CGPN 2 Ch.84 (`84.71`, `84.79`) định nghĩa định tính, không đặt ngưỡng đo số |
| `TACH_ANH_EM` | 0 | **2** | Thêm mới `hs:bieu:84714:7401` (phủ định De Morgan `8471.30`) & `hs:bieu:847190:7401` (`Loại khác` dưới `84.71`) |
| `BO_QUA` | 0 | **0** | Không có câu CGCT mô tả tính chất thông thường kèm đơn vị đo vật lý trong 14 nhóm |
| Bản ghi có trường mảng `phuDinh` | 0 | **4** | 2 `NGUONG` `"Loại khác"` thuần (`84743219`, `84743229`) + 2 `TACH_ANH_EM` (`84714`, `847190`) |
| `NGUONG` chứa mã HS trong `daiLuong` | 3 | **0** | **Sạch 100%** (`hs:bieu:8470:8401..8403`) |
| `NGUONG` chứa `"thông số"` trong `daiLuong` | 0 | **0** | Sạch 100% |

### 2. Các điểm chuẩn hoá chính trong Gói 6 (`84.66–84.80`)

- **Xóa sạch 3 mã HS trong `daiLuong` ở nhóm `84.70` & giữ nguyên tương thích Ca 1 `nguong-test.mjs` (Luật 3):**
  - `hs:bieu:8470:8401..8403` (`cau: "chuong:84:cg:9#1"` — Chú giải 9 Chương 84, khổ loại bỏ túi `170 × 100 × 45 mm`): bỏ `(loại bỏ túi 84.70)` → đổi thành `"kích thước chiều dài (máy tính loại bỏ túi)"` (`<= 170 mm`), `"kích thước chiều rộng (máy tính loại bỏ túi)"` (`<= 100 mm`), `"kích thước chiều dày (máy tính loại bỏ túi)"` (`<= 45 mm`).
  - Giữ nguyên `nut: "bieu:8470"`, `id` gốc và `den: 170` để đạt kiểm Ca 1 `nguong-test.mjs` (dòng 170: `x.nut === 'bieu:8470' && x.nguong?.den === 170`).
- **Xác nhận & chuẩn hóa 2 nhóm vàng `84.71` và `84.79` (chỉ-đọc `dieu-kien/84.jsonl` [66 bản ghi] & `bang-anh-em/84.jsonl` [11 bản ghi] — `0` tham chiếu `nguong` trong phạm vi `84.66–84.80`):**
  - **Nhóm vàng `84.71`:** `hs:bieu:847130:8401` (`<= 10 kg`) là điều kiện ghép *(loại xách tay VÀ khối lượng `<= 10 kg` VÀ gồm ít nhất một CPU, một bàn phím và một màn hình)*. Bổ sung `voi: ["bieu:84714"]`, `duKien: ["loại xách tay", "khối lượng"]` trên `847130`, đồng thời thêm mới **2 `TACH_ANH_EM` + `phuDinh`**:
    - `hs:bieu:84714:7401` (`bieu:84714` *"- Máy xử lý dữ liệu tự động khác:"*): phủ định De Morgan điều kiện ghép của `8471.30` (cấm gắn `NGUONG > 10 kg` vì máy tính để bàn/all-in-one/mini-PC `<= 10 kg` vẫn thuộc `8471.41`/`8471.49`).
    - `hs:bieu:847190:7401` (`bieu:847190` *"- Loại khác:"*): phủ định đồng thời 6 nhánh đứng trước (`847130`, `84714`, `847150`, `847160`, `847170`, `847180`), nhận nhánh đầu đọc từ/quang học và máy mã hóa dữ liệu sau dấu `;` của `84.71`.
    - Đối soát `chuong:84:cgpn:2#1` (*khái niệm "hệ thống" của `8471.49` gồm ít nhất 1 CPU, 1 bộ nhập, 1 bộ xuất*): định nghĩa cấu thành định tính, không phải ngưỡng đo số.
    - Đối soát `pn:847130:ct:1#1` (*"trọng lượng không quá 10 kg"*): nhắc lại ngưỡng pháp lý đã rút ở `hs:bieu:847130:8401` → bỏ qua hợp lệ; `nhom:8471:ct:16#2` (*"mã 6 bit tiêu chuẩn ISO"*): ví dụ minh họa mã ký tự trong ngoặc → bỏ qua hợp lệ.
  - **Nhóm vàng `84.79`:** `0` ngưỡng số trên toàn bộ dòng biểu `bieu:8479*`; `0` `dieuKienSo` trong `ranh-gioi/8479*.json`; `nhom:8479:ct:93#1` chỉ là false-hit chữ `"Chương 82 và"`, `ct:113#2` chỉ mô tả cấu tạo cầu hành khách (*"02 hoặc nhiều hơn các đường dẫn hình chữ nhật lồng vào nhau"*), `0` ngưỡng số bị sót và không cần `BO_QUA`.
- **Phủ đủ trường mảng `phuDinh` ở `84.74` (Luật 1):**
  - Bổ sung mảng `phuDinh: ["bieu:84743211"]` trên `hs:bieu:84743219:8401` và `phuDinh: ["bieu:84743221"]` trên `hs:bieu:84743229:8401` (2 dòng `"Loại khác"` thuần 1 chiều `> 80 tấn/giờ`, đồng bộ với `ghiChu`).

### 3. Bảng đối soát câu chứa chữ số + đơn vị theo Luật 6 (`84.66–84.80`)

| Nguồn câu (`84.66–84.80`) | Trúng số + đơn vị | Đã rút `NGUONG` | Ghi `BO_QUA` | Bỏ qua hợp lệ (nhắc lại luật / ví dụ / false-hit) | Chi tiết đối soát |
|---|---:|---:|---:|---:|---|
| Pháp lý Chú giải 9 Ch.84 (`chuong:84:cg:9#1`) | 1 | 1 | 0 | 0 | `hs:bieu:8470:8401..8403` (`<= 170 x 100 x 45 mm`, đã xóa mã HS `84.70` khỏi `daiLuong`) |
| Dòng biểu `bieu:8471*` (Nhóm vàng `84.71`) | 1 | 1 | 0 | 0 | `bieu:847130#1` (`<= 10 kg`) + 2 `TACH_ANH_EM` `84714`, `847190` |
| Dòng biểu `bieu:8474*` | 2 | 2 | 0 | 0 | `bieu:84743211#1`, `bieu:84743221#1` (`<= 80 tấn/giờ`) + 2 phần bù `NGUONG` `84743219`, `84743229` (`phuDinh`) |
| Dòng biểu 11 nhóm còn lại (`8466..8468, 8472, 8473, 8475..8480` gồm vàng `84.79`) | 0 | 0 | 0 | 0 | Chỉ chứa mã nhóm/phân nhóm dẫn chiếu (`84.56–84.65`, `84.70–84.72`, `85.15`, `85.17`, ...) |
| CGCT phân nhóm `8471.30` (`pn:847130:ct:1#1`) | 1 | 0 | 0 | **1** | Nhắc lại ngưỡng `<= 10 kg` đã rút từ `bieu:847130#1` (`hs:bieu:847130:8401`) |
| CGCT `84.71` (`nhom:8471:ct:16#2`) | 1 | 0 | 0 | **1** | Ví dụ minh họa hệ mã ký tự trong ngoặc (`"mã 6 bit tiêu chuẩn ISO"`), không phải ngưỡng phân loại |
| CGCT `8466, 8476, 8477, 8479 (vàng), 8480` (`ct:1#1`, `8#2`, `19#1`, `pn:847621/29`, `8477:ct:3#1`, `8479:ct:93#1`, `8480:ct:5#3`) | 0 | 0 | 0 | 0 | Các hit thô (`82 và`, `84.67 và`, `84.25 v.v..`, `8476.21 và`, `69.03 và`, `82.07 vì`) đều là false-hit mã HS đứng trước chữ `v`, không có đơn vị đo; `8479:ct:113#2` & `8480:ct:33#2` chỉ có số đếm cấu tạo (`02` đường dẫn / khuôn); `0` câu SEN toàn gói |
| **Tổng Gói 6 (`84.66–84.80`)** | **6** | **4** | **0** | **2** | **6/6 câu có số+đơn vị thực đã đối soát, `0` bỏ sót** |

### 4. Kiểm phân dải anh em, Ca 1 `nguong-test.mjs` & đối chiếu `ranh-gioi` (`84.66–84.80`)

- **Cụm anh em trong Gói 6 (`kiemDaiAnhEm` + Cổng 3):** **2/2 cụm phủ kín `(-∞, +∞)`** (`8474321`, `8474322` — `công suất (tấn/giờ)`), tổng toàn Chương 84 giữ nguyên **80 cụm** (`74` phủ kín, `6` hữu hạn, khớp `>= 80` của `nguong-test.mjs` Ca 3), **`0` chồng dải, `0` hở dải, `0` lỗi `voi`/`phuDinh`, `0` lỗi đơn vị**.
- **Ca 1 `nguong-test.mjs` (dòng 170):** `banGhi84.some(x => x.nut === 'bieu:8470' && x.nguong?.den === 170)` → **`PASS`**.
- **Tính lũy đẳng (`idempotent`):** Chạy `patch-c84-b6.mjs` lần 2 cho `editedCount: 0, insertedCount: 0`, đầu ra **khớp 100% từng byte** với lần 1; toàn bộ `394` dòng ngoài `84.66–84.80` giữ nguyên 100% từng byte.
- **Đối chiếu `data/ho-so/ranh-gioi/8466..8480*.json` (chỉ-đọc):** **45 tệp** (**2 dòng `dieuKienSo`** trên `84743211`, `84743221`) đều được phủ đầy đủ (`0` thiếu).
