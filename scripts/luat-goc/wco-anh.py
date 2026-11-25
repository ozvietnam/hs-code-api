#!/usr/bin/env python3
"""scripts/luat-goc/wco-anh.py — M-17: đọc lại ẢNH của bản scan WCO Compendium 2022 bằng một máy OCR khác (macOS Vision) rồi gióng với
data/wco-op/opinions.json. Sinh scripts/luat-goc/wco-anh.mjs: trang PDF, mã trên biển xanh, số in, năm in, tỉ lệ chữ khớp, chỗ số lệch.
KHÔNG tạo nguyên văn: nguyên văn vẫn là bản OCR trong kho; bảng này chỉ để ghi trang và đánh cờ. Không mạng, không LLM.

Chạy trên Mac (cần swiftc, poppler; PDF không nằm trong repo vì nặng và có bản quyền):
  python3 scripts/luat-goc/wco-anh.py --pdf "WCO Compendium 2022.pdf" --tam <thư mục tạm> --kho data/wco-op/opinions.json --ra scripts/luat-goc/wco-anh.mjs
Lần sau có sẵn thư mục tạm thì chỉ gióng lại (tất định)."""
import argparse, bisect, collections, difflib, hashlib, json, os, re, subprocess

SWIFT = r'''
import Vision
import AppKit
let paths = Array(CommandLine.arguments.dropFirst())
DispatchQueue.concurrentPerform(iterations: paths.count) { i in
  let p = paths[i]; let out = p + ".json"
  if FileManager.default.fileExists(atPath: out) { return }
  guard let img = NSImage(contentsOfFile: p), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate; req.usesLanguageCorrection = false; req.recognitionLanguages = ["en-US","fr-FR"]
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
  var arr: [[String: Any]] = []
  for o in (req.results ?? []) { guard let t = o.topCandidates(1).first else { continue }; let b = o.boundingBox
    arr.append(["t": t.string, "x": b.minX, "y": 1-b.maxY, "w": b.width, "h": b.height]) }
  try! JSONSerialization.data(withJSONObject: arr).write(to: URL(fileURLWithPath: out))
}
'''
TRANG = range(7, 476)          # phần ý kiến; từ trang 477 là Annex
# Biển xanh cả hai lần OCR cùng bỏ sót, đã đọc bằng mắt trên ảnh trang.
BIEN_DOC_MAT = [(62, 0.07, '2404.11')]

ap = argparse.ArgumentParser()
for k in ('pdf', 'tam', 'kho', 'ra'): ap.add_argument('--' + k, required=True)
a = ap.parse_args()
PG, RT = os.path.join(a.tam, 'pg'), os.path.join(a.tam, 'rt')
os.makedirs(PG, exist_ok=True); os.makedirs(RT, exist_ok=True)

def lam_anh():
    for p in TRANG:
        f = f'{PG}/p-{p:03d}.jpg'; g = f'{RT}/p-{p:03d}.jpg'
        if not os.path.exists(f): subprocess.run(['pdftoppm', '-r', '200', '-f', str(p), '-l', str(p), '-jpeg', '-jpegopt', 'quality=85', '-singlefile', a.pdf, f[:-4]], check=True)
        if not os.path.exists(g): subprocess.run(['magick', f, '-gravity', 'East', '-crop', '50.5%x100%+0+0', '+repage', '-quality', '90', g], check=True)
    thieu = [f'{d}/p-{p:03d}.jpg' for d in (PG, RT) for p in TRANG if not os.path.exists(f'{d}/p-{p:03d}.jpg.json')]
    if thieu:
        sw = os.path.join(a.tam, 'ocr.swift'); open(sw, 'w').write(SWIFT)
        subprocess.run(['swiftc', '-O', sw, '-o', os.path.join(a.tam, 'ocr')], check=True)
        for i in range(0, len(thieu), 120): subprocess.run([os.path.join(a.tam, 'ocr'), *thieu[i:i + 120]], check=True)

lam_anh()
raw = open(a.kho, 'rb').read()
O = sorted(json.loads(raw), key=lambda o: o['line'])
TU = re.compile(r'[^\W_]+(?:[.,][0-9]+)*')
tu = lambda s: [(m[0], m.start(), m.end()) for m in TU.finditer(s.lower())]

