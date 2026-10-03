# Oz Gate Analysis — 03/10/2026

## Root Cause: Multiple Missing Detect Attributes

The `resolveHeading()` detects the first attribute (`function`) but then can't resolve
because the NARROWED rules require additional attributes (e.g., `currentRating` + `specialApp`)
that the product name alone doesn't contain.

## Oz Gate Scores (47 groups with ≥3 aliases)

### PASSING (12 groups)
8482(100%), 8517(100%), 8532(100%), 3924(83%), 8412(81%), 8534(78%), 6005(71%), 7323(70%), 8541(69%), 8208(68%), 6004(50%), 8513(50%)

### NEAR PASSING (2 groups)
8443(40%), 8480(33%)

### FAILING (<30%) — 33 groups

## Missing Attribute Root Cause (representative groups)

| Group | Top Missing Attr | % oz phrases affected |
|-------|-----------------|----------------------|
| 8536 | specialApp(49), currentRating(46), NARROWED(114) | 46 oz phrases, 0 resolved |
| 8481 | material(222), partKind(222), boreSize(201) | 41 oz phrases, 1 resolved |
| 9405 | electric(89), material(89), partType(89) | 33 oz phrases, 0 resolved |
| 4202 | outerMaterial(148), specificKind(66) | 31 oz phrases, 0 resolved |
| 4016 | materialForm(78), senFlag(51) | 24 oz phrases, 1 resolved |
| 8518 | specCode(123) | 23 oz phrases, 0 resolved |

## 8536 Deep Dive
- `function=fuse` detect already rich (152 phrases) but NARROWED requires `currentRating`+`specialApp`
- Oz data: "Cầu chì ống thủy tinh" → function=fuse detected → NARROWED (needs currentRating+specialApp)
- Amp patterns in oz specs (`5A, 10A, 16A, 20A, 63A, 100A...`) exist in `sampleDesc` field
- Table rules: `function+currentRating+specialApp` needed for every fuse/CB/relay/switch
- **Fix**: extract amp from `sampleDesc` specs and add to `currentRating` detect arrays
- **BUT**: "Aptomat 3 pha" → correctly detects function=circuitBreaker + currentRating=a32to1000 + specialApp=riceCooker → NARROWED because the matched rule requires `specialApp=none` — this is a TABLE BUG: the rule should either be `specialApp=riceCooker` or the detect for `specialApp=riceCooker` needs to exclude phrases that also map to other HS

## 8536 Circuit Breaker Analysis
- "Aptomat 3 pha" → function=circuitBreaker, currentRating=a32to1000 (100A in specs), specialApp=riceCooker (3 pha → motor application)
- Matched rule: 8536-r013 → specialApp=riceCooker, currentRating=unspecified, but currentRating was detected as a32to1000
- **Bug in table**: rule r013 has currentRating=unspecified but phrase actually has 100A → mismatch causes NARROWED
- **Fix**: update 8536-r013 to have currentRating=a32to1000 OR add 85362020 for 3-phase motor CB

## 8419 Analysis
- NARROWED phrases: "Tủ hấp cơm" → detects powerSource=electric → NARROWED (missing processType, specialMaterial)
- 8419 has 5 oz phrases, all unresolved

## 8543/8714/8518
- specCode attribute with 0 detect phrases → every oz phrase gets INSUFFICIENT
- Oz data for these groups: `Tai nghe`, `Loa`, `Gậy cổ vũ` etc. need specCode (8-digit sub-code)

## Coverage Summary
- 726 oz aliases total in scored groups
- Passing tables cover only 132 aliases (18.2%)
- 594 aliases (81.8%) still in failing/zero groups

## Recommended Actions

### Short-term (enrich detect arrays)
1. **8536 amp patterns**: extract from `sampleDesc` specs → currentRating detect
2. **8543/8714 specCode**: extract 8-digit HS subcodes from oz data → specCode detect
3. **8518 specCode**: same for audio equipment subcodes

### Medium-term (fix table structure)
4. **8536**: split r013 or add correct currentRating values for riceCooker motor CBs
5. **8419**: add detect for "tủ hấp" as waterHeating processType
6. **8481/9405/4202/4016**: require too many attributes for product name alone → these groups may never pass oz gate without additional data

### Long-term (structural)
7. oz gate needs facts from parsed specs (not just tenHang) to resolve groups like 8536
