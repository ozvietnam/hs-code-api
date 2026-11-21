#!/usr/bin/env node
/**
 * Đo /api/classify NGAY TRONG container máy thật, in MỖI CA MỘT DÒNG — để QT đo sau khi bật/tắt một công tắc mà không
 * phải kéo cả phản hồi (hàng chục KB/ca) về máy mình. Gọi qua HTTP nội bộ (127.0.0.1:$PORT) nên đi đúng chuỗi mô hình,
 * đúng cờ HS_* và đúng khoá dịch vụ của tiến trình đang chạy (luật L1 việc 3: số đo để nhận phải lấy trên máy thật).
 *
 * CÓ GỌI LLM THẬT, TỐN TIỀN THẬT: mỗi ca là một lượt /api/classify đầy đủ. Chạy tuần tự, có giãn cách.
 *
 * Dùng:
 *   node scripts/do-phan-loai-tom-tat.mjs scripts/ca-do/van-5-2.jsonl
 *   node scripts/do-phan-loai-tom-tat.mjs scripts/ca-do/van-khi-nen-30.jsonl --gian=3000
 *   node scripts/do-phan-loai-tom-tat.mjs scripts/ca-do/tb-tchq-50.jsonl --khoa=erp --gioi-han=10
 *   node scripts/do-phan-loai-tom-tat.mjs scripts/ca-do/van-khi-nen-30.jsonl --ra=/tmp/do.jsonl --tiep
 *
 * Tệp ca: JSONL, mỗi dòng { tenHang, chatLieu?, congDung?, maDung } (maDung 4–8 số; thiếu thì chỉ in mã ra, không chấm).
 * Tham số:
 *   --khoa=<tên>       tên khoá dịch vụ trong biến môi trường HS_SERVICE_TOKENS của tiến trình (mặc định "cong-oz" = khoá
 *                      của Cổng: cùng đường khách thật đi). KHÔNG BAO GIỜ in khoá; thiếu tên thì chỉ liệt kê các TÊN đang có.
 *   --cong-khai        không gửi khoá (lượt công khai).
 *   --cong=<port>      mặc định $PORT hoặc 3000.     --may=<host> mặc định 127.0.0.1.
 *   --gian=<ms>        giãn cách giữa hai ca (mặc định 2000).
 *   --lap=<n>          chạy mỗi ca n lượt (mặc định 1).
 *   --gioi-han=<n>     chỉ chạy n ca đầu.
 *   --het-gio=<ms>     hạn một lượt gọi (mặc định 120000).
 *   --khong-debug      bỏ debug:true. MẶC ĐỊNH gửi debug:true để lượt đo KHÔNG đọc/ghi bộ nhớ đệm phân loại và kho đáp án
 *                      (api/classify.js bỏ qua cache khi debug) — đo lặp 5 lượt mà trúng đệm thì 5 lượt là một.
 *   --ra=<tệp.jsonl>   ghi mỗi ca một dòng JSON (chỉ số đo và mã, KHÔNG ghi câu hỏi đầy đủ hay khoá).
 *   --tiep             đi kèm --ra: bỏ qua các stt đã có kết quả không lỗi trong tệp --ra; chỉ chạy ca chưa có hoặc ca lỗi;
 *                      phần tổng hợp tính trên toàn bộ tệp.
 *   --thu-lai=<n>      số lần thử lại tối đa khi gặp lỗi kết nối / HTTP 502 / 503 (mặc định 3).
 *   --cho-thu-lai=<ms> thời gian nghỉ giữa mỗi lần thử lại (mặc định 20000).
 *
 * Cột mỗi dòng: # | maDung | maRa | mức (4/6/8 số) | N P D (đúng nhóm / phân nhóm / dòng: 1, 0, - = không chấm được)
 *   | status | gates (rút gọn) | timTruoc.nhom | chanChotSom | canCuCauHoi | 2 câu hỏi đầu | ms | provider
 * Tệp ca trong scripts/ca-do/ (dựng một lần, hạt giống cố định 20261121):
 *   van-5-2.jsonl         ca van điện từ khí nén 5/2 qua Cổng 21/11, 5 dòng giống nhau (ca này dao động giữa các lượt).
 *   van-khi-nen-30.jsonl  30 dòng nhóm 8481 + 8412 (van / khí nén / xi lanh) rút từ data/oz-gold-final.jsonl. LƯU Ý: các
 *                         dòng này CÓ trong kho tờ khai Oz mà máy thật tìm được ⇒ không phải bài thi kín, chỉ để so trước/sau.
 *   tb-tchq-50.jsonl      50 ca của cổng hồi quy tests/bo-50-ca-tb-tchq.json (cauKhach → tenHang, ma → maDung); chép ra đây
 *                         vì thư mục tests/ không có trong image (.dockerignore).
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const tep = args.find((a) => !a.startsWith('--'));
const opt = (ten, macDinh) => { const a = args.find((x) => x.startsWith(`--${ten}=`)); return a ? a.slice(ten.length + 3) : macDinh; };
const co = (ten) => args.includes(`--${ten}`);
if (!tep) { console.error('Thiếu tệp ca JSONL. Xem đầu tệp scripts/do-phan-loai-tom-tat.mjs.'); process.exit(2); }

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

const dsKhoaEnv = String(process.env.HS_SERVICE_TOKENS || '').split(',').map((s) => s.trim())
  .map((s) => { const i = s.indexOf(':'); return i > 0 ? { ten: s.slice(0, i).trim(), khoa: s.slice(i + 1).trim() } : null; })
  .filter((e) => e && e.ten && e.khoa);

const tatCaKhoaBiMat = [...new Set(dsKhoaEnv.map((e) => e.khoa).filter((k) => k && k.length >= 4))].sort((a, b) => b.length - a.length);
function anBiMat(chuoi) {
  let kq = String(chuoi ?? '');
  for (const biMat of tatCaKhoaBiMat) {
    if (kq.includes(biMat)) kq = kq.split(biMat).join('[AN]');
  }
  return kq;
}

const tenKhoa = opt('khoa', 'cong-oz');
let khoa = null;
if (!co('cong-khai')) {
  khoa = dsKhoaEnv.find((e) => e.ten === tenKhoa)?.khoa || null;
  if (!khoa) {
    console.error(`Không thấy khoá dịch vụ tên "${tenKhoa}" trong HS_SERVICE_TOKENS của tiến trình này. Tên đang có: ${dsKhoaEnv.map((e) => e.ten).join(', ') || '(trống)'}. Chọn bằng --khoa=<tên> hoặc --cong-khai.`);
    process.exit(2);
  }
}

const tepRa = opt('ra', null);
const tiep = co('tiep');
if (tiep && !tepRa) {
  console.error('Tham số --tiep bắt buộc đi kèm --ra=<tệp.jsonl>.');
  process.exit(2);
}

const THU_LAI_MAC_DINH = 3;
const CHO_THU_LAI_MAC_DINH_MS = 20000;
const _tl = Number(opt('thu-lai', String(THU_LAI_MAC_DINH)));
const _ctl = Number(opt('cho-thu-lai', String(CHO_THU_LAI_MAC_DINH_MS)));
const thuLaiToiDa = Number.isFinite(_tl) ? Math.max(0, _tl) : THU_LAI_MAC_DINH;
const choThuLaiMs = Number.isFinite(_ctl) ? Math.max(0, _ctl) : CHO_THU_LAI_MAC_DINH_MS;

const url = `http://${opt('may', '127.0.0.1')}:${opt('cong', process.env.PORT || '3000')}/api/classify`;
const gian = Number(opt('gian', '2000'));
const lap = Math.max(1, Number(opt('lap', '1')) || 1);
const hetGio = Number(opt('het-gio', '120000'));
const debug = !co('khong-debug');

let ca = readFileSync(tep, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map((l) => JSON.parse(l));
const gioiHan = Number(opt('gioi-han', '0'));
if (gioiHan > 0) ca = ca.slice(0, gioiHan);

/** engine.gates rút gọn: mỗi mục một cụm ngắn, chỉ giữ khoá có nghĩa cho việc đọc đường đi. */
function gatesGon(gates) {
  const ra = [];
  for (const g of Array.isArray(gates) ? gates : []) {
    if (!g || typeof g !== 'object') continue;
    const p = [];
    for (const k of ['earlyExitTradeChotSom', 'earlyExitConflict', 'earlyExitHoi', 'fastFirst', 'boQuaVong2']) if (k in g) p.push(`${k}=${g[k] ? 1 : 0}`);
    if (g.decision) p.push(`${g.decision}${g.hs ? `:${g.hs}` : ''}`);
    if (g.lyDo) p.push(`lyDo=${clip(g.lyDo, 40)}`);
    if (Array.isArray(g.blocks) && g.blocks.length) p.push(`chan=${g.blocks.join('+')}`);
    if (g.tatDinh) p.push(`tatDinh=${g.tatDinh}`);
    if (g.fallback) p.push(`fallback=${g.fallback}`);
    if (g.giuDanhTu) p.push(`giuDanhTu=${g.giuDanhTu}`);
    if (g.error) p.push(`loi=${clip(g.error, 40)}`);
    if (!p.length && g.note) p.push(clip(g.note, 40));
    if (p.length) ra.push(`${g.round != null ? `v${g.round}` : (g.step || '-')}:${p.join(',')}`);
  }
  return ra.join(' ; ') || '-';
}

