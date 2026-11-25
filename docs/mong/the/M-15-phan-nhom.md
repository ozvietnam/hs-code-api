# M-15 Chú giải chi tiết phân nhóm

Kho: `data/luat-goc/phan-nhom.jsonl`. Script tất định: `scripts/luat-goc/phan-nhom.py`, sửa tay `phan-nhom-sua-tay.py`, đối chiếu `phan-nhom-doi-chieu.py`. Nguồn duy nhất: PDF chú giải chi tiết HS 2022, bản chữ `pdftotext -layout` (trang = khối `\f`, từ 1).

```
python3 scripts/luat-goc/phan-nhom.py ~/luat-goc-txt/cgct-hs2022.txt --phang <tm>
LUAT_GOC_TXT=<tm> node scripts/kiem-luat-goc.mjs phan-nhom
python3 scripts/luat-goc/phan-nhom-doi-chieu.py ~/luat-goc-txt/cgct-hs2022.txt
```

## Số đếm
- 251 khối → **482 nút**, 466 phân nhóm, **167 nhóm**. 316 nút thuộc khối áp chung (`apChung`). 16 nút là khối thứ hai của cùng phân nhóm (`ct:2`).
- Cổng: **PASS**, 0 lỗi, 0 cảnh báo, có đối chiếu nguyên văn. Kiểm thêm: cả 482 nguyên văn khớp liền mạch với bản chữ (không phải nhờ khớp từng câu); tiêu đề khối nằm đúng trang đã ghi, 482/482.
- Mã nút: tiêu đề khối in kèm trong `nguyenVan` và ở `so`. Khoảng "từ A đến B" trải ra các phân nhóm có thật trong `data/tax.json` (9 khoảng: 2921.42–49, 2922.11–50, 2937.11–19, 3204.11–19, 3808.91–99, 5402.31–39, 8549.11–19, 8701.21–29, 8701.91–95). `trang` là trang của tiêu đề khối.
- Trường thêm ngoài khuôn: `apChung`; `ghiChu` (mã in không có trong biểu); `thieu` (hình, công thức không có lớp chữ).

## Đối chiếu dấu (+)
136 nhóm có (+) ở tên nhóm (không có (+) nào ở dòng mã 6 số; 7 dòng "(+)" khác là tên hoá chất hoặc "điện tích dương", trang 606, 608, 619, 681, 682, 767). 133 nhóm có nút. Ba nhóm không có nút:

| Nhóm | Kết luận | Trang đã xem |
|---|---|---|
| 3006 | **THIẾU trong nguồn**: hết chú giải nhóm là sang Chương 31, không có đoạn phân nhóm | 699–704 (trang 704 xem ảnh) |
| 8462 | **THIẾU trong nguồn**: sau phần loại trừ (a)–(h) là nhóm 84.63 | 1889–1896, không có ảnh nhúng |
| 7217 | Có tiêu đề và một câu, **không nêu mã**; xem mục dưới | 1533–1534 |

Sáu nhóm nêu trong phiếu:

| Nhóm | Kết luận |
|---|---|
| 2937 | Có. Trang 629, "từ 2937.11 đến 2937.19" → 3 nút |
| 3006 | THIẾU trong nguồn, trang 699–704 |
| 6903 | Có. Trang 1395, 6903.10; bản in không có dòng "Chú giải phân nhóm" |
| 6907 | Có. Trang 1401, 6907.40; chỉ một câu dẫn, nội dung là hình ở trang 1402 (ghi `thieu`) |
| 8462 | THIẾU trong nguồn, trang 1889–1896 |
| 9030 | Có. Trang 2273, 9030.82; bản in không có dòng "Chú giải phân nhóm" |

34 nhóm có khối mà bản in không có (+): 0305 0406 0505 0713 0801 1007 1008 1507 2508 2515 2932 2939 3204 3301 3824 4015 4202 4403 4406 4412 6110 6115 6305 6310 6601 7102 7103 7228 7326 8458 8476 8517 8705 9504. Vì vậy (+) không đủ để tìm; đường chính là tiêu đề khối.

## Đoạn không nêu mã (không tạo nút, chờ QT quyết)
- Trang 1528, nhóm 72.12: "Xem Chú giải cho các phân nhóm thuộc nhóm 72.10 đối với các sản phẩm đã chịu nhiều hơn một quá trình bọc, phủ, hoặc mạ."
- Trang 1534, nhóm 72.17: "Xem chú giải cho các phân nhóm thuộc nhóm 72-10 đối với những sản phẩm đã qua trên một qui trình trong các qui trình phủ, bọc, mạ."
- Trang 1525, nhóm 72.10: "Với mục đích của các phân nhóm thuộc nhóm 72.10, …" tự nêu phạm vi → gắn đủ phân nhóm của 72.10 (không có `so`).

