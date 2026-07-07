# Kế hoạch xây data — góc nhìn chuyên gia Hải quan

*Mục tiêu: API phục vụ DN XNK và NV khai báo hàng ngày — tra HS, xác định mã, mô tả ECUS, thuế, SHTT, kiểm tra chuyên ngành.*

**Cập nhật:** 2026-07-07

---

## Trạng thái triển khai

| Giai đoạn | Hạng mục | Trạng thái |
|---|---|---|
| **1.3** | Checklist ECUS nhóm 4 số + **119 override 8 số** (35 expert + 84 mined Oz) | ✅ Xong |
| 1.1 | `declaration-checklists.json` — hồ sơ theo mã HS | ⏳ Chưa làm |
| 1.2 | Hoàn thiện `policy-procedures` map HS → quy trình | ⏳ Chưa làm |
| 2 | SHTT / IPR alerts | ⏳ Chưa làm |
| 3 | FTA eligibility + VAT rules | ⏳ Chưa làm |
| 4 | Accuracy suggest + loại khác mining | 🔄 Liên tục |

---

## 1. Bức tranh thực tế: 7 câu hỏi mỗi dòng hàng

| # | Câu hỏi | API hiện có | Đủ dùng hàng ngày |
|---|---|---|---|
| 1 | Mã HS đúng chưa? | `/api/suggest` | Khá (~25% exact-8, ~74% chapter) |
| 2 | Mô tả ECUS đủ chi tiết? | `/api/describe` | Tốt khung — **đang bổ sung checklist chương** |
| 3 | Thuế NK/VAT/FTA đúng? | `/api/tax` | Tốt số — thiếu điều kiện hưởng ưu đãi |
| 4 | KT chuyên ngành / GP? | tax-enriched warnings | Có text — thiếu quy trình từng bước |
| 5 | Rủi ro SHTT? | — | **Thiếu** |
| 6 | Mã Loại khác — hàng thuộc phạm vi? | loai-khac corpus | Tốt |
| 7 | Hồ sơ chuẩn bị trước khi hàng về? | legal-docs | Có VB — chưa gắn checklist theo mã |

---

## Giai đoạn 1 — “Một dòng hàng = một bức tranh đủ khai”

### 1.3. Checklist mô tả ECUS theo nhóm 4 số + mã 8 số ✅

**Hierarchy:** `mã 8 số` → `nhóm 4 số` (235 headings) → `chương 2 số` (fallback)

| File | Vai trò |
|---|---|
| `data/chapter-declaration-fields.json` | Catalog ~60 field + fallback chương |
| `data/heading-declaration-fields.json` | **235 nhóm 4 số** (generated) |
| `data/hs-declaration-overrides.json` | **16 mã 8 số** override chi tiết |
| `lib/declaration-field-templates.js` | Template chuyên gia (bơm, lốp, điện thoại…) |

**Build:** `npm run build:declaration-fields`  
**Mine Oz top 100:** `npm run mine:declaration-overrides`  
**Sửa seed chuyên gia:** `lib/hs-override-seeds.js` → chạy lại mine  
**Queue review:** `data/hs-declaration-mine-queue.json` (84 mã auto cần rà tay)

### 1.1. Declaration checklist (200 mã top volume)

**File:** `data/declaration-checklists.json`  
**API:** `GET /api/declaration-guide?hs=&flow=import`  
**Nguồn:** policy-procedures + tax-enriched + oz-gold

### 1.2. Policy procedures — text → quy trình

Map mỗi mã HS → `procedureId[]`, bước có `who` / `when` / severity `BLOCK|WARN`.

---

## Giai đoạn 2 — SHTT & hàng giả nhãn hiệu

**File:** `data/ipr-alerts.json` — top 200 nhãn × chương nhạy cảm  
**API:** `GET /api/ipr?hs=&brand=`

---

## Giai đoạn 3 — Thuế ưu đãi & xuất xứ

**File:** `data/fta-rules.json`, `data/vat-rules.json`  
**API:** mở rộng `/api/tax?hs=&origin=`

---

## Giai đoạn 4 — Phân loại sâu (liên tục)

- Suggest exact-8: 25% → 45%+
- Loại khác mining: 2.347 mã `canMine`
- Precedent Oz (đã làm sạch)

---

## API “một cửa” (vision 6 tháng)

`POST /api/declare-line` → suggest + tax + describe + checklist + ipr + conflicts + precedents

---

## KPI

| KPI | Hiện tại | Mục tiêu 6 tháng |
|---|---|---|
| Exact-8 suggest | 24.6% | ≥45% |
| Describe chapter fields | mới triển khai | ≥80% test pass |
| Mã có checklist hồ sơ | 0 | ≥500 |
| Mã có IPR alert | 0 | ≥150 |
