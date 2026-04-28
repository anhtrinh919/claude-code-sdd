---
name: code-harness
description: >
  A 3-layer discipline pipeline (Spec-Light + TDD-Guard + Verify-Script) that prevents the "AI
  claims done, doesn't work, non-dev can't verify, debug spiral" failure mode. Trigger this skill
  ALWAYS before writing any implementation code for a non-developer operator: whenever the
  user says "let's build/implement/add/fix/change", invokes /dev or /implement, starts a new task,
  or asks for a "quick fix" or "simple change". Also trigger when resuming work mid-session on a
  task that already had code written without a verify-script. Do NOT skip this skill to "save
  time" — skipping it IS the failure mode the skill exists to prevent. Use it proactively without
  being asked.
---

# Code Harness

Per-task discipline pipeline for AI-coding projects where the driver is a non-developer. Sits below `/dev` (phase orchestrator) and above raw implementation (which this skill gates). Applies to every task in every project user drives.

---

## Why this exists

Non-dev AI-coding projects fail in a consistent pattern: AI claims "done" → it doesn't work → user can't verify → AI moves on → broken work stacks silently → one obvious failure surfaces three intertwined ones → debug spiral. This skill installs the external check the AI cannot fake its way past.

---

## Agent responsibilities (non-negotiable)

- **Servers and processes.** Agent starts everything needed before running any check. Never ask the user to start a server.
- **Browser testing.** Agent uses the `browse` skill for all browser-level verification. Never ask the user to open a browser.
- **Escalation is a last resort.** Try the primary approach. If it fails, try a meaningfully different one. Only surface to user when both approaches fail and there's a genuine blocker only he can resolve (product decision, missing credential). "I'm stuck" is not an escalation reason.

---

## The three layers

### Layer 1 — Spec-Light

Before any implementation code, post three lines:

```
TASK: <one sentence, plain English, what changes>
ESTIMATE: <hours or days, honest>
VERIFY: <one command the user will run>
```

If you can't produce all three in ≤3 lines, the task isn't scoped. Stop and ask.

### Layer 2 — TDD-Guard

`tdd-guard` is globally installed but defaults OFF. This skill activates it for the duration of the workflow via the `tdd-config` helper:

- **At step 1 of "Per-task workflow"** (before Spec-Light), run `tdd-config enable` from the project root. On first init this seeds a curated `ignorePatterns` list (md/txt/log/json/yml/yaml/xml/html/css/rst plus SDD additions: `verify-*.sh`, `**/migrations/**`, `**/db/schema.*`, `**/seed/**`, `**/fixtures/**`, `**/dist/**`, `**/generated/**`, `*.config.ts`, etc.). On subsequent runs it preserves whatever the project has accumulated. With guard on, tdd-guard physically blocks edits without a prior failing test.
- **After step 9 (Commit)** or whenever the workflow exits (escalation, abort), run `tdd-config disable`. This flips `guardEnabled` to false but leaves `ignorePatterns` untouched.

**Never write `config.json` directly with raw JSON** — that wipes the project's accumulated `ignorePatterns` and forces the agent to re-discover the same exemptions every session. Always go through `tdd-config`.

**When the guard blocks a legitimately untestable file** (declarative schema, generated code, migration, build config, smoke-only verify script): run `tdd-config ignore '<pattern>'` to persist the exemption. Do not disable the guard, do not write a fake test, and do not work around it inline — the pattern needs to survive into the next session. Use `tdd-config ignore --remove '<pattern>'` to undo if the exemption was wrong.

If the file write fails (read-only repo, sandboxed env): proceed without enforcement, but write the failing test anyway. If the task genuinely can't be unit-tested (manual UI), a `verify.sh` smoke check is the equivalent.

When `/dev` is the entry point, it owns the on/off toggle around all of Phase 2; this skill should still respect the same on/off contract for any standalone invocation.

### Layer 3 — Verify-Script

Every task ships with a `verify.sh`. Project convention varies; default to `./verify-<task>.sh`.

**Contract:** ≤10 lines of logic, ≤30s runtime, one command to run, plain-English ✓/✗ output, exit 0/1.

