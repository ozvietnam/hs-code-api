#!/usr/bin/env node
import "./test-isolate-data.mjs";
/**
 * Khoá 43 mã đã sửa cột cs ngày 21/11/2026 sau khi đối chiếu BẢN GỐC quyết định phòng vệ thương mại
 * của Bộ Công Thương (pvtm.gov.vn, moit.gov.vn) — sai ở đây làm khách tính sai tiền thuế:
 *   - Biện pháp ĐÃ CHẤM DỨT mà cs còn ghi "Áp thuế …" (27 mã):
 *       QĐ 715/QĐ-BCT (03/3/2020) Thông báo mục 3: từ 07/9/2022 trở đi 0 đồng/tấn; BCT thông báo không gia hạn — 8 mã 3105
 *       QĐ 691/QĐ-BCT (21/3/2023) Điều 2: không gia hạn với phôi thép — 6 mã; Thông báo mục 2: thép dài 0% từ 22/3/2026 — 8 mã
 *       QĐ 915/QĐ-BCT (16/4/2026) Điều 1: không gia hạn CBPG thép hình chữ H Ma-lai-xi-a — 5 mã
 *   - Biện pháp CÒN ÁP nhưng cs dẫn quyết định đã hết hiệu lực (16 mã):
 *       sợi polyester 3546 → QĐ 2652/QĐ-BCT (13/10/2026) Điều 1, 3, 4 khoản 5 — 6 mã
 *       gạch ốp lát Ấn Độ 2333 → QĐ 2174/QĐ-BCT (07/9/2026) Điều 1, 2 — 8 mã
 *       kính nổi 228 → QĐ 1400/QĐ-BCT (12/6/2026) Điều 1, 2 — 2 mã
 * Chỉ đổi cột cs; KHÔNG cột thuế suất nào đổi (kiểm ở mục 5 bằng snapshot v3).
 */
import fs from "fs";
import crypto from "crypto";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { taxData } = require("../lib/data");
const { getDocByCode, listDocs } = require("../lib/legal-docs");
const { buildTaxLookup } = require("../lib/tax-lookup");
const { lookup: lookupVanBan, libraryConflicts } = require("../lib/plhq-registry");
const { loadIndex } = require("../lib/tariff-versions");

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? "" : JSON.stringify(d))); };

const HET = {
  "phân bón DAP/MAP (715/QĐ-BCT)": ["31051020", "31051090", "31052000", "31053000", "31054000", "31055100", "31055900", "31059000"],
  "phôi thép (691/QĐ-BCT Điều 2)": ["72071100", "72071900", "72072029", "72072099", "72249000", "98110010"],
  "thép dài (691/QĐ-BCT, 0% từ 22/3/2026)": ["72131010", "72131090", "72139120", "72142031", "72142041", "72279010", "72279090", "72283010"],
  "thép hình chữ H Ma-lai-xi-a (915/QĐ-BCT)": ["72163311", "72163319", "72163390", "72287010", "72287090"],
};
const CON_AP = {
  "2652/QĐ-BCT": { ma: ["54023310", "54023390", "54024610", "54024690", "54024710", "54024790"], cu: /3546\/QĐ-BCT/ },
  "2174/QĐ-BCT": { ma: ["69072121", "69072122", "69072123", "69072124", "69072191", "69072192", "69072193", "69072194"], cu: /2333\/QĐ-BCT/ },
  "1400/QĐ-BCT": { ma: ["70052920", "70052990"], cu: /(228|2093)\/QĐ-BCT/ },
};
const RE_PVTM = /cbpg|chống bán phá giá|tự vệ/i;

// 1. Biện pháp đã chấm dứt: cs + /api/tax không còn nói "áp thuế tự vệ / CBPG"
for (const [ten, ds] of Object.entries(HET)) {
  for (const ma of ds) {
    const cs = String(taxData[ma]?.cs || "");
    check(`${ma}: cs hết dòng PVTM — ${ten}`, taxData[ma] && !RE_PVTM.test(cs), cs);
    const lk = buildTaxLookup(ma, { origin: "MY" });
    const dong = (lk.policyLines || []).filter((l) => l.rule === "TRADE_REMEDY_OR_QUOTA");
    check(`${ma}: /api/tax không còn dòng TRADE_REMEDY_OR_QUOTA`, dong.length === 0, dong);
    check(`${ma}: warnings không còn nhắc thuế tự vệ/CBPG`, !RE_PVTM.test(JSON.stringify([lk.warnings?.summary, lk.warnings?.rawText, lk.warnings?.legalDocs] )), lk.warnings?.summary);
  }
}

