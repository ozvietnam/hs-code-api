# Soát độc lập lô L31 — 60 phân nhóm (chương 88, 89, 90, 91, 92) — #1109

- Phiên soát: `claude-agent:duyet-L31-20261111#soat-L31` (khác mọi phiên soạn của lô).
- Cách làm: với từng PN6 chạy `--kiem` (tất cả XANH, không DỪNG), `--ve` (chữ biểu VI + EN từng dòng/tiêu đề), `--goi` (cây +
  tên phân nhóm EN), đặt từng điều kiện cạnh chữ biểu, đọc mọi cảnh báo (BO_VE, bien-khong-doc-duoc…), đối chiếu sổ tay đang chạy
  trên origin/main (BỔ SUNG 11/11 mục 1: không PN6 nào của lô có `dieuKienSo` mang số trong `data/so-tay/` — không mất ngưỡng số) và
  tra `data/precedents.json` theo PN6.
- Không chạy `bo-kiem-luat --toan-bieu` (BỔ SUNG 11/11 mục 4).

## Tổng

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 41 |
| TRA_VE | 18 |
| Đỏ — không soát | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát (giữ NHAP) | 1 |

Tỉ lệ sai theo PN6: 18/59 PN6 đã soát = **30,5 %**. Dòng 8 số bị ảnh hưởng trực tiếp (dòng mang điều kiện sai): 24 dòng
(cộng các dòng "Loại khác" anh em bị lấn).

Mẫu lỗi lặp lại (đều do thợ rẻ soạn; máy cổng 5 báo "phủ" nên XANH giả):

1. **VÀ thành HOẶC** — hai/ba điều kiện cùng lúc của chữ biểu bị gom vào MỘT mảng `dungCho` (mảng = "hoặc"): 901480, 901490,
   903289.
2. **Tách định ngữ chung** — cụm bổ nghĩa chung bị cắt khỏi các danh từ/đối tượng sau: 900850 ("Máy đọc"), 901380, 902219,
   903190 ("xác định và sửa lỗi"/"kiểm tra" chỉ còn ở giá trị đầu), 902890 ("của công tơ nước" chỉ gắn "thân").
3. **Bỏ danh từ đầu, chỉ giữ công dụng** — 902610, 902620, 920991, 901890 (.10 bỏ "đeo trên đầu").
4. **Liệt kê gói trong một chuỗi** ("tấm mạch in/tấm dây in và mạch in đã lắp ráp") — 903149, 903190 (THU HẸP).
5. Khoá sai đối tượng (900720 `chieuRong` của hàng thay cho khổ phim), tên phân nhóm chứa vế dòng (901710), vế mở bị BO_VE
   (920590), chữ VI rộng hơn EN (920890).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 880220 | DUYET | .10 'Máy bay'/'Aeroplanes'; .90 trần. |
