---
name: oz-orchestrator
description: >-
  Multi-agent orchestration playbook for Oz Vietnam tasks using invoke_subagent,
  native swarm, Python run_workflow pipelines, and parallel git worktree bee
  swarms. Use this skill when deciding how to split work across agents,
  managing model/quota tiers with read-only verification, executing G1-2/G6-2
  or multi-chapter hs-code-api swarms, or evolving skills and bee prompts.
---

# Oz Vietnam Multi-Agent Orchestrator Playbook

Choose the leanest orchestration mechanism that fits the task, enforce disjoint file ownership, and pair every generative/authoring pass with independent deterministic or read-only verification.

## 1. Choosing the Right Orchestration Tool

| Mechanism | Use When | Key Guardrails |
|---|---|---|
| **Single `invoke_subagent`** | 1 bounded task, single-file investigation, or standalone PR review (`oz-pr-auditor`). | Do not spawn a full swarm or workflow for a job one subagent finishes faster. |
| **Native `swarm`** (`swarm` + `post_message` + `read_board` + `swarm_wait`) | 2–6 roles collaborate dynamically, cross-check findings on a shared board, or edit separate modules/repos in parallel. | Load `swarm_pane` first and write `<appData>/brain/<conversation-id>/.system_generated/swarm/plan.json` (`goal` 4–8 words + `line` <= 12 words, `tasks`, 1–6 outcome `threads`). Use `workspace: "share"` when an active workspace exists and multiple workers edit/build simultaneously; keep `inherit` for readers/verifiers. Land/merge `share`/`branch` changes before calling `swarm{action:"kill"}` (which permanently deletes the workspace). |
| **Parallel Git Worktree Bee Swarm (`hs-code-api-wt/`)** | `>= 2` independent `hs-code-api` chapters, PRs, `tra-tho` fixes, or modules needing isolated `agy/...` branches and parallel PRs. | Follow Blueprint 5 below: fetch `origin/main`, create `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>`, symlink `node_modules`, assign `.agents/prompts/*.md` bee roles, never touch `mong/*` or `/Users/ozvietnamdesktop/oz-work/*`, and gate with `oz-pr-auditor`. |
| **`run_workflow`** (Python `agent`, `parallel`, `pipeline`, `phase`, `call_tool`) | Orchestration is code: high-volume loops over dozens/hundreds of HS subheadings/files, strict JSON-schema outputs, or staged draft → validate → repair pipelines. | Load `run-workflow` first. Always pass a strict `schema` to `agent()` (`finish` enforces it). Set `model="flash_lite"` or `"flash"` for simple high-fan-out slices. Workflow agents cannot ask the user interactively — supply complete verbatim inputs in-prompt. |

## 2. Quota Awareness & Read-Only Verifier Pattern

1. **Tier your model budget**:
   - Keep architecture synthesis, conflict arbitration, and final adjudication on `"inherit"` / `"pro"`.
   - Offload repetitive extraction, per-store scanning, and initial criteria drafting to `"flash_lite"` / `"flash"` in `run_workflow`.
   - In `swarm`, if a worker hits quota/capacity limits, use `swarm{action:"model", name, model}` to switch its model while preserving its conversation (never `kill` + `add`). Never `kill` a `waiting` worker solely to pause it.
2. **Independent Read-Only Verification (`oz-pr-auditor`)**:
   - Authors edit and fix; verifiers inspect and report only (zero direct code edits by the verifier).
   - Before landing a PR or delivering a final multi-agent audit, invoke `oz-pr-auditor` (or add a read-only verifier worker in the swarm) to verify L1–L11 rules, zero private data leaks (`oz-export`/`oz-gold`), real before/after measurements, and `dem-ca-test.mjs` proof.
3. **Board Discipline (`swarm`)**:
   - Keep `@name` wakeups targeted to the next acting peer only (tag `@coordinator` only on `[done]`, blockers, or decisions).
   - Never post empty greetings or acknowledgments.

## 3. Blueprint G1-2: Conflict Audit Across 6 Synonym Stores (`swarm`)

**Precondition**: QT's edge/boundary table and `data/luat/dau-noi.json` are landed on `origin/main` in `hs-code-api`.

**Goal**: Identify cross-store contradictions, dead 8-digit HS targets, overlapping triggers, and `AI_CHUA_KIEM` leakage across the 6 disjoint synonym/vocabulary stores without modifying production `data/`.

