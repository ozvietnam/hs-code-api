# M-18 — Tên trong biểu thuế (`data/luat-goc/bieu.jsonl`)

Nguồn: `data/bieu-thue/2026.04.05` (tệp BIEU-THUE-XNK-2026.04.05.xlsx, sheet BT2026, trích nguyên văn). Cây dựng từ **từng dòng của biểu theo số gạch in**, không suy từ chữ số. Không dùng AI để sinh nội dung.

Chạy lại (tất định, hai lần cùng sha256):
- `node scripts/luat-goc/bieu.mjs --cgct $HOME/luat-goc-txt --txt <thư mục riêng>` sinh kho và `bieu.txt`.
- `LUAT_GOC_TXT=<thư mục riêng> node scripts/kiem-luat-goc.mjs bieu`
- `node scripts/luat-goc/bieu-doi-chieu.mjs --cgct $HOME/luat-goc-txt --chi-tiet <tệp.json>`: bất biến, bản in, hs-tree, cổng Hải quan.

## Số nút
| `cap` | Số | Ghi chú |
|---|---|---|
| CHUONG | 97 | 96 chương + Chương 98; Chương 77 để dự phòng, không tạo nút (khuôn). `cha` = null |
| NHOM | 1.269 | đủ; `cha` = `bieu:<chương>` |
| PHAN_NHOM | 5.786 | đủ 5.784 có dòng 8 số + 9849.17, 9849.19 (biểu có dòng phân nhóm, dòng dưới in hỏng mã) |
| TIEU_DE_PHAN_NHOM | 1.028 | tiêu đề không mã phủ nhiều phân nhóm ("- Bằng thép không gỉ:") |
| TIEU_DE_QUOC_GIA | 1.423 | tiêu đề không mã trong một phân nhóm (kể cả "tầng" của `lib/hs-tree.js`: 314, trường `tang`) |
| DONG | 11.871 | đủ |
| DONG_THIEU_MA | 4 | 9849.17 (3 dòng), 9849.19 (1 dòng): biểu in mã 7 chữ số `9849170`, `9849190`; không đoán mã; `data/tax.json` cũng không có |
| **Cộng** | **21.478** | |

Cờ: `sen` 1.086 · `loaiKhac` 5.185 (trong đó `loaiKhacCoVe` 442: "Loại khác, …") · `dauCong` 136 (chỉ ở tên nhóm) · `suyRa` 3.936 · `khongMa` 2.461 · `tuBanIn` 0.

## Cách ghi
- `nguyenVan`: nguyên dòng của biểu, giữ dấu gạch đầu dòng và dấu ":" ; `gach` = số gạch. Không tên nào rỗng, không tên nào bịa.
- `suyRa` + `cungDong`: nhóm / phân nhóm **không có dòng riêng** trong biểu vì biểu chỉ in dòng 8 số (0101.90.00) hoặc chỉ in nhóm (16.01 → 1601.00). Nút mang tên của chính dòng `cungDong` trỏ tới. Không có nút suy ra nào khác: nhóm chữ số mà biểu không có dòng (vd 8481807 trong hs-tree) **không** thành nút.
- `cha`: nút cha theo gạch. Chuỗi ví dụ: `bieu:0101` ← `bieu:01012` "- Ngựa:" ← `bieu:010121` ← `bieu:01012100`.
- Id tiêu đề không mã: 5 hoặc 7 số (đúng khuôn) khi tập dòng dưới tiêu đề đúng bằng tập mã cùng tiền tố; 6 số khi biểu không in dòng mã của phân nhóm mà tiêu đề phủ đúng phân nhóm (4804.29). **334 tiêu đề còn lại không có chữ số nào diễn đạt được** (vd "- - - Van bi:" trong 8481.80): khuôn chỉ cho `bieu:` + 2–8 chữ số, nên dùng `bieu:00<số dòng trong biểu, 5 chữ số>` + cờ `idTheoDong` (`bieu:0014563`). Chương 00 không có nên không lẫn với mã thật; nhưng id gắn với bản 2026.04.05. Nếu QT muốn dạng đọc được (`bieu:848180:td:14563`) phải mở ngữ pháp ở cổng (M-01), ngoài tệp của thẻ này.
- `phamViTru` (mọi nút `loaiKhac`): id các nút cùng cha, trừ chính nó và "Loại khác" trần khác. Nút vừa là phân nhóm vừa là dòng lấy anh em của phân nhóm. Chỉ một tầng; phạm vi đủ của dòng = `phamViTru` của nó và của mọi tổ tiên `loaiKhac`.
- `hieuLuc.tu` = ngày hiệu lực của phiên bản dữ liệu nền (`data/versions/index.json` v1, 2026-01-01), **không** phải ngày ban hành Danh mục. `nguon.trang` = null cho cả kho (nguồn là bảng tính); thay bằng `nguon.dong` (số dòng sheet).
- Chương 98: dòng lặp cùng mã, cùng tên (khác "mã hàng tương ứng") gộp một nút, giữ `dongLap`, `maTuongUng`. 34 dòng hiệu chỉnh số gạch theo căn cứ có sẵn ở `lib/ho-so/tang-khong-ma.js` (984934/984935): `gach` đã hiệu chỉnh, `gachBieu` là số in.
- 9818.20: biểu in 5 dòng (98182021/29/31/39/90) và hai tiêu đề ở một gạch, ngang cấp dòng 9818.20 → giữ theo gạch in, cờ `ngoaiPhanNhom`.

