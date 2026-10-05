# Hướng dẫn trích tiền lệ từ toàn văn thông báo TB-TCHQ

Bản 1 (2026-10-04). Dành cho agent J2 (`hs-agent/jobs/precedent-extract.mjs`), agent khác và người nhập tay.
Mục tiêu: mỗi thông báo kết quả phân loại / xác định trước mã số của Hải quan thành **bản ghi tiền lệ
đủ để người khai dẫn ra khi giải trình**. Bản ghi này có mã kết luận, hàng là gì, vì sao vào mã đó và
link về văn bản gốc.

> Nguyên tắc: **thà không có bản ghi còn hơn bản ghi sai.** Không có dữ kiện trong văn bản thì để trống,
> không suy luận, không lấy từ kiến thức riêng.

---

## 1. Lấy toàn văn ở đâu

| Nguồn | Máy đọc được? | Ghi chú (kiểm 04/10/2026) |
|---|---|---|
| `vbpl.ts24.com.vn` | Có | Nguồn của J1/J2; chủ yếu văn bản 2023 trở đi |
| `caselaw.vn` | Có | Có toàn văn, nhưng chỉ phủ một phần thông báo cũ |
| `thuvienphapluat.vn`, `luatvietnam.vn` | **Không** | Bị Cloudflare chặn. **Không lách**: người có tài khoản mở bằng trình duyệt, chép toàn văn |
| `customs.gov.vn` | **Không** | Tra cứu phải qua captcha |

**Danh sách việc** nằm trong Google Sheet "URL_TB-TCHQ2025 5911 dòng" của CEO:
- Cột F là trạng thái: `Cần lấy` / `Đã có` / `Trùng dòng` / `Có thể đã có`.
- Cột G là ưu tiên: 1 = 2022–2025, 2 = 2018–2021, 3 = 2014–2017.
- Cột H là ghi chú.

Làm theo thứ tự ưu tiên 1 → 3.

## 2. Đọc chỗ nào trong một thông báo

Thông báo kết quả phân loại thường có các phần sau. Đánh dấu ✔ là phần cần lấy, ✘ là phần cấm lấy.

1. **Tiêu đề và số hiệu** ✔: `Số: 1234/TB-TCHQ`, `Hà Nội, ngày 15 tháng 3 năm 2025`. Loại văn bản đọc ở dòng
   "V/v kết quả phân loại…", "kết quả xác định trước mã số…" hoặc "đính chính…".
2. **Căn cứ** ✔ (một phần): ghi lại hai thứ.
   - Thông tư ban hành **Danh mục hàng hóa XNK** đang dùng. Thông tư này cho biết phân loại theo biểu thuế nào (mục 3, trường `bieuThue`).
   - Số **thông báo kết quả phân tích** (`…/TB-PTPL`, `…/TB-KĐ…`) nếu có.
3. **Tên hàng theo khai báo** ✔.
4. **Đơn vị XNK, địa chỉ, mã số thuế** ✘ **KHÔNG lấy**.
5. **Số, ngày tờ khai, chi cục đăng ký** ✘ **KHÔNG lấy**.
6. **Tóm tắt mô tả và đặc tính hàng hóa** ✔: chất liệu, cấu tạo, công dụng, thông số, kết quả phân tích.
7. **Kết quả phân loại** ✔: "thuộc nhóm 39.26 …, phân nhóm …, mã số 3926.90.99 …". Với xác định trước mã số:
   "Mã số: …". Kết luận có điều kiện ("nếu dùng cho… thì…") thì mỗi nhánh là một bản ghi.

## 3. Trường cần lấy → vị trí trong tệp đóng góp

Tệp nằm ở `data/community/tb-tchq/<nguồn>-<YYYY-MM-DD>.json`, `kind: "precedent"`. Schema:
`schemas/community-contribution.schema.json`.

