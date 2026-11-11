# Soát độc lập lô L15 — ranh giới 6→8 số (#1109)

- Người soát: `claude-agent:duyet-L15-20261111#soat-L15` (khác mọi phiên soạn: `…#soan-<pn6>`, `zcode-sub:glm-5.3:…`, `zcode-mm:loop:…`).
- Ngày: 11/11/2026. Bảng soát: `docs/giao-viec/so-tay/SOAT-RANH-GIOI.md` §0–5.
- Cách làm: mỗi PN6 chạy `--kiem` (64/64 XANH, không DỪNG), `--ve` (chữ biểu VI + EN từng dòng/tầng), đọc toàn bộ `dieuKienSo`,
  `chongLanVanBan`/`chongLanTruc` (lyDo, hàng ví dụ, khongCoHangThat), `ghiChuSoan` BO_VE; đối chiếu khoá trong `data/tu-vung/tu-vung@2.json`
  khi lý do BO_VE là «chưa có khoá»; đối chiếu MFN từ `data/tax.json` để ghi hệ quả.
- Sau lô: `check-so-tay` (0 mục không kiểm được nguồn), `check-cay` (0 lỗi lệch cây), `test-so-tay` 65/65 — xanh, không phải hoàn tác PN6 nào.

## Tổng

| Kết luận | Số PN6 |
|---|---|
| DUYET (+ áp dụng sổ tay) | 38 |
| TRA_VE | 26 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo PN6: **26/64 = 40,6 %**. Theo nhóm 4 số: 4802 8/9 PN6 sai, 4811 5/6, 4804 2/10, 4805 2/6, 4821 2/2, 4823 1/3,
4901 1/1, 4911 2/2, 5007 3/3; 4801, 4803, 4808, 4809, 4810 (10 PN6), 4813, 4814, 4816, 4822, 4907 sạch.

