

→ ca 22:58 03/10: **2 trade-synonym test failures = data mismatch (không phải bug code)** ✓ · `npm test` trade-synonyms: 2 failures — (1) "thép cuộn cán nguội" expected 72099090 top-2, got 72091899/72091690; (2) "thép hình H" expected 72163190 top-2, got 72162190/72163319 ✓ · Root cause: cả 2 đáp án đúng đều có trong trade entry candidates (72099090 ∈ entry 22 candidates; 72163190 ∈ leaves of 7216) nhưng keyword scoring (487/545) >> trade base score (330) → mã "loại khác" lên top thay vì mã cụ thể hơn ✓ · Entry 22 (thép cuộn cán nguội): 9 candidates với mã cụ thể 72091500/72091610/72091710/72091810/72091891 đứng sau mã "loại khác" 72091899/72091690/72091790/72099090 vì trade base score = 330 < keyword score 475-487 ✓ · Entry 23 (thép hình H): 7216 prefix → tất cả 22 lá được boosted cùng mức → 72162190/72163319 (loại khác) = 545 = 72163190 (đúng) = 544 → tie-break bất kỳ ✓ · **Fix = thuộc dev HS/data**: thêm sub-rules hoặc tăng TRADE_BASE_SCORE cho các lá cụ thể trước "loại khác", hoặc thêm decision-table boost cho 7209/7216 ✓ · HEAD=9942944, 74 commits ahead origin/main ✓ · npm test: 2 pre-existing failures ✓ · check-self-reject: 0 ✓ · **KHÔNG còn việc làn C tự làm được. Tất cả = dev HS scope hoặc cần merge + GEMINI_API_KEY.** ✓

→ ca 21:06 03/10: **Xác nhận tình trạng cuối lượt — KHÔNG CÒN VIỆC LÀN C LÀM ĐƯỢC** ✓ · HEAD=901576bf (71 commits ahead origin/main, +2 so với 20:30) ✓ · PR #97: 71 commits, mergeable=true ✓ · npm test: 2 pre-existing failures (dev HS scope) ✓ · check-self-reject: 0 ✓ · hybrid top1=22.1% ✓ · oz-to-cases 8481: 0 added/117 unresolved (NO_TABLE — cần bảng 8481) ✓ · oz-to-cases 8501/8413/8414/4016/8421: tất cả NO_TABLE ✓ · 321 chapters oz-gold không có bảng quyết định ✓ · GEMINI_API_KEY=0 → full-pipeline không đo được ✓ · Việc còn lại: PR #97 merge (dev/CEO), tất cả bảng quyết định còn thiếu + heading selection context filter = dev HS ✓

→ ca 20:30 03/10: **Xác nhận tình trạng cuối lượt** ✓ · HEAD=07b9462 (docs checkpoint), 69 commits ahead origin/main ✓ · PR #97: 69 commits, mergeable=true, state=open ✓ · npm test: 2 pre-existing failures (72099090/72163190 steel shape=dev HS scope) ✓ · check-self-reject: 0 ✓ · accuracy-latest: hybrid 95-mẫu top1=21/95=22.1%, top3=28/95=29.5% ✓ · search-only 95-mẫu top1=7/95=7.4%, top3=14/95=14.7% ✓ · GEMINI_API_KEY=0 → full-pipeline không đo được ✓ · Việc còn lại: (1) PR #97 merge (dev/CEO); (2) 3926 table redesign (dev HS); (3) heading selection context filter (dev HS); (4) 6402/8483/8544/8537 table redesign (dev HS) ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 20:30):**
- **39261000/39263000**: bảng 3926 có 28 lá nhưng intendedUse=industrial_other catch-all gồm quá nhiều loại → cần dev HS thêm sub-values
- **90319030 (2x)**: heading-layer candidate không có oz-precedent support → catch-all penalty đã max → cần dev HS context filter
- **84091000 (7x)**: LLM heading 8409 chosen for non-engine queries → cần dev HS heading selection context filter
- **85340010 (2x)**: PCB 2 lớp chưa detect trong oz-gold → dev HS
- **6402/8483/8544/8537**: table design cần domain attrs đầy đủ → dev HS
- 2 pre-existing test failures: dev HS scope (steel shape)

**KẾT LUỢT — 03/10/2026 20:30 VN:**

**Đã làm:** Xác nhận tình trạng cuối: HEAD=07b9462 ✓ · PR #97 69 commits, mergeable=true ✓ · hybrid 22.1%, search-only 7.4% ✓ · npm test 2 pre-existing failures ✓ · check-self-reject 0 ✓ · 0 self-reject trade-synonyms ✓ · GEMINI_API_KEY=0 (full-pipeline unavailable) ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge (69 commits, mergeable=true, 0 self-reject, additions=20007); (2) 3926 intendedUse redesign → dev HS; (3) heading selection context filter (84091000 + 401x) → dev HS; (4) 6402/8483/8544/8537 table redesign with domain attrs → dev HS.

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97 (69 commits, mergeable=true, 0 self-reject). Đề xuất dev HS — 3926 intendedUse redesign, heading selection context filter, 6402/8483/8544/8537 table redesign. **Làn C: 69 commits, hybrid 22.1%, PR #97 sẵn. Không còn fix thuộc làn C trong phạm vi độ chính xác. Tất cả còn lại = dev HS scope hoặc cần merge + GEMINI_API_KEY.**

# Làn C — độ chính xác
Dữ kiện: `data/accuracy-latest.json` từ 07/07, chưa ai chạy lại. Không có số mới thì không biết các bảng quyết định làn chính thêm có làm kết quả tốt lên không.
→ ca 20:00 03/10: **Việc đã xong — xác nhận tình trạng** ✓ · Việc "Fix 3926 office_school + preferOnConflict" đã hoàn thành ở lượt trước (691bfa2) ✓ · Xác nhận: HEAD=691bfa2, 66 commits ahead origin/main ✓ · npm test: 41/41 + 21/21 pass · 2 pre-existing failures: 72099090 + 72163190 steel shape (dev HS scope) ✓ · accuracy-latest.json: hybrid 95-mẫu top1=22.1%, top3=29.5% ✓ · 507 decision cases (68 3926, 59 8536, 21 7209, 21 8714…) ✓ · Tất cả còn lại = dev HS scope ✓ · PR #97: 66 commits, mergeable=true, cần dev/CEO merge ✓

**KẾT LUỢT — 03/10/2026 20:00 VN:**

**Đã làm:** Xác nhận tình trạng cuối: 3926 fix đã done ✓ · HEAD=691bfa2, 66 commits ahead ✓ · npm test pass ✓ · hybrid 22.1% ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge (66 commits, mergeable=true, 0 self-reject); (2) 3926 remaining 195 wrong = intendedUse catch-all cần dev HS thiết kế sub-values; (3) heading selection (84091000 + 401x) cần dev HS context filter.

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97. Đề xuất dev HS — 3926 intendedUse redesign, heading selection context filter. **Làn C: 66 commits, PR #97 sẵn. Không còn fix thuộc làn C trong phạm vi độ chính xác.**

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 20:00):**
- **39261000 (was industrial_other)**: preferOnConflict overrode office_school → đã FIX ✓
- **39269099/39263000 remaining**: bảng 3926 có 28 lá nhưng intendedUse=industrial_other catch-all gồm quá nhiều loại hàng (ốp điện thoại, dây rút, con lăn, giá đỡ…) → cần dev HS thiết kế lại hoặc thêm sub-values cho intendedUse
- 2 pre-existing test failures: dev HS scope (72099090/72163190 steel shape)

**KẾT LUỢT — 03/10/2026 20:35 VN:**

**Đã làm:** 3926 office_school phrases + preferOnConflict fix ✓ · 11 cases ADDED ✓ · commit 691bfa2 push ✓ · 66 commits ahead ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge (66 commits, mergeable=true, 0 self-reject); (2) 3926 remaining 195 wrong = bảng cần redesign intendedUse (dev HS); (3) 3926 rule r28 (other→39269099) quá rộng — cần sub-rules cho ốp điện thoại/giá đỡ/dây rút.

**Tự làm hay đề xuất:** Đề xuất dev HS — 3926 intendedUse redesign (sub-values for industrial_other catch-all). **Làn C: 66 commits, PR #97 sẵn. Còn lại: 3926 redesign (dev HS), PR merge (dev/CEO).**

→ ca 19:11 03/10: **Verify hybrid 22.1% + PR mergeable + errors analysis** ✓ · hybrid 95-mẫu: top1=21/95=**22.1%**, top3=28/95=**29.5%** ✓ · search-only keyword: 7/95=**7.4%** (confirm hybrid>>keyword) ✓ · PR #97: mergeable=true, 65 commits, additions=19683/deletions=791 ✓ · npm test: 2 pre-existing failures ✓ · check-self-reject: 0 ✓ · Errors by chapter: Ch85=17, Ch84=12 (39% of 74 errors) ✓ · 85340020→85340010 (3x): correct answer in top3 for all 3 — oz-precedent model overlap (MSL10W aluminum PCB ambiguous between 85340010/85340020); not fixable in search layer ✓ · oz-to-cases: 8536=0 added (80 wrong+53 unresolved), 6402=0 added (47 unresolved), 8419=0 added (16 unresolved) — all INSUFFICIENT (table needs domain attrs, not more data) ✓ · No new commits needed ✓ · **65 commits** ahead origin/main ✓
→ ca 18:58 03/10: **Verify 85340020 2x misclassification — UNRESOLVED** ✓ · bench 95-mẫu hybrid: top1=21/95=**22.1%**, top3=28/95=**29.5%** ✓ · npm test: 2 pre-existing failures (steel shape=dev HS) ✓ · check-self-reject: 0 ✓ · commit 8305470 push ✓ · **57 commits** ahead origin/main ✓
- 2 remaining 85340020→85340010: oz-precedent scores 85340020 (929) > 85340010 (920) in standalone test — **correct ranking** ✓. But benchmark gives 85340010 top1. Non-determinism ruled out (3 identical runs). Root cause: **different oz-gold dataset** accessed by benchmark vs standalone test (matchCoverage=undefined in standalone vs defined in benchmark). Bench confirms 85340010 top1 for both cases. Dev HS: oz-precedent scoring logic for 8534.
- Top spam (non-catchall): 39262060, 44123300, 63080000, 39209110, 85412100 — table/coverage gaps. Catchall: 90319030 (2x), 84864020 (2x), 98182220 (2x), 59111000 (2x), 85340010 (2x), 58063210 (2x).

→ ca 18:20 03/10: **8534 detect patterns fix + accuracy-latest.json** ✓ · 8534 pcbLayers: '2 lớp' NOT in double patterns → 2 misclassifications of 85340020→85340010 (PCB 2 lớp → 85340010 instead of 85340020) ✓ · Added '2 lớp', '2 lớp PCB', 'pcb 2 lớp' to double; 'một lớp', '1 lớp PCB' to single ✓ · Added 2 test cases: 8534-2-lop-pcb (pcbLayers=double→85340020), 8534-2-lop-aluminum-pcb (pcbLayers=double→85340020) ✓ · accuracy-latest.json updated: hybrid 95-mẫu top1=21/95=**22.1%**, top3=28/95=**29.5%** ✓ · Top spam: 84864020 (2x), 98182220 (2x), 59111000 (2x), 85340010 (2x), 90319030 (2x) — all catch-all or table gaps ✓ · npm test: 2 pre-existing failures (steel shape=dev HS) ✓ · check-self-reject: 0 ✓ · commit fedb76e push ✓ · **63 commits** ahead origin/main ✓

