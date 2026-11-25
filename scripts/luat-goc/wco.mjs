#!/usr/bin/env node
// scripts/luat-goc/wco.mjs — M-17: data/wco-op (opinions.json + vi.json) → data/luat-goc/wco.jsonl (khuôn nut-luat@1).
// Tất định, không mạng, không AI. Nguyên văn = bản OCR tiếng Anh đúng như kho; không sửa chữ nào, chỗ nghi lỗi OCR chỉ ĐÁNH CỜ (`ocrNghi`).
// Mọi nút có `ocr: true`: chữ là bản OCR, chưa chắc nguyên văn từng chữ; bên đọc phải dẫn "theo bản OCR".
//   node scripts/luat-goc/wco.mjs                 ghi data/luat-goc/wco.jsonl
//   node scripts/luat-goc/wco.mjs --bang-nghi     in bảng markdown các ý kiến không nạp (dán vào báo cáo thẻ)
//   node scripts/luat-goc/wco.mjs --so-dem        in số đếm
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ANH, KHO_SHA256 } from './wco-anh.mjs';

const require = createRequire(import.meta.url);
const GOC = fileURLToPath(new URL('../..', import.meta.url));
const doc = (p) => fs.readFileSync(path.join(GOC, p), 'utf8');

/**
 * Đọc bằng MẮT trên ảnh trang PDF (không suy đoán). Chỉ dùng cho năm thông qua khi kho thiếu / sai; nguyên văn vẫn giữ như kho.
 * id kho → [năm in, trang PDF]
 */
export const NAM_DOC_ANH = {
  '220299/1': [1965, 52], '841989/2': [1965, 251], '680690/1': [2007, 204], '880622/2': [2019, 413], '890520/1': [1997, 414], '901890/2': [2012, 425],
};
/** Phần nguyên văn kho không có (đọc ảnh). */
export const THIEU = {
  '732690/13': 'Kho mất "7 to 14 %." ở cuối câu (hàm lượng alumina), ảnh trang PDF 232.',
  '901890/2': 'Kho chỉ có điểm (i). Các điểm (ii) đến (v), câu "Application of GIRs…" và năm 2012 in tiếp ở trang PDF 425; kho tách nhầm phần đó thành 9018.90/3 (nghi, không nạp).',
};
/**
 * Ý kiến nghi của kho được khôi phục mã/thứ tự: OCR thứ hai (wco-anh.mjs) đọc ra biển MỘT mã + số in, VÀ mắt xem ảnh trang thấy đúng
 * biển đó, số đó, năm đó, câu mở đầu đó (25/11/2026). id kho → <hs6>/<số in>. Không đoán; hai cách đọc không cùng ra thì không có ở đây.
 */