### Disjoint Store Ownership
1. `store-synonyms`: `data/synonyms.json`
2. `store-trade`: `data/trade-synonyms.json`
3. `store-vn-prod`: `data/vn-product-synonyms.json`
4. `store-aliases`: `data/hs-aliases.json`
5. `store-attr-zh`: `data/attribute-synonyms-zh.json`
6. `store-tu-vung`: `data/tu-vung/tu-vung@1.json`, `data/tu-vung/tu-vung@2.json` *(optionally cross-reference `data/glossary-xnk.json` / `data/confusion-pairs.json` in read-only notes)*

### Execution Steps
1. **Initialize `plan.json`** (`swarm_pane` skill): define 2–3 outcome threads (`Audit 6 Stores`, `Deduplicate & Rank Conflicts`, `Independent Verification`).
2. **Spawn Read-Only Store Auditors (`workspace: "inherit"`)**:
   - Group into 3–6 parallel workers with strictly disjoint store assignments (e.g., 2 stores per worker if keeping swarm lean, or 1 per store if large).
   - Brief each worker to compare every entry in its store(s) against `data/tax.json` (code alive?), `data/luat/dau-noi.json` (which routes actually read this store?), and QT's edge table:
     - Dead or repealed 8-digit HS codes.
     - Trigger terms pointing to conflicting headings/subheadings vs QT's edge table.
     - Unverified entries (`AI_CHUA_KIEM`) leaking into customer-facing citation paths.
   - Require structured JSON/Markdown findings posted on the board (`store`, `term`, `codes`, `conflictType`, `evidence`).
3. **Spawn Read-Only `conflict-aggregator`**:
   - Waits for all store auditors, cross-joins trigger terms across all 6 stores, deduplicates identical conflicts, detects cross-store collisions (same phrase mapping to divergent headings across `trade-synonyms.json` vs `hs-aliases.json` vs `vn-product-synonyms.json`), and ranks by live route exposure from `data/luat/dau-noi.json`.
4. **Verify & Deliver**:
   - Have `oz-pr-auditor` spot-check cited file paths, codes, and counts against `hs-code-api` on disk (without touching `hs-code-api`).
   - Deliver the unified deduplicated conflict report to QT/CEO.

## 4. Blueprint G6-2: Cheap AI Batch Drafting of 6-Digit Criteria (`run_workflow`)

**Precondition**: QT has finalized the `tieuChi6` / PN6 templates, authoring rules (`docs/giao-viec/so-tay/LUAT-CHUNG.md`, `goi-tho-ngoai/README.md`), and deterministic validation gates.

**Goal**: Draft structured 6-digit criteria (`tieuChi6`) across many subheadings at low LLM cost, then deterministically filter/verify every draft before human/QT review.

### Staged `run_workflow` Pattern
```python
# Conceptual skeleton — run via run_workflow(ScriptPath=..., Cwd="/path/to/hs-code-api")
phase("1. Discover & Slice Grounded Source Text")
# Use a Python helper or call_tool to gather target 4/6-digit codes missing tieuChi6,
# extracting ONLY verbatim chu-giai / SEN / wco.<6-digit> excerpts (NEVER tax.* alone).

phase("2. Cheap Batch Drafting (flash_lite / flash)")
SCHEMA = {
    "type": "object",
    "properties": {
        "hs4": {"type": "string"},
        "tieuChi6": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "hs6": {"type": "string"},
                    "fact": {"type": "string"},
                    "op": {"type": "string", "enum": ["<=", "<", ">=", ">", "="]},
                    "value": {"type": ["number", "string"]},
                    "donVi": {"type": "string"},
                    "nguon": {"type": "string"},
                    "trich": {"type": "string"}
                },
                "required": ["hs6", "fact", "op", "value", "donVi", "nguon", "trich"]
            }
        }
    },
    "required": ["hs4", "tieuChi6"]
}

# Process in chunked parallel() or pipeline() batches to respect rate limits
drafts = await parallel(target_slices, lambda s: agent(
    f"Draft tieuChi6 for heading {s['hs4']} strictly from verbatim source text:\n{s['sources']}\n"
    f"Rules: {s['rules_summary']}. Only numeric/quantitative criteria from chu-giai/SEN/wco.",
    schema=SCHEMA,
    role=f"Draft {s['hs4']}",
    model="flash_lite",
))

phase("3. Deterministic Gate Validation (0 LLM cost)")
# Write drafts to a scratch/staging dir (never overwrite live data/ directly),
# then run node scripts/check-so-tay.mjs --raw=<staging_dir> and QT's schema/boundary gates
# (e.g., check-cay.mjs / test-cong-cu-vong-3.mjs) via call_tool("run_command", ...).

phase("4. Targeted Escalation & oz-pr-auditor Review")
# Route ONLY rejected drafts to 1 focused repair pass ("flash" or "inherit") with exact gate error lines;
# hand validated clean drafts + gate log to oz-pr-auditor before QT/human PR review.
```

