# Soát độc lập L1-4c — lô L13 (#1109)

Phiên soát: `claude-agent:duyet-L13-20261111#soat-L13` (khác phiên soạn `https://claude.ai/code/session_…#soan-<pn6>`). Ngày 11/11/2026.

Cách làm cho từng PN6: `--kiem` (55/55 XANH, 0 DỪNG) → `--ve` (chữ biểu VI + EN từng dòng/tầng, từng vế) → đặt mọi điều kiện cạnh
chữ biểu, hỏi ba câu §2 → đọc cảnh báo (`cong5-bo-ve` 401310/401390/401610/401700/420212, `cong2-chong-lan-van-ban` 400821,
`cong2-tuong-tu-chua-chot` + `cong2-toi-khi-tuong-tu` 401490, `cong3-bien-khong-doc-duoc` 420211, `so-chu-tu-do`) → tra
`data/precedents.json` theo mã (401180, 40059990, 42022200, 42029190, 42029290 có tiền lệ liên quan) và
`data/ho-so/hieu-chinh-tien-le.json` (không PN6 nào trong lô bị đòi bảng). Mỗi dòng nghi ngờ được **thử chạy** bằng
`lib/dieu-kien-so.js#danhGiaTuChu` trên một mô tả hàng thật (ghi trong cột ghi chú) để xác nhận hệ quả, không chỉ suy luận trên chữ.
Lô không có ghi chú `DE_TRONG` / "người soát xem" nên không cần `--giai-quyet`.

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 400110 | DUYET | Tiêu đề amoniac `> 0,5` / `<= 0,5` % thể tích đúng biên; .11/.21 tenLoai "Mủ cao su cô đặc" + phuongPhapCheTao LY_TAM ("Centrifuged") |
| 400121 | DUYET | RSS hạng 1–5 tên nguyên văn |
| 400122 | DUYET | TSNR 10/20/L/CV/GP/5 tên nguyên văn |
| 400129 | **TRA_VE** | (A) 40012980 "Scrap (tree, earth or smoked) **and** cup lump" — hai hàng thay thế bị ghi hai TEN_LOAI VÀ ⇒ cup lump riêng TRAI, rơi .99. (B) 40012950 "Crếp loại khác" giữ âm tiết "khác" ⇒ "Crếp cao su nâu" TRAI. (C) tầng r6313 "dạng nguyên sinh" ⇒ DPNR "dạng khối" TRAI |
| 400130 | DUYET | "Dạng nguyên sinh" / "In primary forms" |
| 400219 | **TRA_VE** | 40021910 "chưa lưu hóa" ghi `congDung`, "chưa pha trộn" ghi `dungCho` (trạng thái ≠ công dụng) ⇒ tấm SBR "đã lưu hóa, đã pha trộn" vẫn CHUA_BIET, giới hạn không bao giờ loại được hàng; anh em dùng tenLoai PHAI_KHONG |
| 400220 | DUYET | "Dạng nguyên sinh" |
| 400231 | **TRA_VE** | 40023110 tenLoai ["Dạng tấm","tờ","dải"] giữ âm tiết "dạng" ⇒ "Tấm cao su butyl chưa lưu hóa, chưa pha trộn" TRAI .10, rơi .90 (400219 ghi đúng ["tấm","tờ","dải"]) |
| 400239 | **TRA_VE** | Cùng lỗi 400231 ở 40023910 |
| 400249 | DUYET | "Dạng nguyên sinh" |
| 400259 | DUYET | "Dạng nguyên sinh" |
| 400260 | DUYET | "Dạng nguyên sinh" |
| 400270 | DUYET | "Dạng nguyên sinh" |
| 400280 | DUYET | "Mixtures of natural rubber latex with synthetic rubber latex" cả cụm |
| 400299 | **TRA_VE** | 40029940 phương án 2 của HOAC ghi ["dạng tấm","tờ","dải"] — cùng lỗi 400231 |
| 400510 | **TRA_VE** | 40051010 "Của nhựa tự nhiên" / "Of natural gums" ghi tenLoai "nhựa tự nhiên" ⇒ cao su tự nhiên hỗn hợp muội carbon TRAI, rơi .90; theo Chú giải 1 Ch.40 và loại trừ (k) Ch.13 ("Cao su tự nhiên, … hoặc các loại nhựa tự nhiên tương tự (nhóm 40.01)") thì "nhựa tự nhiên" gồm cả cao su tự nhiên |
| 400591 | **TRA_VE** | Cùng lỗi 400510 ở 40059110 |
| 400599 | **TRA_VE** | (A) 40059910 "Dạng latex (dạng mủ cao su)" chỉ ghi "Dạng latex" ⇒ "Mủ cao su hỗn hợp" TRAI. (B) 40059920 vế lặp chữ phân nhóm ("được pha trộn với các chất", "trừ carbon hoặc silica") ghi thành TEN_LOAI bắt buộc ⇒ "Cao su tự nhiên hỗn hợp … đã trộn lưu huỳnh" TRAI |
| 400690 | **TRA_VE** | 40069011 TEN_LOAI "Các sản phẩm" ("Articles") — tên thật không chứa chữ "sản phẩm" ⇒ TRAI; tầng 4006901 "nhựa tự nhiên" cùng lỗi 400510 |
| 400811 | **TRA_VE** | 40081110 "lined with textile fabric **on one side**": chatLieu CHINH "vải dệt" + bỏ vế "có một mặt" ⇒ lót hai mặt cũng vào .10; người soạn tự ghi "từ vựng chưa có vị trí lót" ⇒ đáng lẽ THIEU_KHOA/DỪNG |
| 400821 | **TRA_VE** | Cùng lỗi 400811 ở 40082110 (chongLanVanBan .10↔.30/.40 hợp lý) |
| 400912 | TRA_VE (tech lead soát lại) | Bỏ mất ngưỡng số SEN (ĐK ≥ 15,24 cm, thành ≥ 1,27 cm, áp suất bục…) — khoá CO là lùi so với sổ tay đang chạy |
| 400921 | TRA_VE (tech lead soát lại) | Bỏ mất ngưỡng số SEN (ĐK ≥ 15,24 cm, thành ≥ 1,27 cm, áp suất bục…) — khoá CO là lùi so với sổ tay đang chạy |
| 400922 | TRA_VE (tech lead soát lại) | Bỏ mất ngưỡng số SEN (ĐK ≥ 15,24 cm, thành ≥ 1,27 cm, áp suất bục…) — khoá CO là lùi so với sổ tay đang chạy |
| 400931 | TRA_VE (tech lead soát lại) | Bỏ mất ngưỡng số SEN (ĐK ≥ 15,24 cm, thành ≥ 1,27 cm, áp suất bục…) — khoá CO là lùi so với sổ tay đang chạy |
| 400932 | TRA_VE (tech lead soát lại) | Bỏ mất ngưỡng số SEN (ĐK ≥ 15,24 cm, thành ≥ 1,27 cm, áp suất bục…) — khoá CO là lùi so với sổ tay đang chạy |
| 400941 | TRA_VE (tech lead soát lại) | Bỏ mất ngưỡng số SEN (ĐK ≥ 15,24 cm, thành ≥ 1,27 cm, áp suất bục…) — khoá CO là lùi so với sổ tay đang chạy |
| 400942 | TRA_VE (tech lead soát lại) | Bỏ mất ngưỡng số SEN (ĐK ≥ 15,24 cm, thành ≥ 1,27 cm, áp suất bục…) — khoá CO là lùi so với sổ tay đang chạy |
| 401120 | DUYET | duongKinhVanh (đúng trục "fitting a rim"), biên 230/385/450 mm, 16 inch đúng |
| 401212 | DUYET | Rộng ≤ 450 mm (rộng của chính lốp) |
| 401219 | DUYET | Nhóm 84.27, 84.29/84.30, tầng Chương 87, .41 máy kéo nông/lâm nghiệp (thử THOẢ) |
| 401220 | **TRA_VE** | 40122010 dungCho "ô tô con (motor car)" bỏ vế "kể cả … station wagons và ô tô đua" + nhét chữ Anh ⇒ lốp cũ ô tô đua TRAI .10 → 40122079 (MFN 20% thay vì 25%); tầng 4012202 nhét "(buses)/(lorries)" |
| 401290 | DUYET | Tầng lốp đặc / nửa đặc / hoa lốp; biên 250/450 mm; "Lót vành" |
| 401310 | **TRA_VE** | 40131011/19/21/29 SAI TRỤC: "Suitable for fitting to **tyres** of a width …" — chieuRong là rộng của LỐP, BO_VE "Dùng cho loại lốp" biến nó thành rộng của săm (như 401180); chênh MFN 30% ↔ 10%. Tầng 4013101 bỏ "kể cả … ô tô đua" |
| 401390 | **TRA_VE** | Cùng lỗi SAI TRỤC 401310 ở sáu dòng .11/.19/.31/.39/.91/.99 |
| 401490 | **TRA_VE** | 40149010 "Teats for feeding bottles **and similar articles**": dungCho "bình cho trẻ em ăn" áp cả cho hàng tương tự ⇒ ty ngậm (soother) trả lời "không dùng cho bình" thì TRÁI; phải HOAC (SOAT §1 TUONG_TU) |
| 401610 | **TRA_VE** | 40161020 "Floor tiles **and** wall tiles" ghi congDung "lát nền" VÀ "ốp tường" ⇒ tấm chỉ ốp tường TRAI (đã thử); BO_VE viện "mẫu đã duyệt 40169940" nhưng 401699 đang NHAP |
| 401691 | **TRA_VE** | 40169120 "Dạng tấm rời" giữ "dạng" ⇒ "Tấm cao su rời ghép lát sàn" TRAI .20, THOẢ .10 mats ⇒ tiles rơi nhầm 40169110 |
| 401692 | DUYET | "Đầu tẩy (eraser tips)" |
| 401693 | DUYET | .10 coCachDien + chân tụ điện; .20 gaskets/o-rings mảng hoặc + mã 87.xx |
| 401700 | **TRA_VE** | 40170010 cùng lỗi VÀ 401610; 40170020 TEN_LOAI "Các sản phẩm" ⇒ sản phẩm cao su cứng khai tên riêng TRAI |
| 410190 | DUYET | giaiDoanThuocDa CHUAN_BI_DE_THUOC ("Pre-tanned") |
| 410411 | **TRA_VE** | 41041110 "Của động vật họ trâu bò" ghi `dungCho` (nguồn gốc ≠ đích dùng) ⇒ "Da ngựa thuộc thực vật" luôn CHUA_BIET, không bao giờ bị loại khỏi .10 dù 4104.11 gồm cả ngựa ⇒ THIEU_KHOA/DỪNG |
| 420211 | **TRA_VE** | 42021110 "56cm x 45cm x 25cm" chỉ ghi `kichThuoc <= 56 cm`, bỏ biên 45 và 25 cm (người soạn tự ghi "không có chỗ trong khung") ⇒ đáng lẽ THIEU_KHOA/DỪNG |
| 420212 | DUYET | BO_VE "đeo vai" chấp nhận (EN "School satchels" một danh từ); "sợi lưu hóa" tenLoai |
| 420219 | DUYET | "bìa" tenLoai (chatLieu không tách paperboard) |
| 420222 | **TRA_VE** | .10/.20 ghi TEN_LOAI "tấm plastic" / "vật liệu dệt" thay vì chatLieu có sẵn ⇒ túi xách mặt vải polyester và túi PVC TRAI CẢ HAI dòng (phân nhóm không có Loại khác); tiền lệ 8412/TB-TCHQ (túi PU → 42022200) không tới được |
| 420291 | DUYET | Túi thể thao / bowling; tiền lệ 195, 4410, 4411/TB-TCHQ (→ .90) khớp |
| 420292 | DUYET | Túi vệ sinh cá nhân + chatLieu plastic; tiền lệ 578/TB-CHQ, 3162/TCHQ-TXNK (→ .90) khớp |
| 420299 | DUYET | "sợi lưu hóa hoặc bìa" mảng hoặc |
| 420321 | DUYET | Găng bóng chày / bóng mềm mảng hoặc |
| 420329 | DUYET | Găng tay bảo hộ lao động |
| 420500 | **TRA_VE** | (A) 42050040 "machinery **or** mechanical appliances **or** other technical uses" ghi TEN_LOAI "Sản phẩm khác" VÀ dungCho VÀ congDung ⇒ "Dây curoa da dùng cho máy khâu" TRAI, rơi .90: MFN 20% thay vì 5%. (B) .30 bỏ "Dây" (strings), chỉ còn "dây tết". (C) .10 nhét "(mats)" |
| 430390 | **TRA_VE** | 43039020 TEN_LOAI "Sản phẩm" ("Articles for industrial uses") ⇒ "Găng da lông dùng trong công nghiệp" TRAI, rơi .90: MFN 15% thay vì 25% |
| 430400 | **TRA_VE** | 43040020 cùng lỗi 430390 |

