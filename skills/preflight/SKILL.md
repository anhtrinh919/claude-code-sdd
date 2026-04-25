---
name: preflight
description: >
  First-run dependency check for claude-code-sdd. Inspects the local environment for bun, claude-wiki, tdd-guard, browse, and Pencil MCP and reports a simple ✓/⚠/✗ table with install hints. Informational only — never blocks. Invoked by /build on the first run per project (guarded by `.build-state.json` field `preflight_done: true`). User can also invoke directly via /preflight to re-check later.
---

# /preflight — First-Run Dependency Check

Runs once per project. Does not block `/build` under any circumstance. Its job is to tell the user which companions are installed, which are missing, and how to install the missing ones. Everything in the pipeline gracefully degrades, so "missing" is informational, never fatal.

---

## When it runs

- **Auto:** `/build` calls this on its very first invocation in a project, then writes `{ "preflight_done": true }` into `.build-state.json`. Subsequent `/build` runs skip preflight.
- **Manual:** user can type `/preflight` to re-check anytime.

---

## Checks

Run each check in order. Collect results into a table. Each check has four possible outcomes: ✓ installed, ⚠ missing-but-optional, ✗ missing-but-required, or ? couldn't-determine.

| # | Dependency | Check | Required? | Install hint |
|---|---|---|---|---|
| 1 | **bun** | `command -v bun` | Yes — harness verify scripts expect it | `curl -fsSL https://bun.sh/install \| bash` |
| 2 | **claude-wiki** | `command -v claude-wiki` | No — graceful | `/plugin install github:anhtrinh919/claude-wiki` |
| 3 | **tdd-guard plugin** | `test -d ~/.claude/plugins/tdd-guard` OR check `~/.claude/settings.json` `enabledPlugins` contains `tdd-guard` | Recommended for logic phases | `/plugin install github:nizos/tdd-guard` |
| 4 | **browse CLI** | `command -v browse` OR `test -x ~/.claude/skills/gstack/browse/dist/browse` | Recommended for /review step 2 | See `docs/INSTALL-DEPS.md` in this plugin |
| 5 | **Pencil MCP** | `claude mcp list 2>/dev/null \| grep -qi pencil` | No — frontend degrades to hand-off | Open Pencil.dev, follow Claude Code MCP setup in their docs |

For each check, mark ✓ if present, ⚠ if missing but optional/recommended, ✗ if missing and required, ? if the check command itself failed.

---

## Output

One markdown table, preceded by a single plain-language sentence summary. Example:

```
Preflight check — 3 of 5 companions present.

| Dep | Status | Why it matters | Fix |
|---|---|---|---|
| bun | ✓ | Harness verify scripts | — |
| claude-wiki | ⚠ missing | Per-agent memory across sessions (optional) | `/plugin install github:anhtrinh919/claude-wiki` |
| tdd-guard | ⚠ missing | Blocks edits without failing tests during logic phases | `/plugin install github:nizos/tdd-guard` |
| browse | ✓ | /review dogfooding | — |
| Pencil MCP | ✓ | Direct design file access | — |
```

After the table, one plain-language sentence summarizing what's safe to run:
- If bun is present: "`/build` will work — install the optional companions above when you hit the phases that use them."
- If bun is missing: "`/build` will run but any backend phase will fail at the verify step. Install bun first, then re-run `/preflight`."

---

## Ground rules

- Never block. Preflight is informational. `/build` reads the results and continues regardless.
- Never ask user to approve the check itself — just run it and report.
- If `/preflight` is invoked outside the SDD pipeline (user typed it directly), don't modify `.build-state.json`. Only `/build` touches that file.
- If a check command produces ambiguous output (e.g. `command -v` succeeds but the binary is broken), mark ? and move on.
