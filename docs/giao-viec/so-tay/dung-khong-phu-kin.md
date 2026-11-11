# Phân nhóm 6 số (PN6) đang DỪNG — vướng gì, cần gì

Cập nhật 11/11/2026 (Claude, #1109). Thay toàn bộ bản cũ. Mỗi PN6 DỪNG có **đúng một** ghi chú `DUNG` trong
`docs/giao-viec/so-tay/spec/<pn6>.json`, cùng khuôn: **[LOẠI] vướng gì — CẦN: gỡ bằng gì — (LÚC CHẠY: hệ thống làm gì trong lúc chờ)**.
PN6 DỪNG không được dùng lúc chạy; lúc chạy chỉ dùng bản đã duyệt.

## Số liệu

| | Số PN6 |
|---|---|
| DỪNG hiện tại | **1** |
| Chờ oz-wiki: Q2 (văn bản ô tô) | 0 |
| Chương 98 — Claude đang soát bản nháp | 0 |
| Q1 còn lại — Claude xác minh / sửa bộ máy | 0 |
| Claude làm tiếp (công cụ / soát lại) | 1 |

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
khung xe: Q1; sửa bộ kiểm ở dưới). Lô 9 (#1175) xong 3 PN6 cuối: 853690 (luật «tên cụ thể ở dòng dưới Loại khác thắng tầng chung» — «phiến
đầu nối cáp điện thoại» vào .93), 271012 (khoá `loaiPhaChe`; ví dụ .70↔.80 theo TB 1420/2022), 848180 (một cụm trục 9 nhánh, cặp không có hàng
thật khai Q1). **Nhóm Q1 hết DỪNG.**

### Q2 — Ô tô ↔ xe ba bánh — XONG (#1177, #1182)