| Trường | Bắt buộc | Lấy gì | Lỗi hay gặp |
|---|---|---|---|
| `hsCode` | ✔ | Mã **kết luận** ở mục 7, bỏ dấu chấm, 8 số. Văn bản chỉ kết luận tới nhóm/phân nhóm thì ghi 4/6 số | Lấy nhầm mã doanh nghiệp khai, hoặc mã chỉ được trích làm căn cứ |
| `description` | ✔ | Tên hàng (mục 3) + đặc tính **quyết định việc phân loại** (mục 6), 20–480 ký tự, tiếng Việt. Giữ nhãn hiệu/model của hàng | Chép cả tên doanh nghiệp; quá ngắn, chỉ có tên thương mại |
| `source.type` | ✔ | `"TB-TCHQ"` | |
| `source.reference` | ✔ | Số hiệu **nguyên văn**: `1234/TB-TCHQ`, `18550/TB-CHQ` (từ 2025 là Cục Hải quan) | Bỏ mất hậu tố, nhầm số TB-PTPL |
| `source.issuedDate` | ✔ | Ngày ký, dạng `YYYY-MM-DD` | Lấy ngày tờ khai hoặc ngày đăng web |
| `source.url` | ✔ | Trang **chi tiết** đã đọc, không lấy trang tìm kiếm | |
| `reasonVi` | ✔ | Chuỗi kết luận **nguyên văn** nhóm → phân nhóm → mã (kèm lời mô tả của từng cấp), cộng căn cứ văn bản nêu: chú giải chương/nhóm, đặc tính quyết định, kết quả phân tích. ≤ 1000 ký tự. **Dưới 150 ký tự bị coi là "mỏng"**, nên viết đủ khi văn bản có đủ | Tóm tắt lại bằng lời mình; chỉ ghi "→ 3208.90.90" |
| `girRule` | | **Chỉ khi văn bản viện dẫn rõ** "Quy tắc 1", "quy tắc 3(b)"… Dạng `"GIR 3(b)"`. Nhiều quy tắc thì ghi quy tắc quyết định (thường không phải 1 và 6), đủ cả trong `reasonVi` | **Tự suy ra GIR.** Trích sai điều luật tệ hơn không trích (CLAUDE.md luật 6) |
| `confusedWith` | | Mã văn bản nói hàng **không** thuộc về, hoặc mã doanh nghiệp đã khai mà văn bản bác. Chỉ mã có nguyên văn trong văn bản | Thêm mã "nghĩ là hay nhầm" |
| `attributes.bieuThue` | ✔ | Biểu thuế theo thông tư danh mục ở phần căn cứ: TT 156/2011 hoặc TT 103/2015 → `"2012"`; TT 65/2017 → `"2017"`; TT 31/2022 → `"2022"` | Đoán theo năm ban hành |
| `attributes.loaiTB` | | `"KET_QUA_PHAN_LOAI"` / `"XAC_DINH_TRUOC"` / `"DINH_CHINH"` | |
| `attributes.ptpl` | | Số thông báo kết quả phân tích, vd `"1586/TB-PTPL"` | |
| `attributes.dinhChinhCho` | | Thông báo đính chính: số hiệu thông báo bị sửa | |

Kết luận có điều kiện thì ghi điều kiện ở cuối `reasonVi`: `Điều kiện: …`.

**Cấm có trong bất kỳ trường nào:** tên doanh nghiệp, địa chỉ, mã số thuế, số/ngày tờ khai, chi cục đăng ký,
trị giá, số công văn của doanh nghiệp. Bộ lọc `lib/privacy-filter.js` mà bắt được thì **cả tệp** bị từ chối.

## 4. Ví dụ một bản ghi đủ

Ví dụ minh họa định dạng. Số hiệu và nội dung không phải văn bản thật.

```json
{
  "hsCode": "39269099",
  "description": "Khuôn nhựa dùng để định vị cell pin khi hàn, làm từ nhựa PPS chịu nhiệt, dạng khay có rãnh, không có bộ phận cơ khí chuyển động",
  "source": {
    "type": "TB-TCHQ",
    "reference": "1234/TB-TCHQ",
    "issuedDate": "2024-03-15",
    "url": "https://thuvienphapluat.vn/van-ban/Xuat-nhap-khau/Thong-bao-1234-TB-TCHQ-2024-...aspx"
  },
  "attributes": { "bieuThue": "2022", "loaiTB": "KET_QUA_PHAN_LOAI", "ptpl": "567/TB-KĐ4" },
  "reasonVi": "Thuộc nhóm 39.26 \"Các sản phẩm khác bằng plastic…\", phân nhóm 3926.90 \"- Loại khác\", mã số 3926.90.99 \"- - - Loại khác\". Căn cứ: sản phẩm bằng plastic, không phải khuôn đúc của nhóm 84.80 vì không dùng để tạo hình vật liệu, chỉ để định vị chi tiết khi hàn.",
  "girRule": "GIR 1",
  "confusedWith": ["84807190"]
}
```

