# Bench mô tả ECUS + soát cặp mô tả/mã

Bench đo chất lượng mô tả khai báo ECUS và độ nhạy của bộ soát (Đợt 0C). Thiết kế: ozplugin
`docs/gd/ghi-nhan-mo-ta-ecus.md`, mục 15, 27 và 36.

Chạy trước và sau mỗi thay đổi ở `describe` hoặc soát, rồi so với số nền `mo-ta-baseline-2026-10-29.md`.

## Tệp

| Tệp | Commit? | Nội dung |
|---|---|---|
| `data/bench/mo-ta-bo-de.json` | có | 38 ca công khai do Claude chấm duyệt (`CLAUDE_DUYET`) |
| `scripts/check-mo-ta-bo-de.mjs` | có | máy kiểm bộ đề |
| `scripts/bench-mo-ta.mjs` | có | bench sinh và soát |
| `scripts/mo-ta-bench-lib.mjs` | có | hàm chấm dùng chung |
| `data/oz-export/bench/*.jsonl` | **không** (gitignore) | chi tiết từng ca, có câu Oz |
| `scripts/do-lat-1.mjs` → `data/ho-so/lat-1.json` | có (chỉ tỉ lệ + mã) | chốt 50 phân nhóm lát 1, trần Pareto, tỉ lệ máy chốt — báo cáo `lat-1-2026-10-30.md` |

Bộ đề lấy dữ liệu từ hai nguồn: TB-TCHQ (`data/precedents.json`) hoặc hàng tự dựng theo biểu thuế và chú giải. Mỗi ca có:
- mã 8 số và thông tin hàng;
- các dữ kiện quyết định cấp 4/6/8/loại trừ, mỗi dữ kiện kèm `nguon` + `trich` nguyên văn;
- `bangChungHang` (nếu có), nhóm cạnh tranh, câu `moTaMau` ≤200 ký tự và ca cài lỗi.

Ca chữ biểu thuế và tiền lệ lệch nhau mang `lechTienLe: true`, không chọn bên. Dữ kiện không trích được căn cứ mang
`khongDuCanCu: true`.

## Kiểm bộ đề

```
node scripts/check-mo-ta-bo-de.mjs            # XANH / ĐỎ (exit 1)
```

Máy đỏ khi gặp một trong các lỗi sau:
- sai cấu trúc;
- mã không có trong `tax.json`;
- `trich` không có nguyên văn trong tệp nguồn (hỗ trợ `.json`, `.jsonl`, `.jsonl.gz`, kèm `viTri` nếu có);
- nguồn là tệp `AI_CHUA_KIEM`, theo `lib/nguon-loai.js`;
- `moTaMau` dài hơn 200 ký tự, có "xuất xứ" hoặc chữ cấm, hay không chứa dữ kiện của chính ca;
- nhãn duyệt khác `CLAUDE_DUYET`;
- ca `lechTienLe` thiếu căn cứ hai bên;
- bộ đề chứa câu Oz (đối chiếu `data/oz-gold-final.jsonl` nếu có).

## Chạy bench

```
# Sinh mô tả — LLM mock (mặc định, không gọi mạng)
node scripts/bench-mo-ta.mjs --mode=sinh --nguon=oz --n=200        # mẫu Oz, tập giữ riêng
node scripts/bench-mo-ta.mjs --mode=sinh --nguon=bo-de             # bộ đề công khai, chấm thêm % dữ kiện quyết định

# LLM thật (tốn tiền — luôn có trần --max-llm, mặc định 20)
node scripts/bench-mo-ta.mjs --mode=sinh --nguon=bo-de --llm=that --max-llm=20          # cần khoá trong env
node scripts/bench-mo-ta.mjs --mode=sinh --nguon=bo-de --n=20 --api=https://hs-kb.uythacnhapkhau.com --max-llm=20

# Soát cặp mô tả + mã: ca chuẩn + ca cài lỗi (bỏ dữ kiện / đổi anh em)
node scripts/bench-mo-ta.mjs --mode=soat --nguon=oz --n=200        # K1 + K2 tất định
node scripts/bench-mo-ta.mjs --mode=soat --nguon=bo-de --llm=that --k2 --max-llm=20      # bật K2 (LLM)
```

Tham số khác:

| Tham số | Mặc định | Tác dụng |
|---|---|---|
| `--chuong=85,84` | — | chỉ chạy các chương này |
| `--seed=42` | 42 | hạt giống lấy mẫu |
| `--out=data/oz-export/bench` | `data/oz-export/bench` | thư mục ghi chi tiết |
| `OZ_GOLD_PATH` (biến môi trường) | — | chỉ tới oz-gold nếu không nằm ở `data/` |

## Luật bench tự giữ

- **Giấu mẫu đang chấm:** mẫu Oz chỉ lấy trong tập giữ riêng của `lib/holdout.js`. Bench đặt
  `HS_EVAL_EXCLUDE_HOLDOUT=1`; khi gọi HTTP thì gửi header `X-OZ-Eval-Holdout: 1`.
- **Riêng tư:**
  - Trước khi ghi, bench chạy `git check-ignore` lên tệp chi tiết. Tệp không bị ignore thì từ chối ghi.
  - Bảng in ra chỉ có số.
  - Dữ liệu Oz chạy với LLM thật thì bench đặt `HS_LLM_PRIVATE_ALL=true`.
  - `--api` với nguồn Oz bị từ chối nếu không có `HS_SERVICE_TOKEN`, vì lượt công khai không đi chế độ riêng tư.
- **Mock** chỉ dội lại trường đầu vào vào `declaration`, và tắt tra web/SHTT. Nó đo phần tất định sau LLM: neo biểu thuế,
  ghép, vòng 2, chấm điểm. Nó không đo chất lượng câu của LLM.
- **Bench chỉ gọi, không sửa** `lib/describe-*`, `lib/declaration-check.js`, `lib/evidence-pack.js`,
  `lib/so-tay-runtime.js`.
