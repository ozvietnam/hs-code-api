# Thiết kế kỹ thuật + Chia phiếu việc — Conflict Resolver (bảng quyết định)

- **Loại tài liệu:** Technical Design Doc (TDD) — sẵn sàng giao thợ dev code.
- **Ngày:** 2026-07-08
- **Trạng thái:** `READY FOR DEV` — kiến trúc đã chốt, thợ dev cầm vào code theo phiếu §11, KHÔNG cần tự quyết kiến trúc.
- **Kiến trúc + giám sát:** Claude (vai GĐ kỹ thuật). **Code + test:** thợ dev.
- **Base commit:** `43374f6` (main) · nhánh làm việc: `findings/conflict-resolver-decision-tree`.
- **Đọc kèm:** `findings/2026-07-07-conflict-resolver-decision-tree.md` (finding gốc + mục 9 đánh giá chuyên sâu). Tài liệu này là bản **thi công** của mục 9.

---

## 0. Cách dùng tài liệu này

- **CEO / dev lead:** đọc §1 (điều hành) + §11 (bảng phiếu việc) là đủ giao người.
- **Thợ dev:** mỗi phiếu ở §11 tự chứa: file cần đụng, việc phải làm, schema tham chiếu (§4–§7), tiêu chí nghiệm thu (DoD — Definition of Done), test. Làm theo thứ tự phụ thuộc ở §11.1. KHÔNG phát minh schema mới — dùng đúng §4.
- **Nguyên tắc bất biến phải giữ** (CLAUDE.md): mọi endpoint check `requireAuth` + `setCors`; response camelCase; KHÔNG commit `data/oz-export/*`.

---

## 1. Điều hành (1 trang)

**Bài toán:** Khi AI (Gemini/MiniMax) chốt mã HS top-1, với các cụm mã "dễ nhầm" (vd sạc dự phòng: ắc quy 8507 vs pin sơ cấp 8506 vs bộ đổi điện 8504), AI dễ trượt vì phó thác suy luận. Cần một tầng **tất định (deterministic — cùng input luôn ra cùng output), kiểm chứng được** để phân giải.

**Giải pháp chốt:** thêm một **bảng quyết định (decision table)** cho mỗi *cụm nhầm (confusion group)*. Bảng nhận các **thuộc tính có cấu trúc** (do ERP/người khai cung cấp), khớp luật → chốt mã kèm lý do + GIR. Đặt vào luồng `lib/classify.js` NGAY TRƯỚC bước cảnh báo nhầm hiện có (B3, dòng 155-168), thay "chỉ cảnh báo" bằng "phân giải rồi mới cảnh báo".

**Vì sao bảng chứ không phải cây (đã chốt ở mục 9.1 finding):** hồ sơ có sẵn nhiều thuộc tính cùng lúc (mô hình đa-truy-cập, không phải hỏi tuần tự); và **chỉ bảng mới kiểm được "đã phủ hết mọi trường hợp chưa" một cách tự động** — thứ sống còn để "tất định" không thành ảo giác an toàn.

**3 kết quả bàn giao:**
1. Tầng resolver chạy trong `/api/classify`, trả thêm khối `resolver` trong response (mã đã phân giải + lý do + GIR + câu hỏi bổ sung nếu thiếu dữ kiện).
2. Bộ dữ liệu bảng (`conflict-tables.json`) + từ điển thuộc tính (`attributes.json`) — seed 3 cụm mẫu (gồm cụm 8507).
3. Trình kiểm định (`validate-resolver.js`) chạy CI — bảo đảm bảng không sót/không mâu thuẫn.

**Hàng rào an toàn (chốt ở mục 9.2):** resolver **chỉ được ghi đè mã của AI khi đủ bằng chứng cứng** (thuộc tính do người khai cung cấp rõ ràng). Thiếu thuộc tính quyết định → KHÔNG đoán, trả câu hỏi để hỏi lại. v1 KHÔNG dùng AI suy đoán thuộc tính → loại bỏ hoàn toàn rủi ro "đè mã sai vì đoán sai".

