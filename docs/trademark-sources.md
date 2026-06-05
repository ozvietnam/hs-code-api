# Nguồn dữ liệu nhãn hiệu cho Trademark Watch (VN nhập + TQ xuất)

Tool `lib/trademark-watch.js` cảnh báo 2 trục: **VN nhập** (TCHQ) + **TQ xuất** (GACC).
Cảnh báo chỉ tin cậy khi watchlist được nạp **dữ liệu thật**. Tài liệu này liệt kê các
nguồn hợp pháp và cách nạp.

## ⚠️ Vướng mắc môi trường (đọc trước)

Sandbox **Claude Code on the web** chặn outbound tới host ngoài allowlist
(`Host not in allowlist` cho cả `node fetch` lẫn WebFetch). Vì vậy **không chạy
ingest tự động từ trong session web được**. Ba cách gỡ:

1. **Chạy ở máy/CI mạng mở** (khuyến nghị) — clone repo, chạy script ingest dưới đây, commit.
2. **Đổi network policy của environment** để allowlist các host: `www.tmdn.org`,
   `haiguanbeian.com`, `api.euipo.europa.eu`, `branddb.wipo.int`
   (xem https://code.claude.com/docs — network policy). Sau đó ingest chạy ngay trong session.
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
