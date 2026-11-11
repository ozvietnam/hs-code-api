# Soát độc lập lô L5 — 62 phân nhóm (Chương 15–18)

Phiên soát: `claude-agent:duyet-L5-20261111#soat-L5` (#1109). Cách làm theo [`SOAT-RANH-GIOI.md`](../SOAT-RANH-GIOI.md) mục 0–5:
`--kiem` (62/62 XANH, không DỪNG) → `--ve` đọc chữ biểu VI + EN từng dòng/tiêu đề → đặt điều kiện cạnh chữ biểu → tra
`data/precedents.json` + `data/ho-so/hieu-chinh-tien-le.json` → **thử bộ so chữ lúc chạy** (`lib/dieu-kien-so.js#danhGiaTuChu`) trên
mô tả hàng thật lấy từ tiền lệ cho các điều kiện chữ tự do có nghi vấn.

## Tổng hợp

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 47 |
| TRA_VE | 15 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo phân nhóm: **15/62 = 24%**. Dòng 8 số bị ảnh hưởng trực tiếp (dòng có điều kiện sai): 25 dòng
(150790 .20; 151090 .10; 151311 .10; 151329 .94 .95; 151530 .10; 151550 .10; 151590 .11 .21 .31 .91; 151620 .24 .26 .62 .96;
151710 .10; 151800 .32; 160290 .20; 160414 .91; 170490 .10; 180620 .10; 180690 .30) cộng các dòng "Loại khác" anh em bị lấn.

Bốn họ lỗi:

1. **Giá trị `DA_TINH_CHE` không phân biệt "đã tinh chế" với "RBD/NBD"** (150790, 151329, 151620, 151800) — bộ đọc của
   `mucDoTinhCheDau.DA_TINH_CHE` nhận cả `refined`, `other than crude`, `trừ dạng thô` lẫn `RBD`, nên dòng "đã tinh chế, tẩy và khử
   mùi (RBD)" nuốt hàng chỉ tinh chế. Gốc ở từ vựng: cần tách giá trị RBD/NBD — việc của Claude, người soạn phải ghi
   `THIEU_KHOA_TU_VUNG` chứ không dùng DA_TINH_CHE. Có chênh MFN: 151329 .95 (35%) ↔ .96 (25%); 151620 .24 (30%) ↔ .29 (25%).
2. **Dòng "Dầu thô" ghi `tenLoai "Dầu thô"` (chữ tự do)** (151090, 151530, 151550, 151590) — hàng khai "chưa tinh chế"/"virgin"
   ra TRAI hoặc CHUA_BIET, trong khi tiền lệ 2834, 2835, 2837, 2839, 6407/TB-TCHQ đều xếp dầu "chưa tinh chế (dầu thô)" vào dòng
   "Dầu thô". Khoá tất định có sẵn (`mucDoTinhCheDau DANG_THO` + `laPhanDoan KHONG`). Chênh MFN lớn: 5–7% ↔ 15–30%.
3. **Bỏ vế giới hạn vì "không có khoá"** (160290, 160414, 180620, 180690) và **thay vế bằng chữ SEN** (160290 "dạng nhão",
   160414 "dùng cho sản phẩm đóng hộp") — đúng loại lỗi đợt 2 đã cảnh báo; cả bốn đều nằm ở chỗ máy tách KHÔNG cắt vế nên cổng 5
   không báo.
4. **Tách sai danh sách tên / chọn sai khoá**: 170490 tách "Kẹo và viên ngậm ho" thành "Kẹo" trơn (nuốt cả 17.04, trái bảng
   hiệu chỉnh 170490-01); 151311 "Dầu dừa nguyên chất / Virgin" ghi DANG_THO (nuốt cả PN6 dầu thô); 151710 so cụm đóng gói với
   TÊN hàng thay vì khoá `dongBaoBiKinKhiDeBanLe` có sẵn.

## Chi tiết từng phân nhóm

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 150290 | DUYET | "Loại ăn được"/"Edible" ⇒ tenLoai "ăn được"; .90 trần. |
| 150300 | DUYET | "Lard stearin or oleostearin" ⇒ mảng hai tên; tiền lệ 1798, 2840/TB-TCHQ (lard oil → .90) khớp. |
| 150410 | DUYET | "Solid fractions" ⇒ tenLoai nguyên văn (thePhanDoan THE_RAN sẽ tất định hơn); 288/TB-TCHQ khớp .90. |
| 150420 | DUYET | "Solid fractions"; 550, 553/TB-TCHQ (dầu cá ngừ lỏng → .90) khớp. |
| 150500 | DUYET | "Lanolin". |
| 150790 | TRA_VE | .20 "Refined, bleached and deodorised (RBD) soya-bean oil" ⇒ DA_TINH_CHE đọc cả "refined" trơn — SUY RỘNG, dầu chỉ tinh chế lọt .20 thay .90. |
| 150920 | DUYET | "In packings of a net weight not exceeding 30 kg" ⇒ khoiLuong <= 30 kg (biên đối chiếu tay; lúc chạy phải hỏi khối lượng tịnh MỖI GÓI). |
| 150990 | DUYET | Tiêu đề 1509901 "Fractions of unrefined oil"; .11/.91 ≤ 30 kg. |
| 151090 | TRA_VE | .10 "Crude oil" ⇒ tenLoai "Dầu thô" — THU HẸP: "chưa tinh chế" ra TRAI ⇒ .90 (25% thay 5%). |
| 151219 | DUYET | .10 phân đoạn + DANG_THO; .20 "Refined" ⇒ DA_TINH_CHE đúng chữ. **Ghi cho L1-4b**: 6412/TB-TCHQ (refined and winterised sunflower oil → 15121990) nằm trong vế .20, chưa có mục bảng hiệu chỉnh. |
| 151229 | DUYET | .10 "Fractions of unrefined cotton-seed oil". |
| 151311 | TRA_VE | .10 "Virgin coconut oil" ⇒ "Dầu dừa" + DANG_THO — SUY RỘNG: PN6 151311 là dầu dừa thô nên mọi hàng thoả, .90 thành rỗng. |
| 151319 | DUYET | .10 "Fractions of unrefined coconut oil". |
| 151321 | DUYET | .10 "Palm kernel oil" (.90 = babassu). Bộ so chữ: "dầu nhân cọ thô" ra TRAI (đồng nghĩa) — lỗi bộ so chữ. |
| 151329 | TRA_VE | .94/.95 RBD ⇒ DA_TINH_CHE — SUY RỘNG (.95 35% nuốt hàng chỉ tinh chế của .96 25%); giá trị tên .11 "hạt cọ" ↔ .91 "của dầu hạt cọ" không nhất quán, ghi chú .13/.14 lệch spec. |
| 151419 | DUYET | .10 phân đoạn chưa tinh chế; .20 "Refined"; 1991/TB-TCHQ (→ .20) khớp. |
| 151499 | DUYET | .10 "Fractions of unrefined oil". |
| 151529 | DUYET | Tiêu đề 1515291 ⇒ DANG_THO (trong PN6 "other than crude" hàng chưa tinh chế chỉ là phân đoạn); .11/.91 "Solid fractions". |
| 151530 | TRA_VE | .10 "Crude oil" ⇒ tenLoai "Dầu thô" — THU HẸP (7% ↔ 15%). |
| 151550 | TRA_VE | .10 "Crude oil" ⇒ tenLoai "Dầu thô" — THU HẸP (7% ↔ 25%). |
| 151590 | TRA_VE | .11/.21/.31/.91 "Crude oil" ⇒ tenLoai "Dầu thô" — THU HẸP; thử: "Dầu hạt bơ chưa tinh chế" TRAI (2834/TB-TCHQ xếp .91), "Virgin jojoba … chưa tinh chế" CHUA_BIET (6407/TB-TCHQ xếp .31). |
| 151610 | DUYET | .20 "Re-esterified" ⇒ tenLoai; thử so chữ đúng ("đã tái este hóa" THOA, "hydro hóa" TRAI). Ghi chú soạn nói chưa có khoá là sai — `cachBienDoiDau TAI_ESTE_HOA` có sẵn. |
| 151620 | TRA_VE | .24/.26/.62/.96 RBD ⇒ DA_TINH_CHE — SUY RỘNG (.24 30% ↔ .29 25%; .96 25% ↔ .99 30%). Phần cây (cachBienDoiDau, dangVayManh, chiSoIot) đúng chữ. |
| 151710 | TRA_VE | .10 "In airtight container for retail sale" so như TÊN hàng; thử "Bơ thực vật … hộp kín khí 800g": tenLoai TRAI, khoá `dongBaoBiKinKhiDeBanLe` THOA. |
| 151800 | TRA_VE | .32 "NBD … hoặc … RBD" ⇒ DA_TINH_CHE — SUY RỘNG (.32 nuốt .38, cùng 5%); 4 cảnh báo BO_VE thừa; ghi chú .12/.20 lệch spec. |
| 152000 | DUYET | "Crude glycerol" ⇒ "Glyxerin thô" nguyên văn. Bộ so chữ: "Glycerin thô" ra TRAI (biểu viết "Glyxerin") — lỗi chuẩn hoá. |
| 152190 | DUYET | .10 "Beeswax and other insect waxes" (phanConLai false đúng); .20 "Spermaceti"; không có .90. |
| 152200 | DUYET | .10 "Degras". |
| 160100 | DUYET | airtight CO. |
| 160210 | DUYET | .10 "Containing pork, in airtight containers…" ⇒ "thịt lợn" + airtight CO. |
| 160231 | DUYET | .10 airtight; .91 "mechanically deboned" ⇒ tachXuongCoHoc CO. |
| 160232 | DUYET | .10 "Chicken curry, airtight" ⇒ tên + airtight; 362/TB-TCHQ (→ .90) khớp. |
| 160241 | DUYET | airtight CO. |
| 160242 | DUYET | airtight CO. |
| 160249 | DUYET | Tiêu đề 1602491 "Luncheon meat"; .11/.91 airtight. |
| 160250 | DUYET | airtight CO. |
| 160290 | TRA_VE | .20 "Preparations of blood" ⇒ "chế phẩm" + dangNguyenSinh LONG_HOAC_NHAO (khoá của POLYME, lấy từ SEN) — bỏ vế "từ tiết"; "Huyết lợn đóng khối" ra TRAI. |
| 160300 | DUYET | .10 "Of meat" ⇒ "thịt". |
| 160411 | DUYET | airtight CO. |
| 160412 | DUYET | airtight CO. |
| 160413 | DUYET | Tiêu đề 1604131 "Sardines"; .11/.91 airtight. |
| 160414 | TRA_VE | .91 "Pre-cooked tunas" ⇒ "Cá ngừ" + dungCho "sản phẩm đóng hộp" (chữ SEN) — bỏ vế "đã làm chín sơ", bịa điều kiện. |
| 160415 | DUYET | airtight CO. |
| 160416 | DUYET | airtight CO. |
| 160417 | DUYET | airtight CO. |
| 160418 | DUYET | .10 "Ready for immediate consumption" ⇒ congDung "sử dụng ngay"; .91 airtight. |
| 160419 | DUYET | .20 "Horse mackerel, airtight"; .30 "Other, airtight". |
| 160420 | DUYET | .20 sausages, .30 ball, .40 paste; .91 airtight. |
| 160510 | DUYET | Tiêu đề 1605101 airtight; .11/.12/.13 tên cua theo họ. |
| 160529 | DUYET | .20 "Shrimp ball", .30 "Breaded shrimp". |
| 160554 | DUYET | airtight CO. |
| 160557 | DUYET | airtight CO. |
| 170199 | DUYET | .10 "Refined sugar" nguyên văn. Bộ so chữ: "Đường trắng tinh luyện" ra TRAI — lỗi bộ so chữ (cùng MFN 40). |
| 170230 | DUYET | "Glucose" / "Glucose syrup". Bộ so chữ: "Xiro" (không dấu) không khớp "Xirô" ⇒ xirô của 1164/1224/TB-TCHQ có thể bị gợi ý .10. |
| 170260 | DUYET | "Fructose" / "Fructose syrup". Bộ so chữ: "fructose" không khớp "Fructoza" (405-408/TB-TCHQ). |
| 170290 | DUYET | Từng dòng khớp chữ; .30 "(excluding maltose)" ⇒ PHAI_KHONG; chongLanTruc .20/.30/.40/1702905 có ví dụ hàng thật. |
| 170310 | DUYET | daPhaHuongLieuHoacChatMau CO. |
| 170390 | DUYET | daPhaHuongLieuHoacChatMau CO. |
| 170490 | TRA_VE | .10 "Medicated pastilles and drops" tách ["Kẹo","viên ngậm ho"] — "Kẹo" trơn nuốt 1704909x (20% ↔ 15%); trái bảng hiệu chỉnh 170490-01. |
| 180100 | DUYET | daLenMen CO. |
| 180620 | TRA_VE | .10 "Chocolate confectionery in blocks, slabs or bars" ⇒ chỉ "Kẹo sô cô la", bỏ vế dạng — SUY RỘNG (20% ↔ 18%). |
| 180690 | TRA_VE | .30 "Food preparations of flour, meal, starch or malt extract, …" ⇒ bỏ vế nguyên liệu nền — SUY RỘNG (.30 nuốt chế phẩm nền khác của .90). |

## Máy tách sai / bỏ sót vế (cho Claude chỉnh `lib/ho-so/tach-ve.js`)

Cả 4 lỗi họ 3 và lỗi RBD đều lọt cổng 5 vì máy để nguyên cụm làm đầu ngữ:

- **Không tách định ngữ sau danh từ đầu** (không có dấu phẩy): "Dầu đậu tương **đã tinh chế, tẩy và khử mùi** (RBD)" (15079020),
  "Stearin hạt cọ **đã tinh chế, tẩy và khử mùi**" (15162096), "Dầu dừa **nguyên chất**" (15131110), "Cá ngừ **đã làm chín sơ**"
  (16041491), "Các chế phẩm **từ tiết**" (16029020), "Kẹo sô cô la **ở dạng khối, miếng hoặc thanh**" (18062010), "Kẹo sô cô la
  **ở dạng viên … hoặc viên ngậm …**" (18069010), "Các chế phẩm thực phẩm **từ bột, bột thô, tinh bột hoặc chiết xuất malt**"
  (18069030), "Kẹo và viên ngậm **ho**" (17049010 — định ngữ chung cho hai danh từ).
- **Sau dấu phẩy vẫn gộp vào đầu ngữ**: "Olein hạt cọ, đã tinh chế, tẩy và khử mùi (RBD)" (15132994/95) cả câu là DAU;
  "Đã qua hydro hóa, dạng vảy, mảnh" (1516203) là DAU.
- **Gộp hai vế khác loại**: "Chứa thịt lợn, đóng bao bì kín khí" (16021010) thành MỘT GIOI_HAN; "Ca-ri gà, đóng bao bì kín khí"
  (16023210), "Ca-ri cừu, đóng bao bì kín khí" (16029010), "Cá sòng (horse mackerel), đóng bao bì kín khí" (16041920) là DAU.
- **Cắt nhầm cụm**: "Từ thịt **đã** | được lọc hoặc tách khỏi xương" (16023191) — "đã được" bị cắt đôi; "Đóng bao bì kín khí | để bán lẻ" tách cụm cố định thành DAU + GIOI_HAN (vô hại nhưng sai cấu trúc);
  "không ăn | được từ mỡ…" (15180020/60, 1518003) cắt "không ăn được" đôi.

## Lỗi bộ so chữ lúc chạy (`lib/dieu-kien-so.js`, không thuộc bản nháp)

Thử `danhGiaTuChu` trên mô tả hàng của tiền lệ: "Glycerin thô" ↔ "Glyxerin thô" TRAI; "Xiro Glucoza" ↔ "Xirô glucoza"
CHUA_BIET (không gập dấu); "đường fructose" ↔ "Fructoza" TRAI; "Đường trắng tinh luyện" ↔ "Đường đã tinh luyện" TRAI;
"Dầu nhân cọ thô" ↔ "Dầu hạt cọ" TRAI. Bản nháp ghi đúng nguyên văn biểu, nên vẫn duyệt; đề nghị Claude thêm gập dấu và bảng
đồng nghĩa VI/EN (glycerin/glyxerin, glucose/glucoza, nhân cọ/hạt cọ).

## Đo cổng 5

62 PN6, cổng 5 báo 1 vế BO_VE (18069040 "được chế biến đặc biệt" — người soát xác nhận đúng, không đổi mã) và 4 BO_VE thừa
(151800). Cổng 5 KHÔNG báo 10/15 lỗi trả về (lỗi nằm trong cụm máy coi là đầu ngữ) — tỉ lệ bỏ sót của cổng 5 trên lô này cao; ba
họ lỗi còn lại (Dầu thô, RBD, khoá đóng gói) là lỗi chọn khoá/giá trị, máy không thể thấy nếu không chạy thử trên mô tả hàng thật.

## Tiền lệ cần L1-4b

- 151219: 6412/TB-TCHQ "Refined and winterised sunflower oil" → 15121990 nằm trong vế .20 "Refined"; chưa có mục bảng.
- 170490: mục 170490-01 đúng, nhưng bản nháp trả về khai "khớp bảng" sai (xem trên).
