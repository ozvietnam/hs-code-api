# Yêu cầu từ ozplugin ("Cổng OZ") gửi hs-code-api — mốc M1 đến M2

- **Ngày:** 10/10/2026. **Người gửi:** dự án `ozplugin` (Cổng OZ, cổng MCP từ xa gọi sang hs-code-api bằng khoá dịch vụ `cong-oz` trong `HS_SERVICE_TOKENS`).
- **Tính chất:** chỉ là tài liệu yêu cầu. Chủ kho `hs-code-api` quyết định và triển khai; ozplugin không sửa mã ở đây, không merge PR này.
- **Căn cứ:** đã đối chiếu từng khẳng định với mã tại commit `29e8c8d` của `main`; mỗi ý có `file:dòng`. Mục "Chưa kiểm chứng được" ở cuối liệt kê phần ozplugin không tự xác minh được.
- **Quy ước ưu tiên** theo [`docs/backlog/README.md`](../backlog/README.md): P0 chặn việc khác, P1 cần cho mục tiêu, P2 làm cho tốt hơn.

| Mã | Việc | Ưu tiên | Cần CEO quyết |
|---|---|---|---|
| R1 | Endpoint mã HS → văn bản quản lý chuyên ngành | P1 | Không (dữ liệu tĩnh, đã có sẵn trong allowlist nguyên tắc) |
| R2 | Trả `usage` một phần khi lỗi 5xx cho khoá dịch vụ | P1 | Không |
| R3 | So sánh hằng-thời-gian cho `HS_API_TOKEN` + sửa thông báo 503 | P2 | Không |
| R4 | Độ trễ `/api/classify`: thời gian theo bước, mục tiêu p95 | P0 | Có (chấp nhận đổi chất lượng lấy tốc độ?) |
| R5 | Loại tập giữ riêng theo từng request (cho khoá dịch vụ) | P1 | Có (thêm một cơ chế đặc quyền cho khoá dịch vụ) |
| R6 | Thông tin: khi ozplugin bắt đầu thu phí sẽ đóng 4 endpoint LLM công khai | Thông tin | Đã chốt 10/10/2026 |

---

## R1. Mã HS → văn bản quản lý chuyên ngành — P1

### Bối cảnh

ozplugin có công cụ `van_ban_theo_ma_hs` ("mã này chịu văn bản quản lý chuyên ngành nào?"). Hiện hoãn sang M2 vì hs-code-api chưa có cửa tra này. Dữ liệu thì đã có:

- `data/plhq-hs-index.json` (27 văn bản, bản chụp bảng mã HS ↔ văn bản của kho cộng đồng oz-wiki-plhq, `registryVersion` 2026-10-10). Trong đó ~11.400 dòng mã 8 số, ~1.050 dòng mã 6 số, ~1.080 dòng mã 4 số (đếm trực tiếp từ tệp).
- `hsListings(hs, { asOf })` trong `lib/plhq-registry.js:210` đã làm đúng việc tra, nhưng **chỉ chạy với đúng 8 chữ số** (`lib/plhq-registry.js:212`: `if (code.length !== 8) return []`) và hiện không có route nào gọi nó (chỉ test `scripts/test-plhq-registry.mjs:106` và `lib/*` nội bộ).
- `hsIndexMeta()` (`lib/plhq-registry.js:256`) trả `registryVersion`.

### Yêu cầu

`GET /api/dataset?resource=hs_legal_docs&hs=<4–8 chữ số>` (thêm rewrite trong `routes.json`, ví dụ `/api/hs-legal-docs`, theo kiểu các rewrite tại `routes.json:85-113`).

Tham số:
- `hs` (bắt buộc): 4, 6 hoặc 8 chữ số; bỏ mọi ký tự không phải số trước khi kiểm. Độ dài khác → `400` kèm `error` tiếng Việt.
- `asOf` (tuỳ chọn, `YYYY-MM-DD`): ngày xét hiệu lực, mặc định hôm nay theo giờ VN (đúng như `hsListings`).