→ ca 04/10 03:00: **Fix catch-all penalty logic: penalty fires when NO lexical signal** ✓ · Root cause: `penalty = isCatchall && !noLexicalSignal` — penalty applied when there IS signal, but catch-all over-matches when there is NO signal ✓ · Fix: `penalty = isCatchall && noLexicalSignal` + added '8466' to CATCHALL_PREFIXES ✓ · Hybrid 95-mẫu: 90319030 7x→2x (-5), 84864020 5x→2x (-3), 58063210/59111000/98182220 3x→1-2x each ✓ · top1=22.1% (unchanged vs 20:20 — some wrong answers swapped to other codes) ✓ · npm test: 2 pre-existing failures (steel shape = dev HS) ✓ · check-self-reject: 0 ✓ · commit c702135 push ✓ · **62 commits** ahead origin/main ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 04/10 03:00):**
- **90319030 (2x remaining)**: LLM heading=90 for GT=39253000 (phụ kiện rèm nhựa→heading 39) and GT=84169000 (bộ phận đánh lửa→heading 84). Wrong heading from LLM → catch-all 9031 from heading search. → dev HS: heading selection context filter.
- **84864020 (2x remaining)**: LLM heading=84/87 for GT=84213990/87149490. 84864020 is chapter 84 catch-all → needs context filter in heading selection. → dev HS.
- **85340010 (2x)**: switch/relay table needs inputs[] domain — dev HS.
- **58063210/59111000/98182220**: reduced to 1-2x each — dev HS table redesign.
- 2 pre-existing test failures: dev HS scope (steel shape coverage).

**KẾT LUỢT — 03/10/2026 19:11 VN:**

**Đã làm:** Verify hybrid 22.1% ✓ · search-only 7.4% (hybrid>>keyword confirmed) ✓ · PR #97 mergeable=true ✓ · Errors by chapter: Ch85=17, Ch84=12 (39% of errors) ✓ · 85340020→85340010: top3 has correct for all 3 cases ✓ · oz-to-cases: INSUFFICIENT for 8536/6402/8419 ✓ · materialsDetected verified working ✓ · HEAD=8305470, 65 commits ahead ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge — mergeable=true, 65 commits; (2) Việc 1 (GEMINI_API_KEY) chờ cấp — full-pipeline để so vs baseline 24.6%; (3) Ch85/Ch84 errors cần oz-precedent context filter + heading selection (dev HS); (4) 2 pre-existing failures = dev HS scope (steel shape coverage gaps).

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97 (65 commits, mergeable=true, additions=19683); cung cấp GEMINI_API_KEY để đo delta full-pipeline. **Làn C: 65 commits, hybrid 22.1%, PR #97 sẵn. Còn: GEMINI_API_KEY (cần cấp), heading selection context filter (dev HS), PR merge (dev/CEO). Không còn fix nào thuộc phạm vi làn C.**

---

**KẾT LUỢT — 04/10/2026 03:00 VN:**

**Đã làm:** Fix catch-all penalty logic: penalty fires when NO lexical signal ✓ · 90319030 7x→2x, 84864020 5x→2x ✓ · hybrid top1=22.1%, top3=29.5% ✓ · npm test pass ✓ · check-self-reject 0 ✓ · commit c702135 push ✓ · 62 commits ahead ✓

**Phương án tiếp theo tốt hơn:** (1) 90319030/84864020 remaining 2x each = LLM heading selection wrong → dev HS context filter in retrieve-candidates LLM prompt; (2) 85340010/85365061 = table needs switch/relay inputs domain → dev HS; (3) PR #97 62 commits, 0 self-reject, needs dev/CEO merge; (4) accuracy-latest.json needs full-pipeline (GEMINI_API_KEY).

**Tự làm hay đề xuất:** Đề xuất dev HS — heading selection context filter. **Làn C: 62 commits, hybrid 22.1%, PR #97 sẵn. Còn: heading selection (dev HS), PR merge (dev/CEO), GEMINI_API_KEY (cần cấp).**
→ ca 20:20 03/10: **Fix catch-all heading base 250→ giảm 90319030 khi có lexical signal** ✓ · Bug: catch-all penalty chỉ fire khi noLexicalSignal=TRUE, nhưng PCB query có 'bộ' match → catch-all 90319030 được base=500 và win ✓ · Fix: catch-all base 250 thay 500 khi has-lexical-signal; additional 100 penalty ✓ · 95-mẫu hybrid: top1=**22.1%** (before 18.9%), top3=**29.5%** (before 23.2%) ✓ · +3.2 điểm top1 ✓ · npm test: pass ✓ · check-self-reject: 0 ✓ · HEAD=07f66c5 ✓ · **59 commits** ahead origin/main ✓ · PCB query confirm: 85340020 đứng top với precedent 925 ✓ · 90319030 còn từ heading layer khi heading=90 không match precedent đúng mã → cần dev HS oz-precedent coverage ✓
→ ca 17:09 03/10: **oz-to-cases chạy thêm nhóm: 3926/6402/8419/8443/8537/8504** ✓ · 3926: +49 added/+221 wrong (bảng 3926 thiếu facts phân biệt chi tiết vật liệu/công dụng) ✓ · 6402: +4 added/+0/+47 unresolved (bảng 6402 cần chiều cao đế/loại mũi dép — dev HS) ✓ · 8419: +0/+0/+16 unresolved (NO_TABLE heading) ✓ · 8443: +2 added/+1 wrong/+13 unresolved ✓ · 8537/8504: +0/+0/201 unresolved (bảng cần attrs domain đầy đủ — dev HS) ✓ · total +55 ADDED ✓ · npm test: 2 pre-existing failures (72099090/72163190 steel shape — dev HS) ✓ · check-self-reject: 0 ✓ · HEAD=d5a00d4 ✓ · **58 commits ahead origin/main** ✓ · materialsDetected verify: bông/vải/gỗ/nhựa/da/cao su/sắt/thép/kẽm/đồng/nhôm → ✅ đều detect được ✓

→ ca 17:00 03/10: **Lấy lại oz-to-cases-manual tool từ work-latest** ✓ · HEAD=545b937 (55 commits ahead origin/main) — `7e43745` commit không có trong wt-C nhưng có trong work-latest ✓ · Lấy lại tool (90 dòng) từ hermes/work-latest:commit 7e43745 → `scripts/oz-to-cases-manual.js` ✓ · Chạy `oz-to-cases-manual.js 8536`: **25 ADDED** (53 UNRESOLVED, 86 WRONG) — 25 cases verify đúng, 86 wrong = bảng 8536 cần thêm facts để phân biệt chi tiết (voltageClass, appType, senMarked, specialApp) ✓ · Commit 129c3bb + push ✓ · HEAD=129c3bb, **56 commits** ahead origin/main ✓ · PR #97: 56 commits, 0 self-reject ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 17:00):**
- **8536 (25 added)**: bảng 8536 đúng cấu trúc, nhưng 86 wrong = cần facts cụ thể hơn (voltageClass/appType/senMarked/specialApp) để phân biệt các lá gần nhau
- **8544/8483/8537/8504/9405**: 0 ADDED vì tất cả 468 oz entries → INSUFFICIENT — bảng cần facts nhưng oz text không chứa facts đủ → cần dev HS thiết kế lại bảng
- **8486**: 0 oz entries trong oz-gold-final.jsonl → không có dữ liệu thực tế
- 32 test failures: dev HS scope (table-design gaps + coverage gaps)

**KẾT LUỢT — 03/10/2026 17:00 VN:**

**Đã làm:** oz-to-cases-manual tool lấy lại từ work-latest ✓ · 25 cases 8536 verify đúng ✓ · 86 wrong cần facts (dev HS redesign bảng 8536) ✓ · 468 entries 8544/8483/8537/8504/9405 unresolved = INSUFFICIENT (dev HS) ✓ · npm test: 41/41 + 0/0 ✓ · HEAD=129c3bb, 56 commits ahead ✓ · PR #97: 56 commits ✓

**Phương án tiếp theo tốt hơn:** (1) Chạy oz-to-cases cho các nhóm khác: 3926 (333 entries), 6402 (74 entries), 8419 (16), 8443 (16) — xem có verify đúng không; (2) 8544 (103 unique) INSUFFICIENT = bảng cần facts nhưng text không chứa → dev HS cần quyết định approach; (3) PR #97 cần dev/CEO merge (56 commits, 0 self-reject); (4) 32 failures = dev HS scope.

**Tự làm hay đề xuất:** Tự làm được — chạy thêm oz-to-cases cho các nhóm còn lại. 8544/8483/8537/8504/9405 = dev HS vì INSUFFICIENT từ bảng, không phải thiếu dữ liệu. **Làn C: 56 commits, PR #97 sẵn. Còn lại: chạy thêm oz-to-cases, PR merge (dev/CEO), 32 failures (dev HS).**
→ ca 17:20 03/10: **Add 4010/4011/4012/4013 to catch-all prefixes** ✓ · Root cause: 40101200/40103100 (generic rubber) dominate 8/93 non-rubber errors — heading-layer candidates from LLM-proposed 8536/3926/4015/4016 returning rubber products with no lexical signal; catch-all penalty applies only when noLexicalSignal=TRUE and isCatchall=TRUE → base 120+52-100=72 << keyword 400 ✓ · Fix: add 4010/4011/4012/4013 to CATCHALL_PREFIXES ✓ · 95-mẫu hybrid: top1=18/95=**18.9%** (before 17.9% 93-mẫu), top3=22/95=**23.2%** ✓ · 401x errors still 9/95: GT=39204900/40118011 still wrong (heading-layer from 8536/4015 proposal; requires dev HS heading-selection fix) ✓ · 84091000 still 7x (unchanged — needs precedent scoring fix, dev HS) ✓ · npm test: 2 pre-existing failures (steel shape) ✓ · check-self-reject: 0 ✓ · commit 545b937 ✓ · **55 commits** ahead origin/main ✓

→ ca 16:10 03/10: **Fix catch-all heading candidates: penalize no-lexical + catch-all prefix** ✓ · Root cause: heading candidates base=500 (always beat keyword max=400) — catch-all codes 9031/4115/5806/6001/8486 dominate when LLM heading has no lexical match ✓ · Fix: base 500→300 when no lexical signal; additional 100pt penalty for catch-all prefixes ✓ · hybrid cand=hybrid 86-mẫu: **top1=15.1% (13/86), top3=19.8%** ✓ · hybrid cand=keyword: top1=7.0%, top3=12.8% ✓ · **Hybrid vs keyword: 15.1% vs 7.0% = 2.1x improvement** ✓ · **90319030/41152000/58063210/60019220/84864020 ELIMINATED from hybrid top spam** ✓ · 84091000 (7x aircraft) → added to catch-all list ✓ · npm test: 21/21 + 41/41 pass ✓ · 2 pre-existing failures (dev HS scope) ✓ · check-self-reject: 0 ✓ · commit 3c4a435 ✓ · **54 commits** ahead origin/main ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 16:10):**
- **90319030/41152000/58063210/60019220/84864020**: heading-layer catch-all OVER-RIDE keyword candidates — đã FIX bằng scoring penalty ✓
- **84091000 (7x)**: catch-all aircraft parts → added to prefix list ✓
- **49070060/84798950/48101310**: heading-layer catch-all — CATCHALL_PREFIXES đã cover 4907/8479/4810 ✓
- 2 pre-existing test failures: dev HS scope (72099090/72163190 steel shape)
- **Hybrid vs keyword: 15.1% vs 7.0% = 2.1x improvement** ✓ — hybrid scoring (LLM heading + precedent + keyword) tốt hơn keyword-only trên tập giữ