### Non-Negotiable Safeguards for G6-2
- **Never** invent numbers or cite `tax.*` as `tieuChi6` source; every `value` + `donVi` must appear verbatim in `trich`.
- **Never** write unvalidated drafts directly into `data/so-tay/` or `data/ho-so/ranh-gioi/`; always validate in a staging/raw folder with `check-so-tay.mjs --raw=...` and QT's deterministic gates first.
- Keep `oz-pr-auditor` as the final gate check before opening a `agy/...` PR for QT review (never self-merge).

## 5. Blueprint 5: Parallel Git Worktree Bee Swarm (`hs-code-api`)

**Auto-Trigger Condition (R1)**: Activate automatically whenever a task has `>= 2` independent units (chapters, PRs, modules, `tra-tho` fixes, or doc/infra tracks). Never run multi-unit work sequentially in one worktree when disjoint worktrees can run in parallel.

### Worktree & Bee Lifecycle
1. **Preflight & `tra-tho` Priority (`ong-dieu-phoi.md`)**:
   - Check open PRs with label `tra-tho` (`gh pr list --label tra-tho --state open`). Dispatch `ong-sua-tra-tho.md` to fix open `tra-tho` PRs on their existing `agy/...` branches **before** claiming new units.
   - Never touch `mong/*` branches or `/Users/ozvietnamdesktop/oz-work/*`.
2. **Fetch & Provision Disjoint Worktrees**:
   ```bash
   cd /Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api
   git fetch origin main
   git worktree add -b "agy/<slug>" "/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>" origin/main
   cd "/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>"
   ln -s /Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api/node_modules node_modules
   ```
   *(If `package-lock.json` changed vs main checkout, run `npm ci --include=dev` instead of symlinking.)*
3. **Dispatch Parallel Bees (".agents/prompts/")**:
   - Assign strictly disjoint `allowedFiles` per bee (`ong-nguong.md` for M-74 chapters, `ong-liet-ke.md` for M-75 chapters, `ong-sua-tra-tho.md` for `tra-tho` fixes, or custom workers).
   - Enforce zero edits to L1 customer paths (`api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`) or private data (`data/oz-export/*`, `oz-gold*`, `.env`).
4. **Gate, Audit, Push & Cleanup**:
   - Each bee runs its targeted gates + `node scripts/dem-ca-test.mjs <log>` (`EXIT=0`) + `node scripts/kiem-pham-vi-the.mjs`.
   - Read-only `oz-pr-auditor` (`ong-kiem-toan.md`) inspects diff and gate proof (`ĐẠT`) before pushing `agy/<slug>` and opening PR (**never** run `gh pr merge` or push directly to `main`).
   - Only remove temporary worktrees (`git worktree remove ...`) **after** changes are cleanly committed, pushed, and verified.

## 6. Skill & Bee-Prompt Evolution Loop (R2)

Whenever `tra-tho` feedback, QT review comments (`#1922`, `#1966`, `#1967`, PR reviews), or recurring operational pitfalls occur:
1. Extract the generalizable rule and concrete PR/comment reference into a structured lesson JSON (or CLI arguments) per `.agents/skills/quan-ly-skill-va-ong/SKILL.md`.
2. Run `node scripts/quan-ly-skill.mjs` (`--cap-nhat-skill`, `--cap-nhat-loi-nhac`, `--tao-skill`, `--tao-loi-nhac`, `--tu-json`) to update `.agents/skills/<slug>/SKILL.md` and `.agents/prompts/<bee>.md` idempotently.
3. Validate with `node scripts/quan-ly-skill.mjs --kiem` and `node scripts/test-quan-ly-skill.mjs`.
4. Sync byte-for-byte with `/Users/ozvietnamdesktop/.gemini/config/plugins/oz-orchestrator/` using `node scripts/quan-ly-skill.mjs --dong-bo`, then verify `--kiem --bat-buoc-plugin`.
5. Open a `docs(skills): ...` PR on an isolated `agy/...` branch off `origin/main` (omitting `[M-xx]` from PR title, never self-merging).
