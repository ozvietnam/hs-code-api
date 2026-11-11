# Soát L1-4c lô L4 — 60 phân nhóm 6 số (chương 08–14)

- Phiên soát: `claude-agent:duyet-L4-20261111#soat-L4` (11/11/2026), #1109.
- Cách làm: với từng PN6 chạy `--kiem` (đều XANH, không DỪNG), `--ve` (chữ biểu VI + EN, cách tách vế), đọc toàn bộ điều kiện
  của bản nháp + `ghiChuSoan`, đối chiếu cách bộ so chữ tự do (`lib/dieu-kien-so.js#soChu`, mọi âm tiết của giá trị phải có
  trong dữ kiện) chấm một mặt hàng thật, tra `data/precedents.json` theo mã 8 số và `data/ho-so/hieu-chinh-tien-le.json`
  (không PN6 nào của lô có mục bảng).
- Không sửa spec, bản nháp, `lib/`, từ vựng.

## Tổng hợp

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 44 |
| TRA_VE | 13 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát — cùng phiên với người soạn | 3 |

Tỉ lệ sai theo PN6 đã soát: **13/57 = 22,8 %**. Theo dòng 8 số bị ảnh hưởng: **33/182 dòng = 18,1 %** (080310 ×2,
080510 ×2, 081350 ×4, 090961 ×3, 090962 ×3, 110100 ×1, 120710 ×1, 121190 ×5, 121221 tiêu đề → 4 dòng con, 121229 tiêu đề →
2 dòng con, 121299 ×1, 130239 ×3, 140490 ×2).

Cổng 5 báo 1 vế (`cong5-bo-ve` 121229) — người soát xác nhận đúng là vế bị miễn; ngoài ra 6 vế bị bỏ/sai trục mà cổng 5
không báo (xem "Bộ tách vế sai").

Kiểu lỗi (cổng 0–5 đều không bắt):

1. **Sai trục khoá — trạng thái/thuộc tính ghi thành chữ tự do** (080310, 080510, 110100, 121221, 130239): "Tươi"/"Khô",
   "chưa nghiền", "Tăng cường vi chất", "Dạng bột" được ghi `tenLoai`/`congDung`/khoá polyme trong khi tu-vung@2 đã có khoá
   tất định (`phuongPhapBaoQuan`, `daXay`, `dangBot`) — và chính các bản cùng lô (080450, 121120, 090122) dùng đúng khoá đó.
   Với bộ so âm tiết, tên hàng thật ("chuối lá", "rong biển khô") không chứa "tươi"/"chưa nghiền" ⇒ TRÁI ⇒ rơi sai dòng hoặc
   không dòng nào tới được.
2. **"Của <loài cây>" ghi `dungCho`** (090961, 090962, 121299, 140490 .92): "Of anise", "Stones and kernels of apricot…",
   "Empty fruit bunch of oil palm" là nguồn gốc thực vật, không phải "dùng cho/lắp vào máy, xe, hàng hóa". Cùng lô, 110319 /
   110419 / 110429 / 110620 ("Của meslin", "Của ngô", "Từ sắn") và 120799 .50 ghi `tenLoai` — đúng. Đề nghị Claude chốt
   quy ước trong QUY-TRINH (cổng 5 hiện coi "của …" phủ bởi `dungCho` là xanh).
3. **Bỏ vế giới hạn** (081350 "chiếm đa số về khối lượng", 121190 .17 "đã cắt, nghiền hoặc dạng bột", 121229 tiêu đề
   "Tươi, ướp lạnh hoặc khô", 140490 .20 "chủ yếu").
