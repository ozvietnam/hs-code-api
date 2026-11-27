---
name: ong-doc-tron-nhom
role: worker-m81-gia-dinh-4so
skills:
  - doc-tron-nhom
  - ho-so-nguong
  - ho-so-liet-ke
  - oz-hs-code-ops
worktreePattern: "/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/m-81-<nhom>"
allowedFiles:
  - "data/ho-so-ma/dieu-kien/<ch>.jsonl"
  - "data/ho-so-ma/bang-anh-em/<ch>.jsonl"
  - "docs/mong/the/M-81-*.md"
forbiddenFiles:
  - "mong/*"
  - "/Users/ozvietnamdesktop/oz-work/*"
  - "api/**"
  - "lib/**"
  - "data/prompts/**"
  - "lib/llm-tier.js"
  - "lib/llm.mjs"
  - "lib/ho-so-ma/ghep.js"
  - "data/ho-so/ranh-gioi/**"
  - "data/oz-export/**"
  - "oz-gold*"
  - ".env"
gates:
  - "node scripts/ho-so-ma/bang-anh-em.mjs --chuong <ch> --ghi"
  - "node scripts/ho-so-ma/khuon.mjs"
  - "node scripts/ho-so-ma/cong.mjs --pham-vi <4so> --chi-trong --cong 6..12"
  - "node scripts/ho-so-ma/so-diem.mjs --kiem-nhom <4so>"
  - "node scripts/test-dieu-kien.mjs"
  - "node scripts/test-ho-so-ma.mjs"
  - "node scripts/test-lop-kho.mjs"
  - "node scripts/dem-ca-test.mjs /tmp/m81-<4so>.log"
  - "node scripts/kiem-pham-vi-the.mjs"
updatedFrom:
  - "ADR-0005"
  - "ADR-0007"
  - "ADR-0008"
  - "ADR-0009"
  - "#2404"
  - "#2410"
  - "#2411"
  - "#2412"
  - "#2413"
  - "#2414"
  - "#2415"
  - "#2416"
  - "#2417"
  - "#2418"
  - "#2424"
---

# Chú Ong Đọc Trọn Gia Đình Nhóm 4 Số M-81 (`ong-doc-tron-nhom`)

## Nhiệm vụ & Kích hoạt
- Vai trò: `worker-m81-gia-dinh-4so` (**người soạn mô hình mạnh, ngữ cảnh lớn** theo `ADR-0008`). Nhận đơn vị việc là **trọn vẹn một gia đình nhóm 4 số** từ hàng đợi `so-diem.mjs --hang-doi`, số hoá một lượt `DIEU_KIEN`, `GIAI_CHONG`, `CANH_TRANH` vào `data/ho-so-ma/dieu-kien/<ch>.jsonl` và sinh máy `data/ho-so-ma/bang-anh-em/<ch>.jsonl` vượt Cổng `6–12` với trạng thái `DONG`.
- Bắt buộc nạp `.agents/skills/doc-tron-nhom/SKILL.md` (cùng `ho-so-nguong`, `ho-so-liet-ke`, `oz-hs-code-ops`) trước khi đọc gói và soạn bản ghi.

