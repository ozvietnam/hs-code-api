#!/usr/bin/env python3
"""
Bước 1 của #196: PDF "WCO Compendium of Classification Opinions" (song ngữ Anh–Pháp) → CHỈ phần tiếng Anh.

  pip install pymupdf
  python3 scripts/wco-op-extract.py --pdf "data/wco-op/WCO Compendium 2022.pdf"
  python3 scripts/wco-op-extract.py --pdf ... --sample 12,13        # xem cấu trúc vài trang (chữ cắt ngắn)
  python3 scripts/wco-op-extract.py --pdf ... --ocr                 # trang không có lớp chữ → OCR (cần tesseract)

Ra (mặc định data/wco-op/, được .gitignore chặn — script TỪ CHỐI ghi nếu thư mục ra không bị ignore):
  pages-en.jsonl       mỗi trang một dòng JSON {pdfPage, layout, lang, lines:[{t,x,y,s,b}]}  (CÓ chữ WCO — riêng tư)
  extract-report.json  chỉ số liệu, KHÔNG có chữ WCO → dán gửi được để chỉnh tham số

Cách gạn tiếng Anh (không biết trước bố cục nên thử cả ba, báo cáo ghi trang nào dùng bố cục nào):
  - hai cột: tìm rãnh giữa trang (x ít dòng cắt ngang nhất), mỗi cột chấm ngôn ngữ cả cột → giữ cột tiếng Anh;
  - một cột: chấm ngôn ngữ từng khối chữ, khối trung tính (số, mã) kế thừa khối trước;
  - đầu/chân trang lặp lại nhiều trang (số trang, tên ấn phẩm) bị loại.
Chấm ngôn ngữ bằng từ chức năng (the/of/and… vs le/la/des…) + dấu tiếng Pháp. Không gọi mạng, không dùng AI.
"""
import argparse
import collections
import json
import os
import re
import subprocess
import sys

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit('Thiếu PyMuPDF: pip install pymupdf')

EN_WORDS = set('the of and in for to is are with by on as that this be or from which an at its it not shall under other than whether classified goods heading subheading'.split())
FR_WORDS = set('le la les des du de et en pour dans est sont avec par sur que qui ce cette ou au aux une un ne pas sous autres ainsi être classé classées classement marchandises position sous-position'.split())
WORD = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿœŒ]+")
ACCENT = re.compile(r'[éèêëàâçîïôûùüÿœ]')
FURNITURE_BAND = 0.08  # đầu/chân trang: 8% chiều cao
FURNITURE_MIN_PAGES = 5


def score(text):
    """(điểm EN, điểm FR) của một đoạn."""
    en = fr = 0.0
    for w in WORD.findall(text.lower()):
        if w in EN_WORDS:
            en += 1
        if w in FR_WORDS:
            fr += 1
    fr += 0.5 * len(ACCENT.findall(text.lower()))
    return en, fr


def lang_of(en, fr):
    if en + fr < 3:
        return 'neutral'
    r = en / (en + fr)
    return 'en' if r >= 0.65 else 'fr' if r <= 0.35 else 'neutral'


def assert_ignored(path):
    """Thư mục ra phải bị git ignore, nếu không chữ WCO có thể bị commit lên repo công khai."""
    try:
        top = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(path)) or '.')
        if top.returncode != 0:
            return  # không phải repo git (vd server chỉ có bản chạy) → không có gì để lộ qua git
        r = subprocess.run(['git', 'check-ignore', '-q', path], cwd=top.stdout.strip())
        if r.returncode != 0:
            sys.exit(f'TỪ CHỐI ghi {path}: không nằm trong .gitignore (dữ liệu WCO có bản quyền, không được lọt lên repo). Dùng data/wco-op/.')
    except FileNotFoundError:
        return  # không có git


