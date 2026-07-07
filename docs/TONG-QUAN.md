# Tổng quan dự án `hs-code-api`

> Bản đồ nhanh để hiểu **đang có gì, gọi API thế nào, data thu thập ra sao, cần làm gì tiếp.**
> Dành cho CEO đọc trong 5 phút. Chi tiết kỹ thuật xem `README.md`.

**Domain production:** `https://hs-kb.uythacnhapkhau.com`

---

## 1. Dự án này để làm gì?

Một dịch vụ **API tra cứu HS code + thuế + chính sách** cho hệ thống ERP `erp-xnk` gọi sang. Bản chất công việc:

> **Thu thập tài liệu (biểu thuế, chú giải, văn bản pháp luật, tờ khai cũ) → chuẩn hoá thành dữ liệu sạch → phơi ra API chuẩn** để ERP (và chatbot tương lai) dùng, thay vì mỗi hệ thống tự tra tay.

3 việc chính API làm được:
1. **Xác định mã HS** cho một mặt hàng (`/api/suggest`, `/api/match` — có AI)
2. **Tra thuế** theo mã HS (`/api/tax`)
3. **Sinh mô tả khai báo Hải quan** chuẩn TT 39/2018 (`/api/describe`)

---

## 2. Chúng ta ĐANG CÓ GÌ (kho dữ liệu)

| Lớp dữ liệu | Số lượng | Dùng để |
|---|---|---|
| **Biểu thuế HS** | 11,871 mã | Tra thuế NK/ACFTA/VAT, tên hàng |
| **Chính sách đã bóc tách (AI)** | 7,928 mã (100%) | Cảnh báo giấy phép / kiểm tra / hạn ngạch khi NK |
| **Văn bản pháp luật** | 108 văn bản đánh index, **30 đã verify tiêu đề thật (= 99% lượt trích dẫn)** | Trả tên + link văn bản gốc thay vì chỉ mã |
| **Chú giải chương/nhóm** | 87 chương | Hỗ trợ phân loại đúng (quy tắc GIR) |
| **Tiền lệ TB-TCHQ** | 242 mã HS | Dẫn chứng cách Hải quan đã phân loại |
| **Cảnh báo dễ nhầm** | 57 mã HS | Chống nhầm mã |
| **Tờ khai cũ của Oz** | 10,283 tờ (dữ liệu riêng tư) | AI học từ lịch sử thực tế của công ty |
| **Bộ ngành quản lý** | 14 bộ | Ánh xạ mã HS → cơ quan cấp phép |

Ngoài ra còn: chú giải chi tiết (explanatory notes), mã loại hình XNK (QĐ 1357), từ điển thuật ngữ, đơn vị tính TCHQ, bản đồ thương hiệu → sản phẩm...

---

## 3. Gọi API thế nào?

**Xác thực:** mọi endpoint (trừ `/api/health`) cần header:
```
Authorization: Bearer <HS_API_TOKEN>
```

**Các endpoint chính** (nhóm theo mục đích):

| Mục đích | Endpoint |
|---|---|
| Kiểm tra dịch vụ sống | `GET /api/health` (không cần token) |
| Tra thuế 1 mã HS | `GET /api/tax?hs=85171300` |
| Tìm HS theo từ khoá | `GET /api/search?q=điện thoại` |
| Gợi ý HS bằng AI | `POST /api/suggest` (body: `{description}`) |
| Sản phẩm ERP → HS | `POST /api/match` |
| Sinh mô tả khai báo | `POST /api/describe` |
| **Tra văn bản pháp luật** | `GET /api/legal-docs` · `GET /api/legal-docs/:code` |
| Chú giải chương | `GET /api/notes?chapter=39` |
| Tiền lệ / cảnh báo nhầm | `GET /api/precedents?hs=` · `GET /api/conflicts?hs=` |

Ví dụ:
```bash
TOKEN=your_token
curl -H "Authorization: Bearer $TOKEN" \
  "https://hs-kb.uythacnhapkhau.com/api/tax?hs=85171300"
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
  "total": 108,
  "items": [
    { "code": "113/2017/ND-CP", "titleVi": "Quy định chi tiết... Luật Hóa chất",
      "issuerFullVi": "Chính phủ", "status": "AMENDED", "url": "https://...",
      "issuedDate": "2017-10-09", "scopeHsChapters": ["28","29","39"],
      "citedInHsCount": 120, "severityMax": "HIGH", "verified": true }
  ]
}
```
> Văn bản đã verify có `verified: true` + `titleVi`/`url` thật; còn lại đang là placeholder chờ verify dần.

**c) Gợi ý HS (AI)** — `/api/suggest`: trả danh sách mã ứng viên + độ tin cậy + `girRulesApplied` (audit trail) + `evidenceTrace` (tiền lệ Oz tương tự).

---

## 5. Chúng ta thu thập & chuẩn hoá data thế nào?

Dữ liệu đi qua **pipeline nhiều lớp**, mỗi lớp làm sạch thêm:

```
Nguồn thô                        →  Script chuẩn hoá            →  File sạch              →  API
─────────────────────────────────────────────────────────────────────────────────────────────
Biểu thuế TCHQ (Excel)           →  import + snapshot           →  tax.json (11,871 mã)   →  /api/tax
Cột chính sách (chữ tự do)       →  Gemini bóc tách (AI)        →  tax-enriched.json      →  warnings
Mã VB trong chính sách           →  extract-legal-refs.mjs      →  legal-docs.json (108)  →  /api/legal-docs
Tiêu đề VB (tra tay, chính thống)→  legal-doc-titles.json       →  apply-verified-titles  →  titleVi thật (30)
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

Toàn bộ roadmap ở **GitHub Issue #34** (single source of truth). Tóm tắt việc làm dần:

1. **Verify nốt ~78 văn bản pháp luật còn lại** (mỗi mã ít trích dẫn) — 30 đã verify đã phủ 99% lượt trích dẫn; thêm tiêu đề mới vào `legal-doc-titles.json` rồi chạy `node scripts/apply-verified-titles.mjs`.
2. **Re-enrich 28 mã** chính sách text đã đổi (khi có key AI).
3. **CEO review 457 mã thiếu thuế VAT** (đa số chương 98 ưu đãi — xác nhận hợp lệ hay thiếu).
4. **Đào sâu mô tả nhóm "Loại khác"** trùng tên (dễ phân loại nhầm).
5. **Bổ sung 457 tên tiếng Anh** còn thiếu.
6. **Benchmark độ chính xác** `/api/suggest` trên 200 mẫu thật (cần chạy máy CEO có key).

**Đã tạm hoãn** (quyết định CEO): chatbot công khai + landing SEO (Track B) — ưu tiên data/API nội bộ trước.

---

*Cập nhật: 2026-07-07. Thư mục tài liệu: `README.md` (kỹ thuật đầy đủ) · `docs/legal-docs-api.md` (API văn bản) · `docs/TONG-QUAN.md` (file này).*
