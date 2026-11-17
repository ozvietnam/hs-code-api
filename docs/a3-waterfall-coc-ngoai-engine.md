# Báo cáo Phân tích Waterfall Latency Ngoài Engine — Ca Cốc `earlyExit` (OZV-1361)

- **Mã vấn đề**: OZV-1361 (Issue #1361)
- **Đối tượng**: Ca tra cứu "cốc giữ nhiệt chân không" (`96170010`) qua `POST /api/classify` với chế độ `earlyExit` (`chotSom + high` từ từ điển `trade-synonyms.json`).
- **Thực trạng đo đạc (Live 02:28 VN)**:
  - Tổng thời gian HTTP response (`ms`): `~7596 ms` (~7.6s)
  - Thời gian xử lý trong động cơ cốt lõi (`engineMs`): `~126 ms`
  - Độ trễ dư thừa ngoài engine (residual latency): `~7470 ms` (~7.47s)

Sau khi PR #1414 / #1421 đã cắt bỏ vòng lặp LLM trong engine cho `chotSom+high` (giúp `engineMs` chỉ còn ~126ms), phần lớn thời gian trễ còn lại nằm ở các tầng xử lý xung quanh (ngoài `engineLoop`).

---

## 1. Bảng Waterfall Latency Ngoài Engine (Ca Cốc `96170010`)

| Thứ tự | Bước xử lý / Thành phần | Tệp / Hàm liên quan | Kiểu (Sync / Async) | Ước lượng ms (ca cốc) | Ghi chú / Trọng điểm |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Nhận request, CORS, Auth & Rate Limit | `server.js`, `api/classify.js`, `lib/cors.js`, `lib/auth.js`, `lib/public-llm.js` | Async / Sync | ~15 – 30 ms | Kiểm tra Bearer token, hạn mức công khai, parse JSON body. |
| 2 | Tra Kho Đáp Án (Kho đáp án) | `api/classify.js`, `lib/kho-dap-an.js` (`traTuKho`) | Async (DB Postgres) | ~20 – 50 ms | Kiểm tra shadow/on trong kho đáp án nếu bật. |
| 3 | Tra Cache Kết Quả Phân Loại | `api/classify.js`, `lib/classify-cache.js` (`docCache`) | Async (DB Postgres) | ~30 – 100 ms | Truy vấn cache theo hash hồ sơ (nếu là khoá dịch vụ). |
| 4 | Động cơ cốt lõi (Engine Loop / Early Exit) | `api/classify.js`, `lib/classify.js`, `lib/engine-loop.js` | Sync / Async | **~126 ms** (`engineMs`) | Đã tối ưu triệt để ở #1421 (bỏ vòng AI, khớp nhanh qua từ điển). |
| 5 | Gắn Hồ Sơ / Ho So Engine (`ganHoSoClassify`) | `api/classify.js`, `lib/ho-so/api.js`, `doiChieu`, `docDuKien`, `nghienCuu`, `vietMoTa` | Async / Sync | **~3,500 – 5,000 ms** | Đọc dữ kiện, đối chiếu chuẩn TT 39/2018, xây dựng evidence pack, sinh mô tả khai báo (kể cả khi đã earlyExit). |
| 6 | Sổ Tay Runtime & Ý Kiến WCO / Ranh Giới | `lib/so-tay-runtime.js`, `lib/hs-tree.js`, `lib/evidence-pack.js` | Sync (File I/O + Tree) | **~1,000 – 2,000 ms** | Đọc tệp JSON `data/so-tay/<nhom4>.json` (`fs.readFileSync`), dựng/duyệt cây 11,871 nút, đối chiếu exclusions/WCO. |
| 7 | Thống kê / Đếm lượt công khai & Usage Context | `lib/usage-context.js`, `lib/public-llm-meter.js` | Async | ~10 – 30 ms | Ghi nhận chi phí token/lượt (nếu có). |
| 8 | Ghi Cache & Shadow Log (Fire-and-forget) | `lib/classify-cache.js` (`ghiCache`), `lib/kho-dap-an.js` (`soiBong`) | Async (DB Postgres) | ~50 – 150 ms | Ghi ngầm kết quả vào DB để phục vụ audit/shadow. |
| 9 | Serialize JSON & HTTP Response | `api/classify.js` (`res.status(200).json(...)`) | Sync | ~10 – 20 ms | Đóng gói JSON trả về client. |

---

## 2. Top 3 Ứng Viên Cắt Giảm (Không Sửa Code ở Nhịp Này)

1. **Ứng viên 1: Lược bỏ / Bỏ qua `ganHoSoClassify` khi `earlyExit` (Chốt sớm tất định)**
   - *Lý do*: Khi động cơ đã chốt sớm thành công qua từ điển (`earlyExit` với độ tin cậy cao), lượt tra cứu là rõ ràng và chắc chắn. Tuy nhiên, `ganHoSoClassify` hiện tại vẫn chạy toàn bộ chuỗi nặng (đối chiếu, viết mô tả hải quan TT 39, sinh bộ hồ sơ) cho mọi lượt.
   - *Hướng tối ưu tương lai*: Bỏ qua hoặc chỉ chạy gọn phần sinh mô tả tối thiểu khi `earlyExit` không yêu cầu đầy đủ hồ sơ khai báo chi tiết.

2. **Ứng viên 2: Tránh đồng bộ đọc tệp `soTay` và duyệt lại cây HS toàn cục (`lib/hs-tree.js`) khi đã chốt sớm**
   - *Lý do*: Việc gọi `soTay` runtime và tra cứu vị trí cây (`hs-tree.js`) thực hiện nhiều thao tác `fs.readFileSync` đồng bộ và duyệt cấu trúc cây 11,871 nút trên mỗi request, chiếm đáng kể thời gian blocking event loop.
   - *Hướng tối ưu tương lai*: Caching sẵn cấu trúc sổ tay trong memory hoặc lazy-load/bỏ qua khối sổ tay chi tiết khi lượt gọi đạt độ tin cậy `earlyExit` hoàn toàn.

3. **Ứng viên 3: Tối ưu hoá tầng kết nối và truy vấn DB phụ trợ (Cache / Shadow Log)**
   - *Lý do*: Các thao tác `docCache`, `traTuKho`, `ghiCache`, `soiBong` qua kết nối Postgres tốn khoảng hàng trăm ms. Mặc dù một số là bất đồng bộ (fire-and-forget), việc khởi tạo pool hoặc chờ response gây áp lực latecy.
   - *Hướng tối ưu tương lai*: Tách biệt hoàn toàn các tác vụ logging / shadow sang background worker hoặc batch queue, không block luồng trả phản hồi HTTP chính.

---

## 3. Lệnh Đo Đề Xuất Cho Nhịp Giám Đốc Sau Khi Gộp #1421

Để đo đạc chính xác thời gian từng bước waterfall trong môi trường local/staging sau khi PR #1421 được gộp, sử dụng các lệnh sau:

```bash
# 1. Chạy test ca chốt sớm (cốc giữ nhiệt / trade hints) kèm đo thời gian chi tiết
node --test scripts/test-classify-trade-hints.mjs

# 2. Benchmark HTTP endpoint /api/classify bằng curl với timing chi tiết (thời gian tính bằng giây/ms)
curl -s -w "\nlookup_time: %{time_namelookup}s\nconnect_time: %{time_connect}s\npretransfer_time: %{time_appconnect}s\nstarttransfer_time: %{time_starttransfer}s\ntotal_time: %{time_total}s\n" \
  -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"tenHang": "cốc giữ nhiệt chân không bằng inox", "chatLieu": "inox", "congDung": "giữ nhiệt nước uống"}'

# 3. Kiểm tra performance bộ kiểm luật và engine loop
node scripts/bo-kiem-luat.mjs
```
