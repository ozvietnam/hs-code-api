# Bảng soát L1-4c — người soát ĐỘC LẬP một bản nháp ranh giới 6→8 số

> #577. Người soát là một phiên Claude KHÁC phiên soạn (định danh `<định danh>#soat-<nhãn>`). Bảng này tổng hợp cách làm của
> đợt 1 (#616) và đợt 2 (#659), thêm cổng 5 (vế bổ nghĩa). Luật đầy đủ: [`LUAT-CHUNG.md`](LUAT-CHUNG.md); quy trình người soạn:
> [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md).

## 0. Trước khi đọc

- [ ] Không đọc `data/bench/*`, `data/oz-export/*`.
- [ ] Tự lấy danh sách bản cần soát bằng `node scripts/so-hoa-ranh-gioi.mjs --kiem --pn6=<pn6>` (mã thoát 0 = xanh) — không tin danh
      sách của người soạn.
- [ ] Không dựa vào câu trích của bản nháp: đối chiếu với chữ biểu nguyên văn (`--ve --pn6=<pn6>` in VI + EN của từng mục; gốc ở
      `data/bieu-thue/<ngày>/` bieu-chinh + tieu-de, kể cả tầng không mã).

## 1. Cổng máy (đọc kết quả, không chạy lại trong đầu)

- [ ] Cổng 0–3 xanh; mọi cảnh báo `cong3-bien-khong-doc-duoc` đã đối chiếu biên ≤/< bằng tay.
- [ ] Cổng 5 xanh (`--ve`): mọi vế GIỚI HẠN / MỞ là "phủ", "lặp chữ tổ tiên", "mở — danh sách trước không bị liệt kê đóng" hoặc
      "MIỄN (BO_VE)".
- [ ] Mỗi cảnh báo `cong5-bo-ve:<mã>:<vế>`: đọc `lyDo`. Bỏ vế có làm đổi mã 8 số không? Có (và không có quy ước đã đúc) ⇒ trả về —
      đáng lẽ phải DỪNG / `THIEU_KHOA_TU_VUNG`.
- [ ] Mỗi cảnh báo `cong5-de-trong-chua-xu-ly:<mã>`: soát RIÊNG mục đó trước tiên (đợt 2: 4/6 lỗi nằm đúng chỗ người soạn ghi
      `DE_TRONG` / "người soát xem"). Đúng ⇒ ghi kết luận khi duyệt: `--giai-quyet=<mã>:<kết luận>` (một lần cho mỗi mục; kết luận
      "người soát xem" / rỗng không được nhận). Sai ⇒ trả về.

- [ ] Mỗi cảnh báo `cong2-ten-anh-em-roi:<A>+<B>` (luật tên nguyên văn của anh em, QUY-TRINH mục 4 bước 7): kiểm giá trị `tenLoai`
      / `dungCho` của mẫu "X và (các) bộ phận của chúng" đúng là tên ĐẦU nguyên văn của chính dòng mình (không lấy chữ của anh em,
      không thêm chữ), và hai tên không chứa nhau. Sai ⇒ trả về.

## 2. Phạm vi vế — máy chỉ là bộ tách theo dấu hiệu, người soát vẫn đọc

Với TỪNG dòng có tên và TỪNG tiêu đề có tên, đặt điều kiện cạnh chữ biểu và hỏi ba câu:

- [ ] **Hẹp hơn chữ?** Có vế mở ("… và các loại tương tự", "và bộ phận của chúng", "và các thiết bị tương tự") mà điều kiện liệt
      kê đóng không? Có vế "kéo bằng tay" / định ngữ chỉ của MỘT danh từ đầu mà điều kiện gắn cho tất cả không (đọc chữ Anh)?
- [ ] **Rộng hơn chữ?** Có vế giới hạn ("không nhấp nháy", "có thể thao tác hoặc tương tác …", "dùng cho …", "bằng …", biên số,
      "(trừ …)") bị bỏ không? Có định ngữ CHUNG ("cho dây dẫn và cáp", "cáp điện thoại" — chữ Anh "for wires and cables",
      "Telephone patch panels") bị tách khỏi một danh từ đầu không?
- [ ] **Máy tách sai?** Bộ tách có cắt nhầm một cụm danh từ ("chân không", "lốp không săm", "xe có động cơ") thành vế không? Có thì
      ghi vào PR soát để Claude chỉnh `lib/ho-so/tach-ve.js` — không bắt người soạn ép điều kiện.

Mỗi lỗi ghi `<tệp>:<mục>` + **THU HẸP / SUY RỘNG** + chữ nguyên văn (VI, và EN khi chữ Việt hiểu được nhiều cách) + hệ quả mức thuế
(dòng nào lấn dòng nào, chênh MFN).

## 3. Tiền lệ + bảng hiệu chỉnh

- [ ] Tra `data/precedents.json` theo khoá, theo `outcome` và theo chuỗi mã nhắc trong nội dung; đối chiếu
      `data/ho-so/hieu-chinh-tien-le.json`. Tiền lệ nằm trong vế của một dòng khác mà chưa có mục bảng ⇒ ghi để L1-4b xử lý.

## 4. Bản của thợ rẻ (soạn ngoài Claude) — kiểm thêm

- [ ] Câu trích đúng nguyên văn, điều kiện không bịa (mỗi giá trị nằm trong chữ của chính mục).
- [ ] Không có `BO_VE` dùng để "cho máy xanh" ở vế làm đổi mã.

## 5. Kết luận

- Đạt ⇒ `node scripts/so-hoa-ranh-gioi.mjs --duyet --pn6=<pn6> --phien=<định danh>#soat-<nhãn> --ghi-chu="…" [--giai-quyet=<mã>:<kết luận> …]`
  rồi `--ap-dung --pn6=<pn6>`.
- Không đạt ⇒ `--tra-ve --pn6=<pn6> --phien=… --ly-do="(A) <tệp>:<mục> THU HẸP/SUY RỘNG: … (B) …"` + mở issue sửa cho PN6.
- PR soát ghi: tỉ lệ sai theo mục / theo dòng 8 số bị ảnh hưởng / theo phân nhóm; số vế máy báo và số người soát xác nhận đúng
  (đo tỉ lệ báo oan của cổng 5); rút mẫu cho CEO soát xác suất như đợt 1–2.
