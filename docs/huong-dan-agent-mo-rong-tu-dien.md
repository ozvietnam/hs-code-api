# Hướng dẫn vòng lặp mở rộng từ điển — đi hết cuốn biểu thuế theo nhóm 4 số

Tài liệu này viết cho **một agent nhận một nhóm HS 4 số** (`8481`, `7208`, `8536`…)
để soạn từ điển tên thương mại, và cho **CEO tạo vòng lặp** giao việc liên tục.
Bản v2 (2026-09-17) thay bản v1 sau khi nghiệm thu 7 nhóm đầu: giữ chuẩn
"phủ 100% lá", thêm **hàng đợi cả biểu thuế**, **một lệnh nghiệm thu**, và
**benchmark tính bằng giây** để không ai còn lý do cắt bớt.

Đọc hết trước khi sửa file nào. Mọi luật ở đây đều có test hoặc lệnh khoá —
làm sai là đỏ, không nhận.

---

## 0. Một màn hình — vòng lặp cho một nhóm

```bash
npm run dict:queue                          # 1. xem hàng đợi, lấy nhóm ĐẦU TIÊN còn open đúng tầng được giao
npm run dict:queue -- --claim=8536 --by=<tên-agent>      # 2. nhận (sổ tiến độ khoá, agent khác không nhận trùng)
node -e "..."                               # 3. đọc lá của nhóm + phạm vi dòng dư (mục 3)
#   soạn mục vào data/trade-synonyms.json  # 4. theo mục 4–5; ≥1 ca/mục vào tests/search-cases.json
npm run dict:check -- 8536                  # 5. MỘT lệnh nghiệm thu: schema, phủ 100%, lint, ca search, benchmark delta
npm run dict:coverage -- 8536               # 6. sinh biên bản data/heading-coverage/8536.json (chỉ ghi khi 100%)
npm run dict:queue -- --done=8536 --by=<tên-agent> --commit=<sha>   # 7. chốt sổ
git add -A && git commit -m "feat(data): phủ 100% lá nhóm 8536 — <tên hàng chính> (#34)"
```

Rồi đẩy nhánh `dict/8536`, mở PR draft, ghi **một dòng** lên Issue #34
(nhóm · số lá · số mục · kết quả `dict:check`). Xong. Không nhận nhóm thứ hai
trong cùng lượt trừ khi vòng lặp bảo làm tiếp.

Bước 5 mà đỏ thì **không có bước 6–7**. Bước 6 tự từ chối ghi nếu chưa 100%.
Bước 7 tự từ chối nếu chưa có biên bản. Ba khoá này là cố ý.

---

## 1. Mục tiêu, thước đo, và thứ KHÔNG phải thước đo

**Mục tiêu cuối:** người đi khai gõ tên hàng *theo cách họ gọi* (Alibaba, báo
giá, tiếng lóng nghề) và ra đúng mã 8 số, kể cả ở ngành Oz chưa từng nhập.

**Thước đo tiến độ** (in ở đầu `dict:queue`): số lá đã phủ / 11.414 lá
(không tính ch.98), và số nhóm `done` trong `data/dictionary-progress.json`.
Tới 2026-09-17: 162 lá, 7 nhóm.

**Thước đo chất lượng:** số ca trong `tests/search-cases.json` gõ tên thương
mại thật mà ra đúng nhóm. Mỗi mục mới phải góp ít nhất một ca.

**Benchmark holdout 763 tờ khai Oz KHÔNG phải thước đo tiến độ.** Nó là
*phanh*: chứng minh mục mới không đè lên tiền lệ thật. Từ điển chương 72
không thể làm số này tăng (Oz có 1 tờ khai chương 72) và không được làm nó
giảm. Đừng khoe benchmark tăng, đừng vặn mục để cứu 0,1%.

---

## 2. Hàng đợi cả biểu thuế — lấy việc ở đâu, làm cái nào trước

`npm run dict:queue` xếp **1.269 nhóm 4 số** theo chỗ từ điển tay đang thiếu
nhất. Mỗi cột đều in ra để ai cũng kiểm được:

