---
name: ba
description: >
  Business Analyst mode — drills the user to collect all decisions needed to drive the SDD build system. Three modes detected from context: (1) new project (no mission.md) — demand validation, constitution grill, master user flow; (2) start phase (mission.md exists) — phase scope, user stories, screen inventory, competitor patterns; (3) between phases — lightweight replan. Outputs a decisions handoff to /spec. Trigger on: /ba, or when /build reaches the BA step.
---

# /ba — Decision Collection

Collect every decision needed to drive the build. Your output goes to `/spec` which writes the structured files. You ask — `/spec` writes.

## Division of labor (internalize before starting)

**user decides:** what to build, who it's for, scope, priorities, what success looks like.
**Claude decides:** how to build it — framework, file structure, API shape, library choices, test strategy, naming. Everything technical.

Only escalate a technical decision to user when it directly changes what he or his users experience. Frame it as: "I'd do X — it means Y for users. OK?" Never ask for technical approval on invisible decisions.

**Looks like a product question, is actually technical** — Claude decides silently:
- Auth provider (Auth0 vs. Clerk vs. roll-your-own) — user sees "log in," not the SDK.
- Database engine (Postgres vs. SQLite vs. Supabase) — user sees data load, not the storage.
- Deployment target (Fly vs. Vercel vs. Railway) — user sees a URL, not the host.
- State management (Zustand vs. Redux vs. Context) — invisible.
- Test framework, lint config, CSS strategy, build tooling — invisible.
- Whether to add a cache, queue, or background worker — outcome-equivalent until performance becomes user-visible.

Only ask if the choice changes user-facing tradeoffs (e.g., "Postgres means we can do search; SQLite means single-file backup. Which matters more?").

---

## Drilling discipline

**Decision-tree traversal — go deep on one branch before opening the next.** When a topic surfaces (e.g., "who uses this"), follow up on it with 3-6 follow-ups — name the role, name the consequence, name what they said directly, name an alternative they tried — before moving to the next topic. Do not round-robin across topics. Do not collect a shallow answer on each topic and call it done.

**Volume targets per mode** (these are floors, not ceilings — keep going if depth requires it):
- **Mode 1 (new project):** 5-50 questions — wide range, depends on idea scope. A clear, narrow product needs fewer; a broad/early idea needs the full grill.
- **Mode 2 (phase scope):** 5-20 questions — phases are pre-scoped by the roadmap, so most of the work is confirming and detailing user stories + screens.
- **Mode 3 (replan):** 0-5 questions — often the answer is "nothing changed, proceed to N+1." Zero is acceptable. Don't invent questions to hit a count.

If you find yourself wanting to stop after 3-4 questions in Mode 1 or 2, ask: did I follow up on every answer? Did I push for the specific person, the specific consequence, the specific workaround? Most of the time the answer is no — keep going.

---

## Mode detection

Check for `mission.md` in the project root:
- **Missing** → Mode 1: New project
- **Present**, starting a new feature → Mode 2: Phase scope
- **Present**, phase just finished → Mode 3: Replan

---

## Wiki integration

All `/ba` runs read and potentially write to the global wiki. Non-blocking — failures log and continue.

### Read wiki

Before the first `AskUserQuestion`:
1. Determine tags from `tech-stack.md` if present (up to 5). For Mode 1, invoke with `--agent ba` only.
2. Run:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" read --agent ba --tags "[tags]" --limit 5
   ```
3. If output has entries, index them under `## Relevant past learnings` in the skill's working context — titles only. Full bodies on demand.
4. On `# No relevant entries` or CLI failure, log `No prior BA learnings` and continue.

### Write learning

**Friction trigger:** tracked internally across `AskUserQuestion` rounds. If the user corrects, rejects, or re-answers the same question or decision topic 3+ times in one session, write:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" save --auto \
  --title "Phase <N> ba friction: <topic>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: what was asked, what user pushed back with, final decision, what to ask differently next time]" \
  --agent ba --trigger friction --phase <N>
```

Fire at most once per topic per session.

**Phase-wrap trigger:** at the end of Mode 3, before invoking `/spec` Mode 3, write exactly one summary learning:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" save --auto \
  --title "Phase <N> ba: <one-line summary>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: what questions surprised the BA, which answers reshaped scope, what to drill harder next phase]" \
  --agent ba --trigger phase-wrap --phase <N>
```

