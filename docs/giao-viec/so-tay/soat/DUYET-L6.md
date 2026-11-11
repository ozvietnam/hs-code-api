# Soát độc lập L1-4c — lô L6 (#1109)

- Người soát: `claude-agent:duyet-L6-20261111#soat-L6` (phiên khác mọi người soạn; không đọc `data/bench/*`, `data/oz-export/*`).
- Ngày: 11/11/2026. Lô: 59 PN6 (chương 19–22).
- Cách làm: mỗi PN6 chạy `--kiem` (cả 59 XANH, không DỪNG), `--ve` (chữ biểu VI + EN từng mục), đọc toàn bộ bản nháp
  (điều kiện, `chieu`, HOAC, `phanConLai`, `chongLanVanBan`/`chongLanTruc` + `viDuHang`, mọi `BO_VE`/ghi chú), đối chiếu
  với từ vựng `tu-vung@2` (khoá có sẵn hay không) và với bộ so chữ tự do `lib/dieu-kien-so.js#soChu` (THOẢ khi MỌI âm tiết
  của giá trị có trong tên hàng khách). Tra `data/precedents.json` theo mã 8 số của từng PN6 và `data/ho-so/hieu-chinh-tien-le.json`.
  MFN lấy từ `data/tax.json` để đo hệ quả.
