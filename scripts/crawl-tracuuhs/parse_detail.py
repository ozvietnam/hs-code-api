#!/usr/bin/env python3
"""
Crawl trang chi tiết TB-TCHQ từ tracuuhs.com và lưu JSON.
Mỗi 1 lần mở 1 trang (tab cũ). KHÔNG mở nhiều tab (tránh tràn RAM).

Output: data/customs/processed/tracuuhs-detail-{batch}.json
"""
import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

URLS_FILE = '/tmp/tracuuhs_crawl/priority_urls.json'
OUTPUT_DIR = '/Users/ozvietnamdesktop/Documents/Claude/Projects/oz-wiki-plhq/data/customs/processed'
TMP_DIR = '/tmp/tracuuhs_crawl/detail'

# Privacy pattern (audit reject nếu match)
PRIVACY_PATTERNS = [
    r'\b\d{10}\b',  # MST 10 số
    r'\b\d{13}\b',  # MST 13 số
    r'(?:Công ty TNHH|Công ty CP|TNHH|Công ty Cổ phần|Công ty|JSC|Corp|Ltd|Inc)',
]


def parse_detail(text):
    """Parse trang chi tiết TB-TCHQ từ text đã lưu."""
    result = {}

    # Số thông báo
    m = re.search(r'Số thông báo\s*\t?\s*(\S+)', text)
    if m:
        result['so_hieu'] = m.group(1).strip()

    # Năm
    m = re.search(r'Năm ban hành\s*\t?\s*(\d+)', text)
    if m:
        result['nam'] = int(m.group(1))

    # Loại văn bản
    m = re.search(r'Loại văn bản\s*\t?\s*([^\n]+)', text)
    if m:
        result['loai_vb'] = m.group(1).strip()

    # Mã HS 4 số
    m = re.search(r'Mã HS\s*\t?\s*(\d+)', text)
    if m:
        result['nhom_hs'] = m.group(1)

    # Nội dung
    idx = text.find('Nội dung phân loại')
    if idx > 0:
        content = text[idx + len('Nội dung phân loại'):]
        # Cắt tại "Bài viết khác"
        idx2 = content.find('Bài viết khác')
        if idx2 > 0:
            content = content[:idx2]
        idx3 = content.find('HSTC là công cụ miễn phí')
        if idx3 > 0:
            content = content[:idx3]
        result['noi_dung'] = content.strip()[:10000]

    if not result.get('noi_dung'):
        return None

    content = result['noi_dung']

    # Mã HS 8 số
    ma_hs_matches = re.findall(r'mã số\s*(\d{4}\.\d{2}\.\d{2})', content)
    if ma_hs_matches:
        # Lấy mã cuối (thường là kết luận)
        result['ma_hs'] = ma_hs_matches[-1].replace('.', '')
    else:
        result['ma_hs'] = None

    # Tên hàng theo khai báo (hoặc Tên thương mại cho TB XĐT)
    m = re.search(r'Tên hàng theo khai báo:\s*([^\n]+)', content)
    if m:
        result['ten_hang'] = m.group(1).strip()[:300]
    else:
        # TB XĐT: lấy "Tên thương mại:" + "Tên gọi theo cấu tạo, công dụng:"
        m1 = re.search(r'Tên thương mại:\s*([^\n]+)', content)
        m2 = re.search(r'Tên gọi theo cấu tạo[^:]*:\s*([^\n]+)', content)
        parts = []
        if m1:
            parts.append(m1.group(1).strip())
        if m2:
            parts.append(m2.group(1).strip())
        result['ten_hang'] = '; '.join(parts)[:300] if parts else ''

    # Đơn vị XNK
    m = re.search(r'Đơn vị (?:xuất|nhập)\s*khẩu:\s*([^\n]+)', content)
    if m:
        # Redact MST ngay
        don_vi_text = m.group(1).strip()[:200]
        don_vi_text = re.sub(r'\b\d{10,13}\b', '##MST##', don_vi_text)
        result['don_vi_xnk'] = don_vi_text

    # Tóm tắt mô tả
    m = re.search(r'Tóm tắt mô tả và đặc tính hàng hóa:\s*([^\n]+)', content)
    if m:
        result['mo_ta'] = m.group(1).strip()[:300]

    # Kết quả phân loại (câu "thuộc nhóm X.YY... mã số ZZZZ.ZZ.ZZ")
    # Hoặc với TB XĐT: "Kết quả xác định trước mã số: XXXX.XX.XX thuộc nhóm..."
    m = re.search(r'(thuộc|Thuộc)\s+nhóm(?:\s+nhóm)?\s+[\d\.]+.{20,1500}', content, re.DOTALL)
    if not m:
        # Pattern cho TB XĐT: "Kết quả xác định trước mã số: ...\n\nthuộc nhóm..."
        m = re.search(r'Kết quả xác định trước[^:]*:\s*([^\n]{20,1500}thuộc nhóm[\s\S]{20,1000})', content)
    if not m:
        # Pattern "thuộc X.YY ..." (TB cũ, không có chữ "nhóm")
        m = re.search(r'(thuộc|Thuộc)\s+\d{2}\.\d{2}\s+.{20,1500}', content, re.DOTALL)
    if m:
        snippet = m.group(0)
        # Cắt tại "Căn cứ" hoặc "tại Danh mục"
        for stop in ['./.', 'Căn cứ', 'tại Danh mục', '\n\n']:
            if stop in snippet:
                snippet = snippet[:snippet.find(stop)]
                if stop == './.':
                    snippet += './.'
                break
        # Nếu snippet bị cắt giữa smart quote, cắt tại " tiếp theo
        # Pattern: thuộc nhóm X.YY "... chưa đóng quote
        if snippet.count('“') > snippet.count('”'):
            # Cắt tại smart open cuối
            last = snippet.rfind('“')
            if last > 0:
                snippet = snippet[:last].rstrip()
        # Nếu snippet có "thuộc nhóm" mà KHÔNG có "mã số" (chỉ phân nhóm) → lấy thêm từ text gốc
        if 'mã số' not in snippet and 'mã' in snippet:
            # Tìm "mã số XXXX.XX.XX" từ text gốc
            full_text = content
            ma_match = re.search(r'mã số\s+(\d{4}\.\d{2}\.\d{2})', full_text)
            if ma_match:
                # Tìm vị trí "mã số" trong full_text
                ms_idx = full_text.find('mã số')
                if ms_idx > 0:
                    # Mở rộng snippet từ đầu đến hết "mã số XXXX.XX.XX"
                    end_idx = ma_match.end()
                    # Tìm vị trí "thuộc nhóm" trong full_text
                    tn_idx = full_text.find('thuộc nhóm')
                    if tn_idx >= 0 and tn_idx < ms_idx:
                        snippet = full_text[tn_idx:end_idx]
        # Redact MST/tên DN
        snippet = re.sub(r'\b\d{10,13}\b', '##MST##', snippet)
        snippet = re.sub(
            r'(?:Công ty TNHH|Công ty CP|TNHH|Công ty Cổ phần|Công ty)\s+[A-ZÀ-Ỹ][^\n,;]{2,80}',
            '##DN##', snippet, flags=re.IGNORECASE,
        )
        result['reasonVi'] = snippet.strip()[:1000]

    return result