Dòng 8 số bị ảnh hưởng trực tiếp (dòng mang điều kiện sai, chưa tính dòng «Loại khác» nhận nhầm): khoảng 37 dòng (21 do M1/M2, 16 do các lỗi khác).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 480100 | DUYET | Biên 28/36 cm, 15 cm đúng chữ; BO_VE «ở dạng không gấp» đúng quy ước cách đo; 8 cặp chongLanVanBan cuộn↔tờ (Chú giải 4 Ch.48). |
| 480220 | TRA_VE | Lỗi M1 + M2 ở .10 (xem mục Lỗi hệ thống). |
| 480240 | TRA_VE | M1 + M2 ở .10. |
| 480254 | TRA_VE | M1 + M2 ở .11, .21, .40. |
| 480255 | DUYET | Trang trí / nền tráng nhôm / nền chống dính / viết-in / nhiều lớp; ví dụ chongLanTruc có thật; khớp bảng hiệu chỉnh. |
| 480256 | TRA_VE | M1 + M2 ở .21; M2 ở .41. |
| 480257 | TRA_VE | M1 + M2 ở .21. |
| 480258 | TRA_VE | M1 + M2 ở .31; M2 ở .21 (nhánh tờ 36/15 cm số hoá đúng). |
| 480262 | TRA_VE | M1 + M2 ở .31; M2 ở tầng 4802621. |
| 480269 | TRA_VE | M1 + M2 ở .11. |
| 480300 | DUYET | .30 TEN_LOAI mảng hai tên. |
| 480421 | DUYET | Bao xi măng — CONG_DUNG. |
| 480429 | DUYET | Bao xi măng — CONG_DUNG. |
| 480431 | DUYET | .30 doBenUot 40–60 g + băng dán gỗ dán; khongCoHangThat hợp lý. |
| 480439 | TRA_VE | .10 SUY RỘNG: BO_VE «Có độ bền ướt từ 40 g đến 60 g» với lý do «chưa có khoá», nhưng khoá `doBenUot` đã có (480431 dùng). MFN .10 10 % ↔ .90 18 %. |
| 480441 | DUYET | Kraft cách điện — TEN_LOAI. |
| 480442 | DUYET | Bao bì thực phẩm — CONG_DUNG. |
| 480449 | DUYET | Như 480442. |
| 480451 | TRA_VE | .30 SUY RỘNG: BO_VE độ bền ướt 40–60 g như 480439. MFN .30 10 % ↔ .90 20 %. |
| 480452 | DUYET | Như 480442. |
| 480459 | DUYET | Như 480442. |
| 480519 | DUYET | >150 và <225 g/m² đúng biên. |
| 480525 | DUYET | <225 g/m² đúng biên. |
| 480530 | TRA_VE | .10 SUY RỘNG: «Giấy **đã nhuộm màu** dùng để bao quanh hộp diêm bằng gỗ» / «Coloured paper…» — bỏ «đã nhuộm màu» (khoá `coMauTruTrang` có sẵn). |
| 480591 | TRA_VE | .10 SUY RỘNG: BO_VE «có hàm lượng nhựa không quá 0,6% tính theo khối lượng» — biên số làm đổi mã; thiếu khoá phải DỪNG. |
| 480592 | DUYET | nhieuLop CO. |
| 480593 | DUYET | nhiều lớp ↔ giấy thấm khai chongLanVanBan đúng. |
| 480890 | DUYET | TEN_LOAI «làm chun/làm nhăn», «rập nổi» (chưa có khoá; giấy vừa chun vừa rập nổi lúc chạy phải hỏi). |
| 480990 | DUYET | HOAC tên Giấy than \| TUONG_TU + sao chép. |
| 481013 | DUYET | Đã in + máy ghi tự động + rộng ≤150 mm. |
| 481014 | DUYET | `kichThuoc ≤ 360 mm` (chặn mọi cạnh). |
| 481019 | DUYET | Như trên, không ép daGap. |
| 481022 | DUYET | HOAC(cuộn ≤150 mm \| kichThuoc ≤360 mm). |
| 481029 | DUYET | Như 481022, cả .91. |
| 481031 | DUYET | HOAC(cuộn ≤150 mm \| kichThuoc ≤360 mm). |
| 481032 | DUYET | Như 481031. |
| 481039 | DUYET | Như 481031. |
| 481092 | DUYET | Như 481031. |
| 481099 | DUYET | Như 481031. |
| 481110 | TRA_VE | M1 + M2 ở .20. |
| 481141 | TRA_VE | M1 + M2 ở .20. |
| 481151 | TRA_VE | M1 + M2 ở tầng 4811513. |
| 481159 | TRA_VE | M1 + M2 ở tầng 4811594. |
| 481160 | TRA_VE | M1 + M2 ở .20. |
| 481190 | DUYET | Tầng 4811904 dùng `kichThuoc ≤ 36 cm` — đúng; khớp bảng hiệu chỉnh. |
| 481320 | DUYET | Tipping / tobacco wrapping / plug wrap (độ xốp >12 CORESTA); tầng «Loại khác, không phủ/đã phủ». |
| 481390 | DUYET | Tầng cuộn >5 cm đã phủ. |
| 481420 | DUYET | Rộng ≤60 cm; photo murals. |
| 481620 | DUYET | Cuộn >15 ≤36 cm. |
| 481690 | DUYET | «Loại khác, dạng cuộn…» máy tự phủ định anh em; copying ≠ transfer. |
| 482110 | TRA_VE | .10 SUY RỘNG: giữ «các vật dụng cá nhân» trong dungCho nhưng BO_VE giới hạn «được để trong ví, túi xách hoặc mang trên người» của chính cụm đó. MFN .10 20 % ↔ .90 15 %. |
| 482190 | TRA_VE | Như 482110 (.10 ↔ .90). |
| 482210 | DUYET | hinhNonCut CO. |
| 482290 | DUYET | TEN_LOAI «Hình nón cụt» (nên thống nhất với khoá hinhNonCut — không đổi mã). |
| 482320 | DUYET | dangDaiCuonHoacTo CO. |
| 482340 | DUYET | Máy điện ghi ngành y → điện tâm đồ. |
| 482390 | TRA_VE | .30 SUY RỘNG: «Bìa **tráng polyetylen đã cắt dập thành hình** để sản xuất cốc giấy» chỉ ghi công dụng; tầng 4823905 bỏ «kraft». |
| 490199 | TRA_VE | .10 SUY RỘNG: «Sách giáo dục, kỹ thuật, khoa học, lịch sử hoặc văn hóa» ghi chỉ chủ đề, bỏ «Sách» — tờ rơi/brochure văn hoá vào .10 (0 %) thay vì .90 (5 %). |
| 490700 | DUYET | laPhapDinh, TUONG_TU tem/chứng từ; cảnh báo tuong-tu-chua-chot đúng thiết kế. |
| 491191 | TRA_VE | .21/.91 THU HẸP: «Giải phẫu học và thực vật học» / «Anatomical and botanical» là MỘT chuỗi TEN_LOAI — phải là mảng hai chủ đề. MFN 10 % ↔ 20 %. |
| 491199 | TRA_VE | .10 SUY RỘNG: BO_VE «thường được mang theo trong ví, túi sách tay hoặc mang theo người» — giới hạn của «đồ dùng cá nhân». |
| 500710 | TRA_VE | M3: «Chưa tẩy trắng hoặc đã tẩy trắng» = TRONG toàn bộ giá trị khoá; chongLanVanBan batik ↔ tẩy trắng sai định nghĩa. |
| 500720 | TRA_VE | M3. |
| 500790 | TRA_VE | M3. |