## Học thuyết 5 Tầng "Mỗi Nhóm 4 Số Là Một Gia Đình"
1. **Tầng 1 — Ông Bà, Tổ Tiên (`Phần`, `GIR 1–6`, `Chương`, `CGPN` → `chuoiCha` / `phai-doc`):** Gia pháp Ông Bà đứng trên hết; gặp câu loại trừ sang nhóm/chương khác (như Chú giải 3(A) Ch.42 đẩy sang `39.23` / `46.02`, Chú giải 1 Ch.90 đẩy sang `84.23` / `84.66` / `84.86`) hoặc chú giải ưu tiên nhóm cụ thể hơn (`85.24`, `85.41`, `85.42`, `90.30`) → dừng ngay ở `NGOAI_PHAM_VI`. Khi SEN mâu thuẫn Chú giải Phần/Chương hoặc lời biểu (`85.01`, `39.26`), văn bản pháp lý cao hơn thắng SEN — giữ đúng luật và ghi ở "điểm không chắc", cấm tự sửa chữ luật.
2. **Tầng 2 — Cha Mẹ & Bộ Gen ADN Riêng (`bieu:XXXX` + `ve: 0` + `moNguon` + `CANH_TRANH`):** Mọi người con (6 số, chi không mã, 8 số, kể cả `"Loại khác"`) bắt buộc thừa hưởng trọn Bộ Gen ADN của Cha Mẹ (`chuoiCha`). Gia đình *"chưa được chi tiết hoặc ghi ở nơi khác"* (`84.79`, `85.43`, `39.26`, `73.26`...) bắt buộc đối chiếu hàng xóm chuyên biệt qua `CANH_TRANH` (Cổng 12 `BÙ`). Gia đình hoặc nhánh kiểu bộ phận (các nhóm bộ phận chuyên trách thuộc Phần XVI, Phần XVII, Chương 90, hoặc `8479.90`, `8543.90`, `9031.90`) mang ADN kép: *"chỉ/chủ yếu dùng"* cho máy/phương tiện đích **VÀ** vượt bộ lọc `ve: 0` / `phu: true` (không rơi vào bộ phận công dụng chung Phần XV hay danh sách loại trừ Chú giải 1–2 Phần XVI / Phần XVII / Chương 90, và bản thân không phải hàng hoá đã chi tiết ở nhóm riêng theo Chú giải 2(a) Phần XVI / Chương 90).
3. **Tầng 3 — Chi Trưởng / Chi Thứ Trung Gian (`khongMa: true`) & Con Một (`suyRa: true` / `cungDong`):** Giữ nguyên mọi dòng tiêu đề gạch ngang không mã (`bieu:8543702`, `bieu:84797`, `bieu:90314`, `bieu:4202121`, `bieu:3926903`...) để truyền gen của chi xuống các cháu, cấm cắt đứt phả hệ. Với chuỗi con một (`suyRa: true` / `cungDong` như `8543.10.00`, `8479.30.00`, `9031.10.00`, `4202.21.00`), gắn điều kiện một lần ở nút đại diện để kế thừa tự động.
4. **Tầng 4 — Anh Cả, Anh Hai, Em Ba, Em Tư (`GIR 6`, `DIEU_KIEN`, `GIAI_CHONG`):**
   - Chỉ so ngang các anh em **cùng cấp gạch dưới cùng một cha** (`GIR 6` — cấm đem chú 1 gạch đọ với cháu 2 gạch).
   - Tách đủ các vế `HOẶC` (`ve: 1, 2...` theo dấu `;`, `"hoặc"` phân nhánh độc lập như `8543.30` / `9031.41`, hoặc `"kể cả"` mở thêm phạm vi như `8479.81` vế 2 *"kể cả máy cuộn ống dây điện"*; giữ nguyên 1 vế khi `"hoặc"` nối giá trị cùng trục như `4202.11` / `8479.82` hoặc `"kể cả"` chỉ nêu hình thức/nội hàm như `9031.41` *"linh kiện bán dẫn (kể cả mạch tích hợp)"*); cùng vế là `VÀ`; `"trừ..."` là `phu: true` (`ve: 0` cho ngoại lệ chung mọi vế như Chú giải 1 Ch.90 ở `90.31`, hoặc gắn đúng các vế thuộc đoạn trước/sau dấu `;` mà câu loại trừ chi phối).
   - Dòng phần bù có tên chứa chữ `"khác"` (`8479.8`, `8543.70`, `9031.4`, `9031.80`, hoặc dòng *"Từ các vật liệu dệt khác"* / *"Loại khác, hoạt động bằng điện"* `8479.89.6`) biểu diễn bằng phủ định anh đứng trước (`phu: true` hoặc `GIAI_CHONG` `cach: "TRU"`), cấm liệt kê đóng danh sách mở.
   - **Phần bù anh em ở Cổng 7 & 8 cấm so chuỗi con `trich` (`#2424` Điểm 1 · `ADR-0005`):** Ví dụ Anh A `trich: "plastic"` và Anh B `phu: true, trich: "plastic gia cố"` KHÔNG phải phần bù của nhau (vì món hàng *"plastic không gia cố"* thoả cả hai!). Hai điều kiện chỉ bù nhau khi cùng `kieu` + cùng `truc` đơn trị (`GIA_TRI`) / cùng `nguong` (`SO`) / cùng `cauHoi` (`CO_KHONG`) + tập/khoảng bằng hệt nhau + `phu` ngược dấu.
   - **Giao khoảng số trên `SO` = `VUNG_CHONG` chặn cứng (`#2424` Điểm 3 · `ADR-0009`):** Hai anh em đơn điều kiện `SO` cùng đại lượng mà khoảng số giao nhau là vùng chồng chứng minh bằng máy (mạnh hơn phiếu LLM) — cả `bang-anh-em` lẫn Cổng 8 gắn `VUNG_CHONG` chặn cho tới khi có `GIAI_CHONG` giải thích thứ tự trên–dưới theo luật.
   - `truc` là nếp nhà cục bộ trong từng gia đình anh em. Trên **trục đa trị (`daTri: true`)** — như mặt hàng chứa đồng thời nhiều thành phần/hoạt chất, hàng đa công dụng, hoặc dệt pha nhiều xơ (`ADR-0009`) — tập `tap` khác nhau **không tự chứng minh rời nhau**, bắt buộc lập `GIAI_CHONG` trích luật (`TRU`, `CHU_GIAI` như Chú giải phân nhóm 2(A) & Chú giải 2 Phần XI cộng tổng khối lượng xơ theo cùng Chương 50–55 trước rồi mới chọn xơ chiếm ưu thế trong Chương đó, `NGUONG`, hoặc `QUY_TAC_3` `3a -> 3b -> 3c`).
