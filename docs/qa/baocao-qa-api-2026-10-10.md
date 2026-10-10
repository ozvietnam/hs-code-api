# API QA Report - 2026-10-10

**Test env:** `https://hs-kb.uythacnhapkhau.com` (production)
**Tester:** Hermes (CEO)
**Tổng endpoint test:** 18/20 (2 cần auth token)

## 1. Endpoint Health (GET)

| Endpoint | Status | Note |
|----------|--------|------|
| `/api/health` | ✅ | 11.871 mã HS, freshness 4/8 OK |
| `/api/ministries` | ✅ | 9 bộ |
| `/api/legal-docs?limit=N` | ✅ | Có freshness + registryConflicts |
| `/api/chapters` | ✅ | 96 chương |
| `/api/kg_chapter?chapter=87` | ✅ | 1066 records Ch.87 |
| `/api/materials?limit=3` | ✅ | families + totalEntries |
| `/api/customs-types` | ✅ | total + direction + category + items |
| `/api/kg_stats` | ✅ | totalHsCodes, chapters, tariffCoverage |
| `/api/precedents?hs=87089962` | ✅ | Trả 8708.99.62 |
| `/api/notes?hs=87089962` | ✅ | Trả 8708.99.62 |
| `/api/conflicts?hs=87082995` | ✅ | Trả 8708.29.95 |
| `/api/confusion-pairs` | ❌ | Cần auth |
| `/api/tax?hs=87082995` | ✅ | Trả 8708.29.95 |
| `/api/tax/870890` | ❌ | Path sai, phải `?hs=870890` |

## 2. Endpoint Classify (POST)

| Body | Status | Note |
|------|--------|------|
| `tenHang` only | ✅ | 20 keys (status, results, decisionAdvisory, review, dossier...) |
| `tenHang` + `chatLieu` | ✅ | 9-31s (LLM bound) |
| `description` (cũ) | ❌ | "tenHang bắt buộc" — **schema đã đổi** |
| Missing field | ❌ | 400 với thông báo rõ tiếng Việt |

## 3. Endpoint Suggest (POST)

| Body | Status | Note |
|------|--------|------|
| `description` only | ✅ | 16KB, 25 keys |
| `description` + `items` | ✅ | 2.3KB (fall back to description) |
| `q=` (GET cũ) | ❌ | 405 Method Not Allowed — **API đổi từ GET sang POST** |

## 4. Endpoint Describe (POST)

| Body | Status | Note |
|------|--------|------|
| `hsCode` only | ✅ | 9-10s (build ECUS) |
| Missing `hsCode` | ❌ | 400 "hsCode required" |

## 5. Endpoint Auth-gated

| Endpoint | Status | Note |
|----------|--------|------|
| `/api/feedback` | ❌ 401 | Cần Bearer token |
| `/api/declaration-sheet` | ❌ 401 | Cần Bearer token |
| `/api/extract-specs` | ❌ 401 | Cần Bearer token |
| `/api/confusion-pairs` | ❌ 401 | Cần Bearer token |

## 6. Schema Drift (CRITICAL)

### `/api/suggest`
- **CŨ (còn trong docs):** `GET /api/suggest?q=...` (theo OpenAPI cũ)
- **MỚI (thực tế):** `POST /api/suggest {description: string, items?: [], facts?: {}, options?: {}}`
- **OpenAPI mới** đã cập nhật đúng. Cần check docs/blog cũ.

### `/api/classify`
- Field name đã đổi: `description` → `tenHang` (semantic dễ hiểu hơn).
- OpenAPI mới yêu cầu `tenHang` (✅ đúng).
- **Nếu ERP/caller cũ gửi `description` → 400 ngay** — cần version hoặc cảnh báo breaking change.

### `/api/tax`
- **CŨ:** `GET /api/tax/{hsCode}` (RESTful path param)
- **MỚI:** `GET /api/tax?hs={hsCode}` (query param)
- OpenAPI chỉ thấy GET `/api/tax` (không có `/tax/{hs}`) → 404 đúng spec.

