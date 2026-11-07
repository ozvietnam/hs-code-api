# Phân nhóm 6 số (PN6) đang DỪNG — vướng gì, cần gì

Cập nhật 07/11/2026 (Claude, #1109). Thay toàn bộ bản cũ. Mỗi PN6 DỪNG có **đúng một** ghi chú `DUNG` trong
`docs/giao-viec/so-tay/spec/<pn6>.json`, cùng khuôn: **[LOẠI] vướng gì — CẦN: gỡ bằng gì — (LÚC CHẠY: hệ thống làm gì trong lúc chờ)**.
PN6 DỪNG không được dùng lúc chạy; lúc chạy chỉ dùng bản đã duyệt.

## Số liệu

| | Số PN6 |
|---|---|
| DỪNG hiện tại | **26** |
| Chờ oz-wiki: Q2 (văn bản ô tô) | 5 |
| Chương 98 — Claude đang soát bản nháp | 0 |
| Q1 còn lại — Claude xác minh / sửa bộ máy | 3 |
| Claude làm tiếp (công cụ / soát lại) | 18 |

## Việc cần anh quyết

### Q1 — Chồng lấn chưa có hàng thật — ANH ĐÃ ĐỒNG Ý 07/11, ĐÃ LÀM

Cơ chế: trong cụm `chongLanTruc`, cặp nhánh không có hàng thật thoả cả hai được khai `{cap, khongCoHangThat: "<lý do>"}`
thay hàng ví dụ; cặp dòng cùng trục khai `chongLanVanBan` có lý do «Không có hàng thật thoả cả hai (Q1)…». **Chỉ Claude khai**,
lý do viết riêng từng cặp sau khi xét. Mỗi cặp hiện cảnh báo `cong2-chong-lan-truc-khong-co-hang-that` để người soát thấy.
Lúc chạy không đổi: hàng thoả cả hai thì hệ thống hỏi câu phân biệt. Ca có hàng thật (850440: máy nạp nguồn viễn thông, bộ
nghịch lưu cho máy chủ) thì khai bằng hàng ví dụ thật, KHÔNG dùng Q1.

Kết quả: lô 1 (#1150) **25 PN6 hết DỪNG**; lô 2 (#1151) **5 PN6** (480254, 480255, 721114, 730630, 730640) — xác minh từng cặp
theo SEN: cặp có hàng thật khai kèm hàng (ống nồi hơi thép không gỉ Ø114,3 mm; giấy photo nhiều lớp; dải cán nóng dạng cuộn để cán lại),
cặp bị định nghĩa SEN loại trừ khai Q1. Lô 2 thêm hai luật bộ kiểm: nhánh chia theo **số đo** (đường kính, % niken) là trục
`DAC_DIEM`; hai nhánh cùng chỉ có khoá đặc điểm tất định (có/không, liệt kê, số) là **cùng trục** ⇒ khai `chongLanVanBan` từng cặp.
Lô 3 (#1152) gỡ thêm 870850 (spec sót vế «không phải bộ phận» ở tầng «Chưa/Đã lắp ráp hoàn chỉnh») và 870899 (giá đỡ bình ắc quy ↔
khung xe: Q1; sửa bộ kiểm ở dưới). Còn 3 PN6 nhóm này vướng bộ máy hoặc cần quyết định nghĩa (bảng dưới).

### Q2 — Ô tô ↔ xe ba bánh (5 PN6: 870421, 870431, 870441, 870451, 870460) — CHỜ oz-wiki

Các dòng «Ô tô tải đông lạnh», «Ô tô pick-up»… bị coi là chồng với «Xe ba bánh», vì máy không biết «ô tô» là xe từ bốn bánh
trở lên. Cần bản chính thức văn bản định nghĩa «xe ô tô» (Luật 36/2024/QH15 hoặc TCVN 6211) làm nguồn. Anh chốt 07/11: **chờ
oz-wiki trả lời** (kho oz-wiki-plhq), Claude làm tiếp #1101 khi có.

### Q3 — Chương 98 — ANH CHỐT «LÀM LUÔN» 07/11, XONG (0 PN6 còn lại)

Biểu Excel Tổng cục chỉ chép mục «3. Danh mục hàng hóa…» của Chương 98 (không có mục chú giải, điều kiện áp dụng); bốn nguồn
công khai của NĐ 26/2023/NĐ-CP đều chặn hoặc trả sai văn bản ⇒ chưa có nguyên văn chú giải để trích. Căn cứ dùng được nằm ngay
trong biểu Tổng cục: mỗi dòng 98 có **cột mã tương ứng ở 97 chương** (vd 9810.00.10 ↔ 7213.91.30, 7213.91.90) ⇒ Chương 98 là
lớp mã thay thế, không có phần còn lại; hàng không vào dòng 98 nào thì khai mã tương ứng ở 97 chương. Đã làm (lô 5, #1155):
tên 41 nhóm 98xx nạp vào cây từ chính dòng mã của biểu; cổng 1 hạ «không phủ kín» của Chương 98 thành cảnh báo
`cong1-chuong98-ngoai-dong`; 11 PN6 hết DỪNG. Lô 6 (#1158) soát 16 bản nháp còn lại: 14 hết DỪNG. Bộ máy thêm: tiêu đề «Loại khác:» trần / tiêu đề có tên ở gạch
ngoài cùng tập lá là tầng BỌC NGOÀI (hết mọi tầng KHONG_DAT của biểu); dòng lặp đúng mã phân nhóm ở gạch trong là tiêu đề (984943);
vế `laBoPhan KHONG` lấy căn cứ từ anh em tên «Bộ phận» (cảnh báo `cong3-khong-bo-phan-tu-anh-em`); dòng 98 CÙNG chữ phân bằng
khoá `maHsTuongUng` theo cột mã hàng tương ứng (nguồn `tuongUng.<mã 98>`). Lô 7 (#LO7) xong 984934, 984935: bộ tách vế đọc «có hoặc không …» là vế
tuỳ chọn và «…, và các cầu bị động» là tên đầu liên hợp; ghép giá trị nối tiếp ≥ 3 tầng cùng khoá; hiệu chỉnh số gạch biểu thụt sai
có căn cứ mã tương ứng (r19765–19767; dải r19818–19848); tiêu đề không mã đứng trước dòng lá đầu của phân nhóm 98 vào cây, tiêu đề
phủ trọn phân nhóm là tên phân nhóm. Chương 98 hết DỪNG.

## Việc Claude tự làm tiếp (công cụ)

| Việc | PN6 |
|---|---|
| Từ vựng khai «giá trị chung ⊃ giá trị riêng» (sợi nhân tạo ⊃ tổng hợp, tái tạo) — đổi cả cách so lúc chạy | 610520 |
| Cơ chế đính chính khoá @1 đọc sai nghĩa («micro switch») | 853650 |
| «Bộ phận» trơn = bộ phận của tầng trên; luật «hàng không là bộ phận của chính nó» | 870895, 870891 |
| Bộ máy: đích lồng, tên ↔ mã, tên đa nghĩa, HOẶC dưới tầng có tên, vế «tương tự» | 842490, 871690, 847790, 850790, 842199, 870600, 848620, 681140, 848690, 442199 |
| Phạm vi «phủ định phân nhóm anh em»; phạm vi cho phân nhóm xxxx.00 | 030749, 480100 |
| Soát lại cả phân nhóm | 210690, 321290 |

## Bảng toàn bộ PN6 DỪNG

| PN6 | Tên phân nhóm | Vướng | Cần |
|---|---|---|---|
| **CHỒNG LẤN CHƯA CÓ HÀNG THẬT** | | | |
| 271012 | Dầu nhẹ và các chế phẩm | Các dòng xăng thành phẩm (RON 97, RON 90–97, chưa pha chế, pha ethanol…), xăng máy bay, dung môi chồng với .80 «Naphtha, reformate và các chế phẩm khác để pha chế xăng động cơ» (tên ↔ công dụng — cần chongLanTruc, mỗi cặp lý do riêng); thêm dòng .23/.26/.29 không tới được (giới hạn bộ máy). | Q1 |
| 848180 | Thiết bị khác | Tầng 8481805 «có khoang pha trộn» (khoá đặc điểm) chồng với nhiều nhánh tên van: van dùng cho săm, van lốp không săm, van xi lanh LPG, van bếp ga, van chai có ga, núm uống nước cho lợn… Không có van săm nào «có khoang pha trộn», nhưng chưa có hàng thật để làm ví dụ cho từng cặp nên theo luật vòng 8 chưa khai được. | Q1 |
| 853690 | Thiết bị khác | Cổng xanh nhưng sai NGHĨA: hàng chính danh của .93 «Phiến đầu nối… cáp điện thoại» luôn thoả tầng 8536901 «Đầu nối… cho dây và cáp», mà .93 lại nằm dưới «Loại khác» 8536909 (loại trừ 8536901) ⇒ hiện chỉ tới được .93 bằng chữ «khối đấu nối». Chữ biểu tự xếp «phiến đầu nối cáp điện thoại» ra khỏi 8536901. | Q1 |
| **Ô TÔ ↔ XE BA BÁNH** | | | |
| 870421 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870431 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870441 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870451 | Khối lượng toàn bộ theo thiết kế (SEN) không quá 5 tấn | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| 870460 | Loại khác, chỉ sử dụng động cơ điện để tạo động lực | Dòng «Xe ba bánh» và các dòng «Ô tô …» (tải đông lạnh, pick-up, thu gom phế thải…) bị coi là chồng nhau vì máy chưa biết «ô tô» là xe từ bốn bánh trở lên. | Q2 |
| **GIÁ TRỊ CHUNG** | | | |
| 610520 | Từ sợi nhân tạo | «Từ sợi nhân tạo» bao gồm «sợi tổng hợp» (.10) và «sợi tái tạo» (.20). Tờ khai ghi chung «sợi nhân tạo» bị coi là TRÁI cả hai dòng, đúng ra phải hỏi lại. | từ vựng khai giá trị chung ⊃ giá trị riêng (NHAN_TAO ⊃ SOI_TONG_HOP, SOI_TAI_TAO) để bộ so trả «chưa biết». Phạm vi phân nhóm đã khai (07/11). |
| **TỪ VỰNG ĐỌC SAI NGHĨA** | | | |
| 853650 | Thiết bị đóng ngắt mạch khác | Cổng đã xanh nhưng sai NGHĨA: khoá loaiCongTac đọc «micro switch» (công tắc hành trình, thuộc 8536.50.5x theo 4012/TB-TCHQ) thành «công tắc micro» của tầng 8536503. Khoá thuộc từ vựng @1 đang khoá cứng nên không sửa cách đọc được. | cơ chế đính chính khoá @1 có kiểm soát (Claude làm). |
| **BỘ PHẬN CỦA NÓ** | | | |
| 870891 | Két nước làm mát và bộ phận của chúng | Tầng 8708919 «Bộ phận» nằm dưới phân nhóm «Két nước làm mát và bộ phận của chúng», tức bộ phận CỦA KÉT NƯỚC, nhưng spec ghi «là bộ phận» (của xe) ⇒ két nước thoả cả tầng 8708911 lẫn 8708919. | như 870895 (Claude làm). |
| 870895 | Túi khí an toàn lắp với hệ thống bơm phồng; bộ phận của nó | Dòng .90 «Bộ phận» nằm dưới phân nhóm «Túi khí…; bộ phận của nó», tức bộ phận CỦA TÚI KHÍ, nhưng chữ của chính dòng chỉ có «Bộ phận» nên spec chỉ ghi «là bộ phận». Túi khí (cũng là bộ phận của xe) thoả cả .10 lẫn .90. Ngoài ra tên .10 quá dài, bộ đọc cắt ở chữ «lắp». | cho mục «Bộ phận» trơn trích tên tầng tổ tiên + luật «hàng không là bộ phận của chính nó» (Claude làm). |
| **GIỚI HẠN BỘ MÁY** | | | |
| 442199 | Loại khác | Phần chồng lấn đã gỡ (Q1, 07/11). Còn dòng .94 «Chuỗi hạt khác» chỉ loại .93 «Chuỗi hạt cầu nguyện»: hàng ghi chung «chuỗi hạt» thì không biết có phải chuỗi hạt cầu nguyện không (kết quả «chưa biết», lúc chạy hệ thống hỏi), nhưng cổng 2 đòi chắc chắn mới coi là tới được. | cổng 2 coi «chưa biết» ở phủ định anh em là tới được (lúc chạy vẫn hỏi) — Claude làm. |
| 681140 | Chứa amiăng | Tầng 6811402 có vế mở «và các loại tương tự» (TUONG_TU) nên với vector tên «Gạch lát nền» cho kết quả CHƯA BIẾT ⇒ dòng .21 không tới được. | cổng 2 tính «tương tự = có» khi dựng vector tới dòng con (Claude làm). |
| 842199 | Loại khác | Hai dòng .91/.94 dưới tầng «Loại khác» ghi mã nguyên văn; phủ định anh em ghi bằng tên chữ cho kết quả chưa biết nên cổng 2 không dựng được vector tới hai dòng. | như 842490. |
| 842490 | Bộ phận | Tầng «Của súng phun và các thiết bị tương tự» ghi bằng CHỮ, dòng con ghi bằng MÃ (8424.20.11, 8424.20.21); máy chưa đổi tên↔mã ở phía điều kiện nên hàng ghi mã không tới được tầng. | bộ so giải tên→mã cho điều kiện (Claude làm, có đo vì đổi so lúc chạy). |
| 847790 | Bộ phận | Dòng .32 «Bộ phận của máy ép lớp mỏng dùng để sản xuất tấm mạch in» nằm dưới tầng «Của máy gia công plastic…»: đích lồng hai tầng trên cùng khoá dungCho. | như 852910. |
| 848620 | Máy và thiết bị để sản xuất linh kiện bán dẫn hoặc mạch điện tử tích h | Dòng .13 gồm hai hàng nối «;» (ghi HOẶC), nằm dưới tầng cũng ghi tên «Thiết bị tạo lớp màng mỏng»; cổng 2 chưa ghép tên tầng với tên trong từng phương án HOẶC nên dòng không tới được. | sửa cổng 2 (Claude làm). |
| 848690 | Bộ phận và phụ kiện | Các dòng «Bộ phận kẹp dụng cụ…, dùng cho máy công cụ» lặp dưới các tầng về MÁY cụ thể (máy phun, máy cắt laser…); không vector nào vừa thoả tầng vừa thoả dòng. | Claude soát lại cách ghi tầng và dòng. |
| 850790 | Bộ phận | Dòng .93 «Loại khác, của hàng hóa thuộc phân nhóm 8507.10.92, …» ghi MÃ, cạnh .91 «Dùng cho máy bay» ghi CHỮ; bộ so coi mã ↔ chữ là chưa biết nên .93 không tới được. | như 842490. |
| 870600 | 8706 - Khung gầm đã lắp động cơ, dùng cho xe có động cơ thuộc các nhóm | Vector «dùng cho ô tô» là tên ĐA NGHĨA (ô tô thuộc 87.02, 87.03 hay 87.04): lúc chạy hệ thống hỏi, nhưng cổng 1 lại coi là lỗ hổng. | quy ước cổng 1 cho tên đa nghĩa (Claude làm). |
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
| #1148 | 902129, 170290, 320890, 670290, 830629, 841590, 020760, 901310, 300410, 870892, 220300 | Sửa spec sót tên/vế; trục vật liệu qua HOẶC; vế «trừ loại thuộc …»; «Loại khác, kể cả …» là phần còn lại trần |
| #1150 (Q1) | 140490, 271019, 370500, 392690, 442191, 480431, 481190, 481690, 482390, 640319, 640391, 640399, 640411, 650610, 721391, 721399, 741810, 741920, 741980, 760421, 848610, 850440, 851981, 852329, 854370 | Khai chồng lấn không có hàng thật (Q1) hoặc chồng thật kèm hàng; sửa trục, sửa spec sót tên/vế (271019 .72, 741980 .80) |
| #1151 | 480254, 480255, 721114, 730630, 730640 | Xác minh theo SEN: chồng THẬT kèm hàng, hoặc Q1; trục số DAC_DIEM; cặp DAC_DIEM cùng trục khai chongLanVanBan |
| #1152 | 870850, 870899, 852910, 870829 | Spec sót vế «không phải bộ phận»; Q1 giá đỡ bình ắc quy; bộ kiểm ghép ứng viên trong HOẶC và «chữ đích + mã trơn» |
| #1153 | 151190, 151329, 151620, 151800, 391690 | Khoá từ vựng mới thePhanDoan, cachBienDoiDau, dangVayManh, nhomPolyme, dangSanPhamNhom1518; chiSoIot đọc số không đơn vị; phạm vi phân nhóm (151329, 391690) |
| #1155 | 844331; Chương 98: 981000, 983412, 983610, 984912, 984916, 984918, 984923, 984931, 984933, 984937, 984942 | 844331 theo tổ hợp chức năng (GĐ chốt: in-copy-scan không fax ⇒ .99; PC-Fax không tính fax); Chương 98 là lớp mã thay thế (cột mã tương ứng), tên nhóm 98xx từ biểu |
| #1158 | Chương 98: 981100, 981820, 981822, 984914, 984915, 984922, 984925, 984926, 984928, 984929, 984930, 984932, 984940, 984943 | Lớp tầng bọc ngoài + dòng lặp mã phân nhóm; laBoPhan KHONG theo anh em «Bộ phận»; maHsTuongUng (cột mã tương ứng); spec 981820 viết mới |
| #LO7 | Chương 98: 984934, 984935 | Vế tuỳ chọn «có hoặc không …» + tên đầu liên hợp; ghép nối tiếp ≥ 3 tầng; hiệu chỉnh gạch biểu có căn cứ mã tương ứng; tiêu đề trước dòng lá đầu |

Bài học: nhiều ghi chú cũ ghi «chồng lấn giả» hoặc «không sửa được», nhưng thật ra spec sót tên hoặc sót vế (170290 «trừ
mantoza», 320890 thiếu tên «Sơn», 670290 vật liệu ghi thành tên hàng). Trước khi kết luận DỪNG, soát xem chữ biểu đã tự
phân xử chưa.
