# M-13 — Chú giải 97 Chương (`data/luat-goc/chuong.jsonl`)

Nguồn duy nhất: PDF Chú giải chi tiết HS 2022 (2.409 trang), bản chữ `pdftotext -layout` giữ `\f`. Trang = thứ tự khối `\f`, script kiểm trùng số trang in trên từng trang. Không dùng AI để sinh nội dung.

Chạy lại: `python3 scripts/luat-goc/chuong.py --phang <thư mục>/chuong.txt` (tệp phẳng chỉ để tự soát); cổng: `LUAT_GOC_TXT=$HOME/luat-goc-txt node scripts/kiem-luat-goc.mjs chuong` (3 bản chữ).

## Số nút
| Loại | Số |
|---|---|
| TEN (`chuong:NN`) | 96 |
| CHU_GIAI (`cg`) | 1.198 (356 khoản, còn lại là điểm, tiểu điểm) |
| CHU_GIAI_PHAN_NHOM (`cgpn`) | 124 (76 khoản) |
| `cgbs` | 0 — PDF không có tiêu đề "Chú giải bổ sung" nào trong phần chú giải chương |
| KHAI_QUAT cấp chương (`kq`, HUONG_DAN) | 888 |
| Phân chương: tên (`pc:<LA MÃ>`, LUAT) | 33 |
| Phân chương: Tổng quát (`pc:…:kq`, HUONG_DAN) | 79 |
| **Cộng** | **2.418** |

## Kiểm
- Cổng có đối chiếu nguyên văn: **PASS, 0 lỗi, 0 cảnh báo**. Đối chiếu với 3 bản chữ `cgct-hs2022*.txt` của cổng M-01.
- **Không mất, không thừa chữ** (script dừng nếu sai): trong mỗi chương, bộ ký tự của mọi nút = bộ ký tự của vùng từ tiêu đề tới nhóm đầu tiên, trừ tiêu đề mục, dấu `***`, số trang.
- **Đối chiếu độc lập** với `pdftotext -raw` rút lại từ PDF trên Mac: 3.826/3.826 đoạn khớp, kể cả các bảng đã sửa tay.
- **Đếm chéo khoản:** bộ đếm thứ hai, thuật toán khác, chạy trên bản `-raw`: khớp 96/96 chương cho cả cg và cgpn. Đây là đếm bằng máy độc lập; phần người đọc là 12 chương ở dưới.
- Đọc cấu trúc và đầu–cuối từng nút luật (nút dài bị rút gọn giữa khi hiển thị): Ch.02, 29, 39, 51, 67, 71, 72, 76, 84, 85, 90, 95. Riêng danh sách loại trừ dài ở 39 cg 2, 71 cg 3, 90 cg 1(a–g), 95 cg 1 chỉ soát dãy điểm bằng máy. Xem ảnh trang 1072, 1605.
- Mốc đầu dòng bị bỏ (không phải điểm, đã xem): tr.22 "5);", tr.130 "22);", tr.2310 và 2353 "39);" — đuôi của "(Chương 5)"… xuống dòng.

## THIẾU / không có trong PDF
- **Chương 77: không tạo nút** (đã ghi trong khuôn). PDF không có tiêu đề, trang hay câu nào về Chương 77: tr.1616 hết Ch.76, tr.1617 bắt đầu Ch.78, mục lục tr.6 cũng bỏ qua. Kho có 96 nút tên chương.
- Không có chú giải lẫn chú giải phân nhóm: Ch.50 (tr.1151), 53 (tr.1178), 81 (tr.1631) — chỉ có Tổng quát.
- Chỉ có chú giải phân nhóm: Ch.52 (1168), 75 (1597), 76 (1605), 78 (1617), 79 (1621), 80 (1627).
- Không có Tổng quát: Ch.13 (130), 21 (226), 35 (779), 59 (1261–1263), 66 (1357), 67 (1361).
- Ch.88 (tr.2147): PDF **không in dòng "Chú giải."**, nhưng khoản 1 (phương tiện bay không người lái) in ngay dưới tên chương, trước "Chú giải phân nhóm" → `chuong:88:cg:1`.

