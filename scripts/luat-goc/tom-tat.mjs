#!/usr/bin/env node
// scripts/luat-goc/tom-tat.mjs — gói soạn và cổng kiểm TÓM TẮT NÚT (M-36). Tóm tắt chỉ để LLM định hướng giữa các nút cùng cấp (nhãn BO_TRO); căn cứ trích luôn là câu luật.
//   node scripts/luat-goc/tom-tat.mjs --goi=7616            in lời dặn + câu luật đánh số cho một nhóm
//   node scripts/luat-goc/tom-tat.mjs --nap=7616 <tra-loi>  kiểm câu trả lời, in JSONL các bản đạt (stdout), lỗi (stderr)
//   node scripts/luat-goc/tom-tat.mjs --kiem                kiểm mọi tệp data/luat-goc/tom-tat/*.jsonl
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tachKho } from './cau.mjs';

const GOC = process.env.LUAT_GOC_DIR || fileURLToPath(new URL('../../data/luat-goc/', import.meta.url));
const docKho = (k) => { const f = path.join(GOC, `${k}.jsonl`); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((x) => x.trim()) : []; };

/** Nạp mọi nút và câu của sáu kho cần cho tóm tắt. */
export function nap(kho = ['bieu', 'phan', 'chuong', 'nhom', 'phan-nhom', 'sen'], doc = docKho) {
  const nut = new Map(); const cau = new Map(); const cauCuaNut = new Map();
  for (const k of kho) {
    const d = doc(k);
    for (const l of d) { const x = JSON.parse(l); nut.set(x.id, x); }
    for (const c of tachKho(d)) {
      const n = c.id.slice(0, c.id.lastIndexOf('#')); const chu = nut.get(n).nguyenVan.slice(c.tu, c.den).trim(); if (!chu) continue;
      cau.set(c.id, { id: c.id, chu, dan: c.dan || null, nut: n }); if (!cauCuaNut.has(n)) cauCuaNut.set(n, []); cauCuaNut.get(n).push(c.id);
    }
  }
  const con = new Map(); for (const x of nut.values()) if (x.id.startsWith('bieu:') && x.cha) { if (!con.has(x.cha)) con.set(x.cha, []); con.get(x.cha).push(x.id); }
  // Phần của chương đọc từ chính cây, không viết tay bảng số
  return { nut, cau, cauCuaNut, con };
}

/** Gói của một nhóm: nút (nhóm và mọi nút dưới), nút cùng cấp, câu luật đánh số. */
export function goi(kho, h, phanCuaChuong, nhanh = null) { // nhanh: chỉ một nhánh con của nhóm (nhóm quá lớn thì chia)
  const goc = `bieu:${h}`; const ch = h.slice(0, 2); const phan = phanCuaChuong(ch);
  const nut = []; const di = (id) => { nut.push(id); for (const c of kho.con.get(id) || []) di(c); }; if (nhanh === 'GOC') nut.push(goc, ...(kho.con.get(goc) || [])); else di(nhanh || goc);
  const cungCap = new Set((kho.con.get(kho.nut.get(nhanh && nhanh !== 'GOC' ? nhanh : goc).cha) || []).filter((x) => x !== (nhanh && nhanh !== 'GOC' ? nhanh : goc)));
  const ma = nut.map((x) => x.slice(5)); const lay = [];
  const thuoc = (id) => (phan && new RegExp(`^phan:${phan}:(cg|cgpn)\\b`).test(id)) || new RegExp(`^chuong:${ch}:(cg|cgpn|pc)\\b`).test(id)
    || id.startsWith(`nhom:${h}:`) || (id.startsWith('pn:') && id.startsWith(`pn:${h}`)) || (id.startsWith('sen:') && ma.some((m) => id.startsWith(`sen:${m}:`)));
  for (const n of [...nut, ...[...cungCap]]) lay.push(...(kho.cauCuaNut.get(n) || []));
  for (const [id, ds] of kho.cauCuaNut) if (thuoc(id)) lay.push(...ds);
  const so = new Map(lay.map((id, i) => [id, `C${i + 1}`]));
  return { h, goc, nut, cungCap: [...cungCap], so, nguoc: new Map([...so].map(([a, b]) => [b, a])) };
}

