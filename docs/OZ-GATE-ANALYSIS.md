PASS (oz gate >= 50%):
  8412: 22/25 (88%) ✓
  8482: 4/4 (100%) ✓
  8521: 6/6 (100%) ✓ (text mode)
  8427: 3/3 (100%) ✓ (text mode)
  7209: 15/16 (88%) ✓ (text mode)
  6005: 3/3 (100%) ✓ (but disagree: bảng=60059090 vs oz=60053790 for all 3 phrases - WEAK)

NEAR-PASS (40-99%, needs work):
  8541: 12/26 (46%) - top unresolved: deviceKind+photosensitiveKind+transistorDissipationW
  8208: 22/33 (67%) - 1 disagree (dao cat may tu dong: bảng 82089000 ≠ oz 82081000)
  9030: 4/6 (67%) - 1 disagree (von ke: bảng 90303310 ≠ oz 90303390)

ZERO RESOLUTION (0% - detect arrays don't cover Vietnamese vocabulary):
  3926: 0/136 (0%) - missing: intendedUse+safetyType+senFlag detect
  8536: 0/78 (0%) - missing: apparatusKind+breakerVoltageClass etc.
  8481: 0/63 (0%) - missing: valveKind+controlType+boreSize+material+partKind
  8504: 0/57 (0%)
  8537: 0/56 (0%)
  9405: 0/50 (0%)
  7323: 0/45 (0%)
  4202: 0/43 (0%) - missing: outerMaterial detect
  8501: 0/38 (0%)
  8518: 0/35 (0%)
  8714: 0/34 (0%)
  6402: 0/30 (0%) - missing: metalToe+senFlag+shoeType
  7326: 0/28 (0%) - missing: articleSubType detect
  8543: 0/27 (0%)
  7318: 0/25 (4%) - missing: diameter+fastenerKind detect
  4016: 3/60 (5%) - missing: articleForm+materialForm+senFlag+vehicleKind

ROOT CAUSE: The decision tables' `inputs[].detect` arrays contain English keywords
(vocabulary used in original WCO/binary classification) but real Vietnamese
customs declarations use Vietnamese product names. The detect arrays need to be
enriched with Vietnamese vocabulary from oz-gold-final.jsonl phrases.

ACTIONS NEEDED:
1. Dev/expert: Enrich detect arrays for 3926, 8536, 8481, 4202, 6402, 7318, 7326, 4016
2. Dev: Consider accepting 8208 and 9030 as done (disagree is tiền lệ Oz data issue)
3. 6005 needs expert review: all 3 oz phrases disagree (bảng vs oz)
