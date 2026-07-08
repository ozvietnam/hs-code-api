# Finding: Nâng cấp `conflicts.json` → Conflict Resolver (cây ra quyết định)

- **Ngày:** 2026-07-07
- **Trạng thái:** `PROPOSED` — ghi nhận để dev chính xử lý (chưa động vào code)
- **Người phát hiện:** review phiên tư vấn HS (case sạc dự phòng 10.000mAh → 8507.60.90)
- **Base commit khi review:** `e0a9eb2` (main)
- **Phạm vi ảnh hưởng:** `lib/classify.js`, `data/conflicts.json`, `data/chapter-specific-rules.json`

---

## 1. Bối cảnh — file đã rà

| File | Vai trò hiện tại |
|---|---|
| `lib/classify.js` (M0→M1→M6) | LLM (Gemini/MiniMax) suy luận GIR trên GỒM/KHÔNG GỒM/LOẠI TRỪ → top-3 mã |
| `data/chapter-specific-rules.json` | Checklist thuộc tính bắt buộc theo chương (`requiredAttributes`, `girHints`) — **đã là vocab thuộc tính** |
| `data/conflicts.json` (keyed theo HS) | `confusedWith` + `reasonsVi` + `riskLevel` + `precedents` |
| `data/anti-patterns.json` | Validate chất lượng **mô tả ECUS** (nhánh khác, không phải phân loại) |

## 2. Phát hiện (gap)

`conflicts.json` hiện **chỉ được dùng thụ động**. Trong `lib/classify.js` (~dòng 160-165), sau khi LLM chốt mã top, code chỉ tra `conflictsDb()[top.hs]` rồi gắn `confusionWarning` để **cảnh báo** — **không có cây câu hỏi để tự phân giải** giữa các mã dễ nhầm. Toàn bộ việc phân biệt tầng 8 số đang phó thác cho LLM đọc chú giải → dễ trượt ở các dòng "loại khác".

Ví dụ minh hoạ (case thực): sạc dự phòng có thể rơi vào 8507.60.90 (ắc quy) / 8506.50 (pin sơ cấp) / 8504.40 (bộ đổi điện) — hiện chưa có cụm này trong `conflicts.json`, và không có cơ chế deterministic để chốt.

## 3. Đề xuất — 3 thay đổi (không đập code, backward-compatible)

### ① Giữ `conflicts.json` nguyên schema, thêm 1 field `group`
```json
"85076090": {
  "hsCode": "85076090",
  "riskLevel": "ORANGE",
  "confusedWith": ["85076010", "85065000", "85044090"],
  "reasonsVi": ["..."],
  "precedents": [],
  "group": "CF-storage-vs-converter",   // MỚI: trỏ tới cây
  "sourceFile": "conflict_index.json"
}
```
ERP đang đọc `confusedWith`/`reasonsVi` → **chỉ thêm**, không sửa field cũ.

