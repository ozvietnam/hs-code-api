#!/bin/bash
# th2.sh <toolresult> : thu hoạch mọi gói trong cho-thu-hoach.txt mà Drive đã có; gói thiếu spec hoàn toàn thì giữ lại chờ
TR=$1; P=/home/claude/working/pn6; rest=""
for g in $(cat $P/cho-thu-hoach.txt); do
  out=$($P/thu-hoach.sh $TR $g 2>&1 | grep -vE "^remote|^To |rejected|failed to push|pass|^On branch|^Your branch|^nothing to commit|^$")
  if echo "$out" | grep -q "XANH 0 / [0-9]*; thiếu spec: [1-9]"; then rest="$rest $g"; echo "$g: chưa có trong Drive"; else echo "$out"; fi
done
echo $rest | tr ' ' '\n' | sed '/^$/d' > $P/cho-thu-hoach.txt
cd /home/claude/working/wt-c84 && for i in 1 2 3 4; do git push -q origin so-hoa/pn6-c84 2>/dev/null && break; sleep 10; done; git status -sb | head -1
