# Soát độc lập lô L28: 65 phân nhóm (8507–8535) (#1109)

Phiên soát: `claude-agent:duyet-L28-20261111#soat-L28` (khác phiên soạn). Ngày 11/11/2026. Làm theo `SOAT-RANH-GIOI.md` mục 0–5 và
phần "BỔ SUNG 11/11" của tech lead.

Cách soát từng PN6:
1. `--kiem`: cả 65 XANH, mã thoát 0, không DỪNG.
2. `--ve`: in chữ biểu VI + EN của từng dòng và tiêu đề.
3. Đặt từng điều kiện của bản nháp cạnh chữ biểu nguyên văn (bieu-chinh + tieu-de của biểu 2026.04.05, kể cả tầng không mã).
4. Tra định nghĩa khoá trong `data/tu-vung/tu-vung@2.json` (cachDoc, soChieu, ghiChu) và cách máy so mã HS trong chữ tự do
   (`lib/dieu-kien-so.js#maThamChieu`).
5. Đọc mọi cảnh báo cổng: cong5-bo-ve kèm lyDo, chongLanVanBan, chongLanTruc kèm viDuHang, cong3-bien-khong-doc-duoc.

Kiểm thêm theo bổ sung 11/11:
- Đối chiếu `dieuKienSo` có SỐ trong `data/so-tay/<nhóm>.json` trên origin/main. Chỉ 850720 có ngưỡng số (chiều cao 13/23 cm), và
  bản nháp giữ đủ. `--ap-dung` không gặp `cong3-mat-nguong-so`.
