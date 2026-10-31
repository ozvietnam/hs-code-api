# Sổ tay chú giải — LUẬT CHUNG (bắt buộc với CẢ người soạn lẫn người soát)

> Tách từ `docs/giao-viec/so-tay-giao-ngoai.md` ngày 28/10/2026 để mỗi vai chỉ nạp đúng phần cần (progressive disclosure).
> Người soạn đọc thêm [`SOAN-LO.md`](SOAN-LO.md). Người soát đọc thêm [`SOAT-LO.md`](SOAT-LO.md).
> Lịch sử và bài học đầy đủ các vòng: [`../so-tay-giao-ngoai.md`](../so-tay-giao-ngoai.md).

## Mười một luật bắt buộc (máy kiểm phần lớn, phần còn lại người duyệt soát)

1. Chỉ trích từ các nguồn trong tệp `<nhom>.txt`: `nhom<4>.nhom`, `ch<2>.chuong`, `phan<2>.phan`, `sen.*`, `tax.*`, `wco.*`.
2. `trich` là câu chép **nguyên văn** từ đúng nguồn ghi ở `nguon`, ≤ 300 ký tự. Được lược bằng "…". Giữ nguyên lỗi chính tả gốc.
3. `loaiTru` chỉ ghi khi nguồn **nêu đích danh** nhóm đích, và số nhóm phải có trong câu trích. Không tính số nhóm chỉ là ví dụ linh kiện, dải "từ X đến Y" hay "Chương N".
4. `phanBiet`: mã ngoài nhóm phải có trong câu trích.
5. `dieuKienVao` dạng số: số đó phải có trong câu trích.
6. `dong8`: đủ mọi dòng `tax.*` của nhóm. `loaiKhac` máy tự điền theo biểu thuế (tên dòng bắt đầu bằng "Loại khác" → `true`), không cần cân nhắc. Có SEN thì ưu tiên điều kiện từ SEN. Dòng trùng chữ mà nguồn không phân biệt được thì ghi rõ, không đoán.
7. Không ghép hai câu xa nhau thành một kết luận. Không thêm hiểu biết riêng vào `dieuKien`/`text`.
8. Không sửa mã, nguồn hay câu trích để máy kiểm cho qua. Không trích được thì **xoá mục**.
9. (11/10/2026) `cay` do máy sinh — **không soạn**. Chỉ điền `cay.tenDien[]` `{id, tenVi, nguon, trich}` cho nút bị lược (tiêu đề quốc gia 7 số, nhóm một gạch 5 số) hoặc phân nhóm 6 số chưa có tên tiếng Việt, khi nguồn có câu nêu tên đó. Nút đã có tên / dòng 8 số → máy loại.
10. `tieuChi6[]` `{hs6, fact, op, value, donVi, nguon, trich}`: tiêu chí cấp 6 số từ chú giải/SEN/`wco.<6 số>` — không lấy từ `tax.*`; số phải có trong trích. `dong8[].tieuChi` `{fact, op, value, donVi}` tuỳ chọn, cùng luật số.
11. Không ghi `nguonLoai` — máy gán `AI_DA_KIEM`; người soát độc lập mới đổi sang `NGUOI_DUYET`. Sau khi nạp chạy `node scripts/check-cay.mjs --nhom=<nhom> --chi-tiet` để thấy chỗ còn trống của nhóm.

## Ý nghĩa của `dieuKienVao` (quan trọng cho bước nối cổng)

Đó là các sự kiện *mô tả hàng thuộc nhóm*, không phải điều kiện cần. Cổng sau này **không được** loại một nhóm chỉ vì thiếu một `dieuKienVao`. Dùng chúng để gợi ý hỏi người khai, không để chặn.

## Quyết định đã đúc từ các vòng trước (không mở lại)

- **Không lô nào được gộp nếu chưa qua bước soát độc lập** — máy kiểm chỉ chứng minh câu trích có thật trong nguồn, không chứng minh nó nói đúng điều mục khẳng định (vòng 2 xoá 325 + sửa 95 trên ~1.300 mục; vòng 1 soát lại xoá 262 + sửa 281).

## `dieuKienSo` có kiểu theo `tu-vung@1` (30/10/2026, #573 — plan L1-3b)

Thêm, không thay: điều kiện cũ (fact snake_case như `duong_kinh`, op `<=`/`LA`/`HOAC`) giữ nguyên. Điều kiện **có kiểu** khi `fact` là khoá của `data/tu-vung/tu-vung@1.json`; lược đồ và máy kiểm ở `lib/dieu-kien-so.js`.

