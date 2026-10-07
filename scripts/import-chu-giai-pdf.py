#!/usr/bin/env python3
"""Nhập lại TOÀN VĂN Chú giải chi tiết HS (bản tiếng Việt, HS 2017) từ 5 tập PDF.

Vì sao: bản nhập cũ (scripts/harvest-chu-giai.mjs, qua KG 9 tầng) cắt phần thuyết minh nhóm ở
2.000 ký tự → 545/1.269 nhóm mất phần sau (thường là các trường hợp LOẠI TRỪ), 62 nhóm trống,
chương 52/81 trống (docs/bao-cao-chu-giai-2026-10-06.md). CEO 06/10: "Trả lời thiếu còn nguy hại
hơn không trả lời."

Nguồn: Google Drive của CEO, thư mục "chú giải Hs code 2017" (5 tập PDF, có lớp chữ Unicode).
PDF KHÔNG commit vào repo. Tải về một thư mục rồi chạy:

    pip install pymupdf
    python3 scripts/import-chu-giai-pdf.py <thư-mục-pdf> [--write]

Không có --write: chỉ in thống kê + đối chiếu với dữ liệu hiện có (chạy thử).
Có --write: cập nhật data/chu-giai-heading.json (trường `nhom`, `ten_nhom`, `nhom_day_du`,
`nguon_toan_van`) và data/chu-giai-chuong.json (chương đang trống, hoặc bản PDF dài hơn).
Các trường khác (bao_gom, khong_bao_gom, phan_biet, tinh_chat, sen…) giữ nguyên.

Kiểm chéo trước khi ghi: phần đầu `nhom` cũ (2.000 ký tự đầu, cùng nguồn) phải nằm ở đầu bản
mới. Nhóm nào lệch thì KHÔNG ghi đè và được liệt kê để người soát.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
SOURCE = 'Chú giải chi tiết HS 2017 (bản tiếng Việt, 5 tập PDF) — toàn văn, nhập 07/10/2026'

CHAPTER_RE = re.compile(r'^\s*Chương\s+(\d{1,2})\s*:\s*\S')
# Dòng mở nhóm có nhiều kiểu: "04.06 - …", "84. 82 - …", "29.21-" (tên ở dòng sau), "44.17- …",
# "29.31. Hợp chất …", "86.07 Các bộ phận …". Không khớp "29.21.29 - -" hay "2529.21 - -".
# Dòng mở nhóm đứng sát lề trái; dòng thụt sâu là chữ nối giữa câu ("    49.11. Các bưu thiếp…").
HEADING_DASH_RE = re.compile(r'^\s{0,2}(\d{2})\s?\.\s?(\d{2})\.?\s*[-–]')
HEADING_WORD_RE = re.compile(r'^\s{0,2}(\d{2})\.(\d{2})\.?\s+(\w)')


class _Heading:
    @staticmethod
    def match(line):
        m = HEADING_DASH_RE.match(line)
        if m:
            return m
        m = HEADING_WORD_RE.match(line)
        return m if m and m.group(3).isupper() else None


HEADING_RE = _Heading
# Dòng thuộc danh sách phân nhóm ở đầu nhóm: "0406.10 - …", "1001.11" (mã đứng riêng), "- - Hạt giống".
SUBHEADING_RE = re.compile(r'^\s*\d{4}\.\d{1,2}\b|^\s*\d{2}\.\d{2}\.\d{2}\b|^\s*[-–](\s*[-–])*\s')
# Đầu một đoạn/mục mới trong thân chú giải.
PARA_START_RE = re.compile(r'^\s*(\(\s*[0-9a-zA-ZivxIVX]{1,4}\s*\)|[0-9]{1,2}[.)]\s|[-–•]\s|Chú giải|TỔNG QUÁT|Nhóm này|Tuy nhiên|Ngoài ra)')
PAGE_NO_RE = re.compile(r'^\s*(\d{1,4}|HẾT TẬP \d)\s*$')
VOLUME_END = '<<<HẾT TẬP>>>'
# Chú giải Phần ("PHẦN XI: …") đứng trước chương đầu của Phần: nhóm cuối chương trước dừng tại đây.
SECTION_RE = re.compile(r'^\s*PHẦN\s+[IVXL]+\s*:')


def load_lines(pdf_dir, sort=True):
    files = sorted(Path(pdf_dir).glob('*.pdf'), key=lambda p: volume_no(p.name))
    if len(files) != 5:
        sys.exit(f'Cần đúng 5 tập PDF trong {pdf_dir}, thấy {len(files)}')
    lines = []
    for f in files:
        for page in pymupdf.open(f):
            # Số trang có thể nằm đầu hoặc cuối khối chữ tuỳ cách đọc → bỏ mọi dòng chỉ có số.
            lines.extend(l.rstrip() for l in page.get_text(sort=sort).split('\n') if not PAGE_NO_RE.match(l))
        lines.append(VOLUME_END)  # hết tập: nhóm cuối tập không được kéo sang lời mở đầu tập sau
    return lines


def volume_no(name):
    m = re.search(r'(\d)', unicodedata.normalize('NFC', name))
    return int(m.group(1)) if m else 9


def find_chapters(lines):
    """Vị trí dòng "Chương N: …" thật (bỏ mục lục: mục lục nối liền các dòng Chương khác)."""
    cands = [(i, int(m.group(1))) for i, l in enumerate(lines) if (m := CHAPTER_RE.match(l))]
    starts = {}
    for idx, (i, ch) in enumerate(cands):
        nxt = cands[idx + 1][0] if idx + 1 < len(cands) else len(lines)
        # Thật: trước chương kế tiếp có ít nhất một dòng nhóm của chính chương này.
        if any((m := HEADING_RE.match(lines[j])) and int(m.group(1)) == ch for j in range(i + 1, nxt)):
            if ch not in starts:
                starts[ch] = i
    return dict(sorted(starts.items(), key=lambda kv: kv[1]))


def paragraphs(block):
    """Gộp dòng PDF thành đoạn. PDF hiếm khi có dòng trống giữa đoạn, nên mở đoạn mới khi:
    gặp dòng trống, dòng mở đầu bằng mục "(a)", "(1)", "1.", "-", "Nhóm này…", hoặc dòng trước
    kết thúc bằng ".", ":" ";" và dòng này viết hoa chữ đầu."""
    paras, cur = [], []
    for l in block:
        t = l.strip()
        if not t:
            if cur:
                paras.append(cur)
                cur = []
            continue
        prev = cur[-1] if cur else ''
        if cur and (PARA_START_RE.match(t) or (re.search(r'[.:;]$', prev) and t[:1].isupper())):
            paras.append(cur)
            cur = []
        cur.append(t)
    if cur:
        paras.append(cur)
    return '\n\n'.join(re.sub(r'\s{2,}', ' ', ' '.join(p)) for p in paras)


def split_heading(seg):
    """seg[0] là dòng "NN.NN - tên nhóm". Trả (tên nhóm, thân thuyết minh)."""
    title = [seg[0].strip()]
    i = 1
    # Tên nhóm có thể xuống dòng (tối đa 4 dòng); dừng ở dấu "." / ":" hoặc khi gặp dòng phân nhóm.
    while (i < len(seg) and len(title) < 12 and not re.search(r'[.:]\s*$', title[-1])
           and seg[i].strip() and not SUBHEADING_RE.match(seg[i]) and not PARA_START_RE.match(seg[i])):
        title.append(seg[i].strip())
        i += 1
    # Danh sách phân nhóm: dòng mã, dòng gạch đầu dòng, dòng trống, và dòng nối (viết thường) của chúng.
    while i < len(seg):
        t = seg[i].strip()
        if not t or SUBHEADING_RE.match(seg[i]):
            i += 1
        elif i > 1 and (t[:1].islower() or re.match(r'\s{3,}', seg[i])):
            i += 1  # dòng nối của phân nhóm: viết thường, hoặc thụt lề như danh sách phân nhóm
        else:
            break
    return ' '.join(title), paragraphs(seg[i:])


def parse(lines):
    chapters = find_chapters(lines)
    order = list(chapters.items())
    heading, chapter = {}, {}
    for idx, (ch, start) in enumerate(order):
        end = order[idx + 1][1] if idx + 1 < len(order) else len(lines)
        # Một mã có thể xuất hiện nhiều lần ở đầu dòng (trích dẫn trong chú giải chương). Chọn dòng
        # có danh sách phân nhóm "NNNN." hoặc "Nhóm này" trong 15 dòng sau; không có thì lấy dòng đầu.
        cands = {}
        for j in range(start + 1, end):
            m = HEADING_RE.match(lines[j])
            if m and int(m.group(1)) == ch:
                cands.setdefault(f'{m.group(1)}{m.group(2)}', []).append(j)
        hs = []
        for h4, js in cands.items():
            good = []
            for j in js:
                for k in range(j + 1, min(j + 16, end)):
                    if HEADING_RE.match(lines[k]):
                        break  # dòng mở nhóm khác chen giữa → j chỉ là trích dẫn
                    if re.match(rf'\s*({h4}|{h4[:2]}\.{h4[2:]})\.|\s*Nhóm này', lines[k]):
                        good.append(j)
                        break
            hs.append(((good or js)[0], h4))
        hs.sort()
        first = hs[0][0] if hs else end
        if VOLUME_END in lines[start:first]:
            first = lines.index(VOLUME_END, start)
        chapter[f'{ch:02d}'] = paragraphs(lines[start:first])
        for k, (j, h4) in enumerate(hs):
            stop = hs[k + 1][0] if k + 1 < len(hs) else end
            for x in range(j + 1, stop):
                if lines[x] == VOLUME_END or SECTION_RE.match(lines[x]):
                    stop = x
                    break
            heading[h4] = split_heading(lines[j:stop])
    return chapter, heading


def key(s, n=None):
    t = re.sub(r'[^0-9a-zà-ỹđ]', '', unicodedata.normalize('NFC', s.lower()))
    return t[:n] if n else t


def matches(old, title, body):
    """Bản cũ cùng nguồn nhưng là đoạn trích (có khi bắt đầu ở danh sách loại trừ): lấy 3 mẫu
    50 ký tự ở đầu / giữa / cuối bản cũ, phải thấy ≥ 2 mẫu trong bản PDF."""
    k_old, k_new = key(old), key(title + body)
    n = len(k_old)
    probes = [k_old[a:a + 50] for a in (0, max(0, n // 2 - 25), max(0, n - 120))] if n >= 150 else [k_old[:50]]
    return sum(1 for p in probes if p and p in k_new) >= min(2, len(probes))


def nowhere(old, texts):
    """Số mẫu (trên 8 mẫu 40 ký tự trải đều bản cũ) KHÔNG có ở bất kỳ đâu trong PDF.
    Nhiều (≥ 5) = bản cũ là câu chữ khác hẳn — thực tế là bản sửa đổi HS 2022 (1509, 1510, 3822,
    7019, 8462, 9508, 9705…) → giữ bản cũ. Ít = bản cũ là chữ PDF bị gán nhầm nhóm/lẫn chương sau."""
    k = key(old)
    n = len(k)
    probes = [k[a:a + 40] for a in range(0, max(1, n - 40), max(1, (n - 40) // 8))][:8]
    return sum(1 for p in probes if not any(p in t for t in texts))


# Soát tay 07/10/2026: bản cũ là nội dung nhóm khác hẳn (không phải bản 2022) → vẫn thay.
#   2716: bản cũ là chú giải Phần VI; 8484: bản cũ là chú giải máy sản xuất bồi đắp (nhóm 84.85 HS 2022).
FORCE_REPLACE = {'2716', '8484'}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    write = '--write' in sys.argv
    # Hai cách đọc: theo vị trí trên trang (đúng thứ tự mắt đọc ở phần lớn trang) và theo thứ tự
    # lưu trong tệp (đúng ở vài trang mà cách kia đảo khối). Mỗi nhóm lấy bản qua kiểm chéo.
    chapter, heading = parse(load_lines(sys.argv[1], sort=True))
    chapter_raw, heading_raw = parse(load_lines(sys.argv[1], sort=False))
    texts = [key(t + b) for t, b in list(heading.values()) + list(heading_raw.values())]
    texts += [key(t) for t in list(chapter.values()) + list(chapter_raw.values())]
    old_h = json.loads((DATA / 'chu-giai-heading.json').read_text())
    old_c = json.loads((DATA / 'chu-giai-chuong.json').read_text())

    stats = {k: [] for k in ('khop', 'moi', 'cu_gan_nham', 'giu_ban_2022', 'khong_co_trong_pdf')}
    updates = {}
    for h4, rec in old_h.items():
        if h4 not in heading:
            stats['khong_co_trong_pdf'].append(h4)
            continue
        old = rec.get('nhom') or ''
        variants = [heading[h4]] + ([heading_raw[h4]] if h4 in heading_raw and heading_raw[h4] != heading[h4] else [])
        ok = [v for v in variants if matches(old, *v)]
        if not old.strip():
            kind, (title, body) = 'moi', variants[0]
        elif ok and len(key(ok[0][1])) >= len(key(old)) * 0.9:
            kind, (title, body) = 'khop', ok[0]
        elif h4 in FORCE_REPLACE or nowhere(old, texts) < 5:
            kind, (title, body) = 'cu_gan_nham', (ok or sorted(variants, key=lambda v: -len(v[1])))[0]
        else:
            stats['giu_ban_2022'].append(h4)
            continue
        if len(body.strip()) < 15 and h4 not in FORCE_REPLACE:
            stats['khong_co_trong_pdf'].append(h4)
            continue
        stats[kind].append(h4)
        updates[h4] = (title, body)

    ch_upd, ch_keep = {}, []
    for c, t in chapter.items():
        if c not in old_c:
            continue
        old = old_c[c].get('chuong') or ''
        if not old.strip() or (len(t) > len(old) and (matches(old, '', t) or matches(old, '', chapter_raw.get(c, '')))):
            ch_upd[c] = t
        elif len(t) > len(old):
            ch_keep.append(c)

    for k, v in stats.items():
        print(f'{k}: {len(v)}  {" ".join(v[:80])}')
    print(f'chương ghi: {len(ch_upd)}  {" ".join(sorted(ch_upd))}')
    print(f'chương giữ bản cũ (câu chữ khác PDF): {" ".join(sorted(ch_keep))}')

    if not write:
        return
    for h4, (title, body) in updates.items():
        rec = old_h[h4]
        rec['ten_nhom'] = title
        rec['nhom'] = body
        rec['nhom_day_du'] = True
        rec['nguon_toan_van'] = SOURCE
    for c, t in ch_upd.items():
        old_c[c]['chuong'] = t
        old_c[c]['nguon_toan_van'] = SOURCE
    (DATA / 'chu-giai-heading.json').write_text(json.dumps(old_h, ensure_ascii=False))
    (DATA / 'chu-giai-chuong.json').write_text(json.dumps(old_c, ensure_ascii=False))
    print('đã ghi data/chu-giai-heading.json, data/chu-giai-chuong.json')


if __name__ == '__main__':
    main()
