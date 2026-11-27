---
name: oz-hs-code-ops
description: >-
  Operational runbook for safely inspecting, modifying, verifying, and preparing
  PRs in Oz Vietnam's hs-code-api repository. Use this skill whenever working on
  hs-code-api code, knowledge tables, feature flags, declaration checks, or PR
  reviews under L1-L11 customer-path governance.
---

# `hs-code-api` Operations & Safe-Change Runbook

Follow this runbook before editing `api/`, `lib/`, `data/`, or preparing a PR on `ozvietnam/hs-code-api`.

## 1. Mandatory Read Order

Before changing code or data, read in order:
1. `docs/activeContext.md` — active handoffs, open exceptions (`OZV-1670`, `OZV-1707`), and upcoming flag review dates (e.g., `HS_HO_SO=shadow`).
2. `docs/luat-duong-khach.md` — customer-path laws **L1–L11** and the 5-stage Mermaid pipeline (`docs/decisions/0001-luat-duong-khach-va-bang-dau-noi.md`).
3. `CLAUDE.md` — immutable repo rules 1–10, LLM chain (`lib/llm-tier.js` → `lib/llm.mjs`), privacy wrappers (`withPrivateData()` vs `withHangHoa()`), and PR merge rules.
4. `data/luat/dau-noi.json` — single source of truth for which routes read which stores (`soTayNhom`, `soPn6`, `tienLe`, `chuGiai`), question core (`loiCauHoi`), and known bypass branches (`nhanhBoQua`).
5. `data/luat/bang-co.json` — single source of truth for every `HS_*` flag (`macDinh`, `doiQuyetDinhLLM`, `chu`, `chungCu`, and `bong` metadata for `shadow` flags).

> Never cite any `HS_*` env var in `CLAUDE.md` or `AGENTS.md` unless it exists in `data/luat/bang-co.json` (`scripts/test-bang-co.mjs` fails on undeclared tokens). Keep counts in `AGENTS.md` and `public/llms.txt` aligned with `scripts/test-doc-counts.mjs`.

## 2. Public Allowlist vs Private Endpoints (`lib/public-access.js`)

`lib/public-access.js` enforces an **explicit GET/HEAD allowlist** (`requireAuthUnlessPublic`). Anything omitted defaults to requiring Bearer auth (`requireAuth` in `lib/auth.js`).

- **Public read endpoints (`PUBLIC_ENDPOINTS`)**: `tax`, `search`, `notes`, `kg_chapter`, `customs-types`, `destination-facts`.
- **Public `/api/dataset` resources (`PUBLIC_DATASET_RESOURCES`)**: `kg_stats`, `chapters`, `conflicts`, `precedents`, `hieu_luc_sap_doi`, `hs_tree`, `wco_opinions`, `materials`, `material_taxonomy`, `ministries`, `legal_docs`, `legal_doc`, `policy_procedures`, `products`, `accuracy`, `data_quality`, `declaration_fields`, `chapter_declaration_fields`, `attribute_synonyms`, `ktcn_regime`, `legal_status`, `demand`, `rui_ro_phan_loai`.
- **Intentionally private (Bearer required)**:
  - Internal/unverified dataset resources: `admin_overview`, `admin_audit`, `admin_suggestions`, `kpi`, `error_log`, `prompt_versions`, `oz_precedents`, `confusion_pairs`, `trademark`.
  - Write, admin, and sensitive routes: `feedback`, `tariff` (`versions`, `version/diff`, `admin/*`), `identify`, `declaration-check`, `evidence-pack`, `dispute-draft`, `declaration-sheet`, `extract-specs`.
- **Public LLM endpoints** (`suggest`, `describe`, `classify`, `match`): governed separately by `lib/public-llm.js` (`requireAuthOrPublicLlm`, emergency kill switch `HS_PUBLIC_LLM=false`).

## 3. Declaration-Check (`K1`–`K7`) & Pre-Lock Architecture