def page_lines(page, use_ocr):
    """Danh sách dòng {t,x0,y0,x1,y1,s,b,blk} của một trang theo thứ tự khối của PyMuPDF."""
    if use_ocr:
        tp = page.get_textpage_ocr(language='eng+fra', dpi=300, full=True)
        d = page.get_text('dict', textpage=tp)
    else:
        d = page.get_text('dict')
    out = []
    for bi, b in enumerate(d.get('blocks', [])):
        if b.get('type') != 0:
            continue
        for ln in b.get('lines', []):
            spans = [s for s in ln.get('spans', []) if s.get('text', '').strip()]
            if not spans:
                continue
            t = ''.join(s['text'] for s in spans).strip()
            x0, y0, x1, y1 = ln['bbox']
            size = max(s['size'] for s in spans)
            bold = any((s['flags'] & 16) or 'bold' in s.get('font', '').lower() for s in spans)
            out.append({'t': t, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 's': round(size, 1), 'b': bool(bold), 'blk': bi})
    return out


def find_gutter(lines, width):
    """x của rãnh giữa nếu trang chia hai cột, ngược lại None."""
    narrow = [l for l in lines if (l['x1'] - l['x0']) < 0.62 * width]
    if len(narrow) < 12:
        return None
    best, best_cross = None, None
    for k in range(int(0.40 * width), int(0.60 * width) + 1, 2):
        cross = sum(1 for l in lines if l['x0'] < k - 2 and l['x1'] > k + 2)
        if best_cross is None or cross < best_cross:
            best, best_cross = k, cross
    left = sum(1 for l in lines if l['x1'] <= best + 2)
    right = sum(1 for l in lines if l['x0'] >= best - 2)
    if best_cross <= 0.15 * len(lines) and left >= 6 and right >= 6:
        return best
    return None


