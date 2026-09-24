# AGENTS.md — Hướng dẫn cho AI làm việc với kho tri thức HS Việt Nam

Bạn là một AI vừa tiếp cận repo này, hoặc vừa được giao một việc liên quan tới mã
HS / thuế nhập khẩu / khai báo hải quan Việt Nam. File này giúp bạn dùng đúng
kho tri thức ở đây thay vì đoán từ trí nhớ.

> Áp dụng cho mọi agent (Claude Code, Cursor, Codex, Copilot, agent tự viết…).
> `CLAUDE.md` là quy ước riêng khi **sửa code** trong repo; file này nói về **dùng
> tri thức** trong repo.

---

## 1. Nguyên tắc bất di bất dịch

**Đừng bao giờ đoán mã HS từ trí nhớ.** Mã HS Việt Nam có 11.871 dòng ở cấp 8 số,
thuế suất và chính sách thay đổi theo từng thông tư. Trí nhớ của mô hình chắc chắn
lỗi thời và không có căn cứ để giải trình khi bị Hải quan hỏi.

**Luôn dẫn nguồn kèm ngày dữ liệu.** Mỗi tệp dữ liệu có `generatedAt` hoặc
`version`. Trả lời không có ngày là trả lời không kiểm chứng được.

**Nói rõ mức chắc chắn.** Kết quả của hệ thống này chia 4 mức căn cứ (xem mục 4).
Trình bày mức `HEURISTIC` như thể là kết luận chắc chắn là gây hại cho người khai.

**Luôn kèm cảnh báo:** đây là tài liệu tham khảo nghiệp vụ, **không phải** phán
quyết phân loại của cơ quan Hải quan, **không phải** tư vấn pháp lý. Quyết định
cuối cùng thuộc về cơ quan Hải quan tại thời điểm thông quan.

---

## 2. Lấy tri thức bằng cách nào

### Cách A — Gọi API, không cần token (nhanh nhất)

Nhóm tra cứu mở công khai, gọi thẳng:

```bash
curl "https://hs-kb.uythacnhapkhau.com/api/tax?hs=84137090"
curl "https://hs-kb.uythacnhapkhau.com/api/search?q=máy%20bơm&limit=5"
curl "https://hs-kb.uythacnhapkhau.com/api/notes?chapter=84"
curl "https://hs-kb.uythacnhapkhau.com/api/precedents?hs=84137090"
curl "https://hs-kb.uythacnhapkhau.com/api/conflicts?hs=84137090"
curl "https://hs-kb.uythacnhapkhau.com/api/legal-docs"
```

