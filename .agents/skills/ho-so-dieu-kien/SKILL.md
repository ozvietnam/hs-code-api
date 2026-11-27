---
name: ho-so-dieu-kien
description: "Quy tắc và quy trình chuẩn của M-81 (ADR-0007) để tách điều kiện nguyên tử DIEU_KIEN, GIAI_CHONG, CANH_TRANH, sinh bảng quyết định bang-anh-em@1 và kiểm cổng 6-12 trên kho ozvietnam/hs-code-api."
---

# Skill `ho-so-dieu-kien` — Điều Kiện Nguyên Tử (`DIEU_KIEN`) & Bảng Anh Em (`M-81`)

## 1. Mục đích & Phạm vi

Đóng mỗi nút có tên bằng công thức HOẶC-của-VÀ trên điều kiện nguyên tử có trích luật nguyên văn (`ho-so-ma@1` / `DIEU_KIEN`, ADR-0007) để **"Loại khác"** đóng bằng tiêu chí máy ghép (`bang-anh-em@1`), không dùng danh sách sản phẩm hay dữ liệu khách.

- **Nơi lưu:** `data/ho-so-ma/dieu-kien/<chương>.jsonl` (`DIEU_KIEN`, `GIAI_CHONG`, `CANH_TRANH`) và `data/ho-so-ma/bang-anh-em/<chương>.jsonl` (máy sinh qua `scripts/ho-so-ma/bang-anh-em.mjs`, không viết tay).
- **Nhánh & Worktree:** Làm việc trên worktree cô lập `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>` với nhánh `agy/...` tách sạch từ `origin/main`.
- **An toàn:** Không sửa đường khách (`api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`, `lib/ho-so-ma/ghep.js`), không sửa bản ghi dữ liệu cũ trong `data/ho-so-ma/`, không đưa dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`) hay tiền lệ `tb:` vào điều kiện, tuyệt đối không chạy `gh pr merge` hay push thẳng lên `main`.

---

## 2. Quy tắc & Bài học thực tế

### Luật 1 — Tách vế và liên từ (`;` / `hoặc` / `và` / `trừ`)
- **Quy tắc:**
  - Mỗi dấu `;` (ngoài ngoặc đơn) hoặc `hoặc` phân nhánh thay thế ⇒ **tăng số `ve`** (`1, 2, ...`). Hai bản ghi khác `ve` trên cùng nút được ghép bằng phép **HOẶC**.
  - Các điều kiện phải thoả đồng thời (`và`, cụm bổ nghĩa bắt buộc đi kèm) ⇒ **cùng `ve`**. Các bản ghi cùng `ve` được ghép bằng phép **VÀ**.
  - Cụm loại trừ (`"trừ ..."`, `"không kể ..."`, `"không phải ..."`) ⇒ đặt **`phu: true`**, `trich` chép nguyên văn đoạn loại trừ, không gộp vào vế khẳng định.
  - Dòng `"Loại khác"` thuần (`loaiKhac: true`, không `loaiKhacCoVe`) **không** viết `DIEU_KIEN` riêng — máy tự sinh công thức `KHONG_HOP_VA_CHA` từ các anh em có tên và `chuoiCha`. Riêng dòng `loaiKhacCoVe: true` (ví dụ `8501.10.22`: *"Loại khác, công suất không quá 5 W"*) phải có `DIEU_KIEN` cho vế điều kiện thêm của nó.
- **Ví dụ ĐÚNG / SAI:**
  - ĐÚNG (`8543.70.40`): `ve: 1` *"Máy tách bụi hoặc khử tĩnh điện... PCB/PWBs(1) hoặc PCAs(1)"*; `ve: 2` *"máy làm đóng rắn vật liệu bằng tia cực tím... PCB/PWBs(1) hoặc PCAs(1)"*.
  - ĐÚNG (`8543.70.2`): `ve: 1, phu: false` *"Thiết bị điều khiển từ xa"* + `ve: 1, phu: true` *"trừ thiết bị điều khiển từ xa bằng sóng radio"*.
  - SAI: Gộp cả 2 vế sau dấu `;` của `8543.70.40` vào chung `ve: 1` (sẽ trượt Cổng 6 `TÁCH` vì `soVe < soDoanChamPhay`).

### Luật 2 — Chọn `kieu` (`CO_KHONG` | `SO` | `GIA_TRI`) và dùng lại `NGUONG` M-74
- **Quy tắc:**
  - `CO_KHONG`: thuộc tính có/không (mặc định). **Cấm** kèm `nguong` hoặc `tap`.
  - `SO`: điều kiện ngưỡng định lượng có đơn vị. **Bắt buộc** trỏ `nguong` tới **`id` bản ghi `NGUONG` đã có ở M-74** (dạng `hs:<nut>:74NN`), **tuyệt đối không lặp số** (không nhúng object `{tu, den}`) và **cấm** kèm `tap`.
  - `GIA_TRI`: phân tách theo trục giá trị rời rạc (ví dụ chất liệu mặt ngoài `42.02`: da thuộc / plastic / vật liệu dệt). **Bắt buộc** kèm `tap` (mảng chuỗi nguyên văn) và **cấm** kèm `nguong`. Khi các anh em chia trên cùng một trục `GIA_TRI`, dùng **cùng một `cauHoi`** chuẩn hoá để Cổng 8 `CHỒNG` và Cổng 7 `PHỦ` nhận diện cùng trục.
- **Ví dụ ĐÚNG / SAI:**
  - ĐÚNG: `{"kieu":"SO","nguong":"hs:bieu:85011022:7401","mo":"NGUONG",...}`.
  - SAI: `{"kieu":"SO","nguong":{"daiLuong":"công suất","tu":null,"den":5},...}` (vi phạm khuôn M-81).

### Luật 3 — Chọn `mo` (`DINH_NGHIA_LUAT` | `NGUONG` | `MO_TA_HUONG_DAN` | `NGHIA_THUONG`)
- **Quy tắc:**
  - `DINH_NGHIA_LUAT`: thuật ngữ/khái niệm có định nghĩa pháp lý trong Chú giải Phần/Chương/Phân nhóm.
  - `NGUONG`: đi với ngưỡng số định lượng (`kieu: "SO"`).
  - `MO_TA_HUONG_DAN`: có mô tả nhận dạng chi tiết trong Chú giải chi tiết HS / SEN (không phải định nghĩa pháp lý cứng).
  - `NGHIA_THUONG`: chữ luật không có định nghĩa hay ngưỡng định lượng (*"vi sóng"*, *"thiết kế đặc biệt"*). Cổng 11 `MỞ` **không** ép `NGHIA_THUONG` về 0, nhưng bắt buộc mỗi bản ghi `NGHIA_THUONG` phải có `cauHoi` một dòng (`<= 300` ký tự) để hệ thống biết điểm dừng hỏi ở vùng biên.

### Luật 4 — Quy ước `id` (`hs:<nut>:81NN`), `trich`, `nguon`, `vanTay` & `GIAI_CHONG` / `CANH_TRANH`
- **Quy tắc:**
  - Mọi `DIEU_KIEN` bắt buộc mang `id` dạng `hs:<nut>:81NN` (ví dụ `hs:bieu:85437040:8101`, `8102`, ..., duy nhất toàn kho `data/ho-so-ma/`).
  - `nguon` là id câu thật trong `data/luat-goc/cau/` trên đường đi của `nut` (cấm `tb:`), `trich` là chuỗi con nguyên văn của câu `nguon` đó, `vanTay` là sha256 hex chữ câu gốc (`cong.mjs` tính).
  - Khi hai anh em có thể cùng thoả trên một món hàng cụ thể (`VUNG_CHONG`), phải lập bản ghi `GIAI_CHONG` `{id?, nut (cha), cap:[A,B], cach: TRU|QUY_TAC_3|CHU_GIAI|NGUONG, trich, nguon}` có trích luật nguyên văn; cặp chỉ chưa chứng minh tách trên máy (`CHUA_CHUNG_MINH_TACH`) chỉ đếm cảnh báo, không tự bịa `GIAI_CHONG`.
  - Mọi nhóm mang cụm *"chưa được chi tiết hoặc ghi ở nơi khác"* (như `85.43`, `84.79`) phải có bản ghi `CANH_TRANH` ghi danh sách hữu hạn `nhomCanhTranh` + 3 phép thử (`nhom:8479:ct:1–7`) trích nguyên văn.

### Luật 5 — Quy trình hai phiếu khác hãng & cấu hình cổng OpenAI-compatible
- **Quy tắc:**
  - `scripts/ho-so-ma/tach-dieu-kien.mjs` nhận cổng OpenAI-compatible qua cờ `--url`, `--model`, `--api-key-env` hoặc biến môi trường (`DIEU_KIEN_LLM_URL` / `OPENAI_BASE_URL` / `LLM_BASE_URL`, `DIEU_KIEN_MODEL` / `OPENAI_MODEL` / `LLM_MODEL`). Tuyệt đối không ghi khoá bí mật, địa chỉ IP nội bộ hay tên cờ chưa khai báo vào mã hoặc skill.
  - Chỉ gửi chữ luật công khai, chạy hai phiếu từ hai họ mô hình độc lập rồi đối chiếu tất định bằng `scripts/ho-so-ma/so-phieu-dieu-kien.mjs` (`KHOP` / `LECH_PHIEU`).

---

## 3. Lệnh tự kiểm trước khi nộp (Cổng khuôn & Cổng 6–12)

```bash
# 1. Sinh bảng quyết định anh em tất định (không LLM)
node scripts/ho-so-ma/bang-anh-em.mjs --chuong 85 --ghi

# 2. Kiểm khuôn toàn kho và tương thích ngược cổng 1–5
node scripts/ho-so-ma/khuon.mjs
node scripts/ho-so-ma/cong.mjs

# 3. Kiểm cổng 6–12 cho phạm vi mục tiêu
node scripts/ho-so-ma/cong.mjs --pham-vi 8543 --chi-trong --cong 6..12

# 4. So hai phiếu độc lập & chạy bài kiểm đơn vị M-81
node scripts/ho-so-ma/so-phieu-dieu-kien.mjs --phieu-1 p1.jsonl --phieu-2 p2.jsonl --strict
node scripts/test-dieu-kien.mjs
node scripts/test-ho-so-ma.mjs

# 5. Kiểm an toàn skill & đồng bộ plugin oz-orchestrator
node scripts/quan-ly-skill.mjs --dong-bo
node scripts/quan-ly-skill.mjs --kiem --bat-buoc-plugin
node scripts/test-quan-ly-skill.mjs
```
