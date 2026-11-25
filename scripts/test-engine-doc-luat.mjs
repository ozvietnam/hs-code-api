#!/usr/bin/env node
'use strict';

// scripts/test-engine-doc-luat.mjs
// Bộ test ngoại tuyến cho M-52 (#1920): kịch bản Chương 76 tự soạn + trần prompt với kho thật (30 cụm tìm tự nghĩ) + goiLLM giả định.
// Tuyệt đối không gọi LLM thật, không đọc tệp benchmark/dữ liệu khách.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  chayDocLuat,
  KHO_THIEU_MAC_DINH,
} = require('../lib/engine-doc-luat');
const { kiemSoVet, napNguonCau } = require('../lib/so-vet');
const { phaiDoc } = require('../lib/do-thi/phai-doc');

const nguonCau = napNguonCau();

function cauGoc(cauId) {
  const s = nguonCau.traCau(cauId);
  assert.ok(s, `Thiếu câu luật gốc ${cauId} trong kho 6 tệp`);
  return s;
}

function traLoiKiemToanKhong(duLieu, chuKhach = 'đinh tán bằng hợp kim nhôm') {
  return {
    kiemCanh: duLieu.loCau.map((c) => ({
      cauId: c.cauId,
      ketQua: 'KHONG',
      chuKhach,
    })),
  };
}

/** Trả lời LOC giả: giữ các nhóm bài kiểm cần, bỏ phần còn lại gộp một lý do. */
function traLoiLoc(goi, uuTien = ['7318', '7604', '7610', '7616']) {
  const ids = goi.duLieu.ungVien.map((u) => u.h4);
  const giu = uuTien.filter((h) => ids.includes(h));
  if (!giu.length && goi.duLieu.tongLuot === 1) giu.push(...ids.slice(0, 1));
  return {
    hanhDong: 'GIU',
    nhomGiu: giu,
    boQua: [{ lyDo: 'Nhóm của hàng khác, bài kiểm giả lập', nhom: ids.filter((h) => !giu.includes(h)) }],
  };
}

/** chayDocLuat có sẵn lời đáp LOC; bài kiểm nào muốn tự đáp LOC thì gọi thẳng chayDocLuat. */
function chayThu(opts) {
  return chayDocLuat({
    ...opts,
    goiLLM: async (buoc, goi) => (buoc === 'LOC' ? traLoiLoc(goi) : opts.goiLLM(buoc, goi)),
  });
}

let passed = 0;
let failed = 0;
const ketQuaDo = [];

async function test(ten, fn) {
  try {
    const res = await fn();
    passed += 1;
    console.log(`PASS: ${ten}`);
    if (res && typeof res === 'object' && 'soLuotLLM' in res) {
      ketQuaDo.push({
        ten,
        trangThai: res.trangThai,
        bac: res.bac,
        ma: res.ma,
        soLuotLLM: res.soLuotLLM,
        soKyTuDaDoc: res.soKyTuDaDoc,
        thongKeBuoc: res.thongKeBuoc,
      });
    }
  } catch (err) {
    failed += 1;
    console.error(`FAIL: ${ten}`);
    console.error(`  ${err.stack || err.message}`);
  }
}

