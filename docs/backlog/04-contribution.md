# Bước 4 — Đường đóng góp: biến kho riêng thành tài sản chung

**Ngày:** 2026-09-07 · **Trạng thái:** ✅ Xong (phần nền)

## Vấn đề đã sửa

Trang chủ ghi "dự án cộng đồng" nhưng người muốn góp dữ liệu **không có đường
vào**: không `CONTRIBUTING.md`, không mẫu Issue, không định dạng dữ liệu, không
cơ chế xác nhận cấp phép. Kết quả sau nhiều tháng public: **0 fork, 0 PR từ
ngoài**. Cửa mở nhưng không có bậc thềm.

Rủi ro lớn hơn: nếu có người gửi dữ liệu thật, họ **rất dễ vô ý kèm thông tin
khách hàng** — vì nguồn dữ liệu tự nhiên nhất của họ là tờ khai và file Excel nội
bộ. Repo công khai, lịch sử git không xoá được. Một lần lọt là dữ liệu khách hàng
của *họ* nằm vĩnh viễn trên Internet, và đó là lỗi của dự án vì đã không chặn.

## ĐÃ LÀM

### Bộ lọc riêng tư ở cổng vào — phần quan trọng nhất

`scripts/validate-community.mjs` chặn theo **hình dạng dữ liệu**, không theo danh
sách tên (danh sách luôn thiếu). Đã thử với 6 kiểu rò rỉ hay gặp nhất, chặn hết:

| Kiểu rò rỉ | Kết quả |
|---|---|
| Tên doanh nghiệp ("Công ty TNHH ABC") | ❌ chặn |
| Mã số thuế (10/13 số) | ❌ chặn |
| Số tờ khai (11-12 số) | ❌ chặn |
| Số điện thoại VN | ❌ chặn |
| Tham chiếu chứng từ (invoice, B/L, vận đơn) | ❌ chặn |
| Email | ❌ chặn |
| Trị giá lô hàng | ⚠️ cảnh báo (dễ trùng thông số kỹ thuật nên không chặn cứng) |

Chạy trong `npm test` và trong CI riêng cho PR đụng `data/community/`.

### Định dạng đóng góp

`schemas/community-contribution.schema.json` — 4 loại: `conflict-table` (quý
nhất), `precedent`, `correction`, `product-example`.

Hai ràng buộc có chủ đích:
- **`source.type` bắt buộc.** Không có nguồn thì không nhận — đây là kho người ta
  dùng để khai hải quan thật.
- **Tờ khai chỉ ghi `clearedYear` (năm), không ghi ngày.** Ngày cụ thể có thể truy
  ngược ra lô hàng.

Mẫu sẵn: `data/community/examples/vi-du-tien-le.json`.

### Cửa vào cho cả người biết và không biết code

| Kênh | Dành cho |
|---|---|
| 3 mẫu Issue (báo lỗi / góp tiền lệ / **góp cụm mã dễ nhầm**) | Người không biết git — điền form là xong |
| `CONTRIBUTING.md` | Người gửi PR — kèm ví dụ "đóng góp tốt vs đóng góp yếu" |
| `.github/workflows/community-data.yml` | CI tự kiểm schema + riêng tư + DCO |

Mọi mẫu Issue đều có checkbox bắt buộc xác nhận không chứa thông tin khách hàng —
để người gửi **dừng lại nghĩ một nhịp** trước khi bấm gửi.

### DCO thay vì CLA

`git commit -s` là đủ. **Chỉ áp cho PR đến từ fork** — mục đích DCO là ghi nhận
người ngoài cấp quyền cho dự án; chủ sở hữu bản quyền không cần tự cấp phép cho
chính mình. (Đây cũng là lý do job DCO không làm đỏ các nhánh nội bộ.)

Việc **L-1** trong sổ bước 1 coi như xong.

## VIỆC MỞ RỘNG

### C-1 · Bật GitHub Discussions — P1 · ~10 phút (chỉ CEO làm được)

Repo đang tắt Discussions (`has_discussions: false`). Issue hợp với việc có thể
đóng được; còn "mã này nên áp 8413 hay 8414?" là thảo luận, không có nút đóng.
Không có chỗ thảo luận thì tri thức nằm rải rác trong Issue đã đóng.

