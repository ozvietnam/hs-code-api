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

## 🛑 Rà soát lần 2 (05/10, 21h) — đọc trước tiên

**Kết quả:** lô 25 đạt và **đã gộp vào main** (PR #140, thay 25 bản mỏng). Các lô còn lại **chưa gộp được**.
Lần sửa trước qua được bộ kiểm, nhưng dữ liệu sai nặng hơn:

- **15 bản ghi bị ĐỔI MÃ cho khớp lý do lấy từ văn bản khác.** Trang TVPL trả về thông báo khác số hiệu cần lấy,
  agent con chép lý do của thông báo đó rồi sửa `hsCode` theo. Ví dụ: thép thanh 4065 → 3824.99.99; thép cán phẳng
  1332 → 3824.99.99; thép thanh làm khuôn 1703 → 3105.90.00 (phân bón); sô cô la 3261 → 3402.11.90 (chất hoạt động bề mặt).
- **7 mô tả được viết thêm cho đủ 20 ký tự.** Ví dụ 3819 "The Vzusa — thép không hợp kim dạng thanh…" trong khi mã là
  9019.10.10 (máy xoa bóp).

Dữ liệu này là bằng chứng người khai đưa cho Hải quan. **Một mã sai tệ hơn mười mã thiếu.**

### Luật mới (bộ kiểm chặn từ tệp `submittedAt` ≥ 2026-10-06)

1. Mỗi bản ghi có **`evidence.soHieu`** (dòng "Số: …" chép từ chính trang đang mở) và **`evidence.ketLuan`**
   (câu kết luận nguyên văn có mã số). Số hiệu trên trang khác số hiệu cần lấy → trang sai → `Lỗi nguồn`.
2. **`hsCode` lấy từ `evidence.ketLuan`.** Không bao giờ sửa mã, sửa mô tả hay thêm chữ để bộ kiểm qua.
   Bộ kiểm báo lỗi nghĩa là **cách đọc sai**: mở lại trang, đọc lại, không được thì ghi `Lỗi nguồn` / `Không kết luận`.
3. **Không dùng agent con để trích.** HMAC tự đọc từng trang, tuần tự. Agent con chỉ được dùng để soát lại.
4. `description` chép từ văn bản (tên hàng + đặc tính). Không viết thêm "— …" theo hiểu biết riêng.

### Việc tiếp theo, theo thứ tự

1. **Làm lại 131 bản ghi** trong [`hmac-lam-lai.csv`](hmac-lam-lai.csv), ưu tiên 1 → 3:
   - **Ưu tiên 1 (22):** mã bị đổi hoặc mô tả tự viết. Mở lại đúng thông báo, nếu URL trả văn bản khác thì tìm trên
     TVPL theo số hiệu + năm.
   - **Ưu tiên 2 (60):** lô agent con 5–22 và mô tả bị cắt. Đọc lại toàn bộ.
   - **Ưu tiên 3 (49):** lô 2–4 do HMAC tự làm, lý do đã ổn. Chỉ cần mở trang, chép `evidence`, sửa mô tả bị cắt.

   Ghi vào **tệp mới** `hmac-2026-10-06-lam-lai-<n>.json` (`submittedAt: "2026-10-06"`). **Xoá** các tệp lô cũ
   (`lot-2…lot-22`, trừ `lot-25` đã gộp) trong cùng commit, để không còn bản sai nằm trên nhánh.
2. **Sheet:**
   - cột **M** = ngày làm xong, không phải ngày ban hành;
   - ghi đủ các dòng lô 5–22;
   - dòng nào đã gộp (lô 25) thì cột L ghi `PR #140`.
3. **Mở PR** khi xong ưu tiên 1 và 2, kèm 5 bản ghi mẫu đặt cạnh `evidence`. Claude duyệt từng PR, gộp phần đạt.
4. Sau đó mới tiếp **Giai đoạn 1 ưu tiên 2** (2018–2021, còn khoảng 310 thông báo), theo đúng luật mới.
   **Tối đa 25 thông báo một lần**, làm xong một lô thì chạy bộ kiểm và commit.

## ⚠️ Rà soát 05/10 tối — sửa trước khi làm lô mới

Claude rà 164 bản ghi đầu tiên (lô thử → lô 18): 79 bản ghi đạt, **85 bản ghi lỗi**. Từ nay
`npm run validate:community` chặn các lỗi này (PR #135). Chạy lệnh đó sẽ thấy từng bản ghi lỗi.

| Lỗi | Gặp ở | Cách sửa |
|---|---|---|
| Mã giả `00000000` + mô tả "Hàng hóa theo Thông báo …" (22) | lô 2, 3, 4, 6, 7, 9, 10, 13, 15, 16, 18 | **Xoá bản ghi.** Lỗi nguồn / không kết luận / không phải TB phân loại chỉ ghi lên sheet (J + cột H lý do), không tạo bản ghi |
| Lý do bị cắt ở 315–316 ký tự (31) | lô 3, 4 | Script đang cắt chuỗi cố định. Bỏ giới hạn đó, lấy trọn chuỗi nhóm → phân nhóm → **mã số** (≤ 1000 ký tự) |
| Lý do trống hoặc giữ chỗ "thuộc nhóm hàng hóa xác định trước mã số" (38) | lô 2 (19 bản ghi không có lý do), 3, 4, 5 | Đọc lại toàn văn, chép nguyên văn phần kết luận |
| Lý do tự tóm tắt, dưới 150 ký tự (cảnh báo) | lô 5–18 (subagent) | Chép **nguyên văn** câu "thuộc nhóm … mã số …" kèm lời mô tả từng cấp, như lô 25. Lô 25 là mẫu tốt |
| Mô tả dưới 20 ký tự | "Bạc lót trục (shaft bearing)", "Nước cốt trà sữa"… | Thêm đặc tính quyết định: chất liệu, cấu tạo, công dụng |
| Trùng giữa hai tệp | 1005 (lô thử + lô 25), 4386 (lô 3 + lô 4) | Xoá `hmac-2026-10-05-lot-thu.json`; bỏ 4386 ở một trong hai lô |
| Đính chính không đổi mã (4844) | lô 16 | Không tạo bản ghi; sheet ghi `Xong`, K = 0, cột H nói đính chính gì |

**Sheet:**
- Cột **M** phải là **ngày làm xong** (2026-10-05), không phải ngày ban hành thông báo. Các dòng lô 25, 2, 3, 4 đang ghi ngày ban hành, cần sửa.
- Lô 5–21 (subagent) **chưa ghi gì lên sheet**. Tab Tổng hợp mới đếm 116 bản ghi, trong khi nhánh đã có hơn 180.

**URL TVPL "chết" hoặc trỏ sang văn bản khác:** tìm trên TVPL theo số hiệu + năm để lấy URL mới, giống cách đã làm với 2131
(518021 → 519110). Ghi URL mới vào `source.url` và cột H của sheet. Chỉ khi tìm không ra mới ghi `Lỗi nguồn`.

**Nhịp độ:** chạy subagent song song vẫn phải giữ ≥ 8 giây giữa hai lần mở trang **trên cả máy** và ≤ 300 trang/ngày.
Chất lượng quan trọng hơn số lượng: bản ghi lỗi sẽ không được gộp vào kho.

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


## 🛑 TẠM DỪNG HMAC TRÍCH TB-TCHQ (07/10/2026)

**Lý do**: Sau nhiều vòng sửa, dữ liệu vẫn có lỗi hệ thống:
- 26/162 bản ghi có mã HS và mô tả ghép từ 2 nguồn khác nhau (vd 4034 mã dây thép nhưng mô tả "sợi bông", 3027 mã gối đỡ trục nhưng mô tả "vải ren")
- Validator chỉ check schema, KHÔNG check ngữ nghĩa
- Nguy cơ lọt dữ liệu sai vào kho công khai

**Quyết định**: Dừng giao HMAC đọc TB-TCHQ. PR #139 đã đóng (07/10/2026).

**Khuyến nghị**:
1. Chuyển phần việc cho Thợ 2 hoặc người làm tay
2. Nếu dùng agent: chỉ lưu nguyên văn trang, người review viết bộ tách và đối chiếu

**Bài học**: MÃ và MÔ TẢ phải đọc từ CÙNG MỘT VĂN BẢN. Không ghép từ nguồn khác (CSV tổng hợp + văn bản TB cụ thể).


## 📌 Lô 25 TBs ưu tiên 1 năm 2025 (P1) - CẦN NGƯỜI LÀM TAY (07/10/2026)

**Lý do HMAC không làm được:**
- 25 URLs từ `hmac-bo-sung.csv` ghi năm 2025, nhưng thực tế TVPL lưu với năm khác (2023/2024). Tất cả URLs return `pagenotfound.htm`
- Tìm URL đúng thất bại: Google rate-limit scrapling, DuckDuckGo 202, caselaw.vn/luatvietnam.vn/hethongphapluat.com/dulieuphapluat.vn đều không có văn bản này
- Browser-harness không detect Chrome 9222 của anh
- Subagent thất bại sau 50 lần web_search

**Danh sách 25 TBs cần đọc văn bản gốc (TÊN HÀNG + MÃ HS):**
- 49, 51 (AscentComTech SFP)
- 57 (MS Hoof Clean)
- 64 (Màng nhựa EVA)
- 70, 71 (Thức uống sữa chà là / nước dừa)
- 99, 101, 102 (Phụ kiện nhựa 37A7/MEC/MKC)
- 103 (Màn hình Siemens SIMATIC HMI)
- 118 (Bột lúa mạch sô cô la)
- 143 (KLENZIT MS)
- 144 (SYSTANE Gel Drops)
- 146 (Pink guava puree)
- 150 (ASSY-EU FAN MODULE)
- 151 (Passion fruit juice powder)
- 170, 171, 172, 173 (COPPER GLEAM HVS-202 A/B/BN/AN)
- 187 (Acerola spray)
- 188 (MS GOLDDUST)
- 189, 190 (C4 Thô / C4 Raffinate-1)
- 191 (Glentaz Forte)

**Quy trình cho người làm tay:**
1. Vào Sheet1 cột B, tìm URL đúng cho từng TB (Ctrl+F số TB)
2. Mở URL trong Chrome (đã đăng nhập TVPL) - KHÔNG dùng curl
3. Đọc "Số: XXX/TB-TCHQ" verify khớp
4. Đọc "Tên hàng theo khai báo" (≥40 ký tự)
5. Đọc "thuộc mã số XXXX.XX.XX" - lấy 8 số
6. Lưu vào `/tmp/hs-code-api-hmac/data/community/tb-tchq/hmac-2026-10-07-lot3-p1.json` (schema từ CONTRIBUTING.md)

**Bài học bổ sung**: Khi đã verify được scrapling bypass Cloudflare với URL ĐÚNG (test thành công TB 1005/TB-TCHQ/2025) → công cụ work, chỉ thiếu URLs. Có thể dùng scrapling thay browser thật cho batch lớn.