### ② File mới `data/conflict-trees.json` — keyed theo groupId, 1 cây/cụm
```json
{
  "version": "2026-07",
  "CF-storage-vs-converter": {
    "titleVi": "Ắc quy / sạc dự phòng vs Bộ nạp vs Pin sơ cấp",
    "members": ["85076010","85076090","85065000","85044090"],
    "defaultHs": "85076090",
    "essenceTestVi": "Hàng LƯU TRỮ điện để xả sau, hay chỉ BIẾN ĐỔI điện tức thời?",
    "attributes": ["energyFunction","rechargeable","endUse"],
    "root": "n1",
    "nodes": [
      { "nodeId": "n1", "attribute": "energyFunction",
        "questionVi": "Chức năng chính: LƯU TRỮ điện hay BIẾN ĐỔI điện?",
        "options": [
          { "value": "store", "labelVi": "Lưu trữ (tích/xả)", "goto": "n2" },
          { "value": "convert", "labelVi": "Chỉ biến đổi/cấp nguồn",
            "leaf": "85044090", "gir": "GIR 1",
            "reasonVi": "Không tích điện → bộ đổi điện tĩnh, nhóm 8504" }
        ]},
      { "nodeId": "n2", "attribute": "rechargeable",
        "questionVi": "Sạc lại được không?",
        "options": [
          { "value": "yes", "goto": "n3" },
          { "value": "no", "leaf": "85065000", "gir": "GIR 1",
            "reasonVi": "Không sạc lại → pin sơ cấp, nhóm 8506" }
        ]},
      { "nodeId": "n3", "attribute": "endUse",
        "questionVi": "Nguồn cấp cho xe điện (nhóm 8702/03/04/11)?",
        "options": [
          { "value": "ev", "leaf": "85076010", "gir": "GIR 1+6",
            "reasonVi": "Ắc quy Li-ion dùng cho xe điện" },
          { "value": "electronics", "leaf": "85076090", "gir": "GIR 3(b)",
            "reasonVi": "Ắc quy Li-ion loại khác (sạc dự phòng); pin+mạch boost → bản chất khối ắc quy" }
        ]}
    ]
  }
}
```

### ③ File mới `data/attributes.json` — registry vocab chuẩn hoá
Lý do bắt buộc: `chapter-specific-rules.json` **đang lệch key** — ch84/85 dùng EN (`function`, `voltage`), ch42/61/64 dùng VN (`chatLieu`, `congDung`). Cây + chapter-rules + `attrs` trong `classify.js` phải chung 1 vocab.
```json
{
  "energyFunction": { "enum": ["store","convert"], "questionVi": "Lưu trữ hay biến đổi điện?" },
  "rechargeable":   { "enum": ["yes","no"], "questionVi": "Sạc lại được không?" },
  "endUse":         { "enum": ["ev","electronics","laptop","ups"], "questionVi": "Dùng cho thiết bị gì?" },
  "chatLieu":       { "canonical": "material" }
}
```

## 4. Điểm ghép vào `lib/classify.js` (chèn 1 stage ~25 dòng, TRƯỚC đoạn gắn `confusionWarning`)

