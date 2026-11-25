#!/usr/bin/env python3
"""M-10 bước 2: ghép từng khoản chú giải của Danh mục kèm Thông tư 31/2022/TT-BTC (hai cột Việt / Anh) với nút cg / cgpn / cgbs của kho.
Vào : ~/luat-goc-txt-m10/dong.jsonl (do tt31-cot.py dựng), data/luat-goc/{phan,chuong}.jsonl, scripts/luat-goc/tt31-nhan-xet.json
Ra  : data/luat-goc/doi-chieu-tt31/{phan,chuong}.jsonl
Ghép theo SỐ KHOẢN (dãy mốc "1." "(a)" "(ij)" … theo thứ tự in, so dãy với dãy id của kho), KHÔNG theo độ giống chữ.
Chữ chép nguyên, chỉ nối dòng. Tất định, không mạng, không AI.
  python3 scripts/luat-goc/tt31.py [--txt ~/luat-goc-txt-m10] [--ra <thư mục>] [--bao]
"""
import argparse, collections, difflib, json, os, re, sys, unicodedata

GOC = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NFC = lambda s: unicodedata.normalize('NFC', s)

# ───────────────────────── 1. Khối chú giải trong TT31
TIEU_DE = {'vi': (r'PHẦN ([IVX]+)$', r'Chương (\d+)$', r'Chú giải\.?$', r'Chú giải phân nhóm\.?$', r'Chú giải bổ sung'),
           'en': (r'SECTION ([IVX]+)$', r'Chapter (\d+)$', r'Notes?\.?$', r'Subheading Notes?\.?$', r'(?:Additional|Supplementary) Notes?')}

def doc_khoi(tep, cot):
    P, C, G, S, B = map(re.compile, TIEU_DE[cot]); cur = None; kind = 'ten'; K = collections.OrderedDict()
    for l in map(json.loads, open(tep, encoding='utf8')):
        if l['cot'] != cot: continue
        t = l['chu'].strip(); m = P.match(t)
        if m: cur = 'phan:' + m[1]; kind = 'ten'
        else:
            m = C.match(t)
            if m: cur = 'chuong:%02d' % int(m[1]); kind = 'ten'
            else:
                k = 'cgpn' if S.match(t) else 'cgbs' if B.match(t) else 'cg' if G.match(t) else None
                if k:
                    if (cur, k) in K: sys.exit(f'khối lặp {cur} {k}')
                    kind = k; K[(cur, kind)] = []; continue
        if kind != 'ten': K[(cur, kind)].append(l)
    return K

def doc_kho():
    K = collections.OrderedDict()
    for f in ('phan', 'chuong'):
        for l in open(f'{GOC}/data/luat-goc/{f}.jsonl', encoding='utf8'):
            n = json.loads(l); p = n['id'].split(':')
            if len(p) > 2 and p[2] in ('cg', 'cgpn', 'cgbs'): K.setdefault((p[0] + ':' + p[1], p[2]), []).append(n)
    return K

# ───────────────────────── 2. Mốc
RM = re.compile(r'\s*(?:(\d{1,2})\s?[.](?!\d)|(\d{1,2})\s?-(?=\s)|(\d{1,2})(?=\s\([A-Z]\)\s)|\(\s?([A-Za-z]{1,4}|\d{1,2})\s?\)|([a-z]{1,2})\)(?=\s))\s*')
def moc(t):
    o = []; i = 0
    while True:
        m = RM.match(t, i)
        if not m: return o
        so = m[1] or m[2] or m[3]
        if so and o: return o
        o.append(((so + '.') if so else '(' + (m[4] or m[5]) + ')', i, m.end())); i = m.end()