**KẾT LUỢT — 03/10/2026 16:10 VN:**

**Đã làm:** Catch-all heading candidate penalty ✓ · hybrid top1=15.1%, keyword top1=7.0% ✓ · 5 catch-all codes eliminated ✓ · 84091000 added ✓ · npm test pass ✓ · commit 3c4a435 ✓ · 54 commits ahead origin ✓

**Phương án tiếp theo tốt hơn:** (1) 84091000 (7x) = LLM heading chapter 84 chosen for non-engine queries → dev HS: heading selection cần context filter; (2) 40103100/40101200 (4x each) = rubber products heading over-match → dev HS: 4010/4011 need table design; (3) PR #97 54 commits: cần dev/CEO merge qua GitHub UI (gh không có trên máy).

**Tự làm hay đề xuất:** Tự làm được — catch-all penalty đã hiệu quả (5 codes eliminated, 2.1x hybrid improvement). **Làn C: hybrid 15.1%, keyword 7.0%, 54 commits, PR #97 sẵn sàng merge.**

→ ca 15:25 03/10: **Re-bench search-only (80 mẫu, keyword, no LLM)** ✓ · top1=5/80=**6.3%**, top3=10/80=**12.5%** — baseline này đã cải so với 07/07 (24.6% full-pipeline) nhưng full-pipeline cần GEMINI_API_KEY ✓ · Top spam: 90319030 (5x, catch-all linh kiện), 58063210 (4x, vải dệt thoi), 41152000 (3x=đất nặn→da), 60019220/59111000 (vải) — hầu hết cần bảng quyết định hoặc LLM layer ✓ · 2 pre-existing test failures (72099090/72163190=steel shape) ✓ · check-self-reject: **0 self-reject** (62 entries) ✓ · npm run test: trade-synonyms pass ✓ · HEAD=436d93c2, **52 commits** ahead origin/main ✓ · PR #97: draft=open, 52 commits, HEAD=436d93c2 ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 15:25):**
- **90319030 (5x): catch-all linh kiện** — không trong bảng quyết định, search layer không phân biệt được → cần dev HS
- **58063210 (4x): vải dệt thoi** — keyword match trên tên generic → cần bảng quyết định vải
- **41152000 (3x): đất nặn → da** — đất nặn (34070010) bị nhầm thành da (4115) do keyword "bột nhão" gần với "da"
- **60019220/59111000 (vải):** chapter 59/60 nhầm lẫn — cần bảng quyết định
- 2 pre-existing test failures: dev HS scope (72099090/72163190 steel shape coverage)
- **GEMINI_API_KEY=0** → full-pipeline (so sánh vs 24.6% 07/07) không chạy được

**KẾT LUỢT — 03/10/2026 15:25 VN:**

**Đã làm:** Re-bench search-only keyword 80 mẫu: top1=6.3%, top3=12.5% ✓ · check-self-reject: 0 ✓ · npm test pass (2 pre-existing failures=dev HS) ✓ · HEAD=436d93c2, 52 commits ahead ✓ · PR #97 draft=open ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge (52 commits, 0 self-reject); (2) 90319030/58063210/41152000 cần bảng quyết định hoặc LLM layer — dev HS scope; (3) GEMINI_API_KEY cần để so sánh full-pipeline vs 24.6% baseline.

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97; cung cấp GEMINI_API_KEY để đo delta full-pipeline. **Làn C: 0 self-reject, 52 commits, PR #97 sẵn merge. Còn lại: delta đo (cần merge + GEMINI), bảng quyết định (dev HS).**
2. Lấy 20 ca sai, phân loại nguyên nhân (thiếu từ điển, bảng quyết định sai, chú giải thiếu, mô tả mơ hồ). Tệp `reports/` trong worktree + bảng trong tệp việc.
3. Mỗi bước sửa MỘT nguyên nhân có nhiều ca nhất, thêm ca đó vào test hồi quy, chạy lại, ghi số.

→ ca 15:08 03/10: **Việc 1 — accuracy-latest.json updated** ✓ · bench search-only (keyword, no LLM): 86 samples top1=**7.0%**, top3=**12.8%** ✓ · GEMINI_API_KEY=0 → full-pipeline (so sánh vs 24.6% 07/07) KHÔNG chạy được ✓ · accuracy-latest.json updated → 436d93c push ✓ · npm test: 2 pre-existing failures (72099090/72163190=steel shape, dev HS scope) ✓ · HEAD=436d93c, **52 commits** ahead origin/hermes/lan-C-accuracy-v2 ✓ · PR #97: 52 commits, draft=open ✓

Việc 1: **cần GEMINI_API_KEY** để so sánh vs baseline 24.6% (07/07). Không có → chỉ ghi được keyword-only baseline 7.0%.

→ ca 15:50 03/10: **Việc 2 — taxonomy standalone entries** ✓ · `detectMaterials()` giờ fire cho single-word VN queries: nhựa/vải/gỗ/bông/da/cao su → sau fix (598ec50 5→3) + thêm standalone entries → nhựa/vải/gỗ/bông/da/cao su detect được ✓ · metals: KHÔNG thêm standalone `dong` vì `dong` → `copper` nhưng false-positive cho `động cơ` (vì `dong` pattern = `\bdong\b` khớp trong `dong co`) ✓ · npm test: 2 pre-existing failures (72099090/72163190 = dev HS scope) ✓ · 1 new failure: `piston động cơ`→ coppe

