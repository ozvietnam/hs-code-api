# Tổng quan dự án `hs-code-api`

> Bản đồ nhanh để hiểu **đang có gì, gọi API thế nào, data thu thập ra sao, cần làm gì tiếp.**
> Dành cho CEO đọc trong 5 phút. Chi tiết kỹ thuật xem `README.md`.

**Domain production:** `https://hs-kb.uythacnhapkhau.com`

---

## 1. Dự án này để làm gì?

Một dịch vụ **API tra cứu HS code + thuế + chính sách** cho hệ thống ERP `erp-xnk` gọi sang. Bản chất công việc:

> **Thu thập tài liệu (biểu thuế, chú giải, văn bản pháp luật, tờ khai cũ) → chuẩn hoá thành dữ liệu sạch → phơi ra API chuẩn** để ERP (và chatbot tương lai) dùng, thay vì mỗi hệ thống tự tra tay.

Các năng lực chính API làm được:
1. **Xác định mã HS & định danh hàng** (`/api/classify` — chính, động cơ hai vòng; `/api/suggest`; `/api/identify` định danh hàng; `/api/match` đã deprecated)
2. **Tra thuế & căn cứ** theo mã HS (`/api/tax`, `/api/evidence-pack` gói căn cứ soát/giải trình)
3. **Sinh mô tả, soát tờ khai & giải trình** (`/api/describe` chuẩn TT 39/2018, `/api/declaration-check` soát tờ khai K1–K7, `/api/dispute-draft` soạn hồ sơ giải trình)

---

## 2. Chúng ta ĐANG CÓ GÌ (kho dữ liệu)

| Lớp dữ liệu | Số lượng | Dùng để |
|---|---|---|
| **Biểu thuế HS** | 11.871 mã | Tra thuế NK/ACFTA/VAT, tên hàng |
| **Chính sách đã bóc tách (AI)** | 7.929 mã (`tax-enriched.json`) | Cảnh báo giấy phép / kiểm tra / hạn ngạch khi NK |
| **Văn bản pháp luật** | 109 văn bản đánh index, **107 đã verify tiêu đề thật** | Trả tên + link văn bản gốc thay vì chỉ mã |
| **Chú giải chương/nhóm** | 97 chương (`chu-giai-chuong.json`) · 1.269 nhóm 4 số (100% — `chu-giai-heading.json`); `notes.json` 92 chương | Hỗ trợ phân loại đúng (quy tắc GIR) |
| **Sổ tay chú giải** | 1.243 nhóm (`data/so-tay/`) | Câu hỏi đặc điểm chốt 8 số, cổng loại trừ, ngưỡng và căn cứ dòng biểu |
| **Sổ ranh giới phân nhóm 6 số** | 2.140 phân nhóm (`data/ho-so/ranh-gioi/`) | Tiêu chí phân biệt ở cấp phân nhóm 6 số |
| **Ý kiến phân loại WCO** | 1.038 ý kiến (`data/wco-op/opinions.json`) | Ý kiến phân loại Compendium 2022 kèm bản dịch tham khảo |
| **Tiền lệ TB-TCHQ** | 1.099 mã HS trong biểu hiện hành (1.250 khoá mã) · 4.908 bản ghi | Dẫn chứng cách Hải quan đã phân loại; thu thập từ nguồn công khai, mỗi bản ghi kèm url |
| **Cảnh báo dễ nhầm** | 79 mã HS (`conflicts.json`) · 7 bảng quyết định (`conflict-tables.json`) | Chống nhầm mã và phân giải tất định |
| **Từ điển mâu thuẫn HS** | 320 mặt hàng | DN hay khai mã A, Hải quan hay ấn định mã B + tiêu chí phân biệt; `confusionAlerts[]` trong suggest/search |
| **Tờ khai cũ của Oz** | 10.283 tờ (dữ liệu riêng tư) | AI học từ lịch sử thực tế của công ty |
| **Bộ ngành quản lý** | 14 bộ | Ánh xạ mã HS → cơ quan cấp phép |