# Chỗ kho và TT31 in mốc khác nhau (đọc tay bản in TT31)
MOC_RIENG = {
    'chuong:48:cg:5:a:1': '1.', 'chuong:48:cg:5:a:2': '2.', 'chuong:48:cg:5:b:1': '1.', 'chuong:48:cg:5:b:2': '2.',
    'chuong:48:cg:5:ket:1:b:1': '1.', 'chuong:48:cg:5:ket:1:b:2': '2.',
    'chuong:85:cg:12:b:iv:1': '1.', 'chuong:85:cg:12:b:iv:2': '2.', 'chuong:85:cg:12:b:iv:3': '3.',
}
# Đoạn kết / đoạn rời không mốc: chữ mở đầu dòng trong TT31 (Việt, Anh)
KET = {
    'phan:XI:cgpn:1:g:ket': ('(Trong mọi trường hợp', '(In all cases'),
    'phan:XV:cg:2:ket': ('Từ Chương 73 đến', 'In Chapters 73 to 76'),
    'phan:XVII:cg:5:ket': ('Bộ phận và phụ kiện của', 'Parts and accessories of air-cushion'),
    'chuong:09:cg:1:ket': ('Việc pha thêm', 'The addition of other'),
    'chuong:11:cg:2:A:ket': ('Các sản phẩm không giống', 'Otherwise, they fall in heading 23.02'),
    'chuong:28:cg:6:ket': ('Theo mục đích của Chú giải này', 'The term “isotopes”'),
    'chuong:34:cg:5:ket': ('Nhóm này không áp dụng với', 'The heading does not apply to'),
    'chuong:38:cg:6:ket': ('Tuy nhiên, khái niệm “chất thải khác”', 'The expression “other wastes” does not'),
    'chuong:39:cgpn:1:ket': ('Các hỗn hợp polyme', 'Polymer blends are'),
    'chuong:48:cg:5:ket:1': ('(B) Đối với', '(B) For paper'),
    'chuong:48:cg:5:ket:2': ('Tuy nhiên, nhóm 48.02', 'Heading 48.02 does not, however'),
    'chuong:48:cg:9:ket': ('Các sản phẩm bằng giấy hoặc bìa', 'Products on a base of paper'),
    'chuong:49:cg:4:ket': ('Tuy nhiên, các loại tranh ảnh', 'However, printed pictures'),
    'chuong:54:cg:1:ket': ('Các thuật ngữ “tổng hợp”', 'The terms “synthetic” and “artificial”, used'),
    'chuong:55:cg:1:ket': ('Tô (tow) có chiều dài không quá', 'Tow of a length not exceeding'),
    'chuong:58:cg:5:ket': ('Vải dệt thoi khổ hẹp có tua viền', 'Narrow woven fabrics with woven fringes'),
    'chuong:59:cg:5:ket': ('Tuy nhiên, nhóm này không áp dụng', 'This heading does not, however, apply'),
    'chuong:63:cg:3:ket': ('Để được xếp vào nhóm này', 'In order to be classified in this heading'),
    'chuong:70:cg:4:ket': ('Len khoáng vật không có', 'Mineral wools which do not comply'),
    'chuong:71:cg:9:ket': ('Các sản phẩm này có thể được kết hợp', 'These articles may be combined'),
    'chuong:84:cg:6:C:ket': ('Những khối chức năng riêng biệt', 'Separately presented units'),
    'chuong:85:cg:4:ket': ('Tuy nhiên, nhóm này không bao gồm quạt', 'The heading does not, however, apply to fans'),
    'chuong:85:cg:12:ket': ('Để phân loại những mặt hàng', 'For the classification of the articles defined'),
    'chuong:95:cg:6:ket': ('Nhóm này không bao gồm thiết bị', 'This heading does not include equipment more'),
    'chuong:95:cgpn:1:ket': ('Phân nhóm này không bao gồm', 'This subheading does not cover'),
}
# Nội dung kho chỉ có bảng, mà bảng in dạng ẢNH trong Công báo (không có lớp chữ): (số Công báo, trang)
BANG_ANH = {'chuong:11:cg:2:ket': ('525 + 526', 15), 'chuong:75:cgpn:1:a:ket': ('545 + 546', 35)}
# Nút có thêm bảng ảnh ở cuối hoặc giữa
KEM_BANG_ANH = {'chuong:48:cgpn:1', 'chuong:48:cgpn:2:b', 'chuong:74:cg:1:a', 'chuong:76:cgpn:1:a', 'chuong:78:cgpn:1', 'chuong:80:cgpn:1:a'} | set(BANG_ANH)
# Mốc TT31 có mà kho không có: chữ nằm trong nút nào của kho
MOC_THIEU_O_KHO = [
    ('chuong:48:cg:5:A', 'chuong:48:cg:5', '(A) Đối với', '(A) For paper'),
    ('chuong:48:cg:5:B', 'chuong:48:cg:5:ket:1', '(B) Đối với', '(B) For paper'),
]

def moc_kho(n):
    p = n['id'].split(':')
    if n['id'] in KET or n['id'] in BANG_ANH: return None
    if n['id'] in MOC_RIENG: return MOC_RIENG[n['id']]
    return p[3] + '.' if len(p) == 4 else '(' + p[-1] + ')'