| 880240 | DUYET | như 880220. |
| 880400 | DUYET | HOAC dù xoay \| bộ phận của dù xoay; phụ kiện rơi .90 đúng chữ. |
| 880529 | DUYET | .10 thiết bị huấn luyện bay mặt đất; bộ phận rơi .90. |
| 890110 | DUYET | 6 khoảng GT, biên ≤/> khớp VI+EN, liền mạch. |
| 890120 | DUYET | tầng 8901207 + 5 dòng GT khớp. |
| 890130 | DUYET | 3 khoảng GT khớp. |
| 890190 | **chưa soát (giữ NHAP)** | Nội dung khớp chữ biểu (tầng có/không động cơ đẩy + khoảng GT), nhưng người soạn là phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU` — trùng phiên điều phối của lô soát này; để tránh tự duyệt, nhường người soát của phiên khác. |
| 890400 | DUYET | GT ≤26 / >26; công suất 1.200/3.200/4.000 hp khớp. |
| 890590 | DUYET | .10 ụ nổi; tiền lệ 1952/TB-TCHQ (FSO → 8905.90.90) khớp. |
| 890690 | DUYET | lượng giãn nước 30/300 t — khoá khoiLuongToanBo ghi rõ gồm lượng giãn nước. |
| 890790 | DUYET | .10 phao nổi. |
| 900110 | DUYET | dungCho viễn thông \| ngành điện. |
| 900190 | DUYET | dungCho máy ảnh/máy quay phim/máy chiếu theo VI (EN có thể hẹp hơn: projectors ảnh/phim). |
| 900580 | DUYET | vế "trừ … vô tuyến" đã ở chữ phân nhóm; BO_VE thừa. |
| 900653 | DUYET | ngamQuaThauKinhSLR CO. |
| 900659 | DUYET | tầng phim < 35 mm (chữ tự do), tầng khuôn in, .30 Loại khác có tên. |
| 900691 | DUYET | dungCho theo mã; .10 chuỗi tự do thay vì mã 9006.59.21 (không tất định). |
| 900699 | DUYET | dungCho đèn chớp. |
| 900720 | **TRA_VE** | .10 'Dùng cho phim khổ rộng dưới 16 mm' ghi `chieuRong < 16 mm` — chiều rộng của chính máy chiếu, không phải khổ phim. |
| 900850 | **TRA_VE** | .10 'Máy đọc vi phim, vi thẻ hoặc vi bản khác' → tenLoai ['Máy đọc vi phim','vi thẻ','vi bản'] — mất "máy đọc"; máy chiếu vi thẻ lấn .10. |
| 900890 | DUYET | dungCho máy phóng/thu nhỏ; vế trừ ghi trên tenLoai thừa nhưng không đổi mã. |
| 901060 | DUYET | biên đối chiếu tay: 'từ 300 inch trở lên' = >= 300. |
| 901090 | **TRA_VE** | .30 dungCho 'máy' + congDung ['chiếu','vẽ mạch'] — mất "mạch", "chất nền nhạy sáng", "sản xuất tấm mạch in"; laBoPhan loại phụ kiện. |
| 901310 | DUYET | HOAC kính ngắm+vũ khí \| tiềm vọng; .20 kính viễn vọng là bộ phận. |
| 901380 | **TRA_VE** | .10 congDung tách "xác định và sửa lỗi" khỏi 'tấm dây in', 'mạch in đã lắp ráp'. |
| 901390 | DUYET | dungCho mã 9013.20.00 / 9013.80.10 / 9013.10.10. |
| 901480 | **TRA_VE** | tầng 9014801 "dùng trên tàu thuyền, kết hợp … máy xử lý dữ liệu" thành HOẶC. |
| 901490 | **TRA_VE** | .10 cùng lỗi VÀ→HOẶC. |
| 901580 | DUYET | 'gió điện từ' tách khỏi "thiết bị quan trắc" nhưng không mở rộng phạm vi. |
| 901710 | **TRA_VE** | .10 'Máy vẽ (Plotters)' → 'Máy vẽ' ⊂ tên phân nhóm 'máy vẽ phác thảo' (BỔ SUNG mục 3). |
| 901790 | DUYET | .30 cụm giữ trọn; .40 'máy vẽ khác' + phanConLai. |
| 901831 | DUYET | dungMotLan CO. |
| 901839 | DUYET | .10 ống thông; tiền lệ 4842/TB-TCHQ → .90 khớp. |
| 901890 | **TRA_VE** | .10 bỏ 'loại dùng đeo trên đầu'; tầng 9018903 'điện tử' ghi bằng tên — lệch tiền lệ 13727/TB-CHQ (máy plasma lạnh → 9018.90.31). |
| 901910 | DUYET | hoatDongBangDien CO; tiền lệ 4419/TB-TCHQ (không điện → .90) khớp. |
| 902000 | DUYET | mặt nạ khuôn mặt + CBRN (chữ tự do). |
| 902110 | DUYET | chatLieu sắt thép. |
| 902219 | **TRA_VE** | .10 congDung tách 'tấm dây in' khỏi "kiểm tra … điểm hàn nối". |
| 902290 | DUYET | BO_VE "của thiết bị sử dụng tia X" lyDo sai nhưng không đổi mã (công dụng chỉ có ở tia X). |
| 902410 | DUYET | điện / không điện. |
| 902480 | DUYET | điện / không điện. |
| 902610 | **TRA_VE** | .50 chỉ dungChoXeCoDongCo, bỏ "Dụng cụ đo mức" — đo lưu lượng cho xe lấn .50. |
| 902620 | **TRA_VE** | .50 chỉ dungChoXeCoDongCo, bỏ "Máy đo áp suất" — lệch tiền lệ 46173/TB-CHQ (cảm biến áp lực dầu ô tô → 9026.20.90). |
| 902789 | DUYET | lộ sáng kế; tiền lệ 9572/TB-CHQ → .90 khớp. |
| 902810 | DUYET | thiết bị đo khí + lắp trên bình ga. |
| 902820 | DUYET | công tơ nước. |
| 902830 | DUYET | máy đếm kWh. |
| 902890 | **TRA_VE** | .10 HOAC [Vỏ] \| [thân + công tơ nước] — vỏ công tơ khí/điện lấn .10. |
| 902920 | DUYET | giữ cả tên + dungChoXeCoDongCo. |
| 902990 | DUYET | hai dòng phủ kín phân nhóm. |
| 903149 | **TRA_VE** | .20/.30 'tấm mạch in/tấm dây in và mạch in đã lắp ráp' một chuỗi (THU HẸP). |
| 903180 | DUYET | thiết bị kiểm tra cáp; tiền lệ 4615/TB-TCHQ → .90 khớp. |
| 903190 | **TRA_VE** | .30 tách "kiểm tra" khỏi 'linh kiện bán dẫn', 'mặt nạ quang', 'lưới ca rô'; .40/.50 gói chuỗi. |
| 903289 | **TRA_VE** | .10 VÀ→HOẶC (ADP + hệ thống tàu thuyền gom một mảng dungCho). |
| 903290 | DUYET | dungCho mã 9032.89.10 / .20. |
| 910690 | DUYET | dụng cụ đo thời gian đậu xe. |
| 920590 | **TRA_VE** | vế mở "loại nhạc cụ có phím tương tự" bị BO_VE, tenLoai liệt kê đóng; VI 'lưỡi gà không bằng kim loại' ngược EN 'free metal reeds' — phải DỪNG. |
| 920890 | **TRA_VE** | VI 'để tạo âm thanh' rộng hơn EN 'sound signalling' — nhạc cụ thổi miệng n.e.c. (kazoo) lấn .10; cần DỪNG. |
| 920991 | **TRA_VE** | .10 chỉ dungCho 'đàn piano loại đứng', bỏ 'Tấm đỡ đàn dây, đàn phím và khung kim loại' — mọi bộ phận piano đứng lấn .10. |

## Tiền lệ cần L1-4b xử lý

- 902620 — 46173/TB-CHQ (cảm biến áp lực dầu bơm dầu ô tô → 9026.20.90): bảng `hieu-chinh-tien-le.json` chưa có mục 902620;
  khi soạn lại .50 phải giữ "Máy đo áp suất" để tiền lệ rơi đúng .90.
- 901890 — 13727/TB-CHQ (máy plasma lạnh → 9018.90.31): tầng 9018903 "Dụng cụ và thiết bị điện tử" cần khoá đặc tính (điện tử),
  không phải tên.

## Máy tách sai (cho Claude chỉnh `lib/ho-so/tach-ve.js`)

1. "Tổng dung tích (gross tonnage) …" (8901, 8904): tách DAU "Tổng" + GIOI_HAN "dung tích …" — cắt danh từ ghép "tổng dung tích".
2. "giữ thăng bằng" (903289 .10): cắt tại "bằng" (coi như vế chất liệu) ⇒ "giữ thăng" / "bằng hoặc xếp hàng hóa của tàu thuyền".
3. "thổi bằng miệng" (920890 .10): cắt tại "bằng" ⇒ "các dụng cụ thổi" / "bằng miệng khác".
4. "Hoạt động bằng điện" / "Không hoạt động bằng điện" (901910, 902410, 902480, 903289): DAU "Hoạt động" + GIOI_HAN "bằng điện" —
   vô hại nhưng là một cụm.
5. "của máy để chiếu hoặc vẽ mạch …" (901090 .30): tách GIOI_HAN "của máy" riêng — dẫn người soạn ghi dungCho 'máy' vô nghĩa.
6. "Của thiết bị quang học xác định và sửa lỗi" / "cho tấm mạch in…" (903190 .40): cắt đôi một cụm công dụng.
7. Cổng 5 báo "phủ" cho mọi vế miễn có một điều kiện bất kỳ trên khoá liên quan — không phát hiện VÀ bị gom thành HOẶC (901480,
   901490, 903289) và danh từ đầu bị bỏ (902610, 902620, 920991). Đề nghị: vế DAU có tên mà dòng không có tenLoai ⇒ cảnh báo; mảng
   `dungCho` gom giá trị từ ≥ 2 vế GIOI_HAN khác nhau ⇒ cảnh báo.