- Không gặp mẫu "phạm vi phân nhóm dùng làm dữ kiện loại trừ" (mục 2) hay "tên phân nhóm tự chứa vế dòng" (mục 3).
- Không PN6 nào trong lô có ghi chú DE_TRONG / "người soát xem".

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 850720 | DUYET | Đối chiếu VI+EN: tầng 6V/12V ≤200Ah + ba mốc chiều cao 13/23 cm khớp chữ biểu, giữ đủ ngưỡng số của sổ tay; BO_VE '(không bao gồm đầu cực và tay cầm)' là cách đo chung, không đổi mã. |
| 850730 | DUYET | Đối chiếu VI+EN: .10 'Of a kind used for aircraft' ⇒ dungCho máy bay; .90 Loại khác trần. |
| 850750 | DUYET | Đối chiếu VI+EN: máy bay / 'vehicles in Chapter 87' (máy đọc mã Chương 87) / Loại khác trần — khớp. |
| 850760 | DUYET | Đối chiếu VI+EN: tầng 'Battery pack' + laptop (kể cả notebook) / máy bay / Chương 87 / Loại khác; không thiếu vế. |
| 850780 | DUYET | Đối chiếu VI+EN: tầng máy bay, sắt-niken, laptop/notebook/subnotebook — khớp; Loại khác trần. |
| 850790 | DUYET | Đối chiếu VI+EN: bản cực, mã 8507.10.xx, máy bay, vách ngăn không PVC; cặp .91/.92 khai chongLanVanBan đúng; 'sẵn sàng để sử dụng' không tách mã trong 850790 (vách ngăn chưa sẵn dùng ra ngoài 85.07). Máy tách nhầm 'sẵn sàng' vào danh từ đầu. |
| 850819 | DUYET | Đối chiếu VI+EN: 'Of a kind suitable for domestic use' ⇒ phamViSuDung GIA_DINH; Loại khác trần. |
| 850980 | DUYET | Đối chiếu VI+EN: Floor polishers / Kitchen waste disposers ⇒ tenLoai nguyên văn; Loại khác trần. |
| 850990 | DUYET | Đối chiếu VI+EN: 'Of goods of subheading 8509.80.10' ⇒ dungCho mã; Loại khác trần. |
| 851110 | DUYET | Đối chiếu VI+EN: aircraft engines / motor vehicle engines ⇒ dungCho; Loại khác trần. |
| 851120 | DUYET | Đối chiếu VI+EN: tầng 'động cơ ô tô' + 'Unassembled' ⇒ daLapRap KHONG ở cả hai tầng; khớp. |
| 851130 | DUYET | Đối chiếu VI+EN: như 851120 — tầng động cơ ô tô + Unassembled; khớp. |
| 851140 | DUYET | Đối chiếu VI+EN: tầng 'Other unassembled starter motors' và 'Assembled ... 87.01 to 87.05' (dải mã máy nở) + nhóm 87.xx từng dòng; khớp. |
| 851150 | DUYET | Đối chiếu VI+EN: như 851140 cho alternators; tầng chưa lắp/đã lắp + dải 87.01–87.05; khớp. |
| 851190 | DUYET | Đối chiếu VI+EN: aircraft engines / motor vehicle engines; Loại khác trần. |
| 851390 | DUYET | Đối chiếu VI+EN: .10 đèn thợ mỏ/khai thác đá; .30 HOAC 'reflectors' / 'switch slides of plastics' (plastic chỉ gắn chi tiết trượt) — đúng phạm vi. |
| 851420 | DUYET | Đối chiếu VI+EN: 'for the manufacture of PCB/PWB or PCA' ⇒ congDung ba giá trị; Loại khác trần. |
| 851431 | DUYET | Đối chiếu VI+EN: 'For the manufacture of PCB/PWB or PCA' ⇒ congDung; Loại khác trần. |
| 851432 | DUYET | Đối chiếu VI+EN: như 851431; khớp. |
| 851439 | DUYET | Đối chiếu VI+EN: như 851431; khớp. |
| 851490 | TRA_VE | (A) 851490:85149020 SUY RỘNG: BO_VE 'của lò luyện, nung hoặc lò sấy điện' với lý do 'lặp lại tên nhóm 85.14' là sai — nhóm 85.14 còn 'các thiết bị khác ... để xử lý nhiệt các vật liệu bằng cảm ứng điện hoặc tổn hao điện môi' (8514.40, EN 'other industrial or laboratory equipment for the heat treatment'); chữ dòng 'Parts of industrial or laboratory electric furnaces or ovens for the manufacture of PCB...' chỉ nhận bộ phận của LÒ — bộ phận của thiết bị xử lý nhiệt 8514.40 dùng cho sản xuất mạch in theo chữ vào .90, theo bản nháp lấn sang .20 (MFN 0/0 nhưng sai mã). Cần điều kiện tên lò (tenLoai/dungCho 'lò luyện, nung hoặc lò sấy') thay vì BO_VE. |
| 851539 | DUYET | Đối chiếu VI+EN: 'AC arc welders, transformer type' ⇒ XOAY_CHIEU + kiểu biến thế (hồ quang lặp phân nhóm 8515.3); khớp. |
| 851580 | DUYET | Đối chiếu VI+EN: 'Electric ... for hot spraying of metals or sintered metal carbides' — 'electric' lặp nhóm 85.15; khớp. |
| 851590 | DUYET | Đối chiếu VI+EN: .10 máy hàn hồ quang xoay chiều kiểu biến thế; tầng 'soldering components on PCB/PWB' + wave soldering; BO_VE 'của máy và thiết bị' đúng. |
| 851610 | DUYET | Đối chiếu VI+EN: tầng tức thời/có dự trữ, .11 bình thủy điện gia dụng, .30 kiểu nhúng; khớp. |
| 851640 | DUYET | Đối chiếu VI+EN: 'designed to use steam from industrial boilers' ⇒ dungCho nồi hơi công nghiệp; khớp. |
| 851660 | DUYET | Đối chiếu VI+EN: Rice cookers ⇒ tenLoai nguyên văn; Loại khác trần. |
| 851679 | DUYET | Đối chiếu VI+EN: Kettles ⇒ tenLoai nguyên văn; Loại khác trần. |
| 851779 | TRA_VE | (A) 851779:tiêu đề 8517792 THU HẸP: chữ biểu 'Của thiết bị truyền dẫn, trừ loại dùng cho phát thanh sóng vô tuyến hoặc thiết bị phát truyền hình, HOẶC CỦA loại thiết bị thu xách tay để gọi, báo hiệu hoặc nhắn tin và thiết bị cảnh báo bằng tin nhắn, kể cả máy nhắn tin' (EN 'Of transmission apparatus, other than radio-broadcasting or television transmission apparatus, OR OF portable receivers for calling, alerting or paging and paging alert devices, including pagers') — vế 'thiết bị thu xách tay/cảnh báo/máy nhắn tin' là NHÁNH BAO GỒM (HOAC), bản nháp lại đặt vào mảng PHAI_KHONG cùng phát thanh/truyền hình ⇒ bộ phận máy nhắn tin bị đẩy khỏi tầng .92x (đúng .29, MFN 0) sang tầng 'Loại khác' .99x (vd .92 MFN 5). Cần: HOAC[(dungCho thiết bị truyền dẫn & PHAI_KHONG [phát thanh, phát truyền hình]) / dungCho [thiết bị thu xách tay để gọi, báo hiệu hoặc nhắn tin, thiết bị cảnh báo bằng tin nhắn, máy nhắn tin]]. Máy tách sai: vế '(trừ …)' nuốt luôn 'hoặc của loại thiết bị thu xách tay'. |
| 851821 | DUYET | Đối chiếu VI+EN: 'Box speaker type' ⇒ Loa thùng; Loại khác trần. |
| 851822 | DUYET | Đối chiếu VI+EN: 'Box speaker type' ⇒ Loa thùng; Loại khác trần. |
| 851829 | DUYET | Đối chiếu VI+EN: loa không vỏ (lặp phân nhóm 'Other' sau 8518.21/22), dải 300–3.400 Hz, ĐK ≤50 mm, viễn thông — đủ vế; bảng hiệu chỉnh tiền lệ đã có mục. |
| 851840 | DUYET | Đối chiếu VI+EN: bộ lặp hữu tuyến / trừ hữu tuyến, ≥6 đường tín hiệu đầu vào; BO_VE 'with or without elements' đúng (không giới hạn). |
| 851850 | TRA_VE | (A) 851850:85185020 SUY RỘNG: chữ biểu 'Loại khác, CÓ LOA, loại thích hợp cho phát sóng, có giải điện áp từ 50 V trở lên nhưng không quá 100 V' (EN 'Other, with loudspeakers, of a kind suitable for broadcasting...') — vế 'có loa'/'with loudspeakers' bị BO_VE với lý do 'không có khoá riêng trong tu-vung@2'; bỏ vế này đổi mã: bộ tăng âm phát thanh 50–100 V KHÔNG có loa theo chữ vào .90 (MFN 20), theo bản nháp lấn vào .20 (MFN 10). Thiếu khoá ⇒ phải DỪNG/THIEU_KHOA_TU_VUNG (đề xuất khoá CO_KHONG coLoa), không được BO_VE. |
| 851890 | DUYET | Đối chiếu VI+EN: bộ phận theo mã 8518.10.11/29.20/30.40/40.20, 40.40, 21/22, 29.90 — máy đọc mã; khớp. |
| 851981 | TRA_VE | (A) 851981:85198120 SUY RỘNG: chữ biểu 'Máy ghi âm cassette, CÓ BỘ PHẬN KHUẾCH ĐẠI VÀ MỘT HOẶC NHIỀU LOA, hoạt động chỉ bằng nguồn điện ngoài' (EN 'with built-in amplifiers and one or more built-in loudspeakers') — bản nháp chỉ có tenLoai + chiDungNguonDienNgoai, mất vế khuếch đại + loa ⇒ máy ghi cassette dùng điện ngoài không loa/không khuếch đại theo chữ vào .99 (MFN 20) bị lấn vào .20 (MFN 25); thiếu khoá ⇒ phải DỪNG. Máy tách sai: 'có bộ phận khuếch đại và một hoặc nhiều loa, hoạt động chỉ' bị gộp một vế và báo 'phủ' nhờ chữ 'hoạt động chỉ'. (B) 851981:85198110 SUY RỘNG: chữ biểu 'kích thước không quá 170 mm x 100 mm x 45 mm' — bản nháp chỉ kichThuoc <= 170 mm, bỏ hai chiều 100 mm và 45 mm (khoá kichThuoc có soChieu [2,3]) ⇒ máy ghi bỏ túi 160x120x50 mm theo chữ không vào .10 nhưng bản nháp vẫn nhận. |
| 851989 | DUYET | Đối chiếu VI+EN: .10 cinematographic reproducers, .20 record players, .30 điện ảnh/phát thanh, .40 phần còn lại có tên; chongLanTruc có ví dụ hàng thật (máy quay đĩa dùng phát thanh). |
| 852110 | DUYET | Đối chiếu VI+EN: 'used in cinematography or television broadcasting' ⇒ dungCho; Loại khác trần. |
| 852190 | DUYET | Đối chiếu VI+EN: tầng Laser disc players + điện ảnh/phát thanh truyền hình ở hai tầng; khớp. |
| 852290 | TRA_VE | (A) 852290:85229050 SUY RỘNG: chữ biểu 'Đầu đọc hình hoặc âm thanh, KIỂU TỪ TÍNH; đầu và thanh xoá từ' (EN 'Audio or video reproduction heads, MAGNETIC TYPE; magnetic erasing heads and rods') — bản nháp bỏ 'kiểu từ tính' ⇒ đầu đọc quang (laser pickup) theo chữ vào .93/.99 (MFN 3) bị lấn vào .50 (MFN 0). Máy tách sai: coi 'kiểu từ tính' là danh từ đầu liên hợp ('Đầu đọc hình / âm thanh / kiểu từ tính'). (B) 852290:85229040 điều kiện bịa: tenLoai ['ghi','đọc'] & ['băng video','audio','đĩa compact'] cắt cụm danh từ 'Cơ cấu ghi hoặc đọc băng video hoặc audio và đĩa compact' (EN 'Audio or video tapedecks and compact disc mechanisms') thành từ rời — 'ghi'/'đọc'/'audio' không phải tên hàng; cần tenLoai ['cơ cấu ghi hoặc đọc băng video', 'cơ cấu ghi hoặc đọc băng audio', 'cơ cấu đĩa compact'] hoặc tương đương nguyên văn. |
| 852321 | DUYET | Đối chiếu VI+EN: 'Unrecorded' ⇒ daGhi KHONG; Loại khác trần. |
| 852329 | TRA_VE | (A) 852329:85232961 (và .83, .95) THU HẸP: chữ biểu '... thông qua một máy xử lý dữ liệu tự động; PHƯƠNG TIỆN LƯU TRỮ ĐƯỢC ĐỊNH DẠNG RIÊNG (ĐÃ GHI)' (EN '...; proprietary format storage (recorded) media') — vế sau dấu ';' là NHÁNH THAY THẾ, bản nháp chỉ có ghiMaNhiPhanTuongTac CO & daGhi CO & congDung (AND) ⇒ băng/đĩa từ định dạng riêng đã ghi không tương tác theo chữ vào .61/.83/.95 (MFN 0) bị đẩy xuống .69/.89/.99 (MFN 10/10/0). Các bản 852349/852359/852380 cùng lô đã viết đúng HOAC [.. / tenLoai 'phương tiện lưu trữ được định dạng riêng']. Cổng 5 báo 'phủ' sai cho vế 2. |
| 852349 | DUYET | Đối chiếu VI+EN: tầng laser, 'sound only', nội dung giáo dục…, .14/.93 HOAC có cả vế 'proprietary format storage media'; BO_VE 'binary' đúng vì vế tương tác qua máy XLDL vẫn giữ. |
| 852359 | DUYET | Đối chiếu VI+EN: Proximity cards, tầng chưa ghi, .30 hiện tượng trừ âm thanh/hình ảnh, .40 HOAC có vế 'proprietary format'; khớp. |
| 852380 | DUYET | Đối chiếu VI+EN: Gramophone records, tầng chưa ghi, .91/.92 (.92 HOAC có vế 'proprietary format'); khớp. |
| 852581 | DUYET | Đối chiếu VI+EN: Video camera recorders / Television cameras ⇒ tenLoai nguyên văn; Loại khác trần. |
| 852582 | DUYET | Đối chiếu VI+EN: như 852581; khớp. |
| 852583 | DUYET | Đối chiếu VI+EN: như 852581; khớp. |
| 852610 | TRA_VE | (A) 852610:85261010 SUY RỘNG: chữ biểu 'Ra đa, loại dùng trên mặt đất, hoặc trang bị trên máy bay dân dụng, hoặc CHỈ dùng cho tàu thuyền đi biển' (EN 'or of a kind used SOLELY on sea-going vessels') — bản nháp dungCho ['mặt đất','máy bay dân dụng','tàu thuyền đi biển'] bỏ 'chỉ'/'solely' ⇒ ra đa hàng hải dùng cả cho tàu sông/tàu nội thủy theo chữ vào .90 bị lấn vào .10; ngoài ra BO_VE 'dùng cho tàu thuyền đi biển' thừa (cong5-bo-ve-thua). Máy tách sai: danh từ đầu nuốt 'Ra đa, loại dùng trên mặt đất, hoặc trang bị trên máy bay dân dụng, hoặc chỉ'. Cần HOAC với nhánh tàu biển kèm chiHoacChuYeu CO (hoặc DỪNG nếu khoá không đủ nghĩa 'chỉ'). |
| 852713 | DUYET | Đối chiếu VI+EN: Portable ⇒ loaiXachTay CO; Loại khác trần. |
| 852719 | DUYET | Đối chiếu VI+EN: Portable ⇒ loaiXachTay CO; Loại khác trần. |
| 852721 | DUYET | Đối chiếu VI+EN: 'Capable of receiving and decoding digital radio data system signals' ⇒ congDung; khớp. |
| 852791 | DUYET | Đối chiếu VI+EN: Portable ⇒ loaiXachTay CO; Loại khác trần. |
| 852792 | DUYET | Đối chiếu VI+EN: Mains operated ⇒ nguonNangLuong DIEN_LUOI; Loại khác trần. |
| 852799 | DUYET | Đối chiếu VI+EN: Mains operated ⇒ DIEN_LUOI; Loại khác trần. |
| 852849 | DUYET | Đối chiếu VI+EN: Colour / Monochrome ⇒ mauHienThi MAU / DON_SAC; khớp. |
| 852871 | DUYET | Đối chiếu VI+EN: tầng Set top boxes có chức năng tương tác + Mains operated hai tầng; khớp. |
| 852872 | DUYET | Đối chiếu VI+EN: Battery operated, tầng khác: CRT / LCD-LED-màn hình dẹt; khớp. |
| 852910 | TRA_VE | (A) 852910:85291060 điều kiện cắt sai cụm danh từ: chữ biểu 'Loa hoặc phễu tiếp sóng (ống dẫn sóng)' (EN 'Feed horns (wave guide)') — định ngữ 'tiếp sóng' là CHUNG cho 'loa' và 'phễu'; bản nháp tenLoai ['Loa','phễu tiếp sóng'] tách 'Loa' trơ ⇒ khớp mọi hàng tên 'loa' (loa phát thanh) thay vì 'loa tiếp sóng/feed horn'. Cần ['loa tiếp sóng','phễu tiếp sóng'] hoặc tên nguyên văn cả cụm. |
| 852990 | DUYET | Đối chiếu VI+EN: decoders, camera số, tầng PCB đã lắp ráp + mã 8525.50/60, 8527.xx (máy đọc mã trong chuỗi), tầng 85.28 + màn hình dẹt/TV; khớp. |
| 853310 | DUYET | Đối chiếu VI+EN: 'Surface mounted' ⇒ Điện trở dán; Loại khác trần. |
| 853400 | DUYET | Đối chiếu VI+EN: Single-sided / Double-sided / Multi-layer ⇒ tenLoai nguyên văn; Loại khác trần. |
| 853521 | DUYET | Đối chiếu VI+EN: Moulded case / Earth leakage circuit breaker ⇒ tenLoai; Loại khác trần. |
| 853530 | DUYET | Đối chiếu VI+EN: tầng >1 kV ≤40 kV, disconnectors <36 kV, ≥66 kV — biên ≤/< đúng chữ. |
| 853590 | DUYET | Đối chiếu VI+EN: bushing/tap changer cho biến áp phân phối/nguồn (SEN, không có ngưỡng số), change-over switches khởi động động cơ; khớp. |