export function loiDan(kho, g) {
  const ten = (id) => kho.nut.get(id).nguyenVan.replace(/\s+/g, ' ');
  const dong = [...g.so].map(([id, c]) => { const x = kho.cau.get(id); return `${c}${x.dan && g.so.has(x.dan) ? ` (mục dưới ${g.so.get(x.dan)})` : ''} [${x.nut}] ${x.chu.replace(/\s+/g, ' ')}`; });
  return `Bạn đọc luật phân loại hàng hoá. Việc: với MỖI NÚT trong danh sách, ghi nút đó gồm gì, không gồm gì, khác nút cùng cấp ở đâu. CHỈ dùng các câu luật đánh số bên dưới. Không dùng kiến thức ngoài, không suy thêm, không nêu ví dụ ngoài câu luật.

Quy tắc:
1. Mỗi ý là MỘT câu tiếng Việt ngắn, kèm "cau": các số câu (C…) làm căn cứ, từ 1 đến 3 câu. Ý phải đọc ra được từ chính các câu đó.
2. Câu ghi "(mục dưới Cx)" phải hiểu theo câu dẫn Cx ("không bao gồm:" thì mục đó bị LOẠI). Kê cả Cx trong "cau".
3. "khongGom": mọi hàng mà câu luật nói không thuộc nút. "den": mảng nơi câu luật chỉ tới, viết đúng như câu ("76.15", "Chương 83", "Phần XVI"); câu không chỉ nơi nào thì []. KHÔNG tự đoán mã.
4. "tachVoi": chỉ giữa hai nút CÙNG CHA, "voi" = id nút kia, mỗi cặp ghi MỘT lần ở nút đứng trước. Nêu tiêu chí tách mà câu luật nói (vật liệu, dạng, kích thước, công dụng…). Nhóm ${g.goc} với nhóm khác: chỉ ghi khi có câu định nghĩa hoặc chú giải cho tiêu chí tách; CẤM ghi kiểu "A là A, còn B là B". Nút "Loại khác": máy tự ghi phần còn lại, bạn KHÔNG ghi ý "phần còn lại".
5. Câu loại trừ trong chú giải của nhóm ${g.h} phải được kê hết ở nút ${g.goc}.
6. Chú giải Phần, Chương chỉ kê khi câu đó nói tới mặt hàng của nhóm này hoặc định nghĩa từ dùng trong tên nút.
7. Nút con thừa kế nút cha: định nghĩa, loại trừ đã ghi ở nút cha thì KHÔNG lặp ở nút con. "khongGom" không lặp lại nút anh em (đã có "tachVoi").
8. Trong "y" gọi nút bằng tên, không viết mã số của nút. Số đo chép đúng như câu.
9. Không có gì để ghi thì để mảng rỗng. Trả về DUY NHẤT một khối JSON, không lời dẫn.

Khuôn: [{"nut":"${g.goc}","gom":[{"y":"…","cau":["C1"]}],"khongGom":[{"y":"…","cau":["C9","C10"],"den":["58.09"]}],"tachVoi":[{"voi":"bieu:…","y":"…","cau":["C2","C3"]}]}]

NÚT CẦN GHI (cha → nút):
${g.nut.map((id) => `${id}  (cha ${kho.nut.get(id).cha})  ${ten(id)}`).join('\n')}

NÚT CÙNG CẤP VỚI ${g.goc}: ${g.cungCap.join(', ')}

CÂU LUẬT:
${dong.join('\n')}
`;
}

const so = (t) => (t.match(/\d+(?:[.,]\d+)*/g) || []).map((x) => x.replace(/[.,]$/, ''));
const gon = (t) => t.toLowerCase().replace(/\s+/g, ' ').replace(/(\d)\.(?=\d)/g, '$1,'); //  bản in lẫn 0.1 và 0,1

