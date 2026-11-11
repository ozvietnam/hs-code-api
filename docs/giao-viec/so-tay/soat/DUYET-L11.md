# Soát độc lập lô L11: 29 phân nhóm (#1109)

Phiên soát: `claude-agent:duyet-L11-20261111#soat-L11`, khác phiên soạn. Ngày 11/11/2026. Làm theo `SOAT-RANH-GIOI.md` mục 0–5.

Cách soát mỗi PN6:

1. `--kiem`: cả 29 PN6 XANH, không DỪNG.
2. `--ve`: đọc chữ biểu VI + EN của từng dòng và tiêu đề.
3. Đặt từng điều kiện cạnh chữ biểu. Với điều kiện nghi ngờ, chạy thẳng `lib/dieu-kien-so.js#danhGiaTuChu` trên mô tả hàng thật
   để xem lúc chạy ra THOA / TRAI / CHUA_BIET, tất định hay không.
4. Tra thêm MFN (`data/tax.json`), tiền lệ (`data/precedents.json`, tra theo `outcome`) và `data/ho-so/hieu-chinh-tien-le.json`. Bảng
   này chỉ có mục 130219-01 thuộc lô.

Bốn PN6 030389, 080212, 090121, 130219 và sáu PN6 381121, 382600, 382711, 382739, 382761, 382763 có phiên soạn là phiên điều phối.
Lô này soát chúng độc lập.

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 380210 | DUYET | "Từ than gáo dừa" / "Based on coconut shell charcoal" ⇒ tenLoai nguyên văn. TB 1994 (than anthracite, mã cũ 38021000) không thuộc vế .10. |
| 380290 | DUYET | Bauxit hoạt tính; "Đất sét hoạt tính hoặc đất hoạt tính" ⇒ mảng. TB 1646 "Đất sét cao lanh, dạng bột" → .20 thiếu chữ "hoạt tính", bộ so chữ không tự bắt ⇒ ghi cho L1-4b. TB 642 (bentonit đã hoạt hoá → .90) nhất quán. |
| 380400 | DUYET | .20 tenLoai + dungCho "sản xuất gạch chịu lửa" phủ vế "được dùng trong …". TB 812 (Na lignin sulfonat → .90) khớp. |
| 380630 | DUYET | "Dạng khối" / "In blocks" ⇒ tenLoai nguyên văn. TB 921 (gôm este dạng khối → .10): bộ so chữ cho THOA tất định. Gợi ý về sau dùng khoá `dangKhoiHoacTamDa` DANG_KHOI (đọc cả "in blocks"). |
| 380690 | DUYET | "Gôm nấu chảy lại ở dạng khối" ⇒ tenLoai cả dòng, không bỏ vế. |
| 380852 | DUYET | .10 tenLoai "Thuốc bảo quản gỗ" + PHAI_KHONG "chất phủ bề mặt" (EN "other than surface coatings"). BO_VE "chứa chất" đúng: máy cắt nhầm "chất trừ côn trùng" ở chữ "trừ"; DDT của 3808.52 tự là chất trừ côn trùng. .20 tên thật + dangBinhXit. |
| 380859 | **TRA_VE** | 38085911/.21 THU HẸP: "Dạng bình xịt" / "In aerosol containers" ghi tenLoai "Dạng bình xịt" VÀ dangBinhXit CO. Đo được: "Thuốc trừ côn trùng dạng bình xịt" / "Thuốc trừ nấm dạng bình xịt" ⇒ tenLoai **TRAI tất định** (dangBinhXit THOA) ⇒ hàng bình xịt rơi .19/.29. 380892/380894 (đã DUYET) chỉ dùng dangBinhXit. |
| 380861 | **TRA_VE** | .30 "Dạng bình xịt" và .40 "Loại khác, dạng lỏng" ghi thêm tenLoai "Dạng bình xịt" / "dạng lỏng" để né cổng 2 (ghi chú người soạn: "báo chồng lấn giả"). "Thuốc trừ muỗi dạng bình xịt" ⇒ TRAI tất định; "Thuốc trừ muỗi dạng lỏng" ⇒ TRAI tất định; "Bình xịt diệt muỗi" ⇒ không tất định, .30 không bao giờ tự chốt. |
| 380862 | **TRA_VE** | Cùng lỗi 380861 ở .40 "Dạng bình xịt" và .50 "Loại khác, dạng lỏng". |
| 380869 | DUYET | tenLoai nguyên văn + dangChePhamDietMuoi BOT_LAM_HUONG_VONG đúng chữ. Lưu ý tu-vung: "Bột làm nhang muỗi" bị khoá đọc thành HUONG_VONG (TRAI tất định), lỗi bộ đọc chứ không do bản nháp. |
| 380891 | **TRA_VE** | (A) 38089110 SUY RỘNG: "Các chế phẩm trung gian chứa 2-(methylpropyl-phenol methylcarbamate)" / "Intermediate preparations containing …" ⇒ chỉ ghi tenLoai "chứa 2-(…)", bỏ "Các chế phẩm trung gian". Thuốc trừ sâu thành phẩm chứa BPMC (fenobucarb) vào .10 (MFN 0%) thay vì .99 (3%). (B) .30 tenLoai "Dạng bình xịt" thừa, như 380859. |
| 380893 | DUYET | Tiêu đề "Thuốc diệt cỏ"; .11 chỉ dangBinhXit CO (đúng cách). TB 1145 (thuốc trừ cỏ → .19) và TB 1781 (chlorpropham → .20) khớp. |
| 381121 | DUYET | "Đã đóng gói để bán lẻ" / "Put up for retail sale" = dongGoiBanLe CO. |
| 381190 | DUYET | "Chế phẩm chống gỉ hoặc chống ăn mòn" ⇒ mảng hoặc. TB 3148 (phụ gia nhiên liệu → .90) ngoài vế. |
| 381600 | DUYET | TB 6531 (xi măng chịu lửa → .10) và TB 6104 (FINMIX → .90) khớp. |
| 382100 | DUYET | tenLoai + congDung "phát triển các vi sinh vật". |
| 382290 | **TRA_VE** | 38229010 SUY RỘNG: "Dải và băng chỉ thị màu …" / "Sterilisation indicator strips and tapes": định ngữ chung "chỉ thị màu" bị tách khỏi "Dải" ⇒ tenLoai ["Dải","băng chỉ thị màu"]. Dải chỉ thị sinh học (spore strip) vào .10 thay vì .90 (MFN cùng 0%). Sửa: ["Dải chỉ thị màu","băng chỉ thị màu"]. |
| 382319 | DUYET | Tiêu đề "Dầu axit từ quá trình tinh lọc" + .11; .20 PFAD / .30 PKFAD rời nhau ở bộ so chữ (đã thử). |
| 382370 | DUYET | "Dạng sáp" / "In the form of wax" ⇒ tenLoai nguyên văn; tu-vung chưa có khoá dạng sáp. |
| 382530 | DUYET | TUONG_TU ["Bơm tiêm","kim tiêm","ống dẫn lưu"] đúng ba hàng nêu tên; cảnh báo `cong2-toi-khi-tuong-tu` là đúng thiết kế. |
| 382600 | **TRA_VE** | Tiêu đề 3826002 THU HẸP: "Este metyl từ cọ (kể cả methyl este từ hạt cọ)" / "(including palm kernel methyl ester)". Vế "kể cả" mở rộng phạm vi nhưng bị coi là ngoặc chú thích. PKME không THOA tenLoai "Este metyl từ cọ" (đã thử) ⇒ không tới .21/.22. Sửa: mảng thêm "methyl este từ hạt cọ". |
| 382711 | DUYET | dungCho ["máy biến điện","bộ phận ngắt mạch"] + hamLuongDauDauMo < 70% (biên "nhỏ hơn"). BO_VE "được từ các khoáng bi-tum" đúng: vế thuộc đại lượng đo của ngưỡng 70%. |
| 382739 | DUYET | Như 382711. |
| 382761 | DUYET | honHopHfc theo đúng tập thành phần; regex .20 loại hỗn hợp có thành phần thứ ba. Lưu ý tu-vung chưa đọc "R404A", "R-507A". |
| 382763 | DUYET | honHopHfc HFC_32_125. Tu-vung chưa đọc "R410A". |
| 030389 | **TRA_VE** | Tiêu đề 0303891 SUY RỘNG, chồng lấn trục chưa khai. "Cá biển" ⇒ moiTruongSongCuaCa BIEN, nhưng chữ biểu đặt .23 "Cá măng biển", .24 "Cá sạo bạc", .27 "Cá mòi Hilsa" dưới 0303892 "Loại khác". "Cá sạo bạc đông lạnh, cá biển" ⇒ BIEN THOA tất định ⇒ vào nhánh cá biển .19 (MFN 10%) thay vì .24 (20%). |
| 080212 | DUYET | "Đã chần (blanched)" = daChan CO (đọc "blanched"; KHÔNG đọc "unblanched"). |
| 090121 | DUYET | Tiêu đề "Chưa nghiền" = daXay KHONG; .20 "Đã xay" = daXay CO cùng khoá. TB 5235, 5193, 8847 (→ .20) khớp. |
| 130219 | DUYET | Bảng 130219-01 KHONG_LECH khớp chữ .20. Lưu ý: dungCho "hoa cúc" (VI) rộng hơn EN "pyrethrum". TB 518 (Cúc La Mã → .90) nằm sát vế .40 ("Chiết xuất hoa cúc La Mã" ⇒ dungCho THOA tất định; tenLoai không tất định nên dòng chưa tự chốt) ⇒ ghi cho L1-4b. |

