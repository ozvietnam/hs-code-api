/**
 * lib/ho-so/ma-loi.js — lời giải thích + cách sửa cho MỌI mã lỗi / cảnh báo của cổng ranh giới 6→8 số (#577, thợ rẻ).
 *
 * Mỗi mục: `giaiThich` (một câu tiếng Việt: máy thấy gì), `cachSua` (việc người soạn làm), `dung: true` khi đây là điều kiện
 * DỪNG — người soạn KHÔNG tự xử lý, báo Claude trên issue/PR (xem docs/giao-viec/so-tay/QUY-TRINH-SO-HOA.md).
 * Tra bằng mã đầy đủ (kèm hậu tố ":<mã dòng>:…"): lấy khoá dài nhất là tiền tố. Mã bọc `cong3-muc:<mã>:<lỗi sổ tay>` tra
 * tiếp phần lỗi sổ tay (dieu-kien-so-*, trich-*…).
 */
const D = (giaiThich, cachSua, dung = false) => ({ giaiThich, cachSua, ...(dung ? { dung: true } : {}) });
const BAO_CLAUDE = 'DỪNG: không tự xử lý — ghi ghiChuSoan {ma, loai: "DUNG", ghiChu} và báo Claude trên issue.';

const MA_LOI = {
  // ── cổng 0: hình dạng, nhãn, quy trình
  'cong0-khong-phai-object': D('Tệp nháp không phải object JSON.', 'Tạo lại bằng --tao-nhap hoặc --ap-spec, không sửa tay.'),
  'cong0-phien-ban': D('phienBan của nháp không phải "ranh-gioi@1".', 'Tạo lại bằng --ap-spec (máy ghi đúng phiên bản).'),
  'cong0-pn6-lech': D('pn6 trong tệp khác tên tệp / --pn6.', 'Sửa "pn6" trong spec cho đúng phân nhóm rồi chạy lại --ap-spec.'),
  'cong0-phan-nhom-khong-co-trong-cay': D('Mã 6 số không có trong cây HS.', `Kiểm lại mã. ${BAO_CLAUDE}`, true),
  'cong0-phan-nhom-mot-dong': D('Phân nhóm chỉ có một dòng 8 số — không có ranh giới để số hoá.', `${BAO_CLAUDE}`, true),
  'cong0-thieu-nguoi-soan': D('Thiếu soanBoi.phien.', 'Ghi "phien" trong spec theo quy ước <định danh>#soan-<nhãn>.'),
  'cong0-trang-thai': D('trangThai không thuộc NHAP/DUYET/TRA_VE.', 'Không sửa trangThai bằng tay; --ap-spec tự đặt NHAP.'),
  'cong0-khong-phai-mang': D('Một trường phải là mảng (dong8, dieuKienNut, chongLanVanBan…) nhưng không phải.', 'Viết lại spec đúng lược đồ (xem --help).'),
  'cong0-ngoai-phan-nhom': D('Mục có mã không thuộc phân nhóm (hoặc tiêu đề không có trong cây).', 'Chỉ dùng mã có trong --goi của chính phân nhóm.'),
  'cong0-trung': D('Một mã xuất hiện hai lần.', 'Mỗi mã chỉ một mục trong spec.'),
  'cong0-nhan': D('Nhãn nguonLoai sai (nháp phải AI_DA_KIEM; chỉ bản DUYET mới CLAUDE_DUYET).', 'Không ghi nguonLoai — --ap-spec tự gán AI_DA_KIEM. Không bao giờ tự gắn CLAUDE_DUYET.'),
  'cong0-thieu-dieu-kien-so': D('Mục thiếu mảng dieuKienSo.', 'Ghi "dieuKienSo": [] (để trống) hoặc danh sách điều kiện.'),
  'cong0-fact-chua-co-kieu': D('Điều kiện dùng khoá không có trong tu-vung@1 (fact cũ snake_case, thiếu fact).', 'Chỉ dùng khoá in bởi --tu-vung. Không có khoá phù hợp ⇒ THIEU_KHOA_TU_VUNG: để trống dieuKienSo, ghi ghiChuSoan {ma, loai: "THIEU_KHOA_TU_VUNG", khoaDeXuat, ghiChu} — DỪNG, báo lại.', true),
  'cong0-hoac-hinh-dang': D('HOAC sai hình dạng: cần {op:"HOAC", phuongAn:[[đk…],[đk…]]} — ≥ 2 phương án, mỗi phương án không rỗng, không lồng HOAC, không chieu.', 'Viết lại HOAC đúng hình dạng; mỗi vế là điều kiện có kiểu bình thường.'),
  'cong0-chong-lan-hinh-dang': D('Mục chongLanVanBan sai hình dạng (cap phải là 2 mã 8 số khác nhau).', 'Viết {cap: ["<hsA>", "<hsB>"], lyDo: "…"}.'),
  'cong0-chong-lan-ngoai-phan-nhom': D('Cặp chongLanVanBan có mã ngoài phân nhóm.', 'Chỉ dùng mã dòng 8 số của chính phân nhóm.'),
  'cong0-chong-lan-trung': D('Khai trùng một cặp chongLanVanBan.', 'Xoá cặp trùng (thứ tự trong cặp không quan trọng).'),
  'cong0-chong-lan-thieu-ly-do': D('Cặp chongLanVanBan không có lyDo.', 'Ghi lyDo trích nguyên văn (ngoặc kép) chữ biểu của CẢ HAI nhánh và vì sao không có căn cứ thứ tự.'),
  'cong0-phan-con-lai-hinh-dang': D('phanConLai phải là true hoặc mảng mã anh em không rỗng.', 'Ghi "phanConLai": true (phủ định mọi anh em đứng trước) hoặc ["<mã anh em>", …].'),
  'cong0-phan-con-lai-thua': D('phanConLai trên dòng/tiêu đề "Loại khác…" — vốn đã phủ định mọi anh em.', 'Xoá phanConLai khỏi mục này.'),
  'cong0-phan-con-lai-khong-co-anh-em-truoc': D('phanConLai: true nhưng mục đứng đầu tầng (không có anh em đứng trước).', 'Xoá phanConLai, hoặc liệt kê đúng anh em bằng mảng.'),
  'cong0-phan-con-lai-sai-anh-em': D('phanConLai liệt kê mã không phải anh em cùng tầng.', 'Chỉ liệt kê mã anh em (cùng cha trong cây --goi).'),
  'cong0-duyet-thieu': D('trangThai DUYET mà không có bản ghi duyệt.', 'Người soạn không đặt DUYET. Chỉ Claude chạy --duyet.'),
  'cong0-tu-duyet': D('Người duyệt là chính người soạn (cùng phiên, hoặc cùng định danh + nhãn chỉ đổi vai).', 'Không tự duyệt. Claude (phiên khác) duyệt.'),
  'cong0-sua-sau-duyet': D('Nội dung đổi sau khi duyệt (băm lệch).', 'Báo Claude: bản phải trả về (--tra-ve) rồi duyệt lại.', true),
  'cong0-phien-sai-quy-uoc': D('Phiên người soạn không theo quy ước <định danh>#soan-<nhãn> (bản cũ chỉ cảnh báo).', 'Ghi "phien" trong spec, vd https://claude.ai/code/session_…#soan-830220 hoặc cursor:<mô hình>:<yyyymmddThhmm>#soan-830220.'),
  'cong0-ghi-chu-hinh-dang': D('Mục ghiChuSoan không phải {ma, loai, ghiChu} (thiếu ma hoặc ghiChu).', 'Mỗi ghi chú: {"ma": "<mã|pn6|hsA+hsB>", "loai": "QUYET_DINH|DE_TRONG|CHONG_LAN|LECH_TIEN_LE|THIEU_KHOA_TU_VUNG|DUNG", "ghiChu": "…"}.'),
  'cong0-ghi-chu-loai': D('ghiChuSoan.loai không thuộc danh sách.', 'Dùng một trong QUYET_DINH, DE_TRONG, CHONG_LAN, LECH_TIEN_LE, THIEU_KHOA_TU_VUNG, DUNG.'),
  'cong0-ghi-chu-thieu-loai': D('ghiChuSoan thiếu loai (bản cũ — chỉ cảnh báo).', 'Thêm loai cho ghi chú.'),
  'cong0-ghi-chu-ma-la': D('ghiChuSoan.ma không phải mã dòng/tiêu đề/pn6/cặp của phân nhóm.', 'Ghi ma đúng mã có trong --goi (hoặc pn6, hoặc "hsA+hsB").'),
  'cong0-ghi-chu-thieu-khoa-de-xuat': D('Ghi chú THIEU_KHOA_TU_VUNG thiếu khoaDeXuat.', 'Thêm "khoaDeXuat": "<tên khoá camelCase đề xuất>".'),
  // ── cổng 1: phủ kín theo luật đi
  'cong1-chua-so-hoa': D('Một mục bắt buộc trên đường đi của dòng chưa có điều kiện (mã sau cùng = mục thiếu).', 'Thêm dieuKienSo cho mục đó trong spec. Không diễn đạt được bằng khoá có sẵn ⇒ để trống + ghiChuSoan DE_TRONG/THIEU_KHOA_TU_VUNG (bản sẽ đỏ — báo lại, không ép).'),
  'cong1-khong-phu-kin': D('Tầng không có con "Loại khác": có vector (kèm theo lỗi) thoả tầng cha mà không rơi vào con nào.', 'Đối chiếu biên ≤/< giữa các con (vd "không quá 16" và "trên 16"); sửa op/biên đúng chữ. Không thêm điều kiện chữ biểu không nói.'),
  'cong1-qua-nhieu-to-hop': D('(mã cũ, trước #653) Tầng có quá nhiều tổ hợp vector để thử — nay cổng lấy mẫu (cong1-lay-mau).', `${BAO_CLAUDE}`, true),
  'cong1-tieu-de-bi-luoc-ten': D('Tiêu đề trên đường đi bị lược tên (biểu thuế không có tên khớp đúng) — luật đi không đoán.', BAO_CLAUDE, true),
  'cong1-tang-bi-luoc': D('Tầng có ≥ 2 phần còn lại trần — cây theo chữ số đã lược một tầng có tên.', BAO_CLAUDE, true),
  'cong1-tang-khong-ma': D('Dòng nằm dưới một TẦNG KHÔNG MÃ có tên của biểu thuế (r<dòng>) — cây đã có nút <pn6>~r<dòng> — mà bản nháp bỏ qua (chưa khai điều kiện cho tầng).', 'Khai dieuKienNut cho id tầng "<pn6>~r<dòng>" (xem cây trong --goi; nguồn tieuDe.<pn6>~r<dòng> = tên nguyên văn của tầng). Không diễn đạt được bằng từ vựng ⇒ THIEU_KHOA_TU_VUNG.'),
  'cong1-tang-khong-ma-khong-dat': D('Dòng nằm dưới một TẦNG KHÔNG MÃ của biểu thuế (r<dòng>) mà lớp tầng không biểu diễn được (cắt ngang tiêu đề số, trùng tập khác tên…) — cổng không kiểm được ranh giới.', BAO_CLAUDE, true),
  'cong1-ma-khong-co-trong-cay': D('Mã dòng không có trong cây.', BAO_CLAUDE, true),
  'cong1-nhom-chua-co-so-tay': D('Nhóm 4 số chưa có sổ tay.', BAO_CLAUDE, true),
  // ── cổng 2: loại trừ lẫn nhau
  'cong2-chong-lan': D('Hai dòng cùng THOẢ trên một vector (in kèm). ":khong-tat-dinh" = có so chữ tự do.', 'Kiểm biên ≤/< và giá trị liệt kê; dùng CÙNG MỘT khoá cho các anh em; phần còn lại có tên ("… khác") ⇒ phanConLai. Chữ biểu THẬT SỰ tự chồng (hai câu không loại trừ nhau) ⇒ khai chongLanVanBan có lyDo trích cả hai nhánh. Do bộ so chữ / khác trục ⇒ để đỏ, báo lại.'),
  'cong2-chong-lan-van-ban': D('(cảnh báo) Cặp đã khai CHONG_LAN_VAN_BAN đúng là chồng lấn — lúc chạy không tự chốt.', 'Không cần sửa; người soát đọc lyDo.'),
  'cong2-chong-lan-van-ban-thua': D('Khai CHONG_LAN_VAN_BAN cho cặp KHÔNG chồng lấn.', 'Xoá cặp đó khỏi chongLanVanBan.'),
  'cong2-chong-lan-truc': D('Một nhánh chồng với ≥ 3 nhánh anh em — chồng lấn theo TRỤC (chia theo công dụng cạnh chia theo tên), không phải chữ biểu tự chồng.', BAO_CLAUDE, true),
  'cong2-qua-nhieu-to-hop': D('(cảnh báo) Dòng có quá nhiều tổ hợp vector; mẫu đã thử không vector nào tới dòng — chưa kết luận được là không tới được.', BAO_CLAUDE, true),
  'cong1-lay-mau': D('(cảnh báo) Tầng có hơn giới hạn tổ hợp vector (in: giới hạn/tổng) — cổng 1 đã thử một MẪU tất định, không vét cạn.', 'Không cần sửa; người soát biết phủ kín của tầng này chỉ kiểm theo mẫu (thongKe.layMau).'),
  'cong2-lay-mau': D('(cảnh báo) Cặp dòng có hơn giới hạn tổ hợp vector (in: giới hạn/tổng) — cổng 2 đã thử một MẪU tất định, không vét cạn; chồng lấn tìm thấy trong mẫu vẫn là lỗi.', 'Không cần sửa; người soát biết cặp này chỉ kiểm theo mẫu (thongKe.layMau).'),
  'cong2-dong-khong-toi-duoc': D('Không vector biên nào làm dòng này CO — mọi kiểm tra của nó là suông (xanh giả). Thường do cùng khoá chữ tự do ở tiêu đề và dòng con với hai giá trị khác nhau.', 'Xem cảnh báo cong2-diem-mu đi kèm; dùng khoá khác cho dòng con hoặc giá trị chứa cả chữ của tiêu đề (vẫn nguyên văn). Không sửa được ⇒ DỪNG, báo lại.'),
  'cong2-diem-mu': D('(cảnh báo) Cùng khoá chữ tự do ở nút trên và nút dưới với giá trị không thoả nhau — cổng không thử được nhánh dưới.', 'Như cong2-dong-khong-toi-duoc.'),
  // ── cổng 3: trích có thật
  'cong3-muc': D('Máy kiểm sổ tay từ chối mục (lỗi chi tiết sau mã).', 'Đọc phần sau dấu ":" thứ hai (--giai-thich với phần đó).'),
  'cong3-trich-doan-khong-co': D('Một đoạn lược "…" của câu trích không có trong nguồn.', 'Chép NGUYÊN VĂN từ nguồn in trong --goi; mọi đoạn giữa "…" phải có thật.'),
  'cong3-trich-sai-thu-tu': D('Các đoạn lược "…" đúng chữ nhưng sai thứ tự so với nguồn.', 'Xếp các đoạn theo đúng thứ tự xuất hiện trong nguồn.'),
  'cong3-nguon-sai-nut': D('Mục trích chữ của dòng/tiêu đề khác.', 'Dòng 8 số chỉ trích tax.<chính nó>; tiêu đề trích tieuDe.<chính nó> (hoặc SEN/chú giải đúng nút).'),
  'cong3-nguon-khong-nguyen-van': D('Nguồn không phải tệp NGUYEN_VAN (vd tệp AI_CHUA_KIEM).', 'Chỉ trích tax.*, tieuDe.*, sen.*, wco.*, chú giải nhóm/chương. Không bao giờ trích nguồn AI_CHUA_KIEM.'),
  'cong3-cuc-tinh-nguoc': D('Điều kiện CO/KHONG ngược cực so với chữ trích ("Không …" ⇒ op KHONG).', 'Đổi op cho đúng chữ.'),
  'cong3-bien-lech-chu': D('Biên số lệch chữ: "không quá" = <=, "dưới" = <, "trên" = >, "từ … trở lên" = >=.', 'Sửa op/value đúng chữ của câu trích.'),
  'cong3-bien-khong-doc-duoc': D('(cảnh báo) Bộ đọc không đọc được biên ≤/< từ câu trích — cổng không tự đối chiếu biên.', 'Tự kiểm lại op/value; người soát đối chiếu tay.'),
  'cong3-trich-qua-dai': D('Câu trích của mục có điều kiện dài quá 300 ký tự (LUAT-CHUNG luật 2).', 'Lược bằng "…" (giữ phần chứa bằng chứng của từng điều kiện; các đoạn đúng thứ tự).'),
  'cong3-chong-lan-thieu-trich': D('lyDo của chongLanVanBan không trích (ngoặc kép, nguyên văn) chữ biểu của nhánh chứa dòng này.', 'Thêm trích nguyên văn chữ của nhánh rẽ (dòng hoặc tiêu đề trên nó) vào lyDo, trong ngoặc kép.'),
  'cong3-phan-con-lai-khong-co-chu-khac': D('phanConLai trên mục mà câu trích không có chữ "khác".', 'Chỉ đánh phanConLai khi chữ biểu nói "… khác"; nếu không, xoá.'),
  // ── cảnh báo khác
  'so-chu-tu-do': D('(cảnh báo) Mục dùng so chữ tự do (TEN_LOAI/CONG_DUNG) — không tất định, lúc chạy không tự chốt.', 'Không cần sửa; ưu tiên khoá liệt kê/số/có-không khi chữ biểu cho phép.'),
  'nghi-phan-con-lai': D('(cảnh báo) Chữ của mục có "… khác" — có thể là phần còn lại có tên.', 'Nếu đúng nghĩa "các loại khác các dòng trên" ⇒ thêm "phanConLai": true (hoặc mảng anh em).'),
  'can-bang-hieu-chinh-tien-le': D('Phân nhóm có cờ canHieuChinhTienLe (data/ho-so/lat-1.json) mà bảng data/ho-so/hieu-chinh-tien-le.json chưa có mục nào cho PN6 này — chưa duyệt/áp được.', `Claude soạn mục bảng hiệu chỉnh (L1-4b, scripts/check-hieu-chinh.mjs) cho PN6 trước. ${BAO_CLAUDE}`, true),
  'can-bang-hieu-chinh-tien-le-da-co': D('(cảnh báo) Phân nhóm có cờ canHieuChinhTienLe và bảng data/ho-so/hieu-chinh-tien-le.json đã có mục cho PN6 này — duyệt/áp được.', 'Không cần sửa; soạn theo CHỮ BIỂU, ghi ghiChuSoan LECH_TIEN_LE trỏ mục bảng; người soát đọc mục bảng (LECH_CHUA_PHAN_XU / TIEN_LE_THAY_CHU_BIEU / KHONG_LECH).'),
  'chua-co-ban-nhap': D('Chưa có bản nháp của phân nhóm.', 'Chạy --ap-spec=<spec> (hoặc --tao-nhap) trước.'),
  THIEU_KHOA_TU_VUNG: D('Chữ biểu cần một khoá chưa có trong tu-vung@1 (tu-vung@1 khoá cứng theo bench — không tự thêm).', 'Để trống dieuKienSo của mục, ghi ghiChuSoan {ma, loai: "THIEU_KHOA_TU_VUNG", khoaDeXuat, ghiChu}, mở PR ở trạng thái DỪNG và báo lại. Xem docs/giao-viec/so-tay/de-xuat-tu-vung-2.md.', true),
  DUNG: D('Người soạn tự khai DỪNG (ghiChuSoan loai DUNG).', 'Báo Claude trên issue.', true),
  // ── lỗi spec (--ap-spec)
  'spec-hinh-dang': D('Spec sai lược đồ ranh-gioi-spec@1.', 'Xem mẫu trong --help và docs/giao-viec/so-tay/QUY-TRINH-SO-HOA.md.'),
  'spec-khoa-cam': D('Spec ghi khoá chỉ máy/Claude được ghi (nguonLoai, trangThai, duyet, soanBoi, traVe).', 'Xoá khoá đó khỏi spec.'),
  'spec-thieu-khoa-tu-vung': D('Spec dùng khoá không có trong tu-vung@1.', 'THIEU_KHOA_TU_VUNG — DỪNG (xem mục đó).', true),
  // ── lỗi sổ tay bọc trong cong3-muc (lib/so-tay.js#checkItem, lib/dieu-kien-so.js#kiemDieuKien)
  'nguon-khong-duoc-trich': D('Khoá nguon không có trong danh sách nguồn của nhóm.', 'Dùng đúng khoá nguồn in trong --goi (tax.<hs>, tieuDe.<id>, sen.…).'),
  'thieu-trich': D('Mục có điều kiện mà thiếu trich.', 'Bỏ trống "trich" trong spec để máy chép nguyên văn dòng, hoặc chép nguyên văn từ nguồn.'),
  'trich-qua-dai': D('Câu trích dài quá giới hạn máy sổ tay (600).', 'Lược bằng "…" xuống ≤ 300 ký tự.'),
  'trich-khong-co-trong-nguon': D('Câu trích không có nguyên văn trong nguồn.', 'Chép lại NGUYÊN VĂN (kể cả lỗi chính tả gốc); không diễn đạt lại.'),
  'nguon-loai-khong-hop-le': D('Nhãn nguonLoai lạ.', 'Không ghi nguonLoai.'),
  'dong8-khong-co-trong-bieu': D('Mã dòng không có trong biểu thuế.', 'Dùng mã in trong --goi.'),
  'dieu-kien-so-tren-dong-loai-khac': D('Dòng "Loại khác" trần mang điều kiện.', 'Để trống dieuKienSo của dòng "Loại khác" trần — máy tự phủ định anh em.'),
  'dieu-kien-nut-tren-tieu-de-loai-khac': D('Tiêu đề "Loại khác" trần mang điều kiện.', 'Xoá mục tiêu đề đó khỏi spec.'),
  'dieu-kien-nut-khong-phai-tieu-de': D('dieuKienNut trỏ vào mã không phải tiêu đề.', 'Tiêu đề là mã 7/5 số trong ngoặc [ ] của --goi.'),
  'dieu-kien-nut-thieu-dieu-kien': D('Mục tiêu đề không có điều kiện.', 'Thêm điều kiện hoặc bỏ mục.'),
  'dieu-kien-nut-chi-nhan-fact-tu-vung': D('Điều kiện tiêu đề không phải khoá tu-vung@1.', 'Chỉ dùng khoá in bởi --tu-vung.'),
  'dieu-kien-so-fact-khong-co-trong-tu-vung': D('Khoá không có trong tu-vung@1.', 'THIEU_KHOA_TU_VUNG — DỪNG.', true),
  'dieu-kien-so-op-sai-kieu': D('op không hợp với kiểu khoá.', 'Xem --tu-vung --khoa=<khoá>: SO dùng <=,<,>=,>; CO_KHONG dùng CO/KHONG; LIET_KE dùng TRONG; TEN_LOAI/CONG_DUNG dùng chính tên kiểu; chatLieu dùng LA.'),
  'dieu-kien-so-chieu-khong-hop-le': D('chieu phải là PHAI_CO hoặc PHAI_KHONG.', 'Sửa chieu.'),
  'dieu-kien-so-chieu-thua': D('chieu PHAI_KHONG trên khoá SO/CO_KHONG.', 'SO: đảo op; CO_KHONG: dùng op KHONG.'),
  'dieu-kien-so-value-khong-phai-so': D('value của điều kiện SO không phải số.', 'Ghi số (dấu chấm thập phân: 22.38), không ghi chuỗi.'),
  'dieu-kien-so-thieu-don-vi': D('Điều kiện SO thiếu donVi.', 'Ghi donVi đúng chữ trích (xem đơn vị của khoá ở --tu-vung).'),
  'dieu-kien-so-don-vi-lech-he': D('donVi không cùng hệ đơn vị của khoá.', 'Dùng đơn vị in ở --tu-vung --khoa=<khoá>.'),
  'dieu-kien-so-nguong-khong-co-trong-trich': D('Ngưỡng số không có trong câu trích.', 'Số phải có nguyên văn trong trich ("1.000" = 1000, "19,5" = 19.5).'),
  'dieu-kien-so-don-vi-khong-co-trong-trich': D('Đơn vị không có trong câu trích.', 'Ghi donVi đúng như chữ trích (vd "m³/h", "kW").'),
  'dieu-kien-so-co-khong-co-trong-trich': D('Câu trích không có mẫu đọc của khoá có-không.', 'Xem cachDoc của khoá ở --tu-vung; chọn khoá đúng hoặc trích đoạn có chữ đó.'),
  'dieu-kien-so-khong-khong-co-trong-trich': D('Câu trích không có mẫu đọc của khoá có-không.', 'Như trên.'),
  'dieu-kien-so-trong-value-rong-hoac-trung': D('TRONG cần mảng giá trị không rỗng, không trùng.', 'value: ["GIA_TRI", …] lấy từ --tu-vung.'),
  'dieu-kien-so-trong-gia-tri-ngoai-danh-sach': D('Giá trị liệt kê ngoài giaTriHopLe của khoá.', 'Chỉ dùng giá trị in ở --tu-vung --khoa=<khoá>.'),
  'dieu-kien-so-trong-khong-co-trong-trich': D('Câu trích không có cách đọc của giá trị liệt kê.', 'Mỗi giá trị cần một mẫu cachDoc có trong trich (xem --tu-vung).'),
  'dieu-kien-so-ten-loai-value-rong': D('TEN_LOAI rỗng.', 'value: chuỗi con nguyên văn của trich.'),
  'dieu-kien-so-ten-loai-khong-co-trong-trich': D('Giá trị TEN_LOAI không phải chuỗi con của câu trích.', 'Chép chuỗi con nguyên văn từ trich.'),
  'dieu-kien-so-cong-dung-value-rong': D('CONG_DUNG rỗng.', 'value: chuỗi con nguyên văn của trich.'),
  'dieu-kien-so-cong-dung-khong-co-trong-trich': D('Giá trị CONG_DUNG không phải chuỗi con của câu trích.', 'Chép chuỗi con nguyên văn từ trich.'),
  'dieu-kien-so-la-gia-tri-ngoai-danh-sach': D('Chất liệu ngoài danh sách của khoá chatLieu.', 'Dùng giá trị in ở --tu-vung --khoa=chatLieu.'),
  'dieu-kien-so-la-vi-tri-khong-hop-le': D('viTri không thuộc danh sách vị trí của chatLieu.', 'Dùng viTri in ở --tu-vung --khoa=chatLieu.'),
  'dieu-kien-so-la-khong-co-trong-trich': D('Câu trích không có cách đọc của chất liệu.', 'Trích đoạn có tên chất liệu.'),
  'dieu-kien-so-la-vi-tri-khong-co-trong-trich': D('Câu trích không có chữ của vị trí chất liệu.', 'Trích đoạn có chữ vị trí (vd "cách điện bằng").'),
  'dieu-kien-so-hoac-hinh-dang': D('HOAC sai hình dạng.', 'Xem cong0-hoac-hinh-dang.'),
  'dieu-kien-so-khong-hop-le': D('Điều kiện không phải object.', 'Viết lại điều kiện đúng lược đồ.'),
  'dieu-kien-so-thieu-fact': D('Điều kiện thiếu fact.', 'Ghi fact = khoá tu-vung@1.'),
};

/** Tra lời giải thích cho một mã (đầy đủ hoặc tiền tố). null khi không có. */
function giaiThich(maDayDu) {
  const s = String(maDayDu || '').trim();
  if (!s) return null;
  // cong3-muc:<mã>:<lỗi sổ tay> — giải thích phần lỗi sổ tay.
  const muc = s.match(/^cong3-muc:[^:]*:(.+)$/);
  if (muc) { const con = giaiThich(muc[1]); if (con) return { ...con, ma: s, boc: 'cong3-muc' }; }
  const dau = s.split(':')[0];
  let best = null;
  for (const k of Object.keys(MA_LOI)) if ((dau === k || dau.startsWith(`${k}-`) || s === k) && (!best || k.length > best.length)) best = k;
  if (!best) return null;
  return { ma: best, ...MA_LOI[best] };
}
const laDung = (maDayDu) => Boolean(giaiThich(maDayDu)?.dung);

module.exports = { MA_LOI, giaiThich, laDung };