def canh(E, O):
    """so dãy mốc kho E với dãy mốc đầu dòng TT31 O=[(mốc, độ tin)] (LCS có trọng số)"""
    n, m = len(E), len(O); S = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            b = max(S[i + 1][j], S[i][j + 1])
            if E[i] == O[j][0]: b = max(b, S[i + 1][j + 1] + O[j][1])
            S[i][j] = b
    i = j = 0; r = {}
    while i < n and j < m:
        if E[i] == O[j][0] and S[i][j] == S[i + 1][j + 1] + O[j][1]: r[i] = j; i += 1; j += 1
        elif S[i][j] == S[i + 1][j]: i += 1
        else: j += 1
    return r

def quet(L):
    O = []
    for q, l in enumerate(L):
        tr = L[q - 1]['chu'].strip() if q else '.'
        tin = 10 if re.search(r'([.:;]|\b(or|and|hoặc|và))["”’)]*$', tr) else 6     # câu trước đã hết thì mốc đáng tin hơn
        for t, a, b in moc(l['chu']): O.append((t, tin, q, a))
    return O

def noi(L):
    s = ''
    for t in L:
        t = t.strip()
        if not t: continue
        s = t if not s else s + t if re.search(r'\w-$', s) and not re.match(r'(hoặc|và|or|and)\b', t) else s + ' ' + t
    return s

def cat(K, B, cot, bao):
    """→ {id: (chữ, [(so, trang, tcb)])}"""
    ra = {}
    for k, N in K.items():
        L = B.get(k)
        if L is None: bao.append(('KHONG_CO_KHOI', cot, k)); continue
        NN = [n for n in N if moc_kho(n)]; E = [moc_kho(n) for n in NN]; O = quet(L); r = canh(E, [(o[0], o[1]) for o in O])
        vt = []                                                          # (dòng, cột chữ, id)
        for i, n in enumerate(NN):
            if i in r: o = O[r[i]]; vt.append((o[2], o[3], n['id']))
            else: bao.append(('KHO_THUA', cot, n['id']))
        dung = set(r.values())
        for j, o in enumerate(O):
            if j not in dung: bao.append(('TT31_THUA', cot, k, o[0], L[o[2]]['so'], L[o[2]]['trang'], L[o[2] - 1]['chu'][-40:] if o[2] else '', L[o[2]]['chu'][:60]))
        co = {v[2]: v for v in vt}
        for q, n in enumerate(N):
            if n['id'] not in KET: continue
            tr = [co[x['id']][0] for x in N[:q] if x['id'] in co]; sau = [co[x['id']][0] for x in N[q + 1:] if x['id'] in co]
            lo, hi = max(tr), min(sau) if sau else len(L)
            hit = [z for z in range(lo + 1, hi) if L[z]['chu'].startswith(KET[n['id']][cot == 'en'])]
            if len(hit) != 1: bao.append(('KET_KHONG_THAY', cot, n['id'], len(hit))); continue
            vt.append((hit[0], 0, n['id'])); co[n['id']] = vt[-1]
        vt.sort(key=lambda v: (v[0], v[1]))
        if [v[2] for v in vt] != [n['id'] for n in N if n['id'] in co]: bao.append(('SAI_THU_TU', cot, k))
        if vt and (vt[0][0], vt[0][1]) != (0, 0): bao.append(('CHU_TRUOC_KHOAN_DAU', cot, k, [l['chu'] for l in L[:vt[0][0]]]))
        for z, (q, a, i) in enumerate(vt):
            q2, a2 = (vt[z + 1][0], vt[z + 1][1]) if z + 1 < len(vt) else (len(L), 0)
            if q2 == q: chu = [L[q]['chu'][a:a2]]; ds = [L[q]]
            else:
                chu = [L[q]['chu'][a:]] + [l['chu'] for l in L[q + 1:q2]] + ([L[q2]['chu'][:a2]] if a2 and q2 < len(L) else []); ds = L[q:q2]
            ra[i] = (noi(chu), [(l['so'], l['trang'], l['tcb']) for l in ds])
        if cot == 'vi' or cot == 'en':                                   # bảo toàn chữ của khối
            a = re.sub(r'\s', '', ''.join(l['chu'] for l in L)); b = re.sub(r'\s', '', ''.join(ra[v[2]][0] for v in vt))
            if a != b: bao.append(('MAT_CHU', cot, k, len(a), len(b)))
    return ra

# ───────────────────────── 3. So chữ
DAU = 'àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ'
def chuan(s):
    s = unicodedata.normalize('NFKC', s).lower().replace('µ', 'μ')
    s = re.sub(r'(?<=\d),(?=\d)', '.', s)                                # 0,5 = 0.5
    s = re.sub(r'(?<=\d)\s*\.\s*(?=\d)', '.', s)
    s = re.sub(r'(?<=\d)\s+o\s*c\b|(?<=\d)o\s?c\b|(?<=\d)\s*°\s*c\b', '°c', s)
    return NFC(s)
