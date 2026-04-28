---
name: frontend
description: >
  Frontend design and implementation skill for SDD projects. Reads requirements.md as its contract (not produces it). Asks the user first whether to use an external design tool (Pencil.dev, Claude Design, Figma, etc.) or let Claude Code design directly, then writes the matching design brief — lean mood/tone brief for external tools, full-detail brief for Claude Code. External path: stops while user designs, then returns to write a frame-index handover pointing backend at the design file (the design file is the source of truth, not the handover narration). Claude Code path: designs using HTML/CSS/React static mockups and browser screenshots. Either path ends with handover.md for backend. Trigger on: /frontend, or when /build reaches the frontend step.
---

# /frontend — Design Brief & Handover

Input: `specs/YYYY-MM-DD-[feature]/requirements.md` — read this first. It is the contract.

If no `requirements.md` is found in a `specs/` directory: stop. "No phase spec found. Run `/ba` and `/spec` for this phase first."

---

## Shared references — load before first Pencil MCP call

**Load reference: Read `${CLAUDE_PLUGIN_ROOT}/skills/_shared/pencil-preflight.md` and apply.** This is the canonical Pencil pre-flight (launch via Bash, verify with `get_editor_state`, never kill processes mid-session, escape hatch via plain-JSON Read/jq). Apply whenever this skill needs to read or write the design file — primarily Phase 5 handover, but also any later return (review surfaced a gap, backend wants a frame re-checked).

---

## Voice rules

Plain language throughout.
- Only ask about design tool choice and phase approval. Everything else is yours.
- Never "want me to / would you like" — make the call.

---

## Wiki integration

Non-blocking — failures log and continue.

### Read wiki

Before writing the design brief (Phase 2):
1. Determine tags from `tech-stack.md` (up to 5, e.g. `nextjs,tailwind,shadcn`).
2. Run:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" read --agent frontend --tags "[tags]" --limit 5
   ```
3. Index hits under `## Relevant past learnings` in the skill's working context. On empty/fail, log and continue.

### Write learning

**Friction trigger** — fires when the frontend compliance check (run by `/build` after this skill finishes) reports that screens/states from `requirements.md` are missing in `handover.md`. Write one entry covering what screen types were missed and why.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" save --auto \
  --title "Phase <N> frontend friction: <area>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: which screens were missed, what class of state, what to check earlier next time]" \
  --agent frontend --trigger friction --phase <N>
```

**Phase-wrap trigger** — fires once after the handover doc is written in Phase 4, before Completion. Captures design patterns adopted vs. rejected.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.mjs" save --auto \
  --title "Phase <N> frontend: <one-line summary>" \
  --tags "[tech-stack-tags]" \
  --source "[project basename]" \
  --body "[2–5 sentences: what patterns the design used, what was tried and dropped, what would trip up a future frontend run]" \
  --agent frontend --trigger phase-wrap --phase <N>
```

---

## Phase 1 — Design Tool Choice

**Persistence rule (Phase 2+ skip):** the design tool choice is a project-level decision, not a per-phase one. Read `mission.md` first — if it has a `## Design Tool` section with a recorded choice (`external` or `claude-code`), skip the question entirely and use that choice. Only Phase 1 (no recorded choice yet) asks.

If no recorded choice exists, ask one `AskUserQuestion`:

**"Before I write the design brief — how will the UI be designed?"**
- **External tool** (Pencil.dev, Claude Design, Figma, etc.) — I'll write a lean mood/tone brief you can hand the tool; it makes component and layout calls
- **Claude Code** — I design directly using the stack from tech-stack.md; I'll write a full-detail brief first

After the user picks: append a `## Design Tool` section at the bottom of `mission.md` with the literal value (`external` or `claude-code`) on its own line. This is a one-time write — the user gets asked once, ever.

The answer picks which brief template is used in Phase 2. The two templates are intentionally different — external tools do their own component thinking and perform worse when over-prescribed; Claude Code needs the full spec to design against.

---

## Phase 2 — Design Brief

**Step 0:** Run Read wiki (see Wiki integration) before writing the brief.

**Memorable-thing question:** Before writing any brief, ask one plain-text question: "What's the one thing a user should remember or feel after using this?" This becomes the north star for every design decision in the brief — write it at the top of the brief under a `## Design intent` heading.

