# Soát độc lập L1-4c — lô L18 (#1109)

- Người soát: `claude-agent:duyet-L18-20261111#soat-L18`. Không đọc `data/bench/*`, `data/oz-export/*`.
- Ngày: 11/11/2026. Lô: 62 PN6 (chương 62, nhóm 6201–6217).
- Trước khi soát: `git fetch origin main`. Cả 62 PN6 còn NHAP trên origin/main, không bản nào đã xử lý ở lô khác.
- Cách làm: với mỗi PN6 tôi chạy `--kiem` (cả 62 XANH, không DỪNG) và `--ve` (chữ biểu VI + EN từng mục), rồi đọc toàn bộ bản
  nháp: điều kiện nút, điều kiện dòng, `phanConLai`, `chongLanVanBan`, TUONG_TU và ghi chú. Từ vựng `loaiSoiDet` đối chiếu với
  `scripts/test-tu-vung-2.mjs` (bộ đọc), giá trị cha NHAN_TAO đối chiếu với `lib/dieu-kien-so.js`. Tiền lệ: tra
  `data/precedents.json` theo mọi mã 6201xxxx–6217xxxx, chỉ có một tiền lệ là 822/TCHQ-TXNK (immersion suit ⇒ 62114390). Nó
  khớp với bản nháp 621143, vì không dòng có tên nào nhận hàng này, nên không cần bảng hiệu chỉnh.
- Kiểm thêm theo tech lead: so với `data/so-tay/<nhóm>.json` hiện hành, chương 62 không có dòng `sen.*` nào mang ngưỡng số.
  Các dòng `sen.*` của 6211/6212 có `dieuKienSo` rỗng. Ngưỡng duy nhất là "≤ 86 cm" (trẻ em) của 620920, nằm ở cấp phân
  nhóm (`ch62.chuong`), bản nháp không thay. Vì vậy không bản nào bỏ mất ngưỡng số SEN.
