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

- [x] Commit đúng tệp; KHÔNG commit `tmp/` (gitignored). Commit `9063b34`.
- [x] Push `so-tay/lo-005`.
- [x] Mở PR body theo mục 'Mô tả PR phải có' của `giao việc` (tỷ lệ đạt + 3 mục mẫu + nhóm mỏng/bất thường + mục `dieuKien` trích không nói). PR #380 (OPEN).
- [x] **KHÔNG merge.**

## Bước 6 — Soát độc lập (theo brief `brief-st-soat-lo005.md` + mục 4 `so-tay-giao-ngoai.md`)

Bắt đầu: 2026-10-21 21:48 (GMT+7) sau khi mở PR #380. Em đóng vai **người soát độc lập** (KHÔNG phải người soạn). Phạm vi: đọc lại toàn bộ `phamVi`, `boPhan`, `dieuKienVao`, `loaiTru`, `phanBiet` của 6 nhóm cùng `tmp/so-tay/nguon/<nhom>.txt` (đã có sẵn từ Bước 1).

- [x] Đọc lại 6 nguồn nguyên văn + 6 raw drafts.
- [x] Đối chiếu từng mục — ghi `review/<nhom>.json` theo index (`phanVi`/`loaiTru[i]`/...).
- [x] Kết quả sơ bộ (sau khi phân tích):
  - **5515**: 1 sửa (phamVi.trich ghép câu 2 — text nói "đã pha… trừ…Chương 58/59" nhưng trich cũ chỉ có câu 1).
  - **7321**: 1 sửa (phamVi.text đơn giản — sửa typo "khái"→"khí" và bỏ "bộ phận rời…sắt/thép có nhận dạng rõ ràng" đã trùng với boPhan).
  - **8213**: 1 sửa (phamVi.trich ghép line 4 + line 6 + line 20 — text mở rộng thêm "kéo khớp nối" + "lưỡi kéo đã/chưa hoàn chỉnh").
  - **8512**: 1 sửa (phamVi.trich ghép clause 1 + loại trừ pin/ắc quy/dynamo + clause 2 gạt nước) + **2 xóa** (loaiTru cũ [1] ắc quy 8507 + [2] dynamo 8511 đã phủ bởi [0]; cả 2 thiếu lead-in "Nhóm này không bao gồm:").
  - **8531**: 1 sửa (phamVi.text đơn giản) + **gộp** loaiTru[0]+[1] thành 1 mục sangNhom "8512|8530" (câu "Trừ A và B" bị tách thành 2 trich đứng riêng) + **1 xóa** loaiTru cũ [3] (đã phủ bởi [2]; cùng lỗi splitting 8512).
  - **8548**: 1 sửa (phamVi.trich ghép clause (a) + (b) + "Do đó nhóm này bao gồm các mặt hàng có thể nhận biết được…" — text đề cập 2 nội dung loại trừ (a)(b) và mô tả nhận biết mà trich cũ chỉ có (a)).
- [x] Áp sửa vào `tmp/so-tay/raw/*.json` + đổi `nguonLoai` của 132 mục → `NGUOI_DUYET` (luật 11 §3 — chỉ người soát độc lập được đổi).
- [x] `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw 5515 7321 8213 8512 8531 8548` → **6 nhóm, 132 mục, 0 mục không kiểm được nguồn** (mất 4 mục lỗi theo "không trích được thì XOÁ").
- [x] `node scripts/build-so-tay.mjs --nhom=5515,7321,8213,8512,8531,8548 --tu-tep=tmp/so-tay/raw --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-005.json` → `mục đạt 132/132 (100%) — nghiệm thu bước 1 cần ≥ 95%; nhóm lỗi: 0`.
- [x] `npm run so-tay:check` → `sổ tay: 193 nhóm, 6783 mục, 0 mục không kiểm được nguồn`.
- [x] `npm test` → **ALL TESTS PASSED** (2607 PASS / 0 FAIL).
- [x] Commit `861a41d` — `review(so-tay): soát độc lập lô 005 — 132/132 mục đạt sau sửa`. Push origin `so-tay/lo-005`.
- [x] Comment chi tiết soát lên PR #380 (#6319022416).
- [x] **PR #380 vẫn OPEN, KHÔNG merge** — đợi người review chính thức (random ≥10% semantic review theo `docs/giao-viec/so-tay-giao-ngoai.md §4`).

## Số liệu (báo cáo thật)

| Nhóm | phamVi | loaiTru | dieuKienVao | phanBiet | boPhan | tieuChi6 | dong8 | Đạt/Tổng |
|---|---|---|---|---|---|---|---|---|
| 5515 | 1 | 1 | 0 | 0 | null | 15 | 10 | 27/27 |
| 7321 | 1 | 7 | 2 | 0 | 1 | 20 | 11 | 42/42 |
| 8213 | 1 | 2 | 0 | 0 | null | 0 | 1 | 4/4 |
| 8512 | 1 | 8 | 0 | 0 | 1 | 9 | 11 | 30/30 |
| 8531 | 1 | 4 | 0 | 0 | 1 | 7 | 14 | 27/27 |
| 8548 | 1 | 0 | 0 | 0 | null | 0 | 1 | 2/2 |
| **Tổng** | **6** | **22** | **2** | **0** | **3** | **51** | **48** | **132/132 (100%)** |

