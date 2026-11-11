# Soát độc lập lô L27 (#1109) — 64 PN6 (8474–8506)

- Phiên soát: `claude-agent:duyet-L27-20261111#soat-L27` (khác phiên soạn).
- Cách làm: từng PN6 chạy `--kiem` (đều XANH, không DỪNG), `--ve` (chữ biểu VI + EN từng mục), đặt từng điều kiện bản nháp
  cạnh chữ biểu, đọc mọi cảnh báo (cong3-bien-khong-doc-duoc đối chiếu biên bằng tay, cong5-bo-ve, chongLanVanBan/chongLanTruc
  + viDuHang, can-bang-hieu-chinh-tien-le-da-co). Bổ sung 11/11: đối chiếu `dieuKienSo` mang số của sổ tay trên origin/main
  (8481, 8501, 8504, 8506) — không bản DUYET nào bỏ ngưỡng số; `--ap-dung` không báo `cong3-mat-nguong-so`. Không gặp mẫu
  "đông lạnh/tươi" hay tên phân nhóm tự chứa vế dòng trong lô này.
- Không chạy `bo-kiem-luat --toan-bieu` (theo chỉ đạo tech lead).

## Kết quả

| Kết luận | Số PN6 | Số dòng 8 số |
|---|---|---|
| DUYET (+ `--ap-dung`) | 51 | 181 |
| TRA_VE | 13 | 91 |
| Đỏ — không soát | 0 | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 | 0 |
| Chưa soát | 0 | 0 |

