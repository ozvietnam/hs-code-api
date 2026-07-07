---
description: Làm giàu sản phẩm định danh cho mã HS 8 số "Loại khác" — đào thêm từ queue ưu tiên trong stats file
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite
---

# /loai-khac-enrich — Làm giàu corpus sản phẩm mã Loại khác

Mục tiêu: tăng số sản phẩm thực tế (kiểu Shopee/Taobao) cho các mã HS 8 số "Loại khác"
đang còn mỏng. Mỗi lần chạy = đào thêm 1 batch mã từ **queue ưu tiên**, viết domain
template, regenerate, cập nhật bộ đếm. Bật lúc nào rảnh, dừng lúc nào cũng được —
trạng thái lưu trong `data/loai-khac-products-stats.json`.

## CONTEXT phải đọc trước

1. `CLAUDE.md` — 7 rule bất biến (privacy oz-export, Bearer auth, Vercel Pro)
2. `data/loai-khac-products-stats.json` — **state file**: bộ đếm + queue đào ưu tiên
3. `scripts/gen-loai-khac-products-rule.mjs` — engine sinh sản phẩm (bảng `H6EN_DOMAINS`)
4. `scripts/loai-khac-products-stats.mjs` — script đếm + chấm điểm độ đào sâu
5. `data/loai-khac-index.json` — tín hiệu mỗi mã: siblings (`s`), oz-gold examples (`ex`), risk (`r`), dutyGap (`g`)
6. `data/tax.json` — field `en` chứa h6En qualifier (sau dấu `;`)

## CÔNG THỨC nền (đã chốt — KHÔNG phá)

Mã 8 số Loại khác = hàng thuộc nhóm bố (6 số) ∩ nhóm ông (4 số) ∩ chương (2 số),
TRỪ tất cả sibling cụ thể. Sản phẩm sinh ra phải:
- Thuộc đúng phạm vi h6En (qualifier tiếng Anh trong `tax.json.en`)
- KHÔNG trùng bất kỳ sibling nào (`index.s[]`) — nếu trùng là sai
- Là tên hàng thực tế người bán dùng (có spec/chất liệu/công suất), KHÔNG mô tả chung chung

## THANG ĐÁNH GIÁ độ đào sâu (field `potential`)

| potential | nghĩa | canMine | hành động |
|-----------|-------|---------|-----------|
| `saturated` | đã có template domain ≥4 sp | false | bỏ qua — đủ rồi |
| `high` | có h6En rõ nhưng đang fallback | true | **đào trước** — viết template là ra nhiều sp |
| `medium` | có oz-gold anchor / template mỏng | true | đào được, mở rộng biến thể |
| `low` | chỉ sibling / không tín hiệu | true/false | ROI thấp — đào cuối hoặc bỏ |

`priorityScore = potW × riskWeight + dutyGapSignal` — queue sort giảm dần theo điểm này.
HIGH-risk + dutyGap lớn + có h6En = đào đầu tiên (sai mã = thiệt thuế nhiều nhất).

---

## WORKFLOW — mỗi lần chạy 1 batch

### PHASE 0: Refresh state (auto)

1. `TodoWrite` tạo task list các phase
2. Chạy `node scripts/loai-khac-products-stats.mjs --top 40`
   → đọc phân bố hiện tại + 40 mã ưu tiên nhất
3. Nếu CEO chỉ định chương/scope cụ thể (vd "đào chương 15 dầu mỡ") → filter theo đó.
   Nếu không → lấy top theo `mineableQueue`.

### PHASE 1: Gom nhóm theo h6En (auto)

1. Đọc `data/loai-khac-products-stats.json` → `mineableQueue`
2. **Gom mã theo h6En pattern** — nhiều mã chia sẻ cùng 1 h6En → 1 template phủ hết.
   Ví dụ: `15119042`, `15119049` cùng "palm oil... refined" → 1 domain "Dầu cọ tinh luyện".
3. Chọn batch: **8–15 pattern** mỗi lần (vừa sức, dễ verify). Ưu tiên:
   - potential=`high` + riskLevel=`HIGH` trước
   - pattern phủ nhiều mã trước (ROI cao)
4. **Report kế hoạch batch** cho CEO: bảng `h6En pattern | số mã | chương | sản phẩm dự kiến`.
   Không cần CEO confirm nếu pattern rõ ràng — code thẳng. Chỉ hỏi nếu h6En mơ hồ.

### PHASE 2: Viết domain template (core)

Với mỗi pattern, thêm entry vào `H6EN_DOMAINS` trong `gen-loai-khac-products-rule.mjs`:

```js
{
  match: /regex khớp h6En/i,
  domain: {
    type: 'Tên loại hàng tiếng Việt',
    items: [ /* 8-12 tên sản phẩm thực tế, có spec/chất liệu/quy cách */ ],
    // HOẶC dùng biến thể: { fuels:[...], specs:[...], pressures:[...], uses:[...] }
  },
}
```

**Quy tắc bất biến khi viết template:**
- Tên sản phẩm = kiểu listing người bán thật (Shopee/Taobao/B2B): có dung tích, công suất,
  chất liệu, tiêu chuẩn, quy cách. VD "Dầu cọ olein tinh luyện RBD IV56 phuy 200L".
- ❌ KHÔNG mô tả chung chung ("Sản phẩm dầu thông thường").
- Regex đặc thù đặt TRƯỚC regex chung (vd `parts of X` trước `X` — tránh match nhầm).
- KHÔNG để sản phẩm trùng tên sibling (check `index.s[]` của mã mẫu).
- Với máy móc ch.84–89: nhớ new/used tự detect qua digit thứ 7 — không cần ghi tay.
- 8–12 items/template là đủ (limit sinh = 12).

Kiến thức sản phẩm: dùng hiểu biết nội tại (đã định danh hàng VN). KHÔNG cần API ngoài.

### PHASE 3: Regenerate + verify (auto)

1. Regenerate các chương bị ảnh hưởng:
   `node scripts/gen-loai-khac-products-rule.mjs --chapter XX` (mỗi chương trong batch)
   hoặc `--all` nếu batch trải nhiều chương.
2. Refresh stats: `node scripts/loai-khac-products-stats.mjs`
3. **Verify checklist** (assert, nếu fail → sửa template rồi chạy lại):
   - Mã target chuyển `high → saturated` (hoặc productCount tăng rõ)
   - `byPotential.high` GIẢM so với trước batch
   - Spot-check 3–5 mã target: in `getProducts(hs)` — đúng loại hàng, không trùng sibling
   - Không có tenHang rỗng / trùng sibling (chạy check nhanh bằng node inline)
4. Report: trước/sau (high: N→M, saturated: A→B, sản phẩm: X→Y).

### PHASE 4: Commit + push (auto)

1. `git add scripts/gen-loai-khac-products-rule.mjs scripts/loai-khac-products-stats.mjs data/loai-khac-products/ data/loai-khac-products.jsonl data/loai-khac-products-stats.json`
2. **Privacy check**: `git status` — KHÔNG có `data/oz-export/*`, `.env`. (Corpus đã sạch — chỉ tên sản phẩm generic, không có thông tin khách.)
3. Commit:
   ```
   feat(data): làm giàu sản phẩm Loại khác — batch <mô tả> (+N mã saturated)
   ```
4. `git push -u origin <branch>` (retry backoff nếu lỗi mạng)
5. Vercel auto-deploy → chờ Ready (event PR tự báo, KHÔNG poll bằng sleep).

## FINAL REPORT format

```
✅ /loai-khac-enrich batch DONE

📊 Tiến độ:
- Batch này: N pattern → M mã chuyển saturated
- Tổng: high A→B | saturated C→D | sản phẩm X→Y | avg Z/mã
- canMine còn lại: K mã (queue tiếp theo: <top 3 h6En>)

🔍 Verify: target codes saturated ✓ | 0 trùng sibling ✓ | 0 rỗng ✓

⏭️ Còn đào được: K mã. Bật /loai-khac-enrich lần nữa khi rảnh.
   Hết hẳn khi byPotential.high = 0 (chỉ còn low/saturated).
```

## KHI NÀO DỪNG HẲN

- `byPotential.high == 0` → hết mã có h6En rõ để đào. Còn lại `low` (catch-all thuần,
  không tín hiệu) — ROI âm, không cần đào nữa.
- Hoặc CEO thấy đủ độ phủ cho nhu cầu tìm kiếm ERP.

## KHÔNG được làm

- ❌ Sửa công thức nền (4 tầng hierarchy) — chỉ THÊM domain template
- ❌ Sinh tên chung chung ("hàng hóa nhóm X loại thông thường") — đó là fallback, phải thay
- ❌ Để sản phẩm trùng sibling (sai bản chất Loại khác)
- ❌ Đào mã `low` không tín hiệu chỉ để tăng số — lãng phí
- ❌ Commit `data/oz-export/*` hay `.env`
- ❌ Chạy `--all` rồi commit mà chưa verify stats trước/sau