Việc: Settings → General → bật Discussions. Tạo 3 category: *Hỏi đáp phân loại*,
*Tranh luận cụm mã*, *Thông báo*. Rồi trỏ link từ `index.html` và
`CONTRIBUTING.md`.

### C-2 · Quy trình gộp đóng góp vào kho chính — P0 · ✅ xong 2026-09-09

`scripts/merge-community.mjs` (`npm run data:merge-community`):

- `precedent` → `precedents.json` (giữ `contributor` + `source`)
- `conflict-table` → gộp `confusedWith`/`reasonVi` vào `conflicts.json` — **không** tự tạo bảng `verified`
- `correction` / `product-example` → xếp hàng jsonl, không tự áp
- Bỏ qua `data/community/examples/`
- Trùng hsCode + số hiệu TB-TCHQ thì bỏ qua
- Tệp dính bộ lọc riêng tư → từ chối cả tệp
- Log: `data/community-merge-log.jsonl` (gitignored)

Nghiệm thu: test `scripts/test-merge-community.mjs` — tệp community sau gộp có tên contributor trong `precedents.json` (payload `/api/precedents`).

### C-3 · `CONTRIBUTORS.md` tự sinh — P1 · ~3h

Ghi công là thứ duy nhất người đóng góp nhận lại. Phải tự động, không phụ thuộc
việc nhớ.

Việc: script quét `data/community/**` + git log, sinh `CONTRIBUTORS.md` kèm số
bản ghi mỗi người. Đưa top người đóng góp lên trang chủ.

### C-4 · Mở rộng bộ lọc riêng tư — P1 · ✅ xong 2026-09-09

`lib/privacy-filter.js` + `scripts/test-privacy-filter.mjs` (chạy trong `npm test`).

Đã thêm: tên DN Trung Quốc (有限公司, 贸易有限, 集团…), EIN `NN-NNNNNNN`, container ISO 6346 (`MSCU`+7 số), số seal, toạ độ GPS, địa chỉ kho. Không false-positive `đường kính` hay model van `4V220`.

### C-5 · Bảng xếp hạng đóng góp công khai — P2 · ~4h

Đưa số liệu đóng góp lên `/community-data.json` và trang chủ: bao nhiêu người
góp, bao nhiêu bản ghi, cụm mã nào mới được phân giải tháng này. Thấy dự án sống
thì người ta mới góp.

### C-6 · Trả lời đóng góp trong 7 ngày — P1 · quy trình, không phải code

PR bị bỏ quên 3 tuần là mất người đóng góp vĩnh viễn. Cần cam kết thời gian phản
hồi, ghi rõ trong `CONTRIBUTING.md`, và một Routine nhắc rà PR/Issue mới.

## DUY TRÌ THEO THỜI GIAN

| Nhịp | Việc | Vì sao |
|---|---|---|
| **Hằng tuần** | Rà PR + Issue đóng góp mới, trả lời trong 7 ngày | Im lặng là cách nhanh nhất giết một dự án cộng đồng |
| **Hằng tuần** | Chạy gộp `data/community/` vào kho chính (`npm run data:merge-community`) | Đóng góp không lên API = người góp không thấy tác dụng |
| **Hằng tháng** | Cập nhật `CONTRIBUTORS.md` + số liệu đóng góp trên trang chủ | Ghi công là phần thưởng duy nhất |
| **Hằng quý** | Rà lại bộ lọc riêng tư: có kiểu rò rỉ mới nào lọt qua không | Người đóng góp mới mang theo kiểu dữ liệu mới |
| **Hằng quý** | Rà `CONTRIBUTING.md` còn khớp quy trình thật không | Tài liệu sai còn tệ hơn không có |
| **Khi có đóng góp đầu tiên từ ngoài** | Thêm `CONTRIBUTORS.md`, sửa dòng bản quyền thành "ozvietnam và những người đóng góp" | Việc trong sổ bước 1 |

> **Điều quyết định thành bại của bước này không phải code mà là nhịp phản hồi.**
> Hạ tầng đóng góp giờ đã đủ, nhưng một PR bị bỏ quên 3 tuần sẽ giết vòng lặp
> nhanh hơn mọi lỗi kỹ thuật. Nếu CEO không có thời gian rà hằng tuần, nên giao
> hẳn một agent làm việc đó theo lịch.