Đặc tả máy đọc: **[`/openapi.json`](https://hs-kb.uythacnhapkhau.com/openapi.json)**
· Tổng quan số liệu: **[`/community-data.json`](https://hs-kb.uythacnhapkhau.com/community-data.json)**

Nhóm sinh nội dung bằng AI (`/api/suggest`, `/api/describe`, `/api/classify`,
`/api/match`) **cần Bearer token** vì mỗi lượt gọi tốn chi phí mô hình. Xin token
qua GitHub Issue.

### Cách B — Đọc thẳng dữ liệu trong repo (khi làm offline / RAG)

| Cần gì | Đọc tệp |
|---|---|
| Biểu thuế 11.871 mã | `data/tax.json` |
| Chính sách đã bóc tách | `data/tax-enriched.json` |
| Chú giải chương (87) | `data/notes.json` |
| **Chú giải nhóm 4 số (1.269 — phủ 100%)** | `data/chu-giai-heading.json` |
| Chú giải chi tiết WCO | `data/explanatory-notes.json` |
| Tiền lệ TB-TCHQ (242 mã) | `data/precedents.json` |
| Cảnh báo mã dễ nhầm (66) | `data/conflicts.json` |
| **Bảng quyết định phân giải** | `data/conflict-tables.json` |
| Văn bản pháp luật (108) | `data/legal-docs.json` |
| Mã loại hình XNK | `data/customs-types.json` |
| Sản phẩm ví dụ cho mã "Loại khác" | `data/loai-khac-products.jsonl` |
| **Nguồn gốc từng tệp dữ liệu** | `data/SOURCES.json` |
| **Hạn đối chiếu / độ mới dữ liệu** | `data/data-freshness.json` |

### Cách C — Đọc qua GitHub khi bị chặn ở domain

Nếu bạn là AI agent và `hs-kb.uythacnhapkhau.com` từ chối bạn (một số bộ lọc
crawler chặn theo `robots.txt`), **đừng bỏ cuộc và đừng đoán mã từ trí nhớ** —
mọi tệp ở bảng trên đều có bản công khai trên GitHub, không qua tầng chặn nào:

```
https://raw.githubusercontent.com/ozvietnam/hs-code-api/main/<đường-dẫn-tệp>
```

Ví dụ: `.../main/data/tax.json` · `.../main/data/conflicts.json` ·
`.../main/public/openapi.json` · `.../main/AGENTS.md`

Nội dung giống hệt API, chỉ khác là **tệp thô** — không kèm phần suy luận mà
`/api/tax` bổ sung (cảnh báo chính sách đã phân tích, mã anh em cùng phân nhóm,
link văn bản). Dùng `raw.githubusercontent.com` chứ đừng dùng CDN bên thứ ba cho
dữ liệu thuế: raw cache 5 phút, CDN có thể giữ bản cũ nhiều ngày, mà biểu thuế cũ
là dữ liệu sai.


---

## 2b. Playbook — làm đúng từng bước, không cần tự suy luận

Viết cho mọi agent, kể cả mô hình nhỏ. Làm **đúng thứ tự**, đừng bỏ bước.

1. **Có mã 8 số rồi?** → bước 5. Chưa có → bước 2.
2. `POST /api/suggest` với `{"description": "<tên hàng + chất liệu + công dụng + thông số>"}`.
3. Đọc `status` và làm theo `nextAction`:
   - `NEED_FACTS` → hỏi người dùng **từng câu** trong `nextAction.questions`
     (có `optionsVi` thì đọc các lựa chọn). Gọi lại `/api/suggest` với cùng
     `description` + `facts: {<attribute>: <câu trả lời>}`. Lặp lại bước 3.
   - `REVIEW` / `RESOLVED_BY_TABLE` → sang bước 4.
   - `NEEDS_EXPERT` → nói rõ: "Hệ thống chưa chọn được bằng AI, cần chuyên viên"
     và liệt kê `nextAction.optionsHs`. Dừng.
   - `NO_CANDIDATES` → xin người dùng mô tả rõ hơn, quay lại bước 2.
4. Trình bày tối đa 3 gợi ý: `hsCode`, `nameVi`, `reasoning`, mọi mục trong
   `antiPatternWarnings`, `residualAdvisory`, `confusionWarning`. **Không** nói
   phần trăm chắc chắn. Chữ `[chưa kiểm chứng]` trong `reasoning` phải giữ nguyên.
   Người dùng chọn một mã.
5. `GET /api/tax?hs=<mã>&origin=<ISO-2 nước xuất xứ, mặc định CN>`. Báo:
   - thuế NK: `acfta.forOrigin` (`eligible: false` → dùng `taxNkPreferential` MFN)
   - VAT: `vatReduction` (có `noteVi` thì đọc nguyên văn)
   - chính sách: `policyByHs`; nếu `policyStatus: "NOT_RECORDED"` → đọc `policyNoteVi`
   - `tariff.noteVi` nếu có (dữ liệu có thể cũ)
6. Cần mô tả tờ khai → `POST /api/describe` với `hsCode` + thông tin hàng. Đọc
   `compliance.level` và từng `compliance.warnings[]`; `degraded: true` → bản khai
   dựng không qua AI, cần người sửa.
7. Luôn kết thúc bằng: nguồn + ngày dữ liệu (`tariff.effectiveDate`) + câu
   "Tham khảo nghiệp vụ, không phải phán quyết của cơ quan Hải quan."

**Ví dụ một vòng hỏi–đáp:**

```
→ POST /api/suggest {"description":"thang máy lắp trong tòa nhà, động cơ điện"}
← status: NEED_FACTS
  nextAction.questions: [{attribute:"liftKind", questionVi:"Thang máy chở người; thang/tời hàng loại khác; hay tời nâng kiểu gầu/thùng kíp?",
                          optionsVi:[{index:1,value:"passenger",labelVi:"chở người"}, ...]}]
Agent hỏi người dùng → "chở người"
→ POST /api/suggest {"description":"thang máy lắp trong tòa nhà, động cơ điện","facts":{"liftKind":"chở người"}}
← status: REVIEW (hoặc RESOLVED_BY_TABLE), decisions[].factsUsed.liftKind = "passenger"
```

---

## 3. Quy trình xác định mã HS cho đúng phương pháp

Đừng nhảy thẳng tới đáp án. Đi theo thứ tự này — cũng chính là thứ tự
`lib/classify.js` thực hiện:

**Bước 1 — Thu đủ dữ kiện trước khi phân loại.** Thiếu dữ kiện thì hỏi lại người
dùng, đừng đoán. Mỗi chương cần dữ kiện khác nhau
(`data/chapter-specific-rules.json`, `data/attributes.json`):

- Vật liệu cấu thành và tỷ lệ (chương 39, 42, 52, 61, 62, 72–76)
- Công dụng / nguyên lý hoạt động (chương 84, 85, 90)
- Thông số kỹ thuật: công suất, điện áp, dung tích, kích thước
- Tình trạng: mới / đã qua sử dụng, đã lắp ráp / tháo rời
- Với hoá chất: mã CAS và độ tinh khiết (chương 28, 29)

**Bước 2 — Khoanh chương, đọc chú giải.** Chú giải phần/chương quyết định phân
loại (GIR 1) và thường chứa mệnh đề **loại trừ** — 867/1.269 nhóm có mệnh đề này.
Bỏ qua chú giải là nguồn sai phổ biến nhất.

**Bước 3 — Chọn nhóm 4 số, rồi mới xuống 6 và 8 số.** Chỉ so các phân nhóm
**cùng cấp** với nhau (GIR 6). So phân nhóm 6 số với phân nhóm 8 số là sai quy tắc.

**Bước 4 — Kiểm cụm mã dễ nhầm.** Tra `data/conflicts.json`. Nếu mã thuộc một
`group` có trong `data/conflict-tables.json`, dùng bảng quyết định đó — nó
deterministic và có dẫn văn bản gốc.

**Bước 5 — Đối chiếu tiền lệ.** `data/precedents.json` là cách Hải quan đã từng
phân loại. Tiền lệ là dẫn chứng mạnh, nhưng phải kiểm còn hiệu lực.

**Bước 6 — Tra thuế và chính sách.** Mã đúng mà quên giấy phép / kiểm tra chuyên
ngành thì vẫn tắc ở cửa khẩu.

---

## 4. Đọc `basis` trước khi tin kết quả

Mọi trích dẫn GIR từ hệ thống này đều kèm `basis`. **Bắt buộc truyền mức này lại
cho người dùng**, đừng nuốt mất:

| basis | Nghĩa | Đưa vào hồ sơ giải trình Hải quan? |
|---|---|---|
| `RULE_TABLE` | Bảng quyết định do người soạn, dẫn văn bản gốc | ✅ Được |
| `DETERMINISTIC` | Hệ thống suy ra từ tín hiệu chắc chắn | ✅ Được |
| `HEURISTIC` | Dò từ khoá / điểm ước lượng | ⚠️ Cần người có chuyên môn kiểm chứng |
| `LLM_ASSERTED` | Mô hình tự khai, chưa kiểm chứng | ❌ Không |

Hai trường khác **không phải** căn cứ pháp lý, đừng trình bày như GIR:
`rankingSignals[]` (tín hiệu xếp hạng kỹ thuật) và `chapterGuidance[]` (checklist
dữ kiện theo chương).

**`/api/suggest` trả sẵn `status` + `nextAction` — làm theo đúng nó:**

| `status` | Làm gì |
|---|---|
| `NEED_FACTS` | Hỏi người dùng từng câu trong `nextAction.questions` (có `optionsVi` thì đưa lựa chọn). Gọi lại `/api/suggest` với cùng `description` + `facts` như `nextAction.then.body`. Trả lời bằng `value`, số `index` hay nhãn tiếng Việt đều được. |
| `REVIEW` | Trình bày các gợi ý + lý do + cảnh báo, để người dùng chọn và xác nhận. |
| `RESOLVED_BY_TABLE` | Bảng quyết định đã kiểm chứng chốt mã — vẫn để người dùng xác nhận. |
| `NEEDS_EXPERT` | AI không chạy được; gợi ý chỉ theo tìm kiếm. Nói rõ cần chuyên viên. |
| `NO_CANDIDATES` | Xin người dùng mô tả rõ hơn (tên thông dụng, chất liệu, công dụng). |

**Ba cái bẫy khi đọc kết quả:**

- **Thuế ACFTA:** đừng đọc số đầu của `taxAcfta`. `"0 (-CN)"` nghĩa là hàng
  xuất xứ Trung Quốc **không** được 0%. Đọc `taxAcftaChina.eligible` hoặc
  `acfta.forOrigin` (`/api/tax?hs=...&origin=CN`); `eligible: false` → áp MFN.
- **`degraded: true` / `engine: "deterministic"`:** AI không chạy được hoặc mọi
  mã AI đưa ra đều bị loại vì không có trong biểu thuế. Gợi ý chỉ là thứ tự tìm
  kiếm, `confidence: null`. Nói rõ với người dùng là cần chuyên viên chọn.
- **`confidence` không phải xác suất đúng.** Chưa hiệu chuẩn — đừng nói "92% chắc
  chắn". Có `missingFacts[]` thì hỏi người dùng từng `questionVi`, rồi gọi lại
  với `facts`.

---

## 5. Độ chính xác thật — hãy trung thực với người dùng

Đo trên 57 tờ khai thật, phủ 50 chương HS:

| Mức | Tỷ lệ đúng |
|---|---|
| Đúng chương (2 số) | 73,7% |
| Đúng nhóm (4 số) | 64,9% |
| Đúng phân nhóm (6 số) | 40,4% |
| **Đúng đủ mã (8 số)** | **24,6%** |

Nghĩa là: hệ thống **định hướng tốt** tới chương và nhóm, nhưng **hai số cuối phải
để người có chuyên môn chốt**. Đừng nói với người dùng rằng mã 8 số là chắc chắn.
Số cập nhật tại `/community-data.json` → `benchmark`.

---

## 6. Việc khác ngoài tra mã

| Việc | Dùng |
|---|---|
| Sinh mô tả khai báo (≤200 ký tự ECUS, chuẩn TT 39/2018) | `POST /api/describe` |
| Kiểm rủi ro nhãn hiệu (SHTT) | `/api/trademark` (cần token) |
| Tra thủ tục kiểm tra chuyên ngành | `/api/policy-procedures` |
| Chọn mã loại hình XNK | `/api/customs-types` |
| Xem chất lượng dữ liệu, biết chỗ nào yếu | `/api/data-quality` |

---

## 7. Ranh giới — đừng làm những việc này

- **Đừng khẳng định mã HS 8 số là chắc chắn.** Tỷ lệ đúng thật là 24,6%.
- **Đừng bịa số hiệu văn bản pháp luật.** Chỉ trích những văn bản có trong
  `data/legal-docs.json`; trong đó 70/108 được verify tiêu đề thật.
- **Đừng dùng cảnh báo nhãn hiệu như kết luận** — mới 1/53 nhãn được xác minh.
- **Đừng đọc `data/oz-export/`** — dữ liệu riêng tư, đã gitignore.
- **Đừng đưa thông tin khách hàng vào bất kỳ tệp nào sẽ commit.**
- **Đừng tự gắn nhãn GIR trong code** — mọi trích dẫn phải đi qua `lib/gir.js`,
  kèm `basis` + `evidence`.

---

## 8. Giấy phép và ghi công

Code MIT · Dữ liệu CC BY-SA 4.0. Dùng lại được, kể cả thương mại và để huấn
luyện AI — miễn ghi nguồn và chia sẻ ngược bản phái sinh. Chi tiết:
[`NOTICE.md`](NOTICE.md).

Khi trả lời người dùng dựa trên dữ liệu ở đây, ghi:

```
Nguồn: HS Knowledge Base (github.com/ozvietnam/hs-code-api), dữ liệu <generatedAt>
Tham khảo nghiệp vụ — không phải phán quyết phân loại của Hải quan.
```

---

## 9. Đóng góp ngược

Dự án cần dữ liệu từ cộng đồng để mã HS ngày càng rõ ràng cho mọi người. Nếu bạn
(hoặc người dùng của bạn) có:

- tờ khai đã thông quan (cặp *mô tả hàng ↔ mã HS*, **không kèm thông tin khách hàng**),
- thông báo phân loại TB-TCHQ chưa có trong kho,
- một cụm mã hay nhầm cùng cách phân biệt,
- lỗi sai trong dữ liệu hiện có,

hãy mở GitHub Issue tại `github.com/ozvietnam/hs-code-api/issues`. Xem
`CONTRIBUTING.md` nếu đã có.
