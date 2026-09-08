# Bước 3 — Điểm vào cho AI: mở kho tri thức cho mọi mô hình

**Ngày:** 2026-09-07 · **Trạng thái:** ✅ Xong (phần nền)

## Vấn đề đã sửa

Mục tiêu "bất kỳ AI nào chạm tới repo hoặc website đều thành pro" bị chặn ở hai chỗ:

1. **Mọi endpoint tri thức đều đòi Bearer token.** AI ngoài không gọi được gì —
   kể cả tra một dòng thuế. Kho dữ liệu tốt đến mấy cũng vô dụng nếu không ai
   chạm được.
2. **Không có điểm vào chuẩn.** Clone repo chỉ có `CLAUDE.md` (dành riêng Claude
   Code). Không `AGENTS.md`, không `llms.txt`, không đặc tả OpenAPI. Cursor,
   Codex, ChatGPT hay agent tự viết vào đều phải tự mò.

## ĐÃ LÀM

### Mở đọc công khai — có kiểm soát

`lib/public-access.js` — **allowlist tường minh**, không phải blocklist. Chỉ mở
khi thoả cả ba: (1) chỉ đọc dữ liệu tĩnh, không gọi LLM; (2) không chứa dữ liệu
riêng tư; (3) nội dung đã đủ tin cậy để công bố.

| Nhóm | Trạng thái |
|---|---|
| `tax`, `search`, `notes`, `kg_chapter`, `customs-types` | 🔓 mở |
| 13 resource dữ liệu: `kg_stats`, `chapters`, `conflicts`, `precedents`, `materials`, `ministries`, `legal_docs`, `legal_doc`, `policy_procedures`, `products`, `accuracy`, `data_quality`, `material_taxonomy` | 🔓 mở |
| `suggest`, `describe`, `classify`, `match`, `feedback` | 🔒 kín — mỗi lượt tốn tiền LLM |
| `admin_*`, `kpi`, `error_log`, `prompt_versions` | 🔒 kín — vận hành nội bộ |
| `oz_precedents` | 🔒 kín — lịch sử tờ khai Oz, tri thức kinh doanh riêng |
| `trademark` | 🔒 kín — mới verify 1/53 nhãn, công bố cảnh báo chưa xác minh có thể gây thiệt hại |

Chỉ `GET`/`HEAD` mới được mở. Công tắc tắt khẩn cấp: `HS_PUBLIC_READ=false`.
Request công khai được set `Cache-Control` + `X-Access-Mode: public-read`.

**`scripts/test-public-access.mjs` — 69 test** khoá chặt ranh giới, gồm bất biến
"chuẩn hoá của lớp phân quyền phải trùng chuẩn hoá của định tuyến" (lệch nhau là
sinh lỗ hổng lách bằng khoảng trắng).

### Ba điểm vào cho AI

| File | Dành cho | Nội dung |
|---|---|---|
| `AGENTS.md` | AI clone repo | Quy trình 6 bước xác định mã HS, bản đồ dữ liệu, cách đọc `basis`, độ chính xác thật, 6 ranh giới không được vượt |
| `public/llms.txt` | AI đến từ web (chuẩn llms.txt) | Tóm tắt kho + liên kết mọi endpoint mở + cảnh báo dùng đúng |
| `public/openapi.json` | Máy đọc (OpenAPI 3.1) | 20 path, phân rõ nhóm cần token và không |

**`scripts/build-openapi.mjs` sinh spec từ chính `lib/public-access.js`** — tài
liệu không thể lệch code. Dự án vừa dính đúng bệnh đó: `integration-guide.md` mô
tả `girRulesApplied` là mảng chuỗi trong khi code trả mảng object suốt nhiều
tháng. Nối vào `npm run build`.

`vercel.json` thêm header cho `llms.txt` (text/plain), `openapi.json`,
`community-data.json`, `api-guide.json` — đều `Access-Control-Allow-Origin: *`
để AI gọi chéo miền được.

`CLAUDE.md` rule #2 viết lại: mặc định KÍN, mở là ngoại lệ phải khai tường minh.

## ⚠️ Rủi ro đã mở ra và cách bịt

Mở đọc công khai đồng nghĩa **ai cũng gọi được không giới hạn**. Hiện **chưa có
rate limit** — đây là nợ kỹ thuật có ý thức, không phải bỏ sót. Xem A-1.

## VIỆC MỞ RỘNG

### A-1 · Rate limit cho endpoint công khai — P0 · ~1 ngày

Không có giới hạn thì một script vô ý (hoặc cố ý) gọi vài triệu lượt là đốt băng
thông Vercel và có thể làm chậm cả ERP đang dùng thật.

Vercel serverless không có state chung, nên cần một trong:
- **Vercel KV / Upstash Redis** — đếm theo IP, cửa sổ trượt. Chuẩn nhất.
- **Vercel Firewall / WAF rate limit** — cấu hình ở dashboard, không cần code.
  Nhanh nhất, nên làm trước.
