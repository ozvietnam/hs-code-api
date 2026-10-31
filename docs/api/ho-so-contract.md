# Hợp đồng API — Hồ sơ phân loại (`ho-so@1`, lát 1)

Job L1-5d (#648), mở rộng L1-5e (soát K2, mục 8). Plan ozplugin `docs/superpowers/plans/2026-10-29-ho-so-phan-loai.md` (Job L1-5d), spec
`docs/superpowers/specs/2026-10-29-ho-so-phan-loai-mo-ta-soat-design.md` §8.1, §8.10. Mã: `lib/ho-so/api.js`.
Hợp đồng này **đóng băng** cho Cổng ozplugin (L1-6a…d) và ERP (L1-7b). Đổi gì phải sửa tệp này trước.

## 0. Cờ và phạm vi

| `HS_HO_SO` | `/api/describe`, `/api/classify`, `/api/declaration-sheet` | `POST /api/ho-so` |
|---|---|---|
| `off` (mặc định, giá trị lạ) | phản hồi **bằng sâu** bản trước L1-5d; trường mới của đầu vào bị bỏ qua | `503 HO_SO_TAT` |
| `shadow` | tính hồ sơ + viết, ghi **một dòng số đo** vào `data/ho-so-shadow.jsonl` (qua `dataPath`), phản hồi **bằng sâu** như `off` | chạy đủ (bên gọi chủ động hỏi) + ghi số đo |
| `on` | mã áp dụng ⇒ **thêm** trường (mục 2–4); mã không áp dụng ⇒ như `off` | chạy đủ |

`POST /api/declaration-check` (K2, chỉ khi `kiemMa: true`): `off` ⇒ bằng sâu bản trước L1-5e; `shadow` ⇒ K2 đường cũ y nguyên +
một dòng số đo `endpoint: 'declaration-check'` mỗi dòng mã áp dụng; `on` + mã áp dụng ⇒ K2 hồ sơ (mục 8). Chi tiết mục 8.

**Mã áp dụng** = mã 8 số thuộc `data/ho-so/lat-1.json` **và** phân nhóm có ranh giới đã duyệt (`hoSoApDung`). `POST /api/ho-so`
nhận thêm mã 6 số (phân nhóm lát 1 đã duyệt) và 4 số (nhóm có ít nhất một phân nhóm như vậy) — hồ sơ khi đó dừng ở cấp đã chắc,
`ketLuan.trangThai = THIEU_DU_KIEN`.

Dòng số đo shadow chỉ có các khoá `KHOA_SHADOW` (`lib/ho-so/api.js`): `ts, endpoint, maHs, loaiToKhai, noiBo, trangThai,
capDaChac, banNhap, lyDoBanNhap, soDuKien, soChuaBiet, soRanhGioi, ketQuaRanhGioi, soCauHoi, soTinHieu, doDaiMoTaEcus,
coKhaiTiepHys, tuongDuong, soViPham, cheDoViet, buocQuaHan, ms, loi, trungMoTaCu` + (L1-5f) `cheDo` (`shadow` | `thu`),
`apDung`, `msBuoc {duongDi, docDuKien, doiChieu, nghienCuu?, viet}`, `llmBiLoai`, `cheDoVietYeuCau`, `duKienQD {tong, moi, cu,
caHai}` (số dữ kiện quyết định có trong chuỗi mới / mô tả cũ — chỉ số đếm) + (L1-5e, dòng `declaration-check`) `k2 {soCo,
soThieu, soMauThuan, coCanCuTatDinh, canPhanLoai, cauSuaBanNhap, cauSuaMaTroToi}` (chỉ số / boolean) — không tên hàng, không mô
tả, không câu chữ.
Mã 8 số thuộc lát 1 nhưng phân nhóm chưa có ranh giới duyệt ⇒ (shadow) một dòng gọn `{ts, endpoint, maHs, noiBo, cheDo,
apDung: false}`. Tổng hợp: `node scripts/bao-cao-shadow.mjs [--json]` hoặc `GET /api/admin/ho-so-shadow?tu=&den=` (KÍN, Bearer).

**Chạy thử nội bộ (L1-5f):** `HS_HO_SO_THU_CALLERS` = danh sách tên khoá dịch vụ (cùng tên ở `HS_SERVICE_TOKENS`, vd
`oz-noi-bo`). Khi `HS_HO_SO=shadow`, lượt của các khoá đó chạy như `on` (phản hồi có trường mới, `hoSoMeta.cheDo = 'on'`,
`hoSoMeta.thuNoiBo = true`) và vẫn ghi một dòng số đo `cheDo: 'thu'`; mọi người gọi khác theo `HS_HO_SO`. `off` tắt hết, kể cả
chạy thử. Lượt công khai / `HS_API_TOKEN` không có tên khoá nên không bao giờ được chạy thử; `cong-oz` chỉ khi được ghi tên rõ.
`on` toàn cục không ghi dòng số đo.

## 1. Đầu vào mới (describe / classify / declaration-sheet / ho-so)

Bên gọi khai = sự thật **nguồn `KHACH`** (bằng chứng = chính chuỗi bên gọi gửi). Đọc qua `tu-vung@1` trước; đọc không ra thì
`TEN_LOAI` nhận nguyên chuỗi, kiểu khác đưa vào thông số dạng "<nhãn Việt>: <giá trị>" để luật/LLM đọc tiếp.

| Trường | Kiểu | Vào hồ sơ |
|---|---|---|
| `loaiToKhai` | `NHAP` \| `XUAT` (mặc định `NHAP`) | `hoSo.loaiToKhai` |
| `manufacturer` | chuỗi ≤ 300 | `duKien[] { fact: 'nhaSanXuat', nguon: 'KHACH' }` |
| `dimensions` | chuỗi, vd `80x80x250 mm` | `duKien[] { fact: 'kichThuoc', giaTri: [80,80,250], donVi: 'mm', nguon: 'KHACH' }` |
| `condition` | chuỗi, vd `Mới 100%` | `duKien[] { fact: 'tinhTrang', giaTri: 'MOI', nguon: 'KHACH' }` (đường cũ vẫn dùng như trước) |
| `packaging` | chuỗi ≤ 200 | `hoSo.nhanDien.quyCachDongGoi` |
| `origin` | chuỗi | **không** vào hồ sơ/chuỗi mô tả (tờ khai nhập khai xuất xứ ở ô riêng; "xuất xứ" bị cấm trong chuỗi). Đường cũ dùng như trước |
| `brand`, `model` | chuỗi | `duKien[]` `nhanHieu` / `model` nguồn `KHACH` (`"không nhãn hiệu"` ⇒ `KHONG_HIEU`) |
| `duKien[]` | `{fact, giaTri, donVi?, nguon?, bangChung?, tuongTu?}` | giữ `nguon` của bên gọi (`KHACH`\|`NSX`\|`ANH`\|`AI_CHUA_KIEM`); `TB_TCHQ`/`SUY_RA`/khoá ngoài từ vựng bị loại; `tuongTu {<khoaTuongTu>: bool}` chỉ trên `tenLoai` — trả lời câu hỏi `TUONG_TU` (mục 4) |
| `hoSoId` | uuid | **không** tra cứu (bộ não không lưu hồ sơ): luôn dựng lại; ghi lại ở `hoSoMeta.hoSoIdTruoc` |
| `hoSo` | — | **bỏ qua hoàn toàn** (ranh giới tin cậy §8.1) |

`/api/classify` đọc các trường trên ở body (cùng tên); chúng chỉ vào động cơ hồ sơ, không vào `attrs` của phản hồi.

## 2. `POST /api/describe` khi `on` + mã áp dụng

**Giữ** mọi trường cũ: `declaration`, `customsDescription`, `descriptionMeta`, `compliance{score, level, warnings[]}`,
`trademarkRisk`, `llmModel`, `degraded`, `llmError`, `contextUsed`, `attributesUsed`, `ms` (… y như cũ).

**Thêm, ở cấp trên cùng của phản hồi:**

| Trường | Ghi chú |
|---|---|
| `moTaEcus` | chuỗi ≤ 200 ký tự **hoặc `null`** khi bản nháp |
| `khaiTiepHys` | phần không vừa ô (khai tiếp theo hướng dẫn 1.68) hoặc `null` |
| `ghiChu` | chỉ khi luật định, không thì `null` |
| `moTaDayDu` | bản không viết tắt hoặc `null` khi bản nháp |
| `bangGiaiTrinh[]` | `{cum, cumTat, vaiTro, fact?, viTri: ECUS\|HYS\|CHO_TRONG\|KHONG_VIET, viSaoBatBuoc{maRe[], lyDo}, canCu, canCuThem?, ...}` |
| `taiLieuKyThuatNenKem[]` | `{url, title?}` |
| `banNhap` | `true` khi hồ sơ chưa đủ căn cứ (mục 3) |
| `canCuMoTa` | căn cứ chỉ tiêu mô tả (chỉ qua `lib/legal-basis.js#citeChiTieu`) |
| `hoSo` | `HoSoPhanLoai` (mục 4) **đã lọc theo quyền** |
| `hoSoMeta` | `{apDung, cheDo (chế độ hiệu lực của lượt), thuNoiBo? (true khi chạy thử nội bộ), cheDoViet: LLM\|MAY, tuongDuong, buocQuaHan[], hoSoIdTruoc?, canhBao?[], ms}` |

Quy ước:
- `customsDescription` = **chuỗi cuối** của bộ viết: `moTaEcus` khi đạt, `moTaBanNhap` khi bản nháp (luôn là chuỗi — ERP không vỡ).
- `descriptionMeta` tính trên chuỗi cuối: `{length, maxLength: 200, truncated: (có khaiTiepHys), fullLength, dropped: [], nguon: 'HO_SO', fullText?}`.
- `compliance` tính trên chuỗi cuối (+ `khaiTiepHys`); giữ cảnh báo `TRADEMARK_WATCH` của đường cũ; thêm `HO_SO_KHAI_TIEP_HYS`
  (info), `HO_SO_DUNG_BAN_MAY` (info, khi bản LLM bị máy loại), `HO_SO_BAN_NHAP` (error).
- Công suất ≥ 1000 W viết kW (`CS: 75kW`, `công suất 1,5kW`); `duKien` vẫn giữ đơn vị chuẩn W của `tu-vung@1` (`75000`).

## 3. Khi `hoSo.ketLuan.trangThai !== 'DU_CAN_CU'` (bản nháp) — **trả lời câu hỏi (2) của Cổng**

Cũng áp cho tờ khai `XUAT` (khuôn 2.69 chưa làm ở lát 1), ranh giới chưa CO, trích không nguyên văn, chữ cấm.

| Trường (cấp trên cùng của describe; trong `moTa` của `/api/ho-so`; trong `ecus` của classify; trong `description` của sheet) | Giá trị |
|---|---|
| `banNhap` | `true` |
| `moTaEcus`, `khaiTiepHys`, `moTaDayDu` | `null` |
| `moTaBanNhap` | chuỗi có chỗ trống `[cần: <nhãn Việt>]` |
| `nhanBanNhap` | "BẢN NHÁP — hồ sơ chưa đủ căn cứ, không dùng để khai. …" |
| `lyDoBanNhap[]` | `THIEU_DU_KIEN` \| `MAU_THUAN` \| `CAN_CHUYEN_GIA` \| `khuon-2.69-chua-ho-tro` \| `thieu-du-kien` \| `ranh-gioi-chua-co` \| `trich-khong-nguyen-van` \| `vi-pham` \| `ten-hang-vuot-o` |
| `cauHoi[]` | `{fact, nhanVi, vi, zh, vaoRanhGioi[]…}` hoặc `{loai: 'PHAN_XU_TIEN_LE', …}` hoặc `{loai: 'PHAN_BIET_CHONG_LAN_TRUC', …}` hoặc `{loai: 'TUONG_TU', …}` (mục 4) — cùng bộ với `hoSo.ketLuan.cauHoi` |
| `maTroToi` | chỉ khi `MAU_THUAN` và xác định được dòng anh em duy nhất |
| `customsDescription` | = `moTaBanNhap` |
| `compliance` | `level: 'REJECT'`, `score ≤ 39`, `passesCustomsAudit: false`, cảnh báo `HO_SO_BAN_NHAP` (error) |
| `hoSo.canCu.canCuPhapLy.trangThai` | theo `ketLuan`: `THIEU_DU_KIEN` ⇒ `THIEU_DU_KIEN`; `MAU_THUAN`/`CAN_CHUYEN_GIA` ⇒ `CHUA_XAC_DINH_DUOC` (không bao giờ `CHUA_CHOT_CAN_XAC_NHAN`) |

## 4. `HoSoPhanLoai` — **trả lời câu hỏi (1) của Cổng**

- `/api/describe`: khoá cấp trên cùng **`hoSo`**.
- `/api/classify`: khoá cấp trên cùng **`hoSo`** (cạnh `results`, `ecus`); `ecus` giữ `{description, level, score, missing}` +
  các khối mục 2/3 (`description` = chuỗi cuối).
- `/api/declaration-sheet`: **`description.hoSo`** (mọi khoá cũ của `description` giữ; `composedFrom: 'HO_SO'`).
- `POST /api/ho-so`: **thân phản hồi chính là `HoSoPhanLoai`**, cộng `moTa` (khối mục 2/3 + `kiemTra` + `canCuMoTa`), `hoSoMeta`,
  `usage`.

Lược đồ (JSDoc đầy đủ ở `lib/ho-so/index.js`): `hoSoId, phienBan{hoSo:'ho-so@1', bieuThue, soTay, tuVung, hieuChinh, dongCo},
loaiToKhai, maHs, hang, duKien[], duongDiPhapLy[], loaiTru[], kiemHoa[], nhanDien, tienLe[], tinHieuRuiRo[],
canCu{girRulesApplied (chỉ lib/gir.js), girDisclaimer, canCuPhapLy (chỉ lib/legal-basis.js)}, capDaChac, chotDuoc, chuaChot[],
ketLuan{trangThai, cauHoi[], chuaChot[], maTroToi?, maCoTheTroToi?}, khuonChuaHoTro? ('2.69' khi XUAT), taiLieuKyThuatNenKem?`.

**Lý do chưa chốt** (`chuaChot[]`, `ketLuan.chuaChot[]` — chuỗi `"<lyDo>:<mã>"`, enum đông cứng `LY_DO_CHUA_CHOT` của
`lib/ho-so/ly-do.js`): `chua-duyet`, `chua-so-hoa`, `hieu-chinh-lech-chua-phan-xu`, `tieu-de-bi-luoc-ten`, `tang-bi-luoc`,
`nhom-chua-co-so-tay`, `ma-khong-co-trong-cay`, `anh-em-chua-so-hoa`, `chong-lan-van-ban`, và (#683) **`chong-lan-truc`**.
Lý do lạ quy về `chua-so-hoa`.

**Chồng lấn trục tên ↔ công dụng** (#683, `CHONG_LAN_TRUC` = `chong-lan-truc`): biểu thuế có nhánh anh em chia theo TÊN cạnh
nhánh chia theo CÔNG DỤNG (vd 8544.42: tiêu đề "Cáp ắc qui" ↔ "Dùng cho viễn thông…"). Ranh giới đã duyệt khai cụm này ⇒
`hoSo.chongLanTruc[]` `{id, nhanh[], truc{<nhánh>: TEN_LOAI|CONG_DUNG}, nhanhCuaMa, cauHoiPhanBiet, trich{}, dieuKienNhanh{},
phanXu|null, ketQuaNhanh?{<nhánh>: THOA|TRAI|CHUA_BIET}, chongLan?, daPhanXu?}`. Khi dữ kiện thoả nhánh của mã **và** một nhánh khác
trục, chưa phân xử:
- `ketLuan.trangThai = CAN_CHUYEN_GIA`, `chuaChot` có `chong-lan-truc:<nhánh kia>` (một mục mỗi nhánh kia);
- `ketLuan.cauHoi[]` thêm `{loai: 'PHAN_BIET_CHONG_LAN_TRUC', idCum, vi (= cauHoiPhanBiet, viết từ chữ biểu), zh, nhanh[],
  ungVien[] {nhanh, truc, trich, maHs[]}, maUngVien[]}` — bên gọi hỏi người khai / chuyển chuyên gia; **không** `maTroToi`;
- mục `duongDiPhapLy` của nhánh mã và dưới nó: `ketQua: 'CHUA_SO_HOA'`, `lyDo: 'chong-lan-truc'`, `ketQuaDuKien` (kết quả theo
  dữ kiện), `chongLanTruc: <id>`; `canCu.girRulesApplied` **không** trích các mục này (không bao giờ tự suy GIR 3(a));
- nhánh khác trục CHƯA BIẾT (thiếu dữ kiện) ⇒ không `DU_CAN_CU`: `THIEU_DU_KIEN` + câu hỏi dữ kiện `vaoRanhGioi: [<nhánh kia>]`.
Dữ kiện chỉ thoả một phía ⇒ đường thường. `phanXu` (chỉ Claude/người soát ghi, nguồn `CHU_GIAI` nguyên văn | `TIEN_LE` qua bảng
hiệu chỉnh | `NGUOI_DUYET`) ⇒ máy theo `chon`: mục nhánh mang `phanXu` + `daPhanXu` của cụm ghi nguồn; mã ở nhánh không được chọn ⇒
`MAU_THUAN` (`tatDinh: false`) + `maTroToi`. Phân xử không phải GIR, không vào `canCuPhapLy`.

**Vế mở "X, Y và các loại tương tự"** (#577 vòng 7, quyết định GĐ — op `TUONG_TU` của `lib/dieu-kien-so.js`): ranh giới ghi
`{fact: 'tenLoai', op: 'TUONG_TU', value: [<các hàng NÊU TÊN>]}`. Tên hàng khớp một hàng nêu ⇒ `CO` như `TEN_LOAI`; tên khác ⇒
**không** `MAU_THUAN` (không bao giờ loại vì khác tên) mà `THIEU` + câu hỏi riêng:
- `ketLuan.cauHoi[]` thêm `{loai: 'TUONG_TU', fact: 'tenLoai', khoaTuongTu, giaTriNeu[], tenDaDoc, vaoRanhGioi[], vi, zh,
  cachTraLoi}` — vd `vi: 'Hàng "xe chòi chân bốn bánh" có thuộc loại tương tự "Xe đạp ba bánh", "xe đẩy", "xe có bàn đạp"
  không? …'`; không kèm câu hỏi tên hàng chung (`fact: 'tenLoai'`) khi đã có tên; `ketLuan.trangThai` ít nhất `THIEU_DU_KIEN`.
- **Trả lời**: gửi lại `duKien[] {fact: 'tenLoai', giaTri: <tenDaDoc>, tuongTu: {<khoaTuongTu>: true|false}}` (chỉ trên `tenLoai`,
  giá trị boolean; sai kiểu ⇒ bỏ trường, ghi `llmBiLoai`/`biLoai` lý do `ben-goi-tuong-tu-sai-kieu`). `true` ⇒ ranh giới `CO`,
  `false` ⇒ `MAU_THUAN` — cả hai `tatDinh: false`, mục đường đi mang `tuongTuTheoTraLoi: true`.
- `canCu.girRulesApplied` **không** trích ranh giới có `TUONG_TU` khi chưa đối chiếu ra `CO` bằng tên nêu, hay khi `CO` theo câu trả
  lời (`tuongTuTheoTraLoi`) — chữ biểu không nêu tên hàng đó.

**Lọc theo quyền** (`locTheoQuyen`, mọi endpoint, trước khi trả): chỉ khoá trong `HS_INTERNAL_CALLERS` (mặc định `erp`) nhận
`MO_TA_GIONG_MA_KHAC` và số đếm kho tờ khai Oz; `cong-oz` (chặn cứng), `HS_API_TOKEN`, lượt công khai **không bao giờ** nhận, ở
bất kỳ độ sâu nào. `DANH_MUC_RUI_RO` (QĐ 2079, nhãn `QD_2079_BAC_C`) tới **mọi** người gọi và không bao giờ nằm trong `canCu`.

## 5. `loaiToKhai` khi cờ tắt / mã ngoài lát 1 — **trả lời câu hỏi (3) của Cổng**

- `off`, `shadow`, hoặc `on` với mã không áp dụng: `loaiToKhai` (cùng `manufacturer`, `dimensions`, `packaging`, `hoSoId`,
  `duKien`) **bị bỏ qua êm** — không lỗi, không cảnh báo, phản hồi bằng sâu bản cũ. Giá trị lạ (`"zzz"`) cũng không lỗi.
- `on` + mã áp dụng ở describe/classify/sheet: giá trị lạ ⇒ coi `NHAP`, ghi `hoSoMeta.canhBao: ['loaiToKhai-khong-hop-le']`.
  `XUAT` ⇒ hồ sơ dựng với `khuonChuaHoTro: '2.69'` và luôn là bản nháp (mục 3).
- `POST /api/ho-so`: giá trị lạ ⇒ `400 DAU_VAO_SAI`.

## 6. Mã lỗi — **trả lời câu hỏi (4) của Cổng**

`POST /api/ho-so` (thân lỗi `{ error, chiTiet[] }`):

| HTTP | `error` | Khi |
|---|---|---|
| 401 | `Unauthorized` | không token / token sai (`requireAuth`) |
| 403 | `CHI_KHOA_DICH_VU` | token là `HS_API_TOKEN` (endpoint chỉ nhận khoá dịch vụ) |
| 405 | `Method not allowed` | không phải POST |
| 400 | `DAU_VAO_SAI` | JSON hỏng; `maHs` không 4/6/8 số; `loaiToKhai` lạ; `duKien` không phải mảng |
| 404 | `KHONG_CO_MA` | mã không có trong biểu thuế |
| 422 | `NGOAI_LAT_1` | mã chưa thuộc lát 1 (hoặc phân nhóm chưa có ranh giới đã duyệt) — dùng describe/classify như cũ |
| 503 | `HO_SO_TAT` | `HS_HO_SO=off` |
| 502 | `NO_PRIVATE_LLM` \| `HO_SO_LOI` | lỗi không lường (bình thường LLM lỗi chỉ làm bước rơi về phần tất định, không 502) |

`/api/describe`, `/api/classify`, `/api/declaration-sheet`: **không thêm mã lỗi HTTP mới**. Lỗi của tầng hồ sơ ⇒ phản hồi đường
cũ; khi `on` kèm `hoSoMeta: { apDung: true, cheDo: 'on', loi: 'HO_SO_LOI' }` (sheet: im lặng giữ bản cũ).

**Hạn từng bước** (không phải lỗi): quá hạn ⇒ bước đó rơi về phần tất định, tên bước ghi vào `hoSoMeta.buocQuaHan[]`
(`docDuKien` ⇒ chỉ đọc bằng luật; `doiChieu` ⇒ bỏ tín hiệu rủi ro; `nghienCuu` ⇒ bỏ; `viet` ⇒ bản máy, `cheDoViet: 'MAY'`). Env:
`HS_HO_SO_HAN_DOC_MS` (35000), `HS_HO_SO_HAN_DOI_CHIEU_MS` (15000), `HS_HO_SO_HAN_NGHIEN_CUU_MS` (30000), `HS_HO_SO_HAN_VIET_MS`
(35000); tắt nghiên cứu web `HS_HO_SO_NGHIEN_CUU=false`; viết không LLM `HS_HO_SO_VIET=MAY`.

## 7. Riêng tư

`POST /api/ho-so` luôn chạy trong `withPrivateData` (kể cả LLM đọc dữ kiện, viết, nghiên cứu). Describe/classify: khoá dịch vụ ⇒
`withPrivateData` như trước; lượt công khai đi chuỗi LLM công khai (spec §8.10) và được đếm chi phí (`demLuotCongKhai`). Tra web
chỉ gửi nhãn hiệu/model/URL công khai + khoá từ vựng; lượt riêng tư không có hiệu/model thì không tra web.

## 8. `POST /api/declaration-check` — K2 theo hồ sơ (L1-5e) — **cho Cổng job L1-6c**

Spec §8.5, §8.10. Mã: `lib/ho-so/soat.js` (`soat`), `lib/declaration-check.js` (`kiemK2TheoCo`). Phản hồi **giữ** hình dạng
`KetQuaSoat` (`dong[].kiem[]` K1–K7, `tongQuan`, `canhBao`, `goiYChuyenGia`, `usage`); chỉ **thêm** trường.

### 8.1 Khi nào chạy

| Điều kiện | K2 của dòng |
|---|---|
| không `kiemMa` | `CHUA_KIEM_MA` như cũ — không LLM, không hồ sơ (mọi cờ) |
| `kiemMa` + chế độ hiệu lực `off`, hoặc mã không áp dụng (ngoài lát 1 / phân nhóm chưa duyệt) | đường cũ (classify mỗi dòng) — **bằng sâu** bản trước L1-5e |
| `kiemMa` + `shadow` + mã áp dụng | đường cũ y nguyên; soát chạy song song chỉ để ghi một dòng số đo |
| `kiemMa` + `on` (hoặc chạy thử nội bộ — `HS_HO_SO_THU_CALLERS`) + mã áp dụng | **K2 hồ sơ** (8.3) |
| như trên nhưng tầng hồ sơ lỗi | đường cũ + cấp dòng `hoSoMeta: { apDung: true, cheDo: 'on', loi: 'HO_SO_LOI' }` |

Chế độ hiệu lực = `cheDoHieuLuc(quyen)` — cùng quy tắc describe/classify (mục 0).

### 8.2 Đầu vào thêm (mỗi dòng của `dongHang[]`, tuỳ chọn, `.strict()` giữ nguyên cho trường khác)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `hoSoId` | uuid | hồ sơ của lượt phân loại trước (Cổng lấy theo `maLuotPhanLoai`). Không tra cứu: bộ não luôn dựng lại; ghi lại ở `hoSoMeta.hoSoIdTruoc` |
| `duKien[]` | ≤ 50 mục `{fact (1–64 ký tự), giaTri, donVi?, nguon?, bangChung?}` | như mục 1: giữ `KHACH`\|`NSX`\|`ANH`\|`AI_CHUA_KIEM`; `TB_TCHQ`/`SUY_RA`/khoá ngoài từ vựng bị loại |
| `hoSo` | — | **không được phép** ⇒ `400 DAU_VAO_SAI` (ranh giới tin cậy §8.1) |

Không áp dụng hồ sơ thì hai trường bị bỏ qua êm.

### 8.3 K2 hồ sơ — các mục trong `dong[].kiem[]` (`nhom: 'K2'`)

Mọi mục giữ shape `muc(...)` (`nhom, trangThai, ma, noiDung, goiYSua?, basis, evidence[], nguon[]`) + `coCanCuTatDinh: boolean`.
Thứ tự: mục `coCanCuTatDinh: true` **đầu tiên**; Cổng giữ nguyên thứ tự backend trả.

**(a) Mục chính** (đúng một mục, luôn đứng đầu nhóm K2) — `ma` theo `hoSo.ketLuan.trangThai`:

| `ma` | `trangThai` | `basis` |
|---|---|---|
| `HO_SO_DU_CAN_CU` | `DAT` | `RULE_TABLE` (mọi ranh giới tất định) \| `LLM_ASSERTED` |
| `HO_SO_MAU_THUAN` | `CANH_BAO` (`LOI` chỉ khi `HS_K2_LOI=on` + `coCanCuTatDinh` + basis `RULE_TABLE`\|`DETERMINISTIC`) | `RULE_TABLE` khi `coCanCuTatDinh`; `LLM_ASSERTED` khi dữ kiện do LLM đọc; còn lại `HEURISTIC` |
| `HO_SO_THIEU_DU_KIEN` | `CANH_BAO` | `DETERMINISTIC` |
| `HO_SO_CAN_CHUYEN_GIA` | `CANH_BAO` | `DETERMINISTIC` |

Trường thêm của mục chính:

| Trường | Kiểu |
|---|---|
| `coCanCuTatDinh` | `true` khi có ranh giới `MAU_THUAN` tất định (dữ kiện đọc bằng luật, không do tiền lệ lật), điều kiện từ sổ tay `CLAUDE_DUYET`\|`NGUOI_DUYET`, câu trích được bộ viết kiểm **nguyên văn** với tệp nguồn |
| `duKienQuyetDinh[]` | `{fact, nhanVi, ketQua: CO\|THIEU\|MAU_THUAN, trich, giaTri?, donVi?, nguonGiaTri?, nut, cap, chieu, tatDinh, canCu: {nguonLoai, ma, trich}\|null}` — `trich` = đoạn **nguyên văn của câu khai** làm bằng chứng (`null` khi `THIEU`); `canCu.trich` = câu trích nguồn luật của ranh giới. Ranh giới `CHUA_SO_HOA` không có ở đây (xem `hoSo`) |
| `cauSuaDeXuat` | `{maHs, theoMa: MA_KHAI\|MA_TRO_TOI, trangThaiHoSo, moTaEcus, khaiTiepHys, ghiChu, moTaDayDu, bangGiaiTrinh[], taiLieuKyThuatNenKem[], banNhap, moTaBanNhap?, nhanBanNhap?, lyDoBanNhap?, cauHoi?, maTroToi?}` = `vietMoTa(hoSoDaSua)` (khối mục 2/3). `MAU_THUAN` có `maTroToi` ⇒ hồ sơ dựng lại trên dòng đó (`theoMa: 'MA_TRO_TOI'`, `maHs` = dòng đó); còn lại ⇒ mã khai. Hồ sơ chưa `DU_CAN_CU` ⇒ **bản nháp** (`banNhap: true`, `moTaEcus: null`, `moTaBanNhap` có `[cần: …]`) |
| `khungNghiNgo` | khung QĐ 2169 mục 13, chỉ khi `MAU_THUAN` (không thì `null`): `{maNghiNgo (8 số \| null), maCoTheNghiNgo?[], noiDungNghiNgo, tieuChiPhanBiet[] {nut, cap, chieu, dieuKien, duKien[] {fact, nhanVi, trich?}, canCu {nguonLoai, ma, trich}, tatDinh}}` |
| `hoSo` | `HoSoPhanLoai` (mục 4) **đã lọc theo quyền** |
| `hoSoMeta` | `{apDung, cheDo, thuNoiBo?, cheDoViet, buocQuaHan[], hoSoIdTruoc?, ghiChuHoSoId?, ms}` |

**(b) Mục tín hiệu** (0..n, `basis: 'HEURISTIC'`, luôn `CANH_BAO`, `coCanCuTatDinh: false`, không bao giờ `LOI`):
`DANH_MUC_RUI_RO` (QĐ 2079, mọi người gọi — **tín hiệu, không phải căn cứ**), `TIEN_LE_MO_TA_TUONG_TU_MA_KHAC` (TB-TCHQ),
`MO_TA_GIONG_MA_KHAC` (**chỉ** khoá nội bộ `HS_INTERNAL_CALLERS`; `cong-oz` không bao giờ nhận). Chênh thuế MFN ≥ 5 điểm vào
`evidence` của mục chính + `goiYChuyenGia`.

**(c) Mục phân loại** — classify **chỉ** chạy khi còn ranh giới quyết định `MAU_THUAN` hoặc `CHUA_SO_HOA`; khi chạy: mục
`MA_KHOP` / `KHOP_CAP_n_SO` / `KHAC_NHOM` / `KHAC_PHAN_NHOM` / `KHAC_DONG_8_SO` / `NEED_FACTS` / … như đường cũ (`coCanCuTatDinh:
false`) và cấp dòng `girRulesApplied`, `canCuPhapLy`, `ketQuaPhanLoai` (nguyên văn classify). Không chạy ⇒ ba trường cấp dòng vắng.

**Bất biến:** đủ K1–K7; `HS_K2_LOI` tắt (mặc định) ⇒ **không** mục K2 nào `LOI`; bật ⇒ chỉ mục `coCanCuTatDinh` +
`RULE_TABLE`|`DETERMINISTIC`; `muc()` vẫn hạ `HEURISTIC`/`LLM_ASSERTED` về `CANH_BAO`. `mucSanSang`/`tongQuan` tính như cũ. GIR
chỉ ở `hoSo.canCu` (lib/gir.js) và cấp dòng khi classify chạy; không mục K2 nào tự gắn nhãn `GIR-*`.
**Không nghiên cứu web** trong soát: dữ kiện câu khai thiếu phải hiện là `THIEU`. LLM (đọc dữ kiện, viết) luôn trong
`withPrivateData`; chi phí vào `usage`.

