# [Feature Name] Implementation Plan

Each group is independently reviewable and maps to one slice of the feature. Groups are a **sequence of work**, not a visual spec. Code-harness implements and verifies each group before moving to the next.

## Ground rules for this file

- **Design-agnostic.** No hex values, no Tailwind classes, no pixel sizes, no font declarations. Those live in the design file (`design-tokens.css` + frame index in `handover.md`). The design file is generated/approved *after* this plan, so any visual detail written here will go stale.
- **Behavior and sequence only.** Describe what each group delivers (user-visible capability, data flow, API surface, integration point) and which earlier groups it depends on.
- **Components are named, not described.** "Group 3: rebuild `CardDetailPanel` with run lifecycle (idle → running → gate → failed → done)" — not "`CardDetailPanel` uses a right-side Sheet 480px wide with amber gate banner." The design frame tells the second half.
- **Each group has a verify line.** What command proves it's done (e.g. `tsc -p . --noEmit`, `bun test --run CardDetail`, `verify-group-N.sh`).

## Group 1: [Category — e.g. "Shared primitives"]
**Delivers:** [one-line capability this group unlocks]
**Depends on:** [prior groups, or "none — scaffold"]
**Verify:** [command]

1. [Sub-task — named component / file / module, no visual detail]
2. [Sub-task]

## Group 2: [Category]
**Delivers:** ...
**Depends on:** Group 1
**Verify:** ...

1. [Sub-task]
2. [Sub-task]

## Group N: [Category]
...