THANH = '̣̀́̃̉'
def bo_vi_tri_dau(w):
    """hoá/hóa, thuỷ/thủy, uỷ/ủy: chuyển dấu thanh về cuối từ (chỉ để so); i/y cuối âm tiết: kĩ/kỹ"""
    d = unicodedata.normalize('NFD', w); th = ''.join(c for c in d if c in THANH)
    return NFC(''.join(c for c in d if c not in THANH)) + th
TU = re.compile(r'\d+(?:\.\d+)*|[^\W\d_]+|%|°c', re.U)
tu = lambda s: [m[0] for m in TU.finditer(chuan(s))]
khit = lambda s: ''.join(tu(s))

LOP = {
    'PHU_DINH': {'không', 'chưa', 'trừ', 'ngoài', 'loại trừ', 'chẳng', 'cấm'},
    'NGUONG': {'trên', 'dưới', 'tối', 'ít', 'nhiều', 'hơn', 'quá', 'vượt', 'lớn', 'nhỏ', 'thấp', 'cao', 'nhất', 'lên', 'xuống', 'bằng', 'đến', 'từ'},
    'PHAM_VI': {'chỉ', 'mọi', 'tất', 'bất', 'kể', 'gồm', 'riêng', 'toàn', 'chủ', 'cả', 'nếu', 'khi', 'điều', 'phải', 'được phép', 'mỗi', 'từng', 'đặc', 'duy'},
}
NOI = {'và': 'VA', 'hoặc': 'HOAC', 'hay': 'HOAC'}
def xet(a, b):
    """a, b: từ của kho và của TT31 trong một chỗ khác → các dấu nghi khác nghĩa"""
    o = []
    so = lambda x: collections.Counter(w for w in x if w[0].isdigit())
    if so(a) != so(b): o.append('SO')
    cs = lambda x: collections.Counter(w for w in x if re.fullmatch(r'[a-z]|[ivx]{1,4}', w))
    for ten, bo in LOP.items():
        c = lambda x: collections.Counter(w for w in x if w in bo)
        if c(a) != c(b): o.append(ten)
    c = lambda x: collections.Counter(NOI[w] for w in x if w in NOI)
    if c(a) != c(b): o.append('VA_HOAC')
    if abs(len(a) - len(b)) >= 3: o.append('THUA_THIEU')
    return o

def so_chu(kho, tt):
    if khit(kho) == khit(tt): return 'GIONG', []
    A, B = tu(kho), tu(tt); A2, B2 = [bo_vi_tri_dau(w) for w in A], [bo_vi_tri_dau(w) for w in B]
    if ''.join(A2) == ''.join(B2): return 'KHAC_CHU', [dict(loai='VI_TRI_DAU_THANH')]
    khac = []
    ops = [list(o) for o in difflib.SequenceMatcher(None, A2, B2, autojunk=False).get_opcodes()]
    # gộp chỗ khác cách nhau ≤1 từ
    g = []
    for t, i1, i2, j1, j2 in ops:
        if t == 'equal': continue
        if g and i1 - g[-1][1] <= 1 and j1 - g[-1][3] <= 1: g[-1][1], g[-1][3] = i2, j2
        else: g.append([i1, i2, j1, j2])
    for i1, i2, j1, j2 in g:
        if ''.join(A2[i1:i2]) == ''.join(B2[j1:j2]): continue
        a, b = A[i1:i2], B[j1:j2]
        khac.append(dict(kho=' '.join(a), tt31=' '.join(b), truoc=' '.join(A[max(0, i1 - 4):i1]), sau=' '.join(A[i2:i2 + 3]), nghi=xet(a, b)))
    if not khac: return 'KHAC_CHU', [dict(loai='VI_TRI_DAU_THANH')]
    return ('KHAC_NGHIA_NGHI' if any(k['nghi'] for k in khac) else 'KHAC_CHU'), khac

