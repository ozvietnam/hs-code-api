---
name: doc-mot-lan
description: "Quy trình đọc một lần từ Chương (2 số) xuống Nhóm (4 số), Phân nhóm (6 số) và Dòng (8 số) theo tiêu chuẩn QT (ADR-0011, thẻ M-82): dựng gói đủ luật, mô hình mạnh đọc trọn một lần, mô hình mạnh khác dòng phản biện đúng 1 vòng cho mọi điểm mơ hồ, máy chỉ kiểm câu trích nguyên văn, kèm 3 luật đọc cốt tử từ thực chiến chấm bảng vàng."
---

# Skill `doc-mot-lan` — Đọc Một Lần Từ Chương Xuống Dòng 8 Số Theo Tiêu Chuẩn QT (ADR-0011 · M-82)

## 1. Mục đích, Phạm vi & Phân vai (ADR-0011)

Xây dựng cơ sở dữ liệu luật phân loại mã HS theo phương pháp **đọc một lần từ trên xuống dưới (`2 → 4 → 6 → 8`)** thay cho vòng lặp *"mô hình rẻ soạn — sai thì sửa cổng"*. Cổng máy chỉ kiểm hình thức và câu trích nguyên văn; phần nghĩa luật do cặp **Người đọc mạnh** và **Người phản biện mạnh khác dòng** giải quyết trong đúng một vòng phản biện rồi hệ thống hoá theo tiêu chuẩn QT.

