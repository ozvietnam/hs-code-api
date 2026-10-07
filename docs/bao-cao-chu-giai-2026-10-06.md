# Báo cáo độ đầy đủ dữ liệu chú giải HS — 06/10/2026

CEO hỏi: "Có báo cáo chỉ ra dữ liệu chú giải chưa đầy đủ không? Trả lời thiếu còn nguy hại hơn không trả lời."

Báo cáo trước (`docs/phe-binh-2026-09-24.md`, mục C10) chỉ ghi "chú giải chi tiết còn thiếu 36% nhóm", tức là đếm
những nhóm **có hay không có** mục chú giải. Lần đo này kiểm cả **nội dung** của từng mục, và phát hiện thêm nhiều nhóm có
mục nhưng nội dung bị cắt.

## 1. Kết quả đo

| Dữ liệu | Tình trạng | Hậu quả khi trả lời |
|---|---|---|
| `chu-giai-heading.json`, phần thuyết minh nhóm (`nhom`) | **545/1.269 nhóm bị cắt ở 2.000 ký tự khi nhập**. Ví dụ 8471 dừng giữa câu "…bằng quyết định lôgic trong". Cùng giới hạn này có trong `legal-notes-enriched.json` (676 mã), nên không lấy lại được từ dữ liệu sẵn có | Phần cuối chú giải chi tiết thường là các trường hợp **loại trừ**; phần này đang không có |
| Như trên | **62 nhóm trống**: 2931, 6208, 6702, 7106–7118 (kim loại quý), 8481 (van), 8482 (ổ bi), 8485, 8607, 8706, và nhóm 98xx | Không có căn cứ chú giải cho các nhóm hay gặp |
| Danh sách "không bao gồm / loại trừ" | **403 nhóm** (ngoài chương 98) không có cả hai mục | Không kiểm được hàng có bị loại khỏi nhóm không |
| `chu-giai-chuong.json` | Chương **52 và 81 trống**, trong khi HS có chú giải phân nhóm cho hai chương này. Chương 50, 53 đúng là không có; chương 98 là chương quốc gia | Thiếu căn cứ cấp chương |
| `notes.json` | Thiếu 5 chương (50, 52, 53, 81, 98). Chương 75–80 đã có nguồn dự phòng | — |
| `explanatory-notes.json` (8 số) | 8.203/11.871 mã (69%), chỉ là trích đoạn "bao gồm" | Tham khảo, không đủ làm căn cứ |
| Phiên bản | Nguồn ghi **"Chú giải HS 2017"**, trong khi biểu thuế hiện hành theo **HS 2022** | Các nhóm sửa năm 2022 có thể lệch |

Tổng cộng **842/1.269 nhóm (66%)** có ít nhất một lỗ hổng chú giải.

## 2. Đã sửa hôm nay: câu trả lời phải tự nói là thiếu

`lib/notes-coverage.js` kiểm tra từng mã và trả về `notesCoverage = { complete, gaps[], caveats[] }`:

- **`/api/notes`**: thêm trường `coverage`.
- **`/api/classify`, `/api/suggest`**: thêm `notesCoverage` cho mã đầu. Khi thiếu, thêm cảnh báo `notes-incomplete`
  vào `antiPatternWarnings`: "Căn cứ chú giải cho 84713020 chưa đầy đủ: …", kèm cách xử lý "đối chiếu Chú giải chi tiết
  bản đầy đủ trước khi chốt mã hoặc dùng làm căn cứ giải trình".

ERP nên hiển thị cảnh báo này. Gặp `notesCoverage.complete = false` thì không được coi gợi ý là căn cứ đầy đủ.

## 3. Việc còn phải làm để dữ liệu đủ

1. **Nhập lại toàn văn Chú giải chi tiết HS bản tiếng Việt, không cắt độ dài.** Tìm lại nguồn đã nhập
   (`nguon`: "TT31/2022/TT-BTC — … Chú giải HS 2017") và bỏ giới hạn 2.000 ký tự. Đây là việc ưu tiên số 1, vì nó vá
   545 nhóm cùng lúc.
2. Bổ sung 62 nhóm trống, chú giải chương 52 và 81.
3. Đối chiếu sửa đổi HS 2022 cho các nhóm có thay đổi (ví dụ 8485, 8524, 8549).
4. Sau khi nhập lại, `scripts/test-notes-coverage.mjs` sẽ cho thấy số nhóm thiếu giảm. Nên thêm ngưỡng tối thiểu vào test
   để dữ liệu không bị thụt lùi.

## 4. Cập nhật 07/10/2026: đã nhập lại toàn văn

Nguồn: Google Drive của CEO, thư mục "chú giải Hs code 2017" (5 tập PDF, 1.823 trang). Công cụ:
`scripts/import-chu-giai-pdf.py` (PDF không commit; tải về rồi chạy, xem đầu tệp).

| | Trước (06/10) | Sau (07/10) |
|---|---|---|
| Nhóm có toàn văn (`nhom_day_du`) | 0 | **1.194** |
| Nhóm còn thiếu (ngoài chương 98) | 842/1.269 | **32/1.228** |
| Chương trống | 52, 81 | không còn |

Cách kiểm chéo từng nhóm trước khi ghi đè:

