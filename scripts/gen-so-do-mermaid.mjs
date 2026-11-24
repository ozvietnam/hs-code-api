#!/usr/bin/env node
/**
 * scripts/gen-so-do-mermaid.mjs — Bộ sinh sơ đồ tự động từ mã (Code-to-Diagram Generator)
 * Đọc trực tiếp từ data/luat/dau-noi.json, data/luat/bang-co.json để render khối Mermaid
 * vào docs/luat-duong-khach.md giữa hai mốc neo:
 * <!-- AUTO_MERMAID_DUONG_KHACH_START --> và <!-- AUTO_MERMAID_DUONG_KHACH_END -->.
 *
 * Cách chạy:
 *   node scripts/gen-so-do-mermaid.mjs         # Sinh và ghi đè vào docs/luat-duong-khach.md
 *   node scripts/gen-so-do-mermaid.mjs --kiem  # Kiểm tra xem tài liệu có bị lệch (drift) không
 */
import fs from 'node:fs';
import path from 'node:path';
import { GOC, doc, docJson, co } from './lib-luat.mjs';
import { pathToFileURL } from 'url';

export const NEO_BAT_DAU = '<!-- AUTO_MERMAID_DUONG_KHACH_START -->';
export const NEO_KET_THUC = '<!-- AUTO_MERMAID_DUONG_KHACH_END -->';

