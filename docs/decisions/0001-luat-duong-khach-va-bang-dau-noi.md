# ADR-0001 — Luật đường khách và bảng đấu nối

- **Ngày:** 21/11/2026
- **Trạng thái:** đề xuất (chờ soát PR)
- **Người quyết:** QT, theo yêu cầu của CEO
- **Thay thế:** không. Đây là ADR đầu tiên của repo; các quyết định trước nằm rải ở `CLAUDE.md`, `docs/backlog/`, issue.

## Bối cảnh

CEO, 21/11/2026: *"có mấy việc mà sửa đi sửa lại cả tháng… càng code càng nát… cái nào sai bằng luật thì chỉnh luôn
lại cả luật để agent sau không tái phạm."*

Cùng ngày lộ một chuỗi lỗi vận hành cùng gốc:

1. PR #1517 đổi prompt + thêm lượt LLM cho `/api/identify`, đo ở dev bằng Gemini flash đúng 10/10; lên máy thật (chuỗi
   mô hình khác) sai nhóm 5/10, phải hoàn nguyên (#1519). Công tắc mặc định BẬT, không quay lui được.
2. Cho LLM tự đoán nhóm 4 số rồi kéo sổ tay nhóm đó ra hỏi: đoán sai là cả bộ câu hỏi sai (PLC bị hỏi về van). Một bản
   khác đoán nhóm bằng tìm từ khoá, test xanh "nhờ may".
3. Sổ tay nhóm (1.243) và sổ ranh giới PN6 (2.140) mỗi đường tự nối riêng sau cờ riêng: `/api/identify` không đọc;
   `/api/classify` nhánh `earlyExitHoiTuR1` bỏ vòng 2 nên bỏ luôn sổ tay dù `HS_SO_TAY=full`; van khí nén 5/2 ra
   `848180` thay vì `848120`.
4. `soTay.outcome: "NONE"` là giá trị khởi tạo, bị đọc thành "đã tra, không có gì".
5. `HS_HO_SO=shadow` chờ dựng hồ sơ (~13 giây, LLM trả tiền) rồi mới trả khách; số đo thiếu bên gọi, thiếu lượt bỏ
   qua, thiếu chi phí; "chạy bóng 5 ngày rồi trình bật" không có chủ nên nằm im.
6. `docs/backlog/08` ghi `gates` trong khi `Dockerfile` đặt `full`.
7. "Rơi về LLM 3.652 phân nhóm" trong đó 2.924 là phân nhóm 1 dòng; `rotVeMay 64%` gộp cả bản nháp.
8. Đo lặp ở dev làm Brave / DDG / Google khoá IP chung; máy tìm kiếm của máy thật mất hết nguồn.
9. PR xếp chồng gộp sai thứ tự, mất một vòng CI 27 phút.

Soát luật hiện có trước khi viết thêm:

- **Đã có luật đúng mà vẫn phạm** (thiếu cổng máy, không thiếu chữ): `CLAUDE.md` luật 9 quy tắc 5 đòi "đo trực tiếp
  hành vi trước / sau trên dữ liệu thật"; `docs/van-hanh/bat-ho-so-shadow.md` ghi "khách nhận phản hồi y như cũ" và "5
  ngày rồi trình"; `scripts/test-doc-counts.mjs` giữ số đếm trong tài liệu khớp dữ liệu nhưng không giữ giá trị cờ;
  `CLAUDE.md` luật 2 đã có mẫu "khai tường minh + test" cho đường công khai nhưng chưa có cho đấu nối tri thức.
- **Luật sai / lỗi thời / mâu thuẫn:** `CLAUDE.md` còn ghi "CEO là solo dev", "code direct main", "push origin main"
  trong khi luật 9 cấm tự gộp; "12 file handler" (thật 15); "check 7 rule" (thật 9); luật 7b ghi sổ tay "không đổi
  prompt LLM" trong khi `HS_SO_TAY=full` có đổi. `AGENTS.md` mục 3 ghi thứ tự của `lib/classify.js` trong khi máy thật
  chạy `lib/engine-loop.js`. `docs/TONG-QUAN.md` ghi mọi endpoint cần Bearer. `docs/backlog/08` dòng 16 và
  `docs/backlog/README.md` hàng 8 ghi trạng thái sổ tay của tháng 10.
- **Chưa có luật:** công tắc mặc định tắt + đo bằng chuỗi mô hình máy thật; một lõi câu hỏi; ai được quyết nhóm; bảng
  đấu nối; chủ + ngày xét của cờ bóng; "chưa kiểm" khác "không có"; mẫu số của chỉ số; đo tra web ở dev; thứ tự gộp PR
  xếp chồng. Repo cũng chưa có `docs/decisions/`, mẫu PR, hay tệp bàn giao.

## Quyết định

1. **Mười luật L1–L10** ở [`docs/luat-duong-khach.md`](../luat-duong-khach.md). `AGENTS.md` và `CLAUDE.md` chỉ trỏ tới,
   không chép lại.
2. **Hai bảng là nguồn sự thật, sửa trong cùng PR với mã:**
   - `data/luat/dau-noi.json` — đường vào nào đọc kho tri thức nào, qua module nào, sau cờ nào; nhánh nào bỏ qua; tệp
     nào dựng câu hỏi gửi khách.
   - `data/luat/bang-co.json` — mọi cờ `HS_*`: mặc định, chủ, mục đích, đoạn mã chứng minh; cờ `shadow` có chủ + ngày
     xét + tiêu chí.
3. **Chỗ nào làm được thì là cổng máy trong `npm test`, không chỉ là chữ:**

   | Cổng | Giữ luật | Bắt lại sự việc |
   |---|---|---|
   | `scripts/test-dau-noi.mjs` | L4 | 3 |
   | `scripts/test-cau-hoi-co-can-cu.mjs` | L2 | 2, 3 |
   | `scripts/test-bang-co.mjs` | L1 (mặc định tắt), L5 (chủ + ngày xét), L8 | 1, 5, 6 |
   | `scripts/kiem-pr-l1.mjs` + CI `Luat L1` | L1 (hỏi "đo bằng gì") | 1 |

   Các cổng đều tĩnh (đọc tệp, đồ thị `require`), không LLM, không mạng, mỗi cổng dưới 1 giây.
4. **Ngoại lệ đang đỏ được khai có số thẻ, và chỉ được ngắn đi** (trần cứng trong tệp test):
   - `/api/identify` chưa đọc sổ tay, câu hỏi theo bảng chương — OZV-1670.
   - `/api/classify`: câu hỏi do LLM viết; nhánh `earlyExitHoiTuR1` bỏ sổ tay — OZV-1707 (PR #1523 nối sau cờ).
   - `lib/classify-guards.js` (động cơ cũ) đổ chuỗi `missing` của LLM thành câu hỏi — OZV-1707.
   - 9 cờ cũ đổi quyết định LLM mà bật sẵn (`doiQuyetDinhLLMDangBatSan`).
5. **Bảng quyết định (`data/conflict-tables.json`) được tính là nguồn câu hỏi có căn cứ** bên cạnh sổ tay, sổ PN6 và
   trường khai theo nhóm: do người soạn, có văn bản gốc, đã chạy trên `/api/suggest` từ trước.
6. **Cờ bóng quá ngày xét làm `npm test` đỏ cho mọi PR.** Chủ ý: tài liệu "5 ngày rồi trình" không có chủ nên không ai lấy số. Gỡ
   bằng cách quyết, hoặc gia hạn có lý do (ghi vào `bong.giaHan`).
7. **Mẫu PR** `.github/pull_request_template.md` có dòng thứ tự gộp (L10), mục L1 mà CI đọc, và ô cho L2–L8.

## Không làm được bằng máy (và vì sao)

- **L1 "số đo lấy bằng chuỗi mô hình máy thật":** CI không có khoá máy thật và không được gọi Cổng. Cổng chỉ kiểm thân
  PR *có trả lời*; đúng sai do người soát.
- **L1 "tắt = như main (so băm)":** cần chạy động cơ với LLM giả trên hai cây; mỗi tính năng một bộ ca riêng. Chưa có
  khung chung. Giữ ở mức ô trong mẫu PR.
- **L3 "không tự đoán nhóm", L6, L7, L9, L10:** là phán đoán về ý nghĩa mã / số, không dò tĩnh được mà không báo oan.
  Giữ ở mẫu PR + người soát.
- **L4 theo nhánh lúc chạy:** đồ thị `require` chứng minh mã *nạp được* kho, không chứng minh nhánh nào cũng *dùng*.
  Nhánh bỏ qua phải khai tay ở `nhanhBoQua`.
- **L8 cho văn xuôi:** cổng bắt tên cờ không tồn tại trong tài liệu vận hành và `Dockerfile` lệch bảng; không đọc hiểu
  được câu "đã bật X trên máy thật" trong tài liệu lịch sử.
- **Cờ ngoài `HS_*`** (`LLM_*`, `GEMINI_*`, `LOOP_PROVIDER`…) quyết định chuỗi mô hình nhưng chưa vào bảng cờ.
- **Giá trị thật trên máy thật** (`hs.env` trên .120) không nằm trong repo; cột `dangChayMayThat` do QT khai.

## Hệ quả

- PR nào thêm route, thêm cờ `HS_*`, thêm nơi dựng câu hỏi, hay nối kho tri thức mà không sửa bảng thì `npm test` đỏ.
- PR đang mở mà đụng tệp gọi LLM sẽ có thêm dấu đỏ `Luat L1` cho tới khi thân PR ghi một dòng trả lời.
- PR #1523 (gộp sau PR này) phải: khai cờ `HS_HOI_THEO_SO_TAY` vào bảng cờ; đổi `loiCauHoi` của `/api/classify` thành
  `"co"` kèm `"co": ["HS_HOI_THEO_SO_TAY"]`; bỏ `choGop` ở hai tệp lõi mới và chuyển `api/so-tay-questions.js` khỏi
  danh sách dựng câu hỏi. Ba chỗ đó cổng báo đích danh.
- Ngày 27/11/2026: `HS_HO_SO` tới ngày xét. Chưa quyết thì `npm test` đỏ.

## Việc tiếp theo

- Gỡ ngoại lệ theo thẻ OZV-1707, OZV-1670; mỗi lần gỡ hạ trần trong test.
- Đưa cờ `LLM_*` vào bảng cờ.
- Dựng khung "tắt = như main" dùng chung (so băm với LLM giả) để L1 bước 2 thành cổng máy.
- Thêm nguồn tìm kiếm dự phòng cho máy thật (sự việc 8) — việc hạ tầng, ngoài PR này.