function laLoiKetNoi(err, httpStatus) {
  if (httpStatus === 502 || httpStatus === 503) return true;
  if (!err) return false;
  const chiTiet = `${err?.message || ''} ${err?.cause?.code || ''} ${err?.cause?.message || ''}`;
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return false;
  return /fetch failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EPIPE|ENOTFOUND|EAI_AGAIN|UND_ERR_|other side closed|socket/i.test(chiTiet);
}

const ketQuaTheoStt = new Map();
const caDaXong = new Set();

if (tepRa) {
  mkdirSync(dirname(tepRa), { recursive: true });
  if (tiep && existsSync(tepRa)) {
    for (const dong of readFileSync(tepRa, 'utf8').split('\n')) {
      if (!dong.trim()) continue;
      let r;
      try { r = JSON.parse(dong); } catch { continue; }
      if (!Number.isInteger(r?.stt)) continue;
      ketQuaTheoStt.set(r.stt, r);
      const daThanhCong = !r.loi && r.status && !String(r.status).startsWith('LOI');
      if (daThanhCong) caDaXong.add(r.stt);
      else caDaXong.delete(r.stt);
    }
  } else {
    writeFileSync(tepRa, '', 'utf8');
  }
}

console.log(`# ${new Date().toISOString()} | tệp ${tep} | ${ca.length} ca × ${lap} lượt | khoá ${khoa ? tenKhoa : '(công khai)'} | debug ${debug} | cờ: HS_TIM_TRUOC=${process.env.HS_TIM_TRUOC || '(trống)'} HS_TIM_TRUOC_NAP=${process.env.HS_TIM_TRUOC_NAP || '(trống)'} HS_CHOT_SOM_CO_KIEM=${process.env.HS_CHOT_SOM_CO_KIEM || '(trống)'} HS_HOI_THEO_SO_TAY=${process.env.HS_HOI_THEO_SO_TAY || '(trống)'} HS_SO_TAY=${process.env.HS_SO_TAY || '(trống)'}`);
console.log('# LƯU Ý: giá trị cờ in ở trên là của TIẾN TRÌNH CHẠY SCRIPT; tiến trình server có thể khác nếu script không chạy trong cùng container.');
console.log('# stt | maDung | maRa | muc | N P D | status | gates | timTruoc.nhom | chanChotSom | canCuCauHoi | cauHoi | ms | provider');