Ngoài ra còn: chú giải chi tiết (explanatory notes), mã loại hình XNK (QĐ 1357), từ điển thuật ngữ, đơn vị tính TCHQ, bản đồ thương hiệu → sản phẩm...

---

## 3. Gọi API thế nào?

**Xác thực:** nhóm tra cứu chỉ đọc và 4 đường AI (`suggest`, `describe`, `classify`, `match`) mở công khai, không cần
token (CEO chốt 09/10/2026 — xem `AGENTS.md` mục 2). Nhóm quản trị, ghi dữ liệu và các endpoint kín (`/api/identify`, `/api/declaration-check`, `/api/evidence-pack`, `/api/dispute-draft`, `/api/confusion-pairs`) cần header:
```
Authorization: Bearer <HS_API_TOKEN>
```

**Các endpoint chính** (nhóm theo mục đích):

| Mục đích | Endpoint |
|---|---|
| Kiểm tra dịch vụ sống | `GET /api/health` (không cần token) |
| Tra thuế 1 mã HS | `GET /api/tax?hs=85171300` (mở công khai) |
| Tìm HS theo từ khoá | `GET /api/search?q=điện thoại` (mở công khai) |
| Phân loại HS (chính, động cơ hai vòng) | `POST /api/classify` (mở công khai) |
| Gợi ý HS bằng AI | `POST /api/suggest` (mở công khai, body: `{description}`) |
| Định danh hàng hoá | `POST /api/identify` (Bearer) |
| Soát tờ khai (K1–K7) | `POST /api/declaration-check` (Bearer) |
| Gói căn cứ soát/giải trình | `POST /api/evidence-pack` (Bearer) |
| Soạn hồ sơ giải trình | `POST /api/dispute-draft` (Bearer) |
| Sản phẩm ERP → HS | `POST /api/match` (**[DEPRECATED]** — dùng `/api/classify` hoặc `/api/suggest`) |
| Sinh mô tả khai báo | `POST /api/describe` (mở công khai) |
| **Tra văn bản pháp luật** | `GET /api/legal-docs` · `GET /api/legal-docs/:code` (mở công khai) |
| **Ý kiến phân loại WCO** | `GET /api/wco-opinions?hs=` (mở công khai) |
| Chú giải chương | `GET /api/notes?chapter=39` (mở công khai) |
| Tiền lệ / cảnh báo nhầm | `GET /api/precedents?hs=` · `GET /api/conflicts?hs=` (mở công khai) · `GET /api/confusion-pairs?q=` (Bearer) |

Ví dụ:
```bash
# Tra thuế mở công khai, không cần Bearer token:
curl "https://hs-kb.uythacnhapkhau.com/api/tax?hs=85171300"
```

> Chi tiết riêng thư viện văn bản pháp luật: xem **`docs/legal-docs-api.md`**.

---

## 4. API trả kết quả dạng gì?

JSON, tên trường **camelCase** đúng chuẩn ERP mong đợi.

**a) Tra thuế** — `/api/tax?hs=85171300`:
```json
{
  "hsCode": "85171300",
  "nameVi": "Điện thoại thông minh",
  "taxNkPreferential": 0,
  "taxAcfta": 0,
  "taxVat": 10,
  "hasPolicyWarning": true,
  "warnings": {
    "summary": "Hàng thuộc diện quản lý chuyên ngành...",
    "legalCitations": [
      { "code": "11/2020/TT-BTTTT", "titleVi": "...", "url": "https://...", "status": "ACTIVE" }
    ]
  }
}
```
→ ERP chỉ cần đọc `titleVi` + `url` để hiển thị văn bản, không phải tự tra.

**b) Văn bản pháp luật** — `/api/legal-docs`:
```json
{
  "total": 109,
  "items": [
    { "code": "113/2017/ND-CP", "titleVi": "Quy định chi tiết... Luật Hóa chất",
      "issuerFullVi": "Chính phủ", "status": "AMENDED", "url": "https://...",
      "issuedDate": "2017-10-09", "scopeHsChapters": ["28","29","39"],
      "citedInHsCount": 120, "severityMax": "HIGH", "verified": true }
  ]
}
```
> Văn bản đã verify có `verified: true` + `titleVi`/`url` thật; còn lại (2/109) đang là placeholder chờ verify.