def dong(p, ca_trang):
    L = json.load(open(f"{PG if ca_trang else RT}/p-{p:03d}.jpg.json"))
    if ca_trang: L = [dict(x, x=(x['x'] - .495) / .505) for x in L if x['x'] >= .505]
    L = sorted((x for x in L if .04 < x['y'] < .955 and x['x'] > .02), key=lambda x: x['y'] + x['h'] / 2)
    R = []
    for x in L:
        c = x['y'] + x['h'] / 2
        if R and abs(R[-1][0] - c) < .0055: R[-1][1].append(x)
        else: R.append((c, [x]))
    out = []
    for c, i in R:
        i.sort(key=lambda x: x['x']); out.append((p, round(c, 3), round(i[0]['x'], 2), ' '.join(x['t'] for x in i)))
    return out

def la_bien(t, x):
    if x > .25 and re.fullmatch(r'27\.10 to (27\.13|2713\.20)', t): return True   # hai biển nhóm 4 số trang 69
    if t in {b[2] for b in BIEN_DOC_MAT}: return True
    if x > .25 and len(t) < 25 and re.match(r'^(Ch\. \d|Sect\. [XVI])', t): return True   # biển cả chương / cả phần
    return bool(re.match(r'^\W{0,3}\d{4}[.,]\s?\d{2}', t)) and len(t) < 70 and '/' not in t and x > .12 and not re.search(r'[a-z]{2,}', re.sub(r'(?i)\(?cont\w*\)?|suite|and|to|or', '', t))

D, B = [], []
for p in TRANG:
    A, F = dong(p, False), dong(p, True)
    bA = [r for r in A if la_bien(r[3], r[2])]
    b = bA + [r for r in F if la_bien(r[3], r[2]) and not any(abs(r[1] - q[1]) < .012 for q in bA)]
    b += [(p, y, .3, t) for (pp, y, t) in BIEN_DOC_MAT if pp == p]
    A = [r for r in A if not la_bien(r[3], r[2])]
    A += [r for r in F if not la_bien(r[3], r[2]) and len(r[3]) > 25 and not any(abs(r[1] - q[1]) < .007 for q in A + b)]
    for r in sorted(A + b, key=lambda r: r[1]):
        if la_bien(r[3], r[2]): B.append((p, r[1], r[3].replace(',39', '.39')))
        else: D.append((p, r[1], r[2], r[3], len(B) - 1))

rs, rl, ks, kv = [], [], [], []
for i, l in enumerate(D):
    for w, _, _ in tu(l[3]): rs.append(w); rl.append(i)
for i, o in enumerate(O):
    for w, s, e in tu(re.sub(r'[*_~|]', ' ', o['text'])): ks.append(w); kv.append((i, s, e))

def lis(pr):
    tails, idx, prev = [], [], [-1] * len(pr)
    for n, (_, b) in enumerate(pr):
        k = bisect.bisect_left(tails, b)
        if k == len(tails): tails.append(b); idx.append(n)
        else: tails[k] = b; idx[k] = n
        prev[n] = idx[k - 1] if k else -1
    r, n = [], idx[-1] if idx else -1
    while n >= 0: r.append(pr[n]); n = prev[n]
    return r[::-1]

mp = {}
def giong(a0, a1, b0, b1):
    """Gióng hai dòng chữ theo thứ tự sách (neo bằng cụm từ chỉ có một lần ở cả hai bên)."""
    if a1 <= a0 or b1 <= b0: return
    if (a1 - a0) * (b1 - b0) < 250000:
        for m in difflib.SequenceMatcher(None, ks[a0:a1], rs[b0:b1], autojunk=False).get_matching_blocks():
            for k in range(m.size): mp[a0 + m.a + k] = b0 + m.b + k
        return
    pr = []
    for N in (5, 4, 3, 2, 1):
        ca, cb = collections.defaultdict(list), collections.defaultdict(list)
        for i in range(a0, a1 - N + 1): ca[tuple(ks[i:i + N])].append(i)
        for i in range(b0, b1 - N + 1): cb[tuple(rs[i:i + N])].append(i)
        pr = lis(sorted((v[0], cb[k][0]) for k, v in ca.items() if len(v) == 1 and len(cb.get(k, ())) == 1))
        if pr: break
    if not pr: return
    pa, pb = a0, b0
    for x, y in pr:
        if x < pa or y < pb: continue
        giong(pa, x, pb, y)
        for k in range(N): mp[x + k] = y + k
        pa, pb = x + N, y + N
    giong(pa, a1, pb, b1)