## Tổng

- DUYET 22, đều đã `--ap-dung`. TRA_VE 7. Đỏ 0, chờ bảng hiệu chỉnh tiền lệ 0, chưa soát 0.
- Tỉ lệ sai: 7/29 PN6 = 24%. Theo dòng 8 số bị ảnh hưởng: 380859 (2), 380861 (2), 380862 (2), 380891 (2), 382290 (1),
  382600 (2 dòng dưới tiêu đề), 030389 (3 dòng loài + .19) — khoảng 14 dòng.
- Chênh MFN: 380891 .10 0% ↔ .99 3%; 030389 .19 10% ↔ .23/.24 20%. Các lỗi còn lại là sai mã cùng mức thuế.
- Cổng 5 báo 5 cảnh báo BO_VE (380852, 380859, 382290, 382711, 382739). Người soát xác nhận đúng 4. Cảnh báo ở 382290 (định ngữ kiểu B)
  có lý do sai: người soạn nói định ngữ "dùng cho nồi hấp" là chung, đúng, nhưng lại tách mất định ngữ chung "chỉ thị màu".
  Cổng 5 không bắt được 2 lỗi: vế DAU bị bỏ ở 380891, vế "kể cả" ở 382600.

## Mẫu lỗi chính (cho người soạn)

1. **tenLoai giả cho DẠNG** ("Dạng bình xịt", "dạng lỏng") ghép AND với khoá tất định (dangBinhXit, dangLong). Mẫu này làm điều kiện
   hẹp hơn chữ, và bộ so chữ trả TRAI tất định khi mô tả có "thuốc trừ …". Người soạn ghi rõ mục đích là né cổng 2 ("chồng lấn
   giả"), tức ép điều kiện cho máy xanh. Lặp ở 380859, 380861, 380862, 380891. Chồng lấn dạng chế phẩm ↔ dạng đóng gói phải giải
   bằng thứ tự "Loại khác" (CON_LAI) hoặc `chongLanVanBan`, không bằng tenLoai.
2. **Bỏ vế DAU / vế "kể cả"** mà cổng 5 không đòi phủ: 380891 .10, 382600 tiêu đề 3826002.

## Máy tách sai / bộ đọc sai (cho Claude sửa `lib/`)

- `lib/ho-so/tach-ve.js`: cắt "thuốc **trừ** nấm", "chất **trừ** côn trùng" ở chữ "trừ" như vế loại trừ (380852 .20: DAU "Thuốc" +
  "trừ nấm và thuốc" + "trừ côn trùng dạng bình xịt"; 380852/380859 "chứa chất" + "trừ côn trùng"). "Thuốc trừ X" / "chất trừ X" là
  danh từ ghép.
- `lib/ho-so/tach-ve.js`: cắt "thu | được" trong "các loại dầu thu được từ các khoáng bi-tum" (382711, 382739).
- `lib/ho-so/tach-ve.js`: coi "(kể cả …)" là PHU (ngoặc chú thích) trong khi đó là vế mở rộng (382600, tiêu đề 3826002).
- `lib/ho-so/tach-ve.js` / cổng 5: DAU nhiều chữ (vd "Các chế phẩm trung gian") không bị đòi phủ, nên bỏ cả danh từ đầu vẫn xanh (380891).
- `lib/dieu-kien-so.js` (TEN_LOAI): mô tả có "thuốc trừ X" bị đọc "trừ …" thành phủ định ⇒ TRAI tất định
  ("Thuốc trừ nấm dạng bình xịt" với tenLoai "Dạng bình xịt"; "Thuốc trừ muỗi dạng lỏng" với "dạng lỏng").
- tu-vung: `dangChePhamDietMuoi` đọc "Bột làm nhang muỗi" thành HUONG_VONG; `honHopHfc` không đọc tên thương mại
  R404A / R-507A / R410A.

## Cho L1-4b (tiền lệ)

- 380290: TB 1646/TB-TCHQ "Đất sét cao lanh, dạng bột" → 38029020. Mô tả không có "hoạt tính" nên tenLoai không tự bắt.
- 130219: TB 518/TB-TCHQ (Cúc La Mã → 13021990) nằm sát vế .40 dungCho "hoa cúc". Bảng 130219-01 mới phủ .20.