let stt = 0;
let daGuiHttp = false;
for (const c of ca) {
  for (let l = 0; l < lap; l++) {
    stt += 1;
    if (tiep && caDaXong.has(stt)) continue;
    if (daGuiHttp && gian > 0) await ngu(gian);
    daGuiHttp = true;

    const dung = nz(c.maDung);
    let j = null;
    let loi = null;
    let http = 0;
    let ms = 0;
    let soLanThuLai = 0;

    for (let lan = 0; lan <= thuLaiToiDa; lan += 1) {
      if (lan > 0) {
        soLanThuLai = lan;
        if (choThuLaiMs > 0) await ngu(choThuLaiMs);
      }
      j = null;
      loi = null;
      http = 0;
      let errObj = null;
      const t0 = Date.now();
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(khoa ? { Authorization: `Bearer ${khoa}` } : {}) },
          body: JSON.stringify({ tenHang: c.tenHang, ...(c.chatLieu ? { chatLieu: c.chatLieu } : {}), ...(c.congDung ? { congDung: c.congDung } : {}), ...(debug ? { debug: true } : {}) }),
          signal: AbortSignal.timeout(hetGio),
        });
        http = r.status;
        j = await r.json().catch(() => null);
        if (!r.ok && (http === 502 || http === 503 || !j?.status)) {
          loi = `HTTP ${http}${j?.error || j?.detail ? ` ${clip(anBiMat(j.error || j.detail), 60)}` : ''}`;
        }
      } catch (e) {
        errObj = e;
        const maCause = e?.cause?.code ? ` (${e.cause.code})` : '';
        loi = clip(anBiMat(e?.name === 'TimeoutError' ? `hết giờ ${hetGio} ms` : `${e?.message || e}${maCause}`), 80);
      }
      ms = Date.now() - t0;
      const canThuLai = (loi || !j) && lan < thuLaiToiDa && laLoiKetNoi(errObj, http);
      if (!canThuLai) break;
    }

    if (loi || !j) {
      const textLoi = anBiMat(loi || `HTTP ${http}`);
      const banGhiLoi = {
        stt,
        maDung: dung || null,
        maRa: null,
        muc: 0,
        nhom: null,
        pn6: null,
        dong: null,
        status: `LOI(${textLoi})`,
        cached: false,
        provider: null,
        ms,
        loi: textLoi,
        soLanThuLai,
        gates: '-',
        canCuCauHoi: '-',
        timTruocCo: false,
        timTruocTrung: false,
        chanChotSom: [],
      };
      ketQuaTheoStt.set(stt, banGhiLoi);
      if (tepRa) appendFileSync(tepRa, `${JSON.stringify(banGhiLoi)}\n`, 'utf8');
      console.log([stt, dung || '-', '-', '-', '- - -', banGhiLoi.status, '-', '-', '-', '-', '-', ms, '-'].join(' | '));
      continue;
    }

    const ra = nz(j.results?.[0]?.hs || j.results?.[0]?.hsCode);
    const muc = ra.length >= 8 ? 8 : ra.length >= 6 ? 6 : ra.length >= 4 ? 4 : 0;
    const so = (n) => (!dung || dung.length < n ? '-' : (ra.length >= n && ra.slice(0, n) === dung.slice(0, n) ? '1' : '0'));
    const [N, P, D] = [so(4), so(6), so(8)];
    const boolTu = (v) => (v === '1' ? true : v === '0' ? false : null);
    const e = j.engine || {};
    const tt = e.timTruoc || null;
    const chan = [...new Set((Array.isArray(e.gates) ? e.gates : []).flatMap((g) => g?.chanChotSom || []))];
    const hoi = (j.nextAction?.questions || []).slice(0, 2).map((q) => clip(q.questionVi || q.question || q.fact || '', 70)).filter(Boolean);
    const canCu = j.nextAction?.canCuCauHoi || '-';
    const provider = e.provider || (e.providers || []).slice(-1)[0] || '-';
    const gatesStr = gatesGon(e.gates);
    const timTruocCo = Boolean(tt?.nhom?.length);
    const timTruocTrung = timTruocCo && dung.length >= 4 && tt.nhom.includes(dung.slice(0, 4));

    const banGhi = {
      stt,
      maDung: dung || null,
      maRa: ra || null,
      muc,
      nhom: boolTu(N),
      pn6: boolTu(P),
      dong: boolTu(D),
      status: j.status || '?',
      cached: Boolean(j.cached),
      provider,
      ms,
      loi: null,
      soLanThuLai,
      gates: gatesStr,
      canCuCauHoi: canCu,
      timTruocCo,
      timTruocTrung,
      chanChotSom: chan,
    };
    ketQuaTheoStt.set(stt, banGhi);
    if (tepRa) appendFileSync(tepRa, `${JSON.stringify(banGhi)}\n`, 'utf8');

    console.log([
      stt, dung || '-', ra || '-', muc || '-', `${N} ${P} ${D}`, `${j.status || '?'}${j.cached ? '(đệm)' : ''}`, gatesStr,
      tt ? `${(tt.nhom || []).join(',') || tt.trangThai}${tt.deNham?.length ? ` +${tt.deNham.join(',')}` : ''}` : '-',
      chan.join(',') || '-', canCu, hoi.join(' ‖ ') || '-', ms, provider,
    ].join(' | '));
  }
}