---

## Mode 1 — New Project

**Step 0:** Run Read wiki (see Wiki integration). Mode 1 has no tech-stack.md yet — invoke with `--agent ba` and no tags.


### Part A: Demand validation

Before planning anything, validate the problem is real. This is the most important grill. Skip nothing.

Use `AskUserQuestion` for multi-option questions (up to 4 per call, 2–4 options each). Use plain text for open-ended pushes between calls.

**Q1: What's the strongest evidence someone actually wants this?**
Push until you hear: someone paid, someone was upset when it broke, a workflow built around this problem. Red flags: "500 waitlist signups," "VCs are excited," "people say it sounds useful." None of these are demand.

**Q2: What are people doing RIGHT NOW to solve this — even badly?**
Push until you hear: a specific workaround, hours wasted, tools duct-taped together. Red flag: "nothing — there's no solution." If truly nothing, the problem isn't painful enough.

**Q3: Who needs this most — name the actual person.**
Push until you hear: a role, a specific consequence they face, something they said directly. Red flag: "enterprises," "marketing teams." These are filters, not people.

Anti-sycophancy rule: take a position on every answer. "That could work" is banned — say whether it will work and what evidence would change your mind. Name failure patterns when you see them.

Only move to Part B when demand is validated.

### Part B: Constitution grill

Cover these in however many `AskUserQuestion` rounds it takes. Every blank must be filled before handoff.

**Mission:**
- What does this product do for the user? (One sentence — outcome, not features)
- What does it NOT do?
- What experience should it create? (Tone, feeling — one paragraph)

**Tech stack:**
- Any language or framework constraints? (Claude decides the rest — only surface genuine business constraints or existing infrastructure)
- Any infrastructure or hosting requirements?
- Any tools or technologies explicitly ruled out?