Phản hồi 200:

```json
{
  "hsCode": "19059090",
  "registryVersion": "2026-10-10",
  "items": [
    {
      "soHieu": "1182/QĐ-BCT",
      "ten": "…",
      "tinhTrang": "CON_HIEU_LUC",
      "coQuan": "Bộ Công Thương",
      "url": "https://github.com/ozvietnam/oz-wiki-plhq/blob/main/danh-muc/….csv"
    }
  ]
}
```

Năm trường bắt buộc đúng như trên (`soHieu, ten, tinhTrang, coQuan, url`). Đề nghị thêm ba trường mà `hsListings` đã có sẵn và ozplugin cần để không nói sai: `active` (boolean, văn bản đang áp dụng tại `asOf`), `match: {level:"HS4|HS6|HS8", code}` và `dieuKien` (ví dụ "trừ loại dùng cho trẻ em"; dòng mã 4/6 số khớp mọi mã bên dưới nên **phải** đọc điều kiện — xem chú thích ở `lib/plhq-registry.js:205-209`). Không có văn bản nào → `200` với `items: []` (không phải 404).

Điểm cần chủ kho quyết hoặc chú ý khi làm:
1. **Mã 4/6 số:** `hsListings` hiện không hỗ trợ. Đề xuất: với mã `n` số (n = 4 hoặc 6) trả các dòng có `hs` là tiền tố của mã hỏi (độ dài ≤ n), **không** đi xuống các mã con; đặt `match.level` tương ứng. Ghi rõ trong mô tả OpenAPI.
2. **`coQuan`:** trong `data/plhq-hs-index.json` trường này **không có** ở cả 27 văn bản (`hsListings` trả `d.coQuan || null`, `lib/plhq-registry.js:231`, nên luôn là `null`). Nhưng `data/plhq-registry.json` có `coQuan` cho 2231/2232 văn bản và `lookup(soHieu)` (`lib/plhq-registry.js:103`) trả được. Đề xuất bổ sung `coQuan` bằng `plhq.lookup(item.soHieu)?.coQuan` (hoặc sửa `scripts/sync-plhq.mjs` để chép `co_quan` sang chỉ mục HS).
3. **Gộp dòng:** `hsListings` đã gộp các dòng cùng văn bản + phụ lục + điều kiện (vd 808 loại thuốc cùng một mã); giữ hành vi này, `items` không phình.
4. `url` có thể `null` nếu văn bản không có tệp bảng (`lib/plhq-registry.js:247`).

**Quyền truy cập (CLAUDE.md quy tắc 2):** dữ liệu tĩnh, chỉ đọc, bản chụp CC BY 4.0, không riêng tư, không tốn LLM. Đủ ba tiêu chí của `lib/public-access.js:5-8`, tương tự `legal_status` đang mở (`lib/public-access.js:50`). Đề nghị **khai tường minh** `'hs_legal_docs'` vào `PUBLIC_DATASET_RESOURCES` (`lib/public-access.js:37`), kèm comment lý do như các mục lân cận. Allowlist hiện có 18 mục, trần test là 20 (`scripts/test-public-access.mjs:139-143`), thêm một mục thành 19 — vẫn đạt. Nếu chủ kho muốn giữ kín thì ozplugin vẫn gọi được bằng khoá `cong-oz` (Bearer); khi đó chỉ cần không khai vào allowlist.

### Tiêu chí nghiệm thu (test cần thêm)

Thêm vào `scripts/test-plhq-registry.mjs` (hoặc test dataset mới, nhớ `import './test-isolate-data.mjs'` ở dòng đầu theo quy tắc 8) và `scripts/test-public-access.mjs`:

