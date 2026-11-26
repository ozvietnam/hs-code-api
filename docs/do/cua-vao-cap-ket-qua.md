# Kết quả thước đo cửa vào — cặp tranh chấp (CAP) · M-79 (#1971)

- **Ngày đo:** 2026-11-26 · **Máy:** .131 (32 nhân) · **Bộ đo:** `data/do/cua-vao-cap-tranh-chap.json` (52 ca CAP)
- **Lệnh chạy:** `node scripts/do-cua-vao.mjs --bo data/do/cua-vao-cap-tranh-chap.json --m37 --limit 20 --bao-cao docs/do/cua-vao-cap-ket-qua.md`
- **Kênh:** `m41_tim_luat` (tìm chữ, lib/tim-luat.js) + `m37_tim_nghia` (tìm nghĩa, lib/chi-muc-luat.js — cắm bằng `--m37`). M-52 chưa cắm (CHUA_CAM).
- **Chỉ mục M-37 dựng mới ngay trước khi đo:** 45.584 mục (16,7 MB, 978 giây, `npm run build:chi-muc-luat` — đúng quy trình M-37b #2030: chỉ mục không lưu kho, dựng lúc cần).
- **Chân ái:** chỉ tên hàng + cặp nhóm 4 số từ bộ 53 cặp CEO; không công văn, không tiền lệ TB, không mã Hải quan ấn định.

## 1. Bộ đo: 52/53 ca

- **MT-036** — "Cảm biến từ (Magnetic Sensor / Reed / Hall Proximity)" — bị **LOẠI**: nhóm `"2024"` và `"3387"` không tồn tại trong biểu thuế (`cổng kiemBoDo` chặn `canCuLuat` trỏ nút không có thật). Lỗi dữ liệu nguồn; không tự sửa theo kiểu đoán, để QT quyết.
- Ca ngược kèm theo trong `BO_THU_LUAT_MAU`: mô tả vô nghĩa phải trả rỗng (đã xanh trên cả 2 kênh).

## 2. Kết quả chính thức (moTa nguyên vẹn, tiêu chí biên bản: MỌI nhóm A∪B có mặt ở NHAC Top-20)

| Kênh | Đủ cặp (C1) | Ghi chú |
|---|---|---|
| `m41_tim_luat` (tìm chữ) | **0/52 (0%)** | 51/52 ca rỗng hoàn toàn |
| `m37_tim_nghia` (tìm nghĩa) | **5/52 (9,6%)** | cap-02, 07, 09, 14, 17 |

## 3. Ma trận tiêu chí — đối chiếu số QT đo tay (7/53 tìm chữ, 33/53 tìm nghĩa)

Số đo tay của QT không ghi phương pháp, nên em đo lại cả ma trận: 2 biến thể truy vấn × 3 tiêu chí đạt.

| Biến thể truy vấn | Kênh | C1 đủ mọi nhóm A∪B | C2 mỗi bên A,B có ≥1 nhóm | C3 ≥1 nhóm bất kỳ |
|---|---|---|---|---|
| moTa nguyên vẹn | M-41 tìm chữ | 0/52 | 0/52 | 0/52 |
| moTa nguyên vẹn | M-37 tìm nghĩa | **5/52** | 28/52 | 45/52 |
| chữ Việt trần (bỏ ngoặc Anh, bỏ vế thuần Anh) | M-41 tìm chữ | 0/52 | 13/52 | 18/52 |
| chữ Việt trần | M-37 tìm nghĩa | 5/52 | **33/52** | 47/52 |

**Đối chiếu:**

- **Tìm nghĩa 33 — KHỚP ĐÚNG:** `chữ Việt trần + C2 + M-37` = **33/52**. Số QT đo tay là 33/53; cùng số tuyệt đối trên bộ 52 ca (MT-036 bị loại, vốn không thể đạt). ⇒ phương pháp QT đo tay = gõ chữ Việt (không mang theo phần Anh trong ngoặc) và chấm "mỗi bên cặp có ít nhất 1 nhóm đại diện".
- **Tìm chữ 7 so 13:** cùng tiêu chí đó, M-41 = 13/52, QT ghi 7/53 — lệch 6 ca. Nguồn lệch khả dĩ: (a) QT đo tay trên kho luật gốc cũ — chỉ mục nghĩa đã lớn từ 45.164 → 45.584 mục giữa 2 lần đo, kết quả tìm chữ đổi theo kho; (b) chênh lệch cách gõ/chấm tay từng ca. Không có cách tái lập nào của em cho ra đúng 7 trên kho hiện tại, nên ghi nhận lệch này, không sửa số cho khớp.

## 4. Phát hiện chính

1. **moTa song ngữ giết chết kênh tìm chữ.** 51/52 ca rỗng ở M-41 vì mô tả dạng "Việt (English)" / "Việt / English": `khopCau` đòi MỌI từ khóa (kể từ Anh "HMI", "Smartwatch", "Load cell") cùng xuất hiện trong một câu luật → không câu luật nào khớp. Bỏ phần Anh thì 18/52 ca có ít nhất 1 nhóm (C3). Khuyến nghị (thuộc thẻ M-41, không sửa trong M-79): `timLuat` nên tách mệnh đề trong ngoặc/đa vế thành các cụm truy vấn riêng, hoặc thước đo chuẩn hoá moTa về chữ Việt trần trước khi tìm chữ.
2. **Kênh tìm nghĩa C1 (đủ mọi nhóm) chỉ 5/52** — nhóm đầu bảng (cảm biến áp suất/lưu lượng, UPS, PLC) ổn vì tên hàng gần nguyên văn chú giải; các cặp 3–4 nhóm thì khó đủ tuyệt đối. Tiêu chí C2 ("mỗi bên ≥1 nhóm") phản ánh tính dùng được của cửa vào đúng hơn — kênh nghĩa đạt 28→33/52.
3. **Không ca nào bị nhiễu chiều LOAI** — nhóm tranh chấp không xuất hiện chỉ ở LOAI trên cả 2 kênh (trường `chiOLoai` = false toàn bộ).

## 5. Tái lập

```bash
# trên .131 (worktree ~/hs-m79-run = main + nhánh m79-cua-vao-cap):
npm run build:chi-muc-luat                                  # ~16 phút, 45.584 mục
node scripts/do-cua-vao.mjs --bo data/do/cua-vao-cap-tranh-chap.json --m37 --limit 20 --bao-cao docs/do/cua-vao-cap-ket-qua.md
# ma trận tiêu chí: node /tmp/m79-ma-tran-tieu-chi.cjs (bản lưu /tmp/m79-ma-tran.json)
```

---

Dưới đây là thân báo cáo máy sinh từ thước (chi tiết từng ca):

| Kênh | Thẻ | Trạng thái | Trúng nhóm 4 (NHAC) | Top-5 | Top-10 | Đủ cặp CAP | Rỗng trên ca thuận | Ca ngược đạt |
|---|---|---|---|---|---|---|---|---|
| `m41_tim_luat` | M-41 | DA_CAM | 0/0 (null%) | 0/0 | 0/0 | 0/52 (0%) | 0 | 0/0 |
| `m37_tim_nghia` | M-37 | DA_CAM | 0/0 (null%) | 0/0 | 0/0 | 5/52 (9.6%) | 0 | 0/0 |
| `m52_loc` | M-52 | CHUA_CAM | — | — | — | — | — | — |

## Chi tiết kênh M-41 (`lib/tim-luat.js`)

| Ca | Loại | Mô tả | Nhóm đúng | Hạng NHAC | Dòng NHAC / LOAI | Top-5 nhóm NHAC |
|---|---|---|---|---|---|---|

## Chi tiết cặp tranh chấp (CAP) — kênh `m41_tim_luat`

ĐẠT = mọi nhóm trong cặp có mặt ở chiều NHAC Top-20 (nút chỉ ở LOAI không tính).

| Ca | Mô tả | Nhóm cần có | Nhóm có mặt (hạng NHAC) | Nhóm thiếu | ĐẠT | Top-10 nhóm NHAC |
|---|---|---|---|---|---|---|
| `cap-01` | Màn hình cảm ứng công nghiệp / HMI | 8471, 8528, 8537 | — | 8471, 8528, 8537 | THIẾU | — |
| `cap-02` | Robot hút bụi gia dụng | 8479, 8508 | — | 8479, 8508 | THIẾU | — |
| `cap-03` | Robot làm sạch bể bơi | 8479, 8508, 8421 | — | 8479, 8508, 8421 | THIẾU | — |
| `cap-04` | Hệ thống cửa cuốn tự động | 8479, 8501, 8425 | — | 8479, 8501, 8425 | THIẾU | 9012, 9031, 9207 |
| `cap-05` | Smartwatch / Thiết bị đeo tay thông minh | 9102, 8517 | — | 9102, 8517 | THIẾU | — |
| `cap-06` | Load cell / Cảm biến lực | 8423, 9031 | — | 8423, 9031 | THIẾU | — |
| `cap-07` | Cảm biến áp suất | 9032, 9026 | — | 9032, 9026 | THIẾU | — |
| `cap-08` | Rotary Encoder | 9029, 8543 | — | 9029, 8543 | THIẾU | — |
| `cap-09` | Cảm biến lưu lượng (Flow) | 9026, 9032 | — | 9026, 9032 | THIẾU | — |
| `cap-10` | Cảm biến quang / tiệm cận | 8536, 8541, 9031 | — | 8536, 8541, 9031 | THIẾU | — |
| `cap-11` | Hệ thống AC Servo Motor & Drive đồng bộ | 8537, 8501 | — | 8537, 8501 | THIẾU | — |
| `cap-12` | Biến tần VFD / Frequency Inverter | 8537, 8504 | — | 8537, 8504 | THIẾU | — |
| `cap-13` | Robot tự hành AGV | 8479, 8709, 8428 | — | 8479, 8709, 8428 | THIẾU | — |
| `cap-14` | PLC / Bộ điều khiển logic lập trình | 8471, 9032, 8537 | — | 8471, 9032, 8537 | THIẾU | — |
| `cap-15` | Camera công nghiệp / Machine Vision | 8525, 9031 | — | 8525, 9031 | THIẾU | — |
| `cap-16` | Máy cắt laser kim loại CNC | 8479, 8515, 8456 | — | 8479, 8515, 8456 | THIẾU | — |
| `cap-17` | Bộ lưu điện UPS | 8504, 8537 | — | 8504, 8537 | THIẾU | — |
| `cap-18` | Máy in 3D / Additive Manufacturing | 8443, 8456, 8479, 8477, 8485 | — | 8443, 8456, 8479, 8477, 8485 | THIẾU | — |
| `cap-19` | Cảm biến khoảng cách laser (Displacement) | 8543, 9013, 9032, 9031 | — | 8543, 9013, 9032, 9031 | THIẾU | — |
| `cap-20` | Soft Starter / Bộ khởi động mềm | 8537, 8504 | — | 8537, 8504 | THIẾU | — |
| `cap-21` | Cánh tay robot công nghiệp / Articulated Robot / Cobot | 8428, 8479, 8515 | — | 8428, 8479, 8515 | THIẾU | — |
| `cap-22` | Bộ nguồn chuyển mạch công nghiệp / Switching Power Supply (SMPS) | 8504, 8537 | — | 8504, 8537 | THIẾU | — |
| `cap-23` | Bộ điều khiển nhiệt độ / Temperature Controller (PID) | 8471, 8537, 9025, 9032 | — | 8471, 8537, 9025, 9032 | THIẾU | — |
| `cap-24` | Máy khắc/đánh dấu laser (Laser Marker/Engraver) | 8479, 8515, 8456 | — | 8479, 8515, 8456 | THIẾU | — |
| `cap-25` | Linear Actuator điện / Electric Cylinder / Servo Linear Actuator | 8466, 8479, 8501 | — | 8466, 8479, 8501 | THIẾU | — |
| `cap-26` | Động cơ bước (Stepper Motor / Stepping Motor) | 8479, 8501, 8537 | — | 8479, 8501, 8537 | THIẾU | — |
| `cap-27` | Bộ điều khiển Servo / Servo Drive / Amplifier (standalone) | 8471, 8504, 8537 | — | 8471, 8504, 8537 | THIẾU | — |
| `cap-28` | Cảm biến tiệm cận cảm ứng (Inductive Proximity Sensor) | 8536, 8541, 9031 | — | 8536, 8541, 9031 | THIẾU | — |
| `cap-29` | Máy hàn laser (Laser Welding Machine / Fiber Laser Welder) | 8456, 8479, 8515 | — | 8456, 8479, 8515 | THIẾU | — |
| `cap-30` | Máy tính công nghiệp / Industrial Panel PC / Embedded Computer | 8471, 8528, 8537 | — | 8471, 8528, 8537 | THIẾU | — |
| `cap-31` | Cảm biến quang điện (Photoelectric Sensor) | 8536, 8541, 9031 | — | 8536, 8541, 9031 | THIẾU | — |
| `cap-32` | Động cơ BLDC (Brushless DC Motor) | 8479, 8501, 8537 | — | 8479, 8501, 8537 | THIẾU | — |
| `cap-33` | Bộ điều khiển chuyển động (Motion Controller) | 8471, 8537, 9032 | — | 8471, 8537, 9032 | THIẾU | — |
| `cap-34` | Máy cắt plasma (Plasma Cutting Machine) | 8456, 8479, 8515 | — | 8456, 8479, 8515 | THIẾU | — |
| `cap-35` | Cảm biến siêu âm (Ultrasonic Sensor) | 8536, 8543, 9031 | — | 8536, 8543, 9031 | THIẾU | — |
| `cap-36` | Rơ-le trạng thái rắn (Solid State Relay – SSR) | 8536, 8537, 8541 | — | 8536, 8537, 8541 | THIẾU | — |
| `cap-37` | Contactor điện từ (Electromagnetic Contactor) | 8504, 8536, 8537 | — | 8504, 8536, 8537 | THIẾU | — |
| `cap-38` | Cảm biến dòng điện (Current Sensor / Transducer) | 8504, 8536, 9030, 9031 | — | 8504, 8536, 9030, 9031 | THIẾU | — |
| `cap-39` | Máy hàn hồ quang (Arc Welding Machine – MMA/MIG/TIG) | 8456, 8479, 8515 | — | 8456, 8479, 8515 | THIẾU | — |
| `cap-40` | Cảm biến nhiệt độ (Temperature Sensor / Thermocouple / RTD / PT100) | 8541, 8543, 9032, 9025, 9031 | — | 8541, 8543, 9032, 9025, 9031 | THIẾU | — |
| `cap-41` | Van điện từ (Solenoid Valve) | 8505, 8536, 8537, 8481 | — | 8505, 8536, 8537, 8481 | THIẾU | — |
| `cap-42` | Bộ lọc nhiễu EMI/EMC (EMI Filter / Noise Filter) | 8504, 8536, 8543 | — | 8504, 8536, 8543 | THIẾU | — |
| `cap-43` | Máy cắt dây EDM (Wire Cut EDM) | 8456, 8479, 8515 | — | 8456, 8479, 8515 | THIẾU | — |
| `cap-44` | Cảm biến độ rung (Vibration Sensor / Accelerometer) | 8541, 8543, 9031 | — | 8541, 8543, 9031 | THIẾU | — |
| `cap-45` | Cảm biến mức (Level Sensor / Level Transmitter / Level Gauge) | 8536, 8543, 9032, 9026, 9031 | — | 8536, 8543, 9032, 9026, 9031 | THIẾU | — |
| `cap-46` | Cảm biến khí (Gas Sensor / Gas Detector / Toxic Gas Sensor) | 8541, 8543, 9031, 9027 | — | 8541, 8543, 9031, 9027 | THIẾU | — |
| `cap-47` | Bộ biến tần năng lượng mặt trời (Solar / PV Inverter) | 8501, 8504, 8537 | — | 8501, 8504, 8537 | THIẾU | — |
| `cap-48` | Xi lanh khí nén (Pneumatic Cylinder / Air Cylinder) | 8479, 8481, 8501, 8412 | — | 8479, 8481, 8501, 8412 | THIẾU | — |
| `cap-49` | Cảm biến mô-men xoắn (Torque Sensor / Torque Transducer) | 8423, 8543, 9029, 9031 | — | 8423, 8543, 9029, 9031 | THIẾU | — |
| `cap-50` | Lò nung chảy thủy tinh bằng điện công nghiệp | 8417, 8479, 8516, 8514 | — | 8417, 8479, 8516, 8514 | THIẾU | — |
| `cap-51` | Xi lanh thủy lực (Hydraulic Cylinder) | 8412, 8479, 8481 | — | 8412, 8479, 8481 | THIẾU | — |
| `cap-52` | Cảm biến nhiệt độ nước làm mát xe máy | 8543, 9025, 9031, 8533 | — | 8543, 9025, 9031, 8533 | THIẾU | — |

## Chi tiết cặp tranh chấp (CAP) — kênh `m37_tim_nghia`

ĐẠT = mọi nhóm trong cặp có mặt ở chiều NHAC Top-20 (nút chỉ ở LOAI không tính).

| Ca | Mô tả | Nhóm cần có | Nhóm có mặt (hạng NHAC) | Nhóm thiếu | ĐẠT | Top-10 nhóm NHAC |
|---|---|---|---|---|---|---|
| `cap-01` | Màn hình cảm ứng công nghiệp / HMI | 8471, 8528, 8537 | 8528(#2) | 8471, 8537 | THIẾU | 8524, 8528, 8521, 8519, 8486 |
| `cap-02` | Robot hút bụi gia dụng | 8479, 8508 | 8479(#4), 8508(#7) | — | ĐẠT | 8467, 8465, 8509, 8479, 8437, 8414, 8508, 8451, 8459 |
| `cap-03` | Robot làm sạch bể bơi | 8479, 8508, 8421 | 8479(#12) | 8508, 8421 | THIẾU | 9506, 8434, 9019, 7017, 0305, 8414, 5201, 8413, 5203, 8451 |
| `cap-04` | Hệ thống cửa cuốn tự động | 8479, 8501, 8425 | 8425(#5) | 8479, 8501 | THIẾU | 8471, 9029, 8704, 8603, 8425, 8412, 8708, 8426, 8703, 8457 |
| `cap-05` | Smartwatch / Thiết bị đeo tay thông minh | 9102, 8517 | 9102(#1) | 8517 | THIẾU | 9102, 9101, 9021, 9018, 9019, 9031, 9017, 9032, 9106 |
| `cap-06` | Load cell / Cảm biến lực | 8423, 9031 | — | 8423, 9031 | THIẾU | 9026, 9024, 9032, 9030, 8413, 8410, 9028, 8471, 8541, 8412 |
| `cap-07` | Cảm biến áp suất | 9032, 9026 | 9032(#2), 9026(#1) | — | ĐẠT | 9026, 9032, 9018, 9027, 8504, 8541, 8481, 9025 |
| `cap-08` | Rotary Encoder | 9029, 8543 | 9029(#2) | 8543 | THIẾU | 9030, 9029, 9019, 8410, 8406, 8471, 9026, 9015 |
| `cap-09` | Cảm biến lưu lượng (Flow) | 9026, 9032 | 9026(#1), 9032(#2) | — | ĐẠT | 9026, 9032, 9030, 9028 |
| `cap-10` | Cảm biến quang / tiệm cận | 8536, 8541, 9031 | 9031(#2) | 8536, 8541 | THIẾU | 9029, 9031, 9030, 9016, 9033, 9026, 9022, 9032, 9018, 9015 |
| `cap-11` | Hệ thống AC Servo Motor & Drive đồng bộ | 8537, 8501 | 8501(#4) | 8537 | THIẾU | 8483, 8473, 8410, 8501, 8412, 8471, 8702, 8482, 8603, 8407 |
| `cap-12` | Biến tần VFD / Frequency Inverter | 8537, 8504 | 8504(#1) | 8537 | THIẾU | 8504 |
| `cap-13` | Robot tự hành AGV | 8479, 8709, 8428 | 8479(#2), 8428(#7) | 8709 | THIẾU | 8429, 8479, 8434, 8433, 8430, 8436, 8428, 8472 |
| `cap-14` | PLC / Bộ điều khiển logic lập trình | 8471, 9032, 8537 | 8471(#2), 9032(#1), 8537(#3) | — | ĐẠT | 9032, 8471, 8537, 8428, 8519, 8525, 9029 |
| `cap-15` | Camera công nghiệp / Machine Vision | 8525, 9031 | 8525(#2) | 9031 | THIẾU | 9006, 8525, 9029, 8428, 9007, 9010 |
| `cap-16` | Máy cắt laser kim loại CNC | 8479, 8515, 8456 | 8456(#1) | 8479, 8515 | THIẾU | 8456, 8205, 8462, 8210, 8464, 8208, 8203 |
| `cap-17` | Bộ lưu điện UPS | 8504, 8537 | 8504(#1), 8537(#5) | — | ĐẠT | 8504, 8535, 8471, 9405, 8537, 8481, 8536, 7322 |
| `cap-18` | Máy in 3D / Additive Manufacturing | 8443, 8456, 8479, 8477, 8485 | 8485(#1) | 8443, 8456, 8479, 8477 | THIẾU | 8485, 8447, 9602, 8449, 9010, 6802 |
| `cap-19` | Cảm biến khoảng cách laser (Displacement) | 8543, 9013, 9032, 9031 | 9013(#1) | 8543, 9032, 9031 | THIẾU | 9013, 9030, 9006, 9026, 9029, 9033 |
| `cap-20` | Soft Starter / Bộ khởi động mềm | 8537, 8504 | — | 8537, 8504 | THIẾU | 8471, 8511, 8483, 8479, 9032 |
| `cap-21` | Cánh tay robot công nghiệp / Articulated Robot / Cobot | 8428, 8479, 8515 | 8428(#6), 8479(#1) | 8515 | THIẾU | 8479, 8426, 8430, 8434, 9019, 8428, 8433, 8456, 9018, 8432 |
| `cap-22` | Bộ nguồn chuyển mạch công nghiệp / Switching Power Supply (SMPS) | 8504, 8537 | 8504(#5) | 8537 | THIẾU | 8535, 3827, 8542, 8473, 8504, 8517, 8536, 8471, 7306, 8541 |
| `cap-23` | Bộ điều khiển nhiệt độ / Temperature Controller (PID) | 8471, 8537, 9025, 9032 | 8471(#3), 9032(#1) | 8537, 9025 | THIẾU | 9032, 8540, 8471, 8419, 8516, 7322 |
| `cap-24` | Máy khắc/đánh dấu laser (Laser Marker/Engraver) | 8479, 8515, 8456 | — | 8479, 8515, 8456 | THIẾU | 9017, 8205, 9008, 4802, 9013, 9010, 8210, 9018, 9027, 9031 |
| `cap-25` | Linear Actuator điện / Electric Cylinder / Servo Linear Actuator | 8466, 8479, 8501 | — | 8466, 8479, 8501 | THIẾU | 9033, 9032, 0103, 8547, 8541, 8504 |
| `cap-26` | Động cơ bước (Stepper Motor / Stepping Motor) | 8479, 8501, 8537 | 8501(#2) | 8479, 8537 | THIẾU | 8407, 8501, 8412, 8428, 8711, 8483 |
| `cap-27` | Bộ điều khiển Servo / Servo Drive / Amplifier (standalone) | 8471, 8504, 8537 | 8471(#1), 8537(#2) | 8504 | THIẾU | 8471, 8537, 9032, 8473, 8541, 8519, 8518, 9209 |
| `cap-28` | Cảm biến tiệm cận cảm ứng (Inductive Proximity Sensor) | 8536, 8541, 9031 | 8541(#7) | 8536, 9031 | THIẾU | 9030, 9022, 9029, 9033, 9107, 9026, 8541, 9027 |
| `cap-29` | Máy hàn laser (Laser Welding Machine / Fiber Laser Welder) | 8456, 8479, 8515 | 8515(#5) | 8456, 8479 | THIẾU | 9013, 8205, 8468, 8465, 8515, 8437, 8514, 8436, 8461 |
| `cap-30` | Máy tính công nghiệp / Industrial Panel PC / Embedded Computer | 8471, 8528, 8537 | 8471(#2) | 8528, 8537 | THIẾU | 8470, 8471 |
| `cap-31` | Cảm biến quang điện (Photoelectric Sensor) | 8536, 8541, 9031 | 9031(#4) | 8536, 8541 | THIẾU | 9030, 9029, 9026, 9031, 9006, 9028, 9014, 9010 |
| `cap-32` | Động cơ BLDC (Brushless DC Motor) | 8479, 8501, 8537 | 8479(#7), 8501(#1) | 8537 | THIẾU | 8501, 8425, 8711, 8483, 8412, 8604, 8479, 8428, 8407 |
| `cap-33` | Bộ điều khiển chuyển động (Motion Controller) | 8471, 8537, 9032 | 8471(#5), 8537(#8) | 9032 | THIẾU | 8428, 9014, 8530, 8412, 8471, 8483, 9029, 8537, 8608, 8541 |
| `cap-34` | Máy cắt plasma (Plasma Cutting Machine) | 8456, 8479, 8515 | 8456(#3) | 8479, 8515 | THIẾU | 8461, 8462, 8456, 8485, 8444, 8433, 8465, 8451, 8205 |
| `cap-35` | Cảm biến siêu âm (Ultrasonic Sensor) | 8536, 8543, 9031 | 9031(#1) | 8536, 8543 | THIẾU | 9031, 9021, 9030, 9015, 8531, 9018, 8456, 9026, 9209 |
| `cap-36` | Rơ-le trạng thái rắn (Solid State Relay – SSR) | 8536, 8537, 8541 | — | 8536, 8537, 8541 | THIẾU | 8708, 8425, 8483, 8432, 8433, 7308, 8479 |
| `cap-37` | Contactor điện từ (Electromagnetic Contactor) | 8504, 8536, 8537 | 8536(#5) | 8504, 8537 | THIẾU | 9030, 9029, 9015, 9033, 8536, 9032, 8547, 9012, 8505, 8501 |
| `cap-38` | Cảm biến dòng điện (Current Sensor / Transducer) | 8504, 8536, 9030, 9031 | 8504(#4), 9030(#2) | 8536, 9031 | THIẾU | 9032, 9030, 9026, 8504, 9028 |
| `cap-39` | Máy hàn hồ quang (Arc Welding Machine – MMA/MIG/TIG) | 8456, 8479, 8515 | 8515(#1) | 8456, 8479 | THIẾU | 8515, 9029, 8465, 9015, 9030, 9027, 9022, 9018, 9024, 9031 |
| `cap-40` | Cảm biến nhiệt độ (Temperature Sensor / Thermocouple / RTD / PT100) | 8541, 8543, 9032, 9025, 9031 | 9032(#1), 9025(#2) | 8541, 8543, 9031 | THIẾU | 9032, 9025, 9026, 9027, 8418 |
| `cap-41` | Van điện từ (Solenoid Valve) | 8505, 8536, 8537, 8481 | 8481(#1) | 8505, 8536, 8537 | THIẾU | 8481 |
| `cap-42` | Bộ lọc nhiễu EMI/EMC (EMI Filter / Noise Filter) | 8504, 8536, 8543 | — | 8504, 8536, 8543 | THIẾU | 9030, 9033, 9012, 9018, 8473, 9001, 8537, 9032 |
| `cap-43` | Máy cắt dây EDM (Wire Cut EDM) | 8456, 8479, 8515 | — | 8456, 8479, 8515 | THIẾU | 8510, 9029, 8505, 9030, 8544, 9507, 7308, 9027, 8462, 8536 |
| `cap-44` | Cảm biến độ rung (Vibration Sensor / Accelerometer) | 8541, 8543, 9031 | 9031(#3) | 8541, 8543 | THIẾU | 9030, 9029, 9031, 9026, 8708, 8423 |
| `cap-45` | Cảm biến mức (Level Sensor / Level Transmitter / Level Gauge) | 8536, 8543, 9032, 9026, 9031 | 9032(#2), 9026(#3) | 8536, 8543, 9031 | THIẾU | 9030, 9032, 9026, 9033 |
| `cap-46` | Cảm biến khí (Gas Sensor / Gas Detector / Toxic Gas Sensor) | 8541, 8543, 9031, 9027 | 9027(#8) | 8541, 8543, 9031 | THIẾU | 8531, 8405, 4911, 9030, 9026, 9028, 8512, 9027, 8481, 8414 |
| `cap-47` | Bộ biến tần năng lượng mặt trời (Solar / PV Inverter) | 8501, 8504, 8537 | 8501(#3), 8504(#1) | 8537 | THIẾU | 8504, 8541, 8501, 8525, 8514 |
| `cap-48` | Xi lanh khí nén (Pneumatic Cylinder / Air Cylinder) | 8479, 8481, 8501, 8412 | 8479(#5), 8412(#6) | 8481, 8501 | THIẾU | 8414, 8408, 8425, 8407, 8479, 8412, 8703 |
| `cap-49` | Cảm biến mô-men xoắn (Torque Sensor / Torque Transducer) | 8423, 8543, 9029, 9031 | 9031(#4) | 8423, 8543, 9029 | THIẾU | 8483, 8434, 9033, 9031, 9019, 8539, 9030, 8531, 8504, 8512 |
| `cap-50` | Lò nung chảy thủy tinh bằng điện công nghiệp | 8417, 8479, 8516, 8514 | 8417(#2), 8514(#1) | 8479, 8516 | THIẾU | 8514, 8417, 8475, 8464 |
| `cap-51` | Xi lanh thủy lực (Hydraulic Cylinder) | 8412, 8479, 8481 | 8412(#1), 8479(#3) | 8481 | THIẾU | 8412, 8425, 8479, 8410, 8483, 2523, 8407 |
| `cap-52` | Cảm biến nhiệt độ nước làm mát xe máy | 8543, 9025, 9031, 8533 | 9025(#6) | 8543, 9031, 8533 | THIẾU | 8410, 8708, 8413, 8481, 8516, 9025, 8403, 8438, 8531 |