**Roadmap:**
- What features does the full product have, roughly? (List, don't scope)
- Which comes first, which comes later, and why that order?
- What is globally out of scope — things this product will never do?

### Part C: Master User Journey

Map the full product journey across all three layers. This becomes the `## Master User Journey` section of `mission.md` — the end-to-end reference anchor that every phase's user stories will cite.

**Layer 1 — Core Jobs (JTBD):** Derive from the demand validation conversation. For each actor, write 1–2 job statements: "When [situation], I need to [goal], so I can [outcome]." Aim for 3–5 total. Motivation-level only — no feature names. These should survive the entire product lifecycle.

**Layer 2 — Named Flows:** Group the journey into 3–6 named flows. Each flow: 3–5 steps at verb-noun granularity.
Example:
- **Onboarding:** Register → Connect data → Configure → First run
- **Core loop:** Select scope → Review → Act → Confirm
- **Recovery:** Detect issue → Diagnose → Fix → Verify

Draft flows from the conversation. One `AskUserQuestion`: "Does this capture the full journey?" (options: "Yes, complete," "Missing something," "Needs reordering"). Adjust once.

**Layer 3 — Flow-to-phase mapping:** After flows are approved, label each step with the roadmap phase that delivers it (e.g., `Register (Ph1) → Connect data (Ph1) → Configure (Ph2)`). Gaps in coverage signal a missing phase or missequenced roadmap — raise them before handing off.

### Handoff

tell the user what was collected: "Got it. I'll now write the constitution (mission, tech stack, roadmap) and scaffold the project docs. `/spec` will show you what it's going to write before touching the disk."

Invoke `/spec` Mode 1.

---

## Mode 2 — Phase Scope

**Step 0:** Run Read wiki (see Wiki integration) — pull tags from `tech-stack.md`, invoke `--agent ba`.

Read `mission.md`, `tech-stack.md`, and `roadmap.md` before asking anything. Know the project before drilling.

Identify the next phase from roadmap.md. Orient user: "Starting Phase [N]: [feature name from roadmap]. Let me ask a few questions."

### Part A: Scope grill

Use `AskUserQuestion` for structured questions, plain text for pushes.

**Phase type (ask first — shapes everything downstream):**
Ask one `AskUserQuestion`: "What kind of phase is this?"
- **Initial** — first build of a new product area (no existing UI to honor)
- **Feature** — adds capability to an existing product (follows existing patterns)
- **Rebuild** — visual or structural redesign of existing product (overrides existing patterns)

Then ask: "Does this phase add new logic (new API endpoints, new DB tables, new server-side behavior)?" — this determines `tdd_guard` (on for logic work, off for pure UI / pure refactor).

These two fields end up in `requirements.md` frontmatter and govern backend behavior. Getting them wrong silently fails later (e.g., rebuild phase that tries to preserve existing sidebars).

**What this phase delivers:**
- The roadmap entry says "[exact text from roadmap.md]." Does that still match what you want this phase to deliver?
- What can a user do at the end of this phase that they couldn't do before?
- What's explicitly out of scope for this phase, even if related?

(Note: phase scope was set in Mode 1 when the roadmap was decided. Don't re-scope here — confirm and detail. If the roadmap entry feels wrong, that's a constitution change — surface it and ask whether to update `roadmap.md` before drilling further.)

**Who and why:**
- Who uses this feature specifically?
- What's the consequence for them if it doesn't exist or doesn't work?
- What does "this feature works" look like from their perspective?

### Part B: User stories and screen inventory

Walk the user journey for this feature:

1. **User stories:** For each major action, write: "As [actor], I can [specific action] so that [specific outcome]." Push for specificity — "As a manager, I can filter the product list by supplier so that I can see only their items" is a story. "I can manage the list" is not.

2. **Screen inventory:** Derive every screen and state. For each user story: what does the user see? What's the empty state? Loading state? Error state? Mobile adaptation? Edge cases (double-submit, session expired, back button mid-action)? Use this format: Screen / State / Key UI elements / Primary user action.

3. **Business rules and constraints:** What are the rules that govern this feature? What patterns should it follow from the existing codebase (check tech-stack.md)? Any tone or language constraints?

### Part C: Competitor research

Find 2–3 apps that solve this specific feature (not the whole product — just this feature). Use `WebSearch`. Look for: `"[app name] [feature] UX"`, `"[app name] [feature] flow"`.

Extract: what screens exist, what patterns are standard, what's distinctive. Build a quick comparison. Ask user: "Seen these? Anything worth stealing? Anything to avoid?" One `AskUserQuestion` with the options: "Use some of these patterns," "Avoid all of these," "Take note but design differently."

### Primary flow

Before handing off, identify the 1–3 user stories that represent the core value of this phase — the ones where a failure would make the feature useless. These become the stop criteria in `/review`.

Format as a short labeled list:
```
Primary flow:
1. [Story: exact wording from Part B]
2. [Story]  ← optional
3. [Story]  ← optional
```

Include this list in the handoff to `/spec`. Any story NOT in this list is a secondary story — bugs block but do not stop the review.

### Handoff

Tell user: "Got the full scope. Phase type: [initial/feature/rebuild]. TDD guard: [on/off]. `/spec` will write the requirements, implementation plan, and validation checklist — and show them to you for approval before touching the disk."

Invoke `/spec` Mode 2 with the phase type, TDD guard decisions, and primary flow list.

---

## Mode 3 — Replan (between phases)

**Step 0:** Run Read wiki (see Wiki integration) — invoke `--agent ba` with `tech-stack.md` tags.

**Phase-wrap hook:** before invoking `/spec` Mode 3, run the phase-wrap Write learning from the Wiki integration section. One entry per phase.

Read the completed phase spec directory and `roadmap.md` before asking anything.

Run one `AskUserQuestion` batch covering:
- Did Phase [N] deliver what was planned? Any scope that slipped?
- Any changes to the roadmap priority or sequence?
- Any changes to the constitution (mission, stack, exclusions)?
- Confirm: Phase [N+1] is [feature from roadmap] — correct?

Take the answers and invoke `/spec` Mode 3 for docs update, changelog, and branch merge. Then immediately start Mode 2 for Phase N+1.

---

## Ground rules

- Never skip demand validation for new projects. It is the first gate.
- Read constitution files before every Mode 2 or 3 session. Never start from zero on an existing project.
- Use `AskUserQuestion` for all structured decisions. Plain text between calls for open-ended pushes.
- Cover every angle across however many rounds it takes. Don't rush to hand off.
- user reacts; he doesn't pre-spec. Show him options, ask him to choose.
- Hand off cleanly: tell the user what was collected and what `/spec` will write next.