**Ngoài phạm vi v1:** parser sinh bảng tự động từ TB-TCHQ (để v2), chế độ tư vấn dựa thuộc tính-AI-đoán (để v2), chuẩn DMN/XML + rule engine ngoài (KHÔNG dùng — tự viết ~150 dòng).

---

## 2. Kiến trúc & luồng dữ liệu

```
POST /api/classify (api/classify.js)
   │  attrs = { tenHang, chatLieu, congDung, chucNang, nameZh, specs, + thuộc-tính-resolver }
   ▼
classify(attrs, opts)  (lib/classify.js)
   ├─ getCandidates → headings ứng viên
   ├─ girConfirm (LLM) → results[top-3] (mã 8/6 số + confidence + gir + reason)
   ├─ M6: tbTchqGate cho từng mã (precedents.json)
   ├─ B2: chapter-specific-rules → bổ sung missing[]           (dòng 141-153)
   ├─ ★ B3.5 MỚI: conflictResolver(top, results, attrs)       ← CHÈN Ở ĐÂY (trước dòng 155)
   │     └─ lib/conflict-resolver.js
   │            đọc conflicts.json[top.hs].group → conflict-tables.json[group]
   │            khớp luật theo attrs (đối chiếu attributes.json) →
   │            { status: RESOLVED|NARROWED|INSUFFICIENT|SKIP, hs?, gir?, reasonVi?, ask[], trace[] }
   │     ├─ RESOLVED & hs≠top.hs → GHI ĐÈ top, log trace
   │     ├─ RESOLVED & hs=top.hs → xác nhận (không đổi)
   │     ├─ INSUFFICIENT        → giữ top, đẩy ask[] vào missing[]
   │     └─ NARROWED/SKIP       → giữ top
   ├─ B3: explanatoryNote + confusionWarning                   (dòng 155-168, giữ nguyên)
   ▼
response: { results, ecus, explanatoryNote, confusionWarning, resolver ★MỚI, missing, candidates, engine }
```

**Nguyên tắc đặt vị trí:** resolver là **bộ tinh chỉnh hậu kỳ (post-refiner)** trên mã top của AI — KHÔNG thay luồng, KHÔNG gọi thêm LLM, chạy thuần tất định trong bộ nhớ (nhanh, không tốn cost, không rủi ro timeout).

---

## 3. Quyết định thiết kế đã CHỐT (thợ dev không cần quyết lại)

| # | Quyết định | Lý do (đã phân tích ở mục 9) |
|---|---|---|
| D1 | **Bảng quyết định**, KHÔNG phải cây | Kiểm được completeness/consistency tự động; đa-truy-cập |
| D2 | **Tự viết evaluator** ~150 dòng, KHÔNG dùng rule engine (json-rules-engine/Drools) | Logic đơn giản; audit trail sạch; serverless nhẹ |
| D3 | **v1 chỉ ăn thuộc tính cứng** (do người khai cấp); thiếu → hỏi, không đoán | Loại rủi ro đè mã sai |
| D4 | Gắn vào **`/api/classify`** (không phải `/api/suggest`) | `classify` là luồng áp mã Pha 2; conflicts.json đang dùng ở đây |
| D5 | conflict-tables.json **keyed theo groupId**, mỗi group 1 bảng | Giữ ý hay của finding gốc |
| D6 | Từ điển `attributes.json` là **1-nguồn-sự-thật** canonical + alias EN/VN | Chặn bug lệch từ vựng (§8) |
| D7 | Tên file: `data/conflict-tables.json` (KHÔNG phải `conflict-trees.json`) | Phản ánh đúng mô hình bảng |
| D8 | Audit trail resolver để trong `resolver.trace[]` của response classify | classify KHÔNG có `girRulesApplied[]` như suggest (đính chính mục 9.4) |

---

## 4. Hợp đồng dữ liệu (Data contracts) — schema CHÍNH XÁC

### 4.1 `data/attributes.json` — từ điển thuộc tính (registry)

Một-nguồn-sự-thật cho tên thuộc tính. Dùng bởi resolver + validator + (tương lai) chapter-rules.

