#!/usr/bin/env node
'use strict';

// scripts/test-engine-doc-luat.mjs
// Bộ test ngoại tuyến cho M-52 (#1920): 14 kịch bản trên mô tả Chương 76 tự soạn + goiLLM giả định.
// Tuyệt đối không gọi LLM thật, không đọc tệp benchmark/dữ liệu khách.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  chayDocLuat,
  KHO_THIEU_MAC_DINH,
} = require('../lib/engine-doc-luat');
const { kiemSoVet, napNguonCau } = require('../lib/so-vet');

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
    const res = await chayDocLuat({
      moTa: 'Đinh tán rỗng bằng hợp kim nhôm, dùng để ghép nối các tấm kim loại trong lắp ráp thân vỏ máy',
      goiLLM: async (buoc, goi) => {
        nhietDoSeen.push(goi.nhietDo);
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [
              { y: 'đinh tán bằng hợp kim nhôm', chuKhach: 'Đinh tán rỗng bằng hợp kim nhôm' },
            ],
            chuaBiet: [],
            cumTim: ['đinh tán nhôm'],
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
    const res = await chayDocLuat({
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
    const res = await chayDocLuat({
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
    const res = await chayDocLuat({
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
            return { hanhDong: 'TIM_LAI', cumTim: ['đinh tán nhôm'] };
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
    const res = await chayDocLuat({
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
    const res = await chayDocLuat({
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
    const res = await chayDocLuat({
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
    const res = await chayDocLuat({
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
          sawTomTatUv = goi.prompt.includes('tóm tắt(BO_TRO)');
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
    const res = await chayDocLuat({
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
    const res = await chayDocLuat({
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
    const res = await chayDocLuat({
      moTa: 'Chi tiết ghép nối bằng nhôm (chưa rõ là bu lông, đinh hay đinh tán)',
      goiLLM: async (buoc, goi) => {
        if (buoc === 'VAO_CUA') {
          return {
            banChat: [{ y: 'chi tiết ghép nối bằng nhôm', chuKhach: 'Chi tiết ghép nối bằng nhôm' }],
            chuaBiet: ['dạng ren hay không ren, là đinh hay đinh tán'],
            cumTim: ['đinh tán nhôm'],
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
    const res = await chayDocLuat({
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
              daSoKhongChon: [],
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
    const res = await chayDocLuat({
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
    const resA = await chayDocLuat({
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
    const resB = await chayDocLuat({
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
