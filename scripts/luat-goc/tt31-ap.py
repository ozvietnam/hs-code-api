#!/usr/bin/env python3
"""scripts/luat-goc/tt31-ap.py — đặt chữ LUẬT của phan.jsonl / chuong.jsonl theo Thông tư 31/2022 (văn bản có hiệu lực), từ data/luat-goc/doi-chieu-tt31 (M-10).
Chỉ đổi nút khác TỪ (không đổi nút chỉ khác dấu câu / vị trí dấu thanh). Nút có bảng in ảnh giữ bản cũ. Xuống dòng giữ theo chỗ xuống dòng của bản cũ (so từng từ).
Chạy lại cùng kết quả. python3 scripts/luat-goc/tt31-ap.py [--kiem]"""
import json,re,sys,unicodedata,difflib,os
G=os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../data/luat-goc/')
VB="Thông tư số 31/2022/TT-BTC ngày 08/06/2022 của Bộ trưởng Bộ Tài chính (Phụ lục I, Công báo)"
THANH={'oá':'óa','oà':'òa','oả':'ỏa','oã':'õa','oạ':'ọa','oé':'óe','oè':'òe','oẻ':'ỏe','oẽ':'õe','oẹ':'ọe','uý':'úy','uỳ':'ùy','uỷ':'ủy','uỹ':'ũy','uỵ':'ụy'}
def tu(s):
    s=unicodedata.normalize('NFC',s).lower()
    for a,b in THANH.items(): s=s.replace(a,b)
    return re.findall(r'[\w]+(?:[.,]\d+)*',s.replace('²','2').replace('³','3'))
def sach(v):
    v=unicodedata.normalize('NFC',v); v=re.sub(r'\s+',' ',v).strip()
    v=re.sub(r'(?<=[ ,(\d])o C\b','°C',v); v=re.sub(r'(\d) °C',r'\1°C',v); v=re.sub(r'\b((?:[A-Z][a-z]?)+) (\d)(?=[\s),;.])',lambda m:m.group(1)+m.group(2) if re.search('O$|H$|N$|Cl$|F$',m.group(1)) and len(m.group(1))<=6 else m.group(0),v)
    v=re.sub(r'\b(B|Na|K|Fe|Al|SiO|CO) ([23]) ?(?=O|\b)',r'\1\2',v); v=re.sub(r'(?<=\bm) (?=[23]\b)','',v); v=re.sub(r'(?<=cm) (?=[23]\b)','',v)
    return re.sub(r'\s+([;,.:)])',r'\1',v).replace('( ','(')
def dong(cu,moi):
    """Chuyển chỗ xuống dòng của bản cũ sang bản mới theo từ khớp."""
    mc=[(m.group(0),m.start()) for m in re.finditer(r'\S+',cu)]; mm=[(m.group(0),m.start()) for m in re.finditer(r'\S+',moi)]
    g=lambda x:re.sub(r'\W','',unicodedata.normalize('NFC',x).lower())
    S=difflib.SequenceMatcher(None,[g(a) for a,_ in mc],[g(a) for a,_ in mm],autojunk=False); anh={}
    for a,b,n in S.get_matching_blocks():
        for k in range(n): anh[a+k]=b+k
    cat={}
    for i,(w,p) in enumerate(mc):
        if i and '\n' in cu[mc[i-1][1]+len(mc[i-1][0]):p] and i in anh: cat[anh[i]]=cu[mc[i-1][1]+len(mc[i-1][0]):p].count('\n')
    return ''.join((('\n'*cat[j]) if j in cat else (' ' if j else ''))+w for j,(w,_) in enumerate(mm))
# TT31 in lỗi chữ, hoặc chỉ khác dấu chú thích (1) cuối bảng: giữ bản in CGCT (cùng một câu luật)
GIU={'chuong:95:cg:1:e','chuong:95:cg:1:v','chuong:38:cg:2:A','chuong:38:cg:2:B','chuong:86:cg:2:a','chuong:86:cg:2:b','chuong:86:cg:2:c'}
tong={}
for k in ('phan','chuong'):
    D={r['id']:r for r in map(json.loads,open(G+f'doi-chieu-tt31/{k}.jsonl'))}; ra=[]; n=0
    for l in open(G+k+'.jsonl'):
        sep=(', ',': ') if '": "' in l[:40] else (',',':')
        x=json.loads(l); goc=l.rstrip('\n'); d=D.get(x['id'])
        if d and x['id'] not in GIU and d.get('vi') and not d.get('bangAnh') and not x['nguon'].get('soCongBao'):
            v=d['vi']
            if x['id']=='chuong:48:cg:5' and 'chuong:48:cg:5:A' in D and not re.match(r'.*\(A\)',v): v=v+'\n'+D['chuong:48:cg:5:A']['vi']
            v=sach(v)
            if tu(v)!=tu(x['nguyenVan']) or x['id']=='chuong:41:cg:1:c':
                d['kho']=x['nguyenVan']; d['trangKho']=x['nguon'].get('trang') # giu chu ban in CGCT de doi chieu
                x['nguyenVan']=re.sub(r' (\([A-Z]\))\n',r'\n\1 ',dong(x['nguyenVan'],v)); x['nguon']={'vanBan':VB,'ban':'HS2022','trang':d['trangCongBao'],'soCongBao':d['soCongBao']}
                x['hieuLuc']={'tu':'2022-12-30','den':None}
                if d.get('banKhopAnh') in ('KHO','KHONG_BAN_NAO'): x['ghiChu']='Bản tiếng Anh TT31: '+d['en']+(' — bản in CGCT dịch sát hơn (doi-chieu-tt31).' if d['banKhopAnh']=='KHO' else ' — cả hai bản Việt đều chưa sát.')
                n+=1
        ra.append(goc if x==json.loads(goc) else json.dumps(x,ensure_ascii=False,separators=sep))
    tong[k]=n
    if '--kiem' in sys.argv:
        if n: print('FAIL',k,n,'nút còn khác chữ TT31'); sys.exit(1)
    elif n:
        open(G+k+'.jsonl','w').write('\n'.join(ra)+'\n')
        open(G+f'doi-chieu-tt31/{k}.jsonl','w').write(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in D.values()))
print(tong)
