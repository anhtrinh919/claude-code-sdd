# Installing Optional Dependencies

`claude-code-sdd` works out of the box. Optional companions unlock more gates. Install only what you need.

## `node` — runs the bundled wiki memory CLI

```
# macOS
brew install node
# Linux / other: see https://nodejs.org
```

Verify: `node --version`

The wiki memory CLI is bundled inside this plugin (`scripts/wiki.mjs`). Skills invoke it via `node` to save and recall their own learnings across sessions. Most Claude Code installs already have node — no extra step usually needed.

## `bun` — required by the verify harness

```
curl -fsSL https://bun.sh/install | bash
```

Verify: `bun --version`

Used by `/code-harness` to run `verify-<group>.sh` scripts. Without bun, backend phases still work but can't self-verify.

## `tdd-guard` — blocks edits without a failing test

```
/plugin install github:nizos/tdd-guard
```

Verify: `ls ~/.claude/plugins/tdd-guard`

Auto-enabled by `/backend` on phases flagged `tdd_guard: on` in their spec frontmatter (typically logic-heavy phases). Without it, TDD discipline is a convention rather than a hard gate.

### `tdd-config` — sanctioned wrapper around tdd-guard config (bundled)

This plugin ships a small CLI at `bin/tdd-config` (zero deps, runs on `node` or `bun`). It is the **only** sanctioned way for `/backend` and `/code-harness` to toggle tdd-guard on and off per phase.

Usage:

```
tdd-config enable           # turn guard on; on first init seeds an SDD-aware ignorePatterns list
tdd-config disable          # turn guard off; preserves ignorePatterns
tdd-config ignore <pat>     # add a glob to ignorePatterns (e.g. 'verify-*.sh', '**/migrations/**')
tdd-config ignore --remove <pat>
tdd-config show             # print resolved config
```

Why a wrapper exists: writing `.claude/tdd-guard/data/config.json` by hand wipes the project's accumulated `ignorePatterns`, which forces every session to re-discover the same exemptions. The wrapper merges instead of overwriting. Add the bundled `bin/` to your PATH (or symlink `tdd-config` somewhere on PATH) to make it directly invocable.

## `browse` — CLI browser for /review dogfooding

`browse` is an MCP-driven headless browser used by `/review` Step 2 to click through your app like a real user. The simplest path is to install [gstack](https://github.com/anhtrinh919/gstack), which provides `browse` on PATH along with the related QA tooling (`/qa`, `/canary`, `/design-review`).

Verify: `command -v browse` should print a path.

Without browse, `/review` Step 1 (automated + manual spec checks) still works, but Step 2 (UX dogfooding) is skipped.

## Pencil MCP — direct design file access

Pencil is the design tool with the best MCP integration for this pipeline. The MCP server connects Claude Code to your open Pencil document.

- Sign up: https://pencil.dev
- Follow Pencil's Claude Code MCP setup instructions.

Verify: `claude mcp list | grep -i pencil`

Without Pencil MCP, `/frontend` hands off the design step to you (you design in any tool, save the file, and tell `/backend` where it lives). `/backend` still reads the design — just as an exported reference rather than via live MCP queries.

## Figma / other design tools

The pipeline is tool-agnostic. If you use Figma or another tool:
- Export a canonical version of your design (SVG, PNG, or native file).
- In `handover.md`, point `Design file — source of truth` at that export.
- `/backend` will read it instead of relying on the design brief alone.

Visual compliance still works — it screenshots your running app and compares against the exported design.