```jsonc
{
  "version": "2026-07",
  "attributes": {
    "energyFunction": {
      "canonical": "energyFunction",
      "aliasVi": "chucNangNangLuong",
      "domain": ["store", "convert"],
      "questionVi": "Chức năng chính: LƯU TRỮ điện (tích/xả) hay chỉ BIẾN ĐỔI điện?",
      "labelsVi": { "store": "Lưu trữ (tích/xả)", "convert": "Chỉ biến đổi/cấp nguồn" }
    },
    "rechargeable": {
      "canonical": "rechargeable",
      "aliasVi": "sacLaiDuoc",
      "domain": ["yes", "no"],
      "questionVi": "Sạc lại được không?",
      "labelsVi": { "yes": "Có sạc lại", "no": "Dùng một lần" }
    },
    "endUse": {
      "canonical": "endUse",
      "aliasVi": "mucDichSuDung",
      "domain": ["ev", "electronics"],
      "questionVi": "Nguồn cấp cho xe điện (nhóm 8702/03/04/11) hay thiết bị điện tử?",
      "labelsVi": { "ev": "Xe điện", "electronics": "Thiết bị điện tử" }
    }
  }
}
```

**Ràng buộc:** `canonical` == key. `domain` là mảng enum đóng, không rỗng. `labelsVi` phủ hết `domain`. Mọi thuộc tính mà bảng (§4.2) tham chiếu PHẢI có ở đây.

### 4.2 `data/conflict-tables.json` — bảng quyết định theo cụm

```jsonc
{
  "version": "2026-07",
  "tables": {
    "CF-storage-vs-converter": {
      "titleVi": "Ắc quy / sạc dự phòng vs Bộ nạp vs Pin sơ cấp",
      "members": ["85076010", "85076090", "85065000", "85044090"],
      "essenceTestVi": "Hàng LƯU TRỮ điện để xả sau, hay chỉ BIẾN ĐỔI điện tức thời?",
      "inputs": [
        { "attribute": "energyFunction" },
        { "attribute": "rechargeable" },
        { "attribute": "endUse" }
      ],
      "hitPolicy": "PRIORITY",
      "rules": [
        { "id": "r1", "priority": 40, "when": { "energyFunction": "convert" },
          "hs": "85044090", "gir": "GIR 1", "evidence": "hard",
          "reasonVi": "Không tích điện → bộ đổi điện tĩnh, nhóm 8504",
          "source": "Chú giải Chương 85 / heading 8504" },
        { "id": "r2", "priority": 30, "when": { "energyFunction": "store", "rechargeable": "no" },
          "hs": "85065000", "gir": "GIR 1", "evidence": "hard",
          "reasonVi": "Không sạc lại → pin sơ cấp Li, nhóm 8506",
          "source": "Chú giải heading 8506" },
        { "id": "r3", "priority": 20, "when": { "energyFunction": "store", "rechargeable": "yes", "endUse": "ev" },
          "hs": "85076010", "gir": "GIR 1+6", "evidence": "hard",
          "reasonVi": "Ắc quy Li-ion dùng cho xe điện",
          "source": "Chú giải phân nhóm 8507.60" },
        { "id": "r4", "priority": 10, "when": { "energyFunction": "store", "rechargeable": "yes", "endUse": "electronics" },
          "hs": "85076090", "gir": "GIR 3(b)", "evidence": "hard",
          "reasonVi": "Sạc dự phòng: pin+mạch boost → bản chất khối ắc quy (essential character)",
          "source": "GIR 3(b); TB-TCHQ (nếu có)" }
      ]
    }
  }
}
```

**Ngữ nghĩa khớp luật:**
- `when` là hợp (AND) các điều kiện `attribute == value`.
- Một luật CHỈ khớp khi MỌI key trong `when` có giá trị hợp lệ trong `inputs` đã thu thập. Thiếu 1 key → luật đó KHÔNG khớp (không đoán).
- `hitPolicy: "PRIORITY"` → nếu nhiều luật khớp, lấy luật `priority` cao nhất. (`UNIQUE` = giả định không chồng lấn; validator sẽ ép.)
- `evidence: "hard"` — v1 mọi luật là hard. Trường để mở cho v2.

