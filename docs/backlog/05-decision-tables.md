# Bước 5 — Nạp bảng quyết định: tìm đúng chỗ trước khi tốn công chuyên gia

**Ngày:** 2026-09-07 · **Trạng thái:** ⚙️ Đã dựng công cụ + sửa 2 lỗi hệ thống; việc nạp bảng là dài hạn

## Cách tiếp cận

Bảng quyết định là thứ duy nhất kéo được độ chính xác lên, nhưng mỗi bảng tốn
công **chuyên gia thật**: đọc chú giải, đối chiếu tiền lệ, xác định dữ kiện phân
biệt. Có 11.871 mã — không thể làm hết, nên bước này không cố soạn thật nhiều
bảng, mà **tìm đúng chỗ đáng làm** và **sửa những lỗi hệ thống nằm dưới**.

Toàn bộ kết luận dưới đây đo từ `data/accuracy-report-2026-05-28.json` — 200 tờ
khai thật, không phải phỏng đoán.

## PHÁT HIỆN 1 — Chương 98 gây 10% lỗi, đúng 0 lần ✅ đã sửa

| Số đo | Giá trị |
|---|---|
| Lỗi do hệ thống đoán vào chương 98 | **19/184 = 10%** |
| Tờ khai thật có đáp án thuộc chương 98 | **0/200** |

Chương 98 là chương quy định **thuế suất nhập khẩu ưu đãi RIÊNG**, chỉ áp dụng
khi doanh nghiệp đủ điều kiện và chủ động khai theo chế độ đó. Với câu hỏi "mặt
hàng này mã gì", đáp án luôn ở chương 01–97.

**Đã sửa:** `lib/chapter98.js` — loại chương 98 khỏi ứng viên mặc định, giữ lại
khi người dùng chủ động hỏi (`?includeChapter98=1` hoặc gõ "9845"). Không bao giờ
trả rỗng chỉ vì lọc. 31 test, gồm test tự đo lại bằng chứng trên benchmark để nếu
dữ liệu đổi mà chương 98 bắt đầu xuất hiện trong đáp án thật thì CI sẽ báo.

**Hệ quả phụ đã xác minh 1:1:** 457 mã "thiếu VAT" trong báo cáo chất lượng dữ
liệu **chính là** 457 mã chương 98. Chúng không thiếu dữ liệu — mã ưu đãi riêng
không có VAT độc lập, VAT đi theo mã thông thường tương ứng.
**→ Đây là câu trả lời cho việc rà soát còn treo ở Issue #34 mục 3.**

## PHÁT HIỆN 2 — Thiên vị mã cụ thể, một chiều tuyệt đối ⚙️ đã cảnh báo, chưa tự sửa

| Số đo | Giá trị |
|---|---|
| Tờ khai thật có đáp án là mã "Loại khác" | **103/200 = 52%** |
| Hệ thống đoán đúng nhóm này | **1,0%** |
| Đoán đúng mã cụ thể | 14,4% |
| Lỗi cùng nhóm 4 số: đúng là "Loại khác" nhưng đoán mã cụ thể | **25/34 = 74%** |
| Chiều ngược lại | **0%** |

**Hơn một nửa hàng nhập khẩu thật rơi vào mã "Loại khác", và đúng chỗ đó hệ thống
gần như luôn sai.** Thiên vị hoàn toàn một chiều.

Nguyên nhân: mô hình nhìn mô tả chi tiết rồi khớp với phân nhóm nào *nghe chi
tiết giống nhất*. Nhưng luật không hoạt động vậy — một phân nhóm cụ thể chỉ áp
dụng khi hàng hoá **thoả điều kiện** của nó; không thoả thì rơi về "Loại khác".
GIR 3(a) nói "mô tả cụ thể nhất được ưu tiên", nhưng "cụ thể nhất" nghĩa là nhóm
mà hàng hoá **thực sự đáp ứng**, không phải nhóm có tên dài nhất.

**Đã làm:** `lib/residual-guard.js` — kiểm bằng chứng: nếu mô tả không nêu bất kỳ
điều kiện đặc trưng nào của mã cụ thể đã chọn, cảnh báo và đề xuất mã residual
cùng cấp, kèm lý do dẫn GIR 3(a).

