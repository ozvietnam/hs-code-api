---
name: ho-so-nguong
description: >-
  Quy tắc và quy trình chuẩn của QT để rút ngưỡng số và phân dải anh em (thẻ M-74,
  data/ho-so-ma/nguong/<ch>.jsonl) trên kho ozvietnam/hs-code-api. Bắt buộc nạp
  skill này trước khi làm mới hoặc sửa PR tra-tho của M-74 cho mọi chương.
---

# Skill `ho-so-nguong` — Ngưỡng số & Phân dải anh em (M-74)

## 1. Mục đích & Phạm vi

Rút đầy đủ, chính xác mọi ngưỡng định lượng bắt buộc (`NGUONG`), định nghĩa chứa thông số (`DINH_NGHIA`), và phần bù anh em `"Loại khác"` (`TACH_ANH_EM` / `phuDinh`) của một Chương vào `data/ho-so-ma/nguong/<ch>.jsonl` kèm báo cáo đối soát `docs/mong/the/M-74-nguong-<ch>.md` — hoàn toàn từ văn bản luật gốc (`data/luat-goc/`), không dùng dữ liệu khách, không lặp lại các lỗi đã bị QT trả (`tra-tho`).

- **Nhánh & Worktree:** Nhánh `agy/m-74-c<ch>` tách sạch từ `origin/main` mới nhất trên git worktree cô lập.
- **Phạm vi tệp cứng (2 tệp):** Chỉ chạm `data/ho-so-ma/nguong/<ch>.jsonl` và `docs/mong/the/M-74-nguong-<ch>.md` (không sửa `<PHAN>.jsonl`, `scripts/`, `data/lop-kho.json`, `api/`, `lib/`).
- **Ưu tiên `tra-tho`:** Có bất kỳ PR nào đang gắn nhãn `tra-tho` thì bắt buộc sửa xong trước khi nhận chương mới; tuyệt đối không tự `gh pr merge`.

---

## 2. Tám Luật Bắt Buộc Của QT (Danh sách lỗi cấm & Ví dụ PR thật)

### Luật 1 — Đủ hai phía: có ngưỡng ở anh em cụ thể thì `"Loại khác"` phải có bản ghi bù (`phuDinh`)
- **Quy tắc:** Mọi nhóm anh em cùng cấp mà có ít nhất một dòng mang ngưỡng số thì dòng anh em `"Loại khác"` cùng cha bắt buộc phải có bản ghi phần bù (`phuDinh` liệt kê đủ mã các nút anh em cụ thể đứng trước).
- **Lỗi cấm (PR thật bị trả):**
  - `#2118` (nút tiêu đề trung gian `"Loại khác"` ở Ch.30 thiếu bản ghi bù `phuDinh` cho các dòng anh em mang ngưỡng số đứng trước).
  - `#2123` (`37029890` thiếu bản ghi bù cho các dòng khổ/chiều dài cụ thể cùng phân nhóm).
  - `#2127` (`25010099` thiếu bản ghi bù cho các dòng hàm lượng NaCl cụ thể).

### Luật 2 — Điều kiện GHÉP thì phần bù bắt buộc là `TACH_ANH_EM`, CẤM ghi khoảng số đảo
- **Quy tắc:** Khi nút anh em cụ thể ghép **ngưỡng số + điều kiện định tính khác** (công dụng, chất liệu, hình dạng, quy cách đóng gói lẻ…) hoặc **nhiều chiều thông số**, thì theo luật De Morgan $\neg(A \land B) \iff \neg A \lor \neg B$, dòng `"Loại khác"` vẫn nhận cả hàng không thoả điều kiện định tính dù trị số nằm trong khoảng của anh em. Do đó phần bù tại `"Loại khác"` bắt buộc ghi `loai: "TACH_ANH_EM"` với `voi` + `phuDinh` + `ghiChu: "phuDinh: ..."`, **TUYỆT ĐỐI KHÔNG** gắn `nguong` đảo chiều.
- **Chỉ dùng `NGUONG` cho `"Loại khác"` khi:** Các anh em cùng cha chỉ tách thuần tuý trên **một đại lượng số duy nhất** cùng bản chất hàng hóa (ví dụ `6004.10.10` hàm lượng sợi đàn hồi `≤ 20%` vs `6004.10.90` `"Loại khác"` `> 20%`).
- **Lỗi cấm (PR thật bị trả):**
  - `#2121` (`35069`: `3506.10` vừa đòi công dụng keo/chất kết dính đóng gói bán lẻ vừa `≤ 1 kg` → `35069` phải là `TACH_ANH_EM`, cấm gắn `> 1 kg`).
  - `#2127` (`25010099`: anh em ghép công dụng/dạng muối + hàm lượng NaCl → phần bù phải là `TACH_ANH_EM`).
  - `#2091` (`42021190`: anh em ghép loại sản phẩm + kích thước → phần bù phải là `TACH_ANH_EM`).

