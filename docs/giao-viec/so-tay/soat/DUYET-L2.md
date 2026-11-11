# Soát độc lập lô L2: 64 phân nhóm chương 03 (#1109)

- Phiên soát: `claude-agent:duyet-L2-20261111#soat-L2` (ngày 11/11/2026). Người soạn: `zcode-sub:glm-5.3:*`, `session_01Ce5532…`, `session_01Y2pG…`.
- Cách làm: theo [`SOAT-RANH-GIOI.md`](../SOAT-RANH-GIOI.md) mục 0–5. Với mỗi PN6 đã chạy `--kiem` (64/64 XANH, không có DỪNG) và `--ve` (chữ biểu VI + EN từng dòng và từng tầng). Đã đặt từng điều kiện cạnh chữ biểu, rồi **chạy thử điều kiện** bằng `lib/dieu-kien-so.js#danhGiaDieuKien` trên mô tả hàng thật (vd "Cá mú tươi", "Bột tôm khô") để xem điều kiện cho THOA, TRAI hay CHUA_BIET. Đã tra `data/precedents.json` và `data/ho-so/hieu-chinh-tien-le.json`: chỉ 030743 có tiền lệ (5186/TCHQ-TXNK, mục bảng 030743-01).
- Không đọc `data/bench/*` và `data/oz-export/*`.

## Tổng kết

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 45 |
| TRA_VE | 18 |
| đỏ (không soát) | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 1 (030389) |

Tỉ lệ sai theo PN6 đã soát: **18/63 = 28,6 %**. Sai tập trung vào 4 kiểu lỗi (mục "Kiểu lỗi" bên dưới); 3 kiểu đầu lặp lại ở nhiều PN6.

