# Soát độc lập L1-4c — lô L8 (#1109)

Phiên soát: `claude-agent:duyet-L8-20261111#soat-L8` (khác phiên soạn `zcode-sub:glm-5.3:…` / `…#soan-<pn6>`). Ngày 11/11/2026.

Cách làm cho từng PN6: `--kiem` (31/31 XANH, 0 DỪNG) → `--ve` (đọc chữ biểu VI + EN của từng dòng, từng vế) → đặt mọi điều kiện cạnh
chữ biểu, hỏi ba câu §2 (hẹp hơn / rộng hơn / máy tách sai) → đọc cảnh báo (`cong3-bien-khong-doc-duoc` 282720,
`can-bang-hieu-chinh-tien-le-da-co` 282739, `so-chu-tu-do`) → tra `data/precedents.json` theo mã 8 số và bảng
`data/ho-so/hieu-chinh-tien-le.json` → với dòng nghi ngờ, đối chiếu thêm tên PN6 ở `data/bieu-thue/2026.04.05/ten-nut.json`.
Lô này không có cảnh báo `cong5-bo-ve`, `cong5-de-trong-chua-xu-ly`, `chongLanTruc`, `TUONG_TU` nên không cần `--giai-quyet`.

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 280300 | DUYET | Tiêu đề 2803004 "Other carbon blacks" = tenLoai "Muội carbon" + phanConLai (phủ định .20 Muội axetylen); .41 "rubber processing" congDung; tiền lệ 798, 799/TB-TCHQ (.41), 1050, 3153/TB-TCHQ (.49) khớp |
| 280700 | **TRA_VE** | 28070010 SUY RỘNG: bỏ danh từ đầu "Axit sulphuric", chỉ còn `hamLuongH2SO4 > 80` ⇒ oleum (cùng nhóm 2807 "Axit sulphuric; oleum") khai % H2SO4 tương đương > 80 bị kéo vào .10 thay vì .90 |
| 280920 | DUYET | Tiêu đề 2809203 "Food grade" dungCho; tên trùng .31/.91, .32/.92 khác tầng cha nên không chồng; tiền lệ 4156, 6499/TB-TCHQ (.92) khớp |
| 281000 | DUYET | Hai tên rời "Oxides of boron" / "Boric acids", không có "Loại khác" |
| 281119 | DUYET | "(axit sulphamic)" là tên đồng nghĩa — giữ một chuỗi đúng |
| 281122 | DUYET | "In powder form" ⇒ tenLoai "Dạng bột" (chưa có khoá dạng thức; theo tiền lệ soạn 390799) |
| 281129 | DUYET | Hai tên hoá chất nguyên văn |
| 281700 | DUYET | Kẽm oxit / kẽm peroxit; tiền lệ 1142/TB-TCHQ (.10) khớp |
| 282720 | DUYET | "Containing 73% - 80% by weight" ⇒ `>= 73` và `<= 80`, đã đối chiếu biên bằng tay (máy báo không đọc được biên) |
| 282739 | DUYET | "Of barium or of cobalt / Of iron / Of zinc" ⇒ tenLoai tên kim loại; bảng hiệu chỉnh 282739-01 KHONG_LECH (đồng clorua 2337/TB-TCHQ ⇒ .90) đã đọc, khớp; tiền lệ 108, 5984/TB-TCHQ (.10) khớp |
| 282890 | DUYET | Natri hypoclorit |
| 282990 | DUYET | Natri perclorat |
| 283090 | DUYET | "Cadmium sulphide or zinc sulphide" ⇒ mảng (BANG-LUAT #1) |
| 283322 | DUYET | "Commercial grade" ⇒ tenLoai "thương phẩm" |
| 283329 | DUYET | .20 tribasic lead sulphate, .30 Of chromium, .40 Of zinc; tiền lệ 2323/TB-TCHQ (crom sulphat .30) và 3117, 3996/TB-TCHQ (sắt sulphat .90) khớp |
| 283429 | DUYET | "Of bismuth"; tiền lệ 2322, 4979/TB-TCHQ (đồng nitrat .90) khớp |
| 283525 | DUYET | "Feed grade" ⇒ congDung |
| 283529 | DUYET | "Of trisodium"; tiền lệ 143, 1071/TB-TCHQ (.90) khớp |
| 283531 | DUYET | "Food grade" ⇒ dungCho "thực phẩm" |
| 283539 | DUYET | Tetranatri pyrophosphat |
| 283650 | DUYET | "Food or pharmaceutical grade" ⇒ dungCho mảng; tiền lệ 3246/TB-TCHQ (PCC ngành nhựa .90) khớp |
| 283699 | DUYET | "Commercial ammonium carbonate" giữ trọn cụm; "Lead carbonates" |
| 283919 | DUYET | "Sodium orthosilicate; sodium pyrosilicate" ⇒ mảng |
| 284290 | **TRA_VE** | 28429020 "Muối của đồng hoặc crom" / "Copper or chromium salts": kim loại tạo muối ghi bằng `dungCho ["đồng","crom"]` — SAI TRỤC (dungCho = dùng cho hàng/máy đi cùng). Muối đồng thật trả lời "không dùng cho đồng" ⇒ rơi .90 (THU HẸP); muối kim loại khác "dùng cho mạ đồng" lại khớp .20 (SUY RỘNG) |
| 284410 | **TRA_VE** | 28441010 "Urani tự nhiên và các hợp chất của nó": giá trị tenLoai "các hợp chất của nó" mất đích của đại từ ⇒ khớp mọi "hợp chất"; .90 (hợp kim, gốm, hỗn hợp chứa urani tự nhiên/hợp chất của nó) bị lấn — SUY RỘNG, máy tách sai |
| 284420 | **TRA_VE** | 28442010: cùng lỗi "hợp chất của nó" (giá trị `["Urani đã làm giàu thành U 235","hợp chất của nó","plutoni"]`) — SUY RỘNG, máy tách sai |
| 284430 | **TRA_VE** | 28443010: chữ VI dòng 8 số ghi "Urani **đã làm giàu** thành U 235…" nhưng EN là "Uranium **depleted** in U 235…" và tên PN6 284430 ghi "Urani đã được **làm nghèo**". Điều kiện chép lỗi dịch ⇒ urani nghèo (hàng đúng của .10) không khớp, rơi .90 (THU HẸP/sai nghĩa); kèm lỗi "hợp chất của nó" |
| 284700 | DUYET | "In liquid form" ⇒ `dangLong CO` |
| 285210 | **TRA_VE** | 28521020 "Các hợp chất của thủy ngân được dùng như chất phát quang": "của thủy ngân" (thành phần, lặp chữ nhóm 2852) ghi `dungCho "thủy ngân"` — SAI TRỤC, hợp chất thủy ngân phát quang thật trả lời "không dùng cho thủy ngân" ⇒ rơi .90 |
| 285290 | DUYET | 7 hàng nối ";" ⇒ HOAC; "thuộc 2934.99.90" ⇒ dungCho mã (BANG-LUAT #9). Lưu ý nhỏ: giá trị "các dẫn xuất protein khác của thủy ngân" còn chữ "khác" (khác so với pepton trong cùng dòng) — so chữ tự do, không đổi mã |
| 285390 | DUYET | Nước khử khoáng |

## Tổng

- DUYET 25 · TRA_VE 6 · đỏ 0 · chờ bảng hiệu chỉnh tiền lệ 0 · chưa soát 0.
- Tỉ lệ sai theo PN6: 6/31 = 19,4%. Theo dòng 8 số có điều kiện bị ảnh hưởng: 6 dòng (28070010, 28429020, 28441010, 28442010,
  28443010, 28521020) và 6 dòng "Loại khác" anh em bị lấn/thiếu. MFN các cặp đều bằng nhau (2807: 10/10; 2842, 2844, 2852: 0/0)
  — sai là sai MÃ (quan trọng với 2844: vật liệu hạt nhân, giấy phép chuyên ngành), không phải chênh thuế.
- Sau `--ap-dung`: `check-so-tay` 0 lỗi, `check-cay` 0 lỗi lệch cây, `test-so-tay` 65/65 PASS. Không phải hoàn PN6 nào.

## Lỗi kiểu lặp — cho người soạn / Claude

1. **"của <nguyên tố>" trong hoá chất ghi bằng `dungCho`** (284290, 285210): khoá `dungCho` là "dùng cho", không phải thành phần.
   Cùng lô, 282739/283329/283429/283529 cùng dạng chữ ("Of iron", "Of chromium"…) lại ghi `tenLoai` — cần một quy ước chung trong
   BANG-LUAT cho chương 28 (tên kim loại tạo muối ⇒ `tenLoai`, hoặc khoá thành phần mới).
2. **Danh từ đầu bị bỏ khi nhóm có nhiều hàng** (280700): điều kiện số thay hết tên hàng, trong khi chữ nhóm cha liệt kê hàng khác
   (oleum) cũng thoả biên số.
3. **Lỗi dịch của biểu (VI ≠ EN)** (284430): người soạn chép nguyên văn VI sai nghĩa; nên là điều kiện DỪNG khi `--ve` cho thấy
   VI/EN lệch nghĩa (enriched ↔ depleted), báo Claude.

## Máy tách sai (§2) — để Claude chỉnh `lib/ho-so/tach-ve.js`

- **"X và (các) hợp chất của nó"** (284410 .10, 284420 .10, 284430 .10): bộ tách coi là hai danh từ đầu liên hợp
  `X | hợp chất của nó`, cho người soạn ghi giá trị "hợp chất của nó" mất đích đại từ. Nên xử như BANG-LUAT #5 "X và bộ phận của
  chúng": vế MỞ có đích X (vd `HOAC [[tenLoai X], [tenLoai "hợp chất", <đích> X]]`), hoặc cổng chặn giá trị chỉ gồm đại từ
  "của nó/của chúng".
- 285210 .20: "của thủy ngân" được nhận là vế GIỚI HẠN cần phủ, dù chỉ lặp chữ nhóm 2852 ("Hợp chất … của thủy ngân") — nên nhận là
  "lặp chữ tổ tiên" để người soạn không phải ép một điều kiện sai trục.

## Tiền lệ (§3)

Đã tra theo mã 8 số: 28030041, 28030049, 28092092, 28170010, 28273910, 28273990, 28332930, 28332990, 28342990, 28352990,
28353100, 28365090, 28429090 — tất cả khớp chữ biểu với điều kiện đã duyệt; 282739 đã có mục bảng hiệu chỉnh (KHONG_LECH). Không phát
hiện tiền lệ nằm trong vế dòng khác mà thiếu mục bảng.
