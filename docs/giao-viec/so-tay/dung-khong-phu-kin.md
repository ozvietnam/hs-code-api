# 46 PN6 DỪNG "không phủ kín" (cong1-khong-phu-kin) — phân tích lại (#1109)

Thay bản #1131 (đã gộp nhầm dù bị trả về: đề xuất làm tròn biên ε, thêm giá trị vào khoá @1 `chatLieu` và ví dụ hàng không có thật đều bị bác). Máy phân loại theo vector hở mà `--kiem` báo (`scripts` tạm: so vector với chính tên phân nhóm 6 số), Claude soát và sửa.

## Phát hiện chính

Phần lớn "khe hở" KHÔNG phải khe hở của biểu thuế: bộ sinh vector của cổng 1 tạo cả hàng **trái chính tên phân nhóm** (8703.23 "trên 1.500 cc" ↔ 1.499 cc; 6406.20 "bằng cao su hoặc plastic" ↔ giấy). Spec trước đây không khai được điều kiện cho nút phân nhóm. Nay có `dieuKienNut[<pn6>]` (nguồn `tieuDe.<pn6>` = tên nguyên văn phân nhóm): cổng 1 bỏ vector ngoài phạm vi; mục này KHÔNG vào sổ tay lúc chạy.

## Quy ước (Claude chốt 07/11/2026)

1. **E** — vector trái chính tên phân nhóm ⇒ khai `dieuKienNut[<pn6>]` với điều kiện đọc từ tên phân nhóm (`trich` = nguyên văn tên).
2. **A** — biên số ±ε nằm TRONG phạm vi mà không vào nhánh nào ⇒ spec ghi biên sai so với chữ (≤/<, hai nhánh không nối liền) ⇒ sửa spec. KHÔNG đề xuất làm tròn biên.
3. **B** — tên/công dụng ngoài mọi nhánh ở tầng không có "Loại khác" ⇒ khoảng trống thật của chữ biểu ⇒ giữ DỪNG, ghi chú nêu tầng và chữ các nhánh.
4. **C** — giá trị liệt kê chung không vào nhánh chi tiết ⇒ THIEU_KHOA_TU_VUNG (phân cấp giá trị khoá), không ép.

## E — Vector trái chính tên phân nhóm — ĐÃ SỬA bằng dieuKienNut[<pn6>] (9)

| PN6 | Tên phân nhóm | Vector hở (mẫu) |
|---|---|---|
| 640620 | Đế ngoài và gót giày, bằng cao su hoặc plastic | `chatLieu=CHINH:giấy` |
| 854460 | Các vật dẫn điện khác(*), dùng cho điện áp trên 1000 V | `dienAp=999.999` |
| 870323 | Dung tích xilanh trên 1.500 cc nhưng không quá 3.000 cc | `daLapRap=false,dungTichXiLanh=1499.9985,kieuXeChoNguoi=SEDAN` |
| 870332 | Dung tích xi lanh trên 1.500 cc nhưng không quá 2.500 cc | `daLapRap=false,dungTichXiLanh=1499.9985,kieuXeChoNguoi=SEDAN` |
| 870333 | Dung tích xi lanh trên 2.500 cc | `daLapRap=false,dungTichXiLanh=2499.9975,kieuXeChoNguoi=SEDAN` |
| 870422 | Khối lượng toàn bộ theo thiết kế (SEN) trên 5 tấn nhưng khôn | `khoiLuongToanBo=20000.02` |
| 870442 | Khối lượng toàn bộ theo thiết kế (SEN) trên 5 tấn nhưng khôn | `khoiLuongToanBo=20000.02` |
| 940421 | Bằng cao su xốp hoặc bằng plastic xốp, đã hoặc chưa bọc | `chatLieu=CHINH:giấy` |
| 961511 | Bằng cao su cứng hoặc plastic | `chatLieu=CHINH:giấy` |

## A — Biên số ±ε trong phạm vi mà không vào nhánh nào — spec ghi biên sai, sửa op/biên (10)

| PN6 | Tên phân nhóm | Vector hở (mẫu) |
|---|---|---|
| 480100 | Giấy in báo, dạng cuộn hoặc tờ. | `chieuKiaTo=149.99985,chieuRong=279.99972,daGap=true,dangCuon=false,dangToChuNhat=true,dinh` |
| 842490 | Bộ phận | `dungCho=8424.20.11` |
| 851140 | Động cơ khởi động và máy tổ hợp hai tính năng khởi động và p | `daLapRap=true,dungCho=87.01` |
| 851150 | Máy phát điện khác | `daLapRap=true,dungCho=87.01` |
| 870460 | Loại khác, chỉ sử dụng động cơ điện để tạo động lực | `khoiLuongToanBo=4999.995` |
| 871690 | Bộ phận | `dungCho=8716.20` |
| 981822 | Máy điều hoà không khí, sử dụng cho xe chạy trên đường ray | `coBoPhanLamLanh=true,coVanDaoChieu=false,congSuat=26379.97362,dungCho=xe` |
| 983610 | Của xe tự đổ được thiết kế để sử dụng trên các loại đường kh | `khoiLuongToanBo=19999.98` |
| 984933 | Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả | `dienAp=999.999,dungCho=xe` |
| 984942 | Động cơ điện thuộc nhóm 85.01, trừ loại dùng cho các mặt hàn | `congSuat=999.999,daPha=true,loaiDongDien=XOAY_CHIEU,tenLoai=Động` |