## Tổng hợp

| | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 31 |
| TRA_VE | 24 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo PN6: **24/55 = 43,6 %**. Theo chương: Ch.40 18/41 (4001 1/5, 4002 4/10, 4005–4006 4/4, 4008 2/2, 4009 0/7,
4011–4012 1/5, 4013 2/2, 4014 1/1, 4016 2/4, 4017 1/1); Ch.41 1/2; Ch.42 3/10; Ch.43 2/2.
Dòng 8 số bị ảnh hưởng trực tiếp ≈ 40 (kể cả dòng "Loại khác" nhận nhầm). Bốn lỗi có chênh MFN: 401310 (30% ↔ 10%), 420500 (5% ↔ 20%),
430390 (25% ↔ 15%), 401220 (25% ↔ 20%).

Cổng 5: 5 cảnh báo `cong5-bo-ve` (13 vế) — người soát xác nhận đúng 1 PN6 (420212 "đeo vai"), bác 4 PN6 (401310, 401390 bỏ vế làm
đổi trục; 401610, 401700 lý do VÀ trái chữ Anh). Cảnh báo `cong5` "TÁCH ĐỊNH NGỮ (B)" ở 401610/401700 là đúng (máy thấy vấn đề, người
soạn miễn sai).

## Loại lỗi lặp lại (cho người soạn + cổng máy)

