---
name: spec
description: >
  Translates BA session output into structured SDD documents. Three modes: (1) new project — writes mission.md + tech-stack.md + roadmap.md and scaffolds living docs; (2) start phase — creates specs/YYYY-MM-DD-[feature]/ with requirements.md + plan.md + validation.md; (3) between phases — updates living docs, runs changelog, merges branch. Always invoked by /ba or /build after a drilling session. Never standalone.
---

# /spec — Structured Document Writing

Input comes from a `/ba` session. Output is structured markdown files. No drilling, no user questions — that belongs to `/ba`.

## Mode detection

| Context | Mode |
|---------|------|
| No `mission.md` in project root | Mode 1 — New project |
| `mission.md` exists, starting a phase | Mode 2 — Phase spec |
| Phase just completed | Mode 3 — Between phases |

---

## Wiki integration

The `/spec` skill reads relevant past learnings at the start of every run and writes new learnings at friction points and phase completion. All wiki calls are non-blocking — a failed CLI logs a warning and the skill continues.

**`claude-wiki` is an optional companion plugin.** Install with `/plugin install github:anhtrinh919/claude-wiki` to enable per-agent memory across sessions. If not installed, all wiki commands below will fail silently and the skill continues normally.

### Read wiki

Run this **before** any mode-specific work:

1. Determine tags from `tech-stack.md` if it exists (language + framework + key libraries — pick up to 5). For Mode 1, `tech-stack.md` does not exist yet — invoke with `--agent spec` only.
2. Invoke:
   ```
   claude-wiki read --agent spec --tags "[tags]" --limit 5
   ```
3. If the output starts with `# <N> relevant entries`, include a short summary in the skill's working context under `## Relevant past learnings`: the titles and one-line hooks only. Full bodies can be read on demand via the same CLI when an entry looks useful to the current task.
4. If the output is `# No relevant entries` or the CLI fails (non-zero exit), log `No prior spec learnings` and continue silently. This is best-effort — never block the run.

### Write learning

Write to the wiki at two moments in the skill lifecycle. Use this format:

```
claude-wiki save --auto \
  --title "[title]" \
  --tags "[tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences]" \
  --agent spec \
  --trigger [phase-wrap|friction] \
  --phase [N]
```

**Friction trigger** — fires when the user modifies a spec after approval (scope creep signal). Title: `Phase N spec friction: <area>` (e.g. `Phase 2 spec friction: API contracts expanded post-approval`). Body: 2–5 sentences on which section changed, what the delta was, and why the original spec missed it. Tags: project tech-stack tags.

**Phase-wrap trigger** — fires once at the end of Mode 3, after living docs are updated and before branch merge. Title: `Phase N spec: <one-line summary of what this phase taught>`. Body: what was non-obvious about this spec, what worked well, what should be sharper next time. Tags: project tech-stack tags + `spec-writing, requirements`.

---

## Mode 1 — New Project Setup

**Step 0:** Run the Read wiki procedure from the Wiki integration section. Mode 1 has no `tech-stack.md` yet — invoke with `--agent spec` and no tags.

Input: constitution decisions from `/ba` Mode 1 (mission, tech stack, roadmap, exclusions).

**Approval flow:** Write all constitution files to disk first (Steps 1–2). Then tell the user where the files are and ask them to review directly — they will either comment in the files or in chat. Use `AskUserQuestion` only after they've had a chance to read: "Reviewed the constitution files. Ready to proceed to Phase 1 spec?" with options "Yes, proceed" / "I have changes." Do not proceed to Phase 1 until confirmed.

### Step 1 — Write constitution (3 files)

**`mission.md`** — Use schema at `~/.claude/skills/build/schemas/mission.md`. Every field filled. Purpose: one crisp sentence. Target users: named and specific. Vision: one paragraph. Success: observable and specific. Master User Journey: all 3 layers from `/ba` Part C — Actors (2–3 types), Core Jobs (3–5 JTBD statements), Named Flows (3–6 flows with phase labels on each step).

**`tech-stack.md`** — Use schema at `~/.claude/skills/build/schemas/tech-stack.md`. Every choice filled in. Constraints and non-negotiables listed explicitly (e.g. "strict TypeScript from commit 1", "all dependencies pinned exactly — no ^ or ~"). Explicit exclusions named with reasoning. Technical decisions table seeded with choices already made.

**`roadmap.md`** — Use schema at `~/.claude/skills/build/schemas/roadmap.md`. Phases numbered and sequenced. Each phase: feature name + what it delivers + why it comes at that position. Global out-of-scope named explicitly.

### Step 2 — Scaffold living docs

Create these files with headers only (no placeholder content — an empty section with a header is fine, a section with fake content is not):

