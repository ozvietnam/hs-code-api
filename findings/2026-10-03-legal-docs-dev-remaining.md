# Legal Docs — Remaining Issues for Dev Data (2026-10-03)

## Tóm tắt
Sau các bước 73–74 (làn B), đã fix 14 entries trong legal-docs. Còn **55 issues** cần dev dữ liệu thêm văn bản gốc từ BCT.

## Đã fix (14 entries)
| # | Action | Codes | Result |
|---|--------|-------|--------|
| 1 | Weird-code normalize (Bước 71) | 2711, 765, 3765, 1725, 6266, 9981, 01/I_ | 111→103 entries |
| 2 | Year-variant base removal (Bước 73) | 691,693,715,1978 (base entries) | 103→99 entries |
| 3 | Add missing base + remove year-variant (Bước 74) | 2822,1959 | 99 entries (net 0) |

## Còn lại: 55 issues cần dev dữ liệu

### 1. Dangling REPLACED — target doc không có trong kho (3 entries)
| Code | replacedBy | Cần | Ảnh hưởng |
|------|-----------|-----|-----------|
| 2333/QD-BCT-2025 | 2174/QD-BCT | Thêm 2174/QD-BCT | Điều tra CBPG gạch Ấn Độ |
| 2491/QD-BCT-2025 | 121/QD-BCT | Thêm 121/QD-BCT | Thuế CBPG tạm thời |
| 2093/QD-BCT-2025 | 1400/QD-BCT | Thêm 1400/QD-BCT | CBPG kính |

**Hành động:** Tra thuvienphapluat.vn hoặc moit.gov.vn để tìm văn bản gốc, thêm vào legal-docs.json.

### 2. EXPIRED docs thiếu validUntil (6 entries)
| Code | titleVi | effectiveDate | Cần |
|------|---------|---------------|-----|
| 691/QD-BCT-2023 | Gia hạn tự vệ thép dài | 2023-03-22 | validUntil từ quyết định gốc |
| 693/QD-BCT-2023 | Gia hạn chống lẩn tránh thép cuộn/dây | 2023-03-22 | validUntil |
| 715/QD-BCT-2020 | Gia hạn tự vệ phân bón DAP, MAP | 2020-03-07 | validUntil |
| 691/QD-BCT | (duplicate of 691/QD-BCT-2023) | 2023-03-22 | **Xoá** — duplicate đã remove base entry |
| 693/QD-BCT | (duplicate of 693/QD-BCT-2023) | 2023-03-22 | **Xoá** — duplicate |
| 715/QD-BCT | (duplicate of 715/QD-BCT-2020) | 2020-03-07 | **Xoá** — duplicate |

**Phân tích (từ web search 2026-10-03):**
- **691/QD-BCT (thép dài)**: Safeguard từ 2016, WTO tối đa 8 năm → hết 2024. Có thể đã kết thúc hoặc gia hạn. Cần BCT xác nhận.
- **693/QD-BCT (thép cuộn)**: Tương tự, cần xác nhận.
- **715/QD-BCT (phân bón)**: UNCLEAR — có thể đã hết hiệu lực. Cần xác nhận.
- **691/693/715/QD-BCT** (3 base entries): Đã bị xoá trong Bước 73 (vì trùng year-suffix). KHÔNG cần xoá nữa.

**Hành động:** Kiểm tra trên moit.gov.vn, thuvienphapluat.vn, thêm validUntil.

### 3. Year-variant entries còn lại (4 entries)
| Code | Status | Note |
|------|--------|------|
| 691/QD-BCT-2023 | EXPIRED | Đúng — đang cần validUntil |
| 693/QD-BCT-2023 | EXPIRED | Đúng — đang cần validUntil |
| 715/QD-BCT-2020 | EXPIRED | Đúng — đang cần validUntil |
| 1978/QD-BCT-2025 | REPLACED | Đúng — replacedBy=915/QD-BCT (đã có trong kho) |

**Hành động:** Những entry này đúng — giữ nguyên, chỉ cần thêm validUntil.

### 4. 1978/QD-BCT REPLACED (đã đúng sau Bước 73)
- 1978/QD-BCT (base): đã xoá trong Bước 73
- 1978/QD-BCT-2025: REPLACED → replacedBy=915/QD-BCT (EXISTS, ACTIVE) — ĐÚNG, không cần làm gì

## Sources để verify
- https://moit.gov.vn (Bộ Công Thương)
- https://thuvienphapluat.vn (pháp luật Việt Nam)
- https://trungtamwto.vn (WTO研究中心)

## Script để audit lại
```bash
node scripts/audit-legal-docs.mjs
```
