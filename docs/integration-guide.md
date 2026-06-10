# Hướng dẫn tích hợp HS Code API — cho dự án backend ngoài

Tài liệu này dành cho developer của `erp-xnk` hoặc bất kỳ hệ thống nào muốn gọi API này.

## Base URL & Auth

```
Base: https://hs-code-api-thangs-projects-4472c6e9.vercel.app

Authorization: Bearer <HS_API_TOKEN>
```

Tất cả endpoint (trừ `/api/health`) đều yêu cầu header này. Token lấy từ Vercel env hoặc hỏi admin.

---

## 1. Xác định mã HS cho 1 sản phẩm

### `POST /api/suggest`

Dùng khi người dùng nhập tên hàng → hệ thống trả về top 3 mã HS gợi ý.

```bash
curl -X POST https://.../api/suggest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Máy bơm nước ly tâm Pentax 1.5HP 220V",
    "options": { "topReranked": 3 }
  }'
```

**Response:**
```json
{
  "suggestions": [
    {
      "hsCode": "84137090",
      "nameVi": "Bơm chất lỏng khác, loại khác",
      "confidence": 88,
      "reasoning": "Máy bơm ly tâm dân dụng, không phải bơm nhiên liệu hay bơm bê tông",
      "girRulesApplied": ["GIR 1", "Chương 84: máy móc cơ khí"],
      "productExamples": ["Máy bơm nước ly tâm 1HP đầu gang", "Bơm tưới tiêu 2HP inox"],
      "learnedPenalty": null
    }
  ],
  "precedentMatches": [...],
  "confusionWarning": null,
  "explanatoryNote": { "summary": "..." },
  "cached": false,
  "ms": 1240
}
```

**Lưu ý ERP:**
- `confidence ≥ 85`: tự động điền mã, chỉ cần user confirm
- `confidence 70–84`: highlight để user review
- `confidence < 70`: yêu cầu user chọn tay
- `cached: true`: kết quả từ cache, `ms` ~0
- `productExamples[]`: chỉ có cho mã "Loại khác" — dùng để user nhận biết đúng nhóm hàng
- `learnedPenalty`: có nghĩa là AI từng gợi sai mã này, đã trừ điểm tự động

---

## 2. Xác định mã HS hàng loạt (nhập PO)

### `POST /api/suggest` với `items[]`

Dùng khi nhập PO có nhiều dòng hàng — gọi 1 lần thay vì N lần.

```bash
curl -X POST https://.../api/suggest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "id": "line-001", "description": "iPhone 15 Pro Max 256GB" },
      { "id": "line-002", "description": "Máy bơm nước Pentax 1.5HP" },
      { "id": "line-003", "description": "Dầu cọ tinh luyện RBD phuy 200L" }
    ],
    "options": { "topReranked": 2 }
  }'
```

**Response:**
```json
{
  "total": 3,
  "truncated": false,
  "results": [
    { "id": "line-001", "suggestions": [...], "ms": 1100 },
    { "id": "line-002", "suggestions": [...], "ms": 950, "cached": true },
    { "id": "line-003", "suggestions": [...], "ms": 1300 }
  ],
  "totalMs": 1400
}
```

**Giới hạn:** tối đa 20 items/request. Nếu PO có nhiều hơn → chia batch.

---

## 3. Tra thuế cho mã HS

