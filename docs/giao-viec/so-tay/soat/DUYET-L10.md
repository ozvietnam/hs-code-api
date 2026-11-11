# Soát độc lập lô L10 — 46 PN6 (chương 32–37) (#1109)

- Phiên soát: `claude-agent:duyet-L10-20261111#soat-L10` (khác phiên soạn: `mm:minimax-m3:…#soan-*`,
  `https://claude.ai/code/session_01Y2pGd…#soan-*`, `https://claude.ai/code/session_01Ce553…#soan-*`).
- Cách làm: theo `SOAT-RANH-GIOI.md` mục 0–5. Mỗi PN6 chạy `--kiem` (cả 46 xanh, không DỪNG), `--ve` (đặt từng điều kiện cạnh
  chữ biểu VI + EN), đọc mọi cảnh báo (`cong5-bo-ve`, `cong5-bo-ve-thua`, `chongLanVanBan`, `chongLanTruc`/`khongCoHangThat`,
  `cong3-bien-khong-doc-duoc`, `nghi-phan-con-lai`, `can-bang-hieu-chinh-tien-le-da-co`), đọc mục bảng hiệu chỉnh tiền lệ của
  320810, 320890, 321290, 340319, tra MFN `data/tax.json` để đo hệ quả. Không đọc `data/bench/*`, `data/oz-export/*`.

