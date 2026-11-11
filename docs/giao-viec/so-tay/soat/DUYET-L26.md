# Soát độc lập lô L26 — ranh giới 6→8 số (#1109)

- Người soát: `claude-agent:duyet-L26-20261111#soat-L26` (khác mọi phiên soạn: `…#soan-<pn6>`, `zcode-sub:glm-5.3:…`).
- Ngày: 11/11/2026. Bảng soát: `docs/giao-viec/so-tay/SOAT-RANH-GIOI.md` §0–5 + BỔ SUNG 11/11.
- Cách làm: với mỗi PN6 chạy `--kiem` (65/65 XANH, không DỪNG) và `--ve` (chữ biểu VI + EN từng dòng/tầng). Đọc toàn bộ `dieuKienSo`, `dieuKienNut` và
  `ghiChuSoan` (BO_VE và lý do). Đối chiếu từng giá trị với chữ biểu. Mở `data/so-tay/<h4>.json` trên origin/main tìm ngưỡng số đang chạy:
  chỉ 84659210 và 84659510 có ngưỡng số. Đối chiếu tiền lệ (`precedents.json`) theo chuỗi mã. Đối chiếu bảng hiệu chỉnh 847150-01.
- Lưu ý độc lập: 845819, 845899, 846592 và 847150 do một phiên soạn mang cùng mã phiên Claude với phiên điều phối lô soát này. Người soát là
  một tác tử con có ngữ cảnh riêng và không soạn các bản đó. Theo nếp của các lô L trước, các bản này vẫn được soát. GĐ có thể xem lại nếu cần.
- Sau lô đã chạy cả ba bản kiểm, không phải hoàn tác PN6 nào:
  - `check-so-tay`: EXIT 0, 1228 nhóm, 0 mục không kiểm được nguồn.
  - `check-cay`: EXIT 0.
  - `test-so-tay`: 65/65 passed, EXIT 0.
- Không chạy `bo-kiem-luat --toan-bieu` (theo BỔ SUNG 11/11 mục 4).

## Tổng

| Kết luận | Số PN6 |
|---|---|
| DUYET (+ áp dụng sổ tay) | 59 |
| TRA_VE | 6 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo PN6 là **6/65 = 9,2 %**. Theo nhóm 4 số: 8465 có 3/6 PN6 sai, 8456 có 2/4, 8460 có 1/4. Các nhóm 8450, 8451, 8453, 8457, 8458, 8459,
8461–8464, 8466–8468, 8470–8473 sạch. Dòng 8 số mang điều kiện sai: 7 dòng, gồm 84564020, 84569020, 84603110, 84659110, 84659210 và 84659950,
cộng dòng «Loại khác» cùng phân nhóm nhận nhầm.

