# CLAUDE.md — Rules cho Claude Code khi work trên `hs-code-api`

File này được Claude Code load mỗi khi mở repo. CEO là **solo dev** với Claude.

## Mục tiêu service

Service HTTP API cho ERP `erp-xnk` gọi sang để:
1. **Xác định mã HS code** (`POST /api/suggest` — AI Gemini + GIR ranking)
2. **Tra thuế** (`GET /api/tax?hs=X`)
3. **Sinh mô tả khai báo Hải quan** (`POST /api/describe` — chuẩn TT 39/2018)

Plus phục vụ tương lai chatbot công khai (Track B, T6/2026).

## Tech stack

- Node.js Vercel functions (serverless) — KHÔNG dùng Next.js framework
- Data: JSON files trong `data/` (no DB cho serverless cold start nhanh)
- AI: Gemini 2.5 Flash (rerank, describe) + Gemini Embedding 001 (semantic search)
- Auth: Bearer token (`HS_API_TOKEN` env)
- Deploy: Vercel project `hs-code-api`

## Cấu trúc dự án

```
api/               # 12 endpoint handlers (each = 1 Vercel function)
  health.js          # Public — health check
  tax.js             # Bearer — tra thuế
  search.js          # Bearer — search HS
  suggest.js         # Bearer — AI suggest
  describe.js        # Bearer — AI describe
  feedback.js        # Bearer — capture director feedback
  notes.js, conflicts.js, precedents.js, ...
  admin/overview.js  # Bearer admin — dashboard stats
  match.js           # Bearer — OZSource ERP product → HS

lib/               # Business logic
  data.js, auth.js, cors.js, gemini.js
  search-utils.js, tax-mapper.js
  declaration-validator.js, gir-engine.js
  ministries.js, taxonomy.js, glossary.js
  legal-docs.js, customs-types.js, tariff-versions.js
  ...

data/              # Lookup tables + main dataset
  tax.json (4.3 MB)       # 11,871 HS code chính
  notes.json              # Chú giải
  precedents.json         # TB-TCHQ
  conflicts.json          # HS dễ nhầm
  tax-enriched.json       # Gemini policy parse
  ministries-vn.json      # 14 bộ ngành
  legal-docs.json         # Văn bản pháp luật
  customs-types.json      # Mã loại hình XNK
  taxonomy/               # polymer/wood/fiber/chemical/metal
  versions/               # Tariff versioning history
  oz-export/              # CEO drop ECUS data (PRIVATE, gitignored)

scripts/           # Admin CLI tools
public/admin/      # Admin Dashboard UI (HTML/JS)
tests/             # Test fixtures
```

## Workflow khi CEO yêu cầu feature

1. **Đọc context** — check Issue link, related files trong `lib/` + `data/`
2. **Brainstorm ngắn** (skill `superpowers:brainstorming`) — nếu phức tạp
3. **Code thẳng** — anh code direct main (không có PR review, solo)
4. **Test local** — `npx vercel dev` hoặc test endpoint qua `curl`
5. **Commit incremental** — mỗi feature 1 commit có message rõ
6. **Push origin main** — Vercel auto-deploy production
7. **Verify** — curl production endpoint check OK

## Rule bất biến

1. **Privacy data** — KHÔNG bao giờ commit `data/oz-export/*.{xlsx,csv,jsonl}` (gitignored). Đây là tờ khai cũ Oz có thông tin khách hàng.
2. **Bearer auth** — TẤT CẢ endpoint trừ `/api/health` phải check `requireAuth(req, res)` từ `lib/auth.js`.
3. **CORS** — luôn `setCors(res)` + `handleOptions(req, res)` ở đầu handler.
4. **camelCase response** — chuẩn shape camelCase cho ERP, dùng `lib/tax-mapper.js`.
5. **Compliance TT 39/2018** — `/api/describe` phải trả structured `declaration` + `compliance.score` + `level` + `warnings[]`.
6. **GIR audit trail** — `/api/suggest` response phải có `girRulesApplied[]` (Issue #24).
7. **Vercel Hobby limit** — không tạo > 12 function (đã merge routes qua `vercel.json` rewrites).

## Tham chiếu pháp luật quan trọng

- **TT 39/2018/TT-BTC** mục 1.78 — yêu cầu mô tả hàng hóa khai báo
- **CV 5189/TCHQ-GSQL** (2019), **CV 755/TCHQ-GSQL** (2020) — quy định chống mô tả mơ hồ
- **6 quy tắc GIR (WCO)** — chuẩn quốc tế phân loại HS code
- **QĐ 1357/QĐ-TCHQ** — mã loại hình XNK

## Issues + Roadmap

- GitHub: https://github.com/ozvietnam/hs-code-api/issues
- Master meta: Issue #14
- Roadmap dual-track: Issue #34 (ERP + Chatbot tương lai)
- Cleanup tracking: Issue #35

## Khi hết context / session mới

Đọc theo thứ tự:
1. `README.md` — picture tổng
2. `CLAUDE.md` — file này
3. GitHub Issue đang work (link CEO paste hoặc đọc `gh issue list`)
4. `data/*.json` (skim sample 3 row)
5. `api/<endpoint-quan-tâm>.js` + `lib/<helper-liên-quan>.js`

## Khi CEO hỏi

**"Làm tiếp issue #X giúp anh"** → `gh issue view X` → đọc spec → code thẳng.

**"Review code/PR"** → `git diff` → check 7 rule bất biến + compliance.

**"Service đang OK không?"** → `curl /api/health` + xem latest deploy `vercel ls`.

**"Đẩy lên Vercel"** → `git push origin main` (Vercel auto-deploy) + verify production.

## Commit message format

```
<type>(<scope>): <vi-subject> (#issue)

[optional body]
```

`<type>` ∈ `feat|fix|refactor|test|docs|chore|perf|deploy`
`<scope>` ∈ `auth|tax|search|suggest|describe|feedback|admin|gir|data|deploy|...`

## ⚠️ Tránh

- ❌ Code 10h liên tục — sleep đủ
- ❌ Push main mà chưa test local
- ❌ Commit `.env`, `data/oz-export/*`, hoặc bất kỳ thông tin khách hàng nào
- ❌ Xây mới khi GitHub đã có repo cũ tương tự — luôn `gh repo list ozvietnam --limit 100` trước
- ❌ Promise compliance nhưng không validate structured (TT 39/2018)
