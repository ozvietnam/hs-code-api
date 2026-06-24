# Hướng dẫn onboarding — NV customs mới

> Đọc tài liệu này lần đầu để tự dùng được hệ thống tra HS code + thuế mà không cần hỏi thêm.

---

## 1. Hệ thống là gì?

`hs-code-api` là backend tra cứu HS code & thuế cho ERP `erp-xnk`. Nó cung cấp:

| Chức năng | Mô tả |
|---|---|
| **Gợi ý HS code** | Nhập mô tả hàng → AI trả top-3 mã HS phù hợp |
| **Tra thuế** | Nhập mã HS → thuế NK/MFN/ACFTA/VAT + cảnh báo chính sách |
| **Mô tả khai báo** | Nhập HS + thông tin hàng → mô tả chuẩn TT39/2018 |
| **Tiền lệ Oz** | Xem lịch sử khai báo tương tự của Oz |

Trong ERP, tất cả tính năng này hiển thị trong **HsTaxDialog** khi NV nhập HS code cho đơn hàng.

---

## 2. Dùng nhanh trong ERP

### 2.1 Tra gợi ý HS code

Trên đơn hàng → tab **Khai báo HQ** → bấm **Gợi ý HS** → nhập mô tả hàng hóa.

**Kết quả trả về:**
```
[92%] 85171300 — Điện thoại thông minh
  Reasoning: "iPhone là smartphone, chapter 85 thiết bị điện tử hoàn chỉnh — GIR 1"
  ⚠ Tiền lệ khai của Oz (không phải phán quyết hải quan)

[78%] 84713000 — Máy tính xách tay
  ...
```

**Lưu ý quan trọng:**
- `confidence` là độ tin cậy của AI, **không phải** xác nhận của hải quan
- Luôn đối chiếu với biểu thuế NK hiện hành trước khi chốt mã
- Nếu có cảnh báo đỏ (chính sách, giấy phép) — đọc kỹ phần policy

### 2.2 Tra thuế nhanh

Biết mã HS rồi → gõ trực tiếp vào field HS code → hệ thống tra tự động.

**Kết quả tra thuế (ví dụ `85171300`):**
```
Thuế NK TT:    10%
Thuế NK MFN:   0%
Thuế ACFTA:    0%
Thuế VAT:      10%

Cảnh báo chính sách:
  [HIGH] Kiểm tra chất lượng (KTCL) — Bộ TTTT
  [HIGH] Sản phẩm mật mã dân sự — Bộ CA
```

### 2.3 Đọc cảnh báo chính sách

| Severity | Ý nghĩa |
|---|---|
| **CRITICAL** | Cấm nhập / yêu cầu đặc biệt — liên hệ CEO ngay |
| **HIGH** | Cần giấy phép / kiểm tra trước thông quan |
| **MEDIUM** | Cần thủ tục bổ sung sau thông quan |
| **LOW** | Lưu ý thông thường |

**Thủ tục phổ biến:**
- `ATTP` — Kiểm tra an toàn thực phẩm (BYT/BCT/BNNPTNT), 3-15 ngày
- `KIEM-DICH-THUC-VAT` — Kiểm dịch thực vật, 1-5 ngày
- `CHAT-LUONG` — Kiểm tra chất lượng hàng hóa nhóm 2
- `GP-NK` — Yêu cầu giấy phép nhập khẩu

---

## 3. Tra thủ công qua API

Nếu cần tra nhanh không qua ERP:

```bash
# 1. Lấy token từ CEO
export TOKEN="your_token_here"
export BASE="https://hs-code-api-thangs-projects-4472c6e9.vercel.app"

# 2. Tra thuế
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/tax?hs=85171300"

# 3. Gợi ý HS code
curl -s -X POST "$BASE/api/suggest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "iPhone 15 Pro Max 256GB"}'

# 4. Kiểm tra service up
curl -s "$BASE/api/health"
```

---

## 4. Admin Dashboard

Truy cập `/admin/` (cần Bearer token):

| Trang | Chức năng |
|---|---|
| `/admin/` | Tổng quan: tổng mã HS, coverage, phiên bản |
| `/admin/feedback.html` | Xem feedback director, phê duyệt sửa mã |
| `/admin/kpi.html` | ML KPI: override rate, latency, confidence phân phối |
| `/admin/tariff.html` | Quản lý phiên bản biểu thuế, diff 2 phiên bản |
| `/admin/browse.html` | Duyệt HS theo chương |
| `/admin/edit.html` | Sửa data HS (admin) |

---

## 5. Quy trình feedback

Khi director sửa mã HS của NV:
1. ERP tự động gọi `POST /api/feedback` với `feedbackType: DIRECTOR_HS_OVERRIDE`
2. Feedback lưu vào `data/feedback.jsonl`
3. Admin review tại `/admin/feedback.html`
4. Nếu approve → tự động thêm vào `pattern-promotions.jsonl` để hệ thống học

**Xem pattern lặp lại nhiều lần:**
```
GET /api/admin/suggestions
```
Trả về các cặp HS bị sửa nhiều lần (≥3 lần) — đây là gợi ý cập nhật knowledge base.

---

## 6. Câu hỏi thường gặp

**Q: Tại sao AI gợi ý sai mã?**
A: Kiểm tra mô tả hàng có đủ đặc điểm khu biệt không (chất liệu, công dụng, thương hiệu). Mô tả mơ hồ → AI không phân loại được chính xác. Gửi feedback để hệ thống học.

**Q: Có thể tin vào `confidence` 90% không?**
A: Confidence phản ánh độ tương đồng với tiền lệ của Oz và GIR rules — **không phải** xác nhận hải quan. Luôn cần NV xem xét trước khi chốt.

**Q: Mã HS có cảnh báo [HIGH] thì làm gì?**
A: Đọc phần `policyProcedures` trong response để biết: cần giấy phép gì, nộp ở đâu, mất bao nhiêu ngày, chi phí ước tính. Chuẩn bị hồ sơ trước khi hàng về.

**Q: Biểu thuế update thế nào?**
A: Admin chạy `npm run data:upload-xlsx` cục bộ → commit → push → Vercel auto-deploy. Xem `/admin/tariff.html` để diff 2 phiên bản.

**Q: Service down thì làm gì?**
A: Gọi `GET /api/health` kiểm tra. Nếu 503 → liên hệ CEO. Trong thời gian chờ, tra biểu thuế thủ công tại `ecus.customs.gov.vn`.
