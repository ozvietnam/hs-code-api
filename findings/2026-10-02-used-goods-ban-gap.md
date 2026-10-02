# Finding: usedGoodsImportBan not exposed via getProcedures API

**Date:** 2026-10-02  
**Severity:** MEDIUM  
**Status:** Open  
**Affects:** /api/policy-procedures endpoint

## Problem

1,805 HS codes in `data/tax-enriched.json` have `warnings.usedGoodsImportBan: true`.
These represent goods (mostly used/refurbished electronics, appliances) that are **banned
from import** per Notice 08/2023/TT-BCT PL1.I.

When calling `GET /api/policy-procedures?hs=<code>` for any of these 1,805 codes,
`getProcedures()` returns **empty array** because:

```js
// lib/policy-procedures.js — getProcedures()
const rawTypes = [
  ...(warnings.inspectionTypes || []),
  ...(warnings.licenseTypes || []),
  ...(warnings.requiresQuarantine ? ['kiểm dịch thực vật'] : []),
];
```

The `usedGoodsImportBan` boolean field is not read here.

## Example

```
HS 39181011: "Hàng tiêu dùng ĐÃ QUA SỬ DỤNG bị cấm nhập khẩu"
warnings.usedGoodsImportBan = true
warnings.legalDocs = [{ code: "08/2023/TT-BCT", section: "PL1.I" }]
getProcedures() → []
```

But cam-nk procedure type (Cấm nhập khẩu) exists and would be appropriate.

## Affected procedure types

Only `cam-nk` (Cấm nhập khẩu) is relevant here — the ban IS the procedure.

## Recommended fix (scope: lib/policy-procedures.js)

Add to `getProcedures()`:

```js
// If used goods import is banned, add cam-nk
if (warnings.usedGoodsImportBan) {
  const proc = db['cam-nk'];
  if (proc) results.push({ ...proc, matchedRaw: 'usedGoodsImportBan' });
}
```

Or alternatively, add `usedGoodsImportBan` to `inspectionTypes` during enrichment
(`scripts/enrich-policies.mjs`) so it flows through existing logic.

## Verification

```bash
node -e "
const te = require('./data/tax-enriched.json');
const { getProcedures } = require('./lib/policy-procedures.js');
let ban = 0, no_proc = 0;
for (const [code, entry] of Object.entries(te)) {
  if (entry?.warnings?.usedGoodsImportBan) {
    ban++;
    if (getProcedures(entry.warnings).length === 0) no_proc++;
  }
}
console.log('usedGoodsImportBan:', ban, '→ no procedure:', no_proc);
"
// Expected output: usedGoodsImportBan: 1805 → no procedure: 1805
```

## References

- Notice: 08/2023/TT-BCT (Bộ Công Thương) — ban on used goods import
- cam-nk procedure: `data/policy-procedures.json` → cam-nk entry
- Similar existing logic: `requiresQuarantine` adds kiem-dich-thuc-vat as a special case
