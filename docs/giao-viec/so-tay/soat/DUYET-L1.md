# Soát độc lập lô L1 — 23 phân nhóm (#1109)

Phiên soát: `claude-agent:duyet-L1-20261111#soat-L1` (khác phiên soạn). Ngày 11/11/2026. Làm theo `SOAT-RANH-GIOI.md` mục 0–5.

Cách soát mỗi PN6: `--kiem` (cả 23 XANH, không DỪNG) → `--ve` (chữ biểu VI + EN từng dòng/tiêu đề) → đặt từng điều kiện của bản
nháp cạnh chữ biểu, tra định nghĩa khoá trong `data/tu-vung/tu-vung@2.json` (câu hỏi `cauHoi`, `cachDoc`, `ghiChu`), SEN
(`data/sen-2022.json`), MFN (`data/tax.json`), tiền lệ (`data/precedents.json`) và `data/ho-so/hieu-chinh-tien-le.json` (không mục
nào thuộc lô này).

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 010130 | TRA_VE | 01013010 SUY RỘNG: "Loại thuần chủng để nhân giống" / "Pure-bred breeding animals" ⇒ chỉ `dungLamGiong CO`; vế "thuần chủng" bị nuốt (khoá chỉ hỏi "có dùng để nhân giống"). Con giống lai vào .10 (MFN 0%) thay vì .90 (5%). |
| 010229 | DUYET | Tiêu đề 0102291 "Gia súc đực" ⇒ tenLoai "đực"; 01022911 "Bò thiến"/"Oxen" + SEN (đực trưởng thành đã thiến, huấn luyện làm động vật kéo) ⇒ tenLoai + congDung "động vật kéo": hẹp có căn cứ SEN; .11/.19 cùng MFN 5%. |
| 010290 | TRA_VE | 01029010: cùng lỗi "thuần chủng" như 010130 (MFN 0% vs 5%). |
| 010410 | TRA_VE | 01041010: cùng lỗi "thuần chủng" (cừu; MFN 0% vs 5%). |
| 010420 | TRA_VE | 01042010: cùng lỗi "thuần chủng" (dê; MFN 0% vs 5%). |
| 010511 | DUYET | "Để nhân giống (SEN)" / "Breeding fowls" ⇒ dungLamGiong CO; SEN 0105 không đòi thuần chủng. |
| 010512 | DUYET | như 010511 (turkeys). |
| 010513 | DUYET | như 010511 (ducklings). |
| 010514 | DUYET | như 010511 (goslings). |
| 010515 | DUYET | như 010511 (guinea fowls). |
| 010594 | DUYET | .10 "Để nhân giống, trừ gà chọi" = dungLamGiong CO + tenLoai gà chọi PHAI_KHONG; tiêu đề "Gà chọi"; .41/.91 "không quá 2 kg" = khoiLuong ≤ 2 kg (biên ≤ đúng). |
| 010599 | DUYET | tenLoai liệt kê + dungLamGiong CO; .20/.40 phanConLai đúng anh em cùng tên. BO_VE 01059930 "để nhân giống" đúng (EN "Breeding geese, turkeys and guinea fowls" — định ngữ chung). |
| 010612 | DUYET | 5 tên / 3 tên khớp VI–EN; ngoặc phân loại học không thành điều kiện. |
| 020714 | DUYET | Cánh/Đùi/Gan qua boPhanThitGiaCam; .91 MSM khớp SEN. Lưu ý: enum DUI đọc cả EN "legs" (rộng hơn "Thighs") — chấp nhận vì chữ Việt "Đùi". |
| 020727 | DUYET | Gan; .91 MSM (SEN). |
| 020745 | DUYET | Gan béo = GAN_BEO. |
| 020755 | DUYET | Gan béo = GAN_BEO. |
| 020760 | TRA_VE | 02076030/40 THU HẸP: "Đã chặt mảnh và phụ phẩm sau giết mổ" / "Cuts and offal" ⇒ chỉ `daChatManh CO`; chính ghiChu khoá nói khoá KHÔNG đọc vế "phụ phẩm". Phụ phẩm có thể trả lời KHONG ⇒ rơi .10/.20 (MFN 40%) thay vì .30/.40 (15%). |
| 020840 | DUYET | 5 loài Cetacea/Sirenia đủ. Lưu ý: khoá `dungCho` dùng cho nghĩa "thịt CỦA loài" (câu hỏi khoá nói "dùng cho máy, xe") — ranh giới đúng, nhãn khoá lệch nghĩa. |
| 020890 | DUYET | "Đùi ếch" / "Frogs' legs". |
| 021019 | DUYET | "Bacon; boneless hams" ⇒ HOAC, "không xương" chỉ của hams. Tiền lệ 988/TB-TCHQ (bột thịt lợn sấy → 02101990) nhất quán. |
| 021092 | DUYET | như 020840. |
| 021099 | TRA_VE | (A) 02109910 SUY RỘNG: "làm khô đông lạnh (SEN)" / "Freeze-dried" ⇒ `phuongPhapBaoQuan KHO_MUOI` (khô, muối hoặc ngâm nước muối). (B) 02109920 SUY RỘNG: "Da lợn khô" ⇒ KHO_MUOI nhận cả da lợn muối. MFN cùng 20% nhưng sai mã 8 số. |