1. **TEN_LOAI mang chữ khung** — "Dạng …", "… loại khác", "Sản phẩm", "Các sản phẩm", "(motor car)", "(mats)": bộ so âm tiết
   (`amTiet`, chỉ bỏ `HU_TU`) giữ các âm tiết này nên tên hàng thật không bao giờ khớp ⇒ TRAI ⇒ rơi "Loại khác"
   (400129, 400231, 400239, 400299, 400690, 401220, 401310, 401691, 401700, 420500, 430390, 430400). Đề xuất cổng: cảnh báo
   khi giá trị TEN_LOAI chứa âm tiết thuộc `TU_CHUNG_TEN_LOAI` ("dạng", "khác", "sản phẩm") hoặc chữ Latinh trong ngoặc của
   chữ Việt; hoặc cho `amTiet` bỏ cùng tập đó.
2. **"và" giữa HAI hàng thay thế ghi thành VÀ** (400129 .80, 401610 .20, 401700 .10, 420500 .40) — chữ Anh "X and Y" / "X or Y or Z"
   là liệt kê hàng, phải là mảng/HOAC.
3. **Khoá sai nghĩa để cổng xanh** — trạng thái ghi congDung/dungCho (400219), nguồn gốc ghi dungCho (410411), lót một mặt ghi
   chatLieu CHINH (400811, 400821), chiều rộng lốp ghi chieuRong của săm (401310, 401390), ba chiều ghi một biên (420211). Đúng ra
   phải `THIEU_KHOA_TU_VUNG` ⇒ DỪNG. Khoá đề xuất: chiều rộng lốp lắp (săm 4013), lót vải một mặt (4008), loài động vật da (4104),
   kích thước ba chiều (4202.11).
