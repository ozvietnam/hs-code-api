#!/usr/bin/env python3
"""Nhập Chú giải bổ sung SEN 2022 (AHTN 2022) — phần tiếng Việt — thành dữ liệu theo mã 8 số.

Nguồn: Google Drive của CEO, thư mục "chu_gia_SEN_2022", tệp chu_giai_SEN_2022.pdf (386 trang,
song ngữ 2 cột: trái tiếng Việt, phải tiếng Anh). Ban hành kèm CV 3866/TCHQ-TXNK (24/07/2023).
PDF KHÔNG commit. Tải về rồi chạy:

    pip install pymupdf
    python3 scripts/import-sen-pdf.py <tệp-pdf> [--write]

Ra: data/sen-2022.json = { phienBan, nguon, muc: [ { ma: [8 số…], tieuDe, noiDung, xuatXu, trang } ] }
và cập nhật trường `sen` của data/chu-giai-heading.json cho các nhóm có mục SEN 2022 (thay bản
cũ lấy qua KG). Mỗi mã phải có trong biểu thuế (data/tax.json); mã lạ được liệt kê, không ghi.
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
SOURCE = 'Chú giải bổ sung SEN của AHTN 2022 (CV 3866/TCHQ-TXNK ngày 24/07/2023) — phần tiếng Việt, nhập 07/10/2026'

# Mục SEN có thể ghi theo mã 8 số (0207.14.91), phân nhóm 6 số (4001.21) hoặc cả nhóm (27.10, 87.03).
CODE = r'(?:\d{4}\.\d{2}\.\d{2}|\d{4}\.\d{2}|\d{2}\.\d{2})(?![\d.])'
CODES_LINE_RE = re.compile(rf'^\s*{CODE}(\s+{CODE})*\s*$')
CHAPTER_RE = re.compile(r'^\s*CHƯƠNG\s+(\d{1,2})\s*$')
SOURCE_RE = re.compile(r'\(\s*(?:Nguồn|Source)\s*:\s*([^)]+)\)')  # cột Việt đôi chỗ vẫn ghi "(Source: …)" (tr.274, 386)
NOISE_RE = re.compile(r'^\s*(\d{1,3}|[—–-]+\s*\d{1,3}\s*[—–-]+)\s*$')


def gutter(page):
    """Khe giữa hai cột: vị trí x (30–70 % bề ngang) cắt qua ít chữ nhất, gần giữa nhất.
    Không cắt cứng ở giữa trang: chương 27 cột tiếng Anh bắt đầu từ x≈340/792."""
    w = page.rect.width
    words = page.get_text('words')
    best = None
    for x in range(int(w * 0.3), int(w * 0.7), 2):
        k = (sum(1 for a in words if a[0] < x < a[2]), abs(x - w / 2))
        if best is None or k < best[0]:
            best = (k, x)
    return best[1] if best else w / 2


def left_column_lines(pdf):
    """Cột tiếng Việt (trái khe giữa), giữ số trang để dẫn chiếu."""
    out = []
    for i, page in enumerate(pymupdf.open(pdf)):
        h = page.rect.height
        text = page.get_text(clip=pymupdf.Rect(0, 0, gutter(page), h), sort=True)
        for line in text.split('\n'):
            # Dòng mã của cột phải có khi lấn qua giữa trang ("2707.99.10 2710.19.30      2707.99.10 2",
            # tr.121): cắt tại khoảng trắng dài. Chỉ áp cho dòng mã — bảng tiếng Việt (tr.31) giữ đủ cột.
            line = line.rstrip()
            if re.match(rf'\s*{CODE}', line):
                line = re.sub(r'(\S)\s{6,}\S.*$', r'\1', line)
            if not NOISE_RE.match(line):
                out.append((i + 1, line))
    return out


def is_upper_title(t):
    letters = [c for c in t if c.isalpha()]
    return letters and sum(c.isupper() for c in letters) / len(letters) > 0.8


def body_text(lines):
    paras, cur = [], []
    for t in lines:
        t = t.strip()
        if not t:
            if cur:
                paras.append(' '.join(cur))
                cur = []
            continue
        cur.append(t)
    if cur:
        paras.append(' '.join(cur))
    return '\n\n'.join(re.sub(r'\s{2,}', ' ', p) for p in paras)


def parse(lines):
    entries, i, n = [], 0, len(lines)
    while i < n:
        page, t = lines[i]
        if not CODES_LINE_RE.match(t):
            i += 1
            continue
        codes = re.findall(CODE, t)
        i += 1
        while True:  # danh sách mã xuống dòng, có thể cách nhau dòng trống
            j = i
            while j < n and not lines[j][1].strip():
                j += 1
            if j < n and CODES_LINE_RE.match(lines[j][1]):
                codes += re.findall(CODE, lines[j][1])
                i = j + 1
            else:
                break
        while i < n and not lines[i][1].strip():
            i += 1
        title = []
        while i < n and lines[i][1].strip() and not CHAPTER_RE.match(lines[i][1]) and (
                is_upper_title(lines[i][1])
                # tên mục xuống dòng đúng chỗ mã: "…8418.21.90 HOẶC" / "8418.29.00" (tr.328)
                or (title and CODES_LINE_RE.match(lines[i][1]) and re.search(r'(HOẶC|VÀ|,)\s*$', title[-1]))):
            title.append(lines[i][1].strip())
            i += 1
        start = i
        while i < n and not CODES_LINE_RE.match(lines[i][1]) and not CHAPTER_RE.match(lines[i][1]):
            i += 1
        body = body_text([x[1] for x in lines[start:i]])
        m = SOURCE_RE.search(body)
        body = SOURCE_RE.sub('', body).strip()
        # Nguồn không có ngoặc ở cuối mục: "Nguồn: Thái Lan" (tr.93, 263, 305).
        tail = re.search(r'(?:^|\s)Nguồn\s*:\s*([^\n:]{2,60})$', body)
        if not m and tail:
            body = body[:tail.start()].strip()
        entries.append({
            'ma': [c.replace('.', '') for c in dict.fromkeys(codes)],
            'tieuDe': re.sub(r'\s+', ' ', ' '.join(title)).strip(),
            'noiDung': body,
            'xuatXu': (m.group(1) if m else tail.group(1) if tail else '').strip() or None,
            'trang': page,
        })
    return entries


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    write = '--write' in sys.argv
    entries = parse(left_column_lines(sys.argv[1]))
    tax = json.loads((DATA / 'tax.json').read_text())
    rows = tax if isinstance(tax, list) else list(tax.values())
    known8 = {re.sub(r'\D', '', str(r.get('hs', ''))) for r in rows}
    known = known8 | {c[:6] for c in known8} | {c[:4] for c in known8}

    bad_codes = sorted({c for e in entries for c in e['ma'] if c not in known})
    empty = [e for e in entries if len(e['noiDung']) < 40 and not e['tieuDe']]
    no_title = [e for e in entries if not e['tieuDe']]
    codes = {c for e in entries for c in e['ma']}
    print(f'mục: {len(entries)}; mã: {len(codes)} (8 số {sum(len(c) == 8 for c in codes)}, 6 số {sum(len(c) == 6 for c in codes)}, nhóm {sum(len(c) == 4 for c in codes)}); nhóm 4 số liên quan: {len({c[:4] for c in codes})}')
    print(f'mã không có trong biểu thuế: {len(bad_codes)} {" ".join(bad_codes[:40])}')
    print(f'mục nội dung < 40 ký tự: {len(empty)} {[(e["ma"], e["trang"]) for e in empty[:10]]}')
    print(f'mục thiếu tên: {len(no_title)} {[(e["ma"], e["trang"]) for e in no_title[:10]]}')
    if not write:
        return

    keep = [dict(e, ma=[c for c in e['ma'] if c in known]) for e in entries]
    # Giữ mục có tên dù nội dung chỉ là hình (tr.194 3924.90.20, tr.326 8414.80.42): tên đã định danh hàng.
    keep = [e for e in keep if e['ma'] and (e['tieuDe'] or len(e['noiDung']) >= 40)]
    (DATA / 'sen-2022.json').write_text(json.dumps({'phienBan': 'SEN2022', 'nguon': SOURCE, 'muc': keep}, ensure_ascii=False, indent=1))

    heading = json.loads((DATA / 'chu-giai-heading.json').read_text())
    by_h4 = {}
    for e in keep:
        for h4 in dict.fromkeys(c[:4] for c in e['ma']):
            by_h4.setdefault(h4, []).append(e)
    for h4, es in by_h4.items():
        if h4 not in heading:
            continue
        parts = [f"[{', '.join(f'{c[:4]}.{c[4:6]}.{c[6:]}' for c in e['ma'])}] {e['tieuDe']}: {e['noiDung']}" for e in es]
        heading[h4]['sen'] = '\n\n'.join(parts)
        heading[h4]['sen_nguon'] = SOURCE
    (DATA / 'chu-giai-heading.json').write_text(json.dumps(heading, ensure_ascii=False))
    print(f'đã ghi data/sen-2022.json ({len(keep)} mục) + trường sen của {len(by_h4)} nhóm')


if __name__ == '__main__':
    main()