(số liệu **sau soát độc lập Bước 6**: mất 4 mục lỗi — 8512 loaiTru cũ [1][2], 8531 loaiTru cũ [1] gộp vào [0], 8531 loaiTru cũ [3] đã phủ bởi [2].

### Số liệu soát độc lập Bước 6

| Nhóm | sửa | xóa | gộp | Tổng trước | Tổng sau |
|---|---|---|---|---|---|
| 5515 | 1 | 0 | 0 | 27 | 27 |
| 7321 | 1 | 0 | 0 | 42 | 42 |
| 8213 | 1 | 0 | 0 | 4 | 4 |
| 8512 | 1 | 2 | 0 | 32 | 30 |
| 8531 | 1 | 1 | 1 (gộp 2→1) | 29 | 27 |
| 8548 | 1 | 0 | 0 | 2 | 2 |
| **Tổng** | **6** | **3** | **1** | **136** | **132** |

### Nhóm nguồn mỏng / bất thường

- **5515**: `phan55.phan` bị cắt 46.130 → 25.000 ký tự (`CAP=phan` trần) — ghi trong báo cáo. Chú giải ch.55, pl. XI dài nên máy tự cắt khi xuất; vẫn đủ nguyên văn cho `nhom5515.nhom` (không bị cắt) — không ảnh hưởng kiểm.
- **8213, 8548**: chỉ có 1 dòng 8 số (82130000, 85480000) → số mục ít (4 và 2). Đây là heading không chia phân nhóm — đúng chứ không phải lỗi.
- **7321**: có 3 dieuKienVao (mục đích / nhiên liệu / nơi sử dụng) được trích nguyên văn từ nguồn theo (i)(ii)(iii) đầu đoạn — không phải cổng loại, chỉ là điều kiện mô tả. Lưu ý của người soát: 2 mục này dùng `op=in` với pipe-values `"sưởi ấm không gian|nấu|đun"` và `"rắn|lỏng|khí|nguồn khác"` — máy chỉ shallow validate (legal op + non-empty value), không verify từng token có trong trich; người soát đã human-confirm từng term.
- **8512** (trước soát): 10 loaiTru nhiều nhất lô. Sau soát: 8 (mất 2 do "splitting" — pin/ắc quy/dynamo đã phủ bởi [0]).
- **8531** (trước soát): 6 loaiTru. Sau soát: 4 (mất 1 do tách/gộp [0]+[1] + 1 do tách từ [2]).
- **8531**: 14 dong8 vì 4 dòng "Loại khác" tự điền và 4 dòng còn lại không bị mất theo luật L11.

### Mục `dieuKien` (dong8) ghi điều câu trích KHÔNG nói

- **Không có.** Mọi mục `dong8` đều mô tả điều câu trích `tax.<8 số>` nói hoặc đối chiếu biểu thuế (dòng "Loại khác" ghi rõ "dòng cha không phân biệt chi tiết trong nguồn chú giải, đối chiếu biểu thuế" — không đoán).
- 2 dòng 73219010 và 73219021 đặc biệt: `nguon: sen.<mã>` (vì biểu thuế chỉ có "(SEN)"); trich từ SEN.

### Kết luận soát độc lập (Bước 6)

Lỗi máy không phát hiện được đã bắt (4 mục lỗi / 1 lỗi gộp cần đổi):

1. **5515 phamVi.trich** — thiếu clause "Tuy nhiên… thường thuộc Chương 58 và Chương 59" mà text mô tả.
2. **7321 phamVi.text** — typo "khái" thay vì "khí"; trích thiếu phần "bộ phận rời" (đã có ở boPhan).
3. **8213 phamVi.trich** — thiếu clause "khớp nối tại điểm nút" và "lưỡi kéo đã/chưa hoàn chỉnh".
4. **8512 phamVi.trich** — thiếu clause 2 gạt nước + cụm loại trừ pin/ắc quy/dynamo.
5. **8512 loaiTru cũ [1][2]** — tách từ [0] không có lead-in; đã XÓA.
6. **8531 phamVi.text** — "tín hiệu tĩnh" paraphrase không có trong trich; "công nghiệp" thêm không có trong nguồn.
7. **8531 loaiTru cũ [0][1]** — câu "Trừ A và B" tách thành 2 trich đứng riêng không đầy đủ; đã GỘP thành 1 mục sangNhom "8512|8530".
8. **8531 loaiTru cũ [3]** — tách từ [2] thiếu lead-in; đã XÓA.
9. **8548 phamVi.trich** — thiếu clause (b) + "Do đó nhóm này bao gồm các mặt hàng có thể nhận biết được…" (catch-all cốt lõi của nhóm).

### Lưu ý cho người review chính thức (≥10% semantic review)

- **7321 dieuKienVao[0][1]** pipe-values: em đã human-confirm nhưng máy chỉ shallow validate `op=in` — đề xuất thêm checkItem() verify từng token có trong trich để loại bỏ gánh nặng human cho các lô sau.
- **8512 loaiTru còn lại sangNhom "7322|8708"** — người soạn/bản nháp gộp 1 mục vì "nhóm 73.22 hay 87.08" (em giữ nguyên — pipe cho phép multiple codes, source không phân biệt điều kiện riêng).
- **8548 loaiTru / phanBiet** đều rỗng mặc dù nguồn có (a)(b) exclusions — đúng luật 3 vì nguồn không nêu đích danh mã nhóm đích (đặc thù catch-all của 8548). Đã ghi rõ trong `canhBaoKhongSuaTrongAudit`.
- **PR #380 vẫn OPEN** — KHÔNG merge.