- `hs_legal_docs: 8 số trả items khớp hsListings` — gọi handler với `hs=19059090`, `items.length >= 1`, mỗi phần tử có đủ `soHieu, ten, tinhTrang, coQuan, url`, `hsCode === "19059090"`, `registryVersion` bằng `hsIndexMeta().registryVersion`.
- `hs_legal_docs: 6 số chỉ trả dòng mã ≤ 6 số` — `hs=190590`, mọi `match.level` ∈ {HS4, HS6}.
- `hs_legal_docs: 4 số chỉ trả dòng HS4` — `hs=1905`, mọi `match.level === "HS4"`.
- `hs_legal_docs: độ dài sai → 400` — `hs=19`, `hs=123456789`, `hs=abcd`, không có `hs`.
- `hs_legal_docs: mã không có văn bản → 200, items rỗng`.
- `hs_legal_docs: coQuan khác null với văn bản có trong sổ` (chặn việc quên nối `lookup`).
- `hs_legal_docs: asOf trước ngày hiệu lực → active=false` (tái dùng ca `22030091`, `asOf=2026-07-01`, từ `scripts/test-plhq-registry.mjs:109`).
- `test-public-access: hs_legal_docs mở đọc không token` (GET → `isPublicRead(...) === true`; POST → `false`) và `allowlist vẫn ≤ 20`.
- `npm run build` sinh lại `public/openapi.json` có đường dẫn mới (`scripts/build-openapi.mjs:571` sinh theo allowlist) và `scripts/test-openapi.mjs` xanh.
- `node scripts/test-public-access.mjs` xanh (điều kiện bắt buộc theo CLAUDE.md).

---

## R2. Trả `usage` một phần khi lỗi 5xx cho khoá dịch vụ — P1

### Bối cảnh

Cổng OZ tính phí theo token LLM đã tiêu (sổ cái, mỗi lượt có `idempotency_key`). Khi `/api/classify` hoặc `/api/describe` lỗi sau khi đã gọi LLM một vài lần, token đã tiêu thật nhưng Cổng không nhận được con số nào → Cổng **ghi thiếu chi phí thật** của mình.

Nguyên nhân (đã kiểm):
- `lib/usage-context.js:28-36`: `withUsage` khi `fn` ném lỗi vẫn gắn `e.usage = store.slice()` rồi ném lại — tức phần đã ghi **có sẵn** trên đối tượng lỗi.
- `api/classify.js:95-96`: nhánh `catch (e)` trả `502 { error, detail }` và **bỏ** `e.usage`.
- `api/describe.js:38-45`: `describeProduct` được gọi trong `withUsage` (dòng 40) nhưng **không có try/catch** — lỗi bay ra ngoài handler, không có JSON lỗi nào mang `usage`.

### Yêu cầu

Chỉ khi `serviceCaller(req) !== null` (khoá có tên trong `HS_SERVICE_TOKENS`; `lib/auth.js:31`), thêm trường `usage` vào JSON lỗi 5xx của `/api/classify` và `/api/describe`, cùng dạng mảng như phản hồi 200:

```json
{ "error": "Classify failed", "detail": "…", "usage": [ { "provider": "minimax", "model": "…", "inputTokens": 1200, "outputTokens": 340 } ] }
```

- `usage` luôn là mảng (rỗng nếu chưa gọi LLM nào); lấy từ `e.usage` nếu có, không có thì `[]`.
- `/api/describe`: bọc `describeProduct` bằng try/catch cho nhánh khoá dịch vụ; lỗi → `502 { error: 'Describe failed', detail: …, usage }` (mã và chữ khớp phong cách `Classify failed`). Nhánh không phải khoá dịch vụ **giữ nguyên hành vi hiện tại** (không thêm try/catch mới nếu chủ kho muốn tránh đổi hành vi; ozplugin chỉ cần nhánh dịch vụ).
- Người gọi công khai và `HS_API_TOKEN` (`serviceCaller` trả `null`, xem `scripts/test-service-tokens.mjs:56`): **JSON lỗi không đổi một byte**, không có `usage`.
- Không đổi mã trạng thái (vẫn 502).
- Ghi chú phạm vi: `/api/suggest` hiện không dùng `withUsage` (không có tham chiếu nào trong `api/suggest.js`) — **không** thuộc yêu cầu này; ozplugin chỉ thanh toán theo `classify`/`describe`.

