#!/usr/bin/env python3
"""
Đọc các DẢI TIÊU ĐỀ MÃ (chữ trắng trên nền xanh đậm, vd "8471.30") trong cột tiếng Anh của bản scan WCO Compendium (#196).

Vì sao: bản OCR markdown làm rơi nhiều tiêu đề mã (chữ trắng trên nền xanh khó OCR) nên nhiều ý kiến bị gán nhầm sang mã đứng trước
(vd 8466.10 / 8467.19 / 8471.30 bị dồn vào 8442.30 / 8470.50). Script này tìm lại các dải đó từ ẢNH trang, đảo màu rồi OCR chỉ các chữ số.

  pip install pymupdf numpy pillow      # cần thêm tesseract (đã có nếu OCR được bản scan)
  python3 scripts/wco-op-banners.py --pdf "data/wco-op/WCO-Compendium-2022.pdf" [--pages 1-706] [--crops data/wco-op/banner-crops]
  python3 scripts/wco-op-banners.py --image trang.png      # thử một ảnh trang (không cần PDF)

Ra data/wco-op/banners.jsonl: mỗi dòng {pdfPage, y, raw, code} theo thứ tự đọc (trang rồi y). Có chữ WCO? Không (chỉ mã số) nhưng nằm trong
data/wco-op/ (bị .gitignore chặn) cùng các tệp khác. Sau đó chạy scripts/wco-op-fix-headings.mjs.
Chỉ lấy NỬA PHẢI trang (cột tiếng Anh). Dải = hàng ngang xanh đậm phủ > 50% bề rộng nửa phải, cao ≥ 12 px ở 150 dpi.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageOps

DPI = 150
MIN_HEIGHT = 12
FILL = 0.5
OCR_DIGIT = {'O': '0', 'o': '0', 'I': '1', 'l': '1', '|': '1', 'S': '5'}


def blue_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (b > r + 25) & (r < 110) & (g < 120) & (b > 70)


def find_banners(img):
    """[(y0, y1)] của các dải xanh trong nửa phải ảnh (cột tiếng Anh)."""
    a = np.asarray(img.convert('RGB'))
    m = blue_mask(a)
    w = m.shape[1]
    rows = m[:, w // 2:].mean(axis=1)
    runs, st = [], None
    for y, v in enumerate(rows):
        if v > FILL and st is None:
            st = y
        if v <= FILL and st is not None:
            if y - st >= MIN_HEIGHT:
                runs.append((st, y))
            st = None
    if st is not None and len(rows) - st >= MIN_HEIGHT:
        runs.append((st, len(rows)))
    return runs


def normalise(raw):
    s = raw.strip().replace(',', '.')
    m = re.search(r'([0-9OoIl|S]{4})\s*\.\s*([0-9OoIl|S]{2})', s)
    if not m:
        return None
    d = ''.join(OCR_DIGIT.get(c, c) for c in m.group(1) + m.group(2))
    return f'{d[:4]}.{d[4:]}' if re.fullmatch(r'\d{6}', d) else None


def ocr_code(img, box, crops_dir, tag):
    x0, y0, x1, y1 = box
    crop = img.convert('L').crop((x0, y0, x1, y1))
    crop = ImageOps.invert(crop)                      # chữ trắng trên nền xanh → chữ đen trên nền sáng
    crop = crop.point(lambda p: 255 if p > 150 else 0)  # nhị phân hoá
    crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
    if crops_dir:
        os.makedirs(crops_dir, exist_ok=True)
        crop.save(os.path.join(crops_dir, f'{tag}.png'))
    if not shutil.which('tesseract'):
        sys.exit('Thiếu tesseract (cài tesseract-ocr).')
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, 'b.png')
        crop.save(p)
        out = subprocess.run(['tesseract', p, '-', '--psm', '7', '-c', 'tessedit_char_whitelist=0123456789.'], capture_output=True, text=True)
    return out.stdout.strip()


def page_banners(img, pn, crops_dir):
    w = img.width
    res = []
    m = blue_mask(np.asarray(img.convert('RGB')))
    for (y0, y1) in find_banners(img):
        # bề ngang thật của dải trong nửa phải (cột nào xanh trong ≥ 50% chiều cao dải), co vào 4% để bỏ viền
        cols = np.where(m[y0:y1, w // 2:].mean(axis=0) > FILL)[0]
        if cols.size == 0:
            continue
        bx0, bx1 = w // 2 + int(cols.min()), w // 2 + int(cols.max())
        inset = max(4, int(0.04 * (bx1 - bx0)))
        box = (bx0 + inset, y0 + 2, bx1 - inset, y1 - 2)
        raw = ocr_code(img, box, crops_dir, f'p{pn:04d}_y{y0}')
        res.append({'pdfPage': pn, 'y': y0, 'raw': raw, 'code': normalise(raw)})
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pdf')
    ap.add_argument('--image', help='một ảnh trang để thử (không cần PDF)')
    ap.add_argument('--pages', default='')
    ap.add_argument('--out', default='data/wco-op')
    ap.add_argument('--crops', default='', help='lưu ảnh dải đã xử lý để soát tay')
    ap.add_argument('--detect-only', action='store_true', help='chỉ đếm dải, không OCR')
    a = ap.parse_args()

    results = []
    if a.image:
        img = Image.open(a.image)
        bs = find_banners(img)
        print(f'{len(bs)} dải: {bs}')
        if a.detect_only:
            return
        results = page_banners(img, 1, a.crops)
    else:
        if not a.pdf:
            sys.exit('Cần --pdf hoặc --image')
        import fitz
        doc = fitz.open(a.pdf)
        lo, hi = 1, doc.page_count
        if a.pages:
            m = re.match(r'(\d+)-(\d+)$', a.pages)
            if not m:
                sys.exit('--pages dạng 1-50')
            lo, hi = max(1, int(m.group(1))), min(doc.page_count, int(m.group(2)))
        for pn in range(lo, hi + 1):
            pix = doc[pn - 1].get_pixmap(dpi=DPI)
            img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            if a.detect_only:
                results += [{'pdfPage': pn, 'y': y0} for (y0, _) in find_banners(img)]
            else:
                results += page_banners(img, pn, a.crops)
    if a.detect_only:
        print(f'{len(results)} dải trên các trang đã quét')
        return
    os.makedirs(a.out, exist_ok=True)
    path = os.path.join(a.out, 'banners.jsonl')
    # chặn ghi nếu thư mục ra không bị git ignore
    top = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, cwd=os.path.abspath(a.out))
    if top.returncode == 0 and subprocess.run(['git', 'check-ignore', '-q', path], cwd=top.stdout.strip()).returncode != 0:
        sys.exit(f'TỪ CHỐI ghi {path}: không nằm trong .gitignore. Dùng data/wco-op/.')
    with open(path, 'w', encoding='utf-8') as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    bad = [r for r in results if not r['code']]
    print(f'{len(results)} dải; {len(bad)} dải không đọc được mã → {path}')


if __name__ == '__main__':
    main()