Cổng 5 báo 8 vế BO_VE trên các PN6 này. Người soát xác nhận 4 vế đúng: 847141, 847149, 8472904 và 847170. Hai vế ở 846595 là phần của cụm đường
kính chuôi, cũng đúng. Hai vế BO_VE ở 846031 sai. Hai vế BO_VE ở 846592 nằm trong bản bị trả về vì lỗi khác.

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 845011 | DUYET | «dry linen capacity not exceeding 6 kg» ⇒ khoiLuong ≤ 6 kg (biên đối chiếu tay). Lúc chạy phải hỏi SỨC CHỨA VẢI KHÔ, không phải khối lượng máy (tu-vung chưa có khoá sức chứa). |
| 845012 | DUYET | Như 845011. |
| 845019 | DUYET | Tầng 8450191 hoatDongBangDien CO; .11/.91 khoiLuong ≤ 6 kg (sức chứa). |
| 845090 | DUYET | dungCho mã phân nhóm nguyên văn. |
| 845130 | DUYET | tenLoai «Máy là trục đơn» + GIA_DINH; tên phân nhóm không chứa «gia dụng». |
| 845190 | DUYET | dungCho trọn cụm đích có biên 10 kg; BO_VE thừa, vô hại. |
| 845310 | DUYET | hoatDongBangDien CO/KHONG. |
| 845320 | DUYET | hoatDongBangDien CO/KHONG. |
| 845380 | DUYET | hoatDongBangDien CO/KHONG. |
| 845611 | DUYET | chiHoacChuYeu CO + congDung 4 đích. Ba đích sau thiếu chữ «sản xuất» nhưng nghĩa vẫn là hàng được sản xuất, không đổi mã. |
| 845612 | DUYET | Như 845611. |
| 845640 | TRA_VE | Xem lỗi 1. |
| 845690 | TRA_VE | Xem lỗi 2. |
| 845710 | DUYET | congSuat ≤ 4 kW (spindle power). |
| 845811 | DUYET | congSuat ≤ 4 kW. |
| 845819 | DUYET | banKinhGiaCongTien ≤ 300 mm (EN «distance between the main spindle centre and the bed»). |
| 845899 | DUYET | Như 845819. |
| 845929 | DUYET | hoatDongBangDien CO/KHONG. |
| 845939 | DUYET | hoatDongBangDien CO/KHONG. |
| 845949 | DUYET | hoatDongBangDien CO/KHONG. |
| 845959 | DUYET | hoatDongBangDien CO/KHONG. |
| 845969 | DUYET | hoatDongBangDien CO/KHONG. |
| 845970 | DUYET | hoatDongBangDien CO/KHONG. |
| 846029 | DUYET | hoatDongBangDien CO/KHONG. |
| 846031 | TRA_VE | Xem lỗi 3. |
| 846039 | DUYET | hoatDongBangDien CO/KHONG. |
| 846090 | DUYET | hoatDongBangDien CO/KHONG. |
| 846190 | DUYET | tenLoai «Máy bào». |
| 846222 | DUYET | dieuKhienSo CO. |
| 846232 | DUYET | dieuKhienSo CO. |
| 846261 | DUYET | Tầng dieuKhienSo CO; mayRenKhuonHoacDapKhuon CO ở .11/.91. |
| 846262 | DUYET | Như 846261. |
| 846263 | DUYET | mayRenKhuonHoacDapKhuon CO. |
| 846269 | DUYET | mayRenKhuonHoacDapKhuon CO. |
| 846290 | DUYET | mayRenKhuonHoacDapKhuon CO. |
| 846310 | DUYET | hoatDongBangDien CO/KHONG. |
| 846320 | DUYET | hoatDongBangDien CO/KHONG. |
| 846330 | DUYET | hoatDongBangDien CO/KHONG. |
| 846390 | DUYET | hoatDongBangDien CO/KHONG. |
| 846410 | DUYET | hoatDongBangDien CO/KHONG. |
| 846420 | DUYET | hoatDongBangDien CO/KHONG. |
| 846490 | DUYET | hoatDongBangDien CO/KHONG. |
| 846591 | TRA_VE | Xem lỗi 4. |
| 846592 | TRA_VE | Xem lỗi 5 (mất ngưỡng số SEN). |
| 846593 | DUYET | hoatDongBangDien CO/KHONG. |
| 846595 | DUYET | tocDo > 50000 vòng/phút + duongKinh ≤ 3,175 mm, giữ đúng ngưỡng số SEN đang chạy. BO_VE «có thể lắp vừa / được mũi khoan» đúng. |
| 846599 | TRA_VE | Xem lỗi 6. |
| 846610 | DUYET | dungCho 7 mã nguyên văn. |
| 846620 | DUYET | dungCho 7 mã nguyên văn. |
| 846693 | DUYET | .30 HOAC hai phương án theo «;»; .40 dungCho 8456.50.00. Đích «nhóm 85.17/84.71» rút gọn «bộ phận của máy móc thuộc», nhưng máy công cụ của các mã đó chỉ làm bộ phận nên không đổi mã. |
| 846791 | DUYET | tenLoai «cơ điện» (so chữ). |
| 846799 | DUYET | dungCho 3 mã. |
| 846820 | DUYET | cachDieuKhien BANG_TAY; «không cầm tay» là phạm vi 8468.20. |
| 846890 | DUYET | dungCho 8468.20.10. |
| 847090 | DUYET | tenLoai «Máy đóng dấu bưu phí». |
| 847130 | DUYET | tenLoai mảng 3 tên. |
| 847141 | DUYET | BO_VE «trừ máy tính xách tay 8471.30» đúng phạm vi 6 số. Tiền lệ 2580, 5501 và 1966/TB-TCHQ ở .90 khớp. |
| 847149 | DUYET | Như 847141. |
| 847150 | DUYET | tenLoai «Bộ xử lý» + dungCho «máy tính cá nhân». Bảng hiệu chỉnh 847150-01 nay là KHONG_LECH, khớp chữ biểu. Ghi chú LECH_CHUA_PHAN_XU của người soạn đã cũ. |
| 847160 | DUYET | tenLoai danh từ đầu. Vế «kể cả chuột…» là PHU (QUY-TRINH mục 8). Tiền lệ 14074/TB-CHQ (RFID reader) ở .90 khớp. |
| 847170 | DUYET | BO_VE «có thể ghi được (CD-R)» đúng vì là ví dụ trong vế kể cả. |
| 847180 | DUYET | tenLoai mảng hai tên. |
| 847290 | DUYET | .41 «Tự động» là TEN_LOAI nguyên văn (chưa có khoá CO); BO_VE «trừ máy in 84.43» đúng; .60/.90 hoatDongBangDien. |
| 847330 | DUYET | tenLoai «Tấm mạch in đã lắp ráp». Tiền lệ khung máy chủ (437, 1141 TB) ở .90 khớp. |
| 847350 | DUYET | dungCho 84.71. |