### Luật 3 — Ngưỡng theo NHÁNH HOẶC (trạng thái, phương pháp, loại/dạng sợi) phải tách riêng từng nhánh
- **Quy tắc:** Khi câu luật quy định nhiều ngưỡng theo các nhánh `HOẶC` (theo trạng thái bảo quản, phương pháp sản xuất, loại sợi monofilament/multifilament, dạng sợi monofilament hay dải, phép đo Bloom A hay B…):
  1. Mỗi nhánh tách thành **một bản ghi `NGUONG` riêng** gắn cùng nút và cùng `cau`.
  2. `dieuKien` ghi rõ tên nhánh ở đầu (ví dụ `"nhánh monofilament: …"`, `"nhánh dải: …"`, `"khi làm khô đơn giản: …"`, `"chỉ áp cho sợi monofilament: …"`).
  3. `daiLuong` ghi đúng tên đại lượng vật lý kèm nhánh (ví dụ `"kích thước mặt cắt ngang (monofilament)"`, `"chiều rộng bề mặt (dải và dạng tương tự)"` — **cấm** ghi mơ hồ kiểu `"thông số (mm)"`).
  4. `duKien` bắt buộc thêm cụm chỉ nhánh — **lưu ý Cổng 4 (`cong.mjs`):** mọi phần tử trong `duKien` bắt buộc là **chuỗi con nguyên văn** nằm trong câu luật `cau`, nên phải trích nguyên văn cụm chỉ nhánh có thật trong câu (ví dụ `"khi làm khô đơn giản"`, `"khi muối khô"`, `"bột giấy sản xuất bằng phương pháp sulphat hoặc kiềm"`, `"sợi monofilament"`, `"dải và dạng tương tự"`), tuyệt đối không gõ chuỗi tóm tắt ngoài câu làm gãy Cổng 4.
- **Lỗi cấm (PR thật bị trả):**
  - `#2140` (`4101.20` / `4101.20.00`): gộp 3 ngưỡng thành một ngưỡng `≤ 16 kg` làm da khô đơn giản 12 kg lọt sai vào `4101.20`. Đúng luật phải tách 3 `NGUONG` trên mỗi nút: `≤ 8 kg` (khi làm khô đơn giản), `≤ 10 kg` (khi muối khô), `≤ 16 kg` (ở dạng tươi, dạng muối ướt hoặc được bảo quản cách khác), `duKien` trích nguyên văn cụm trạng thái bảo quản trong câu (`"khi làm khô đơn giản"`, `"khi muối khô"`, `"ở dạng tươi"`, `"dạng muối ướt"`, `"được bảo quản cách khác"`).
  - `#2149` (`47.02`): tách đủ 3 `NGUONG` theo phương pháp sản xuất bột giấy: phần không hoà tan `≥ 92%` (bột sulphat hoặc kiềm), phần không hoà tan `≥ 88%` (bột sulphit), hàm lượng tro `≤ 0,15%` (bột sulphit), nêu điều kiện ngâm 1 giờ NaOH 18% ở 20°C và `duKien` trích nguyên văn cụm phương pháp sản xuất (`"bột giấy sản xuất bằng phương pháp sulphat hoặc kiềm"`, `"bột giấy sản xuất bằng phương pháp sulphit"`).
  - `#2164` (`54.02–54.05`):
    - Ở `bieu:5402`, `bieu:5403`: `"…kể cả sợi monofilament … có độ mảnh dưới 67 decitex"` chỉ mở rộng cho riêng monofilament (multifilament độ mảnh bất kỳ vẫn ở `54.02`/`54.03`) → `dieuKien`: `"chỉ áp cho sợi monofilament: dưới 67 decitex thì thuộc nhóm này (≥67 decitex sang 54.04/54.05)"`, `duKien` trích nguyên văn `"sợi monofilament"` (kèm giải thích phân biệt monofilament/multifilament trong `ghiChu`).
    - Ở `bieu:5404`, `5405`, `540500`, `54050000`: luật là `[monofilament ≥ 67 dtex VÀ kích thước mặt cắt ngang ≤ 1 mm]` **HOẶC** `[dải và dạng tương tự có chiều rộng bề mặt ≤ 5 mm]` — không được viết như 3 điều kiện `VÀ`. Phải ghi rõ `"nhánh monofilament: …"` / `"nhánh dải: …"`, `daiLuong` dùng `"kích thước mặt cắt ngang"` và `"chiều rộng bề mặt"`, `duKien` trích nguyên văn dạng sợi trong câu (`"Sợi monofilament"` hoặc `"dải và dạng tương tự"`).
  - `#2121`: độ bền đông tụ gelatin theo Bloom A hoặc B phải ghi rõ từng nhánh.