if (tepRa) {
  const sap = [...ketQuaTheoStt.values()].sort((a, b) => a.stt - b.stt);
  writeFileSync(tepRa, sap.map((r) => `${JSON.stringify(r)}\n`).join(''), 'utf8');
}

const tong = { luot: 0, loi: 0, coMa: 0, cham: 0, dungNhom: 0, dungPn: 0, dungDong: 0, muc: { 4: 0, 6: 0, 8: 0 }, status: {}, canCu: {}, timTruocCo: 0, timTruocTrung: 0, chanChotSom: 0, ms: [], provider: {} };
const theoProvider = new Map();

for (const r of [...ketQuaTheoStt.values()].sort((a, b) => a.stt - b.stt)) {
  tong.luot += 1;
  if (typeof r.ms === 'number') tong.ms.push(r.ms);
  const biLoi = Boolean(r.loi) || String(r.status || '').startsWith('LOI');
  if (biLoi) {
    tong.loi += 1;
    continue;
  }
  if (r.maRa) {
    tong.coMa += 1;
    if (r.muc) tong.muc[r.muc] = (tong.muc[r.muc] || 0) + 1;
  }
  if (r.nhom !== null && r.nhom !== undefined) {
    tong.cham += 1;
    if (r.nhom === true) tong.dungNhom += 1;
    if (r.pn6 === true) tong.dungPn += 1;
    if (r.dong === true) tong.dungDong += 1;
  }
  const st = r.status || '?';
  tong.status[st] = (tong.status[st] || 0) + 1;
  const cc = r.canCuCauHoi || '-';
  tong.canCu[cc] = (tong.canCu[cc] || 0) + 1;
  const pv = r.provider || '-';
  tong.provider[pv] = (tong.provider[pv] || 0) + 1;
  if (r.timTruocCo) {
    tong.timTruocCo += 1;
    if (r.timTruocTrung) tong.timTruocTrung += 1;
  }
  if (Array.isArray(r.chanChotSom) && r.chanChotSom.length) tong.chanChotSom += 1;

  if (!theoProvider.has(pv)) {
    theoProvider.set(pv, { provider: pv, luot: 0, cham: 0, dungNhom: 0, dungPn: 0, dungDong: 0, ms: [] });
  }
  const tp = theoProvider.get(pv);
  tp.luot += 1;
  if (typeof r.ms === 'number') tp.ms.push(r.ms);
  if (r.nhom !== null && r.nhom !== undefined) {
    tp.cham += 1;
    if (r.nhom === true) tp.dungNhom += 1;
    if (r.pn6 === true) tp.dungPn += 1;
    if (r.dong === true) tp.dungDong += 1;
  }
}