oz-wiki trả lời 10/11: ô tô là xe từ bốn bánh trở lên, không đồng thời là xe ba bánh. #1177 khai `chongLanVanBan` cho 5 PN6
870421, 870431, 870441, 870451, 870460; #1182 gỡ ghi chú DUNG còn sót và **sửa căn cứ**: bản #1177 dẫn «Luật GTĐB 2008 Đ4» là sai (luật
23/2008/QH12 đã thay bởi 36/2024/QH15; Điều 4 không phải điều định nghĩa) ⇒ lý do nay đứng trên cấu trúc biểu (SEN tách dòng «Xe ba
bánh»), chưa trích điều luật cho tới khi có nguyên văn định nghĩa «xe ô tô» trong data (#1101).

### Q3 — Chương 98 — ANH CHỐT «LÀM LUÔN» 07/11, XONG (0 PN6 còn lại)

Biểu Excel Tổng cục chỉ chép mục «3. Danh mục hàng hóa…» của Chương 98 (không có mục chú giải, điều kiện áp dụng); bốn nguồn
công khai của NĐ 26/2023/NĐ-CP đều chặn hoặc trả sai văn bản ⇒ chưa có nguyên văn chú giải để trích. Căn cứ dùng được nằm ngay
trong biểu Tổng cục: mỗi dòng 98 có **cột mã tương ứng ở 97 chương** (vd 9810.00.10 ↔ 7213.91.30, 7213.91.90) ⇒ Chương 98 là
lớp mã thay thế, không có phần còn lại; hàng không vào dòng 98 nào thì khai mã tương ứng ở 97 chương. Đã làm (lô 5, #1155):
tên 41 nhóm 98xx nạp vào cây từ chính dòng mã của biểu; cổng 1 hạ «không phủ kín» của Chương 98 thành cảnh báo
`cong1-chuong98-ngoai-dong`; 11 PN6 hết DỪNG. Lô 6 (#1158) soát 16 bản nháp còn lại: 14 hết DỪNG. Bộ máy thêm: tiêu đề «Loại khác:» trần / tiêu đề có tên ở gạch
ngoài cùng tập lá là tầng BỌC NGOÀI (hết mọi tầng KHONG_DAT của biểu); dòng lặp đúng mã phân nhóm ở gạch trong là tiêu đề (984943);
vế `laBoPhan KHONG` lấy căn cứ từ anh em tên «Bộ phận» (cảnh báo `cong3-khong-bo-phan-tu-anh-em`); dòng 98 CÙNG chữ phân bằng
khoá `maHsTuongUng` theo cột mã hàng tương ứng (nguồn `tuongUng.<mã 98>`). Lô 7 (#1162) xong 984934, 984935: bộ tách vế đọc «có hoặc không …» là vế
tuỳ chọn và «…, và các cầu bị động» là tên đầu liên hợp; ghép giá trị nối tiếp ≥ 3 tầng cùng khoá; hiệu chỉnh số gạch biểu thụt sai
có căn cứ mã tương ứng (r19765–19767; dải r19818–19848); tiêu đề không mã đứng trước dòng lá đầu của phân nhóm 98 vào cây, tiêu đề
phủ trọn phân nhóm là tên phân nhóm. Chương 98 hết DỪNG.

## Việc Claude tự làm tiếp

| Việc | PN6 |
|---|---|
| Soát lại cả spec (31 dòng «bộ phận của máy X»: khoá dungCho/congDung trộn lẫn, cụm trục giữa các tầng máy) — lô riêng | 848690 |

## Bảng toàn bộ PN6 DỪNG

| PN6 | Tên phân nhóm | Vướng | Cần |
|---|---|---|---|
| **GIỚI HẠN BỘ MÁY** | | | |
| 848690 | Bộ phận và phụ kiện | Các dòng «Bộ phận kẹp dụng cụ…, dùng cho máy công cụ» lặp dưới các tầng về MÁY cụ thể (máy phun, máy cắt laser…); không vector nào vừa thoả tầng vừa thoả dòng. | Claude soát lại cách ghi tầng và dòng. |

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
| #1162 | Chương 98: 984934, 984935; sửa sót lô 6: 981820, 981100 | Vế tuỳ chọn «có hoặc không …» + tên đầu liên hợp; ghép nối tiếp ≥ 3 tầng; hiệu chỉnh gạch biểu có căn cứ mã tương ứng; tiêu đề trước dòng lá đầu; `maHsTuongUng` không tách đích lồng (981820 .31/.39); ghi chú THIEU_KHOA 981100 là phạm vi nhóm |
| #1175 | Chồng lấn (Q1): 271012, 848180, 853690 | Luật «tên cụ thể dưới Loại khác thắng tầng chung»; khoá loaiPhaChe (271012); cụm trục 9 nhánh + khongCoHangThat (848180); «van nối có núm» vào khongPhaiPhuDinh |
| #1176 | Bộ máy: 842490, 842199, 850790, 871690, 847790, 870600, 681140, 442199, 848620 | Giải chữ↔mã qua cây HS; đích lồng chỉ khi khác nhóm 4 số; cổng 1 «tên đa nghĩa»; cổng 2 trả lời «tương tự» khi kiểm tới được + ứng viên tên chung ẑẑẑ; Q1 871690/848620 |
| #1178 | Lô 11: 853650, 610520, 870895, 870891, 030749, 480100, 210690, 321290 | Từ vựng @2 `cumChanDoc` (che «micro switch») và `giaTriCha`; phạm vi «Loại khác» từ chú giải nhóm; phạm vi trên nút nhóm cho xxxx.00 (4801.00); `loBieu` — lỗ của chính biểu (210690 r2701/r2704); ứng viên «công dụng chung ẑẑẑ»; Q1 cho cặp cuộn↔tờ, (A)↔(C) 32.12, .91↔.92–.97 21.06 |
| #1182 | Ô tô (Q2): 870421, 870431, 870441, 870451, 870460 | Gỡ ghi chú DUNG sót sau #1177; sửa căn cứ trích sai «Luật GTĐB 2008 Đ4» trong 30 lý do khai |

Bài học: nhiều ghi chú cũ ghi «chồng lấn giả» hoặc «không sửa được», nhưng thật ra spec sót tên hoặc sót vế (170290 «trừ
mantoza», 320890 thiếu tên «Sơn», 670290 vật liệu ghi thành tên hàng). Trước khi kết luận DỪNG, soát xem chữ biểu đã tự
phân xử chưa.