- Lưu ý độc lập: 620799 do phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-620799` soạn. Đây chính là phiên cha đã giao lô này.
  Công cụ nhận vì định danh người soát khác, và tôi duyệt theo cách lô L6 đã làm, nhưng người đọc PR nên biết điều này.

## Kết quả

| | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | **59** |
| TRA_VE | **3** |
| Đỏ, không soát | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát | 0 |

Tỉ lệ sai theo PN6: 3/62 = **4,8 %**. Dòng 8 số bị ảnh hưởng: 62019021, 62019029 (qua tiêu đề 6201902); 62029020;
62129012, 62129092 (lỗi chính); 62129011, 62129091 (lỗi phụ). Tổng **7 dòng / 3 phân nhóm**. Tất cả cùng MFN 20 % với dòng
"Loại khác" bên cạnh, nên lỗi làm sai mã 8 số (khai báo, kiểm tra chuyên ngành, thống kê) nhưng không làm lệch thuế MFN.

Kết quả kiểm sau khi áp dụng (chạy tại cây nhánh này, mỗi lệnh `EXIT=0`): `check-so-tay` 1228 nhóm, 25966 mục, 0 mục không
kiểm được nguồn; `check-cay` 0 lỗi lệch cây; `test-so-tay` 65/65; `test-so-tay-gates` 91 passed, 0 failed;
`test-engine-loop-so-tay` 11 passed, 0 failed. Không phải gỡ bản nào. Trọn bộ `npm test` không chạy ở máy agent, số ca lấy
ở CI.

## Lỗi chính

1. **620190 tiêu đề 6201902 và 620290 .20: SUY RỘNG.** Chữ biểu "Từ ramie" / "Of ramie" được ghi thành `loaiSoiDet TRONG
   [SOI_THUC_VAT_KHAC]`. Giá trị này phủ mọi xơ thực vật khác: bộ đọc tự xếp "vải lanh" vào SOI_THUC_VAT_KHAC. Hệ quả là áo
   khoác vải lanh hoặc gai dầu của 6201.90/6202.90 rơi vào dòng ramie, thay vì "Loại khác". Từ vựng chưa có giá trị riêng
   cho ramie, nên bản nháp phải ghi `THIEU_KHOA_TU_VUNG` (DỪNG), không được ép sang SOI_THUC_VAT_KHAC.
   → **Việc cho Claude:** thêm giá trị `RAMIE` (hoặc tách SOI_THUC_VAT_KHAC) vào `loaiSoiDet`. Các PN6 "Từ ramie" khác trong
   chương 61/62 cần soát lại theo lỗi này.
2. **621290 .12/.92: SUY RỘNG.** Chữ biểu "Hàng may mặc hỗ trợ cho các môn điền kinh" / "Athletic supporters" được ghi thành
   tenLoai "Hàng may mặc" + dungCho "các môn điền kinh". Bản nháp bỏ mất danh từ đầu "hỗ trợ" (supporters). Hệ quả là mọi hàng
   6212.90 dùng cho điền kinh, ví dụ nịt tất, dây đeo quần, đai nịt tập luyện, đều vào .12/.92 thay vì .19/.99.
   Lỗi phụ ở .11/.91: dungCho "điều trị mô vết sẹo và ghép da" viết trong MỘT chuỗi. Bộ so chữ đòi đủ âm tiết của chuỗi, nên
   chuỗi này đọc thành VÀ. Chữ Anh "treatment of scar tissue and skin grafts" là hai đích thay thế, nên phải tách thành mảng
   HOẶC.

## Điểm đáng chú ý tôi đã chấp nhận (không phải lỗi)

- **621600 .10.** Chữ VI tách rõ ba tên: "Găng tay bảo hộ lao động, găng tay hở ngón và găng bao tay". Chữ EN "Protective work
  gloves, mittens and mitts" có thể đọc "Protective work" là định ngữ chung cho cả ba. Chữ VI không mơ hồ nên tôi theo VI. Nếu
  GĐ muốn đọc theo EN thì phải mở lại PN6 này.
- **621020/621030 .20/.30.** tenLoai "Quần áo" chỉ lặp danh từ đầu "Garments", không hẹp thêm, nhưng sinh thêm một câu hỏi chữ
  tự do lúc chạy. Bản 621040/621050 do người khác soạn bỏ khoá này. Hai cách đều không làm sai mã.
- **Ihram và sarong (6211.32–.49).** Điều kiện congDung "quấn quanh người" / "quấn xung quanh eo" lấy từ SEN, đúng luật ưu tiên
  SEN (LUAT-CHUNG mục 6).
- **TUONG_TU ở 620920/620930.** Giá trị đúng các tên nêu nguyên văn trước "và các loại tương tự". Cảnh báo `tuong-tu-chua-chot`
  là đúng thiết kế, và bản nháp không khai chồng lấn.

## Máy tách sai (§2, cho `lib/ho-so/tach-ve.js`)

- **6201–6202 .10 (cả 5 PN6 áo khoác).** "áo choàng **không tay**" và "áo khoác **không tay**" bị cắt thành vế GIỚI HẠN
  "không tay, áo khoác…". Thực ra "không tay" là một phần của tên hàng (EN "cloaks", "capes"). "áo khoác **bằng vải
  gabardines**" bị cắt thành GIỚI HẠN "bằng vải gabardines và áo khoác ghi lê có đệm", trong khi EN "gabardines" là tên hàng.
  Cổng 5 vẫn báo "phủ" nên kết quả không sai, nhưng vế bị cắt sai biên.
- **"Áo choàng không tay dùng để cầu nguyện"** (6211.42/.43/tiêu đề 6211493): "không tay" bị tách thành vế. EN "Prayer cloaks"
  cho thấy "áo choàng không tay" là một danh từ.
- **"Hàng may mặc, loại có tính đàn hồi bó chặt"**: DAU bị cắt thành "Hàng may mặc, loại", dính chữ "loại" vào danh từ đầu.
- **"Được in bằng phương pháp batik truyền thống"** (khoảng 35 dòng): bị tách thành hai vế "Được in" + "bằng phương pháp…".
  Cách tách này vô hại vì cả hai vế cùng do khoá BATIK phủ.

## Đo cổng 5

Máy báo 98 vế GIỚI HẠN/MỞ, cả 98 đều "phủ" (cộng từ dòng tổng của `--kiem`). Tôi đã đọc tất cả, không vế nào bị báo oan.
Phần lớn số vế đó (batik "Được in", "không tay", "bằng vải gabardines") là vế cắt sai biên đã nêu ở mục trên: chúng vẫn được phủ, nhưng không phải vế bổ nghĩa thật. Cổng 5 không bắt được hai lỗi trả
về ở trên. Lỗi ramie là lỗi chọn giá trị từ vựng. Lỗi 621290 là bỏ danh từ đầu (nằm trong vế DAU, cổng 5 không xét).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 620120 | DUYET | .10 mảng 14 tên áo khoác đúng nguyên văn VI + EN |
| 620190 | TRA_VE | Tiêu đề 6201902 "Từ ramie" ghi SOI_THUC_VAT_KHAC, phủ cả lanh/gai dầu (SUY RỘNG) |
| 620220 | DUYET | Như 620120 |
| 620230 | DUYET | Như 620120 |
| 620240 | DUYET | Như 620120 |
| 620290 | TRA_VE | .20 "Từ ramie" ghi SOI_THUC_VAT_KHAC (SUY RỘNG) |
| 620319 | DUYET | Tiêu đề BONG/TO_TAM; batik |
| 620322 | DUYET | batik |
| 620329 | DUYET | len, theo quy ước đã duyệt ở 551599 |
| 620332 | DUYET | batik |
| 620342 | DUYET | "Quần yếm có dây đeo" là một tên |
| 620349 | DUYET | tơ tằm |
| 620412 | DUYET | batik |
| 620419 | DUYET | Tiêu đề tơ tằm + batik |
| 620422 | DUYET | batik |
| 620429 | DUYET | tơ tằm |
| 620432 | DUYET | batik |
| 620439 | DUYET | Tiêu đề tơ tằm + batik |
| 620442 | DUYET | batik |
| 620449 | DUYET | batik |
| 620452 | DUYET | batik |
| 620459 | DUYET | batik |
| 620530 | DUYET | Barong Tagalog CO |
| 620590 | DUYET | len / batik / Barong; chongLanVanBan .91↔.92 đúng (áo Barong in batik thoả cả hai) |
| 620610 | DUYET | batik |
| 620630 | DUYET | batik |
| 620721 | DUYET | batik |
| 620729 | DUYET | tơ tằm |
| 620799 | DUYET | "Of man-made fibres" ghi NHAN_TAO (giá trị cha ⊃ tổng hợp, tái tạo). Bản do phiên cha soạn |
| 620821 | DUYET | batik |
| 620829 | DUYET | batik |
| 620891 | DUYET | batik |
| 620892 | DUYET | batik |
| 620899 | DUYET | len |
| 620920 | DUYET | TUONG_TU đúng tên nêu; ngưỡng ≤ 86 cm ở cấp phân nhóm vẫn giữ |
| 620930 | DUYET | TUONG_TU đúng tên nêu; "Phụ kiện may mặc" |
| 621010 | DUYET | Tiêu đề "Protective work garments" ghi tên + CONG_NGHIEP |
| 621020 | DUYET | .40 "bảo hộ khác" có phanConLai |
| 621030 | DUYET | .40 "bảo hộ khác" có phanConLai |
| 621040 | DUYET | chống cháy / chống hoá chất, phóng xạ |
| 621050 | DUYET | chống cháy / chống hoá chất, phóng xạ |
| 621132 | DUYET | fencing/wrestling ghi HOẶC; Ihram theo SEN |
| 621133 | DUYET | Như 621132, thêm chống cháy / hoá chất |
| 621139 | DUYET | Như 621133 |
| 621142 | DUYET | prayer cloak; sarong theo SEN |
| 621143 | DUYET | 7 dòng có tên; tiền lệ immersion suit ⇒ .90 khớp |
| 621149 | DUYET | Tiêu đề prayer cloak; .60 "Loại khác, từ lông cừu" |
| 621210 | DUYET | Mastectomy bra CO; tiêu đề "vật liệu dệt khác" có phanConLai |
| 621220 | DUYET | bông / phanConLai |
| 621230 | DUYET | bông / phanConLai |
| 621290 | TRA_VE | .12/.92 bỏ danh từ đầu "hỗ trợ" (Athletic supporters), SUY RỘNG; .11/.91 "sẹo và ghép da" một chuỗi đọc thành VÀ |
| 621320 | DUYET | batik |
| 621390 | DUYET | Tiêu đề "tơ tằm hoặc phế liệu tơ tằm" ghi TO_TAM; batik |
| 621410 | DUYET | batik |
| 621430 | DUYET | batik |
| 621440 | DUYET | batik |
| 621490 | DUYET | batik |
| 621510 | DUYET | batik |
| 621520 | DUYET | batik |
| 621590 | DUYET | batik |
| 621600 | DUYET | Theo chữ VI ba tên; ghi chú về định ngữ chung trong EN |
| 621710 | DUYET | Đai Ju đô |
