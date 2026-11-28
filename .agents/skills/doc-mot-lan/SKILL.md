---
name: doc-mot-lan
description: "Quy trình đọc một lần từ Chương (2 số) xuống Nhóm (4 số), Phân nhóm (6 số) và Dòng (8 số) theo tiêu chuẩn QT (ADR-0011, thẻ M-82): dựng gói đủ luật, mô hình mạnh đọc trọn một lần, mô hình mạnh khác dòng phản biện đúng 1 vòng cho mọi điểm mơ hồ, máy chỉ kiểm câu trích nguyên văn và vân tay gói đọc, kèm 5 luật đọc cốt tử từ thực chiến chấm bảng vàng."
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
  - Chương `94` (`94.05` & `94.06`): Toàn bộ 33 mệnh đề loại trừ/ràng buộc cửa nhóm của `94.05` (đủ các mục Chú giải 1 `a..m` Chương 94, bóng đèn/mô-đun nguồn sáng sang `85.39`, chip LED sang `85.41`, đèn pin nguồn tự thân sang `85.13`, đèn xe cơ giới/xe đạp sang `85.12`, đèn khám y tế sang `90.18`, đèn flash chụp ảnh sang `90.06`, phụ tùng điện để riêng như chấn lưu/LED driver sang Chương `85`, hạt thuỷ tinh xâu chuỗi trang trí chụp đèn sang `70.18`, đèn lồng lễ hội sang `95.05`…) bắt buộc đặt toàn bộ tại cửa `bieu:9405` (`ve: 0, phu: true`). Ngược lại, mệnh đề *"trừ các loại được sử dụng ở các không gian mở công cộng hoặc đường phố lớn"* tại `bieu:94051` và mệnh đề loại nhà lắp ghép *"gói phẳng"* tại `bieu:940620` (`pn:940620:ct:1#1`) là loại trừ **nội nhóm** (đẩy sang anh em `9405.4x` và `9406.90` cùng nhóm) nên đặt đúng tại nút con `bieu:94051` và `bieu:940620`.

### Luật 3 — Mỗi trục chỉ chứa một bản chất phân loại; tách loại đối tượng với kiểu hàng; `daTri` chỉ bật khi luật cho một món mang nhiều giá trị
- **Quy tắc:**
  1. **Tách bạch trục loại đối tượng và trục kiểu hàng; mỗi `truc` chỉ chứa một bản chất phân loại duy nhất:** Tuyệt đối không trộn *"loại đối tượng"* (ví dụ: *đèn và bộ đèn* / *biển hiệu được chiếu sáng* / *bộ phận*) chung với *"kiểu đèn"* (*đèn chùm*, *đèn bàn*, *dây đèn*…), không trộn *"tên loại xe thông thường"* với *"mã nhóm HS 4 số của xe"*, không trộn *"vật liệu"* với *"công dụng"*. Nếu hai anh em cùng cha dùng hai hệ quy chiếu khác nhau có thể giao nhau (ví dụ `"xe đạp"` với `"{87.11}"`), phải tách đúng hai trục độc lập.
  2. **`daTri: true` chỉ được bật khi luật cho phép một món hàng duy nhất mang đồng thời nhiều giá trị trên chính trục đó:** Ví dụ một sản phẩm đa vật liệu trên trục `vatLieuCauTao` hoặc một bộ phận quang học vừa dùng cho đèn rọi vừa dùng cho đèn pha trên trục `boPhanChoLoaiDen`. Tuyệt đối **cấm** bật `daTri: true` trên trục loại đối tượng hay trục đơn trị làm máy hiểu sai một món vừa là bộ đèn hoàn chỉnh vừa là bộ phận rời.
  3. **Không dùng `CO_KHONG` thay cho trục chung `GIA_TRI` giữa các anh em cùng cha, và không gộp nhiều ý độc lập vào một điều kiện:** Mỗi điều kiện là một mệnh đề nguyên tử đủ nghĩa (không gộp ý làm sinh lỗi *"đúng một phần"*, không bỏ sót vế phân biệt *"bộ phận"* với *"phụ kiện"* hay chữ *"Loại khác,"* mở đầu dòng thứ cấp).
