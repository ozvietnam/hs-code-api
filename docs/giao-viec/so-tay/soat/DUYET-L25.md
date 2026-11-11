# Soát độc lập lô L25 — ranh giới 6→8 số (#1109)

- Người soát: `claude-agent:duyet-L25-20261111#soat-L25` (khác mọi phiên soạn `…#soan-<pn6>`).
- Ngày: 11/11/2026. Bảng soát: `docs/giao-viec/so-tay/SOAT-RANH-GIOI.md` §0–5 + BỔ SUNG 11/11 (ngưỡng số SEN, LIET_KE trùng
  phạm vi phân nhóm, tên phân nhóm tự chứa vế).
- Lô: 64 PN6 chương 84 (8424–8448). Trước khi soát: `git fetch origin main` — cả 64 bản đều `NHAP` trên origin/main (không bản nào
  DUYET/TRA_VE sẵn).
- Cách làm: mỗi PN6 chạy `--kiem` (64/64 XANH, mã thoát 0, không DỪNG), `--ve` (chữ biểu VI + EN từng dòng/tầng, trạng thái từng vế),
  đọc toàn bộ `dieuKienSo`, `dieuKienNut`, `ghiChuSoan` (QUYET_DINH/BO_VE/LECH_TIEN_LE), `chongLanVanBan`/`chongLanTruc` (+ `viDuHang`);
  đối chiếu `dieuKienSo` đang chạy trong `data/so-tay/<nhóm>.json` (chỉ 84248910 có ngưỡng số — dung tích ≤ 3 lít — bản nháp giữ
  đúng); tra `data/precedents.json` theo mã 8 số của lô (14 tiền lệ, không tiền lệ nào trái bản nháp được duyệt) và
  `data/ho-so/hieu-chinh-tien-le.json` (chỉ 843790-01 KHONG_LECH); khoá `data/tu-vung/tu-vung@2.json` khi nghi khoá sai đại lượng;
  MFN `data/tax.json` để ghi hệ quả.
- Không chạy `bo-kiem-luat --toan-bieu` (theo chỉ đạo tech lead).

## Tổng

| Kết luận | Số PN6 |
|---|---|
| DUYET (+ áp dụng sổ tay) | 59 |
| TRA_VE | 5 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo PN6: **5/64 = 7,8 %**. Theo nhóm 4 số: 8428 1/6 PN6 (842890), 8429 1/1 (842940), 8437 2/3
(843710, 843780), 8443 1/4 (844399); 8424, 8425, 8426, 8430, 8431, 8432, 8433, 8435, 8436, 8438, 8440, 8441, 8444–8448 sạch.
Theo mục (dòng + tầng có điều kiện): lô có 183 mục mang điều kiện (204 dòng 8 số); 9 mục sai (≈ 4,9 %).
Cổng 5: 3 vế được miễn `BO_VE` (842490 8424902, 843049 .10, 843780 .10) — người soát xác nhận cả 3 lý do đứng được; 1 vế máy báo
«tách định ngữ (B)» (843780 .10 «bằng điện») là báo oan (định ngữ chung, EN «…, electrically operated»). Cổng 5 KHÔNG thấy 2/5 lỗi
(842890 vế mở dài, 843710 vế thứ hai sau «;»).

Dòng 8 số bị ảnh hưởng trực tiếp (dòng mang điều kiện sai, chưa tính dòng «Loại khác» nhận nhầm): 842890 .30; 842940 .40 (+ .50 nhận
nhầm); 843710 .10, .20; 843780 .30, .40; 844399 .10, .20, .30 ⇒ **9 dòng**. Chênh MFN: chỉ 842940 (.40 5 % ↔ .50 0 %); các dòng còn
lại cùng mức trong phân nhóm (8428.90 0 %, 8437.10 5 %, 8437.80 20 %, 8443.99 0 %) — sai mã 8 số, không sai thuế MFN.

