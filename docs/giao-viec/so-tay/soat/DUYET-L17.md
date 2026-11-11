# Soát độc lập L1-4c — lô L17 (#1109)

- Người soát: `claude-agent:duyet-L17-20261111#soat-L17` (phiên khác mọi người soạn; không đọc `data/bench/*`, `data/oz-export/*`).
- Ngày: 11/11/2026. Lô: 64 PN6 (chương 58–61: vải đặc biệt, vải tráng phủ kỹ thuật, vải dệt kim, quần áo dệt kim).
- Đầu lô: `git fetch origin main` — cả 64 bản đang NHAP trên origin/main, không bản nào đã xử lý ở lô khác.
- Cách làm: mỗi PN6 chạy `--kiem` (cả 64 XANH, không DỪNG), `--ve` (chữ biểu VI + EN từng mục), đọc toàn bộ bản nháp
  (điều kiện, HOAC, `phanConLai`, `chongLanVanBan`, mọi `BO_VE`/ghi chú), đối chiếu từ vựng `tu-vung@2` (giá trị và
  `cachDoc` của từng khoá dùng: `loaiSoiDet`, `daTrangPhuEpLop`, `tinhDanHoi`, `thichHopLamBangMucMayChu`,
  `soiChiemTiLeLonHon`, `tinhNangBaoHo`, `donNgucSauPhauThuat`…) và bộ so chữ tự do `lib/dieu-kien-so.js#soChu`. Tra
  `data/precedents.json` theo mã 8 số của từng PN6 và `data/ho-so/hieu-chinh-tien-le.json`. MFN lấy từ `data/tax.json`.
- Kiểm thêm theo yêu cầu tech lead: so với `data/so-tay/<nhóm>.json` hiện hành — không PN6 nào trong lô bỏ mất ngưỡng số
  SEN/biểu (3 dòng có ngưỡng: 58063130, 58063250, 58063993 "chiều rộng không quá 12 mm" — bản nháp giữ `chieuRong <= 12 mm`).
- Lưu ý độc lập: một phần bản nháp (580230, 580300, 580500, 580631, 580632, 581100, 590500, 600410, 600536, 600538) do phiên
  `session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-*` soạn — cùng phiên cha đã giao lô này; định danh người soát khác nên công cụ nhận.
  Trong số đó 2 bản bị trả về (600536, 600538).

## Kết quả

| | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | **47** |
| TRA_VE | **17** |
| Đỏ — không soát | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát | 0 |

Tỉ lệ sai theo PN6: 17/64 = **26,6 %**. Nhưng 12/17 bản trả về do **hai lỗi khoá dùng chung** (không phải lỗi đọc riêng lẻ):
`tinhDanHoi` cho "kết hợp với sợi cao su" (10 PN6) và `SOI_THUC_VAT_KHAC` cho "ramie, lanh" (2 PN6). Tính theo lỗi gốc độc lập:
7 lỗi / 64 PN6.

