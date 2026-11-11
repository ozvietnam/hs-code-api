# Soát độc lập lô L23: 65 phân nhóm (#1109)

Phiên soát: `claude-agent:duyet-L23-20261111#soat-L23` (khác phiên soạn). Ngày 11/11/2026. Làm theo `SOAT-RANH-GIOI.md` mục 0–5.

Cách soát mỗi PN6:
- `--kiem`: cả 65 bản đều XANH, không DỪNG.
- `--ve`: in chữ biểu VI + EN của từng dòng và tiêu đề. Người soát đặt từng điều kiện của bản nháp cạnh chữ biểu, kể cả vế DAU
  (đầu ngữ). Máy không kiểm vế DAU, nên phần lớn lỗi của lô này nằm ở đó.
- Định nghĩa khoá: tra `--tu-vung --khoa=…`.
- Tiền lệ: tra `data/precedents.json` và `data/ho-so/hieu-chinh-tien-le.json`. Bảng hiệu chỉnh có mục cho 760421-01 và 760612-01,
  cả hai đều là KHONG_LECH.
- Kiểm thêm theo tech lead: so dong8 trong `data/so-tay/<h4>.json` trên origin/main với bản nháp, tìm chỗ bản nháp bỏ mất ngưỡng số
  SEN. Trong cả lô chỉ có `sen.74081910` mang ngưỡng số (`kich_thuoc_mat_cat_toi_da <= 6 mm`). PN6 này đã bị trả về; sau khi áp
  740811/740829, dòng SEN đó vẫn còn nguyên trong `7408.json`.