| Cột | Nghĩa | Vì sao xếp hạng |
|---|---|---|
| `lỗi` | tờ khai thật bị đoán sai trong nhóm (`conflict-worklist.json`) | lỗi đã xảy ra là lý do mạnh nhất |
| `oz` / `ozlá%` | số tờ khai Oz rơi vào nhóm / tỉ lệ lá đã có alias | Oz làm nhiều mà alias phủ mỏng → gõ tên thật ra mã cụt |
| `dư%` | tỉ lệ dòng "Loại khác" | nhóm toàn dòng dư thì lời văn biểu thuế câm |
| `lá` | số mã 8 số | to hơn thì đáng hơn một chút, chỉ một chút |

**Tầng** quyết định làm lúc nào:

- **A** — có lỗi thật, hoặc Oz nhiều mà phủ mỏng, hoặc ≥50% dòng dư. **Làm trước.** 230 nhóm.
- **B** — công nghiệp ch.25–96 chưa có tín hiệu đặc biệt. 799 nhóm.
- **C** — ch.01–24 nông sản/thực phẩm: tên biểu thuế đã là tên chợ, Oz không có tờ khai. Làm sau cùng. 199 nhóm.
- **X** — ch.98 phụ lục ưu đãi đặc biệt, không tra bằng tên hàng. **Bỏ.** 41 nhóm.

Agent lấy **nhóm đầu tiên còn `open`** trong tầng được giao. Không tự chọn
nhóm "quen"; không nhận hai nhóm một lúc; không nhận nhóm đang `claimed` của
người khác (`--release` chỉ khi CEO xác nhận họ đã bỏ).

`--write` ghi `data/dictionary-queue.json` để agent không cần tính lại; file
này sinh ra được, sinh lại sau mỗi vòng.

---

## 3. Ba từ điển, và cái nào là của bạn

| File | Bản chất | Ai sửa |
|---|---|---|
| `data/hs-aliases.json` | **Đào tự động** từ tờ khai Oz (`npm run data:build-aliases`) | **KHÔNG sửa tay.** |
| `data/trade-synonyms.json` | **Soạn tay**: tên thương mại → ứng viên mã, mã bẫy, câu hỏi gạn | **Việc của bạn** |
| `data/mechanisms.json` | **Soạn tay**: cơ cấu (thủy lực, khí nén…) gỡ khỏi câu trước khi tìm | Chỉ khi nhóm có cơ cấu mới |

Từ điển tay mà sai thì **sai có hệ thống** — luật khắt khe là cố ý.

Đọc lá và phạm vi thật của dòng dư **bằng chính data trong repo**, không từ trí nhớ:
```bash
node -e "const t=require('./data/tax.json'); for(const k of Object.keys(t).filter(k=>k.startsWith('8536'))) console.log(k,'|',t[k].vn)"
node -e "const c=require('./data/hs-context.json').context; console.log(c['85369099'])"
node -e "const {breadcrumbOf}=require('./lib/hs-breadcrumb.js'); console.log(breadcrumbOf('85369099'))"
```

---

## 4. Soạn mục — quy trình 6 bước

### Bước 1 — Liệt kê cách người ta GÕ, không phải cách biểu thuế VIẾT
Nguồn: tên trên Alibaba/1688/Shopee, báo giá, tên dân buôn gọi miệng, tiếng
Anh thương mại, mác/ký hiệu. **Mỗi cụm phải là thứ người thật gõ vào ô tìm.**
Không cần thêm biến thể không dấu (`van sam`) — bộ khớp tự bỏ dấu khi câu
hỏi không dấu; thêm vào chỉ tốn chỗ.

### Bước 2 — Tra mã bằng CHÍNH biểu thuế trong repo (lệnh ở mục 3)
Mã không có trong `tax.json` là mã chết — test chặn.

