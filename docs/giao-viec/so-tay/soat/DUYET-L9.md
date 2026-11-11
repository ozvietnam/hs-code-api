# Soát độc lập ranh giới 6→8 số — lô L9 (#1109)

- Phiên soát: `claude-agent:duyet-L9-20261111#soat-L9` (khác mọi phiên soạn: `zcode-sub:glm-5.3:…`, `mm:minimax-m3:…`,
  `https://claude.ai/code/session_…#soan-…`).
- Ngày: 11/11/2026. Bảng: [`SOAT-RANH-GIOI.md`](../SOAT-RANH-GIOI.md) mục 0–5.
- Cách làm mỗi PN6: `--kiem` (mã thoát 0, không DỪNG) → `--ve` (chữ biểu VI + EN từng mục) → đặt từng điều kiện của bản nháp
  cạnh chữ biểu, hỏi ba câu mục 2 (hẹp hơn / rộng hơn / máy tách sai) → đọc mọi cảnh báo (`cong5-bo-ve`, `chongLanVanBan`,
  `can-bang-hieu-chinh-tien-le-da-co`) → tra `data/ho-so/hieu-chinh-tien-le.json` (4 PN6 có mục: 291590, 292219, 300420, 300490).
  Với các nghi vấn về hệ quả, đã chạy thử `lib/dieu-kien-so.js#danhGiaTuChu` trên mô tả hàng có thật để xác nhận THOẢ/TRÁI
  (kết quả ghi trong lý do trả về).
- Không đọc `data/bench/*`, `data/oz-export/*`.

## Tổng hợp

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 54 |
| TRA_VE | 11 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |
| **Tổng** | **65** |

Tỉ lệ sai theo PN6: **11/65 = 16,9 %**. Theo người soạn: `zcode-sub:glm-5.3` 2/43 (290129, 292320) · `mm:minimax-m3` 6/14
(300420, 300449, 300460, 300490, 300630, 300640) · phiên Claude `#soan-` 3/8 (291590, 300410, 310510). Theo chương: 29 — 3/47,
30 — 7/13, 31 — 1/5. Chương 30 (dược phẩm) là chỗ dồn lỗi, phần lớn do cùng một thói quen "vế dẫn xuất/muối không có khoá ⇒ bỏ,
ghi *hẹp hơn chữ một bước*" — đúng loại bảng soát mục 1 bảo phải DỪNG / dùng quy ước đã đúc.

Dòng 8 số / tiêu đề bị ảnh hưởng trực tiếp: 290129 .20; 291590 .20 .30 .40; 292320 .11; 300410 .20; 300420 .10 .71 .91 +
tiêu đề 3004203, 3004207; 300449 tiêu đề 3004491 (→ .11 .19), .80; 300460 .10; 300490 tiêu đề 3004905 (→ .51 .53 .54 .55 .59),
tiêu đề 3004908 (→ .81 .82 .89); 300630 .30; 300640 .10; 310510 .20.

