#!/usr/bin/env node
/**
 * scripts/bao-cao-mau-thuan-dong-nghia.mjs — G1-2: liệt kê MỌI cụm từ đồng nghĩa trong chỉ mục C1
 * (lib/do-thi/) trỏ từ 2 nhóm 4 số trở lên, hoặc trỏ từ 2 phân nhóm 6 số khác nhau trong cùng nhóm 4 số,
 * đối chiếu lượng tờ khai mẫu (data/oz-gold-final.jsonl) và thông báo phân loại (data/precedents.json),
 * xếp theo tổng số dòng tờ khai ở các đích và ghi ra docs/do-thi/mau-thuan-dong-nghia.md.
 *
 * Tất định, không gọi AI, không gọi mạng, không dấu thời gian.
 *
 * Dùng:
 *   node scripts/bao-cao-mau-thuan-dong-nghia.mjs          # in tóm tắt JSON (không ghi tệp)
 *   node scripts/bao-cao-mau-thuan-dong-nghia.mjs --ghi    # ghi docs/do-thi/mau-thuan-dong-nghia.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CAU_LENH_DUNG = 'node scripts/bao-cao-mau-thuan-dong-nghia.mjs --ghi';
const TEP_BAO_CAO = 'docs/do-thi/mau-thuan-dong-nghia.md';

const { bangCanh, timCum, coNut } = require('../lib/do-thi/index.js');
const { khongDau } = require('../lib/do-thi/tu-khoa.js');
const { dataReadPath } = require('../lib/data-paths.js');

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const coChuHan = (s) => /\p{Script=Han}/u.test(s);
const khopCumTrongCau = (cauDaChuanHoaCoKhoangCach, khoa) => {
  if (!khoa) return false;
  if (coChuHan(khoa)) return cauDaChuanHoaCoKhoangCach.includes(khoa);
  return cauDaChuanHoaCoKhoangCach.includes(` ${khoa} `);
};

const sapKho = (ds) => [...ds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/**
 * Phân loại bằng luật, không phán xử (trả mã nhóm `'a'|'b'|'c'|'d'` + nhãn tiếng Việt).
 *   (a) đúng 1 đích có cả tờ khai (>0) lẫn thông báo (>0), mọi đích còn lại không có gì (tk=0, tb=0)
 *       -> nghi đích sai ở kho X (liệt kê các kho của đích không có gì)
 *   (b) từ 2 đích trở lên đều có tờ khai (>0)
 *       -> cụm mơ hồ thật, cần dữ kiện phân biệt
 *   (c) không đích nào có tờ khai (tk=0 ở mọi đích)
 *       -> chưa có căn cứ
 *   (d) phần dư: đúng 1 đích có tờ khai (>0), nhưng chưa thoả (a) (chưa có thông báo ủng hộ,
 *       hoặc đích khác có thông báo ủng hộ) — ghi rõ để không phán xử vượt dữ kiện.
 */
export function phanLoaiCum(dich) {
  const coTk = dich.filter((d) => d.soToKhai > 0);
  if (coTk.length >= 2) {
    return { maLoai: 'b', nhan: 'cụm mơ hồ thật, cần dữ kiện phân biệt' };
  }
  if (coTk.length === 0) {
    return { maLoai: 'c', nhan: 'chưa có căn cứ' };
  }
  const dung = coTk[0];
  const khac = dich.filter((d) => d.ma !== dung.ma);
  if (dung.soThongBao > 0 && khac.every((d) => d.soToKhai === 0 && d.soThongBao === 0)) {
    const khoNghi = sapKho(new Set(khac.flatMap((d) => d.nguonKho)));
    return { maLoai: 'a', nhan: `nghi đích sai ở kho ${khoNghi.join(', ')}` };
  }
  const khacCoTb = khac.filter((d) => d.soThongBao > 0);
  if (khacCoTb.length > 0) {
    const chiTiet = khacCoTb.map((d) => `${d.ma} (${d.soThongBao} TB)`).join(', ');
    return {
      maLoai: 'd',
      nhan: `chưa đủ căn cứ (chỉ ${dung.ma} có ${dung.soToKhai} TK, 0 TB; ${chiTiet} có TB)`,
    };
  }
  return {
    maLoai: 'd',
    nhan: `chưa đủ căn cứ (chỉ ${dung.ma} có ${dung.soToKhai} TK, chưa có TB phân loại xác nhận)`,
  };
}