### Luật 4 — Khoảng số mô tả điều kiện ĐỂ Ở LẠI nút được gắn, CẤM ghi khoảng bị loại
- **Quy tắc:** Máy đọc trực tiếp khối `nguong: {tu, den, gomTu, gomDen}` làm điều kiện giữ lại tại `nut`, không đọc chữ giải thích trong `dieuKien`. Vì vậy:
  - Bản ghi gắn `nut: "bieu:XXXX"` bắt buộc mang khoảng số **để hàng ở lại `XXXX`**.
  - Chiều vượt ngưỡng bị đẩy sang nhóm/chương khác chỉ viết trong `dieuKien` để người đọc hiểu ranh giới.
- **Lỗi cấm (PR thật bị trả):**
  - `#2153` (`bieu:4903`): ghi ngược `{tu: 50, ...}` làm sách tranh thường bị đẩy khỏi `49.03`. Đúng: gắn `bieu:4903` với `{tu: null, den: 50, gomTu: false, gomDen: true}` (`≤ 50%` số trang thiết kế để cắt rời ở lại `49.03`; `> 50% → Chương 95` giữ trong `dieuKien`).
  - `#2170` (Chú giải 7(a) Ch.59): băng truyền/băng tải dệt dày `< 3 mm` thuộc `59.11` (từ `3 mm` trở lên thuộc `59.10`) → phải gắn `nut: "bieu:5911"` với `{tu: null, den: 3, gomTu: false, gomDen: false}`.

### Luật 5 — Ngưỡng nằm trong ĐỊNH NGHĨA vẫn phải tách `NGUONG` riêng ngoài `DINH_NGHIA`
- **Quy tắc:** Khi một chú giải định nghĩa thuật ngữ pháp lý (ví dụ `"bột giấy gỗ hoà tan"`, `"dạng bột"`, `"hàng dệt phủ tường"`) mà nội dung định nghĩa chứa các ngưỡng số quyết định phân loại vào nhóm/phân nhóm, bắt buộc:
  1. Giữ bản ghi `DINH_NGHIA` cho thuật ngữ nguyên văn; **VÀ**
  2. Tách thêm các bản ghi `NGUONG` gắn trực tiếp vào nút nhóm/phân nhóm dùng thuật ngữ đó (`bieu:XXXX` / `bieu:XXXXXX`).
- **Lỗi cấm (PR thật bị trả):**
  - `#2149` (Ch.47): chỉ ghi `DINH_NGHIA` cho `"bột giấy gỗ loại hoà tan"` ở Chú giải 1 mà quên tách 3 bản ghi `NGUONG` (`≥ 92%`, `≥ 88%`, tro `≤ 0,15%`) gắn vào `bieu:4702`.

