# Yêu cầu cấp VPS + thiết kế harness cho agent tự hành `hs-code-api`

**Người nhận:** dev quản trị server · **Người yêu cầu:** CEO · **Người soạn:** Claude
**Ngày:** 2026-09-25 · **Tài liệu liên quan:** `docs/server-nha.md` (dựng 4 endpoint LLM), `docs/backlog/04-contribution.md` (luật đóng góp data), `CLAUDE.md` (8 rule bất biến)

---

## 0. Vì sao cần một cái máy riêng

Hôm 24/09 chạy 10 agent trong một phiên Claude Code để vá data mỏng: thu thêm 143 tiền lệ TB-TCHQ, 99 mục từ điển mâu thuẫn, verify 36 văn bản pháp luật. Kết quả tốt nhưng phiên đó lộ ba giới hạn của việc chạy trong cửa sổ chat:

1. Hạn mức tìm kiếm web của phiên cạn giữa chừng, nửa sau agent phải mò bằng `curl`.
2. Mọi thứ chỉ chạy khi có người mở phiên. Chính sách Hải quan, thông báo phân loại, quyết định chống bán phá giá ra hàng ngày, không ai ngồi canh.
3. Không có vòng học từ truy vấn thật: `ml-log.jsonl` và `feedback.jsonl` trên Vercel là ephemeral, ghi xong mất, nên hệ thống không cải tiến được sau từng lần ERP gọi.

Muốn data chất lượng và cải tiến từng ngày thì cần agent chạy liên tục trên máy riêng, **nhưng agent không được quyền ghi thẳng vào `main`**. Toàn bộ tài liệu này xoay quanh hai ý đó.

---

## 1. Yêu cầu cấp VPS

### 1.1 Cấu hình

| Hạng mục | Yêu cầu | Lý do |
|---|---|---|
| vCPU | 4 | Runner Node + crawler + agent Hermes chạy song song |
| RAM | 8 GB (tối thiểu 4 GB) | `data/` nạp 90 MB vào bộ nhớ mỗi tiến trình; agent + benchmark chạy cùng lúc |
| Đĩa | 40 GB SSD | Repo + kho HTML thô đã tải (giữ lại để không tải lại) + log 90 ngày + snapshot |
| Hệ điều hành | Ubuntu 24.04 LTS | Node 22 cài từ NodeSource, không cần Docker |
| Vùng | Singapore hoặc Việt Nam | Nguồn cào là site VN (vbpl.ts24, luatvietnam, moit.gov.vn); từ EU/US hay bị chặn hoặc chậm |
| IP | Tĩnh, IPv4 | Đăng ký allowlist nếu sau này nguồn nào yêu cầu |
| Mạng ra | Không hạn chế | Cào web + gọi nhiều API LLM |
| Mạng vào | **Chỉ SSH** (port đổi, chỉ khóa, tắt password) | Máy này không phục vụ ai; giai đoạn 3 mới mở 443 cho ERP |
| Sao lưu | Snapshot ngày, giữ 7 bản | `data/` là file JSON, mất là mất công tháng |
| Chi phí ước | 10 đến 20 USD/tháng (Hetzner CX32, Vultr/DigitalOcean SG 8 GB) | Cộng 5 đến 10 USD/tháng cho provider LLM trả phí làm sàn |

### 1.2 Tài khoản và quyền

- User `hsagent` không root, sudo chỉ cho `systemctl restart hs-agent*`.
- Thư mục: `/srv/hs-code-api` (bản clone), `/srv/hs-agent` (runner, hàng đợi, log), `/srv/hs-raw` (HTML thô đã tải, không vào git), `/srv/hs-private` (`oz-export`, chỉ user `hsagent` đọc, `chmod 700`).
- Bí mật đặt ở `/etc/hs-agent/env` (`chmod 600`, root:hsagent), nạp bằng `EnvironmentFile=` của systemd. **Không** đặt trong repo, không trong `.bashrc`.
- Công cụ: Node 22, git, python3, curl, jq, ripgrep, cron/systemd timer, fail2ban.

### 1.3 Khóa và tài khoản CEO cấp (dev không tự tạo)

