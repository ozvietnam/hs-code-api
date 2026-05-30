import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
for(const line of fs.readFileSync('.env','utf8').split('\n')){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const { getCandidates } = require('/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api/lib/retrieve-candidates.js');
const gold=fs.readFileSync('data/oz-gold-final.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const nz=s=>String(s).replace(/\D/g,'');
const N=15,step=Math.max(1,Math.floor(gold.length/N));const sample=[];for(let i=0;i<gold.length&&sample.length<N;i+=step)sample.push(gold[i]);
let h5=0,h8=0,pc=0,n=0;
for(const g of sample){
  const a4=nz(g.hsCode).slice(0,4),a8=nz(g.hsCode);
  const c=await getCandidates({tenHang:g.tenHang,chatLieu:g.chatLieu,congDung:g.congDung});
  n++;
  const hs=c.headings.map(x=>x.code4);
  if(hs.slice(0,5).includes(a4))h5++;
  if(hs.slice(0,8).includes(a4))h8++;
  if(c.precedentCodes.some(p=>p.hs===a8))pc++;
  if(n<=3)console.log(`[${g.hsCode}] ${g.tenHang.slice(0,30)} → headings: ${hs.slice(0,6).join(',')} | actual4=${a4} ${hs.slice(0,8).includes(a4)?'✓':'✗'}`);
}
const p=x=>Math.round(x/n*1000)/10;
console.log(`\n=== Combined candidates (LLM+precedent) — n=${n} ===`);
console.log('recall@5 (4-số):',p(h5)+'%');
console.log('recall@8 (4-số):',p(h8)+'%');
console.log('precedent trúng mã 8-số:',p(pc)+'%');
