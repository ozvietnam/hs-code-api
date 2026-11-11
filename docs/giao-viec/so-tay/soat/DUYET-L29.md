# Soát độc lập lô L29 — ranh giới 6→8 số (#1109)

- Người soát: `claude-agent:duyet-L29-20261111#soat-L29` (khác mọi phiên soạn: `zcode-sub:glm-5.3:…#soan-<pn6>` và các phiên soạn khác).
- Ngày: 11/11/2026. Bảng soát: `docs/giao-viec/so-tay/SOAT-RANH-GIOI.md` §0–5 + BỔ SUNG 11/11 của tech lead.
- Cách làm: với từng PN6 chạy `--kiem` (25/25 XANH, không DỪNG) và `--ve` (chữ biểu VI + EN từng dòng/tầng), dùng `--goi` để xem cây có
  tầng không mã, đọc toàn bộ `dieuKienSo`, `chongLanTruc` (cauHoiPhanBiet, viDuHang, khongCoHangThat), `ghiChuSoan` (lyDo từng BO_VE).
  Đối chiếu khoá/cách đọc trong `data/tu-vung/tu-vung@{1,2}.json` (loaiCongTac, cumChanDoc) và cách so chữ tự do của
  `lib/dieu-kien-so.js#soChu` (mọi âm tiết của giá trị phải có trong dữ kiện; hư từ bỏ theo `HU_TU`) để biết hệ quả lúc chạy;
  MFN/ACFTA từ `data/tax.json`; tiền lệ từ `data/precedents.json` và `data/ho-so/hieu-chinh-tien-le.json`.
- BỔ SUNG 11/11 mục 1 (ngưỡng số đang chạy): chỉ 3 PN6 có `dieuKienSo` mang số trong sổ tay trên origin/main — 854040 (dungCho, không số),
  854449 (.22 `duong_kinh <= 19.5 mm`), 854460 (.11/.21 `duong_kinh < 22.7 mm`); hai bản nháp đều giữ ngưỡng (đổi sang `duongKinhLoi`, đúng
  chữ «mỗi lõi»). Không PN6 nào dính mẫu mục 2/3 (khoá LIET_KE một giá trị trùng tên phân nhóm/tầng trên).
- Sau lô: `check-so-tay` EXIT=0 (1228 nhóm, 25992 mục, 0 mục không kiểm được nguồn), `check-cay` EXIT=0, `test-so-tay` 65/65 EXIT=0 —
  không phải hoàn tác PN6 nào. Không chạy `bo-kiem-luat --toan-bieu` (theo BỔ SUNG mục 4).

## Tổng

| Kết luận | Số PN6 |
|---|---|
| DUYET (+ áp dụng sổ tay) | 13 |
| TRA_VE | 12 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 (853650 cũng thiếu mục bảng cho 3387/TB-TCHQ nhưng đã TRA_VE vì lỗi khác) |
| chưa soát | 0 |

Tỉ lệ sai theo PN6: **12/25 = 48 %**. Theo nhóm 4 số: 8536 1/5 sai, 8537 0/1, 8538 0/1, 8540 1/1, 8543 1/3, 8544 4/6, 8546 1/1,
8547 1/1, 8549 4/5, 8608 0/1, 8609 0/1.

Dòng 8 số mang điều kiện sai (chưa tính dòng «Loại khác» nhận nhầm): khoảng 18 — 853650 .40 + tiêu đề 8536503 (12 dòng dưới bị
ảnh hưởng gián tiếp), 854040 .10, 854370 .60, 854411 .20/.30/.40, 854449 .41, 854460 .11/.21, 854620 .10, 854790 .10, 854911
tầng 8549111 (3 dòng) + .20/.30, 854913/854914/854919 .20.