- `README.md` — project name, mission (from mission.md), setup: "TBD", status: "Phase 0 — Constitution complete. Phase 1 not started."
- `WIKI.md` — header: "# Project WIKI", subheader: "## Tech Stack Notes", body: "*(Added per phase)*"
- `CHANGELOG.md` — header: "# Changelog", body: "*(Auto-generated — do not edit manually)*"
- `docs/architecture.md` — tech stack section copied from tech-stack.md; rest TBD
- `docs/api.md` — header only: "# API Surface — *(Updated per phase)*"
- `docs/decisions.md` — seed with decisions already recorded in tech-stack.md Key Technical Decisions table

### Step 3 — Seed WIKI from global WIKI

If `~/.claude/wiki/` exists: search for entries tagged with the tech stack languages and frameworks. Copy relevant entries under `## From Global WIKI — [tech]` in the project WIKI.md.

If no global WIKI yet: skip silently.

### Output

> **Constitution written.**
> **Files created:** mission.md, tech-stack.md, roadmap.md, README.md, WIKI.md, CHANGELOG.md, docs/architecture.md, docs/api.md, docs/decisions.md
> **Phase 1 feature:** [feature name from roadmap]
> **Ready to scope Phase 1.**

---

## Mode 2 — Phase Spec

**Step 0:** Run the Read wiki procedure from the Wiki integration section — pull tags from `tech-stack.md`, invoke with `--agent spec`. Summary goes into the skill's working context.

**Friction hook:** if during this phase the user returns with spec modifications after having approved this spec, invoke the Write learning procedure with `--trigger friction --phase <N>` before re-entering Mode 2. Do not repeat for the same area within one session.

Input: phase decisions from `/ba` Mode 2 (scope, user stories, screen inventory, competitor patterns, API needs, constraints).

**Approval flow:** Write all three spec files to disk first (Steps 1–3). Then tell the user where to find them and ask them to review directly — they will comment in the files or in chat. Use `AskUserQuestion` after they've reviewed: "Reviewed the spec files. Ready to proceed to frontend?" with options "Yes, proceed" / "I have changes." Do not proceed to frontend until confirmed. This gate is mandatory — SDD does not allow implementation to start from an unapproved spec.

### Step 1 — Determine spec directory

Use today's date: `date +%Y-%m-%d`. Feature slug from the roadmap entry, kebab-case (e.g. `user-auth`, `product-listing`). Create: `specs/YYYY-MM-DD-[feature-slug]/`.

Also create a feature branch: `git checkout -b phase-N-[feature-slug]` where N is the phase number from roadmap.md.

### Step 2 — Write requirements.md

Use schema at `~/.claude/skills/build/schemas/requirements.md`. Fill every section:

- **Frontmatter block** (required, at top): `phase`, `type` (`initial` | `feature` | `rebuild`), `tdd_guard` (`on` | `off`). These come from `/ba` Mode 2 Part A. Missing or wrong values cause downstream skills to misbehave (e.g. a `rebuild` with `type: feature` will preserve old UI patterns that should be deleted).
- **Scope:** one paragraph — what this phase delivers, what a user can do on completion that they couldn't before
- **User stories:** one per major user action, specific ("I can filter the list by date" not "I can manage content"). Each story must reference its Named Flow and step from `mission.md` — format: `[Flow name, Step N]`. A story with no flow reference is incomplete.
- **UI requirements:** every screen + every state (default, empty, loading, error, mobile) — derived from the screen inventory collected in `/ba`. Describe **behavior and key elements**, not visual treatment. Visual treatment lives in the design file (produced by `/frontend`).
- **Data model:** all tables/schemas, field names, types, relationships
- **API contracts:** every endpoint needed by the frontend. Method, path, auth, request shape, success response, all error conditions. Frontend and backend both build from these — they are the shared contract.
- **Constraints & context:** business rules, patterns to follow from tech-stack.md, tone
- **Excluded from this phase:** named explicitly

Validation rule: every API contract must have error responses specified. "500: unexpected error" alone is not sufficient — name the domain-specific error conditions.

### Step 3 — Write plan.md

Use schema at `~/.claude/skills/build/schemas/plan.md`. Organize as numbered task groups, independently reviewable. Each group = one coherent slice that code-harness can implement and verify before moving on.

**Design-agnostic contract.** `plan.md` is written *before* `/frontend` produces the design file. Any visual specifics written here (hex values, Tailwind classes, pixel sizes, font names) will go stale once the design is approved and will silently contradict the design file. Do not include them.

