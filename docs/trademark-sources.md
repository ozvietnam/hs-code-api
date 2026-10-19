# Nguồn dữ liệu nhãn hiệu cho Trademark Watch (VN nhập + TQ xuất)

Tool `lib/trademark-watch.js` cảnh báo 2 trục: **VN nhập** (TCHQ) + **TQ xuất** (GACC).
Cảnh báo chỉ tin cậy khi có **dữ liệu thật**. Tài liệu này liệt kê các nguồn hợp pháp và cách nạp.

Từ 10/2026 có **2 tầng dữ liệu**:
- **Tầng chính — API OZ SHTT** (`lib/shtt-client.js`, biến `OZ_SHTT_URL`): kho nhãn hiệu VN
  đầy đủ (robot đang tải, đích ~978k) + tra chữ/tra ảnh, trả **đèn tín hiệu** 🟡/🟢/⚪ (ADR-0010).
  Nguồn chính khi đã cấu hình — xem mục **0**.
- **Tầng dự phòng — watchlist nội bộ** (`data/trademark-watch.json`): giữ để bắt nhãn công
  nghiệp hay bị giả + chạy khi chưa cấu hình/không gọi được OZ SHTT.

> ⚠️ **Đèn hiện chỉ là THAM KHẢO, CHƯA có đèn 🔴 ĐỎ.** v1 trần ở 🟡 VÀNG: đèn đỏ chỉ đặt khi
> có đăng ký **giám sát hải quan** (VN/TQ) — nguồn recordal đó chưa có (mục 2, 4, 6), nên không
> món nào được gắn đỏ. 🟢 XANH chỉ chắc khi kho đã tải gần đủ (kèm `scope.coverage`).

## 0. OZ SHTT API — nguồn đèn tín hiệu chính ⭐ (MỚI 10/2026)

- Repo: `oz-shtt` (Gitea `oz/oz-shtt`). Dịch vụ `oz-shtt-api` chạy trên **oz-brain 192.168.1.124**.
- hs-code-api gọi `GET /v1/check?brand=&hs=<8 số>&origin=&importer=&seller=&depth=` qua
  `lib/shtt-client.js`. Hợp đồng dữ liệu: `oz-shtt/packages/shared/src/check.ts`
  (`CheckResult`: `level` RED/YELLOW/GREEN/UNKNOWN, `reasons`, `evidence`, `scope.coverage`, `disclaimer`).
- Cấu hình (env của hs-code-api):
  ```bash
  OZ_SHTT_URL=http://192.168.1.124:3010   # trống = tắt → rơi về watchlist nội bộ
  OZ_SHTT_API_KEY=<khoá x-api-key cấp cho hs-code-api>
  OZ_SHTT_TIMEOUT_MS=1500                  # chờ tối đa; quá giờ → bỏ đèn, KHÔNG chặn tra HS
  ```
- **An toàn:** oz-shtt im lặng / lỗi / chưa cấu hình → hs-code-api vẫn tra/ phân loại HS bình
  thường, chỉ bỏ phần đèn (tự rơi về watchlist nội bộ). Không bao giờ làm hỏng luồng tra HS.
- **Nguồn gốc dữ liệu của oz-shtt:** WIPO Publish VN (NOIP) + CNIPA (mở dữ liệu nhãn TQ, gồm ảnh
  logo). Recordal hải quan (đèn đỏ) vẫn chưa có nên oz-shtt cũng trần ở vàng.
- **Hạ tầng còn mở (HỎI CEO trước — dịch vụ đang phục vụ khách):** `oz-shtt-api` đang bind
  `127.0.0.1` trên oz-brain → hs-code-api (.120) chưa gọi LAN được. Cần đổi `HOST=0.0.0.0`,
  thêm 1 API key cho hs-code-api vào `API_KEYS`, mở cổng 3010 cho `192.168.1.0/24`, rồi restart.

## ⚠️ Vướng mắc môi trường (đọc trước)

Sandbox **Claude Code on the web** chặn outbound tới host ngoài allowlist
(`Host not in allowlist` cho cả `node fetch` lẫn WebFetch). Vì vậy **không chạy
ingest tự động từ trong session web được**. Ba cách gỡ:

1. **Chạy ở máy/CI mạng mở** (khuyến nghị) — clone repo, chạy script ingest dưới đây, commit.
2. **Đổi network policy của environment** để allowlist các host. Cách làm (Claude Code on the web):
   - Mở environment để chỉnh (biểu tượng cloud nơi tạo session/routine) → mục **Network access**.
   - Chọn **Custom** → ô **Allowed domains** hiện ra → nhập mỗi dòng 1 domain:
     ```text
     www.tmdn.org
     tmdn.org
     haiguanbeian.com
     www.haiguanbeian.com
     branddb.wipo.int
     *.wipo.int
     api.euipo.europa.eu
     auth.euipo.europa.eu
     ```
   - Tick **"Also include default list of common package managers"** (giữ npm/github).
   - ⚠️ Áp dụng cho **session MỚI** — sau khi lưu, mở session mới rồi yêu cầu chạy:
     `npm run data:ingest-tmview -- --all` (TMview, phủ CN+VN). GACC nạp qua `--gacc` (xuất file từ haiguanbeian.com).
3. **Xuất file thủ công** từ portal rồi nạp qua `--customs/--wipo/--gacc` (offline-safe, luôn chạy được).
4. **Cào đêm từ máy VN** theo đơn đặt hàng `docs/giao-viec/shtt-cao-dem.md` (script `scripts/shtt/cao-*.mjs`,
   cổng kiểm `npm run shtt:kiem`), rồi nạp qua `--ipvietnam` — xem mục 6 (kết quả đợt 16-17/10/2026).

---

## 1. TMview (EUIPO) — phủ CẢ Trung Quốc + Việt Nam ⭐

- Web: https://www.tmdn.org/tmview/ — gộp ~90tr nhãn / 75 cơ quan, gồm **CNIPA (TQ, 32tr+)**
  và **IP Vietnam**. Miễn phí, không cần đăng ký.
- Nạp tự động (1 lệnh, phủ 2 pháp tài):
  ```bash
  node scripts/ingest-tmview.mjs --brands "Kamoer,VPOWER"   # tra danh sách nhãn
  node scripts/ingest-tmview.mjs --all                       # tra mọi nhãn trong watchlist
  node scripts/ingest-tmview.mjs --brands "Kamoer" --dry-run # xem request, không ghi
  ```
- Set: `owner`, `status`, `niceClasses`, `registrations[]` (theo office), `verified=true`, `source=tmview`.
- **Lưu ý:** TMview = ĐĂNG KÝ tại registry, KHÔNG phải recordal hải quan. Không tự bật
  `customsRecorded`/`gaccRecorded`.

### Phương án API chính thức (ổn định hơn, cần khoá)
- EUIPO Trademark Search API: https://dev.euipo.europa.eu/product/trademark-search_100
  — OAuth2 client_credentials (Client ID/Secret). Dùng khi cần SLA/ổn định lâu dài.

## 2. GACC — recordal Hải quan Trung Quốc (đúng `gaccRecorded`) ⭐

> ⚠️ **Đính chính (10/2026): `haiguanbeian.com` KHÔNG phải trang chính thức của Hải quan TQ.**
> Cổng tra recordal SHTT chính thức là của GACC: `online.customs.gov.cn` → IP
> **`http://202.127.48.145:8888/`**, và cổng này có **chống bot mạnh** (đợt đo 16/10/2026 ở mục 6
> trả HTTP 412 — Aliyun WAF `$_ts`; CEO cũng ghi nhận lớp chống bot Ruishu) → **không** `fetch`/scrape
> được, phải mở bằng trình duyệt thật rồi **export tay**. `haiguanbeian.com` chỉ là trang trung
> gian/dịch vụ, đừng coi là nguồn dữ liệu hay URL chính thức.

- Cổng chính thức (Online Services của GACC → "Intellectual Property Customs Protection"):
  `online.customs.gov.cn` / `http://202.127.48.145:8888/`.
- **Tra công khai, KHÔNG cần login**: "Query Valid Recordations" → tra theo tên chủ sở hữu, số
  recordal, tên/số quyền, quốc tịch chủ, loại nội dung. Hỗ trợ tra chính xác + mờ.
  (Chống bot chặn tự động → chỉ mở bằng trình duyệt rồi export tay — xem mục 6.)
- Xuất kết quả (mark, recordNo, ipTypes, owner) sang JSON theo mẫu rồi nạp:
  ```bash
  node scripts/ingest-trademark-watch.mjs --gacc data/_src/gacc.json
  ```
  Mẫu `gacc.json`:
  ```json
  [{ "mark": "Kamoer", "recordNo": "T2021-xxxxx", "ipTypes": ["trademark"], "owner": "Kamoer Fluid Tech (Shanghai) Co., Ltd." }]
  ```
