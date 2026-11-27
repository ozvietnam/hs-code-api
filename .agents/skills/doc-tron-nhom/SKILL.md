---
name: doc-tron-nhom
description: "Quy trình một lượt cho một gói nhóm 4 số HS theo ADR-0008 (dựng cây cấp gạch, tách DIEU_KIEN/GIAI_CHONG/CANH_TRANH, bảng soát 8 bảng vàng, sổ điểm so-diem.mjs và cổng 6–12)."
---

# Skill `doc-tron-nhom` — Đọc Trọn Nhóm 4 Số Theo ADR-0008 (M-81)

## 1. Mục đích, Phạm vi & Quy trình Một Lượt (ADR-0008)

Đọc và số hoá trọn vẹn **một gói nhóm 4 số** trong một lượt duy nhất (`goi-nhom.mjs` → `DIEU_KIEN`, `GIAI_CHONG`, `CANH_TRANH` → `bang-anh-em.mjs` → cổng `6–12` → `so-diem.mjs`), làm tới đâu ăn điểm tới đó và không đọc lại nhóm đã `DONG`.

- **Nơi lưu:** `data/ho-so-ma/dieu-kien/<chương>.jsonl` (`DIEU_KIEN`, `GIAI_CHONG`, `CANH_TRANH`) và `data/ho-so-ma/bang-anh-em/<chương>.jsonl` (máy sinh qua `scripts/ho-so-ma/bang-anh-em.mjs`, không viết tay).
- **Nhánh & Worktree:** Làm việc trên worktree cô lập `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>` với nhánh `agy/...` tách sạch từ `origin/main`.
- **An toàn:** Không sửa đường khách L1 (`api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`, `lib/ho-so-ma/ghep.js`), không sửa bản ghi dữ liệu cũ trong `data/ho-so-ma/`, không đưa dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`, `.keys/`) hay tiền lệ `tb:` vào điều kiện, tuyệt đối không chạy `gh pr merge` hay push thẳng lên `main`.

### Quy trình 9 bước một lượt cho một nhóm 4 số

1. **Lấy việc từ hàng đợi `so-diem.mjs --hang-doi`:** Chỉ nhận nhóm `CHUA`. Nhóm `DONG` không soạn lại. Nhóm `DO` chỉ sửa đúng bản ghi bị cổng chỉ ra hoặc đúng các nút trong `nutCanMoLai` khi vân tay câu luật đổi. Không cho mô hình phụ/Gemini soạn lại 8 nhóm bảng vàng (chỉ dùng 4 nhóm đầu làm phép đo mù).
2. **Dựng gói đọc trọn nhóm (`goi-nhom.mjs --nhom <4so>`):** Gói gồm cây biểu thuế đầy đủ (`cayBieu`), gia đình anh em (`nhomAnhEm`), luật nền Phần/Chương/Phân chương/nhóm/phân nhóm/SEN (đã loại bỏ `WCO`, `PHAN_BIET`, `PHAN_BIET_NGHIA` và `tb:`), cạnh loại trừ vào/ra (`loaiTru`), hồ sơ M-72..M-75 sẵn có (`NGUONG`, `DINH_NGHIA`, `CHI_LIET_KE`), và `CANH_TRANH` từ `docs/mong/the/M-81-canh-tranh.md`. Nhóm quá dài tự tách `goiCon` theo phân nhóm 6 số nhưng vẫn giữ trọn chuỗi cha và anh em cùng cấp.
3. **Dựng cây cấp gạch đầy đủ:** Giữ nguyên mọi dòng trung gian không mã (`khongMa: true`, ví dụ `bieu:8543702`, `bieu:8543309`, `bieu:90314`, `bieu:4202129`, `bieu:3926903`). Với con duy nhất (`suyRa: true` / `cungDong`, ví dụ `8543.10.00`), đặt điều kiện ở nút cha 6 số, dòng 8 số tự thừa kế. Dòng `"Loại khác"` thuần (`loaiKhac: true`) không viết `DIEU_KIEN`; dòng `loaiKhacCoVe: true` (ví dụ `8501.10.22`) phải viết `DIEU_KIEN` cho vế điều kiện thêm.
4. **Tách `DIEU_KIEN` cho mọi nút có tên (`id: hs:<nut>:81NN`):**
   - `ve` (số nguyên `>= 0`): `;` ngoài ngoặc hoặc `hoặc` phân nhánh độc lập ⇒ tăng `ve` (`1, 2, ...`); `và` ⇒ cùng `ve`; **`ve: 0`** ⇒ điều kiện chung áp lên mọi vế (thường là `phu: true` cho `"trừ…"` cuối danh sách, vẫn phải đủ số `ve >= 1` cho tên tách `;`).
   - `phu`: `true` cho `"trừ..."`, `"không kể..."`, `"không phải..."`.
   - `kieu`: `CO_KHONG` (cấm `nguong`, `tap`, `truc`, `daTri`); `SO` (bắt buộc trỏ `nguong` = `id` `NGUONG` M-74, không lặp số, cấm `tap`, `truc`, `daTri`); `GIA_TRI` (bắt buộc `truc` cục bộ trong gia đình anh em + `tap`, cấm `nguong`; tuỳ chọn `daTri: true` khi trục đa trị, mặc định `false` đơn trị).
   - `mo`: `DINH_NGHIA_LUAT` và `MO_TA_HUONG_DAN` bắt buộc kèm `moNguon` (`RE_CAU` trong kho luật gốc hoặc mảng id, kể cả chéo chương, cấm `tb:`); `NGUONG` và `NGHIA_THUONG` cấm `moNguon`.
   - `nguon`, `trich`, `vanTay`: trích chuỗi con nguyên văn của câu `nguon` trong gói (`L.cau`), `vanTay = sha256(chu)`.
5. **Tách `GIAI_CHONG` hoặc soi chồng Cổng 8:** Với cặp anh em có thể cùng thoả trên cùng một món hàng (`VUNG_CHONG`), lập `GIAI_CHONG` (`TRU` | `QUY_TAC_3` | `CHU_GIAI` | `NGUONG`) kèm trích luật nguyên văn. Lưu ý: Cổng 8 chỉ chứng minh rời nhau cho `GIA_TRI` khi cùng `truc`, tập `tap` không giao **và cả hai đều đơn trị (`!daTri`)** (hoặc dùng `phu` bù / `SO`). Nếu một bên có `daTri: true`, Cổng 8 gắn `CHUA_CHUNG_MINH_TACH` cho tới khi có `GIAI_CHONG` trích luật.
6. **Lập `CANH_TRANH` (Cổng 12 `BÙ`):** Với mọi nút có cụm `"chưa được chi tiết hoặc ghi ở nơi khác"`, lấy danh sách nhóm cạnh tranh và phép thử từ `M-81-canh-tranh.md` + `nhom:8479:ct:1–7`.
7. **Rút ca thử từ ví dụ chú giải / SEN (Cổng 10 `DÒ`):** Kiểm đủ 3 loại kết quả (`VE_DONG` / `DICH`, `RE_NHANH` khi thiếu dữ kiện, `NGOAI_PHAM_VI` khi bị `ve: 0` hoặc `chuoiCha` loại ra).
8. **Kiểm kê `NGHIA_THUONG` (Cổng 11 `MỞ`):** Đếm đủ, không ép về `0`, mỗi bản ghi phải có `cauHoi` một dòng `<= 300` ký tự để dừng hỏi ở vùng biên.
9. **Chạy cổng & nộp bài sạch:** Chạy `bang-anh-em.mjs`, `cong.mjs --pham-vi <4so> --chi-trong --cong 6..12`, `so-diem.mjs --kiem-nhom <4so>`, `oz-pr-auditor`, rồi mới mở PR (tuyệt đối không chạy `gh pr merge` hay push thẳng lên `main`).

---

## 2. Bảng Soát 8 Bảng Vàng (Ví Dụ Đúng / Sai Thật)

| # | Quy tắc rút ra từ tập vàng | Ví dụ ĐÚNG (thật) | Ví dụ SAI (thật — tránh lặp) |
|---|---|---|---|
| 1 | **Thử mọi vế của tất cả anh em trước khi kết luận "về Loại khác"** | **`85.43`:** Kiểm đủ cả vế 2 của `8543.70.60` (*"thiết kế đặc biệt để kết nối với thiết bị hoặc dụng cụ điện tín hoặc điện thoại..."*); ca #17 (`nhom:8543:ct:30#1` tấm phát quang không nêu công dụng) trả `RE_NHANH` `{.60, .90}`. | Vội đẩy 8 ca vào `8543.70.90` ("Loại khác") mà bỏ qua vế 2 của `8543.70.60`. |
| 2 | **Xét nhóm cạnh tranh ngoài chương (`CANH_TRANH`)** | **`85.43` & `39.26`:** Ca #4 (bộ trộn âm thanh có khuếch đại) & #9 xét cạnh tranh `85.18` theo chức năng chính / Chú giải 3 Phần XVI; `39.26` xét `39.23–39.25`, `96.08`, `90.18`. | Chỉ xét anh em nội bộ trong `85.43` mà bỏ sót nhóm cạnh tranh `85.18`. |
| 3 | **Trục (`truc`) là cục bộ trong gia đình anh em, không dùng khoá toàn biểu** | **`42.02` & `85.01`:** `42.02` dùng `truc: "chất liệu mặt ngoài"` trên cha và các anh em (`4202.22` chứng minh phủ kín Cổng 7 & tách Cổng 8); `85.01` dùng `truc: "loại dòng điện"` còn công suất dùng `NGUONG.daiLuong`. | Cố ép một bảng từ vựng `truc` chung cho 97 chương, hoặc bỏ trống `truc` trên `GIA_TRI`, hoặc lặp `truc` lên `kieu: "SO"`. |
| 4 | **Trục đa trị (`daTri: true`) không tự chứng minh rời nhau ở Cổng 8** | **`30.04` (`#2421`), hàng nhiều công dụng, dệt pha:** Đặt `daTri: true` cho `truc` đa trị (nhiều hoạt chất/công dụng/sợi pha). Cổng 8 phát `CHUA_CHUNG_MINH_TACH` và yêu cầu `GIAI_CHONG` trích Quy tắc 3(a) hoặc Chú giải phân nhóm 2(A) Phần XI. Trục đơn trị (`loại dòng điện`, `chất liệu mặt ngoài`) giữ mặc định `false`. | Coi `tap: ["penicillin"]` và `tap: ["insulin"]` trên `daTri: true` là tự rời nhau dù thuốc hỗn hợp có thể chứa cả hai hoạt chất. |
| 5 | **Chú giải định nghĩa / hướng dẫn bắt buộc `moNguon` (kể cả chéo chương)** | **`02.01` & `42.02`:** `0201.20`/`0201.30` đặt `moNguon: ["chuong:02:kq:34#1", "chuong:02:kq:34#2"]` cho *"có xương"*; `42.02` dẫn chiếu chéo `moNguon: "chuong:39:cg:1#2"` (*"plastic"* gồm cả sợi lưu hoá, làm `4202.99.10` gần như rỗng). | Đặt `mo: "DINH_NGHIA_LUAT"` hoặc `"MO_TA_HUONG_DAN"` mà thiếu `moNguon`, hoặc trích câu tiền lệ `tb:`. |
| 6 | **`ve: 0` cho điều kiện chung / câu `"trừ…"` đứng sau cả danh sách** | **`90.31` & `42.02`:** `90.31` gắn `ve: 0` cho Chú giải 1 Chương 90 (áp cả hai vế `;`), còn *"chưa được ghi hoặc chi tiết ở nơi khác"* gắn `ve: 1`; `42.02` gắn `ve: 0, phu: true` cho Chú giải 3(A) áp lên cả 3 vế vật liệu. | Chỉ gắn loại trừ chung vào `ve: 1` làm `ve: 2`, `ve: 3` bị lọt, hoặc dùng `ve: 0` lấp chỗ thiếu `ve >= 1` trên tên có `;`. |
| 7 | **Ví dụ không đủ dữ kiện → `RE_NHANH`, không đoán** | **`85.43`, `85.01`, `73.26`:** `85.43` ca #16 (hồng ngoại không dây thiếu loại máy điều khiển → `RE_NHANH` `{.21, .29, 95.04}`); `85.01` (0/21 ca đủ dữ kiện chốt 1 mã 8 số → `RE_NHANH`); `73.26` (móng ngựa không bỏ qua tầng `7326.1`). | Tự đoán mặc định `"không"` cho dữ kiện còn thiếu để ép `VE_DONG`. |
| 8 | **SEN mâu thuẫn biểu → ghi "điểm không chắc", không tự sửa luật** | **`85.01` & `39.26`:** `sen:85011030` viết *"động cơ một pha cỡ nhỏ"* nhưng `8501.10.30` nằm dưới `"Động cơ một chiều"` (dùng chung SEN `.30`/`.60`) → theo cha `"Động cơ một chiều"` và ghi chú rõ ở "điểm không chắc"; `39.26` ghi nhận xung đột `nhom:3926:ct:7#1` vs Chú giải 2(z) Ch.39. | Tự sửa chữ SEN hoặc im lặng bịa điều kiện mới trái chữ biểu thuế. |
| 9 | **Dùng `so-diem.mjs` làm hàng đợi & ăn điểm ngay từ tập vàng** | Chuyển 8+ bảng vàng (`85.43, 85.01, 42.02, 02.01, 84.79, 90.31, 39.26, 73.26`, thêm `85.17, 87.08, 30.04, 61.10`) thành dữ liệu `dieu-kien/` ở PR dữ liệu riêng để `so-diem.mjs` tính `DONG` ngay; chỉ sửa nút lỗi/`nutCanMoLai`. | Cho LLM soạn lại từ đầu các nhóm đã `DONG` hoặc đã có bảng vàng. |