## Tổng hợp

- **DUYET + áp dụng: 57** · **TRA_VE: 8** · đỏ: 0 · chờ bảng hiệu chỉnh tiền lệ: 0 · chưa soát: 0.
- Tỉ lệ sai theo PN6: 8/65 = **12,3 %**.
- 14 dòng 8 số bị ảnh hưởng trực tiếp: 85149020, 85177921/29 (+ tầng .9x), 85185020, 85198110, 85198120, 85229040, 85229050,
  85232961/83/95, 85261010, 85291060.
- Các lỗi làm chênh MFN rõ nhất:

  | PN6 | Dòng | MFN theo chữ biểu | MFN theo bản nháp |
  |---|---|---|---|
  | 851850 | 85185020 lấn .90 | .90: 20 % | .20: 10 % |
  | 851981 | 85198120 lấn .99 | .99: 20 % | .20: 25 % |
  | 852329 | 85232961/83 bị đẩy xuống .69/.89 | .61/.83: 0 % | .69/.89: 10 % |
  | 851779 | tầng 8517792 bị đẩy xuống .92 | .29: 0 % | .92: 5 % |
  | 852290 | 85229050 lấn .93/.99 | .93/.99: 3 % | .50: 0 % |

- Sau áp dụng, ba lệnh kiểm đều qua:
  - `check-so-tay`: EXIT=0 (1228 nhóm, 26005 mục, 0 mục không kiểm được nguồn).
  - `check-cay`: EXIT=0.
  - `test-so-tay`: 65/65 passed, EXIT=0.
