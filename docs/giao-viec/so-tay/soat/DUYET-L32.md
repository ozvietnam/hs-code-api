# Soát độc lập lô L32 — ranh giới 6→8 số (#1109)

- Người soát: `claude-agent:duyet-L32-20261111#soat-L32` (khác mọi phiên soạn: `…#soan-<pn6>`, `zcode-sub:glm-5.3:…`).
- Ngày: 11/11/2026. Bảng soát: `docs/giao-viec/so-tay/SOAT-RANH-GIOI.md` §0–5 + BỔ SUNG 11/11.
- Cách làm: mỗi PN6 chạy `--kiem` (56/56 XANH, không DỪNG) và `--ve` (chữ biểu VI + EN từng dòng/tầng); đọc toàn bộ
  `dieuKienNut`/`dieuKienSo`, `chongLanVanBan`/`chongLanTruc` (lyDo + từng `viDuHang`), `ghiChuSoan` BO_VE; dựng lại cây biểu
  (kể cả tầng không mã) từ `data/bieu-thue/2026.04.05/` để kiểm phạm vi tầng; tra khoá trong `data/tu-vung/tu-vung@2.json`
  khi lý do là «chưa có khoá»; ghi MFN từ `data/tax.json`.
- BỔ SUNG 11/11 mục 1: đã quét `data/so-tay/<h4>.json` trên origin/main cho 56 PN6 — **không** dòng nào đang mang `dieuKienSo` có ngưỡng số,
  nên không có rủi ro mất ngưỡng SEN; `--ap-dung` không báo `cong3-mat-nguong-so`. Mục 2–3 (khoá LIET_KE trùng phạm vi phân nhóm, tên
  phân nhóm tự chứa vế dòng): không gặp trong lô.

## Tổng

| Kết luận | Số PN6 |
|---|---|
| DUYET (+ áp dụng sổ tay) | 44 |
| TRA_VE | 12 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo PN6: **12/56 = 21,4 %**. Theo nhóm 4 số: 9303 1/3, 9305 2/2, 9306 2/2, 9401 0/3, 9402 0/2, 9403 0/5, 9404 0/1,
9405 1/14, 9406 0/3, 9504 1/3, 9506 1/2, 9601 0/2, 9603 0/2, 9604 0/1, 9608 0/4, 9610 1/1, 9612 0/1, 9613 0/4, 9614 1/1, 9615 1/1,
9616 0/1, 9619 1/1, 9620 0/1. Chương 93 (vũ khí) xấu nhất: 5/7 PN6 sai.

