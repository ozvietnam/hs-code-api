#!/usr/bin/env python3
"""M-16 — đối chiếu kho mới với hai kho cũ và kết luận từng dòng biểu có "(SEN)". Tất định, chỉ đọc data/.

    python3 scripts/luat-goc/sen-doi-chieu.py <tệp .docx>          in số đếm và chỗ lệch
    python3 scripts/luat-goc/sen-doi-chieu.py <tệp .docx> --ghi    ghi thêm docs/mong/the/M-16-dong-sen.md (bảng 971 dòng)
"""
import difflib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sen  # noqa: E402

GOC = sen.GOC
doc = lambda p: json.loads((GOC / p).read_text())
dac = lambda s: re.sub(r'[\W_]+', '', s).lower()


def cham(m):
    return f'{m[:4]}.{m[4:6]}.{m[6:]}'.rstrip('.') if len(m) > 4 else f'{m[:2]}.{m[2:]}'


def lech_kho_cu(muc):
    cu = doc('data/sen-2022.json')['muc']
    moi = defaultdict(list)
    for m in muc:
        if m['ma']:
            moi[tuple(m['ma'])].append(m)
    ket, chua = Counter(), []
    for x in cu:
        ds = moi.get(tuple(x['ma']))
        if not ds:
            ket['kho cũ có, gốc không có đúng bộ mã'] += 1
            chua.append(('KHÔNG CÓ TRONG GỐC', x['ma'], x['trang'], x['tieuDe'][:60]))
            continue
        m = ds.pop(0)
        a = dac(x['tieuDe'] + x['noiDung'])
        than = [d for i, d in enumerate(m['dong']) if not (re.match(r'\(\s*(Nguồn|Source)\s*:', d) or (i == len(m['dong']) - 1 and re.match(r'\W*(Nguồn|Source)\s*:', d)))]
        b = dac(''.join(than))
        if a == b:
            ket['giống hệt (trừ dòng Nguồn)'] += 1
            continue
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
        mat = sum(j2 - j1 for op, _, _, j1, j2 in sm.get_opcodes() if op in ('insert', 'replace'))
        thua = sum(i2 - i1 for op, i1, i2, _, _ in sm.get_opcodes() if op in ('delete', 'replace'))
        loai = 'chỉ thiếu chữ' if not thua else 'chỉ thừa chữ' if not mat else 'vừa thiếu vừa thừa'
        ket[loai] += 1
        chua.append((loai, x['ma'], x['trang'], f'gốc có mà kho cũ không: {mat} ký tự; kho cũ có mà gốc không: {thua}'))
    sot = [m for ds in moi.values() for m in ds]
    return cu, ket, chua, sot


def lech_truong_sen(cu):
    h = doc('data/chu-giai-heading.json')
    theo = defaultdict(list)
    for e in cu:
        for h4 in dict.fromkeys(c[:4] for c in e['ma']):
            theo[h4].append(e)
    co = {k for k, v in h.items() if isinstance(v, dict) and v.get('sen')}
    giong = khac = 0
    lech = []
    for k in sorted(co | set(theo)):
        t = '\n\n'.join(f"[{', '.join(f'{c[:4]}.{c[4:6]}.{c[6:]}' for c in e['ma'])}] {e['tieuDe']}: {e['noiDung']}" for e in theo.get(k, []))
        if k in co and t == h[k]['sen']:
            giong += 1
        else:
            lech.append((k, k in co, k in theo))
    return len(co), giong, lech


def dong_sen(muc):
    t = doc('data/tax.json')
    theo_ma = defaultdict(list)
    for l in (GOC / 'data/luat-goc/sen.jsonl').read_text().splitlines():
        x = json.loads(l)
        if x['id'].startswith('sen:'):
            theo_ma[x['id'].split(':')[1]].append(x['id'])
    ra = []
    for k in sorted(t):
        ten = t[k]['vn']
        if '(SEN)' not in ten:
            continue
        tung = {n: theo_ma.get(k[:n], []) for n in (8, 7, 6, 5, 4)}
        rong = [i for n in (7, 6, 5, 4) for i in tung[n]]
        cap = []  # mục cấp Chương 87 / Phần XI: bản in không có mã; nhận theo đúng thuật ngữ in kèm "(SEN)" trong tên dòng
        if k[:2] == '87' and 'CKD' in ten:
            cap.append('chuong:87:cgbs:1')
        if k[:2] == '87' and 'khối lượng toàn bộ theo thiết kế (SEN)' in ten:
            cap.append('chuong:87:cgbs:2')
        batik = 50 <= int(k[:2]) <= 63 and 'batik truyền thống' in ten.lower()
        if tung[8]:
            kl = 'đúng mã'
        elif tung[7] or tung[6] or tung[5]:
            kl = 'cấp 5–7 số phủ'
        elif cap:
            kl = 'SEN cấp Chương 87'
        elif batik:
            kl = 'SEN cấp Phần XI (batik), chờ id'
        elif tung[4]:
            kl = 'cấp 4 số phủ'
        else:
            kl = 'KHÔNG CÓ'
        ids = tung[8] + rong + cap + (['(Phần XI – batik)'] if batik else [])
        ra.append((k, ten, kl, ids))
    return ra


def main():
    muc, _ = sen.doc_muc(sys.argv[1])
    cu, ket, chua, sot = lech_kho_cu(muc)
    print('== data/sen-2022.json so với bản gốc:', len(cu), 'mục;', dict(ket))
    print('   mục gốc có, kho cũ không có:', [m['so'] for m in sot])
    for c in chua:
        print('  ', c[0], '|', ' '.join(cham(x) for x in c[1]), '| tr.', c[2], '|', c[3])
    n, g, l = lech_truong_sen(cu)
    print(f'== trường .sen: {n} nhóm, {g} nhóm dựng lại từ sen-2022.json giống từng ký tự; lệch:', l)
    ds = dong_sen(muc)
    print('== dòng (SEN):', len(ds), dict(Counter(x[2] for x in ds)))
    for x in ds:
        if x[2] in ('KHÔNG CÓ', 'SEN cấp Chương 87'):
            print('  ', x[0], x[1], '→', x[2], x[3])
    if '--ghi' in sys.argv:
        o = ['# M-16 – kết luận từng dòng biểu có "(SEN)"', '', f'{len(ds)} dòng, máy sinh bằng `scripts/luat-goc/sen-doi-chieu.py`, không sửa tay. "Đúng mã" = có mục in đúng mã 8 số. "Phủ" = mục in mã ngắn hơn chứa dòng; phủ theo mã, chưa xét nội dung mục có nói về dòng.', '']
        for kl in dict.fromkeys(x[2] for x in sorted(ds, key=lambda x: x[2] == 'đúng mã')):
            nhom = [x for x in ds if x[2] == kl]
            o += [f'## {kl}: {len(nhom)}', '', '| Dòng | Tên in trong biểu | Nút |', '|---|---|---|']
            o += [f'| {a} | {b.lstrip("- ").replace("|", "/")} | {", ".join(i)} |' for a, b, _, i in nhom] + ['']
        (GOC / 'docs/mong/the/M-16-dong-sen.md').write_text('\n'.join(o))


main()
