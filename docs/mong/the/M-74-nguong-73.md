# Báo cáo M-74 — Rà ngược ngưỡng số và phân dải anh em Chương 73

- **Thẻ:** `#1966` (`M-74`) · **Nhánh:** `gpu-agy/m-74-c73` (tách sạch từ `origin/main`, khóa phạm vi đúng 2 tệp: `data/ho-so-ma/nguong/73.jsonl` và `docs/mong/the/M-74-nguong-73.md`).
- **Kho xuất:** [`data/ho-so-ma/nguong/73.jsonl`](../../../data/ho-so-ma/nguong/73.jsonl) — **141 bản ghi** (nguồn thuần `data/luat-goc/`, 0 `tb:`, 0 `wco:`, 0 `gir:`, 0 dữ liệu khách).
- *(Lưu ý: `data/ho-so-ma/nguong/XV.jsonl` gồm 6 bản ghi Phần XV đã có sẵn trên `origin/main`; Chương 73 không nhân bản lại Phần XV và không chạm `data/ho-so/ranh-gioi/`.)*

## 1. Thống kê Trước / Sau rà ngược

| Chỉ số | Bản gốc trên `main` | Sau rà ngược (`gpu-agy/m-74-c73`) | Biến động |
|---|---:|---:|---|
| Tổng số bản ghi | 125 | **141** | +16 bản ghi mới, 5 chuyển đổi `NGUONG` → `TACH_ANH_EM`, 52 sửa chuẩn hóa, 68 giữ nguyên, 0 xóa im lặng |
| `NGUONG` | 125 | **120** | −5 (chuyển 5 dòng "Loại khác" điều kiện ghép sang `TACH_ANH_EM` theo Luật 2 De Morgan) |
| `DINH_NGHIA` | 0 | **1** | +1 (`hs:chuong:73:7401` định nghĩa `"dây"` Chú giải 2 Chương 73 theo Luật 5) |
| `TACH_ANH_EM` | 0 | **18** | +18 (5 chuyển từ `NGUONG` đảo sai De Morgan + 13 bổ sung mới cho các dòng `"Loại khác"` / `"… khác"` còn thiếu theo Luật 1 & 2) |
| `BO_QUA` | 0 | **2** | +2 (`hs:bieu:73089060:7401`, `hs:bieu:73089060:7402` cho câu SEN mô tả thông thường `sen:73089060:1#5/#6` theo Luật 6 & 8) |
| Bản ghi có mảng `phuDinh` | 0 | **62** | +62 (30 `NGUONG` phần bù thuần + 14 `NGUONG` `"Loại khác, có…"` + 18 `TACH_ANH_EM`) |
| `daiLuong` chứa mã HS (`73xx` / `73.xx`) | 5 | **0** | Sạch 100% mã dòng/nhóm HS trong `daiLuong` |
| Cụm anh em `kiemDaiAnhEm` (kèm `XV.jsonl`) | 44 (43 phủ kín) | **39 (38 phủ kín)** | 0 chồng, 0 hở (5 cụm giảm là 5 cụm điều kiện ghép đã chuyển đúng sang `TACH_ANH_EM`; 1 cụm không phủ `(-∞,+∞)` là CNG/LNG `73110021/22` vì `< 30 lít` rơi sang `73110026`) |
| Định danh bản ghi mới/chuyển đổi (`hs:<nut>:74NN`) | 0 | **21** | 0 trùng `id` với toàn bộ `data/ho-so-ma/**/*.jsonl` (kể cả `liet-ke/73.jsonl`) |

## 2. Chi tiết các nhóm sửa & bổ sung theo Luật 1–8

1. **Sạch 100% mã HS trong `daiLuong` (`5 → 0`):**
   - `hs:bieu:7305:7301`: bỏ `73.03–73.04` → `"đường kính ngoài (ống mặt cắt ngang hình tròn, hàn/tán đinh/ghép tương tự)"`.
   - `hs:bieu:7306:7301` → chuyển sang `TACH_ANH_EM` `hs:bieu:7306:7401` (xem mục 2 bên dưới).
   - `hs:bieu:73069097:7301/7302/7303`: bỏ `7306.90.9` → `"đường kính trong (ống và ống dẫn loại khác)"`, `"đường kính ngoài (ống và ống dẫn loại khác)"`, `"hàm lượng carbon"`.
   - Chuẩn hóa `hs:bieu:73182310:7301` & `hs:bieu:73182390:7301` (đinh tán) dùng `"đường kính ngoài"` khớp đúng chữ luật.
