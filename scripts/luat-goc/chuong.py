#!/usr/bin/env python3
"""M-13: rút chú giải 97 Chương (chữ luật) và khái quát (hướng dẫn) từ bản chữ PDF Chú giải chi tiết HS 2022.
Tất định, không mạng, không AI. Trang = thứ tự khối \\f (trùng số trang in "— N —").
  python3 scripts/luat-goc/chuong.py [--txt ~/luat-goc-txt/cgct-hs2022.txt] [--ra data/luat-goc/chuong.jsonl] [--phang <tệp chuong.txt cho LUAT_GOC_TXT>] [--bao]
Nút cha giữ lời dẫn và đoạn kết của chính nó, nút con giữ chữ của con: mỗi chữ chỉ nằm ở một nút.
Đoạn nằm sau nút con được ghi ở doanSau: [{sauNut, tu}] (tu = vị trí ký tự bắt đầu đoạn trong nguyenVan).
"""
import argparse, json, os, re, sys, unicodedata
from collections import Counter

NGUON = 'Chú giải chi tiết HS 2022 (bản dịch kèm CV 1810/TCHQ-TXNK 2024)'
GOC = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
nfc = lambda s: unicodedata.normalize('NFC', s)
RE_TRANG = re.compile(r'^\s*[—–]\s*(\d+)\s*[—–]\s*$')
RE_TIEU_DE = re.compile(r'^\s*(?:Chương|Chuong)\s+(\d{1,2})\s*:')
RE_KQ = re.compile(r'^\s*(?:TỔNG QUÁT|KHÁI QUÁT CHUNG)\s*\.?$')
RE_CG = re.compile(r'^\s*(?:1 )?Chú giải\s*[.:]?$')
RE_CGPN = re.compile(r'^\s*Chú giải [Pp]hân nhóm\s*[.:]?$')
RE_CGBS = re.compile(r'^\s*Chú giải bổ sung\s*[.:]?$', re.I)
RE_CGCT = re.compile(r'^\s*Chú giải chi tiết phân nhóm\s*[.:]?$')
RE_SAO = re.compile(r'^\s*\*(?:\s*\*)*\s*$')
ALPHA = ['a','b','c','d','e','f','g','h','ij','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']
ROMAN = ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii']
HOA = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

def doc(txt, sua):
    """đọc bản chữ, áp sua-tay. Mỗi mục: dãy dòng liền nhau (bỏ qua khoảng trắng) -> dãy dòng mới, cùng bộ chữ."""
    tr = nfc(open(os.path.expanduser(txt), encoding='utf8').read()).split('\f')
    gon = lambda z: re.sub(r'\s+', ' ', z).strip()
    for s in sua:
        L = [l for l in tr[s['trang'] - 1].split('\n') if l.strip()]; tim = [gon(nfc(x)) for x in s['tim']]; thay = [nfc(x) for x in s['thay']]
        vt = [k for k in range(len(L)) if [gon(x) for x in L[k:k + len(tim)]] == tim]
        if len(vt) != 1: sys.exit(f"sua-tay trang {s['trang']}: khớp {len(vt)} chỗ: {tim[0]!r}")
        if Counter(re.sub(r'\s', '', ''.join(tim))) != Counter(re.sub(r'\s', '', ''.join(thay))): sys.exit(f"sua-tay trang {s['trang']}: đổi chữ: {tim[0]!r}")
        L[vt[0]:vt[0] + len(tim)] = thay; tr[s['trang'] - 1] = '\n'.join(L)
    return tr

def dong_trang(t, n):
    ra = []
    for l in t.split('\n'):
        m = RE_TRANG.match(l)
        if m:
            if int(m[1]) != n: sys.exit(f'trang {n}: số in {m[1]}')
            continue
        if l.strip(): ra.append(l.replace('\t', '    ').rstrip())
    return ra

