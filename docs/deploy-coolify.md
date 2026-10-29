# Chạy hs-code-api trên Coolify (server nhà) — thay Vercel

CEO chốt 29/09/2026: bỏ Vercel, chạy trên Coolify của server nhà. GitHub
`ozvietnam/hs-code-api` vẫn là nguồn sự thật; Coolify build từ nhánh `main`.

## 1. Vì sao lợi hơn Vercel cho dự án này

| | Vercel | Coolify server nhà |
|---|---|---|
| Ghi dữ liệu (feedback, audit, snapshot biểu thuế) | FS chỉ đọc → `/api/feedback` luôn 503, vòng học từ sửa sai không chạy | Ổ `/data` bền, ghi được |
| Gọi Hermes | Không tới được LAN → cần mở tunnel (`docs/yeu-cau-mo-cong-hermes.md`) | Cùng LAN với cổng Hermes → gọi thẳng, không cần tunnel |
| Giới hạn thời gian | `maxDuration` 300 s, cold start | Tiến trình chạy liên tục, không cold start |
| Chi phí | Gói Pro | Máy sẵn có |

## 2. Thành phần trong repo

- `server.js` — tiến trình Node thường, không thư viện ngoài. Đọc `rewrites` và
  `headers` từ `routes.json` (cấu hình định tuyến), phục vụ `public/`,
  chạy `api/<tên>.js`. Timeout 300 s. Test: `scripts/test-server.mjs`.
- `Dockerfile` — `node:22-alpine`, `npm run build` (như `buildCommand` cũ),
  `HS_DATA_DIR=/data`, healthcheck `/api/health`, cổng 3000.
- Chạy tay không cần Docker: `PORT=3000 HS_DATA_DIR=/srv/hs-data node server.js`.

## 3. Tạo ứng dụng trên Coolify

1. **New Resource → Application → GitHub**, repo `ozvietnam/hs-code-api`, nhánh `main`,
   Build Pack **Dockerfile**, cổng **3000**. Bật **Auto Deploy** khi có push vào `main`.