**Đo thật trên 196 mẫu: bật 47 lần (24%), sửa 3 / hỏng 1 — lãi ròng +2
(6,12% → 7,14%).**

**Vì sao CHỈ CẢNH BÁO, không tự ghi đè:** lãi ròng quá mỏng để tin trên dữ liệu
khác. Chẩn đoán cho thấy 16/26 ca cần **định tuyến đúng nhánh 6 số trước** — vd
"bộ nguồn" phải vào 8504.40 (bộ biến đổi tĩnh) chứ không phải 8504.31 (máy biến
áp); chọn đúng nhánh rồi mới nói tới residual. Đó đúng là việc của bảng quyết
định, không phải của bộ lọc này. Ghi đè tự động lúc này là mua rủi ro để đổi lấy
+1%.

Test có ràng buộc chặn tự lừa mình: nếu sau này lãi ròng vượt 10 thì test sẽ đỏ
để buộc xem lại chính sách "chỉ cảnh báo".

## ĐÃ LÀM — công cụ chỉ chỗ

`scripts/build-conflict-worklist.mjs` → `data/conflict-worklist.json`

Đọc lỗi thật, gom thành cụm, xếp hạng theo mức thiệt hại. Nhân đôi điểm cho lỗi
**cùng nhóm 4 số** vì đó chính là khoảng cách 64,9% (đúng nhóm) → 24,6% (đúng đủ
mã) đang mất, và là thứ bảng quyết định giải trực tiếp.

Độ phủ hiện tại: **14/11.871 mã (0,12%)** qua 4 bảng (thêm `CF-valve-pneumatic-vs-other` cho cụm 8481).

10 cụm đáng làm trước (đã loại chương 98):

| Điểm | Cụm | Lỗi | Loại |
|---|---|---|---|
| 8,4 | 8481 | 3 | cùng nhóm (**đã có bảng** `CF-valve-pneumatic-vs-other`, 2026-09) |
| 6,0 | 8537 | 3 | cùng nhóm |
| 6,0 | 8443 | 3 | cùng nhóm |
| 6,0 | 8536 | 3 | cùng nhóm |
| 4,0 | 4202 | 2 | cùng nhóm |
| 4,0 | 6402 | 2 | cùng nhóm |
| 3,4 | 8504 | 4 | cùng nhóm (đã có bảng) |
| 3,0 | 8534 vs 9031 | 3 | khác nhóm |
| 3,0 | 8513 vs 9405 | 3 | khác nhóm |
| 2,8 | 8412 vs 8466 | 2 | khác nhóm (đã flag) |

## VIỆC MỞ RỘNG

### D-1 · Soạn bảng quyết định cho 10 cụm đầu — P0 · ⚙️ đã làm 8481; còn 9 cụm

Việc chính của cả bước này, và là việc **cần chuyên gia**, không phải AI làm thay.
Với mỗi cụm: đọc `data/chu-giai-heading.json` của các nhóm liên quan → xác định
DỮ KIỆN phân biệt → soạn rule vào `data/conflict-tables.json` (mỗi rule cần `gir`
+ `reasonVi` + `source`).

**Đã làm 8481 (2026-09):** thuộc tính `valveCircuit` + bảng `CF-valve-pneumatic-vs-other`.
GIR 1 từ heading 8481.20 (van truyền động oleohydraulic/pneumatic). 3 lỗi benchmark
đều là van khí nén bị đoán thành van nhiên liệu xe / van bếp.

Cụm tiếp theo: **8537, 8443, 8536**, rồi 8504 (định tuyến 6 số — D-3).

### D-2 · Thêm cờ `verified` cho bảng quyết định — P0 · ✅ xong 2026-09-08

Bảng cộng đồng chưa kiểm chứng không được đội lốt `RULE_TABLE`.

Đã làm:
- Mỗi bảng trong `data/conflict-tables.json` có `verified` + `verifiedBy` + `verifiedAt`. 4 bảng nội bộ hiện tại: `verified: true`.
- `conflict-resolver` trả `tableVerified`.
- `lib/gir.js` chỉ cấp `RULE_TABLE` khi `tableVerified === true`; thiếu cờ hoặc `false` → `HEURISTIC`.
- Test khoá: bảng verified → RULE_TABLE; bảng cộng đồng / thiếu cờ → HEURISTIC.

