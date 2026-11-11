# Soát độc lập L1-4c — lô L21 (#1109)

- Người soát: `claude-agent:duyet-L21-20261111#soat-L21` (khác phiên soạn của mọi bản; không đọc `data/bench/*`, `data/oz-export/*`).
- Ngày: 11/11/2026. Lô: 88 PN6, chương 72 (7206–7229). Trước khi soát đã `git fetch origin main`: cả 88 đều NHAP trên
  origin/main (không có PN6 nào đã xử lý ở lô khác).
- Cách làm: mỗi PN6 chạy `--kiem` (cả 88 XANH, không DỪNG) và `--ve` (chữ biểu VI + EN từng dòng và tiêu đề), đọc toàn bộ
  điều kiện (`dieuKienNut`, `dong8`, `phanConLai`, `chongLanVanBan`/`chongLanTruc`, mọi `BO_VE`/`LECH_TIEN_LE`/`CHONG_LAN`),
  đối chiếu nghĩa khoá với `data/tu-vung/tu-vung@2.json` (nhãn, câu hỏi, cách đọc của từng khoá), đọc mục bảng
  `data/ho-so/hieu-chinh-tien-le.json` của các PN6 có cờ. MFN lấy từ `data/tax.json` để đo hệ quả.
- Kiểm thêm theo chỉ đạo tech lead: so `dieuKienSo` của từng dòng trong `data/so-tay/<nhóm>.json` (origin/main) với bản nháp —
  **không** PN6 nào bỏ mất ngưỡng số SEN/biểu (0 hồi quy).
- Lưu ý độc lập: 26 bản (720827, 720916, 720917, 721070, 721114, 721119, 721230, 721240, 721391, 721491, 721499, 721550,
  721633, 721710, 721720, 721730, 722300, 722530, 722540, 722550, 722592, 722599, 722699, 722850, 722870, 722990) do phiên
  `session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-*` soạn — cùng phiên cha đã giao lô này. Định danh người soát khác nên công cụ nhận,
  nhưng người đọc PR nên biết. Trong 26 bản đó 0 bị trả về; các lỗi hệ thống của lô nằm ở bản do
  `session_01Ce55326chdksgQLsfyrNDS` soạn (29/56 bản trả về — cả 29 bản trả về của lô) và `zcode-sub:glm-5.3` (0/6 trả về).

## Kết quả

| | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | **59** |
| TRA_VE | **29** |
| Đỏ — không soát | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát | 0 |
| Đã xử lý ở lô khác | 0 |

Tỉ lệ sai theo PN6: 29/88 = **33 %**. Gần như toàn bộ do BA lỗi hệ thống lặp lại:

1. **Khoá sai nghĩa `hinhDangCatGocKinh` (tấm KÍNH vuông/chữ nhật, ch.70) dùng cho "Có mặt cắt ngang hình tròn"** — 13 PN6:
   721410, 721420, 721430, 721510, 721590, 722220, 722230, 722810, 722820, 722830, 722840, 722860, 722880 (16 dòng/tiêu đề).
   Điều kiện `hinhDangCatGocKinh KHONG` ⇒ mọi thanh "không phải tấm kính vuông/chữ nhật" (lục giác, bát giác, dẹt…) thoả dòng
   "hình tròn" ⇒ SUY RỘNG. Khoá đúng `hinhDangMatCatNgang TRON` đã có (tu-vung ghi chú trích chính 7214.10.11) và đã dùng đúng ở
   721499, 721550, 722850. MFN hai bên bằng nhau ở các dòng đã đo (0/0, 10/10) nhưng mã 8 số khai báo vẫn sai.
2. **Bỏ danh từ đầu có định nghĩa SEN "Dạng đai và dải"** (chỉ giữ biên chiều rộng) — 12 PN6: 721210, 721220, 721250, 722011,
   722012, 722020, 722090, 722611, 722619, 722620, 722691, 722692 (+721250 bỏ cả "tấm phổ dụng"). Tấm phổ dụng / tấm cắt sẵn
   rộng ≤400 mm lấn dòng "đai và dải" (12 PN6). Cùng lô có bản giữ đúng `dangDaiDaiTamPhoDung DAI_VA_DAI` (721190, 721230, 722699).
3. **BO_VE xoá vế giới hạn làm đổi mã** — 721691 .10 ("Dạng góc, trừ góc đục lỗ, rãnh" bị BO_VE, chỉ còn C≥0,6: hình U/I/Z và
   góc đục lỗ lấn .10).

Lỗi riêng lẻ: 720720 .21/.92 bỏ vế 2 "phôi dạng tấm (sheet bars)" (THU HẸP; MFN .21 5 % ↔ .29 10 %); 720918 .10 "Tôn đen cán
để tráng thiếc (TMBP)" mã hoá `lopMaPhu TRANG_THIEC` (= đã tráng thiếc — ngược nghĩa); 721310 .10 bỏ "mặt cắt ngang hình tròn"
(chỉ còn đường kính ≤50 mm).