## Phân chương
Rút tới trước nhóm kế, kể cả khi in sau nhóm đầu; script dừng nếu dãy số La Mã không liền hoặc có Phân chương ở chương lạ. Chỉ 7 chương có Phân chương. Phân chương I đứng trước nhóm đầu cũng nằm ở `pc:I`, không lặp ở `kq` cấp chương. Không có dòng Tổng quát thì chỉ có nút tên.

| Ch. | Phân chương (trang) | Nút Tổng quát |
|---|---|---|
| 28 | I (339), II (350), III (362), IV (368), V (386), VI (440) | 22 |
| 29 | I (480), II (496), III (501), IV (505), V (511), VI (515), VII (520), VIII (534), IX (538), X (556), XI (578), XII (629), XIII (637) | 30 |
| 39 | I (892), II (909) | 0 |
| 63 | I (1325), II (1334), III (1335) | 0 |
| 69 | I (1391), II (1395) | 15 |
| 71 | I (1457), II (1466), III (1475) | 0 |
| 72 | I (1509), II (1516), III (1534), IV (1537) | 12 |

Ch.63 in "Phân chương 1" (số Ả Rập, tr.1325): id `pc:I`, `so` giữ "1". Ch.29 in "Phân-Chương IX" (tr.538).

## Quy ước chọn (khuôn chưa nói rõ)
1. Nút cha chỉ giữ lời dẫn và đoạn kết của chính nó; điểm nằm ở nút con. 21 nút có đoạn đứng **sau** nút con: trường thêm `doanSau: [{sauNut, tu}]` (`tu` = vị trí bắt đầu đoạn trong `nguyenVan`). Muốn đọc đúng thứ tự phải dùng trường này.
2. Khối thứ hai không in số trong cùng khoản (danh sách (a)(b) mở lại, hoặc đoạn kết không tách được): `cg:N:2`, `so: null`: `34:cg:5:2` (tr.763), `48:cg:5:2` (tr.1069), `59:cg:5:2` (tr.1262). Con của khối: `48:cg:5:2:a`. Số `2` là thứ tự khối, không phải số in.
3. Điểm in `1.` `2.` lồng trong điểm: `cg:5:a:1`, `so` ghi dạng `5(a)(1)`.
4. Số có mốc kép trên một dòng (`6. (A)`, `3. (a)`, `(a) (i)`): nút cha chỉ có chữ "6."/"3."/"(a)".
5. "Chú giải phân nhóm" in **sau** Tổng quát (Ch.2 tr.16, 39 tr.888, 60 tr.1280, 61 tr.1290, 62 tr.1311) và "Chú giải chi tiết phân nhóm" cấp chương (44 tr.984, 48 tr.1073) là lời giải thích → `kq`, HUONG_DAN, không phải `cgpn`.
6. Gạch đầu dòng `-` không có số → giữ trong nút chứa nó, xuống dòng.
7. Ch.25 khoản 2 in "(i)" thay "(ij)" → id theo chữ in: `25:cg:2:i`.

## Sửa tay (`scripts/luat-goc/chuong-sua-tay.py`, mỗi mục có trang + lý do)
- SUA (chỉ xếp lại thứ tự chữ đầu bảng, script kiểm cùng bộ ký tự): tr.103, 104 (Ch.11), 1072, 1073, 1074 (Ch.48), 1581 (Ch.74), 1605 (Ch.76).
- DOI: tr.103, 1605, 1697 "(1)" không phải điểm; tr.103 bảng thuộc cả khoản 2; tr.1262 khối 59:cg:5:2.
- GIU/TOI: 17 chỗ đoạn in sát lề trái thuộc điểm nào (Ch.11, 61, 62, 72, 74, 75, 76, 79, 80, 84, 85).
- Ch.33 tr.748: bỏ hai dòng đầu trang mất dấu "Chuong 33: Tinh dau va cac chat tua nhua; nuoc hoa, / my pham"; tên lấy dòng chữ hoa có dấu ngay dưới.
- Dòng hết bằng `chữ-` nối không cách (azinphos-methyl, Đi-ốt), trừ khi dòng sau bắt đầu "hoặc"/"và".

