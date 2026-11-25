# M-17 — Ý kiến phân loại WCO (`data/luat-goc/wco.jsonl`)

Nguồn: `data/wco-op/opinions.json` (bản OCR tiếng Anh), `vi.json` (bản dịch không chính thức). Đối chiếu: PDF scan *WCO Compendium of Classification Opinions, HS 2022*, 706 trang, sha256 `5f47576553f963d0b79d97417a597d4ed0f7abcc5fbd6c8b6ccb889ff2c25978` (không đưa vào repo: 136 MB, bản quyền WCO). Không AI, không dịch lại, không sửa chữ OCR.

Chạy lại (tất định): `node scripts/luat-goc/wco.mjs` · `node scripts/kiem-luat-goc.mjs wco` · `node scripts/luat-goc/wco-test.mjs` (đã vào `danh-sach-test.txt`) · `--so-dem`, `--bang-nghi` in số và bảng dưới.

## Số đếm
| | Số |
|---|---:|
| Tổng kho | **1.038** |
| Nạp | **906** (764 `CHAC`, 142 `SUY_LUAN`) |
| Không nạp: nghi theo cổng `lib/wco-op.js` | **129** |
| Không nạp: qua cổng kho nhưng ảnh bác | **3** (2208.90/1, 4202.12/1, 8431.49/1) |
| Có câu nêu quy tắc (`quyTacNeu`, chép nguyên văn) | 567 |
| Bản dịch nghi (`dichNghi`: có `[?]` / `nghiOcr` / `lechSo`) | 256 |
| Có cờ `ocrNghi` | 403 nút |
| Biển nhiều mã (`apChung` + `ghiChu`) | 12 |
| Mã không còn trong biểu | 0 |
| Thiếu trang / thiếu năm | 0 / 0 |