## 5. Tự kiểm trước khi nộp

Các bước dưới đây J2 làm tự động. Người nhập tay thì tự soát.

1. `hsCode` xuất hiện **nguyên văn** trong toàn văn (`3926.90.99` hoặc `39269099`).
2. ≥ 60 % từ của `description` có trong toàn văn. Đây là bước chống bịa.
3. `source.reference` và `issuedDate` lấy từ phần đầu văn bản, không lấy từ trí nhớ.
4. `npm run validate:community` xanh. Từ 05/10/2026, tệp `precedent` có `submittedAt` từ ngày này trở đi bị chặn khi:
   - mã giả (`00000000`…) hoặc mô tả giữ chỗ ("Hàng hóa theo Thông báo …"). Thông báo lỗi nguồn, không kết luận
     hay không phải thông báo phân loại thì **ghi lên sheet, không tạo bản ghi**;
   - `reasonVi` dưới 80 ký tự, không chứa mã kết luận, có ngoặc mở không đóng (bị cắt giữa chừng) hoặc quá 1000 ký tự;
   - thiếu `issuedDate`, `url`, `attributes.bieuThue`; mô tả dưới 20 ký tự;
   - cùng một bản ghi (số hiệu + năm + mã + mô tả) nằm ở hai tệp.

   Lý do dưới 150 ký tự chỉ cảnh báo, nhưng sẽ bị coi là bản mỏng.

## 6. Nộp và gộp

```bash
npm run validate:community
npm run data:merge-community        # tự THAY bản ghi mỏng cùng số hiệu + mã + mặt hàng
npm run data:backfill-sources       # điền sourceUrl / issuedDate còn trống từ tệp community
npm test
```

Mở PR nhãn `agent` hoặc `data`. Ghi trong PR: số thông báo đã đọc, số bản ghi, và những thông báo đọc
rồi nhưng **không có kết luận** (trả hồ sơ, không đủ cơ sở). Liệt kê các thông báo này để không ai đọc lại.

**Thông báo đính chính:** chỉ sửa câu chữ (thành phần, khổ vải…) mà mã giữ nguyên thì **không** tạo bản ghi; ghi lên sheet `Xong`, K = 0, cột H nói đính chính gì. Đính chính đổi mã hoặc đổi đặc tính quyết định thì tạo bản ghi theo kết luận **mới** với `reference` là số thông báo đính chính,
`attributes.dinhChinhCho` là thông báo bị sửa. Ghi rõ trong PR để maintainer gỡ bản ghi cũ nếu mã đã đổi.

## 7. Việc bổ sung còn tồn (04/10/2026)

Trên 2.879 bản ghi TB-TCHQ/TB-CHQ trong `data/precedents.json`; tất cả đã có `sourceUrl`.


| Nhóm | Số bản ghi | Cần gì | Có sẵn |
|---|---|---|---|
| Nhập từ bảng cũ `tb_tchq_index.json` | 513 | Đọc lại toàn văn: `description` đủ, `reasonVi`, `issuedDate`, `bieuThue` | `sourceUrl` (link TVPL) đã điền |
| Lý do mỏng (< 150 ký tự) từ tệp community | 216 | `reasonVi` đủ chuỗi nhóm → mã + căn cứ | link + ngày |
| Chưa ghi GIR | 2.688 | `girRule` **chỉ khi văn bản viện dẫn** | |
| Thiếu ngày ban hành | 578 | `issuedDate` | link |

Cách làm: mở `sourceUrl` của bản ghi (`data/precedents.json`), trích lại **cùng số hiệu, cùng mã, cùng
mặt hàng** vào một tệp community mới, rồi chạy `data:merge-community`. Bản mỏng sẽ được thay, không sinh
dòng trùng. Bản ghi cũ đã có lý do đủ thì giữ, không đọc lại.