def main():
    if any('"soCongBao"' in l for f in ('phan', 'chuong') for l in open(f'{GOC}/data/luat-goc/{f}.jsonl', encoding='utf8')):
        raise SystemExit('Kho đã đặt theo TT31 (tt31-ap.py). So lại sẽ ra toàn GIONG và mất trường kho. Muốn dựng lại: lấy phan.jsonl, chuong.jsonl ở b0c7fe98.')
    ap = argparse.ArgumentParser(); ap.add_argument('--txt', default='~/luat-goc-txt-m10'); ap.add_argument('--ra', default=f'{GOC}/data/luat-goc/doi-chieu-tt31'); ap.add_argument('--bao', action='store_true')
    a = ap.parse_args(); tep = os.path.join(os.path.expanduser(a.txt), 'dong.jsonl')
    K = doc_kho(); V, N = doc_khoi(tep, 'vi'), doc_khoi(tep, 'en'); bao = []
    if set(V) != set(K) or set(N) != set(K): bao.append(('KHOI_LECH', sorted(set(V) ^ set(K)), sorted(set(N) ^ set(K))))
    vi, en = cat(K, V, 'vi', bao), cat(K, N, 'en', bao)
    nx_tep = f'{GOC}/scripts/luat-goc/tt31-nhan-xet.json'
    nx = json.load(open(nx_tep, encoding='utf8')) if os.path.exists(nx_tep) else {}
    dem = collections.Counter(); os.makedirs(a.ra, exist_ok=True); dung_nx = set(); het = []
    for f in ('phan', 'chuong'):
        out = []
        for k, NN in K.items():
            if not k[0].startswith(f + ':'): continue
            for n in NN:
                i = n['id']; v, e = vi.get(i), en.get(i)
                o = dict(id=i, vi=v[0] if v else None, en=e[0] if e else None, trangCongBao=None, soCongBao=None)
                if v or e:
                    x = (v or e)[1] + (e[1] if v and e else [])
                    o['trangCongBao'] = x[0][2]; o['soCongBao'] = x[0][0].replace('-', ' + ')
                    cuoi = max((t for s, _, t in x if s == x[0][0]))
                    if cuoi != x[0][2]: o['trangCongBaoDen'] = cuoi
                    if any(s != x[0][0] for s, _, _ in x): o['soCongBaoDen'] = max(s for s, _, _ in x).replace('-', ' + ')
                if i in BANG_ANH:
                    o['soCongBao'], o['trangCongBao'] = BANG_ANH[i]
                    o['kq'], o['khac'] = 'THIEU_O_TT31', [dict(loai='BANG_LA_ANH')]
                elif not v: o['kq'], o['khac'] = 'THIEU_O_TT31', []
                else: o['kq'], o['khac'] = so_chu(n['nguyenVan'], v[0])
                if i in KEM_BANG_ANH: o['bangAnh'] = True
                if i in nx:
                    dung_nx.add(i); m = nx[i]
                    if m.get('kq') and m['kq'] != o['kq']: o['kqMay'], o['kq'] = o['kq'], m['kq']       # đọc tay nâng
                    for z in ('ketLuan', 'banKhopAnh', 'nhanXet'):
                        if m.get(z): o[z] = m[z]
                elif o['kq'] == 'KHAC_NGHIA_NGHI': bao.append(('CHUA_DOC_TAY', i))
                dem[f, o['kq']] += 1; out.append(o); het.append(o)
                for mi, nut, pv, pe in MOC_THIEU_O_KHO:
                    if nut != i: continue
                    dv = next(l for l in V[k] if l['chu'].startswith(pv)); de = next(l for l in N[k] if l['chu'].startswith(pe))
                    m = nx.get(mi, {}); dung_nx.add(mi)
                    out.append(dict(id=mi, vi=dv['chu'], en=de['chu'], trangCongBao=dv['tcb'], soCongBao=dv['so'].replace('-', ' + '), kq='THIEU_O_KHO',
                                    khac=[dict(loai='MOC_KHONG_CO_O_KHO', nutKhoChuaChu=nut)], **{z: m[z] for z in ('ketLuan', 'banKhopAnh', 'nhanXet') if m.get(z)}))
                    dem[f, 'THIEU_O_KHO'] += 1; het.append(out[-1])
        with open(f'{a.ra}/{f}.jsonl', 'w', encoding='utf8') as h:
            for o in out: h.write(json.dumps(o, ensure_ascii=False) + '\n')
    if set(nx) - dung_nx: bao.append(('NHAN_XET_THUA', sorted(set(nx) - dung_nx)))
    for f in ('phan', 'chuong'): print(f, {k[1]: v for k, v in sorted(dem.items()) if k[0] == f})
    loi = [b for b in bao if b[0] not in ('TT31_THUA',)]
    for b in loi: print('LOI', b)
    if a.bao:
        for b in bao:
            if b[0] == 'TT31_THUA': print(b)
    sys.exit(1 if loi else 0)

if __name__ == '__main__': main()