### Luật 6 — Tự kiểm toàn bộ số + đơn vị, phân biệt con số mô tả thông thường (`#1966`) và ghi số đối soát vào thẻ docs
- **Quy tắc:** Không làm mò theo trí nhớ. Phải chạy lệnh dò mọi câu chứa chữ số + đơn vị đo lường trong chú giải pháp lý (`chuong` phần `cg`/`cgpn`, `phan` phần `cg`), toàn bộ dòng biểu (`bieu`), chú giải chi tiết (`nhom`, `phan-nhom`, `sen`) và `data/ho-so/ranh-gioi/<ch>*.json`.
- **Chỉ đạo của QT tại `#1966` (con số mô tả tính chất thông thường ≠ ngưỡng phân loại):** Con số nằm trong câu mô tả tính chất thông thường (`"thường có…"`, `"thường chứa…"`, `"thường được xay xát…"`, `"thường hoạt động ở…"`, `"khoảng…"`, `"xấp xỉ…"`) **KHÔNG phải** ngưỡng phân loại → bắt buộc ghi bản ghi `loai: "BO_QUA"` kèm `lyDo` tường minh tại đúng nút chủ câu (`nut: "bieu:<mã>"` đối với câu `sen:<mã>:...`, `id: "hs:bieu:<mã>:74NN"`, kèm `cau`, `van`), **tuyệt đối không ghi `NGUONG`**, **không xoá im lặng làm lọt câu**, và **tuyệt đối không sửa `data/ho-so/ranh-gioi/`**.
- Trong `docs/mong/the/M-74-nguong-<ch>.md`, bắt buộc ghi rõ thống kê đối soát: **tổng số câu trúng số+đơn vị / số câu đã rút thành bản ghi / số câu bỏ qua hợp lệ** (số hiệu nhóm/chương, số thứ tự khoản, con số mô tả thông thường `"thường có…"`, `"thường chứa…"`, `"thường được xay xát…"`, `"thường hoạt động ở…"`, `"khoảng…"`, `"xấp xỉ…"`).

### Luật 7 — Chú giải phạm vi nhóm/phân nhóm (`"Theo mục đích của nhóm XX.XX…"`) gắn `bieu:XXXX`, CẤM gắn `chuong:NN`
- **Quy tắc:** Khi chú giải chương hoặc chú giải phân nhóm giới hạn phạm vi cho nhóm/phân nhóm cụ thể (`"Theo mục đích của nhóm XX.XX…"`, `"Trong nhóm XX.XX…"`, `"Nhóm XX.XX chỉ áp dụng cho…"`, `"Theo mục đích của phân nhóm XXXX.XX…"`), bản ghi `NGUONG` bắt buộc gắn vào đúng nút nhóm/phân nhóm đó (`bieu:XXXX` hoặc `bieu:XXXXXX`), **tuyệt đối không gắn `nut: "chuong:NN"`** (vì gắn `chuong:NN` sẽ biến điều kiện riêng của một nhóm thành điều kiện lọc cho cả chương).
- **Lỗi cấm (PR thật bị trả / nhắc trên `#1922`):**
  - `#2170` Chú giải 7(a) Ch.59 liệt kê hàng thuộc `59.11` → phải gắn `bieu:5911`, cấm gắn `chuong:59`.
  - Chú giải 1 Ch.55 (`"Theo mục đích của nhóm 55.01 và 55.02…"`) chỉ áp cho `55.01`/`55.02` → gắn `bieu:5501` / `bieu:5502`, không gắn `chuong:55`.