### Bước 3 — Tìm MÃ BẪY
```bash
node -e "const {searchCandidates}=require('./lib/search-utils.js'); console.log(searchCandidates('CỤM CỦA BẠN',{topCandidates:5}).map(c=>c.hsCode+' '+c.nameVi))"
```
Cái gì sai mà **nghe khớp** — đó là bẫy → `avoid` + `whyVi` giải thích bằng
bản chất hàng. Mục không có `avoid` lẫn `excludeIfAny` bị lint nhắc: bước
này chưa làm.

### Bước 4 — Viết mục đúng schema
```json
{
  "id": "ban-nang-thuy-luc",
  "titleVi": "Bàn nâng / xe bàn nâng thủy lực (lift table)",
  "terms": ["bàn nâng", "xe bàn nâng", "lift table", "scissor lift"],
  "excludeIfAny": ["xe nâng hàng", "forklift"],
  "excludeReasonVi": "Xe nâng càng thuộc 8427 theo nhóm riêng — không phải bàn nâng.",
  "candidates": [
    { "hs": "84289090", "whenVi": "Không tự hành, nâng bằng thủy lực/cắt kéo, không phải thang máy hay băng tải", "confidence": "medium" },
    { "hs": "84289030", "whenVi": "Chỉ khi là thiết bị đẩy/lật goòng mỏ — hiếm với bàn nâng", "confidence": "low" }
  ],
  "avoid": [{ "prefix": "2522", "whyVi": "'Vôi thủy lực' chỉ trùng chữ — vật liệu xây dựng, không phải máy." }],
  "askVi": ["Có tự hành không? (có → xem 8427)", "Tải trọng và chiều cao nâng?"],
  "gir": "1",
  "basis": "RULE_TABLE",
  "sourceVi": "Biểu thuế 2026 nhóm 8428; mã dư 84289090 vì không thuộc phân nhóm kể tên."
}
```

**Bốn luật bắt buộc** (`test-trade-synonyms` chặn):
1. Mọi `candidates[].hs` tồn tại trong `tax.json`.
2. Có `sourceVi` dẫn nguyên văn biểu thuế / chú giải.
3. `confidence` ∈ `high|medium|low`; **`high` chỉ khi biểu thuế gọi đích danh mặt hàng.**
4. Mỗi ứng viên có `whenVi`.

**Bốn luật chất lượng** (`dict:check` lint — nhóm mới thì là lỗi, nhóm cũ thì cảnh báo):

5. **`whenVi` là ĐIỀU KIỆN người khai tự trả lời được, không chép tên dòng.**
   Người tra đã thấy tên dòng biểu thuế; chép lại là zero thông tin. Sai:
   `"- - - Loại khác — mã 7216.32.90"`. Đúng: `"Cao ≥80 mm, cánh dày hơn thân, không phải I-beam tiêu chuẩn"`.
   Nghiệm thu 7 nhóm đầu: **106 ứng viên** chép tên dòng — đó là "phủ 100%"
   bằng cách dán, không phải bằng cách hiểu.
6. **Cụm có dấu không được trùng chữ-bỏ-dấu với dòng khác nghĩa.** `tủ điện` ↔
   `tụ điện`, `van săm` ↔ `vân sam` (gỗ), `vòi nước` ↔ `với nước`. Bộ khớp nay
   bắt đúng dấu khi câu có dấu, nhưng câu không dấu vẫn có thể dính — lint
   liệt kê dòng va chạm; đổi cụm dài hơn hoặc thêm `excludeIfAny`.
7. **Một mục ≤ 12 ứng viên.** Mục 16–22 ứng viên điểm bằng nhau là
   "túi rác": người tra nhận 16 mã và câu hỏi *"Ø bao nhiêu?"*. Tách theo
   **tên thương mại thật** (thép hình H / U / I / L / V là năm tên chợ khác
   nhau → năm mục), mỗi mục ít lá, `whenVi` sắc.
8. **Nhiều ứng viên thì tối đa một `high`.**

**Lá tách theo Ø / độ dày / carbon / khối lượng** (kiểu 8481.80, 7208) vẫn
phải nằm trong `candidates` của mục có tên thương mại đúng — với `whenVi` là
*điều kiện số* (`"Ø trong ≤ 2,5 cm"`) và `askVi` hỏi đúng số đó. Không tạo
mục "nhánh còn lại" với cụm chung chung (`van công nghiệp`) chỉ để đủ 100%.

