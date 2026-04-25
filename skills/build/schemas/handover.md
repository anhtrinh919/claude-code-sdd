# Phase [N] Frontend Handover — [Feature Name]

## Design file — source of truth

> **This handover is an index. The design file is the specification.**
> Backend must open the design file and build UI from it — frame by frame, node by node. The handover describes structure and mappings; the design file describes visuals, layout, spacing, typography, and interaction affordances. Where the two differ, the design file wins.

- **Path:** `[absolute or project-relative path to the design file]`
- **Tool:** `Pencil` | `Figma` | `Penpot` | `other`
- **How to read it:**
  - Pencil → `mcp__pencil__open_document`, then `mcp__pencil__batch_get` for structure and `mcp__pencil__get_screenshot` for visual verification
  - Figma → the Figma MCP or exported asset bundle at `[path]`
  - Other → `[explicit instructions for how backend should access]`

## Design tokens

Generated from the design file's variables — not authored by hand. Backend imports these; it does not re-extract or approximate visual values.

- **Tokens file:** `specs/YYYY-MM-DD-[feature]/design-tokens.css`
- **Generated from:** `mcp__pencil__get_variables` (or tool-equivalent)
- **Includes:** colors (surfaces, borders, text, accent, status), font families, font sizes, spacing scale, radius scale
- **How backend uses it:** import `design-tokens.css` from the app's global stylesheet; reference via CSS variables (`var(--surface-primary)`) or Tailwind-arbitrary values (`bg-[var(--surface-primary)]`). Do not duplicate hex values into Tailwind classes or component styles.

## Fonts

List every font family the design file uses. Backend configures font loading once (e.g. `next/font/google` or local `@font-face`) and wires the CSS variables into `design-tokens.css`.

| Role | Family | Weights used |
|------|--------|--------------|
| Headings | [e.g. Newsreader] | 400, 500 |
| Body | [e.g. Inter] | 400, 500 |
| Monospace | [e.g. Geist Mono] | 400 |

## What was designed

One paragraph — what the design covers at a high level. No per-state narration (that's in the frame index below, and the details live in the design file).

## Frame index

The mapping from each requirement-spec state to the exact design file node/frame. Backend reads the named node to build that state.

| Requirement state | Design frame / node ID | Notes |
|-------------------|------------------------|-------|
| Home — empty | `frame-name` / `nodeId` | |
| Home — populated | `frame-name` / `nodeId` | |
| Board — running card | `frame-name` / `nodeId` | |
| ... | ... | |

Every state listed in `requirements.md` UI Requirements must appear here. If a state is intentionally not designed, mark it `— not designed —` with a reason.

## Reusable components

If the design file defines reusable symbols/components (e.g. "Phase Card / Running"), list them. Backend should implement these as reusable components in the frontend stack (React component, Vue component, etc.) — not inline-duplicate them per screen.

| Component name | Design node ID | Used in frames |
|----------------|----------------|----------------|
| [e.g. Phase Card / Idle] | `nodeId` | Board, Card Detail |
| ... | ... | ... |

## Deviations from requirements spec

Any design decision that diverges from `requirements.md`. State what and why.

- **[What deviated]:** [Why]
- **Impact on backend:** [None / describe]

*No deviations — design matches spec exactly.* [Delete this line if there are deviations]

## Layout / IA notes

One short section only if the design introduces structural patterns that differ from prior phases or from the existing codebase. Examples: "No left sidebar — top header pattern throughout." "Card detail is a right-side sheet, not a modal." Do not restate what the design file shows — only flag the things the implementer might miss by pattern-matching against existing code.

If none: *No IA deviations — design follows existing app structure.*

## API contracts expected from backend

Pulled directly from the phase spec's API Contracts section. Backend implements these exactly.

### [Endpoint name]
- **Request:** `[METHOD] /api/[path]`
- **Auth required:** Yes / No
- **Input:** `{ field: type }` (POST/PUT) or `?field=type` (GET)
- **Expected success response:** `{ field: type }` — status `[200/201]`
- **Expected error responses:**
  - `400`: [condition]
  - `404`: [condition]

[Flag any gaps here:]
> ⚠ **Spec gap:** Design requires `[METHOD] /api/[path]` which is not in the phase spec. Do not start backend until spec is updated.

*No new API contracts — this phase reuses existing endpoints.* [Delete this line if there are new contracts]