- Đây là nguồn DUY NHẤT bật được `cn.gaccRecorded=true` → nâng cảnh báo xuất khẩu TQ lên HIGH/CRITICAL.

## 3. WIPO Global Brand Database (bổ sung)

- Web: https://branddb.wipo.int/ — Dev portal: https://developers.branddb.wipo.int/ (REST/JSON).
- Export JSON theo mẫu rồi nạp:
  ```bash
  node scripts/ingest-trademark-watch.mjs --wipo data/_src/wipo.json
  ```

## 4. TCHQ — danh sách giám sát Hải quan Việt Nam (đúng `customsRecorded`)

- Tổng cục Hải quan công bố "Danh sách nhãn hiệu đăng ký giám sát". Xuất CSV rồi nạp:
  ```bash
  node scripts/ingest-trademark-watch.mjs --customs data/_src/tchq.csv
  ```
  Header CSV: `mark,owner,recordNo,niceClasses,expiry`

---

## Quy tắc trung thực

- Chỉ nguồn được đối chiếu mới đặt `verified=true`.
- `customsRecorded` (VN) ⟵ chỉ từ `--customs`. `cn.gaccRecorded` (TQ) ⟵ chỉ từ `--gacc`.
  Đăng ký registry (TMview/WIPO) KHÔNG ngụ ý có recordal hải quan.
- Mọi cảnh báo là **tư vấn tham khảo, không phải phán quyết hải quan**. Đèn hiện trần ở 🟡 VÀNG —
  **chưa có đèn 🔴 ĐỎ** (đỏ cần recordal hải quan, nguồn chưa có). 🟢 XANH kèm độ phủ kho.
- Thư mục nguồn thô để ở `data/_src/` (gitignore nếu chứa dữ liệu lớn/nhạy cảm).

---

## 5. Nghiên cứu: cổng public nào TỰ THU THẬP được? (test 07/2026)

Đo trực tiếp khả năng với tới từ **sandbox Claude Code on the web** + rà API/điều khoản.
Kết luận ngắn: **các nguồn có ĐÚNG độ phủ CN+VN đều bị sandbox chặn; các nguồn với tới được
thì sai độ phủ, cấm bulk, hoặc chặn bot.** Recordal hải quan (2 bên) **không** có API mở.

### Ma trận reachability (đo từ sandbox)

| Cổng | Dữ liệu | Với tới sandbox? | Tự thu thập? |
|---|---|---|---|
| `www.tmdn.org` (TMview federated) | Registry **CN (CNIPA 32tr) + VN** ⭐ | ❌ HTTP 503 (chặn egress) | ✅ có JSON API (`ingest-tmview.mjs`) — **chỉ khi allowlist** |
| `wipopublish.ipvietnam.gov.vn` | Registry **VN** (NOIP) | ❌ HTTP 503 | ⚠️ API frontend WIPO Publish — chỉ khi allowlist |
| `asean-tmview.org` (gồm VN) | Registry **VN** | ❌ HTTP 503 | ⚠️ chỉ khi allowlist |
| `api.euipo.europa.eu` (Trademark Search) | Registry — **CHỈ EUTM/Madrid EU** | ✅ HTTP 401 (cần OAuth2) | ✅ API chính thức, free key — **NHƯNG không có CN/VN** → vô dụng cho ta |
| `public-api.branddb.wipo.int` (WIPO GBD) | Registry toàn cầu | ✅ HTTP 403 (cần token) | ❌ cần key **+ ToU CẤM bulk/auto-download** |
| `sbj.cnipa.gov.cn` (CNIPA) | Registry **CN** | ✅ HTTP 200 | ⚠️ captcha/anti-bot nặng, chỉ tiếng Trung — rất khó. CNIPA **mở dữ liệu** nhãn TQ (gồm ảnh logo) đã được oz-shtt khai thác (mục 0) |
| `202.127.48.145:8888` (GACC chính thức) | **Recordal hải quan TQ** (`gaccRecorded`) ⭐ | ❌ chống bot (WAF/412) | ❌ **chỉ export tay**. `haiguanbeian.com` **KHÔNG** phải trang chính thức |
| `english.customs.gov.cn` | Trang thông tin GACC (không phải DB tra) | ✅ HTTP 200 | ❌ không có dataset |
| `customs.gov.vn` (TCHQ) | **Danh sách giám sát VN** (`customsRecorded`) ⭐ | ✅ HTTP 200 | ⚠️ danh sách **không** công bố dạng dataset/API — thực tế export tay |