### Bước 5 — Cơ cấu (chỉ khi cần)
Cụm chỉ **cơ cấu** làm nhiễu ("thủy lực" kéo về vôi) → `data/mechanisms.json`,
bắt buộc `keepWhenHeadNounIs` (danh từ đi cùng thì cơ cấu là *tên hàng*:
"dầu thủy lực"). `test-query-parse` canh.

### Bước 6 — Ca search
Mỗi mục ≥1 ca, câu là **cụm người thật gõ**, kỳ vọng theo prefix nhóm:
```json
{ "id": "lift-table-mech", "query": "bàn nâng thủy lực", "minResults": 1, "topHsPrefix": "8428" }
```
Lint kiểm: mục nào không có ca nào chứa cụm của nó → nhắc.

---

## 5. `dict:check` — cửa nghiệm thu duy nhất

```
[1] schema, mã chết, phanh          test-trade-synonyms
[2] phủ 100% lá                     liệt kê từng mã còn thiếu kèm tên dòng
[3] lint chất lượng                 luật 5–8 ở trên + "chưa nghĩ mã bẫy"
[4] ca search                       mục nào chưa có ca + test-search
[5] benchmark holdout DELTA         chính xác, vài giây
```

**Vì sao benchmark giờ tính bằng giây và không còn cớ `--limit`:** một mục
từ điển chỉ tác động lên câu **chứa** một cụm của nó. Bản ghi không chứa cụm
nào của mục vừa đổi thì kết quả *không thể* đổi — `bench:delta` lấy lại từ
cache, chỉ chấm lại bản ghi bị chạm. Đây là đúng tuyệt đối, không phải xấp xỉ.
Khi `lib/`, `tax.json`, alias, `mechanisms.json` đổi thì cache tự vô hiệu và
chạy đủ 763 (11 phút, một lần). Cache ở `data/.bench-cache/` (gitignored).

Trước đây commit `5fcb947` chốt bằng `--limit=200`; tập con 300 từng cho
kết luận ngược tập đủ. Từ nay `--limit` không có trong quy trình.

Nhóm **đã `done`** chạy `dict:check` chỉ nhận cảnh báo ở [3] — nợ cũ được
ghi nhận, không chặn người sau. Nhóm **mới** thì [3] là điều kiện nhận.

---

## 6. Những điều KHÔNG được làm

- Không chốt mã từ trí nhớ; mọi mã đối chiếu `tax.json`, phạm vi đối chiếu `hs-context.json`.
- Không sửa `data/hs-aliases.json`, `data/heading-coverage/*.json`, `data/dictionary-queue.json` tay — đều là output script.
- Không gắn nhãn GIR ngoài `lib/gir.js`; trường `gir` trong mục chỉ là gợi ý.
- Không đặt `high` cho mục nhiều ứng viên; bảng tay nhận "chưa chắc" thì alias tiền lệ thật mới được thắng ("biến tần": 6/6 tờ khai Oz khai 85044040, mã thật thắng).
- Không thêm tên khách, tên công ty, số tờ khai — ba từ điển là công khai (CC BY-SA).
- Không đẩy thẳng `main` khi `dict:check` đỏ. Không cắt benchmark.
- Không "hoàn thành" nhóm bằng mục túi rác — 100% lá là *hệ quả* của việc hiểu nhóm, không phải mục tiêu tự thân.

---

## 7. Giao nộp và ghi sổ

- Nhánh `dict/<nhóm>` từ `main` mới nhất. Một nhóm một PR draft. Tiêu đề
  `feat(data): phủ 100% lá nhóm <nhóm> — <tên hàng chính> (#34)`.
- Body PR dán nguyên khối tổng kết của `dict:check` (dòng ✅/⚠/✗) và bảng
  `bench:delta`. Không cần bảng số dài.
