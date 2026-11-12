# OZV-558 — Nhóm 8546: máy chốt sai dòng 8 số theo VẬT LIỆU (phân tích + kế hoạch vá T2)

Thẻ: [OZV-558] · Nhóm: OZV-540 T2 (PA-2: cổng chọn tiêu đề 6 số) · GĐ: `ozvietnam/hs-code-api`

## 1. Đo nền (đo trực tiếp, quy tắc 5 OZV-310)

Lệnh (EXIT=0):

```bash
node scripts/bo-kiem-luat.mjs --nhom=8546,8547 --json
```

Trên `origin/main` = `5cd1e855` (PR #1255 đã gộp):

| khối | số |
|---|---:|
| `caDoiChungVatLieu.tong` | 36 |
| `dat` | 32 |
| `do` | **4** (`doCanT3` = 1) |
| `doiHanhVi` | 0 |
| `nemLoi` | 0 |

4 ca đỏ (đều `pn6` hỏi = **854620**, máy chốt **85462010** = "gốm sứ"):

| ca | mô tả khách | vật liệu | mã đúng |
|---|---|---|---|
| `8546-005` | Cách điện xuyên máy biến áp 24kV bằng nhựa epoxid đúc | nhựa | 85469000 |
| `8546-006` | Cách điện của thiết bị ngắt mạch bằng nhựa PVC, 24kV | nhựa | 85469000 |
| `8546-007` | Cách điện của thiết bị ngắt mạch bằng cao su silicone | cao su | 85469000 |
| `8546-008` | Cách điện xuyên bằng composite cho máy biến điện | composite (chưa có trong từ vựng) | 85469000 — **chờ T3** |

## 2. Nguyên nhân gốc (đọc mã, có dòng)

### 2.1 Máy KHÔNG có chiều vật liệu ở điều kiện dòng 85462010

`data/so-tay/8546.json:88` — điều kiện của `85462010` là **HOAC công dụng**, không có vật liệu:

```
HOAC [ tenLoai "cách điện xuyên" + dungCho "máy biến điện…" ] | [ dungCho "thiết bị ngắt mạch" ]
```

⇒ "Cách điện xuyên máy biến áp 24kV bằng **nhựa epoxid** đúc" khớp cả hai vế ⇒ THOA ⇒ chốt `85462010`.
Máy đọc được vật liệu (`MATERIALS` ở `lib/so-tay-gates.js:391` đã có `plastic`, `cao su`, `gốm sứ`, `thủy tinh`)
nhưng **không dòng nào trong nhóm 8546 dùng chiều vật liệu** (op `LA` / `chatLieu`).

### 2.2 Ràng buộc cứng: máy KHÔNG chốt được sang phân nhóm khác

`lib/so-tay-gates.js:73` và `:78` (`dong8HieuLuc`) lọc ứng viên theo **đúng phân nhóm 6 số**:

```js
if (h.length !== 8 || h.slice(0, 6) !== s6) continue;
```

Nên khi hỏi `pn6 = 854620`, tập ứng viên chỉ có `85462010` + `85462090`; `chotDong8` (`:647`) **không bao giờ**
trả `85469000`. Mà theo cây HS, `85469000` là **anh em cùng cấp với `854620`**, không phải con của nó:

```
T.conTang('8546') = ['85461000', '854620', '85469000']   // 85469000 nằm NGANG HÀNG với 854620
```

⇒ Muốn chốt `85469000` cho hàng nhựa/cao su, máy **phải vượt biên phân nhóm** (đây đúng là nội dung
PA-2 "cổng chọn tiêu đề 6 số": vật liệu quyết định **tiêu đề**, chứ không chỉ đuôi 8 số).

### 2.3 Cổng chấm bắt buộc phải **chốt** đúng dòng, không được "không chốt"

`scripts/bo-kiem-luat.mjs:498` và `:505`:

- `chotVao === hs8Dung` (85469000) ⇒ **ĐẠT**;
- máy **mất chốt** (`chotVao = null`) mà cơ sở cũ vốn `CHOT` ⇒ **ĐỔI_HÀNH_VI** (biên bản soát vòng 3 của GĐ
  đã siết đúng quy tắc này).

⇒ Chỉ "hỏi lại khách" là **không đạt** nghiệm thu. T2 phải **CHOT 85469000** cho hàng nhựa/cao su
(đúng như GĐ ghi trong biên bản PR #1255: *"kỳ vọng T2 là chốt đúng dòng vật liệu (CHOT 85469000…),
không phải 'không chốt nữa'"*).

### 2.4 Vì sao 8546-008 (composite) được phép còn đỏ

`MATERIALS` không có "composite" ⇒ máy **không đọc được vật liệu** ⇒ không dám chuyển dòng (đúng tinh thần
"trích sai mã tệ hơn không trích"). T2 phải giữ hành vi cũ cho ca này (chốt 85462010 ⇒ vẫn ĐỎ, `doCanT3`)
**và tuyệt đối không được biến nó thành ĐỔI_HÀNH_VI**.

## 3. Hai phương án (cần GĐ chốt phương án)

### PA-A — Bật phân giải vật liệu ở TẦNG TIÊU ĐỀ 6 SỐ (đúng bản chất, sửa rộng)

Cho phép `chotDong8` xét **các dòng 8 số của cả nhóm** khi sổ tay nhóm khai báo phân biệt bằng vật liệu,
rồi áp điều kiện vật liệu cho từng tiêu đề 6 số của nhóm:

- `854610` "Bằng thuỷ tinh" ⇒ `85461000`
- `854620` "Bằng gốm, sứ" ⇒ `85462010` / `85462090`
- `854690` "Loại khác" (vật liệu tổng hợp: bazan nóng chảy, cao su cứng, plastic, vật liệu tổng hợp) ⇒ `85469000`

Cần: (1) mở ràng buộc ứng viên ở `dong8HieuLuc` (`:73/:78`) **có điều kiện opt-in từ dữ liệu** (không mở
đại trà ⇒ không nới thước cho 14491 ca); (2) cho dòng "Loại khác" có `dieuKienSo` được tính là dòng **có điều kiện**
thay vì "phần còn lại" (`laLkTran` / `isCondLine`); (3) điều kiện vật liệu phải có nghừa **"không nêu vật liệu ⇒
giữ hành vi cũ"** — đây là điểm khó: `op: 'LA'` hiện trả `CHUA_BIET` khi không đọc được vật liệu, nên dùng nguyên xi
sẽ biến `8546-011` (không nêu vật liệu) và `8546-008` (composite) thành ĐỔI_HÀNH_VI ⇒ **không đạt**.

### PA-B — Vá tối thiểu đúng phạm vi thẻ này (nhanh, đúng cổng, rủi ro thấp hơn)

Chỉ sửa `data/so-tay/8546.json` + một chỗ lib để **câu 8546 ở mức nhóm** (không đụng 14490 ca khác):

- `85462010`: thêm điều kiện vật liệu = "gốm sứ" (hoặc "không nêu vật liệu") ⇒ hàng nhựa/cao su **không còn** chốt 85462010;
- `85469000`: thêm điều kiện vật liệu = plastic/cao su/vật liệu tổng hợp, và cho nó **ứng viên ở pn6 854620**
  (tức mở đúng một ngoại lệ opt-in cho nhóm 8546).

PA-B là bản nhỏ của PA-A: cùng một lõi "ứng viên vượt biên pn6", nhưng khoanh vùng đúng nhóm 8546 để
đo được **delta 0** ở 14491 ca còn lại.

### Vì sao chưa vá trong nhịp này

Nhịp này đã hết giờ (CEO 12/11: tự kết thúc trước 23:59). Hai phương án trên đều **đổi ngữ nghĩa `chotDong8`**
(dùng chung với `lib/engine-loop.js`, `lib/ho-so/lat-1.js`) nên phải đo 3 chiều `--toan-bieu` (nền `origin/main`
vs nhánh) và bộ `--nhom=8546,8547` trước khi chốt — việc đó **không kịp trong một nhịp**, và vá dở để lại
chắc chắn làm hỏng nghiệm thu (xem §2.4: điều kiện vật liệu dở dang ⇒ 3 ca chuyển ĐỎ → ĐỔI_HÀNH_VI ⇒
vi phạm tiêu chí `DOI_HANH_VI = 0`).

## 4. Nghiệm thu khi vá (viết lại để người sau đo đúng)

```bash
node scripts/bo-kiem-luat.mjs --nhom=8546,8547 --json     # kỳ vọng: dat 32→35, do 4→1 (8546-008, canT3),
                                                            #          doiHanhVi = 0, nemLoi = 0
node scripts/bo-kiem-luat.mjs --toan-bieu --json          # nền origin/main vs nhánh:
                                                            #          chotSai 7→7, chotLoaiKhacSai 0→0, nemLoi 0→0
node scripts/test-ca-doi-chung-vat-lieu.mjs               # cổng của GĐ — KHÔNG sửa
```

Các mốc đo (bằng chứng trước/sau) phải dán vào PR + thẻ; **không** dùng `grep "ALL TESTS PASSED"` làm bằng chứng
(CLAUDE.md rule 9). CI phải xanh trên commit cuối.

## 5. Câu hỏi cho GĐ (chặn quyết định, không chặn việc đọc mã)

1. Chọn **PA-A** (sửa tầng tiêu đề 6 số cho mọi nhóm — đúng bản chất, rộng) hay **PA-B** (khoanh vùng 8546)?
   PA-A đụng ngữ nghĩa chung của `chotDong8` ⇒ cần kế hoạch đo riêng từng nhóm có "anh em phân biệt bằng vật liệu".
2. Ngữ nghĩa **"mô tả không nêu vật liệu"**: giữ hành vi cũ (chốt theo tiêu đề) hay hỏi lại khách?
   Khuyến nghị: **giữ hành vi cũ** — hỏi lại làm 4 ca `KHONG_NEU_VAT_LIEU` đổi hành vi ⇒ vi phạm tiêu chí
   không hồi quy (và `8546-008`/`8546-011` mất chốt ⇒ ĐỔI_HÀNH_VI).
3. "composite" (T3) có nằm trong phạm vi thẻ này không, hay để T3 như biên bản PR #1255 đã ghi?