async function runAll() {
  // 1. Đủ dữ kiện → 8 số (7616 -> 761610 -> 76161090) + đạt kiemSoVet + đo lượt/ký tự
  await test('1. Đủ dữ kiện Chương 76 -> 8 số 76161090 đạt kiemSoVet', async () => {
    const nhietDoSeen = [];
    const res = await chayThu({
      moTa: 'Đinh tán rỗng bằng hợp kim nhôm, dùng để ghép nối các tấm kim loại trong lắp ráp thân vỏ máy',
      goiLLM: async (buoc, goi) => {
        nhietDoSeen.push(goi.nhietDo);
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [
              { y: 'đinh tán bằng hợp kim nhôm', chuKhach: 'Đinh tán rỗng bằng hợp kim nhôm' },
            ],
            chuaBiet: [],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({
              nhom: h,
              lyDo: `Không chọn nhóm ${h} vì hàng là đinh tán bằng hợp kim nhôm thuộc 76.16.`,
            })),
          };
        }
        if (buoc === 'KIEM') {
          return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán rỗng bằng hợp kim nhôm');
        }
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán rỗng bằng hợp kim nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán rỗng bằng hợp kim nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Hàng là đinh tán, không phải loại khác' }],
            };
          }
          if (goi.duLieu.nut === 'bieu:761610') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:76161090',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
              chuKhach: 'Đinh tán rỗng bằng hợp kim nhôm',
              daSoKhongChon: [
                { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh hoặc đinh ghim' },
                { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải đinh vít, bu lông, đai ốc' },
              ],
            };
          }
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(res.trangThai, 'KET_LUAN');
    assert.equal(res.bac, 8);
    assert.equal(res.ma, '76161090');
    assert.deepEqual(res.loiSo, []);
    assert.ok(res.soLuotLLM >= 6, `Phải >= 6 lượt LLM, nhận ${res.soLuotLLM}`);
    assert.ok(res.soKyTuDaDoc > 1000, 'Phải đo soKyTuDaDoc thực');
    assert.ok(nhietDoSeen.every((t) => t === 0), 'Mọi lượt LLM phải đặt nhietDo = 0');
    assert.ok(res.thieuKho.includes(KHO_THIEU_MAC_DINH.NGHIA_CANH));
    assert.ok(res.thieuKho.includes(KHO_THIEU_MAC_DINH.TOM_TAT));
    assert.ok(res.thieuKho.includes(KHO_THIEU_MAC_DINH.TIM_NGHIA));
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 2. Mô tả rỗng → dừng HOI ở bậc 0
  await test('2. Mô tả rỗng -> dừng HOI ở bậc 0, không đoán mã', async () => {
    let called = 0;
    const res = await chayThu({
      moTa: '   ',
      goiLLM: async () => { called += 1; return {}; },
    });
    assert.equal(called, 0);
    assert.equal(res.trangThai, 'HOI');
    assert.equal(res.bac, 0);
    assert.equal(res.ma, null);
    assert.ok(res.hoi?.cauHoi);
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 3. Tìm rỗng -> dừng HOI ở bậc 0
  await test('3. Tìm rỗng từ timLuat -> dừng HOI ở bậc 0, đạt kiemSoVet', async () => {
    const res = await chayThu({
      moTa: 'Vật mẫu xyzabc999 không rõ chất liệu và công dụng',
      goiLLM: async (buoc) => {
        assert.equal(buoc, 'VAO_CUA');
        return {
          banChat: [{ y: 'vật mẫu chưa rõ', chuKhach: 'Vật mẫu xyzabc999' }],
          chuaBiet: ['chất liệu', 'công dụng'],
          cumTim: ['xyzabc999khôngtồntại'],
        };
      },
    });
    assert.equal(res.trangThai, 'HOI');
    assert.equal(res.bac, 0);
    assert.equal(res.ma, null);
    assert.equal(res.soLuotLLM, 1);
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 4. TIM_LAI tối đa 2 lần; lần 3 bị từ chối và cho sửa lại
  await test('4. TIM_LAI tối đa 2 lần, lần 3 bị chặn và ép sửa sang DOC_KY', async () => {
    let uvCount = 0;
    let promptLan3 = '';
    const res = await chayThu({
      moTa: 'Đinh tán nhôm loại rỗng chuyên lắp ráp',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'chi tiết nhôm', chuKhach: 'Đinh tán nhôm' }],
            chuaBiet: [],
            cumTim: ['nhôm'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          uvCount += 1;
          if (uvCount <= 2) {
            return { hanhDong: 'TIM_LAI', cumTim: ['đinh tán'] };
          }
          if (uvCount === 3) {
            // Cố xin TIM_LAI lần 3 (khi choPhepTimLai === false) → phải bị từ chối và gọi sửa 1 lần
            return { hanhDong: 'TIM_LAI', cumTim: ['nhôm thanh'] };
          }
          promptLan3 = goi.prompt;
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({
              nhom: h,
              lyDo: `Bỏ nhóm ${h} vì hàng là đinh tán nhôm.`,
            })),
          };
        }
        if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán nhôm');
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Không phải loại khác' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76161090',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
            chuKhach: 'Đinh tán nhôm',
            daSoKhongChon: [
              { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh' },
              { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải bu lông/vít' },
            ],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(uvCount, 4);
    assert.match(promptLan3, /LẦN TRƯỚC BỊ TRẢ LẠI VÌ:.*TIM_LAI/);
    assert.equal(res.trangThai, 'KET_LUAN');
    assert.equal(res.ma, '76161090');
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 5. Bắt buộc giải thích vì sao bỏ từng nhóm còn lại ở CHON_UNG_VIEN
  await test('5. CHON_UNG_VIEN thiếu boQua cho nhóm còn lại bị từ chối và bắt bổ sung', async () => {
    let uvLan = 0;
    let loiThay = '';
    const res = await chayThu({
      moTa: 'Đinh tán bằng nhôm dùng trong lắp ráp',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán bằng nhôm' }],
            chuaBiet: [],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          uvLan += 1;
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          if (uvLan === 1) {
            return { hanhDong: 'DOC_KY', nhomChon: ['7616'], boQua: [] };
          }
          loiThay = goi.prompt;
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({
              nhom: h,
              lyDo: `Không chọn ${h} do chất liệu là nhôm, không phải sắt thép hay đồng.`,
            })),
          };
        }
        if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán bằng nhôm');
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán bằng nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Hàng là đinh tán' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76161090',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [
              { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh ghim' },
              { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải đinh vít/bu lông' },
            ],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(uvLan, 2);
    assert.match(loiThay, /vì sao bỏ nhóm còn lại/);
    assert.equal(res.trangThai, 'KET_LUAN');
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 6. Gộp cạnh theo cauId & chia lô <= 25 câu ở KIEM
  await test('6. Gộp theo cauId (gopTheoCau=true) và chia nhiều lô <= cauMoiLuotKiem', async () => {
    const loSizes = [];
    const seenCauIds = new Set();
    const res = await chayThu({
      moTa: 'Đinh tán bằng nhôm rỗng',
      gioiHan: { cauMoiLuotKiem: 10 },
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán bằng nhôm' }],
            chuaBiet: [],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({ nhom: h, lyDo: `Bỏ ${h} vì chất liệu nhôm.` })),
          };
        }
        if (buoc === 'KIEM') {
          loSizes.push(goi.duLieu.loCau.length);
          for (const c of goi.duLieu.loCau) {
            assert.equal(seenCauIds.has(c.cauId), false, `Không được lặp lại cauId ${c.cauId}`);
            seenCauIds.add(c.cauId);
          }
          return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán bằng nhôm');
        }
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán bằng nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Là đinh tán' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76161090',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [
              { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh' },
              { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải bu lông' },
            ],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.ok(loSizes.length >= 2, `Phải chia thành >= 2 lô khi cauMoiLuotKiem=10, nhận ${loSizes}`);
    assert.ok(loSizes.every((n) => n <= 10), `Mỗi lô <= 10 câu, nhận ${loSizes}`);
    const buocKiem = res.so.cacBuoc.find((b) => b.loai === 'KIEM');
    assert.ok(buocKiem.kiemCanh.every((k) => k.gopTheoCau === true));
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 7. XUONG_CAP không lộ cháu & chặn hành vi chọn nhảy cấp
  await test('7. XUONG_CAP chỉ mở 1 cấp con trực tiếp (không lộ cháu) và chặn nhảy cấp', async () => {
    const promptsCap1 = [];
    let lanCap1 = 0;
    const res = await chayThu({
      moTa: 'Đinh tán nhôm rỗng đầu tròn',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán nhôm' }],
            chuaBiet: [],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({ nhom: h, lyDo: `Bỏ ${h}` })),
          };
        }
        if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán nhôm');
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            promptsCap1.push(goi.prompt);
            assert.deepEqual(goi.duLieu.capDuoi.map((c) => c.id), ['bieu:761610', 'bieu:76169']);
            // Kiểm không lộ các cháu trong prompt (trước khi phản hồi lỗi từ lần gọi sai của LLM)
            if (lanCap1 === 0) {
              assert.equal(goi.prompt.includes('76161090'), false);
            }
            assert.equal(goi.prompt.includes('761699'), false);
            lanCap1 += 1;
            if (lanCap1 === 1) {
              // Thử nhảy cấp -> phải bị chặn
              return {
                hanhDong: 'CHON',
                nutDich: 'bieu:76161090',
                quyTacGir: 'QT6',
                trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
                chuKhach: 'Đinh tán nhôm',
              };
            }
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Đinh tán thuộc 7616.10' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76161090',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
            chuKhach: 'Đinh tán nhôm',
            daSoKhongChon: [
              { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh' },
              { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải vít' },
            ],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(lanCap1, 2);
    assert.match(promptsCap1[1], /nằm ngoài danh sách con cùng cấp/);
    assert.equal(res.ma, '76161090');
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 8. Nạp tomTat (M-36 BO_TRO) + timNghiaFn (M-37) → rút gọn thieuKho và hiện tachVoi ở XUONG_CAP
  await test('8. Nạp kho.tomTat (M-36) & timNghiaFn (M-37) giảm thieuKho và hiện tachVoi', async () => {
    let sawTomTatUv = false;
    let sawTachVoi = false;
    const fakeTomTat = new Map([
      ['bieu:7616', {
        nut: 'bieu:7616',
        nhan: 'BO_TRO',
        gom: [{ y: 'đinh, bu lông, đinh tán bằng nhôm', cau: ['bieu:761610#1'] }],
        khongGom: [{ y: 'kết cấu nhôm thuộc 76.10', den: ['bieu:7610'] }],
        tachVoi: [{ voi: 'bieu:76169', y: 'nhóm chốt/đinh tán (7616.10) vs sản phẩm khác (7616.9)', cau: ['bieu:761610#1'] }],
      }],
    ]);
    const res = await chayThu({
      moTa: 'Đinh tán bằng nhôm',
      kho: {
        tomTat: fakeTomTat,
        timNghiaFn: () => [],
      },
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán bằng nhôm' }],
            chuaBiet: [],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          sawTomTatUv = goi.prompt.includes('tóm tắt(BO_TRO');
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({ nhom: h, lyDo: `Bỏ ${h}` })),
          };
        }
        if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán bằng nhôm');
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            sawTachVoi = goi.prompt.includes('TÁCH VỚI CHA (bieu:7616)');
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán bằng nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Đinh tán thuộc 7616.10' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76161090',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [
              { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh' },
              { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải bu lông' },
            ],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(sawTomTatUv, true);
    assert.equal(sawTachVoi, true);
    assert.equal(res.thieuKho.includes(KHO_THIEU_MAC_DINH.TOM_TAT), false);
    assert.equal(res.thieuKho.includes(KHO_THIEU_MAC_DINH.TIM_NGHIA), false);
    assert.equal(res.thieuKho.includes(KHO_THIEU_MAC_DINH.NGHIA_CANH), true);
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 9. CHUYEN_HUONG khi cạnh loại trừ THOA (7604 -> nhom:7604:ct:3#1 -> 7610) & cấm chọn lại 7604
  await test('9. CHUYEN_HUONG 7604 -> 7610 khi THOA loại trừ, cấm chọn lại nhóm đã loại', async () => {
    let lanChon4 = 0;
    const res = await chayThu({
      moTa: 'Khung cửa bằng thanh nhôm định hình đã gia công sẵn thành kết cấu lắp dựng',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'kết cấu nhôm lắp dựng từ thanh nhôm', chuKhach: 'Khung cửa bằng thanh nhôm' }],
            chuaBiet: [],
            cumTim: ['nhôm thanh'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7604'],
            boQua: uvs.filter((h) => h !== '7604').map((h) => ({ nhom: h, lyDo: `Kiểm tra 7604 trước do có chữ thanh nhôm.` })),
          };
        }
        if (buoc === 'KIEM') {
          if (goi.duLieu.nut === 'bieu:7604') {
            return {
              kiemCanh: goi.duLieu.loCau.map((c) => ({
                cauId: c.cauId,
                ketQua: c.cauId === 'nhom:7604:ct:3#1' ? 'THOA' : 'KHONG',
                chuKhach: 'đã gia công sẵn thành kết cấu lắp dựng',
                nutDich: c.cauId === 'nhom:7604:ct:3#1' ? 'bieu:7610' : undefined,
              })),
              chuyenHuong: {
                nutDich: 'bieu:7610',
                trich: [{ cauId: 'nhom:7604:ct:3#1', doan: cauGoc('nhom:7604:ct:3#1') }],
                lyDo: 'Hàng đã thành kết cấu khung cửa nên bị loại khỏi 76.04 sang 76.10.',
              },
            };
          }
          return traLoiKiemToanKhong(goi.duLieu, 'Khung cửa bằng thanh nhôm');
        }
        if (buoc === 'CHON_NHOM_4') {
          lanChon4 += 1;
          if (lanChon4 === 1) {
            // Thử chọn lại nhóm 7604 đã bị loại → phải bị chặn!
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:7604',
              quyTacGir: 'QT1',
              trich: [{ cauId: 'bieu:7604#1', doan: cauGoc('bieu:7604#1') }],
              chuKhach: 'Khung cửa bằng thanh nhôm',
              daSoKhongChon: [],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7610',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7610#1', doan: cauGoc('bieu:7610#1') }],
            chuKhach: 'Khung cửa bằng thanh nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7610') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761010',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761010#1', doan: cauGoc('bieu:761010#1') }],
              chuKhach: 'Khung cửa bằng thanh nhôm',
              daSoKhongChon: [{ nut: 'bieu:761090', viSaoKhongChon: 'Là khung cửa ra vào' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76101010',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76101010#1', doan: cauGoc('bieu:76101010#1') }],
            chuKhach: 'Khung cửa bằng thanh nhôm',
            daSoKhongChon: [{ nut: 'bieu:76101090', viSaoKhongChon: 'Là khung cửa ra vào' }],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(lanChon4, 2);
    assert.equal(res.trangThai, 'KET_LUAN');
    assert.equal(res.ma, '76101010');
    assert.ok(res.so.cacBuoc.some((b) => b.loai === 'CHUYEN_HUONG' && b.quyetDinh.nutDich === 'bieu:7610'));
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 10. CHUA_BIET ở bước KIEM → dừng HOI ở bậc 4 kèm 2 nhánh phân vân
  await test('10. CHUA_BIET ở KIEM -> dừng HOI ở bậc 4, đạt kiemSoVet', async () => {
    const res = await chayThu({
      moTa: 'Thanh nhôm cắt sẵn kích thước',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'thanh nhôm cắt sẵn', chuKhach: 'Thanh nhôm cắt sẵn' }],
            chuaBiet: ['đã thành bộ phận kết cấu hay chưa'],
            cumTim: ['nhôm thanh'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7604'],
            boQua: uvs.filter((h) => h !== '7604').map((h) => ({ nhom: h, lyDo: `Xem xét 7604 trước` })),
          };
        }
        if (buoc === 'KIEM') {
          return {
            kiemCanh: goi.duLieu.loCau.map((c) => ({
              cauId: c.cauId,
              ketQua: c.cauId === 'nhom:7604:ct:3#1' ? 'CHUA_BIET' : 'KHONG',
              chuKhach: 'Thanh nhôm cắt sẵn kích thước',
            })),
            hoi: {
              cauHoi: 'Thanh nhôm đã gia công khoan lỗ/lắp ghép thành bộ phận kết cấu công trình (76.10) chưa?',
              duKienThieu: ['mức độ gia công kết cấu'],
              trich: [{ cauId: 'nhom:7604:ct:3#1', doan: cauGoc('nhom:7604:ct:3#1') }],
            },
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(res.trangThai, 'HOI');
    assert.equal(res.bac, 4);
    assert.equal(res.ma, '7604');
    assert.ok(res.hoi.cauHoi.includes('76.10'));
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 11. HOI ở bước XUONG_CAP (dừng ở 761610 khi thiếu dữ kiện phân tách 8 số)
  await test('11. HOI ở XUONG_CAP (bậc 8, dừng tại 761610) đạt kiemSoVet', async () => {
    const res = await chayThu({
      moTa: 'Chi tiết ghép nối bằng nhôm (chưa rõ là bu lông, đinh hay đinh tán)',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'chi tiết ghép nối bằng nhôm', chuKhach: 'Chi tiết ghép nối bằng nhôm' }],
            chuaBiet: ['dạng ren hay không ren, là đinh hay đinh tán'],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({ nhom: h, lyDo: `Chất liệu nhôm` })),
          };
        }
        if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Chi tiết ghép nối bằng nhôm');
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Chi tiết ghép nối bằng nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Chi tiết ghép nối bằng nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Chi tiết ghép nối' }],
            };
          }
          return {
            hanhDong: 'HOI',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
            chuKhach: 'chưa rõ là bu lông, đinh hay đinh tán',
            cauHoi: 'Chi tiết này là đinh/đinh ghim (7616.10.10), đinh vít/bu lông/đai ốc (7616.10.20) hay đinh tán (7616.10.90)?',
            duKienThieu: ['chủng loại chi tiết kẹp/ghép'],
            haiNhanhPhanVan: ['bieu:76161020', 'bieu:76161090'],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(res.trangThai, 'HOI');
    assert.equal(res.bac, 8);
    assert.equal(res.ma, '761610');
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 12. QUAY_LUI ở XUONG_CAP (vào nhầm 76169 -> quay lui về 7616 -> xuống 761610 -> 76161090)
  await test('12. QUAY_LUI từ 76169 về 7616 đòi lyDo và chốt 76161090 đạt kiemSoVet', async () => {
    let daVao76169 = false;
    let thuThieuLyDo = false;
    const res = await chayThu({
      moTa: 'Đinh tán nhôm loại rỗng',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán nhôm' }],
            chuaBiet: [],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({ nhom: h, lyDo: `Bỏ ${h}` })),
          };
        }
        if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán nhôm');
        if (buoc === 'CHON_NHOM_4') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616' && !daVao76169) {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:76169',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:76169#1', doan: cauGoc('bieu:76169#1') }],
              chuKhach: 'Đinh tán nhôm',
              daSoKhongChon: [{ nut: 'bieu:761610', viSaoKhongChon: 'Chưa thấy là đinh tán (bài kiểm đi nhầm)' }],
            };
          }
          if (goi.duLieu.nut === 'bieu:76169') {
            daVao76169 = true;
            if (!thuThieuLyDo) {
              thuThieuLyDo = true;
              return {
                hanhDong: 'QUAY_LUI',
                nutDich: 'bieu:7616',
                lyDo: 'ngắn',
                quyTacGir: 'QT6',
                trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
                chuKhach: 'Đinh tán nhôm',
              };
            }
            return {
              hanhDong: 'QUAY_LUI',
              nutDich: 'bieu:7616',
              lyDo: 'Đinh tán được định danh trực tiếp ở nhánh 7616.10, không ở nhánh Loại khác 7616.9',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán nhôm',
            };
          }
          if (goi.duLieu.nut === 'bieu:7616' && daVao76169) {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Đã quay lui từ 76169 vì không phù hợp' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76161090',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
            chuKhach: 'Đinh tán nhôm',
            daSoKhongChon: [
              { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh' },
              { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải bu lông/vít' },
            ],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(thuThieuLyDo, true);
    assert.equal(res.trangThai, 'KET_LUAN');
    assert.equal(res.ma, '76161090');
    assert.ok(res.so.cacBuoc.some((b) => b.loai === 'QUAY_LUI' && b.quyetDinh.nutDich === 'bieu:7616'));
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 13. Cấm QT3 khi QT1 đã còn 1 nhóm & đòi lyDoGir1ChuaDu khi dùng ngoài QT1
  await test('13. Cấm QT3 khi chỉ còn 1 nhóm sống và ép sửa về QT1', async () => {
    let lanC4 = 0;
    let promptLan2 = '';
    const res = await chayThu({
      moTa: 'Đinh tán bằng nhôm nguyên khối',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán bằng nhôm' }],
            chuaBiet: [],
            cumTim: ['đinh tán'],
          };
        }
        if (buoc === 'CHON_UNG_VIEN') {
          const uvs = goi.duLieu.ungVien.map((u) => u.h4);
          return {
            hanhDong: 'DOC_KY',
            nhomChon: ['7616'],
            boQua: uvs.filter((h) => h !== '7616').map((h) => ({ nhom: h, lyDo: `Bỏ ${h}` })),
          };
        }
        if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán bằng nhôm');
        if (buoc === 'CHON_NHOM_4') {
          lanC4 += 1;
          if (lanC4 === 1) {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:7616',
              quyTacGir: 'QT3b',
              trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
              chuKhach: 'Đinh tán bằng nhôm',
              daSoKhongChon: [],
            };
          }
          promptLan2 = goi.prompt;
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:7616',
            quyTacGir: 'QT1',
            trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [],
          };
        }
        if (buoc === 'XUONG_CAP') {
          if (goi.duLieu.nut === 'bieu:7616') {
            return {
              hanhDong: 'CHON',
              nutDich: 'bieu:761610',
              quyTacGir: 'QT6',
              trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
              chuKhach: 'Đinh tán bằng nhôm',
              daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Là đinh tán' }],
            };
          }
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:76161090',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
            chuKhach: 'Đinh tán bằng nhôm',
            daSoKhongChon: [
              { nut: 'bieu:76161010', viSaoKhongChon: 'Không phải đinh' },
              { nut: 'bieu:76161020', viSaoKhongChon: 'Không phải bu lông' },
            ],
          };
        }
        throw new Error(`Bước bất ngờ: ${buoc}`);
      },
    });
    assert.equal(lanC4, 2);
    assert.match(promptLan2, /cấm viện dẫn QT3/);
    assert.equal(res.ma, '76161090');
    assert.equal(kiemSoVet(res.so).dat, true);
    return res;
  });

  // 14. Lỗi kiểm sổ cuối -> SUA_BUOC 1 lần; sửa được thì KET_LUAN, vẫn sai thì SO_KHONG_DAT (ma=null)
  await test('14. SUA_BUOC sửa 1 lần được -> KET_LUAN; sửa vẫn hỏng -> SO_KHONG_DAT (ma=null)', async () => {
    let kiemLan = 0;
    const goiChuan = async (buoc, goi) => {
      if (buoc === 'VAO_CUA') {
        return {
          banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán nhôm' }],
          chuaBiet: [],
          cumTim: ['đinh tán'],
        };
      }
      if (buoc === 'CHON_UNG_VIEN') {
        const uvs = goi.duLieu.ungVien.map((u) => u.h4);
        return {
          hanhDong: 'DOC_KY',
          nhomChon: ['7616'],
          boQua: uvs.filter((h) => h !== '7616').map((h) => ({ nhom: h, lyDo: `Bỏ ${h}` })),
        };
      }
      if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'Đinh tán nhôm');
      if (buoc === 'CHON_NHOM_4') {
        return {
          hanhDong: 'CHON',
          nutDich: 'bieu:7616',
          quyTacGir: 'QT1',
          trich: [{ cauId: 'bieu:7616#1', doan: cauGoc('bieu:7616#1') }],
          chuKhach: 'Đinh tán nhôm',
          daSoKhongChon: [],
        };
      }
      if (buoc === 'XUONG_CAP') {
        if (goi.duLieu.nut === 'bieu:7616') {
          return {
            hanhDong: 'CHON',
            nutDich: 'bieu:761610',
            quyTacGir: 'QT6',
            trich: [{ cauId: 'bieu:761610#1', doan: cauGoc('bieu:761610#1') }],
            chuKhach: 'Đinh tán nhôm',
            daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: 'Bỏ 76169' }],
          };
        }
        return {
          hanhDong: 'CHON',
          nutDich: 'bieu:76161090',
          quyTacGir: 'QT6',
          trich: [{ cauId: 'bieu:76161090#1', doan: cauGoc('bieu:76161090#1') }],
          chuKhach: 'Đinh tán nhôm',
          daSoKhongChon: [
            { nut: 'bieu:76161010', viSaoKhongChon: 'Bỏ 76161010' },
            { nut: 'bieu:76161020', viSaoKhongChon: 'Bỏ 76161020' },
          ],
        };
      }
      return { buocSua: goi.duLieu?.buocHong };
    };

    // 14a: Lần 1 kiểm sổ giả lỗi -> SUA_BUOC cứu được -> KET_LUAN
    let suaCountA = 0;
    const resA = await chayThu({
      moTa: 'Đinh tán nhôm',
      kho: {
        kiemSoVetFn: (sv, opts) => {
          kiemLan += 1;
          if (kiemLan === 1) {
            return { dat: false, loi: [{ buoc: sv.cacBuoc.length - 1, ma: 'TEST_SUA' }], thieu: ['Thiếu trích thử SUA_BUOC'] };
          }
          return kiemSoVet(sv, opts);
        },
      },
      goiLLM: async (buoc, goi) => {
        if (buoc === 'SUA_BUOC') {
          suaCountA += 1;
          return { buocSua: goi.duLieu.buocHong };
        }
        return goiChuan(buoc, goi);
      },
    });
    assert.equal(suaCountA, 1);
    assert.equal(resA.trangThai, 'KET_LUAN');
    assert.equal(resA.ma, '76161090');

    // 14b: SUA_BUOC vẫn hỏng -> SO_KHONG_DAT (ma=null, bac=0)
    let suaCountB = 0;
    const resB = await chayThu({
      moTa: 'Đinh tán nhôm',
      kho: {
        kiemSoVetFn: (sv) => ({
          dat: false,
          loi: [{ buoc: sv.cacBuoc.length - 1, ma: 'LOI_KHONG_SUA_DUOC' }],
          thieu: ['Vẫn hỏng sau khi sửa bước cuối'],
        }),
      },
      goiLLM: async (buoc, goi) => {
        if (buoc === 'SUA_BUOC') {
          suaCountB += 1;
          return { buocSua: goi.duLieu.buocHong };
        }
        return goiChuan(buoc, goi);
      },
    });
    assert.equal(suaCountB, 1, 'Chỉ được cho SUA_BUOC tối đa đúng 1 lần');
    assert.equal(resB.trangThai, 'SO_KHONG_DAT');
    assert.equal(resB.bac, 0);
    assert.equal(resB.ma, null);
    assert.ok(resB.loiSo.length > 0);
    return resA;
  });

  // ── QT soát #1955: LOC / CHON, trần prompt, chú giải Phần Chương một lần, CHI_SANG ─────────────────────────────
  const coCauLoaiChiSang = 'nhom:7604:ct:3#1';

  await test('15. LOC: nhóm chỉ được nhắc ở câu loại trừ của nhóm khác vẫn có mặt kèm đúng câu đó', async () => {
    let dong = null;
    let chieu = null;
    await chayDocLuat({
      moTa: 'Thanh nhôm làm kết cấu',
      kho: {
        timLuatFn: () => ({ cuaVao: [{ nut: 'nhom:7604:ct:3', cauId: coCauLoaiChiSang, cau: cauGoc(coCauLoaiChiSang), chieu: 'LOAI', kho: 'nhom', lop: 'HUONG_DAN' }] }),
      },
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') return { banChat: [{ y: 'thanh nhôm', chuKhach: 'Thanh nhôm' }], cumTim: ['kết cấu'] };
        dong = goi.duLieu.ungVien.find((u) => u.h4 === '7610');
        chieu = /7610[\s\S]*?nhom:7604:ct:3#1\|CHI_SANG/.test(goi.prompt);
        return { hanhDong: 'HOI', cauHoi: 'dừng ở đây' };
      },
    });
    assert.ok(dong, '7610 phải có mặt');
    assert.deepEqual(dong.cauNhac.map((e) => [e.cauId, e.chieu]), [[coCauLoaiChiSang, 'CHI_SANG']]);
    assert.equal(chieu, true);
  });

  await test('16. LOC: mỗi nhóm ≤ 2 câu, mỗi câu ≤ 220 ký tự và là nguyên văn; bỏ gộp theo lý do; sót nhóm bị trả lại', async () => {
    let lan = 0;
    let soLanLoc = 0;
    const res = await chayDocLuat({
      moTa: 'Đinh tán bằng nhôm',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') return { banChat: [{ y: 'đinh tán nhôm', chuKhach: 'Đinh tán bằng nhôm' }], cumTim: ['đinh tán', 'bằng nhôm', 'nhôm thanh'] };
        if (buoc === 'LOC') {
          soLanLoc += 1;
          assert.ok(goi.duLieu.ungVien.length > 8);
          const h4s = goi.duLieu.ungVien.map((u) => u.h4);
          assert.deepEqual(h4s, [...h4s].sort(), 'xếp theo số nhóm, không xếp hạng');
          assert.equal(goi.prompt.includes('tóm tắt'), false, 'LOC không đưa tóm tắt');
          for (const u of goi.duLieu.ungVien) {
            assert.ok(u.cauNhac.length >= 1 && u.cauNhac.length <= 2);
            for (const e of u.cauNhac) {
              assert.ok(e.doan.length <= 220, `${e.cauId}: ${e.doan.length}`);
              for (const m of e.doan.split('…').map((x) => x.trim()).filter(Boolean)) {
                assert.ok(cauGoc(e.cauId).replace(/\s+/g, ' ').includes(m), `${e.cauId} không nguyên văn: ${m}`);
              }
            }
          }
          const kq = traLoiLoc(goi);
          lan += 1;
          if (lan === 1) return { ...kq, boQua: [{ ...kq.boQua[0], nhom: kq.boQua[0].nhom.slice(1) }] };
          assert.match(goi.prompt, /LẦN TRƯỚC BỊ TRẢ LẠI VÌ: LOC: thiếu giải thích vì sao bỏ nhóm còn lại/);
          assert.match(goi.prompt, /BÀI LÀM TRƯỚC/);
          return kq;
        }
        if (buoc === 'CHON_UNG_VIEN') {
          assert.ok(goi.duLieu.ungVien.length <= 8);
          return { hanhDong: 'HOI', cauHoi: 'dừng ở đây' };
        }
        throw new Error(buoc);
      },
    });
    assert.equal(soLanLoc, 2);
    const loc = res.so.cacBuoc.find((b) => b.loai === 'LOC');
    assert.equal(loc.quyetDinh.trangThai, 'LOC_GIU');
    assert.equal(loc.quyetDinh.boQua.length, 1);
    assert.equal(kiemSoVet(res.so).dat, true);
  });

  const khoiTomTat = (n) => 'Câu tóm tắt giả dài để ép chia lượt. '.repeat(Math.ceil(n / 38)).slice(0, n);
  const tomTatTo = (gom, khong) => new Map([...nguonCau.nutTheoId.keys()].filter((id) => /^bieu:\d{4}$/.test(id)).map((id) => [id, {
    nut: id,
    gom: [{ y: khoiTomTat(gom), cau: [`${id}#1`] }, { y: 'Ý CHỈ DỰA CÂU PHẦN', cau: ['phan:XV:cg:3#1'] }],
    khongGom: [{ y: khoiTomTat(khong), cau: [`${id}#1`], den: ['99.99'] }],
    tachVoi: [{ voi: 'bieu:9999', y: 'TÁCH VỚI NHÓM KHÔNG XÉT', cau: [] }],
  }]));

  /** goiLLM giả đi hết đường: giữ theo `uuTien`, KIEM toàn KHONG, xuống nút con đầu tiên. Ghi lại mọi prompt. */
  const diHetDuong = (cumTim, { chon, prompts }) => async (buoc, goi) => {
    prompts.push({ buoc, n: goi.prompt.length, prompt: goi.prompt });
    const ck = 'Hàng thử';
    if (buoc === 'VAO_CUA') return { banChat: [{ y: 'hàng thử', chuKhach: ck }], cumTim };
    if (buoc === 'LOC') {
      const ids = goi.duLieu.ungVien.map((u) => u.h4);
      return traLoiLoc(goi, chon ? chon(ids, 8) : ids.slice(0, 8));
    }
    if (buoc === 'CHON_UNG_VIEN') {
      const ids = goi.duLieu.ungVien.map((u) => u.h4);
      return traLoiLoc(goi, chon ? chon(ids, 3) : ids.slice(-3));
    }
    if (buoc === 'KIEM') return traLoiKiemToanKhong(goi.duLieu, 'KHACH_KHONG_NEU');
    if (buoc === 'DOC_CAP' || buoc === 'DOC_THEM') return { cauDeCap: [] };
    if (buoc === 'CHON_NHOM_4') {
      const [a, ...con] = goi.duLieu.nhomSong;
      return { hanhDong: 'CHON', nutDich: a, quyTacGir: 'Quy tắc 1', trich: [{ cauId: `${a}#1`, doan: cauGoc(`${a}#1`) }], chuKhach: ck, daSoKhongChon: con.map((nut) => ({ nut, viSaoKhongChon: 'thử' })) };
    }
    if (buoc === 'XUONG_CAP') {
      const [a, ...con] = goi.duLieu.capDuoi;
      const cid = cauGoc(`${a.id}#1`).trim().length >= 6 ? `${a.id}#1` : `${goi.duLieu.nut}#1`;
      return { hanhDong: 'CHON', nutDich: a.id, quyTacGir: 'QT6', trich: [{ cauId: cid, doan: cauGoc(cid) }], chuKhach: ck, daSoKhongChon: con.map((c) => ({ nut: c.id, viSaoKhongChon: 'thử' })) };
    }
    throw new Error(`${buoc}: ${goi.prompt.slice(0, 600)}`);
  };
  const coNut = (p, id) => p.includes(`\n* ${id} (`);

  const CUM_30 = [
    'bằng sắt hoặc thép', 'máy bơm', 'động cơ điện', 'bằng plastic', 'vải dệt thoi', 'đồ nội thất',
    'thiết bị quang học', 'hợp chất hữu cơ', 'cao su lưu hoá', 'giấy và bìa', 'phụ tùng xe', 'dụng cụ cầm tay',
    'bằng gỗ', 'thuỷ tinh', 'sản phẩm gốm', 'thực phẩm chế biến', 'dầu thực vật', 'phân bón',
    'mỹ phẩm', 'chất màu', 'van và vòi', 'ổ lăn', 'máy giặt', 'đèn điện',
    'cáp điện', 'đồ chơi trẻ em', 'giày dép', 'túi xách', 'bộ phận của máy', 'kết cấu nhôm',
  ];
  await test('17. Trần prompt: 30 cụm tìm tự nghĩ trên kho thật, mọi bước ≤ 60.000 ký tự, sổ đạt', async () => {
    let lonNhat = { n: 0 };
    let chiaCo = 0;
    for (let i = 0; i < CUM_30.length; i += 6) {
      const prompts = [];
      const res = await chayDocLuat({ moTa: 'Hàng thử trần prompt', kho: { tomTat: tomTatTo(6000, 5000) }, goiLLM: diHetDuong(CUM_30.slice(i, i + 6), { prompts }) });
      assert.equal(res.trangThai, 'KET_LUAN', JSON.stringify(res.loiSo).slice(0, 400));
      assert.equal(kiemSoVet(res.so).dat, true);
      for (const p of prompts) if (p.n > lonNhat.n) lonNhat = p;
      chiaCo += res.thongKeBuoc.reduce((t, e) => t + e.soLuotChia, 0);
      const chonUv = prompts.find((p) => p.buoc === 'CHON_UNG_VIEN').prompt;
      assert.equal(chonUv.includes('Ý CHỈ DỰA CÂU PHẦN'), false, 'bỏ ý gồm chỉ dựa câu Phần/Chương');
      assert.equal(chonUv.includes('TÁCH VỚI NHÓM KHÔNG XÉT'), false, 'tachVoi chỉ với nhóm đang xét');
      assert.ok(chonUv.includes('không gồm:'));
    }
    assert.ok(lonNhat.n <= 60000, `${lonNhat.buoc}: ${lonNhat.n}`);
    assert.ok(chiaCo > 0, 'phải có lượt chia do vượt trần');
    console.log(`  (prompt lớn nhất: ${lonNhat.buoc} ${lonNhat.n} ký tự; lượt chia thêm: ${chiaCo})`);
  });

  await test('18. Trần prompt ở nhóm nặng nhất (39.01, 32.04, 29.37, 40.01, 61.09, 84.19): chia lượt theo nút, không cắt chữ, đọc đủ', async () => {
    for (const bo of [['3901', '3204', '2937'], ['4001', '6109', '8419']]) {
      const prompts = [];
      const res = await chayDocLuat({
        moTa: 'Hàng thử nhóm nặng',
        kho: { timLuatFn: () => ({ cuaVao: bo.map((h) => ({ nut: `bieu:${h}`, cauId: `bieu:${h}#1`, cau: cauGoc(`bieu:${h}#1`), chieu: 'NHAC', kho: 'bieu', lop: 'LUAT' })) }) },
        goiLLM: diHetDuong(['thử'], { prompts }),
      });
      assert.equal(res.trangThai, 'KET_LUAN', JSON.stringify(res.loiSo).slice(0, 400));
      assert.ok(prompts.every((p) => p.n <= 60000));
      assert.ok(res.thongKeBuoc.some((e) => e.soLuotChia > 0));
      // Mọi câu ghi daDoc đều có mặt trọn vẹn trong một prompt.
      const tat = prompts.map((p) => p.prompt).join('\n');
      for (const b of res.so.cacBuoc) {
        if (!['KIEM', 'CHON', 'KET_LUAN'].includes(b.loai)) continue;
        for (const cid of b.daDoc) assert.ok(tat.includes(`[${cid}] ${cauGoc(cid).replace(/\s+/g, ' ').trim()}`), `daDoc ${cid} chưa từng đưa trọn`);
      }
    }
  });

  await test('19. Chú giải Phần/Chương chỉ đưa một lần cho các nhóm cùng Phần/Chương; câu chung KHONG dùng lại', async () => {
    const prompts = [];
    const res = await chayDocLuat({
      moTa: 'Hàng thử ba nhóm nhôm',
      kho: { timLuatFn: () => ({ cuaVao: ['7604', '7610', '7616'].map((h) => ({ nut: `bieu:${h}`, cauId: `bieu:${h}#1`, cau: cauGoc(`bieu:${h}#1`), chieu: 'NHAC', kho: 'bieu', lop: 'LUAT' })) }) },
      goiLLM: diHetDuong(['nhôm'], { prompts }),
    });
    assert.equal(res.trangThai, 'KET_LUAN');
    const pd = phaiDoc('bieu:7604', { dayDu: true });
    const chung = pd.trinhTu.find((s) => s.buoc === 'CHU_GIAI_PHAN').muc.filter((m) => m.lop === 'LUAT').map((m) => m.id);
    assert.ok(chung.length > 10);
    for (const id of chung) {
      const lan = prompts.filter((p) => coNut(p.prompt, id)).length;
      assert.equal(lan, 1, `${id} đưa ${lan} lần`);
    }
    const kiems = res.so.cacBuoc.filter((b) => b.loai === 'KIEM');
    assert.equal(kiems.length, 3);
    assert.equal(kiems[0].quyetDinh.cauDungLai, 0);
    assert.ok(kiems[1].quyetDinh.cauDungLai > 5 && kiems[2].quyetDinh.cauDungLai > 5);
    assert.equal(kiemSoVet(res.so).dat, true);
  });

  await test('20. chuKhach bịa, trích câu chưa đưa, chuyển hướng ngoài đích của câu: đều bị trả lại', async () => {
    const loi = [];
    const chay1 = async (sua) => {
      const prompts = [];
      const goc = diHetDuong(['nhôm'], { prompts });
      let dem = 0;
      const res = await chayDocLuat({
        moTa: 'Hàng thử nhôm',
        kho: { timLuatFn: () => ({ cuaVao: [{ nut: 'bieu:7604', cauId: 'bieu:7604#1', cau: cauGoc('bieu:7604#1'), chieu: 'NHAC', kho: 'bieu', lop: 'LUAT' }] }) },
        goiLLM: async (buoc, goi) => {
          const kq = await goc(buoc, goi);
          const moi = sua(buoc, goi, kq, dem);
          if (moi) { dem += 1; return moi; }
          return kq;
        },
      });
      loi.push(res.thongKeBuoc.flatMap((e) => e.biTraLai));
      return res;
    };
    await chay1((b, g, kq, d) => (b === 'CHON_NHOM_4' && d < 1 ? { ...kq, chuKhach: 'nhôm đúc nguyên khối' } : null));
    assert.match(loi.at(-1)[0], /không có nguyên văn trong mô tả khách/);
    await chay1((b, g, kq, d) => (b === 'CHON_NHOM_4' && d < 1 ? { ...kq, trich: [{ cauId: 'bieu:9403#1', doan: cauGoc('bieu:9403#1') }] } : null));
    assert.match(loi.at(-1)[0], /CHƯA được đưa cho đọc/);
    await chay1((b, g, kq, d) => (b === 'KIEM' && d < 1 && g.duLieu.loCau.some((c) => c.cauId === coCauLoaiChiSang)
      ? { kiemCanh: kq.kiemCanh.map((k) => (k.cauId === coCauLoaiChiSang ? { ...k, ketQua: 'THOA', chuKhach: 'Hàng thử nhôm' } : k)), chuyenHuong: { nutDich: 'bieu:9403' } }
      : null));
    assert.match(loi.at(-1)[0], /không phải đích của câu THOA/);
    await chay1((b, g, kq, d) => (b === 'XUONG_CAP' && d < 1 ? { ...kq, trich: [{ cauId: 'gir:6#1', doan: cauGoc('gir:6#1') }] } : null));
    assert.match(loi.at(-1)[0], /chỉ có lời Quy tắc 6/);
    await chay1((b, g, kq, d) => (b === 'XUONG_CAP' && d < 1 ? { ...kq, daSoKhongChon: [] } : null));
    assert.match(loi.at(-1)[0], /sót nút cùng cấp/);
    await chay1((b, g, kq, d) => (b === 'KIEM' && d < 1 ? { ...kq, docThem: ['bieu:0101'] } : null));
    assert.match(loi.at(-1)[0], /docThem "0101" không phải nhóm được câu nào/);
  });

  await test('21. Câu loại trừ chỉ sang cả Chương: các nhóm của Chương đó đi qua LOC, không đoán nhóm', async () => {
    const prompts = [];
    const goc = diHetDuong(['nhôm'], { prompts });
    let cauSangChuong = null;
    let daLocChuong = null;
    const res = await chayDocLuat({
      moTa: 'Hàng thử nhôm',
      kho: { timLuatFn: () => ({ cuaVao: [{ nut: 'bieu:7604', cauId: 'bieu:7604#1', cau: cauGoc('bieu:7604#1'), chieu: 'NHAC', kho: 'bieu', lop: 'LUAT' }] }) },
      goiLLM: async (buoc, goi) => {
        if (buoc === 'KIEM' && goi.duLieu.nut === 'bieu:7604' && !cauSangChuong) {
          const c = goi.duLieu.loCau.find((x) => x.cacDich.every((d) => d === 'chuong:94'));
          if (c) {
            cauSangChuong = c.cauId;
            const kq = traLoiKiemToanKhong(goi.duLieu, 'Hàng thử nhôm');
            kq.kiemCanh.find((k) => k.cauId === c.cauId).ketQua = 'THOA';
            kq.chuyenHuong = { nutDich: 'chuong:94', trich: [{ cauId: c.cauId, doan: cauGoc(c.cauId) }], lyDo: 'Câu loại chỉ sang Chương 94' };
            return kq;
          }
        }
        if (cauSangChuong && ['LOC', 'CHON_UNG_VIEN'].includes(buoc)) daLocChuong = goi.duLieu.ungVien.map((u) => u.h4);
        return goc(buoc, goi);
      },
    });
    assert.ok(cauSangChuong, 'kho phải có câu Phần XV loại sang Chương 94');
    assert.ok(daLocChuong?.length >= 5 && daLocChuong.every((h) => h.startsWith('94')), String(daLocChuong));
    assert.equal(res.trangThai, 'KET_LUAN', JSON.stringify(res.loiSo).slice(0, 300));
    assert.ok(res.ma.startsWith('94'));
    assert.equal(kiemSoVet(res.so).dat, true);
  });

  await test('23. Chú giải "nội dung nhóm 73.08 được áp dụng": docThem đưa chú giải 73.08, câu kê tới được CHON_NHOM_4 và XUONG_CAP, 73.08 không thành ứng viên', async () => {
    const prompts = [];
    const goc = diHetDuong(['nhôm'], { prompts });
    const res = await chayDocLuat({
      moTa: 'Hàng thử nhôm',
      kho: { timLuatFn: () => ({ cuaVao: [{ nut: 'bieu:7610', cauId: 'bieu:7610#1', cau: cauGoc('bieu:7610#1'), chieu: 'NHAC', kho: 'bieu', lop: 'LUAT' }] }) },
      goiLLM: async (buoc, goi) => {
        const kq = await goc(buoc, goi);
        if (buoc === 'KIEM') return { ...kq, docThem: ['bieu:7308'] };
        if (buoc === 'DOC_THEM') return { cauDeCap: [{ cauId: 'nhom:7308:ct:1#1', y: 'áp dụng' }] };
        return kq;
      },
    });
    assert.equal(res.trangThai, 'KET_LUAN', JSON.stringify(res.loiSo).slice(0, 300));
    assert.equal(prompts.filter((p) => p.buoc === 'DOC_THEM').length, 1);
    for (const b of ['CHON_NHOM_4', 'XUONG_CAP']) assert.ok(prompts.find((p) => p.buoc === b).prompt.includes('[nhom:7308:ct:1#1]'), b);
    assert.deepEqual(res.so.ungVienSauQt1, ['7610']);
    assert.deepEqual(res.so.cacBuoc.find((b) => b.loai === 'KIEM').quyetDinh.docThem, ['bieu:7308']);
    assert.equal(kiemSoVet(res.so).dat, true);
  });

  await test('24. Cụm có dấu không nhận câu chỉ khớp khi bỏ dấu (nhôm ~ nhóm)', async () => {
    let h4s = [];
    await chayDocLuat({
      moTa: 'Hàng thử nhôm',
      kho: {
        timLuatFn: () => ({ cuaVao: [
          { nut: 'bieu:7616', cauId: 'bieu:7616#1', cau: cauGoc('bieu:7616#1'), chieu: 'NHAC', kieuKhop: 'CUM_CHUAN' },
          { nut: 'bieu:3401', cauId: 'bieu:3401#1', cau: cauGoc('bieu:3401#1'), chieu: 'NHAC', kieuKhop: 'DU_TU_KHONG_DAU' },
        ] }),
      },
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') return { banChat: [{ y: 'x', chuKhach: 'nhôm' }], cumTim: ['sản phẩm nhôm'] };
        h4s = goi.duLieu.ungVien.map((u) => u.h4);
        return { hanhDong: 'HOI', cauHoi: 'dừng' };
      },
    });
    assert.deepEqual(h4s, ['7616']);
  });

  await test('22. Vượt trần ký tự hay vượt số lượt thì trả SO_KHONG_DAT, không ném lỗi, không trả mã', async () => {
    const r1 = await chayDocLuat({ moTa: 'Hàng thử nhôm', gioiHan: { tranKyTuPrompt: 300 }, goiLLM: async () => ({}) });
    assert.equal(r1.trangThai, 'SO_KHONG_DAT');
    assert.match(r1.loiSo[0], /PROMPT_VUOT_TRAN/);
    const r2 = await chayDocLuat({ moTa: 'Hàng thử nhôm', gioiHan: { toiDaLuotLLM: 1 }, goiLLM: diHetDuong(['nhôm thanh'], { prompts: [] }) });
    assert.equal(r2.trangThai, 'SO_KHONG_DAT');
    assert.equal(r2.ma, null);
  });

  console.log(`\n=== KET QUA: ${passed} passed, ${failed} failed ===`);
  if (process.argv.includes('--do')) {
    console.log('\n--- DO LUOT LLM & KY TU ---');
    console.log(JSON.stringify(ketQuaDo, null, 2));
  }
  if (failed > 0) process.exit(1);
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
