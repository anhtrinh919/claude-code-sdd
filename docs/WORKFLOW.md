# Workflow Reference

How the seven skills hand off to each other across a single project's lifetime.

---

## The two paths

### New project path (no `mission.md` yet)

```
/build
  → /ba Mode 1     (demand validation, constitution grill, master user flow)
  → /spec Mode 1   (writes mission.md, tech-stack.md, roadmap.md, scaffolds living docs)
  → you approve
  → state: constitution-approved
  → STOP. Re-invoke /build for Phase 1.
```

### Next-feature path (`mission.md` exists)

```
/build
  → project state prime  (re-grounds on mission, roadmap, last handover)
  → /ba Mode 3           (replan: did last phase deliver? roadmap still right?)
  → /spec Mode 3         (update WIKI, CHANGELOG, merge completed branch)
  → continue to feature cycle below
```

---

## Feature cycle (every phase)

```
Step 1 — Spec
  /ba Mode 2     (phase scope grill, user stories, screen inventory)
  /spec Mode 2   (writes requirements.md + plan.md + validation.md, creates feature branch)
  you approve all three
  state: spec-approved

Step 2 — Frontend design
  /frontend
    reads requirements.md
    asks: external tool or Claude Code designs?
    writes design-brief.md
    if external: hands off to your design tool, waits for you
    if internal: designs in HTML mockups
    writes handover.md (with design tokens, frame index, fonts)
  you approve
  state: frontend-approved

Step 3 — Backend implementation
  /backend
    reads requirements.md + plan.md + handover.md
    opens design file via MCP (Pencil) or reads exported design
    implements plan.md task groups in order
      each group:
        /code-harness writes Spec-Light, verify-N.sh, failing test
        implementation
        for UI groups: visual compliance gate (screenshot vs design frame)
        commit
    architectural review (Opus advisor)
    integration tests against requirements.md API contracts
  state: backend-complete

Step 4 — Review
  /review
    Step 1: validation.md compliance (automated + manual)
    Step 1.5: visual compliance (screenshots vs design frames)
    Step 2: UX dogfooding via browse
    writes report
  you approve the phase
  state: phase-approved
  STOP. Re-invoke /build for next phase.
```

---

## State file

`.build-state.json` lives in the project root:

```json
{
  "phase": 2,
  "feature": "user-auth",
  "step": "frontend-approved",
  "preflight_done": true
}
```

| `step` value | Meaning | What re-invoking `/build` does |
|---|---|---|
| `constitution-approved` | Mission, stack, roadmap done | Starts Phase 1 spec |
| `spec-approved` | Requirements/plan/validation approved | Continues to /frontend |
| `frontend-approved` | Handover doc written and approved | Continues to /backend |
| `backend-complete` | All groups built, integration tests pass | Continues to /review |
| `phase-approved` | User signed off on the phase | Wraps living docs, starts next phase |
| `complete` | Roadmap finished | "Nothing left to build." |

---

## Within-phase auto-continue vs phase-boundary stop

`/build` is re-entrant. Inside a phase, gates auto-continue (spec → frontend → backend → review). At phase boundaries (constitution-approved, phase-approved), `/build` stops and waits for you to re-invoke. This is so a fresh session can resume cleanly without re-asking what's already approved.

---

## Where things live in the project

```
my-app/
├── mission.md                          ← what this product is
├── tech-stack.md                       ← language/framework/non-negotiables
├── roadmap.md                          ← phase sequence
├── README.md                           ← living
├── WIKI.md                             ← phase learnings, accumulated
├── CHANGELOG.md                        ← auto-generated, post-phase
├── .build-state.json                   ← gate position
├── docs/
│   ├── architecture.md
│   ├── api.md                          ← live API surface
│   └── decisions.md                    ← non-obvious technical choices
└── specs/
    └── 2026-04-25-user-auth/           ← one folder per phase
        ├── requirements.md             ← contract (what)
        ├── plan.md                     ← task groups (how, design-agnostic)
        ├── validation.md               ← test contract (when done)
        ├── design-brief.md             ← intent for the design tool
        ├── handover.md                 ← from frontend to backend
        └── design-tokens.css           ← extracted from design file
```

---

## Phase types

`requirements.md` includes a frontmatter `type` field:

- **`initial`** — first build of a new product area; no existing UI to honor
- **`feature`** — adds capability to an existing product; follows existing patterns
- **`rebuild`** — visual or structural redesign; **overrides** existing patterns

The `rebuild` type is non-obvious and important: a rebuild phase explicitly removes legacy structure (sidebars, navigation, palette) instead of preserving it. Without this flag, `/backend` defaults to "match existing patterns" and you end up with the old UI restyled rather than the new design built.

`tdd_guard: on/off` controls whether `tdd-guard` is auto-enabled for this phase (on for new logic, off for pure UI/refactor).