export const KHOI_PHUC = {
  '220890/2': '220890/3', '220890/3': '220890/4', '220890/4': '220890/5', '220890/5': '220890/6', '271012/1': '271012/2',
  '271019/1': '271019/2', '271019/2': '271019/3', '271019/3': '271019/4', '292419/2': '292429/1', '392390/4': '392490/1',
  '392390/5': '392490/2', '392490/1': '392490/3', '392490/2': '392490/4', '392490/3': '392490/5', '392490/4': '392490/6',
  '392490/5': '392490/7', '420212/3': '420221/1', '420212/4': '420232/1', '420292/2': '420299/1', '420292/3': '420299/2',
  '481190/3': '481190/3', '560122/2': '560130/1', '611030/5': '611420/1', '731210/3': '731449/1', '732119/2': '732189/1',
  '732690/10': '741980/1', '732690/11': '741980/2', '732690/12': '750610/1', '732690/13': '760310/1', '761090/2': '761510/1',
  '842720/2': '842890/1', '842720/3': '842890/2', '842890/2': '843149/1', '844332/2': '844399/1', '844399/1': '844399/2',
  '844399/2': '844399/3', '845130/3': '845180/1', '845130/4': '845180/2', '845130/5': '845190/1', '847960/5': '847989/2',
  '847960/6': '847989/3', '847960/7': '847989/4', '847960/8': '847989/5', '847989/1': '847989/6', '847989/2': '847989/7',
  '847989/3': '847989/8', '847989/4': '847989/9', '847989/5': '847989/10', '847989/6': '847989/11', '848310/2': '848340/1',
  '850162/2': '850213/1', '850730/2': '850750/1', '851230/2': '851290/1', '852491/2': '852589/1', '852491/3': '852589/2',
  '852852/9': '852871/1', '852852/10': '852871/2', '852852/11': '852871/3', '853710/2': '853710/2', '860900/2': '870110/1',
  '860900/3': '870130/1', '870421/4': '870423/1', '870421/5': '870431/1', '870421/6': '870431/2', '870421/7': '870431/3',
  '870431/1': '870431/4', '870431/2': '870431/5', '870850/5': '870893/1', '902620/2': '902720/1', '902720/1': '902720/2',
  '902790/2': '902890/1', '940320/7': '940320/7', '940320/8': '940320/8', '950300/6': '950300/6',
};
/** Nghi, ảnh máy đọc được mã + số nhưng không khôi phục. */
const KHONG_KHOI_PHUC = {
  '271490/2': 'trùng id 2714.90/1 (bản in hai biển 2714.90 cùng đánh số 1)', '852871/1': 'OCR thứ hai đọc số 1, mắt thấy số 4 (8528.71/4): hai cách đọc không cùng ra',
};
/** Sự thật về bản in, đọc ảnh. */
export const GHI_CHU_IN = {
  '271490/1': 'Trang 74 in hai biển 2714.90 liền nhau, mỗi biển lại đánh số 1 (sáp vi tinh thể; rồi bitum tự nhiên). Nghi lỗi in ở biển đầu, giữ theo bản in, không đoán mã.',
};
const LY_DO_KHO = {
  'mo-dau-la-chu-thich-anh': 'mở đầu bằng nhãn ảnh, không có số in → chưa xác định được',
  'khong-doc-duoc-so-thu-tu': 'không đọc được số thứ tự in',
  'so-in-lon-hon-thu-tu': 'số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước hoặc mã sai',
  'so-in-nho-hon-thu-tu': 'số in nhỏ hơn thứ tự gán → có biển mã bị mất',
  'sau-diem-danh-so-lai': 'đứng sau chỗ đánh số lại',
  'noi-dung-khong-khop-ma': 'nội dung không khớp mã',
};
const cham = (hs) => `${hs.slice(0, 4)}.${hs.slice(4)}`;
const maTrenBien = (b) => [...String(b).matchAll(/(\d{4})[.,]\s?(\d{2})/g)].map((m) => m[1] + m[2]);
/** Biển in có nhận mã này? "A to B" nhận cả khoảng. */
export function bienNhan(bien, hs) {
  const ma = maTrenBien(bien);
  if (ma.includes(hs)) return true;
  return [...String(bien).matchAll(/(\d{4})\.(\d{2}) to (\d{4})\.(\d{2})/g)].some((m) => hs >= m[1] + m[2] && hs <= m[3] + m[4]);
}