function docToKhaiOz() {
  const dong = fs.readFileSync(dataReadPath('oz-gold-final.jsonl'), 'utf8').split('\n');
  const kq = [];
  for (const s of dong) {
    if (!s.trim()) continue;
    let g;
    try { g = JSON.parse(s); } catch { continue; }
    const hs = so(g.hsCode);
    const tenNorm = khongDau(g.tenHang || '');
    if (!tenNorm) continue;
    kq.push({ hs, tenDem: ` ${tenNorm} ` });
  }
  return kq;
}

function docThongBaoPhanLoai() {
  const raw = JSON.parse(fs.readFileSync(dataReadPath('precedents.json'), 'utf8'));
  const kq = [];
  for (const [khoa, ds] of Object.entries(raw)) {
    if (!Array.isArray(ds)) continue;
    for (const p of ds) {
      if (!p || typeof p !== 'object') continue;
      const loaiNguon = (typeof p.sourceType === 'string' && p.sourceType.trim())
        || (p.source && typeof p.source.type === 'string' && p.source.type.trim())
        || 'TB-TCHQ';
      if (loaiNguon !== 'TB-TCHQ') continue;
      const hs = so(p.outcome || p.hsCode || khoa);
      if (hs.length < 4) continue;
      const ten = p.productName || p.description || '';
      const tenNorm = khongDau(ten);
      if (!tenNorm) continue;
      kq.push({ hs, tenDem: ` ${tenNorm} ` });
    }
  }
  return kq;
}

function demTheoKhoa(dsBanGhi) {
  const chiMuc = new Map();
  for (let i = 0; i < dsBanGhi.length; i += 1) {
    const tokens = dsBanGhi[i].tenDem.trim().split(' ').filter(Boolean);
    const thayTrongDong = new Set();
    for (const w of tokens) {
      if (thayTrongDong.has(w)) continue;
      thayTrongDong.add(w);
      let lst = chiMuc.get(w);
      if (!lst) { lst = []; chiMuc.set(w, lst); }
      lst.push(i);
    }
  }
  return chiMuc;
}

function timBanGhiKhop(khoa, dsBanGhi, chiMucTu) {
  if (!khoa) return [];
  if (coChuHan(khoa)) {
    const ra = [];
    for (let i = 0; i < dsBanGhi.length; i += 1) {
      if (dsBanGhi[i].tenDem.includes(khoa)) ra.push(dsBanGhi[i]);
    }
    return ra;
  }
  const tu = khoa.split(' ').filter(Boolean);
  if (!tu.length) return [];
  let ung = null;
  for (const w of tu) {
    const lst = chiMucTu.get(w);
    if (!lst || !lst.length) return [];
    if (!ung || lst.length < ung.length) ung = lst;
  }
  if (tu.length === 1) return ung.map((i) => dsBanGhi[i]);
  const ra = [];
  for (const i of ung) {
    if (khopCumTrongCau(dsBanGhi[i].tenDem, khoa)) ra.push(dsBanGhi[i]);
  }
  return ra;
}

function xepHangCum(ds) {
  return [...ds].sort((a, b) =>
    b.tongToKhaiDich - a.tongToKhaiDich
    || b.tongThongBaoDich - a.tongThongBaoDich
    || b.tongToKhaiTenHang - a.tongToKhaiTenHang
    || (a.khoa < b.khoa ? -1 : a.khoa > b.khoa ? 1 : 0));
}