Write `specs/YYYY-MM-DD-[feature]/design-brief.md` using the matching template.

### Path A — External tool brief (lean)

Template: `${CLAUDE_PLUGIN_ROOT}/skills/build/schemas/design-brief-external.md`

High-level only: product context, visual style direction + reasoning, tone/mood, palette and typography intent, optional references, screen checklist.

**Do not include:** component decisions, interaction patterns, layout hierarchy, mobile breakpoints, empty/error state copy. The external tool owns those calls.

### Path B — Claude Code brief (full detail)

Template: `${CLAUDE_PLUGIN_ROOT}/skills/build/schemas/design-brief-internal.md`

Full spec: visual style, layout hierarchy per screen, component decisions, interaction patterns, mobile strategy, empty/error states, screen checklist.

Cover every section — no blanks. This brief is the implementation contract for the mockup phase.

---

## Phase 3 — Design

### Path A — External tool

Tell the user:

> **Design brief written.** Open your design tool, share the contents of `specs/[date]-[feature]/design-brief.md` as context, and cover every screen on the checklist below.
>
> **Screen checklist ([N] states to cover):**
> [paste the numbered checklist from the brief]
>
> Come back here when the design is done and you're happy with it.

Stop. Do not proceed until the user returns.

When the user returns: go to Phase 4.

### Path B — Claude Code designs

Design every screen from the checklist using the project's actual tech stack (from `tech-stack.md`). Produce static mockup files — real components with hardcoded data, no API calls, no routing logic. The goal is a pixel-accurate preview of every screen and state, not a working app.

**How to design:**
1. Create `specs/YYYY-MM-DD-[feature]/mockups/` directory.
2. For each screen group (home, board, dialogs, etc.), write a self-contained HTML file using the project's stack (Tailwind, shadcn tokens if applicable, or plain CSS matching the design brief's style decisions). Each file renders all states of that screen group side by side.
3. Start a local preview: `open` the HTML files in a browser, or run a minimal static server if the stack requires it.
4. Use the `browse` skill (or browser screenshots via MCP) to capture each file. Show the user every 4–5 screens with a brief description.
5. One `AskUserQuestion` mid-way: "Direction right?" (options: "Keep going," "Adjust this," "Change the style"). Adjust once if needed, then continue.
6. Complete all screens from the checklist before going to Phase 4.

**Design quality gate (Claude Code path only):** Before Phase 4, run these two checks on every screen. Both are blockers.

**Trunk test** — on each screen, can you instantly answer all four questions without thinking?
1. What product/site is this?
2. What page am I on?
3. What are the major sections?
4. What can I do from here?

A FAIL on any screen means the information hierarchy is broken. Fix before approval.

**AI slop check** — flag any screen containing these patterns and revise before approval:
- Purple or violet gradient backgrounds
- The 3-column feature grid (icon + title + 2-line description, repeated 3×)
- Centered layout on every element
- Uniform bubbly border-radius on everything
- Decorative blobs or wavy SVG dividers

Do not use Pencil MCP tools. Do not call Pencil MCP from Claude Code.

---

## Phase 4 — Approval & Spec Gap Check

Ask one `AskUserQuestion`: "Design done — anything to flag before the handover doc?" (options: "Looks good, proceed," "One thing to flag," "Need to revisit the spec")

If a spec gap surfaces (e.g., the design revealed a needed API not in requirements.md): stop. "Design requires [endpoint] which is not in requirements.md. Update the spec before backend starts." This is a spec issue — do not work around it.

If approved: proceed to Phase 5.

---

## Phase 5 — Handover Doc + Design Tokens

**STOP — run the pre-flight at the top of this skill before any MCP call.** If Pencil isn't open on WSL2, every step in this phase fails. Prompt the user to open Pencil and load the `.pen` file, wait for confirmation, then begin Step 1.

This phase produces **two artifacts**:

1. `specs/YYYY-MM-DD-[feature]/handover.md` — the frame index (per the schema at `${CLAUDE_PLUGIN_ROOT}/skills/build/schemas/handover.md`)
2. `specs/YYYY-MM-DD-[feature]/design-tokens.css` — generated token file the backend imports directly

