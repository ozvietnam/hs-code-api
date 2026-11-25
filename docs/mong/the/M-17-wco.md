# M-17 — Ý kiến phân loại WCO (`data/luat-goc/wco.jsonl`)

Nguồn: `data/wco-op/opinions.json` (bản OCR tiếng Anh), `vi.json` (bản dịch không chính thức). Đối chiếu: PDF scan *WCO Compendium of Classification Opinions, HS 2022*, 706 trang, sha256 `5f47576553f963d0b79d97417a597d4ed0f7abcc5fbd6c8b6ccb889ff2c25978` (không đưa vào repo: 136 MB, bản quyền WCO). Không AI, không dịch lại, không sửa chữ OCR.

Chạy lại (tất định): `node scripts/luat-goc/wco.mjs` · `node scripts/kiem-luat-goc.mjs wco` · `node scripts/luat-goc/wco-test.mjs` (đã vào `danh-sach-test.txt`) · `--so-dem`, `--bang-nghi` in số và bảng dưới.

## Số đếm
| | Số |
|---|---:|
| Tổng kho | **1.038** |
| Nạp | **980** = 906 qua cổng kho (764 `CHAC`, 142 `SUY_LUAN`) + **74 khôi phục** (`khoiPhuc: true`, ghi `SUY_LUAN`) |
| Không nạp: nghi theo cổng `lib/wco-op.js` | **55** (129 − 74) |
| Không nạp: qua cổng kho nhưng ảnh bác | **3** (2208.90/1, 4202.12/1, 8431.49/1) |
| Có câu nêu quy tắc (`quyTacNeu`, chép nguyên văn) | 617 |
| Bản dịch nghi (`dichNghi`: có `[?]` / `nghiOcr` / `lechSo`) | 295 |
| Có cờ `ocrNghi` | 460 nút |
| Biển nhiều mã (`apChung` + `ghiChu`) | 12 |
| Mã không còn trong biểu | 0 |
| Thiếu trang / thiếu năm | 0 / 0 |

**Khôi phục 74** (bảng `KHOI_PHUC` trong `wco.mjs`): ý kiến nghi nằm dưới biển **một mã**; OCR thứ hai đọc ra biển + số in, **và** xem mắt từng cái trên ảnh trang (48 trang) thấy đúng biển, số, năm, câu mở đầu: 74/74. Script tự từ chối nếu bảng này lệch bảng ảnh. `so` / id theo bản in, `nguon.khoId` giữ id cũ của kho, `ghiChu` ghi trang ảnh. Hai cái đủ mã + số mà **để lại**: 271490/2 (trùng id, bản in hai biển 2714.90 cùng số 1), 852871/1 (máy đọc 1, mắt thấy 4).