**c) Gợi ý HS (AI)** — `/api/suggest`: trả danh sách mã ứng viên + độ tin cậy + `girRulesApplied` (audit trail) + `evidenceTrace` (tiền lệ Oz tương tự).

---

## 5. Chúng ta thu thập & chuẩn hoá data thế nào?

Dữ liệu đi qua **pipeline nhiều lớp**, mỗi lớp làm sạch thêm:

```
Nguồn thô                        →  Script chuẩn hoá            →  File sạch              →  API
─────────────────────────────────────────────────────────────────────────────────────────────
Biểu thuế TCHQ (Excel)           →  import + snapshot           →  tax.json (11,871 mã)   →  /api/tax
Cột chính sách (chữ tự do)       →  Gemini bóc tách (AI)        →  tax-enriched.json      →  warnings
Mã VB trong chính sách           →  extract-legal-refs.mjs      →  legal-docs.json (109)  →  /api/legal-docs
Tiêu đề VB (tra tay, chính thống)→  legal-doc-titles.json       →  apply-verified-titles  →  titleVi thật (107)
Kho tri thức cũ (hs-knowledge)   →  import-legacy               →  notes/precedents/...   →  /api/notes...
Tờ khai Excel của Oz (riêng tư)  →  import + embed vector       →  oz-declarations        →  /api/suggest
```

**Nguyên tắc bất biến:**
- **Không bịa dữ liệu.** Tiêu đề văn bản chỉ ghi khi đã đối chiếu nguồn chính thống (congbao.chinhphu.vn, vbpl.vn, thuvienphapluat.vn...).
- **Dữ liệu verify không mất khi rebuild** (lưu riêng ở `legal-doc-titles.json`).
- **Dữ liệu khách hàng (tờ khai Oz) không commit công khai** (gitignore).
- Mỗi lớp có **test tự động** (VD `npm run test:legal-docs` → 16/16).

---

## 6. Đang CẦN GÌ TIẾP?

> **Định hướng & hiện trạng mới nhất (25/11/2026):** xem luật phân loại cao nhất [`ADR-0004`](decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md), kế hoạch đồ thị tri thức [`docs/ke-hoach-do-thi-tri-thuc-hs.md`](ke-hoach-do-thi-tri-thuc-hs.md), biên bản soát dữ liệu [`docs/soat-du-lieu-2026-11.md`](soat-du-lieu-2026-11.md) và bàn giao ca [`docs/activeContext.md`](activeContext.md).

Toàn bộ roadmap ở **GitHub Issue #34** (single source of truth). Tóm tắt việc làm dần:

1. **Verify nốt các văn bản pháp luật còn lại** — hiện **chỉ còn 2/109 văn bản chưa verify tiêu đề** (107/109 đã verify); thêm tiêu đề mới vào `legal-doc-titles.json` rồi chạy `node scripts/apply-verified-titles.mjs`.
2. **Re-enrich 28 mã** chính sách text đã đổi (khi có key AI).
3. **CEO review 457 mã thiếu thuế VAT** (đa số chương 98 ưu đãi — xác nhận hợp lệ hay thiếu).
4. **Đào sâu mô tả nhóm "Loại khác"** trùng tên (dễ phân loại nhầm).
5. **Bổ sung 457 tên tiếng Anh** còn thiếu.
6. **Benchmark độ chính xác** `/api/suggest` trên 200 mẫu thật (cần chạy máy CEO có key).

**Đã tạm hoãn** (quyết định CEO): chatbot công khai + landing SEO (Track B) — ưu tiên data/API nội bộ trước.

---

*Cập nhật: 2026-11-21. Thư mục tài liệu: `README.md` (kỹ thuật đầy đủ) · `docs/legal-docs-api.md` (API văn bản) · `docs/TONG-QUAN.md` (file này).*