- Không chạy `bo-kiem-luat --toan-bieu` (theo bổ sung 11/11).

## Máy tách sai và cổng 5 báo "phủ" oan (để Claude chỉnh `lib/ho-so/tach-ve.js`)

1. **852610:85261010**: danh từ đầu nuốt cả vế giới hạn. DAU = "Ra đa, loại dùng trên mặt đất, hoặc trang bị trên máy bay dân dụng,
   hoặc chỉ". Chữ "chỉ" (solely) bị cắt rời khỏi "dùng cho tàu thuyền đi biển".
2. **851779:8517792**: vế "(trừ …)" nuốt luôn nhánh bao gồm đứng sau "hoặc của". Cả cụm "trừ loại dùng cho phát thanh sóng vô tuyến
   hoặc thiết bị phát truyền hình, hoặc của loại thiết bị thu xách tay" bị coi là một vế loại trừ.
3. **852290:85229050**: "kiểu từ tính" bị coi là danh từ đầu liên hợp ("Đầu đọc hình | âm thanh | kiểu từ tính"). Định ngữ
   "xoá từ" trong "đầu và thanh xoá từ" cũng bị coi là danh từ đầu.
4. **851981:85198120**: cụm "có bộ phận khuếch đại và một hoặc nhiều loa, hoạt động chỉ" bị gộp thành một vế, và báo "phủ" chỉ nhờ
   chữ "hoạt động chỉ" của khoá chiDungNguonDienNgoai.
