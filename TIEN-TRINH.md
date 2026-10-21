# Tiến trình — so-tay lô 003 (2026-10-21)

Sổ tay chú giải nhóm: **3406, 3918, 7019, 8308, 4818, 6006** · worktree `hs-code-api-wt-st-lo3`
· nhánh `so-tay/lo-003` @ 1f9ffae (main mới nhất) · deps đã cài.

Theo `brief-st-lo003.md` + 11 luật của [`docs/giao-viec/so-tay-giao-ngoai.md`](docs/giao-viec/so-tay-giao-ngoai.md) mục 3.

## Sai lệch brief đã xử lý

Brief dòng 6 ghi lệnh `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(đối chiếu `so-tay-lo.csv` dòng `001`). Dòng 4 của brief và CSV dòng `003` đều ghi
`3406 3918 7019 8308 4818 6006`. Em theo CSV (nguồn chuẩn), bỏ lệnh copy-paste sót.

## 11 luật mục 3 (ràng buộc cứng — không trích được nguyên văn thì XOÁ mục)

- L01. Nguồn `nhom*/ch*/phan*/sen.*/tax.*/wco.*`.
- L02. `trich` nguyên văn, lược "…", giữ lỗi chính tả.
- L03. `loaiTru` nêu đích danh + số nhóm có trong câu trích.
- L04. `phanBiet`: mã ngoài nhóm có trong câu trích.
- L05. `dieuKienVao` số: số có trong trích.
- L06. `dong8`: đủ mọi dòng `tax.*`, `loaiKhac` máy tự điền.
- L07. Không ghép 2 câu xa; không thêm hiểu biết riêng.
- L08. Không sửa mã/nguồn/trích để qua máy. Không trích được → XOÁ.
- L09. `cay` máy sinh — KHÔNG soạn.
- L10. `tieuChi6[]` từ chú giải/SEN/wco (KHÔNG `tax.*`).
- L11. KHÔNG ghi `nguonLoai` — máy gán `AI_DA_KIEM`.

---

## Bước 1 — Xuất nguồn ✅

```bash
node scripts/build-so-tay.mjs --nhom=3406,3918,7019,8308,4818,6006 --xuat-nguon=tmp/so-tay/nguon
```

→ `sổ tay: 4 nhóm cần dựng`. Chỉ xuất 4 tệp nguồn: `3406.txt` (12.4 KB), `3918.txt` (53.9 KB),
`4818.txt` (41.1 KB), `8308.txt` (20.1 KB) + `_he-thong.txt`. **7019 và 6006 đã có `data/so-tay/*.json`
từ lô trước nên không xuất nguồn** — em copy nguyên tệp vào `tmp/so-tay/raw/` làm bản nháp (y như lô 002).
Tổng nguồn lô: 133.427 ký tự.

## Bước 2 — Đọc `_he-thong.txt` ✅

Lược đồ + 11 luật + 13 bài học bước 1 (đọc trước khi soạn).

## Bước 3 — Đọc HẾT 4 tệp nguồn ✅

Đọc trọn cả 4 tệp (không skip đoạn chú giải Chương/Phần). Xem thêm `lib/so-tay.js` (luật máy kiểm)
và 2 tệp JSON của lô trước để bám đúng lược đồ thực tế.

## Bước 4 — Soạn `tmp/so-tay/raw/<nhom>.json` ✅

- **3406, 3918, 4818, 8308**: soạn mới từ nguồn — lần lượt **8, 22, 21, 17** mục.
- **6006, 7019**: copy nguyên từ `data/so-tay/` (64 + 76 = 140 mục), nội dung không sửa.

Xem cây HS (4 nhóm mới) trước khi soạn để biết mã nào là nút 6 số/7 số thật — tránh bịa `tieuChi6`/`tenDien`.

## Bước 5 — `check-so-tay.mjs --raw` (2 vòng) ✅

**Vòng 1: 205/208 — 3 mục bị loại.** Cả 3 đều là lỗi EM tự diễn đạt lại câu nguồn, đúng thứ luật 2 cấm:

| Nhóm | Lý do máy loại | Nguyên nhân thật |
|---|---|---|
| 3406 `tieuChi6` | `hs6-khong-co-trong-cay:340600` | Cây của 3406 không có nút 6 số — lá `34060000` mang `laPhanNhom="3406"` (4 số) nên không có `hs6` hợp lệ. **XOÁ hẳn `tieuChi6`.** |
| 3918 `dieuKienVao` | `trich-khong-co-trong-nguon` | Nguồn ghi "áp dụng **đối với** các sản phẩm", em chép thiếu chữ "đối". Sửa lại nguyên văn. |
| 8308 `phamVi` | `trich-khong-co-trong-nguon` | Nguồn viết lẫn 2 kiểu: "**Khoá** thắt lưng … móc cài **khóa** thắt lưng". Em chuẩn hoá cả 2 thành "khoá" → sai. Chép đúng "khóa". |

**Vòng 2: sạch.**

```
3406: đạt 8/8      3918: đạt 22/22    4818: đạt 21/21
6006: đạt 64/64    7019: đạt 76/76    8308: đạt 17/17
sổ tay (bản nháp): 6 nhóm, 208 mục, 0 mục không kiểm được nguồn
```

## Bước 6 — Nạp ✅

```bash
node scripts/build-so-tay.mjs --nhom=3406,3918,7019,8308,4818,6006 --tu-tep=tmp/so-tay/raw --force \
  --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-003.json
→ mục đạt 208/208 (100%) — nghiệm thu bước 1 cần ≥ 95%; nhóm lỗi: 0
```

Sổ tay ghi được: **9** điều kiện vào, **34** loại trừ, **19** câu hỏi phân biệt, **66** tiêu chí 6 số,
**73** dòng 8 số, **1** quy tắc bộ phận (3918), **0** tên điền (không nhóm nào có nút bị lược chưa có tên).

| Nhóm | đạt/tổng | điều kiện | loại trừ | phân biệt | tiêu chí 6 | dòng 8 |
|---|---|---|---|---|---|---|
| 3406 | 8/8 | 0 | 3 | 3 | 0 | 1 |
| 3918 | 22/22 | 2 | 1 | 1 | 2 | 14 |
| 4818 | 21/21 | 2 | 3 | 4 | 5 | 6 |
| 8308 | 17/17 | 1 | 4 | 3 | 3 | 5 |
| 6006 | 64/64 | 2 | 11 | 0 | 26 | 24 |
| 7019 | 76/76 | 2 | 12 | 8 | 30 | 23 |

## Bước 7 — Cổng chặn ✅

```
npm run so-tay:check → sổ tay: 185 nhóm, 6675 mục, 0 mục không kiểm được nguồn
npm test             → 57 passed, 0 failed  ·  === ALL TESTS PASSED ===

node scripts/check-cay.mjs --nhom=<cả 6> --chi-tiet → 0 lỗi lệch cây
```

## Bước 8 — Ghi danh + nộp ✅

- `docs/giao-viec/so-tay-lo.csv`: dòng `003` → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
- Commit `data/so-tay/*.json` + `bao-cao/lo-003.json` + dòng CSV + `TIEN-TRINH.md`. **KHÔNG commit `tmp/`.**
- Push nhánh + mở PR. **KHÔNG merge.**

---

## Điểm cần người soát độc lập soi kỹ

1. **8308 `dieuKienVao` "giai_nguyen_ky_thuat_bang_kim_loai_co_ban"** — câu nguồn nói hàng ở (A)/(C)/(D)
   "**có thể** có các bộ phận bằng da, vải, nhựa, gỗ… **miễn là** vẫn giữ nguyên tính chất cần thiết của
   mặt hàng bằng kim loại cơ bản". Em chỉ đặt **vế "giữ nguyên tính chất cần thiết"** làm điều kiện,
   KHÔNG đặt danh sách vật liệu (vì "có thể" = câu cho phép). Cần xác nhận không đọc thành bắt buộc quá.
2. **4818 `phanBiet` đầu tiên** (`neuCo=4803|4809`) — dựa trên Chú giải Chương 48: "các nhóm 48.03 đến
   48.09 chỉ áp dụng cho … ở dạng dải hoặc cuộn có chiều rộng trên 36cm". Đây là **dải nhóm** do Chương
   nêu, không phải một số nhóm đích danh → đề nghị soát đặc biệt.
3. **3918 `dieuKienVao` "loai_tam_phu_bang_plastic"** dùng `op:"in"` + danh sách `|` thay vì tách 2 mục
   `=true`, để tránh bị máy đọc kiểu AND (tấm trải sàn KHÔNG cần rộng ≥ 45 cm — 45 cm chỉ áp cho
   tấm phủ tường/trần, và em đặt riêng ở mục `chieu_rong_tam_phu_tuong_hoac_phu_tran`).

## Nguồn mỏng / bất thường (báo trong PR)

- **3406 — nguồn mỏng nhất lô**: chú giải nhóm chỉ 8 dòng. **Không soạn được `dieuKienVao` nào**: các câu
  "đã hoặc chưa tạo mầu…" và "cũng bao gồm nến dùng ban đêm có gắn phao" đều là câu CHO PHÉP (luật 8
  dòng 28 của `_he-thong.txt`) nên bỏ. Không có nút 6 số trong cây nên không có `tieuChi6`.
- **8308 — câu về đinh rút bị cắt nghẽn**: "…đầu đinh bị chôn." (nguồn hết câu ở đó, không nói rõ đầu đinh
  bị chôn vào đâu). Không dùng câu này làm `dieuKienVao`.
- **8308 — lỗi chính tả trong nguồn**: "**Khoá** thắt lưng … móc cài **khóa** thắt lưng" (xem Bước 5).
  Đã chép nguyên văn, không sửa.
- **3918 — chú giải nhóm ngắn** (3 đoạn); thông tin cấu trúc chính nằm ở Chú giải 9 Chương 39
  (chiều rộng ≥ 45 cm cho tấm phủ tường/trần).
- **6006 / 7019 — khối `cay` đổi so với lô trước**: `lib/hs-tree.js` nay đã lấy được tên tiếng Việt cho
  các nút ảo từ biểu thuế Tổng cục (`60062 Từ bông`, `60063 Từ xơ sợi tổng hợp`, `60064 Từ xơ tái tạo`,
  `70191…` v.v). Diff chỉ nằm ở `cay.nut[].tenVi/tenEn` + `provider` + mốc thời gian — **không mục nội dung
  nào đổi** (đã kiểm `git diff`: không có dòng `nguon`/`trich`/`dieuKien`/`fact` nào bị sửa). Nhãn
  `NGUOI_DUYET` của lô 001 giữ nguyên.
- **7019 còn 2 cảnh báo `check-cay`**: `phan-nhom-chua-co-tieu-chi:701969` và `:701990`. Đã có từ lô 001,
  ngoài phạm vi lô này (nếu muốn bù thì mở lô riêng).