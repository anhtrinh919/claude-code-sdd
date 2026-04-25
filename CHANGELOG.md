# Changelog

All notable changes to `claude-code-sdd` are documented here.

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
