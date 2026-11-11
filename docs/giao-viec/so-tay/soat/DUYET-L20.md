# Soát ranh giới lô L20 (#1109)

Người soát: `claude-agent:duyet-L20-20261111#soat-L20` (khác phiên soạn của mọi bản trong lô). Theo
[`SOAT-RANH-GIOI.md`](../SOAT-RANH-GIOI.md) mục 0–5: mỗi PN6 chạy `--kiem` (đều XANH, không DỪNG), đọc `--ve` (VI + EN từng
dòng), đặt từng điều kiện cạnh chữ biểu, đọc mọi cảnh báo, tra `precedents.json` + `hieu-chinh-tien-le.json`.

Kiểm thêm theo yêu cầu tech lead: so với `data/so-tay/<nhóm>.json` hiện hành trên origin/main, không bản nào được duyệt
làm mất ngưỡng số SEN. Chỉ 2 PN6 trong lô có `dieuKienSo` ở sổ tay cũ: 701980 (chữ tự do, giữ nguyên) và 701890 (ngưỡng
4–36 mm giữ được nhưng bản nháp bỏ mất vế khác, xem dưới, TRA_VE).

## Kết quả

| | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | **37** |
| TRA_VE | **6** |
| Đỏ (không soát) | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát | 0 |
| Đã xử lý ở lô khác | 0 |

Tỉ lệ sai theo PN6: 6/43 = **14,0 %**. Dòng 8 số bị ảnh hưởng trực tiếp: 70109010 (+ .40), 70159010, 70171010, 70189010,
70200020, 71129910, tức **7 dòng / 6 phân nhóm**. Dòng lệch MFN: 702000 .20 0 % ↔ .90 30 %; 701890 .10 0 % ↔ .90 30 %. Bốn
PN6 còn lại sai mã 8 số nhưng hai dòng cùng mức MFN.

Sau khi áp dụng: `check-so-tay` 0 mục lỗi (1228 nhóm), `check-cay` 0 lỗi lệch cây, `test-so-tay` 65/65,
`test-so-tay-gates` 91 passed / 0 failed, `test-engine-loop-so-tay` 11 passed / 0 failed. Không phải gỡ bản nào.

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 700231 | DUYET | dungSanXuatOngChanKhong CO, đúng "Of a kind used to manufacture vacuum tubes" |
| 700232 | DUYET | .30 tên + công dụng phial/ampoule; .40 biên "3 mm or more but not more than 22 mm" ⇒ ≥3, ≤22, đã đối chiếu tay (cảnh báo cong3-bien-khong-doc-duoc) |
| 700239 | DUYET | như 700232 (biên đối chiếu tay) |
| 700312 | DUYET | thuyTinhQuangHoc: định nghĩa khoá gồm "not optically worked"; hinhDangCatGocKinh: vế cắt góc là có-hoặc-không |
| 700319 | DUYET | như 700312 |
| 700320 | DUYET | hinhDangCatGocKinh CO |
| 700330 | DUYET | hinhDangCatGocKinh CO |
| 700420 | DUYET | như 700312 |
| 700490 | DUYET | như 700312 |
| 700510 | DUYET | thuyTinhQuangHoc CO |
| 700521 | DUYET | mục bảng 700521-01/-02 KHONG_LECH (TB 1555–1558 theo biểu AHTN 2017, chưa có dòng .20), khớp |
| 700529 | DUYET | như 700312 |
| 700530 | DUYET | hinhDangCatGocKinh CO |
| 700600 | DUYET | tiền lệ 70060090 (mặt kính công tắc) là kính thường nên vào .90, khớp |
| 700711 | DUYET | "aircraft or spacecraft of Chapter 88": mảng hai đích + định ngữ chung "Chương 88" đúng |
| 700719 | DUYET | dungCho ["84.29","84.30"]; tiền lệ 70071990 (mặt kính bếp ga) khớp |
| 700721 | DUYET | như 700711 |
| 700729 | DUYET | như 700719 |
| 701090 | **TRA_VE** | .10 "Carboys and demijohns" là HAI hàng nhưng bị gói thành một chuỗi "một hàng hai đặc điểm" (THU HẸP); .40 đánh phanConLai sai (chữ "khác" thuộc "các chất tiêm truyền khác") |
| 701110 | DUYET | tên + công dụng nguyên văn VI "Trụ (stem) giữ dây tóc bóng đèn" (EN "Stems") |
| 701400 | DUYET | dungChoXeCoDongCo CO |
| 701590 | **TRA_VE** | "Kính đồng hồ thời gian hoặc đồng hồ cá nhân" / "Clock or watch glasses": phần tử 2 mất danh từ đầu "Kính" nên thành tên chiếc đồng hồ |
| 701710 | **TRA_VE** | SUY RỘNG: "designed for insertion into diffusion and oxidation furnaces…" là định ngữ chung của tubes và holders, bản nháp chỉ gắn cho "vòng kẹp" |
| 701810 | DUYET | "Glass beads"; tiền lệ 6915/TCHQ-TXNK (hạt bi pha lê) khớp .10 |
| 701890 | **TRA_VE** | THU HẸP: bỏ tên dòng "Mắt thủy tinh"/"Glass eyes", chỉ giữ "dạng cầu", mất "ô van hoặc tròn" và "mắt các sản phẩm thuộc Chương…"; hồi quy: bỏ vế "không có khung hoặc cơ cấu cơ khí bên ngoài" mà sổ tay NGUOI_DUYET hiện có (ngưỡng 4–36 mm còn) |
| 701980 | DUYET | hai tên nguyên văn; sổ tay cũ cùng điều kiện |
| 702000 | **TRA_VE** | .20 cùng lỗi 701710 (SUY RỘNG, MFN 0 % ↔ .90 30 %); .11/.30/.40 và nút 7020001 đúng |
| 710310 | DUYET | lưu ý: nên thêm "nephrite","jadeite" vào mảng tên (tiền lệ 3327/TB-TCHQ "Đá Ngọc bích (Đá nephrite)") |
| 710391 | DUYET | "Rubies" |
| 710410 | DUYET | "Unworked"/"Worked" chữ tự do, hai chuỗi rời nhau; khoá daGiaCong là của kim loại (wrought), không dùng được |
| 710812 | DUYET | mảng ba dạng nguyên văn |
| 711011 | DUYET | mảng bốn dạng nguyên văn |
| 711021 | DUYET | như 711011 |
| 711031 | DUYET | như 711011 |
| 711041 | DUYET | như 711011 |
| 711100 | DUYET | "clad with platinum" lặp chữ nhóm 71.11 |
| 711299 | **TRA_VE** | THU HẸP: "excluding sweepings containing other precious metals": loại trừ chỉ áp cho sweepings, bản nháp KHONG cho mọi phế liệu bạc |
| 711311 | DUYET | laBoPhan CO |
| 711319 | DUYET | laBoPhan CO |
| 711320 | DUYET | laBoPhan CO |
| 711590 | DUYET | lưu ý: .10 ["vàng","bạc"] chữ tự do không phủ định "dát phủ", nên hàng dát phủ khớp cả .10 và .20 (cùng MFN 30 %; lúc chạy không tự chốt). Nên có khoá chất liệu kim loại quý |
| 711810 | DUYET | "Silver coin" dưới 7118.10 |
| 711890 | DUYET | lưu ý: .20 nên dùng khoá `laPhapDinh` CO thay chữ tự do "loại pháp định"; trong 7118.90 tiền bạc đều pháp định nên không đổi mã |