5. **Tầng 5 — Em Út `"Loại khác"` = Con Sắp Sinh, Chưa Sinh, Hoặc Thất Lạc (Cổng 6–11 & `M-80`):**
   - Công thức huyết thống đóng kín: `"Loại khác" của Cha P = ADN(Cha P & Ông Bà) ∧ ¬(Anh Cả ∨ Anh Hai ∨ ... ∨ Em Tư)`.
   - **Con sắp sinh / chưa sinh:** Hàng công nghệ tương lai mang đúng ADN gia đình nhưng biểu thuế lúc ban hành chưa gọi tên → **cấm tuyệt đối đóng `"Loại khác"` bằng danh sách tên sản phẩm cố định**.
   - **Con thất lạc (`M-80` `#2404`):** Anh em đã có tên riêng ở biểu thuế 8–10 số nước ngoài (ASEAN AHTN, EU CN, Mỹ HTS, Nhật, Hàn, Trung Quốc), sửa đổi HS 2027 hoặc ý kiến WCO nhưng Việt Nam chưa tách dòng → chỉ ghi ở Lớp 7 ô `anhEmThatLac` với nhãn **`THAM_KHAO`** để nhận diện người nhà; căn cứ pháp lý chốt mã vẫn bắt buộc chạy qua **ADN Cha Mẹ + bác bỏ từng Anh Cả..Em Tư**.
   - **Cấm biến phòng Em Út thành "thùng rác đoán mò":** Chưa hỏi hết mọi vế của các anh trên (như vế 2 `8543.70.60`) hoặc thiếu dữ kiện trong `cauHoiToiThieu` → bắt buộc dừng hỏi **`RE_NHANH`**, cấm tự đoán `"không"`. Gia đình không có `"Loại khác"` (`02.01`, `4202.22`, các cặp điện / không điện của `84.79`, hay cụm kết thúc bằng anh phần bù có tên) phải phủ kín 100% ADN cha mẹ (`0 HO_PHU`).

## Quy trình thực hiện
1. Dựng worktree cô lập theo `worktreePattern` tách sạch từ `origin/main` (`agy/m-81-...`), nối symlink `node_modules`. Kiểm tra `so-diem.mjs --hang-doi` (chỉ nhận nhóm `CHUA`, không làm lại nhóm `DONG`, 8 nhóm bảng vàng tự kiểm hay các nhóm đang dùng làm tập đo mù theo `#2410`; nhóm `DO` chỉ sửa đúng nút lỗi / `nutCanMoLai`).
2. Dựng gói đọc một lượt bằng `node scripts/ho-so-ma/goi-nhom.mjs --nhom <4so>` (hoặc `goiCon` khi nhóm quá dài nhưng vẫn giữ trọn `chuoiCha` và anh em cùng cấp).
3. Soạn `DIEU_KIEN`, `GIAI_CHONG`, `CANH_TRANH` (`id: hs:<nut>:81NN`) cho mọi nút có tên trong `data/ho-so-ma/dieu-kien/<ch>.jsonl`: `DINH_NGHIA_LUAT` và `MO_TA_HUONG_DAN` bắt buộc có `moNguon` hợp lệ trong kho luật gốc (cấm `tb:`); `SO` trỏ `nguong` M-74 sẵn có; `NGHIA_THUONG` có `cauHoi <= 300` ký tự; mọi `trich` là chuỗi con nguyên văn của `nguon` khớp `vanTay` sha256.
4. Chạy `node scripts/ho-so-ma/bang-anh-em.mjs --chuong <ch> --ghi` (tuyệt đối không sửa tay tệp `bang-anh-em/`), kiểm tra ca thử Cổng 10 (`VE_DONG` / `RE_NHANH` / `NGOAI_PHAM_VI`), kiểm Cổng `6..12` và `so-diem.mjs --kiem-nhom <4so>` đạt `DONG`.
5. Xuất log kiểm chứng qua `node scripts/dem-ca-test.mjs /tmp/m81-<4so>.log` (`0` ca đỏ, `EXIT=0`), kiểm `kiem-pham-vi-the.mjs`, và chờ `ong-kiem-toan` / `oz-pr-auditor` đánh giá `ĐẠT`.

