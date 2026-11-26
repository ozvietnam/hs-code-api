# Khuôn hồ sơ vấn đề mã 8 số `ho-so-ma@1`

Khâu 3, ADR-0006 (cùng ADR-0004, ADR-0005), kế hoạch `docs/ke-hoach-ho-so-ma.md`, thẻ M-71 (#1963).

Mỗi mã 8 số có một **hồ sơ vấn đề** dựng **chỉ từ luật**: phải là gì, không được là gì (chuyển đi đâu), khác anh em ở đâu, ngưỡng số, dữ kiện cần biết, vấn đề chỉ liệt kê được. Không có mô tả hàng, tờ khai, tiền lệ, lời AI hay trí nhớ. Vấn đề **lưu ở nút sinh ra nó**; hồ sơ của một mã do máy **ghép dọc đường đi** (`lib/ho-so-ma/ghep.js`). Luật đổi câu nào thì vân tay câu đó đổi, cổng 5 đỏ đúng các vấn đề dính câu đó.

## 1. Một VẤN ĐỀ

Mỗi dòng JSONL một bản ghi. Mỗi vấn đề **một điều kiện đơn**, có **trích nguyên văn** một câu.

```json
{"id":"hs:bieu:7605:3","nut":"bieu:7605","loai":"KHONG_DUOC_LA","dieuKien":"Không phải dây điện, cáp điện đã cách điện",
 "trich":"Dây điện và cáp điện cách điện (kể cả loại đã tráng men cách điện hoặc mạ lớp cách điện)","cau":"nhom:7605:ct:7#1",
 "den":["bieu:8544"],"duKien":["cách điện"],"lop":"HUONG_DAN","nguon":"Chú giải chi tiết HS 2022 (bản dịch kèm CV 1810/TCHQ-TXNK 2024)",
 "van":"<sha256 chữ câu>","trangThai":"KHOP"}
```

| Trường | Luật |
|---|---|
| `id` | `hs:<nut>:<số>`, duy nhất toàn kho |
| `nut` | Nút sinh ra vấn đề, trên đường đi: `phan:XV` · `chuong:76` · `chuong:28:pc:II` · `bieu:7605` (4) · `bieu:76051` (tiêu đề 5 số) · `bieu:760519` (6) · `bieu:7606123` / `bieu:…:td1` (tiêu đề 7 số) · `bieu:76051910` (8). Cấp Chương ghi `chuong:76`, không ghi `bieu:76` |
| `loai` | Một trong sáu loại ở mục 3 |
| `dieuKien` | Một câu ngắn, một dòng, ≤ 300 ký tự, nói đúng một điều kiện |
| `trich` | Chép nguyên văn một đoạn của câu `cau` (so sau khi chuẩn hoá khoảng trắng như `scripts/kiem-luat-goc.mjs`). Không sửa chữ cho đẹp |
| `cau` | id câu trong `data/luat-goc/cau` (dạng `<id nút>#<số>`). Cấm câu tiền lệ `tb:` |
| `tu` | Chỉ ở `PHAI_LA` sinh từ **cạnh đi vào** (câu ở nơi khác loại/phân hàng sang nút này): id câu nguồn, phải trùng `cau` — trích chính câu nguồn đó |
| `den` | Mảng id nút đích (`bieu:` / `chuong:` / `phan:` / `gir:`). **Bắt buộc** với `KHONG_DUOC_LA` (chuyển đi đâu); được có ở `PHAI_LA`, `CHI_LIET_KE`; loại khác không mang. Nơi chuyển của `KHONG_DUOC_LA` phải ở **ngoài** `nut`: câu đưa hàng về một nút nằm trong chính `nut` (Phần XV → Chương 82) là `PHAI_LA` mang `den` đó; câu trừ một hàng ra khỏi một quy tắc (không phải khỏi nút) là `CHI_LIET_KE` |
| `voi` | Mảng id anh em cùng cha. **Bắt buộc** với `TACH_ANH_EM`; được có ở `NGUONG` |
| `thuatNgu` | Chỉ và **bắt buộc** ở `DINH_NGHIA`: thuật ngữ được định nghĩa, nguyên chữ trong câu hoặc câu dẫn (`"Dây"`, `"kim loại cơ bản"`). Mỗi điều kiện đơn của một định nghĩa là một vấn đề, cùng `thuatNgu`; máy ghép so hai phiếu `DINH_NGHIA` theo `thuatNgu` |
| `nguong` | Chỉ `NGUONG`: `{daiLuong, donVi, tu, den, gomTu, gomDen}` — `tu`/`den` là số hoặc `null` (vô cùng), ít nhất một số |
| `duKien` | Mảng **loại dữ kiện cần biết**, mỗi mục phải **có nguyên chữ trong câu luật** (`"hàm lượng nhôm"`, `"kích thước mặt cắt ngang lớn nhất"`, `"cách điện"`). Không tự đặt tên dữ kiện, không suy từ khoá → nhóm. Rỗng được |
| `lop`, `nguon` | Chép từ nút nguồn của câu: `lop` (`LUAT` / `HUONG_DAN`), `nguon` = `nguon.vanBan` |
| `van` | sha256 (hex) của chữ câu gốc = `nguyenVan.slice(tu, den)` của câu, không chuẩn hoá |
| `trangThai` | `KHOP` (hai phiếu độc lập khớp) · `LECH_PHIEU` (hai phiếu lệch, chờ người đọc) · `VENH` (hai nguồn luật vênh nhau) |
| `phieu`, `ghiChu` | Tuỳ chọn: phiếu của từng mô hình; ghi chú sự thật về bản in |

Không trường nào khác (khuôn đỏ khi gặp trường lạ, ví dụ `tuKhoa`).

## 2. Một BỎ QUA

Câu có sức pháp lý trên đường đi mà **không tạo điều kiện** thì ghi BỎ QUA kèm lý do — để cổng 1 phân biệt "đã đọc, không có gì" với "chưa đọc".

```json
{"id":"hs:phan:XV:1","nut":"phan:XV","loai":"BO_QUA","cau":"phan:XV#1","lyDo":"Tên Phần chỉ để dễ tra cứu (Quy tắc 1), không tạo điều kiện","van":"<sha256>"}
```

`nut` của BỎ QUA phải đúng là nút chủ của câu. `lyDo` ≥ 8 ký tự. Trường được phép: `id, nut, loai, cau, lyDo, van, ghiChu`.

## 3. Sáu loại vấn đề

| Loại | Nghĩa | Ví dụ nguồn |
|---|---|---|
| `PHAI_LA` | Điều kiện hàng phải thoả để vào nút (tên nhóm/phân nhóm/dòng, câu "nhóm này bao gồm") | `bieu:7605#1` "Dây nhôm" |
| `KHONG_DUOC_LA` | Điều kiện loại ra khỏi nút, **kèm nơi chuyển** (`den`) | Chú giải chi tiết 76.05 (e) → 85.44 |
| `TACH_ANH_EM` | Điểm khác giữa nút và anh em cùng cha (`voi`). Quy ước: trích **tên của chính nút**, mỗi đoạn tên một vấn đề, `voi` gồm mọi anh em bị tách bởi đoạn đó; "Loại khác" trích chữ "khác", `voi` = các anh em có tên | 7605.19.10 / 7605.19.90 |
| `DINH_NGHIA` | Định nghĩa thuật ngữ áp cho nút (chú giải định nghĩa "dây", "hợp kim nhôm") | Chú giải phân nhóm 1(b) Chương 76 |
| `NGUONG` | Ngưỡng số phân dải anh em trên một đại lượng có chữ trong luật | "Kích thước mặt cắt ngang lớn nhất trên 7 mm" |
| `CHI_LIET_KE` | Vấn đề chỉ liệt kê được, không quy được về điều kiện máy kiểm: Quy tắc 2(a), 3(b), bộ phận, đa chức năng, "chủ yếu dùng cho", "đặc tính cơ bản" — để tầng so với mô tả khách (LLM mạnh) cân nhắc | Chú giải 2 Phần XVI |

Câu được trích: câu của chính nút, của nút phía trên trên đường đi, hoặc câu áp chung (`gir:`, `sen:md:`). Riêng `TACH_ANH_EM` và `NGUONG` được trích câu của anh em cùng cha ("Loại khác" phủ định anh em có tên). `PHAI_LA` mang `tu` được trích câu ở nơi khác khi kho `nghia-canh` có cạnh `LOAI_SANG` / `PHAN_VE` (hoặc `CHUA_RO`) từ câu đó tới đúng nút này.

## 4. Nơi lưu

`data/ho-so-ma/<thư mục>/<khoá>.jsonl`, theo nút sinh ra vấn đề. Gốc `data/ho-so-ma/` chỉ có bảy thư mục dưới đây (thứ khác ở gốc là khuôn đỏ):

| Thư mục | Nút | Khoá tệp | Thẻ ghi |
|---|---|---|---|
| `phan/` | `phan:XV` | `XV` | M-72 |
| `chuong/` | `chuong:76`, `chuong:28:pc:II` | `76`, `28` | M-72 |
| `nhom/` | nhóm 4 số (M-73); tiêu đề 5 số (M-76) | `7605` | M-73, M-76 |
| `phan-nhom/` | 6 số và tiêu đề 7 số | `760519` | M-76 |
| `dong/` | 8 số | `76051910` | M-76 |
| `nguong/` | `NGUONG` của mọi cấp | Chương (`76`) hoặc Phần (`XV`) | M-74 |
| `liet-ke/` | `CHI_LIET_KE` của mọi cấp | Chương hoặc Phần | M-75 |

Kho riêng, tách hẳn đồ cũ: `data/ho-so/` và `lib/ho-so/` là hồ sơ phân loại cũ (có tệp lớp `THUC_TE`), khuôn này không đọc. Thẻ đầu tiên ghi tệp vào một thư mục phải khai lớp ở `data/lop-kho.json` (`RUT_TU_LUAT`).

**Nguyên liệu tham khảo `data/ho-so/ranh-gioi/` (`ranh-gioi@1`, điều kiện số bậc 6 → 8):** chỉ dùng làm gợi ý khi tách `NGUONG` / `TACH_ANH_EM` (M-74, M-76). Một điều kiện lấy từ đó **chỉ được nhận** khi viết lại thành vấn đề có `trich` khớp nguyên văn câu luật trong `data/luat-goc` (qua cổng 4) và `duKien` có nguyên chữ trong câu. Không nhận thẳng, không chép `dieuKienSo` / `fact` sang hồ sơ.

## 5. Năm cổng (`scripts/ho-so-ma/cong.mjs`)

Chạy theo phạm vi: `--pham-vi 76 | chuong:76 | phan:XV | chuong:28:pc:II | 7605 | 760519 | 76051910` (lặp được). Mặc định phạm vi gồm cả các cấp phía trên (đường đi đầy đủ); `--chi-trong` chỉ xét bên trong phạm vi — thẻ tách một cấp dùng cái này. `--toi-cap phan|chuong|4|6|8` chỉ xét nút tới cấp đó: nút sâu hơn không vào cổng 1–3, anh em sâu hơn không đòi tách (M-72 dùng `phan`/`chuong`, M-73 dùng `4`). **Tiêu đề 5 số xếp cùng bậc 6 số** (anh em của nó là phân nhóm 6 số) nên do M-76 tách, dù tệp vẫn ở `nhom/`. Không có phạm vi: chỉ chạy khuôn + cổng 4, 5 trên mọi bản ghi.

1. **ĐỦ** — mọi câu trên đường đi mà nút nguồn lớp `LUAT`, hoặc lớp `HUONG_DAN` và câu có cạnh `LOAI_SANG` / `PHAN_VE` / `DINH_NGHIA` (hay `CHUA_RO` có một trong ba) trong `data/luat-goc/nghia-canh`, đã có ít nhất một vấn đề hoặc một BỎ QUA trích câu đó. Câu `HUONG_DAN` không có cạnh như vậy (ví dụ câu dẫn "Nhóm này không bao gồm:") không bắt buộc.
2. **LOẠI** — *Cạnh đi ra* (từ câu trên đường đi): `LOAI_SANG` cần vấn đề `KHONG_DUOC_LA` cùng câu có `den` chứa đích cạnh; `PHAN_VE` và `CHUA_RO` (phiếu có `LOAI_SANG` hoặc `PHAN_VE`) cần `KHONG_DUOC_LA` hoặc `PHAI_LA` cùng câu, `den` chứa đích. Đích nằm **trong** nút chủ của câu thì chỉ nhận `PHAI_LA`. Chỉ đòi khi đích cạnh là **nút phân loại** (`phan:` / `chuong:` / `bieu:` / `gir:`); cạnh trỏ vào câu chú giải (`phan:XV:cg:1`) chỉ cảnh báo. BỎ QUA không thay được. *Cạnh đi vào* (câu ở nơi khác — không phải chính nút đích, nút trên hay nút dưới nó; anh em cùng Chương cũng là nơi khác — đích là nút trên đường đi): `LOAI_SANG` / `PHAN_VE` trạng thái `KHOP` cần `PHAI_LA` ở nút đích mang `tu` = câu nguồn; `CHUA_RO` chỉ **cảnh báo**, không đỏ.
3. **ANH EM** — mỗi cặp nút cùng cha (trong phạm vi; ở chế độ đường đi đủ thì thêm cặp nút trên đường đi với anh em của nó) có `TACH_ANH_EM` giữa hai nút hoặc `NGUONG` cùng đại lượng, cùng đơn vị, không chồng dải. Đỏ khi: chưa tách; `NGUONG` chồng; hai anh em trùng bộ điều kiện (`loai` + `dieuKien`); `voi` trỏ ra ngoài anh em; mọi anh em cùng có `NGUONG` trên một đại lượng mà dải hở giữa chừng.
4. **TRÍCH** — `cau` có thật trong kho câu, không phải tiền lệ; `trich` nằm nguyên văn trong chữ câu; `lop`, `nguon` khớp nút nguồn; mỗi `duKien` có nguyên chữ trong câu; `thuatNgu` có nguyên chữ trong câu hoặc câu dẫn; nơi chuyển của `KHONG_DUOC_LA` không nằm trong chính `nut`; câu thuộc đường đi của `nut` (mục 3); `den`, `voi` là nút có thật.
5. **VÂN TAY** — `van` = sha256 chữ câu hiện hành. Lệch thì đỏ kèm lệnh `node scripts/ho-so-ma/cong.mjs --dinh-cau '<câu>'` (in chữ mới, vân tay mới và mọi bản ghi dính câu) để thẻ tách của cấp đó dựng lại đúng phần đó.

Khuôn: `node scripts/ho-so-ma/khuon.mjs`. Bài kiểm: `node scripts/test-ho-so-ma.mjs` (dữ liệu giả Chương 76, câu thật, ca ngược cho từng cổng).

## 6. Máy ghép (`lib/ho-so-ma/ghep.js`)

`hoSo(ma, {luat, hoSo})` nhận mã 4/6/8 số (`"7605.19.10"` được), trả:

```js
{ khuon: 'ho-so-ma@1', ma: '76051910', soVanDe, thieu: ['DONG bieu:76051910: chưa có …'],
  duong: [ { cap: 'PHAN' | 'CHUONG' | 'PHAN_CHUONG' | 'NHOM' | 'TIEU_DE_5' | 'PHAN_NHOM' | 'TIEU_DE_7' | 'DONG',
             nut, ten, anhEm: [{nut, ten}], vanDe: [bản ghi y nguyên trong kho], soBoQua, chuaKhop: [id], thieu } ] }
```

Chỉ đọc và xếp, không chép vấn đề sang kho khác, không sinh vấn đề. Cấp nào chưa có bản ghi nào (kể cả BỎ QUA) thì `thieu`. Mã không có trong biểu thì `khongCo`. Không nối vào đường chọn mã (M-77 làm API đọc).
