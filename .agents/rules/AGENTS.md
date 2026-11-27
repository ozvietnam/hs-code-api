# Oz Vietnam Engineering & Orchestrator Governance

These rules are always active whenever the `oz-orchestrator` plugin is enabled.

## 1. Branch & Merge Governance (`hs-code-api`)
- Any branch created by Antigravity on `hs-code-api` **MUST** use prefix `agy/...` branched cleanly off `origin/main` (never push directly to `main`).
- **NEVER** self-merge (`gh pr merge` is forbidden) unless both CEO (Thắng) and QT explicitly authorize it. An independent second check (such as `oz-pr-auditor`) and green CI on the final `head_sha` must precede any merge; respect existing `tra-tho` labels or unresolved review blocks.

## 2. Rule L1 Boundary on Mac (Dev)
- **NEVER** alter LLM prompts, LLM turn counts, or model fallback chains on customer-facing paths (`api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`) directly.
- Any L1 behavior change **MUST** sit behind a default-OFF `HS_*` flag declared in `data/luat/bang-co.json` (`doiQuyetDinhLLM: true`), prove `OFF == origin/main` via sha256 output comparison with fake LLM, and be evaluated on production's real model chain through the real Gateway (`Cổng thật`). Local dev / fake-LLM numbers are self-checks only and **NEVER** justify merging or enabling an L1 switch.

## 3. Private Customer Data & Repo Hygiene
- **NEVER** commit private customer data (`data/oz-export/*`, `oz-gold*` product descriptions, raw customer declarations, invoices, `.env`, `.keys/`) or temporary analysis/bench dumps.
- Preserve `lib/llm-privacy.js` boundaries (`withPrivateData()` for declarations/disputes/Oz-gold vs `withHangHoa()` for generic product specs).

## 4. Verification & Local Test Discipline
- **NEVER** run the 26-minute full `npm test` locally on Mac (it hits command timeouts and wastes shared resources). Obtain full-suite totals from GitHub Actions CI (`test-all.yml`) on the PR's latest commit.
- Locally, ensure `devDependencies` are installed (`npm ci --include=dev`, never `npm ci` when `NODE_ENV=production`), run targeted test & gate scripts, capture stdout/stderr + `EXIT=$?` to a log file, and verify real case counts with `node scripts/dem-ca-test.mjs <log>`. Never rely on `=== ALL TESTS PASSED ===` alone.
- Every bugfix PR **MUST** prove real before/after behavior with measured numbers on real or labeled inputs (a 0-delta gate run alone is insufficient proof).

## 5. Company Repos Map & Source of Truth
- **`ozvietnam/hs-code-api`**: **GitHub is the single source of truth** (`main` deploys via Coolify to `hs-kb.uythacnhapkhau.com`). Internal Gitea ERP only mirrors static data from GitHub — never make primary edits on Gitea for `hs-code-api`.
- **`erp-xnk`**: Internal Gitea `http://192.168.1.110:3000/oz/erp-xnk` (`origin`). **`develop` is the live production branch** — PRs target `develop`, never mirror/push to GitHub, and keep DB schema migrations separate from API code PRs.
- **`oz-freight-api`**: TQ→VN freight quote engine. All 10 benchmark cases must pass 10/10 in CI; UI/comments remain Vietnamese (outside the 6 TQ data-match points).
- **`ozsource`**: WXT + MV3 TypeScript browser extension client (backend APIs live in `erp-xnk`). Run `pnpm test` before commit and keep `.keys/extension.pem` out of git.

## 6. Diagram-First Onboarding & Multi-Agent Discipline
- Keep Mermaid architecture diagrams in `docs/SO-DO-*.md` (`erp-xnk`, `oz-freight-api`, `ozsource`) and `hs-code-api/docs/luat-duong-khach.md` (`npm run gen:diagrams` + `test-so-do-mermaid.mjs`) synced with real code/routes, prominently linked from root `AGENTS.md`, and merged into each repo's default branch (`develop` for `erp-xnk`, `main` for the rest).
- Keep multi-agent file ownership disjoint (`workspace: "share"` when editing/building concurrently in an active workspace), and run read-only verification (`oz-pr-auditor`) before handing off PRs or reports.