Cổng 5: lô có 12 cảnh báo `cong5-bo-ve` ở 6 PN6. Người soát chấp nhận 5 (853720 ×2, 854330 ×1, 854790 ×2) và bác 7 (853650 ×4 —
lý do «giá trị định nghĩa đúng bằng sáu vế» chưa đứng vì cách đọc zh; 854913/854914/854919 ×1 mỗi PN6 — lyDo sai). Thêm 2 lỗi
cổng 5 KHÔNG báo được vì máy tách sai (854040 «loại màu» gộp vào đầu ngữ; 854620 hai cụm nối «và» thành một vế).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 853610 | DUYET | Tiêu đề 8536101 «Thermal fuses; glass type fuses» mảng 2 tên, 8536109 trần; quạt điện / <16 A («dưới») / khối cầu chì + xe có động cơ khớp chữ. |
| 853630 | DUYET | .10 tên «Bộ chống sét», .20 mảng 2 đích; chongLanTruc .10↔.20 có hàng thật (bộ chống sét cho thiết bị vô tuyến) ⇒ lúc chạy hỏi. |
| 853650 | TRA_VE | (A) .40 bỏ đầu ngữ «Công tắc mini»; cachDoc MINI_NOI_COM «lò nướng» bắt luôn vế «đảo mạch dùng cho bếp và bếp có lò nướng» (EN «commutators for stoves and ranges») của 8536503 ⇒ đảo mạch bếp vào .40. (B) cumChanDoc chỉ che vi/en, zh «微动开关» vẫn đọc NGAT_SOC_DONG ⇒ công tắc hành trình vào 8536503 (BO_VE 4 vế chưa đứng). (C) 3387/TB-TCHQ (.61) vẫn chưa có mục bảng hiệu chỉnh. |
| 853661 | DUYET | Tiêu đề 8536611 «compact lamps or halogen lamps» mảng 2 đích; .11/.91 <16 A. |
| 853670 | DUYET | «Of ceramics»/«Of copper» neo tenLoai «gốm»/«đồng» cùng trục (tiền lệ 340700); so chữ tự do — lúc chạy không tự chốt. |
| 853720 | DUYET | ≥ 66 kV đối chiếu tay («từ … trở lên»); BO_VE «để ngắt, nối hoặc bảo vệ mạch điện» đúng — nhóm 85.37 = bảng gắn ≥ 2 thiết bị 85.35/85.36. |
| 853810 | DUYET | ≤/> 1000 V; .11/.21 laBoPhan + PLC + máy cho khuôn bán dẫn; tiền lệ 3831/TB-TCHQ → .19 khớp. |
| 854040 | TRA_VE | .10 SUY RỘNG: bỏ vế «loại màu» (EN «colour»); 854040 gồm cả ống ĐƠN SẮC ⇒ ống đơn sắc cho hàng 85.25 lấn .90. Máy tách gộp «, loại màu,» vào đầu ngữ. |
| 854330 | DUYET | BO_VE «nhúng trong dung dịch» chấp nhận (8543.30 vốn là mạ/điện phân/điện di); .91 dưới 8543309 «Loại khác» nên không chồng .20; BO_VE thừa vô hại. |
| 854370 | TRA_VE | .60 phương án 2 SUY RỘNG: định ngữ chung «điện tín hoặc điện thoại» tách khỏi «thiết bị» ⇒ dungCho có «thiết bị» trần — mọi sản phẩm «thiết kế đặc biệt để kết nối với thiết bị» vào .60. ghiChuSoan mục «85437050» thực ra là .60. |
| 854390 | DUYET | dungCho theo mã 8543.10/.20, 8543.30.20, 8543.70.30, 8543.70.40; tiền lệ 4205/TB-TCHQ → .90 khớp. |
| 854411 | TRA_VE | .20 THU HẸP: bỏ «hoặc bọc» (EN «or covering») ⇒ dây đồng bọc giấy/sợi dệt rơi .90 (10 % thay 15 %). .20/.30/.40 neo thuộc tính lớp phủ vào tenLoai «lớp phủ ngoài» ⇒ dây đồng tráng men (không có chữ «lớp phủ ngoài») TRÁI .40 ⇒ .90. |
| 854430 | DUYET | Cây có tầng không mã r16045/r16048 đúng; dungChoXeCoDongCo, cao su/plastic CACH_DIEN, xe nhóm 87.02/03/04/11; tiền lệ 3299/TB-TCHQ → .12 khớp. |
| 854449 | TRA_VE | .41 THU HẸP: tenLoai «Cáp bọc» (cắt từ «Cáp bọc cách điện» = «Cables insulated») bắt âm tiết «bọc» ⇒ «Cáp điện cách điện PVC 600 V» TRÁI .41 → .42 (ACFTA 5 % → 0 %). Phần còn lại đạt, giữ ngưỡng 19,5 mm. |
| 854460 | TRA_VE | .11/.21 cùng lỗi «Cáp bọc» ⇒ cáp trung thế XLPE lõi < 22,7 mm rơi .12 (MFN 20 % → 5 %). Ngưỡng 22,7 mm, tầng 1/36/66 kV đạt. |
| 854470 | DUYET | Ba loại cáp ngầm dưới biển mảng tên; tiền lệ 1985/TB-TCHQ, 691/TB-TCHQ → .90 khớp bảng 854470-01 KHONG_LECH. |
| 854620 | TRA_VE | .10 SUY RỘNG: bỏ đầu ngữ «Cách điện xuyên» (EN «Transformer bushings») ⇒ mọi cái cách điện gốm cho máy biến áp vào .10. Máy tách không tách «… và cách điện của thiết bị ngắt mạch». |
| 854790 | TRA_VE | .10 THU HẸP: tenLoai «các khớp nối của chúng» giữ âm tiết «chúng» ⇒ khớp nối ống luồn dây TRÁI .10. Sửa thành «khớp nối». BO_VE «được lót … cách điện» chấp nhận. |
| 854911 | TRA_VE | Tầng 8549111 «Lead-acid scrap storage batteries, drained or undrained»: tenLoai «ắc qui axit chì» = chính phạm vi PN6 ⇒ mảnh vụn/tấm cực chì cũng THOẢ 8549111 thay 8549119; .20/.30 «Phế liệu và phế thải» một chuỗi đòi cả hai chữ. |
| 854913 | TRA_VE | .20 BO_VE «Của ắc qui điện» với lyDo sai («thuộc phạm vi nhóm») — đây là vế phân .20 với .10 «Của pin và bộ pin» ⇒ phế liệu pin sơ cấp dùng cho máy bay thoả cả .10 và .20. |
| 854914 | TRA_VE | Như 854913 (.20). |
| 854919 | TRA_VE | Như 854913 (.20). |
| 854991 | DUYET | .10 mảng 2 tên (bỏ «khác» đúng; `nghi-phan-con-lai` báo oan — không phải phần còn lại). |
| 860800 | DUYET | .20 «Electro-mechanical equipment» nguyên văn; .90 trần. |
| 860900 | DUYET | .10 «Of base metal» ⇒ chatLieu «kim loại». |

