# Tích hợp tra mã HS vào ERP — hợp đồng API và quy tắc hiển thị

Gửi: dev hệ thống quản trị đơn hàng (ERP). Soạn: phiên Claude Code, 29/09/2026.
Căn cứ: sự cố Coca-Cola Mexico ngày 28/09 (ERP hiện 2202.10.20 "nước tăng lực",
"xuất xứ Trung Quốc", "có C/O mẫu E thuế 0%") và phép đo 150 tiêu đề Taobao.

## 1. Vì sao cần tài liệu này

Kết quả sai không nằm ở một mặt hàng mà ở quy trình:

| Khâu | Lỗi | Bên sửa |
|---|---|---|
| Đầu vào | ERP gửi tiêu đề Taobao tiếng Trung; hệ thống tra mã chỉ được xây và đo trên mô tả tiếng Việt kiểu tờ khai | hs-code-api (đã thêm bước "hiểu hàng") |
| Tìm ứng viên | Tiêu đề Trung không khớp chữ nào → ứng viên sai chương (Coca-Cola → cocaine 2939) | hs-code-api |
| Chọn 8 số | AI chọn dòng cụ thể mà mô tả không chứng minh (nước tăng lực) | hs-code-api (kiểm dòng anh em) |
| Hiển thị | ERP hiện gợi ý đầu như "HS tham khảo" kể cả khi AI tự chấm 10/100 | **ERP** |
| Xuất xứ | ERP coi nơi mua (Trung Quốc) là xuất xứ → tự áp C/O mẫu E | **ERP** + hs-code-api (cảnh báo) |
| Mô tả ECUS | Dán tiêu đề tiếng Trung, dịch máy sai nghĩa | hs-code-api (chặn) + **ERP** (không dán tiêu đề thô) |
| Học từ sửa sai | Nhân viên sửa mã nhưng không gửi về, hoặc gửi về mà prod không lưu được | **ERP** + hs-code-api (kho lưu bền) |

## 2. Gọi `/api/suggest`

```http
POST /api/suggest
Authorization: Bearer <HS_API_TOKEN>
{ "description": "<tiêu đề sản phẩm>", "facts": { ... } }
```

- `description`: gửi **nguyên tiêu đề** (tiếng Trung được). Hệ thống tự đổi sang dữ
  kiện tiếng Việt; kết quả đổi nằm ở `queryUnderstanding`.
- Nếu ERP có sẵn **phân loại SKU** (vd "8瓶装带原装纸托 355ml*8瓶"), nối vào sau tiêu đề
  bằng " | ". Nếu nhân viên đã biết chất liệu/công dụng, ghi tiếng Việt vào sau cùng —
  mỗi dữ kiện đúng giúp nhiều hơn mọi chỉnh sửa phía hệ thống.

### Đọc kết quả — theo `status` TRƯỚC, không lấy thẳng `suggestions[0]`

| `status` | Ý nghĩa | ERP hiển thị |
|---|---|---|
| `RESOLVED_BY_TABLE` | Bảng quyết định đã kiểm chứng chốt được mã | Mã + nút "Xác nhận" |
| `REVIEW` | AI chọn trong ứng viên, độ tin ≥ 40 | Mã + độ tin + lý do + 2 mã thay thế; nhân viên xác nhận |
| `NEED_FACTS` | Thiếu dữ kiện để chốt 8 số | Hiện `nextAction.questions` cho nhân viên trả lời, gọi lại với `facts` |
| `NEEDS_EXPERT` | AI không chạy được, **tự tin < 40** (`reasonCode = LOW_CONFIDENCE`), hoặc mã AI chọn **mâu thuẫn có/không** với mô tả, vd nhãn "không có ga" cho hàng có ga (`reasonCode = FEATURE_CONFLICT`, mã mâu thuẫn bị đẩy xuống cuối) | **Không hiện "HS tham khảo"**. Hiện "Cần chuyên viên chọn mã" + danh sách `optionsHs` |
| `NO_CANDIDATES` | Không tìm được ứng viên | Yêu cầu mô tả lại |

Luôn hiện kèm `antiPatternWarnings` (ví dụ `subheading-unsupported`: "mã đòi dấu hiệu
'tăng lực' nhưng mô tả không có") và `confusionAlerts` nếu có.

### Xuất xứ — `originAssessment`

```json
"originAssessment": {
  "detectedOrigin": "MX", "evidence": ["墨西哥"], "confidence": "HIGH",
  "importedIntoChina": true, "acftaApplicable": false,
  "warningVi": "Tiêu đề cho thấy hàng sản xuất tại MX ... không dùng C/O mẫu E ..."
}
```

Quy tắc cho ERP:
1. **Nơi mua ≠ xuất xứ.** Chỉ mặc định xuất xứ Trung Quốc khi `detectedOrigin` là `null`
   và `importedIntoChina` là `false`.
2. `acftaApplicable === false` → **không** hiện "0% có C/O mẫu E", **không** hứa lấy C/O.
   Hiện thuế MFN và `warningVi`.
3. `acftaApplicable === null` kèm `warningVi` → hiện cảnh báo "cần xác minh xuất xứ" trước
   khi báo giá với C/O.

## 3. Gọi `/api/describe` (mô tả khai ECUS)

- Gửi `productName` = tiêu đề gốc (hệ thống tự dịch và giữ bản gốc để kiểm xuất xứ),
  `origin` = xuất xứ **đã xác minh** (không phải "CN" mặc định), cùng `brand`,
  `material`, `purpose` nếu có.
- Không hiện mô tả khi `compliance.warnings` có `CJK_IN_DECLARATION` (còn chữ Hán) hoặc
  `ORIGIN_CONFLICT` (xuất xứ khai khác nước sản xuất trong tiêu đề) — bắt nhân viên sửa.
- Không dán tiêu đề Taobao vào ô mô tả ECUS.

## 4. Gửi lại mã đã sửa — `/api/feedback`

Mỗi khi nhân viên **đổi** mã so với gợi ý (hoặc xác nhận mã ở trạng thái `NEEDS_EXPERT`):

```http
POST /api/feedback
{ "feedbackType": "hs_correction", "productName": "<tiêu đề gốc>",
  "hsCodeAtTime": "<mã hệ thống gợi ý>", "correctedHsCode": "<mã 8 số chốt>",
  "orderCode": "<mã đơn>", "directorNote": "<vì sao>" }
```

- Trả `503 FEEDBACK_NOT_PERSISTED` nghĩa là **chưa lưu** — ERP phải giữ bản ghi và gửi lại.
  Hiện prod chưa có kho lưu bền nên mọi feedback đều rơi vào trường hợp này (xem §5).
- Mã sửa được hs-agent trên VPS gom mỗi ngày: thành bộ đo thật (thay dần bộ tiêu đề tổng
  hợp) và đề xuất bổ sung dữ liệu qua PR có người duyệt.

## 5. Việc phía hạ tầng

- **Kho lưu bền cho feedback** trên prod (Vercel Blob hoặc KV). Chưa có thì vòng học từ
  sửa sai không chạy được.
- Sau khi có feedback thật: nightly J3 trên VPS đo thêm bộ đầu vào ERP, báo Telegram khi giảm.
