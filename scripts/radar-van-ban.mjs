// Radar dò VĂN BẢN MỚI từ Công báo điện tử (congbao.chinhphu.vn RSS) —
// đối chiếu sổ oz-wiki-plhq (qua lib/plhq-registry) và tự mở issue nạp.
// "Repo sống, thở từng ngày" (CEO 29/10/2026): càng mới càng phải cập nhật.
// Chạy: node scripts/radar-van-ban.mjs [--gh]
//   mặc định = dry-run in kết quả; --gh = mở issue oz-wiki-plhq khi có VB mới thuộc phạm vi.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { lookup } = require('../lib/plhq-registry.js');

const FEED = 'https://congbao.chinhphu.vn/cac-van-ban-moi-ban-hanh.rss';
const REPO_DICH = 'ozvietnam/oz-wiki-plhq';
const TEP_DAU = 'radar-van-ban-da-xu-ly.json';

// Cơ quan LUÔN theo dõi khi là bản hợp nhất thuế/XNK; bộ khác lọc theo từ khoá tiêu đề.
const CO_QUAN_THEO_DOI = ['VBHN-TT-BTC', 'VBHN-TT-BCT', 'VBHN-BTC', 'VBHN-BCT'];
// Từ khoá tiêu đề: VB của bộ khác nhưng chạm phạm vi hàng hoá XNK vẫn đáng nạp.
const TU_KHOA = ['xuất nhập khẩu', 'xuất, nhập khẩu', 'hải quan', 'thuế xuất khẩu', 'thuế nhập khẩu', 'trị giá hải quan', 'mã số hàng hóa', 'phân loại hàng', 'kiểm tra chuyên ngành', 'kiểm dịch', 'công bố', 'tiêu chuẩn', 'quy chuẩn', 'giấy phép nhập', 'tạm nhập', 'quá cảnh', 'giao thẳng', 'uỷ thác', 'ủy thác', 'xuất xứ', 'C/O', 'FTA', 'hàng hóa', 'hàng hoá', 'mỹ phẩm', 'thuốc', 'thực vật', 'động vật', 'gỗ', 'xăng dầu', 'hoá chất', 'hóa chất', 'phân bón', 'thức ăn', 'vaccine', 'thiết bị y tế'];

/** Trích số hiệu từ slug công báo: "van-ban-hop-nhat-so-116-2026-vbhn-tt-nhnn-470863" → 116/2026/VBHN-TT-NHNN */
export function soHieuTuSlug(url) {
  const m = String(url || '').match(/-(?:so-)?(\d{1,4})-(\d{4})-((?:vbhn-)?(?:qd|tt|nd|qh|tb)[a-z0-9-]*?)(?:-\d+)?\.htm/i);
  if (!m) return null;
  const loai = m[3].toUpperCase().replace(/-/g, '-');
  return `${m[1]}/${m[2]}/${loai}`;
}

/** Chuẩn hoá moTa + lọc phạm vi: true nếu cơ quan theo dõi HOẶC tiêu đề chạm từ khoá. */
export function thuocPhamVi(soHieu, moTa) {
  const sh = String(soHieu || '').toUpperCase();
  if (CO_QUAN_THEO_DOI.some((cq) => sh.endsWith(cq) || sh.includes(`/${cq}`) || sh.endsWith(cq.replace('TT-', 'TT-')))) return true;
  const t = String(moTa || '').toLowerCase();
  return TU_KHOA.some((k) => t.includes(k.toLowerCase()));
}

/** Parse RSS thô (không dependency): item → {moTa, ngay, url}. */
export function docRss(xml) {
  const out = [];
  const items = String(xml || '').split(/<item>/i).slice(1);
  for (const it of items) {
    const moTa = (it.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || it.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';
    const pub = (it.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
    const url = (it.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
    if (moTa && url) out.push({ moTa: moTa.trim(), ngay: pub.trim(), url: url.trim() });
  }
  return out;
}

export function phanTich(items) {
  const daXuLy = existsSync(join(process.env.HS_DATA_DIR || join(process.cwd(), 'data'), TEP_DAU))
    ? JSON.parse(readFileSync(join(process.env.HS_DATA_DIR || join(process.cwd(), 'data'), TEP_DAU), 'utf8')) : {};
  const moi = [], boQuaDaCo = [], ngoaiPhamVi = [];
  for (const it of items) {
    const so = soHieuTuSlug(it.url);
    const key = so || it.url;
    if (!thuocPhamVi(so, it.moTa)) { ngoaiPhamVi.push(it); continue; }
    if (so && lookup(so)) { boQuaDaCo.push({ ...it, soHieu: so }); continue; }
    if (daXuLy[key]) continue; // đã mở issue trước đó
    moi.push({ ...it, soHieu: so, key });
  }
  return { moi, boQuaDaCo, ngoaiPhamVi, daXuLy };
}

async function main() {
  const thuc = process.argv.includes('--gh');
  const res = await fetch(FEED, { headers: { 'User-Agent': 'oz-radar-van-ban/1.0 (+ozvietnam)' } });
  if (!res.ok) { console.error(`LỖI fetch feed: HTTP ${res.status}`); process.exit(1); }
  const xml = await res.text();
  const items = docRss(xml);
  const { moi, boQuaDaCo, daXuLy } = phanTich(items);
  console.log(`feed ${items.length} VB · đã có trong sổ ${boQuaDaCo.length} · NGOÀI phạm vi bỏ ${phanTich(items).ngoaiPhamVi.length} · MỚI thuộc phạm vi ${moi.length}`);
  for (const v of moi) console.log(`[mới] ${v.soHieu || '(không trích được số)'} — ${v.moTa.slice(0, 90)}…`);
  if (!moi.length || !thuc) return;

  // Mở 1 issue/ngày: check-list từng VB để nạp xong tick dần
  const { execFileSync } = require('child_process');
  const ngay = new Date().toISOString().slice(0, 10);
  const danhSach = moi.map((v) => `- [ ] **${v.soHieu || 'không rõ số'}** — ${v.moTa.slice(0, 180)}\n  ${v.ngay} · [nguồn](${v.url}) · ${lookup(v.soHieu || '') ? 'đã có' : 'found:false trong sổ'}`).join('\n');
  const body = `Radar Công báo điện tử quét ${new Date().toLocaleString('vi-VN')} — ${moi.length} văn bản MỚI thuộc phạm vi kho chưa có trong sổ.\n\n${danhSach}\n\n> Sinh tự động bởi \`scripts/radar-van-ban.mjs --gh\` (hs-code-api). Nạp xong tick từng mục; các VB ngoài phạm vi hôm nay đã lọc sẵn. Nguồn: Công báo điện tử Chính phủ.`;
  try { execFileSync('gh', ['label', 'create', 'radar', '-R', REPO_DICH, '--description', 'VB mới phát hiện bằng radar công báo — chờ nạp vào sổ'], { stdio: 'ignore' }); } catch { /* đã có */ }
  const url = execFileSync('gh', ['issue', 'create', '-R', REPO_DICH, '--title', `[radar] VB mới ${ngay}: ${moi.length} văn bản thuộc phạm vi`, '--body', body, '--label', 'radar'], { encoding: 'utf8' }).trim();
  for (const v of moi) daXuLy[v.key] = { issue: url, ts: new Date().toISOString() };
  const duoi = join(process.env.HS_DATA_DIR || join(process.cwd(), 'data'), TEP_DAU);
  writeFileSync(duoi, JSON.stringify(daXuLy, null, 1) + '\n');
  console.log(`[ok] issue: ${url}`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