- **`lib/declaration-check.js` (`POST /api/declaration-check`)**: accepts anonymized `SoatToKhaiInput` (`.strict()`) and always returns all 7 groups `K1`–`K7` (`DAT | CANH_BAO | LOI | CHUA_KIEM`, never silently omitting a group; `HEURISTIC`/`LLM_ASSERTED` cannot exceed `CANH_BAO`):
  - **K1**: Description quality per TT 39/2018 (`lib/declaration-validator.js` on user-written text).
  - **K2**: Description ↔ HS code (`kiemMa: true` runs `lib/classify.js` + `lib/evidence-pack.js` on "Loại khác"/divergent precedents; slice-1 uses `lib/ho-so/soat.js` when `HS_HO_SO=on`; optional deterministic pre-check `HS_K2_DOC_LAP=on` defaults OFF).
  - **K3**: Declared tariff vs `data/tax.json` (MFN, ordinary, ACFTA via `lib/acfta.js`).
  - **K4**: ACFTA / C/O Form E (`lib/acfta.js`, origin hints `lib/origin-hints.js`; C/O document proof → `CHUA_KIEM`).
  - **K5**: Specialized inspection & licenses (`lib/tax-lookup.js`, trademark watch `lib/trademark-watch.js`; physical-nature rules → `CHUA_KIEM`).
  - **K6**: Valuation self-checks (reference price comparison → `CHUA_KIEM`).
  - **K7**: Technical dossier TT 85/2026 strictly via `lib/legal-basis.js`.
- **`lib/evidence-pack.js` (`POST /api/evidence-pack` / `dataset.js?resource=evidence_pack`)**: deterministic, read-only, zero-LLM 9-section evidence bundle (`viTri`, `chuGiai`, `loaiKhac`, `gir`, `canCuPhapLy`, `yKienWco`, `tienLe`, `capDeNham`, `thue`); unqueried sections return `CHUA_TRA_CUU`.
- **`lib/kiem-truoc-chot.js`**: runs deterministic pre-lock checks before `/api/classify` emits `CHOT` + low risk (`luatLoaiKhac` for "Loại khác" sibling exclusions, `tienLeGiongTheoMa` for matching TB-TCHQ pointing elsewhere, plus flagging ungrounded negations in AI reasons). Downgrades `CHOT` → `DE_XUAT` + review flag (`HEURISTIC`); never chooses a code itself.

## 4. L1–L11 Quick Governance Checklist

| Law | Rule | Verification |
|---|---|---|
| **L1** | Customer-path LLM changes behind default-OFF `HS_*` flag (`doiQuyetDinhLLM: true`), sha256 `OFF == origin/main`, measured on real Gateway model chain | `test-bang-co.mjs` + `test-kiem-pr-l1.mjs` + reviewer |
| **L2** | Single question core (`lib/so-tay-cau-hoi.js` / `lib/hoi-theo-so-tay.js`); every customer question has `canCu` + `nguon` | `test-cau-hoi-co-can-cu.mjs` |
| **L3** | Only classify engine (`lib/engine-loop.js` / `lib/classify.js`) picks heading/subheading; tests prove mechanism + negative case | Reviewer |
| **L4** | `data/luat/dau-noi.json` updated in same PR as route/store wiring changes | `test-dau-noi.mjs` |
| **L5** | Shadow runs never `await` before customer response; `shadow` flags declare `bong` owner + review date | `test-bang-co.mjs` + shadow test |
| **L6** | Distinguish "not checked" (`CHUA_KIEM` / `null`) from "checked, empty" | Reviewer |
| **L7** | Metrics exclude N/A from denominators and report command, model, sample count, date | Reviewer |
| **L8** | Docs & `Dockerfile` match `data/luat/bang-co.json` | `test-bang-co.mjs` |
| **L9** | Web-search benchmarks in dev run at most 1 pass (shared IP with prod) | Reviewer |
| **L10** | Stacked PRs declare `Gộp sau #N` or `Gộp trước #N` on line 1 | Reviewer |
| **L11** | Optimization/early-exit branches check deterministic counter-signals, log `CHUA_CHAY`, declare `nhanhBoQua`, and report heading accuracy | `test-dau-noi.mjs` + reviewer |