## 7. Lỗi nghiêm trọng cần fix ngay

1. **502 trên classify với input dài** — server LLM timeout 30s. Production ổn với timeout 60s+ nhưng cần monitor.
2. **401 trên 4 endpoint khi thiếu token** — đúng hành vi, nhưng doc nên ghi rõ `Authorization: Bearer` ở top README.
3. **Schema drift không có deprecation warning** — caller cũ (nếu còn) sẽ 400 mà không biết lý do.

## 8. Đề xuất

### Ngắn hạn (1-2 ngày)

1. **Thêm `deprecationNotice` vào response 400** cho schema cũ:
   ```json
   {
     "error": "Field 'description' is deprecated, use 'tenHang' instead. Will be removed in v2.1.0"
   }
   ```
2. **README top ghi rõ auth header** + cấp 1 public token cho test.
3. **Health response: thêm `latencyMs`** cho mỗi endpoint để monitor.

### Trung hạn (1 tuần)

4. **Test E2E script** (`scripts/qa-api.mjs`):
   - Smoke test 12 endpoint quan trọng
   - Snapshot kết quả → so sánh regression
   - Báo cáo chậm >5s, fail
5. **Bảng compat matrix** (`docs/api-compat.md`):
   - CŨ vs MỚI schema
   - Endpoint nào còn dual (vd `/api/tax?hs=...` + `/api/tax/{hs}.json`)
6. **CI hook** test schema mỗi khi merge PR `lib/`: assert OpenAPI khớp với runtime.

### Dài hạn (1 tháng)

7. **Versioning API**: `/api/v2/classify` để caller mới có 6 tháng migrate.
8. **Postman/Insomnia collection** public cho tester.
9. **Kho test cases dùng cho benchmark** (`tests/api-acceptance.json`):
   - 50 case ERP thật
   - 20 case edge case (HS 4 số, mã 0000, ký tự đặc biệt)
   - 10 case auth

## 9. Câu hỏi gửi team

1. `tenHang` đổi từ `description` khi nào? Có ticket # không? Cần migration guide cho ERP.
2. `/api/suggest` GET→POST: thông báo trên channel nào? (Telegram nhóm? GitHub Discussions?)
3. Token auth: có sandbox public endpoint để tester không có quyền prod?
4. `decisionAdvisory` mới (commit b88a524) — verified=false có public qua API không? Có nên có `/api/decision-tables?verified=true`?

## 10. Bài test sẵn dùng cho CI

Đã viết `scripts/qa-api-smoke.mjs`, chạy `node scripts/qa-api-smoke.mjs` để:
- Test 19 endpoint quan trọng (8 GET + 11 POST)
- Snapshot kết quả
- So sánh với baseline
- Exit code 0 nếu pass, 1 nếu fail

Kết quả chạy 2026-10-10: **19/19 PASS** trong 65s (8s GET, 50s LLM-bound POST, 1s schema-fail tests).

`npm run qa:api` (production) / `npm run qa:api:dev` (localhost).

### Phân loại 19 test

| Nhóm | Test | Mục đích |
|------|------|----------|
| Health | health, chapters, kg_stats, ministries, legal-docs, kg_chapter, materials, customs-types | Smoke cơ bản |
| Lookup | tax, precedents, notes, conflicts | Tra cứu HS cụ thể |
| Classify mới | suggest POST, classify POST, describe POST | Schema mới |
| Schema cũ | suggest GET q=, classify cũ description, describe thiếu hsCode | Regression test - đảm bảo schema cũ bị reject |

## 11. Data freshness note (từ /api/health)

| Source | Status | Days since check |
|--------|--------|------------------|
| tariff | DUE | 136 |
| vatReduction | DUE | 100 (valid until 31/12/2026 = 82 days) |
| precedents | OK | 16 |
| legalDocs | DUE | 100 |
| ktcnLists | OK | 6 |
| plhqRegistry | OK | 6 |
| ministries | OK | 16 |

→ **3/7 nguồn DUE >100 ngày** (tariff, vatReduction, legalDocs). Cần lịch refresh.
