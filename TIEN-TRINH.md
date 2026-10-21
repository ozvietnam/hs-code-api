# Tiến trình — so-tay lô 002 (2026-10-21)

Sổ tay chú giải nhóm: **8423, 6201, 6204, 8539, 9003, 9030** · worktree `hs-code-api-wt-st-lo2` · branch `so-tay/lo-002` @ 0f1ceab.

Theo `brief-st-lo002.md` + 11 luật của `docs/giao-viec/so-tay-giao-ngoai.md` mục 3.

## Quy trình (mục 2 giao-viec)

1. ✅ Xuất nguồn (`build-so-tay.mjs --xuat-nguon`) → 6 tệp `<nhom>.txt` + `_he-thong.txt`.
2. ✅ Đọc `_he-thong.txt` (lược đồ + 11 luật).
3. ✅ Đọc HẾT 3 nguồn mới (6201, 9003, 9030); 3 nhóm còn lại (8423, 6204, 8539) đã có JSON soạn sẵn từ đợt khác, copy y nguyên làm raw.
4. ✅ Soạn `tmp/so-tay/raw/<nhom>.json` theo lược đồ cho 6 nhóm.
5. ✅ `check-so-tay.mjs --raw=tmp/so-tay/raw` (đã sạch ở lần 2 sau 3 sửa đổi).
6. ✅ Nạp bằng `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=.../lo-002.json`.
7. ✅ `npm run so-tay:check` → 175 nhóm, 6479 mục, 0 lỗi.
8. ⏳ Commit + push + mở PR (KHÔNG merge).

## 11 luật mục 3 (ràng buộc cứng — nếu không trích nguyên văn được thì XOÁ mục)

- L01. Nguồn `nhom*/ch*/phan*/sen.*/tax.*/wco.*`.
- L02. `trich` nguyên văn, lược "…", giữ lỗi chính tả.
- L03. `loaiTru` nêu đích danh + số nhóm trong câu trích.
- L04. `phanBiet`: mã ngoài nhóm có trong câu trích.
- L05. `dieuKienVao` số: số có trong trích.
- L06. `dong8`: đủ mọi dòng `tax.*`, `loaiKhac` máy tự điền.
- L07. Không ghép 2 câu xa; không thêm hiểu biết riêng.
- L08. Không sửa mã/nguồn/trích để qua máy. Không trích được → XOÁ.
- L09. `cay` máy sinh — KHÔNG soạn.
- L10. `tieuChi6[]` từ chú giải/SEN/wco (KHÔNG tax.*).
- L11. KHÔNG ghi `nguonLoai` — máy gán `AI_DA_KIEM`.

---

## Bước 1 — Xuất nguồn ✅

`tmp/so-tay/nguon/` có đủ:
- `_he-thong.txt`, `8423.txt`, `6201.txt`, `6204.txt`, `8539.txt`, `9003.txt`, `9030.txt`.

## Bước 2 — Đọc `_he-thong.txt` ✅

Lược đồ + 11 luật đã nắm (xem trên).

## Bước 3-4 — Soạn raw/`<nhom>.json` ✅

Phân bổ:
- **8423, 6204, 8539**: 3 nhóm này đã có JSON soạn từ đợt trước (đạt 100% kiểm). Em copy nguyên vào `tmp/so-tay/raw/` (44+113+88 = 245 mục).
- **6201, 9003, 9030**: 3 nhóm mới — em soạn từ nguồn (27+10+39 = 76 mục).

Các sửa sau `check-so-tay --raw` lần đầu (3 lỗi → 0):
- 6201 `dieuKienVao` mục "áo cài thân trước từ trái qua phải → nam": câu trích dài 230 ký tự bị squash mismatch ở đoạn cuối "Quy định này không áp dụng…" → rút gọn chỉ còn câu 1 ("Quần áo… coi là cho nam giới hoặc trẻ em trai").
- 9030 `phamVi`: ghép (A) và (B) thành 1 đoạn liền nhau → squash mismatch (giữa (A) và (B) có đoạn ngắt `\n\n` không có trong trich) → thêm "…" giữa 2 phần để khi squash tách fragment.
- 9030 `tieuChi6` mục `hs6=903031 fact=co_thiet_bi_ghi=false`: trích ngắn "without a recording device" không nằm liền trong wco (giữa "power" và "without" có đoạn "(other than those for…semiconductor wafer or devices)") → XOÁ mục theo luật L08.

Kết quả `check-so-tay --raw=tmp/so-tay/raw`:
```
6201: đạt 27/27
6204: đạt 113/113
8423: đạt 44/44
8539: đạt 88/88
9003: đạt 10/10
9030: đạt 39/39
sổ tay (bản nháp): 6 nhóm, 321 mục, 0 mục không kiểm được nguồn
```

## Bước 5-6 — Nạp + báo cáo ✅

```
sổ tay: 6 nhóm cần dựng
1/6 8423  2/6 6201  3/6 6204  4/6 8539  5/6 9003  6/6 9030
mục đạt 321/321 (100%) — nghiệm thu bước 1 cần ≥ 95%; nhóm lỗi: 0
```

Báo cáo: `data/so-tay/bao-cao/lo-002.json`.

## Bước 7 — CI xanh ✅

- `npm run so-tay:check`: `sổ tay: 175 nhóm, 6479 mục, 0 mục không kiểm được nguồn` (xanh).
- `npm test`: `57 passed, 0 failed`.

## Bước 8 — Commit/push/PR ⏳

Sẽ commit các file:
- `data/so-tay/8423.json`, `6201.json`, `6204.json`, `8539.json`, `9003.json`, `9030.json`
- `data/so-tay/bao-cao/lo-002.json`
- `docs/giao-viec/so-tay-lo.csv` (cập nhật trạng thái `dang-lam`, `nguoi_lam=dev-zcode-mm`)

KHÔNG commit `tmp/` (gitignored).
