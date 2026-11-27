# M-81 (#2410, PR 1) — Khuôn `DIEU_KIEN`, bảng anh em, cổng 6–12 và skill `ho-so-dieu-kien`

- **Quyết định kiến trúc:** [`docs/decisions/0007-dieu-kien-nguyen-tu-bang-anh-em.md`](../../decisions/0007-dieu-kien-nguyen-tu-bang-anh-em.md) (ADR-0007, `#2409`)
- **Phạm vi PR 1:** Chỉ gồm mã công cụ, khuôn, cổng kiểm, bài kiểm ngoại tuyến và skill `ho-so-dieu-kien`. **Không** chứa dữ liệu chương thật của PR 2 (`85.43`, `85.01`, `42.02`, `02.01` trong `data/ho-so-ma/dieu-kien/` hay `data/ho-so-ma/bang-anh-em/`), không sửa `lib/ho-so-ma/ghep.js`, đường khách (`lib/`, `api/`, `data/prompts/`), hay `data/lop-kho.json`.

## 1. Thành phần bàn giao trong PR 1

| Tệp | Vai trò |
|---|---|
| `scripts/ho-so-ma/khuon.mjs` | Bổ sung loại `DIEU_KIEN`, `GIAI_CHONG`, `CANH_TRANH` (`id` `hs:<nut>:81NN`, whitelist chặt), `kiemBangAnhEm()` cho `bang-anh-em@1`, hỗ trợ thư mục `dieu-kien/` và `bang-anh-em/` cục bộ mà không sửa `lib/ho-so-ma/ghep.js`; giữ nguyên 100% tương thích với 6 loại cũ và `tach-chung.mjs`. |
| `scripts/ho-so-ma/bang-anh-em.mjs` | Sinh tất định (không LLM) `data/ho-so-ma/bang-anh-em/<chương>.jsonl`: công thức HOẶC-của-VÀ cho từng anh em có tên, `"Loại khác"` = `KHÔNG(hợp)` + `chuoiCha`, `cauHoiToiThieu`, các cờ `HO_PHU`, `VUNG_CHONG`, `CHUA_CHUNG_MINH_TACH`, `NGHIA_THUONG`, `THIEU_VI_DU`; xử lý đủ `loaiKhac`, `loaiKhacCoVe`, `khongMa`, `suyRa`, `cungDong`, `phamViTru`. |
| `scripts/ho-so-ma/cong.mjs` | Bổ sung cổng **6 `TÁCH` · 7 `PHỦ` · 8 `CHỒNG` · 9 `HỎI` · 10 `DÒ` · 11 `MỞ` · 12 `BÙ`** (`--cong 6..12`). Cổng 8 chỉ chứng minh rời nhau khi cùng trục `SO`/`GIA_TRI`, một bên là `phu` của bên kia, hoặc có `GIAI_CHONG`; cặp còn lại gắn `CHUA_CHUNG_MINH_TACH` (đếm, không chặn); `VUNG_CHONG` chưa giải thì chặn. Mặc định `--cong` giữ nguyên `[1, 2, 3, 4, 5]`. |
| `scripts/ho-so-ma/tach-dieu-kien.mjs` | Gọi cổng OpenAI-compatible bất kỳ qua biến môi trường chuẩn (`DIEU_KIEN_LLM_URL` / `OPENAI_BASE_URL` / `LLM_BASE_URL`, `DIEU_KIEN_MODEL` / `OPENAI_MODEL` / `LLM_MODEL`, `DIEU_KIEN_API_KEY` / `OPENAI_API_KEY` / `LLM_API_KEY`) hoặc cờ CLI, hỗ trợ tiêm `fetchImpl` khi test, không lưu khoá cứng hay IP nội bộ, chỉ gửi chữ luật công khai. |
| `scripts/ho-so-ma/so-phieu-dieu-kien.mjs` | Đối chiếu tất định hai phiếu `DIEU_KIEN` độc lập → `KHOP` / `LECH_PHIEU`, hỗ trợ `--strict`. |
| `scripts/test-dieu-kien.mjs` & `scripts/test-ho-so-ma.mjs` | Bộ kiểm ngoại tuyến dùng tập con thật từ `data/luat-goc/` trong `os.tmpdir()` + mock HTTP server cục bộ; đăng ký vào `scripts/danh-sach-test.txt`. |
| `.agents/skills/ho-so-dieu-kien/SKILL.md` | Quy tắc tách vế (`;`/hoặc/và/trừ), chọn `kieu`/`mo`, dùng lại id `NGUONG` M-74, mã `hs:<nut>:81NN`, mẫu đúng/sai và lệnh tự kiểm cổng 6–12 (đồng bộ sang plugin `oz-orchestrator`). |

## 2. Lệnh kiểm chứng

```bash
node scripts/ho-so-ma/khuon.mjs
node scripts/ho-so-ma/cong.mjs
node scripts/test-dieu-kien.mjs
node scripts/test-ho-so-ma.mjs
node scripts/quan-ly-skill.mjs --kiem --bat-buoc-plugin
```
