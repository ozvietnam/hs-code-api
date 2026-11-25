# M-19 – Thông báo kết quả phân loại (`data/luat-goc/thong-bao.jsonl`)

Danh mục thông báo, mã lúc ban hành, bảng cân: từ `data/precedents.json` (4.908 bản ghi). **Chữ: từ toàn văn thông báo cho 2.270 nút**; 815 nút không có toàn văn dùng được thì giữ chữ kho cũ, `chuaDoiChieu: true`. Không dùng tờ khai, không dùng `legacy-hs-mapping`, không AI. Lớp `TIEN_LE`: chỉ để kiểm ở bước cuối (ADR-0004). Từng dòng: `M-19-tung-dong-thong-bao.md`.

```
G=<thư mục có tracuuhs-detail*.json>            # 126 tệp, 2.737 bản toàn văn, 2.300 thông báo; ngoài repo
node scripts/luat-goc/thong-bao.mjs $G           # dựng kho + bảng từng dòng
node scripts/luat-goc/thong-bao.mjs $G --kiem    # dựng lại, so từng byte
node scripts/luat-goc/thong-bao-bang-chung.mjs $G --ban-chu <thư mục riêng>/thong-bao.txt
LUAT_GOC_TXT=<thư mục riêng> node scripts/kiem-luat-goc.mjs thong-bao
```

## Bảng cân

| Kết cục | Bản ghi |
|---|---:|
| **Nút** (3.085 thông báo, mỗi thông báo một mã 8 số; 1.070 mã) | **3.085** |
| Gộp trùng: cùng số, năm, mã lúc ban hành, do nhiều người cào; vị trí ở `khoCu` của nút | 1.356 |
| LOI_AGENT: mô tả agent viết lại, không phải chữ thông báo | 202 |
| CONG_VAN: công văn hướng dẫn, không phải thông báo kết quả | 138 |
| KHONG_MO_TA: chữ giữ chỗ, "theo phụ lục", tiêu đề trang web | 59 |
| KHONG_NAM: không năm, không ngày | 39 |
| LECH_TOAN_VAN: mô tả không có trong toàn văn | 15 |
| NUOC_NGOAI: 10 CBP, 1 ABF | 11 |
| DINH_CHINH: 2174/TB-TCHQ, 1377/TB-TCHQ (văn bản đính chính, không có hàng) | 2 |
| MA_BI_DINH_CHINH: 1811/TB-TCHQ để dưới 32082090 | 1 |
| **Cộng** | **4.908** |

"Để riêng" là không vào kho luật gốc; bản ghi vẫn nguyên trong kho cũ, có số, mã, địa chỉ nguồn (hoặc bằng chứng) trong bảng từng dòng để lấy lại bằng nguyên văn.

## Quy ước