const pct = (a, b) => (b ? `${a}/${b} = ${(100 * a / b).toFixed(1)}%` : '-');
const trungVi = (arr) => {
  if (!arr.length) return '-';
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const xep = [...tong.ms].sort((a, b) => a - b);
console.log('# ───── TỔNG HỢP ─────');
console.log(`# lượt ${tong.luot} | lỗi/hết giờ ${tong.loi} | có mã ${tong.coMa} (4 số: ${tong.muc[4] || 0}, 6 số: ${tong.muc[6] || 0}, 8 số: ${tong.muc[8] || 0})`);
console.log(`# đúng NHÓM ${pct(tong.dungNhom, tong.cham)} | đúng PHÂN NHÓM ${pct(tong.dungPn, tong.cham)} | đúng DÒNG ${pct(tong.dungDong, tong.cham)}  (mẫu số = lượt có maDung và không lỗi; lượt lỗi không tính)`);
console.log(`# status ${JSON.stringify(tong.status)} | canCuCauHoi ${JSON.stringify(tong.canCu)} | provider ${JSON.stringify(tong.provider)}`);
console.log(`# timTruoc: có ứng viên ${pct(tong.timTruocCo, tong.luot - tong.loi)}; nhóm đúng nằm trong ứng viên ${pct(tong.timTruocTrung, tong.timTruocCo)} | lượt có chanChotSom ${pct(tong.chanChotSom, tong.luot - tong.loi)}`);
console.log(`# ms: trung vị ${xep[Math.floor(xep.length / 2)] ?? '-'} | p90 ${xep[Math.floor(xep.length * 0.9)] ?? '-'} | lớn nhất ${xep[xep.length - 1] ?? '-'}`);

const dsProvider = [...theoProvider.values()].sort((a, b) => b.luot - a.luot || (a.provider < b.provider ? -1 : a.provider > b.provider ? 1 : 0));
if (dsProvider.length) {
  console.log('# ───── THEO MÔ HÌNH (provider) ─────');
  console.log('# provider | lượt | đúng NHÓM | đúng PHÂN NHÓM | đúng DÒNG | trung vị ms');
  for (const tp of dsProvider) {
    console.log(`# ${tp.provider} | ${tp.luot} | ${pct(tp.dungNhom, tp.cham)} | ${pct(tp.dungPn, tp.cham)} | ${pct(tp.dungDong, tp.cham)} | ${trungVi(tp.ms)}`);
  }
}
