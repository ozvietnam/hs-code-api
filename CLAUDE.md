# CLAUDE.md — Rules cho Claude Code khi work trên `hs-code-api`

File này được Claude Code load mỗi khi mở repo. CEO là **solo dev** với Claude.

## Mục tiêu service

Service HTTP API cho ERP `erp-xnk` gọi sang để:
1. **Xác định mã HS code** (`POST /api/suggest` — AI Gemini + GIR ranking)
2. **Tra thuế** (`GET /api/tax?hs=X`)
3. **Sinh mô tả khai báo Hải quan** (`POST /api/describe` — chuẩn TT 39/2018)

**Track B (chatbot công khai + landing SEO) đã HOÃN vô thời hạn** — CEO chốt
2026-07-06 tại Issue #34: ưu tiên đào sâu data + API nội bộ trước. Đừng tự khởi
động lại Track B khi chưa có chỉ đạo mới.

## Tech stack

- Node.js handler kiểu serverless (`api/*.js`) chạy bằng `server.js` trên server riêng — KHÔNG dùng Next.js framework
- Data: bảng tra **TĨNH** (tax.json, notes, precedents… — chỉ đọc) giữ dạng JSON files trong `data/` (nạp nhanh, versioned bằng git). **Dữ liệu GHI LÚC CHẠY** (kho tiền lệ, feedback, log) **ĐƯỢC dùng database** (Postgres) — rào "no DB" cũ chỉ áp cho thời Vercel serverless (tránh cold start chậm); nay chạy `server.js` server riêng nên DB thường trú OK. CEO chốt 12/10/2026 (#237, #255-B3). Ngoại lệ chỉ đọc: Danh mục rủi ro phân loại QĐ 2079/QĐ-TCHQ nằm ở `data/rui-ro-phan-loai/qd-2079.json` (tĩnh, công khai) và có thể có thêm bảng Postgres chỉ đọc (#655).
- AI: rerank + sinh mô tả qua chuỗi LLM (xem dòng dưới; MiniMax chính). Semantic search bằng embedding **chưa bật ở runtime** — ghi "Gemini Embedding 001" trước đây là SAI; #237 sẽ đưa bge-m3 cục bộ vào, khi đó cập nhật lại.
- Chuỗi LLM (`lib/llm-tier.js` → `lib/llm.mjs`, CEO chốt 04/10/2026, thêm DeepSeek 17/10/2026): **MiniMax gọi thẳng
  (gói trả phí, `MiniMax-M2.7-highspeed`)** → DeepSeek gọi thẳng (`DEEPSEEK_API_KEY`, chỉ lượt công khai) → Hermes → OpenRouter → Gemini miễn phí
  (`GEMINI_FREE_KEYS`, chỉ dự phòng) → khóa Gemini trả phí khi tier premium, và (tạm thời, CEO chốt 30/10/2026, #578,
  env `GEMINI_TRA_PHI_CHOT_CUOI` mặc định `on`) làm chốt cuối cho lượt công khai khi mọi nhà cung cấp trên đã lỗi. Không phụ
  thuộc Gemini miễn phí. Thiếu key provider nào thì tự bỏ qua; local dev dùng OpenRouter free
  — `docs/openrouter.md`, `npm run openrouter:ping`
- **Dữ liệu khách không ra tầng miễn phí — chỉ khi nó THẬT SỰ là dữ liệu khách** (`lib/llm-privacy.js`, #237 J1 chốt
  11/10/2026; ranh giới thu hẹp theo OZV-754 — anh Thắng 13/11/2026: "thông tin hàng thì đầy rẫy trên web, chả có gì
  là bí mật"). **KHÔNG còn riêng tư** (thông tin hàng): tên hàng, mô tả, thông số, chất liệu, công dụng, ảnh, link sàn,
  hãng, model. **VẪN riêng tư**: số tờ khai; invoice đủ thông tin mua bán; số lượng; đơn giá/trị giá; danh tính khách;
  mọi đường chạm kho tờ khai Oz (oz-gold, `HS_INTERNAL_CALLERS`, `locTheoQuyen`) và dữ liệu trang/ảnh của khách trong
  phiếu khai. Cửa chỉ mang thông tin hàng (suggest, describe, classify, identify, extract-specs, mkt sourcing, ho-so)
  bọc `withHangHoa()` — bằng `withPrivateData()` khi env `HS_KHACH_MO_CHUOI_AI` TẮT (mặc định; giữ nguyên luật
  #237 J1 + cờ `containsCustomerData` ở lib), và bằng lượt THƯỜNG khi QT bật env (lượt đó đi đủ chuỗi dự phòng —
  DeepSeek/Hermes/OpenRouter TRẢ TIỀN THEO LƯỢT, nên env mặc định TẮT, QT quyết). Cửa mang dữ liệu thật sự riêng tư
  (declaration-sheet, dispute-draft, declaration-check, lớp `lib/ho-so/*` dùng câu Oz) LUÔN `withPrivateData()`
  bất kể env. Lượt `withPrivateData()` → LLM chỉ đi `LLM_NO_TRAIN_PROVIDERS` (mặc định MiniMax + khoá Gemini trả
  phí), không web (B1b `isPrivate()`), hết → `NO_PRIVATE_LLM` không rơi tầng miễn phí. Script batch trên tờ khai Oz
  đặt `HS_LLM_PRIVATE_ALL=true`. Thêm endpoint LLM cho khoá dịch vụ: dữ liệu tờ khai → bọc `withPrivateData`, chỉ
  thông tin hàng → bọc `withHangHoa`. `HS_GEMINI_FREE_CHO_KHACH` giữ nguyên (lưới chốt cuối, OZV-726).
- Auth: Bearer token (`HS_API_TOKEN` env)
- Deploy: server riêng của Oz (Docker/Coolify, `server.js` + `Dockerfile`), domain prod `hs-kb.uythacnhapkhau.com` qua Cloudflare. **Đã gỡ Vercel (CEO chốt 09/10/2026).** Định tuyến nằm ở `routes.json`
- **Nguồn sự thật là GitHub `ozvietnam/hs-code-api`** (CEO chốt 29/09/2026). Gitea của
  hệ thống quản lý đơn (ERP) chỉ tự đồng bộ từ GitHub để lấy data về dùng — muốn sửa
  gì thì sửa trên GitHub, KHÔNG sửa trên Gitea.

## Cấu trúc dự án

```
api/               # 12 file handler.
                   # Nhiều URL "logic" khác được gộp vào dataset.js/tariff.js
                   # qua rewrite trong routes.json — KHÔNG có file riêng.
  health.js          # Public — health check
  tax.js             # Bearer — tra thuế
  search.js          # GET mở; /api/match (?mode=match) cũng mở (không token)
  suggest.js         # Mở (không token) — AI suggest
  describe.js        # Mở (không token) — AI describe
  classify.js        # Mở (không token) — phân loại có decision tree + conflict resolver
  feedback.js        # Bearer — capture director feedback
  notes.js           # Bearer — chú giải chương
  kg_chapter.js      # Bearer — liệt kê HS trong chương
  customs-types.js   # Bearer — mã loại hình XNK
  dataset.js         # Bearer (trừ allowlist công khai) — gộp: conflicts, precedents, ministries, products, rui-ro-phan-loai,
                     #   legal-docs, trademark, admin/overview, kpi, data-quality...
  tariff.js          # Bearer — gộp: versions, version/diff, admin/update, admin/revert

lib/               # Business logic (~50 module)
  data.js, auth.js, cors.js, gemini.js, llm-tier.js, llm.mjs
  data-paths.js           # phân giải đường dẫn data/ — HS_DATA_DIR để test cách ly
  hs-tree.js              # LÕI: cây HS theo CHỮ SỐ của mã (phần→chương→nhóm→phân nhóm→tiêu đề QG→lá), #236
  hs-tree-sources.js      # nguồn tri thức gắn vào từng nút, nhãn NGUYEN_VAN/DA_KIEM/AI_CHUA_KIEM
  nguon-loai.js           # MỘT bảng nhãn loại nguồn cho mọi tệp data/ (AI_CHUA_KIEM không được trích làm căn cứ)
  bieu-thue.js            # đọc biểu thuế XNK Tổng cục (Excel) KHÔNG bỏ sót — skill .claude/skills/bieu-thue-xnk; cây lấy tên nút từ đây
  so-tay.js, so-tay-runtime.js  # máy kiểm sổ tay (nguonLoai, cay, tieuChi6, kiemCay) + sổ tay lúc chạy (cố vấn)
  search-utils.js, tax-mapper.js
  declaration-validator.js, gir-engine.js, conflict-resolver.js
  ministries.js, material-taxonomy.js, glossary.js
  legal-docs.js, customs-types.js, tariff-versions.js
  trademark-watch.js, loai-khac-classifier.js
  ...

data/              # Lookup tables + main dataset
  tax.json (5.6 MB)       # 11,871 HS code chính
  notes.json              # Chú giải
  precedents.json         # TB-TCHQ
  conflicts.json          # HS dễ nhầm
  tax-enriched.json       # Gemini policy parse
  ministries-vn.json      # 14 bộ ngành
  legal-docs.json         # Văn bản pháp luật
  customs-types.json      # Mã loại hình XNK
  taxonomy/               # polymer/wood/fiber/chemical/metal
  versions/               # Tariff versioning history
  rui-ro-phan-loai/       # Danh mục rủi ro phân loại QĐ 2079 (công khai, tín hiệu — không phải căn cứ)
  oz-export/              # CEO drop ECUS data + BIEU-THUE-XNK-<ngày>.xlsx (PRIVATE, gitignored)
  bieu-thue/<ngày>/       # biểu thuế Tổng cục đã trích: bieu-chinh.jsonl.gz (27 mức thuế + căn cứ từng mức), ten-nut.json, tieu-de

scripts/           # Admin CLI tools
public/admin/      # Admin Dashboard UI (HTML/JS)
tests/             # Test fixtures
```

## Workflow khi CEO yêu cầu feature

1. **Đọc context** — check Issue link, related files trong `lib/` + `data/`
2. **Brainstorm ngắn** (skill `superpowers:brainstorming`) — nếu phức tạp
3. **Code thẳng** — anh code direct main (không có PR review, solo)
4. **Test local** — `node server.js` (cổng 3000) rồi test endpoint qua `curl`
5. **Commit incremental** — mỗi feature 1 commit có message rõ
6. **Push origin main** — server riêng tự kéo bản mới (Coolify) — xem docs/deploy-coolify.md
7. **Verify** — curl production endpoint check OK

## Tư duy tiếp cận (CEO chốt 11/10/2026)

Dự án **phục vụ xã hội**: tri thức phân loại HS (chú giải, ý kiến WCO, tiền lệ, sổ tay) được mở công khai cho người khai
báo, cơ quan hải quan, AI agent và bất kỳ ai cần — mặc định **mở, không rón rén**. Chỉ giữ kín ba thứ: (1) dữ liệu khách
hàng/tờ khai gốc của Oz, (2) bí mật vận hành (khoá, log, admin), (3) nội dung chưa đủ tin cậy để công bố. Bản quyền của
nguồn ngoài (vd WCO) được ghi rõ trong `NOTICE.md` — ghi tuyên bố đúng sự thật, không giấu cũng không bịa thêm. Cổng kiểm
chỉ chặn vì **độ chính xác** (trích sai mã tệ hơn không trích), không chặn vì sợ.

## Rule bất biến

1. **Privacy data** — KHÔNG bao giờ commit `data/oz-export/*.{xlsx,csv,jsonl}` (gitignored). Đây là tờ khai cũ Oz có thông tin khách hàng. `data/wco-op/` (Tuyển tập ý kiến phân loại WCO) **được commit và công khai từ 11/10/2026** (CEO Oz tuyên bố đã trả phí bản quyền, cho dùng công khai — #196): commit `opinions.json`, `vi.json`, `so-tay-trich.json`, README; KHÔNG commit PDF/OCR md/bản sao lưu (nặng, trung gian). Nội dung WCO là **ngoại lệ của CC BY-SA** (xem `NOTICE.md`); mọi phản hồi trả nội dung WCO kèm `banQuyen` (`lib/wco-op.js#BAN_QUYEN`) và chỉ trả ý kiến đã qua cổng mã/thứ tự (`byHs`/`view`) — vì độ chính xác, không vì bản quyền.
2. **Bearer auth** — mặc định KÍN. Mọi thứ quản trị và ghi dữ liệu phải `requireAuth(req, res)` từ `lib/auth.js`. **Ngoại lệ do CEO chốt 09/10/2026:** 4 endpoint LLM (`suggest`, `describe`, `classify`, `match`) mở công khai KHÔNG giới hạn qua `requireAuthOrPublicLlm` (`lib/public-llm.js`; mỗi lượt tốn tiền LLM thật; đóng khẩn cấp bằng env `HS_PUBLIC_LLM=false`). Không mở thêm endpoint LLM khác (`extract-specs`, `declaration-sheet`) theo cơ chế này nếu CEO chưa chốt. Nhóm tra cứu chỉ đọc (dữ liệu tĩnh, hoặc bảng Postgres chỉ đọc như `rui-ro-phan-loai`) thì mở công khai qua `requireAuthUnlessPublic(...)` — **allowlist tường minh** ở `lib/public-access.js`. Thêm resource mới vào `dataset.js` thì nó mặc định KÍN; muốn mở phải khai có ý thức và `scripts/test-public-access.mjs` phải xanh. Quên khai = mất tính năng, quên chặn = lộ dữ liệu; luôn chọn hướng sai an toàn.
3. **CORS** — luôn `setCors(res)` + `handleOptions(req, res)` ở đầu handler.
4. **camelCase response** — chuẩn shape camelCase cho ERP, dùng `lib/tax-mapper.js`.
5. **Compliance TT 39/2018** — `/api/describe` phải trả structured `declaration` + `compliance.score` + `level` + `warnings[]`.
6. **GIR audit trail** — `/api/suggest` response phải có `girRulesApplied[]` (Issue #24), và **mọi trích dẫn GIR phải đi qua `lib/gir.js`**. Không nơi nào khác được tự gắn nhãn `GIR-*`. Mỗi mục bắt buộc có `basis` (`RULE_TABLE` > `DETERMINISTIC` > `HEURISTIC` > `LLM_ASSERTED`) + `evidence` + `source`. Trích sai điều luật tệ hơn không trích: đây là bằng chứng người khai đưa cho Hải quan. Tín hiệu heuristic đi vào `rankingSignals[]`, checklist theo chương đi vào `chapterGuidance[]` — tuyệt đối không gọi chúng là GIR.
7a. **Căn cứ pháp lý TT 85/2026** — `canCuPhapLy` trong phản hồi `/api/suggest`, `/api/classify` (và vòng hai) ghi điều/khoản/điểm của TT 85/2026/TT-BTC (hiệu lực 15/09/2026). **Mọi trích dẫn điều luật đi qua `lib/legal-basis.js`** (như `lib/gir.js` với GIR); điều khoản mới thêm vào `CLAUSES` và chạy `node scripts/check-legal-basis.mjs --text=<văn bản trích từ PDF Công báo>`. Không khẳng định điều văn bản không nói (Điều 6.1 chỉ *liệt kê* a→d, không ghi "ưu tiên"); không khẳng định đã tra nguồn mà lượt đó không tra (dùng `CHUA_TRA_CUU*`). Phản hồi `/api/suggest`/`/api/classify` trả CON TRỎ tới ý kiến WCO (kèm `xemToanVan`); toàn văn + bản dịch ở `/api/wco-opinions` (công khai, kèm `banQuyen`). **Danh mục rủi ro phân loại QĐ 2079/QĐ-TCHQ** (`DANH_MUC_RUI_RO`, nhãn `QD_2079_BAC_C`) là **tín hiệu cảnh báo, công khai cho mọi caller** (CEO chốt 30/10/2026, #655) — KHÔNG BAO GIỜ là `canCuPhapLy`, không là trích dẫn GIR, không là nguồn loại trừ `DA_KIEM` (không ghi vào `conflicts.json`). Số đếm từ tờ khai Oz (`MO_TA_GIONG_MA_KHAC`) vẫn chỉ nội bộ.
7b. **Sổ tay lúc chạy = CỐ VẤN** — `soTay` trong phản hồi `/api/suggest`, `/api/classify` (`lib/so-tay-runtime.js`) chỉ đính thêm thông tin: không đổi mã đã chọn, trạng thái, cờ hay prompt LLM; lỗi bất kỳ → bỏ khối này, endpoint chạy như cũ; tắt khẩn cấp `HS_SOTAY_RUNTIME=false`. `canGiaiTrinh` là máy *nghi* (chưa đo tỉ lệ báo oan), không dùng làm cổng chặn. Nối vào *quyết định* (kết cục A–D, rút gọn prompt) chỉ sau khi chạy khô bước 2 và đo bench. `yKienWco` trong sổ tay là tóm tắt tự viết + `xemToanVan`; nguyên văn nằm ở `data/wco-op/`, không chép vào `data/so-tay/`. **Nhãn loại nguồn** (`lib/nguon-loai.js`, 11/10/2026): mọi mục sổ tay mang `nguonLoai` (`AI_DA_KIEM`/`NGUOI_DUYET`; khối máy sinh `MAY_SUY`); tệp AI cũ (`explanatory-notes`, `legal-notes-enriched`, `loai-khac-index`, `hs-context`, `tax-enriched`) là `AI_CHUA_KIEM` — lộ ra phản hồi phải kèm nhãn, không làm căn cứ, không trích vào sổ tay. Khối `cay` của sổ tay do máy sinh từ `lib/hs-tree.js`; `scripts/check-cay.mjs` đỏ khi sổ tay lệch cây.
7. **Định tuyến gộp** — `server.js` đọc `routes.json`; giữ pattern gộp route qua rewrites (`dataset.js`/`tariff.js`) vì repo gọn; request chạy được tới 300s. Chỉ tách function khi thật sự cần.
8. **Test KHÔNG được ghi vào `data/` thật** — mọi lib có ghi (`feedback-store`, `admin-update`, `tariff-mutations`, `access-log`, `error-monitor`, `ml-log`) phải lấy đường dẫn qua `lib/data-paths.js` (`dataPath` để ghi, `dataReadPath` để đọc), và test phải `import './test-isolate-data.mjs'` ở dòng đầu để ghi vào thư mục tạm. Trước đây `npm test` làm bẩn repo, có lần commit lẫn snapshot `v-api-test` thành phiên bản biểu thuế "đang hiệu lực".
9. **Chạy test cho ĐÚNG rồi hãy nói "xanh"** (Phòng họp GĐ 11/11/2026, OZV-271/272/290 — chi tiết ở `docs/van-hanh/cong-gop-chay-test.md`, chuẩn chung toàn công ty ở `ozplugin/docs/cong-gop-pr.md`): môi trường agent có `NODE_ENV=production` nên npm tự bật `omit=dev` ⇒ `npm ci` **bỏ hết devDependencies** (`xlsx`, `pdf-parse`, `@electric-sql/pglite`) mà vẫn thoát 0; `Cannot find module 'xlsx'` KHÔNG phải "máy thiếu gói" mà là lệnh cài sai — luôn `npm ci --include=dev`. Worktree mới thì cài hoặc `ln -s` `node_modules` TRƯỚC khi chạy lệnh kiểm. Chỉ tin lệnh kiểm khi log có **đủ cả** số ca test và `EXIT=0` của chính lần chạy đó: `npm test > /tmp/log 2>&1; echo "EXIT=$?" >> /tmp/log; node scripts/dem-ca-test.mjs /tmp/log`. Bình luận soát PR phải dán **tổng số ca chạy thật**, không chỉ ghi chữ "xanh"; đừng grep `=== ALL TESTS PASSED ===` làm bằng chứng. **Trọn bộ `npm test` = 26 phút > giới hạn ~10 phút của lệnh chạy nền ⇒ KHÔNG BAO GIỜ chạy xong trên máy agent** (đứt với `EXIT=143` giữa chuỗi, bất kể PR nào, không phải test đỏ): số ca trọn bộ **lấy ở CI** (job `test` in sẵn dòng `dem-ca-test.mjs`), cục bộ chỉ chạy bộ liên quan thay đổi. Trước khi tin số đo thời gian, xem `cat /proc/loadavg` — số đầu > 32 (số lõi) thì số đo vô nghĩa; và đừng chạy hai lệnh kiểm nặng trùng nội dung cùng lúc (máy dùng chung với thợ). **Quy tắc 4 (OZV-290) — xác nhận cây CÓ PR trước khi tin số test:** gộp thử bằng **ref có tên**, KHÔNG dùng `FETCH_HEAD` (`git fetch origin main` xen giữa sẽ **ghi đè `FETCH_HEAD`** ⇒ `git merge FETCH_HEAD` báo `Already up to date`, cổng chạy trên `main` thuần không có dòng nào của PR mà log vẫn đủ số ca + `EXIT=0`): `git fetch origin pull/<số>/head:refs/pr<số>-head --force` → `git merge --no-edit refs/pr<số>-head` → `git diff --stat origin/main HEAD` **phải khớp đúng số tệp + số dòng của PR**. Bình luận soát ghi **SHA bản gộp thử** + dòng `git diff --stat` bên cạnh số ca + `EXIT`; hai mốc `bo-kiem-luat` phải đo tại chỗ cả hai bên trong cùng nhịp, không dùng mốc lưu sẵn. Bình luận biên bản **đi trước** `gh pr merge`; CI phải xanh **trên commit cuối** (kiểm `head_sha` khớp). **Không tự gộp PR do chính mình viết** — người thứ hai soát độc lập, giám đốc dự án bấm gộp (OZV-283). **Quy tắc 5 (OZV-310) — cổng xanh / delta 0 KHÔNG chứng minh bản vá có tác dụng:** PR *sửa lỗi* mà cổng ra delta 0 toàn bảng thì bản vá **rỗng** cũng ra đúng số đó ⇒ phải **đo trực tiếp hành vi trước/sau** trên dữ liệu thật và dán lệnh + số, không có số ⇒ **CHẶN**; PR *thêm dữ liệu* mà chỉ số của chính nhóm mới delta 0 là **bất thường** (dữ liệu mồ côi, chưa nối vào đường chạy). Chỉ nhận là "đỏ đúng chỗ" khi log có `N failed | M passed` **kèm tên ca** (runner in `failed` nhưng 0 ca chạy là bằng chứng rỗng). **Quy tắc 6 (OZV-337) — biên bản `TRẢ THỢ` phải chặn được tay người gộp** (một biên bản chặn chỉ sống 7–12 phút nếu không có chốt; #1210 chặn `15:57Z` → vẫn gộp `16:09Z`). *6a:* kết luận `TRẢ THỢ` ⇒ gắn nhãn bằng **REST** `gh api -X POST repos/ozvietnam/hs-code-api/issues/<số>/labels -f "labels[]=tra-tho" -q '[.[].name]'` rồi **đọc lại** (đừng dùng `gh pr edit --add-label`: chết vì GraphQL `projectCards`, hỏng im lặng); **bước đầu tiên** mọi lần gộp là `gh pr view <số> -R ozvietnam/hs-code-api --json labels,comments` — còn nhãn `tra-tho` hoặc bình luận soát cuối là `TRẢ THỢ` mà chưa có commit sửa mới + biên bản gỡ nhãn **sau** commit đó ⇒ **dừng, cấm gộp**. *6b:* PR sửa regex ăn dữ liệu thật/chữ khách/đầu ra LLM ⇒ rã mẫu từng nhánh và `grep` trong `data/tax.json` (`nhung` trùng vải nhung `59070040`, nấm Tùng Nhung `07095500`; `ma` trùng ma hoàng `12115000`, ma tít `32141000`), **đo hai chiều** trên cùng bộ ca (bắt lỗi cũ VÀ không bắt nhầm), và 1 ca **ReDoS ~40.000 từ lặp phải < 2 giây**. *6b-bis:* PR sửa **chính tệp đo điểm** (`scripts/bo-kiem-luat.mjs`, `eval:*`) phải **đo BA CHIỀU** — nền `origin/main`, *chỉ dữ liệu* (`git checkout refs/pr<n>-head -- <tệp data/>`, giữ gate của main), đầy đủ — và soi dấu hiệu **nới thước** (`không thể chốt`/`nemLoi` giảm bất thường). *6c:* chép mẫu từ repo khác ⇒ ghi 1 dòng trong PR *"mẫu gốc chịu được ngữ cảnh mới vì…"*.

## Tham chiếu pháp luật quan trọng

- **TT 39/2018/TT-BTC** mục 1.78 — yêu cầu mô tả hàng hóa khai báo
- **CV 5189/TCHQ-GSQL** (2019), **CV 755/TCHQ-GSQL** (2020) — quy định chống mô tả mơ hồ
- **6 quy tắc GIR (WCO)** — chuẩn quốc tế phân loại HS code
- **QĐ 1357/QĐ-TCHQ** — mã loại hình XNK

## Issues + Roadmap

- GitHub: https://github.com/ozvietnam/hs-code-api/issues
- Master meta: Issue #14
- Roadmap dual-track: Issue #34 (ERP + Chatbot tương lai)
- Cleanup tracking: Issue #35

## Khi hết context / session mới

Đọc theo thứ tự:
1. `README.md` — picture tổng
2. `CLAUDE.md` — file này
3. GitHub Issue đang work (link CEO paste hoặc đọc `gh issue list`)
4. `data/*.json` (skim sample 3 row)
5. `api/<endpoint-quan-tâm>.js` + `lib/<helper-liên-quan>.js`

## Khi CEO hỏi

**"Làm tiếp issue #X giúp anh"** → `gh issue view X` → đọc spec → code thẳng.

**"Review code/PR"** → `git diff` → check 7 rule bất biến + compliance.

**"Service đang OK không?"** → `curl /api/health` + xem trạng thái ở Coolify.

**"Đẩy lên server"** → `git push origin main` (Coolify tự kéo) + verify production.

## Commit message format

```
<type>(<scope>): <vi-subject> (#issue)

[optional body]
```

`<type>` ∈ `feat|fix|refactor|test|docs|chore|perf|deploy`
`<scope>` ∈ `auth|tax|search|suggest|describe|feedback|admin|gir|data|deploy|...`

## ⚠️ Tránh

- ❌ Code 10h liên tục — sleep đủ
- ❌ Push main mà chưa test local
- ❌ Commit `.env`, `data/oz-export/*`, hoặc bất kỳ thông tin khách hàng nào
- ❌ Xây mới khi GitHub đã có repo cũ tương tự — luôn `gh repo list ozvietnam --limit 100` trước
- ❌ Promise compliance nhưng không validate structured (TT 39/2018)
