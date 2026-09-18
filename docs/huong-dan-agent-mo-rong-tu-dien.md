# Hướng dẫn vòng lặp: bảng quyết định theo nhóm 4 số — đi hết cuốn biểu thuế

Bản v3.1 (2026-09-18; mục 3.5 thêm sau nghiệm thu 26 bảng đầu), CEO chốt: **tên gọi / chức năng / công dụng đưa hàng tới
NHÓM 4 số; từ 6 xuống 8 số do THUỘC TÍNH quyết định.** Không ai gõ tên hàng
khác nhau cho 84818021 và 84818022 — cái tách chúng là Ø cửa nạp. Vì thế đơn
vị việc của agent đổi từ "từ điển tên phủ 100 % lá" (bản v2, đã nghiệm thu:
106 dòng chép tên biểu thuế, mục 16 mã điểm bằng nhau) sang **một bảng quyết
định cho một nhóm**: thuộc tính nào tách nhóm, giá trị nào về lá nào, thiếu dữ
kiện nào thì hỏi. Từ điển tên thu về cấp nhóm.

Đọc hết trước khi sửa file nào. Mọi luật đều có test hoặc lệnh khoá.

---

## 0. Một màn hình — vòng lặp cho một nhóm

```bash
npm run dict:queue                                   # 1. lấy nhóm ĐẦU TIÊN còn open đúng tầng được giao
npm run dict:queue -- --claim=8536 --by=<tên-agent>  # 2. nhận; sổ tiến độ khoá, không ai nhận trùng
npm run dict:table -- 8536                           # 3. đọc MỌI lá (cột EN giữ điều kiện dòng cha mà tiếng Việt lược mất)
npm run dict:table -- 8536 --oz                      # 3b. đề bài: tên hàng THẬT trong tờ khai Oz của nhóm, kèm số lần
npm run dict:table -- 8536 --init                    # 4. sinh khung data/decision-tables/8536.json
#   viết bảng (mục 3) + ca kiểm vào tests/decision-cases.json (mục 4)
#   nếu tên chợ chưa dẫn về nhóm: thêm mục từ điển CẤP NHÓM (mục 5)
npm run dict:table -- 8536 --try "câu người gõ"      # 5. chạy thử từng câu
npm run dict:check -- 8536                           # 6. MỘT lệnh nghiệm thu (5 bước)
npm run dict:queue -- --done=8536 --by=<tên-agent> --commit=<sha>   # 7. chốt sổ (tự từ chối nếu bảng chưa phủ hết lá)
git add -A && git commit -m "feat(data): bảng quyết định nhóm 8536 — <tên hàng chính> (#34)"
```

Đẩy nhánh `dict/8536`, mở PR draft, một dòng lên Issue #34. Xong. Không nhận
nhóm thứ hai trong cùng lượt.

---

## 1. Mục tiêu và thước đo

**Mục tiêu:** hỏi đúng dữ kiện, chốt đúng lá. Người khai đưa tên hàng + vài
thông số; hệ thống về đúng nhóm, rồi hoặc chốt lá 8 số kèm luật + căn cứ, hoặc
hỏi đúng thuộc tính còn thiếu. Không đoán.

**Thước đo tiến độ** (đầu `dict:queue`): số lá có bảng quyết định / 11.414 lá
(không tính ch.98). Tới 2026-09-17: 20 lá, 2 bảng mẫu (8427, 7209).

**Thước đo chất lượng:** `tests/decision-cases.json` — mọi lá của bảng có ca
chốt ra nó, và có ca "thiếu dữ kiện thì hỏi".

**Benchmark holdout 763 tờ khai Oz là PHANH, không phải thước đo tiến độ:**
bảng mới không được đè lên tiền lệ thật. `bench:delta` chạy vài giây.

---

## 2. Hàng đợi — lấy nhóm nào trước