⭐ = tín hiệu giá trị cao nhất.

### Diễn giải
1. **Nguồn quý nhất (recordal hải quan)** — `gaccRecorded` (TQ) & `customsRecorded` (VN) — **KHÔNG bên nào có API/dataset mở**. Đây là hệ thống nộp đơn/tra cứu hành chính → **luôn phải export tay** rồi nạp qua `--gacc` / `--customs`. Không có cách tự động hợp pháp.
2. **Registry CN+VN** — nguồn đúng độ phủ duy nhất, miễn phí là **TMview (tmdn.org)**. API JSON đã có sẵn (`ingest-tmview.mjs`), nhưng sandbox **chặn egress** (503) → **phải allowlist môi trường** (mục "Vướng mắc môi trường" ở đầu file) rồi mở session mới.
3. **API chính thức with tới được nhưng sai việc:** EUIPO Trademark Search API (reachable, free) **chỉ có EUTM/Madrid EU** — không có CN/VN. WIPO GBD **cấm bulk** trong ToU. CNIPA **anti-bot** nặng.

### Khuyến nghị ưu tiên (theo tỉ lệ ăn thua)
1. **Allowlist `www.tmdn.org`** trong Network access của environment → mở session mới → `npm run data:ingest-tmview -- --all`. Đòn bẩy cao nhất cho registry CN+VN. (Tôn trọng rate-limit; TMview cho tra cứu miễn phí, tránh kéo ồ ạt.)
2. **Recordal hải quan: export tay** — VN từ `customs.gov.vn` (danh sách giám sát), TQ từ `haiguanbeian.com` → `data/_src/*.json|csv` → `--customs` / `--gacc`. Không có đường tự động.
3. **Cân nhắc API thương mại bên thứ 3** (Signa/Apify wrapper TMview, MarkerAPI…) nếu cần ổn định + hợp pháp + bỏ được rào sandbox/anti-bot — **tốn phí**, đánh đổi lấy tin cậy.
4. **Bổ sung tay** nhãn công nghiệp hay bị giả (ABB, Siemens, Schneider, Omron, Mitsubishi…) vào watchlist (seed `verified:false`) để bulk bắt được ngay, trong lúc chờ nguồn tự động.

> Test thực hiện 2026-07. HTTP code có thể đổi khi env allowlist thay đổi — đo lại bằng `node` fetch trước khi kết luận.

## 6. Đợt cào đêm 16-17/10/2026 — đo từ máy VN (dev zcode, PR #342, #335)

Chạy từ máy macOS ở VN, mạng mở, Chrome thật, UA `hs-code-api/shtt (ozvietnam, ceo@ozfreight.vn)`,
≤ 1 yêu cầu/giây/nguồn, **không lách captcha/anti-bot, không đổi IP**. Bản thô (558 MB, 4.034 tệp)
để ngoài git (`data/_src/shtt/raw/`, zip 41 MB nhận tay); chỉ số `sha256` nằm trong `data/shtt/raw-index.json`.
Cổng kiểm `npm run shtt:kiem` PASS. Claude kiểm lại sáng 17/10: 10 bản ghi ngẫu nhiên đều có bản thô
khớp sha256 + trang HTML gốc cùng URL; 0 bản ghi lệch danh sách ứng viên; không có dữ liệu khách Oz trong commit.

### Ma trận reachability (đo từ máy VN, 16/10/2026)

