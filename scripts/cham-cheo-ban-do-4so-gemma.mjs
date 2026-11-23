import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const REPO = process.env.REPO || new URL("..", import.meta.url).pathname;
const OUT = process.env.OUT || process.env.HOME + "/cham-cheo-gpu";
const URL = 'http://192.168.1.68:11434/api/chat';
const ds = process.argv[2] ? process.argv[2].split(',') : fs.readdirSync(REPO + '/data/do-thi/ban-do-4so').filter(f => /^\d{4}\.json$/.test(f)).map(f => f.slice(0, 4)).sort();
const SYS = `Bạn là người chấm chéo độc lập bản đồ quan hệ nhóm HS 4 số. Bản đồ do AI khác soạn. Nhiệm vụ: kiểm từng mục (y / dacDiem / neu / conNeu / cạnh) xem có đúng NGHĨA của đoạn luật được trích không (không chỉ trùng chữ), chiều cạnh (thi / thiKia) đúng không, có suy rộng hay bịa không.
Cách đọc một cạnh: {den, dacDiem, neu, thi, conNeu, thiKia, canCu}: xét đặc điểm dacDiem của hàng; NẾU hàng thoả "neu" THÌ thuộc nhóm "thi"; còn NẾU hàng thoả "conNeu" THÌ thuộc nhóm "thiKia". thi và thiKia là hai nhóm khác nhau trong {nhóm đang chấm, den}. Cạnh đúng chiều khi đoạn luật trong canCu nói đúng điều đó.
Tiêu chí: DUYET = mọi mục đúng nghĩa, đúng chiều, không suy rộng. SUA = có lỗi nghĩa cụ thể nhưng sửa được (nêu rõ mục và dẫn chữ trong đoạn). BO = hỏng cả nhóm (soạn từ trí nhớ, đảo chiều, nhiều cạnh vô căn cứ).
Chỉ DUYET khi thật sự đã đối chiếu từng cạnh với đoạn luật. Trả DUY NHẤT một mảng JSON, không văn bản khác: [{"nhom":"XXXX","ketQua":"DUYET|SUA|BO","loi":[{"muc":"canh[i]","vi":"lý do, dẫn chữ"}],"ghiChu":"nhận xét ngắn"}]`;
const tg = [];
let lienTiepLoi = 0;
const kq = [], bo = [];
for (const h of ds) {
  const goi = execFileSync('node', ['scripts/cham-cheo-ban-do-4so.mjs', '--goi', '--nhom=' + h], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
  fs.writeFileSync(`${OUT}/tho/${h}.prompt.txt`, goi);
  let ok = false;
  for (let lan = 1; lan <= 2 && !ok; lan++) {
    const t0 = Date.now();
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15 * 60 * 1000),
        body: JSON.stringify({ model: process.env.MO_HINH || "gemma4:31b", stream: false, options: { num_ctx: 32768, temperature: 0.1 }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: goi }] }) });
      const j = await r.json();
      const txt = j.message?.content || '';
      fs.writeFileSync(`${OUT}/tho/${h}.tra-loi.json`, JSON.stringify(j, null, 1));
      const m = txt.match(/\[[\s\S]*\]/);
      const arr = JSON.parse(m[0]);
      const k = arr.find(x => String(x.nhom).replace(/\D/g, '') === h) || arr[0];
      k.nhom = h;
      kq.push(k); tg.push((Date.now() - t0) / 1000); ok = true; lienTiepLoi = 0;
      console.log(h, k.ketQua, ((Date.now() - t0) / 1000).toFixed(0) + 's', (k.loi || []).length + ' loi');
    } catch (e) { console.log(h, 'LOI lan', lan, e.message); lienTiepLoi++; }
  }
  if (!ok) bo.push(h);
  if (lienTiepLoi > 3) { console.log('DUNG: .68 loi >3 lan lien tiep'); break; }
  fs.writeFileSync(`${OUT}/kq.json`, JSON.stringify(kq, null, 1));
}
console.log('XONG', JSON.stringify({ kq: kq.length, boQua: bo, tb: tg.length ? tg.reduce((a, b) => a + b) / tg.length : 0 }));