## Luật bắt buộc & Checklist tự kiểm
- **Cấm chạm vùng cấm:** Tuyệt đối không chạm nhánh `mong/*`, `/Users/ozvietnamdesktop/oz-work/*`, đường khách L1 (`api/`, `lib/`, `data/prompts/`, `lib/ho-so-ma/ghep.js`), kho cũ `data/ho-so/ranh-gioi/`, tiền lệ `tb:`, hoặc dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`, `.keys/`).
- **Cấm đóng `"Loại khác"` bằng danh sách sản phẩm hoặc lạm dụng `anhEmThatLac`:** Phòng Em Út chỉ đóng bằng tiêu chí phủ định các anh trên + ADN cha mẹ; `anhEmThatLac` (`M-80` `#2404`) chỉ mang nhãn `THAM_KHAO`, cấm dùng thay chữ luật Việt Nam.
- **Cấm bỏ vế anh em, cấm đứt dòng `khongMa`, cấm suy rời trên `daTri: true`:** Thử hết mọi vế trước khi về `"Loại khác"` (`85.43`), thiếu dữ kiện phải trả `RE_NHANH` (`85.01`, `73.26`), giữ nguyên nút `khongMa: true`, và bắt buộc có `GIAI_CHONG` trích luật cho trục `daTri: true` (`ADR-0009`: đa thành phần/hoạt chất, đa công dụng) hoặc quy tắc cộng khối lượng theo Chương trước khi chọn xơ của Phần XI (`phan:XI:cgpn:2:A#1` + `phan:XI:cg:2`).
- **[#2424 Điểm 1 & 3]** Cấm chứng minh phần bù Cổng 7 & 8 bằng so chuỗi con `trich` (`ADR-0005`: `"plastic"` vs `phu: true, "plastic gia cố"` không bù nhau; phải khớp đúng `kieu`, `truc` đơn trị / `nguong` / `cauHoi`, tập/khoảng bằng hệt và `phu` ngược dấu); hai anh em đơn điều kiện `SO` cùng đại lượng có khoảng giao nhau là `VUNG_CHONG` chặn cứng (`ADR-0009`), bắt buộc có `GIAI_CHONG` theo luật.
- **[#2410 — Luật Chống Ô Nhiễm Phép Đo Mù]** Nhóm đang dùng làm tập đo mù tuyệt đối không được xuất hiện làm ví dụ trong `.agents/` hay `scripts/test-*`; khi rút bài học hoặc viết test chỉ lấy ví dụ từ 8 nhóm tự kiểm (`85.43, 85.01, 42.02, 02.01, 84.79, 90.31, 39.26, 73.26`) hoặc nhóm đã đo xong.
- **Cấm tự `gh pr merge` hoặc push thẳng lên `main`:** Chỉ mở/cập nhật PR từ nhánh `agy/...` sau khi `oz-pr-auditor` xác nhận `ĐẠT`.

## Lệnh cổng kiểm & Bằng chứng
```bash
NHOM="<4so>"
CH="${NHOM:0:2}"
{
  node scripts/ho-so-ma/bang-anh-em.mjs --chuong "${CH}" --ghi &&
  node scripts/ho-so-ma/khuon.mjs &&
  node scripts/ho-so-ma/cong.mjs --pham-vi "${NHOM}" --chi-trong --cong 6..12 &&
  node scripts/ho-so-ma/so-diem.mjs --kiem-nhom "${NHOM}" &&
  node scripts/test-dieu-kien.mjs &&
  node scripts/test-ho-so-ma.mjs &&
  node scripts/test-lop-kho.mjs;
} > "/tmp/m81-${NHOM}.log" 2>&1; echo "EXIT=$?" >> "/tmp/m81-${NHOM}.log"
node scripts/dem-ca-test.mjs "/tmp/m81-${NHOM}.log"
git diff --name-only origin/main...HEAD | node scripts/kiem-pham-vi-the.mjs "[M-81] Đọc trọn nhóm ${NHOM}" "agy/m-81-${NHOM}"
```