## Kết quả

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 39 |
| TRA_VE | 7 |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai: **7/46 PN6 = 15,2 %**; theo dòng 8 số: 8 dòng mang điều kiện lỗi, 16/137 dòng (11,7 %) bị ảnh hưởng (dòng lỗi + dòng
anh em bị lấn). Theo người soạn: 5/7 bản trả về do `minimax-m3` soạn, 2/7 do phiên Claude (321290, 350300).

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 320300 | DUYET | .10 "sử dụng trong công nghiệp thực phẩm hoặc đồ uống" ⇒ mảng 2 ngành; giá trị "đồ uống" ngắn hơn "công nghiệp đồ uống" nhưng không đổi mã. |
| 320641 | DUYET | .10 "Các chế phẩm" ↔ .90. |
| 320642 | DUYET | .10 "Các chế phẩm" ↔ .90. |
| 320649 | DUYET | Tiêu đề "Các chế phẩm" + .11 cađimi / hexacyanoferrates (mảng "hoặc"). |
| 320650 | DUYET | .10 "Các chế phẩm" ↔ .90. |
| 320720 | DUYET | .10 "Frit men (phối liệu men)". |
| 320810 | **TRA_VE** | .20 "**Sơn** chống hà và/hoặc chống ăn mòn dùng để sơn vỏ tàu thủy" (EN *paints for ships' hulls*) — điều kiện bỏ danh từ đầu "Sơn" ⇒ **SUY RỘNG** (vecni cho vỏ tàu thoả .20); `chongLanVanBan` .19+.20 dựa trên lyDo sai ("sơn chống hà dạng vecni") ⇒ hỏi thừa. Sửa theo mẫu 320890 .30 (tenLoai "Sơn"). |
| 320890 | DUYET | Tiêu đề vecni >100 °C / ≤100 °C (biên khớp EN *exceeding / not exceeding*), .30 đã có tên "Sơn"; bảng 320890-01/-02 KHONG_LECH khớp. |
| 320910 | **TRA_VE** | .50 chỉ còn `sonChongHaHoacChongAnMonVoTau` — bỏ "Sơn"/*paints* ⇒ **SUY RỘNG**; hai `chongLanVanBan` (.10+.50, .40+.50) không có chồng thật — cặp .40+.50 lyDo tự nhận "da thuộc và vỏ tàu loại trừ nhau" (MFN .40 5 % ↔ .50 10 %). |
| 321000 | DUYET | .10/.20/.30 tên (+ "hoàn thiện da"), tầng "Loại khác" trần tách .91 sơn chống hà. |
| 321290 | **TRA_VE** | .13 "Loại chì trắng **phân tán trong dầu**" (EN *White lead dispersed in oil*) ⇒ chỉ tenLoai "chì trắng" — **SUY RỘNG**: tầng 3212901 chỉ đòi "không có nước"; chì trắng trong dung môi không phải dầu vào .13 (MFN 3 %) thay vì .19 (MFN 5 %). Phần còn lại (HOAC phạm vi, chongLanVanBan Q1, bảng 321290-01) đạt. |
| 330129 | DUYET | Sáu nguồn tinh dầu .20–.70 đủ, .70 mảng 5 cây. |
| 330190 | DUYET | .10 hai tên + "tinh dầu" + "làm thuốc"; .20 nguyên văn. |
| 330510 | DUYET | .10 "chống nấm". |
| 330610 | DUYET | .10 ["Bột","bột nhão"] + "ngừa bệnh cho răng" (định ngữ chung, đúng EN). |
| 330741 | DUYET | .10 "Bột thơm" + "nghi lễ tôn giáo". |
| 340119 | **TRA_VE** | .10/.20 "đã được thấm tẩm, tráng hoặc phủ xà phòng hoặc chất tẩy" (EN *impregnated, coated or covered with soap or detergent*) mã thành `dungCho` ["xà phòng","chất tẩy"] = "dùng cho xà phòng" — **sai nghĩa khoá**; câu hỏi lúc chạy sai, giấy/nỉ tẩm xà phòng thật khó tới .10/.20. |
| 340120 | **TRA_VE** | .91 "Dùng để tẩy mực, khử mực giấy tái chế" (EN *flotation de-inking of recycled paper* — một công dụng) thành mảng HOẶC ⇒ nhánh "tẩy mực" đứng riêng **SUY RỘNG** (xà phòng tẩy vết mực vào .91; cùng MFN 22 % nhưng sai mã). |
| 340231 | DUYET | Tên nguyên văn. |
| 340239 | DUYET | Tên nguyên văn. |
| 340242 | DUYET | Tên nguyên văn. |
| 340249 | DUYET | BO_VE "thích hợp để" đúng (cụm dẫn nhập của cùng một ý). |
| 340311 | DUYET | Dạng lỏng + "Chế phẩm dầu bôi trơn". |
| 340319 | DUYET | .11 động cơ phương tiện bay, .12 "Chế phẩm khác chứa dầu silicon" (phanConLai); bảng 340319-01/-02 KHONG_LECH khớp. |
| 340391 | DUYET | "chứa dầu silicon" giữ trong tên. |
| 340700 | DUYET | Nhóm không có "Loại khác": vế dạng đóng gói của .20 và "dùng trong nha khoa" của .30 là phạm vi nhóm 34.07; BO_VE "dùng cho trẻ em" (vế kể cả) đúng. Lưu ý: bột nặn gốc thạch cao thoả .10 và .30 qua chữ tự do — lúc chạy hỏi. |
| 350190 | DUYET | Hai tên rời; `nghi-phan-con-lai` .10 là báo oan ("khác" bổ nghĩa "dẫn xuất"). |
| 350300 | **TRA_VE** | .41 "**Dạng bột** có độ trương nở từ A-250 hoặc B-230 trở lên" (EN *In powder form …*) ⇒ chỉ `doTruongNoBloom >= 250`, bỏ "Dạng bột" với lý do "không có khoá" — tu-vung@2 **có** `dangBot`. **SUY RỘNG**: gelatin dạng lá/tấm Bloom ≥ 250 vào .41 (MFN 3 %) thay vì .49 (MFN 5 %). |
| 360490 | DUYET | .20 "for toys" chung hai tên; .40/.50 tên. |
| 360690 | **TRA_VE** | .10 "Nhiên liệu rắn hoặc **bán rắn**, cồn rắn và các nhiên liệu được điều chế **tương tự**" — phương án "bán rắn" mất danh từ "nhiên liệu" (EN *semi-solid fuels*); "các nhiên liệu được điều chế" bỏ "tương tự" (phải khai TUONG_TU) ⇒ **SUY RỘNG** (cùng MFN 20 % với .90 nhưng sai mã). |
| 370191 | DUYET | "công nghiệp in"; BO_VE thừa vô hại (nên xoá). |
| 370199 | DUYET | Như 370191. |
| 370242 | DUYET | Mảng 5 nhánh y tế/phẫu thuật/nha khoa/thú y/công nghiệp in đủ. |
| 370252 | DUYET | `dungChoDienAnh`; BO_VE thừa. |
| 370254 | DUYET | Như 370242. |
| 370255 | DUYET | Điện ảnh + 5 nhánh, cùng khoá congDung. |
| 370256 | DUYET | `dungChoDienAnh`; BO_VE thừa. |
| 370296 | DUYET | `dungChoDienAnh`; BO_VE thừa. |
| 370297 | DUYET | `dungChoDienAnh`; BO_VE thừa. |
| 370298 | DUYET | Biên .30 "từ 120 m trở lên" = `>= 120 m` đối chiếu tay (cảnh báo `cong3-bien-khong-doc-duoc`). |
| 370310 | DUYET | `chieuRong <= 1000 mm` khớp "không quá". |
| 370400 | DUYET | X quang. |
| 370500 | DUYET | `chongLanTruc` khongCoHangThat (.10+.20, .20+.30) — không nghĩ ra hàng thật thoả cả hai. |
| 370610 | DUYET | Bốn loại phim, "Phim tài liệu khác" (phanConLai), "chỉ có rãnh tiếng". |
| 370690 | DUYET | Như 370610. |
| 370790 | DUYET | Tên VI "Vật liệu phát sáng" (EN *Flashlight materials* — vật liệu đèn flash); dịch VI dễ hiểu nhầm nhưng trong 3707 không lấn dòng. |

## Cổng 5 — đo báo oan / bỏ sót

- `cong5-bo-ve` máy báo 3 vế (340249 ×1, 340700 ×2): người soát xác nhận cả 3 miễn đúng.
- `cong5-bo-ve-thua` 6 PN6 (370191, 370199, 370252, 370256, 370296, 370297): vô hại, người soạn nên xoá.
- Cổng 5 báo "phủ" nhưng thật ra **bỏ sót** 4 lỗi (321290 .13, 350300 .41, 360690 .10, 320810/320910 tên "Sơn") — xem mục dưới.

## Máy tách sai / cổng phủ sai (để Claude chỉnh `lib/ho-so/tach-ve.js`)

1. **350300 .41** — "Dạng bột" bị xếp `DAU` (danh từ đầu) thay vì vế GIỚI HẠN ⇒ bỏ vế không bị bắt. Cụm "Dạng <x>" đầu dòng nên là vế giới hạn.
2. **320810 .20 / 320910 .50 / 321000 .91** — `DAU "Sơn chống hà và/hoặc chống ăn mòn"`: DAU không đòi phủ nên bỏ hẳn tên "Sơn" vẫn xanh.
3. **321290 .13** — GIOI_HAN "chì trắng phân tán trong dầu" báo "phủ" chỉ vì tên "chì trắng" là chuỗi con của vế; phủ theo chuỗi con phải đòi cả phần định ngữ ("phân tán trong dầu").
4. **360690 .10** — vế "được điều chế tương tự" xếp GIOI_HAN "phủ" thay vì vế MỞ / TUONG_TU; và DAU gộp "Nhiên liệu rắn hoặc bán rắn, cồn rắn và các nhiên liệu" khiến tách "bán rắn" khỏi "nhiên liệu" không bị bắt.
5. **340119 .10** — cắt "sản phẩm | không dệt, đã" (coi "không" là ranh giới — "sản phẩm không dệt" là MỘT danh từ, EN *nonwovens*); .10/.20 cắt "đã | được thấm tẩm" làm đôi động từ.
6. **320890 tiêu đề 3208901** — cắt "loại chịu | được nhiệt trên 100°C" (tách "chịu được").
7. **340700 .20** — cắt ở dấu ngoặc kép: `được coi như "sáp` | `dùng trong nha khoa" hoặc như "hợp chất tạo khuôn răng", đã đóng gói …` — ranh vế nằm trong tên trích dẫn và gộp vế dạng đóng gói vào tên. **.30** gộp hai vế ("dùng trong nha khoa" + "có thành phần cơ bản là thạch cao plaster") thành một.
8. **370610 .40 / 370690 .40** — "chỉ có duy nhất rãnh tiếng" bị đọc `DAU "chỉ"` (hiểu "chỉ" là danh từ) — vô hại ở đây.

## Kiểm sau lô

`node scripts/check-so-tay.mjs`, `node scripts/check-cay.mjs`, `node scripts/test-so-tay.mjs` — kết quả ghi trong PR.