Dòng 8 số bị ảnh hưởng trực tiếp (dòng/tầng mang điều kiện sai, chưa tính dòng «Loại khác» nhận nhầm): 14 (93039010, 93059110,
93059911, 93059991, 93063020, 93069010, 94056910, tầng 9504903 → 95049034/35, 95069910, 96100010, 96140010, tầng 9615901, 96190011).
Chênh MFN đáng kể: 96190011 (5 %) ↔ 96190019 (15 %); các lỗi còn lại cùng MFN trong phân nhóm (mã sai, không chênh thuế MFN), riêng
96100010 ↔ 96100090 chênh VAT (5/8/10 ↔ 8/10).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 930320 | DUYET | tenLoai súng shotgun + congDung săn bắn ≡ "Súng shotgun săn"/Hunting shotguns; súng bắn đĩa/thể thao sang .90 (MFN 30 ↔ 0). |
| 930330 | DUYET | "Súng trường săn" nguyên văn. |
| 930390 | **TRA_VE** | .10 BO_VE "trừ cỡ 23 mm và 26,5 mm" ⇒ **SUY RỘNG** (súng pháo hiệu 26,5 mm vào .10); BO_VE vế mở "và các loại khác được thiết kế chỉ để phóng pháo hiệu" ⇒ THU HẸP. |
| 930591 | **TRA_VE** | .10 "Bằng da thuộc hoặc vật liệu dệt" chỉ còn chatLieu "vải dệt" — bỏ da thuộc (**THU HẸP**); phải DỪNG THIEU_KHOA_TU_VUNG. |
| 930599 | **TRA_VE** | .11 và .91 cùng lỗi da thuộc như 930591 (MFN .91/.99 30 %). |
| 930630 | **TRA_VE** | .20 nhánh bộ phận `dungCho "Đạn"` mất định ngữ "dùng cho súng bắn đinh/súng giết mổ" ⇒ **SUY RỘNG**: bộ phận mọi loại đạn vào .20. Kèm BO_VE "hoặc dụng cụ tương tự". |
| 930690 | **TRA_VE** | .10 BO_VE "và bộ phận của chúng" viện «quy ước» không tồn tại ⇒ **THU HẸP**: bộ phận bom/tên lửa rơi .90. |
| 940120 | DUYET | dungCho nhóm 87.02/87.03/87.04. |
| 940169 | DUYET | khoá tuaLungMatNgoiBangSongMay phủ nguyên cụm vị trí + vật liệu. |
| 940179 | DUYET | như 940169. |
| 940210 | DUYET | HOAC tên đầu + bộ phận; BO_VE "hoặc các loại ghế tương tự" chấp nhận (chỉ 2 dòng, cùng MFN 0, không có Loại khác ⇒ lúc chạy hỏi). |
| 940290 | DUYET | Tầng 9402901 HOAC đúng; BO_VE "được thiết kế đặc biệt" ở tầng không đổi dòng. Ghi nhận: .11 khai "người bệnh" là tenLoai (đúng ra dungCho) — không đổi kết quả (so chữ tự do, lúc chạy hỏi). |
| 940320 | DUYET | tuHutHoiDoc; khớp bảng hiệu chỉnh 940320-01 KHONG_LECH. |
| 940360 | DUYET | tuHutHoiDoc. |
| 940370 | DUYET | Xe tập đi + trẻ em; tủ hút hơi độc. |
| 940389 | DUYET | tuHutHoiDoc. |
| 940399 | DUYET | dẫn mã 9403.70.10. |
| 940429 | DUYET | .20 làm nóng/làm mát (hyperthermia/hypothermia) — cùng MFN 25. |
| 940511 | DUYET | denChoPhongMo; DEN_ROI. |
| 940519 | DUYET | + HUYNH_QUANG; chongLanVanBan .91/.92 có thật. |
| 940521 | DUYET | denChoPhongMo. |
| 940529 | DUYET | denChoPhongMo. |
| 940549 | DUYET | cùng mẫu 940541/940542 đã DUYET; .30 hai vế đúng phạm vi EN; ví dụ chongLanTruc thật. |
| 940550 | DUYET | tầng "Loại đốt bằng dầu" nhienLieu DAU; chongLanTruc đèn bão/đèn thợ mỏ đốt dầu có thật, phanXu null đúng. |
| 940569 | **TRA_VE** | tenLoai có phần tử "đường bộ" — định ngữ của "biển báo" ("road and traffic signs"), không phải tên hàng. (940561 ngoài lô cùng lỗi.) |
| 940591 | DUYET | dungCho đèn phòng mổ/rọi/pha + chao cầu/thông phong; chongLanTruc hợp lệ (ví dụ "thông phong cho đèn pha" hơi gượng — nên thay). |
| 940592 | DUYET | dungCho ba loại đèn. |
| 940599 | DUYET | chụp đèn dệt / vật liệu khác (PHAI_KHONG), dẫn mã, gốm sứ/kim loại; ví dụ chongLanTruc thật. |
| 940610 | DUYET | Nhà trồng cây + ganThietBiCoKhiHoacGiaNhiet. |
| 940620 | DUYET | như 940610. |
| 940690 | DUYET | tầng nhà trồng cây + vật liệu từng dòng đúng chữ. |
| 950430 | DUYET | may rủi tiền mặt + bộ phận/phụ kiện; máy bắn bi/máy tự động phanConLai; bộ phận gỗ/giấy/plastic. |
| 950450 | DUYET | dungCho bộ thu truyền hình. |
| 950490 | **TRA_VE** | Tầng 9504903 chỉ congDung "chơi bạc" ⇒ **THU HẸP**: Quân bài Mạt chược (.34/.35, biểu xếp dưới "Gambling equipment") không tới được; chongLanTruc ví dụ phi tiêu "dùng để chơi bạc" gượng ép. |
| 950640 | DUYET | "Bàn" (bóng bàn). |
| 950699 | **TRA_VE** | .10 "Cung (kể cả nỏ)"/"Bows (including crossbows)" — "kể cả nỏ" mở rộng phạm vi bị bỏ như PHU ⇒ **THU HẸP**: nỏ rơi .90. |
| 960110 | DUYET | khoá hopDungThuocLaTrangTri phủ hai vế (cachDoc chỉ đọc nguyên chuỗi biểu ⇒ lúc chạy hỏi). |
| 960190 | DUYET | tầng xà cừ/đồi mồi, vỏ điệp; .11/.91 HOAC ba hàng; cùng MFN 25. |
| 960310 | DUYET | Bàn chải / Chổi. |
| 960390 | DUYET | túm/búi; quét sàn bằng tay; Bàn chải khác phanConLai. |
| 960400 | DUYET | kim loại. |
| 960810 | DUYET | plastic viTri THAN (BO_VE thừa vô hại). |
| 960830 | DUYET | Bút máy. |
| 960860 | DUYET | plastic. |
| 960891 | DUYET | VANG_HOAC_MA_VANG. |
| 961000 | **TRA_VE** | .10 bỏ danh từ đầu "Bảng đá phiến (slate)"/"School slates", chỉ còn congDung "trường học" ⇒ **SUY RỘNG**: mọi bảng viết dùng trong trường vào .10. |
| 961210 | DUYET | VAT_LIEU_DET. |
| 961310 | DUYET | plastic. |
| 961320 | DUYET | plastic. |
| 961380 | DUYET | áp điện cho lò/bếp; HOAC (châm thuốc \| để bàn) × plastic / PHAI_KHONG. |
| 961390 | DUYET | đủ bốn vế (ống/bộ phận chứa, nạp lại, bật lửa cơ khí, nhiên liệu lỏng/khí hoá lỏng). |
| 961400 | **TRA_VE** | .10 bỏ "đã tạo dáng thô"/"Roughly shaped blocks" (phôi) ⇒ **SUY RỘNG**: tẩu thuốc gỗ thành phẩm khớp congDung "làm tẩu thuốc" vào .10. |
| 961590 | **TRA_VE** | chongLanTruc 9615901↔9615902 ví dụ tự mâu thuẫn ("ghim cài tóc trang trí … là bộ phận tháo rời") — chồng giả do khoá tầng. |
| 961610 | DUYET | bình/lọ xịt nước hoa/trang điểm; bộ phận gá lắp/đầu xịt. |
| 961900 | **TRA_VE** | .11 "With an absorbent core of wadding of textile materials" là đặc điểm, khai tenLoai "Lõi thấm hút" ⇒ **THU HẸP**: bỉm/băng vệ sinh lõi dệt rơi .19 (MFN 5 % ↔ 15 %). |
| 962000 | DUYET | vật liệu từng dòng đúng chữ, rời nhau. |