## Lỗi hệ thống (lặp ở nhiều PN6)

**M1 — «không có chiều nào trên 36 cm» chỉ chặn MỘT cạnh (SUY RỘNG).** 4802 (8 PN6) + 4811 (5 PN6). Chữ biểu: «ở dạng tờ hình chữ nhật
(kể cả hình vuông) không có chiều nào trên 36 cm» / EN «sheets of which no side exceeds 36 cm». Draft ghi `motChieuTo <= 36 cm`, mà
`motChieuTo` là MỘT cạnh (nhãn «một chiều (cạnh) của tờ», cauHoi «Chiều (cạnh) thứ nhất»). Chiều kia không bị chặn: tờ 30×50 cm vào
dòng .10/.20/.21… thay vì «Loại khác». Cùng chữ ở 4810 (soạn bởi thợ khác) đã ghi đúng bằng `kichThuoc <= 360 mm` (khoá nhiều chiều:
cạnh lớn hơn ngưỡng ⇒ không thoả / chưa biết, không chọn sai). Đề nghị Claude: sửa đồng loạt sang `kichThuoc` (hoặc cặp
`motChieuTo`+`chieuKiaTo`), và cân nhắc để máy cảnh báo khi «không có chiều nào» chỉ được số hoá bằng `motChieuTo`.

**M2 — «ở dạng không gấp» ghi `daGap KHONG` (THU HẸP).** Cùng 13 PN6. Trái quy ước QUY-TRINH-SO-HOA (10/11, lô 11): «in the unfolded
state» là cách đo, phải BO_VE như 480100. Tờ đã gấp có kích thước trải phẳng đạt chữ biểu bị đẩy sang «Loại khác». Các bản 4802/4811
soạn trước khi quy ước được đúc nên chưa cập nhật.

**M3 — «Chưa tẩy trắng hoặc đã tẩy trắng» (5007.10/.20/.90).** `tinhTrangTayTrang TRONG [CHUA_TAY_TRANG, DA_TAY_TRANG]` là toàn bộ giá trị
khoá ⇒ không loại vải đã nhuộm / từ sợi màu / đã in (Chú giải phân nhóm 1 Phần XI: các trạng thái này loại trừ nhau). Lụa nhuộm khai
«đã tẩy trắng» vào .20 thay vì .90. lyDo chongLanVanBan «vải đã tẩy trắng mà in batik thoả cả hai» sai định nghĩa. Thiếu giá trị khoá
(DA_NHUOM / TU_SOI_MAU / DA_IN) ⇒ đáng lẽ DỪNG THIEU_KHOA_TU_VUNG. **540761, 540769 đã DUYET cùng mẫu này — cần soát lại.**

