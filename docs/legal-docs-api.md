# API Thư viện văn bản pháp luật (`/api/legal-docs`)

> Mục tiêu: **thu thập + chuẩn hoá văn bản pháp luật → phơi ra API chuẩn** cho các hệ thống sau (ERP `erp-xnk`, chatbot tương lai) tra cứu.

## Nguồn dữ liệu (pipeline)

```
data/tax.json (cột cs)  ─┐
                          ├─►  scripts/extract-legal-refs.mjs  ──►  data/legal-docs.json  ──►  lib/legal-docs.js  ──►  /api/legal-docs
data/tax-enriched.json  ─┘        (extract, chuẩn hoá)            (index 108 văn bản)       (loader + tra cứu)     (HTTP API)
   (warnings.legalDocs)                    ▲
                                           │
                    data/legal-doc-titles.json  ──►  scripts/apply-verified-titles.mjs
                    (tiêu đề ĐÃ VERIFY, nguồn chính thống — không bịa)   (sơn tiêu đề thật lên index)
```

**Thêm/sửa tiêu đề:** cập nhật `data/legal-doc-titles.json` rồi chạy `node scripts/apply-verified-titles.mjs`.
`legal-doc-titles.json` là single source of truth cho tiêu đề đã verify — index có thể rebuild lại từ `tax-enriched.json` mà không mất tiêu đề (chỉ cần chạy lại apply).

Hiện trạng: **108 văn bản** trong index, **30 đã verify tiêu đề thật** (phủ ~99% lượt trích dẫn). Còn lại đang là placeholder `"Văn bản <mã> (cần bổ sung tiêu đề)"` chờ verify dần.

## Auth & CORS

Mọi endpoint yêu cầu Bearer token (`Authorization: Bearer $HS_API_TOKEN`). CORS bật sẵn. Base URL production: `https://hs-kb.uythacnhapkhau.com`.

---

## 1) Liệt kê / lọc — `GET /api/legal-docs`

Query params (tuỳ chọn, kết hợp được):

| Param | Ý nghĩa | VD |
|---|---|---|
| `chapter` | Lọc văn bản áp dụng cho chương HS (2 chữ số) | `?chapter=39` |
| `status` | `ACTIVE` \| `AMENDED` \| `REPLACED` | `?status=ACTIVE` |
| `issuer` | Mã bộ ngành: `CP` `TTg` `BCT` `BTC` `BYT` `BTTTT` `BKHCN` `BCA` `BQP` `BXD`... | `?issuer=BCT` |

```bash
curl -H "Authorization: Bearer $HS_API_TOKEN" \
  "https://hs-kb.uythacnhapkhau.com/api/legal-docs?issuer=BCT&status=ACTIVE"
```

Response:

```json
{
  "total": 12,
  "chapter": "all",
  "items": [ { "code": "...", "titleVi": "...", "verified": true, "...": "..." } ]
}
```

- `items` — mảng văn bản (shape đầy đủ ở mục 3).

---

## 2) Tra 1 văn bản — `GET /api/legal-docs/:code`

Mã văn bản chứa dấu `/` (VD `08/2023/TT-BCT`) nên khi đặt trong path phải **URL-encode dấu `/` thành `%2F`**:

```bash
# 08/2023/TT-BCT  →  08%2F2023%2FTT-BCT
curl -H "Authorization: Bearer $HS_API_TOKEN" \
  "https://hs-kb.uythacnhapkhau.com/api/legal-docs/08%2F2023%2FTT-BCT"
```

Chấp nhận mã có/không dấu tiếng Việt (`QĐ`≡`QD`, `NĐ`≡`ND`).

Tìm thấy → `200`:
```json
{ "found": true, "code": "08/2023/TT-BCT", "titleVi": "...", "...": "..." }
```

Không có trong catalog → `404`:
```json
{ "found": false, "code": "99/9999/XX-YYY", "message": "Legal document not in catalog" }
```

