#!/usr/bin/env python3
"""M-10 bước 1: tách hai cột Việt / Anh trên các trang có chú giải của Danh mục kèm Thông tư 31/2022/TT-BTC.
Vào : <thư mục>/bbox/cb-<số>.bbox.html  (pdftotext -bbox-layout tt-31-2022-cb-<số>.pdf, poppler; PDF xoay 90 độ)
Ra  : <thư mục>/dong.jsonl   (mỗi dòng in một dòng: so, trang PDF, trangCongBao, cot, y, x, chu)
      <thư mục>/cb-<số>.{vi,en}.txt (một khối \\f mỗi trang PDF; trang không có chú giải để trống)
      <thư mục>/cot.json     (khe cột từng trang, chỗ mập mờ)
Tất định, không mạng, không AI, không sửa chữ.
  python3 scripts/luat-goc/tt31-cot.py [~/luat-goc-txt-m10]
"""
import glob, html, json, os, re, sys, unicodedata

D = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/luat-goc-txt-m10')
RE_W = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>')
nfc = lambda s: unicodedata.normalize('NFC', s)
CAO = 842.0

def cac_trang(f):
    for p in open(f, encoding='utf8').read().split('<page ')[1:]:
        W = []
        for a, b, c, d, w in RE_W.findall(p):
            a, b, c, d = map(float, (a, b, c, d))
            W.append((CAO - d, a, CAO - b, c, nfc(html.unescape(w))))      # xoay về ngang: x0,y0,x1,y1
        yield W

def gom(W):
    """gom từ thành dòng theo tâm y; chữ nhỏ (chỉ số trên/dưới) nhập vào dòng chồng lấn nhiều nhất"""
    if not W: return []
    cao = sorted(r[3] - r[1] for r in W)[len(W) // 2]
    to = [r for r in W if r[3] - r[1] > 0.8 * cao]; nho = [r for r in W if r[3] - r[1] <= 0.8 * cao]
    L = []
    for r in sorted(to, key=lambda r: ((r[1] + r[3]) / 2, r[0])):
        m = (r[1] + r[3]) / 2
        if L and m - L[-1][0] < 5: L[-1][1].append(r)
        else: L.append([m, [r]])
    for r in nho:
        m = (r[1] + r[3]) / 2
        j = min(range(len(L)), key=lambda i: abs(L[i][0] - m)) if L else None
        if j is not None and abs(L[j][0] - m) < 9: L[j][1].append(r)
        else: L.append([m, [r]])
    L.sort(key=lambda l: l[0])
    return [(m, sorted(x)) for m, x in L]

def khe(W):
    """khe trống rộng nhất (không từ nào cắt qua) quanh giữa trang"""
    iv = sorted((r[0], r[2]) for r in W if r[2] > 330 and r[0] < 520)
    best = (0, 0, 0); cuoi = None
    for a, b in iv:
        if cuoi is not None and a - cuoi > best[0] and 380 < (a + cuoi) / 2 < 500: best = (a - cuoi, cuoi, a)
        cuoi = b if cuoi is None else max(cuoi, b)
    return best

def main():
    ra = open(os.path.join(D, 'dong.jsonl'), 'w', encoding='utf8'); bao = []
    trong = False                # đang ở vùng chú giải?
    for f in sorted(glob.glob(os.path.join(D, 'bbox', 'cb-*.bbox.html'))):
        so = re.search(r'cb-(\d+-\d+)', f)[1]
        tv, te = [], []
        pages = list(cac_trang(f))
        # độ lệch trang Công báo: số trang in ở góc
        for k, W in enumerate(pages, 1):
            gocs = {r[4] for r in W if re.fullmatch(r'\d{1,3}', r[4]) and (r[1] > 540 or r[0] > 765 or (r[1] < 62 and (r[0] < 85 or r[0] > 745)))}
            lech = 3 if so == '523-524' else 1
            tcb = k + lech
            if str(tcb) not in gocs: bao.append(dict(so=so, trang=k, loi='khong thay so trang in', thay=sorted(gocs)))
            than = [r for r in W if r[0] < 762 and 60 < (r[1] + r[3]) / 2 < 543 and not (r[0] > 745 and r[4] == str(tcb) and r[1] > 535)]
            dongs = gom(than)
            # vùng chú giải trong trang
            vung = []
            if k == 1: trong = False            # trang đầu số Công báo: bìa, vùng chú giải mở lại ở tiêu đề Phần/Chương
            for m, x in dongs:
                t = ' '.join(r[4] for r in x)
                tr = ' '.join(r[4] for r in x if r[0] < 400); ph = ' '.join(r[4] for r in x if r[0] >= 400)
                if re.fullmatch(r'PHẦN [IVX]+|Chương \d{1,2}', tr.strip()) and re.match(r'(SECTION|Chapter) ', ph.strip()):
                    trong = True
                if re.match(r'P[Hh][ÂâẤ]N[ -]?C[Hh]', tr.strip()) or re.match(r'SUB-?CHAPTER', ph.strip(), re.I): trong = False
                if re.search(r'Mã hàng', tr) and re.search(r'Code|Description', ph): 
                    trong = False
                    TH = {'Đơn', 'vị', 'tính', 'Unit', 'of', 'quantity', 'Mô', 'tả', 'hàng', 'hóa', 'Mã', 'Code', 'Description'}
                    while vung and m - vung[-1][0] < 20 and all(r[4] in TH for r in vung[-1][1]): vung.pop()      # dòng đầu bảng nằm trên dòng "Mã hàng"
                    continue
                if trong and not t.startswith('(Xem tiếp Công báo'): vung.append((m, x))
            # đơn vị "tính/quantity" còn sót sau dòng Mã hàng đã ngoài vùng
            ws = [r for m, x in vung for r in x]
            if not ws: tv.append(''); te.append(''); continue
            g, a, b = khe(ws); cat = (a + b) / 2
            if g < 12 and not any(re.match(r'Chú giải|Notes?\b', ' '.join(r[4] for r in x)) for m, x in vung): cat = 420.0; g = -1   # trang chỉ có tiêu đề, không có chú giải
            if 0 <= g < 12: bao.append(dict(so=so, trang=k, loi='khe hep', khe=[round(g, 1), round(a, 1), round(b, 1)]))
            ymax = max(m for m, _ in vung); ymin = min(m for m, _ in vung)
            for cot, ds, out in (('vi', [r for r in ws if r[0] < cat], tv), ('en', [r for r in ws if r[0] >= cat], te)):
                o = []
                for m, x in gom(ds):
                    s = ''; px = None
                    for r in x:
                        if px is not None: s += ' '
                        s += r[4]; px = r[2]
                    ra.write(json.dumps(dict(so=so, trang=k, tcb=tcb, cot=cot, y=round(m, 1), x=round(x[0][0], 1), x1=round(x[-1][2], 1), chu=s), ensure_ascii=False) + '\n')
                    o.append(s)
                out.append('\n'.join(o))
            bao.append(dict(so=so, trang=k, khe=[round(g, 1), round(a, 1), round(b, 1)]))
        for cot, o in (('vi', tv), ('en', te)):
            open(os.path.join(D, f'cb-{so}.{cot}.txt'), 'w', encoding='utf8').write('\f'.join(o) + '\n')
    json.dump(bao, open(os.path.join(D, 'cot.json'), 'w'), ensure_ascii=False, indent=0)
    print('trang có chú giải:', sum('loi' not in b for b in bao)); print([b for b in bao if 'loi' in b])
main()
