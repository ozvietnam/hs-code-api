#!/usr/bin/env node
/**
 * scripts/luat-goc/gir-trich.mjs — Trích xuất tất định Sáu quy tắc tổng quát (gir:1..gir:6 và :ct:<n>)
 * từ LUAT_GOC_TXT/gir.txt (cột tiếng Việt Phụ lục II Thông tư 31/2022/TT-BTC, Công báo 557+558).
 * Xuất data/luat-goc/gir.jsonl chuẩn khuôn nut-luat@1. KHÔNG dùng AI, KHÔNG đọc lib/gir.js.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MAC_DINH_RA = path.join(GOC, 'data/luat-goc/gir.jsonl');
export const VAN_BAN_NGUON =
  'Thông tư số 31/2022/TT-BTC ngày 08/06/2022 của Bộ trưởng Bộ Tài chính (Phụ lục II, Công báo số 557 + 558 ngày 08/07/2022)';
export const HIEU_LUC = { tu: '2022-12-30', den: null }; // TT 31/2022 Điều 4 ghi 01/12/2022; TT 72/2022 ngưng 01–29/12/2022

export const SUA_TAY = {
  nguonPdf: {
    urlTrang: 'https://congbao.chinhphu.vn/van-ban/thong-tu-so-31-2022-tt-btc-37431/41056.htm',
    urlPdfCuoi: 'https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2022/6/37431/41056-1-2022557-55831-2022-tt-btc.pdf',
    trangCongBao: [50, 76],
    lyDo: 'Tệp gốc Công báo in song ngữ 2 cột đổi bên chẵn/lẻ (trang 49..75 PDF = Công báo tr.50..76); gir.txt chỉ trích nguyên văn cột tiếng Việt và bỏ số trang + dòng dọc CÔNG BÁO.',
  },
  ghiChuBanIn: [
    {
      id: 'gir:3:ct:2',
      trang: 61,
      ghiChu: "Bản in Công báo 557+558 tr.61 ghi lần lượt 'Chú giải 4(B) Chương 97' và 'Chú giải 5 (B) Chương 97' (HS 2022 đổi số thành Chú giải 5(B)); giữ nguyên văn bản in.",
    },
  ],
};

const ROMAN_VAL = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13,
};

function lamSachDong(vanBan) {
  const trangList = String(vanBan).normalize('NFC').replace(/\r\n/g, '\n').split('\f');
  const dong = [];
  for (let i = 0; i < trangList.length; i++) {
    const trang = 50 + i; // trang 0 của gir.txt tương ứng trang 50 Công báo số 557+558
    for (const raw of trangList[i].split('\n')) {
      const text = raw.trim();
      if (!text) continue;
      dong.push({ trang, text });
    }
  }
  return dong;
}

function flushLines(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    if (i === 0) out.push(t);
    else if (/^(?:\(\d+\)|[-•]|\(a\)|\(b\)|\(c\)|\(i+\)|\(iv\)|Các ví dụ:|Phân loại vào|CHÚ GIẢI|\((?:[IVX]+\)|Các |Hỗn |Hộp,|Bao ))/.test(t) || /:$/.test(lines[i - 1])) {
      out.push('\n' + t);
    } else {
      out.push(' ' + t);
    }
  }
  return out.join('').normalize('NFC').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}

/** Trích toàn bộ 54 nút (13 QUY_TAC + 41 CHU_GIAI_CHI_TIET) từ nội dung gir.txt. */
export function trichTatCaGir(vanBan) {
  const dong = lamSachDong(vanBan);
  const startIdx = dong.findIndex((d) => d.text === 'QUY TẮC 1');
  if (startIdx < 0) throw new Error('Không thấy mốc "QUY TẮC 1" trong gir.txt');

  const ghiChuById = new Map(SUA_TAY.ghiChuBanIn.map((g) => [g.id, g.ghiChu]));
  const rawNodes = [];
  const ctCounters = new Map();

  let mode = 'rule'; // 'rule' | 'ct'
  let curRule = 0;
  let curTargetId = null;
  let activeNode = null;
  let pendingHeading = [];

  const openNode = ({ id, loai, lop, cha, so, trang, initLines = [] }) => {
    const node = { id, loai, lop, cha, so, trang, lines: [...initLines] };
    rawNodes.push(node);
    activeNode = node;
    return node;
  };

  for (let i = startIdx; i < dong.length; i++) {
    const { trang, text } = dong[i];

    // 1. Tiêu đề QUY TẮC 1..6
    const mRule = text.match(/^QUY TẮC ([1-6])$/);
    if (mRule) {
      curRule = Number(mRule[1]);
      mode = 'rule';
      curTargetId = `gir:${curRule}`;
      pendingHeading = [];
      openNode({
        id: curTargetId,
        loai: 'QUY_TAC',
        lop: 'LUAT',
        cha: null,
        so: String(curRule),
        trang,
        initLines: [text],
      });
      continue;
    }

    // 2. Điểm (a)/(b)/(c) trong QUY TẮC 2, 3, 5
    if (mode === 'rule') {
      const mPoint = text.match(/^\(([a-c])\)\s+(.*)$/);
      if (mPoint && (curRule === 2 || curRule === 3 || curRule === 5)) {
        openNode({
          id: `gir:${curRule}:${mPoint[1]}`,
          loai: 'QUY_TAC',
          lop: 'LUAT',
          cha: `gir:${curRule}`,
          so: mPoint[1],
          trang,
          initLines: [text],
        });
        continue;
      }
    }

    // 3. Mở vùng CHÚ GIẢI QUY TẮC N / CHÚ GIẢI QUY TẮC N (a)
    if (text === `CHÚ GIẢI QUY TẮC ${curRule}`) {
      mode = 'ct';
      curTargetId = `gir:${curRule}`;
      activeNode = null;
      pendingHeading = [text];
      continue;
    }
    const mCtSub = text.match(/^CHÚ GIẢI QUY TẮC ([1-6]) \(([a-c])\)$/);
    if (mCtSub) {
      const r = Number(mCtSub[1]);
      curRule = r;
      mode = 'ct';
      curTargetId = `gir:${r}:${mCtSub[2]}`;
      activeNode = null;
      pendingHeading = [text];
      continue;
    }

    // 4. Trong vùng Chú giải chi tiết: gặp (I)..(XIII) mở nút :ct:<n>
    if (mode === 'ct') {
      // Phụ đề trong ngoặc trước (I) như "(Các mặt hàng ở dạng chưa hoàn chỉnh...)"
      if (!activeNode && pendingHeading.length) {
        const mRoman = text.match(/^\(([IVX]+)\)\s+(.*)$/);
        if (!mRoman || !ROMAN_VAL[mRoman[1]]) {
          pendingHeading.push(text);
          continue;
        }
      }
      const mRoman = text.match(/^\(([IVX]+)\)\s+(.*)$/);
      if (mRoman && ROMAN_VAL[mRoman[1]]) {
        const prev = ctCounters.get(curTargetId) || 0;
        const n = prev + 1;
        ctCounters.set(curTargetId, n);
        const init = [...pendingHeading, text];
        pendingHeading = [];
        openNode({
          id: `${curTargetId}:ct:${n}`,
          loai: 'CHU_GIAI_CHI_TIET',
          lop: 'HUONG_DAN',
          cha: curTargetId,
          so: String(n),
          trang,
          initLines: init,
        });
        continue;
      }
    }

    if (!activeNode) {
      throw new Error(`Dòng lạc ngoài quy tắc/chú giải (tr.${trang}): "${text}"`);
    }
    activeNode.lines.push(text);
  }

  const nuts = rawNodes.map((n) => {
    const out = {
      id: n.id,
      loai: n.loai,
      lop: n.lop,
      cha: n.cha,
      so: n.so,
      nguyenVan: flushLines(n.lines),
      nguon: { vanBan: VAN_BAN_NGUON, ban: 'HS2022', trang: n.trang },
      hieuLuc: { ...HIEU_LUC },
    };
    const gc = ghiChuById.get(n.id);
    if (gc) out.ghiChu = gc;
    return out;
  });

  return { nuts };
}