def redact_privacy(text):
    """Redact MST + tên DN khỏi text (dùng ##MST##, ##DN##)."""
    if not text:
        return text
    text = re.sub(r'\b\d{10,13}\b', '##MST##', text)
    text = re.sub(
        r'(?:Công ty TNHH|Công ty CP|TNHH|Công ty Cổ phần|Công ty|JSC|Corp|Ltd|Inc)\s+[A-ZÀ-Ỹ][^\n,;]{2,80}',
        '##DN##', text, flags=re.IGNORECASE,
    )
    return text


def has_privacy_issue(text):
    """Check text có MST/tên DN không (để loại)."""
    if not text:
        return False
    for pat in PRIVACY_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=10, help='Số TB tối đa')
    parser.add_argument('--start', type=int, default=0, help='Bỏ qua N TB đầu')
    parser.add_argument('--output', default=None)
    args = parser.parse_args()

    # Load URLs
    with open(URLS_FILE) as f:
        urls = json.load(f)
    urls = urls[args.start:args.start + args.limit]
    print(f'Xử lý {len(urls)} URLs (từ {args.start})')

    # Output
    if args.output:
        out_file = args.output
    else:
        out_file = f'{OUTPUT_DIR}/tracuuhs-detail-batch-{int(time.time())}.json'

    # Load existing (resume)
    records = []
    done_refs = set()
    if os.path.exists(out_file):
        try:
            with open(out_file) as f:
                old = json.load(f)
            records = old.get('records', [])
            done_refs = {r['so_hieu'] for r in records if r.get('so_hieu')}
            print(f'Resume: {len(records)} records đã có')
        except:
            pass

    os.makedirs(TMP_DIR, exist_ok=True)

    success = 0
    fail = 0
    privacy_reject = 0
    t0 = time.time()

    for i, item in enumerate(urls, 1):
        ref = item['ref']
        url = item['url']

        if ref in done_refs:
            print(f'[{i}/{len(urls)}] {ref} - SKIP (đã có)')
            continue

        print(f'\n[{i}/{len(urls)}] {ref}')
        print(f'  URL: {url}')

        # Mở tab mới (KHÔNG dùng new_tab, dùng goto_url)
        # Sẽ được gọi từ browser harness bên ngoài
        # Ở đây em chỉ xử lý text đã có sẵn trong TMP_DIR

        # Check file đã crawl
        safe_ref = ref.replace('/', '_')
        txt_file = f'{TMP_DIR}/{safe_ref}.txt'

        if not os.path.exists(txt_file):
            print(f'  [SKIP] chưa có file {txt_file}')
            print(f'  Cần chạy browser trước để lưu text')
            fail += 1
            continue

        with open(txt_file) as f:
            text = f.read()

        # Parse
        parsed = parse_detail(text)
        if not parsed:
            print(f'  [SKIP] parse failed')
            fail += 1
            continue

        if not parsed.get('ma_hs'):
            print(f'  [SKIP] không tìm được mã HS 8 số')
            fail += 1
            continue

        # Privacy check
        if has_privacy_issue(parsed.get('ten_hang', '')) or has_privacy_issue(parsed.get('mo_ta', '')):
            privacy_reject += 1
            print(f'  [PRIVACY] bỏ qua (có MST/DN)')
            continue

        # Redact trong noi_dung
        parsed['noi_dung'] = redact_privacy(parsed['noi_dung'])

        # Ghi record
        records.append(parsed)
        success += 1
        print(f'  [OK] HS {parsed["ma_hs"]}: {parsed.get("ten_hang", "")[:80]}')

        # Ghi ngay (atomic)
        data = {
            'kind': 'precedent',
            'contributor': {'name': 'hermes-tracuuhs', 'github': 'ozvietnam'},
            'license': 'CC-BY-SA-4.0',
            'note': f'TB-TCHQ từ tracuuhs.com - batch {args.start}-{args.start+args.limit} ngày 2026-10-10',
            'submittedAt': '2026-10-10T00:00:00Z',
            'records': records,
        }
        tmp = out_file + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, out_file)

    elapsed = time.time() - t0
    print(f'\n{"=" * 60}')
    print(f'XONG: {success} OK, {fail} fail, {privacy_reject} privacy_reject')
    print(f'Thời gian: {elapsed:.1f}s')
    print(f'Output: {out_file} ({len(records)} records)')


if __name__ == '__main__':
    main()