## Lý do TRA_VE (nguyên văn đã ghi vào bản nháp)

1. **701090**: (A) 70109010 THU HẸP: VI "Bình lớn có vỏ bọc ngoài và bình thót cổ" / EN "Carboys and demijohns" là hai hàng,
   cần mảng ["Bình lớn có vỏ bọc ngoài","bình thót cổ"]. (B) 70109040 `phanConLai: true` sai.
2. **701590**: 70159010: cần ["Kính đồng hồ thời gian","kính đồng hồ cá nhân"] (hoặc tenLoai "Kính" + dungCho).
3. **701710**: 70171010 SUY RỘNG: cần tenLoai ["Ống thạch anh dùng trong lò phản ứng","vòng kẹp"] VÀ dungCho "chèn vào lò
   luyện khuếch tán và lò ôxi hóa để sản xuất tấm bán dẫn mỏng".
4. **701890**: 70189010 THU HẸP + hồi quy so với sổ tay NGUOI_DUYET (mất "không có khung hoặc cơ cấu cơ khí bên ngoài").
5. **702000**: 70200020 SUY RỘNG (như 701710), lệch MFN 0 % ↔ 30 %.
6. **711299**: 71129910 THU HẸP: loại trừ "sweepings containing other precious metals" bị mở rộng thành mọi phế liệu.

## Máy tách sai (cho `lib/ho-so/tach-ve.js`)

- 701710 / 702000 .20: `GIOI_HAN "dùng trong lò phản ứng và vòng kẹp"` cắt danh từ đầu thứ hai "vòng kẹp" (EN "holders")
  vào vế giới hạn; `GIOI_HAN "được thiết kế"` tách lìa khỏi "để chèn vào …". Đúng ra: DAU liên hợp "Ống thạch anh dùng trong lò
  phản ứng | vòng kẹp" + GIOI_HAN chung "được thiết kế để chèn vào …".
- 701090 .10: `DAU "Bình lớn"` + `GIOI_HAN "có vỏ bọc ngoài và bình thót cổ"` cắt danh từ "bình thót cổ" (EN "demijohns")
  vào vế giới hạn. Máy cũng không bắt hai tên hàng nối "và" ở đây (luật vòng 7).
- 711299 .10: `GIOI_HAN "trừ mảnh vụn có"` | `"chứa các kim loại quý khác"`: cắt đôi một cụm loại trừ.
- Cổng `cong3-phan-con-lai-khong-co-chu-khac` cho qua 70109040 chỉ vì có chữ "khác" trong "các chất tiêm truyền khác": nên
  chỉ nhận "khác" ở đầu dòng ("Loại khác", "… khác" làm danh từ đầu).

## Đo cổng 5

Cổng 5 báo 0 vế CHƯA PHỦ trên cả 43 PN6. 4/6 lỗi nằm ở vế mà cổng 5 chấm "phủ" (701710, 702000, 701090, 711299) vì bộ tách
cắt sai cụm trước khi chấm. 2 lỗi còn lại (701590, 701890) nằm ở giá trị TEN_LOAI chữ tự do mà cổng không đối chiếu được.


## Soát lại của tech lead — bo-kiem-luat hai bên

Trả về 711590,711810: gộp thử với `main` làm phát sinh ca chốt sai mới trong `bo-kiem-luat --toan-bieu` (cổng gộp không cho `chotSai`/`chotLoaiKhacSai` tăng). Mục sổ tay giữ như `main`.