// 2. Biện pháp còn áp: cs dẫn quyết định ĐANG hiệu lực, không còn số cũ; dòng CBPG vẫn hiện cho người khai
for (const [so, { ma: ds, cu }] of Object.entries(CON_AP)) {
  for (const ma of ds) {
    const cs = String(taxData[ma]?.cs || "");
    check(`${ma}: cs dẫn (${so}), không còn số cũ`, cs.includes(`(${so})`) && !cu.test(cs) && /Áp thuế CBPG/.test(cs), cs);
    const lk = buildTaxLookup(ma, { origin: "CN" });
    const dong = (lk.policyLines || []).find((l) => l.rule === "TRADE_REMEDY_OR_QUOTA");
    check(`${ma}: /api/tax còn dòng CBPG mức NOTICE dẫn ${so}`, dong?.level === "NOTICE" && dong.text.includes(so), dong);
    check(`${ma}: warnings.legalDocs dẫn ${so}, không còn số cũ`, (lk.warnings?.legalDocs || []).some((d) => d.code === so) && !cu.test(JSON.stringify([lk.warnings?.legalDocs, lk.warnings?.summary, lk.warnings?.rawText])), lk.warnings?.legalDocs);
    const hetHan = (lk.policyBasisReview?.items || []).filter((i) => /QĐ-BCT/.test(i.id) );
    check(`${ma}: policyBasisReview không còn báo quyết định PVTM hết hiệu lực`, hetHan.length === 0, hetHan);
  }
}

// 3. Cả biểu thuế: không dòng nào còn dẫn 6 số hiệu đã hết hiệu lực
const RE_CU = /715\/QĐ-BCT|691\/QĐ-BCT|1978\/QĐ-BCT|3546\/QĐ-BCT|2333\/QĐ-BCT|2093\/QĐ-BCT|228\/QĐ-BCT-2026/;
const sot = Object.values(taxData).filter((r) => RE_CU.test(String(r.cs || ""))).map((r) => r.hs);
check("toàn biểu: không mã nào còn dẫn 715/691/1978/3546/2333/2093/228 QĐ-BCT", sot.length === 0, sot);

