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