def vung(tr):
    """chương -> [(trang, dòng)] từ tiêu đề tới trước nhóm đầu tiên."""
    bd = {}
    for n, t in enumerate(tr, 1):
        if n < 8: continue
        L = dong_trang(t, n)
        m = L and RE_TIEU_DE.match(L[0])
        if m: bd.setdefault(int(m[1]), n)
    ra = {}
    for c, n0 in bd.items():
        o = []; het = None; n = n0
        dau = re.compile(r'^\s*(?:%02d\.\d\d\s*[-–—]\s*\S|\[%02d\.\d\d\])' % (c, c))
        while n < n0 + 25 and not het:
            for l in dong_trang(tr[n - 1], n):
                if dau.match(l): het = (n, l.strip()); break
                o.append((n, l))
            n += 1
        if not het: sys.exit(f'Chương {c}: không thấy nhóm đầu tiên')
        ra[c] = (o, het)
    return ra

RE_PC = re.compile(r'^\s*(?:PHÂN CHƯƠNG|Phân[ -][Cc]hương)\s+([IVX]+|1)\s*:\s*[A-ZĐÀ-Ỹ]{2}')
PC = {28: 6, 29: 13, 39: 2, 63: 3, 69: 2, 71: 3, 72: 4}   # số Phân chương đếm trong PDF; lệch thì dừng
LA_MA = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII']

def phan_chuong(tr, bd):
    """(chương, số in) -> (dòng tên, dòng Tổng quát): từ tiêu đề Phân chương tới trước nhóm kế, kể cả khi in sau nhóm đầu."""
    ds = []; c = None; mo = None
    for n, t in enumerate(tr, 1):
        for l in dong_trang(t, n):
            c2 = next((k for k, v in bd.items() if v == n), None)
            if c2: c = c2
            if c and RE_PC.match(l): mo = [c, RE_PC.match(l)[1], [(n, l)], []]; ds.append(mo); continue
            if not mo: continue
            if re.match(r'^\s*%02d\.\d\d\s*[-–—]\s*\S' % mo[0], l): mo = None; continue
            if not mo[3] and not RE_KQ.match(l) and l.strip().isupper(): mo[2].append((n, l))
            else: mo[3].append((n, l))
    for k, so in PC.items():
        d = [LA_MA.index('I' if x[1] == '1' else x[1]) + 1 for x in ds if x[0] == k]
        if d != list(range(1, so + 1)): sys.exit(f'Phân chương {k}: {d}')
    if len(ds) != sum(PC.values()): sys.exit('Phân chương ở chương lạ')
    return ds

def noi(a, b):
    """nối hai dòng bị ngắt."""
    if re.search(r'\w-$', a) and not re.match(r'(hoặc|và)\b', b): return a + b
    return a + ' ' + b

class Nut:
    def __init__(s, id, cha, so, trang, kieu=None, gt=None, cot=0):
        s.id, s.cha, s.so, s.trang, s.kieu, s.gt, s.cot = id, cha, so, trang, kieu, gt, cot
        s.doan = []   # [(text, sauNut|None)]
        s.con = []; s.cuoi = cot; s.tcot = cot
    def them(s, l, moi, sau=None):
        t = re.sub(r'[  ]{2,}', '  ', l.strip()) if moi == 'bang' else re.sub(r'\s+', ' ', l.strip())
        if not s.doan or moi or (sau and s.doan[-1][1] != sau):
            s.doan.append([t, sau])
        else: s.doan[-1][0] = noi(s.doan[-1][0], t)

MOC = [('so', re.compile(r'^(\d{1,2})\s?(?:\.\s?[-–]|\.|[-–])\s*(?=\D)')), ('ngoac', re.compile(r'^\(?([a-zđ]{1,4}|[A-Z]|\d{1,2})\)\s*')), ]

def cac_moc(t):
    m = MOC[0][1].match(t)
    if m: return [('so', m[1], m.end())]
    m = MOC[1][1].match(t)
    if not m: return []
    v = m[1]; r = []
    if v.isdigit(): return [('n', v, m.end())]
    if v in HOA: return [('A', v, m.end())]
    if v in ALPHA: r.append(('a', v, m.end()))
    if v in ROMAN: r.append(('i', v, m.end()))
    if v == 'i' : r.append(('a', 'i', m.end()))
    return r