## Kiểm
- Cổng có đối chiếu nguyên văn: **PASS, 0 lỗi, 0 cảnh báo**. `bieu.txt` và kho cùng xuất từ bản trích của một tệp xlsx (tệp gốc không có trên máy dev) nên phép này bắt lỗi ghép chữ, không bắt lỗi trích. Phép độc lập là ba mục dưới.
- Bất biến: mỗi dòng lên tới nhóm và qua đúng phân nhóm (trừ 5 dòng 9818.20 ở trên), anh em cùng cha cùng số gạch, không vòng: **0 lỗi**. Ngoài Chương 98, gạch trong biểu không nhảy cấp chỗ nào.
- Tên 11.871 dòng = `data/tax.json` (0 khác). Cổng Hải quan (`data/hs/customs-danh-muc-2026-11-13.json`): 45 khác, đều giữ nguyên văn biểu (bảng cuối).
- `lib/hs-tree.js` (lớp tầng): 11.499/11.871 dòng có chuỗi tổ tiên giống hệt. 372 khác: 354 ở Chương 98, 18 ngoài đó. Nguyên nhân: hs-tree chen nhóm chữ số không có dòng nào trong biểu (9849.3, 98183…) hoặc mất tên tiêu đề có thật (8523.5 "Phương tiện lưu trữ thông tin bán dẫn:", tiêu đề bọc ở 98.36, 98492011–20); 6 dòng chỉ khác cách viết ("hóa/hoá", dấu "(1)"). Không chỗ nào kho này thiếu tiêu đề so với hs-tree. Kho theo dòng in của biểu.

## So với bản in chú giải HS 2022 (3 bản chữ cgct-hs2022*.txt)
So từng danh sách phân nhóm in dưới 1.228 nhóm (Chương 98 không có trong bản in). Phân nhóm `xxxx.00` bản in không liệt kê nên không so.

| Phép so | Kết quả |
|---|---|
| Mã 6 số | 5.326 khớp; biểu có mà bản in không đúng mã: 15; bản in có mã không có trong biểu: 8 — **cả 23 là lỗi in** (bảng 1) |
| Cấp gạch của mã | 5.293 khớp, 33 lệch — **cả 33 là lỗi in** (bảng 2): số gạch của biểu khớp quy ước mã WCO 33/33, anh em của chúng trong chính bản in cũng ở cấp của biểu |
| Tiêu đề không mã | 1.015/1.024 có trong bản in (6304.1 so bằng mắt, tr. 1328, vì hai mã con đều in sai). **Không tiêu đề nào bản in có mà biểu thiếu** → `tuBanIn` = 0. Bảy ca máy báo "thiếu" (3822.90, 3827.90, 4002.20, 4002.60, 5514.30, 9306.30, 9606.30) là mã một gạch bị in thành hai gạch |
| Tiêu đề biểu có, bản in thiếu / hỏng | 9: 3701.9, 3702.5, 3702.9, 3808.5, 3808.6 (in đủ tiêu đề nhưng mã dưới in một gạch); 7005.2 (dính vào dòng 7005.10); 8517.7, 9401.9, 9403.9 (in "Bộ phận" kèm mã 8517.70, 9401.90, 9403.90) |
| Cấp gạch của tiêu đề | 3 lệch, lỗi in: 4412.4, 4412.5, 9405.2 in hai gạch, mã dưới cũng hai gạch |
| Tên phân nhóm | 4.857 khớp chữ; 50 khác dấu/i-y; 419 khác chữ (81 có số, từ giới hạn hoặc chữ khác nhiều) |
| Tên tiêu đề | 910 khớp; 10 khác dấu; 94 khác chữ (22 khác nhiều) |
| Tên nhóm | 1.047 khớp; 179 khác chữ (25 khác nhiều); 2 in sai số nhóm ở dòng tiêu đề: 73.02 in "37.02" (tr. 1543), 90.29 in "90.20" (tr. 2263) |

Tên khác chữ: kho giữ biểu. Phần lớn là lời dịch ("khối lượng/trọng lượng", "hoặc/hay", tên hoá chất) và lỗi gõ của bản in. Máy xếp "khác nhiều" khi khác số, khác từ giới hạn (trừ, không, chưa, đã, trên, dưới, quá, và, khác) hoặc giống dưới 0,8; mục cuối danh sách có thể dính chữ của đoạn văn sau.

**Chỗ khác có thể đổi nghĩa, cần người đọc khi nối chú giải:** nhóm 84.62 (bản in thiếu "(trừ máy cán kim loại)"), 85.17 (thiếu "điện thoại thông minh"), 85.29 (in "85.25 đến 85.28", biểu "85.24 đến 85.28"), 95.08, 16.01 (thiếu "côn trùng"), 29.09 và 2909.60 (thiếu "peroxit axetal…"), tiêu đề 8501.6 (thiếu "trừ máy phát quang điện"); phân nhóm 7219.32 (in "đến 4,75 mm", biểu "đến dưới 4,75 mm"), 5205.27 (in "88,33", biểu "83,33"), 4101.20 (thiếu "chưa xẻ"), 2903.47 và tiêu đề 2903.2 (lỗi gõ). Nhiều chỗ ở tên nhóm giống lời bản HS trước 2022 chưa cập nhật (nghi, không có bản HS 2017 để đối chiếu).

**Dấu (+):** biểu không in "(+)"; `dauCong` lấy từ tên nhóm trong bản in (trang ở `dauCongTrang`). Bản in có 143 "(+)", 7 là ký hiệu hoá học (tr. 606, 608 ×2, 619, 681, 682, 767), 136 ở tên nhóm, không có ở tên phân nhóm.