- **Nơi lưu:** `data/ho-so-ma/doc-mot-lan/<chương>/` (`chuong.json`, `<nhóm>.json`, `diem-mo-ho.jsonl`, `dieu-kien.jsonl`, `bang-anh-em.jsonl`), chưa thay dữ liệu cũ ở `data/ho-so-ma/dieu-kien/`.
- **Nhánh & Worktree:** Làm việc trên worktree cô lập `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>` với nhánh `agy/...` tách sạch từ `origin/main`.
- **An toàn & Soạn mù:**
  - Không sửa đường khách L1 (`api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`), không lộ dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`, `.keys/`), không dùng tiền lệ `tb:` hay `wco:`, tuyệt đối không chạy `gh pr merge` hay push thẳng lên `main`.
  - Khi thí điểm chương có bảng vàng kiểm định: **tuyệt đối không mở** tệp bảng vàng (`docs/mong/the/M-81-vang-*.md`), `docs/mong/phieu-*/`, bình luận chấm điểm cũ, hay dữ liệu cũ của chương đó trong `data/ho-so-ma/dieu-kien/<chương>.jsonl` (dùng cờ `--soan-mu` khi dựng gói nhóm).
- **Phân vai 4 bên (`ADR-0011` mục 1):**
  1. **Người đọc (`nguoiDoc`)**: Mô hình mạnh nhất sẵn có trong gói (Claude Opus hoặc Gemini Pro bậc cao trong Antigravity; **cấm** dùng bản Gemini nhẹ làm người đọc, **cấm** dùng hạn mức Claude Max hay mô hình cục bộ yếu).
  2. **Người phản biện (`nguoiPhanBien`)**: Một mô hình mạnh **khác với người đọc** (`nguoiPhanBien !== nguoiDoc`; cấm lấy mô hình cục bộ yếu hơn đi chấm/phản biện mô hình mạnh hơn).
  3. **Máy (`goi-chuong.mjs`, `goi-nhom.mjs`, `khuon.mjs`, `doc-mot-lan.mjs`)**: Dựng gói đủ luật và chỉ kiểm tất định một điều: **mọi câu trích có thật nguyên văn trong `data/luat-goc` và gắn đúng câu nguồn** (`0` lỗi trích, `0` lỗi khuôn). Cổng `6–14` cũ chỉ chạy để xem cảnh báo, không phải điều kiện nghiệm thu.
  4. **QT**: Giữ tiêu chuẩn bản ghi, chấm đối chiếu bảng vàng theo đúng/sai và báo *"dùng N lần thì mấy lần sai"* (tuyệt đối không dùng phần trăm).

---

## 2. Trình tự đọc 6 bước & Khuôn tiêu chuẩn QT (ADR-0011 mục 2 & 3)

Mọi bản ghi đều mang các trường gốc: `ma`, `ten` (nguyên văn biểu thuế), `canCu: [{ idCau, trich }]` (chuỗi con nguyên văn từ `data/luat-goc`), `nguoiDoc` (tên mô hình thực tế), `vanTayGoi` (sha256 của gói đọc).

1. **Bước 1 — Bậc 2 (Chương 2 số):**
   - Chạy `node scripts/ho-so-ma/goi-chuong.mjs --chuong <ch> --out <goi-chuong.json>` để gom quy tắc GIR 1–6, chú giải Phần, chú giải Chương (`:cg:`), chú giải tổng quát (`:kq:`), tên nguyên văn mọi nhóm 4 số, cạnh loại trừ ra/vào của Chương và các nhóm/chương cạnh tranh do `timCgct` tìm.
   - Người đọc đọc trọn một lần, xuất bản ghi `CHUONG` (`phamVi`, `loaiTru`, `dinhNghia`, `uuTien`, `trucChinh`, `canhTranh`) và danh sách `DIEM_MO_HO` cấp chương.
2. **Bước 2 — Bậc 4 (Nhóm 4 số):**
   - Chạy `node scripts/ho-so-ma/goi-nhom.mjs --nhom <ma4> --soan-mu --out <goi-nhom.json>`.
   - Người đọc lấy bản ghi `CHUONG` làm bối cảnh bậc trên, đọc trọn gói nhóm một lần, ghi bản ghi `NHOM`:
     - `dieuKienCanDu`: điều kiện cần và đủ để hàng thuộc nhóm kèm câu luật;
     - `loaiTru`: hàng bị loại khỏi nhóm, nhóm/chương đích và câu luật;
     - `canhTranh`: **mọi nhóm được `timCgct` xếp trên nhóm này** (`canhTranhTimThay`) bắt buộc có câu phân ranh (`laCanhTranh: true`) hoặc lý do không cạnh tranh (`laCanhTranh: false`) kèm `canCu` nguyên văn;
     - `trucPhanNhom`: các trục chia từ 4 số xuống 6 số.
3. **Bước 3 — Bậc 6 và Bậc 8 (`DIEU_KIEN`, `bang-anh-em@1`, `MA_KET_QUA`):**
   - Đọc nối tiếp từ bậc 4 xuống tiêu đề 5 số (`:td`), phân nhóm 6 số và dòng 8 số trong cùng lượt đọc gói nhóm, lấy bản ghi bậc trên làm bối cảnh.
   - Mỗi nút có tên (`!loaiKhac`) tách đủ điều kiện nguyên tử (`DIEU_KIEN`) phân biệt với anh em cùng cấp và quy tắc `GIAI_CHONG` khi có giao thoa; dòng `"Loại khác"` là phần bù tất định của các anh em có tên cùng cha (`bang-anh-em.mjs`).
   - Dựng `MA_KET_QUA` cho từng mã 6 số và 8 số kèm `ketQua`: **`ĐÚNG`** khi có đủ câu luật nguyên văn ở mọi bậc trên đường đi và mọi anh em cùng cấp đều bị loại bằng câu luật; ngược lại ghi **`CHƯA ĐỦ DỮ KIỆN`** kèm `cauHoi` cụ thể để hỏi khách.
4. **Bước 4 — Phản biện đúng 1 vòng cho mọi `DIEM_MO_HO`:**
   - Chuyển toàn bộ `DIEM_MO_HO` sang **Người phản biện** (`nguoiPhanBien` khác dòng mô hình với `nguoiDoc`).
   - Người phản biện đi **đúng một vòng**: viết `giaiThich`, `chungMinh[]` (chỉ trích nguyên văn câu luật, chú giải chi tiết và GIR), `phanBien` (lập luận pháp lý mạnh nhất cho cách hiểu đối lập), và đề xuất kết luận.
   - Người đọc xem lại đúng một lần: đồng ý thì chốt (`CHỐT` hoặc `CHỐT KÈM GIẢ ĐỊNH`); không đồng ý hoặc hai cách hiểu đều mở khi thiếu thông tin hàng thực tế thì ghi cả hai cách hiểu, kết luận **`CHƯA ĐỦ DỮ KIỆN`** kèm `cauHoiKhach`. Không lặp vòng thứ hai; nếu đổi kết luận thì cập nhật đồng bộ điều kiện bậc 4/6/8 liên quan và đánh dấu `doiKetLuan: true`.
5. **Bước 5 — Hệ thống hoá & Kiểm nguyên văn tất định:**
   - Chạy `node scripts/ho-so-ma/doc-mot-lan.mjs --dung-bang --chuong <ch>` và `--kiem --chuong <ch>` để kiểm `0` lỗi khuôn, `0` lỗi câu trích nguyên văn, phủ đủ 100% nhóm/mã và in bảng cảnh báo cổng `6–14`.
6. **Bước 6 — Vừa làm vừa ghi 3 sản phẩm tri thức:**
   - Cập nhật các luật đọc mới vào chính `SKILL.md` này;
   - Viết sổ tay `docs/so-tay-tra-sai/<chương>.md` (hàng gì hay khai nhầm vào đâu, vì sao nhầm, câu luật nguyên văn gỡ bẫy);
   - Ghi nhật ký đo kiểm `docs/nghien-cuu/doc-mot-lan.md` (tên mô hình, số lượt gọi, thời gian, số điểm mơ hồ theo kiểu, và những điểm nào vòng phản biện làm đổi kết luận).

---

## 3. Các Luật Đọc Cốt Tử Rút Từ Thực Chiến Chấm Bảng Vàng (Bắt Buộc Áp Dụng Trước Khi Đọc Bậc 6/8)

### Luật 1 — Chữ phân nhóm không nói thì không chốt, bắt buộc ghi điểm mơ hồ
- **Quy tắc:** Ở bậc phân nhóm 6 số và dòng 8 số, chỉ được lập điều kiện khẳng định từ **chính lời văn của phân nhóm/dòng đó** và chú giải phân nhóm/SEN gắn trực tiếp với nó. Khi chữ phân nhóm không nói rõ về một biến thể hàng hoá (hoặc dùng từ hẹp hơn phạm vi chú giải nhóm), **tuyệt đối cấm kéo chú giải chi tiết của cấp nhóm 4 số xuống ép làm điều kiện cho phân nhóm con để chốt sớm**; bắt buộc giữ ở **`CHƯA ĐỦ DỮ KIỆN`** kèm câu hỏi khách và đưa ngay vào `DIEM_MO_HO` để phản biện.
- **Lỗi cấm & Ví dụ thực tế (PR thật / nhận xét QT & thí điểm Chương 94):**
  - `#2484` (`40.16`, ca 9 *đệm nước* và ca 25a *cốt làm lốp*): Lời văn phân nhóm `4016.95.00` chỉ ghi *"Các mặt hàng bơm hơi khác"*, không hề nói tới hàng bơm nước hay túi cốt lưu hoá lốp dùng hơi nước/nước nóng. Người đọc tự kéo chú giải cấp nhóm `40.16` xuống làm điều kiện cấp phân nhóm nên chốt thẳng sai vào `4016.95.00`, thay vì ghi `CHƯA ĐỦ DỮ KIỆN` và mở `DIEM_MO_HO` giữa `4016.95` (chỉ bơm khí/hơi) với `4016.99` (`"Loại khác"`).
  - Chương `94` (`94.05`, phân nhóm `9405.11` / `9405.21` / `9405.42`): Dòng `"- - Chỉ được thiết kế để sử dụng với các nguồn sáng đi-ốt phát quang (LED)"` chỉ cho phép chốt khi hàng thiết kế **duy nhất** cho nguồn LED; nếu bộ đèn có đui chuẩn (như `E27`, `GU10`) lắp vừa cả bóng LED rời lẫn bóng sợi đốt/huỳnh quang mà hồ sơ không ghi rõ thiết kế giới hạn chỉ cho LED thì không được tự ý chốt vào `.11/.21/.42`, phải giữ `CHƯA ĐỦ DỮ KIỆN` kèm câu hỏi và ghi `DIEM_MO_HO`.

