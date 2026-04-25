---
name: build
description: >
  Master SDD workflow — re-entrant, feature-loop aware orchestrator. State-file-first: reads .build-state.json to resume mid-phase if context was lost. Falls back to mission.md detection: missing = new project, present = next feature. Feature cycle: /ba (scope) → /spec (3 spec docs, user approval before write) → /frontend (design → handover) → frontend compliance check → /backend (group-by-group with harness) → backend compliance check → /review (validation.md + UX) → user approves. Phase boundaries stop and require a new /build invocation; within-phase gates (spec→frontend, frontend→backend, backend→review) auto-continue without stopping. Trigger on: /build, "build me X", "next feature", "start phase N", or any full-stack app request.
---

# /build — SDD Master Orchestrator

## Voice rules

The user is not a developer. Plain language throughout — no file paths, function names, or stack traces in summaries.

- At every gate: tell the user in plain language what was produced. Ask only the go/no-go question.
- Never ask the user to make a technical decision. When a technical fork affects user experience, present it as: "I'd do X — it means Y for users. OK to proceed?"
- Phase gates are the only moments the user is asked to decide. Everything else is yours.
- Never "want me to / would you like" — make every call except the explicit gates.

---

## State detection (always run first)

**Step 1 — Check `.build-state.json` in the project root.**

If present, read it and jump directly to the matching resume point:

| `step` value | Resume at |
|---|---|
| `constitution-approved` | Feature cycle → Step 1 (Spec), Phase 1 |
| `spec-approved` | Feature cycle → Step 2 (Frontend), phase from state file |
| `frontend-approved` | Feature cycle → Step 3 (Backend), phase from state file |
| `backend-complete` | Feature cycle → Step 4 (Review), phase from state file |
| `phase-approved` | Next feature path — Mode 3 wrap-up for completed phase, then next feature cycle |
| `complete` | "Roadmap complete — nothing left to build." Stop. |

**Step 2 — If no `.build-state.json`, check `mission.md`.**

- **Missing** → New project path
- **Present** → Next feature path (Phase N+1)

---

## State file format

`.build-state.json` lives in the project root. Write it at every gate — overwrite the previous value.

```json
{ "phase": 1, "feature": "core-pipeline", "step": "spec-approved" }
```

- `phase`: integer, current or just-completed phase number
- `feature`: kebab-case feature name from roadmap
- `step`: one of the values in the resume table above

Delete the file when `step` is set to `complete` (roadmap finished).

---

## New project path

1. **`/ba` Mode 1** — demand validation + constitution grill + master user flow
2. **`/spec` Mode 1** — write `mission.md` + `tech-stack.md` + `roadmap.md` + scaffold living docs. User approves before write.
3. **Gate: constitution approved.**
   - Write `.build-state.json`: `{ "phase": 1, "feature": "[phase-1-slug]", "step": "constitution-approved" }`
   - Tell user: "Constitution set. Roadmap confirmed. **Run `/build` to start Phase 1.**"
   - Stop.

---

## Next feature path

Runs when `.build-state.json` has `step: "phase-approved"`, or when `mission.md` exists and no state file is present.

