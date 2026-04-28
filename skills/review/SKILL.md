---
name: review
description: >
  SDD review skill — two sequential steps gated by pass/fail. Step 1: validation.md compliance (runs every automated check, then every manual verification from the spec's validation.md — binary pass/fail). Step 2: UX dogfooding (only if Step 1 passes — navigates the app as a real user using the browse skill, looking for broken flows, confusing UX, missing feedback, empty state quality). Trigger on: /review, or when /build reaches the review step. Also trigger when user asks to "review the UI" or "does this look right to a user" in the context of an SDD build workflow.
---

# /review — Spec Compliance & UX Dogfooding

Input: `specs/YYYY-MM-DD-[feature]/validation.md` — this is the test contract. Read it first.

If no `validation.md` is found: stop. "No validation spec found. Run `/spec` for this phase first."

Step 1 must pass before Step 2 starts. No exceptions.

---

## Auto-fix loop policy

This skill runs in a loop until all checks pass or the iteration cap is hit. Anywhere this skill says **trigger auto-fix loop**, apply the policy below — never stop and ask the user to make a technical decision about HIGH/MEDIUM bugs, broken validations, or visual drift. The user is non-technical: their role is binary (accept-as-is, or stop), and they only see the loop when the cap is hit.

**Iteration counter:** Read `.build-state.json` in the project root. Use the `reviewIteration` field (default 0 if missing — see the typed schema in `${CLAUDE_PLUGIN_ROOT}/skills/build/SKILL.md`). Increment by 1 every time the loop fires; write the file back before dispatching, preserving every other field (`phase`, `feature`, `step`, `requirementsHash`, `currentSubStep`, `dogfoodPid`).

**Loop body — apply whenever a step fails or Step 2 surfaces HIGH/MEDIUM issues:**

1. Collect the current failures into a brief: the failing automated checks (with output), the drifting frames (with frame IDs and what differs), or the HIGH/MEDIUM Step 2 issues (with the table rows verbatim). Include the verify command that must pass for each.
2. Spawn a subagent via the `Agent` tool with `subagent_type: general-purpose`. Brief it with:
   - Phase spec paths: `requirements.md`, `plan.md`, `handover.md`
   - The exact failing checks/issues to fix — paste from the current run, do not summarise
   - The verify commands that must pass after the fix (e.g. `bash specs/.../verify-group-N.sh`, the failing manual check, the failing user-story walk)
   - **Hard constraint — invoke `/code-harness` for every fix.** Each fix must go through code-harness's discipline pipeline: write/update a verify-script first (or use the existing `specs/.../verify-group-N.sh`), make the failing test/check fail clearly, then implement, then green. The subagent is not allowed to commit a fix without a verify-script run that passes.
   - Hard constraints: fix only what is flagged; do not refactor, do not extend scope, do not change the spec; re-run the failing verify after each fix and stop only when it is green; root-cause iron law applies (no surface-patching tests to make them pass); if a fix needs more than **3 hypotheses**, return with the diagnosis instead of pushing further (matches the unified retry cap).
3. Wait for the subagent to return. Read its summary — note which fixes landed and which didn't.
4. Re-enter this skill from Step 0. The fresh run validates the fix from scratch — never trust the subagent's claim that something was fixed.

**Cap:** If `reviewIteration >= 3` and there are still failures after the fresh run, stop the loop and surface once to the user as a binary:

```
Phase [N] review: [X] issue(s) still failing after 3 fix attempts.

Still failing:
- [issue 1 — one line]
- [issue 2 — one line]

Accept anyway (mark phase complete with known issues), or Stop (call this phase blocked)?
```

Wait for the user's reply. No further fix attempts unless the user explicitly asks for another round.

**LOW-only outcome:** If Step 2 produces only LOW-severity items, do not loop. Fix trivial ones silently in the same run; log the rest in the report; complete normally.

**Reset:** When the loop completes cleanly (Step 2 ends with no HIGH/MEDIUM items), reset `reviewIteration` to 0 in `.build-state.json` before writing the final report (preserve every other field). The next phase starts fresh.

**Sub-skill breadcrumb:** On entry, write `currentSubStep: "review.<step>"` to `.build-state.json` (e.g. `review.step-1`, `review.step-1.5`, `review.step-2`). Null it out on clean exit. `/build` reads this on resume.

**What the user sees:** nothing about iterations, subagents, or fix attempts — until the cap is hit. Each loop is internal. The final output is either a clean report (success) or the binary surface above (cap hit).

---

## Wiki integration

Non-blocking — failures log and continue.

### Read wiki

Before running Step 1:
1. Tags from `tech-stack.md` (up to 5).
2. Run:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" read --agent review --tags "[tags]" --limit 5
   ```
3. Index under `## Relevant past learnings` in working context. On empty/fail, log and continue.

### Write learning

**Friction trigger** — fires for each bug found during Step 1 (failed automated or manual check) or Step 2 (UX bugs, visual issues). One entry per bug.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" save --auto \
  --title "Phase <N> review friction: <bug name>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: where the bug surfaced, which user story it touched, how it was resolved, what check would have caught it earlier]" \
  --agent review --trigger friction --phase <N>
