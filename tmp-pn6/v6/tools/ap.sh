#!/bin/bash
# ap.sh <spec-dir> <pn6...> : trong repo hiện tại, chép spec vào docs/giao-viec/so-tay/spec rồi --ap-spec; in exit + lỗi
dir=$1; shift
for p in "$@"; do
  [ -f $dir/$p.json ] || { echo "=== $p exit=9 KHÔNG CÓ SPEC"; continue; }
  cp $dir/$p.json docs/giao-viec/so-tay/spec/$p.json
  out=$(node scripts/so-hoa-ranh-gioi.mjs --ap-spec=docs/giao-viec/so-tay/spec/$p.json 2>&1); rc=$?
  echo "=== $p exit=$rc"; echo "$out" | grep -E '^\s*(✗|!|→|!!!)' | head -${LINES_MAX:-6}
done