- Describe **what each group delivers** (user-visible capability, data path, API surface, integration point)
- Name components, files, modules, endpoints specifically — but do not describe their visual treatment
- Each group includes a one-line **Verify:** field with the command that proves it's done
- Each group includes a **Depends on:** field listing earlier groups it requires

Typical group structure:
- Group 1–2: Shared primitives, layout shell (components named; visuals come from design file at build time)
- Group 3: Page-level composition (e.g. "rebuild the board page — cards, columns, drag-and-drop wiring")
- Group 4: Database layer (if any)
- Group 5: API routes (if any)
- Group 6: Integration, edge cases, error handling
- Group 7: Story walk — verify every user story end-to-end

Sub-tasks within groups should be specific enough to implement without ambiguity: "Create `src/routes/products.ts` with GET /api/products returning paginated list from DB" is good. "Add product route" is not. "Use `bg-[#F9FAFB]`" is **out of scope for plan.md** — that belongs in the design file.

### Step 4 — Write validation.md

Use schema at `~/.claude/skills/build/schemas/validation.md`. This is the test contract — `/review` reads this file and executes every check.

- **Automated checks:** specific commands that exit 0 on success. TypeScript typecheck, unit tests (named), API endpoint verification with curl
- **Manual verification:** specific steps at named viewport sizes. Each step is binary (pass/fail)
- **Definition of Done:** all criteria listed, all true before phase is approved

Validation rule: every user story in requirements.md must have at least one corresponding manual verification step. If a story isn't in validation.md, it won't be tested.

### Output

> **Phase [N] spec written.**
> **Directory:** `specs/YYYY-MM-DD-[feature]/`
> **Branch:** `phase-N-[feature-slug]`
> **Spec:** [N] user stories, [N] screens, [N] API contracts, [N] plan groups, [N] validation checks
> **Ready for frontend design.**

---

## Mode 3 — Between-Phase Docs Update

**Step 0:** Run the Read wiki procedure from the Wiki integration section — pull tags from `tech-stack.md`, invoke with `--agent spec`.

**Phase-wrap hook:** after Step 6 (changelog) and before Step 7 (merge branch), run the Write learning procedure with `--trigger phase-wrap --phase <N>`. Exactly one entry per phase — draw the summary from the spec files and git log of the just-completed phase.

Input: replan notes from `/ba` Mode 3. Run this in the same session the phase completed — not later.

### Step 1 — Update README.md

Change status line to: "Phase N complete — [feature]. Phase N+1 next: [feature from roadmap]."

### Step 2 — Update WIKI.md

Add a new section: `## Phase N — [Feature Name] Learnings`

Write what was learned, not what was done. Git log has the what. WIKI has the why and the surprise. Minimum 3 entries if anything non-obvious happened. Each entry: topic + what was learned (useful to a future agent starting fresh). Examples: gotchas, tech stack quirks, patterns that worked, patterns that failed.

### Step 3 — Update docs/api.md

Add or update every endpoint that changed this phase. Keep it current — this is the live API surface, not the spec (which is frozen after approval).

### Step 4 — Update docs/decisions.md

Add any non-obvious technical choices made during implementation. Format: `**[Decision]** — Why: [reason]. Alternatives: [what was considered and rejected].`

### Step 5 — Update docs/architecture.md

If new components were added or the data model changed, update the relevant sections.

### Step 6 — Run changelog

Generate `CHANGELOG.md` by running:

```bash
git log --format="%ad|%s" --date=short | awk -F'|' '
  {
    if ($1 != date) { date=$1; print "\n## " date }
    print "- " $2
  }
' >> CHANGELOG.md
```

Or if the project has a `scripts/changelog.py`: `python3 scripts/changelog.py`

Review the output — remove merge commits and branch housekeeping. Keep only meaningful changes.

### Step 7 — Merge branch

```bash
git checkout main
git merge phase-N-[feature-slug] --no-ff -m "Phase N complete: [feature name]"
git branch -d phase-N-[feature-slug]
```

### Output

> **Docs updated and branch merged.**
> **WIKI:** [N] learnings added for Phase N
> **CHANGELOG:** updated through [date]
> **Branch:** `phase-N-[feature-slug]` merged to main
> **Next:** Phase N+1 — [feature from roadmap]

---

## Ground rules

- Write draft files to disk first (Mode 1 and Mode 2). Tell the user where to find them and ask them to review directly. Use `AskUserQuestion` to confirm after they've reviewed — not before writing. This gives the user something real to react to, not a text summary.
- Every field in every schema must be filled. Empty sections are failures — write them or remove the heading.
- API contracts must include all error conditions, not just success responses.
- Every user story must have a corresponding validation check.
- Docs update (Mode 3) happens in the same session as phase completion — not deferred.
- WIKI records what was learned, not what was done.
