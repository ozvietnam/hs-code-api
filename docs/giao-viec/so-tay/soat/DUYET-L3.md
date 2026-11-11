# Soát ranh giới 6→8 số — lô L3 (#1109)

- Người soát: `claude-agent:duyet-L3-20261111#soat-L3` (phiên soát độc lập, L1-4c), ngày 11/11/2026.
- Phạm vi: 65 PN6 chương 04–07 (sữa, trứng, sản phẩm động vật, cây sống, rau). Không đọc `data/bench/*`, `data/oz-export/*`.
- Cách làm mỗi PN6: `--kiem` (cả 65 đều XANH, không DỪNG) → `--ve` (chữ biểu VI + EN từng dòng/tiêu đề) → đặt từng điều
  kiện cạnh chữ biểu, hỏi ba câu §2 (hẹp hơn / rộng hơn / máy tách sai) → đọc mọi cảnh báo (`so-chu-tu-do`,
  `cong3-bien-khong-doc-duoc` đã đối chiếu biên tay, `cong5-bo-ve` 060290) → đối chiếu nghĩa khoá trong `tu-vung@2` →
  tra tiền lệ `data/precedents.json` theo mã.
- Sau lô: `check-so-tay` xanh (0 mục không kiểm được nguồn), `check-cay` xanh (0 lỗi lệch cây), `test-so-tay` 65/65.

## Tổng kết

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 54 |
| TRA_VE | 11 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

- Tỉ lệ sai theo PN6: 11/65 = **16,9 %**.
- Theo dòng 8 số: 34/174 dòng nằm trong PN6 bị trả về; số dòng mang điều kiện sai trực tiếp ≈ 20 (040140 ×2, 040410 ×4,
  040719 ×4, 040729 ×1, 040790 ×2, 050510 ×1, 050590 ×1, 050800 ×1, 060210 ×2, 070960 ×1, 071190 ×1).
- Theo phân nhóm/chương: ch.04 5/18; ch.05 3/6; ch.06 1/5; ch.07 2/36.
- Cổng 5 báo 1 vế miễn (`cong5-bo-ve:06029010:có rễ`) — người soát xác nhận lý do đúng (EN "Rooted" bổ nghĩa cả cuttings
  và slips, điều kiện `coRe` vẫn giữ). 0 báo oan trong lô. **Mọi lỗi tìm thấy đều nằm ngoài tầm cổng máy** (cổng không
  đọc nghĩa của khoá CONG_DUNG/TEN_LOAI và không xét danh từ đầu `DAU`).

## Lỗi theo loại