- Lưu ý độc lập: 12 bản (190190, 190590, 200799, 200819, 200989, 200990, 210112, 210390, 210690, 220210, 220299, 220890)
  do phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-*` soạn — cùng phiên cha đã giao lô này. Định danh người soát khác nên công
  cụ nhận, nhưng người đọc PR nên biết; trong 12 bản đó 2 bị trả về (210690, 220299).

## Kết quả

| | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | **52** |
| TRA_VE | **7** |
| Đỏ — không soát | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát | 0 |

Tỉ lệ sai theo PN6: 7/59 = **11,9 %**. Dòng 8 số bị ảnh hưởng trực tiếp: 190540 .10; 200897 .10; 200899 .30; 210120 .20;
210690 .98 (+ .41, .81 phụ); 220299 .50 (+ .10, .40); 220600 .60 — **10 dòng / 7 phân nhóm**; 3 dòng lệch MFN (200899 .30 ↔ .40
chênh 10 điểm; 210690 .98 8 % ↔ .99 15 %; 220299 .50 30 % ↔ .90 20 %).

Sau khi áp dụng: `check-so-tay` 0 lỗi, `check-cay` 0 lỗi lệch cây, `test-so-tay` 65/65 — không phải gỡ bản nào.

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 190110 | DUYET | "Từ <nguồn>" (Of malt extract / goods 04.01–04.04 / soya-bean powder) ghi `dungCho` chữ tự do (không có khoá nguyên liệu thực phẩm); .92 vế tuổi phủ |
| 190120 | DUYET | mảng 5 nguyên liệu + chuaCaCao đúng cực |
| 190190 | DUYET | 1901901 thietKeChoTreEm + dongGoiBanLe KHONG đúng EN; chồng lấn malt ↔ chế phẩm trẻ em khai chongLanVanBan đúng; **lưu ý** .31 VI "Chứa sữa" rộng hơn EN "Filled milk" (theo chữ VI pháp định) |
| 190219 | DUYET | lưu ý VI "Mì" rộng hơn EN "noodles" (so chữ tự do, không tự chốt) |
| 190220 | DUYET | mảng hàng nhồi nguyên văn |
| 190230 | DUYET | |
| 190410 | DUYET | |
| 190420 | DUYET | daRang KHONG; hỗn hợp rang + chưa rang về .90, khớp 7391/TB-TCHQ |
| 190490 | DUYET | "kể cả …" PHU |
| 190531 | DUYET | bảng tiền lệ có mục |
| 190532 | DUYET | |
| 190540 | **TRA_VE** | 19054010 SUY RỘNG: "Chưa thêm đường, mật ong, trứng, chất béo, pho mát hoặc trái cây" chỉ phủ bằng daPhaThemDuongHoacRuou KHONG; 4 vế trứng/chất béo/pho mát/trái cây mất mà cổng 5 báo "phủ" (cổng 5 báo oan) |
| 190590 | DUYET | `--giai-quyet` 19059050: chồng lấn "Flourless bakers' wares" ↔ cakes/pastries là thật, quy ước tên cụ thể hơn thắng; .30/.40/.50 cùng MFN 30. Ghi nhận .80 gói "có hương liệu" vào tenLoai (cùng MFN 20 với .90) |
| 200190 | DUYET | |
| 200290 | DUYET | "Bột cà chua dạng sệt" ⊃ "Bột cà chua" đúng chiều |
| 200390 | DUYET | |
| 200490 | DUYET | |
| 200510 | DUYET | biểu chỉ có .20/.30 |
| 200520 | DUYET | |
| 200559 | DUYET | |
| 200599 | DUYET | |
| 200799 | DUYET | .10 vế "trừ xoài, dứa hoặc dâu tây" = tenLoai PHAI_KHONG đúng phạm vi |
| 200811 | DUYET | chongLanTruc bơ lạc đã rang — ví dụ hàng thật |
| 200819 | DUYET | |
| 200820 | DUYET | |
| 200830 | DUYET | |
| 200860 | DUYET | |
| 200870 | DUYET | |
| 200893 | DUYET | |
| 200897 | **TRA_VE** | 20089710 SUY RỘNG: BO_VE "không bao gồm quả hoặc quả hạch (nuts)" sai lý do — "các phần ăn được khác của cây" bao cả quả; biểu được bằng tenLoai ["quả","quả hạch"] PHAI_KHONG (như 200799) |
| 200899 | **TRA_VE** | 20089930 cùng lỗi; quả có đường lẽ vào .40 (MFN 30) khớp .30 (MFN 40) |
| 200981 | DUYET | |
| 200989 | DUYET | |
| 200990 | DUYET | khớp TB Bebecook .10 |
| 210111 | DUYET | BO_VE "Được đóng gói" là nửa dẫn của mệnh đề khối lượng |
| 210112 | DUYET | BO_VE "chứa"/"không chứa kem" đúng (whether or not containing creamer) |
| 210120 | **TRA_VE** | 21012020 SUY RỘNG: vế "dạng bột" (in powder form) không điều kiện; máy gộp vế nên báo "phủ", BO_VE thừa; có khoá dangBot |
| 210220 | DUYET | |
| 210390 | DUYET | bảng tiền lệ có mục |
| 210410 | DUYET | "Chứa thịt" ⇒ congDung "thịt" (chữ tự do, không có khoá) |
| 210420 | DUYET | như 210410 |
| 210690 | **TRA_VE** | (A) 21069098 THU HẸP: congDung "đặc trưng" cắt từ SEN, không phải chữ biểu ⇒ .98 (8 %) khó tới, rơi .99 (15 %); (B) .41 "Dạng bột" để tenLoai trong khi có dangBot; (C) 2106908 thêm tenLoai "Các chế phẩm thực phẩm" làm .81 khó tới; (D) ghi chú "không có khoá chuaSua" sai |
| 220110 | DUYET | nước khoáng có ga khớp cả hai tên (chữ tự do, cùng MFN) |
| 220190 | DUYET | |
| 220210 | DUYET | |
| 220299 | **TRA_VE** | (A) 22029950 THU HẸP: cả dòng (kể cả chữ "khác") gói vào một tenLoai ⇒ đồ uống không ga uống liền bị TRÁI, rơi .90 (20 % thay vì 30 %); có khoá dungNgayDuoc; (B) .10 gói sữa/tiệt trùng/hương liệu vào tên dù có khoá; (C) .40 tên quá dài |
| 220300 | DUYET | |
| 220421 | DUYET | biên 15/23 đúng; congDung ["ngăn ngừa","cản sự lên men"] hơi rộng ở vế đầu, tenLoai chặn |
| 220422 | DUYET | |
| 220429 | DUYET | |
| 220430 | DUYET | |
| 220510 | DUYET | |
| 220590 | DUYET | |
| 220600 | **TRA_VE** | 22060060 THU HẸP: tenLoai "Rượu thu" là mảnh do máy tách cắt "thu \| được"; rượu vang trái cây không tới .60 |
| 220720 | DUYET | biên > 99 đối chiếu tay |
| 220820 | DUYET | |
| 220830 | DUYET | biên > 5 lít đối chiếu tay |
| 220870 | DUYET | |
| 220890 | DUYET | samsu bổ ⊃ samsu; TUONG_TU "Rượu đắng"; biên 40/57/1,14 đúng |

## Máy tách sai (cho Claude chỉnh `lib/ho-so/tach-ve.js`)

1. "được" bị coi là mốc vế giữa cụm danh từ: "các phần ăn | được khác của cây" (200897 .10, 200899 .30); "Rượu thu | được từ việc
   lên men …" (220600 .60 — người soạn lấy luôn mảnh "Rượu thu" làm tenLoai); "Đồ uống không có ga khác dùng ngay | được không cần
   pha loãng" (220299 .50).
2. Dấu phẩy không tách vế: "để sản xuất các chế phẩm chè, dạng bột" gộp một vế ⇒ "dạng bột" được báo "phủ" giả (210120 .20).
3. Cụm "có hoặc không …" bị cắt: "có chứa đường, có | chứa | không chứa kem" (210112 .91/.92); "có thành phần cơ bản là cà phê rang
   xay, có | chứa chất béo thực vật" (.10).
4. "có ga" bị tách khỏi danh từ "nước" ("Nước khoáng xô đa hoặc nước | có ga, loại khác, …" — 220210 .30; "Nước | có ga" — 220110 .20).
5. "đồ | chứa" bị cắt trong "đựng trong đồ chứa trên 5 lít" (220830 .10).
6. "không ngọt khác", "có hương liệu khác" — chữ "khác" bị gắn vào vế giới hạn (190590 .20, .80).

## Báo oan / bỏ sót của cổng 5

- Bỏ sót (xanh giả): 190540 (một khoá CO_KHONG đọc trúng đầu chuỗi liệt kê 6 hàng ⇒ "phủ" cả vế), 210120 (vế gộp).
- Cảnh báo `cong5-bo-ve` người soát xác nhận đúng: 210111, 210112 ×4, 220300 ×2, 220600 .31/.41, 220830 (9); sai: 200897, 200899,
  và 220600 .60 (vế "trừ nước ép nho tươi" đúng nhưng tenLoai hỏng) .

## Nhận xét chung (không trả về, đề nghị Claude cân nhắc)

- Giá trị TEN_LOAI dài (cả dòng biểu) làm dòng gần như không tới được vì `soChu` đòi đủ âm tiết ("Nước ép từ quả lý chua đen",
  "Các sản phẩm thực phẩm giòn có hương liệu"). Lô này chỉ trả về khi giá trị chứa mảnh vô nghĩa/chữ "khác" hoặc có khoá có kiểu
  thay được và làm lệch MFN.
- "Từ <nguyên liệu>" / "Chứa thịt" đang dùng `dungCho`/`congDung` (khoá công dụng) cho nguồn/thành phần — nên có khoá nguyên liệu
  cơ bản cho thực phẩm.
- Chưa có khoá "có ga / không có ga" (220299) và "chưa thêm trứng/chất béo/pho mát/trái cây" (190540).