### Luật 2 — Loại trừ có đích ngoài nhóm bắt buộc đặt ở nút nhóm 4 số, cấm đặt ở nút con 6/8 số
- **Quy tắc:** Mọi mệnh đề loại trừ đẩy hàng ra **ngoài nhóm 4 số đang xét** (chuyển sang nhóm 4 số khác hoặc chương khác) **bắt buộc đặt ở cấp nhóm 4 số** (`bieu:XXXX` với `ve: 0, phu: true` và trong `NHOM.loaiTru`). **Tuyệt đối cấm** gắn điều kiện loại trừ ngoại nhóm vào nút phân nhóm 6 số hay dòng 8 số con! Ở cấp 6/8 số chỉ đặt điều kiện loại trừ nội bộ khi lời văn chính dòng con đó ghi `"trừ..."` để nhường hàng cho một anh em khác **cùng nằm trong nhóm 4 số đó**.
- **Lỗi cấm & Ví dụ thực tế (PR thật / nhận xét QT & thí điểm Chương 94):**
  - `#2484` (`40.16`, ca 36 *bộ gioăng 84.84* và 6 điều kiện loại trừ ngoại nhóm + đệm xốp sang `94.04`): Người đọc đặt các câu loại trừ sang `34.05`, Chương `57`, `40.08`, `84.84`, `40.14`, `63.06` và đệm cao su xốp sang `94.04` ở các nút con bên dưới `40.16`. Nghĩa câu luật đúng nhưng đặt sai tầng: khi chạy công thức phần bù `¬(Anh Cả ∨ Anh Hai …)`, món hàng bị loại khỏi nút con có tên nhưng không bị chặn ở cửa nhóm `40.16`, nên rơi thẳng vào dòng `"Loại khác"` ngay trong `40.16` (ca 36 bộ gioăng `84.84` bị tụt sai vào `4016.99.59`).
  - Chương `94` (`94.05` & `94.06`): Toàn bộ 23 mệnh đề loại trừ ngoại nhóm của `94.05` (bóng đèn/mô-đun nguồn sáng sang `85.39`, chip LED sang `85.41`, đèn pin nguồn tự thân sang `85.13`, đèn xe cơ giới/xe đạp sang `85.12`, đèn khám y tế sang `90.18`, đèn flash chụp ảnh sang `90.06`, phụ tùng điện để riêng như chấn lưu/LED driver sang Chương `85`, hạt thuỷ tinh xâu chuỗi trang trí chụp đèn sang `70.18`, đèn lồng lễ hội sang `95.05`…) bắt buộc đặt toàn bộ tại cửa `bieu:9405` (`ve: 0, phu: true`). Ngược lại, mệnh đề *"trừ các loại được sử dụng ở các không gian mở công cộng hoặc đường phố lớn"* tại `bieu:94051` và mệnh đề loại nhà lắp ghép *"gói phẳng"* tại `bieu:940620` (`pn:940620:ct:1#1`) là loại trừ **nội nhóm** (đẩy sang anh em `9405.4x` và `9406.90` cùng nhóm) nên đặt đúng tại nút con `bieu:94051` và `bieu:940620`.

