# M-14 Chú giải chi tiết 1.228 nhóm

Kho: `data/luat-goc/nhom.jsonl`. Script tất định: `scripts/luat-goc/nhom-tach.py`. Nguồn duy nhất: bản chữ pdftotext của "Chú giải chi tiết HS 2022 Toàn tập" (`~/luat-goc-txt/cgct-hs2022.txt`, trang = khối `\f`, từ 1); mã nhóm đối chiếu `data/tax.json`. Không mạng, không AI, không đọc kết quả AI.

```
python3 scripts/luat-goc/nhom-tach.py ~/luat-goc-txt/cgct-hs2022.txt            # ghi nhom.jsonl + tự kiểm
python3 scripts/luat-goc/nhom-tach.py ~/luat-goc-txt/cgct-hs2022.txt --doi-chieu # thêm đối chiếu kho cũ .nhom
LUAT_GOC_TXT=~/luat-goc-txt node scripts/kiem-luat-goc.mjs nhom                 # cổng
```

Chạy lại hai lần ra cùng một tệp (đã đối chiếu byte). Script KHÔNG ghi `nhom.txt` vào `~/luat-goc-txt/` để cổng đọc thẳng bản chữ gốc, tránh đối chiếu vòng.

## Số đếm
- **1.231 nút / 1.228 nhóm** — đủ 1.228 nhóm có `.nhom` trong kho cũ, không thiếu, không thừa. Ba nhóm có 2 đoạn in discontinuous: `nhom:2937:ct:2` (thân in tiếp sau phụ lục tiếng Anh, trang 625–628), `nhom:7212:ct:2` và `nhom:7217:ct:2` (đoạn không nêu mã phân nhóm, QT chỉ định ở #1902).
- 41 nhóm trong biểu không có nút, đều là nhóm 98xx — bản in không có chú giải cho các nhóm này (kho cũ cũng rỗng). Chương 77 để dự phòng: bản in không có chữ, không tạo nút (đúng khuôn).
- 20 nhóm chỉ được in tham chiếu `[NN.NN]` không kèm chữ (6503, 6908, 7012, 7414, 7416, 7417, 7803, 7805, 7906, 8004, 8005, 8006, 8469, 8520, 8803, 9009, 9203, 9204, 9501, 9502 — trang 1353, 1402, 1425, 1594, 1619, 1620, 1625, 1630, 1912, 2029, 2150, 2191, 2313, 2356): các mã này không còn trong biểu hiện hành, kho cũ cũng rỗng ⇒ **THIẾU theo bản in, không bịa nút**.
- Nút ngắn nhất: `nhom:2716:ct:1` = "Không chú giải." (trang 326, nguyên văn bản in); `nhom:7613:ct:1` = "Xem chú giải nhóm 73.11". 907 nút trải hơn 1 trang (có `nguon.trangDen`).

## Cách cắt
- Tiêu đề nhóm nhận đủ các dạng in: `10.01 -`, `29.41-` (dính gạch), `38.13- -`, `90.20 -Máy…`, `29.31.` (chấm), `38.07 `, `74.04 ` (không dấu nối), `8706 -` (in mã 4 số). Dạng không dấu nối buộc có dấu tiếng Việt để không nhặt dòng mã và dòng bảng tiếng Anh.
- **Chống giả tiêu đề**: bản in xếp nhóm theo thứ tự tăng dần trong từng chương nên tiêu đề chỉ được nhận khi nối tiếp thứ tự (cùng chương, mã lớn hơn nhóm vừa in; nhóm đầu chương sau dòng "Chương N:"). Điều này chặn dòng văn bản như "85.15. Những máy được thiết kế chỉ dùng để cắt…" (trang 1910, tham chiếu nhóm đứng đầu dòng) giả làm tiêu đề — nếu không sẽ cắt hỏng 8468/8514/8515.
- **Danh sách mã HS ngay sau tiêu đề thuộc M-18**: bỏ qua dòng mã 6 số (các dạng `1001.11 - -`, `29.38.10 -`, `7607 11`, `3209 90`), dòng mức `- Loại khác:`, và dòng nối tiếp viết thường của chúng. Thân bắt đầu tại dòng viết hoa/`(` đầu tiên sau đó.
- **Khối "Chú giải [chi tiết] phân nhóm" thuộc M-15** (kể cả `Chú giải Phân nhóm` viết hoa lẫn lộn, trang 1163; và khối không có dòng tiêu đề 6903/9030 bắt đầu thẳng bằng "Phân nhóm NNNN.NN"): cắt trước tiêu đề khối và trước dòng mã phân nhóm. Đoạn không nêu mã phân nhóm nào: 72.12 (trang 1528) và 72.17 (trang 1534) nhận vào nút nhóm theo chỉ dẫn QT; đoạn "Với mục đích của các phân nhóm thuộc nhóm 72.10" (trang 1525) tự nêu phạm vi nên M-15 đã nhận (có nút `pn:7210xx`), không nhận ở đây.
- Cắt trước Chương/PHẦN/Phân chương/TỔNG QUÁT/"Chú giải." của chương (M-11/M-13), trước `[NN.NN]`, trước phụ lục tiếng Anh. "Chuong 33" (trang 748, bản in thiếu dấu) vẫn nhận là biên giới chương.
- Dòng số trang chỉ bỏ ở đầu/cuối trang — **đúng như `phang()` của cổng**; mọi dòng giữa trang (kể cả ô số của bảng, trang 927–928) và dấu trang trí `*`, `***` được giữ nguyên văn, để đối chiếu từng câu khớp liền mạch.

## Tiêu đề nhóm ở đâu trong nút
`so` = nguyên văn dòng tiêu đề (đã nối dòng ngắt); `nguyenVan` = thân đoạn. Lý do: tiêu đề và thân bị danh sách mã HS chen giữa trong bản in, gộp lại sẽ làm câu đầu trespass qua danh sách mã và rơi ở bước đối chiếu nguyên văn từng câu của cổng (70 nút đỏ khi thử gộp). Mã nhóm đã có trong `id` (`nhom:NNNN:ct:N`), phạm vi đoạn vẫn trọn từ tiêu đề (nằm trong nút, ở `so`) đến trước nhóm kế tiếp.

## Phụ lục tiếng Anh tách riêng (KHÔNG vào nguyenVan)

| Nhóm | Trang | Dòng mở đầu | Nội dung |
|---|---|---|---|
| 29.37 | 595–625 | `List of steroids used primarily for their hormone function*` | bảng steroid + LIST OF NARCOTIC DRUGS AND PSYCHOTROPIC SUBSTANCES + bảng Name/HS subheading/CAS No.; thân nhóm in tiếp ở mục (C) trang 625 → `ct:2` |
| 29.42 | 642–682 | `LIST OF PRECURSORS AND ESSENTIAL CHEMICALS…` | bảng tiền chất cuối Chương 29, tới trước "Chương 30" |
| 33.07 | 759–761 | `ANNEX` (List of the principal essential oils… of heading 33.01) | danh sách tinh dầu cuối Chương 33, tới trước "Chương 34" |
| 44.21 | 1014–1049 | `ANNEX` (APPELLATION OF CERTAIN TROPICAL WOODS) | bảng tên gỗ nhiệt đới (kèm "Ghi chú:" tiếng Việt của chính phụ lục), tới trước "Chương 45" |
| 71.18 | 1482–1487 | `PHỤ LỤC` | bảng đá quý/bán quý song ngữ, tới trước "Chương 72" |

## Sửa tay (trong `sua_tay()` của script, mỗi mục có trang + lý do, không đổi chữ văn bản gốc)
- **7302**: tiêu đề in `37.02-` tại trang 1543 giữa Chương 73 — lỗi in của nhóm 73.02 (danh sách mã ngay dưới là 7302.10/30/40/90; nhóm 37.02 thật ở trang 804). Giữ nguyên dòng in trong `so`, nút là `nhom:7302`, kèm `ghiChu`.
- **9029**: tiêu đề in `90.20 -Máy đếm…` tại trang 2263 sau nhóm 90.28 — lỗi in của nhóm 90.29 (danh sách mã 9029.10/90; nhóm 90.20 thật ở trang 2226). Như trên.
- **2937**: dòng `(C) PROSTAGLANDINS…` trang 625 chấm dứt vùng phụ lục, mở `ct:2`.
- **7212/7217**: nhận đoạn không nêu mã làm `ct:2` kèm `ghiChu` chỉ dẫn QT.

## Chỗ nghi trong bản in (chép nguyên, không sửa)
- 2716 in "(nhóm không bắt buộc)" trong tên nhóm; 7613 thân chỉ là câu viện dẫn "Xem chú giải nhóm 73.11"; 6911 "Xem phần chú giải chi tiết của nhóm 69.12."
- Bảng cao su 40.01 (trang 927–928) in lặp dòng tiêu đề bảng ở đầu trang 928; bảng 28.05 (họ đất hiếm) in cột dọc từng ô một dòng — giữ nguyên bố cục dòng của bản chữ.

## Đối chiếu kho cũ `data/chu-giai-heading.json` `.nhom`
- **Đủ**: 1.228 nhóm cũ có `.nhom` ⇔ 1.228 nhóm có nút; chiều ngược lại 0 nhóm mới thừa.
- **"Mới có, cũ không": 0 câu** — kho mới không có câu nào không thấy trong kho cũ.
- "Cũ có, mới không": 205/1.228 nhóm (16,7%) có câu của kho cũ không thấy trong kho mới — **toàn bộ rơi vào 6 lý do có căn cứ** (định vị từng câu về vùng bản chữ):

| Lý do | Số câu | Ghi chú |
|---|---|---|
| Khối "Chú giải phân nhóm" (tiêu đề + nội dung) | 309 + 256 | thuộc M-15 (PR #1925) |
| Phụ lục tiếng Anh | 479 + 48 | 5 vùng bảng trên |
| Khái quát Phân chương dính vào nhóm trước | 120 | thuộc M-13 (PR #1927) |
| Kho cũ dính chữ nhóm khác | 70 | 2938 chứa 67 câu của 29.39 (QT đã chỉ ở #1902: "đoạn 29.39 nằm ở 2938, đoạn 29.37 nằm ở 2939"); 7017 chứa 2 câu của 70.18; 6308 chứa 1 câu tên Phần |
| Danh sách mã HS (M-18) dính trong cũ | 3 | 2934/5407/6305 |
| Văn bản cũ không có trong bản chữ (trích bảng khác trật tự cột) | 129 | 125 câu bảng gỗ 4421; còn lại bảng 28.05, công thức 2837/2921/7118 — đều CÓ trong nút mới theo đúng trật tự dòng bản chữ (đã soát) | 

- **Lệch không giải thích được: 0 nhóm (0%)** — dưới ngưỡng 1%.
- Kho cũ còn gắn lệch nội dung phân nhóm cho 5402 (tên nhóm 54.03), 7118 (phụ lục đá quý), 7415 ("[74.16] [74.17]") — bản mới cắt đúng theo bản in.

## Kiểm
- Cổng: `LUAT_GOC_TXT=~/luat-goc-txt node scripts/kiem-luat-goc.mjs nhom` → **PASS, 1.231 nút, 0 lỗi, 0 cảnh báo, đối chiếu 3 bản chữ** (cgct-hs2022.txt, -layout, -raw).
- Tự kiểm trong script: mọi dòng của mọi nút nằm trong bản chữ đúng thứ tự (chỉ bỏ dòng số trang đầu/cuối trang) — PASS.
- `npm test`: exit 0, `=== ALL TESTS PASSED ===`. Không viết bài kiểm mới (thẻ M-01/M-15 cùng lớp cũng chỉ dùng cổng `kiem-luat-goc.mjs`); không đụng `scripts/danh-sach-test.txt`.

## Tiến độ
- 2026-11-25: nhận thẻ, dựng `nhom-tach.py` + `nhom.jsonl` 1.231 nút/1.228 nhóm, cổng PASS 0 lỗi 0 cảnh báo, đối chiếu kho cũ xong (0 lệch không lý do), mở PR nháp.