**M4 — BO_VE với lý do «chưa có khoá» khi khoá đã có / vế làm đổi mã.** 480439, 480451 (`doBenUot` đã có), 480591 (biên 0,6 % nhựa),
482110/482190/491199 (giới hạn «mang trong ví, túi xách hoặc trên người» bị bỏ với lý do «cổng 3 chặn chữ hoặc» — không phải căn cứ).

## Máy tách sai (§2) — cho Claude chỉnh `lib/ho-so/tach-ve.js`

1. Định ngữ giới hạn bị nuốt vào DAU nên cổng 5 không đòi phủ:
   - 480530 .10 DAU «Giấy **đã nhuộm màu**» (Coloured paper).
   - 482390 .30 DAU «Bìa **tráng polyetylen đã cắt dập thành hình**» (Die-cut polyethylene coated paperboard).
   - 482390 tầng 4823905 DAU «Giấy **kraft** ở dạng cuộn».
   - 490199 .10 cả câu «Sách giáo dục, kỹ thuật, khoa học, lịch sử hoặc văn hóa» là DAU.
   - 480519 .10, 4802 .11/.21/.91 «Định lượng trên 150 g/m2 nhưng dưới 225 g/m2» là DAU (vế biên số; điều kiện vẫn đủ).
   - 4802 .21/.31/.11, 4802621 DAU «Ở dạng tờ hình chữ nhật (kể cả hình vuông) không có chiều nào trên 36 cm ở dạng» — vế giới hạn
     kích thước bị nuốt, chỉ còn «không gấp» là GIOI_HAN (lỗi M1 vì thế lọt cổng 5).
   - 48025721 DAU «Không có chiều nào trên 36 cm ở dạng».
2. Cắt giữa cụm động từ bị động «đã được …»: 49119920 «Nhãn đã | được in», 49119930 «Bộ thẻ đã | được in nội dung…».
3. Cắt sai biên vế: 49119910 «… đồ dùng cá nhân thường | được mang theo trong ví…»; 48059110 «…khi đóng gói, có hàm lượng nhựa |
   không quá 0,6%…» (một vế giới hạn chia đôi); 4802 «… không có chiều nào trên 36 cm ở dạng | không gấp».
4. 48239070 «Quạt và màn che kéo | bằng tay» — tách «kéo» khỏi «bằng tay» (draft vẫn gắn BANG_TAY đúng cho màn che).

## Đo cổng 5

- Cảnh báo `cong5-bo-ve` trong lô: 15 vế. Người soát xác nhận BO_VE đúng: 9 (480100 ×4 cách đo; 482390 .20 ×2 vế «kể cả»; 482390 .96
  định nghĩa daCatThanhHinh; 491199 .20 «đã được in» chung cả phân nhóm và «trừ 48.21» ngoài phân nhóm). Sai: 6 (480439, 480451, 480591,
  482110, 482190, 491199 .10) — tỉ lệ BO_VE sai 6/15 = 40 %.
- Lỗi lọt cổng 5 vì máy tách (vế nằm trong DAU): 480530, 482390, 490199, và M1 ở 13 PN6.

## Tiền lệ (§3)

Các PN6 có `can-bang-hieu-chinh-tien-le-da-co` (480255, 480256, 480257, 481159, 481190, 482390) đều đã có mục trong
`data/ho-so/hieu-chinh-tien-le.json`; không thấy tiền lệ mới nằm ngoài bảng. Không PN6 nào bị `--duyet` từ chối vì bảng hiệu chỉnh.