### Bảng 1 — mã lỗi in
| Bản in | Trang | Biểu |
|---|---|---|
| 6304.21 | 1328 | 6304.11 |
| 6204.19 (trong 63.04) | 1328 | 6304.19 |
| 8309.20 | 1678 | 8309.90 |
| 8517.70 | 2016 | tiêu đề không mã 8517.7 |
| 8603.01 | 2105 | 8603.10 |
| 9401.90, 9403.90 | 2340, 2344 | tiêu đề không mã 9401.9, 9403.9 |
| 9420.10, 9420.90 | 2342 | 9402.10, 9402.90 |
| 6802.30 (trong 68.04) | 1372 | 6804.30 |
| 7111.10, 7010.20, 7010.90 (trong 70.11) | 1424 | 7011.10, 7011.20, 7011.90 |
| "7018." | 1433 | 7018.10 |
| 8443.40 (trong 85.43; tên cũng khác) | 2081 | 8543.40 |
| 9404.30 in hai lần | 2346 | lần hai là 9404.40 |
| không in | 1890 | 8462.33 (bản in không có) |
| không in | 1940 | 8479.83 (bản in không có) |

### Bảng 2 — 33 mã in lệch số gạch
| Mã | Biểu | Bản in | Trang |
|---|---|---|---|
| 0802.99 | 2 | 1 | 80 |
| 2909.49 | 2 | 1 | 506 |
| 3701.91 | 2 | 1 | 803 |
| 3702.39 | 2 | 1 | 804 |
| 3702.52 | 2 | 1 | 805 |
| 3702.53 | 2 | 1 | 805 |
| 3702.54 | 2 | 1 | 805 |
| 3702.55 | 2 | 1 | 805 |
| 3702.56 | 2 | 1 | 805 |
| 3702.96 | 2 | 1 | 805 |
| 3702.97 | 2 | 1 | 805 |
| 3702.98 | 2 | 1 | 805 |
| 3808.52 | 2 | 1 | 829 |
| 3808.59 | 2 | 1 | 829 |
| 3808.61 | 2 | 1 | 829 |
| 3808.62 | 2 | 1 | 829 |
| 3822.90 | 1 | 2 | 849 |
| 3827.90 | 1 | 2 | 869 |
| 4002.20 | 1 | 2 | 931 |
| 4002.60 | 1 | 2 | 931 |
| 4706.30 | 1 | 2 | 1066 |
| 4805.93 | 2 | 1 | 1086 |
| 4905.20 | 1 | 2 | 1118 |
| 4905.90 | 1 | 2 | 1118 |
| 5209.29 | 2 | 1 | 1174 |
| 5514.30 | 1 | 2 | 1207 |
| 8103.99 | 2 | 1 | 1634 |
| 8704.22 | 2 | 3 | 2125 |
| 8806.10 | 1 | 2 | 2153 |
| 9031.41 | 2 | 4 | 2273 |
| 9306.30 | 1 | 2 | 2332 |
| 9405.41 | 2 | 4 | 2348 |
| 9606.30 | 1 | 2 | 2384 |

### Bảng 3 — tên khác nhiều
Cột mã 5 số là tiêu đề không mã. Đầy đủ 692 chỗ khác chữ: `--chi-tiet`.

