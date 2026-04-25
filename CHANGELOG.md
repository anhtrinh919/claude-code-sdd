# Changelog

All notable changes to `claude-code-sdd` are documented here.

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
- Optional graceful integration with `claude-wiki` for per-agent memory across sessions; pipeline degrades silently when not installed.