### Luật 3 — Mỗi trục chỉ chứa một loại giá trị; cấm gộp trục, cấm gộp ý và cấm rải `CO_KHONG` thay trục chung
- **Quy tắc:**
  1. **Thuần nhất loại giá trị trên mỗi `truc`:** Một trục `GIA_TRI` chỉ được chứa **một bản chất phân loại duy nhất** — tuyệt đối không trộn *"tên loại xe thông thường"* với *"mã nhóm HS 4 số của xe"*, không trộn *"vật liệu"* với *"công dụng"*, không trộn *"loại nguồn sáng"* với *"vị trí lắp đặt"*. Nếu hai anh em cùng cha dùng hai hệ quy chiếu khác nhau có thể giao nhau (ví dụ một dòng gọi tên *"xe đạp"*, dòng kia gọi *"nhóm 87.11"* mà nhóm `87.11` bao gồm cả xe đạp gắn động cơ phụ trợ), việc nhét chung vào một trục đơn trị sẽ làm máy tưởng hai giá trị rời nhau và bỏ sót cặp chồng! Phải tách đúng trục hoặc đánh dấu đa trị / lập `GIAI_CHONG`.
  2. **Không dùng `CO_KHONG` thay cho trục chung `GIA_TRI`:** Khi các anh em cùng cha phân chia theo cùng một thuộc tính nhiều giá trị (vật liệu, công dụng, đối tượng dùng, chủng loại…), bắt buộc gom về chung một tên `truc` kiểu `GIA_TRI`, cấm viết thành hàng loạt điều kiện `CO_KHONG` rời rạc.
  3. **Một điều kiện = một mệnh đề nguyên tử đủ nghĩa (không gộp ý, không cắt thiếu vế):** Không gộp nhiều ý độc lập vào một điều kiện làm sinh lỗi *"đúng một phần"*, và không bỏ sót vế phân loại quan trọng trong câu biểu (như phân biệt *"bộ phận"* với *"phụ kiện"*, hoặc chữ *"Loại khác,"* mở đầu dòng thứ cấp).
