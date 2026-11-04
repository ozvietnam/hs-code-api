#!/bin/bash
# thu-hoach.sh <toolresult> <goi>  : trích spec → gate trong wt-c84 → giữ xanh, treo đỏ, commit+push
set -u
TR=$1; G=$2; P=/home/claude/working/pn6; W=/home/claude/working/wt-c84
rm -rf $P/spec/$G; python3 -I $P/ext-spec.py $TR $P/spec/$G || exit 1
PN=$(head -1 $P/goi/$G.txt | grep -oE "\(([0-9 ]+)\)" | tr -d '()')
cd $W && LINES_MAX=3 bash $P/ap.sh $P/spec/$G $PN > $P/gate-$G.log 2>&1
X=$(grep -c "exit=0" $P/gate-$G.log); R=$(grep -E "exit=[123]" $P/gate-$G.log | awk '{print $2}'); T=$(grep -c "exit=9" $P/gate-$G.log)
for p in $R; do git checkout -q -- docs/giao-viec/so-tay/spec/$p.json data/ho-so/ranh-gioi/$p.json 2>/dev/null; rm -f docs/giao-viec/so-tay/spec/$p.json data/ho-so/ranh-gioi/$p.json; echo $p >> $P/treo.txt; done
node scripts/test-cong-ranh-gioi.mjs 2>&1 | tail -1
git add docs/giao-viec/so-tay/spec data/ho-so/ranh-gioi && git commit -qm "data(ho-so): số hoá ranh giới $X PN6 (gói $G, Studio, cổng 0–5 xanh)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ce55326chdksgQLsfyrNDS" && git push -q origin so-hoa/pn6-c84
echo "$G: XANH $X / $(echo $PN | wc -w); thiếu spec: $T; treo: $R"
grep -E "✗" $P/gate-$G.log | sed 's/:.*//' | sort | uniq -c | sort -rn | head -5