| Khóa | Dùng cho | Phạm vi |
|---|---|---|
| GitHub deploy key (SSH) cho `ozvietnam/hs-code-api` | Runner fetch + push | Chỉ push nhánh tiền tố `agent/*`; `main` bảo vệ bằng branch protection |
| GitHub fine-grained token | Mở PR, đọc issue, comment | Chỉ repo này, quyền `contents:write`, `pull_requests:write`, hết hạn 90 ngày |
| `HS_API_TOKEN` | Runner gọi API prod để đo | Chính token ERP đang dùng hoặc token riêng |
| `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` (free tier), `MINIMAX_API_KEY` (trả phí, sàn) | Chuỗi LLM `lib/llm-tier.js` | Xoay vòng, xem §2.4 |
| Kênh báo cáo | Telegram bot token + chat id (hoặc email SMTP) | Digest ngày |

### 1.4 Tiêu chí nghiệm thu bàn giao máy (dev tự kiểm rồi báo)

```
[ ] ssh hsagent@<ip> bằng khóa, password tắt, port không phải 22
[ ] node -v ≥ 22, git, curl, jq, rg có
[ ] git clone bằng deploy key OK; git push origin agent/smoke-test OK; push main bị từ chối
[ ] cd /srv/hs-code-api && npm ci && npm test → "=== ALL TESTS PASSED ==="
[ ] /etc/hs-agent/env tồn tại, chmod 600, có đủ khóa ở §1.3; `curl /api/health` prod trả 200
[ ] systemctl list-timers | grep hs-agent thấy 3 timer (§2.5)
[ ] Snapshot ngày bật, có thể restore thử một lần
[ ] /srv/hs-private chmod 700, không nằm trong repo, `git check-ignore data/oz-export` OK
```

---

## 2. Thiết kế harness

### 2.1 Nguyên tắc bất biến (in ra, dán cạnh máy)