2. **Persistent Storage**: gắn một volume vào `/data`.
3. **Health check**: đường dẫn `/api/health`.
4. **Biến môi trường** (lấy giá trị từ nơi đang lưu, KHÔNG ghi vào repo):

   | Biến | Ghi chú |
   |---|---|
   | `HS_API_TOKEN`, `HS_ADMIN_TOKEN` | giữ nguyên giá trị đang dùng để ERP không phải đổi |
   | `MINIMAX_API_KEY` | **bắt buộc** — nhà cung cấp chính (gói MiniMax trả phí, gọi thẳng) |
   | `MINIMAX_MODEL` | mặc định `MiniMax-M2.7-highspeed`; gói không cho thì tự lùi `MiniMax-M2.7` |
   | `DEEPSEEK_API_KEY` (tuỳ chọn `DEEPSEEK_MODEL`, mặc định `deepseek-chat`) | dự phòng thứ hai: DeepSeek gọi thẳng `api.deepseek.com` (CEO chốt 17/10/2026) — không nhận dữ liệu khách (ngoài `LLM_NO_TRAIN_PROVIDERS`) |
   | `HERMES_BASE_URL`, `HERMES_API_KEY`, `HERMES_MODEL` | dự phòng thứ ba: cổng Hermes trong LAN (như `/etc/hs-agent/env` trên vps-hsagent) |
   | `GEMINI_FREE_KEYS` | tùy chọn — dự phòng cuối khi MiniMax và Hermes đều lỗi |
   | `GEMINI_API_KEY` | khóa trả phí, chỉ dùng khi NV bấm "auto" (tier premium); bỏ trống được. **Với dữ liệu khách** nó là dự phòng hợp lệ thay cho tầng miễn phí |
   | `LLM_NO_TRAIN_PROVIDERS` | mặc định `minimax,gemini` — nhà cung cấp được nhận **dữ liệu khách** (lượt từ khoá dịch vụ `HS_SERVICE_TOKENS`). Hermes/OpenRouter chỉ thêm khi CEO xác minh họ không huấn luyện trên dữ liệu; mẫu `:free` luôn bị chặn. Hết nhà cung cấp hợp lệ → `NO_PRIVATE_LLM`, không rơi xuống Gemini miễn phí. `GET /api/health` → `llm.private` |
   | `ZAI_RIENG_TU_HIEU_MODEL` | mặc định `on` (CEO chốt 29/10/2026, #546) — lượt khoá dịch vụ (dữ liệu khách) chỉ gửi **nhãn hiệu + model** sang z.ai để tra web (không tên hàng, không mô tả, không URL); z.ai KHÔNG thuộc `LLM_NO_TRAIN_PROVIDERS`. `off` = đóng khẩn (lượt riêng tư không tra web) |
   | `HS_LLM_PRIVATE_ALL` | `true` → mọi lượt (kể cả công khai) coi là dữ liệu khách; mặc định tắt |
   | `LLM_PRICE_TABLE` | tuỳ chọn (#547) — JSON ghi đè bảng giá dùng để **đếm** chi phí LLM lượt công khai, đơn vị USD / 1 triệu token, vd `{"minimax/MiniMax-M2.7-highspeed":{"vaoUsdMoiTrieu":0.3,"raUsdMoiTrieu":1.2},"hermes/deepseek-chat":{"vaoUsdMoiTrieu":0,"raUsdMoiTrieu":0}}`. Khoá = `<provider>/<model>` như trong `usage`. Bảng mặc định ở `lib/llm-cost.js` (giá MiniMax M2.7 là **ước lượng** vì trang giá MiniMax không còn niêm yết M2.x — nên ghi đè bằng số thật của gói). Xem tổng theo ngày: `GET /api/admin/llm-cost?ngay=YYYY-MM-DD` (Bearer). Chỉ đếm, không chặn; `HS_PUBLIC_LLM=false` vẫn là công tắc đóng khẩn |
   | `HS_LLM_COST_RETENTION_DAYS` | tuỳ chọn, mặc định `400` — `npm run logs:prune` cắt `llm-cost-public.jsonl` cũ hơn số ngày này |

5. Gắn tên miền tạm, ví dụ `hs-kb-moi.uythacnhapkhau.com`, qua Cloudflare (tunnel hoặc
   bản ghi DNS trỏ về proxy của Coolify).

## 4. Chuyển đổi an toàn

1. Chạy song song: Vercel vẫn phục vụ `hs-kb`, Coolify ở tên miền tạm.
2. Kiểm trên tên miền tạm:
   - `GET /api/health` → `llm.fallbacks` có `hermes`.
   - `node scripts/bench-prod.mjs --url=https://hs-kb-moi... --input=data/bench/erp-titles-synth.jsonl`
     — so với Vercel cùng bộ đo; không được kém hơn.
   - `POST /api/feedback` → `200` (không còn `503`).
3. Đổi `hs-kb.uythacnhapkhau.com` trên Cloudflare sang Coolify. ERP không phải đổi gì.
4. Giữ Vercel 7 ngày làm đường lùi (đổi DNS về là xong).
5. Sau 7 ngày ổn định: ngắt Git integration và xoá project Vercel; xoá các khoá
   Vercel-only (`functions`, `buildCommand`, `outputDirectory`) khỏi `vercel.json` hoặc đổi
   tên file cấu hình định tuyến; cập nhật CLAUDE.md, README.
   **✅ Phía mã đã xong 09/10/2026:** `vercel.json` → `routes.json` (chỉ còn `rewrites` + `headers`),
   `server.js` đọc `routes.json`, bỏ script Vercel Blob và `VERCEL_SHARE`, sửa CLAUDE.md/README.
   Còn lại là việc trên dashboard Vercel: xoá project (cần chủ tài khoản bấm xác nhận).

## 4b. Xả lượt khi deploy — không giết `/api/classify` đang chạy (#418, 23/10/2026)

`/api/classify` mất 2–5 phút/món. Mỗi commit vào `main` làm thay container; nếu container cũ bị `docker stop`
với mặc định 10 giây thì mọi lượt đang chạy dở chết (khách thấy "không kết nối được", Cổng hoàn điểm, ERP thử lại tốn tiền).

**Phía mã (đã có từ #418):**
- `server.js` đếm lượt đang chạy (`lib/inflight.js`). Nhận `SIGTERM`/`SIGINT` → **dừng nhận lượt mới** (`server.close`),
  `GET /api/health` trả **503 `status: draining`** để healthcheck/LB ngừng đưa lượt mới, rồi **chờ lượt đang chạy xong**
  tối đa `HS_DRAIN_MS` (mặc định 330 000 ms = trần request 300 s + dư) mới `exit 0`. Log ghi "chờ N lượt" và "đã xả hết sau X ms".
- `GET /api/health` → `checks.engine.inflight` (số lượt đang chạy) + `checks.engine.draining`.

**Phía máy chủ (.120) — phải làm, mã trong repo không tự làm được:**
1. `deploy-safe.sh`: dừng container cũ bằng **`docker stop -t 360 hs-code-api`** (Coolify: *Stop timeout* / `stop_grace_period: 360s`).
   Mặc định 10 s thì server chỉ kịp xả 10 s rồi bị `SIGKILL`.
2. **Bỏ dòng `cp -f "$DEPLOY"/server.js`** trong `deploy-safe.sh` (xem cảnh báo mục biến môi trường ở dưới): lớp bọc đè
   `server.js` của repo thì cơ chế xả ở trên **không chạy trên prod**.
3. Thứ tự khuyến nghị: kéo image mới → `docker run` container mới ở cổng tạm, chờ `/api/health` 200 → đổi cổng/route →
   `docker stop -t 360` container cũ. Chưa làm được blue-green thì ít nhất giữ bước 1–2.
4. Tuỳ chọn giảm số lần thay container: commit **chỉ dữ liệu** (`data/so-tay`, `plhq-sync`, `docs/`) gom deploy theo khung giờ
   (vd mỗi giờ hoặc ban đêm) thay vì mỗi commit — 22–23/10 có ≥ 15 commit/17 giờ.

Nghiệm thu: bắt đầu một lượt classify, gộp một commit nhỏ vào `main` giữa chừng → lượt vẫn xong; `docker logs` có dòng "chờ N lượt".

## 5. Lưu ý

- `coolify-host` là VM trên node `pve` (192.168.1.100). Quy tắc hạ tầng: node cũ chỉ
  quan sát; việc tạo ứng dụng trong Coolify là thao tác cấp ứng dụng, cần CEO duyệt.
- Dữ liệu đã ghi ở `/data` được ưu tiên đọc trước `data/` trong image
  (`lib/data-paths.js`). Snapshot biểu thuế sửa qua admin sẽ nằm ở `/data` và che bản
  trong repo cho tới khi xoá — đồng bộ lại vào GitHub định kỳ.
- Sao lưu volume `/data` theo lịch sao lưu của server.

## Biến môi trường trên máy chủ .120 (ghi 07/10/2026)
`/opt/hs-code-api/deploy-safe.sh` build bằng **Dockerfile riêng** ở `/opt/hs-code-api/deploy/` (đè Dockerfile trong repo) và chạy container với `--env-file /opt/hs-code-api/hs.env`. Vì vậy `ENV` trong Dockerfile của repo **không có tác dụng trên máy chủ**; muốn đổi biến (vd `HS_CLASSIFY_ENGINE=loop|legacy`, `LLM_STEP_*`) thì sửa `hs.env` rồi chạy `deploy-safe.sh main --force` để tạo lại container. Bản 07/10: `HS_CLASSIFY_ENGINE=loop` (động cơ hai vòng + chốt chặn).

⚠ **deploy-safe.sh còn đè cả `server.js` + `entrypoint.sh`** bằng lớp bọc ở `/opt/hs-code-api/deploy/` (viết 15/09, trước khi repo có `server.js` riêng). **Sự cố 09/10/2026:** #169 gỡ `vercel.json` → `routes.json`, lớp bọc vẫn đọc `vercel.json`, nuốt lỗi → **0 rewrite, mọi đường `/api/declaration-sheet`, `/api/demand`, `/api/precedents`… trả 404** trên prod ~25 phút (ERP không lập được phiếu). Đã vá lớp bọc đọc `routes.json` (dự phòng `vercel.json`, thiếu cả hai thì dừng hẳn) + `deploy-safe.sh main --force`. Việc đúng cho team: **bỏ dòng `cp -f "$DEPLOY"/server.js` trong deploy-safe.sh** để chạy `server.js` của repo (đã tương đương: rewrites + headers + public/ + timeout), chỉ giữ Dockerfile/entrypoint overlay; trước khi bỏ, so hai file một lần. Kiểm nhanh sau mỗi deploy: `docker logs hs-code-api | grep "rewrites"` và `POST /api/declaration-sheet` với `{}` phải **400** (404 = mất rewrite).

## 6. Postgres cho hs-code-api (L0g, #545 — CEO chốt 29/10/2026)

hs-code-api lần đầu có Postgres (`lib/db.js`, migration ở `db/migrations/`). Bảng đầu tiên là `rui_ro_phan_loai`
(Danh mục rủi ro phân loại QĐ 2079 — tín hiệu **nội bộ**, không phải căn cứ pháp lý). Sau này L1-7a (phản hồi loại 5) dùng lại.

**Thiếu `HS_DATABASE_URL` thì service vẫn chạy như cũ** — tính năng dùng DB tự tắt, `GET /api/health` báo
`checks.db: "CHUA_CAU_HINH"`. Vì vậy deploy mã trước, dựng DB sau, không cần làm cùng lúc. Gỡ biến = tắt lại.

**Mô hình:** dùng **máy Postgres sẵn có của Cổng ozplugin**, tạo **database riêng + người dùng riêng** cho hs-code-api.
hs-code-api không đọc được bảng của Cổng và ngược lại (không dùng chung bảng, không dùng chung người dùng).

### 6.1. Tạo database + người dùng (người có quyền Coolify làm, một lần)

1. Coolify → project của Cổng → resource **PostgreSQL** của Cổng → tab **Terminal** (hoặc trên máy chủ:
   `docker exec -it <container-postgres-của-cổng> psql -U <superuser>` — superuser xem ở tab *General* của resource,
   thường là `postgres`). Ghi lại tên database và người dùng Cổng đang dùng (tab *General*), gọi là `<db_cong>`, `<user_cong>`.
2. Tạo mật khẩu mạnh cho hs-code-api (vd `openssl rand -base64 32 | tr -d '/+=' | cut -c1-32` — chỉ chữ + số để khỏi
   phải mã hoá URL). **Không** dán mật khẩu vào issue/chat; lưu ở nơi đang lưu các khoá khác.
3. Trong `psql` (đăng nhập superuser), chạy — thay `<...>`:

   ```sql
   CREATE ROLE hs_code_api LOGIN PASSWORD '<mật-khẩu-mạnh>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
   CREATE DATABASE hs_code_api OWNER hs_code_api;
   -- DB mới: chỉ chủ (hs_code_api) kết nối được.
   REVOKE ALL ON DATABASE hs_code_api FROM PUBLIC;
   -- DB của Cổng: cấp rõ cho người dùng Cổng TRƯỚC, rồi mới thu quyền mặc định của PUBLIC
   -- (thứ tự này để Cổng không mất kết nối dù <user_cong> không phải chủ DB).
   GRANT CONNECT ON DATABASE <db_cong> TO <user_cong>;
   REVOKE CONNECT ON DATABASE <db_cong> FROM PUBLIC;
   ```

   Nếu Cổng còn người dùng khác cần vào `<db_cong>` (vd người dùng sao lưu), `GRANT CONNECT` cho họ trước dòng `REVOKE`.
4. Kiểm tách quyền (cả hai lệnh dưới phải báo `User does not have CONNECT privilege`; Cổng vẫn chạy bình thường):

   ```bash
   psql "postgres://hs_code_api:<mk>@<host>:5432/<db_cong>" -c 'select 1'     # hs-code-api KHÔNG vào được DB Cổng
   psql "postgres://<user_cong>:<mk_cong>@<host>:5432/hs_code_api" -c 'select 1'  # Cổng KHÔNG vào được DB hs-code-api
   ```

   (Đã thử đúng chuỗi lệnh này trên Postgres 16 cục bộ ngày 29/10: hai chiều đều bị chặn, người dùng Cổng vẫn vào DB của mình.)

### 6.2. Đường mạng từ container hs-code-api tới Postgres

- Container hs-code-api trên .120 chạy bằng `deploy-safe.sh` (`docker run`, xem mục *Biến môi trường trên máy chủ .120*),
  không phải ứng dụng do Coolify quản lý. Muốn dùng địa chỉ nội bộ của resource Postgres (Coolify → resource → *Internal URL*,
  host dạng `<uuid>` trên mạng docker `coolify`), container phải ở cùng mạng: thêm `--network coolify` vào lệnh `docker run`
  trong `deploy-safe.sh` (hoặc sau mỗi lần tạo container: `docker network connect coolify hs-code-api`).
- Nếu Postgres của Cổng ở máy khác .120: bật *Public Port* cho resource nhưng **chỉ mở trong LAN** (tường lửa chặn từ ngoài),
  dùng `<ip-LAN>:<cổng-public>`. Không mở Postgres ra Internet.
- Kiểm từ trong container: `docker exec hs-code-api node -e "const d=require('./lib/db');d.trangThaiDb().then(s=>{console.log(s);return d.dongPool()})"` → `OK`.

### 6.3. Đặt biến môi trường cho hs-code-api

Thêm vào `/opt/hs-code-api/hs.env` (máy .120; nếu sau này hs-code-api thành ứng dụng Coolify thì thêm ở tab *Environment Variables*):

| Biến | Giá trị / ghi chú |
|---|---|
| `HS_DATABASE_URL` | `postgres://hs_code_api:<mật-khẩu>@<host>:<cổng>/hs_code_api` — không bao giờ in ra log/phản hồi |
| `HS_DATABASE_POOL_MAX` | tuỳ chọn, mặc định `5` kết nối |
| `HS_INTERNAL_CALLERS` | tuỳ chọn, mặc định `erp` — tên khoá dịch vụ (trong `HS_SERVICE_TOKENS`) được nhận tín hiệu rủi ro nội bộ. **Không thêm `cong-oz`** (mã chặn cứng: Cổng phục vụ khách ngoài) |
| `HS_QD2079_FILE` | tuỳ chọn, đường dẫn tệp QĐ 2079 **trong container** khi có tệp (mục 6.5) |

Rồi tạo lại container: `deploy-safe.sh main --force`.

### 6.4. Chạy migration (sau mỗi lần thêm tệp `db/migrations/*.sql`)

```bash
docker exec hs-code-api npm run db:migrate
# lần đầu: "đã chạy 0001_rui_ro_phan_loai.sql" / "migration: chạy mới 1, đã có từ trước 0"
docker exec hs-code-api npm run db:migrate   # chạy lại: "chạy mới 0" (idempotent)
curl -s https://hs-kb.uythacnhapkhau.com/api/health | jq .checks.db   # → "OK"
```

Migration chỉ thêm (`CREATE … IF NOT EXISTS`), không xoá bảng/dữ liệu; mỗi tệp chạy trong một giao dịch.

### 6.5. Nạp QĐ 2079 (khi CEO có tệp — hiện **chưa có**)

Tệp là dữ liệu riêng (bản bên thứ ba): **không bao giờ để trong repo hay gửi vào git**. Định dạng: mảng JSON
`[{ "maA": "3926.90.99", "maB": "3923.10.90", "tenHang": "...", "ghiChu": "..." }]` (mã 4–8 chữ số, dấu chấm được bỏ).

1. Trên máy chủ: `mkdir -p /srv/hs-private && chmod 700 /srv/hs-private`, chép tệp vào `/srv/hs-private/qd-2079.json`, `chmod 600`.
2. Gắn chỉ-đọc vào container: thêm `-v /srv/hs-private:/srv/hs-private:ro` vào `docker run` trong `deploy-safe.sh`,
   đặt `HS_QD2079_FILE=/srv/hs-private/qd-2079.json` trong `hs.env`, `deploy-safe.sh main --force`.
3. Kiểm thử không ghi: `docker exec hs-code-api node scripts/nap-qd2079.mjs --dry-run` → `dry-run doc=… hopLe=… loi=…`.
4. Nạp thật: `docker exec hs-code-api node scripts/nap-qd2079.mjs` → `doc=… hopLe=… loi=… themMoi=… trung=…`.
   Chạy lại an toàn (trùng thì bỏ qua). Script chỉ in số đếm + 16 ký tự đầu sha256, không in tên hàng.
5. Ghi **số đếm** (không nội dung) vào issue #545. Kỳ vọng ≈ 896 cặp.

Script từ chối tệp nằm trong một cây git mà không bị `.gitignore` chặn. Chạy tại máy dev thì để tệp ở `data/private/`
(đã ignore) hoặc ngoài repo.

### 6.6. Sao lưu + gỡ

- Đưa database `hs_code_api` vào lịch sao lưu của resource Postgres (Coolify → resource → *Backups*, chọn thêm database này).
- Tắt khẩn: xoá `HS_DATABASE_URL` khỏi `hs.env` + tạo lại container → mọi tính năng DB tắt, service chạy như trước L0g.
- Thu hồi hẳn (CEO duyệt — xoá dữ liệu): `DROP DATABASE hs_code_api; DROP ROLE hs_code_api;` từ superuser.