def classify_page(lines, width):
    """→ (layout, kept_lines, stats). kept_lines giữ thứ tự đọc."""
    gutter = find_gutter(lines, width)
    st = {'en': 0, 'fr': 0, 'neutral': 0}
    if gutter is not None:
        sides = {'L': [l for l in lines if l['x1'] <= gutter + 2], 'R': [l for l in lines if l['x0'] >= gutter - 2]}
        rest = [l for l in lines if l not in sides['L'] and l not in sides['R']]  # dòng bắc ngang rãnh (tiêu đề)
        kept, langs = [], {}
        for k, ls in sides.items():
            en, fr = score(' '.join(l['t'] for l in ls))
            langs[k] = lang_of(en, fr)
            st['en' if langs[k] == 'en' else 'fr' if langs[k] == 'fr' else 'neutral'] += len(ls)
            if langs[k] == 'en':
                kept += sorted(ls, key=lambda l: (l['y0'], l['x0']))
        for l in rest:
            en, fr = score(l['t'])
            if lang_of(en, fr) != 'fr':
                kept.append(l)
        if langs['L'] == 'neutral' and langs['R'] == 'neutral':  # không chấm được cả hai → giữ tất, đánh dấu để người soát
            kept = sorted(lines, key=lambda l: (l['y0'], l['x0']))
            return 'two-col-unresolved', kept, st
        return 'two-col', kept, st
    kept, cur = [], 'neutral'
    blocks = collections.OrderedDict()
    for l in lines:
        blocks.setdefault(l['blk'], []).append(l)
    for ls in blocks.values():
        en, fr = score(' '.join(l['t'] for l in ls))
        lg = lang_of(en, fr)
        if lg == 'neutral':
            lg = cur if cur != 'neutral' else 'en'
        cur = lg
        st[lg] += len(ls)
        if lg == 'en':
            kept += ls
    return 'single', kept, st


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pdf', required=True)
    ap.add_argument('--out', default='data/wco-op')
    ap.add_argument('--ocr', action='store_true', help='OCR trang không có lớp chữ (cần tesseract + dữ liệu eng, fra)')
    ap.add_argument('--sample', default='', help='vd 12,13: in cấu trúc các trang này (chữ cắt 14 ký tự), không ghi tệp')
    ap.add_argument('--pages', default='', help='giới hạn trang, vd 1-50 (chạy thử)')
    a = ap.parse_args()

    doc = fitz.open(a.pdf)
    n = doc.page_count
    lo, hi = 1, n
    if a.pages:
        m = re.match(r'(\d+)-(\d+)$', a.pages)
        if not m:
            sys.exit('--pages dạng 1-50')
        lo, hi = max(1, int(m.group(1))), min(n, int(m.group(2)))
    want = {int(x) for x in a.sample.split(',') if x.strip()}

    pages = []
    no_text = []
    for pn in range(lo, hi + 1):
        page = doc[pn - 1]
        lines = page_lines(page, False)
        if sum(len(l['t']) for l in lines) < 30:
            if a.ocr:
                try:
                    lines = page_lines(page, True)
                except Exception as e:  # tesseract thiếu
                    sys.exit(f'OCR lỗi ở trang {pn}: {e}')
            else:
                no_text.append(pn)
        pages.append({'pn': pn, 'w': page.rect.width, 'h': page.rect.height, 'lines': lines})

    # Đầu/chân trang lặp lại → loại
    seen = collections.Counter()
    key = lambda t: re.sub(r'\d+', '#', t.strip().lower())
    for p in pages:
        band = {key(l['t']) for l in p['lines'] if l['y0'] < FURNITURE_BAND * p['h'] or l['y1'] > (1 - FURNITURE_BAND) * p['h']}
        seen.update(band)
    furniture = {k for k, c in seen.items() if c >= max(FURNITURE_MIN_PAGES, 0.2 * len(pages))}

    rows, report_pages = [], []
    layouts = collections.Counter()
    for p in pages:
        body = [l for l in p['lines'] if not ((l['y0'] < FURNITURE_BAND * p['h'] or l['y1'] > (1 - FURNITURE_BAND) * p['h']) and key(l['t']) in furniture)]
        if p['pn'] in want:
            print(f"--- trang {p['pn']}  {p['w']:.0f}x{p['h']:.0f}  {len(p['lines'])} dòng ({len(p['lines']) - len(body)} đầu/chân)")
            for l in p['lines']:
                en, fr = score(l['t'])
                print(f"  x={l['x0']:6.1f}-{l['x1']:6.1f} y={l['y0']:6.1f} s={l['s']:4.1f} {'B' if l['b'] else ' '} {lang_of(en, fr):7s} blk={l['blk']:<3d} {l['t'][:14]!r}")
        layout, kept, st = classify_page(body, p['w'])
        layouts[layout] += 1
        report_pages.append([p['pn'], layout, len(kept), st['en'], st['fr'], st['neutral']])
        rows.append({'pdfPage': p['pn'], 'layout': layout,
                     'lines': [{'t': l['t'], 'x': round(l['x0']), 'y': round(l['y0']), 's': l['s'], 'b': l['b']} for l in kept]})
    if want:
        return

    out = a.out
    os.makedirs(out, exist_ok=True)
    pe, rp = os.path.join(out, 'pages-en.jsonl'), os.path.join(out, 'extract-report.json')
    assert_ignored(pe)
    assert_ignored(rp)
    with open(pe, 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    sparse = [r[0] for r in report_pages if r[2] < 5]
    report = {
        'pdf': os.path.basename(a.pdf), 'pages': n, 'pagesProcessed': [lo, hi],
        'noTextPages': no_text, 'ocr': a.ocr,
        'layouts': dict(layouts), 'furnitureLines': sorted(furniture)[:20],
        'keptLines': sum(r[2] for r in report_pages),
        'langLines': {'en': sum(r[3] for r in report_pages), 'fr': sum(r[4] for r in report_pages), 'neutral': sum(r[5] for r in report_pages)},
        'sparsePages': sparse[:200], 'unresolvedPages': [r[0] for r in report_pages if r[1] == 'two-col-unresolved'][:200],
        'perPage_cols': ['pdfPage', 'layout', 'keptLines', 'enLines', 'frLines', 'neutralLines'], 'perPage': report_pages,
    }
    with open(rp, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False)
    print(f"{hi - lo + 1} trang → {report['keptLines']} dòng tiếng Anh; bố cục {dict(layouts)}; không có lớp chữ: {len(no_text)}; trang thưa: {len(sparse)}")
    print(f'  {pe}\n  {rp}  ← báo cáo không chứa chữ WCO, dán gửi được')


if __name__ == '__main__':
    main()
