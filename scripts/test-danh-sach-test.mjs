#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * scripts/test-danh-sach-test.mjs — Tự kiểm S-8 (#1567):
 *   1. `package.json` scripts.test trỏ đúng `node scripts/chay-danh-sach-test.mjs`.
 *   2. `scripts/danh-sach-test.txt` không trùng, không chứa `&&`, không chứa `ALL TESTS PASSED`,
 *      giữ đủ 265 lệnh trước S-8 theo ĐÚNG thứ tự tương đối, kèm `node scripts/test-danh-sach-test.mjs` ở cuối.
 *   3. Mọi tệp script được nhắc tới trong `scripts/danh-sach-test.txt` đều tồn tại trên đĩa.
 *   4. Kiểm hành vi runner `chay-danh-sach-test.mjs` qua subprocess với `--danh-sach=<tmp>`:
 *      all-pass, fail-fast, `--tu=<n>`, `--tu` không hợp lệ, `--khong-dung`, và kết thúc do signal.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GOC, docDanhSachTest } from './chay-danh-sach-test.mjs';
import { demCaTest, chamLog } from './dem-ca-test.mjs';

let xanh = 0;
let do_ = 0;

function ca(ten, dieuKien, chiTiet) {
  if (dieuKien) {
    xanh += 1;
    console.log(`PASS ${ten}`);
  } else {
    do_ += 1;
    const msg = chiTiet === undefined ? '' : ` — ${(typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet)).slice(0, 300)}`;
    console.log(`FAIL ${ten}${msg}`);
  }
}

