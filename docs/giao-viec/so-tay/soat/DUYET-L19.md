# Soát độc lập L1-4c — lô L19 (#1109)

- Người soát: `claude-agent:duyet-L19-20261111#soat-L19` (phiên khác người soạn; không đọc `data/bench/*`, `data/oz-export/*`).
- Ngày: 11/11/2026. Lô: 65 PN6 (chương 63–69: hàng dệt hoàn thiện, giày dép, mũ, ô dù, hoa giả, đá/xi măng/amiăng, gốm sứ).
- Trước khi soát đã `git fetch origin main`: cả 65 PN6 còn NHAP trên origin/main, không bản nào đã xử lý ở lô khác.
- Cách làm mỗi PN6: `--kiem` (cả 65 XANH, không DỪNG), `--ve` (chữ biểu VI + EN từng dòng và tiêu đề), đọc toàn bộ bản nháp
  (điều kiện, HOAC, `phanConLai`, `chongLanTruc` + `viDuHang`/`khongCoHangThat`, `chongLanVanBan`, mọi `BO_VE` và `lyDo`),
  đối chiếu `tu-vung@2` (khoá có sẵn và phạm vi giá trị), cách so chữ tự do của `lib/dieu-kien-so.js#soChu`, câu SEN
  (`data/sen-2022.json`) của các dòng có "(SEN)", tiền lệ `data/precedents.json` theo mã/phân nhóm và
  `data/ho-so/hieu-chinh-tien-le.json`.
- Kiểm thêm theo tech lead: so từng dòng 8 số với `data/so-tay/<nhóm>.json` hiện hành trên origin/main. Không PN6 nào trong lô
  có dòng sổ tay mang ngưỡng số SEN bị bản nháp thay bằng khoá có/không; 690722/690723/690730 giữ `kichThuoc < 7 cm` (sau
  áp dụng `data/so-tay/6907.json` vẫn còn 4 điều kiện `kichThuoc`).

## Kết quả

| | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | **48** |
| TRA_VE | **17** |
| Đỏ (không soát) | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát | 0 |

Tỉ lệ sai theo PN6: 17/65 = **26,2 %**. Dòng 8 số bị ảnh hưởng trực tiếp: 25 dòng (630259 .10; 630299 .10; 630510 .11, .21;
630532 .20; 630533 .10; 630539 .20; 630590 .10, .20; 630619 .10; 630710 .10/.20; 640219 .10; 640391 .10; 640399 .10;
650610 .20/.30; 681140 .21; 681182 .10; 681299 .20; 681320 .10). Theo phân nhóm: nhóm 6302–6307 (hàng dệt) 9/22 PN6 sai,
6402–6403 (giày) 3/13, 6506 1/3, 6811–6813 4/9; chương 66, 67, 69 và nhóm 6801–6810 không có lỗi.
Chênh MFN: các cặp dòng bị lấn đều cùng MFN (dệt 12 %, giày 30 %, 6506 0 %, 6811 20 %, 6812–6813 10 %), nên lỗi là
sai mã 8 số (khai báo, chính sách, thống kê), không chênh thuế nhập khẩu MFN.

