# Bàn giao: dựng `hs-code-api` trên server nhà

**Người nhận:** dev quản lý server nhà · **Người viết:** Claude · **Ngày:** 2026-09-07
**Bối cảnh:** Vercel Pro đã huỷ. Mặt công khai chuyển sang CDN tĩnh (xem
`docs/backlog/06-static-cdn.md`). Tài liệu này chỉ nói về **phần còn lại** —
phần thật sự cần một cái máy.

---

## 1. Anh chỉ phải chạy 4 endpoint, không phải cả hệ thống

Đọc kỹ mục này trước khi ước lượng hạ tầng. Dự án có 12 handler, nhưng phần lớn
chỉ đọc file JSON và **đã được xuất thành dữ liệu tĩnh cho CDN**. Server nhà chỉ
gánh phần gọi LLM và phần ghi:

| Endpoint | Việc | Vì sao phải ở server |
|---|---|---|
| `POST /api/suggest` | Gợi ý mã HS | Gọi LLM + embedding |
| `POST /api/describe` | Sinh mô tả khai báo (TT 39/2018) | Gọi LLM |
| `POST /api/classify` | Phân loại có cây quyết định | Gọi LLM |
| `POST /api/search?mode=match` | Đối sánh sản phẩm | Gọi LLM |
| `POST /api/feedback` | Ghi phản hồi | Có GHI xuống đĩa |
| `/api/dataset?resource=admin_*`, `kpi`, `error_log` | Quản trị | Nội bộ |
| `/api/tariff/*` | Phiên bản biểu thuế, cập nhật, revert | Có GHI xuống đĩa |

**Ai gọi:** chỉ ERP `erp-xnk` và bản thân Oz. **Không có người ngoài.** Nghĩa là
server này **không cần uptime công khai, không cần chịu tải lạ, không cần đứng
sau tên miền ai cũng biết.**

Nhóm tra cứu (`tax`, `search`, `notes`, `kg_chapter`, `customs-types`, và 13
resource đọc của `dataset`) **đừng dựng lại ở đây** — chúng đã nằm trên CDN. Dựng
lại chỉ tạo thêm một nguồn sự thật thứ hai để lệch nhau.

---

## 2. Yêu cầu máy

| Hạng mục | Mức | Ghi chú |
|---|---|---|
| Node.js | **≥ 22** | Đang chạy v22.22.2 |
| RAM | **2 GB tối thiểu, 4 GB nên có** | `data/` nạp vào bộ nhớ lúc khởi động; riêng `tax.json` 5,4 MB, tổng `data/` 90 MB |
| Đĩa | **5 GB** | 90 MB dữ liệu + log + snapshot biểu thuế theo thời gian |
| CPU | 2 core là đủ | Việc nặng nằm ở API LLM bên ngoài, không ở máy này |
| Thời gian chạy 1 request | tới **300 giây** | `suggest` gọi nhiều lượt LLM — **đừng đặt timeout proxy 30s**, đây là lỗi hay gặp nhất khi chuyển khỏi Vercel |

Mã nguồn viết theo dạng Vercel serverless function (mỗi file trong `api/` export
một `handler(req, res)` chuẩn Node). Bọc lại bằng Express hoặc chạy thẳng
`vercel dev` đều được — **chưa có sẵn server tự dựng, đây là việc anh làm.**
Xem `vercel.json` mục `rewrites` (35 dòng) để biết URL nào ánh xạ vào file nào;
phải giữ nguyên ánh xạ đó, ERP đang gọi theo URL cũ.

---

## 3. Biến môi trường

**Bắt buộc:**

| Biến | Việc |
|---|---|
| `HS_API_TOKEN` | Bearer token. **Không có biến này thì toàn bộ endpoint quản trị mở toang.** |
| Ít nhất một key LLM | `GEMINI_API_KEY` · `MINIMAX_API_KEY` · `HERMES_API_KEY` · `OPENROUTER_API_KEY` |

Chuỗi dự phòng LLM: Gemini → Hermes → MiniMax → OpenRouter (`lib/llm-tier.js`).
Thiếu key nào thì tự bỏ qua provider đó, không sập.

⚠️ **Trên Vercel hiện tại `GEMINI_API_KEY` đang RỖNG lúc chạy** (`/api/health` trả
`geminiKey: false`), mọi thứ đang chạy bằng MiniMax. Khi dựng máy mới, kiểm lại
key bằng `/api/health` chứ đừng tin là đã đặt.

**Tuỳ chọn:** `HS_PUBLIC_READ=false` (đóng đọc công khai — trên server nhà **nên
đặt `false`**, vì phần công khai đã ở CDN rồi, máy này không cần phục vụ ai lạ),
`HS_DATA_DIR` (chuyển thư mục ghi), `SENTRY_DSN`, các biến `*_ENRICH_MODEL`,
`OLLAMA_BASE_URL` (nếu muốn chạy model nội bộ).

---

## 4. Dữ liệu và sao lưu — phần dễ mất nhất

Không có database. Dữ liệu là file JSON trong `data/`. Có **hai loại rất khác
nhau**, đừng gộp:

**a) Nguồn (đọc, nằm trong git):** `tax.json`, chú giải, tiền lệ… → `git pull` là
có, mất cũng lấy lại được.

**b) Trạng thái (GHI lúc chạy, KHÔNG nằm trong git):**

```
lib/access-log.js       lib/admin-update.js     lib/error-monitor.js
lib/feedback-store.js   lib/ml-log.js           lib/tariff-mutations.js
```