function thongKeLoai(ds) {
  const dem = { a: 0, b: 0, c: 0, d: 0 };
  const phamVi = { lechHanLienKho: 0, giaoMotPhanLienKho: 0, noiBoMotKho: 0 };
  let tongToKhaiDich = 0;
  for (const x of ds) {
    dem[x.phanLoai.maLoai] += 1;
    tongToKhaiDich += x.tongToKhaiDich;
    if (x.phamViKho === 'lech-han-lien-kho') phamVi.lechHanLienKho += 1;
    else if (x.phamViKho === 'giao-mot-phan-lien-kho') phamVi.giaoMotPhanLienKho += 1;
    else phamVi.noiBoMotKho += 1;
  }
  return { tongCum: ds.length, theoLoai: dem, theoPhamViKho: phamVi, tongToKhaiDich };
}

export function taoBaoCao() {
  const b = bangCanh();
  const toKhaiOz = docToKhaiOz();
  const thongBao = docThongBaoPhanLoai();
  const chiMucOz = demTheoKhoa(toKhaiOz);
  const chiMucTb = demTheoKhoa(thongBao);

  const mauThuanHanSet = new Set(b.c1.mauThuan.map((m) => m.khoa));
  const khacNhom4 = [];
  const khacPn6CungNhom = [];

  for (const [khoa, muc] of b.c1.cum) {
    const tra = timCum(muc.cum) || muc;
    const theoNhom4 = new Map();
    const theoPn6 = new Map();
    const tatCaKho = new Set();

    for (const d of tra.dich) {
      if (!coNut(d.ma)) {
        throw new Error(`Mã đích không tồn tại trong biểu thuế hiện hành: ${d.ma} (cụm "${tra.cum}")`);
      }
      tatCaKho.add(d.nguonKho);
      const h4 = d.ma.slice(0, 4);
      if (!theoNhom4.has(h4)) theoNhom4.set(h4, new Set());
      theoNhom4.get(h4).add(d.nguonKho);
      if (d.ma.length >= 6) {
        const p6 = d.ma.slice(0, 6);
        if (!theoPn6.has(p6)) theoPn6.set(p6, new Set());
        theoPn6.get(p6).add(d.nguonKho);
      }
    }

    const laKhacNhom4 = theoNhom4.size >= 2;
    const laKhacPn6CungNhom = !laKhacNhom4 && theoPn6.size >= 2;
    if (!laKhacNhom4 && !laKhacPn6CungNhom) continue;

    const ozKhop = timBanGhiKhop(khoa, toKhaiOz, chiMucOz);
    const tbKhop = timBanGhiKhop(khoa, thongBao, chiMucTb);

    const banDoDich = laKhacNhom4 ? theoNhom4 : theoPn6;
    const dich = [...banDoDich.keys()].sort().map((ma) => {
      if (!coNut(ma)) {
        throw new Error(`Đích rút gọn không tồn tại trong biểu thuế hiện hành: ${ma} (cụm "${tra.cum}")`);
      }
      const tk = ozKhop.filter((r) => r.hs.startsWith(ma)).length;
      const tb = tbKhop.filter((r) => r.hs.startsWith(ma)).length;
      return { ma, nguonKho: sapKho(banDoDich.get(ma)), soToKhai: tk, soThongBao: tb };
    });

    const lienKho = tatCaKho.size >= 2;
    let phamViKho;
    if (!lienKho) phamViKho = 'noi-bo-mot-kho';
    else if (laKhacNhom4 && mauThuanHanSet.has(khoa)) phamViKho = 'lech-han-lien-kho';
    else phamViKho = 'giao-mot-phan-lien-kho';

    const banGhi = {
      khoa,
      cum: tra.cum,
      soDich: dich.length,
      lienKho,
      phamViKho,
      khoNguon: sapKho(tatCaKho),
      dich,
      tongToKhaiDich: dich.reduce((s, x) => s + x.soToKhai, 0),
      tongToKhaiTenHang: ozKhop.length,
      tongThongBaoDich: dich.reduce((s, x) => s + x.soThongBao, 0),
      tongThongBaoTenHang: tbKhop.length,
      phanLoai: phanLoaiCum(dich),
    };

    if (laKhacNhom4) khacNhom4.push(banGhi);
    else khacPn6CungNhom.push(banGhi);
  }

  const xepN4 = xepHangCum(khacNhom4);
  const xepP6 = xepHangCum(khacPn6CungNhom);

  return {
    tongQuan: {
      tongCumC1: b.c1.cum.length,
      soDichC1: b.thongKe.c1.soDich,
      soKhoC1: Object.keys(b.thongKe.c1.cumTheoKho).length,
      tongToKhaiOz: toKhaiOz.length,
      tongThongBaoVN: thongBao.length,
      cumMauThuanHanC1: b.c1.mauThuan.length,
      khacNhom4: thongKeLoai(xepN4),
      khacPn6CungNhom: thongKeLoai(xepP6),
    },
    khacNhom4: xepN4,
    khacPn6CungNhom: xepP6,
  };
}