## Mã in không có trong biểu (giữ nút theo mã in, có `ghiChu`; không gán sang mã khác)
| Mã in | Trang | Nhận xét |
|---|---|---|
| 4418.71 | 1008 | mã cũ (sàn khảm); biểu hiện có 4418.73/74/75/79 |
| 8458.61 | 1884 | in trong khối của nhóm 84.59; nghi lỗi in của 8459.61 |
| 8460.11, 8460.21 | 1886 | mã cũ; khối về "điều khiển số" |

## Chỗ nghi trong bản in (chép nguyên, không sửa)
- 990: "Các phân nhóm 4406.11 và 4406.92", nghi cặp in sai (không có căn cứ trong nguồn để sửa).
- 1858: 8450.11 kết thúc bằng dấu phẩy. 637, 1329, 1594, 1637, 1866, 2022, 2222: câu cuối thiếu dấu chấm.
- 568, 575, 641: dấu `*` sau chữ, không có chú thích chân tương ứng.
- 1445, 2280: tiêu đề in "Subheading 7019.64", "Subheading 9031.41". 324: "27.14.10"; 1087: "4805. 40"; 1611: "7607 11".

## Sửa tay (tệp sửa tay, có lý do)
- 629: cắt "(*) Nếu một tên được sử dụng trong Danh mục chung quốc tế…", là chú thích của "Danh mục các sản phẩm … nhóm 29.37(*)".
- 1395, 2273: hai khối không có dòng tiêu đề "Chú giải phân nhóm". 1525/1528/1534: như trên.
- 1482: kết khối 7118.10 trước "PHỤ LỤC" (luật chung, không phải sửa riêng).

## Hình, công thức không có lớp chữ (`thieu`)
5607.21 (trang 1224, đọc từ ảnh: R = 17.400/n - 18), 5607.41 (trang 1225: R = 32.400/n), 6907.40 (1402), 4011.70 và 4011.80 (943–944), 4418.71 (1009), 5801.22/32 (1238). 70.19 (1441–1448): ảnh chụp minh hoạ, không gắn `thieu`.

## So với kho cũ `chu-giai-heading.json`
Kho cũ có đoạn phân nhóm ở 166 nhóm; 179 nhóm nếu đếm cả chỗ chỉ viện dẫn "Chú giải phân nhóm".
- Cũ không có, mới có: 2937, 6903, 9030.
- **Kho cũ gắn lệch**: đoạn của 29.39 (2939.72…) nằm ở nhóm 2938; đoạn của 29.37 nằm ở nhóm 2939. Kho mới theo mã in.
- Kho cũ dính thêm: 5402 (tên nhóm 54.03), 7118 (phụ lục đá quý), 7415 ("[74.16] [74.17]"), 7217 (phần sau).
- Không câu nào khác của kho cũ vắng trong kho mới, trừ 72.12 và 72.17 ở trên.

## Không lấy (thuộc M-11, M-13)
47 khối "Chú giải phân nhóm" đứng ở Phần/Chương. Trong đó 9 khối là **giải thích chi tiết** ở phần khái quát (không phải chú giải pháp lý), M-11/M-13 cần nhận để không rơi: trang 16 (Ch. 2), 888 (Ch. 39), 984 (Ch. 44, gỗ nhiệt đới), 1073 (Ch. 48), 1145 và 1148 (Phần XI), 1280 (Ch. 60, nêu 6005.21–6005.44 và 6006.21–6006.44), 1290 (Ch. 61), 1311 (Ch. 62).

## Khuôn
Khuôn chưa có chỗ cho `apChung`, `ghiChu`, `thieu` và trang cuối của khối nhiều trang. Cổng hiện bỏ qua trường lạ. Không tự sửa khuôn.

## Đọc tay
Đã đọc toàn bộ 251 khối ở bản chữ; đọc kỹ 30 khối chọn ngẫu nhiên (hạt 15) ở bản JSON, không thấy lỗi nối dòng, dính nhóm sau hay sai trang. Ảnh trang đã xem: 629, 704, 944, 946, 1224, 1225, 1402, 1446.
