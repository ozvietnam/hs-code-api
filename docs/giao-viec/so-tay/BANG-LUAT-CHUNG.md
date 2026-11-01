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