const escMd = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
const nhanPhamVi = (p) => (p === 'lech-han-lien-kho' ? 'Lệch hẳn liên kho' : p === 'giao-mot-phan-lien-kho' ? 'Liên kho (có giao nhóm)' : 'Nội bộ 1 kho');

function dinhDangDich(dich) {
  return dich.map((d) => `\`${d.ma}\` (${d.nguonKho.join(', ')}): **${d.soToKhai}** TK / **${d.soThongBao}** TB`).join('<br>');
}

function dinhDangBang(ds, batDauStt = 1) {
  const lines = [
    '| # | Cụm | Phạm vi kho | Tổng TK (đích / toàn kho) | Tổng TB (đích) | Các đích · kho nguồn · tờ khai (TK) / thông báo (TB) | Phân loại |',
    '|---:|---|---|---:|---:|---|---|',
  ];
  ds.forEach((x, idx) => {
    const tkCol = x.tongToKhaiTenHang !== x.tongToKhaiDich
      ? `${x.tongToKhaiDich} / ${x.tongToKhaiTenHang}`
      : `${x.tongToKhaiDich}`;
    lines.push(
      `| ${batDauStt + idx} | \`${escMd(x.cum)}\` | ${nhanPhamVi(x.phamViKho)} | ${tkCol} | ${x.tongThongBaoDich} | ${dinhDangDich(x.dich)} | (${x.phanLoai.maLoai}) ${escMd(x.phanLoai.nhan)} |`,
    );
  });
  return lines.join('\n');
}

