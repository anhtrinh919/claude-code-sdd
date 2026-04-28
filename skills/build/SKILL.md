---
name: build
description: >
  Master SDD workflow — re-entrant, feature-loop aware orchestrator. State-file-first: reads .build-state.json to resume mid-phase if context was lost. Falls back to mission.md detection: missing = new project, present = next feature. Feature cycle: /ba (scope) → /spec (3 spec docs, user approval before write) → /frontend (design → handover) → frontend compliance check → /backend (group-by-group with harness) → backend compliance check → /review (validation.md + UX) → user approves. Phase boundaries stop and require a new /build invocation; within-phase gates (spec→frontend, frontend→backend, backend→review) auto-continue without stopping. Trigger on: /build, "build me X", "next feature", "start phase N", or any full-stack app request.
---

# /build — SDD Master Orchestrator

## Voice rules

The user is not a developer. Plain language throughout — no file paths, function names, or stack traces in summaries.

- At every gate: invoke the `/eli` skill to summarize what was produced for the user. Then ask only the go/no-go question.
- Never ask the user to make a technical decision. When a technical fork affects user experience, present it as: "I'd do X — it means Y for users. OK to proceed?"
- Phase gates are the only moments the user is asked to decide. Everything else is yours.
- Never "want me to / would you like" — make every call except the explicit gates.

---

## State detection (always run first)

**Same-session auto-continue:** if this `/build` invocation is in the same uncompacted Claude Code session as the prior gate write (you can see your own previous gate write earlier in this conversation, not just the file on disk) AND the state file's `step` is `constitution-complete` or `phase-complete`, auto-continue without asking the user to retype `/build` — the manual-gate-stop is only there to handle context loss. Cold-start (new session, post-compaction, or the file on disk is the only evidence) keeps the manual gate. The `phase-blocked` state never auto-continues regardless of session.

**Step 1 — Check `.build-state.json` in the project root.**

If present, read it and jump directly to the matching resume point:

| `step` value | Resume at |
|---|---|
| `constitution-complete` | Feature cycle → Step 1 (Spec), Phase 1 |
| `spec-complete` | Feature cycle → Step 2 (Frontend), phase from state file |
| `frontend-complete` | Feature cycle → Step 3 (Backend), phase from state file |
| `backend-complete` | Feature cycle → Step 4 (Review), phase from state file |
| `phase-complete` | Next feature path — Mode 3 wrap-up for completed phase, then next feature cycle |
| `phase-blocked` | Phase ended at the cap-hit "Stop" branch from `/review`. Surface the open issues, do **not** auto-resume. Wait for user to pick: another fix round, manual rollback, or accept-and-move-on. Do NOT run the dogfood handoff in this state. |
| `roadmap-complete` | "Roadmap complete — nothing left to build." Stop. |

**Backward compatibility — old enum values:** if you encounter `constitution-approved`, `spec-approved`, `frontend-approved`, `phase-approved`, or `complete`, treat them as the new `-complete` / `roadmap-complete` equivalents and rewrite the state file in place on the next gate. Do not error.

**Step 2 — If no `.build-state.json`, check `mission.md`.**

- **Missing** → New project path
- **Present** → Next feature path (Phase N+1)

---

## State file format

`.build-state.json` lives in the project root. Write it at every gate — overwrite the previous value.

Full schema (typed):