## Lỗi hệ thống của lô

1. **Bỏ vế bằng BO_VE / bỏ giá trị khi thiếu từ vựng** (930390, 930591, 930599, 930690): người soạn dùng BO_VE hoặc bỏ một vật liệu
   ("da thuộc") để máy xanh thay vì DỪNG `THIEU_KHOA_TU_VUNG`. Vế bị bỏ đều làm đổi mã 8 số.
2. **Mất định ngữ khi dựng nhánh "bộ phận của chúng"** (930630): áp máy móc mẫu `dungCho = tên đầu` mà tên đầu ("Đạn") đã mất định ngữ
   giới hạn của dòng ⇒ suy rộng sang bộ phận mọi loại đạn.
3. **Vế giới hạn nằm trong DAU không bị cổng 5 bắt** (961000 "Bảng đá phiến", 961400 "đã tạo dáng thô", 950699 "(kể cả nỏ)" bị coi PHU):
   cổng chỉ đòi phủ vế GIỚI HẠN/MỞ, nên danh từ đầu / ngoặc mở rộng bị bỏ mà vẫn xanh. Đề nghị cổng 5 báo khi DAU không có điều kiện
   tenLoai/khoá tương ứng và khi ngoặc bắt đầu bằng "kể cả" bị xếp PHU.
