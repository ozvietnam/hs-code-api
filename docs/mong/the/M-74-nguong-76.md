# M-74 (#1966) — Rà ngược ngưỡng số và phân dải anh em — Chương 76

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, giữ nguyên `data/ho-so-ma/nguong/XV.jsonl` 6 bản ghi):**
  - `data/ho-so-ma/nguong/76.jsonl`: **44 bản ghi** (**34 `NGUONG`**, **4 `DINH_NGHIA`**, **3 `TACH_ANH_EM`**, **3 `BO_QUA`**), tổng **9 bản ghi có mảng `phuDinh`** (`6 NGUONG` phần bù thuần 1 chiều + `3 TACH_ANH_EM` phần bù điều kiện ghép theo Luật 2 De Morgan).
  - **Sạch mã HS 100% trong `nguong.daiLuong`:** **`0`** bản ghi chứa mã HS (`/(?:^|[^\d])76(?:\.\d{2}|\d{2})/` = `0`). Đã làm sạch `hs:bieu:76061232:7401` (`"độ dày (lá làm lon)"`) và `hs:bieu:76061232:7402` (`"chiều rộng (lá làm lon)"`).
  - **Đồng bộ mã sinh & kiểm Chương 76:** cập nhật `DAC_TA_NGUONG_76` và hỗ trợ `phuDinh` / `BO_QUA` trong `scripts/ho-so-ma/nguong.mjs`, đồng bộ `scripts/ho-so-ma/nguong-test.mjs` (`8` cụm thuần 1 chiều phủ kín, `9` dòng `phuDinh`, kiểm `TACH_ANH_EM` De Morgan và sạch mã `daiLuong`).

## 1. Thống kê trước / sau rà ngược (`data/ho-so-ma/nguong/76.jsonl`)

| Chỉ số | Trước rà (`main`) | Sau rà (`gpu-agy/m-74-c76`) | Biến động |
|---|---:|---:|---|
| Tổng bản ghi `76.jsonl` | 37 | **44** | `+7` thêm, `9` sửa, `0` bỏ |
| `NGUONG` | 35 | **34** | `-1` (`761699:7401` chuyển sang `TACH_ANH_EM`); `6` bổ sung `phuDinh`; `2` sạch mã `daiLuong` |
| `DINH_NGHIA` | 2 | **4** | `+2` (`hs:chuong:76:7408` Nhôm không hợp kim, `hs:chuong:76:7409` Hợp kim nhôm — Luật 5) |
| `TACH_ANH_EM` | 0 | **3** | `+1` chuyển từ `NGUONG` (`761699:7401`), `+2` mới (`76061239:7401`, `76169990:7401` — Luật 1 & 2) |
| `BO_QUA` | 0 | **3** | `+3` câu SEN mô tả thông thường (`sen:76061232:1#4`, `1#5`; `sen:76129010:1#5` — Luật 6 & 8) |
| Bản ghi mang mảng `phuDinh` | 0 | **9** | `6 NGUONG` thuần 1 chiều + `3 TACH_ANH_EM` điều kiện ghép |
| `daiLuong` chứa mã HS | 2 | **0** | Sạch 100% |
| Cụm anh em `NGUONG` thuần 1 chiều (`kiemDaiAnhEm`) | 9 (1 sai De Morgan) | **8** | **8/8 phủ kín**, `0` chồng, `0` hở |

## 2. Phân dải anh em: 8 cụm thuần 1 chiều (phủ kín) & 3 phần bù De Morgan (`TACH_ANH_EM`)

### 2a. 8 cụm anh em `NGUONG` thuần 1 chiều (8/8 phủ kín, 0 chồng, 0 hở)