```ts
type BuildState = {
  /** Current or just-completed phase number from roadmap.md. */
  phase: number;

  /** Kebab-case feature slug from roadmap.md. */
  feature: string;

  /** Latest gate the orchestrator passed. See resume table above. */
  step:
    | "constitution-complete"
    | "spec-complete"
    | "frontend-complete"
    | "backend-complete"
    | "phase-complete"
    | "phase-blocked"
    | "roadmap-complete";

  /** /review auto-fix loop counter. Reset to 0 on convergence. */
  reviewIteration: number;

  /** sha256 of requirements.md captured at /spec Mode 2 user-approval reply.
   *  Downstream skills recompute on entry and surface drift if it changed.
   *  Empty string before the first /spec Mode 2 approval. */
  requirementsHash: string;

  /** Breadcrumb appended by the constituent skill on entry — e.g.
   *  "frontend.phase-2", "backend.phase-3", "review.step-1.5".
   *  /build owns step transitions; sub-skills only write currentSubStep. */
  currentSubStep: string | null;

  /** PID of the long-running dogfood server started after phase-complete.
   *  null when no dogfood server is up. /build kills the prior PID before
   *  starting a new dogfood server, and on the user's "stop dogfood" message. */
  dogfoodPid: number | null;
};
```

Minimal example, freshly approved spec:

```json
{
  "phase": 1,
  "feature": "core-pipeline",
  "step": "spec-complete",
  "reviewIteration": 0,
  "requirementsHash": "9f2c1...",
  "currentSubStep": null,
  "dogfoodPid": null
}
```