// Danh sách 265 lệnh chuẩn từ origin/main trước S-8 (bỏ echo '=== ALL TESTS PASSED ===').
const LENH_CU_265 = [
  "node scripts/validate-resolver.js",
  "node scripts/test-dem-ca-test.mjs",
  "node scripts/test-do-han-chot-85s.mjs",
  "node scripts/test-do-phan-loai-tom-tat.mjs",
  "node scripts/test-ci-concurrency.mjs",
  "node scripts/test-dau-noi.mjs",
  "node scripts/test-cau-hoi-co-can-cu.mjs",
  "node scripts/test-bang-co.mjs",
  "node scripts/test-kiem-pr-l1.mjs",
  "node scripts/test-so-do-mermaid.mjs",
  "node scripts/test-bang-canh.mjs",
  "node scripts/test-bao-cao-mau-thuan-dong-nghia.mjs",
  "node scripts/kiem-tieu-chi-6.mjs",
  "node scripts/test-tieu-chi-6.mjs",
  "node scripts/test-van-ban-quan-ly.mjs",
  "node scripts/test-conflict-resolver.mjs",
  "node scripts/test-search.mjs",
  "node scripts/test-search-low-match.mjs",
  "node scripts/test-hs-aliases.mjs",
  "node scripts/test-trade-synonyms.mjs",
  "node scripts/test-suggest-trade-avoid.mjs",
  "node scripts/test-synonyms.mjs",
  "node scripts/test-may-say-8419.mjs",
  "node scripts/test-query-parse.mjs",
  "node scripts/test-decision-tables.mjs",
  "node scripts/test-confusion-pairs.mjs",
  "node scripts/test-suggest-confidence.mjs",
  "node scripts/test-gir.mjs",
  "node scripts/test-public-access.mjs",
  "node scripts/test-public-llm.mjs",
  "node scripts/test-build-static.mjs",
  "node scripts/validate-community.mjs",
  "node scripts/test-validate-community.mjs",
  "node scripts/test-privacy-filter.mjs",
  "node scripts/test-merge-community.mjs",
  "node scripts/test-legacy-hs-mapping.mjs",
  "node scripts/test-crawl-compliance.mjs",
  "node scripts/test-attribute-frames.mjs",
  "node scripts/test-identify.mjs",
  "node scripts/test-embed-pool.mjs",
  "node scripts/test-fta.mjs",
  "node scripts/test-xac-minh.mjs",
  "node scripts/test-bieu-thue-enrich.mjs",
  "node scripts/test-substance-duties.mjs",
  "node scripts/test-chapter98.mjs",
  "node scripts/test-acfta.mjs",
  "node scripts/test-llm-output-guard.mjs",
  "node scripts/test-gir-leak.mjs",
  "node scripts/test-suggest-facts-flow.mjs",
  "node scripts/test-data-freshness.mjs",
  "node scripts/test-ban-dung.mjs",
  "node scripts/test-thue-tam-thoi.mjs",
  "node scripts/test-duong-mia-1309.mjs",
  "node scripts/test-pvtm-2026-11-21.mjs",
  "node scripts/test-community-data-fresh.mjs",
  "node scripts/test-policy-status.mjs",
  "node scripts/test-feedback-api.mjs",
  "node scripts/test-loai-khac-examples.mjs",
  "node scripts/test-declaration-mismatch.mjs",
  "node scripts/test-search-index.mjs",
  "node scripts/test-doc-counts.mjs",
  "node scripts/test-tax-fields.mjs",
  "node scripts/test-data-sources.mjs",
  "node scripts/test-openapi.mjs",
  "node scripts/test-holdout-leak.mjs",
  "node scripts/test-lat-1.mjs",
  "node scripts/test-policy-review-queue.mjs",
  "node scripts/test-residual-guard.mjs",
  "node scripts/test-gir-engine.mjs",
  "node scripts/test-gir-tree.mjs",
  "node scripts/test-gir-notes.mjs",
  "node scripts/test-notes-coverage.mjs",
  "node scripts/test-sen.mjs",
  "node scripts/test-so-tay.mjs",
  "node scripts/check-so-tay.mjs",
  "node scripts/check-so-tay-bien.mjs",
  "node scripts/test-check-so-tay-bien.mjs",
  "node scripts/test-so-tay-chuong-98.mjs",
  "node scripts/test-so-tay-gates.mjs",
  "node tests/test-dem-nhom-sach.mjs",
  "node scripts/test-chot-trung-ten.mjs",
  "node scripts/test-dieu-kien-so.mjs",
  "node scripts/test-dieu-kien-so-tang.mjs",
  "node scripts/test-precedent-search.mjs",
  "node scripts/test-precedent-cross-source.mjs",
  "node scripts/test-ma-thay-the.mjs",
  "node scripts/test-intl-precedent-schema.mjs",
  "node scripts/test-precedent-nguong.mjs",
  "node scripts/test-precedent-gan-ket-qua.mjs",
  "node scripts/test-chapters-index.mjs",
  "node scripts/test-customs-types.mjs",
  "node scripts/test-destination-facts.mjs",
  "node scripts/test-feedback-store.mjs",
  "node scripts/test-match.mjs",
  "node scripts/test-material-taxonomy.mjs",
  "node scripts/test-tariff-mutations.mjs",
  "node scripts/test-tariff-sync.mjs",
  "node scripts/test-ministries.mjs",
  "node scripts/test-access-log.mjs",
  "node scripts/test-admin-update.mjs",
  "node scripts/test-augment-english.mjs",
  "node scripts/test-loai-khac-classifier.mjs",
  "node scripts/test-suggest-classify-parity.mjs",
  "node scripts/test-classify-resolver-integration.mjs",
  "node scripts/test-describe.mjs",
  "node scripts/test-mo-ta-vong-1.mjs",
  "node scripts/test-oz-gold-timeout.mjs",
  "node scripts/test-describe-degraded.mjs",
  "node scripts/test-legal-docs.mjs",
  "node scripts/test-attributes.mjs",
  "node scripts/test-trademark-watch.mjs",
  "node scripts/test-shtt-client.mjs",
  "node scripts/test-erp-input.mjs",
  "node scripts/test-llm-tier.mjs",
  "node scripts/test-llm-gemini-cu-khoa.mjs",
  "node scripts/test-zh-specs.mjs",
  "node scripts/test-classify-erp.mjs",
  "node scripts/test-classify-qua-gio.mjs",
  "node scripts/test-classify-decision-table.mjs",
  "node scripts/test-classify-grounding.mjs",
  "node scripts/test-classify-crosscheck.mjs",
  "node scripts/test-engine-loop.mjs",
  "node scripts/test-oz-precedent-match.mjs",
  "node scripts/test-engine-loop-so-tay.mjs",
  "node scripts/test-engine-loop-gon.mjs",
  "node scripts/test-mic-lookup.mjs",
  "node scripts/test-mic-hs-map.mjs",
  "node scripts/test-mic-signal-guard.mjs",
  "node scripts/test-ml-log-signal-mic.mjs",
  "node scripts/test-llm-step-profile.mjs",
  "node scripts/test-llm-timeout-theo-buoc.mjs",
  "node scripts/test-classify-minimax-cham.mjs",
  "node scripts/test-gemini-paid-failfast.mjs",
  "node scripts/test-classify-retry.mjs",
  "node scripts/test-exclusion-polarity.mjs",
  "node scripts/test-extract-specs.mjs",
  "node scripts/test-declaration-sheet.mjs",
  "node scripts/test-heading-lexicon.mjs",
  "node scripts/test-image-facts.mjs",
  "node scripts/test-policy-levels.mjs",
  "node scripts/test-demand-signals.mjs",
  "node scripts/test-policy-regime.mjs",
  "node scripts/test-plhq-registry.mjs",
  "node scripts/test-legal-status-miss.mjs",
  "node scripts/test-sinh-issue-miss.mjs",
  "node scripts/test-breadcrumb-tieu-de.mjs",
  "node scripts/test-radar-van-ban.mjs",
  "node scripts/test-hieu-luc-sap-doi.mjs",
  "node scripts/test-legal-status-ten.mjs",
  "node scripts/test-policy-name-match.mjs",
  "node scripts/test-legal-basis.mjs",
  "node scripts/test-evidence-pack.mjs",
  "node scripts/test-declaration-check.mjs",
  "node scripts/test-soat-luat-re-phu-dinh.mjs",
  "node scripts/test-725-nhom-goc.mjs",
  "node scripts/test-725-lot-2.mjs",
  "node scripts/test-725-44-duong-ai.mjs",
  "node scripts/test-725-46-chot-sai.mjs",
  "node scripts/bench-kiem-truoc-chot.mjs --kiem",
  "node scripts/test-service-tokens.mjs",
  "node scripts/test-usage-context.mjs",
  "node scripts/test-eval-holdout.mjs",
  "node scripts/bench-may-nghi.mjs",
  "node scripts/test-hs-tree.mjs",
  "node scripts/test-hs-tree-tang.mjs",
  "node scripts/test-hs-tree-trong-suot.mjs",
  "node scripts/test-hs-tree-sources.mjs",
  "node scripts/test-nguon-loai.mjs",
  "node scripts/test-bieu-thue.mjs",
  "node scripts/test-bieu-thue-zh.mjs",
  "node scripts/test-tax-ten-zh.mjs",
  "node scripts/test-shtt-kiem.mjs",
  "node scripts/test-tree-runtime.mjs",
  "node scripts/test-so-tay-runtime.mjs",
  "node scripts/test-wco-op.mjs",
  "node scripts/test-wco-opinions-api.mjs",
  "node scripts/test-tree-api.mjs",
  "node scripts/check-cay.mjs",
  "node scripts/test-725-cay.mjs",
  "node scripts/test-oz-gold-cache.mjs",
  "node scripts/test-llm-provider-parity.mjs",
  "node scripts/test-llm-private.mjs",
  "node scripts/test-data-cache-shared.mjs",
  "node scripts/test-declaration-options.mjs",
  "node scripts/test-share-consent.mjs",
  "node scripts/test-dispute-draft.mjs",
  "node scripts/test-mkt-sourcing.mjs",
  "node scripts/test-web-facts.mjs",
  "node scripts/test-rieng-tu-nhanh-phu.mjs",
  "node scripts/test-server.mjs",
  "node scripts/test-inflight.mjs",
  "node hs-agent/test/harness.test.mjs",
  "node scripts/test-so-tay-questions.mjs",
  "node scripts/test-hoi-theo-so-tay.mjs",
  "node scripts/test-chot-som-co-kiem.mjs",
  "node scripts/test-tim-truoc.mjs",
  "node scripts/test-chapter-declaration-fields.mjs",
  "node scripts/test-declaration-group-853650.mjs",
  "node scripts/test-b1b-web.mjs",
  "node scripts/test-a3-early-exit-loa-coc.mjs",
  "node scripts/test-a3-early-exit-led-e27.mjs",
  "node scripts/test-a3-early-exit-may-bom.mjs",
  "node scripts/test-engine-loop-chot-som-trade.mjs",
  "node scripts/test-engine-loop-early-hoi.mjs",
  "node scripts/test-engine-loop-b1b.mjs",
  "node scripts/test-kdtv-010124.mjs",
  "node scripts/test-precedent-tien-to.mjs",
  "node scripts/check-mo-ta-bo-de.mjs",
  "node scripts/test-check-mo-ta-bo-de.mjs",
  "node scripts/test-mo-ta-bench-lib.mjs",
  "node scripts/check-mo-ta-bo-de.mjs --tep=data/bench/ho-so-lat-1.json",
  "node scripts/test-rui-ro-phan-loai.mjs",
  "node scripts/test-classify-cache.mjs",
  "node scripts/test-llm-cost.mjs",
  "node scripts/test-cong-ranh-gioi.mjs",
  "node scripts/test-bo-phan-khong-anh-em.mjs",
  "node scripts/test-lat-2.mjs",
  "node scripts/test-cong-cu-tho-re.mjs",
  "node scripts/test-cong-tang-khong-ma.mjs",
  "node scripts/test-pham-vi-phan-nhom.mjs",
  "node scripts/test-cong-cu-vong-2.mjs",
  "node scripts/test-cong-5-ve.mjs",
  "node scripts/test-cong-cu-vong-3.mjs",
  "node scripts/test-cong-cu-vong-4.mjs",
  "node scripts/test-go-dung-851762-848180.mjs",
  "node scripts/test-so-hoa-732690.mjs",
  "node scripts/test-go-dung-848180-vong-6.mjs",
  "node scripts/test-cong-cu-vong-7.mjs",
  "node scripts/test-cong-cu-vong-8.mjs",
  "node scripts/test-soma-ten-ma.mjs",
  "node scripts/test-go-dung-392690-840991.mjs",
  "node scripts/test-tien-le-trung.mjs",
  "node scripts/test-van-ban-chuyen-nganh.mjs",
  "node scripts/test-tu-vung.mjs",
  "node scripts/check-tu-vung.mjs",
  "node scripts/test-tu-vung-2.mjs",
  "node scripts/test-loi-ve-so.mjs",
  "node scripts/test-ca-doi-chung-vat-lieu.mjs",
  "node scripts/test-phan-biet-vat-lieu.mjs",
  "node scripts/test-hieu-chinh.mjs",
  "node scripts/test-tien-le-thay-the.mjs",
  "node scripts/test-ho-so-duong-di.mjs",
  "node scripts/test-ho-so-doi-chieu.mjs",
  "node scripts/test-chong-lan-truc.mjs",
  "node scripts/test-ho-so-viet-mo-ta.mjs",
  "node scripts/test-ho-so-api.mjs",
  "node scripts/test-ozv-1368-skip-ganhoso-earlyexit.mjs",
  "node scripts/test-ho-so-shadow.mjs",
  "node scripts/test-ho-so-shadow-ben-goi.mjs",
  "node scripts/test-ho-so-shadow-chay-nen.mjs",
  "node scripts/test-ho-so-soat.mjs",
  "node scripts/test-do-ho-so-bench.mjs",
  "node scripts/test-quet-khoa-nhan-viec.mjs",
  "node scripts/test-benchmark-50-ca-tb-tchq.mjs",
  "node scripts/test-phan-biet-vat-lieu-t3.mjs",
  "node scripts/test-chan-ma-hs-chet-precedents.mjs",
  "node scripts/test-engine-loop-fast-first.mjs",
  "node scripts/test-classify-budget-85s.mjs",
  "node scripts/test-engine-han-chot.mjs",
  "node scripts/test-xep-hang-tien-le-tb-tchq.mjs",
  "node scripts/test-sinh-ca-vi-tri.mjs",
  "node scripts/test-ozv-630-khong-ra-ma.mjs",
  "node scripts/test-k2-doc-lap.mjs",
  "node scripts/bench-soat.mjs --nhanh --kiem",
  "node scripts/test-bo-thu-de-rieng.mjs",
];