Tỉ lệ sai theo PN6: **13/64 = 20,3%**. Theo phân nhóm: nhóm 8486 (thiết bị bán dẫn/màn hình dẹt) sai 3/4 PN6 — chữ biểu dài,
nhiều vế liệt kê, bộ tách vế đọc sai cấu trúc nhiều nhất; 8501–8502 (công suất) và 8481 (đường kính) sạch hoàn toàn — điều kiện
số + biên đều khớp.

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 847410 | DUYET | hoatDongBangDien CO/KHONG |
| 847420 | DUYET | tiêu đề điện/không điện; "Dùng cho đá" dungCho |
| 847431 | DUYET | điện/không điện |
| 847432 | DUYET | ≤80 tấn/giờ ("not exceeding 80 t per hour") |
| 847439 | DUYET | điện/không điện |
| 847480 | DUYET | điện/không điện |
| 847590 | DUYET | dungCho phân nhóm 8475.21.00 |
| 847689 | DUYET | "Máy đổi tiền" |
| 847690 | DUYET | "Của máy đổi tiền" |
| 847710 | DUYET | đúc cao su / đúc plastic / máy đúc phun PVC |
| 847720 | DUYET | đùn cao su / đùn plastic |
| 847740 | **TRA_VE** | .10/.20 "Để đúc hoặc tạo hình cao su/plastic" ghi `tenLoai` "cao su"/"plastic" — vật liệu gia công bị đặt vào khoá TÊN HÀNG; máy ép chân không có tên không chứa chữ vật liệu ⇒ cả hai dòng TRÁI (THU HẸP). Phải là dungCho/congDung như 847720/847759 |
| 847759 | DUYET | dungCho cao su / plastic |
| 847780 | **TRA_VE** | .31 "Máy ép lớp mỏng dùng để sản xuất tấm mạch in…"/"Lamination presses…" bỏ tên đầu "Máy ép lớp mỏng" (không lặp tầng cha) ⇒ mọi máy plastic chạy điện dùng sản xuất PCB lấn .39 → .31 (SUY RỘNG) |
| 847790 | DUYET | 5 mục đúng; lưu ý `dieuKienNut[847790]` (phạm vi, trích chú giải nhóm) không vào sổ tay |
| 847810 | DUYET | điện/không điện |
| 847910 | DUYET | điện/không điện |
| 847920 | DUYET | điện/không điện |
| 847940 | DUYET | điện/không điện |
| 847981 | DUYET | điện/không điện |
| 847982 | DUYET | điện/không điện |
| 847989 | **TRA_VE** | .10 "Thiết bị tự động sắp đặt hoặc loại bỏ các linh kiện hoặc phần tử tiếp xúc …"/"Automated machines for the placement or the removal of components…" — mất vế chức năng "sắp đặt hoặc loại bỏ linh kiện", chỉ còn "Thiết bị tự động" + chủ yếu dùng sx PCBA ⇒ máy tra keo/phủ conformal/tách bo lấn .69 → .10 (SUY RỘNG). Bảng 847989-01 KHONG_LECH đã đọc |
| 847990 | DUYET | dungCho 8479.89.10 / 8479.89.50 |
| 848030 | DUYET | "Bằng đồng" chatLieu |
| 848071 | **TRA_VE** | .10 "Khuôn làm đế giày, dép"/"Moulds for footwear soles" tách thành tenLoai ["Khuôn làm đế giày","dép"] ⇒ "dép" đứng riêng kéo khuôn dép nguyên chiếc vào .10 (MFN 3%) thay vì .90 (0%) (SUY RỘNG) |
| 848079 | **TRA_VE** | cùng lỗi 848071 ở .10 |
| 848110 | DUYET | biên tay: >5 & ≤40 cm (thêm biên 40 sổ tay cũ thiếu), ≤2,5/>2,5, 1–2,5 cm; giữ ngưỡng số |
| 848130 | DUYET | biên tay: 4–60 cm, ≤2,5, 1–2,5 cm; giữ ngưỡng số |
| 848140 | DUYET | biên tay: ≤2,5, 1–2,5 cm; giữ ngưỡng số |
| 848320 | **TRA_VE** | .30 "Dùng cho động cơ xe của Chương 87"/"For engines of vehicles of Chapter 87" ghi dungCho "Chương 87", bỏ "động cơ" ⇒ thân ổ cho moay-ơ/hộp số xe lấn .90 (MFN 0%) → .30 (MFN 10%) (SUY RỘNG) |
| 848330 | **TRA_VE** | cùng lỗi 848320 ở .30 (MFN 10% vs 0%) |
| 848530 | DUYET | "Bằng lắng đọng thủy tinh" ↔ chatLieu thủy tinh |
| 848590 | DUYET | dungCho 8485.20.00 |
| 848610 | DUYET | 6 dòng; quay ly tâm/laser bằng khoá liệt kê; chongLanVanBan .10↔.40 hợp lý. Ghi nhận giá trị chữ tự do kém đẹp ở .50/.60 |
| 848620 | **TRA_VE** | .31 hai vế rời (máy deflash chân dẫn vỏ linh kiện; dụng cụ PHUN cho tấm wafer) gộp thành một bộ VÀ + bỏ "dụng cụ phun" ⇒ máy deflash rơi .39 (THU HẸP), mọi thiết bị làm sạch wafer không phun thành TRANH_CAP với .33 (SUY RỘNG); thêm .95, .93 |
| 848630 | **TRA_VE** | .20 bắt buộc tenLoai "Thiết bị khắc axit" cho cả hiện ảnh/tẩy rửa/làm sạch (EN "Apparatus for wet etching, developing, stripping or cleaning") — THU HẸP; .30 BO_VE "bằng phương pháp quay" với lý do "không có khoá" là sai (có `nguyenLyXuLy QUAY`) ⇒ máy phủ không quay lấn .90 → .30 |
| 848690 | **TRA_VE** | tầng r14741 "Của thiết bị khắc axit bằng phương pháp ướt, máy điện ảnh, thiết bị tẩy rửa hoặc làm sạch màn hình dẹt" ghi dungCho [3 thiết bị] VÀ congDung "làm sạch màn hình dẹt" ⇒ bộ phận thiết bị khắc ướt/hiện ảnh không làm sạch rơi .39 (THU HẸP), mất "bằng phương pháp ướt" nên bộ phận thiết bị khắc KHÔ (.31) cũng thoả (SUY RỘNG); cổng 2 chỉ thử MẪU (cong2-lay-mau, 39,7 triệu vector); .44/.45 dungCho "thiết bị chuyên" (cắt nhầm "chuyên dùng"); dieuKienNut[848690] congDung "khối" |
| 850120 | DUYET | ≤1 kW / >1 kW; dungCho năm nhóm |
| 850132 | DUYET | 750 W–37,5 kW / 37,5–75 kW; "xe của Chương 87" đúng chữ |
| 850133 | DUYET | dungCho Chương 87 |
| 850151 | DUYET | dungCho năm nhóm |
| 850152 | DUYET | ba tầng công suất, dungCho khớp từng dòng |
| 850153 | DUYET | dungCho Chương 87 |
| 850162 | DUYET | 75–150 / 150–375 kVA; giữ ngưỡng số |
| 850172 | DUYET | ≤750 W / 750 W–37,5 kW / 37,5–75 / >75 kW; giữ ngưỡng số |
| 850180 | DUYET | ≤75 / 75–375 / 375–750 / >750 kVA; giữ ngưỡng số |
| 850212 | DUYET | 75–125 / 125–375 kVA |
| 850213 | DUYET | ≥12.500 kVA (biên tay) |
| 850220 | DUYET | ≤75 / 75–100 / 100–10.000; >10.000 → ≥12.500 |
| 850231 | DUYET | ≤10.000 / >10.000 kVA |
| 850300 | **TRA_VE** | .20 "Bộ phận của máy phát điện … thuộc nhóm 85.01 hoặc 85.02, ≥12.500 kVA" ghi dungCho ["85.01","85.02"], bỏ "máy phát điện" ⇒ bộ phận ĐỘNG CƠ 85.01 cỡ lớn lấn .90 → .20 (SUY RỘNG, cùng MFN 5%) |
| 850421 | DUYET | biên tay kV/kVA; .11 không ghi tên "Máy biến đổi đo lường" (vế của tiêu đề cha, không có hàng thật đổi mã) |
| 850422 | DUYET | ≥66 / ≥110 / 66–<110 kV |
| 850423 | DUYET | ≤15.000 / >15.000 → ≤20.000, 20.000–30.000 |
| 850431 | DUYET | biên tay kV, tầng r14985; điều kiện SEN (hồi lưu, phối hợp trở kháng, chỉnh bằng tay); chongLanTruc có ví dụ |
| 850432 | DUYET | ≤5 / ≤10 / >10 kVA; ≥3 MHz |
| 850433 | DUYET | ≥66 kV; BO_VE "Có đầu" đúng (máy tách sai) |
| 850440 | DUYET | UPS/chỉnh lưu/nghịch lưu LIET_KE, >100 kVA giữ ngưỡng; bảng 850440-01/02 KHONG_LECH; ghi nhận .20 bỏ chữ "pin" |
| 850450 | **TRA_VE** | .10 "Cuộn cảm dùng cho bộ nguồn cấp điện của các thiết bị xử lý dữ liệu tự động …, và thiết bị viễn thông" ghi dungCho ["bộ nguồn cấp điện","thiết bị viễn thông"] — cắt định ngữ khỏi "bộ nguồn" ⇒ cuộn cảm cho bộ nguồn bất kỳ lấn sang .10 (SUY RỘNG) |
| 850490 | **TRA_VE** | .31/.41 phương án tenLoai ["ống tản nhiệt","cụm tấm"] — "cụm tấm" mất "tản nhiệt" ⇒ cụm tấm lõi thép cho biến áp phân phối vào .31/.41 (MFN 5%) thay vì .39/.49 (0%) (SUY RỘNG) |
| 850590 | DUYET | MRI chỉ/chủ yếu; đầu nâng điện từ |
| 850610 | DUYET | ≤300 cm3; kẽm-cacbon/kiềm |
| 850660 | DUYET | ≤300 cm3; giữ ngưỡng số |
| 850680 | DUYET | ≤300 cm3; giữ ngưỡng số |