1. **Dùng sai khoá `dungCho` cho nghĩa "của (loài)"** — 5 PN6 (040719, 040729, 040790, 050800, 060210). `dungCho` trong
   tu-vung@2 là "dùng cho / lắp vào máy, xe, hàng hóa" (cách viết `dùng cho {giaTri}`, câu hỏi "Hàng dùng cho / lắp vào máy,
   xe nào?"). Chữ biểu "Của vịt, ngan" / "Of ducks", "Của cây phong lan" / "Of orchids", "Shells of molluscs…" là nguồn gốc
   loài. Hệ quả: lúc chạy hỏi sai câu và `viet-mo-ta` viết "trứng … dùng cho vịt, ngan" vào mô tả khai báo. Các bản DUYET
   cũ dùng `dungCho` cho "Của máy/bơm thuộc phân nhóm …" (bộ phận của máy) là đúng nghĩa — khác trường hợp này. Đề nghị
   Claude thêm khoá loài (vd `loaiDongVatThucVatNguon` LIET_KE) — `THIEU_KHOA_TU_VUNG`.
2. **Bỏ danh từ đầu / định ngữ phân biệt** — 040140 ("Sữa" — phân nhóm gồm cả kem), 070960 + 071190 ("Quả ớt (chillies)" —
   tiếng Việt "ớt" gồm ớt chuông). Cổng 5 xếp các chữ này vào `DAU`/`PHU` nên không kiểm.
3. **Khoá rộng hơn chữ** — 040410: "Dạng bột / In powder form" ghi `dangLong KHONG` trong khi `dangBot` có sẵn.
4. **Tách định ngữ thành hàng thay thế** — 050510, 050590: "Lông vũ của vịt, ngan" ⇒ `['Lông vũ của vịt', 'ngan']`.

## Máy tách sai (§2 — cho Claude sửa `lib/ho-so/tach-ve.js`)

| PN6:dòng | Chữ biểu | Máy tách | Đúng ra |
|---|---|---|---|
| 071190:07119040 | "Hành tây, đã được bảo quản bằng khí sunphurơ" | DAU "Hành tây, đã" + GIOI_HAN "được bảo quản" | DAU "Hành tây" + GIOI_HAN "đã được bảo quản bằng khí sunphurơ" — trợ từ "đã" bị dính vào danh từ đầu, cắt giữa "đã / được" |
| 071190:07119050 | "Hành tây, đã được bảo quản trừ loại …" | DAU "Hành tây, đã" | như trên |
| 071190:07119060 | "Loại khác, đã được bảo quản bằng khí sunphurơ" | CON_LAI "Loại khác" + DAU "đã" | "đã" không phải danh từ đầu |
| 071410:07141011 | "Lát đã được làm khô" | DAU "Lát đã" + GIOI_HAN "được làm khô" | DAU "Lát" + GIOI_HAN "đã được làm khô" |
| 071120…071159:.10 | "Đã bảo quản bằng khí sunphurơ" | DAU "Đã bảo quản" | cả câu là GIOI_HAN (không có danh từ đầu) — vô hại vì vế "bằng khí sunphurơ" vẫn phủ |
| 0402xx (6 dòng) | "Đóng gói với khối lượng tịnh từ 20 kg trở lên" | DAU "Đóng gói" | "Đóng gói" không phải danh từ đầu (EN "In containers of…") — vô hại |

Gợi ý chung: cổng 5 nên kiểm cả `DAU` khi dòng anh em cùng tầng có `DAU` khác nhau (vd 040140 "Sữa dạng lỏng" vs
"Loại khác" trong phân nhóm sữa **và kem**) — mọi lỗi nhóm 2 lọt qua đúng chỗ này.

## Tiền lệ (§3 — ghi cho L1-4b)

- `6104/TB-TCHQ` (2018): "Viên Sữa Enjoy Milk … đã pha thêm đường, đóng gói 12 gram/gói" ⇒ outcome **04022990**. Theo
  chữ biểu hiện hành, gói 12 g thuộc vế "khối lượng tịnh từ 2 kg trở xuống" (04022930, MFN 5 so với 2). Bản nháp 040229
  đúng chữ biểu nên vẫn DUYET; tiền lệ (biểu 2017) cần mục trong `data/ho-so/hieu-chinh-tien-le.json`. `--duyet` không
  chặn (`can-bang-hieu-chinh-tien-le` không báo).
- `2907/TB-TCHQ` ⇒ 04021091, `462/TB-TCHQ` ⇒ 04039090, `525/TB-TCHQ` ⇒ 04062090, `6411`/`1220/TB-TCHQ` (whey bột) — khớp
  bản nháp (hoặc khớp lý do trả về 040410).

## Lưu ý độc lập

Bốn bản được DUYET — 040320, 060290, 070190, 070959 — có `soanBoi.phien` mang cùng URL phiên claude.ai
(`session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-…`) với phiên điều phối lô soát này (người soát là subagent, nhãn
`#soat-L3` khác, máy không coi là tự duyệt). Cả bốn đã được đối chiếu đủ VI/EN như mọi bản khác, nhưng nếu CEO đòi
độc lập tuyệt đối ở cấp phiên claude.ai thì cần một lô khác soát lại bốn bản này. (071190 cùng nguồn đã bị trả về.)

## Bảng chi tiết

| PN6 | Kết luận | Số dòng 8 số | Ghi chú cụ thể |
|---|---|---|---|
| 040110 | DUYET | 2 | Đối chiếu VI/EN: .10 'Dạng lỏng/In liquid form' ⇒ dangLong CO, .90 Loại khác phần còn lại; không vế giới hạn bị bỏ. |
| 040120 | DUYET | 2 | Đối chiếu VI/EN: .10 'Dạng lỏng/In liquid form' ⇒ dangLong CO, .90 Loại khác phần còn lại; không vế giới hạn bị bỏ. |
| 040140 | TRA_VE | 3 | (A) 040140:04014010 SUY RỘNG: chữ biểu 'Sữa dạng lỏng' / 'Milk in liquid form' (và .20 'Sữa dạng đông lạnh' / 'Milk in frozen form') — bản nháp chỉ giữ dangLong CO, bỏ danh từ đầu 'Sữa' trong khi phân nhóm 0401.40 gồm cả sữa và KEM; kem dạng lỏng (béo 6-10%) sẽ rơi vào 04014010 thay vì 04014090 Loại khác (cùng MFN 15% nhưng sai mã). Cần khoá phân biệt sữa/kem (THIEU_KHOA_TU_VUNG) hoặc DỪNG. |
| 040150 | DUYET | 2 | Đối chiếu VI/EN: .10 'Dạng lỏng/In liquid form' ⇒ dangLong CO, .90 Loại khác phần còn lại; không vế giới hạn bị bỏ. |
| 040210 | DUYET | 6 | Đối chiếu VI/EN: tiêu đề 0402104 'Not containing added sugar or other sweetening matter' ⇒ daPhaThemDuongHoacRuou KHONG; biên tay: 'từ 20 kg trở lên/20 kg or more' = >=20, 'từ 2 kg trở xuống/2 kg or less' = <=2 (khối lượng tịnh bao bì); .49/.99 phần còn lại. |
| 040221 | DUYET | 3 | Đối chiếu VI/EN: 'In containers of a net weight of 20 kg or more' = >=20 kg, '2 kg or less' = <=2 kg (biên đối chiếu tay); .90 phần còn lại. |
| 040229 | DUYET | 3 | Đối chiếu VI/EN: 'In containers of a net weight of 20 kg or more' = >=20 kg, '2 kg or less' = <=2 kg (biên đối chiếu tay); .90 phần còn lại. |
| 040320 | DUYET | 4 | Đối chiếu VI/EN: tiêu đề 0403201 'In liquid form, whether or not condensed' ⇒ dangLong CO ('đã hoặc chưa cô đặc' không giới hạn); .11/.91 'Flavoured or containing added fruits..., nuts or cocoa' khoá đúng tên; .19/.99 phần còn lại. |
| 040390 | DUYET | 2 | Đối chiếu VI/EN: .10 'Buttermilk' tenLoai nguyên văn; .90 phần còn lại. |
| 040410 | TRA_VE | 4 | (A) 040410:0404101 SUY RỘNG: tiêu đề 'Dạng bột' / 'In powder form' được ghi dangLong KHONG — mọi whey không lỏng (dạng nhão, khối, đông lạnh, hạt) sẽ vào 04041011/04041019 thay vì nhánh 0404109 Loại khác (04041091/04041099). Tu-vung@2 đã có khoá dangBot CO_KHONG đúng chữ biểu. |
| 040590 | DUYET | 4 | Đối chiếu VI/EN: .10 Anhydrous butterfat, .20 Butteroil, .30 Ghee — tenLoai đúng tên nguyên văn từng dòng, ba tên không chứa nhau; .90 phần còn lại (Ghee MFN 15 khác các dòng 5). |
| 040610 | DUYET | 2 | Đối chiếu VI/EN: .10 'Fresh (unripened or uncured) cheese, including whey cheese' tenLoai 'Pho mát tươi' (vế 'kể cả pho mát whey' là bao gồm, không giới hạn; lúc chạy TEN_LOAI không tự chốt), .20 'Curd'; phân nhóm chỉ hai dòng, không Loại khác. |
| 040620 | DUYET | 2 | Đối chiếu VI/EN: .10 'In packages of a gross weight exceeding 20 kg' / 'trọng lượng cả bì trên 20 kg' = khoiLuong > 20 (biên nghiêm, đối chiếu tay); .90 phần còn lại. |
| 040711 | DUYET | 2 | Đối chiếu VI/EN: .10 'For breeding / Để nhân giống' ⇒ dungLamGiong CO; .90 phần còn lại. |
| 040719 | TRA_VE | 4 | (A) 040719: dòng/tiêu đề 'Của vịt, ngan' / 'Of ducks' (và 040790 .10 'Của gà thuộc loài Gallus domesticus' / 'Of fowls of the species Gallus domesticus') ghi dungCho CONG_DUNG — khoá dungCho nghĩa là 'dùng cho / lắp vào máy, xe, hàng hóa'; 'của vịt' là loài gia cầm đẻ ra trứng, không phải công dụng. Lúc chạy máy hỏi sai câu ('Hàng dùng cho / lắp vào máy, xe nào?') và viet-mo-ta viết 'dùng cho vịt, ngan' vào mô tả khai báo — sai nghĩa. Cần khoá loài gia cầm (THIEU_KHOA_TU_VUNG) hoặc DỪNG. |
| 040729 | TRA_VE | 2 | (A) 040729: dòng/tiêu đề 'Của vịt, ngan' / 'Of ducks' (và 040790 .10 'Của gà thuộc loài Gallus domesticus' / 'Of fowls of the species Gallus domesticus') ghi dungCho CONG_DUNG — khoá dungCho nghĩa là 'dùng cho / lắp vào máy, xe, hàng hóa'; 'của vịt' là loài gia cầm đẻ ra trứng, không phải công dụng. Lúc chạy máy hỏi sai câu ('Hàng dùng cho / lắp vào máy, xe nào?') và viet-mo-ta viết 'dùng cho vịt, ngan' vào mô tả khai báo — sai nghĩa. Cần khoá loài gia cầm (THIEU_KHOA_TU_VUNG) hoặc DỪNG. |
| 040790 | TRA_VE | 3 | (A) 040790: dòng/tiêu đề 'Của vịt, ngan' / 'Of ducks' (và 040790 .10 'Của gà thuộc loài Gallus domesticus' / 'Of fowls of the species Gallus domesticus') ghi dungCho CONG_DUNG — khoá dungCho nghĩa là 'dùng cho / lắp vào máy, xe, hàng hóa'; 'của vịt' là loài gia cầm đẻ ra trứng, không phải công dụng. Lúc chạy máy hỏi sai câu ('Hàng dùng cho / lắp vào máy, xe nào?') và viet-mo-ta viết 'dùng cho vịt, ngan' vào mô tả khai báo — sai nghĩa. Cần khoá loài gia cầm (THIEU_KHOA_TU_VUNG) hoặc DỪNG. |
| 041090 | DUYET | 3 | Đối chiếu VI/EN: .10 "Birds' nests / Tổ yến", .20 "Turtles' eggs / Trứng rùa" — tenLoai nguyên văn, không chứa nhau; .90 phần còn lại. |
| 050510 | TRA_VE | 2 | (A) 050510:05051010 SUY RỘNG / tách sai: chữ biểu 'Lông vũ của vịt, ngan' / 'Duck feathers' bị ghi tenLoai ['Lông vũ của vịt', 'ngan'] — dấu phẩy trong định ngữ 'của vịt, ngan' bị cắt thành hai hàng thay thế, 'ngan' đứng một mình không phải tên hàng: lông tơ (down) ngan hay mọi hàng nhắc 'ngan' sẽ khớp 05051010 thay vì 05051090 Loại khác (EN chỉ 'feathers', không gồm down). Giá trị đúng phải là một tên 'Lông vũ của vịt, ngan' hoặc ['Lông vũ của vịt','Lông vũ của ngan']. |
| 050590 | TRA_VE | 2 | (A) 050590:05059010 SUY RỘNG / tách sai: chữ biểu 'Lông vũ của vịt, ngan' / 'Duck feathers' bị ghi tenLoai ['Lông vũ của vịt', 'ngan'] — dấu phẩy trong định ngữ 'của vịt, ngan' bị cắt thành hai hàng thay thế, 'ngan' đứng một mình không phải tên hàng: lông tơ (down) ngan hay mọi hàng nhắc 'ngan' sẽ khớp 05059010 thay vì 05059090 Loại khác (EN chỉ 'feathers', không gồm down). Giá trị đúng phải là một tên 'Lông vũ của vịt, ngan' hoặc ['Lông vũ của vịt','Lông vũ của ngan']. |
| 050790 | DUYET | 2 | Đối chiếu VI/EN: .20 'Tortoise-shell / Mai động vật họ rùa' tenLoai nguyên văn; .90 phần còn lại (MFN 3 vs 5). |
| 050800 | TRA_VE | 2 | (A) 050800:05080020 SUY RỘNG + sai khoá: chữ biểu 'Mai, vỏ động vật thân mềm, động vật giáp xác hoặc động vật da gai' / 'Shells of molluscs, crustaceans or echinoderms' bị tách thành tenLoai ['Mai','vỏ'] + dungCho ['động vật thân mềm',...] — dungCho nghĩa 'dùng cho/lắp vào', không phải 'của (loài)'; tenLoai 'Mai' trơ làm 'mai mực' (cuttle-bone, nhóm 05.08 nêu RIÊNG với shells) lấn vào 05080020 thay vì 05080090; mô tả khai báo sẽ viết 'dùng cho động vật thân mềm'. Cần một tenLoai nguyên văn 'Mai, vỏ động vật thân mềm...' hoặc khoá loài. |
| 051191 | DUYET | 4 | Đối chiếu VI/EN: .10 'Roes and milt / Sẹ và bọc trứng' (mảng hai hàng thay thế đúng), .20 'Artemia egg (Brine shrimp egg)' (MFN 0), .30 'Fish skin / Da cá'; tên không chứa nhau; .90 phần còn lại. |
| 051199 | DUYET | 4 | Đối chiếu VI/EN: .10 'Domestic animal semen', .20 'Silk worm eggs', .30 'Natural sponges' — tenLoai nguyên văn, không chứa nhau; .90 phần còn lại; cùng MFN 0. |
| 060120 | DUYET | 3 | Đối chiếu VI/EN: .10 'Chicory plants / Cây rau diếp xoăn', .20 'Chicory roots / Rễ rau diếp xoăn' — tenLoai nguyên văn, không chứa nhau; .90 phần còn lại. |
| 060210 | TRA_VE | 3 | (A) 060210:06021010/06021020 sai khoá: chữ biểu 'Của cây phong lan' / 'Of orchids' và 'Của cây cao su' / 'Of rubber trees' (cành giâm, cành ghép không rễ CỦA loài cây) bị ghi dungCho CONG_DUNG — khoá dungCho nghĩa 'dùng cho / lắp vào máy, xe, hàng hóa'; lúc chạy hỏi sai câu và mô tả khai báo viết 'dùng cho cây phong lan'. Cần tenLoai/khoá loài cây đúng nghĩa 'của' (THIEU_KHOA_TU_VUNG). |
| 060290 | DUYET | 6 | Đối chiếu VI/EN từng dòng; BO_VE 'có rễ' ở .10 đúng (EN 'Rooted orchid cuttings and slips': Rooted bổ nghĩa cả hai danh từ, điều kiện coRe CO vẫn giữ); .40 'Budded stumps' = Gốc cây cao su + coChoi; .50 dungLamGiong khớp định nghĩa SEN (hạt giống nảy mầm); .90 phần còn lại. |
| 060420 | DUYET | 2 | Đối chiếu VI/EN: .10 'Mosses and lichens / Rêu và địa y' ⇒ tenLoai ['Rêu','địa y'] (hai hàng thay thế, đúng); .90 phần còn lại. |
| 060490 | DUYET | 2 | Đối chiếu VI/EN: .10 'Mosses and lichens / Rêu và địa y' ⇒ tenLoai ['Rêu','địa y'] (hai hàng thay thế, đúng); .90 phần còn lại. |
| 070190 | DUYET | 2 | Đối chiếu VI/EN: .10 'Chipping potatoes / Loại thường dùng để làm khoai tây chiên' ⇒ thuongDung CO + congDung 'làm khoai tây chiên' (cả hai vế phủ); .90 phần còn lại. |
| 070310 | DUYET | 4 | Đối chiếu VI/EN: tiêu đề 0703101 'Onions/Hành tây', 0703102 'Shallots/Hành, hẹ' (theo chữ Việt, 'Hành tây' cụ thể hơn 'Hành' thắng); .11/.21 'Bulbs for propagation' ⇒ dungLamGiong CO; .19 (15%) / .29 (20%) phần còn lại. Lưu ý: chữ Việt 'hẹ' rộng hơn EN 'Shallots' — do biểu, không do bản nháp. |
| 070320 | DUYET | 2 | Đối chiếu VI/EN: .10 'Bulbs for propagation / Củ giống' ⇒ dungLamGiong CO (MFN 0 vs 20); .90 phần còn lại. |
| 070390 | DUYET | 2 | Đối chiếu VI/EN: .10 'Bulbs for propagation / Củ giống' ⇒ dungLamGiong CO (MFN 0 vs 20); .90 phần còn lại. |
| 070410 | DUYET | 3 | Đối chiếu VI/EN: .10 Cauliflowers 'Súp lơ', .20 'Headed broccoli / Đầu súp lơ xanh', .90 'Other broccoli / Súp lơ xanh khác' ⇒ tenLoai 'Súp lơ xanh' (không phanConLai, tên cụ thể hơn thắng — đúng: phân nhóm không có dòng Loại khác trần). |
| 070490 | DUYET | 4 | Đối chiếu VI/EN: .10 Round (drumhead) cabbages, .20 Chinese mustard, .30 'Other cabbages / Bắp cải khác' ⇒ 'Bắp cải' (tên cụ thể hơn 'Bắp cải cuộn' thắng), .90 phần còn lại. |
| 070610 | DUYET | 2 | Đối chiếu VI/EN: .10 Carrots 'Cà rốt' (17%), .20 Turnips 'Củ cải' (20%); phân nhóm chỉ hai dòng. |
| 070820 | DUYET | 3 | Đối chiếu VI/EN: .10 French beans 'Đậu Pháp', .20 Long beans 'Đậu dài', tên không chứa nhau; .90 phần còn lại. |
| 070959 | DUYET | 2 | Đối chiếu VI/EN: .20 'Truffles, other than Tuber spp. / Nấm cục trừ loại Tuber spp.' ⇒ tenLoai 'Nấm cục' + thuocChiTuber KHONG (vế trừ phủ); .90 phần còn lại (15 vs 20). |
| 070960 | TRA_VE | 2 | (A) 070960:07096010 SUY RỘNG: chữ biểu 'Quả ớt (chillies) (quả thuộc chi Capsicum)' / 'Chillies (fruits of genus Capsicum)' bị rút còn tenLoai 'Quả ớt' — trong tiếng Việt 'ớt' gồm cả ớt chuông/ớt ngọt (sweet peppers, cũng chi Capsicum) vốn thuộc 07096090 Loại khác; chữ Anh 'Chillies' mới là giới hạn. Ớt chuông sẽ khớp 07096010. Giá trị cần giữ phân biệt ớt cay (chillies) — vd 'Quả ớt (chillies)' / khoá ớt cay. |
| 070999 | DUYET | 3 | Đối chiếu VI/EN: .10 Sweet corn 'Ngô ngọt', .20 "Lady's finger (Okra) / Đậu bắp" — tenLoai nguyên văn, không chứa nhau; .90 phần còn lại. |
| 071120 | DUYET | 2 | Đối chiếu VI/EN: .10 'Preserved by sulphur dioxide gas / Đã bảo quản bằng khí sunphurơ' ⇒ phuongPhapBaoQuan TRONG [BAO_QUAN_BANG_KHI_SUNPHURO]; .90 phần còn lại. |
| 071140 | DUYET | 2 | Đối chiếu VI/EN: .10 'Preserved by sulphur dioxide gas / Đã bảo quản bằng khí sunphurơ' ⇒ phuongPhapBaoQuan TRONG [BAO_QUAN_BANG_KHI_SUNPHURO]; .90 phần còn lại. |
| 071151 | DUYET | 2 | Đối chiếu VI/EN: .10 'Preserved by sulphur dioxide gas / Đã bảo quản bằng khí sunphurơ' ⇒ phuongPhapBaoQuan TRONG [BAO_QUAN_BANG_KHI_SUNPHURO]; .90 phần còn lại. |
| 071159 | DUYET | 2 | Đối chiếu VI/EN: .10 'Preserved by sulphur dioxide gas / Đã bảo quản bằng khí sunphurơ' ⇒ phuongPhapBaoQuan TRONG [BAO_QUAN_BANG_KHI_SUNPHURO]; .90 phần còn lại. |
| 071190 | TRA_VE | 7 | (A) 071190:07119020 SUY RỘNG: chữ biểu 'Quả ớt (chillies) (quả thuộc chi Capsicum)' / 'Chillies (fruits of genus Capsicum)' bị rút còn tenLoai 'Quả ớt' — 'ớt' tiếng Việt gồm ớt chuông/ớt ngọt (sweet peppers) vốn rơi vào .60/.90; chữ Anh 'Chillies' là giới hạn. (B) ghi chú: dòng .40/.50/.60 dùng khoá baoQuanBangKhiSunphuro CO_KHONG trong khi 071120/071140/071151/071159 dùng phuongPhapBaoQuan TRONG [BAO_QUAN_BANG_KHI_SUNPHURO] — hai khoá cho cùng một vế, nên thống nhất khi sửa. |
| 071239 | DUYET | 2 | Đối chiếu VI/EN: .10 'Truffles / Nấm cục (truffles)' tenLoai 'Nấm cục'; .90 phần còn lại. |
| 071290 | DUYET | 3 | Đối chiếu VI/EN: .10 Garlic 'Tỏi', .20 Sweet corn 'Ngô ngọt' — tên không chứa nhau; .90 phần còn lại. |
| 071310 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO (cách đọc khoá có 'phù hợp để gieo trồng'); .90 phần còn lại (MFN 0 vs 15/20). |
| 071320 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO (cách đọc khoá có 'phù hợp để gieo trồng'); .90 phần còn lại (MFN 0 vs 15/20). |
| 071331 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO (cách đọc khoá có 'phù hợp để gieo trồng'); .90 phần còn lại (MFN 0 vs 15/20). |
| 071332 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO (cách đọc khoá có 'phù hợp để gieo trồng'); .90 phần còn lại (MFN 0 vs 15/20). |
| 071333 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO (cách đọc khoá có 'phù hợp để gieo trồng'); .90 phần còn lại (MFN 0 vs 15/20). |
| 071334 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO (cách đọc khoá có 'phù hợp để gieo trồng'); .90 phần còn lại (MFN 0 vs 15/20). |
| 071335 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO; .90 phần còn lại (MFN 0 vs 20). |
| 071339 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO; .90 phần còn lại (MFN 0 vs 20). |
| 071340 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO; .90 phần còn lại (MFN 0 vs 20). |
| 071350 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO; .90 phần còn lại (MFN 0 vs 20). |
| 071360 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO; .90 phần còn lại (MFN 0 vs 20). |
| 071390 | DUYET | 2 | Đối chiếu VI/EN: .10 'Suitable for sowing / Phù hợp để gieo trồng' ⇒ dungLamGiong CO; .90 phần còn lại (MFN 0 vs 20). |
| 071410 | DUYET | 4 | Đối chiếu VI/EN: tiêu đề 0714101 'Sliced or in the form of pellets' ⇒ tenLoai ['Thái lát','dạng viên'] (tu-vung@2 chưa có khoá dạng thái lát/viên — chữ tự do, lúc chạy không tự chốt); .11 'Dried chips / Lát đã được làm khô' ⇒ KHO_MUOI; .91 Frozen ⇒ DONG_LANH; .19/.99 phần còn lại; cùng MFN 3. |
| 071420 | DUYET | 2 | Đối chiếu VI/EN: .10 'Frozen / Đông lạnh' ⇒ phuongPhapBaoQuan TRONG [DONG_LANH]; .90 phần còn lại; cùng MFN 10. |
| 071430 | DUYET | 2 | Đối chiếu VI/EN: .10 'Frozen / Đông lạnh' ⇒ phuongPhapBaoQuan TRONG [DONG_LANH]; .90 phần còn lại; cùng MFN 10. |
| 071440 | DUYET | 2 | Đối chiếu VI/EN: .10 'Frozen / Đông lạnh' ⇒ phuongPhapBaoQuan TRONG [DONG_LANH]; .90 phần còn lại; cùng MFN 10. |
| 071450 | DUYET | 2 | Đối chiếu VI/EN: .10 'Frozen / Đông lạnh' ⇒ phuongPhapBaoQuan TRONG [DONG_LANH]; .90 phần còn lại; cùng MFN 10. |
| 071490 | DUYET | 4 | Đối chiếu VI/EN: tiêu đề 0714901 'Sago pith / Lõi cây cọ sago' tenLoai nguyên văn (0714909 Loại khác phần còn lại); .11/.91 Frozen ⇒ DONG_LANH; .19/.99 phần còn lại. |