/** Kiểm một bản ghi đã đổi sang id thật. Trả lỗi; rỗng = đạt. */
export function kiemY(kho, x, loai, nutId) {
  const loi = []; if (!x.y || typeof x.y !== 'string') return ['thiếu ý'];
  if (!Array.isArray(x.cau) || !x.cau.length) return ['thiếu câu'];
  const chu = []; for (const c of x.cau) { const k = kho.cau.get(c); if (!k) loi.push(`câu không có thật ${c}`); else { chu.push(k.chu); let d = k.dan; while (d) { const q = kho.cau.get(d); if (!q) break; chu.push(q.chu); d = q.dan; } } }
  const than = gon(chu.join(' ')); const ten = gon(kho.nut.get(nutId).nguyenVan);
  const coSo = new Set([...so(than), ...so(ten)]);
  for (const n of so(gon(x.y))) if (!coSo.has(n)) loi.push(`số ${n} không có trong câu`);
  const coTu = (t) => new RegExp(`(^|[^\\p{L}\\d])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\d]|,\\d)`, 'u').test(than);
  if (loai === 'khongGom') for (const d of x.den || []) { const t = gon(d).replace(/^nhóm /, ''); const m = /^(chương|phần)\s+(\S+)$/.exec(t); if (!(coTu(t) || (m && than.includes(m[1]) && coTu(m[2])))) loi.push(`đích ${d} không có trong câu`); }
  if (loai === 'tachVoi') { const k = kho.nut.get(x.voi); if (!k) loi.push(`nút ${x.voi} không có`); else if (k.cha !== kho.nut.get(nutId).cha) loi.push(`${x.voi} không cùng cha`); else if (x.voi === nutId) loi.push('tách với chính nó'); }
  return loi;
}

/** Đổi câu trả lời thành bản ghi; ý sai bị loại, ghi lỗi. */
export function napTraLoi(kho, g, txt) {
  const m = /\[\s*\{[\s\S]*\}\s*\]/.exec(txt); if (!m) return { ra: [], loi: ['không có JSON'] };
  let ds; try { ds = JSON.parse(m[0]); } catch (e) { return { ra: [], loi: [`JSON hỏng: ${e.message}`] }; }
  const ra = []; const loi = []; const coi = new Set(g.nut);
  for (const b of ds) {
    if (!coi.has(b.nut)) { loi.push(`nút lạ ${b.nut}`); continue; }
    const r = { nut: b.nut, nhan: 'BO_TRO', gom: [], khongGom: [], tachVoi: [] };
    for (const loai of ['gom', 'khongGom', 'tachVoi']) for (const x of b[loai] || []) {
      const y = { y: x.y, cau: (x.cau || []).map((c) => g.nguoc.get(c) || `?${c}`), ...(loai === 'khongGom' ? { den: x.den || [] } : {}), ...(loai === 'tachVoi' ? { voi: x.voi } : {}) };
      if (loai === 'gom' && /phần còn lại/iu.test(x.y || '')) continue; //  máy tự ghi
      const e = kiemY(kho, y, loai, b.nut); if (e.length) loi.push(`${b.nut} ${loai} "${x.y}": ${e.join('; ')}`); else r[loai].push(y);
    }
    const cl = conLai(kho, b.nut); if (cl) r.gom.unshift(cl);
    ra.push(r);
  }
  for (const n of g.nut) if (!ra.some((r) => r.nut === n)) loi.push(`thiếu nút ${n}`);
  if (g.nut.includes(g.goc)) for (const id of thieuLoaiTru(kho, g, ra)) loi.push(`thiếu loại trừ ${id}`);
  return { ra, loi };
}

