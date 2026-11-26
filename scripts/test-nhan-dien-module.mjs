#!/usr/bin/env node
/**
 * scripts/test-nhan-dien-module.mjs — cổng chống tái phát lớp lỗi đường dẫn Windows (#PR).
 *
 * Bốn khuôn nhận-diện "tệp này là module chạy trực tiếp" và tính thư mục gốc repo chỉ đúng
 * trên Linux: (1) lấy `.pathname` từ một URL dựng bằng `import.meta.url` — trên Windows ra
 * '/C:/…'; (2) so `import.meta.url` với tiền tố scheme cộng chuỗi ghép tay từ `argv[1]` —
 * trên Windows thiếu một dấu gạch chéo; (3) gọi `endsWith` trên `import.meta.url` với tên tệp
 * cắt bằng dấu gạch chéo — Windows dùng dấu ngược nên không cắt được gì; (4) coi chuỗi bắt đầu
 * bằng dấu gạch chéo nghiêng là đường dẫn tuyệt đối — phải dùng `isAbsolute`. Ba khuôn đầu
 * hỏng IM LẶNG: lệnh in ra 0 byte và thoát 0, nên cổng đỏ thì ít mà cổng-xanh-không-đo-gì thì nhiều.
 *
 * Cổng này quét tĩnh, vì vậy nó chạy được cả trên CI ubuntu — đó là điểm chính:
 * nó chặn lỗi trước khi lên main, không cần người góp ý phải có máy Windows.
 *   1. Mọi tệp mà `npm test` nạp hoặc sinh ra (bao đóng từ scripts/danh-sach-test.txt) phải sạch.
 *   2. `.gitattributes` phải bắt buộc LF — các cổng sha256/Mermaid so byte đích.
 *   3. Ca ngược: bộ nhận mẫu phải bắt được chính ba khuôn trên, chống cổng xanh giả.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GOC, doc, boKiem, co, napTrucTiep, tepMa } from './lib-luat.mjs';

const { kiem, xong } = boKiem('test-nhan-dien-module');
const TU = 'scripts/test-nhan-dien-module.mjs';
const RE_ONE_SHOT = /^scripts\/apply-review-lo[^/]*\.mjs$/;

const KHUON = [
  ['duong-dan-tu-URL', /new URL\((?:[^)]*,\s*)?import\.meta\.url\)\.pathname/],
  ['file-template-thieu-gach', /`file:\/\/\$\{[^}]*argv\[\d\][^}]*\}`/],
  ['endsWith-tren-URL', /import\.meta\.url\.endsWith\(/],
  // nhận "tuyệt đối" bằng dấu `/` đầu chuỗi: đúng trên Linux, sai trên Windows (`C:\Temp\…`).
  ['duong-dan-tuyen-doi-slash', /(\w+)\.startsWith\(\s*['"]\/['"]\s*\)\s*\?\s*\1\s*:/],
];

/** Danh sách lệnh mà `npm test` chạy (bỏ chú thích và dòng trống). */
const lenh = () => doc('scripts/danh-sach-test.txt')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.replace(/^node\s+/, '').split(' ')[0]);

/**
 * Bao đóng: mọi tệp .js/.mjs mà `npm test` nạp trực tiếp, nạp qua `import`/`require`,
 * hoặc sinh ra qua đường dẫn viết chữ trần trong mã (`'scripts/…mjs'`).
 */