Ba ý kiến ảnh bác:
- **8431.49/1**: ảnh trang 264 in đây là 8431.49/**2** (bộ tản nhiệt nhôm); /1 là "Track link assembly", kho để ở 842890/2. Chữ kho mở đầu "1. 2. Aluminium…".
- **4202.12/1**: kho gộp chữ của hai ý kiến /1 và /2 (trang 142).
- **2208.90/1**: bản in /1 là "(Deleted.)"; chữ kho là của /2 (trang 56).

Sổ tay đang trích hai trong ba ý kiến này: `wco-op.420212.1`, `wco-op.843149.1` (`so-tay-trich.json`); `lib/wco-op.js` vẫn trả chúng ra API. Ngoài phạm vi thẻ, cần thẻ sửa.

## Cách ghi
- `nguyenVan` = `text` của kho. Chỉ bỏ hai thứ chắc chắn (33 nút, phần bỏ ghi ở `boKhoiNguyenVan`): (1) sau `*Adoption: năm*` trên cùng dòng chỉ còn mã HS = biển xanh của ý kiến kế tiếp dính vào, bỏ cả dấu `*` của markdown; (2) trước "<số>. " có "(continued)" / "Section XVI" = biển hoặc đầu trang. Mẫu phải khớp trọn mới bỏ.
- `hieuLuc.tu` = null (bản in chỉ có năm; thẻ ghi "năm vào hieuLuc.tu", QT chốt lại không suy `YYYY-01-01`). Năm ở `namThongQua`; bản in ghi nhiều năm ("1987 + 1994") thì thêm `namThongQuaIn` (20 nút, kho chỉ giữ năm đầu).
- Sáu năm lấy theo **ảnh đọc bằng mắt**, có `ghiChu`, `nguyenVan` giữ như kho: 2202.99/1 (kho 1968, in 1965, tr. 52) · 8419.89/2 (1968 → 1965, tr. 251) · 6806.90/1 (mất → 2007, tr. 204) · 8806.22/2 (kho đọc "2039" → 2019, tr. 413) · 8905.20/1 (mất → 1997, tr. 414) · 9018.90/2 (mất → 2012, tr. 425).
- `thieu`: 9018.90/2. Kho chỉ có điểm (i); (ii)–(v) và câu quy tắc ở trang 425 bị tách thành 901890/3 (nghi).
- 2714.90/1: bản in hai biển 2714.90 liền nhau đều đánh số 1 (tr. 74), nghi lỗi in, giữ theo bản in.
- `nguon.trang` = trang PDF, lấy từ việc gióng kho với ảnh (dưới). `so` = số hiệu bản in dùng khi dẫn ("8708.50/1").
- `anh` = kết quả máy OCR thứ hai: `bien` (mã trên biển xanh), `so`, `nam`, `tiLeTuKhop` (tỉ lệ từ của kho tìm thấy trên ảnh, đúng thứ tự). `so` null ở 24 nút, `nam` null ở 1.
- `ocrNghi` = [{luat, viTri, chu}], vị trí tính theo ký tự trong `nguyenVan`. Luật `so-lech-anh` có thêm `anh` = cách ảnh đọc; **cả hai bên đều là máy**, không bên nào tự thắng.

| Luật `ocrNghi` | Nút | Bắt gì |
|---|---:|---|
| ky-tu-la | 222 | `\|` (thường là số 1), `=`, `]`, `~`, `€`, `$`… |
| so-lech-anh | 185 | hai máy OCR đọc khác nhau ở chỗ có chữ số |
| dau-cau-roi / chu-roi | 72 / 62 | chữ, dấu của cột tiếng Pháp rò sang |
| gach-ngat-dong | 59 | "beech- nut" |
| gir-vo | 46 | "GIRs I", "land 6", dấu phẩy cuối câu, câu tiếng Pháp |
| dau-dong-lan | 44 | ký tự rác trước số thứ tự |
| ky-hieu-vo / chu-so-lan / ngoac-lech | 33 / 27 / 24 | "(iil)", "1s", "S50", ngoặc lẻ |
| mu-chi-so-mat | 12 | "m?" (m²) |
| nhieu-ma-ngoai-le / thieu-dong-nam / so-la-ma-vo / nam-la | 10 / 3 / 1 / 1 | số hiệu dẫn chiếu vỡ; thiếu dòng năm; "XVID"; "2039" |

## Đối chiếu
1. **Cổng cấu trúc:** `kiem-luat-goc.mjs wco` PASS, 906 nút, 0 lỗi, 0 cảnh báo. Dòng kết quả ghi **CHƯA ĐỐI CHIẾU** vì PDF là ảnh, không có bản chữ chuẩn; không sinh `wco.txt` từ kho (so kho với chính nó). Ô `LUAT_GOC_TXT` của thẻ **chưa đạt**.
2. **Toàn kho bằng máy** (`wco-anh.py`: macOS Vision đọc lại trang 7–475, gióng theo thứ tự sách, 1.038/1.038 định vị được). Trên 906 nút nạp: mã trên biển khớp **906/906** (kể cả 142 `SUY_LUAN`; 12 nằm dưới biển nhiều mã), số thứ tự khớp 882/882 đọc được; năm: 880 khớp kho, 5 sửa theo ảnh (trên), 20 nút in nhiều năm (năm đầu khớp), 1 không đọc được. Từ khớp ảnh: trung vị 0,99; 774 nút ≥ 0,95; 11 nút < 0,8 (phần lớn do Vision sót dòng: 852713/1, 870321/1, 851762/15 đã xem mắt, kho đủ chữ). Hai máy đều có lỗi riêng; phép này chắc về mã / số / năm, không chứng minh từng chữ.
3. **Bằng mắt trên ảnh: 57 nút nạp** (41 lấy đều theo thứ tự mã, 12 lấy đều trong `SUY_LUAN`, 4 chọn vì nghi; thêm 4202.12/1 bị loại).

| | Khớp |
|---|---|
| Mã trên biển | 57/57 (3921.90/1 dưới biển "3921.90 or 3926.90") |
| Số thứ tự | 57/57 |
| Năm | 55/57 (3824.99/3 và 3921.90/1 in hai năm, kho giữ một) |
| Chữ khớp, chỉ rơi dấu chấm cuối câu / khoảng trắng | **29/57 (51%)**; riêng mẫu đều 21/41 |
| Có lỗi ký tự OCR | 28/57, trong đó 25 có cờ `ocrNghi`; 3 không bắt được (8306.29/2 "inseruon", 4911.99/1 "ete.", 2404.11/1 mất dấu "–") |
| Lỗi chạm số / công thức / số hiệu | 2934.99/1 ("λ5" → "245"), 5607.50/1 ("1 mm" → "\| mm"), 8435.10/1 (mất "420 mm", "S50 Hz"), 8517.62/17 ("1" → "\|", hai chỗ), 2106.90/36 và 6807.90/1 (số dẫn chiếu) — đều có cờ |

Kết luận: kho **tin được về mã, số, năm; chưa phải nguyên văn từng chữ**. Nhãn `NGUYEN_VAN` của `wco-op/opinions.json` trong `lib/nguon-loai.js` quá mạnh. Từ có chữ cái bị đọc sai mà vẫn ra hình từ ("inseruon") luật không bắt được.

## Chưa chắc / việc kế
- `lib/nguon-loai.js` còn gắn `NGUYEN_VAN` cho bản OCR; `NOTICE.md` chưa liệt kê `data/luat-goc/wco.jsonl` trong phần bản quyền WCO (mỗi nút có `banQuyen`, nhưng tệp NOTICE ngoài phạm vi thẻ).
- 12 nút biển nhiều mã: id theo mã kho gán, là một trong các mã in; `apChung` ghi đủ khi biển dùng "or", biển "to" chỉ ghi `anh.bien`.
- Phần nhãn ảnh, bảng, sơ đồ (tr. 70–71) và Annex (từ tr. 477) không nạp.
- 129 nghi: ảnh cho biết **76** nằm dưới biển một mã và đọc được số in (2 trong đó trùng id đang có: 271490/2 do hai biển in trùng; 842890/2 chính là 8431.49/1), 20 dưới biển nhiều mã, 17 dưới biển cả chương / Phần / nhóm (Ch. 27, 27.10 to 27.13, Ch. 50 to 55, Sect. XVI, Ch. 85, Sect. XVII: ngữ pháp `wco:<hs6>` không chứa được), 16 chưa đọc được số. Cột ảnh trong bảng là máy đọc, **chưa duyệt, chưa dùng để nạp**; đủ để làm một thẻ khôi phục.

## 132 ý kiến không nạp

| Id kho | Số in (kho) | Lý do không nạp | Ảnh: trang | Ảnh: biển mã in | Ảnh: số in | Mở đầu |
|---|---:|---|---:|---|---:|---|
| 170490/12 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 23 | 1806.31, 1806.32 | 1 | 1. Sugar confectionery containing co |
| 190490/5 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 32 | 1904.90 | ? | $. Prepared food, frozen and put up  |
| 220890/1 | 1 | qua cổng kho nhưng gộp hai mục: "1. (Deleted)" và nội dung của 2208.90/2 (ảnh trang 56) | 56 | 2208.90 | 1 | 1. (Deleted)  2. Aqueous solutions o |
| 220890/2 | 3 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 56 | 2208.90 | 3 | 3. Spirituous beverage of an alcohol |
| 220890/3 | 4 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 57 | 2208.90 (continued) | 4 | 4. Neutral alcoholic base, of a kind |
| 220890/4 | 5 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 57 | 2208.90 (continued) | 5 | 5. Neutral alcoholic base, of a kind |
| 220890/5 | 6 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 57 | 2208.90 (continued) | 6 | 6. Neutral alcoholic base, of a kind |
| 240411/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 62 | 2404.11 | ? | Fig. 1 Fig. 1 : Tobacco capsule and  |
| 240411/3 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 63 | 2404.11 (continued) | ? | Fig. 1 Hollow Acetate Tube B   Tobac |
| 261400/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 68 | Ch. 27 | 1 | 1. Separate isomers and mixtures of  |
| 261400/3 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 68 | Ch. 27 | 2 | 2. Separate isomers and mixtures of  |
| 261400/4 | 3 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 68 | Ch. 27 | 3 | 3. Mixtures of stereoisomers of mono |
| 261400/5 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 68 | Ch. 27 | ? | (*) Calculated on the dry product, b |
| 261400/6 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 69 | 27.10 to 27.13 | ? | Distinguishing criteria for certain  |
| 261400/7 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 69 | 27.10 to 27.13 | ? | > N.B. : The Annex to the present Op |
| 271012/1 | 2 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 72 | 2710.12 | 2 | 2. Motor Petrol with octane number 9 |
| 271019/1 | 2 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 72 | 2710.19 | 2 | 2. Mixture in the form of a liquid o |
| 271019/2 | 3 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 73 | 2710.19 (continued) | 3 | 3. Heavy distillates, liquid fuels,  |
| 271019/3 | 4 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 73 | 2710.19 (continued) | 4 | 4. Low-viscosity marine vessel fuel, |
| 271290/1 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 69 | 27.10 to 2713.20 | 27 | ale ou supérieur > volumique a 70 °C |
| 271290/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 70 | 27.10 to 2713.20 | 1 | u égale ou inférieure ire supérieure |
| 271290/3 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 71 | 27.10 to 2713.20 | ? | less than ity at 70 °C less than 0,9 |
| 271490/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 74 | 2714.90 | 1 | 1. Dehydrated and pulverised natural |
| 290110/2 | ? | không đọc được số thứ tự in | 77 | 2901.10 | ? | ) Calculated on the dry product, by  |
| 292419/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 78 | 2924.29 | 1 | 1. Diflubenzuron = (N-[[4-chlorophen |
| 360200/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 99 | 3701.30 or 3701.99 | 1 | 1. Plates, unexposed, consisting of  |
| 390729/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 118 | 3907.29 | ? | CH2)sCOOCH2CH20-(CH2CH20), J.-H m=2, |
| 392390/4 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 126 | 3924.90 | 1 | __ Section Vil f 1. Article of plast |
| 392390/5 | ? | đứng sau chỗ đánh số lại | 126 | 3924.90 | 2 | S 2. Drinking bottles of plastics, d |
| 392490/1 | 3 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 127 | 3924.90 (continued) | 3 | 3. Drinking bottle of plastics, havi |
| 392490/2 | 4 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 128 | 3924.90 (continued) | 4 | 4. Container of plastics, of a trian |
| 392490/3 | 5 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 128 | 3924.90 (continued) | 5 | 5. Waste collection bin made entirel |
| 392490/4 | 6 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 129 | 3924.90 (continued) | 6 | 6. Shower set (pipes, hand shower, s |
| 392490/5 | 7 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 130 | 3924.90 (continued) | 7 | 7. Mobile garbage bins made of plast |
| 420212/1 | 1 | qua cổng kho nhưng chữ gộp hai ý kiến 1 và 2 (ảnh trang 142) | 142 | 4202.12 | 1 | 1. Portable document case of plastic |
| 420212/2 | ? | không đọc được số thứ tự in | 142 | 4202.12 | ? | It is used for containing, storing a |
| 420212/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 143 | 4202.21 | 1 | : 1. Handbag, consisting of stamped  |
| 420212/4 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 143 | 4202.32 | 1 | 4 1. Cover made of plastics and desi |
| 420292/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 145 | 4202.99 | 1 | 1. Portable tool box (or case) for s |
| 420292/3 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 145 | 4202.99 | 2 | i 2. Portable tool box (or case) for |
| 430390/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 148 | 4408.10 to 4408.90 | 1 | 1. Thin wood sheets (“kraft veneer”) |
| 430390/3 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 148 | 4409.10 to 4409.29 | 1 | 1. Strips for parquet flooring, not  |
| 441112/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 149 | 4412.59 or 4412.99 | 1 | 1. Rectangular pieces of laminated w |
| 442199/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 157 | 4704.21 or 4704.29 | 1 | 1. Finely ground bleached sulphite c |
| 481190/3 | ? | không đọc được số thứ tự in | 158 | 4811.90 | 3 | Paper in rolls of a width exceeding  |
| 482390/2 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 160 | 4911.10, 4911.91 or 4911.99 | 1 | 1. Separate printed sheets with text |
| 482390/3 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 162 | Ch. 50 to 55 | 1 | 1. Fabrics in the piece, pleated (ot |
| 482390/4 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 162 | Ch. 50 to 55 | 2 | 2. Fabrics of which the surface is d |
| 482390/5 | 3 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 162 | Ch. 50 to 55 | 3 | 3. Strips of a width not exceeding 3 |
| 560122/2 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 163 | 5601.30 | 1 | 'S 1. Fragments of nylon yarn made f |
| 560122/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 164 | 5603.12 or 5603.13 | 1 | 1. Nonwovens manufactured using the  |
| 560750/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 166 | 5702.50 to 5702.99 | 1 | 1. Mats, woven, with warp of textile |
| 580810/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 168 | 5810.91 to 5810.99 | 1 | 1. Embroidery width 2.5 to 11.5 cm,  |
| 580810/4 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 168 | 5810.91 to 5810.99 | 2 | 2. Embroidered piece of woven fabric |
| 611030/5 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 179 | 6114.20 | 1 | n 1. Light-weight knitted garment (9 |
| 621290/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 188 | 6214.10 to 6214.90 | 1 | 1. Scarf of embroidered woven fabric |
| 640520/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 200 | 6405.20 | ? | Textile flock partially embedded in  |
| 690390/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 207 | 6907.21 to 6907.23 | ? | 1. Terracotta cladding elements used |
| 731210/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 224 | 7314.49 | 1 | 1. Conveyor belting in the length, i |
| 732119/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 226 | 7321.89 | 1 | 1. Charcoal chimney starter in the f |
| 732690/9 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 231 | 7409.19 or 7410.21 | 1 | 1. Sheets of phenol-formaldehyde res |
| 732690/10 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 232 | 7419.80 | 1 | ! 1. Bronze wire cloth, mounted on a |
| 732690/11 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 232 | 7419.80 | 2 | , 2. Spray heads for fire extinguish |
| 732690/12 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 232 | 7506.10 | 1 | n 1. Laminated product consisting of |
| 732690/13 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 232 | 7603.10 | 1 | s 1. Non-sintered powder consisting  |
| 761090/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 234 | 7615.10 | 1 | : 1. Disposable aluminium foil conta |
| 830990/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 241 | Sect. XVI | 1 | 1. Ball bearing control cables : Ide |
| 830990/3 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 241 | Sect. XVI | 2 | 2. Stirring attachments for agitator |
| 830990/4 | 3 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 241 | Sect. XVI | 3 | 3. Gaskets for fitting to doors of a |
| 842720/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 263 | 8428.90 | 1 | 1. Distributors, specially designed  |
| 842720/3 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 263 | 8428.90 | 2 | 2. Marine loading arm for the safe t |
| 842890/1 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 263 | 8428.90 | ? | Drive cable Bi Inboard arm iC   Outb |
| 842890/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 264 | 8431.49 | 1 | 1. Track link assembly : rt Identifi |
| 843149/1 | 1 | qua cổng kho nhưng ảnh trang 264 in số 2, kho gán 1 | 264 | 8431.49 | 2 | 1. 2. Aluminium radiator (985 mm x 5 |
| 844332/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 273 | 8443.99 | 1 | 1. Tape cassette for use with label  |
| 844332/3 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 273 | 8443.99 | ? | Tape cassette Tape end sensor (main  |
| 844399/1 | 2 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 274 | 8443.99 (continued) | 2 | 2. Cartridges, with or without toner |
| 844399/2 | 3 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 274 | 8443.99 (continued) | 3 | 3. Cartridges, with or without toner |
| 845130/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 276 | 8451.80 | 1 | 1. Appliances for cleaning carpets i |
| 845130/4 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 276 | 8451.80 | 2 | 2. Appliances for cleaning carpets i |
| 845130/5 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 277 | 8451.90 | 1 | 1. Rectangular ironing table with sl |
| 845130/6 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 278 | 8462.25 or 8462.29 | 1 | _____ Section xvi ; 1. Welded tube m |
| 845130/7 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 278 | 8462.25 or 8462.29 | ? | u Cross section of stnp at various s |
| 847960/4 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 291 | 8479.60 (continued) | ? | Evaporative cooler mechanism B   Coo |
| 847960/5 | ? | đứng sau chỗ đánh số lại | 292 | 8479.89 | 2 | eg 2. Fumigation chamber, mounted on |
| 847960/6 | ? | đứng sau chỗ đánh số lại | 292 | 8479.89 | 3 | 4 3. Self-propelled machines for swe |
| 847960/7 | ? | đứng sau chỗ đánh số lại | 292 | 8479.89 | 4 | n 4. Horns operated by compressed ai |
| 847960/8 | ? | đứng sau chỗ đánh số lại | 292 | 8479.89 | 5 | a 5. Greasing appliance, consisting  |
| 847989/1 | 6 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 293 | 8479.89 (continued) | 6 | 6. Mobile mechanical unit for bunker |
| 847989/2 | 7 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 293 | 8479.89 (continued) | 7 | 7. Metal chamber, fitted with a diap |
| 847989/3 | 8 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 293 | 8479.89 (continued) | 8 | 8. Flat base silos, made of corrugat |
| 847989/4 | 9 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 294 | 8479.89 (continued) | 9 | 9. Conical base silos, made of corru |
| 847989/5 | 10 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 294 | 8479.89 (continued) | 10 | 10. Handheld machine, used for remov |
| 847989/6 | 11 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 295 | 8479.89 (continued) | 11 | 11. Tape Automated Bonding equipment |
| 848310/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 300 | 8483.40 | 1 | 1. Slewing ring on ball or roller be |
| 848790/6 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 303 | Ch. 85 | 1 | 1. Elements of soft ferrite, identif |
| 850162/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 303 | 8502.13 | 1 | 1. Electric generating set, composed |
| 850730/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 307 | 8507.50 | 1 | 1. Nickel hydride rechargeable accum |
| 850730/3 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 308 | 8508.11 or 8508.19 | 1 | j 1. Dry and wet vacuum cleaning mac |
| 851230/2 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 310 | 8512.90 | 1 | c 1. Windscreen (windshield) wiper b |
| 852491/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 343 | 8525.89 | 1 | 1. Camera apparatus presented in a b |
| 852491/3 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 344 | 8525.89 (continued) | 2 | 25.89 (continued) Digital still came |
| 852852/4 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 349 | 8528.52 (continued) | ? |   AC Power Connector B USB Downstrea |
| 852852/9 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 356 | 8528.71 | 1 | 1. Satellite television reception sy |
| 852852/10 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 356 | 8528.71 | 2 | r 2. Receiver of satellite televisio |
| 852852/11 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 356 | 8528.71 | 3 | D 3. Terminal for receiving satellit |
| 852871/1 | 4 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 357 | 8528.71 (continued) | 1 | 4. Modem-based (broadband) set top b |
| 853590/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 361 | 8535.90 or 8536.90 | 1 | 1. Power rail installation, for supp |
| 853590/3 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 361 | 8535.90 or 8536.90 | 2 | 2. Prefabricated elements for electr |
| 853710/2 | ? | không đọc được số thứ tự in | 364 | 8537.10(continued) | 2 | Transparent resistive touch screen ( |
| 854370/6 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 375 | 8543.70 (continued) | ? | adiographies du produit/ X-ray views |
| 854370/7 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 377 | Sect. XVII | 1 | 1. Ball bearing control cables : (i) |
| 860900/2 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 378 | 8701.10 | 1 | ul 1. Self-powered, pedestrian contr |
| 860900/3 | ? | đứng sau chỗ đánh số lại | 378 | 8701.30 | 1 | S 1. Snow-scooters and snow-sledges, |
| 860900/4 | ? | đứng sau chỗ đánh số lại | 378 | 8701.30 | ? | S 2. “Basic” tractors, track-laying, |
| 870194/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 381 | 8702.10 or 8702.90 | 1 | 1. Van type motor vehicle (monocoque |
| 870421/4 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 393 | 8704.23 | 1 | 1. Tipping lorry (truck), with a six |
| 870421/5 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 394 | 8704.31 | 1 | 1 1. Two-wheel-driven motor vehicle, |
| 870421/6 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 394 | 8704.31 | 2 | r 2. Four-wheel-driven motor vehicle |
| 870421/7 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 394 | 8704.31 | 3 | s 3. Multipurpose four-wheeled utili |
| 870431/1 | 4 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 395 | 8704.31 (continued) | 4 | 4. Three-wheeled vehicle that featur |
| 870431/2 | ? | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 396 | 8704.31 (continued) | 5 | i 8704.31 (continued) ; 5. Three-whe |
| 870850/5 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 402 | 8708.93 | 1 | s 1. Clutch cable, which is similar  |
| 901890/3 | ? | không đọc được số thứ tự in | 425 | 9018.90 (continued) | ? | (ii) Refrigeration machine. The refr |
| 902620/2 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 431 | 9027.20 | 1 | x 1. On-line Dissolved Gas Analysis  |
| 902720/1 | 2 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai | 432 | 9027.20 (continued) | 2 | 2. On-line Dissolved Gas Analysis (D |
| 902790/2 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 435 | 9028.90 | 1 | S 1. Electricity meter box of plasti |
| 940320/7 | ? | không đọc được số thứ tự in | 450 | 9403.20 (continued) | 7 | Steel cabinets, with a door on the f |
| 940320/8 | ? | không đọc được số thứ tự in | 450 | 9403.20 (continued) | 8 | Stainless steel cabinets, with a doo |
| 950300/6 | 6 | nội dung không khớp mã | 459 | 9503.00 (continued) | 6 | 6. Compound optical microscopes (oth |
| 950450/4 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 465 | 9504.50 (continued) | ? | ue de réalité virtuelle Headset unit |
| 950629/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 466 | 9506.29 | ? | rc] Wood Reinforcement BD Giass B Gl |