Dòng 8 số bị ảnh hưởng trực tiếp: ~40 dòng / 29 phân nhóm. Chênh MFN đo được: 720720 .21 (5 %) ↔ .29 (10 %); các lỗi còn lại
cùng MFN hai bên (sai mã thống kê/khai báo, không sai số thuế MFN).

Sau khi áp dụng: `check-so-tay` 0 lỗi, `check-cay` 0 lỗi lệch cây, `test-so-tay` 65/65, `test-so-tay-gates` 11/11,
`test-engine-loop-so-tay` 0 failed — không phải gỡ bản nào.

## Máy tách sai (§2) — để Claude chỉnh `lib/ho-so/tach-ve.js` / cổng 5

- **Danh từ đầu là điều kiện phân biệt anh em** ("Dạng đai và dải(SEN), chiều rộng …", "Dạng góc, …", "phôi dạng tấm"): bộ tách
  xếp là `DAU` nên cổng 5 không đòi phủ ⇒ 14 PN6 lọt cổng (12 đai/dải + 721691 + 720720) dù bỏ mất giới hạn. Đề xuất: khi anh em cùng nút có dòng "Loại khác"
  và danh từ đầu khác tên tiêu đề cha (nhất là có "(SEN)"), coi DAU là vế GIOI_HAN phải phủ.
- 721691: "trừ góc đục lỗ, rãnh, có hàm lượng carbon" bị gộp thành MỘT vế (vế loại trừ dính chữ dẫn carbon) ⇒ BO_VE cả cụm.
- 721310: "Có đường kính mặt cắt ngang hình tròn không quá 50 mm" là MỘT vế ⇒ biên số "phủ" che mất giới hạn hình tròn.
- 720839/720854/…: "dưới 0,6% tính theo" | "khối lượng" bị cắt đôi (vô hại, sinh nhiều `cong5-bo-ve-thua`).
- Đề xuất cổng: chặn khoá có `ghiChu`/nhãn thuộc chương khác (vd `hinhDangCatGocKinh` "tấm kính" dùng ở ch.72) — cảnh báo
  "khoá ngoài phạm vi chương".

## Lưu ý không chặn (đã DUYET, nên sửa khi soạn lại)

- 721049 .11/.14–.16, 721240 .14, 721250 tiêu đề 7212502: dùng `TEN_LOAI` chữ tự do trong khi `lopMaPhu` đã có
  `KEM_NHOM_MAGIE`, `SON_SAU_MA_NHOM_KEM`, `NHOM_KEM`.
- 721230 .13 ↔ .14: chữ biểu tự chồng ("Loại khác, dày ≤1,5 mm" ↔ "Loại khác, tráng kẽm hợp kim hoá C<0,04%"), máy không bắt vì
  `TEN_LOAI`; nên khai `chongLanVanBan`.
- 721114: lyDo "không có hàng thật" cho .14↔.16/.14↔.17 mâu thuẫn với 721113 (khai chồng lấn thật cho cùng cặp); cặp vẫn khai
  nên lúc chạy trả hai mã. Đã ghi `--giai-quyet=721114`.