1. **Project state prime** (run first, always — see below)
2. **`/ba` Mode 3** — lightweight replan (what changed? roadmap still correct? what's next?)
3. **`/spec` Mode 3** — update living docs, run changelog, merge completed branch
4. Continue to **Feature cycle** for the next phase from `roadmap.md`.

### Project state prime

Before the BA replan starts, re-ground on what exists. Read only this fixed set — do not re-read old `requirements.md` or `plan.md` files:

- `mission.md` — what the product is, who it's for, and the Master User Journey (Named Flows)
- `roadmap.md` — phase sequence; mark which phases are done vs. pending
- Last completed phase's `handover.md` (from the most recent `specs/YYYY-MM-DD-[feature]/` directory) — what actually shipped: screens, APIs, deviations
- `CHANGELOG.md` if it exists — one-line deltas per phase

Produce a 5–8 line working summary in context under `## Project state`:
```
Product: [one line from mission.md]
Flows: [Named Flows from mission.md Master User Journey — one line per flow, e.g. "Onboarding (4 steps), Core loop (3 steps)"]
Done: Phase 1 [slug] — [one-line what shipped], Phase 2 [slug] — [...]
Pending: Phase [N] [slug] — [one-line intent from roadmap], Phase [N+1] ...
Last phase deviations: [any flagged in last handover.md, else "none"]
```

This summary is read by `/ba` Mode 3 and carried through `/spec` Mode 3. Do not skip this step — cold-start invocations (context compacted, new session) depend on it to avoid heavy re-reads.

---

## Feature cycle

Same for every phase, whether Phase 1 of a new project or Phase N of an ongoing one.

### Step 1 — Spec

1. **`/ba` Mode 2** — phase scope grill, user stories, screen inventory, competitor research
2. **`/spec` Mode 2** — writes `requirements.md` + `plan.md` + `validation.md` in `specs/YYYY-MM-DD-[feature]/`. User must approve all three. Creates feature branch `phase-N-[feature-slug]`.
3. **Gate: spec approved.**
   - Write `.build-state.json`: `{ "phase": N, "feature": "[slug]", "step": "spec-approved" }`
   - Tell user: "Spec locked — [N] user stories, [N] screens, [N] API endpoints. Starting frontend design now."
   - The spec is frozen — scope changes restart Step 1.
   - **Auto-continue immediately to Step 2.** Do not stop.

### Step 2 — Frontend design

4. **`/frontend`** — reads `requirements.md` as contract → writes design brief → hands off to user to design in their chosen tool → user returns with approved design → writes `handover.md` as a frame index pointing backend at the design file (not a visual narration). Claude may use design-tool MCPs (Pencil, Figma, etc.) after Phase 3 to read the finished design and populate the frame index.

5. **Frontend compliance check** (run by `/build`, not `/frontend`):
   - Read `requirements.md` UI requirements (screen inventory)
   - Read `handover.md` — confirm it names a design file under "Design file — source of truth" and has a frame index
   - Confirm `design-tokens.css` exists at the path `handover.md` references
   - Confirm `handover.md` has a "Fonts required" section listing every font family the design uses
   - For each spec screen + state: does the frame index have a row mapping it to a design node? Pass/fail per state.
   - If any gaps: "Frontend handover incomplete: [list what's missing]. Return to `/frontend`." Do not proceed until passing.
   - If no design file is named (or path is invalid / file missing): fail the check and return to `/frontend`.

6. **Gate: frontend approved.**
   - Write `.build-state.json`: `{ "phase": N, "feature": "[slug]", "step": "frontend-approved" }`
   - Tell user: "Frontend complete — [N] screens designed and handed over. Starting backend now."
   - **Auto-continue immediately to Step 3.** Do not stop.

### Step 3 — Backend implementation

7. **`/backend`** — reads `requirements.md` + `plan.md` + `handover.md` → implements task groups in order using `code-harness` → architectural review (Opus) → integration testing

8. **Backend compliance check** (run by `/build`, not `/backend`):
   - Start dev server; poll until ready (max 30s)
   - For each API contract in `requirements.md`: send the specified request, verify response shape and status. Test each error condition listed.
   - If any contract fails: "Backend missing: [endpoint + what failed]. Return to `/backend`." Do not proceed until all pass.

9. **Gate: backend complete.**
   - Write `.build-state.json`: `{ "phase": N, "feature": "[slug]", "step": "backend-complete" }`
   - Tell user: "Backend complete — [N] endpoints built and integration-tested. Starting review now."
   - **Auto-continue immediately to Step 4.** Do not stop.

### Step 4 — Review and approval

10. **`/review`** — reads `validation.md` → runs all automated checks → manual verification → UX dogfooding. Only reached after both compliance checks pass.

11. **Gate: user approves phase.**
    - Write `.build-state.json`: `{ "phase": N, "feature": "[slug]", "step": "phase-approved" }`
    - Tell user: "Phase [N] complete — [what was built in one sentence]. **Run `/build` to update docs and start Phase [N+1].**"
    - If this was the last phase in `roadmap.md`: write `step: "complete"` and delete the file instead.
    - Stop.

---

## Ground rules

- Constitution must exist before any feature work starts. `/build` on a new project always runs Mode 1 first.
- Spec (all 3 docs) must be user-approved before implementation starts. This gate is not skippable.
- Spec is frozen after approval. Changes to scope restart Step 1 — do not patch around the spec.
- Frontend compliance check must pass before backend starts.
- Backend compliance check must pass before `/review` starts.
- Living docs are updated at the start of the next `/build` invocation (Mode 3), not deferred past that.
- Project state prime runs before `/ba` Mode 3 on every next-feature entry — token-light re-grounding on mission, roadmap, and last handover. No exceptions on cold-start.
- Every gate writes `.build-state.json` — this is for crash recovery, not a signal to stop.
- Phase boundaries stop (constitution-approved, phase-approved). Within-phase gates auto-continue (spec→frontend, frontend→backend, backend→review).
- user approves scope, direction, and phase completion. Claude owns all technical decisions.