Ba ý kiến ảnh bác:
- **8431.49/1**: ảnh trang 264 in đây là 8431.49/**2** (bộ tản nhiệt nhôm); /1 là "Track link assembly", kho để ở 842890/2 (nay là `wco:843149:1`, khôi phục; **nội dung khác** `wco-op.843149.1` mà sổ tay đang trích). Chữ kho mở đầu "1. 2. Aluminium…".
- **4202.12/1**: kho gộp chữ của hai ý kiến /1 và /2 (trang 142).
- **2208.90/1**: bản in /1 là "(Deleted.)"; chữ kho là của /2 (trang 56).

Sổ tay đang trích hai trong ba ý kiến này: `wco-op.420212.1`, `wco-op.843149.1` (`so-tay-trich.json`); `lib/wco-op.js` vẫn trả chúng ra API. Ngoài phạm vi thẻ, cần thẻ sửa.

## Cách ghi
- **Mọi nút có `ocr: true`**: chữ là bản OCR, chưa chắc nguyên văn từng chữ, bên đọc phải dẫn "theo bản OCR".
- `nguyenVan` = `text` của kho. Chỉ bỏ hai thứ chắc chắn (38 nút, phần bỏ ghi ở `boKhoiNguyenVan`): (1) sau `*Adoption: năm*` trên cùng dòng chỉ còn mã HS = biển xanh của ý kiến kế tiếp dính vào, bỏ cả dấu `*` của markdown; (2) trước "<số>. " có "(continued)" / "Section XVI" = biển hoặc đầu trang. Mẫu phải khớp trọn mới bỏ.
- `hieuLuc.tu` = null (bản in chỉ có năm; thẻ ghi "năm vào hieuLuc.tu", QT chốt lại không suy `YYYY-01-01`). Năm ở `namThongQua`; bản in ghi nhiều năm ("1987 + 1994") thì `namThongQua` giữ năm đầu, thêm `cacNam` chép như in (20 nút, đã xem mắt 20/20).
- Sáu năm lấy theo **ảnh đọc bằng mắt**, có `ghiChu`, `nguyenVan` giữ như kho: 2202.99/1 (kho 1968, in 1965, tr. 52) · 8419.89/2 (1968 → 1965, tr. 251) · 6806.90/1 (mất → 2007, tr. 204) · 8806.22/2 (kho đọc "2039" → 2019, tr. 413) · 8905.20/1 (mất → 1997, tr. 414) · 9018.90/2 (mất → 2012, tr. 425).
- `thieu`: 7603.10/1 (kho mất "7 to 14 %.", tr. 232); 9018.90/2. Kho chỉ có điểm (i); (ii)–(v) và câu quy tắc ở trang 425 bị tách thành 901890/3 (nghi).
- 2714.90/1: bản in hai biển 2714.90 liền nhau đều đánh số 1 (tr. 74), nghi lỗi in, giữ theo bản in.
- `nguon.trang` = trang PDF, lấy từ việc gióng kho với ảnh (dưới). `so` = số hiệu bản in dùng khi dẫn ("8708.50/1").
- `anh` = kết quả máy OCR thứ hai: `bien` (mã trên biển xanh), `so`, `nam`, `tiLeTuKhop` (tỉ lệ từ của kho tìm thấy trên ảnh, đúng thứ tự). `so` null ở 24 nút, `nam` null ở 1.
- `ocrNghi` = [{luat, viTri, chu}], vị trí tính theo ký tự trong `nguyenVan`. Luật `so-lech-anh` có thêm `anh` = cách ảnh đọc; **cả hai bên đều là máy**, không bên nào tự thắng.

| Luật `ocrNghi` | Nút | Bắt gì |
|---|---:|---|
| ky-tu-la | 248 | `\|` (thường là số 1), `=`, `]`, `~`, `€`, `$`… |
| so-lech-anh | 207 | hai máy OCR đọc khác nhau ở chỗ có chữ số |
| dau-cau-roi / chu-roi | 89 / 92 | chữ, dấu của cột tiếng Pháp rò sang |
| gach-ngat-dong | 64 | "beech- nut" |
| gir-vo | 52 | "GIRs I", "land 6", dấu phẩy cuối câu, câu tiếng Pháp |
| dau-dong-lan | 75 | ký tự rác trước số thứ tự, hoặc mất số |
| ky-hieu-vo / chu-so-lan / ngoac-lech | 35 / 29 / 31 | "(iil)", "1s", "S50", ngoặc lẻ |
| mu-chi-so-mat | 12 | "m?" (m²) |
| nhieu-ma-ngoai-le / thieu-dong-nam / so-la-ma-vo / nam-la | 12 / 3 / 1 / 1 | số hiệu dẫn chiếu vỡ; thiếu dòng năm; "XVID"; "2039" |

## Đối chiếu
1. **Cổng cấu trúc:** `kiem-luat-goc.mjs wco` PASS, 980 nút, 0 lỗi, 0 cảnh báo. Dòng kết quả ghi **CHƯA ĐỐI CHIẾU** vì PDF là ảnh, không có bản chữ chuẩn; không sinh `wco.txt` từ kho (so kho với chính nó). Ô `LUAT_GOC_TXT` của thẻ **chưa đạt**.
2. **Toàn kho bằng máy** (`wco-anh.py`: macOS Vision đọc lại trang 7–475, gióng theo thứ tự sách, 1.038/1.038 định vị được). Trên 906 nút qua cổng kho: mã trên biển khớp **906/906** (kể cả 142 `SUY_LUAN`; 12 nằm dưới biển nhiều mã), số thứ tự khớp 882/882 đọc được; năm: 880 khớp kho, 5 sửa theo ảnh (trên), 20 nút in nhiều năm (năm đầu khớp), 1 không đọc được. Từ khớp ảnh: trung vị 0,99; 774 nút ≥ 0,95; 11 nút < 0,8 (phần lớn do Vision sót dòng: 852713/1, 870321/1, 851762/15 đã xem mắt, kho đủ chữ). Hai máy đều có lỗi riêng; phép này chắc về mã / số / năm, không chứng minh từng chữ.
3. **Bằng mắt trên ảnh: 57 nút qua cổng kho** (đọc từng chữ; 74 nút khôi phục soát riêng về mã, số, năm, câu mở đầu) (41 lấy đều theo thứ tự mã, 12 lấy đều trong `SUY_LUAN`, 4 chọn vì nghi; thêm 4202.12/1 bị loại).

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
- 55 nghi còn lại: 20 dưới biển nhiều mã, 17 dưới biển cả chương / Phần / nhóm (Ch. 27, 27.10 to 27.13, Ch. 50 to 55, Sect. XVI, Ch. 85, Sect. XVII: ngữ pháp `wco:<hs6>` không chứa được), 16 ảnh máy chưa đọc được số, 2 nêu trên. Cột ảnh trong bảng là máy đọc, chưa duyệt.
- 74 nút khôi phục chưa ra API: `lib/wco-op.js` vẫn chặn theo `headingSuspect` của kho cũ.

## 58 ý kiến không nạp

| Id kho | Số in (kho) | Lý do không nạp | Ảnh: trang | Ảnh: biển mã in | Ảnh: số in | Mở đầu |
|---|---:|---|---:|---|---:|---|
| 170490/12 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 23 | 1806.31, 1806.32 | 1 | 1. Sugar confectionery containing co |
| 190490/5 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 32 | 1904.90 | ? | $. Prepared food, frozen and put up  |
| 220890/1 | 1 | qua cổng kho nhưng gộp hai mục: "1. (Deleted)" và nội dung của 2208.90/2 (ảnh trang 56) | 56 | 2208.90 | 1 | 1. (Deleted)  2. Aqueous solutions o |
| 240411/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 62 | 2404.11 | ? | Fig. 1 Fig. 1 : Tobacco capsule and  |
| 240411/3 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 63 | 2404.11 (continued) | ? | Fig. 1 Hollow Acetate Tube B   Tobac |
| 261400/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 68 | Ch. 27 | 1 | 1. Separate isomers and mixtures of  |
| 261400/3 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 68 | Ch. 27 | 2 | 2. Separate isomers and mixtures of  |
| 261400/4 | 3 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 68 | Ch. 27 | 3 | 3. Mixtures of stereoisomers of mono |
| 261400/5 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 68 | Ch. 27 | ? | (*) Calculated on the dry product, b |
| 261400/6 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 69 | 27.10 to 27.13 | ? | Distinguishing criteria for certain  |
| 261400/7 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 69 | 27.10 to 27.13 | ? | > N.B. : The Annex to the present Op |
| 271290/1 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 69 | 27.10 to 2713.20 | 27 | ale ou supérieur > volumique a 70 °C |
| 271290/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 70 | 27.10 to 2713.20 | 1 | u égale ou inférieure ire supérieure |
| 271290/3 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 71 | 27.10 to 2713.20 | ? | less than ity at 70 °C less than 0,9 |
| 271490/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước; trùng id 2714.90/1 (bản in hai biển 2714.90 cùng đánh số 1) | 74 | 2714.90 | 1 | 1. Dehydrated and pulverised natural |
| 290110/2 | ? | không đọc được số thứ tự in | 77 | 2901.10 | ? | ) Calculated on the dry product, by  |
| 360200/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 99 | 3701.30 or 3701.99 | 1 | 1. Plates, unexposed, consisting of  |
| 390729/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 118 | 3907.29 | ? | CH2)sCOOCH2CH20-(CH2CH20), J.-H m=2, |
| 420212/1 | 1 | qua cổng kho nhưng chữ gộp hai ý kiến 1 và 2 (ảnh trang 142) | 142 | 4202.12 | 1 | 1. Portable document case of plastic |
| 420212/2 | ? | không đọc được số thứ tự in | 142 | 4202.12 | ? | It is used for containing, storing a |
| 430390/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 148 | 4408.10 to 4408.90 | 1 | 1. Thin wood sheets (“kraft veneer”) |
| 430390/3 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 148 | 4409.10 to 4409.29 | 1 | 1. Strips for parquet flooring, not  |
| 441112/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 149 | 4412.59 or 4412.99 | 1 | 1. Rectangular pieces of laminated w |
| 442199/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 157 | 4704.21 or 4704.29 | 1 | 1. Finely ground bleached sulphite c |
| 482390/2 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 160 | 4911.10, 4911.91 or 4911.99 | 1 | 1. Separate printed sheets with text |
| 482390/3 | 1 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 162 | Ch. 50 to 55 | 1 | 1. Fabrics in the piece, pleated (ot |
| 482390/4 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 162 | Ch. 50 to 55 | 2 | 2. Fabrics of which the surface is d |
| 482390/5 | 3 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 162 | Ch. 50 to 55 | 3 | 3. Strips of a width not exceeding 3 |
| 560122/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 164 | 5603.12 or 5603.13 | 1 | 1. Nonwovens manufactured using the  |
| 560750/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 166 | 5702.50 to 5702.99 | 1 | 1. Mats, woven, with warp of textile |
| 580810/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 168 | 5810.91 to 5810.99 | 1 | 1. Embroidery width 2.5 to 11.5 cm,  |
| 580810/4 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 168 | 5810.91 to 5810.99 | 2 | 2. Embroidered piece of woven fabric |
| 621290/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 188 | 6214.10 to 6214.90 | 1 | 1. Scarf of embroidered woven fabric |
| 640520/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 200 | 6405.20 | ? | Textile flock partially embedded in  |
| 690390/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 207 | 6907.21 to 6907.23 | ? | 1. Terracotta cladding elements used |
| 732690/9 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 231 | 7409.19 or 7410.21 | 1 | 1. Sheets of phenol-formaldehyde res |
| 830990/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 241 | Sect. XVI | 1 | 1. Ball bearing control cables : Ide |
| 830990/3 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 241 | Sect. XVI | 2 | 2. Stirring attachments for agitator |
| 830990/4 | 3 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 241 | Sect. XVI | 3 | 3. Gaskets for fitting to doors of a |
| 842890/1 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 263 | 8428.90 | ? | Drive cable Bi Inboard arm iC   Outb |
| 843149/1 | 1 | qua cổng kho nhưng ảnh trang 264 in số 2, kho gán 1 | 264 | 8431.49 | 2 | 1. 2. Aluminium radiator (985 mm x 5 |
| 844332/3 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 273 | 8443.99 | ? | Tape cassette Tape end sensor (main  |
| 845130/6 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 278 | 8462.25 or 8462.29 | 1 | _____ Section xvi ; 1. Welded tube m |
| 845130/7 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 278 | 8462.25 or 8462.29 | ? | u Cross section of stnp at various s |
| 847960/4 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 291 | 8479.60 (continued) | ? | Evaporative cooler mechanism B   Coo |
| 848790/6 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 303 | Ch. 85 | 1 | 1. Elements of soft ferrite, identif |
| 850730/3 | ? | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 308 | 8508.11 or 8508.19 | 1 | j 1. Dry and wet vacuum cleaning mac |
| 852852/4 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 349 | 8528.52 (continued) | ? |   AC Power Connector B USB Downstrea |
| 852871/1 | 4 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai; OCR thứ hai đọc số 1, mắt thấy số 4 (8528.71/4): hai cách đọc không cùng ra | 357 | 8528.71 (continued) | 1 | 4. Modem-based (broadband) set top b |
| 853590/2 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 361 | 8535.90 or 8536.90 | 1 | 1. Power rail installation, for supp |
| 853590/3 | 2 | tiêu đề mã bị mất / nghi sai (vòng khôi phục trước) | 361 | 8535.90 or 8536.90 | 2 | 2. Prefabricated elements for electr |
| 854370/6 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 375 | 8543.70 (continued) | ? | adiographies du produit/ X-ray views |
| 854370/7 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 377 | Sect. XVII | 1 | 1. Ball bearing control cables : (i) |
| 860900/4 | ? | đứng sau chỗ đánh số lại | 378 | 8701.30 | ? | S 2. “Basic” tractors, track-laying, |
| 870194/3 | 1 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước | 381 | 8702.10 or 8702.90 | 1 | 1. Van type motor vehicle (monocoque |
| 901890/3 | ? | không đọc được số thứ tự in | 425 | 9018.90 (continued) | ? | (ii) Refrigeration machine. The refr |
| 950450/4 | ? | số in nhỏ hơn thứ tự gán → có biển mã bị mất | 465 | 9504.50 (continued) | ? | ue de réalité virtuelle Headset unit |
| 950629/2 | ? | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được | 466 | 9506.29 | ? | rc] Wood Reinforcement BD Giass B Gl |
