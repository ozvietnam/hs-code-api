#!/bin/bash
# nhan-viec.sh — runner chuẩn cho thợ số hoá ranh giới PN6 (lát 2, #577).
# Bọc TRỌN phần cơ khí để thợ (agent/người) chỉ lo soạn spec — hết lỗi môi trường:
#   • exit-code ĐÚNG CÁCH (set -o pipefail — không còn "npm test | tail" nuốt mã lỗi)
#   • node_modules CÀI RIÊNG từng worktree (không symlink chéo — bài học 02/11)
#   • chặn chỉ sửa đúng 2 tệp quy định; PR đúng mẫu tiêu đề/thân; DỪNG tự thành draft
#
# Cách dùng:
#   bash scripts/nhan-viec.sh mo  <pn6> <issue>   # mở worktree + nhánh + npm install + comment "nhận"
#      …soạn spec docs/giao-viec/so-tay/spec/<pn6>.json trong worktree (đọc QUY-TRINH-SO-HOA.md)…
#   bash scripts/nhan-viec.sh nop <pn6> <issue>   # ap-spec + kiem + npm test + commit + push + PR + dọn
#   bash scripts/nhan-viec.sh bo  <pn6>           # bỏ việc, dọn worktree
# Env: OZ_AGENT_ID (mặc định: zcode) · OZ_WORK_DIR (mặc định: ~/oz-work)
#      OZ_REPO_DIR (mặc định: ~/Documents/Claude/Projects/hs-code-api)
set -euo pipefail

REPO_DIR="${OZ_REPO_DIR:-$HOME/Documents/Claude/Projects/hs-code-api}"
WORK_DIR="${OZ_WORK_DIR:-$HOME/oz-work}"
AGENT="${OZ_AGENT_ID:-zcode}"
CMD="${1:-}"; PN6="${2:-}"; ISSUE="${3:-}"
spec="docs/giao-viec/so-tay/spec/${PN6}.json"
wt="$WORK_DIR/hs-nv-${PN6}"

can() { command -v "$1" >/dev/null 2>&1; }
can git || { echo "✗ thiếu git"; exit 2; }
can gh  || { echo "✗ thiếu gh (đăng nhập GitHub)"; exit 2; }

case "$CMD" in
mo)
  [ "${#PN6}" = 6 ] && [ "${ISSUE}" != "" ] || { echo "dùng: nhan-viec.sh mo <pn6 6 số> <issue>"; exit 2; }
  git -C "$REPO_DIR" fetch -q origin main
  git -C "$REPO_DIR" worktree add "$wt" -b "so-hoa/$PN6" origin/main
  ( cd "$wt" && npm install --no-audit --no-fund >/dev/null 2>&1 )
  gh issue comment "$ISSUE" --repo ozvietnam/hs-code-api --body "nhận $AGENT" >/dev/null
  echo "✓ worktree $wt (nhánh so-hoa/$PN6, node_modules riêng) — đã comment nhận #$ISSUE"
  echo "  Soạn $wt/$spec theo QUY-TRINH-SO-HOA.md, xong chạy: bash scripts/nhan-viec.sh nop $PN6 $ISSUE"
  ;;