```
B3.5 — CONFLICT RESOLVER (deterministic):
  nếu ≥2 mã trong top-3 cùng 1 `group`:
     nạp cây từ conflict-trees.json → duyệt từ root:
       - đọc `attribute` từ `attrs` (hồ sơ M0 đã có) → auto đi tiếp
       - THIẾU attribute → KHÔNG đoán: đẩy questionVi vào `missing[]`
       - chạm `leaf` → override mã chốt + push reasonVi vào girRulesApplied[]
```
Cây là **post-refiner deterministic** trên tập candidate của LLM — KHÔNG thay luồng, giữ nguyên `girRulesApplied[]` (rule bất biến #6).

## 5. Nguồn seed

675 dòng TB-TCHQ đã scrape = "DN khai X → HQ áp Y vì Z" → chính là `{2 members, 1 nhánh phân biệt, reasonVi}`. Viết parser gom theo cặp mã dưới cùng 6 số → sinh cây tối thiểu 2 lá.

## 6. ❌ KHÔNG nên làm (chốt phạm vi)

- Đừng tạo cây cho cả 11.871 mã — chỉ cụm đã có trong `conflicts.json` + ORANGE/RED + ≥2 mã 8 số cùng 6 số.
- Đừng nhét tax/notes/KTCN vào cây — `tax.json` là nguồn thuế duy nhất; KTCN biến động → để cờ.
- Đừng fork vocab thuộc tính mới — mở rộng cái đang có + registry sửa drift EN/VN.
- Đừng thay LLM bằng cây — giữ luồng, cây chỉ tinh chỉnh 8 số.
- Đừng phá `confusedWith`/`reasonsVi` (ERP đang đọc) — chỉ thêm `group`.

## 7. Validation cần có khi build (đưa vào CI)

- Mọi `leaf` là mã 8 số tồn tại trong `tax.json`.
- Mọi `goto` trỏ tới `nodeId` có thật; đồ thị không chu trình (DAG).
- Mỗi node phủ hết `enum` của attribute (hoặc có nhánh `else`).
- `members` ⊇ tất cả `leaf` của cây.
- `attribute` ∈ registry `attributes.json`.

## 8. Next step gợi ý cho dev chính

1. Tạo issue: `feat(classify): conflict resolver deterministic bằng decision-tree`.
2. Thêm `data/conflict-trees.json` (seed 3-5 cụm, gồm 8507) + `data/attributes.json`.
3. Thêm cụm 8507 vào `conflicts.json` (chỉ thêm `group`).
4. Patch `lib/classify.js` B3.5 + test fixture.
5. Viết parser `scripts/tbtchq_to_trees.mjs` sinh cây từ precedents.

---

# 9. Đánh giá chuyên sâu (góc nhìn chuyên gia cây ra quyết định) — 2026-07-08

> Bổ sung bởi review chuyên sâu: 3 mũi song song — (a) lý thuyết hệ ra quyết định thủ công, (b) khảo sát giải pháp HS-classification có sẵn ngoài ngành, (c) soi lại code repo thật để đối chiếu claim. Kết luận: **hướng đi ĐÚNG và chuẩn ngành, nhưng cấu trúc lõi nên nâng cấp + finding có vài dữ kiện cần đính chính.** Chấm thiết kế hiện tại: **6/10** (ý tưởng đúng, cấu trúc "cây thứ-tự-cứng" chưa phải dạng chuẩn nhất).

## 9.0 Phán quyết tổng — đã chuẩn bài chưa?

**Đã đúng hướng, được cả ngành lẫn học thuật xác nhận** — KHÔNG phải phát minh lại bánh xe:
- Paper **"A Deterministic Agentic Workflow for HS Tariff Classification"** (arXiv 2605.14857, T5/2026) mô tả gần **y hệt** kiến trúc này (trích thuộc tính có cấu trúc → duyệt luật cố định → "L2 note confirmation" demote/override ứng viên theo chú giải) và chứng minh **thắng LLM thuần**: 75% top-1 / 91.5% top-3 ở 4 số. Kết luận của họ: *"Deterministic workflows outperform autonomous agents for regulated tasks with stable structure"* — đổi quyền tự chủ LLM lấy tính giải thích được + giảm phương sai.
- **3CE Technologies** (đã bị Avalara mua) = expert system (hệ chuyên gia — máy suy luận theo luật do chuyên gia mã hóa) hỏi thuộc tính rồi suy luận. **Canada Tariff Finder** (của chính phủ) = "probing questions" hỏi đặc tính hàng để thu hẹp dần — **chính là pattern "mỗi node 1 thuộc tính + câu hỏi" của finding này.**
- **WCO KHÔNG phát hành cây quyết định GIR chính thức nào** máy-đọc-được → khoảng trống này có thật, tự xây không đụng hàng.
- **Không có repo mã nguồn mở nào để fork** (open source toàn ML thuần: Word2Vec/LSTM/LLaMA fine-tune). Chỉ mượn được *bảng dữ liệu HS* + *dataset rulings (CROSS)* làm ground-truth; logic cây phải tự viết — vốn là IP nghiệp vụ, hợp lý.

**Điểm mạnh riêng cần GIỮ:** keyed theo confusion-group (không xây cây khổng lồ cho 11.871 mã, chỉ đánh đúng chỗ đau — nơi ML/LLM yếu nhất); post-refine top-3 rồi override; câu hỏi tiếng Việt mỗi node; gắn `gir`+`reasonVi`. Tất cả đúng.

→ Ba nâng cấp dưới đây (9.1–9.3) là để đưa thiết kế từ 6/10 lên "chuẩn bài". Phần 9.4 đính chính dữ kiện. Phần 9.5–9.6 là cách làm chống rủi ro.

## 9.1 Nâng cấp #1 (QUAN TRỌNG NHẤT) — chuyển **Cây (tree)** → **Bảng quyết định (decision table)**

**Vấn đề của "cây thứ-tự-cứng":** cây bắt duyệt theo MỘT thứ tự thuộc tính cố định (root → n2 → n3). Nếu hồ sơ tình cờ **thiếu đúng thuộc tính ở gốc**, cả cây kẹt — dù các thuộc tính quyết định khác đã có đủ. Nhưng hồ sơ HS thực tế **có sẵn NHIỀU thuộc tính cùng lúc** → đây là mô hình **khóa đa truy cập (multi-access key** — lọc dần tập ứng viên bằng bất kỳ thuộc tính nào đang có, không phụ thuộc thứ tự, mượn từ phân loại taxonomy sinh học), KHÔNG phải path cứng.

**Giải pháp — bảng quyết định kiểu DMN** (DMN = Decision Model and Notation, chuẩn mô hình hóa quyết định của OMG). Vẫn **keyed theo confusion-group** (giữ nguyên ý hay), chỉ đổi payload từ `nodes[]` sang `rules[]`:

```jsonc
"CF-storage-vs-converter": {
  "titleVi": "Ắc quy / sạc dự phòng vs Bộ nạp vs Pin sơ cấp",
  "members": ["85076010","85076090","85065000","85044090"],
  "inputs": [
    { "attribute": "energyFunction", "domain": ["store","convert"] },
    { "attribute": "rechargeable",   "domain": ["yes","no"] },
    { "attribute": "endUse",         "domain": ["ev","electronics"] }
  ],
  "hitPolicy": "PRIORITY",              // nhiều luật trúng → lấy mã ưu tiên pháp lý cao nhất
  "rules": [
    { "when": { "energyFunction": "convert" },                                        "hs": "85044090", "gir": "GIR 1",   "evidence": "hard", "reasonVi": "Không tích điện → bộ đổi điện tĩnh, nhóm 8504" },
    { "when": { "energyFunction": "store", "rechargeable": "no" },                     "hs": "85065000", "gir": "GIR 1",   "evidence": "hard", "reasonVi": "Không sạc lại → pin sơ cấp, nhóm 8506" },
    { "when": { "energyFunction": "store", "rechargeable": "yes", "endUse": "ev" },    "hs": "85076010", "gir": "GIR 1+6","evidence": "hard", "reasonVi": "Ắc quy Li-ion dùng cho xe điện" },
    { "when": { "energyFunction": "store", "rechargeable": "yes", "endUse": "electronics" }, "hs": "85076090", "gir": "GIR 3(b)", "evidence": "hard", "reasonVi": "Sạc dự phòng: pin+mạch boost → bản chất khối ắc quy" }
  ]
}
```

**Tại sao table > tree ở case này:**
1. **Kiểm được tính đầy đủ (completeness) TỰ ĐỘNG** — sinh tích Descartes (Cartesian product — mọi tổ hợp giá trị enum) rồi kiểm mỗi tổ hợp trúng ≥1 luật. Cây thủ công gần như KHÔNG kiểm được điều này. Đây là điểm chí mạng: "deterministic" mà không chứng minh được "phủ hết trường hợp" thì chỉ là ảo giác an toàn.
2. **Kiểm được tính nhất quán (consistency)** — không 2 luật cùng điều kiện ra 2 mã khác nhau (overlap mâu thuẫn). Drools DMN engine có sẵn static analysis phát hiện gap + overlap — ta mượn ý tưởng, tự viết validator.
3. **Đa truy cập** — đọc bất kỳ thuộc tính nào có sẵn, không kẹt thứ tự.
4. Với 2–5 thuộc tính enum hữu hạn (đúng mọi confusion-group HS), bảng chỉ ~6–8 dòng, **dễ đọc + dễ audit hơn cây**.

**Ngoại lệ giữ cây:** chỉ khi thuộc tính rẽ nhánh **phụ thuộc mạnh** (thuộc tính B chỉ có nghĩa sau khi A đã chọn) và muốn hỏi tuần tự để tiết kiệm chi phí thu thập. Khi đó dùng cây nhỏ cho riêng group đó (hybrid). Mặc định: **table**.

## 9.2 Nâng cấp #2 (CHỐNG RỦI RO CHẾT NGƯỜI) — hàng rào bằng chứng (evidence guard)

**Failure mode nguy hiểm nhất:** resolver deterministic + input SAI = ra mã sai **một cách quả quyết**, rồi **ghi đè đề xuất có thể đúng của LLM**. Ví dụ: LLM đọc mô tả nhầm "pin sạc" thành "pin dùng một lần" → resolver tự tin chốt 8506 (pin sơ cấp) đè lên 8507 mà LLM định chọn đúng. Đây nguy hiểm HƠN việc để LLM tự chọn, vì nó khoác áo "tất định + có audit".

**Giải pháp — 2 mức bằng chứng + 3 trạng thái kết quả:**
- Mỗi thuộc tính đầu vào gắn nhãn nguồn: **`hard`** (người khai nhập / có trong hồ sơ) vs **`soft`** (LLM suy đoán từ mô tả).
- **Quy tắc vàng: resolver CHỈ được override mã LLM khi MỌI thuộc tính quyết định của dòng luật trúng đều là `hard`.** Nếu thuộc tính quyết định là `soft` → resolver chuyển sang **chế độ tư vấn (advisory)**: đề xuất mã + `confidence: low` + `needsConfirmation: <attribute>`, KHÔNG override — để giám đốc quyết qua `/api/feedback`.
- Thay 2 trạng thái nhị phân (leaf / miss) bằng **3 trạng thái**: `RESOLVED` (chốt được, đủ hard evidence) / `NARROWED` (còn ≥2 ứng viên, thu hẹp nhưng chưa chốt) / `INSUFFICIENT` (thiếu thuộc tính quyết định → trả câu hỏi bổ sung, đúng tinh thần multi-access: thu hẹp thay vì ép đoán).
- Không cần probability/Bayes đầy đủ — over-engineer. **Weighted evidence 2 mức là đủ.**

## 9.3 Nâng cấp #3 (SỬA BUG THẬT ĐANG TỒN TẠI) — thống nhất vocab thuộc tính

Soi code phát hiện **một bug thật, không chỉ là drift lý thuyết** — và nó ảnh hưởng trực tiếp tới cách resolver đọc thuộc tính:

- `attrs` (hồ sơ M0) build ở `api/classify.js` dòng 23-30, **chỉ có 6 field, toàn tiếng Việt camelCase**: `tenHang, chatLieu, congDung, chucNang, nameZh, specs`.
- `lib/classify.js` dòng 149 đọc `rule.chapterSpecificRequired` — field này **đồng nhất tiếng Anh** trên cả 28 chương (`voltage, power, outerMaterial, fiberContent...`). So key EN với `attrs` key VN → **gần như KHÔNG BAO GIỜ trùng → mọi field EN đó luôn bị coi là "thiếu" và đẩy vào `missing[]`**. Đây là bug đang chạy trong production.
- (Lưu ý đính chính: claim của finding "ch84/85 EN, ch42/61/64 VN" **đúng với field `requiredAttributes`** — field mà nhánh *suggest* đọc — nhưng field mà nhánh *classify* thực sự đọc là `chapterSpecificRequired`, vốn toàn EN. Cần phân biệt 2 field.)
- Hệ quả cho finding: `attributes.json` đề xuất đang dùng **key EN** (`energyFunction, rechargeable, endUse`) trong khi `attrs` toàn **VN**. Nếu không có lớp map, resolver sẽ lệch tiếp y như bug trên.

**Giải pháp:** `attributes.json` phải là **registry canonical + alias 2 chiều EN/VN**, và là 1-nguồn-sự-thật cho CẢ 3 nơi (`attrs`, `chapter-specific-rules.json`, resolver):
```jsonc
{
  "energyFunction": { "canonical": "energyFunction", "aliasVi": "chucNangNangLuong", "domain": ["store","convert"], "questionVi": "Lưu trữ hay biến đổi điện?" },
  "rechargeable":   { "canonical": "rechargeable",   "aliasVi": "sacLaiDuoc",         "domain": ["yes","no"],       "questionVi": "Sạc lại được không?" },
  "material":       { "canonical": "material",       "aliasVi": "chatLieu",           "questionVi": "Vật liệu chính?" }
}
```
Kèm 1 hàm `resolveAttr(attrs, canonicalKey)` tra cả canonical lẫn aliasVi. **Đồng thời nới `attrs`** để nhận thêm thuộc tính resolver cần (vd `chucNangNangLuong`, `sacLaiDuoc`) — nếu không có, resolver luôn `INSUFFICIENT`.

## 9.4 Đính chính dữ kiện trong finding (để dev không lạc khi implement)

| Finding nói | Thực tế code (đã verify) |
|---|---|
| Resolver "push reasonVi vào `girRulesApplied[]`" tại B3.5 của `classify.js` (dẫn Rule bất biến #6) | ⚠️ **`girRulesApplied[]` KHÔNG tồn tại trong luồng `classify`** — nó nằm ở nhánh **suggest** (`lib/suggest-evidence.js` dòng 52-63). Luồng `classify` dùng tên khác (`girRankingRules` từ `gir-engine.js`) và thậm chí **chưa import `gir-engine.js`**. → Rule bất biến #6 áp cho `/api/suggest`, không phải `/api/classify`. Resolver ở B3.5 phải **TỰ dựng audit trail**, không có sẵn mảng để push. **Cần chốt: resolver gắn vào endpoint nào?** (nên cả 2, nhưng phải build trace riêng cho classify). |
| conflicts.json "ORANGE/RED" | ✅ đúng schema, nhưng thực tế **57/57 entry đều ORANGE, chưa có RED nào**. Field `group` chưa có (đúng, sẽ thêm). |
| `conflict-trees.json`, `attributes.json` chưa tồn tại | ✅ đúng. (Phụ: `data/specificity.json` mà `gir-specificity.js` tham chiếu cũng **chưa tồn tại** — đang fallback `{}`.) |
| chapter-specific-rules "đã là vocab thuộc tính" | ✅ đúng, nhưng **2 field song song 2 quy ước** (`requiredAttributes` lệch EN/VN; `chapterSpecificRequired` toàn EN). Registry ở 9.3 phải gom cả hai. |

## 9.5 Mượn "khung 6 trục luật" thay vì tự chế điều kiện

Paper 2605.14857 chỉ ra lỗi kinh điển của LLM: *giải đúng 1 trục rồi viết lý do trôi chảy nhưng bỏ qua ràng buộc ở các trục còn lại*. Dùng **6 trục làm checklist loại node/cột** để cây/bảng không sót trục:
1. thành phần vật liệu · 2. trạng thái gia công · 3. công dụng · 4. **bản chất (essential character — GIR 3b)** · 5. part-vs-whole (bộ phận vs tổng thể) · 6. mã cụ thể ưu tiên mã "loại khác".

**Nguyên tắc thứ tự thuộc tính khi làm thủ công** (không có information gain như ML): (a) thuộc tính **mang tính pháp lý quyết định** (chú giải Chương/Phần dùng làm ranh giới) hỏi TRƯỚC — với HS, pháp lý THẮNG "phân tách nhanh"; (b) rồi tới thuộc tính phân tách mạnh + rẻ/chắc để lấy. Ghi `attributeOrder[]` + `rationale` mỗi group để reviewer kiểm được.

**Bắt buộc:** mỗi `hs`/leaf phải **neo văn bản thật** (chú giải chương/mục HOẶC TB-TCHQ trong `precedents.json` — repo có 1.058 bản), KHÔNG neo trực giác. Override sai luật nguy hiểm hơn để LLM tự chọn.

## 9.6 KHÔNG kéo rule engine + validator BẮT BUỘC

- **Tự viết table evaluator ~150 dòng** — KHÔNG dùng json-rules-engine / nools / Drools. Lý do: (a) logic chỉ là "match dòng bảng theo thuộc tính enum", quá đơn giản để cần Rete; (b) audit trail phải tự bọc mới sạch; (c) serverless Vercel — thêm dependency = phình bundle + chậm cold start. Chỉ nâng lên `@hbtgmbh/dmn-eval-js` (DMN chuẩn, chạy Node, không cần Java) NẾU sau này CEO muốn nghiệp vụ tự sửa bảng bằng công cụ đồ họa (Camunda Modeler). Hiện chưa cần.
- **`scripts/validate-resolver.js` chạy CI** — 6 kiểm tra: **reachability** (không dòng luật chết), **completeness** (tích Descartes enum phủ hết — chỉ khả thi vì là bảng), **consistency/non-overlap** (không 2 luật mâu thuẫn), **cycle detection** (nếu còn dùng cây/`goto`), **leaf ∈ `tax.json`** (mã tồn tại thật trong 11.871 mã), **value ∈ domain** (giá trị luật thuộc enum khai báo). Không có validator này thì "deterministic" chỉ là ảo giác an toàn.

## 9.7 Cập nhật Next steps (thay mục 8, đã tinh chỉnh)

1. Issue: `feat(classify): conflict resolver deterministic bằng decision-table (không phải tree)`.
2. Tạo `data/attributes.json` = **registry canonical + alias EN/VN** (9.3) TRƯỚC — vì nó chặn bug vocab đang tồn tại; đồng thời nới `attrs` ở `api/classify.js`.
3. Tạo `data/conflict-trees.json` → đổi tên khái niệm thành **`data/conflict-tables.json`**, schema `inputs[]`+`rules[]`+`hitPolicy` (9.1), seed 3-5 group gồm cụm 8507.
4. Thêm cụm 8507 vào `conflicts.json` (chỉ thêm `group`) + cân nhắc nâng riskLevel RED cho cụm rủi ro cao.
5. Patch `lib/classify.js`: chèn stage resolver ở B3.5, **tự build audit trail** (không giả định `girRulesApplied` có sẵn — xem 9.4), áp evidence guard (9.2), trả 3 trạng thái RESOLVED/NARROWED/INSUFFICIENT.
6. Viết `scripts/validate-resolver.js` (9.6) + đưa vào CI.
7. Parser `scripts/tbtchq_to_trees.mjs` sinh **luật bảng** (không phải cây) từ 1.058 TB-TCHQ; mỗi luật neo mã TB-TCHQ nguồn.

## 9.8 Nguồn tham chiếu (đã verify)

- **A Deterministic Agentic Workflow for HS Tariff Classification** — arXiv 2605.14857 (T5/2026) — kiến trúc gần y hệt, chứng minh thắng LLM thuần.
- **Explainable Product Classification for Customs** (Korea Customs) — arXiv 2311.10922 — 93.9% top-3, xác nhận cần tầng luật + chú giải.
- **ATLAS** — arXiv 2509.18400 — benchmark từ CROSS rulings; LLM thuần chỉ 40% ở 10 số.
- **DMN / decision table** — [Apache KIE/Drools DMN (gap+overlap analysis)](https://kie.apache.org/components/drools/drools_dmn/); [@hbtgmbh/dmn-eval-js](https://github.com/HBTGmbH/dmn-eval-js).
- **Multi-access / polyclave key** — [Wikipedia: Multi-access key](https://en.wikipedia.org/wiki/Multi-access_key).
- **Verification lý thuyết** — Semantic DMN (arXiv 1807.11615), Soundness verification (arXiv 1804.02316).
- **Tiền lệ ngành** — 3CE (expert system, WCO Technology Network), Canada Tariff Finder (probing questions).