## Bảng trong chú giải (giữ chữ theo hàng, hai dấu cách giữa cột)
`11:cg:2` (tr.103–104, đầu bảng in lặp ở tr.104), `48:cgpn:1` (1071), `48:cgpn:2:b` (1072), `74:cg:1:a` (1581), `75:cgpn:1:a` (1597, **bảng in tiếng Anh**), `76:cgpn:1:a` (1605), `78:cgpn:1` (1617), `80:cgpn:1:a` (1627). Trong khái quát còn bảng ở Ch.48 (1073–1074) và một số chương kim loại, chưa xếp lại.

## Chỗ nghi ở bản PDF (giữ nguyên chữ, cần QT đối chiếu bản khác)
- tr.1605: tên in "Chương 76: **Nhóm** và các sản phẩm bằng nhôm"; bảng in dính "1 0.1(2)" một hàng (1 là của Fe+Si, 0.1(2) là của nguyên tố khác).
- tr.1697 `84:cgpn:3`: "(1)" lạc giữa câu. tr.1495 `72:cg:1`: "trong các Chú giải (d), (e) và (f) của Danh mục" (lủng câu, có lẽ là "đối với (d), (e), (f) trong toàn Danh mục").
- tr.2166 `90:cg:5`: in "Tuy nhiên, theo Chú giải này…" ở đầu khoản. tr.812 `38:cgpn`: thiếu dấu `;` sau "endosulfan (ISO)".
- tr.310/471…: `29:kq` có "29.01, 29,02." rồi xuống dòng "29.07, và 29.33." (PDF gõ sai dấu).
- `90:cg:1:l` (2166) thiếu dấu `;`; `84:cg:6` và `85:cg:12` sâu tới 5 tầng.