export function dinhDangMarkdown(baoCao) {
  const tq = baoCao.tongQuan;
  const n4 = tq.khacNhom4;
  const p6 = tq.khacPn6CungNhom;
  const lienKhoN4 = baoCao.khacNhom4.filter((x) => x.lienKho);
  const lechHanN4 = baoCao.khacNhom4.filter((x) => x.phamViKho === 'lech-han-lien-kho');

  return [
    '# Danh sách mâu thuẫn chỉ mục đồng nghĩa C1, xếp theo lượng hàng',
    '',
    `> Tệp sinh tự động, tất định — không chỉnh tay. Lệnh dựng lại: \`${CAU_LENH_DUNG}\``,
    '',
    '## Quy ước đọc & luật phân loại',
    '',
    '- **Nguồn chỉ mục C1:** đọc từ `lib/do-thi/index.js` (`bangCanh()`, `timCum()`), gộp 8 nguồn trong `KHO_C1` (6 kho ánh xạ mã trực tiếp + 2 kho cụm → cụm giải qua 6 kho trên); mọi đích kiểm tồn tại trong biểu thuế hiện hành bằng `coNut()`.',
    `- **Đối chiếu tờ khai OZ:** ${tq.tongToKhaiOz} dòng từ \`data/oz-gold-final.jsonl\`, khớp nguyên cụm (không dấu, biên từ; chữ Hán khớp chuỗi con) trên \`tenHang\` và đếm số dòng có \`hsCode\` thuộc từng đích. Cột \`Tổng TK (đích / toàn kho)\` ghi số dòng ở các đích mâu thuẫn (dùng để xếp hạng) và tổng dòng chứa cụm đó trong toàn bộ \`oz-gold-final.jsonl\` (khi khác nhau).`,
    `- **Đối chiếu thông báo phân loại:** ${tq.tongThongBaoVN} thông báo \`TB-TCHQ\` từ \`data/precedents.json\`, khớp nguyên cụm trên \`productName\`/\`description\` và đếm số thông báo có mã kết quả thuộc từng đích.`,
    '- **Luật phân loại (không phán xử):**',
    '  - **(a)** Đúng 1 đích có `TK > 0` và `TB > 0`, mọi đích còn lại `TK = 0` và `TB = 0` → `nghi đích sai ở kho X`.',
    '  - **(b)** Từ 2 đích trở lên đều có `TK > 0` → `cụm mơ hồ thật, cần dữ kiện phân biệt`.',
    '  - **(c)** Không đích nào có `TK > 0` (`Tổng TK đích = 0`) → `chưa có căn cứ`.',
    '  - **(d)** Đúng 1 đích có `TK > 0`, nhưng chưa thoả `(a)` (đích đó chưa có thông báo xác nhận, hoặc đích khác có thông báo) → ghi riêng là `chưa đủ căn cứ` để tránh phán xử chỉ dựa vào tờ khai.',
    '',
    '## Tổng hợp số liệu',
    '',
    `- **Tổng chỉ mục C1:** **${tq.tongCumC1}** cụm · **${tq.soDichC1}** ánh xạ đích · **${tq.soKhoC1}** kho trong \`KHO_C1\`.`,
    '',
    '| Hạng mục | Tổng cụm | (a) Nghi đích sai | (b) Mơ hồ thật | (c) Chưa có căn cứ | (d) Một đích có TK, thiếu TB | Lệch hẳn liên kho | Liên kho có giao | Nội bộ 1 kho |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    `| **Loại 1: Trỏ ≥ 2 nhóm 4 số** | **${n4.tongCum}** | ${n4.theoLoai.a} | ${n4.theoLoai.b} | ${n4.theoLoai.c} | ${n4.theoLoai.d} | ${n4.theoPhamViKho.lechHanLienKho} | ${n4.theoPhamViKho.giaoMotPhanLienKho} | ${n4.theoPhamViKho.noiBoMotKho} |`,
    `| **Loại 2: Cùng 1 nhóm 4 số, ≥ 2 phân nhóm 6 số** | **${p6.tongCum}** | ${p6.theoLoai.a} | ${p6.theoLoai.b} | ${p6.theoLoai.c} | ${p6.theoLoai.d} | ${p6.theoPhamViKho.lechHanLienKho} | ${p6.theoPhamViKho.giaoMotPhanLienKho} | ${p6.theoPhamViKho.noiBoMotKho} |`,
    '',
    '## Top 20 cụm trỏ ≥ 2 nhóm 4 số theo lượng hàng (tờ khai OZ)',
    '',
    dinhDangBang(baoCao.khacNhom4.slice(0, 20)),
    '',
    `## Các cụm mâu thuẫn liên kho ở mức 4 số (${lienKhoN4.length} cụm, gồm ${lechHanN4.length} cụm lệch hẳn trong \`c1.mauThuan\`)`,
    '',
    dinhDangBang(lienKhoN4),
    '',
    `## Toàn bộ ${baoCao.khacNhom4.length} cụm trỏ từ 2 nhóm 4 số trở lên`,
    '',
    dinhDangBang(baoCao.khacNhom4),
    '',
    `## Ghi riêng: Toàn bộ ${baoCao.khacPn6CungNhom.length} cụm cùng 1 nhóm 4 số nhưng trỏ từ 2 phân nhóm 6 số khác nhau`,
    '',
    dinhDangBang(baoCao.khacPn6CungNhom),
    '',
  ].join('\n');
}

const laChinh = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (laChinh) {
  const ghi = process.argv.includes('--ghi');
  const bc = taoBaoCao();
  if (ghi) {
    const outAbs = path.join(GOC, TEP_BAO_CAO);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, dinhDangMarkdown(bc), 'utf8');
    console.log(`Đã ghi ${TEP_BAO_CAO}`);
  }
  console.log(JSON.stringify(bc.tongQuan, null, 2));
}
