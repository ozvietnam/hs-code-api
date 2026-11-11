# Soát độc lập ranh giới 6→8 số — lô L14 (#1109)

Người soát: phiên `claude-agent:duyet-L14-20261111#soat-L14`, khác mọi phiên soạn. Ngày 11/11/2026. Bảng soát:
[`SOAT-RANH-GIOI.md`](../SOAT-RANH-GIOI.md), mục 0–5.

Cách làm cho từng PN6:
- Chạy `--kiem`: cả 62 PN6 đều XANH, không có DỪNG.
- Chạy `--goi` để xem cây và chữ biểu VI, chạy `--ve` để xem chữ VI + EN của từng mục và trạng thái từng vế.
- Đặt từng điều kiện trong bản nháp cạnh chữ biểu nguyên văn và hỏi ba câu của §2: hẹp hơn chữ? rộng hơn chữ? máy tách sai?
- Đọc mọi cảnh báo của cổng: `cong5-bo-ve`, `cong2-ten-anh-em-roi`, `cong2-tuong-tu-chua-chot`, `cong2-toi-khi-tuong-tu`,
  `cong2-chong-lan-van-ban`, `chongLanTruc` + `khongCoHangThat`.
- Tra `data/precedents.json` theo chuỗi mã của lô (§3) và đối chiếu `data/ho-so/hieu-chinh-tien-le.json`. Bảng hiệu chỉnh không
  có mục nào của lô.

## Tóm tắt

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 59 |
| TRA_VE | 3 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo PN6 là **3/62 = 4,8%**. Theo dòng 8 số có điều kiện là 3 dòng sai trên khoảng 110 dòng (≈ 2,7%). Ba dòng bị lấn
là 44187390, 44124190 và 44129190. Mỗi dòng có cùng thuế MFN với dòng lấn nó (5%), nên thuế không lệch, nhưng mã 8 số khai trên
tờ khai sai. Theo nhóm 4 số: 4412 sai 2/2 PN6 trong lô, 4418 sai 1/2, các nhóm còn lại 0.

Sau khi áp dụng 59 bản, `check-so-tay`, `check-cay` và `test-so-tay` đều xanh.

## Lỗi đã trả về

1. **441873:44187320 — SUY RỘNG.** Chữ biểu: "Loại khác, nhiều lớp từ tre" (EN "Other, of multilayer of bamboo"). Bản nháp
   chỉ ghi điều kiện `nhieuLop CO`, bỏ vế "từ tre". Phân nhóm 441873 có hai lớp hàng: "Từ tre **hoặc** có ít nhất lớp trên
   cùng (lớp phủ) từ tre". Chữ "từ tre" ở dòng .20 tách tấm nhiều lớp toàn tre khỏi tấm nhiều lớp chỉ có lớp mặt tre (lõi
   gỗ/HDF). Hệ quả: sàn tre kỹ thuật mặt tre lõi gỗ bị kéo về .20, trong khi theo chữ biểu phải là .90.
