# Changelog

All notable changes to `claude-code-sdd` are documented here.

## [0.3.0] — 2026-04-28

### Added
- **`bin/tdd-config`** — sanctioned CLI wrapper for managing per-project tdd-guard config without wiping the project's accumulated `ignorePatterns`. Subcommands: `enable`, `disable`, `ignore <pattern>`, `ignore --remove <pattern>`, `show`. First `enable` in a project seeds an SDD-aware ignore list (verify scripts, migrations, schemas, generated code, build configs). `/backend` and `/code-harness` now both call it instead of writing the JSON file directly.
- **Phase-end dogfood handoff** — when `/review` clears a phase, `/build` auto-starts a long-running dev server, detects a LAN-reachable URL (Tailscale-aware), seeds env-driven dogfood credentials when the project supports them, and prints an operator-voice "what you can test" list mapped from your user stories. Skipped on `phase-blocked`.
- **`ui: true | false` flag in `requirements.md` frontmatter** — explicit signal for whether `/review` Step 1.5 (visual compliance) should run. Pure backend / infra phases now set `ui: false` and skip visual checks instead of having the gate guess from screen count.
- **`requirementsHash` drift detection** — `/spec` records a sha256 of `requirements.md` at user approval; downstream skills (`/frontend`, `/backend`, `/review`) recompute on entry and surface a warning if the contract changed after approval.
- **`reviewIteration` counter + auto-fix loop in `/review`** — HIGH and MEDIUM issues now route through an internal subagent that re-runs `/code-harness` instead of escalating technical decisions to the user. Cap is 3 iterations, then a binary surface (Accept anyway / Stop). LOW-only issues are fixed silently.
- **Phase health score** — `/review` Step 2 reports a 0–100 weighted score across functional, visual, UX feedback, mobile, edge-state, and navigation categories.
- **Shared reference at `skills/_shared/pencil-preflight.md`** — canonical Pencil MCP pre-flight (launch via Bash for both macOS and WSL2, never kill processes mid-session, plain-JSON escape hatch). `/frontend` loads it before any Pencil MCP call.

### Changed
- **`/ba` rewrite** — stops asking technical questions that have no user-facing tradeoff (auth provider, DB engine, deploy target, state library, build tooling). New "drilling discipline" section enforces decision-tree depth (5–50 questions in Mode 1, 5–20 in Mode 2, 0–5 in Mode 3) with per-mode floors. Mode 2 no longer re-scopes — it confirms and details the roadmap entry. Hands off a "primary flow" list (1–3 stories) that becomes `/review`'s stop criteria.
- **`/spec` Mode 1** — three-doc split (`mission.md` + `tech-stack.md` + `roadmap.md`) is the source of truth; the older single `constitution.md` schema is removed. Living docs (WIKI, architecture, api, decisions) get an "agent context — not for human reading" prefix so the operator visually skips them.
- **`/spec` Mode 2** — adds a scope-challenge step (search the existing codebase before speccing new work; flag if >8 files or 2+ new abstractions are involved) and a self-check on every story / task group / API contract before requesting approval.
- **`/build` state schema** — typed shape with `phase`, `feature`, `step`, `reviewIteration`, `requirementsHash`, `currentSubStep`, `dogfoodPid`. Step enum normalized: `*-complete` is the new canonical (`*-approved` legacy values still read and auto-migrated on the next gate write). New `phase-blocked` state for cap-hit `/review` outcomes — does not auto-resume, surfaces blockers and waits for the user to choose (another fix round, manual rollback, accept-and-move-on).
- **`/build` same-session auto-continue** — phase-boundary gates (`constitution-complete`, `phase-complete`) now skip the manual re-invoke when the prior gate was written in the same uncompacted session. Cold-start (new session, post-compaction) keeps the manual gate.
- **`/frontend` design-tool persistence** — the choice between external tool and Claude Code is now a project-level decision recorded in `mission.md` under `## Design Tool`. Asked once at Phase 1, never again. Plus: design-quality gate (trunk test + AI-slop check) before Phase 4 approval.
- **`/code-harness` and `/backend`** — both phases now toggle tdd-guard via the bundled `tdd-config` instead of writing the JSON file. Explicit warning never to hand-write `config.json`.
- **`/backend` Phase 3 architectural review** — phrased as "spawn a subagent for architectural review" instead of pinning to a specific advisor template path; runs Opus where available.
- **`/review` Step 0** — new "scope drift detection" sweep before automated checks: classify every plan.md task group as DONE / PARTIAL / NOT DONE / SCOPE CREEP from `git diff`. Primary-flow groups in NOT DONE / PARTIAL trigger the auto-fix loop instead of running Step 1.

### Removed
- `skills/build/schemas/constitution.md` and `skills/build/schemas/phase-spec.md` — superseded by the `mission.md` + `tech-stack.md` + `roadmap.md` Mode 1 split and the `requirements.md` + `plan.md` + `validation.md` Mode 2 split.
- Companion-plugin link in README — wiki has been bundled inside this plugin since v0.2.0; the standalone `claude-sdd-wiki` plugin is fully retired.

## [0.2.0] — 2026-04-25

### Changed
- **Bundled the wiki memory CLI inside this plugin.** The companion plugin `claude-sdd-wiki` is now archived; its CLI ships at `scripts/wiki.mjs` and is invoked by skills via `node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs"`. Single-plugin install — no companion to track.
- Skills now require `node` on PATH (already de-facto required by Claude Code itself). `bun` requirement is unchanged (verify harness only).
- `/preflight` updated: drops `claude-sdd-wiki` row, adds `node` row.
- README, `docs/QUICKSTART.md`, `docs/INSTALL-DEPS.md` rewritten so first-time readers see one cohesive product. No "companion plugin" framing.

### Migration for v0.1.0 users
- Existing wiki entries at `~/.claude/wiki/` are unaffected — same data dir.
- Optionally uninstall the standalone `claude-sdd-wiki` plugin once you're on v0.2.0 of this plugin: `/plugin uninstall claude-sdd-wiki`.

## [0.1.0] — 2026-04-25

Initial public release.

### Added
- Seven skills bundled as a Claude Code plugin:
  - `/build` — master orchestrator with crash-safe state file
  - `/ba` — business-analyst drill (3 modes)
  - `/spec` — structured doc writer (3 modes)
  - `/frontend` — design brief + handover
  - `/backend` — implementation with visual compliance gate
  - `/review` — spec compliance + UX dogfooding
  - `/code-harness` — per-task discipline pipeline
  - `/preflight` — first-run dependency check
- Phase-type awareness (`initial` / `feature` / `rebuild`) in `requirements.md` frontmatter so rebuild phases override existing UI patterns instead of preserving them.
- Visual compliance gate inside `/backend` and `/review` — screenshot the built UI, compare against the design frame, fix drift before commit.
- Design-tokens pipeline — `/frontend` extracts variables from the design file into `design-tokens.css`; `/backend` imports it.
- Optional graceful integration with `claude-sdd-wiki` for per-agent memory across sessions; pipeline degrades silently when not installed.