5. **851981:85198110**: vế "170 mm x 100 mm x 45 mm" báo "phủ" dù điều kiện chỉ có một chiều 170 mm.
6. **852329:85232961/83/95**: vế 2 "phương tiện lưu trữ được định dạng riêng (đã ghi)" báo "phủ" dù bản nháp không có nhánh HOAC cho
   nó. Chỉ phần "(đã ghi)" được khoá daGhi phủ.
7. **850790:85079092**: DAU = "Vách ngăn ắc qui, sẵn sàng" (cắt mất "để sử dụng" khỏi "sẵn sàng để sử dụng"). Lỗi này không làm sai mã
   trong 850790 nên vẫn DUYET.
8. **851850:85185020**: tách ra "có loa, loại" và "thích hợp cho phát sóng, có giải", cắt ngang hai cụm "loại thích hợp" và "có giải
   điện áp".
9. **852910:85291060**: máy giữ đúng cả cụm làm một DAU. Lỗi nằm ở người soạn: tách thành giá trị "Loa" trơ, làm mất định ngữ chung
   "tiếp sóng".

## Ghi chú khác

- **Thiếu khoá từ vựng:** 851850 và 851981 cần khoá mới, ví dụ CO_KHONG `coLoa` và `coBoKhuechDai`. Hiện người soạn dùng BO_VE hoặc
  bỏ vế, trong khi đáng lẽ phải DỪNG.
- **Trùng phiên:** bốn bản 850790, 851829, 851981, 852329 do phiên soạn `session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-*` soạn. Phiên này
  trùng phiên điều phối lô soát L28. Công cụ không chặn vì định danh phiên soát khác, nhưng GĐ nên biết khi đánh giá tính độc lập.
  Kết quả: 850790 và 851829 DUYET sau khi đối chiếu đầy đủ; 851981 và 852329 TRA_VE.
- **Khoá "chỉ":** 852349 dùng `chiHoacChuYeu CO` cho "chỉ sử dụng để tái tạo âm thanh", trong khi khoá này mang nghĩa "chỉ hoặc chủ
  yếu". Tôi chấp nhận theo quy ước khoá hiện có, dù nó rộng hơn chữ "only" một chút. Nếu sau này có khoá "chỉ" riêng thì nên soát lại.
