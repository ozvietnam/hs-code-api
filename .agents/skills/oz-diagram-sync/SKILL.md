---
name: oz-diagram-sync
description: >-
  4-step architecture diagram and AGENTS.md onboarding audit playbook across Oz
  Vietnam repositories (erp-xnk, hs-code-api, oz-freight-api, ozsource). Use
  this skill when auditing onboarding docs, verifying Mermaid diagrams against
  live code and routes, checking for unmerged diagram branches, or running
  diagram gates.
---

# Oz Architecture Diagram & `AGENTS.md` Sync Playbook

Keep every Oz Vietnam repo instantly legible to new agents and engineers: root `AGENTS.md` on the **default/production branch** must point prominently to accurate, valid Mermaid diagrams matching live code and routes.

## Target Repo & Branch Map

| Repo | Source of Truth / Default Branch | Architecture Diagram Doc(s) | Automated Gate / Generator |
|---|---|---|---|
| **`erp-xnk`** | Gitea `oz/erp-xnk` → **`develop`** (not `main`) | `docs/SO-DO-ERP-XNK.md` | Check root `AGENTS.md` link + PR to `develop` |
| **`hs-code-api`** | GitHub `ozvietnam/hs-code-api` → **`main`** | `docs/luat-duong-khach.md` (`AUTO_MERMAID_DUONG_KHACH_START`..`END`) | `npm run gen:diagrams` + `node scripts/test-so-do-mermaid.mjs` + `node scripts/test-doc-counts.mjs` |
| **`oz-freight-api`** | `main` | `docs/SO-DO-KIEN-TRUC.md`, `docs/SO-DO-DU-LIEU.md` | Check root `AGENTS.md` link + 10-case benchmark |
| **`ozsource`** | `main` | `docs/SO-DO-KIEN-TRUC.md` | Check root `AGENTS.md` link + `pnpm test` (7 suites) |

## 4-Step Audit Playbook

### Step 1: Audit Default Branch vs Orphan / Unmerged Branches
- Confirm the repo's live default branch (`develop` for `erp-xnk`; `main` for `hs-code-api`, `oz-freight-api`, `ozsource`).
- Check remote branches and open PRs (`git fetch origin --prune`, `git branch -a`, `gh pr list` / Gitea PR list) for unmerged `docs/...` or diagram PRs stranded on orphan branches.
- Flag any case where an architecture diagram exists only on a side branch and is missing from the default branch that new agents clone.

### Step 2: Audit Diagram Content Against Real Code & Routes
- Inspect actual endpoints, rewrites, workers, and data stores in code:
  - `hs-code-api`: `routes.json`, `api/`, `lib/`, `data/luat/dau-noi.json`, `data/luat/bang-co.json`.
  - `erp-xnk`: routes, 15 order milestones, extension APIs (`/api/extension/*`), DB flows.
  - `oz-freight-api`: 4-stage freight pricing pipeline, 10-case gate, radar cron.
  - `ozsource`: WXT `src/` (`popup`, `sidebar`, `background`) ↔ `erp-xnk` backend boundary.
- Verify diagram nodes, file paths, route names, auth modes, and deployment targets match reality (e.g., no stale Vercel references on `hs-code-api`, accurate Coolify/server topology).

### Step 3: Validate Mermaid Syntax & Code Fences
- Confirm every ```` ```mermaid ```` opening fence has a matching closing ```` ``` ```` fence (no unclosed or nested-broken blocks).
- Restrict diagram types to reliably rendered Mermaid types: `flowchart` (`TD`/`LR`), `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`, `erDiagram`, `xychart-beta` (avoid unsupported types such as `timeline`, `gantt`, or `mindmap`).
- Quote node labels containing parentheses, brackets, slashes, or colons (e.g., `NodeA["Route (api/classify)"]`), and avoid raw HTML tags inside labels.

### Step 4: Verify `AGENTS.md` Pointers & Run Diagram Gates
- Check that root `AGENTS.md` on the default branch links directly to the diagram file(s) using valid relative Markdown links (e.g., `[docs/SO-DO-KIEN-TRUC.md](docs/SO-DO-KIEN-TRUC.md)` or `[docs/luat-duong-khach.md](docs/luat-duong-khach.md)`).
- On **`hs-code-api`**:
  - **NEVER** hand-edit between `<!-- AUTO_MERMAID_DUONG_KHACH_START -->` and `<!-- AUTO_MERMAID_DUONG_KHACH_END -->`; update `data/luat/dau-noi.json` / `scripts/gen-so-do-mermaid.mjs` and run `npm run gen:diagrams`.
  - Always run:
    ```bash
    node scripts/test-so-do-mermaid.mjs && node scripts/test-doc-counts.mjs
    ```
- Submit fixes via PR targeting the repo's real default branch (`develop` for `erp-xnk`, `main` for the others); never self-merge on `hs-code-api`.
