# hs-code-api-1

Lightweight HS Code + tariff API for ERP `erp-xnk`.

**Live:** https://hs-code-api-1-ywbe.vercel.app

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
```

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
| `/api/notes?chapter=` | GET | Yes | Chapter notes |
| `/api/suggest` | POST | Yes | AI HS suggestions (Gemini) |
| `/api/describe` | POST | Yes | AI customs description (Gemini) |
| `/api/feedback` | POST | Yes | Capture director override feedback |
| `/api/kg_chapter?chapter=` | GET | Yes | List HS codes in chapter |
| `/api/kg_stats` | GET | Yes | Dataset overview |

## Examples

```bash
TOKEN=your_token

curl https://hs-code-api-1-ywbe.vercel.app/api/health

curl -H "Authorization: Bearer $TOKEN" \
  "https://hs-code-api-1-ywbe.vercel.app/api/tax?hs=85171300"

curl -H "Authorization: Bearer $TOKEN" \
  "https://hs-code-api-1-ywbe.vercel.app/api/search?q=điện+thoại&limit=5"

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"description":"iPhone 15 Pro Max 256GB"}' \
  https://hs-code-api-1-ywbe.vercel.app/api/suggest
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
- `data/feedback.jsonl` — feedback events (append-only; may not persist on serverless cold paths)
