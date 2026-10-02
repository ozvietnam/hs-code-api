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
