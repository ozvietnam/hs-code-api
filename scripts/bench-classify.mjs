import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
for(const line of fs.readFileSync('.env','utf8').split('\n')){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const { classify } = require('/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api/lib/classify.js');
const gold=fs.readFileSync('data/oz-gold-final.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const nz=s=>String(s).replace(/\D/g,'');
const N=30,step=Math.max(1,Math.floor(gold.length/N));const sample=[];for(let i=0;i<gold.length&&sample.length<N;i+=step)sample.push(gold[i]);
let t1_8=0,t3_8=0,t1_4=0,t3_4=0,miss=0,confSum=0,n=0,err=0;
for(const g of sample){
  const a8=nz(g.hsCode),a4=a8.slice(0,4);
  try{
    const r=await classify({tenHang:g.tenHang,chatLieu:g.chatLieu,congDung:g.congDung});
    n++;
    const hs=r.results.map(x=>nz(x.hs)); const hs4=hs.map(h=>h.slice(0,4));
    if(hs[0]===a8)t1_8++; if(hs.includes(a8))t3_8++;
    if(hs4[0]===a4)t1_4++; if(hs4.includes(a4))t3_4++;
    if(r.missing.length)miss++; if(r.results[0])confSum+=(r.results[0].confidence||0);
    if(n<=4)console.log(`[${g.hsCode}] ${g.tenHang.slice(0,28)} → ${hs.slice(0,3).join(',')||'-'} | top1_4=${hs4[0]===a4?'✓':'✗'} conf=${r.results[0]?.confidence} miss=${r.missing.length}`);
  }catch(e){err++; if(err<=2)console.log('ERR:',e.message.slice(0,100));}
}
const p=x=>Math.round(x/n*1000)/10;
console.log(`\n=== CLASSIFY Pha 2 — n=${n} (err ${err}) ===`);
console.log('              top-1    top-3');
console.log(`  8-số:       ${p(t1_8)}%    ${p(t3_8)}%`);
console.log(`  4-số(nhóm): ${p(t1_4)}%    ${p(t3_4)}%`);
console.log(`  avg confidence top1: ${(confSum/n).toFixed(0)}`);
console.log(`  có cờ thiếu-thông-tin: ${p(miss)}%`);
console.log(`\nDoD Pha2 (top-1 4-số ≥70%): ${p(t1_4)>=70?'✓ ĐẠT':'✗ '+p(t1_4)+'%'}`);
