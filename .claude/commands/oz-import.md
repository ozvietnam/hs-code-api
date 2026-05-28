---
description: Import + embed dữ liệu Oz historical declarations từ data/oz-export/*.xlsx — tự động 5 phase
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite, Skill
---

# /oz-import — Import + embed Oz historical declarations

Mục tiêu: nạp tờ khai cũ Oz từ Excel → JSONL → embed → wire vào /api/suggest precedent boost (Issue #32).

## CONTEXT em (Claude) phải đọc trước

1. `CLAUDE.md` — project rules + 7 rule bất biến (đặc biệt rule privacy + Bearer auth)
2. `data/oz-export/` — chứa file Excel CEO drop. Có thể 1-N file.
3. `lib/gemini.js` — Gemini API wrapper, dùng cho embedding
4. `lib/data.js` — schema lookup helpers (taxData, normalizeHs)
5. `data/oz-declarations.jsonl` — file output (gitignored, có thể chưa tồn tại)

## SCHEMA target (output JSONL)

```json
{
  "declId": "OZ-YYYY-NNN",
  "date": "YYYY-MM-DD",
  "productName": "tên hàng từ Excel",
  "brand": "thương hiệu nếu có",
  "model": "model nếu có",
  "hsCode": "8-12 digit",
  "hsCodeRevised": "mã đúng (nếu Hải quan sửa lại)" || null,
  "unitVi": "đơn vị tính",
  "origin": "ISO code 2 letter",
  "quantity": number,
  "importerName": "Oz VN",
  "outcome": "APPROVED" | "REVISED" | "REJECTED" | "UNKNOWN",
  "customsDescription": "mô tả khai báo gốc",
  "auditNote": "ghi chú nếu có",
  "sourceFile": "tên file Excel",
  "sourceRow": "số dòng trong Excel"
}
```

## PRIVACY (TUYỆT ĐỐI tuân thủ)

- KHÔNG commit `data/oz-export/*.xlsx`, `data/oz-export/*.csv`, `data/oz-declarations.jsonl` — đã .gitignore
- KHÔNG print thông tin khách hàng (`importerName` chi tiết, email, phone) ra console nếu có
- KHÔNG push lên GitHub bất kỳ file nào trong `data/oz-export/`
- Cuối phase 3: chạy `git status` verify không có file private trong staged

---

## WORKFLOW — 5 phase tuần tự

### PHASE 1: Discovery (em tự chạy, không cần CEO confirm)

1. `TodoWrite` tạo task list 5 phase, mark Phase 1 = in_progress
2. `ls data/oz-export/*.{xlsx,csv}` xác định files có
3. Đọc từng file bằng `xlsx` library:
   - Số sheets
   - Header row của mỗi sheet
   - Sample 3 rows đầu (mask phone/email nếu detect)
   - Tổng rows mỗi sheet
4. **Propose column mapping** (Excel header → schema field) — print bảng rõ
5. Detect file nào là **primary training data** (có hsCode + outcome + productName) vs file tham khảo
6. Mark Phase 1 = completed, Phase 2 = in_progress
7. **STOP. Hỏi CEO confirm mapping** với câu duy nhất:
   > "Em đã hiểu schema X file Y. Anh đồng ý mapping em propose? (Y/N hoặc chỉnh cột nào)"

### PHASE 2: Dry-run (chạy sau khi CEO confirm Phase 1)

1. Viết `scripts/import-oz-declarations.mjs` với:
   - CLI args: `--dry-run`, `--file=path`, `--mapping=json` (optional)
   - Read Excel, normalize từng row theo schema
   - Validate (hsCode regex 6-12 digit, date parse, quantity numeric)
   - Output: count valid/error/warn + 5 sample records
   - Errors grouped by type (missing hsCode, bad date format, etc.)
2. Chạy `node scripts/import-oz-declarations.mjs --dry-run --file=data/oz-export/<primary-file>.xlsx`
3. Report stats + sample
4. Mark Phase 2 = completed, Phase 3 = in_progress
5. **STOP. Hỏi CEO:**
   > "Dry-run xong: X valid, Y error, Z warning. Anh confirm import production?"

### PHASE 3: Production import (chạy sau khi CEO confirm Phase 2)

1. Chạy `node scripts/import-oz-declarations.mjs --file=data/oz-export/<primary-file>.xlsx` (KHÔNG --dry-run)
2. Output: `data/oz-declarations.jsonl` (append-only nếu đã có)
3. Tạo `data/oz-declarations.meta.json`:
   ```json
   {
     "lastImportAt": "ISO timestamp",
     "totalRecords": number,
     "byOutcome": { "APPROVED": N, "REVISED": N, "REJECTED": N, "UNKNOWN": N },
     "topHsCodes": [{ "hsCode": "...", "count": N }, ...top 10],
     "sourceFiles": [...]
   }
   ```
4. **PRIVACY CHECK**: chạy `git status` — assert KHÔNG có `data/oz-declarations.jsonl` hoặc `data/oz-export/*.xlsx` trong tracked/staged. Nếu có → STOP error.
5. Mark Phase 3 = completed, Phase 4 = in_progress
6. Tiếp Phase 4 (KHÔNG cần CEO confirm — Phase 3 đã safe)

### PHASE 4: Embedding pipeline (auto sau Phase 3)

1. Viết `scripts/embed-oz-declarations.mjs`:
   - Đọc `data/oz-declarations.jsonl`
   - Build embed text: `${productName} ${brand} ${model} ${customsDescription}`.trim()
   - Call Gemini `embedContent` model `gemini-embedding-001` với outputDimensionality=768
   - Batch 100, rate limit 4s/batch (tránh 429)
   - Output: `data/oz-declaration-embeddings.json` map `{ declId: [768 floats] }`
   - Resume capability (skip declId đã có embedding)
2. Chạy script
3. Verify file output có đủ embeddings (count match declarations)
4. Mark Phase 4 = completed, Phase 5 = in_progress

### PHASE 5: Wire vào /api/suggest + smoke test (auto)

1. Viết `lib/oz-precedent-search.js`:
   - Export `searchOzPrecedents(description, options)` 
   - Input: query string
   - Logic: embed query → cosine similarity với oz-declaration-embeddings.json → top K=5
   - Return: array { declId, hsCode, outcome, productName, similarity }
2. Update `api/suggest.js`:
   - Sau khi có top candidates từ existing pipeline
   - Call `searchOzPrecedents(description)` → top 5 Oz similar
   - Build `evidenceTrace.matchedOzPrecedents` array
   - Boost confidence nếu Oz outcome=APPROVED match candidate hsCode (+5 points)
   - Warning nếu Oz outcome=REJECTED match candidate hsCode ("Oz từng bị bác mã này")
3. Smoke test (cần env vars production, dùng curl):
   - `curl -H "Authorization: Bearer $TOKEN" -X POST .../api/suggest -d '{"description":"<sample from Oz data>"}'`
   - Verify response có `evidenceTrace.matchedOzPrecedents` non-empty
4. Update `README.md` section "Oz historical training" — note số declarations + endpoint behavior
5. Commit changes (KHÔNG commit data files private):
   ```bash
   git add scripts/import-oz-declarations.mjs scripts/embed-oz-declarations.mjs lib/oz-precedent-search.js api/suggest.js README.md
   git status  # verify không có data/oz-export/* hoặc data/oz-declarations.jsonl
   git commit -m "feat(oz): Oz historical declarations training data + precedent boost (#32)"
   git push origin main
   ```
6. Đóng GitHub Issue #32:
   ```bash
   gh issue close 32 --repo ozvietnam/hs-code-api --comment "✅ Imported N declarations, embedded, wired vào /api/suggest"
   ```
7. Mark Phase 5 = completed

## FINAL REPORT format

Sau khi xong Phase 5, em print:

```
✅ /oz-import DONE

📊 Stats:
- Imported: N declarations (X APPROVED, Y REVISED, Z REJECTED)
- Top HS codes: ...
- Embeddings: N × 768-dim
- API suggest test: PASS (matched M Oz precedents)

🔐 Privacy verified:
- Files private gitignored: ✓
- Git status clean (no Oz data staged): ✓

🚀 Endpoint cải tiến:
- /api/suggest giờ trả `evidenceTrace.matchedOzPrecedents`
- Confidence boost khi Oz APPROVED match (+5)
- Warning khi Oz REJECTED match

⏭️ Next:
- CEO test trên ERP HsTaxDialog xem suggestions có Oz precedent đúng không
- Weekly cron có thể setup để compare suggest accuracy vs Oz outcome (Issue #12)
```

## ERROR HANDLING

- Phase nào fail → STOP, print error, KHÔNG chạy phase sau
- Nếu Gemini API rate limit → retry exponential backoff
- Nếu Excel parse fail → log row error + skip, KHÔNG abort toàn bộ
- Nếu git status có file private trong staged → ABORT phase commit, alert CEO

## KHÔNG được làm

- ❌ Skip Phase 1 (discovery) để rush
- ❌ Phase 2 KHÔNG có --dry-run (sẽ ghi data sai khó undo)
- ❌ Commit bất kỳ file nào trong `data/oz-export/` hoặc `data/oz-declarations.jsonl`
- ❌ Print full content row (chỉ count + sample 5 records max)
- ❌ Hardcode mapping — phải `--mapping` config flag