### D-3 · Định tuyến đúng nhánh 6 số — P1 · ~1 tuần

Chẩn đoán ở phát hiện 2: 16/26 ca sai vì chọn nhầm nhánh 6 số ngay từ đầu. Cần
tầng quyết định ở **cấp phân nhóm 6 số** trước khi xuống 8 số — đúng tinh thần
GIR 6 (chỉ so các phân nhóm cùng cấp).

Đây nhiều khả năng là đòn bẩy lớn hơn cả bảng 8 số.

### D-4 · Chạy lại benchmark sau mỗi thay đổi — P0 · ~4h

Có 2 báo cáo với kết quả rất khác nhau: 2026-05-28 (200 mẫu, top-1 **7,54%**) và
bản công bố tháng 7 (57 mẫu, top-1 **24,6%**). Chênh lệch này chưa được giải
thích — có thể do pipeline đổi, có thể do bộ mẫu khác nhau.

**Không có đường cơ sở đáng tin thì mọi cải tiến sau này đều không chứng minh
được.** Cần chạy lại cả hai bộ mẫu trên pipeline hiện tại, ghi rõ commit SHA, và
công bố. Cần máy có key LLM (Issue #36).

### D-5 · Chú giải chưa có ngày hiệu lực — P1 · ~1 tuần

`data/chu-giai-*.json` không có trường `hieuLucTu` / `vanBan`. Khi Bộ Tài chính
ban hành thông tư biểu thuế mới, chú giải đổi mà hệ thống không biết mình đang
dùng bản cũ — và giờ AI bên ngoài đang tra thẳng vào đây.

Việc: thêm `hieuLucTu`, `vanBan`, `capNhatLuc` cho từng chú giải; `/api/notes` trả
kèm; cảnh báo khi chú giải cũ hơn biểu thuế đang dùng. (Đã nêu ở sổ bước 2.)

### D-6 · Đo riêng độ chính xác trên nhóm "Loại khác" — P1 · ~4h

52% hàng thật rơi vào nhóm này mà chỉ đúng 1%. Cần tách chỉ số này ra khỏi con số
tổng và công bố riêng — nếu không, mọi cải tiến ở nhóm mã cụ thể sẽ che mất việc
nửa lượng hàng thật vẫn đang sai.

## DUY TRÌ THEO THỜI GIAN

| Nhịp | Việc | Vì sao |
|---|---|---|
| **Sau mỗi lần đổi pipeline/prompt** | Chạy lại benchmark, ghi commit SHA, cập nhật `/community-data.json` | Không đo thì không biết mình đang tiến hay lùi |
| **Hằng tháng** | Chạy lại `npm run data:conflict-worklist`, xem cụm nào mới nổi lên | Hàng hoá nhập khẩu đổi theo mùa và theo thị trường |
| **Hằng quý** | Rà bảng quyết định: chú giải viện dẫn còn hiệu lực không, tiền lệ còn áp dụng không | Bảng dẫn văn bản hết hiệu lực là bằng chứng phản tác dụng khi giải trình |
| **Khi TCHQ ra TB phân loại mới** | Bổ sung `precedents.json`; nếu là cụm hay nhầm thì dựng bảng luôn | Tiền lệ mới là căn cứ mạnh nhất, để nguội thì mất giá trị |
| **Khi biểu thuế mới ban hành** | Kiểm mọi `members` của bảng quyết định còn tồn tại không; mã bị bãi bỏ phải gỡ khỏi bảng | Bảng trỏ vào mã đã bãi bỏ là sai nghiêm trọng và âm thầm |
| **Hằng năm** | Rà lại chính sách chương 98 — nếu chế độ ưu đãi riêng thay đổi thì giả định nền của `lib/chapter98.js` phải xem lại | Chính sách ưu đãi thay đổi theo nghị định |

> **Điều quan trọng nhất của bước này:** hai lỗi hệ thống vừa tìm ra (chương 98
> và thiên vị mã cụ thể) **không nằm ở việc thiếu bảng quyết định**, mà ở giả
> định sai trong cách chọn ứng viên. Chúng chỉ lộ ra khi đo trên tờ khai thật.
> Bài học: **đo trước, sửa sau.** Trước khi đổ công soạn hàng trăm bảng, hãy chạy
> D-4 để có đường cơ sở đáng tin đã.
