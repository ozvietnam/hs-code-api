# Hướng dẫn cho agent: mở rộng từ điển theo tiểu mục

Tài liệu này viết cho **một agent được giao một tiểu mục hàng** (vd "thép làm
khuôn", "thiết bị nâng hạ", "bình giữ nhiệt") để đào data và thêm mục vào ba
từ điển. Đọc hết trước khi sửa file nào. Mọi luật ở đây đều có test khoá lại —
làm sai là `npm test` đỏ, không merge được.

## 0. Tại sao có ba từ điển, và cái nào là của bạn

| File | Bản chất | Ai sửa |
|---|---|---|
| `data/hs-aliases.json` | **Đào tự động** từ tờ khai Oz (`npm run data:build-aliases`) | **KHÔNG sửa tay.** Sinh lại từ script. |
| `data/trade-synonyms.json` | **Soạn tay**: tên thương mại → ứng viên mã, kèm mã bẫy + câu hỏi gạn | **Đây là việc chính của bạn** |
| `data/mechanisms.json` | **Soạn tay**: cơ cấu vận hành (thủy lực, khí nén…) để gỡ khỏi câu trước khi tìm | Chỉ thêm khi tiểu mục có cơ cấu mới |

Lý do tách: alias mạnh ở ngành Oz làm nhiều nhưng **câm** ở ngành Oz chưa nhập
(chương 72 chỉ 1 tờ khai). Từ điển tay lấp đúng chỗ đó. Từ điển tay mà sai thì
**sai có hệ thống, lần nào cũng sai** — nên luật bên dưới khắt khe là cố ý.

## 1. Quy trình 6 bước cho một tiểu mục

### Bước 1 — Liệt kê cách người ta GÕ, không phải cách biểu thuế VIẾT
Nguồn tốt: tên hàng trên Alibaba/1688/Shopee, tên trong báo giá, tên dân buôn
gọi miệng, tiếng Anh thương mại, mác/ký hiệu kỹ thuật. Ghi cả biến thể có dấu /
không dấu / viết tắt. **Mỗi cụm phải là thứ người thật gõ vào ô tìm.**

### Bước 2 — Tra mã, và tra bằng CHÍNH biểu thuế trong repo
```bash
node -e "const t=require('./data/tax.json'); for(const k of Object.keys(t).filter(k=>k.startsWith('8428'))) console.log(k,'|',t[k].vn)"
```
Mã không có trong `data/tax.json` là **mã chết** — test sẽ chặn. Đừng lấy mã từ
trí nhớ hay từ nguồn nước ngoài; biểu thuế Việt Nam có dòng 8 số riêng.

Với mã tên là "Loại khác", đọc phạm vi thật:
```bash
node -e "const c=require('./data/hs-context.json').context; console.log(c['84289090'])"
```

### Bước 3 — Tìm MÃ BẪY: mã nào trùng chữ nhưng khác hàng?
Chạy tìm kiếm hiện tại với cụm của bạn và xem cái gì lên đầu **sai**:
```bash
node -e "const {searchCandidates}=require('./lib/search-utils.js'); console.log(searchCandidates('bàn nâng thủy lực',{topCandidates:5}).map(c=>c.hsCode+' '+c.nameVi))"
```
Cái gì sai mà **nghe khớp** — đó là bẫy. Ghi vào `avoid` kèm `whyVi` giải thích
bằng bản chất hàng (nguyên liệu/thành phẩm, máy/vật liệu, bộ phận/nguyên chiếc).

### Bước 4 — Viết mục, đúng schema
```json
{
  "id": "ban-nang-thuy-luc",
  "titleVi": "Bàn nâng / xe bàn nâng thủy lực (lift table)",
  "terms": ["bàn nâng", "xe bàn nâng", "lift table", "scissor lift"],
  "excludeIfAny": ["xe nâng hàng", "forklift"],
  "excludeReasonVi": "Xe nâng càng thuộc 8427 theo nhóm riêng — không phải bàn nâng.",
  "candidates": [
    { "hs": "84289090", "whenVi": "Không tự hành, nâng thủy lực/cắt kéo", "confidence": "medium" },
    { "hs": "84279000", "whenVi": "Tự hành hoặc là xe công tác có thiết bị nâng", "confidence": "low" }
  ],
  "avoid": [
    { "prefix": "2522", "whyVi": "'Vôi thủy lực' chỉ trùng chữ — vật liệu xây dựng, không phải máy." }
  ],
  "askVi": ["Có tự hành không? (có → 8427)", "Tải trọng và chiều cao nâng?"],
  "gir": "1",
  "basis": "RULE_TABLE",
  "sourceVi": "Biểu thuế 2026 nhóm 8428 và 8427; mã dư 84289090 vì không thuộc phân nhóm kể tên."
}
```

**Bốn luật bắt buộc** (`npm run test:trade-synonyms` chặn nếu vi phạm):
1. Mọi `candidates[].hs` phải tồn tại trong `tax.json`.
2. Phải có `sourceVi` dẫn **nguyên văn** biểu thuế / chú giải. Không dẫn được thì đừng thêm.
3. `confidence` ∈ `high | medium | low`. **Chỉ `high` khi biểu thuế gọi đích danh mặt hàng** (vd 84796000 "Máy làm mát không khí bằng bay hơi"). Tên thương mại ứng với nhiều mã tuỳ khổ/dạng/thành phần → tối đa `medium`, kèm `askVi`.
4. Mỗi ứng viên phải có `whenVi` — điều kiện áp dụng. Thiếu nó người tra không biết mình thuộc ứng viên nào.

**Hai cái phanh phải cân nhắc cho mỗi mục:**
- `excludeIfAny`: cụm nào xuất hiện thì mục **tự tắt**. Ví dụ đã có: "inverter" trong "máy điều hòa inverter" là *tính năng*, không phải bộ biến tần 8504. "bộ khuôn" làm mục thép-nguyên-liệu tự tắt vì đó là *khuôn thành phẩm*.
- Từ khoá **thuần số** (`2311`, `718`) chỉ được tính khi câu có từ ngữ cảnh trong `numericTermContext` — không thì "mua 2311 cái bút" cũng dính. Đừng thêm số trần mà không có từ ngữ cảnh tương ứng.

### Bước 5 — Cơ cấu (chỉ khi cần)
Nếu tiểu mục có từ chỉ **cơ cấu** làm nhiễu tìm kiếm (kiểu "thủy lực" kéo về vôi),
thêm vào `data/mechanisms.json`. Bắt buộc điền `keepWhenHeadNounIs`: danh sách
danh từ mà khi đứng cùng thì cơ cấu là **một phần tên hàng**, phải giữ. Quên là
"dầu thủy lực" bị gỡ thành "dầu". Test `test-query-parse.mjs` có ca canh việc này.

### Bước 6 — Kiểm, đo, rồi mới commit
```bash
npm run test:trade-synonyms    # schema + mã chết + phanh
npm run test:query-parse       # cơ cấu không gỡ nhầm
npm run test:search            # thêm ca của bạn vào tests/search-cases.json
npm run bench:aliases          # 763 tờ khai giữ riêng — KHÔNG mức nào được giảm
```
Thêm **ít nhất một ca** vào `tests/search-cases.json` cho mỗi mục mới:
```json
{ "id": "lift-table-mech", "query": "bàn nâng thủy lực", "minResults": 1, "topHsPrefix": "8428" }
```

Benchmark mất ~11 phút. **Bắt buộc chạy đủ 763**, đừng cắt `--limit` để chốt —
tập con 300 từng cho kết luận ngược với tập đủ. Nếu mức nào giảm, mục của bạn
đang đè lên tiền lệ thật; xem lại `avoid` có quá rộng không.

## 2. Những điều KHÔNG được làm

- **Không chốt mã từ trí nhớ.** Mọi mã đối chiếu `tax.json`; mọi phạm vi đối chiếu `hs-context.json`.
- **Không sửa `data/hs-aliases.json` tay.** Nó là output của script.
- **Không gắn nhãn GIR ở đâu ngoài `lib/gir.js`.** Trường `gir` trong mục chỉ là gợi ý cho resolver; trích dẫn ra người dùng đi qua `lib/gir.js`.
- **Không đặt `confidence: "high"` cho mục có nhiều ứng viên.** Bảng tay thừa nhận chưa chắc thì lớp alias (tiền lệ thật) mới được lên trên — đó là thiết kế, xem "biến tần": bảng tay đề xuất 85044090, 6/6 tờ khai Oz khai 85044040, mã thật thắng.
- **Không thêm thông tin khách hàng, tên công ty, số tờ khai.** Ba từ điển là công khai (CC BY-SA).
- **Không "giải quyết triệt để"** 3.050 mã Loại khác bằng từ điển tay — mỗi mục là một ca, làm kỹ từng ca.

## 3. Cách đọc kết quả khi kiểm tra tay
```bash
node -e "
const {searchCandidates}=require('./lib/search-utils.js');
const r=searchCandidates('CỤM CỦA BẠN',{topCandidates:5});
console.log(r.map(c=>c.hsCode+' '+c.source));
console.log('parsed:', r.parsedQuery);        // lõi, cơ cấu, thông số đã bóc
console.log('loại:', r.avoidedByTradeRules);   // mã bẫy đã chặn + lý do
"
```
`source` cho biết ứng viên đến từ đâu: `tax.json` (khớp lời văn), `oz-alias`
(tiền lệ tờ khai), `trade-synonyms` (mục của bạn). Mục của bạn có `low` mà vẫn
lên trên alias `high` là **sai điểm**, không phải thành công.

## 4. Mẫu giao việc (CEO copy cho agent)

> Tiểu mục: **<tên>**. Đọc `docs/huong-dan-agent-mo-rong-tu-dien.md` trước.
> Làm đủ 6 bước; mỗi mục mới kèm ≥1 ca trong `tests/search-cases.json`.
> Chạy `npm test` và `npm run bench:aliases` đủ 763, dán bảng số vào PR.
> Không mức benchmark nào được giảm. Mở PR draft, không tự merge.
