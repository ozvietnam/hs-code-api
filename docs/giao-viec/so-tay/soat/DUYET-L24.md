# Soát độc lập L1-4c — lô L24 (#1109)

Phiên soát: `claude-agent:duyet-L24-20261111#soat-L24` (khác phiên soạn `…#soan-<pn6>`). Ngày 11/11/2026. Phạm vi: 65 PN6 nhóm
84.03–84.22 (nồi hơi, động cơ đốt trong, tuabin, bơm, quạt/máy nén, điều hoà, tủ lạnh, thiết bị nhiệt, máy lọc). Trước khi soát đã
`git fetch origin main`: cả 65 PN6 đều còn NHAP (không PN6 nào đã xử lý ở lô khác).

Cách làm từng PN6: `--kiem` (65/65 XANH, 0 DỪNG) → `--ve` (chữ biểu VI + EN từng dòng/tầng) → in thêm toàn bộ dòng biểu thuế
`data/bieu-thue/2026.04.05/` (kể cả tiêu đề không mã + MFN) để thấy tầng cha/anh em → đặt từng điều kiện cạnh chữ biểu, hỏi ba câu §2
→ đọc mọi cảnh báo (`cong3-bien-khong-doc-duoc` đối chiếu biên bằng tay ở 840682, 841330, 840999, 841950; `cong5-bo-ve` đọc `lyDo`;
`cong2-ten-anh-em-roi`, `cong2-ten-cu-the-hon` 840999; `chongLanTruc` 842129; `chongLanVanBan` 841370, 841480) → tra SEN
(`data/sen-2022.json`) cho dòng có (SEN) → tra `data/precedents.json` theo mã 8 số (840890, 841830, 841840, 841989, 842121, 842139,
842199 khớp) và bảng hiệu chỉnh (841590 có mục KHONG_LECH).

