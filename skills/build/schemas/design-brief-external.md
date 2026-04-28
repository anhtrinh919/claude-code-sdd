# Design Brief — External Tool Path

Brief for handoff to Pencil.dev, Claude Design, Figma, or similar external design tool. The tool owns component-level, layout-hierarchy, and interaction-pattern decisions. This brief's job is to give the tool **deep grounded context** for the full product so it doesn't design Phase N into a corner that later phases must retrofit around — and so it knows the *why* behind every screen group, not just the *what*.

**Length target:** 15–40K tokens. Lower bound for small phases, upper bound for foundation phases with rich product context. Stay under 50K to leave the design tool's context budget room for its own design system, screen iteration, and MCP overhead.

**Read before writing:** `mission.md`, `tech-stack.md`, `roadmap.md`, `specs/YYYY-MM-DD-[feature]/requirements.md`, and any project-level `CLAUDE.md` or `past-lives.md`. Pull from them — do not paraphrase from memory.

**Do NOT include:** specific component names, layout hierarchy, interaction patterns, mobile breakpoints, padding/spacing values, empty/error state copy. Those belong to the design tool. (You CAN describe behavioral *intent* — "the empty state should feel confident, not hand-holding" — without writing the actual copy.)

**DO include** (the lessons from past phases — every section below is required unless marked optional):
- Full product vision — what the product becomes at the end of the roadmap, not just this phase.
- A roadmap-at-a-glance.
- Forward-compatibility callouts — "leave room for X, which lands in Phase Y." This is the single most important section for preventing retrofit pain.
- Per-screen-group rationale — what each group of screens does and why it exists.
- User stories — verbatim from `requirements.md`, organized by screen group.
- Patterns to avoid — what the design must NOT become (especially relevant if past attempts exist).
- Information architecture table.
- Screen checklist with coverage notes.

---

## Design intent

One short paragraph — the answer to the "what's the one thing a user should remember or feel after using this?" memorable-thing question. Quote the user verbatim where possible. End with a one-liner: *"Every visual decision should be weighed against this."*

## Product context — full vision

The full picture of what the product becomes at the end of the roadmap. Aim for **3–6 paragraphs**, not just a summary. Cover:
- **What it is.** Product type, deployment surface, who runs it, who uses it.
- **What it replaces.** The current tools or workflows the user is moving away from. Naming these sharpens the contrast for the design tool.
- **What it explicitly isn't.** Adjacent products that are NOT the target — this prevents Pencil from pattern-matching toward the wrong reference.
- **The end-state form factor.** Describe the eventual layout, navigation model, and key surfaces in prose. Pencil designs Phase 1 better when it can picture the Phase N destination.
- **The operator's day with this product.** Optional but high-value — a short narrative of the user's typical day using the product. Helps Pencil see screens as connected nodes in a flow, not isolated mockups.

Pull from `mission.md` and `roadmap.md`. Don't paraphrase — quote where useful.

## Patterns to avoid

If the project has predecessors (failed attempts, cousin projects, prior prototypes), this section names the design failure modes to specifically avoid. Read `past-lives.md`, `CLAUDE.md`, or any "lessons learned" docs.

For each prior attempt or known anti-pattern:
- **Name it.** What was the prior attempt or pattern called?
- **What went wrong visually.** What did the design become that it shouldn't have?
- **What this design must NOT do.** Concrete "do not" statements.

If no past attempts, name **generic anti-patterns for this product type**: marketing-site aesthetic, IDE pane density, generic AI-app chrome, etc. The point is to give Pencil a clear list of references to pattern-AWAY-from.

## Roadmap at a glance

Numbered list of all phases from `roadmap.md`, with one or two lines each describing what the phase delivers. Mark the current phase explicitly with `[CURRENT]`. The design tool needs to know:
- Where the product is going (not just where it is now)
- What surfaces, panels, and primitives will land later
- What ordering imposes on visual structure

```
1. Phase 1 — [name] [CURRENT]: [one-line capability + what it leaves in place for later]
2. Phase 2 — [name]: [one-line capability]
3. Phase 3 — [name]: [one-line capability]
...
```

## Current phase scope

What THIS phase delivers concretely, derived from `requirements.md`. One or two paragraphs + a short bullet list of what the user can do at the end of this phase. Distinguished clearly from the full vision so the tool knows what to actually design now versus what to merely accommodate.

If the phase has a meaningful daily-use slice (e.g. "morning on a train: open app, check status, approve"), describe it here in prose.

## Forward-compatibility callouts

The single most important section for preventing future-phase retrofit pain. List 3–10 capabilities that are **not in this phase** but **will land in later phases** — and explicit instructions on how this phase's design must accommodate them.

Format each callout:
- **[Capability] (Phase N).** [What lands in that phase]. [How this phase must leave room — be specific about which surface, header, area, or shape must accommodate it.]