| Nguồn (`ma` trong bao-cao) | Dữ liệu | Kết quả từ máy VN | Bản ghi |
|---|---|---|---|
| `vn-ipvietnam-dang-ky` — `wipopublish.ipvietnam.gov.vn` | Registry **VN** (Cục SHTT) | ✅ **OK** — Chrome render được, tra hết 1.246/1.246 ứng viên (ưu tiên 1→3), 0 lỗi mạng | **1.434** đơn khớp chính xác tên (438 nhãn) + 808 nhãn không thấy |
| `vn-tchq-giam-sat` — `customs.gov.vn` | **Giám sát hải quan VN** (`customsRecorded`) ⭐ | ⚠️ LOI — site 200 nhưng **không có danh sách nhãn hiệu giám sát** dạng tra cứu; cổng nộp đơn `pus.customs.gov.vn` cần đăng nhập | 0 — vẫn **export tay** |
| `cn-gacc-beian` — `online.customs.gov.cn` → `202.127.48.145:8888` | **Recordal hải quan TQ** (`gaccRecorded`) ⭐ | ❌ CAPTCHA — HTTP 412 (Aliyun WAF `$_ts`) rồi body rỗng; `customs.gov.cn/ipr/recordation` cùng lớp chặn | 0 — **export tay** từ `haiguanbeian.com` |
| `tmview-cn-vn` — `www.tmdn.org` | Registry **CN + VN** | ❌ CHAN — timeout 20–25 s (IPv4), không có mã HTTP, từ mạng VN | 0 — thử lại từ mạng khác/giờ khác |
| `cn-cnipa-dang-ky` — `sbj.cnipa.gov.cn` → `wcjs.sbj.cnipa.gov.cn` | Registry **CN** | ❌ CHAN — HTTP 403 «请求被阻断», dừng ngay | 0 |

### Dữ liệu `data/shtt/` (đã commit, nhãn nguồn `NGUYEN_VAN`)

- `vn-ipvietnam-dang-ky.jsonl` — mỗi dòng một **đơn**: `nhan`, `soDon` (VN-4-YYYY-NNNNN), `tinhTrang`
  (DANG_KY 780 · DANG_XU_LY 152 · HET_HAN 95 · TU_CHOI 315 · KHAC 92), `tinhTrangGoc`, `ungVien`, `nguon{url,layLuc,sha256}`.
  Trang danh sách WIPO Publish **không có chủ sở hữu và nhóm Nice** → hai trường này còn trống, làm giàu sau từ trang chi tiết.
  92 dòng `KHAC` có `tinhTrangGoc` là số 4 chữ số (1879, 1903…) — parser bắt nhầm ô, coi là trạng thái **không rõ**.
- `khong-tim-thay.jsonl` — 808 ứng viên tra không ra khớp chính xác (tra-không-thấy cũng là dữ liệu).
- `bao-cao.json` — cam kết + trạng thái 5 nguồn; `raw-index.json` — sha256 mọi bản thô.
- Theo ưu tiên: ưu tiên 1 có 88/159 nhãn thấy trên registry VN (76 nhãn có ≥ 1 đơn Cấp bằng); ưu tiên 2: 85/251 (53); ưu tiên 3: 265/836 (209).

### Nạp vào watchlist

```bash
node scripts/ingest-trademark-watch.mjs --ipvietnam data/shtt/vn-ipvietnam-dang-ky.jsonl
```

Gộp mọi đơn của một ứng viên thành một nhãn: `status` = mức cao nhất (Cấp bằng → REGISTERED; chỉ Đang giải
quyết → PENDING; chỉ Hết hạn → EXPIRED; chỉ Từ chối/không rõ → UNKNOWN), khối `vn.soDon` giữ số đơn theo từng
trạng thái + `vn.thamChieu` (url, sha256). Nhãn seed trùng tên (ABB, Siemens, Daikin…) được cập nhật đúng khoá cũ,
giữ `owner`/`niceClasses` seed. **Không** bật `customsRecorded` — đây là registry, không phải recordal.
Đợt 17/10: watchlist 53 → 449 nhãn (REGISTERED 339 · PENDING 37 · EXPIRED 15 · UNKNOWN 58).

> Lưu ý vận hành: nhãn `verified + REGISTERED` chưa có nhóm Nice → `scoreMark` cho **HIGH** với mọi chương HS
> (không hạ bậc vì `classMatch` không xác định). Muốn giảm báo động thì làm giàu nhóm Nice từ trang chi tiết trước.

### Còn lại cho đợt sau
- **Recordal hải quan hai nước = 0 bản ghi** (TCHQ không công bố danh sách; GACC chặn WAF) → vẫn phải export tay rồi
  `--customs` / `--gacc`; số nhãn ưu tiên 1 "có ghi nhận hải quan" hiện **chưa xác định**.
- TMview thử lại từ mạng/giờ khác; CNIPA cần đường hợp pháp khác (không lách anti-bot).
- Làm giàu `owner` + `nhomNice` từ trang chi tiết WIPO Publish (cùng nhịp lịch sự), để hạ báo động sai lớp hàng.