**Kiểm hồi quy ngưỡng số SEN (yêu cầu tech lead):** so từng PN6 với `data/so-tay/<nhóm>.json` hiện hành trên origin/main. Mọi
ngưỡng số đang có trong sổ tay (840999 50–155 mm; 841330/841370 200 mm; 841810/841821 230 l; 841830/841840 200 l; 842122 500 l/h;
841950 3 cm nguồn `sen.84195020`) đều còn nguyên trong bản nháp — không PN6 nào bỏ mất ngưỡng số SEN.

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 840390 | DUYET | Đối chiếu VI/EN 'Boiler bodies, shells or casings': tenLoai Thân/vỏ/vỏ bọc nồi hơi; trong 840390 (bộ phận nồi hơi 84.03) không đổi mã. |
| 840410 | DUYET | Đối chiếu r12845 'For use with boilers of heading 84.02' (dungCho 84.02), .11 'Soot removers (soot blowers)', .20 84.03 — khớp VI/EN. |
| 840490 | DUYET | Đối chiếu hai tầng 'Of goods of subheadings 8404.10.11 and 8404.10.19' / '8404.10.20' và 'Bodies, shells or casings' — khớp; .90 Loại khác trần. |
| 840682 | **TRA_VE** | (A) 840682:84068210 SUY RỘNG/sai đơn vị: chữ biểu 'Công suất đầu ra không quá 5 MW' / 'Of an output not exceeding 5 MW' (megawatt) nhưng điều kiện ghi congSuat <= 5 donVi 'mW' — hệ đơn vị congSuat của tu-vung@2 coi mW = 0,001 W (miliwatt), không có MW. Hệ quả: mọi tuabin hơi ≤ 5 MW (MFN 0) bị đọc thành > 5 mW ⇒ rơi 84068290; dòng .10 gần như rỗng. Đáng lẽ DỪNG / THIEU_KHOA_TU_VUNG (thiếu đơn vị MW trong hệ congSuat). |
| 840721 | DUYET | Biên 'not exceeding 22.38 kW' ⇒ congSuat <= 22,38 kW khớp VI/EN. |
| 840729 | DUYET | Biên 'not exceeding 22.38 kW' ⇒ congSuat <= 22,38 kW khớp VI/EN. |
| 840732 | DUYET | Hai tầng không mã 50–110 cc / 110–250 cc (Exceeding … but not exceeding) đúng biên >/<=; dungCho 87.01/87.11 khớp; tầng 110–250 không có dòng 87.01 đúng chữ biểu. |
| 840733 | DUYET | Dòng 'For vehicles of heading 87.01/87.11' ⇒ dungCho khớp; .90 Loại khác trần. |
| 840734 | **TRA_VE** | (A) 840734~r12893 SAI KHOÁ: tiêu đề 'Đã lắp ráp hoàn chỉnh:' / 'Fully assembled:' ghi laBoPhan KHONG (= hàng hoàn chỉnh, không phải bộ phận) thay vì daLapRap CO. Động cơ chưa lắp ráp (CKD, nhánh 'Loại khác:' r12901) vẫn là hàng hoàn chỉnh theo GIR 2(a) ⇒ laBoPhan KHONG đúng ⇒ bị lấn sang nhánh đã lắp ráp: .71/.72 MFN 20 thay cho .94/.95 18, .73 MFN 10 thay cho .99 18. (B) lưu ý: .50/.92 'Dùng cho xe KHÁC thuộc nhóm 87.01' / 'For other vehicles of heading 87.01' bỏ chữ 'khác' ⇒ động cơ máy kéo cầm tay ≤1.100 cc thoả cả .40 và .50 (cùng MFN 25 nên không đổi thuế, nhưng nên ghi chongLanVanBan hoặc phủ định). |
| 840790 | DUYET | Biên '≤18.65 kW' và '>18.65 kW but ≤22.38 kW' khớp VI/EN. |
| 840810 | DUYET | Ba dải công suất ≤22,38 / 22,38–100 / 100–750 kW khớp VI/EN, biên >/<= đúng. |
| 840820 | **TRA_VE** | (A) 840820~r12920 SAI KHOÁ: tiêu đề 'Đã lắp ráp hoàn chỉnh:' / 'Fully assembled:' ghi laBoPhan KHONG thay vì daLapRap CO. Động cơ diesel chưa lắp ráp (nhánh 'Loại khác:' r12926) vẫn là hàng hoàn chỉnh (GIR 2(a)) ⇒ thoả laBoPhan KHONG ⇒ lấn sang nhánh đã lắp ráp: .21 MFN 20 thay .94 25, .23 MFN 7 thay .96 15. |
| 840890 | DUYET | Tầng 'Of a power exceeding 100 kW' (>100), .10 ≤18,65 kW; dungCho 84.29/84.30 và 'railway locomotives or tramway vehicles' khớp; tầng Loại khác: phủ định đúng. |
| 840999 | DUYET | Đối chiếu sáu tầng (84.29/84.30, 87.01, 87.11, xe khác Ch.87, tàu Ch.89 tách 22,38 kW, động cơ khác — cùng khuôn 840991 đã DUYET); biên 'từ 50 mm trở lên, nhưng không quá 155 mm' ⇒ >=50/<=155 đối chiếu tay; HOAC chế hòa khí + bộ phận, .37 HOAC ống xi lanh/piston; ten-anh-em-roi & ten-cu-the-hon (Bạc piston ⊃ Piston) đúng chữ biểu. |
| 841290 | DUYET | Đối chiếu 'Of engines of subheading 8412.10' và 'For steam or other vapour power units incorporating boilers' — dungCho khớp; vế 'động cơ/mô tơ' lặp chữ VI, không đổi mã. |
| 841319 | DUYET | 'Electrically operated' / 'Not electrically operated' ⇒ hoatDongBangDien CO/KHONG khớp, hai dòng phủ kín. |
| 841320 | DUYET | 'Water pumps' / 'Breast pumps' ⇒ tenLoai khớp VI/EN; .90 Loại khác trần. |
| 841330 | DUYET | Tầng 'Other, centrifugal type' ⇒ kieuBom LY_TAM; biên cửa hút 'not exceeding 200 mm' (<=) / 'exceeding 200 mm' (>) đối chiếu tay (cảnh báo cong3-bien-khong-doc-duoc); .30/.40 tenLoai + dungCho 87.02/87.03/87.04 khớp; giữ ngưỡng 200 mm của sổ tay. |
| 841360 | DUYET | Tầng 'Water pumps, flow rate not exceeding 8,000 m3/h' + .40 '>8.000 ≤13.000 m3/h' biên đúng; điện/không điện khớp. |
| 841370 | **TRA_VE** | (A) 841370:8413701 SUY RỘNG: tiêu đề 'Bơm nước một tầng, một chiều hút, trục ngang được truyền động bằng dây đai hoặc khớp nối trực tiếp…' / 'Single stage, single suction horizontal shaft water pumps suitable for belt drive or direct coupling…' — điều kiện chỉ còn tenLoai 'Bơm nước' + kieuTruyenDong DAY_DAI/KHOP_NOI_TRUC_TIEP + không đồng trục; bỏ mất ba giới hạn 'một tầng', 'một chiều hút', 'trục ngang' (SEN 84137011 nhấn mạnh đúng ba đặc điểm này). Hệ quả: bơm ly tâm nhiều tầng / hút hai phía / trục đứng truyền động đai hoặc khớp nối lấn vào .11/.19 (MFN 20) thay vì .42/.43/.49 (MFN 10). Máy tách sai: cổng 5 coi cả cụm 'Bơm nước một tầng, một chiều hút, trục ngang' là DAU nên không báo vế chưa phủ. |
| 841381 | DUYET | Ba dòng bơm nước theo lưu lượng 8.000/13.000 m3/h và điện/không điện khớp VI/EN, biên đúng. |
| 841382 | DUYET | 'Electrically operated' / 'Not electrically operated' khớp, phủ kín. |
| 841420 | DUYET | 'Bicycle pumps' ⇒ dungCho xe đạp (phân nhóm đã giới hạn bơm không khí tay/chân); .90 Loại khác trần. |
| 841430 | **TRA_VE** | (A) 841430:84143040 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): chữ biểu 'Công suất làm mát …' / 'Of a cooling capacity …' (năng suất lạnh) được ghi bằng khoá congSuat = 'power output' (cachDoc power/output/wattage/rated power; hệ đơn vị W/mW/kW/HP, không có BTU/h). Máy điều hoà ghi cả công suất điện tiêu thụ lẫn năng suất lạnh (thường bằng BTU/h); bộ đọc lấy công suất điện ⇒ chọn sai dải. — 'With a refrigeration capacity exceeding 21.10 kW' (năng suất lạnh của máy nén) ghi congSuat > 21,1 kW; máy nén ghi công suất mô-tơ (kW/HP) ⇒ máy nén 15 kW mô-tơ, 50 kW lạnh bị đọc thành .90. Cùng MFN 3 nhưng sai mã 8 số. |
| 841451 | DUYET | 'Table fans and box fans' ⇒ tenLoai mảng hai tên; tầng 'Other:' .91 'With fan guard' ⇒ coLuoiBaoVe CO; khớp VI/EN. |
| 841460 | **TRA_VE** | (A) 841460:84146011 SUY RỘNG: chữ biểu 'Tủ hút, lọc không khí sử dụng trong phòng thí nghiệm (SEN)' / 'Laminar airflow cabinets' — điều kiện chỉ còn dungCho 'phòng thí nghiệm', bỏ danh từ đầu 'Tủ hút, lọc không khí' (SEN 84146011: tủ dòng khí tầng lọc HEPA). Hệ quả: mọi nắp chụp hút có lọc ≤120 cm dùng trong phòng thí nghiệm (không phải tủ dòng khí tầng) lấn vào .11 MFN 0 thay vì .19 MFN 15. |
| 841470 | DUYET | Tầng 'Fitted with filters'/'Not fitted with a filter' ⇒ coBoLoc CO/KHONG; .11/.21 'Having a hood … not exceeding 120 cm' ⇒ nắp chụp hút + kichThuoc <= 120 cm (tenLoai dùng cho bộ phận nắp chụp — chấp nhận, so chữ tự do không tự chốt). |
| 841480 | **TRA_VE** | (A) 841480:84148011 SUY RỘNG: chữ biểu 'Tủ hút, lọc không khí sử dụng trong phòng thí nghiệm (SEN)' / 'Laminar airflow cabinets' — điều kiện chỉ còn dungCho 'phòng thí nghiệm', bỏ danh từ đầu 'Tủ hút, lọc không khí'. Hệ quả: nắp chụp hút có lọc >120 cm bất kỳ dùng trong phòng thí nghiệm lấn vào .11 MFN 0 thay vì .19 MFN 5. (B) phần còn lại (8414804 BO_VE 'trừ 8414.30/8414.40' — vế lặp phạm vi phân nhóm, chấp nhận; chongLanVanBan .42↔.43 hợp lý). |
| 841510 | **TRA_VE** | (A) 841510:84151020/84151030 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): chữ biểu 'Công suất làm mát …' / 'Of a cooling capacity …' (năng suất lạnh) được ghi bằng khoá congSuat = 'power output' (cachDoc power/output/wattage/rated power; hệ đơn vị W/mW/kW/HP, không có BTU/h). Máy điều hoà ghi cả công suất điện tiêu thụ lẫn năng suất lạnh (thường bằng BTU/h); bộ đọc lấy công suất điện ⇒ chọn sai dải. Hệ quả: máy năng suất lạnh 30 kW, điện 9 kW bị đọc ≤21,10 kW ⇒ .20 (MFN 30) thay vì .90 (MFN 20). Cần khoá riêng congSuatLamLanh (kW + BTU/h) — việc của Claude ở tu-vung. |
| 841520 | **TRA_VE** | (A) 841520:84152010 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): chữ biểu 'Công suất làm mát …' / 'Of a cooling capacity …' (năng suất lạnh) được ghi bằng khoá congSuat = 'power output' (cachDoc power/output/wattage/rated power; hệ đơn vị W/mW/kW/HP, không có BTU/h). Máy điều hoà ghi cả công suất điện tiêu thụ lẫn năng suất lạnh (thường bằng BTU/h); bộ đọc lấy công suất điện ⇒ chọn sai dải. Hệ quả: máy điều hoà xe năng suất lạnh >26,38 kW đọc theo công suất điện ⇒ .10 (MFN 25) thay vì .90 (MFN 17). |
| 841581 | **TRA_VE** | (A) 841581:84158111/12, .21, .31, .95–.98 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): chữ biểu 'Công suất làm mát …' / 'Of a cooling capacity …' (năng suất lạnh) được ghi bằng khoá congSuat = 'power output' (cachDoc power/output/wattage/rated power; hệ đơn vị W/mW/kW/HP, không có BTU/h). Máy điều hoà ghi cả công suất điện tiêu thụ lẫn năng suất lạnh (thường bằng BTU/h); bộ đọc lấy công suất điện ⇒ chọn sai dải. Hệ quả: vd tầng 'Loại khác' .97/.98 (MFN 25) lấn .99 (MFN 20); tàu hoả .21/.29 (25 vs 17). (B) 8415813 dungCho chứa nguyên chuỗi '(trừ loại thuộc phân nhóm 8415.20)' trong giá trị chữ tự do. |
| 841582 | **TRA_VE** | (A) 841582:84158211, .21, .31, .91 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): chữ biểu 'Công suất làm mát …' / 'Of a cooling capacity …' (năng suất lạnh) được ghi bằng khoá congSuat = 'power output' (cachDoc power/output/wattage/rated power; hệ đơn vị W/mW/kW/HP, không có BTU/h). Máy điều hoà ghi cả công suất điện tiêu thụ lẫn năng suất lạnh (thường bằng BTU/h); bộ đọc lấy công suất điện ⇒ chọn sai dải. Hệ quả: .91 'Công suất làm mát không quá 26,38 kW' (MFN cao) lấn .99 khi bộ đọc lấy công suất điện. |
| 841583 | **TRA_VE** | (A) 841583:84158311, .21, .31, .91 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): chữ biểu 'Công suất làm mát …' / 'Of a cooling capacity …' (năng suất lạnh) được ghi bằng khoá congSuat = 'power output' (cachDoc power/output/wattage/rated power; hệ đơn vị W/mW/kW/HP, không có BTU/h). Máy điều hoà ghi cả công suất điện tiêu thụ lẫn năng suất lạnh (thường bằng BTU/h); bộ đọc lấy công suất điện ⇒ chọn sai dải. Hệ quả: .91/.99 và .21/.29, .31/.39 chọn sai dải khi bộ đọc lấy công suất điện. |
| 841590 | **TRA_VE** | (A) 841590:8415901–8415904 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): chữ biểu 'Công suất làm mát …' / 'Of a cooling capacity …' (năng suất lạnh) được ghi bằng khoá congSuat = 'power output' (cachDoc power/output/wattage/rated power; hệ đơn vị W/mW/kW/HP, không có BTU/h). Máy điều hoà ghi cả công suất điện tiêu thụ lẫn năng suất lạnh (thường bằng BTU/h); bộ đọc lấy công suất điện ⇒ chọn sai dải. (năng suất lạnh của MÁY chủ, hàng là bộ phận). (B) 84159015 SUY RỘNG: 'Khung vỏ, đã hàn và sơn' / 'Chassis, welded and painted' — điều kiện chỉ tenLoai 'Khung vỏ', bỏ 'đã hàn và sơn' (máy tách sai: gộp vào DAU nên cổng 5 không báo); khung vỏ chưa hàn/sơn lấn .15 thay vì .19 (cùng MFN 3 nhưng sai mã). |
| 841780 | DUYET | 'Waste incinerators' ⇒ tenLoai Lò đốt rác thải; .90 Loại khác trần. |
| 841810 | **TRA_VE** | (A) 841810:8418103 SUY RỘNG: tiêu đề 'Chỉ có các cửa mở riêng biệt' / 'Fitted with separate external doors only' ghi tenLoai 'cửa mở riêng biệt' — mất chữ 'Chỉ'/'only' (và dùng TEN_LOAI cho một đặc điểm cấu tạo). Tủ lạnh-kết đông liên hợp có cả cửa riêng VÀ ngăn kéo riêng (dạng kết hợp, thuộc nhánh 'Loại khác:' r13338) vẫn thoả ⇒ lấn .31/.32 (MFN 25) thay vì .91/.99 (MFN 10/20). Máy tách sai: cổng 5 báo 'có các cửa mở riêng biệt — phủ' mà bỏ qua 'Chỉ'. |
| 841821 | DUYET | 'Of a capacity not exceeding 230 l' ⇒ dungTich <= 230 lít, giữ ngưỡng sổ tay. |
| 841830 | DUYET | 'Of a capacity not exceeding 200 l' ⇒ dungTich <= 200 lít (trong phân nhóm ≤800 l), giữ ngưỡng sổ tay. |
| 841840 | DUYET | 'Of a capacity not exceeding 200 l' ⇒ dungTich <= 200 lít (trong phân nhóm ≤900 l), giữ ngưỡng sổ tay. |
| 841850 | **TRA_VE** | (A) 841850:8418501 BO_VE SAI: vế 'có lắp thiết bị làm lạnh' / 'incorporating refrigerating equipment' bị miễn với lý do lặp thuộc tính phân nhóm, nhưng chữ phân nhóm 841850 là rộng hơn: 'có lắp thiết bị làm lạnh HOẶC KẾT ĐÔNG' / 'refrigerating or freezing equipment'. Bỏ vế ⇒ quầy/tủ bày hàng >200 l chỉ lắp thiết bị kết đông lấn tầng .11/.19 (MFN 5/10) thay vì .91/.99 (MFN 5/20). Bỏ vế làm đổi mã ⇒ đáng lẽ khai điều kiện hoặc DỪNG. (Cùng mẫu BO_VE ở 841810 .91 thì đúng vì 8418.10 là tủ kết hợp có làm lạnh.) |
| 841869 | **TRA_VE** | (A) 841869:8418694 SAI KHOÁ (đáng lẽ DỪNG/THIEU_KHOA_TU_VUNG): tiêu đề 'Thiết bị làm lạnh nước có công suất làm lạnh trên 21,10 kW' / 'Water chillers with a refrigeration capacity exceeding 21.10 kW' ghi congSuat > 21,1 kW — congSuat là 'power output' (công suất điện/cơ), không phải năng suất lạnh (chiller thường ghi tấn lạnh/BTU/h + công suất điện thấp hơn nhiều). Chiller 50 kW lạnh, 15 kW điện bị đọc ≤21,10 ⇒ rơi .90 thay vì .41/.49 (cùng MFN 10 nhưng sai mã; .41 'Dùng cho máy điều hòa không khí' là dòng tách riêng). |
| 841899 | DUYET | 'Evaporators or condensers' ⇒ tenLoai mảng; .40 'Aluminium roll-bonded panels … 8418.10.31…8418.29.00' (SEN: hai tấm nhôm cán ghép) ⇒ tenLoai + dungCho đủ năm mã; khớp. |
| 841911 | DUYET | 'Household type' ⇒ phamViSuDung GIA_DINH; .90 Loại khác trần. |
| 841919 | DUYET | 'Household type' ⇒ phamViSuDung GIA_DINH; .90 Loại khác trần. |
| 841933 | DUYET | Hai vế ';' 'For agricultural products; for wood, paper pulp, paper or paperboard' ⇒ dungCho mảng năm giá trị (HOẶC), khớp VI/EN. |
| 841934 | DUYET | Phân nhóm 'Other, for agricultural products'; .10 'Evaporators' tenLoai, .20 'Other, electrically operated' CON_LAI + điện; khớp VI/EN. |
| 841935 | DUYET | 'Electrically operated'/'Not electrically operated' khớp, phủ kín. |
| 841939 | DUYET | 'Machinery for the treatment of materials by a process involving heating, for the manufacture of printed circuit boards, printed wiring boards or printed circuit assemblies, electrically operated' ⇒ coGiaNhiet + congDung ba sản phẩm + điện; đủ ba vế. |
| 841940 | DUYET | 'Electrically operated'/'Not electrically operated' khớp, phủ kín. |
| 841950 | **TRA_VE** | (A) 841950:84195020 SUY RỘNG (BO_VE sai): chữ biểu 'Bộ trao đổi nhiệt làm bằng các ống fluoropolyme, với ống đầu vào và ống ra có đường kính trong từ 3 cm trở xuống (SEN)' / 'Heat exchange units made of tubes of fluoropolymers, with both inlet and outlet tubes …3 cm or less' — vế chất liệu 'bằng các ống fluoropolyme' bị BO_VE với lý do 'tu-vung@2 chưa có chất liệu fluoropolyme', nhưng tu-vung@2 ĐÃ có khoá bangFluoropolyme (CO_KHONG). Hệ quả: bộ trao đổi nhiệt ống kim loại có cửa vào/ra ≤3 cm lấn .20 thay vì .91/.92 (cùng MFN 3, sai mã 8 số; SEN 84195020 nhấn mạnh ống fluoropolymer thay cho ống kim loại). Ngưỡng 3 cm của SEN vẫn giữ. |
| 841981 | DUYET | 'Electrically operated'/'Not electrically operated' khớp, phủ kín. |
| 841989 | DUYET | Tầng 'Electrically operated:' ⇒ hoatDongBangDien CO; .13 máy gia nhiệt sản xuất PCB/PWB/PCA ⇒ coGiaNhiet + congDung; .20 không điện; khớp VI/EN. |
| 841990 | DUYET | Hai tầng 'Of electrically / non-electrically operated articles' ⇒ hoatDongBangDien; .12 bộ phận máy gia nhiệt PCB, .13 'Casings for cooling towers', .22 'Of instantaneous gas water heaters, household type' — đủ vế. |
| 842091 | DUYET | 'Cylinders' — 'Of goods of subheading 8420.10.10' ⇒ dungCho 8420.10.10 khớp. |
| 842099 | DUYET | 'Of goods of subheading 8420.10.10' ⇒ dungCho 8420.10.10 khớp. |
| 842119 | DUYET | 'Of a kind used for sugar manufacture' ⇒ congDung sản xuất đường khớp. |
| 842121 | DUYET | Hai tầng 'Of a capacity not exceeding / exceeding 500 l/h' ⇒ luuLuong <=/> 500 lít/giờ (biên đúng); .11 'for domestic use' GIA_DINH; điện/không điện. |
| 842122 | DUYET | 'Electrically operated, of a capacity exceeding 500 l/h' ⇒ điện CO + luuLuong > 500 lít/giờ, giữ ngưỡng 500 của sổ tay. |
| 842123 | DUYET | Ba tầng 84.29/84.30, xe có động cơ Ch.87, Loại khác; 'Oil filters' tenLoai Bộ lọc dầu; khớp VI/EN. |
| 842129 | DUYET | Đối chiếu bảy dòng; .60 'of fluoropolymers and with filter or purifier membrane thickness not exceeding 140 microns' ⇒ bangFluoropolyme + màng + doDay <= 140 micron; chongLanTruc .10/.20/.30 là chồng lấn thật của chữ biểu (đặc điểm 'phù hợp y tế/thí nghiệm' ↔ công dụng), ví dụ có thật (vd máy ép lọc thí nghiệm API dùng trong khoan dầu). |
| 842131 | DUYET | 'For machinery of heading 84.29 or 84.30' / 'For motor vehicles of Chapter 87' ⇒ dungCho khớp. |
| 842139 | DUYET | 'Air purifiers' tenLoai; .30 'stainless steel housing … inside diameters not exceeding 1.3 cm' ⇒ chatLieu thép không gỉ viTri VO + duongKinhTrong <= 1,3 cm, đủ vế. |
| 842191 | DUYET | Ba dòng 'Of goods of subheading 8421.12.00 / 8421.19.10 / 8421.11.00 or 8421.19.90' ⇒ dungCho đúng mã, phủ kín. |
| 842199 | DUYET | Tầng 'Filtering cartridges for filters of subheading 8421.23' ⇒ tenLoai Lõi lọc + dungCho 8421.23; mười dòng 'Of goods of subheading …' đối chiếu từng mã (8421.23.11/.21/.91/.19/.99, 8421.29.20/.50/.60, 8421.31, 8421.39.30/.90, 8421.21.11) khớp. |
| 842290 | DUYET | 'Of machines of subheading 8422.11' ⇒ dungCho 8422.11; .90 Loại khác trần. |