`npm run dict:queue` xếp 1.269 nhóm theo: `lỗi` (tờ khai thật đoán sai),
`oz`/`ozlá%` (Oz làm nhiều mà alias phủ mỏng), `dư%` (tỉ lệ dòng "Loại khác"),
`lá`. Tầng **A** 230 nhóm làm trước; **B** 799; **C** 199 (ch.01–24, sau
cùng); **X** 41 (ch.98, bỏ). Cột `từđiển ✓` = nhóm đã có mục từ điển từ đợt
2026-09-16, chỉ còn thiếu bảng — nhận nhóm này nhanh hơn vì lá đã được đọc.

Agent lấy **nhóm đầu tiên còn open** trong tầng được giao. Không tự chọn nhóm
quen, không nhận hai nhóm, không nhận nhóm `claimed` của người khác.

---

## 3. Viết bảng quyết định — đây là việc chính

Bảng ở `data/decision-tables/<nhóm>.json`. Xem hai bảng mẫu: `8427.json`
(thuộc tính phân loại) và `7209.json` (ngưỡng số, 17 lá, 6 thuộc tính).

```json
{
  "heading": "8427",
  "titleVi": "Xe nâng hàng và xe công tác có thiết bị nâng",
  "verified": false,
  "essenceTestVi": "Xe có TỰ HÀNH không, và nếu tự hành thì chạy bằng mô tơ điện hay động cơ khác?",
  "sourceVi": "Biểu thuế 2026 nhóm 84.27 …; Chú giải HS 84.27 …",
  "inputs": [
    { "attribute": "selfPropelled", "type": "enum", "domain": ["yes", "no"],
      "questionVi": "Xe có tự hành không — có động cơ đẩy xe đi, hay chỉ đẩy/kéo tay?",
      "detect": { "yes": ["tự hành", "xe nâng điện", "diesel"], "no": ["xe nâng tay", "hand pallet"] } },
    { "attribute": "thicknessMm", "type": "number", "unit": "mm", "fromSpec": "thickness",
      "questionVi": "Chiều dày bao nhiêu mm?" }
  ],
  "hitPolicy": "PRIORITY",
  "rules": [
    { "id": "r-electric", "priority": 20, "when": { "selfPropelled": "yes", "driveType": "electric" },
      "hs": "84271000", "gir": "GIR 6", "reasonVi": "Tự hành, mô tơ điện → 8427.10.00", "source": "Biểu thuế 2026 dòng 8427.10.00" }
  ]
}
```

### 3.1 Cách máy đọc bảng — hiểu cái này trước khi viết luật
- Một luật **khả dĩ** khi không điều kiện nào bị dữ kiện đã biết bác bỏ; **khớp**
  khi mọi điều kiện được thoả.
- Máy lấy luật khả dĩ có `priority` cao nhất. Khớp → **RESOLVED**. Chưa khớp vì
  thiếu dữ kiện → **INSUFFICIENT**, hỏi đúng dữ kiện đó.
- Vì thế luật "Loại khác" để `priority` thấp và điều kiện ít; nó chỉ thắng khi
  các nhánh cụ thể đã bị dữ kiện loại. Không có chuyện người dùng chưa nói gì
  mà rơi vào "Loại khác".
- Điều kiện số: `{ "gte": 3 }`, `{ "gt": 1, "lt": 3 }`, `{ "lte": 0.17 }`.
  Điều kiện enum: chuỗi trong `domain`.

### 3.2 Thuộc tính (`inputs`)
- **Đặt tên theo bản chất**, camelCase, tái dùng tên đã có trong
  `data/attributes.json` khi trùng nghĩa (`voltage`, `engineCapacity`,
  `steelGrade`…). Tên số kèm đơn vị: `thicknessMm`, `widthMm`, `carbonPct`.
- `questionVi` là câu **người khai tự trả lời được**, nêu ngưỡng nếu có:
  *"Chiều dày bao nhiêu mm? (ngưỡng ≥3 / 1–3 / 0,5–1 / <0,5)"*.
- Enum: `detect` là cụm nhận diện trong câu, theo giá trị. Hai giá trị cùng
  xuất hiện → máy coi là chưa biết và hỏi (đúng: "cuộn tấm" là mâu thuẫn).