// ── 1. Khoá package.json + danh-sach-test.txt ──────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(GOC, 'package.json'), 'utf8'));
ca(
  'package.json scripts.test === "node scripts/chay-danh-sach-test.mjs"',
  pkg?.scripts?.test === 'node scripts/chay-danh-sach-test.mjs',
  pkg?.scripts?.test,
);

const danhSach = docDanhSachTest();
const lenhs = danhSach.map((x) => x.lenh);

ca(
  'danh-sach-test.txt không có dòng trùng',
  new Set(lenhs).size === lenhs.length,
  `tong=${lenhs.length}, duyNhat=${new Set(lenhs).size}`,
);

ca(
  'danh-sach-test.txt không chứa && trong bất kỳ lệnh nào',
  lenhs.every((l) => !l.includes('&&')),
  lenhs.filter((l) => l.includes('&&')),
);

ca(
  'danh-sach-test.txt không chứa ALL TESTS PASSED',
  lenhs.every((l) => !l.includes('ALL TESTS PASSED')),
  lenhs.filter((l) => l.includes('ALL TESTS PASSED')),
);

// Kiểm đủ 265 lệnh cũ theo đúng thứ tự tương đối (100% subsequence khớp thứ tự gốc)
let viTriTruoc = -1;
const thieuHoacSaiThuTu = [];
for (const lenhCu of LENH_CU_265) {
  const pos = lenhs.indexOf(lenhCu, viTriTruoc + 1);
  if (pos === -1) {
    thieuHoacSaiThuTu.push(lenhCu);
  } else {
    viTriTruoc = pos;
  }
}
ca(
  `danh-sach-test.txt giữ đủ ${LENH_CU_265.length} lệnh cũ theo đúng thứ tự tương đối`,
  thieuHoacSaiThuTu.length === 0,
  thieuHoacSaiThuTu.slice(0, 5),
);

