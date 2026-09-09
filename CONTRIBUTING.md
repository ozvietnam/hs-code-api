# Đóng góp cho HS Knowledge Base

Cảm ơn bạn đã ghé. Dự án này có một mục tiêu đơn giản: **làm cho việc xác định mã
HS ngày càng rõ ràng và thuận tiện cho tất cả mọi người** — thay vì mỗi doanh
nghiệp tự mò trong bóng tối rồi ai cũng trả giá bằng những lần bị ấn định lại mã.

Kinh nghiệm của bạn có giá trị. Một lần bị Hải quan bác mã và cách bạn giải trình
thành công là thứ không sách nào dạy, và là thứ dự án này cần nhất.

---

## ⚠️ Đọc trước: đừng gửi thông tin khách hàng

Đây là điều quan trọng nhất trong toàn bộ tài liệu này.

Khi gửi dữ liệu, **chỉ gửi cặp mô tả hàng hoá ↔ mã HS**. Tuyệt đối không kèm:

| Không gửi | Vì sao |
|---|---|
| Tên doanh nghiệp (của bạn hoặc của khách) | Không liên quan tới phân loại |
| Mã số thuế | Truy ngược ra được doanh nghiệp |
| Số tờ khai | Truy ngược ra được lô hàng cụ thể |
| Trị giá, đơn giá | Bí mật kinh doanh |
| Tên đối tác, nhà cung cấp | Bí mật kinh doanh |
| Invoice, packing list, vận đơn | Chứng từ thương mại |
| Số điện thoại, email, địa chỉ | Thông tin cá nhân |
| Tên doanh nghiệp Trung Quốc (有限公司, 贸易) | Cùng lý do — nguồn hàng hay gặp |
| Mã container (MSCU…) và số seal | Truy ngược lô vận chuyển |
| Toạ độ / địa chỉ kho | Không liên quan tới phân loại |

Repo này **công khai**, và lịch sử git thì **không xoá được**. Một lần lọt là dữ
liệu của khách hàng bạn nằm vĩnh viễn trên Internet.

Dự án có bộ lọc tự động chặn ở cổng vào (`scripts/validate-community.mjs`) nhưng
**đừng dựa vào nó** — nó chỉ là lưới an toàn cuối, không phải người gác cửa.

---

## Bạn muốn đóng góp kiểu gì?

### A. Chỉ muốn báo một lỗi hoặc góp một ý — không cần biết code

