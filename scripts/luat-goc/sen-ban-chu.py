#!/usr/bin/env python3
"""M-16 — dựng bản chữ đối chiếu sen.txt từ các lần đọc KHÁC của cùng bản Word gốc (không đọc data/).

    antiword <tệp .doc> > raw.txt ; soffice --convert-to pdf <tệp .doc> ; pdftotext -raw <pdf> pdf.txt
    python3 scripts/luat-goc/sen-ban-chu.py raw.txt pdf.txt > <thư mục riêng>/sen.txt
    LUAT_GOC_TXT=<thư mục riêng> node scripts/kiem-luat-goc.mjs sen

Tham số thứ ba (tệp .docx) tuỳ chọn: thêm nguyên đoạn cho đúng 14 mục có bảng nhiều cột hoặc hình đôi, vì hai lần
đọc trên xếp ô theo thứ tự khác nên không nối liền được; các mục này đã soi ảnh trang. Không có tham số thứ ba thì
cổng phải đỏ đúng các mục đó và không mục nào khác.

Bản antiword ngắt dòng trong từng ô; ở đây chỉ nối dòng theo cột. Bản PDF giữ nguyên, chỉ bỏ số trang.
"""
import re
import sys
from pathlib import Path


def cot(dong):
    return tuple(i for i, c in enumerate(dong) if c == '|')


def xep(tep):
    """Hai luồng: mọi cột lần lượt; và luồng tiếng Việt liền mạch (cột trái của hàng hai cột + hàng không chia)."""
    ra, viet, nhom = [], [], []

    def xa():
        if not nhom:
            return
        cs = [d[1:-1].split('|') for d in nhom]
        so = len(cs[0])
        cot_ = [' '.join(c[k].strip() for c in cs if c[k].strip()) for k in range(so)]
        ra.extend(cot_)
        if so % 2 and so > 1 and not cot_[so // 2]:
            viet.extend(cot_[:so // 2])
        else:
            viet.extend(cot_)
        nhom.clear()

    for d in open(tep, encoding='utf-8'):
        d = re.sub(r'\[pic\]', lambda m: ' ' * 5, d.rstrip('\n'))
        if d.startswith('|') and d.endswith('|'):
            if nhom and cot(nhom[0]) != cot(d):
                xa()
            nhom.append(d)
        else:
            xa()
            ra.append(d.strip())
            viet.append(d.strip())
    xa()
    return '\n'.join(x for x in viet if x) + '\n\f' + '\n'.join(ra)


BANG_HINH_DOI = [
    '0704.90.20', '0901.11.20 0901.12.20 0901.21.11', '0901.11.30 0901.12.20 0901.21.12', '2009.89.30', '2106.90.93',
    '3917.32.20', '4001.21', '4001.22.10 4001.22.20 4001.22.30 4001.22.40 4001.22.50 4001.22.60',
    '4810.13.10 4810.14.10 4810.19.10 4810.22.10 4810.29.10', '4823.90.91', '8414.60.11 8414.80.11', '8419.50.20', '8423.90.30',
    '4804.39.20 4804.42.10 4804.49.10 4804.52.10 4804.59.10',
]


def main():
    anti, pdf = sys.argv[1:3]
    p = open(pdf, encoding='utf-8').read()
    p = '\n'.join(re.sub(r'\n\s*\d{1,3}\s*$', '\n', t.rstrip()) for t in p.split('\f'))
    sys.stdout.write(xep(anti) + '\n\f' + p)
    if len(sys.argv) > 3:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import sen
        for m in sen.doc_muc(sys.argv[3])[0]:
            if m['so'] in BANG_HINH_DOI:
                sys.stdout.write('\n\f' + '\n'.join([m['so']] + m['dong']))


main()