Sinh ra: nhật ký truy cập, nhật ký sửa dữ liệu, log lỗi, **phản hồi của người
khai** (`feedback`), log ML, và **snapshot phiên bản biểu thuế** (`data/versions/`).

**Nhóm (b) mất là mất hẳn.** Riêng `feedback` là tri thức tích luỹ từ người thật
sửa mã sai — không dựng lại được bằng bất kỳ cách nào. **Cần backup hằng ngày,
để ở máy khác.**

Mọi lib ghi đĩa đều lấy đường dẫn qua `lib/data-paths.js`. Muốn tách hẳn thư mục
ghi ra khỏi mã nguồn (nên làm — để `git pull` không bao giờ đụng vào trạng thái):
đặt `HS_DATA_DIR=/var/lib/hs-code-api`, code tự đọc nguồn ở `data/` và ghi trạng
thái vào đó.

⚠️ **`data/oz-export/` chứa tờ khai cũ có thông tin khách hàng.** Đã gitignore.
Trên server nhà: không đưa vào thư mục web phục vụ được, không backup lên dịch vụ
công cộng, phân quyền đọc hạn chế.

---

## 5. Mạng — khuyến nghị cụ thể

Máy này **không phục vụ người ngoài**, nên đừng mở nó ra Internet theo kiểu thông
thường. Ba lựa chọn, xếp theo mức em khuyên:

1. **Chỉ LAN / VPN** — nếu ERP chạy cùng mạng. An toàn nhất, không phải làm gì thêm.
2. **Cloudflare Tunnel** — nếu ERP ở ngoài. Không mở cổng nào trên router, chịu
   được IP động, có sẵn TLS. Bản free đủ dùng. Đây là lựa chọn phù hợp nhất với
   đường truyền dân dụng ở Việt Nam (hay bị CGNAT và chặn cổng 80/443).
3. **Mở cổng + reverse proxy + Let's Encrypt** — làm được nhưng phải tự lo IP
   động và tự chịu quét từ Internet. Chọn cách này thì bắt buộc chặn IP.

**Bất kể chọn cách nào:**
- Mọi endpoint đều phải qua Bearer token. Kiểm bằng: gọi `/api/suggest` không kèm
  header, phải nhận **401**.
- Nhóm `admin_*`, `kpi`, `error_log`, `/api/tariff/admin/*` nên chặn thêm bằng IP
  hoặc chỉ cho qua VPN. Chúng có thể **ghi đè dữ liệu biểu thuế**.
- Đặt timeout proxy **≥ 300 giây** (xem mục 2).

---

## 6. Nghiệm thu — chạy đúng 5 lệnh này

```bash
# 1. Test phải xanh toàn bộ (29 script, không ghi vào data/ thật)
npm test

# 2. Health phải báo có key LLM và có token
curl -s localhost:3000/api/health | jq '.checks'
#    → taxData.rows = 11871 · apiToken.ok = true · ít nhất 1 key LLM ok

# 3. Không token thì phải bị chặn
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/suggest
#    → 401  (ra 200 là hỏng, dừng lại xử lý ngay)

# 4. Có token thì phải chạy được
curl -s -X POST localhost:3000/api/suggest \
  -H "Authorization: Bearer $HS_API_TOKEN" -H 'Content-Type: application/json' \
  -d '{"description":"van điện từ khí nén"}' | jq '.suggestions[0], .girRulesApplied'

# 5. Ghi được xuống đĩa
curl -s -X POST localhost:3000/api/feedback \
  -H "Authorization: Bearer $HS_API_TOKEN" -H 'Content-Type: application/json' \
  -d '{"feedbackType":"hs_correction","hsCodeAtTime":"84818083","correctedHsCode":"84812090","productName":"van test","directorNote":"kiểm tra ghi đĩa"}'
#    → {"ok":true,"feedbackId":"fb_...","persisted":true}
#    persisted phải là TRUE. Ra false nghĩa là ghi đĩa hỏng (quyền thư mục),
#    endpoint vẫn trả 200 nên không kiểm cờ này thì không phát hiện được.
```

Xong 5 bước này là đủ điều kiện chuyển ERP sang trỏ vào server nhà.

---

## 7. Đừng làm

- ❌ **Đừng chạy `npm test` trên thư mục production.** Test dùng
  `scripts/test-isolate-data.mjs` để ghi vào thư mục tạm, nhưng đã từng có lần
  test làm bẩn `data/` thật và commit nhầm một snapshot biểu thuế test thành
  phiên bản "đang hiệu lực". Chạy test ở bản checkout riêng.
- ❌ **Đừng mở endpoint LLM ra công khai.** Mỗi lượt gọi tốn tiền thật.
- ❌ **Đừng dựng lại nhóm tra cứu ở server nhà** — đã có trên CDN, dựng lại là tạo
  nguồn sự thật thứ hai.
- ❌ **Đừng commit `data/oz-export/*` hay `.env`.**
- ❌ **Đừng đặt timeout proxy 30 giây.** `suggest` chạy tới 300s.

---

## 8. Câu hỏi cần CEO chốt trước khi anh bắt đầu

1. ERP `erp-xnk` chạy **cùng mạng** với server nhà hay ngoài Internet? — quyết
   định chọn phương án mạng ở mục 5.
2. Có giữ song song Vercel một thời gian để chuyển dần không, hay cắt hẳn?
3. Backup nhóm (b) để ở đâu? (khuyến nghị: máy khác trong nhà + một bản mã hoá
   ngoài — nhưng **không đưa `oz-export` lên dịch vụ công cộng**).
