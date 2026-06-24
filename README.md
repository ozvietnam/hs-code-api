# hs-code-api

Lightweight HS Code + tariff API for ERP `erp-xnk`.

**Live:** https://hs-code-api-thangs-projects-4472c6e9.vercel.app

## Auth

All endpoints except `/api/health` require:

```http
Authorization: Bearer $HS_API_TOKEN
```

Set on Vercel:

```bash
vercel env add HS_API_TOKEN production
vercel env add GEMINI_API_KEY production
vercel env add GEMINI_RERANK_MODEL production   # optional, default gemini-2.5-flash
vercel env add GEMINI_DESCRIBE_MODEL production # optional, default gemini-2.5-flash
vercel env add GEMINI_ENRICH_MODEL production   # optional, default gemini-2.5-pro (offline enrich script only)
vercel env add HS_MATCH_PUBLIC production       # optional: "true" = /api/match without Bearer token
vercel env add CORS_ORIGINS production          # optional comma list; defaults include ERP + localhost
```

Local fallback LLM (OpenRouter free models): copy [`.env.example`](.env.example) → `.env`, set `OPENROUTER_API_KEY`, then `npm run openrouter:ping`. See **[docs/openrouter.md](docs/openrouter.md)**.

\* When `HS_MATCH_PUBLIC=true`, `/api/match` skips Bearer auth (for server-to-server ERP). Other routes still require `HS_API_TOKEN`.

Generate token:

```bash
openssl rand -hex 32
```

## Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/health` | GET | No | Service health + config checks |
| `/api/tax?hs=` | GET | Yes | Tariff lookup (camelCase) |
| `/api/search?q=` | GET | Yes | Keyword / HS search |
| `/api/match` | POST | Optional* | Multilingual product → top-K HS (OZSource ERP) |
| `/api/notes?chapter=` | GET | Yes | Chapter notes |
| `/api/conflicts?hs=` | GET | Yes | HS conflict/risk details |
| `/api/precedents?hs=` | GET | Yes | TB-TCHQ precedent list by HS |
| `/api/suggest` | POST | Yes | AI HS suggestions (Gemini) |
| `/api/describe` | POST | Yes | AI customs description (Gemini) |
| `/api/feedback` | POST | Yes | Capture director override feedback |
| `/api/kg_chapter?chapter=` | GET | Yes | List HS codes in chapter |
| `/api/kg_stats` | GET | Yes | Dataset overview (rewrite → `/api/dataset?resource=kg_stats`) |
| `/api/versions` | GET | Yes | Tariff snapshot index (rewrite → `/api/tariff?op=versions`) |
| `/api/version?id=` | GET | Yes | Snapshot metadata (rewrite → `/api/tariff?op=detail`) |
| `/api/version/diff?from=&to=` | GET | Yes | Diff snapshots (rewrite → `/api/tariff?op=diff`) |
| `/api/admin/overview` | GET | Yes | Admin KPI JSON (rewrite → `/api/dataset?resource=admin_overview`) |
| `/api/oz-precedents?hs=` | GET | Yes | Oz historical declarations by HS code |
| `/api/oz-precedents?q=` | GET | Yes | Oz precedents semantic search (needs GEMINI_API_KEY) |

**Vercel Hobby** projects cap serverless functions (~12). Several “logical” endpoints are implemented as **`/api/dataset`** and **`/api/tariff`** with `resource` / `op` query params; `vercel.json` rewrites preserve the public URLs above.

## Admin dashboard

- **URL:** `/admin` — read-only operator UI (paste Bearer token; optional one-time `?token=` then stored in `localStorage`).
- **Data:** `GET /api/admin/overview` (rewrites to dataset handler) aggregates health, tariff coverage, feedback file summary, version index, and knowledge layer counts.
- **Follow-up:** request logging for “today stats” (see `todayStats.note` in JSON).

## Examples

```bash
TOKEN=your_token

curl https://hs-code-api-thangs-projects-4472c6e9.vercel.app/api/health

curl -H "Authorization: Bearer $TOKEN" \
  "https://hs-code-api-thangs-projects-4472c6e9.vercel.app/api/tax?hs=85171300"

curl -H "Authorization: Bearer $TOKEN" \
  "https://hs-code-api-thangs-projects-4472c6e9.vercel.app/api/search?q=điện+thoại&limit=5"

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"description":"iPhone 15 Pro Max 256GB"}' \
  https://hs-code-api-thangs-projects-4472c6e9.vercel.app/api/suggest
```