- Số: `fromSpec` nối với parser (`thickness`, `width`, `height`, `diameter`,
  `capacity`, `power`, `voltage`, `volume`, `weight`…); "dày 0,8 ly" hiểu là
  0,8 mm. Thiếu `fromSpec` thì chỉ chốt được khi hỏi — lint nhắc.
- `assumeIfUnknown`: cho nhánh **hiếm** (TMBP, đã gia công thêm) để không hỏi
  mọi người về thứ 99 % không gặp. Dùng dè sẻn, ghi rõ trong `sourceVi`.

### 3.3 Luật (`rules`)
- Mỗi lá của nhóm có ít nhất một luật `hs` = lá đó. Test khoá.
- `reasonVi` viết như một dòng giải trình với Hải quan; `source` là dòng biểu
  thuế / chú giải cụ thể. `gir` mặc định `GIR 6` (phân nhóm trong nhóm).
- Đọc **cột EN** trong `dict:table`: tiếng Việt của dòng lá bị lược mất điều
  kiện dòng cha (*"- - Chiều dày từ 3 mm trở lên"* không nói là cuộn hay tấm;
  EN nói *"in coils … cold-rolled … thickness of 3mm or more"*).
- `verified` để `false`. CEO duyệt bảng thì bật `true` + `verifiedBy/At`. Chưa
  verified, trích dẫn ra người dùng là `HEURISTIC`; verified mới là
  `RULE_TABLE` và `/api/suggest` mới được đưa lá bảng chốt lên đầu.

### 3.4 Bốn luật bắt buộc (test chặn) + ba luật chất lượng (lint)
1. Mọi `rules[].hs` là lá 8 số có thật, thuộc nhóm.
2. Mọi thuộc tính trong `when` đã khai ở `inputs`; enum trong `domain`; số có điều kiện so sánh.
3. Mọi lá có đường tới.
4. `essenceTestVi`, `sourceVi`, mọi `questionVi`, mọi `reasonVi` có mặt.
5. (lint) Enum không có `detect` cho một giá trị → chỉ chốt được khi hỏi.
6. (lint) Số không có `fromSpec` → chỉ chốt được khi hỏi.
7. (lint) Luật thiếu `source`.

---

## 3.5 Nhận diện TRƯỚC, luật SAU — bài học 26 bảng đầu (2026-09-18)

26 bảng nộp trong một buổi, `npm test` xanh, `dict:check` xanh. Đem **305 tên
hàng thật** trong tờ khai Oz của chính các nhóm đó vào: bảng chốt được **3**.
`xi lanh khí nén` (158 tờ khai) bị hỏi lại *"hàng là gì?"*. Bảng chép đúng cấu
trúc biểu thuế nhưng không NHẬN RA hàng — với người khai thì bằng không có.

Nguyên nhân: `detect` chép lời văn biểu thuế; ca kiểm viết kiểu
`"text": "kiểm r-x", "facts": {...}` — bảng tự nói với chính nó. Vì thế:

- **Viết `detect` từ cách người ta gõ**: tên chợ, viết tắt, không dấu, tiếng
  Anh thương mại (`xi lanh` / `xy lanh` / `xilanh` / `cylinder` / `ben`), không
  phải "chuyển động tịnh tiến". Lệnh `npm run dict:table -- <nhóm> --oz` in
  các cụm tờ khai Oz của nhóm kèm số lần — **đó là đề bài**.
- **Ca kiểm bằng câu chữ**: `text` là câu người thật gõ, không `facts`. Ca có
  `facts` chỉ để kiểm nhánh hiếm không có tên riêng; **không được tính** vào
  phủ lá. Ca `"text": "kiểm r-x"` bị test coi là không có ca.
- **`preferOnConflict`** cho thuộc tính "nguyên chiếc / bộ phận": *"đầu lắc xi
  lanh khí nén"* chứa cả cụm xi lanh lẫn cụm bộ phận → khai
  `"preferOnConflict": "parts"` để cụm bộ phận thắng, không hỏi lại.
- **`assumeIfUnknown`** cho nhánh hiếm (bộ phận của động cơ phản lực) để câu
  thường không bị hỏi thứ 99 % không gặp.

