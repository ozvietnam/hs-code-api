# Giao việc: Thợ 2 — lấy toàn văn TB-TCHQ 2014–2017 (ưu tiên 3)

- **Giao:** 2026-10-06, CEO duyệt. Người duyệt và gộp: Claude (phiên quản lý). Thợ không tự gộp vào `main`.
- **Phạm vi:** **2.538 thông báo "Cần lấy" ưu tiên 3** (2014–2017), danh sách ở
  [`tb-tchq-uu-tien-3.csv`](tb-tchq-uu-tien-3.csv). HMAC đang làm ưu tiên 1–2 (2018–2025): **không đụng dòng của HMAC**.
- **Bảng quản lý (làm chung):** [Google Sheet "URL_TB-TCHQ2025 5911 dòng"](https://docs.google.com/spreadsheets/d/1iwpYYmkeFousK2CFaSyzUSPCsqIcF4atJ2K9yLPQYxc/edit).
  Tab **Tổng hợp** tự đếm tiến độ, tab **Sheet1** là hàng đợi.
- **Nhánh:** tạo từ `main`, đặt tên `tho2/tb-tchq-2014-2017` (đổi `tho2` thành tên của bạn nếu muốn, nhưng giữ nguyên
  suốt đợt). Mỗi ~50 bản ghi mở **một PR** vào `main`.

Đọc trước khi làm: [`docs/huong-dan-trich-tb-tchq.md`](../huong-dan-trich-tb-tchq.md). Tệp đó quy định lấy trường gì,
cấm lấy gì. Tài liệu này nói **làm theo thứ tự nào, ghi ở đâu**, và các bài học từ đợt đầu.

## Vì sao luật chặt

Dữ liệu này là **bằng chứng người khai đưa cho Hải quan** (ERP gợi ý "đã có tiền lệ TB-TCHQ"). Một mã sai tệ hơn
mười mã thiếu. Đợt 05/10 có agent con đọc nhầm văn bản rồi **đổi mã cho khớp lý do** (thép thanh → 3824.99.99,
sô cô la → 3402.11.90) và viết thêm mô tả cho đủ độ dài. Bộ kiểm `npm run validate:community` giờ chặn các lỗi đó.

## 1. Chuẩn bị (một lần)

```bash
git clone https://github.com/ozvietnam/hs-code-api.git && cd hs-code-api
npm ci
git checkout -b tho2/tb-tchq-2014-2017 origin/main
npm run validate:community   # phải "0 lỗi"
```

Cần **trình duyệt thật** (Chrome) mở được thuvienphapluat.vn. Không dùng script gọi thẳng máy chủ TVPL, không lách
Cloudflare/captcha.

## 2. Vòng làm một lô (25 thông báo)

Cột `lo` trong CSV đã chia sẵn 102 lô, **làm từ lô 1** (năm 2017 trước, rồi 2016 → 2014, cuối cùng là các dòng chưa rõ năm).

1. **Nhận việc trên sheet.** Với từng dòng của lô, đến đúng **dòng `hang_sheet`** trong Sheet1 (cột A = `hang_sheet − 1`,
   hoặc Ctrl+F đuôi số của URL). Ghi **I = `Thợ 2`** (hoặc tên bạn), **J = `Đang làm`**. Dòng nào cột I đã có tên người
   khác thì **bỏ qua**.
2. **Mở URL** trong Chrome, đọc toàn văn. Kiểm **dòng "Số: …" ở đầu văn bản** có đúng `so_hieu` không.
   - Khác số (TVPL hay trả về văn bản khác) → tìm trên TVPL theo "số hiệu + TB-TCHQ + năm". Vẫn không ra → **J = `Lỗi nguồn`**,
     cột H ghi lý do. **Không lấy gì từ trang sai.**
   - Thông báo không kết luận mã (trả hồ sơ, không đủ cơ sở) → **J = `Không kết luận`**.
   - Không phải thông báo phân loại (phí, tem, giám sát…) → **J = `Bỏ qua`**, H ghi lý do.
3. **Trích bản ghi** — mỗi mặt hàng có kết luận mã là một bản ghi:

   | Trường | Lấy gì |
   |---|---|
   | `hsCode` | Mã **kết luận**, bỏ dấu chấm, lấy từ câu kết luận (không lấy mã doanh nghiệp khai) |
   | `description` | Hàng **THỰC TẾ theo kết luận** + đặc tính quyết định (chất liệu, cấu tạo, công dụng, thông số). **≥ 40 ký tự**, chép từ văn bản. Hàng khai khác hàng thực tế thì ghi hàng thực tế, có thể thêm "(khai báo: …)" |
   | `reasonVi` | **Nguyên văn** chuỗi "thuộc nhóm … phân nhóm … mã số …" kèm lời mô tả từng cấp + căn cứ văn bản nêu. 80–1000 ký tự |
   | `source` | `type: "TB-TCHQ"`, `reference` nguyên văn (`8412/TB-TCHQ`), `issuedDate` (ngày ký, `YYYY-MM-DD`), `url` trang đã đọc |
   | `attributes.bieuThue` | **`"2012"`** cho mọi thông báo ký trước 01/01/2018 (TT 156/2011, TT 103/2015). Bộ kiểm chặn nếu sai |
   | `attributes.loaiTB` | `KET_QUA_PHAN_LOAI` / `XAC_DINH_TRUOC` / `DINH_CHINH` |
   | `attributes.ptpl` | Số thông báo kết quả phân tích nếu có (`1586/TB-PTPL`) |
   | `evidence.soHieu` | Dòng "Số: …" **chép từ chính trang đã mở** |
   | `evidence.ketLuan` | Câu kết luận nguyên văn **có mã số**; phải nằm trong `reasonVi` |
   | `girRule` | **Chỉ khi văn bản viện dẫn rõ** "Quy tắc 1/3(b)…". Không tự suy |

   **Cấm** trong mọi trường: tên doanh nghiệp, địa chỉ, mã số thuế, số/ngày tờ khai, chi cục, trị giá.
4. **Ghi tệp** `data/community/tb-tchq/tho2-<YYYY-MM-DD>-lo-<n>.json` (một tệp một lô):

   ```json
   {
     "kind": "precedent",
     "contributor": { "name": "Thợ 2" },
     "license": "CC-BY-SA-4.0",
     "submittedAt": "2026-10-06",
     "records": [ { "hsCode": "...", "description": "...", "source": { ... }, "attributes": { ... },
                    "reasonVi": "...", "evidence": { "soHieu": "...", "ketLuan": "..." } } ]
   }
   ```
   `submittedAt` là ngày bạn nộp (từ 2026-10-06 trở đi — để bộ kiểm áp đủ luật).
5. **Chạy, phải 0 lỗi rồi mới commit:**
   ```bash
   git fetch origin main && git merge origin/main     # lấy bộ kiểm mới nhất
   npm run validate:community
   npm test
   ```
   Bộ kiểm báo lỗi nghĩa là **cách đọc sai**: mở lại trang, đọc lại. **Không bao giờ** sửa mã, sửa mô tả hay thêm chữ
   cho bộ kiểm qua. Không lấy được đúng thì ghi `Lỗi nguồn` / `Không kết luận`.
6. **Cập nhật sheet** từng dòng: **J** = `Xong` / `Không kết luận` / `Lỗi nguồn` / `Bỏ qua`; **K** = số bản ghi;
   **L** = tên tệp (sau có PR thì thay bằng link PR); **M** = **ngày làm xong** (`2026-10-06`), không phải ngày ban hành.
7. **Commit** `data(tb-tchq): Thợ 2 lô <n> — <k> thông báo, <r> bản ghi`. Hai lô (~50 bản ghi) thì push và mở PR, ghi:
   - các dòng sheet đã xử lý, các thông báo `Lỗi nguồn` / `Không kết luận`;
   - 3 bản ghi mẫu (mã, mô tả, `evidence.ketLuan`).

## 3. Nhịp độ và an toàn

- **Tự đọc tuần tự.** Không giao việc trích cho agent con. Agent con chỉ được dùng để soát lại.
- Nghỉ **8–10 giây** giữa hai trang, **≤ 300 trang/ngày**. Trang báo giới hạn hoặc đòi xác minh thì dừng hẳn.
- **Không commit** HTML/toàn văn TVPL vào repo. Chỉ commit bản ghi đã trích + `source.url`.
- Không đụng `data/oz-export/`, `.env`, dữ liệu khách hàng.

## 4. Xong khi

- Tab **Tổng hợp**: dòng "3 — 2014–2017" tăng đều; mỗi PR `validate:community` 0 lỗi, CI xanh.
- Claude duyệt từng PR (soát ngẫu nhiên mã ↔ mô tả ↔ evidence) và gộp phần đạt.
