# ghep.py <phan1_bi_cat> <phan2> <out>: cứu các bản ghi dieuKien trọn vẹn của phần 1 + ghép phần 2
import json,sys
def cuu(s):
    i=s.find('"dieuKien"'); i=s.find('[',i)+1; dec=json.JSONDecoder(); out=[]
    while True:
        while i<len(s) and s[i] in ' \n\r\t,': i+=1
        if i>=len(s) or s[i]!='{': break
        try: o,j=dec.raw_decode(s,i)
        except Exception: break
        out.append(o); i=j
    return out
s1=open(sys.argv[1],encoding='utf-8').read()
a=cuu(s1)
s2=open(sys.argv[2],encoding='utf-8').read(); b=json.loads(s2[s2.find('{'):s2.rfind('}')+1])
seen={(d.get('nut'),d.get('ve'),d.get('phu'),d.get('trich')) for d in a}
dk=a+[d for d in b.get('dieuKien',[]) if (d.get('nut'),d.get('ve'),d.get('phu'),d.get('trich')) not in seen]
json.dump({'dieuKien':dk,'giaiChong':b.get('giaiChong',[]),'canhTranh':b.get('canhTranh',[])},open(sys.argv[3],'w',encoding='utf-8'),ensure_ascii=False)
print('phan1',len(a),'phan2',len(b.get('dieuKien',[])),'tong',len(dk),'gc',len(b.get('giaiChong',[])),'ct',len(b.get('canhTranh',[])))