2. **Sửa 5 ca đảo ngưỡng sai De Morgan (Luật 2 — `NGUONG` → `TACH_ANH_EM` có `voi` + `phuDinh`):**
   - `bieu:7306` (`hs:bieu:7306:7401`): `73.05` ghép ống mặt cắt ngang hình tròn VÀ `OD > 406,4 mm`; `73.06` nhận cả ống mặt cắt không tròn (`7306.61/69`) và thanh hình rỗng mọi kích thước.
   - `bieu:73042290` (`hs:bieu:73042290:7401`) & `bieu:73042390` (`hs:bieu:73042390:7401`): anh em `.10` ghép giới hạn chảy `< 80.000 psi` VÀ không có ren ở đầu ống; dòng `.90` nhận cả ống có ren với giới hạn chảy `< 80.000 psi`.
   - `bieu:73045990` (`hs:bieu:73045990:7401`) & `bieu:73053990` (`hs:bieu:73053990:7401`): anh em `.10` ghép ống dẫn chịu áp lực cao VÀ giới hạn chảy `≥ 42.000 psi`; dòng `.90` nhận cả ống không phải loại chịu áp lực cao dù giới hạn chảy `≥ 42.000 psi`.
3. **Phủ kín 100% `"Loại khác"` & `"… khác"` đứng cùng cha với anh em `NGUONG` (Luật 1 & 2):**
   - Bổ sung **13 `TACH_ANH_EM`** mới (`hs:<nut>:7401`) có `voi` + `phuDinh` + mô tả phân biệt thực chất: `bieu:73043190`, `bieu:73043990`, `bieu:73045190`, `bieu:73049090`, `bieu:7306309` (tiêu đề trung gian), `bieu:73063099`, `bieu:73064090`, `bieu:73069099`, `bieu:73083090`, `bieu:7312109` (tiêu đề trung gian), `bieu:73143`, `bieu:73144`, `bieu:73151199`.
   - Bổ sung mảng `phuDinh` cho toàn bộ **30 `NGUONG` phần bù thuần 1 chiều** (`73030099`, `73063019/29/49`, `73064019`, `73065019/99`, `73066190`, `73066990`, `73069019`, 8 mã `73072x90`/`73079x90`, `7310219/299`, `73110025/29/99`, 7 mã `7318xx90`) và **14 `NGUONG` phần bù từng phần `"Loại khác, có…"`** (`73043140`, `73043940`, `73049030`, `73069094/95/96/97`, `73110026/27`).
4. **Chuẩn hóa nhánh `HOẶC` (Luật 3) & Định nghĩa định lượng (Luật 5):**
   - Chuẩn hóa `dieuKien` mở đầu theo nhánh (`nhánh không có ren ở đầu ống:` / `nhánh có ren ở đầu ống:`) và bổ sung `duKien` chỉ nhánh nguyên văn trên `73042210`, `73042310`, `73042430`, `73042930`.
   - Bổ sung `DINH_NGHIA` `hs:chuong:73:7401` cho thuật ngữ `"dây"` tại `chuong:73:cg:2#1` song song với `NGUONG` `hs:chuong:73:7301` (`≤ 16 mm`) theo Luật 5.
5. **Ghi tường minh `BO_QUA` cho con số mô tả thông thường trong SEN (Luật 6 & 8):**
   - Thêm `hs:bieu:73089060:7401` (`sen:73089060:1#5`: *"Thông thường độ dày của máng đỡ từ 1,5mm đến 2mm và chiều dài từ 3,3m đến 4m."*) và `hs:bieu:73089060:7402` (`sen:73089060:1#6`: *"treo cách trần nhà 1-2m."*) tại đúng nút chủ câu `bieu:73089060`.

## 3. Bảng đối soát toàn bộ câu chứa số + đơn vị Chương 73 (Luật 6)