### 4.3 `data/conflicts.json` — THÊM field `group` (không sửa field cũ)

Với các mã thuộc cụm đã có bảng, thêm đúng 1 field:
```jsonc
"85076090": {
  "hsCode": "85076090",
  "riskLevel": "ORANGE",
  "confusedWith": ["85076010", "85065000", "85044090"],
  "reasonsVi": ["..."],
  "precedents": [],
  "group": "CF-storage-vs-converter",   // ★ THÊM — trỏ tới bảng
  "sourceFile": "conflict_index.json"
}
```
ERP đang đọc `confusedWith`/`reasonsVi` → chỉ THÊM `group`, KHÔNG đụng field cũ. Nếu mã 8507 chưa có entry trong conflicts.json thì tạo mới entry đủ field trên.

---

## 5. Hợp đồng module — `lib/conflict-resolver.js` (viết mới)

### 5.1 Hàm phụ trợ
```js
// Đọc thuộc tính theo tên canonical, chấp nhận cả alias tiếng Việt.
// attrs: hồ sơ M0. registry: attributes.json.attributes.
// → { value: string|null, present: boolean }
function resolveAttr(attrs, canonicalKey, registry) { ... }
```

### 5.2 Hàm chính
```js
// top: results[0] (đã chuẩn hoá hs ≤8 số). results: mảng top-3. attrs: hồ sơ. deps: {conflictsDb, tablesDb, registry}
// → object resolver (xem shape dưới). KHÔNG throw — lỗi/thiếu data → { status:'SKIP' }.
function resolveConflict(top, results, attrs, deps) { ... }
```

**Thuật toán (bám sát, thợ dev code đúng các nhánh này):**
```
1. Nếu !top || top.hs.length !== 8 → return { status:'SKIP', reason:'no 8-digit top' }
2. group = conflictsDb[top.hs]?.group ; nếu !group → { status:'SKIP', reason:'no group' }
3. table = tablesDb.tables[group] ; nếu !table → { status:'SKIP', reason:'no table' }
4. Thu thập inputs:
     inputs = {}, ask = []
     for inp of table.inputs:
        def = registry[inp.attribute]                       // phải tồn tại (validator đảm bảo)
        { value, present } = resolveAttr(attrs, inp.attribute, registry)
        if present && def.domain.includes(value): inputs[inp.attribute] = value
        else ask.push({ attribute: inp.attribute, questionVi: def.questionVi })
5. Khớp luật:
     matched = table.rules.filter(r => Object.keys(r.when).every(k => inputs[k] === r.when[k]))
6. Nếu matched.length >= 1:
     pick = (hitPolicy==='PRIORITY') ? max theo priority : matched[0]
     trace = [{ ruleId: pick.id, when: pick.when, hs: pick.hs, gir: pick.gir, reasonVi: pick.reasonVi, source: pick.source }]
     overrode = pick.hs !== top.hs
     return { status:'RESOLVED', group, decidedHs: pick.hs, overrodeLlm: overrode,
              gir: pick.gir, reasonVi: pick.reasonVi, trace, ask: [] }
7. Nếu KHÔNG luật nào khớp:
     // thu hẹp: các mã member còn nhất quán với inputs đã biết (không mâu thuẫn any 'when' đã set)
     narrowed = tính danh sách member còn khả dĩ
     if ask.length: return { status:'INSUFFICIENT', group, narrowed, ask, trace: [] }
     else:          return { status:'NARROWED',     group, narrowed, ask: [], trace: [] }
```

**Bất biến an toàn (D3):** vì bước 4 chỉ nạp thuộc tính `present && hợp domain`, và bước 5 chỉ khớp khi mọi `when` key có trong `inputs`, nên resolver **không bao giờ chốt/đè dựa trên giá trị thiếu hoặc đoán**. Đây là hàng rào evidence, thực thi bằng cấu trúc.

---

## 6. Hợp đồng tích hợp — patch `lib/classify.js` + `api/classify.js`

