# M-33 — Nghĩa của cạnh dẫn chiếu, hai phiếu độc lập

Mỗi câu luật có dẫn chiếu (9.847 câu) đưa cho hai mô hình khác nhà: Gemma 31B (máy GPU nhà) và Gemini (agy), không thấy phiếu nhau, chỉ thấy câu + câu dẫn + tên đích. Máy ghép:

| Kết quả | Cạnh |
|---|---|
| LOAI_SANG | 9076 |
| GIU | 2586 |
| CHUA_RO | 2363 |
| GOM | 1903 |
| AP_DUNG | 1665 |
| DINH_NGHIA | 1049 |
| PHAN_VE | 752 |
| thiếu phiếu | 82 |
| **Cộng** | **19476** |

- `LOAI_SANG`: hàng nêu trong `dieuKien` không thuộc nút nguồn mà sang đích. `PHAN_VE`: đích nằm trong phạm vi nút nguồn (Chương nói hàng thuộc nhóm con). `GIU`: hai phiếu cùng nói không chuyển hướng nhưng khác tên (gồm / áp dụng / định nghĩa).
- `dieuKien` phải là chữ nguyên văn của câu hoặc câu dẫn (cổng `nghia.mjs --kiem` trong CI).
- Hai phiếu lệch ở chuyện có chuyển hướng hay không: `CHUA_RO`, cạnh vẫn còn, người đọc phải tự đọc câu.
- QT đọc tay 40 cạnh `LOAI_SANG` ngẫu nhiên: không sai nghĩa; vài điều kiện hẹp hơn câu ("các bộ phận của chúng") nên người đọc vẫn phải xem câu dẫn.