def ke(kieu, v):
    if kieu in ('so', 's2', 'n'): return str(int(v) + 1)
    d = {'a': ALPHA, 'i': ROMAN, 'A': HOA}[kieu]
    if kieu == 'a' and v == 'h': return ('ij', 'i')
    if kieu == 'a' and v == 'i': return ('j', 'k', 'ij')
    k = d.index(v); return d[k + 1] if k + 1 < len(d) else None

def la_ke(kieu, v, w):
    k = ke(kieu, v); return w in k if isinstance(k, tuple) else k == w
DAU = {'so': '1', 's2': '1', 'n': '1', 'a': 'a', 'i': 'i', 'A': 'A'}

def tach(goc, dong, co, nuts, bao, giu=(), toi={}, doi=()):
    """dong: [(trang, dòng)] -> nút goc:1, goc:1:a …
    giu: id mà đoạn lề trái sau nó vẫn thuộc nó; toi: id -> id nhận đoạn kết (mặc định: nút cha gần nhất thụt ít hơn)."""
    ngan = []; truoc = ''; ds = []; so_cuoi = '0'; tbang = False
    def mo(cha, kieu, v, in_so, t, cot, e, trang):
        idv = v if kieu == 'A' else v.lower()
        x = Nut(f'{cha.id if cha else goc}:{idv}', cha.id if cha else co, ((cha.so if cha else '') + (f'({v})' if cha else v)) if in_so else None, trang, kieu, v, cot)
        x.tcot = cot + e; x.cuoiCon = {}; nuts.append(x); ngan.append(x)
        if cha: cha.con.append(x.id); cha.cuoiCon[kieu] = v
        return x
    for trang, l in dong:
        t = l.strip(); cot = len(l) - len(l.lstrip()); chon = None
        dm = next((d for d in doi if d['trang'] == trang and re.sub(r'\s+', ' ', t).startswith(d['dau'])), None); bo = bool(dm)
        if dm: dm['da'] = True
        moc = [] if bo else cac_moc(t)
        for kieu, v, e in moc:
            if kieu == 'so':
                if la_ke('so', so_cuoi, v): chon = ('so', v, e, -1, True); break
                kieu = 's2'
            for k in range(len(ngan) - 1, -1, -1):
                w = ngan[k].cuoiCon.get(kieu)
                if w and la_ke('n' if kieu == 's2' else kieu, w, v): chon = (kieu, v, e, k, True); break
            if chon: break
        if not chon:
            for kieu, v, e in moc:
                if kieu == 'so': kieu = 's2'
                if v == DAU[kieu] and ngan:
                    # danh sách mở lại trong cùng nút: khối thứ 2, không số in
                    k = next((q for q in range(len(ngan)) if kieu in ngan[q].cuoiCon), None)
                    if k is not None and (k == len(ngan) - 1):
                        P = ngan[k]; dan = P.doan.pop() if P.doan and P.doan[-1][1] else None
                        if not dan or any(z.startswith(P.id + ':2') for z in P.con): sys.exit(f'{P.id} tr{trang}: danh sách mở lại không rõ lời dẫn: {t[:60]}')
                        y = mo(P, 'khoi', '2', False, t, cot, e, dtr); y.doan = [[dan[0], None]]; y.so = None; y.soCha = P.so
                        bao.append(f'KHỐI {y.id} tr{trang}: {dan[0][:80]}')
                    chon = (kieu, v, e, len(ngan) - 1, True); break
        if chon:
            kieu, v, e, k, _ = chon
            if kieu == 'so': so_cuoi = v; ngan = []; cha = None
            else: del ngan[k + 1:]; cha = ngan[-1]
            if cha is not None and cha.so is None: cha.so = cha.soCha; x = mo(cha, kieu, v, True, t, cot, e, trang); cha.so = None
            else: x = mo(cha, kieu, v, True, t, cot, e, trang)
            t0 = t
            while True:   # nhiều mốc trên một dòng: "6. (A) …", "3. (a) …", "(a) (i) …"
                r = [z for z in cac_moc(t0[e:].lstrip()) if z[0] != 'so' and z[1] == DAU[z[0]] and z[0] != x.kieu]
                if not r: break
                kk, vv, ee = r[0]; x.them(t0[:e].rstrip(), True); cot += e + len(t0[e:]) - len(t0[e:].lstrip()); t0 = t0[e:].lstrip(); e = ee
                x = mo(x, kk, vv, True, t0, cot, e, trang)
            x.them(t0, True); x.cuoi = x.tcot
        else:
            if not ngan: ds.append((trang, t)); truoc = t; continue
            if cac_moc(t) and not dm: bao.append(f'MỐC BỎ {ngan[-1].id} tr{trang} cột {cot}: …{truoc[-40:]} ‖ {t[:60]}')
            if dm and dm.get('toi'): del ngan[[z.id for z in ngan].index(dm['toi']) + 1:]
            if dm and dm.get('khoi'):
                P = ngan[-1]; y = mo(P, 'khoi', '2', False, t, cot, 0, trang); y.soCha = P.so; y.them(l, True); y.cuoi = cot; truoc = t; dtr = trang
                bao.append(f'KHỐI {y.id} tr{trang}: {t[:80]}'); continue
            x = ngan[-1]
            thuong = t[0].islower()
            lien = thuong or not re.search(r'[.;:…]["”)]?$|[;:.,]\s*(?:hoặc|và)$', truoc) and not re.match(r'^(BẢNG|Bảng)\b', t)
            bang = not thuong and bool(re.search(r'\S\s{3,}\S', l)) and (len(re.sub(r'\s{3,}', '', l)) < 75 or not l.startswith(' ') and len(l) > 105)
            gach = bool(re.match(r'^[-–] ', t))
            if len(ngan) > 1 and not bang and not gach and cot < x.tcot - 1:
                if not lien and x.id not in giu:
                    k = len(ngan) - 1
                    while k > 0 and cot <= ngan[k].cot: k -= 1
                    if x.id in toi: k = [z.id for z in ngan].index(toi[x.id])
                    bao.append(f'ĐUÔI {x.id} -> {ngan[k].id} tr{trang} cột {cot}: …{truoc[-30:]} ‖ {t[:70]}')
                    del ngan[k + 1:]; x = ngan[k]
                elif lien and not thuong and cot < x.cot - 2 and len(x.doan) == 1 and len(x.doan[0][0]) < 70 and re.match(r'[A-ZĐÀ-Ỹ]', t): lien = False; truoc = ''
                elif lien and not thuong and cot < x.cot - 2: bao.append(f'NỐI {x.id} tr{trang} cột {cot}<{x.cot}: …{truoc[-30:]} ‖ {t[:70]}')
            sau = x.con[-1] if x.con else None
            moi = bool(x.doan) and ('bang' if bang else True if gach or (tbang and not thuong) or (dm and dm.get('moi')) or re.match(r'^(BẢNG|Bảng)\b', t) else not lien and (cot != x.cuoi or len(truoc) < 70))
            x.them(l, moi, sau); x.cuoi = cot; dtr = trang
        truoc = t; tbang = not chon and bang
    return ds