### 6.1 `lib/classify.js`
- **Thêm import** đầu file (cạnh dòng 15): `const { resolveConflict } = require('./conflict-resolver.js');` + loader `attributes.json` và `conflict-tables.json` theo đúng pattern `conflictsDb()` (dòng 25-26): lazy-load + try/catch trả `{}`.
- **Chèn B3.5** NGAY TRƯỚC dòng 155 (`// B3: explanatory note...`), sau khi đã có `top` (dòng 137) và `lowConf` (dòng 138):
```js
// B3.5: conflict resolver deterministic — phân giải cụm mã dễ nhầm bằng bảng quyết định
let resolver = { status: 'SKIP' };
if (top?.hs?.length === 8) {
  resolver = resolveConflict(top, results, attrs, {
    conflictsDb: conflictsDb(),
    tablesDb: conflictTablesDb(),
    registry: attributesDb(),
  });
  if (resolver.status === 'RESOLVED' && resolver.overrodeLlm) {
    // ghi đè mã top bằng kết quả tất định, giữ dấu vết mã cũ của AI
    const idx = results.findIndex((r) => r.hs === top.hs);
    const overridden = { ...top, hs: resolver.decidedHs, gir: resolver.gir,
      reason: resolver.reasonVi, resolverOverride: { from: top.hs, ...resolver.trace[0] } };
    if (idx >= 0) results[idx] = overridden;
    // tra lại TB-TCHQ cho mã mới
    const g = tbTchqGate(resolver.decidedHs);
    if (g.hasPrecedent) overridden.tbTchq = g.entries;
  } else if (resolver.status === 'INSUFFICIENT' && resolver.ask?.length) {
    missing = [...new Set([...(missing || []), ...resolver.ask.map((a) => a.questionVi)])];
  }
}
```
- **Thêm `resolver` vào object return** (dòng 170-178): thêm key `resolver,`.
- **Lưu ý:** sau ghi đè, biến `top` cục bộ vẫn trỏ mã cũ ở đoạn B3 (dòng 158-168) → cân nhắc cập nhật `top = results[0]` lại, HOẶC để B3 cảnh báo theo mã mới. Thợ dev chọn: gán `top = results[0]` ngay sau khối B3.5 để explanatoryNote/confusionWarning bám mã đã phân giải. (Ghi rõ trong DoD.)

### 6.2 `api/classify.js` — nới `attrs` để nhận thuộc tính resolver
Hiện `attrs` (dòng 23-30) whitelist cứng 6 field. Cho phép ERP truyền thêm thuộc tính quyết định (vd `energyFunction`/`chucNangNangLuong`). Cách làm (an toàn, không nhận bừa):
```js
// sau khi build attrs cơ bản: nạp thêm các thuộc tính có tên ∈ registry attributes.json
const REG = require('../data/attributes.json').attributes; // hoặc qua helper
for (const [canon, def] of Object.entries(REG)) {
  const v = body?.[canon] ?? body?.[def.aliasVi];
  if (v != null) attrs[canon] = v;
}
```
→ ERP có thể gửi `{ tenHang, ..., energyFunction:"store", rechargeable:"yes", endUse:"electronics" }`.

---

## 7. Trình kiểm định — `scripts/validate-resolver.js` (viết mới)

Chạy độc lập (không cần server). In PASS/FAIL từng mục, `process.exit(1)` nếu có FAIL. Kiểm 6 điều (mục 9.6 finding):

1. **Registry hợp lệ:** mọi attribute có `canonical==key`, `domain` không rỗng, `labelsVi` phủ `domain`.
2. **Bảng tham chiếu hợp lệ:** mọi `inputs[].attribute` và mọi key trong `rules[].when` ∈ registry; mọi `when` value ∈ `domain` của attribute đó.
3. **Leaf hợp lệ:** mọi `rules[].hs` là mã 8 số **tồn tại trong `data/tax.json`**; mọi `members[]` ⊇ tập `rules[].hs`.
4. **Completeness (đầy đủ):** sinh **tích Descartes** mọi `domain` của `inputs` → mỗi tổ hợp phải khớp ≥1 luật (hoặc có luật "mặc định"). Liệt kê tổ hợp "rơi khe" nếu có.
5. **Consistency (nhất quán):** với `hitPolicy: UNIQUE` — không 2 luật cùng khớp 1 tổ hợp; với `PRIORITY` — không 2 luật khớp mà trùng `priority`.
6. **conflicts.json ↔ tables:** mọi `group` xuất hiện trong conflicts.json phải có bảng tương ứng trong conflict-tables.json (và ngược lại cảnh báo bảng mồ côi).

