#!/usr/bin/env node
// Máy KIỂM kết quả đợt lấy TÊN TIẾNG TRUNG cấp 6 số (docs/giao-viec/bieu-thue-tieng-trung.md, #336 mục 5).
//   node scripts/bieu-thue/kiem-zh.mjs [--dir=data/bieu-thue/zh] [--tax=data/tax.json]   (mã thoát 1 khi FAIL)
// Luật: tên lấy NGUYÊN VĂN từ văn bản chính thống (tên miền gov.cn), không dịch máy; mỗi dòng có nguon{url,sha256,layLuc}
// và sha256 nằm trong raw-index.json; mọi hs6 của tax.json phải được kể đến (có tên hoặc nằm trong thieu.jsonl).
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

export const TEN_MIEN_CHINH_THONG = /(^|\.)gov\.cn$/i; // customs.gov.cn, gov.cn, mof.gov.cn, tariffcommission.gov.cn…
const TRANG_THAI_NGUON = new Set(['OK', 'CHAN', 'LOI', 'BO_QUA']);
const CO_CHU_HAN = /[㐀-鿿]/;
const laIso = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s));
const docJsonl = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l, i) => { try { return JSON.parse(l); } catch { return { __loi: `dòng ${i + 1} không phải JSON` }; } }) : null;
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return null; } };

