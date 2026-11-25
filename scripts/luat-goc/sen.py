#!/usr/bin/env python3
"""M-16 — rút Chú giải bổ sung SEN của AHTN 2022 từ bản Word gốc thành nút luật. Tất định, không mạng, không AI.

Bản gốc: phụ lục kèm CV 3866/TCHQ-TXNK (24/07/2023), tệp Word 55.807.488 byte
(sha256 ccc50ef8b84d31cfd74b7f586d126b0d8a2817c5495fdfff47ec882ea47207e7). KHÔNG commit.
    soffice --headless --convert-to docx:"MS Word 2007 XML" <tệp .doc>
    python3 scripts/luat-goc/sen.py <tệp .docx>            ghi data/luat-goc/sen.jsonl

Bảng hai cột: trái tiếng Việt, phải tiếng Anh. Hàng có ô giữa trống → lấy nửa trái. Hàng không chia đôi
(hình kèm lời song ngữ, bảng số liệu song ngữ, đoạn ngoài bảng) → chép cả hàng như in.
Mục không in mã: `sen:chuong:NN:n`, `sen:phan:<LA MÃ>:n`; lời nói đầu: `sen:md:n` (6 điểm đánh số).
Mỗi mã in ra một nút, cùng `apChung` khi một mục áp nhiều mã (như kho phân nhóm).
"""
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

GOC = Path(__file__).resolve().parents[2]
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
HINH = ''
VAN_BAN = 'Chú giải bổ sung (SEN) của AHTN 2022 (phụ lục kèm CV 3866/TCHQ-TXNK ngày 24/07/2023), phần tiếng Việt'
BAN_HANH = '2023-07-24'  # ngày ban hành in trên phụ lục; bản in không có ngày hiệu lực riêng
MA = r'(?:\d{4}\.\d{2}\.\d{2}|\d{6}\.\d{2}|\d{4}\.\d{2}|\d{2}\.\d{2})'
DONG_MA = re.compile(rf'(?:{MA}[\s;,–-]*)+$')
KHOANG = re.compile(rf'(\d{{2}}\.\d{{2}})\s*[-–]\s*(\d{{2}}\.\d{{2}})$')
DAU_MUC = re.compile(r'(CHƯƠNG \d+|PHẦN [IVX]+)\b')
DIEM_MD = re.compile(r'(\d)\. ')
CHUA_CO = re.compile(r'Hiện chưa có Chú giải bổ sung cho Chương này|Chương này được dành để sử dụng trong Hệ thống hài hòa sau này', re.I)
VIET = re.compile('[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]|[^\\W\\d_][àáâãèéêìíòóôõùúý]', re.I)

# Lời hình đôi nằm ở hàng riêng, trên hàng hình (nhóm 4804): ô phải cũng là tiếng Việt.
HANG_LOI_HINH_DOI = ('Túi giấy được làm bằng giấy kraft không tráng định lượng thấp',)

# Sự thật về bản in, không sửa chữ.
GHI_CHU_MUC = {
    '4001.22.10 4001.22.20 4001.22.30 4001.22.40 4001.22.50 4001.22.60':
        'bảng TSNR in "SSIR 10", "00.16", "11.00", "00.60", "00.80" – nghi lỗi in, giữ theo bản in',
    '9404.29.20': 'chữ "MÁT" cuối tên mục bị in sang đầu cột tiếng Anh ("MÁT MATTRESSES…"); cột tiếng Việt chỉ có "…LÀM NÓNG/LÀM"',
    '9601.90.12': 'bản in không có mã ở cột tiếng Anh',
    '2710.12.31 271012.39': 'bản in ghi "271012.39" (thiếu dấu chấm)',
}

CHI_CO_HINH = 'bản gốc chỉ có tên mục và hình, không có đoạn giải thích'
THIEU_MUC = {
    '3924.90.20': CHI_CO_HINH + '; lời in trong hình (đọc mắt): "Núm vú"; "Khung ngực (không phải là miếng che ngực, cũng không phải bộ phận của máy hút sữa)"',
    '70.03 70.04 70.05': CHI_CO_HINH + '; lời trong hình chỉ có tiếng Anh (các dạng cắt góc)',
    '8414.80.42': CHI_CO_HINH + '; lời trong hình chỉ có tiếng Anh',
    '8708.92.52 8708.92.62': CHI_CO_HINH + '; lời trong hình chỉ có tiếng Anh',
}


def chu(p):
    ra = []
    for e in p.iter():
        if e.tag == W + 't':
            ra.append(e.text or '')
        elif e.tag == W + 'tab':
            if e.get(W + 'val') is None:  # dấu tab trong chữ, không phải khai báo vị trí tab
                ra.append('\t')
        elif e.tag == W + 'br':
            ra.append('\n')
        elif e.tag == W + 'noBreakHyphen':
            ra.append('-')
        elif e.tag == W + 'drawing':
            ra.append(HINH)
    return unicodedata.normalize('NFC', ''.join(ra))