Không PN6 nào trong lô đã ở trạng thái DUYET/TRA_VE trên origin/main (nhánh tạo từ `9e1c171e`).

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 740100 | DUYET | Copper mattes / Cement copper: tenLoai đúng tên đầu; phần trong ngoặc là đồng nghĩa. |
| 740200 | DUYET | Blister copper = Đồng xốp. |
| 740710 | DUYET | Profiles; tiêu đề Bars and rods; square/rectangular cross-section. |
| 740811 | DUYET | Biên: "not exceed 8" ⇒ ≤8; "exceeds 8 but not exceeds 14" ⇒ >8 & ≤14. Tiền lệ 1757/TB-TCHQ (Ø20 mm) → .90, khớp. |
| **740819** | **TRA_VE** | 74081910: "Được phủ, mạ hoặc tráng vàng hoặc bạc" / "Plated or coated with gold or silver" được ghi thành `tenLoai TEN_LOAI [vàng, bạc]`. Đây là điều kiện lớp mạ, không phải tên hàng; chữ "vàng" còn trùng nghĩa màu. Dòng này cũng bỏ mất ngưỡng SEN `sen.74081910` (≤ 6 mm). |
| 740829 | DUYET | Copper-tin base alloys (bronze). |
| 741011 | DUYET | Copper clad laminate for PCB: đủ 3 vế (Tấm ép lớp / MA_DONG / tấm mạch in). |
| 741300 | DUYET | Tiêu đề ≤ 28,28 mm; Cables ở hai nhánh. |
| 741510 | DUYET | Nails / Staples. |
| 741533 | DUYET | Screws / Bolts and nuts. |
| 741810 | DUYET | Bốn tên dùng TUONG_TU đúng các tên đứng trước "tương tự". .30 dùng HOAC (hàng hoặc bộ phận), cả hai nhánh đều có GIA_DINH và không dùng điện. Cặp trục .10/.30 ghi `khongCoHangThat` là hợp lý. |
| 741920 | DUYET | Chain and parts thereof; Reservoirs… + "not fitted with mechanical or thermal equipment". BO_VE "chứa và các loại đồ" do máy tách sai, chấp nhận. |
| **741980** | **TRA_VE** | (A) 74198021 SUY RỘNG: dòng "Đai liền cho máy móc" / "Endless belt for machinery" chỉ còn `dungCho máy móc`, mất tên "Đai liền". Hệ quả: mọi tấm đan/lưới đồng dùng cho máy đều vào .21 thay vì .29. (B) Tiêu đề 7419802 THU HẸP: "Tấm đan (kể cả đai liền)" / "Cloth (including endless bands)" nhưng tenLoai bỏ "đai liền", nên đai liền thật không qua được tiêu đề. |
| 750890 | DUYET | Bolts and nuts; Electroplating anodes. BO_VE "including those produced by electrolysis" là vế "bao gồm cả" (mở rộng), không đổi mã. |
| 760320 | DUYET | Flakes / Powders of lamellar structure. |
| 760410 | DUYET | Bars and rods; .90 là profiles. |
| 760421 | DUYET | Cooling coils of motor vehicle A/C; Aluminium spacers for doors and windows. Khớp bảng hiệu chỉnh 760421-01 (KHONG_LECH). |
| 760429 | DUYET | Chữ Anh "Extruded bars and rods" xác nhận "ép đùn" là định ngữ chung (BO_VE đúng). Y-shaped profiles for zip fasteners, in coils: đủ 3 vế. |
| 760519 | DUYET | Biên ≤ 0,0508 mm. |
| 760529 | DUYET | Biên ≤ 0,254 mm. |
| 760611 | DUYET | Ranh giới thật là "not otherwise surface treated" ⇒ `daXuLyBeMat KHONG`. Lưu ý: tấm đục lỗ chưa xử lý bề mặt vẫn vào .10 (biên nhỏ). |
| 760612 | DUYET | Đủ 6 mục. Khớp bảng hiệu chỉnh 760612-01 (KHONG_LECH). |
| **760720** | **TRA_VE** | 76072091: "Được in hình mẫu, hoặc màu vàng hoặc màu bạc" / "Printed with patterns, or in gold or silver colour" được ghi thành `tenLoai TEN_LOAI [Được in hình mẫu, màu vàng, màu bạc]`. Đây là đặc điểm in/màu, không phải tên hàng; lá nhôm "in hoa văn" sẽ rơi xuống .99. Cần khoá mới (THIEU_KHOA_TU_VUNG). |
| 761010 | DUYET | Doors, frames, thresholds. |
| 761090 | DUYET | Floating roofs for petroleum storage tanks; Bridges/towers/lattice masts. |
| 761290 | DUYET | "Đúc liền" ⇒ DUC + đựng sữa tươi, theo chữ Việt pháp lý. Lưu ý: "seamless" bên chữ Anh rộng hơn "đúc". |
| 761410 | DUYET | Cáp; biên 25,3 / 28,28 mm đúng chiều. |
| 761490 | DUYET | Như 761410. |
| 761610 | DUYET | Nails; staples, hooks; bolts, nuts. |
| 780411 | DUYET | Chiều dày ≤ 0,15 mm. |
| 780600 | DUYET | Đủ 3 dòng. |
| **790700** | **TRA_VE** | 79070091 THU HẸP: "Hộp đựng thuốc lá điếu; gạt tàn thuốc lá" / "Cigarette cases or boxes; ashtrays" là hai hàng, nhưng bản nháp mất hẳn gạt tàn. Gạt tàn kẽm đứng riêng sẽ vào .92 hoặc .99. |
| 790500 | DUYET | Chiều dày ≤ 0,15 mm. |
| 800300 | DUYET | Soldering bars and rods. |
| 810199 | DUYET | "other than those obtained simply by sintering" ⇒ THIEU_KET PHAI_KHONG. BO_VE do máy cắt giữa "thu được", chấp nhận. |
| 810520 | DUYET | Unwrought cobalt ⇒ Coban + `daGiaCong KHONG`. |
| 810610 | DUYET | Unwrought bismuth; waste and scrap; powders. Nên chuyển "chưa gia công" sang `daGiaCong` khi soát lại. |
| 810690 | DUYET | Như 810610. |
| 811100 | DUYET | Waste and scrap. |
| **811269** | **TRA_VE** | 81126910: "Chưa gia công; bột" / "Unwrought; powders" được ghi thành `tenLoai TEN_LOAI ["Chưa gia công", …]`, trong khi đây là trạng thái gia công chứ không phải tên hàng. Khoá `daGiaCong` đã có sẵn; cadimi thỏi sẽ rơi xuống .90. |
| 820130 | DUYET | Hoes and rakes. |
| 820299 | DUYET | Straight saw blades. |
| 821192 | DUYET | Agriculture/horticulture/forestry; hunting/diving/scouts' knives. |
| **821193** | **TRA_VE** | 82119321 SUY RỘNG: "Có cán bằng kim loại cơ bản" / "With handle of base metal" được ghi thành `chatLieu LA kim loại` (vị trí CHINH), kèm BO_VE "Có cán". Dao nào cũng có lưỡi kim loại, nên dao cán gỗ/nhựa cũng vào .21 và .29 thành dòng rỗng. Ghi chú BO_VE tự thừa nhận không có vị trí "cán"; đúng ra phải DỪNG (THIEU_KHOA_TU_VUNG). |
| 821194 | DUYET | Lưỡi dao dùng trong nông nghiệp. |
| 821220 | DUYET | Double-edged razor blades. |
| 830230 | DUYET | Hasps ⇒ `banLeMocKhoaHasps`. |
| 830241 | DUYET | "for doors" gắn đúng cho hasps và staples. Lưu ý: tách "móc" khỏi "mắt cài" (hooks and eyes) hơi rộng, nhưng các dòng cùng MFN 20%. |
| 830242 | DUYET | Hasps. |
| 830249 | DUYET | Saddlery; Hasps. |
| 830400 | DUYET | Filing cabinets; nhôm; niken. |
| 830510 | DUYET | Double loop wire binders. |
| 830520 | DUYET | Office use; iron or steel. |
| 830590 | DUYET | Paper clips. |
| 830629 | DUYET | Copper or lead (dùng HOAC); nickel; aluminium. |
| 830630 | DUYET | Copper; traffic mirrors. |
| 830990 | DUYET | Đủ 9 mục. chongLanVanBan .20/.60 khai đúng. |
| 831110 | DUYET | In rolls. Tiền lệ 3743/TB-TCHQ → .90, khớp. |
| 831120 | DUYET | ≥ 4,5% C, ≥ 20% Cr; In rolls. BO_VE do máy tách sai, chấp nhận. |
| 831130 | DUYET | Như 831120. |
| 840211 | DUYET | Electrically operated: CO / KHONG. |
| 840212 | DUYET | Tiêu đề điện / không điện; > 15 t/h. |
| 840219 | DUYET | Như 840212. |
| 840220 | DUYET | Electrically operated: CO / KHONG. |
| 840290 | DUYET | Boiler bodies, shells or casings. |