| Tầng nguồn luật gốc (`data/luat-goc/`) | Trúng số + đơn vị | Đã rút thành bản ghi (`NGUONG`/`DINH_NGHIA`/`BO_QUA`) | Bỏ qua hợp lệ (ghi rõ lý do) |
|---|---:|---:|---|
| Chú giải Chương (`chuong:73:cg*`, `kq*`) | 1 | **1** (`chuong:73:cg:2#1` → `DINH_NGHIA` + `NGUONG` `≤ 16 mm`) | 0 (12 câu còn lại chỉ nêu số thứ tự mục/nhóm/chương) |
| Cây Biểu thuế (`bieu:73*`) | 76 | **76 / 76** (100% câu dòng biểu chứa ngưỡng số đã có `NGUONG` khớp nguyên văn) | 0 (10 dòng chỉ có số hiệu nhóm/chú thích `(1)` không mang đơn vị đo) |
| Chú giải bổ sung AHTN (`sen:73*`, 63 câu) | 2 | **2 / 2** (`sen:73089060:1#5`, `sen:73089060:1#6` → ghi 2 `BO_QUA` tại `bieu:73089060`) | 0 (không xóa im lặng; các câu SEN còn lại không chứa ngưỡng định lượng) |
| Chú giải chi tiết nhóm (`nhom:73*`) | 1 (+2 lỗi OCR `3001`) | **0** (đã bao phủ bởi luật chính) | `nhom:7314:ct:4#1` nhắc lại nguyên văn Chú giải 2 Chương 73 (`≤ 16 mm`); `nhom:7310:ct:1#1/#2` nhắc lại ranh giới `300 lít` của `bieu:7309`/`7310` (bản gốc in lỗi OCR `3001`) |
| Chú giải chi tiết phân nhóm (`pn:73*`) | 6 (+3 góc `90°`) | **0** | 6 câu `pn:730411..29:ct:1#1` chỉ trích mã tiêu chuẩn `API 5L/5LU/5A/5AC/5AX` (không phải ngưỡng đo); 3 câu `pn:731412/14/19:ct:1#1` mô tả hình học `"góc vuông (90°)"` của tấm đan, không đặt dải số phân nhánh |
| **Tổng cộng tầng Chương 73** | **86** *(+5 chú thích/OCR)* | **79 câu đã ghi trực tiếp** (77 `NGUONG`/`DINH_NGHIA` + 2 `BO_QUA`) | **7 câu** nhắc lại luật/mã tiêu chuẩn API (hợp lệ, không sót ngưỡng nào) |

*(Chú giải Phần XV có 6 ngưỡng đã tách trọn vẹn tại `data/ho-so-ma/nguong/XV.jsonl` trên `origin/main`.)*

## 4. Đối chiếu `data/ho-so/ranh-gioi/73*.json` & Kết quả Cổng kiểm

- **Đối chiếu 75/75 tệp `data/ho-so/ranh-gioi/73*.json`:** **68/68** mục có `dieuKienSo` đều được phủ 100% trong `data/ho-so-ma/nguong/73.jsonl` (**0 mục thiếu**).
- **Tự phản biện đối kháng 9 luật (`c73-critic.mjs`):** **0 lỗi** (0 mã HS trong `daiLuong`, 0 thiếu `phuDinh`, 0 đảo ngưỡng De Morgan sai, 0 `"thông số"`, 0 câu mô tả thường trong `NGUONG`, 0 trùng ID toàn kho, 0 lỗi đơn vị-đại lượng, 0 lỗi `doiChieuRanhGoi`).
- **Bộ cổng chính thức (`m74-c73-full-gates.log`):**
  - `cong.mjs --pham-vi chuong:73 --cong 4,5`: **PASS** (Cổng 4 & Cổng 5: 0 lỗi).
  - `nguong-rut.mjs --chuong 73 --kiem`: **PASS** (0 lỗi khuôn, Cổng 4/5, Cổng 3, `kiemDaiAnhEm` 39 cụm / 38 phủ kín / 0 chồng / 0 hở, 0 lỗi đơn vị-đại lượng).
  - `nguong-test.mjs`: **PASS 8/8**.
  - `test-ho-so-ma.mjs`, `test-ho-so-ma-tra.mjs`, `test-lop-kho.mjs`: **PASS 100%**, `dem-ca-test.mjs` báo **0 ca đỏ**, `EXIT=0`.
  - `kiem-pham-vi-the.mjs`: **PASS phạm vi M-74** (đúng 2 tệp).