const idxTestDanhSach = lenhs.indexOf('node scripts/test-danh-sach-test.mjs');
const idxBoThu = lenhs.indexOf('node scripts/test-bo-thu-de-rieng.mjs');
ca(
  'node scripts/test-danh-sach-test.mjs nằm sau toàn bộ 265 lệnh cũ (sau test-bo-thu-de-rieng.mjs)',
  idxBoThu >= 0 && idxTestDanhSach > idxBoThu,
  { idxBoThu, idxTestDanhSach, tong: lenhs.length },
);
const idxC4 = lenhs.indexOf('node scripts/test-c4-model-hang.mjs');
ca(
  'node scripts/test-c4-model-hang.mjs được đăng ký trong danh-sach-test.txt trước test-danh-sach-test.mjs',
  idxC4 >= 0 && idxC4 < idxTestDanhSach,
  { idxC4, idxTestDanhSach },
);
const idxT4 = lenhs.indexOf('node scripts/test-tien-xu-ly.mjs');
ca(
  'node scripts/test-tien-xu-ly.mjs được đăng ký trong danh-sach-test.txt trước test-danh-sach-test.mjs',
  idxT4 >= 0 && idxT4 < idxTestDanhSach,
  { idxT4, idxTestDanhSach },
);

// Mọi tệp script + tệp --tep= được nhắc tới phải tồn tại trên đĩa
const tepThieu = [];
for (const item of danhSach) {
  const tokens = item.lenh.split(/\s+/);
  const tepChinh = tokens[1];
  if (tokens[0] !== 'node' || !tepChinh || !fs.existsSync(path.join(GOC, tepChinh))) {
    tepThieu.push(`${item.dong}: ${item.lenh}`);
  }
  for (const tok of tokens.slice(2)) {
    if (tok.startsWith('--tep=')) {
      const p = tok.slice('--tep='.length);
      if (!fs.existsSync(path.join(GOC, p))) tepThieu.push(`${item.dong} (--tep): ${p}`);
    }
  }
}
ca(
  `mọi tệp script trong danh-sach-test.txt (${lenhs.length} lệnh) đều tồn tại trên đĩa`,
  tepThieu.length === 0,
  tepThieu.slice(0, 5),
);