nop)
  [ -d "$wt" ] || { echo "✗ chưa mở worktree (mo trước)"; exit 2; }
  cd "$wt"
  [ -f "$spec" ] || { echo "✗ thiếu $spec — soạn trước khi nộp"; exit 2; }
  node scripts/so-hoa-ranh-gioi.mjs --ap-spec="$spec" > /tmp/nv-ap-$PN6.log 2>&1 || true
  node scripts/so-hoa-ranh-gioi.mjs --kiem --pn6="$PN6" > /tmp/nv-kiem-$PN6.log 2>&1
  kiem=$?
  [ "$kiem" = 0 ] || [ "$kiem" = 3 ] || { echo "✗ --kiem mã $kiem (1=đỏ sửa được — sửa spec rồi nop lại; 2=spec sai)"; cat /tmp/nv-kiem-$PN6.log; exit 1; }
  if [ "$kiem" = 0 ]; then ket="XANH"; else
    ket="DỪNG: $(grep -oE 'DỪNG[^:]*: .*' /tmp/nv-kiem-$PN6.log | head -1 | sed 's/.*: *//' | cut -c1-60)"
  fi
  echo "── --kiem: $ket ── chạy npm test (~5 phút, exit-code kiểm đúng)…"
  npm test > /tmp/nv-test-$PN6.log 2>&1 || { echo "✗ npm test ĐỎ — xem /tmp/nv-test-$PN6.log"; exit 1; }
  # CHẶN: chỉ đúng 2 tệp quy định được thay đổi
  sai="$(git status --porcelain | grep -vE "(^|\s)(M|\?\?) (docs/giao-viec/so-tay/spec/$PN6.json|data/ho-so/ranh-gioi/$PN6.json)$" || true)"
  [ -z "$sai" ] || { echo "✗ có tệp ngoài quy định bị đụng:"; echo "$sai"; exit 1; }
  git add "$spec" "data/ho-so/ranh-gioi/$PN6.json"
  git commit -q -m "feat(so-tay): số hoá ranh giới $PN6 (#$ISSUE)" -m "Kết quả --kiem: $ket (runner nhan-viec.sh)"
  git push -q -u origin "so-hoa/$PN6"
  kiemTail="$(tail -6 /tmp/nv-kiem-$PN6.log)"
  draft=""; [ "$kiem" = 3 ] && draft="--draft"
  # shellcheck disable=SC2086
  gh pr create --repo ozvietnam/hs-code-api --head "so-hoa/$PN6" $draft \
    --title "[lát 2] Số hoá ranh giới PN6 $PN6 — $ket" \
    --body "## [lát 2] Số hoá ranh giới PN6 $PN6 — $ket

Closes #$ISSUE

### Kết quả máy (runner nhan-viec.sh)
- \`--ap-spec\` + \`--kiem --pn6=$PN6\` (mã thoát $kiem):
\`\`\`
$kiemTail
\`\`\`
- \`npm test\`: exit 0 — === ALL TESTS PASSED ===

### Thợ
- \`$AGENT\` — spec: \`$spec\`; mọi quyết định ghi trong \`ghiChuSoan\`.

### Tự kiểm (runner đảm nhiệm phần cơ khí)
- [x] Exit-code kiểm đúng cách (pipefail) — không push khi test đỏ
- [x] Chỉ 2 tệp được phép thay đổi (runner chặn)
- [x] Không đọc data/bench/*, data/oz-export/* (luật mục 0 — thợ tự tuân)
- [x] Không ghi nguonLoai/trangThai/duyet; không chạy --duyet/--tra-ve/--ap-dung

Người soát: Claude" >/dev/null
  pr_url="$(gh pr view --repo ozvietnam/hs-code-api --json url -q .url 2>/dev/null || true)"
  git -C "$REPO_DIR" worktree remove "$wt" --force
  git -C "$REPO_DIR" branch -D "so-hoa/$PN6" >/dev/null 2>&1 || true
  echo "✓ $PN6: $ket → PR ${pr_url:-đã tạo} — worktree đã dọn"
  ;;

bo)
  [ -d "$wt" ] && git -C "$REPO_DIR" worktree remove "$wt" --force
  git -C "$REPO_DIR" branch -D "so-hoa/$PN6" >/dev/null 2>&1 || true
  echo "✓ đã dọn $PN6 (chưa comment trả việc — nếu đã comment nhận, tự comment trả trên issue)"
  ;;

*)
  echo "dùng: nhan-viec.sh mo <pn6> <issue> | nop <pn6> <issue> | bo <pn6>"
  echo "env: OZ_AGENT_ID (mặc định zcode), OZ_WORK_DIR (mặc định ~/oz-work), OZ_REPO_DIR"
  exit 2
  ;;
esac