Dòng 8 số bị ảnh hưởng trực tiếp: 58063992; 58081010; 58089010; 59031010; 60053610; 60053810; 60063120, 60063220, 60063310,
60063410, 60064110, 60064210, 60064310, 60064410; 61033910; 61099010 (+ .20 phần còn lại); 61130010, 61130030 — **19 dòng / 17
phân nhóm**. Lệch MFN: 61130030 (5 %) ↔ 61130040 (20 %); các dòng khác cùng MFN với dòng bị lấn (12 % ch.58–60, 20 % ch.61) nhưng
sai mã 8 số trên tờ khai và trái tiền lệ (4141/TB-TCHQ, 4940/TB-TCHQ, 7463/TB-TCHQ).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 580110 | DUYET | .10 "Coated, covered or laminated" ⇒ daTrangPhuEpLop CO |
| 580121 | DUYET | như 580110 |
| 580122 | DUYET | như 580110 |
| 580123 | DUYET | như 580110 |
| 580126 | DUYET | như 580110 |
| 580127 | DUYET | tiền lệ 2321/TB-TCHQ (chưa tráng phủ ⇒ .90) khớp |
| 580131 | DUYET | như 580110 |
| 580132 | DUYET | tiền lệ 1258/TB-TCHQ (ép dán lớp vải ⇒ .10) khớp |
| 580133 | DUYET | tiền lệ 209/TB-TCHQ (ép dán ⇒ .10) khớp |
| 580136 | DUYET | như 580110 |
| 580190 | DUYET | tầng "Of silk" ⇒ TO_TAM; .11/.91 tráng phủ |
| 580210 | DUYET | "Unbleached" ⇒ CHUA_TAY_TRANG |
| 580220 | DUYET | "Of wool or fine animal hair" |
| 580230 | DUYET | .20 BONG+NHAN_TAO + "Dệt thoi"; .30 phanConLai; chongLanVanBan .10↔.20/.30 đúng (hai trục, không thứ tự) |
| 580300 | DUYET | |
| 580410 | DUYET | |
| 580421 | DUYET | |
| 580429 | DUYET | |
| 580500 | DUYET | |
| 580631 | DUYET | .10 khoá thichHopLamBangMucMayChu phủ cả "or similar machines"; .30 ≤ 12 mm giữ ngưỡng; 332/TB-TCHQ khớp bảng |
| 580632 | DUYET | .10 HOAC băng mực / "safety seat belt fabrics"; 1142/TB-TCHQ khớp bảng |
| 580639 | **TRA_VE** | 58063992 THU HẸP: BO_VE vế mở "hoặc các loại máy tương tự" (lý do cũ "dungCho không có TUONG_TU") trong khi khoá thichHopLamBangMucMayChu đã có và ghiChu khoá nêu đích danh 5806.39.92 |
| 580790 | DUYET | "Of nonwoven fabrics" |
| 580810 | **TRA_VE** | 58081010 SUY RỘNG: "Kết hợp với sợi cao su" / "Combined with rubber thread" ↔ tinhDanHoi đọc cả spandex/elastane |
| 580890 | **TRA_VE** | 58089010 như 580810 |
| 581100 | DUYET | "Of wool or fine or coarse animal hair" ⇒ 2 giá trị |
| 590190 | DUYET | "Prepared painting canvas" — "đã xử lý" là bản chất nhóm 59.01 |
| 590210 | DUYET | tầng "Chafer fabric, rubberised"; .11/.91 tenLoai "ni lông 6" — **lưu ý** bộ tách âm tiết cắt "6,6" ⇒ "ni lông 6,6" cũng THOẢ (so chữ tự do, không tự chốt) |
| 590220 | DUYET | .91 "Containing cotton" ⇒ tenLoai "bông" (chứa, không phải chiếm trội) |
| 590310 | **TRA_VE** | 59031010 THU HẸP: thêm congDung "gia cố" từ câu SEN "thường để gia cố"; trái 7463/TB-TCHQ (vải "thường dùng làm vải lót" ⇒ .10, bảng 590310-01) |
| 590500 | DUYET | |
| 590699 | DUYET | "Rubberised sheeting suitable for hospital use"; 6518/TB-TCHQ (.90) khớp |
| 590800 | DUYET | mảng [Bấc, mạng đèn măng xông] |
| 590900 | DUYET | "Fire hoses" |
| 600410 | DUYET | hamLuongSoiDanHoi ≤ 20 %; 3207/TB-TCHQ (21,6 % ⇒ .90) khớp |
| 600536 | **TRA_VE** | 60053610 SUY RỘNG: mất điều kiện có polybutylen terephthalat ⇒ vải bơi polyeste/spandex lấn .10 |
| 600538 | **TRA_VE** | 60053810 như 600536 |
| 600590 | DUYET | |
| 600631 | **TRA_VE** | 60063120 "Elastic (combined with rubber threads)" ↔ tinhDanHoi SUY RỘNG |
| 600632 | **TRA_VE** | 60063220 như trên; trái 4141/TB-TCHQ (7,3 % sợi đàn hồi PU ⇒ .90) |
| 600633 | **TRA_VE** | 60063310 như trên |
| 600634 | **TRA_VE** | 60063410 như trên; 598/TB-TCHQ (4,8 % PU ⇒ .90) cùng hướng |
| 600641 | **TRA_VE** | 60064110 như trên |
| 600642 | **TRA_VE** | 60064210 như trên |
| 600643 | **TRA_VE** | 60064310 như trên |
| 600644 | **TRA_VE** | 60064410 như trên; trái 4940/TB-TCHQ (4 % sợi đàn hồi PU ⇒ 6006.44.90) |
| 610339 | **TRA_VE** | 61033910 SUY RỘNG: "Of ramie, linen or silk" ↔ SOI_THUC_VAT_KHAC (gồm đay, gai dầu, sisal…) |
| 610419 | DUYET | |
| 610520 | DUYET | NHAN_TAO ⊃ SOI_TONG_HOP/SOI_TAI_TAO (cảnh báo ten-da-nghia đúng thiết kế) |
| 610819 | DUYET | |
| 610910 | DUYET | dungCho mảng nguyên văn; **lưu ý** chưa có khoá giới tính (Chú giải 9 Ch.61 — không xác định ⇒ nữ — chưa mã hoá) |
| 610990 | **TRA_VE** | 61099010 SUY RỘNG như 610339 ("of ramie, linen or silk") ⇒ .20 phần còn lại bị thu hẹp tương ứng |
| 611190 | DUYET | |
| 611241 | DUYET | "Mastectomy swimwear" ⇒ donNgucSauPhauThuat CO |
| 611249 | DUYET | như 611241 |
| 611300 | **TRA_VE** | (A) 61130030 THU HẸP: tenLoai "Quần áo chống cháy" thừa bên cạnh tinhNangBaoHo CHONG_CHAY ⇒ "bộ đồ chống cháy" TRÁI, rơi .40 (MFN 5 % ↔ 20 %); (B) 61130010 thêm dungCho "lặn scuba" từ SEN ⇒ wetsuit khác rơi .40/.90 |
| 611430 | DUYET | .20 chỉ tinhNangBaoHo CHONG_CHAY — đúng; SEN chỉ ví dụ vật liệu |
| 611490 | DUYET | |
| 611510 | DUYET | **lưu ý** "vớ" ↔ "tất" nên vào tenKhac |
| 611529 | DUYET | |
| 611530 | DUYET | |
| 611610 | DUYET | "Divers' gloves" |
| 611710 | DUYET | |
| 611780 | DUYET | tầng "Ties, bow ties and cravats" mảng 3 tên; .20 mảng 3 tên |

