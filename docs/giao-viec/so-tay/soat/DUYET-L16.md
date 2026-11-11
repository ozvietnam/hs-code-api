# Soát độc lập lô L16: 59 phân nhóm (#1109)

Phiên soát: `claude-agent:duyet-L16-20261111#soat-L16` (khác phiên soạn). Ngày 11/11/2026. Làm theo `SOAT-RANH-GIOI.md` mục 0–5.

Cách soát mỗi PN6:
- Chạy `--kiem`: cả 59 PN6 XANH, không DỪNG. Cảnh báo gồm 37 `so-chu-tu-do`, 4 `can-bang-hieu-chinh-tien-le-da-co`, 1 `cong5-bo-ve`. Không có `de-trong`, `ten-anh-em`, `chong-lan` hay `tuong-tu`.
- Chạy `--ve` để lấy chữ biểu VI + EN của từng dòng và tiêu đề, rồi đặt từng điều kiện cạnh chữ biểu.
- Tra định nghĩa khoá trong `data/tu-vung/tu-vung@2.json` (`moTaGiaTri`, `cachDoc`), tra `data/precedents.json`, `data/ho-so/hieu-chinh-tien-le.json` và MFN trong `data/tax.json`.
- Với điều kiện chữ tự do và khoá liệt kê đáng ngờ, **chạy thử bộ đọc** `lib/dieu-kien-so.js#danhGiaTuChu` trên câu mô tả hàng có thật. Mỗi lỗi bên dưới đều có kết quả chạy thử đi kèm.

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 511211 | DUYET | "Được in bằng phương pháp batik truyền thống" / "Printed by the traditional batik process" ⇒ `phuongPhapIn BATIK`. Nhãn giá trị là "in batik truyền thống" nên phủ cả "được in" lẫn "truyền thống". |
| 511219 | DUYET | Như 511211. |
| 520411 | DUYET | "Chưa tẩy trắng" / "Unbleached" ⇒ `CHUA_TAY_TRANG`. |
| 520911 | DUYET | "Vải duck và vải canvas" ⇒ tenLoai gồm 2 tên. `kieuDet VAN_DIEM` lấy từ SEN và trùng với tổ tiên 5209.11 "Vân điểm" nên không làm hẹp. Khớp tiền lệ 3076/TB-TCHQ (canvas ⇒ .10). |
| 520951 | DUYET | Batik (như 511211). |
| 520952 | DUYET | Batik. |
| 520959 | DUYET | Batik. |
| 521051 | DUYET | Batik. |
| 521059 | DUYET | Batik. |
| 521141 | DUYET | "Vải Ikat" + `cachDieuKhien BANG_TAY` lấy từ SEN 52114110 ("máy dệt thủ công … điều khiển bằng tay"), đúng LUAT-CHUNG §14. Bảng hiệu chỉnh 521141-01 KHONG_LECH khớp. |
| 521151 | DUYET | Batik. |
| 521152 | DUYET | Batik. |
| 521159 | DUYET | Batik. |
| 521215 | DUYET | Batik. |
| 521225 | DUYET | Batik. |
| 530500 | **TRA_VE** | 53050010 THU HẸP. Chữ "Xơ xidan (sisal) và xơ dệt khác của các cây thuộc chi cây thùa (Agave); tô (tow) và phế liệu…" bị ghi thành 2 chuỗi tenLoai dài, mỗi chuỗi gói 2 hàng nối bằng "và". Chạy thử "Xơ sisal thô, dạng bó" ⇒ **TRAI**, tức chính xơ sisal rơi về .90. Lỗi phụ: 53050021 tenLoai "loại thô" là trạng thái, không phải tên loại. |
| 530890 | DUYET | "Sợi giấy" / "Paper yarn". |
| 531010 | DUYET | "Vải dệt vân điểm" / "Plain" ⇒ `kieuDet VAN_DIEM`. |
| 540110 | DUYET | "Đã đóng gói để bán lẻ" ⇒ `dongGoiBanLe CO`. |
| 540120 | DUYET | Như 540110. |
| 540233 | DUYET | "Loại có màu trừ màu trắng" / "Of a colour other than white" ⇒ `coMauTruTrang CO`. |
| 540244 | DUYET | "Từ các polyeste" / "Từ polypropylen" ⇒ tenLoai tên polyme. Từ vựng chưa có khoá polyme cụ thể nên dùng chữ tự do. Khớp tiền lệ 2713/3177/3178 (elastan ⇒ .90). |
| 540246 | DUYET | Như 540233. |
| 540247 | DUYET | Như 540233. |
| 540331 | DUYET | "Sợi dún" / "Textured yarn" ⇒ `soiDun CO`. |
| 540332 | DUYET | Như 540331. |
| 540333 | DUYET | Như 540331. |
| 540339 | DUYET | Như 540331. |
| 540341 | DUYET | Như 540331. |
| 540710 | DUYET | "Vải làm lốp xe; vải làm băng tải" / "Tyre fabrics; conveyor duck"; .91 "Chưa tẩy trắng". Phạm vi đúng. Lưu ý bộ so chữ ở mục "Lỗi bộ đọc" bên dưới. |
| 540741 | chưa duyệt (độc lập) | Bản do phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU` soạn, cũng là phiên điều phối lô soát này, nên tôi không tự duyệt. Nhận xét: tenLoai "Vải lưới ni lông" + `daXoan KHONG` + dungCho "vật liệu gia cố cho vải sơn dầu" phủ đủ vế. Bảng 540741-01 KHONG_LECH khớp. Có vẻ đạt. |
| 540810 | DUYET | "Chưa tẩy trắng" ⇒ `CHUA_TAY_TRANG`. |
| 550320 | DUYET | Như 540233. |
| 550390 | DUYET | "Từ polyvinyl alcohol" ⇒ tenLoai. Khớp 2698/2699/TB-TCHQ (⇒ .90). |
| 550810 | DUYET | "Đã đóng gói để bán lẻ". Khớp 2808/TB-TCHQ (⇒ .10). |
| 550820 | DUYET | Như 550810. |
| 550952 | chưa duyệt (độc lập) | Cùng phiên soạn với phiên điều phối (như 540741). Nhận xét: "Sợi đơn" / "Single yarn" ⇒ tenLoai. Bảng 550952-01 KHONG_LECH khớp. Có vẻ đạt. |
| 551110 | DUYET | "Sợi dệt kim, sợi móc và chỉ thêu" ⇒ tenLoai gồm 3 tên. Khớp 2501/TB-TCHQ (sợi móc ⇒ .10). |
| 551120 | DUYET | Như 551110. |
| 560122 | DUYET | "Tô (tow) đầu lọc thuốc lá" / "Cigarette tow". Phạm vi đúng. Gợi ý thêm biệt danh EN "cigarette tow" vì chữ Anh hiện đọc ra CHUA_BIET. |
| 560490 | DUYET | Các vế .10/.20/.30 đều có điều kiện, phạm vi khớp chữ. Gợi ý, không chặn duyệt: "sợi tơ tằm" nên dùng `loaiSoiDet TO_TAM`; "ngâm tẩm cao su" trùng chữ nhóm 56.04 nên không tất định. |
| 560750 | **TRA_VE** | 56075010 vế 1 gắn định ngữ sai đích. EN "V-belt cord **of man-made fibres treated with RF**": phần in đậm thuộc về sợi bện, nhưng bản ghi dungCho "dây đai chữ V làm từ xơ nhân tạo đã xử lý…". Chạy thử đúng hàng của dòng ⇒ CHUA_BIET (THU HẸP). Bản này do phiên điều phối soạn, nhưng trả về không mang rủi ro tự duyệt. |
| 560790 | **TRA_VE** | 56079030 THU HẸP. "thuộc nhóm 53.03" / "of heading 53.03" là định ngữ phân loại xơ libe, nhưng bị ghi `dungCho CONG_DUNG "nhóm 53.03"`. Chạy thử "Dây xe từ đay" ⇒ dungCho CHUA_BIET vĩnh viễn, nên .30 không bao giờ chốt được. Lỗi phụ: 56079022 "xơ (lá thực vật) cứng" + "Dây thừng từ xơ sisal" ⇒ TRAI. |
| 560819 | DUYET | "Túi lưới" / "Net bags". |
| 560890 | DUYET | "Túi lưới". |
| 570110 | DUYET | "Thảm cầu nguyện" ⇒ `thamCauNguyen CO`. |
| 570190 | **TRA_VE** | 57019020 SUY RỘNG: "Từ xơ đay" / "Of jute fibres" ⇒ `loaiSoiDet SOI_THUC_VAT_KHAC`, giá trị này gồm cả lanh, gai, sisal, xơ dừa, abaca. Chạy thử "Thảm … từ xơ sisal" ⇒ THOA **tất định** ⇒ vào dòng đay thay vì .9x. MFN cùng 12% nhưng sai mã 8 số. |
| 570239 | **TRA_VE** | 57023920: lỗi "xơ đay" như 570190. |
| 570241 | DUYET | Thảm cầu nguyện. |
| 570242 | DUYET | Thảm cầu nguyện. |
| 570249 | **TRA_VE** | 57024920: lỗi "xơ đay". |
| 570250 | **TRA_VE** | 57025020: lỗi "xơ đay". |
| 570291 | DUYET | Thảm cầu nguyện. |
| 570292 | DUYET | Thảm cầu nguyện. |
| 570299 | **TRA_VE** | 57029920: lỗi "xơ đay". |
| 570310 | DUYET | "Thảm lót chân" (Floor mats) và "Thảm trải sàn" (Flooring carpets), cả hai kèm "loại dùng cho xe có động cơ thuộc nhóm 87.02, 87.03 hoặc 87.04"; .20 "Thảm cầu nguyện". Hai tên không chứa nhau. |
| 570329 | DUYET | Thảm cầu nguyện. |
| 570339 | DUYET | Thảm cầu nguyện. |
| 570390 | **TRA_VE** | Tiêu đề 5703902 "Từ xơ đay" (dieuKienNut): lỗi "xơ đay". Bản do phiên điều phối soạn; trả về không mang rủi ro tự duyệt. |

## Tổng

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 48 |
| TRA_VE | 9 |
| chưa duyệt — cùng phiên soạn với phiên điều phối | 2 (540741, 550952; nhận xét: có vẻ đạt, cần một phiên khác duyệt) |
| đỏ / chờ bảng hiệu chỉnh tiền lệ / chưa soát | 0 / 0 / 0 |

Kiểm sau lô: `check-so-tay` xanh, `check-cay` xanh, `test-so-tay` 65/65.

## Tỉ lệ lỗi

- **Theo PN6:** 9/57 PN6 đã kết luận bị trả về (16%). Riêng nhóm 57.01–57.03 có 6/18 PN6 sai, tất cả cùng một lỗi "xơ đay", lặp lại: 5 bản do phiên `session_01Ce55326…` soạn, 570390 do phiên `session_01Y2pGdeNRxMwYS2zRJGH1yU…` soạn.
- **Theo dòng 8 số bị ảnh hưởng:** 6 dòng "Từ xơ đay" (57019020, 57023920, 57024920, 57025020, 57029920, nút 5703902 phủ 4 dòng .91/.92/.93/.99), cộng 53050010, 56079030 và 56075010.
- **Cổng 5:** báo 1 vế BO_VE (560750 "và các sản phẩm tương tự"). Tôi xác nhận lý do của vế này đúng. Lỗi thật của 560750 lại nằm ở một vế mà cổng 5 chấm "phủ", nên cổng 5 **không bắt được** lỗi gắn định ngữ sai đích.
- Cả 9 lỗi đều qua 5 cổng xanh. Cổng kiểm *có điều kiện phủ vế* chứ không kiểm *điều kiện đúng nghĩa*. Ba kiểu sai lọt qua:
  - khoá liệt kê rộng hơn chữ;
  - CONG_DUNG dùng cho một định ngữ phân loại;
  - nhiều hàng gói trong một chuỗi.

## Máy tách sai / lỗi bộ đọc (cho Claude sửa `lib/ho-so/tach-ve.js`, `lib/dieu-kien-so.js`)

1. **530500:53050010**: `--ve` coi "Xơ xidan (sisal) và xơ dệt khác của các cây thuộc chi cây thùa (Agave)" là một vế DAU liên hợp. `cong3-liet-ke-trong-mot-chuoi` không chặn được giá trị tenLoai gói hai tên nối "và" kèm định ngữ "của …". Cần mở rộng luật vòng 7 cho mẫu "X (ngoặc) và Y khác của …".
2. **560790:56079030**: bộ tách gán "thuộc nhóm 53.03" là GIOI_HAN và cổng 5 chấm "phủ" bởi `dungCho`. Đề xuất: GIOI_HAN dạng "thuộc nhóm NN.NN" đứng sau tên xơ/vật liệu (chữ Anh "of heading") không được coi là phủ bởi CONG_DUNG.
3. **560750:56075010**: bộ tách gộp "cho dây đai chữ V làm từ xơ nhân tạo đã xử lý" thành một GIOI_HAN. Chữ Anh tách rõ: "V-belt cord" là danh từ, "of man-made fibres treated with RF" là định ngữ của cord. Nên tách theo chữ Anh khi định ngữ "of …" đứng sau cả cụm danh từ.
4. **Bộ so TEN_LOAI** (chưa phải lỗi bản, chỉ ghi để theo dõi):
   - "Vải mành nylon làm lốp xe" so với "Vải làm lốp xe" ⇒ TRAI (không tất định), vì cụm không liền. Đây đúng là hàng của tiền lệ 3241/TB-TCHQ (vải mành lốp ⇒ 5407.10.2x).
   - "Dây thừng từ xơ sisal" so với "xơ (lá thực vật) cứng" ⇒ TRAI.
   - Tên nhóm/tính chất cần bộ so mềm hơn, hoặc người soạn phải thêm tên cụ thể.

## Việc tiếp theo

- **570500** (ngoài lô, đã DUYET) mắc cùng lỗi "Từ xơ đay" ⇒ `SOI_THUC_VAT_KHAC`, cần soát lại hoặc gỡ DUYET. Từ vựng `loaiSoiDet` thiếu giá trị cho đay (vd `DAY` hoặc `XO_LIBE_5303`). Đây là đề xuất THIEU_KHOA_TU_VUNG cho các bản 57.01–57.05 và có thể cả 63.05.
- 540741 và 550952 cần một phiên soát khác phiên điều phối để duyệt.
