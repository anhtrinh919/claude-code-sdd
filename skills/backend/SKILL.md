---
name: backend
description: >
  Backend implementation skill for SDD projects. Primary input: requirements.md (what to build) + plan.md (task groups) + handover.md (frontend context). Implements plan.md task groups in order using code-harness, then runs architectural review (Opus) and integration testing against every API contract in requirements.md. Trigger on: /backend, or when /build reaches the backend step.
---

# /backend — Backend Implementation

Input: find the most recent `specs/YYYY-MM-DD-[feature]/` directory and read:
1. `requirements.md` — what to build (the contract)
2. `plan.md` — task groups to implement in order
3. `handover.md` — what frontend built and expects from backend

If these files are missing: stop. "No phase spec found. Run `/ba`, `/spec`, and `/frontend` for this phase first."

---

## Voice rules

The user is not a developer. Plain language throughout — no file paths, function names, or stack traces in summaries.
- Surface only decisions that affect what user experiences or what the product offers. Everything else is yours.
- When a technical fork affects user-visible behavior: "I'd do X — it means Y for users. OK?"
- Never ask the user to run a server, manage a process, or open a browser. Agent owns all of that.
- Escalation is a last resort: try the primary approach, then a meaningfully different one, before surfacing to user.

---

## Wiki integration

Non-blocking — failures log and continue.

**`claude-sdd-wiki` is an optional companion plugin.** Install with `/plugin install github:anhtrinh919/claude-sdd-wiki` to enable per-agent memory across sessions. If not installed, all wiki commands below will fail silently and the skill continues normally.

### Read wiki

Before Phase 0 confirm:
1. Tags from `tech-stack.md` (language, framework, DB, key libs — up to 5).
2. Run:
   ```
   claude-sdd-wiki read --agent backend --tags "[tags]" --limit 5
   ```
3. Index under `## Relevant past learnings` in working context. On empty/fail, log and continue.

### Write learning

**Friction trigger** — fires in Phase 3 for each issue flagged by the Opus architectural review. One entry per issue.

```
claude-sdd-wiki save --auto \
  --title "Phase <N> backend friction: <issue name>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: what Opus flagged, severity, how it was fixed, what would have prevented it]" \
  --agent backend --trigger friction --phase <N>
```

**Phase-wrap trigger** — fires once after Phase 4 integration testing passes, before Completion. Summarizes what this phase's implementation taught.

```
claude-sdd-wiki save --auto \
  --title "Phase <N> backend: <one-line summary>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: what schemas/patterns surprised, which approach worked vs. dropped, what to watch next time]" \
  --agent backend --trigger phase-wrap --phase <N>
```

---

## Phase 0 — Read and confirm scope

**Step 0:** Run Read wiki (see Wiki integration) before reading spec files.

1. Read `requirements.md` — **start with the frontmatter block** (`phase`, `type`, `tdd_guard`). The `type` field governs how this phase is implemented (see "Phase-type rules" below). Then read the contract, data model, and constraints.
2. Read `plan.md`: understand the task groups and their sequence. Plan.md is design-agnostic by contract — do not expect visual details here.
3. Read `handover.md`: understand what the frontend built and what API shape it expects. Note any deviations from requirements.md — these must be resolved before implementation starts.
4. Check `tech-stack.md` for non-negotiables (e.g. strict TypeScript, no ORM, exact version pinning).
5. **Open the design file** if `handover.md` lists one under "Design file — source of truth". See Design file rules below — this step is non-negotiable for any phase that touches UI.
6. **Import design tokens** — if `handover.md` references a `design-tokens.css`, import it from the app's global stylesheet (e.g. `@import './design-tokens.css'` at the top of `globals.css`). Tokens are the single source of truth for colors, fonts, sizes. Do not re-extract by hand, do not approximate.

Confirm with user in plain language: "I'll build: [list the API endpoints from requirements.md]. Phase type: [initial/feature/rebuild]. TDD-guard: [on/off]. Following: [relevant tech-stack constraints]. Out of scope: [UI, design, anything not in requirements.md]. OK to proceed?"

Do not start implementation until confirmed.

---

## Phase-type rules

The `type` field in `requirements.md` frontmatter changes how you implement. Read it before anything else.

### `initial`
Greenfield build. No existing UI patterns to preserve. Follow the design file as the sole visual authority. Code-harness conventions ("follow existing codebase patterns") apply *only after* you've built the first working version — there is no prior codebase to follow.

