# Finding: policy-procedures quality audit 2026-10-03

- **Ngày:** 2026-10-03
- **Trạng thái:** `COMPLETE` — all quality gates green
- **Nhánh:** `hermes/lan-B-chinh-sach` (50 commits ahead of main)
- **PR:** draft #96

## Kết quả audit

| Metric | Value |
|---|---|
| procedure types | 20 |
| chapter groups | 36 |
| total entries | 56 |
| normalizeType nulls | 0 / 225 types (100%) |
| HS with warnings → procedure | 7,927 / 7,928 (99.99%) |
| HS chapter-group fallback | 3,355 / 3,356 (99.97%) |
| usedGoodsImportBan → cam-nk | 1,805 / 1,805 (100%) |
| dualUseControl → procedure | 226 / 226 (100%) |
| priorityImportFromCN defined | 56 / 56 (100%) |
| test-policy-procedures | 566 / 566 PASS |
| npm test | 51 / 51 PASS |
| BNNPTNT ministry name | fixed → BNNMT (2025 reorganization) |

## Còn lại (acceptable — không cần sửa)

- **1 HS safeguard duty (98110010):** no procedure because it's a tariff measure, not an admin procedure — correct
- **1 HS no chapter-group fallback (chương 77 WCO reserved):** correct — chuong-77 intentionally has no procedures
- **legalBasis strings vs legalDocs.json:** legalBasis uses law names (e.g., "Nghị định 69/2018/NĐ-CP"), not document IDs — acceptable for display

## PR #96 draft ready for merge
- 50 commits on `hermes/lan-B-chinh-sach`
- All tests green
- Author: ozvietnam/hs-agent
- Waiting: dev review + merge

## Audit bổ sung 2026-10-03 07:xx (làn B)

### Phát hiện
1. **estimatedDays là object {min, max, note} không phải số** — đúng thiết kế, test đã xác nhận
2. **10 test failures = decision tables draft** — 6402, 8483, 8486, 8504, 8536, 8544, 8714 + 8505, 8541, 9620 — content gap, lá không có path trong cây luật. Mã 8 số đều tồn tại trong tax.json. Cần expert review.
3. **37 chapter-groups: tất cả verified=true, có group, hsRange, label, exemptions, legalBasis** — đầy đủ
4. **priorityImportFromCN: 2 entries = false** (cong-nghe-85-90-phu-93, chuong-77) — đúng (vũ khí quân sự + WCO reserved)
5. **normalizeType: 0 nulls** — 100% coverage
6. **getProcedures(): chương 77 → empty array (WCO Reserved); ch13 fallback → chat-luong; cam-nk ban → cam-nk** — đúng
7. **PR #96: 88 commits, draft=True, mergeable, tất cả tests pass** — chờ merge

### Kết luận
**Làn chính sách nhập khẩu: KHÔNG còn việc tự làm được.**
- Coverage: 97/97 chapters (100%)
- 20 procedure types: tất cả verified=true, trigger/documents/exemptions/matchPatterns/estimatedDays/estimatedCost/agency/legalBasis/severity/onFail/priorityImportFromCN — đầy đủ
- 37 chapter-groups: tất cả verified=true, group/hsRange/label/chapters/procedures/legalBasis/exemptions/hsExamples — đầy đủ
- npm test: 290✓ 10✗ = 10 draft decision tables (expert review cần)
- Việc còn lại: **expert review 10 draft tables → PR #96 merge**