/** Kiểm một thư mục kết quả; trả { loi[], canhBao[], tomTat }. Thuần, không in. */
export function kiem(dir, { hs6 = null } = {}) {
  const loi = [], canhBao = [], tomTat = {};
  const bcPath = join(dir, 'bao-cao.json');
  if (!fs.existsSync(bcPath)) return { loi: ['thiếu bao-cao.json'], canhBao, tomTat };
  let bc; try { bc = JSON.parse(fs.readFileSync(bcPath, 'utf8')); } catch (e) { return { loi: [`bao-cao.json hỏng: ${e.message}`], canhBao, tomTat }; }
  for (const k of ['ngay', 'may', 'nguon', 'camKet']) if (bc[k] == null) loi.push(`bao-cao thiếu ${k}`);
  if (bc.camKet && bc.camKet.khongDichMay !== true) loi.push('bao-cao.camKet.khongDichMay phải là true (tên chép nguyên văn, không dịch máy/LLM)');
  if (bc.camKet && bc.camKet.khongLachAntiBot !== true) loi.push('bao-cao.camKet.khongLachAntiBot phải là true');
  for (const n of bc.nguon || []) {
    if (!TRANG_THAI_NGUON.has(n.trangThai)) loi.push(`nguồn ${n.ma}: trangThai phải ∈ OK/CHAN/LOI/BO_QUA`);
    if (!n.vanBan) loi.push(`nguồn ${n.ma}: thiếu vanBan (tên văn bản/ấn bản, vd 中华人民共和国进出口税则 2026)`);
    const h = hostOf(n.url);
    if (!h || !TEN_MIEN_CHINH_THONG.test(h)) loi.push(`nguồn ${n.ma}: url phải là tên miền chính thống gov.cn (nhận ${n.url})`);
  }
  const rawIdx = new Map();
  const riPath = join(dir, 'raw-index.json');
  if (fs.existsSync(riPath)) { try { for (const r of JSON.parse(fs.readFileSync(riPath, 'utf8')).tho || []) rawIdx.set(r.sha256, r); } catch (e) { loi.push(`raw-index.json hỏng: ${e.message}`); } }
  else loi.push('thiếu raw-index.json (danh mục bản thô: sha256, url, layLuc, bytes)');

  const rows = docJsonl(join(dir, 'hs6-zh.jsonl'));
  if (!rows) loi.push('thiếu hs6-zh.jsonl');
  const seen = new Set();
  let soDong = 0;
  for (const [i, r] of (rows || []).entries()) {
    const tag = `hs6-zh.jsonl dòng ${i + 1}`;
    if (r.__loi) { loi.push(`${tag}: ${r.__loi}`); continue; }
    soDong += 1;
    if (!/^\d{6}$/.test(String(r.hs6 || ''))) loi.push(`${tag}: hs6 phải là 6 chữ số`);
    else if (seen.has(r.hs6)) loi.push(`${tag}: hs6 ${r.hs6} lặp`); else seen.add(r.hs6);
    if (typeof r.tenZh !== 'string' || !r.tenZh.trim()) loi.push(`${tag}: thiếu tenZh`);
    else if (!CO_CHU_HAN.test(r.tenZh)) loi.push(`${tag}: tenZh không có chữ Hán (${r.tenZh.slice(0, 30)})`);
    if (r.capKhop !== 6) loi.push(`${tag}: capKhop phải là 6`);
    const n = r.nguon || {};
    const h = hostOf(n.url);
    if (!h || !TEN_MIEN_CHINH_THONG.test(h)) loi.push(`${tag}: nguon.url phải là tên miền gov.cn`);
    if (!laIso(n.layLuc)) loi.push(`${tag}: nguon.layLuc phải là ISO`);
    if (!n.sha256 || !rawIdx.has(n.sha256)) loi.push(`${tag}: nguon.sha256 không có trong raw-index.json`);
    if (n.viTri == null) canhBao.push(`${tag}: thiếu nguon.viTri (trang/dòng trong văn bản) — khó đối chiếu tay`);
  }
  const thieu = docJsonl(join(dir, 'thieu.jsonl')) || [];
  const thieuSet = new Set();
  for (const [i, t] of thieu.entries()) {
    if (t.__loi) { loi.push(`thieu.jsonl dòng ${i + 1}: ${t.__loi}`); continue; }
    if (!/^\d{6}$/.test(String(t.hs6 || ''))) loi.push(`thieu.jsonl dòng ${i + 1}: hs6 phải là 6 chữ số`);
    if (!t.lyDo) loi.push(`thieu.jsonl dòng ${i + 1}: thiếu lyDo`);
    if (seen.has(t.hs6)) loi.push(`thieu.jsonl dòng ${i + 1}: ${t.hs6} vừa có tên vừa báo thiếu`);
    thieuSet.add(t.hs6);
  }
  tomTat.soDong = soDong; tomTat.soThieu = thieuSet.size;
  if (hs6) {
    const chuaKe = hs6.filter((h) => !seen.has(h) && !thieuSet.has(h));
    tomTat.tongHs6 = hs6.length;
    tomTat.phu = `${hs6.filter((h) => seen.has(h)).length}/${hs6.length}`;
    if (chuaKe.length) loi.push(`${chuaKe.length} hs6 của tax.json chưa được kể đến (không có tên, không trong thieu.jsonl): ${chuaKe.slice(0, 5).join(', ')}…`);
    const laRa = [...seen].filter((h) => !hs6.includes(h)).length;
    if (laRa) canhBao.push(`${laRa} hs6 có tên nhưng không có trong tax.json (mã TQ riêng hoặc HS khác ấn bản) — vẫn giữ`);
  }
  return { loi, canhBao, tomTat };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = join(ROOT, arg('dir', 'data/bieu-thue/zh'));
  const taxPath = join(ROOT, arg('tax', 'data/tax.json'));
  const hs6 = fs.existsSync(taxPath) ? [...new Set(Object.keys(JSON.parse(fs.readFileSync(taxPath, 'utf8'))).map((k) => k.replace(/\D/g, '').slice(0, 6)))] : null;
  const r = kiem(dir, { hs6 });
  console.log(JSON.stringify(r.tomTat, null, 1));
  for (const c of r.canhBao.slice(0, 20)) console.log('CẢNH BÁO', c);
  if (r.canhBao.length > 20) console.log(`… ${r.canhBao.length - 20} cảnh báo nữa`);
  for (const l of r.loi.slice(0, 50)) console.log('LỖI', l);
  if (r.loi.length > 50) console.log(`… ${r.loi.length - 50} lỗi nữa`);
  console.log(r.loi.length ? `FAIL kiểm tên tiếng Trung (${r.loi.length} lỗi)` : 'PASS kiểm tên tiếng Trung');
  process.exit(r.loi.length ? 1 : 0);
}
