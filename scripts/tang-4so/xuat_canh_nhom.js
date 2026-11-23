// Xuất cạnh đồ thị tri thức ở mức nhóm 4 số ra JSON để các script Python tầng 4 số dùng chung (không viết lại bảng cạnh).
// Dùng: node scripts/tang-4so/xuat_canh_nhom.js <tệp ra>
"use strict";
const fs = require("fs");
const path = require("path");
process.chdir(path.join(__dirname, "..", ".."));
const { dungBangCanh } = require("../../lib/do-thi/dung-bang-canh");
const LOAI = new Set(["C5", "C6", "C7", "C8", "C9", "LOAI_TRU", "WCO"]);
const d = dungBangCanh();
const ra = [];
for (const e of d.canh) {
  if (!LOAI.has(e.loai)) continue;
  ra.push({ id: e.id, loai: e.loai, bac: e.bac, tu: e.tu, toi: e.toi, haiChieu: !!e.haiChieu, dieuKien: e.dieuKien || null, hoi: e.hoi || null,
    neuCo: e.neuCo || null, neuKhong: e.neuKhong || null, trich: e.trich, banDichVi: e.banDichVi || null, nguon: e.nguon || null, idWco: e.idWco || null });
}
fs.writeFileSync(process.argv[2], JSON.stringify(ra));
console.log("canh", ra.length);