4. **Mảnh giá trị cắt ngang vế** (120710 tenLoai "Hạt cọ phù hợp").

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 080119 | DUYET | "Quả dừa non"/Young coconut + Loại khác trần. |
| 080212 | chưa soát | Người soạn là phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU` — trùng phiên Claude đang chạy lô soát này ⇒ không độc lập, để NHAP cho lô khác. |
| 080310 | TRA_VE | 08031010/20 "Tươi"/"Fresh", "Khô"/"Dried" ghi `tenLoai` TEN_LOAI "Tươi"/"Khô" ⇒ "chuối lá" TRÁI cả hai, không có Loại khác ⇒ không dòng nào tới được. Phải `phuongPhapBaoQuan` TUOI_UOP_LANH / KHO_MUOI. |
| 080390 | DUYET | Ba tên chuối VI+EN + Loại khác; ngoặc là đồng nghĩa. |
| 080450 | DUYET | ổi / xoài (tiêu đề 0804502) / măng cụt; Tươi/Khô dưới xoài dùng `phuongPhapBaoQuan` đúng trục. |
| 080510 | TRA_VE | Như 080310: 08051010/20 "Tươi"/"Khô" ghi `tenLoai`; cam không vào dòng nào. |
| 080550 | DUYET | chanh vàng (lemon) / chanh xanh (lime). |
| 080940 | DUYET | Plums/Sloes — "Quả mận gai" ⊃ "Quả mận", tên cụ thể hơn thắng. |
| 081090 | DUYET | 11 dòng; 08109094 đủ 9 loại quả theo chữ Anh. |
| 081290 | DUYET | Dâu tây + Loại khác. |
| 081340 | DUYET | nhãn / me + Loại khác; tiền lệ 6488/TB-TCHQ ⇒ 08134090 khớp. |
| 081350 | TRA_VE | 08135010..40 bỏ vế "chiếm đa số về khối lượng"/"predominate by weight" — hỗn hợp 70 % nho + 30 % hạt điều vào .10 thay vì .90. Không có khoá ⇒ phải THIEU_KHOA_TU_VUNG (DỪNG). |
| 090111 | DUYET | Arabica / Robusta + Loại khác. |
| 090112 | DUYET | "Arabica hoặc Robusta" ⇒ TEN_LOAI hai giá trị. |
| 090121 | chưa soát | Người soạn cùng phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU` ⇒ không độc lập. |
| 090122 | DUYET | Unground/Ground ⇒ `daXay` KHONG/CO. |
| 090190 | DUYET | Coffee husks and skins / substitutes containing coffee; "có chứa cà phê" phủ. |
| 090210 | DUYET | "Lá chè"/Leaves ⇒ `laChe` CO. |
| 090220 | DUYET | như 090210. |
| 090230 | DUYET | như 090210; tiền lệ 7392/TB-TCHQ (trà túi lọc ⇒ 09023090) khớp. |
| 090240 | DUYET | như 090210. |
| 090411 | DUYET | White/Black ⇒ TEN_LOAI "Trắng"/"Đen" (không có khoá màu). Lưu ý: tên hàng không nêu màu rơi Loại khác. |
| 090412 | DUYET | như 090411. |
| 090421 | DUYET | "Chillies (Fruits of the genus Capsicum)" — ngoặc là giải nghĩa. |
| 090422 | DUYET | như 090421. |
| 090961 | TRA_VE | 09096110/20/30 "Của hoa hồi anise"/"Of anise", "Of badian", "Of caraway" ghi `dungCho` — loài cây của hạt, không phải "dùng cho"; ghi `tenLoai` (như 110319). |
| 090962 | TRA_VE | như 090961. |
| 091091 | DUYET | Cà ri (curry). |
| 091099 | DUYET | "Thyme; bay leaves" — Húng tây = cỏ xạ hương; tiền lệ 1278/TB-TCHQ ⇒ 09109990 khớp. |
| 100199 | DUYET | tiêu đề "Fit for human consumption" ⇒ `thichHopDungChoNguoi`; Meslin; hạt lúa mì bỏ lớp vỏ ngoài cùng. |
| 100590 | DUYET | Popcorn ⇒ congDung; "Fit for human consumption" dưới Loại khác trần. |
| 100610 | DUYET | "Suitable for sowing" ⇒ congDung "gieo trồng" đúng nghĩa (nên chuyển `dungLamGiong` khi soạn lại; không đổi mã). |
| 100620 | DUYET | Gạo Hom Mali. |
| 100630 | DUYET | 7 dòng; "Gạo thơm khác" `phanConLai` đúng. |
| 100640 | DUYET | "Of a kind used for animal feed". |
| 110100 | TRA_VE | 11010011 "Tăng cường vi chất dinh dưỡng"/"Fortified" ghi `congDung` — là thuộc tính, không phải công dụng; bột mì tăng cường vi chất rơi 11010019. |
| 110290 | DUYET | Rice flour / Rye flour. |
| 110319 | DUYET | "Of meslin"/"Of rice" ⇒ tenLoai. |
| 110419 | DUYET | "Of maize" ⇒ tenLoai "ngô". |
| 110429 | DUYET | "Of barley" ⇒ tenLoai "lúa mạch". |
| 110620 | DUYET | "Of manioc"/"Of sago" ⇒ tenLoai. |
| 110819 | DUYET | Sago starch. |
| 120710 | TRA_VE | 12071010 tenLoai "Hạt cọ phù hợp" — mảnh cắt ngang vế "phù hợp để gieo/trồng"; "hạt cọ giống" thiếu âm tiết "phù" ⇒ rơi .90. Sửa thành "Hạt cọ" (`dungLamGiong` CO giữ). |
| 120740 | DUYET | Edible ⇒ `thichHopDungChoNguoi` CO. |
| 120799 | DUYET | Illipe seeds; Fresh fruit bunch of oil palm (giữ nguyên cụm). |
| 120929 | DUYET | Timothy grass seeds. |
| 120991 | DUYET | Onion seeds. |
| 120999 | DUYET | Rubber tree / Kenaf seeds. |
| 121120 | DUYET | "Fresh or dried" ⇒ `phuongPhapBaoQuan`. |
| 121190 | TRA_VE | (A) 12119017 "Other, fresh or dried, in cut, crushed or powdered form" chỉ còn điều kiện tươi/khô — bỏ "đã cắt, nghiền hoặc dạng bột" ⇒ dược liệu khô nguyên vào .17 thay vì .19. (B) dạng cắt/nghiền/bột ghi tenLoai ["đã cắt","nghiền","dạng bột"]: "Bột vỏ cây bời lời" (5818/TB-TCHQ ⇒ 12119098) TRÁI cả ba ⇒ rơi .99, lệch tiền lệ. |
| 121221 | TRA_VE | tiêu đề 1212211 "Dried but not ground": "chưa nghiền" ghi tenLoai thay vì `daXay` KHONG ⇒ "rong biển khô" rơi 12122190; lệch 613/TB-TCHQ (⇒ 12122119). |
| 121229 | TRA_VE | tiêu đề 1212291 bỏ vế "Tươi, ướp lạnh hoặc khô"/"Fresh, chilled or dried" ⇒ rong biển đông lạnh dùng làm dược phẩm vào .11 thay vì .30. |
| 121293 | DUYET | "Suitable for planting" ⇒ congDung "làm giống" (nên chuyển `dungLamGiong`; không đổi mã). |
| 121299 | TRA_VE | "Stones and kernels of apricot, peach … or plum": loài quả ghi `dungCho`; ghi `tenLoai`. |
| 130190 | DUYET | Cannabis resins / Lac. |
| 130211 | DUYET | Pulvis opii. |
| 130219 | chưa soát | Người soạn cùng phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU` ⇒ không độc lập (bảng hiệu chỉnh đã có mục 130219-01). |
| 130239 | TRA_VE | "Powder"/"chips" cùng ghi `dangNguyenSinh` HAT_VIEN_VAY_MANH (khoá polyme Ch.39) ⇒ mất ranh giới bột ↔ mảnh; khoá `dangBot` có sẵn và dẫn đúng 1302.39.11; mức tinh chế ghi tenLoai "đã tinh chế" cần chữ "đã". |
| 140120 | DUYET | Whole / Split-core (≤ 12 mm đúng "không quá") / Split-skin; biên `doDay` 1,5–3 mm (cảnh báo cong3-bien-khong-doc-duoc) lấy từ SEN, đối chiếu tay "từ 1,5 đến 3mm" ⇒ ≥ 1,5, ≤ 3 đúng. |
| 140490 | TRA_VE | (A) .20 "used primarily in tanning or dyeing" bỏ "chủ yếu" (`chiHoacChuYeu` có sẵn). (B) .92 "Empty fruit bunch of oil palm" ghi `dungCho` "cây cọ dầu". |

## Bộ tách vế sai (§2 "máy tách sai") — cho Claude sửa `lib/ho-so/tach-ve.js`

1. **"chiếm đa số về khối lượng"** (081350 cả 4 dòng) không được nhận là vế GIỚI HẠN — cả dòng thành DAU ⇒ cổng 5 xanh
   dù vế bị bỏ.
2. **Phần sau "Loại khác,"** (121190 .17/.18/.98, 121229 .20/.30): bộ tách gắn CON_LAI rồi coi toàn bộ phần còn lại là DAU
   — "tươi hoặc khô, đã cắt, nghiền hoặc dạng bột" chứa hai vế giới hạn không được kiểm.
3. **Tiêu đề mở đầu bằng trạng thái** (121229 tiêu đề 1212291 "Tươi, ướp lạnh hoặc khô, dùng cho …"): đoạn trạng thái
   thành DAU nên không bắt buộc phủ.
4. **Cắt giữa cụm danh từ "làm thuốc trừ sâu"** (121229): "… làm dược phẩm, hoặc làm thuốc" | "trừ sâu, thuốc diệt nấm" —
   "trừ" bị đọc như "(trừ …)" loại trừ.
5. **"Chùm không quả"** (140490 .92 "Empty fruit bunch"): "không" trong cụm danh từ bị đọc là phủ định ⇒ DAU "Chùm" +
   GIOI_HAN "không quả của cây cọ dầu".
6. **"dùng chủ yếu trong công nghệ | thuộc da hoặc nhuộm"** (140490 .20): cắt "công nghệ thuộc da"; và vế "chủ yếu" được coi
   là phủ bởi giá trị congDung "công nghệ thuộc da" (chuỗi con "công nghệ"), không đòi `chiHoacChuYeu`.

## Quan sát hệ thống (không trả về vì là quy ước chung)

- Bộ so chữ tự do đòi MỌI âm tiết của giá trị có trong dữ kiện: giá trị "Quả nhãn", "Quả mít" … TRÁI với tên hàng "nhãn
  tươi", "mít Cempedak" (thiếu "quả"). Ảnh hưởng mọi dòng trái cây chương 08 đã duyệt theo luật tên nguyên văn; đề nghị
  thêm "quả"/"hạt"/"cây" vào tập hư từ khi so (hoặc so theo danh từ đầu bỏ loại từ).
- Cổng 5 coi "của …" là vế giới hạn được phủ bởi `dungCho` mà không phân biệt "của <máy/xe>" (bộ phận — đúng) với
  "của <loài cây>" (nguồn gốc — nên `tenLoai`). Cần chốt quy ước (mục 2 ở trên).
- Cảnh báo `cong5-bo-ve` duy nhất của lô (121229 "hoặc các mục đích tương tự") — bản đã bị trả vì lỗi khác.
- Tiền lệ: không PN6 nào của lô có mục `hieu-chinh-tien-le.json`; tiền lệ lệch phát hiện ở 121190 (5818/TB-TCHQ) và 121221
  (613/TB-TCHQ) nằm trong bản trả về.