Sau khi áp dụng: `check-so-tay` 0 mục lỗi nguồn (1228 nhóm), `check-cay` 0 lỗi lệch cây, `test-so-tay` 65/65,
`test-so-tay-gates` 0 failed, `test-engine-loop-so-tay` 0 failed. Không phải gỡ bản nào.

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 630130 | DUYET | phuongPhapIn BATIK = "Printed by traditional batik process" |
| 630140 | DUYET | "Vải không dệt" tenLoai theo quy ước đã DUYET ở 630690 |
| 630190 | DUYET | như 630140 |
| 630222 | DUYET | như 630140 |
| 630232 | DUYET | như 630140 |
| 630251 | DUYET | BATIK |
| 630259 | **TRA_VE** | 63025910 SUY RỘNG: "Từ lanh" (Of flax) ⇒ loaiSoiDet SOI_THUC_VAT_KHAC — giá trị gồm đay, ramie, xơ dừa… (tất định): khăn bàn ramie/đay vào .10. Không có giá trị LANH ⇒ phải THIEU_KHOA_TU_VUNG |
| 630299 | **TRA_VE** | 63029910 cùng lỗi "Từ lanh" ⇒ SOI_THUC_VAT_KHAC |
| 630319 | DUYET | BONG |
| 630419 | DUYET | .20 "Other, nonwoven" tenLoai "không dệt" (so chữ) |
| 630491 | DUYET | "Màn chống muỗi" |
| 630510 | **TRA_VE** | .11/.21 "Từ đay" (Of jute) ghi tenLoai "Từ đay" — giữ giới từ "Từ" nên "bao tải đay" ra TRÁI; quy ước đã duyệt bỏ giới từ ("vải không dệt", "da lông") |
| 630532 | **TRA_VE** | .20 "Dệt kim hoặc móc" ⇒ tenLoai ["Dệt kim","móc"]; "móc" = cái móc (hook) ⇒ bao có móc khớp; có sẵn khoá detKimHoacMoc |
| 630533 | **TRA_VE** | .10 cùng lỗi "móc"; (.20 TUONG_TU đạt) |
| 630539 | **TRA_VE** | .20 cùng lỗi "móc" |
| 630590 | **TRA_VE** | .10/.20 "thuộc nhóm 53.05" (giới hạn loại xơ) ghi thành dungCho CONG_DUNG (công dụng) ⇒ bao gai dầu/xơ dừa khai dungCho "đóng gói…" ra TRÁI, rơi .90 |
| 630619 | **TRA_VE** | .10 "Từ sợi dệt thực vật thuộc nhóm 53.05" ⇒ SOI_THUC_VAT_KHAC + BO_VE "thuộc nhóm 53.05" — giá trị gồm lanh/gai dầu/đay (53.01–53.03); bạt đay vào .10. BO_VE làm đổi mã |
| 630629 | DUYET | BONG |
| 630640 | DUYET | BONG |
| 630710 | **TRA_VE** | .10 "Nonwoven other than felt": BO_VE "trừ phớt" vì "không có op phủ định cho tên" — sai, TEN_LOAI nhận `chieu: PHAI_KHONG`; hàng "phớt không dệt" thành chưa chốt thay vì .20 |
| 631010 | DUYET | "Vải vụn" |
| 631090 | DUYET | "Vải vụn" |
| 640192 | DUYET | PHI_KIM_LOAI; SEN chỉ nêu ví dụ ("như TPU, Kevlar, sợi carbon") |
| 640199 | DUYET | "Giày cổ cao quá đầu gối" tenLoai nguyên văn; chưa có khoá "covering the knee" (ủng không chữ "giày" sẽ không khớp — so chữ không tất định) |
| 640219 | **TRA_VE** | 64021910 SUY RỘNG: "Wrestling footwear" ⇒ giayDauVatCuTa (= đấu vật, cử tạ hoặc thể dục thể hình) |
| 640291 | DUYET | Giày lặn; loaiMuiBaoVe KIM_LOAI / PHI_KIM_LOAI |
| 640299 | DUYET | loaiMuiBaoVe |
| 640319 | DUYET | khongCoHangThat hợp lý. Lưu ý: .30 nên dùng giayDauVatCuTa (khớp nguyên văn) thay CONG_DUNG; cauHoiPhanBiet bị cắt "tương" |
| 640359 | DUYET | "Giày chơi bowling" |
| 640391 | **TRA_VE** | 64039110 SUY RỘNG: "…đế bằng gỗ, không có lót đế bên trong hoặc mũi gắn kim loại bảo vệ" chỉ còn chatLieu gỗ; mất 2 vế phủ định; cổng 5 báo oan "phủ" |
| 640399 | **TRA_VE** | 64039910 cùng lỗi |
| 640411 | DUYET | như 640319 |
| 640419 | DUYET | "Incorporating a protective toe-cap" tenLoai so chữ; gợi ý loaiMuiBaoVe TRONG [KIM_LOAI, PHI_KIM_LOAI] |
| 640610 | DUYET | bản sửa sau lần trả về 02/11 (thêm tenLoai "Mũi giày") — đạt |
| 640620 | DUYET | |
| 640690 | DUYET | .42/.52 lấy SEN "đế giày đã hoàn thiện" (trich là câu SEN, nguon `sen.*`) |
| 650500 | DUYET | chongLanTruc có hàng thật (lưới bao tóc tôn giáo) |
| 650610 | **TRA_VE** | .20 BO_VE "trừ mũ bảo hộ bằng thép" làm ĐỔI MÃ: mũ bảo hộ công nghiệp bằng thép thoả .20 và .30, "tên cụ thể hơn thắng" chọn .20 — ngược "excluding steel helmets" |
| 650699 | DUYET | "da lông" (chatLieu không có giá trị này) |
| 660390 | DUYET | dungCho theo mã nhóm 66.01/66.02 |
| 670290 | DUYET | |
| 680229 | DUYET | |
| 680291 | DUYET | tiền lệ 1904/TB-TCHQ ra ngoài nhóm (38249999), không liên quan |
| 680293 | DUYET | bảng hiệu chỉnh 680293-01 KHONG_LECH |
| 680790 | DUYET | tamLatGachLat |
| 680800 | DUYET | |
| 680919 | DUYET | tamLatGachLat |
| 680990 | DUYET | BO_VE "bằng thạch cao" lặp tên nhóm 6809 |
| 681019 | DUYET | tiền lệ 3844/TB-TCHQ ra 68101910 khớp |
| 681091 | DUYET | theo SEN 68109110 |
| 681140 | **TRA_VE** | .21 "Floor or wall tiles containing plastics" ⇒ ["Gạch lát nền","ốp tường"] — mất danh từ chung "gạch": tấm ốp tường (panel) vào .21 |
| 681182 | **TRA_VE** | .10 cùng lỗi; ví dụ chongLanTruc chỉ chồng nhờ giá trị bị cắt |
| 681189 | DUYET | loaiSanPhamXiMangSoi |
| 681280 | DUYET | mảng 12 tên nguyên văn; "Phụ kiện quần áo" ⊃ "Quần áo" |
| 681291 | DUYET | |
| 681299 | **TRA_VE** | .20 "Floor or wall tiles" ⇒ ["Gạch lát nền","ốp tường"] cùng lỗi |
| 681320 | **TRA_VE** | .10 "Brake linings and pads" ⇒ ["Lót","đệm phanh"] — "phanh" là định ngữ chung; lót ly hợp vào .10 |
| 681513 | DUYET | |
| 681519 | DUYET | TUONG_TU bốn tên nêu trước "tương tự" |
| 690722 | DUYET | BO_VE "unglazed" định ngữ chung (đúng EN); biên "dưới 7 cm" ⇒ `<` soát tay |
| 690723 | DUYET | như 690722. Tiền lệ 7051/TB-TCHQ ("gạch lát sàn" tráng men) ra 69072394 (biểu 2017) — ghi cho L1-4b đối chiếu với .93 |
| 690730 | DUYET | giữ ngưỡng `kichThuoc < 7 cm`; biên soát tay |
| 690740 | DUYET | `dienTichBeMat <= 49 cm2` = "không quá 49 cm2" |
| 691310 | DUYET | nhóm 6913 = đồ trang trí bằng gốm ⇒ "trang trí" lặp tổ tiên |
| 691390 | DUYET | như 691310 |