4. **"nhựa tự nhiên" (natural gums)** = cả nhóm 40.01 kể cả cao su tự nhiên (400510, 400591, 400690) — cần Claude chốt cách đọc
   chung cho Ch.40.

## Máy tách sai (§2) — để Claude chỉnh `lib/ho-so/tach-ve.js`

- 401120 .11/.12: cắt "Có chiều rộng không quá 230 mm **và lắp vành**" | "có đường kính …" — "lắp vành" thuộc vế đường kính
  ("fitting a rim of a diameter …").
- 400811/400821 .10: cắt "Chiều dày trên 5 mm, **có một mặt**" | "được lót vải dệt" — "có một mặt" thuộc vế lót ("lined … on one
  side"); vì bị gộp vào vế chiều dày nên cổng 5 báo "phủ" (nhờ doDay) và che mất vế "một mặt" bị bỏ.
- 410190 .10: cắt "Đã" (DAU) | "được chuẩn bị" | "để thuộc" — cả câu là một cụm ("Pre-tanned").
- 400129 .10: cắt "được làm khô" | "bằng không khí" — một cụm ("Air-dried").
- 400129 .80: coi "Loại" là đầu ngữ và cả "tận thu (…) và phần thừa lại trên chén" là MỘT vế giới hạn — thực ra hai danh từ đầu nối
  "và" ("Scrap … and cup lump"); máy không nhận ra liên hợp nên không cảnh báo hai TEN_LOAI VÀ.
- 420500 .40: "dùng cho máy móc hoặc thiết bị cơ khí hoặc mục đích kỹ thuật khác" coi là một vế "phủ" dù điều kiện tách thành VÀ
  qua hai khoá — cổng 5 nên kiểm vế có "hoặc" mà điều kiện phủ nằm trên ≥ 2 khoá khác nhau (VÀ ngầm).


## Soát lại của tech lead (CI đỏ test-so-tay-gates)

7 PN6 nhóm 4009 bị trả về: bản nháp thay định nghĩa SEN có số (ống hút và xả bùn dùng trong khai thác mỏ: đường kính ≥ 15,24 cm, độ dày thành ≥ 1,27 cm, áp suất bục ≥ 517 kPa) bằng một khoá CO/KHÔNG. Sổ tay đang chạy chốt dòng bằng các ngưỡng này; duyệt bản nháp làm mất khả năng chốt theo số. `data/so-tay/4009.json` giữ bản trên main.