### `feature`
Additive work on an existing product. Follow existing codebase patterns (file layout, naming, component style, state management). The design file describes only the *new* surface area; existing screens are untouched unless the design explicitly updates them.

### `rebuild`
Visual or structural redesign of existing product. **Existing UI patterns are explicitly overridden by the design file.** Do not preserve components, layouts, or chrome from prior phases just because they exist. If the design shows a top-header pattern and the codebase has a left sidebar, delete the sidebar — do not restyle it. Code-harness's "no invented abstractions" still applies to utilities, stores, and logic; it does **not** apply to visual layout or component structure.

If the `type` field is missing or unclear, stop and ask: "Phase type not specified in requirements.md — is this `initial`, `feature`, or `rebuild`?"

---

## Design file rules (UI phases only)

The design file is the **visual and structural source of truth** — it supersedes `design-brief.md`, any textual description in `handover.md`, and any visual pattern the existing codebase already uses. The brief describes intent; the design file is what the user approved and is happy with.

**Before any UI group in Phase 2:**

1. Open the design file at the path in `handover.md` "Design file" section.
   - Pencil: `mcp__pencil__open_document` → `mcp__pencil__get_editor_state` to list frames → `mcp__pencil__batch_get` with the frame IDs from the handover frame index to read structure → `mcp__pencil__get_screenshot` to visually verify the rendered frame.
   - Figma: use the configured MCP or open the exported asset bundle referenced in handover.
   - Other: follow the "How to read it" instructions in handover.
2. For each state the group implements, fetch the corresponding frame/node via the handover frame index.
3. **Mirror the design tree, not the existing codebase.** If the design shows a top-bar-only layout but the existing code has a left sidebar, remove the sidebar — do not restyle it. Structural patterns (navigation, page chrome, modals vs. sheets, spacing scale) come from the design file.
4. **Reusable components in the design = reusable components in code.** If the design defines a "Phase Card / Running" symbol, implement it as one component with state variants, not as inline markup duplicated per screen.
5. **Visual tokens come from the design file.** Exact colors, padding, radius, type sizes, weights — extract from the design nodes. Do not invent, do not approximate from the brief, do not retain legacy tokens "because they were close enough."
6. If the handover's frame index is missing entries for states listed in `requirements.md` UI Requirements, stop: "Frame index incomplete for [state]. Return to `/frontend` to fill it." Do not improvise the visual.
7. If the design file and `requirements.md` disagree on whether a state exists: design file wins on visuals; requirements.md wins on behavior. If the conflict is structural (a screen is in one and not the other), surface to the user.

**During each UI group:**

- Keep the relevant design frame open/accessible while implementing. Re-screenshot at the end of the group and compare against the design frame before self-verify.
- When a layout question comes up ("should this be a drawer or a modal?", "what's the spacing here?"), answer it by reading the design node — do not guess.

---

## Phase 1 — TDD setup

**Check `tdd_guard` field in `requirements.md` frontmatter.**

- If `tdd_guard: off` (typical for `rebuild` phases or pure-UI work with no new logic): write `{"guardEnabled": false}` to `.claude/tdd-guard/data/config.json` and skip the rest of Phase 1. Do not write failing tests per group — there's no logic under test.
- If `tdd_guard: on` (typical for `initial` or `feature` with new backend logic): continue below.

Install and enable `tdd-guard` for this phase:

Write or merge into `.claude/settings.json` in the project root:
```json
{
  "enabledPlugins": { "tdd-guard@tdd-guard": true },
  "extraKnownMarketplaces": {
    "tdd-guard": { "source": { "source": "github", "repo": "nizos/tdd-guard" } }
  }
}
```

Write `{"guardEnabled": true}` to `.claude/tdd-guard/data/config.json` (create dir if missing).

At phase completion or abort: write `{"guardEnabled": false}`.

---

## Phase 2 — Implementation (group by group)

Implement `plan.md` task groups in order using the `code-harness` skill for every group. Each group is independently verifiable before moving to the next.

