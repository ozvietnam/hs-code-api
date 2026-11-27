# M-81 (#2410, PR 1) — Khuôn `DIEU_KIEN`, gói nhóm 4 số, bảng anh em, sổ điểm, cổng 6–12 & skill `doc-tron-nhom`

- **Quyết định kiến trúc:** [`docs/decisions/0007-dieu-kien-nguyen-tu-bang-anh-em.md`](../../decisions/0007-dieu-kien-nguyen-tu-bang-anh-em.md) (ADR-0007, `#2409`) và `ADR-0008` (`#2418` — triển khai theo cả nhóm 4 số, thêm `truc`, `moNguon`, `ve: 0`, bổ sung `daTri` theo `#issuecomment-7210034900`).
- **Phạm vi PR 1:** Chỉ gồm mã công cụ, khuôn, cổng kiểm, bài kiểm ngoại tuyến và skill `doc-tron-nhom` (thay thế `ho-so-dieu-kien`). **Không** chứa dữ liệu chương thật của PR 2 trong `data/ho-so-ma/dieu-kien/` hay `data/ho-so-ma/bang-anh-em/`, không sửa `lib/ho-so-ma/ghep.js`, đường khách (`lib/`, `api/`, `data/prompts/`), hay `data/lop-kho.json`.

## 1. Thành phần bàn giao trong PR 1

