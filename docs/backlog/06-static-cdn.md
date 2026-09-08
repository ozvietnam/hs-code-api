# Bước 6 — Tách mặt công khai ra CDN tĩnh: cộng đồng không phụ thuộc server nhà

**Ngày:** 2026-09-07 · **Trạng thái:** ✅ Công cụ xong, chờ deploy

## Vì sao làm

CEO huỷ gói Vercel Pro, tính đem toàn bộ về server nhà cho tiết kiệm, nhưng lo
cộng đồng khó tiếp cận. Đo lại thì thấy bài toán tự tách làm đôi:

```
tax · search · notes · kg_chapter · customs-types · dataset(13 resource)
    → KHÔNG cái nào gọi LLM. Chỉ đọc JSON. Không ghi. Không session.
```

**Toàn bộ mặt công khai là đọc file tĩnh.** Loại nội dung đó chạy trên CDN tốt
hơn mọi server — miễn phí, không sập, không phụ thuộc điện và đường truyền nhà.
Còn thứ thật sự tốn máy (`suggest`, `describe`, `classify`, embedding) thì vốn đã
kín sau Bearer token, cộng đồng không bao giờ chạm tới.

Nên **không chọn một trong hai**: mặt đọc lên CDN, mặt tính toán về server nhà.
Đem mặt đọc về nhà thì không tiết kiệm được gì — nó vốn đã có thể miễn phí — mà
lại mua đúng rủi ro mất kết nối.

## ĐÃ LÀM

| Thành phần | Vai trò |
|---|---|
| `scripts/build-static.mjs` | Sinh bộ JSON tĩnh chia nhỏ từ `data/` |
| `lib/static-export.js` | Ranh giới an toàn: allowlist, danh sách cố ý bỏ, trần lưu trữ |
| `lib/kg-stats.js` | Tách khỏi `api/dataset.js` để bản tĩnh và API dùng chung một hàm |
| `scripts/test-build-static.mjs` | 66 test |
| `npm run build:static` | Lệnh dựng · `npm run test:build-static` |

**Kết quả build:** 13.997 file · 75,6 MB · 8 giây.

### Ba ràng buộc đã cài vào code, không phải vào tài liệu

1. **Không xuất được thứ ngoài allowlist.** Mỗi lần `emit` phải khai nguồn theo
   `lib/public-access.js`; khai sai thì build DỪNG. Cùng một allowlist mà API
   dùng, nên không thể có chuyện bản tĩnh hở mà bản API vẫn kín. Test soi lại
   lần nữa từ phía sản phẩm — đọc manifest của bộ vừa dựng và đối chiếu lại,
   không tin lời khai của build script.
2. **Không lệch shape với API.** Build gọi đúng hàm lib mà handler API gọi
   (`mapTaxLookup`, `buildChaptersIndex`, `listDocs`…). Test so file tĩnh với
   kết quả hàm thật.
3. **Không vượt trần nơi lưu trữ.** Cloudflare Pages bản free: **20.000
   file/deploy, 25 MiB/file** (đã tra tài liệu 2026-09). Build tự dừng nếu vượt.
   Bản đầu tiên ra 24.599 file — vượt trần — nên chuỗi chú giải được gom theo
   nhóm 4 số (11.871 → 1.269 file), còn 13.997. **Dư địa 30%.**

### Cố ý KHÔNG xuất

`products` — corpus 11.072 tên sản phẩm Shopee/Taobao. Quyền phát hành chưa rà
(**L-4, P0**). Đưa lên CDN là phát tán rộng, không thu hồi được. Rà xong quyền
rồi mới xuất; ghi rõ trong `index.json` mục `omitted`.

### Bố cục output

```
index.json                          manifest — AI đọc file này đầu tiên
AGENTS.md · llms.txt · openapi.json · LICENSE-DATA · NOTICE.md
v1/code/{hs}.json                   11.871 · = GET /api/tax?hs=
v1/chapter/{NN}.json + {NN}-tree.json   194 · = GET /api/kg_chapter
v1/notes/chapter/{N}.json               87 · = GET /api/notes?chapter=
v1/notes/chain/{nhóm4số}.json        1.269 · chuỗi GIR 5 cấp, tra qua byCode[hs]
v1/precedent/{hs}.json                 242 · tiền lệ TB-TCHQ
v1/conflict/{hs}.json                   63 · cụm mã dễ nhầm
v1/legal-doc/{code}.json               108 · văn bản pháp luật
v1/customs-type/{CODE}.json             47 · mã loại hình XNK
v1/ministries.json + ministries/chapter/{NN}.json
v1/search-index.json                     · chỉ mục để client tự tra
v1/accuracy.json · data-quality.json · kg-stats.json · materials.json
```

