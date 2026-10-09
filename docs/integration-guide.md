# Hướng dẫn tích hợp HS Code API — cho dự án backend ngoài

Tài liệu này dành cho developer của `erp-xnk` hoặc bất kỳ hệ thống nào muốn gọi API này.

## Base URL & Auth

```
Base: https://hs-kb.uythacnhapkhau.com

Authorization: Bearer <HS_API_TOKEN>   # chỉ cần cho quản trị / ghi dữ liệu
```

**Không cần token** (09/10/2026): nhóm tra cứu (GET) và 4 endpoint AI `suggest`, `describe`, `classify`, `match`
(không giới hạn lượt; đóng khẩn cấp bằng `HS_PUBLIC_LLM=false`). **Cần token**: `feedback`, `tariff` admin, dashboard
`admin_*`, `kpi`, `error_log`, `extract-specs`, `declaration-sheet`. ERP vẫn gửi token như cũ — gửi thừa không bị lỗi.
Token lấy từ biến môi trường của server hoặc hỏi admin.

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
      "productExamples": ["Máy bơm nước ly tâm 1HP đầu gang", "Bơm tưới tiêu 2HP inox"],
      "learnedPenalty": null
    }
  ],
  "girRulesApplied": [
    {
      "rule": "GIR 6",
      "ruleKey": "6",
      "titleVi": "Phân loại ở cấp phân nhóm",
      "textVi": "Việc phân loại ở cấp phân nhóm được xác định theo nội dung của phân nhóm...",
      "basis": "DETERMINISTIC",
      "confidence": "high",
      "reasonVi": "Kết quả được chọn ở cấp phân nhóm giữa nhiều phân nhóm cùng nhóm 4 số...",
      "evidence": { "heading": "8413", "subheadingsCompared": ["84137090", "84138190"], "picked": "84137090" },
      "source": "WCO General Interpretative Rules"
    }
  ],
  "girDisclaimer": "Trích dẫn GIR là căn cứ tham khảo do hệ thống suy ra, KHÔNG phải phán quyết...",
  "rankingSignals": [
    { "signal": "specificity_filter", "effect": "loại 2 ứng viên...", "note": "Ước lượng — CHƯA đối chiếu nguyên văn nhóm." }
  ],
  "chapterGuidance": [
    { "chapter": "84", "titleVi": "Máy móc cơ khí", "hints": [...], "requiredAttributes": [...] }
  ],
  "precedentMatches": [...],
  "confusionWarning": null,
  "explanatoryNote": { "summary": "..." },
  "cached": false,
  "ms": 1240
}
```

### ⚠️ Thay đổi hợp đồng `girRulesApplied` (2026-09)

Trước đây trường này chứa **checklist dữ kiện theo chương**, dù tên gọi là "GIR
rules applied" — và tài liệu thì mô tả nó là mảng chuỗi. Cả hai đều không khớp
code. Nay đã tách bạch:

| Trường | Nội dung | Dùng để |
|---|---|---|
| `girRulesApplied[]` | Trích dẫn quy tắc GIR **có căn cứ**, mỗi mục kèm `basis` + `evidence` + `source` | Audit trail, hồ sơ giải trình Hải quan |
| `girDisclaimer` | Cảnh báo pháp lý bắt buộc hiển thị kèm | Bảo vệ người khai |
| `rankingSignals[]` | Tín hiệu xếp hạng kỹ thuật (heuristic) | Debug, KHÔNG dùng làm căn cứ pháp lý |
| `chapterGuidance[]` | Checklist dữ kiện theo chương (nội dung cũ của `girRulesApplied`) | Nhắc NV nhập thiếu thông tin gì |

**Đọc `basis` trước khi tin:**

| basis | Nghĩa | Đưa vào hồ sơ giải trình? |
|---|---|---|
| `RULE_TABLE` | Bảng quyết định do người soạn, có dẫn văn bản gốc | ✅ Được |
| `DETERMINISTIC` | Code suy ra từ tín hiệu chắc chắn | ✅ Được |
| `HEURISTIC` | Dò từ khoá / điểm ước lượng | ⚠️ Cần người kiểm chứng |
| `LLM_ASSERTED` | Mô hình tự khai, chưa kiểm chứng | ❌ Không |

ERP nên hiển thị `basis` ngay cạnh mỗi trích dẫn — người khai phải biết chỗ nào
chắc, chỗ nào cần tự xác minh trước khi ký tờ khai.

**Lưu ý ERP:**
- **KHÔNG tự động điền mã theo `confidence`.** `confidence` là con số mô hình AI
  tự khai cộng điểm thưởng, CHƯA hiệu chuẩn: trên 200 tờ khai thật, nhóm 90–99
  điểm chỉ đúng 16%. Luôn hiển thị 3 gợi ý và để người khai chọn/xác nhận.
- `engine: "deterministic"` + `degraded: true`: AI lỗi hoặc mọi mã AI trả đều
  bị loại — gợi ý là thứ tự tìm kiếm, `confidence: null`. Bắt buộc người có
  chuyên môn chọn.
- `llmRejectedCodes[]`: mã AI trả nhưng không có trong biểu thuế / ngoài danh
  sách ứng viên — đã bị loại, chỉ để minh bạch.
- `status` + `nextAction`: đọc trước tiên — `NEED_FACTS` / `REVIEW` /
  `RESOLVED_BY_TABLE` / `NEEDS_EXPERT` / `NO_CANDIDATES` (xem AGENTS.md mục 4).
  `rejectedFacts[]`: câu trả lời không quy đổi được, kèm `optionsVi` để hỏi lại.
- `missingFacts[]`: hỏi người dùng đúng các câu `questionVi`, rồi gọi lại
  `/api/suggest` với cùng `description` + `facts: { <attribute>: <giá trị> }`.
- `cached: true`: kết quả từ cache, `ms` ~0
- `productExamples[]`: chỉ có cho mã "Loại khác" — tên hàng THẬT từ tờ khai (có thể rỗng).
  `productExamplesGenerated[]`: câu máy sinh, chưa kiểm chứng — hiển thị kèm nhãn "ví dụ tham khảo"
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

### `GET /api/tax?hs=<code>[&origin=CN]`

```bash
curl "https://.../api/tax?hs=10019911&origin=CN"
```

**Response (rút gọn):**
```json
{
  "found": true,
  "hsCode": "10019911",
  "nameVi": "- - - - Meslin (SEN)",
  "unitVi": "kg",
  "taxNkTt": "5",
  "taxNkPreferential": "0",
  "taxAcfta": "0 (-CN)",
  "taxAcftaChina": { "origin": "CN", "eligible": false, "rate": null,
                     "noteVi": "Hàng xuất xứ CN KHÔNG được hưởng mức ACFTA 0% (\"0 (-CN)\") — áp MFN." },
  "taxVat": "*/5/8/10",
  "acfta": {
    "raw": "0 (-CN)", "available": true, "rate": 0, "excludedCountries": ["CN"],
    "needsReview": false,
    "forOrigin": { "origin": "CN", "eligible": false, "rate": null, "noteVi": "..." }
  },
  "policyByHs": "Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)",
  "hasPolicyWarning": true
}
```

**Lưu ý:**
- **ĐỪNG đọc số đầu của `taxAcfta`.** Chuỗi `"0 (-CN)"` nghĩa là nước trong
  ngoặc KHÔNG được hưởng mức đó — 510 dòng loại trừ đích danh Trung Quốc. Dùng
  `acfta.forOrigin` (theo `?origin=`, mặc định `CN`) hoặc `taxAcftaChina`:
  - `eligible: false` → áp MFN (`taxNkPreferential`), không dùng C/O mẫu E
  - `eligible: null` → biểu gốc có nhiều mức cho mã này, tra dòng 10 số trước khi khai
  - `higherThanMfn: true` → ACFTA cao hơn MFN, nên khai MFN
- `taxAcftaChina` cũng có trong kết quả `/api/search` và `/api/suggest`.
- Mã chương 98 có thêm `mappedHs` — mã hàng tương ứng tại Mục I; VAT, chính
  sách và tên tiếng Anh theo mã đó.
- Response được cache `public, max-age=86400` — ERP có thể giữ kết quả 24h
- `hasPolicyWarning: true` → hiển thị cảnh báo cho NV kế toán
- `policyByHs` → raw text policy; bản đã phân tích nằm ở trường `warnings` (mục 4)

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

## 5b. Phiếu hồ sơ khai báo (thông số trang + chữ trong ảnh → ô cần khai)

`POST /api/declaration-sheet` (Bearer). Gom việc **chọn thông tin cho tờ khai** về một chỗ:
ô chung TT 39/2018 (công dụng, chất liệu, kích thước, nhãn hiệu, model) + ô theo nhóm hàng
(339 nhóm 4 số). Dịch vụ không lưu gì — bên gọi lưu phiếu của từng món.

```bash
curl -X POST "$BASE/api/declaration-sheet" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "titleZh": "86型墙壁暗装电源插座带开关",
  "specsZh": [{"key":"材质","value":"锡磷青铜"},{"key":"额定电流","value":"10A"}],
  "variant": [{"label":"Phân loại","value":"一开多功能八孔"}],
  "imageTexts": [{"url":"https://img/9.jpg","text":"产品规格 面板材质\n86mm*86mm PC阻燃"}],
  "hsCode": "85366932",
  "supplements": [{"key":"voltage","valueVi":"250V","source":"DOCUMENT"}]
}'
```

Trả về:
- `fields[]` — mỗi ô: `valueVi`, `status` (`HAVE` | `UNVERIFIED` máy đọc từ ảnh nhưng chưa soát |
  `UNTRANSLATED` | `MISSING`), `source` (`SITE` | `IMAGE_OCR` | người bổ sung), `evidence` (đoạn chữ + link ảnh).
- `missing[]` — ô bắt buộc còn thiếu, kèm `questionVi` / `questionZh` để hỏi khách / shop.
- `images[]` — ảnh nào có thông số (`used`), ảnh nào bị gạt (quảng cáo, giới thiệu thương hiệu, chính sách shop).
- `trademark` — nhãn hiệu, rủi ro nhãn được bảo hộ (TT 13/2015 & 13/2020), chữ gợi hàng nhái trên tên hàng (高仿, 原单, 同款…).
- Có `hsCode`: `description.customsDescription` — mô tả ECUS **ghép tất định từ phiếu** (ô bắt buộc không bị rơi, ≤200 ký tự);
  `policy` — mức chính sách (xem mục 3).

Gửi lại `supplements` (khách/NV/chứng từ bổ sung) mỗi lần lập lại phiếu — chúng thắng dữ liệu trang.
Gửi `known` (ô đã rút lần trước) để đỡ một lượt AI.

**Mức chính sách** (`/api/tax`, cũng có trong phiếu): `policyLines[]` = từng dòng cột chính sách kèm `level`
`BLOCKING` (giấy phép, KTCN/hợp quy, kiểm dịch…) | `NOTICE` (chỉ áp tình huống riêng: hàng đã qua sử dụng,
TNTX, cửa khẩu phụ, phòng vệ thương mại) | `INFO` (không ràng buộc NK thương mại, vd danh mục cư dân biên giới).
**Bật cờ cảnh báo theo `hasActionablePolicy`**, không theo việc cột chính sách có chữ.

### Nhu cầu từ hàng thật — `GET /api/demand` (công khai)

Mỗi lần lập phiếu có mã HS, hs-code-api ghi lại chỗ hổng tri thức của món đó (không định danh):
mã HS chưa đối chiếu danh mục KTCN 2026, nhãn hiệu chưa có trong danh sách theo dõi, chữ gợi hàng nhái,
ô bắt buộc hay thiếu, nhãn thông số tiếng Trung từ điển chưa hiểu. `GET /api/demand?days=90` trả bản gom —
**chỉ mức ưu tiên Cao/Vừa/Thấp, không số lượng, tên hàng, link, shop hay khách** (CEO chốt 05/10/2026).

Ai dùng:
- **oz-wiki-plhq** — `tools/nhu-cau.mjs` kéo `ktcn2026` vào báo cáo điểm mù → việc trích bảng mã HS / hợp quy.
- **hs-code-api** — workflow `demand-issue` hằng ngày cập nhật issue "Nhu cầu từ hàng thật (tự động)" (nhãn hiệu, từ điển, template).

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
  missingFacts có?
  ├─ YES → hỏi user các câu questionVi → gọi lại với facts{}
  └─ NO  → Hiển thị 3 gợi ý (kèm basis, cảnh báo), user chọn + xác nhận
           (degraded=true → đánh dấu "chưa qua AI", bắt buộc chuyên viên duyệt)
        ↓
GET /api/tax?hs=<code>
  ├─ acfta.forOrigin.eligible = false? (VD "0 (-CN)": hàng TQ KHÔNG được ACFTA)
  │     └─ Áp MFN, không dùng C/O mẫu E
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
| `200` + `degraded: true` | AI lỗi/không cấu hình — suggest trả gợi ý theo tìm kiếm, describe trả bản khai dựng từ dữ kiện nhập | Dùng được nhưng bắt buộc người duyệt; gọi lại sau để có kết quả AI |
| `502` / `503` | Lỗi ngoài dự kiến | Retry sau 3s (max 2 lần) |

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

## Env variables cần thiết (server riêng)

```bash
HS_API_TOKEN=<secret>          # Bearer token cho ERP
GEMINI_API_KEY=<key>           # Nên có; thiếu thì suggest/describe dùng chuỗi fallback bên dưới
MINIMAX_API_KEY=<key>          # Fallback LLM (prod đang dùng)
OPENROUTER_API_KEY=<key>       # Fallback LLM khi Gemini lỗi (nên có)
SENTRY_DSN=<dsn>               # Optional error monitoring
HS_PUBLIC_LLM=true             # mặc định true: suggest/describe/classify/match không cần token; false = đóng lại, cần Bearer
```