**Cửa nghiệm thu bằng dữ liệu thật** (`dict:check` bước [4b], test khoá cho
nhóm `done`):
- Nhóm có ≥ 3 cụm tờ khai Oz: bảng phải **chốt ≥ 50 %** cụm, và không chốt
  lệch tiền lệ tập trung (share ≥ 0,8, ≥ 3 tờ khai).
- Nhóm Oz không có tờ khai: ca **chỉ bằng câu chữ** phải chốt đúng **≥ 60 %
  số lá**.
Không qua cửa thì trạng thái là `draft` (bảng nháp), không phải `done`.

## 4. Ca kiểm — `tests/decision-cases.json`

```json
{ "id": "7209-coil-1-3-narrow", "heading": "7209", "text": "thép cuộn cán nguội dày 2mm khổ 1200mm", "expectHs": "72091610" },
{ "id": "7209-coil-1-3-ask-width", "heading": "7209", "text": "thép cuộn cán nguội dày 2mm", "expectAsk": ["widthMm"] },
{ "id": "8427-facts-only", "heading": "8427", "text": "xe nâng", "facts": { "selfPropelled": "yes", "driveType": "other" }, "expectHs": "84272000" }
```
- **Mọi lá** có ít nhất một ca `expectHs` chốt ra nó (test khoá).
- Ít nhất một ca `expectAsk` — chứng minh bảng hỏi đúng thứ đang thiếu.
- `text` là câu người thật gõ; `facts` là câu trả lời ERP/người dùng đưa.
  **Cửa nghiệm thu chỉ đếm ca không có `facts`.** Xem mục 3.5.

---

## 5. Từ điển tên — chỉ khi tên chợ chưa dẫn về nhóm

`data/trade-synonyms.json` giữ nguyên schema, nhưng **`candidates[].hs` nay
được là 4 hoặc 6 số**: tên gọi chỉ tới nhóm; lá do bảng chốt.
```json
{ "id": "xe-nang-forklift", "terms": ["xe nâng", "forklift", "xe nâng hàng"],
  "candidates": [{ "hs": "8427", "whenVi": "Xe nâng có thiết bị nâng/xếp dỡ; tự hành hay không do bảng 8427 chốt", "confidence": "medium" }],
  "avoid": [{ "prefix": "8428", "whyVi": "Bàn nâng / thang máy là 8428, không phải xe nâng" }],
  "sourceVi": "Biểu thuế 2026 nhóm 84.27" }
```
- Ứng viên cấp nhóm **cộng điểm cho lá đã khớp lời văn** trong nhóm; không
  bơm N lá điểm bằng nhau. Mục cũ có >8 ứng viên lá → lint nhắc đổi sang cấp nhóm.
- Vẫn bắt buộc: mã bẫy (`avoid` / `excludeIfAny`), `sourceVi`, ≥1 ca trong
  `tests/search-cases.json` gõ tên chợ về đúng nhóm.
- Cụm có dấu khớp đúng dấu khi câu có dấu (đã sửa ở lib sau ca "gỗ vân sam" →
  van săm); câu không dấu vẫn có thể va chạm — lint liệt kê.
- Không thêm biến thể không dấu; không đặt `high` cho mục nhiều ứng viên.

---

## 6. `dict:check` — cửa nghiệm thu duy nhất

```
[1] test-decision-tables + test-trade-synonyms   cấu trúc, mã chết, phanh
[2] bảng của nhóm                                có, hợp lệ, mọi lá có đường tới
[3] lint                                         bảng (5–7 ở mục 3.4) + mục từ điển chạm nhóm
[4] ca kiểm                                      mọi lá có ca; có ca hỏi; ca search về nhóm
[4b] dữ liệu thật                                cụm tờ khai Oz của nhóm chốt ≥ 50 % (hoặc ca câu chữ ≥ 60 % lá)
[5] bench:delta                                  không mức nào giảm so với bản đã commit
```
Nhóm mới: lint là điều kiện nhận. Nhóm đã `done`: lint chỉ cảnh báo.
`--no-bench` chỉ để soạn dở; không commit khi chưa chạy đủ.

