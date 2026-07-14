# Nguồn dữ liệu nhãn hiệu cho Trademark Watch (VN nhập + TQ xuất)

Tool `lib/trademark-watch.js` cảnh báo 2 trục: **VN nhập** (TCHQ) + **TQ xuất** (GACC).
Cảnh báo chỉ tin cậy khi watchlist được nạp **dữ liệu thật**. Tài liệu này liệt kê các
nguồn hợp pháp và cách nạp.

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

- Hệ thống bảo hộ SHTT Hải quan TQ: **http://www.haiguanbeian.com/**
  (hoặc Online Services của hải quan TQ → "Intellectual Property Customs Protection").
- **Tra công khai, KHÔNG cần login**: link "Query Valid Recordations" → tra theo tên chủ
  sở hữu, số recordal, tên/số quyền, quốc tịch chủ, loại nội dung. Hỗ trợ tra chính xác + mờ.
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
- Mọi cảnh báo là **tư vấn tham khảo, không phải phán quyết hải quan**.
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
| `sbj.cnipa.gov.cn` (CNIPA) | Registry **CN** | ✅ HTTP 200 | ⚠️ captcha/anti-bot nặng, chỉ tiếng Trung — rất khó |
| `haiguanbeian.com` / GACC online | **Recordal hải quan TQ** (`gaccRecorded`) ⭐ | ❌ 403 (private IP) / timeout | ❌ **chỉ export tay** |
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