Example (from a hypothetical SDD orchestrator):
> - **The `/build` toggle (Phase 4).** A prominent toggle to start an SDD cycle from inside a workspace lands in Phase 4. Reserve a slot in the workspace chat header — don't fill it with chat-only controls. The slot should feel intentionally empty in Phase 1, not filled by something else that has to move later.

> - **Right side panel populated (Phase 4).** Phase 3 establishes empty shells; Phase 4 fills them from `/build` state. Phase 1's full-width chat must not assume the chat will always be full-width — design it as a panel that can be flanked, not a standalone page.

If a Phase N design treats later phases as if they don't exist, the retrofit pain is the design's fault, not the implementer's. This section's job is to prevent that.

## Screen groups — what each does and why

For each natural group of screens (Login, Home, Settings, Editor, etc.), write a self-contained section that answers:

- **Job.** One paragraph — what the user comes to this group of screens to do. Frame in user motivation, not feature names.
- **Why it exists in this phase.** What about the phase scope makes this group necessary now.
- **User stories served.** List the user stories from `requirements.md` that this group fulfills. Reference by number.
- **Key behaviors the design must encode.** Behavior, not visual treatment. Examples: "the Send button morphs into a Stop button while a response is generating", "the folder picker breadcrumb cannot navigate above WORKSPACE_ROOT", "queued messages persist across browser tab close." Pencil needs to know these to design correct affordances.
- **States that surprise.** States that aren't obvious from the screen name and might be missed: queue chip below input, jump-to-latest pill while scrolled up, restart banner when the underlying process dies, etc.
- **Forward-compat for this group.** Which forward-compat callouts from above apply most directly to this group.

This section grounds Pencil in the *why* of each screen, not just the *what*. Without it, designs end up correct in form but wrong in priority.

## User stories

Verbatim from `requirements.md`. Organize by the screen group that primarily fulfills each — but a story can appear under multiple groups if it crosses surfaces (e.g. multi-device sync touches both list and chat).

Format:
```
### [Screen group name]
**N. [Story title]:** As [actor], I [specific action] so that [outcome]. [Mission flow + step reference, if any.]
```

Pencil references these while designing — when a screen feels off, the question "which user story does this serve?" cuts through ambiguity.

## Visual style

Pick a specific direction (e.g., "operator's executive dashboard", "editorial minimal", "playful consumer", "dense data IDE"). State **why** — tie to who uses it and what the product should feel like. One paragraph.

If the design has **dual register** (e.g., dense dashboard surfaces + calm reading surfaces), name both modes explicitly and explain which surfaces use which register. Conflating two registers loses both.

## Tone and mood

Three to five adjectives describing the feel. Each adjective backed by a one-line reason that ties to user motivation, not aesthetic preference.

## Palette direction

Rough color intent — not hex codes. Cover:
- **Primary mode:** light / dark / both
- **Foundation:** neutrals or saturated?
- **Accent reserved for:** primary action / branding / active state / etc.
- **Saturated/semantic color reserved for:** what specifically (status, errors, gates) — and the discipline ("scarce, semantic, never decorative")

The design tool picks specific hex/HSL values. The brief constrains the discipline.

## Typography direction

Serif vs. sans for body and UI. Mono usage (paths, code, literals). Display vs. utilitarian. Weight personality. Not font names — the design tool picks specifics.

## References (optional)

If relevant, name 1–3 products whose **feel** is close to the target. State which aspect each reference captures (layout density, color discipline, conversational tone, etc.). Don't reference for the sake of referencing — only when it sharpens the brief.

## Information architecture

The persistent UI elements across phases — what survives, what evolves. Use a simple table:

| Element | Phase 1 | Phase 2 | Phase 3 | Phase N |
|---|---|---|---|---|
| Header | A | A | A + B | A + B + C |
| Sidebar | None | None | Empty shell | Populated |
| Right panel | None | None | Empty shell | Populated |
| Bottom bar | None | A | A | A + D |
| ...etc | | | | |

Helps the design tool design a coherent **system** — not isolated screens.

## Screen checklist

Numbered list of every screen + state from `requirements.md`'s UI Requirements table. **THIS PHASE ONLY** — future phases will have their own briefs. The list is the coverage contract: every item must appear in the returned design.

```
GROUP A
1. [Screen] — [state]
2. [Screen] — [state]

GROUP B
3. [Screen] — [state]
...
```

## Coverage notes

- **Constitution constraints** that apply to all screens (responsive viewports, theme posture, accessibility minimums) — restate from `tech-stack.md`.
- **Design system anchors** — patterns that should survive across surfaces (e.g., a card shape that works at full-card size on a home page AND at compact-row size in a future sidebar).
- **Most-forgotten surfaces** — list-item renderers in particular tend to get designed as detail panels but missed as compact components. Call this out for any list-item that has state variants.
- **Forward-compat reminders mapped to specific screens** — call out which screens from the checklist most directly inherit the forward-compat callouts above.