| Mã | Trang | Khác | Biểu | Bản in |
|---|---|---|---|---|
| 0711 | 73 | chữ | Rau các loại đã bảo quản tạm thời, nhưng không phù hợp dùng ngay được | Rau các loại đã bảo quản tạm, nhưng không ăn ngay được. |
| 1517 | 169 | từ giới hạn | …hoặc dầu khác nhau thuộc Chương này, trừ chất béo và dầu hoặc các phần phân đoạn của chúng ăn được thuộc nhóm 15.16 | …hoặc dầu khác nhau thuộc Chương này, trừ chất béo hoặc dầu ăn được hoặc các phần phân đoạn của chúng thuộc nhóm 15.16 |
| 2853 | 464 | từ giới hạn | …vô cơ khác (bao gồm nước cất hoặc nước khử độ dẫn hoặc các loại nước tinh khiết tương tự); khí hóa lỏng (đã hoặc chưa lo | …vô cơ khác (bao gồm nước cất hoặc nước khử độ dẫn và các loại nước tinh khiết tương tự); khí hóa lỏng (đã hoặc chưa loại |
| 2909 | 506 | từ giới hạn | Ete, rượu-ete, phenol-ete, phenol-rượu-ete, peroxit rượu, peroxit ete, peroxit axetal và peroxit hemiaxetal, peroxit xet | Ete, rượu-ete, phenol-ete, ete-rượu-phenol, peroxit rượu, peroxit ete, peroxit xeton (đã hoặc chưa xác định về mặt hóa h |
| 2910 | 509 | từ giới hạn | …xy, phenol epoxy và ete epoxy, có một vòng ba cạnh và các dẫn xuất đã halogen hóa, sulphonat hóa, nitro hóa hoặc nitroso | …xy, phenol epoxy và ete epoxy, có một vòng ba cạnh, và các dẫn xuất halogen hóa, sulphonat hóa, nitro hóa hoặc nitroso h |
| 2934 | 575 | từ giới hạn | Các axit nucleic và muối của chúng, đã hoặc chưa xác định về mặt hóa học; hợp chất dị vòng khác | Các axit nucleic và muối của chúng, đã hoặc chưa được xác định về mặt hóa học; hợp chất dị vòng k |
| 2939 | 631 | từ giới hạn | … tổng hợp, và các muối, ete, este và các dẫn xuất khác của chúng | … tổng hợp, và các muối, ete, este và các dẫn xuất của chúng. |
| 3822 | 849 | từ giới hạn | …hí nghiệm được điều chế có hoặc không có lớp bồi, có hoặc không đóng gói ở dạng bộ, trừ loại thuộc nhóm 30.06; các mẫu c | …hí nghiệm được điều chế có hoặc không có lớp bồi, trừ loại thuộc nhóm 30.06; các mẫu chuẩn được chứng nhận |
| 4202 | 967 | từ giới hạn | …ức, hộp đựng phấn, hộp đựng dao kéo và các loại đồ chứa tương tự bằng da thuộc hoặc da thuộc tổng hợp, bằng tấm plastic, | …ức, hộp đựng phấn, hộp đựng dao kéo và các loại đồ |
| 6217 | 1321 | số | …oàn chỉnh khác; các chi tiết của quần áo hoặc của phụ kiện may mặc, trừ các loại thuộc nhóm 62.12 | …oàn chỉnh khác; các chi tiết của quần áo hoặc của hàng may mặc phụ trợ, trừ các loại thuộc nhóm 62. |
| 6812 | 1382 | số, từ giới hạn | … với thành phần cơ bản là amiăng hoặc thành phần cơ bản là amiăng và magie carbonat; các sản phẩm làm từ hỗn hợp đó hoặc | … với thành phần cơ bản là amiăng hoặc thành phần chính là amiăng và magie carbonat; các sản phẩm làm từ hỗn hợp đó hoặc  |
| 6813 | 1384 | từ giới hạn | …, côn hoặc các sản phẩm tương tự, với thành phần cơ bản là amiăng, các chất khoáng khác hoặc xenlulo, đã hoặc chưa kết h | …, côn hoặc các sản phẩm tương tự, với thành phần chính cơ bản là amiăng, các chất khoáng khác hoặc xenlulo, đã hoặc chưa |
| 6814 | 1385 | từ giới hạn | …g và các sản phẩm làm từ mica, kể cả mica đã được kết khối hoặc tái chế, có hoặc không có lớp nền phụ trợ bằng giấy, bìa | …g và các sản phẩm làm từ mica, kể cả mica đã được liên kết khối hoặc tái chế, có hoặc không có lớp nền phụ trợ bằng giấy |
| 7308 | 1554 | từ giới hạn | …m 94.06) và các bộ phận rời của các kết cấu (ví dụ, cầu và nhịp cầu, cửa cống, tháp, cột lưới, mái nhà, khung mái, cửa r | …m 94.06) và các bộ phận rời của các kết cấu (ví dụ cầu và nhịp cầu, cửa cống, tháp, cột lướt, mái nhà, khung mái, cửa ra |
| 7612 | 1613 | từ giới hạn | …ng chứa hình ống cứng hoặc có thể xếp lại được), dùng để chứa mọi loại vật liệu (trừ khí nén hoặc khí hóa lỏng), dung tí | …ng chứa hình ống cứng hoặc có thể xếp lại được), dung tích không quá 300 lít, đã hoặc chưa lót hoặc cách nhiệt, nhưng ch |
| 8214 | 1665 | từ giới hạn | Đồ dao kéo khác (ví dụ, tông đơ cắt tóc, dao pha dùng cho cửa hàng thịt hoặc làm bếp, dao bầu và dao băm, dao rọc giấy); | Đồ dao kép khác (ví dụ, tông đơ cắt tóc, dao pha dùng cho cửa hàng thịt hoặc bếp, dao bầu, dao rọc giấy); bộ đồ và dụng  |
| 8306 | 1673 | từ giới hạn | … tương tự, không dùng điện, bằng kim loại cơ bản; tượng nhỏ và đồ trang trí khác, bằng kim loại cơ bản; khung ảnh, khung | … tương tự, không dùng điện, bằng kim loại cơ bản; khung ảnh, khung tranh hoặc các loại khung tương tự, bằng kim loại cơ  |
| 8462 | 1889 | từ giới hạn, chữ | …gia công kim loại bằng cách rèn, gò hoặc dập khuôn (trừ máy cán kim loại); máy công cụ (kể cả máy ép, dây chuyền xẻ cuộn | …gia công kim loại bằng cách rèn, gò hoặc dập khuôn; máy công cụ (kể cả máy ép) để gia công kim loại bằng cách uốn, gấp,  |
| 8517 | 2016 | từ giới hạn | Bộ điện thoại, kể cả điện thoại thông minh và điện thoại khác cho mạng di động tế bào hoặc mạng không dây khác; thiết bị | Bộ điện thoại, kể cả điện thoại cho mạng di động tế bào hoặc mạng không dây khác; thiết bị khác để truyền hoặc nhận tiến |
| 8529 | 2043 | số | …ủ yếu dùng với các thiết bị thuộc các nhóm từ 85.24 đến 85.28 | …ủ yếu dùng với các thiết bị thuộc các nhóm từ 85.25 đến 85.28. |
| 9026 | 2248 | từ giới hạn | …oặc kiểm tra lưu lượng, mức, áp suất hoặc biến số khác của chất lỏng hoặc chất khí (ví dụ, dụng cụ đo lưu lượng, dụng cụ | …oặc kiểm tra lưu lượng, mức, áp suất hoặc biến số của chất lỏng hoặc chất khí (ví dụ, dụng cụ đo lưu lượng, dụng cụ đo m |
| 9305 | 2331 | số | …và phụ kiện của các loại vũ khí thuộc các nhóm từ 93.01 đến 93.04 | …và phụ kiện của các loại vũ khí thuộc các nhóm từ đến 93.04. |
| 9505 | 2363 | từ giới hạn | Đồ dùng trong lễ hội, hội hóa trang hoặc trong các trò chơi giải trí khác, kể cả các mặt hàng dùng cho trò chơi ảo thuật | Đồ dùng trong lễ hội, hội hoá trang hoặc trong các trò chơi giải trí khác, kể cả các mặt hàng dùng cho trò chơi ảo thuật |
| 9508 | 2368 | từ giới hạn, chữ | Rạp xiếc lưu động và bầy thú xiếc lưu động; trò chơi di chuyển trong công viên giải trí (amusement park rides) và trò ch | Vòng ngựa gỗ, đu, phòng tập bắn và các trò chơi tại khu giải trí khác; rạp xiếc lưu động và bầy thú xiếc lưu động; nhà h |
| 9620 | 2395 | chữ | Chân đế loại một chân (monopod), hai chân (bipod), ba chân (tripod) và các mặt hàng tương tự | Chân đế dạng đơn, dạng hai chân, ba chân và các sản phẩm tương tự. Nhóm này bao gồm các chân đ |
| 01051 | 11 | chữ | Loại khối lượng không quá 185 g: | Loại trọng lượng không quá 185 g: |
| 03027 | 26 | số | …a spp.), cá chình (Anguilla spp.), cá rô sông Nile(Lates niloticus) và cá quả (cá chuối hoặc cá lóc) (Channa spp.), trừ  | …a spp.), cá chình (Anguilla spp.), cá rô sông Nile (Lates niloticus) và cá quả (cá chuối hoặc cá lóc) (Channa spp.), trừ |
| 03038 | 29 | số | … ăn được sau giết mổ của cá thuộc các phân nhóm từ 0303.91 đến 0303.99: | … ăn được sau giết mổ của cá thuộc các phân nhóm từ |
| 03056 | 34 | từ giới hạn | Cá, muối nhưng không làm khô hoặc không hun khói và cá ngâm nước muối, trừ phụ phẩm ăn được sau giết mổ: | Cá, muối nhưng không làm khô hoặc hun khói và cá ngâm nước muối, trừ phụ phẩm ăn được sau giết mổ: |
| 28444 | 445 | từ giới hạn | Nguyên tố phóng xạ và đồng vị phóng xạ và các hợp chất trừ loại thuộc phân nhóm 2844.10, 2844.20 hoặc 2844.30; hợp kim,  | Nguyên tố phóng xạ, đồng vị phóng xạ và các hợp chất trừ loại thuộc phân nhóm 2844.10, 2844 .20 hoặc 2844.30; hợp kim, c |
| 29032 | 487 | từ giới hạn | Các dẫn xuất clo hóa của hydrocarbon mạch hở, chưa no: | Các dẫn xuất clo hoá chưa của hydrocarbon mạch hở, chưa no: |
| 29051 | 496 | chữ | Rượu no đơn chức: | Rượu no đơn chức (monohydric): |
| 29161 | 526 | từ giới hạn | … mạch hở chưa no, các anhydrit, halogenua, peroxit, peroxyaxit của chúng và các dẫn xuất của các chất trên: | … mạch hở chưa no, các anhydrit, halogenua, peroxit và peroxyaxit của chúng và các dẫn của các chất trên: |
| 29181 | 530 | từ giới hạn | …có chức oxy khác, các anhydrit, halogenua, peroxit, peroxyaxit của chúng và các dẫn xuất của các chất trên: | …có chức oxy khác, các anhydrit, halogenua, peroxit và peroxyaxit của chúng và các dẫn xuất của các chất trên: |
| 29334 | 568 | số | Hợp chất chứa trong cấu trúc 1 vòng quinolin hoặc hệ vòng isoquinolin (đã hoặc chưa hydro hóa), chưa ngưng tụ thêm: | Hợp chất chứa trong cấu trúc một vòng quinolin hoặc hệ vòng isoquinolin (đã hoặc chưa hydro hoá), chưa ngưng tụ thêm: |
| 29335 | 568 | số | Hợp chất có chứa 1 vòng pyrimidin (đã hoặc chưa hydro hóa) hoặc vòng piperazin trong cấu trúc: | Hợp chất có chứa một vòng pyrimidin (đã hoặc chưa hydro hóa) hoặc vòng piperazin trong cấu trúc: |
| 34011 | 763 | từ giới hạn | …c chế phẩm hữu cơ hoạt động bề mặt, ở dạng thanh, bánh, được nén thành miếng hoặc hình dạng nhất định, và giấy, mền xơ,  | …c chế phẩm hữu cơ hoạt động bề mặt, ở dạng thanh, miếng, bánh hoặc các hình dạng khác, và giấy, mền xơ, nỉ và sản phẩm k |
| 40024 | 931 | chữ | Cao su chloroprene (chlorobutadiene) (CR): | Cao su clopren (clobutadien) (CR): |
| 52062 | 1172 | từ giới hạn | Sợi đơn, làm từ xơ chải kỹ: | Sợi đơn, làm từ xơ đã chải kỹ: |
| 61071 | 1297 | chữ | Quần lót (underpants) và quần sịp: | Quần lót và quần sịp: |
| 62031 | 1312 | chữ | Bộ com-lê: | Bộ complê: |
| 71069 | 1466 | chữ | Loại khác: | Dạng khác: |
| 75071 | 1602 | chữ | Các loại ống và ống dẫn: | Ống và ống dẫn: |
| 81123 | 1641 | chữ | Hafini: | Hafnium: |
| 84068 | 1714 | chữ | Tua bin loại khác: | Các loại tuabin khác: |
| 84314 | 1794 | từ giới hạn | Của máy thuộc nhóm 84.26, 84.29 hoặc 84.30: | Của máy thuộc nhóm 84.26, 84.29 và 84.30: |
| 85016 | 1978 | từ giới hạn, chữ | Máy phát điện xoay chiều (máy dao điện), trừ máy phát quang điện: | Máy phát điện xoay chiều (máy dao điện): |
| 010391 | 11 | chữ | Khối lượng dưới 50 kg | Trọng lượng dưới 50 kg |
| 010392 | 11 | chữ | Khối lượng từ 50 kg trở lên | Trọng lượng từ 50 kg trở lên  |
| 030359 | 29 | từ giới hạn, chữ | Loại khác: | Other |
| 040299 | 44 | số, từ giới hạn, chữ | Loại khác | Loại khác Nhóm này gồm sữa (như đã định nghĩa trong Chú giải 1 của Chương này) và kem, cô đặc (ví dụ, bằng cách làm bay  |
| 081120 | 85 | từ giới hạn | Quả mâm xôi (Raspberries, blackberries), dâu tằm, dâu đỏ (loganberries), quả lý chua đen, trắng hoặc đỏ và quả lý gai | Quả mâm xôi (Raspberries, blackberries), dâu tằm và dâu đỏ (loganberries), quả lý chua đen, trắng hoặc đỏ và quả lý gai |
| 081290 | 85 | chữ | Loại khác: | Quả khác Nhó |
| 121221 | 126 | chữ | Thích hợp sử dụng cho người: | Thích hợp dùng làm thức ăn cho người |
| 121293 | 126 | chữ | Mía đường: | Mía: |
| 160249 | 182 | chữ | Loại khác, kể cả các hỗn hợp: | Loại khác, kể cả các sản phẩm pha trộn |
| 210420 | 232 | từ giới hạn, chữ | Chế phẩm thực phẩm tổng hợp đồng nhất: | Chế phẩm thực phẩm đồng nhất (A) SÚP VÀ  |
| 250490 | 273 | chữ | Loại khác | Dạng khác G |
| 251749 | 284 | chữ | Loại khác | Từ đá khác  |
| 252310 | 287 | chữ | Clanhke xi măng (1): | Clinker xi măng |
| 283330 | 405 | chữ | Phèn | Phèn (alums) |
| 284540 | 455 | chữ | Heli-3 | Helium-3 |
| 290347 | 488 | số | 1,1,1,3,3-Pentafloropropan (HFC-245fa) và 1,1,2,2,3-pentafloropropan (HFC-245ca) | 1,1,1,3,3-1 Pentalloropropan (HFC-245fa) và 1,1,2,2,3-pentafloropropan (HFC-245ca) |
| 290517 | 496 | chữ | Dodecan-1-ol (lauryl alcohol), hexadecan-1-ol (cetyl alcohol) và octadecan-1-ol (stearyl alcohol) | Dodecan-1-ol (rượu Laurylic), Hexadecan-1-ol (rượu xetylic) và octadecan-1-ol (rượu stearylic) |
| 290930 | 506 | từ giới hạn | Ete thơm và các dẫn xuất halogen hóa, sulphonat hóa, nitro hóa hoặc nitroso hóa của chúng | Ete thơm và các dẫn xuất đã halogen hóa, sulphonat hóa, nitro hóa, nistroso hóa của chúng |
| 290960 | 506 | từ giới hạn, chữ | Peroxit rượu, peroxit ete, peroxit axetal và peroxit hemiaxetal, peroxit xeton và các dẫn xuất halogen hóa, sulphonat hó | Peroxit rượu, peroxit ete, peroxit xeton, và các dẫn xuất halogen hoá, sulphonat hoá, nitro hoá hoặc nitroso hoá của chú |
| 293213 | 563 | chữ | Furfuryl alcohol và tetrahydrofurfuryl alcohol | Rượu furfuryl và rượu tetrahydrofurfuryl |
| 293430 | 575 | số | Hợp chất có chứa trong cấu trúc 1 hệ vòng phenothiazin (đã hoặc chưa hydro hóa), chưa ngưng tụ thêm | Hợp chất có chứa trong cấu trúc một vòng phenothiazin (đã hoặc chưa hydro hoá), chưa ngưng tụ thêm |
| 330112 | 749 | chữ | Của cam | Của quả cam |
| 330430 | 755 | chữ | Chế phẩm dùng cho móng tay hoặc móng chân | Chế phẩm trang điểm móng tay hoặc móng chân |
| 370243 | 804 | từ giới hạn | Loại chiều rộng trên 610 mm và chiều dài không quá 200 m | Loại chiều rộng trên 610 mm, chiều dài không quá 200m |
| 380861 | 829 | từ giới hạn | Đóng gói với khối lượng tịnh không quá 300 g: | Đã đóng gói với trọng lượng tịnh không quá 300 g |
| 380862 | 829 | từ giới hạn | Đóng gói với khối lượng tịnh trên 300 g nhưng không quá 7,5 kg: | Đã đóng gói với trọng lượng tịnh trên 300 g nhưng không quá 7,5 kg |
| 390729 | 897 | từ giới hạn, chữ | Loại khác: | Other |
| 392530 | 917 | từ giới hạn | Cửa chớp, mành che (kể cả mành chớp lật) và các sản phẩm tương tự và các bộ phận của nó | Cửa chớp, mành che (kể cả mành chớp lật), các sản phẩm tương tự và các bộ phận của nó |
| 400122 | 924 | từ giới hạn | Cao su tự nhiên được định chuẩn về kỹ thuật (TSNR): | Cao su tự nhiên đã định chuẩn về kỹ thuật (TSNR) |
| 401120 | 943 | chữ | Loại dùng cho ô tô khách (buses) (1) hoặc ô tô chở hàng (lorries): | Loại dùng cho ô tô buýt hoặc ô tô vận tải |
| 401610 | 948 | chữ | Từ cao su xốp: | Bằng cao su xốp |
| 410120 | 955 | từ giới hạn | Da sống nguyên con, chưa xẻ, khối lượng da một con không quá 8 kg khi làm khô đơn giản, 10 kg khi muối khô, hoặc 16 kg ở | Da sống nguyên con, trọng lượng da một con không quá 8 kg khi làm khô đơn giản, 10 kg khi muối khô, hoặc 16 kg ở dạng tư |
| 440921 | 993 | chữ | Của tre | Từ tre |
| 460121 | 1057 | chữ | Của tre | Từ tre |
| 520411 | 1170 | chữ | Có hàm lượng bông chiếm từ 85% trở lên tính theo khối lượng: | Có tỷ trọng bông từ 85% trở lên |
| 520527 | 1171 | số | Sợi có độ mảnh từ 83,33 decitex đến dưới 106,38 decitex (chi số mét trên 94 đến 120) | Sợi có độ mảnh từ 88,33 decitex đến dưới 106,38 decitex (chi số mét trên 94 đến 120) |
| 520943 | 1175 | từ giới hạn | Vải vân chéo 3 sợi hoặc vân chéo 4 sợi khác, kể cả vải vân chéo dấu nhân | Vải vân chéo 3 sợi hoặc vân chéo 4 sợi, kể cả vân chéo dấu nhân |
| 521143 | 1176 | từ giới hạn | Vải vân chéo 3 sợi hoặc vân chéo 4 sợi khác, kể cả vải vân chéo dấu nhân | Vải vân chéo 3 sợi hoặc vân chéo 4 sợi, kể cả vải vân chéo dấu nhân |
| 530121 | 1178 | từ giới hạn | Đã tách lõi hoặc đã đập | Đã tách lõi hoặc đập |
| 540252 | 1192 | chữ | Từ các polyeste | Từ polyeste |
| 540262 | 1192 | chữ | Từ các polyeste | Từ polyeste |
| 581099 | 1256 | chữ | Từ các vật liệu dệt khác | Từ vật liệu dệt khác Hàng  |
| 620799 | 1315 | chữ | Từ các vật liệu dệt khác: | Từ vật liệu dệt khác Nhóm n |
| 620899 | 1315 | chữ | Từ các vật liệu dệt khác: | Từ vật liệu dệt khác Nhóm n |
| 620990 | 1316 | chữ | Từ các vật liệu dệt khác | Từ vật liệu dệt khác Theo  |
| 621490 | 1319 | chữ | Từ các vật liệu dệt khác: | Từ vật liệu dệt khác Nhóm n |
| 621590 | 1320 | chữ | Từ các vật liệu dệt khác: | Từ vật liệu dệt khác Nhóm n |
| 630510 | 1329 | chữ | Từ đay hoặc các loại xơ libe dệt khác thuộc nhóm 53.03: | Từ đay hoặc các nguyên liệu dệt từ sợi libe khác thuộc nhóm 53.03 |
| 650610 | 1355 | từ giới hạn, chữ | Mũ bảo hộ và các vật đội đầu an toàn khác: | Mũ bảo hộ |
| 660110 | 1357 | từ giới hạn | Dù che trong vườn hoặc các loại ô, dù tương tự | Dù che trong vườn và các loại ô, dù tương tự |
| 670290 | 1363 | chữ | Bằng các loại vật liệu khác: | Bằng vật liệu khác. Nhóm này b |
| 681189 | 1382 | chữ | Các sản phẩm khác: | Loại khác Nhóm này g |
| 690210 | 1393 | số | Có hàm lượng trên 50% tính theo khối lượng là một hoặc nhiều nguyên tố magie (Mg), canxi (Ca) hoặc crom (Cr), thể hiện ở | Chứa trên 50% tính theo trọng lượng là một hay nhiều nguyên tố magie (Mg), canxi (Ca) hoặc crom (Cr), thể hiện ở dạng ma |
| 690722 | 1399 | từ giới hạn | Của loại có độ hút nước trên 0,5% nhưng không quá 10% tính theo trọng lượng: | Của loại có độ hút nước vượt quá 0.5% nhưng không vượt quá 10% tính theo trọng lượng |
| 700510 | 1416 | từ giới hạn | … lớp hấp thụ, lớp phản chiếu hoặc không phản chiếu: | … lớp hấp thụ, lớp phản chiếu hoặc không phản chiếu - Kính không có cốt lưới khác: |
| 701710 | 1432 | chữ | Bằng thạch anh nung chảy hoặc các dạng dioxit silic nung chảy khác: | Bằng thạch anh nấu chảy hoặc dioxit silic nấu chảy khác. |
| 701720 | 1432 | từ giới hạn | Bằng thủy tinh khác có hệ số giãn nở tuyến tính không quá 5 x 10-6 độ Kelvin khi ở nhiệt độ từ 0oC đến 300oC | Bằng thủy tinh có hệ số giãn nở tuyến tính không quá 5 x 10-6 độ Kenvin khi ở nhiệt độ từ 0°C đến 300°C |
| 711810 | 1481 | chữ | Tiền kim loại (trừ tiền vàng), không phải loại pháp định: | Tiền kim loại (trừ tiền vàng), không được coi là tiền tệ chính thức |
| 721932 | 1535 | từ giới hạn | Chiều dày từ 3 mm đến dưới 4,75 mm | Chiều dày từ 3 mm đến 4,75 mm |
| 721990 | 1535 | số, từ giới hạn, chữ | Loại khác | Loại khác Những điều khoản của các Chú giải cho các nhóm 72.08 đến 72.10, với những sửa đổi thích hợp, áp dụng cho những |
| 722220 | 1536 | từ giới hạn | Dạng thanh và que, chưa được gia công quá mức tạo hình nguội hoặc gia công kết thúc nguội: | Dạng thanh và que, chưa được gia công tạo hình nguội hoặc gia công kết thúc nguội |
| 731442 | 1560 | chữ | Được phủ plastic | Được tráng plastic |
| 741539 | 1594 | số, từ giới hạn, chữ | Loại khác | Loại khác Chú giải nhóm 73.17 và 73.18 áp dụng, với những sửa đổi phù hợp, cho nhóm này, ngoại trừ việc nhóm cũng bao gồ |
| 760320 | 1608 | chữ | Bột có cấu trúc lớp; vảy nhôm: | Bột có cấu trúc vảy; vảy nhôm Nh |
| 820150 | 1649 | từ giới hạn | Kéo cắt cây và kéo cắt tỉa và kéo để tỉa loại lớn tương tự, loại sử dụng một tay (kể cả kéo cắt gia cầm) | Kéo cắt cây và kéo cắt tỉa, kéo để tỉa loại lớn tương tự, loại sử dụng một tay (kể cả kéo cắt gia cầm) |
| 820231 | 1651 | chữ | Với bộ phận làm việc bằng thép | Có bộ phận làm việc làm bằng thép |
| 820820 | 1660 | chữ | Để gia công gỗ | Để chế biến gỗ |
| 830160 | 1667 | chữ | Các bộ phận | Bộ phận |
| 830590 | 1673 | chữ | Loại khác, kể cả các bộ phận: | Loại khác, kể cả bộ phận Nhóm n |
| 830890 | 1677 | chữ | Loại khác, kể cả các bộ phận: | Loại khác, kể cả bộ phận Nhóm n |
| 847321 | 1928 | số | Của máy tính điện tử thuộc phân nhóm 8470.10.00, 8470.21.00 hoặc 8470.29.00 | Của máy tính điện tử thuộc phân nhóm 8470.10, 8470.21 hoặc 8470.29 |
| 847971 | 1940 | chữ | Loại sử dụng ở sân bay | Loại sử dụng trong sân bay |
| 848320 | 1956 | chữ | Thân ổ, lắp ổ bi hoặc ổ đũa: | Thân ổ, dùng ổ bi hoặc ổ đũa |
| 850590 | 1988 | chữ | Loại khác, kể cả các bộ phận: | Loại khác, kể cả bộ phận Nhóm n |
| 853225 | 2050 | chữ | Tụ giấy hoặc plastic | Tụ giấy hay plastic |
| 860719 | 2109 | chữ | Loại khác, kể cả các bộ phận | Loại khác, kể cả phụ tùng |
| 870322 | 2122 | số | Dung tích xi lanh trên 1.000 cc nhưng không quá 1.500 cc: | Loại dung tích xilanh trên 1.000cc nhưng không quá 1500cc. |
| 870990 | 2135 | chữ | Các bộ phận | Bộ phận. Nhóm |
| 911290 | 2304 | chữ | Các bộ phận | Bộ phận Nhóm  |
| 940429 | 2346 | chữ | Bằng các loại vật liệu khác: | Bằng vật liệu khác |
| 961610 | 2393 | từ giới hạn | Bình, lọ xịt nước hoa và bình, lọ xịt để trang điểm tương tự, và các bộ phận gá lắp và đầu xịt của chúng: | Bình, lọ xịt nước hoa hoặc bình, lọ xịt để trang điểm tương tự, và các bộ phận gá lắp và đầu xịt của chúng |

### Bảng 4 — 45 dòng cổng Hải quan khác biểu (kho giữ biểu)
| Mã | Độ dài biểu | Độ dài cổng Hải quan | Loại |
|---|---|---|---|
| 03044100 | 257 | 255 | cắt chữ |
| 03045100 | 431 | 255 | cắt chữ |
| 03048100 | 257 | 255 | cắt chữ |
| 03049300 | 431 | 255 | cắt chữ |
| 03053100 | 431 | 255 | cắt chữ |
| 03054100 | 257 | 255 | cắt chữ |
| 03054400 | 431 | 255 | cắt chữ |
| 03055200 | 431 | 255 | cắt chữ |
| 03055400 | 750 | 255 | cắt chữ |
| 03056400 | 431 | 255 | cắt chữ |
| 05100000 | 273 | 255 | cắt chữ |
| 08109094 | 285 | 255 | cắt chữ |
| 27102000 | 321 | 255 | cắt chữ |
| 28444200 | 354 | 255 | cắt chữ |
| 29314700 | 82 | 89 | khác chữ |
| 29333300 | 441 | 255 | cắt chữ |
| 29335300 | 262 | 255 | cắt chữ |
| 29339100 | 529 | 255 | cắt chữ |
| 29349100 | 259 | 255 | cắt chữ |
| 44123300 | 612 | 255 | cắt chữ |
| 49119940 | 275 | 255 | cắt chữ |
| 59111000 | 276 | 255 | cắt chữ |
| 62012010 | 293 | 255 | cắt chữ |
| 62013010 | 293 | 255 | cắt chữ |
| 62014010 | 293 | 255 | cắt chữ |
| 62019011 | 295 | 255 | cắt chữ |
| 62019021 | 295 | 255 | cắt chữ |
| 62022010 | 293 | 255 | cắt chữ |
| 62023010 | 293 | 255 | cắt chữ |
| 62024010 | 293 | 255 | cắt chữ |
| 68128050 | 268 | 255 | cắt chữ |
| 84659210 | 292 | 255 | cắt chữ |
| 84669330 | 529 | 255 | cắt chữ |
| 84798950 | 365 | 255 | cắt chữ |
| 84869023 | 326 | 255 | cắt chữ |
| 85232961 | 281 | 255 | cắt chữ |
| 85232983 | 292 | 255 | cắt chữ |
| 85232995 | 292 | 255 | cắt chữ |
| 85234914 | 290 | 255 | cắt chữ |
| 85234993 | 290 | 255 | cắt chữ |
| 85235130 | 290 | 255 | cắt chữ |
| 85235940 | 290 | 255 | cắt chữ |
| 85238092 | 288 | 255 | cắt chữ |
| 90303320 | 261 | 255 | cắt chữ |
| 90319030 | 315 | 255 | cắt chữ |

## Còn lại
- Biểu Chương 98: mã 8 số của bốn dòng in hỏng ở 9849.17, 9849.19 (cần văn bản gốc Nghị định); dòng 9818.20 in lệch gạch.
- "Phần còn lại có tên" không bắt đầu bằng "Loại khác" ("Van khác", "Động cơ khác", "Của loại khác") không gắn `loaiKhac`.
- Không thêm bài kiểm vào `scripts/danh-sach-test.txt`; `bieu-doi-chieu.mjs` không có `--cgct` vẫn kiểm bất biến, hs-tree và tên dòng.