- Chấp nhận rủi ro và chỉ giám sát băng thông — chỉ hợp giai đoạn đầu.

Đề xuất: bật WAF ngay (0 dòng code), rồi làm KV sau. Ngưỡng gợi ý: 60 req/phút/IP
cho nhóm tra cứu.

Nghiệm thu: gọi quá ngưỡng trả 429 kèm `Retry-After`; ERP có token không bị ảnh
hưởng.

### A-2 · Đăng ký llms.txt + sitemap để AI tìm thấy — P1 · ✅ xong phần repo 2026-09-08

Đã làm trong repo:
- `public/robots.txt` — `Allow: /`, `Content-Signal: search=yes, ai-input=yes, ai-train=yes`, không `Disallow`, trỏ sitemap + llms.txt
- `public/sitemap.xml` — trang chủ, llms.txt, openapi.json, community-data.json, api-guide.json
- Thẻ `<link rel="alternate" type="text/plain" href="/llms.txt">` trên trang chủ
- `vercel.json` header cho robots.txt / sitemap.xml
- Bản tĩnh (`build-static.mjs`) copy robots + sitemap lên CDN

Còn việc CEO: tắt "block training in robots.txt" trên Cloudflare (file origin một mình chưa gỡ khối CF chèn trước). Đăng ký thư mục llms.txt bên ngoài là việc tuỳ chọn.

### A-3 · Endpoint `/api/openapi` trả spec động — P2 · ~2h

Hiện `openapi.json` là tệp tĩnh sinh lúc build. Nếu `HS_PUBLIC_READ=false` được
bật lúc chạy thì spec vẫn ghi là công khai → sai lệch. Nên có endpoint đọc
`isPublicRead()` tại thời điểm gọi.

### A-4 · Ví dụ tích hợp sẵn cho từng nền tảng AI — P1 · ~1 ngày

Để "AI nào cũng thành pro" thì phải hạ rào cản xuống mức dán-là-chạy:
- MCP server config mẫu (repo này chưa có `.mcp.json`)
- Custom GPT action schema (trỏ thẳng `openapi.json`)
- Ví dụ tool-use cho Claude API / OpenAI function calling
- Đoạn prompt mẫu nhúng `AGENTS.md`

Để ở `docs/integrations/`.

### A-5 · Đo lượng dùng công khai — P1 · ~4h

Không đo thì không biết mở cửa có tác dụng không, cũng không biết bị lạm dụng.
`lib/access-log.js` đã có sẵn; cần ghi thêm `X-Access-Mode` và tách thống kê
public vs authenticated, đưa lên `/community-data.json`.

### A-6 · Bản tiếng Anh cho AGENTS.md và llms.txt — P2 · ~4h

Mô hình quốc tế và lập trình viên nước ngoài đọc tiếng Việt kém hơn. Kho dữ liệu
là về luật Việt Nam nhưng hướng dẫn dùng nên song ngữ.

## DUY TRÌ THEO THỜI GIAN

| Nhịp | Việc | Vì sao |
|---|---|---|
| **Mỗi lần thêm/sửa endpoint** | Chạy `npm run build` để sinh lại `openapi.json`; cập nhật `AGENTS.md` + `llms.txt` nếu là endpoint tra cứu | Tài liệu lệch code là bệnh đã tái phát một lần ở repo này |
| **Hằng tuần** | Xem băng thông + số lượt gọi công khai trên Vercel | Phát hiện lạm dụng sớm, trước khi thành hoá đơn |
| **Hằng tháng** | Cập nhật số liệu trong `AGENTS.md` mục 5 và `llms.txt` (benchmark, số văn bản verified, số nhãn hiệu verified) | AI đang trích những con số này cho người dùng — số cũ là thông tin sai |
| **Hằng quý** | Rà lại allowlist: resource nào đã đủ tin cậy để mở thêm (vd `trademark` sau khi verify đủ), resource nào nên đóng lại | Ranh giới công khai phải theo kịp độ chín của dữ liệu |
| **Khi biểu thuế đổi** (thường đầu năm hoặc khi có TT mới) | Cập nhật ngay `data/tax.json` + `generatedAt`, thông báo ở `llms.txt` | AI ngoài đang tra thẳng vào đây — dữ liệu cũ lan ra rất nhanh và không thu hồi được |

> **Cảnh báo lớn nhất của bước này:** trước đây dữ liệu sai chỉ ảnh hưởng nội bộ
> Oz. Từ nay AI bên ngoài tra thẳng vào API công khai, nên **một dòng thuế sai sẽ
> lan ra hàng loạt câu trả lời của nhiều AI khác nhau, và không có cách thu hồi**.
> Nhịp cập nhật dữ liệu từ đây trở đi không còn là việc "nên làm" mà là **nghĩa vụ**.
> Cần chốt cam kết cập nhật cụ thể (đề xuất: rà biểu thuế hằng tháng, văn bản pháp
> luật hằng tuần) và công bố cam kết đó trên trang chủ để người dùng biết mà tin.