### Tiêu chí nghiệm thu

Thêm vào `scripts/test-service-tokens.mjs` (file đã có sẵn khung giả `req`/`res`, giả lập lỗi bằng cách thay hàm LLM) :

- `classify 502 + khoá dịch vụ → body.usage là mảng có phần đã ghi` — giả lập `classify` ném lỗi sau khi `recordUsage` 2 lần; khẳng định `status 502`, `Array.isArray(body.usage)`, `body.usage.length === 2`.
- `classify 502 + khoá dịch vụ, chưa gọi LLM → usage []`.
- `classify 502 + HS_API_TOKEN → body KHÔNG có trường usage` (`!('usage' in body)`).
- `classify 502 + người gọi công khai → body KHÔNG có trường usage`.
- `describe lỗi + khoá dịch vụ → 502, body.usage là mảng, body.error khác rỗng`.
- `describe lỗi + công khai → hành vi cũ` (không có `usage`).
- `usage trong lỗi không chứa nội dung prompt` (chỉ 4 trường `provider, model, inputTokens, outputTokens`).
- `node scripts/test-service-tokens.mjs` và `node scripts/test-usage-context.mjs` xanh.

---

## R3. So sánh hằng-thời-gian cho `HS_API_TOKEN`, sửa thông báo 503 — P2

### Bối cảnh

Khoá dịch vụ đã so sánh bằng `safeEqual` (băm SHA-256 rồi `crypto.timingSafeEqual`, `lib/auth.js:24-28`), nhưng `HS_API_TOKEN` vẫn so bằng `===` (`lib/auth.js:57`: `expected && token === expected`) — kẽ hở rò thời gian rất nhỏ. Cổng OZ không phụ thuộc, nhưng cùng một cửa xác thực nên nên đồng nhất. Thông báo 503 (`lib/auth.js:48-52`) chỉ nói "HS_API_TOKEN is not set" trong khi `requireAuth` cũng chấp nhận `HS_SERVICE_TOKENS` (điều kiện 503 là **cả hai** đều trống, `lib/auth.js:47`) — người vận hành đọc sẽ hiểu sai.

### Yêu cầu

1. Dòng 57: thay `token === expected` bằng `safeEqual(token, expected)` (dùng lại hàm sẵn có). Hành vi đúng/sai không đổi.
2. Thông báo 503: `detail` nêu cả hai biến, ví dụ `"Chưa cấu hình HS_API_TOKEN hoặc HS_SERVICE_TOKENS trên máy chủ"`. Giữ `error: 'Service misconfigured'` và mã 503. (Lưu ý `requireAdmin`, `lib/auth.js:72-87`, dùng `HS_ADMIN_TOKEN` và cũng so bằng `!==` tại dòng 83 — nên đổi cùng một lượt nếu chủ kho đồng ý; ngoài phạm vi yêu cầu nhưng cùng lỗi.)

### Tiêu chí nghiệm thu

Thêm vào `scripts/test-service-tokens.mjs`:

- `HS_API_TOKEN đúng vẫn qua requireAuth` và `HS_API_TOKEN sai cùng độ dài → 401` (giữ ca hiện có tại dòng 55-56).
- `token độ dài khác → 401, không ném lỗi` (`timingSafeEqual` yêu cầu cùng độ dài buffer — hàm `safeEqual` băm trước nên an toàn; test chứng minh).
- `503 khi không có token nào: body.detail chứa cả "HS_API_TOKEN" và "HS_SERVICE_TOKENS"` (bổ sung vào ca hiện có tại dòng 63-65).
- Kiểm tĩnh: `lib/auth.js` không còn `token === expected` (grep trong test).