**Wire vào CI:** thêm script `"validate:resolver": "node scripts/validate-resolver.js"` vào package.json, và **chèn vào đầu chuỗi `npm test`** (trước các test khác) để CI `test-all.yml` tự chạy.

---

## 8. Bug liên đới — lệch từ vựng EN/VN (đã giao phiếu riêng)

Đã tách thành task nền `task_a1f810ca` ("Sửa bug lệch từ vựng EN/VN trong classify"). Tóm: `lib/classify.js` dòng 147-149 so `chapterSpecificRequired` (toàn EN) với `attrs` (toàn VN) → field EN luôn rơi `missing[]`. **Phụ thuộc:** phiếu T1 (registry `attributes.json`) là nền để sửa dứt điểm bug này — nên T1 nên xong trước hoặc làm chung. Ghi rõ ở §11.

---

## 9. Dữ liệu seed cần tạo (giao kèm phiếu T1-T3)

Seed tối thiểu **3 cụm** để chứng minh pipeline + đủ test:
1. **`CF-storage-vs-converter`** (8507/8506/8504) — đầy đủ ở §4.2 (dùng làm mẫu vàng).
2. **`CF-textile-knit-vs-woven`** (dệt kim 61.xx vs dệt thoi 62.xx) — thuộc tính `fabricConstruction` {knit, woven}; minh hoạ nhánh dệt may (vốn dùng vocab VN).
3. **1 cụm chọn từ 57 entry ORANGE sẵn có trong conflicts.json** (vd nhóm 1901 sữa) — để chứng minh gắn `group` vào entry có sẵn không phá gì.

Mỗi cụm: cập nhật cả 3 file (`attributes.json` thêm thuộc tính, `conflict-tables.json` thêm bảng, `conflicts.json` thêm `group`) — và phải qua `validate-resolver.js`.

---

## 10. Kế hoạch test — `scripts/test-conflict-resolver.mjs` (viết mới)

Theo mẫu `scripts/test-gir-tree.mjs` (assert + đếm PASS/FAIL + `process.exit(failed?1:0)`). Ca tối thiểu:

| Ca | Input attrs | Kỳ vọng |
|---|---|---|
| Sạc dự phòng đủ dữ kiện | energyFunction=store, rechargeable=yes, endUse=electronics | status=RESOLVED, decidedHs=85076090, gir=GIR 3(b) |
| Bộ đổi điện | energyFunction=convert | RESOLVED, 85044090 |
| Pin dùng 1 lần | store + rechargeable=no | RESOLVED, 85065000 |
| Ắc quy xe điện | store+yes+ev | RESOLVED, 85076010 |
| Thiếu endUse | store+yes (không endUse) | INSUFFICIENT, ask chứa câu hỏi endUse, KHÔNG override |
| Mã không thuộc group | top.hs mã bất kỳ không có group | SKIP |
| Override đúng | top.hs=85065000 (AI đoán) nhưng attrs→store+yes+electronics | RESOLVED, decidedHs=85076090, overrodeLlm=true |
| alias VN | truyền chucNangNangLuong/sacLaiDuoc thay tên EN | vẫn RESOLVED (resolveAttr đọc alias) |

**Wire:** thêm `node scripts/test-conflict-resolver.mjs` vào chuỗi `npm test` (package.json) → CI tự chạy.

---

## 11. BACKLOG — phiếu việc chia nhỏ cho thợ dev