```

**Phase-wrap trigger** — fires once at the end of Step 2, after the Step 2 report is written, before user approval. Summarizes review outcomes.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" save --auto \
  --title "Phase <N> review: <one-line summary>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: which automated checks caught real bugs, which manual checks surfaced issues, what UX pattern to watch next time]" \
  --agent review --trigger phase-wrap --phase <N>
```

---

## Step 0 — Scope Drift Detection

Before running any checks, compare what was specced against what was built.

1. Read `plan.md` task groups.
2. Run `git diff main..HEAD --name-only` (or equivalent for the feature branch) to see what files changed.
3. For each task group, classify as:
   - **DONE** — files for this group are present in the diff with expected changes
   - **PARTIAL** — some files changed but key pieces appear missing
   - **NOT DONE** — no relevant files in the diff for this group
   - **SCOPE CREEP** — files changed that are outside all task groups

4. Surface a one-line table before proceeding:
   ```
   Group 1: DONE
   Group 2: PARTIAL — missing [what]
   Group 3: NOT DONE
   ```

**Gate:** If any task group that covers a primary user flow story is NOT DONE or PARTIAL, **trigger auto-fix loop** with the incomplete task group(s) as the brief. Do not run Step 1 in this iteration.

Non-primary groups that are NOT DONE: surface as a warning but do not trigger the loop.

---

## Step 1 — Validation.md Compliance

**Step 0 (wiki):** Run Read wiki (see Wiki integration) before running automated checks.

### Automated checks

Run every automated check listed in `validation.md`. For each:

1. Execute the command exactly as specified
2. Record exit code and output
3. Report: `✓ [check name]` or `✗ [check name] — [what failed]`

The dev server must be running before API checks. Start it if needed; poll until ready (max 30s). Never ask the user to start a server.

After all automated checks:
- All pass → proceed to manual verification
- Any fail → **trigger auto-fix loop** with the failing checks (and their output) as the brief. Do not proceed to manual verification or UX review in this iteration.

### Manual verification

Walk through every manual check in `validation.md`. For each:

1. Use `browse` skill to navigate to the specified state
2. Perform the specified action
3. Observe the result
4. Record: `✓ [check]` or `✗ [check] — [what was seen vs what was expected]`

Take a screenshot for every meaningful state change. Document what you saw.

After all manual checks:
- All pass → Step 1 complete, proceed to Step 1.5 (or Step 2 for non-UI phases)
- Any fail → **trigger auto-fix loop** with the failing checks (and what was seen vs expected) as the brief. Do not proceed to UX review in this iteration.

### Step 1 completion report

```
Step 1 — Validation Compliance
Automated: [N]/[N] passed
Manual: [N]/[N] passed
Status: PASS / FAIL
```

---

## Step 1.5 — Visual compliance (UI phases only)