// ── 1b. Chiều ngược (#1850): mọi scripts/test-*.mjs phải được danh sách gọi ────────────────────
// Quy tắc 3 chỉ kiểm chiều "danh sách → tệp phải tồn tại". Chiều ngược thiếu nên 23 tệp mang tên
// test không cổng nào gọi vẫn lọt qua CI. Miễn trừ bắt buộc kèm lý do từng tệp, và không được
// trùng với danh sách (miễn trừ cho tệp đã đăng ký là miễn trừ chết, phải xoá).
const MIEN_TRU_MO_COI = {
  'test-isolate-data.mjs':
    'Đồ dùng chung, không phải cổng: import side-effect đặt HS_DATA_DIR sang thư mục tạm, 0 ca kiểm, được 263 tệp khác import.',
  'test-a3-early-exit-coc-latency.mjs':
    'ĐỎ ngưỡng thời gian: wall < 2000 ms, đo 2648 ms trên Windows (6 pass / 1 fail). Không nới ngưỡng — QT quyết (#1850).',
  'test-cuon-chieu-v1.mjs':
    'ĐỎ vì khuôn lấy .pathname từ URL module cho ra C:\\C:\\… → ENOENT data/so-tay/8412.json, in 0 ca. Sửa thuộc #1846, không phải việc của cổng này.',
  'test-do-do-thi-gd2.mjs':
    'ĐỎ ngân sách thời gian nội bộ subMs < 30000, đo 75405 ms cho 2 lượt (13 pass / 1 fail). Nhãn "chạy nhanh < 15s" trong tệp không đúng trên máy đo. Không nới ngưỡng — QT quyết.',
  'test-engine-loop-ma-du-kien.mjs':
    'ĐỎ 5 ca hành vi OZV-1388: mong results[0] = 32041900 duKien=true, nhận 320417 NEED_FACTS. Đo trên main cũ a9118a5c cũng 7 pass / 5 fail ⇒ hỏng sẵn, không do engine mới. Không sửa lib/engine-loop.js (QT cấm).',
  'test-import-customs-danh-muc.mjs':
    'ĐỎ 1 ca: mong CLI thoát 1 khi dữ liệu thiếu, nhận exit 0 vì scripts/import-customs-danh-muc.mjs dùng main-guard ghép file:// với argv[1] nên main() không chạy trên Windows (đo: stdout 0 byte, exit 0). Sửa thuộc #1846.',
  'test-kho-dap-an.mjs':
    'ĐỎ 6 ca: scripts/thong-ke-kho-dap-an.mjs cùng main-guard chết nên JSON.parse(stdout) trượt. Thí nghiệm một biến số trên bản sao: guard cũ 0 byte, đổi sang pathToFileURL 532 byte JSON. Sửa thuộc #1846.',
  'test-loai-tru-nhom.mjs':
    'ĐỎ vì khuôn lấy .pathname từ URL module → ENOENT C:\\C:\\… data/so-tay/5402.json, in 0 ca. Sửa thuộc #1846.',
  'test-ozv-590-khong-ra-ma.mjs':
    'ĐỎ 2 ca replay 50 ca: #30 (82089000) và #45 (87141090) mong khongRaMa=true nhưng nhận mã. Đo trên main cũ a9118a5c cũng 26 pass / 2 fail, đúng hai ca đó ⇒ hỏng sẵn. Không sửa nhãn/ngưỡng — QT quyết (#1850).',
  'test-phan-biet-vat-lieu-t2.mjs':
    'ĐỎ vì khuôn lấy .pathname từ URL module → ENOENT C:\\C:\\… data/so-tay/6103.json, in 0 ca. Sửa thuộc #1846.',
};