**Agent starts any required server before running the script.**

Template:
```bash
#!/usr/bin/env bash
# TASK: <spec>
# ESTIMATE: <N>
set -o pipefail
pass=0; total=0
check() { total=$((total+1)); if eval "$2" >/dev/null 2>&1; then echo "✓ $1"; pass=$((pass+1)); else echo "✗ $1"; fi; }

check "API responds" "curl -sf http://localhost:8000/healthz"
check "unit test passes" "cd app && npm test -- --run MyFeature"
# For browser checks, agent runs browse directly (not wrapped in verify.sh):
# browse navigate http://localhost:3000/page → assert element visible

echo "---"
[ "$pass" = "$total" ] && { echo "PASS ($pass/$total)"; exit 0; } || { echo "FAIL ($pass/$total)"; exit 1; }
```

Browser/UI checks are run by the agent via `browse` — they don't need to be in `verify.sh`. But they must complete before the task is declared done.

**The user runs verify.sh, not you.** "Claude says green" doesn't count. "user ran it and saw green" counts.

---

## Per-task workflow

1. **Spec-Light** — post Task / Estimate / Verify.
2. **Start server** (agent) if checks need a running service.
3. **Write verify.sh** before touching implementation. Show it; proceed on acceptance or silence.
4. **Failing test** — write and confirm red (TDD-Guard enforces this if installed).
5. **Implement** — minimum code to pass the test.
6. **Self-verify** — run verify.sh. If red, fix and retry.
7. **Browser checks** (if UI-touching) — agent runs `browse` to navigate, interact, and assert. Don't skip.
8. **Screenshot** (if UI-touching) — agent captures via `browse`, saves to project path, commits with the code.
9. **Commit** — plain-English summary user can read in one breath. New commit, never amend.
10. **Hand off:**
    ```
    Done. Run `bash <path/verify.sh>` to confirm.
    Screenshot at <path> (if UI).
    ```
11. **Budget check** — if time ≥2× estimate and verify still red: stop patching, try a genuinely different approach. If that also fails, tell user: "Blew 2× budget on X. Tried two approaches. Verify still red on Y. Re-planning." Then re-enter plan mode.

---

## Non-dev commit rules

**Plain-English summary first.** The commit's first 1-2 lines must be readable by user in 2 seconds.

Good: *"Adds 'Clear zones' button to refine panel with undo support."*  
Bad: *"feat(lc-app): scaffold shape utils"*

The body can be technical. The first lines cannot.

---

## Anti-patterns

- **Code before verify.sh.** No contract, no code.
- **"Too small to test."** If it's too small to get wrong, it's too small to verify silently either. Three-line verify.sh minimum.
- **Asking user to start a server or open a browser.** Agent handles all process and browser work.
- **Multiple tasks in one commit.** One task, one verify, one commit.
- **Amending published commits.** New commit always.
- **Claiming done from your own run.** user runs verify.sh. You don't close the task.
- **Escalating before trying a second approach.** Re-read, try differently, then surface.

---

## Trigger rules

Apply this skill when:
- User says "build / implement / add / fix / change / update / quick fix"
- User invokes `/dev`, `/implement`, or any task-starter command
- You are about to edit a source file in a project with `phases/`, `specs/`, or `tasks/` directory

Do NOT apply to: pure research, docs-only edits, one-off sanity probes (curl/SQL), plan-mode work.

---

## Installation check (first time in a project)

1. GitHub Spec Kit present? (`.specify/memory/constitution.md`)
2. tdd-guard installed? (`.claude/plugins.json` or `~/.claude/plugins.json`)
3. Verify template exists? (`phases/*/tasks/_template-verify.sh` or similar)

If any are missing and the project will last more than a week, propose Day-0 installation before starting.

---

## Relationship to other skills

- **`/dev`** — outer orchestrator (phases). This skill applies within Phase 2 per task. `/dev`'s Opus phase handles architectural review; this skill handles per-task logic correctness.
- **`browse`** — powers all browser checks within this skill. Agent-operated, never user-operated.
- **`frontend-design`** — designs upfront in Pencil. This skill verifies the implementation matches task by task via screenshots.
