# VAI TRÒ
Bạn là thợ số hoá ranh giới phân nhóm 6 số (PN6) cho repo hs-code-api. Với mỗi GÓI được đưa, viết MỘT spec JSON ranh-gioi-spec@1 đúng luật dưới đây. Chỉ dùng khoá từ vựng trong mục TỪ VỰNG. Mọi trích/giá trị chữ phải là chuỗi con NGUYÊN VĂN của chữ biểu trong gói. Không bịa điều kiện. Không chắc ⇒ để dieuKienSo [] + ghi chú THIEU_KHOA_TU_VUNG (kèm khoaDeXuat) hoặc DUNG. Không ghi nguonLoai/trangThai/duyet. phanXu luôn null.

# BẢNG LUẬT CHUNG
# Bảng luật chung — chữ biểu thuế → cách biểu diễn (đọc TRƯỚC khi soạn bất kỳ phân nhóm nào)

GĐ đúc từ 8 vòng soát lát 1 (30/10–01/11/2026, #577). Mỗi dòng: **dạng chữ** gặp trong biểu thuế → **cách viết đúng** →
**sai hay gặp**. Chi tiết, ví dụ và mã lỗi máy ở `LUAT-CHUNG.md` (mục vòng ghi trong ngoặc). Soạn đúng bảng này một lượt là đủ;
máy kiểm chặn phần còn lại. Không mở vòng sửa công cụ mới cho một phân nhóm lẻ — vướng ngoài bảng ⇒ `DUNG` có lý do, để lát sau.

| # | Dạng chữ biểu | Cách viết | Sai hay gặp |
|---|---|---|---|
| 1 | "A hoặc B", "A, B, C", "A và B" khi chữ Anh là **hai hàng** ("pads or shields", "arms and beds") | Mảng giá trị nguyên văn `["A","B"]` (một giá trị = một hàng) | Gói vào một chuỗi ⇒ máy đọc thành VÀ, hẹp hơn chữ (vòng 5, 7) |
| 2 | "A và B" khi chữ Anh là **một hàng ghép** hoặc thuộc tính ("transport, handling and storage", "transmission and reception apparatus") | Giữ một chuỗi | Tách mảng ⇒ rộng hơn chữ |
| 3 | Vế bổ nghĩa **chung** cho nhiều danh từ ("… điện báo hoặc điện thoại **truyền dẫn bằng sóng vô tuyến**", "… bếp nấu hoặc bếp có lò nướng **bằng ga**", "… **lắp trên giày để thúc ngựa**") | Danh từ thành mảng + vế chung thành **điều kiện riêng** (khoá liệt kê/có-không nếu tu-vung@2 có; không có ⇒ thêm khoá @2) | Dính vế vào tên hàng, hoặc tách mảng mà bỏ vế chung (vòng 6) |
| 4 | Vế mở "X, Y **và các loại/sản phẩm tương tự** [dùng cho Z]" | `{fact:tenLoai, op:TUONG_TU, value:[X,Y]}` + phần giới hạn (dungCho Z…) riêng. Hàng có tên ⇒ chốt; hàng "tương tự" ⇒ máy hỏi | Đóng thành danh sách tên; giá trị chứa chữ "tương tự"/"khác" (giá trị chết) (vòng 7, 8) |
| 5 | "X **và (các) bộ phận của chúng**" | `HOAC [[tenLoai X],[laBoPhan CO, dungCho X]]`, X là tên đầu nguyên văn của chính dòng | Bỏ vế "bộ phận" (vòng 4); dùng tên không nguyên văn |
| 6 | Dòng "**… khác**" / "Loại khác" | `phanConLai` — chỉ phủ định **các anh em có tên** (kể cả tầng anh em + con của nó); "Loại khác" trần: không điều kiện, ghi chú `QUYET_DINH` | `DE_TRONG` cho "Loại khác"; dùng điều kiện tự bịa thay cho phần còn lại (vòng 4, 8b) |
| 7 | "**bằng vật liệu khác**" sau anh em "bằng plastic" | `chatLieu PHAI_KHONG [<chất liệu của anh em>]` — bằng chứng là chữ của anh em đứng trước cùng tên hàng | `phanConLai` phủ cả biên số của anh em (vòng 6) |
| 8 | Chất liệu / loại của **hàng đích** ("kẹp cho ống **bằng gang đúc**") | Ghi trong `dungCho` trọn cụm đích nguyên văn | Gán chất liệu cho chính hàng đang phân loại (vòng 4) |
| 9 | Dẫn mã ("thuộc nhóm 84.29", "8701.91 đến 8701.95", "thuộc phân nhóm 8483.10 dùng cho …") | `dungCho` giữ nguyên chuỗi mã; máy tự nở dải, tự nối tên↔mã, tự tách đích lồng | Đổi sang `congDung`/`tenLoai` để né cảnh báo (vòng 4, #710) |
| 10 | Anh em **cùng cách chia** (đều nói "dùng cho …", hoặc đều nêu tên) | **Cùng một khoá** cho mọi anh em, theo đúng chữ | Mỗi anh em một khoá ⇒ chồng lấn giả (848180, vòng 8) |
| 11 | Anh em chia **khác trục** (dòng này theo tên, dòng kia theo công dụng/đặc điểm) mà có **hàng thật** khớp cả hai | `chongLanTruc` (trục TEN_LOAI / CONG_DUNG / DAC_DIEM) + `viDuHang` cho **từng** cặp + câu hỏi phân biệt; `phanXu: null` | Khai cụm để nuốt cặp không có hàng thật (761699, 848180, 401699 bị trả) (vòng 8) |
| 12 | Chữ biểu **tự chồng** (hai dòng cùng trục, câu không loại trừ nhau: "Kính thuốc" ↔ "Kính bảo hộ") | `chongLanVanBan` trích nguyên văn **chữ của chính hai dòng** | Trích chữ tiêu đề cha; khai cho cặp không chồng (`-thua`) (vòng 3, 8b) |
| 13 | Biên số ("trên 5 cm nhưng không quá 40 cm", "từ 1 đến 2,5 cm") | `>` / `<=` / `>=` đúng từng mốc, đơn vị nguyên văn | Lẫn ≤ với < ; bỏ một đầu |
| 14 | Tiêu đề chỉ có chữ số, không tên | Không viết điều kiện — cây tự bỏ qua (#700) | Viết điều kiện cho nút không có chữ |

**Không bao giờ:** điền `phanXu`; ghi `nguonLoai/trangThai/duyet`; chạy `--duyet/--tra-ve/--ap-dung` khi là người soạn; đổi khoá để
né cổng; khai `chongLanVanBan`/`chongLanTruc` để ép xanh; trích nguồn `AI_CHUA_KIEM`; đọc `data/bench/ho-so-lat-1*`, `data/oz-export/*`.

**Còn ngoài bảng (lát 1 để DỪNG, không mở vòng công cụ):** cặp tên ↔ công dụng mà máy không chứng minh rời được nhưng không có hàng
thật (392690, 848180, 401699) — lúc chạy các mã này đi đường cũ ("chưa số hoá").

# LUẬT CHUNG
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
  Vòng 8b (#661): phủ định ĐIỀU KIỆN của anh em được nêu; anh em là tầng mà các con không phủ kín ⇒ phủ định "tầng VÀ một con"
  (hàng thoả tầng mà không vào con nào rơi về phần còn lại) — mục Vòng 8b dưới.
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
  tên ↔ công dụng) ⇒ `cong2-chong-lan-truc`, DỪNG — khai chongLanVanBan không gỡ được (cặp KHÁC trục khai thành `cong2-chong-lan-van-ban-truc`;
  cặp CÙNG trục trong cụm được khai — Vòng 8b). Chồng lấn do bộ so chữ hay "khác" cuối dòng: không khai — dùng `phanConLai` hoặc để đỏ.
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

## Vòng 8 (01/11/2026, #577 — sau soát L1-4c đợt 5 #716): quyết định GĐ (không mở lại)

Chi tiết + ví dụ: [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md) mục 4a.
- **Mỗi cặp `chongLanTruc` cần một hàng THẬT** (`viDuHang`): `chongLanTruc` đã hai lần nuốt chồng lấn do cách chọn khoá (761699,
  848180). Mỗi mục khai `viDuHang: [{cap: [idA, idB], hang}]` cho MỌI cặp nhánh khác trục mà cụm phủ (cặp cổng 2 thật sự thấy chồng
  lấn trong cụm). Thiếu ⇒ `cong2-chong-lan-truc-thieu-vi-du:<cụm>:<cặp>`; `hang` đọc thành dữ kiện bằng cùng bộ đọc lúc chạy
  (`lib/ho-so/doc-du-kien.js#docKhoa`) và đối chiếu bằng cùng bộ so (`lib/dieu-kien-so.js#doiChieuDong8`) mà không thoả cả hai nhánh
  ⇒ `cong2-chong-lan-truc-vi-du-sai:<cụm>:<cặp>` (kiểm cả ở cổng 0+3). Bản DUYET (soát trước luật này: 841459, 851762, 854442,
  940541, 940542) chỉ nhận CẢNH BÁO — không sửa sau duyệt; NHAP/TRA_VE là LỖI. `viDuHang` thuộc băm duyệt. Cặp không có hàng thật ⇒
  không khai trục: đưa anh em cùng ý về cùng khoá (848180: "Van đường ống nước", "Van xi lanh khí … (LPG)" nêu đích như "Van dùng
  cho săm" ⇒ `dungCho`), còn lại ⇒ DỪNG. Máy chỉ kiểm hàng ví dụ nhất quán với điều kiện; hàng có thật hay không do người soát đọc.
- **Vế mở dài "… và các <1–6 chữ> tương tự"** (950300 .40 "Các mô hình thu nhỏ theo tỷ lệ ("scale") và các mô hình giải trí tương
  tự"): bộ tách vế nhận là vế MỞ khi chữ Anh cùng dòng có "similar"/"the like" và không chữ nào chen giữa là dấu hiệu bổ nghĩa
  (bằng, có, dùng, cho, …). Mẫu cũ (≤ 4 chữ) không đổi. Vế mở có "tương tự" chỉ được phủ bằng `TUONG_TU` (hoặc khoá khác): một giá
  trị `TEN_LOAI` neo trong chính vế mở ("mô hình giải trí") là liệt kê đóng thêm một tên — vẫn `cong5-ve-mo-bi-bo`. Chạy trên mọi
  bản nháp lúc thêm: chỉ 950300 (TRA_VE) đổi; không bản DUYET nào lật.
- **Vector "tên anh em + tương tự = KHÔNG"**: tên NÊU của một anh em kèm câu trả lời "không tương tự" cho mọi điều kiện TUONG_TU là
  câu trả lời trung thực — cổng thêm vector này để dòng dưới tầng "Loại khác" phủ định một dòng chỉ có TUONG_TU tới được (950300
  .91–.93). Lúc chạy không đổi: hàng không nêu tên dưới 950300 được hỏi câu "tương tự" của .10 và .40.

## Vòng 8b (01/11/2026, #577 — gỡ hai DỪNG còn lại của #715: 392690, 840991): quyết định GĐ (không mở lại)

Chi tiết + ví dụ: [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md) bước 3.6 và mục 4 (Chồng lấn 6) + 4a.
- **`chongLanVanBan` cùng trục trong cụm trục** (392690 #683): cặp mà HAI nhánh rẽ CÙNG TRỤC — cả hai `CONG_DUNG` (3926904 "Các thiết
  bị, dụng cụ an toàn và bảo vệ" `congDung` ↔ 3926905 "Các sản phẩm dùng cho công nghiệp" `dungCho`: mặt nạ hàn dùng trong công
  nghiệp) hoặc cả hai `TEN_LOAI` — được khai `chongLanVanBan` kể cả khi nút thuộc một cụm `chongLanTruc`. Lệnh cấm vòng 3 chỉ nhắm
  cặp KHÁC trục: tên ↔ công dụng vẫn phải qua `chongLanTruc` (khai `chongLanVanBan` cho cặp khác trục ⇒ `cong2-chong-lan-van-ban-truc`).
  Trục của nhánh = trục khai trong `chongLanTruc` hợp lệ; nhánh không thuộc cụm khai thì suy từ khoá riêng (khoá công dụng không
  khoá tên ⇒ CONG_DUNG; khoá tên không khoá công dụng ⇒ TEN_LOAI; lẫn cả hai ⇒ không coi là cùng trục). Mọi đòi hỏi cũ giữ nguyên:
  `lyDo` trích nguyên văn chữ CẢ HAI nhánh (`cong3-chong-lan-thieu-trich`), ít nhất một câu là chữ của chính một dòng
  (`cong3-chong-lan-chi-trich-tieu-de`), khai cặp không chồng lấn ⇒ `cong2-chong-lan-van-ban-thua`. Cụm trục hết báo khi mọi cặp
  khác trục được `chongLanTruc` phủ và mọi cặp cùng trục đã khai. Lúc chạy không đổi: `chongLanVanBan` ⇒ hai mã, không tự chọn.
- **Cụm `chongLanTruc` phải có hàng THẬT thoả cả hai nhánh** (cùng ý `viDuHang` của Vòng 8 trên): không dựng cụm từ cặp mà vector
  biên gán tên và công dụng độc lập (392690 .93 "Khóa, … nút chặn dây" ↔ .91 "Loại dùng để chứa ngũ cốc" — không hàng nào vừa là
  khoá/móc/nút chặn vừa là loại dùng để chứa ngũ cốc). Không có hàng thật ⇒ không khai cụm; chồng lấn còn lại là của cách biểu diễn
  ⇒ DỪNG, báo Claude.
- **Phần còn lại có tên phủ định ĐIỀU KIỆN của anh em được nêu** (840991 #661): `phanConLai` (true = anh em đứng trước; mảng = anh
  em liệt kê) phủ định điều kiện của từng anh em đó; anh em là TẦNG mà các con không phủ kín tầng (không con "Loại khác" trần, không
  con phần còn lại có tên đứng một mình) ⇒ phủ định "điều kiện tầng VÀ điều kiện của một con" — hàng thoả tầng mà không vào con nào
  rơi về phần còn lại. 840991: tầng r12982 "Dùng cho tàu thuyền thuộc Chương 89" chỉ có hai con "Cho động cơ máy thủy …" (EN "marine
  propulsion engines"); bộ phận động cơ phụ của tàu ⇒ 8409917 "Dùng cho động cơ khác". Cùng nghĩa ở cổng 1 (tầng không phủ kín mà
  hàng rơi về phần còn lại nêu tầng ⇒ không lỗ), cổng 2 và lúc chạy (`lib/dieu-kien-so.js#duongDiDong8` nhóm `conTang`,
  `chamConTang`; `lib/ho-so/duong-di.js` → `doi-chieu.js`). Con chưa số hoá/chưa duyệt ⇒ giữ phủ định cả tầng (hướng an toàn).
  Dòng/tiêu đề "Loại khác" trần **không đổi** (vẫn phủ định cả điều kiện anh em, tầng không phủ kín vẫn là `cong1-khong-phu-kin`).

# CÁCH VIẾT SPEC (QUY-TRINH-SO-HOA mục 3)
## 3. Viết spec `docs/giao-viec/so-tay/spec/<pn6>.json`

Khung:

```json
{
  "phienBan": "ranh-gioi-spec@1",
  "pn6": "<pn6>",
  "phien": "<định danh>#soan-<pn6>",
  "dong8": {
    "<hs8>": { "dieuKienSo": [ … ] }
  },
  "dieuKienNut": {
    "<id tiêu đề>": { "dieuKienSo": [ … ] }
  },
  "ghiChuSoan": [
    { "ma": "<hs8>", "loai": "QUYET_DINH", "ghiChu": "tax.<hs8>: \"<chữ>\" ⇒ <khoá> <op> <giá trị>" }
  ]
}
```

Cho TỪNG dòng có tên và TỪNG tiêu đề có tên, theo thứ tự:

1. Đọc chữ nguyên văn của mục (trong `--goi`). Tách các ý (vế) của chữ — `--goi` in sẵn các vế GIỚI HẠN / MỞ mà cổng 5 sẽ kiểm.
2. Với mỗi ý, chọn MỘT khoá từ `--tu-vung` (bảng cách viết ở `LUAT-CHUNG.md`):
   - số + đơn vị ⇒ khoá `SO`: `{"fact": "<khoá>", "op": "<=|<|>=|>", "value": <số>, "donVi": "<như chữ trích>"}`.
     "không quá" = `<=`, "dưới" = `<`, "trên" = `>`, "từ … trở lên" = `>=`. "1.000" = 1000, "22,38" = 22.38.
   - có/không ⇒ `CO_KHONG`: `{"fact": "<khoá>", "op": "CO"}`; chữ "Không …" ⇒ `"op": "KHONG"`.
   - một trong danh sách ⇒ `LIET_KE`: `{"fact": "<khoá>", "op": "TRONG", "value": ["<GIA_TRI>"]}` — giá trị lấy từ `--tu-vung`, chữ
     trích phải chứa một cách đọc của giá trị.
   - tên hàng ⇒ `{"fact": "tenLoai", "op": "TEN_LOAI", "value": "<chuỗi con nguyên văn>"}`; công dụng / dùng cho ⇒ `congDung`/`dungCho`
     với `"op": "CONG_DUNG"`. Mảng giá trị = "hoặc".
   - **Liệt kê ⇒ MẢNG, không gói một chuỗi** (vòng 5, soát đợt 3 #697): bộ so chữ đòi ĐỦ âm tiết của một giá trị, nên
     `"làm mát bộ vi xử lý, thiết bị viễn thông, … hoặc các khối chức năng …"` trong MỘT chuỗi bị đọc thành VÀ (hẹp hơn chữ).
     Giá trị có " hoặc ", ";" hay liệt kê phẩy (không có mã HS) ⇒ máy báo `cong3-liet-ke-trong-mot-chuoi:<mã>:<khoá>`. Tách thành
     mảng chuỗi con nguyên văn; định ngữ chung thành điều kiện riêng (841459 .10: `congDung` "làm mát" + `dungCho` ["bộ vi xử lý",
     "thiết bị viễn thông", …]); liệt kê lồng thành hai điều kiện mảng (950300 .91: `tenLoai` ["xếp khối","cắt rời"] + `tenLoai`
     ["chữ số","chữ cái","con vật"]). Máy KHÔNG báo: liệt kê nối "và" mà chữ Anh cùng dòng có đúng ngần ấy mục liên hợp sau
     for/of (853710 .30 "dịch chuyển, xử lý và kẹp giữ" ↔ "for transport, handling and storage" — một máy làm đủ các việc); dấu
     phẩy có cả ở chữ Anh mà chữ Anh không liệt kê and/or (761699 .30 "Đồng xèng, hình tròn" ↔ "Slugs, round,"); "có hoặc
     không …"; giá trị có mã HS ("84.29 hoặc 84.30" — máy đã đọc HOẶC). Liệt kê TÊN HÀNG nối "và" ("Xe đạp ba bánh, xe đẩy, xe có
     bàn đạp và …") vẫn là danh sách hàng thay thế ⇒ mảng. **Vòng 7 (soát đợt 4 #711):** máy bắt cả HAI tên hàng nối "và" khi
     chữ Anh cùng vế nối hai danh từ đầu bằng and/or (vế trước số nhiều): 392620 .20 "Miếng đệm và miếng bảo vệ vai" ↔ "Shoulder pads
     or shields" ⇒ tenLoai ["Miếng đệm","miếng bảo vệ"] + tenLoai "vai" (định ngữ chung, điều kiện riêng cùng khoá = VÀ); 845290 .11
     "Thân trên và thân dưới máy" ↔ "Arms and beds" ⇒ ["Thân trên","thân dưới", …]; 851762 .10 "phát và thu" ↔ "Radio transmitters
     and radio receivers" ⇒ ["phát","thu"]. Máy KHÔNG báo danh từ ghép một hàng (.52 "Thiết bị phát và thu" ↔ "Transmission and
     reception apparatus"; 950300 .91 "bộ đồ chơi tạo chữ và tập nói" ↔ "word making and talking sets") — giữ một chuỗi.
   - **Vế mở "X, Y và các loại tương tự" ⇒ op `TUONG_TU`** (quyết định GĐ vòng 7): `{"fact": "tenLoai", "op": "TUONG_TU", "value":
     ["X", "Y"]}` — value là các hàng NÊU TÊN nguyên văn đứng trước cụm "… tương tự" (KHÔNG chứa chữ "tương tự": giá trị đó chết ⇒
     `cong5-gia-tri-tuong-tu`). Giới hạn chung ("dùng cho Z") là điều kiện riêng: 761699 .40 "Ống chỉ, lõi suốt, guồng quay tơ và sản
     phẩm tương tự dùng cho sợi dệt" ⇒ `tenLoai TUONG_TU ["Ống chỉ","lõi suốt","guồng quay tơ"]` + `dungCho "sợi dệt"`. Giới hạn chỉ của
     hàng tương tự (EN "similar wheeled toys") ⇒ HOAC: 950300 .10 ⇒ `HOAC [[tenLoai TEN_LOAI ["Xe đạp ba bánh","xe đẩy","xe có bàn
     đạp"]], [tenLoai TUONG_TU [ba tên đó], coBanh CO], [tenLoai TEN_LOAI "xe của búp bê"]]`. Lúc chạy tên khác ⇒ hỏi, không TRÁI.
   - chất liệu ⇒ `{"fact": "chatLieu", "op": "LA", "value": "<vật liệu>", "viTri": "<nếu chữ nói vị trí>"}`.
3. **Các anh em cùng tầng dùng CÙNG khoá** khi chữ cho phép (vd đều `tenLoai`, hoặc đều `loaiCongTac`) — giảm chồng lấn giả.
   **Không đổi sang khoá khác để né cảnh báo** (vòng 4, lỗi lặp lại ở #620–#647): chữ "dùng cho …" ở tiêu đề và ở dòng con đều là
   `dungCho`; không viết tiêu đề bằng `congDung` hay dòng con bằng `tenLoai` chỉ để né `cong2-diem-mu` /
   `cong2-dong-khong-toi-duoc`. Đổi khoá làm máy mất phép so cùng trục — che lỗi chứ không sửa. Máy đã tự ghép giá trị
   "<dưới> <trên>" cho cùng khoá (#653); hai bên đều nêu MÃ HS rời nhau ("Bộ phận của hàng hóa thuộc phân nhóm 8483.10" ↔ dòng
   con "Dùng cho xe kéo thuộc phân nhóm 8701…") là ĐÍCH LỒNG — máy ghép chuỗi đích "<trên> dùng cho <dưới>" (#693, 848390). Vẫn
   không tới được ⇒ DỪNG. Gợi ý nào của công cụ bảo đổi khoá là lỗi công cụ, báo Claude.
   - Ví dụ SAI (851762, PR #634): tiêu đề `8517624` "Thiết bị dùng cho hệ thống hữu tuyến…" ghi `congDung` "để tránh điểm mù với
     85176243 dùng dungCho"; `85176261` "Dùng cho điện báo hoặc điện thoại…" ghi `tenLoai` "sóng vô tuyến" "để tránh điểm mù với
     tiêu đề cha dùng congDung". ĐÚNG: cả ba ghi `dungCho` (chữ "dùng cho" ⇒ `dungCho`), để cảnh báo hiện ra cho người soát.
4. "Loại khác, <vế>" ⇒ chỉ ghi điều kiện của **vế** (máy tự phủ định anh em).
5. Mỗi ý có ngưỡng riêng ("A, ≤ 11 A; B, ≤ 1.000 V") ⇒ HOẶC: `{"op": "HOAC", "phuongAn": [[…ý A…], […ý B…]]}`. Không gộp ngưỡng
   của một ý cho cả dòng.
6. Phần còn lại CÓ TÊN ("Động cơ khác", "Cáp … plastic khác", "…, loại khác") ⇒ thêm `"phanConLai": true` vào mục (phủ định mọi anh
   em đứng trước). Chỉ phủ định một số anh em ⇒ `"phanConLai": ["<hs>", …]`. Nội dung chỉ là "các loại khác" (không có ý khẳng
   định riêng) ⇒ `{"dieuKienSo": [], "phanConLai": true}`. Chữ có "khác" mà KHÔNG phải phần còn lại ⇒ `"phanConLai": false` + ghi
   chú `QUYET_DINH` nói vì sao.
   **Vòng 8b (#661):** máy phủ định ĐIỀU KIỆN của anh em được nêu; anh em là TẦNG mà các con không phủ kín (không con "Loại khác"
   trần) ⇒ phủ định "tầng VÀ một con": hàng thoả tầng mà không vào con nào rơi về phần còn lại. Vd 840991: tầng r12982 "Dùng cho
   tàu thuyền thuộc Chương 89" chỉ có hai con "Cho động cơ máy thủy …"; 8409917 "Dùng cho động cơ khác" `phanConLai: true` nhận bộ
   phận động cơ PHỤ của tàu. Không cần (và không được) đẩy chữ của con lên tầng hay khai `BO_VE` để né `cong1-khong-phu-kin`.
7. Một ý KHÔNG có khoá ⇒ để `"dieuKienSo": []` cho mục đó và thêm ghi chú
   `{"ma": "<mã>", "loai": "THIEU_KHOA_TU_VUNG", "khoaDeXuat": "<tên khoá>", "ghiChu": "<chữ nguyên văn cần khoá>"}`
   (khoá đề xuất: [`de-xuat-tu-vung-2.md`](de-xuat-tu-vung-2.md)) ⇒ sẽ DỪNG.
8. Ý nói "(bao gồm …)", "kể cả …", cách đo, ví dụ minh hoạ, ngoặc chú thích ("(corset)", "(LPG)") ⇒ KHÔNG thành điều kiện (cổng 5
   coi là PHU, không đòi phủ); ghi `ghiChuSoan` loai `QUYET_DINH` giải thích. **Nhưng** "gồm …" (consisting of) là GIỚI HẠN, kể cả
   khi đứng trong "kể cả …": 8536505 "công tắc điện tử, kể cả công tắc bảo vệ quá nhiệt điện tử **gồm một tranzito và một chip
   logic** …" — chữ Anh "including …, consisting of a transistor and a logic chip": "gồm …" giới hạn công tắc điện tử, phải phủ
   (máy tách thành vế GIỚI HẠN từ vòng 4). "bao gồm", "gồm cả" vẫn là kể cả.
   **Dòng "Loại khác" trần: KHÔNG ghi ghi chú `DE_TRONG`** (vòng 4, lỗi lặp lại ở gần hết PR #620–#647): dòng này không có điều
   kiện nào để "để trống" — ghi `DE_TRONG` chỉ bật cảnh báo `cong5-de-trong-chua-xu-ly` và bắt người soát giải quyết suông. Không ghi
   gì, hoặc nếu muốn ghi lại lý do thì dùng `QUYET_DINH`:
   `{"ma": "85181090", "loai": "QUYET_DINH", "ghiChu": "tax.85181090 \"Loại khác\" trần ⇒ không điều kiện (máy phủ định anh em)"}`. **Không dùng `DE_TRONG` để bỏ một vế GIỚI HẠN hay vế
   MỞ** — đó là đúng chỗ người soát đợt 2 (#659) tìm thấy 4/6 lỗi; cổng 5 cảnh báo mọi ghi chú `DE_TRONG` / "người soát xem" và
   `--duyet` từ chối tới khi người soát ghi kết luận (bước 3.11).
9. Chữ dài > 300 ký tự (thường tiêu đề) ⇒ thêm `"trich": "<đoạn đầu> … <đoạn chứa bằng chứng>"` — mọi đoạn nguyên văn, đúng thứ tự.
   Còn lại KHÔNG ghi `trich`/`nguon` (máy tự chép nguyên văn).
10. Mỗi quyết định một ghi chú `ghiChuSoan` (loai `QUYET_DINH` | `DE_TRONG` | `CHONG_LAN` | `LECH_TIEN_LE` | `THIEU_KHOA_TU_VUNG` | `DUNG` | `BO_VE`).
11. **Cổng 5 — phạm vi VẾ bổ nghĩa** (#659: 8,8% mục sai, gần hết kiểu này). Với mỗi mục có điều kiện:
    - **Vế GIỚI HẠN** ("không nhấp nháy", "có thể thao tác hoặc … tương tác …", "dùng cho/để/cho …", "bằng …", "của …" ngay sau danh
      từ đầu, biên số, "(trừ …)", "…, hoàn chỉnh", phần sau "Loại …") ⇒ phải có điều kiện mà chữ của nó nằm trong vế (giá trị
      `TEN_LOAI`/`CONG_DUNG` là chuỗi con của vế; số của `SO`; chữ đọc của `CO_KHONG`/`LIET_KE`/chất liệu). Bỏ vế giới hạn = điều kiện
      **RỘNG hơn chữ** ⇒ `cong5-ve-gioi-han-bi-bo`. Vế chỉ lặp chữ của tầng cha ("Cho xe …" dưới "Dùng cho xe thuộc nhóm 87.11") không
      cần phủ.
    - **Vế MỞ** ("… và các loại tương tự", "và các thiết bị tương tự", "và bộ phận của chúng", "và các loại … khác") ⇒ KHÔNG liệt kê
      đóng danh sách đứng trước nó thành điều kiện (quy ước 392690) — làm vậy là **HẸP hơn chữ** ⇒ `cong5-ve-mo-bi-bo`. Hai cách đúng:
      phủ chính vế mở ("X và bộ phận của chúng" ⇒ `{"op":"HOAC","phuongAn":[[tenLoai "X"],[laBoPhan CO, dungCho "X"]]}`; "X, Y và các
      loại tương tự" ⇒ `tenLoai TUONG_TU ["X","Y"]` — vòng 7, bước 3.2), hoặc bỏ điều kiện liệt kê rồi miễn vế giới hạn chứa danh sách
      bằng `BO_VE` (dưới). **Không** "phủ" vế mở bằng giá trị chứa chữ "tương tự" ("đồ chơi tương tự có bánh") ⇒ `cong5-gia-tri-tuong-tu`.
    - **Định ngữ chung** đi với MỌI danh từ đầu liên hợp — đối chiếu chữ Anh của cùng dòng: "Connection and contact elements **for wires
      and cables**" ⇒ "Đầu nối và các bộ phận … cho dây dẫn và cáp" là định ngữ CHUNG: tenLoai ["Đầu nối","các bộ phận"] + một điều kiện
      riêng cho "dây dẫn và cáp", không nhét định ngữ vào một giá trị tenLoai. "Fans and handscreens" ⇒ "kéo bằng tay" chỉ của màn che:
      `HOAC [[tenLoai "Quạt"], [tenLoai "màn che", cachDieuKhien BANG_TAY]]`. "Telephone patch panels" ⇒ "cáp điện thoại" chung cho cả
      "Phiến đầu nối" lẫn "khối đấu nối". Sai ⇒ `cong5-dinh-ngu-tach`.
    - **Không nuốt vế bổ nghĩa** (vòng 4, lỗi lặp lại):
      - "X và (các) bộ phận của chúng" là vế MỞ — không viết chỉ `tenLoai` "X". Vd 871410 .60 "Phanh và bộ phận của chúng" ⇒
        `{"op":"HOAC","phuongAn":[[{"fact":"tenLoai","op":"TEN_LOAI","value":"Phanh"}],[{"fact":"laBoPhan","op":"CO"},{"fact":"dungCho","op":"CONG_DUNG","value":"Phanh"}]]}`
        — X chép NGUYÊN VĂN tên đầu của chính dòng (nhiều anh em cùng mẫu: mục 4 "Quy ước X và bộ phận", luật tên nguyên văn).
      - Chất liệu / loại của **hàng ĐÍCH** sau "dùng cho" thuộc về đích, không phải của hàng: "Phụ kiện dùng cho ống bằng gang đúc" ⇒
        `dungCho` "ống bằng gang đúc" (chuỗi con nguyên văn chứa cả chất liệu) — SAI: `dungCho` "ống" (bỏ vế "bằng gang đúc" ⇒ rộng
        hơn chữ) hoặc `chatLieu` "gang" (gán chất liệu của ống cho phụ kiện ⇒ sai trục).
    - **Giá trị LIET_KE định nghĩa đúng bằng các vế của tiêu đề** (quyết định GĐ vòng 4 — công cụ không đổi): vd tiêu đề 8536503 "Loại
      ngắt mạch khi có sốc dòng điện cao; loại đảo mạch dùng cho bếp…; công tắc micro; công tắc nguồn cho máy thu truyền hình…; công
      tắc cho quạt điện; công tắc xoay, … cho máy điều hòa không khí" ↔ `loaiCongTac` `NGAT_SOC_DONG` (nhãn của giá trị chính là sáu vế
      đó, xem `--tu-vung --khoa=loaiCongTac`). Máy chỉ neo được chữ đọc của giá trị ("công tắc micro"), các vế khác báo chưa phủ.
      Người soạn khai `BO_VE` cho từng vế còn lại với `lyDo` trích định nghĩa: "giá trị NGAT_SOC_DONG của loaiCongTac được định nghĩa
      (nhanVi tu-vung@2) đúng bằng sáu vế của tiêu đề 8536503, gồm vế này". Người soát L1-4c chấp nhận hoặc trả về. Không viết
      `DE_TRONG` / "người duyệt xem nhãn có khớp không".
    - **Máy tách vế đã sửa (vòng 4)** — không còn cần `BO_VE` cho: "có dải tần số từ 300 Hz đến 3.400 Hz" (một vế biên số, 85181011);
      "có hình dạng đặc biệt hoặc thích hợp để vận chuyển …" (một vế, chỉ khi chữ Anh cùng dòng có cấu trúc "shaped or fitted for" —
      39231020). Chữ "được thiết kế chỉ để" / "designed only for" đọc được bằng `chiHoacChuYeu` (85176243).
    - **Không phủ được** (thiếu khoá, hoặc quy ước đã đúc cho phép bỏ) ⇒ miễn vế TƯỜNG MINH:
      `{"ma": "<mã>", "loai": "BO_VE", "ve": "<nguyên văn vế, chép từ --ve>", "lyDo": "<vì sao bỏ vế mà không sai mã>"}`. `lyDo` rỗng,
      dưới 10 ký tự, "người soát xem", "DE_TRONG" ⇒ `cong5-bo-ve-ly-do` (không tính, vế vẫn đỏ). Thiếu khoá thật ⇒ vẫn ghi
      `THIEU_KHOA_TU_VUNG` (DỪNG) — `BO_VE` không thay cho DỪNG khi bỏ vế làm đổi mã.


# TỪ VỰNG tu-vung@2 (khoá, kiểu, op, giá trị hợp lệ, cách đọc) — cập nhật 03/11 (+9 khoá lô 3: hamLuongCarbon, gioiHanChay, chieuRong, khaNangChiuApLuc, duongCheoNgoai, coRen, doBenKeo, hamLuongNiken, lopMaPhu — #993) (#979, #990: 24 khoá mới)
dienAp (SO) — điện áp; op: <= < >= >; donVi: V, mV, kV (chuẩn V; viết như chữ trích: v, vac, vdc, volt, vôn, 伏, mv, kv)
dongDien (SO) — dòng điện (định mức); op: <= < >= >; donVi: A, mA (chuẩn A; viết như chữ trích: a, amp, ampe, 安, ma)
congSuat (SO) — công suất; op: <= < >= >; donVi: W, mW, kW, HP (chuẩn W; viết như chữ trích: w, watt, 瓦, mw, kw, 千瓦, hp, mã lực, 马力)
tanSo (SO) — tần số / dải tần; op: <= < >= >; donVi: Hz, kHz, MHz, GHz (chuẩn Hz; viết như chữ trích: hz, 赫兹, khz, mhz, ghz)
luuLuong (SO) — lưu lượng; op: <= < >= >; donVi: m3/h, l/h, l/min, m3/min (chuẩn m3/h; viết như chữ trích: m3/h, m³/h, m3/giờ, m³/giờ, l/h, lít/giờ, l/min, l/phút, lít/phút, m3/min)
dungTichXiLanh (SO) — dung tích xi lanh; op: <= < >= >; donVi: cc, cm3 (chuẩn cc; viết như chữ trích: cc, cm3, cm³, phân khối)
khoiLuong (SO) — khối lượng; op: <= < >= >; donVi: kg, g, tấn (chuẩn kg; viết như chữ trích: kg, 公斤, 千克, g, gam, 克, tấn)
duongKinh (SO) — đường kính (ngoài); op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
duongKinhTrong (SO) — đường kính trong (cửa nạp/cửa thoát, DN); op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
duongKinhLoi (SO) — đường kính lõi (mỗi lõi dẫn điện); op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
chieuCao (SO) — chiều cao; op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
kichThuoc (SO) — kích thước (dài x rộng x cao); op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
chieuDaiCuon (SO) — chiều dài (hàng dài: dây, cáp, ống, cuộn); op: <= < >= >; donVi: mm, cm, m, inch (chuẩn m; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
daGanDauNoi (CO_KHONG) — đã gắn đầu nối; op: CO KHONG
    đọc CÓ: (?:đã\s+)?(?:gắn|lắp|bấm|có)\s+(?:sẵn\s+)?(?:đầu\s+nối|đầu\s+cắm|jack|giắc|connector) | đầu\s+nối | đầu\s+cắm | giắc\s+cắm | (?:fitted|equipped|terminated)\s+with\s+connectors? | connector\w* | with\s+plugs? | 接头 | 插头 | 连接器
coCachDien (CO_KHONG) — có cách điện; op: CO KHONG
    đọc CÓ: cách điện | bọc cách điện | vỏ bọc | insulated | insulation | 绝缘 · đọc KHÔNG: dây trần | không bọc | bare | 裸线
coBoXuLyLapTrinh (CO_KHONG) — có trang bị bộ xử lý lập trình; op: CO KHONG
    đọc CÓ: bộ xử lý (?:có thể )?lập trình | (?:có thể )?lập trình được | PLC | vi xử lý | vi điều khiển | MCU | programmable | PLC | microprocessor | microcontroller | MCU | 可编程 | PLC | 单片机 | 微处理器
coKhungChupQuaDau (CO_KHONG) — có khung chụp qua đầu; op: CO KHONG
    đọc CÓ: (?:có\s+)?khung\s+chụp(?:\s+qua\s+đầu)? | chụp\s+tai | trùm\s+đầu | choàng\s+đầu | headband | over-?(?:the-)?ear | on-?ear | over-?head | 头戴 | 耳罩 · đọc KHÔNG: nhét\s+tai | móc\s+tai | đeo\s+trong\s+tai | in-?ear | earbuds? | true wireless | 入耳 | 耳塞 | 挂耳
hieuChinhThiLuc (CO_KHONG) — hiệu chỉnh thị lực (kính thuốc); op: CO KHONG
    đọc CÓ: hiệu chỉnh thị lực | điều chỉnh thị lực | kính cận | kính viễn | kính loạn | kính thuốc | có độ | corrective | prescription | vision\s+correct\w* | myopia | 近视 | 远视 | 矫正视力 | 处方 · đọc KHÔNG: không độ | kính thời trang | plano | non-prescription | 平光
chongNang (CO_KHONG) — chống nắng (kính râm); op: CO KHONG
    đọc CÓ: chống nắng | kính râm | kính mát | chống tia UV | chống UV | sun\s?glass\w* | UV400 | UV\s+protect\w* | 太阳镜 | 墨镜 | 防晒 | 防紫外线
coChucNangGhi (CO_KHONG) — có chức năng ghi (hình/âm); op: CO KHONG
    đọc CÓ: ghi hình | ghi âm | quay phim | lưu\s+(?:vào|trữ)\s+(?:thẻ nhớ|bộ nhớ) | thẻ nhớ | chức năng ghi | record\w* | DVR | memory card | SD card | 录像 | 录制 | 存储卡 | 录音
daGhi (CO_KHONG) — đã ghi (có dữ liệu); op: CO KHONG
    đọc CÓ: đã ghi | ghi sẵn | có sẵn dữ liệu | đã cài | recorded | pre-?loaded | pre-?recorded | 已录 | 已录制 | 已写入 · đọc KHÔNG: chưa ghi | loại trắng | đĩa trắng | thẻ trắng | unrecorded | blank | 未录制 | 空白
coLuoiBaoVe (CO_KHONG) — có lưới bảo vệ; op: CO KHONG
    đọc CÓ: lưới bảo vệ | lồng bảo vệ | lưới chắn | lồng quạt | (?:protective|safety)\s+(?:grille?|guard) | fan guard | grille? | 防护网 | 保护网 | 网罩
coManHinh (CO_KHONG) — có màn hình hiển thị; op: CO KHONG
    đọc CÓ: màn hình | màn\s+LCD | LCD | OLED | display | screen | LCD | OLED | monitor | 显示屏 | 屏幕 | 液晶屏 | 显示器
coCamera (CO_KHONG) — có camera; op: CO KHONG
    đọc CÓ: camera | máy ảnh | ống kính chụp | camera | webcam | 摄像头 | 相机 | 摄像
coBanh (CO_KHONG) — có bánh xe; op: CO KHONG
    đọc CÓ: có bánh | bánh xe | bánh lăn | wheels? | wheeled | castors? | 轮子 | 带轮 | 车轮
hoatDongBangDien (CO_KHONG) — hoạt động bằng điện; op: CO KHONG
    đọc CÓ: hoạt động bằng điện | chạy điện | dùng điện | động cơ điện | bơm điện | electric(?:al(?:ly)?)?(?:\s+(?:powered|operated|driven))? | motor-?driven | 电动 | 电驱动 · đọc KHÔNG: bơm tay | vận hành bằng tay | quay tay | đạp chân | hand-?operated | 手动 | 手摇
coKetHopThietBiThu (CO_KHONG) — kết hợp thiết bị thu; op: CO KHONG
    đọc CÓ: kết hợp (?:với )?thiết bị thu | thu và phát | thu phát | nhận cuộc gọi | nghe gọi | đàm thoại | transceiver | incorporating reception | two-?way | receive and transmit | 收发 | 双向 | 接听 · đọc KHÔNG: chỉ phát | chỉ truyền | transmit(?:ter)?\s+only | 仅发射
coGiaNhiet (CO_KHONG) — có gia nhiệt; op: CO KHONG
    đọc CÓ: gia nhiệt | sưởi | làm nóng | sấy nóng | điện trở nhiệt | heat(?:er|ing) | warm air | hot air | 加热 | 暖风 | 热风
laBoPhan (CO_KHONG) — là bộ phận (không phải hàng hoàn chỉnh); op: CO KHONG
    đọc CÓ: bộ phận | linh kiện | chi tiết | phụ tùng | parts? | component | spare part | 零件 | 配件 | 部件 | 零部件 · đọc KHÔNG: hoàn chỉnh | nguyên chiếc | nguyên bộ | complete | finished unit | 整机 | 成品
datChim (CO_KHONG) — loại đặt chìm; op: CO KHONG
    đọc CÓ: đặt chìm | bơm chìm | chìm dưới nước | nhúng chìm | submersible | submerged | 潜水 | 潜水泵 | 深井泵
coKhoangPhaTron (CO_KHONG) — có khoang pha trộn lưu chất; op: CO KHONG
    đọc CÓ: khoang pha trộn | pha trộn | vòi trộn | van trộn | nóng lạnh | (?:hai|2|02)\s+đường\s+(?:dẫn\s+)?nước\s+vào | mixing | mixer | 混水 | 冷热 · đọc KHÔNG: (?:một|1|01)\s+đường\s+(?:dẫn\s+)?nước\s+vào | chỉ có nước lạnh | single inlet | cold water only | 单冷
loaiDongDien (LIET_KE) — loại dòng điện; op: TRONG
    MOT_CHIEU: một chiều — đọc: một chiều | điện DC | DC | direct current | VDC | 直流
    XOAY_CHIEU: xoay chiều — đọc: xoay chiều | điện AC | AC | alternating current | VAC | 交流
soPha (LIET_KE) — số pha; op: TRONG
    MOT_PHA: một pha — đọc: một pha | 1 pha | single[- ]phase | 1-?phase | 单相
    NHIEU_PHA: nhiều pha — đọc: ba pha | 3 pha | nhiều pha | three[- ]phase | 3-?phase | poly-?phase | 三相 | 多相
kieuDotChay (LIET_KE) — kiểu đốt cháy của động cơ piston; op: TRONG
    TIA_LUA_DIEN: đốt cháy bằng tia lửa điện (xăng) — đọc: tia lửa điện | động cơ xăng | chạy xăng | bugi | spark[- ]ignition | petrol | gasoline | 汽油 | 点燃式 | 火花塞
    CHAY_NEN: đốt cháy bằng sức nén (diesel) — đọc: diesel | đi-ê-den | nén cháy | đốt cháy bằng sức nén | diesel | compression[- ]ignition | 柴油 | 压燃
nguonSang (LIET_KE) — nguồn sáng; op: TRONG
    LED: LED — đọc: LED | đi-ốt phát quang | LED | light[- ]emitting\s+diode | LED | 发光二极管
    HUYNH_QUANG: huỳnh quang — đọc: huỳnh quang | fluorescent | CFL | 荧光
    HALOGEN: halogen — đọc: halogen | halogen | 卤素
    SOI_DOT: sợi đốt — đọc: sợi đốt | dây tóc | incandescent | filament | 白炽
nguonNangLuong (LIET_KE) — nguồn năng lượng; op: TRONG
    PIN_AC_QUY: pin / ắc quy (nguồn năng lượng riêng) — đọc: (?<!\d\s?-?\s?)(?<!chân\s)pin(?!\s*(?:mặt\s+trời|năng\s+lượng|cắm|connector|header|jack)) | ắc qui | ắc quy | ắcquy | battery | batteries | rechargeable | cordless | 电池
    DIEN_LUOI: điện lưới — đọc: điện lưới | cắm điện | dây nguồn | mains | plug-?in | corded | 市电 | 插电
    QUANG_DIEN: quang điện (năng lượng mặt trời) — đọc: năng lượng mặt trời | quang điện | pin mặt trời | solar | photovoltaic | 太阳能 | 光伏
cachDieuKhien (LIET_KE) — cách điều khiển / vận hành; op: TRONG
    BANG_TAY: điều khiển bằng tay — đọc: bằng tay | tay gạt | tay quay | vận hành tay | điều khiển tay | manual(?:ly)?(?:\s+operated)? | hand-?operated | lever | 手动 | 手柄
    DIEN_TU: điện từ (solenoid) — đọc: điện từ | solenoid | cuộn hút | solenoid | electromagnetic | 电磁
    DONG_CO: bằng động cơ (động cơ bước, servo) — đọc: động cơ bước | động cơ điện | mô tơ | servo | motori[sz]ed | stepper | servo | electric actuator | 步进 | 电机驱动
    KHI_NEN: khí nén — đọc: khí nén | pneumatic(?:ally)? | air[- ]operated | 气动
    THUY_LUC: thủy lực — đọc: thủy lực | thuỷ lực | hydraulic | 液压
    NHIET: ổn nhiệt — đọc: ổn nhiệt | điều nhiệt | thermostatic | 恒温 | 温控
kieuBom (LIET_KE) — kiểu bơm; op: TRONG
    PISTON: piston (chuyển động tịnh tiến) — đọc: piston | pít tông | pittông | tịnh tiến | bơm màng | piston | plunger | reciprocating | diaphragm | 活塞 | 柱塞 | 往复 | 隔膜
    LY_TAM: ly tâm — đọc: ly tâm | centrifugal | 离心
    QUAY: quay (bánh răng, cánh gạt, trục vít) — đọc: bơm bánh răng | cánh gạt | trục vít | roto | rotary | gear pump | vane pump | screw pump | 齿轮泵 | 叶片泵 | 螺杆泵 | 回转
    TAY: bơm tay — đọc: bơm tay | bơm bằng tay | hand pump | 手动泵 | 手摇泵
loaiRoLe (LIET_KE) — loại rơ le; op: TRONG
    KY_THUAT_SO: rơ le kỹ thuật số — đọc: kỹ thuật số | digital | 数字
    BAN_DAN: rơ le bán dẫn — đọc: bán dẫn | SSR | solid[- ]state | SSR | 固态
    DIEN_TU: rơ le điện từ — đọc: điện từ | điện cơ | electromagnetic | electromechanical | 电磁
loaiCongTac (LIET_KE) — loại thiết bị đóng ngắt (8536.50); op: TRONG
    TU_DONG_RO_DIEN_QUA_TAI: tự động ngắt khi rò điện và quá tải — đọc: chống rò | rò điện | chống giật | residual current | earth leakage | RCD | RCBO | RCCB | ELCB | 漏电保护 | 漏电
    NGAT_SOC_DONG: ngắt khi sốc dòng cao; đảo mạch bếp; công tắc micro; công tắc nguồn TV/radio, quạt, điều hòa — đọc: công tắc micro | sốc dòng | micro\s?switch | inrush | 微动开关
    MINI_NOI_COM: công tắc mini cho nồi cơm điện / lò nướng — đọc: nồi cơm | lò nướng | rice cooker | toaster oven | 电饭煲 | 烤箱
    DIEN_TU_HOAC_BAT_NHANH: công tắc điện tử (bán dẫn, thyristor) hoặc điện cơ bật nhanh — đọc: công tắc điện tử | bán dẫn | transistor | tranzito | thyristor | bật nhanh | tác động nhanh | electronic switch | solid[- ]state | thyristor | transistor | snap[- ]action | 电子开关 | 晶闸管 | 快动 | 速动
    MANG_DIEN_GIA_DUNG: đóng ngắt trong mạng điện gia dụng (≤ 500 V, ≤ 20 A) — đọc: công tắc\s+(?:âm tường|gắn tường|đèn) | mạng điện gia dụng | điện dân dụng | wall switch | domestic wiring | light switch | 墙壁开关 | 家用开关
    DAO_CHIEU_HOAC_CAU_CHI: đảo chiều khởi động động cơ; đóng cắt có cầu chì — đọc: đảo chiều | có cầu chì | change-?over | fuse switch | 换向开关 | 熔断器式
loaiPhichOCam (LIET_KE) — loại phích cắm / ổ cắm (8536.69); op: TRONG
    PHICH_CAM_DIEN_THOAI: phích cắm điện thoại — đọc: phích cắm điện thoại | jack điện thoại | RJ11 | telephone plug | RJ11 | 电话插头
    TIN_HIEU_HINH_TIENG: đầu cắm tín hiệu hình/tiếng; đầu cắm ống tia ca-tốt — đọc: tín hiệu hình | tín hiệu tiếng | tín hiệu âm thanh | RCA | audio\s*/?\s*video | RCA | AV socket | 音视频 | AV插座
    CAP_DONG_TRUC_MACH_IN: đầu cắm, phích cắm cho cáp đồng trục và mạch in — đọc: mạch in | bo mạch | đồng trục | PCB | printed circuit | PCB | board-to-board | coaxial | 印刷电路 | PCB | 同轴 | 板对板
    THONG_THUONG: ổ cắm, phích cắm điện thông thường — đọc: ổ cắm\s+điện(?!\s*thoại) | phích cắm\s+điện(?!\s*thoại) | ổ cắm(?!\s+(?:điện\s*thoại|tín hiệu|mạch|cáp)) | ổ điện | power socket | power plug | mains socket | outlet | 电源插座 | 电源插头
phamViSuDung (LIET_KE) — phạm vi sử dụng; op: TRONG
    GIA_DINH: gia đình (gia dụng) — đọc: gia đình | gia dụng | dân dụng | household | domestic | home use | 家用 | 家庭
    CONG_NGHIEP: công nghiệp — đọc: công nghiệp | industrial | 工业
    CONG_CONG: nơi công cộng, đường phố — đọc: công cộng | đường phố | chiếu sáng đường | công viên | street | public | road lighting | 路灯 | 公共 | 道路
mauHienThi (LIET_KE) — màu hiển thị; op: TRONG
    MAU: loại màu — đọc: loại màu | màn hình màu | hiển thị màu | màu RGB | colou?r\s+(?:display|monitor|screen) | RGB | 彩色
    DON_SAC: loại đơn sắc — đọc: đơn sắc | trắng đen | đen trắng | monochrome | mono | 单色 | 黑白
kieuDongCoDien (LIET_KE) — kiểu động cơ điện (8501.10); op: TRONG
    BUOC: động cơ bước — đọc: động cơ bước | stepper | stepping motor | 步进
    HUONG_TRUC: động cơ hướng trục (quay đĩa) — đọc: hướng trục | động cơ trục chính | spindle motor | spindle | 主轴电机
tinhTrang (LIET_KE) — tình trạng hàng; op: TRONG
    MOI: mới 100% — đọc: mới\s*100\s*% | hàng mới | mới nguyên | brand[- ]new | new | 全新
    DA_QUA_SU_DUNG: đã qua sử dụng — đọc: đã qua sử dụng | hàng cũ | used | second[- ]hand | refurbished | 二手 | 翻新
chatLieu (CHAT_LIEU_THEO_VI_TRI) — chất liệu (theo vị trí); op: LA
    plastic: plastic (nhựa) — đọc: nylon | polyme | polyamit | polyacetal | polypropylen | polyetylen | PP | PE | PET | HDPE | LDPE | POM | TPU | polymer | polyamide | polypropylene | polyethylene | nylon
    cao su: cao su — đọc: 
    giấy: giấy — đọc: 
    gỗ: gỗ — đọc: 
    kim loại: kim loại (chung) — đọc: kim loại cơ bản | base metal | 贱金属
    sắt thép: sắt hoặc thép — đọc: sắt thép | thép(?!\s*không\s*(?:gỉ|rỉ)) | sắt | steel | iron | 钢 | 铁
    thép không gỉ: thép không gỉ — đọc: thép không gỉ | thép không rỉ | inox | stainless(?:\s+steel)? | SUS\s?\d{3} | 不锈钢
    gang: gang — đọc: gang | gang đúc | cast iron | 铸铁
    đồng: đồng hoặc hợp kim đồng — đọc: hợp kim đồng | đồng thau | (?<!(?:hợp|cộng|tương|hội|giá|bất|\d)\s?)đồng(?!\s+(?:hồ|bộ|thời|nhất|ý|nghĩa|đều|loạt|phục|hành|dạng|tiền|nát|xu|ruộng|bằng|cỡ|nghiệp|hương|minh|chí|tâm)) | copper | brass | bronze | 铜 | 黄铜 | 紫铜
    nhôm: nhôm — đọc: nhôm | alumin(?:i)?um | 铝
    kẽm: kẽm — đọc: kẽm | zinc | 锌
    niken: niken — đọc: niken | nickel | 镍
    thủy tinh: thủy tinh — đọc: 
    gốm sứ: gốm sứ — đọc: 
    vải dệt: vải dệt — đọc: 
    viTri: CHINH, CACH_DIEN (cách điện | vỏ bọc | lớp bọc | bọc | insulat\w* | sheath\w* | jacket | 绝缘 | 护套), LOI (lõi | ruột dẫn | ruột | dây dẫn | conductor | core | 导体 | 线芯 | 芯), THAN (thân | body | 阀体 | 机身 | 主体), VO (vỏ(?!\s*bọc) | vỏ ngoài | housing | casing | shell | 外壳 | 壳体), GIA_CO (gia cố(?:\s+bằng)? | cốt(?=\s) | reinforced(?:\s+with)? | 增强)
dungCho (CONG_DUNG) — dùng cho (máy, xe, hàng hóa mà hàng lắp vào / đi cùng); op: CONG_DUNG
    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định
congDung (CONG_DUNG) — công dụng / mục đích; op: CONG_DUNG
    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định
tenLoai (TEN_LOAI) — tên loại hàng; op: TEN_LOAI TUONG_TU
    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định
nhanHieu (TEN_LOAI) — nhãn hiệu; op: TEN_LOAI TUONG_TU
    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định
model (TEN_LOAI) — model; op: TEN_LOAI TUONG_TU
    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định
kyMaHieu (TEN_LOAI) — ký, mã hiệu; op: TEN_LOAI TUONG_TU
    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định
nhaSanXuat (TEN_LOAI) — nhà sản xuất; op: TEN_LOAI TUONG_TU
    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định
chiHoacChuYeu (CO_KHONG) — chỉ hoặc chủ yếu dùng cho (mức ràng buộc công dụng); op: CO KHONG
    đọc CÓ: (?<!không\s)chỉ\s+(?:dùng|sử\s+dụng)(?:\s+hoặc\s+chủ\s+yếu\s+(?:dùng|sử\s+dụng))? | chỉ\s+hoặc\s+chủ\s+yếu | chủ\s+yếu\s+(?:dùng|sử\s+dụng) | chuyên\s+(?:dùng|dụng) | (?:được\s+)?thiết\s+kế\s+(?:chủ\s+yếu|chuyên|riêng)\s+(?:cho|để) | dùng\s+riêng\s+cho | (?:được\s+)?thiết\s+kế\s+chỉ\s+để | solely\s+or\s+principally | (?:solely|exclusively|principally|mainly|primarily)\s+(?:used|designed) | dedicated | designed\s+(?:primarily|mainly|principally|exclusively|specifically)\s+for | designed\s+only\s+for | specially\s+designed | 专用 | 专门用于 | 主要用于 | 仅用于 | 只用于 | 专为 · đọc KHÔNG: đa\s+dụng | đa\s+mục\s+đích | dùng\s+chung\s+cho\s+nhiều | general[- ]purpose | multi-?purpose | 通用 | 多用途
thietKeChoTreEm (CO_KHONG) — được thiết kế chủ yếu cho trẻ em; op: CO KHONG
    đọc CÓ: (?:được\s+)?thiết\s+kế\s+(?:chủ\s+yếu\s+|chuyên\s+|riêng\s+)?cho\s+(?:trẻ\s+em|trẻ|bé)(?!(?:\s+em)?\s+dưới\s+\d) | (?:dành|phù\s+hợp)\s+cho\s+(?:trẻ\s+em|trẻ|bé)(?!(?:\s+em)?\s+dưới\s+\d) | đồ\s+chơi\s+trẻ\s+em | designed\s+(?:principally\s+|primarily\s+|mainly\s+|specifically\s+)?for\s+(?:children|kids)(?!\s+under\s+\d) | for\s+(?:children|kids)\s+aged | children'?s\s+toy | 儿童玩具 | 儿童学习机 | 专为儿童 | 适合儿童 | 儿童用 | 供儿童 | 儿童益智 · đọc KHÔNG: dành\s+cho\s+người\s+lớn | cho\s+người\s+lớn | for\s+adults | 成人用 | 成人
daNapChuongTrinh (CO_KHONG) — đã nạp chương trình/firmware (bo mạch, vi điều khiển); op: CO KHONG
    đọc CÓ: đã\s+(?:được\s+)?(?:nạp|ghi|cài)(?:\s+sẵn)?\s+(?:chương\s+trình|phần\s+mềm|firmware|code|dữ\s+liệu\s+điều\s+khiển) | nạp\s+sẵn\s+(?:chương\s+trình|phần\s+mềm|firmware) | (?<!máy\s)(?<!bộ\s)(?<!mạch\s)nạp\s+(?:chương\s+trình|phần\s+mềm|firmware) | có\s+(?:sẵn\s+)?(?:firmware|chương\s+trình\s+điều\s+khiển) | pre-?programmed | programmed | firmware\s+(?:installed|loaded|flashed) | flashed | loaded\s+with\s+(?:firmware|software) | 已烧录 | 已烧写 | 已编程 | 已写入程序 | 已刷固件 | 含固件 · đọc KHÔNG: chưa\s+(?:được\s+|trải\s+qua\s+quá\s+trình\s+)?(?:nạp|ghi|cài)(?:\s+sẵn)?\s+(?:chương\s+trình|phần\s+mềm|firmware|code|dữ\s+liệu\s+điều\s+khiển)(?:\s+điều\s+khiển)? | unprogrammed | not\s+programmed | without\s+firmware | blank\s+(?:MCU|chip) | 未烧录 | 未编程 | 未写入程序 | 空片
soLoi (SO) — số lõi dẫn (ruột dẫn); op: <= < >= >; donVi: lõi (chuẩn lõi; viết như chữ trích: lõi, ruột, core, cores, conductor, conductors, 芯)
soSoi (SO) — số sợi (sợi dẫn, sợi bện, sợi quang — theo chữ "sợi"); op: <= < >= >; donVi: sợi (chuẩn sợi; viết như chữ trích: sợi, strand, strands, fibre, fibres, fiber, fibers, 股)
tiLe (SO) — tỉ lệ giữa hai đại lượng (tử/mẫu theo chữ biểu, vd chiều dày / đường kính); op: <= < >= >; donVi: lần, % (chuẩn lần; viết như chữ trích: lần, 倍, %, phần trăm, pct, percent)
phuongPhapCheTao (LIET_KE) — phương pháp chế tạo; op: TRONG
    DUC: đúc — đọc: (?<!gang\s)(?<!thép\s)đúc(?!\s+phun) | được\s+đúc | (?<!die-)cast(?!\s+iron)(?:ing)? | die-?cast(?:ing)? | 铸造 | 压铸 | 铸件 | 精铸
    REN: rèn — đọc: rèn(?:\s+dập)? | được\s+rèn | forged | forging | drop-?forged | 锻造 | 锻件 | 模锻
    CAN_NONG: cán nóng — đọc: cán\s+nóng | hot[- ]rolled | 热轧
    CAN_NGUOI: cán nguội — đọc: cán\s+nguội | cold[- ]rolled | 冷轧
    KEO: kéo (kéo nguội, kéo sợi) — đọc: kéo\s+nguội | kéo\s+nóng | được\s+kéo(?!\s+giãn) | cold[- ]drawn | drawn | 冷拔 | 拉拔
    DAP: dập — đọc: (?:đột\s+)?dập(?:\s+nguội)? | được\s+dập | stamped | stamping | 冲压 | 冲压件
    HAN: hàn — đọc: được\s+hàn | hàn\s+nối | có\s+mối\s+hàn | welded | 焊接 | 焊管
    EP_PHUN: ép phun — đọc: ép\s+phun | đúc\s+phun | injection[- ]mou?lded | injection\s+mou?lding | 注塑
    THOI: thổi khuôn — đọc: thổi\s+khuôn | được\s+thổi | ép\s+thổi | blow[- ]mou?ld(?:ed|ing) | 吹塑
    DOT_DAP_KEO_GIAN: đột dập và kéo giãn (lưới kéo giãn) — đọc: đột\s+dập\s+và\s+kéo\s+giãn | kéo\s+giãn\s+thành\s+lưới | lưới\s+kéo\s+giãn | expanded\s+metal | slit\s+and\s+(?:stretched|expanded) | 拉伸网 | 钢板网 | 冲剪拉伸
phuongThucTruyenDan (LIET_KE) — phương thức truyền dẫn; op: TRONG
    VO_TUYEN: vô tuyến — đọc: sóng vô tuyến | vô tuyến | không dây | radio | radio | wireless | 无线
    HUU_TUYEN: hữu tuyến — đọc: hữu tuyến | có dây(?!\s+(?:đeo|da|kéo|buộc|treo|rút|xích|thép|đai|curoa|cu-roa)) | wired | wireline | line\s+systems? | (?:carrier-current|digital)\s+line | 有线
daXuLyBeMat (CO_KHONG) — đã được xử lý bề mặt; op: CO KHONG
    đọc CÓ: (?:đã\s+(?:được\s+)?)?xử\s+lý\s+bề\s+mặt | surface[- ]treated | surface\s+treatment | 表面处理 | 表面经过处理 | 表面已处理 · đọc KHÔNG: untreated\s+surface | without\s+surface\s+treatment | 表面未处理
nhienLieu (LIET_KE) — nhiên liệu / nguồn nhiệt (bếp, lò); op: TRONG
    GA: ga (khí đốt) — đọc: bằng\s+ga | dùng\s+ga | chạy\s+ga | đốt\s+ga | bếp\s+ga | lò\s+(?:nướng\s+)?ga | khí\s+đốt | gas[- ](?:fired|burning|powered) | gas\s+(?:stoves?|cookers?|ranges?|ovens?|hobs?|burners?|grills?) | 燃气 | 煤气
    DIEN: điện — đọc: bếp\s+(?:điện|từ|hồng\s+ngoại) | lò\s+(?:nướng\s+)?điện | (?:đun|nấu|nướng)\s+bằng\s+điện | electric\s+(?:stoves?|cookers?|ranges?|ovens?|hobs?|grills?) | induction\s+(?:cookers?|hobs?) | 电炉 | 电磁炉 | 电烤箱 | 电陶炉
phuongPhapIn (LIET_KE) — phương pháp in (vải, hàng dệt); op: TRONG
    BATIK: in batik truyền thống — đọc: in\s+(?:bằng\s+phương\s+pháp\s+)?batik(?:\s+truyền\s+thống)? | batik | vải\s+batik | nhuộm\s+sáp | batik(?:[- ]printed|[- ]dyed)? | wax[- ]resist(?:\s+(?:printed|dyed|printing|dyeing))? | 蜡染 | 蜡防印花 | 巴迪克
    IN_LUOI: in lưới (in lụa) — đọc: in\s+lưới | in\s+lụa | in\s+kéo\s+lụa | (?:silk[- ])?screen[- ]print(?:ed|ing)? | serigraph(?:y|ed) | 丝网印 | 丝印 | 网印
    IN_KY_THUAT_SO: in kỹ thuật số — đọc: in\s+kỹ\s+thuật\s+số | in\s+phun\s+kỹ\s+thuật\s+số | in\s+digital | digital(?:ly)?[- ]print(?:ed|ing)? | inkjet[- ]print(?:ed|ing)? | 数码印花 | 数码印 | 数码直喷
    IN_CHUYEN_NHIET: in chuyển nhiệt — đọc: in\s+chuyển\s+nhiệt | in\s+ép\s+nhiệt | in\s+thăng\s+hoa | (?:heat|thermal)[- ]transfer[- ]print(?:ed|ing)? | sublimation[- ]print(?:ed|ing)? | dye[- ]sublimation | 热转印 | 热升华 | 升华印花
tinhDanHoi (CO_KHONG) — đàn hồi (chứa sợi đàn hồi hoặc sợi cao su); op: CO KHONG
    đọc CÓ: (?:tính\s+)?đàn\s+hồi | sợi\s+đàn\s+hồi | sợi\s+cao\s+su | chỉ\s+cao\s+su | spandex | elastane | lycra | elastic(?:ity)? | elastomeric\s+(?:yarns?|fib(?:re|er)s?|threads?) | rubber\s+threads? | spandex | elastane | lycra | stretch(?:y|able)?\s+(?:fabric|knit|yarn|material) | 弹性 | 弹力 | 橡胶线 | 橡筋 | 氨纶 | 莱卡 · đọc KHÔNG: non-?elastic | inelastic | non-?stretch | 无弹性 | 无弹力 | 不含弹性
loaiSoiDet (LIET_KE) — loại xơ/sợi dệt (vật liệu dệt chủ yếu); op: TRONG
    BONG: từ bông — đọc: (?:từ|bằng|chất\s+liệu)\s+bông(?!\s*(?:thủy\s+tinh|thuỷ\s+tinh|khoáng|gòn|tai|hoa)) | (?:sợi|xơ|vải)\s+bông(?!\s*(?:thủy|thuỷ|khoáng|gòn)) | bông\s*100\s*% | 100\s*%\s*bông | cotton | cotton | (?<![石木])棉(?!花糖) | 纯棉 | 全棉
    SOI_THUC_VAT_KHAC: từ sợi dệt thực vật khác (đay, lanh, gai, xơ dừa… nhóm 53.05) — đọc: (?:sợi|xơ)\s+(?:dệt\s+)?thực\s+vật | (?:từ|bằng|sợi|vải|xơ)\s+(?:đay|lanh|gai|lanh\s+gai|xơ\s+dừa|sisal|chuối\s+sợi|dứa\s+sợi) | vải\s+lanh | vải\s+đay | vegetable\s+(?:textile\s+)?fib(?:re|er)s? | jute | flax | linen | ramie | sisal | coir | hemp | abaca | 植物纤维 | 植物纺织纤维 | 黄麻 | 亚麻 | 苎麻 | 剑麻 | 椰壳纤维 | 大麻纤维 | 蕉麻
    LEN_LONG_DONG_VAT_MIN: từ lông cừu hoặc lông động vật loại mịn (len) — đọc: (?:từ|bằng|sợi|vải|xơ|chất\s+liệu)\s+len | len\s*100\s*% | 100\s*%\s*len | lông\s+cừu | lông\s+động\s+vật\s+(?:loại\s+)?mịn | cashmere | mohair | alpaca | len\s+lông\s+(?:cừu|dê|thỏ) | wool(?:len|en)? | fine\s+animal\s+hair | cashmere | mohair | alpaca | merino | angora | 羊毛 | 动物细毛 | 羊绒 | 马海毛 | 羊驼毛 | 美利奴 | 安哥拉
    TO_TAM: từ tơ tằm — đọc: tơ\s+tằm | (?:từ|bằng|sợi|vải|chất\s+liệu)\s+lụa(?!\s+in) | lụa\s*100\s*% | 100\s*%\s*lụa | silk(?![- ]?screen) | 蚕丝 | 真丝 | 桑蚕丝 | (?<!人造)丝绸
    SOI_TONG_HOP: từ sợi/xơ tổng hợp (polyeste, nylon, acrylic, polypropylen…) — đọc: (?:sợi|xơ|vải|chất\s+liệu)\s+tổng\s+hợp | polyeste(?:r)? | poly\s*este(?:r)? | nylon | ni-?lông | polyamit | polyamide | acrylic | polypropylen(?:e)? | elastan(?:e)?\s+tổng\s+hợp | synthetic\s+(?:fib(?:re|er)s?|yarns?|filaments?|textile) | polyester | nylon | polyamide | acrylic | polypropylene | polyethylene\s+(?:fib(?:re|er)s?|yarns?) | 合成纤维 | 合纤 | 涤纶 | 聚酯纤维 | 锦纶 | 尼龙 | 腈纶 | 丙纶 | 聚丙烯纤维
    SOI_TAI_TAO: từ sợi/xơ tái tạo (visco, rayon, modal, lyocell…) — đọc: (?:sợi|xơ|vải|chất\s+liệu)\s+tái\s+tạo | visco(?:se)? | vít-?cô | rayon | modal | lyocell | tencel | xơ\s+axetat | sợi\s+axetat | artificial\s+(?:fib(?:re|er)s?|yarns?|filaments?|textile) | viscose | rayon | modal | lyocell | tencel | cupro | acetate\s+(?:fib(?:re|er)s?|yarns?) | 人造纤维 | 粘胶 | 黏胶 | 人造丝 | 莫代尔 | 莱赛尔 | 天丝 | 铜氨纤维 | 醋酸纤维
doDay (SO) — độ dày; op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
congSuatBieuKien (SO) — công suất biểu kiến; op: <= < >= >; donVi: kVA, MVA (chuẩn kVA; viết như chữ trích: kva, mva)
dangNguyenSinh (LIET_KE) — dạng vật lý nguyên sinh của polyme; op: TRONG
    LONG_HOAC_NHAO: dạng lỏng hoặc dạng nhão — đọc: dạng\s+lỏng\s+hoặc\s+(?:dạng\s+)?nhão | dạng\s+lỏng | dạng\s+nhão | liquid\s+or\s+paste\s+form | liquids?\s+and\s+pastes? | liquid | paste | 液态或膏状 | 液态 | 膏状 | 液体 | 膏体
    PHAN_TAN: dạng phân tán — đọc: dạng\s+phân\s+tán | phân\s+tán | dispersions? | dispersed\s+form | 分散体 | 分散状
    HAT_VIEN_VAY_MANH: dạng hạt, viên, hạt cườm, vẩy, mảnh và các dạng tương tự — đọc: dạng\s+hạt | viên | hạt\s+cườm | vẩy | mảnh | dạng\s+bột | dạng\s+khối\s+không\s+đều | granules? | flakes? | pellets? | powders? | blocks\s+of\s+irregular\s+shape | 颗粒 | 粉末 | 片状 | 碎块 | 不规则块状
daLapRap (CO_KHONG) — đã lắp ráp; op: CO KHONG
    đọc CÓ: (?:đã\s+)?(?:được\s+)?lắp\s+ráp | hoàn\s+chỉnh | nguyên\s+chiếc | assembled | in\s+assembled\s+condition | complete\s+assembly | 已组装 | 组装好的 | 整装 · đọc KHÔNG: chưa\s+(?:được\s+)?lắp\s+ráp | chưa\s+lắp\s+ráp | dạng\s+rời | tháo\s+rời | CKD | SKD | unassembled | not\s+assembled | disassembled | knocked-?down | CKD | SKD | 未组装 | 未经组装 | 散件 | 拆散
dungTich (SO) — dung tích chứa; op: <= < >= >; donVi: cm3, ml, lít, m3, cc (chuẩn lít; viết như chữ trích: cc, cm3, cm³, phân khối, lít, lit, liter, litre, 升, ml, mililít, 毫升, m3, m³, 立方米)
sanLuongHoi (SO) — sản lượng hơi / công suất hơi; op: <= < >= >; donVi: tấn/giờ, kg/giờ (chuẩn tấn/giờ; viết như chữ trích: tấn/giờ, tấn/h, t/h, 吨/小时, kg/giờ, kg/h)
theTich (SO) — thể tích ngoài / thể tích bên ngoài; op: <= < >= >; donVi: cm3, ml, lít, m3, cc (chuẩn cm3; viết như chữ trích: cc, cm3, cm³, phân khối, lít, lit, liter, litre, 升, ml, mililít, 毫升, m3, m³, 立方米)
heDienHoa (LIET_KE) — hệ điện hóa của pin; op: TRONG
    KEM_CACBON: kẽm-cacbon — đọc: (?:bằng\s+)?kẽm[- ]cacbon | kẽm[- ]than | zinc[- ]carbon | zinc[- ]carbon | zinc\s+carbon | 锌碳 | 锌-碳 | 碳性
    KIEM: kiềm — đọc: (?:bằng\s+)?kiềm | alkaline | alkaline | zinc[- ]manganese\s+dioxide\s*\(alkaline\) | 碱性 | 碱性锌锰
dungLuong (SO) — dung lượng phóng điện; op: <= < >= >; donVi: Ah, mAh (chuẩn Ah; viết như chữ trích: ah, mah, 安时, 毫安时)
daHoaDeo (CO_KHONG) — đã hóa dẻo; op: CO KHONG
    đọc CÓ: (?:đã\s+)?hóa\s+dẻo | dẻo\s+hóa | plasticised | plasticized | plasticis(?:ed|ing) | plasticiz(?:ed|ing) | 已塑化 | 增塑 | 塑化 · đọc KHÔNG: chưa\s+(?:được\s+)?hóa\s+dẻo | chưa\s+hóa\s+dẻo | không\s+hóa\s+dẻo | non-?plasticis(?:ed)? | unplasticis(?:ed)? | non-?plasticiz(?:ed)? | unplasticiz(?:ed)? | not\s+plasticis(?:ed)? | 未塑化 | 未增塑 | 未经塑化
coBoLoc (CO_KHONG) — đã lắp bộ phận lọc; op: CO KHONG
    đọc CÓ: (?:đã\s+)?(?:lắp|gắn|trang\s+bị)\s+bộ\s+phận\s+lọc | (?:đã\s+)?(?:lắp|gắn)\s+(?:màng|lưới|bộ)\s+lọc | có\s+bộ\s+lọc | fitted\s+with\s+(?:a\s+)?filter | incorporating\s+(?:a\s+)?filter | with\s+(?:a\s+)?filter | 装有过滤器 | 带过滤器 | 配有滤清器 | 附带滤网 · đọc KHÔNG: chưa\s+(?:lắp|gắn|trang\s+bị)\s+bộ\s+phận\s+lọc | chưa\s+lắp\s+bộ\s+lọc | không\s+(?:có\s+)?bộ\s+lọc | not\s+fitted\s+with\s+(?:a\s+)?filter | without\s+(?:a\s+)?filter | 未装过滤器 | 不带过滤器 | 无滤网
hamLuongCarbon (SO) — hàm lượng carbon; op: <= < >= >; donVi: % (chuẩn %; viết như chữ trích: %, phần trăm, pct, percent)
gioiHanChay (SO) — giới hạn chảy; op: <= < >= >; donVi: psi, MPa (chuẩn psi; viết như chữ trích: psi, mpa)
chieuRong (SO) — chiều rộng; op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
khaNangChiuApLuc (SO) — khả năng chịu áp lực; op: <= < >= >; donVi: psi, MPa (chuẩn psi; viết như chữ trích: psi, mpa)
duongCheoNgoai (SO) — đường chéo ngoài mặt cắt ngang; op: <= < >= >; donVi: mm, cm, m, inch (chuẩn mm; viết như chữ trích: mm, milimét, 毫米, cm, centimét, 厘米, m, mét, 米, inch)
coRen (CO_KHONG) — có ren (ở đầu hoặc thân ống); op: CO KHONG
    đọc CÓ: có\s+ren | tiện\s+ren | xoáy\s+ren | ren\s+trong | ren\s+ngoài | được\s+tiện\s+ren | bước\s+ren | thread(?:ed)? | threading | screwed | with\s+threads? | 带螺纹 | 有螺纹 | 螺纹 | 车螺纹 · đọc KHÔNG: không\s+(?:có\s+)?ren(?:\s+ở\s+đầu\s+ống)? | đầu\s+trơn | chưa\s+tiện\s+ren | unthreaded | without\s+threads? | plain\s+end(?:ed)? | non-?threaded | 无螺纹 | 不带螺纹 | 未攻丝 | 平端
doBenKeo (SO) — độ bền kéo; op: <= < >= >; donVi: psi, MPa (chuẩn MPa; viết như chữ trích: psi, mpa)
hamLuongNiken (SO) — hàm lượng niken; op: <= < >= >; donVi: % (chuẩn %; viết như chữ trích: %, phần trăm, pct, percent)
lopMaPhu (LIET_KE) — lớp mạ hoặc tráng phủ bề mặt; op: TRONG
    MA_DONG: mạ đồng — đọc: mạ\s+đồng | tráng\s+đồng | phủ\s+đồng | copper\s+plated? | copper\s+coat(?:ed|ing)? | 镀铜 | 包铜 | 涂铜
    TRANG_NHUA_FLO: tráng nhựa flo — đọc: tráng\s+nhựa\s+flo | phủ\s+nhựa\s+flo | nhựa\s+flo | fluororesin | teflon | ptfe | fluororesin\s+coat(?:ed|ing)? | fluoropolymer\s+coat(?:ed|ing)? | teflon\s+coat(?:ed|ing)? | ptfe\s+coat(?:ed|ing)? | 涂氟树脂 | 氟树脂涂层 | 聚四氟乙烯涂层 | 特氟龙涂层
    TRANG_KEM_CROMAT: tráng kẽm-cromat — đọc: tráng\s+kẽm\s*[-–]?\s*cromat | mạ\s+kẽm\s*[-–]?\s*cromat | kẽm\s*[-–]?\s*cromat | zinc\s*[-–]?\s*chromate(?:\s+coat(?:ed|ing)?)? | zinc\s+chromate | 锌铬酸盐 | 镀锌铬酸盐 | 涂锌铬酸盐 | 锌-铬酸盐

# BÀI HỌC TỪ CỔNG MÁY (lượt 1–5, 02/11) — ÁP DỤNG NGAY TỪ LƯỢT ĐẦU
1. Khoá CO_KHONG / LIET_KE / chatLieu CHỈ dùng khi chữ trích CHỨA đúng một "cách đọc" ghi ở mục TỪ VỰNG (vd `hoatDongBangDien` đọc CÓ: "hoạt động bằng điện | chạy điện | dùng điện | động cơ điện…"). "Cân điện tử" KHÔNG chứa cách đọc nào ⇒ KHÔNG dùng hoatDongBangDien; dùng `tenLoai TEN_LOAI "Cân điện tử"`. Lỗi máy: `cong3-muc:…:dieu-kien-so-co-khong-co-trong-trich`.
2. `chatLieu` chỉ nhận đúng các giá trị liệt kê (plastic, cao su, giấy, gỗ, kim loại, sắt thép, thép không gỉ, gang, đồng, nhôm, kẽm, niken, thủy tinh, gốm sứ, vải dệt). "bông", "xơ tổng hợp", "sợi thực vật", "len" KHÔNG có ⇒ THIEU_KHOA_TU_VUNG (khoaDeXuat `loaiSoiDet`). "Đàn hồi/sợi cao su" ⇒ `tinhDanHoi`; "in batik" ⇒ `phuongPhapIn`; "độ dày … mm" ⇒ `doDay`. Không mượn chatLieu "cao su"/"vải dệt" cho các vế này (sai trục CHỨA ≠ BẰNG).
3. Anh em cùng tầng chia theo TÊN cạnh anh em chia theo CÔNG DỤNG (tenLoai ↔ dungCho/congDung) ⇒ máy báo `cong2-chong-lan-truc`. Khai NGAY `chongLanTruc` theo mẫu (nhanh, truc, cauHoiPhanBiet, trich nguyên văn từng nhánh, viDuHang MỖI cặp là hàng THẬT thoả cả hai, phanXu: null). Không nghĩ ra hàng thật ⇒ để dieuKienSo [] cho nhánh gây chồng + ghi chú DUNG.
4. Anh em cùng tầng cùng loại ý ⇒ CÙNG khoá (đều tenLoai, hoặc đều dungCho). Dòng "… khác"/"Loại khác, <vế>" có tên ⇒ `phanConLai: true` (hoặc mảng anh em bị phủ định). Thiếu ⇒ `cong2-dong-khong-toi-duoc` / `cong1-khong-phu-kin`.
5. Liệt kê "A, B hoặc C" ⇒ MẢNG ["A","B","C"], không gói một chuỗi (`cong3-liet-ke-trong-mot-chuoi`). "X, Y và các loại tương tự" ⇒ `tenLoai TUONG_TU ["X","Y"]`. "X và bộ phận của chúng" ⇒ HOAC [[tenLoai X],[laBoPhan CO, dungCho X]].
6. Mọi vế GIỚI HẠN in trong gói ("vế phải phủ (cổng 5)") phải có điều kiện đọc tới; không phủ được ⇒ BO_VE với lyDo ≥ 10 ký tự nói vì sao bỏ mà không đổi mã, KHÔNG dùng DE_TRONG. Vế "(trừ …)"/"thuộc nhóm xx.xx"/"thuộc phân nhóm …" thường phủ bằng dungCho/tenLoai chuỗi con chứa cả mã.
7. Dòng/tiêu đề "Loại khác" TRẦN: không đưa vào spec, không ghi chú gì.

# VÍ DỤ SPEC ĐÃ QUA CỔNG (bắt chước cấu trúc, KHÔNG chép giá trị)
```json
{
 "phienBan": "ranh-gioi-spec@1",
 "pn6": "853650",
 "phien": "https://claude.ai/code/session_01EtSm51cdfav5ye3fb1Nq1q#soan-853650",
 "dong8": {
  "85365020": {
   "dieuKienSo": [
    {
     "fact": "loaiCongTac",
     "op": "TRONG",
     "value": [
      "TU_DONG_RO_DIEN_QUA_TAI"
     ]
    }
   ]
  },
  "85365032": {
   "dieuKienSo": [
    {
     "fact": "dungCho",
     "op": "CONG_DUNG",
     "value": [
      "quạt điện",
      "thiết bị sóng vô tuyến"
     ]
    }
   ]
  },
  "85365033": {
   "dieuKienSo": [
    {
     "fact": "dongDien",
     "op": "<",
     "value": 16,
     "donVi": "A"
    }
   ]
  },
  "85365040": {
   "dieuKienSo": [
    {
     "fact": "loaiCongTac",
     "op": "TRONG",
     "value": [
      "MINI_NOI_COM"
     ]
    }
   ]
  },
  "85365051": {
   "dieuKienSo": [
    {
     "fact": "dongDien",
     "op": "<",
     "value": 16,
     "donVi": "A"
    }
   ]
  },
  "85365061": {
   "dieuKienSo": [
    {
     "fact": "dongDien",
     "op": "<",
     "value": 16,
     "donVi": "A"
    }
   ]
  },
  "85365095": {
   "dieuKienSo": [
    {
     "fact": "loaiCongTac",
     "op": "TRONG",
     "value": [
      "DAO_CHIEU_HOAC_CAU_CHI"
     ]
    }
   ]
  },
  "85365096": {
   "dieuKienSo": [
    {
     "fact": "dongDien",
     "op": "<",
     "value": 16,
     "donVi": "A"
    }
   ]
  }
 },
 "dieuKienNut": {
  "8536503": {
   "dieuKienSo": [
    {
     "fact": "loaiCongTac",
     "op": "TRONG",
     "value": [
      "NGAT_SOC_DONG"
     ]
    }
   ],
   "trich": "8536503 Loại ngắt mạch khi có sốc dòng điện cao (SEN); loại đảo mạch dùng cho bếp và bếp có lò nướng(SEN); công tắc micro; công tắc nguồn cho máy thu truyền hình hoặc thu sóng vô tuyến; công tắc cho quạt điện; …"
  },
  "8536505": {
   "dieuKienSo": [
    {
     "op": "HOAC",
     "phuongAn": [
      [
       {
        "fact": "loaiCongTac",
        "op": "TRONG",
        "value": [
         "DIEN_TU_HOAC_BAT_NHANH"
        ]
       },
       {
        "fact": "tenLoai",
        "op": "TEN_LOAI",
        "value": "công tắc điện tử"
       },
       {
        "fact": "loaiDongDien",
        "op": "TRONG",
        "value": [
         "XOAY_CHIEU"
        ]
       },
       {
        "fact": "congDung",
        "op": "CONG_DUNG",
        "value": "điều khiển bằng quang học"
       }
      ],
      [
       {
        "fact": "loaiCongTac",
        "op": "TRONG",
        "value": [
         "DIEN_TU_HOAC_BAT_NHANH"
        ]
       },
       {
        "fact": "tenLoai",
        "op": "TEN_LOAI",
        "value": "công tắc điện tử"
       },
       {
        "fact": "congDung",
        "op": "CONG_DUNG",
        "value": "gồm một tranzito và một chip logic"
       }
      ],
      [
       {
        "fact": "loaiCongTac",
        "op": "TRONG",
        "value": [
         "DIEN_TU_HOAC_BAT_NHANH"
        ]
       },
       {
        "fact": "tenLoai",
        "op": "TEN_LOAI",
        "value": "công tắc điện cơ bật nhanh"
       },
       {
        "fact": "dongDien",
        "op": "<=",
        "value": 11,
        "donVi": "A"
       }
      ]
     ]
    }
   ],
   "trich": "8536505 Công tắc điện tử dùng cho mạch xoay chiều gồm mạch vào và mạch ra kết nối điều khiển bằng quang học … công tắc điện tử, kể cả công tắc bảo vệ quá nhiệt điện tử gồm một tranzito và một chip logic … công tắc điện cơ bật nhanh dùng cho dòng điện không quá 11 A"
  },
  "8536506": {
   "dieuKienSo": [
    {
     "fact": "loaiCongTac",
     "op": "TRONG",
     "value": [
      "MANG_DIEN_GI
```
```json
{
 "phienBan": "ranh-gioi-spec@1",
 "pn6": "854442",
 "phien": "https://claude.ai/code/session_01EtSm51cdfav5ye3fb1Nq1q#soan-l1-4-claude-giu-2",
 "dong8": {
  "85444211": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": [
      "Cáp điện thoại ngầm dưới biển",
      "cáp điện báo ngầm dưới biển",
      "cáp chuyển tiếp vô tuyến ngầm dưới biển"
     ]
    }
   ]
  },
  "85444213": {
   "dieuKienSo": [
    {
     "fact": "chatLieu",
     "op": "LA",
     "value": [
      "cao su",
      "plastic",
      "giấy"
     ],
     "viTri": "CACH_DIEN"
    }
   ]
  },
  "85444221": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": [
      "Cáp điện thoại ngầm dưới biển",
      "cáp điện báo ngầm dưới biển",
      "cáp chuyển tiếp vô tuyến ngầm dưới biển"
     ]
    }
   ]
  },
  "85444223": {
   "dieuKienSo": [
    {
     "fact": "chatLieu",
     "op": "LA",
     "value": [
      "cao su",
      "plastic",
      "giấy"
     ],
     "viTri": "CACH_DIEN"
    }
   ]
  },
  "85444232": {
   "dieuKienSo": [
    {
     "fact": "dungCho",
     "op": "CONG_DUNG",
     "value": [
      "87.02",
      "87.03",
      "87.04",
      "87.11"
     ]
    }
   ]
  },
  "85444234": {
   "dieuKienSo": [
    {
     "fact": "dungCho",
     "op": "CONG_DUNG",
     "value": [
      "87.02",
      "87.03",
      "87.04",
      "87.11"
     ]
    }
   ]
  },
  "85444291": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": "Cáp dữ liệu dẹt"
    },
    {
     "fact": "soSoi",
     "op": ">=",
     "value": 2,
     "donVi": "sợi"
    },
    {
     "fact": "chatLieu",
     "op": "LA",
     "value": [
      "cao su",
      "plastic",
      "giấy"
     ],
     "viTri": "CACH_DIEN"
    }
   ]
  },
  "85444292": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": "Cáp dữ liệu dẹt"
    },
    {
     "fact": "soSoi",
     "op": ">=",
     "value": 2,
     "donVi": "sợi"
    }
   ],
   "phanConLai": [
    "85444291"
   ]
  },
  "85444294": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": "Cáp điện"
    },
    {
     "fact": "chatLieu",
     "op": "LA",
     "value": "plastic",
     "viTri": "CACH_DIEN"
    },
    {
     "fact": "duongKinhLoi",
     "op": "<=",
     "value": 5,
     "donVi": "mm"
    }
   ]
  },
  "85444295": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": "Cáp điện"
    },
    {
     "fact": "chatLieu",
     "op": "LA",
     "value": "plastic",
     "viTri": "CACH_DIEN"
    },
    {
     "fact": "duongKinhLoi",
     "op": ">",
     "value": 5,
     "donVi": "mm"
    },
    {
     "fact": "duongKinhLoi",
     "op": "<=",
     "value": 19.5,
     "donVi": "mm"
    }
   ]
  },
  "85444296": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": "Cáp điện"
    },
    {
     "fact": "chatLieu",
     "op": "LA",
     "value": "plastic",
     "viTri": "CACH_DIEN"
    }
   ],
   "phanConLai": [
    "85444294",
    "85444295"
   ]
  },
  "85444297": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op": "TEN_LOAI",
     "value": "Cáp điện"
    },
    {
     "fact": "chatLieu",
     "op": "LA",
     "value": [
      "cao su",
      "giấy"
     ],
     "viTri": "CACH_DIEN"
    }
   ]
  }
 },
 "dieuKienNut": {
  "8544421": {
   "dieuKienSo": [
    {
     "fact": "congDung",
     "op": "CONG_DUNG",
     "value": "viễn thông"
    },
    {
     "fact": "dienAp",
     "op": "<=",
     "value": 80,
     "donVi": "V"
    }
   ]
  },
  "8544422": {
   "dieuKienSo": [
    {
     "fact": "congDung",
     "op": "CONG_DUNG",
     "value": "viễn thông"
    },
    {
     "fact": "dienAp",
     "op": ">",
     "value": 80,
     "donVi": "V"
    },
    {
     "fact": "dienAp",
     "op": "<=",
     "value": 1000,
     "donVi": "V"
    }
   ]
  },
  "8544423": {
   "dieuKienSo": [
    {
     "fact": "tenLoai",
     "op
```

# BÀI HỌC TỪ SOÁT ĐỘC LẬP LÁT 2 (12/42 PR bị trả về — BẮT BUỘC tuân thủ)

8. **Không ép khoá sẵn có cho đại lượng KHÁC nghĩa (sai trục).** Trước khi dùng khoá SO/chất liệu, đọc `nhanVi` của khoá: "đường kính vành" ≠ `duongKinh` (đường kính NGOÀI của hàng); "khả năng cân tối đa" ≠ `khoiLuong` (khối lượng của chính hàng); "đồng thau/hợp kim đồng-kẽm" ≠ `chatLieu: đồng` (giá trị này = đồng VÀ MỌI hợp kim đồng); loại polyme (PE/PP/PA) không phải `tenLoai` và `chatLieu: plastic` không phân biệt được. Đại lượng không trùng nhãn khoá ⇒ ghi `THIEU_KHOA_TU_VUNG` + `khoaDeXuat`, để DỪNG. Cảnh báo máy `cong3-bien-khong-doc-duoc` là dấu hiệu đỏ: phải ghi QUYET_DINH đối chiếu tay hoặc DỪNG, không bỏ qua.
9. **Giá trị chữ tự do KHÔNG được chứa "khác".** "máy chiếu khác", "đèn huỳnh quang khác", "xe … công nghiệp khác" là giá trị chết (hàng thật không có chữ "khác" ⇒ không bao giờ THOẢ). Viết "máy chiếu", "đèn huỳnh quang" và dùng `phanConLai` cho dòng còn lại.
10. **"Bằng/Từ <vật liệu>" ⇒ LUÔN `chatLieu`.** Cấm đổi sang `tenLoai` để né cổng `cong1-khong-phu-kin`; nếu `chatLieu` không có giá trị ⇒ `THIEU_KHOA_TU_VUNG`, để DỪNG. Đổi khoá để né cổng là lỗi bị trả về.
11. **Không bỏ vế/ý thật của dòng dài.** Dòng có ";" hoặc nhiều vế ⇒ bắt buộc HOAC từng vế (3 vế polyme ⇒ 3 nhánh, không rút còn 1 + phanConLai). Danh từ đầu dòng KHÔNG lặp tên tầng cha ("Mũi giày" dưới "Mũ giày và các bộ phận") ⇒ phải có `tenLoai` cho danh từ đó. Ý phụ nêu rõ trong dòng ("để cảnh báo…", "đã hóa dẻo") phải có điều kiện, không chỉ giữ cụm thuận tiện nhất.
12. **Quy ước chọn khoá theo cấu trúc câu:** danh từ chỉ hàng ⇒ `tenLoai` (CHỈ danh từ đầu, không nhét vế "dùng cho…" vào giá trị); "dùng cho / của / lắp cho <đích>" ⇒ `dungCho` (chỉ đích; đích là mã HS thì ghi mã trần "8539.51.00", không ghi "phân nhóm 8539.51.00"); "để <việc>" / "dùng làm <mục đích>" ⇒ `congDung`. "Tấm trải sàn" là TÊN hàng ⇒ `tenLoai`, không phải `congDung`.


# BÀI HỌC TỪ SOÁT ĐỘC LẬP (03/11) — ÁP DỤNG NGAY
- Không bỏ vế của chữ biểu; không BO_VE trên vế còn mở; không đổi trục (axis) so với chữ biểu.
- Ngưỡng "A hoặc B" (vd "6 V hoặc 12 V") KHÔNG diễn thành ≤; giữ đúng hai điều kiện.
- Phân biệt congDung với dungCho; không dùng lẫn.
- Không để giá trị chết (dead value) cùng với "khác".