- id `tb:<số>-<năm>:<mã lúc ban hành>` cho `TB-TCHQ`; ký hiệu khác ghi vào số: `tb:20639.TB-CHQ-2026:…`. Số 119 và 223 năm 2025 có ở cả hai ký hiệu, nên không dùng số trần cho `TB-CHQ`.
- Cùng thông báo, cùng mã, nhiều mặt hàng thì dùng hậu tố `_b`, `_c` sau năm (`tb:851-2023_b:84812090`). **Hiện không có nút nào cần:** trong 1.356 bản ghi gộp không có cặp nào cùng một tệp nguồn mà mô tả khác hàng; khác nhau là do hai người cào lấy hai mục của một thông báo.
- `maLucBanHanh`: `hsCodeGoc` nếu kho ghi; không thì `outcome` khi khác khoá; không thì khoá. 42 nút kho cũ để dưới khoá khác (mã dẫn nối hoặc khoá sai), ghi ở `ghiChu`. Không nút nào mang mã dẫn nối.
- **Nút có toàn văn:** `nguyenVan` = trọn mục "Kết quả phân loại" / "Kết quả xác định trước mã số" (mô tả + câu kết luận mã), từ sau tiêu đề tới trước "Thông báo này có hiệu lực…"; `moTaKhaiBao` = mục "Tên hàng theo khai báo" / "Hàng hóa đề nghị xác định trước mã số" (2.137 nút; 133 nút `null`). Chỉ gộp khoảng trắng. `nguon.tep`, `nguon.sha256` = tệp và mã băm của chính toàn văn (trường `noi_dung`, NFC); `nguon.tepKhoCu` = tệp kho cũ. Nhiều bản toàn văn thì lấy bản có mã ở mục kết quả, ít chỗ che nhất, rồi thứ tự tệp.
- **Không chép tên doanh nghiệp** (ghi ở `thieu`): 732 nút giữ nhãn "Nhà sản xuất:" nhưng bỏ phần tên; 217 nút bỏ câu có tên (17 ở mục kết quả, 203 ở mục khai báo; mục khai báo mất quá nửa thì để `null`). 15 nút bản chữ nguồn đã che sẵn (`##DN##`), giữ nguyên dấu che. Câu có mã kết luận không bao giờ bị bỏ. Tên không kèm dấu hiệu (Ltd, TNHH, NSX…) máy không nhận ra.
- **815 nút `chuaDoiChieu: true`:** `nguyenVan` = mô tả hàng của kho cũ, `ketLuan` = câu "thuộc nhóm … mã số …" của kho cũ (đã cắt hai câu kho cũ gắn thêm "Dẫn nối … OZV-400", "Đính chính tại Thông báo …"). 813 không có toàn văn; 2 có toàn văn nhưng bản chữ bị che mất kết luận (5439/2022, 3349/2024).
- `thayThe: ["<số/năm>"]`, câu nguyên văn ở `thayTheCanCu`; chiều ngược ở `biThay`.
- `conTrongBieu` theo `data/tax.json`: 2.816 còn, 269 không còn (104 mã). `trang` null mọi nút. `hieuLuc.tu` = ngày ban hành (3.067 nút; 18 nút kho không có ngày). 15 nút lấy năm từ địa chỉ nguồn.

## Đối chiếu

- Không đặt `LUAT_GOC_TXT`: PASS, 3.085 nút, 0 lỗi.
- Có `LUAT_GOC_TXT` (`thong-bao.txt` = ghép toàn văn, sha256 đầu vào `b8016849…e318`): **2.270 nút có toàn văn: 0 lỗi. 814 lỗi đều ở nút `chuaDoiChieu`.** Cổng hiện còn in FAIL tới khi QT cho bỏ qua các nút này. `moTaKhaiBao` chạy qua cùng phép so: 2.137 nút, 0 lỗi.
- Điều phải biết về con số 0 lỗi: bản chữ đối chiếu chính là nguồn rút (một lần đọc), nên nó chứng minh không thêm, không sửa chữ; không chứng minh bản cào giống bản ký. Cổng so theo câu; cả đoạn liền một mạch là 1.554 nút, còn lại do nhãn nhà sản xuất bị bỏ tên hoặc khác dấu câu nối.
- Mã: 2.268/2.270 nút có `maLucBanHanh` in ngay trong mục kết quả. Hai nút còn lại: 1811/2020 (in 32082090, đã được 2174/TB-TCHQ đính chính; câu đính chính nguyên văn ở `dinhChinh.trich`) và 3408/2024 (bản chữ bị che mất mã; mã theo kho cũ).
- Đọc tay 34 nút rút ngẫu nhiên (hạt 1907): đọc đầu và cuối đoạn (đoạn dài lược phần giữa), cả 34 đúng ranh mục, đúng hàng, đúng câu kết luận. Một nút lúc đó còn mẩu khai báo vô nghĩa (181/2021), đã sửa thành `null` cho cả kho.
- Kiểm thêm, không hoàn toàn độc lập (một phần kho cũ cũng cào từ tracuuhs): mô tả kho cũ so với toàn văn, 1.924 nút nguyên vẹn. Ngày đầu văn bản khác kho: 1 nút (530/TB-TCHQ 2018).

## Bốn danh sách của thẻ