Cổng 5: 65 PN6 có 58 vế GIỚI HẠN/MỞ — 56 báo "phủ" + 2 BO_VE (291739 "của loại" — người soát xác nhận đúng; 300490 "và các loại dược
phẩm khác" — người soát xác nhận SAI). Báo "phủ" oan (máy coi phủ chỉ vì giá trị là chuỗi con của vế, nhưng vế giới hạn bị bỏ):
300460 .10 ("kết hợp với các thành phần có hoạt tính dược khác"), 300410 .20 / 300420 3004203, 3004207, .10 / 300449 3004491
("hoặc các dẫn xuất của chúng") — 6/56 vế báo phủ mà thực ra bị bỏ (≈ 11 % báo phủ oan).

## Lỗi quan trọng nhất

1. **Giá trị liệt kê gộp "hoặc" bị TRÁI tất định** — 300420 .10/.71/.91 `dangBaoCheThuoc TRONG ['UONG_HOAC_MO']` (chữ "dạng uống
   (*) hoặc dạng mỡ"); 310510 .20 `soNguyenToCauThanhPhanBon TRONG ['HAI_HOAC_BA']` (chữ "hai hoặc ba trong số các nguyên tố").
   Từ vựng có giá trị con riêng (DANG_UONG/DANG_MO; BA/HAI_PHOSPHO_KALI) nhưng không có `giaTriCha`, nên hàng đọc được giá trị con
   bị TRÁI **tất định** và dồn về "Loại khác". Đây là lỗi duy nhất trong lô đổi mã cả khi chạy tự chốt.
2. **300490 tiêu đề 3004905** — EN "Analgesics, antipyretics and other medicaments for the treatment of coughs or colds": định
   ngữ "for … coughs or colds" chỉ của "other medicaments"; bản nháp gắn cho cả "thuốc giảm đau, hạ sốt" (VÀ) và BO_VE vế mở
   ⇒ viên paracetamol/aspirin/diclofenac uống không tới .51/.53/.54; trái mục bảng 300490-01 (45618/TB-CHQ ⇒ .59).
3. **Bỏ vế "muối/este/dẫn xuất của chúng"** — 291590 .20/.30/.40 (trái 1090/TB-TCHQ: n-butyl laurat ⇒ 2915.90.20), 300420
   3004207 (trái 2719/TB-TCHQ: thuốc chứa florfenicol uống ⇒ 3004.20.71), 300449 3004491 (codein), 300410 .20
   (dihydrostreptomycin). Quy ước HOAC [[tên],[tenLoai muối/dẫn xuất + dungCho tên]] đã có và được chính các bản cùng lô dùng
   đúng (291570, 291639, 292219, 292250, 293790, 293911, 293920, 294110).
4. **300460 .10 SUY RỘNG** — "Chứa artemisinin kết hợp với các thành phần có hoạt tính dược khác" chỉ còn tenLoai "artemisinin".
5. **Giá trị chữ chết** (giữ "khác"/cả câu/đại từ): 300640 .10 "Xi măng hàn răng và các chất hàn răng khác" (một chuỗi — không
   hàng nào thoả), 300630 .30 "chất thử chẩn đoán vi sinh khác", 300490 3004908 "thuốc khác điều trị ung thư", 290129 .20 "các
   đồng phân của nó" (chạy thử cho CHUA_BIET chứ không TRÁI — lỗi là thiếu nhánh đồng phân theo quy ước HOAC, hệ quả: không tự
   nhận đồng phân hexen gọi tên riêng). 300449 .80 "bisulphate" đứng một mình SUY RỘNG (khớp clopidogrel bisulphate).

## Máy tách sai (§2) — cho Claude chỉnh `lib/ho-so/tach-ve.js` / cổng 5

- 293149 "N-(phosphonomethyl) glycine": ngoặc là MỘT PHẦN tên hoá học, máy nhận là ngoặc PHU (tên gọi khác). Vô hại ở bản này
  vì giá trị giữ đủ tên, nhưng bản khác có thể bỏ mất phần ngoặc. Nên: ngoặc dính liền chữ trước (không dấu cách, "N-(") không
  phải PHU.
- Cổng 5 coi vế GIỚI HẠN "Chứa X hoặc các dẫn xuất của chúng" / "Chứa X kết hợp với …" là **phủ** khi chỉ có tenLoai "X" (chuỗi
  con của vế). Cần tách "hoặc (các) dẫn xuất/muối của chúng" thành vế MỞ và "kết hợp với …" thành GIỚI HẠN riêng (6 vế báo oan
  ở 300410, 300420, 300449, 300460).
- 300449 .80 "Chứa quinine sulphate hoặc bisulphate": máy để nguyên một vế GIỚI HẠN; không phát hiện "quinine" là định ngữ chung
  (danh từ đầu bị lược ở "bisulphate").
- 291739 "của loại được sử dụng như chất hóa dẻo" (EN "of a kind used as"): máy tách "của loại" thành vế riêng buộc người soạn
  BO_VE — nên coi "của loại / loại" trước "dùng/được sử dụng" là chữ nối.

## Ghi cho Claude (không phải lỗi người soạn — từ vựng / bộ so chữ)

- Thêm `giaTriCha`: `UONG_HOAC_MO ⊃ [DANG_UONG, DANG_MO]`, `HAI_HOAC_BA ⊃ [BA, HAI_PHOSPHO_KALI]` (khi có, bản 300420/310510 viết
  giá trị gộp cũng đúng). Thiếu giá trị "chứa hai nguyên tố nitơ và phospho" (DAP/MAP).
- `nguonGocSinhVat` chưa có giá trị "Từ thực vật" (292320 .11 "Of vegetables") — CHI_TU_THUC_VAT là "solely vegetable origin".
- Bộ so âm tiết: số nhiều tiếng Anh ("Lecithins" ≠ "lecithin", "Dithiocarbonates"), biến thể chính tả ("amoxycillin" ≠
  "amoxicillin", "sulphamethoxazole" ≠ "sulfamethoxazole", chữ biểu sai chính tả "tetracylin"), và tên đồng nghĩa trong ngoặc bị
  bỏ theo quy ước PHU ("paracetamol" ở 292429 .30, "MDI" ở 292910 .10, "clorua metyl" ở 290311) đều làm TEN_LOAI hụt hàng có
  thật. Đề xuất: quy ước đưa tên ngoặc đồng nghĩa vào mảng tenLoai; chuẩn hoá ph/f, y/i, đuôi -s khi so.
- Chữ "khác" không nằm trong `HU_TU` của `soChu` ⇒ giá trị có "khác" thành chết; nên để cổng 3 chặn giá trị TEN_LOAI/CONG_DUNG có
  "khác" (300630, 300640, 300490, 300692).

## Bảng chi tiết

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 290129 | TRA_VE | (A) 290129:29012920 THU HẸP: chữ biểu 'Hexen và các đồng phân của nó' / EN 'Hexene and isomers thereof' — giá trị tenLoai thứ hai 'các đồng phân của nó' mất đích (đại từ 'nó' không bao giờ có trong mô tả hàng ⇒ giá trị chết), nên đồng phân của hexen gọi theo tên riêng (vd 2-metyl-1-penten, 4-metyl-1-penten) không vào .20 mà rơi về .90 'Loại khác'. Làm theo quy ước đã dùng ở 291570/291639 (vế '... của nó'): HOAC [[tenLoai 'Hexen'], [tenLoai 'đồng phân' + dungCho 'Hexen']]. Phụ: ghiChuSoan trích EN sai ('Hexene and its isomers' — biểu ghi 'isomers thereof'). |
| 290290 | DUYET | .20 Other alkylbenzenes = phần còn lại có tên (phanConLai + tên), đúng phạm vi |
| 290311 | DUYET | Đối chiếu VI+EN 'Clorometan (clorua metyl)/Chloromethane (methyl chloride)': tên chính đúng; ngoặc là tên gọi khác (PHU), không giới hạn phạm vi; .90 trần. |
| 290319 | DUYET | Đối chiếu VI+EN '1,1,1-Tricloroetan (metyl cloroform)': tên chính đúng, ngoặc là đồng nghĩa (PHU); .90 trần. |
| 290420 | DUYET | Đối chiếu VI+EN 'Trinitrotoluen/Trinitrotoluene' một tên, .90 trần — đúng. |
| 290729 | DUYET | Đối chiếu VI+EN 'Rượu-phenol/Phenol-alcohols' một tên, .90 trần — đúng. |
| 291249 | DUYET | Đối chiếu VI+EN '.10 Aldehyt - rượu khác/Other aldehyde-alcohols': 'khác' so với 2912.41/.42 ngoài PN6 nên phanConLai false đúng; .90 giữ aldehyt-ete/-phenol. |
| 291429 | DUYET | Đối chiếu VI+EN 'Long não/Camphor' một tên, .90 trần — đúng. |
| 291529 | DUYET | Đối chiếu VI+EN 'Natri axetat; các coban axetat / Sodium acetate; cobalt acetates': hai tên nối ';' ⇒ mảng hoặc, đủ cả hai, không vế giới hạn. |
| 291539 | DUYET | Đối chiếu VI+EN .10 Isobutyl axetat, .20 2-Ethoxyetyl axetat, .90 trần — tên nguyên văn, đúng. |
| 291570 | DUYET | Đối chiếu VI+EN: .10 'Axit palmitic, muối và este của nó / its salts and esters' ⇒ HOAC (axit / muối·este + dungCho axit palmitic) phủ vế mở; .20 Axit stearic; .30 'Muối và este của axit stearic' ⇒ tên + dungCho — đúng, không có .90. |
| 291590 | TRA_VE | (A) 291590:29159020 THU HẸP: chữ biểu 'Axit lauric, axit myristic, muối và este của chúng' / EN 'Lauric acid, myristic acid, their salts and esters' — điều kiện chỉ tenLoai [Axit lauric, axit myristic], bỏ vế 'muối và este của chúng' ⇒ muối/este (natri laurat, isopropyl myristat, n-butyl laurat) rơi về .90; tiền lệ 1090/TB-TCHQ (n-Butyl Laurate ⇒ 2915.90.20, mục bảng 291590-01) bị chính bản nháp làm trái. ghiChuSoan 'không tách thành tên riêng' là sai. (B) 29159030 'Axit caprylic, muối và este của nó' và (C) 29159040 'Axit capric, muối và este của nó' THU HẸP cùng kiểu (muối/este caprylat, caprat ⇒ .90). Sửa theo quy ước 291570: HOAC [[tenLoai axit…],[tenLoai ['muối','este'] + dungCho axit…]]. |
| 291614 | DUYET | Đối chiếu VI+EN 'Metyl metacrylat/Methyl methacrylate' một tên, .90 trần — đúng. |
| 291632 | DUYET | Đối chiếu VI+EN .10 Benzoyl peroxit, .20 Benzoyl clorua (PN6 chỉ hai chất, không .90) — đúng. |
| 291639 | DUYET | Đối chiếu VI+EN .10 '2,4-Dichlorophenyl acetic acid and its salts and esters' ⇒ HOAC axit / muối·este + dungCho axit (phủ vế của nó); .20 'Esters of phenylacetic acid' ⇒ Este + dungCho; .90 trần — đúng. |
| 291712 | DUYET | Đối chiếu VI+EN 'Dioctyl adipat/Dioctyl adipate', .90 trần — đúng. |
| 291734 | DUYET | Đối chiếu VI+EN 'Dibutyl orthophthalates', .90 trần — đúng. |
| 291739 | DUYET | Đối chiếu VI+EN .20 'Other phthalic compounds of a kind used as plasticisers and esters of phthalic anhydride' ⇒ HOAC (hợp chất phthalic + công dụng hóa dẻo / este anhydrit phthalic); BO_VE 'của loại' (= 'of a kind', chữ nối) không đổi mã; .10 TOTM, .90 trần — đúng. |
| 291815 | DUYET | Đối chiếu VI+EN 'Canxi citrat/Calcium citrate', .90 trần — đúng. |
| 291829 | DUYET | Đối chiếu VI+EN 'Este sulphonic alkyl của phenol / Alkyl sulphonic ester of phenol': tên + 'phenol' (VÀ) phủ vế 'của phenol'; .90 trần — đúng. |
| 292219 | DUYET | Đối chiếu VI+EN .10 'Ethambutol and its salts, esters and other derivatives' ⇒ HOAC (Ethambutol / muối·este·dẫn xuất + dungCho Ethambutol), 'khác' thuộc 'dẫn xuất khác' nên phanConLai false đúng; .20 tên + ngoặc đồng nghĩa; bảng 292219-01 KHONG_LECH khớp. |
| 292242 | DUYET | Đối chiếu VI+EN .10 Glutamic acid; .20 'Monosodium glutamate (MSG)' ⇒ Muối natri + axit glutamic; .90 'Other salts' ⇒ phanConLai + Muối (trong PN6 'axit glutamic và muối của nó') — đúng. |
| 292250 | DUYET | Đối chiếu VI+EN .10 'p-Aminosalicylic acid and its salts, esters and other derivatives' ⇒ HOAC (axit / muối·este·dẫn xuất + dungCho axit), phanConLai false đúng ('khác' thuộc dẫn xuất); .90 trần. |
| 292320 | TRA_VE | (A) 292320:29232011 SAI KHOÁ / THU HẸP: chữ biểu 'Từ thực vật' / EN 'Of vegetables' là NGUỒN GỐC của lecithin, không phải tên hàng; bản nháp ghi tenLoai TEN_LOAI 'thực vật' ⇒ so âm tiết đòi mô tả hàng chứa chữ 'thực vật': 'lecithin đậu nành', 'lecithin hướng dương' (lecithin thực vật thương mại phổ biến nhất) bị chấm TRÁI ở .11 và rơi về .19 'Loại khác'. Tu-vung@2 có khoá nguonGocSinhVat (TU_CA/TU_DONG_VAT/CHI_TU_THUC_VAT) nhưng chưa có giá trị khớp nguyên văn 'Từ thực vật' ⇒ đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG (xin giá trị TU_THUC_VAT), không lấy tên loại làm thế. (Ghi thêm cho Claude: tiêu đề 2923201 'Lecithins' so âm tiết với 'lecithin' số ít cũng lệch — lỗi bộ so chữ, không phải người soạn). |
| 292412 | DUYET | Đối chiếu VI+EN .10 'Fluoroacetamide (ISO) and phosphamidon (ISO)' ⇒ mảng hai tên, '(ISO)' là ký hiệu tên; .20 Monocrotophos (PN6 không có .90) — đúng. |
| 292419 | DUYET | Đối chiếu VI+EN 'Carisoprodol', .90 trần — đúng. |
| 292421 | DUYET | Đối chiếu VI+EN .10 '4-Ethoxyphenylurea (dulcin)' (ngoặc đồng nghĩa PHU), .20 'Diuron and monuron' ⇒ mảng hai chất, .90 trần — đúng. |
| 292429 | DUYET | Đối chiếu VI+EN .10 Aspartame; .20 hai carbamate nối ';' ⇒ mảng; .30 'Acetaminophen (paracetamol); salicylamide; ethoxybenzamide' ⇒ mảng 3 tên; .90 trần — phạm vi đúng. Lưu ý: tên đồng nghĩa 'paracetamol' (PHU) không vào mảng, bộ so âm tiết sẽ hụt mô tả 'Paracetamol' — đề xuất quy ước thêm tên ngoặc vào mảng. |
| 292700 | DUYET | Đối chiếu VI+EN 'Azodicarbonamide', .90 trần — đúng. |
| 292800 | DUYET | Đối chiếu VI+EN 'Linuron', .90 trần — đúng. |
| 292910 | DUYET | Đối chiếu VI+EN .10 'Diphenylmethane diisocyanate (MDI)' (viết tắt PHU), .20 Toluene diisocyanate, .90 trần — đúng; lưu ý viết tắt MDI không vào mảng tên. |
| 292990 | DUYET | Đối chiếu VI+EN .10 Sodium cyclamate; .20 'Other cyclamates' ⇒ phanConLai + xyclamat; .90 trần — đúng. |
| 293090 | DUYET | Đối chiếu VI+EN 'Dithiocarbonates', .90 trần — đúng. |
| 293110 | DUYET | Đối chiếu VI+EN .10 Tetramethyl lead, .20 Tetraethyl lead (PN6 2931.10 chỉ hai chất) — đúng. |
| 293149 | DUYET | Đối chiếu VI+EN .10 'N-(phosphonomethyl) glycine', .20 'Salts of N-(phosphonomethyl) glycine' ⇒ Muối + tên axit (VÀ), .90 trần — đúng. Máy tách nhận nhầm '(phosphonomethyl)' (một phần tên hoá học) là ngoặc PHU — không ảnh hưởng vì giá trị giữ đủ tên. |
| 293159 | DUYET | Đối chiếu VI+EN 'Ethephon', .90 trần — đúng. |
| 293190 | DUYET | Đối chiếu VI+EN: tiêu đề 2931904 'Organo-arsenic compounds' ⇒ hợp chất arsen (chữ 'hữu cơ' đã hàm trong nhóm 29.31); .41 'In liquid form' ⇒ dangLong CO, .49 trần; .50 Dimethyltin dichloride; .90 trần — đúng. |
| 293220 | DUYET | Đối chiếu VI+EN 'Coumarin (1,2-Benzopyrone), methylcoumarins and ethylcoumarins' ⇒ mảng 3 tên (ngoặc đồng nghĩa PHU), .90 trần — đúng. |
| 293339 | DUYET | Đối chiếu VI+EN .10 'Chlorpheniramine and isoniazid' ⇒ mảng hai chất, .30 'Paraquat salts' ⇒ Muối paraquat, .90 trần — đúng. |
| 293349 | DUYET | Đối chiếu VI+EN 'Dextromethorphan', .90 trần — đúng. |
| 293359 | DUYET | Đối chiếu VI+EN 'Diazinon', .90 trần — đúng. |
| 293399 | DUYET | Đối chiếu VI+EN 'Mebendazole and parbendazole' ⇒ mảng hai chất, .90 trần — đúng. |
| 293499 | DUYET | Đối chiếu VI+EN: .10 'Nucleic acids and their salts' ⇒ HOAC (axit nucleic / muối + dungCho); .20 mảng 3 tên ';'; .30, .40 một tên; .50 'Oxadiazon, with a purity of 94% or more' ⇒ tên + doTinhKhiet >= 94% (biên ≥ khớp 'or more'); .90 trần — đúng. |
| 293790 | DUYET | Đối chiếu VI+EN .10 'Of oxygen-function amino-compounds' ⇒ tên nguyên văn; .20 'Epinephrine; amino-acid derivatives' ⇒ HOAC (Epinephrine / dẫn xuất + amino-axit); .90 trần — đúng. |
| 293911 | DUYET | Đối chiếu VI+EN 'Concentrates of poppy straw and salts thereof' ⇒ HOAC (Cao thuốc phiện / muối + dungCho), .90 trần — đúng. |
| 293920 | DUYET | Đối chiếu VI+EN 'Quinine and its salts' ⇒ HOAC (Quinine / muối + dungCho Quinine), .90 trần — đúng. |
| 294110 | DUYET | Đối chiếu VI+EN: tiêu đề 2941101 'Amoxicillin and its salts' ⇒ HOAC (Amoxicillin / muối + dungCho); .11 'Non-sterile' ⇒ daTietTrung KHONG, .19 trần; .20 'Ampicillin and its salts' ⇒ HOAC; .90 trần — đúng. |
| 300212 | DUYET | Đối chiếu VI+EN 'Antisera; plasma protein solutions; haemoglobin powder' ⇒ mảng 3 tên, .90 trần — đúng. |
| 300241 | DUYET | Đối chiếu VI+EN .10 'Vắc xin uốn ván/Tetanus toxoid'; .20 'Pertussis, measles, meningitis or polio vaccines' ⇒ Vắc xin + mảng 4 bệnh (danh từ đầu chung, đúng chữ Anh); .90 trần — đúng. |
| 300310 | DUYET | Đối chiếu VI+EN 'Containing amoxicillin/ampicillin (INN) or its salts' ⇒ tenLoai tên hoạt chất; vế 'hoặc muối của nó' không có khoá riêng nhưng tên muối luôn chứa tên hoạt chất (amoxicillin natri/trihydrat) nên so âm tiết vẫn phủ — chấp nhận; .90 trần. |
| 300410 | TRA_VE | (A) 300410:30041020 THU HẸP: chữ biểu 'Chứa các streptomycin hoặc các dẫn xuất của chúng' / EN 'Containing streptomycins or derivatives thereof' — điều kiện chỉ tenLoai 'streptomycin', bỏ vế 'các dẫn xuất của chúng' (người soạn tự ghi 'không có khoá') ⇒ thuốc chứa dihydrostreptomycin (một âm tiết, không chứa 'streptomycin') không thoả dòng nào của PN6. Quy ước đã có (293790, 292219, 292250): HOAC [[tenLoai 'streptomycin'],[tenLoai 'dẫn xuất' + dungCho 'streptomycin']]. (B) Ghi cho Claude, không phải lỗi người soạn: .16 giá trị nguyên văn 'amoxycillin' không khớp cách viết phổ biến 'amoxicillin' khi so âm tiết (khoá chuaPenicillin đã đọc amox[iy]cillin) ⇒ thuốc 'Amoxicillin … dạng uống' bị TRÁI ở .16 và dồn về .19. Phần còn lại (tiêu đề chuaPenicillin, .15 PHAI_KHONG benzathin, chongLanVanBan .19/.20 penicillin+streptomycin là hàng có thật) đã đối chiếu, đúng. |
| 300420 | TRA_VE | (A) 300420:30042010, 30042071, 30042091 THU HẸP (tất định): chữ biểu 'dạng uống (*) hoặc dạng mỡ' / EN 'of a kind taken orally or in ointment form' được ghi dangBaoCheThuoc TRONG ['UONG_HOAC_MO'] — giá trị gộp này không có giaTriCha, nên hàng đọc được DANG_UONG ('dạng uống', 'viên uống') hoặc DANG_MO bị chấm TRÁI tất định (đã thử danhGiaTuChu: 'Thuốc thú y chứa gentamycin, dạng uống' ⇒ TRAI; với ['DANG_UONG','DANG_MO'] ⇒ THOA) ⇒ thuốc uống/mỡ rơi về .39/.79/.99 'Loại khác'. Phải ghi TRONG ['DANG_UONG','DANG_MO'] (danh sách = hoặc). (B) tiêu đề 3004207 THU HẸP: 'Chứa tetracylin hoặc chloramphenicol hoặc các dẫn xuất của chúng' / EN 'tetracyclines or chloramphenicols or derivatives thereof' — bỏ vế 'các dẫn xuất của chúng' (florfenicol, thiamphenicol, doxycyclin, oxytetracyclin không chứa âm tiết 'tetracylin'/'chloramphenicol') ⇒ làm trái mục bảng 300420-01 (2719/TB-TCHQ: thuốc chứa florfenicol dạng uống ⇒ 3004.20.71). Cùng kiểu ở tiêu đề 3004203 (dẫn xuất erythromycin) và .10 (dẫn xuất gentamycin/lincomycin/sulphamethoxazole). Dùng quy ước HOAC [[tên],[tenLoai 'dẫn xuất' + dungCho tên]] như 293790/292219. (Ghi cho Claude: chữ biểu 'tetracylin' là lỗi chính tả của biểu — giá trị nguyên văn này không khớp mô tả 'tetracyclin'.) |
| 300432 | DUYET | Đối chiếu VI+EN .10 'Containing dexamethasone or their derivatives' ⇒ tenLoai dexamethasone (dẫn xuất thương mại — dexamethasone natri phosphat/acetat — đều chứa âm tiết 'dexamethasone' nên vế dẫn xuất vẫn phủ khi so âm tiết); .40 mảng 2 hoạt chất nguyên văn; .90 trần — chấp nhận. |
| 300449 | TRA_VE | (A) 300449:3004491 (tiêu đề) THU HẸP: 'Chứa morphine hoặc các dẫn xuất của nó' / EN 'Containing morphine or its derivatives' — chỉ tenLoai 'morphine', bỏ vế dẫn xuất (người soạn ghi 'không có khoá'); dẫn xuất morphin như codeine, pholcodine, ethylmorphine, diacetylmorphine không chứa âm tiết 'morphine' ⇒ thuốc ho chứa codein dạng uống không vào 30044911 mà rơi về .90. Dùng quy ước HOAC [[tenLoai 'morphine'],[tenLoai 'dẫn xuất' + dungCho 'morphine']] như 293790/292219. (B) 30044980 SUY RỘNG: nhánh 2 'Chứa quinine sulphate hoặc bisulphate, dạng uống' / EN 'containing quinine sulphate or bisulphate' — 'bisulphate' là quinine bisulphate (danh từ 'quinine' chung), nhưng giá trị tenLoai 'bisulphate' đứng một mình khớp MỌI muối bisulphate ⇒ viên uống 'clopidogrel bisulphate' thoả .80 (quinine). Phải gắn định ngữ chung: vd tenLoai ['quinine sulphate','bisulphate'] + tenLoai 'quinine' (VÀ), hoặc dungCho 'quinine'. |
| 300460 | TRA_VE | (A) 300460:30046010 SUY RỘNG: chữ biểu 'Chứa artemisinin kết hợp với các thành phần có hoạt tính dược khác' / EN 'Containing artemisinin combined with other pharmaceutical active ingredients' — điều kiện chỉ tenLoai 'artemisinin', bỏ vế giới hạn 'kết hợp với các thành phần có hoạt tính dược khác' (người soạn ghi nhầm là 'hẹp hơn một bước' — thực ra RỘNG hơn) ⇒ thuốc đơn chất artemisinin cũng thoả .10, lấn .90 'Loại khác'. Cổng 5 báo vế 'phủ' chỉ vì giá trị 'artemisinin' là chuỗi con của vế — máy báo đúng sai. Không có khoá 'kết hợp/đa thành phần' ⇒ đáng lẽ DỪNG / THIEU_KHOA_TU_VUNG. |
| 300490 | TRA_VE | (A) 300490:3004905 (tiêu đề) THU HẸP + bỏ vế mở: chữ biểu EN 'Analgesics, antipyretics and other medicaments for the treatment of coughs or colds, whether or not containing antihistamines' — 'for the treatment of coughs or colds' là định ngữ của 'other medicaments' (vế mở), không của 'Analgesics, antipyretics'. Bản nháp ghi tenLoai [Thuốc giảm đau, thuốc hạ sốt] VÀ congDung [điều trị ho, cảm lạnh] ⇒ (i) thuốc giảm đau/hạ sốt thường (viên paracetamol, aspirin, diclofenac uống) không qua tiêu đề nên không tới .51/.53/.54 mà rơi về .99; (ii) thuốc ho/cảm không phải giảm đau bị loại. BO_VE 'và các loại dược phẩm khác' sai (máy còn báo cong5-bo-ve-thua) và làm trái mục bảng 300490-01 (45618/TB-CHQ: dung dịch súc miệng kháng viêm Difflam ⇒ 3004.90.59 dưới tiêu đề này). Đúng: HOAC [[tenLoai ['Thuốc giảm đau','thuốc hạ sốt']],[congDung ['điều trị ho','cảm lạnh']]]. (B) tiêu đề 3004908 THU HẸP: 'Các thuốc khác điều trị ung thư, HIV/AIDS hoặc các bệnh khó chữa khác' — tenLoai 'thuốc khác điều trị ung thư' đòi mô tả hàng có đủ âm tiết 'khác…ung thư' ⇒ thuốc chống HIV/AIDS không qua tiêu đề, .82 không tới được; chỉ cần congDung mảng 3 giá trị. Các dòng còn lại (.10, .20, .30, 3004904/.41, .55, .64, .91–.96) đã đối chiếu, đúng. |
| 300610 | DUYET | Đối chiếu VI+EN 'Sterile absorbable surgical or dental yarn; sterile surgical or dental adhesion barriers, whether or not absorbable' ⇒ mảng 2 tên (giữ 'tự tiêu vô trùng'/'vô trùng') + dungCho [nha khoa, phẫu thuật] chung cho cả hai; 'có hoặc không tự tiêu' không giới hạn; .90 trần — đúng. |
| 300630 | TRA_VE | (A) 300630:30063030 THU HẸP: chữ biểu 'Các chất thử chẩn đoán vi sinh khác' / EN 'Other microbial diagnostic reagents' — giá trị tenLoai 'chất thử chẩn đoán vi sinh khác' giữ chữ 'khác' (bộ so âm tiết không bỏ 'khác') ⇒ mô tả hàng thật không bao giờ có chữ đó: đã thử danhGiaTuChu 'Chất thử chẩn đoán vi sinh phát hiện Salmonella' ⇒ TRÁI ⇒ thuốc thử chẩn đoán vi sinh (người) rơi về .90. 'khác' ở đây là phần còn lại so với .20 (thú y) ⇒ phanConLai true + tenLoai 'chất thử chẩn đoán vi sinh' (khuôn 290290/292990). |
| 300640 | TRA_VE | (A) 300640:30064010 THU HẸP: chữ biểu 'Xi măng hàn răng và các chất hàn răng khác' / EN 'Dental cements and other dental fillings' — giữ nguyên CẢ CÂU làm một giá trị tenLoai (có 'và', 'khác') ⇒ mô tả hàng phải chứa đủ 'xi măng…chất…khác': đã thử danhGiaTuChu 'Xi măng hàn răng glass ionomer' ⇒ TRÁI, 'Chất hàn răng composite' ⇒ TRÁI ⇒ không hàng nào thoả .10. Vế mở 'và các chất hàn răng khác' ⇒ mảng ['Xi măng hàn răng','chất hàn răng'] (tên nêu + đầu ngữ của vế mở, không chữ 'khác'). |
| 300692 | DUYET | Đối chiếu VI+EN 'Of medicaments for the treatment of cancer, HIV/AIDS or other intractable diseases' (phế thải dược phẩm) ⇒ congDung mảng 3 giá trị, .90 trần — phạm vi đúng. Lưu ý: giá trị thứ ba 'các bệnh khó chữa khác' giữ chữ 'khác' nên khó khớp khi so âm tiết (nên là 'bệnh khó chữa'); không đổi mã vì hai giá trị kia đủ nhận diện. |
| 310100 | DUYET | Đối chiếu VI+EN .10 'Of solely vegetable origin' ⇒ nguonGocSinhVat CHI_TU_THUC_VAT; .92 'Of animal origin (other than guano), chemically treated' ⇒ TU_DONG_VAT + PHAI_KHONG [phân chim, dơi] + daXuLyHoaHoc CO; .99 trần — đúng. |
| 310311 | DUYET | Đối chiếu VI+EN .10 'Loại dùng làm thức ăn chăn nuôi / Feed grade' ⇒ congDung thức ăn chăn nuôi; .90 trần — đúng. |
| 310319 | DUYET | Đối chiếu VI+EN .10 'Loại dùng làm thức ăn chăn nuôi / Feed grade' ⇒ congDung thức ăn chăn nuôi; .90 trần — đúng. |
| 310390 | DUYET | Đối chiếu VI+EN .10 'Calcined phosphatic fertilisers' ⇒ daNung CO (tên 'phân phosphat' đã là tên nhóm 31.03); .90 trần — đúng. |
| 310510 | TRA_VE | (A) 310510:31051020 THU HẸP (tất định): chữ biểu 'có chứa hai hoặc ba trong số các nguyên tố cấu thành phân bón là nitơ, phospho và kali' / EN 'containing two or three of the fertilising elements nitrogen, phosphorus and potassium' ghi soNguyenToCauThanhPhanBon TRONG ['HAI_HOAC_BA'] — khoá có giá trị riêng BA và HAI_PHOSPHO_KALI, không có giaTriCha, nên phân NPK đọc được BA bị TRÁI tất định (đã thử danhGiaTuChu 'Phân bón NPK chứa ba nguyên tố cấu thành phân bón, bao 25kg' ⇒ TRAI; 'chứa hai nguyên tố … phospho và kali' ⇒ TRAI) ⇒ phân hỗn hợp đóng gói ≤10 kg rơi về .90. Ghi TRONG ['HAI_HOAC_BA','BA','HAI_PHOSPHO_KALI'] (hoặc xin Claude thêm giaTriCha HAI_HOAC_BA ⊃ BA, HAI_PHOSPHO_KALI). Phần còn lại (.10 mảng 2 tên, chongLanVanBan .10/.20 supephosphat có thêm N/K là hàng có thật) đúng. |
