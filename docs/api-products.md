# API `/api/products` — Corpus sản phẩm Loại khác

Endpoint trả về danh sách sản phẩm ví dụ thực tế cho mã HS 8 số "Loại khác" (residual).
Dùng để hỗ trợ tìm kiếm hàng hóa → mã HS trong ERP.

## Authentication

Tất cả endpoint đều yêu cầu Bearer token (trừ `/api/health`):

```
Authorization: Bearer <HS_API_TOKEN>
```

---

## Endpoint 1 — Tra 1 mã HS

```
GET /api/products?hs=84021219
```

### Response

```json
{
  "found": true,
  "hsCode": "84021219",
  "isLoaiKhac": true,
  "productCount": 10,
  "potential": "saturated",
  "canMine": false,
  "total": 8,
  "products": [
    "Lò hơi ống lửa mới 2t/h đốt dầu DO",
    "Lò hơi ống lửa mới 3t/h đốt than",
    "Lò hơi ống lửa mới 5t/h đốt gas",
    "Lò hơi ống lửa mới 1t/h đốt biomass",
    "Lò hơi ống lửa mới 8t/h đốt dầu DO",
    "Lò hơi ống lửa mới 10t/h đốt than",
    "Lò hơi ống lửa mới 0.5t/h đốt gas",
    "Lò hơi ống lửa mới 4t/h đốt biomass"
  ]
}
```

### Fields

| Field | Type | Mô tả |
|-------|------|--------|
| `found` | bool | Mã HS có trong corpus Loại khác không |
| `hsCode` | string | Mã HS 8 số (normalized) |
| `isLoaiKhac` | bool | Có phải mã "Loại khác" không |
| `productCount` | number | Tổng số sản phẩm đã sinh cho mã này |
| `potential` | string | `saturated` / `high` / `medium` / `low` — đánh giá dư địa đào thêm |
| `canMine` | bool | Có thể làm giàu thêm sản phẩm không |
| `total` | number | Số sản phẩm trả về trong response này |
| `products` | string[] | Danh sách tên hàng ví dụ (limit mặc định = 8, max = 20) |

### Query params

| Param | Default | Mô tả |
|-------|---------|--------|
| `hs` | — | Mã HS 8 số (bắt buộc) |
| `limit` | 8 | Số sản phẩm trả về (1–20) |

---

## Endpoint 2 — Tra batch nhiều mã HS

```
GET /api/products?hs=84021219,87032290,85044090
```

### Response

```json
{
  "total": 3,
  "results": [
    {
      "hsCode": "84021219",
      "isLoaiKhac": true,
      "productCount": 10,
      "potential": "saturated",
      "canMine": false,
      "products": ["Lò hơi ống lửa mới 2t/h đốt dầu DO", "..."]
    },
    {
      "hsCode": "87032290",
      "isLoaiKhac": true,
      "productCount": 9,
      "potential": "saturated",
      "canMine": false,
      "products": ["Xe ô tô con xăng 1000-1500cc 5 chỗ mới", "..."]
    },
    {
      "hsCode": "85044090",
      "isLoaiKhac": false,
      "productCount": 0,
      "potential": null,
      "canMine": null,
      "products": []
    }
  ]
}
```

Mã không phải Loại khác → `isLoaiKhac: false`, `products: []`.

---

## Endpoint 3 — Tổng quan + queue đào (dashboard)

```
GET /api/products?stats=1
```

### Response

```json
{
  "generatedAt": "2026-06-04T03:00:00.000Z",
  "totals": {
    "codes": 3383,
    "products": 11072,
    "avgPerCode": 3.27,
    "canMine": 2347,
    "done": 1036
  },
  "byPotential": {
    "saturated": 706,
    "high": 1850,
    "medium": 120,
    "low": 707
  },
  "mineableQueue": [
    {
      "hs": "15119042",
      "chapter": "15",
      "productCount": 1,
      "potential": "high",
      "priorityScore": 10,
      "riskLevel": "HIGH",
      "h6En": "palm olein, refined",
      "reason": "có h6En \"palm olein, refined\" nhưng đang fallback — viết domain template sẽ sinh nhiều sản phẩm"
    }
  ]
}
```

---

## Tích hợp với `/api/suggest`

Khi `/api/suggest` gợi ý mã HS "Loại khác", response tự động đính kèm `productExamples`:

```
POST /api/suggest
Authorization: Bearer <token>
Content-Type: application/json

{ "description": "lò hơi công nghiệp đốt dầu 5 tấn/giờ" }
```

Response:

```json
{
  "suggestions": [
    {
      "hsCode": "84021219",
      "tenHang": "Lò hơi ống lửa, loại khác",
      "confidence": 92,
      "productExamples": [
        "Lò hơi ống lửa mới 2t/h đốt dầu DO",
        "Lò hơi ống lửa mới 5t/h đốt gas",
        "Lò hơi ống lửa mới 3t/h đốt than"
      ]
    }
  ]
}
```

`productExamples` chỉ xuất hiện khi mã HS là Loại khác (`isLoaiKhac=true`).

---

## Ví dụ curl

```bash
BASE="https://hs-code-api.vercel.app"
TOKEN="<HS_API_TOKEN>"

# Tra 1 mã
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/products?hs=84021219"

# Tra batch
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/products?hs=84021219,87032290"

# Giới hạn 5 sản phẩm
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/products?hs=84021219&limit=5"

# Tổng quan corpus
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/products?stats=1"
```

---

## Thang đánh giá `potential`

| Giá trị | Ý nghĩa |
|---------|---------|
| `saturated` | ≥4 sản phẩm từ domain template — đủ, không cần đào thêm |
| `high` | Có qualifier tiếng Anh (h6En) nhưng chỉ fallback — dư địa lớn |
| `medium` | Có oz-gold anchor hoặc template mỏng — có thể mở rộng |
| `low` | Chỉ sibling loại trừ, không tín hiệu — ROI thấp |

---

## Coverage

- **3,383 mã** HS 8 số Loại khác (toàn bộ biểu thuế VN)
- **11,072 sản phẩm** ví dụ thực tế (kiểu Shopee/Taobao/B2B)
- Sinh bằng rule-based (không Gemini API) — latency thấp, không tốn token
- Dữ liệu tĩnh được load lazy khi khởi động function

---

## Error responses

| Status | Trường hợp |
|--------|-----------|
| 400 | Thiếu `hs` param (và không có `stats=1`) |
| 401 | Thiếu hoặc sai Authorization token |
| 405 | Method không phải GET |