4. **Đặc điểm khai thành tên hàng** (961900 .11, 940290 .11 mức nhẹ): "With an absorbent core…" / "dành cho người bệnh" ghi bằng
   TEN_LOAI.
5. **Ví dụ chongLanTruc gượng ép** (950490, 961590).

## Máy tách sai (cho `lib/ho-so/tach-ve.js`)

- 94029011 "Ghế vệ sinh dành cho người bệnh": DAU = "Ghế vệ sinh dành" — "dành cho" phải là một dấu hiệu giới hạn, không cắt giữa.
- 94029012 "Bàn mổ, hoạt động bằng điện": DAU = "Bàn mổ, hoạt động" — vế ", hoạt động bằng điện" phải là một vế giới hạn.
- 96139010 "Ống chứa hoặc bộ phận chứa khác có thể nạp lại …, có chứa nhiên liệu …": tách thành "Ống" | "chứa hoặc bộ phận" | "chứa khác" |
  "có thể nạp lại của bật lửa cơ khí, có" — "Ống chứa"/"bộ phận chứa" là cụm danh từ (cartridges/receptacles), "chứa" không phải dấu hiệu vế.
- 96140010 "Gỗ hoặc rễ cây đã tạo dáng thô để làm tẩu thuốc": "đã tạo dáng thô" bị giữ trong DAU — nên là vế GIỚI HẠN.
- 95069910 "Cung (kể cả nỏ)": ngoặc "kể cả …" xếp PHU — nên là vế MỞ (mở rộng phạm vi).
- 94056910 / 94056110 "… biển báo giao thông và đường bộ": DAU nguyên chuỗi; bộ tách không chỉ ra "và đường bộ" là định ngữ chung
  (người soạn cắt thành tên hàng "đường bộ").

## Cổng 5 — tỉ lệ báo

Cổng 5 báo 7 cảnh báo `cong5-bo-ve` trên 5 PN6 (930390 ×3, 930630, 930690, 940210, 940290) + 4 `cong5-bo-ve-thua` (930390, 960810,
961000, 961380 — vô hại). Người soát xác nhận 4 vế bỏ là sai thật, làm đổi mã (930390 "và các loại khác", "trừ cỡ 23 mm và 26,5 mm";
930630 "hoặc dụng cụ tương tự"; 930690 "và bộ phận của chúng"), 1 vế đi kèm vế sai (930390 "được thiết kế chỉ"), 2 vế bỏ chấp nhận được
(940210, 940290). Ngược lại 4 lỗi phạm vi (961000, 961400, 950699, 961900) cổng 5 **không** báo.

## Kiểm sau lô

- 44/44 `--duyet` + `--ap-dung` thoát 0 (không PN6 nào bị `can-bang-hieu-chinh-tien-le` hay `cong3-mat-nguong-so`); 12/12 `--tra-ve` thoát 0.
- `node scripts/check-so-tay.mjs` EXIT=0 — 1228 nhóm, 25989 mục, 0 mục không kiểm được nguồn.
- `node scripts/check-cay.mjs` EXIT=0 — 0 lỗi lệch cây.
- `node scripts/test-so-tay.mjs` EXIT=0 — 65/65 passed.
- Không chạy `bo-kiem-luat --toan-bieu` (BỔ SUNG 11/11 mục 4 — tech lead đo tập trung). Không phải hoàn tác PN6 nào.