### Luật 8 — Con số mô tả thông thường ở chú giải/SEN hoặc khi bác `dieuKienSo` của `data/ho-so/ranh-gioi/`: bắt buộc ghi `BO_QUA` tại chủ câu `bieu:<mã>` (cấm ghi `NGUONG`, cấm xoá im lặng làm lọt câu, cấm sửa `ranh-gioi`)
- **Quy tắc:** Cổng 4 của `scripts/ho-so-ma/nguong-test.mjs` (`doiChieuRanhGoi`) đối chiếu `data/ho-so/ranh-gioi/<ch>*.json` và đòi mọi mã có `dieuKienSo` phải có ít nhất một bản ghi gắn vào `nut: "bieu:<mã>"` (hoặc nút con của nó) trong `data/ho-so-ma/nguong/<ch>.jsonl`. Theo chỉ đạo của QT tại `#1966`: con số nằm trong câu mô tả tính chất thông thường (`"thường có…"`, `"thường chứa…"`, `"thường được xay xát…"`, `"thường hoạt động ở…"`, `"khoảng…"`, `"xấp xỉ…"` theo Luật 6) — kể cả trong chú giải/SEN hay khi bác một `dieuKienSo` ghi nhầm trong `ranh-gioi` — **KHÔNG phải** ngưỡng phân loại → bắt buộc ghi bản ghi `loai: "BO_QUA"` kèm `lyDo` tường minh tại đúng nút chủ câu (`nut: "bieu:<mã>"` đối với câu `sen:<mã>:...`, `id: "hs:bieu:<mã>:74NN"`, `cau`, `van` SHA-256 64 hex), **tuyệt đối không ghi `NGUONG`**, **không xoá im lặng làm lọt câu**, và **tuyệt đối không sửa `data/ho-so/ranh-gioi/`** (kho hồ sơ cũ đường khách còn đọc).
- **Lỗi cấm (PR thật / nhận xét QT tại `#1966`):**
  - `#2375` & `#1966` (Ch.23, `bieu:23040021`, `cau: "sen:23040021:1#2"`): câu SEN `"Sản phẩm thường chứa…"` (độ ẩm `≤ 12%`, protein `≥ 46%`, béo `< 1,5%`, xơ `≤ 7%`, tro `≤ 6,5%`) hay các câu `"thường có…"`, `"thường được xay xát…"`, `"thường hoạt động ở…"` chỉ là mô tả thông thường (Luật 6), nhưng `data/ho-so/ranh-gioi/230400.json` ghi nhầm thành `dieuKienSo`. Ghi thành `NGUONG` là sai bản chất pháp lý; còn bỏ 5 bản ghi `NGUONG` tại `bieu:23040021` mà xoá im lặng thì làm lọt câu và khiến `nguong-test.mjs` ca 4 đỏ (`thiếu NGUONG cho bieu:23040021`). Sửa đúng: ghi `loai: "BO_QUA"` tại chủ câu `nut: "bieu:23040021"`, `cau: "sen:23040021:1#2"`, `id: "hs:bieu:23040021:74NN"`, `lyDo: "Câu SEN mô tả thông thường (Sản phẩm thường chứa…), không đặt ngưỡng phân loại (Luật 6); tham khảo ranh-gioi/230400.json ghi nhầm thành điều kiện số"`, không chạm `data/ho-so/ranh-gioi/`.

---

## 3. Các Bước Thực Hiện Chuẩn

1. **Chuẩn bị nhánh sạch trên worktree cô lập:**
   `git checkout -B agy/m-74-c<ch> origin/main` (hoặc `git checkout agy/m-74-c<ch>` khi vá PR `tra-tho` — thêm commit mới nối tiếp, không force-push).
2. **Quét toàn diện câu có số + đơn vị & `ranh-gioi`:** Chạy lệnh tự kiểm ở Mục 4 để liệt kê toàn bộ ứng viên trong chương `<ch>`.
3. **Soạn `data/ho-so-ma/nguong/<ch>.jsonl` kiểm chiếu từng bản ghi qua đủ 8 Luật:**
   - Kiểm tra nút gắn (`bieu:XXXX` vs `chuong:NN` theo Luật 7).
   - Kiểm tra chiều khoảng số ở lại nút (Luật 4).
   - Tách từng nhánh `HOẶC` + `duKien` phân nhánh (Luật 3).
   - Tách `NGUONG` từ `DINH_NGHIA` (Luật 5).
   - Bổ sung đầy đủ anh em `"Loại khác"` (`phuDinh` theo Luật 1; `TACH_ANH_EM` không khoảng số nếu điều kiện ghép theo Luật 2).
   - Khi gặp con số nằm trong câu mô tả tính chất thông thường (`"thường có…"`, `"thường chứa…"`, `"thường được xay xát…"`, `"thường hoạt động ở…"`, `"khoảng…"`, `"xấp xỉ…"` theo Luật 6 & chỉ đạo QT tại `#1966`) hoặc khi bác một `dieuKienSo` của `data/ho-so/ranh-gioi/<ch>*.json`, bắt buộc ghi bản ghi `loai: "BO_QUA"` kèm `lyDo` tường minh tại đúng nút chủ câu (`nut: "bieu:<mã>"` đối với câu `sen:<mã>:...`) theo Luật 6 & Luật 8 — tuyệt đối không ghi `NGUONG`, không xoá im lặng làm lọt câu, và tuyệt đối không sửa `data/ho-so/ranh-gioi/`.
   - Mọi `trich` khớp nguyên văn từng ký tự trong câu `cau` và `van` khớp SHA-256 64 hex.
