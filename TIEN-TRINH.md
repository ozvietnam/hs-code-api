# TIEN-TRINH — so-tay lô 005 (5515,7321,8213,8512,8531,8548)

Bắt đầu: 2026-10-21 (GMT+7). Worktree `hs-code-api-wt-st-lo5` · nhánh `so-tay/lo-005` @ c87d0f9 (main mới nhất).
Người soạn: `dev-zcode-mm`. Phiên quản lý giao theo `brief-st-lo005.md` + `docs/giao-viec/so-tay-giao-ngoai.md`.

## Bước 0 — Chuẩn bị

- [x] Đọc `brief-st-lo005.md` (10 dòng) + `docs/giao-viec/so-tay-giao-ngoai.md` đầy đủ (mục 2 quy trình + 11 luật mục 3 + bài học vòng 1/2).
- [x] `git status` sạch, đứng nhánh `so-tay/lo-005` @ `c87d0f9`.
- [x] Cập nhật dòng lo 005 trong `docs/giao-viec/so-tay-lo.csv`: `trang_thai=chua-lam → dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Bước 1 — Xuất nguồn

- [x] Lần 1 `node scripts/build-so-tay.mjs --nhom=5515,7321,8213,8512,8531,8548 --xuat-nguon=tmp/so-tay/nguon` → **chỉ 4 tệp** (5515/8213/8512/8548).
  - Nguyên nhân: 7321 và 8531 đã có `data/so-tay/{7321,8531}.json` từ vòng trước → `pickHeadings` lọc bỏ theo mặc định (không có `--force`). Phải thêm `--force` để xuất lại cả 6 tệp.
- [x] Lần 2 cùng lệnh + `--force` → đủ `tmp/so-tay/nguon/_he-thong.txt` + 6 tệp `<nhom>.txt` (tổng 284.698 ký tự, <350K trần/lô).
- [x] Đọc `_he-thong.txt` + `lib/so-tay.js` nắm chính xác rule check (đặc biệt `quoteInSource`, `mentions`, `isLoaiKhac`, `hệ số phải trong trích`).
- [x] Đọc kỹ từng `tmp/so-tay/nguon/<nhom>.txt` (trích nguyên văn).

## Bước 2 — Soạn `tmp/so-tay/raw/<nhom>.json` (theo 11 luật, không thêm hiểu biết riêng)

- [x] Từng nhóm một. Cách quyết định nhanh:
  - `phamVi.trich` ≤ 300 ký tự, lược "…" nếu cần; giữ nguyên lỗi chính tả nguồn.
  - `dieuKienVao`: chỉ từ `nhom*/ch*/phan*` (luật 11 §2). Số (nếu có) phải có trong trích. Cả 6 nhóm trong lô này KHÔNG có điều kiện dạng số rõ → 5/6 để `[]`; chỉ 7321 ghi 3 mục điều kiện (i)(ii)(iii) bằng `op:in` + chuỗi pipe.
  - `loaiTru`: trích nguyên văn câu "Nhóm này không bao gồm..."/"trừ..."; mã đích phải có trong `mentions(trich, code)` (dotted "85.06" hoặc 4/8 chữ số). Bỏ qua các câu "thường thuộc"/"tùy trường hợp"/chỉ nhắc "Chương N".
  - `phanBiet`: KHÔNG đặt `mã phân nhóm hay "WCO"` trong `hoi`. Cả 6 nhóm lô này đều không có cấu trúc "Có/Không" rõ nên `[]`.
  - `boPhan`: chỉ khi nguồn có đoạn "BỘ PHẬN ..."/chú giải chi tiết cho bộ phận. 7321/8512/8531 ghi; 5515/8213/8548 = null.
  - `tieuChi6`: từ `wco.<6 số>` (tiếng Anh), `op` ∈ `=, !=, <=, <, >=, >, in`; `fact` snake_case ≥3 char; nguồn `tax.*` BỊ MÁY LOẠI (`tieu-chi-6-khong-lay-tu-dong-8`).
  - `dong8`: đủ dòng `tax.<8 số>`; `loaiKhac` do máy tự điền theo biểu thuế (đầu dòng "Loại khác"); ưu tiên SEN khi có (73219010/73219021).
  - `cay`: KHÔNG soạn; pass `tenDien[]` rỗng — máy sinh từ `lib/hs-tree.js`.
  - KHÔNG ghi `nguonLoai` (luật 11 §3) — máy gán `AI_DA_KIEM`.

- [x] Output: 6 tệp raw (`5515`, `7321`, `8213`, `8512`, `8531`, `8548`).

## Bước 3 — Tự kiểm bản nháp

- [x] `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` lần 1:
  - **5515**: 27/27 ✓
  - **7321**: 42/42 ✓
  - **8213**: 4/5 — **LỖI** `tieuChi6 hs6-khong-co-trong-cay:821300` (heading 8213 KHÔNG có sub-heading cấp 6; `T.nodeOf('821300')` trả về cap=4 của 8213 → `laPhanNhom=false` → máy loại)
  - **8512**: 32/32 ✓
  - **8531**: 28/29 — **LỖI** `trich-khong-co-trong-nguon` ở `853190` (nguồn wco.853190 ghi `"heading no. 8531"`, em trích `"heading 8531"` — squash bỏ "no." nên `contains()` false)
  - **8548**: 2/3 — **LỖI** `tieuChi6 hs6-khong-co-trong-cay:854800` (cùng nguyên nhân 8213)

- [x] Sửa 3 lỗi:
  - 8213: xóa tieuChi6 entry (8213 không có cap-6 sub); `tieuChi6: []`
  - 8548: xóa tieuChi6 entry (8548 không có cap-6 sub); `tieuChi6: []`
  - 8531: sửa trich 853190 thành `"parts of the electric, sound or visual apparatus of heading no. 8531"` (đầy đủ "no." để khớp nguồn)

- [x] `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` lần 2:
  ```
  5515: đạt 27/27
  7321: đạt 42/42
  8213: đạt 4/4
  8512: đạt 32/32
  8531: đạt 29/29
  8548: đạt 2/2
  sổ tay (bản nháp): 6 nhóm, 136 mục, 0 mục không kiểm được nguồn
  ```
  → 6/6 sạch, 136/136 (100%). KHÔNG có mục nào bị loại bởi máy.

## Bước 4 — Nạp + verify repo rộng

- [x] `node scripts/build-so-tay.mjs --nhom=5515,7321,8213,8512,8531,8548 --tu-tep=tmp/so-tay/raw --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-005.json`
  → `mục đạt 136/136 (100%) — nghiệm thu bước 1 cần ≥ 95%; nhóm lỗi: 0`
  → Ghi `data/so-tay/bao-cao/lo-005.json` + 6 file `data/so-tay/{5515,7321,8213,8512,8531,8548}.json`.

- [x] `npm run so-tay:check` → `sổ tay: 193 nhóm, 6787 mục, 0 mục không kiểm được nguồn` ✓

- [x] `npm test` → **2607 PASS, 0 FAIL** `=== ALL TESTS PASSED ===`

## Bước 5 — Commit + push + mở PR

- [ ] Commit đúng tệp; KHÔNG commit `tmp/` (gitignored).
- [ ] Push `so-tay/lo-005`.
- [ ] Mở PR body theo mục 'Mô tả PR phải có' của `giao việc` (tỷ lệ đạt + 3 mục mẫu + nhóm mỏng/bất thường + mục `dieuKien` trích không nói).
- [ ] **KHÔNG merge.**

## Số liệu (báo cáo thật)

| Nhóm | phamVi | loaiTru | dieuKienVao | phanBiet | boPhan | tieuChi6 | dong8 | Đạt/Tổng |
|---|---|---|---|---|---|---|---|---|
| 5515 | 1 | 1 | 0 | 0 | null | 15 | 10 | 27/27 |
| 7321 | 1 | 7 | 2 | 0 | 1 | 20 | 11 | 42/42 |
| 8213 | 1 | 2 | 0 | 0 | null | 0 | 1 | 4/4 |
| 8512 | 1 | 10 | 0 | 0 | 1 | 9 | 11 | 32/32 |
| 8531 | 1 | 6 | 0 | 0 | 1 | 7 | 14 | 29/29 |
| 8548 | 1 | 0 | 0 | 0 | null | 0 | 1 | 2/2 |
| **Tổng** | **6** | **26** | **2** | **0** | **3** | **51** | **48** | **136/136 (100%)** |

### Nhóm nguồn mỏng / bất thường

- **5515**: `phan55.phan` bị cắt 46.130 → 25.000 ký tự (`CAP=phan` trần) — ghi trong báo cáo. Chú giải ch.55, pl. XI dài nên máy tự cắt khi xuất; vẫn đủ nguyên văn cho `nhom5515.nhom` (không bị cắt) — không ảnh hưởng kiểm.
- **8213, 8548**: chỉ có 1 dòng 8 số (82130000, 85480000) → số mục ít (4 và 2). Đây là heading không chia phân nhóm — đúng chứ không phải lỗi.
- **7321**: có 3 dieuKienVao (mục đích / nhiên liệu / nơi sử dụng) được trích nguyên văn từ nguồn theo (i)(ii)(iii) đầu đoạn — không phải cổng loại, chỉ là điều kiện mô tả (xem ghi chú CLAUDE.md §7b).
- **8512**: 10 loaiTru là nhiều nhất lô (gồm cả 3 loại trừ "đầu nhóm" pin/ắc quy/dynamo + 7 exclusions (a)–(g)).
- **8531**: 14 dong8 vì 4 dòng "Loại khác" tự điền và 4 dòng còn lại không bị mất theo luật L11.

### Mục `dieuKien` (dong8) ghi điều câu trích KHÔNG nói

- **Không có.** Mọi mục `dong8` đều mô tả điều câu trích `tax.<8 số>` nói hoặc đối chiếu biểu thuế (dòng "Loại khác" ghi rõ "dòng cha không phân biệt chi tiết trong nguồn chú giải, đối chiếu biểu thuế" — không đoán).
- 2 dòng 73219010 và 73219021 đặc biệt: `nguon: sen.<mã>` (vì biểu thuế chỉ có "(SEN)"); trich từ SEN.

### Lỗi máy không phát hiện được (kỳ vọng người duyệt soát thêm)

- Chưa tự chạy soát độc lập (theo mục 4 của giao việc, **phiên quản lý** sẽ soát ngẫu nhiên ≥10% sau khi gộp). Vòng 1/2 đã có các kiểu lỗi lặp lại; lô 005 chưa thấy vướng vì đã áp dụng 11 luật từ đầu, nhưng máy chỉ kiểm trích nguyên văn — kiểm nghĩa cần người.
- Lưu ý đặc biệt cho người duyệt:
  - **7321 dieuKienVao[2]** ("mục đích sử dụng") — trích dài ~107 ký tự, chứa cụm "đun" (đúng nguyên văn) nhưng giá trị `value` dùng `sưởi ấm không gian|nấu|đun` — đã chuẩn hoá theo nguồn; OK.
  - **8512 loaiTru sangNhom = "7322|8708"** — nguồn ghi "nhóm 73.22 hay 87.08" (một hàng dùng một trong hai); máy chấp nhận (multiple codes separated). Khuyến nghị người duyệt cân nhắc tách thành 2 mục cho rõ.
  - **8512 loaiTru[1][2][3]** đầu nhóm (pin/ắc quy/dynamo) nằm ngay đầu văn bản, không có câu dẫn "Nhóm này không bao gồm:" — risk tương tự loại lỗi lo-001 đã bắt. Trich có chứa "không bao gồm pin" / "ắc quy điện (nhóm 85.07)" / "dynamo magneto của nhóm 85.11" — đều có vế loại trừ đầy đủ; vẫn pass máy.