def khoi(o):
    """Các đoạn của một ô; bảng lồng: mỗi hàng một dòng, các ô cách nhau bằng tab."""
    ra = []
    for e in o:
        if e.tag == W + 'p':
            ra.append(chu(e))
        elif e.tag == W + 'tbl':
            for r in e.findall(W + 'tr'):
                ra.append('\t'.join(' '.join(x for x in khoi(c) if x.strip()) for c in r.findall(W + 'tc')).rstrip('\t'))
    return ra


def gon(doan):
    ra = []
    for x in doan:
        for d in x.split('\n'):
            d = re.sub(r'[  ]+', ' ', d)
            d = re.sub(r' *\t *', '\t', d).strip(' ').rstrip()
            if d:
                ra.append(d)
    return ra


def doc_hang(tep):
    """Hàng theo thứ tự bản gốc: {dong: [dòng chữ], hinh: số hình, trai: chữ ô đầu nguyên dạng}."""
    than = ET.fromstring(zipfile.ZipFile(tep).read('word/document.xml')).find(W + 'body')
    hang, so_bang = [], 0
    for e in than:
        if e.tag == W + 'p':
            hang.append((so_bang, [khoi([e])]))
        elif e.tag == W + 'tbl':
            so_bang += 1
            hang += [(so_bang, [khoi(c) for c in r.findall(W + 'tc')]) for r in e.findall(W + 'tr')]
    # Bảng song ngữ (tr.205–209): hàng lẻ ô mà ô giữa có chữ → cả bảng không chia đôi.
    song_ngu = {b for b, cs in hang if len(cs) > 1 and len(cs) % 2 and gon([x.replace(HINH, '') for x in cs[len(cs) // 2]])}
    for b, cs in hang:
        n = len(cs)
        hinh = sum(x.count(HINH) for c in cs for x in c)
        sach = [gon([x.replace(HINH, '') for x in c]) for c in cs]
        chia = n > 1 and n % 2 == 1 and not sach[n // 2] and b not in song_ngu
        if chia:
            m = n // 2
            if hinh or re.match(r'Picture', ' '.join(sach[0])) or (sach[0] and sach[0][0] in HANG_LOI_HINH_DOI):
                # hàng hình đôi: lời hình tiếng Việt nằm cả ở ô phải
                dong = [x for c in sach[:m] for x in c] + [x for c in sach[m + 1:] for x in c if VIET.search(x)]
            elif m == 1:
                dong = sach[0]
            else:  # bảng số liệu: một hàng một dòng
                dong = ['\t'.join(' '.join(c) for c in sach[:m]).rstrip('\t')]
        elif n > 1:
            dong = ['\t'.join(' '.join(c) for c in sach).rstrip('\t')]
        else:
            dong = sach[0]
        yield {'bang': b, 'dong': [x for x in dong if x.strip()], 'hinh': hinh, 'trai': sach[0], 'n': n}


def doc_muc(tep):
    """Mục theo thứ tự in: {so, ma, dong, hinh, dau} — dau: CHƯƠNG / PHẦN đang đứng."""
    muc, cur, dau, loi_dau = [], None, None, False
    chua_co = []
    for h in doc_hang(tep):
        t = ' '.join(h['trai'])
        m = DAU_MUC.match(t)
        if m and h['n'] in (1, 3):
            dau = m.group(1)
            cur = {'so': dau, 'ma': None, 'dong': h['trai'][1:], 'hinh': 0, 'dau': dau}
            muc.append(cur)
            continue
        if dau is None:
            # Lời nói đầu: lấy các điểm đánh số. Bỏ câu miễn trừ trách nhiệm (hành chính) và bảng viết tắt.
            loi_dau = (loi_dau or t == 'LỜI NÓI ĐẦU') and t != 'VIẾT TẮT VÀ KÝ HIỆU'
            d = DIEM_MD.match(t)
            if loi_dau and d:
                muc.append({'so': d.group(1), 'ma': None, 'dong': h['dong'], 'hinh': 0, 'dau': 'md'})
            continue
        if DONG_MA.match(t) and h['n'] == 3:
            cur = {'so': t, 'ma': tach_ma(t), 'dong': [], 'hinh': 0, 'dau': dau}
            muc.append(cur)
            continue
        if any(CHUA_CO.search(x) for x in h['dong']):
            chua_co.append((dau, h['dong'][0]))
            continue
        if cur['ma'] is None and cur['dong'] and h['dong'] and h['dong'][0].isupper():
            cur = {'so': dau, 'ma': None, 'dong': [], 'hinh': 0, 'dau': dau}  # mục không mã thứ hai (Ch. 87: khối lượng toàn bộ)
            muc.append(cur)
        cur['dong'] += h['dong']
        cur['hinh'] += h['hinh']
    return [m for m in muc if m['ma'] or m['dong']], chua_co


def bieu():
    t = json.loads((GOC / 'data/tax.json').read_text())
    ma8 = {re.sub(r'\D', '', v['hs']) for v in t.values()}
    return ma8, ma8 | {c[:6] for c in ma8} | {c[:7] for c in ma8} | {c[:4] for c in ma8}


def tach_ma(t):
    k = KHOANG.match(t)
    if k:
        a, b = (int(x.replace('.', '')) for x in k.groups())
        return [c for c in sorted({c[:4] for c in bieu()[0]}) if a <= int(c) <= b]
    return list(dict.fromkeys(re.sub(r'\D', '', x) for x in re.findall(MA, t)))


def trang_theo_kho_cu(muc):
    """Trang của PDF 386 trang (CEO): data/sen-2022.json ghi trang của dòng mã. Mục kho cũ bỏ sót: chỉ ghi khi mục liền trước và liền sau cùng trang."""
    cu = {}
    for x in json.loads((GOC / 'data/sen-2022.json').read_text())['muc']:
        cu.setdefault((tuple(x['ma'])), []).append(x['trang'])
    for m in muc:
        ds = cu.get(tuple(m['ma'] or ()))
        m['trang'] = ds.pop(0) if ds else None
    for i, m in enumerate(muc):
        if m['trang'] is None and 0 < i < len(muc) - 1:
            a, b = muc[i - 1]['trang'], muc[i + 1]['trang']
            if a == b:
                m['trang'] = a


def tao_nut(muc, biet):
    dem, nut = {}, []
    for m in muc:
        if not m['ma']:
            loai, _, so_ = m['dau'].partition(' ')
            goc = {'md': 'sen:md', 'CHƯƠNG': f'sen:chuong:{so_.zfill(2)}', 'PHẦN': f'sen:phan:{so_}'}[loai]
            dem[goc] = dem.get(goc, 0) + 1
            khoa = [(f'{goc}:{dem[goc]}', None)]
        else:
            khoa = []
            for ma in m['ma']:
                dem[ma] = dem.get(ma, 0) + 1
                khoa.append((f'sen:{ma}:{dem[ma]}', ma))
        for id_, ma in khoa:
            # mục cấp chương: bản in không có số hiệu, dòng "CHƯƠNG NN" là tiêu đề chung nên không ghép vào nguyên văn
            x = {'id': id_, 'loai': 'SEN', 'cha': None, 'so': m['so'] if ma or m['dau'] == 'md' else None,
                 'nguyenVan': '\n'.join(([m['so']] if ma else []) + m['dong']),
                 'lop': 'HUONG_DAN', 'nguon': {'vanBan': VAN_BAN, 'ban': 'AHTN2022', 'trang': m['trang']},
                 'hieuLuc': {'tu': BAN_HANH, 'den': None}}
            if m['ma'] and len(m['ma']) > 1:
                x['apChung'] = m['ma']
            gc = [] if ma or m['dau'] == 'md' else ['SEN đặt ở đầu Chương / Phần, bản in không có mã']
            gc += [GHI_CHU_MUC[m['so']]] if m['so'] in GHI_CHU_MUC else []
            if ma and ma not in biet:
                gc.append(f'mã in {ma} không có trong biểu hiện hành (data/tax.json); giữ theo bản in')
            if gc:
                x['ghiChu'] = '; '.join(gc)
            if m['hinh']:
                x['thieu'] = f'{m["hinh"]} hình trong bản gốc (không rút chữ trong hình)' + (f'; {THIEU_MUC[m["so"]]}' if m['so'] in THIEU_MUC else '')
            nut.append(x)
    return nut


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    muc, chua_co = doc_muc(sys.argv[1])
    trang_theo_kho_cu(muc)
    _, biet = bieu()
    nut = tao_nut(muc, biet)
    (GOC / 'data/luat-goc/sen.jsonl').write_text(''.join(json.dumps(x, ensure_ascii=False, separators=(',', ':')) + '\n' for x in nut))
    co_ma = [m for m in muc if m['ma']]
    print(f'mục có mã: {len(co_ma)}; mục không mã: {[m["so"] for m in muc if not m["ma"]]}; nút: {len(nut)}; mã khác nhau: {len({c for m in co_ma for c in m["ma"]})}')
    print('chương ghi "chưa có chú giải bổ sung":', len(chua_co), [a for a, _ in chua_co])
    print('thiếu trang:', [m['so'] for m in muc if m['trang'] is None])
    print('mã in không có trong biểu:', sorted({c for m in co_ma for c in m['ma'] if c not in biet}))


if __name__ == '__main__':
    main()
