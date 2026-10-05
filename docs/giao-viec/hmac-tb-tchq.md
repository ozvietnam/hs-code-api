# Giao việc: HMAC — lấy toàn văn TB-TCHQ, trích tiền lệ

- **Giao:** 2026-10-05, CEO duyệt.
- **Người làm:** HMAC (Hermes agent trên máy Mac của CEO, Chrome đã đăng nhập thuvienphapluat).
- **Nhánh:** `hmac/tb-tchq-toan-van`. Mỗi đợt mở một PR từ nhánh này vào `main`. Không push thẳng `main`.
- **Bảng quản lý (làm chung):** [Google Sheet "URL_TB-TCHQ2025 5911 dòng"](https://docs.google.com/spreadsheets/d/1iwpYYmkeFousK2CFaSyzUSPCsqIcF4atJ2K9yLPQYxc/edit).
  Tab **Tổng hợp** tự đếm tiến độ, tab **Sheet1** là hàng đợi.

Đọc trước khi làm: [`docs/huong-dan-trich-tb-tchq.md`](../huong-dan-trich-tb-tchq.md). Tệp đó quy định đọc chỗ nào
trong thông báo, lấy trường gì, cấm lấy gì. Tài liệu này chỉ nói **làm theo thứ tự nào** và **ghi kết quả ở đâu**.

## Vì sao việc này cần HMAC

- thuvienphapluat và luatvietnam chặn máy chủ bằng Cloudflare, customs.gov.vn đòi captcha.
- Máy chủ cloud của Claude và VPS agent đều không đọc được.
- HMAC chạy trên Mac, dùng Chrome thật của CEO nên mở được trang như người dùng bình thường.
- **Không lách chặn bằng công cụ.** Chỉ mở trang trong trình duyệt như người đọc.

## Giai đoạn 1 — 2.927 thông báo "Cần lấy" (Sheet1)

**Lọc:** Sheet1 cột F = `Cần lấy`, cột I còn trống. Sắp cột G tăng dần, rồi năm (cột D) giảm dần.

| Ưu tiên | Số thông báo | Ghi chú |
|---|---|---|
| 1 | 45 | 2022–2025, mã theo biểu thuế hiện hành; 35 là xác định trước mã số |
| 2 | 343 | 2018–2021 |
| 3 | 2.539 | 2014–2017 hoặc chưa rõ năm. Ghi `attributes.bieuThue` đúng biểu (2012 hay 2017) |

### Vòng làm một lô (25 thông báo)

1. **Nhận việc trên sheet:** với 25 dòng sắp làm, ghi cột **I = `HMAC`**, cột **J = `Đang làm`**. Ghi trước khi mở trang để không ai làm trùng.
   **Tìm đúng dòng theo URL** (Ctrl+F số thông báo hoặc mã cuối URL, vd `646486`). Không ghi vào dòng đầu bảng. Lần thử 05/10, kết quả của 1005/TB-TCHQ bị ghi vào dòng 2, tức thông báo 511/TB-TCHQ.
2. **Mở URL cột B** trong Chrome và đọc toàn văn. Trang chỉ có tóm tắt, phải trả phí, hoặc lỗi thì ghi **J = `Lỗi nguồn`**, cột H ghi lý do, rồi bỏ qua.
3. **Trích bản ghi** đúng theo `docs/huong-dan-trich-tb-tchq.md` mục 2–3:
   - mã kết luận 8 số;
   - mô tả theo đặc tính quyết định;
   - lý do chép nguyên văn từ nhóm đến mã;
   - `issuedDate`, `url`, `bieuThue`, số PTPL;
   - GIR **chỉ khi văn bản viện dẫn**.

   Thông báo không kết luận mã (trả hồ sơ, không đủ cơ sở…) thì ghi **J = `Không kết luận`**.
4. **Tự kiểm từng bản ghi**:
   - mã xuất hiện nguyên văn trong toàn văn;
   - ít nhất 60% từ của mô tả có trong toàn văn;
   - **không** có tên doanh nghiệp, mã số thuế, số tờ khai, chi cục, trị giá.
   - `reasonVi` chép **nguyên văn** câu kết luận và căn cứ của thông báo. Không thêm lời mình như "đáp ứng tiêu chí…", "biểu thuế theo…": biểu thuế ghi ở `attributes.bieuThue`.
   - Số liệu trong `description` và `reasonVi` phải khớp nhau và khớp văn bản. Lần thử 05/10, mô tả ghi "heavy paraffinic 6%" còn lý do ghi "paraffin 1%".
5. **Ghi tệp** `data/community/tb-tchq/hmac-<YYYY-MM-DD>-<lô>.json` (`kind: "precedent"`, `license: "CC-BY-SA-4.0"`, `contributor.name: "HMAC"`), tối đa 500 bản ghi một tệp.
6. **Chạy** (trước mỗi lô: `git pull origin hmac/tb-tchq-toan-van && git merge origin/main` để có script gộp mới nhất):
   ```bash
   npm run validate:community
   npm run data:merge-community      # tự thay bản ghi mỏng cùng số hiệu + mã + mặt hàng
   npm run data:backfill-sources
   npm test
   ```
7. **Cập nhật sheet** cho từng dòng của lô:
   - **J** = `Xong` / `Không kết luận` / `Lỗi nguồn` / `Bỏ qua` (bỏ qua khi thông báo thực ra đã có);
   - **K** = số bản ghi;
   - **L** = tên tệp, sau khi có PR thì thay bằng link PR;
   - **M** = ngày `YYYY-MM-DD`.
8. **Commit** lên nhánh `hmac/tb-tchq-toan-van` theo mẫu `data(tb-tchq): HMAC lô <n> — <k> thông báo, <r> bản ghi`. Mỗi 4 lô (khoảng 100 thông báo) mở **một PR**. Ghi trong PR:
   - số dòng sheet đã xử lý;
   - các thông báo "Không kết luận" và "Lỗi nguồn";
   - 5 bản ghi mẫu đặt cạnh trích đoạn toàn văn.

### Nhịp độ và an toàn tài khoản

- Nghỉ **ít nhất 8–10 giây** giữa hai trang, không quá **300 trang/ngày**, nghỉ hẳn khi trang báo giới hạn hoặc đòi xác minh. Tài khoản TVPL của CEO quan trọng hơn tốc độ.
- Không tải hàng loạt, không chạy script gọi thẳng máy chủ TVPL. Chỉ dùng trình duyệt.
- **Không commit** HTML hoặc toàn văn TVPL vào repo (bản quyền trình bày của TVPL). Chỉ commit bản ghi đã trích, kèm `source.url`.

## Giai đoạn 2 — làm giàu 768 bản ghi "Đã có" còn mỏng

Danh sách: [`docs/giao-viec/hmac-bo-sung.csv`](hmac-bo-sung.csv). Cột `thieu` cho biết bản ghi thiếu gì, `source_url` là trang cần mở.

| Ưu tiên | Số bản ghi | Thiếu |
|---|---|---|
| 1 | 513 | Mô tả + lý do (nhập từ bảng cũ, chỉ có tên hàng + mã) |
| 2 | 216 | Lý do dưới 150 ký tự |
| 3 | 39 | Chỉ thiếu ngày ban hành |

Trích lại **cùng số hiệu, cùng mã, cùng mặt hàng** vào tệp `hmac-bo-sung-<ngày>.json`. Khi chạy `data:merge-community`, bản mỏng tự được thay, không sinh dòng trùng. Tiến độ giai đoạn này ghi trong mô tả PR, không ghi lên sheet.

## Việc kèm theo (wiki)

Lấy PDF gốc và trích bảng mã HS của **19/2024/TT-BYT** (danh mục thiết bị y tế đã xác định mã HS). TT 24/2026/TT-BYT dẫn chiếu sang văn bản này. Chi tiết: [oz-wiki-plhq#73](https://github.com/ozvietnam/oz-wiki-plhq/issues/73).

## Xong khi

- Tab **Tổng hợp**: ưu tiên 1 và 2 đạt 100% đã xử lý; ưu tiên 3 làm dần.
- Mỗi PR có `npm test` xanh, không đụng `data/oz-export/`, không có thông tin doanh nghiệp.
- Claude (phiên quản lý) duyệt và gộp PR. HMAC không tự gộp vào `main`.