Sau khi áp dụng, chạy lại thì `check-so-tay` xanh (0 mục không kiểm được nguồn), `check-cay` xanh (0 lệch cây) và `test-so-tay` đạt 65/65.

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 030111 | TRA_VE | 03011195: chữ biểu "Cá rồng (Scleropages formosus)" bị rút thành tenLoai "Cá rồng" ⇒ SUY RỘNG. Thử "Cá rồng bạc (Osteoglossum bicirrhosum)" thì THOA nên vào .95 (loài CITES I), trong khi đúng phải là .99 |
| 030119 | DUYET | Cá bột ⇒ caBot CO |
| 030193 | DUYET | Hai tầng chi/loài cá chép; .21/.31 dungLamGiong CO + caBot KHONG |
| 030199 | TRA_VE | Nút 0301994 "Cá nước ngọt khác" khai tenLoai "Cá nước ngọt", 03019950 khai tenLoai "Cá biển". Thử "Cá rô phi sống" thì TRAI, hàng trượt về .90. Phải dùng moiTruongSongCuaCa (như 030389 và chính .41) |
| 030272 | DUYET | Tên riêng loài; thử "Cá tra tươi" thì TRAI và về .90, đúng |
| 030289 | TRA_VE | Nút 0302891 "Cá biển" khai tenLoai. Thử "Cá mú tươi" thì TRAI ở nút nên rơi về 03028929 (MFN 20 %) thay vì .11 (MFN 12 %) |
| 030345 | DUYET | Hai dòng Atlantic/Pacific phủ đủ phân nhóm |
| 030349 | DUYET | Value có kèm ngoặc tên khoa học (luật cho phép; xem mục "Hệ thống") |
| 030354 | DUYET | Giữ "(sa ba)" trong value của .20 là đúng, vì "saba Na Uy" là S. scombrus và thuộc .10 |
| 030359 | DUYET | |
| 030389 | chưa soát | Người soạn có phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-030389`, trùng session điều phối lô soát này, nên để một phiên độc lập khác duyệt. Đọc lướt không thấy lỗi; bản này là mẫu đúng cho khoá moiTruongSongCuaCa |
| 030489 | DUYET | |
| 030499 | DUYET | Surimi + nguonGocSinhVat TU_CA (theo SEN) |
| 030520 | TRA_VE | 03052010 "Của cá nước ngọt…" khai dungCho CONG_DUNG "cá nước ngọt". Thử "trứng cá chép muối" thì TRAI và về .90 |
| 030539 | TRA_VE | .91/.92 "Của cá nước ngọt"/"Của cá biển" khai dungCho. Thử "Phi lê cá tra muối" và "Phi lê cá thu muối" đều TRAI, về .99 |
| 030549 | DUYET | Value kèm ngoặc đồng nghĩa; xem mục "Hệ thống" |
| 030559 | TRA_VE | Nút 0305592 "Cá biển" khai tenLoai. Value .21 "Cá cơm (cá trỏng)" đòi có cả tên đồng nghĩa, nên thử "Cá cơm khô" thì TRAI ở cả hai chỗ |
| 030569 | TRA_VE | 03056910 "Cá biển" khai tenLoai. Thử "Cá thu muối" thì TRAI và về .90 |
| 030571 | TRA_VE | 03057110 "Khô hoặc hun khói" khai [KHO_MUOI, HUN_KHOI], mà KHO_MUOI = "khô, muối hoặc ngâm nước muối" ⇒ SUY RỘNG: vây cá mập muối (không khô) vào .10 |
| 030572 | DUYET | "Của cá tuyết" khai dungCho "cá tuyết". Khoá không đúng nghĩa nhưng đọc đúng: "Bong bóng cá tuyết khô" THOA, "cá đù" TRAI |
| 030579 | DUYET | Như 030572 |
| 030611 | DUYET | Hun khói ⇒ HUN_KHOI |
| 030612 | DUYET | Như 030611 |
| 030614 | DUYET | .11 tenLoai "vỏ mềm" (theo EN "Soft shell crabs"); .91–.93 kèm ngoặc họ |
| 030617 | DUYET | Hai tầng tên loài + soCheTom |
| 030631 | TRA_VE | .10 "Để nhân giống" khai dungCho "nhân giống" thay vì dungLamGiong. Cặp chongLanVanBan .10/.30 là chồng lấn GIẢ: con giống là hàng sống, còn .30 "Tươi hoặc ướp lạnh" là hàng không sống |
| 030632 | TRA_VE | Như 030631 |
| 030633 | TRA_VE | Nút 0306331 tách "Ghẹ xanh" khỏi "(Callinectes spp.)". Tiếng Việt "ghẹ xanh" thường chỉ Portunus pelagicus ⇒ "Ghẹ xanh sống" (Portunus) THOA nên vào .11 thay vì .91, SUY RỘNG |
| 030635 | TRA_VE | Như 030631 |
| 030636 | TRA_VE | Nút 0306361 khai congDung "nhân giống" thay vì dungLamGiong, kèm 4 cặp chongLanVanBan .1x/.3x giả. MFN .12 là 0 %, .32 là 12 % |
| 030639 | DUYET | Nút pn6 [SONG, TUOI_UOP_LANH] (#1109) |
| 030691 | DUYET | Tầng bao bì kín khí để bán lẻ + Hun khói |
| 030692 | DUYET | Như 030691 |
| 030693 | DUYET | Như 030691 |
| 030694 | DUYET | Như 030691 |
| 030695 | TRA_VE | 03069521 "Còn vỏ, đã hấp chín hoặc luộc chín trong nước" chỉ khai tenLoai "Còn vỏ", bỏ vế hấp/luộc dù khoá HAP_LUOC_CHIN có sẵn ⇒ SUY RỘNG. **Máy tách sai** |
| 030699 | DUYET | Như 030691 |
| 030711 | DUYET | tenLoai "Sống" / ["Tươi","ướp lạnh"]: đúng phạm vi nhưng không tất định. Nên chuyển sang phuongPhapBaoQuan + dieuKienNut[pn6] như 030633/030639 |
| 030719 | DUYET | Như 030711 (Khô, muối… / Hun khói) |
| 030721 | DUYET | Như 030711 |
| 030729 | DUYET | Như 030719 |
| 030731 | DUYET | Như 030711 |
| 030739 | DUYET | Như 030719 |
| 030742 | TRA_VE | .11/.21 tenLoai ["Mực nang","mực ống"] bỏ danh sách tên khoa học giới hạn loài. Sepia pharaonis vì thế vào .11/.21, trái 5186/TCHQ-TXNK và mục bảng 030743-01 |
| 030743 | TRA_VE | Như 030742: MFN .10 là 10 %, .90 là 0 %. Thêm: không ghi chú trỏ mục bảng hiệu chỉnh 030743-01 |
| 030749 | TRA_VE | Như 030742 (.21/.31) |
| 030751 | DUYET | Như 030711 |
| 030759 | DUYET | Như 030719 |
| 030760 | DUYET | 4 dòng phủ đủ 6 cách bảo quản của phân nhóm |
| 030771 | DUYET | Như 030711 |
| 030779 | DUYET | Như 030719 |
| 030781 | DUYET | Như 030711 |
| 030782 | DUYET | Như 030711 |
| 030787 | DUYET | Như 030719 |
| 030788 | DUYET | Như 030719 |
| 030791 | DUYET | Như 030711 |
| 030799 | DUYET | Như 030719 |
| 030811 | DUYET | Như 030711 |
| 030819 | DUYET | Như 030719 |
| 030821 | DUYET | Như 030711 |
| 030829 | DUYET | Như 030719 |
| 030830 | DUYET | 5 dòng phủ đủ phân nhóm |
| 030890 | DUYET | Như 030830 |
| 030990 | TRA_VE | "Của động vật giáp xác / thân mềm / thủy sinh không xương sống khác" khai dungCho. Thử "Bột tôm khô" thì TRAI ở mọi nhánh. Thiếu khoá thì phải ghi THIEU_KHOA_TU_VUNG, không ép dùng dungCho |

## Kiểu lỗi (để người soạn sửa hàng loạt)

1. **Dùng tenLoai/dungCho cho một LOẠI chứ không phải TÊN hàng** (030199, 030289, 030520, 030539, 030559, 030569, 030990). Các tiêu đề "Cá biển", "Cá nước ngọt khác", "Của cá …", "Của động vật giáp xác" là nhóm loài. Mô tả hàng thật ghi tên loài ("cá mú", "bột tôm"), nên so chữ tự do cho **TRAI** chứ không cho CHUA_BIET. Khi nút "Loại khác" anh em là dòng trần, hàng bị đẩy sang đó (030289: MFN 20 % thay vì 12 %). Với cá đã có khoá `moiTruongSongCuaCa` (030389 dùng đúng). Với nhóm động vật (giáp xác/thân mềm) chưa có khoá, cần đề xuất khoá mới.
2. **Bỏ ngoặc tên khoa học khi ngoặc là GIỚI HẠN** (030111, 030633, 030742, 030743, 030749). Ngoặc chỉ là chú thích khi tên tiếng Việt đã ứng 1:1 với loài (Koi, cá vàng, cá ngừ bò). Khi tên tiếng Việt rộng hơn loài ghi trong ngoặc (cá rồng, ghẹ xanh, mực nang/mực ống so với danh sách tên khoa học), bỏ ngoặc là suy rộng. 5186/TCHQ-TXNK xác nhận điều này cho mực.
3. **"Để nhân giống" khai bằng dungCho/congDung thay vì dungLamGiong, rồi khai chồng lấn giả với "Tươi hoặc ướp lạnh"** (030631, 030632, 030635, 030636).
4. **Bỏ vế giới hạn mà từ vựng có khoá diễn đạt được, hoặc dùng giá trị liệt kê rộng hơn chữ** (030571 KHO_MUOI ⊃ "Khô"; 030695 bỏ HAP_LUOC_CHIN).

## Máy tách sai (`lib/ho-so/tach-ve.js`, để Claude sửa)

- **030695 / 03069521** "Còn vỏ, đã hấp chín hoặc luộc chín trong nước" (EN "In shell, cooked by steaming or boiling in water"): bộ tách xếp CẢ DÒNG làm DAU nên không tách vế giới hạn "đã hấp chín hoặc luộc chín trong nước". Cổng 5 vì thế không báo vế chưa phủ. Dấu hiệu cần bắt: phân từ "đã <động từ>" đứng sau dấu phẩy.
- Cổng 5 cũng không coi ngoặc tên khoa học giới hạn loài (vd "(Sepia officinalis, …)" sau "Mực nang") là vế cần phủ; hiện ngoặc nào cũng bị gán PHU. Không sửa được bằng bộ tách. Phải có người soát hoặc bảng tiền lệ (030743-01) chặn.

## Hệ thống (không trả riêng PN6 nào, báo Claude)

- Với value TEN_LOAI có kèm ngoặc (vd "Cá ngừ bò (Thunnus tonggol)", "Cá ngừ vằn (cá ngừ sọc dưa) (Katsuwonus pelamis)"), thử "Thunnus tonggol đông lạnh" hay "Cá ngừ vằn hun khói" đều cho TRAI (không tất định). Bộ so chữ đòi đủ mọi âm tiết của value, nên ngoặc đồng nghĩa và ngoặc tên khoa học làm hẹp đường khớp. Luật hiện cho phép chép nguyên văn (đã có tiền lệ DUYET: 320820, 701990, 853939, 960990). Đề nghị: bộ so chữ coi ngoặc là đường khớp thay thế, hoặc luật buộc ngoặc đồng nghĩa phải viết thành mảng.
- Các phân nhóm "Sống / Tươi hoặc ướp lạnh / Khô, muối… / Hun khói" của 0307–0308 khai bằng tenLoai (không tất định) để né lỗ hổng giả của khoá liệt kê. Claude đã sửa đúng cách ở 030633, 030639, 030742 (dieuKienNut[pn6] + phuongPhapBaoQuan). Đề nghị đổi đồng loạt cho 23 PN6 đã DUYET ở lô này.

## Đo cổng 5

Cổng 5 báo 30 vế GIỚI HẠN trên 17 PN6, và cả 30 đều "phủ". Người soát xác nhận 20 vế phủ đúng. 10 vế "phủ" nhưng phủ sai: dùng khoá sai nghĩa (030520 ×1, 030539 ×2, 030990 ×3) hoặc dùng khoá sai cho "Để nhân giống" (030631, 030632, 030635, 030636 ×1 mỗi PN6). Cổng 5 bỏ sót 1 vế giới hạn (030695, máy tách sai). Các lỗi kiểu 1 và 2 nằm ở DAU/PHU nên cổng 5 không đo được.