---

## R4. Độ trễ `/api/classify` — P0

### Bối cảnh

Đây là điều chặn việc phát hành. Đo ở mốc M0 của ozplugin, **đi qua Cổng, gọi prod** `hs-kb.uythacnhapkhau.com`, `POST /api/classify`: trung bình **41,6 giây**, trung vị (p50) **32 giây**, lớn nhất **120 giây** (chạm hết thời gian chờ của Cổng). Các máy khách MCP phổ biến (Claude Desktop, SDK) có thời gian chờ yêu cầu mặc định **60 giây**; quá ngưỡng đó khách thấy lỗi dù hs-code-api vẫn chạy tiếp và tiêu token (và ozplugin vẫn phải trả tiền LLM). Số đo là của ozplugin; hs-code-api chưa có số đo tương ứng trong kho để đối chiếu (xem mục "Chưa kiểm chứng").

Hiện trạng mã (đã kiểm):
- Ngân sách: `CLASSIFY_BUDGET_MS = 285000` (`lib/classify.js:350`), `GIR_TIMEOUT_MS` mặc định `250000` (`lib/classify.js:375-378`), máy chủ chờ tối đa 300 giây (`server.js:22`). Nghĩa là một lượt **được phép** chạy gần 5 phút trước khi trả mềm `ENGINE_TIMEOUT`.
- Các bước gọi LLM theo `step`: `understand` (hiểu đầu vào, `lib/query-understand.js:89`, trần 12 giây; và vòng 1 của engine, `lib/engine-loop.js:382`), `headings` (sinh nhóm ứng viên, `lib/retrieve-candidates.js:35`), `gir` (chốt mã, `lib/classify.js:194`, `lib/engine-loop.js:402`, `maxTokens` 20000). Có các nhánh thử lại/lùi (`lib/engine-loop.js:99-112`) làm kéo dài thêm.
- Phản hồi hiện có `ms` tổng (`api/classify.js:91,94`) nhưng không có phân rã theo bước.

### Yêu cầu

(a) **Thời gian theo bước, chỉ cho khoá dịch vụ.** Khi `serviceCaller(req) !== null`, phản hồi (cả 200 và lỗi 5xx của R2) có thêm:

```json
"timing": { "understand": 4200, "headings": 6100, "gir": 21800, "guards": 150, "tong": 32250 }
```

Tên khoá là tên bước thật (`understand`, `headings`, `gir`, và các bước còn lại do chủ kho đặt); đơn vị mili giây, số nguyên; `tong` ≈ `ms`. Bước có thử lại cộng dồn vào bước đó và thêm `"<bước>Lan": số lần gọi` nếu có thể. Người gọi công khai/`HS_API_TOKEN`: không đổi shape. Gợi ý cơ chế: gắn vào cùng ngữ cảnh `AsyncLocalStorage` của `lib/usage-context.js` (như `usage`), để không phải luồn tham số qua `classify()`.

(b) **Mục tiêu độ trễ:** p95 < 50 giây (đo qua HTTP, ở tập giữ riêng, với cấu hình chuỗi LLM hiện hành), để dưới ngưỡng 60 giây của máy khách còn dư biên. Chủ kho chọn cách đạt: giảm `maxTokens`/suy nghĩ ở bước không cần (`LLM_STEP_<BƯỚC>` đã có sẵn, `scripts/test-llm-step-profile.mjs`), chạy song song các bước độc lập, hoặc hạ `GIR_TIMEOUT_MS`/`CLASSIFY_BUDGET_MS` để trả mềm sớm hơn. Nếu cần đánh đổi chất lượng lấy tốc độ thì **CEO quyết** (có) — ozplugin không muốn tự quyết hộ.

(c) **Ghi rõ bước nào chịu giới hạn LLM:** thêm một mục vào `docs/` (ví dụ `docs/do-tre-classify.md`) liệt kê từng bước, có gọi LLM hay không, nhà cung cấp/mô hình mặc định, thời gian chờ và trần token, thời lượng điển hình (p50/p95 từ đo ở (d)).

