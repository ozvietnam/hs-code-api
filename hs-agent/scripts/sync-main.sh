#!/usr/bin/env bash
# Đồng bộ bản clone chuẩn của harness (/srv/hs-code-api) về origin/main.
#
# Vì sao cần (sự cố đo được 27/11 – 28/11/2026):
#   ExecStartPre cũ là `git pull --ff-only`. Khi HEAD của clone chuẩn đứng trên
#   một nhánh KHÔNG còn trên remote (đo được: `agent/pr89-extract-only`, đã bị xoá
#   trên GitHub) thì `pull --ff-only` HỎNG ÂM THẦM (dấu '-' của systemd bỏ qua
#   lỗi) → unit vẫn chạy, nhưng bằng code cũ. Đo được:
#     • clone chuẩn lệch origin/main **2029 commit** (đo 28/11 05:45);
#     • `git merge-base --is-ancestor HEAD origin/main` = NO ⇒ ff-only không bao giờ
#       lên được main;
#     • J2 chạy logic CŨ ⇒ các bản vá đã merge (PR #2443 codeAppears cặp 2 số,
#       PR #2459 hồi sinh `rejected`) không có hiệu lực ⇒ J2 vẫn 0 bản ghi;
#     • bench đóng băng trên commit 51f21a9cc (01/10), freshness báo DUE giả.
#
# Nguyên tắc:
#   • Chỉ đọc remote, KHÔNG push, KHÔNG đụng main trên GitHub.
#   • Cây BẨN (sửa tay chưa commit, hoặc tệp chưa theo dõi có thể bị ghi đè) →
#     KHÔNG giẫm mất việc của người: bỏ qua lượt này, ghi cảnh báo cho quản đốc.
#   • Kiểm chứng được: sau khi đồng bộ, HEAD PHẢI bằng đích; không thì hoàn tác
#     về commit cũ (không để cây ở trạng thái nửa vời).
#   • Mọi lỗi → mã thoát 0 + thông điệp; job vẫn chạy bằng bản đang có (như cũ).
#
# Vì sao script này SỐNG NGOÀI repo (/srv/hs-agent/scripts/sync-main.sh):
#   ExecStartPre gọi nó TRƯỚC khi repo được đồng bộ. Nếu nó nằm trong repo thì
#   khi repo đang ở commit cũ không có file đó → ExecStartPre hỏng → không bao giờ
#   đồng bộ được (gà và trứng). install.sh cài bản này ra /srv/hs-agent/scripts/.
#
# Biến môi trường (để test):
#   SYNC_REPO   — thư mục clone (mặc định: $HS_REPO, nếu không có thì /srv/hs-code-api)
#   SYNC_REMOTE — tên remote (mặc định origin)
#   SYNC_BRANCH — nhánh (mặc định main)
#   SYNC_LOG    — tệp nhận cảnh báo (mặc định $HS_AGENT_HOME/logs/sync-main.log)
set -uo pipefail

REPO="${SYNC_REPO:-${HS_REPO:-/srv/hs-code-api}}"
REMOTE="${SYNC_REMOTE:-origin}"
BRANCH="${SYNC_BRANCH:-main}"
LOG="${SYNC_LOG:-${HS_AGENT_HOME:-/srv/hs-agent}/logs/sync-main.log}"

note() {
  local msg="$*"
  echo "$msg"
  local dir
  dir="$(dirname "$LOG")"
  if [ -d "$dir" ] && [ -w "$dir" ]; then
    printf '%s %s\n' "$(date '+%F %T')" "$msg" >> "$LOG"
  fi
}

cd "$REPO" 2>/dev/null || { note "sync-main: không vào được $REPO"; exit 0; }

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  note "sync-main: $REPO không phải git repo"
  exit 0
fi

if ! git fetch --quiet "$REMOTE" "$BRANCH" 2>/dev/null; then
  note "sync-main: fetch $REMOTE/$BRANCH thất bại — chạy bằng bản đang có"
  exit 0
fi

TARGET_REF="refs/remotes/$REMOTE/$BRANCH"
TARGET="$(git rev-parse --verify --quiet "$TARGET_REF" 2>/dev/null)"
if [ -z "$TARGET" ]; then
  note "sync-main: không có $TARGET_REF — chạy bằng bản đang có"
  exit 0