**Write rules:**
- `/build` owns transitions of `step`, `phase`, `feature`. It writes the file at every gate, overwriting.
- Constituent skills (`/ba`, `/spec`, `/frontend`, `/backend`, `/review`) write `currentSubStep` on entry and `null` it on clean exit. They do not touch `step`.
- `/review` owns `reviewIteration` (increment per loop, reset on convergence — see that skill's auto-fix loop policy).
- `/spec` Mode 2 owns `requirementsHash` — write it once on user approval; never overwrite outside Mode 2.
- `/build` owns `dogfoodPid` — set when starting the dogfood server, null on "stop dogfood" or before starting a fresh one.

Delete the file when `step` is set to `roadmap-complete` (roadmap finished).

---

## New project path

1. **`/ba` Mode 1** — demand validation + constitution grill + master user flow
2. **`/spec` Mode 1** — write `mission.md` + `tech-stack.md` + `roadmap.md` + scaffold living docs. User approves before write.
3. **Gate: constitution approved.**
   - Write `.build-state.json`: `{ "phase": 1, "feature": "[phase-1-slug]", "step": "constitution-complete", "reviewIteration": 0, "requirementsHash": "", "currentSubStep": null, "dogfoodPid": null }`
   - Tell user: "Constitution set. Roadmap confirmed. **Run `/build` to start Phase 1.**"
   - Stop.

---

## Next feature path

Runs when `.build-state.json` has `step: "phase-complete"`, or when `mission.md` exists and no state file is present.

1. **Project state prime** (run first, always — see below)
2. **`/ba` Mode 3** — lightweight replan (what changed? roadmap still correct? what's next?)
3. **`/spec` Mode 3** — update living docs, run changelog, merge completed branch
4. Continue to **Feature cycle** for the next phase from `roadmap.md`.

### Project state prime

**Caching:** the prime summary is keyed on the current `git rev-parse HEAD` of the project repo. If you've already produced a prime summary earlier in *this same session* and the HEAD hasn't moved, skip the re-read and reuse the cached summary — surface "state primed (cached)" in working context. The HEAD changes when a phase merges, so a fresh prime always runs on the next-feature path after a real merge. Cross-session reuse is not safe — the cache is in-conversation only.

Before the BA replan starts (cold or post-cache-miss), re-ground on what exists. Read only this fixed set — do not re-read old `requirements.md` or `plan.md` files:

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
   - Write `.build-state.json` with `step: "spec-complete"`. Preserve `phase`, `feature`, `dogfoodPid`, `requirementsHash`, `currentSubStep`. Reset `reviewIteration` to 0 — a new phase starts a fresh review counter.
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
   - Write `.build-state.json` with `step: "frontend-complete"`. Preserve all other fields.
   - Tell user: "Frontend complete — [N] screens designed and handed over. Starting backend now."
   - **Auto-continue immediately to Step 3.** Do not stop.

### Step 3 — Backend implementation

7. **`/backend`** — reads `requirements.md` + `plan.md` + `handover.md` → implements task groups in order using `code-harness` → architectural review (Opus) → integration testing

8. **Backend compliance check** (run by `/build`, not `/backend`):
   - Start dev server; poll until ready (max 30s)
   - For each API contract in `requirements.md`: send the specified request, verify response shape and status. Test each error condition listed.
   - If any contract fails: "Backend missing: [endpoint + what failed]. Return to `/backend`." Do not proceed until all pass.

9. **Gate: backend complete.**
   - Write `.build-state.json` with `step: "backend-complete"`. Preserve all other fields.
   - Tell user: "Backend complete — [N] endpoints built and integration-tested. Starting review now."
   - **Auto-continue immediately to Step 4.** Do not stop.

### Step 4 — Review and approval

10. **`/review`** — reads `validation.md` → runs all automated checks → manual verification → UX dogfooding. Only reached after both compliance checks pass.

11. **Gate: user approves phase.**
    - Write `.build-state.json` with `step: "phase-complete"`. Reset `reviewIteration` to 0; preserve other fields. (`/review` already resets `reviewIteration` on convergence — this write is idempotent.)
    - If `/review` ended on the cap-hit "Stop" branch (the user picked Stop, not Accept): write `step: "phase-blocked"` instead. Surface the open issues. Do **not** run the dogfood handoff. Wait for user instruction (another fix round, manual rollback, accept-and-move-on).
    - On `phase-complete`: run the dogfood handoff (see `## Dogfood handoff` — added in Theme 2). Then tell user: "Phase [N] complete — [what was built in one sentence]. **Run `/build` to update docs and start Phase [N+1].**"
    - If this was the last phase in `roadmap.md`: write `step: "roadmap-complete"`, then delete the file.
    - Stop.

---

## Dogfood handoff (after `phase-complete`)

The end of a phase is not a dead-end. After `/review` clears and `step` is being written as `phase-complete`, `/build` auto-starts a **long-running dogfood server** the operator can use the same minute. Skip this entire section if the gate is `phase-blocked`.

The dogfood server is separate from any one-shot test server `/review` may have spun up — keep that one disposable; this one is meant to live across sessions.

### 1 — Pick the run command

- If `docs/deployment.md` exists, follow whatever the project documents (it's the source of truth for any per-project quirks).
- Otherwise read `package.json` `scripts` and pick the dev script: prefer `dev` → `start` → `serve`. Run it via the project's package manager (`bun run dev` if `bun.lock` / `bun.lockb` is present, else `npm run dev`, else `pnpm dev` / `yarn dev` matching the lock file).
- If the project has no dev script, skip the handoff entirely and tell the user: "Phase complete. No dev script in package.json — handoff skipped." Do not invent one.

### 2 — Detect the LAN-reachable URL

Order of preference:
1. **Tailscale**: `tailscale ip -4 2>/dev/null | head -n 1` — if Tailscale is up and the operator owns this device on the tailnet, this is the most reliable inter-device IP (works across Mac, phone, anywhere on the tailnet).
2. **First non-loopback IPv4**: `hostname -I | awk '{print $1}'` — fallback for non-Tailscale setups.
3. Port: read from the dev script (e.g. `next dev -p 3000`); default to `3000` if not specified.

Final URL: `http://<IP>:<PORT>`.

### 3 — Seed dogfood credentials (only if the project has env-credential bootstrap)

Some projects support env-driven seed credentials (Phase 1 of A3 does — `EMAIL` + `PASSWORD_HASH` env vars seed a single user on first boot). Detect by grepping `app/src/**` (or the project's source tree) for one of: `process.env.EMAIL`, `process.env.PASSWORD_HASH`, or an explicit "seed user" pattern in init code. If detection finds **no** such pattern, skip step 3 — print the URL and skip the credentials line in step 4.

If detected:
- Seed password: literal `dogfood` (no special chars, easy to type on a phone).
- Hash with bcrypt: `bun -e 'import("bcrypt").then(b=>b.default.hash("dogfood",10).then(h=>console.log(h)))'` (or the equivalent `node -e` if bcrypt is in node_modules). The exact incantation depends on the project's bcrypt API — read the project's password-hashing util once and mirror its salt rounds.
- Email: `<project-basename>@<project-basename>.local` (e.g. `companion@companion.local`).
- Persist to `.env.dogfood` at the project root (gitignored). Cross-session: the file is reused on the next phase's handoff, so the password stays stable.
- Pick a stable DB path: `~/.config/<project-basename>/dogfood.db` (create the directory if missing). Set the project's DB-path env var (read the project's config util to find the variable name — common: `DB_PATH`, `DATABASE_URL`, `SQLITE_PATH`).

### 4 — Start the server in the background, capture PID

```bash
cd <project-root>
# Compose env from .env + .env.dogfood (so dogfood overrides DB path & seed creds)
env $(cat .env.dogfood 2>/dev/null | xargs) <run-command> > /tmp/<project>-dogfood.log 2>&1 &
echo $!
```

Capture the PID. Write it to `.build-state.json` as `dogfoodPid`. Poll the URL (max 30s) until it returns 2xx/3xx — then the server is ready.

### 5 — Generate the "What you can test" bullets

Read `requirements.md` user stories. Map each story to one bullet in the operator's voice:

- Lead with the screen or feature name (so the operator knows where to look).
- One short sentence on what to do.
- One short sentence on what should happen.

Example mapping (story → bullet):

> "As a user, I can add a workspace by picking a folder from `~/dev`, so the workspace appears in my list."
>
> → `Picker — click "+ Add workspace" — every folder in your dev directory shows up. Pick something to chat about it.`

Keep the list to one bullet per primary story. Skip secondary / negative-path stories — those are review territory, not dogfood territory.

### 6 — Print the handoff in operator voice

```
From your Mac (or phone), open:
  <URL>/<entry-route, default "/">
  Email: <email>
  Password: dogfood

---
What you can test
- <bullet 1>
- <bullet 2>
- <bullet 3>
- ...

When you want to stop the server: tell me "stop dogfood" and I'll kill it.
Or just leave it running and come back to it later.
```

Then continue with the standard `phase-complete` user-facing line: "Phase [N] complete — [one-sentence summary]. Run `/build` to update docs and start Phase [N+1]."

### Stopping the dogfood server

When the user says "stop dogfood" (or any clearly-equivalent phrase: "kill the dogfood", "shut it down", etc.), or before starting a new dogfood server in a later phase:

1. Read `.build-state.json` `dogfoodPid`.
2. If non-null, `kill <pid> 2>/dev/null` — then verify with `kill -0 <pid> 2>/dev/null` (exit 0 = still alive). If still alive after 2 seconds, escalate to `kill -9`.
3. Set `dogfoodPid` to null in `.build-state.json`.

If `dogfoodPid` is null but the user asked to stop: tell them "No dogfood server is running" — do not hunt for stray processes by name (risk of killing something the operator started themselves).

### Stale PID on resume

When `/build` resumes and reads a non-null `dogfoodPid`, verify it's still alive (`kill -0 <pid>`). If dead, null the field silently — do not announce. The dogfood server has died (reboot, OOM, manual kill); the next `phase-complete` will start a fresh one.

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
- Phase boundaries stop (`constitution-complete`, `phase-complete`, `phase-blocked`, `roadmap-complete`). Within-phase gates auto-continue (`spec-complete`→frontend, `frontend-complete`→backend, `backend-complete`→review).
- `phase-blocked` is the only terminal state where the next `/build` does NOT auto-continue silently — it surfaces the blocking issues and waits.
- Constituent skills must write their own `currentSubStep` breadcrumb on entry (e.g. `frontend.phase-2`). `/build` reads it on resume to know where the sub-skill stopped.
- user approves scope, direction, and phase completion. Claude owns all technical decisions.
