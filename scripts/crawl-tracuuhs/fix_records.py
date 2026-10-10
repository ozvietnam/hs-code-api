#!/usr/bin/env python3
"""
Fix các lỗi validate cho file tracuuhs batch 1 + deprecated.
- Balance parens trong reasonVi + description
- Điền evidence.ketLuan từ reasonVi
- Điền description ngắn từ Tên gọi theo cấu tạo
- Sửa bieuThue theo ngày BH (2022-12-01 là ranh giới)
"""
import json
import re
import sys

def balance_parens(text):
    """Cân bằng ( ) và " " trong text. Nếu đã có "mã số XXXX.XX.XX" thì KHÔNG cắt."""
    if not text:
        return text
    # Cân bằng ( )
    opens = text.count('(')
    closes = text.count(')')
    if opens > closes:
        # Cắt tại ( cuối cùng
        last = text.rfind('(')
        text = text[:last].rstrip()
    elif closes > opens:
        text = text + ')'
    # Cân bằng " " và " "
    quotes = text.count('"') - text.count('\\"')
    if quotes % 2 == 1:
        # Cắt tại " cuối cùng
        last = text.rfind('"')
        if last > 0:
            text = text[:last]
    # Cân bằng smart quote “ ”
    smart_open = text.count('“')
    smart_close = text.count('”')
    if smart_open > smart_close:
        # Nếu đã có "mã số XXXX.XX.XX" - KHÔNG cắt, chỉ thêm ” cuối
        if re.search(r'mã số\s+\d{4}\.\d{2}\.\d{2}', text):
            text = text + '”'
        else:
            last = text.rfind('“')
            if last > 0:
                text = text[:last].rstrip()
    elif smart_close > smart_open:
        text = text + '“'
    return text


def fix_record(rec, src_text=''):
    """Fix 1 record"""
    # 1. Balance parens trong description
    if rec.get('description'):
        rec['description'] = balance_parens(rec['description'])

    # 2. Balance parens trong reasonVi
    if rec.get('reasonVi'):
        rec['reasonVi'] = balance_parens(rec['reasonVi'])

    # 3. evidence.ketLuan từ reasonVi
    if rec.get('reasonVi') and len(rec['reasonVi']) >= 30:
        if 'evidence' not in rec:
            rec['evidence'] = {}
        rec['evidence']['ketLuan'] = rec['reasonVi']
    elif src_text:
        # Fallback: tìm "thuộc X.YY" từ src_text (noi_dung gốc)
        m = re.search(r'(thuộc|Thuộc)\s+[\d\.]+.{30,1000}', src_text, re.DOTALL)
        if m:
            snippet = m.group(0)
            for stop in ['./.', 'Căn cứ', 'tại Danh mục', '\n\n']:
                if stop in snippet:
                    snippet = snippet[:snippet.find(stop)]
                    if stop == './.':
                        snippet += './.'
                    break
            if 'evidence' not in rec:
                rec['evidence'] = {}
            rec['evidence']['ketLuan'] = balance_parens(snippet.strip()[:1000])
            if not rec.get('reasonVi') or len(rec['reasonVi']) < 30:
                rec['reasonVi'] = rec['evidence']['ketLuan']

    # 4. BieuThue theo ngày BH
    issued = rec.get('source', {}).get('issuedDate', '')
    if issued:
        # Parse YYYY-MM-DD
        try:
            y, m, d = issued.split('-')
            y, m, d = int(y), int(m), int(d)
            # Theo rule hs-code-api: <2018-01-01 → "2012", <2022-12-01 → "2017", >=2022-12-01 → "2022"
            if y < 2018:
                rec['attributes']['bieuThue'] = '2012' if y < 2016 else '2017'
            elif y < 2022 or (y == 2022 and m < 12):
                rec['attributes']['bieuThue'] = '2017'
            else:
                rec['attributes']['bieuThue'] = '2022'
        except:
            pass

    return rec


def main():
    if len(sys.argv) < 2:
        print('Usage: fix_records.py <file.json> [<file2.json>...]')
        sys.exit(1)

    for path in sys.argv[1:]:
        print(f'\n=== Fixing {path} ===')
        with open(path) as f:
            data = json.load(f)

        records = data.get('records', [])
        fixed = 0
        for r in records:
            r_old = json.dumps(r, ensure_ascii=False)
            fix_record(r)
            if json.dumps(r, ensure_ascii=False) != r_old:
                fixed += 1

        with open(path, 'w') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'Fixed {fixed}/{len(records)} records')


if __name__ == '__main__':
    main()
