# Sửa tay cho M-13 (chuong.py đọc). Mỗi mục có trang và lý do. SUA chỉ được xếp lại chữ (script kiểm cùng bộ chữ), không thêm bớt.
SUA = [
 {'trang': 103, 'lyDo': 'đầu bảng Chú giải 2 Chương 11 vỡ cột (đối chiếu ảnh trang): chữ giữ nguyên, xếp lại theo cột',
  'tim': ['Tỉ lệ lọt qua sàng so với kích thước', 'Hàm lượng tinh Hàm lượng mắt sàng', 'Ngũ cốc', 'bột tro', '315 micron 500 micron', '(1) (2) (3) (4) (5)', '- Lúa mì và lúa', '45% 2,5% 80% -', 'mạch đen'],
  'thay': ['Ngũ cốc   Hàm lượng tinh bột   Hàm lượng tro   Tỉ lệ lọt qua sàng so với kích thước mắt sàng', '315 micron   500 micron', '(1)   (2)   (3)   (4)   (5)', '- Lúa mì và lúa mạch đen   45%   2,5%   80%   -']},
 {'trang': 104, 'lyDo': 'đầu bảng lặp lại ở trang sau, vỡ cột như trên',
  'tim': ['Tỉ lệ lọt qua sàng so với kích thước', 'Hàm lượng tinh Hàm lượng mắt sàng', 'Ngũ cốc', 'bột tro', '315 micron 500 micron'],
  'thay': ['Ngũ cốc   Hàm lượng tinh bột   Hàm lượng tro   Tỉ lệ lọt qua sàng so với kích thước mắt sàng', '315 micron   500 micron']},
 {'trang': 1072, 'lyDo': 'đầu bảng Chú giải phân nhóm 2(b) Chương 48 vỡ cột (đối chiếu ảnh trang)',
  'tim': ['Độ bền xé tối thiểu Độ bền kéo tối thiểu', 'Định lượng (mN) (kN/m)', '(g/m²) Chiều dọc + Chiều dọc +', 'Chiều dọc Chiều ngang', 'chiều ngang chiều ngang'],
  'thay': ['Định lượng (g/m²)   Độ bền xé tối thiểu (mN)   Độ bền kéo tối thiểu (kN/m)', 'Chiều dọc   Chiều dọc + chiều ngang   Chiều ngang   Chiều dọc + chiều ngang']},
 {'trang': 1581, 'lyDo': 'đầu bảng Chú giải 1(a) Chương 74 vỡ cột',
  'tim': ['Hàm lượng giới hạn', 'Nguyên tố', '(% khối lượng)'], 'thay': ['Nguyên tố   Hàm lượng giới hạn (% khối lượng)']},
 {'trang': 1605, 'lyDo': 'đầu bảng Chú giải phân nhóm 1(a) Chương 76 vỡ cột (đối chiếu ảnh trang); hai hàng số 1 và 0.1(2) PDF in dính một hàng, giữ nguyên',
  'tim': ['Giới hạn hàm', 'Nguyên tố lượng % theo', 'khối lượng'], 'thay': ['Nguyên tố   Giới hạn hàm lượng % theo khối lượng']},
 {'trang': 1073, 'lyDo': 'bảng công thức trong chú giải chi tiết phân nhóm (kq) vỡ hai cột; thứ tự theo pdftotext -raw',
  'tim': ['Độ bền xé, chiều dọc (nM) (được làm tròn tới 0 hoặc 5 Định lượng cơ bản (g/m2) x 13.23', 'millinewton gần nhất) – 94.64', 'Độ bền xé, chiều dọc cộng chiều ngang (mN) (được làm Định lượng cơ bản (g/m2) x 28.22', 'tròn như đã nêu trên) – 186.2'],
  'thay': ['Độ bền xé, chiều dọc (nM) (được làm tròn tới 0 hoặc 5 millinewton gần nhất)   Định lượng cơ bản (g/m2) x 13.23 – 94.64', 'Độ bền xé, chiều dọc cộng chiều ngang (mN) (được làm tròn như đã nêu trên)   Định lượng cơ bản (g/m2) x 28.22 – 186.2']},
 {'trang': 1074, 'lyDo': 'như trên, phần tiếp ở trang sau',
  'tim': ['Độ bền xé, chiều dọc (nM) (được làm tròn tới 0 hoặc 5 Định lượng cơ bản (g/m2) x 13.23', 'millinewton gần nhất) – 94.64', 'Định lượng cơ bản (g/m2) x 0.0449', 'Độ bền kéo, chiều ngang (kN/m)', '– 0.8186', 'Định lượng cơ bản (g/m2) x 0.1143', 'Độ bền kéo, chiều dọc cộng chiều ngang (kN/m)', '– 0.829'],
  'thay': ['Độ bền xé, chiều dọc (nM) (được làm tròn tới 0 hoặc 5 millinewton gần nhất)   Định lượng cơ bản (g/m2) x 13.23 – 94.64', 'Độ bền kéo, chiều ngang (kN/m)   Định lượng cơ bản (g/m2) x 0.0449 – 0.8186', 'Độ bền kéo, chiều dọc cộng chiều ngang (kN/m)   Định lượng cơ bản (g/m2) x 0.1143 – 0.829']},
]
DOI = [
 {'trang': 1605, 'dau': 'Fe+ Si (Sẳt', 'moi': True, 'lyDo': 'hàng bảng'},
 {'trang': 1262, 'dau': 'Tuy nhiên, nhóm này không áp dụng cho các tấm', 'toi': 'chuong:59:cg:5', 'lyDo': 'đoạn kết của cả khoản 5'},
 {'trang': 103, 'dau': 'Ngũ cốc Hàm', 'toi': 'chuong:11:cg:2', 'lyDo': 'bảng thuộc cả khoản 2 (Cột 2–5 dùng ở (A) và (B))'},
 {'trang': 103, 'dau': '(1) (2)', 'lyDo': 'số cột của bảng, không phải điểm'},
 {'trang': 1605, 'dau': '(1) Các nguyên tố khác, ví dụ', 'moi': True, 'lyDo': 'chú thích bảng, không phải điểm'},
 {'trang': 1697, 'dau': '(1) trong hệ', 'lyDo': 'PDF in "(1)" giữa câu, không phải điểm'},
]
# id mà đoạn in sát lề trái ngay sau vẫn thuộc chính nó
GIU = {
 'chuong:11:cg:2:B': 'tr.103: câu "Các trường hợp khác…" tiếp nối (B)',
 'chuong:61:cg:3:a': 'tr.1286: đoạn lề trái sau gạch đầu dòng vẫn giải thích khái niệm của điểm này',
 'chuong:61:cg:3:b': 'tr.1287: đoạn lề trái sau gạch đầu dòng vẫn giải thích khái niệm của điểm này',
 'chuong:62:cg:3:a': 'tr.1307: đoạn lề trái sau gạch đầu dòng vẫn giải thích khái niệm của điểm này',
 'chuong:62:cg:3:b': 'tr.1308: đoạn lề trái sau gạch đầu dòng vẫn giải thích khái niệm của điểm này',
 'chuong:61:cg:7:b': 'tr.1288: đoạn lề trái sau gạch đầu dòng vẫn giải thích khái niệm của điểm này',
 'chuong:62:cg:7:b': 'tr.1309: đoạn lề trái sau gạch đầu dòng vẫn giải thích khái niệm của điểm này',
 'chuong:72:cg:1:d': 'tr.1495: định nghĩa nhiều đoạn, PDF in thân định nghĩa sát lề trái',
 'chuong:72:cg:1:ij': 'tr.1497: định nghĩa nhiều đoạn, PDF in thân định nghĩa sát lề trái',
 'chuong:72:cg:1:k': 'tr.1497: định nghĩa nhiều đoạn, PDF in thân định nghĩa sát lề trái',
 'chuong:72:cg:1:n': 'tr.1498: định nghĩa nhiều đoạn, PDF in thân định nghĩa sát lề trái',
 'chuong:84:cg:6:C': 'tr.1695: câu bàn phím, ổ đĩa tiếp nối (C)',
 'chuong:85:cg:12:b:iv:3:a': 'tr.1974: các đoạn định nghĩa tiếp theo thuộc tiểu điểm này',
 'chuong:74:cg:1:a': 'tr.1581: bảng/đoạn sát lề trái thuộc điểm (a)',
 'chuong:74:cgpn:1:a': 'tr.1582: bảng/đoạn sát lề trái thuộc điểm (a)',
 'chuong:75:cgpn:1:a': 'tr.1597: bảng/đoạn sát lề trái thuộc điểm (a)',
 'chuong:76:cgpn:1:a': 'tr.1605: bảng/đoạn sát lề trái thuộc điểm (a)',
 'chuong:80:cgpn:1:a': 'tr.1627: bảng/đoạn sát lề trái thuộc điểm (a)',
 'chuong:79:cgpn:1:c': 'tr.1621: câu rây 63 micromét thuộc định nghĩa bụi kẽm',
 'chuong:85:cg:12:a:i': 'tr.1972: các đoạn định nghĩa tiếp theo thuộc tiểu điểm này',
 'chuong:85:cg:12:b:iv': 'tr.1974: các đoạn định nghĩa tiếp theo thuộc tiểu điểm này',
}
# đoạn kết sau id này thuộc id khác nút cha mặc định
TOI = {
 'chuong:11:cg:2:A:b': 'chuong:11:cg:2:A',  # tr.103
 'chuong:84:cg:6:C:iii': 'chuong:84:cg:6:C',  # tr.1695
 'chuong:75:cgpn:1:a:ii': 'chuong:75:cgpn:1:a',  # tr.1597
}