def khai_quat(dong):
    """gộp khái quát thành đoạn: mỗi đoạn lề trái một nút, danh sách đi cùng lời dẫn của nó."""
    ds = []; truoc = ''; sao = False
    for trang, l in dong:
        t = l.strip(); cot = len(l) - len(l.lstrip())
        if RE_SAO.match(l): sao = True; continue
        tieu = bool(RE_KQ.match(l) or RE_CGPN.match(l) or RE_CGCT.match(l))
        het = bool(re.search(r'[.:;…!]["”)\]]*$', truoc)) or (len(truoc) < 60 and not re.match(r'[\d(a-zà-ỹ]', t))
        if ds and ds[-1][2] and t.isupper() and not tieu: ds[-1][1][-1] = noi(ds[-1][1][-1], t); truoc = t; continue
        bang = bool(re.search(r'\S\s{3,}\S', l)) and (len(re.sub(r'\s{3,}', '', l)) < 75 or not l.startswith(' ') and len(l) > 105)
        moc = bool(re.match(r'^(\(?[a-zA-Z0-9]{1,4}\)|\d{1,2}[.-]|[-–*•])\s', t))
        if not ds or tieu or (sao and cot <= 3) or (cot <= 1 and not moc and het and not bang and not truoc.endswith(':')):
            ds.append([trang, [t], tieu])
        else:
            d = ds[-1][1]
            if bang or (het and (moc or cot > 1)) or moc or d and ds[-1][2] and len(d) == 1: d.append(re.sub(r'\s{3,}', '  ', t) if bang else t)
            else: d[-1] = noi(d[-1], t)
        truoc = t; sao = False
    # tiêu đề đứng riêng nhập vào đoạn kế
    ra = []
    for tr_, d, tieu in ds:
        dm = lambda z: z[2] or (len(z[1]) == 1 and len(z[1][0]) < 70 and not re.search(r'[.;:…]$', z[1][0]))
        if ra and (dm(ra[-1]) or (ra[-1][3] and dm([0, ra[-1][1][-1:], 0]))): ra[-1][1] += d; ra[-1][2] = tieu; ra[-1][3] = len(d) == 1 and dm([0, d, tieu])
        else: ra.append([tr_, list(d), tieu, False])
    return [(x[0], x[1]) for x in ra]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--txt', default='~/luat-goc-txt/cgct-hs2022.txt')
    ap.add_argument('--ra', default=os.path.join(GOC, 'data/luat-goc/chuong.jsonl')); ap.add_argument('--phang')
    ap.add_argument('--sua', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chuong-sua-tay.py')); ap.add_argument('--bao', action='store_true')
    a = ap.parse_args()
    sua = {}
    if os.path.exists(a.sua): exec(compile(open(a.sua, encoding='utf8').read(), a.sua, 'exec'), sua)
    SUA = sua.get('SUA', []); GIU = set(sua.get('GIU', [])); TOI = sua.get('TOI', {}); DOI = sua.get('DOI', [])
    tr = doc(a.txt, SUA); V = vung(tr); PCS = phan_chuong(tr, {c: o[0][0][0] for c, o in V.items()}); bao = []; het_nut = []; phang = []
    for c in sorted(V):
        o, het = V[c]; C = f'{c:02d}'; goc = f'chuong:{C}'
        muc = [('ten', [])]
        k0 = next((q for q, (n, l) in enumerate(o) if RE_PC.match(l)), None)
        pc1 = o[k0:] if k0 is not None else []; o = o[:k0] if k0 is not None else o   # Phân chương I đứng trước nhóm đầu: ghi ở pc
        for n, l in o:
            if muc[-1][0] == 'kq': muc[-1][1].append((n, l)); continue
            if RE_KQ.match(l) or RE_CGCT.match(l): muc.append(('kq', [(n, l)])); continue
            if RE_CG.match(l): muc.append(('cg', [])); continue
            if RE_CGPN.match(l): muc.append(('cgpn', [])); continue
            if RE_CGBS.match(l): muc.append(('cgbs', [])); continue
            if RE_SAO.match(l): continue
            if muc[-1][0] == 'ten' and cac_moc(l.strip())[:1] and cac_moc(l.strip())[0][:2] == ('so', '1'): muc.append(('cg', [])); bao.append(f'KHÔNG IN "Chú giải." {goc} tr{n}')
            if l.strip().startswith('Chuong ') or (muc[-1][0] == 'ten' and c == 33 and l.strip() == 'my pham'): bao.append(f'BỎ dòng đầu trang mất dấu {goc} tr{n}: {l.strip()}'); continue
            muc[-1][1].append((n, l))
        ten = Nut(goc, None, str(c), muc[0][1][0][0]); s = ''
        for n, l in muc[0][1]: s = noi(s, l.strip()) if s else l.strip()
        s = re.sub(r'\s+', ' ', s); ten.doan = [[s, None]]; nuts = [ten]
        for k, d in muc[1:]:
            if k == 'kq':
                for q, (n, doan) in enumerate(khai_quat(d), 1):
                    x = Nut(f'{goc}:kq:{q}', goc, None, n); x.doan = [['\n'.join(doan), None]]; nuts.append(x)
            else:
                thua = tach(f'{goc}:{k}', d, goc, nuts, bao, GIU, TOI, DOI)
                if thua: bao.append(f'!! {goc}:{k} chữ trước khoản 1: {thua}')
        so_ngoai = len(nuts); pcd = []
        for _, so, tn, dk in [x for x in PCS if x[0] == c]:
            z = ''
            for n, l in tn: z = noi(z, l.strip()) if z else l.strip()
            y = Nut(f'{goc}:pc:{"I" if so == "1" else so}', goc, so, tn[0][0]); y.doan = [[re.sub(r'\s+', ' ', z), None]]; nuts.append(y); con = []
            for q, (n, doan) in enumerate(khai_quat(dk), 1):
                x = Nut(f'{y.id}:kq:{q}', y.id, None, n); x.doan = [['\n'.join(doan), None]]; nuts.append(x); con.append(x)
            gg = lambda z: re.sub(r'\s', '', z)
            if Counter(gg(''.join(l for _, l in tn + dk if not RE_SAO.match(l)))) != Counter(gg(''.join(d[0] for x in [y] + con for d in x.doan))): bao.append(f'!! {y.id}: lệch chữ')
            if not pcd and pc1 and [l for _, l in pc1] != [l for _, l in tn + dk]: bao.append(f'!! {y.id}: khác đoạn trước nhóm đầu')
            pcd.append(y)
        # kiểm không mất chữ: mọi chữ trong vùng đều nằm ở đúng một nút
        g = lambda z: re.sub(r'\s', '', z)
        A = Counter(g(''.join(l for k, d in muc for _, l in d if not RE_SAO.match(l)))); B = Counter(g(''.join(d[0] for x in nuts[:so_ngoai] for d in x.doan)))
        if A != B: bao.append(f'!! {goc}: lệch chữ thiếu {dict(A-B)} thừa {dict(B-A)}')
        for x in nuts:
            v = ''; ds = []
            for t, sau in x.doan:
                if v: v += '\n'
                if sau and (not ds or ds[-1]['sauNut'] != sau): ds.append({'sauNut': sau, 'tu': len(v)})
                v += t
            loai, lop = ('TEN', 'LUAT') if x.id == goc or re.search(r':pc:[IVX]+$', x.id) else ('KHAI_QUAT', 'HUONG_DAN') if ':kq:' in x.id else ('CHU_GIAI_PHAN_NHOM', 'LUAT') if ':cgpn:' in x.id else ('CHU_GIAI', 'LUAT')
            r = {'id': x.id, 'loai': loai, 'cha': x.cha, 'so': x.so, 'nguyenVan': v, 'lop': lop, 'nguon': {'vanBan': NGUON, 'ban': 'HS2022', 'trang': x.trang}, 'hieuLuc': {'tu': None, 'den': None}}
            if ds: r['doanSau'] = ds
            het_nut.append(r)
    for d in DOI:
        if not d.get('da'): sys.exit(f'sua-tay DOI không dùng: {d}')
    with open(a.ra, 'w', encoding='utf8') as f:
        for r in het_nut: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    if a.phang:   # chữ làm phẳng để cổng đối chiếu: nối dòng, bỏ số trang, áp đúng các mục SUA (chỉ xếp lại chữ)
        ra = []
        for n, t in enumerate(tr, 1):
            for l in dong_trang(t, n):
                z = re.sub(r'\s+', ' ', l.strip())
                if ra: ra.append(noi(ra[-1], '\0' + z)[len(ra[-1]):].replace('\0', '') if not re.match(r'(hoặc|và)\b', z) else ' ' + z)
                else: ra.append(z)
        open(a.phang, 'w', encoding='utf8').write(''.join(ra))
    print(len(het_nut), Counter(r['loai'] for r in het_nut))
    if a.bao: print('\n'.join(bao))
    elif any(b.startswith('!!') for b in bao): sys.exit('\n'.join(b for b in bao if b.startswith('!!')))

if __name__ == '__main__': main()