| Kiểu khoá | Điều kiện | Trích phải có |
|---|---|---|
| `SO` | `{fact, op: <=\|<\|>=\|>, value, donVi}` (đơn vị cùng hệ của khoá) | số + đơn vị (nhận "1.000", "19,5") |
| `CO_KHONG` | `{fact, op: CO\|KHONG}` | một mẫu `cachDoc` của khoá |
| `LIET_KE` | `{fact, op: TRONG, value: [..]}` (mọi giá trị ∈ `giaTriHopLe`) | mẫu `cachDoc` của TỪNG giá trị |
| `TEN_LOAI` / `CONG_DUNG` | `{fact, op: TEN_LOAI\|CONG_DUNG, value: chuỗi \| [chuỗi, …] ("hoặc")}` | chính chữ của từng giá trị |
| vế mở "X, Y và các loại tương tự" (vòng 7) | `{fact: tenLoai, op: TUONG_TU, value: [<các hàng NÊU TÊN>]}` (không `chieu`) | cụm mở "tương tự"/"similar"/"the like" + chính chữ của từng tên nêu |
| `CHAT_LIEU_THEO_VI_TRI` | `{fact: chatLieu, op: LA, value: chuỗi \| [..], viTri?}` | mẫu của vật liệu (+ chữ vị trí nếu ≠ CHINH) |

- `chieu: PHAI_KHONG` (mặc định `PHAI_CO`) chỉ cho `TRONG`/`TEN_LOAI`/`CONG_DUNG`/`LA`; với `CO_KHONG`/`SO` dùng `KHONG` / đảo op.
- Dòng "Loại khác" **trần** không mang điều kiện. Dòng "Loại khác, <vế>" được mang điều kiện có kiểu cho vế riêng.
- Điều kiện của **tiêu đề** (nút 7 số / 5 số có tên) ghi ở `dieuKienNut[]` `{id, dieuKienSo, nguon, trich}`; nguồn `tieuDe.<id>` = tên nguyên văn của biểu thuế Tổng cục (`lib/so-tay.js#nguonTieuDe`). Tiêu đề "Loại khác" trần không ghi.
- So chữ tự do (`TEN_LOAI`, `CONG_DUNG`) là **không tất định**: chotDong8 không chốt bằng nó; bộ chấm hồ sơ (`doiChieuDong8`) gắn `tatDinh: false`.

## Số hoá ranh giới 6→8 số lát 1 — bản nháp + cổng máy (30/10/2026, #577 — plan L1-4a)

- Bản nháp: `data/ho-so/ranh-gioi/<pn6>.json` (`ranh-gioi@1`) — runtime **không** đọc. Công cụ: `scripts/so-hoa-ranh-gioi.mjs`
  (`--goi`, `--tao-nhap`, `--kiem`, `--duyet`, `--tra-ve`, `--ap-dung`, `--tom-tat`; chọn `--pn6=a,b` hoặc `--dot=1..5`). Cổng ở `lib/ho-so/cong-ranh-gioi.js`.
- Chỉ điều kiện **có kiểu** (bảng trên). Cổng 0 hình dạng/nhãn/quy trình; cổng 1 phủ kín theo luật đi tiêu đề có tên; cổng 2 không
  vector biên nào làm hai dòng cùng CO; cổng 3 trích nguyên văn đúng nút (mọi đoạn "…" kể cả đoạn ngắn, đúng thứ tự) + điều kiện khớp
  chữ (cực CO/KHONG, biên ≤/<).