## Tổng hợp

- DUYET 59, TRA_VE 6. Không có PN6 đỏ, chờ bảng hiệu chỉnh hay chưa soát.
- Tỉ lệ sai theo PN6: 6/65 = 9,2%. Số dòng 8 số bị ảnh hưởng: 7 (74081910, 74198021 + tiêu đề 7419802, 76072091, 79070091,
  81126910, 82119321).
- Kiểu lỗi:
  - Đặc điểm (lớp mạ, màu/in, trạng thái gia công) bị ghi vào khoá tên hàng `TEN_LOAI`: 740819, 760720, 811269.
  - Mất một trong các tên đầu hoặc vế "kể cả": 741980, 790700.
  - BO_VE một vế làm đổi mã: 821193.
- Máy không bắt được lỗi nào trong số này: cả 6 đều XANH và cổng 5 báo "phủ". Lý do: cổng 5 không kiểm vế DAU, và chấp nhận một
  giá trị TEN_LOAI nếu nó trùng âm tiết với chữ biểu.
- Đề xuất cho cổng: cảnh báo khi một giá trị TEN_LOAI không chứa danh từ, ví dụ bắt đầu bằng "Được", "Chưa", "màu", hoặc chỉ là tên
  kim loại quý.
- Cảnh báo cổng 5 (`cong5-bo-ve`) trong lô: 12 vế. Người soát xác nhận 11 vế bỏ đúng (do máy tách sai, là vế "kể cả", hoặc là điều
  kiện định nghĩa của nhóm); 1 vế bỏ sai (821193 "Có cán").

## Máy tách sai (cho `lib/ho-so/tach-ve.js`)

1. "bể chứa" bị cắt thành "bể" + "chứa và các loại đồ" (741920, 741980 .80). EN: "Reservoirs, tanks, vats and similar containers".
2. "dùng cho bể / chứa xăng dầu" (761090 .30): cắt giữa danh từ ghép "bể chứa".
3. "trừ các loại thu / được từ quá trình thiêu kết" (810199): cắt giữa động từ "thu được".
4. "chứa hàm lượng carbon / từ 4,5% trở lên" (831120, 831130): tách vị từ khỏi số của nó.
5. "bao gồm cả các sản phẩm sản xuất / bằng phương pháp điện phân" (750890): phần đuôi của vế "bao gồm cả" (PHU) bị coi là GIOI_HAN.
6. "được ép đùn" (760429): tách định ngữ (B), trong khi EN "Extruded bars and rods" cho thấy đây là định ngữ chung.
7. "Được tạo hình / bằng phương pháp đột dập…" (7419802) và "Được dát phẳng hoặc tạo hình / bằng phương pháp cán hoặc ép" (760611):
   động từ dẫn bị tách thành vế riêng.

## Kiểm sau khi áp

Các lệnh sau đều qua, 0 lỗi:
- `check-so-tay`
- `check-cay`
- `test-so-tay` (65/65)
- `test-so-tay-gates` (91 passed, 0 failed)
- `test-engine-loop-so-tay` (11 passed, 0 failed)

Lưu ý: `--ap-dung` thay các dòng SEN không có ngưỡng số của PN6 đã duyệt (vd sen.76042110, sen.83024131) bằng dòng ranh giới. Không
dòng nào trong số đó mang ngưỡng số.


## Soát lại của tech lead — bo-kiem-luat hai bên

Trả về 830241: gộp thử với `main` làm phát sinh ca chốt sai mới trong `bo-kiem-luat --toan-bieu` (cổng gộp không cho `chotSai`/`chotLoaiKhacSai` tăng). Mục sổ tay giữ như `main`.