const tepTestScripts = fs
  .readdirSync(path.join(GOC, 'scripts'))
  .filter((f) => /^test-.*\.mjs$/.test(f))
  .sort();
const tepDuocGoi = new Set(
  danhSach.flatMap((x) => [...x.lenh.matchAll(/scripts\/(test-[A-Za-z0-9._-]+\.mjs)/g)].map((m) => m[1])),
);
const moCoi = tepTestScripts.filter((f) => !tepDuocGoi.has(f) && !(f in MIEN_TRU_MO_COI));
ca(
  `mọi scripts/test-*.mjs (${tepTestScripts.length} tệp) đều được danh-sach-test.txt gọi hoặc nằm trong miễn trừ có lý do`,
  moCoi.length === 0,
  moCoi,
);
const mienTruHong = Object.entries(MIEN_TRU_MO_COI)
  .filter(([f, lyDo]) => !fs.existsSync(path.join(GOC, 'scripts', f)) || !String(lyDo).trim() || tepDuocGoi.has(f))
  .map(([f]) => f);
ca(
  `mỗi mục miễn trừ (${Object.keys(MIEN_TRU_MO_COI).length} tệp) còn tồn tại, có lý do, và không trùng với danh sách`,
  mienTruHong.length === 0,
  mienTruHong,
);

