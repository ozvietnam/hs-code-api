# Roadmap V4 — Track A only: Data quality + Accuracy + ERP polish

**Date**: 2026-05-28 chiều  
**Trọng tâm**: Service backbone phục vụ ERP nội bộ ủy thác XNK của Oz. KHÔNG lan sang chatbot/landing/SEO/lead-gen tuần này.  
**Phase**: 7.5 wrap-up + Phase 8 prep

---

## 🎯 Đã ship 28/5 (~12 commits hôm nay, 27 issues closed)

| Commit | Item |
|---|---|
| `745fdab` 09:19 | **Import 10,000 Oz declarations** từ Excel |
| `3b53b0b` 10:23 | OZ precedent embedding search wired vào `/api/suggest` (#32) |
| `e40c9e7` 10:52 | Historical guardrails + confidence breakdown |
| `b2665e6` 10:57 | Documentation suggest historical guardrails |
| Trước đó 00-04h | UI Browse/Editor/Feedback (#9, #10, #11), WCO English (#6) |

→ Backbone Phase 7 **gần xong**. Service production-grade.

---

## 🎯 Trọng tâm tiếp theo: Đo + Đào + Đóng

```
                  ┌───────────────────────┐
                  │  3-Đ FRAMEWORK W22-23 │
                  └───────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    1. ĐO              2. ĐÀO              3. ĐÓNG
    Measure            Train deep          Wrap loop
    ──────             ──────              ──────
    Accuracy KPI       Policy Pro          Director feedback
    Latency            5-level notes       ERP UI polish
    Override rate      Oz outcome use      Audit trail
```

### 1. ĐO — Đo lường accuracy trước khi tinh chỉnh

Anh đã có 10k Oz declarations với outcome thực tế. Đây là **ground truth dataset** quý nhất. Phải đo accuracy hiện tại trước khi tinh chỉnh.

### 2. ĐÀO — Đào sâu data quality

- Policy enricher Gemini Pro (Issue #5) — 7,928 mã có warnings phong phú
- 5-level notes (Issue #18 đã closed) — context tốt hơn cho LLM
- Brand/material taxonomy đã có — cần verify integration đầy đủ

### 3. ĐÓNG — Đóng closed-loop với ERP

- Director feedback (mỗi lần override) → training signal
- ERP UI hiển thị Oz precedent matched
- Audit trail GIR rules applied

---

## 📅 W22 còn lại (Thứ 5-CN, 29/5 → 1/6)

### Thứ 5 29/5 — ĐO

**[#36 mới] Accuracy benchmark với Oz 10k**

```
Input: 10,000 Oz declarations (đã có)
Pipeline:
  1. Random sample 200 records (stratified by chapter)
  2. Cho mỗi record: gọi /api/suggest với productName + brand + model
  3. Compare suggested top1 hsCode vs actual Oz hsCode
  4. Compute accuracy bucket:
     - APPROVED outcome: top1 phải match → benchmark ground truth
     - REVISED outcome: top1 phải match hsCodeRevised → check correction learned
     - REJECTED outcome: top1 PHẢI KHÁC hsCode đã reject → guardrail work
  5. Output: data/accuracy-report-2026-05-29.json + chart
Acceptance:
  - Overall accuracy ≥ 75% (baseline trước Oz embedding)
  - APPROVED bucket ≥ 85%
  - Report top 10 chapters có accuracy thấp nhất → backlog improve
```

**Effort**: 4h. Tạo script `scripts/benchmark-suggest.mjs`.

### Thứ 6 30/5 — ĐÀO

**[#5 đã có] Policy Enricher Gemini 2.5 Pro deep parse**

7,928 mã có `cs` text dài. Hiện chỉ regex basic. Cần Gemini Pro extract:
- `licenseTypes[]` (NK / XK / quá cảnh / tự động)
- `inspectionTypes[]` (CR chất lượng / VSATTP / kiểm dịch / hợp quy)
- `quarantineRequired` bool
- `dualUseControl` bool
- `legalDocs[]` link tới #27 catalog
- `severity` enum LOW/MEDIUM/HIGH/CRITICAL

Cost ~$25-30 batch một lần. Đã có `data/ministries-vn.json` + `data/legal-docs.json` để cross-ref.

**Acceptance**:
- 7,928 mã đều có `warnings` structured
- `/api/tax` response có severity + clickable URLs
- Test 20 sample HS chapter 28-30 (hóa chất nhạy cảm) verify parse đúng

**Effort**: 4-6h (chủ yếu là Gemini batch chạy + verify).

### CN 1/6 — Rest

---

## 📅 W23 (5/6 → 11/6) — ĐÀO sâu + ĐÓNG loop

### Thứ 2 2/6 — ĐÓNG

**[#43 mới] ERP HsTaxDialog hiển thị Oz precedent + GIR audit trail**

ERP có `src/lib/hs-kb-client.ts` (Phase 7.2 cũ) đã gọi `/api/suggest`. Hiện UI chỉ show top suggestions + confidence.

Cần cải tiến:
- Show `evidenceTrace.matchedOzPrecedents` (top 3 Oz precedent giống — tên hàng + ngày + outcome)
- Show `girRulesApplied[]` (audit trail QT-1, QT-3a, QT-6...)
- Warning banner đỏ nếu có `historicalGuardrails.rejectedBefore`
- Click vào HS code → mở `/admin/hs/:hsCode` của hs-code-api (deep link)

**Acceptance**:
- NV CUS check thấy "Oz từng khai mã này 5 lần, APPROVED" → tăng confidence
- Director review thấy GIR rule path → audit được

**Effort**: 4h (ERP side, `src/app/staff/orders/[code]/cus-check/HsTaxDialog.tsx`).

### Thứ 3 3/6 — ĐO + ĐÓNG

**[#12] Confidence KPI Dashboard** (S3 ML — đã có issue)

Hiện chưa có dashboard track:
- Override rate per chapter / per day
- Calibration: confidence 90% → thực tế đúng 90%?
- Latency P50/P90/P99 per endpoint

→ Build `/admin/ml` page trong hs-code-api repo. Đọc `data/feedback.jsonl` + `data/ml-log.jsonl` (cần log mới mỗi /api/suggest call).

**Effort**: 6-8h.

### Thứ 4 4/6 — ĐÀO

**[#44 mới] Refresh Tariff với version cron**

Issue #7 đã có versioning + diff endpoint. Cần cron monthly:
- Check `customs.gov.vn` có Biểu thuế mới chưa
- Manual upload xlsx → diff vs current → create new version
- Email digest cho CEO + NV_CUSTOMS

**Effort**: 4h.

### Thứ 5 5/6 — ĐÓNG

**[#45 mới] Director feedback → auto-promote pattern**

Closed-loop ML:
- Đọc `data/feedback.jsonl` weekly
- Group by `correctedHsCode`
- Nếu cùng correction ≥ 3 lần trong 30 ngày → promote pattern:
  - Add vào `discriminatingFeatures` của HS code gốc
  - Hoặc add tới `glossary-xnk.json` nếu là brand mapping
- CEO review qua `/admin/suggestions` page

**Effort**: 6h (cron + UI).

---

## 📅 W24 (12/6 → 18/6) — Wrap Phase 7

### **[#46 mới] Custom domain `hs-kb.uythacnhapkhau.com` + ERP env update**

Anh đã add domain Vercel. Còn:
- Anh setup DNS Azdigi `A hs-kb → 76.76.21.21`
- Verify SSL cert
- Update ERP env `HS_KB_API_URL` sang `https://hs-kb.uythacnhapkhau.com`

**Effort**: 30 phút + 30 phút DNS propagation.

### **[#13 đã có] Prompt Evolution + A/B test framework**

Sau khi có #36 accuracy benchmark + #12 KPI dashboard → có data để A/B test prompt:
- Variant A: current prompt
- Variant B: prompt cải tiến (mention Oz precedent rõ hơn, hoặc giảm temperature)
- Random 20% requests → variant B, log variant trong ml-log
- Sau 7 ngày + ≥100 requests/variant → CEO duyệt promote

**Effort**: 8h.

### **[#47 mới] Documentation cuối cùng + onboarding NV mới**

Khi có NV CUS check mới vào Oz:
- README hs-code-api dễ hiểu
- Video 5 phút demo HsTaxDialog flow trong ERP
- Cheat sheet: prompt mẫu cho /api/describe
- Lesson learned (vd: brand iPhone luôn HS 85171300)

**Effort**: 4h.

---

## 🟢 Defer (KHÔNG làm tuần này, dù important)

| Item | Khi nào |
|---|---|
| Track B chatbot Next.js + AI SDK | T6/2026 sau khi Track A stable ≥ 2 tuần |
| Public landing page SEO/lead-gen | Cùng chatbot launch |
| WhatsApp/Zalo integration chatbot | T8/2026 |
| Crawl tariff TCHQ auto monthly | T7 sau khi #44 manual stable |
| Email digest CEO weekly | T7 |

→ Lý do defer: Tuần này tập trung backbone QUALITY (#36 + #5 + #43). Khi accuracy ≥ 90% mới expose ra ngoài. Launch chatbot khi backbone yếu = mất uy tín.

---

## 🎯 KPI sau W22-W24 cần đạt

| Metric | Hiện tại | Target W24 |
|---|---|---|
| `/api/suggest` overall accuracy | ❓ chưa đo (cần #36) | ≥ 92% (target Oz APPROVED bucket) |
| Latency p90 | ~8s LLM | ≤ 5s (cache + precedent boost) |
| ERP override rate | unknown | ≤ 15% |
| Policy warnings coverage structured | partial (regex) | 100% (Gemini Pro #5) |
| GIR audit trail trong UI ERP | ❌ chưa hiển thị | ✅ NV+Director thấy được |
| Service uptime | 100% | 99.9% |

---

## 📋 7 issues mới em propose tạo

| # | Topic | Effort | Khi nào |
|---|---|---|---|
| **#36** | Accuracy benchmark với Oz 10k declarations | 4h | Thứ 5 29/5 |
| **#43** | ERP HsTaxDialog show Oz precedent + GIR trail | 4h | Thứ 2 2/6 |
| **#44** | Cron refresh tariff (manual upload + diff) | 4h | Thứ 4 4/6 |
| **#45** | Director feedback → auto-promote pattern | 6h | Thứ 5 5/6 |
| **#46** | Custom domain DNS + ERP env switch | 1h | W24 |
| **#47** | Documentation + onboarding NV mới | 4h | W24 |

Plus existing open #5, #12, #13, #35 đưa vào lịch trên.

---

## 🏁 Wrap Phase 7 milestone

Khi tất cả issues W22-W24 closed → close **#1 master spec** + **#14 meta** + **#34 dual-track roadmap**.

Service `hs-code-api` chính thức **Phase 7 DONE**. Sau đó bắt đầu Phase 8 = Track B chatbot (T6+).

---

## ⏭️ Action ngay (chiều nay, sau khi /oz-import xong)

1. Anh chạy `/oz-import` (đã trigger) — đợi xong
2. Em update Meta #14 + Master #34 + đóng các issue đã ship hôm nay (#9, #10, #11 extended, #6, #32) nếu chưa close formal
3. Tạo 6 issue mới (#36, #43, #44, #45, #46, #47) trên GitHub
4. Smoke test cuối ngày: production health + 10 mã sample qua /api/suggest

Em đứng ngoài + chờ anh confirm V4 trước khi tạo issues.
