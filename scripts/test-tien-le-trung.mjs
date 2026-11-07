// Test tra trùng TB-TCHQ — #1103 + #1136 (CJS, nối classify)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { doGiong, chuanHoa, timTrung } = require('../lib/tien-le-trung-tim.js');

test('chuanHoa: bỏ dấu câu, thường hoá', () => {
  assert.equal(chuanHoa('Bơm nước, một tầng! (trục ngang)'), 'bơm nước một tầng trục ngang');
});

test('doGiong: câu giống → điểm cao', () => {
  const d = doGiong('khóa nhựa buộc chặt hai đầu rời', 'Khóa nhựa buộc chặt hai đầu rời điều chỉnh');
  assert.ok(d > 0.4, `điểm ${d} > 0.4`);
});

test('doGiong: câu khác → điểm thấp', () => {
  const d = doGiong('bơm nước ly tâm', 'khóa nhựa buộc dây đai');
  assert.ok(d < 0.2, `điểm ${d} < 0.2`);
});

test('timTrung: tìm đúng TB', () => {
  const data = { '39269099': [{ sourceType: 'TB-TCHQ', tbTchqNumber: '99/TB-TCHQ', year: '2024', productName: 'Khóa nhựa buộc chặt hai đầu rời' }] };
  const kq = timTrung('khóa nhựa buộc chặt', { precedentsData: data });
  assert.equal(kq.length, 1);
  assert.equal(kq[0].ma, '39269099');
});

test('timTrung: TB cũ gắn bieuCu', () => {
  const data = { '84814010': [{ sourceType: 'TB-TCHQ', tbTchqNumber: '123/TB-TCHQ', year: '2020', productName: 'van an toàn đồng' }] };
  const kq = timTrung('van an toàn đồng', { precedentsData: data });
  assert.equal(kq[0].bieuCu, true);
});

test('timTrung: bỏ non-TB-TCHQ', () => {
  const data = { '84814010': [{ sourceType: 'WCO_OP', productName: 'van an toàn đồng' }] };
  assert.equal(timTrung('van an toàn đồng', { precedentsData: data }).length, 0);
});

test('timTrung: bỏ mã ngoài biểu', () => {
  const data = { '99999999': [{ sourceType: 'TB-TCHQ', productName: 'van an toàn đồng' }] };
  assert.equal(timTrung('van an toàn đồng', { precedentsData: data, bieuThueMaDung: new Set(['84814010']) }).length, 0);
});

test('cờ HS_TRA_TIEN_LE_TRUNG mặc định TẮT', () => {
  delete process.env.HS_TRA_TIEN_LE_TRUNG;
  assert.ok(!process.env.HS_TRA_TIEN_LE_TRUNG);
});

// ── #1136: tầng classify — cờ, TB bị thay, mã ngoài biểu ──
test('#1136 cờ TẮT (mặc định): withTienLeTrung không đổi phản hồi', () => {
  delete process.env.HS_TRA_TIEN_LE_TRUNG;
  const { withTienLeTrung } = require('../lib/classify.js');
  const out = { status: 'OK', results: [{ hs: '39269099', confidence: 80 }] };
  assert.deepEqual(withTienLeTrung(out, { tenHang: 'hộp mực in kim loại phun mực chứa mực in tích hợp' }), out);
});

test('#1136 cờ BẬT: tự-trùng TB thật → mã vào ứng viên + basis TIEN_LE + khối tienLeTrung', () => {
  process.env.HS_TRA_TIEN_LE_TRUNG = '1';
  try {
    const { withTienLeTrung } = require('../lib/classify.js');
    const { precedentsData } = require('../lib/data');
    let mau = null; let mauCu = null;
    for (const [ma, ds] of Object.entries(precedentsData)) {
      if (!/^\d{8}$/.test(ma)) continue;
      const r = ds.find((x) => x.sourceType === 'TB-TCHQ' && (x.productName || '').length > 80 && Number(x.year) >= 2023);
      if (r && !mau) mau = { ...r, ma };
      const c = ds.find((x) => x.sourceType === 'TB-TCHQ' && (x.productName || '').length > 80 && Number(x.year) < 2022);
      if (c && !mauCu) mauCu = { ...c, ma };
      if (mau && mauCu) break;
    }
    assert.ok(mau, 'kho phải có TB 8 số năm >= 2023');
    const out = { status: 'OK', results: [{ hs: '99999999', confidence: 10 }] };
    const kq = withTienLeTrung(out, { tenHang: mau.productName });
    assert.ok(Array.isArray(kq.tienLeTrung) && kq.tienLeTrung.length >= 1, 'có khối tienLeTrung');
    assert.ok(kq.results.some((r) => String(r.hs).replace(/\D/g, '') === mau.ma), 'mã TB vào ứng viên');
    const r = kq.results.find((x) => String(x.hs).replace(/\D/g, '') === mau.ma);
    assert.ok(r.basis?.some((b) => b.stream === 'TIEN_LE' && b.claim.includes(mau.tbTchqNumber)), 'basis TIEN_LE kèm số hiệu');
    assert.ok(!('girRulesApplied' in kq), 'không ghi girRulesApplied (luật 6)');
    assert.ok(kq.rankingSignals?.tienLeTrung?.length >= 1, 'rankingSignals có tín hiệu');
  } finally { delete process.env.HS_TRA_TIEN_LE_TRUNG; }
});

test('#1136 mã NGOÀI biểu (khối 4 số) không bao giờ trả', () => {
  process.env.HS_TRA_TIEN_LE_TRUNG = '1';
  try {
    const { withTienLeTrung } = require('../lib/classify.js');
    const out = { status: 'OK', results: [] };
    // nhãn nhựa 3919 — khoá 4 số, bị lọc bieuThueMaDung
    const kq = withTienLeTrung(out, { tenHang: 'Nhãn nhựa tự dính đã in thông tin self-adhesive printed plastic label miếng plastic phẳng tự dính từ polyethylene terephthalate dùng làm nhãn dán chai' });
    assert.ok(!kq.tienLeTrung?.some((x) => x.ma === '3919'), 'mã 4 số 3919 không trả');
  } finally { delete process.env.HS_TRA_TIEN_LE_TRUNG; }
});

test('#1136 TB bieuCu (trước 30/12/2022): chỉ hiện trong tienLeTrung, KHÔNG vào ứng viên', () => {
  process.env.HS_TRA_TIEN_LE_TRUNG = '1';
  try {
    const { withTienLeTrung } = require('../lib/classify.js');
    const { precedentsData } = require('../lib/data');
    let mauCu = null;
    for (const [ma, ds] of Object.entries(precedentsData)) {
      if (!/^\d{8}$/.test(ma)) continue;
      const c = ds.find((x) => x.sourceType === 'TB-TCHQ' && (x.productName || '').length > 80 && Number(x.year) < 2022);
      if (c) { mauCu = { ...c, ma }; break; }
    }
    if (!mauCu) return; // kho không có TB cũ — bỏ qua
    const kq = withTienLeTrung({ status: 'OK', results: [] }, { tenHang: mauCu.productName });
    const hien = (kq.tienLeTrung || []).some((x) => x.ma === mauCu.ma);
    const vaoUngVien = (kq.results || []).some((r) => String(r.hs).replace(/\D/g, '') === mauCu.ma);
    if (hien) assert.ok(!vaoUngVien || (kq.tienLeTrung.find((x) => x.ma === mauCu.ma) || {}).apDung !== false, 'bieuCu chỉ hiện, không vào ứng viên khi apDung=false');
  } finally { delete process.env.HS_TRA_TIEN_LE_TRUNG; }
});
