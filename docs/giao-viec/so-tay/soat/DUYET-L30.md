# Soát độc lập L1-4c — lô L30 (#1109)

Phiên soát: `claude-agent:duyet-L30-20261111#soat-L30` (khác phiên soạn `zcode-sub:glm-5.3:…#soan-<pn6>`,
`https://claude.ai/code/session_01Ce55326…#soan-<pn6>` và `https://claude.ai/code/session_01Y2pGde…#soan-<pn6>`). Ngày 11/11/2026.
Lưu ý minh bạch: 13 bản của lô (870323, 870324, 870331–870390, 870590, 870600, 871160) do phiên soạn `session_01Y2pGde…` viết —
cùng phiên claude.ai với phiên điều phối giao lô soát này; người soát là một tác tử con độc lập, định danh khác, công cụ đã nhận.

Cách làm cho từng PN6: `--kiem` (69/69 XANH, 0 DỪNG) → `--ve` (chữ biểu VI + EN từng dòng, từng vế) → đặt mọi điều kiện cạnh chữ
biểu nguyên văn (bieu-chinh + tieu-de của `data/bieu-thue/2026.04.05/`, kể cả tầng không mã), hỏi ba câu §2 → đối chiếu biên số
bằng máy (script tạm: so `dungTichXiLanh`/`khoiLuongToanBo`/bốn bánh chủ động của TỪNG dòng với chữ "trên / không quá / từ … trở
lên" — 0 lệch trên 870210, 870323, 870332, 870333, 870340, 870360, 870370, 870410, 870422, 870432, 870442, 870452, 870490) → đọc
cảnh báo (`cong5-bo-ve`, `chongLanTruc` + `viDuHang`/`khongCoHangThat`, `chongLanVanBan`, `cong2-ten-anh-em-roi`,
`cong3-khong-bo-phan-tu-anh-em`) → BỔ SUNG 11/11: mở `data/so-tay/<h4>.json` origin/main, đối chiếu mọi `dieuKienSo` mang số
(87087033, 87120020, 87142011/12, 87163991, 87169021/95) → tra `data/precedents.json` và `data/ho-so/hieu-chinh-tien-le.json`.
Lô không có `cong5-de-trong-chua-xu-ly` nên không cần `--giai-quyet`. Không chạy `bo-kiem-luat --toan-bieu`.

## Kết quả

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 870110 | DUYET | Tầng 8701101 congSuat <= 22,5 kW; BO_VE "có hoặc không hoạt động bằng điện" (whether or not) đứng được; .11/.91 "Dùng cho nông nghiệp" CONG_DUNG; tiền lệ .11/.91 khớp |
| 870122 | DUYET | CKD ⇒ daLapRap KHONG |
| 870123 | DUYET | CKD ⇒ daLapRap KHONG |
| 870124 | DUYET | CKD ⇒ daLapRap KHONG |
| 870129 | DUYET | CKD ⇒ daLapRap KHONG |
| 870191 | DUYET | "Máy kéo nông nghiệp" ⇒ mayKeoNongNghiep CO |
| 870192 | DUYET | như 870191 |
| 870193 | DUYET | như 870191 |
| 870195 | DUYET | như 870191 |
| 870210 | **TRA_VE** | 8702107 SUY RỘNG: bỏ vế "chở từ 30 người trở lên" của "Loại khác, chở từ 30 người trở lên và được thiết kế đặc biệt để sử dụng trong sân bay" ⇒ xe sân bay < 30 chỗ lọt .7x (5%) thay vì .8x (70%); 87021010/.60 thiếu laOtoVan KHONG |
| 870220 | **TRA_VE** | 8702206 cùng lỗi (5% ↔ 70%); 8702202 lại ghi vế này bằng CONG_DUNG — không nhất quán; .10/.50 thiếu laOtoVan |
| 870230 | **TRA_VE** | 8702306 cùng lỗi (.6x 5% ↔ .7x 70%); .10/.50 thiếu laOtoVan |
| 870240 | **TRA_VE** | 8702406 cùng lỗi; .10/.50 thiếu laOtoVan |
| 870290 | **TRA_VE** | 8702905 cùng lỗi (.5x 5% ↔ .7x 70%); .10/.40 thiếu laOtoVan |
| 870310 | DUYET | .10 TUONG_TU ["Xe chơi gôn"]; tiền lệ 482/CHQ-NVTHQ, 1920/TCHQ-TXNK (xe điện kiểu golf ⇒ 8703.10.10) khớp |
| 870322 | **TRA_VE** | 8703222/8703225 SUY RỘNG: "Ô tô khác (…, nhưng không kể ô tô van)" chỉ tenLoai "Ô tô" + phanConLai, không laOtoVan KHONG ⇒ van lọt .2x/.5x thay vì .30/.90 |
| 870323 | DUYET | 28 dòng cc khớp biên; tầng Ô tô khác laOtoVan KHONG + bonBanhChuDong đúng cực |
| 870324 | DUYET | kiểu xe đúng nhãn; tầng Ô tô khác laOtoVan KHONG |
| 870331 | **TRA_VE** | 8703312/8703315 SUY RỘNG ↔ 87033131/.91 THU HẸP: tầng "Ô tô khác" (laOtoVan KHONG + phanConLai) nuốt mọi xe không phải van, kể cả xe ba bánh ⇒ "Xe ba bánh (SEN)" chỉ tới được khi là van |
| 870332 | DUYET | 24 dòng cc khớp biên; laOtoVan KHONG |
| 870333 | DUYET | cc khớp; .80 laOtoVan + bonBanhChuDong KHONG + phanConLai |
| 870340 | DUYET | 61 dòng cc khớp (cứu thương .34–.36 LK phủ ≤1000 và >3000); >3000 cc bốn bánh/không đúng cực |
| 870360 | DUYET | như 870340 |
| 870370 | DUYET | 60 dòng cc khớp |
| 870380 | DUYET | .18/.98 laOtoVan KHONG + phanConLai; .19/.99 LK (van) — xem rủi ro chung bên dưới |
| 870390 | DUYET | như 870380 |
| 870410 | DUYET | 13 dòng KLTB khớp biên (mốc 38 t chỉ ở nhánh không CKD) |
| 870421 | DUYET | nhãn kieuXeChoHang đúng; chongLanVanBan ô tô ↔ xe ba bánh (để hỏi); tiền lệ 1775/TCHQ-TXNK khớp nhóm |
| 870422 | DUYET | tầng KLTB ≤6 / 6–20; bọc thép 6–10/10–20 t |
| 870431 | DUYET | như 870421 |
| 870432 | DUYET | 5 tầng KLTB; .48 "Loại khác, KLTB 6–10 t" |
| 870441 | DUYET | như 870421 |
| 870442 | DUYET | như 870422 |
| 870443 | DUYET | tầng KLTB ≤24 / 24–45 / >45 |
| 870451 | DUYET | như 870421 |
| 870452 | DUYET | như 870432 |
| 870490 | DUYET | CKD + 5 khoảng KLTB khớp |
| 870590 | DUYET | .50 bốn tên nguyên văn; bảng hiệu chỉnh 870590-01/02 KHONG_LECH (5737/TB-TCHQ) |
| 870600 | **TRA_VE** | 87060021/87060033 SUY RỘNG: cụm "(… không bao gồm ô tô khách … hoặc ô tô van)" / "(… nhưng không kể ô tô van)" bị coi là ngoặc PHU (QUY-TRINH 3.8 chỉ miễn "kể cả/bao gồm"); thiếu laOtoVan KHONG (ghi chú khoá nêu đích danh 8706.00.33) |
| 870710 | **TRA_VE** | 87071010 THU HẸP: BO_VE vế mở "và các loại xe tương tự" trong khi dungCho liệt kê đóng ⇒ thân xe cho xe tương tự xe gôn (tiền lệ 482/CHQ-NVTHQ, 1920/TCHQ-TXNK: xe điện du lịch kiểu golf là "tương tự") rơi .90; cùng chữ ở 87060031 dùng laXeGolfVaTuongTu |
| 870790 | **TRA_VE** | 87079021 SUY RỘNG: như 870600 — thiếu laOtoVan KHONG cho "không bao gồm … ô tô van" |
| 870810 | DUYET | dungCho 87.01; tiền lệ 18590/TB-CHQ (ba đờ xốc ⇒ .90) khớp |
| 870822 | DUYET | dungCho mã nhóm |
| 870830 | DUYET | tenLoai theo chữ VI (EN "brake pipes" ≠ VI "phanh hơi" — lệch của chính biểu) |
| 870840 | DUYET | tầng chưa/đã lắp hoàn chỉnh + Bộ phận; chongLanTruc có câu phân biệt |
| 870850 | DUYET | daLapRap + laBoPhan KHONG ↔ Bộ phận; bánh răng vành khăn/quả dứa dungCho "bộ vi sai" theo SEN |
| 870870 | DUYET | "(trừ phân nhóm 8704.10)" PHAI_KHONG; .33 giữ ngưỡng > 45 t của sổ tay; .34 phanConLai [.33] |
| 870880 | DUYET | Hệ thống giảm chấn ↔ Bộ phận, chongLanTruc có ví dụ |
| 870891 | chờ — `--ap-dung` từ chối | Nội dung đạt khi soát (.94 "(trừ … 8704.10)" PHAI_KHONG; tiền lệ 1008/TB-TCHQ ống nhôm két nước ⇒ .99 khớp) và `--duyet` đã nhận, nhưng `--ap-dung` TỪ CHỐI `so-tay-tu-choi: 8708911:dieu-kien-so-khong-khong-co-trong-trich:laBoPhan` (laBoPhan KHONG lấy từ cấu trúc anh em "Bộ phận", không có chữ trong trích "Két nước làm mát"). Không lách: đã hoàn tệp nháp về NHAP (`git checkout`), sổ tay 8708 không đổi vì 870891. Cần Claude thống nhất cổng sổ tay với cảnh báo `cong3-khong-bo-phan-tu-anh-em` (870850 cùng mẫu lại áp dụng được) |
| 870892 | DUYET | 8704.10 ↔ "xe khác thuộc 87.04" phanConLai |
| 870894 | DUYET | tầng vô lăng có túi khí |
| 870899 | DUYET | .11/.91 "chưa lắp ráp" chỉ cho thùng nhiên liệu (EN "Unassembled fuel tanks; engine brackets"); tên đầu "… và bộ phận của chúng" nguyên văn; tiền lệ 8017/TB-TCHQ (.62) khớp |
| 871110 | DUYET | moped/xe đạp có động cơ, kick scooter/pocket, "Xe mô tô và xe scooter khác" phanConLai |
| 871120 | **TRA_VE** | 87112013/.93 THU HẸP: chieuCao < 50 cm lấy từ SEN "chiều cao THÔNG THƯỜNG dưới 50 cm" — không phải ngưỡng; không nhất quán với 871110/871160; 87112011/.91 congDung "đua mọi địa hình" lấy nửa định nghĩa SEN |
| 871130 | DUYET | tầng mô tô địa hình; CKD |
| 871140 | DUYET | như 871130 |
| 871160 | DUYET | .94 <= 250 W và <= 25 km/h đúng biên; "khác" phanConLai |
| 871190 | DUYET | side-cars tên nguyên văn; "Loại khác, dạng CKD" chỉ vế |
| 871200 | **TRA_VE** | 87120020 bỏ mất ngưỡng số SEN của sổ tay (yên–bàn đạp <= 43 cm; bánh <= 16 inch) thay bằng thietKeChoTreEm CO |
| 871420 | DUYET | giữ đủ ngưỡng số sổ tay (75–100 / 100–250 mm; rộng >= 30 mm) |
| 871491 | DUYET | dungCho xe đạp 8712.00.20; bộ phận càng xe đạp |
| 871492 | DUYET | dungCho 8712.00.20 |
| 871493 | DUYET | dungCho 8712.00.20 |
| 871495 | DUYET | dungCho 8712.00.20 |
| 871496 | DUYET | dungCho 8712.00.20 |
| 871499 | DUYET | danh sách tay lái…phụ kiện khác; "bộ phận khác" là phần còn lại |
| 871639 | **TRA_VE** | 87163991 SUY RỘNG: "khối lượng hàng chuyên chở (payload) trên 200 tấn" ghi bằng khoiLuongToanBo — khoá gộp GVW/payload/lượng giãn nước ⇒ GVW > 200 t mà payload ≤ 200 t lọt .91 (5%) thay vì .99 (20%) |
| 871680 | **TRA_VE** | 87168010 SUY RỘNG: định ngữ chung "sử dụng trong các nhà máy hoặc phân xưởng" (EN "of a kind used in factories or workshops") chỉ gắn nhánh tương tự |
| 871690 | DUYET | giữ ngưỡng bánh xe đẩy của sổ tay; "không nhỏ hơn 30 mm" nay là >= 30 (sổ tay cũ ghi > 30 — sửa đúng chữ) |

## Tổng

- 69 PN6: **54 DUYET** (đã `--ap-dung`), **14 TRA_VE**, **1 chờ** (870891 — `--ap-dung` từ chối, hoàn về NHAP), 0 đỏ, 0 chờ bảng
  hiệu chỉnh, 0 chưa soát.
- Tỉ lệ sai theo PN6: 14/69 = **20,3%**. Theo người soạn: `zcode-sub:glm-5.3` 10/35 (28,6%); `session_01Ce55326…` 2/21
  (870710, 871639); `session_01Y2pGde…` 2/13 (870331, 870600).
- Theo phân nhóm/kiểu lỗi: 5 PN6 8702 cùng một lỗi bỏ vế số chỗ (5% ↔ 70%); 5 PN6 (8702 ×5 kèm, 870322, 870600, 870790) bỏ loại
  trừ "ô tô van" dù khoá `laOtoVan` đã có; 2 PN6 lấy "nghĩa hẹp theo SEN" thành điều kiện cứng hoặc bỏ ngưỡng SEN (871120, 871200);
  1 khoá từ vựng gộp ba đại lượng (871639); 1 vế mở bị BO_VE (870710); 1 định ngữ chung bị tách (871680); 1 xe ba bánh bị tầng
  "Ô tô khác" nuốt (870331).
- Cổng 5: lô có 4 cảnh báo `cong5-bo-ve` (870710 ×2, 871680, 871190 thừa) — người soát xác nhận 1 đúng (871190), 870710 .10 sai
  (vế mở đổi mã), 870710 .30 và 871680 "được vận hành" tạm chấp nhận được nhưng 871680 trả về vì lỗi khác.

## Máy tách sai (cho Claude chỉnh `lib/ho-so/tach-ve.js`)

1. **Ngoặc "kể cả … nhưng không kể/không bao gồm …" bị coi trọn là PHU.** 8703222 "Ô tô khác (kể cả …, nhưng không kể ô tô van)",
   87021010 "Ô tô (bao gồm cả ô tô limousine kéo dài nhưng không bao gồm ô tô khách (1) (…) hoặc ô tô van)", 87060021/87060033,
   87079021: `--ve` in cả ngoặc là `PHU`, nên vế loại trừ "không kể ô tô van" không bị cổng 5 đòi phủ. Phần sau "nhưng không kể /
   không bao gồm" phải là `GIOI_HAN` (như "(trừ …)").
2. **"Loại khác, chở từ 30 người trở lên và …" — cụm số chỗ in thành `DAU`.** 8702107/8702206/8702306/8702406/8702905: `--ve` ghi
   `DAU "chở từ 30 người trở lên"` nên vế số bị bỏ mà máy vẫn xanh. Cụm "chở từ N người trở lên" (EN "for the transport of N persons
   or more") là biên số ⇒ `GIOI_HAN`.
3. **Định ngữ chung đứng cuối chuỗi liệt kê không được nhận.** 87168010 "Xe kéo và xe đẩy, xe kéo, xe đẩy bằng tay … và các loại xe
   tương tự được vận hành bằng tay sử dụng trong các nhà máy hoặc phân xưởng" — EN "… and similar hand-propelled vehicles of a kind
   used in factories or workshops": `cong5-dinh-ngu-tach` không bắn khi định ngữ chỉ gắn nhánh cuối.

## Rủi ro chung (không trả về, ghi để xử lý sau)

- **Khoá "là ô tô".** Tầng "Ô tô khác" của 8703 dùng `laOtoVan KHONG` + `phanConLai` (phủ định anh em đứng trước) nên "Loại khác"
  sau nó chỉ còn van; xe chở người không phải ô tô (xe ba bánh, xe bốn bánh tốc độ thấp không thuộc 8703.10) sẽ vào "Ô tô khác".
  Ở 870331 điều này làm một dòng có tên (xe ba bánh) gần như không tới được nên trả về; ở 870323–870390 chỉ ảnh hưởng hàng biên.
- **`khoiLuongToanBo` gộp GVW / payload / lượng giãn nước** (871639) — nên tách khoá tải trọng chuyên chở trong tu-vung.
- **"Nghĩa hẹp theo SEN"** sinh điều kiện cứng từ câu mô tả điển hình ("thông thường") — cần quy ước: chỉ lấy ngưỡng SEN nói như
  định nghĩa.

## Kiểm sau lô

- `node scripts/check-so-tay.mjs` — EXIT=0 (1228 nhóm, 26120 mục, 0 mục không kiểm được nguồn).
- `node scripts/check-cay.mjs` — EXIT=0.
- `node scripts/test-so-tay.mjs` — EXIT=0, 65/65 passed.
- Không chạy `bo-kiem-luat --toan-bieu` (BỔ SUNG 11/11 mục 4 — tech lead đo tập trung).


## Soát lại của tech lead — bo-kiem-luat hai bên / test

Trả về 870324 870422 870432 870442 870443 870452 870840 870880 870892 870899: gộp thử với `main` làm phát sinh ca chốt sai mới trong `bo-kiem-luat --toan-bieu` hoặc làm đỏ `test-so-tay-gates`/`test-so-tay-questions` (cổng gộp không cho tăng). Mục sổ tay giữ như `main`.