4. **Ghi báo cáo `docs/mong/the/M-74-nguong-<ch>.md`:** Nêu rõ tổng số bản ghi (`NGUONG`, `DINH_NGHIA`, `TACH_ANH_EM`, `BO_QUA`), số `phuDinh`, và thống kê số câu trúng số+đơn vị / số câu đã xử lý (Luật 6).
5. **Chạy trọn bộ lệnh tự kiểm & kiểm toán độc lập `oz-pr-auditor`** đạt `APPROVE` trước khi `git push` và báo `XONG` / `CẬP NHẬT` trên `#1966`.

---

## 4. Lệnh Tự Kiểm Trước Khi Nộp

```bash
CH="<ch>"

# 1. Dò mọi câu chứa chữ số + đơn vị trong chú giải pháp lý (Phần + Chương) & dòng biểu của chương (Luật 6)
node --input-type=module -e '
import { createRequire } from "node:module";
import { napLuatCong } from "./scripts/ho-so-ma/cong.mjs";
const require = createRequire(import.meta.url);
const { CHUONG_SANG_PHAN } = require("./lib/do-thi/dan-chieu.js");
const ch = String(process.argv[1]).padStart(2, "0");
const phan = CHUONG_SANG_PHAN[ch];
const luat = napLuatCong();
const re = /(?:^|[^\p{L}])\d+(?:[.,]\d+)?\s*(?:%|mm|cm|m|m2|m²|m3|m³|kg|g|mg|l|ml|g\/m²|g\/m2|g\/cm³|decitex|dtex|tex|micron|micromet|°C|độ|vòng\/m|W|kW|V|kV|Hz|bar|MPa|atm|năm|giờ|phút|lỗ\/cm²)(?=$|[^\p{L}])/iu;
const ids = [...luat.cau.keys()].filter(id =>
  (phan && id.startsWith(`phan:${phan}:cg`)) ||
  id.startsWith(`chuong:${ch}:cg`) ||
  new RegExp(`^bieu:${ch}\\d`).test(id)
);
const hits = ids.map(id => ({ id, text: luat.chuCau(id) })).filter(x => re.test(x.text));
console.log(`Trúng số+đơn vị (pháp lý Phần ${phan || "?"} + Ch.${ch} + dòng biểu): ${hits.length} câu`);
for (const h of hits) console.log(" -", h.id, "=>", h.text);
' "$CH"

# 2. Chạy cổng 4,5 M-74, bộ test ngưỡng, hồ sơ mã, lớp kho và đếm ca thực tế
{
  node scripts/ho-so-ma/cong.mjs --pham-vi "chuong:${CH}" --cong 4,5 &&
  node scripts/ho-so-ma/nguong-test.mjs &&
  node scripts/test-ho-so-ma.mjs &&
  node scripts/test-ho-so-ma-tra.mjs &&
  node scripts/test-lop-kho.mjs;
} > "/tmp/m74-c${CH}.log" 2>&1; echo "EXIT=$?" >> "/tmp/m74-c${CH}.log"

node scripts/dem-ca-test.mjs "/tmp/m74-c${CH}.log"

# 3. Kiểm tra cứng phạm vi 2 tệp của thẻ M-74
git diff --name-only origin/main...HEAD | node scripts/kiem-pham-vi-the.mjs "[M-74] Ngưỡng chương ${CH}" "agy/m-74-c${CH}"
```

## Đánh số id (bắt buộc, 27/11)
- id bản ghi M-74 có dạng `hs:<nut>:74NN` (đuôi bắt đầu bằng 74), KHÔNG đánh theo số chương. Lý do: PR M-74 và M-75 cùng chương đánh 91xx → trùng `hs:chuong:91:9101` giữa nguong/91 và liet-ke/91, cổng khuôn đỏ cho mọi PR sau (sửa ở #2300). Trước khi nộp, kiểm id không trùng với tệp anh em đã có trên main.