## 7. R1 — Auto-Trigger Parallel Multi-Agent Teamwork (`hs-code-api`)
- **Mandatory Auto-Trigger**: Whenever a task involves `>= 2` independent units — such as multiple HS chapters (`M-74`, `M-75`, back-sweep), multiple PRs, multiple modules, multiple vocabulary/synonym stores (`G1-2`), batch criteria drafting (`G6-2`), batch `tra-tho` fixes, or multi-file refactors — the coordinator (`ong-dieu-phoi.md`) **MUST** automatically decompose the work into disjoint file-ownership units and dispatch parallel worker agents ("chú ong") instead of running sequentially in one session.
- **Isolated Git Worktree Protocol**:
  - Run `git fetch origin main` in `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api` without altering the main checkout's HEAD or touching any sibling worktree.
  - Create one isolated worktree per parallel unit under `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>` branched cleanly as `agy/...` off latest `origin/main`:
    `git worktree add -b agy/<slug> /Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug> origin/main`
  - Symlink `node_modules` inside each new worktree (`ln -s /Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api/node_modules node_modules`) or install via `npm ci --include=dev`.
- **Bee Prompts & Strict Safety Boundaries**:
  - Dispatch each worker using its structured role prompt from `.agents/prompts/` (`ong-dieu-phoi.md`, `ong-nguong.md`, `ong-liet-ke.md`, `ong-sua-tra-tho.md`, `ong-kiem-toan.md`).
  - Strictly **NEVER** touch `mong/*` branches, `/Users/ozvietnamdesktop/oz-work/*`, L1 customer paths (`api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`) without L1 flag compliance, or private data (`data/oz-export/*`, `oz-gold*`, `.env`, `.keys/`).
  - Respect `tra-tho` priority: fix open `tra-tho` PRs on their existing `agy/...` branches (sequential commits, no force-push) before claiming new chapters/units.
- **Independent Audit & Gate Proof Before PR**:
  - Before opening or updating any PR (omit `[M-xx]` from PR title for infra/skill/rule PRs), run all targeted gates + `node scripts/dem-ca-test.mjs <log>` + `node scripts/kiem-pham-vi-the.mjs`, and obtain a read-only `oz-pr-auditor` (`ĐẠT` / `APPROVE`) check. **NEVER** run `gh pr merge` or push directly to `main`.

## 8. R2 — Auto Skill & Bee-Prompt Evolution
- **Evolution Trigger**: Whenever a PR receives `tra-tho` feedback, QT posts review rules (e.g., Issue `#1922`, `#1966`, `#1967`, or PR comments), or a recurring operational pitfall is discovered, the team **MUST** codify the generalizable rule and real PR example into the relevant `.agents/skills/<slug>/SKILL.md` and `.agents/prompts/<bee>.md` immediately — never leave lessons solely in chat or ad-hoc comments.
- **Deterministic Tooling & Validation Loop**:
  - Author and upgrade skills and bee prompts through `node scripts/quan-ly-skill.mjs` (`--tao-skill`, `--cap-nhat-skill`, `--tao-loi-nhac`, `--cap-nhat-loi-nhac`, `--tu-json`), following `.agents/skills/quan-ly-skill-va-ong/SKILL.md`.
  - Validate repo `.agents/` consistency, YAML frontmatter, zero undeclared `HS_*` tokens, zero private data leaks, and safety rules using `node scripts/quan-ly-skill.mjs --kiem` and `node scripts/test-quan-ly-skill.mjs`.
- **Plugin Sync & Clean Skill PR**:
  - Sync repo `.agents/{rules,agents,prompts,skills}` byte-for-byte to `/Users/ozvietnamdesktop/.gemini/config/plugins/oz-orchestrator/` via `node scripts/quan-ly-skill.mjs --dong-bo` and verify parity with `node scripts/quan-ly-skill.mjs --kiem --bat-buoc-plugin`.
  - Submit skill, rule, or prompt updates in a dedicated `docs(skills): ...` PR on an isolated `agy/...` branch off `origin/main` (never `gh pr merge`, never `[M-xx]` in title).
