# Báo cáo KHET nhóm 8519 (OZV-1588)

> Bản dữ liệu cấu trúc đầy đủ theo điều 5 `docs/giao-viec/so-tay/KHET.md`: [`docs/giao-viec/so-tay/spec/8519-bao-cao-khet.json`](spec/8519-bao-cao-khet.json).

## 1. Số đo trên `origin/main` (`4c490809`)

- `node scripts/dem-nhom-sach.mjs --nhom=8519`:
  `8519: chua-duyet-ranh-gioi(1 pn6), dong-co-ten(4/15=26.7%<95%)`
- `node scripts/bo-kiem-luat.mjs --nhom=8519`:
  - Tổng 27 ca: `chotDung = 6`, `chotSai = 0`, `chotLoaiKhacSai = 0`, `hoi = 0`, `khongTheChot = 21`, `nemLoi = 0`.
  - `DONG_CO_TEN`: `4/15 = 26.7%` (4 ca chốt đúng: `85192010`, `85193000`, `85198920`, `85198930`).
  - `LOAI_TRU_LOAI_KHAC`: `2/6 = 33.3%` (`85192020`, `85198990`).
  - `THIEU_DU_KIEN`: `6/6 = 100.0%`.
- Trạng thái các phân nhóm 6 số có ranh giới:
  - `851920`: `DUYET` (XANH — PR #1478, #1481).
  - `851989`: `DUYET` (XANH).
  - `851981`: `NHAP` — đã giải DỪNG `.20` bằng hai khoá `coBoPhanKhuachDai` + `coLoa` (PR #1479, #1482), còn DỪNG duy nhất ở `85198110` (`THIEU_KHOA_TU_VUNG: kichThuocTungChieu`).

## 2. Kết quả đo các biến thể data-only trên farm cách ly (`/tmp/hs8519-farm`)

| Biến thể | Mô tả thử nghiệm | Kết quả đo / Cổng CLI | Kết luận |
|---|---|---|---|
| **Biến thể 1** | Giả định `85198110` gán `tenLoai` + `kichThuoc <= 170 mm` và `851981` chuyển `CLAUDE_DUYET` trên farm | `bo-kiem-luat --nhom=8519`: `chotDung 18/27`, `chotSai 0`, `chotLoaiKhacSai 0`, `nemLoi 0`; `LOAI_TRU_LOAI_KHAC 6/6`; **`DONG_CO_TEN 12/15 = 80.0% < 95%`** (vẫn hụt 3 ca: `85198110` `THIEU_SO_LIEU`, `85198910` `TRANH_CAP`, `85198940` `KHONG_THE_CHOT`) | Mở khóa `851981` giúp 8/9 ca `DONG_CO_TEN` và 4/4 ca `LOAI_TRU` của `851981` chốt đúng, nhưng trần tối đa vẫn chỉ đạt `12/15 = 80.0% < 95%` (mẫu số 15 đòi `15/15 = 100%` mới ≥ 95%). |
| **Biến thể 2a** | Thêm `phanConLai: true` vào `85198930` để khử `TRANH_CAP` với `85198910` | `so-hoa-ranh-gioi --kiem --pn6=851989` **ĐỎ (`EXIT=3`)**: `cong3-phan-con-lai-khong-co-chu-khac:85198930` | Chữ biểu `85198930` (`"Loại dùng cho điện ảnh hoặc phát thanh"`) không có chữ `"khác"` nên cổng 3 cấm gắn `phanConLai`. |
| **Biến thể 2b** | Thêm `{fact:"tenLoai", op:"TEN_LOAI", value:"Máy tái tạo âm thanh", chieu:"PHAI_KHONG"}` vào `85198930` | `so-hoa-ranh-gioi --kiem --pn6=851989` **ĐỎ (`EXIT=3`)**: `cong3-muc:85198930:dieu-kien-so-ten-loai-khong-co-trong-trich:Máy tái tạo âm thanh` | `lib/dieu-kien-so.js:223` bắt buộc giá trị `TEN_LOAI` phải có nguyên văn trong câu trích của chính dòng đó. |
| **Biến thể 3** | Thêm `data/tu-vung/ten-khac-8519.json` cho `85198940` (`"Thiết bị tái tạo âm thanh"` / `"Thiết bị tái tạo âm thanh khác"`) | `DK.coCumPhanBiet(..., "85198940")` trả `false`; `bo-kiem-luat` giữ nguyên (`0` ca cải thiện) | Mọi mục `ten-khac` đều qua `coCumPhanBiet(p, maHsGoc)` (`lib/dieu-kien-so.js:1024,1179`); toàn bộ âm tiết của `85198940` bị `tuChaCua("85198940")` lọc sạch. |

## 3. Cơ chế tường của 3 ca chặn trần (đều nằm ở tệp CẤM với thợ)

1. **`85198110` (`"Máy ghi âm cassette bỏ túi, kích thước không quá 170 mm x 100 mm x 45 mm"`) — Tường ở `lib/dieu-kien-so.js:192,285-291` và `lib/tu-vung.js`:**
   - `kiemDieuKien` (`lib/dieu-kien-so.js:192`) chỉ nhận `c.value` là một số đơn (`typeof c.value === 'number'`), còn `khoangDuKien` (`lib/dieu-kien-so.js:285-291`) gộp mảng kích thước 3 chiều `f.cacGiaTri` thành một khoảng vô hướng `[min, max]`. Mã hoá 1 ngưỡng `kichThuoc <= 170 mm` làm máy `160x120x50 mm` (vượt chiều 100 mm và 45 mm) lọt vào `.10` ⇒ bị `TRA_VE` lỗi (B) SUY RỘNG, buộc phải để `dieuKienSo: []` + `THIEU_KHOA_TU_VUNG: kichThuocTungChieu`.
   - Kể cả khi gán `kichThuoc <= 170 mm` trên farm, `TV.docGiaTri('kichThuoc', productText)` không đọc được chuỗi 3 chiều đứng sau cụm so sánh `"không quá 170 mm x 100 mm x 45 mm"` ⇒ trả `CHUA_BIET` (`THIEU_SO_LIEU`).

2. **`85198910` (`"Máy tái tạo âm thanh dùng trong điện ảnh"`) — `TRANH_CAP` với `85198930` (`"Loại dùng cho điện ảnh hoặc phát thanh"`) — Tường ở `lib/so-tay-gates.js:1050-1075,1184`:**
   - Trên mô tả của ca `85198910`, dòng `85198910` (`tenLoai: "Máy tái tạo âm thanh"` + `dungCho: "điện ảnh"`) chấm `THOA` tất định (nhờ âm tiết `"máy"` không nằm trong tên nhóm 4 số `8519`), đồng thời dòng `85198930` (`dungCho: ["điện ảnh", "phát thanh"]`) cũng chấm `THOA` tất định.
   - Bước rút gọn `thoa` trong `lib/so-tay-gates.js:1050-1075` chỉ lọc `phanConLai`, `loaiKhac`, `_ancNut` — không đọc `chongLanTruc` và không có luật ưu tiên dòng có `TEN_LOAI + CONG_DUNG` cụ thể hơn dòng chỉ có `CONG_DUNG` cùng giá trị.

3. **`85198940` (`"Thiết bị tái tạo âm thanh khác"`) — `KHONG_THE_CHOT (ranh-gioi-so-chu-khong-tat-dinh)` — Tường ở `lib/dieu-kien-so.js:841-864,1178-1192`:**
   - `tuChaCua("85198940")` nạp toàn bộ âm tiết của tên nhóm 4 số `8519` (`"Thiết bị ghi hoặc tái tạo âm thanh (+)."`) vào tập `cha`.
   - Mọi âm tiết của `"Thiết bị tái tạo âm thanh"` đều trùng tập `cha` (còn `"khác"` thuộc `TU_CHUNG_TEN_LOAI`) ⇒ `cumPhanBiet("Thiết bị tái tạo âm thanh", "85198940")` rỗng (`coCumPhanBiet === false`) ⇒ `danhGiaTuChu` trả `tatDinh: false` ⇒ `chotDong8` trả `KHONG_THE_CHOT (ranh-gioi-so-chu-khong-tat-dinh)`.

## 4. Lệnh tái hiện

```bash
node scripts/dem-nhom-sach.mjs --nhom=8519
node scripts/bo-kiem-luat.mjs --nhom=8519 --json
node scripts/so-hoa-ranh-gioi.mjs --kiem --pn6=851920
node scripts/so-hoa-ranh-gioi.mjs --kiem --pn6=851981
node scripts/so-hoa-ranh-gioi.mjs --kiem --pn6=851989
```