// 4. Sổ văn bản: thư viện riêng khớp sổ cộng đồng, có căn cứ điều khoản + đường dẫn bản gốc
const s1978 = lookupVanBan("1978/QD-BCT"), s3546 = lookupVanBan("3546/QD-BCT"), s2333 = lookupVanBan("2333/QD-BCT"), s691 = lookupVanBan("691/QD-BCT"), s715 = lookupVanBan("715/QD-BCT");
check("sổ: 1978, 3546, 2333, 691, 715/QĐ-BCT đều HET_HIEU_LUC", [s1978, s3546, s2333, s691, s715].every((d) => d?.tinhTrang === "HET_HIEU_LUC"), [s1978, s3546, s2333, s691, s715].map((d) => d?.tinhTrang));
check("sổ: 2174 và 1400/QĐ-BCT CON_HIEU_LUC, đã đối chiếu hiệu lực", ["2174/QD-BCT", "1400/QD-BCT"].every((c) => { const d = lookupVanBan(c); return d?.tinhTrang === "CON_HIEU_LUC" && d?.hieuLucDaDoiChieu === true; }));
const l3546 = getDocByCode("3546/QĐ-BCT-2025");
check("legal-docs: 3546/QĐ-BCT REPLACED → 2652/QĐ-BCT, note dẫn Điều 4 khoản 5 + bản gốc moit.gov.vn", l3546?.status === "REPLACED" && l3546?.replacedBy === "2652/QĐ-BCT" && /Điều 4 khoản 5/.test(l3546.note) && /moit\.gov\.vn/.test(l3546.note), l3546?.status);
const l1978 = getDocByCode("1978/QĐ-BCT");
check("legal-docs: 1978/QĐ-BCT EXPIRED, note trích Điều 1 QĐ 915 + bản gốc pvtm.gov.vn, hết nhãn CHƯA XÁC MINH", l1978?.status === "EXPIRED" && /Không gia hạn/.test(l1978.note) && /pvtm\.gov\.vn/.test(l1978.note) && !/CHƯA XÁC MINH/.test(l1978.note), l1978?.note);
for (const [so, ch, n] of [["2652/QĐ-BCT", "54", 6], ["2174/QĐ-BCT", "69", 8], ["1400/QĐ-BCT", "70", 2]]) {
  const d = getDocByCode(so);
  check(`legal-docs: có ${so} ACTIVE, chương ${ch}, ${n} mã, url cơ quan nhà nước`, d?.status === "ACTIVE" && d.scopeHsChapters.includes(ch) && d.citedInHsCount === n && /^https:\/\/(pvtm|moit)\.gov\.vn\//.test(d.url), d);
}
for (const so of ["2333/QĐ-BCT-2025", "2093/QĐ-BCT-2025"]) {
  const d = getDocByCode(so);
  check(`legal-docs: ${so} REPLACED, hết nhãn CHƯA XÁC MINH`, d?.status === "REPLACED" && !/CHƯA XÁC MINH/.test(d.note), d?.note);
}
for (const so of ["41/2019/TT-BCT", "42/2019/TT-BCT", "08/2023/TT-BCT"]) {
  const d = getDocByCode(so), s = lookupVanBan(so);
  check(`legal-docs: ${so} AMENDED khớp sổ HET_HIEU_LUC_MOT_PHAN (bãi bỏ một phần bởi 48/2026/TT-BCT)`, d?.status === "AMENDED" && /48\/2026\/TT-BCT/.test(d.note) && s?.tinhTrang === "HET_HIEU_LUC_MOT_PHAN" && (s?.biBaiBoBoi || []).includes("48/2026/TT-BCT"), [d?.status, s?.tinhTrang]);
}
check("thư viện riêng không còn mục nào lệch tình trạng với sổ", libraryConflicts(listDocs()).length === 0, libraryConflicts(listDocs()).map((x) => x.code));

// 5. Phiên bản: v4-2026-11-21-pvtm là current, trùng byte tax.json; so với v3 CHỈ cột cs của đúng 43 mã đổi
const idx = loadIndex();
const cur = idx.versions.find((v) => v.id === idx.current);
check("versions: current = v4-2026-11-21-pvtm, 11.871 dòng", cur?.id === "v4-2026-11-21-pvtm" && cur?.rowCount === 11871, cur);
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const fV4 = `data/versions/${cur?.file}`, fV3 = "data/versions/tax-2026-11-12-duong-1309.json";
if (cur && fs.existsSync(fV4) && fs.existsSync(fV3)) {
  const a = JSON.parse(fs.readFileSync(fV3, "utf8")), b = JSON.parse(fs.readFileSync(fV4, "utf8"));
  const doiSauV4 = [];
  for (const hs of Object.keys(b)) for (const f of new Set([...Object.keys(b[hs]), ...Object.keys(taxData[hs] || {})])) if (b[hs][f] !== taxData[hs]?.[f]) doiSauV4.push(`${hs}.${f}`);
  check("snapshot v4 khớp checksum + trùng nội dung tax.json (trừ 26140010.cs sửa số hiệu #1987)", cur.checksum === `sha256:${sha(fV4)}` && (sha(fV4) === sha("data/tax.json") || JSON.stringify(doiSauV4) === JSON.stringify(["26140010.cs"])), doiSauV4);
  const doiCs = [], doiKhac = [];
  for (const hs of Object.keys(a)) for (const f of new Set([...Object.keys(a[hs]), ...Object.keys(b[hs] || {})])) if (a[hs][f] !== b[hs]?.[f]) (f === "cs" ? doiCs : doiKhac).push(`${hs}.${f}`);
  const mong = [...Object.values(HET).flat(), ...Object.values(CON_AP).flatMap((x) => x.ma)].sort();
  check("v3 → v4: đúng 43 mã đổi cột cs", doiCs.length === 43 && JSON.stringify(doiCs.map((x) => x.slice(0, 8)).sort()) === JSON.stringify(mong), doiCs.length);
  check("v3 → v4: KHÔNG trường thuế suất nào đổi (mfn, tt, acfta, vat, bvmt…)", doiKhac.length === 0 && Object.keys(a).length === Object.keys(b).length, doiKhac.slice(0, 5));
} else {
  check("snapshot v3 + v4 tồn tại trong data/versions/", false, [fV3, fV4]);
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