## Response shape (ERP contract)

Tax/search responses use camelCase fields expected by `erp-xnk` client:

- `hsCode`, `nameVi`, `unitVi`
- `taxNkTt`, `taxNkPreferential`, `taxAcfta`, `taxVat`
- `policyByHs`, `hasPolicyWarning`, `warnings`

## Data

- `data/tax.json` — 11,871 HS codes + tariffs + policies
- `data/search.json` — search index
- `data/notes.json` — chapter notes
- `data/tax-enriched.json` — optional Gemini-enriched policy structure (see below)
- `data/explanatory-notes.json` — Level 2 explanatory notes by HS (from legacy import)
- `data/precedents.json` — Level 4 TB-TCHQ precedents by HS (from legacy import)
- `data/conflicts.json` — Level 5 conflict/risk hints by HS (from legacy import)
- `data/feedback.jsonl` — feedback events (append-only; may not persist on serverless cold paths)
- `data/versions/index.json` — tariff version catalog (`current` + metadata)
- `data/versions/tax-v2026-01-01-base.json` — baseline snapshot (same row set as `tax.json` at import)

## Oz historical training

- `data/oz-declarations.jsonl` — Oz historical declarations (gitignored private training data)
- `data/oz-declaration-embeddings.json` — declaration vectors (768-dim, gitignored)
- Import declarations from private Excel in `data/oz-export/` (supports `--dry-run`, `--file`, `--mapping`):
  - `node scripts/import-oz-declarations.mjs --dry-run --file=data/oz-export/1.BaoCaoHangChiTiet.xlsx`
  - `node scripts/import-oz-declarations.mjs --file=data/oz-export/1.BaoCaoHangChiTiet.xlsx`
- Build embeddings (resume-safe):
  - `node scripts/embed-oz-declarations.mjs`

### Suggest guardrails (historical + current policy)

- `/api/suggest` includes `evidenceTrace.matchedOzPrecedents` (top-5 similar Oz declarations).
- Historical precedents are advisory only:
  - response adds warning: `Historical precedent only... đối chiếu biểu thuế/policy hiện hành`.
  - `confidenceBreakdown` shows `baseConfidence`, `ozPrecedentBoost`, `ozDeclarationCount`, `ozMatchCoverage`, and `policyConflictBlockedBoost`.
- Boost is familiarity-based: how many times Oz declared this HS for similar products (`ozCount × matchCoverage`, log-scaled, capped at +8). No recency decay.
- Historical boost is blocked when candidate HS has current `hasPolicyWarning`. Precedents are **Oz's own declarations**, not customs rulings — treat as advisory only.
- Oz precedent candidates are deduplicated by HS + normalized description cluster to reduce embedding bias.

### Tests

- `node scripts/test-suggest-confidence.mjs` — verifies `familiarityBoost`, policy conflict blocking, `confidenceBreakdown` fields, and honest-disclaimer warning messages.

## Offline data pipeline (Issues #5, #7, partial #4)

```bash
# Snapshot current tariff JSON (updates data/versions/index.json)
npm run data:snapshot-tax -- --label=v2026-w27 --set-current

# Diff two snapshots on disk
npm run data:diff-tax -- --from=tax-v2026-01-01-base.json --to=tax-other.json

# Rollback live tax.json from a snapshot (local only; redeploy after)
npm run data:rollback-tax -- --to=tax-v2026-01-01-base.json --backup

# Import legacy knowledge datasets from hs-knowledge-api (writes 3 data files)
npm run data:import-legacy

# Gemini deep-parse policy strings → data/tax-enriched.json (resume-safe, commits API batches)
GEMINI_API_KEY=... npm run data:enrich-policies -- --dry-run --limit=3
GEMINI_API_KEY=... npm run data:enrich-policies -- --batch=5 --concurrency=2

# Merge legacy blobs (place data/legacy-knowledge.json export first)
npm run data:merge-legacy
```

When `tax-enriched.json` contains entries keyed by HS, `/api/tax` returns those `warnings` with `enrichmentSource: "gemini"`. Until then the API uses heuristic regex (`enrichmentSource: "heuristic"`).