export function baoDongCayTest() {
  const seen = new Set();
  const q = lenh().filter((f) => fs.existsSync(path.join(GOC, f)));
  while (q.length) {
    const f = q.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    let s;
    try { s = fs.readFileSync(path.join(GOC, f), 'utf8'); } catch { continue; }
    // `napTrucTiep` của lib-luat còn thử `x.js`/`x.mjs`/`x/index.js`; tự viết lại bằng đúng
    // một đường dẫn trần sẽ bỏ mọi `require('./x')` không đuôi và sót cả nhánh `lib/ho-so/…`.
    const refs = new Set(napTrucTiep(f));
    for (const m of s.matchAll(/['"`]((?:scripts|lib|api)\/[A-Za-z0-9_\-./]+\.m?js)['"`]/g)) if (co(m[1])) refs.add(m[1]);
    for (const r of refs) if (!seen.has(r)) q.push(r);
  }
  return [...seen].sort();
}

/** Tên các khuôn mà một đoạn mã vi phạm. */
export function timKhuonXauDoan(s) {
  return KHUON.filter(([, re]) => re.test(s)).map(([ten]) => ten);
}

/** Mọi tệp trong bao đóng vi phạm một trong bốn khuôn. */
export function timKhuonXau(danhSach) {
  const ra = [];
  for (const f of danhSach) {
    for (const khuon of timKhuonXauDoan(doc(f))) ra.push({ tep: f, khuon });
  }
  return ra;
}

/**
 * Mọi công cụ .js/.mjs còn sống trong scripts/ (đệ quy cả thư mục con như scripts/luat-goc/),
 * loại trừ các tệp one-shot scripts/apply-review-lo*.mjs và chính cổng này.
 */
export function congCuSongScripts() {
  return tepMa('scripts').filter((f) => f !== TU && !RE_ONE_SHOT.test(f));
}

const cay = baoDongCayTest();
const congCuScripts = congCuSongScripts();

// __MAU_XAU_START__ — những chuỗi dưới đây CỐ TÌNH sai để thử bộ nhận mẫu; chỉ khối giữa hai
// marker được miễn quét, phần còn lại của tệp này vẫn bị quét như mọi tệp khác.
const MAU = {
  'duong-dan-tu-URL': {
    xau: "const GOC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');",
    xau2: "const ROOT = path.resolve(new URL('..', import.meta.url).pathname);",
    tot: "const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');",
    tot2: "const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));",
  },
  'file-template-thieu-gach': {
    xau: 'if (import.meta.url === `file://${process.argv[1]}`) { main(); }',
    tot: "if (import.meta.url === pathToFileURL(process.argv[1] || '').href) { main(); }",
  },
  'endsWith-tren-URL': {
    xau: "const laChinh = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\\//, ''));",
    tot: 'const laChinh = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;',
  },
  'duong-dan-tuyen-doi-slash': {
    xau: "const files = args.map((a) => (a.startsWith('/') ? a : join(root, a)));",
    tot: 'const files = args.map((a) => (isAbsolute(a) ? a : join(root, a)));',
  },
};
// __MAU_XAU_END__

const cayQuet = cay.filter((f) => f !== TU);
const xau = timKhuonXau(cayQuet);
const xauScripts = timKhuonXau(congCuScripts);
kiem(`bao đóng 'npm test' quét được (${cay.length} tệp)`, cay.length > 400, `chỉ ${cay.length} — có thể broken traversal`);
kiem('đúng một tệp được miễn quét, và đó là chính cổng này',
  cay.includes(TU) && cay.length - cayQuet.length === 1, `cay=${cay.length} quet=${cayQuet.length}`);
kiem('không tệp nào trong bao đóng dùng khuôn đường dẫn chỉ chạy trên Linux',
  xau.length === 0,
  xau.slice(0, 8).map((x) => `${x.tep}:${x.khuon}`).join(' '));
kiem(`toàn bộ công cụ sống trong scripts/ quét được (${congCuScripts.length} tệp, gồm cả thư mục con)`,
  congCuScripts.length > 500 && congCuScripts.some((f) => f.startsWith('scripts/luat-goc/')) && !congCuScripts.includes(TU) && !congCuScripts.some((f) => RE_ONE_SHOT.test(f)),
  `chỉ ${congCuScripts.length} tệp`);
kiem('không công cụ sống nào trong scripts/ dùng khuôn đường dẫn chỉ chạy trên Linux',
  xauScripts.length === 0,
  xauScripts.slice(0, 8).map((x) => `${x.tep}:${x.khuon}`).join(' '));
const ngoaiMau = doc(TU).replace(/__MAU_XAU_START__[\s\S]*?__MAU_XAU_END__/g, '');
kiem('mã thật của chính cổng cũng sạch ngoài khối mẫu', timKhuonXauDoan(ngoaiMau).length === 0, timKhuonXauDoan(ngoaiMau).join(' '));

// Ca ngược — chống cổng xanh giả: chính bộ nhận mẫu phải bắt được bốn khuôn.
for (const [ten, re] of KHUON) {
  kiem(`ca ngược: khuôn ${ten} phát hiện được mã cố tình sai`, re.test(MAU[ten].xau));
  kiem(`ca thuận: khuôn ${ten} không báo nhầm mã đã sửa đúng`, !re.test(MAU[ten].tot));
}
const reUrl = KHUON.find(([ten]) => ten === 'duong-dan-tu-URL')[1];
kiem('ca ngược: khuôn duong-dan-tu-URL phát hiện biến thể 2 đối số (đường dẫn tương đối + import.meta.url)',
  reUrl.test(MAU['duong-dan-tu-URL'].xau2));
kiem('ca thuận: khuôn duong-dan-tu-URL không báo nhầm biến thể 2 đối số bọc fileURLToPath',
  !reUrl.test(MAU['duong-dan-tu-URL'].tot2));

// .gitattributes: các cổng sha256/Mermaid so byte đích, nên tệp văn bản phải là LF trên Windows.
const coRau = fs.existsSync(path.join(GOC, '.gitattributes'));
kiem('.gitattributes tồn tại (chống core.autocrlf đổi LF thành CRLF lúc clone)', coRau);
if (coRau) {
  const rau = doc('.gitattributes');
  kiem('.gitattributes bắt buộc eol=lf cho tệp văn bản', /^\*\s+text=auto\s+eol=lf\s*$/m.test(rau));
  kiem('.gitattributes đánh dấu nhị phân để không bị sửa byte', /binary/.test(rau));
}

const duoi = doc('scripts/lib-luat.mjs');
kiem('lib-luat.mjs tính GOC bằng fileURLToPath (đồ dùng chung của mọi cổng)',
  /fileURLToPath\(import\.meta\.url\)/.test(duoi) && timKhuonXau(['scripts/lib-luat.mjs']).length === 0);

console.log(`cổng nhận-diện module: ${cay.length} tệp trong bao đóng, ${congCuScripts.length} công cụ sống trong scripts/, ${xau.length + xauScripts.length} vi phạm`);
xong();
