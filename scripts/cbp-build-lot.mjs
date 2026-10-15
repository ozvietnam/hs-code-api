#!/usr/bin/env node
// Bước 12 (B-3) — dựng lô intl-precedent từ ruling CBP CROSS đã lấy qua crawler tuân thủ (C-4).
// Bốc metadata từ TOÀN VĂN ruling: mã thuế (TARIFF NO), ngày, đoạn kết luận nguyên văn, RE: mô tả.
// Luật: mô tả cắt từ dòng "RE:" (không quá 500 ký tự); ketLuan = câu chứa mã thuế, NGUYÊN VĂN.
//snapshotHash = sha256(toàn văn). Viết: data/community/intl-precedents/cbp/<tệp>.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const RAW = process.argv[2] || '/tmp/cbp-raw.json'; // bản ruling CBP đã lấy qua crawler C-4 (mảng {id, text})
if (!existsSync(RAW)) { console.error('Thiếu tệp ruling thô:', RAW, '— chạy crawler (C-4) trước, hoặc truyền đường dẫn làm đối số.'); process.exit(2); }
const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const nz = (s) => String(s || '').replace(/\D/g, '');

const pick = (text) => {
  const tariff = text.match(/TARIFF NO\.*:?\s*([0-9.]+)/)?.[1] || '';
  const hs6 = nz(tariff).slice(0, 6);
  // ngày ký: dòng "Month D, YYYY" đầu tiên sau header
  const dateStr = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}/)?.[0] || '';
  const months = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06', July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' };
  const dm = dateStr.match(/(\w+)\s+(\d{1,2}),\s*(\d{4})/);
  const issuedDate = dm ? `${dm[3]}-${months[dm[1]]}-${String(dm[2]).padStart(2, '0')}` : null;
  // RE: dòng mô tả hàng
  const reLine = text.match(/RE:\s*([\s\S]{5,300}?)(?:\r|\n)/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const description = reLine.slice(0, 500);
  // câu kết luận chứa mã (dotted hoặc liền) — nguyên văn
  const dotted6 = hs6 ? `${hs6.slice(0, 4)}.${hs6.slice(4)}` : '';
  const sentences = text.replace(/\r/g, '').split(/(?<=[.!?])\s+/);
  const ket = sentences.filter((x) => x.includes(tariff) || (dotted6 && x.includes(dotted6)) || /holds? that|is classifiable/i.test(x)).slice(-2).join(' ').replace(/\s+/g, ' ').trim().slice(0, 700);
  return { hs6, issuedDate, description, ketLuan: ket, tariff };
};

const records = [];
for (const r of raw) {
  const p = pick(r.text);
  if (!p.hs6 || !p.description || !p.ketLuan) { console.error('bỏ (thiếu trường):', r.id, JSON.stringify(p).slice(0, 120)); continue; }
  records.push({
    hsCode: p.hs6,
    description: `CBP CROSS ${r.id}: ${p.description}`,
    source: {
      type: 'CBP-CROSS-RULING',
      reference: r.id,
      url: `https://rulings.cbp.gov/ruling/${r.id}`,
      issuedDate: p.issuedDate,
      license: 'public-domain-us-gov',
    },
    attributes: { instrumentType: 'RULING', country: 'US' },
    reasonVi: p.ketLuan,
    evidence: { soHieu: r.id, ketLuan: p.ketLuan },
    snapshotHash: createHash('sha256').update(r.text).digest('hex'),
    retrievedAt: '2026-10-15',
    verbatimText: r.text.slice(0, 8000),
  });
}

const doc = {
  kind: 'intl-precedent',
  contributor: { name: 'zcode-cbp-crawler', github: 'ozvietnam' },
  license: 'CC-BY-SA-4.0',
  submittedAt: '2026-10-15T00:00:00Z',
  note: 'Lô thử B-3 (bước 12): 10 ruling CBP CROSS đầu tiên lấy qua crawler tuân thủ (robots + 1,2 QPS, lib/crawl-compliance.js). Toàn văn CBP là tác phẩm chính phủ Hoa Kỳ — public domain (17 U.S.C. §105).',
  records,
};
mkdirSync(join(import.meta.dirname, '..', 'data', 'community', 'intl-precedents', 'cbp'), { recursive: true });
const out = join(import.meta.dirname, '..', 'data', 'community', 'intl-precedents', 'cbp', 'cbp-cross-2026-10-15-lot-thu.json');
writeFileSync(out, JSON.stringify(doc, null, 1) + '\n');
console.log('ghi', out, '| bản ghi:', records.length, '| mã:', records.map((x) => x.hsCode).join(','));