### `GET /api/tax?hs=<code>`

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://.../api/tax?hs=84137090"
```

**Response:**
```json
{
  "found": true,
  "hsCode": "84137090",
  "nameVi": "Bơm chất lỏng khác, loại khác",
  "unitVi": "cái",
  "taxNkMfn": 10,
  "taxNkAcfta": 0,
  "taxVat": 10,
  "taxBvmt": null,
  "taxXkTt": 0,
  "policyByHs": "Kiểm tra chất lượng (32/2023/TT-BKHCN)",
  "hasPolicyWarning": true,
  "warnings": ["Cần chứng nhận hợp quy trước khi thông quan"]
}
```

**Lưu ý:**
- Response được cache `public, max-age=86400` — ERP có thể giữ kết quả 24h
- `hasPolicyWarning: true` → hiển thị cảnh báo cho NV kế toán
- `policyByHs` → raw text policy, dùng để tra chi tiết ở `/api/tax-enriched` (xem mục 4)

---

## 4. Tra chi tiết chính sách kiểm tra chuyên ngành

### `GET /api/tax?hs=<code>` (trường `warnings`)

Thông tin policy được parse sẵn trong response tax:

```json
{
  "warnings": {
    "requiresLicense": false,
    "requiresInspection": true,
    "inspectionTypes": ["chat-luong"],
    "requiresQuarantine": false,
    "dualUseControl": false,
    "ministries": ["BKHCN"],
    "legalDocs": [
      { "code": "32/2023/TT-BKHCN", "type": "Thông tư", "year": 2023, "issuer": "BKHCN" }
    ],
    "summary": "Hàng hóa thuộc nhóm phải kiểm tra chất lượng nhập khẩu.",
    "severity": "MEDIUM"
  }
}
```

**Mapping severity → UX:**
| severity | Màu | Hành động ERP |
|----------|-----|---------------|
| `HIGH` | 🔴 Đỏ | Block nhập, yêu cầu giấy phép trước |
| `MEDIUM` | 🟡 Vàng | Cảnh báo NV, cần chuẩn bị hồ sơ kiểm tra |
| `LOW` | 🟢 Xanh | Ghi chú, không block |

---

## 5. Sinh mô tả khai báo Hải quan (TT 39/2018)

### `POST /api/describe`

Dùng khi NV cần soạn mô tả hàng hóa cho tờ khai.

```bash
curl -X POST https://.../api/describe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hsCode": "84137090",
    "productName": "Máy bơm nước ly tâm",
    "brand": "Pentax",
    "model": "CM50",
    "origin": "IT",
    "technicalSpec": "Công suất 1.5HP, điện áp 220V/50Hz, lưu lượng 3m³/h",
    "condition": "Mới 100%"
  }'
```

**Response:**
```json
{
  "declaration": {
    "tenHang": "Máy bơm nước ly tâm",
    "nhanHieu": "Pentax",
    "model": "CM50",
    "xuatXu": "Italia",
    "tinhTrang": "Mới 100%",
    "donViTinh": "cái",
    "thongSoKyThuat": ["Công suất: 1.5HP", "Điện áp: 220V/50Hz", "Lưu lượng: 3m³/h"],
    "congDung": "Bơm nước sinh hoạt và tưới tiêu"
  },
  "customsDescription": "Máy bơm nước ly tâm, nhãn hiệu Pentax, model CM50, xuất xứ Italia, mới 100%, công suất 1.5HP, điện áp 220V/50Hz, lưu lượng 3m³/h, dùng bơm nước sinh hoạt và tưới tiêu",
  "compliance": {
    "score": 92,
    "level": "PASS",
    "warnings": []
  },
  "ms": 890
}
```

**ERP dùng `customsDescription`** để điền vào ô "Mô tả hàng hóa" trên phần mềm khai báo.

---

## 6. Tra sản phẩm ví dụ cho mã Loại khác

### `GET /api/products?hs=<code>`

Khi user không chắc mã "Loại khác" có đúng không — show ví dụ thực tế.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://.../api/products?hs=84137090&limit=5"
```

**Response:**
```json
{
  "found": true,
  "hsCode": "84137090",
  "isLoaiKhac": true,
  "productCount": 10,
  "potential": "saturated",
  "products": [
    "Máy bơm ly tâm đầu gang 1HP",
    "Bơm tưới tiêu trục đứng 2HP inox",
    "Máy bơm nước giếng khoan 0.5HP",
    "Bơm tuần hoàn nước nóng Grundfos UP20-14"
  ]
}
```