## Lỗi đáng chú ý (để Claude / người soạn sửa)

1. **Neo tenLoai bằng mảnh cụm danh từ có âm tiết thừa** (854449 .41, 854460 .11/.21 «Cáp bọc»; 854790 «các khớp nối của chúng»;
   854411 «lớp phủ ngoài»; 854911 «Phế liệu và phế thải»). `soChu` đòi MỌI âm tiết của giá trị có trong dữ kiện, nên một âm tiết
   không thuộc danh từ đầu («bọc» của «bọc cách điện», «chúng» của «của chúng») biến dòng thành TRÁI với cách mô tả thường gặp.
   Gợi ý cho cổng: cảnh báo khi giá trị tenLoai chứa «chúng», hoặc khi giá trị cắt giữa một cụm «bọc cách điện»/«phủ ngoài».
2. **BO_VE với lyDo «thuộc phạm vi nhóm» trên vế phân biệt anh em** (854913/854914/854919 .20 «Của ắc qui điện»). Vế lặp tên
   nhóm 4 số chỉ được miễn khi KHÔNG có anh em nào khác ở đúng trục đó; ở đây .10 «Của pin và bộ pin» là anh em cùng trục.
3. **853650 / tu-vung**: MINI_NOI_COM đọc «lò nướng» trùng chữ «bếp có lò nướng» của 8536503; cumChanDoc.loaiCongTac thiếu mẫu zh
   («微动开关»); nhanVi/nhanEn của NGAT_SOC_DONG «công tắc micro / micro switch» là dịch sai «microphone switches» — nên sửa ở tu-vung.

## Máy tách sai (§2 — cho Claude chỉnh `lib/ho-so/tach-ve.js`)

- 854040 .10: «Ống hiển thị dữ liệu/đồ họa, loại màu, của loại dùng cho …» — «, loại màu,» (EN «, colour,») là vế GIỚI HẠN nhưng bị gộp
  vào DAU nên cổng 5 không đòi phủ.
- 854620 .10: «Cách điện xuyên của máy biến điện (…) và cách điện của thiết bị ngắt mạch» — hai cụm danh từ nối «và» (EN «Transformer
  bushings and circuit breaker insulators») bị coi là một vế GIỚI HẠN «của máy biến điện … và cách điện của thiết bị ngắt mạch».
- 854449/854460: «Cáp bọc cách điện bằng plastic» — DAU «Cáp bọc cách điện» chứa động từ «bọc cách điện» (= insulated); nên tách DAU «Cáp».
- 854790 .10: DAU «Ống dẫn dây điện và các khớp nối của chúng, làm» — dính chữ «làm» của «làm bằng».
- 854370 .50 vế 3: DAU «đầu đọc điện tử di động hoạt động» — dính «hoạt động» của «hoạt động bằng pin».
- 853650 8536503: nhãn «công tắc micro» (vế 3) đúng chữ VI nhưng chữ EN «microphone switches» — bộ tách không sai, nhưng cách đọc từ vựng thì sai (mục 3 ở trên).
