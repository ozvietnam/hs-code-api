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