## Lỗi máy tách vế (cho Claude chỉnh `lib/ho-so/tach-ve.js`)

1. **Dấu phẩy trong danh từ ghép "giày, dép"** (848071/848079 .10): "Khuôn làm đế giày, dép" (footwear) bị coi là liệt kê ⇒ người
   soạn tách giá trị. Nên coi "giày, dép" là một cụm (EN một danh từ "footwear").
2. **DAU nuốt vế chức năng** (847989 .10): "Thiết bị tự động sắp đặt hoặc loại bỏ các linh kiện hoặc phần tử tiếp xúc chỉ sử dụng
   hoặc chủ yếu" bị coi là một danh từ đầu, vế "sắp đặt hoặc loại bỏ …" (EN "for the placement or the removal of …") không bị đòi
   phủ; còn cắt đôi "chỉ sử dụng hoặc chủ yếu | sử dụng để". Tương tự 848620 .95 "Máy tự động dịch chuyển hoặc bóc tách …".
3. **Liệt kê chức năng sau danh từ đầu** (848630 .20, 848690 r14741): "Thiết bị khắc axit bằng phương pháp ướt, hiện ảnh, tẩy rửa
   hoặc làm sạch …" — EN "Apparatus for wet etching, developing, stripping or cleaning": danh từ đầu là "Thiết bị", không phải
   "Thiết bị khắc axit".
4. **"chuyên dùng để"** (848690 .44/.45): cắt thành "thiết bị chuyên" + "dùng để …".
5. **"Có đầu điện áp cao"** (850433 tiêu đề 8504331; 850421/850422 "… và đầu | điện áp cao"): "đầu điện áp cao" (high side
   voltage) bị cắt, "đầu" rơi sang vế trước hoặc thành vế riêng "Có đầu".
6. **Dấu phẩy trong "ống tản nhiệt đã lắp ráp thành dạng tấm phẳng, cụm tấm"** (850490): bộ tách báo "danh từ đầu liên hợp" ⇒
   người soạn tách "cụm tấm" khỏi "tản nhiệt".

## Đo cổng 5

Cổng 5 xanh cho cả 64 PN6, nhưng 13 bản vẫn sai — 9/13 lỗi nằm ở vế mà máy báo "phủ" vì một giá trị chữ tự do (`dungCho`
"Chương 87", `tenLoai` "Thiết bị tự động", `dungCho` ["85.01","85.02"]) đọc tới chữ của vế dù đã bỏ một phần định ngữ/đích. Đề
xuất: cổng 5 so phần chữ của vế còn lại sau khi trừ giá trị (vd vế "dùng cho động cơ xe của Chương 87" − "Chương 87" còn "động cơ
xe" ⇒ cảnh báo).