1. **Agent không ghi `main`.** Mọi đầu ra là commit trên nhánh `agent/<job>/<ngày>` và một PR. Người merge.
2. **Agent chỉ được ghi vào** `data/community/**`, `data/community-parked/**`, `data/legal-doc-titles.json`, `docs/reports/**` và thư mục nháp của chính nó. Không đụng `lib/`, `api/`, `data/tax.json`, `data/precedents.json`, `data/confusion-pairs.json` (các file gộp do script sinh ra trong bước gate, không do agent viết tay).
3. **Cửa kiểm chạy trước khi tạo PR**, đỏ thì không có PR, chỉ có báo cáo lỗi. Danh sách cửa ở §2.3.
4. **Thà 0 bản ghi còn hơn 1 bản ghi sai.** Mỗi bản ghi phải có `url` đã mở được và số hiệu văn bản. Không suy ra mã từ trí nhớ mô hình.
5. **Riêng tư.** Không tên doanh nghiệp, mã số thuế, số tờ khai trong data cộng đồng (`lib/privacy-filter.js` chặn cứng). `oz-export` không bao giờ rời `/srv/hs-private`, không vào git, không vào prompt gửi provider ngoài trừ khi CEO cho phép từng job.
6. **Ngân sách cứng** mỗi job: số request LLM, số lượt tải, thời gian. Hết là dừng và báo, không "làm cho có".
7. **Công tắc tắt**: file `/srv/hs-agent/STOP` tồn tại thì mọi timer bỏ qua.
8. **Mọi trích dẫn GIR đi qua `lib/gir.js`** (rule bất biến #6). Agent chỉ ghi `girRuleVi` dạng trích dẫn nguồn, không tự gắn determination.

### 2.2 Kiến trúc

```
systemd timer ──► runner (node /srv/hs-agent/run.mjs <job>)
                     │
                     ├─ 1. fetch: crawler theo nguồn (curl, UA thật, cache vào /srv/hs-raw)
                     ├─ 2. think: bước LLM/agent Hermes với brief cố định + ngân sách
                     ├─ 3. write: ghi file vào vùng được phép, git checkout -b agent/<job>/<date>
                     ├─ 4. gate:  chạy cửa kiểm §2.3, ghi log
                     ├─ 5. ship:  push nhánh + mở PR có bảng kết quả gate (chỉ khi gate xanh)
                     └─ 6. report: digest Telegram/email + dòng vào docs/reports/<tuần>.md
```

- **Runner** là script Node thuần, không phụ thuộc framework agent. Hermes chỉ được gọi ở bước 2 cho các job cần phán đoán; job cào và job đo không cần agent.
- **Hàng đợi** SQLite (`/srv/hs-agent/queue.db`): mỗi job có `state`, `budget_used`, `last_error`, `attempts`. Chạy lại được sau khi máy khởi động lại.
- **Sổ ngân sách token** (`ledger.db`): mỗi provider có trần request/ngày và token/ngày. Router đọc sổ trước khi gọi; provider hết trần thì bỏ qua đúng như `lib/llm-tier.js` bỏ qua provider thiếu key.
- **Kho thô** `/srv/hs-raw/<domain>/<hash>.html`: mọi trang đã tải giữ lại kèm ngày. Agent đọc từ kho trước, chỉ tải khi chưa có hoặc quá 30 ngày. Đây là cái giúp không bao giờ phải "quét lại từ đầu".

### 2.3 Cửa kiểm (gate) — dùng script sẵn có trong repo

| Thứ tự | Lệnh | Chặn gì |
|---|---|---|
| 1 | `node scripts/validate-community.mjs` | Schema, riêng tư (tên DN, MST, số tờ khai) |
| 2 | `node scripts/audit-community-precedents.mjs --dir data/community/tb-tchq --fetch 10` | Mã không có trong biểu thuế, số hiệu lạ, cùng số hiệu hai mã, url không khớp; mở ngẫu nhiên 10 url xác nhận |
| 3 | `node scripts/park-old-tariff-precedents.mjs` → `dedupe-community-precedents.mjs` → `merge-community.mjs` | Tách mã biểu cũ, khử trùng, gộp |
| 4 | `node scripts/build-confusion-pairs.mjs …` (job mâu thuẫn) | Mã sống, alias không chung, id trùng |
| 5 | `node scripts/apply-verified-titles.mjs --dry-run` (job pháp luật) | Khóa không khớp index |
| 6 | `npm test` | 38 bộ test, kể cả public-access và GIR |
| 7 | `npm run bench:delta` | Tìm kiếm không giảm ở mức nào trên 763 tờ khai giữ riêng |
| 8 | `node scripts/accuracy-benchmark.mjs` (đêm, cần key LLM) | Đúng 8 số của `/api/suggest` không giảm |

Gate 7 và 8 đỏ thì PR vẫn mở nhưng gắn nhãn `needs-review` và ghi rõ mức nào giảm bao nhiêu; các gate 1 đến 6 đỏ thì không mở PR.

### 2.4 Chuỗi LLM và token free

- Dùng lại `lib/llm-tier.js`: Gemini → Hermes → MiniMax → OpenRouter. Trên VPS thêm hai tầng free trước MiniMax: Groq (`llama-3.3-70b`), OpenRouter `:free`. MiniMax hoặc Gemini Flash trả phí là **sàn**: job nào cũng phải xong được dù free 429 cả ngày.
- Tầng dùng theo việc: đề xuất nhóm 4 số và tóm tắt văn bản dùng free; xếp hạng cuối và soạn mục mâu thuẫn dùng tier `premium`.
- Sổ ngân sách: mỗi provider free đặt trần bằng 80 % hạn mức công bố, reset 00:00 UTC. Vượt 429 hai lần liên tiếp thì đánh dấu provider "nghỉ" 1 giờ.
- Mọi lệnh gọi ghi `provider, model, tokens, ms, job` vào ledger để cuối tuần biết chi phí thật và provider nào đáng tin.

### 2.5 Danh mục job v1 (đủ dùng trước khi cần Hermes)

| Job | Lịch | Nguồn | Đầu ra | Ngân sách |
|---|---|---|---|---|
| **J1 legal-watch** | ngày 07:00 VN | luatvietnam (danh mục mới), moit.gov.vn (QĐ-BCT chống bán phá giá/tự vệ), vbpl.vn, congbao.chinhphu.vn | PR thêm entry `legal-doc-titles.json` + đánh dấu EXPIRED/REPLACED cho văn bản bị thay | 60 lượt tải, 20 lượt LLM |
| **J2 precedent-crawl** | tuần, thứ Bảy | vbpl.ts24 (`/support/search/solutions?term=`, phân trang), bikipxuatnhapkhau (26 trang), thuvienxuatnhapkhau, thutucxuatnhapkhau, caselaw `/van-ban-phap-luat/<id>` theo dải id | PR tệp `data/community/tb-tchq/agent-<tuần>.json` đã qua gate 1 đến 3 | 400 lượt tải, 100 lượt LLM |
| **J3 bench-night** | ngày 02:00 VN | repo `main` + `/srv/hs-private/oz-gold-final.jsonl` | Dòng vào `docs/reports/`, cảnh báo nếu mức nào giảm > 0,5 điểm so với 7 ngày trước | không LLM (bench:delta), 763 lượt LLM (accuracy) |
| **J4 query-learn** | tuần, Chủ nhật | `ml-log.jsonl` + `feedback.jsonl` + `access-log.jsonl` được prod đẩy về (§2.6) | PR đề xuất alias/từ điển cho truy vấn không có kết quả hoặc bị giám đốc sửa, kèm bench:delta | 50 lượt LLM |
| **J5 freshness** | tuần | `scripts/check-freshness.mjs` (đang chạy trên GitHub Actions) | Chuyển về VPS để có thể tự mở PR sửa thay vì chỉ đỏ | không LLM |

Job cần Hermes (giai đoạn 2): **J6 confusion-from-precedents** (dựng mục mâu thuẫn từ tiền lệ mới theo brief đợt 5), **J7 decision-table-draft** (soạn nháp bảng quyết định cho nhóm có ≥ 3 cụm tờ khai Oz, qua `acceptanceGate`), **J8 audit-fixer** (xử lý cảnh báo của gate 2: tìm ngày còn thiếu, đối chiếu mã cũ sang mã mới có dẫn chứng).

### 2.6 Vòng học từ truy vấn thật (điểm cần dev prod phối hợp)

Hiện `appendSuggestLog` và `feedback` ghi vào `data/*.jsonl` trên Vercel, mất sau mỗi cold start. Để J4 có dữ liệu:

- Cách 1 (ít việc nhất): thêm `LOG_SINK_URL` vào `lib/ml-log.js` và `lib/feedback-store.js`; khi có biến này thì `fetch(POST)` từng dòng sang VPS (`https://<vps>/ingest`, Bearer riêng). VPS chỉ mở 443 cho endpoint này, ghi vào `/srv/hs-agent/logs/YYYY-MM.jsonl`.
- Cách 2: Vercel Log Drain về VPS, lọc theo prefix dòng log.

Dữ liệu này có mô tả hàng của khách ERP, xếp vào loại riêng tư như `oz-export`: không vào git, không vào prompt gửi provider ngoài trừ khi đã bỏ tên doanh nghiệp.

### 2.7 Quan sát và báo cáo

- Mỗi job: log riêng `/srv/hs-agent/logs/<job>/<date>.log`, giữ 90 ngày.
- Digest ngày 08:00 VN qua Telegram: job nào chạy, bao nhiêu bản ghi mới, gate nào đỏ, token đã dùng theo provider, PR nào đang chờ merge.
- Báo cáo tuần tự sinh: `docs/reports/<năm>-W<tuần>.md` (commit qua PR), có bảng số liệu kho (mã, thông báo, mục mâu thuẫn, văn bản verify) và benchmark 7 ngày.
- Cảnh báo tức thì: đĩa > 85 %, job lỗi 3 lần liên tiếp, provider trả phí vượt ngân sách tháng.

### 2.8 Lộ trình

| Giai đoạn | Việc | Ai | Xong khi |
|---|---|---|---|
| 1 (tuần 1) | Cấp VPS, checklist §1.4; Claude viết `run.mjs`, ledger, J1/J2/J3/J5 bằng script sẵn có | dev server + Claude | Mỗi job chạy đúng lịch một tuần, PR đầu tiên được merge |
| 2 (tuần 2–3) | Ingest log prod (§2.6); J4; cắm Hermes cho J6/J7/J8 với brief đợt 5 làm mẫu | dev prod + Claude | Một PR do Hermes tạo qua đủ gate |
| 3 (khi cần) | Chuyển 4 endpoint LLM sang VPS theo `docs/server-nha.md`, tách tiến trình API và job nền, mở 443 | dev server | ERP gọi VPS, Vercel chỉ còn CDN tĩnh |

### 2.9 Những gì Claude giao sẵn khi máy có

- `hs-agent/run.mjs`, `queue`, `ledger`, `providers.json` (trần hạn mức), `jobs/*.yaml`.
- Brief từng job (viết lại từ `scratchpad/BRIEF-tbtchq.md`, `BRIEF-confusion.md` và các brief đợt 5 đã dùng thật).
- Unit systemd mẫu: `hs-agent@.service` + `hs-agent-<job>.timer`.
- Script nghiệm thu `hs-agent/selfcheck.sh` chạy đúng checklist §1.4.

---

## 3. Việc dev quản trị cần trả lời trước khi cấp máy

1. Nhà cung cấp và vùng nào (Hetzner không có SG; Vultr/DO có)? Nếu đặt tại VN, có IP tĩnh không?
2. Snapshot của nhà cung cấp hay rsync về NAS nhà? Ai giữ khóa restore?
3. Muốn quản lý bí mật bằng file `/etc/hs-agent/env` hay có vault sẵn?
4. Kênh báo cáo: Telegram nhóm nào, hay email?

Trả lời xong bốn câu này là dựng được trong một buổi.