### Step 1 — Generate `design-tokens.css`

Pull the design system variables from the design file (not from the brief, not from memory):

- **Pencil:** call `mcp__pencil__get_variables({ filePath })`. The result is a variable map with typed values (color / number / string). Emit as CSS custom properties under `:root`.
- **Figma / other:** use whatever token export the tool offers.

The file backend imports. Keep it mechanical — one variable per token, no editorial reshaping:

```css
/* Generated from [design file path] on [date]
 * Source: mcp__pencil__get_variables
 * Do not edit by hand — regenerate if the design file changes.
 */
:root {
  --surface-primary: #F4F2EF;
  --border-subtle: #EEECE8;
  --accent-primary: #C8B496;
  --fg-primary: #1A1A1A;
  --fg-secondary: #4A4A4A;
  /* ... every color token ... */
  --font-heading: "Newsreader", serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "Geist Mono", monospace;
  --font-size-heading: 15px;
  --font-size-body: 13px;
  /* ... every size token ... */
}
```

If the design file uses fonts that aren't yet loaded in the app (common first-phase case), include a **Fonts required** section in the handover so backend knows to wire `next/font/google` or equivalent.

### Step 2 — Write `handover.md`

**The handover is an index, not a specification.** The design file is the spec. Backend will open the design file and build from it — your job here is to make that navigable, not to narrate every visual detail.

Include (per schema):
- **Design file — source of truth:** absolute path, tool type, and explicit "how to read it" instructions. Mark loud and clear: *"Backend must open the design file and build from it. Visual details are in the file, not in this doc."*
- **Design tokens:** point to `design-tokens.css` generated in Step 1. Describe the import path (e.g. `@import './design-tokens.css'` from `globals.css`).
- **Fonts required:** list families + weights. Backend wires font loading.
- **Frame index:** for every state listed in `requirements.md` UI Requirements, give the exact design-file frame/node the backend should read. Every state maps to a frame, or is marked "not designed" with a reason.
- **Reusable components:** design symbols → React component names backend should create.
- **Deviations from requirements:** anything designed differently than the spec said. If none, state explicitly.
- **Layout / IA notes:** only flag structural patterns the implementer might miss by pattern-matching against existing code (e.g. "no sidebar — top header pattern throughout"). Do not narrate visuals.
- **API contracts expected from backend:** copied directly from requirements.md API Contracts section.

What NOT to include:
- Do not paraphrase visuals ("3-column project grid, status chip per card"). The design file shows this; your description adds no information and risks drifting from what's designed.
- Do not list colors, sizes, spacing values. Those come from `design-tokens.css`.
- Do not add a state-by-state narrative. A frame index row is enough.

---

## Completion

**Pre-Completion:** Run the phase-wrap Write learning (see Wiki integration) — one entry per phase.

> **Frontend complete.**
> **Screens:** [count] designed across [count] states
> **Design tool:** [External — Pencil.dev / Claude Design / Figma] OR [Claude Code — mockups in specs/]
> **Design brief:** `specs/YYYY-MM-DD-[feature]/design-brief.md`
> **Handover:** `specs/YYYY-MM-DD-[feature]/handover.md`
> **Ready for:** frontend compliance check → backend

---

## Ground rules

- requirements.md is the contract. The brief translates it — nothing more, nothing less.
- Design brief is always written before any design work starts, regardless of path.
- During design (Phase 3 — External tool path): Claude does not call Pencil MCP tools. The user drives the design in their tool.
- During handover (Phase 5) and after: Claude MAY call Pencil MCP tools (or the design-tool MCP equivalent) to read the finished design — e.g. to confirm frame IDs, extract reusable component names, or verify coverage against the checklist. Backend is expected to read the file via MCP during implementation.
- **Pencil MCP requires the desktop app to be open on WSL2.** Run the pre-flight at the top of this skill before any `mcp__pencil__*` call. Never speculatively retry on `WebSocket not connected` — that just wastes turns; prompt the user to open the app instead.
- If design reveals a spec gap, stop and surface it — never silently work around a missing API.
- No approved design = skill incomplete. Do not write the handover without explicit approval.
- The checklist at the end of the brief is the coverage contract — every item must be accounted for in the handover.
