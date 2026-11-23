# Soạn BẢN ĐỒ QUAN HỆ cho các nhóm 4 số (khuôn bd4@1)

> Bạn nhận MỘT gói văn bản: với mỗi nhóm 4 số được giao, gói có tên nhóm, chú giải chi tiết (mỗi đoạn một id), các khoản Chú giải Chương / Phần có liên quan, ý kiến phân loại WCO, gợi ý từ sổ tay và DANH SÁCH LÁNG GIỀNG.
> Bạn KHÔNG phân loại một mặt hàng nào. Bạn chép lại, có cấu trúc, điều mà chữ luật trong gói nói về: (1) nhóm đó là hàng gì theo NGHĨA, (2) nhóm đó khác các nhóm láng giềng ở đặc điểm nào.
> Máy kiểm từng chữ trích. Viết điều luật không nói là bị trả về. Không chắc thì ghi vào `khongChac`, đừng đoán.

## 0. Vì sao có bản đồ này

Bước chọn nhóm 4 số phải so khớp theo NGHĨA, không bắt từng chữ trong tên nhóm. Người phân loại (hoặc một AI mạnh) hiểu hàng trước theo các trục: **dạng vật lý, chất liệu, chức năng / cơ chế, dùng ở đâu, ai dùng, là bộ phận của gì**. Bản đồ cho mỗi nhóm một HỒ SƠ theo đúng các trục đó, cộng các CẠNH phân biệt giữa nhóm với những nhóm hay bị nhầm. Mọi thứ phải có căn cứ nguyên văn trong gói. Đây là việc của Quy tắc 1 (tìm đoạn văn bản luật nhắc tới hàng): chữ luật quyết định, không phải tên thương mại, không phải tờ khai cũ.

## 1. Đầu ra