/** "Loại khác" = phần còn lại sau các nút cùng cha. Máy ghi, căn cứ là tên từng nút; không nhờ mô hình. */
export function conLai(kho, id) {
  const x = kho.nut.get(id); if (!/^[-\s]*loại khác/iu.test(x.nguyenVan) || !x.cha) return null;
  const anh = (kho.con.get(x.cha) || []).filter((y) => y !== id); if (!anh.length) return null;
  const ten = (n) => kho.nut.get(n).nguyenVan.replace(/^[-\s]+/, '').replace(/[:;\s]+$/, '').replace(/\s+/g, ' ');
  return { y: `Phần còn lại trong "${ten(x.cha)}" sau: ${anh.map(ten).join(' | ')}.`, cau: [x.cha, ...anh, id].flatMap((n) => kho.cauCuaNut.get(n) || []), may: true };
}

const DAN_LOAI = /(?:không (?:bao )?gồm|không kể|loại trừ|trừ)\b[^:]*:\s*$/iu;
/** Câu trong danh sách "không bao gồm:" của chú giải nhóm mà nút nhóm chưa kê. */
export function thieuLoaiTru(kho, g, ra) {
  const co = new Set(ra.filter((r) => r.nut === g.goc).flatMap((r) => r.khongGom.flatMap((x) => x.cau)));
  return [...g.so.keys()].filter((id) => id.startsWith(`nhom:${g.h}:`) && id.endsWith('#1')).filter((id) => {
    const d = kho.cau.get(id).dan; const q = d && kho.cau.get(d);
    return q && DAN_LOAI.test(q.chu) && !/bao gồm, không kể|không kể[^:]*bao gồm/iu.test(q.chu) && !co.has(id);
  });
}

const PHAN = (kho) => (ch) => { // Phần chứa chương: theo nút chương nếu có ghi cha; không thì theo tên kho
  const x = kho.nut.get(`chuong:${ch}`); if (x?.cha?.startsWith('phan:')) return x.cha.slice(5);
  const n = Number(ch); const M = [[5, 'I'], [14, 'II'], [15, 'III'], [24, 'IV'], [27, 'V'], [38, 'VI'], [40, 'VII'], [43, 'VIII'], [46, 'IX'], [49, 'X'], [63, 'XI'], [67, 'XII'], [70, 'XIII'], [71, 'XIV'], [83, 'XV'], [85, 'XVI'], [89, 'XVII'], [92, 'XVIII'], [93, 'XIX'], [96, 'XX'], [97, 'XXI']];
  return M.find(([m]) => n <= m)?.[1] || null;
};

function main() {
  const a = process.argv.slice(2); const kho = nap(); const g = (k) => a.find((x) => x.startsWith(`--${k}=`))?.split('=')[1];
  if (g('goi')) { process.stdout.write(loiDan(kho, goi(kho, g('goi'), PHAN(kho), g('nhanh') || null))); return; }
  if (g('nap')) { const r = napTraLoi(kho, goi(kho, g('nap'), PHAN(kho), g('nhanh') || null), fs.readFileSync(a.at(-1), 'utf8')); for (const x of r.ra) console.log(JSON.stringify(x)); for (const l of r.loi) console.error(l); return; }
  if (a.includes('--nhom-cua-chuong')) return;
  if (a.includes('--kiem')) {
    let hong = 0; const D = path.join(GOC, 'tom-tat'); let y = 0;
    for (const f of fs.existsSync(D) ? fs.readdirSync(D).filter((x) => x.endsWith('.jsonl')) : []) for (const l of fs.readFileSync(path.join(D, f), 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(l); if (!kho.nut.has(r.nut)) { console.log(`✗ ${f} nút lạ ${r.nut}`); hong += 1; continue; }
      for (const loai of ['gom', 'khongGom', 'tachVoi']) for (const x of r[loai]) { y += 1; const e = kiemY(kho, x, loai, r.nut); if (e.length) { hong += 1; console.log(`✗ ${r.nut} ${loai}: ${e.join('; ')}`); } }
    }
    console.log(`${hong ? 'FAIL' : 'PASS'} tóm tắt: ${y} ý, ${hong} lỗi`); process.exit(hong ? 1 : 0);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