(d) **Script đo p50/p95 trên tập giữ riêng hiện có.** Kho đã có `scripts/bench-classify-llm.mjs` (tập `--set=gold` lấy từ `isHeldOut`, `--concurrency`, `--out`) và `scripts/bench-prod.mjs` (đo prod qua HTTP, nhưng cho `/api/suggest`). Cần một chế độ đo **độ trễ qua HTTP cho `/api/classify`** (có thể thêm `--engine=classify --url=…` vào `bench-prod.mjs` hoặc cờ `--latency` vào `bench-classify-llm.mjs`), in `n, p50, p95, p99, max, trung bình, số lượt vượt 60 giây`, và nếu có `timing` thì in p50/p95 từng bước.

### Tiêu chí nghiệm thu

- `classify + khoá dịch vụ → body.timing có các khoá bước, giá trị số nguyên ≥ 0, timing.tong ≤ body.ms + 50` (giả lập LLM có độ trễ cố định).
- `classify + HS_API_TOKEN / công khai → body KHÔNG có trường timing`.
- `classify lỗi 5xx + khoá dịch vụ → body.timing có phần các bước đã chạy` (đi cùng R2).
- `timing không chứa chuỗi do người dùng nhập` (chỉ khoá cố định từ danh sách bước).
- Test cho script đo: `bench latency: tính p50/p95 đúng trên dãy cho trước` (vd dãy 1..100 giây → p50 = 50, p95 = 95), chạy không cần mạng (hàm tính phân vị tách riêng).
- Báo cáo đo thật (đính kèm PR triển khai, ghi commit SHA như `docs/backlog/README.md` yêu cầu): p50, p95 trước/sau trên cùng tập giữ riêng; **mục tiêu p95 < 50 giây**.
- `node scripts/test-service-tokens.mjs`, `test-classify-*.mjs` xanh; độ chính xác trên tập giữ riêng (`bench-classify-llm.mjs --set=gold`) không giảm quá ngưỡng CEO chấp nhận (chủ kho nêu con số).

---

## R5. Loại tập giữ riêng theo từng request, chỉ cho khoá dịch vụ — P1

### Bối cảnh

ozplugin có bộ đề vàng riêng và lệnh `pnpm eval` để đo độ chính xác **thật** của đường Cổng → prod. Để không "học thuộc đề", kho tiền lệ Oz phải loại tập giữ riêng khi chấm. Hiện việc đó chỉ làm được ở mức **cả tiến trình** bằng biến môi trường:

- `lib/holdout.js:34-37`: `evalExcludesHoldout()` đọc `process.env.HS_EVAL_EXCLUDE_HOLDOUT === '1'`.
- Chỉ một nơi dùng: `lib/oz-precedent-search.js:43` (`ensureCache()` lọc `cachedGold` **một lần khi dựng cache**, rồi cache dùng chung cho mọi request đến hết `CACHE_TTL_MS`).

Hệ quả: đo qua prod thì kho tiền lệ **chứa** đáp án (đúng như `scripts/bench-prod.mjs` đã tự cảnh báo ở đầu tệp: "số đo prod có thể lạc quan hơn thực tế"). Bật biến môi trường trên prod thì ảnh hưởng mọi người dùng thật — không chấp nhận được.

### Yêu cầu

Chấp nhận header `X-OZ-Eval-Holdout: 1` trên `/api/classify` và `/api/suggest` (và bất kỳ đường nào gọi `lib/oz-precedent-search.js`), với các điều kiện:

1. **Chỉ có hiệu lực khi `serviceCaller(req) !== null`** (khoá có tên trong `HS_SERVICE_TOKENS`). Gọi công khai, `HS_API_TOKEN`, hay khoá dịch vụ nhưng không có header → **không đổi hành vi nào** so với hôm nay. Header có mà người gọi không phải khoá dịch vụ → bỏ qua âm thầm (không 4xx, không dò ra được khoá nào hợp lệ).
2. **Theo từng request, qua `AsyncLocalStorage`** giống `lib/usage-context.js` (mô-đun nhỏ, ví dụ `lib/eval-context.js`, hoặc mở rộng `evalExcludesHoldout()` để đọc ngữ cảnh trước rồi mới tới biến môi trường). Hai request song song, một có cờ một không, không lẫn nhau.
3. **Lọc ở lúc đọc, không ở lúc dựng cache.** Vì `cachedGold` và `cachedHsIndex` dùng chung giữa các request (`lib/oz-precedent-search.js:11,37-52`), request có cờ phải bỏ `isHeldOut(g)` khi truy vấn (các vòng duyệt tại `lib/oz-precedent-search.js:60,78,83` và đường tra theo mã), **không** được làm cache bị lọc vĩnh viễn hay cache chưa lọc bị dùng cho request có cờ. Biến môi trường `HS_EVAL_EXCLUDE_HOLDOUT=1` giữ nguyên nghĩa cũ (lọc cả tiến trình) cho các script bench.
4. **Bỏ qua cache kết quả:** `lib/suggest-cache.js` (dùng ở `api/suggest.js:122-123,197`) trả kết quả đã tính có thể từ lượt **không** loại holdout. Request có cờ phải bỏ qua cache đọc **và** không ghi vào cache (nếu không sẽ rò đáp án qua kết quả cache, hoặc làm bẩn cache của người dùng thường bằng kết quả đã loại holdout). Chủ kho kiểm tra thêm các cache khác nếu có.
5. Phản hồi cho khoá dịch vụ có cờ: thêm `"evalHoldoutExcluded": true` để ozplugin xác nhận cờ đã được nhận (nếu không thấy trường này thì kết quả đo coi như không hợp lệ).
6. Ghi chú vào `CLAUDE.md`/tài liệu: đây là đặc quyền chỉ của khoá dịch vụ, nhật ký truy cập nên ghi lượt có cờ (để thấy nếu khoá bị lạm dụng).

**Cần CEO quyết:** có (đây là một đặc quyền mới gắn với khoá dịch vụ; theo tinh thần quy tắc 2, mặc định kín — ở đây là mặc định **tắt**, chỉ bật cho khoá có tên).

### Tiêu chí nghiệm thu

Thêm vào `scripts/test-holdout-leak.mjs` (hiện đã có khung kiểm "không rò đáp án khi loại tập giữ riêng") và `scripts/test-service-tokens.mjs`:

- `không có cờ: mẫu thuộc holdout vẫn tìm thấy đáp án của chính nó trong kho tiền lệ` (hành vi hôm nay, giữ nguyên; biến môi trường **không** đặt).
- `khoá dịch vụ + X-OZ-Eval-Holdout:1: mẫu holdout KHÔNG tìm thấy đáp án của chính nó` (tái dùng cách chọn mẫu của test hiện có).
- `người gọi công khai + header: vẫn thấy đáp án (header bị bỏ qua)`.
- `HS_API_TOKEN + header: vẫn thấy đáp án (header bị bỏ qua)`.
- `khoá dịch vụ + header=0 hoặc giá trị lạ: không loại`.
- `hai request song song (có cờ / không cờ): mỗi bên đúng hành vi của mình` (chạy `Promise.all` với độ trễ đan xen — chứng minh ngữ cảnh không lẫn).
- `sau một request có cờ, request không cờ kế tiếp vẫn thấy mẫu holdout` (cache dùng chung không bị lọc vĩnh viễn).
- `suggest: request có cờ không đọc và không ghi suggest-cache` (đặt cache bằng request không cờ, gọi lại với cờ, khẳng định không trả `cached`).
- `phản hồi có evalHoldoutExcluded:true chỉ khi cờ được chấp nhận`.
- `node scripts/test-holdout-leak.mjs`, `test-service-tokens.mjs`, `test-precedent-search.mjs` xanh.