Trả đúng MỘT khối ```json chứa MẢNG, mỗi nhóm một đối tượng:

```json
[
  {
    "nhom": "<4 số>",
    "kieuNhom": "THEO_CHUC_NANG | THEO_VAT_LIEU | BO_PHAN | CON_LAI | HANG_CU_THE",
    "hoSo": {
      "chucNang":        [ { "y": "…", "trich": "…", "nguon": "<id>" } ],
      "coChe":           [ { "y": "…", "trich": "…", "nguon": "<id>" } ],
      "dangVatLy":       [ { "y": "…", "trich": "…", "nguon": "<id>" } ],
      "chatLieu":        [ { "y": "…", "trich": "…", "nguon": "<id>" } ],
      "oDauAiDung":      [ { "y": "…", "trich": "…", "nguon": "<id>" } ],
      "hangDuocNeu":     [ { "ten": "…", "trich": "…", "nguon": "<id>" } ],
      "dieuKienBatBuoc": [ { "y": "…", "trich": "…", "nguon": "<id>" } ]
    },
    "canh": [
      {
        "den": "<4 số láng giềng>",
        "loai": "PHAN_BIET | LOAI_TRU | BAO_TRUM | BO_PHAN_CUA",
        "dacDiem": "đặc điểm quan sát / hỏi được ở hàng",
        "neu": "điều kiện thứ nhất, nói về hàng",
        "thi": "<4 số: nhóm chọn khi `neu` đúng>",
        "conNeu": "điều kiện còn lại, nói về hàng",
        "thiKia": "<4 số: nhóm chọn khi `conNeu` đúng>",
        "canCu": [ { "nguon": "<id>", "trich": "…" } ],
        "quyTac": "QT1 | 2a | 2b | 3a | 3b | 3c"
      }
    ],
    "khongChac": [ "…" ]
  }
]
```

Không thêm trường khác. Không viết lời giải thích ngoài khối JSON.

### Giới hạn đầu ra và cách nối

Mỗi lượt trả TỐI ĐA 8 nhóm (đầu ra có trần). Còn nhóm chưa soạn thì sau khối JSON thêm đúng một dòng `CON_LAI: <mã>, <mã>, …`; người dùng nhắn "tiếp" thì soạn các nhóm đó, theo cùng khuôn. Soạn hết thì dòng cuối là `HET`. Không bỏ nhóm nào im lặng: nhóm không soạn được thì vẫn có mục với `hoSo` các trục rỗng, `canh: []` và lý do trong `khongChac`.

## 2. Các trục của hồ sơ

Mỗi mục của một trục là MỘT ý. `y` là một cụm ngắn (≤ 12 từ) nói về HÀNG, không nói về tên nhóm.

| Trục | Hỏi gì | Ghi vào |
|---|---|---|
| `chucNang` | hàng LÀM VIỆC gì (kết quả cuối cùng) | "đóng ngắt mạch điện", "giặt vải dệt" |
| `coChe` | làm bằng CƠ CẤU / nguyên lý gì | "chuyển động quay", "dùng khí nén", "bán dẫn không tiếp xúc" |
| `dangVatLy` | nhìn / sờ thấy là gì: rắn, lỏng, bột, tấm, cuộn, chi tiết rời, bộ hoàn chỉnh, tháo rời | "dạng tấm", "bộ chưa lắp ráp" |
| `chatLieu` | làm bằng chất liệu nào, mức gia công nào. **Mảng rỗng = luật không giới hạn chất liệu** (đừng bịa) | "bằng plastic", "cao su lưu hóa" |
| `oDauAiDung` | dùng Ở ĐÂU / AI dùng / cho máy hay ngành nào | "dùng cho gia đình", "dùng trong công nghiệp" |
| `hangDuocNeu` | hàng cụ thể mà luật NÊU TÊN thuộc nhóm (mỗi hàng một mục, `ten` là tên hàng) | "công tắc", "cầu chì" |
| `dieuKienBatBuoc` | điều kiện luật đặt ra để hàng được vào nhóm (số đo, phạm vi, trạng thái) | "điện áp không quá 1000 V" |

Nếu nhóm là BỘ PHẬN của máy khác thì nêu "là bộ phận của <máy>" ở `dangVatLy` hoặc `oDauAiDung`, trích đoạn luật nói điều đó.

`kieuNhom`: `THEO_CHUC_NANG` (nhóm định nghĩa bằng việc hàng làm), `THEO_VAT_LIEU` (bằng chất liệu), `BO_PHAN` (nhóm bộ phận / phụ tùng), `HANG_CU_THE` (nhóm liệt kê tên hàng cụ thể), `CON_LAI` (nhóm "loại khác" của chương / phần). Chọn đúng một.

## 3. Các cạnh

Cạnh là một CÂU HỎI về hàng tách nhóm này khỏi một láng giềng. Mỗi cạnh nói: "đặc điểm X của hàng: nếu `neu` thì vào `thi`, còn nếu `conNeu` thì vào `thiKia`".

- `den`: chỉ được là một mã nằm trong DANH SÁCH LÁNG GIỀNG của CHÍNH nhóm đó trong gói. Không có láng giềng nào hợp thì `canh` là mảng rỗng.
- `loai`:
  - `PHAN_BIET`: hai nhóm cùng phạm vi, tách bằng một đặc điểm.
  - `LOAI_TRU`: luật nói hàng có đặc điểm X KHÔNG thuộc nhóm này mà thuộc `den` ("không bao gồm …", "trừ …", "thuộc nhóm …").
  - `BAO_TRUM`: một nhóm bao trùm nhóm kia, luật cho nhóm hẹp thắng hoặc nhóm rộng nhận phần còn lại.
  - `BO_PHAN_CUA`: hàng là bộ phận của máy / thiết bị ở nhóm kia (hoặc ngược lại).
- `dacDiem`: phải là đặc điểm QUAN SÁT HOẶC HỎI ĐƯỢC ở hàng: chức năng, cơ chế, vật liệu, mức gia công, công dụng chính, dạng, kích thước, điện áp… KHÔNG được là chữ của tên nhóm. Máy từ chối `dacDiem` chỉ lặp lại chữ trong tên của nhóm hoặc của `den` (mã lỗi `DAC_DIEM_LA_TEN_NHOM`).
  - ĐÚNG: "tín hiệu ra là đóng / ngắt mạch hay xử lý / đo"; "dùng cho điện áp trên hay không quá 1000 V"; "có làm kín bằng ren hay không".
  - SAI: "thiết bị điện để đóng ngắt mạch" (tên nhóm); "là hàng thuộc nhóm 8536".
- `neu` / `conNeu`: hai vế câu hỏi, đều nói về HÀNG, ngắn, đối lập nhau (không lặp cùng một vế).
- `thi` / `thiKia`: mỗi cái là một trong hai mã {nhóm đang soạn, `den`} và KHÁC nhau.
- `canCu`: ít nhất MỘT mục `{ nguon, trich }` làm chỗ dựa cho CẢ cạnh. Không có căn cứ thì không viết cạnh: ghi vào `khongChac`.
- `quyTac`: quy tắc phân loại mà căn cứ dựa vào. `QT1` (chữ nhóm, Chú giải Phần / Chương, chú giải chi tiết, ý kiến WCO: gần như luôn là `QT1` vì cạnh được dựng từ chữ luật). Chỉ dùng `2a`, `2b`, `3a`, `3b`, `3c` (Quy tắc tổng quát 2(a), 2(b), 3(a), 3(b), 3(c)) khi chính đoạn trích nói như vậy. Không viện dẫn `3a/3b/3c` khi `QT1` đã đủ.
- Cạnh có chiều: soạn cho nhóm A một cạnh A→B không thay cho cạnh B→A của nhóm B (nếu B cũng được giao). Nếu B được giao thì cạnh B→A phải CHỈ VỀ CÙNG nhóm khi cùng điều kiện: A nói "có X → A" thì B không được nói "có X → B". Máy bắt (`CANH_HAI_CHIEU_MAU_THUAN`).

## 4. Luật cứng (máy kiểm)

**L1. Trích nguyên văn.** Mọi `trich` là chuỗi con NGUYÊN VĂN, liền mạch của MỘT đoạn trong gói; `nguon` là id của đúng đoạn đó (dạng `ct.8536.3`, `chuong:84:chu_giai:1`, `phan:84:chu_giai:2`, `wco.848110/1`, `px16.cg2.a`…). Chép từng ký tự: giữ hoa thường, dấu, số, dấu câu. Chỉ được lược giữa câu bằng `…`; các đoạn hai bên phải đúng thứ tự trong cùng một đoạn. Một `trich` không vượt qua hai đoạn khác id. Tối đa 600 ký tự.
- ĐÚNG: `{ "nguon": "ct.8536.1", "trich": "các thiết bị điện dùng cho điện áp không quá 1000v" }` (nếu đúng như vậy trong đoạn).
- SAI: viết lại ý, dịch, thêm chữ "ví dụ", sửa 1.000 thành 1000, trích câu của đoạn khác nhưng ghi id này.

**L2. Chỉ dùng id có trong gói.** Không tự đặt id. Phần "Gợi ý từ sổ tay" KHÔNG có id: chỉ để định hướng, căn cứ phải trích từ đoạn có id.

**L3. Chỉ nhóm được giao.** Chỉ soạn nhóm trong danh sách đầu gói. Phần "LÁNG GIỀNG NGOÀI DANH SÁCH GIAO" chỉ để so sánh: không soạn hồ sơ cho các nhóm đó.

**L4. `den` nằm trong danh sách láng giềng của nhóm** (mục "DANH SÁCH LÁNG GIỀNG của …"). Không có thì không có cạnh.

**L5. Mỗi ý một mục.** Một chuỗi không được gói cả danh sách ("A, B và C", "A; B", "A hoặc B hoặc C"): tách thành nhiều mục, mỗi mục một ý, mỗi mục một `trich` thích hợp. Áp cho `y`, `ten`, `dacDiem`, `neu`, `conNeu`, `khongChac`.

**L6. Không suy rộng.** Điều luật không nói thì không ghi, dù ngoài đời đúng. Không lấy tên thương mại, thông tin quen biết ngoài gói, tờ khai, thông báo phân loại cũ làm căn cứ.

**L7. Vế loại trừ phải tách riêng.** Câu "trừ …", "không bao gồm …", "không kể …" thành mục / cạnh `LOAI_TRU` riêng, không nhét vào `hangDuocNeu` hay `dieuKienBatBuoc` của nhóm có chữ loại trừ đó.

**L8. Chú giải 2 Phần XVI (Ch.84 / 85).** Nhóm bộ phận máy theo đúng thứ tự: 2(a) nhóm định danh riêng thắng, rồi 2(b) bộ phận chỉ dùng cho một loại máy, rồi 2(c) còn lại. Những nhóm cùng được nêu trong một khoản (a)(b)(c) là láng giềng của nhau; cạnh giữa chúng dựa vào đoạn `px16.cg2.*`.

**L9. Không có căn cứ thì `khongChac`.** Mỗi mục là MỘT thiếu sót cụ thể (ví dụ "chú giải chi tiết nhóm không nói chất liệu"; "không có đoạn nào tách 8536 khỏi 8537 theo điện áp"). Không viết "không chắc" chung chung.

**L10. Trục không có căn cứ để rỗng.** `chatLieu` rỗng nghĩa là luật không giới hạn chất liệu. Trục khác rỗng bị báo vàng: chỉ để rỗng khi gói thật sự không có chữ nào cho trục đó, và ghi lý do trong `khongChac`.

## 5. Máy sẽ trả về những lỗi này

Chạy: `node scripts/kiem-ban-do-4so.mjs <tệp> --goi=<gói>.json` (danh sách đầy đủ: `--ma-loi`).

| Mã lỗi | Bạn đã làm gì | Sửa |
|---|---|---|
| `TRICH_KHONG_NGUYEN_VAN` | `trich` không là chuỗi con nguyên văn của đoạn có id `nguon` (hoặc > 600 ký tự) | L1 |
| `NGUON_KHONG_CO` | `nguon` là id không có trong gói | L1, L2 |
| `DEN_NGOAI_LANG_GIENG` | `den` ngoài danh sách láng giềng của nhóm | L4 |
| `NHOM_NGOAI_DANH_SACH` | soạn nhóm không được giao | L3 |
| `LIET_KE_MOT_CHUOI` | một chuỗi gói cả danh sách | L5 |
| `CANH_THIEU_CAN_CU` | cạnh không có `canCu` hợp lệ | L1, L9 |
| `DAC_DIEM_LA_TEN_NHOM` | `dacDiem` chỉ chép chữ của tên nhóm | mục 3 |
| `CANH_HAI_CHIEU_MAU_THUAN` | A nói X → A, B nói X → B | mục 3, cuối |
| `THI_SAI` | `thi` / `thiKia` không phải hai nhóm của cạnh, hoặc trùng nhau | mục 3 |
| `KHUON_SAI` | thiếu trường, sai kiểu, giá trị ngoài danh sách | mục 1 |
| `HO_SO_TRUC_TRONG` (vàng) | trục hồ sơ bỏ trống | L10 |

Một lỗi đỏ ở một nhóm làm nhóm đó không được nạp; các nhóm khác không bị ảnh hưởng.