- **Lỗi cấm & Ví dụ thực tế (PR thật / nhận xét QT):**
  - `#2486` (`94.05`, trục `nhomHang9405`): Lượt đọc đầu trộn chung loại đối tượng (*đèn / biển hiệu / bộ phận*) với kiểu đèn (*Bộ đèn chùm, đèn trần, đèn tường*, *Đèn bàn, đèn giường, đèn cây*, *Dây đèn*, *Đèn khác*) vào một trục `nhomHang9405` rồi lại đặt `daTri: true`, làm sinh kết quả vô lý là một món vừa là bộ đèn chùm (`9405.1`) vừa là bộ phận (`9405.9`). Phải tách thành hai trục độc lập: `loaiDoiTuong9405` (`daTri: false`: đèn và bộ đèn | biển hiệu được chiếu sáng | bộ phận) và `kieuDen` (`daTri: false` cho các nhánh đèn `9405.1–9405.3`); đồng thời ở `9405.91` và `9405.92`, bật `daTri: true` đúng trên trục `boPhanChoLoaiDen` (`"đèn rọi"` × `"đèn pha"`) để bắt đủ vùng chồng `9405.91.20 × 9405.91.50` và `9405.92.20 × 9405.92.30`.
  - `#2484` (`40.16`): (a) Ghép `"xe đạp"` chung một trục với `"{87.11}"` làm che mất 3 cặp chồng thực tế giữa `4016.99.12` với `.16 / .17 / .18`; (b) Viết 11 điều kiện `CO_KHONG` rời rạc thay vì gom trục `GIA_TRI` chung; (c) 17 điều kiện bị chấm sai vì chỉ đúng một phần do gộp ý; (d) Bỏ sót điều kiện *"chắn bùn là phụ kiện"* để tách nhánh chỉ nhận bộ phận với nhánh nhận cả phụ kiện.

### Luật 4 — Không thu hẹp hay mở rộng chữ biểu và chú giải chung; thận trọng tối đa với `"CHỐT KÈM GIẢ ĐỊNH"` và giải chồng Quy tắc 3
- **Quy tắc:**
  1. **Giữ nguyên phạm vi chữ biểu và câu chú giải chung, cấm thu hẹp hay mở rộng bằng giả định:** Lời văn tên nhóm, chú giải chương và phân nhóm ghi tới đâu thì điều kiện giữ đúng tới đó: (a) **không thu hẹp câu loại trừ chung của Chú giải Chương thành danh sách vài nhóm lẻ**; (b) **ghi đủ toàn bộ các mục loại trừ của Chú giải 1 Chương** tại nút nhóm 4 số; (c) **ghi tường minh điều kiện `"chưa được chi tiết hoặc ghi ở nơi khác"`** khi tên nhóm có cụm đó; (d) không suy diễn từ một dòng con có tên riêng để thu hẹp dòng khác.
  2. **`"CHỐT KÈM GIẢ ĐỊNH"` chỉ dùng khi một nhánh gần như luôn đúng ngoài thực tế, và bắt buộc ghi rõ giả định:** Nếu hai nhánh đều có thể xảy ra tuỳ cấu tạo, kích thước, công dụng hay bản chất cơ bản của hàng hoá thực tế thì bắt buộc kết luận **`CHƯA ĐỦ DỮ KIỆN`** kèm `cauHoiKhach`, không được lạm dụng `"CHỐT KÈM GIẢ ĐỊNH"` để ép chốt.
  3. **Không tự chốt cặp chồng bằng Quy tắc 3 khi câu luật không đủ tiêu chí tất định:** Không tự bịa tiêu chí ngoài lời văn Quy tắc 3(a), không tự ép Quy tắc 3(c) trước khi xét đặc tính cơ bản theo Quy tắc 3(b) trên hàng thực tế. Các cặp giao thoa mở phải để thành **vùng chồng + `DIEM_MO_HO` (`CHƯA ĐỦ DỮ KIỆN`)**, không tự ghi `GIAI_CHONG` kiểu `QUY_TAC_3` để chốt cứng.
- **Lỗi cấm & Ví dụ thực tế (PR thật / nhận xét QT):**
  - `#2486` (`94.05`, các điều kiện vàng `9405:8102`, `9405:8106`, `9405:8112`): Lượt đầu đã tự thu hẹp câu chung Chú giải `1(f)` Chương 94 (*"(f) Đèn hoặc nguồn sáng và bộ phận của chúng thuộc Chương 85;"*) thành 6 nhóm lẻ của Chương 85, bỏ khuyết các mục `a, b, e, g, h, ij, k` của Chú giải 1 Chương 94 ở nút `bieu:9405`, và thiếu điều kiện tường minh cho cụm *"chưa được chi tiết hoặc ghi ở nơi khác"* trên `bieu:9405#1`.
  - `#2484` (`40.16`, nhận xét QT lần 2): (a) Một phản biện `"CHỐT KÈM GIẢ ĐỊNH"` suy rộng từ `4016.99.54` đã thu hẹp trái phép `4016.99.1`, làm *cao su chân máy ô tô* rơi sai sang `4016.99.59` thay vì `4016.99.11`; (b) 3 bản ghi giải chồng `.12 × .16/.17/.18` tự đặt tiêu chí *"ưu tiên xe thiết kế chuyên dùng"* không có trong Quy tắc 3(a); (c) `dmh:94:1` của Chương 94 bác bỏ `"CHỐT KÈM GIẢ ĐỊNH"` đẩy tủ nhỏ để bàn ra khỏi `94.03` vì Chú giải `2#2` + `2(a)` cho phép đứng trên đồ vật khác.