fi

HEAD_SHA="$(git rev-parse --verify --quiet HEAD 2>/dev/null)"
if [ "$HEAD_SHA" = "$TARGET" ]; then
  exit 0
fi

# Cây bẩn: có sửa chưa commit (tệp đã theo dõi bị sửa) HOẶC có tệp CHƯA theo
# dõi mà main cũng có (checkout sẽ ghi đè mất) → giữ nguyên, báo người.
# Tệp chưa theo dõi mà main KHÔNG có thì an toàn (`checkout -f` không xoá tệp
# chưa theo dõi) → không coi là bẩn.
DIRTY_TRACKED="$(git status --porcelain --untracked-files=no 2>/dev/null)"
UNTRACKED="$(git status --porcelain 2>/dev/null | sed -n 's/^?? //p')"
DIRTY_UNTRACKED=""
for f in $UNTRACKED; do
  if git cat-file -e "$TARGET:$f" 2>/dev/null; then
    DIRTY_UNTRACKED="$DIRTY_UNTRACKED $f"
  fi
done
if [ -n "$DIRTY_TRACKED" ] || [ -n "$DIRTY_UNTRACKED" ]; then
  N_TRACKED=0
  [ -n "$DIRTY_TRACKED" ] && N_TRACKED="$(printf '%s\n' "$DIRTY_TRACKED" | grep -c .)"
  N_UNTRACKED=0
  [ -n "$DIRTY_UNTRACKED" ] && N_UNTRACKED="$(printf '%s\n' "$DIRTY_UNTRACKED" | grep -c .)"
  note "sync-main: cây làm việc bẩn ($N_TRACKED tệp sửa chưa commit, $N_UNTRACKED tệp chưa theo dõi bị ghi đè) — giữ nguyên, không đồng bộ (cần người xử lý)"
  exit 0
fi

# Cách 1 (ưu tiên): đứng trên nhánh local `main` rồi fast-forward.
#   - ưu điểm: clone chuẩn vẫn ở trạng thái "trên main" ⇒ các lệnh git khác
#     (git log, git diff) đọc đúng nội dung main.
# Cách 2 (dự phòng): detach đúng commit đích — dùng khi nhánh local `main`
#   đã diverged (không fast-forward được) thì ff-only lại hỏng âm thầm.
SYNCED=0
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  if git checkout -f "$BRANCH" >/dev/null 2>&1 && git merge --ff-only "$TARGET_REF" >/dev/null 2>&1; then
    SYNCED=1
  else
    git checkout -f "$HEAD_SHA" >/dev/null 2>&1 || true
  fi
fi

if [ "$SYNCED" -ne 1 ]; then
  if git checkout -f --detach "$TARGET" >/dev/null 2>&1; then
    SYNCED=1
  fi
fi

AFTER="$(git rev-parse --verify --quiet HEAD 2>/dev/null)"
# Kiểm chứng: HEAD phải bằng đích và cây không có sửa chưa commit. Tệp CHƯA theo
# dõi thì không tính (checkout -f không xoá chúng) — nhưng nếu main có tệp cùng
# tên thì đã bị chặn ở bước "cây bẩn" phía trên rồi.
STILL_DIRTY="$(git status --porcelain --untracked-files=no 2>/dev/null)"
if [ "$SYNCED" -eq 1 ] && [ "$AFTER" = "$TARGET" ] && [ -z "$STILL_DIRTY" ]; then
  note "sync-main: ${HEAD_SHA:0:8} → ${TARGET:0:8} ($REMOTE/$BRANCH)"
  exit 0
fi

# Không đồng bộ được → hoàn tác về commit cũ, không để cây nửa vời.
git checkout -f --detach "$HEAD_SHA" >/dev/null 2>&1 || true
ROLLBACK="$(git rev-parse --verify --quiet HEAD 2>/dev/null)"
if [ "$ROLLBACK" = "$HEAD_SHA" ]; then
  note "sync-main: không đồng bộ được về ${TARGET:0:8} — đã hoàn tác về ${HEAD_SHA:0:8}, job chạy bằng bản đang có"
else
  note "sync-main: KHÔNG đồng bộ được về ${TARGET:0:8} và KHÔNG hoàn tác được — cần người kiểm tra cây làm việc"
fi
exit 0