## VIỆC MỞ RỘNG

### S-1 · Deploy lên Cloudflare Pages — P0 · ~2h

Bộ dữ liệu đã dựng được nhưng **chưa ở đâu cả**. Tạo project Pages, trỏ vào
`dist/`, chạy `npm run build:static` trong bước build. Chốt tên miền công khai
(gợi ý `hs.uythacnhapkhau.com` hoặc subdomain của tên miền chính) rồi ghi vào
`llms.txt` + `AGENTS.md` + `README.md`.

**Nghiệm thu:** máy ngoài `curl <domain>/index.json` và
`<domain>/v1/code/85171300.json` ra 200, không cần token.

### S-2 · CI tự dựng lại khi `data/` đổi — P0 · ~3h

Dữ liệu đổi mà CDN không đổi thì **AI ngoài đọc số cũ và không ai biết**. Đây là
kiểu sai nguy hiểm nhất của bước này: sai âm thầm, lan rộng, không thu hồi được.

Việc: GitHub Action, trigger `push` vào `main` có đụng `data/**`, chạy
`npm run build:static` rồi deploy. Kèm cảnh báo nếu `generatedAt` cũ hơn 30 ngày.

### S-3 · Client mẫu để cộng đồng dùng ngay — P1 · ~1 ngày

Có JSON không có nghĩa là dùng được. Cần một trang HTML tĩnh tra cứu (tải
`search-index.json`, tìm tại chỗ, mở `v1/code/{hs}.json`) đặt ngay trên CDN, và
một đoạn mẫu ~20 dòng cho AI/agent trong `AGENTS.md`.

### S-4 · Bản nén cho ai muốn tải hết — P1 · ~2h

AI muốn nạp cả kho về (fine-tune, RAG offline) mà phải gọi 13.997 request thì
vừa chậm vừa bị coi là quét phá. Sinh thêm `hs-knowledge-{ngày}.tar.gz` + SHA256
+ dòng hướng dẫn trong `llms.txt`.

### S-5 · Đối chiếu tĩnh ↔ API định kỳ — P1 · ~4h

Hiện chỉ kiểm shape lúc build. Cần script lấy ngẫu nhiên ~50 mã, gọi API thật và
so với file tĩnh trên CDN, báo động khi lệch. Hai nguồn cùng công bố mà nói khác
nhau thì mất uy tín nhanh hơn cả việc sai.

### S-6 · Đếm lượt dùng mà không theo dõi người dùng — P2 · ~3h

CDN tĩnh không có `access-log`. Không biết ai dùng gì thì không biết nên đầu tư
vào đâu. Dùng thống kê tổng hợp phía Cloudflare, **không gắn tracker** — người
tra mã HS đang để lộ ý định kinh doanh của họ.

### S-7 · Xuất `products` sau khi rà quyền — P2 · phụ thuộc L-4

Mở khoá trong `lib/static-export.js` (`OMITTED`) sau khi L-4 kết luận được phép.

## DUY TRÌ THEO THỜI GIAN

| Nhịp | Việc | Vì sao |
|---|---|---|
| **Mỗi lần `data/` đổi** | Dựng lại + deploy (S-2 tự động hoá) | CDN cache lâu; dữ liệu cũ nằm lại là sai âm thầm |
| **Hằng tuần** | Kiểm `generatedAt` của `index.json` trên CDN | Build hỏng âm thầm thì tuần sau mới lộ |
| **Hằng tuần** | Đối chiếu tĩnh ↔ API (S-5) | Hai nguồn nói khác nhau = mất uy tín |
| **Khi biểu thuế đổi (TT mới)** | Dựng lại NGAY trong ngày, ghi rõ ở `llms.txt` | Thuế sai lan ra nhiều AI, không thu hồi được |
| **Hằng tháng** | Xem số file so với trần 20.000 | Thêm tài nguyên mới là ăn vào dư địa 30% |
| **Hằng quý** | Rà `OMITTED` còn đúng lý do không | Quyền phát hành thay đổi thì quyết định cũ hết hiệu lực |
| **Hằng năm** | Rà lại trần + chính sách bản free của nhà cung cấp | Trần đổi thì cách chia nhỏ phải đổi theo |

> **Điều quan trọng nhất của bước này:** bộ tĩnh làm dữ liệu sai **lan nhanh hơn
> và khó thu hồi hơn** trước. Đổi lại thì cộng đồng có chỗ tiếp cận không phụ
> thuộc bất kỳ server nào. Cái giá phải trả là **S-2 không được phép trượt** —
> tự động dựng lại khi dữ liệu đổi là điều kiện bắt buộc, không phải tuỳ chọn.