- **Lỗi cấm & Ví dụ thực tế (PR thật / nhận xét QT & thí điểm Chương 94):**
  - `#2484` (`40.16`): (a) Ghép `"xe đạp"` chung một trục với `"{87.11}"` làm che mất 3 cặp chồng thực tế giữa `4016.99.12` với `.16 / .17 / .18`; (b) Viết 11 điều kiện `CO_KHONG` rời rạc thay vì gom trục `GIA_TRI` chung; (c) 17 điều kiện bị chấm sai vì chỉ đúng một phần do gộp ý; (d) Bỏ sót điều kiện *"chắn bùn là phụ kiện"* để tách nhánh chỉ nhận bộ phận với nhánh nhận cả phụ kiện.
  - Chương `94` (`94.05` & `94.02`): (a) Dưới `9405.42`, tách bạch 5 trục độc lập (`loaiDenChieuSang`, `cheDoPhatSang`, `doiTuongSuDung`, `vatLieuCauTao`, `viTriSuDung`) thay vì gộp chung *"đèn tín hiệu không nhấp nháy bằng kim loại cơ bản dùng cho sân bay"* thành một điều kiện `CO_KHONG`; (b) Dưới `9405.99`, tách trục `loaiBoPhanDen: ["Chụp đèn"]` (`9405.99.10` & `.20`) với trục `vatLieuCauTao` (`9405.99.20` dùng `phu: true, tap: ["vật liệu dệt"]` thay vì nhét chữ `"vật liệu khác"` như một tên vật liệu) và tôn trọng chữ *"Loại khác,"* ở đầu `9405.99.50` để chụp đèn kim loại vào `9405.99.20` chứ không rơi nhầm xuống `9405.99.50`; (c) Ở `94.02`, tách đủ 3 tính năng cơ khí độc lập của ghế cắt tóc (*xoay*, *ngả*, *nâng hạ*) — thiếu một trong ba thì lùi về `94.01`.

### Luật 4 — Không thu hẹp hay mở rộng chữ biểu bằng giả định; thận trọng tối đa với `"CHỐT KÈM GIẢ ĐỊNH"` và giải chồng Quy tắc 3
- **Quy tắc:**
  1. **Giữ nguyên phạm vi chữ biểu, cấm thu hẹp hay mở rộng bằng giả định:** Lời văn phân nhóm/dòng ghi tới đâu thì điều kiện giữ đúng tới đó; **tuyệt đối không suy diễn từ một dòng con có tên riêng để bịa ra quy luật chung thu hẹp dòng khác**.
  2. **`"CHỐT KÈM GIẢ ĐỊNH"` chỉ dùng khi một nhánh gần như luôn đúng ngoài thực tế, và bắt buộc ghi rõ giả định:** Nếu hai nhánh đều có thể xảy ra tuỳ cấu tạo, kích thước, công dụng hay bản chất cơ bản của hàng hoá thực tế thì bắt buộc kết luận **`CHƯA ĐỦ DỮ KIỆN`** kèm `cauHoiKhach`, không được lạm dụng `"CHỐT KÈM GIẢ ĐỊNH"` để ép chốt.
  3. **Không tự chốt cặp chồng bằng Quy tắc 3 khi câu luật không đủ tiêu chí tất định:** Không tự bịa tiêu chí ngoài lời văn Quy tắc 3(a) (như tự đặt *"ưu tiên xe thiết kế chuyên dùng"*), không tự ép Quy tắc 3(c) trước khi xét đặc tính cơ bản theo Quy tắc 3(b) trên hàng thực tế, và không đọc chữ *"khác"* như trỏ mọi anh em đứng trước nếu cấu trúc cấp gạch không nói vậy. Các cặp giao thoa này phải để mở thành **vùng chồng + `DIEM_MO_HO` (`CHƯA ĐỦ DỮ KIỆN`)**, không tự ghi `GIAI_CHONG` kiểu `QUY_TAC_3` để chốt cứng.