**Batch:**
```bash
GET /api/products?hs=84137090,84136090,84138190
```

---

## 7. Tra chú giải / cảnh báo nhầm lẫn

### `GET /api/conflicts?hs=<code>`

Kiểm tra mã HS có dễ nhầm không trước khi chốt.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://.../api/conflicts?hs=84137090"
```

**Response (nếu có rủi ro):**
```json
{
  "found": true,
  "hsCode": "84137090",
  "riskLevel": "MEDIUM",
  "confusedWith": ["84136090", "84139190"],
  "reasonsVi": ["Bơm gia dụng vs công nghiệp — phân biệt bằng công suất và điện áp"]
}
```

---

## 8. Accuracy & Monitoring

### `GET /api/accuracy`

Xem AI đang chính xác thế nào (từ feedback thực tế của director).

```bash
curl -H "Authorization: Bearer $TOKEN" "https://.../api/accuracy"
```

```json
{
  "totalFeedback": 145,
  "overrides": { "total": 23, "approved": 18, "rejected": 5 },
  "overrideRate": 15.9,
  "estAccuracy": 78.3,
  "topWrongCodes": [
    { "hsCode": "84137090", "count": 3 }
  ]
}
```

### `GET /api/errors`

Lỗi production gần nhất (chỉ admin).

---

## 9. Quy trình tích hợp đề xuất cho ERP

```
Người dùng nhập tên hàng
        ↓
POST /api/suggest { description }
        ↓
  confidence ≥ 85?
  ├─ YES → Tự điền hsCode, hiển thị confirm button
  └─ NO  → Hiển thị dropdown 3 gợi ý, user chọn
        ↓
GET /api/tax?hs=<code>
  ├─ hasPolicyWarning = true?
  │     └─ Hiển thị banner cảnh báo + warnings[].summary
  │         severity=HIGH → block, yêu cầu upload giấy phép
  └─ Không có policy → tiếp tục bình thường
        ↓
(Khi cần khai báo) POST /api/describe { hsCode, productName, ... }
        ↓
Điền customsDescription vào tờ khai
```

---

## 10. Error Handling

| HTTP Status | Ý nghĩa | Xử lý |
|-------------|---------|-------|
| `200` | OK | Dùng data |
| `400` | Thiếu param | Fix request |
| `401` | Sai/thiếu token | Check env `HS_API_TOKEN` |
| `404` | Mã HS không tồn tại | Báo user mã không hợp lệ |
| `503` | Gemini API chưa cấu hình | Liên hệ admin |
| `502` | Suggest/describe lỗi tạm thời | Retry sau 3s (max 2 lần) |

**Retry pattern cho ERP:**
```javascript
async function suggestWithRetry(description, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    const res = await fetch('/api/suggest', { ... });
    if (res.ok) return res.json();
    if (res.status === 502 && i < maxRetries) {
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    throw new Error(`Suggest failed: ${res.status}`);
  }
}
```

---

## 11. Caching khuyến nghị phía ERP

| Endpoint | Server cache | ERP nên cache thêm |
|----------|-------------|-------------------|
| `/api/tax` | 24h (CDN) | Session (same PO tab) |
| `/api/products` | 7 ngày | Có thể localStorage 1 ngày |
| `/api/suggest` | 5 min (private) | Không cache — personalized |
| `/api/conflicts` | 24h | Session |
| `/api/accuracy` | Không cache | Không cache |

---

## Env variables cần thiết (Vercel)

```bash
HS_API_TOKEN=<secret>          # Bearer token cho ERP
GEMINI_API_KEY=<key>           # Bắt buộc cho /api/suggest và /api/describe
OPENROUTER_API_KEY=<key>       # Fallback LLM khi Gemini lỗi (nên có)
SENTRY_DSN=<dsn>               # Optional error monitoring
HS_MATCH_PUBLIC=false          # true = /api/match không cần token
```