- `data/dictionary-progress.json` là **sổ tiến độ** — nguồn sự thật cho hàng
  đợi và cho test (`done` mà thiếu biên bản → đỏ). Issue #34 là nhật ký người
  đọc: một dòng mỗi nhóm.
- CEO (hoặc agent nghiệm thu) chạy lại `npm run dict:check -- <nhóm>` trên
  nhánh, xanh thì merge. Merge xong: `npm run dict:queue -- --write` để hàng
  đợi cập nhật.

---

## 8. Mẫu prompt cho vòng lặp (CEO dán cho agent, mỗi lượt một nhóm)

> Bạn đang trong vòng lặp mở rộng từ điển `hs-code-api`. Đọc
> `docs/huong-dan-agent-mo-rong-tu-dien.md` (bản v2) trước khi làm gì.
> 1. `git fetch origin main && git checkout -B dict/next origin/main`
> 2. `npm run dict:queue` — lấy nhóm **đầu tiên còn open ở tầng A** (hết A thì B).
>    `npm run dict:queue -- --claim=<nhóm> --by=<tên-bạn>` rồi đổi tên nhánh thành `dict/<nhóm>`.
> 3. Soạn mục theo mục 4 của hướng dẫn: tên chợ thật, mã bẫy, `whenVi` là điều
>    kiện, ≤12 ứng viên/mục, ≥1 ca search/mục.
> 4. `npm run dict:check -- <nhóm>` tới khi ✅ không cảnh báo. Không dùng `--no-bench` để chốt.
> 5. `npm run dict:coverage -- <nhóm>` → `npm run dict:queue -- --done=<nhóm> --by=<tên-bạn> --commit=<sha>`.
> 6. Commit, push nhánh, mở PR draft dán khối tổng kết `dict:check`; ghi một dòng lên Issue #34.
> 7. Dừng. Không nhận nhóm thứ hai. Nếu nhóm bất khả thi (biểu thuế tách thuần
>    theo số, không có tên thương mại nào) thì `--release` và ghi lý do lên Issue #34 — đó cũng là kết quả.

Hai agent chạy song song là an toàn: `--claim` khoá nhóm trong sổ; nhánh
tách nhau; `trade-synonyms.json` chỉ conflict nếu hai bên sửa cùng mục (id
trùng) — lint mã chết + test id trùng bắt khi merge.

---

## 9. Nợ đã ghi nhận sau 7 nhóm đầu (2026-09-17) — ai rảnh thì trả

`npm run dict:check -- <nhóm>` liệt kê. Tóm tắt:
- 106 ứng viên `whenVi` chép tên dòng (7208: 20, 8428: 21, 7216: 18, 8537: 16, 7209: 15, 8481: 13, 8427: 3).
- Ba mục túi rác: `van-848180-phu` (16 lá), `thep-hinh-u-i-h` (22), `thep-cuon-can-nong` (17) — tách theo tên chợ.
- 13/34 mục chưa có ca search gõ đúng cụm của nó.
- Ba cụm va chạm dấu đã chặn ở tầng lib (`van săm`/`vân sam`, `vòi nước`/`với nước`, `vòi đồng`/`với động cơ`); vẫn nên đổi cụm dài hơn để câu không dấu cũng an toàn.

## 10. Việc chưa làm, cố ý để sau

- **Parser chọn lá theo thông số.** `lib/query-parse.js` đã bóc `dày 3mm`,
  `cao 300mm` nhưng chưa bóc `i200`, `dn50`, `Ø25`; và `candidates` chưa có
  trường điều kiện số để máy chọn. Khi có, các nhóm tách theo Ø/độ dày tự
  phân giải thay vì hỏi. Đây là bước làm cho 8481.80/7208/7216 đúng thật.
- **Đào câu hỏi thật từ log tra cứu** trên server nhà → nạp vào hàng đợi (cột
  "người dùng hỏi mà không ra"). Log không nằm trong repo.
- **Nguồn tờ khai ngoài Oz** cho ch.72–81, 28–29: từ điển tay không thay được thống kê.