- Nhãn: nháp `AI_DA_KIEM`; chỉ `--duyet` của **phiên khác người soạn**, cổng xanh (và bảng hiệu chỉnh tiền lệ có mục cho PN6 nếu
  phân nhóm có cờ — #653: bảng đã có mục ⇒ chỉ cảnh báo `can-bang-hieu-chinh-tien-le-da-co`, có cờ mà chưa có mục ⇒ DỪNG)
  mới nâng `CLAUDE_DUYET`; sửa sau duyệt ⇒ cổng 0 đỏ. Chỉ bản DUYET được `--ap-dung` vào `data/so-tay/<nhóm>.json`.
- Không ép qua cổng: không diễn đạt được bằng từ vựng, tiêu đề bị lược tên ⇒ để đỏ, ghi `ghiChuSoan`.
- **Chữ biểu tự chồng lấn** (GĐ 30/10/2026; vd 9004.90.10 kính thuốc ↔ .50 kính bảo hộ): không bịa điều kiện tách. Khai cặp ở
  `chongLanVanBan: [{cap: [hsA, hsB], lyDo}]` ⇒ cổng 2 hạ lỗi của đúng cặp đó thành cảnh báo `cong2-chong-lan-van-ban`; khai cặp
  không chồng lấn ⇒ đỏ `cong2-chong-lan-van-ban-thua`. Thứ tự ưu tiên (`uuTien`) chỉ khi trích được căn cứ (TB-TCHQ trong
  `precedents.json`, SEN/chú giải, GIR qua `lib/gir.js`) — chưa có lược đồ máy, ghi `ghiChuSoan`. Lúc chạy cặp này **không bao giờ tự
  chốt** (chotDong8 trả `TRANH_CAP`; `apDung` mang dấu `chongLanVanBan {voi, lyDo}` sang hai dòng sổ tay cho tầng hồ sơ trả
  `CANH_BAO` + `cauHoi`).

## Gia cố cho thợ rẻ (30/10/2026, #577) — máy chặn thêm

Quy trình từng bước cho MỘT phân nhóm: [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md). Lệnh: `node scripts/so-hoa-ranh-gioi.mjs --help`.

- **Spec thay cho sửa tay**: người soạn viết spec `ranh-gioi-spec@1` (JSON) rồi `--ap-spec=<tệp>`; bản nháp sinh lại từ khung mỗi
  lần, nhãn `AI_DA_KIEM`, trạng thái `NHAP`. Spec không được ghi `nguonLoai`/`trangThai`/`duyet`/`soanBoi`/`traVe`.
- **Mã thoát**: 0 xanh · 1 đỏ (sửa được) · 2 spec/lệnh sai · **3 DỪNG** (báo Claude, không tự xử lý). `--giai-thich=<mã>` giải
  thích mọi mã lỗi/cảnh báo (`lib/ho-so/ma-loi.js`).
- **Tầng không mã** (`lib/ho-so/tang-khong-ma.js` → lớp tầng `lib/hs-tree.js`): tiêu đề không mã của biểu thuế mà cây theo
  chữ số làm mất là nút `<pn6>~r<dòng>` trong cây của `--goi`. Tầng có tên ⇒ khai `dieuKienNut` cho id đó (nguồn
  `tieuDe.<pn6>~r<dòng>`); bỏ qua ⇒ `cong1-tang-khong-ma:<hs>:r<dòng>`. Tầng "Loại khác:" trần không ghi điều kiện. Tầng không
  biểu diễn được ⇒ `--goi` in khối DỪNG, cổng 1 chặn `cong1-tang-khong-ma-khong-dat:<hs>:r<dòng>` — không có cách khai để vượt.
- **Nhóm chữ số không tên trong suốt** (31/10/2026, #606 — 848180): tiêu đề quốc gia 7 số mà cây theo chữ số dựng ra nhưng biểu
  thuế KHÔNG có dòng nào (không dòng có mã, không tiêu đề không mã nào có đúng tập lá của nút) bị bỏ khỏi lớp tầng
  (`lib/hs-tree.js#laNhomChuSoKhongTen`, `tangCua(pn6).trongSuot`): con nối thẳng vào cha, "Loại khác" phủ định đủ anh em theo
  chữ biểu (848180 r14562: mười mục gạch 3). Nhận diện chỉ từ dữ liệu biểu thuế; thiếu biểu thuế ⇒ vẫn chặn
  `tieu-de-bi-luoc-ten`. Toàn biểu 2026: 58 nút, 24 phân nhóm (chương 27, 40, 84, 85, 87, 98).
- **Cổng 1** chỉ thử vector thoả điều kiện tầng cha; tầng gốc không có phần còn lại thì vật mang tên ngoài mọi chữ của các con
  coi là ngoài phân nhóm.
- **Phần còn lại có tên** ("Động cơ khác", "Cáp … plastic khác", "…, loại khác"): `phanConLai: true` (phủ định mọi anh em ĐỨNG
  TRƯỚC) hoặc mảng mã anh em. Trích phải có chữ "khác". Không dùng trên dòng "Loại khác…". Máy cảnh báo `nghi-phan-con-lai`.
  Nội dung chỉ là "các loại khác" (cả phân nhóm cùng tên, vd 8501.10 r14839 "Động cơ khác, …") ⇒ `phanConLai` đứng một mình,
  `dieuKienSo: []` (#653). "khác" không trỏ anh em đứng trước ⇒ `phanConLai: false` (khai rõ, tắt cảnh báo; luật đi như không ghi).
- **Tên cụ thể hơn thắng** (`tenCuTheHon`; từ #600 cả trong HOAC và cặp chéo khoá — `tenCuTheHonDong`): "bàn đạp" ⊃ "Bàn" không phải chồng lấn. Tên trên đường đi = HỢP âm tiết của các điều
  kiện cùng khoá (tiêu đề "Búp bê" + dòng "Quần áo"). Bên còn ràng buộc chữ tự do trên khoá khác (dungCho/congDung — trục khác,
  853669) thì không phân; bên CHUNG chỉ thêm giới hạn tất định (số, có-không, liệt kê, chất liệu: "Piston, đường kính 50–155 mm" ↔
  "Bạc piston") thì tên chứa trọn vẫn thắng (#653).
- **"dùng cho" có nghĩa**: bộ so âm tiết giữ "dùng cho"/"sử dụng cho" (không bỏ như hư từ): "dùng cho điện ảnh" không nằm trong
  "chứa phim điện ảnh" (#653). "cho" đứng một mình vẫn bỏ.
- **dungCho theo cấp mã HS**: "nhóm 87.11" thoả "Chương 87"; ngược lại chưa biết. **Dải mã** (vòng 4): "8701.91 đến 8701.95", "từ
  A đến B", "A–B" (cùng cấp, cùng chương, A < B) nở thành mọi mã có trong cây giữa hai đầu — cả lúc cổng lẫn lúc chạy
  (`lib/dieu-kien-so.js#maThamChieu`/`daiMa`); cổng 2 thử thêm một mã GIỮA dải (848390: xe kéo 8701.92 trước đây rơi sang .13 "xe
  kéo khác").
- **HOẶC của các nhóm VÀ**: `{op: "HOAC", phuongAn: [[đk…], [đk…]]}` — ≥ 2 phương án, mọi vế là khoá tu-vung@1, không lồng, không
  `chieu`. Dùng khi mỗi vế của chữ biểu có ngưỡng riêng (9405.42.30, 8536505); KHÔNG gộp ngưỡng của một vế cho cả dòng.
- **Vector biên** (#653): khoá `LIET_KE` có thêm một giá trị "ngoài mọi giá trị liệt kê" (dòng dưới "Loại khác" phủ định khoá liệt
  kê tới được — 8501.10 kieuDongCoDien); nút trên/dưới cùng khoá chữ tự do được ghép giá trị "<dưới> <trên>" thoả cả hai. Vét cạn tới
  100.000 tổ hợp mỗi cặp/tầng; vượt ⇒ lấy mẫu tất định, cảnh báo `cong1-/cong2-lay-mau`, `thongKe.layMau` (người soát biết).
- **Điểm mù**: `cong2-dong-khong-toi-duoc` (LỖI — không vector nào tới dòng, xanh giả), `cong2-diem-mu` (cảnh báo — cùng khoá chữ
  tự do ở nút trên/dưới mà giá trị ghép không thoả được), `cong3-bien-khong-doc-duoc` (cảnh báo — người soát đối chiếu biên tay), `cong3-trich-qua-dai` (LỖI —
  mục có điều kiện mà trích > 300 ký tự).
- **CHONG_LAN_VAN_BAN có máy chặn**: `lyDo` phải trích nguyên văn (ngoặc kép) chữ biểu của CẢ HAI nhánh rẽ
  (`cong3-chong-lan-thieu-trich`) và ít nhất một câu trích là chữ của chính một dòng trong cặp (`cong3-chong-lan-chi-trich-tieu-de`);
  chồng lấn theo TRỤC (392690, 401699, 854442 — một nhánh chồng ≥ 3 nhánh anh em; ≥ 2 khi cụm có tiêu đề/tầng; hai tiêu đề chia theo
  tên ↔ công dụng) ⇒ `cong2-chong-lan-truc`, DỪNG — khai chongLanVanBan không gỡ được (cặp khai thành `cong2-chong-lan-van-ban-truc`). Chồng lấn do bộ so chữ hay "khác" cuối dòng: không khai — dùng `phanConLai` hoặc để đỏ.
- **Định danh phiên**: `<định danh>#<soan|soat>-<nhãn>` (vd `https://claude.ai/code/session_…#soan-830220`,
  `cursor:<mô hình>:<yyyymmddThhmm>#soan-830220`). `--duyet` đòi `#soat-…`; cùng định danh + nhãn chỉ đổi vai = tự duyệt.
- **ghiChuSoan** `{ma, loai, ghiChu, khoaDeXuat?}`, `loai` ∈ `QUYET_DINH | DE_TRONG | CHONG_LAN | LECH_TIEN_LE | THIEU_KHOA_TU_VUNG | DUNG | BO_VE`
  (`BO_VE` có hình dạng riêng `{ma, loai: "BO_VE", ve, lyDo}` — xem cổng 5 dưới).
- **Thiếu khoá tu-vung**: không tự đặt khoá — để trống, ghi `THIEU_KHOA_TU_VUNG` + `khoaDeXuat` ⇒ DỪNG. Đề xuất khoá:
  [`de-xuat-tu-vung-2.md`](de-xuat-tu-vung-2.md). `tu-vung@1` không đổi (khoá cứng theo bench).

## Cổng 5 — phạm vi VẾ bổ nghĩa (31/10/2026, #577 — sau soát L1-4c đợt 2 #659)

Soát độc lập đợt 2 tìm **12/136 mục sai (8,8%)**, gần hết MỘT kiểu mà cổng 0–3 không thấy: phạm vi của vế bổ nghĩa. Cổng 5
(`lib/ho-so/cong-ranh-gioi.js#kiemVe`, tách vế ở `lib/ho-so/tach-ve.js`) đọc chữ biểu NGUYÊN VĂN của từng mục có điều kiện (VI từ
`data/bieu-thue/<ngày>/` bieu-chinh + tieu-de, kể cả tầng không mã; EN của cùng dòng để đối chiếu cấu trúc) và chặn:

| Mã | Máy thấy | Hướng sai |
|---|---|---|
| `cong5-ve-gioi-han-bi-bo:<mã>:<vế>` | vế GIỚI HẠN ("không …", "có thể …", "dùng cho/để/cho …", "bằng …", "của …", biên số, "(trừ …)", "…, hoàn chỉnh") không điều kiện nào đọc tới, không lặp chữ tầng cha, không miễn | RỘNG hơn chữ |
| `cong5-ve-mo-bi-bo:<mã>:<vế>` | vế MỞ ("… và các loại tương tự", "và bộ phận của chúng", "và các loại … khác") bị bỏ trong khi danh sách đứng trước nó bị liệt kê ĐÓNG thành điều kiện | HẸP hơn chữ |
| `cong5-dinh-ngu-tach:<mã>:<định ngữ>` | theo chữ Anh cùng dòng, định ngữ là CHUNG của các danh từ đầu liên hợp nhưng chỉ gắn cho một phần (8536901, 85369093) — hoặc chỉ của danh từ cuối mà gắn cho tất cả (63079070) | rộng / hẹp |
| `cong5-de-trong-chua-xu-ly:<mã>` (cảnh báo) | ghi chú `DE_TRONG` hoặc chữ "người soát xem", "lưu ý soát" | chưa xử lý |

Luật (không mở lại):
- **Mỗi vế hoặc được phủ, hoặc được miễn TƯỜNG MINH.** Miễn: `ghiChuSoan {ma, loai: "BO_VE", ve: "<nguyên văn vế>", lyDo}`. `ve` phải
  có nguyên văn trong chữ biểu của mục (`cong5-bo-ve-khong-co-trong-chu`). `lyDo` rỗng / dưới 10 ký tự / "người soát xem" /
  "DE_TRONG" ⇒ `cong5-bo-ve-ly-do` và vế vẫn đỏ. Mọi miễn hiện ra cảnh báo `cong5-bo-ve` cho người soát. `BO_VE` nằm trong băm
  duyệt (đổi sau duyệt ⇒ `cong0-sua-sau-duyet`).
- **DỪNG thay vì miễn** khi bỏ vế làm đổi mã 8 số mà không có quy ước đã đúc (vd 940542 "không nhấp nháy": .30 5% lấn .90 10%) —
  thiếu khoá ⇒ `THIEU_KHOA_TU_VUNG`. Miễn chỉ dành cho vế mà lý do đứng được một mình (quy ước 392690 cho vế mở; vế lặp ý danh từ đầu).
- **Ghi chú `DE_TRONG` không phải đã xử lý.** 4/6 bản bị trả về ở #659 tự ghi `DE_TRONG` / "người soát xem" đúng chỗ sai. Cổng 5
  cảnh báo; `--duyet` từ chối tới khi người soát ghi `--giai-quyet=<mã>:<kết luận>` cho TỪNG mục (lưu ở `duyet.giaiQuyetDeTrong`).
- **Vế mở**: không ghi danh sách đóng làm điều kiện khi chữ có vế mở. "X và bộ phận của chúng" ⇒ `HOAC [[tenLoai X], [laBoPhan CO,
  dungCho X]]`.
- **Định ngữ chung** ⇒ một điều kiện riêng áp cho mọi danh từ đầu (không nhét vào một giá trị tenLoai); định ngữ riêng của danh từ
  cuối ⇒ `HOAC`.
- Không đòi phủ: danh từ đầu (thường lặp tên tầng cha), ngoặc chú thích, "kể cả …", "bằng mọi loại vật liệu", vế lặp nguyên văn chữ
  của tầng cha/phân nhóm/nhóm.
- Xem vế + trạng thái từng vế: `node scripts/so-hoa-ranh-gioi.mjs --ve --pn6=<pn6>`; `--goi` in sẵn vế phải phủ cho người soạn.
- Người soát L1-4c: bảng soát [`SOAT-RANH-GIOI.md`](SOAT-RANH-GIOI.md).
- Máy là bộ tách theo dấu hiệu, có thể đọc sai cấu trúc câu: đọc sai ⇒ `BO_VE` có lý do giải thích cấu trúc, người soát quyết; báo
  Claude để chỉnh bộ tách (không ép điều kiện cho máy vui).

## Vòng 4 (31/10/2026, #577 — soát 21 PR thợ #620–#647): quyết định GĐ (không mở lại)

Chi tiết + ví dụ: [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md) bước 3.3, 3.8, 3.11, 4 (Chồng lấn 6–7), 4.8.
- **Không đổi khoá để né** `cong2-diem-mu` / `cong2-dong-khong-toi-duoc`: anh em và tiêu đề–dòng con cùng ý dùng cùng khoá (851762).
- Dòng **"Loại khác" trần** không ghi `DE_TRONG` (bật `cong5-de-trong-chua-xu-ly` suông) — không ghi gì hoặc `QUYET_DINH`.
- **Không nuốt vế**: "X và (các) bộ phận của chúng" (vế mở ⇒ HOAC), chất liệu/loại của hàng ĐÍCH ("dùng cho ống bằng gang đúc" ⇒
  `dungCho` "ống bằng gang đúc"), "gồm …" (giới hạn, kể cả trong "kể cả …" — 8536505).
- **Trục tên ↔ công dụng cấp dòng**: hai DÒNG anh em, một chỉ khoá tên, một có khoá công dụng, không chung khoá, chồng lấn thật ⇒
  `cong2-chong-lan-truc` — kể cả chỉ 2 anh em (940541, 940542, 841459 .10↔.30). Dòng có HOAC xét từng phương án. Không DỪNG nữa
  (#683): khai `chongLanTruc` (nhánh, trục, `cauHoiPhanBiet`, trích nguyên văn, `phanXu: null`) — QUY-TRINH mục 4a; người soạn KHÔNG
  điền `phanXu`. Cổng 2 hạ các cặp đó thành cảnh báo `cong2-chong-lan-truc-da-khai`; đây là ngoại lệ duy nhất của "cổng 2 không nới" (luật tên nguyên văn của anh em, mục dưới, không hạ lỗi thành cảnh báo mà chứng minh hai dòng loại trừ nhau).
- **Giá trị LIET_KE định nghĩa đúng bằng các vế của tiêu đề** (8536503 `NGAT_SOC_DONG`): người soạn khai `BO_VE` có lyDo trích định
  nghĩa; người soát chấp nhận hoặc trả về. Công cụ không đổi.
- **"X và bộ phận" nhiều anh em** (871410, 845290): giữ dạng HOAC. ~~chồng lấn so chữ tự do VẪN là lỗi ⇒ DỪNG~~ — **thay bằng
  quyết định GĐ 31/10/2026 (luật tên nguyên văn của anh em)**: cặp chéo khoá `tenLoai X` ↔ `laBoPhan CO + dungCho Y` giữa hai anh em,
  X/Y là tên đầu NGUYÊN VĂN của chính dòng mình (danh từ đầu hoặc vế "kể cả …" liền sau) và rời nhau đúng như hai giá trị `tenLoai`
  của anh em (không ứng viên nào thoả cả hai) ⇒ cổng 2 coi là loại trừ, cảnh báo `cong2-ten-anh-em-roi`. Tên không nguyên văn, tên
  ↔ công dụng không có laBoPhan (trục) ⇒ vẫn lỗi. Chỉ là luật chứng minh của cổng; runtime không đổi. Chi tiết: QUY-TRINH mục 4 bước 7.
- **Tên cụ thể hơn thắng vào HOAC + cặp chéo khoá** (quyết định GĐ (a), #600 — 845290): cùng ngữ nghĩa `tenCuTheHon`, mở rộng ở
  `lib/dieu-kien-so.js#tenCuTheHonDong` — mục có HOAC trải thành các phương án THOẢ, mọi cặp phương án phải phân cùng chiều; cặp
  chéo khoá `tenLoai X` ↔ `laBoPhan CO + dungCho Y` so tên X ↔ Y (ở cổng chỉ khi X/Y là tên đầu nguyên văn của nút rẽ nhánh). "bàn đạp"
  ⊃ "Bàn" ⇒ .11 thắng .12, cảnh báo `cong2-ten-cu-the-hon`. Cổng 2 và `doiChieuPhanNhom` lúc chạy gọi CÙNG hàm (không xanh giả).
- `chiHoacChuYeu` đọc thêm "(được) thiết kế chỉ để", "designed only for" (tu-vung@2; "solely designed for" đã đọc từ trước).
- Bộ tách vế: "có dải tần số …" là một vế biên số; "có hình dạng đặc biệt hoặc thích hợp để …" là một vế khi chữ Anh xác nhận
  ("shaped or fitted for"); không chắc ⇒ vẫn tách (giữ cờ).
- Nhãn `tuVung` = từ vựng runtime lúc `--ap-spec`; sửa nhãn cũ bằng `--nhan-tu-vung` (Claude).

## Vòng 5 (31/10/2026, #577 — sau soát L1-4c đợt 3 #697): quyết định GĐ (không mở lại)

Chi tiết + ví dụ: [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md) bước 3.2 và mục 4 (Chồng lấn 7).
- **Liệt kê HOẶC gói trong MỘT chuỗi chữ tự do** (phát hiện hàng đầu của người soát đợt 3: 841459 .10, 950300 .91): giá trị
  `TEN_LOAI`/`CONG_DUNG` có " hoặc ", ";" hay liệt kê phẩy, không mã HS ⇒ lỗi `cong3-liet-ke-trong-mot-chuoi:<mã>:<khoá>` (cổng 3,
  mọi trạng thái — chạy trên 50 bản nháp lúc thêm: không bản DUYET nào trúng). Sửa: mảng chuỗi con nguyên văn. Ngoại lệ theo bằng
  chứng chữ Anh cùng dòng (cùng cách bộ tách vế đọc "shaped or fitted for"): liệt kê nối "và" có đúng k mục liên hợp sau for/of
  ("for transport, handling and storage" — 853710 .30); dấu phẩy có cả ở chữ Anh mà chữ Anh không liệt kê and/or ("Slugs,
  round," — 761699 .30); "có hoặc không …".
- **Đích "của chúng" ↔ tên tiêu đề tổ tiên** (950300, #696): `dungCho Y` từ vế "… của chúng"/"therefor" của một dòng (Y = danh từ
  đầu của dòng) ↔ nhánh anh em không có `dungCho` mà một tiêu đề tổ tiên mang tên đầu X; X, Y rời nhau như luật tên nguyên văn của
  anh em (#692, cùng độ chặt — tên chứa nhau không chứng minh được) ⇒ cổng 2 coi là loại trừ, cảnh báo `cong2-dich-cua-chung-roi`.
  Chỉ là luật chứng minh của cổng: runtime không đổi, hàng thoả cả hai thì động cơ hỏi (cùng lớp khoảng trống #692/#698).

## Vòng 6 (31/10/2026, #577 — gỡ DỪNG 848180, 732690): quyết định GĐ (không mở lại)

- **Trục thứ ba `DAC_DIEM` của `chongLanTruc`**: nhánh chia theo khoá đặc điểm tất định (CO_KHONG / LIET_KE — 8481805
  `coKhoangPhaTron`, r14573 `cachDieuKhien`) cạnh nhánh chia theo tên/công dụng. Cùng nghĩa hai trục cũ ở cổng
  (`lib/ho-so/cong-ranh-gioi.js`) và lúc chạy (`lib/ho-so/duong-di.js`, `doi-chieu.js`): hàng thoả ≥ 2 nhánh khác trục ⇒ chưa chốt
  `chong-lan-truc` + câu hỏi phân biệt; chỉ `phanXu` kiểm được mới chọn; không bao giờ GIR. `truc` phải khớp khoá riêng của nhánh
  (`cong3-chong-lan-truc-truc-lech`).
- **"bằng vật liệu khác" ⇒ `chatLieu` `chieu: PHAI_KHONG` <chất liệu của anh em đứng trước>** (848180 .93 ↔ .83/.84 "bằng
  plastic"): máy kiểm sổ tay (`lib/so-tay.js#vatLieuKhacTheoAnhEm`, cổng 3 + apDung) nhận bằng chứng ở chữ biểu nguyên văn của
  anh em ĐỨNG TRƯỚC cùng cha khi: trích của mục có "vật liệu khác"/"chất liệu khác"; vị trí CHINH; phần chữ trước cụm đó (cùng tên
  hàng) có trong chữ anh em. Cổng 5 neo vế "bằng vật liệu khác". Không dùng `phanConLai` thay (phủ định cả biên số của anh em).
- **Giá trị chữ tự do toàn ASCII** ("Van bi", "Piston", "Micro"…): bộ so chữ lúc chạy coi là chữ Anh nên so với tên có dấu luôn
  CHUA_BIET; cổng thêm ứng viên vector "<giá trị> ẑẑẑ" (`bangUngVien`) để dòng dưới tới được (848180 .71/.72). Runtime không đổi.
- **Liệt kê tên của CÙNG một vật** (732690 .70 "mấu, gai, đinh móc" = EN "riding boot spurs"): mảng tên nguyên văn thay thế nhau
  không rộng nghĩa; định ngữ chung ("lắp trên giày để thúc ngựa") thành điều kiện riêng.
- Khoá tu-vung@2 mới: `daXuLyBeMat` (CO_KHONG), `nhienLieu` (LIET_KE GA | DIEN) — [`de-xuat-tu-vung-2.md`](de-xuat-tu-vung-2.md).

## Vòng 7 (31/10/2026, #577 — sau soát L1-4c đợt 4 #711): quyết định GĐ (không mở lại)

Chi tiết + ví dụ: [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md) bước 3.2, 3.11 và mục 4 (Chồng lấn 8).
- **Liệt kê tên hàng nối "và" gói MỘT chuỗi** (phát hiện hàng đầu đợt 4: 392620 .20, 845290 .11/.91, 851762 .10): `cong3-liet-ke-trong-mot-chuoi`
  bắt cả " và " khi CẢ HAI bằng chứng có mặt — chữ " và " của giá trị nằm trong mệnh đề DANH TỪ ĐẦU của vế chữ biểu, và chữ Anh cùng
  vế nối hai danh từ đầu bằng and/or với vế trước là danh từ số nhiều ("Shoulder pads or shields", "Arms and beds", "Radio
  transmitters and radio receivers"). Không báo: danh từ ghép một hàng ("Transmission and reception apparatus" 851762 .52, "word
  making and talking sets" 950300 .91, "Control and adaptor units"), "và" ở vế "dùng cho/kể cả …" (đích, thuộc tính — 732690 .30
  "for hubless cast iron pipes and pipe fittings"). Chạy trên 50 bản nháp lúc thêm: không bản DUYET nào trúng. Sửa: mảng chuỗi con
  nguyên văn; định ngữ chung thành điều kiện riêng (392620 .20: tenLoai ["Miếng đệm","miếng bảo vệ"] + tenLoai "vai").
- **Giá trị chứa "tương tự"/"similar" là giá trị CHẾT** (950300 .10 "đồ chơi tương tự có bánh" — mô tả hàng thật không có chữ đó, xe
  chòi chân rơi .99 20% thay vì .10 10%): cổng 5 không tính nó là phủ vế mở và báo lỗi `cong5-gia-tri-tuong-tu:<mã>:<khoá>`.
- **Op `TUONG_TU` cho vế mở "X, Y và các sản phẩm/loại tương tự [dùng cho Z]"** (761699 .40, 950300 .10): (1) hàng NÊU TÊN (X, Y) khớp
  tất định như TEN_LOAI; (2) hàng chỉ "tương tự" ⇒ lúc chạy CHƯA BIẾT — hỏi người khai/chuyên gia ("Hàng có thuộc loại tương tự X,
  Y không?", câu hỏi `TUONG_TU`), không bao giờ tự chọn, không bao giờ TRÁI chỉ vì khác tên; câu trả lời `duKien tenLoai .tuongTu
  {<khoá>: true|false}` ⇒ THOẢ/TRÁI không tất định, `lib/gir.js` không trích; (3) phần giới hạn (dùng cho Z, chất liệu, "có bánh")
  vẫn là điều kiện tất định riêng; (4) **không** dùng `chongLanTruc` để nuốt chồng lấn do cách biểu diễn này (761699 cụm 7 nhánh bị
  trả về đúng vì vậy). Cổng 3: trích phải có cụm mở + mọi tên nêu nguyên văn (`dieu-kien-so-tuong-tu-*`). Cổng 2: tên của anh em
  cho dòng TUONG_TU kết quả CHƯA BIẾT, không THOẢ ⇒ không chồng lấn tất định; cặp mà câu trả lời "có" sẽ làm hai dòng cùng CO ⇒ cảnh
  báo `cong2-tuong-tu-chua-chot` (không khai chongLanTruc). Vector biên thêm "tên ngoài danh sách + trả lời có/không" để dòng "Loại
  khác" tới được. Giới hạn chỉ của hàng tương tự (EN "similar wheeled toys") ⇒ HOAC [[TEN_LOAI X…], [TUONG_TU X…, <giới hạn>]].