2. **441241:44124110 — SUY RỘNG.** Chữ biểu: "Với ít nhất một lớp ngoài bằng gỗ tếch" (EN "With at least one outer ply of
   teak"). Bản nháp chỉ ghi `tenLoai TEN_LOAI "gỗ tếch"`: giới hạn vị trí "lớp ngoài" bị bỏ, vật liệu bị nhét vào tên hàng. Ván
   có mặt gỗ nhiệt đới khác mà chỉ lớp trong là tếch vẫn thoả .10, nên .10 lấn .90. Từ vựng không có khoá vật liệu lớp ngoài,
   nên đáng lẽ phải ghi `THIEU_KHOA_TU_VUNG` và DỪNG.
3. **441291:44129110 — SUY RỘNG.** Cùng chữ biểu và cùng lỗi như 441241.

## Bảng chi tiết

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 440220 | DUYET | Đối chiếu VI "Than gáo dừa" / EN "Of coconut shell": tenLoai đúng chữ, .90 trần. |
| 440311 | DUYET | Đối chiếu VI "Cột sào, khúc gỗ xẻ và gỗ lạng" / EN "Baulks, sawlogs and veneer logs": mảng tenLoai đủ ba hàng, không vế giới hạn; .90 trần. |
| 440312 | DUYET | Như 440311: mảng tenLoai đủ ba hàng; .90 trần. |
| 440321 | DUYET | Như 440311; biên 15 cm nằm ở cấp 6 số, không cần ở 8 số. |
| 440322 | DUYET | Như 440311. |
| 440323 | DUYET | Như 440311. |
| 440324 | DUYET | Như 440311. |
| 440325 | DUYET | Như 440311. |
| 440326 | DUYET | Như 440311. |
| 440341 | DUYET | Như 440311; loài gỗ nằm ở cấp 6 số. |
| 440342 | DUYET | Như 440311. |
| 440349 | DUYET | Như 440311. |
| 440391 | DUYET | Như 440311. |
| 440393 | DUYET | Như 440311. |
| 440394 | DUYET | Như 440311. |
| 440395 | DUYET | Như 440311. |
| 440396 | DUYET | Như 440311. |
| 440397 | DUYET | Như 440311. |
| 440398 | DUYET | Như 440311. |
| 440399 | DUYET | Như 440311. |
| 440420 | DUYET | Đối chiếu VI "Nan gỗ (Chipwood)" / EN "Chipwood": tenLoai là hai cách gọi của cùng một hàng; .90 trần. |
| 440500 | DUYET | Đối chiếu VI "Sợi gỗ"/"Bột gỗ" / EN "Wood wool"/"Wood flour": hai dòng phủ đúng tên nhóm 4405, không có Loại khác. |
| 440711 | DUYET | Đối chiếu VI "Đã xẻ dọc, chưa gia công thêm" / EN "Sawn lengthwise, not further worked": mucDoGiaCongGo XE_DOC_CHUA_GIA_CONG phủ cả vế "chưa gia công thêm". |
| 440719 | DUYET | Như 440711. |
| 440721 | DUYET | Đối chiếu VI "Đã bào, đã chà nhám hoặc nối đầu" / EN "Planed, sanded or end-jointed": mucDoGiaCongGo BAO_CHA_NHAM_NOI_DAU; .90 trần. |
| 440722 | DUYET | Như 440721. |
| 440723 | DUYET | Đối chiếu .10 "Đã xẻ dọc, chưa gia công thêm" và .20 "Đã bào, đã chà nhám hoặc nối đầu" (VI+EN): cùng khoá mucDoGiaCongGo, hai giá trị loại trừ nhau. |
| 440725 | DUYET | Đối chiếu tiêu đề 4407251 "Gỗ Meranti đỏ sẫm hoặc gỗ Meranti đỏ nhạt", 4407252 "Gỗ Meranti Bakau" và các dòng xẻ dọc/bào (VI+EN): tenLoai loài đúng chữ, mucDoGiaCongGo cùng khoá. |
| 440726 | DUYET | Như 440723 (dòng .20/.30). |
| 440727 | DUYET | Như 440723 (dòng .20/.30). |
| 440728 | DUYET | Như 440721. |
| 440729 | DUYET | Đối chiếu 7 tiêu đề loài (Jelutong … Mengkulang), tầng 4407299 "Loại khác" và 28 dòng (VI+EN): tenLoai loài đúng chữ, kèm tên khoa học. .92/.95/.97 "…, loại khác" có phanConLai chỉ phủ định anh em cùng loài; .98 "Loại khác, đã bào…" chỉ ghi vế gia công. |
| 440791 | DUYET | Như 440723 (dòng .20/.30). |
| 440792 | DUYET | Như 440721. |
| 440793 | DUYET | Như 440721. |
| 440794 | DUYET | Như 440721. |
| 440795 | DUYET | Như 440721. |
| 440796 | DUYET | Như 440721. |
| 440797 | DUYET | Như 440721. |
| 440799 | DUYET | Như 440721. |
| 440810 | DUYET | Đối chiếu .10 "Thanh mỏng bằng gỗ tuyết tùng loại sử dụng để sản xuất bút chì; gỗ thông Radiata loại sử dụng để sản xuất ván ghép" (EN "Cedar wood pencil slats; Radiata pinewood of a kind used for blockboard manufacture"): HOAC hai lớp hàng, đủ vế. Lưu ý chồng lấn có thể có với .30 (xem phần ghi chú). |
| 440839 | DUYET | Đối chiếu .10 "Thanh mỏng bằng gỗ Jelutong loại sử dụng để sản xuất bút chì" / EN "Jelutong wood pencil slats" và .20 "Làm lớp mặt (face veneer sheets)": điều kiện đúng chữ. |
| 440890 | DUYET | Đối chiếu VI "Làm lớp mặt (face veneer sheets)" / EN "Face veneer sheets": một dòng có tên + .90 trần; congDung "Làm lớp mặt" đúng chữ. |
| 441241 | **TRA_VE** | 44124110 SUY RỘNG: "Với ít nhất một lớp ngoài bằng gỗ tếch" chỉ còn tenLoai "gỗ tếch", bỏ "lớp ngoài"; .10 lấn .90. |
| 441291 | **TRA_VE** | 44129110 SUY RỘNG: như 441241. |
| 441600 | DUYET | Đối chiếu VI "Tấm ván cong" / EN "Staves": tenLoai đúng chữ; .90 trần. |
| 441700 | DUYET | Đối chiếu VI "Khuôn (phom) của giày hoặc ủng" / EN "Boot or shoe lasts": tenLoai + dungCho [giày, ủng] phủ vế "của giày hoặc ủng"; cốt giày (shoe trees) đúng là rơi vào .90. |
| 441873 | **TRA_VE** | 44187320 SUY RỘNG: "Loại khác, nhiều lớp từ tre" chỉ còn nhieuLop CO, bỏ "từ tre"; tấm nhiều lớp mặt tre lõi gỗ bị kéo từ .90 sang .20. |
| 441881 | DUYET | Đối chiếu VI "Hình khối (SEN)" / EN "In block shape": tenLoai "Hình khối" đúng chữ (theo SEN: glulam dạng khối, mặt cắt chữ nhật/vuông); .90 trần. |
| 442090 | DUYET | Đối chiếu .10 "Các đồ nội thất bằng gỗ không thuộc Chương 94" (EN "Wooden articles of furniture not falling in Chapter 94") và .20 "Hộp và các vật chứa nhỏ khác dùng và thích hợp để mang trong túi…". BO_VE "không thuộc Chương 94" đứng được: vế này lặp chữ EN của phân nhóm 442090, và hàng Chương 94 không vào nhóm 4420. mangTheoNguoi phủ vế mang theo người. |
| 442191 | DUYET | Đối chiếu 7 dòng (VI+EN): .10 TUONG_TU đúng 4 hàng nêu tên. .40 "Quạt và màn che kéo bằng tay … và các bộ phận của chúng" (EN "Fans and handscreens, frames and handles therefor, and parts thereof") có HOAC đúng: "kéo bằng tay" chỉ đi với màn che, khung/tay cầm thuộc nhánh bộ phận. Đã đọc hai cụm chongLanTruc khongCoHangThat và đồng ý không có hàng thật thoả cả hai nhánh. |
| 442199 | DUYET | Đối chiếu 10 dòng + tầng 4421999 (VI+EN): .10 TUONG_TU đúng 4 hàng nêu tên; .30 tenLoai [Móc gỗ, ghim gỗ] + dungCho [giày, dép]; .70 HOAC như 442191; .94 "Chuỗi hạt khác" có phanConLai chỉ phủ định .93. Tiền lệ 6252/TB-TCHQ (44219099, biểu 2012) nay rơi đúng vào .99. Đã đọc chongLanTruc khongCoHangThat. |
| 460192 | DUYET | Đối chiếu .10 "Dây tết bện và các sản phẩm tương tự … đã hoặc chưa ghép thành dải" (EN "Plaits and similar products…") và .20 Quạt/màn che (VI+EN): dayTetBen đọc trọn vế mở + vế giới hạn; HOAC ở .20 đúng. chongLanVanBan .10+.20 an toàn (xem phần ghi chú). |
| 460193 | DUYET | Như 460192 (song mây). |
| 460194 | DUYET | Như 460192 (vật liệu thực vật khác). |
| 460199 | DUYET | Đối chiếu .10 "Chiếu và thảm" (EN "Mats and matting"), .20 dây tết bện, .30 Quạt/màn che (VI+EN): điều kiện đúng chữ. Tiền lệ 1805/TB-TCHQ (dây tết bện nylon → 46019920) đi đúng vào .20 qua dayTetBen. Hai chongLanVanBan an toàn: lúc chạy hệ thống hỏi chứ không tự chọn. |
| 460211 | DUYET | Đối chiếu VI "Túi và vali du lịch"/"Giỏ đựng chai" / EN "Travelling bags and suitcases"/"Envelopes for bottles": loaiHangDanLat là một khoá với hai giá trị loại trừ nhau; "du lịch" đi chung với túi và vali nằm trong giá trị liệt kê. |
| 460212 | DUYET | Như 460211 (song mây). |
| 460219 | DUYET | Như 460211 (vật liệu thực vật khác). |
| 460290 | DUYET | Như 460211 (vật liệu không phải thực vật). |
| 470200 | DUYET | Đối chiếu VI "Từ gỗ cây lá kim"/"Từ gỗ cây không thuộc loài cây lá kim" / EN "Coniferous"/"Non-coniferous": goLaKim CO/KHONG cùng khoá, phủ kín, không có Loại khác. |
| 470693 | DUYET | Đối chiếu VI "Bột giấy abaca (SEN)" / EN "Abaca pulp": tenLoai đúng chữ; .90 trần. |

## Máy tách sai (§2) — để Claude chỉnh `lib/ho-so/tach-ve.js`

1. **441873 .20** "nhiều lớp từ tre": bộ tách để cả cụm thành DAU. Vế vật liệu "từ <vật liệu>" đứng sau đầu ngữ không được
   nhận là GIỚI HẠN, nên cổng 5 không báo vế "từ tre" bị bỏ. Lỗi 1 ở trên lọt qua cổng vì chỗ này.
2. **441241 / 441291 .10** "Với ít nhất một lớp ngoài bằng gỗ tếch": bộ tách coi "Với ít nhất một lớp ngoài" là đầu ngữ, trong
   khi đó là giới hạn vị trí đi cùng "bằng gỗ tếch". Cổng 5 thấy "bằng gỗ tếch" đã được tenLoai phủ nên báo xanh, dù giới hạn vị
   trí bị bỏ.
3. **442191 .40 / 442199 .70 / 460192 .20 / 460193 .20 / 460194 .20 / 460199 .30** "Quạt và màn che kéo bằng tay, khung và tay
   cầm, quai kèm theo, …": bộ tách cắt thành DAU "Quạt và màn che kéo" + GIỚI HẠN "bằng tay, khung và tay cầm, quai kèm theo",
   tức là gộp hai danh từ "khung và tay cầm" (frames and handles therefor) vào vế giới hạn "kéo bằng tay". Bản nháp vẫn đúng vì
   khung/tay cầm thuộc nhánh bộ phận của HOAC, nên không trả về.
4. **442090 .20** "Hộp và các vật chứa nhỏ khác dùng và thích hợp để mang …": bộ tách cắt cụm danh từ "vật chứa" thành DAU
   "Hộp và các vật" + GIỚI HẠN "chứa nhỏ khác dùng". Bản nháp vẫn đúng: tenLoai ["Hộp","vật chứa nhỏ"] + mangTheoNguoi.
5. **460192/3/4 .10, 460199 .20** "Dây tết bện … làm bằng vật liệu tết bện": bộ tách sinh một DAU rỗng nghĩa "làm" đứng trước
   "bằng …". Không gây hại, nhưng nên gộp "làm bằng" vào vế giới hạn.

Cổng 5 báo 54 vế phải phủ trong lô: 53 vế "phủ" và 1 vế miễn bằng BO_VE (442090 "không thuộc Chương 94", miễn đúng). Người
soát xác nhận 51 vế phủ đúng. 2 vế báo "phủ" nhưng sai: hai vế "bằng gỗ tếch" (441241, 441291) mất giới hạn vị trí. Ngoài ra có
1 vế máy không tách ra nên không báo: "từ tre" ở 441873.

## Ghi chú cho người sau (không đổi kết luận)

- **4601 (460192/3/4, 460199):** các cặp `chongLanVanBan` dây tết bện ↔ quạt/màn che và dây tết bện ↔ chiếu/thảm ghi lý do
  "chữ biểu không loại trừ nhau". Theo chú giải nhóm 46.01, "plaits" là dây/dải tết, còn quạt hay chiếu là thành phẩm. Chồng lấn
  này sinh ra vì khoá `dayTetBen` (CO_KHONG) không loại trừ tên hàng, không phải do chữ biểu. Vì đây là hướng sai an toàn (lúc
  chạy hệ thống hỏi chứ không chọn bừa), người soát vẫn duyệt. Nếu sau này có khoá loại trừ thì nên gỡ các cặp này.
- **440810:** SEN 44081010 nói tấm thông Radiata "được sử dụng để làm lớp mặt gỗ ván ghép", nên một hàng có thể thoả cả .10 và
  .30 "Làm lớp mặt". Cả hai dòng đều là so chữ tự do nên lúc chạy không tự chốt; bản nháp không khai `chongLanVanBan`. Hai dòng
  cùng MFN 0%.
- **Cách ghi "Làm lớp mặt" chưa thống nhất:** 440810 và 440839 dùng `tenLoai`, còn 440890 dùng `congDung`. Trong từng PN6 thì
  không sai, vì không có cặp anh em nào lệch khoá, nhưng nên thống nhất.
- **442191 .20** "Thanh gỗ để làm diêm" nằm trong phân nhóm TỪ TRE. `tenLoai "Thanh gỗ"` đúng chữ biểu, nhưng hàng thật thường
  khai "que/thanh tre làm diêm" nên sẽ không khớp khi so chữ, và lúc chạy hệ thống sẽ hỏi. Vì đúng chữ biểu nên không trả về.
- **Tiền lệ:** 1805/TB-TCHQ (dây tết bện nylon → 46019920) đi đúng vào .20 của 460199. 6252/TB-TCHQ (44219099, biểu 2012) nay
  rơi đúng vào 44219999. 1648/TB-TCHQ (44029090) và 7164/TB-TCHQ (44187500) nằm ngoài lô.