/** Lý do KHÔNG nạp (mảng rỗng = nạp). Cổng của kho (lib/wco-op.js) trước, rồi tới ba phép so với ảnh. */
export function lyDoKhongNap(o, wco) {
  if (!wco.view(o) && KHOI_PHUC[o.id]) {
    const a = ANH[o.id]; const [hs, so] = KHOI_PHUC[o.id].split('/');
    return maTrenBien(a[2]).join() === hs && a[3] === Number(so) && a[4] === String(o.adoption) ? [] : ['bảng KHOI_PHUC không khớp bảng ảnh'];
  }
  if (!wco.view(o)) {
    const l = [];
    if (o.headingRestart) l.push('đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước');
    if (o.headingConflict) l.push(LY_DO_KHO[o.headingConflict] || o.headingConflict);
    if (!l.length) l.push('tiêu đề mã bị mất / nghi sai (vòng khôi phục trước)');
    if (KHONG_KHOI_PHUC[o.id]) l.push(KHONG_KHOI_PHUC[o.id]);
    return l;
  }
  const a = ANH[o.id]; const l = [];
  if (a && !bienNhan(a[2], o.hs)) l.push(`qua cổng kho nhưng ảnh trang ${a[0]} in biển ${a[2]}`);
  if (a && a[3] != null && a[3] !== o.ord) l.push(`qua cổng kho nhưng ảnh trang ${a[0]} in số ${a[3]}, kho gán ${o.ord}`);
  if (/^1\. \(Deleted/.test(o.text)) l.push(`qua cổng kho nhưng gộp hai mục: "1. (Deleted)" và nội dung của ${cham(o.hs)}/2 (ảnh trang ${a?.[0]})`);
  const g = /\n\n(\d{1,2})\. (?=[A-Z][a-z]+ [a-z]+ [a-z]+ )/.exec(o.text);
  if (g && Number(g[1]) === o.ord + 1 && !/^1\. \(Deleted/.test(o.text)) l.push(`qua cổng kho nhưng chữ gộp hai ý kiến ${o.ord} và ${g[1]} (ảnh trang ${a?.[0]})`);
  return l;
}

/** Bỏ biển mã / đầu trang bị OCR dính vào hai đầu. Chỉ bỏ khi khớp trọn mẫu; phần bỏ ghi ở boKhoiNguyenVan. */
export function boDauChan(text, ord) {
  const bo = []; let t = text; let dau = 0;
  // Luật 1 (chân): sau "*Adoption: YYYY*" trên cùng dòng chỉ còn mã HS / to / or / (continued…) = biển của ý kiến kế tiếp.
  const m = /\*(Adoption: \d{4})\*([ |]+\$?\d[\d.,]*(?:(?:,| or| to)? ?\d[\d.,]*)*(?: ?\([a-z ]*\)?)?[ |]*)$/.exec(t);
  if (m) { bo.push(m[2].trim()); t = t.slice(0, m.index) + m[1]; }
  // Luật 2 (đầu): trước "<số thứ tự>. " có chữ "(contin…" hoặc "Section <La Mã>" = biển / đầu trang.
  const d = new RegExp(`^(?:[^\\n]{0,45}?\\(contin[^)]*\\)|[^\\n]{0,45}?fcontinued\\)|[_ ]*:? ?Section:? [XVIL]+)[^\\n]{0,24}?(?=${ord}\\. [A-Z])`, 'i').exec(t);
  if (d) { bo.push(d[0].trim()); dau = d[0].length; t = t.slice(dau); }
  return { t, bo, dau };
}

/** Câu nêu quy tắc, chép nguyên văn: từ "Application of/des GIR|RGI|Note|Subheading" tới trước "See also" / Adoption. */
export function cauQuyTac(t) {
  const m = /Application (?:of|des) (?:GIRs?|RGI|Notes?|Subheading|the)\b[\s\S]*?(?=\n\n[_*]*(?:See also|Adoption)|\s[_*]*See also|\n\n\d{1,2}\. See also|\s\*?Adoption\b|$)/.exec(t);
  return m ? m[0].trim() : null;
}

const LUAT_OCR = [
  ['ky-tu-la', /[|{}\\~^`¢€»«§¥£=]|(?<=\w)_(?=\s)|\s_(?=\s)|\s[\][](?=\s)|\/\]|\$|!/g],
  ['chu-roi', /(?<=[\s])(?:[b-fhjknoqrstuz]|[CDEFGHJOQSTZ])(?=\s)(?<!\d\s[CF])(?<!\d [a-z])(?<!itamins? [A-Z])/g],
  ['dau-cau-roi', /(?<=\s)[;,.!’‘“”"'»)(](?=\s)/g],
  ['dau-dong-lan', /^(?!\d{1,2}\. )[^\n]{1,12}/g],
  ['gach-ngat-dong', /[a-z]- (?!and\b|or\b|to\b|und\b)[a-z]+/g],
  ['chu-so-lan', /\b\d+[lIO]\b|\b[lIO]\d|\bS\d{1,3}\b|\b[lI] ?(?=%|mm\b|cm\b|kg\b|to\b)|\b\d[Is]\b|\bSO\d*\b|\bl?OOO/g],
  ['mu-chi-so-mat', /(?:\b(?:c?m|mm)|[A-Z])\?/g],
  ['so-la-ma-vo', /Section [XVI]*[DWUl1]+[XVI]*\b/g],
  ['ky-hieu-vo', /\([a-z]?[il1]{2,3}[l1][il1]?\)|\((?:ili|il|li|iil|ill|i1|1ii|1i)\)|\b[a-z]+[VU][a-z]{2,}\b|\b1s\b/g],
  ['gir-vo', /GIRs? (?![1-6])[^\s]*|Application des|(?<=\d) et (?=\d)|(?:GIR|RGI)[^\n]*,(?=\n|$)|Note [|I]\b|\n\n\d{1,2}\. (?=and \d|See also)/g],
  ['thieu-dong-nam', /^(?![\s\S]*Adoption: \d{4})[\s\S]{0,1}/g],
  ['nam-la', /Adoption: (?!19[5-9]\d|20[01]\d|202[0-2])\d{4}/g],
  ['nhieu-ma-ngoai-le', /(?<=Opinions? [^\n]*)\b(?:\d{3}\.\d{2}|\d{4}\. \d{2}|\d{4},\d{2}|\d{6,})(?=\/|\b)/g],
];

/** Cờ nghi lỗi OCR: [{luat, viTri, chu}] — viTri tính theo ký tự trong nguyenVan. Không sửa chữ. */
export function ocrNghi(t) {
  const r = [];
  for (const [luat, re] of LUAT_OCR) for (const m of t.matchAll(re)) r.push({ luat, viTri: m.index, chu: m[0] });
  // Ngoặc tròn đóng mà không có mở (bỏ qua dạng điểm "a)").
  let sau = 0; for (let i = 0; i < t.length; i += 1) { if (t[i] === '(') sau += 1; else if (t[i] === ')') { if (sau) sau -= 1; else if (!/(?:^|\s)[a-z0-9]{1,2}$/.test(t.slice(0, i))) r.push({ luat: 'ngoac-lech', viTri: i, chu: ')' }); } }
  return r;
}

export function dung() {
  const wco = require('../../lib/wco-op.js');
  const rawKho = doc('data/wco-op/opinions.json');
  if (crypto.createHash('sha256').update(rawKho).digest('hex') !== KHO_SHA256) throw new Error('opinions.json đã đổi: chạy lại scripts/luat-goc/wco-anh.py');
  const kho = JSON.parse(rawKho); const vi = JSON.parse(doc('data/wco-op/vi.json'));
  const bieu = new Set(doc('data/luat-goc/bieu.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l).id));
  const nut = []; const nghi = [];
  for (const o of [...kho].sort((a, b) => (a.hs < b.hs ? -1 : a.hs > b.hs ? 1 : a.ord - b.ord))) {
    const ly = lyDoKhongNap(o, wco);
    if (ly.length) { nghi.push({ o, ly, quaCongKho: !!wco.view(o), anh: ANH[o.id] }); continue; }
    const kp = KHOI_PHUC[o.id] || null; const hs = kp ? kp.slice(0, 6) : o.hs; const ord = kp ? Number(kp.slice(7)) : o.ord;
    const a = ANH[o.id]; const { t, bo, dau } = boDauChan(o.text, ord);
    const ban = vi[o.line]; if (!ban || ban.id !== o.id) throw new Error(`${o.id}: bản dịch không khớp`);
    const ghiChu = [];
    if (kp) ghiChu.push(`Kho gán ${cham(o.hs)}/${o.ord} và cho là nghi; ảnh trang ${a[0]} in biển ${a[2]}, số ${a[3]} (hai cách đọc: OCR thứ hai và mắt).`);
    const ma = maTrenBien(a[2]); const nhieuMa = ma.length > 1;
    if (nhieuMa) ghiChu.push(`Bản in đặt ý kiến dưới biển nhiều mã "${a[2]}"; kho gán ${cham(hs)}.`);
    const namKho = o.adoption ?? null; const docMat = NAM_DOC_ANH[o.id];
    const nam = docMat ? docMat[0] : namKho;
    if (docMat) ghiChu.push(namKho ? `Năm thông qua: kho (OCR) ghi ${namKho}, ảnh trang ${docMat[1]} in ${docMat[0]}; nguyenVan giữ như kho.` : `Kho mất năm thông qua; ảnh trang ${docMat[1]} in ${docMat[0]}.`);
    if (a[4] && a[4].includes('+')) ghiChu.push(`Bản in ghi năm thông qua "${a[4]}"; kho chỉ giữ năm đầu.`);
    if (!bieu.has(`bieu:${hs}`)) ghiChu.push(`Mã ${cham(hs)} không còn trong biểu ${'2026.04.05'}.`);
    if (GHI_CHU_IN[o.id]) ghiChu.push(GHI_CHU_IN[o.id]);
    const co = ocrNghi(t);
    for (const [v, k, i] of a[6]) if (v - dau >= 0 && v - dau <= t.length) co.push({ luat: 'so-lech-anh', viTri: v - dau, chu: k, anh: i });
    co.sort((x, y) => x.viTri - y.viTri || (x.luat < y.luat ? -1 : 1));
    const dichNghi = /\[\?\]/.test(ban.vi) || ban.nghiOcr === true || !!ban.lechSo;
    const qt = cauQuyTac(t);
    nut.push({
      id: `wco:${hs}:${ord}`, loai: 'Y_KIEN_WCO', cha: null, so: `${cham(hs)}/${ord}`, nguyenVan: t.normalize('NFC'), lop: 'HUONG_DAN',
      nguon: { vanBan: 'WCO, Compendium of Classification Opinions (bản scan, OCR tiếng Anh)', ban: 'HS2022', trang: a[0], ...(a[1] !== a[0] ? { trangDen: a[1] } : {}), khoId: o.id },
      hieuLuc: { tu: null, den: null }, namThongQua: nam, ...(a[4] && a[4].includes('+') ? { cacNam: a[4] } : {}),
      ...(qt ? { quyTacNeu: qt } : {}),
      ocr: true, doTinCay: kp ? 'SUY_LUAN' : wco.doTinCay(o), ...(kp ? { khoiPhuc: true } : {}),
      anh: { bien: a[2], so: a[3], nam: a[4], tiLeTuKhop: a[5] },
      ...(nhieuMa && !/ to /.test(a[2]) ? { apChung: ma } : {}),
      ...(co.length ? { ocrNghi: co } : {}),
      ...(bo.length ? { boKhoiNguyenVan: bo } : {}),
      ...(THIEU[o.id] ? { thieu: THIEU[o.id] } : {}),
      dichKhongChinhThuc: ban.vi, ...(dichNghi ? { dichNghi: true } : {}),
      banQuyen: 'WCO; không thuộc CC BY-SA — BAN_QUYEN ở lib/wco-op.js, NOTICE.md',
      ...(ghiChu.length ? { ghiChu: ghiChu.join(' ') } : {}),
    });
  }
  nut.sort((x, y) => { const [a, b] = [x, y].map((z) => z.id.split(':')); return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[2] - b[2]; });
  return { nut, nghi, tong: kho.length };
}

const dem = (ds) => Object.fromEntries([...ds.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { nut, nghi, tong } = dung();
  if (process.argv.includes('--bang-nghi')) {
    console.log('| Id kho | Số in (kho) | Lý do không nạp | Ảnh: trang | Ảnh: biển mã in | Ảnh: số in | Mở đầu |\n|---|---:|---|---:|---|---:|---|');
    for (const { o, ly, anh } of nghi) console.log(`| ${o.id} | ${o.ordPrinted ?? '?'} | ${ly.join('; ')} | ${anh?.[0] ?? '?'} | ${anh?.[2] ?? '?'} | ${anh?.[3] ?? '?'} | ${o.text.slice(0, 36).replace(/[|\n]/g, ' ')} |`);
  } else if (process.argv.includes('--so-dem')) {
    console.log(JSON.stringify({ tong, nap: nut.length, khongNap: nghi.length, nghiCongKho: nghi.filter((x) => !x.quaCongKho).length, loaiBoiAnh: nghi.filter((x) => x.quaCongKho).map((x) => x.o.id),
      doTinCay: dem(nut.map((x) => x.doTinCay)), khoiPhuc: nut.filter((x) => x.khoiPhuc).length, coNam: nut.filter((x) => x.namThongQua).length, nhieuNam: nut.filter((x) => x.cacNam).length, quyTacNeu: nut.filter((x) => x.quyTacNeu).length,
      dichNghi: nut.filter((x) => x.dichNghi).length, coOcrNghi: nut.filter((x) => x.ocrNghi).length, theoLuat: dem(nut.flatMap((x) => (x.ocrNghi || []).map((c) => c.luat))), nutTheoLuat: dem(nut.flatMap((x) => [...new Set((x.ocrNghi || []).map((c) => c.luat))])),
      boKhoiNguyenVan: nut.filter((x) => x.boKhoiNguyenVan).length, bienNhieuMa: nut.filter((x) => / (?:to|or) |, /.test(x.anh.bien)).map((x) => `${x.id} ← ${x.anh.bien}`), ngoaiBieu: nut.filter((x) => /không còn trong biểu/.test(x.ghiChu || '')).map((x) => x.id), thieu: nut.filter((x) => x.thieu).map((x) => x.id) }, null, 1));
  } else {
    fs.writeFileSync(path.join(GOC, 'data/luat-goc/wco.jsonl'), nut.map((x) => JSON.stringify(x)).join('\n') + '\n');
    console.log(`wco.jsonl: ${nut.length} nút; không nạp ${nghi.length}; tổng ${tong}`);
  }
}