## Tổng

- DUYET 17 (đã `--ap-dung`), TRA_VE 6, đỏ 0, chờ bảng hiệu chỉnh tiền lệ 0, chưa soát 0.
- Tỉ lệ sai theo PN6: 6/23 = 26%. Theo dòng 8 số bị ảnh hưởng: 8 dòng (01013010, 01029010, 01041010, 01042010, 02076030,
  02076040, 02109910, 02109920) trên 59 dòng của lô (14%).
- Cả 6 bản trả về đều XANH ở cổng máy. Nguyên nhân chung: khoá từ vựng thiếu (thuần chủng, phụ phẩm sau giết mổ, đông khô / chỉ
  làm khô) nên người soạn ép vào khoá gần nhất; `cachDoc` của khoá chứa nguyên cụm chữ biểu nên cổng 5 báo "phủ". Đáng lẽ phải là
  `THIEU_KHOA_TU_VUNG` ⇒ DỪNG.
- Cổng 5: lô có 1 cảnh báo BO_VE (010599) — đúng, không phải lỗi. Cổng 5 báo "phủ" ở 6 vế mà thực chất KHÔNG phủ đủ (4 vế "thuần
  chủng", 2 vế "làm khô đông lạnh"/"khô" với KHO_MUOI) và bỏ sót 2 vế "phụ phẩm sau giết mổ" (bộ tách để cả dòng là DAU).

## Việc cho Claude (không phải người soạn)

Từ vựng (`data/tu-vung/`):
1. Thêm khoá `thuanChung` (CO_KHONG, "thuần chủng — được cơ quan có thẩm quyền công nhận") hoặc bỏ mẫu
   `thuần chủng để nhân giống` / `pure-bred breeding` khỏi `cachDoc` của `dungLamGiong` để cổng 5 không báo "phủ" oan.
2. Thêm khoá/giá trị cho "phụ phẩm sau giết mổ" (offal), hoặc định nghĩa lại `daChatManh` = "không còn nguyên con (gồm phụ phẩm)".
3. Thêm giá trị `DONG_KHO` (freeze-dried) và tách "chỉ làm khô" khỏi `KHO_MUOI` trong `phuongPhapBaoQuan`.
4. `dungCho` đang dùng cho "Của <loài>" (020840, 021092; và nhiều bản NHAP 0602, 0909) — câu hỏi lúc chạy sai nghĩa; cân nhắc khoá
   nguồn loài.

Máy tách sai (`lib/ho-so/tach-ve.js`):
1. 010599 / 01059930 "Ngỗng, gà tây và gà lôi để nhân giống": báo "TÁCH ĐỊNH NGỮ (B)" oan — chữ Anh "Breeding geese, turkeys and
   guinea fowls" cho thấy định ngữ chung cả liệt kê.
2. 020760 / 02076030, 02076040 "Đã chặt mảnh và phụ phẩm sau giết mổ, tươi hoặc ướp lạnh": cả dòng thành một DAU — không tách hai
   danh từ đầu (cuts | offal) và không tách vế "tươi hoặc ướp lạnh"/"đông lạnh" (trong khi .10/.20 cùng cấu trúc lại tách thành
   GIOI_HAN).
3. 020714 / 02071491, 020727 / 02072791 và 021099 / 02109910: DAU cắt ở "Thịt đã" / "Thịt gà thái miếng đã" — trợ từ "đã" dính vào
   danh từ đầu, "được …" thành vế riêng.

Kiểm sau lô: `check-so-tay` xanh, `check-cay` 0 lỗi lệch cây, `test-so-tay` 65/65.