---

## 3. Sổ Điểm Không Đọc Lại & Lệnh Tự Kiểm

- `so-diem.mjs` **không ghi tệp trạng thái riêng** — trạng thái `DONG` / `CHUA` / `DO` được tính tất định từ kho `data/luat-goc/` + `data/ho-so-ma/` và vân tay sha256 mọi câu luật trong gói:
  - **`DONG`**: có `DIEU_KIEN`, 0 lỗi khuôn, `bang-anh-em` qua cổng `6–12`, và vân tay mọi câu luật dẫn chiếu còn khớp.
  - **`CHUA`**: chưa có bản ghi nào của nhóm 4 số (`--hang-doi` chỉ phát nhóm `CHUA`).
  - **`DO`**: lỗi khuôn / trượt cổng `6–12` (`congLoi`) / vân tay câu luật đổi (`cauDoiVanTay`, chỉ mở lại đúng các nút trong `nutCanMoLai`).

```bash
# 1. Lấy hàng đợi nhóm CHUA (không đọc lại nhóm DONG)
node scripts/ho-so-ma/so-diem.mjs --hang-doi --chuong 85 --gioi-han 10

# 2. Dựng gói đọc trọn nhóm 4 số (kể cả cây khongMa, suyRa, M-72..M-75, CANH_TRANH)
node scripts/ho-so-ma/goi-nhom.mjs --nhom 8543 --tom-tat

# 3. Tách điều kiện nguyên tử trọn gói nhóm 4 số qua cổng OpenAI-compatible (cấu hình qua env/cờ, không cứng khoá/IP)
node scripts/ho-so-ma/tach-dieu-kien.mjs --nhom 8543 --out data/ho-so-ma/dieu-kien/85.jsonl

# 4. Sinh bảng anh em tất định & kiểm cổng 6–12 + sổ điểm
node scripts/ho-so-ma/bang-anh-em.mjs --chuong 85 --ghi
node scripts/ho-so-ma/khuon.mjs
node scripts/ho-so-ma/cong.mjs --pham-vi 8543 --chi-trong --cong 6..12
node scripts/ho-so-ma/so-diem.mjs --kiem-nhom 8543

# 5. So hai phiếu độc lập & chạy kiểm thử M-81
node scripts/ho-so-ma/so-phieu-dieu-kien.mjs --phieu-1 p1.jsonl --phieu-2 p2.jsonl --strict
node scripts/test-dieu-kien.mjs
node scripts/test-ho-so-ma.mjs

# 6. Đồng bộ và kiểm an toàn skill với plugin oz-orchestrator
node scripts/quan-ly-skill.mjs --dong-bo
node scripts/quan-ly-skill.mjs --kiem --bat-buoc-plugin
node scripts/test-quan-ly-skill.mjs
```
