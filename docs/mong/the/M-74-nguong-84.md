# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 84 (+ Phần XVI)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/XVI.jsonl`: **2 bản ghi `NGUONG`** ở `phan:XVI` (`phan:XVI:kq:41#1` dung sai bi thép 84.82: `<= 1%` và `<= 0,05 mm`) — giữ nguyên không chạm.
  - `data/ho-so-ma/nguong/84.jsonl`: **355 bản ghi** (`315 NGUONG`, `39 TACH_ANH_EM`, `1 BO_QUA`) từ Chú giải Chương/Phân nhóm (`7`, `9`, `pn:4`), Phân nhóm/Nhóm/SEN và tên dòng biểu thuế `bieu:84*` (đã hoàn tất rà ngược **Gói 1: `84.01–84.12`**; giữ nguyên 100% từng byte **217 bản ghi** còn lại của `84.13–84.87` và các bản ghi phi-biểu ngoài Gói 1).
  - **Tổng toàn Chương 84 + Phần XVI: 357 bản ghi**, không chứa dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay thông số ví dụ/bảng mẫu tham khảo.
- **Áp dụng đầy đủ 3 quy ước QT chốt sau Chương 76 & 8 Luật M-74:**
  1. **Không lấy thông số ví dụ / bảng mẫu tham khảo:** lọc bằng `laCauViDuHoacBangMau()` (loại các dải minh họa trong Chú giải như `nhom:8424` 3.000–4.000 bar, `nhom:8448` khoảng 0,1–2 mm, `nhom:8455` xấp xỉ 30–520 cm, `pn:842211` bảng kích thước đặt sàn, `pn:842441` ví dụ 3 bar/5 lít, `sen:84145930` ví dụ 0,5 m³/s).
  2. **Bảng thành phần hợp kim:** Chương 84 không có bảng thành phần mác hợp kim kiểu `5182/5082`.
  3. **Dòng *"Loại khác"* phủ định anh em:** kế thừa 55 bản ghi *"Loại khác"* phần bù 1 khoảng duy nhất (bao gồm ca lấp khoảng giữa `(18,65; 100] kW` ở `bieu:8408909` giữa `.9010 <= 18,65` và `.905 > 100`, cùng đồng thời `<= 21,10 kW` và `< 220 cc` ở `bieu:84143090`), nay đang được nâng cấp theo từng gói để bổ sung trường mảng `phuDinh`, tách `TACH_ANH_EM` De Morgan cho điều kiện ghép và ghi `BO_QUA` cho câu mô tả thông thường (Luật 1–8).
- **Kiểm phân dải anh em & cặp đại lượng-đơn vị (`kiemDaiAnhEm` + `kiemDonViDaiLuong` + Cổng 3):**
  - Bắt cặp bắt buộc `daiLuong ↔ donVi` qua `kiemDonViDaiLuong()` (ví dụ chặn `công suất` gắn `mm`, `đường kính` gắn `kW`; giữ riêng `bieu:84603110` thành `công suất <= 0,74 kW` và `đường kính chuôi <= 3,175 mm`).
  - Tổng toàn Chương 84: **86 cụm anh em `NGUONG`** (**80 cụm phủ kín `(-∞, +∞)`**, **6 cụm hữu hạn đúng cấu trúc biểu**: `840732` thừa hưởng `(50; 250] cc`; `841350/841360/841370`; `8415819`; `848180:td6`). **0 lỗi chồng dải, 0 lỗi hở dải, 0 lỗi `voi`.**
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