For each group:
1. Apply **Spec-Light**: post `TASK: [group description] / ESTIMATE: [time] / VERIFY: [command]`
2. Write `verify-group-N.sh` before touching implementation
3. Write failing tests — **if `tdd_guard: on`**. Skip for `tdd_guard: off`.
4. Implement — minimum code to pass the tests / deliver the slice
5. Self-verify: run `verify-group-N.sh`
6. If red: fix and retry. If 2× estimate and still red: stop patching. Try a different approach. If both fail: surface to user in plain language.
7. **Visual compliance gate (UI groups only).** See below — this is a mandatory stop before commit for any group that renders UI.
8. Commit with a plain-English summary user can read in 2 seconds

### Visual compliance gate

A UI group is any group that renders to the DOM (a component, a page, a layout change). Before commit:

1. **Start the dev server** if not already up. Poll until it responds.
2. **For every frame this group implements** (cross-ref with `handover.md` frame index):
   - Capture the rendered state via browser automation (Puppeteer, `browse` skill, or MCP equivalent). Use the right viewport (1280px desktop; 390px mobile variants).
   - Capture the design frame via `mcp__pencil__get_screenshot({ nodeId })` (or tool equivalent).
   - Post both screenshots side-by-side to the user with a one-line asymmetry report: what matches, what doesn't.
3. **Explicit asymmetry check** — look for and flag:
   - Presence of elements not in the design (e.g. a sidebar that shouldn't be there)
   - Absence of elements that are in the design (e.g. a CTA pill missing from a top header)
   - Wrong layout chrome (modal vs. sheet, sidebar vs. top-bar, centered vs. left-aligned)
   - Wrong palette (using legacy colors instead of design tokens)
   - Wrong typography (using legacy fonts instead of those in `design-tokens.css`)
4. **Gate:** if the built screen is clearly structurally different from the design frame, **do not commit**. Fix the drift, re-verify. If you cannot resolve the drift in two attempts, surface to the user with both screenshots: "Built differs from design on [specific points]. Direction?"

This gate is the single most important check in the pipeline. Skipping it defeats the entire "design file is source of truth" contract.

For every new codepath:
- Name every error condition — no unnamed catch-alls
- Happy path + 3 shadow paths: null input, empty input, upstream error
- Observability: log anything that can fail silently
- Follow patterns from `tech-stack.md` and existing codebase — no invented abstractions

---

## Phase 3 — Architectural Review

After all groups are implemented. Read `~/.claude/advisor-template.json`, fill it out in under 300 words.

In `stuck_on`: "Review overall backend architecture for Phase [N]. Per-task logic was harness-verified. Flag: wrong abstractions, coupling issues, structural risks the plan didn't anticipate, missing seams for future change, system-boundary security concerns. Cite line ranges — do not paste file contents."

Act on findings silently:
- Clear structural risk → fix before Phase 4
- Style concern → note in completion summary

---

## Phase 4 — Integration Testing

Test the feature as a whole against every API contract in `requirements.md`. Not per-task — the full feature end-to-end.

1. Start dev server; poll until ready (max 30s)
2. For every API contract in `requirements.md`:
   - Send the exact request specified
   - Verify response shape matches spec exactly (field names, types, status codes)
   - Verify each error response: send a request that triggers each error condition, verify the correct status and message
   - Verify edge cases: empty/null input, concurrent requests where relevant
3. Cross-check against `handover.md`: does the implementation match what frontend expects? Flag any shape mismatches.
4. On failure (attempt 1): diagnose and fix. On failure (attempt 2): try a different diagnosis. Still failing → surface to user: "Endpoint [X] is failing. Tried: [approach 1, approach 2]. Suspect: [what]. Need: [what decision from you]."

---

## Completion

Write `{"guardEnabled": false}` to `.claude/tdd-guard/data/config.json`.

**Pre-Completion:** Run the phase-wrap Write learning (see Wiki integration) — one entry per phase.

> **Backend complete.**
> **Built:** [what the backend provides — one sentence]
> **API endpoints:** [count] implemented, all integration-tested
> **Status:** Ready / Has known issues / Blocked
> **What I'd watch:** [one line on anything fragile — only if relevant]

---

## Ground rules

- requirements.md is the contract. Build what it specifies — nothing more.
- plan.md task groups are the implementation sequence. Do not reorder or skip groups.
- Code-harness gates every group. No exceptions.
- tech-stack.md non-negotiables apply from the first line of code.
- Opus reviews architecture, not logic. Code-harness handled logic.
- Agent owns servers, processes, and test runners. Never ask user.
- user is the last resort, not the first.
