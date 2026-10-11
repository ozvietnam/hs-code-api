# data/wco-op — Tuyển tập ý kiến phân loại WCO (#196)

**Công khai từ 11/10/2026.** CEO Oz tuyên bố đã trả phí bản quyền và cho dùng công khai. Nội dung thuộc bản quyền của WCO và
**không** thuộc giấy phép CC BY-SA của kho dữ liệu — xem [`NOTICE.md`](../../NOTICE.md) mục "Nội dung của WCO".

| Tệp | Có trong git? | Là gì |
|---|---|---|
| `opinions.json` | ✅ | Các ý kiến phân loại đã tách từ bản OCR tiếng Anh: mã HS, thứ tự, năm thông qua, nguyên văn OCR, cờ độ tin cậy mã |
| `vi.json` | ✅ | Bản dịch tiếng Việt **không chính thức** theo `line` của từng ý kiến; chỗ nghi lỗi OCR ghi `[?]` |
| `so-tay-trich.json` | ✅ | Câu trích tiếng Anh dùng để máy kiểm các mục `yKienWco` của sổ tay (`data/so-tay`) |
| `README.md` | ✅ | Tệp này |
| PDF gốc (~136 MB), `*_OCR.md`, `*.pre-*.json`, `*-report.json`, `pages-en.jsonl` | ❌ | Tệp nặng/trung gian — `.gitignore` chặn (PDF vượt giới hạn 100 MB của GitHub) |

## Dùng thế nào
- API công khai: `GET /api/wco-opinions?hs=852852` (danh sách) và `?hs=852852&n=6` (toàn văn + bản dịch + nguồn). Chỉ trả ý kiến
  **đã qua cổng mã/thứ tự**; mọi phản hồi kèm `banQuyen`.
- Ý kiến `headingSuspect` (mã/thứ tự chưa đáng tin vì OCR làm rơi biển tiêu đề) **vẫn nằm trong `opinions.json`** nhưng
  API không bao giờ trả — lý do là độ chính xác, không phải bản quyền. Danh sách chờ OCR lại: `docs/giao-viec/wco-op-ocr-lai.md`.
- Nguyên văn là **bản OCR**: có thể sai chữ/ký tự. `daSoatAnh=false`: chưa đối chiếu ảnh trang gốc.

Quy trình sinh dữ liệu, cổng kiểm và các bài học: `docs/giao-viec/wco-op.md`.