- **Lỗi cấm & Ví dụ thực tế (PR thật / nhận xét QT & thí điểm Chương 94):**
  - `#2484` (`40.16`, nhận xét QT lần 2): (a) Tại `4016.99.1`, chữ biểu ghi *"Bộ phận và phụ kiện dùng cho xe thuộc Chương 87"*, nhưng một phản biện `"CHỐT KÈM GIẢ ĐỊNH"` suy rộng từ dòng riêng `4016.99.54` đã tự thu hẹp `4016.99.1` thành *"kết cấu xe, không phải chi tiết cụm máy"*, làm *cao su chân máy ô tô* rơi sai sang `4016.99.59` thay vì đáp án bảng vàng `4016.99.11`; (b) 3 bản ghi giải chồng `.12 × .16/.17/.18` tự đặt tiêu chí *"ưu tiên xe thiết kế chuyên dùng"* không có trong Quy tắc 3(a), và cặp `4016.93/91 × 4016.95` đọc chữ *"khác"* như trỏ mọi anh em đứng trước thay vì để mở thành vùng chồng + điểm mơ hồ.
  - Chương `94` (`dmh:94:1` & `94.05`): (a) Lượt đọc đầu `dmh:94:1` định `"CHỐT KÈM GIẢ ĐỊNH"` đẩy mọi tủ/kệ nhỏ đặt bàn ra khỏi `94.03`, nhưng phản biện `gemini-4-argon-high` bác bỏ vì Chú giải `2#2` + `2(a)` cho phép tủ có ngăn đứng trên đồ vật khác vào `94.03` (trừ thiết bị văn phòng `39.26/83.04` và đồ gỗ nhỏ `44.20` tại `kq:13#2`) → chuyển về `CHƯA ĐỦ DỮ KIỆN`; (b) Các cặp giao thoa đa trục trong `94.05` (đèn vừa là đèn rọi vừa gắn bóng huỳnh quang `9405.19.91 × .92`, đèn pha tàu thuỷ vỏ kim loại cơ bản `.10 × .30`, bộ phận đèn đa vật liệu `9405.91 × 9405.92`, chụp đèn của đèn dầu/đèn pha `9405.99.10/.20 × .30/.40`) giữ nguyên vùng chồng + `DIEM_MO_HO` (`CHƯA ĐỦ DỮ KIỆN`), không dùng `GIAI_CHONG` `QUY_TAC_3` chốt cứng.

---

## 4. Lệnh tự kiểm trước khi nộp

```bash
node scripts/ho-so-ma/goi-chuong.mjs --chuong 94 --tom-tat
node scripts/ho-so-ma/goi-nhom.mjs --nhom 9405 --soan-mu --tom-tat
node scripts/ho-so-ma/doc-mot-lan.mjs --dung-bang --chuong 94 --nguoi-doc <model>
node scripts/ho-so-ma/doc-mot-lan.mjs --kiem --chuong 94
node scripts/ho-so-ma/khuon.mjs
node scripts/test-doc-mot-lan.mjs
node scripts/quan-ly-skill.mjs --kiem --plugin-dir=/tmp/khong-ton-tai-plugin
```