## Lỗi của các bản TRA_VE

1. **845640 / 84564020 — SUY RỘNG.**
   - Chữ biểu: «Máy làm sạch bằng plasma sử dụng để loại bỏ các chất ô nhiễm hữu cơ **khỏi các mẫu kính hiển vi điện tử và giá đỡ mẫu**»
     (EN «… from electron microscopy specimens and specimen holders»).
   - Lỗi: congDung chỉ giữ «loại bỏ các chất ô nhiễm hữu cơ», bỏ đích.
   - Hệ quả: máy làm sạch plasma cho wafer hay linh kiện bị kéo từ .90 sang .20.
2. **845690 / 84569020 — SUY RỘNG.**
   - Đầu ngữ giới hạn công nghệ không có điều kiện nào: «Thiết bị gia công ướt ứng dụng công nghệ nhúng dung dịch điện hóa» (EN «Wet processing
     equipment for the application by immersion of electrochemical solutions»).
   - Mảng congDung `["tách vật liệu trên các tấm mạch in","tấm dây in"]`: phần tử 2 mất động từ.
3. **846031 / 84603110 — SUY RỘNG, hai BO_VE làm đổi mã.**
   - BO_VE «bằng vật liệu carbua» (EN «for sharpening carbide drilling bits»): máy mài mũi thép gió bị kéo sang .10.
   - BO_VE «có bộ phận đồ gá kẹp … lắp cố định» (EN «provided with fixed collets») với lý do «không có khoá». Thiếu khoá thì phải ghi
     THIEU_KHOA_TU_VUNG/DỪNG, không được BO_VE.
4. **846591 / 84659110 — SUY RỘNG.**
   - Mảng congDung `["khắc vạch lên các tấm mạch in","tấm dây in","tấm nền của tấm mạch in","tấm nền của tấm dây in"]`: 3/4 phần tử mất động từ
     «khắc vạch lên» (EN «used for scoring»).
   - Hệ quả: máy cưa cắt rời tấm dây in bị kéo từ .90 sang .10.
5. **846592 / 84659210 — bỏ mất ngưỡng số SEN.**
   - Sổ tay đang chạy có `duong_kin_chuoi_mui_khac <= 3,175 mm`. Bản nháp thay bằng khoá CO `chuoiMuiKhongQua3175` (BỔ SUNG 11/11 mục 1).
   - Bản nháp còn mắc lỗi mảng congDung mất động từ như 846591.
6. **846599 / 84659950 vế 2 — SUY RỘNG.**
   - congDung «tấm nền» bỏ định ngữ «của tấm mạch in / của tấm dây in» (EN «printed circuit board or printed wiring board substrates»).
   - Hệ quả: máy khắc vạch tấm nền plastic cứng không phải nền mạch in bị kéo sang .50.

Mẫu lỗi chung của lô là **mảng CONG_DUNG «hoặc» chỉ đặt động từ ở phần tử đầu** (4/6 bản TRA_VE). Đề xuất cho cổng 3: cảnh báo khi phần tử
đầu của mảng `congDung` bắt đầu bằng động từ còn các phần tử sau chỉ là danh từ.

## Máy tách sai (§2) — để chỉnh `lib/ho-so/tach-ve.js`

1. «Không hoạt động bằng điện» (khoảng 25 dòng của lô, vd 84531020) bị cắt thành GIOI_HAN «Không hoạt động» + «bằng điện». Phủ định phải đi với
   cả cụm, không phải với động từ.
2. 84659510: «để sản xuất các tấm mạch in hoặc tấm dây in, có tốc độ quay trên 50.000 vòng/phút» bị gộp thành MỘT vế. Đây là hai giới hạn (công
   dụng và biên số), dấu phẩy trước «có» bị bỏ qua.
3. 84659210 / 84659510: «có thể lắp vừa | được mũi khắc/mũi khoan | có đường kính chuôi…» bị cắt giữa cụm động từ «lắp vừa được». Người soạn
   phải BO_VE hai mảnh vô nghĩa.
4. 84669330: cắt «loại chỉ sử dụng hoặc chủ yếu | sử dụng để sản xuất…» và «loại chỉ | được sử dụng hoặc chủ yếu để…». Cụm «solely or
   principally used» bị cắt đôi.
5. 84564020: «Máy làm sạch | bằng plasma» bị tách thành GIOI_HAN, dù «máy làm sạch bằng plasma» (plasma cleaner) là một tên hàng.
