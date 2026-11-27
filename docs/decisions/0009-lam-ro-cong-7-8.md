# ADR-0009: Làm rõ cổng 7 PHỦ và cổng 8 CHỒNG — bù theo cấu trúc, trục đa trị, chồng số máy chứng minh

- Ngày: 27/11/2026 · Trạng thái: chấp nhận (QT quyết kỹ thuật theo uỷ quyền CEO; từ soát hai lớp PR #2424 và bảng vàng 30.04)
- Bổ sung cho: ADR-0007 mục 4, ADR-0008 mục 5. Không đổi mục tiêu, khuôn chính, thước dừng.

## Bối cảnh
- Bảng vàng 30.04 (#2421): thuốc chứa nhiều hoạt chất — trục "hoạt chất" một món nhận nhiều giá trị cùng lúc, nên "cùng trục, tập khác nhau" không chứng minh được rời nhau.
- Soát lớp hai PR 1 M-81 (#2424): hàm xét "hai điều kiện là phần bù của nhau" có nhánh so chữ trích (cùng câu nguồn, trích bên này là chuỗi con bên kia). Ca phản chứng: A "plastic", B KHÔNG "plastic gia cố" bị coi là bù, trong khi "plastic không gia cố" thoả cả hai. Đó là so giống/khác từng từ — cấm theo ADR-0005.
- Cổng 8 chặn ca hai anh em mỗi bên đúng một điều kiện số cùng đại lượng có khoảng giao nhau; bảng anh em lại không gắn cờ cho ca này → cờ bảng khác cổng.

## Quyết định
1. **Bù (phần bù của nhau) chỉ xét theo cấu trúc**, không theo chữ: cùng `kieu`, cùng `truc` (GIA_TRI) / cùng `nguong` (SO) / cùng `cauHoi` (CO_KHONG), tập hoặc khoảng bằng nhau, và `phu` ngược nhau. Không có nhánh nào so chuỗi con của `trich`.
2. **Trục đa trị:** ô `daTri: true` (chỉ với `kieu=GIA_TRI`) đánh dấu trục mà một món có thể mang nhiều giá trị (hoạt chất, công dụng, thành phần sợi trước khi áp quy tắc chiếm trội). Trên trục đa trị, khác tập **không** chứng minh rời nhau → `CHUA_CHUNG_MINH_TACH`, trừ khi có `GIAI_CHONG` trích luật (ví dụ Quy tắc 3(a), chú giải phân nhóm 2(A) Phần XI). Mặc định `daTri: false`.
3. **Chồng số máy chứng minh được = `VUNG_CHONG` (chặn):** hai anh em mỗi bên đúng một điều kiện `SO` không `phu`, cùng đại lượng, khoảng giao nhau → mọi giá trị trong phần giao thoả cả hai; không cần phiếu LLM. Chặn cho tới khi có `GIAI_CHONG` trích luật hoặc người làm nghề duyệt. Bảng anh em và cổng 8 phải gắn cùng một cờ cho ca này.
4. Cổng 4 (trích nguyên văn) và cổng 5 (vân tay) chạy cho **mọi** bản ghi, kể cả `DIEU_KIEN`, `GIAI_CHONG`, `CANH_TRANH`.
5. **Đóng miền và xét rời nhau trục đơn trị bằng `tapDu`:** trục `GIA_TRI` đơn trị (`!daTri`) mà các anh em phủ kín nhưng không lấy từ `tap` của nút cha thì khai tường minh `tapDu` (mảng đầy đủ các giá trị của `truc`, khai một lần ở điều kiện nút cha hoặc giống nhau trên mọi anh em cùng trục, có `trich`). Cổng 7 chỉ so tập hợp (`∪ tap = tapDu`), không đoán phần bù từ chữ trong `tap` (thiếu `tapDu` → `HO_PHU`). Cổng 8 chỉ coi hai anh em `GIA_TRI` dương là rời nhau khi `!daTri` **và** trục có `tapDu` hợp lệ; thiếu `tapDu` → `CHUA_CHUNG_MINH_TACH` (xếp cảnh báo cặp cùng trục lên đầu, in đầy đủ không cắt dòng).

## Hệ quả
- PR 1 M-81 sửa theo bốn điểm trên trước khi gộp, kèm ca test âm cho điểm 1 và ca test trục đa trị.
- Skill `doc-tron-nhom` ghi điểm 1–3, 5 làm luật soạn.