### Luật 5 — Chữ `"khác"` chỉ so với anh em cùng cấp đứng trên (Quy tắc 6), không so với dòng ở nhánh khác
- **Quy tắc:**
  1. Theo **Quy tắc 6 (`gir:6#1`)**, chỉ các phân nhóm **cùng cấp** mới so sánh được với nhau. Khi lời văn một dòng có chữ `"khác"` (như *"Đèn rọi khác"*, *"Loại chiếu sáng bên ngoài khác"*, *"Bằng các loại vật liệu khác"*, *"Đồ nội thất bằng gỗ khác"*), nghĩa của chữ `"khác"` **chỉ được so với các anh em cùng cấp gạch đứng phía trên dưới cùng một nút cha**, tuyệt đối **cấm so chéo với dòng ở nhánh khác cấp hoặc khác cha**.
  2. Phải ghi đủ đồng thời: (a) điều kiện phủ định `phu: true` loại trừ anh em cùng cấp đứng trên mà chữ `"khác"` đó nhường chỗ, và (b) các bản ghi `GIAI_CHONG` (`cach: "TRU"`) cho **mọi** cặp anh em cùng cấp đứng trên bị dòng `"khác"` đó loại trừ (không bỏ sót dòng đứng giữa).
- **Lỗi cấm & Ví dụ thực tế (PR thật / nhận xét QT):**
  - `#2486` (`94.05`, nhận xét chấm mù của QT):
    - Tại `9405.41.20`, `9405.42.20`, `9405.49.20`, dòng 3 gạch `- - - Đèn rọi khác` đứng ngay dưới dòng anh em cùng cấp 3 gạch `- - - Đèn pha` (`9405.41.10`, `9405.42.10`, `9405.49.10`). Lượt đọc đầu đã hiểu sai chữ `"khác"` là *"đèn rọi khác ngoài đèn rọi gắn trần/tường ở nhánh `9405.1`"* (so khác cấp, khác nhánh!). Đúng theo Quy tắc 6: `"Đèn rọi khác"` nghĩa là đèn rọi (`phu: false, tap: ["Đèn rọi"]`) nhưng **không phải `"Đèn pha"` ở dòng `.10` cùng cấp đứng trên** (`phu: true, tap: ["Đèn pha"]`), kèm 3 cặp `GIAI_CHONG` (`cach: "TRU"`) `94054110 × 94054120`, `94054210 × 94054220`, `94054910 × 94054920`.
    - Tại `9405.42.60` và `9405.49.60` (`"- - - Loại chiếu sáng bên ngoài khác"`), chữ `"khác"` cũng loại trừ cả dòng `.40` (`"- - - Đèn báo hiệu dùng cho thiết bị nhiệt điện gia dụng thuộc nhóm 85.16"`) đứng trên cùng cấp → bắt buộc ghi đủ 2 cặp `GIAI_CHONG` (`cach: "TRU"`) `94054240 × 94054260` và `94054940 × 94054960` bên cạnh `.10/.20/.30/.50 × .60`.

---

## 4. Lệnh tự kiểm trước khi nộp

```bash
node scripts/ho-so-ma/goi-chuong.mjs --chuong 94 --tom-tat
node scripts/ho-so-ma/goi-nhom.mjs --nhom 9405 --soan-mu --tom-tat
node scripts/ho-so-ma/doc-mot-lan.mjs --dung-bang --chuong 94 --nguoi-doc <model>
node scripts/ho-so-ma/doc-mot-lan.mjs --kiem --chuong 94
node scripts/ho-so-ma/khuon.mjs
node scripts/test-doc-mot-lan.mjs
node scripts/quan-ly-skill.mjs --dong-bo
node scripts/quan-ly-skill.mjs --kiem --bat-buoc-plugin
```