## 5. Exact Verification Commands

### Dependency Check (Worktree / Agent Env Trap)
Agent shells often set `NODE_ENV=production`, causing plain `npm ci` to silently skip `devDependencies` (`xlsx`, `pdf-parse`, `@electric-sql/pglite`). Always install with:
```bash
npm ci --include=dev
```

### Offline Declaration-Check Bench
```bash
# Fast ~1 min gate on right cases (exits 1 if K2 false positive > 15%, false LOI, or non-deterministic)
node scripts/bench-soat.mjs --nhanh --kiem

# Full 198-case planted-error before/after comparison (no LLM, offline)
node scripts/bench-soat.mjs

# Persist aggregate baseline to data/bench/soat-nen.json (no customer descriptions)
node scripts/bench-soat.mjs --ghi
```

### Gate Scripts (Run Locally Instead of 26-Minute `npm test`)
```bash
node scripts/test-doc-counts.mjs
node scripts/test-bang-co.mjs
node scripts/test-dau-noi.mjs
node scripts/test-so-do-mermaid.mjs
node scripts/test-cong-cu-vong-3.mjs
node scripts/test-cau-hoi-co-can-cu.mjs
node scripts/test-kiem-pr-l1.mjs
```
If `data/luat/dau-noi.json` changed, regenerate the Mermaid diagram first with `npm run gen:diagrams`.

### Test Log Proof (`dem-ca-test.mjs`)
Never trust `=== ALL TESTS PASSED ===` in isolation (it prints mid-suite) and never claim "green" without counting real cases + `EXIT=0`:
```bash
{
  node scripts/test-doc-counts.mjs &&
  node scripts/test-bang-co.mjs &&
  node scripts/test-dau-noi.mjs &&
  node scripts/test-so-do-mermaid.mjs &&
  node scripts/test-cong-cu-vong-3.mjs &&
  node scripts/test-cau-hoi-co-can-cu.mjs &&
  node scripts/test-kiem-pr-l1.mjs &&
  node scripts/bench-soat.mjs --nhanh --kiem;
} > /tmp/oz-gates.log 2>&1; echo "EXIT=$?" >> /tmp/oz-gates.log

node scripts/dem-ca-test.mjs /tmp/oz-gates.log
```
Get the full-suite count from GitHub Actions CI (`test-all.yml`) and verify its `head_sha` matches the PR's latest commit. When dry-run merging a PR locally, use named refs (`git fetch origin pull/<N>/head:refs/pr<N>-head --force` — never `FETCH_HEAD`) and verify `git diff --stat origin/main HEAD`.

## 6. PR Body Checklist (`.github/pull_request_template.md`)

Every `hs-code-api` PR body (`agy/...` → `main`) must include:
1. `**Thứ tự gộp (L10):**` (`Độc lập`, or `Gộp sau #N` / `Gộp trước #N`).
2. `## Vì sao` — real incident or `OZV-*` issue link.
3. `## Thay đổi` — modified files and behavior.
4. `## Luật đường khách` — **L1** answered with *exactly one* of:
   - `Không đổi hành vi LLM: <concrete justification>` (delete switch/measurement lines), **OR**
   - `Công tắc: \`HS_...\`` + OFF==`main` sha256 checkboxes + `### Đo bằng chuỗi mô hình máy thật` (or explicit `"chưa đo"` + owner if awaiting QT activation on prod).
   - Checkboxes **L2, L3, L4, L5, L6, L7, L8, L11** (explicitly mark `"không áp dụng"` if untouched).
5. `## Test` — exact commands, `dem-ca-test.mjs` case count + `EXIT=0`, plus CI `test-all.yml` run result.
6. `## Chưa kiểm / giới hạn` — unverified edges or pending prod checks.