## B — Tên/công dụng ngoài mọi nhánh ở tầng không có "Loại khác" — khoảng trống chữ biểu, giữ DỪNG (4)

| PN6 | Tên phân nhóm | Vector hở (mẫu) |
|---|---|---|
| 870892 | Ống xả và bộ giảm thanh; bộ phận của chúng | `dungCho=8704.10,laBoPhan=false,tenLoai=ẑẑẑ` |
| 984916 | Kính an toàn, bao gồm kính tôi hoặc kính dán nhiều lớp (lami | `dungCho=ẑẑẑ,tenLoai=Kính` |
| 984918 | Lò xo và lá lò xo, bằng sắt hoặc thép | `dungCho=ẑẑẑ,tenLoai=Lò` |
| 984931 | Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc d | `dungCho=ẑẑẑ,tenLoai=Cầu` |

## C — Giá trị liệt kê chung (vd NHAN_TAO) không vào nhánh chi tiết — vấn đề phân cấp khoá (3)

| PN6 | Tên phân nhóm | Vector hở (mẫu) |
|---|---|---|
| 610520 | Từ sợi nhân tạo | `loaiSoiDet=BONG` |
| 981000 |  | `chatLieu=CHINH:plastic,congDung=sản` |
| 983412 | Các sản phẩm khác bằng sắt hoặc thép | `chatLieu=CHINH:plastic,congDung=sản` |

## ? — Cần soát tay (21)

| PN6 | Tên phân nhóm | Vector hở (mẫu) |
|---|---|---|
| 020760 | Của gà lôi | `daChatManh=true,phuongPhapBaoQuan=SONG` |
| 030633 | Cua, ghẹ | `phuongPhapBaoQuan=DONG_LANH,tenLoai=Ghẹ` |
| 030639 | Loại khác | `phuongPhapBaoQuan=DONG_LANH` |
| 030742 | Sống, tươi hoặc ướp lạnh | `tenLoai=Mực` |
| 030749 | Loại khác | `tenLoai=Mực` |
| 080450 | Quả ổi, xoài và măng cụt | `phuongPhapBaoQuan=SONG,tenLoai=Quả` |
| 210690 | Loại khác  [CÓ CỜ HIỆU CHỈNH TIỀN LỆ — bảng L1-4b đã có mục: | `chuaCon=true,congDung=làm` |
| 300410 | Chứa penicillins hoặc dẫn xuất của chúng, có cấu trúc axit p | `chuaPenicillin=false,tenLoai=penicillin` |
| 321290 | Loại khác  [CÓ CỜ HIỆU CHỈNH TIỀN LỆ — bảng L1-4b đã có mục: | `dangLongHoacNhao=true,dongGoiBanLe=false,dungCho=sản` |
| 391690 | Từ plastic khác | `tenLoai=polypropylen` |
| 847790 | Bộ phận | `dungCho=các` |
| 870600 | 8706 - Khung gầm đã lắp động cơ, dùng cho xe có động cơ thuộ | `dungCho=ô` |
| 870891 | Két nước làm mát và bộ phận của chúng | `laBoPhan=false,tenLoai=Nút` |
| 901310 | Kính ngắm để lắp vào vũ khí; kính tiềm vọng; kính viễn vọng  | `dungCho=vũ` |
| 984912 | Lốp loại bơm hơi bằng cao su, chưa qua sử dụng | `dungCho=sử` |
| 984923 | Bơm chất lỏng, có hoặc không lắp thiết bị đo; máy đẩy chất l | `dungCho=động` |
| 984930 | Thiết bị chiếu sáng hoặc thiết bị tín hiệu hoạt động bằng đi | `daLapRap=true,tenLoai=Thiết` |
| 984932 | Bóng đèn dây tóc hoặc bóng đèn phóng điện, kể cả đèn pha gắn | `laBoPhan=false,tenLoai=Bóng` |
| 984934 | Bộ phận và phụ kiện của xe có động cơ thuộc các nhóm từ 87.0 | `dungCho=xe` |
| 984937 | Dụng cụ và máy đo hoặc kiểm tra lưu lượng, mức, áp suất hoặc | `congDung=lưu` |
| 984940 | Ghế ngồi (trừ các loại thuộc nhóm 94.02), có hoặc không chuy | `dungChoXeCoDongCo=true,laBoPhan=false,tenLoai=Miếng` |