> **Lưu ý:** dạng slug đổi `/`→`-` (`08-2023-TT-BCT`) **chưa** được hỗ trợ ở bản hiện tại — dùng dạng encode `%2F`. (Slug lookup nằm trong backlog Issue #34.)

---

## 3) Shape 1 văn bản (đầy đủ)

```json
{
  "code": "113/2017/ND-CP",
  "type": "Nghị định",
  "year": 2017,
  "issuer": "CP",
  "issuerFullVi": "Chính phủ",
  "titleVi": "Quy định chi tiết và hướng dẫn thi hành một số điều của Luật Hóa chất",
  "url": "https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-113-2017-nd-cp-24884/19507.htm",
  "status": "AMENDED",
  "domain": ["GIẤY_PHÉP", "KIỂM_DỊCH", "KIỂM_TRA_CHẤT_LƯỢNG", "LƯỠNG_DỤNG"],
  "scopeHsChapters": ["25", "26", "28", "29", "39", "..."],
  "sections": ["PL1", "PL3", "PL5", "..."],
  "citedInHsCount": 667,
  "contextCounts": { "license": 548, "inspection": 103, "quarantine": 1, "dualUse": 8 },
  "severityMax": "CRITICAL",
  "sampleHsCodes": ["25249000", "26201100", "..."],
  "issuedDate": "2017-10-09",
  "effectiveDate": "2017-11-25",
  "replacedBy": "82/2022/ND-CP",
  "verified": true,
  "verifiedSource": "congbao.chinhphu.vn"
}
```

| Trường | Ý nghĩa |
|---|---|
| `code` | Mã chuẩn hoá (canonical, `NĐ`→`ND`, `QĐ`→`QD`) |
| `type` | Loại văn bản (Thông tư / Nghị định / Quyết định...) |
| `issuer` / `issuerFullVi` | Cơ quan ban hành (mã + tên đầy đủ) |
| `titleVi` | Tiêu đề/trích yếu tiếng Việt |
| `url` | Link văn bản gốc (verified) hoặc link tra cứu vbpl.vn (chưa verify) |
| `status` | `ACTIVE` / `AMENDED` / `REPLACED` |
| `domain` | Nhóm quản lý: giấy phép / kiểm dịch / kiểm tra chất lượng / lưỡng dụng |
| `scopeHsChapters` | Các chương HS mà văn bản áp dụng |
| `sections` | Phụ lục/mục được trích (VD `PL1`, `PL5`) |
| `citedInHsCount` | Số mã HS trích dẫn văn bản này (dùng ưu tiên verify) |
| `contextCounts` | Đếm theo ngữ cảnh: license / inspection / quarantine / dualUse |
| `severityMax` | Mức độ cao nhất: `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| `sampleHsCodes` | Vài mã HS ví dụ có trích dẫn |
| **`verified`** | `true` = tiêu đề đã đối chiếu nguồn chính thống; thiếu/`false` = placeholder |
| **`verifiedSource`** | Nguồn đã đối chiếu (vbpl.vn / congbao.chinhphu.vn...) |
| **`issuedDate`** / **`effectiveDate`** | Ngày ban hành / hiệu lực (ISO `YYYY-MM-DD`) — chỉ có ở văn bản verified |
| **`replaces`** / **`replacedBy`** | Quan hệ thay thế văn bản (nếu có) |

> Các trường **in đậm** được `apply-verified-titles.mjs` bổ sung từ `legal-doc-titles.json`.

---

## 4) Trích dẫn nhúng trong `/api/tax`

Khi tra thuế 1 mã HS, `/api/tax?hs=...` tự đính kèm văn bản liên quan ở `warnings.legalCitations` (shape gọn, lấy từ index — nên văn bản đã verify sẽ có `titleVi` + `url` thật):

```json
{
  "warnings": {
    "legalCitations": [
      {
        "code": "113/2017/ND-CP",
        "type": "Nghị định",
        "issuer": "CP",
        "issuerFullVi": "Chính phủ",
        "titleVi": "Quy định chi tiết và hướng dẫn thi hành một số điều của Luật Hóa chất",
        "url": "https://congbao.chinhphu.vn/...",
        "status": "AMENDED"
      }
    ]
  }
}
```

Hệ thống sau chỉ cần đọc `titleVi` + `url` để hiển thị, không phải tự parse mã văn bản.

---

## 5) Test

```bash
npm run test:legal-docs   # 16 test: index (≥80 VB), getDocByCode normalize, listDocs filter,
                          # enrichLegalCitations, + data-quality-report
```