## Lỗi gốc cần Claude xử lý (từ vựng)

1. **`tinhDanHoi` dùng cho "kết hợp với sợi cao su"** (580810, 580890, 6006.31–6006.44 — 10 PN6). Khoá đọc "sợi đàn hồi",
   spandex/elastane/lycra là CÓ (đúng cho 6001.92.30 "Chứa sợi đàn hồi hoặc sợi cao su", 600192 đã DUYET), nhưng chữ biểu
   5808.x.10 / 6006.x.x0 chỉ nói *sợi cao su* (rubber thread). Ba tiền lệ (598, 4141, 4940/TB-TCHQ) xếp vải dệt kim có sợi
   đàn hồi polyurethane vào "Loại khác". Cần khoá/giá trị riêng (vd `chuaSoiCaoSu` CO_KHONG) rồi soạn lại 10 PN6.
2. **`loaiSoiDet` thiếu giá trị ramie / lanh** (610339, 610990; cùng mẫu đang NHAP ở 620190, 620290). SOI_THUC_VAT_KHAC gồm cả
   đay, gai dầu, sisal, xơ dừa.
3. **Thành phần PBT** (600536, 600538; còn 600537, 600539 cùng chữ): `soiChiemTiLeLonHon` chỉ nói sợi chiếm trội, cần thêm
   điều kiện "có polybutylen terephthalat".
4. Vế mở "hoặc các loại máy tương tự" của 5806.39.92: khoá `thichHopLamBangMucMayChu` đã có — chỉ cần soạn lại 580639.
5. Câu mô tả SEN không phải vế giới hạn (590310 "gia cố", 611300 "lặn scuba"): người soạn đã chuyển câu định nghĩa SEN thành
   điều kiện CONG_DUNG. Nên ghi vào QUY-TRINH: SEN "thường …" / câu mô tả không phải điều kiện, trừ khi chữ biểu dòng nói.

## Máy tách sai (cho `lib/ho-so/tach-ve.js`) / bộ so chữ

1. 61151010 "Vớ cho người giãn tĩnh mạch, từ sợi tổng hợp": bộ tách gộp hai vế "cho người giãn tĩnh mạch" + "từ sợi tổng hợp"
   thành MỘT vế GIOI_HAN (dấu phẩy trước "từ <vật liệu>" nên là ranh vế).
2. 61099010 / .20 / .30, 61091010 / .20: cả dòng "Dùng cho nam giới hoặc trẻ em trai, từ ramie, lanh hoặc tơ tằm" là MỘT vế
   GIOI_HAN — không có DAU, vế vật liệu không tách ra; cổng 5 báo "phủ" cả vế dù vật liệu chỉ phủ thô (SOI_THUC_VAT_KHAC).
3. 60063120 … "Đàn hồi (kết hợp với sợi cao su)": phần trong ngoặc bị xếp PHU (chú thích) — thật ra là vế giới hạn quyết định
   dòng; vì thế cổng 5 không bắt được khoá tinhDanHoi rộng hơn chữ (báo oan ngược / xanh giả).
4. 61124110 "(dùng cho người sau phẫu thuật ngực)" cũng bị xếp PHU — ở đây khoá đọc trọn cụm nên không hại.
5. `soChu`/`amTiet` cắt "6,6" thành "6","6" ⇒ giá trị "ni lông 6" THOẢ tên "ni lông 6,6" (590210 .11/.91).

## Báo oan / bỏ sót của cổng 5

- Xanh giả: 600631–600644, 580810, 580890 (vế ngoặc bị xếp PHU), 610339, 610990 (vế gộp), 600536/600538 (DAU nuốt cả cụm vật
  liệu "polyeste và polybutylen terephthalat"), 590310 / 611300 (thu hẹp thêm điều kiện — cổng 5 không đo chiều hẹp).
- Cảnh báo `cong5-bo-ve` duy nhất trong lô (580639 .92) — người soát xác nhận đúng là lỗi.

## Sau khi áp dụng

`check-so-tay` 0 mục không kiểm được nguồn (mã thoát 0), `check-cay` mã thoát 0, `test-so-tay` 65/65, `test-so-tay-gates`
91/91, `test-engine-loop-so-tay` 11/11 — không phải gỡ bản nào. 47 bản DUYET đã `--ap-dung` vào 26 tệp `data/so-tay/*.json`.
