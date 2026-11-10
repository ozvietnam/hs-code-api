#!/usr/bin/env node
/**
 * scripts/cong-anh-em.mjs — Cổng anh em kiểm tra "Tên khác" (hs-code-api#1180):
 *   1. Mọi cụm tên khác của nhóm phải có `nguon: { tap, trich }` nguyên văn không rỗng.
 *   2. Tên khác của một dòng KHÔNG được khớp tên (`headPhrases`) hay điều kiện (`dieuKienSo`)
 *      của dòng anh em cùng phân nhóm 6 số.
 *   3. Tên khác KHÔNG được nằm trong phần loại trừ (`loaiTru`) của chú giải nhóm / phân nhóm.
 *
 * Chạy:
 *   node scripts/cong-anh-em.mjs --nhom=8539
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const T = require('../lib/hs-tree.js');
const DK = require('../lib/dieu-kien-so.js');
const { loadSoTay, headPhrases } = require('../lib/so-tay-gates.js');
const { dataReadPath } = require('../lib/data-paths.js');

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const cleanText = (s) => String(s || '').replace(/^[-\s–]+/, '').replace(/\s*[:：]\s*$/, '').trim();
const escRe = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRegex = (s) => {
  const t = cleanText(s);
  if (!t) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])${escRe(t)}(?![\\p{L}\\p{N}])`, 'iu');
};

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

/** Đọc danh sách mục tên khác của nhóm 4 số từ data/tu-vung/. */
export function docTenKhacNhom(nhom4) {
  const n4 = nz(nhom4).slice(0, 4);
  const out = [];
  const seen = new Set();
  const pushItem = (it) => {
    if (!it || typeof it !== 'object') return;
    const hs = nz(it.ma || it.hs || it.hs8 || it.pn6);
    if (!hs.startsWith(n4)) return;
    const key = `${hs}|${it.giaTri || ''}|${it.loai || 'DONG_NGHIA'}|${JSON.stringify(it.cachDoc || {})}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...it, hs });
  };

  try {
    const tv2Path = dataReadPath('tu-vung', 'tu-vung@2.json');
    if (fs.existsSync(tv2Path)) {
      const tv2 = JSON.parse(fs.readFileSync(tv2Path, 'utf8'));
      const tk = tv2.tenKhac || {};
      if (Array.isArray(tk[n4])) tk[n4].forEach(pushItem);
      for (const [k, v] of Object.entries(tk)) {
        if (nz(k).startsWith(n4) && Array.isArray(v)) {
          v.forEach((it) => pushItem({ ma: nz(k), ...it }));
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const tkPath = dataReadPath('tu-vung', `ten-khac-${n4}.json`);
    if (fs.existsSync(tkPath)) {
      const raw = JSON.parse(fs.readFileSync(tkPath, 'utf8'));
      const list = Array.isArray(raw.muc) ? raw.muc : Array.isArray(raw) ? raw : [];
      list.forEach(pushItem);
    }
  } catch { /* ignore */ }

  return out;
}

/** Đọc dieuKienSo cho các dòng 8 số trong phân nhóm 6 số (ưu tiên ranh giới DUYET, lùi về so-tay). */
function docDieuKienPhanNhom(pn6) {
  const nhom4 = pn6.slice(0, 4);
  const map = new Map();
  const st = loadSoTay(nhom4);
  for (const d of st?.dong8 || []) {
    const h = nz(d.hs);
    if (h.startsWith(pn6) && Array.isArray(d.dieuKienSo) && d.dieuKienSo.length) {
      map.set(h, d.dieuKienSo);
    }
  }
  try {
    const rgPath = dataReadPath('ho-so', 'ranh-gioi', `${pn6}.json`);
    if (fs.existsSync(rgPath)) {
      const rg = JSON.parse(fs.readFileSync(rgPath, 'utf8'));
      if (rg?.trangThai === 'DUYET') {
        for (const [h, obj] of Object.entries(rg.dong || {})) {
          if (Array.isArray(obj?.dieuKienSo)) map.set(nz(h), obj.dieuKienSo);
        }
      }
    }
  } catch { /* ignore */ }
  return map;
}

/** Kiểm cổng anh em cho một nhóm 4 số (hoặc một danh sách mục tên khác truyền vào để test). */
export function kiemCongAnhEm(nhom4, mucOverride = null) {
  const n4 = nz(nhom4).slice(0, 4);
  const dsMuc = mucOverride || docTenKhacNhom(n4);
  const st = loadSoTay(n4);
  const viPham = [];
  let tongCum = 0;

  // Tập loại trừ cấp nhóm
  const loaiTruNhom = [...(st?.loaiTru || [])];

  for (const muc of dsMuc) {
    const hs = nz(muc.hs || muc.ma);
    const pn6 = hs.slice(0, 6);
    const loai = muc.loai || 'DONG_NGHIA';
    const cd = muc.cachDoc || {};
    const phrases = [
      ...(cd.vi || []),
      ...(cd.en || []),
      ...(cd.zh || []),
      ...(Array.isArray(muc.cum) ? muc.cum : []),
    ].filter((s) => typeof s === 'string' && s.trim());

    // 1. Kiểm nguồn nguyên văn
    const tap = String(muc.nguon?.tap || '').trim();
    const trich = String(muc.nguon?.trich || '').trim();
    if (!tap || !trich || /chưa có nguồn/i.test(tap) || /chưa có nguồn/i.test(trich)) {
      viPham.push({
        maLoi: 'thieu-nguon-nguyen-van',
        hs,
        cum: phrases.join(', '),
        chiTiet: `Mục tên khác của ${hs} thiếu nguồn nguyên văn (tap="${tap}", trich="${trich}")`,
      });
    }

    const dkMap = docDieuKienPhanNhom(pn6);
    const selfDk = dkMap.get(hs) || [];
    const selfJsonSet = new Set(selfDk.map((c) => JSON.stringify(c)));

    const selfNode = T.nodeOf(hs);
    const toPhraseStr = (p) => (Array.isArray(p) ? p.join(' ') : String(p || ''));
    const selfHeads = new Set(headPhrases(cleanText(selfNode?.tenVi || '')).map((p) => toPhraseStr(p).toLowerCase()));

    // Dòng 8 số anh em trong cùng phân nhóm 6 số
    const leavesUnder = (id) => {
      const n = T.nodeOf(id);
      if (!n) return [];
      if (!Array.isArray(n.children) || !n.children.length) return [nz(n.id)];
      return n.children.flatMap(leavesUnder);
    };
    const allLeaves6 = leavesUnder(pn6).filter((id) => id.length === 8);
    const siblings = hs.length === 8 ? allLeaves6.filter((id) => id !== hs) : [];

    // Loại trừ cấp nhóm + phân nhóm
    const loaiTruAll = [
      ...loaiTruNhom,
      ...(st?.phanNhom?.[pn6]?.loaiTru || []),
    ];

    for (const p of phrases) {
      tongCum += 1;
      const pClean = p.trim();

      // 2. Kiểm không nằm trong phần loại trừ của chú giải
      for (const lt of loaiTruAll) {
        const vat = cleanText(lt?.dieuKien || lt?.vat || '');
        if (!vat) continue;
        const reVat = phraseRegex(vat);
        const vatHeads = headPhrases(vat).map(toPhraseStr);
        const khopVat =
          (reVat && reVat.test(pClean)) ||
          vatHeads.some((vh) => vh.length >= 6 && phraseRegex(vh)?.test(pClean));
        if (khopVat) {
          viPham.push({
            maLoi: 'nam-trong-loai-tru',
            hs,
            cum: pClean,
            chiTiet: `Cụm "${pClean}" (${hs}) khớp mục loại trừ "${vat}" (→ ${lt.sangNhom || lt.hsChuyen || '?'})`,
          });
        }
      }

      // Mục TRAI_NGHIA là cụm phản nghĩa để chặn chốt nhầm vào hs, không phải tên đồng nghĩa của hs
      if (loai === 'TRAI_NGHIA') continue;

      // 3. Kiểm không khớp tên hoặc điều kiện của dòng anh em cùng phân nhóm 6 số
      for (const sib8 of siblings) {
        const sibNode = T.nodeOf(sib8);
        const sibTen = cleanText(sibNode?.tenVi || '');
        if (sibNode && !sibNode.loaiKhac && sibTen) {
          const sibHeads = headPhrases(sibTen).map(toPhraseStr);
          for (const sh of sibHeads) {
            if (selfHeads.has(sh.toLowerCase())) continue;
            const reSh = phraseRegex(sh);
            if (reSh && reSh.test(pClean)) {
              viPham.push({
                maLoi: 'khop-ten-anh-em',
                hs,
                anhEm: sib8,
                cum: pClean,
                chiTiet: `Cụm "${pClean}" (${hs}) khớp cụm tên "${sh}" của dòng anh em ${sib8} ("${sibTen}")`,
              });
            }
          }
        }

        const sibDk = dkMap.get(sib8) || [];
        const sibDistinctDk = sibDk.filter((c) => !selfJsonSet.has(JSON.stringify(c)));
        if (sibDistinctDk.length > 0) {
          try {
            const dg = DK.danhGiaDieuKien(sibDistinctDk, pClean);
            const coThoa = (dg.chiTiet || []).some((x) => x.ketQua === 'THOA');
            if (dg.ketQua === 'THOA' || coThoa) {
              viPham.push({
                maLoi: 'khop-dieu-kien-anh-em',
                hs,
                anhEm: sib8,
                cum: pClean,
                chiTiet: `Cụm "${pClean}" (${hs}) làm thoả điều kiện phân biệt của dòng anh em ${sib8}`,
              });
            }
          } catch { /* ignore */ }
        }
      }
    }
  }

  return {
    nhom4: n4,
    soMuc: dsMuc.length,
    tongCum,
    dat: viPham.length === 0,
    viPham,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const nhom = String(argv.nhom || '8539').trim();
  const kq = kiemCongAnhEm(nhom);
  console.log(`\n=== CỔNG ANH EM (nhóm ${kq.nhom4}) ===`);
  console.log(`Số mục tên khác: ${kq.soMuc} | Tổng số cụm kiểm tra: ${kq.tongCum} | Vi phạm: ${kq.viPham.length}`);
  if (kq.viPham.length > 0) {
    for (const v of kq.viPham) {
      console.log(`  [VI PHẠM - ${v.maLoi}] ${v.chiTiet}`);
    }
    process.exit(1);
  } else {
    console.log(`  [ĐẠT] 0 vi phạm: mọi cụm tên khác của nhóm ${kq.nhom4} đều có nguồn nguyên văn, không khớp tên/điều kiện dòng anh em và không nằm trong loại trừ.`);
  }
}