---

## 7. Không được làm

- Không chốt mã từ trí nhớ; mọi luật đối chiếu `data/tax.json` (`dict:table` in đủ VN + EN).
- Không viết luật `when: {}` ở priority cao để "phủ cho xong" — đó là chốt bừa; test ca hỏi sẽ bắt.
- Không sửa `data/hs-aliases.json`, `data/dictionary-queue.json` tay.
- Không gắn nhãn GIR ngoài `lib/gir.js`; không tự bật `verified`.
- Không thêm tên khách, tên công ty, số tờ khai.
- Không cắt benchmark; không đẩy `main` khi `dict:check` đỏ.

---

## 8. Giao nộp và ghi sổ

- Nhánh `dict/<nhóm>` từ `main` mới nhất, một nhóm một PR draft, tiêu đề
  `feat(data): bảng quyết định nhóm <nhóm> — <tên hàng chính> (#34)`.
- Body PR: khối tổng kết `dict:check` + bảng `bench:delta`.
- `data/dictionary-progress.json` là sổ tiến độ (test khoá `done` ⇔ có bảng phủ
  hết lá). Issue #34 là nhật ký: một dòng mỗi nhóm.
- CEO chạy lại `dict:check`, đọc bảng, bật `verified` nếu duyệt nội dung,
  merge. Sau merge: `npm run dict:queue -- --write`.

---

## 9. Mẫu prompt cho vòng lặp (CEO dán cho agent, mỗi lượt một nhóm)

> Bạn đang trong vòng lặp bảng quyết định `hs-code-api`. Đọc
> `docs/huong-dan-agent-mo-rong-tu-dien.md` (v3) trước khi làm gì.
> 1. `git fetch origin main && git checkout -B dict/next origin/main`
> 2. `npm run dict:queue` — lấy nhóm **đầu tiên còn open ở tầng A** (hết A thì B);
>    `--claim=<nhóm> --by=<tên-bạn>`; đổi tên nhánh thành `dict/<nhóm>`.
> 3. `npm run dict:table -- <nhóm>` đọc mọi lá (cả cột EN). Trả lời câu hỏi bản
>    chất: thuộc tính nào tách nhóm này? Rồi `--init` và viết bảng theo mục 3.
> 4. Viết ca kiểm (mục 4): mọi lá một ca, thêm ca hỏi. `--try` từng câu.
> 5. Tên chợ chưa về nhóm thì thêm mục từ điển cấp nhóm (mục 5) + ca search.
> 6. `npm run dict:check -- <nhóm>` tới ✅. Không chốt bằng `--no-bench`.
> 7. `--done`, commit, push nhánh, PR draft dán khối `dict:check`, một dòng Issue #34. Dừng.
> 8. Nhóm không có thuộc tính tách rõ (biểu thuế chỉ liệt kê tên mặt hàng) thì
>    bảng vẫn viết được: mỗi lá một luật với thuộc tính `articleType` enum + detect
>    cụm tên. Nhóm thật sự bất khả thi → `--release` + lý do lên Issue #34.

---

## 10. Đầu vào từ ERP — chuẩn hồ sơ tối thiểu

`/api/search?q=…&facts={"thicknessMm":2,"form":"coil"}` và `/api/suggest`
body `facts: {…}` nhận dữ kiện tường minh theo đúng tên thuộc tính trong
`missingFacts[]`. Quy trình ERP: gọi lần một → đọc `missingFacts` → hỏi người
khai đúng câu `questionVi` → gọi lại với `facts`. Chốt 8 số khi
`decisions[].status === "RESOLVED"`; `basis: RULE_TABLE` chỉ khi bảng đã verified.

## 11. Nợ và việc sau
- 5 nhóm có từ điển từ 2026-09-16 (8481, 7208, 7216, 8428, 8537) chưa có bảng — trong hàng đợi, cột `từđiển ✓`.
- Parser chưa bóc `dn50`, `i200`, `Ø25`, `%C`; bảng cần các thuộc tính đó thì tạm hỏi.
- Đào câu hỏi thật từ log server nhà → nạp hàng đợi.
