---
name: review
description: >
  SDD review skill — two sequential steps gated by pass/fail. Step 1: validation.md compliance (runs every automated check, then every manual verification from the spec's validation.md — binary pass/fail). Step 2: UX dogfooding (only if Step 1 passes — navigates the app as a real user using the browse skill, looking for broken flows, confusing UX, missing feedback, empty state quality). Trigger on: /review, or when /build reaches the review step. Also trigger when user asks to "review the UI", "check what I built", "QA this", or "does this look right to a user".
---

# /review — Spec Compliance & UX Dogfooding

Input: `specs/YYYY-MM-DD-[feature]/validation.md` — this is the test contract. Read it first.

If no `validation.md` is found: stop. "No validation spec found. Run `/spec` for this phase first."

Step 1 must pass before Step 2 starts. No exceptions.

---

## Wiki integration

Non-blocking — failures log and continue.

**`claude-sdd-wiki` is an optional companion plugin.** Install with `/plugin install github:anhtrinh919/claude-sdd-wiki` to enable per-agent memory across sessions. If not installed, all wiki commands below will fail silently and the skill continues normally.

### Read wiki

Before running Step 1:
1. Tags from `tech-stack.md` (up to 5).
2. Run:
   ```
   claude-sdd-wiki read --agent review --tags "[tags]" --limit 5
   ```
3. Index under `## Relevant past learnings` in working context. On empty/fail, log and continue.

### Write learning

**Friction trigger** — fires for each bug found during Step 1 (failed automated or manual check) or Step 2 (UX bugs, visual issues). One entry per bug.

```
claude-sdd-wiki save --auto \
  --title "Phase <N> review friction: <bug name>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: where the bug surfaced, which user story it touched, how it was resolved, what check would have caught it earlier]" \
  --agent review --trigger friction --phase <N>
```

**Phase-wrap trigger** — fires once at the end of Step 2, after the Step 2 report is written, before user approval. Summarizes review outcomes.

```
claude-sdd-wiki save --auto \
  --title "Phase <N> review: <one-line summary>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: which automated checks caught real bugs, which manual checks surfaced issues, what UX pattern to watch next time]" \
  --agent review --trigger phase-wrap --phase <N>
```

---

## Step 1 — Validation.md Compliance

**Step 0:** Run Read wiki (see Wiki integration) before running automated checks.

### Automated checks

Run every automated check listed in `validation.md`. For each:

1. Execute the command exactly as specified
2. Record exit code and output
3. Report: `✓ [check name]` or `✗ [check name] — [what failed]`

The dev server must be running before API checks. Start it if needed; poll until ready (max 30s). Never ask the user to start a server.

After all automated checks:
- All pass → proceed to manual verification
- Any fail → stop. Report: "Automated checks failed: [list]. Return to `/backend`." Do not proceed to manual verification or UX review.

### Manual verification

Walk through every manual check in `validation.md`. For each:

1. Use `browse` skill to navigate to the specified state
2. Perform the specified action
3. Observe the result
4. Record: `✓ [check]` or `✗ [check] — [what was seen vs what was expected]`

Take a screenshot for every meaningful state change. Document what you saw.

After all manual checks:
- All pass → Step 1 complete, proceed to Step 2
- Any fail → stop. Report: "Manual checks failed: [list with what was seen]. Return to `/backend`." Do not proceed to UX review.

### Step 1 completion report

```
Step 1 — Validation Compliance
Automated: [N]/[N] passed
Manual: [N]/[N] passed
Status: PASS / FAIL
```

---

## Step 1.5 — Visual compliance (UI phases only)

Only runs after Step 1 fully passes. Skip this step if the phase is non-UI (pure backend, infra, tooling).

Purpose: confirm every frame in `handover.md` was actually built as designed. This catches the failure mode where code runs, tests pass, but the built screen looks nothing like the design.

1. **Open the design file** using the path in `handover.md` "Design file" section. Pencil: `mcp__pencil__open_document` → `mcp__pencil__get_editor_state`.
2. **Iterate the frame index.** For every row in the handover frame index:
   - Navigate the running app to the state that row describes. Use seeded fixtures or direct URL navigation as needed.
   - Capture the built screen via `browse` / Puppeteer / MCP browser. Match the viewport listed in the frame (1280px desktop, 390px mobile).
   - Capture the design frame via `mcp__pencil__get_screenshot({ nodeId })`.
   - Compare side-by-side. Record one of:
     - ✓ Match (structural match — minor pixel differences are OK)
     - ⚠ Drift (wrong chrome, wrong palette, missing element, extra element — specify what)
     - ✗ Not built (the state doesn't render at all)
3. **Summarize** in the completion report:
   ```
   Step 1.5 — Visual Compliance
   ✓ Match: [N] frames
   ⚠ Drift: [N] frames — [list with frame IDs]
   ✗ Not built: [N] frames — [list with frame IDs]
   Status: PASS / FAIL
   ```

Gate: any `⚠ Drift` or `✗ Not built` rows fail this step. Return to `/backend` with the list of drifting frames. Do not proceed to Step 2.

For non-Pencil design tools, use the equivalent MCP/export. If no machine-readable design file exists (screenshots only), degrade to human review: post built screenshot + designer-provided screenshot side-by-side and ask the user to confirm match.

---

## Step 2 — UX Dogfooding

Only runs after Step 1 fully passes.

You are a meticulous, opinionated power-user doing QA. You care about: things actually working, clear feedback, sensible defaults, no dead ends, no broken states. You are NOT reviewing code quality — you are reviewing the experience for humans.

### Browser setup

Locate the browse binary:
```bash
B=~/.claude/skills/gstack/browse/dist/browse
if [ -x "$B" ]; then echo "BROWSE_READY: $B"; else echo "BROWSE_MISSING"; fi
```

If missing, rebuild: `cd ~/.claude/skills/gstack && bun install && cd browse && mkdir -p dist && bun build src/cli.ts --compile --outfile dist/browse`

Do not continue without a working browse binary. Do not fall back to Puppeteer or curl — ever.

If the app redirects to login, check `.env`, `.env.local`, or `CLAUDE.md` in the project root for credentials, then log in before proceeding.

**Take a screenshot after every meaningful action.** Do not skip screenshots to save time.

---

### Pre-2a: State Setup

Before walking user stories, identify which stories require live run state (any story involving: a run in progress, a gate pending, a failure, a past run log). For those stories, seed the required state directly into the database using the API or direct DB insert. This is mandatory — do not skip a story because "it needs a real run." 

**State seeding approach:**
1. Start the dev server, create a test project pointing at a temp directory if needed.
2. For `running` state stories: POST `/api/cards/:id/runs` with fake claude binary on PATH (use `app/test/fixtures/fake-claude-done.sh` for a quick run or inject manually).
3. For `gate-pending` state stories: POST run, wait for fake-claude-gate.sh to emit gate, then walk the UI.
4. For `failed` state stories: POST run with fake-claude-fail.sh, wait for `failed` status.
5. For `past run history` stories: any completed run suffices; create via API or verify existing runs.
6. For streaming animation (real-time chip arrival): browse is snapshot-only — verify the **final rendered state** (chips present, in order, correct content) rather than the animation timing. Note this caveat in the report.

Cleanup: delete test runs/projects created during review if they pollute the user's real board.

---

### 2a — Walk EVERY user story (mandatory)

**This step is not optional. Every user story in `requirements.md` must be walked.** A story cannot be marked as passing without a screenshot proving it.

For each user story in `requirements.md`, in order:

1. **Read the story** — understand exactly what action it describes and what outcome it promises.
2. **Set up the starting state** — if the story requires a run in a specific state, seed it first (see Pre-2a above).
3. **Navigate to the starting point** via browse.
4. **Perform the action** the story describes.
5. **Screenshot the result.**
6. **Assess:** does the outcome match what the story promises? A story that technically completes but leaves the user confused is a failure.
7. **Record:** `✓ Story N: [one-line description]` or `✗ Story N: [description] — [what was seen vs expected]`

**If a story cannot be demonstrated** (missing feature, broken state, or impossible to reach): mark it `✗` and document the blocker. Do NOT skip it silently — a skipped story is a failed story.

**Stories that involve real-time behavior** (streaming, polling, toast timing): seed the final state, screenshot the result, note "animation not verified — state verified."

After all stories:
- All pass → proceed to 2b
- Any fail → document in report. If a failure is a blocker for the primary user flow, note it as a STOP. If it's a secondary flow, continue and surface in report.

---

### 2b — Core screens

For each screen in `handover.md`:
```bash
$B goto <APP_URL>/<route>
$B screenshot /tmp/review-[screen]-desktop.png
```
Read each screenshot and assess visually:
- First impression — does it look finished?
- Is the visual hierarchy obvious?
- Is typography readable (size, contrast, line length)?
- Are there misaligned elements, clipping, or orphaned text?

### 2c — Mobile viewport

```bash
$B viewport 390x844
$B goto <APP_URL>
$B screenshot /tmp/review-mobile.png
```

Assess: is the layout intentionally adapted, or just squished? Text overflow, horizontal scroll, touch targets too small, content hidden?

### 2d — Edge states

- **Empty state:** Navigate to a state with no data. Screenshot. Is it clearly designed, or just a blank void?
- **Error state:** Trigger a validation error. Screenshot. Is the error message visible and readable?
- **Loading state:** If async operations exist, observe the loading state. Does it appear and resolve?

### 2e — Navigation & dead ends

Click through the main navigation. Screenshot each destination. Do active states update? Are there dead ends with no way back?

---

## Step 2 report

Write a structured report with a mandatory user story coverage table at the top:

```
### Review Report

**What was reviewed:** [one sentence]
**Validation:** Step 1 PASS — [N] automated + [N] manual checks
**Date:** [today]

#### User Story Coverage
Every story from requirements.md must appear in this table.
| # | Story (abbreviated) | Result | Screenshot | Notes |
|---|---|---|---|---|
| 1 | ... | ✓ / ✗ | /tmp/review-s1.png | ... |
...

#### Bugs
Issues that are broken or produce incorrect results.
| # | Severity | Story # | Where | What happens | What should happen |
If none: *No bugs found.*

#### UX Issues
Things that work technically but are confusing or missing feedback.
| # | Story # | Where | Issue | Impact |
If none: *No UX issues found.*

#### Visual Issues
Things that look wrong in screenshots.
| # | Where | What looks wrong | Why it matters |
If none: *No visual issues found.*

#### Improvement Ideas
Not bugs — things that would make the experience better.
1. **[Title]** — [description and why it helps]
If none: *No improvement ideas.*

**Overall verdict:** [1-2 sentences: is this ready for user's approval? What's the one thing that most needs fixing?]
```

Fix minor issues silently (copy errors, obvious visual misalignments, missing alt text). Surface only issues that require a product decision or significant backend change.

---

## Ground rules

- Step 1 must pass before Step 2 starts. No exceptions.
- Never start Step 2 if any automated check or manual verification failed.
- **Every user story must be walked. Skipping a story is the same as failing it.**
- Always use browse — never Puppeteer, curl, or reading code to infer appearance.
- Screenshot every story. "I checked the code" does not count as UX verification.
- Use Pre-2a state seeding for any story requiring an active/past run. Never skip a story because it needs live state — seed it.
- Rate severity honestly. Not everything is critical.
- Fix minor issues silently. Escalate only real blockers.
- user starts a server or opens a browser — never. Agent owns all process and browser work.