---

## R6. Thông tin: đóng 4 endpoint LLM công khai khi ozplugin bắt đầu thu phí (M3) — không cần mã ngay

CEO đã chốt 10/10/2026: khi ozplugin bắt đầu thu phí (mốc M3), bốn endpoint LLM đang mở công khai (`suggest`, `describe`, `classify`, `match`; danh sách `PUBLIC_LLM_ENDPOINTS` tại `lib/public-llm.js:20`) sẽ được **đóng** bằng công tắc đã có sẵn `HS_PUBLIC_LLM=false` (`lib/public-llm.js:22-25`, cơ chế `requireAuthOrPublicLlm` rơi về `requireAuth` ở dòng 35). Lý do: sau khi thu phí, kênh duy nhất tính tiền là Cổng; mở không giới hạn là tặng miễn phí chính thứ đang bán và tiêu tiền LLM của Oz.

Việc cần chuẩn bị (không phải mã mới, chỉ để không bị bất ngờ lúc đóng):
- Ai đang gọi công khai hôm nay (ERP `erp-xnk`, trang chủ, AI ngoài đọc `llms.txt`/`AGENTS.md`) phải có `HS_API_TOKEN` hoặc khoá dịch vụ riêng trước ngày đóng. Cổng `cong-oz` đã có khoá.
- Rà `llms.txt`, `AGENTS.md`, `public/openapi.json`, mô tả auth của 4 endpoint — chỗ nào ghi "mở không cần token" phải sửa cùng lúc đóng (`scripts/test-public-llm.mjs` và `scripts/test-public-access.mjs` đã khoá danh sách; kiểm cả hai khi đổi env).
- Hợp đồng ngầm cần giữ sau khi đóng: `usage` (R2), `timing` (R4) và cờ holdout (R5) chỉ dành cho khoá dịch vụ nên không bị ảnh hưởng.
- Thời điểm thực hiện do CEO quyết khi M3 sẵn sàng; ozplugin sẽ báo trước.

---

## Chưa kiểm chứng được

- Số đo độ trễ ở R4 (41,6 giây trung bình / 32 giây p50 / 120 giây tối đa; ngưỡng 60 giây của máy khách) là số của ozplugin, chưa tái hiện được từ phía hs-code-api trong lần soạn này (không gọi prod). Con số "mặc định 60 giây" của Claude Desktop/SDK là thông tin phía máy khách, chưa kiểm trong kho này.
- Tên bước và thứ tự thật trong đường `/api/classify` (R4a): đã thấy các `step` `understand`, `headings`, `gir` ở `lib/query-understand.js:89`, `lib/retrieve-candidates.js:35`, `lib/classify.js:194`, `lib/engine-loop.js:382,402`, nhưng chưa vẽ lại toàn bộ luồng gọi; chủ kho là người chốt danh sách bước cho `timing`.
- Mức độ `coQuan` đầy đủ qua `plhq.lookup` cho cả 27 văn bản của chỉ mục HS (R1): đã kiểm sổ có `coQuan` ở 2231/2232 văn bản, chưa kiểm từng `soHieu` của 27 văn bản có khớp khoá `khoa()` hay không.
- Có thêm cache kết quả nào khác ngoài `lib/suggest-cache.js` trên đường classify/suggest hay không (R5.4): chỉ rà `api/suggest.js`, `lib/classify.js`, `lib/suggest*.js`.
- Các đường dùng `lib/oz-precedent-search.js` ngoài `ensureCache` (R5.3) — tất cả điểm gọi tại `lib/retrieve-candidates.js:9`, `lib/engine-loop.js:19`, `lib/suggest-core.js:13`, `api/suggest.js:14`, `api/dataset.js:9` cần được chủ kho rà để cờ đi đúng qua mọi nhánh.