## So với kho cũ (chỉ để bắt lệch)
**`data/chu-giai-chuong.json` `.chuong`**: cùng bản PDF. Không khoản nào mới/mất. Khác: thứ tự chữ trong bảng ở `11:cg:2` (103), `48:cgpn:2:b` (1072), `74:cg:1:a` (1581), `76:cgpn:1:a` (1605) và bảng `48:kq` (1073–1074); dòng mất dấu Ch.33 (748). Lỗi của kho cũ là **gộp luật và khái quát một chuỗi**. Ch.39–40: phần lấy ở đây bắt đầu tr.872 và 919, không có chữ Phần VI (chỗ dính của #1896 nằm ở `.phan`).

**`data/luat/dieu-khoan-tang2.json` + `dieu-khoan-bo-sung.json`** (bảng điều khoản, 422 khoản cấp chương so với 432 ở đây):
- **Thiếu 10 khoản có trong PDF:** 02 cg 1 (14), 38 cg 4 (810–812), 51 cg 1 (1156), 56 cg 2 (1210), 60 cgpn 1 (1278), 63 cgpn 1 (1324), 67 cg 1–3 (1361), 82 cg 2 (1646). Không khoản nào dư.
- **361 dòng điểm mang nhãn chú giải/chú giải phân nhóm nhưng chữ nằm ở Tổng quát** (200 `chu_giai`, 161 `chu_giai_phan_nhom`), ví dụ `chuong:03:chu_giai:3a…d`, `chuong:04:chu_giai_phan_nhom:2a…`, `chuong:61:chu_giai:10d`, `chuong:90:chu_giai:7…`. Nguyên nhân: không cắt ở dòng "TỔNG QUÁT". Trong bảng này chúng đang là luật.
- 26 dòng luật khác dính thêm đoạn kết, bảng, hoặc chữ Tổng quát ở cuối.

**`data/notes.json`** (biểu thuế song ngữ): cột Việt/Anh trộn dòng, không dùng để đếm được.

## Khuôn/cổng cần QT xem
- Khuôn đã có id Phân chương, `doanSau` và ghi chú Ch.77. Cổng chỉ soát câu ≥12 ký tự có tồn tại đâu đó trong PDF, không soát đúng trang; đã bù bằng kiểm trong script.

## Từng chương
| Ch. | Trang | Khoản cg | Nút cg | Khoản cgpn | Nút cgpn | kq | pc (tên + kq) |
|---|---|---|---|---|---|---|---|
| 01 | 9–9 | 1 | 4 | 0 | 0 | 2 | |
| 02 | 14–16 | 1 | 5 | 0 | 0 | 19 | |
| 03 | 22–23 | 3 | 7 | 0 | 0 | 9 | |
| 04 | 41–43 | 6 | 15 | 2 | 2 | 5 | |
| 05 | 51–51 | 4 | 8 | 0 | 0 | 2 | |
| 06 | 62–62 | 2 | 2 | 0 | 0 | 2 | |
| 07 | 66–67 | 5 | 9 | 0 | 0 | 11 | |
| 08 | 77–79 | 4 | 6 | 0 | 0 | 11 | |
| 09 | 88–89 | 2 | 4 | 0 | 0 | 8 | |
| 10 | 97–97 | 2 | 4 | 1 | 1 | 2 | |
| 11 | 103–105 | 3 | 15 | 0 | 0 | 3 | |
| 12 | 113–114 | 5 | 15 | 1 | 1 | 4 | |
| 13 | 130–130 | 1 | 11 | 0 | 0 | 0 | |
| 14 | 140–140 | 3 | 3 | 0 | 0 | 2 | |
| 15 | 149–152 | 4 | 10 | 2 | 2 | 18 | |
| 16 | 179–181 | 2 | 2 | 2 | 2 | 4 | |
| 17 | 188–188 | 1 | 4 | 2 | 2 | 2 | |
| 18 | 196–197 | 2 | 4 | 0 | 0 | 2 | |
| 19 | 201–202 | 4 | 11 | 0 | 0 | 3 | |
| 20 | 213–215 | 6 | 11 | 3 | 3 | 3 | |
| 21 | 226–226 | 3 | 11 | 0 | 0 | 0 | |
| 22 | 238–238 | 3 | 9 | 1 | 1 | 3 | |
| 23 | 250–250 | 1 | 1 | 1 | 1 | 2 | |
| 24 | 262–263 | 3 | 3 | 1 | 1 | 9 | |
| 25 | 269–271 | 4 | 14 | 0 | 0 | 3 | |
| 26 | 296–298 | 3 | 12 | 2 | 2 | 12 | |
| 27 | 309–310 | 3 | 9 | 5 | 5 | 3 | |
| 28 | 331–339 | 8 | 32 | 1 | 1 | 65 | 6 + 22 |
| 29 | 468–479 | 8 | 37 | 2 | 2 | 56 | 13 + 30 |
| 30 | 683–685 | 4 | 32 | 2 | 7 | 2 | |
| 31 | 705–707 | 6 | 34 | 0 | 0 | 4 | |
| 32 | 715–716 | 6 | 11 | 0 | 0 | 5 | |
| 33 | 748–749 | 4 | 7 | 0 | 0 | 6 | |
| 34 | 762–763 | 5 | 18 | 0 | 0 | 2 | |
| 35 | 779–779 | 2 | 8 | 0 | 0 | 0 | |
| 36 | 793–793 | 2 | 5 | 0 | 0 | 4 | |
| 37 | 802–803 | 2 | 2 | 0 | 0 | 6 | |
| 38 | 810–814 | 7 | 33 | 4 | 4 | 5 | |
| 39 | 872–891 | 11 | 52 | 2 | 10 | 85 | 2 + 0 |
| 40 | 919–924 | 9 | 28 | 0 | 0 | 13 | |
| 41 | 952–954 | 3 | 8 | 0 | 0 | 14 | |
| 42 | 965–966 | 4 | 20 | 0 | 0 | 3 | |
| 43 | 974–975 | 5 | 11 | 0 | 0 | 3 | |
| 44 | 981–984 | 6 | 23 | 4 | 4 | 9 | |
| 45 | 1050–1050 | 1 | 4 | 0 | 0 | 5 | |
| 46 | 1055–1056 | 3 | 8 | 0 | 0 | 4 | |
| 47 | 1062–1063 | 1 | 1 | 0 | 0 | 7 | |
| 48 | 1068–1081 | 12 | 52 | 7 | 9 | 51 | |
| 49 | 1111–1113 | 6 | 13 | 0 | 0 | 8 | |
| 50 | 1151–1151 | 0 | 0 | 0 | 0 | 3 | |
| 51 | 1156–1156 | 1 | 4 | 0 | 0 | 2 | |
| 52 | 1168–1168 | 0 | 0 | 1 | 1 | 2 | |
| 53 | 1178–1178 | 0 | 0 | 0 | 0 | 3 | |
| 54 | 1188–1191 | 2 | 4 | 0 | 0 | 15 | |
| 55 | 1199–1199 | 1 | 6 | 0 | 0 | 5 | |
| 56 | 1210–1211 | 4 | 13 | 0 | 0 | 1 | |
| 57 | 1227–1227 | 2 | 2 | 0 | 0 | 4 | |
| 58 | 1235–1236 | 7 | 10 | 0 | 0 | 2 | |
| 59 | 1261–1263 | 8 | 40 | 0 | 0 | 0 | |
| 60 | 1278–1280 | 3 | 6 | 1 | 1 | 12 | |
| 61 | 1286–1290 | 10 | 19 | 0 | 0 | 12 | |
| 62 | 1307–1311 | 10 | 18 | 0 | 0 | 11 | |
| 63 | 1324–1325 | 3 | 13 | 1 | 1 | 5 | 3 + 0 |
| 64 | 1339–1342 | 4 | 14 | 1 | 3 | 7 | |
| 65 | 1350–1350 | 2 | 5 | 0 | 0 | 4 | |
| 66 | 1357–1357 | 2 | 5 | 0 | 0 | 0 | |
| 67 | 1361–1361 | 3 | 14 | 0 | 0 | 0 | |
| 68 | 1367–1368 | 2 | 15 | 0 | 0 | 6 | |
| 69 | 1388–1390 | 2 | 17 | 0 | 0 | 13 | 2 + 15 |
| 70 | 1409–1411 | 5 | 19 | 1 | 1 | 10 | |
| 71 | 1452–1457 | 11 | 38 | 3 | 3 | 13 | 3 + 0 |
| 72 | 1495–1509 | 3 | 18 | 2 | 7 | 43 | 4 + 12 |
| 73 | 1542–1542 | 2 | 2 | 0 | 0 | 6 | |
| 74 | 1581–1585 | 1 | 6 | 1 | 5 | 13 | |
| 75 | 1597–1599 | 0 | 0 | 2 | 9 | 7 | |
| 76 | 1605–1607 | 0 | 0 | 2 | 6 | 16 | |
| 78 | 1617–1618 | 0 | 0 | 1 | 1 | 10 | |
| 79 | 1621–1623 | 0 | 0 | 1 | 4 | 11 | |
| 80 | 1627–1629 | 0 | 0 | 1 | 5 | 11 | |
| 81 | 1631–1631 | 0 | 0 | 0 | 0 | 5 | |
| 82 | 1646–1649 | 3 | 7 | 0 | 0 | 12 | |
| 83 | 1667–1667 | 2 | 2 | 0 | 0 | 2 | |
| 84 | 1693–1701 | 11 | 58 | 4 | 4 | 18 | |
| 85 | 1970–1978 | 12 | 44 | 5 | 5 | 9 | |
| 86 | 2102–2104 | 3 | 13 | 0 | 0 | 7 | |
| 87 | 2116–2117 | 4 | 4 | 1 | 3 | 6 | |
| 88 | 2147–2147 | 1 | 1 | 2 | 2 | 2 | |
| 89 | 2156–2157 | 1 | 1 | 0 | 0 | 5 | |
| 90 | 2165–2171 | 7 | 25 | 0 | 0 | 25 | |
| 91 | 2287–2290 | 4 | 11 | 0 | 0 | 16 | |
| 92 | 2310–2311 | 2 | 7 | 0 | 0 | 6 | |
| 93 | 2326–2327 | 2 | 8 | 0 | 0 | 6 | |
| 94 | 2336–2339 | 4 | 20 | 0 | 0 | 11 | |
| 95 | 2353–2356 | 6 | 32 | 1 | 3 | 4 | |
| 96 | 2370–2371 | 4 | 18 | 0 | 0 | 2 | |
| 97 | 2398–2399 | 6 | 11 | 0 | 0 | 4 | |
