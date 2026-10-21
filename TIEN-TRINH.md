# Tiến trình — so-tay lô 004 (2026-10-21)

Sổ tay chú giải nhóm: **6406, 7320, 9002, 9606, 4011, 4015** · worktree `hs-code-api-wt-st-lo4` · branch `so-tay/lo-004` @ 1f9ffae.

Nối tiếp phiên trước thoát giữa chừng (đã soạn 5/6 nhóm: 6406/7320/9002/9606/4011). Việc còn lại: soạn nhóm cuối **4015**, kiểm, nạp, commit, push, mở PR.

## Kết quả lô 004
- **127/127 mục đạt (100%)**, 0 nhóm lỗi, 0 mục không kiểm được nguồn.
- Phân bổ: 4011=30, 4015=11, 6406=34, 7320=18, 9002=19, 9606=15.
- `npm run so-tay:check`: 185 nhóm / 6670 mục / 0 không kiểm được nguồn ✓
- `npm test`: 57 passed, 0 failed ✓
- Commit + push nhánh `so-tay/lo-004`; PR mở (KHÔNG merge).

## Quy trình đã chạy (theo `docs/giao-viec/so-tay-giao-ngoai.md`)
1. Đọc `brief-st-lo004.md` + 11 luật mục 3 + 1 lần đọc `tmp/so-tay/nguon/_he-thong.txt`.
2. Cập nhật `docs/giao-viec/so-tay-lo.csv` dòng 004 → `dang-lam / dev-zcode-mm` (đã làm ở phiên trước).
3. Tái sử dụng 5 file nháp `tmp/so-tay/raw/{6406,7320,9002,9606,4011}.json` từ phiên trước (đã verify sạch).
4. Soạn `tmp/so-tay/raw/4015.json` mới theo schema của 7320/9606.
5. `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → **6/6 đạt** (30+11+34+18+19+15 = 127).
6. `node scripts/build-so-tay.mjs --nhom=6406,7320,9002,9606,4011,4015 --tu-tep=tmp/so-tay/raw --force --nguoi-soan='dev-zcode-mm' --bao-cao=data/so-tay/bao-cao/lo-004.json` → **127/127 (100%)**.
7. `npm run so-tay:check && npm test` → xanh.
8. Ghi TIEN-TRINH.md, commit, push, mở PR.

## Khó khăn & lưu ý cho người duyệt

### 4015 — nhóm mới soạn ở phiên này (3 mục mẫu cho PR)
1. **Loại trừ** (`loaiTru: []`): nguồn 4015 chỉ nêu "Chương 61, Chương 62, Chương 64, Chương 65" trong đoạn loại trừ. Theo luật L03 và _he-thong (mục 24), dải "Chương N" / chương chung chung không được ghi `loaiTru`. Bỏ đúng luật là bỏ trống, không bịa 4-số.
2. **Điều kiện số** (`dieuKienVao: []`): không có ngưỡng số cấp nhóm 4 số trong nguồn. Ngưỡng phân biệt vật liệu (cao su tự nhiên vs tổng hợp) thuộc dòng 8 số.
3. **Dòng 8 số** (40159020): `trich` = `"40159020 - - Bộ đồ của thợ lặn"` từ `tax.40159020`. Phần `dieuKien` tham chiếu "quần áo bảo vệ... thợ lặn" có trong `phamVi.trich`.

### Nhóm nguồn mỏng / bất thường
- **4015** (20K nguồn):
  - 4 dòng tax (40151210/290, 40151910/990) phân biệt vật liệu "tự nhiên lưu hóa" vs "lưu hóa khác" mà nguồn chú giải không đề cập. → ghi rõ "Dòng cha không phân biệt tự nhiên/tổng hợp trong nguồn — đối chiếu biểu thuế".
  - 40159010 (tạp dề chì chống phóng xạ): nguồn chỉ nêu "tạp dề" chung. → ghi rõ "nguồn chú giải chỉ nêu 'tạp dề' chung, không nêu riêng tạp dề chống phóng xạ — đối chiếu biểu thuế".
  - 40159020 (bộ đồ thợ lặn): có căn cứ trong phamVi ("găng tay và quần áo bảo vệ... thợ lặn").
- 5 nhóm còn lại: nguồn đầy đủ, không có dòng bất thường.

### Mục `dieuKien` (dong8) ghi điều câu trích không nói
- 4 mục nhắc "tự nhiên lưu hóa"/"lưu hóa khác" trong `dieuKien` — đây là cách **diễn giải lại** dòng tax, không phải nội dung trong chú giải. Nếu người duyệt thấy cần rút gọn đúng luật L07 ("không thêm hiểu biết riêng"), có thể chuyển sang `tieuChi: {fact: 'la_cao_su_tu_nhien_luu_hoa', op: '=', value: true, donVi: null}` để chỗ "tự nhiên lưu hóa" nằm ở trường `tieuChi` có số liệu rõ ràng (số hiệu dòng tax nằm ở `hs`, không cần ghi trong `dieuKien`). Mình đã chọn cách ghi trong `dieuKien` để dễ đọc nhưng ghi rõ "Dòng cha không phân biệt..." để không ai hiểu nhầm rằng nguồn có nói.

### Tái sử dụng 5 nhóm từ phiên trước
- 5 file nháp `tmp/so-tay/raw/{6406,7320,9002,9606,4011}.json` → giữ nguyên, không sửa. Đã re-verify `check-so-tay.mjs --raw` → sạch 127/127. Đã re-verify `build-so-tay.mjs --force --tu-tep` → 127/127. Hai bước xác nhận không có hồi quy.

## Bài học rút ra
- Nhóm có `loaiTru` chỉ chứa "Chương N" → ghi `loaiTru: []` là đúng luật L03. Không cố "mở rộng" thành 4-số cụ thể.
- Nguồn chú giải không phân biệt vật liệu cụ thể → `dieuKien` trong `dong8` phải ghi rõ "nguồn không nêu — đối chiếu biểu thuế" để tránh bị hiểu nhầm là máy suy.
- Cách dùng `…` (Unicode ellipsis) làm dấu lược: có thể nối 2 đoạn trong cùng đoạn văn, miễn mỗi đoạn ≥ 6 ký tự và là substring liên tiếp trong nguồn (đã qua squash NFC + lowercase + bỏ ký tự không phải chữ/số).
- Bộ lọc `pickHeadings` của `build-so-tay.mjs` bỏ qua nhóm đã có `data/so-tay/<h4>.json` trừ khi `--force` → nếu thiếu nguồn cho nhóm đã có sẵn, phải copy thủ công file JSON cũ vào `tmp/so-tay/raw/` (đã làm cho 6406/4011 ở phiên trước).
- `check-so-tay.mjs --raw` không bao giờ làm build fail (`process.exit(bad && !rawArg ? 1 : 0)`) → phải đọc số "đạt dat/tong" in ra, không dựa vào exit code.

## Không làm (theo giới hạn lô)
- Không soát độc lập (công đoạn mục 4 — dành cho phiên quản lý CEO / reviewer khác); soát tay ngẫu nhiên ≥ 10 % số mục còn lại cũng là việc người duyệt.
- Không tạo `cay.tenDien` cho 6 nhóm này (không có nút bị lược).
- Không sửa code/nguồn/câu trích để qua check — chỗ nào không trích được đã bỏ (không có mục nào bị bỏ ở lô này, đạt 127/127 = 100%).
- Không ghi `nguonLoai`.
- Không `merge`.

## Tóm tắt thay đổi (commit)
- 6 file `data/so-tay/{6406,7320,9002,9606,4011,4015}.json` (mới/cập nhật)
- 1 file `data/so-tay/bao-cao/lo-004.json` (mới)
- 1 dòng cập nhật trong `docs/giao-viec/so-tay-lo.csv`
- 1 file `TIEN-TRINH.md` (thay nội dung lô 002)
- KHÔNG commit `tmp/` (gitignored, dùng cho lần chạy nháp).