function chayCli() {
  const thuMucTxt = process.env.LUAT_GOC_TXT || path.join(os.homedir(), 'luat-goc-txt');
  const tepVao = path.join(thuMucTxt, 'gir.txt');
  if (!fs.existsSync(tepVao)) {
    console.error(`Không thấy tệp nguồn: ${tepVao}`);
    process.exit(2);
  }
  const ghi = process.argv.includes('--ghi');
  const { nuts } = trichTatCaGir(fs.readFileSync(tepVao, 'utf8'));
  const jsonl = nuts.map((n) => JSON.stringify(n)).join('\n') + '\n';
  if (ghi) {
    fs.mkdirSync(path.dirname(MAC_DINH_RA), { recursive: true });
    fs.writeFileSync(MAC_DINH_RA, jsonl, 'utf8');
    console.log(`Đã ghi ${nuts.length} nút vào ${path.relative(GOC, MAC_DINH_RA)}`);
  } else {
    console.log(`Chế độ xem thử (${nuts.length} nút); thêm --ghi để xuất ${path.relative(GOC, MAC_DINH_RA)}`);
  }
  const qt = nuts.filter((n) => n.loai === 'QUY_TAC').length;
  const ct = nuts.filter((n) => n.loai === 'CHU_GIAI_CHI_TIET').length;
  console.log(`  QUY_TAC=${qt}, CHU_GIAI_CHI_TIET=${ct}, tổng=${nuts.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  chayCli();
}