## Lỗi chung

1. **Lấy giá trị cha rộng hơn khi thiếu giá trị** (630259, 630299, 630619): "lanh" và "thuộc nhóm 53.05" đều dùng
   `SOI_THUC_VAT_KHAC` (gồm cả 53.01–53.05). Đây là điều kiện tất định nên lỗi đi thẳng vào mã. Cần thêm giá trị (LANH, nhóm
   53.05) vào `loaiSoiDet`, hoặc người soạn khai THIEU_KHOA_TU_VUNG. Spec 570190/570239/570249/570250/570299 ("Từ xơ đay" ⇒
   SOI_THUC_VAT_KHAC) có cùng lỗi, lô sau soát lưu ý.
2. **BO_VE với lý do "không có op phủ định"** (630710, 650610): sai, `chieu: 'PHAI_KHONG'` nhận TEN_LOAI/LA. Ở 650610, vế
   bị bỏ làm đổi mã qua quy tắc "tên cụ thể hơn thắng".
3. **Định ngữ / danh từ chung bị tách** (681140, 681182, 681299, 681320; 630532/533/539 "móc"): "Gạch lát nền hoặc
   ốp tường" ⇒ "ốp tường", "Lót và đệm phanh" ⇒ "Lót".
4. **Sai trục**: "thuộc nhóm 53.05" (loại xơ) ghi thành `dungCho` (630590); khoá rộng hơn chữ (giayDauVatCuTa cho
   "Wrestling" 640219).

## Máy tách sai (`lib/ho-so/tach-ve.js`)

- 640391 / 640399: "bằng gỗ, không có lót đế bên trong hoặc mũi gắn kim loại bảo vệ" gộp thành MỘT vế GIOI_HAN và báo
  "phủ" chỉ nhờ chatLieu gỗ. Hai vế phủ định sau dấu phẩy ("không có lót đế bên trong", "[không có] mũi gắn kim loại bảo
  vệ") phải tách riêng. Cổng 5 báo oan.
- 690722 / 690723 .13/.93: ", đã tráng men" không tách khỏi DAU (trong khi ", không tráng men" ở .11 thì tách).
  Ở .14/.94, "đã tráng men" bị coi là DAU.
- 680293: cắt "Dạng tấm đã | được đánh bóng" (động từ "đã được" bị chẻ đôi).
- 681280 vế 5 / 681299 vế 4: "đã | chưa bện" bị coi là danh từ đầu liên hợp; vế 2 cắt "sợi crocidolite đã | được gia
  công".
- 681299 .40: "Vật liệu ghép nối làm | bằng sợi amiăng ép" (cắt sau "làm").
- 681519 .20: DAU nuốt "các loại vật liệu" rồi tách "dùng để lát" thành GIOI_HAN.

## Cổng 5: số vế máy báo và số vế người soát xác nhận

13 cảnh báo `cong5-bo-ve`. Người soát xác nhận đúng 10 (690722 ×3, 690723 ×3, 690730 ×2, 690740 ×1, 680990 ×1),
sai 3 (630619, 630710, 650610). Trong các vế máy báo "phủ", 2 bị báo oan (640391, 640399).