- **1.113 nhóm**: phần đầu, giữa và cuối của bản cũ đều có trong bản PDF của chính nhóm đó, nên ghi đè bằng toàn văn.
- **76 nhóm**: bản cũ bị gán nhầm (là chữ của nhóm hoặc chương khác), nên thay bằng bản PDF đúng nhóm. Ví dụ:
  - 2530 cũ là chú giải 32.06; 3702 cũ là 73.02; 8480 cũ là 84.82; 0711 cũ là 20.05;
  - 8484 cũ là chú giải máy in 3D (84.85 HS 2022);
  - 2716 cũ là chú giải Phần VI;
  - nhóm cuối mỗi chương cũ kéo luôn chú giải chương sau.
- **5 nhóm trống** được điền mới: 2931, 6702, 8481, 8482, 8607.
- **10 nhóm giữ bản cũ**: 1509, 1510, 1605, 2817, 2942, 3822, 7019, 8462, 9508, 9705. Bản cũ ở đây là câu chữ khác hẳn PDF 2017, khớp với các nhóm WCO sửa đổi năm 2022. Đè bản 2017 lên sẽ là thụt lùi. Các nhóm này vẫn bị cắt ở 2.000 ký tự và vẫn được báo thiếu.

Còn thiếu, và câu trả lời vẫn tự báo thiếu:

- **71.06–71.18** (kim loại quý): tập 3 của PDF dừng ở 71.05.
- **6208, 8536, 8706**: PDF không có dòng mở nhóm.
- **Nhóm mới của HS 2022** (2404, 3827, 8485, 8524, 8549, 8806, 8807): bản 2017 không có.
- **Nguồn vẫn là HS 2017.** Cần bản Chú giải chi tiết HS 2022 tiếng Việt để đối chiếu các nhóm sửa đổi.
- Thư mục Drive còn có "Chú giải bổ sung SEN 2022" (AHTN, CV 3866/TCHQ-TXNK). Bản này dùng cho phân nhóm 8 số ASEAN, sẽ nhập riêng vào trường `sen`.

`scripts/test-notes-coverage.mjs` đặt ngưỡng tối thiểu 1.150 nhóm có toàn văn, để dữ liệu không thụt lùi.

## 5. Cập nhật 07/10/2026 chiều: nhập bản HS 2022 toàn tập

Nguồn: "Chu giai HS 2022 Toan tap (HQKV8).pdf" (2.409 trang, 24 MB) trong thư mục Drive "chú giải hs code 2022".
Lệnh: `python3 scripts/import-chu-giai-pdf.py <thư-mục> --ban 2022 --write`.

**Cách làm với tệp nặng.** Không cần cắt PDF thành nhiều tệp nhỏ. Bộ nhập đọc lần lượt từng trang rồi tách theo chương → nhóm. Mỗi nhóm được kiểm chéo riêng với bản 2017 đã nhập, và một nhóm hỏng không kéo theo nhóm khác. Toàn bộ chạy khoảng 1 phút.

| | Sau nhập bản 2017 (sáng) | Sau nhập bản 2022 |
|---|---|---|
| Nhóm có toàn văn (ngoài ch.98) | 1.194, bản 2017 | **1.228/1.228, bản 2022** |
| Nhóm còn báo thiếu | 32 | **0** |
| Chương có chú giải bản 2022 | 0 | 96 |

Kiểm chéo từng nhóm:

- **1.191 nhóm** có câu chữ giống bản 2017.
  - Trong đó có 1509, 1510, 2404, 8524, 8549… Câu chữ cũ của các nhóm này khớp bản 2022, xác nhận nhận định buổi sáng rằng đó là chữ sửa đổi năm 2022.
- **18 nhóm** có câu chữ khác bản 2017: sửa đổi năm 2022 hoặc dịch lại. Ví dụ 8548: phế liệu pin chuyển sang nhóm mới 85.49.
- **19 nhóm trước đây trống** nay có chú giải: 71.06–71.18, 8485 (in 3D), 3827, 6208, 8706, 2942, 0309.
- **6 nhóm bộ chặn nghi ngờ, soát tay xác nhận bản 2022 đúng:** 6204, 6207, 6208, 3826, 8548, 8706.
  - Bản 2017 của 6207 và 3826 bị tách tràn sang 6208 và chú giải Phần VII. Bản 2022 sửa cả hai.

Lỗi đánh máy trong bản PDF 2022, bộ nhập đã tự xử lý:

- "Chuong 33" không dấu;
- "37.02-" thay cho 73.02, "90.20" thay cho 90.29;
- "8706 -" thiếu dấu chấm, "(96.08 -" có ngoặc;
- phân nhóm "9420.10" thay cho 9402.10. Mã chỉ được sửa sang mã nhóm có thật.

`lib/notes-coverage.js` bỏ lưu ý "bản HS 2017" với các nhóm đã là bản 2022. Test kiểm:

- mọi nhóm có bản 2022;
- không nhóm nào lẫn chú giải Phần hoặc chương sau;
- nhóm mới HS 2022 và 71.06–71.18 có chú giải.

Còn lại: SEN 2022 (chú giải bổ sung ASEAN cho mã 8 số) chưa nhập vào trường `sen`.