/** Sinh chuỗi biểu đồ Mermaid từ nguồn sự thật dau-noi.json */
export function sinhSoDoMermaid(dauNoi = docJson('data/luat/dau-noi.json')) {
  const kho = dauNoi.kho || {};
  const soTayTen = kho.soTayNhom?.ten || 'Sổ tay nhóm 4 số';
  const soPn6Ten = kho.soPn6?.ten || 'Sổ ranh giới phân nhóm 6 số';
  const tienLeTen = kho.tienLe?.ten || 'Tiền lệ TB-TCHQ';
  const chuGiaiTen = kho.chuGiai?.ten || 'Chú giải pháp lý';

  // Lấy các đường tiêu biểu có Cổng gọi
  const duongCongGoi = (dauNoi.duong || [])
    .filter((d) => d.congGoi)
    .map((d) => d.duong.replace(/^\//, ''))
    .slice(0, 4)
    .join(', ');

  const mermaid = `\`\`\`mermaid
flowchart TD
    Client["Khách gọi: Cổng OZ / ERP / Zalo Bot"] --> Route["Route API (${duongCongGoi || 'api/classify, api/identify, api/suggest'}...)"]

    subgraph SG1 ["Trạm 1: Tiếp nhận & Kiểm tra cờ (bang-co.json)"]
        Route --> GateL1{"L1: Đổi quyết định LLM?"}
        GateL1 -- "Có" --> FlagCheck["Đặt sau cờ HS_* (Mặc định TẮT)"]
        GateL1 -- "Không" --> EngineInit["Khởi tạo Động cơ phân loại"]
        FlagCheck --> EngineInit
    end

    subgraph SG2 ["Trạm 2: Đấu nối tri thức (dau-noi.json)"]
        EngineInit --> EngineLoop["lib/engine-loop.js (L3: Động cơ duy nhất)"]
        EngineLoop --> ReadSoTay["data/so-tay/ (${soTayTen} - Lõi tất định)"]
        EngineLoop --> ReadPn6["data/ho-so/ranh-gioi/ (${soPn6Ten})"]
        EngineLoop --> ReadTienLe["data/precedents.json (${tienLeTen})"]
        EngineLoop --> ReadChuGiai["data/explanatory-notes.json (${chuGiaiTen})"]
    end

    subgraph SG3 ["Trạm 3: Phân loại & Chốt mã"]
        ReadSoTay & ReadPn6 & ReadTienLe & ReadChuGiai --> ChotDong8["lib/so-tay-gates.js: chotDong8()"]
        ChotDong8 --> KiemChot["lib/kiem-truoc-chot.js (Chặn đoán bừa, trừ loại khác)"]
        KiemChot --> SubheadingCheck["lib/subheading-check.js (Đủ từ đặc trưng)"]
    end

    subgraph SG4 ["Trạm 4: Rẽ nhánh kết quả & Câu hỏi"]
        SubheadingCheck --> KetLuan{"Đã đủ dữ kiện?"}
        KetLuan -- "Đủ: Ra mã 8 số" --> FilterPrivacy["L6: Lọc sạch riêng tư (locRiengTu)"]
        KetLuan -- "Thiếu dữ kiện" --> QuestionCore["L2: Lõi câu hỏi duy nhất (so-tay / ranh-gioi / bieu-thue)"]
        QuestionCore --> QuestionWithEvidence["Câu hỏi kèm canCu + nguon"]
    end

    subgraph SG5 ["Trạm 5: Trả lời & Chạy bóng"]
        FilterPrivacy --> ReturnClient["Trả kết quả cho khách (trần thời gian 150ms)"]
        QuestionWithEvidence --> ReturnClient
        ReturnClient -. "L5: Fire & Forget (Sau khi trả)" .-> ShadowRun["Chạy bóng ghi kho_dap_an / đối soát"]
    end

    subgraph SG_Gates ["Cổng máy kiểm định tự động (npm test)"]
        TestDauNoi["test-dau-noi.mjs (L4: Bảng đấu nối)"]
        TestCauHoi["test-cau-hoi-co-can-cu.mjs (L2: Câu hỏi có căn cứ)"]
        TestBangCo["test-bang-co.mjs (L1, L5, L8: Kỷ luật cờ)"]
        TestKiemPr["test-kiem-pr-l1.mjs (L1: Kiểm PR gọi LLM)"]
        TestMermaid["test-so-do-mermaid.mjs (Chống lệch sơ đồ)"]
        TestBangCanh["test-bang-canh.mjs (ADR-0002: Bảng cạnh đồ thị tri thức)"]
        TestTieuChi6["kiem-tieu-chi-6.mjs + test-tieu-chi-6.mjs (G6: tiêu chí phân nhóm 6 số, cạnh C10)"]
    end
\`\`\``;

  return mermaid;
}

/** Cập nhật nội dung Mermaid vào tệp markdown */
export function capNhatTepMarkdown(duongDanTep = 'docs/luat-duong-khach.md') {
  const noiDungCu = doc(duongDanTep);
  const mermaidMoi = sinhSoDoMermaid();

  if (!noiDungCu.includes(NEO_BAT_DAU) || !noiDungCu.includes(NEO_KET_THUC)) {
    // Nếu chưa có neo, thay thế khối mermaid cũ
    const mauThayThe = /```mermaid[\s\S]*?```/;
    if (mauThayThe.test(noiDungCu)) {
      const noiDungMoi = noiDungCu.replace(mauThayThe, `${NEO_BAT_DAU}\n${mermaidMoi}\n${NEO_KET_THUC}`);
      fs.writeFileSync(path.join(GOC, duongDanTep), noiDungMoi, 'utf8');
      return { capNhat: true, noiDungMoi };
    }
    throw new Error(`Không tìm thấy vị trí chèn sơ đồ trong ${duongDanTep}`);
  }

  const reNeo = new RegExp(`${NEO_BAT_DAU}[\\s\\S]*?${NEO_KET_THUC}`);
  const noiDungMoi = noiDungCu.replace(reNeo, `${NEO_BAT_DAU}\n${mermaidMoi}\n${NEO_KET_THUC}`);
  const daDoi = noiDungCu !== noiDungMoi;

  if (daDoi) {
    fs.writeFileSync(path.join(GOC, duongDanTep), noiDungMoi, 'utf8');
  }
  return { capNhat: daDoi, noiDungMoi };
}

// Chạy trực tiếp qua CLI
if (Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const laKiem = process.argv.includes('--kiem');
  if (laKiem) {
    const noiDung = doc('docs/luat-duong-khach.md');
    const mermaidChuan = sinhSoDoMermaid();
    const hopLe = noiDung.includes(NEO_BAT_DAU) && noiDung.includes(NEO_KET_THUC) && noiDung.includes(mermaidChuan);
    if (!hopLe) {
      console.error('LỆCH SƠ ĐỒ: Sơ đồ Mermaid trong docs/luat-duong-khach.md khác với dữ liệu máy!');
      console.error('Chạy: node scripts/gen-so-do-mermaid.mjs để tự động cập nhật.');
      process.exit(1);
    }
    console.log('PASS: Sơ đồ Mermaid đồng bộ hoàn toàn với dữ liệu máy.');
  } else {
    const { capNhat } = capNhatTepMarkdown();
    console.log(capNhat ? 'Đã cập nhật sơ đồ Mermaid thành công.' : 'Sơ đồ Mermaid đã ở bản mới nhất, không cần cập nhật.');
  }
}