// ── 2. Kiểm hành vi runner qua subprocess với danh sách tạm ────────────────────────────────────
const RUNNER = path.join(GOC, 'scripts', 'chay-danh-sach-test.mjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's8-runner-'));
const chayRunner = (args) =>
  spawnSync(process.execPath, [RUNNER, ...args], {
    cwd: GOC,
    encoding: 'utf8',
  });

try {
  // 2a) docDanhSachTest bỏ qua dòng trống và # comment, giữ đúng số dòng 1-based
  const dsParsePath = path.join(tmpDir, 'parse.txt');
  fs.writeFileSync(
    dsParsePath,
    ['# chu thich', '', '   ', '  node -e "console.log(1)"  ', '# dong 5', 'node -e "console.log(2)"'].join('\n'),
    'utf8',
  );
  const parsed = docDanhSachTest(dsParsePath);
  ca(
    'docDanhSachTest bỏ trống + # và giữ đúng số dòng',
    parsed.length === 2
      && parsed[0].dong === 4 && parsed[0].lenh === 'node -e "console.log(1)"'
      && parsed[1].dong === 6 && parsed[1].lenh === 'node -e "console.log(2)"',
    parsed,
  );

  // 2b) All-pass: thoát 0, in === ALL TESTS PASSED === ở cuối, demCaTest xác nhận XANH + không sớm
  const dsPass = path.join(tmpDir, 'pass.txt');
  fs.writeFileSync(
    dsPass,
    [
      '# bo test pass',
      `node -e "console.log('PASS ca 1')"`,
      `node -e "console.log('PASS ca 2'); console.log('2/2 passed, 0 failed')"`,
    ].join('\n'),
    'utf8',
  );
  const kqPass = chayRunner([`--danh-sach=${dsPass}`]);
  const dongCuoiPass = kqPass.stdout.trim().split(/\r?\n/).at(-1);
  const soPass = demCaTest(`${kqPass.stdout}\nEXIT=${kqPass.status}`);
  ca(
    'all-pass: exit 0, có [1/2]..[2/2], dòng cuối === ALL TESTS PASSED ===, demCaTest XANH',
    kqPass.status === 0
      && kqPass.stdout.includes('[1/2]')
      && kqPass.stdout.includes('[2/2]')
      && dongCuoiPass === '=== ALL TESTS PASSED ==='
      && soPass.nhanSomALLPASSED === false
      && chamLog(soPass).xanh === true,
    { status: kqPass.status, dongCuoiPass, soPass },
  );

  const vietBuoc = (tenTep, maCode) => {
    const p = path.join(tmpDir, tenTep);
    fs.writeFileSync(p, maCode, 'utf8');
    return `node ${JSON.stringify(p)}`;
  };

  // 2c) Fail-fast mặc định: dừng ở lệnh 2 (exit 3), KHÔNG chạy lệnh 3, KHÔNG in ALL TESTS PASSED
  const m1 = path.join(tmpDir, 'm1.txt');
  const m3 = path.join(tmpDir, 'm3.txt');
  const dsFailFast = path.join(tmpDir, 'failfast.txt');
  fs.writeFileSync(
    dsFailFast,
    [
      vietBuoc('ff1.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(m1)}, 'ok'); console.log('PASS cmd1');`),
      vietBuoc('ff2.mjs', `console.log('FAIL cmd2'); process.exit(3);`),
      vietBuoc('ff3.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(m3)}, 'ran'); console.log('PASS cmd3');`),
    ].join('\n'),
    'utf8',
  );
  const kqFF = chayRunner([`--danh-sach=${dsFailFast}`]);
  const outFF = kqFF.stdout + kqFF.stderr;
  ca(
    'fail-fast: trả mã thoát khác 0 (3), chạy lệnh 1, bỏ lệnh 3, không in ALL TESTS PASSED',
    kqFF.status === 3
      && fs.existsSync(m1)
      && !fs.existsSync(m3)
      && !outFF.includes('ALL TESTS PASSED'),
    { status: kqFF.status, hasM1: fs.existsSync(m1), hasM3: fs.existsSync(m3) },
  );

  // 2d) --tu=2 bỏ qua lệnh 1, chạy lệnh 2..3; --tu sai phạm vi thoát 2
  const t1 = path.join(tmpDir, 't1.txt');
  const t2 = path.join(tmpDir, 't2.txt');
  const t3 = path.join(tmpDir, 't3.txt');
  const dsTu = path.join(tmpDir, 'tu.txt');
  fs.writeFileSync(
    dsTu,
    [
      vietBuoc('tu1.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(t1)}, '1');`),
      vietBuoc('tu2.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(t2)}, '2'); console.log('PASS c2');`),
      vietBuoc('tu3.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(t3)}, '3'); console.log('PASS c3');`),
    ].join('\n'),
    'utf8',
  );
  const kqTu2 = chayRunner([`--danh-sach=${dsTu}`, '--tu=2']);
  ca(
    '--tu=2: bỏ qua lệnh 1, chạy lệnh 2..3, thoát 0 và in ALL TESTS PASSED',
    kqTu2.status === 0
      && !fs.existsSync(t1)
      && fs.existsSync(t2)
      && fs.existsSync(t3)
      && !kqTu2.stdout.includes('[1/3]')
      && kqTu2.stdout.includes('[2/3]')
      && kqTu2.stdout.includes('[3/3]')
      && kqTu2.stdout.trim().split(/\r?\n/).at(-1) === '=== ALL TESTS PASSED ===',
    { status: kqTu2.status, hasT1: fs.existsSync(t1), hasT2: fs.existsSync(t2), hasT3: fs.existsSync(t3) },
  );

  const badTu = ['--tu=0', '--tu=4', '--tu=abc', '--tu=-1'];
  const badOk = badTu.every((flag) => {
    const r = chayRunner([`--danh-sach=${dsTu}`, flag]);
    return r.status === 2 && !(r.stdout + r.stderr).includes('ALL TESTS PASSED');
  });
  ca(`--tu không hợp lệ (${badTu.join(', ')}) thoát mã 2`, badOk);

  // 2e) --khong-dung: vẫn chạy lệnh 3 sau khi lệnh 2 lỗi, tổng kết lệnh lỗi, thoát 1, không ALL TESTS PASSED
  const k1 = path.join(tmpDir, 'k1.txt');
  const k3 = path.join(tmpDir, 'k3.txt');
  const dsKD = path.join(tmpDir, 'khong-dung.txt');
  fs.writeFileSync(
    dsKD,
    [
      vietBuoc('kd1.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(k1)}, '1'); console.log('PASS k1');`),
      vietBuoc('kd2.mjs', `console.log('FAIL k2'); process.exit(1);`),
      vietBuoc('kd3.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(k3)}, '3'); console.log('PASS k3');`),
    ].join('\n'),
    'utf8',
  );
  const kqKD = chayRunner([`--danh-sach=${dsKD}`, '--khong-dung']);
  const outKD = kqKD.stdout + kqKD.stderr;
  ca(
    '--khong-dung: chạy tiếp lệnh 3 sau khi lệnh 2 lỗi, báo tổng kết lỗi, thoát 1, không ALL TESTS PASSED',
    kqKD.status === 1
      && fs.existsSync(k1)
      && fs.existsSync(k3)
      && outKD.includes('[2/3]')
      && outKD.includes('TỔNG KẾT --khong-dung: 1/3 lệnh lỗi')
      && !outKD.includes('ALL TESTS PASSED'),
    { status: kqKD.status, hasK1: fs.existsSync(k1), hasK3: fs.existsSync(k3), stderr: kqKD.stderr.slice(-300) },
  );

  // 2f) Lệnh con chết do signal (status === null) → coi là lỗi khác 0, không in ALL TESTS PASSED
  const s2 = path.join(tmpDir, 's2.txt');
  const dsSig = path.join(tmpDir, 'sig.txt');
  fs.writeFileSync(
    dsSig,
    [
      vietBuoc('sig1.mjs', `process.kill(process.pid, 'SIGTERM');`),
      vietBuoc('sig2.mjs', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(s2)}, '2');`),
    ].join('\n'),
    'utf8',
  );
  const kqSig = chayRunner([`--danh-sach=${dsSig}`]);
  const outSig = kqSig.stdout + kqSig.stderr;
  ca(
    'lệnh con bị signal (status null) → dừng với mã khác 0, không chạy lệnh sau, không ALL TESTS PASSED',
    kqSig.status !== 0 && !fs.existsSync(s2) && !outSig.includes('ALL TESTS PASSED'),
    { status: kqSig.status, hasS2: fs.existsSync(s2) },
  );
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\n${xanh}/${xanh + do_} passed, ${do_} failed`);
if (do_ > 0) process.exit(1);
