# Phân nhóm 6 số (PN6) đang DỪNG — vướng gì, cần gì

Cập nhật 07/11/2026 (Claude, #1109). Thay toàn bộ bản cũ. Mỗi PN6 DỪNG có **đúng một** ghi chú `DUNG` trong
`docs/giao-viec/so-tay/spec/<pn6>.json`, cùng khuôn: **[LOẠI] vướng gì — CẦN: gỡ bằng gì — (LÚC CHẠY: hệ thống làm gì trong lúc chờ)**.
PN6 DỪNG không được dùng lúc chạy; lúc chạy chỉ dùng bản đã duyệt.

## Số liệu

| | Số PN6 |
|---|---|
| DỪNG hiện tại | **93** |
| Chờ anh quyết (Q1, Q2, Q3) | 69 |
| Thiếu khoá từ vựng (giao thẻ khoá) | 5 |
| Claude làm tiếp (công cụ / soát lại) | 19 |

## Ba việc cần anh quyết

### Q1 — Chồng lấn chưa có hàng thật (38 PN6)

**Vấn đề.** Hai dòng anh em chia theo hai tiêu chí khác nhau, thường là tên ↔ công dụng: «Bông gòn» ↔ «Loại dùng chủ yếu
trong thuộc da»; «Vi phim» ↔ «Dùng cho chụp X quang»; «Ủng cưỡi ngựa» ↔ «Giày đế gỗ». Máy ghép được một hàng thoả cả hai,
nhưng ngoài đời không có hàng như vậy. Luật vòng 8 (anh chốt 01/11) bắt phải có **hàng thật** làm ví dụ mới cho khai chồng
lấn, nên các PN6 này đứng yên.

**Đề xuất.** Cho khai thêm một loại: «cặp này không có hàng thật thoả cả hai», kèm lý do bằng lời và **chỉ Claude được duyệt**.
Lúc chạy **không đổi gì**: hàng thật mà thoả cả hai thì hệ thống vẫn hỏi người dùng, không tự chọn. Cái được là các PN6 này
qua cổng và được dùng lúc chạy cho mọi hàng bình thường. Rủi ro: khai sai một cặp chồng THẬT thành «không có hàng thật».
Khi đó lúc chạy vẫn hỏi, không xếp sai, nên rủi ro thấp.

### Q2 — Ô tô ↔ xe ba bánh (5 PN6: 870421, 870431, 870441, 870451, 870460)

Các dòng «Ô tô tải đông lạnh», «Ô tô pick-up»… bị coi là chồng với «Xe ba bánh», vì máy không biết «ô tô» là xe từ bốn bánh
trở lên. Cần **bản chính thức** văn bản định nghĩa «xe ô tô» (Luật 36/2024/QH15 hoặc TCVN 6211:2003) để trích nguyên văn
làm nguồn (thẻ #1101, anh đã cho dùng quy chuẩn chuyên ngành). Claude không tải được văn bản (trang chặn hoặc chỉ trả khung trống).
**Anh gửi PDF**, Claude làm tiếp #1101.

### Q3 — Chương 98 thiếu nguồn phạm vi (26 PN6)

Nhóm 98.xx là biện pháp riêng của Việt Nam. Phạm vi của chúng («dùng cho xe có động cơ», «để sản xuất sản phẩm CNTT trọng
điểm», khối lượng 20–45 tấn…) nằm ở quy định Chương 98 (Nghị định 26/2023/NĐ-CP, Mục I), không nằm trong biểu. Hiện cây
không có tên các nhóm 98.xx, nên hàng ngoài phạm vi bị coi là lỗ hổng. **Anh quyết** có nạp chữ quy định Chương 98 làm
nguồn không. Nếu nạp, cần bản chính thức; Claude làm phần nạp và kiểm.

## Việc Claude tự làm tiếp (công cụ)

| Việc | PN6 |
|---|---|
| Khoá mới: «đã biến đổi hoá học» (mỡ/dầu), «thể rắn / thể lỏng», chỉ số iốt không đơn vị, vật liệu polyme | 151800, 151329, 151190, 151620, 391690 |
| Từ vựng khai «giá trị chung ⊃ giá trị riêng» (sợi nhân tạo ⊃ tổng hợp, tái tạo) — đổi cả cách so lúc chạy | 610520 |
| Cơ chế đính chính khoá @1 đọc sai nghĩa («micro switch») | 853650 |
| «Bộ phận» trơn = bộ phận của tầng trên; luật «hàng không là bộ phận của chính nó» | 870895, 870891 |
| Bộ máy: đích lồng, tên ↔ mã, tên đa nghĩa, HOẶC dưới tầng có tên, vế «tương tự» | 842490, 871690, 852910, 870829, 847790, 850790, 842199, 870600, 848620, 681140, 848690 |
| Phạm vi «phủ định phân nhóm anh em»; phạm vi cho phân nhóm xxxx.00 | 030749, 480100 |
| Soát lại cả phân nhóm | 210690, 321290 |

## Bảng toàn bộ PN6 DỪNG

| PN6 | Tên phân nhóm | Vướng | Cần |
|---|---|---|---|
| **CHỒNG LẤN CHƯA CÓ HÀNG THẬT** | | | |
| 140490 | Loại khác | «Loại dùng chủ yếu trong công nghệ thuộc da hoặc nhuộm» (14049020) ↔ «Bông gòn» (14049030) — vd: công dụng «công nghệ thuộc da», tên «Bông gòn» | Q1 |
| 271012 | Dầu nhẹ và các chế phẩm | «RON 97 ↔ cao hơn» (27101211) và «Naphtha, reformate (SEN) và các chế phẩm khác để pha chế xăng động cơ» (27101280) — vd: coPhaChi «có», công dụng «pha chế xăng động cơ», tên «Xăng động cơ», triSoOctan «97» | Q1 |
| 271019 | Loại khác | «Dầu thô đã tách phần nhẹ» (27101920) ↔ «Dầu bôi trơn khác» (27101946) — vd: công dụng «sản xuất dầu bôi trơn», dùng cho «động cơ máy bay», tên «Dầu thô đã tách phần nhẹ» | Q1 |
| 370500 | Tấm và phim để tạo ảnh, đã phơi sáng và đã tráng, trừ phim dùng trong  | «Dùng cho chụp X quang» (37050010) ↔ «Vi phim (microfilm)» (37050020) — vd: công dụng «chụp X quang», tên «Vi phim» | Q1 |
| 392690 | Loại khác | «Phao cho lưới đánh cá» (39269010) ↔ «Loại khác» (39269039) — vd: công dụng «vệ sinh», dùng cho «lưới đánh cá», tên «Phao (thứ khác | Q1 |
| 442191 | Từ tre | «Lõi cuộn chỉ, ống sợi ↔ suốt sợi, guồng cuốn chỉ may và các sản phẩm tương tự» (44219110) và «Quạt và màn che kéo bằng tay, khung và tay cầm, quai kèm theo, và các bộ phận củ» (44219140) — vd: cachDieuKhien «BANG_TAY», dùng cho «Quạt», là bộ phận «có», tên «Lõi cuộn chỉ» | Q1 |
| 442199 | Loại khác | «Lõi cuộn chỉ, ống sợi ↔ suốt sợi, guồng cuốn chỉ may và các sản phẩm tương tự» (44219910) và «Quạt và màn che kéo bằng tay, khung và tay cầm, quai kèm theo, và các bộ phận củ» (44219970) — vd: cachDieuKhien «BANG_TAY», dùng cho «Quạt», là bộ phận «có», tên «Lõi cuộn chỉ» | Q1 |
| 480254 | Có định lượng dưới 40 g/m2 | «Ở dạng cuộn có chiều rộng không quá 15cm hoặc ở dạng tờ hình chữ nhật (kể cả hìn» (48025411) ↔ «Giấy và bìa nhiều lớp(SEN)» (48025450) — vd: chieuRong «149.99985», công dụng «làm nền sản xuất giấy carbon», daGap «có», dangCuon «có», dangToChuNhat «có», dinhLuong «19.99998», motChieuTo «359.99964», nh | Q1 |
| 480255 | Có định lượng từ 40 g/m2 trở lên nhưng không quá 150g/m2, dạng cuộn | «Có chiều rộng không quá 15 cm (SEN)» (48025521) ↔ «Có chiều rộng không quá 15 cm» (48025561) — vd: chieuRong «149.99985», công dụng «viết», tên «Giấy và bìa trang trí» | Q1 |
| 480431 | Chưa tẩy trắng | «Giấy kraft cách điện (SEN)» (48043110) ↔ «Có độ bền ướt từ 40 g đến 60 g, dùng để sản xuất băng dán gỗ dán(SEN)» (48043130) — vd: công dụng «sản xuất băng dán gỗ dán», doBenUot «40», tên «Giấy kraft cách điện» | Q1 |
| 481190 | Giấy, bìa, tấm xenlulo và màng xơ sợi xenlulo khác | «Tấm phủ sàn» (48119041) ↔ «Giấy tạo vân(SEN)» (48119042) — vd: chieuRong «149.99985», dangCuon «có», kichThuoc «359.99964», tamPhuSan «có», tên «Giấy tạo vân» | Q1 |
| 481690 | Loại khác | «Giấy dùng để sao chụp khác» (48169020) ↔ «Tấm in offset» (48169030) — vd: dùng cho «sao chụp», tên «Tấm in offset» | Q1 |
| 482390 | Loại khác | «Khung kén tằm» (48239010) ↔ «Bìa tráng polyetylen đã cắt dập thành hình để sản xuất cốc giấy» (48239030) — vd: dùng cho «sản xuất cốc giấy», tên «Khung kén tằm» | Q1 |
| 640319 | Loại khác | «Giày, dép có gắn đinh, gắn miếng đế chân hoặc các loại tương tự» (64031910) ↔ «Giày, dép dùng trong đấu vật, cử tạ hoặc thể dục thể hình» (64031930) — vd: dùng cho «đấu vật», tên «gắn đinh» | Q1 |
| 640391 | Loại cổ cao quá mắt cá chân | «Giày, dép có đế bằng gỗ, không có lót đế bên trong hoặc mũi gắn kim loại bảo vệ» (64039110) ↔ «Ủng để cưỡi ngựa» (64039120) — vd: vật liệu «gỗ», tên «Ủng để cưỡi ngựa» | Q1 |
| 640399 | Loại khác | «Giày, dép có đế bằng gỗ, không có lót đế bên trong hoặc mũi gắn kim loại bảo vệ» (64039910) ↔ «Giày chơi bowling» (64039920) — vd: vật liệu «gỗ», tên «Giày chơi bowling» | Q1 |
| 640411 | Giày, dép thể thao, giày tennis, giày bóng rổ, giày thể dục, giày luyệ | «Giày, dép có gắn đinh, gắn miếng đế chân hoặc các loại tương tự» (64041110) ↔ «Giày, dép dùng trong đấu vật, cử tạ hoặc thể dục thể hình» (64041120) — vd: dùng cho «đấu vật», tên «gắn đinh» | Q1 |
| 650610 | Mũ bảo hộ và các vật đội đầu an toàn khác | «Mũ bảo hộ công nghiệp ↔ mũ bảo hiểm cho lính cứu hỏa, trừ mũ bảo hộ bằng thép» (65061020) và «Mũ dùng trong chơi water-polo» (65061040) — vd: dùng cho «chơi water-polo», tên «Mũ bảo hộ công nghiệp» | Q1 |
| 721114 | Loại khác, chiều dày từ 4,75 mm trở lên | «Dạng lượn sóng» (72111414) ↔ «Dạng cuộn để cán lại (SEN)» (72111415) | Q1 |
| 721391 | Có đường kính mặt cắt ngang hình tròn dưới 14 mm | «Loại dùng để sản xuất que hàn (SEN)» (72139110) ↔ «Thép cốt bê tông» (72139120) — vd: công dụng «sản xuất que hàn», tên «Thép cốt bê tông» | Q1 |
| 721399 | Loại khác | «Loại dùng để sản xuất que hàn (SEN)» (72139910) ↔ «Thép cốt bê tông» (72139920) — vd: công dụng «sản xuất que hàn», tên «Thép cốt bê tông» | Q1 |
| 730630 | Loại khác, được hàn, có mặt cắt ngang hình tròn, bằng sắt hoặc thép kh | «Với đường kính ngoài dưới 12,5 mm» (73063011) ↔ «Với đường kính ngoài dưới 12,5 mm» (73063021) — vd: dùng cho «nồi hơi», đường kính «12.4999875», lopMaPhu «MA_DONG» | Q1 |
| 730640 | Loại khác, được hàn, có mặt cắt ngang hình tròn, bằng thép không gỉ | «Với đường kính ngoài không quá 12,5 mm» (73064011) ↔ «Ống và ống dẫn có chứa hàm lượng niken ít nhất là 30% tính theo khối lượng, với » (73064030) — vd: dùng cho «nồi hơi», đường kính «9.99999», hamLuongNiken «30» | Q1 |
| 741810 | Bộ đồ ăn, đồ nhà bếp hoặc các đồ gia dụng khác và các bộ phận của chún | «Miếng cọ nồi ↔ cọ rửa hoặc đánh bóng, găng tay và các loại tương tự» (74181010) và «Thiết bị nấu hoặc đun nóng dùng trong gia đình, không dùng điện và các bộ phận c» (74181030) — vd: dùng cho «Thiết bị nấu», hoatDongBangDien «không», là bộ phận «có», phamViSuDung «GIA_DINH», tên «Miếng cọ nồi» | Q1 |
| 741920 | Đã được đúc, đúc khuôn, rập hoặc rèn nhưng chưa được gia công thêm | «Xích ↔ các bộ phận của xích» (74192010) và «Thùng, két, bể chứa và các loại đồ chứa đựng tương tự không gắn các thiết bị cơ » (74192020) — vd: dùng cho «Xích», ganThietBiCoKhiHoacGiaNhiet «không», là bộ phận «có», tên «Thùng» | Q1 |
| 741980 | Loại khác | «Xích ↔ các bộ phận của xích» (74198010) và «Thùng, két, bể chứa và các loại đồ chứa đựng tương tự có dung tích từ 300 lít tr» (74198080) — vd: dùng cho «Xích», dungTich «299.9997», là bộ phận «có», tên «Thùng» | Q1 |
| 760421 | Dạng hình rỗng | «Loại phù hợp để làm dàn lạnh của máy điều hòa không khí cho xe có động cơ (SEN)» (76042110) ↔ «Thanh đệm bằng nhôm cho cửa ra vào và cửa sổ (SEN)» (76042120) — vd: vật liệu «nhôm», công dụng «làm dàn lạnh của máy điều hòa không khí», dùng cho «cửa ra vào», dungChoXeCoDongCo «có», tên «Thanh đệm» | Q1 |
| 844331 | Máy kết hợp hai hoặc nhiều chức năng in, copy hoặc fax, có khả năng kế | «Loại màu» (84433111) ↔ «Loại màu» (84433131) — vd: congNgheIn «IN_PHUN», mauHienThi «MAU», tên «Máy in-copy-scan-fax kết hợp» | Q1 |
| 848180 | Thiết bị khác | Tầng 8481805 «có khoang pha trộn» (khoá đặc điểm) chồng với nhiều nhánh tên van: van dùng cho săm, van lốp không săm, van xi lanh LPG, van bếp ga, van chai có ga, núm uống nước cho lợn… Không có van săm nào «có khoang pha trộn», nhưng chưa có hàng thật để làm ví dụ cho từng cặp nên theo luật vòng 8 chưa khai được. | Q1 |
| 848610 | Máy và thiết bị để sản xuất khối hoặc tấm bán dẫn mỏng | «Thiết bị làm nóng nhanh tấm bán dẫn mỏng» (84861010) ↔ «Máy và thiết bị để cắt khối bán dẫn đơn tinh thể thành các lớp, hoặc cưa miếng m» (84861040) — vd: công dụng «cắt khối bán dẫn đơn tinh thể thành các lớp», tên «Thiết bị làm nóng nhanh tấm bán dẫn mỏng» | Q1 |
| 850440 | Máy biến đổi tĩnh điện | «Bộ nguồn cấp điện liên tục (UPS) (SEN)» (85044011) ↔ «Máy nạp ắc qui, pin có công suất danh định trên 100 kVA» (85044020) — vd: congSuatBieuKien «100.0001», dùng cho «máy xử lý dữ liệu tự động», loaiBienDoiTinhDien «UPS», tên «Máy nạp ắc qui» | Q1 |
| 851981 | Thiết bị truyền thông sử dụng công nghệ từ tính, quang học hoặc bán dẫ | «Loại dùng cho điện ảnh hoặc phát thanh» (85198161) ↔ «Máy trả lời điện thoại» (85198162) — vd: dùng cho «điện ảnh», tên «Máy trả lời điện thoại Máy ghi băng từ có gắn với thiết bị tái tạo âm thanh, loại âm thanh số» | Q1 |
| 852329 | Loại khác | «Băng máy tính» (85232941) ↔ «Loại dùng cho điện ảnh» (85232942) — vd: chieuRong «4.000004», daGhi «có», dùng cho «điện ảnh», tên «Băng máy tính Băng từ» | Q1 |
| 853690 | Thiết bị khác | (chưa đọc được cặp lỗi — kiểm lại bằng --kiem). | Q1 |
| 854370 | Máy và thiết bị khác | «Máy cung cấp năng lượng cho hàng rào điện» (85437010) ↔ «Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển» (85437030) — vd: công dụng «phiên dịch», dùng cho «hàng rào điện», tên «Máy cung cấp năng lượng» | Q1 |
| 870850 | Cầu chủ động có vi sai, có hoặc không kèm theo chi tiết truyền lực khá | «Dùng cho xe thuộc nhóm 87.03» (87085011) ↔ «Loại khác» (87085095) — vd: đã lắp ráp «không», dùng cho «87.03», là bộ phận «có», tên «(thứ khác | Q1 |
| 870899 | Loại khác | «Giá đỡ hoặc khay đỡ bình ắc quy ↔ khung của nó» (87089940) và «Dùng cho xe thuộc nhóm 87.02» (87089961) — vd: dùng cho «bình ắc quy 87.02», là bộ phận «có», tên «Khung xe» | Q1 |
| 984943 | Pin và bộ pin | «Bằng liti» (98494310) ↔ «Có thể tích ngoài không quá 300 cm3» (98494321) — vd: loaiPin «LITI», theTich «299.9997» | Q1 |
| **Ô TÔ ↔ XE BA BÁNH** | | | |
| 870421 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870431 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870441 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870451 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870460 | Loại khác, chỉ sử dụng động cơ điện để tạo động lực | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| **CHƯƠNG 98 THIẾU NGUỒN** | | | |
| 981000 |  | Khe ở «9810»; vd: vật liệu «plastic», công dụng «sản xuất tanh lốp xe», dangCuon «có», đường kính «13.999986», phuongPhapCheTao «DUC», tên «thanh» | Q3 |
| 981100 |  | Khe ở «Thép hợp kim có chứa nguyên tố Bo và/hoặc Crôm và/hoặc Titan trừ chủng loại thép»; vd: 9811001 «98110010» | Q3 |
| 981820 | Bơm chất lỏng, không lắp dụng cụ đo lường | Khe ở «Bơm nước bằng tay»; vd: 9818201 «98182010» | Q3 |
| 981822 | Máy điều hoà không khí, sử dụng cho xe chạy trên đường ray | Khe ở «Máy điều hoà không khí, sử dụng cho xe chạy trên đường ray»; vd: coBoPhanLamLanh «có», coVanDaoChieu «không», công suất «26379.97362», dùng cho «xe chạy trên đường ray», là bộ phận «không» | Q3 |
| 983412 | Các sản phẩm khác bằng sắt hoặc thép | Khe ở «Các sản phẩm khác bằng sắt hoặc thép»; vd: vật liệu «sắt thép», công dụng «sản xuất các sản phẩm CNTT trọng điểm», đường kính «1.3999986», tên «Ốc vít» | Q3 |
| 983610 | Của xe tự đổ được thiết kế để sử dụng trên các loại đường không phải đ | Khe ở «Của xe tự đổ được thiết kế để sử dụng trên các loại đường không phải đường quốc »; vd: khối lượng toàn bộ «19999.98» | Q3 |
| 984912 | Lốp loại bơm hơi bằng cao su, chưa qua sử dụng | Khe ở «Loại khác»; vd: dùng cho «(thứ khác)» | Q3 |
| 984914 | Săm các loại, bằng cao su | Khe ở «Phù hợp lắp cho loại lốp có chiều rộng không quá 450 mm»; vd: r1948 «r19480» | Q3 |
| 984915 | Các sản phẩm khác bằng cao su lưu hóa trừ cao su cứng | Khe ở «Dùng cho xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.05, trừ viền cao su quanh kín»; vd: r1948 «r19487» | Q3 |
| 984916 | Kính an toàn, bao gồm kính tôi hoặc kính dán nhiều lớp (laminated glas | Khe ở «Kính an toàn cứng (đã tôi)»; vd: dùng cho «(thứ khác)», tên «Kính an toàn cứng» | Q3 |
| 984918 | Lò xo và lá lò xo, bằng sắt hoặc thép | Khe ở «Lò xo lá và các lá lò xo»; vd: dùng cho «(thứ khác)», tên «Lò xo lá» | Q3 |
| 984922 | Các bộ phận chỉ dùng hoặc chủ yếu dùng cho các loại động cơ thuộc nhóm | Khe ở «Chế hòa khí và bộ phận của chúng»; vd: r1954 «r19544» | Q3 |
| 984923 | Bơm chất lỏng, có hoặc không lắp thiết bị đo; máy đẩy chất lỏng | Khe ở «Bơm chất lỏng, có hoặc không lắp thiết bị đo; máy đẩy chất lỏng»; vd: dùng cho «động cơ của xe có động cơ thuộc nhóm 87.02, 87.03 hoặc 87.04», tên «Bơm nhiên liệu» | Q3 |
| 984925 | Máy điều hòa không khí, gồm có một quạt chạy bằng mô tơ và các bộ phận | Khe ở «Loại sử dụng cho người, trong xe có động cơ»; vd: dungCh «dungCho» | Q3 |
| 984926 | Máy ly tâm, kể cả máy làm khô bằng ly tâm; máy và thiết bị lọc hay tin | Khe ở «Bộ lọc dầu»; vd: r1959 «r19595» | Q3 |
| 984928 | Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên; gối đỡ tr | Khe ở «Thân ổ, không lắp ổ bi hay ổ đũa; gối đỡ trục dùng ổ trượt»; vd: tenLoa «tenLoai» | Q3 |
| 984929 | Thiết bị đánh lửa hoặc khởi động bằng điện loại dùng cho động cơ đốt t | Khe ở «Loại chưa được lắp ráp»; vd: r1963 «r19634» | Q3 |
| 984930 | Thiết bị chiếu sáng hoặc thiết bị tín hiệu hoạt động bằng điện (trừ lo | Khe ở «Thiết bị chiếu sáng hoặc tạo tín hiệu trực quan khác»; vd: đã lắp ráp «có», tên «Thiết bị chiếu sáng» | Q3 |
| 984931 | Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu | Khe ở «Cầu chì nhiệt; cầu chì thủy tinh»; vd: dùng cho «(thứ khác)», tên «Cầu chì nhiệt» | Q3 |
| 984932 | Bóng đèn dây tóc hoặc bóng đèn phóng điện, kể cả đèn pha gắn kín và bó | Khe ở «Bóng đèn dây tóc hoặc bóng đèn phóng điện, kể cả đèn pha gắn kín và bóng đèn tia»; vd: là bộ phận «không», tên «Bóng đèn ha-lo-gien vonfram» | Q3 |
| 984933 | Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã t | Khe ở «Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã tráng men c»; vd: điện áp «999.999», dùng cho «xe thuộc nhóm 87.02, 87.03, 87.04», tên «Bộ dây điện» | Q3 |
| 984934 | Bộ phận và phụ kiện của xe có động cơ thuộc các nhóm từ 87.01 đến 87.0 | Khe ở «Bộ phận và phụ kiện của xe có động cơ thuộc các nhóm từ 87.01 đến 87.05»; vd: dùng cho «xe thuộc nhóm 87.03», là bộ phận «có», tên «Dây đai an toàn» | Q3 |
| 984935 |  | Khe ở «Loại khác»; vd: 984935~r1983 «984935~r19831» | Q3 |
| 984937 | Dụng cụ và máy đo hoặc kiểm tra lưu lượng, mức, áp suất hoặc biến số k | Khe ở «Để đo hoặc kiểm tra lưu lượng hoặc mức của chất lỏng»; vd: công dụng «lưu lượng», dungChoXeCoDongCo «có», hoatDongBangDien «có», tên «(thứ khác)» | Q3 |
| 984940 | Ghế ngồi (trừ các loại thuộc nhóm 94.02), có hoặc không chuyển được th | Khe ở «Ghế ngồi (trừ các loại thuộc nhóm 94.02), có hoặc không chuyển được thành giường»; vd: dungChoXeCoDongCo «có», là bộ phận «không», tên «Miếng lót» | Q3 |
| 984942 | Động cơ điện thuộc nhóm 85.01, trừ loại dùng cho các mặt hàng thuộc nh | Khe ở «Động cơ điện thuộc nhóm 85.01, trừ loại dùng cho các mặt hàng thuộc nhóm 84.15, »; vd: công suất «999.999», daPha «có», loaiDongDien «XOAY_CHIEU», tên «Động cơ vạn năng một chiều/xoay chiều» | Q3 |
| **THIẾU KHOÁ TỪ VỰNG** | | | |
| 151190 | Loại khác | Tầng «Các phần phân đoạn của dầu tinh chế» chia con (tầng không mã) theo THỂ RẮN / THỂ LỎNG; từ vựng chưa có khoá trạng thái rắn–lỏng. | khoá mới «thể rắn / thể lỏng» (dùng chung với 151329). |
| 151329 | Loại khác | Tầng «Các phần phân đoạn của dầu… chưa tinh chế» chia con theo THỂ RẮN / THỂ LỎNG; từ vựng chưa có khoá trạng thái rắn–lỏng nên hàng chỉ ghi «phần phân đoạn» không vào con nào. | khoá mới «thể rắn / thể lỏng». |
| 151620 | Chất béo và dầu thực vật và các phần phân đoạn của chúng | Dòng «Stearin cọ, có chỉ số iốt không quá 48»: khoá chiSoIot đòi đơn vị «IV» nhưng chữ biểu ghi số trần, nên không ghi được điều kiện số. | cho khoá chiSoIot nhận số không đơn vị (chỉ số iốt là số thuần). |
| 151800 | Chất béo và dầu động vật hoặc thực vật và các phần phân đoạn của chúng | Biểu chia 15.18 theo hai tiêu chí: tầng 1518001 là mỡ/dầu ĐÃ BIẾN ĐỔI HOÁ HỌC (đun sôi, oxy hoá, khử nước, sulphat hoá, thổi khô, polyme hoá…), còn .20, tầng 1518003, .60 là HỖN HỢP/CHẾ PHẨM KHÔNG ĂN ĐƯỢC. Spec chỉ ghi tên loại dầu nên hai bên chồng nhau. | khoá mới «đã biến đổi hoá học» (đọc các chữ đun sôi, oxy hoá, khử nước…); vế «không ăn được» dùng khoá có sẵn thichHopDungChoNguoi KHONG. |
| 391690 | Từ plastic khác | Biểu chia theo VẬT LIỆU (polypropylen, polystyren, nhựa phenolic…) rồi tầng «Loại khác» chia theo HÌNH DẠNG (monofilament; thanh, que, dạng hình), nhưng spec ghi cả hai trục bằng tenLoai ⇒ hàng «polypropylen» (không nêu hình dạng) bị coi là hở. | khoá vật liệu polyme riêng để tách hai trục. |
| **GIÁ TRỊ CHUNG** | | | |
| 610520 | Từ sợi nhân tạo | «Từ sợi nhân tạo» bao gồm «sợi tổng hợp» (.10) và «sợi tái tạo» (.20). Tờ khai ghi chung «sợi nhân tạo» bị coi là TRÁI cả hai dòng, đúng ra phải hỏi lại. | từ vựng khai giá trị chung ⊃ giá trị riêng (NHAN_TAO ⊃ SOI_TONG_HOP, SOI_TAI_TAO) để bộ so trả «chưa biết». Phạm vi phân nhóm đã khai (07/11). |
| **TỪ VỰNG ĐỌC SAI NGHĨA** | | | |
| 853650 | Thiết bị đóng ngắt mạch khác | Cổng đã xanh nhưng sai NGHĨA: khoá loaiCongTac đọc «micro switch» (công tắc hành trình, thuộc 8536.50.5x theo 4012/TB-TCHQ) thành «công tắc micro» của tầng 8536503. Khoá thuộc từ vựng @1 đang khoá cứng nên không sửa cách đọc được. | cơ chế đính chính khoá @1 có kiểm soát (Claude làm). |
| **BỘ PHẬN CỦA NÓ** | | | |
| 870891 | Két nước làm mát và bộ phận của chúng | Tầng 8708919 «Bộ phận» nằm dưới phân nhóm «Két nước làm mát và bộ phận của chúng», tức bộ phận CỦA KÉT NƯỚC, nhưng spec ghi «là bộ phận» (của xe) ⇒ két nước thoả cả tầng 8708911 lẫn 8708919. | như 870895 (Claude làm). |
| 870895 | Túi khí an toàn lắp với hệ thống bơm phồng; bộ phận của nó | Dòng .90 «Bộ phận» nằm dưới phân nhóm «Túi khí…; bộ phận của nó», tức bộ phận CỦA TÚI KHÍ, nhưng chữ của chính dòng chỉ có «Bộ phận» nên spec chỉ ghi «là bộ phận». Túi khí (cũng là bộ phận của xe) thoả cả .10 lẫn .90. Ngoài ra tên .10 quá dài, bộ đọc cắt ở chữ «lắp». | cho mục «Bộ phận» trơn trích tên tầng tổ tiên + luật «hàng không là bộ phận của chính nó» (Claude làm). |
| **GIỚI HẠN BỘ MÁY** | | | |
| 681140 | Chứa amiăng | Tầng 6811402 có vế mở «và các loại tương tự» (TUONG_TU) nên với vector tên «Gạch lát nền» cho kết quả CHƯA BIẾT ⇒ dòng .21 không tới được. | cổng 2 tính «tương tự = có» khi dựng vector tới dòng con (Claude làm). |
| 842199 | Loại khác | Hai dòng .91/.94 dưới tầng «Loại khác» ghi mã nguyên văn; phủ định anh em ghi bằng tên chữ cho kết quả chưa biết nên cổng 2 không dựng được vector tới hai dòng. | như 842490. |
| 842490 | Bộ phận | Tầng «Của súng phun và các thiết bị tương tự» ghi bằng CHỮ, dòng con ghi bằng MÃ (8424.20.11, 8424.20.21); máy chưa đổi tên↔mã ở phía điều kiện nên hàng ghi mã không tới được tầng. | bộ so giải tên→mã cho điều kiện (Claude làm, có đo vì đổi so lúc chạy). |
| 847790 | Bộ phận | Dòng .32 «Bộ phận của máy ép lớp mỏng dùng để sản xuất tấm mạch in» nằm dưới tầng «Của máy gia công plastic…»: đích lồng hai tầng trên cùng khoá dungCho. | như 852910. |
| 848620 | Máy và thiết bị để sản xuất linh kiện bán dẫn hoặc mạch điện tử tích h | Dòng .13 gồm hai hàng nối «;» (ghi HOẶC), nằm dưới tầng cũng ghi tên «Thiết bị tạo lớp màng mỏng»; cổng 2 chưa ghép tên tầng với tên trong từng phương án HOẶC nên dòng không tới được. | sửa cổng 2 (Claude làm). |
| 848690 | Bộ phận và phụ kiện | Các dòng «Bộ phận kẹp dụng cụ…, dùng cho máy công cụ» lặp dưới các tầng về MÁY cụ thể (máy phun, máy cắt laser…); không vector nào vừa thoả tầng vừa thoả dòng. | Claude soát lại cách ghi tầng và dòng. |
| 850790 | Bộ phận | Dòng .93 «Loại khác, của hàng hóa thuộc phân nhóm 8507.10.92, …» ghi MÃ, cạnh .91 «Dùng cho máy bay» ghi CHỮ; bộ so coi mã ↔ chữ là chưa biết nên .93 không tới được. | như 842490. |
| 852910 | Ăng-ten và bộ phản xạ của ăng ten; các bộ phận sử dụng kèm | Tầng «Chảo phản xạ… và các bộ phận của chúng» và dòng con «Dùng cho máy thu truyền hình» là hai đích LỒNG nhau trên cùng khoá dungCho (bộ phận của chảo, chảo dùng cho máy thu); bộ sinh vector chỉ mang một đích nên dòng không tới được. Lúc chạy đọc được chuỗi lồng nên không sai. | bộ sinh vector hỗ trợ đích lồng (Claude làm). |
| 870600 | 8706 - Khung gầm đã lắp động cơ, dùng cho xe có động cơ thuộc các nhóm | Vector «dùng cho ô tô» là tên ĐA NGHĨA (ô tô thuộc 87.02, 87.03 hay 87.04): lúc chạy hệ thống hỏi, nhưng cổng 1 lại coi là lỗ hổng. | quy ước cổng 1 cho tên đa nghĩa (Claude làm). |
| 870829 | Loại khác | Tầng «Các bộ phận của cửa xe» (đích «cửa xe») và các dòng con ghi đích mã xe (87.01, 87.03…) là hai đích LỒNG; dòng .19 «Loại khác» không tới được. | như 852910. |
| 871690 | Bộ phận | Tầng «Dùng cho xe rơ-moóc và sơ mi rơ-moóc» ghi bằng CHỮ, dòng .13 ghi MÃ 8716.20; máy chưa đổi tên↔mã ở phía điều kiện. | như 842490. |
| **PHẠM VI CHƯA BIỂU DIỄN ĐƯỢC** | | | |
| 030749 | Loại khác | Phân nhóm tên «Loại khác» (mực khô, muối, hun khói): phạm vi là PHỦ ĐỊNH các phân nhóm anh em 0307.42/0307.43, bộ máy chưa biểu diễn được ⇒ mực đông lạnh bị coi là hở. Ngoài ra hai tầng «Khô, muối hoặc ngâm nước muối» / «Hun khói» đang ghi tenLoai, phải đổi sang phuongPhapBaoQuan như 030742. | phạm vi «phủ định phân nhóm anh em» (Claude làm). |
| 480100 | Giấy in báo, dạng cuộn hoặc tờ. | Phạm vi «giấy in báo» nằm ở Chú giải 4 Chương 48 (cuộn rộng > 28 cm; tờ > 28 × 15 cm chưa gấp), nhưng phân nhóm 4801.00 có nút cây là cấp nhóm nên chưa khai được phạm vi; thêm cặp «dạng cuộn» ↔ «dạng tờ» bị coi là chồng (hai đặc điểm loại trừ nhau). | phạm vi cho phân nhóm xxxx.00 (Claude làm) + Q1. |
| **CẦN SOÁT LẠI** | | | |
| 210690 | Loại khác | Còn ba vướng độc lập: (1) tên tầng/dòng là tiền tố của tên dòng con («Đậu phụ» ⊂ «Đậu phụ tươi»; «Thực phẩm bảo vệ sức khỏe» ⊂ «… từ sâm») ⇒ dòng «Loại khác» .19/.72 không tới được; (2) hai tầng không mã r2701/r2704 không có con «Loại khác»; (3) .91 «hỗn hợp hoá chất với thực phẩm… để chế biến thực phẩm» chồng trục với các dòng  | Claude soát lại cả phân nhóm. |
| 321290 | Loại khác | Hai tầng gốc đều là vế GIỚI HẠN (môi trường phân tán / dạng lỏng hoặc nhão) nên chồng nhau, và dòng .19 không tới được. | Claude soát lại cách ghi hai tầng theo chữ biểu. |

## Đã gỡ trong #1109

| PR | PN6 hết DỪNG | Cách |
|---|---|---|
| #1137 | 9 PN6 (870323, 870332, 870333, 870422, 870442, 640620, 854460, 940421, 961511) | Phạm vi phân nhóm `dieuKienNut[<pn6>]` theo tên phân nhóm |
| #1141 | 851140, 851150, 030742, 030633, 030639, 080450 | Cổng 1: «Loại khác» trần loại anh em; tách dải mã; phạm vi từ tầng tổ tiên |
| #1144 | 840732, 850132, 850162, 850212 | Phạm vi theo ngưỡng ghi ở tên phân nhóm |
| #1145 | 850432, 842489, 900659 | «Loại khác, <vế>» chỉ loại anh em đứng trước (thứ tự dòng) |
| #1146 | 300420, 300490, 854449, 851779, 300449 | Hết chờ bảng tiền lệ; sửa khoá sai trục; vế «trừ»; đọc «hoặc tiêm» |
| (đợt này) | 902129, 170290, 320890, 670290, 830629, 841590, 020760, 901310, 300410, 870892, 220300 | Sửa spec sót tên/vế; trục vật liệu qua HOẶC; vế «trừ loại thuộc …»; «Loại khác, kể cả …» là phần còn lại trần |

Bài học: nhiều ghi chú cũ ghi «chồng lấn giả» hoặc «không sửa được», nhưng thật ra spec sót tên hoặc sót vế (170290 «trừ
mantoza», 320890 thiếu tên «Sơn», 670290 vật liệu ghi thành tên hàng). Trước khi kết luận DỪNG, soát xem chữ biểu đã tự
phân xử chưa.