Lô này phần lớn là phân nhóm chỉ chia «hoạt động bằng điện / không» (khoảng 30 PN6) hoặc «nông nghiệp / khác», «của hàng hóa thuộc phân nhóm
<mã>» — loại dễ, đối chiếu từng dòng vẫn làm đủ; lỗi tập trung ở dòng có liệt kê tên dài.

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 842410 | DUYET | Đối chiếu VI/EN "Of a kind suitable for aircraft use": dungCho "phương tiện bay" phủ đúng vế; .90 Loại khác trần. |
| 842420 | DUYET | Đối chiếu VI/EN: tầng điện/không điện (hoatDongBangDien) + "Agricultural or horticultural" (congDung nông nghiệp\|làm vườn) đúng hai tầng; tiền lệ 6289/TCHQ-TXNK máy rửa cao áp → .19 khớp. |
| 842441 | DUYET | Đối chiếu VI/EN "Hand-operated insecticide sprayers" (congDung trừ sâu + BANG_TAY) và "Other, not electrically operated" đúng; bộ tách cắt "trừ sâu hoạt động" thành một vế (ghi máy tách sai, không đổi kết quả). |
| 842449 | DUYET | Đối chiếu VI/EN điện/không điện; hai dòng phủ kín, đúng chữ biểu. |
| 842482 | DUYET | Đối chiếu VI/EN "Drip irrigation systems" (tenLoai nguyên văn) + "Other, (not) electrically operated" đúng; Loại khác tự phủ định .10. |
| 842489 | DUYET | Đối chiếu VI/EN; .10 giữ đủ ngưỡng dung tích ≤ 3 lít của sổ tay + bằng tay + gia đình; .40 giá trị "linh kiện của chúng" là chữ treo (đại từ) gần như không khớp mô tả thật — hướng hẹp, MFN .40/.50 cùng 0%, chấp nhận; tiền lệ 715/TB-TCHQ bình xịt mũi → .90 không trái. |
| 842490 | DUYET | Đối chiếu VI/EN mọi tầng/dòng; BO_VE vế mở "và các thiết bị tương tự" của 8424902 theo quy ước 392690 .42 + quyết định Claude #1109 lô 10 (lý do nêu rõ hướng sai còn lại); .30 "máy phun bắn" phủ cả vế mở. |
| 842542 | DUYET | Đối chiếu EN "Jacks of a kind used in tipping mechanisms for lorries": dungCho "cơ cấu tự đổ của xe tải" phủ vế; danh từ đầu "Kích nâng" lặp tên phân nhóm. |
| 842549 | DUYET | Đối chiếu VI/EN điện/không điện; đúng chữ biểu. |
| 842619 | DUYET | Đối chiếu EN "Bridge cranes"/"Gantry cranes": tenLoai nguyên văn hai tên rời nhau; .90 Loại khác trần. |
| 842810 | DUYET | Đối chiếu VI/EN: tiêu đề "Thang máy (lift)" + .31 "For passengers"; .40 "Skip hoists" mảng hai tên nguyên văn (tên + chú thích ngoặc) cùng một hàng. |
| 842820 | DUYET | Đối chiếu EN "Of a kind used for agriculture": congDung nông nghiệp; đúng. |
| 842832 | DUYET | Đối chiếu EN "Of a kind used for agriculture": congDung nông nghiệp; đúng. |
| 842833 | DUYET | Đối chiếu EN "Of a kind used for agriculture": congDung nông nghiệp; đúng. |
| 842839 | DUYET | Đối chiếu EN "Of a kind used for agriculture": congDung nông nghiệp; đúng. |
| 842890 | TRA_VE (TRA_VE) | (A) 84289030 THU HẸP: chữ biểu "Thiết bị đẩy xe goòng trong hầm mỏ, thanh ngang xe goòng hoặc đầu máy, thiết bị lật toa xe và các thiết bị giữ xe goòng chạy đường sắt tương tự" (EN "... wagon tippers and similar railway wagon handling equipment") có vế MỞ "và các thiết bị ... tương tự" nhưng điều kiện chỉ là tenLoai liệt kê ĐÓNG 4 tên — thiết bị xử lý toa xe đường sắt tương tự rơi .90 thay vì .30; cần TUONG_TU (máy tách vế không nhận vế mở dài này — ghi chú người soạn tự nêu). (B) 84289030 TÁCH SAI CỤM: giá trị "đầu máy" đứng riêng là hàng khác (đầu máy xe lửa); EN "locomotive or wagon traversers" — "thanh ngang xe goòng hoặc đầu máy" là MỘT loại hàng (bàn chuyển ngang cho toa xe hoặc đầu máy), phải giữ "thanh ngang" làm danh từ đầu của cả hai. |
| 842940 | TRA_VE (TRA_VE) | (A) 84294040 SAI ĐẠI LƯỢNG / SUY RỘNG-THU HẸP: chữ biểu "Xe lu rung, với lực rung của trống không quá 20 tấn tính theo khối lượng" (EN "Vibratory smooth drum rollers, with a centrifugal force drum not exceeding 20 t by weight") — ngưỡng là LỰC LY TÂM (lực rung) của trống, không phải khối lượng máy; bản nháp ghi khoiLuong <= 20 tấn (ghi chú "khối lượng của trống là khối lượng hàng mô tả" là đọc sai). Xe lu 22 tấn có lực rung 18 t rơi .50 (0%) thay vì .40 (5%); xe lu 12 tấn lực rung 25 t rơi .40 thay vì .50. Không có khoá lực rung trong tu-vung@2 ⇒ phải THIEU_KHOA_TU_VUNG (DỪNG), không ép vào khoiLuong. Máy tách vế cũng cắt "Xe lu rung, với lực rung" làm danh từ đầu (tách sai). |
| 843049 | DUYET | Đối chiếu VI/EN "Wellhead platforms with integrated production modules suitable for use in drilling operations": BO_VE "có các mô-đun tích hợp" chấp nhận vì SEN 8430.49.10 đọc "BỆ DÀN KHOAN VÀ CÁC MÔ-ĐUN TÍCH HỢP" (mô-đun là hàng song song, không phải biên hẹp); lưu ý mô-đun tích hợp đứng riêng theo SEN cũng vào .10 mà bản nháp chưa nêu (MFN .10/.90 cùng 0%). |
| 843110 | DUYET | Đối chiếu VI/EN: tầng "Của máy (không) hoạt động bằng điện" + mảng mã 8425 đúng từng dòng; mã nêu trong .13/.22 khớp chữ biểu. |
| 843120 | DUYET | Đối chiếu EN "Of subheading 8427.10 or 8427.20": dungCho mảng hai mã; đúng. |
| 843131 | DUYET | Đối chiếu EN: hai dòng mã 8428.10.39/.40 và 8428.10.31/8428.40.00 phủ kín phân nhóm (không Loại khác), đúng chữ biểu. |
| 843139 | DUYET | Đối chiếu VI/EN: .10 mảng 4 mã, .40 đích lồng máy tự động ↔ tấm mạch in (khuôn 841290), .50 "của hàng hóa thuộc phân nhóm 8428.90"; tiền lệ 5950/5951 con lăn băng tải → .99 khớp. |
| 843141 | DUYET | Đối chiếu EN "For machinery of heading 84.26": dungCho 84.26; đúng. |
| 843149 | DUYET | Đối chiếu VI/EN từng dòng: lưỡi cắt/mũi lưỡi cắt cho máy cào-san-cạp (.20) và máy ủi lưỡi thẳng/nghiêng (.40), của xe lu (.50), của 8430.20.00 (.60); đúng. |
| 843280 | DUYET | Đối chiếu VI/EN: .10 "Agricultural or horticultural" ↔ .20 "Lawn or sports-ground rollers" chồng lấn thật (máy cán bãi cỏ dùng làm vườn) — chongLanVanBan trích đủ chữ hai dòng, chấp nhận. |
| 843290 | DUYET | Đối chiếu VI/EN: .10 mã 8432.80.90, .20 đích lồng "máy cán" + "bãi cỏ/sân chơi thể thao"; đúng. |
| 843319 | DUYET | Đối chiếu EN "Not powered": dungDongCo KHONG; đúng. |
| 843359 | DUYET | Đối chiếu EN "Cotton pickers": tenLoai "Máy hái bông"; "(cotton)" là ngoặc chú thích. |
| 843360 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 843390 | DUYET | Đối chiếu VI/EN .10 castor: tenLoai + đường kính >100 ≤250 mm + chiều rộng >30 mm đúng biên; .20 có thêm giá trị khung "hàng hóa thuộc phân nhóm" (chỉ chữ khung mã, không phân biệt gì) — thừa nhưng không đổi mã; .30 đúng. |
| 843510 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 843590 | DUYET | Đối chiếu VI/EN "Of (non-)electrically operated machines": hoatDongBangDien theo máy chủ (cùng cách 841490/844849 và tiền lệ 11955/TCHQ-TXNK ở 843790). |
| 843610 | DUYET | Đối chiếu VI/EN điện/không điện; tiền lệ 7520/6161/6281 → .10 (điện) khớp. |
| 843621 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 843629 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 843680 | DUYET | Đối chiếu VI/EN: tầng điện/không điện + "Agricultural or horticultural"; tiền lệ 3935/TCHQ-TNXK máy ép tách phân → .11 khớp. |
| 843699 | DUYET | Đối chiếu VI/EN: tầng "Của máy và thiết bị (không) hoạt động bằng điện" + dungCho nông nghiệp/làm vườn; đúng. |
| 843710 | TRA_VE (TRA_VE) | (A) 84371010/84371020 THU HẸP: chữ biểu có HAI vế nối ";" — "Dùng cho các loại hạt, hoạt động bằng điện; máy sàng sảy hạt và các loại máy làm sạch tương tự, hoạt động bằng điện" (EN "For grains, electrically operated; winnowing and similar cleaning machines, electrically operated") — điều kiện chỉ biểu diễn vế 1 (dungCho "các loại hạt" VÀ điện), vế 2 (máy sàng sảy và máy làm sạch tương tự, kể cả dùng cho hạt giống/đậu đỗ khô) không có phương án nào ⇒ phải HOAC [[dungCho hạt, điện],[TUONG_TU máy sàng sảy hạt, điện]]. Cổng 5 báo vế mở "mở — danh sách trước không bị liệt kê đóng" nhưng danh từ đầu "máy sàng sảy hạt" của vế 2 không được phủ (máy không thấy). (B) "các loại hạt" ↔ EN "grains" (ngũ cốc) — chữ Việt rộng hơn (hạt giống, đậu đỗ khô của tên phân nhóm 8437.10 cũng là "hạt") nên dungCho "các loại hạt" gần như thoả mọi máy của phân nhóm; người soạn cần nêu cách đọc theo EN. |
| 843780 | TRA_VE (TRA_VE) | (A) 84378030/84378040 LIỆT KÊ GÓI MỘT CHUỖI: tenLoai "Máy nghiền cà phê và ngô dạng công nghiệp" (EN "Industrial type coffee and corn mills") là HAI loại máy (máy nghiền cà phê; máy nghiền ngô) gói trong một giá trị — máy nghiền ngô công nghiệp không có chữ "cà phê" không thoả; phải là mảng tên nguyên văn ["Máy nghiền cà phê","ngô"…] và định ngữ chung "dạng công nghiệp" (industrial type) thành điều kiện riêng áp cho cả hai (LUAT vòng 7, như .10 đã tách "Máy bóc vỏ trấu"/"máy xát gạo hình côn"). (B) ghi chú: BO_VE "bằng điện" ở .10 đúng (định ngữ chung, máy tách vế đọc sai) — giữ. |
| 843790 | DUYET | Đối chiếu VI/EN + bảng hiệu chỉnh 843790-01 KHONG_LECH (11955/TCHQ-TXNK: trục chà lúa theo máy điện/không điện) khớp tầng hoatDongBangDien; .11/.21 mã 8437.10. |
| 843820 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 843830 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 843880 | DUYET | Đối chiếu VI/EN: tiêu đề "Coffee pulpers", "Machinery for the preparation of fish, crustaceans or molluscs" (tenLoai + congDung 3 đối tượng) + điện/không điện ba tầng; đúng. |
| 843890 | DUYET | Đối chiếu VI/EN: tầng điện/không điện + mã 8438.30.10/.20 + "Of coffee pulpers"; đúng. |
| 844010 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844110 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844180 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844331 | DUYET | Đối chiếu VI/EN: tổ hợp chức năng IN_COPY (+ in phun / laser), IN_COPY_FAX, IN_COPY_SCAN_FAX theo quyết định GĐ 07/11 (#1109); "Colour" ⇒ mauHienThi MAU; đúng. |
| 844332 | DUYET | Đối chiếu VI/EN: tiêu đề in kim/in phun/laser + màu; .40 fax, .50 in lưới cho mạch in, .60 "Plotters"; đúng. |
| 844339 | DUYET | Đối chiếu VI/EN: .10/.20 tên nguyên văn trực tiếp/gián tiếp, .30 "Other ... incorporating an optical system" phanConLai phủ định .10/.20, .40 in phun; đúng. |
| 844399 | TRA_VE (TRA_VE) | (A) chongLanTruc 84439910/.20/.30 GƯỢNG ÉP: viDuHang "Hộp mực in đã có mực in dùng cho máy in kiểu lưới để sản xuất tấm mạch in" và "Bộ phận cung cấp giấy dùng cho máy in kiểu lưới, dùng để sản xuất tấm mạch in" không phải hàng có thật — máy in lưới (screen printing) sản xuất mạch in dùng khung lưới + dao gạt mực/kem hàn, không dùng hộp mực in (EN "Ink-filled printer cartridges") và không nạp giấy (EN "Paper feeders; paper sorters"; máy nạp TẤM MẠCH, không nạp giấy). Chồng lấn là GIẢ do .10 dùng dungCho (không laBoPhan) còn .20/.30 dùng tenLoai (SOAT-RANH-GIOI §1, Vòng 8/8b: không có hàng thật ⇒ không khai cụm); người soạn tự ghi "người soát đọc lại tính thật của hàng". Đưa về cùng khoá hoặc DỪNG báo Claude. |
| 844400 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844511 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844519 | DUYET | Đối chiếu VI/EN: .30 "Cotton gins" + Loại khác điện/không điện; đúng. |
| 844520 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844530 | DUYET | Đối chiếu VI/EN điện/không điện; tiền lệ 8398/TB-TCHQ máy xe sợi động cơ điện → .10 khớp. |
| 844540 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844590 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844610 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844720 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844790 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844811 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844819 | DUYET | Đối chiếu VI/EN điện/không điện; đúng. |
| 844849 | DUYET | Đối chiếu VI/EN: tiêu đề "Shuttles" + "For (non-)electrically operated machines" theo máy chủ (cùng cách 841490 .41/.42 đã duyệt); đúng. |

## Lỗi quan trọng (TRA_VE)

1. **842940 .40 — khoá sai đại lượng, có chênh thuế.** Chữ biểu «Xe lu rung, với lực rung của trống không quá 20 tấn tính theo khối
   lượng» (EN «with a centrifugal force drum not exceeding 20 t by weight»): ngưỡng là lực ly tâm của trống, bản nháp ghi
   `khoiLuong <= 20 tấn` (khối lượng máy). .40 MFN 5 % ↔ .50 0 %. Không có khoá lực rung trong tu-vung@2 ⇒ đáng lẽ `THIEU_KHOA_TU_VUNG`.
2. **843710 .10/.20 — bỏ cả một vế sau «;».** «Dùng cho các loại hạt, hoạt động bằng điện; máy sàng sảy hạt và các loại máy làm sạch
   tương tự, hoạt động bằng điện» — chỉ vế 1 được biểu diễn; vế 2 (winnowing and similar cleaning machines) không có phương án.
3. **842890 .30 — vế mở dài bị bỏ + cắt sai cụm.** «… thiết bị lật toa xe và các thiết bị giữ xe goòng chạy đường sắt tương tự»
   chỉ thành liệt kê đóng; giá trị «đầu máy» tách khỏi «thanh ngang xe goòng hoặc đầu máy» (EN «locomotive or wagon traversers»).
4. **843780 .30/.40 — hai tên hàng gói một chuỗi.** «Máy nghiền cà phê và ngô dạng công nghiệp» (EN «Industrial type coffee and corn
   mills») là một giá trị TEN_LOAI; máy nghiền ngô công nghiệp không thoả.
5. **844399 — chongLanTruc dựng trên hàng không có thật.** viDuHang «Hộp mực in đã có mực in dùng cho máy in kiểu lưới để sản xuất tấm
   mạch in», «Bộ phận cung cấp giấy dùng cho máy in kiểu lưới…» — máy in lưới mạch in không dùng hộp mực/giấy; chồng lấn giả do .10
   `dungCho` ↔ .20/.30 `tenLoai`.

## Máy tách sai (để Claude chỉnh `lib/ho-so/tach-ve.js` / cổng 5)

| PN6:mục | Chữ biểu | Máy đọc | Đúng ra |
|---|---|---|---|
| 842890:84289030 | «… thiết bị lật toa xe và các thiết bị giữ xe goòng chạy đường sắt tương tự» (EN «and similar railway wagon handling equipment») | cả dòng là DAU, không nhận vế MỞ | vế MỞ dài (7 chữ giữa «các» và «tương tự», EN có «similar») — mẫu vòng 8 chỉ nhận 1–6 chữ |
| 843710:84371010/.20 | «…; máy sàng sảy hạt và các loại máy làm sạch tương tự, hoạt động bằng điện» | vế 2: DAU «máy sàng sảy hạt» không đòi phủ, MO «mở — danh sách trước không bị liệt kê đóng» ⇒ xanh | vế sau «;» là PHƯƠNG ÁN thay thế (HOẶC) của cả dòng — danh từ đầu của nó phải được phủ (hoặc báo «phương án không được biểu diễn») |
| 842940:84294040 | «Xe lu rung, với lực rung của trống không quá 20 tấn …» | DAU «Xe lu rung, với lực rung»; GIOI_HAN «của trống không quá 20 tấn tính theo khối lượng» | «với lực rung của trống không quá 20 tấn» là một vế biên số; máy không đối chiếu được đại lượng (lực ↔ khoiLuong) |
| 843780:84378010 | «Máy bóc vỏ trấu và máy xát gạo hình côn, hoạt động bằng điện» | TÁCH ĐỊNH NGỮ (B) «bằng điện» (chỉ của danh từ cuối) | định ngữ chung sau dấu phẩy (EN «…, electrically operated») — báo oan, người soạn phải BO_VE |
| 842489:84248940 | «… tấm nền của tấm mạch in hoặc tấm dây in hoặc linh kiện của chúng» | MO «hoặc linh kiện của chúng» | không phải vế mở mà là đối tượng thứ ba của «sản xuất»; giá trị «linh kiện của chúng» có đại từ treo (gần như giá trị chết) |
| 842441:84244110, 842489:84248910 | «Thiết bị phun thuốc trừ sâu hoạt động bằng tay», «Thiết bị phun, xịt hoạt động bằng tay …» | GIOI_HAN «trừ sâu hoạt động», DAU «Thiết bị phun, xịt hoạt động» | «hoạt động bằng tay» là một vế; «thuốc trừ sâu» là cụm danh từ (không đổi kết quả) |
| 844399:84439920 | «Hộp mực in đã có mực in» | DAU «Hộp mực in đã», GIOI_HAN «có mực in» | «đã có mực in» một vế (không đổi kết quả) |

## Ghi chú cho bản đã DUYET (không chặn)

- 843049 .10: BO_VE «có các mô-đun tích hợp» chấp nhận vì SEN 8430.49.10 đọc «BỆ DÀN KHOAN VÀ CÁC MÔ-ĐUN TÍCH HỢP» (mô-đun là hàng song
  song); mô-đun tích hợp đứng riêng theo SEN cũng vào .10 mà bản nháp chưa nêu — MFN .10/.90 cùng 0 %, nên làm rõ ở vòng sau.
- 843390 .20: thêm giá trị `dungCho "hàng hóa thuộc phân nhóm"` chỉ gồm chữ khung mã — không phân biệt gì, nên bỏ ở vòng sau.
- 842489 .40: giá trị «linh kiện của chúng» (xem bảng máy tách sai) — hướng hẹp, MFN .40/.50 cùng 0 %.
- «Của máy (không) hoạt động bằng điện» (843110, 843590, 843699, 843790, 843890, 844849): `hoatDongBangDien` đọc theo MÁY CHỦ của bộ
  phận — khớp tiền lệ 11955/TCHQ-TXNK (843790-01) và 841490 .41/.42 đã duyệt; bộ đọc lúc chạy cần hiểu cùng nghĩa.

## Kiểm sau lô

- 58/58 lệnh `--duyet` + `--ap-dung` (sau 842410 chạy tay) mã thoát 0 — không PN6 nào bị `cong3-mat-nguong-so` hay
  `can-bang-hieu-chinh-tien-le`; không phải hoàn tác PN6 nào.
- `node scripts/check-so-tay.mjs`: 1228 nhóm, 26010 mục, 0 mục không kiểm được nguồn (EXIT=0).
- `node scripts/check-cay.mjs`: 0 lỗi lệch cây.
- `node scripts/test-so-tay.mjs`: 65/65 passed.
- 5 bản TRA_VE chỉ đổi `trangThai`/`traVe` trong `data/ho-so/ranh-gioi/<pn6>.json`; sổ tay của chúng giữ nguyên.


## Soát lại của tech lead — bo-kiem-luat hai bên / test

Trả về 843141 843149: gộp thử với `main` làm phát sinh ca chốt sai mới trong `bo-kiem-luat --toan-bieu` hoặc làm đỏ `test-so-tay-gates`/`test-so-tay-questions` (cổng gộp không cho tăng). Mục sổ tay giữ như `main`.