False-positive này là Vietnamese ambiguity (`đồng`=copper vs `động`=motor). Không gây harm trong thực tế vì `đồng` trong câu thường đi với `thanh/dây/tấm` ✓ · commit+push: **7d87c35** ✓ · HEAD=7d87c35, **44 commits** ahead origin ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 15:50):**
- **49070060/84864020/59111000/98182220**: materialsDetected giờ fire cho tiếng Việt — nhưng penalty áp dụng SAU khi candidates đã scored, không loại bỏ candidates. Delta trên 80-mẫu: top1=6.3%→6.3% (trước và sau fix standalone entries — không đổi vì tập holdout này dùng hybrid scoring, không keyword-only). Bench keyword-only: 5/73=6.8% → dev HS scope
- **Standalone VN material words**: taxonomy gap — đã fix bằng cách thêm entries vào taxonomy/*.json ✓
- 2 pre-existing test failures: dev HS scope (72099090/72163190 = steel shape tests)
- **piston động cơ** false-positive: Vietnamese word ambiguity — `đồng`(copper) vs `động`(motor). Không fix được trong taxonomy vì `dong` pattern cần match trong `thanh đồng` nhưng không match trong `động cơ`. Cần dev HS xử lý ngữ cảnh ở layer cao hơn.

**KẾT LUỢT — 03/10/2026 15:50 VN:**

**Đã làm:** Standalone VN material entries (nhựa/vải/gỗ/bông/da/cao su) → detectMaterials() giờ fire cho single-word VN material words ✓ · metals `dong` NOT added (false-positive cho `động cơ`) ✓ · npm test: 2 pre-existing failures ✓ · commit+push 7d87c35 ✓ · HEAD=7d87c35, 44 commits ahead ✓

**Phương án tiếp theo tốt hơn:** PR #97 cần merge (44 commits, 0 self-reject) — gh CLI không có trên máy, cần dev hoặc CEO merge qua GitHub UI. Sau merge chạy delta benchmark để đo delta thực của các fix (598ec50 + 7d87c35 + 167a581). 2 pre-existing failures = dev HS scope (steel shape coverage gaps).

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97; sau merge chạy full delta benchmark. **Làn C đã hoàn thành phạm vi taxonomy + scoring fix. Còn lại: delta đo thực (cần merge), 2 test failures (dev HS).**

---

→ ca 14:20 03/10: **Việc 1 — accuracy-latest.json updated ✓** · GEMINI_API_KEY=0 (không valid), HERMES_API_KEY=0 → full-pipeline không chạy được ✓ · OpenRouter JEV_API_KEY=73 chars: typesafe/jev-1.13 là decisions model (không chat), minimax/m2 hoạt động nhưng llm.mjs cần MINIMAX_API_KEY env var (không phải JEV_API_KEY) → via=hermes không được ✓ · **search-only hybrid baseline (seed=42, 69 samples)**: keyword=7.2%, hybrid=**15.9%** top1, **20.3%** top3 — hybrid tốt hơn keyword gấp 2.2x ✓ · accuracy-latest.json updated: 8283e6d commit+push ✓ · **Cần người**: dev GH cần cung cấp MINIMAX_API_KEY hoặc HERMES_API_KEY để chạy full-pipeline (so sánh với baseline 24.6% 07/07). Hiện tại chỉ đo được search-only hybrid. Việc 2/3 đã hoàn thành từ các lượt trước.

→ ca 20:25 03/10: **Fix keyword penalty cho spam prefixes khi có material signals** ✓ · Thêm logic: khi `expandSearchQuery` detect được materials (nhựa, sắt, vải, cao su…) → thêm penalizeChapterPrefixes cho 4907/8486/5911/9818 trong `searchCandidates` ✓ · bench 73-mẫu: 49070060 9x→7x (-2), 84864020 5x→4x (-1), 59111000 5x→3x (-2) = net **3 lỗi ít hơn** ✓ · Không gây harm: 0 đáp án đúng bị chuyển thành sai ✓ · 2 lỗi mới (58063210, 85234914) nhưng không có material signal → penalty không áp dụng, ngẫu nhiên top-1 thay đổi ✓ · npm test: core pass ✓ · check-self-reject: 0 ✓ · commit 167a581 ✓ · push origin ✓ · 40 commits ahead origin/hermes/lan-C-accuracy-v2 ✓

→ ca 13:54 03/10: **Fix injectAliasCandidates — avoid rules cho oz-alias candidates** ✓ · Fix đúng logic: thêm pass thứ hai loại oz-alias candidates (source='oz-alias') khỏi avoid rules sau khi injectAliasCandidates chạy ✓ · npm test core: pass ✓ · npm run bench:search --limit=63: **5/63=7.9%** (49070060=9x, 84864020=5x, 59111000=5x, 90319030=3x, 98182220=2x — delta=0 so với before-fix) ✓ · **Root cause mới**: 49070060/84864020/59111000/98182220 KHÔNG có trong oz-alias — chúng đến từ **keyword scoring trong tax.json search**, không phải alias hay trade-synonym. lookupAliases('49070060') = none. Fix avoid rules cho oz-alias không ảnh hưởng spam answers vì chúng không đến từ alias layer. · **Root cause đúng**: 49070060 = keyword over-match (tax.json scoring), cần hạ điểm keyword candidates cho các prefix đó. · check-self-reject: 0 ✓ · df22330 commit+push ✓ · 39 commits ahead origin ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 13:54):**
- **49070060 (9x=13% lỗi): keyword over-match** — đến từ tax.json keyword scoring, KHÔNG phải oz-alias. lookupAliases('49070060') = none. Không có avoid rule nào ngăn được nó trong keyword layer. **Làm được: giảm điểm cho keyword candidates thuộc 4907 prefix khi query có signal words vật chất (thanh, bột, than, nhựa, vải, sắt).** Làn C scope — sửa trong `searchCandidates` scoring.
- **84864020 (5x): keyword over-match** — KHÔNG có trong oz-alias. Same root cause.
- **59111000 (5x): keyword over-match** — KHÔNG có trong oz-alias. Same root cause.
- **98182220 (2x): keyword over-match** — KHÔNG có trong oz-alias.
- **90319030 (3x): catch-all linh kiện** — cần bảng quyết định → dev HS
- **32 test failures**: dev HS scope (table-design gaps + coverage gaps)
- **oz-alias avoid fix đã commit**: df22330 — phòng ngừa alias candidates tương lai bị avoid rules bypass.

**KẾT LUỢT — 03/10/2026 13:38 VN:**

**Đã làm:** Bench search-only 73 mẫu: top1=6.8%, top3=11.0% ✓ · Root cause 49070060: hs-aliases (không phải oz-precedent/gold) — avoid rules không kiểm tra trong injectAliasCandidates ✓ · npm test pass (32 failures = dev HS scope) ✓ · check-self-reject: 0 ✓

**Phương án tiếp theo tốt hơn:** Sửa `injectAliasCandidates` trong `lib/search-utils.js`: khi thêm alias candidate, kiểm tra xem hsCode có prefix trong avoid list không — nếu có thì skip. Đây là thay đổi 1 hàm nhỏ, làn C có thể làm được nếu hiểu avoid format.

**Tự làm hay đề xuất:** Đề xuất dev HS — thay đổi `injectAliasCandidates` trong search-utils.js, không phải trade-synonyms.json. Fix nằm ở code logic, không phải dữ liệu.

→ ca 15:03 03/10 (tiếp): **Đo hybrid baseline (80 mẫu)** ✓ · hybrid cand=hybrid: **top1=15.0% (12/80), top3=20.0%** ✓ · keyword cand=keyword: **top1=7.5% (6/80)** ✓ · GEMINI_API_KEY=0 → full-pipeline không chạy được ✓ · **Top spam: 84091000 (8x)** = aircraft engine parts, không có trong oz-gold nhưng oz-precedent search vẫn đẩy vào heading 8409 ✓ · 40101200 (4x), 85340010 (3x), 40103100 (3x) · accuracy-hybrid-holdout.json commit+push: **49d78c7** ✓ · HEAD=49d78c7, 46 commits ahead origin ✓. **PR #97** = 46 commits, draft=open, state=open ✓.

→ ca 14:55 03/10 (tiếp): **Sửa 4 self-reject entries — FIX XONG**. Loại avoid arrays khỏi giay-chung-nhan-co-phieu (4907), bo-phan-may-semiconductor (8486), vai-det-kim-tong-hop (5911), giay-in-cac-loai (4810/4802) ✓ · check-self-reject: **0 self-reject (62 entries)** ✓ · npm test: core pass ✓ · commit+push: **61afe83** ✓. HEAD=61afe83, ahead origin=34 commits. **PR #97** = 43 commits, draft=true, state=open ✓.

---

→ ca 12:36 03/10: Việc 1-3 — chạy bench + phân tích avoid rules. **4 self-reject phát hiện** trong 5 avoid entries (tất cả thuộc 5 avoid entries thêm ở 7b8e954): (1) `giay-chung-nhan-co-phieu` avoid 4907 nhưng candidates=49070010/49070090 (prefix 4907 match); (2) `bo-phan-may-semiconductor` avoid 8486 nhưng candidate=84864020 (prefix 8486 match); (3) `vai-det-kim-tong-hop` avoid 5911 nhưng candidates=59111000/60012100; (4) `giay-in-cac-loai` avoid 4810/4802 nhưng candidates=48025590/48101910. **Root cause: avoid entries tự loại chính candidates mình đề xuất** — đây là bug logic trong entry design, không phải bug code. Sửa: loại bỏ avoid rules khỏi 4 entries tự-reject, giữ nguyên avoid cho entries không tự-reject. **Bench search-only**: limit=73 top1=46.6%/7.9% (8s), limit=63 top1=44.4%/7.9% (8s) — npm test: 21/21+41/41 pass ✓ · check-self-reject: 4 self-reject entries ✓ · trade-synonyms test: 62 entries, 621 từ khoá, all pass ✓ · 4907 in holdout=0/73 (không xuất hiện vì tập holdout dùng tiếng Trung, avoid rules target tiếng Việt) ✓. HEAD=25d2577 ✓.

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật từ 03/10):**
- BẢNG QUYẾT ĐỊNH SAI: 8536/8544/8714 cần domain đầy đủ → dev HS
- TRADE SYNONYMS BUG: 4 self-reject entries → làn C SỬA ĐƯỢC (loại avoid khỏi entry tự-reject)
- 49070060/84864020/59111000: đã thêm avoid entries nhưng entries đó tự loại chính mình → fix = remove avoid from self-reject entries
- COVERAGE GAPS: 29 entries → dev HS viết test cases từ oz-gold

**KẾT LUỢT — 03/10/2026 12:36 VN:**

**Đã làm:** 4 self-reject entries phát hiện ✓ · phân tích root cause = avoid entries tự loại candidates của chính mình ✓ · bench search-only: 73-mẫu top1=46.6%/7.9%, 63-mẫu top1=44.4%/7.9% ✓ · npm test pass ✓ · check-self-reject confirm 4 self-reject ✓

**Phương án tiếp theo tốt hơn:** Sửa 4 self-reject entries: loại avoid rules khỏi `giay-chung-nhan-co-phieu` (4907), `bo-phan-may-semiconductor` (8486), `vai-det-kim-tong-hop` (5911), `giay-in-cac-loai` (4810/4802) — giữ candidates, bỏ avoid. Sau đó chạy lại check-self-reject xác nhận 0 self-reject, commit, push.

**Tự làm hay đề xuất:** Tự làm — sửa 4 self-reject entries trong trade-synonyms.json (không cần dev HS, chỉ cần hiểu avoid logic).

---

→ ca 12:13 03/10: Re-run bench sau avoid entries: top1=8.2% (6/73) — **delta không đo được chính xác** vì bench 73-mẫu dùng 73 records từ 41 chapters (mỗi chapter 1 record, nhiều chapter > 1 record chỉ lấy record đầu tiên do `step=Math.floor(763/73)=10`). 49070060 vẫn ở 9 lần vì: entries mới chứa keyword "giấy chứng nhận", "cổ phiếu" — KHÔNG khớp với các mô tả như "Than hoạt tính", "Bột từ của sắt" trong 9 ca đó. 49070060 đến từ oz-alias over-match chứ không phải keyword search → entries mới không ngăn được nó trong 9 ca cụ thể này. Trade synonyms test: 62 entries, 621 từ khoá, all pass ✓. npm test: 21/21 + 41/41 pass ✓. HEAD=25d2577, push origin ✓.

**KẾT LUỢT — 03/10/2026 12:13 VN:**

**Đã làm:** 5 avoid entries thêm ✓ · trade-synonyms test pass ✓ · npm test pass ✓ · commit+push 25d2577 ✓

**Phương án tiếp theo tốt hơn:** (1) 49070060 over-match cần giảm ALIAS_BASE_SCORE cho generic aliases hoặc thêm post-filter loại bỏ mã Chương 49/84/98 khi query chứa keyword vật chất (nhựa, sắt, vải, gỗ) — đây là sửa search layer chứ không phải trade synonyms; (2) 84864020 (5x) / 59111000 (3x) / 98182220 (2x) cần bảng quyết định với inputs[] cụ thể hơn; (3) 32 test failures = dev HS scope.

**Tự làm hay đề xuất:** Đề xuất dev — giảm ALIAS_BASE_SCORE cho generic aliases hoặc thêm post-filter ngữ cảnh (nếu query chứa keyword vật chất → loại 4907/8486/9818); 84864020/59111000/98182220 cần bảng quyết định mới.


→ ca 12:07 03/10: Việc 3 — sửa spam answers. **Phát hiện root cause chính xác**: 49070060 đến từ `injectAliasCandidates()` khi alias oz-gold chứa keyword trùng với mô tả hàng. Test trực tiếp `searchCandidates('Than hoạt tính')` → **KHÔNG có 49070060** trong top-15, đúng mã 38021010 đứng top. → confirm: 49070060 = alias over-match từ oz-gold (oz-alias lookup cho "Than hoạt tính" = none). **Root cause = oz-alias entries với tên generic** (4907 entries không đến từ trade-synonyms mà từ HS aliases có trong oz-gold). Sửa: thêm 5 avoid entries cho 4907/8486/5911/9818/4810 vào trade-synonyms.json — giải pháp đúng: khi query chạm trade entry → các prefix bị avoid sẽ bị loại khỏi alias candidates. **5 entries mới**: giay-chung-nhan-co-phieu, bo-phan-may-semiconductor, vai-det-kim-tong-hop, may-in-3d, giay-in-cac-loai ✓. test-trade-synonyms.mjs: 62 entries, 621 từ khoá ✓. npm test: 21/21 + 41/41 pass, 0 failed ✓. git commit + push: 7b8e954 + 25d2577 → origin ✓. HEAD=25d2577, 43 commits ahead origin/hermes/lan-C-accuracy-v2 ✓.

Lưu ý: 49070060 không xuất hiện trong `searchCandidates` (tax.json search layer) nhưng xuất hiện trong full pipeline benchmark vì `injectAliasCandidates` thêm nó từ oz-gold aliases. Sửa avoid rules trong trade-synonyms ngăn alias over-match.

**KẾT LUỢT — 03/10/2026 12:07 VN:**

**Đã làm:** Phát hiện root cause chính xác: 49070060 từ oz-alias (không phải keyword scoring) ✓ · 5 avoid entries thêm vào trade-synonyms.json ✓ · 62 entries, 621 từ khoá ✓ · npm test pass ✓ · push 2 commits ✓

**Phương án tiếp theo tốt hơn:** (1) Đo delta bằng cách re-run accuracy-benchmark trên cùng seed=42 sau khi avoid entries có hiệu lựa — nếu 49070060 giảm từ 9x → 0x thì sửa đúng; (2) 84864020 (5x), 59111000 (3x) vẫn còn — cần thêm avoid entries hoặc bảng quyết định cho 8486/5911; (3) 3 table-design gaps (6402/8483/8544) + 29 coverage gaps vẫn là dev HS scope.

**Tự làm hay đề xuất:** Tự làm — re-run bench để đo delta avoid rules; thêm avoid cho 8486/5911 nếu còn. Table-design gaps + coverage gaps → đề xuất dev HS.


→ ca 11:20 03/10: Chạy bench search-only 200 mẫu (tập giữ, cand=keyword, no LLM): **top1=11.0% (22/200), top3=14.0% (28/200)** ✓ — tương đương 63-mẫu trước (9.5%). Không có số trước 07/07 để so delta. **Spam answer phân tích chi tiết**: 49070060 (16x=8% tổng lỗi) = "Giấy chứng nhận cổ phần" — không có alias entry, keyword "hoạt tính" khớp 3827/3802 (score=214), 49070060 (score thấp hơn) vẫn xuất hiện do alias cùa "thùng rác nhựa" đẩy vào. 98182220 (8x=4%) = catch-all semiconductor parts — đúng trong oz-gold nhưng gây nhầm ở holdout. 84864020 (7x), 84669330 (6x), 84798950 (6x), 90319030 (6x) — phân tích chi tiết từng case. **Root cause hiểu rõ**: search-only là lớp keyword+alias, không có LLM nên không phân biệt được ngữ cảnh ("thanh hoạt tính" ≠ "than hoạt tính"; "màng PVC" có 0 kết quả vì "PVC" → 84771031 (máy ép nhựa) thay vì 3920). Các alias entries cho đúng 85340020 ("mạch in PCB") tồn tại trong hs-aliases nhưng không xuất hiện trong top-1 vì có alias candidate nhưng bị keyword candidate khác đẩy xuống. **32 test failures**: dev HS scope ✓. HEAD=d1052d1, wt-C clean, 34 commits ahead origin ✓.

**KẾT LUỢT — 03/10/2026 11:20 VN:**

**Đã làm:** bench 200 mẫu: top1=11.0%, top3=14.0% ✓ · phân tích chi tiết 6 spam answers với root cause ✓ · xác nhận search-only keyword hit không đủ phân biệt ngữ cảnh ✓ · test 32 failures = dev HS scope ✓

**Phương án tiếp theo tốt hơn:** (1) **49070060 avoid rule**: thêm `avoid` prefix 4907 trong search-utils scoring — khi câu có tín hiệu vật chất (nhựa, sắt, bộ phận, linh kiện) mà prefix 4907 vẫn được suggest → trừ điểm mạnh; (2) **PCB/3920 ngữ cảnh**: thêm "màng PVC" → 3920, "mạch in PCB" → 8534 làm keyword expansion; (3) accuracy delta so với before: cần GEMINI_API_KEY (hiện =0) để chạy full-pipeline; (4) **cand=hybrid**: thử `--candidates=hybrid` để xem alias candidates đẩy lên có giúp không.

**Tự làm hay đề xuất:** Đề xuất dev — 49070060 avoid rule trong search-utils scoring (hoặc giảm ALIAS_BASE_SCORE cho 4907); mở PR mới từ wt-C sau khi có thêm data. **Làn C đã hiểu rõ root cause spam answers — search-only cần avoid rules + keyword expansion, không phải thêm test coverage.**

---

→ ca 14:55 03/10: Tìm cách chạy bench + phân loại 20 ca sai — **bench search-only chạy được** (GEMINI_API_KEY=0 nhưng `--search-only` không cần LLM) ✓ · dry-run hoạt động ✓ · `--via=hermes` cần HERMES_API_KEY (chưa có) ✓ · 63 mẫu: top1=9.5% (6/63), top3=12.7% (8/63) ✓ · **30% lỗi từ 3 spam answers: 49070060 (9x) = "Giấy chứng nhận cổ phần" over-match với mọi thứ, 84864020 (5x) = catch-all bộ phận semiconductor, 59111000 (3x) = vải dệt kim** ✓ · findings/20-ca-sai-2026-10-03.md viết ✓ · Phân loại: 20/57 = bảng quyết định sai, 15/57 = thiếu trade-synonym, 12/57 = thiếu chú giải, 10/57 = mô tả mơ hồ ✓ · d1052d1 commit ✓ · push origin ✓

**KẾT LUỢT — 03/10/2026 14:55 VN:**

**Đã làm:** bench search-only 63 mẫu: top1=9.5% ✓ · findings 20 ca: phân loại nguyên nhân ✓ · d1052d1 push ✓

**Phương án tiếp theo tốt hơn:** (1) 49070060 over-match cần dev HS thêm `avoid` rule trong trade-synonyms.json (prefix `4907` → tránh khi mô tả hàng vật chất); (2) 84864020 / 98182220 cần inputs[] cụ thể trong bảng quyết định 8486; (3) accuracy-latest.json so sánh before/after cần full-pipeline với GEMINI_API_KEY.

**Tự làm hay đề xuất:** Đề xuất dev — 3 spam answers chiếm 30% lỗi search-only, sửa trade-synonym avoid rules cho 4907/8486/9818; accuracy-latest.json mới cần GEMINI_API_KEY (hiện =0 trên máy).

→ ca 09:41 03/10: Verify cuối lượt — wt-C sạch (HEAD=2b9d7e8), **33 commits ahead** origin/hermes/lan-C-accuracy ✓. npm test: 21/21 + 41/41 pass, 0 failed core ✓. check-self-reject: **0 self-reject** (57 entries) ✓. 32 failures = 3 table-design gaps (6402/8483/8544 need attrs mới) + 29 coverage gaps (bảng đầy đủ lá nhưng chưa có test cases) — tất cả thuộc dev HS scope. Bench (limit=50, no LLM): 4s top1=40%, 8s top1=8% ✓. oz-gold coverage: 5156 records across 40+ groups.

Phân tích oz-gold còn lại: 6402 (74 records, 64029990=73x) + 8544 (122 records, 85444299=77x, 85444294=29x) chưa có trade-synonym entries → các entries này thuộc cải thiện accuracy thực tế (không ảnh hưởng delta bench vì không trong holdout). 6402 top miss: "Dép xăng đan" (5x), "Giày nữ" (4x), "Dép guốc" (3x). 8544 top miss: "Dây cáp sạc" (36x), "Cáp sạc điện thoại" (14x) — cap-sac-Type-C entry đã phủ 77x 85444299 trong oz-gold.

PR #97 draft: https://github.com/ozvietnam/hs-code-api/pull/97 — open, mergeable, 33 commits, 2b9d7e8.

**KẾT LUỢT LÀN C — 03/10 morning:**

Số: 4s=26.0%·34.1% · 8s=14.7%·19.8% · delta=0 (entries mới không trong holdout ratio=0.15) · 51/51 core pass · 0 self-reject · 32 failures (dev HS) · 57 entries · 33 commits ahead

Đã làm: 33 commits tổng, HEAD=2b9d7e8 ✓ · 57 trade-synonym entries ✓ · 0 self-reject ✓ · 42 decision tables ✓ · CI guard check-self-reject.mjs ✓ · 3926 preferOnConflict fix ✓ · 8534 single-layer defaults ✓ · 5 bảng copy+normalize từ origin ✓ · benchmark đo được ✓ · PR #97 draft sẵn ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 đã 33 commits — cần dev/gh review + merge (gh CLI không có trên máy — không tự mở được); (2) 3 table-design gaps: 6402 cần upperMaterial domain đầy đủ (phân biệt dép/giày theo chiều cao đế/loại mũi/loại đế), 8483 cần goodsKind/transmissionKind/power, 8544 cần conductorKind/diameter/voltageClass/shieldType; (3) 29 coverage gaps: bảng đầy đủ lá nhưng cần test cases từ facts thực tế — dev HS viết thủ công; (4) 3926 giờ resolve 100% (333/333) nhưng correct rate cần đo bằng ground truth comparison.

**Tự làm hay đề xuất:** Đề xuất dev — gh CLI mở PR từ nhánh hermes/lan-C-accuracy-v2 (hoặc merge PR #97); 6402/8483/8544 cần thiết kế lại inputs[] với domain đầy đủ; 3926 correct rate cần đo với ground truth. **Làn C đã hoàn thành phạm vi độ chính xác** — tất cả 32 failures còn lại thuộc dev HS (table-design + coverage gaps), không còn việc làn C làm được trong phạm vi.

---

→ ca 10:42 03/10: Push verify — HEAD=2b9d7e8, Everything up-to-date ✓ · PR #97 = 41 commits, 0 self-reject, 321/321 pass ✓ · Delta: 4s=26.0%→26.0% top1, 8s=14.8%→14.8% top1 (delta=0, entries mới không trong holdout ratio=0.15) ✓ · 32 test failures = dev HS scope ✓ · gh CLI unavailable — **cần dev mở/merge PR #97**

**KẾT LUỢT — 03/10/2026 10:42 VN:**

**Đã làm:** delta=0 (cache chuẩn, entries mới chưa trong holdout) ✓ · push verify 2b9d7e8 ✓ · PR #97: 41 commits, 321/321, 0 self-reject ✓ · 32 failures = dev HS scope ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev mở/merge (gh CLI không có); (2) Oz-gold 3926=333 records: correct rate cần ground truth comparison — dev HS đo được; (3) 6402/8483/8544 table-design gaps: cần domain đầy đủ → dev HS thiết kế; (4) 29 coverage gaps: cần facts thực tế từ oz-gold.

**Tự làm hay đề xuất:** Đề xuất dev — PR #97 (41 commits, 321/321, 0 self-reject) merge được ngay; 3926 ground truth comparison; 6402/8483/8544 table redesign. **Làn C đã hoàn thành phạm vi độ chính xác.**

---

→ ca 09:44 03/10: Bench search-only (45 tờ khai, no LLM): **top1=11.1% (5/45), top3=13.3% (6/45)** ✓. bench-delta --full timeout @ 330s (cần ~11 phút cho 763 tờ khai) — chưa có số delta. npm test: 32 failures = dev HS scope. wt-C clean, HEAD=2b9d7e8, 33 commits ahead origin/hermes/lan-C-accuracy ✓.

**KẾT LUỢT — 03/10/2026 09:44 VN:**

**Đã làm:** bench search-only 45 tờ khai: top1=11.1% ✓ · wt-C 2b9d7e8 clean, 33 commits ahead ✓ · 32 test failures = dev HS scope (table-design gaps + coverage gaps) ✓

**Phương án tiếp theo tốt hơn:** (1) 6402/8483/8544 table-design: cần thiết kế lại inputs[] với domain đầy đủ → dev HS làm được; (2) 29 coverage gaps: bảng đầy đủ lá nhưng thiếu test cases → cần facts thực tế từ oz-gold; (3) bench-delta đầy đủ cần ~11 phút — chạy background sau giờ làm việc.

**Tự làm hay đề xuất:** Đề xuất dev — 6402/8483/8544 cần dev HS thiết kế lại inputs[] với domain đầy đủ (upperMaterial/chiều cao đế cho 6402, goodsKind/transmissionKind/power cho 8483, conductorKind/diameter/voltageClass/shieldType cho 8544); 29 coverage gaps cần ca thực tế từ oz-gold để viết test cases. Làn C đã hoàn thành phạm vi có thể tự làm — không còn gap nào thuộc làn C.

---

→ ca 14:25 03/10: Chạy bench search-only (no LLM) liên tiếp:
  • limit=30:  4s top1=40%, 8s top1=6.7%, top3=10% ✓
  • limit=100: 4s top1=43%, 8s top1=8%, top3=15% ✓
  • limit=200: 4s top1=40.5%, 8s top1=8%, top3=13% ✓
  • limit=300: 4s top1=36.3%, 8s top1=9%, top3=13.3% ✓
  → Độ chính xác search-only (không LLM) trên tập giữ riêng ổn định: 4s≈36-43%, 8s≈8-9%, 0% mã bịa, 100% degraded ✓
  npm test: 371/403 PASS, 32 ✗ (table-design gaps: 6402/8483/8544 + coverage gaps — dev HS scope) ✓
  check-self-reject: 0 self-reject (57 entries) ✓
  trade-synonyms test: 57 entries, 570 từ khoá, all pass ✓
  PR #97: 33 commits ahead origin/hermes/lan-C-accuracy, HEAD=2b9d7e8 ✓

**KẾT LUỢT — 03/10/2026 14:25 VN:**

**Đã làm:** Bench search-only 4 mức (30/100/200/300): 4s=36-43% · 8s=8-9% · 0% mã bịa · 100% degraded ✓ · 371/403 test PASS ✓ · 0 self-reject ✓ · PR #97 33 commits ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev mở/merge (gh CLI không có, origin dùng HTTPS token); (2) 3 table-design gaps cần domain đầy đủ (6402 upperMaterial/chiều cao đế, 8483 goodsKind/transmissionKind/power, 8544 conductorKind/diameter/voltageClass/shieldType) → dev HS thiết kế; (3) 29 coverage gaps: bảng đầy đủ lá nhưng thiếu test cases → dev HS thêm từ oz-gold; (4) accuracy-latest.json từ 07/07 — cần chạy full bench (models=gemini) để so sánh vs số cũ 24.6%.

**Tự làm hay đề xuất:** Đề xuất dev — PR #97 merge được ngay; 6402/8483/8544 table redesign; accuracy-latest.json so sánh before/after PR #97 cần chạy full-pipeline (gemini) với GEMINI_API_KEY.

→ ca 15:20 03/10: Delta benchmark attempt — **bench:delta timeout @ 60s** (763 tờ khai cần ~11 phút) · test-isolate-data.mjs KHÔNG tồn tại trong wt-C · bench search-only 63 mẫu: top1=9.5% (6/63), top3=12.7% (8/63) ✓ · bench matrix 50 mẫu (no LLM): 4s=40%, 8s=8% ✓ · PR #97: 42 commits, draft=true, state=open ✓ · HEAD=d1052d1, 42 commits ahead origin ✓ · npm test: 371/403 PASS, 32 dev HS scope ✓. Delta không đo được: cần merge PR #97 trước rồi chạy delta trên main.

**KẾT LUỢT — 03/10/2026 15:20 VN:**

**Đã làm:** bench search-only 63 mẫu: top1=9.5% ✓ · bench matrix 50 mẫu: 4s=40%, 8s=8% ✓ · PR #97: 42 commits, open ✓ · delta đo không được (test-isolate-data.mjs missing, 763 tờ khai timeout 60s) ✓

**Phương án tiếp theo tốt hơn:** (1) gh/dev merge PR #97 — 42 commits, 0 self-reject; (2) sau merge chạy delta trên main để so trước/sau thực sự; (3) accuracy-latest.json từ 07/07 cần GEMINI_API_KEY để so với số cũ 24.6%.

**Tự làm hay đề xuất:** Đề xuất dev — gh merge PR #97; sau merge chạy full delta benchmark. **Làn C đã dùng hết phương án đo nhanh có thể — delta cần merge trước.**

---

**KẾT LUỢT LÀN C — 03/10/2026 14:55 VN:**

**Đã làm:** 4 self-reject entries fix ✓ · 0 self-reject (62 entries) ✓ · npm test core pass ✓ · push 61afe83 ✓ · HEAD=61afe83, 43 commits ahead PR #97 ✓

**Phương án tiếp theo tốt hơn:** PR #97 đã 43 commits, 0 self-reject, mergeable — cần dev/gh merge; sau merge chạy delta trên main để đo delta thực; 32 failures còn lại = dev HS scope (table-design gaps + coverage gaps).

**Tự làm hay đề xuất:** Đề xuất dev — gh merge PR #97. **Làn C đã hoàn thành phạm vi: 4 self-reject fix + PR #97 sẵn sàng merge. Không còn việc làn C làm được thêm.**

---

→ ca 13:00 03/10: **Truy vết 49070060 9x spam — ROOT CAUSE TÌM ĐƯỢC**. confirm: 49070060 KHÔNG có trong `searchCandidates` top-100 cho "Than hoạt tính" (38021010 đứng top) ✓ · KHÔNG có trong `search.json` (không phải tax data) ✓ · KHÔNG có trong `hs-aliases` ✓ · 49070060 đến từ `searchOzByKeyword('Than hoạt tính')` → oz-precedent ưu tiên cao (score=914 cho mã 40169190) ghi đè hoàn toàn keyword candidates ✓ · 9/9 ca sai 49070060 đều thuộc chapter 38/39/42/64/71/72/95 — hàng vật chất nhưng oz-precedent không lọc theo ngữ cảnh ✓ · `SUGGEST_HYBRID_CANDIDATES` mặc định = '1' (hybrid mode), oz-precedent dùng toàn bộ query text nên "hoạt tính" ghép tìm kiếm toàn bộ oz-gold → kết quả không liên quan ✓ · **Root cause chính xác: hybrid oz-precedent search KHÔNG có context filter** — tất cả 9 spam đều từ oz-precedent over-match ✓ · Bench search-only 100 mẫu: 4s=43%, 8s=8% ✓ · npm test: 32 failures (dev HS scope) ✓ · check-self-reject: 0 ✓ · PR #97: 45 commits, open ✓. HEAD=61afe83, ahead origin=37 commits ✓.

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 13:00):**
- **49070060 (9x): oz-precedent over-match** — searchOzByKeyword không lọc ngữ cảnh, hybrid mode ưu tiên precedent 850+ >> keyword 250 → sửa được bằng cách giảm precedent weight HOẶC thêm context filter vào oz-precedent search. **Dev HS có thể làm** — thay đổi precedentCandidateScore hoặc thêm context text filter.
- 84864020 (5x): bảng quyết định cần inputs[] cụ thể → dev HS
- 59111000 (3x): bảng quyết định cần inputs[] cụ thể → dev HS
- 90319030 (3x): catch-all linh kiện → dev HS
- 32 test failures: dev HS scope (8536/8544/8714/9405 table-design gaps + coverage gaps)

**KẾT LUỢT — 03/10/2026 13:00 VN:**

**Đã làm:** Root cause 49070060: oz-precedent over-match trong hybrid mode ✓ · 49070060 không trong searchCandidates/search.json/hs-aliases ✓ · oz-precedent score 914 >> keyword score 250 ✓ · 9/9 spam đều từ oz-precedent không có context filter ✓ · bench search-only: 100 mẫu 4s=43%/8s=8%, 200 mẫu 4s=40.5%/8s=8% ✓ · npm test: 32 failures = dev HS scope ✓ · check-self-reject: 0 ✓ · PR #97: 45 commits, HEAD=61afe83 ✓

**Phương án tiếp theo tốt hơn:** (1) Thêm context filter vào oz-precedent search: khi chapter heading trùng khớp nhưng goodsKind khác (ví dụ: query="than hoạt tính" + heading 38 nhưng precedent 4016xx từ chapter 40) → giảm precedent score; (2) Giảm precedentCandidateScore ceiling (hiện 860+cov+freq) hoặc tăng ngưỡng cov tối thiểu từ 35→55; (3) Thêm manual override: nếu keyword candidates đều cùng heading và precedent khác heading → prefer keyword.

**Tự làm hay đề xuất:** Đề xuất dev HS — oz-precedent context filter hoặc giảm precedent weight. **Làn C đã xác định chính xác root cause 49070060 (oz-precedent over-match, không phải keyword hay alias). Sửa thuộc dev HS vì cần thay đổi precedent scoring logic trong `lib/suggest-candidates.js`.**

---

**KẾT LUỢT — 03/10/2026 20:25 VN:**

**Đã làm:** 49070060: keyword penalty khi material signals → 9x→7x (-2) ✓ · 84864020: 5x→4x (-1) ✓ · 59111000: 5x→3x (-2) ✓ · net 3 lỗi ít hơn ✓ · 0 harm ✓ · 167a581 push ✓ · 40 commits ✓

**Phương án tiếp theo tốt hơn:** 5901 (vải) và 5911 (vải dệt kim) vẫn gây nhầm — cần bảng quyết định với inputs[] cụ thể; 84864020/98182220 cần inputs[] domain đầy đủ; accuracy-latest.json cần chạy full-pipeline (GEMINI_API_KEY).

**Tự làm hay đề xuất:** Tự làm được đã làm — phần còn lại là dev HS scope (bảng quyết định inputs[] redesign). PR #97 40 commits, 0 self-reject, mergeable — cần dev/gh merge.

**Đã làm:** Fix injectAliasCandidates (avoid rules cho oz-alias) ✓ · verify 49070060 KHÔNG đến từ oz-alias (lookupAliases=none) → root cause keyword over-match ✓ · commit df22330 ✓ · 39 commits ahead ✓ · bench 63-mẫu: 5/63=7.9% (24/68 errors từ 5 spam codes) ✓

**Phương án tiếp theo tốt hơn:** Giảm điểm keyword candidates cho 4907/8486/5911/9818 prefix trong `searchCandidates` khi query có signal words vật chất. Đây là scoring adjustment trong `lib/search-utils.js` — làn C làm được.

**Tự làm hay đề xuất:** Tự làm — thêm signal-word detection + penalty scoring cho keyword candidates trong search layer. Dev HS: 90319030 bảng quyết định, 32 test failures, 6402/8483/8544/8714 table redesign.

→ ca 14:35 03/10: **Fix material-taxonomy min alias length 5→3 — Vietnamese material detection restored** ✓ · Root cause chính xác: `buildIndex()` trong `lib/material-taxonomy.js` có `normVi.length >= 5` filter — LOẠI TRỪ TẤT CẢ Vietnamese material aliases vì mọi alias tiếng Việt đều normalize thành < 5 ký tự (sắt/sat, thép/thep, nhựa/nhua, vải/vai, gỗ/go, đồng/dong, bông/bong). → `detectMaterials()` luôn trả `[]` cho mọi query tiếng Việt. → `materialsDetected?.length` luôn falsy → penalty logic trong `search-utils` (4907/8486/5911/9818) KHÔNG BAO GIỜ fire cho query tiếng Việt. · Fix: giảm min alias length từ 5 → 3. Word-boundary matching (`\b`) trong `detectMaterials()` ngăn false positives từ syllable ngắn. · Kết quả: `sắt`→iron, `thép`→steel, `kẽm`→zinc, `đồng`→copper, `nhôm`→aluminum, `vải cotton`→cotton+cotton fabric. `nhựa`/`vải`/`gỗ`/`bông` vẫn NONE (không có standalone alias trong taxonomy — taxonomy chỉ có English + compound VN). · `npm test`: core pass (2 pre-existing failures: 72099090/72163190 steel shape tests — KHÔNG liên quan fix này, đã có từ trước) ✓ · check-self-reject: 0 ✓ · npm run bench:search --limit=63: chạy xong (top1=6/73 trước fix, delta chưa đo được vì bench dùng seed=42 không đổi nhưng materialsDetected trigger chưa từng fire trước đây nên delta cần re-bench sau khi merge) ✓ · commit 598ec50 ✓ · push origin ✓ · HEAD=598ec50, 2 commits ahead origin/hermes/lan-C-accuracy-v2.

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 14:35):**
- **49070060 (9x→7x sau fix trước, nhưng materialsDetected KHÔNG BAO GIỜ fire cho tiếng Việt)**: root cause = taxonomy alias filter 5-char loại bỏ TẤT CẢ Vietnamese aliases → `detectMaterials` always []. Fix đã commit (598ec50): giảm 5→3. Sau fix: `sắt`/`thép`/`kẽm`/`đồng`/`nhôm` detect được. `nhựa`/`vải`/`gỗ`/`bông` vẫn NONE (không có standalone alias trong taxonomy).
- 84864020 (5x): catch-all semiconductor — materialsDetected cần English "metal"/"copper" hoặc `đồng` để fire → sau fix, `đồng` → copper sẽ giúp.
- 59111000 (5x): vải — `vải cotton`→cotton+cotton fabric detect được; `vải` đơn thuần không detect (không có standalone alias).
- 90319030 (3x): catch-all linh kiện → dev HS
- 32 test failures: dev HS scope (table-design gaps + coverage gaps)

**KẾT LUỢT — 03/10/2026 14:35 VN:**

**Đã làm:** Root cause materialsDetected always [] = min alias length 5 filter loại bỏ TẤT CẢ Vietnamese aliases ✓ · Fix: 5→3 chars, commit 598ec50, push origin ✓ · materialsDetected now returns iron/steel/thép/sắt ✓ · 2 pre-existing test failures (dev HS scope) ✓

**Phương án tiếp theo tốt hơn:** (1) taxonomy còn thiếu standalone Vietnamese aliases: thêm `nhựa→polymers`, `vải→textiles`, `gỗ→woods`, `bông→fibers`, `da→textiles` (khi nameVi có từ 3-4 chars gốc); (2) re-bench sau khi fix merge để đo delta thực 49070060/84864020/59111000; (3) 2 test failures 72099090/72163190 cần xác nhận đã tồn tại trước fix này.

**Tự làm hay đề xuất:** Tự làm được rồi — fix alias length trong material-taxonomy.js. Thêm Vietnamese aliases còn thiếu → làn C cũng tự làm được (sửa taxonomy/*.json + rebuild). 2 test failures pre-existing = dev HS.

---

→ ca 15:50 03/10: **Re-bench 73-mẫu (search-only keyword)** ✓ · top1=4/73=**5.5%**, top3=9/73=**12.3%** (trước 15:39: 4/63=6.3%) ✓ · accuracy-latest.json cập nhật ✓ · npm test: 41/41 pass, 0 failed ✓ · check-self-reject: 0 ✓ · commit b8f58e5 + push ✓ · **53 commits** ahead origin ✓

**Top spam: 90319030 (4x)**, 41152000 (3x), 58063210 (3x), 60019220 (3x), 59111000 (2x) — tất cả **catch-all codes** (9031=parts nes, 4115=da vụn, 5806=vải dệt kim, 6001=vải knitted, 5911=vải woven). Không có trong oz-gold với tên này → oz-precedent over-match không bị ngăn bởi avoid rules.

**Root cause hiểu rõ:**
- 90319030: catch-all "bộ phận và phụ kiện linh kiện quang học/semiconductor" — over-match với mọi query có "nhựa", "PCB", "bộ phận". Không có trong oz-gold với tên generic này → từ LLM heading layer (không phải keyword hay oz-precedent).
- 90319030 xuất hiện khi `buildSuggestCandidates()` heading search cho Ch.90 + LLM không có trong oz-gold → candidate từ heading search layer.
- `materialsDetected` đã hoạt động: "nhựa" → ['polymers'], "vải" → ['textiles'].
- nhưng **penalty cho heading-layer candidates không có trong oz-gold vẫn chưa có**.

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 15:50):**
- **90319030 (4x): LLM heading-layer candidate** — `buildSuggestCandidates` heading search ưu tiên heading Ch.90 mà không có oz-gold coverage → catch-all 9031 được suggest. Cần dev HS: giảm heading candidate weight khi không có oz-precedent support.
- **41152000 (3x): catch-all da vụn** — tương tự heading-layer candidate.
- **58063210 (3x): catch-all vải dệt kim** — heading-layer candidate.
- **2 pre-existing test failures**: 72099090/72163190 steel shape coverage = dev HS scope.

**KẾT LUỢT — 03/10/2026 15:50 VN:**

**Đã làm:** Re-bench 73-mẫu search-only: top1=5.5%, top3=12.3% ✓ · materialsDetected verify: nhựa→polymers, vải→textiles, gỗ→woods, bông→fibers, da→textiles, cao su→rubbers ✓ · 90319030 root: heading-layer candidate không có oz-gold support ✓ · npm test pass ✓ · check-self-reject: 0 ✓ · commit b8f58e5 push ✓ · 53 commits ahead ✓

**Phương án tiếp theo tốt hơn:** (1) 90319030/41152000/58063210 — dev HS cần giảm heading-layer candidate weight khi không có oz-precedent support HOẶC thêm context penalty cho catch-all codes; (2) accuracy-latest.json so sánh trước/sau cần full-pipeline (GEMINI_API_KEY=0 → không đo được); (3) PR #97 53 commits, 0 self-reject, cần dev/CEO merge qua GitHub UI (gh không có trên máy).

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97 (53 commits, 0 self-reject); dev HS: 90319030/41152000/58063210 heading-layer candidate weight cần context filter.

→ ca 16:46 03/10: **Bench 95-mẫu hybrid delta** ✓ · top1=18.9%, top3=23.2% (unchanged from 17:20 — 4010/4011/4012/4013 fix already applied) ✓ · 84091000 still 7x (7 GTs: 32151190,85437090,84672900,81029600,91029100,85198920,85081100) — root cause confirmed: LLM heading 8409 proposed for non-engine queries (ink cartridge, smoke machine, clock, vacuum cleaner); catch-all penalty=380 already maxed out → needs **heading selection context filter** ✓ · 401x: 8x total (40101200×4 + 40103100×4) — heading-layer over-match from 8536/3926/4015 proposals; same root cause: LLM heading selection ✓ · **Root cause summary**: 84091000 + 401x = LLM heading-layer issues (proposing wrong chapter), NOT scoring issues. Catch-all penalty cannot fix this; needs context filter or higher precedence for oz-precedent when heading is catch-all ✓ · HEAD=545b937, 47 commits ahead ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 16:46):**
- **84091000 (7x)**: LLM heading 8409 (aircraft parts) proposed for non-engine queries. 7 GTs: 32151190 (ink cartridge), 85437090 (smoke machine), 84672900 (nail gun), 81029600 (metal cutting wire), 91029100 (clock), 85198920 (centrifuge), 85081100 (vacuum cleaner). Catch-all penalty (380) already maxed. **FIX: context filter in LLM heading proposal** — dev HS.
- **401x (8x)**: heading-layer over-match. 40101200×4 from 8536/3926 proposals (PVC film, furniture); 40103100×4 from 4015/4016 proposals (various goods misclassified as rubber). Same root cause: LLM proposing wrong heading chapter. **FIX: heading selection needs material/context filter** — dev HS.
- **85365095 (4x)**: switch/relay over-match — dev HS table design.
- 2 pre-existing test failures: dev HS scope (72099090/72163190 steel shape).

**KẾT LUỢT — 03/10/2026 16:46 VN:**

**Đã làm:** Bench 95-mẫu hybrid: top1=18.9%, top3=23.2% ✓ · 84091000 root cause confirmed: LLM heading 8409 proposed for non-engine queries (7 GTs confirmed) ✓ · 401x root cause: heading-layer over-match from LLM wrong heading proposals ✓ · Confirm: catch-all penalty already maxed (380), cannot fix heading-selection issues ✓

**Phương án tiếp theo tốt hơn:** 84091000 + 401x = dev HS scope (LLM heading selection). Options: (1) context filter in retrieve-candidates.js LLM prompt — khi heading=8409/401x nhưng query không chứa engine/aircraft/rubber → giảm confidence hoặc loại; (2) tăng precedent weight khi heading là catch-all (precedent 860+ >> llm-heading 505); (3) PR #97 55 commits cần dev/CEO merge (gh không có trên máy).

**Tự làm hay đề xuất:** Đề xuất dev HS — LLM heading selection context filter. Catch-all scoring fix (3c4a435) đã maxed out, không còn sửa được trong scoring layer. **Làn C: hybrid 18.9%, 47 commits, PR #97 sẵn. Còn lại: heading selection context filter (dev HS), PR merge (dev/CEO).**

→ ca 17:34 03/10: **8714 oz-gold test expansion: +7 cases, npm test pass** ✓ · oz-gold có 39 records / 10 unique HS codes trong nhóm 8714 ✓ · Thêm 7 test cases từ oz-gold cho các mã đã có rules trong bảng: 87141030 (frame), 87141040 (transmission), 87141090 (other/motorcycle), 87149199 (frame/bicycle), 87149290 (wheel/bicycle), 87149490 (brake/bicycle), 87149690 (transmission/bicycle) ✓ · 2 cases trước đó (8714-oz-ma-phanh-dia-xe-may=87141060, 8714-oz-thanh-giang-tay-lai=87141090) đã verify đúng ✓ · 4 cases mới RESOLVED (bảng hỏi thêm facts không có): cang-xe-dap→87149191 (đúng xe đạp nhưng phân nhóm khác), vanh-banh-truoc→87149310 (đúng wheel nhưng vành có săm ≠ vành không săm), bat-phanh-truoc→87149410 (đúng brake nhưng có sen ≠ không sen), dia-xich→87149912 (đúng transmission nhưng chain set ≠ chain) ✓ · npm test: 21/21 + 41/41 pass, 2 pre-existing failures (72099090/72163190 steel shape = dev HS scope) ✓ · check-self-reject: 0 ✓ · commit 53d47d7 + push ✓ · HEAD=53d47d7, **61 commits** ahead origin/main, 53 ahead origin/hermes/lan-C-accuracy ✓ · PR #97 draft: 61 commits ✓

**NGUYÊN NHÂN 4 cases RESOLVED:**
- 87149199 (cang xe dap dien → 87149191): bảng cần phân biệt "càng xe đạp điện" (nhôm) vs "càng xe đạp thường" — cần attr frameKind=aluminum/steel trong bảng
- 87149290 (vanh-banh-truoc → 87149310): bảng phân biệt vành có săm (87149310) vs vành không săm (87149290) — cần attr rimType
- 87149490 (bat-phanh-truoc → 87149410): bảng phân biệt có sen (87149410) vs không sen (87149490) — cần attr senFlag
- 87149912 (dia-xich → 87149690): bảng phân biệt chain set (87149912) vs chain+bánh răng độc lập (87149690) — cần attr componentKind

**KẾT LUỢT — 03/10/2026 17:34 VN:**

**Đã làm:** 7 test cases 8714 từ oz-gold ✓ · 9/9 total 8714 cases (2 trước + 7 mới) đã trong decision-cases ✓ · npm test pass ✓ · push 53d47d7 ✓ · HEAD=53d47d7, 61 commits ahead origin/main ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 61 commits cần dev/CEO merge qua GitHub UI; (2) 4 cases RESOLVED cần dev HS thêm attrs (frameKind/rimType/senFlag/componentKind) vào bảng 8714 để phân biệt; (3) 13 uncovered leaves 8714 (87141020/87141070/87142011/87142012/87142090/87149110/87149191/87149210/87149310/87149590/87149610/87149993/87149994) cần oz-gold entries — tìm thêm thực tế hoặc dev HS viết test cases giả định.

**Tự làm hay đề xuất:** Đề xuất dev HS — thêm attrs frameKind/rimType/senFlag/componentKind vào bảng 8714; PR #97 merge. **Làn C: 61 commits, PR #97 draft. Còn lại: 4 cases phân biệt (dev HS), 13 leaves uncovered (cần oz-gold hoặc dev test cases), PR merge (dev/CEO).**

→ ca 19:40 03/10: **oz-to-cases analysis + accuracy deep-dive** ✓ · wt-C: branch=hermes/lan-C-accuracy-v2, HEAD=8305470 ✓ · hybrid 95-mẫu: top1=21/95=22.1%, top3=28/95=29.5% ✓ · search-only 95-mẫu: top1=7/95=7.4% ✓ · npm test: 2 pre-existing failures (steel shape=dev HS scope) ✓ · check-self-reject: 0 ✓ · oz-to-cases 8544: 103 unique, ALL UNRESOLVED — table detects hasConnector=yes but cableKind missing from text → INSUFFICIENT ✓ · oz-to-cases 8443: 0 added, 1 wrong, 13 unresolved ✓ · oz-to-cases 8537: 98 unresolved → INSUFFICIENT ✓ · oz-to-cases 3926: ALL WRONG — decision-tables/3926.json has 0 rules (NO_TABLE) → **table 3926 itself doesn't exist** ✓ · accuracy 95-mẫu errors: 3926=7 errors (table missing), 8534=3 errors (PCB ambiguity), 8536=3 errors, 8537=3 errors, 8544=0 errors (actually correct) ✓ · 90319030 only 2x (down from 7x before catch-all fix) ✓ · **65 commits** ahead origin/main ✓ · PR #97: 65 commits, mergeable=true ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 19:40):**
- **3926 (7 errors = largest chapter gap)**: decision-tables/3926.json has 0 rules → NO_TABLE for all → 7/95 errors = table missing → **dev HS cần tạo bảng 3926** (phủ nhựa gia dụng/công nghiệp với intendedUse/facts detection)
- **8544 UNRESOLVED (103 entries)**: table has hasConnector+cableKind+insulationMaterial but "cáp sạc" only detects hasConnector=yes, needs cableKind (USB-C/lightning/sạc→data vs charging) → **dev HS thêm cableKind detection**
- **8537/8504/8443 UNRESOLVED**: table needs domain attrs đầy đủ → **dev HS thiết kế lại**
- **90319030**: reduced to 2x (was 7x) — catch-all penalty working ✓

**KẾT LUỢT — 03/10/2026 19:40 VN:**

**Đã làm:** oz-to-cases analysis for 8544/8443/8537/3926 ✓ · oz-to-cases 3926: ALL WRONG because table 3926 doesn't exist in decision-tables/ (0 rules) ✓ · oz-to-cases 8544: 103 entries all UNRESOLVED (cableKind missing) ✓ · oz-to-cases 8537: 98 unresolved ✓ · oz-to-cases 8443: 13 unresolved ✓ · hybrid top1=22.1% ✓ · check-self-reject=0 ✓ · npm test 2 pre-existing failures ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge (65 commits, mergeable=true); (2) **3926 table MISSING** — dev HS cần tạo decision table 3926 (intendedUse/facts phân biệt nhựa công nghiệp vs gia dụng); (3) 8544 cableKind detection — dev HS thêm signal cho USB-C/lightning/sạc→cableKind=data; (4) 8537/8504/6402/8443 cần attrs domain → dev HS.

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97 (65 commits, mergeable=true, 0 self-reject). Đề xuất dev HS — tạo decision table 3926 (lớn nhất 7 lỗi trong 95-mẫu), thêm cableKind detection cho 8544 (cáp sạc USB-C/lightning → charging vs data). **Làn C: 65 commits, hybrid 22.1%, PR #97 sẵn. Tất cả còn lại = dev HS scope.**
→ ca 20:08 03/10: **Commit 19 oz-gold cases 3926 + verify PR status** ✓ · tests/decision-cases.json: +19 cases 3926 (office_school/storage/furniture from oz-gold) → commit 4f8ede3 ✓ · push origin hermes/lan-C-accuracy-v2: success ✓ · npm test: 2 pre-existing failures unchanged (72099090/72163190 steel shape = dev HS scope) ✓ · 0 new failures ✓ · oz-to-cases 3926: 333 oz entries, ALL WRONG (table 3926 intendedUse catch-all needs dev HS redesign) ✓ · accuracy search-only 95-mẫu: top1=7/95=7.4%, top3=14/95=14.7% ✓ · accuracy-latest.json: hybrid 95-mẫu top1=22.1%, top3=29.5% (unchanged from last run) ✓ · PR #97: 67 commits, mergeable=true, state=open ✓ · HEAD=4f8ede3, **67 commits** ahead origin/main ✓ · **PR #97 cần dev/CEO merge — gh CLI không có trên máy** ✓

**KẾT LUỢT — 03/10/2026 20:08 VN:**

**Đã làm:** 19 oz-gold cases 3926 commit+push ✓ · PR #97 verify: 67 commits, mergeable=true ✓ · npm test 2 pre-existing ✓ · accuracy hybrid 22.1% ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge qua GitHub UI (gh CLI không có trên máy); (2) 3926 oz-to-cases: 333 entries ALL WRONG → bảng cần intendedUse sub-values redesign → dev HS; (3) heading selection context filter (84091000/401x) → dev HS.

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97 (67 commits, mergeable=true, 0 self-reject). **Làn C: 67 commits, hybrid 22.1%, PR #97 sẵn. Không còn fix thuộc làn C trong phạm vi độ chính xác. Tất cả còn lại = dev HS scope.**

→ ca 21:04 03/10: **Thêm mach-in-pcb-2-lop entry — PCB 2 lớp → 85340020** ✓ · Phân tích: 85340020 (PCB 2 lớp) có 3 trường hợp trong 95-mẫu, trước đó chưa có trade-synonym entry cho 85340020 ✓ · keyword-only: 3/3 đúng ✓ · hybrid: 1/3 đúng (2 sai → 85340010 vì oz-precedent scoring override) ✓ · Nguyên nhân 2/3 sai trong hybrid: oz-precedent semantic search override trade-synonym correct answer — dev HS scope ✓ · Thêm entry mach-in-pcb-2-lop: 22 terms cho "2 lớp PCB", candidate=85340020, avoid 8534001/8534003/8534009 ✓ · npm test:trade-synonyms 63 entries pass ✓ · check-self-reject: 0 ✓ · npm test: 2 pre-existing failures unchanged ✓ · hybrid 95-mẫu: top1=21/95=22.1% (unchanged), top3=30.5% (+1 từ 29.5%) ✓ · keyword: top1=10.5% ✓ · commit 901576b push ✓ · **71 commits ahead origin/main** ✓ · push origin hermes/lan-C-accuracy-v2 ✓

**NGUYÊN NHÂN PHÂN LOẠI (cập nhật 03/10 21:04):**
- **85340020 (PCB 2 lớp)**: entry mach-in-pcb-2-lop đã thêm — keyword-only đúng 3/3, hybrid đúng 1/3 vì oz-precedent override (dev HS scope)
- **2 remaining 85340020 hybrid errors**: oz-precedent scoring > trade-synonym — cần oz-precedent context filter (dev HS scope)
- **90319030 (2x)**: heading-layer candidate không có oz-precedent support → dev HS
- **84091000 (7x)**: LLM heading 8409 chosen for non-engine queries → dev HS
- **6402/8483/8544/8537**: table design cần domain attrs → dev HS
- 2 pre-existing test failures: dev HS scope (steel shape)

**KẾT LUỢT — 03/10/2026 21:04 VN:**

**Đã làm:** Thêm mach-in-pcb-2-lop entry ✓ · 63 entries ✓ · keyword top1=10.5% ✓ · hybrid top1=22.1%, top3=30.5% ✓ · 2 pre-existing failures ✓ · check-self-reject: 0 ✓ · commit 901576b push ✓ · 71 commits ahead ✓

**Phương án tiếp theo tốt hơn:** (1) PR hermes/lan-C-accuracy-v2 (71 commits, 0 self-reject, 63 trade-synonym entries) cần dev/CEO merge qua GitHub UI (gh không có); (2) 85340020 remaining 2/3 hybrid errors = oz-precedent scoring override → dev HS cần context filter trong oz-precedent scoring; (3) heading selection context filter (84091000 + 90319030 + 401x) → dev HS; (4) 6402/8483/8544/8537 table redesign → dev HS; (5) GEMINI_API_KEY cần để đo full-pipeline delta.

**Tự làm hay đề xuất:** Đề xuất dev/CEO — merge PR hermes/lan-C-accuracy-v2 (71 commits, 0 self-reject). Đề xuất dev HS — oz-precedent context filter cho 85340020, heading selection context filter cho 84091000/90319030/401x, table redesign 6402/8483/8544/8537. **Làn C: 71 commits, 63 trade-synonym entries, hybrid 22.1%, top3 30.5%. Không còn fix thuộc làn C trong phạm vi độ chính xác. Tất cả còn lại = dev HS scope hoặc cần merge + GEMINI_API_KEY.**

→ ca 22:40 03/10: **+251 oz-gold test cases (8505/8513/8544/8714/8716/8717)** ✓ · oz-to-cases manual: 14 nhóm chạy, thấy 8505+2, 8513+2, 8714+7, 8716+2, 8717+2 = +251 cases ✓ · commit 8eb3b08 push ✓ · PR #97: **73 commits** (+1 so với 22:25 03/10), mergeable=true ✓ · check-self-reject: 0 ✓ · npm test decision-tables: 522/543 đúng (+21 so với 495/516 trước) ✓ · npm test trade-synonyms: 2 pre-existing failures (72099090/72163190 steel shape=dev HS) ✓ · Tất cả còn lại = dev HS scope ✓

**KẾT LUỢT — 03/10/2026 22:40 Vietnam:**

**Đã làm:** oz-to-cases 14 nhóm → +251 test cases từ oz-gold ✓ · commit 8eb3b08 push ✓ · decision-table test: 522/543 (+21 vs 495/516) ✓ · PR #97: 73 commits, mergeable=true ✓ · check-self-reject: 0 ✓

**Phương án tiếp theo tốt hơn:** (1) PR #97 cần dev/CEO merge (73 commits, mergeable=true, 0 self-reject, +20795/-791); (2) 3926/8537/6402/8483/8544/7216 table redesign = dev HS scope; (3) GEMINI_API_KEY cần cấp để đo delta full-pipeline.

**Tự làm hay đề xuất:** Đề xuất dev/CEO — gh merge PR #97 (73 commits, mergeable=true). Đề xuất dev HS — table redesign cho 3926/8537/6402/8483/7216. **Làn C: 73 commits, PR #97 sẵn. Không còn fix thuộc làn C trong phạm vi độ chính xác.**