giong(0, len(ks), 0, len(rs))

st = collections.defaultdict(list)
for i, (k, _, _) in enumerate(kv): st[k].append(i)
NHAM = str.maketrans({'l': '1', 'i': '1', 'o': '0', 's': '5', 'б': '6', 'а': 'a'})
def so_lech(i):
    """Chỗ hai bản OCR đọc khác nhau mà có chữ số. Bỏ qua khi bản ảnh chỉ đọc nhầm dạng của một số lành trong kho."""
    T = st[i]; M = [(t, mp[t]) for t in T if t in mp]; out = []
    for (x, b), (x2, b2) in zip(M, M[1:]):
        ka, rb = ks[x + 1:x2], (rs[b + 1:b2] if b2 - b < 400 else [])
        na, nb = [w for w in ka if re.search(r'\d', w)], [w for w in rb if re.search(r'\d', w)]
        j = lambda q: re.sub(r'\W', '', ''.join(q))
        if na == nb or j(ka) == j(rb): continue
        if len(ka) + len(rb) > 24: continue                       # một bên mất cả đoạn, không phải lệch số
        if ka and all(re.fullmatch(r'[\d.,]+', w) for w in ka) and j(ka) == j(rb).translate(NHAM): continue
        if ka and all(re.fullmatch(r'\d{4}\.\d{2}', w) for w in ka): continue   # kho đọc trọn mã, ảnh rơi chữ số (chữ nghiêng)
        s = kv[x + 1][1] if ka else kv[x][2]; e = kv[x2 - 1][2] if ka else s
        out.append([s, O[i]['text'][s:e], ' '.join(rb)])
    return out

bang = {}; moc = [None] * len(O)
for i in range(len(O)):
    M = [mp[t] for t in st[i] if t in mp]; moc[i] = (M[0], M[-1]) if M else None
for i, o in enumerate(O):
    if not moc[i]: bang[o['id']] = None; continue
    li, le = rl[moc[i][0]], rl[moc[i][1]]
    truoc = rl[moc[i - 1][1]] if i and moc[i - 1] else -1
    sau = rl[moc[i + 1][0]] if i + 1 < len(O) and moc[i + 1] else len(D)
    n = None
    for j in range(li, max(truoc - 1, li - 4, -1), -1):
        if j < li and 'doption' in D[j][3]: break
        m = re.match(r'^\D{0,2}?(\d{1,2})\s?[.,]?\s*(?=[^\d\s]|$)', D[j][3])
        if D[j][2] < .16 and m: n = int(m[1]); break
    nam = None
    for j in range(max(le - 1, li), min(le + 12, max(sau, le + 1))):
        m = re.search(r'doption\s*[:;.]?\s*(.*)', D[j][3])
        if m:
            ys = re.findall(r'(?:19|20)\d\d', re.sub(r'(?<=\d)[/lI\]|]|[/lI\]|](?=\d)', '1', m[1])); nam = ' + '.join(ys) or None; break
    M = sum(t in mp for t in st[i])
    bang[o['id']] = [D[li][0], D[le][0], B[D[li][4]][2], n, nam, round(M / len(st[i]), 2), so_lech(i)]

sha = lambda b: hashlib.sha256(b).hexdigest()
h = hashlib.sha256()
with open(a.pdf, 'rb') as f:
    for kh in iter(lambda: f.read(1 << 20), b''): h.update(kh)
with open(a.ra, 'w') as f:
    f.write('// SINH TỰ ĐỘNG bởi scripts/luat-goc/wco-anh.py (đọc lại ảnh scan bằng máy OCR thứ hai). Không sửa tay.\n')
    f.write('// id kho: [trang PDF, trang cuối, biển mã in, số thứ tự in, năm thông qua in, tỉ lệ từ của kho khớp ảnh, [[vị trí trong text kho, kho, ảnh]…]]\n')
    f.write(f"export const PDF_SHA256 = '{h.hexdigest()}';\nexport const KHO_SHA256 = '{sha(raw)}';\nexport const ANH = {{\n")
    for k in sorted(bang): f.write(f"  {json.dumps(k)}: {json.dumps(bang[k], ensure_ascii=False)},\n")
    f.write('};\n')
print(len(bang), 'ý kiến;', sum(v is None for v in bang.values()), 'không định vị;', len(B), 'biển;', sum('doption' in l[3] for l in D), 'dòng Adoption')