## Tổng hợp

- DUYET: **48** · TRA_VE: **17** · đỏ: 0 · chờ bảng hiệu chỉnh tiền lệ: 0 · chưa soát: 0 (tổng 65).
- Tỉ lệ sai theo PN6: 17/65 = **26.2 %**.
- Theo loại lỗi:
  - **Sai khoá "công suất làm mát/làm lạnh" → `congSuat`** (power output, không có BTU/h): 8 PN6 — 841430, 841510, 841520, 841581,
    841582, 841583, 841590, 841869. Lỗi hệ thống của nhóm 84.14/84.15/84.18: cần Claude thêm khoá riêng (vd `congSuatLamLanh`, đơn vị
    kW + BTU/h + tấn lạnh) vào tu-vung rồi soạn lại; người soạn không tự sửa được.
  - **Sai đơn vị**: 840682 "5 MW" ghi `donVi: "mW"` (miliwatt — hệ congSuat không có MW).
  - **Sai khoá "Đã lắp ráp hoàn chỉnh"** → `laBoPhan KHONG` thay vì `daLapRap CO`: 840734, 840820.
  - **Bỏ danh từ đầu / định ngữ giới hạn** (SUY RỘNG): 841370 (một tầng, một chiều hút, trục ngang), 841460 + 841480 ("Tủ hút, lọc
    không khí" / Laminar airflow cabinets), 841810 ("Chỉ"/"only"), 841590 .15 ("đã hàn và sơn").
  - **BO_VE sai**: 841850 ("có lắp thiết bị làm lạnh" hẹp hơn phân nhóm "làm lạnh hoặc kết đông"), 841950 (BO_VE chất liệu
    fluoropolyme với lý do thiếu khoá trong khi `bangFluoropolyme` đã có).
- Dòng 8 số chịu ảnh hưởng trực tiếp có chênh MFN: 84068210 (0, gần như rỗng), 840734 .71–.73 ↔ .94–.99 (20/10 ↔ 18), 840820
  .21/.23 ↔ .94/.96 (20/7 ↔ 25/15), 84137011/19 (20) ↔ .42/.43/.49 (10), 84146011 (0) ↔ .19 (15), 84148011 (0) ↔ .19 (5), 841510
  .20/.30 (30) ↔ .90 (20), 84152010 (25) ↔ .90 (17), 841581 .97/.98 (25) ↔ .99 (20), 84181031/32 (25) ↔ .91/.99 (10/20), 841850
  .19 (10) ↔ .99 (20).
- Cổng 5: 65 PN6 xanh; 11 cảnh báo `cong5-bo-ve` trong lô — người soát xác nhận đúng 9 (8409997, 8414804, 84181091,
  8415901–8415904 "Của máy", 84159015 "trừ 8415.90.13"), sai 2 (8418501, 84195020) ⇒ tỉ lệ báo đúng việc cần đọc 2/11. Ngoài ra 5 lỗi SUY RỘNG nằm ở chỗ cổng 5 báo "phủ"
  hoặc coi là DAU (xem mục dưới) — cổng 5 KHÔNG bắt được.

## Máy tách sai (§2 — cho Claude sửa `lib/ho-so/tach-ve.js`)

1. **Định ngữ đứng trước danh từ đầu bị nuốt vào DAU** — 841370 tiêu đề 8413701 "Bơm nước một tầng, một chiều hút, trục ngang được
   truyền động …": DAU = "Bơm nước một tầng, một chiều hút, trục ngang"; ba giới hạn (Single stage, single suction, horizontal shaft)
   không thành vế nên điều kiện chỉ `tenLoai "Bơm nước"` vẫn xanh.
2. **Phân từ sau dấu phẩy bị nuốt vào DAU** — 841590 84159015 "Khung vỏ, đã hàn và sơn, trừ …": DAU = "Khung vỏ, đã hàn và sơn";
   vế "đã hàn và sơn" (welded and painted) không được kiểm.
3. **Trạng từ hạn định "Chỉ" bị rơi** — 841810 8418103 "Chỉ có các cửa mở riêng biệt": vế máy tách là "có các cửa mở riêng biệt",
   "Chỉ"/"only" mất, nên điều kiện thiếu phủ định nhánh kết hợp vẫn báo "phủ".
4. **Tên hàng đứng đầu (không phải vế) không bị đòi phủ** — 841460/841480 84146011/84148011 "Tủ hút, lọc không khí sử dụng trong phòng
   thí nghiệm": DAU không có điều kiện nào ứng mà cổng 5 vẫn xanh (chỉ phủ vế "sử dụng trong phòng thí nghiệm").
5. **"khác" trong vế dùng-cho bị bỏ qua** — 840734 .50/.92 "Dùng cho xe khác thuộc nhóm 87.01", 840999 tầng 8409994 "xe khác thuộc
   Chương 87": máy coi "phủ" khi điều kiện chỉ ghi "87.01"/"Chương 87"; chồng lấn với dòng anh em trước (cùng MFN nên chưa trả về vì
   lý do này — khuôn đã DUYET ở 840991).
6. **Cổng 3 không đối chiếu đơn vị theo hoa/thường** — 840682 trích "5 MW" nhưng `donVi: "mW"` vẫn qua cổng (cảnh báo chỉ là
   "bien-khong-doc-duoc"). Đề nghị cổng 3 so khớp đơn vị phân biệt hoa/thường và DỪNG khi đơn vị trong trích không có trong hệ.