| Cụm anh em (cha) | Đại lượng (đơn vị) | Các dải của từng nút | `phuDinh` | Căn cứ (`cau`) |
|---|---|---|---|---|
| `bieu:76` (`7606` ↔ `7607`) | chiều dày (`mm`) | `7607`: `(..0,2]` · `7606`: `(0,2..+∞)` | — | `bieu:7606#1`, `bieu:7607#1` |
| `bieu:76` (`7611` ↔ `7612`) | dung tích (`lít`) | `7612`: `(..300]` · `7611`: `(300..+∞)` | — | `bieu:7611#1`, `bieu:7612#1` |
| `bieu:76051` (`760511` ↔ `760519`) | kích thước mặt cắt ngang lớn nhất (`mm`) | `760519`: `(..7]` · `760511`: `(7..+∞)` | `760519`: `["bieu:760511"]` | `bieu:760511#1` |
| `bieu:760519` (`76051910` ↔ `76051990`) | đường kính (`mm`) | `76051910`: `(..0,0508]` · `76051990`: `(0,0508..+∞)` | `76051990`: `["bieu:76051910"]` | `bieu:76051910#1` |
| `bieu:76052` (`760521` ↔ `760529`) | kích thước mặt cắt ngang lớn nhất (`mm`) | `760529`: `(..7]` · `760521`: `(7..+∞)` | `760529`: `["bieu:760521"]` | `bieu:760521#1` |
| `bieu:760529` (`76052910` ↔ `76052990`) | đường kính (`mm`) | `76052910`: `(..0,254]` · `76052990`: `(0,254..+∞)` | `76052990`: `["bieu:76052910"]` | `bieu:76052910#1` |
| `bieu:7614101` (`76141011`/`.12`/`.19`) | đường kính (`mm`) | `.11`: `(..25,3]` · `.12`: `(25,3..28,28]` · `.19`: `(28,28..+∞)` | `.19`: `["bieu:76141011","bieu:76141012"]` | `bieu:76141011#1`, `76141012#1` |
| `bieu:7614901` (`76149011`/`.12`/`.19`) | đường kính (`mm`) | `.11`: `(..25,3]` · `.12`: `(25,3..28,28]` · `.19`: `(28,28..+∞)` | `.19`: `["bieu:76149011","bieu:76149012"]` | `bieu:76149011#1`, `76149012#1` |

### 2b. 3 phần bù `"Loại khác"` điều kiện ghép — `TACH_ANH_EM` (Luật 1 & Luật 2 De Morgan)

| Dòng `"Loại khác"` (`id`) | Cha | `phuDinh` | Phản ví dụ De Morgan (lý do cấm gắn `NGUONG` đảo chiều) |
|---|---|---|---|
| `hs:bieu:761699:7401` | `bieu:76169` | `["bieu:761691"]` | `7616.91` ghép **tấm đan/phên/lưới/rào** + dây `<= 6 mm` (CGPN 2). Sản phẩm khác bằng nhôm như nhôm bịt đầu bút chì (`7616.99.20`), đồng xèng (`7616.99.30`), móc/đồ đúc có tiết diện `<= 6 mm` không phải lưới dây vẫn vào `7616.99` → cấm gắn `NGUONG > 6 mm`. |
| `hs:bieu:76061239:7401` | `bieu:7606123` | `["bieu:76061232","bieu:76061233","bieu:76061234","bieu:76061235"]` | `.32` ghép công dụng làm lon + dạng cuộn + kích thước SEN; `.33` ghép hợp kim `5082/5182` + chiều rộng `> 1 m` + dạng cuộn; `.34`/`.35` ghép định tính. Lá hợp kim nhôm khác (vd AA3003) rộng `> 1 m` chưa gia công bề mặt vẫn vào `7606.12.39`. |
| `hs:bieu:76169990:7401` | `bieu:761699` | `["bieu:76169920","bieu:76169930","bieu:76169940","bieu:7616995","bieu:76169960","bieu:76169970","bieu:76169980"]` | `.30` ghép **đồng xèng hình tròn** + chiều dày `> 1/10` đường kính cùng 6 anh em định danh khác. Sản phẩm nhôm khác không phải đồng xèng hình tròn có tỉ lệ `> 1/10`, hoặc đồng xèng hình tròn dày `<= 1/10` đường kính, đều vào `7616.99.90`. |

## 3. Đối soát số + đơn vị & `ranh-gioi/76*.json` (Luật 6 & Luật 8)

- **Pháp lý Phần XV + Chương 76 + toàn bộ dòng biểu `bieu:76*`:**
  - Trúng theo biểu thức chuẩn skill (`%|mm|m|...`): **19 câu**; trúng theo biểu thức mở rộng (thêm `lít`, `1/10 chiều rộng/đường kính`): **27 câu** (gồm `4` câu `phan:XV:cg` đã có trong `XV.jsonl` + `4` câu `chuong:76:cgpn` + `19` câu `bieu:76*`).
  - **Đã rút thành bản ghi:** **26/27 câu** (`4/4` câu `phan:XV` ở `XV.jsonl`, `4/4` câu `chuong:76:cgpn` ở `76.jsonl`, `18/19` câu `bieu:76*` ở `76.jsonl`).
  - **Bỏ qua hợp lệ ở tầng biểu (`1/27`):** `bieu:76061234#1` (`"tấm litô hợp kim HA 1052 độ cứng H19 và hợp kim HA 1050 độ cứng H18"`) — chuỗi `1052`/`H19`/`1050`/`H18` là ký hiệu mác hợp kim và cấp độ cứng, không phải ngưỡng đo lường định lượng.