- **105 khoá mã chết:** đều giữ mã cũ, `conTrongBieu:false`. 104 mã có nút; `48114990` không có nút (bản ghi duy nhất là chữ giữ chỗ). Không mã nào được đổi.
- **20 bản ghi không số:** không mất số; số nằm ở `source.reference`. 6 thành nút, 14 gộp trùng.
- **11 nước ngoài:** để riêng.
- **73 thông báo gắn nhiều khoá mã:** 53 thật ra một mã lúc ban hành (kho để thêm dưới mã dẫn nối hoặc khoá sai) → một nút; 18 là công văn nêu nhiều mã → để riêng; 1 gắn nhầm (1811: mã trước và sau đính chính); 1 hai mặt hàng hai mã thật (5722/TB-TCHQ 2023, 25174100 và 25174900) nhưng cả hai bản ghi là lời agent → để riêng. Không có thông báo nào còn mang hai mã trong kho mới.

## Lỗi của kho cũ lộ ra

- **14 bản ghi để sai khoá** (`tb_tchq_index.json`): khoá khác `outcome`, toàn văn in đúng `outcome` (vd 3235–3237/TB-TCHQ DJI Mini để dưới 85255000, thông báo kết luận 8525.80.39). **51 bản ghi "mở ký gửi"** để dưới mã dẫn nối; toàn văn in mã cũ.
- **2174/TB-TCHQ** để dưới đúng mã mà nó bãi đi (32082090).
- **15 mô tả không phải chữ của thông báo** (đọc cạnh toàn văn 10 bản): đúng loại hàng nhưng người cào thêm chi tiết văn bản không in (3131/2019 thêm số CAS, dạng tinh thể, công dụng; 2888/2018 thêm "giảm đau, hạ sốt"; 1795/2018 thêm kích thước 1830 x 2440 mm dù kết luận chỉ ghi "Gương thủy tinh chưa có khung") hoặc viết lại (3055–3057/2018, 280–287/2025, 123/2025 đổi "bộ căng xích cam" thành "Bộ căng … động cơ diesel"). Toàn văn có sẵn để lấy lại.
- **1097/TB-TCHQ 2020**: bản hiện hành đã sạch (819UV / Phenylbis…), toàn văn khớp.
- **23 câu "thay thế Thông báo …"** trong toàn văn, 11 câu chưa có trong `data/tien-le-thay-the.json`. Tổng 25 thông báo bị thay, 16 có nút (`biThay`, `hieuLuc.den` = ngày thông báo mới). Thêm từ toàn văn: 814/2018, 1629/2020, 1900/2020, 3119/2018, 5523/2024 — kho cũ vẫn coi là còn hiệu lực.

## Danh sách theo toàn văn (bảng ở tệp từng dòng)

- 14 bản ghi sai khoá: toàn văn in đúng `outcome` cả 14. 51 bản ghi dưới mã dẫn nối: 36 toàn văn in đúng mã cũ, 15 không có toàn văn.
- 2 nút PDF quét cho mã khác (`tb:2791-2018:72283010`, `tb:92-2019:72299020`): không có toàn văn chữ; tệp PDF nói hàng khác hẳn (keo Loctite, cáp Aruba), PDF không đọc được số hiệu. Không rõ nên giữ mã kho, `chuaDoiChieu`, ghi `maPdfQuet`.

## Chỗ chưa chắc

1. 815 nút chưa đối chiếu: luatvietnam 718, thuvienphapluat 80, còn lại 17. Cần bản gốc.
2. 15 LECH_TOAN_VAN vẫn để riêng như lần trước, dù toàn văn có sẵn: nay chữ lấy từ toàn văn nên có thể nạp lại. Một phần KHONG_MO_TA và LOI_AGENT cũng vậy. Chờ QT.
3. 202 LOI_AGENT phân theo nhóm người cào (`agent-tbtchq-ch8*`, `-dot5-*`, `-thep-hoachat`) và dấu "→"; 172 không có toàn văn để kiểm. 138 công văn chưa có `loai` trong khuôn.
4. 23 nút in thêm một mã Chương 98 (9811, 9837) trong kết luận: có trong `nguyenVan`, không thành trường.
5. Hiệu lực chỉ biết qua câu thay thế có chữ. Không suy hết hạn theo thời hạn xác định trước mã số.