### 11.1 Thứ tự phụ thuộc
```
T1 (registry) ──┬─► T2 (tables) ──► T3 (conflicts.group) ──► T6 (validator)
                │                                                   ▲
                └─────────────► T4 (resolver lib) ──► T5 (integrate)─┘
                                                        │
                                                        └─► T7 (tests)
T0 (bug vocab, task_a1f810ca) — song song, nên gộp nền với T1.
T8 (parser TB-TCHQ) — v2, làm sau khi T1-T7 xanh.
```
Đường tới hạn: **T1 → T4 → T5 → T7**. T2/T3/T6 chạy song song nhánh dữ liệu.

### 11.2 Chi tiết từng phiếu

**T1 — Tạo `data/attributes.json` (registry) + helper `resolveAttr`**
- File: `data/attributes.json` (mới) theo §4.1; seed thuộc tính cho 3 cụm §9.
- DoD: file parse được; mọi attribute đủ `canonical/aliasVi/domain/questionVi/labelsVi`; `canonical==key`.
- Test: đưa vào phần 1 của `validate-resolver.js` (T6) — hoặc smoke `node -e "require('./data/attributes.json')"`.
- Độ khó: **Dễ**. Giao: junior. Không phụ thuộc.

**T2 — Tạo `data/conflict-tables.json` + seed 3 bảng**
- File: `data/conflict-tables.json` (mới) theo §4.2; bảng CF-storage-vs-converter (chép §4.2), + 2 bảng §9.
- DoD: parse được; mọi `inputs[].attribute` & `when` key có trong attributes.json (T1); `members ⊇ rules.hs`.
- Test: qua `validate-resolver.js` (T6).
- Độ khó: **TB**. Giao: mid (cần hiểu nghiệp vụ HS để soạn luật đúng). Phụ thuộc: T1.

**T3 — Thêm field `group` vào `data/conflicts.json`**
- File: `data/conflicts.json` (sửa) — thêm `group` cho các mã thuộc 3 cụm; tạo entry 8507 nếu thiếu. KHÔNG đụng field cũ.
- DoD: chỉ thêm `group`; diff không sửa `confusedWith/reasonsVi`; JSON hợp lệ.
- Test: `validate-resolver.js` mục 6 (group ↔ table khớp).
- Độ khó: **Dễ**. Giao: junior. Phụ thuộc: T2 (biết groupId).

**T4 — Viết `lib/conflict-resolver.js`**
- File: `lib/conflict-resolver.js` (mới) — `resolveAttr` + `resolveConflict` theo §5. Không import LLM. Không throw.
- DoD: xuất `{ resolveConflict, resolveAttr }`; chạy đúng 4 trạng thái RESOLVED/NARROWED/INSUFFICIENT/SKIP; có bất biến an toàn D3.
- Test: T7 phủ.
- Độ khó: **TB-Khó**. Giao: mid/senior. Phụ thuộc: T1 (shape registry) — có thể mock để làm song song T2/T3.

**T5 — Tích hợp vào `lib/classify.js` + `api/classify.js`**
- File: `lib/classify.js` (chèn B3.5 §6.1, thêm import + loaders, thêm `resolver` vào return, xử lý `top=results[0]` sau override); `api/classify.js` (nới attrs §6.2).
- DoD: `/api/classify` trả thêm khối `resolver`; khi override, `results[0].hs` = mã đã phân giải + có `resolverOverride`; explanatoryNote/confusionWarning bám mã mới; không phá response cũ (results/ecus/missing/candidates/engine giữ nguyên key).
- Test: T7 + chạy tay `curl` 1 ca (xem §12).
- Độ khó: **TB**. Giao: mid. Phụ thuộc: T4.

**T6 — Viết `scripts/validate-resolver.js` + wire CI**
- File: `scripts/validate-resolver.js` (mới) — 6 kiểm tra §7; thêm script `validate:resolver` + chèn đầu `npm test` (package.json).
- DoD: chạy `npm run validate:resolver` → PASS toàn bộ với seed T1-T3; cố tình bỏ 1 tổ hợp enum → FAIL completeness (chứng minh bắt lỗi thật).
- Test: chính nó.
- Độ khó: **TB**. Giao: mid. Phụ thuộc: T1, T2 (đọc T3 cho mục 6).