- **Tầng hướng dẫn `nhom:76*` và `sen:76*` (chứa số + đơn vị):**
  - `nhom:7606:ct:3#1`, `nhom:7607:ct:1#1`, `nhom:7607:ct:8#1` (**3 câu**): nhắc lại ngưỡng `0,2 mm` giữa `76.06` và `76.07` đã rút từ luật gốc `bieu:7606#1` và `bieu:7607#1`.
  - `sen:76061232:1#3` (**1 câu**): đã rút 2 `NGUONG` (`độ dày (lá làm lon)` `0,175..0,432 mm` kèm ghi nhận `CHONG_SEN_VOI_LUAT` với `76.07 <= 0,2 mm`; `chiều rộng (lá làm lon)` `254..1000 mm`).
  - `sen:76061233:1#1` & `1#2` (**2 câu**): tiêu đề lặp `chiều rộng > 1m` của `bieu:76061233#1`; bảng thành phần thông lệ đã rút thành **2 `DINH_NGHIA`** (`Hợp kim 5182`, `Hợp kim 5082`, không dựng `NGUONG` theo `laCauViDuHoacBangMau`).
  - `sen:76061232:1#4`, `sen:76061232:1#5`, `sen:76129010:1#5` (**3 câu**): thông số cơ tính điển hình (`262 MPa`, `345 Mpa`) và dải cỡ thùng tiêu chuẩn minh họa (`5L..50L…`) → đã ghi **3 bản ghi `BO_QUA`** tường minh theo Luật 6 & Luật 8.
  - `sen:76072010:1#6`, `1#8`, `1#9` (**3 câu**): bảng thông số sản phẩm ví dụ *UltraTouch* (`48 in. x 24 ft.`, `16,35 pound/1000 ft2`, `ASTM C1371-04a`) → bỏ qua hợp lệ theo `laCauViDuHoacBangMau()` và bảo toàn ca kiểm cứng `nguong-test.mjs` Ca 1 & Ca 6d (0 bản ghi trên `bieu:76072010`).
  - `sen:76169930:1#1` (**1 câu**): tiêu đề lặp lại tỷ lệ `chiều dày trên 1/10 đường kính` đã rút từ `bieu:76169930#1`.
- **Đối chiếu `data/ho-so/ranh-gioi/76*.json` (18 tệp):** cả **8/8 mã số có `dieuKienSo` dạng số** (`76051910`, `76052910`, `76061233`, `76141011`, `76141012`, `76149011`, `76149012`, `76169930`) đều được phủ 100% (`0` thiếu ở `nguong-test.mjs` Ca 4 & Ca 8).
- **Trùng `id` chéo toàn kho `data/ho-so-ma/**/*.jsonl`:** **`0`** (đã đối chiếu cả `liet-ke/76.jsonl` dùng đuôi `75xx` và `chuong/76.jsonl`).

## 4. Cổng kiểm chứng đã chạy

- `node scripts/ho-so-ma/nguong.mjs --tao` (tái tạo tất định `76.jsonl`, xác minh `XV.jsonl` không đổi byte nào)
- `node scripts/ho-so-ma/nguong.mjs --kiem`
- `node scripts/ho-so-ma/nguong-rut.mjs --chuong 76 --kiem`
- `node scripts/ho-so-ma/cong.mjs --pham-vi chuong:76 --cong 4,5`
- `node scripts/ho-so-ma/nguong-test.mjs` (đủ 8/8 ca)
- `node scripts/test-ho-so-ma.mjs`, `node scripts/test-ho-so-ma-tra.mjs`, `node scripts/test-lop-kho.mjs`
- `node scripts/dem-ca-test.mjs` (`0` ca đỏ, `EXIT=0`) và `scripts/kiem-pham-vi-the.mjs` (`PASS phạm vi M-74`).