Only runs after Step 1 fully passes. **Skip this step explicitly when `requirements.md` frontmatter has `ui: false`.** If the `ui` field is missing, default to `true` for backward compatibility (existing phases without the flag are assumed UI). Never infer from screen count — the flag is the only signal.

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

Gate: any `⚠ Drift` or `✗ Not built` rows fail this step. **Trigger auto-fix loop** with the drifting/missing frames (frame IDs and what differs) as the brief. Do not proceed to Step 2 in this iteration.

For non-Pencil design tools, use the equivalent MCP/export. If no machine-readable design file exists (screenshots only), degrade to human review: post built screenshot + designer-provided screenshot side-by-side and ask the user to confirm match.

---

## Step 2 — UX Dogfooding

Only runs after Step 1 fully passes.

You are a meticulous, opinionated power-user doing QA. You care about: things actually working, clear feedback, sensible defaults, no dead ends, no broken states. You are NOT reviewing code quality — you are reviewing the experience for humans.

### Browser setup

Locate the browse binary:
```bash
if command -v browse >/dev/null 2>&1; then echo "BROWSE_READY: $(command -v browse)"; else echo "BROWSE_MISSING"; fi
```

If missing, install gstack (which provides `browse`): see `https://github.com/anhtrinh919/gstack` for install instructions, or invoke whatever browse-equivalent CLI your environment provides. Do not continue without a working browse binary. Do not fall back to Puppeteer or curl — ever.

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

Fix minor issues silently (copy errors, obvious visual misalignments, missing alt text). Anything classified HIGH or MEDIUM enters the auto-fix loop — never surface technical decisions to the user.

---

## Issue severity + health score

**Classify every issue** from Step 2 into one of three tiers:

- **HIGH** — broken user story, fails trunk test, missing primary flow state, user cannot complete the primary flow. Must be fixed before phase approval.
- **MEDIUM** — feature works but is confusing, missing feedback, poorly adapted on mobile, unclear error states. User decision on whether to fix.
- **LOW** — cosmetic, minor copy, alignment off by a few pixels. Fix silently if trivial, surface if it requires product input.

**Phase health score** — compute at the end of Step 2 report, before the overall verdict:

Start at 100. Apply deductions per category (deduct from that category's weighted max):
- Functional (30 pts): −8 per HIGH bug, −3 per MEDIUM bug
- Visual (20 pts): −8 per HIGH visual issue, −3 per MEDIUM
- UX feedback (20 pts): −8 per missing/broken feedback state, −3 per unclear state
- Mobile (10 pts): −8 per layout broken on mobile, −3 per minor mobile issue
- Edge states (10 pts): −8 per missing/broken edge state, −3 per partial
- Navigation (10 pts): −8 per dead end or broken nav, −3 per confusing nav

Report as: `Phase [N] health score: [XX]/100`

HIGH and MEDIUM issues both trigger the auto-fix loop — the user is non-technical and cannot meaningfully decide which technical bugs to fix. LOW issues are fixed silently if trivial, or noted in the final report. The user only sees results when (a) the loop converges to a clean run, or (b) the iteration cap hits and the binary surface fires.

---

## Ground rules

- Step 1 must pass before Step 2 starts. No exceptions.
- Never start Step 2 if any automated check or manual verification failed.
- **Every user story must be walked. Skipping a story is the same as failing it.**
- Always use browse — never Puppeteer, curl, or reading code to infer appearance.
- Screenshot every story. "I checked the code" does not count as UX verification.
- Use Pre-2a state seeding for any story requiring an active/past run. Never skip a story because it needs live state — seed it.
- Rate severity honestly. Not everything is critical.
- Fix minor issues silently. **HIGH and MEDIUM go through the auto-fix loop — never escalate technical decisions to the user.**
- The user is non-technical. The only thing they ever see from this skill is a clean report (success) or the binary cap-hit surface (after 3 failed fix attempts). Never ask them which bug to prioritise, which fix to accept, or whether a deviation matters.
- Cap iterations at 3. Reset `reviewIteration` in `.build-state.json` to 0 when the loop converges.
- user starts a server or opens a browser — never. Agent owns all process and browser work.