**T7 — Viết `scripts/test-conflict-resolver.mjs` + wire `npm test`**
- File: `scripts/test-conflict-resolver.mjs` (mới) theo mẫu test-gir-tree.mjs; 8 ca §10; thêm vào chuỗi `npm test`.
- DoD: `npm run test:conflict-resolver` xanh 8/8; nằm trong `npm test`; CI `test-all.yml` chạy qua.
- Độ khó: **TB**. Giao: mid. Phụ thuộc: T4, T5.

**T8 — (v2) `scripts/tbtchq_to_tables.mjs` sinh luật từ precedents**
- File: mới. Parse `data/precedents.json` (1.058 TB-TCHQ) → gợi ý luật bảng cho cặp mã cùng 6 số; mỗi luật neo mã TB-TCHQ nguồn. Output để người duyệt tay, KHÔNG tự ghi đè.
- DoD: sinh file nháp `data/conflict-tables.suggested.json`; không đụng file thật.
- Độ khó: **Khó**. Giao: senior. Phụ thuộc: T1-T7 xanh. **Để sau.**

### 11.3 Bảng tổng phiếu

| Phiếu | Việc | File chính | Độ khó | Phụ thuộc |
|---|---|---|---|---|
| T1 | Registry thuộc tính | `data/attributes.json` | Dễ | — |
| T2 | Bảng quyết định | `data/conflict-tables.json` | TB | T1 |
| T3 | Thêm `group` | `data/conflicts.json` | Dễ | T2 |
| T4 | Lib resolver | `lib/conflict-resolver.js` | TB-Khó | T1 |
| T5 | Tích hợp | `lib/classify.js`, `api/classify.js` | TB | T4 |
| T6 | Validator + CI | `scripts/validate-resolver.js` | TB | T1,T2 |
| T7 | Test | `scripts/test-conflict-resolver.mjs` | TB | T4,T5 |
| T8 | Parser TB-TCHQ (v2) | `scripts/tbtchq_to_tables.mjs` | Khó | T1-T7 |
| T0 | Bug vocab EN/VN (đã giao) | `lib/classify.js` | TB | ~T1 |

---

## 12. Nghiệm thu tổng (GĐ ký) + rủi ro

**Định nghĩa "xong" cả gói:**
1. `npm run validate:resolver` PASS (bảng đầy đủ + nhất quán).
2. `npm test` xanh (gồm test-conflict-resolver 8/8), CI `test-all.yml` xanh.
3. Chạy tay: `curl -X POST /api/classify -H "Authorization: Bearer $HS_API_TOKEN" -d '{"tenHang":"sạc dự phòng 10000mAh","energyFunction":"store","rechargeable":"yes","endUse":"electronics"}'` → response có `resolver.status="RESOLVED"`, `resolver.decidedHs="85076090"`, và `results[0].hs="85076090"`.
4. Ca thiếu dữ kiện: bỏ `endUse` → `resolver.status="INSUFFICIENT"`, `missing` chứa câu hỏi về endUse, KHÔNG override.
5. Response cũ không vỡ: `results/ecus/explanatoryNote/confusionWarning/missing/candidates/engine` còn nguyên.

**Rủi ro & giảm thiểu:**
- *Bảng soạn sai luật nghiệp vụ* → validator không bắt được (nó chỉ bắt cấu trúc). Giảm thiểu: mỗi luật neo `source` (chú giải/TB-TCHQ); GĐ review nội dung 3 bảng seed trước khi mở rộng.
- *Override sai do ERP gửi thuộc tính sai* → D3 chỉ ăn hard evidence, nhưng ERP vẫn có thể gửi sai. Giảm thiểu: log `resolverOverride.from` để truy vết; giữ mã cũ của AI trong dấu vết.
- *Phình bảng* → giữ scope: chỉ cụm có trong conflicts.json + ≥2 mã 8 số cùng 6 số (giữ nguyên mục 6 finding gốc).

**Rollback:** resolver là stage cộng thêm; gỡ bằng cách bỏ khối B3.5 (feature flag `opts.resolver !== false` nếu muốn tắt runtime). Không đụng dữ liệu cũ.