| Tệp | Vai trò |
|---|---|
| `scripts/ho-so-ma/khuon.mjs` | Bổ sung loại `DIEU_KIEN` (`truc` bắt buộc cho `GIA_TRI` / cấm ở `CO_KHONG` & `SO`; `daTri` boolean tuỳ chọn trên `GIA_TRI` / cấm ở `CO_KHONG` & `SO`; `moNguon` bắt buộc cho `DINH_NGHIA_LUAT` & `MO_TA_HUONG_DAN`; `moNguonVanTay` tuỳ chọn; `ve >= 0` hỗ trợ `ve: 0`), `GIAI_CHONG`, `CANH_TRANH` (`id` `hs:<nut>:81NN`, whitelist chặt), `kiemBangAnhEm()` cho `bang-anh-em@1` (gồm `vanTayCau` tuỳ chọn), hỗ trợ thư mục `dieu-kien/` và `bang-anh-em/` cục bộ mà không sửa `lib/ho-so-ma/ghep.js`; giữ nguyên 100% tương thích với 6 loại cũ và `tach-chung.mjs`. |
| `scripts/ho-so-ma/goi-nhom.mjs` | Dựng gói đọc trọn nhóm 4 số (`goi-nhom@1`) từ `phaiDoc(nhom4, { dayDu: true })` (loại `WCO`, `PHAN_BIET`, `PHAN_BIET_NGHIA` và tuyệt đối không đọc `tb:` hay dữ liệu khách) + cây đầy đủ `cayBieu` (gồm dòng `khongMa: true` và thừa kế `suyRa`/`cungDong`) + `nhomAnhEm` + `luatNen` + `cauTrongGoi` kèm `vanTay` + `loaiTru` (`ra`/`vao`) + `hoSoSanCo` (`NGUONG`, `DINH_NGHIA`, `CHI_LIET_KE`) + `canhTranh` từ `M-81-canh-tranh.md` + tự chia `goiCon` theo phân nhóm 6 số khi vượt `maxBytes`. |
| `scripts/ho-so-ma/bang-anh-em.mjs` | Sinh tất định (không LLM) `data/ho-so-ma/bang-anh-em/<chương>.jsonl`: phân phối `ve: 0` (nhân/AND vào mọi `ve >= 1` hoặc gom thành 1 vế), công thức HOẶC-của-VÀ, `"Loại khác"` = `KHÔNG(hợp)` + `chuoiCha` (kể cả nút trung gian `loaiKhac` / `loaiKhacCoVe` qua `truCongThuc`), chứng minh rời nhau theo `truc` đơn trị (`!daTri`) / `NGUONG.daiLuong` & `laPhuCuaNhau` (trục `daTri: true` không tự chứng minh rời nhau bằng tập giá trị rời), chứng minh phủ kín Cổng 7 (hằng đúng logic đa điều kiện, dải `SO` theo phạm vi cha, `GIA_TRI` theo `truc`), từ chối `NGOAI_PHAM_VI` khi `chuoiCha` bị phủ định trong `doBangAnhEm`, lưu kèm `vanTayCau` cho các câu `nguon`/`moNguon`. |
| `scripts/ho-so-ma/cong.mjs` | Bổ sung cổng **6 `TÁCH` · 7 `PHỦ` · 8 `CHỒNG` · 9 `HỎI` · 10 `DÒ` · 11 `MỞ` · 12 `BÙ`** (`--cong 6..12`). Cổng 6 & 11 kiểm đủ `truc`, `moNguon` (kể cả dẫn chiếu chéo chương, cấm `tb:`) và quy ước `ve: 0`. Cổng 6 & 12 hỗ trợ chuỗi một dòng `cacNutCungDong` nhiều bước (`cungDong`/`suyRa`, vd `2308 -> 230800 -> 23080000`). Cổng 8 xét `VUNG_CHONG` trước `haiNutRoiNhau` (nhất quán với `bang-anh-em.mjs`), chứng minh rời nhau theo `truc` đơn trị (`!daTri` ở `GIA_TRI`), `NGUONG.daiLuong + donVi` (`SO`), `laPhuCuaNhau`, hoặc `GIAI_CHONG`; cặp `daTri: true` chưa có `GIAI_CHONG` phát `CHUA_CHUNG_MINH_TACH` (đếm không chặn). Mặc định `--cong` giữ nguyên `[1, 2, 3, 4, 5]`. |
| `scripts/ho-so-ma/tach-dieu-kien.mjs` | Chuyển luồng chính sang nhận **gói một nhóm 4 số** (`--nhom <4so>`, `--chuong <NN>`) từ `goi-nhom.mjs`, xuất `{ dieuKien, giaiChong, canhTranh }` chuẩn hoá đủ `truc`, `daTri`, `moNguon`, `moNguonVanTay`, `docBool` an toàn (không ép `'false'` thành `true`), `ve >= 0`, `phieu[0].mo = moHinh`; gọi cổng OpenAI-compatible qua biến môi trường chuẩn hoặc cờ CLI, hỗ trợ tiêm `fetchImpl`, giữ tương thích các hàm đơn nút. |
| `scripts/ho-so-ma/so-phieu-dieu-kien.mjs` | Đối chiếu tất định hai phiếu `DIEU_KIEN` độc lập (kể cả `truc`, `daTri` và `moNguon`) → `KHOP` / `LECH_PHIEU`, hỗ trợ `--strict`. |
| `scripts/ho-so-ma/so-diem.mjs` | Sổ điểm tất định không tệp trạng thái riêng (`DONG` / `CHUA` / `DO`) tính từ dữ liệu luật + hồ sơ: kiểm khuôn + `bang-anh-em` qua cổng 6–12 + độ tươi `vanTay` của mọi câu luật dẫn chiếu (`nguon`, `moNguon` qua `DINH_NGHIA` + `moNguonVanTay` + `vanTayCau` trên `bang-anh-em`, `NGUONG.cau`, `phepThu`). `--hang-doi` chỉ phát nhóm `CHUA`; khi câu luật đổi chỉ mở lại đúng `nutCanMoLai`. |
| `scripts/test-dieu-kien.mjs` & `scripts/test-ho-so-ma.mjs` | Bộ kiểm ngoại tuyến dùng tập con thật từ `data/luat-goc/` + `data/ho-so-ma/nguong/{85,42}.jsonl` trong `os.tmpdir()` (phủ `02.01`, `85.01`, `42.02`, bảng vàng `85.43`/`85.01` trên `origin/main`, `daTri`, `goi-nhom`, `tachGoiNhom`, `so-diem`); đăng ký vào `scripts/danh-sach-test.txt`. |
| `.agents/skills/doc-tron-nhom/SKILL.md` | Thay thế `.agents/skills/ho-so-dieu-kien/`: quy trình 9 bước một lượt cho gói nhóm 4 số (ADR-0008), bảng soát 8 bảng vàng kèm ví dụ đúng/sai thật (`85.43`, `85.01`, `42.02`, `02.01`, `84.79`, `90.31`, `39.26`, `73.26` + `daTri` `30.04`), sổ điểm `so-diem.mjs` và lệnh tự kiểm (đồng bộ sang plugin `oz-orchestrator`). |

## 2. Lệnh kiểm chứng

```bash
node scripts/ho-so-ma/khuon.mjs
node scripts/ho-so-ma/cong.mjs
node scripts/ho-so-ma/goi-nhom.mjs --nhom 8543 --tom-tat
node scripts/ho-so-ma/so-diem.mjs --hang-doi --chuong 85 --gioi-han 5
node scripts/test-dieu-kien.mjs
node scripts/test-ho-so-ma.mjs
node scripts/quan-ly-skill.mjs --kiem --bat-buoc-plugin
```
