#!/usr/bin/env python3
"""loc-goi.py <goi.txt> : bỏ PN6 có cờ tiền lệ (DỪNG) khỏi gói, sửa lại dòng đầu"""
import re,sys
f=sys.argv[1]; s=open(f).read()
hdr,body=s.split('\n\n',1)
secs=re.split(r'(?==== GÓI PN6 )',body); keep=[x for x in secs if x.strip() and 'CẦN BẢNG HIỆU CHỈNH TIỀN LỆ' not in x]
drop=[re.search(r'PN6 (\d{6})',x).group(1) for x in secs if 'CẦN BẢNG HIỆU CHỈNH TIỀN LỆ' in x]
ids=[re.search(r'PN6 (\d{6})',x).group(1) for x in keep]
hdr=re.sub(r'cho \d+ phân nhóm 6 số \([^)]*\)',f'cho {len(ids)} phân nhóm 6 số ({" ".join(ids)})',hdr)
open(f,'w').write(hdr+'\n\n'+''.join(keep)); print(f,len(ids),'bỏ',drop)