Mở [Issue](https://github.com/ozvietnam/hs-code-api/issues/new/choose). Chọn mẫu
phù hợp, điền vào là xong. Không cần cài gì, không cần biết git.

Kể cả một câu "mã 84137090 mô tả sai rồi, phải là ..." cũng đã hữu ích.

### B. Có dữ liệu muốn đóng góp — gửi qua Pull Request

Ba loại dữ liệu quý nhất, xếp theo mức hữu ích:

| Loại | `kind` | Vì sao quý |
|---|---|---|
| **Bảng phân giải cụm mã dễ nhầm** | `conflict-table` | Quý nhất. Hiện 4 bảng verified, phủ 14/11.871 mã. Đây là thứ trực tiếp kéo độ chính xác lên |
| **Thông báo phân loại TB-TCHQ** | `precedent` | Căn cứ mạnh nhất khi giải trình — đây là cách Hải quan đã thực sự phân loại |
| **Báo lỗi dữ liệu hiện có** | `correction` | Dữ liệu sai đang lan ra qua API công khai; sửa được là chặn được sai lan tiếp |
| Tên sản phẩm ví dụ cho mã "Loại khác" | `product-example` | Giúp AI và người tra hiểu phạm vi mã residual |

**Cách gửi:**

1. Fork repo, tạo nhánh mới.
2. Tạo tệp `data/community/<tên-của-bạn>-<chủ-đề>.json` theo mẫu bên dưới.
3. Chạy kiểm tra trước khi push:
   ```bash
   npm run validate:community
   ```
   Maintainer gộp vào kho chính bằng `npm run data:merge-community` (bỏ qua `examples/`, trùng số hiệu TB-TCHQ thì không nhân bản, bảng quyết định verified vẫn phải soạn tay).
4. Commit **có ký DCO** (xem mục dưới): `git commit -s -m "data: thêm 12 tiền lệ chương 84"`
5. Mở Pull Request. CI sẽ tự kiểm lại.

**Mẫu tệp** — xem `data/community/examples/vi-du-tien-le.json`:

```json
{
  "kind": "precedent",
  "contributor": { "name": "Tên hoặc nick của bạn", "github": "username" },
  "license": "CC-BY-SA-4.0",
  "submittedAt": "2026-09-07",
  "records": [
    {
      "hsCode": "84137090",
      "description": "Máy bơm nước ly tâm dân dụng, công suất 1HP, đầu bơm bằng gang, điện 220V",
      "source": { "type": "TB-TCHQ", "reference": "1234/TB-TCHQ", "issuedDate": "2025-03-15" },
      "attributes": { "congSuat": "1HP", "chatLieu": "gang" },
      "girRule": "GIR 1",
      "reasonVi": "Bơm ly tâm dùng nước sạch, không phải bơm nhiên liệu (8413.30)",
      "confusedWith": ["84133090", "84134000"]
    }
  ]
}
```

Schema đầy đủ: [`schemas/community-contribution.schema.json`](schemas/community-contribution.schema.json)

**Trường `reasonVi` là phần quý nhất.** Mã HS thì tra được, nhưng *lý do* phân
loại như vậy — và vì sao **không** phải mã kia — mới là tri thức thật.

### C. Đóng góp code

Đọc [`CLAUDE.md`](CLAUDE.md) để nắm quy ước, đặc biệt **8 rule bất biến**. Chạy
`npm test` trước khi gửi PR — CI sẽ chặn nếu đỏ.

Vài điều dễ vấp:

- **Không tự gắn nhãn GIR ở đâu ngoài `lib/gir.js`.** Mọi trích dẫn phải có
  `basis` + `evidence`. Đây là bằng chứng pháp lý, không phải nhãn trang trí.
- **Test không được ghi vào `data/` thật.** Thêm `import './test-isolate-data.mjs'`
  ở dòng đầu tệp test.
- **Endpoint mới mặc định KÍN.** Muốn mở đọc công khai phải khai vào allowlist ở
  `lib/public-access.js` một cách có ý thức.

---

## Ký DCO — bắt buộc

Mỗi commit phải có dòng `Signed-off-by`. Thêm cờ `-s` là git tự chèn:

```bash
git commit -s -m "data: thêm tiền lệ chương 84"
```

Dòng đó nghĩa là bạn xác nhận [Developer Certificate of
Origin](https://developercertificate.org/): bạn có quyền đóng góp phần này, và
đồng ý phát hành nó theo giấy phép của dự án — **code MIT, dữ liệu CC BY-SA 4.0**.

Nếu quên ký: `git commit --amend -s` rồi force-push lên nhánh của bạn.

---

## Đóng góp của bạn được xử lý thế nào

1. **CI tự kiểm** — schema + bộ lọc riêng tư + toàn bộ test.
2. **Người review đọc** — kiểm nguồn có thật không, lý do có hợp lý không.
3. **Merge vào `data/community/`** — giữ nguyên tên bạn ở `contributor`.
4. **Định kỳ gộp vào kho chính** — vào `precedents.json`, `conflicts.json`,
   `conflict-tables.json`, và lên API công khai.

Bạn được ghi công ở `contributor` và trong `CONTRIBUTORS.md`.

**Dự án có quyền từ chối** dữ liệu không có nguồn kiểm chứng được, hoặc nghi ngờ
chứa thông tin của bên thứ ba. Đây là kho tri thức người ta dùng để khai hải quan
thật — nhận bừa là hại người dùng.

---

## Điều gì làm một đóng góp tốt

**Đóng góp tốt:**

> `hsCode: 39269099`, mô tả "Miếng đệm nhựa PVC dùng cho máy đóng gói, dày 3mm,
> không tự dính". Nguồn: TB-TCHQ 4567/TB-TCHQ. Lý do: là bộ phận không có công
> dụng riêng nên không vào chương 84; PVC dạng tấm đã gia công thành hình dạng
> cụ thể nên vào 3926 chứ không phải 3920. Hay nhầm với: 84439990, 39201090.

Có nguồn, có lý do, **có nói cả vì sao không phải mã kia**.

**Đóng góp yếu:**

> "Máy móc thì để 8479 là được"

Không nguồn, không lý do, không kiểm chứng được.

---

## Quy tắc ứng xử

Nói thẳng về kỹ thuật, tôn trọng về con người. Người mới hỏi câu cơ bản thì trả
lời tử tế — ai cũng từng không biết. Bất đồng về cách phân loại thì tranh luận
bằng chú giải, tiền lệ và văn bản, không bằng thâm niên.

---

## Cần giúp?

Mở [Issue](https://github.com/ozvietnam/hs-code-api/issues) hỏi. Không có câu hỏi
nào là ngớ ngẩn — phân loại HS vốn khó, đó chính là lý do dự án này tồn tại.