- 722990 tiêu đề 7229902 "Mặt cắt ngang không quá 5,5 mm" dùng `duongKinh` — nên `kichThuocMatCatNgang` (như 722300).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 720610 | DUYET | Đối chiếu VI/EN 7206.10.10 'C trên 0,6% tính theo khối lượng' ⇒ hamLuongCarbon > 0,6 %; BO_VE 'Có hàm lượng carbon' là chữ dẫn, đúng. |
| 720712 | DUYET | Đối chiếu 7207.12.10 'Phôi dẹt (dạng phiến)'/EN 'Slabs' ⇒ phoiDetDangPhien CO; .90 Loại khác; không vế giới hạn. |
| 720720 | TRA_VE | (A) 720720:72072021 và 72072092 THU HẸP: chữ biểu 'Dạng khối được tạo hình thô bằng cách rèn; phôi dạng tấm' / EN 'Blocks roughly shaped by forging; sheet bars' là HAI vế (dấu ;) nhưng điều kiện chỉ phuongPhapCheTao TRONG [REN] — bỏ mất vế 2 'phôi dạng tấm (sheet bars)'. Hệ quả: phôi dạng tấm không rèn rơi về 72072029/72072099 'Loại khác' thay vì .21/.92. Cần HOAC(REN, phôi dạng tấm) hoặc khoá tu-vung cho 'sheet bars'. |
| 720827 | DUYET | Đối chiếu tiêu đề 7208271 'Chiều dày dưới 2mm' ⇒ doDay<2; .11/.91 'C từ 0,6% trở lên' ⇒ >=0,6; đã đọc bảng hiệu chỉnh 720827-01..03 (02 LECH_CHUA_PHAN_XU, soạn theo chữ biểu, không chọn bên). |
| 720839 | DUYET | Đối chiếu VI/EN .10 (C<0,6 & ≤0,17mm), .20 (C<0,6 & >0,17–≤1,5), .30 (C≥0,6 & ≤1,5), .40 (dày>2mm, bền kéo tối đa 550 MPa, rộng ≤1.250mm): biên ≤/< khớp EN 'or less'/'not exceeding'/'more than'. |
| 720854 | DUYET | Đối chiếu .10 'C dưới 0,6% và chiều dày không quá 0,17 mm' ⇒ C<0,6 & doDay≤0,17; BO_VE 'khối lượng' là đơn vị tính, đúng. |
| 720890 | DUYET | Đối chiếu .10 'Dạng lượn sóng'/Corrugated ⇒ dangLuonSong CO; .20 'Loại khác, C<0,6% và dày ≤0,17mm' — 'Loại khác' dựa thứ tự sau .10, ngưỡng khớp EN. |
| 720916 | DUYET | Đối chiếu .10 'Chiều rộng không quá 1.250 mm' ⇒ chieuRong≤1250; bảng hiệu chỉnh 720916-01 KHONG_LECH khớp. |
| 720917 | DUYET | Đối chiếu .10 'Chiều rộng không quá 1.250 mm' ⇒ chieuRong≤1250; bảng hiệu chỉnh 720917-01 KHONG_LECH (1.219mm⇒.10, 1.290mm⇒.90) khớp. |
| 720918 | TRA_VE | (A) 720918:72091810 SAI NGHĨA/SUY RỘNG: chữ biểu 'Tấm thép đen (tôn đen) cán để tráng thiếc (Tin - mill blackplate - TMBP)' / EN 'Tin-mill blackplate' là thép CHƯA tráng, dùng ĐỂ tráng thiếc; điều kiện lopMaPhu TRONG [TRANG_THIEC] (tu-vung: 'tráng thiếc'/'tin-plated' = bề mặt đã được tráng) hỏi hàng đã tráng thiếc chưa. Hệ quả: TMBP thật (chưa tráng) trả lời 'không' ⇒ rơi 72091891/72091899; còn hàng đã tráng thiếc vốn thuộc 7210 lại khớp .10. Cần khoá riêng (vd laTonDenTMBP / mucDich tráng thiếc) hoặc THIEU_KHOA_TU_VUNG. |
| 720926 | DUYET | Đối chiếu .10 'Chiều rộng không quá 1.250 mm'/EN 'not exceeding 1,250 mm' ⇒ chieuRong≤1250. |
| 720927 | DUYET | Đối chiếu .10 'Chiều rộng không quá 1.250 mm'/EN 'not exceeding 1,250 mm' ⇒ chieuRong≤1250. |
| 720928 | DUYET | Đối chiếu .10 'C dưới 0,6% và chiều dày không quá 0,17 mm'/EN '0.17 mm or less' ⇒ C<0,6 & doDay≤0,17. |
| 720990 | DUYET | Đối chiếu .10 'Dạng lượn sóng'/Corrugated ⇒ dangLuonSong CO; .90 Loại khác. |
| 721011 | DUYET | Đối chiếu .10 'C từ 0,6% trở lên'/EN '0.6% or more' ⇒ hamLuongCarbon≥0,6. |
| 721012 | DUYET | Đối chiếu .10 'C từ 0,6% trở lên'/EN '0.6% or more' ⇒ hamLuongCarbon≥0,6. |
| 721020 | DUYET | Đối chiếu .10 'C dưới 0,6% và dày không quá 1,5 mm'/EN '1.5 mm or less' ⇒ C<0,6 & doDay≤1,5. |
| 721030 | DUYET | Đối chiếu tiêu đề 7210301 'C dưới 0,6%' ⇒ nút C<0,6; .11 ≤1,2mm, .12 >1,2–≤1,5mm (EN 'exceeding 1.2 but not exceeding 1.5'), .91 ≤1,2mm dưới nhánh Loại khác. |
| 721041 | DUYET | Đối chiếu tiêu đề 7210411 'C dưới 0,6%' ⇒ nút; .11 ≤1,2, .12 >1,2–≤1,5, .91 ≤1,2 (EN 'not exceeding'/'exceeding … but not exceeding') khớp. |
| 721049 | DUYET | Đối chiếu VI/EN .11 (mạ kẽm hợp kim hoá bề mặt 'iron-zinc alloyed', C<0,04, ≤1,2), .14/.15/.16 (hợp kim kẽm–nhôm–magiê theo 3 khoảng dày ≤1,2 / >1,2–≤1,5 / >1,5), .17/.18 Loại khác theo dày; biên khớp. Lưu ý: .11/.14–.16 dùng TEN_LOAI chữ tự do — nên chuyển sang lopMaPhu KEM_NHOM_MAGIE (tu-vung đã có) khi soạn lại, không đổi ranh giới. |
| 721061 | DUYET | Đối chiếu tiêu đề 7210611 'C dưới 0,6%'; .11 ≤1,2, .12 >1,2–≤1,5; nhánh Loại khác .91 ≤1,2, .92 'Loại khác, dạng lượn sóng' ⇒ dangLuonSong (sau .91 theo thứ tự) khớp. |
| 721069 | DUYET | Đối chiếu tiêu đề 7210691 'C dưới 0,6%'; .11 và .91 'Chiều dày không quá 1,2 mm' ⇒ doDay≤1,2 khớp. |
| 721070 | DUYET | Đối chiếu tiêu đề 7210701 (C<0,6 & ≤1,5mm), 7210702 (Loại khác, C<0,6); .12 sơn sau mạ kẽm, .13 sơn sau mạ hợp kim nhôm-kẽm (lopMaPhu), .21/.91 'Được sơn' ⇒ daSon; đã đọc bảng hiệu chỉnh 721070-01/-02 (02 LECH_CHUA_PHAN_XU, soạn theo chữ biểu). |
| 721090 | DUYET | Đối chiếu .10 'C dưới 0,6% và dày không quá 1,5 mm'/EN '1.5 mm or less' ⇒ C<0,6 & doDay≤1,5. |
| 721113 | DUYET | Đối chiếu tiêu đề 7211131 'C dưới 0,6%'; .12 Corrugated ⇒ dangLuonSong, .13/.92 Hoop and strip, .14/.93 Universal plates ⇒ dangDaiDaiTamPhoDung; chồng lấn .12↔.13, .12↔.14 khai chongLanVanBan đúng (đai/dải, tấm phổ dụng lượn sóng thoả cả hai theo chữ biểu, chú giải 1(k) ch.72 cho phép làm gợn sóng). |
| 721114 | DUYET | Đối chiếu tiêu đề 7211141 'C dưới 0,6%'; .14 lượn sóng, .15 'Dạng cuộn để cán lại' ⇒ deCanLai, .16/.94 đai và dải, .17/.95 tấm phổ dụng; mọi cặp chồng lấn đã khai chongLanVanBan ⇒ lúc chạy trả hai mã, không tự chọn. Lưu ý: lyDo 'không có hàng thật' của .14↔.16/.14↔.17 mâu thuẫn với 721113 (khai chồng lấn thật cho cùng cặp) — chỉ là lời giải thích, không đổi hành vi. |
| 721119 | DUYET | Đối chiếu tiêu đề 7211191 'C dưới 0,6%'; .13/.91 'Dạng đai và dải; tấm phổ dụng' ⇒ một giá trị DAI_DAI_HOAC_PHO_DUNG phủ cả hai vế; .14 lượn sóng; chồng lấn .13↔.14 khai đúng; bảng hiệu chỉnh 721119-01 KHONG_LECH khớp. |
| 721123 | DUYET | Đối chiếu .10 Corrugated, .20 'Hoop and strip, of a width not exceeding 400 mm' ⇒ DAI_VA_DAI & chieuRong≤400, .30 'Loại khác, dày ≤0,17 mm' (EN '0.17 mm or less'); chồng lấn .10↔.20 khai đúng. |
| 721129 | DUYET | Đối chiếu .10 Corrugated, .20 'Hoop and strip, width ≤400 mm' ⇒ DAI_VA_DAI & chieuRong≤400, .30 'Loại khác, dày ≤0,17 mm'; chồng lấn .10↔.20 khai đúng. |
| 721190 | DUYET | Đối chiếu tiêu đề 7211901 'C dưới 0,6%'; .11 đai/dải ≤25 mm, .12 đai/dải >400 mm (giữ DAI_VA_DAI + biên rộng), .13 lượn sóng, .14 'Loại khác, ≤0,17 mm'; .91 ≤0,17 mm; chồng lấn .13↔.11/.12 khai đúng. |
| 721210 | TRA_VE | (A) 721210:72121014 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), có chiều rộng trên 400 mm' / EN 'Hoop and strip, of a width exceeding 400 mm' nhưng điều kiện chỉ chieuRong > 400 mm — bỏ mất giới hạn dạng 'đai và dải (SEN)' (BO_VE ghi 'đã lượng hoá qua chieuRong' là sai: chiều rộng không lượng hoá hình dạng). Hệ quả: tấm phổ dụng / tấm cắt sẵn tráng thiếc rộng 400–600 mm lấn sang .14 thay vì .19 'Loại khác'. (B) 72121094 SUY RỘNG cùng lỗi: 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' ⇒ chỉ chieuRong ≤ 400 — tấm phổ dụng ≤400 mm (C ≥0,6%) lấn .94 thay vì .99. (C) 72121011 cùng lỗi (≤25 mm, tác động nhỏ). Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] như 721230/721190. |
| 721220 | TRA_VE | (A) 721220:72122010 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất giới hạn dạng 'đai và dải (SEN)'. Hệ quả: tấm phổ dụng hoặc tấm cắt sẵn mạ kẽm điện phân rộng ≤400 mm lấn sang .10 thay vì .20/.90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI]. |
| 721230 | DUYET | Đối chiếu tiêu đề 7212301 'C dưới 0,6%'; .11/.12 giữ DAI_VA_DAI + rộng ≤25 / >25–≤400 (EN 'exceeding 25 mm and not exceeding 400 mm'); .13 'Loại khác, dày ≤1,5 mm'; .14 'Loại khác, tráng kẽm hợp kim hoá bề mặt (iron-zinc), C<0,04%' — TEN_LOAI tự do, lúc chạy không tự chốt; bảng hiệu chỉnh 721230-01..03 KHONG_LECH khớp. Lưu ý: .13↔.14 chữ biểu tự chồng (hàng ≤1,5 mm mạ hợp kim hoá C<0,04) — máy không bắt vì TEN_LOAI, nên khai chongLanVanBan khi soạn lại. |
| 721240 | DUYET | Đối chiếu tiêu đề 7212401 'C dưới 0,6%'; .11 đai/dải ≤400 mm, .12 'Dạng đai và dải khác' (phanConLai .11), .13 sơn sau mạ kẽm (lopMaPhu), .14 sơn sau mạ hợp kim nhôm-kẽm (TEN_LOAI tự do — nên chuyển lopMaPhu SON_SAU_MA_NHOM_KEM); .91 đai/dải ≤400; đã đọc 721240-01/-02 (02 LECH_CHUA_PHAN_XU, soạn theo chữ biểu). |
| 721250 | TRA_VE | (A) 721250:72125014 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng trên 25 mm; tấm phổ dụng (SEN)' / EN 'Hoop and strip, of a width exceeding 25 mm; universal plates' nhưng điều kiện chỉ chieuRong > 25 mm — bỏ cả hai danh từ đầu có định nghĩa SEN. Hệ quả: tấm cắt sẵn (không phải đai/dải, không phải tấm phổ dụng) phủ oxit crôm rộng >25 mm lấn .14 thay vì .19 'Loại khác'. Cần HOAC(DAI_VA_DAI & chieuRong>25 ; TAM_PHO_DUNG). (B) 72125023, 72125093 'Dạng đai và dải(SEN), có chiều rộng không quá 25 mm' ⇒ chỉ chieuRong ≤25 — cùng lỗi bỏ dạng (tác động nhỏ hơn). Phụ: tiêu đề 7212502 'hợp kim nhôm - kẽm' nên dùng lopMaPhu NHOM_KEM (tu-vung đã có) thay TEN_LOAI. |
| 721260 | DUYET | Đối chiếu tiêu đề 7212601 'C dưới 0,6%'; .11/.91 'Hoop and strip' ⇒ DAI_VA_DAI; .12 'Loại khác, dày ≤1,5 mm' (EN '1.5 mm or less') khớp. |
| 721310 | TRA_VE | (A) 721310:72131010 SUY RỘNG (nhẹ): chữ biểu 'Có đường kính mặt cắt ngang hình tròn không quá 50 mm' / EN 'Of circular cross-section measuring not exceeding 50 mm in diameter' nhưng điều kiện chỉ duongKinh ≤ 50 mm — bỏ giới hạn 'mặt cắt ngang hình tròn' (bộ tách gộp nó vào một vế với biên số nên cổng 5 báo 'phủ'). Hệ quả: thanh cuộn có gân mặt cắt vuông/lục giác (kích thước ≤50 mm) lấn .10 thay vì .90. Sửa: thêm hinhDangMatCatNgang TRONG [TRON] (tu-vung đã có, như 721499/721550/722850). |
| 721391 | DUYET | Đối chiếu .10 'Loại dùng để sản xuất que hàn (SEN)' ⇒ CONG_DUNG, .20 'Thép cốt bê tông'/EN 'rebars' ⇒ TEN_LOAI, .30 'Loại khác, C≥0,6, P≤0,03, S≤0,035' (EN 'not more than') khớp; chongLanTruc .10↔.20 khongCoHangThat hợp lý (thép que hàn trơn vs thép cốt có gân); bảng hiệu chỉnh 721391-01 KHONG_LECH khớp. |
| 721399 | DUYET | Đối chiếu .10 'Loại dùng để sản xuất que hàn' ⇒ CONG_DUNG, .20 'Thép cốt bê tông' (EN 'rebars') ⇒ TEN_LOAI; chongLanTruc khongCoHangThat hợp lý. |
| 721410 | TRA_VE | (A) 721410: điều kiện 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật (kể cả đã cắt góc)', ch.70). Phủ định 'không phải tấm kính vuông/chữ nhật' ⇒ SUY RỘNG: thanh mặt cắt lục giác, bát giác, dẹt… cũng thoả, lấn dòng 'Có mặt cắt ngang hình tròn' thay vì 'Loại khác'; ngược lại người khai trả lời theo câu hỏi về tấm kính thì không đọc được. Sửa: dùng hinhDangMatCatNgang TRONG [TRON] (tu-vung ghi chú trích đúng 7214.10.11; đã dùng ở 721499/721550/722850). |
| 721420 | TRA_VE | (A) 721420: điều kiện 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật (kể cả đã cắt góc)', ch.70). Phủ định 'không phải tấm kính vuông/chữ nhật' ⇒ SUY RỘNG: thanh mặt cắt lục giác, bát giác, dẹt… cũng thoả, lấn dòng 'Có mặt cắt ngang hình tròn' thay vì 'Loại khác'; ngược lại người khai trả lời theo câu hỏi về tấm kính thì không đọc được. Sửa: dùng hinhDangMatCatNgang TRONG [TRON] (tu-vung ghi chú trích đúng 7214.10.11; đã dùng ở 721499/721550/722850). |
| 721430 | TRA_VE | (A) 721430: điều kiện 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật (kể cả đã cắt góc)', ch.70). Phủ định 'không phải tấm kính vuông/chữ nhật' ⇒ SUY RỘNG: thanh mặt cắt lục giác, bát giác, dẹt… cũng thoả, lấn dòng 'Có mặt cắt ngang hình tròn' thay vì 'Loại khác'; ngược lại người khai trả lời theo câu hỏi về tấm kính thì không đọc được. Sửa: dùng hinhDangMatCatNgang TRONG [TRON] (tu-vung ghi chú trích đúng 7214.10.11; đã dùng ở 721499/721550/722850). |
| 721491 | DUYET | Đối chiếu tiêu đề 7214911 'C dưới 0,6%'; .11 C≥0,38 & Mn<1,15; .12 VI 'từ 0,17% đến 0,46%' = EN '0.17% or more but not more than 0.46%' ⇒ 0,17≤C≤0,46 & 1,2≤Mn<1,65 (đối chiếu tay biên); .20 C≥0,6; đã đọc 721491-01 KHONG_LECH, 721491-02 LECH_CHUA_PHAN_XU (soạn theo chữ biểu). |
| 721499 | DUYET | Đối chiếu tiêu đề 7214991 'C≥0,6%, trừ mặt cắt tròn' ⇒ hinhDangMatCatNgang PHAI_KHONG TRON; .11 Mn<1,15; nhánh Loại khác .91 (C<0,38, P≤0,05, S≤0,05), .92 (C≥0,38, Mn<1,15), .93 (EN '0.17% or more but less than 0.46%' ⇒ <0,46, Mn 1,2–<1,65) — biên đối chiếu tay; chồng lấn .91↔.93 là chữ biểu tự chồng, khai đúng; bảng 721499-01 KHONG_LECH khớp. |
| 721510 | TRA_VE | (A) 721510:72151010 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh gia công nguội mặt cắt lục giác/dẹt cũng thoả, lấn .10 thay vì .90. Sửa: hinhDangMatCatNgang TRONG [TRON]. |
| 721550 | DUYET | Đối chiếu .10 'C≥0,6%, trừ dạng mặt cắt ngang hình tròn' ⇒ C≥0,6 & hinhDangMatCatNgang PHAI_KHONG TRON (đúng khoá); nhánh Loại khác .91 'Thép cốt bê tông'/EN 'rebars' ⇒ TEN_LOAI. |
| 721590 | TRA_VE | (A) 721590:72159091 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tấm kính vuông/chữ nhật, ch.70); phủ định ⇒ SUY RỘNG: thanh mặt cắt lục giác/dẹt lấn .91 thay vì .99. Sửa: hinhDangMatCatNgang TRONG [TRON]. (.10 Thép cốt bê tông đúng.) |
| 721621 | DUYET | Đối chiếu .10 'C dưới 0,6%'/EN 'less than 0.6%' ⇒ hamLuongCarbon<0,6. |
| 721631 | DUYET | Đối chiếu .10 'C từ 0,6% trở lên'/EN '0.6% or more' ⇒ hamLuongCarbon≥0,6. |
| 721632 | DUYET | Đối chiếu .10 'Chiều dày từ 5 mm trở xuống'/EN '5 mm or less' ⇒ doDay≤5 (biên đối chiếu tay). |
| 721633 | DUYET | Đối chiếu tiêu đề 7216331 'C dưới 0,6%'; .11 'Chiều dày của cạnh (flange) không nhỏ hơn chiều dày của thân (web)' ⇒ canhKhongNhoHonThan CO; .19/.90 Loại khác. |
| 721640 | DUYET | Đối chiếu .10 'C từ 0,6% trở lên'/EN '0.6% or more' ⇒ hamLuongCarbon≥0,6. |
| 721650 | DUYET | Đối chiếu tiêu đề 7216501 'Có chiều cao dưới 80 mm' ⇒ chieuCao<80; .11/.91 'C từ 0,6% trở lên' ⇒ ≥0,6. |
| 721691 | TRA_VE | (A) 721691:72169110 SUY RỘNG: chữ biểu 'Dạng góc, trừ góc đục lỗ, rãnh, có hàm lượng carbon từ 0,6% trở lên' / EN 'Angles, other than slotted angles, containing by weight 0.6% or more of carbon' nhưng điều kiện chỉ hamLuongCarbon ≥ 0,6 — BO_VE xoá vế 'trừ góc đục lỗ, rãnh' (lyDo 'vế loại trừ hình thức gia công' — đây là giới hạn làm đổi mã) và bỏ danh từ đầu 'Dạng góc'. Hệ quả: hình chữ U/I/Z tạo hình nguội và góc đục lỗ (slotted angles) C≥0,6% lấn .10 thay vì .90. Máy tách gộp 'trừ góc đục lỗ, rãnh, có hàm lượng carbon' thành một vế. |
| 721710 | DUYET | Đối chiếu .10 C<0,25; tiêu đề 7217102 'C từ 0,25% đến dưới 0,6%' (EN '0.25% or more but less than 0.6%'), 7217103 C≥0,6; .22 và .32 liệt kê ba hàng nêu tên nguyên văn (mảng TEN_LOAI), .33 dây tao bê tông dự ứng lực; đã đọc 721710-01..03. |
| 721720 | DUYET | Đối chiếu .10 C<0,25, .20 (EN '0.25% or more … but less than 0.45%'), tiêu đề 7217209 C≥0,45; .91 'Dây thép làm lõi cho cáp nhôm (ACSR)' ⇒ TEN_LOAI + CONG_DUNG; bảng 721720-01 KHONG_LECH khớp. |
| 721730 | DUYET | Đối chiếu tiêu đề 7217301 C<0,25 (.11 tráng thiếc ⇒ lopMaPhu TRANG_THIEC, đúng nghĩa: dây ĐÃ tráng), .20 C 0,25–<0,6, tiêu đề 7217303 C≥0,6 (.33 phủ đồng thau làm lốp, .34 hợp kim đồng khác phanConLai .33, .35 Loại khác tráng thiếc); bảng 721730-01/-02 KHONG_LECH khớp. |
| 721790 | DUYET | Đối chiếu .10 'C dưới 0,25%'/EN 'less than 0.25%' ⇒ hamLuongCarbon<0,25. |
| 722011 | TRA_VE | (A) 722011:72201110 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép không gỉ cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 721230/722699). |
| 722012 | TRA_VE | (A) 722012:72201210 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép không gỉ cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 721230/722699). |
| 722020 | TRA_VE | (A) 722020:72202010 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép không gỉ cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 721230/722699). |
| 722090 | TRA_VE | (A) 722090:72209010 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép không gỉ cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 721230/722699). |
| 722220 | TRA_VE | (A) 722220:72222010 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh thép không gỉ mặt cắt lục giác/bát giác/dẹt cũng thoả, lấn .10 thay vì .90. Sửa: hinhDangMatCatNgang TRONG [TRON]. |
| 722230 | TRA_VE | (A) 722230:72223010 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh thép không gỉ mặt cắt lục giác/bát giác/dẹt cũng thoả, lấn .10 thay vì .90. Sửa: hinhDangMatCatNgang TRONG [TRON]. |
| 722240 | DUYET | Đối chiếu .10 'Chưa được gia công quá mức cán nóng, kéo nóng hoặc ép đùn qua khuôn'/EN 'Not further worked than hot-rolled, hot-drawn or extruded' ⇒ chuaGiaCongQuaMucCanNong CO. |
| 722300 | DUYET | Đối chiếu .10 'Có mặt cắt ngang trên 13 mm'/EN 'exceeding 13 mm' ⇒ kichThuocMatCatNgang>13 (biên < đúng). |
| 722530 | DUYET | Đối chiếu .10 'Thép gió'/EN 'Of high speed steel' ⇒ TEN_LOAI 'Thép gió'; .90 Loại khác; bảng hiệu chỉnh (nếu có) KHONG_LECH khớp. |
| 722540 | DUYET | Đối chiếu .10 'Thép gió'/EN 'Of high speed steel' ⇒ TEN_LOAI 'Thép gió'; .90 Loại khác; bảng hiệu chỉnh (nếu có) KHONG_LECH khớp. |
| 722550 | DUYET | Đối chiếu .10 'Thép gió'/EN 'Of high speed steel' ⇒ TEN_LOAI 'Thép gió'; .90 Loại khác; bảng hiệu chỉnh (nếu có) KHONG_LECH khớp. |
| 722591 | DUYET | Đối chiếu .10 'Thép gió'/EN 'Of high speed steel' ⇒ TEN_LOAI 'Thép gió'; .90 Loại khác; bảng hiệu chỉnh (nếu có) KHONG_LECH khớp. |
| 722592 | DUYET | Đối chiếu .10 'Thép gió' ⇒ TEN_LOAI; .20 'Loại khác, được phủ, mạ hoặc tráng bằng hợp kim kẽm - nhôm - magiê'/EN 'zinc-aluminium-magnesium alloys' ⇒ lopMaPhu KEM_NHOM_MAGIE; bảng 722592-01 KHONG_LECH khớp. |
| 722599 | DUYET | Đối chiếu .10 'Thép gió'/EN 'Of high speed steel' ⇒ TEN_LOAI 'Thép gió'; .90 Loại khác; bảng hiệu chỉnh (nếu có) KHONG_LECH khớp. |
| 722611 | TRA_VE | (A) 722611:72261110 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép hợp kim cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 722699 tiêu đề 7226991). |
| 722619 | TRA_VE | (A) 722619:72261910 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép hợp kim cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 722699 tiêu đề 7226991). |
| 722620 | TRA_VE | (A) 722620:72262010 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép hợp kim cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 722699 tiêu đề 7226991). |
| 722691 | TRA_VE | (A) 722691:72269110 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép hợp kim cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 722699 tiêu đề 7226991). |
| 722692 | TRA_VE | (A) 722692:72269210 SUY RỘNG: chữ biểu 'Dạng đai và dải(SEN), chiều rộng không quá 400 mm' / EN 'Hoop and strip, of a width not exceeding 400 mm' nhưng điều kiện chỉ chieuRong ≤ 400 mm — bỏ mất danh từ đầu có định nghĩa SEN 'đai và dải' (bộ tách xếp là DAU nên cổng 5 không đòi phủ). Hệ quả: thép hợp kim cán phẳng rộng ≤400 mm không phải đai/dải (tấm phổ dụng, tấm cắt sẵn) lấn .10 thay vì .90 'Loại khác'. Sửa: thêm dangDaiDaiTamPhoDung TRONG [DAI_VA_DAI] (như 722699 tiêu đề 7226991). |
| 722699 | DUYET | Đối chiếu tiêu đề 7226991 'Dạng đai và dải(SEN), chiều rộng ≤400 mm' ⇒ DAI_VA_DAI & chieuRong≤400 (giữ cả dạng); .11/.91 'Được phủ, mạ hoặc tráng kẽm' ⇒ lopMaPhu KEM; bảng 722699-01 KHONG_LECH khớp. |
| 722790 | DUYET | Đối chiếu .10 'Crôm từ 0,5% trở lên'/EN '0.5% or more of chromium' ⇒ hamLuongCrom≥0,5. |
| 722810 | TRA_VE | (A) 722810: dòng 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh thép hợp kim mặt cắt lục giác/bát giác/dẹt cũng thoả, lấn dòng 'hình tròn' thay vì 'Loại khác'. Sửa: hinhDangMatCatNgang TRONG [TRON] (như 722850). |
| 722820 | TRA_VE | (A) 722820: tiêu đề 7228201 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tấm kính vuông/chữ nhật, ch.70); phủ định ⇒ SUY RỘNG: thép gió/thép silic-mangan mặt cắt lục giác/dẹt rơi vào nhánh 'hình tròn' (.11/.19) thay vì nhánh Loại khác (.91/.99). Sửa: hinhDangMatCatNgang TRONG [TRON]. (Các dòng .11/.91 'Chưa được gia công quá mức cán nóng…' đúng.) |
| 722830 | TRA_VE | (A) 722830: dòng 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh thép hợp kim mặt cắt lục giác/bát giác/dẹt cũng thoả, lấn dòng 'hình tròn' thay vì 'Loại khác'. Sửa: hinhDangMatCatNgang TRONG [TRON] (như 722850). |
| 722840 | TRA_VE | (A) 722840: dòng 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh thép hợp kim mặt cắt lục giác/bát giác/dẹt cũng thoả, lấn dòng 'hình tròn' thay vì 'Loại khác'. Sửa: hinhDangMatCatNgang TRONG [TRON] (như 722850). |
| 722850 | DUYET | Đối chiếu .10 'Có mặt cắt ngang hình tròn'/EN 'Of circular cross-section' ⇒ hinhDangMatCatNgang TRON (đúng khoá); bảng 722850-01 KHONG_LECH khớp. |
| 722860 | TRA_VE | (A) 722860: dòng 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh thép hợp kim mặt cắt lục giác/bát giác/dẹt cũng thoả, lấn dòng 'hình tròn' thay vì 'Loại khác'. Sửa: hinhDangMatCatNgang TRONG [TRON] (như 722850). |
| 722870 | DUYET | Đối chiếu .10 'Chưa được gia công quá mức cán nóng, kéo nóng hoặc ép đùn'/EN 'Not further worked than hot-rolled…' ⇒ chuaGiaCongQuaMucCanNong CO; bảng 722870-01 KHONG_LECH khớp. |
| 722880 | TRA_VE | (A) 722880: dòng 'Có mặt cắt ngang hình tròn' / EN 'Of circular cross-section' mã hoá bằng hinhDangCatGocKinh KHONG — khoá SAI NGHĨA (tu-vung: 'tấm KÍNH hình vuông hoặc hình chữ nhật', ch.70); phủ định ⇒ SUY RỘNG: thanh thép hợp kim mặt cắt lục giác/bát giác/dẹt cũng thoả, lấn dòng 'hình tròn' thay vì 'Loại khác'. Sửa: hinhDangMatCatNgang TRONG [TRON] (như 722850). |
| 722990 | DUYET | Đối chiếu tiêu đề 7229902 'Mặt cắt ngang không quá 5,5 mm' (biên ≤ đối chiếu tay); .21/.91 'Crôm từ 0,5% trở lên' ⇒ ≥0,5; .30 'Loại khác, bằng thép gió' ⇒ TEN_LOAI; bảng 722990-01 KHONG_LECH khớp. Lưu ý: tiêu đề dùng duongKinh — nên đổi sang kichThuocMatCatNgang (như 722300) để dây dẹt/không tròn đọc được; không đổi ranh giới với dây tròn. |


## Soát lại của tech lead — bo-kiem-luat hai bên

Trả về 721070,721113,721114,721499: gộp thử với `main` làm phát sinh ca chốt sai mới trong `bo-kiem-luat --toan-bieu` (cổng gộp không cho `chotSai`/`chotLoaiKhacSai` tăng). Mục sổ tay giữ như `main`.
